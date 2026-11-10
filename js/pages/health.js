/* js/pages/health.js -- 通路健檢，以 Object.assign(App, ...) 合併回 App
 *   塊 A：全通路「獲利、成長」（KPI 月結）。
 *   塊 B：蝦皮「廣告效率」、蝦皮／MOMO／PChome「商品結構」（含動銷率）、拖累商品前 10 名（商品層資料，只在展開卡片時載入）。
 *
 * 方案：docs/plan-channel-health.md（§1-1／§1-2 範圍、§2 規則、§3 動銷率口徑、§4 畫面）。
 * 路由 'health'：【不是部門】（不走 office-），不碰 ec.departments / canAccessOffice / OFFICE_FEATURES；所有登入者都能看（app.js _isRouteAllowed）。
 * 看的部分只讀：不寫 Store。評分標準版本讀 app/health_rules（window.__cloudHealthRules，firebase.js；進這頁才訂閱）；這一頁唯一的寫入是評分標準設定視窗 _hlStdSave（只限管理員）。分數一律當場依「那個月適用的評分標準」（healthRulesForMonth）重算，不存檔；同樣的資料一定得到同樣的分數。
 * 資料：KPI 月結經 profit.js 的唯讀轉接 window.__healthKpiSnapshot(months)（口徑＝KPI 頁：_kpiShopCalc／_kpiRealRev／_kpiCommonColTotals）。
 *   商品層（塊 B）經 window.__healthLoadProducts(平台)（載訂閱組並等到齊）＋ window.__healthProductSnapshot(平台, 通路, 月)（同步、只讀）。
 *   profit.js 是動態載入：進頁先 await window.__ensureProfit()，載完再 render（同 daily.js / offices.js）。
 *   🔴 商品層訂閱組（約 10MB）只在「展開某平台的卡片」時才載；手機寬度（≤768px）改成卡片裡的「載入商品資料」按鈕。
 *     載入中、還沒載入一律顯示灰色「載入中／尚未載入」，不得畫成「無資料」或 0 分。
 *   商品層快照逐筆排隊算（setTimeout 分批，不卡畫面），算完才重畫一次；結果放記憶體（_hlProd.cache），不存檔。
 * 沒資料不得算成 0 分：每個子指標 / 面向都帶 status —— ok｜na（不適用）｜insufficient（資料不足）｜pending（尚未上傳）｜smallRev（營收過小）；
 *   整個通路另有 closed（已關站）。只有 ok 的才有分數、才參與加權。
 * 不加進 app.js 的 CLOUD_RENDER_ROUTES：雲端推播不重畫這頁（白名單設計）；畫面上有「↻ 重新計算」。例外：評分標準的快照到了會重畫（_hlRulesOnSnap，內容有變才畫）。
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
//   「📖 怎麼看這頁」的燈號、權重、級距、營收門檻從這張表產生（_hlGuideIntro／_hlGuideFullHtml），改這裡說明會自動跟著變。
//   v3-2026-11（塊 B）：加「廣告效率」（蝦皮）、「商品結構」（蝦皮／MOMO／PChome）。這兩個面向的門檻是方案 §2-4／§2-5／§2-6 的【起始值】，
//     calibrated:false ⇒ 畫面與說明標「起始值，待回測校準」；校準後拿掉旗標並升 version。獲利、成長的門檻不變（v2 校準值）。
//   v4-2026-11（2026-11-02 審查決定，方案 §2-5、§2-7-2）：廣告效率、商品結構用真實資料回測校準，拿掉 calibrated:false。
//     廣告佔比 18.5%→4.5%、合格率 22.5%→62.0%、致虧占比 17.0%→2.5%；虧損占比 5.5%→0.5%、長期虧損 4.0%→0.0%（全通路共用一套）；
//     低利商品營收占比改成只顯示不計分；商品結構權重 動銷率 30%／虧損 40%／長期虧損 30%；
//     動銷率依類型（__healthCalibrate 的建議值），樣本 < 6 用最小間距並標「樣本少」（stFlag:'few'），蝦皮等塊 C 資料再校準（stFlag:'uncal'）。
//   🔴 v5-2026-11（2026-11-03 老闆開會決定）：總分只看 score 這一段——「純利率」「動銷率」兩項級距計分，各占 50%。
//     級距 100／80／60／0（沒有 40 分、不做線性內插）；達到 100 分線＝100，否則達到 80 分線＝80，否則達到 60 分線＝60，否則 0。
//     下面的 dims／profit／growth／ads／structure／types 是 v4 以前的線性計分設定：舊面向函式照樣讀（之後做商品標籤會用到），
//     但成長、廣告效率、商品結構、毛利率都不再算進總分。新規則套用到所有月份。
//   🔴 v6-2026-11（2026-11-05，#416）：MOMO（甲配、乙配、MO+）動銷率改成跟淨利表 MOMO 總覽同一套（所有月份一起換），分數線用新口徑 2026-05～10 重算。
//     三條線的算法（v5 沒寫下來，由舊線與 v4 的 P10／P50／P75 反推、確認後沿用）：100 分線＝P75 往上取整、80 分線＝P50 往下取整、60 分線＝P10 往下取整（整數 %）。
//     MO+ 不含 2026-09：下半月幾乎沒有資料（MO+ 麻吉 8 個商品、約 2 千元），未來補齊後可重算。
//     🔴 這裡只改 BASE（2026-10 以前）。2026-11 起吃雲端 app/health_rules 那一版，要管理員在「⚙ 評分標準」另存。
const HEALTH_RULES = _hlDeepFreeze({
  version: 'v8-2026-11',   // v8（2026-11-10）：蝦皮純利率線改回 25/20/18（見 score.items 的 pureRate）
  from: '2026-01',                     // 這份規則從哪個月起適用（第一版＝firstMonth；之後的版本見 healthRulesForMonth）
  firstMonth: '2026-01',               // 月份下拉最早到這個月（KPI 月結從 2026-01 開始）
  lights: { green: 80, yellow: 50 },   // ≥80 綠、50–79 黃、<50 紅（同 KPI 評分表 scoreColor 的門檻）
  minRev: 30000,                       // 月營收 < 3 萬 ⇒ 比率類子指標不評分（同 profit.js KPI_ANOMALY_RULES.minRev）
  defaultMonthFillRatio: 0.9,          // 預設評分月份：上個月全通路 KPI 填寫率 ≥ 90% 才用，否則再往前一個月
  pendingLookback: 3,                  // 頁頂「KPI 尚未填完」列：評分月份＋往前幾個月（只影響提示，不影響分數）
  // v5 計分（只有這一段決定總分）。lines＝[100 分線, 80 分線, 60 分線]（比率小數），依通路類型、同類型共用；
  //   沒列到的類型＝「標準未設定」：不給分、不算 0 分。取值口徑沿用畫面上的數字：
  //   純利率＝獲利面向的「純利 ÷ 實際營收」（KPI）、動銷率＝商品結構面向的動銷率（MOMO＝同淨利表 MOMO 總覽，以商品頁計；PChome＝公司商品口徑；蝦皮＝整月商品表現）。
  //   比較用畫面顯示的 0.1% 精度（_hlTier）：畫面寫 20.0% 就算達到 20% 線，手算核對跟畫面一致。
  //   provisional＝暫定（畫面標「暫定」）。之後做「標準設定頁」時才改成可設定；現在寫死在這裡，改數字要升 version。
  //   蝦皮純利率線（v8，2026-11-10）：11/10 老闆決定標準維持 25/20/18，KPI 資料維持含稅（v881 起含稅、純利扣稅金）。
  //     v7（2026-11-09）的改線已撤回。2026-11 起的線在雲端 app/health_rules，由管理員在「⚙ 評分標準」改。
  score: {
    tiers: [100, 80, 60],
    items: [
      { key: 'pureRate', label: '純利率', short: '純利', w: 0.5, dim: 'profit', provisional: false,
        lines: { shopee: [0.25, 0.20, 0.18], momoJia: [0.38, 0.30, 0.20], momoYi: [0.38, 0.30, 0.20], moplus: [0.28, 0.24, 0.20] } },
      { key: 'sellThrough', label: '動銷率', short: '動銷', w: 0.5, dim: 'structure', provisional: true,
        lines: { momoJia: [0.49, 0.47, 0.44], momoYi: [0.74, 0.70, 0.67], moplus: [0.34, 0.21, 0.14] } },
    ],
  },
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
    minSold: 20,          // 本月「有銷售且有成本」的商品少於這個數 ⇒ 面向「資料不足」（MOMO、蝦皮的動銷率不受這條限制）
    lowMinRev: 3000,      // 低利商品只算營收 ≥ 3,000 的（太小的商品不算拖累）
    lowMargin: 0.05,      // 低利＝商品純利率介於 0 到 5%（不含虧損，虧損另算，同一件商品不重複扣分）
    subs: [
      { key: 'sellThrough', label: '動銷率', w: 0.3, unit: 'pct',
        formula: '本期有銷售的公司商品數 ÷（目前上架 ∪ 本期有銷售的公司商品數）',
        desc: '能賣的商品裡，這個月真的有賣出的比例（PChome 以公司商品計：料號去掉規格碼，雨衣四色算 1 個；蝦皮、MOMO 的算法見完整規則）' },
      { key: 'lossShare', label: '虧損商品營收占比', w: 0.4, zero: 0.055, full: 0.005, unit: 'pct',
        formula: '純利 < 0 的商品營收 ÷ 全部商品營收', desc: '營收有多少是由賠錢商品賣出來的，越低越好' },
      { key: 'lowShare', label: '低利商品營收占比', w: 0, scored: false, unit: 'pct',
        formula: '純利率在 0 到低利線之間、營收達門檻的商品營收 ÷ 全部商品營收', desc: '營收有多少是由「有賺但賺很少」的商品賣出來的',
        why: '回測時大部分通路這個數字都接近 0%（蝦皮 P75 只有 0.4%），差異幾乎全落在虧損商品，拿來評分只會反映低利線畫在哪裡，所以 v4 起只顯示供參考。' },
      { key: 'longLoss', label: '長期虧損商品占比', w: 0.3, zero: 0.04, full: 0, unit: 'pct',
        formula: '本月與上個月都虧損的商品數 ÷ 本月有銷售的商品數', desc: '連續兩個月都在賠的商品比例，越低越好' },
      { key: 'sellThroughPage', label: '動銷率（商品頁口徑）', w: 0, scored: false, unit: 'pct',
        formula: '本期有銷售的商品頁數 ÷（目前上架 ∪ 本期有銷售的商品頁數）', desc: '每個通路商品頁各算一個',
        why: '商品頁口徑＝PChome 商品編號去最後一段、每頁算一個，給你對照；PChome 的分數用公司商品口徑（雨衣四色算 1 個）。MOMO 的動銷率本身就以商品頁計（同淨利表 MOMO 總覽），不用這一項。' },
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
  //   label＝評分標準視窗、完整規則上的類型名稱，跟主看板卡片的名稱一致（2026-11-05；以前是蝦皮自營、MOMO 自出貨、MOMO 寄倉、酷澎商城）。只是顯示文字，key 不動。
  //   sellThrough（動銷率）＝v4 校準值（__healthCalibrate 依實測 P10／P50／P75 算的建議值，方案 §2-7-2）；null＝這類型不評動銷率。
  //     MOMO 三類是 v6 用新口徑 2026-05～10 重算（MO+ 不含 2026-09）。只給舊面向函式用，不影響總分（總分看 score.items 的 lines）。
  //     stFlag：'few'＝樣本少（< HEALTH_CALIB.minN 筆，門檻用最小間距），畫面標「樣本少」；'uncal'＝還沒有實測資料、仍是起始值，標「待校準」。
  types: {
    shopee:  { label: '蝦皮',         order: 1, pureRate: [0, 0.24], sellThrough: [0.30, 0.65], stFlag: 'uncal', members: '好麻吉、玩樂、森之旅、維克' },
    momoJia: { label: 'MOMO 甲配',    order: 2, pureRate: [0, 0.39], sellThrough: [0.42, 0.50], members: 'MOMO 甲配' },
    momoYi:  { label: 'MOMO 乙配（寄倉）', order: 3, pureRate: [0, 0.26], sellThrough: [0.65, 0.73], members: 'MOMO 乙配（寄倉）' },
    moplus:  { label: 'MO+',          order: 4, pureRate: [0, 0.29], sellThrough: [0.06, 0.295], members: 'MO+ 麻吉、MO+ 森之旅、MO+ 玩樂' },
    coupang: { label: '酷澎 商城',    order: 5, pureRate: [0, 0.34], sellThrough: null, members: '酷澎 商城-好麻吉、酷澎 商城-露營館' },
    small:   { label: '小通路',       order: 6, pureRate: [0, 0.10], sellThrough: [0.10, 0.18], stFlag: 'few', stN: 2, members: '酷澎買斷、PChome、FriDay、博客來' },
    other:   { label: '業外',         order: 7, pureRate: [0, 0.10], sellThrough: null, members: '業外' },
  },
  // ⓘ 固定說明（依 KPI 群組）
  notes: {
    shopee: {
      rev: '蝦皮營收照撥款日入帳，月份間會跳動（例：2 月農曆年撥款延後、3 月補回），看 2～3 月的成長要特別小心。',
      pure: '蝦皮各店純利不含整組共同運費（物流運費只扣在蝦皮小計），各店純利率會比小計高。',
    },
    momo: { rev: 'MOMO 營收用 KPI「實際營收」（營收(進價稅) − 退貨金額），含稅口徑（跟蝦皮一樣，營業稅都由 KPI「稅金」欄另外扣）。' },
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
  { id: 'pchome',         label: 'PChome',          type: 'small',   group: 'pchome',  shop: 'PChome', shops: ['PChome', 'PChome-寄倉'], prod: { platform: 'pchome', shop: 'PChome' } },   // 2026-11-06 KPI 加寄倉列 → 兩店加總（_hlCell）
  { id: 'friday',         label: 'FriDay',          type: 'small',   group: 'friday',  shop: 'FriDay-主站', shops: ['FriDay-主站', 'FriDay-i站'] },   // 2026-11-04 KPI 拆主站／i站 → 兩店加總（_hlCell）
  { id: 'books',          label: '博客來',          type: 'small',   group: 'books',   shop: '博客來-寄倉' },   // 2026-11-04 KPI 博客來拆寄倉／轉單；轉單目前沒銷量
  { id: 'other',          label: '業外',            type: 'other',   group: 'other',   shop: '業外',  ranked: false },
  { id: 'website',        label: '官網',            type: 'small',   group: 'website', shop: '官網',  ranked: false },
]);
// 主看板的三區與區內順序（寫死、不依分數排）。只影響畫面分區，評分標準的分組（types）不變。官網已關站，不上主看板。
//   🔴 新增通路要加進這裡，不然主看板看不到它。
const HL_BOARD_SECTIONS = _hlDeepFreeze([
  { title: '蝦皮', ids: ['shopee-maji', 'shopee-wanle', 'shopee-sen', 'shopee-wick'] },
  { title: 'MOMO', ids: ['momo-jia', 'momo-yi', 'moplus-maji', 'moplus-sen', 'moplus-wanle'] },
  { title: '其他通路', ids: ['coupang-maji', 'coupang-luying', 'coupang-buyout', 'pchome', 'friday', 'books', 'other'] },
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

/* ---------- 評分標準版本：某個月用哪份規則 ---------- */
// 一個通路某一項的三條分數線：通路自己的 → 類型的 → 沒有（null＝標準未設定）。
function _hlLinesFor(it, ch) {
  return (it.linesByChannel && it.linesByChannel[ch.id]) || (it.lines && it.lines[ch.type]) || null;
}
const _hlHas = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const _hlIsObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
// 這個類型本來就不算動銷率（types[*].sellThrough 是 null：酷澎 商城、業外）
function _hlNoSellThrough(type) { return !(HEALTH_RULES.types[type] || {}).sellThrough; }
// 一版裡「要忽略」的線：動銷率的酷澎、業外（類型或屬於它們的通路）。其他項目、其他類型一律不忽略。
function _hlIgnoredLine(itemKey, key, byChannel) {
  if (itemKey !== 'sellThrough') return false;
  if (!byChannel) return _hlHas(HEALTH_RULES.types, key) && _hlNoSellThrough(key);
  const ch = HEALTH_CHANNELS.find(c => c.id === key);
  return !!ch && _hlNoSellThrough(ch.type);
}
// 三條線：[100 分線, 80 分線, 60 分線]，都在 0～1、由高到低（等號可）
function _hlLinesBad(a) {
  if (!Array.isArray(a) || a.length !== 3) return '要是三個數字';
  if (!a.every(x => _hlFinite(x) && x >= 0 && x <= 1)) return '數值要在 0～1';
  if (!(a[0] >= a[1] && a[1] >= a[2])) return '要由高到低';
  return '';
}
// 權重規則（版本驗證與設定視窗共用，不另寫一套）
const _hlWeightBad = w => !(_hlFinite(w) && w > 0);
const _hlWeightsSumBad = sum => Math.abs(sum - 1) > 1e-9;
// 一版本身的問題（回字串陣列，空＝沒問題）。每版要寫完整：每個計分項目都要有 w 和 lines（linesByChannel 可省略＝沒有通路覆蓋）。
function _hlVersionProblems(v) {
  if (!_hlIsObj(v)) return ['不是物件'];
  const out = [];
  if (_hlHas(v, 'key') && v.key !== v.from) out.push(`文件裡的 key（${v.key}）跟 from 不同`);
  if (!_hlIsYm(v.from)) out.push(`from 格式錯（${v.from}）`);
  else if (v.from < HEALTH_RULES.firstMonth) out.push(`from 早於 ${HEALTH_RULES.firstMonth}`);
  if (!_hlIsObj(v.items)) return out.concat('items 不是物件');
  HEALTH_RULES.score.items.forEach(x => { if (!_hlHas(v.items, x.key)) out.push(`缺 ${x.key}（每版要寫完整）`); });
  Object.keys(v.items).forEach(k => {
    const it = v.items[k];
    if (!HEALTH_RULES.score.items.some(x => x.key === k)) { out.push(`items 的 key 不認得（${k}）`); return; }
    if (!_hlIsObj(it)) { out.push(`${k} 不是物件`); return; }
    Object.keys(it).forEach(f => { if (['w', 'lines', 'linesByChannel', 'provisional'].indexOf(f) < 0) out.push(`${k} 有不認得的欄位（${f}）`); });
    if (!_hlHas(it, 'w')) out.push(`${k} 缺權重（每版要寫完整）`);
    else if (_hlWeightBad(it.w)) out.push(`${k} 權重要 > 0（${it.w}）`);
    if (!_hlHas(it, 'lines')) out.push(`${k} 缺 lines（每版要寫完整）`);
    if (_hlHas(it, 'provisional') && typeof it.provisional !== 'boolean') out.push(`${k} provisional 要是 true／false（${it.provisional}）`);
    [['lines', false], ['linesByChannel', true]].forEach(([f, byChannel]) => {
      if (!_hlHas(it, f)) return;
      if (!_hlIsObj(it[f])) { out.push(`${k}.${f} 不是物件`); return; }
      Object.keys(it[f]).forEach(key => {
        if (!(byChannel ? HEALTH_CHANNELS.some(c => c.id === key) : _hlHas(HEALTH_RULES.types, key))) { out.push(`${k}.${f} 不認得（${key}）`); return; }
        if (_hlIgnoredLine(k, key, byChannel)) return;   // 要忽略的線內容不管對錯都不看
        const bad = _hlLinesBad(it[f][key]);
        if (bad) out.push(`${k}.${f}.${key} ${bad}（${JSON.stringify(it[f][key])}）`);
      });
    });
  });
  return out;
}
// 一版 → 完整、深凍結的規則：權重與分數線全部來自這一版，【不沿用前一版】；這版沒寫到的類型／通路＝沒有線（標準未設定）。
//   其他欄位（燈號、標籤、門檻說明…）版本改不到，沿用 BASE。
function _hlRulesFromVersion(v) {
  const pick = (itemKey, src, byChannel) => {
    const o = {};
    Object.keys(src || {}).forEach(key => { if (!_hlIgnoredLine(itemKey, key, byChannel)) o[key] = src[key].slice(); });
    return o;
  };
  const items = HEALTH_RULES.score.items.map(it => {
    const o = v.items[it.key];
    return Object.assign({}, it, { w: o.w, lines: pick(it.key, o.lines, false), linesByChannel: pick(it.key, o.linesByChannel, true) }, _hlHas(o, 'provisional') ? { provisional: o.provisional } : null);
  });
  return _hlDeepFreeze(Object.assign({}, HEALTH_RULES, {
    from: v.from, version: `${HEALTH_RULES.version}+${v.from}`, score: Object.assign({}, HEALTH_RULES.score, { items }),
  }));
}
// 驗證＋依起始月排序。回 { chain:[由舊到新的完整規則], problems:[] }；有任何問題 chain 一律空（整份不用）。
function _hlBuildRuleChain(versions) {
  if (!Array.isArray(versions)) return { chain: [], problems: [(versions && versions.invalid) || '版本清單不是陣列'] };
  const tag = (v, i) => `第 ${i + 1} 版（from=${_hlIsObj(v) ? v.from : v}）`;
  const problems = [], seen = {};
  versions.forEach((v, i) => {
    _hlVersionProblems(v).forEach(p => problems.push(`${tag(v, i)}：${p}`));
    if (_hlIsObj(v) && _hlIsYm(v.from)) {
      if (seen[v.from]) problems.push(`${tag(v, i)}：起始月跟另一版重複`);
      seen[v.from] = true;
    }
  });
  if (problems.length) return { chain: [], problems };
  const chain = [];
  versions.map((v, i) => ({ v, i })).sort((a, b) => (a.v.from < b.v.from ? -1 : 1)).forEach(({ v, i }) => {
    const R = _hlRulesFromVersion(v);
    const sum = R.score.items.reduce((a, it) => a + it.w, 0);
    if (_hlWeightsSumBad(sum)) problems.push(`${tag(v, i)}：權重加總要等於 1（現在是 ${sum}）`);
    chain.push(R);
  });
  return problems.length ? { chain: [], problems } : { chain, problems };
}
// 記憶化：內容相同的版本清單只驗證、只建一次，同一版永遠回同一個物件；不合法也只 warn 一次。
const _hlRuleChains = new Map();
const _HL_RULE_CHAINS_MAX = 32;   // 版本清單極少變動；防萬一無限長大，滿了清掉重來
function _hlRuleChain(versions) {
  let sig;
  try { sig = JSON.stringify(versions); } catch { sig = '!unserializable'; }
  let hit = _hlRuleChains.get(sig);
  if (!hit) {
    hit = _hlBuildRuleChain(versions);
    if (hit.problems.length) console.warn(`[health] 評分標準版本不合法，整份不用、全部退回 ${HEALTH_RULES.version}：${hit.problems.join('；')}`);
    if (_hlRuleChains.size >= _HL_RULE_CHAINS_MAX) _hlRuleChains.clear();
    _hlRuleChains.set(sig, hit);
  }
  return hit;
}
// key 排序過的 JSON：比對雲端內容用（Firestore 讀回來的欄位順序不保證；同 daily.js _adjStableJson）。
function _hlStableJson(v) {
  if (Array.isArray(v)) return '[' + v.map(_hlStableJson).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + _hlStableJson(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
// app/health_rules 文件 → healthRulesForMonth 要的陣列（依 from 排序）。文件不存在、沒有 versions ⇒ 空清單。
//   文件形狀：{ schema:1, versions:{ 'YYYY-MM':{ from, items, note, by, byName, at } } }。note／by／byName／at 不參與驗證，留在版本物件上給之後顯示用。
//   形狀不對（schema 不認得、versions 不是物件）⇒ 回 { invalid:原因 }，healthRulesForMonth 會整份退回 BASE 並 warn 一次。
function _hlRuleVersionsFromDoc(d) {
  if (!_hlIsObj(d) || d.versions == null) return [];
  if (d.schema !== 1) return { invalid: `schema 不認得（${d.schema}）` };
  if (!_hlIsObj(d.versions)) return { invalid: 'versions 不是物件' };
  return Object.keys(d.versions).map(k => Object.assign({}, d.versions[k], { key: k }))
    .sort((a, b) => (String(a.from) < String(b.from) ? -1 : String(a.from) > String(b.from) ? 1 : 0));
}
// 🔴 某個月適用的完整規則（凍結物件）：所有 from ≤ month 的版本裡最新的那一版，沒有就是 HEALTH_RULES（BASE）。純函式，不碰 window／DOM。
//   versions＝[{ from:'YYYY-MM', items:{ pureRate:{ w, lines:{ 類型:[a,b,c] }, linesByChannel:{ 通路 id:[a,b,c] }, provisional?:布林 }, sellThrough:{…} } }]，順序不拘（provisional 沒寫＝沿用 BASE）；
//   🔴 每版寫完整、不沿用前一版：沒寫到的類型／通路就是沒有線（標準未設定）。任何一版不合法 ⇒ 整份不用、退回 BASE。動銷率替酷澎、業外設的線一律忽略。
function healthRulesForMonth(month, versions) {
  if (versions == null || (Array.isArray(versions) && !versions.length)) return HEALTH_RULES;
  const { chain } = _hlRuleChain(versions);
  if (!_hlIsYm(month)) return HEALTH_RULES;
  for (let i = chain.length - 1; i >= 0; i--) if (chain[i].from <= month) return chain[i];
  return HEALTH_RULES;
}

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
// 成長率顯示（比照淨利表）：|成長率| ≥ 999.5% 只寫「>+999%」「<−999%」（多半是基期太小）；只改顯示，計算不動
const HL_GROWTH_CAP = 9.995;   // 999.5%
function _hlFmtGrowth(v) {
  if (!_hlFinite(v)) return '—';
  if (Math.abs(v) >= HL_GROWTH_CAP) return v > 0 ? '>+999%' : '<−999%';
  return _hlFmtSignedPct(v);
}
// 金額用「萬」：≥ 1 萬寫「137.1萬」（≥ 1,000 萬也照萬：「1,234.5萬」），< 1 萬寫原數字；負數照寫負號
function _hlFmtWan(v) {
  if (!_hlFinite(v)) return '—';
  const s = v < 0 ? '−' : '', a = Math.round(Math.abs(v));
  if (a < 10000) return s + a.toLocaleString('en-US');
  return s + (Math.round(a / 1000) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '萬';
}
// 兩個比率的差，寫成「+1.2 個百分點」
function _hlFmtPpText(d) { return _hlFinite(d) ? (d >= 0 ? '+' : '−') + Math.abs(d * 100).toFixed(1) + ' 個百分點' : '—'; }
function _hlFmtMoney(v) { return _hlFinite(v) ? (v < 0 ? '−' : '') + '$' + Math.round(Math.abs(v)).toLocaleString('en-US') : '—'; }
function _hlFmtRaw(v, unit) {
  if (unit === 'count') return _hlFinite(v) ? Math.round(v) + ' 頁' : '—';
  return unit === 'pp' ? _hlFmtPp(v) : unit === 'signedPct' ? _hlFmtSignedPct(v) : _hlFmtPct(v);
}

/* ---------- 讀轉接資料（snap＝__healthKpiSnapshot 的回傳形狀） ---------- */
function _hlCell(snap, m, ch) {
  const mo = snap && snap.months && snap.months[m];
  const g = mo && mo.groups && mo.groups[ch.group];
  if (ch.shops) return _hlSumCells(ch.shops.map(s => g && g[s]));   // 一個通路多家店（FriDay 主站＋i站）→ 加總
  return (g && g[ch.shop]) || null;
}
// 多家店的 KPI 格加總成一格（形狀同 __healthKpiSnapshot 的單店格）：金額／件數相加、填寫進度相加；
//   廣告費任一店有值才算（都沒有＝null）；關站／since 之前要全部都是才算。
function _hlSumCells(cells) {
  const cs = cells.filter(Boolean);
  if (!cs.length) return null;
  const sum = k => cs.reduce((a, c) => a + (Number(c[k]) || 0), 0);
  return {
    rev: sum('rev'), cost: sum('cost'), ads: cs.some(c => c.ads != null) ? sum('ads') : null, pure: sum('pure'), qty: sum('qty'),
    revFilled: cs.some(c => c.revFilled),
    fill: { filled: cs.reduce((a, c) => a + ((c.fill && c.fill.filled) || 0), 0), total: cs.reduce((a, c) => a + ((c.fill && c.fill.total) || 0), 0) },
    closed: cs.every(c => c.closed), beforeSince: cs.every(c => c.beforeSince),
  };
}
// 來源說明用的店名（多店＝用 + 串起來）
function _hlShopText(ch) { return ch.shops ? ch.shops.join('+') : ch.shop; }
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
  if (!(c.rev >= R.minRev)) {
    const d = fail('smallRev', `營收過小（${_hlFmtMoney(c.rev)}，未滿 ${_hlFmtMoney(R.minRev)}），本月比率類指標不評分`);
    // 不評分，但留一份參考數字給卡片灰字顯示「僅供參考」（_hlRefRaw 不可列舉：raw、score、status 都不變，分數與回歸指紋不受影響）
    if (c.rev > 0) d.subs.forEach(s => _hlRefRaw(s, s.key === 'pureRate' ? c.pure / c.rev : (c.rev - c.cost) / c.rev));
    return d;
  }
  const notes = R.notes[ch.group] || {};
  const src = `app/kpi ${m} ${ch.group}.${_hlShopText(ch)}`;
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
  const src = `app/kpi ${ch.group}.${_hlShopText(ch)}：近 ${range(W.slice(N))} vs 前 ${range(W.slice(0, N))}`;
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
//     adsFee?, gross?, platFee?, roi?, directROI?, clicks? }], st?:{sold,total}（MOMO 動銷率）, subTotals?, asOf, latestExport?, recon?, lastAdjust }
//   status 'none'＝那個月沒有任何銷售資料（還沒上傳，或通路還沒開始）——不是「全部零動銷」。
function _hlProdNormalize(raw) {
  const base = { platform: raw && raw.platform, shop: raw && raw.shop, month: raw && raw.month, rows: [], lastAdjust: (raw && raw.lastAdjust) || {} };
  if (!raw || raw.error) return Object.assign(base, { status: 'error', error: (raw && raw.error) || 'no data' });
  if (raw.pending) return Object.assign(base, { status: 'error', error: '舊月份報表還在讀，再跑一次就有' });   // Console 回測等同步呼叫才走到這裡：不能算成沒資料
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
        costKnown: !!r.costKnown, sold: !!r.sold, active: !!r.active, qty: +r.qty || 0, cost: _hlFinite(+r.cost) && r.cost != null ? +r.cost : null }; });
    // 動銷率的分子分母：profit.js 直接取 momoPeriodTotals（同 MOMO 總覽），這裡不另算
    base.st = raw.st && _hlFinite(+raw.st.sold) && _hlFinite(+raw.st.total) ? { sold: +raw.st.sold, total: +raw.st.total } : null;
  } else if (raw.platform === 'pchome') {
    base.latestExport = raw.latestExport || ''; base.subTotals = raw.subTotals || {};
    rows = (raw.rows || []).map(r => { const pages = (r.pages && r.pages.length) ? r.pages.slice() : ['code:' + r.key];
      const ck = _hlCompanyKey(r.key, 'code:' + r.key);
      return { key: r.key, sub: r.sub, name: r.name, company: ck.key, fallback: ck.fallback, pages,
        rev: +r.rev || 0, profit: r.profit == null ? null : +r.profit, costKnown: !!r.costKnown && r.profit != null, sold: !!r.sold, active: !!r.active, qty: +r.qty || 0,
        cost: r.cost == null || !_hlFinite(+r.cost) ? null : +r.cost }; });
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
// 蝦皮的動銷率不走商品層，改讀洞察表每月上傳的整月商品表現（shopee_perf_month）。商品層的其他用途（商品標籤、拖累清單）不變。
function _hlStFromPerf(ch) { return !!(ch && ch.prod && ch.prod.platform === 'shopee'); }
// 營收未滿 minRev 的參考數字（卡片灰字「僅供參考」用）。🔴 同 stCount 刻意不可列舉：不計分、不進 JSON、不影響回歸指紋。
function _hlRefRaw(s, v) { if (_hlFinite(v)) Object.defineProperty(s, 'refRaw', { value: v, enumerable: false, configurable: true }); }
// 動銷率的分子分母（評分標準視窗「近 6 月」Σ÷Σ 用）。🔴 刻意不可列舉：只給 _hlStdSellMonth 讀，不進 JSON、不影響分數與回歸指紋。
function _hlStCount(s, num, den) { Object.defineProperty(s, 'stCount', { value: { num, den }, enumerable: false, configurable: true }); }
// 把蝦皮的動銷率子指標換成整月資料（純函式：只讀 snap.shopeePerf，內容由 _hlSpWant 填）。商品層在載入、資料不足都不影響這一項。
//   snap 沒有 shopeePerf（只算 KPI 的呼叫端、node 測試）⇒ 不適用；有 shopeePerf 但還沒有這個 key ⇒ 載入中。
function _hlShopeeStApply(subs, ch, m, snap) {
  if (!_hlStFromPerf(ch)) return;
  const by = k => subs.find(x => x.key === k), sT = by('sellThrough');
  [by('sellThroughPage'), by('deadDupPages')].forEach(x => { if (x) Object.assign(x, { status: 'na', reason: '不適用：蝦皮的整月商品表現沒有這個口徑', raw: null, score: null, trace: null }); });
  if (!sT) return;
  const set = (status, reason, stText) => Object.assign(sT, { status, reason, raw: null, score: null, trace: null }, stText ? { stText } : null);
  const map = snap && snap.shopeePerf;
  if (!map) return set('na', '不適用：這次沒有讀整月商品表現');
  const e = map[ch.shop + '|' + m];
  if (!e || e.state === 'loading') return set('loading', '整月商品表現讀取中');
  if (e.state === 'failed') return set('readFail', '整月商品表現讀取失敗');
  if (e.state === 'none') return set('pending', `${_hlYmLabel(m)} 整月商品表現還沒上傳（洞察表）`, '尚未上傳');
  if (!(e.normal > 0)) return set('insufficient', `資料不足：${_hlYmLabel(m)} 整月商品表現沒有正常商品`);
  set('ok', '');
  sT.raw = e.soldNormal / e.normal;
  _hlStCount(sT, e.soldNormal, e.normal);
  sT.score = _hlLinear(sT.raw, sT.zero, sT.full);
  sT.trace = { src: `洞察表整月商品表現 ${ch.shop} ${_hlYmLabel(m)}`, text: `正常商品裡有賣出 ${e.soldNormal} ÷ 正常商品 ${e.normal}` };
}
// MOMO（甲配、乙配、MO+）的動銷率口徑（#416）：跟淨利表 MOMO 總覽同一套，畫面說明也用這句。
const HL_MOMO_ST_FORMULA = '本期有銷售的商品頁 ÷（目前上架 ∪ 本期有銷售）';
const HL_MOMO_ST_DESC = `同淨利表 MOMO 總覽：${HL_MOMO_ST_FORMULA}。上架狀態是現在的狀態，過去月份會隨上下架變動。`;
// 動銷率 ⓘ 說明分平台（照程式實際算法：_hlShopeeStApply／_hlMomoStApply／_hlSellThrough＋profit.js __healthProductSnapshot 的 PChome sold＝hasBiz、active＝!discontinued）
const HL_ST_HOW_LINES = Object.freeze([
  '蝦皮＝洞察表整月商品表現，正常商品裡這個月有賣出的比例。',
  `MOMO＝同淨利表 MOMO 總覽，${HL_MOMO_ST_FORMULA}。`,
  'PChome＝本期有銷售的商品款數 ÷（目前沒停售 ∪ 本期有銷售的款數），轉單、寄倉合併；料號去掉最後一段規格碼算一款（雨衣四色算 1 個），料號不是「英文字母＋數字－數字」的各自算一款。',
]);
// 把 MOMO 的動銷率子指標換成 momoPeriodTotals 的數字（純函式：只讀 snap.prod 的 st，由 profit.js 帶進來）。跟 minSold 脫鉤：只要這個月有商品層資料就算。
//   商品層還沒好、這個月沒有銷售資料 ⇒ 不動，沿用 _hlStructureDim 給的狀態（載入中、尚未上傳…）。
//   sellThroughPage 不再用（主數字本身就以商品頁計）；deadDupPages 保留；公司商品口徑只留在對照小字（_hlMomoPageNote）。
function _hlMomoStApply(subs, ch, m, snap) {
  if (!ch.prod || ch.prod.platform !== 'momo') return;
  const by = k => subs.find(x => x.key === k), sT = by('sellThrough'), sP = by('sellThroughPage'), sD = by('deadDupPages');
  if (sP) Object.assign(sP, { status: 'na', reason: '不適用：MOMO 動銷率本身就以商品頁計', raw: null, score: null, trace: null });
  if (!sT) return;
  Object.assign(sT, { formula: HL_MOMO_ST_FORMULA, note: HL_MOMO_ST_DESC });
  const p = _hlProdOf(ch, m, snap);
  if (p.state !== 'ready' || !p.snap || p.snap.status !== 'ok') return;
  if (_hlProdOf(ch, _hlAddMonth(m, -1), snap).state === 'loading') return;   // 上個月還在算：沿用「載入中」，跟改版前一樣等整批好才給數字
  const src = `MOMO 商品主檔＋對帳 ${ch.prod.shop} ${_hlYmLabel(m)}`, comp = _hlSellThrough(p.snap.rows);
  if (sD && comp) Object.assign(sD, { status: 'ok', reason: '', raw: comp.deadDupPages, trace: { src, text: `多頁公司商品裡沒賣出的頁 ${comp.deadDupPages} 頁` } });
  const st = p.snap.st;
  if (!st || !(st.total > 0)) return Object.assign(sT, { status: 'insufficient', reason: '資料不足：沒有上架或有銷售的商品', raw: null, score: null, trace: null });
  sT.status = 'ok'; sT.reason = '';
  sT.raw = st.sold / st.total;
  _hlStCount(sT, st.sold, st.total);
  sT.score = _hlLinear(sT.raw, sT.zero, sT.full);
  sT.trace = { src, text: `有銷售的商品頁 ${st.sold} ÷ 上架或有銷售的商品頁 ${st.total}（同淨利表 MOMO 總覽）` };
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
    pct.trace = { src: `app/kpi ${m} ${ch.group}.${_hlShopText(ch)}（廣告費 ÷ 實際營收）`, num: c.ads, den: c.rev };
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
  const finish = subs => { _hlShopeeStApply(subs, ch, m, snap); _hlMomoStApply(subs, ch, m, snap); return _hlFinishDim(def, subs); };
  const all = (st, reason) => finish(_hlSubs(S.subs, st, reason, lim));
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
  else if (!st) [sT, sP, sD].forEach(s => set(s, 'pending', '尚未上傳：沒有上架狀態，算不出分母'));
  else if (!st.company.den) [sT, sP, sD].forEach(s => set(s, 'insufficient', '資料不足：沒有上架或有銷售的商品'));
  else {
    sT.raw = st.company.num / st.company.den; sT.score = _hlLinear(sT.raw, sT.zero, sT.full);
    _hlStCount(sT, st.company.num, st.company.den);
    sT.trace = { src, text: `有銷售的公司商品 ${st.company.num} ÷ 上架或有銷售的公司商品 ${st.company.den}` + (st.fallback ? `（其中 ${st.fallback} 個編號格式不符，改用商品頁計）` : '') };
    sP.raw = st.page.den ? st.page.num / st.page.den : null;
    const subT = p.snap.subTotals || {};
    const pcText = Object.keys(subT).length ? '；料號口徑（同 PChome 總覽卡）：' + Object.keys(subT).map(k => `${k} ${subT[k].sold}/${subT[k].total}`).join('、') : '';
    sP.trace = { src, text: `有銷售的商品頁 ${st.page.num} ÷ 上架或有銷售的商品頁 ${st.page.den}` + pcText };
    sD.raw = st.deadDupPages; sD.trace = { src, text: `多頁公司商品裡沒賣出的頁 ${st.deadDupPages} 頁` };
  }
  return finish(subs);
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
    if (_hlDeadLongHit(r, pr)) info.push({ key: r.key, sub: r.sub || null, name: r.name, reasons: ['deadLong'] }); });
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

// 連續零動銷（MOMO／PChome；蝦皮沒有上架狀態）：上架中、這個月沒賣、上個月也沒賣（拖累清單與商品標籤共用）
function _hlDeadLongHit(r, pr) { return !!(r.active && !r.sold && pr && !pr.sold); }

const _HL_DIM_FNS = { profit: _hlProfitDim, growth: _hlGrowthDim, ads: _hlAdsDim, structure: _hlStructureDim };

/* ---------- 商品紅綠燈標籤（塊 4；只是呈現，不計分、不影響任何分數）----------
 * 每個商品每月最多 5 個標籤：營收、純利、毛利率、廣告（蝦皮）、動銷（MOMO／PChome）。沒資料的標籤不顯示（不當灰色）。
 *   營收、純利的成長門檻＝淨利表「成長分析」的爆發品／重跌品門檻（profit.js GROWTH_THRESH_DEF＋雲端設定，經 window.getGrowthThresh 讀現值，
 *   跟淨利表同一份；成長率 > risePct% ＝綠、< −fallPct% ＝紅，同 calcGrowthAnalysis 用嚴格 > ／ <）。
 *   廣告＝_hlAdsLossHit（拖累清單同一條「廣告致虧」）；動銷＝_hlDeadLongHit（拖累清單同一條「連續零動銷」）。
 *   毛利率與月份變化表的「持平」範圍是健檢自己的（HEALTH_TAG_RULES）。只看整月：蝦皮要有整月報表，半月拼的月份當作沒資料。
 * 表現好＝綠燈數 > 紅燈數；需注意＝紅燈數 > 綠燈數（灰、黃不算）。排序：燈數多 → 營收高 → 品號。 */
const HEALTH_TAG_RULES = _hlDeepFreeze({
  gm: { window: 3, minMonths: 2, flat: 0.01, warn: 0.03 },   // 跟前 3 個月平均：≥ +1pp 綠、±1pp 內灰、−1～−3pp 黃、低超過 3pp 紅；前 3 個月有資料少於 2 個月不顯示
  topN: 10,
  minRev: 3000,   // 表現好／需注意（數量與清單）只算本月或上月營收 ≥ 3,000 元的商品；燈號本身照算（items 全部都有，只是不進表現好／需注意）
  flat: { rate: 0.005, money: 0.03 },   // 月份變化表跟前一個月比的「持平」：比率 ±0.5 個百分點以內、金額 ±3% 以內
});
const HL_LIGHT_SYM = { green: '▲', gray: '●', yellow: '▽', red: '▼' };
const HL_LIGHT_TEXT = { green: '變好', gray: '持平', yellow: '留意', red: '警示' };
// 口徑變更提醒（只是提示文字，不改任何計算）。評分月份落在 from～to（含）時，在 where 列的位置顯示一行 short＋ⓘ（點了看 text）；
//   where：'tags'＝表現好／需注意清單上方、'grossRate'＝逐月變化表毛利率那一列下面。以後有類似的口徑變更，在這裡加一筆就好。
const HEALTH_NOTICES = _hlDeepFreeze([
  { id: 'cost-2026-09', from: '2026-09', to: '2026-11', where: ['tags', 'grossRate'],
    short: '9 月成本更新，毛利率紅燈偏多',
    text: '2026/09 起更新商品成本（之前一直用同一套舊成本），9～11 月的毛利率會跟含舊成本的月份比，紅燈會偏多，多半是更新後的真實毛利，可用來看哪些商品該漲價；2026/12 起回到正常比較。' },
]);
function _hlNotices(month, where, list) {
  return (list || HEALTH_NOTICES).filter(n => _hlIsYm(month) && month >= n.from && month <= n.to && n.where.indexOf(where) >= 0);
}
function _hlNoticeHtml(n) {
  return `<span class="hl-notice-txt">⚠ ${escapeHtml(n.short)}</span><details class="hl-info hl-notice-i"><summary aria-label="看完整說明" title="看完整說明">ⓘ</summary>`
    + `<div class="hl-info-body">${escapeHtml(n.text)}</div></details>`;
}
// 淨利表「成長分析」門檻現值（同一份設定；讀不到 ⇒ null，標籤顯示「讀不到門檻」，不自己補一份數字）
function _hlGrowthThresh() {
  try {
    if (typeof window.getGrowthThresh !== 'function') return null;
    const t = window.getGrowthThresh() || {}, rise = Number(t.risePct), fall = Number(t.fallPct);
    return isFinite(rise) && isFinite(fall) ? { rise: rise / 100, fall: fall / 100, risePct: rise, fallPct: fall } : null;
  } catch { return null; }
}
// 商品毛利率：蝦皮＝淨利表毛利 ÷ 營收；MOMO／PChome＝(營收 − 成本) ÷ 營收。沒成本、營收 ≤ 0 ⇒ null
function _hlRowGm(r) {
  if (!r || !(r.rev > 0) || !r.costKnown) return null;
  if (_hlFinite(r.gross)) return r.gross / r.rev;
  if (_hlFinite(r.cost)) return (r.rev - r.cost) / r.rev;
  return null;
}
// 某通路某月拿來算標籤的商品列：{ state, rows|null, why }。state 不是 ready ⇒ 還在等；rows null ⇒ 那個月沒有整月資料
function _hlTagMonth(ch, m, snap) {
  const p = _hlProdOf(ch, m, snap);
  if (p.state !== 'ready') return { state: p.state };
  const s = p.snap;
  if (s.status !== 'ok') return { state: 'ready', rows: null, why: s.status, snap: s };
  if (ch.prod.platform === 'shopee' && !(Array.isArray(s.halves) && s.halves.length === 1 && s.halves[0] === 'full')) return { state: 'ready', rows: null, why: 'half', snap: s };
  return { state: 'ready', rows: s.rows, snap: s };
}
// 一個商品的標籤（純函式）。r＝本月、pr＝上月同一個商品（沒有＝null）、gmPrev＝前 3 個月有資料的毛利率、T＝成長門檻
function _hlProductTags(r, pr, gmPrev, T, platform, rules) {
  const G = (rules || HEALTH_TAG_RULES).gm, tags = [];
  const add = (k, label, light, title) => tags.push({ k, label, light, title });
  const thr = `爆發品門檻 > +${T.risePct}%、重跌品門檻 < −${T.fallPct}%（淨利表成長分析）`;
  if (pr && pr.rev > 0) {
    const g = (r.rev - pr.rev) / pr.rev;
    add('rev', '營收', g > T.rise ? 'green' : g < -T.fall ? 'red' : 'gray', `營收比上月 ${_hlFmtGrowth(g)}；${thr}`);
  }
  if (r.costKnown && _hlFinite(r.profit)) {
    if (r.profit < 0) add('pure', '純利', 'red', `這個月賠錢（純利 ${_hlFmtMoney(r.profit)}）`);
    else if (pr && pr.costKnown && _hlFinite(pr.profit) && pr.profit > 0) {
      const g = (r.profit - pr.profit) / pr.profit;
      add('pure', '純利', g > T.rise ? 'green' : g < -T.fall ? 'red' : 'gray', `純利比上月 ${_hlFmtGrowth(g)}；${thr}`);
    }
  }
  const gm = _hlRowGm(r);
  if (gm != null && gmPrev.length >= G.minMonths) {
    const avg = gmPrev.reduce((a, x) => a + x, 0) / gmPrev.length;
    const bp = Math.round((gm - avg) * 10000), f = Math.round(G.flat * 10000), w = Math.round(G.warn * 10000);   // 用萬分點比，避免小數誤差
    const light = bp >= f ? 'green' : bp > -f ? 'gray' : bp >= -w ? 'yellow' : 'red';
    add('gm', '毛利率', light, `毛利率 ${_hlFmtPct(gm)}，前 ${gmPrev.length} 個月平均 ${_hlFmtPct(avg)}（${_hlFmtPp(gm - avg)}）`
      + (light === 'red' ? '；低很多，可能是進價漲了' : ''));
  }
  if (platform === 'shopee' && _hlAdsLossHit(r)) add('ads', '廣告', 'red', `廣告致虧：不投廣告本來會賺，投了變賠（廣告費 ${_hlFmtMoney(r.adsFee)}）`);
  if (platform !== 'shopee' && _hlDeadLongHit(r, pr)) add('dead', '動銷', 'red', '上架中，這個月和上個月都沒賣出（連續零動銷）');
  return tags;
}
// 某通路某月的商品標籤（純函式）。回 { status, reason, thresh, items, good:[前 N], bad:[前 N], goodN, badN, prevMissing }
//   good／bad／goodN／badN 只算 eligible（本月或上月營收 ≥ minRev）的商品；items 是全部有燈的商品（各帶 eligible）。
//   status：ok／na（沒有商品層）／loading／notLoaded／timeout／none（這個月沒有整月商品資料）／nothresh（讀不到成長分析門檻）
//   items 每個商品帶算標籤用的原始數字（Console 對帳用）：rev／prevRev／profit／prevProfit／gm／gmAvg／gmPrev（＋gmMonths 對應月份）／revG。
const _hlTagMemo = {};
function healthProductTags(ch, month, snap, rules) {
  if (!ch || !ch.prod) return { status: 'na', reason: '這個通路沒有商品層資料' };
  const TR = rules || HEALTH_TAG_RULES, W = TR.gm.window;
  const ms = [];
  for (let i = 0; i <= W; i++) ms.push(_hlTagMonth(ch, _hlAddMonth(month, -i), snap));
  const wait = ms.find(x => x.state !== 'ready');
  if (wait) return { status: wait.state === 'off' || wait.state === 'na' ? 'na' : wait.state, reason: '' };
  if (!ms[0].rows) return { status: 'none', reason: ms[0].why === 'half' ? '這個月還沒有整月報表（商品標籤只看整月）' : '這個月沒有商品資料' };
  const T = _hlGrowthThresh();
  if (!T) return { status: 'nothresh', reason: '讀不到淨利表「成長分析」的門檻（profit.js 沒載入）' };
  const memoK = ch.id + '|' + month, sig = JSON.stringify(T), refs = ms.map(x => x.snap);
  const hit = _hlTagMemo[memoK];
  if (hit && hit.rules === TR && hit.sig === sig && hit.refs.every((x, i) => x === refs[i])) return hit.res;
  const pk = r => r.key + '|' + (r.sub || '');
  const maps = ms.map(x => { const o = {}; (x.rows || []).forEach(r => { o[pk(r)] = r; }); return o; });
  const items = [];
  ms[0].rows.forEach(r => {
    const k = pk(r), pr = ms[1].rows ? (maps[1][k] || null) : null;
    const gmPrev = [], gmMonths = [];
    for (let i = 1; i <= W; i++) { const g = _hlRowGm(maps[i][k]); if (g != null) { gmPrev.push(g); gmMonths.push(_hlAddMonth(month, -i)); } }
    const tags = _hlProductTags(r, pr, gmPrev, T, ch.prod.platform, TR);
    if (!tags.length) return;
    const g = tags.filter(t => t.light === 'green').length, red = tags.filter(t => t.light === 'red').length;
    items.push({ key: r.key, sub: r.sub || null, name: r.name, rev: r.rev, profit: r.costKnown && _hlFinite(r.profit) ? r.profit : null,
      prevRev: pr ? pr.rev : null, prevProfit: pr && pr.costKnown && _hlFinite(pr.profit) ? pr.profit : null,
      revG: pr && pr.rev > 0 ? (r.rev - pr.rev) / pr.rev : null,
      pureRate: r.costKnown && _hlFinite(r.profit) && r.rev > 0 ? r.profit / r.rev : null,
      gm: _hlRowGm(r), gmPrev, gmMonths, gmAvg: gmPrev.length ? gmPrev.reduce((a, x) => a + x, 0) / gmPrev.length : null,
      tags, green: g, red });
  });
  const by = n => (a, b) => (b[n] - a[n]) || (b.rev - a.rev) || (pk(a) < pk(b) ? -1 : pk(a) > pk(b) ? 1 : 0);
  items.forEach(x => { x.eligible = x.rev >= TR.minRev || (_hlFinite(x.prevRev) && x.prevRev >= TR.minRev); });
  const pool = items.filter(x => x.eligible);
  const good = pool.filter(x => x.green > x.red).sort(by('green')), bad = pool.filter(x => x.red > x.green).sort(by('red'));
  const res = { status: 'ok', reason: '', thresh: T, items, good: good.slice(0, TR.topN), bad: bad.slice(0, TR.topN), goodN: good.length, badN: bad.length,
    prevMissing: !ms[1].rows };
  _hlTagMemo[memoK] = { rules: TR, sig, refs, res };
  return res;
}

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

// v5 級距：v 用畫面顯示的 0.1% 精度跟各分數線比（剛好 20.0% ⇒ 達到 20% 線）。
//   2026-11-03 確認維持這樣：原始值 19.96% 畫面寫 20.0%、得 80 分（不改成用沒四捨五入的原始值比）。lines＝[100 分線, 80 分線, 60 分線]，都沒達到 ⇒ 0。
function _hlTier(v, lines, tiers) {
  const x = Math.round(v * 1000);
  for (let i = 0; i < lines.length; i++) if (x >= Math.round(lines[i] * 1000)) return tiers[i];
  return 0;
}
// v5 計分項目：從面向（取值口徑＝畫面上的數字）拿原始值，依通路類型的分數線給級距分。
//   status：ok／nostd（標準未設定）／其他沿用子指標狀態（pending、smallRev、insufficient、loading、notLoaded、timeout、na…）。
function _hlScoreItems(ch, dims, R) {
  return R.score.items.map(it => {
    const lines = _hlLinesFor(it, ch);
    const d = dims.find(x => x.key === it.dim), s = d ? d.subs.find(x => x.key === it.key) : null;
    const out = { key: it.key, label: it.label, short: it.short, w: it.w, provisional: !!it.provisional, lines, raw: s && _hlFinite(s.raw) ? s.raw : null, score: null };
    if (!lines) return Object.assign(out, { status: 'nostd', reason: '標準未設定' });
    if (!s || s.status !== 'ok' || !_hlFinite(s.raw)) return Object.assign(out, { status: s ? s.status : 'na', reason: s ? s.reason : '' });
    return Object.assign(out, { status: 'ok', reason: '', score: _hlTier(s.raw, lines, R.score.tiers) });
  });
}
// 計分項目的一句話（回歸指紋 data-hl-fp 的「各項 title」用；格式同以前的面向 title：「純利率 80 分」或「動銷率：標準未設定」）
function _hlItemTip(it) {
  return it.status === 'ok' ? `${it.label} ${it.score} 分` : `${it.label}：${it.reason || _HL_STATUS_TEXT[it.status] || it.status}`;
}
const _HL_WAIT_ITEM = { loading: 'prodLoading', notLoaded: 'prodIdle', timeout: 'prodTimeout' };

// 🔴 一個通路一個月的健檢。純函式：同樣的 (ch, month, snap, rules) 一定得到同樣的結果。
//   v5：總分只看 R.score 的兩項（純利率、動銷率，級距分、各占權重）。只算計分用得到的面向（獲利、商品結構），
//   成長、廣告效率不再在這裡算（函式留著，之後做商品標籤用）。
//   - 純利率沒有分數（標準未設定、營收過小、KPI 未填、資料不足）⇒ 沒有總分（列到「未評分」）。
//   - 動銷率有標準、但還在等商品層 ⇒ 先不給總分（載入中）；動銷率沒標準或沒資料 ⇒ 總分＝純利率分數（pureOnly，卡片標「只看純利率」）。
//   - 蝦皮的動銷率讀整月商品表現（_hlShopeeStApply），不等商品層：沒有標準 ⇒ 顯示數字、不給分；有標準 ⇒ 只等這份小文件。
//   回 { id, label, type, month, status, reason, score, light, isReference, ranked, dimsUsed:N, dimsTotal:M, dims:[…], next:[…], topReason, fill }
//   沒傳 rules ⇒ 用這個月適用的標準（healthRulesForMonth，版本清單從 snap.healthRuleVersions 來）。
function computeChannelHealth(ch, month, snap, rules) {
  const R = rules || healthRulesForMonth(month, snap && snap.healthRuleVersions);
  const base = { id: ch.id, label: ch.label, type: ch.type, month, rulesVersion: R.version, rulesFrom: R.from || R.firstMonth, next: [], isReference: false, pureOnly: false };
  const c = _hlCell(snap, month, ch);
  const closedFrom = _hlClosedFrom(snap, ch);
  if ((c && c.closed) || (closedFrom && month >= closedFrom)) {
    return Object.assign(base, { status: 'closed', reason: `已關站（${_hlYmLabel(closedFrom)} 起）`, score: null, light: 'none',
      ranked: false, dimsUsed: 0, dimsTotal: 0, dims: [], items: [], topReason: '', fill: c ? c.fill : null });
  }
  const dimKeys = R.score.items.map(it => it.dim).filter((k, i, a) => a.indexOf(k) === i);
  const dims = dimKeys.map(k => _HL_DIM_FNS[k](ch, month, snap, R));
  const items = _hlScoreItems(ch, dims, R);
  const pure = items.find(it => it.key === 'pureRate');
  const counts = { dimsUsed: items.filter(it => it.status === 'ok').length, dimsTotal: items.filter(it => it.lines).length };
  const common = Object.assign(counts, { dims, items, topReason: _hlTopReason(dims), fill: c ? c.fill : null });
  // 純利率沒有分數 ⇒ 沒有總分（狀態＝純利率的狀態：標準未設定、營收過小、尚未上傳、資料不足）
  if (!pure || pure.status !== 'ok') {
    return Object.assign(base, common, { status: pure ? pure.status : 'insufficient', reason: pure ? pure.reason : '', score: null, light: 'none', ranked: false });
  }
  // 只等計分用得到的資料：動銷率有標準、還在等商品層 ⇒ 先不給總分（不先用純利率算一個之後會變的分數）
  const wait = items.find(it => it.lines && _HL_WAIT_ITEM[it.status]);
  if (wait) {
    const st = _HL_WAIT_ITEM[wait.status];
    const reason = st === 'prodLoading' ? (wait.reason || '商品資料載入中…') : st === 'prodIdle' ? '商品資料尚未載入（手機請展開卡片按「載入商品資料」）' : HL_TIMEOUT_MSG;
    return Object.assign(base, common, { status: st, reason, score: null, light: 'none', ranked: false });
  }
  const ok = items.filter(it => it.status === 'ok');
  const sw = ok.reduce((a, it) => a + it.w, 0);
  const score = ok.reduce((a, it) => a + it.score * it.w, 0) / sw;
  return Object.assign(base, common, {
    status: 'ok', reason: '', score, light: _hlLight(score, R), ranked: ch.ranked !== false,
    pureOnly: ok.length === 1,
  });
}

// 近 n 個月走勢（含 month 本身，舊→新）。沒傳 rules ⇒ 每個月各用自己適用的標準（computeChannelHealth 自己查）。
function computeHealthTrend(ch, month, n, snap, rules) {
  const out = [];
  const first = (rules || HEALTH_RULES).firstMonth;
  for (let i = n - 1; i >= 0; i--) {
    const m = _hlAddMonth(month, -i);
    if (m < first) continue;
    out.push(computeChannelHealth(ch, m, snap, rules));
  }
  return out;
}

/* ---------- 評分標準視窗的「近 6 月」參考值（#426）：只給人看，不參與分數、不寫任何資料 ----------
 *   期間＝已結束的最近 6 個月（固定，不隨「從哪個月開始適用」變動）。
 *   平均＝Σ分子 ÷ Σ分母（純利 ÷ 營收、有賣出 ÷ 在架；個別通路列、類型列同一個公式）；最低～最高＝逐月的值。
 *   數字走 computeChannelHealth，跟卡片同一套：KPI 未填完、資料不足、關站的月份不算進去，原因沿用畫面文字。
 *   營收未滿 minRev 的月份不計分：一列裡有計分月份就只用計分月份；一個都沒有才改用這些月份，整格灰字標「僅供參考」（只影響這一欄，分數不變）。
 *   動銷率有自己的資料來源：KPI 未填完不影響它；只有 KPI 填完且營收未滿 minRev 才算「不計分」。 */
const HL_STD_HIST_N = 6;
const _HL_STD_WAIT = ['loading', 'timeout', 'notLoaded'];   // 動銷率還在等資料的狀態（前面的優先顯示）
function _hlStdHistMonths(todayYm, n) {
  const N = n || HL_STD_HIST_N, end = _hlAddMonth(todayYm, -1), out = [];
  for (let i = N - 1; i >= 0; i--) {
    const m = _hlAddMonth(end, -i);
    if (m >= HEALTH_RULES.firstMonth) out.push(m);
  }
  return out;
}
const _hlStdSub = (r, dim, key) => { const d = (r.dims || []).find(x => x.key === dim); return d ? d.subs.find(x => x.key === key) : null; };
// 一個通路一個月的純利率。r＝computeChannelHealth 的結果。回 { month, ok, ref, closed, na, wait, num?, den?, reason? }：
//   ok＝計分月份；ref＝營收未滿 minRev（有數字、不計分）；closed／na＝這個月跟這家通路無關，不算「缺」。
function _hlStdPureMonth(ch, month, snap, r) {
  const base = { month, ok: false, ref: false, closed: false, na: false, wait: null };
  if (r.status === 'closed') return Object.assign(base, { closed: true, reason: r.reason });
  const s = _hlStdSub(r, 'profit', 'pureRate'), t = s && s.trace;
  if (s && s.status === 'ok' && t && _hlFinite(t.num) && _hlFinite(t.den) && t.den > 0) return Object.assign(base, { ok: true, num: t.num, den: t.den });
  const c = s && s.status === 'smallRev' ? _hlCell(snap, month, ch) : null;
  if (c && _hlFinite(c.pure) && _hlFinite(c.rev) && c.rev > 0) return Object.assign(base, { ref: true, num: c.pure, den: c.rev, reason: s.reason });
  return Object.assign(base, { reason: (s && s.reason) || '沒有資料' });
}
// 一個通路一個月的動銷率。分子分母是 _hlStructureDim／_hlShopeeStApply 算分時留下的 stCount（_hlStCount）。
function _hlStdSellMonth(ch, month, snap, r) {
  const base = { month, ok: false, ref: false, closed: false, na: false, wait: null };
  if (r.status === 'closed') return Object.assign(base, { closed: true, reason: r.reason });
  const s = _hlStdSub(r, 'structure', 'sellThrough');
  if (!s || s.status === 'na') return Object.assign(base, { na: true, reason: (s && s.reason) || '不適用' });
  const n = s.stCount;
  if (s.status === 'ok' && n && _hlFinite(n.num) && _hlFinite(n.den) && n.den > 0) {
    const p = _hlStdSub(r, 'profit', 'pureRate');
    return p && p.status === 'smallRev' ? Object.assign(base, { ref: true, num: n.num, den: n.den, reason: p.reason }) : Object.assign(base, { ok: true, num: n.num, den: n.den });
  }
  if (_HL_STD_WAIT.indexOf(s.status) >= 0) return Object.assign(base, { wait: s.status, reason: s.reason });
  return Object.assign(base, { reason: s.reason || '沒有資料' });
}
// 合計一組通路（一家＝個別通路列；多家＝類型列）。perCh＝[{ label, rows:[_hlStdPureMonth／_hlStdSellMonth 的結果，順序同 months] }]。
//   一個月至少一家有數字才算進去；有數字的家數不足時 monthly 帶 missing。全部沒數字 ⇒ 進 excluded。關站、不適用的通路不算「缺」。
//   整列都沒有計分月份、但有營收未滿 minRev 的月份 ⇒ 改用那些月份，refOnly:true。有任何一家還在等資料 ⇒ wait（畫面不先算部分平均）。
function _hlStdHistAgg(perCh, months) {
  const monthly = [], excluded = [];
  let num = 0, den = 0;
  const all = perCh.reduce((a, p) => a.concat(p.rows), []);
  const refOnly = !all.some(r => r.ok) && all.some(r => r.ref);
  const wait = _HL_STD_WAIT.find(w => all.some(r => r.wait === w)) || null;
  const waitRow = wait ? all.find(r => r.wait === wait) : null;
  const use = r => r.ok || (refOnly && r.ref);
  months.forEach((m, i) => {
    const rs = perCh.map(p => Object.assign({ label: p.label }, p.rows[i]));
    const ok = rs.filter(use), missing = rs.filter(r => !use(r) && !r.closed && !r.na);
    if (!ok.length) {
      const reason = missing.length === 0 ? ((rs[0] && rs[0].reason) || '沒有資料')
        : perCh.length === 1 ? missing[0].reason : missing.map(r => `${r.label}：${r.reason}`).join('；');
      excluded.push({ month: m, reason });
      return;
    }
    const n = ok.reduce((a, r) => a + r.num, 0), d = ok.reduce((a, r) => a + r.den, 0);
    num += n; den += d;
    monthly.push({ month: m, rate: n / d, num: n, den: d, chN: ok.length, chTotal: ok.length + missing.length,
      missing: missing.map(r => ({ label: r.label, reason: r.reason })) });
  });
  const rates = monthly.map(x => x.rate);
  return { months: months.slice(), monthly, excluded, n: monthly.length, num, den, rate: den > 0 ? num / den : null,
    min: rates.length ? Math.min(...rates) : null, max: rates.length ? Math.max(...rates) : null,
    refOnly, wait, waitReason: waitRow ? waitRow.reason : '' };
}
// 全部列的歷史。回 { pureRate:{ 'c|通路 id':歷史, 't|類型':歷史 }, sellThrough:{…} }（每個通路每個月只算一次 computeChannelHealth）。
function healthStdHistoryAll(months, snap, channels) {
  const chs = channels || HEALTH_CHANNELS;
  const per = chs.map(ch => ({ ch, label: ch.label, results: months.map(m => computeChannelHealth(ch, m, snap)) }));
  const build = fn => {
    const rows = per.map(p => ({ ch: p.ch, label: p.label, rows: p.results.map((r, i) => fn(p.ch, months[i], snap, r)) }));
    const out = {};
    rows.forEach(p => { out['c|' + p.ch.id] = _hlStdHistAgg([p], months); });
    Object.keys(HEALTH_RULES.types).forEach(t => { out['t|' + t] = _hlStdHistAgg(rows.filter(p => p.ch.type === t), months); });
    return out;
  };
  return { pureRate: build(_hlStdPureMonth), sellThrough: build(_hlStdSellMonth) };
}
// 歷史 → 畫面文字。沒傳（資料還沒就緒）或還在等資料 ⇒ 不先算部分平均；全缺 ⇒ 「—」。回 { line1, line2, tip, ref }。itemKey＝'pureRate'（預設）或 'sellThrough'。
function _hlStdHistText(h, itemKey) {
  if (!h || h.wait === 'loading') return { line1: '載入中', line2: '', tip: '', ref: false };
  if (h.wait === 'notLoaded') return { line1: '未載入', line2: '商品資料尚未載入', tip: h.waitReason || '', ref: false };
  if (h.wait === 'timeout') return { line1: '載入逾時', line2: '', tip: h.waitReason || '', ref: false };
  const sell = itemKey === 'sellThrough';
  const pct1 = v => (v * 100).toFixed(1);
  const range = h.months.length ? `${_hlYmLabel(h.months[0])}～${_hlYmLabel(h.months[h.months.length - 1])}` : '';
  const small = `營收未滿 ${HEALTH_RULES.minRev / 10000} 萬，不計分`;
  const lines = [`近 6 月（${range}）：${sell ? '有賣出合計 ÷ 在架合計' : '純利合計 ÷ 營收合計'}`];
  if (h.refOnly) lines.push(`僅供參考：這幾個月${small}`);
  h.monthly.forEach(x => {
    const part = x.chN < x.chTotal ? `，${x.chN}／${x.chTotal} 家；${x.missing.map(r => `${r.label}：${r.reason}`).join('；')}` : '';
    const nd = sell ? `有賣出 ${x.num} ÷ 在架 ${x.den}` : `純利 ${_hlFmtMoney(x.num)} ÷ 營收 ${_hlFmtMoney(x.den)}`;
    lines.push(`${_hlYmLabel(x.month)}　${_hlFmtPct(x.rate)}（${nd}${part}）`);
  });
  if (h.excluded.length) {
    lines.push('沒算進去：');
    h.excluded.forEach(x => lines.push(`${_hlYmLabel(x.month)}　${x.reason}`));
  }
  const tip = lines.join('\n');
  // 格子只放一行：平均（粗體）＋範圍（灰色小字）＋不是 6 個月才寫「n 個月」；原本格子裡的完整文字（line1／line2）放在提示最上面。
  const nNote = h.n === HL_STD_HIST_N ? '' : `${h.n} 個月`;
  const withFull = (l1, l2) => `${l1}\n${l2}\n\n${tip}`;
  if (!h.n) return { line1: '—', line2: '0 個月', avg: '—', range: '', nNote: '0 個月', tip, ref: false };
  if (h.refOnly) {
    const l1 = `平均 ${_hlFmtPct(h.rate)}`, l2 = `僅供參考・${small}・${h.n} 個月`;
    return { line1: l1, line2: l2, avg: _hlFmtPct(h.rate), range: '', nNote: '', refNote: '僅供參考', tip: withFull(l1, l2), ref: true };
  }
  const l1 = `平均 ${_hlFmtPct(h.rate)}`, l2 = h.n === 1 ? '1 個月' : `${pct1(h.min)}～${pct1(h.max)}・${h.n} 個月`;
  return { line1: l1, line2: l2, avg: _hlFmtPct(h.rate), range: h.n === 1 ? '' : `${pct1(h.min)}–${pct1(h.max)}`, nNote, tip: withFull(l1, l2), ref: false };
}
// 動銷率「近 6 月」的 ⓘ 文案（依這一列的資料來源）。'c|通路 id' 或 't|類型'；這一列沒有商品資料 ⇒ ''。
const HL_STD_BIAS_SHOPEE = '蝦皮的商品狀態是報表匯出當下的狀態，不是當月的。補傳的舊月份，在架數可能跟當時實際不同，月份越舊越不準，只當參考。';
const HL_STD_BIAS_STATE = '只有目前的上下架狀態，舊月份的分母也是今天的上架狀態，月份越舊越不準。';
function _hlStdBiasText(histKey) {
  const [kind, id] = String(histKey).split('|');
  const chs = HEALTH_CHANNELS.filter(ch => ch.prod && (kind === 'c' ? ch.id === id : ch.type === id));
  if (!chs.length) return '';
  return chs.some(ch => ch.prod.platform === 'shopee') ? HL_STD_BIAS_SHOPEE : HL_STD_BIAS_STATE;
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

// 總覽排序：類型 order → 類型內 正式分高→低 → 參考分 → 沒分數；業外、官網固定在最後（官網不論有沒有關站都是最後一個）。
function _hlSortResults(results, rules) {
  const R = rules || HEALTH_RULES;
  const tier = r => (r.status === 'closed' ? 3 : r.score == null ? 2 : r.isReference ? 1 : 0);
  const typeOrd = r => (r.status === 'closed' ? 99 : (R.types[r.type] || {}).order || 50);
  const last = r => (r.id === 'website' ? 2 : r.id === 'other' ? 1 : 0);   // 2026-11-05：業外倒數第二、官網不論有沒有關站都固定最後
  return results.slice().sort((a, b) => (last(a) - last(b)) || (typeOrd(a) - typeOrd(b)) || (tier(a) - tier(b))
    || ((b.score || 0) - (a.score || 0)) || (a.id < b.id ? -1 : 1));
}

// 百分位（nearest-rank）。回 { n, p10, p25, p50, p75 }；空陣列全 null。
function _hlPercentiles(vals) {
  const a = vals.filter(_hlFinite).sort((x, y) => x - y);
  const p = q => a.length ? a[Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1))] : null;
  return { n: a.length, p10: p(0.10), p25: p(0.25), p50: p(0.50), p75: p(0.75) };
}

// 回測（純函式）：逐通路逐月算原始值與分數；另依類型算各子指標的百分位。vals＝原始數字（校準 healthCalibrate 用）。
//   raws＝每列計分項目的原始值（沒四捨五入）、得分、分數線（Console 對邊界用，不印出來）。
//   呼叫端明確傳 rules ⇒ 全部月份都用那份；沒傳 ⇒ 每個月各用自己適用的標準。
function healthBacktest(snap, months, channels, rules) {
  const rows = [], vals = {}, raws = [];
  (channels || HEALTH_CHANNELS).forEach(ch => months.forEach(m => {
    const R = rules || healthRulesForMonth(m, snap && snap.healthRuleVersions);
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
    (r.items || []).forEach(it => { row[it.label + '得分'] = it.status === 'ok' ? String(it.score) : it.status; });   // v5 計分項目
    row.總分 = r.score == null ? '—' : _hlFmtScore(r.score) + (r.isReference ? '（參考）' : '');
    rows.push(row);
    raws.push({ 通路: ch.label, 月: m, 狀態: r.status, 總分: r.score, items: (r.items || []).map(it => ({ key: it.key, label: it.label, raw: it.raw, score: it.score, status: it.status, lines: it.lines })) });
  }));
  const pct = Object.keys(vals).map(k => {
    const v = vals[k], q = _hlPercentiles(v.xs), f = x => _hlFmtRaw(x, v.unit);
    return { 類型: v.類型, 子指標: v.子指標, 筆數: q.n, P10: f(q.p10), P25: f(q.p25), P50: f(q.p50), P75: f(q.p75) };
  });
  return { rows, pct, vals, raws };
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

// 「看算法說明」折疊（預設收合）：5 點白話，粗體用 <b>。營收門檻、商品門檻、暫定、不算動銷率的類型都從規則產生，不寫死。
//   分數線不在這裡寫（只在評分標準視窗看）。最上面一行「評分標準：X 起適用」隨選定月份變。
function _hlGuideFullHtml(rules) {
  const R = rules || HEALTH_RULES, e = escapeHtml;
  const st = R.score.items.find(it => it.key === 'sellThrough');
  const noSt = Object.keys(R.types).sort((a, b) => R.types[a].order - R.types[b].order).filter(_hlNoSellThrough).map(t => R.types[t].label);
  const minRev = _hlFmtMoney(HEALTH_TAG_RULES.minRev).replace('$', '');
  const pts = [
    '<b>純利率</b>＝純利 ÷ 營收；<b>毛利率</b>＝（營收 − 商品成本）÷ 營收。都取 KPI 月結（整月，跟財務對得上）。',
    `<b>動銷率</b>＝這個月有賣出的商品 ÷ 在架商品。蝦皮用洞察表「整月商品表現」，MOMO、PChome 跟各自的淨利表同一套算法${noSt.length ? `；${e(noSt.join('、'))}不算動銷率` : ''}。`,
    `上架狀態是<b>匯出當下／現在</b>的，不是當月的，所以舊月份的動銷率只當參考。${st && st.provisional ? '動銷率分數線目前是<b>暫定</b>。' : ''}`,
    `<b>不給分的情況</b>：標準未設定、KPI 還沒填完、資料不足、營收未滿 ${R.minRev / 10000} 萬。卡片會寫「未評分」和原因，不算 0 分。`,
    `<b>表現好／需注意商品</b>只列本月或上月營收 ${e(minRev)} 元以上的商品。`,
  ];
  return `<p class="hl-gt-from">評分標準：${e(_hlYmLabel(R.from || R.firstMonth))} 起適用</p><ol class="hl-ga-list">${pts.map(x => `<li>${x}</li>`).join('')}</ol>`;
}
// 「📖 怎麼看這頁」第一層：5 行白話；燈號、權重、分數級距、營收門檻都從規則產生。第 3 行後面的「看各通路分數線 →」由 _hlGuideModalHtml 接上。
function _hlGuideIntro(rules) {
  const R = rules || HEALTH_RULES, L = R.lights, SC = R.score, T = SC.tiers;
  const w = [...new Set(SC.items.map(it => Math.round(it.w * 100)))];
  const pure = SC.items.find(it => it.key === 'pureRate');
  const names = SC.items.map(it => it.label).join('、');
  const share = w.length === 1 ? (SC.items.length === 2 ? `${names}各占一半` : `${names}各占 ${w[0]}%`) : SC.items.map(it => `${it.label} ${Math.round(it.w * 100)}%`).join('＋');
  return [
    `分數顏色：綠 ${L.green} 以上、黃 ${L.yellow}～${L.green - 1}、紅未滿 ${L.yellow}。`,
    `總分＝${share}；只有${pure ? pure.label : '純利率'}有標準時，總分就是${pure ? pure.label : '純利率'}分數。`,
    `每項分 ${T.join('／')} 三級，都沒達到是 0 分。`,
    `沒分數的通路寫「未評分」，不算 0 分；營收未滿 ${R.minRev / 10000} 萬的通路數字是灰字，只供參考。`,
    '毛利率只顯示、不計分。',
  ];
}
// 說明彈窗：第一層 5 行；「看算法說明」預設收合（opts.openFull＝直接展開），內容＝_hlGuideFullHtml(rules)。
//   第 3 行（分數級距）後面接「看各通路分數線 →」：關掉這個視窗、用 _hlStdOpen 開評分標準視窗（_hlGuideBindInfo 綁的點擊）。
//   樣式沿用 recon-guide（App.guideHtml 同一套 class），不改共用的 modal.js。
function _hlGuideModalHtml(rules, opts) {
  const e = t => escapeHtml(t);
  const lines = _hlGuideIntro(rules).map((x, i) => `<li>${e(x)}${i === 2 ? ' <button type="button" class="hl-guide-link" data-hl-guide-std>看各通路分數線 →</button>' : ''}</li>`);
  return `<div class="recon-guide hl-guide"><ul class="hl-guide-intro">${lines.join('')}</ul>
    <details class="hl-guide-more"${opts && opts.openFull ? ' open' : ''}><summary>看算法說明</summary><div class="hl-guide-full">${_hlGuideFullHtml(rules)}</div></details>
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
//   哪個通路按了「顯示全部待處理」、哪個通路展開了「已調整 N 個」
const _hlState = { month: null, open: null, pendingOpen: false, scoreOpen: false, scrollTo: null, todoAll: null, doneOpen: null, metOpen: null, metCols: null, tagsMore: {} };
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
  snap.healthRuleVersions = _hlRuleVersionsNow();   // 塊 3：純函式只讀 snap.healthRuleVersions，不碰 window
  snap.shopeePerf = _hlSp.cache;   // 蝦皮整月商品表現：純函式只讀這份，內容由 _hlSpWant 填
  return snap;
}
// ── 蝦皮整月商品表現（shopee_perf_month）：要用才讀，同一個「通路|月份」只讀一次（「↻ 重新計算」清掉重讀）──
//   _hlSp.cache['好麻吉|2026-10']＝{ state:'loading'|'none'|'ok'|'failed', normal, soldNormal }，不留 items。
//   只讀 __cloudShopeePerf.getDoc；讀到本機快取當讀取失敗（不能拿快取當雲端現值）。getDoc 是非同步，不會在 render 當下回呼，所以不會遞迴；
//   這一批全部回來才重畫一次，不會一家重畫一次。模擬模式不碰雲端（全部當沒上傳）。
const _HL_SP_SHOPS = HEALTH_CHANNELS.filter(_hlStFromPerf).map(ch => ch.shop);
const _hlSp = { cache: {}, pending: 0, gen: 0, warned: false, bound: false };
function _hlSpWarn(why) {
  if (_hlSp.warned) return;
  _hlSp.warned = true;
  console.warn('[health] 蝦皮整月商品表現讀取失敗：' + why);
}
function _hlSpReset() { _hlSp.cache = {}; _hlSp.pending = 0; _hlSp.gen++; }
// 洞察表上傳成功（marketing.js insPerfMonthSave 發 shopee-perf-saved）：清掉那一格（state 不管是什麼，尤其是 'none'）。
//   在健檢頁就重畫，viewHealth 會照 _hlSpWantView 重讀；不在健檢頁只清快取，下次進頁自然重讀。監聽在第一次要讀之前綁、只綁一次（沒讀過就沒有快取要清）。
function _hlSpOnSaved(e) {
  const d = e && e.detail;
  if (!d || !d.shop || !d.month) return;
  delete _hlSp.cache[d.shop + '|' + d.month];
  if (App.route === 'health') App.render();
}
function _hlSpWant(months, shops) {
  if (!_hlSp.bound && typeof window.addEventListener === 'function') { _hlSp.bound = true; window.addEventListener('shopee-perf-saved', _hlSpOnSaved); }
  const today = _hlTodayYm(), be = window.__cloudShopeePerf;
  (shops || _HL_SP_SHOPS).forEach(shop => months.forEach(m => {
    const k = shop + '|' + m;
    if (_hlSp.cache[k]) return;
    if (_hlMock || m < HEALTH_RULES.firstMonth || m > today) { _hlSp.cache[k] = { state: 'none' }; return; }
    if (!be || typeof be.getDoc !== 'function') { _hlSpWarn('雲端物件不在'); _hlSp.cache[k] = { state: 'failed' }; return; }
    const box = _hlSp.cache[k] = { state: 'loading' }, gen = _hlSp.gen;
    _hlSp.pending++;
    Promise.resolve().then(() => be.getDoc(shop, m)).then(snap => {
      if (!snap || typeof snap.exists !== 'function') throw new Error('讀不到文件');
      if (snap.metadata && snap.metadata.fromCache) throw new Error('連不到伺服器（讀到的是本機快取）');
      if (!snap.exists()) { box.state = 'none'; return; }
      const c = (snap.data() || {}).counts || {};
      box.state = 'ok'; box.normal = _hlFinite(c.normal) ? c.normal : 0; box.soldNormal = _hlFinite(c.soldNormal) ? c.soldNormal : 0;
    }).catch(e => { box.state = 'failed'; _hlSpWarn(String((e && e.message) || e)); }).then(() => {
      if (gen !== _hlSp.gen) return;   // 按過重新計算：這一批作廢
      _hlSp.pending--;
      if (_hlSp.pending === 0 && App.route === 'health') App.render();
    });
  }));
}
// 這次畫面要的月份：卡片要選定月份＋上個月（比上月）；展開蝦皮卡片再加逐月表與折線圖的 12 個月（只讀那一家）。
function _hlSpWantView(month, openId) {
  _hlSpWant([month, _hlAddMonth(month, -1)]);
  const ch = HEALTH_CHANNELS.find(c => c.id === openId);
  if (_hlStFromPerf(ch)) _hlSpWant(Array.from({ length: _HL_TREND_N }, (_, i) => _hlAddMonth(month, -i)), [ch.shop]);
}
// ── 評分標準版本（app/health_rules）：進健檢頁才訂閱，只訂一次（比照 inventory.js _invEnsureSub）──
//   🔴 第一次收到「伺服器來的快照」之前不算分（避免先用 BASE 算一次、再跳成新分數）。
//     快取來的快照一律不採用：離線時 SDK 可能送 exists()===false + fromCache 的空快照，採用了會把版本清掉、分數跳回 BASE。
//   訂閱出錯或 HL_RULES_WAIT_MS 還沒收到 ⇒ 退回 BASE 照常算分，頁首一行灰字、Console warn 一次；之後快照到了照樣換成新標準、重畫。
//   出錯後 Firestore 的監聽已經斷了，不自動重訂（每次重畫都重訂會一直閃載入中），重新整理頁面才會再試。
//   模擬模式（__healthMock）不碰雲端，一律當成沒有版本。
const HL_RULES_WAIT_MS = 10000;
const _hlRules = { state: 'idle', versions: [], sig: '[]', unsub: null, timer: null, warned: false, subscribing: false };
function _hlRulesWarn(why) {
  if (_hlRules.warned) return;
  _hlRules.warned = true;
  console.warn('[health] 評分標準讀取失敗，暫用預設標準：' + why);
}
function _hlRulesRerender() {
  if (!_hlRules.subscribing && App.route === 'health') App.render();   // 訂閱當下同步回呼：呼叫端 viewHealth 正在 render，重畫會遞迴
}
function _hlRulesOnSnap(data, meta) {
  if (meta && meta.fromCache) return;
  const versions = _hlRuleVersionsFromDoc(data), sig = JSON.stringify(versions);
  const changed = _hlRules.state !== 'ready' || sig !== _hlRules.sig;
  clearTimeout(_hlRules.timer);
  _hlRules.state = 'ready'; _hlRules.versions = versions; _hlRules.sig = sig;
  if (changed) _hlRulesRerender();   // includeMetadataChanges 會多送純 metadata 的快照：內容沒變不重畫
}
function _hlRulesOnErr(err) {
  _hlRulesWarn(String((err && err.message) || err));
  clearTimeout(_hlRules.timer);
  if (_hlRules.state === 'ready') return;   // 已經有伺服器資料：留著最後一份，不跳回 BASE
  _hlRules.state = 'failed';
  _hlRulesRerender();
}
function _hlRulesOnTimeout() {
  if (_hlRules.state !== 'wait') return;
  _hlRulesWarn(`${HL_RULES_WAIT_MS / 1000} 秒內沒有收到伺服器資料`);
  _hlRules.state = 'failed';
  _hlRulesRerender();
}
function _hlRulesEnsureSub() {
  if (_hlMock) return;
  if (_hlRules.state === 'idle') { _hlRules.state = 'wait'; _hlRules.timer = setTimeout(_hlRulesOnTimeout, HL_RULES_WAIT_MS); }
  if (_hlRules.unsub) return;
  const be = window.__cloudHealthRules;
  if (!be || typeof be.subscribe !== 'function') return;   // 雲端層還沒好：下次重畫再試；等太久由逾時接手
  _hlRules.subscribing = true;
  try {
    const un = be.subscribe(_hlRulesOnSnap, _hlRulesOnErr);
    _hlRules.unsub = typeof un === 'function' ? un : () => {};
  } catch (e) {
    _hlRules.unsub = () => {};
    _hlRulesOnErr(e);
  } finally {
    _hlRules.subscribing = false;
  }
}
const _hlRulesSettled = () => !!_hlMock || _hlRules.state === 'ready' || _hlRules.state === 'failed';
const _hlRulesFailed = () => !_hlMock && _hlRules.state === 'failed';
const _hlRuleVersionsNow = () => (!_hlMock && _hlRules.state === 'ready' ? _hlRules.versions : []);
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
const _hlProd = { state: {}, cache: {}, queue: [], queued: {}, running: false, pending: {} };   // pending：舊月份報表還在讀，不能快取成「沒資料」，資料事件到了再排
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
      if (el) el.outerHTML = _hlProdNoteHtml({ prodState: Object.assign({}, _hlProd.state), prodWaitSec: secs }, _hlNoteWait);
    } catch {}
  }, 5000);
}
// 🔴 桌機：打開健檢頁就在背景「依序」載入 MOMO → PChome → 蝦皮（一次一個平台，不同時拉約 10MB），載完自動重算整頁。
//   v5 起蝦皮的商品層只用在待處理商品清單（動銷率沒有分數線、不影響分數），又要 60 秒以上，所以排最後；
//   MOMO、MO+ 的動銷率要等商品層才有總分，排第一（2026-11-03）。
//   分數不能因為有沒有展開卡片而不同（2026-11-02）。手機（≤768px）不自動載，維持卡片裡的「載入商品資料」按鈕。
//   只排一次；逾時的平台按「↻ 重新計算」會回到 idle，下一次 render 再排。
const _HL_PLATFORMS = ['shopee', 'momo', 'pchome'];
const _HL_LOAD_ORDER = ['momo', 'pchome', 'shopee'];
const _HL_PLATFORM_LABEL = { shopee: '蝦皮', momo: 'MOMO', pchome: 'PChome' };
let _hlAutoRunning = false;
function _hlAutoLoad() {
  if (_hlAutoRunning || _hlIsNarrow()) return;
  if (!_HL_PLATFORMS.some(p => (_hlProd.state[p] || 'idle') === 'idle')) return;
  _hlAutoRunning = true;
  // 排在後面的平台也先標「載入中」（畫面上就是在排隊載入，不是「沒載」）；_hlEnsurePlatform 看到沒有進行中的 Promise 會真的開始載
  _HL_PLATFORMS.forEach(p => { if ((_hlProd.state[p] || 'idle') === 'idle') _hlProd.state[p] = 'loading'; });
  (async () => {
    for (const p of _HL_LOAD_ORDER) {
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
//   商品標籤（塊 4）要再往前一個月（毛利率比前 3 個月平均）：分數用得到的月份全部算完、畫面重畫之後才排（第二批），
//   分數出現的時間不會因為標籤變慢；第二批算完再重畫一次，細項的商品清單才補上。
function _hlWantProdOne(ch, m, today) {
  const k = _hlProdKey(ch.prod.platform, ch.prod.shop, m);
  if (_hlProd.cache[k] || _hlProd.queued[k] || _hlProd.pending[k]) return;
  if (m < HEALTH_RULES.firstMonth || m > today) { _hlProd.cache[k] = { status: 'none', rows: [], lastAdjust: {} }; return; }
  _hlProd.queued[k] = true; _hlProd.queue.push([ch.prod.platform, ch.prod.shop, m]);
}
// 評分標準視窗「近 6 月」要的資料：商品層多排最前面一個月（_hlStructureDim 的長期虧損要看上個月，沒排會一直是「載入中」）；蝦皮讀整月商品表現。
//   只補缺的，重複呼叫沒有成本；平台還沒載好的這次不排，載好重畫時（viewHealth → _hlStdHistRefresh）會再叫一次。
function _hlStdHistWant() {
  const today = _hlTodayYm(), months = _hlStdHistMonths(today);
  if (!months.length) return;
  const need = [_hlAddMonth(months[0], -1)].concat(months);
  HEALTH_CHANNELS.filter(ch => ch.prod && !_hlStFromPerf(ch) && _hlProd.state[ch.prod.platform] === 'ready')
    .forEach(ch => need.forEach(m => _hlWantProdOne(ch, m, today)));
  if (_hlProd.queue.length && !_hlProd.running) _hlRunQueue();
  _hlSpWant(months);
}
function _hlWantProd(month, openId) {
  const today = _hlTodayYm();
  const want = (ch, m) => _hlWantProdOne(ch, m, today);
  const ready = HEALTH_CHANNELS.filter(ch => ch.prod && _hlProd.state[ch.prod.platform] === 'ready');
  ready.forEach(ch => {
    const ms = [month, _hlAddMonth(month, -1), _hlAddMonth(month, -2)];
    if (ch.id === openId) for (let i = 3; i <= _HL_TREND_N; i++) ms.push(_hlAddMonth(month, -i));
    // 窗口模式：蝦皮舊月先併成一次範圍查詢，比一個月一個月讀省（開關關閉時是空函式）
    if (ch.prod.platform === 'shopee' && typeof window.__reportEnsureIdle === 'function') window.__reportEnsureIdle(ch.prod.shop, ms.filter(m => m >= HEALTH_RULES.firstMonth && m <= today));
    ms.forEach(m => want(ch, m));
  });
  if (!_hlProd.queue.length && !_hlProd.running) {
    ready.forEach(ch => { for (let i = 3; i <= HEALTH_TAG_RULES.gm.window; i++) want(ch, _hlAddMonth(month, -i)); });
  }
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
    delete _hlProd.queued[k];
    // 🔴 還沒讀到：不快取（畫面維持載入中），資料事件到了再排（_hlPendingFlush）
    if (raw && raw.pending) { _hlProd.pending[k] = true; _hlNextTick(step); return; }
    _hlProd.cache[k] = _hlProdNormalize(raw);
    const ms = _hlNow() - t;
    batch.n++; batch.ms += ms;
    if (!batch.slow || ms > batch.slow.ms) batch.slow = { k, ms };
    if (ms > 200) { try { console.info(`[health] 商品層 ${k} ${Math.round(ms)} ms`); } catch {} }
    _hlNextTick(step);
  };
  _hlNextTick(step);
}
// 舊月份報表到了（或讀取失敗）：等待中的重新排隊。事件短時間內可能來好幾個，收斂成一次重畫（重畫時 _hlWantProd 會排）。
let _hlPendingTimer = null;
function _hlPendingFlush() {
  if (!Object.keys(_hlProd.pending).length) return;
  clearTimeout(_hlPendingTimer);
  _hlPendingTimer = setTimeout(() => { _hlProd.pending = {}; if (App.route === 'health') App.render(); }, 300);
}
if (typeof window.addEventListener === 'function') window.addEventListener('profitDataReady', _hlPendingFlush);
// 「↻ 重新計算」：已載入平台的快照全部重算（雲端資料可能更新了）；載入狀態不動、不重新訂閱；逾時的回到 idle（桌機會自動再載一次）
function _hlProdReset() {
  _hlSpReset();
  _hlProd.cache = {}; _hlProd.queue = []; _hlProd.queued = {}; _hlProd.pending = {};
  if (typeof window.__reportClearFailed === 'function') window.__reportClearFailed();   // 舊月份讀取失敗的再試一次
  Object.keys(_hlProd.state).forEach(p => { if (_hlProd.state[p] === 'timeout') _hlProd.state[p] = 'idle'; });
}

/* ================================================================
 * ③ 畫面區
 * ================================================================ */

const _HL_STATUS_TEXT = { na: '不適用', insufficient: '資料不足', pending: '尚未上傳', smallRev: '營收過小', closed: '已關站',
  notLoaded: '尚未載入', loading: '載入中', timeout: '載入逾時', nostd: '標準未設定', readFail: '讀取失敗' };
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
    info: `動銷率＝這個月有賣出的商品 ÷ 在架商品。${HL_ST_HOW_LINES.join('')}` },
]);
// ⓘ 的共用樣子（2026-11-03）：展開後第一行只放一句白話（short），公式、來源、提醒收進下一層「看算法」，點了才展開。
function _hlInfoHtml(short, more, opts) {
  const o = opts || {};
  const moreHtml = more ? `<details class="hl-more"><summary>看算法</summary><div class="hl-more-body">${escapeHtml(more)}</div></details>` : '';
  return `<details class="hl-info${o.cls ? ' ' + o.cls : ''}"><summary aria-label="${escapeHtml(o.aria || '說明')}">ⓘ</summary><div class="hl-info-body"><div class="hl-info-short">${escapeHtml(short)}</div>${moreHtml}</div></details>`;
}
// 說明放在疑問發生的地方（塊 2 補充）：名稱旁一顆 ⓘ，點了展開一小段。沿用 details.hl-info：瀏覽器原生展開，_hlOnClick 看到它就放行、不會收合卡片或切換列。
function _hlHelpHtml(aria, lines) {
  return `<details class="hl-info hl-info-inline hl-help"><summary aria-label="${escapeHtml(aria)}" title="${escapeHtml(aria)}">ⓘ</summary><div class="hl-info-body"><ul class="hl-help-list">${lines.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div></details>`;
}
// 商品燈號怎麼判：數字一律讀 HEALTH_TAG_RULES、淨利表成長分析門檻現值（讀不到就不寫數字）
function _hlTagHelpLines() {
  const G = HEALTH_TAG_RULES.gm, TG = _hlGrowthThresh();
  const pp = v => _hlPctTrim(v).replace('%', '');
  const lights = ['green', 'gray', 'yellow', 'red'].map(l => `${HL_LIGHT_SYM[l]} ${{ green: '綠', gray: '灰', yellow: '黃', red: '紅' }[l]}＝${HL_LIGHT_TEXT[l]}`).join('、');
  const grow = TG ? `成長超過 +${TG.risePct}% 綠、下滑超過 −${TG.fallPct}% 紅、其他灰（門檻跟淨利表「成長分析」同一份）` : '依淨利表「成長分析」的門檻分綠、灰、紅（目前讀不到門檻）';
  return [
    `只看整月資料（蝦皮要有整月報表），沒資料的燈不顯示。${lights}。`,
    `營收、純利：跟上個月比，${grow}；這個月賠錢（純利 < 0）一律紅。`,
    `毛利率：跟這個商品自己前 ${G.window} 個月的平均比，高 ${pp(G.flat)} 個百分點以上綠、±${pp(G.flat)} 以內灰、低 ${pp(G.flat)}～${pp(G.warn)} 黃、低超過 ${pp(G.warn)} 紅（可能是進價漲了）。`,
    `廣告（只有蝦皮）：${HEALTH_DRAG_REASONS.adsLoss.label}，不投廣告本來會賺、投了變賠＝紅。動銷（蝦皮以外）：${HEALTH_DRAG_REASONS.deadLong.label}，上架中、這個月和上個月都沒賣出＝紅。`,
  ];
}
// 比上月與趨勢欄怎麼判：數字讀 HL_TREND_RULES、HEALTH_TAG_RULES.flat
function _hlTrendHelpLines() {
  const TR = HL_TREND_RULES, F = HEALTH_TAG_RULES.flat;
  return [
    '卡片的「比上月 +N」＝這個月總分減上個月總分，兩個月各用自己適用的評分標準；上個月沒有總分就不顯示。',
    `趨勢以選定月份往回看，依序判斷：選定月份或上個月沒資料寫「—」；連續 ${TR.streak} 個月以上同方向寫「連續 N 個月上升／下滑」；跟上個月差在持平範圍內寫「大致持平」。`,
    `都不是的話，選定月份是近 ${TR.window} 個月最高／最低寫「創 ${TR.window} 個月新高／新低」，其他寫「回升」「下滑」。`,
    `持平＝比率差 ${_hlPctTrim(F.rate).replace('%', '')} 個百分點以內、金額差 ${_hlPctTrim(F.money)} 以內。▲ 變好、▼ 變差（廣告佔比越低越好，寫「改善／變差」）；計分項目後面接本月分數。`,
  ];
}
// 百分比去掉多餘的 .0（滿分標準用：24%、0.5%、62%）
function _hlPctTrim(v) { return _hlFinite(v) ? String(Math.round(v * 1000) / 10) + '%' : '—'; }
// 一格的內容：{ text, sub, cls }。沒資料一律狀態字或「—」，不顯示 0%。
//   動銷率：沒有商品層的通路「—」；蝦皮沒上傳「尚未上傳」（子指標的 stText）；還在讀「載入中」。
function _hlOverviewCell(r, prev, col) {
  if (r.status === 'closed') return { text: '', sub: '', cls: '' };
  const find = x => { const d = x && (x.dims || []).find(y => y.key === col.pick[0]); return d ? d.subs.find(s => s.key === col.pick[1]) || null : null; };
  const s = find(r);
  if (!s) return { text: '—', sub: '', cls: 'hl-ov-off' };
  if (s.status !== 'ok' || !_hlFinite(s.raw)) {
    let t = _HL_STATUS_TEXT[s.status] || '—';
    if (col.key === 'st') t = s.stText ? s.stText : s.status === 'na' ? '—' : s.status === 'pending' ? '待上傳' : (s.status === 'loading' ? '載入中' : t);
    else if (s.status === 'na') t = '—';
    // 營收過小：text 照舊（回歸指紋用）；ref＝卡片上灰字顯示的參考數字（不計分）
    if (s.status === 'smallRev' && _hlFinite(s.refRaw)) return { text: t, ref: _hlFmtPct(s.refRaw), sub: '', cls: 'hl-ov-off', tip: `${s.reason}；數字僅供參考` };
    return { text: t, sub: '', cls: 'hl-ov-off', tip: s.stText ? s.reason : '' };
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
    closed ? '' : (r.items || []).map(_hlItemTip).join(','),   // v5：各項＝兩個計分項目（以前是各面向色塊的 title）
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
// 商品標籤還在載入時，細項清單顯示的字
const _HL_TAG_WAIT = { loading: '商品標籤載入中…', notLoaded: '商品標籤：商品資料未載入', timeout: '商品標籤：商品資料逾時' };
function _hlPtagHtml(t) {
  return `<span class="hl-ptag hl-pt-${t.light}" title="${escapeHtml(HL_LIGHT_TEXT[t.light] + '：' + t.title)}">${escapeHtml(t.label)} ${HL_LIGHT_SYM[t.light]}</span>`;
}
// 細項最上面：「★ 表現好商品（前 10）」「⚠ 需注意商品（前 10）」兩張清單（寬螢幕左右、窄螢幕上下，見 css .hl-tags-cols）。
//   精簡版：表現好清單每列只放綠燈、需注意清單只放紅燈；其他燈（另一色、灰、黃）與純利率收進該列 title。
//   欄位：商品名稱＋燈號（同一行，名稱太長截斷）、營收（萬）、營收比上月（|成長率| ≥ 999.5% 寫 >+999%）。不放品號、調整紀錄、廣告費。
//   預設顯示前 HL_TAGS_SHOW（5）名，「看全部 10 名 ▾」展開（開關記在記憶體，整頁重畫不會自己收）。數量、排序都是 healthProductTags 的，沒改。
const HL_TAGS_SHOW = 5;
function _hlTagRowHtml(it, light) {
  const nm = it.name || it.key, full = nm + (it.sub ? `（${it.sub}）` : '');
  const main = it.tags.filter(g => g.light === light), rest = it.tags.filter(g => g.light !== light);
  const tip = [full, `純利率 ${_hlFmtPct(it.pureRate)}`, rest.length ? '另有：' + rest.map(g => `${g.label} ${HL_LIGHT_SYM[g.light]}`).join('、') : ''].filter(Boolean).join('｜');
  return `<tr title="${escapeHtml(tip)}"><td class="hl-tags-item"><span class="hl-tags-name">${escapeHtml(full)}</span><span class="hl-tags-chips">${main.map(_hlPtagHtml).join('')}</span></td>
      <td class="hl-num hl-tags-rev">${escapeHtml(_hlFmtWan(it.rev))}</td>
      <td class="hl-num hl-tags-g">${escapeHtml(it.revG == null ? '—' : _hlFmtGrowth(it.revG))}</td></tr>`;
}
function _hlTagListsHtml(ch, month, snap) {
  if (!ch || !ch.prod) return '';
  const t = healthProductTags(ch, month, snap);
  if (t.status === 'na') return '';
  const minRev = _hlFmtMoney(HEALTH_TAG_RULES.minRev).replace('$', '');
  const legend = `<div class="hl-tags-legend">${['green', 'gray', 'yellow', 'red'].map(l => `<span class="hl-ptag hl-pt-${l}">${HL_LIGHT_SYM[l]} ${HL_LIGHT_TEXT[l]}</span>`).join('')}`
    + `<span class="hl-w">表現好商品只列綠燈、需注意商品只列紅燈；其他燈與純利率：滑鼠移到那一列。只列本月或上月營收 ${minRev} 元以上的商品。不計分。</span></div>`;
  const notes = _hlNotices(month, 'tags').map(n => `<div class="hl-notice">${_hlNoticeHtml(n)}</div>`).join('');
  if (t.status !== 'ok') {
    const msg = _HL_TAG_WAIT[t.status] || ('商品標籤：' + t.reason);
    return `<section class="hl-tags">${legend}${notes}<div class="hl-tags-msg">${escapeHtml(msg)}</div></section>`;
  }
  const N = HEALTH_TAG_RULES.topN, more = _hlState.tagsMore || {};
  const list = (key, title, cls, light, arr, n, none) => {
    const open = !!more[key], shown = open ? arr : arr.slice(0, HL_TAGS_SHOW);
    const btn = arr.length > HL_TAGS_SHOW
      ? `<button type="button" class="btn-ghost hl-tags-more" data-hl-act="tagsmore" data-hl-list="${key}" aria-expanded="${open ? 'true' : 'false'}">${open ? '收起 ▴' : `看全部 ${arr.length} 名 ▾`}</button>` : '';
    return `<div class="hl-tags-col">
      <div class="hl-tags-ttl ${cls}">${title}（前 ${N}）<span class="hl-w">共 ${n} 個</span>${_hlHelpHtml('商品燈號怎麼判', _hlTagHelpLines())}</div>
      ${arr.length ? `<div class="hl-tags-wrap"><table class="hl-sub hl-tags-tbl"><thead><tr><th class="hl-tags-item">商品名稱・燈號</th><th class="hl-num hl-tags-rev">營收</th><th class="hl-num hl-tags-g">營收比上月</th></tr></thead>
        <tbody>${shown.map(it => _hlTagRowHtml(it, light)).join('')}</tbody></table></div>${btn}` : `<div class="hl-tags-msg">${none}</div>`}
    </div>`;
  };
  const prevNote = t.prevMissing ? '<div class="hl-w">上個月沒有商品資料：營收、純利、動銷的燈這次判斷不了。</div>' : '';
  return `<section class="hl-tags">${legend}${notes}${prevNote}<div class="hl-tags-cols">
      ${list('good', '★ 表現好商品', 'hl-tags-good', 'green', t.good, t.goodN, '這個月沒有綠燈多於紅燈的商品')}
      ${list('bad', '⚠ 需注意商品', 'hl-tags-bad', 'red', t.bad, t.badN, '這個月沒有紅燈多於綠燈的商品')}
    </div></section>`;
}

/* ---------- 指標逐月變化表（塊 5；取代「看評分細節」與 12 個月分數走勢圖）----------
 * 列＝指標、欄＝最近 6 個月（舊→新，最右＝選的月份）。計分的兩項依該月得分上色（100／80 綠、60 黃、0 紅；沒分數＝空白）；
 * 參考指標跟前一個月比（變好綠、持平灰、變差紅；廣告佔比越低越好；持平＝HEALTH_TAG_RULES.flat）。
 * 勾選要看的指標記在這台電腦（localStorage，讀寫失敗就用預設，不上雲）。點一列＝下面展開那個指標近 12 個月折線圖。 */
const HL_MONTH_METRICS = _hlDeepFreeze([
  { key: 'pureRate', label: '純利率', scored: true, unit: 'pct' },
  { key: 'sellThrough', label: '動銷率', scored: true, unit: 'pct' },
  { key: 'grossRate', label: '毛利率', unit: 'pct', better: 'up' },
  { key: 'rev', label: '營收', unit: 'money', better: 'up' },
  { key: 'pure', label: '純利', unit: 'money', better: 'up' },
  { key: 'adsPct', label: '廣告佔比', unit: 'pct', better: 'down' },
]);
const HL_MONTH_DEFAULT = ['pureRate', 'sellThrough', 'grossRate', 'rev'];
const HL_MONTH_N = 6;
const HL_METCOLS_KEY = 'ec_health_metcols';   // 只在這台電腦（不經 Store、不上雲）
function _hlMetCols() {
  if (_hlState.metCols) return _hlState.metCols;
  let v = null;
  try { v = JSON.parse(localStorage.getItem(HL_METCOLS_KEY)); } catch { v = null; }
  const keys = HL_MONTH_METRICS.map(m => m.key);
  _hlState.metCols = Array.isArray(v) && v.every(k => keys.indexOf(k) >= 0) ? v.slice() : HL_MONTH_DEFAULT.slice();
  return _hlState.metCols;
}
function _hlSetMetCol(key, on) {
  const cur = _hlMetCols().filter(k => k !== key);
  if (on) cur.push(key);
  _hlState.metCols = HL_MONTH_METRICS.map(m => m.key).filter(k => cur.indexOf(k) >= 0);   // 照指標順序
  try { localStorage.setItem(HL_METCOLS_KEY, JSON.stringify(_hlState.metCols)); } catch {}
}
// 某指標某月的值（r＝那個月的 computeChannelHealth）。回 { v, score, status, ref? }（score／status 只有計分項目才有）
//   ref＝營收未滿 minRev 的月份（純利率、毛利率）給格子灰字顯示的參考數字；🔴 v 照舊（趨勢欄、折線圖只讀 v，判斷完全不變）。
function _hlMetricVal(ch, r, key, snap) {
  const out = _hlMetricValRaw(ch, r, key, snap);
  if (key === 'pureRate' || key === 'grossRate') {
    const s = _hlStdSub(r, 'profit', key);
    if (s && s.status === 'smallRev' && _hlFinite(s.refRaw)) out.ref = s.refRaw;
  }
  return out;
}
function _hlMetricValRaw(ch, r, key, snap) {
  if (key === 'pureRate' || key === 'sellThrough') {
    const it = (r.items || []).find(x => x.key === key);
    return { v: it && _hlFinite(it.raw) ? it.raw : null, score: it && it.status === 'ok' ? it.score : null, status: it ? it.status : 'na' };
  }
  const c = _hlCell(snap, r.month, ch);
  if (!c || c.beforeSince || c.closed || !_hlFillDone(c)) return { v: null };
  if (key === 'rev') return { v: _hlFinite(c.rev) ? c.rev : null };
  if (key === 'pure') return { v: _hlFinite(c.pure) ? c.pure : null };
  if (!(c.rev > 0)) return { v: null };
  if (key === 'grossRate') return { v: (c.rev - c.cost) / c.rev };
  if (key === 'adsPct') return { v: _hlFinite(c.ads) ? c.ads / c.rev : null };
  return { v: null };
}
// 數值本身跟前一個月比的方向：+1 上升、−1 下降、0 持平（在 HEALTH_TAG_RULES.flat 範圍內）；比不了 ⇒ null
function _hlMetricDir(def, v, pv, rules) {
  if (!_hlFinite(v) || !_hlFinite(pv)) return null;
  const F = (rules || HEALTH_TAG_RULES).flat;
  if (def.unit === 'pct') { const bp = Math.round((v - pv) * 10000); return Math.abs(bp) < Math.round(F.rate * 10000) ? 0 : Math.sign(bp); }
  const rel = pv !== 0 ? (v - pv) / Math.abs(pv) : (v === pv ? 0 : v > pv ? 1 : -1);
  return Math.abs(rel) < F.money ? 0 : Math.sign(rel);
}
// 參考指標跟前一個月比的燈號（變好綠、持平灰、變差紅；廣告佔比越低越好）；比不了 ⇒ null
function _hlMetricLight(def, v, pv, rules) {
  const d = _hlMetricDir(def, v, pv, rules);
  if (d == null) return null;
  if (d === 0) return 'gray';
  return (d > 0) === (def.better !== 'down') ? 'green' : 'red';
}
function _hlScoreLight(s) { return s == null ? null : s >= 80 ? 'green' : s >= 60 ? 'yellow' : 'red'; }
// 格子裡的短數字：比率一位小數、金額用「萬」
function _hlMetricFmt(def, v) { return v == null ? '—' : def.unit === 'pct' ? _hlFmtPct(v) : _hlFmtWan(v); }
// 比上月的變化文字（title 用）：比率寫「+1.2 個百分點」、金額寫成長率（|成長率| ≥ 999.5% 寫 >+999%）
function _hlMetricDiffText(def, v, pv) {
  if (!_hlFinite(v) || !_hlFinite(pv)) return '上個月沒有資料';
  if (def.unit === 'pct') return _hlFmtPpText(v - pv);
  return pv !== 0 ? _hlFmtGrowth((v - pv) / Math.abs(pv)) : (v === pv ? '持平' : '上個月是 0');
}
// 趨勢欄（固定規則產生的一句白話，不是 AI）。vals＝舊→新 [{ v, score }]，最後一個＝選定月份。優先順序：
//   1. 選定月份或上個月沒資料 ⇒「—」
//   2. 往回數，連續 ≥ streak 個月同方向（每個月都跟前一個月比、超出持平範圍）⇒「▲ 連續 N 個月上升」「▼ 連續 N 個月下滑」（廣告佔比：改善／變差）
//   3. 跟上個月差距在持平範圍內 ⇒「● 大致持平」
//   4. 選定月份是近 window 個月（有資料的至少 3 個月）最高／最低 ⇒「創 6 個月新高／新低」
//   5. 其他 ⇒「▲ 回升」「▼ 下滑」（廣告佔比：▲ 改善／▼ 變差）
//   計分項目（純利率、動銷率）再接「，本月 N 分」，分數跟上個月不同時加「（上月 M 分）」。
//   ▲＝變好、▼＝變差（廣告佔比越低越好，所以它下降是 ▲）。
const HL_TREND_RULES = _hlDeepFreeze({ streak: 3, window: HL_MONTH_N });
function _hlTrendText(def, vals, rules) {
  const TR = rules || HL_TREND_RULES, n = vals.length;
  const cur = vals[n - 1], prev = n > 1 ? vals[n - 2] : null;
  if (!cur || !_hlFinite(cur.v) || !prev || !_hlFinite(prev.v)) return '—';
  const down = def.better === 'down';
  const sym = d => ((d > 0) !== down ? '▲' : '▼');
  const word = (d, streak) => (down ? ((d > 0) ? '變差' : '改善') : (d > 0 ? (streak ? '上升' : '回升') : '下滑'));
  const dirs = [];   // 新→舊：選定月份比上個月、上個月比上上個月…
  for (let i = n - 1; i >= 1; i--) dirs.push(_hlMetricDir(def, vals[i].v, vals[i - 1].v));
  const last = dirs[0];
  let k = 0;
  while (k < dirs.length && last && dirs[k] === last) k++;
  let txt;
  if (last && k >= TR.streak) txt = `${sym(last)} 連續 ${k} 個月${word(last, true)}`;
  else if (last === 0) txt = '● 大致持平';
  else {
    const win = vals.slice(-TR.window).map(x => x.v).filter(_hlFinite);
    const others = win.slice(0, -1);
    if (win.length >= 3 && cur.v > Math.max(...others)) txt = `${sym(1)} 創 ${TR.window} 個月新高`;
    else if (win.length >= 3 && cur.v < Math.min(...others)) txt = `${sym(-1)} 創 ${TR.window} 個月新低`;
    else txt = `${sym(last)} ${word(last, false)}`;
  }
  if (def.scored && cur.score != null) txt += `，本月 ${cur.score} 分` + (prev.score != null && prev.score !== cur.score ? `（上月 ${prev.score} 分）` : '');
  return txt;
}
// MOMO 動銷率列下面的小字（回一行一個字串的陣列；空陣列＝不顯示：蝦皮、PChome、這個月動銷率沒有數字）。
//   第一行：口徑說明。第二行：選定月份以公司商品計的對照數字，只顯示、不計分（_hlSellThrough 的 company）。
function _hlMomoPageNote(ch, month, r, snap) {
  if (!ch.prod || ch.prod.platform !== 'momo') return [];
  const d = (r.dims || []).find(x => x.key === 'structure'), sT = d && d.subs.find(x => x.key === 'sellThrough');
  const p = _hlProdOf(ch, month, snap);
  if (!sT || sT.status !== 'ok' || !_hlFinite(sT.raw) || p.state !== 'ready') return [];
  const st = _hlSellThrough(p.snap.rows);
  const comp = st && st.company.den ? [`以公司商品計（同款不同規格算 1 個）：${_hlFmtPct(st.company.num / st.company.den)}（${st.company.num}／${st.company.den}），不計分`] : [];
  return [HL_MOMO_ST_DESC].concat(comp);
}
// 表格本體（純函式；trend＝舊→新的 computeChannelHealth，至少 HL_MONTH_N + 1 個月才比得到第一欄的前一個月）
function _hlMonthTableHtml(ch, trend, snap, cols, openKey) {
  const shown = trend.slice(-HL_MONTH_N);
  const pick = HL_MONTH_METRICS.map(d => `<label class="hl-mt-opt"><input type="checkbox" data-hl-metcol="${d.key}"${cols.indexOf(d.key) >= 0 ? ' checked' : ''}> ${escapeHtml(d.label)}</label>`).join('');
  const defs = HL_MONTH_METRICS.filter(d => cols.indexOf(d.key) >= 0);
  const head = `<tr><th>指標</th>${shown.map(r => `<th class="hl-num">${escapeHtml(_hlYmLabel(r.month))}</th>`).join('')}<th class="hl-mt-trend">趨勢</th></tr>`;
  const month = trend[trend.length - 1].month;
  const LW = { green: '變好', gray: '持平', red: '變差' };
  const rows = defs.map(d => {
    const vals = trend.map(r => _hlMetricVal(ch, r, d.key, snap));
    const off = trend.length - shown.length;
    // 每格只寫一個短數字；顏色規則不變，分數、比上月的變化放在格子的 title
    const cells = shown.map((r, i) => {
      const x = vals[off + i], px = off + i > 0 ? vals[off + i - 1] : null, pv = px ? px.v : null;
      // 營收未滿 minRev：灰字參考數字（同卡片），不上色；趨勢欄照舊只看 x.v
      if (x.ref != null) {
        const refTip = `${d.label} ${_hlYmLabel(r.month)}：${_hlFmtPct(x.ref)}｜營收未滿 ${_hlFmtMoney(HEALTH_RULES.minRev)}，不計分，僅供參考`;
        return `<td class="hl-num hl-mc hl-mc-ref" title="${escapeHtml(refTip)}">${escapeHtml(_hlFmtPct(x.ref))}</td>`;
      }
      const light = d.scored ? _hlScoreLight(x.score) : _hlMetricLight(d, x.v, pv);
      const full = x.v == null ? '沒有資料' : d.unit === 'pct' ? _hlFmtPct(x.v) : _hlFmtMoney(x.v);
      const sc = d.scored ? (x.score != null ? `得分 ${x.score} 分｜` : `沒有分數（${_HL_STATUS_TEXT[x.status] || '沒有資料'}）｜`) : '';
      const tip = `${d.label} ${_hlYmLabel(r.month)}：${full}｜${sc}比上月 ${_hlMetricDiffText(d, x.v, pv)}${!d.scored && light ? `（${LW[light]}）` : ''}`;
      return `<td class="hl-num hl-mc${light ? ' hl-mc-' + light : ''}" title="${escapeHtml(tip)}">${escapeHtml(_hlMetricFmt(d, x.v))}</td>`;
    }).join('');
    const open = openKey === d.key;
    const row = `<tr class="hl-mt-row${open ? ' open' : ''}" role="button" tabindex="0" aria-expanded="${open ? 'true' : 'false'}" data-hl-met="${d.key}">
      <th scope="row">${escapeHtml(d.label)}<span class="hl-mt-k${d.scored ? ' hl-mt-scored' : ''}">${d.scored ? '計分' : '參考'}</span></th>${cells}<td class="hl-mt-trend">${escapeHtml(_hlTrendText(d, vals))}</td></tr>`;
    // 口徑變更提醒（例：成本更新）：那一列下面一行，點 ⓘ 看完整說明
    const notes = _hlNotices(month, d.key).map(n => `<tr class="hl-mt-note"><td colspan="${shown.length + 2}"><div class="hl-notice">${_hlNoticeHtml(n)}</div></td></tr>`).join('');
    const pageNote = d.key === 'sellThrough' ? _hlMomoPageNote(ch, month, trend[trend.length - 1], snap) : [];
    return row + notes + (pageNote.length ? `<tr class="hl-mt-note"><td colspan="${shown.length + 2}">${pageNote.map(x => `<div class="hl-mt-page">${escapeHtml(x)}</div>`).join('')}</td></tr>` : '');
  }).join('');
  const openDef = defs.find(d => d.key === openKey);
  const chart = openDef ? `<div class="hl-mt-chart"><div class="hl-trend-hd">${escapeHtml(openDef.label)} 近 ${_HL_TREND_N} 個月（再點一次那一列收起）</div>
      <div class="hl-trend"><canvas id="hl-trend" aria-label="${escapeHtml(openDef.label)} 近 ${_HL_TREND_N} 個月折線圖" role="img"></canvas></div></div>` : '';
  const F = HEALTH_TAG_RULES.flat;
  const T = healthRulesForMonth(trend[trend.length - 1].month, snap && snap.healthRuleVersions).score.tiers;   // 頁尾的級距字讀選定月份的標準
  return `<section class="hl-mtable">
      <div class="hl-mt-hd">指標逐月變化（近 ${HL_MONTH_N} 個月，最右是 ${escapeHtml(_hlYmLabel(trend[trend.length - 1].month))}）${_hlHelpHtml('比上月與趨勢怎麼判', _hlTrendHelpLines())}</div>
      <div class="hl-mt-pick" role="group" aria-label="要看的指標">${pick}</div>
      ${defs.length ? `<div class="hl-mt-wrap"><table class="hl-sub hl-mt-tbl"><thead>${head}</thead><tbody>${rows}</tbody></table></div>` : '<div class="hl-tags-msg">沒有勾選指標</div>'}
      ${chart}
      <div class="hl-dim-foot">計分：依該月得分上色（${T.slice(0, 2).join('／')} 綠、${T[2]} 黃、0 紅；標準未設定或沒資料＝空白）。參考：跟前一個月比（變好綠、持平灰、變差紅；廣告佔比越低越好；持平＝比率 ±${_hlPctTrim(F.rate).replace('%', '')} 個百分點、金額 ±${_hlPctTrim(F.money)} 以內）。紅、黃格加底線。滑鼠移到格子上看分數與比上月；最右「趨勢」以選定月份往回看。點一列看近 ${_HL_TREND_N} 個月折線圖。</div>
    </section>`;
}
// 卡片總分旁「比上月 +8」：上月沒有總分就不顯示（文字取 _hlDeltaHtml，跟指紋同一份）
function _hlTileDeltaHtml(r, prev) {
  if (!prev || r.score == null || prev.score == null) return '';
  return `<span class="hl-tile-delta">比上月 ${_hlDeltaHtml(r, prev)}</span>`;
}
// 卡片三欄（卡片改版塊 1）：上＝小標「純利率／毛利率／動銷率」、中＝大字數值（狀態字灰色、小一點）、
//   下＝「▲ 上月 22.2%」（方向同塊 2 的上月邏輯；2026-11-10 起字一律灰色、只有小三角形上色，持平不顯示三角形；上月沒資料就是空行，卡片才一樣高）。任何寬度都不截斷（不用 …）。
//   營收未滿 minRev（c.ref）：中＝灰字數字、下＝「僅供參考」（同評分標準視窗「近 6 月」的灰字參考，css 共用一條規則）。
function _hlTileMetsHtml(r, prev) {
  return HL_OVERVIEW_COLS.map(col => {
    const c = _hlOverviewCell(r, prev, col);
    if (c.ref) {
      return `<span class="hl-tile-met hl-tile-met-ref"><span class="hl-tile-met-k" title="${escapeHtml(col.label + '：' + col.short)}">${escapeHtml(col.label)}</span><span class="hl-tile-met-v" title="${escapeHtml(c.tip)}">${escapeHtml(c.ref)}</span><span class="hl-tile-met-p">僅供參考</span></span>`;
    }
    const p = c.dir ? `<span class="hl-tile-met-p">${_hlTileTri(c.dir)}${escapeHtml(c.sub.replace(/^[↑↓→]s*/, ''))}</span>` : '<span class="hl-tile-met-p" aria-hidden="true"></span>';
    return `<span class="hl-tile-met${c.cls ? ' hl-tile-met-off' : ''}"><span class="hl-tile-met-k" title="${escapeHtml(col.label + '：' + col.short)}">${escapeHtml(col.label)}</span><span class="hl-tile-met-v"${c.tip ? ` title="${escapeHtml(c.tip)}"` : ''}>${escapeHtml(c.text)}</span>${p}</span>`;
  }).join('');
}
// 卡片（卡片改版塊 1）：拿掉「類型第 N」與主要扣分原因句（排名 _hlRank、原因 _hlPlainReason 照算，只是卡片上不顯示；rank 參數留著不用）。
//   商品層還在載入時沒有總分，卡片標題列的 title 放原因全文（例：仍在載入（已等 N 秒）），滑鼠移上去看得到。
//   「不排名」小標也拿掉了（排名不顯示）。沒有總分的卡片寫「未評分」＋一行原因（_hlNoScoreWhy），不算 0 分；data-hl-fp 照舊（裡面的總分文字還是 _hlScoreHtml）。
//   商品層還沒好的卡片（資料到了就會有分數）不是「未評分」：分數那格只寫灰字狀態（_HL_TILE_WAIT）。原因全文在標題列的 title。
//   版面（2026-11-10 整理，只動顯示）：第一列＝左名稱、右邊徽章（沒分數＝「未評分」或 _HL_TILE_WAIT），徽章正下方「比上月 ±N」灰字（右對齊）；
//   第二列＝靠右一行灰字（_hlTilePartsHtml）；再來金額列、三欄。卡片用 css subgrid，同一排四列各自對齊。
const _HL_TILE_WAIT = { prodLoading: '載入中…', prodIdle: '未載入', prodTimeout: '載入逾時' };
function _hlTileHtml(r, prev, rank, open, snap) {
  const tip = r.score == null && r.reason ? ` title="${escapeHtml(String(r.reason))}"` : '';
  // 右邊：上＝徽章（或「未評分」／載入中），下＝「比上月 ±N」；沒有比上月也留一個空的位置，同排卡片第一列才一樣高
  const delta = (r.score == null ? '' : _hlTileDeltaHtml(r, prev)) || '<span class="hl-tile-delta" aria-hidden="true"></span>';
  const right = (r.score == null
    ? `<span class="hl-tile-noscore">${_HL_TILE_WAIT[r.status] || '未評分'}</span>`
    : _hlTileBadgeHtml(r)) + delta;
  return `<div class="hl-tile${open ? ' open' : ''}" role="button" tabindex="0" aria-expanded="${open ? 'true' : 'false'}" data-hl-row="${escapeHtml(r.id)}" data-hl-fp="${escapeHtml(_hlFpText(r, prev))}">
      <div class="hl-tile-hd"${tip}><span class="hl-tile-name">${escapeHtml(r.label)}</span><span class="hl-tile-hd-r">${right}</span></div>
      ${_hlTilePartsHtml(r, snap)}
      ${_hlTileAmtHtml(r, snap)}
      <div class="hl-tile-mets">${_hlTileMetsHtml(r, prev)}</div>
    </div>`;
}
// 卡片「上月」小字前面的小三角形（2026-11-10）：上升 ▲ 綠、下降 ▼ 紅、持平不顯示；字本身一律灰色（css .hl-tile-tri）
function _hlTileTri(dir) {
  if (dir === 'up') return '<span class="hl-tile-tri hl-tile-tri-up" aria-label="上升">▲</span>';
  if (dir === 'down') return '<span class="hl-tile-tri hl-tile-tri-down" aria-label="下降">▼</span>';
  return '';
}
// 卡片金額列（2026-11-10，老闆要在卡片上直接看到營收、純利）：只顯示、不計分，不進 data-hl-fp。
//   數字＝純利率用的同一格 KPI（_hlCell 的 rev＝實際營收、pure＝_kpiShopPureAdj），所以 純利 ÷ 營收＝卡片上的純利率；不多讀任何資料。
//   KPI 填完、不是還沒開始（beforeSince）、不是已關站才顯示，否則「—」（沒填完時純利可能被高估）。
//   絕對值未滿 1 萬寫整數加千分位（908、−3,335），1 萬以上寫「X.X 萬」；滑鼠提示完整金額（NT$1,286,432）。
//   下面小字「▲ 上月 X」同三個比率（方向用顯示的字比，看起來一樣就是持平、不顯示三角形）；上月不能顯示就空行，卡片才等高。
//   營收未滿 minRev：兩格灰字（同比率灰字規則，負號照留、不上紅色）；純利是負數：紅字。
function _hlAmtOk(c) { return !!c && !c.beforeSince && !c.closed && _hlFillDone(c); }
function _hlFmtAmt(v) {
  const a = Math.round(Math.abs(v)), s = v < 0 && a > 0 ? '−' : '';
  if (a < 10000) return s + a.toLocaleString('en-US');
  return s + (Math.round(Math.abs(v) / 1000) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' 萬';
}
function _hlFmtAmtFull(v) { const a = Math.round(Math.abs(v)); return (v < 0 && a > 0 ? '−' : '') + 'NT$' + a.toLocaleString('en-US'); }
function _hlTileAmtHtml(r, snap) {
  const ch = HEALTH_CHANNELS.find(x => x.id === r.id);
  const c = ch && _hlIsYm(r.month) ? _hlCell(snap, r.month, ch) : null;
  const ok = _hlAmtOk(c);
  const p = ok ? _hlCell(snap, _hlAddMonth(r.month, -1), ch) : null, pOk = _hlAmtOk(p);
  const small = ok && !(c.rev >= healthRulesForMonth(r.month, snap && snap.healthRuleVersions).minRev);
  const why = !c ? '這個月沒有 KPI 資料' : c.closed ? '已關站' : c.beforeSince ? '這個月還沒有 KPI' : 'KPI 還沒填完，金額不顯示';
  const cell = (label, key) => {
    const k = `<span class="hl-tile-amt-k">${label}</span>`;
    if (!ok) return `<span class="hl-tile-amt-c">${k}<span class="hl-tile-amt-v hl-tile-amt-none" title="${escapeHtml(why)}">—</span><span class="hl-tile-amt-p" aria-hidden="true"></span></span>`;
    const v = Number(c[key]) || 0, txt = _hlFmtAmt(v);
    let sub = '<span class="hl-tile-amt-p" aria-hidden="true"></span>';
    if (pOk) {
      const pv = Number(p[key]) || 0, ptxt = _hlFmtAmt(pv);
      const dir = txt === ptxt ? 'flat' : v > pv ? 'up' : 'down';
      sub = `<span class="hl-tile-amt-p" title="上月 ${escapeHtml(_hlFmtAmtFull(pv))}">${_hlTileTri(dir)}上月 ${escapeHtml(ptxt)}</span>`;
    }
    const cls = small ? ' hl-tile-amt-ref' : (v < 0 && txt.charAt(0) === '−' ? ' hl-tile-amt-neg' : '');
    const tip = _hlFmtAmtFull(v) + (small ? `（營收未滿 ${_hlFmtMoney(healthRulesForMonth(r.month, snap && snap.healthRuleVersions).minRev)}，僅供參考）` : '');
    return `<span class="hl-tile-amt-c">${k}<span class="hl-tile-amt-v${cls}" title="${escapeHtml(tip)}">${escapeHtml(txt)}</span>${sub}</span>`;
  };
  return `<div class="hl-tile-amt">${cell('營收', 'rev')}${cell('純利', 'pure')}</div>`;
}
// 卡片第二列（2026-11-10 整理）：靠右、灰色小字、只佔一行（放不下用 …，完整文字在 title）。
//   有分數：「分數：純利率 80 · 動銷率 100」；動銷率等商品層：「分數：純利率 80 · 動銷率 載入中…」；
//   只看純利率（例：蝦皮動銷率未訂標準）：不顯示這行（空的佔位），說明改放分數徽章的 title（_hlTileBadgeHtml）；
//   未評分：放原因（_hlNoScoreWhy，例：營收未滿 $30,000）；其他（例：商品層載入中、純利率沒分數）也是空的佔位。
//   空的佔位：同一排有別張卡有這行時跟著留一行高（subgrid），整排都沒有時這一列收起來（css .hl-tile-parts:empty）。
const _HL_TILE_PARTS_EMPTY = '<div class="hl-tile-parts" aria-hidden="true"></div>';
const _HL_TILE_WAIT_ST = { loading: '載入中…', notLoaded: '未載入', timeout: '載入逾時' };
function _hlTilePartsHtml(r, snap) {
  const line = t => `<div class="hl-tile-parts" title="${escapeHtml(t)}">${escapeHtml(t)}</div>`;
  if (r.score == null && !_HL_TILE_WAIT[r.status]) return line(_hlNoScoreWhy(r, healthRulesForMonth(r.month, snap && snap.healthRuleVersions)));
  const pure = (r.items || []).find(it => it.key === 'pureRate'), st = (r.items || []).find(it => it.key === 'sellThrough');
  if (!pure || pure.status !== 'ok') return _HL_TILE_PARTS_EMPTY;
  const right = st && st.status === 'ok' ? `${st.label} ${st.score}`
    : st && st.lines && _HL_TILE_WAIT_ST[st.status] ? `${st.label} ${_HL_TILE_WAIT_ST[st.status]}` : null;
  if (right == null) return _HL_TILE_PARTS_EMPTY;   // 只看純利率：說明在徽章 title
  return line(`分數：${pure.label} ${pure.score} · ${right}`);
}
// 只看純利率的卡（純利率有分數、動銷率沒分數也不是在等商品層）→ 徽章 title「分數只看純利率（動銷率未訂標準）」；其他 → ''（判斷同 _hlTilePartsHtml）
function _hlTilePureOnlyTip(r) {
  const pure = (r.items || []).find(it => it.key === 'pureRate'), st = (r.items || []).find(it => it.key === 'sellThrough');
  if (r.score == null || !pure || pure.status !== 'ok') return '';
  if (st && (st.status === 'ok' || (st.lines && _HL_TILE_WAIT_ST[st.status]))) return '';
  return `分數只看${pure.label}（${_hlTilePureOnlyShort(r)}）`;
}
// 卡片上的分數徽章＝_hlScoreHtml（文字不變、data-hl-fp 照舊）＋只看純利率時的 title；原本就有 title（參考分）就接在說明後面
function _hlTileBadgeHtml(r) {
  const h = _hlScoreHtml(r), tip = _hlTilePureOnlyTip(r);
  if (!tip) return h;
  if (/^<span [^>]*title="/.test(h)) return h.replace('title="', `title="${escapeHtml(tip)}&#10;`);
  return h.replace('<span ', `<span title="${escapeHtml(tip)}" `);
}
// 卡片第二列括號裡的短說法：「動銷率未訂標準」「動銷率尚未上傳」「動銷率資料不足」…（判斷同 _hlPureOnlyWhy）
function _hlTilePureOnlyShort(r) {
  const st = (r.items || []).find(it => it.key === 'sellThrough');
  const label = st ? st.label : '動銷率';
  if (!st || st.status === 'nostd' || !st.lines) return `${label}未訂標準`;
  return `${label}${_HL_STATUS_TEXT[st.status] || '沒有分數'}`;
}
// 只看純利率的原因（給不懂系統的人看）：「動銷率標準未設定」「動銷率尚未上傳」「動銷率資料不足」…（狀態字同 _HL_STATUS_TEXT）
function _hlPureOnlyWhy(r) {
  const st = (r.items || []).find(it => it.key === 'sellThrough');
  const label = st ? st.label : '動銷率';
  if (!st || st.status === 'nostd' || !st.lines) return `${label}標準未設定`;
  return `${label}${_HL_STATUS_TEXT[st.status] || '沒有分數'}`;
}
// 卡片上「未評分」下面那行原因。括號裡不再套括號：「KPI 還沒填完（4/6）」→「KPI 還沒填完 4/6」
function _hlNoScoreWhy(r, R) {
  if (r.status === 'closed') return '已關站';
  if (r.status === 'smallRev') return `營收未滿 ${_hlFmtMoney(R.minRev)}`;
  return _hlShortReason(r).replace(/（([^（）]*)）$/, ' $1');
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
    case 'nostd': return '標準未設定';
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
// 細項卡片：總分圈 → 商品標籤兩張清單（塊 4）→ 指標逐月變化表（塊 5）。
//   塊 4／5 拿掉「要處理的商品」（_hlDragHtml）、「看評分細節」（_hlScoreDetailHtml）與 12 個月分數走勢圖；函式都留著。已關站的通路照舊畫分數走勢。
function _hlCardHtml(r, snap) {
  if (r.status === 'closed') {
    return `<div class="hl-card hl-card-closed">${escapeHtml(r.reason)}：不評分。走勢只畫到關站前一個月。
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
          <div class="hl-card-nm">${r.score == null ? escapeHtml(r.reason) : escapeHtml(_hlScoreHow(r))}</div>
          <div class="hl-badges">${badges.join('')}<span class="hl-badge-note">資料完整度只供參考，不算分</span></div>
        </div>
      </div>
      ${_hlProdBarHtml(ch, r.month, snap)}
      ${_hlTagListsHtml(ch, r.month, snap)}
      ${_hlShopeeStNote(ch, r)}
      ${ch ? _hlMonthTableHtml(ch, computeHealthTrend(ch, r.month, HL_MONTH_N + 1, snap), snap, _hlMetCols(), _hlState.metOpen) : ''}
      ${r.next.length ? `<div class="hl-next">之後加入：${escapeHtml(r.next.join('、'))}</div>` : ''}
    </div>`;
}
// 蝦皮這個月動銷率沒有數字時，細項裡寫一行原因（尚未上傳、讀取失敗、資料不足）
function _hlShopeeStNote(ch, r) {
  if (!_hlStFromPerf(ch)) return '';
  const d = (r.dims || []).find(x => x.key === 'structure'), st = d && d.subs.find(x => x.key === 'sellThrough');
  if (!st || st.status === 'ok' || st.status === 'loading' || st.status === 'na') return '';
  return `<div class="hl-st-note">動銷率：${escapeHtml(st.reason)}</div>`;
}
// 總分怎麼來的一句話（v5，權重從規則來）：「純利率 50%＋動銷率 50%」或「只看純利率」
function _hlScoreHow(r) {
  if (r.pureOnly) return `這個月只看純利率（${_hlPureOnlyWhy(r)}）`;
  return (r.items || []).filter(it => it.status === 'ok').map(it => `${it.label} ${Math.round(it.w * 100)}%`).join('＋');
}
// 細項「看評分細節」（v5）：只列計分的兩項——本月數值、分數線（100／80／60，達到的那一級標出來）、得分；暫定的項目標「暫定」。
//   以前的成長、廣告效率、商品結構面向表格不在這裡顯示了（面向函式還在，之後改成月份變化表）。
function _hlScoreDetailHtml(r, snap) {
  const T = healthRulesForMonth(r.month, snap && snap.healthRuleVersions).score.tiers;
  const rows = (r.items || []).map(it => {
    const val = _hlFinite(it.raw) ? _hlFmtPct(it.raw) : (_HL_STATUS_TEXT[it.status] || '—');
    const lines = it.lines
      ? it.lines.map((l, i) => `<span class="hl-tier${it.status === 'ok' && it.score === T[i] ? ' hl-tier-hit' : ''}">${T[i]} 分 ≥${escapeHtml(_hlPctTrim(l))}</span>`).join('')
        + (it.status === 'ok' && it.score === 0 ? `<span class="hl-tier hl-tier-miss">未達 ${T[T.length - 1]} 分線</span>` : '')
      : '<span class="hl-tier-none">標準未設定</span>';
    const sc = it.status === 'ok'
      ? `<span class="hl-sscore hl-l-${_hlLight(it.score)}">${it.score}</span>`
      : `<span class="hl-w">${escapeHtml(it.status === 'nostd' ? '不計分' : (_HL_STATUS_TEXT[it.status] || it.status))}</span>`;
    return `<tr><td>${escapeHtml(it.label)}<span class="hl-w">${Math.round(it.w * 100)}%</span>${it.provisional ? '<span class="hl-uncal">暫定</span>' : ''}</td>
      <td class="hl-num">${escapeHtml(val)}</td><td class="hl-tiers">${lines}</td><td class="hl-num">${sc}</td></tr>`;
  }).join('');
  const how = r.score == null ? '' : `<div class="hl-dim-foot">總分＝${escapeHtml(_hlScoreHow(r))}。分數線達到幾分就是幾分（${T.join('／')}／0），不做中間分數。</div>`;
  return `<table class="hl-sub hl-score-tbl"><thead><tr><th>計分項目</th><th class="hl-num">本月</th><th>分數線</th><th class="hl-num">得分</th></tr></thead><tbody>${rows}</tbody></table>${how}`;
}
// 商品層資料的狀態列：資料時間標章＋（還沒載／逾時時）「載入商品資料」按鈕。沒有商品層的通路回空字串。
function _hlProdBadges(ch, month, snap) {
  const p = _hlProdOf(ch, month, snap);
  if (p.state === 'na' || p.state === 'off') return [];   // off＝只算 KPI（沒有商品層狀態）
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
  return `<div class="hl-prodbar"><span>${escapeHtml(why)}動銷率分數、商品標籤要用到。</span>
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
    // 塊 5：月份變化表點開的那一列 ⇒ 畫那個指標近 12 個月的數值（同一張 canvas、同一套樣式）
    const metDef = cv.closest && cv.closest('.hl-mt-chart') ? HL_MONTH_METRICS.find(d => d.key === _hlState.metOpen) : null;
    if (metDef) {
      const color = _hlCssVar('--primary'), muted = _hlCssVar('--text-muted'), grid = _hlCssVar('--border');
      const ys = tr.map(r => { const v = _hlMetricVal(ch, r, metDef.key, _hlLast.snap).v; return v == null ? null : (metDef.unit === 'pct' ? Math.round(v * 1000) / 10 : Math.round(v)); });
      const fmt = y => (y == null ? '沒有資料' : metDef.unit === 'pct' ? y.toFixed(1) + '%' : _hlFmtMoney(y));
      _hlChart = new Chart(cv.getContext('2d'), {
        type: 'line',
        data: { labels: tr.map(r => _hlYmLabel(r.month)), datasets: [{ label: metDef.label, data: ys, borderColor: color || undefined, backgroundColor: color || undefined,
          borderWidth: 2.5, spanGaps: false, tension: 0.2, pointRadius: 3 }] },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => metDef.label + '：' + fmt(c.parsed.y) } } },
          scales: {
            x: { ticks: { color: muted || undefined, maxRotation: 0, autoSkip: true }, grid: { display: false } },
            y: { ticks: { color: muted || undefined, callback: v => fmt(v) }, grid: { color: grid || undefined } },
          },
        },
      });
      return;
    }
    const labels = tr.map(r => _hlYmLabel(r.month));
    // 面向線條的顏色依序取 :root 變數（不寫死色碼）；總分用主色
    const DIM_COLORS = ['--success', '--warn', '--info', '--text-muted'];
    // v5：總分、純利率分、動銷率分三條（計分項目從規則來）
    const series = [{ k: null, label: '總分', color: _hlCssVar('--primary') }]
      .concat(HEALTH_RULES.score.items.map((it, i) => ({ k: it.key, label: it.label + '分', color: _hlCssVar(DIM_COLORS[i % DIM_COLORS.length]) })));
    const muted = _hlCssVar('--text-muted'), grid = _hlCssVar('--border'), surface = _hlCssVar('--surface');
    const datasets = series.map(sr => {
      const ys = tr.map(r => {
        if (!sr.k) return r.score == null ? null : Math.floor(r.score);
        const it = (r.items || []).find(x => x.key === sr.k);
        return it && it.status === 'ok' ? it.score : null;
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
// 選定月份適用的規則（說明彈窗用）。還沒選月份（載入中、錯誤畫面也按得到說明）⇒ BASE。
function _hlSelectedRules() {
  return healthRulesForMonth(_hlState.month, _hlLast && _hlLast.snap && _hlLast.snap.healthRuleVersions);
}
// 說明彈窗的「看各通路分數線 →」：關掉說明、開評分標準視窗（既有的 _hlStdOpen）。彈窗不在 #main-content 裡（委派 _hlOnClick 收不到），
//   開窗時綁在彈窗內容上；每次開窗內容都換新，不會重複綁。
function _hlGuideInfoClick(e) {
  const btn = e.target.closest && e.target.closest('[data-hl-guide-std]');
  if (!btn) return;
  App.closeModal();
  _hlStdOpen();
}
function _hlGuideBindInfo() {
  const box = document.querySelector('.hl-guide');
  if (box) box.addEventListener('click', _hlGuideInfoClick);
}

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

// 頁頂「商品資料載入中」：只一行短字；三個平台都載好、卡片也都有分數就整段不顯示（完整說明在「怎麼看這頁」）。
//   wait＝這個月還在等商品層的卡片的類型短名（_hlNoteWaitLabels，例 ['MOMO', 'MO+']）；有就說「…的分數稍後出現」，沒有就說「待處理商品數稍後出現」。
let _hlNoteWait = [];   // 上一次整頁重畫算出來的 wait（5 秒更新秒數時沿用，不重算）
//   results 的狀態已經是依選定月份的規則（含通路自己的線）算出來的；這裡的類型名稱也讀同一份。
function _hlNoteWaitLabels(results, rules) {
  const R = rules || HEALTH_RULES;
  const out = [];
  results.forEach(r => {
    if (!_HL_WAIT_STATUS[r.status]) return;
    const s = String(((R.types[r.type] || {}).label) || r.type).split(' ')[0];
    if (out.indexOf(s) < 0) out.push(s);
  });
  return out;
}
const _HL_WAIT_STATUS = { prodLoading: 1, prodIdle: 1, prodTimeout: 1 };
function _hlProdNoteHtml(snap, wait) {
  const st = snap.prodState || {};
  const w = snap.prodWaitSec || {};
  const W = wait || [];
  const notReady = _HL_LOAD_ORDER.filter(p => st[p] !== 'ready');
  if (!notReady.length && !W.length) return '';
  const what = W.length ? `${W.join('、')} 的分數稍後出現` : '商品標籤稍後出現';
  if (_hlIsNarrow() && !notReady.some(p => st[p] === 'loading') && notReady.some(p => (st[p] || 'idle') === 'idle')) {
    return `<div class="hl-prodnote">${escapeHtml(`手機不自動載入商品資料：${W.length ? W.join('、') + ' 的分數' : '商品標籤'}請展開卡片按「載入商品資料」`)}</div>`;
  }
  const to = notReady.filter(p => st[p] === 'timeout').map(p => _HL_PLATFORM_LABEL[p]);
  // 正在載入、已等最久的那個平台（排隊還沒開始的 _hlLoading 沒有，不算）
  const secs = notReady.filter(p => st[p] === 'loading' && _hlLoading[p] && (p in w)).map(p => w[p]);
  const max = secs.length ? Math.max(...secs) : 0;
  const extra = to.length ? `（${to.join('、')} 載入逾時：先進淨利表點一下，再按「↻ 重新計算」）`
    : max >= HL_WAIT_HINT ? `（已等 ${Math.floor(max)} 秒，請先進淨利表點一下再回來）`
    : max >= HL_WAIT_SLOW ? `（已等 ${Math.floor(max)} 秒）` : '';
  return `<div class="hl-prodnote">${escapeHtml(`商品資料載入中，${what}${extra}`)}</div>`;
}

function _hlOnClick(e) {
  if (App.route !== 'health') return;
  const act = e.target.closest && e.target.closest('[data-hl-act]');
  if (act) {
    if (act.dataset.hlAct === 'refresh') { _hlProdReset(); App.render(); }
    else if (act.dataset.hlAct === 'pending') { _hlState.pendingOpen = !_hlState.pendingOpen; App.render(); }
    else if (act.dataset.hlAct === 'tagsmore' && act.dataset.hlList) { _hlState.tagsMore = Object.assign({}, _hlState.tagsMore, { [act.dataset.hlList]: !(_hlState.tagsMore || {})[act.dataset.hlList] }); App.render(); }
    else if (act.dataset.hlAct === 'todoall' && act.dataset.hlCh) { _hlState.todoAll = _hlState.todoAll === act.dataset.hlCh ? null : act.dataset.hlCh; App.render(); }
    else if (act.dataset.hlAct === 'guide' && typeof App.openModal === 'function') App.openModal({ title: '📖 通路健檢 · 怎麼看這頁', width: '640px', hideFooter: true, bodyHtml: _hlGuideModalHtml(_hlSelectedRules(), { openFull: act.dataset.hlGuideFull === '1' }), onMount: _hlGuideBindInfo });
    else if (act.dataset.hlAct === 'std' && typeof App.openModal === 'function') _hlStdOpen();
    else if (act.dataset.hlAct === 'loadprod' && act.dataset.hlPlatform) {
      if (_hlProd.state[act.dataset.hlPlatform] === 'timeout') _hlProd.state[act.dataset.hlPlatform] = 'idle';
      _hlEnsurePlatform(act.dataset.hlPlatform); App.render();
    }
    return;
  }
  const kpi = e.target.closest && e.target.closest('[data-hl-kpi]');
  if (kpi) { _hlGoKpi(kpi.dataset.hlKpi); return; }
  if (e.target.closest && e.target.closest('.hl-mt-pick')) return;   // 勾選指標：交給 change 事件
  if (e.target.closest && e.target.closest('details.hl-info')) return;   // 點 ⓘ（含口徑變更提醒）只展開說明，不切換那一列的折線圖
  const met = e.target.closest && e.target.closest('[data-hl-met]');
  if (met) { _hlToggleMet(met.dataset.hlMet); return; }
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
// 月份變化表：點一列展開／收起那個指標的 12 個月折線圖
function _hlToggleMet(key) {
  _hlState.metOpen = _hlState.metOpen === key ? null : key;
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
  const el = document.querySelector('.hl-tile-detail .hl-tags');   // 塊 4：捲到商品標籤清單（以前是「要處理的商品」）
  // 用直接跳（不用 smooth）：重畫會換掉整頁 HTML，平滑捲動做到一半會被打斷
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
}
function _hlOnKeydown(e) {
  if (App.route !== 'health' || (e.key !== 'Enter' && e.key !== ' ')) return;
  const todo = e.target.closest && e.target.closest('[data-hl-todo]');
  if (todo && e.target === todo) { e.preventDefault(); _hlOpenTodo(todo.dataset.hlTodo); return; }
  const met = e.target.closest && e.target.closest('[data-hl-met]');
  if (met && e.target === met) {
    e.preventDefault(); const k = met.dataset.hlMet; _hlToggleMet(k);
    const again = document.querySelector(`[data-hl-met="${CSS.escape(k)}"]`); if (again) again.focus();
    return;
  }
  const row = e.target.closest && e.target.closest('[data-hl-row]');
  if (!row || e.target !== row) return;
  e.preventDefault();
  _hlToggle(row.dataset.hlRow);
  const again = document.querySelector(`[data-hl-row="${CSS.escape(row.dataset.hlRow)}"]`);
  if (again) again.focus();
}
function _hlOnChange(e) {
  if (App.route !== 'health') return;
  const col = e.target.closest && e.target.closest('[data-hl-metcol]');
  if (col) { _hlSetMetCol(col.dataset.hlMetcol, !!col.checked); if (!col.checked && _hlState.metOpen === col.dataset.hlMetcol) _hlState.metOpen = null; App.render(); return; }
  const sel = e.target.closest && e.target.closest('[data-hl-month]');
  if (!sel || !_hlIsYm(sel.value)) return;
  _hlState.month = sel.value;
  App.render();
}

/* ---------- 評分標準設定視窗（塊 4）：大家可看、只有管理員能存 ----------
 *   寫入只有 _hlStdSave：先讀伺服器比對 → 一次 writePaths 整份寫 → 讀回比對。檢查規則不另寫：表單用 _hlLinesBad／_hlWeightBad／_hlWeightsSumBad，
 *   存之前再把整份版本丟進 _hlBuildRuleChain 驗（跟 healthRulesForMonth 同一套）。
 *   🔴 確認內容放在同一個視窗裡切換（不另開 modal）：App.openModal 只有一個 #modal，另開會把表單整個換掉，失敗時填好的內容就回不來了。
 *   事件全部走 data-hl-std-act ＋ 開窗時綁在視窗內容上（彈窗不在 #main-content 裡），不寫 inline handler。 */
const _hlStd = { from: '', open: {}, baseline: '', versions: [], root: null, busy: false, pending: null, formSig: '', askThen: null, askPrev: '', guardBound: false, hist: null, histTimer: null };
const _hlStdIsAdmin = () => !!(App.currentUser && App.currentUser.role === 'admin');
const _hlStdIsRO = () => typeof App.isReadOnly === 'function' && !!App.isReadOnly();
const _hlStdCanEdit = () => _hlStdIsAdmin() && !_hlStdIsRO();
const _hlStdCloudReady = () => !_hlMock && _hlRules.state === 'ready' && !!window.__cloudHealthRules && Array.isArray(_hlRules.versions);
const _hlStdList = () => (Array.isArray(_hlStd.versions) ? _hlStd.versions : []);
// closeModal 只收起背景、不清內容，所以要連背景有沒有顯示一起看（內容被別的視窗換掉 ⇒ querySelector 對不上）
const _hlStdIsOpen = () => {
  if (!_hlStd.root || document.querySelector('.hl-std') !== _hlStd.root) return false;
  const bd = document.getElementById('modal-backdrop');
  return !bd || bd.classList.contains('show');
};
// 比例 ↔ 百分比字串：0.25 ↔ '25'；存之前四捨五入到 0.001
const _hlStdToPct = v => (_hlFinite(v) ? String(Math.round(v * 1000) / 10) : '');
const _hlStdFromPct = p => Math.round(p * 10) / 1000;
// 這一格為什麼不能填（動銷率才有）：類型本來就不算、這家通路沒有商品層。回字串＝鎖住，內容沿用原值。
function _hlStdLockType(itemKey, type) {
  if (itemKey !== 'sellThrough') return '';
  if (_hlNoSellThrough(type)) return '不算動銷率';
  return '';
}
function _hlStdLockChannel(itemKey, ch) {
  return _hlStdLockType(itemKey, ch.type) || (itemKey === 'sellThrough' && !ch.prod ? '沒有商品資料' : '');
}
function _hlStdMonths() {
  const m0 = _hlTaipeiYm(Date.now());
  return _hlMonthRange(m0, _hlAddMonth(m0, 12));
}
// 三格一組：一個輸入框一格（對齊表頭的 100／80／60 分），或跨三欄的鎖住文字。hints＝淺灰提示（個別通路傳共用那列的數字，類型列傳 null）。
function _hlStdGroupHtml(key, lines, lock, disabled, hints, label) {
  if (lock) return `<td class="hl-std-lock hl-std-gs" colspan="4">${escapeHtml(lock)}</td>`;
  return [0, 1, 2].map(i => `<td${i === 0 ? ' class="hl-std-gs"' : ''}><input type="text" inputmode="decimal" class="hl-std-in" data-hl-std-cell="${escapeHtml(key)}" data-hl-std-i="${i}" value="${lines ? _hlStdToPct(lines[i]) : ''}" placeholder="${hints ? _hlStdToPct(hints[i]) : ''}" aria-label="${escapeHtml(label + ' ' + [100, 80, 60][i] + ' 分線（%）')}"${disabled ? ' disabled' : ''}></td>`).join('') + _hlStdHistCellHtml(key);
}
// 「近 6 月」欄：只有文字，刻意不帶 data-hl-std-cell（存檔、_hlStdFormSig 都讀不到）。key＝'項目|t|類型' 或 '項目|c|通路 id'。
//   一行：平均（粗體）＋範圍（灰色小字）＋「n 個月」（不是 6 個月才有）；窄的時候範圍可以換到第二行，平均本身不換行。還在等資料時沿用 line1／line2。
function _hlStdHistView(key) {
  const i = key.indexOf('|'), itemKey = key.slice(0, i), histKey = key.slice(i + 1);
  const h = _hlStd.hist && _hlStd.hist[itemKey] && _hlStd.hist[itemKey][histKey], t = _hlStdHistText(h, itemKey);
  const bias = itemKey === 'sellThrough' && h && !h.wait ? _hlStdBiasText(histKey) : '';   // 還在等資料時沒有數字，不掛 ⓘ
  const info = bias ? ` <span class="hl-std-hist-info" title="${escapeHtml(bias)}" aria-label="${escapeHtml(bias)}">ⓘ</span>` : '';
  const sub = x => (x ? ` <span class="hl-std-hist-sub">${escapeHtml(x)}</span>` : '');
  const body = t.avg != null
    ? `<span class="hl-std-hist-avg">${escapeHtml(t.avg)}</span>${sub(t.refNote)}${sub(t.range)}${sub(t.nNote)}`
    : `<span class="hl-std-hist-avg">${escapeHtml(t.line1)}</span>${sub(t.line2)}`;
  return { t, html: `<div class="hl-std-hist-line">${body}${info}</div>` };
}
function _hlStdHistCellHtml(key) {
  const { t, html } = _hlStdHistView(key);
  return `<td class="hl-std-hist${t.ref ? ' hl-std-hist-ref' : ''}" data-hl-std-hist="${escapeHtml(key)}"${t.tip ? ` title="${escapeHtml(t.tip)}"` : ''}>${html}</td>`;
}
// 重算「近 6 月」並只更新這一欄的文字（不重畫表單）。snap＝呼叫端已有的快照（viewHealth）；沒傳就自己收。
//   資料還沒就緒 ⇒ 維持「載入中」，每秒再試，直到有數字或視窗關掉。已有數字時若這次拿不到，就留著舊的。
const HL_STD_HIST_RETRY_MS = 1000;
function _hlStdHistCompute(snap) {
  try {
    _hlStdHistWant();
    const s = snap || _hlCollect();
    if (!s || s.error || !s.ready) return null;
    return healthStdHistoryAll(_hlStdHistMonths(_hlTodayYm()), s);
  } catch (e) {
    console.warn('[health] 近 6 月計算失敗', e);
    return null;
  }
}
function _hlStdHistPaint() {
  if (!_hlStd.root) return;
  _hlStd.root.querySelectorAll('[data-hl-std-hist]').forEach(td => {
    const { t, html } = _hlStdHistView(td.getAttribute('data-hl-std-hist'));
    if (td.dataset.hlStdHistHtml !== html) { td.innerHTML = html; td.dataset.hlStdHistHtml = html; }   // 內容一樣就不動（滑鼠正停在 ⓘ 上時提示不會被洗掉）
    td.classList.toggle('hl-std-hist-ref', !!t.ref);
    if (td.title !== t.tip) td.title = t.tip;
  });
}
function _hlStdHistRefresh(snap) {
  if (!_hlStdIsOpen()) return;
  const hist = _hlStdHistCompute(snap);
  if (hist) _hlStd.hist = hist;
  _hlStdHistPaint();
  if (!_hlStd.hist) _hlStdHistRetry();
}
function _hlStdHistRetry() {
  if (_hlStd.histTimer) return;
  _hlStd.histTimer = setTimeout(() => { _hlStd.histTimer = null; _hlStdHistRefresh(); }, HL_STD_HIST_RETRY_MS);
}
// 一列的紅字放在下面一列（跨四欄，含「近 6 月」）。沒有紅字時這一列高度是 0。
function _hlStdErrRowHtml(cols, attrs) {
  return `<tr class="hl-std-errrow"${attrs}><td></td>${cols.map(c => `<td colspan="4">${c.lock ? '' : `<div class="hl-std-err" data-hl-std-err="${escapeHtml(c.key)}"></div>`}</td>`).join('')}</tr>`;
}
function _hlStdBodyHtml() {
  const from = _hlStd.from, list = _hlStdList(), R = healthRulesForMonth(from, _hlStd.versions);
  const can = _hlStdCanEdit() && _hlStdCloudReady(), off = !can;
  const same = list.find(v => v && v.from === from);
  const later = list.filter(v => v && typeof v.from === 'string' && v.from > from).map(v => v.from);
  const notes = [];
  if (same) notes.push(`會取代 ${_hlYmLabel(from)} 起那一版`);
  if (later.length) notes.push(`${later.map(_hlYmLabel).join('、')} 起另有一版，不受這次修改影響`);
  const items = R.score.items, pure = items.find(it => it.key === 'pureRate'), st = items.find(it => it.key === 'sellThrough');
  const rows = Object.keys(R.types).sort((a, b) => R.types[a].order - R.types[b].order).map(t => {
    const chs = HEALTH_CHANNELS.filter(ch => ch.type === t), label = R.types[t].label;
    const override = chs.some(ch => items.some(it => it.linesByChannel && it.linesByChannel[ch.id]));
    const open = _hlStd.open[t] != null ? _hlStd.open[t] : override;
    const chRows = chs.map(ch => {
      const attrs = ` data-hl-std-chrow="${escapeHtml(t)}"${open ? '' : ' hidden'}`;
      return `<tr class="hl-std-chrow"${attrs}><td class="hl-std-chname">${escapeHtml(ch.label)}</td>${
        items.map(it => _hlStdGroupHtml(`${it.key}|c|${ch.id}`, it.linesByChannel && it.linesByChannel[ch.id], _hlStdLockChannel(it.key, ch), off, it.lines && it.lines[t], `${ch.label} ${it.label}`)).join('')}</tr>${
        _hlStdErrRowHtml(items.map(it => ({ key: `${it.key}|c|${ch.id}`, lock: _hlStdLockChannel(it.key, ch) })), attrs)}`;
    }).join('');
    return `<tr class="hl-std-trow"><td class="hl-std-tname">${escapeHtml(label)}<button type="button" class="hl-std-toggle" data-hl-std-act="chs" data-hl-std-type="${escapeHtml(t)}" aria-expanded="${open ? 'true' : 'false'}">${open ? '▾' : '▸'} 個別通路</button></td>${
      items.map(it => _hlStdGroupHtml(`${it.key}|t|${t}`, it.lines && it.lines[t], _hlStdLockType(it.key, t), off, null, `${label} ${it.label}`)).join('')}</tr>${
      _hlStdErrRowHtml(items.map(it => ({ key: `${it.key}|t|${t}`, lock: _hlStdLockType(it.key, t) })), '')}${chRows}`;
  }).join('');
  const lockMsg = !_hlStdCanEdit() ? '只有管理員可以修改評分標準'
    : !_hlStdCloudReady() ? '評分標準還沒讀到，暫時不能修改（請重新整理後再試）' : '';
  const dis = off ? ' disabled' : '';
  return `<div data-hl-std-form>
      <ol class="hl-std-how">
        <li>選「從哪個月開始適用」，填各通路 100／80／60 分的門檻（%），按儲存。之前的月份照舊。</li>
        <li>每類第一列是整類共用的線；展開「個別通路」只填要不一樣的那家，沒填就照整類。</li>
        <li>整組留空＝標準未設定（不給分），三格要全填或全空。「近 6 月」是實際數字，訂線時參考。</li>
      </ol>
      <label class="hl-std-field">從哪個月開始適用
        <select data-hl-std-from>${_hlStdMonths().map(m => `<option value="${m}"${m === from ? ' selected' : ''}>${escapeHtml(_hlYmLabel(m))}</option>`).join('')}</select></label>
      <div data-hl-std-notes>${notes.map(n => `<div class="hl-std-note">${escapeHtml(n)}</div>`).join('')}</div>
      <div class="hl-std-wrap"><table class="hl-std-tbl"><thead><tr><th class="hl-std-c1" rowspan="2">通路類型</th>${items.map(it => `<th class="hl-std-gs" colspan="4">${escapeHtml(it.label)}（%）</th>`).join('')}</tr>
        <tr>${items.map(() => [100, 80, 60].map((n, i) => `<th${i === 0 ? ' class="hl-std-gs"' : ''}>${n} 分</th>`).join('') + '<th class="hl-std-hist-th">近 6 月 平均・範圍</th>').join('')}</tr></thead><tbody>${rows}</tbody></table></div>
      <div class="hl-std-row">權重
        ${items.map(it => `<label class="hl-std-w">${escapeHtml(it.label)} <input type="text" inputmode="decimal" class="hl-std-in" data-hl-std-w="${escapeHtml(it.key)}" value="${_hlStdToPct(it.w)}" aria-label="${escapeHtml(it.label)}權重（%）"${dis}> %<span class="hl-std-err" data-hl-std-err="w|${escapeHtml(it.key)}"></span></label>`).join('')}
        <span class="hl-std-err" data-hl-std-err="w"></span></div>
      <label class="hl-std-row hl-std-check"><input type="checkbox" data-hl-std-prov${st && st.provisional ? ' checked' : ''}${dis}> ${escapeHtml(st ? st.label : '動銷率')}標準仍是暫定</label>
      <label class="hl-std-row">備註 <input type="text" class="hl-std-notein" data-hl-std-noteinput maxlength="200" value="${escapeHtml(same && same.note ? same.note : '')}" placeholder="選填"${dis}></label>
      <div class="hl-std-msg" data-hl-std-msg role="status"></div>
      ${lockMsg ? `<div class="hl-std-readonly">${escapeHtml(lockMsg)}</div>` : ''}
      <div class="hl-std-ftr"><button type="button" class="btn-ghost" data-hl-std-act="close">${can ? '取消' : '關閉'}</button>${can ? '<button type="button" class="btn-primary hl-std-save" data-hl-std-act="submit">儲存</button>' : ''}</div>
    </div>
    <div class="hl-std-confirm" data-hl-std-confirm hidden></div>
    <div class="hl-std-ask" data-hl-std-ask hidden><p class="hl-std-cline">還沒儲存，要放棄這些修改嗎？</p>
      <div class="hl-std-ftr"><button type="button" class="btn-ghost" data-hl-std-act="discard">放棄修改</button><button type="button" class="btn-primary hl-std-save" data-hl-std-act="keep">回去繼續改</button></div></div>`;
}
const _hlStdQ = sel => (_hlStd.root ? _hlStd.root.querySelector(sel) : null);
function _hlStdSetMsg(text, kind) {
  const el = _hlStdQ('[data-hl-std-msg]');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'hl-std-msg' + (kind ? ' hl-std-msg-' + kind : '');
}
function _hlStdShowForm() {
  const f = _hlStdQ('[data-hl-std-form]'), c = _hlStdQ('[data-hl-std-confirm]'), a = _hlStdQ('[data-hl-std-ask]');
  if (f) f.hidden = false;
  if (c) c.hidden = true;
  if (a) a.hidden = true;
}
// ── 防止填好的內容不見：改過但還沒存時，點背景／✕／取消／切月份都先問（只有能改的人才會問）──
//   表單目前內容的指紋；開窗、切月份預填時記下來，之後不同就算「改過」。
function _hlStdFormSig() {
  const root = _hlStd.root;
  if (!root) return '';
  const vals = sel => Array.from(root.querySelectorAll(sel), el => el.value);
  const prov = _hlStdQ('[data-hl-std-prov]');
  return JSON.stringify([vals('[data-hl-std-cell]'), vals('[data-hl-std-w]'), !!(prov && prov.checked), vals('[data-hl-std-noteinput]')]);
}
const _hlStdDirty = () => _hlStdCanEdit() && _hlStdCloudReady() && !!_hlStd.root && _hlStdFormSig() !== _hlStd.formSig;
// 在同一個視窗內問；then＝選「放棄修改」要做的事。預設焦點在「回去繼續改」。
function _hlStdAsk(then) {
  const a = _hlStdQ('[data-hl-std-ask]'), f = _hlStdQ('[data-hl-std-form]'), c = _hlStdQ('[data-hl-std-confirm]');
  if (!a) return;
  if (a.hidden) _hlStd.askPrev = c && !c.hidden ? 'confirm' : 'form';
  _hlStd.askThen = then;
  if (f) f.hidden = true;
  if (c) c.hidden = true;
  a.hidden = false;
  const keep = _hlStdQ('[data-hl-std-act="keep"]');
  if (keep && typeof keep.focus === 'function') keep.focus();
}
function _hlStdAskKeep() {
  const a = _hlStdQ('[data-hl-std-ask]'), f = _hlStdQ('[data-hl-std-form]'), c = _hlStdQ('[data-hl-std-confirm]'), sel = _hlStdQ('[data-hl-std-from]');
  _hlStd.askThen = null;
  if (a) a.hidden = true;
  if (_hlStd.askPrev === 'confirm') { if (c) c.hidden = false; } else if (f) f.hidden = false;
  if (sel) sel.value = _hlStd.from;   // 切月份時選單已經變了：改回目前這個月
}
// 🔴 closeModalOnBackdrop（index.html 的 onclick）與 ✕（modal.js 設的 onclick）是全站共用、onCancel 也擋不住關閉。
//   document 捕獲階段比它們早：只有設定視窗開著、而且有未存內容（或正在存）時才攔下來；其他視窗一律不碰。只綁一次。
function _hlStdCloseGuard(e) {
  if (!_hlStdIsOpen()) return;
  const t = e.target;
  const hit = t && (t.id === 'modal-backdrop' || (t.closest && t.closest('#modal-close-x')));
  if (!hit) return;
  if (_hlStd.busy) { e.stopPropagation(); e.preventDefault(); return; }   // 正在存：先別關，結果要顯示在視窗裡
  if (!_hlStdDirty()) return;   // 沒改過、不能改的人：照原本的流程直接關
  e.stopPropagation(); e.preventDefault();
  _hlStdAsk(() => App.closeModal());
}
function _hlStdOpen() {
  _hlStd.versions = _hlRuleVersionsNow();
  _hlStd.baseline = _hlStableJson(_hlStd.versions);
  _hlStd.from = _hlTaipeiYm(Date.now());
  _hlStd.open = {}; _hlStd.busy = false; _hlStd.pending = null; _hlStd.root = null; _hlStd.askThen = null; _hlStd.askPrev = '';
  _hlStd.hist = _hlStdHistCompute();
  App.openModal({ title: '⚙ 評分標準', width: '960px', hideFooter: true, bodyHtml: `<div class="hl-std">${_hlStdBodyHtml()}</div>`, onMount: _hlStdBind });
}
function _hlStdBind() {
  const root = document.querySelector('.hl-std');
  if (!root) return;
  _hlStd.root = root;
  root.addEventListener('click', _hlStdOnClick);
  root.addEventListener('change', _hlStdOnChange);
  root.addEventListener('input', _hlStdOnInput);
  _hlStd.formSig = _hlStdFormSig();
  if (!_hlStd.hist) _hlStdHistRetry();
  if (!_hlStd.guardBound) { _hlStd.guardBound = true; document.addEventListener('click', _hlStdCloseGuard, true); }
}
// 共用那列改了，下面個別通路的淺灰數字跟著變。只改 placeholder、不碰 value：存檔（_hlStdSubmit）與「有沒有改過」（_hlStdFormSig）都只讀 value，提示不會被當成已填。
function _hlStdOnInput(e) {
  const el = e.target, key = el && el.getAttribute && el.getAttribute('data-hl-std-cell');
  if (!key) return;
  const [itemKey, kind, type] = key.split('|');
  if (kind !== 't') return;
  const i = el.getAttribute('data-hl-std-i'), s = String(el.value == null ? '' : el.value).trim();
  const hint = s !== '' && _hlFinite(Number(s)) ? s : '';
  HEALTH_CHANNELS.filter(ch => ch.type === type).forEach(ch => {
    _hlStd.root.querySelectorAll(`[data-hl-std-cell="${itemKey}|c|${ch.id}"]`).forEach(c => {
      if (c.getAttribute('data-hl-std-i') === i) c.placeholder = hint;
    });
  });
}
function _hlStdOnChange(e) {
  const sel = e.target && e.target.closest && e.target.closest('[data-hl-std-from]');
  if (!sel || _hlStd.busy || !_hlIsYm(sel.value)) return;
  const next = sel.value;
  if (next === _hlStd.from) return;
  const go = () => {
    _hlStd.from = next; _hlStd.open = {}; _hlStd.pending = null; _hlStd.askThen = null;
    _hlStd.root.innerHTML = _hlStdBodyHtml();   // 下方表格預填那個月目前適用的標準
    _hlStd.formSig = _hlStdFormSig();
  };
  if (_hlStdDirty()) _hlStdAsk(go); else go();
}
function _hlStdOnClick(e) {
  const b = e.target && e.target.closest && e.target.closest('[data-hl-std-act]');
  if (!b) return;
  const act = b.getAttribute('data-hl-std-act');
  if (act === 'close') {
    if (_hlStd.busy) return;
    if (_hlStdDirty()) _hlStdAsk(() => App.closeModal()); else App.closeModal();
    return;
  }
  if (act === 'keep') { _hlStdAskKeep(); return; }
  if (act === 'discard') { const then = _hlStd.askThen; _hlStd.askThen = null; if (then) then(); return; }
  if (act === 'chs') {
    const t = b.getAttribute('data-hl-std-type'), open = b.getAttribute('aria-expanded') !== 'true';
    _hlStd.open[t] = open;
    _hlStd.root.querySelectorAll(`[data-hl-std-chrow="${t}"]`).forEach(tr => { tr.hidden = !open; });
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    b.textContent = (open ? '▾' : '▸') + ' 個別通路';
    return;
  }
  if (act === 'submit') { _hlStdSubmit(); return; }
  if (act === 'back') { if (!_hlStd.busy) _hlStdShowForm(); return; }
  if (act === 'confirm') _hlStdSave();
}
// 表單 → 版本內容（純邏輯）。values＝{ 格子 key:[三個字串] }、weights＝{ 項目:字串 }。回 { items, errors:{ 格子 key:訊息 } }。
//   鎖住的格子沒有輸入框：沿用 R 的原值（版本是完整標準，不能因為畫面鎖住就把線丟掉）。
function _hlStdCollect(values, weights, provisional, R) {
  const errors = {};
  const parse = key => {
    const strs = (values[key] || ['', '', '']).map(s => String(s == null ? '' : s).trim());
    if (strs.every(s => s === '')) return null;
    if (strs.some(s => s === '')) { errors[key] = '三格要全填或全空'; return null; }
    const nums = strs.map(Number);
    if (!nums.every(_hlFinite)) { errors[key] = '要填數字'; return null; }
    const a = nums.map(_hlStdFromPct), bad = _hlLinesBad(a);
    if (bad) { errors[key] = bad.replace('0～1', '0～100'); return null; }
    return a;
  };
  const items = {};
  let sum = 0, wOk = true;
  R.score.items.forEach(it => {
    const lines = {}, byCh = {};
    Object.keys(R.types).forEach(t => {
      if (_hlStdLockType(it.key, t)) { if (it.lines && it.lines[t]) lines[t] = it.lines[t].slice(); return; }
      const a = parse(`${it.key}|t|${t}`);
      if (a) lines[t] = a;
    });
    HEALTH_CHANNELS.forEach(ch => {
      if (_hlStdLockChannel(it.key, ch)) { const o = it.linesByChannel && it.linesByChannel[ch.id]; if (o) byCh[ch.id] = o.slice(); return; }
      const a = parse(`${it.key}|c|${ch.id}`);
      if (a && JSON.stringify(a) !== JSON.stringify(lines[ch.type] || null)) byCh[ch.id] = a;   // 只有跟類型不同才存
    });
    const ws = String(weights[it.key] == null ? '' : weights[it.key]).trim();
    const wn = ws === '' ? NaN : Number(ws), w = _hlFinite(wn) ? _hlStdFromPct(wn) : NaN;
    if (!_hlFinite(w) || _hlWeightBad(w)) { errors['w|' + it.key] = '要大於 0'; wOk = false; } else sum += w;
    items[it.key] = { w, lines, linesByChannel: byCh };
    if (it.key === 'sellThrough') items[it.key].provisional = !!provisional;
  });
  if (wOk && _hlWeightsSumBad(sum)) errors.w = `兩項加總要是 100（現在是 ${Math.round(sum * 1000) / 10}）`;
  return { items, errors };
}
// 哪些類型／通路會從「有標準」變成「沒標準」：回 ['MO+ 純利率', …]。整類型都沒了寫類型名，只有部分通路沒了寫通路名。
function _hlStdLost(R, items) {
  const out = [];
  R.score.items.forEach(it => {
    const next = items[it.key];
    Object.keys(R.types).sort((a, b) => R.types[a].order - R.types[b].order).forEach(t => {
      const chs = HEALTH_CHANNELS.filter(ch => ch.type === t);
      const had = chs.filter(ch => _hlLinesFor(it, ch)), lost = had.filter(ch => !_hlLinesFor(next, ch));
      if (!lost.length) return;
      if (lost.length === chs.length) out.push(`${R.types[t].label} ${it.label}`);
      else lost.forEach(ch => out.push(`${ch.label} ${it.label}`));
    });
  });
  return out;
}
function _hlStdNewList(version) {
  return _hlStdList().filter(v => !(v && v.from === version.from)).concat([version]);
}
// 按「儲存」：檢查 → 切到確認內容。還沒寫任何東西。
function _hlStdSubmit() {
  if (_hlStd.busy) return;
  if (!_hlStdCanEdit()) { _hlStdSetMsg('只有管理員可以修改評分標準', 'err'); return; }
  const root = _hlStd.root, from = _hlStd.from, R = healthRulesForMonth(from, _hlStd.versions);
  const values = {}, weights = {};
  root.querySelectorAll('[data-hl-std-cell]').forEach(el => {
    const k = el.getAttribute('data-hl-std-cell');
    (values[k] = values[k] || ['', '', ''])[+el.getAttribute('data-hl-std-i')] = el.value;
  });
  root.querySelectorAll('[data-hl-std-w]').forEach(el => { weights[el.getAttribute('data-hl-std-w')] = el.value; });
  const prov = _hlStdQ('[data-hl-std-prov]'), noteEl = _hlStdQ('[data-hl-std-noteinput]');
  const { items, errors } = _hlStdCollect(values, weights, !!(prov && prov.checked), R);
  root.querySelectorAll('[data-hl-std-err]').forEach(el => { el.textContent = errors[el.getAttribute('data-hl-std-err')] || ''; });
  if (Object.keys(errors).length) { _hlStdSetMsg('有紅字的地方要先改好，還沒有存檔', 'err'); return; }
  const version = { from, items, note: noteEl ? String(noteEl.value || '').trim() : '' };
  // 🔴 跟 healthRulesForMonth 同一套驗證，連同文件裡其他版本一起驗：驗不過就算寫進去也不會生效
  const chk = _hlBuildRuleChain(_hlStdNewList(version));
  if (chk.problems.length) { _hlStdSetMsg('這版標準不合法，沒有存檔：' + chk.problems.join('；'), 'err'); return; }
  _hlStd.pending = version;
  const lost = _hlStdLost(R, items);
  const lines = [`這版標準從 ${_hlYmLabel(from)} 起套用；之前的月份照舊標準計算。`];
  if (_hlStdList().some(v => v && v.from === from)) lines.push(`會取代 ${_hlYmLabel(from)} 起那一版。`);
  const warn = lost.length ? `<div class="hl-std-lost">⚠ 這些會變成「標準未設定」（不給分）：${escapeHtml(lost.join('、'))}</div>` : '';
  const c = _hlStdQ('[data-hl-std-confirm]'), f = _hlStdQ('[data-hl-std-form]');
  c.innerHTML = `${lines.map(x => `<p class="hl-std-cline">${escapeHtml(x)}</p>`).join('')}${warn}
    <div class="hl-std-ftr"><button type="button" class="btn-ghost" data-hl-std-act="back">回去修改</button><button type="button" class="btn-primary hl-std-save" data-hl-std-act="confirm">確定儲存</button></div>`;
  f.hidden = true; c.hidden = false;
}
// 讀伺服器現值。__cloudHealthRules.getDoc 不是 getDocFromServer：離線時可能回快取，所以看到 fromCache 一律當讀取失敗（不能拿快取當「伺服器現值」比對）。
async function _hlStdReadServer(be) {
  const s = await be.getDoc();
  if (!s || typeof s.exists !== 'function') throw new Error('讀不到文件');
  if (s.metadata && s.metadata.fromCache) throw new Error('連不到伺服器（讀到的是本機快取）');
  return s.exists() ? (s.data() || {}) : null;
}
// 🔴 存檔：讀伺服器比對 → 一次 writePaths 整份寫入 → 讀回比對。失敗一律留在視窗、內容保留。
async function _hlStdSave() {
  if (!_hlStdCanEdit()) { _hlStdSetMsg('只有管理員可以修改評分標準', 'err'); if (typeof window.showToast === 'function') window.showToast('只有管理員可以修改評分標準', 'error'); return; }
  if (_hlStd.busy || !_hlStd.pending) return;
  const be = window.__cloudHealthRules;
  const u = App.currentUser;
  const version = Object.assign({}, _hlStd.pending, { by: u.username || '', byName: u.name || '', at: Date.now() });
  const from = version.from;
  // 🔴 整份一次寫入：schema 與整個版本在同一次呼叫。分多次的話訂閱端會收到半份版本、判不合法、全公司畫面閃回預設。
  const payload = [[['schema'], 1], [['versions', from], version]];
  const fail = (msg, err) => {
    console.error('[health] 評分標準存檔失敗：' + msg, { payload, error: err });
    if (_hlStdIsOpen()) { _hlStdShowForm(); _hlStdSetMsg(msg, 'err'); }
    else if (typeof window.showToast === 'function') window.showToast('評分標準沒有存檔：' + msg, 'error', 6000);
  };
  const btn = _hlStdQ('[data-hl-std-act="confirm"]');
  _hlStd.busy = true;
  if (btn) { btn.disabled = true; btn.textContent = '儲存中…'; }
  try {
    if (!be || typeof be.writePaths !== 'function') return fail('雲端尚未連線，沒有存檔，請重新整理後再試。');
    let server;
    try { server = await _hlStdReadServer(be); }
    catch (e) { return fail('讀取雲端現值失敗，沒有存檔：' + ((e && e.message) || e), e); }
    if (_hlStableJson(_hlRuleVersionsFromDoc(server)) !== _hlStd.baseline) return fail('有人剛改過評分標準，請關掉重開再改');
    let r;
    try { r = await be.writePaths(payload); }
    catch (e) { return fail('寫入雲端失敗，沒有存檔：' + ((e && e.message) || e), e); }
    if (!(r && r.ok)) return fail('這次沒有寫進雲端（目前是防寫或唯讀狀態），畫面上的標準不會改變。');
    let back;
    try { back = await _hlStdReadServer(be); }
    catch (e) { return fail('已送出，但讀回確認失敗，請重新整理後確認內容：' + ((e && e.message) || e), e); }
    const saved = back && back.versions && back.versions[from];
    if (!back || back.schema !== 1 || _hlStableJson(saved) !== _hlStableJson(version)) return fail('讀回來的內容跟送出的不一致，請重新整理後確認內容。');
    const m = _hlState.month;
    const tail = _hlIsYm(m) && m < from ? `你現在看的 ${+m.slice(5, 7)} 月仍用舊標準` : '';
    if (_hlStdIsOpen()) App.closeModal();   // 已被關掉就不再 closeModal（避免關到之後才開的別的彈窗，同 daily.js）
    if (typeof window.showToast === 'function') window.showToast(`已儲存。${_hlYmLabel(from)} 起套用新標準；之前的月份照舊標準計算。${tail}`, 'success', 6000);
  } finally {
    _hlStd.busy = false;
    if (btn) { btn.disabled = false; btn.textContent = '確定儲存'; }
  }
}

Object.assign(App, {
  viewHealth() {
    // 「📖 怎麼看這頁」在載入中、錯誤畫面也要按得到（說明內容只讀規則，不需要資料；還沒選月份時讀 BASE）
    const header = `<div class="page-header hl-hd">
        <div><h2>通路健檢</h2>
        <p>每個通路每月的體檢分數，點通路可看細項。</p></div>
        <button type="button" class="btn-ghost hl-guide-btn" data-hl-act="guide">📖 怎麼看這頁</button><button type="button" class="btn-ghost hl-std-btn" data-hl-act="std">⚙ 評分標準</button></div>`;
    // profit.js 動態載入：沒載完先載，載完再 render（本頁不叫任何 __load*Subs，只用開站就訂閱的 app/kpi）
    if (!_hlMock && !window.__profitReady) {
      try {
        window.__ensureProfit().then(() => { if (App.route === 'health') App.render(); }).catch(() => {
          const box = document.querySelector('.hl-loading'); if (box) box.textContent = '程式載入失敗，請重新整理頁面';
        });
      } catch (e) { console.error('[health] __ensureProfit 觸發失敗', e); }
      return `<div class="hl-page">${header}<div class="empty hl-loading"><div class="emoji">⏳</div>載入中…</div></div>`;
    }
    _hlRulesEnsureSub();   // 塊 3：評分標準版本（只訂一次）
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
    // 🔴 評分標準還沒到不算分（到了 _hlRulesOnSnap 會重畫；出錯、逾時會退回 BASE）
    if (!_hlRulesSettled()) return `<div class="hl-page">${header}<div class="empty"><div class="emoji">⏳</div>評分標準載入中…</div></div>`;
    const month = _hlIsYm(_hlState.month) ? _hlState.month : healthDefaultMonth(snap, _hlTodayYm());
    if (!_hlState.month) _hlState.month = month;
    _hlWantProd(month, _hlState.open);   // 已載入的平台：補排這次要用到的商品層快照（算完會再重畫一次）
    _hlSpWantView(month, _hlState.open);   // 蝦皮整月商品表現：要用才讀，全部回來再重畫一次
    _hlLast = { month, snap };
    _hlStdHistRefresh(snap);   // 評分標準視窗開著：資料晚到只更新「近 6 月」那一欄
    const monthRules = healthRulesForMonth(month, snap.healthRuleVersions);
    const results = HEALTH_CHANNELS.map(ch => computeChannelHealth(ch, month, snap));
    const prevM = _hlAddMonth(month, -1);
    const prev = {};   // 上個月的分數用上個月自己的標準（computeChannelHealth 依 prevM 查），「比上月」才不會拿新標準重算舊月份
    if (prevM >= HEALTH_RULES.firstMonth) HEALTH_CHANNELS.forEach(ch => { prev[ch.id] = computeChannelHealth(ch, prevM, snap); });
    const rank = _hlRank(results);
    const _tScore = _hlNow() - _t0 - _tKpi;
    // 主看板三區（HL_BOARD_SECTIONS）：所有通路都有一張卡（官網不上）；展開的細項放在該區卡片下方、全寬
    const byId = {};
    results.forEach(r => { byId[r.id] = r; });
    const wall = HL_BOARD_SECTIONS.map(sec => {
      const items = sec.ids.map(id => byId[id]).filter(Boolean);
      const det = items.find(r => r.id === _hlState.open);
      return `<section class="hl-group" aria-label="${escapeHtml(sec.title)}"><div class="hl-group-hd">${escapeHtml(sec.title)}</div>
        <div class="hl-tiles">${items.map(r => _hlTileHtml(r, prev[r.id], rank[r.id], _hlState.open === r.id, snap)).join('')}</div></section>
        ${det ? `<div class="hl-tile-detail">${_hlCardHtml(det, snap)}</div>` : ''}`;
    }).join('');
    const mo = snap.months && snap.months[month];
    try { console.info(`[health] 整頁重算 ${Math.round(_hlNow() - _t0)} ms（KPI 快照 ${Math.round(_tKpi)} ms、評分 ${Math.round(_tScore)} ms）`); } catch {}
    return `<div class="hl-page">
        ${header}
        ${_hlMock ? `<div class="hl-mock-banner">模擬模式：假資料只在本機記憶體（__healthMock(false) 關閉）</div>` : ''}
        ${staleNote}${_hlRulesFailed() ? '<div class="hl-rules-note">評分標準讀取失敗，暫用預設標準</div>' : ''}
        ${_hlPendingHtml(healthPendingKpi(snap, month))}
        ${_hlProdNoteHtml(snap, _hlNoteWait = _hlNoteWaitLabels(results, monthRules))}
        <div class="hl-toolbar">
          <label class="hl-month">評分月份
            <select data-hl-month>${_hlMonthOptions(month)}</select>
          </label>
          <button type="button" class="hl-chip-ver" data-hl-act="guide" data-hl-guide-full="1" title="${escapeHtml(monthRules.version)}">評分標準：${escapeHtml(_hlYmLabel(monthRules.from))} 起適用 ⓘ</button>
          ${mo && _hlFinite(mo.asOf) ? `<span class="hl-asof">KPI 最後更新 ${escapeHtml(_hlFmtTime(mo.asOf))}</span>` : ''}
          <span class="filter-spacer"></span>
          <button type="button" class="btn-ghost" data-hl-act="refresh">↻ 重新計算</button>
        </div>
        <div class="hl-wall">${wall}</div>
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
  _hlSpWant(months);   // 回測才讀的月份。還沒回來的這次算「載入中」，再跑一次就有
  if (_HL_SP_SHOPS.some(shop => months.some(m => (_hlSp.cache[shop + '|' + m] || {}).state === 'loading'))) console.warn('[health] 蝦皮整月商品表現還在讀，這次蝦皮動銷率不完整；等一下再跑一次');
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
// 唯讀回歸快照（改分數線前後比對用；不寫、不訂閱、不碰 DOM；名稱不以 __cloud 開頭，不影響本機防寫物件數）。
//   __healthRegressionSnap({ from, to, versions })：healthBacktest 對全部通路逐月的 raws（各項目原始值、分數、狀態、線、總分）。
//   versions＝要模擬的版本清單（例：改線後的雲端版本）；沒傳＝用這頁讀到的雲端版本。只算 KPI（商品層面向不載入，跟 __healthBacktest 預設相同）。
window.__healthRegressionSnap = function (opts) {
  const o = opts || {};
  if (!_hlMock && !window.__profitReady) { console.warn('[health] profit.js 還沒載入：先進「通路健檢」頁再跑'); return null; }
  const { snap, months } = _hlBacktestSnap({ from: o.from || '2026-01', to: o.to || '2026-11' });
  if (Array.isArray(o.versions)) snap.healthRuleVersions = o.versions;
  const res = healthBacktest(snap, months);
  return {
    versions: (snap.healthRuleVersions || []).map(v => v.key || v.from),
    rows: res.raws.map(r => ({ ch: r.通路, m: r.月, status: r.狀態, total: r.總分,
      items: r.items.map(it => ({ key: it.key, raw: it.raw, score: it.score, status: it.status, lines: it.lines || null })) })),
  };
};
window.__healthBacktest = function (opts) {
  const o = opts || {};
  if (!_hlMock && !window.__profitReady) { console.warn('[health] profit.js 還沒載入：先進「通路健檢」頁或 KPI 頁再跑'); return null; }
  const { snap, months, from, to, need } = _hlBacktestSnap(o);
  const res = healthBacktest(snap, months);
  if (!_hlRulesSettled()) console.warn('[health] 評分標準的雲端版本還沒讀到（先進通路健檢頁），這次回測全部用預設標準');
  console.log(`[health] 回測 ${from}～${to}，評分標準：各月適用的版本（雲端 ${Array.isArray(snap.healthRuleVersions) ? snap.healthRuleVersions.length : 0} 版＋預設 ${HEALTH_RULES.version}）（只讀，不寫任何資料）${need.length ? '，含商品層：' + need.join('、') : '，只算 KPI'}`);
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
// 商品標籤（塊 4，只讀）：__healthTags('2026-10', 'momo-jia' 或 '好麻吉')。直接向轉接層要這個月與前 3 個月的商品資料（不經畫面的排隊），
//   回 healthProductTags 的結果：good／bad（前 10）、goodN／badN、items（每個商品帶 rev／prevRev／profit／prevProfit／gm／gmAvg／gmPrev／revG／tags）。
//   平台的商品資料要先載入（電腦打開健檢頁會自動載；或先 await __healthLoadProducts('momo')）。
window.__healthTags = function (month, id) {
  const ch = HEALTH_CHANNELS.find(c => c.id === id || c.label === id);
  if (!ch) { console.warn('[health] 找不到通路：' + id + '。可用：' + HEALTH_CHANNELS.map(c => `${c.id}（${c.label}）`).join('、')); return null; }
  if (!_hlIsYm(month)) { console.warn('[health] 月份要寫成 YYYY-MM'); return null; }
  if (!ch.prod) return { status: 'na', reason: '這個通路沒有商品層資料' };
  if (!_hlMock && _hlProd.state[ch.prod.platform] !== 'ready') { console.warn(`[health] ${_HL_PLATFORM_LABEL[ch.prod.platform]} 商品資料還沒載入：先打開健檢頁等載完，或 await __healthLoadProducts('${ch.prod.platform}')`); return null; }
  const src = _hlProdSource(), prod = {};
  for (let i = 0; i <= HEALTH_TAG_RULES.gm.window; i++) {
    const m = _hlAddMonth(month, -i), k = _hlProdKey(ch.prod.platform, ch.prod.shop, m);
    try { prod[k] = m < HEALTH_RULES.firstMonth ? { status: 'none', rows: [], lastAdjust: {} } : _hlProdNormalize(src.snapshot(ch.prod.platform, ch.prod.shop, m)); }
    catch (e) { prod[k] = _hlProdNormalize({ error: String((e && e.message) || e) }); }
  }
  return healthProductTags(ch, month, { prod, prodState: { [ch.prod.platform]: 'ready' } });
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
  { key: 'pchome', title: 'PChome', shops: ['PChome', 'PChome-寄倉'], since: '2026-09', shopSince: {}, closedFrom: null },
  { key: 'friday', title: 'FriDay', shops: ['FriDay-主站', 'FriDay-i站'], since: '2026-08', shopSince: {}, closedFrom: null },
  { key: 'books', title: '博客來', shops: ['博客來-寄倉', '博客來-轉單'], since: '2026-09', shopSince: {}, closedFrom: null },
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
          if (shop === '博客來-寄倉') rev = 18000 + seed * 300;          // 營收過小
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
        rev, profit: Math.round(rev * (((i % 10) - 2) / 20)), qty: sold ? 1 + (i % 6) : 0, sold, active: i % 13 !== 0, costKnown: i % 17 !== 0,
        cost: Math.round(rev * (0.45 + ((i * 3 + mi) % 8) * 0.01)) };   // 毛利率每月 47%～55% 之間變動（商品標籤的毛利率燈用）
    });
    out.st = { sold: out.rows.filter(r => r.sold).length, total: out.rows.filter(r => r.active || r.sold).length };
    out.recon = on && m <= '2026-09';
    if (on) out.lastAdjust = { [out.rows[2].key]: m.replace('-', '/') + '/20' };
  } else if (p === 'pchome') {
    out.latestExport = '2026/10/14'; out.months = on ? [m] : []; out.subTotals = {};
    out.rows = on ? Array.from({ length: 30 }, (_, i) => {
      const sold = (i + mi) % 3 !== 0, rev = sold ? 2000 + ((i * 911) % 7000) : 0, ck = i % 7 !== 0;
      return { key: `F${200 + Math.floor(i / 3)}-${10 + (i % 3)}`, sub: i % 4 === 0 ? '寄倉' : '轉單', pages: [`DGAB-${Math.floor(i / 2)}`], name: 'PChome 假商品 ' + i,
        rev, profit: ck ? Math.round(rev * (((i % 8) - 2) / 16)) : null, qty: sold ? 1 + (i % 4) : 0, sold, active: i % 11 !== 0, costKnown: ck,
        cost: ck ? Math.round(rev * (0.5 + ((i * 5 + mi) % 7) * 0.01)) : null };
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
