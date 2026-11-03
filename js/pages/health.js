/* js/pages/health.js -- 通路健檢，以 Object.assign(App, ...) 合併回 App
 *   塊 A：全通路「獲利、成長」（KPI 月結）。
 *   塊 B：蝦皮「廣告效率」、蝦皮／MOMO／PChome「商品結構」（含動銷率）、拖累商品前 10 名（商品層資料，只在展開卡片時載入）。
 *
 * 方案：docs/plan-channel-health.md（§1-1／§1-2 範圍、§2 規則、§3 動銷率口徑、§4 畫面）。
 * 路由 'health'：【不是部門】（不走 office-），不碰 ec.departments / canAccessOffice / OFFICE_FEATURES；所有登入者都能看（app.js _isRouteAllowed）。
 * 純讀取頁：不寫雲端、不寫 Store、不新增 __cloud 物件。分數一律當場用 HEALTH_RULES 重算，不存檔；同樣的資料一定得到同樣的分數。
 * 資料：KPI 月結經 profit.js 的唯讀轉接 window.__healthKpiSnapshot(months)（口徑＝KPI 頁：_kpiShopCalc／_kpiRealRev／_kpiCommonColTotals）。
 *   商品層（塊 B）經 window.__healthLoadProducts(平台)（載訂閱組並等到齊）＋ window.__healthProductSnapshot(平台, 通路, 月)（同步、只讀）。
 *   profit.js 是動態載入：進頁先 await window.__ensureProfit()，載完再 render（同 daily.js / offices.js）。
 *   🔴 商品層訂閱組（約 10MB）只在「展開某平台的卡片」時才載；手機寬度（≤768px）改成卡片裡的「載入商品資料」按鈕。
 *     載入中、還沒載入一律顯示灰色「載入中／尚未載入」，不得畫成「無資料」或 0 分。
 *   商品層快照逐筆排隊算（setTimeout 分批，不卡畫面），算完才重畫一次；結果放記憶體（_hlProd.cache），不存檔。
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
//   健檢凍結自己的一份門檻，不讀淨利表的 getAnaThresh / getGrowthThresh（那邊被改時，健檢分數不該悄悄跟著變）。
//   比率一律是小數（0.15＝15%）。zero＝零分線、full＝滿分線；zero > full 代表越低越好（同一支 _hlLinear 處理）。
//   子指標 scored:false＝只顯示原始值、不計分（不進面向分數、不進主要扣分原因）。
//   「📖 怎麼看這頁」的門檻數字從這張表產生（_hlGuideBlocks），改這裡說明會自動跟著變。
//   v3-2026-11（塊 B）：加「廣告效率」（蝦皮）、「商品結構」（蝦皮／MOMO／PChome）。這兩個面向的門檻是方案 §2-4／§2-5／§2-6 的【起始值】，
//     calibrated:false ⇒ 畫面與說明標「起始值，待回測校準」；校準後拿掉旗標並升 version。獲利、成長的門檻不變（v2 校準值）。
//   v4-2026-11（2026-11-02 審查決定，方案 §2-5、§2-7-2）：廣告效率、商品結構用真實資料回測校準，拿掉 calibrated:false。
//     廣告佔比 18.5%→4.5%、合格率 22.5%→62.0%、致虧占比 17.0%→2.5%；虧損占比 5.5%→0.5%、長期虧損 4.0%→0.0%（全通路共用一套）；
//     低利商品營收占比改成只顯示不計分；商品結構權重 動銷率 30%／虧損 40%／長期虧損 30%；
//     動銷率依類型（__healthCalibrate 的建議值），樣本 < 6 用最小間距並標「樣本少」（stFlag:'few'），蝦皮等塊 C 資料再校準（stFlag:'uncal'）。
const HEALTH_RULES = _hlDeepFreeze({
  version: 'v4-2026-11',
  firstMonth: '2026-01',               // 月份下拉最早到這個月（KPI 月結從 2026-01 開始）
  lights: { green: 80, yellow: 50 },   // ≥80 綠、50–79 黃、<50 紅（同 KPI 評分表 scoreColor 的門檻）
  minRev: 30000,                       // 月營收 < 3 萬 ⇒ 比率類子指標不評分（同 profit.js KPI_ANOMALY_RULES.minRev）
  defaultMonthFillRatio: 0.9,          // 預設評分月份：上個月全通路 KPI 填寫率 ≥ 90% 才用，否則再往前一個月
  pendingLookback: 3,                  // 頁頂「KPI 尚未填完」列：評分月份＋往前幾個月（只影響提示，不影響分數）
  // 面向（權重合計 100）。impl＝這個規則版本已實作；沒實作的不算進「依 N/M」的 M，卡片底部灰字列出。
  dims: [
    // scope＝頁尾與說明用的「哪些通路、資料從哪來」（只是文字，不影響計分）
    { key: 'profit',    label: '獲利',     w: 30, impl: true, scope: '全通路，KPI 月結' },
    { key: 'growth',    label: '成長',     w: 20, impl: true, scope: '全通路，KPI 月結' },
    { key: 'ads',       label: '廣告效率', w: 15, impl: true, scope: '蝦皮，KPI 廣告費＋淨利表' },
    { key: 'structure', label: '商品結構', w: 20, impl: true, scope: '蝦皮、MOMO、PChome，商品層' },
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
  // 廣告效率（塊 B，只有蝦皮有逐商品廣告資料）。門檻＝v4 校準值（方案 §2-7-2）。
  ads: {
    subs: [
      { key: 'adsPct', label: '廣告佔比', w: 0.4, zero: 0.185, full: 0.045, unit: 'pct', src: 'kpi',
        formula: '廣告費 ÷ 實際營收（KPI 月結）', desc: '每 100 元營收花多少錢在廣告上，越低越好' },
      { key: 'adsQualified', label: '廣告合格率', w: 0.3, zero: 0.225, full: 0.62, unit: 'pct', minPure: 0.20,
        formula: '有投廣告的商品裡，「商品純利率 ≥ 合格線」的商品廣告費 ÷ 全部商品廣告費', desc: '廣告費花在「本身就夠賺」的商品上的比例，越高越好' },
      { key: 'adsLoss', label: '廣告致虧占比', w: 0.3, zero: 0.17, full: 0.025, unit: 'pct',
        formula: '「不投廣告會賺、投了變賠」的商品廣告費 ÷ 全部商品廣告費（純利 < 0 而且 純利＋廣告費 > 0）',
        desc: '廣告費直接把商品從賺錢變成賠錢的比例，越低越好' },
    ],
  },
  // 商品結構（塊 B）。門檻＝v4 校準值（方案 §2-5、§2-7-2）；動銷率門檻依類型（types[*].sellThrough）。
  //   商品利潤率一律用「商品純利 ÷ 商品營收」：蝦皮＝報表純利（已扣廣告與平台費）、MOMO＝momoAggregatePeriods 淨利、PChome＝日曆月淨利。
  //   成本未知的商品（MOMO 缺成本、MO+ 成本涵蓋未滿、PChome 料號沒成本）不進虧損／低利／長期虧損的分子分母，卡片顯示成本涵蓋率。
  structure: {
    minSold: 20,          // 本月「有銷售且有成本」的商品少於這個數 ⇒ 面向「資料不足」
    lowMinRev: 3000,      // 低利商品只算營收 ≥ 3,000 的（太小的商品不算拖累）
    lowMargin: 0.05,      // 低利＝商品純利率介於 0 到 5%（不含虧損，虧損另算，同一件商品不重複扣分）
    subs: [
      { key: 'sellThrough', label: '動銷率', w: 0.3, unit: 'pct',
        formula: '本期有銷售的公司商品數 ÷（期末上架 ∪ 本期有銷售的公司商品數）',
        desc: '能賣的商品裡，這個月真的有賣出的比例（以公司商品計：原廠編號／料號去掉規格碼，雨衣四色算 1 個）' },
      { key: 'lossShare', label: '虧損商品營收占比', w: 0.4, zero: 0.055, full: 0.005, unit: 'pct',
        formula: '純利 < 0 的商品營收 ÷ 全部商品營收', desc: '營收有多少是由賠錢商品賣出來的，越低越好' },
      { key: 'lowShare', label: '低利商品營收占比', w: 0, scored: false, unit: 'pct',
        formula: '純利率在 0 到低利線之間、營收達門檻的商品營收 ÷ 全部商品營收', desc: '營收有多少是由「有賺但賺很少」的商品賣出來的',
        why: '回測時大部分通路這個數字都接近 0%（蝦皮 P75 只有 0.4%），差異幾乎全落在虧損商品，拿來評分只會反映低利線畫在哪裡，所以 v4 起只顯示供參考。' },
      { key: 'longLoss', label: '長期虧損商品占比', w: 0.3, zero: 0.04, full: 0, unit: 'pct',
        formula: '本月與上個月都虧損的商品數 ÷ 本月有銷售的商品數', desc: '連續兩個月都在賠的商品比例，越低越好' },
      { key: 'sellThroughPage', label: '動銷率（商品頁口徑）', w: 0, scored: false, unit: 'pct',
        formula: '本期有銷售的商品頁數 ÷（期末上架 ∪ 本期有銷售的商品頁數）', desc: '每個通路商品頁各算一個',
        why: '商品頁口徑＝每個通路商品頁各算一個（MOMO 商品編號、PChome 商品編號去最後一段），跟 MOMO／PChome 總覽畫面的動銷率同口徑，給你對照；分數用公司商品口徑（雨衣四色算 1 個）。' },
      { key: 'deadDupPages', label: '多頁商品中零動銷的頁', w: 0, scored: false, unit: 'count',
        formula: '同一個公司商品開了好幾個商品頁、而且這個月有賣，其中沒賣出的頁數', desc: '重複商品頁裡沒在動的頁',
        why: '公司商品口徑只要其中一頁有賣就算「有動」，會把沒在動的重複頁藏起來，所以另外列出這個數字，只供參考、不計分。' },
    ],
  },
  // 拖累商品清單（塊 B）。金額＝一件商品命中多個原因時取最大的那個（不重複加總）。
  drag: {
    topN: 10,
    adsBurnTopPct: 0.2,   // 🔥 廣告燒錢：廣告費排在本通路前 20%
    adjustMonthsBack: 1,  // 「✓ 已調整」：調整日期在評分月份的上個月 1 號以後才算
  },
  // 依通路類型的門檻（[零分線, 滿分線]）。order＝總覽分組順序。
  //   純利率 v2 校準（真實 KPI 2026-01～10 的 P50 → 滿分線取 P75）：蝦皮自營 P50 20.3%、MOMO 自出貨 37.8%、MOMO 寄倉 24.3%、MO+ 28.1%、酷澎商城 26.8%（樣本 6）。
  //   sellThrough（動銷率）＝v4 校準值（__healthCalibrate 依實測 P10／P50／P75 算的建議值，方案 §2-7-2）；null＝這類型不評動銷率。
  //     stFlag：'few'＝樣本少（< HEALTH_CALIB.minN 筆，門檻用最小間距），畫面標「樣本少」；'uncal'＝還沒有實測資料、仍是起始值，標「待校準」。
  types: {
    shopee:  { label: '蝦皮自營',     order: 1, pureRate: [0, 0.24], sellThrough: [0.30, 0.65], stFlag: 'uncal', members: '好麻吉、玩樂、森之旅、維克' },
    momoJia: { label: 'MOMO 自出貨',  order: 2, pureRate: [0, 0.39], sellThrough: [0.495, 0.595], members: 'MOMO 甲配' },
    momoYi:  { label: 'MOMO 寄倉',    order: 3, pureRate: [0, 0.26], sellThrough: [0.725, 0.81], members: 'MOMO 乙配（寄倉）' },
    moplus:  { label: 'MO+',          order: 4, pureRate: [0, 0.29], sellThrough: [0.08, 0.315], members: 'MO+ 麻吉、MO+ 森之旅、MO+ 玩樂' },
    coupang: { label: '酷澎商城',     order: 5, pureRate: [0, 0.34], sellThrough: null, members: '酷澎 商城-好麻吉、商城-露營館' },
    small:   { label: '小通路',       order: 6, pureRate: [0, 0.10], sellThrough: [0.10, 0.18], stFlag: 'few', stN: 2, members: '酷澎買斷、PChome、FriDay、博客來' },
    other:   { label: '業外',         order: 7, pureRate: [0, 0.10], sellThrough: null, members: '業外（不排名）' },
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

// 健檢通路對照表（盤點 §1-0）。group / shop＝KPI_GROUPS 的 key 與店名（profit.js），寫錯會整列「尚未上傳」。
//   ranked:false＝列出、照算分，但不參加排名（業外不是真正的銷售通路；官網已關站）。
//   prod＝商品層資料來源（塊 B）：platform＋淨利表上的通路名（__healthProductSnapshot／__profitOpenAt 用）。沒有 prod ⇒ 廣告效率、商品結構「不適用」。
const HEALTH_CHANNELS = _hlDeepFreeze([
  { id: 'shopee-maji',    label: '好麻吉',          type: 'shopee',  group: 'shopee',  shop: '好麻吉', prod: { platform: 'shopee', shop: '好麻吉' } },
  { id: 'shopee-wanle',   label: '玩樂',            type: 'shopee',  group: 'shopee',  shop: '玩樂',   prod: { platform: 'shopee', shop: '玩樂' } },
  { id: 'shopee-sen',     label: '森之旅',          type: 'shopee',  group: 'shopee',  shop: '森之旅', prod: { platform: 'shopee', shop: '森之旅' } },
  { id: 'shopee-wick',    label: '維克',            type: 'shopee',  group: 'shopee',  shop: '維克',   prod: { platform: 'shopee', shop: '維克' } },
  { id: 'momo-jia',       label: 'MOMO 甲配',       type: 'momoJia', group: 'momo',    shop: 'MOMO-甲配', prod: { platform: 'momo', shop: '甲配' } },
  { id: 'momo-yi',        label: 'MOMO 乙配（寄倉）', type: 'momoYi', group: 'momo',    shop: 'MOMO-寄倉', prod: { platform: 'momo', shop: '乙配' } },
  { id: 'moplus-maji',    label: 'MO+ 麻吉',        type: 'moplus',  group: 'momo',    shop: 'mo+0號店(好麻吉)', prod: { platform: 'momo', shop: 'MO+麻吉' } },
  { id: 'moplus-sen',     label: 'MO+ 森之旅',      type: 'moplus',  group: 'momo',    shop: 'mo+1號店(森之旅)', prod: { platform: 'momo', shop: 'MO+森之旅' } },
  { id: 'moplus-wanle',   label: 'MO+ 玩樂',        type: 'moplus',  group: 'momo',    shop: 'mo+2號店(玩樂)',   prod: { platform: 'momo', shop: 'MO+玩樂' } },
  { id: 'coupang-maji',   label: '酷澎 商城-好麻吉', type: 'coupang', group: 'coupang', shop: '商城-好麻吉' },
  { id: 'coupang-luying', label: '酷澎 商城-露營館', type: 'coupang', group: 'coupang', shop: '商城-露營館' },
  { id: 'coupang-buyout', label: '酷澎買斷',        type: 'small',   group: 'coupang', shop: '酷澎買斷' },
  { id: 'pchome',         label: 'PChome',          type: 'small',   group: 'pchome',  shop: 'PChome', prod: { platform: 'pchome', shop: 'PChome' } },
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
//   🔴 v 不是有限數字 ⇒ 回 null（沒資料），【絕不回 0】—— 這是健檢跟 KPI 評分表 scoreCalcMetric 最大的差別。
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
function _hlFmtRaw(v, unit) {
  if (unit === 'count') return _hlFinite(v) ? Math.round(v) + ' 頁' : '—';
  return unit === 'pp' ? _hlFmtPp(v) : unit === 'signedPct' ? _hlFmtSignedPct(v) : _hlFmtPct(v);
}

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

/* ---------- 商品層（塊 B） ---------- */
// 公司商品 key：「英文字母＋數字－數字」（A123-01、H373-02）去掉最後一段規格碼；不符格式 ⇒ 退回用商品頁 key，fallback:true（卡片計數）。
//   🔴 一律先 trim（真實檔案有貨號尾巴夾 Tab 的情況，動銷 §追記 17:00）。
function _hlCompanyKey(code, pageKey) {
  const c = String(code == null ? '' : code).trim();
  if (/^[A-Za-z]+\d+-\d+$/.test(c)) return { key: c.split('-')[0], fallback: false };
  return { key: 'page:' + String(pageKey == null ? c : pageKey).trim(), fallback: true };
}
// 蝦皮：整月報表（full）優先；沒有就把上下半月逐品號合併。ROI 按廣告費加權（ROI＝廣告帶來的銷售 ÷ 花費，合併後要用加權才對）。
function _hlShopeeMerge(halves) {
  const hs = Array.isArray(halves) ? halves.filter(h => h && Array.isArray(h.rows) && h.rows.length) : [];
  const full = hs.find(h => h.half === 'full');
  const use = full ? [full] : hs.filter(h => h.half === 'first' || h.half === 'second');
  const by = {};
  use.forEach(h => h.rows.forEach(r => {
    const k = String(r.code || '').trim(); if (!k) return;
    const e = by[k] || (by[k] = { code: k, name: r.name || '', qty: 0, rev: 0, gross: 0, adsFee: 0, platFee: 0, pureProfit: 0, clicks: 0, roiW: 0, droiW: 0 });
    e.qty += +r.qty || 0; e.rev += +r.rev || 0; e.gross += +r.gross || 0; e.adsFee += +r.adsFee || 0; e.platFee += +r.platFee || 0;
    e.pureProfit += +r.pureProfit || 0; e.clicks += +r.clicks || 0;
    e.roiW += (+r.roi || 0) * (+r.adsFee || 0); e.droiW += (+r.directROI || 0) * (+r.adsFee || 0);
    if (!e.name && r.name) e.name = r.name;
  }));
  return { halves: use.map(h => h.half), ts: use.reduce((a, h) => (_hlFinite(h.ts) && h.ts > a ? h.ts : a), 0) || null,
    rows: Object.keys(by).sort().map(k => { const e = by[k];
      return Object.assign(e, { roi: e.adsFee > 0 ? e.roiW / e.adsFee : 0, directROI: e.adsFee > 0 ? e.droiW / e.adsFee : 0 }); }) };
}
// 把 __healthProductSnapshot 的原始輸出整理成同一個形狀：
//   { status:'ok'|'none'|'error', platform, rows:[{ key, name, company, fallback, pages:[], sub?, rev, profit, costKnown, sold, active, qty,
//     adsFee?, gross?, platFee?, roi?, directROI?, clicks? }], pageCount?:{sold,total}, subTotals?, asOf, latestExport?, recon?, lastAdjust }
//   status 'none'＝那個月沒有任何銷售資料（還沒上傳，或通路還沒開始）——不是「全部零動銷」。
function _hlProdNormalize(raw) {
  const base = { platform: raw && raw.platform, shop: raw && raw.shop, month: raw && raw.month, rows: [], lastAdjust: (raw && raw.lastAdjust) || {} };
  if (!raw || raw.error) return Object.assign(base, { status: 'error', error: (raw && raw.error) || 'no data' });
  let rows = [];
  if (raw.platform === 'shopee') {
    const m = _hlShopeeMerge(raw.halves);
    base.asOf = m.ts; base.halves = m.halves;
    // 蝦皮報表的品號本來就是公司商品層（A123，動銷 §追記 17:20 實測），直接當公司商品 key
    rows = m.rows.map(r => ({ key: r.code, name: r.name, company: r.code, fallback: false, pages: [r.code], rev: r.rev, profit: r.pureProfit, costKnown: true,
      sold: r.qty > 0, active: null, qty: r.qty, adsFee: r.adsFee, gross: r.gross, platFee: r.platFee, roi: r.roi, directROI: r.directROI, clicks: r.clicks }));
  } else if (raw.platform === 'momo') {
    base.recon = raw.recon; base.freightMode = raw.freightMode || 'none';
    rows = (raw.rows || []).map(r => { const ck = _hlCompanyKey(r.origin, r.key);
      return { key: r.key, name: r.name, company: ck.key, fallback: ck.fallback, pages: [r.key], rev: +r.rev || 0, profit: +r.profit || 0,
        costKnown: !!r.costKnown, sold: !!r.sold, active: !!r.active, qty: +r.qty || 0 }; });
    // 商品頁口徑＝momoPeriodTotals 同口徑：分子＝有銷售、分母＝上架 ∪ 有銷售（逐商品編號）
    base.pageCount = { sold: rows.filter(r => r.sold).length, total: rows.filter(r => r.active || r.sold).length };
  } else if (raw.platform === 'pchome') {
    base.latestExport = raw.latestExport || ''; base.subTotals = raw.subTotals || {};
    rows = (raw.rows || []).map(r => { const pages = (r.pages && r.pages.length) ? r.pages.slice() : ['code:' + r.key];
      const ck = _hlCompanyKey(r.key, 'code:' + r.key);
      return { key: r.key, sub: r.sub, name: r.name, company: ck.key, fallback: ck.fallback, pages,
        rev: +r.rev || 0, profit: r.profit == null ? null : +r.profit, costKnown: !!r.costKnown && r.profit != null, sold: !!r.sold, active: !!r.active, qty: +r.qty || 0 }; });
  }
  base.rows = rows;
  const any = rows.some(r => r.sold || Math.abs(r.rev) > 0.5);
  base.status = any ? 'ok' : 'none';
  return base;
}
// 動銷率（公司商品口徑＋商品頁口徑）。active 為 null（蝦皮：沒有上架狀態）⇒ 回 null。
//   公司商品：同一個 company 只要有一筆「上架或有銷售」就進分母，有一筆有銷售就進分子。
//   商品頁：每個 page 同上；deadDupPages＝「有銷售的公司商品」底下、在分母裡但自己沒賣的頁數（只算有 2 頁以上的公司商品）。
function _hlSellThrough(rows) {
  if (!rows.length || rows.some(r => r.active == null)) return null;
  const comp = {}, page = {};
  rows.forEach(r => {
    const inDen = r.active || r.sold;
    const c = comp[r.company] || (comp[r.company] = { den: false, sold: false, fallback: r.fallback, pages: {} });
    if (inDen) c.den = true; if (r.sold) c.sold = true;
    r.pages.forEach(p => {
      const g = page[p] || (page[p] = { den: false, sold: false });
      if (inDen) g.den = true; if (r.sold) g.sold = true;
      if (inDen) c.pages[p] = true;
    });
  });
  const cs = Object.keys(comp).map(k => comp[k]).filter(c => c.den);
  const ps = Object.keys(page).map(k => page[k]).filter(p => p.den);
  let deadDup = 0;
  cs.forEach(c => { const pk = Object.keys(c.pages); if (pk.length > 1 && c.sold) pk.forEach(p => { if (!page[p].sold) deadDup++; }); });
  return { company: { num: cs.filter(c => c.sold).length, den: cs.length }, page: { num: ps.filter(p => p.sold).length, den: ps.length },
    deadDupPages: deadDup, fallback: cs.filter(c => c.fallback).length };
}
// 這個通路這個月的商品層快照狀態：{ state:'na'|'notLoaded'|'loading'|'timeout'|'ready', snap? }
//   snap 完全沒有 prodState（只算 KPI 的呼叫端：舊的回測、node 測試）⇒ 'off'：商品層面向一律「不適用」，分數跟塊 A 一樣只看 KPI。
function _hlProdOf(ch, month, snap) {
  if (!ch.prod) return { state: 'na' };
  if (!snap || !snap.prodState) return { state: 'off' };
  const st = snap.prodState[ch.prod.platform] || 'idle';
  if (st === 'off') return { state: 'off' };   // 回測時沒載入的平台：當成只算 KPI
  if (st === 'idle') return { state: 'notLoaded' };
  if (st === 'timeout') return { state: 'timeout' };
  const s = snap.prod && snap.prod[ch.prod.platform + '|' + ch.prod.shop + '|' + month];
  if (st === 'loading') return { state: 'loading', waitSec: (snap.prodWaitSec && snap.prodWaitSec[ch.prod.platform]) || 0 };
  if (!s) return { state: 'loading', waitSec: 0 };
  return { state: 'ready', snap: s };
}
const HL_TIMEOUT_MSG = '商品資料載入逾時，請先進淨利表再回來，再按「↻ 重新計算」';
// 載入中的說明字：60 秒以上「仍在載入（已等 N 秒）」；5 分鐘以上再加「請先進淨利表點一下這個平台」——都還在等，資料一到自動重算（不放棄）
const HL_WAIT_SLOW = 60, HL_WAIT_HINT = 300;
function _hlLoadingMsg(sec) {
  if (sec >= HL_WAIT_HINT) return `仍在載入（已等 ${Math.floor(sec)} 秒）：請先進淨利表點一下這個平台再回來，資料一到會自動重算`;
  if (sec >= HL_WAIT_SLOW) return `仍在載入（已等 ${Math.floor(sec)} 秒），資料一到會自動重算`;
  return '商品資料載入中…';
}
function _hlProdFail(p, month) {
  if (p.state === 'off') return ['na', '不適用：這次只算 KPI，沒有載入商品層資料'];
  if (p.state === 'notLoaded') return ['notLoaded', '商品層資料尚未載入（手機請按卡片裡的「載入商品資料」）'];
  if (p.state === 'loading') return ['loading', _hlLoadingMsg(p.waitSec || 0)];
  if (p.state === 'timeout') return ['timeout', HL_TIMEOUT_MSG];
  if (p.snap && p.snap.status === 'error') return ['pending', '商品層資料讀不到：' + (p.snap.error || '')];
  if (p.snap && p.snap.status === 'none') return ['pending', `尚未上傳：${_hlYmLabel(month)} 沒有商品銷售資料（淨利表報表／商品主檔）`];
  return null;
}
// 有銷售、有成本、營收 > 0 的商品（虧損／低利／長期虧損共用的母體）
function _hlProdBase(rows) { return rows.filter(r => r.sold && r.costKnown && r.rev > 0 && _hlFinite(r.profit)); }

// 廣告效率（只有蝦皮）。廣告佔比讀 KPI，不需要商品層；另外兩個要商品層。
function _hlAdsDim(ch, m, snap, R) {
  const def = R.dims.find(d => d.key === 'ads');
  const lim = s => ({ zero: s.zero, full: s.full });
  if (!ch.prod || ch.prod.platform !== 'shopee') return _hlFinishDim(def, _hlSubs(R.ads.subs, 'na', '不適用：這個通路沒有逐商品廣告資料', lim));
  if (_hlProdOf(ch, m, snap).state === 'off') return _hlFinishDim(def, _hlSubs(R.ads.subs, 'na', '不適用：這次只算 KPI，沒有載入商品層資料', lim));
  const c = _hlCell(snap, m, ch);
  const subs = _hlSubs(R.ads.subs, 'ok', '', lim);
  const set = (s, st, reason) => { s.status = st; s.reason = reason; };
  const pct = subs.find(s => s.key === 'adsPct');
  if (c && c.beforeSince) set(pct, 'insufficient', `資料不足：${ch.label} 從 ${_hlYmLabel(_hlSince(snap, ch))} 起才有 KPI`);
  else if (!_hlFillDone(c)) set(pct, 'pending', _hlPendingReason(m, c));
  else if (!(c.rev >= R.minRev)) set(pct, 'smallRev', `營收過小（${_hlFmtMoney(c.rev)}，未滿 ${_hlFmtMoney(R.minRev)}），本月比率類指標不評分`);
  else if (!_hlFinite(c.ads)) set(pct, 'pending', `尚未上傳：${_hlYmLabel(m)} KPI 沒有廣告費`);
  else {
    pct.raw = c.ads / c.rev; pct.score = _hlLinear(pct.raw, pct.zero, pct.full);
    pct.trace = { src: `app/kpi ${m} ${ch.group}.${ch.shop}（廣告費 ÷ 實際營收）`, num: c.ads, den: c.rev };
  }
  const p = _hlProdOf(ch, m, snap), fail = _hlProdFail(p, m);
  const prodSubs = subs.filter(s => s.key !== 'adsPct');
  if (fail) prodSubs.forEach(s => set(s, fail[0], fail[1]));
  else {
    const ads = p.snap.rows.filter(r => r.adsFee > 0), tot = ads.reduce((a, r) => a + r.adsFee, 0);
    if (!(tot > 0)) prodSubs.forEach(s => set(s, 'na', `不適用：${_hlYmLabel(m)} 沒有逐商品廣告費`));
    else {
      const minPure = R.ads.subs.find(s => s.key === 'adsQualified').minPure;
      const q = ads.filter(r => r.rev > 0 && r.profit / r.rev >= minPure).reduce((a, r) => a + r.adsFee, 0);
      const l = ads.filter(r => _hlAdsLossHit(r)).reduce((a, r) => a + r.adsFee, 0);
      const src = `淨利表 ${ch.prod.shop} ${_hlYmLabel(m)}（${(p.snap.halves || []).join('＋') || '—'}），有廣告費的商品 ${ads.length} 個`;
      const sq = prodSubs.find(s => s.key === 'adsQualified'), sl = prodSubs.find(s => s.key === 'adsLoss');
      sq.raw = q / tot; sq.score = _hlLinear(sq.raw, sq.zero, sq.full); sq.trace = { src, num: q, den: tot };
      sl.raw = l / tot; sl.score = _hlLinear(sl.raw, sl.zero, sl.full); sl.trace = { src, num: l, den: tot };
    }
  }
  return _hlFinishDim(def, subs);
}
// 廣告致虧（規則 a）：有廣告費、純利 < 0、但純利＋廣告費 > 0（不投廣告會賺）
function _hlAdsLossHit(r) { return r.adsFee > 0 && r.profit < 0 && r.profit + r.adsFee > 0; }
// 回測比較用的另外兩條候選規則（§2-4）：(b) ROI 低於損益兩平；(c) 有花費卻完全沒帶來成交
function _hlAdsRuleB(r) { const m0 = r.gross - r.platFee; return r.adsFee > 0 && r.roi > 0 && m0 > 0 && r.roi < r.rev / m0; }
function _hlAdsRuleC(r) { return r.adsFee >= 300 && !(r.roi > 0); }
// 三條規則在同一批商品上的命中數與花費占比（回測用）。回 { n:有廣告費的商品數, spend, a:{n,share}, b:{…}, c:{…} }
//   roiMissing：有廣告費的商品「全部」沒有 ROI（2026-01、02 的蝦皮報表沒存 roi）⇒ (b)(c) 會誤判，回 null（不比）。
function healthAdsRuleCompare(rows) {
  const ads = (rows || []).filter(r => r.adsFee > 0), spend = ads.reduce((s, r) => s + r.adsFee, 0);
  const one = f => { const hit = ads.filter(f); const sp = hit.reduce((s, r) => s + r.adsFee, 0); return { n: hit.length, share: spend > 0 ? sp / spend : null }; };
  const roiMissing = ads.length > 0 && ads.every(r => !(r.roi > 0) && !(r.directROI > 0));
  return { n: ads.length, spend, roiMissing, a: one(_hlAdsLossHit), b: roiMissing ? null : one(_hlAdsRuleB), c: roiMissing ? null : one(_hlAdsRuleC) };
}

// MOMO 商品利潤口徑說明（ⓘ 用）。profit.js __healthProductSnapshot 跟 MOMO 總表 render 走同一條：
//   momoAggregatePeriods 逐商品彙總 → momoStage4Redistribute（甲配／乙配依出貨型態逐商品重分運費、乙配倉租用 C1212 逐商品實際值；整家合計不變）。
function _hlMomoProfitNote(shop, mode) {
  const how = mode === 'precise' ? '這個月是「物流精算」：運費依各商品的出貨型態逐商品分攤' + (shop === '乙配' ? '、倉租用 C1212 逐商品實際倉租' : '')
    : mode === 'proportional' ? '這個月沒有逐商品出貨資料，運費依營收比例分攤' : '';
  return '商品利潤＝MOMO 淨利表總表的「淨利貢獻」欄（同一套算法）' + (how ? '；' + how : '') + '。'
    + '這裡只算本月有銷售、有成本的商品，所以逐列加總會跟總表合計不同：沒賣出的商品（乙配會掛倉租、淨利是負的）和缺成本的商品不算進來。';
}

// 商品結構（蝦皮／MOMO／PChome）
function _hlStructureDim(ch, m, snap, R) {
  const def = R.dims.find(d => d.key === 'structure');
  const S = R.structure, t = R.types[ch.type] || {};
  const lim = s => (s.key === 'sellThrough'
    ? { zero: t.sellThrough ? t.sellThrough[0] : null, full: t.sellThrough ? t.sellThrough[1] : null, flag: (t.sellThrough && t.stFlag) || '', flagN: t.stN || null }
    : { zero: s.zero, full: s.full });
  const all = (st, reason) => _hlFinishDim(def, _hlSubs(S.subs, st, reason, lim));
  if (!ch.prod) return all('na', '不適用：這個通路只有 KPI 月合計，沒有商品層資料');
  const p = _hlProdOf(ch, m, snap), fail = _hlProdFail(p, m);
  if (fail) return all(fail[0], fail[1]);
  const rows = p.snap.rows, base = _hlProdBase(rows);
  const coverage = rows.filter(r => r.sold).length ? base.length / rows.filter(r => r.sold && r.rev > 0).length : null;
  if (base.length < S.minSold) return all('insufficient', `資料不足：本月有銷售且有成本的商品只有 ${base.length} 個（至少 ${S.minSold} 個才評分）`);
  const subs = _hlSubs(S.subs, 'ok', '', lim);
  const by = k => subs.find(s => s.key === k);
  const set = (s, st, reason) => { s.status = st; s.reason = reason; };
  const src = `${ch.prod.platform === 'shopee' ? '淨利表' : ch.prod.platform === 'momo' ? 'MOMO 商品主檔＋對帳' : 'PChome 日曆月'} ${ch.prod.shop} ${_hlYmLabel(m)}`
    + (coverage != null && coverage < 1 ? `；成本涵蓋 ${_hlFmtPct(coverage, 0)}（缺成本的商品不算）` : '');
  const totRev = base.reduce((a, r) => a + r.rev, 0);
  // MOMO：逐商品利潤＝MOMO 總表「淨利貢獻」欄（同一套算法），ⓘ 寫清楚口徑
  const mNote = ch.prod.platform === 'momo' ? _hlMomoProfitNote(ch.prod.shop, p.snap.freightMode) : '';
  const lossRev = base.filter(r => r.profit < 0).reduce((a, r) => a + r.rev, 0);
  const lowRev = base.filter(r => r.profit >= 0 && r.profit / r.rev < S.lowMargin && r.rev >= S.lowMinRev).reduce((a, r) => a + r.rev, 0);
  const sL = by('lossShare'); sL.raw = lossRev / totRev; sL.score = _hlLinear(sL.raw, sL.zero, sL.full); sL.trace = { src, num: lossRev, den: totRev };
  if (mNote) ['lossShare', 'lowShare', 'longLoss'].forEach(k => { by(k).note = mNote; });
  const sW = by('lowShare'); sW.raw = lowRev / totRev; sW.score = sW.scored === false ? null : _hlLinear(sW.raw, sW.zero, sW.full); sW.trace = { src, num: lowRev, den: totRev };
  // 長期虧損：上個月也要有商品層資料
  const prev = _hlProdOf(ch, _hlAddMonth(m, -1), snap), sG = by('longLoss');
  if (prev.state !== 'ready' || !prev.snap || prev.snap.status !== 'ok') {
    const pf = _hlProdFail(prev, _hlAddMonth(m, -1));
    // 上個月還在算 ⇒ 整個面向「載入中」（不先用少一個子指標的分數，免得等一下分數又變）
    if (pf && pf[0] === 'loading') return all('loading', pf[1]);
    set(sG, 'insufficient', `資料不足：長期虧損要上個月（${_hlYmLabel(_hlAddMonth(m, -1))}）的商品資料`);
  } else {
    const prevLoss = {}; _hlProdBase(prev.snap.rows).forEach(r => { if (r.profit < 0) prevLoss[r.key + '|' + (r.sub || '')] = true; });
    const n = base.filter(r => r.profit < 0 && prevLoss[r.key + '|' + (r.sub || '')]).length;
    sG.raw = n / base.length; sG.score = _hlLinear(sG.raw, sG.zero, sG.full);
    sG.trace = { src, text: `本月與上個月都虧損 ${n} 個 ÷ 本月有銷售且有成本 ${base.length} 個` };
  }
  // 動銷率
  const st = _hlSellThrough(rows), sT = by('sellThrough'), sP = by('sellThroughPage'), sD = by('deadDupPages');
  if (!t.sellThrough) [sT, sP, sD].forEach(s => set(s, 'na', '不適用：這個類型不評動銷率'));
  else if (!st) [sT, sP, sD].forEach(s => set(s, 'pending', ch.prod.platform === 'shopee'
    ? '尚未上傳：蝦皮的上架清單要等洞察表「商品表現」按月保存（塊 C）才有，現在算不出分母'
    : '尚未上傳：沒有上架狀態，算不出分母'));
  else if (!st.company.den) [sT, sP, sD].forEach(s => set(s, 'insufficient', '資料不足：沒有上架或有銷售的商品'));
  else {
    sT.raw = st.company.num / st.company.den; sT.score = _hlLinear(sT.raw, sT.zero, sT.full);
    sT.trace = { src, text: `有銷售的公司商品 ${st.company.num} ÷ 上架或有銷售的公司商品 ${st.company.den}` + (st.fallback ? `（其中 ${st.fallback} 個編號格式不符，改用商品頁計）` : '') };
    sP.raw = st.page.den ? st.page.num / st.page.den : null;
    const subT = p.snap.subTotals || {};
    const pcText = Object.keys(subT).length ? '；料號口徑（同 PChome 總覽卡）：' + Object.keys(subT).map(k => `${k} ${subT[k].sold}/${subT[k].total}`).join('、') : '';
    const pc = p.snap.pageCount;
    sP.trace = { src, text: `有銷售的商品頁 ${st.page.num} ÷ 上架或有銷售的商品頁 ${st.page.den}` + (pc ? `（同 MOMO 總覽：${pc.sold}/${pc.total}）` : '') + pcText };
    sD.raw = st.deadDupPages; sD.trace = { src, text: `多頁公司商品裡沒賣出的頁 ${st.deadDupPages} 頁` };
  }
  return _hlFinishDim(def, subs);
}

// 拖累商品清單（純函式）。回 { status, reason, items:[前 N 名], more, info:[連續零動銷…], infoCount }。
//   原因（一件商品可命中多個；金額取最大的那個，不重複加總）：
//     loss 💸 賠錢：純利 < 0 → −純利
//     low 📉 低利：純利率 0～低利線、營收 ≥ 門檻 → (低利線 − 純利率) × 營收
//     longLoss ⏳ 長期虧損：本月與上個月都虧 → 兩個月虧損合計
//     adsLoss 🎯 廣告致虧（蝦皮）：不投廣告會賺、投了變賠 → 廣告費
//     adsBurn 🔥 廣告燒錢（蝦皮）：廣告費在本通路前 20%、直接 ROI 低於目標 ROI → 廣告費 × (1 − 直接 ROI ÷ 目標 ROI)
//     deadLong ⏸ 連續零動銷（MOMO／PChome）：上架、本月與上個月都沒賣 → 不算金額，另列
//   adjusted＝調整日期（YYYY/MM/DD）在評分月份往前 adjustMonthsBack 個月的 1 號以後；沒有就 null。
function healthDragList(ch, month, snap, rules) {
  const R = rules || HEALTH_RULES, D = R.drag, S = R.structure;
  if (!ch.prod) return { status: 'na', reason: '這個通路只有 KPI 月合計，沒有商品層明細', items: [], info: [], more: 0, infoCount: 0 };
  const p = _hlProdOf(ch, month, snap), fail = _hlProdFail(p, month);
  if (fail) return { status: fail[0], reason: fail[1], items: [], info: [], more: 0, infoCount: 0 };
  const rows = p.snap.rows;
  const prev = _hlProdOf(ch, _hlAddMonth(month, -1), snap);
  if (prev.state === 'loading') return { status: 'loading', reason: '商品層資料載入中…', items: [], info: [], more: 0, infoCount: 0 };
  const prevRows = prev.state === 'ready' && prev.snap && prev.snap.status === 'ok' ? prev.snap.rows : null;
  const pk = r => r.key + '|' + (r.sub || '');
  const prevBy = {}; (prevRows || []).forEach(r => { prevBy[pk(r)] = r; });
  const shopee = ch.prod.platform === 'shopee';
  const adsRows = shopee ? rows.filter(r => r.adsFee > 0).sort((a, b) => b.adsFee - a.adsFee) : [];
  const burnCut = adsRows.length ? adsRows[Math.max(0, Math.ceil(adsRows.length * D.adsBurnTopPct) - 1)].adsFee : Infinity;
  const since = _hlAddMonth(month, -D.adjustMonthsBack).replace('-', '/') + '/01';
  const items = [];
  rows.forEach(r => {
    const reasons = [];
    const ok = r.sold && r.costKnown && r.rev > 0 && _hlFinite(r.profit);
    if (ok && r.profit < 0) reasons.push({ code: 'loss', amount: -r.profit });
    if (ok && r.profit >= 0 && r.profit / r.rev < S.lowMargin && r.rev >= S.lowMinRev) reasons.push({ code: 'low', amount: (S.lowMargin - r.profit / r.rev) * r.rev });
    const pr = prevBy[pk(r)];
    if (ok && r.profit < 0 && pr && pr.sold && pr.costKnown && _hlFinite(pr.profit) && pr.profit < 0) reasons.push({ code: 'longLoss', amount: -(r.profit + pr.profit) });
    if (shopee && _hlAdsLossHit(r)) reasons.push({ code: 'adsLoss', amount: r.adsFee });
    if (shopee && r.adsFee > 0 && r.adsFee >= burnCut) {
      const rate = r.rev > 0 ? r.profit / r.rev : null, adsPct = r.rev > 0 ? r.adsFee / r.rev : 0;
      const denom = rate == null ? 0 : rate + adsPct - 0.20, target = denom > 0 ? 1 / denom : null;
      if (target != null && r.directROI > 0 && r.directROI < target) reasons.push({ code: 'adsBurn', amount: r.adsFee * (1 - r.directROI / target) });
    }
    if (!reasons.length) return;
    const amount = reasons.reduce((a, x) => Math.max(a, x.amount), 0);
    const adj = (p.snap.lastAdjust || {})[r.key];
    items.push({ key: r.key, sub: r.sub || null, name: r.name, rev: r.rev, profit: r.profit, adsFee: shopee ? r.adsFee : null,
      reasons: reasons.map(x => x.code), amount, adjusted: adj && adj >= since ? adj : null });
  });
  items.sort((a, b) => (b.amount - a.amount) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const info = [];
  if (!shopee && prevRows) rows.forEach(r => { const pr = prevBy[pk(r)];
    if (r.active && !r.sold && pr && !pr.sold) info.push({ key: r.key, sub: r.sub || null, name: r.name, reasons: ['deadLong'] }); });
  info.sort((a, b) => (a.key < b.key ? -1 : 1));
  return { status: 'ok', reason: '', items: items.slice(0, D.topN), more: Math.max(0, items.length - D.topN),
    info: info.slice(0, D.topN), infoCount: info.length, prevMissing: !prevRows };
}
const HEALTH_DRAG_REASONS = _hlDeepFreeze({
  loss:     { icon: '💸', label: '賠錢',       desc: '這個月純利是負的；拖累金額＝虧損金額' },
  low:      { icon: '📉', label: '低利',       desc: '有賺但純利率低於低利線、營收又不小；拖累金額＝（低利線 − 純利率）× 營收' },
  longLoss: { icon: '⏳', label: '長期虧損',   desc: '這個月和上個月都在賠；拖累金額＝兩個月虧損合計' },
  adsLoss:  { icon: '🎯', label: '廣告致虧',   desc: '不投廣告本來會賺，投了變賠（蝦皮）；拖累金額＝廣告費' },
  adsBurn:  { icon: '🔥', label: '廣告燒錢',   desc: '廣告費排在這個通路前段、直接 ROI 又低於目標 ROI（蝦皮）；拖累金額＝廣告費中沒達標的部分' },
  deadLong: { icon: '⏸', label: '連續零動銷', desc: '上架中，但這個月和上個月都沒賣出（MOMO／PChome）；不算金額，另外列出' },
});

const _HL_DIM_FNS = { profit: _hlProfitDim, growth: _hlGrowthDim, ads: _hlAdsDim, structure: _hlStructureDim };

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

// 🔴 一個通路一個月的健檢。純函式：同樣的 (ch, month, snap, rules) 一定得到同樣的結果。
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
  // 🔴 分數不得因為「商品層載好了沒」而改變（2026-11-02）：還有面向在等商品層（沒載入／載入中／逾時）⇒ 不給總分、不排名，
  //   總覽顯示「商品資料載入中」等狀態，而不是用比較少的面向算出一個之後會變的分數。面向本身照樣算（卡片看得到 KPI 那幾個面向）。
  const wait = dims.find(d => d.status === 'loading') || dims.find(d => d.status === 'notLoaded') || dims.find(d => d.status === 'timeout');
  if (wait) {
    const st = wait.status === 'loading' ? 'prodLoading' : wait.status === 'notLoaded' ? 'prodIdle' : 'prodTimeout';
    const reason = st === 'prodLoading' ? (wait.reason || '商品資料載入中…') : st === 'prodIdle' ? '商品資料尚未載入（手機請展開卡片按「載入商品資料」）' : HL_TIMEOUT_MSG;
    return Object.assign(base, { status: st, reason, score: null, light: 'none', isReference: false, ranked: false,
      dimsUsed: dims.filter(d => d.status === 'ok' && _hlFinite(d.score)).length, dimsTotal: dims.filter(d => d.status !== 'na').length,
      dims, topReason: '', fill: c ? c.fill : null });
  }
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

// 回測（純函式）：逐通路逐月算原始值與分數；另依類型算各子指標的百分位。vals＝原始數字（校準 healthCalibrate 用）。
function healthBacktest(snap, months, channels, rules) {
  const R = rules || HEALTH_RULES;
  const rows = [], vals = {};
  (channels || HEALTH_CHANNELS).forEach(ch => months.forEach(m => {
    const r = computeChannelHealth(ch, m, snap, R);
    const row = { 通路: ch.label, 月: m, 類型: (R.types[ch.type] || {}).label || ch.type, 狀態: r.status };
    r.dims.forEach(d => d.subs.forEach(s => {
      row[s.label + (s.scored === false ? '（參考）' : '')] = s.status === 'ok' ? _hlFmtRaw(s.raw, s.unit) : s.status;
      if (s.status === 'ok' && s.scored !== false && ch.ranked !== false && _hlFinite(s.raw)) {
        const k = ch.type + '|' + s.key;
        (vals[k] = vals[k] || { type: ch.type, key: s.key, dim: d.key, 類型: (R.types[ch.type] || {}).label || ch.type, 子指標: s.label, unit: s.unit,
          lower: _hlFinite(s.zero) && _hlFinite(s.full) && s.zero > s.full, zero: s.zero, full: s.full, xs: [] }).xs.push(s.raw);
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
  return { rows, pct, vals };
}

// 校準參數（塊 A §2-7-1 的方法，用在塊 B 的面向；只是提案用，不影響計分）：
//   間距 S＝樣本 < minN ? 最小間距 : max(最小間距, (P75 − P10) × stretch)；中位數落在 target（65 分）；捨入 step（0.5pp）。
//   越高越好：零分線＝P50 − 0.65S、滿分線＝零分線＋S；越低越好：零分線＝P50 ＋ 0.65S、滿分線＝零分線 − S。
//   比率不得 < 0% 或 > 100%：碰到邊界就把那一端夾在邊界，另一端保持至少「最小間距」。
//   最小間距：廣告佔比／合格率／致虧占比、動銷率 8pp（同塊 A 的比率類）；虧損／低利／長期虧損這類「本來就很小」的占比 4pp（同塊 A 的 pp 類，理由見方案 §2-7-2）。
const HEALTH_CALIB = _hlDeepFreeze({
  stretch: 1.25, target: 0.65, step: 0.005, minN: 6,
  gaps: { adsPct: 0.08, adsQualified: 0.08, adsLoss: 0.08, sellThrough: 0.08, lossShare: 0.04, lowShare: 0.04, longLoss: 0.04 },
});
// 校準提案（純函式）：吃 healthBacktest 的 vals（只看塊 B 的 ads／structure 子指標），回逐「類型 × 子指標」一列，另加「全部類型合併」一列。
function healthCalibrate(vals, opts) {
  const C = Object.assign({}, HEALTH_CALIB, opts || {});
  const gaps = Object.assign({}, HEALTH_CALIB.gaps, (opts && opts.gaps) || {});
  const rnd = v => Math.round(Math.round(v / C.step) * C.step * 10000) / 10000;
  const one = (xs, key, lower) => {
    const q = _hlPercentiles(xs), g = gaps[key] || 0.08;
    if (!q.n) return { q, zero: null, full: null, why: '沒有樣本' };
    const spread = C.stretch * (q.p75 - q.p10);
    const S = q.n < C.minN ? g : Math.max(g, spread);
    let why = q.n < C.minN ? `樣本少（${q.n} 筆）→ 最小間距` : (spread <= g ? '分布窄 → 最小間距' : '(P75 − P10) × 1.25');
    let zero, full;
    if (lower) {
      zero = rnd(q.p50 + C.target * S); full = rnd(zero - S);
      if (full < 0) { full = 0; zero = Math.max(zero, rnd(g)); why += '；滿分線夾在 0%'; }
    } else {
      zero = rnd(q.p50 - C.target * S); full = rnd(zero + S);
      if (zero < 0) { zero = 0; full = Math.max(full, rnd(g)); why += '；零分線夾在 0%'; }
      if (full > 1) { full = 1; zero = Math.min(zero, rnd(1 - g)); why += '；滿分線夾在 100%'; }
    }
    return { q, zero, full, why };
  };
  const pick = Object.keys(vals || {}).map(k => vals[k]).filter(v => v.dim === 'ads' || v.dim === 'structure');
  const out = [];
  const add = (label, v, xs) => {
    const p = one(xs, v.key, v.lower), f = x => _hlFmtRaw(x, v.unit);
    const sc = x => (p.zero == null ? null : _hlLinear(x, p.zero, p.full));
    const cur = x => _hlLinear(x, v.zero, v.full);
    // 「中位分」＝原始值中位數（P50）那一點的分數（不是分數的中位數：越低越好的子指標排序會反過來，偶數筆時兩者會差一格）
    out.push({ 類型: label, 子指標: v.子指標, 方向: v.lower ? '越低越好' : '越高越好', 筆數: p.q.n,
      現值: `${f(v.zero)} → ${f(v.full)}`, P10: f(p.q.p10), P50: f(p.q.p50), P75: f(p.q.p75),
      建議零分線: f(p.zero), 建議滿分線: f(p.full), 理由: p.why,
      現行中位分: xs.length ? Math.floor(cur(p.q.p50)) : '—',
      現行滿分比例: xs.length ? Math.round(xs.filter(x => cur(x) >= 100).length / xs.length * 100) + '%' : '—',
      建議中位分: xs.length && p.zero != null ? Math.floor(sc(p.q.p50)) : '—',
      建議滿分比例: xs.length && p.zero != null ? Math.round(xs.filter(x => sc(x) >= 100).length / xs.length * 100) + '%' : '—',
      _key: v.key, _type: v.type, _zero: p.zero, _full: p.full });
  };
  const ord = t => (HEALTH_RULES.types[t] || {}).order || 50;
  pick.sort((a, b) => (ord(a.type) - ord(b.type)) || (a.key < b.key ? -1 : 1)).forEach(v => add(v.類型, v, v.xs));
  const byKey = {};
  pick.forEach(v => { (byKey[v.key] = byKey[v.key] || { v, xs: [] }).xs.push(...v.xs); });
  Object.keys(byKey).forEach(k => add('全部類型合併', byKey[k].v, byKey[k].xs));
  return out;
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

// 頁尾一段話：由規則產生（計分面向、各自涵蓋哪些通路與資料來源、之後加入的面向），不寫死。
function _hlFootText(rules) {
  const R = rules || HEALTH_RULES;
  const live = R.dims.filter(d => d.impl), later = R.dims.filter(d => !d.impl);
  return '排名只在同一類型內比較；跨類型的分數高低僅供參考（各類型門檻不同、營收口徑也不同）。灰色斜體是參考分，不排名。'
    + `規則 ${R.version} 計分的面向：` + live.map(d => `${d.label}（權重 ${d.w}${d.scope ? '；' + d.scope : ''}）`).join('、') + '。'
    + (later.length ? `之後加入：${later.map(d => d.label).join('、')}。` : '')
    + '商品層資料還沒載好的通路先不給總分。';
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
  const lim = s => `零分線 ${_hlFmtRaw(s.zero, s.unit)}、滿分線 ${_hlFmtRaw(s.full, s.unit)}${s.zero > s.full ? '（越低越好）' : ''}。`;
  const uncal = blk => (blk && blk.calibrated === false ? '（門檻是起始值，待回測校準）' : '');
  const stTypes = types.filter(t => t.sellThrough);
  const stLims = '零分線→滿分線依通路類型：' + stTypes.map(t => `${t.label} ${P0(t.sellThrough[0])}→${P0(t.sellThrough[1])}${t.stFlag ? `（${_HL_FLAG_TEXT[t.stFlag]}）` : ''}`).join('、') + '。'
    + (stTypes.some(t => t.stFlag) ? '「樣本少」＝校準時資料不到 ' + HEALTH_CALIB.minN + ' 筆、門檻先用最小間距；「待校準」＝還沒有實測資料、仍是起始值。' : '');
  const S = R.structure || {}, A = R.ads || {}, D = R.drag || {};
  const qual = (A.subs || []).find(s => s.key === 'adsQualified');
  const structLine = s => {
    if (s.key === 'sellThrough') return subLine(s, stLims);
    if (s.key === 'lowShare') {
      const def = `低利線＝商品純利率 ${P0(S.lowMargin)}，只算營收 ${_hlFmtMoney(S.lowMinRev)} 以上的商品。`;
      return s.scored === false ? `${subLine(s)}\n${def}${s.why ? '\n為什麼不計分：' + s.why : ''}` : subLine(s, def + lim(s));
    }
    return subLine(s, lim(s));
  };
  const dragLines = Object.keys(HEALTH_DRAG_REASONS).map(k => { const x = HEALTH_DRAG_REASONS[k]; return `${x.icon} ${x.label}：${x.desc}。`; });
  return [
    { h: '這頁在做什麼', p: '每個月幫每個通路做一次「體檢」，用分數和燈號看出哪個通路賺得好、哪個在退步。分數全部由固定規則算出來，沒有人手動打分數；同樣的資料一定得到同樣的分數；沒有資料的面向不計分、不算 0 分。主看板一張卡片一個通路，點卡片可以看細項。' },
    { h: '資料從哪裡來', ol: [
      '獲利、成長、蝦皮的廣告佔比：KPI 月結裡各通路每個月的營收、商品成本、廣告費、純利。某個通路某個月的 KPI 還沒填完，就顯示「尚未上傳」，不會亂算。',
      '廣告效率、商品結構、拖累商品：商品層資料（蝦皮＝淨利表報表；MOMO＝商品主檔＋對帳；PChome＝日曆月總表），口徑跟各自的淨利表頁面一樣。',
      '電腦上打開這頁，就會在背景依序載入蝦皮、MOMO、PChome 的商品層資料（資料量大，可能要一到兩分鐘）；手機上不會自動載入，要按卡片裡的「載入商品資料」。',
      '商品層資料還沒載好的通路（蝦皮、MOMO、PChome）先不給總分，卡片上的分數寫「載入中」或「未載入」，載好後整頁自動重算；分數不會因為你有沒有展開細項而不同。之後雲端資料有更新也會自動重算。',
      '載入超過 60 秒，會顯示「仍在載入（已等 N 秒）」，這頁會一直等，資料一到自動重算；超過 5 分鐘還沒好，會再提示「請先進淨利表點一下那個平台再回來」（這頁照樣繼續等）。',
      '卡片上方的灰色小標章是資料時間（KPI 填寫進度、淨利表更新時間、MOMO 對帳單有沒有上傳、PChome 商品清單最新匯出日），只供參考，不算分。',
    ] },
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
      '廣告效率只有蝦皮有（只有蝦皮有逐商品廣告資料）；商品結構只有蝦皮、MOMO、PChome 有。其他通路這兩個面向是「不適用」，不算進「依 N/M」的 M。',
      '某個面向這個月沒有資料時，不算 0 分，改用其他有資料的面向重新平均。',
    ].filter(Boolean) },
    { h: '每個面向、子指標的意思', ol: [
      '【獲利】這個通路賺不賺錢。',
      ...R.profit.subs.map(s => subLine(s, s.key === 'pureRate' ? pureLims : '')),
      `【成長】跟自己前一段時間比，有沒有變好（近 ${R.growth.window} 個月合計 vs 前 ${R.growth.window} 個月合計，全通路共用同一套門檻）。`,
      ...R.growth.subs.map(s => subLine(s, lim(s))),
      A.subs ? `【廣告效率】廣告費花得值不值得（只有蝦皮）${uncal(A)}。` : '',
      ...(A.subs || []).map(s => subLine(s, (s.key === 'adsQualified' && qual ? `合格線＝商品純利率 ${P0(qual.minPure)}。` : '') + lim(s))),
      S.subs ? `【商品結構】商品組成健不健康：有沒有在賣、有沒有賠錢貨（蝦皮、MOMO、PChome）${uncal(S)}。商品利潤率一律用「商品純利 ÷ 商品營收」；缺成本的商品不算進虧損、低利、長期虧損。本月有銷售且有成本的商品少於 ${S.minSold} 個時，整個面向「資料不足」。` : '',
      ...(S.subs || []).map(structLine),
    ].filter(Boolean) },
    S.subs ? { h: '動銷率怎麼算「1 個商品」', ol: [
      '分數用「公司商品」：原廠編號／料號去掉最後一段規格碼（例：同一款雨衣的四個顏色算 1 個）。同一個公司商品只要有一頁、一個規格有賣，就算有動。',
      '分母＝期末上架的商品，加上這個月有賣但已經下架的商品（避免分子比分母大）。',
      '卡片面向最下面的「未計分」小字另外列「動銷率（商品頁口徑）」：每個通路商品頁各算一個，跟 MOMO／PChome 總覽畫面同口徑，給你對照，不計分。',
      '「多頁商品中零動銷的頁」：同一個公司商品開了好幾頁、這個月有賣，其中沒賣出的頁數。公司商品口徑會把它們藏起來，所以另外列出，不計分。',
      '編號格式不符（不是「英文字母＋數字－數字」）的商品，改用商品頁自己算一個，ⓘ 裡會寫有幾個。',
      '蝦皮的動銷率現在是「尚未上傳」：要等洞察表的商品表現按月保存（下一塊）才有上架清單當分母。',
      'MOMO、PChome 只有「目前」的上下架狀態，回頭看舊月份時，分母用的是今天的上架狀態，會有落差。',
    ] } : null,
    D.topN ? { h: '要處理的商品（拖累商品）', ol: [
      '在蝦皮、MOMO、PChome 通路細項的最上面（點通路卡片展開）。依「拖累金額」（影響金額）由大到小；一件商品可以命中好幾個原因，金額取其中最大的那個（不重複加總）。',
      '卡片上的「⚠ 待處理商品 N 個」：這個月所有拖累商品裡，還沒有調整紀錄的商品數；都調整過或沒有拖累商品就寫「✓ 沒有待處理商品」。點這一行會展開細項、直接捲到清單最上面。',
      `清單先列待處理的商品（依拖累金額由大到小），預設顯示前 ${D.topN} 個，超過時按「顯示全部待處理（N 個）」看全部；清單裡待處理的總數一定等於卡片上的 N。已調整的商品排在所有待處理之後、淡化顯示，平常收成一行「已調整 N 個」，點了才展開。`,
      ...dragLines,
      `「🔥 廣告燒錢」的前段＝廣告費排在這個通路前 ${P0(D.adsBurnTopPct)}。`,
      `「✓ 日期 已調整」：這件商品在評分月份的前 ${D.adjustMonthsBack} 個月 1 號以後有調整紀錄（蝦皮看淨利表備註與洞察表調整紀錄，MOMO／PChome 看優化紀錄）。只顯示日期，不顯示是誰。`,
      '點品號會跳到淨利表那個通路、那個月，並在搜尋框填入品號；只切換畫面，不會改你淨利表上記住的期間與篩選。',
    ] } : null,
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
      '尚未上傳：這個月的 KPI 還沒填完（畫面會寫已填幾格），或這個月還沒有商品層資料（淨利表報表、商品主檔）。',
      `營收過小：當月營收未滿 ${_hlFmtMoney(R.minRev)}，比率類指標波動太大，不評分。`,
      '已關站：關站月份起不評分、不排名，走勢只畫到關站前。',
      '尚未載入：商品層資料還沒載入（手機要按卡片裡的「載入商品資料」）。',
      '載入中：商品層資料正在載入或計算，等一下會自己更新。',
      '仍在載入（已等 N 秒）：商品層資料超過 60 秒還沒載好，還在等，到了自動重算；超過 5 分鐘會提示先進淨利表點一下那個平台。',
    ] },
    { h: '細項最上面的「依 N/M 個面向評分」', p: 'M＝這個通路目前能評的面向數；N＝這個月實際有分數的面向數。例：「依 1/2 個面向評分」代表只有一個面向有分數，另一個是灰色狀態。' },
    { h: '參考分', p: `要有「獲利」分數，而且總共至少 ${R.formalMinDims} 個面向有分數，才是正式分。不夠的話，總分顯示灰色斜體並標「參考」，不參加排名。` },
    { h: '通路類型與排名', ol: [
      ...types.map(t => `${t.label}：${t.members}`),
      '排名只在同一類型裡比（卡片上不顯示名次）。不同類型的門檻、營收口徑都不同，跨類型的分數高低只供參考。',
      '業外、官網會列出來，但不參加排名。',
    ] },
    gross ? { h: '毛利率為什麼不計分', p: gross.why + '卡片「獲利」面向最下面的「未計分：毛利率」，滑鼠移上去也看得到這段說明。' } : null,
    R.notes.shopee && R.notes.shopee.rev ? { warn: R.notes.shopee.rev } : null,
    notes.length ? { h: '其他口徑提醒', ol: notes } : null,
    { h: '主看板（卡片牆）怎麼看', ol: [
      '依通路類型分組，一張卡片一個通路：通路名、大字總分（綠／黃／紅燈號；灰色斜體標「參考」是參考分）、總分旁的比上月分數差、待處理商品數，以及純利率、毛利率、動銷率三欄。',
      '卡片最下面的「純利率／毛利率／動銷率」三欄：只顯示、不計分（評分照各面向的規則），數字跟細項裡的一樣。下面一行「↑ 上月 x%」是上個月的數字：↑ 比上月高、↓ 比上月低、→ 一樣；上個月沒資料就沒有這一行。',
      ...HL_OVERVIEW_COLS.map(c => c.info),
      '沒資料不會顯示成零：KPI 沒填完寫「尚未上傳」；動銷率的商品資料還在載入寫「載入中」，蝦皮要等商品表現按月保存才有、先寫「待上傳」，沒有商品層資料的通路寫「—」。',
      '這個月沒有總分的通路（KPI 還沒填、資料不足、營收太小、已關站）不做卡片，收在頁面最下方「另有 N 個通路沒有分數」，點一下展開清單，括號是原因；點通路名一樣可以看細項。',
      '點卡片：在那一組卡片下方展開細項；再點一次收起來。同一時間只展開一個。細項最上面是「要處理的商品」；各面向分數條與子指標收在「看評分細節」，點了才展開。',
      '總分旁的「比上月 +8」是這個月總分減上個月總分；上個月沒有總分就不顯示。',
    ] },
    { h: '比上月、主要扣分原因、走勢圖', ol: [
      '比上月：這個月總分減上個月總分。',
      `「上月」跟「成長」不一樣：卡片最下面純利、毛利、動銷的箭頭是單一個月跟單一個月比；「成長」面向和扣分原因裡的「近 ${R.growth.window} 個月 vs 前 ${R.growth.window} 個月」是近 ${R.growth.window} 個月加起來跟再往前 ${R.growth.window} 個月加起來比，所以兩邊數字不同是正常的。`,
      '最拉低總分的是哪一項：點卡片展開細項，在「看評分細節」裡看每個子指標的數字、滿分標準和得分。',
      '頁頂「KPI 尚未填完」平常收成一行，點一下展開，可以直接點通路跳到 KPI 月結表去填。',
      '點通路卡片展開細項：看每個面向的分數條、每個子指標的本月數字、滿分標準（到這裡就滿分）、得分，以及近 12 個月分數走勢（空心點＝參考分）。成長兩項寫「前期 → 近期」，滿分標準是近期要到多少。',
      '沒有分數的子指標（只供參考、尚未上傳、不適用）不各佔一列，收在每個面向最下面的「未計分」那一行。',
      '每個 ⓘ：第一行是一句白話；點「看算法」才看公式、實際的分子分母數字、資料來源與提醒。',
    ] },
    { h: '排名、計分面向與範圍', p: _hlFootText(R) },
    { h: '規則版本', p: `目前是 ${R.version}。門檻有改就會升版本。分數不存檔，每次打開都用目前的規則重算，所以改版後舊月份的分數也會跟著變。` },
  ].filter(Boolean);
}
// 「📖 怎麼看這頁」第一層（塊 3b）：最多 5 行、每行 25 字內的白話；燈號門檻從規則產生
function _hlGuideIntro(rules) {
  const L = (rules || HEALTH_RULES).lights;
  return [
    `分數顏色：綠 ≥${L.green}、黃 ${L.yellow}–${L.green - 1}、紅 <${L.yellow}。`,
    '卡片：總分、比上月、待處理商品、三個比率。',
    '點卡片：看要處理的商品，再看評分細節。',
    '灰色「參考」：評分面向不夠，只供參考、不排名。',
    '最下方「另有 N 個通路沒有分數」：點了看清單。',
  ];
}
// 說明彈窗：第一層 5 行；第二層「看完整規則」預設收合，內容＝_hlGuideBlocks(HEALTH_RULES)（門檻、權重都從規則產生）。
//   樣式沿用 recon-guide（App.guideHtml 同一套 class），不改共用的 modal.js。
function _hlGuideModalHtml(rules) {
  const e = t => escapeHtml(t);
  const full = _hlGuideBlocks(rules).map(b => {
    if (b.p) return (b.h ? '<h4 class="recon-guide-h">' + e(b.h) + '</h4>' : '') + '<p class="recon-guide-p">' + e(b.p) + '</p>';
    if (b.warn) return '<p class="recon-guide-warn">' + e(b.warn) + '</p>';
    return '<h4 class="recon-guide-h">' + e(b.h) + '</h4><ol class="recon-guide-ol">' + b.ol.map(x => '<li>' + x.split('\n').map(e).join('<br>') + '</li>').join('') + '</ol>';
  }).join('');
  return `<div class="recon-guide hl-guide"><ul class="hl-guide-intro">${_hlGuideIntro(rules).map(x => `<li>${e(x)}</li>`).join('')}</ul>
    <details class="hl-guide-more"><summary>看完整規則</summary><div class="hl-guide-full">${full}</div></details>
    <div class="recon-guide-ftr"><button type="button" class="recon-btn recon-guide-close" onclick="App.closeModal()">關閉</button></div></div>`;
}

/* ================================================================
 * ② 資料收集區（只有這一區碰 window）
 * ================================================================ */
let _hlMock = null;          // __healthMock 開著時的假 snapshot 產生器（只在 localhost）
let _hlWaitTries = 0;        // KPI 還沒就緒時的重畫次數（最多 _HL_WAIT_MAX 次，之後照本機鏡像畫，並標示）
const _HL_WAIT_MAX = 20;     // × 600ms ≈ 12 秒
const _HL_TREND_N = 12;
// 只在記憶體：選的月份、展開的通路、「KPI 尚未填完」有沒有展開、「看評分細節」有沒有展開、重畫後要不要捲到商品清單、
//   哪個通路按了「顯示全部待處理」、哪個通路展開了「已調整 N 個」、最下方「另有 N 個通路沒有分數」有沒有展開
const _hlState = { month: null, open: null, pendingOpen: false, scoreOpen: false, scrollTo: null, todoAll: null, doneOpen: null, unratedOpen: false };
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
  const snap = _hlMock ? _hlMock(months)
    : (typeof window.__healthKpiSnapshot !== 'function' ? { ready: false, months: {}, groups: [], error: 'no-adapter' } : window.__healthKpiSnapshot(months));
  // 塊 B：商品層快照與各平台載入狀態掛在 snap 上（純函式只讀 snap.prod / snap.prodState）
  snap.prod = _hlProd.cache;
  snap.prodState = Object.assign({}, _hlProd.state);
  snap.prodWaitSec = _hlWaitSecs();
  return snap;
}
// 各平台已經等了幾秒（只算還在載入中的）
function _hlWaitSecs() {
  const out = {}, now = Date.now();
  Object.keys(_hlLoadStart).forEach(p => { if (_hlProd.state[p] === 'loading') out[p] = (now - _hlLoadStart[p]) / 1000; });
  return out;
}

/* ---------- 商品層（塊 B）：桌機開頁背景依序載入、手機按鈕載入；快照逐筆排隊算 ----------
 * _hlProd.state[平台]：'idle'（沒載）→ 'loading'（訂閱組載入中）→ 'ready'｜'timeout'
 * _hlProd.cache['平台|通路|YYYY-MM']＝_hlProdNormalize 後的快照（只在記憶體；「↻ 重新計算」會清掉重算）
 * 排隊：每次 render 呼叫 _hlWantProd(月, 展開的通路) 補上缺的快照 → setTimeout 一筆一筆算（不卡畫面）→ 全部算完重畫一次。
 *   要的月份：評分月份、上個月、上上個月（上個月的「長期虧損」要再往前一個月）；展開的那個通路再加走勢的 12 個月。
 *   firstMonth 之前、本月之後的月份直接記成 status:'none'（不去要資料，也不會卡在「載入中」）。 */
const _hlProd = { state: {}, cache: {}, queue: [], queued: {}, running: false };
function _hlIsNarrow() {
  try { return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches); } catch { return false; }
}
// 等待上限：健檢頁傳 30 分鐘（實際上就是「一直等」；60 秒、5 分鐘只改提示字，見 _hlLoadingMsg）
const HL_LOAD_LIMIT_MS = 30 * 60 * 1000;
function _hlProdSource() {
  if (_hlMock) return _hlMockProdSource;
  return {
    load: p => (typeof window.__healthLoadProducts === 'function' ? window.__healthLoadProducts(p, { limitMs: HL_LOAD_LIMIT_MS }) : Promise.resolve({ ready: false })),
    snapshot: (p, s, m) => (typeof window.__healthProductSnapshot === 'function' ? window.__healthProductSnapshot(p, s, m) : { platform: p, shop: s, month: m, error: 'no-adapter' }),
  };
}
// 開始載入某平台（同一平台只載一次；逾時的可以再按一次重試）。回 Promise（載完或逾時才 resolve）。
const _hlLoading = {};
const _hlLoadStart = {};   // 平台 → 開始等的時間（畫面「已等 N 秒」用）
function _hlEnsurePlatform(platform) {
  const st = _hlProd.state[platform];
  if (st === 'ready') return Promise.resolve();
  if (st === 'loading' && _hlLoading[platform]) return _hlLoading[platform];
  _hlProd.state[platform] = 'loading';
  _hlLoadStart[platform] = Date.now();
  _hlListenUpdates();
  _hlStartTicker();
  _hlLoading[platform] = Promise.resolve()
    .then(() => _hlProdSource().load(platform))
    .then(r => {
      _hlProd.state[platform] = r && r.ready ? 'ready' : 'timeout';
      try { console.info(`[health] 商品層 ${platform} ${r && r.ready ? '到齊' : '逾時'}，等了 ${Math.round((Date.now() - _hlLoadStart[platform]) / 1000)} 秒`); } catch {}
    })
    .catch(e => { console.warn('[health] 商品層載入失敗', platform, e); _hlProd.state[platform] = 'timeout'; })
    .then(() => {
      delete _hlLoading[platform];
      delete _hlDirty[platform];   // 剛到齊：等一下就會用最新資料算，載入期間收到的更新事件不用另外重算
      _hlFlushDirty();
      if (App.route === 'health') App.render();
    });
  return _hlLoading[platform];
}
// 載入期間每 5 秒：只改頁頂「商品層資料」那一列的秒數（不整頁重算）；某平台跨過 60 秒、5 分鐘時才整頁重畫一次（換提示字）
let _hlTicker = null;
const _hlTickStage = {};
function _hlStartTicker() {
  if (_hlTicker) return;
  _hlTicker = setInterval(() => {
    const loading = _HL_PLATFORMS.filter(p => _hlProd.state[p] === 'loading');
    if (!loading.length) { clearInterval(_hlTicker); _hlTicker = null; return; }
    if (App.route !== 'health') return;
    const secs = _hlWaitSecs();
    let bump = false;
    loading.forEach(p => { const st = (secs[p] || 0) >= HL_WAIT_HINT ? 2 : (secs[p] || 0) >= HL_WAIT_SLOW ? 1 : 0;
      if (st > (_hlTickStage[p] || 0)) { _hlTickStage[p] = st; bump = true; } });
    if (bump) { App.render(); return; }
    try {
      const el = document.querySelector('#main-content .hl-prodnote');
      if (el) el.outerHTML = _hlProdNoteHtml({ prodState: Object.assign({}, _hlProd.state), prodWaitSec: secs });
    } catch {}
  }, 5000);
}
// 🔴 桌機：打開健檢頁就在背景「依序」載入蝦皮 → MOMO → PChome（一次一個平台，不同時拉約 10MB），載完自動重算整頁。
//   分數不能因為有沒有展開卡片而不同（2026-11-02）。手機（≤768px）不自動載，維持卡片裡的「載入商品資料」按鈕。
//   只排一次；逾時的平台按「↻ 重新計算」會回到 idle，下一次 render 再排。
const _HL_PLATFORMS = ['shopee', 'momo', 'pchome'];
let _hlAutoRunning = false;
function _hlAutoLoad() {
  if (_hlAutoRunning || _hlIsNarrow()) return;
  if (!_HL_PLATFORMS.some(p => (_hlProd.state[p] || 'idle') === 'idle')) return;
  _hlAutoRunning = true;
  // 排在後面的平台也先標「載入中」（畫面上就是在排隊載入，不是「沒載」）；_hlEnsurePlatform 看到沒有進行中的 Promise 會真的開始載
  _HL_PLATFORMS.forEach(p => { if ((_hlProd.state[p] || 'idle') === 'idle') _hlProd.state[p] = 'loading'; });
  (async () => {
    for (const p of _HL_PLATFORMS) {
      if ((_hlProd.state[p] || 'idle') === 'idle' || _hlProd.state[p] === 'loading') {
        try { await _hlEnsurePlatform(p); } catch (e) { console.warn('[health] 自動載入失敗', p, e); }
      }
    }
  })().then(() => { _hlAutoRunning = false; });
}
// 資料更新自動重算：各平台的「資料有更新」事件（profit.js window.__healthProductEvents）→ 1.5 秒防抖 → 已算過的快照重算（舊數字留到新的算好才換）。
//   PChome 的商品清單、對帳更新沒有事件 → 每 3 秒比一次 window.__pchome*CloudLatest 是不是換了一份（只在健檢頁、PChome 已載入時）。
let _hlListening = false;
const _hlRefreshTimer = {};
const _hlPchomeRefs = { p: undefined, r: undefined, o: undefined };
function _hlListenUpdates() {
  if (_hlListening || _hlMock) return;
  const evs = window.__healthProductEvents;
  if (!evs) return;
  _hlListening = true;
  Object.keys(evs).forEach(p => evs[p].forEach(e => window.addEventListener(e, () => _hlScheduleRefresh(p))));
  setInterval(() => {
    if (App.route !== 'health' || _hlProd.state.pchome !== 'ready') return;
    const cur = { p: window.__pchomeProductsCloudLatest, r: window.__pchomeReconCloudLatest, o: window.__pchomeOrdersCloudLatest };
    const changed = _hlPchomeRefs.p !== undefined && (cur.p !== _hlPchomeRefs.p || cur.r !== _hlPchomeRefs.r || cur.o !== _hlPchomeRefs.o);
    Object.assign(_hlPchomeRefs, cur);
    if (changed) _hlScheduleRefresh('pchome');
  }, 3000);
}
// 🔴 載入期間不重算（2026-11-02 實測：背景載入時 renderer 超過 45 秒沒回應）：
//   只要還有任何平台在載入，收到的更新事件只記「髒了」，等全部載完（_hlFlushDirty）每個平台各重算一次。
const _hlDirty = {};
function _hlAnyLoading() { return _HL_PLATFORMS.some(p => _hlProd.state[p] === 'loading'); }
function _hlScheduleRefresh(platform) {
  if (_hlProd.state[platform] !== 'ready') return;   // 這個平台自己還在載入：載入那邊有「安靜期」，到齊後本來就會用最新資料算
  if (_hlAnyLoading()) { _hlDirty[platform] = true; return; }
  clearTimeout(_hlRefreshTimer[platform]);
  _hlRefreshTimer[platform] = setTimeout(() => _hlRefreshPlatform(platform), 1500);
}
function _hlFlushDirty() {
  if (_hlAnyLoading()) return;
  Object.keys(_hlDirty).forEach(p => { delete _hlDirty[p]; if (_hlProd.state[p] === 'ready') _hlRefreshPlatform(p); });
}
// 把某平台已經算過的快照重新排隊（不先刪：重算完才換掉，畫面不會閃成「載入中」）
function _hlRefreshPlatform(platform) {
  Object.keys(_hlProd.cache).forEach(k => {
    if (k.indexOf(platform + '|') !== 0 || _hlProd.queued[k]) return;
    const [p, s, m] = k.split('|');
    if (m < HEALTH_RULES.firstMonth || m > _hlTodayYm()) return;
    _hlProd.queued[k] = true; _hlProd.queue.push([p, s, m]);
  });
  if (_hlProd.queue.length && !_hlProd.running) _hlRunQueue();
}
function _hlProdKey(p, s, m) { return p + '|' + s + '|' + m; }
function _hlWantProd(month, openId) {
  const today = _hlTodayYm();
  HEALTH_CHANNELS.forEach(ch => {
    if (!ch.prod || _hlProd.state[ch.prod.platform] !== 'ready') return;
    const ms = [month, _hlAddMonth(month, -1), _hlAddMonth(month, -2)];
    if (ch.id === openId) for (let i = 3; i <= _HL_TREND_N; i++) ms.push(_hlAddMonth(month, -i));
    ms.forEach(m => {
      const k = _hlProdKey(ch.prod.platform, ch.prod.shop, m);
      if (_hlProd.cache[k] || _hlProd.queued[k]) return;
      if (m < HEALTH_RULES.firstMonth || m > today) { _hlProd.cache[k] = { status: 'none', rows: [], lastAdjust: {} }; return; }
      _hlProd.queued[k] = true; _hlProd.queue.push([ch.prod.platform, ch.prod.shop, m]);
    });
  });
  if (_hlProd.queue.length && !_hlProd.running) _hlRunQueue();
}
// 一筆一筆算，每筆之間讓出主執行緒：有 requestIdleCallback 就等瀏覽器有空（最多等 500ms），沒有就 setTimeout 16ms。
//   Console 印每筆耗時（超過 200ms 才單獨印）與整批合計／最慢的一筆，方便找卡頓。
function _hlNextTick(fn) {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => fn(), { timeout: 500 });
  else setTimeout(fn, 16);
}
function _hlNow() { try { return performance.now(); } catch { return Date.now(); } }
function _hlRunQueue() {
  _hlProd.running = true;
  const batch = { n: 0, ms: 0, slow: null, t0: _hlNow() };
  const step = () => {
    const job = _hlProd.queue.shift();
    if (!job) {
      _hlProd.running = false;
      if (batch.n) {
        try {
          console.info(`[health] 商品層重算 ${batch.n} 筆，計算 ${Math.round(batch.ms)} ms（經過 ${Math.round(_hlNow() - batch.t0)} ms）`
            + (batch.slow ? `，最慢 ${batch.slow.k} ${Math.round(batch.slow.ms)} ms` : ''));
        } catch {}
      }
      if (App.route === 'health') App.render();
      return;
    }
    const [p, s, m] = job, k = _hlProdKey(p, s, m);
    const t = _hlNow();
    let raw;
    try { raw = _hlProdSource().snapshot(p, s, m); } catch (e) { raw = { platform: p, shop: s, month: m, error: String((e && e.message) || e) }; }
    _hlProd.cache[k] = _hlProdNormalize(raw);
    delete _hlProd.queued[k];
    const ms = _hlNow() - t;
    batch.n++; batch.ms += ms;
    if (!batch.slow || ms > batch.slow.ms) batch.slow = { k, ms };
    if (ms > 200) { try { console.info(`[health] 商品層 ${k} ${Math.round(ms)} ms`); } catch {} }
    _hlNextTick(step);
  };
  _hlNextTick(step);
}
// 「↻ 重新計算」：已載入平台的快照全部重算（雲端資料可能更新了）；載入狀態不動、不重新訂閱；逾時的回到 idle（桌機會自動再載一次）
function _hlProdReset() {
  _hlProd.cache = {}; _hlProd.queue = []; _hlProd.queued = {};
  Object.keys(_hlProd.state).forEach(p => { if (_hlProd.state[p] === 'timeout') _hlProd.state[p] = 'idle'; });
}

/* ================================================================
 * ③ 畫面區
 * ================================================================ */

const _HL_STATUS_TEXT = { na: '不適用', insufficient: '資料不足', pending: '尚未上傳', smallRev: '營收過小', closed: '已關站',
  notLoaded: '尚未載入', loading: '載入中', timeout: '載入逾時' };
// 總覽列「總分」那一格，商品層還沒好時的字（不顯示分數）
const _HL_WAIT_SCORE = { prodLoading: '載入中', prodIdle: '未載入', prodTimeout: '逾時' };

function _hlScoreHtml(r) {
  if (r.status === 'closed') return `<span class="hl-score hl-l-none">已關站</span>`;
  if (_HL_WAIT_SCORE[r.status]) return `<span class="hl-score hl-score-wait${r.status === 'prodTimeout' ? ' hl-score-timeout' : ''}" title="${escapeHtml(r.reason)}">${_HL_WAIT_SCORE[r.status]}</span>`;
  if (r.score == null) return `<span class="hl-score hl-l-none" title="${escapeHtml(r.reason)}">—</span>`;
  if (r.isReference) return `<span class="hl-score hl-ref" title="參考分：要有「獲利」再加至少 1 個面向有分數才算正式分，參考分不排名">${_hlFmtScore(r.score)}<small>參考</small></span>`;
  return `<span class="hl-score hl-l-${r.light}">${_hlFmtScore(r.score)}</span>`;
}
// 面向色塊的 title 文字（塊 2 表格的格式）。卡片牆（塊 3）不再畫色塊，只給回歸指紋 data-hl-fp 用。
function _hlChipTip(d) {
  return d.status === 'ok' ? `${d.label} ${_hlFmtScore(d.score)} 分（權重 ${d.w}）` : `${d.label}：${d.reason}`;
}
function _hlDeltaHtml(r, prev) {
  if (!prev || r.score == null || prev.score == null) return '<span class="hl-delta">—</span>';
  const d = Math.floor(r.score) - Math.floor(prev.score);
  const cls = d > 0 ? 'hl-delta-up' : d < 0 ? 'hl-delta-down' : '';
  return `<span class="hl-delta ${cls}">${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}</span>`;
}
// 總覽表的三個數字欄（純利率、毛利率、動銷率）：只顯示、不計分，值＝面向裡子指標的原始值（同卡片），評分不受影響。
//   pick＝[面向 key, 子指標 key]；info＝表頭 ⓘ 與「📖 怎麼看這頁」共用的一句白話定義。
const HL_OVERVIEW_COLS = _hlDeepFreeze([
  { key: 'pure', cls: 'hl-c-pure', label: '純利率', pick: ['profit', 'pureRate'], short: '每 100 元營收最後留下多少錢',
    info: '純利率＝扣完商品成本、廣告、手續費、各項費用後，每 100 元營收最後留下多少錢（KPI 純利 ÷ 實際營收）。' },
  { key: 'gross', cls: 'hl-c-gross', label: '毛利率', pick: ['profit', 'grossRate'], short: '只扣商品成本，看訂價合不合理',
    info: '毛利率＝只扣商品成本，每 100 元營收剩多少，用來看訂價合不合理（（實際營收 − 商品成本）÷ 實際營收）。只顯示、不計分。' },
  { key: 'st', cls: 'hl-c-st', label: '動銷率', pick: ['structure', 'sellThrough'], short: '在架商品這個月有賣出的比例',
    info: '動銷率＝這個月有賣出的商品 ÷ 在架商品，以商品數計、不以規格數計（雨衣四色算 1 個商品）。' },
]);
// ⓘ 的共用樣子（2026-11-03）：展開後第一行只放一句白話（short），公式、來源、提醒收進下一層「看算法」，點了才展開。
function _hlInfoHtml(short, more, opts) {
  const o = opts || {};
  const moreHtml = more ? `<details class="hl-more"><summary>看算法</summary><div class="hl-more-body">${escapeHtml(more)}</div></details>` : '';
  return `<details class="hl-info${o.cls ? ' ' + o.cls : ''}"><summary aria-label="${escapeHtml(o.aria || '說明')}">ⓘ</summary><div class="hl-info-body"><div class="hl-info-short">${escapeHtml(short)}</div>${moreHtml}</div></details>`;
}
// 百分比去掉多餘的 .0（滿分標準用：24%、0.5%、62%）
function _hlPctTrim(v) { return _hlFinite(v) ? String(Math.round(v * 1000) / 10) + '%' : '—'; }
// 一格的內容：{ text, sub, cls }。沒資料一律狀態字或「—」，不顯示 0%。
//   動銷率：沒有商品層的通路「—」；蝦皮（還沒有上架清單）「待上傳」；商品層在載入「載入中」。
function _hlOverviewCell(r, prev, col) {
  if (r.status === 'closed') return { text: '', sub: '', cls: '' };
  const find = x => { const d = x && (x.dims || []).find(y => y.key === col.pick[0]); return d ? d.subs.find(s => s.key === col.pick[1]) || null : null; };
  const s = find(r);
  if (!s) return { text: '—', sub: '', cls: 'hl-ov-off' };
  if (s.status !== 'ok' || !_hlFinite(s.raw)) {
    let t = _HL_STATUS_TEXT[s.status] || '—';
    if (col.key === 'st') t = s.status === 'na' ? '—' : s.status === 'pending' ? '待上傳' : (s.status === 'loading' ? '載入中' : t);
    else if (s.status === 'na') t = '—';
    return { text: t, sub: '', cls: 'hl-ov-off' };
  }
  // 下方小字（2026-11-03）：不再寫 pp，改成「↓ 上月 50.7%」；方向用顯示的 0.1 位比較（看起來一樣就是 →）；上月沒資料就不顯示
  const p = find(prev);
  let sub = '', dir = '';
  if (p && p.status === 'ok' && _hlFinite(p.raw)) {
    const a = Math.round(s.raw * 1000), b = Math.round(p.raw * 1000);
    dir = a > b ? 'up' : a < b ? 'down' : 'flat';
    sub = `${dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'} 上月 ${_hlFmtPct(p.raw)}`;
  }
  return { text: _hlFmtPct(s.raw), sub, cls: '', dir };
}
// 回歸指紋（只給驗收比對用，不顯示）：跟塊 2 表格列抓出來的字串逐字相同（2026-11-03）。
//   [key, 總分文字, 純利率, 毛利率, 動銷率, 面向 title 去「（權重 N）」以半形逗號串接, 比上月].join(' | ')
//   各段都從塊 2 畫面用的同一支函式產生：_hlScoreHtml／_hlOverviewCell／_hlChipTip／_hlDeltaHtml（取文字＝textContent）。
function _hlFpText(r, prev) {
  const txt = h => String(h).replace(/<[^>]*>/g, '').trim();
  const closed = r.status === 'closed';
  return [r.id, txt(_hlScoreHtml(r)),
    ...HL_OVERVIEW_COLS.map(col => String(_hlOverviewCell(r, prev, col).text).trim()),
    closed ? '' : r.dims.map(d => _hlChipTip(d).replace(/（權重 [^）]*）$/, '')).join(','),
    closed ? '' : txt(_hlDeltaHtml(r, prev))].join(' | ');
}
// 待處理商品（塊 3b）：拖累清單「全部」商品（不是前 N 名）裡還沒有調整紀錄（adjusted 是 null）的數目。
//   用同一支 healthDragList、同一套規則，只把 topN 換成不限：判斷、排序、拖累金額都不變。沒有商品層的通路回 null（卡片不顯示這一行）。
const _HL_DRAG_ALL = _hlDeepFreeze(Object.assign({}, HEALTH_RULES, { drag: Object.assign({}, HEALTH_RULES.drag, { topN: Infinity }) }));
function _hlTodo(ch, month, snap) {
  if (!ch || !ch.prod) return null;
  const D = healthDragList(ch, month, snap, _HL_DRAG_ALL);
  if (D.status === 'ok') return { state: 'ok', n: D.items.filter(it => !it.adjusted).length, total: D.items.length };
  if (D.status === 'loading' || D.status === 'notLoaded') return { state: D.status };
  return null;
}
function _hlTodoHtml(r, snap) {
  const ch = HEALTH_CHANNELS.find(c => c.id === r.id);
  const t = _hlTodo(ch, r.month, snap);
  if (!t) return '<div class="hl-tile-todo hl-todo-none" aria-hidden="true"></div>';   // 佔位：卡片才一樣高
  if (t.state !== 'ok') return `<div class="hl-tile-todo hl-todo-wait">待處理商品：${t.state === 'loading' ? '載入中…' : '商品資料未載入'}</div>`;
  const attrs = `role="button" tabindex="0" data-hl-todo="${escapeHtml(r.id)}"`;
  if (!t.n) return `<div class="hl-tile-todo hl-todo-ok" ${attrs} title="${t.total ? `這個月 ${t.total} 個拖累商品都有調整紀錄` : '這個月沒有拖累商品'}；點一下看清單">✓ 沒有待處理商品</div>`;
  return `<div class="hl-tile-todo hl-todo-warn" ${attrs} title="這個月拖累商品 ${t.total} 個，其中 ${t.n} 個還沒有調整紀錄；點一下看清單">⚠ 待處理商品 ${t.n} 個</div>`;
}
// 卡片總分旁「比上月 +8」：上月沒有總分就不顯示（文字取 _hlDeltaHtml，跟指紋同一份）
function _hlTileDeltaHtml(r, prev) {
  if (!prev || r.score == null || prev.score == null) return '';
  return `<span class="hl-tile-delta">比上月 ${_hlDeltaHtml(r, prev)}</span>`;
}
// 卡片牆（塊 3）：有總分（含參考分）或商品層還在載入的通路做卡片；其餘（總分「—」、已關站）收進最下方「未評分」那一行
function _hlTileRated(r) { return r.status !== 'closed' && (r.score != null || !!_HL_WAIT_SCORE[r.status]); }
// 卡片三欄（卡片改版塊 1）：上＝小標「純利率／毛利率／動銷率」、中＝大字數值（狀態字灰色、小一點）、
//   下＝「↑ 上月 22.2%」（方向、顏色同塊 2 的上月邏輯；上月沒資料就是空行，卡片才一樣高）。任何寬度都不截斷（不用 …）。
function _hlTileMetsHtml(r, prev) {
  return HL_OVERVIEW_COLS.map(col => {
    const c = _hlOverviewCell(r, prev, col);
    const p = c.dir ? `<span class="hl-tile-met-p hl-ov-${c.dir}">${escapeHtml(c.sub)}</span>` : '<span class="hl-tile-met-p" aria-hidden="true"></span>';
    return `<span class="hl-tile-met${c.cls ? ' hl-tile-met-off' : ''}"><span class="hl-tile-met-k" title="${escapeHtml(col.label + '：' + col.short)}">${escapeHtml(col.label)}</span><span class="hl-tile-met-v">${escapeHtml(c.text)}</span>${p}</span>`;
  }).join('');
}
// 卡片（卡片改版塊 1）：拿掉「類型第 N」與主要扣分原因句（排名 _hlRank、原因 _hlPlainReason 照算，只是卡片上不顯示；rank 參數留著不用）。
//   商品層還在載入時沒有總分，卡片標題列的 title 放原因全文（例：仍在載入（已等 N 秒）），滑鼠移上去看得到。
function _hlTileHtml(r, prev, rank, open, snap) {
  const ch = HEALTH_CHANNELS.find(c => c.id === r.id) || {};
  const tag = ch.ranked === false ? '<span class="hl-tag">不排名</span>' : '';
  const tip = r.score == null && r.reason ? ` title="${escapeHtml(String(r.reason))}"` : '';
  return `<div class="hl-tile${open ? ' open' : ''}" role="button" tabindex="0" aria-expanded="${open ? 'true' : 'false'}" data-hl-row="${escapeHtml(r.id)}" data-hl-fp="${escapeHtml(_hlFpText(r, prev))}">
      <div class="hl-tile-hd"${tip}><span class="hl-tile-name">${escapeHtml(r.label)}</span>${tag}</div>
      <div class="hl-tile-score">${_hlScoreHtml(r)}${_hlTileDeltaHtml(r, prev)}</div>
      ${_hlTodoHtml(r, snap)}
      <div class="hl-tile-mets">${_hlTileMetsHtml(r, prev)}</div>
    </div>`;
}
// 「未評分：酷澎 商城-好麻吉（KPI 還沒填）、…、官網（已關站）」：通路名可點（Enter／Space 也可以），點了展開細項
function _hlUnratedHtml(list, prev, open, snap) {
  if (!list.length) return '';
  const items = list.map(r => {
    // 括號裡不再套括號：「KPI 還沒填完（4/6）」→「KPI 還沒填完 4/6」
    const why = r.status === 'closed' ? '已關站' : _hlShortReason(r).replace(/（([^（）]*)）$/, ' $1');
    const isOpen = open === r.id;
    return `<span class="hl-unrated-item${isOpen ? ' open' : ''}" role="button" tabindex="0" aria-expanded="${isOpen ? 'true' : 'false'}" data-hl-row="${escapeHtml(r.id)}" data-hl-fp="${escapeHtml(_hlFpText(r, prev[r.id]))}" title="${escapeHtml(String(r.reason || why))}">${escapeHtml(r.label)}</span>（${escapeHtml(why)}）`;
  });
  const det = list.find(r => r.id === open);
  // 卡片改版塊 1：平常收成一行「另有 N 個通路沒有分數 ▸」，點了才展開清單；正在看其中一個通路的細項時一律展開。
  //   清單收合時用 hidden 藏起來（不從 DOM 拿掉），每個通路的 data-hl-row／data-hl-fp 都還在。
  const show = !!(_hlState.unratedOpen || det);
  return `<div class="hl-unrated"><button type="button" class="hl-unrated-toggle" data-hl-act="unrated"${det ? ` data-hl-det="${escapeHtml(det.id)}"` : ''} aria-expanded="${show ? 'true' : 'false'}">另有 ${list.length} 個通路沒有分數</button>
      <div class="hl-unrated-list"${show ? '' : ' hidden'}>${items.join('、')}</div></div>${det ? `<div class="hl-tile-detail">${_hlCardHtml(det, snap)}</div>` : ''}`;
}
// 總覽「主要扣分原因」白話版（2026-11-03）：只換說法，不碰計分。
//   挑哪一個子指標＝跟 _hlTopReason 同一條規則（(100 − 得分) × 子指標權重 × 面向權重 最大）；_hlTopReason 本身不動（computeChannelHealth 的 topReason 照舊）。
//   文字不出現「滿分線」「零分線」「pp」「個百分點」。沒有對應模板的子指標退回「名稱 數值」。
//   🔴 成長類一律寫出期間「近 N 個月 vs 前 N 個月」（合計對合計，N＝HEALTH_RULES.growth.window），免得跟總覽的單月「上月」看起來矛盾。
//   純利率變化寫兩期的實際數字：近、前＝計分時用的近期、前期合計純利率（_hlGrowthEnds 重算，算法同 _hlGrowthDim）；拿不到就退回不帶數字的說法。
const _hlWinTxt = () => { const n = HEALTH_RULES.growth.window; return { near: `近 ${n} 個月`, prior: `前 ${n} 個月` }; };
const HL_PLAIN_REASON = {
  pureRate: (v) => `純利率 ${_hlFmtPct(v)}，偏低`,
  purePp: (v, e) => {
    const w = _hlWinTxt();
    if (!e) return _hlPlainChange(v, `${w.near}純利率比${w.prior}低`, `${w.near}純利率只比${w.prior}高一點`, `${w.near}純利率跟${w.prior}持平`, () => '');
    const a = _hlFmtPct(e.priorRate), b = _hlFmtPct(e.recentRate);
    return a === b ? `${w.near}純利率 ${b}，跟${w.prior}一樣`
      : e.recentRate < e.priorRate ? `${w.near}純利率 ${b}，比${w.prior} ${a} 低` : `${w.near}純利率 ${b}，只比${w.prior} ${a} 高一點`;
  },
  revGrowth: (v) => { const w = _hlWinTxt(); return _hlPlainChange(v, `${w.near}營收比${w.prior}少`, `${w.near}營收只比${w.prior}多`, `${w.near}營收跟${w.prior}持平`, x => `${(Math.abs(x) * 100).toFixed(1)}%`); },
  adsPct: (v) => `廣告費占營收 ${_hlFmtPct(v)}，偏高`,
  adsQualified: (v) => `廣告費只有 ${_hlFmtPct(v)} 花在本身夠賺的商品上`,
  adsLoss: (v) => `廣告讓商品由賺轉賠，占廣告費 ${_hlFmtPct(v)}`,
  sellThrough: (v) => `動銷率 ${_hlFmtPct(v)}，有賣出的商品偏少`,
  lossShare: (v) => `賠錢商品占營收 ${_hlFmtPct(v)}`,
  longLoss: (v) => `連續兩個月賠錢的商品占 ${_hlFmtPct(v)}`,
};
function _hlPlainChange(v, down, up, flat, amt) {
  const r = Math.round(v * 1000) / 1000;   // 跟顯示同一個捨入（0.1 位），四捨五入後是 0 就寫持平
  const tail = x => { const t = amt(x); return t ? ' ' + t : ''; };
  return r < 0 ? `${down}${tail(r)}` : r > 0 ? `${up}${tail(r)}` : flat;
}
// 成長的前期／近期合計（只給畫面用，不參與計分）：跟 _hlGrowthDim 同一個窗口、同一個加總；任何一格不能用就回 null。
function _hlGrowthEnds(ch, m, snap) {
  if (!ch || !snap) return null;
  const N = HEALTH_RULES.growth.window, W = [];
  for (let i = 2 * N - 1; i >= 0; i--) W.push(_hlAddMonth(m, -i));
  const cells = W.map(x => _hlCell(snap, x, ch));
  if (cells.some(c => !_hlCellUsable(c))) return null;
  const sum = (arr, k) => arr.reduce((a, c) => a + (Number(c[k]) || 0), 0);
  const prior = cells.slice(0, N), recent = cells.slice(N);
  const pr = sum(prior, 'rev'), rr = sum(recent, 'rev'), pp = sum(prior, 'pure'), rp = sum(recent, 'pure');
  if (!(pr > 0) || !(rr > 0)) return null;
  return { priorRev: pr, recentRev: rr, priorRate: pp / pr, recentRate: rp / rr };
}
function _hlPlainReason(dims, ends) {
  let best = null;
  (dims || []).forEach(d => (d.status === 'ok' ? d.subs : []).forEach(s => {
    if (s.scored === false || s.status !== 'ok' || !_hlFinite(s.score)) return;
    const loss = (100 - s.score) * s.w * d.w;
    if (loss > 0 && (!best || loss > best.loss)) best = { loss, s };
  }));
  if (!best) return '';
  const s = best.s, f = HL_PLAIN_REASON[s.key];
  return f ? f(s.raw, ends) : `${s.label} ${_hlFmtRaw(s.raw, s.unit)}`;
}
// 沒有總分時「主要扣分原因」那格的短字（完整原文放 title）。只看 status／reason 字串，不改計分。
function _hlShortReason(r) {
  const t = String(r.reason || '');
  switch (r.status) {
    case 'smallRev': return '營收太小，不評分';
    case 'pending': { const m = /已填 (\d+)\/(\d+)/.exec(t); return m && +m[1] > 0 ? `KPI 還沒填完（${m[1]}/${m[2]}）` : 'KPI 還沒填'; }
    case 'insufficient': { const m = /從 (\d{4}\/\d{2}) 起/.exec(t); return m ? `資料不足（${m[1]} 起才有）` : '資料不足'; }
    case 'prodLoading': { const m = /已等 (\d+) 秒/.exec(t); return m ? `仍在載入（已等 ${m[1]} 秒）` : '商品資料載入中'; }
    case 'prodIdle': return '商品資料未載入';
    case 'prodTimeout': return '商品資料載入逾時';
    default: return t;
  }
}

function _hlTraceText(s) {
  if (!s.trace) return '';
  const t = s.trace, lines = [`來源：${t.src}`];
  if (t.text) lines.push(t.text);
  else if (_hlFinite(t.num) && _hlFinite(t.den)) lines.push(`${_hlFmtMoney(t.num)} ÷ ${_hlFmtMoney(t.den)}`);
  return lines.join('\n');
}
// 子指標門檻的校準狀態（目前只有動銷率依類型）：few＝樣本少、門檻用最小間距；uncal＝還沒有實測資料、仍是起始值
const _HL_FLAG_TEXT = { few: '樣本少', uncal: '待校準' };
function _hlFlagInfo(s) {
  if (s.flag === 'few') return `樣本少：校準時這個類型只有 ${s.flagN || '不到 ' + HEALTH_CALIB.minN} 筆資料，門檻先用最小間距 ${Math.round((HEALTH_CALIB.gaps[s.key] || 0.08) * 100)}pp，資料累積後再重定。`;
  if (s.flag === 'uncal') return '待校準：這個類型還沒有實測資料，門檻仍是起始值。';
  return '';
}
// 卡片子指標 ⓘ 第一行的白話（20 字內）；公式、來源等放「看算法」
const HL_SUB_SHORT = {
  pureRate: '每 100 元營收最後留下多少錢', grossRate: '只扣商品成本後剩多少',
  purePp: '近 2 個月純利率跟前 2 個月比', revGrowth: '近 2 個月營收跟前 2 個月比',
  adsPct: '每 100 元營收花多少在廣告', adsQualified: '廣告費花在夠賺商品上的比例', adsLoss: '廣告把商品從賺變賠的比例',
  sellThrough: '在架商品這個月有賣出的比例', lossShare: '賠錢商品賣出的營收占多少', lowShare: '有賺但賺很少的商品占多少',
  longLoss: '連續兩個月賠錢的商品比例', sellThroughPage: '每個商品頁分開算的動銷率', deadDupPages: '重複商品頁裡沒賣出的頁數',
};
// 卡片子指標表（2026-11-03）：只列「有分數」的子指標，欄位＝子指標｜本月｜滿分標準｜得分｜ⓘ（拿掉零分線）。
//   成長兩項的「本月」寫「前期 → 近期」，滿分標準換算成近期要到多少（ends＝_hlGrowthEnds；拿不到就退回原始值與門檻）。
function _hlSubRowHtml(s, uncal, ends) {
  const unit = s.unit;
  const more = [`公式：${s.formula}`, s.desc ? `意思：${s.desc}` : '', _hlTraceText(s), s.note,
    uncal ? '門檻是起始值，待回測校準。' : '', _hlFlagInfo(s)].filter(Boolean).join('\n');
  const dir = s.zero > s.full ? '≤' : '≥';
  let now = _hlFmtRaw(s.raw, unit), goal = `${dir} ${unit === 'pct' ? _hlPctTrim(s.full) : _hlFmtRaw(s.full, unit)}`;
  if (s.key === 'purePp' && ends) { now = `${_hlFmtPct(ends.priorRate)} → ${_hlFmtPct(ends.recentRate)}`; goal = `≥ ${_hlFmtPct(ends.priorRate + s.full)}`; }
  if (s.key === 'revGrowth' && ends) { now = `${_hlFmtMoney(ends.priorRev)} → ${_hlFmtMoney(ends.recentRev)}`; goal = `≥ ${_hlFmtMoney(ends.priorRev * (1 + s.full))}`; }
  const name = `${escapeHtml(s.label)}<span class="hl-w">${Math.round(s.w * 100)}%</span>${s.flag ? `<span class="hl-uncal">${_HL_FLAG_TEXT[s.flag] || ''}</span>` : ''}`;
  return `<tr><td>${name}</td><td class="hl-num">${escapeHtml(now)}</td><td class="hl-num hl-lim">${escapeHtml(goal)}</td>
      <td class="hl-num"><span class="hl-sscore hl-l-${_hlLight(s.score)}">${_hlFmtScore(s.score)}</span></td>
      <td class="hl-c-info">${_hlInfoHtml(HL_SUB_SHORT[s.key] || s.desc || s.label, more)}</td></tr>`;
}
// 「未計分」那一行的附屬項目：跟主指標是同一件事的另一種算法，同一個指標不出現兩次（2026-11-03）。
//   主指標本身也沒有數字（例：蝦皮動銷率「尚未上傳」）⇒ 附屬項目不列；主指標有數字 ⇒ 用一般人看得懂的名稱列出。
const HL_FOOT_CHILD = { sellThroughPage: 'sellThrough', deadDupPages: 'sellThrough' };
const HL_FOOT_LABEL = { sellThroughPage: '動銷率（以商品頁計）', deadDupPages: '沒賣出的重複商品頁' };
// 沒有分數的子指標（只供參考、尚未上傳、不適用…）不各佔一列，收成面向最下面一行小字；滑鼠移上去看原因
function _hlDimFootHtml(d) {
  const by = k => d.subs.find(s => s.key === k);
  const items = d.subs.filter(s => s.scored === false || s.status !== 'ok' || !_hlFinite(s.score)).filter(s => {
    const p = HL_FOOT_CHILD[s.key] && by(HL_FOOT_CHILD[s.key]);
    return !(p && (p.status !== 'ok' || s.status !== 'ok'));
  }).map(s => {
    const what = s.status !== 'ok' ? (_HL_STATUS_TEXT[s.status] || s.status)
      : '只供參考';
    const val = s.status === 'ok' && _hlFinite(s.raw) ? ' ' + _hlFmtRaw(s.raw, s.unit) : '';
    const tip = s.status !== 'ok' ? s.reason : (s.why || s.desc || '');
    return `<span class="hl-dim-foot-item"${tip ? ` title="${escapeHtml(tip)}"` : ''}>${escapeHtml((HL_FOOT_LABEL[s.key] || s.label) + val)}（${escapeHtml(what)}）</span>`;
  });
  return items.length ? `<div class="hl-dim-foot">未計分：${items.join('、')}</div>` : '';
}
function _hlDimHtml(d, ends) {
  const head = d.status === 'ok'
    ? `<progress class="hl-bar hl-bar-${_hlLight(d.score)}" max="100" value="${Math.max(0, Math.min(100, d.score)).toFixed(1)}"></progress><span class="hl-dim-score">${_hlFmtScore(d.score)}</span>`
    : `<span class="hl-dim-off">${escapeHtml(d.reason)}</span>`;
  // 塊 B 的面向（廣告效率、商品結構）門檻還是起始值：面向標題旁標「起始值・待回測校準」，子指標 ⓘ 也寫
  const uncal = !!(HEALTH_RULES[d.key] && HEALTH_RULES[d.key].calibrated === false);
  const scored = d.subs.filter(s => s.scored !== false && s.status === 'ok' && _hlFinite(s.score));
  // 成長面向比的是兩段合計，欄名直接寫期間（不叫「本月」），免得跟總覽的單月數字混在一起
  const n = HEALTH_RULES.growth.window;
  const cols = d.key === 'growth' ? [`前 ${n} 月 → 近 ${n} 月`, `近 ${n} 月滿分標準`] : ['本月', '滿分標準'];
  const subs = scored.length
    ? `<table class="hl-sub"><thead><tr><th>子指標</th><th class="hl-num">${escapeHtml(cols[0])}</th><th class="hl-num hl-lim">${escapeHtml(cols[1])}</th><th class="hl-num">得分</th><th class="hl-c-info"></th></tr></thead>
        <tbody>${scored.map(s => _hlSubRowHtml(s, uncal, d.key === 'growth' ? ends : null)).join('')}</tbody></table>${_hlDimFootHtml(d)}`
    : '';
  return `<div class="hl-dim${d.status === 'ok' ? '' : ' hl-dim-na'}">
      <div class="hl-dim-hd"><span class="hl-dim-name">${escapeHtml(d.label)}</span><span class="hl-w">權重 ${d.w}</span>${head}${uncal && d.status !== 'na' ? '<span class="hl-uncal">起始值・待回測校準</span>' : ''}</div>
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
  const ch = HEALTH_CHANNELS.find(c => c.id === r.id);
  if (ch) badges.push(..._hlProdBadges(ch, r.month, snap));
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
      ${_hlProdBarHtml(ch, r.month, snap)}
      ${_hlDragHtml(ch, r.month, snap)}
      <details class="hl-score-more"${_hlState.scoreOpen ? ' open' : ''}><summary>看評分細節</summary>
        ${r.dims.map(d => _hlDimHtml(d, d.key === 'growth' ? _hlGrowthEnds(ch, r.month, snap) : null)).join('')}
      </details>
      <div class="hl-trend-hd">近 12 個月分數走勢（當場重算；空心點＝參考分）</div>
      <div class="hl-trend"><canvas id="hl-trend" aria-label="${escapeHtml(r.label)} 近 12 個月分數走勢" role="img"></canvas></div>
      ${r.next.length ? `<div class="hl-next">之後加入：${escapeHtml(r.next.join('、'))}</div>` : ''}
    </div>`;
}
// 商品層資料的狀態列：資料時間標章＋（還沒載／逾時時）「載入商品資料」按鈕。沒有商品層的通路回空字串。
function _hlProdBadges(ch, month, snap) {
  const p = _hlProdOf(ch, month, snap);
  if (p.state === 'na') return [];
  if (p.state === 'notLoaded') return ['<span class="hl-badge">商品資料：尚未載入</span>'];
  if (p.state === 'loading') return ['<span class="hl-badge">商品資料：載入中…</span>'];
  if (p.state === 'timeout') return ['<span class="hl-badge hl-badge-warn">商品資料：讀不到（逾時）</span>'];
  const s = p.snap, out = [];
  if (s.status === 'none') return [`<span class="hl-badge hl-badge-warn">商品資料：${escapeHtml(_hlYmLabel(month))} 沒有</span>`];
  if (ch.prod.platform === 'shopee') {
    const hv = (s.halves || []).map(h => (h === 'full' ? '整月' : h === 'first' ? '上半月' : '下半月')).join('＋');
    out.push(`<span class="hl-badge hl-badge-ok">淨利表 ${escapeHtml(hv)}${_hlFinite(s.asOf) ? ' · 更新 ' + escapeHtml(_hlFmtTime(s.asOf)) : ''}</span>`);
  } else if (ch.prod.platform === 'momo') {
    out.push(s.recon ? '<span class="hl-badge hl-badge-ok">MOMO 對帳單 ✓</span>' : '<span class="hl-badge hl-badge-warn">MOMO 對帳單未上傳（營收、淨利是估算）</span>');
  } else if (ch.prod.platform === 'pchome') {
    out.push(`<span class="hl-badge">PChome 商品清單最新匯出 ${escapeHtml(s.latestExport || '—')}</span>`);
  }
  return out;
}
function _hlProdBarHtml(ch, month, snap) {
  if (!ch || !ch.prod) return '';
  const st = (snap.prodState || {})[ch.prod.platform] || 'idle';
  if (st !== 'idle' && st !== 'timeout') return '';
  const label = st === 'timeout' ? '重新載入商品資料' : '載入商品資料';
  const why = st === 'timeout' ? HL_TIMEOUT_MSG + '。' : (_hlIsNarrow() ? '手機上不會自動載入商品層資料（資料量大）。' : '商品層資料還沒開始載入。');
  return `<div class="hl-prodbar"><span>${escapeHtml(why)}廣告效率、商品結構、拖累商品要用到。</span>
      <button type="button" class="btn-ghost hl-load-btn" data-hl-act="loadprod" data-hl-platform="${escapeHtml(ch.prod.platform)}">${label}</button></div>`;
}
// 要處理的商品（塊 3c）＋連續零動銷（另列、不算金額）。點品號跳淨利表該通路該月、搜尋那個商品。
//   用「全部」拖累商品（_HL_DRAG_ALL，跟卡片上的待處理數同一份）：先列待處理（照拖累金額排），預設前 topN 個、超過時按鈕顯示全部；
//   已調整的排在所有待處理之後、淡化，平常收成一行「已調整 N 個」。判斷、排序、金額都是 healthDragList 原本的。
function _hlDragHtml(ch, month, snap) {
  if (!ch || !ch.prod) return '';
  const D = healthDragList(ch, month, snap, _HL_DRAG_ALL);
  // MOMO：純利欄＝MOMO 總表「淨利貢獻」，標題旁 ⓘ 說明口徑
  const ps = ch.prod.platform === 'momo' ? _hlProdOf(ch, month, snap) : null;
  const mInfo = ps && ps.state === 'ready' && ps.snap
    ? _hlInfoHtml('純利＝MOMO 總表的「淨利貢獻」', _hlMomoProfitNote(ch.prod.shop, ps.snap.freightMode), { cls: 'hl-info-inline', aria: '純利口徑' }) : '';
  const hd = `<div class="hl-drag-hd">要處理的商品${mInfo}<span class="hl-w">依影響金額排序，點品號跳到淨利表</span></div>`;
  if (D.status !== 'ok') return `<div class="hl-drag">${hd}<div class="hl-drag-off">${escapeHtml(D.reason)}</div></div>`;
  const shopee = ch.prod.platform === 'shopee';
  const tag = c => { const x = HEALTH_DRAG_REASONS[c] || { icon: '', label: c, desc: '' };
    return `<span class="hl-reason-tag" title="${escapeHtml(x.desc)}">${x.icon} ${escapeHtml(x.label)}</span>`; };
  const jump = it => `data-hl-jump-plat="${escapeHtml(ch.prod.platform)}" data-hl-jump-shop="${escapeHtml(ch.prod.platform === 'pchome' ? (it.sub || '轉單') : ch.prod.shop)}" data-hl-jump-month="${escapeHtml(month)}" data-hl-jump-code="${escapeHtml(it.key)}"`;
  const adj = d => (d ? `<span class="hl-adj">✓ ${escapeHtml(d.slice(5))} 已調整</span>` : '');
  const topN = HEALTH_RULES.drag.topN;
  const todo = D.items.filter(it => !it.adjusted), done = D.items.filter(it => it.adjusted);   // filter 不改順序：各自仍照拖累金額由大到小
  const showAll = _hlState.todoAll === ch.id;
  const row = it => `<tr${it.adjusted ? ' class="hl-drag-done"' : ''}>
      <td><button type="button" class="hl-drag-jump" ${jump(it)} title="到淨利表 ${escapeHtml(_hlYmLabel(month))} 搜尋這個商品">${escapeHtml(it.key)} ↗</button>${it.sub ? `<span class="hl-w">${escapeHtml(it.sub)}</span>` : ''}</td>
      <td class="hl-drag-name">${escapeHtml(it.name)}</td>
      <td>${it.reasons.map(tag).join('')}</td>
      <td class="hl-num hl-drag-opt">${escapeHtml(_hlFmtMoney(it.rev))}</td>
      <td class="hl-num hl-drag-opt">${escapeHtml(_hlFmtMoney(it.profit))}</td>
      ${shopee ? `<td class="hl-num hl-drag-opt">${escapeHtml(_hlFmtMoney(it.adsFee))}</td>` : ''}
      <td class="hl-num"><b>${escapeHtml(_hlFmtMoney(it.amount))}</b></td>
      <td>${adj(it.adjusted)}</td></tr>`;
  const table = list => `<div class="hl-drag-wrap"><table class="hl-sub hl-drag-table"><thead><tr><th>品號</th><th>商品</th><th>原因</th><th class="hl-num hl-drag-opt">營收</th><th class="hl-num hl-drag-opt">純利</th>${shopee ? '<th class="hl-num hl-drag-opt">廣告費</th>' : ''}<th class="hl-num">拖累金額</th><th>調整</th></tr></thead><tbody>${list.map(row).join('')}</tbody></table></div>`;
  const todoHtml = todo.length
    ? table(showAll ? todo : todo.slice(0, topN))
      + (todo.length > topN ? `<button type="button" class="btn-ghost hl-drag-all" data-hl-act="todoall" data-hl-ch="${escapeHtml(ch.id)}" aria-expanded="${showAll ? 'true' : 'false'}">${showAll ? `只顯示前 ${topN} 個` : `顯示全部待處理（${todo.length} 個）`}</button>` : '')
    : `<div class="hl-drag-off">${D.items.length ? '這個月要處理的商品都有調整紀錄了。' : '這個月沒有要處理的商品。'}</div>`;
  const doneHtml = done.length
    ? `<details class="hl-drag-donebox"${_hlState.doneOpen === ch.id ? ' open' : ''} data-hl-done="${escapeHtml(ch.id)}"><summary>已調整 ${done.length} 個</summary>${table(done)}</details>` : '';
  const prevNote = D.prevMissing ? `<div class="hl-w hl-drag-more">上個月沒有商品資料，「長期虧損」${shopee ? '' : '、「連續零動銷」'}這次判斷不了。</div>` : '';
  // 連續零動銷：跟以前一樣最多列 topN 個，其餘寫「…另有 N 個」
  const infoList = D.info.slice(0, topN);
  const info = D.infoCount
    ? `<details class="hl-drag-info"><summary>${tag('deadLong')} ${D.infoCount} 個（不算金額）</summary><ul>${infoList.map(it => `<li><button type="button" class="hl-drag-jump" ${jump(it)}>${escapeHtml(it.key)} ↗</button> ${escapeHtml(it.name)}</li>`).join('')}${D.infoCount > infoList.length ? `<li class="hl-w">…另有 ${D.infoCount - infoList.length} 個</li>` : ''}</ul></details>`
    : '';
  return `<div class="hl-drag">${hd}${todoHtml}${doneHtml}${prevNote}${info}</div>`;
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
    // 面向線條的顏色依序取 :root 變數（不寫死色碼）；總分用主色
    const DIM_COLORS = ['--success', '--warn', '--info', '--text-muted'];
    const series = [{ k: null, label: '總分', color: _hlCssVar('--primary') }]
      .concat(HEALTH_RULES.dims.filter(d => d.impl).map((d, i) => ({ k: d.key, label: d.label, color: _hlCssVar(DIM_COLORS[i % DIM_COLORS.length]) })));
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
// 頁頂「KPI 尚未填完」：平常收成一行「⚠ N 個通路 KPI 尚未填完 ▸」，點了才展開清單（清單裡的連結照舊跳 KPI 月結表）。
//   展開狀態只放記憶體（_hlState.pendingOpen），整頁重畫不會自己收起來。
function _hlPendingHtml(items) {
  if (!items.length) return '';
  const n = new Set(items.map(it => it.id)).size, open = !!_hlState.pendingOpen;
  const head = `<button type="button" class="hl-pending-toggle" data-hl-act="pending" aria-expanded="${open ? 'true' : 'false'}">⚠ ${n} 個通路 KPI 尚未填完 <span class="hl-pending-caret">${open ? '▾' : '▸'}</span></button>`;
  if (!open) return `<div class="hl-pending hl-pending-closed" role="status">${head}</div>`;
  const link = _hlCanGoKpi();
  const one = it => {
    const txt = `${it.label} ${_hlRangeLabel(it.from, it.to)}（${it.filled}/${it.total}）`;
    return link
      ? `<button type="button" class="hl-pending-item" data-hl-kpi="${escapeHtml(it.from)}" title="到 KPI 月結表 ${escapeHtml(_hlYmLabel(it.from))}">${escapeHtml(txt)}</button>`
      : `<span class="hl-pending-item hl-pending-text">${escapeHtml(txt)}</span>`;
  };
  return `<div class="hl-pending" role="status">${head}<div class="hl-pending-list">${items.map(one).join('<span class="hl-pending-sep">、</span>')}</div></div>`;
}

// 頁頂「商品層資料」狀態：三個平台都載好、也算完就不顯示。
function _hlProdNoteHtml(snap) {
  const P = { shopee: '蝦皮', momo: 'MOMO', pchome: 'PChome' };
  const st = snap.prodState || {};
  const txt = { idle: '尚未載入', loading: '載入中…', timeout: '載入逾時', ready: '✓' };
  if (Object.keys(P).every(p => st[p] === 'ready') && !_hlProd.running) return '';
  const w = snap.prodWaitSec || {};
  // 正在載入的平台：已等 60 秒以上就寫「仍在載入（已等 N 秒）」；排隊還沒開始的（_hlLoading 沒有）只寫「排隊中」
  const one = p => {
    if (st[p] !== 'loading') return `${P[p]} ${txt[st[p] || 'idle']}`;
    if (!(p in w) || !_hlLoading[p]) return `${P[p]} 排隊中`;
    return w[p] >= HL_WAIT_SLOW ? `${P[p]} 仍在載入（已等 ${Math.floor(w[p])} 秒）` : `${P[p]} 載入中…`;
  };
  const parts = Object.keys(P).map(one);
  const busy = _hlProd.running ? '；商品層分數計算中…' : '';
  const how = _hlIsNarrow() ? '手機請展開卡片按「載入商品資料」' : '電腦會在背景依序自動載入，可能要一到兩分鐘，資料一到會自動重算';
  const slow = Object.keys(P).some(p => st[p] === 'loading' && (w[p] || 0) >= HL_WAIT_HINT)
    ? '已經等超過 5 分鐘的平台：請先進淨利表點一下那個平台讓資料載入，再回來（這裡會繼續等，到了自動重算）。' : '';
  const to = (Object.keys(P).some(p => st[p] === 'timeout') ? '逾時的平台請先進淨利表點一下那個平台，再回來按「↻ 重新計算」。' : '') + slow;
  return `<div class="hl-prodnote">商品層資料：${escapeHtml(parts.join('、'))}${busy}。${how}；還沒載好的蝦皮、MOMO、PChome 通路先不給總分。${to}</div>`;
}

function _hlOnClick(e) {
  if (App.route !== 'health') return;
  const act = e.target.closest && e.target.closest('[data-hl-act]');
  if (act) {
    if (act.dataset.hlAct === 'refresh') { _hlProdReset(); App.render(); }
    else if (act.dataset.hlAct === 'pending') { _hlState.pendingOpen = !_hlState.pendingOpen; App.render(); }
    else if (act.dataset.hlAct === 'unrated') {
      // 收起清單時，如果正在看清單裡某個通路的細項，也一起收起來
      const shown = act.getAttribute && act.getAttribute('aria-expanded') === 'true';
      _hlState.unratedOpen = !shown;
      if (shown && act.dataset.hlDet && _hlState.open === act.dataset.hlDet) _hlState.open = null;
      App.render();
    }
    else if (act.dataset.hlAct === 'todoall' && act.dataset.hlCh) { _hlState.todoAll = _hlState.todoAll === act.dataset.hlCh ? null : act.dataset.hlCh; App.render(); }
    else if (act.dataset.hlAct === 'guide' && typeof App.openModal === 'function') App.openModal({ title: '📖 通路健檢 · 怎麼看這頁', width: '640px', hideFooter: true, bodyHtml: _hlGuideModalHtml() });
    else if (act.dataset.hlAct === 'loadprod' && act.dataset.hlPlatform) {
      if (_hlProd.state[act.dataset.hlPlatform] === 'timeout') _hlProd.state[act.dataset.hlPlatform] = 'idle';
      _hlEnsurePlatform(act.dataset.hlPlatform); App.render();
    }
    return;
  }
  const kpi = e.target.closest && e.target.closest('[data-hl-kpi]');
  if (kpi) { _hlGoKpi(kpi.dataset.hlKpi); return; }
  const todo = e.target.closest && e.target.closest('[data-hl-todo]');
  if (todo) { _hlOpenTodo(todo.dataset.hlTodo); return; }
  // 「看評分細節」：記住展開與否，整頁重畫（資料更新）時不會自己收起來
  if (e.target.closest && e.target.closest('details.hl-score-more > summary')) { _hlState.scoreOpen = !_hlState.scoreOpen; return; }
  // 「已調整 N 個」：記住哪個通路展開了（重畫時不會自己收起來）
  const doneSum = e.target.closest && e.target.closest('details.hl-drag-donebox > summary');
  if (doneSum) { const id = doneSum.parentElement && doneSum.parentElement.dataset.hlDone; _hlState.doneOpen = _hlState.doneOpen === id ? null : id; return; }
  const jump = e.target.closest && e.target.closest('[data-hl-jump-plat]');
  if (jump) { _hlGoProfit(jump.dataset); return; }
  if (e.target.closest('details.hl-info') || e.target.closest('details.hl-drag-info')) return;   // 點 ⓘ／展開清單只展開，不收合整列
  const row = e.target.closest && e.target.closest('[data-hl-row]');
  if (!row) return;
  _hlToggle(row.dataset.hlRow);
}
// 展開／收合一張卡片。商品層載入跟展開無關（桌機開頁就背景載；手機按卡片裡的按鈕），分數也不因展開而變。
function _hlToggle(id) {
  _hlState.open = _hlState.open === id ? null : id;
  App.render();
}
// 拖累清單 → 淨利表（profit.js __profitOpenAt：切通路／整月、搜尋那個商品；不寫持久狀態）
function _hlGoProfit(d) {
  if (typeof window.__profitOpenAt !== 'function') { if (typeof window.showToast === 'function') window.showToast('淨利表還沒載入，請重新整理頁面', 'error'); return; }
  try { window.__profitOpenAt({ platform: d.hlJumpPlat, shop: d.hlJumpShop, month: d.hlJumpMonth, code: d.hlJumpCode }); }
  catch (e) { console.error('[health] 跳淨利表失敗', e); }
}
// 卡片上「待處理商品」：展開那個通路的細項（已展開就不收合），重畫後捲到「要處理的商品」清單
function _hlOpenTodo(id) {
  _hlState.open = id;
  _hlState.scrollTo = 'drag';
  App.render();
}
//   展開時會補算走勢月份，算的期間頁頂多一列「商品層分數計算中…」、算完又消失，內容會上下移；
//   所以算完之前每次重畫都再對齊一次，算完才清掉（期間只有一兩秒）。
function _hlScrollPending() {
  if (_hlState.scrollTo !== 'drag') return;
  if (!_hlProd.running) _hlState.scrollTo = null;
  const el = document.querySelector('.hl-tile-detail .hl-drag');
  // 用直接跳（不用 smooth）：重畫會換掉整頁 HTML，平滑捲動做到一半會被打斷
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
}
function _hlOnKeydown(e) {
  if (App.route !== 'health' || (e.key !== 'Enter' && e.key !== ' ')) return;
  const todo = e.target.closest && e.target.closest('[data-hl-todo]');
  if (todo && e.target === todo) { e.preventDefault(); _hlOpenTodo(todo.dataset.hlTodo); return; }
  const row = e.target.closest && e.target.closest('[data-hl-row]');
  if (!row || e.target !== row) return;
  e.preventDefault();
  _hlToggle(row.dataset.hlRow);
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
        <div><h2>通路健檢</h2>
        <p>每個通路每月的體檢分數，點通路可看細項。</p></div>
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
    _hlAutoLoad();   // 電腦：背景依序載入三個平台的商品層（只排一次）；放在 _hlCollect 前面，第一個畫面就是「載入中」不是「未載入」
    const _t0 = _hlNow();
    const snap = _hlCollect();
    const _tKpi = _hlNow() - _t0;
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
    _hlWantProd(month, _hlState.open);   // 已載入的平台：補排這次要用到的商品層快照（算完會再重畫一次）
    _hlLast = { month, snap };
    const results = HEALTH_CHANNELS.map(ch => computeChannelHealth(ch, month, snap));
    const prevM = _hlAddMonth(month, -1);
    const prev = {};
    if (prevM >= HEALTH_RULES.firstMonth) HEALTH_CHANNELS.forEach(ch => { prev[ch.id] = computeChannelHealth(ch, prevM, snap); });
    const rank = _hlRank(results);
    const sorted = _hlSortResults(results);
    const _tScore = _hlNow() - _t0 - _tKpi;
    // 卡片牆（塊 3）：依通路類型分組（順序同 _hlSortResults）；展開的細項放在該組卡片下方、全寬
    //   塊 3b：每組是一個帶小標題的區塊，寬度＝卡片數（最多 5 張）× 卡寬，區塊之間依視窗寬度自動並排（只有 1、2 張的小組不再各佔一整排）；
    //   展開的細項是寬 100% 的項目，排在那一組所在那一排的下面。
    const groups = [];
    sorted.filter(_hlTileRated).forEach(r => {
      let g = groups[groups.length - 1];
      if (!g || g.type !== r.type) groups.push(g = { type: r.type, items: [] });
      g.items.push(r);
    });
    const wall = groups.map(g => {
      const tl = (HEALTH_RULES.types[g.type] || {}).label || g.type;
      const det = g.items.find(r => r.id === _hlState.open);
      return `<section class="hl-group hl-group-n${Math.min(g.items.length, 5)}" aria-label="${escapeHtml(tl)}"><div class="hl-group-hd">${escapeHtml(tl)}</div>
        <div class="hl-tiles">${g.items.map(r => _hlTileHtml(r, prev[r.id], rank[r.id], _hlState.open === r.id, snap)).join('')}</div></section>
        ${det ? `<div class="hl-tile-detail">${_hlCardHtml(det, snap)}</div>` : ''}`;
    }).join('');
    const unrated = _hlUnratedHtml(sorted.filter(r => !_hlTileRated(r)), prev, _hlState.open, snap);
    const mo = snap.months && snap.months[month];
    try { console.info(`[health] 整頁重算 ${Math.round(_hlNow() - _t0)} ms（KPI 快照 ${Math.round(_tKpi)} ms、評分 ${Math.round(_tScore)} ms）`); } catch {}
    return `<div class="hl-page">
        ${header}
        ${_hlMock ? `<div class="hl-mock-banner">模擬模式：假資料只在本機記憶體（__healthMock(false) 關閉）</div>` : ''}
        ${staleNote}
        ${_hlPendingHtml(healthPendingKpi(snap, month))}
        ${_hlProdNoteHtml(snap)}
        <div class="hl-toolbar">
          <label class="hl-month">評分月份
            <select data-hl-month>${_hlMonthOptions(month)}</select>
          </label>
          <span class="hl-chip-ver">規則 ${escapeHtml(HEALTH_RULES.version)}</span>
          ${mo && _hlFinite(mo.asOf) ? `<span class="hl-asof">KPI 最後更新 ${escapeHtml(_hlFmtTime(mo.asOf))}</span>` : ''}
          <span class="filter-spacer"></span>
          <button type="button" class="btn-ghost" data-hl-act="refresh">↻ 重新計算</button>
        </div>
        <div class="hl-wall">${wall}</div>
        ${unrated}

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
    _hlScrollPending();
  },
});

/* ---------- Console：唯讀回測 ---------- */
//   opts：{ from, to, products:true（也算商品層面向；只算「已經載入」的平台，其他平台當成只算 KPI）, adsRules:true（蝦皮廣告致虧三條候選規則逐通路逐月比較） }
//   沒有 products ⇒ 跟塊 A 一樣只算 KPI（商品層面向「不適用」，不會因為商品層沒載入而沒有總分）。
//   商品層要先載入：電腦打開健檢頁會自動依序載入；或在 Console 先跑 await __healthLoadProducts('shopee')（以及 'momo'、'pchome'）。
//   商品層在這裡是同步逐月算（不走畫面的排隊），MOMO 5 個通路 × 10 個月可能要幾秒，跑完才印。
function _hlBacktestSnap(o) {
  const snap = _hlCollect();
  if (!snap.ready) console.warn('[health] 雲端 KPI 還沒就緒，回測用的是本機鏡像');
  const to = _hlIsYm(o.to) ? o.to : _hlAddMonth(_hlTodayYm(), -1);
  const from = _hlIsYm(o.from) ? o.from : HEALTH_RULES.firstMonth;
  const months = _hlMonthRange(from, to);
  if (!(o.products || o.adsRules)) { delete snap.prod; delete snap.prodState; return { snap, months, from, to, need: [] }; }
  const src = _hlProdSource(), prod = {};
  const ready = _hlMock ? { shopee: 'ready', momo: 'ready', pchome: 'ready' } : Object.assign({}, _hlProd.state);
  if (!_hlMock && !window.__healthLoadProducts) console.warn('[health] 讀不到商品層轉接（profit.js 版本不一致）');
  const need = _HL_PLATFORMS.filter(p => ready[p] === 'ready');
  const miss = _HL_PLATFORMS.filter(p => ready[p] !== 'ready');
  if (miss.length) console.warn(`[health] 這些平台的商品層還沒載入，回測當成只算 KPI：${miss.join('、')}（電腦打開健檢頁會自動載入；或先跑 await __healthLoadProducts('${miss[0]}')）`);
  HEALTH_CHANNELS.forEach(ch => {
    if (!ch.prod || need.indexOf(ch.prod.platform) < 0) return;
    _hlMonthRange(_hlAddMonth(from, -1), to).forEach(m => {
      const k = _hlProdKey(ch.prod.platform, ch.prod.shop, m);
      try { prod[k] = m < HEALTH_RULES.firstMonth ? { status: 'none', rows: [], lastAdjust: {} } : _hlProdNormalize(src.snapshot(ch.prod.platform, ch.prod.shop, m)); }
      catch (e) { prod[k] = _hlProdNormalize({ error: String((e && e.message) || e) }); }
    });
  });
  snap.prod = prod;
  snap.prodState = {};
  _HL_PLATFORMS.forEach(p => { snap.prodState[p] = need.indexOf(p) >= 0 ? 'ready' : 'off'; });
  return { snap, months, from, to, need };
}
window.__healthBacktest = function (opts) {
  const o = opts || {};
  if (!_hlMock && !window.__profitReady) { console.warn('[health] profit.js 還沒載入：先進「通路健檢」頁或 KPI 頁再跑'); return null; }
  const { snap, months, from, to, need } = _hlBacktestSnap(o);
  const res = healthBacktest(snap, months);
  console.log(`[health] 回測 ${from}～${to}，規則 ${HEALTH_RULES.version}（只讀，不寫任何資料）${need.length ? '，含商品層：' + need.join('、') : '，只算 KPI'}`);
  console.table(res.rows);
  console.log('[health] 各類型子指標百分位（業外、官網不列入）。校準規則見 docs/plan-channel-health.md §2-7-1、§2-7-2');
  console.table(res.pct);
  if (o.adsRules) {
    const rows = [];
    HEALTH_CHANNELS.filter(ch => ch.prod && ch.prod.platform === 'shopee').forEach(ch => months.forEach(m => {
      const s = snap.prod && snap.prod[_hlProdKey('shopee', ch.prod.shop, m)];
      if (!s || s.status !== 'ok') { rows.push({ 通路: ch.label, 月: m, 狀態: s ? s.status : '未載入' }); return; }
      const c = healthAdsRuleCompare(s.rows), f = x => (!x ? '報表沒有 ROI（不比）' : `${x.n} 個／${x.share == null ? '—' : _hlFmtPct(x.share)}`);
      rows.push({ 通路: ch.label, 月: m, 有廣告費商品: c.n, 廣告費: Math.round(c.spend), 'a 廣告致虧（採用）': f(c.a), 'b ROI 低於損益兩平': f(c.b), 'c 有花費沒成交': f(c.c) });
    }));
    console.log('[health] 廣告致虧候選規則比較（花費占比；§2-4 挑選標準：歷史中位數落在 5%～25%）。報表沒有 ROI 的月份（例：2026-01、02）(b)(c) 不比。');
    console.table(rows);
    res.adsRules = rows;
  }
  return res;
};
// 塊 B 門檻校準提案（只讀，方案 §2-7-2）：用已載入的商品層跑回測，依 HEALTH_CALIB 算每個「類型 × 子指標」的建議零分線／滿分線。
//   印兩張表（提案、現行 vs 建議中位分），最後一段 Markdown 可以整段複製貼回。只是提案：不會改 HEALTH_RULES。
window.__healthCalibrate = function (opts) {
  const o = Object.assign({ products: true }, opts || {});
  if (!_hlMock && !window.__profitReady) { console.warn('[health] profit.js 還沒載入：先進「通路健檢」頁再跑'); return null; }
  const { snap, months, from, to, need } = _hlBacktestSnap(o);
  if (!need.length) { console.warn('[health] 沒有任何平台的商品層資料，算不出塊 B 的校準'); return null; }
  const bt = healthBacktest(snap, months);
  const table = healthCalibrate(bt.vals, o);
  const show = table.map(r => { const x = Object.assign({}, r); Object.keys(x).forEach(k => { if (k[0] === '_') delete x[k]; }); return x; });
  console.log(`[health] 塊 B 門檻校準提案 ${from}～${to}（含商品層：${need.join('、')}；只讀，不會改規則）`);
  console.table(show);
  const ks = show.length ? Object.keys(show[0]) : [];
  const md = ['| ' + ks.join(' | ') + ' |', '|' + ks.map(() => '---').join('|') + '|'].concat(show.map(r => '| ' + ks.map(k => String(r[k] == null ? '' : r[k])).join(' | ') + ' |')).join('\n');
  console.log(md);
  return { table, md, months, need };
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
// 商品層假資料（形狀＝profit.js __healthProductSnapshot 的原始輸出）。demo：蝦皮 2026-03 起、MOMO 2026-03 起、PChome 2026-09 起有資料，
//   涵蓋多頁公司商品、格式不符的編號、缺成本、廣告致虧、連續零動銷、已調整；empty：全部沒有資料。載入假裝要 0.3 秒。
let _hlMockKind = null;
function _hlMockProdSnapshot(p, s, m) {
  const out = { platform: p, shop: s, month: m, lastAdjust: {} };
  const mi = (+m.slice(0, 4) - 2026) * 12 + (+m.slice(5, 7)), si = s.length;
  const on = _hlMockKind === 'demo' && m >= (p === 'pchome' ? '2026-09' : '2026-03');
  if (p === 'shopee') {
    out.halves = on ? [{ half: 'full', ts: Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 1, 2, 0), rows: Array.from({ length: 40 }, (_, i) => {
      const qty = (i + mi) % 11 === 0 ? 0 : 3 + ((i * 7 + si) % 20);
      const rev = qty ? 2000 + ((i * 7919 + mi * 131 + si * 17) % 30000) : 0;
      const gRate = i % 9 === 0 ? 0.2 : i % 6 === 0 ? 0.3 : 0.45 + (i % 5) * 0.03;
      const adsFee = (i % 3 === 0 && qty) ? Math.round(rev * 0.12) : (i === 2 ? 800 : 0);
      const gross = Math.round(rev * gRate), platFee = Math.round(rev * 0.205), roi = adsFee ? (i % 4 === 0 ? 0 : 2 + (i % 5)) : 0;
      return { code: 'A' + (100 + i), name: '假商品 ' + (100 + i), qty, rev, gross, adsFee, platFee, pureProfit: gross - adsFee - platFee, roi, directROI: roi * 0.7, clicks: adsFee ? 50 + i * 3 : 0 };
    }) }] : [];
    if (on) out.lastAdjust = { A106: m.replace('-', '/') + '/15', A109: '2026/01/05' };
  } else if (p === 'momo') {
    out.rows = Array.from({ length: 60 }, (_, i) => {
      const sold = on && (i + mi) % 4 !== 0, rev = sold ? 1500 + ((i * 373 + si * 11) % 9000) : 0;
      return { key: '1' + String(100000 + i * 37 + si), origin: i % 19 === 0 ? 'TEMP' + i : `H${300 + Math.floor(i / 2)}-0${(i % 2) + 1}`, name: 'MOMO 假商品 ' + i,
        rev, profit: Math.round(rev * (((i % 10) - 2) / 20)), qty: sold ? 1 + (i % 6) : 0, sold, active: i % 13 !== 0, costKnown: i % 17 !== 0 };
    });
    out.recon = on && m <= '2026-09';
    if (on) out.lastAdjust = { [out.rows[2].key]: m.replace('-', '/') + '/20' };
  } else if (p === 'pchome') {
    out.latestExport = '2026/10/14'; out.months = on ? [m] : []; out.subTotals = {};
    out.rows = on ? Array.from({ length: 30 }, (_, i) => {
      const sold = (i + mi) % 3 !== 0, rev = sold ? 2000 + ((i * 911) % 7000) : 0, ck = i % 7 !== 0;
      return { key: `F${200 + Math.floor(i / 3)}-${10 + (i % 3)}`, sub: i % 4 === 0 ? '寄倉' : '轉單', pages: [`DGAB-${Math.floor(i / 2)}`], name: 'PChome 假商品 ' + i,
        rev, profit: ck ? Math.round(rev * (((i % 8) - 2) / 16)) : null, qty: sold ? 1 + (i % 4) : 0, sold, active: i % 11 !== 0, costKnown: ck };
    }) : [];
    ['轉單', '寄倉'].forEach(sub => { const rs = out.rows.filter(r => r.sub === sub); out.subTotals[sub] = { sold: rs.filter(r => r.sold).length, total: rs.filter(r => r.active || r.sold).length }; });
  }
  return out;
}
const _hlMockProdSource = {
  load: () => new Promise(res => setTimeout(() => res({ ready: true }), 300)),
  snapshot: _hlMockProdSnapshot,
};
window.__healthMock = function (kind) {
  if (!_hlIsLocalHost()) { console.warn('[health] 模擬模式只在 localhost 可用'); return false; }
  _hlMock = (kind === 'demo' || kind === 'empty') ? _hlMakeMock(kind) : null;
  _hlMockKind = _hlMock ? kind : null;
  _hlProd.state = {}; _hlProdReset();   // 模擬／真資料切換：商品層全部重來
  _hlState.month = null; _hlState.open = null; _hlWaitTries = 0;
  console.warn(_hlMock ? `[health] 模擬模式已開啟（${kind}）：資料只在本機記憶體` : '[health] 模擬模式已關閉，改回 KPI 月結');
  if (App.route === 'health') App.render();
  return !!_hlMock;
};
