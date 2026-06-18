/**
 * 元創儀表板 LINE 通知 Worker
 *
 * 部署到 Cloudflare Workers，當儀表板有新任務時 POST 到這個 worker，
 * worker 會用 LINE Messaging API 把訊息推送給對應同事。
 *
 * ---- 必要 Secrets（在 Cloudflare Workers 介面設定）----
 *  LINE_CHANNEL_TOKEN  從 LINE Developers Messaging API channel 拿到的 Channel access token
 *  NOTIFY_SECRET       任意字串，儀表板呼叫時要附帶（防止他人亂打）
 *
 * ---- 環境變數（在 Cloudflare Workers 介面設定，可改為 secret）----
 *  ALLOWED_ORIGIN      允許呼叫的網域，預設 https://kelly83117.github.io
 *
 * ---- 用法 ----
 *  POST /
 *    Headers:
 *      Content-Type: application/json
 *      X-Notify-Secret: <NOTIFY_SECRET>
 *    Body:
 *      {
 *        "recipientUserIds": ["Uxxxx...", "Uyyyy..."],
 *        "message": "🔔 老闆指派任務：完成 6月份報表\n📅 截止 2026/06/20"
 *      }
 *    Response:
 *      { ok: true, results: [{ userId, ok, status }, ...] }
 */
export default {
  async fetch(request, env) {
    const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || 'https://kelly83117.github.io';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(ALLOWED_ORIGIN),
      });
    }

    if (request.method !== 'POST') {
      return jsonResp({ ok: false, error: 'Method not allowed' }, 405, ALLOWED_ORIGIN);
    }

    // 來源檢查（可選）
    const origin = request.headers.get('Origin');
    if (origin && origin !== ALLOWED_ORIGIN) {
      return jsonResp({ ok: false, error: 'Origin not allowed' }, 403, ALLOWED_ORIGIN);
    }

    // 共享 secret 檢查
    const providedSecret = request.headers.get('X-Notify-Secret') || '';
    if (!env.NOTIFY_SECRET || providedSecret !== env.NOTIFY_SECRET) {
      return jsonResp({ ok: false, error: 'Bad secret' }, 401, ALLOWED_ORIGIN);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResp({ ok: false, error: 'Invalid JSON' }, 400, ALLOWED_ORIGIN);
    }

    const { recipientUserIds, message } = body || {};
    if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
      return jsonResp({ ok: false, error: 'recipientUserIds required' }, 400, ALLOWED_ORIGIN);
    }
    if (!message || typeof message !== 'string') {
      return jsonResp({ ok: false, error: 'message required' }, 400, ALLOWED_ORIGIN);
    }
    if (!env.LINE_CHANNEL_TOKEN) {
      return jsonResp({ ok: false, error: 'LINE_CHANNEL_TOKEN not configured' }, 500, ALLOWED_ORIGIN);
    }

    // 依序 push 給每個 userId（LINE Messaging API 不支援單一 request 對多 userId）
    const results = await Promise.all(
      recipientUserIds.map(async (uid) => {
        try {
          const resp = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.LINE_CHANNEL_TOKEN}`,
            },
            body: JSON.stringify({
              to: uid,
              messages: [{ type: 'text', text: message }],
            }),
          });
          const text = resp.ok ? '' : await resp.text().catch(() => '');
          return { userId: uid, ok: resp.ok, status: resp.status, error: text || undefined };
        } catch (e) {
          return { userId: uid, ok: false, error: String(e && e.message || e) };
        }
      })
    );

    return jsonResp({ ok: true, results }, 200, ALLOWED_ORIGIN);
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Notify-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResp(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}
