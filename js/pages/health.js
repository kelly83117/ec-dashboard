/* js/pages/health.js -- 通路健診（塊 A：全通路「獲利、成長」），以 Object.assign(App, ...) 合併回 App
 *
 * 方案：docs/plan-channel-health.md（§1-1 範圍、§2 規則、§4 畫面）。
 * 路由 'health'：【不是部門】（不走 office-），不碰 ec.departments / canAccessOffice / OFFICE_FEATURES；所有登入者都能看（app.js _isRouteAllowed）。
 * 純讀取頁：不寫雲端、不寫 Store、不新增 __cloud 物件。分數一律當場用 HEALTH_RULES 重算，不存檔；同樣的資料一定得到同樣的分數。
 * 資料：只有 KPI 月結，經 profit.js 的唯讀轉接 window.__healthKpiSnapshot(months)（口徑＝KPI 頁：_kpiShopCalc／_kpiRealRev／_kpiCommonColTotals）。
 *   profit.js 是動態載入：進頁先 await window.__ensureProfit()，載完再 render（同 daily.js / offices.js）。塊 A 不叫任何 __load*Subs。
 * 沒資料不得算成 0 分：每個子指標 / 面向都帶 status —— ok｜na（不適用）｜insufficient（資料不足）｜pending（尚未上傳）｜smallRev（營收過小）；
 *   整個通路另有 closed（已關站）。只有 ok 的才有分數、才參與加權。
 * 不加進 app.js 的 CLOUD_RENDER_ROUTES：雲端推播不重畫這頁（白名單設計）；畫面上有「↻ 重新計算」。
 * 事件：data-hl-* ＋ #main-content 上【只綁一次】的具名委派（同 inventory.js），不寫 inline handler，所以本檔函式不必掛 window。
 * Console：__healthBacktest({from,to})＝唯讀回測（印原始值與各類型 P10／P25／P50／P75）；
 *   __healthMock('demo'|'empty'|false)＝本機假資料，只在 localhost 生效、資料只在記憶體（見檔尾）。
 * 本檔分三區：① 純函式（不碰 window／Store／DOM／Date.now，node 可直接載入測試）② 資料收集 ③ 畫面。
 */
const App = window.App;
const { escapeHtml } = window;

/* ================================================================
 * ① 純函式區（node 測試直接載入本檔；這一區只能用參數，不碰 window 以外的任何全域）
 * ================================================================ */

// 深凍結：規則表改不動（改門檻＝改程式＋升 version）
function _hlDeepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.keys(o).forEach(k => _hlDeepFreeze(o[k]));
  }
  return o;
}

// 🔴 規則表（docs/plan-channel-health.md §2、§2-7-1）。改任何一個數字都要升 version。
//   v2-2026-11（2026-11-02 用真實 KPI 2026-01～10 校準）：
//     純利率零分線固定 0%（損益兩平）、滿分線＝該類型 P75 四捨五入到整數 %（買斷／小通路、業外沒有樣本，維持 10%）；
//     毛利率改成「只顯示不計分」（幾乎不動、由平台價格結構決定，分數只會反映門檻畫在哪裡），獲利面向只用純利率；
//     成長全通路共用一套：(P75 − P10) × 1.25、中位數 65 分、捨入 0.5pp（蝦皮窗口含 2026-02／03 的 12 筆不列入校準樣本，照常評分）。
//   健診凍結自己的一份門檻，不讀淨利表的 getAnaThresh / getGrowthThresh（那邊被改時，健診分數不該悄悄跟著變）。
//   比率一律是小數（0.15＝15%）。zero＝零分線、full＝滿分線；zero > full 代表越低越好（同一支 _hlLinear 處理）。
//   子指標 scored:false＝只顯示原始值、不計分（不進面向分數、不進主要扣分原因）。
//   「📖 怎麼看這頁」的門檻數字從這張表產生（_hlGuideBlocks），改這裡說明會自動跟著變。
const HEALTH_RULES = _hlDeepFreeze({
  version: 'v2-2026-11',
  firstMonth: '2026-01',               // 月份下拉最早到這個月（KPI 月結從 2026-01 開始）
  lights: { green: 80, yellow: 50 },   // ≥80 綠、50–79 黃、<50 紅（同 KPI 評分表 scoreColor 的門檻）
  minRev: 30000,                       // 月營收 < 3 萬 ⇒ 比率類子指標不評分（同 profit.js KPI_ANOMALY_RULES.minRev）
  defaultMonthFillRatio: 0.9,          // 預設評分月份：上個月全通路 KPI 填寫率 ≥ 90% 才用，否則再往前一個月
  pendingLookback: 3,                  // 頁頂「KPI 尚未填完」列：評分月份＋往前幾個月（只影響提示，不影響分數）
  // 面向（權重合計 100）。impl＝這個規則版本已實作；沒實作的不算進「依 N/M」的 M，卡片底部灰字列出。
  dims: [
    { key: 'profit',    label: '獲利',     w: 30, impl: true },
    { key: 'growth',    label: '成長',     w: 20, impl: true },
    { key: 'ads',       label: '廣告效率', w: 15, impl: false },
    { key: 'structure', label: '商品結構', w: 20, impl: false },
    { key: 'ops',       label: '營運執行', w: 10, impl: false },
    { key: 'traffic',   label: '流量',     w: 5,  impl: false },
  ],
  // 正式分：有「獲利」分數，而且至少還有 formalMinDims − 1 個其他面向有分數；否則是灰色參考分、不排名（§2-2）
  formalMinDims: 2,
  profit: {
    subs: [
      { key: 'pureRate',  label: '純利率', w: 1, formula: '純利 ÷ 實際營收', desc: '每 100 元營收最後留下多少純利（扣掉成本、廣告、手續費、各項費用）' },
      { key: 'grossRate', label: '毛利率', w: 0, scored: false, formula: '（實際營收 − 商品成本）÷ 實際營收',
        desc: '只扣商品成本的利潤率',
        why: '毛利率由各平台的價格結構決定（例如 MOMO 甲配長期約 69～70%），月與月幾乎不動，拿來評分只會反映門檻畫在哪裡，所以第一版只顯示供參考；獲利面向以純利率評分。' },
    ],
  },
  growth: {
    window: 2,   // 近 2 個月 vs 前 2 個月（合計對合計）
    // 全通路共用一套（v2 校準：純利率變化 P10 −3.6pp／P50 +0.4pp／P75 +1.6pp；營收成長 P10 −15.4%／P50 +5.3%／P75 +16.2%）
    subs: [
      { key: 'purePp', label: '純利率變化', w: 0.5, zero: -0.04, full: 0.025, unit: 'pp',
        formula: '近 2 個月合計純利率 − 前 2 個月合計純利率（百分點）', desc: '純利率比前一段時間變好還是變差' },
      { key: 'revGrowth', label: '營收成長', w: 0.5, zero: -0.205, full: 0.19, unit: 'signedPct',
        formula: '近 2 個月營收合計 ÷ 前 2 個月營收合計 − 1', desc: '營收比前一段時間多還是少' },
    ],
  },
  // 依通路類型的門檻（[零分線, 滿分線]）。order＝總覽分組順序。
  //   純利率 v2 校準（真實 KPI 2026-01～10 的 P50 → 滿分線取 P75）：蝦皮自營 P50 20.3%、MOMO 自出貨 37.8%、MOMO 寄倉 24.3%、MO+ 28.1%、酷澎商城 26.8%（樣本 6）。
  types: {
    shopee:  { label: '蝦皮自營',     order: 1, pureRate: [0, 0.24], members: '好麻吉、玩樂、森之旅、維克' },
    momoJia: { label: 'MOMO 自出貨',  order: 2, pureRate: [0, 0.39], members: 'MOMO 甲配' },
    momoYi:  { label: 'MOMO 寄倉',    order: 3, pureRate: [0, 0.26], members: 'MOMO 乙配（寄倉）' },
    moplus:  { label: 'MO+',          order: 4, pureRate: [0, 0.29], members: 'MO+ 麻吉、MO+ 森之旅、MO+ 玩樂' },
    coupang: { label: '酷澎商城',     order: 5, pureRate: [0, 0.34], members: '酷澎 商城-好麻吉、商城-露營館' },
    small:   { label: '買斷／小通路', order: 6, pureRate: [0, 0.10], members: '酷澎買斷、PChome、FriDay、博客來' },
    other:   { label: '業外',         order: 7, pureRate: [0, 0.10], members: '業外（不排名）' },
  },
  // ⓘ 固定說明（依 KPI 群組）
  notes: {
    shopee: {
      rev: '蝦皮營收照撥款日入帳，月份間會跳動（例：2 月農曆年撥款延後、3 月補回），看 2～3 月的成長要特別小心。',
      pure: '蝦皮各店純利不含整組共同運費（物流運費只扣在蝦皮小計），各店純利率會比小計高。',
    },
    momo: { rev: 'MOMO 營收用 KPI「實際營收」（營收(進價稅) − 退貨金額），含稅口徑，跟蝦皮的未稅營收不能直接比。' },
    pchome: { pure: 'PChome 只有一家店，純利用整組數字（已扣物流運費），同 KPI 月結單店列。' },
  },
});

// 健診通路對照表（盤點 §1-0）。group / shop＝KPI_GROUPS 的 key 與店名（profit.js），寫錯會整列「尚未上傳」。
//   ranked:false＝列出、照算分，但不參加排名（業外不是真正的銷售通路；官網已關站）。
const HEALTH_CHANNELS = _hlDeepFreeze([
  { id: 'shopee-maji',    label: '好麻吉',          type: 'shopee',  group: 'shopee',  shop: '好麻吉' },
  { id: 'shopee-wanle',   label: '玩樂',            type: 'shopee',  group: 'shopee',  shop: '玩樂' },
  { id: 'shopee-sen',     label: '森之旅',          type: 'shopee',  group: 'shopee',  shop: '森之旅' },
  { id: 'shopee-wick',    label: '維克',            type: 'shopee',  group: 'shopee',  shop: '維克' },
  { id: 'momo-jia',       label: 'MOMO 甲配',       type: 'momoJia', group: 'momo',    shop: 'MOMO-甲配' },
  { id: 'momo-yi',        label: 'MOMO 乙配（寄倉）', type: 'momoYi', group: 'momo',    shop: 'MOMO-寄倉' },
  { id: 'moplus-maji',    label: 'MO+ 麻吉',        type: 'moplus',  group: 'momo',    shop: 'mo+0號店(好麻吉)' },
  { id: 'moplus-sen',     label: 'MO+ 森之旅',      type: 'moplus',  group: 'momo',    shop: 'mo+1號店(森之旅)' },
  { id: 'moplus-wanle',   label: 'MO+ 玩樂',        type: 'moplus',  group: 'momo',    shop: 'mo+2號店(玩樂)' },
  { id: 'coupang-maji',   label: '酷澎 商城-好麻吉', type: 'coupang', group: 'coupang', shop: '商城-好麻吉' },
  { id: 'coupang-luying', label: '酷澎 商城-露營館', type: 'coupang', group: 'coupang', shop: '商城-露營館' },
  { id: 'coupang-buyout', label: '酷澎買斷',        type: 'small',   group: 'coupang', shop: '酷澎買斷' },
  { id: 'pchome',         label: 'PChome',          type: 'small',   group: 'pchome',  shop: 'PChome' },
  { id: 'friday',         label: 'FriDay',          type: 'small',   group: 'friday',  shop: 'FriDay' },
  { id: 'books',          label: '博客來',          type: 'small',   group: 'books',   shop: '博客來' },
  { id: 'other',          label: '業外',            type: 'other',   group: 'other',   shop: '業外',  ranked: false },
  { id: 'website',        label: '官網',            type: 'small',   group: 'website', shop: '官網',  ranked: false },
]);

/* ---------- 月份 ---------- */
function _hlIsYm(s) { return typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s); }
function _hlAddMonth(ym, n) {
  const y = +ym.slice(0, 4), m0 = +ym.slice(5, 7) - 1 + n;
  const yy = y + Math.floor(m0 / 12), mm = ((m0 % 12) + 12) % 12;
  return yy + '-' + String(mm + 1).padStart(2, '0');
}
function _hlMonthRange(from, to) {
  const out = [];
  if (!_hlIsYm(from) || !_hlIsYm(to) || from > to) return out;
  for (let m = from; m <= to; m = _hlAddMonth(m, 1)) out.push(m);
  return out;
}
function _hlYmLabel(ym) { return _hlIsYm(ym) ? ym.replace('-', '/') : String(ym); }
// 台灣時間的年月（UTC+8，台灣沒有夏令時間）。傳 ms 進來，本函式不讀時鐘。
function _hlTaipeiYm(ms) { return new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 7); }

/* ---------- 數字 ---------- */
function _hlFinite(v) { return typeof v === 'number' && isFinite(v); }
// 線性給分：v 在零分線＝0、滿分線＝100、中間線性、兩端截斷。zero > full＝越低越好。
//   🔴 v 不是有限數字 ⇒ 回 null（沒資料），【絕不回 0】—— 這是健診跟 KPI 評分表 scoreCalcMetric 最大的差別。
function _hlLinear(v, zero, full) {
  if (!_hlFinite(v) || !_hlFinite(zero) || !_hlFinite(full)) return null;
  if (zero === full) return v >= full ? 100 : 0;
  const t = (v - zero) / (full - zero);
  return Math.max(0, Math.min(1, t)) * 100;
}
function _hlLight(score, rules) {
  if (!_hlFinite(score)) return 'none';
  const L = (rules || HEALTH_RULES).lights;
  return score >= L.green ? 'green' : score >= L.yellow ? 'yellow' : 'red';
}
// 顯示用：無條件捨去（理由同 profit.js scoreFmt 上方註解：顯示值不可高於實際值，79.6 不會顯示成 80 卻是黃燈）
function _hlFmtScore(s) { return _hlFinite(s) ? String(Math.floor(s)) : '—'; }
function _hlFmtPct(v, d) { return _hlFinite(v) ? (v * 100).toFixed(d == null ? 1 : d) + '%' : '—'; }
function _hlFmtPp(v) { return _hlFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + 'pp' : '—'; }
function _hlFmtSignedPct(v) { return _hlFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%' : '—'; }
function _hlFmtMoney(v) { return _hlFinite(v) ? (v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US') : '—'; }
function _hlFmtRaw(v, unit) { return unit === 'pp' ? _hlFmtPp(v) : unit === 'signedPct' ? _hlFmtSignedPct(v) : _hlFmtPct(v); }

/* ---------- 讀轉接資料（snap＝__healthKpiSnapshot 的回傳形狀） ---------- */
function _hlCell(snap, m, ch) {
  const mo = snap && snap.months && snap.months[m];
  const g = mo && mo.groups && mo.groups[ch.group];
  return (g && g[ch.shop]) || null;
}
function _hlGroupMeta(snap, ch) { return ((snap && snap.groups) || []).find(g => g.key === ch.group) || null; }
// 這家店從哪個月起才有 KPI（group.since 或 shopSince 取較晚的那個）
function _hlSince(snap, ch) {
  const g = _hlGroupMeta(snap, ch);
  if (!g) return null;
  const a = g.since || null, b = (g.shopSince && g.shopSince[ch.shop]) || null;
  return a && b ? (a > b ? a : b) : (a || b);
}
function _hlClosedFrom(snap, ch) { const g = _hlGroupMeta(snap, ch); return (g && g.closedFrom) || null; }
function _hlFillDone(c) { return !!c && c.fill && c.fill.total > 0 && c.fill.filled >= c.fill.total; }
// 某月 KPI 是否「這家店可用」：在 since 之後、而且這家店的格子都填了
function _hlCellUsable(c) { return !!c && !c.beforeSince && _hlFillDone(c); }

/* ---------- 子指標 / 面向 ---------- */
function _hlSubs(defs, status, reason, extra) {
  return defs.map(s => Object.assign({ key: s.key, label: s.label, w: s.w, formula: s.formula, unit: s.unit || 'pct',
    scored: s.scored !== false, why: s.why || '', status, reason: reason || '', raw: null, zero: null, full: null, score: null, trace: null, note: '' },
    extra ? extra(s) : null));
}
// 面向分數＝有分數的「計分」子指標按權重重新正規化（scored:false 的只顯示、不參與）。一個都沒有 ⇒ 面向沒分數，status 取第一個計分子指標的狀態。
function _hlFinishDim(def, subs) {
  const ok = subs.filter(s => s.scored !== false && s.status === 'ok' && _hlFinite(s.score));
  if (!ok.length) {
    const s0 = subs.find(s => s.scored !== false) || subs[0] || { status: 'insufficient', reason: '' };
    return { key: def.key, label: def.label, w: def.w, status: s0.status, reason: s0.reason, score: null, subs };
  }
  const sw = ok.reduce((a, s) => a + s.w, 0);
  const score = ok.reduce((a, s) => a + s.score * s.w, 0) / sw;
  return { key: def.key, label: def.label, w: def.w, status: 'ok', reason: '', score, subs };
}
function _hlPendingReason(m, c) {
  if (!c || !c.fill || !c.fill.total) return `尚未上傳：${_hlYmLabel(m)} 沒有 KPI 資料`;
  return `尚未上傳：${_hlYmLabel(m)} KPI 已填 ${c.fill.filled}/${c.fill.total}`;
}

// 獲利：純利率（計分，門檻依通路類型）＋毛利率（v2 起只顯示、不計分）
function _hlProfitDim(ch, m, snap, R) {
  const def = R.dims.find(d => d.key === 'profit');
  const t = R.types[ch.type];
  const lim = s => (t[s.key] ? { zero: t[s.key][0], full: t[s.key][1] } : { zero: null, full: null });
  const fail = (status, reason) => _hlFinishDim(def, _hlSubs(R.profit.subs, status, reason, lim));
  const c = _hlCell(snap, m, ch);
  if (c && c.beforeSince) return fail('insufficient', `資料不足：${ch.label} 從 ${_hlYmLabel(_hlSince(snap, ch))} 起才有 KPI`);
  if (!_hlFillDone(c)) return fail('pending', _hlPendingReason(m, c));
  if (!(c.rev >= R.minRev)) return fail('smallRev', `營收過小（${_hlFmtMoney(c.rev)}，未滿 ${_hlFmtMoney(R.minRev)}），本月比率類指標不評分`);
  const notes = R.notes[ch.group] || {};
  const src = `app/kpi ${m} ${ch.group}.${ch.shop}`;
  const subs = _hlSubs(R.profit.subs, 'ok', '', s => {
    const raw = s.key === 'pureRate' ? c.pure / c.rev : (c.rev - c.cost) / c.rev;
    const num = s.key === 'pureRate' ? c.pure : c.rev - c.cost;
    const L = lim(s);
    return Object.assign(L, { raw, score: s.scored === false ? null : _hlLinear(raw, L.zero, L.full),
      trace: { src: src + (s.key === 'pureRate' ? '（純利 ÷ 實際營收）' : '（實際營收 − 商品成本）'), num, den: c.rev },
      note: [notes.rev, s.key === 'pureRate' ? notes.pure : ''].filter(Boolean).join(' ') });   // 不計分的理由（why）有自己的 ⓘ，不重複放這裡
  });
  return _hlFinishDim(def, subs);
}

// 成長：近 N 個月 vs 前 N 個月（N＝R.growth.window），合計對合計。純利率變化（pp）50%、營收成長 50%。
function _hlGrowthDim(ch, m, snap, R) {
  const def = R.dims.find(d => d.key === 'growth');
  const N = R.growth.window;
  const lim = s => ({ zero: s.zero, full: s.full });
  const fail = (status, reason) => _hlFinishDim(def, _hlSubs(R.growth.subs, status, reason, lim));
  const W = [];
  for (let i = 2 * N - 1; i >= 0; i--) W.push(_hlAddMonth(m, -i));   // W[0] 最舊 … W[2N-1]＝m
  const cells = W.map(x => _hlCell(snap, x, ch));
  const cur = cells[cells.length - 1];
  if (cur && cur.beforeSince) return fail('insufficient', `資料不足：${ch.label} 從 ${_hlYmLabel(_hlSince(snap, ch))} 起才有 KPI`);
  if (!_hlFillDone(cur)) return fail('pending', _hlPendingReason(m, cur));
  if (W[0] < R.firstMonth) {
    return fail('insufficient', `資料不足：成長需要前後各 ${N} 個月，KPI 月結從 ${_hlYmLabel(R.firstMonth)} 開始（${_hlYmLabel(_hlAddMonth(R.firstMonth, 2 * N - 1))} 起評分）`);
  }
  const since = _hlSince(snap, ch);
  if (since && W[0] < since) {
    return fail('insufficient', `資料不足：成長需要前後各 ${N} 個月，${ch.label} 從 ${_hlYmLabel(since)} 起才有資料（${_hlYmLabel(_hlAddMonth(since, 2 * N - 1))} 起評分）`);
  }
  const badIdx = cells.findIndex(c => !_hlCellUsable(c));
  if (badIdx >= 0) {
    return fail('insufficient', `資料不足：成長需要 ${_hlYmLabel(W[0])}～${_hlYmLabel(W[W.length - 1])} 共 ${2 * N} 個月的 KPI，${_hlYmLabel(W[badIdx])} 還沒填完`);
  }
  const prior = cells.slice(0, N), recent = cells.slice(N);
  const sum = (arr, k) => arr.reduce((a, c) => a + (Number(c[k]) || 0), 0);
  const pr = sum(prior, 'rev'), rr = sum(recent, 'rev'), pp = sum(prior, 'pure'), rp = sum(recent, 'pure');
  if (!(pr >= R.minRev * N) || !(rr >= R.minRev * N)) {
    return fail('smallRev', `營收過小（前 ${N} 月 ${_hlFmtMoney(pr)}、近 ${N} 月 ${_hlFmtMoney(rr)}，每月平均未滿 ${_hlFmtMoney(R.minRev)}），成長不評分`);
  }
  const notes = R.notes[ch.group] || {};
  const range = (a) => `${_hlYmLabel(a[0])}～${_hlYmLabel(a[a.length - 1])}`;
  const src = `app/kpi ${ch.group}.${ch.shop}：近 ${range(W.slice(N))} vs 前 ${range(W.slice(0, N))}`;
  const subs = _hlSubs(R.growth.subs, 'ok', '', s => {
    const raw = s.key === 'purePp' ? (rp / rr - pp / pr) : (rr / pr - 1);
    const trace = s.key === 'purePp'
      ? { src, text: `近期 ${_hlFmtMoney(rp)} ÷ ${_hlFmtMoney(rr)} = ${_hlFmtPct(rp / rr)}；前期 ${_hlFmtMoney(pp)} ÷ ${_hlFmtMoney(pr)} = ${_hlFmtPct(pp / pr)}` }
      : { src, num: rr, den: pr };
    return Object.assign(lim(s), { raw, score: _hlLinear(raw, s.zero, s.full), trace, note: notes.rev || '' });
  });
  return _hlFinishDim(def, subs);
}

const _HL_DIM_FNS = { profit: _hlProfitDim, growth: _hlGrowthDim };

// 主要扣分原因：(100 − 得分) × 子指標權重 × 面向權重 最大的那一個子指標（規則產生，不是 AI）
function _hlTopReason(dims) {
  let best = null;
  dims.forEach(d => (d.status === 'ok' ? d.subs : []).forEach(s => {
    if (s.scored === false || s.status !== 'ok' || !_hlFinite(s.score)) return;
    const loss = (100 - s.score) * s.w * d.w;
    if (loss > 0 && (!best || loss > best.loss)) best = { loss, d, s };
  }));
  if (!best) return '';
  const { s } = best;
  const dir = s.zero > s.full ? '≤' : '≥';
  return `${s.label} ${_hlFmtRaw(s.raw, s.unit)}（滿分線 ${dir} ${_hlFmtRaw(s.full, s.unit)}）`;
}

// 🔴 一個通路一個月的健診。純函式：同樣的 (ch, month, snap, rules) 一定得到同樣的結果。
//   回 { id, label, type, month, status, reason, score, light, isReference, ranked, dimsUsed:N, dimsTotal:M, dims:[…], next:[…], topReason, fill }
function computeChannelHealth(ch, month, snap, rules) {
  const R = rules || HEALTH_RULES;
  const base = { id: ch.id, label: ch.label, type: ch.type, month, rulesVersion: R.version,
    next: R.dims.filter(d => !d.impl).map(d => d.label) };
  const c = _hlCell(snap, month, ch);
  const closedFrom = _hlClosedFrom(snap, ch);
  if ((c && c.closed) || (closedFrom && month >= closedFrom)) {
    return Object.assign(base, { status: 'closed', reason: `已關站（${_hlYmLabel(closedFrom)} 起）`, score: null, light: 'none',
      isReference: false, ranked: false, dimsUsed: 0, dimsTotal: 0, dims: [], topReason: '', fill: c ? c.fill : null });
  }
  const dims = R.dims.filter(d => d.impl && _HL_DIM_FNS[d.key]).map(d => _HL_DIM_FNS[d.key](ch, month, snap, R));
  const applicable = dims.filter(d => d.status !== 'na');
  const ok = dims.filter(d => d.status === 'ok' && _hlFinite(d.score));
  const sw = ok.reduce((a, d) => a + d.w, 0);
  const score = ok.length ? ok.reduce((a, d) => a + d.score * d.w, 0) / sw : null;
  const hasProfit = ok.some(d => d.key === 'profit');
  const isReference = score != null && !(hasProfit && ok.length >= R.formalMinDims);
  const ranked = ch.ranked !== false && score != null && !isReference;
  const profitDim = dims.find(d => d.key === 'profit');
  return Object.assign(base, {
    status: score != null ? 'ok' : (profitDim ? profitDim.status : 'insufficient'),
    reason: score != null ? '' : (profitDim ? profitDim.reason : ''),
    score, light: _hlLight(score, R), isReference, ranked,
    dimsUsed: ok.length, dimsTotal: applicable.length, dims,
    topReason: _hlTopReason(dims), fill: c ? c.fill : null,
  });
}

// 近 n 個月走勢（含 month 本身，舊→新）
function computeHealthTrend(ch, month, n, snap, rules) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = _hlAddMonth(month, -i);
    const R = rules || HEALTH_RULES;
    if (m < R.firstMonth) continue;
    out.push(computeChannelHealth(ch, m, snap, rules));
  }
  return out;
}

// 同類型內排名（只排 ranked 的）。回 { 通路 id: 名次 }；同分用 id 排序，結果穩定。
function _hlRank(results) {
  const byType = {};
  results.filter(r => r.ranked).forEach(r => { (byType[r.type] = byType[r.type] || []).push(r); });
  const rank = {};
  Object.keys(byType).forEach(t => {
    byType[t].sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : 1)).forEach((r, i) => { rank[r.id] = i + 1; });
  });
  return rank;
}

// 預設評分月份：台灣時間的上個月；那個月全通路（未關站、已開始的店）KPI 填寫率 < defaultMonthFillRatio ⇒ 再往前一個月
function healthDefaultMonth(snap, todayYm, channels, rules) {
  const R = rules || HEALTH_RULES;
  const cand = _hlAddMonth(todayYm, -1);
  let filled = 0, total = 0;
  (channels || HEALTH_CHANNELS).forEach(ch => {
    const c = _hlCell(snap, cand, ch);
    if (!c || c.closed || c.beforeSince || !c.fill) return;
    filled += c.fill.filled; total += c.fill.total;
  });
  const m = (total > 0 && filled / total >= R.defaultMonthFillRatio) ? cand : _hlAddMonth(cand, -1);
  return m < R.firstMonth ? R.firstMonth : m;
}

// 總覽排序：類型 order → 類型內 正式分高→低 → 參考分 → 沒分數；業外、官網（關站）固定在最後。
function _hlSortResults(results, rules) {
  const R = rules || HEALTH_RULES;
  const tier = r => (r.status === 'closed' ? 3 : r.score == null ? 2 : r.isReference ? 1 : 0);
  const typeOrd = r => (r.status === 'closed' ? 99 : (R.types[r.type] || {}).order || 50);
  return results.slice().sort((a, b) => (typeOrd(a) - typeOrd(b)) || (tier(a) - tier(b))
    || ((b.score || 0) - (a.score || 0)) || (a.id < b.id ? -1 : 1));
}

// 百分位（nearest-rank）。回 { n, p10, p25, p50, p75 }；空陣列全 null。
function _hlPercentiles(vals) {
  const a = vals.filter(_hlFinite).sort((x, y) => x - y);
  const p = q => a.length ? a[Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1))] : null;
  return { n: a.length, p10: p(0.10), p25: p(0.25), p50: p(0.50), p75: p(0.75) };
}

// 回測（純函式）：逐通路逐月算原始值與分數；另依類型算各子指標的百分位，附「建議零分線＝P10、滿分線＝P75」。
function healthBacktest(snap, months, channels, rules) {
  const R = rules || HEALTH_RULES;
  const rows = [], vals = {};
  (channels || HEALTH_CHANNELS).forEach(ch => months.forEach(m => {
    const r = computeChannelHealth(ch, m, snap, R);
    const row = { 通路: ch.label, 月: m, 類型: (R.types[ch.type] || {}).label || ch.type, 狀態: r.status };
    r.dims.forEach(d => d.subs.forEach(s => {
      row[s.label + (s.scored === false ? '（參考）' : '')] = s.status === 'ok' ? _hlFmtRaw(s.raw, s.unit) : s.status;
      if (s.status === 'ok' && s.scored !== false && ch.ranked !== false) {
        const k = ch.type + '|' + s.key;
        (vals[k] = vals[k] || { 類型: (R.types[ch.type] || {}).label || ch.type, 子指標: s.label, unit: s.unit, xs: [] }).xs.push(s.raw);
      }
    }));
    r.dims.forEach(d => { row[d.label + '分'] = d.status === 'ok' ? _hlFmtScore(d.score) : d.status; });
    row.總分 = r.score == null ? '—' : _hlFmtScore(r.score) + (r.isReference ? '（參考）' : '');
    rows.push(row);
  }));
  const pct = Object.keys(vals).map(k => {
    const v = vals[k], q = _hlPercentiles(v.xs), f = x => _hlFmtRaw(x, v.unit);
    return { 類型: v.類型, 子指標: v.子指標, 筆數: q.n, P10: f(q.p10), P25: f(q.p25), P50: f(q.p50), P75: f(q.p75) };
  });
  return { rows, pct };
}

// 頁頂「KPI 尚未填完」：評分月份與往前 lookback 個月內，KPI 沒填完的通路與月份（不含人名）。
//   跳過：已關站、since 之前、沒有那家店資料列的月份；月份不早於 firstMonth。
//   同一通路「連續月份且已填／應填格數相同」併成一項：{ id, label, from, to, filled, total }，from＝最早那個月（跳轉用）。
//   順序＝HEALTH_CHANNELS 順序，同通路由舊到新。全部填完回 []。
function healthPendingKpi(snap, month, channels, rules) {
  const R = rules || HEALTH_RULES;
  const out = [];
  if (!_hlIsYm(month)) return out;
  let from = _hlAddMonth(month, -R.pendingLookback);
  if (from < R.firstMonth) from = R.firstMonth;
  const ms = _hlMonthRange(from, month);
  (channels || HEALTH_CHANNELS).forEach(ch => {
    let cur = null;
    ms.forEach(m => {
      const c = _hlCell(snap, m, ch);
      const pending = !!c && !c.closed && !c.beforeSince && c.fill && c.fill.total > 0 && c.fill.filled < c.fill.total;
      if (!pending) { cur = null; return; }
      if (cur && cur.to === _hlAddMonth(m, -1) && cur.filled === c.fill.filled && cur.total === c.fill.total) { cur.to = m; return; }
      cur = { id: ch.id, label: ch.label, from: m, to: m, filled: c.fill.filled, total: c.fill.total };
      out.push(cur);
    });
  });
  return out;
}
// 「2026/07～09」「2026/09」「2025/12～2026/01」
function _hlRangeLabel(from, to) {
  if (from === to) return _hlYmLabel(from);
  return from.slice(0, 4) === to.slice(0, 4) ? `${_hlYmLabel(from)}～${to.slice(5)}` : `${_hlYmLabel(from)}～${_hlYmLabel(to)}`;
}

// 「📖 怎麼看這頁」內容（App.openGuide 的 blocks：{h,p}／{h,ol}／{warn}）。寫給非工程師看。
//   🔴 門檻、權重、燈號、營收門檻、版本一律從 rules 產生，不在文字裡寫死；改 HEALTH_RULES 說明自動跟著變。
function _hlGuideBlocks(rules) {
  const R = rules || HEALTH_RULES;
  const live = R.dims.filter(d => d.impl), later = R.dims.filter(d => !d.impl);
  const P0 = v => (Math.round(v * 1000) / 10).toString() + '%';
  const subLine = (s, lims) => {
    if (s.scored === false) return `${s.label}（參考，不計分）：${s.desc}。\n公式：${s.formula}。`;
    return `${s.label}（佔這個面向的 ${Math.round(s.w * 100)}%）：${s.desc}。\n公式：${s.formula}。\n${lims}`;
  };
  const types = Object.keys(R.types).map(k => R.types[k]).sort((a, b) => a.order - b.order);
  // 零分線各類型都一樣時合併成一句（v2 全部是損益兩平）；不一樣就逐類型列
  const zeros = [...new Set(types.map(t => t.pureRate[0]))];
  const pureLims = (zeros.length === 1
    ? `零分線一律 ${P0(zeros[0])}${zeros[0] === 0 ? '（損益兩平）' : ''}；滿分線依通路類型：` + types.map(t => `${t.label} ${P0(t.pureRate[1])}`).join('、')
    : '零分線→滿分線依通路類型：' + types.map(t => `${t.label} ${P0(t.pureRate[0])}→${P0(t.pureRate[1])}`).join('、')) + '。';
  const pure = R.profit.subs.find(s => s.key === 'pureRate') || R.profit.subs[0];
  const ex = pure && R.types.shopee ? { full: R.types.shopee.pureRate[1], zero: R.types.shopee.pureRate[0] } : null;
  const gross = R.profit.subs.find(s => s.scored === false);
  const notes = [];
  Object.keys(R.notes).forEach(g => Object.keys(R.notes[g]).forEach(k => { if (!(g === 'shopee' && k === 'rev')) notes.push(R.notes[g][k]); }));
  return [
    { h: '這頁在做什麼', p: '每個月幫每個通路做一次「體檢」，用分數和燈號看出哪個通路賺得好、哪個在退步。分數全部由固定規則從 KPI 月結算出來，沒有人手動打分數；同樣的資料一定得到同樣的分數。' },
    { h: '資料從哪裡來', p: '目前只用「KPI 月結」裡各通路每個月的營收、商品成本、純利。某個通路某個月的 KPI 還沒填完，那個月就顯示「尚未上傳」，不會亂算。' },
    { h: '頁面上方的「KPI 尚未填完」', ol: [
      `列出評分月份與往前 ${R.pendingLookback} 個月內，KPI 月結還沒填完的通路與月份；括號是「已填格數／應填格數」。`,
      '連續幾個月都沒填完、而且格數一樣的，合併成一項（例：2026/07～09）。',
      '點一項會跳到 KPI 月結表那一段的第一個月；沒有權限開 KPI 月結表時只顯示文字。',
      '全部填完時這一列不顯示。這一列只是提醒，本身不影響分數；沒填完的月份照「尚未上傳」處理。',
    ] },
    { h: '總分怎麼算', ol: [
      '總分＝各面向分數按權重平均（0～100 分）。',
      '目前計分的面向：' + live.map(d => `${d.label}（權重 ${d.w}）`).join('、') + '。',
      later.length ? '之後才會加入、現在不算分的面向：' + later.map(d => d.label).join('、') + '。' : '',
      '某個面向這個月沒有資料時，不算 0 分，改用其他有資料的面向重新平均。',
    ].filter(Boolean) },
    { h: '每個面向、子指標的意思', ol: [
      '【獲利】這個通路賺不賺錢。',
      ...R.profit.subs.map(s => subLine(s, s.key === 'pureRate' ? pureLims : '')),
      `【成長】跟自己前一段時間比，有沒有變好（近 ${R.growth.window} 個月合計 vs 前 ${R.growth.window} 個月合計，全通路共用同一套門檻）。`,
      ...R.growth.subs.map(s => subLine(s, `零分線 ${_hlFmtRaw(s.zero, s.unit)}、滿分線 ${_hlFmtRaw(s.full, s.unit)}。`)),
    ] },
    { h: '零分線與滿分線', p: '原始值到滿分線（含以上）＝100 分；在零分線（含以下）＝0 分；中間照比例給分。'
      + (ex ? `例：蝦皮自營的純利率零分線 ${P0(ex.zero)}、滿分線 ${P0(ex.full)}，純利率 ${P0((ex.zero + ex.full) / 2)} 就是 50 分。` : '') },
    { h: '燈號顏色', ol: [
      `綠：${R.lights.green} 分以上。`,
      `黃：${R.lights.yellow}～${R.lights.green - 1} 分。`,
      `紅：未滿 ${R.lights.yellow} 分。`,
      '灰：沒有分數（原因見下一段）。',
      `分數一律無條件捨去：${R.lights.green - 1}.6 分顯示 ${R.lights.green - 1}，仍是黃燈，不會出現「顯示 ${R.lights.green} 卻是黃燈」。`,
    ] },
    { h: '灰色狀態各代表什麼（都不算 0 分）', ol: [
      '不適用：這個通路本來就沒有這種資料（例：沒有逐商品廣告的通路，不會有廣告面向）。',
      '資料不足：期數還不夠（例：成長要前後各 ' + R.growth.window + ' 個月，新通路要等資料累積夠了才評分；畫面會寫從哪個月起評分）。',
      '尚未上傳：這個月的 KPI 還沒填完（畫面會寫已填幾格）。',
      `營收過小：當月營收未滿 ${_hlFmtMoney(R.minRev)}，比率類指標波動太大，不評分。`,
      '已關站：關站月份起不評分、不排名，走勢只畫到關站前。',
    ] },
    { h: '「依 N/M 個面向」', p: 'M＝這個通路目前能評的面向數；N＝這個月實際有分數的面向數。例：「依 1/2 個面向」代表只有一個面向有分數，另一個是灰色狀態。' },
    { h: '參考分', p: `要有「獲利」分數，而且總共至少 ${R.formalMinDims} 個面向有分數，才是正式分。不夠的話，總分顯示灰色斜體並標「參考」，不參加排名。` },
    { h: '通路類型與排名', ol: [
      ...types.map(t => `${t.label}：${t.members}`),
      '排名只在同一類型裡比（例：「類型第 1」）。不同類型的門檻、營收口徑都不同，跨類型的分數高低只供參考。',
      '業外、官網會列出來，但不參加排名。',
    ] },
    gross ? { h: '毛利率為什麼不計分', p: gross.why + '卡片上「毛利率（參考，不計分）」旁的 ⓘ 也有這段說明。' } : null,
    R.notes.shopee && R.notes.shopee.rev ? { warn: R.notes.shopee.rev } : null,
    notes.length ? { h: '其他口徑提醒', ol: notes } : null,
    { h: '比上月、主要扣分原因、走勢圖', ol: [
      '比上月：這個月總分減上個月總分。',
      '主要扣分原因：最拉低總分的那一個子指標，以及它離滿分線還差多少。',
      '點通路那一列展開卡片：看每個子指標的原始值、零分線、滿分線、得分，以及近 12 個月分數走勢（空心點＝參考分）。',
      '每個子指標旁的 ⓘ：公式、實際的分子分母數字、資料來源。',
    ] },
    { h: '規則版本', p: `目前是 ${R.version}。門檻有改就會升版本。分數不存檔，每次打開都用目前的規則重算，所以改版後舊月份的分數也會跟著變。` },
  ].filter(Boolean);
}

/* ================================================================
 * ② 資料收集區（只有這一區碰 window）
 * ================================================================ */
let _hlMock = null;          // __healthMock 開著時的假 snapshot 產生器（只在 localhost）
let _hlWaitTries = 0;        // KPI 還沒就緒時的重畫次數（最多 _HL_WAIT_MAX 次，之後照本機鏡像畫，並標示）
const _HL_WAIT_MAX = 20;     // × 600ms ≈ 12 秒
const _HL_TREND_N = 12;
const _hlState = { month: null, open: null };   // 只在記憶體：選的月份、展開的通路
let _hlChart = null;

function _hlIsLocalHost() {
  const h = String((window.location && window.location.hostname) || '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || h.endsWith('.localhost');
}
function _hlTodayYm() { return _hlTaipeiYm(Date.now()); }
// 要的月份：firstMonth 到本月（台灣時間）。firstMonth 之前 KPI 沒有資料，成長窗口碰到就標「資料不足」，不必去要。
function _hlNeedMonths() {
  const R = HEALTH_RULES;
  return _hlMonthRange(R.firstMonth, _hlTodayYm());
}
function _hlCollect() {
  const months = _hlNeedMonths();
  if (_hlMock) return _hlMock(months);
  if (typeof window.__healthKpiSnapshot !== 'function') return { ready: false, months: {}, groups: [], error: 'no-adapter' };
  return window.__healthKpiSnapshot(months);
}

/* ================================================================
 * ③ 畫面區
 * ================================================================ */
const _HL_STATUS_TEXT = { na: '不適用', insufficient: '資料不足', pending: '尚未上傳', smallRev: '營收過小', closed: '已關站' };

function _hlScoreHtml(r) {
  if (r.status === 'closed') return `<span class="hl-score hl-l-none">已關站</span>`;
  if (r.score == null) return `<span class="hl-score hl-l-none" title="${escapeHtml(r.reason)}">—</span>`;
  if (r.isReference) return `<span class="hl-score hl-ref" title="參考分：要有「獲利」再加至少 1 個面向有分數才算正式分，參考分不排名">${_hlFmtScore(r.score)}<small>參考</small></span>`;
  return `<span class="hl-score hl-l-${r.light}">${_hlFmtScore(r.score)}</span>`;
}
function _hlChipsHtml(r) {
  if (r.status === 'closed') return '';
  return r.dims.map(d => {
    const cls = d.status === 'ok' ? 'hl-l-' + _hlLight(d.score) : 'hl-chip-off';
    const tip = d.status === 'ok' ? `${d.label} ${_hlFmtScore(d.score)} 分（權重 ${d.w}）` : `${d.label}：${d.reason}`;
    return `<span class="hl-chip ${cls}" title="${escapeHtml(tip)}">${escapeHtml(d.label)}</span>`;
  }).join('');
}
function _hlDeltaHtml(r, prev) {
  if (!prev || r.score == null || prev.score == null) return '<span class="hl-delta">—</span>';
  const d = Math.floor(r.score) - Math.floor(prev.score);
  const cls = d > 0 ? 'hl-delta-up' : d < 0 ? 'hl-delta-down' : '';
  return `<span class="hl-delta ${cls}">${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}</span>`;
}
function _hlRowHtml(r, prev, rank, open) {
  const t = HEALTH_RULES.types[r.type] || {};
  const nm = r.status === 'closed' ? '' : `依 ${r.dimsUsed}/${r.dimsTotal} 面向`;
  const reason = r.status === 'closed' ? r.reason : (r.score == null ? r.reason : (r.topReason || '—'));
  const ch = HEALTH_CHANNELS.find(c => c.id === r.id) || {};
  const tags = [];
  if (rank) tags.push(`<span class="hl-rank">類型第 ${rank}</span>`);
  if (ch.ranked === false && r.status !== 'closed') tags.push('<span class="hl-tag">不排名</span>');
  return `<tr class="hl-row${open ? ' open' : ''}${r.status === 'closed' ? ' hl-row-closed' : ''}" data-hl-row="${escapeHtml(r.id)}" tabindex="0" aria-expanded="${open ? 'true' : 'false'}">
      <td class="hl-c-name"><span class="hl-caret">${open ? '▾' : '▸'}</span>${escapeHtml(r.label)}<span class="hl-sub-line"><span class="hl-type">${escapeHtml(t.label || '')}</span>${tags.join('')}</span></td>
      <td class="hl-c-score">${_hlScoreHtml(r)}</td>
      <td class="hl-c-nm">${escapeHtml(nm)}</td>
      <td class="hl-c-dims">${_hlChipsHtml(r)}</td>
      <td class="hl-c-delta">${r.status === 'closed' ? '' : _hlDeltaHtml(r, prev)}</td>
      <td class="hl-c-reason">${escapeHtml(reason)}</td>
    </tr>`;
}
function _hlTraceText(s) {
  if (!s.trace) return '';
  const t = s.trace, lines = [`來源：${t.src}`];
  if (t.text) lines.push(t.text);
  else if (_hlFinite(t.num) && _hlFinite(t.den)) lines.push(`${_hlFmtMoney(t.num)} ÷ ${_hlFmtMoney(t.den)}`);
  return lines.join('\n');
}
function _hlSubRowHtml(s) {
  const unit = s.unit;
  const info = [`公式：${s.formula}`, s.status === 'ok' ? _hlTraceText(s) : s.reason, s.note].filter(Boolean).join('\n');
  const unscored = s.scored === false;
  const val = s.status !== 'ok'
    ? `<td class="hl-sub-off" colspan="4">${escapeHtml(_HL_STATUS_TEXT[s.status] || s.status)}</td>`
    : unscored
      ? `<td class="hl-num">${escapeHtml(_hlFmtRaw(s.raw, unit))}</td><td class="hl-num hl-lim">—</td><td class="hl-num hl-lim">—</td><td class="hl-num"><span class="hl-ref-tag">參考，不計分</span></td>`
      : `<td class="hl-num">${escapeHtml(_hlFmtRaw(s.raw, unit))}</td><td class="hl-num hl-lim">${escapeHtml(_hlFmtRaw(s.zero, unit))}</td><td class="hl-num hl-lim">${escapeHtml(_hlFmtRaw(s.full, unit))}</td><td class="hl-num"><span class="hl-sscore hl-l-${_hlLight(s.score)}">${_hlFmtScore(s.score)}</span></td>`;
  // 不計分的子指標（毛利率）：名稱寫成「毛利率（參考，不計分）」，旁邊多一顆 ⓘ 說明為什麼不計分（最右邊的 ⓘ 仍是公式與數字）
  const name = unscored
    ? `${escapeHtml(s.label)}（參考，不計分）<details class="hl-info hl-info-inline"><summary aria-label="為什麼不計分">ⓘ</summary><div class="hl-info-body">${escapeHtml(s.why || '')}</div></details>`
    : `${escapeHtml(s.label)}<span class="hl-w">${Math.round(s.w * 100)}%</span>`;
  return `<tr${unscored ? ' class="hl-sub-ref"' : ''}><td>${name}</td>${val}
      <td class="hl-c-info"><details class="hl-info"><summary aria-label="說明">ⓘ</summary><div class="hl-info-body">${escapeHtml(info)}</div></details></td></tr>`;
}
function _hlDimHtml(d) {
  const head = d.status === 'ok'
    ? `<progress class="hl-bar hl-bar-${_hlLight(d.score)}" max="100" value="${Math.max(0, Math.min(100, d.score)).toFixed(1)}"></progress><span class="hl-dim-score">${_hlFmtScore(d.score)}</span>`
    : `<span class="hl-dim-off">${escapeHtml(d.reason)}</span>`;
  const subs = d.status === 'ok' || d.subs.some(s => s.status === 'ok')
    ? `<table class="hl-sub"><thead><tr><th>子指標</th><th class="hl-num">原始值</th><th class="hl-num hl-lim">零分線</th><th class="hl-num hl-lim">滿分線</th><th class="hl-num">得分</th><th class="hl-c-info"></th></tr></thead>
        <tbody>${d.subs.map(_hlSubRowHtml).join('')}</tbody></table>`
    : '';
  return `<div class="hl-dim${d.status === 'ok' ? '' : ' hl-dim-na'}">
      <div class="hl-dim-hd"><span class="hl-dim-name">${escapeHtml(d.label)}</span><span class="hl-w">權重 ${d.w}</span>${head}</div>
      ${subs}
    </div>`;
}
function _hlCardHtml(r, snap) {
  if (r.status === 'closed') {
    return `<div class="hl-card hl-card-closed">${escapeHtml(r.reason)}：不評分、不排名、不併進平均。走勢只畫到關站前一個月。
      <div class="hl-trend"><canvas id="hl-trend" aria-label="${escapeHtml(r.label)} 近 12 個月分數走勢" role="img"></canvas></div></div>`;
  }
  const badges = [];
  if (r.fill && r.fill.total) {
    const done = r.fill.filled >= r.fill.total;
    badges.push(`<span class="hl-badge${done ? ' hl-badge-ok' : ''}">KPI ${r.fill.filled}/${r.fill.total}${done ? ' ✓' : ''}</span>`);
  }
  const mo = snap.months && snap.months[r.month];
  if (mo && _hlFinite(mo.asOf)) badges.push(`<span class="hl-badge">KPI 最後更新 ${escapeHtml(_hlFmtTime(mo.asOf))}</span>`);
  const ring = r.score == null
    ? `<div class="hl-ring hl-l-none">—</div>`
    : `<div class="hl-ring ${r.isReference ? 'hl-ref' : 'hl-l-' + r.light}">${_hlFmtScore(r.score)}${r.isReference ? '<small>參考分</small>' : ''}</div>`;
  return `<div class="hl-card">
      <div class="hl-card-hd">
        ${ring}
        <div class="hl-card-meta">
          <div class="hl-card-title">${escapeHtml(r.label)} · ${escapeHtml(_hlYmLabel(r.month))}</div>
          <div class="hl-card-nm">${r.score == null ? escapeHtml(r.reason) : `依 ${r.dimsUsed}/${r.dimsTotal} 個面向評分`}</div>
          <div class="hl-badges">${badges.join('')}<span class="hl-badge-note">資料完整度只供參考，不算分</span></div>
        </div>
      </div>
      ${r.dims.map(_hlDimHtml).join('')}
      <div class="hl-trend-hd">近 12 個月分數走勢（當場重算；空心點＝參考分）</div>
      <div class="hl-trend"><canvas id="hl-trend" aria-label="${escapeHtml(r.label)} 近 12 個月分數走勢" role="img"></canvas></div>
      ${r.next.length ? `<div class="hl-next">之後加入：${escapeHtml(r.next.join('、'))}（蝦皮的廣告效率、商品結構與拖累商品清單在下一塊）</div>` : ''}
    </div>`;
}
function _hlFmtTime(ms) {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function _hlMonthOptions(sel) {
  const ms = _hlMonthRange(HEALTH_RULES.firstMonth, _hlTodayYm()).reverse();
  return ms.map(m => `<option value="${m}"${m === sel ? ' selected' : ''}>${_hlYmLabel(m)}</option>`).join('');
}

function _hlCssVar(name) {
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch { return ''; }
}
function _hlDestroyChart() {
  if (_hlChart) { try { _hlChart.destroy(); } catch {} }
  _hlChart = null;
}
// innerHTML 換完之後才畫（bindHealth 呼叫）
function _hlDrawChart() {
  _hlDestroyChart();
  const Chart = window.Chart;
  const cv = document.getElementById('hl-trend');
  if (!cv || typeof Chart !== 'function' || !_hlState.open || !_hlLast) return;
  const ch = HEALTH_CHANNELS.find(c => c.id === _hlState.open);
  if (!ch) return;
  try {
    const old = typeof Chart.getChart === 'function' ? Chart.getChart(cv) : null;
    if (old) old.destroy();
    const tr = computeHealthTrend(ch, _hlLast.month, _HL_TREND_N, _hlLast.snap);
    const labels = tr.map(r => _hlYmLabel(r.month));
    const series = [{ k: null, label: '總分', color: _hlCssVar('--primary') }]
      .concat(HEALTH_RULES.dims.filter(d => d.impl).map((d, i) => ({ k: d.key, label: d.label, color: _hlCssVar(i === 0 ? '--success' : '--warn') })));
    const muted = _hlCssVar('--text-muted'), grid = _hlCssVar('--border'), surface = _hlCssVar('--surface');
    const datasets = series.map(sr => {
      const ys = tr.map(r => {
        if (!sr.k) return r.score == null ? null : Math.floor(r.score);
        const d = r.dims.find(x => x.key === sr.k);
        return d && d.status === 'ok' ? Math.floor(d.score) : null;
      });
      return {
        label: sr.label, data: ys, borderColor: sr.color || undefined, backgroundColor: sr.color || undefined,
        borderWidth: sr.k ? 1.5 : 2.5, spanGaps: false, tension: 0.2,
        borderDash: sr.k ? [4, 3] : [],
        pointRadius: sr.k ? 2 : 4,
        // 總分：參考分畫空心點
        pointBackgroundColor: sr.k ? (sr.color || undefined) : tr.map(r => (r.isReference ? (surface || undefined) : (sr.color || undefined))),
      };
    });
    _hlChart = new Chart(cv.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: muted || undefined, boxWidth: 12 } },
          tooltip: { callbacks: { label: c => c.dataset.label + '：' + (c.parsed.y == null ? '沒有分數' : c.parsed.y + ' 分') } } },
        scales: {
          x: { ticks: { color: muted || undefined, maxRotation: 0, autoSkip: true }, grid: { display: false } },
          y: { min: 0, max: 100, ticks: { color: muted || undefined, stepSize: 20 }, grid: { color: grid || undefined } },
        },
      },
    });
  } catch (e) {
    console.error('[health] 畫圖失敗', e);
    _hlChart = null;
    const box = cv.parentNode;
    if (box) box.innerHTML = '<div class="hl-chart-fail">走勢圖載入失敗（分數照常可用）</div>';
  }
}

let _hlLast = null;   // 最近一次畫面用的 { month, snap }（畫圖用）

/* ---------- 頁頂「KPI 尚未填完」列 ---------- */
// 能不能跳到 KPI 月結表：profit.js 的 setKpiYM 在、而且這個帳號開得了 office-d1-kpi（行銷部門頁，走 _isRouteAllowed）。不行就只顯示文字。
function _hlCanGoKpi() {
  try {
    return typeof window.setKpiYM === 'function' && !!App.currentUser
      && typeof App._isRouteAllowed === 'function' && App._isRouteAllowed('office-d1-kpi', App.currentUser);
  } catch { return false; }
}
// 跳轉沿用 KPI 月結表自己的狀態：setKpiViewMode('month')＋setKpiYM(月)（profit.js 記憶體，不持久化；KPI 頁不在畫面上時它們只改狀態、不畫），
//   再 App.navigate('office-d1-kpi')，KPI 頁 render 時就停在那個月。
function _hlGoKpi(ym) {
  if (!_hlIsYm(ym) || !_hlCanGoKpi()) return;
  try {
    if (typeof window.setKpiViewMode === 'function') window.setKpiViewMode('month');
    window.setKpiYM(ym);
    App.navigate('office-d1-kpi');
  } catch (e) { console.error('[health] 跳到 KPI 月結表失敗', e); }
}
function _hlPendingHtml(items) {
  if (!items.length) return '';
  const link = _hlCanGoKpi();
  const one = it => {
    const txt = `${it.label} ${_hlRangeLabel(it.from, it.to)}（${it.filled}/${it.total}）`;
    return link
      ? `<button type="button" class="hl-pending-item" data-hl-kpi="${escapeHtml(it.from)}" title="到 KPI 月結表 ${escapeHtml(_hlYmLabel(it.from))}">${escapeHtml(txt)}</button>`
      : `<span class="hl-pending-item hl-pending-text">${escapeHtml(txt)}</span>`;
  };
  return `<div class="hl-pending" role="status"><span class="hl-pending-h">⚠ KPI 尚未填完：</span>${items.map(one).join('<span class="hl-pending-sep">、</span>')}</div>`;
}

function _hlOnClick(e) {
  if (App.route !== 'health') return;
  const act = e.target.closest && e.target.closest('[data-hl-act]');
  if (act) {
    if (act.dataset.hlAct === 'refresh') App.render();
    else if (act.dataset.hlAct === 'guide' && typeof App.openGuide === 'function') App.openGuide({ title: '📖 通路健診 · 怎麼看這頁', blocks: _hlGuideBlocks() });
    return;
  }
  const kpi = e.target.closest && e.target.closest('[data-hl-kpi]');
  if (kpi) { _hlGoKpi(kpi.dataset.hlKpi); return; }
  if (e.target.closest('details.hl-info')) return;   // 點 ⓘ 只展開說明，不收合整列
  const row = e.target.closest && e.target.closest('[data-hl-row]');
  if (!row) return;
  const id = row.dataset.hlRow;
  _hlState.open = _hlState.open === id ? null : id;
  App.render();
}
function _hlOnKeydown(e) {
  if (App.route !== 'health' || (e.key !== 'Enter' && e.key !== ' ')) return;
  const row = e.target.closest && e.target.closest('[data-hl-row]');
  if (!row || e.target !== row) return;
  e.preventDefault();
  _hlState.open = _hlState.open === row.dataset.hlRow ? null : row.dataset.hlRow;
  App.render();
  const again = document.querySelector(`[data-hl-row="${CSS.escape(row.dataset.hlRow)}"]`);
  if (again) again.focus();
}
function _hlOnChange(e) {
  if (App.route !== 'health') return;
  const sel = e.target.closest && e.target.closest('[data-hl-month]');
  if (!sel || !_hlIsYm(sel.value)) return;
  _hlState.month = sel.value;
  App.render();
}

Object.assign(App, {
  viewHealth() {
    // 「📖 怎麼看這頁」在載入中、錯誤畫面也要按得到（說明內容只讀 HEALTH_RULES，不需要資料）
    const header = `<div class="page-header hl-hd">
        <div><h2>通路健診</h2>
        <p>每個通路每月的體檢分數。分數依固定規則計算，同樣的資料一定得到同樣的分數；沒有資料的面向不計分、不算 0 分。</p></div>
        <button type="button" class="btn-ghost hl-guide-btn" data-hl-act="guide">📖 怎麼看這頁</button></div>`;
    // profit.js 動態載入：沒載完先載，載完再 render（本頁不叫任何 __load*Subs，只用開站就訂閱的 app/kpi）
    if (!_hlMock && !window.__profitReady) {
      try {
        window.__ensureProfit().then(() => { if (App.route === 'health') App.render(); }).catch(() => {
          const box = document.querySelector('.hl-loading'); if (box) box.textContent = '程式載入失敗，請重新整理頁面';
        });
      } catch (e) { console.error('[health] __ensureProfit 觸發失敗', e); }
      return `<div class="hl-page">${header}<div class="empty hl-loading"><div class="emoji">⏳</div>載入中…</div></div>`;
    }
    const snap = _hlCollect();
    if (snap.error === 'no-adapter') {
      return `<div class="hl-page">${header}<div class="empty"><div class="emoji">⚠️</div>讀不到 KPI 資料（程式版本不一致），請重新整理頁面</div></div>`;
    }
    let staleNote = '';
    if (!snap.ready) {
      if (_hlWaitTries < _HL_WAIT_MAX) {
        _hlWaitTries++;
        setTimeout(() => { if (App.route === 'health') App.render(); }, 600);
        return `<div class="hl-page">${header}<div class="empty"><div class="emoji">⏳</div>KPI 資料載入中…</div></div>`;
      }
      staleNote = `<div class="hl-warn">雲端 KPI 還沒就緒，以下是這台電腦上次存下的 KPI 鏡像，可能不是最新。${snap.error ? '（' + escapeHtml(snap.error) + '）' : ''}</div>`;
    } else {
      _hlWaitTries = 0;
    }
    const month = _hlIsYm(_hlState.month) ? _hlState.month : healthDefaultMonth(snap, _hlTodayYm());
    if (!_hlState.month) _hlState.month = month;
    _hlLast = { month, snap };
    const results = HEALTH_CHANNELS.map(ch => computeChannelHealth(ch, month, snap));
    const prevM = _hlAddMonth(month, -1);
    const prev = {};
    if (prevM >= HEALTH_RULES.firstMonth) HEALTH_CHANNELS.forEach(ch => { prev[ch.id] = computeChannelHealth(ch, prevM, snap); });
    const rank = _hlRank(results);
    const sorted = _hlSortResults(results);
    let lastType = null;
    const rows = sorted.map(r => {
      let typeRow = '';
      const tKey = r.status === 'closed' ? '_closed' : r.type;
      if (tKey !== lastType) {
        lastType = tKey;
        const tl = tKey === '_closed' ? '已關站' : (HEALTH_RULES.types[r.type] || {}).label || r.type;
        typeRow = `<tr class="hl-type-row"><td colspan="6">${escapeHtml(tl)}</td></tr>`;
      }
      const open = _hlState.open === r.id;
      const detail = open ? `<tr class="hl-detail"><td colspan="6">${_hlCardHtml(r, snap)}</td></tr>` : '';
      return typeRow + _hlRowHtml(r, prev[r.id], rank[r.id], open) + detail;
    }).join('');
    const mo = snap.months && snap.months[month];
    return `<div class="hl-page">
        ${header}
        ${_hlMock ? `<div class="hl-mock-banner">模擬模式：假資料只在本機記憶體（__healthMock(false) 關閉）</div>` : ''}
        ${staleNote}
        ${_hlPendingHtml(healthPendingKpi(snap, month))}
        <div class="hl-toolbar">
          <label class="hl-month">評分月份
            <select data-hl-month>${_hlMonthOptions(month)}</select>
          </label>
          <span class="hl-chip-ver">規則 ${escapeHtml(HEALTH_RULES.version)}</span>
          ${mo && _hlFinite(mo.asOf) ? `<span class="hl-asof">KPI 最後更新 ${escapeHtml(_hlFmtTime(mo.asOf))}</span>` : ''}
          <span class="filter-spacer"></span>
          <button type="button" class="btn-ghost" data-hl-act="refresh">↻ 重新計算</button>
        </div>
        <div class="hl-table-wrap">
          <table class="hl-table">
            <thead><tr><th>通路</th><th class="hl-c-score">總分</th><th class="hl-c-nm">面向數</th><th class="hl-c-dims">面向</th><th class="hl-c-delta">比上月</th><th>主要扣分原因</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="hl-foot">排名只在同一類型內比較；跨類型的分數高低僅供參考（各類型門檻不同、營收口徑也不同）。灰色斜體是參考分，不排名。
          第一版只有「獲利、成長」兩個面向，資料全部來自 KPI 月結。</div>
      </div>`;
  },

  bindHealth() {
    const main = document.getElementById('main-content');
    // 🔴 只綁一次：#main-content 不會被換掉，render 只換 innerHTML；旗標記在元素上。各 handler 先檢查 App.route === 'health'。
    if (main && !main.__hlBound) {
      main.addEventListener('click', _hlOnClick);
      main.addEventListener('keydown', _hlOnKeydown);
      main.addEventListener('change', _hlOnChange);
      main.__hlBound = true;
    }
    _hlDrawChart();
  },
});

/* ---------- Console：唯讀回測 ---------- */
window.__healthBacktest = function (opts) {
  const o = opts || {};
  if (!_hlMock && !window.__profitReady) { console.warn('[health] profit.js 還沒載入：先進「通路健診」頁或 KPI 頁再跑'); return null; }
  const snap = _hlCollect();
  if (!snap.ready) console.warn('[health] 雲端 KPI 還沒就緒，回測用的是本機鏡像');
  const to = _hlIsYm(o.to) ? o.to : _hlAddMonth(_hlTodayYm(), -1);
  const from = _hlIsYm(o.from) ? o.from : HEALTH_RULES.firstMonth;
  const res = healthBacktest(snap, _hlMonthRange(from, to));
  console.log(`[health] 回測 ${from}～${to}，規則 ${HEALTH_RULES.version}（只讀，不寫任何資料）`);
  console.table(res.rows);
  console.log('[health] 各類型子指標百分位（業外、官網不列入）：建議零分線＝P10、滿分線＝P75');
  console.table(res.pct);
  return res;
};

/* ---------- 本機模擬（只在 localhost；資料只在記憶體） ----------
 * __healthMock('demo')：假 KPI（2026-01 起每月），涵蓋 since（PChome 2026-09、FriDay／博客來 2026-08、MO+玩樂 2026-10）、
 *   官網 2026-05 關站、最新月份酷澎買斷沒填完（尚未上傳）、博客來營收過小、
 *   酷澎 商城-好麻吉 2026-07～09 與 PChome 2026-09 沒填完（頁頂「KPI 尚未填完」列）。__healthMock('empty')：KPI 全空。__healthMock(false)：關閉。 */
const _HL_MOCK_GROUPS = [
  { key: 'shopee', title: '蝦皮', shops: ['好麻吉', '玩樂', '維克', '森之旅'], since: null, shopSince: {}, closedFrom: null },
  { key: 'coupang', title: '酷澎', shops: ['商城-好麻吉', '商城-露營館', '酷澎買斷'], since: null, shopSince: {}, closedFrom: null },
  { key: 'other', title: '業外', shops: ['業外'], since: null, shopSince: {}, closedFrom: null },
  { key: 'website', title: '官網', shops: ['官網'], since: null, shopSince: {}, closedFrom: '2026-05' },
  { key: 'momo', title: 'MOMO', shops: ['MOMO-甲配', 'MOMO-寄倉', 'mo+0號店(好麻吉)', 'mo+1號店(森之旅)', 'mo+2號店(玩樂)'], since: null, shopSince: { 'mo+2號店(玩樂)': '2026-10' }, closedFrom: null },
  { key: 'pchome', title: 'PChome', shops: ['PChome'], since: '2026-09', shopSince: {}, closedFrom: null },
  { key: 'friday', title: 'FriDay', shops: ['FriDay'], since: '2026-08', shopSince: {}, closedFrom: null },
  { key: 'books', title: '博客來', shops: ['博客來'], since: '2026-08', shopSince: {}, closedFrom: null },
];
function _hlMakeMock(kind) {
  return function (months) {
    const latest = months[months.length - 1];
    const out = { ready: true, months: {}, groups: JSON.parse(JSON.stringify(_HL_MOCK_GROUPS)), error: null };
    months.forEach((m, mi) => {
      const mo = { exists: kind === 'demo', asOf: kind === 'demo' ? Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 3, 6, 30) : null, groups: {} };
      _HL_MOCK_GROUPS.forEach((g, gi) => {
        const box = {};
        g.shops.forEach((shop, si) => {
          const since = (g.shopSince && g.shopSince[shop]) || g.since;
          const before = !!(since && m < since);
          const closed = !!(g.closedFrom && m >= g.closedFrom);
          const seed = (gi * 7 + si * 3 + mi * 5) % 17;
          let rev = kind === 'demo' ? 200000 + gi * 90000 + si * 40000 + seed * 9000 : 0;
          if (shop === '博客來') rev = 18000 + seed * 300;               // 營收過小
          const pureRate = 0.02 + ((seed * 13) % 17) / 100;              // 2%～18%
          const costRate = 0.40 + ((seed * 7) % 21) / 100;               // 40%～60%
          const total = before ? 0 : 6;
          let filled = kind === 'demo' ? total : 0;
          if (kind === 'demo' && shop === '酷澎買斷' && m === latest) filled = 3;   // 最新月沒填完
          if (kind === 'demo' && shop === '商城-好麻吉' && m >= '2026-07' && m <= '2026-09') filled = 0;   // 頁頂「KPI 尚未填完」：連續三個月
          if (kind === 'demo' && shop === 'PChome' && m === '2026-09') filled = 4;
          if (closed) { rev = 0; filled = total; }
          box[shop] = {
            rev: before ? 0 : rev, cost: before || closed ? 0 : Math.round(rev * costRate), ads: g.key === 'shopee' ? Math.round(rev * 0.1) : null,
            pure: before || closed ? 0 : Math.round(rev * pureRate), qty: Math.round(rev / 450), revFilled: kind === 'demo' && !before,
            fill: { filled, total }, closed, beforeSince: before,
          };
        });
        mo.groups[g.key] = box;
      });
      out.months[m] = mo;
    });
    return out;
  };
}
window.__healthMock = function (kind) {
  if (!_hlIsLocalHost()) { console.warn('[health] 模擬模式只在 localhost 可用'); return false; }
  _hlMock = (kind === 'demo' || kind === 'empty') ? _hlMakeMock(kind) : null;
  _hlState.month = null; _hlState.open = null; _hlWaitTries = 0;
  console.warn(_hlMock ? `[health] 模擬模式已開啟（${kind}）：資料只在本機記憶體` : '[health] 模擬模式已關閉，改回 KPI 月結');
  if (App.route === 'health') App.render();
  return !!_hlMock;
};
