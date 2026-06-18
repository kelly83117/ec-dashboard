/**
 * 元創儀表板 LINE 通知 Worker（v2）
 *
 * 部署到 Cloudflare Workers，支援：
 *   1. POST /        儀表板呼叫推播（支援 Flex Message 帶「✓ 標記完成」按鈕）
 *   2. POST /webhook LINE 平台 webhook（處理 postback 完成按鈕）
 *   3. Cron Trigger  每天 09:00 Asia/Taipei 推老闆未完成清單
 *
 * ---- 必要 Secrets ----
 *   LINE_CHANNEL_TOKEN    從 LINE Messaging API channel 拿到的 access token
 *   LINE_CHANNEL_SECRET   同 channel 的 secret（webhook 簽章驗證）
 *   NOTIFY_SECRET         儀表板呼叫時要附帶的密碼
 *
 * ---- 必要環境變數 ----
 *   FIREBASE_PROJECT_ID   你的 Firestore project id（yc-dashboard-9aa6c）
 *
 * ---- 可選環境變數 ----
 *   ALLOWED_ORIGIN        允許呼叫的網域，預設 https://kelly83117.github.io
 *   DASHBOARD_URL         儀表板網址，預設 https://kelly83117.github.io/ec-dashboard/
 *
 * ---- Cron 設定 ----
 *   wrangler.toml 或在 Cloudflare 介面 Triggers 加上：
 *     crons = ["0 1 * * *"]   # UTC 01:00 = Asia/Taipei 09:00
 */

const FIRESTORE_DOC_PATH = 'app/main';

export default {
  async fetch(request, env) {
    const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || 'https://kelly83117.github.io';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(ALLOWED_ORIGIN) });
    }

    const url = new URL(request.url);

    // LINE webhook：postback 等事件
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleLineWebhook(request, env);
    }

    if (request.method !== 'POST') {
      return jsonResp({ ok: false, error: 'Method not allowed' }, 405, ALLOWED_ORIGIN);
    }

    // 儀表板呼叫推播
    return handleNotify(request, env, ALLOWED_ORIGIN);
  },

  // Cron：每天 09:00 Asia/Taipei 推未完成清單給老闆
  // Cron 處理：依不同時間觸發不同通知
  //  '0 2 * * 2-6'   → 早上 09:00 Asia/Taipei 推老闆未完成清單  → sendMorningDigest
  //  '55 9 * * 2-6'  → 下午 17:55 Asia/Taipei 提醒同事填工作日誌 → sendEveningReminder
  async scheduled(event, env) {
    try {
      const cron = (event && event.cron) || '';
      if (cron === '55 9 * * 2-6') {
        await sendEveningReminder(env);
      } else {
        await sendMorningDigest(env);
      }
    } catch (e) { console.error('[scheduled] failed:', e); }
  },
};

// ======================================================================
// 每天下午 17:55 提醒同事填工作日誌
// ======================================================================
async function sendEveningReminder(env) {
  if (!env.LINE_CHANNEL_TOKEN || !env.FIREBASE_PROJECT_ID) {
    console.warn('[eveningReminder] missing env vars');
    return;
  }
  const docFields = await firestoreGetFields(FIRESTORE_DOC_PATH, env);
  const lineConfig = fromFirestoreValue(docFields['ec.lineConfig']) || {};
  const userIds = lineConfig.userIds || {};
  const ids = Object.values(userIds).filter(Boolean);
  if (ids.length === 0) { console.warn('[eveningReminder] no employee userIds'); return; }
  const text = '⏰ 下班前 5 分鐘提醒\n\n別忘了填寫今天的「工作日誌」喔！\n寫完記得按「☁ 同步雲端」上傳，老闆才看得到。\n\n→ https://kelly83117.github.io/ec-dashboard/';
  await pushLineMessage(ids, [{ type: 'text', text }], env);
}

// ======================================================================
// 儀表板 → Worker：推送任務通知
// ======================================================================
async function handleNotify(request, env, ALLOWED_ORIGIN) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== ALLOWED_ORIGIN) {
    return jsonResp({ ok: false, error: 'Origin not allowed' }, 403, ALLOWED_ORIGIN);
  }
  const providedSecret = request.headers.get('X-Notify-Secret') || '';
  if (!env.NOTIFY_SECRET || providedSecret !== env.NOTIFY_SECRET) {
    return jsonResp({ ok: false, error: 'Bad secret' }, 401, ALLOWED_ORIGIN);
  }
  if (!env.LINE_CHANNEL_TOKEN) {
    return jsonResp({ ok: false, error: 'LINE_CHANNEL_TOKEN not configured' }, 500, ALLOWED_ORIGIN);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResp({ ok: false, error: 'Invalid JSON' }, 400, ALLOWED_ORIGIN); }

  const { recipientUserIds, message, task, kind } = body || {};
  if (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0) {
    return jsonResp({ ok: false, error: 'recipientUserIds required' }, 400, ALLOWED_ORIGIN);
  }

  // 有 task + kind=assigned → 用 Flex Message 帶完成按鈕
  // 沒有就退回純文字（測試通知、完成通知等情境）
  let messages;
  if (task && kind === 'assigned') {
    messages = [buildTaskAssignedFlex(task, env)];
  } else if (typeof message === 'string' && message) {
    messages = [{ type: 'text', text: message }];
  } else {
    return jsonResp({ ok: false, error: 'message or task required' }, 400, ALLOWED_ORIGIN);
  }

  const results = await pushLineMessage(recipientUserIds, messages, env);
  return jsonResp({ ok: true, results }, 200, ALLOWED_ORIGIN);
}

// ======================================================================
// LINE webhook：postback 完成按鈕
// ======================================================================
async function handleLineWebhook(request, env) {
  const bodyText = await request.text();
  // 簽章驗證
  if (env.LINE_CHANNEL_SECRET) {
    const sig = request.headers.get('X-Line-Signature') || '';
    const valid = await verifyLineSignature(bodyText, sig, env.LINE_CHANNEL_SECRET);
    if (!valid) return new Response('Invalid signature', { status: 401 });
  }

  let body;
  try { body = JSON.parse(bodyText); } catch { return new Response('Bad JSON', { status: 400 }); }

  const events = body.events || [];
  await Promise.all(events.map(ev => handleEvent(ev, env).catch(e => console.error('[event]', e))));
  return new Response('OK', { status: 200 });
}

async function handleEvent(event, env) {
  if (event.type === 'postback') {
    const params = new URLSearchParams(event.postback.data || '');
    const action = params.get('action');
    const taskId = params.get('taskId');
    if (action === 'complete' && taskId) {
      const userId = event.source && event.source.userId;
      const result = await markTaskComplete(taskId, userId, env);
      if (event.replyToken) {
        await replyLine(event.replyToken, result.message, env);
      }
      return;
    }
  }

  // 「我的任務」/「任務」等指令也可以加，這版只實作 postback
  if (event.type === 'message' && event.message && event.message.type === 'text') {
    const text = (event.message.text || '').trim();
    if (text === '我的任務' || text === '任務') {
      const userId = event.source && event.source.userId;
      const msg = await buildMyTasksMessage(userId, env);
      if (event.replyToken) {
        await replyLine(event.replyToken, msg, env);
      }
    }
  }
}

async function markTaskComplete(taskId, completedByUserId, env) {
  const docFields = await firestoreGetFields(FIRESTORE_DOC_PATH, env);
  const lineConfig = fromFirestoreValue(docFields['ec.lineConfig']) || {};
  const userIds = lineConfig.userIds || {};
  const completedByName = Object.keys(userIds).find(n => userIds[n] === completedByUserId) || '某位同事';

  const tasks = fromFirestoreValue(docFields['ec.bossTasks']) || [];
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx < 0) return { message: '❌ 找不到該任務（可能已被刪除）' };
  const task = tasks[idx];
  if (task.status === 'done') return { message: '☑ 這個任務已經是完成狀態了' };

  tasks[idx] = { ...task, status: 'done', doneAt: Date.now(), doneBy: completedByName };
  await firestorePatchField(FIRESTORE_DOC_PATH, 'ec.bossTasks', toFirestoreValue(tasks), env);

  // 通知老闆
  const bossIds = (lineConfig.bossUserIds || []).filter(Boolean);
  if (bossIds.length > 0) {
    const msg = `✅ 任務完成通知\n${task.desc}\n👤 完成者：${completedByName}（透過 LINE）`;
    await pushLineMessage(bossIds, [{ type: 'text', text: msg }], env);
  }

  return { message: `✓ 已標記完成：${task.desc}` };
}

async function buildMyTasksMessage(userId, env) {
  const docFields = await firestoreGetFields(FIRESTORE_DOC_PATH, env);
  const lineConfig = fromFirestoreValue(docFields['ec.lineConfig']) || {};
  const userIds = lineConfig.userIds || {};
  const myName = Object.keys(userIds).find(n => userIds[n] === userId);
  if (!myName) return '抱歉，找不到你的身分。請聯絡老闆設定 LINE userId。';

  const tasks = fromFirestoreValue(docFields['ec.bossTasks']) || [];
  const mine = tasks.filter(t => t.status !== 'done' && (t.assignee === myName || t.assignee === '全體'));
  if (mine.length === 0) return `☀️ ${myName} 你好！\n目前沒有未完成的任務 🎉`;

  const lines = mine.map((t, i) => {
    const due = t.due ? ' (📅 ' + t.due.replace(/-/g, '/') + ')' : '';
    return `${i + 1}. ${t.desc}${due}`;
  }).join('\n');
  return `📋 ${myName} 你的未完成任務（${mine.length} 件）：\n\n${lines}`;
}

// ======================================================================
// 每天早上 09:00 推老闆未完成清單
// ======================================================================
async function sendMorningDigest(env) {
  if (!env.LINE_CHANNEL_TOKEN || !env.FIREBASE_PROJECT_ID) {
    console.warn('[digest] missing env vars');
    return;
  }
  const docFields = await firestoreGetFields(FIRESTORE_DOC_PATH, env);
  const lineConfig = fromFirestoreValue(docFields['ec.lineConfig']) || {};
  const bossIds = (lineConfig.bossUserIds || []).filter(Boolean);
  if (bossIds.length === 0) { console.warn('[digest] no boss userIds'); return; }

  const tasks = fromFirestoreValue(docFields['ec.bossTasks']) || [];
  const incomplete = tasks.filter(t => t.status !== 'done');

  let text;
  if (incomplete.length === 0) {
    text = '☀️ 早安老闆！\n\n目前沒有未完成的任務 🎉';
  } else {
    const todayStr = new Date().toISOString().slice(0, 10);
    const lines = incomplete.map((t, i) => {
      const overdue = t.due && t.due < todayStr;
      const due = t.due ? `\n   📅 ${overdue ? '⚠️ 已逾期 ' : ''}${t.due.replace(/-/g, '/')}` : '';
      return `${i + 1}. ${t.desc}\n   👤 ${t.assignee || '全體'}${due}`;
    }).join('\n\n');
    text = `☀️ 早安老闆！未完成任務 ${incomplete.length} 件\n\n${lines}`;
  }

  await pushLineMessage(bossIds, [{ type: 'text', text }], env);
}

// ======================================================================
// LINE Messaging API helpers
// ======================================================================
async function pushLineMessage(userIds, messages, env) {
  return await Promise.all(userIds.map(async (uid) => {
    try {
      const resp = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.LINE_CHANNEL_TOKEN}`,
        },
        body: JSON.stringify({ to: uid, messages }),
      });
      const text = resp.ok ? '' : await resp.text().catch(() => '');
      return { userId: uid, ok: resp.ok, status: resp.status, error: text || undefined };
    } catch (e) {
      return { userId: uid, ok: false, error: String(e && e.message || e) };
    }
  }));
}

async function replyLine(replyToken, text, env) {
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.LINE_CHANNEL_TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
    });
  } catch (e) { console.error('[reply]', e); }
}

async function verifyLineSignature(body, signature, secret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
    return sigB64 === signature;
  } catch (e) {
    console.error('[verifyLineSignature]', e);
    return false;
  }
}

// ======================================================================
// Flex Message：任務指派卡片（帶「✓ 標記完成」按鈕）
// ======================================================================
function buildTaskAssignedFlex(task, env) {
  const dashboardUrl = env.DASHBOARD_URL || 'https://kelly83117.github.io/ec-dashboard/';
  const dueText = task.due ? task.due.replace(/-/g, '/') : '無';
  const assigneeText = task.assignee || '全體';
  return {
    type: 'flex',
    altText: `🔔 老闆指派任務：${(task.desc || '').slice(0, 30)}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'text', text: '🔔 老闆指派任務', weight: 'bold', size: 'sm', color: '#92400e' },
        ],
        backgroundColor: '#fef3c7', paddingAll: 'md',
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: task.desc || '', weight: 'bold', size: 'lg', wrap: true, color: '#1f2937' },
          { type: 'separator', margin: 'sm' },
          { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'sm', contents: [
            { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
              { type: 'text', text: '👤', size: 'sm', flex: 0 },
              { type: 'text', text: assigneeText, size: 'sm', color: '#6b7280' },
            ]},
            { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
              { type: 'text', text: '📅', size: 'sm', flex: 0 },
              { type: 'text', text: dueText, size: 'sm', color: '#6b7280' },
            ]},
          ]},
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', color: '#10b981', height: 'sm',
            action: {
              type: 'postback',
              label: '✓ 標記完成',
              data: `action=complete&taskId=${encodeURIComponent(task.id || '')}`,
              displayText: '✓ 標記完成',
            },
          },
          {
            type: 'button', style: 'link', height: 'sm',
            action: { type: 'uri', label: '看詳情', uri: dashboardUrl },
          },
        ],
      },
    },
  };
}

// ======================================================================
// Firestore REST helpers
// ======================================================================
async function firestoreGetFields(docPath, env) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Firestore GET ${docPath}: ${resp.status}`);
  const data = await resp.json();
  return data.fields || {};
}

async function firestorePatchField(docPath, fieldName, valueFirestore, env) {
  const fieldPath = '`' + fieldName + '`';
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}?updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`;
  const body = { fields: { [fieldName]: valueFirestore } };
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Firestore PATCH ${docPath}: ${resp.status} ${txt}`);
  }
}

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFirestoreValue) } };
  }
  if (typeof v === 'object') {
    const fields = {};
    Object.entries(v).forEach(([k, val]) => { fields[k] = toFirestoreValue(val); });
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function fromFirestoreValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) {
    const result = {};
    Object.entries(v.mapValue.fields || {}).forEach(([k, val]) => {
      result[k] = fromFirestoreValue(val);
    });
    return result;
  }
  return null;
}

// ======================================================================
// HTTP helpers
// ======================================================================
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Notify-Secret, X-Line-Signature',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResp(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}
