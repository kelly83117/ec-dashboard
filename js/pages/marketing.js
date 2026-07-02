/* js/pages/marketing.js -- methods extracted from original App, merged back via Object.assign(App, ...) */
const App = window.App;
const { Store, escapeHtml, showToast, toDateStr, addDays, todayStr } = window;

Object.assign(App, {
  renderInsightTabHtml() {
    /* 預設分類門檻（使用者可調） */
    if (!window.INSIGHT_DEFAULT_THRESHOLDS) {
      window.INSIGHT_DEFAULT_THRESHOLDS = {
        explosion: 50,    // 爆發品：成長比 > 50%
        growth: 10,       // 成長品：成長比 10% ~ 50%
        drop: -10,        // 衰退品：成長比 -10% ~ -50%
        heavyDrop: -50,   // 重跌品：成長比 < -50%
        ctrMin: 3,        // 轉換條件門檻：點擊率 > 3%
        weakConvMin: 1,   // 弱轉換：1% ~ 3%
        weakConvMax: 3,
        lowConvMin: 3,    // 轉換偏低：3% ~ 6%
        lowConvMax: 6,
      };
    }
    const INSIGHT_DEFAULT_THRESHOLDS = window.INSIGHT_DEFAULT_THRESHOLDS;

    // ============== 賣場切換 ==============
    const INSIGHT_SHOPS = ['玩樂', '好麻吉', '森之旅'];
    // 還原上次選的賣場（每台電腦記憶）
    if (!this.filter.insightShop) {
      try {
        const lastShop = localStorage.getItem('ec.insightLastShop');
        if (lastShop && INSIGHT_SHOPS.indexOf(lastShop) >= 0) this.filter.insightShop = lastShop;
      } catch {}
    }
    const currentShop = (this.filter.insightShop && INSIGHT_SHOPS.indexOf(this.filter.insightShop) >= 0)
      ? this.filter.insightShop : '玩樂';

    // ============== 欄位顯示控制 ==============
    // 不可隱藏：band、#、商品編號/名稱/ID
    const INSIGHT_COLS = [
      { key: 'prevPrev', label: '上上上週營收' },
      { key: 'revenue', label: '上週 / 上上週營收' },
      { key: 'growth', label: '成長率' },
      { key: 'impressions', label: '曝光次數' },
      { key: 'ctr', label: '點擊率' },
      { key: 'convRate', label: '轉換率' },
      { key: 'group', label: '大類' },
      { key: 'flow', label: '判斷結果' },
      { key: 'stock', label: '可用庫存' },
      { key: 'note', label: '調整' },
    ];
    // 第一次進入洞察表 → 把舊版共用 key 清掉（避免污染新賣場的偏好）
    // 之前是 3 家賣場共用 ec.insightPrefs，現在改成 per-shop，舊 key 留著沒意義且會誤導 fallback
    if (!window.__insightLegacyKeyCleared) {
      window.__insightLegacyKeyCleared = true;
      try { localStorage.removeItem('ec.insightPrefs'); } catch {}
    }

    // 洞察表偏好：每家賣場各自獨立，每台電腦 localStorage 記憶（不同步雲端）
    // 包：欄位顯示、大類篩選、CTR<3% 開關、排序
    // 切換賣場時自動重載對應賣場的偏好
    if (this._loadedPrefsForShop !== currentShop) {
      let saved = {};
      try {
        const raw = localStorage.getItem(`ec.insightPrefs__${currentShop}`);
        if (raw) saved = JSON.parse(raw) || {};
      } catch {}
      this.filter.insightHiddenCols = Array.isArray(saved.hiddenCols) ? saved.hiddenCols : [];
      this.filter.insightClass = Array.isArray(saved.cls) ? saved.cls : [];
      this.filter.insightCtrLow = !!saved.ctrLow;
      this.filter.insightSortKey = saved.sortKey || '';
      this.filter.insightSortDir = saved.sortDir || '';
      this._loadedPrefsForShop = currentShop;
    }
    if (!Array.isArray(this.filter.insightHiddenCols)) this.filter.insightHiddenCols = [];
    const hiddenColsArr = this.filter.insightHiddenCols;
    const hiddenCols = new Set(hiddenColsArr);
    const visCol = (k) => !hiddenCols.has(k);
    const visibleColCount = 2 + INSIGHT_COLS.filter(c => visCol(c.key)).length;

    // 一次性遷移：把舊的 ec.insightWeekly 等（玩樂的資料）搬到新 key
    this.migrateInsightDataIfNeeded();

    const sKey = (type) => `ec.insight_${currentShop}_${type}`;

    const master = Store.get(sKey('master'), null);
    const weeks = Store.get(sKey('weeks'), []) || [];   // 多週歷史，新→舊
    const perf  = Store.get(sKey('perf'), null);
    const notes = Store.get(sKey('notes'), {}) || {};
    const T = Object.assign({}, INSIGHT_DEFAULT_THRESHOLDS, Store.get('ec.insightThresholds', {}) || {});

    // 固定 slot：本週 = weeks[0]，上週 = weeks[1]
    const sales = weeks[0] || null;
    const salesPrev = weeks[1] || null;
    const compareIdx = 1; // 給 prevPrev 計算用

    const masterByCode = master?.byCode || {};
    const salesProducts = sales?.products || [];
    const prevByCode = {};
    (salesPrev?.products || []).forEach(p => { prevByCode[p.code] = p; });
    // 為了算「上上週類別」，需要上上週的上一週
    const salesPrevPrev = (compareIdx + 1 < weeks.length) ? weeks[compareIdx + 1] : null;
    const prevPrevByCode = {};
    (salesPrevPrev?.products || []).forEach(p => { prevPrevByCode[p.code] = p; });
    // 為了算「上上上週類別」，需要 weeks[3]（隱藏第四週，自動往後推留下來的）
    const salesPrevPrevPrev = (compareIdx + 2 < weeks.length) ? weeks[compareIdx + 2] : null;
    const prevPrevPrevByCode = {};
    (salesPrevPrevPrev?.products || []).forEach(p => { prevPrevPrevByCode[p.code] = p; });
    const perfByShopeeId = perf?.byShopeeId || {};

    // 把蝦皮 exclusive 的結束日（例：6/8 00:00 表示截止到 6/7）顯示成 inclusive
    const displayPeriod = (period) => {
      if (!period) return '—';
      const m = period.match(/^(\d{4})\/(\d{2})\/(\d{2})\s*[–\-—]\s*(\d{4})\/(\d{2})\/(\d{2})$/);
      if (!m) return period;
      const [, sy, sm, sd, ey, em, ed] = m;
      const endDate = new Date(+ey, +em - 1, +ed);
      endDate.setDate(endDate.getDate() - 1);
      const ny = endDate.getFullYear();
      const nm = String(endDate.getMonth() + 1).padStart(2, '0');
      const nd = String(endDate.getDate()).padStart(2, '0');
      return `${sy}/${sm}/${sd} – ${ny}/${nm}/${nd}`;
    };

    // 合併：以 sales 為主，補上 master / perf / prev / notes
    const merged = salesProducts.map(s => {
      const m = masterByCode[s.code] || null;
      const shopeeId = m?.id || '';
      const p = shopeeId ? perfByShopeeId[shopeeId] : null;
      const prev = prevByCode[s.code] || null;
      const prevPrev = prevPrevByCode[s.code] || null;
      const prevPrevPrev = prevPrevPrevByCode[s.code] || null;
      // 成長率公式：
      //   - 兩週都有營收 → (新-舊)/舊
      //   - 舊週 = 0、新週有營收 → 從零起飛，視為 Infinity（會分到爆發品）
      //   - 沒有舊週對照（新品 / 停售）→ null（不分類）
      //   - 兩邊都 0 → 0
      const calcGrowth = (curRevObj, prevRevObj) => {
        if (!prevRevObj) return curRevObj && curRevObj.revenue > 0 ? null : 0;
        const cur = curRevObj?.revenue || 0;
        const pre = prevRevObj.revenue || 0;
        if (pre > 0) return (cur - pre) / pre;
        if (cur > 0) return Infinity;
        return 0;
      };
      const growthRate = calcGrowth(s, prev);
      const prevGrowthRate = prev ? calcGrowth(prev, prevPrev) : null;
      // 上上週 vs 上上上週 → 算出「上上上週類別」用的成長率
      const prevPrevGrowthRate = prevPrev ? calcGrowth(prevPrev, prevPrevPrev) : null;
      return {
        code: s.code,
        name: s.name,
        mocbicName: m?.mocbicName || '',
        shopeeId,
        revenue: s.revenue || 0,
        prevRevenue: prev?.revenue || 0,
        prevPrevRevenue: prevPrev?.revenue || 0,
        growthRate,
        prevGrowthRate,
        prevPrevGrowthRate,
        qty: s.qty || 0,
        profit: s.profit || 0,
        stock: s.stock || 0,
        demand: s.demand || 0,
        impressions: p?.impressions || 0,
        clicks: p?.clicks || 0,
        ctr: p?.ctr || 0,
        convRate: p?.convRate || 0,
        inMaster: !!m,
        note: notes[s.code] || null,
      };
    });

    const needMasterUpdate = merged.filter(p => !p.inMaster);

    // 排序：可點欄位標題切換
    const sortKey = this.filter.insightSortKey || 'revenue';
    const sortDir = this.filter.insightSortDir || 'desc';
    // 取該商品「最新一筆調整」的日期（轉成可比較整數 YYYYMMDD）
    //   無調整紀錄 → -Infinity，desc 排序時自動掉到最後
    const latestAdjInt = (note) => {
      const adjs = note && note.adjustments;
      if (!adjs || adjs.length === 0) return -Infinity;
      let max = -Infinity;
      for (const a of adjs) {
        const n = +String(a.date || '').replace(/\D/g, '');
        if (isFinite(n) && n > max) max = n;
      }
      return max;
    };
    const sortGetters = {
      code: p => p.code || '',
      prevPrev: p => p.prevPrevRevenue || 0,
      revenue: p => p.revenue || 0,
      growth: p => (p.growthRate == null ? -Infinity : p.growthRate),
      impressions: p => p.impressions || 0,
      ctr: p => p.ctr || 0,
      convRate: p => p.convRate || 0,
      stock: p => (p.stock - p.demand),
      note: p => latestAdjInt(p.note),
    };
    const getter = sortGetters[sortKey] || sortGetters.revenue;
    const sorted = merged.slice().sort((a, b) => {
      const va = getter(a), vb = getter(b);
      let cmp;
      if (typeof va === 'string' || typeof vb === 'string') cmp = String(va).localeCompare(String(vb));
      else cmp = (va - vb);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // 大類分組色票（成長=黃 / 轉換=綠 / 下滑=橘）
    const GROUP_STYLE = {
      '成長類': { color: '#a16207', bg: '#fef9c3', band: '#eab308' },
      '下滑類': { color: '#c2410c', bg: '#ffedd5', band: '#f97316' },
      '轉換類': { color: '#15803d', bg: '#dcfce7', band: '#22c55e' },
    };
    // 由細分類標籤推大類（用於上色和分組）
    const groupOf = (label) => {
      if (!label) return null;
      if (label.indexOf('爆發品') >= 0 || label.indexOf('成長品') >= 0) return '成長類';
      if (label.indexOf('衰退品') >= 0 || label.indexOf('重跌品') >= 0) return '下滑類';
      if (label.indexOf('轉換') >= 0) return '轉換類';
      return null;
    };

    // 完整分類（用使用者設定的門檻）
    // metricsOverride 可指定 growthRate，未指定就用 p 本身（用於計算上週類別）
    // 依【玩】洞察表規則：7 分類
    //   成長類（依該期間 growth）：🟡 爆發品 > 50% / 🟨 成長品 10%~50%
    //   下滑類（依該期間 growth）：🟥 衰退品 -10%~-50% / 🔴 重跌品 < -50%
    //   轉換類（成長率落在 ±10% 中間時 fallback，皆需點擊率 > 3%）：
    //     ❎ 零轉換 = 轉換率 0%
    //     🟢 弱轉換 = 轉換率 1%~3%
    //     🟩 轉換偏低 = 轉換率 3%~6%
    //   過去週期沒有自己的轉換/點擊資料，沿用「當前」的轉換率與點擊率做 fallback 判斷（與 Sheet 母表邏輯一致）
    const classifyMetrics = (growthRate, convRate, clicks, impressions, ctr) => {
      // 同大類用相同色（成長類=黃 / 下滑類=橘 / 轉換類=綠），方便視覺分群
      const GROW = { color: '#a16207', bg: '#fef9c3' };  // 黃
      const DROP = { color: '#c2410c', bg: '#ffedd5' };  // 橘
      const CONV = { color: '#15803d', bg: '#dcfce7' };  // 綠
      if (growthRate !== null && growthRate !== undefined) {
        const g = growthRate * 100;
        if (g > T.explosion)  return { label: '🟡 爆發品', ...GROW };
        if (g >= T.growth)    return { label: '🟨 成長品', ...GROW };
        if (g < T.heavyDrop)  return { label: '🔴 重跌品', ...DROP };
        if (g <= T.drop)      return { label: '🟥 衰退品', ...DROP };
      }
      const ctrPct = (ctr || 0) * 100;
      const convPct = (convRate || 0) * 100;
      if (ctrPct > T.ctrMin) {
        if (convRate === 0)                                              return { label: '❎ 零轉換',   ...CONV };
        if (convPct >= T.weakConvMin && convPct < T.weakConvMax)         return { label: '🟢 弱轉換',   ...CONV };
        if (convPct >= T.lowConvMin && convPct <= T.lowConvMax)          return { label: '🟩 轉換偏低', ...CONV };
      }
      return null;
    };
    const classifyProduct  = (p) => classifyMetrics(p.growthRate,        p.convRate, p.clicks, p.impressions, p.ctr);
    const classifyPrev     = (p) => classifyMetrics(p.prevGrowthRate,    p.convRate, p.clicks, p.impressions, p.ctr);
    const classifyPrevPrev = (p) => classifyMetrics(p.prevPrevGrowthRate, p.convRate, p.clicks, p.impressions, p.ctr);

    // 總計
    const totalRev = sorted.reduce((s, p) => s + p.revenue, 0);
    const totalProfit = sorted.reduce((s, p) => s + p.profit, 0);
    const totalQty = sorted.reduce((s, p) => s + p.qty, 0);

    const fmt = n => (n > 0 || n < 0) ? Math.round(n).toLocaleString() : '—';
    const fmtPct = n => isFinite(n) && n > 0 ? (n * 100).toFixed(2) + '%' : '—';
    const fmtTime = (ts) => ts ? new Date(ts).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' }) : '';

    // 上傳狀態卡片（4 個：母表 / 本週銷售 / 上週銷售 / 商品表現）
    const uploadCards = [
      {
        key: 'master', label: '商品清單（母表）', icon: '📋',
        loaded: !!master, info: master ? `${Object.keys(masterByCode).length} 個編號 · ${fmtTime(master.uploadedAt)}` : '尚未上傳',
        accept: '.xlsx,.xls', inputId: 'insight-master-upload',
        hint: '一次上傳，自動分配到 3 個賣場分頁'
      },
      {
        key: 'sales', label: '上週銷售排行', icon: '💰',
        loaded: !!sales, info: sales ? `${salesProducts.length} 個編號 · ${displayPeriod(sales.period) || ''} · ${fmtTime(sales.uploadedAt)}` : '尚未上傳',
        accept: '.xlsx,.xls', inputId: 'insight-sales-upload',
        hint: '上週商品銷售（系統會依檔案週期自動歸位）'
      },
      {
        key: 'salesPrev', label: '上上週銷售排行', icon: '📅',
        loaded: !!salesPrev, info: salesPrev ? `${(salesPrev.products || []).length} 個編號 · ${displayPeriod(salesPrev.period) || ''} · ${fmtTime(salesPrev.uploadedAt)}` : '尚未上傳',
        accept: '.xlsx,.xls', inputId: 'insight-salesprev-upload',
        hint: '上上週商品銷售（成長率/類別流向用）'
      },
      {
        key: 'salesPrevPrev', label: '上上上週銷售排行', icon: '🗓️',
        loaded: !!salesPrevPrev, info: salesPrevPrev ? `${(salesPrevPrev.products || []).length} 個編號 · ${displayPeriod(salesPrevPrev.period) || ''} · ${fmtTime(salesPrevPrev.uploadedAt)}` : '尚未上傳',
        accept: '.xlsx,.xls', inputId: 'insight-salesprevprev-upload',
        hint: '上上上週商品銷售（三週對照用）'
      },
      {
        key: 'perf', label: '商品表現（蝦皮）', icon: '📊',
        loaded: !!perf, info: perf ? `${Object.keys(perfByShopeeId).length} 個商品 · ${fmtTime(perf.uploadedAt)}` : '尚未上傳',
        accept: '.xlsx,.xls', inputId: 'insight-perf-upload',
        hint: '商品ID / 曝光 / 點擊 / 轉換率（可出貨）'
      },
    ];

    // 上傳區包成浮窗，預設隱藏；點「📤 上傳檔案」按鈕才開啟
    const uploadGridHtml = `
      <div id="insight-upload-overlay" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9000;align-items:center;justify-content:center;padding:24px">
        <div style="background:white;border-radius:12px;width:100%;max-width:880px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e5e7eb;background:#fafbfc">
            <div>
              <h3 style="margin:0;font-size:15px;font-weight:700">📤 上傳檔案</h3>
              <p style="margin:2px 0 0;font-size:12px;color:#dc2626;font-weight:700">載入最新上週銷售排行，直接拖移到上週銷售排行位置，系統會自動將檔案換位處理</p>
            </div>
            <button id="insight-upload-close" type="button" style="width:30px;height:30px;border:1px solid var(--border);background:white;border-radius:6px;font-size:14px;cursor:pointer;color:var(--text-muted)">✕</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;padding:18px;background:#fafbfc">
            ${uploadCards.map(u => `
              <label data-drop-input="${u.inputId}" style="background:white;border:1px solid ${u.loaded ? '#10b98144' : '#e5e7eb'};border-radius:8px;padding:14px 16px;cursor:pointer;display:block;transition:border-color .12s,background-color .12s;position:relative" onmouseover="this.style.borderColor='${u.loaded ? '#10b981' : '#9ca3af'}'" onmouseout="this.style.borderColor='${u.loaded ? '#10b98144' : '#e5e7eb'}'">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="font-size:18px">${u.icon}</span>
                  <span style="font-size:14px;font-weight:600;color:var(--text)">${escapeHtml(u.label)}</span>
                  ${u.loaded
                    ? `<span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px">
                         <span style="font-size:11px;color:#10b981;font-weight:700">✓ 已載入</span>
                         <button type="button" data-clear-piece="${u.key}" title="清除這份" style="width:20px;height:20px;border:0;border-radius:4px;background:transparent;color:#9ca3af;font-size:13px;line-height:1;cursor:pointer;padding:0" onmouseover="this.style.background='#fee2e2';this.style.color='#dc2626'" onmouseout="this.style.background='transparent';this.style.color='#9ca3af'">✕</button>
                       </span>`
                    : '<span style="margin-left:auto;font-size:11px;color:var(--text-muted)">點此上傳</span>'
                  }
                </div>
                <div style="font-size:12px;color:var(--text-muted);line-height:1.4">${escapeHtml(u.info)}</div>
                <div style="font-size:11px;color:#cbd5e1;margin-top:3px">${escapeHtml(u.hint)}</div>
                <input type="file" id="${u.inputId}" accept="${u.accept}" style="display:none">
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // 警示：母表缺漏（精簡 chip 版，內嵌在期間列右側）
    const warningHtml = needMasterUpdate.length > 0 ? `
      <details style="position:relative;display:inline-block;margin-left:6px">
        <summary class="pill" style="padding:4px 10px;background:#fef3c7;border:1px solid #fcd34d;border-radius:7px;font-size:12px;font-weight:600;color:#92400e;list-style:none;cursor:pointer;user-select:none">⚠️ ${needMasterUpdate.length} 個商品不在母表</summary>
        <div style="position:absolute;top:32px;left:0;z-index:50;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.12);padding:10px 14px;min-width:280px;max-width:480px;font-size:12px;color:var(--text);line-height:1.5">
          請更新母表 Excel 後重新上傳，否則這些商品<strong>無法對應到商品 ID / 蝦皮表現</strong>。
          <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">
            ${needMasterUpdate.map(p => `<button class="insight-jump-code" data-jump-code="${escapeHtml(p.code)}" style="padding:2px 8px;border:1px solid #fcd34d;background:#fef9c3;border-radius:5px;font-size:11px;font-weight:700;color:#92400e;cursor:pointer;font-family:monospace" onmouseover="this.style.background='#fde68a'" onmouseout="this.style.background='#fef9c3'">${escapeHtml(p.code)}</button>`).join('')}
          </div>
        </div>
      </details>
    ` : '';

    const fmtGrowth = (g) => {
      if (g === null || g === undefined) return '<span style="color:var(--text-muted)">—</span>';
      if (!isFinite(g)) return '<span style="color:#10b981;font-weight:700" title="從 0 起飛">↑ 新爆發</span>';
      const pct = g * 100;
      if (pct === 0) return '<span style="color:var(--text-muted)">0%</span>';
      const color = pct > 0 ? '#10b981' : '#ef4444';
      const arrow = pct > 0 ? '↑' : '↓';
      return `<span style="color:${color};font-weight:700">${arrow} ${Math.abs(pct).toFixed(0)}%</span>`;
    };

    // 細分類篩選：先計算每個分類的商品數
    const classifyOf = (p) => {
      const c = classifyProduct(p);
      return c ? c.label.replace(/^[^一-龥]+/, '').trim() : '';
    };
    const classCounts = {};
    sorted.forEach(p => {
      const c = classifyOf(p);
      if (c) classCounts[c] = (classCounts[c] || 0) + 1;
    });
    // 複選：insightClass 是已勾選的類別陣列；空陣列 / null = 全部
    // 相容舊資料：如果是字串就轉成陣列
    let selectedClasses = this.filter.insightClass;
    if (typeof selectedClasses === 'string') selectedClasses = selectedClasses === 'all' || !selectedClasses ? [] : [selectedClasses];
    if (!Array.isArray(selectedClasses)) selectedClasses = [];
    const selectedSet = new Set(selectedClasses);
    const ctrLowFilter = !!this.filter.insightCtrLow;
    let filteredSorted = selectedSet.size === 0
      ? sorted
      : sorted.filter(p => selectedSet.has(classifyOf(p)));
    if (ctrLowFilter) {
      filteredSorted = filteredSorted.filter(p => p.ctr > 0 && p.ctr < 0.03);
    }
    const ctrLowCount = sorted.filter(p => p.ctr > 0 && p.ctr < 0.03).length;

    const CLASS_PILLS = [
      { group: '下滑類', color: '#b91c1c', items: [
        { key: '重跌品', emoji: '🔴' },
        { key: '衰退品', emoji: '🟥' },
      ]},
      { group: '成長類', color: '#15803d', items: [
        { key: '爆發品', emoji: '🟡' },
        { key: '成長品', emoji: '🟨' },
      ]},
      { group: '轉換類', color: '#1d4ed8', items: [
        { key: '零轉換', emoji: '❎' },
        { key: '弱轉換', emoji: '🟢' },
        { key: '轉換偏低', emoji: '🟩' },
      ]},
    ];

    const allActive = selectedSet.size === 0;
    const ctrPillHtml = `<button class="pill ${ctrLowFilter ? 'active' : ''}" data-insight-ctr-low="${ctrLowFilter ? '0' : '1'}" title="只看點擊率 < 3% 的商品" style="padding:4px 12px;font-size:13px;border:0;${ctrLowFilter ? 'background:#f59e0b;color:white;font-weight:700' : 'background:transparent;color:'+(ctrLowCount > 0 ? '#b45309' : '#cbd5e1')+';font-weight:600'}">📉 點擊率&lt;3% ${ctrLowCount}</button>`;
    const colMenuHtml = `
      <span style="display:inline-flex;align-items:center;gap:6px;margin-left:auto">
        <details id="insight-col-menu" style="position:relative" ${this._insightColMenuOpen ? 'open' : ''}>
          <summary class="pill" style="padding:6px 12px;font-size:12px;list-style:none;cursor:pointer;user-select:none">👁 欄位 (${INSIGHT_COLS.length - hiddenCols.size}/${INSIGHT_COLS.length})</summary>
          <div style="position:absolute;top:36px;right:0;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.12);padding:8px;min-width:180px;z-index:100">
            ${INSIGHT_COLS.map(c => `
              <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;font-size:12px;border-radius:5px;user-select:none" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background=''">
                <input type="checkbox" data-col-toggle="${c.key}" ${visCol(c.key) ? 'checked' : ''} style="margin:0;cursor:pointer">
                <span>${escapeHtml(c.label)}</span>
              </label>
            `).join('')}
            <div style="border-top:1px solid #f3f4f6;margin:6px 0 4px"></div>
            <button id="insight-col-show-all" type="button" style="width:100%;padding:6px;border:0;background:transparent;font-size:11px;color:var(--primary);cursor:pointer;border-radius:5px;font-weight:600">顯示全部</button>
          </div>
        </details>
        <button id="insight-settings" class="pill" style="padding:6px 12px;font-size:12px">⚙ 分類門檻設定</button>
      </span>
    `;
    const classFilterPillsHtml = sorted.length > 0 ? `
      <button class="pill ${allActive ? 'active' : ''}" data-insight-class="all" style="padding:4px 12px;font-size:12px;border:0;${allActive ? 'background:var(--primary);color:white;font-weight:700' : 'background:transparent;color:var(--text-muted);font-weight:600'}">全部 ${sorted.length}</button>
      ${CLASS_PILLS.map(g => {
        const groupTotal = g.items.reduce((s, it) => s + (classCounts[it.key] || 0), 0);
        const selectedInGroup = g.items.filter(it => selectedSet.has(it.key));
        const groupActive = selectedInGroup.length > 0;
        return `
          <details class="insight-group-menu" style="position:relative">
            <summary class="pill" style="padding:4px 10px;font-size:12px;list-style:none;cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:5px;border:1px solid ${groupActive ? g.color : g.color+'44'};background:${groupActive ? g.color+'15' : 'white'};color:${g.color};font-weight:700;border-radius:99px">
              ${escapeHtml(g.group)} ${groupTotal}
              ${selectedInGroup.length > 0 ? `<span style="background:${g.color};color:white;border-radius:99px;padding:1px 6px;font-size:10px;font-weight:700">${selectedInGroup.length}</span>` : ''}
              <span style="font-size:10px;color:${g.color};opacity:.6">▾</span>
            </summary>
            <div style="position:absolute;top:32px;left:0;z-index:60;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.12);padding:6px;display:flex;flex-direction:column;gap:4px;min-width:160px">
              ${g.items.map(it => {
                const cnt = classCounts[it.key] || 0;
                const isActive = selectedSet.has(it.key);
                return `<button class="pill" data-insight-class="${escapeHtml(it.key)}" style="padding:5px 12px;font-size:13px;border:0;text-align:left;${isActive ? 'background:'+g.color+';color:white;font-weight:700' : 'background:transparent;color:'+(cnt > 0 ? g.color : '#cbd5e1')+';font-weight:600'};border-radius:6px">${it.emoji} ${escapeHtml(it.key)} ${cnt}</button>`;
              }).join('')}
            </div>
          </details>
        `;
      }).join('')}
      ${ctrPillHtml}
      ${colMenuHtml}
    ` : '';

    const rowsHtml = filteredSorted.length === 0
      ? `<tr><td colspan="${visibleColCount}" style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">${sorted.length === 0 ? '尚未上傳銷售排行 Excel' : `沒有符合「${escapeHtml(Array.from(selectedSet).join('、') || '全部')}」的商品`}</td></tr>`
      : filteredSorted.map((p, i) => {
          const netStock = p.stock - p.demand;
          const cls = classifyProduct(p);
          const prevCls = classifyPrev(p);
          const grp = groupOf(cls?.label);
          const prevGrp = groupOf(prevCls?.label);
          const grpStyle = grp ? GROUP_STYLE[grp] : null;
          const hasNote = p.note && (p.note.text || (p.note.adjustments && p.note.adjustments.length > 0));

          // 滑鼠 hover 顯示的內容：同日合併、用「、」串、最新在上；最後加長期備註
          // 同時抓出「最新一筆」直接顯示在表格內
          let hoverPreview = '';
          let latestAdjText = '';
          let latestAdjDate = '';
          if (hasNote) {
            const lines = [];
            const adjMap = new Map();
            (p.note.adjustments || []).forEach(a => {
              const d = a.date || '';
              if (!adjMap.has(d)) adjMap.set(d, []);
              adjMap.get(d).push(a.text || '');
            });
            const sortedDates = Array.from(adjMap.keys()).sort((a, b) => b.localeCompare(a));
            sortedDates.forEach(d => lines.push(`${d}　${adjMap.get(d).join('、')}`));
            if (p.note.text) {
              if (lines.length) lines.push('────────');
              lines.push(`📌 ${p.note.text}`);
            }
            hoverPreview = lines.join('\n');
            // 最新一天的所有紀錄：用「、」串起；找最新日期 → 抓那天所有 text
            if (sortedDates.length > 0) {
              latestAdjDate = sortedDates[0];
              latestAdjText = adjMap.get(latestAdjDate).join('、');
            } else if (p.note.text) {
              latestAdjText = p.note.text;
              latestAdjDate = '📌';
            }
          } else {
            hoverPreview = '點此新增備註 / 調整紀錄';
          }

          // 流向：上上上週 → 上上週 → 上週（從舊到新；任一格沒分類就用 — 佔位，不會整欄消失）
          const prevPrevCls = classifyPrevPrev(p);
          const prevPrevGrp = groupOf(prevPrevCls?.label);
          const pill = (c) => `<span style="padding:2px 7px;border-radius:5px;background:${c.bg};color:${c.color};font-weight:700">${escapeHtml(c.label)}</span>`;
          const emptyPill = '<span style="color:var(--text-muted);font-weight:700;padding:2px 7px">—</span>';
          const arrowOf = (fromGrp, toGrp) => {
            const sameGrp = fromGrp === toGrp;
            const c = sameGrp ? '#9ca3af' : (toGrp === '下滑類' ? '#ef4444' : toGrp === '成長類' ? '#10b981' : '#3b82f6');
            return `<span style="color:${c};font-weight:700">→</span>`;
          };
          // 只要任一週有分類就顯示完整三格流向；都沒有才整欄降級成 —
          let flowHtml = '—';
          if (prevPrevCls || prevCls || cls) {
            flowHtml = `
              <div style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:13px">
                ${prevPrevCls ? pill(prevPrevCls) : emptyPill}${arrowOf(prevPrevGrp, prevGrp)}${prevCls ? pill(prevCls) : emptyPill}${arrowOf(prevGrp, grp)}${cls ? pill(cls) : emptyPill}
              </div>`;
          }

          // 大類 chip
          const groupChip = grp
            ? `<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:6px;background:${grpStyle.bg};color:${grpStyle.color};font-weight:700;font-size:13px;letter-spacing:.02em">${grp}</span>`
            : '<span style="color:var(--text-muted)">—</span>';

          // 列底色：大類淡色 + 缺母表覆蓋
          const bandColor = grpStyle ? grpStyle.band : 'transparent';
          const rowBg = !p.inMaster ? '#fef3c7aa' : (grpStyle ? grpStyle.bg + '40' : '');

          return `
            <tr data-product-code="${escapeHtml(p.code)}" style="border-top:1px solid #f3f4f6;background:${rowBg};transition:background-color .4s">
              <td style="padding:0;width:4px;background:${bandColor}"></td>
              <td style="padding:8px 4px 8px 8px;color:var(--text);width:1%;white-space:nowrap;text-align:left;vertical-align:top">
                <div style="display:grid;grid-template-columns:auto auto;column-gap:6px;row-gap:2px;align-items:center;justify-content:start">
                  <div style="font-weight:700;font-size:14px;line-height:1.4;font-variant-numeric:tabular-nums;white-space:nowrap">${escapeHtml(p.code)}</div>
                  <div style="font-weight:600;font-size:14px;line-height:1.4;white-space:nowrap">${escapeHtml(p.mocbicName || p.name)}</div>
                  ${p.shopeeId ? `<div></div><div style="font-size:11px;color:var(--text-muted);font-family:monospace;line-height:1.2;white-space:nowrap">ID: ${escapeHtml(p.shopeeId)}</div>` : ''}
                </div>
                ${!p.inMaster ? '<div style="font-size:10px;color:#f59e0b;font-weight:600;margin-top:4px;line-height:1.2">⚠ 需更新母表</div>' : ''}
              </td>
              ${visCol('prevPrev') ? `<td style="padding:8px 4px;text-align:left;font-size:13px;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums;vertical-align:top">
                ${p.prevPrevRevenue > 0 ? `NT$ ${fmt(p.prevPrevRevenue)}` : '—'}
              </td>` : ''}
              ${visCol('revenue') ? `<td style="padding:8px 4px;text-align:right;font-size:14px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;vertical-align:top;line-height:1.4">
                NT$ ${fmt(p.revenue)}
                ${p.prevRevenue > 0 ? `<div style="font-size:13px;color:var(--text-muted);font-weight:600;margin-top:3px;line-height:1.3">上上週 ${fmt(p.prevRevenue)}</div>` : ''}
              </td>` : ''}
              ${visCol('growth') ? `<td style="padding:8px 4px;text-align:center;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;vertical-align:top">${fmtGrowth(p.growthRate)}</td>` : ''}
              ${visCol('impressions') ? `<td style="padding:8px 4px;text-align:center;font-size:14px;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums;vertical-align:top">${p.impressions > 0 ? fmt(p.impressions) : '—'}</td>` : ''}
              ${visCol('ctr') ? `<td style="padding:8px 4px;text-align:right;font-size:14px;color:${p.ctr > 0 && p.ctr < 0.03 ? '#ef4444' : 'var(--text-muted)'};font-variant-numeric:tabular-nums;font-weight:${p.ctr > 0 && p.ctr < 0.03 ? '700' : '600'};vertical-align:top">${fmtPct(p.ctr)}</td>` : ''}
              ${visCol('convRate') ? `<td style="padding:8px 4px;text-align:center;font-size:14px;font-weight:${p.convRate > 0 ? '700' : '500'};color:${p.convRate > 0 && p.convRate < 0.01 ? '#ef4444' : p.convRate >= 0.02 ? '#10b981' : 'var(--text-muted)'};font-variant-numeric:tabular-nums;vertical-align:top">${fmtPct(p.convRate)}</td>` : ''}
              ${visCol('group') ? `<td style="padding:8px 4px;text-align:center;font-size:13px;vertical-align:top">${groupChip}</td>` : ''}
              ${visCol('flow') ? `<td style="padding:8px 4px;text-align:center;font-size:13px;vertical-align:top">${flowHtml}</td>` : ''}
              ${visCol('stock') ? `<td style="padding:8px 4px;text-align:center;font-size:14px;color:${netStock <= 0 ? '#ef4444' : netStock < 30 ? '#f59e0b' : 'var(--text-muted)'};font-variant-numeric:tabular-nums;font-weight:${netStock <= 0 ? 700 : 600};white-space:nowrap;vertical-align:top">${fmt(netStock)} ${netStock <= 0 ? '⚠' : ''}</td>` : ''}
              ${visCol('note') ? `<td style="padding:6px 8px;vertical-align:top;min-width:140px;max-width:200px;text-align:left">
                <div data-insight-note="${escapeHtml(p.code)}" title="${escapeHtml(hoverPreview)}" style="display:flex;align-items:flex-start;gap:4px;cursor:pointer;padding:4px 6px;border-radius:5px;text-align:left;${hasNote ? 'background:#fef3c7' : ''}" onmouseover="this.style.background='${hasNote ? '#fde68a' : '#f3f4f6'}'" onmouseout="this.style.background='${hasNote ? '#fef3c7' : ''}'">
                  ${latestAdjText ? `
                    <div style="flex:1;min-width:0;line-height:1.3;text-align:left">
                      <div style="font-size:11px;color:#6366f1;font-weight:700;font-variant-numeric:tabular-nums;text-align:left">${escapeHtml(latestAdjDate)}</div>
                      <div style="font-size:13px;color:#312e81;font-weight:600;text-align:left;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-all">${escapeHtml(latestAdjText)}</div>
                    </div>
                    <span style="font-size:13px;flex-shrink:0">📝</span>
                  ` : `
                    <div style="flex:1;color:var(--text-muted);font-size:11px;text-align:left;padding:2px 0">點此新增</div>
                    <span style="font-size:13px;flex-shrink:0">📝</span>
                  `}
                </div>
              </td>` : ''}
            </tr>
          `;
        }).join('');

    return `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:14px 18px;border-bottom:1px solid #e5e7eb">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h3 style="margin:0;font-size:16px;font-weight:600;letter-spacing:-.01em">營運表現洞察表 · ${escapeHtml(currentShop)}</h3>
            ${INSIGHT_SHOPS.filter(s => s !== currentShop).map(s => `
              <button class="pill" data-insight-shop="${escapeHtml(s)}" style="padding:4px 12px;font-size:12px;border:1px solid var(--border);background:white;color:var(--text-muted);font-weight:600;border-radius:99px;cursor:pointer">${escapeHtml(s)}</button>
            `).join('')}
            ${warningHtml}
          </div>
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            ${sorted.length > 0 ? `
              <div style="display:flex;align-items:center;gap:28px">
                <div style="text-align:left">
                  <div style="font-size:12px;color:var(--text-muted);font-weight:600;letter-spacing:.05em">上週總營收</div>
                  <div style="font-size:20px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;line-height:1.25;margin-top:2px">NT$ ${fmt(totalRev)}</div>
                </div>
                <div style="text-align:left">
                  <div style="font-size:12px;color:var(--text-muted);font-weight:600;letter-spacing:.05em">上週總獲利</div>
                  <div style="font-size:20px;font-weight:700;color:#10b981;font-variant-numeric:tabular-nums;line-height:1.25;margin-top:2px">NT$ ${fmt(totalProfit)}</div>
                </div>
              </div>
            ` : ''}
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <button id="insight-sync-cloud" class="btn-add" title="把這台機器上未同步的調整紀錄一次推到雲端" style="padding:6px 12px;font-size:12px;background:#fff;color:#475569;border:1px solid #cbd5e1;display:inline-flex;align-items:center;gap:6px">
                <span>☁ 同步雲端</span>
                <span id="insight-sync-badge" style="display:none;min-width:18px;height:18px;padding:0 5px;background:#ef4444;color:white;border-radius:9px;font-size:10px;font-weight:700;align-items:center;justify-content:center;line-height:1">0</span>
              </button>
              <button id="insight-upload-open" class="btn-add" style="padding:6px 14px;font-size:12px">📤 上傳檔案</button>
              ${sales ? `<button id="insight-export" class="btn-add" style="padding:6px 12px;font-size:12px">⬇ 匯出 Excel</button>` : ''}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid #e5e7eb;background:#fafbfc;flex-wrap:wrap">
          ${sales ? `
            <span style="font-size:12px;color:var(--text-muted);font-weight:500">上週</span>
            <span style="padding:4px 10px;background:white;border:1px solid var(--border);border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums">${escapeHtml(displayPeriod(sales.period) || sales.periodKey || '—')}</span>
          ` : ''}
          ${salesPrev ? `
            <span style="font-size:12px;color:var(--text-muted);font-weight:500;margin-left:4px">上上週</span>
            <span style="padding:4px 10px;background:white;border:1px solid var(--border);border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums">${escapeHtml(displayPeriod(salesPrev.period) || salesPrev.periodKey || '—')}</span>
          ` : ''}
          ${classFilterPillsHtml}
        </div>
        ${uploadGridHtml}
        <div class="table-wrap" style="max-height:calc(100vh - 280px);min-height:520px;overflow-y:auto">
          <table style="border-collapse:separate;border-spacing:0;width:100%;font-size:12px">
            <thead style="position:sticky;top:0;z-index:1;background:#f9fafb">
              <tr>
                <th style="padding:0;width:4px;border-bottom:1px solid #e5e7eb"></th>
                ${(() => {
                  // 漏斗排序圖示：active 時用實心藍漏斗 + 方向箭頭；未啟用用淡灰漏斗
                  const hasActiveSort = !!this.filter.insightSortKey;
                  const arrowFor = (k) => {
                    const active = (hasActiveSort && k === sortKey);
                    if (active) {
                      const dirArr = sortDir === 'asc' ? '↑' : '↓';
                      return `<span style="display:inline-flex;align-items:center;gap:1px;margin-left:3px;color:var(--primary);font-weight:700;font-size:11px"><svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-1px"><path d="M2 2h12l-4.5 6v5l-3 1.5V8L2 2z"/></svg>${dirArr}</span>`;
                    }
                    return `<span style="margin-left:3px;color:#cbd5e1;font-weight:500"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" style="vertical-align:-1px"><path d="M2 2h12l-4.5 6v5l-3 1.5V8L2 2z"/></svg></span>`;
                  };
                  const sortableTh = (key, label, align, extra = '') =>
                    `<th data-sort-key="${key}" title="點此選擇排序" style="padding:10px 4px;text-align:${align};font-size:13px;color:var(--text-muted);font-weight:700;border-bottom:1px solid #e5e7eb;cursor:pointer;user-select:none;${extra}">${label}${arrowFor(key)}</th>`;
                  return `<th data-sort-key="code" title="點擊排序" style="padding:10px 8px;text-align:left;font-size:13px;color:var(--text-muted);font-weight:700;border-bottom:1px solid #e5e7eb;cursor:pointer;user-select:none">商品編號 / 名稱 / ID${arrowFor('code')}</th>
                ${visCol('prevPrev') ? sortableTh('prevPrev', '上上上週營收', 'left', 'white-space:nowrap') : ''}
                ${visCol('revenue') ? sortableTh('revenue', '上週 / 上上週營收', 'right', 'white-space:nowrap') : ''}
                ${visCol('growth') ? sortableTh('growth', '成長率', 'center') : ''}
                ${visCol('impressions') ? sortableTh('impressions', '曝光次數', 'center', 'white-space:nowrap') : ''}
                ${visCol('ctr') ? sortableTh('ctr', '點擊率', 'right', 'white-space:nowrap') : ''}
                ${visCol('convRate') ? sortableTh('convRate', '轉換率', 'center') : ''}
                ${visCol('group') ? `<th style="padding:10px 4px;text-align:center;font-size:13px;color:var(--text-muted);font-weight:700;border-bottom:1px solid #e5e7eb">大類</th>` : ''}
                ${visCol('flow') ? `<th style="padding:10px 4px;text-align:center;font-size:13px;color:var(--text-muted);font-weight:700;border-bottom:1px solid #e5e7eb;white-space:nowrap">判斷結果</th>` : ''}
                ${visCol('stock') ? sortableTh('stock', '可用庫存', 'center') : ''}
                ${visCol('note') ? `<th data-sort-key="note" title="點擊依「最新調整日期」排序" style="padding:10px 6px;text-align:left;font-size:13px;color:var(--text-muted);font-weight:700;border-bottom:1px solid #e5e7eb;min-width:130px;cursor:pointer;user-select:none">調整（最新）${arrowFor('note')}</th>` : ''}`;
                })()}
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  },
  parseInsightExcel(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') {
        reject(new Error('XLSX 函式庫未載入，請重新整理頁面'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (rows.length < 2) throw new Error('Excel 沒有資料');

          // Row 0 = headers
          const headers = rows[0].map(h => String(h || '').trim());
          // Find column indexes by header name
          const idx = (name) => headers.findIndex(h => h.indexOf(name) >= 0);
          const colCode = idx('商品編號');
          const colName = idx('商品名稱');
          const colStock = idx('可用庫存');
          const colDemand = idx('需求');
          const colPrice = idx('售價');
          const colCost = idx('成本');
          const colProfit = idx('獲利');
          const colQty = idx('銷售數量');

          if (colCode < 0 || colName < 0 || colPrice < 0) {
            throw new Error(`找不到必要欄位（商品編號 / 商品名稱 / 售價）。實際欄位：${headers.join(', ').slice(0, 200)}`);
          }

          // 試著從「銷售數量」欄位標題抓出期間，例如「銷售數量(202606010000~202606080000)」
          const qtyHeader = colQty >= 0 ? headers[colQty] : '';
          let period = '';
          const m = qtyHeader.match(/(\d{8})\d*~(\d{8})/);
          if (m) {
            const [, s, e] = m;
            period = `${s.slice(0,4)}/${s.slice(4,6)}/${s.slice(6,8)} – ${e.slice(0,4)}/${e.slice(4,6)}/${e.slice(6,8)}`;
          }

          const merged = {};
          for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            const code = String(row[colCode] || '').trim();
            if (!code) continue;
            const num = (i) => {
              if (i < 0) return 0;
              const v = row[i];
              if (v === '' || v == null) return 0;
              const n = +String(v).replace(/,/g, '');
              return isFinite(n) ? n : 0;
            };
            if (!merged[code]) {
              merged[code] = {
                code,
                name: String(row[colName] || '').trim(),
                stock: 0, demand: 0,
                revenue: 0, cost: 0, profit: 0, qty: 0,
              };
            }
            // 庫存 / 需求 同商品編號各規格累加（可用庫存 = SUM(J - K) 每列）
            merged[code].stock   += num(colStock);
            merged[code].demand  += num(colDemand);
            // 營收 / 成本 / 獲利 / 銷售數量 也累加（各規格獨立）
            merged[code].revenue += num(colPrice);
            merged[code].cost    += num(colCost);
            merged[code].profit  += num(colProfit);
            merged[code].qty     += num(colQty);
            // 名稱以較完整版本為主
            if (!merged[code].name && row[colName]) merged[code].name = String(row[colName]).trim();
          }

          const products = Object.values(merged);
          resolve({ products, period, headers, rawRows: rows.length - 1 });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error || new Error('讀取失敗'));
      reader.readAsArrayBuffer(file);
    });
  },
  parseInsightMasterExcel(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') return reject(new Error('XLSX 函式庫未載入'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const SHOPS = ['玩樂', '好麻吉', '森之旅'];

          // 把一個分頁解析成 byCode map（各賣場 header 不一致，用 alias 比對）
          const parseSheet = (sheetName) => {
            const ws = wb.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (rows.length < 2) return null;
            const headers = rows[0].map(h => String(h || '').trim());
            const idx = (n) => headers.findIndex(h => h.indexOf(n) >= 0);
            // 嘗試多個 alias，返回第一個找到的欄位 index
            const idxOf = (...names) => {
              for (const n of names) {
                const i = idx(n);
                if (i >= 0) return i;
              }
              return -1;
            };
            // 商品編號 alias: 「商品編號」(玩樂/森之旅) / 「商品選項貨號」(好麻吉)
            const cCode = idxOf('商品編號', '商品選項貨號', '商品貨號');
            // 商品ID 三個分頁都叫商品ID
            const cId   = idxOf('商品ID');
            // 莫筆克名稱 / 莫比克名 / 莫比克名稱：用「莫」做寬鬆比對
            const cMoc  = idxOf('莫');
            const cName = idxOf('商品名稱');
            if (cCode < 0 || cId < 0) return null;
            const byCode = {};
            for (let r = 1; r < rows.length; r++) {
              const row = rows[r];
              const code = String(row[cCode] || '').trim();
              if (!code) continue;
              byCode[code] = {
                id: String(row[cId] || '').trim(),
                name: cName >= 0 ? String(row[cName] || '').trim() : '',
                mocbicName: cMoc >= 0 ? String(row[cMoc] || '').trim() : '',
              };
            }
            return { byCode, sheet: sheetName, rawRows: rows.length - 1, headers };
          };

          // 對每個賣場，先找完整名稱對應，找不到再用第一個字找
          const shops = {};
          const matched = [];
          for (const shop of SHOPS) {
            const firstChar = shop.charAt(0);
            let target = wb.SheetNames.find(n => n.indexOf(shop) >= 0);
            if (!target) target = wb.SheetNames.find(n => n.indexOf(firstChar) >= 0);
            if (target) {
              const parsed = parseSheet(target);
              if (parsed && Object.keys(parsed.byCode).length > 0) {
                shops[shop] = parsed;
                matched.push(`${shop}（${target}）`);
              }
            }
          }

          if (Object.keys(shops).length === 0) {
            throw new Error(`找不到任何賣場分頁（預期：玩樂 / 好麻吉 / 森之旅）。實際分頁：${wb.SheetNames.join(', ')}`);
          }
          resolve({ shops, matched, allSheets: wb.SheetNames });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(reader.error || new Error('讀取失敗'));
      reader.readAsArrayBuffer(file);
    });
  },
  parseInsightPerfExcel(file) {
    return new Promise((resolve, reject) => {
      if (typeof XLSX === 'undefined') return reject(new Error('XLSX 函式庫未載入'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          // 跨所有分頁合併（蝦皮匯出可能有「最佳表現」、「新上架」、「高潛力」等多分頁）
          const byShopeeId = {};
          let totalRows = 0;
          wb.SheetNames.forEach(sn => {
            const ws = wb.Sheets[sn];
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (rows.length < 2) return;
            const headers = rows[0].map(h => String(h || '').trim());
            const cId = headers.findIndex(h => h === '商品ID' || h.indexOf('商品ID') === 0);
            const cName = headers.findIndex(h => h.indexOf('商品名稱') >= 0);
            const cImp = headers.findIndex(h => h.indexOf('曝光') >= 0);
            const cClk = headers.findIndex(h => h.indexOf('商品點擊數') >= 0 || (h.indexOf('點擊') >= 0 && h.indexOf('率') < 0));
            const cCtr = headers.findIndex(h => h.indexOf('點擊率') >= 0);
            const cConv = headers.findIndex(h => h === '轉換率 (可出貨訂單)' || (h.indexOf('轉換率') >= 0 && h.indexOf('可出貨') >= 0));
            if (cId < 0) return;
            const parseNum = (v) => {
              if (v === '' || v == null || v === '-') return 0;
              const s = String(v).replace(/,/g, '').replace('%', '').trim();
              const n = +s;
              if (!isFinite(n)) return 0;
              // 點擊率/轉換率 在 Excel 是 "4.18%" 字串 → 0.0418
              return s.indexOf('.') >= 0 || String(v).indexOf('%') >= 0
                ? (String(v).indexOf('%') >= 0 ? n / 100 : n)
                : n;
            };
            for (let r = 1; r < rows.length; r++) {
              const row = rows[r];
              const id = String(row[cId] || '').trim();
              if (!id || id === '-') continue;
              // 篩選：必須要有實際數值（曝光 > 0 或 點擊 > 0）
              const imp = cImp >= 0 ? parseNum(row[cImp]) : 0;
              const clk = cClk >= 0 ? parseNum(row[cClk]) : 0;
              if (imp === 0 && clk === 0) continue;
              // 同一 ID 可能在多分頁重複出現，取最大值
              const prev = byShopeeId[id] || { impressions: 0, clicks: 0, ctr: 0, convRate: 0 };
              byShopeeId[id] = {
                impressions: Math.max(prev.impressions, imp),
                clicks: Math.max(prev.clicks, clk),
                ctr: cCtr >= 0 ? Math.max(prev.ctr, parseNum(row[cCtr])) : prev.ctr,
                convRate: cConv >= 0 ? Math.max(prev.convRate, parseNum(row[cConv])) : prev.convRate,
                name: cName >= 0 ? String(row[cName] || '').trim() : (prev.name || ''),
              };
              totalRows++;
            }
          });
          resolve({ byShopeeId, rawRows: totalRows });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(reader.error || new Error('讀取失敗'));
      reader.readAsArrayBuffer(file);
    });
  },
  migrateInsightDataIfNeeded() {
    if (Store.get('ec.insightMigrated', false)) return;
    const oldWeekly = Store.get('ec.insightWeekly', null);
    const oldPrev   = Store.get('ec.insightWeeklyPrev', null);
    const oldMaster = Store.get('ec.insightMaster', null);
    const oldPerf   = Store.get('ec.insightPerf', null);
    const oldNotes  = Store.get('ec.insightNotes', null);

    const mkPeriodKey = (p) => (p || '').replace(/[^0-9]/g, '').slice(0, 16) || `legacy-${Date.now()}`;
    const weeks = [];
    if (oldWeekly && oldWeekly.products) {
      weeks.push({
        products: oldWeekly.products,
        period: oldWeekly.period || '',
        periodKey: mkPeriodKey(oldWeekly.period),
        rawRows: oldWeekly.rawRows || 0,
        uploadedAt: oldWeekly.uploadedAt || Date.now(),
        uploadedBy: oldWeekly.uploadedBy || '',
      });
    }
    if (oldPrev && oldPrev.products) {
      weeks.push({
        products: oldPrev.products,
        period: oldPrev.period || '',
        periodKey: mkPeriodKey(oldPrev.period) + '-prev',
        rawRows: 0,
        uploadedAt: oldPrev.archivedFrom || oldPrev.archivedAt || Date.now(),
        uploadedBy: '',
      });
    }
    if (weeks.length)  Store.set('ec.insight_玩樂_weeks', weeks);
    if (oldMaster)     Store.set('ec.insight_玩樂_master', oldMaster);
    if (oldPerf)       Store.set('ec.insight_玩樂_perf', oldPerf);
    if (oldNotes)      Store.set('ec.insight_玩樂_notes', oldNotes);
    Store.set('ec.insightMigrated', true);
  },
  bindInsightTab() {
    // 確定當前賣場
    const INSIGHT_SHOPS = ['玩樂', '好麻吉', '森之旅'];
    const currentShop = (this.filter.insightShop && INSIGHT_SHOPS.indexOf(this.filter.insightShop) >= 0)
      ? this.filter.insightShop : '玩樂';
    const sKey = (type) => `ec.insight_${currentShop}_${type}`;

    // 賣場切換 pills
    document.querySelectorAll('[data-insight-shop]').forEach(btn => {
      btn.addEventListener('click', () => {
        const shop = btn.dataset.insightShop;
        if (shop === currentShop) return;
        this.filter.insightShop = shop;
        this.filter.insightCompare = ''; // 切賣場時重置對照週
        // ⚠️ 不要呼叫 _persistInsightPrefs()：此刻 filter 還是「舊賣場」的設定，
        // 寫下去會把舊賣場偏好誤存到新賣場的 key。
        // 只記下「最後選的賣場」即可；render() 會自動載入新賣場的偏好。
        try { localStorage.setItem('ec.insightLastShop', shop); } catch {}
        this.render();
      });
    });

    // 對照週切換
    const cmpPick = document.getElementById('insight-compare-pick');
    if (cmpPick) {
      cmpPick.addEventListener('change', (e) => {
        this.filter.insightCompare = e.target.value;
        this.render();
      });
    }

    // 上傳中視覺反饋：選好檔案後立刻在卡片上覆蓋 spinner，讓使用者知道有反應
    // render() 重建卡片時遮罩會自然消失；只有 error 路徑需要手動移除
    const showUploadingOverlay = (inputId) => {
      const input = document.getElementById(inputId);
      if (!input) return;
      const label = input.closest('label');
      if (!label || label.querySelector('.__upload-overlay')) return;
      const overlay = document.createElement('div');
      overlay.className = '__upload-overlay';
      overlay.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,.94);border-radius:8px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:700;color:#5b5fcf;z-index:10;pointer-events:none';
      overlay.innerHTML = '<div class="spin"></div><span>上傳中…</span>';
      label.appendChild(overlay);
    };
    const hideUploadingOverlay = (inputId) => {
      const input = document.getElementById(inputId);
      if (!input) return;
      const label = input.closest('label');
      if (!label) return;
      const overlay = label.querySelector('.__upload-overlay');
      if (overlay) overlay.remove();
    };

    // 上傳前二次確認：顯示檔名 + 目標位置，使用者按「確認寫入」才會真的處理
    const confirmUpload = (cardLabel, file, input) => new Promise((resolve) => {
      const size = file && file.size ? `${(file.size / 1024).toFixed(0)} KB` : '';
      this.openModal({
        title: '📥 確認寫入',
        width: '420px',
        bodyHtml: `
          <div style="font-size:13px;line-height:1.6;color:var(--text)">
            即將寫入這份檔案：
            <div style="margin-top:8px;padding:10px 12px;background:var(--bg);border-radius:7px;border-left:3px solid var(--primary)">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;letter-spacing:.05em">${escapeHtml(cardLabel)}</div>
              <div style="font-size:13px;font-weight:700;color:var(--text);margin-top:2px;word-break:break-all">${escapeHtml(file?.name || '')}</div>
              ${size ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${size}</div>` : ''}
            </div>
            <div style="margin-top:10px;padding:8px 10px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:6px;font-size:11px;color:#92400e;line-height:1.5">
              ⚠️ 上週銷售排行會自動往後推位；其他類型直接覆蓋舊資料。
            </div>
          </div>
        `,
        saveLabel: '確認寫入',
        cancelLabel: '取消',
        onSave: () => { resolve(true); return true; },
        onCancel: () => {
          // 取消時清空 input.value，使用者可以重新挑同一份檔案
          if (input) input.value = '';
          resolve(false);
        },
      });
    });

    // 商品母表上傳：一次解析 3 個分頁，自動分配到各賣場
    const masterInput = document.getElementById('insight-master-upload');
    if (masterInput) {
      masterInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ok = await confirmUpload('商品清單（母表）— 三個賣場共用', file, masterInput);
        if (!ok) return;
        showUploadingOverlay('insight-master-upload');
        try {
          const { shops, matched } = await this.parseInsightMasterExcel(file);
          const now = Date.now();
          const uploadedBy = this.currentUser?.username || '';
          let totalProducts = 0;
          let totalNew = 0;
          let totalUpdated = 0;
          Object.keys(shops).forEach(shopName => {
            const data = shops[shopName];
            // 合併式更新：保留舊母表的所有商品，新檔案的同編號會覆蓋（更新最新資料），新編號則加入
            const prevMaster = Store.get(`ec.insight_${shopName}_master`, null);
            const prevByCode = (prevMaster && prevMaster.byCode) ? prevMaster.byCode : {};
            const mergedByCode = { ...prevByCode };
            const incomingByCode = data.byCode || {};
            let newCount = 0, updatedCount = 0;
            Object.keys(incomingByCode).forEach(code => {
              if (prevByCode[code]) updatedCount++;
              else newCount++;
              mergedByCode[code] = incomingByCode[code];
            });
            const mergedData = {
              ...data,
              byCode: mergedByCode,
              uploadedAt: now,
              uploadedBy,
            };
            Store.set(`ec.insight_${shopName}_master`, mergedData);
            totalProducts += Object.keys(mergedByCode).length;
            totalNew += newCount;
            totalUpdated += updatedCount;
          });
          const diffMsg = (totalNew > 0 || totalUpdated > 0)
            ? `（新增 ${totalNew}、更新 ${totalUpdated}）`
            : '';
          showToast(`商品清單已合併到 ${matched.length} 個賣場：${matched.join('、')} · 共 ${totalProducts} 個商品${diffMsg}`, 'success');
          this.render();
        } catch (err) {
          console.error(err);
          hideUploadingOverlay('insight-master-upload');
          showToast(`解析失敗：${err.message}`, 'error');
        } finally {
          masterInput.value = '';
        }
      });
    }

    // 銷售排行 — 固定 slot：本週寫到 weeks[0]，上週寫到 weeks[1]，不排序、不會跑掉
    const wireSalesUpload = (inputId, slotIdx, slotLabel) => {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const cardLabel = `${currentShop} · ${slotLabel}`;
        const ok = await confirmUpload(cardLabel, file, input);
        if (!ok) return;
        showUploadingOverlay(inputId);
        try {
          const result = await this.parseInsightExcel(file);
          const periodKey = (result.period || '').replace(/[^0-9]/g, '').slice(0, 16) || `wk-${Date.now()}`;
          const newEntry = {
            products: result.products,
            period: result.period,
            periodKey,
            rawRows: result.rawRows,
            uploadedAt: Date.now(),
            uploadedBy: this.currentUser?.username || '',
          };
          const weeks = (Store.get(sKey('weeks'), []) || []).slice();
          let shifted = false;
          // 上傳「上週」時自動往後推：weeks[0] → weeks[1] → weeks[2] → weeks[3]，最多保留 4 週
          // weeks[3] 是隱藏的第四週（不開上傳卡片），用來算「上上上週」的分類
          // 條件：上傳的是 slot 0 且 period 跟現有 weeks[0] 不同
          if (slotIdx === 0 && weeks[0] && weeks[0].periodKey !== periodKey) {
            weeks[3] = weeks[2] || null;
            weeks[2] = weeks[1] || null;
            weeks[1] = weeks[0];
            shifted = true;
          }
          while (weeks.length <= slotIdx) weeks.push(null);
          weeks[slotIdx] = newEntry;
          // 截斷只保留前 4 週
          if (weeks.length > 4) weeks.length = 4;
          Store.set(sKey('weeks'), weeks);
          const shiftMsg = shifted ? '（上上週/上上上週已自動往後推）' : '';
          showToast(`${currentShop} · ${slotLabel}已上傳（${result.products.length} 個商品 · ${result.period}）${shiftMsg}`, 'success');
          this.render();
        } catch (err) {
          console.error(err);
          hideUploadingOverlay(inputId);
          showToast(`解析失敗：${err.message}`, 'error');
        } finally {
          input.value = '';
        }
      });
    };
    wireSalesUpload('insight-sales-upload', 0, '上週銷售排行');
    wireSalesUpload('insight-salesprev-upload', 1, '上上週銷售排行');
    wireSalesUpload('insight-salesprevprev-upload', 2, '上上上週銷售排行');

    // 商品表現
    const perfInput = document.getElementById('insight-perf-upload');
    if (perfInput) {
      perfInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ok = await confirmUpload(`${currentShop} · 商品表現（蝦皮）`, file, perfInput);
        if (!ok) return;
        showUploadingOverlay('insight-perf-upload');
        try {
          const result = await this.parseInsightPerfExcel(file);
          Store.set(sKey('perf'), {
            ...result,
            uploadedAt: Date.now(),
            uploadedBy: this.currentUser?.username || '',
          });
          showToast(`「${currentShop} · 商品表現」已上傳`, 'success');
          this.render();
        } catch (err) {
          console.error(err);
          hideUploadingOverlay('insight-perf-upload');
          showToast(`解析失敗：${err.message}`, 'error');
        } finally {
          perfInput.value = '';
        }
      });
    }

    const clearAllBtn = document.getElementById('insight-clear-all');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        // 一按即清，無確認彈窗。
        // 1) 重設下拉狀態
        this.filter.insightCompare = '';

        const prefix = `ec.insight_${currentShop}_`;
        const keysToClear = [
          prefix + 'master',
          prefix + 'weeks',
          prefix + 'perf',
          prefix + 'notes',
        ];

        // 2) 先掃 Store._mem，把所有此賣場相關的 key（包括上面 4 個 + 任何遺漏的）一次刪掉
        const allShopKeys = new Set(keysToClear);
        try {
          if (Store._mem && typeof Store._mem === 'object') {
            Object.keys(Store._mem).forEach(k => {
              if (k.startsWith(prefix)) {
                allShopKeys.add(k);
                delete Store._mem[k];
              }
            });
          }
        } catch {}

        // 3) 掃 localStorage 同樣處理
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) allShopKeys.add(k);
          }
          allShopKeys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
        } catch {}

        // 4) ✨ 關鍵：一次 atomic 刪掉雲端所有相關欄位（不要逐一刪、避免訂閱 race 把舊資料回填）
        if (window.__cloudStore && typeof window.__cloudStore.removeFields === 'function') {
          window.__cloudStore.removeFields(Array.from(allShopKeys))
            .catch(err => console.warn('cloud batch clear failed', err));
        } else if (window.__cloudStore) {
          // fallback：舊版 cloudStore 沒 removeFields，逐個 remove
          allShopKeys.forEach(k => {
            try { window.__cloudStore.removeField(k); } catch (e) { console.warn(e); }
          });
        }

        showToast(`已清除 ${currentShop} 全部資料`, 'success');
        this.render();
      });
    }

    // 個別清除按鈕（每張上傳卡的小 ✕）— 使用 document 級事件代理，避免重繪後綁定失效
    if (!this._clearPieceBound) {
      this._clearPieceBound = true;
      document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-clear-piece]');
        if (!btn) return;
        // 只在洞察表頁時處理
        if (this.route !== 'office-d1-insight') return;
        // 卡片是 <label>，點 ✕ 會冒泡觸發 file input 開啟，要擋掉
        e.preventDefault();
        e.stopPropagation();

        // 重新讀當前賣場（this.filter.insightShop 即時的值）
        const INSIGHT_SHOPS = ['玩樂', '好麻吉', '森之旅'];
        const curShop = (this.filter.insightShop && INSIGHT_SHOPS.indexOf(this.filter.insightShop) >= 0)
          ? this.filter.insightShop : '玩樂';
        const k2 = (type) => `ec.insight_${curShop}_${type}`;

        const piece = btn.dataset.clearPiece; // 'master' | 'sales' | 'salesPrev' | 'salesPrevPrev' | 'perf'
        const labels = { master: '商品母表', sales: '上週銷售', salesPrev: '上上週銷售', salesPrevPrev: '上上上週銷售', perf: '商品表現' };
        const label = labels[piece] || piece;

        // 二次確認：避免誤觸 ✕ 弄掉重要資料
        const confirmed = await new Promise((resolve) => {
          this.openModal({
            title: '⚠️ 確認清除',
            width: '420px',
            bodyHtml: `
              <div style="font-size:13px;line-height:1.6;color:var(--text)">
                即將清除 <strong style="color:#dc2626">${escapeHtml(curShop)} · ${escapeHtml(label)}</strong> 的檔案。
                <div style="margin-top:10px;padding:10px 12px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:6px;font-size:12px;color:#92400e">
                  ⚠️ 此動作<strong>無法復原</strong>。清除後若要使用，需要重新上傳檔案。
                </div>
              </div>
            `,
            saveLabel: '確認清除',
            cancelLabel: '取消',
            onSave: () => { resolve(true); return true; },
            onCancel: () => { resolve(false); },
          });
        });
        if (!confirmed) return;

        if (piece === 'sales' || piece === 'salesPrev' || piece === 'salesPrevPrev') {
          const ws = (Store.get(k2('weeks'), []) || []).slice();
          if (piece === 'sales') ws[0] = null;
          else if (piece === 'salesPrev' && ws.length > 1) ws[1] = null;
          else if (piece === 'salesPrevPrev' && ws.length > 2) ws[2] = null;
          if (ws.every(w => !w)) {
            try { delete Store._mem[k2('weeks')]; } catch {}
            try { localStorage.removeItem(k2('weeks')); } catch {}
            if (window.__markRecentlyDeleted) window.__markRecentlyDeleted(k2('weeks'));
          } else {
            try { Store._mem[k2('weeks')] = ws; } catch {}
            try { localStorage.setItem(k2('weeks'), JSON.stringify(ws)); } catch {}
          }
          if (window.__cloudStore) {
            try {
              if (ws.every(w => !w)) {
                await window.__cloudStore.removeFields([k2('weeks')]);
              } else {
                await window.__cloudStore.setField(k2('weeks'), ws);
              }
            } catch (err) { console.warn('cloud clear failed', err); }
          }
        } else {
          const k = k2(piece);
          try { delete Store._mem[k]; } catch {}
          try { localStorage.removeItem(k); } catch {}
          if (window.__markRecentlyDeleted) window.__markRecentlyDeleted(k);
          if (window.__cloudStore && typeof window.__cloudStore.removeFields === 'function') {
            try { await window.__cloudStore.removeFields([k]); }
            catch (err) { console.warn('cloud clear failed', err); }
          } else if (window.__cloudStore) {
            try { window.__cloudStore.removeField(k); } catch {}
          }
        }
        showToast(`已清除 ${curShop} · ${label}`, 'success');
        this.render();
      }, true); // capture phase 確保比 label 的預設 click 行為更早處理
    }

    // 分類門檻設定（共用）
    const settingsBtn = document.getElementById('insight-settings');
    if (settingsBtn) settingsBtn.addEventListener('click', () => this.openInsightSettingsModal());

    // ☁ 同步雲端：把本機累積的洞察表調整紀錄一次推上雲
    const syncBtn = document.getElementById('insight-sync-cloud');
    const syncBadge = document.getElementById('insight-sync-badge');
    // pending set 從 localStorage 還原（避免重整後遺失，導致雲端 snapshot 蓋掉未同步的本機刪除）
    if (!window.__insightPendingNotes) {
      window.__insightPendingNotes = new Set(
        (() => { try { return JSON.parse(localStorage.getItem('ec.insightPendingNotes') || '[]'); } catch { return []; } })()
      );
    }
    // 讓 add/delete 都同步寫回 localStorage
    if (!window.__insightPendingNotes.__persistWrapped) {
      const origAdd = window.__insightPendingNotes.add.bind(window.__insightPendingNotes);
      const origDel = window.__insightPendingNotes.delete.bind(window.__insightPendingNotes);
      const persist = () => { try { localStorage.setItem('ec.insightPendingNotes', JSON.stringify(Array.from(window.__insightPendingNotes))); } catch {} };
      window.__insightPendingNotes.add = (k) => { const r = origAdd(k); persist(); return r; };
      window.__insightPendingNotes.delete = (k) => { const r = origDel(k); persist(); return r; };
      window.__insightPendingNotes.__persistWrapped = true;
    }
    window.__updateInsightSyncBadge = () => {
      const btn = document.getElementById('insight-sync-cloud');
      const badge = document.getElementById('insight-sync-badge');
      if (!btn || !badge) return;
      const n = window.__insightPendingNotes ? window.__insightPendingNotes.size : 0;
      if (n > 0) {
        badge.textContent = n;
        badge.style.display = 'inline-flex';
        btn.style.background = '#fef3c7';
        btn.style.borderColor = '#f59e0b';
        btn.style.color = '#92400e';
      } else {
        badge.style.display = 'none';
        btn.style.background = '#fff';
        btn.style.borderColor = '#cbd5e1';
        btn.style.color = '#475569';
      }
    };
    window.__updateInsightSyncBadge();
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        const pending = window.__insightPendingNotes;
        if (!pending || pending.size === 0) {
          showToast('沒有待同步的調整', 'info');
          return;
        }
        if (typeof Store.pushKeyToCloud !== 'function') {
          this.showAlertModal({ title: '雲端尚未就緒', message: '請重新整理後再試。', kind: 'warn' });
          return;
        }
        syncBtn.disabled = true;
        const originalHtml = syncBtn.innerHTML;
        syncBtn.innerHTML = '<span>☁ 同步中…</span>';
        const failed = [];
        for (const key of Array.from(pending)) {
          try {
            await Store.pushKeyToCloud(key);
            pending.delete(key);
          } catch (e) {
            failed.push(key + ': ' + (e && e.message || e));
          }
        }
        syncBtn.disabled = false;
        syncBtn.innerHTML = originalHtml;
        window.__updateInsightSyncBadge();
        if (failed.length === 0) {
          showToast('已同步到雲端 ✓', 'success');
          // 同步成功後，把今天的調整摘要自動寫入該同事的工作日誌（含洞察表與淨利表）
          // pushToCloud:true → 連同工作日誌也一起推給老闆，避免切頁時還跳「未同步」提醒
          try { this._updateDailyProgressFromAdjustments({ pushToCloud: true }); } catch (e) { console.warn('[autoSummary]', e); }
        } else {
          this.showAlertModal({
            title: '部分同步失敗',
            message: failed.length + ' 個 key 沒推上雲端。請看下方詳情，必要時重試一次。',
            detail: failed.join('\n'),
            kind: 'error',
          });
        }
      });
    }

    // 離開頁面前若有未同步，提醒（瀏覽器原生確認框）
    if (!window.__insightUnloadGuardInstalled) {
      window.__insightUnloadGuardInstalled = true;
      window.addEventListener('beforeunload', (e) => {
        const n = window.__insightPendingNotes ? window.__insightPendingNotes.size : 0;
        if (n > 0) {
          e.preventDefault();
          e.returnValue = '';
          return '';
        }
      });
    }

    // 📤 上傳檔案：開啟浮窗
    const uploadOpenBtn = document.getElementById('insight-upload-open');
    const uploadOverlay = document.getElementById('insight-upload-overlay');
    const uploadCloseBtn = document.getElementById('insight-upload-close');
    if (uploadOpenBtn && uploadOverlay) {
      uploadOpenBtn.addEventListener('click', () => { uploadOverlay.style.display = 'flex'; });
    }
    if (uploadCloseBtn && uploadOverlay) {
      uploadCloseBtn.addEventListener('click', () => { uploadOverlay.style.display = 'none'; });
    }
    if (uploadOverlay) {
      uploadOverlay.addEventListener('click', (e) => {
        // 點背景關閉，點內部不關
        if (e.target === uploadOverlay) uploadOverlay.style.display = 'none';
      });
    }

    // ── 拖放上傳：拖檔案到 label 卡片 → 自動指派給對應的 file input → 觸發 change → 跑原本確認流程 ──
    document.querySelectorAll('[data-drop-input]').forEach(label => {
      const inputId = label.dataset.dropInput;
      label.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        label.style.borderColor = '#5b5fcf';
        label.style.background = '#eef2ff';
      });
      label.addEventListener('dragleave', (e) => {
        // 離開 label（不是內部子元素）才還原
        if (e.target === label) {
          label.style.borderColor = '';
          label.style.background = '';
        }
      });
      label.addEventListener('drop', (e) => {
        e.preventDefault();
        label.style.borderColor = '';
        label.style.background = '';
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const input = document.getElementById(inputId);
        if (!input) return;
        // 把拖進來的檔案塞進對應 input + 派發 change 事件，讓原本 handler 跑 confirmUpload + 解析
        try {
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (err) {
          console.warn('drag-drop failed', err);
          showToast('拖放失敗，請改用點擊上傳', 'error');
        }
      });
    });
    // 全頁面阻擋拖檔到非卡片區域時瀏覽器自動打開檔案
    if (uploadOverlay && !this._uploadDropGuardBound) {
      this._uploadDropGuardBound = true;
      ['dragover', 'drop'].forEach(evt => {
        window.addEventListener(evt, (e) => {
          if (uploadOverlay.style.display !== 'flex') return;
          if (e.target.closest('[data-drop-input]')) return;
          e.preventDefault();
        });
      });
    }

    // 表頭排序：點欄位漏斗 → 浮出小選單（由大到小 / 由小到大 / 取消排序）
    const closeSortMenu = () => {
      const m = document.getElementById('sort-menu-popup');
      if (m) m.remove();
    };
    const openSortMenu = (anchor, key) => {
      closeSortMenu();
      const rect = anchor.getBoundingClientRect();
      const menu = document.createElement('div');
      menu.id = 'sort-menu-popup';
      menu.style.cssText = `
        position:fixed;top:${rect.bottom + 4}px;left:${Math.min(rect.left, window.innerWidth - 170)}px;
        z-index:99998;background:white;border:1px solid var(--border);border-radius:8px;
        box-shadow:0 8px 24px rgba(0,0,0,.12);padding:4px;min-width:150px;
        display:flex;flex-direction:column;gap:2px;font-family:inherit
      `;
      const curKey = this.filter.insightSortKey;
      const curDir = this.filter.insightSortDir;
      const mkBtn = (icon, label, dir, active) => `
        <button data-sort-action="${dir}" style="display:flex;align-items:center;gap:8px;padding:7px 12px;border:0;
          background:${active ? '#eef2ff' : 'transparent'};color:${active ? 'var(--primary)' : 'var(--text)'};
          font-size:13px;font-weight:${active ? '700' : '500'};cursor:pointer;text-align:left;border-radius:5px;
          font-family:inherit;white-space:nowrap">
          <span style="width:14px;display:inline-block;text-align:center">${icon}</span><span>${label}</span>
        </button>`;
      menu.innerHTML =
        mkBtn('↓', '由大到小', 'desc', curKey === key && curDir === 'desc') +
        mkBtn('↑', '由小到大', 'asc',  curKey === key && curDir === 'asc') +
        `<div style="height:1px;background:var(--border);margin:2px 4px"></div>` +
        mkBtn('✕', '取消排序', 'clear', !curKey);
      document.body.appendChild(menu);
      menu.querySelectorAll('[data-sort-action]').forEach(btn => {
        btn.addEventListener('mouseover', () => {
          if (btn.style.background === 'transparent' || !btn.style.background) btn.style.background = '#f9fafb';
        });
        btn.addEventListener('mouseout', () => {
          // 維持 active 高亮，其餘恢復
          const action = btn.dataset.sortAction;
          const isActive = (action === 'clear' && !curKey) || (curKey === key && curDir === action);
          btn.style.background = isActive ? '#eef2ff' : 'transparent';
        });
        btn.addEventListener('click', () => {
          const action = btn.dataset.sortAction;
          if (action === 'clear') {
            this.filter.insightSortKey = '';
            this.filter.insightSortDir = '';
          } else {
            this.filter.insightSortKey = key;
            this.filter.insightSortDir = action;
          }
          if (this._persistInsightPrefs) this._persistInsightPrefs();
          closeSortMenu();
          this.render();
        });
      });
      // 點外面關閉
      setTimeout(() => {
        document.addEventListener('click', function offClose(e) {
          if (!menu.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) {
            closeSortMenu();
            document.removeEventListener('click', offClose);
          }
        });
        document.addEventListener('keydown', function escClose(e) {
          if (e.key === 'Escape') {
            closeSortMenu();
            document.removeEventListener('keydown', escClose);
          }
        });
      }, 0);
    };
    document.querySelectorAll('[data-sort-key]').forEach(th => {
      th.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = th.dataset.sortKey;
        openSortMenu(th, key);
      });
    });

    // 共用：把當前賣場的洞察表偏好打包寫入 localStorage（每家賣場各自獨立、每台電腦記憶）
    const persistInsightPrefs = () => {
      try {
        const shop = this.filter.insightShop || '玩樂';
        localStorage.setItem(`ec.insightPrefs__${shop}`, JSON.stringify({
          hiddenCols: this.filter.insightHiddenCols || [],
          cls: Array.isArray(this.filter.insightClass) ? this.filter.insightClass : [],
          ctrLow: !!this.filter.insightCtrLow,
          sortKey: this.filter.insightSortKey || '',
          sortDir: this.filter.insightSortDir || '',
        }));
        localStorage.setItem('ec.insightLastShop', shop);
      } catch {}
    };
    // 欄位顯示切換
    document.querySelectorAll('[data-col-toggle]').forEach(cb => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.colToggle;
        let cur = Array.isArray(this.filter.insightHiddenCols) ? this.filter.insightHiddenCols.slice() : [];
        if (cb.checked) cur = cur.filter(k => k !== key);
        else if (!cur.includes(key)) cur.push(key);
        this.filter.insightHiddenCols = cur;
        persistInsightPrefs();
        this._insightColMenuOpen = true; // re-render 時保持下拉開啟
        this.render();
      });
    });
    // 顯示全部
    const showAllBtn = document.getElementById('insight-col-show-all');
    if (showAllBtn) showAllBtn.addEventListener('click', () => {
      this.filter.insightHiddenCols = [];
      persistInsightPrefs();
      this._insightColMenuOpen = true;
      this.render();
    });
    // 暴露給其他地方（賣場切換、排序、大類篩選、CTR 開關、清除）使用
    this._persistInsightPrefs = persistInsightPrefs;
    // 點下拉以外的地方關閉
    const colMenu = document.getElementById('insight-col-menu');
    if (colMenu) {
      colMenu.addEventListener('toggle', () => { this._insightColMenuOpen = colMenu.open; });
      const closeOnOutside = (e) => {
        if (colMenu.open && !colMenu.contains(e.target)) {
          colMenu.open = false;
          this._insightColMenuOpen = false;
        }
      };
      document.addEventListener('click', closeOnOutside, { capture: true });
    }

    // 點警示裡的編號 → 找到該商品的列、捲動定位、黃色閃光
    document.querySelectorAll('[data-jump-code]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.jumpCode;
        // 若有篩選正在套用，先清掉避免那筆被過濾掉看不到
        const selectedCnt = Array.isArray(this.filter.insightClass) ? this.filter.insightClass.length : 0;
        if (selectedCnt > 0 || this.filter.insightCtrLow) {
          this.filter.insightClass = [];
          this.filter.insightCtrLow = false;
          if (this._persistInsightPrefs) this._persistInsightPrefs();
          this.render();
          // render 後 DOM 重建，下一帧再 scroll
          requestAnimationFrame(() => scrollToCode(code));
        } else {
          scrollToCode(code);
        }
        // 關掉警示下拉，免得擋到畫面
        const det = btn.closest('details'); if (det) det.open = false;
      });
    });
    const scrollToCode = (code) => {
      const tr = document.querySelector(`tr[data-product-code="${code}"]`);
      if (!tr) { showToast(`找不到 ${code}（可能在其他分頁或被篩掉了）`, 'error'); return; }
      tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 黃色閃光 3 次
      const orig = tr.style.background;
      let n = 0;
      const flash = () => {
        tr.style.background = '#fef3c7';
        setTimeout(() => { tr.style.background = orig; if (++n < 3) setTimeout(flash, 240); }, 240);
      };
      flash();
    };

    // 細分類篩選 pills（複選：點同一個再次取消，點「全部」清空）
    document.querySelectorAll('[data-insight-class]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.insightClass;
        let cur = this.filter.insightClass;
        if (typeof cur === 'string') cur = cur === 'all' || !cur ? [] : [cur];
        if (!Array.isArray(cur)) cur = [];
        if (key === 'all') {
          cur = [];
        } else {
          const idx = cur.indexOf(key);
          if (idx >= 0) cur.splice(idx, 1);
          else cur.push(key);
        }
        this.filter.insightClass = cur;
        if (this._persistInsightPrefs) this._persistInsightPrefs();
        this.render();
      });
    });
    // 點擊率 < 3% 篩選 pill
    document.querySelectorAll('[data-insight-ctr-low]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter.insightCtrLow = btn.dataset.insightCtrLow === '1';
        if (this._persistInsightPrefs) this._persistInsightPrefs();
        this.render();
      });
    });

    // 匯出 Excel（當前賣場）
    const exportBtn = document.getElementById('insight-export');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportInsightExcel());

    // 商品備註 modal
    document.querySelectorAll('[data-insight-note]').forEach(btn => {
      btn.addEventListener('click', () => this.openInsightNoteModal(btn.dataset.insightNote));
    });
  },
  openInsightSettingsModal() {
    const T = Object.assign({}, window.INSIGHT_DEFAULT_THRESHOLDS, Store.get('ec.insightThresholds', {}) || {});
    const inp = (id, val, step) => `<input id="${id}" type="number" value="${val}" step="${step}" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;text-align:right;font-variant-numeric:tabular-nums;width:70px">`;
    const rangeInp = (idLo, valLo, idHi, valHi) => `
      <div style="display:flex;align-items:center;gap:6px">
        ${inp(idLo, valLo, 0.5)}
        <span style="color:var(--text-muted)">~</span>
        ${inp(idHi, valHi, 0.5)}
        <span style="font-size:12px;color:var(--text-muted)">%</span>
      </div>`;
    this.openModal({
      title: '⚙ 分類門檻設定',
      width: '520px',
      bodyHtml: `
        <p style="margin:0 0 12px;font-size:12px;color:var(--text-muted)">
          系統會依下面門檻自動把商品分類。修改後新門檻立刻生效。
        </p>
        <div style="font-size:13px">
          <div style="background:#fee2e2;border-left:3px solid #b91c1c;padding:6px 10px;font-weight:700;color:#b91c1c;border-radius:4px;margin-bottom:6px">下滑類</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:0 6px 8px">
            <label>🔴 重跌品：成長比 &lt;</label>
            <div style="display:flex;align-items:center;gap:6px">${inp('ths-heavyDrop', T.heavyDrop, 5)}<span style="font-size:12px;color:var(--text-muted)">%</span></div>
            <label>🟥 衰退品：成長比 範圍</label>
            ${rangeInp('ths-heavyDrop2', T.heavyDrop, 'ths-drop', T.drop)}
          </div>

          <div style="background:#dcfce7;border-left:3px solid #15803d;padding:6px 10px;font-weight:700;color:#15803d;border-radius:4px;margin-bottom:6px">成長類</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:0 6px 8px">
            <label>🟡 爆發品：成長比 &gt;</label>
            <div style="display:flex;align-items:center;gap:6px">${inp('ths-explosion', T.explosion, 5)}<span style="font-size:12px;color:var(--text-muted)">%</span></div>
            <label>🟨 成長品：成長比 範圍</label>
            ${rangeInp('ths-growth', T.growth, 'ths-explosion2', T.explosion)}
          </div>

          <div style="background:#dbeafe;border-left:3px solid #1d4ed8;padding:6px 10px;font-weight:700;color:#1d4ed8;border-radius:4px;margin-bottom:6px">轉換類（皆需 點擊率 &gt; <input id="ths-ctrMin" type="number" value="${T.ctrMin}" step="0.5" style="width:55px;padding:3px 6px;border:1px solid var(--border);border-radius:5px;text-align:right;font-variant-numeric:tabular-nums">%）</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:0 6px 4px">
            <label>🟢 弱轉換：轉換率 範圍</label>
            ${rangeInp('ths-weakConvMin', T.weakConvMin, 'ths-weakConvMax', T.weakConvMax)}
            <label>🟩 轉換偏低：轉換率 範圍</label>
            ${rangeInp('ths-lowConvMin', T.lowConvMin, 'ths-lowConvMax', T.lowConvMax)}
            <label>❎ 零轉換</label>
            <span style="color:var(--text-muted);font-size:12px">轉換率 = 0% 且 點擊率 &gt; 3%</span>
          </div>
        </div>
        <div style="margin-top:14px;padding:10px;background:var(--bg);border-radius:6px;font-size:11px;color:var(--text-muted);line-height:1.6">
          📌 成長比 / 轉換率 / 點擊率 都以百分比輸入（不含 % 符號）
        </div>
      `,
      saveLabel: '儲存',
      cancelLabel: '取消',
      onSave: () => {
        const get = (id) => {
          const el = document.getElementById(id);
          if (!el) return 0;
          const v = +el.value;
          return isFinite(v) ? v : 0;
        };
        Store.set('ec.insightThresholds', {
          explosion: get('ths-explosion'),
          growth: get('ths-growth'),
          drop: get('ths-drop'),
          heavyDrop: get('ths-heavyDrop'),
          ctrMin: get('ths-ctrMin'),
          weakConvMin: get('ths-weakConvMin'),
          weakConvMax: get('ths-weakConvMax'),
          lowConvMin: get('ths-lowConvMin'),
          lowConvMax: get('ths-lowConvMax'),
        });
        showToast('門檻已更新', 'success');
        this.render();
        return true;
      },
    });
  },
  _updateDailyProgressFromAdjustments(opts) {
    const ALLOWED_NAMES = ['陳君葳', '洪嘉蓮', '郭雅琪'];
    const userName = this.currentUser && this.currentUser.name;
    const usernameId = this.currentUser && this.currentUser.username;
    if (!userName || !ALLOWED_NAMES.includes(userName)) return; // 只處理 3 位員工，admin/Kelly 不寫

    const now = new Date();
    const todayDash  = toDateStr(now);              // 2026-06-18
    const todaySlash = todayDash.replace(/-/g, '/'); // 2026/06/18

    // 共用門檻
    const T = Object.assign({}, window.INSIGHT_DEFAULT_THRESHOLDS || {
      explosion: 50, growth: 10, drop: -10, heavyDrop: -50,
      ctrMin: 3, weakConvMin: 1, weakConvMax: 3, lowConvMin: 3, lowConvMax: 6,
    }, Store.get('ec.insightThresholds', {}) || {});

    // 對某商品判定分類
    const classify = (shop, code) => {
      const weeks = Store.get(`ec.insight_${shop}_weeks`, []) || [];
      const sales = (weeks[0] && weeks[0].products) || [];
      const salesPrev = (weeks[1] && weeks[1].products) || [];
      const master = Store.get(`ec.insight_${shop}_master`, null);
      const perf = Store.get(`ec.insight_${shop}_perf`, null);
      const p = sales.find(x => x.code === code);
      if (!p) return null;
      const prev = salesPrev.find(x => x.code === code);
      const growthRate = (prev && prev.revenue > 0)
        ? (p.revenue - prev.revenue) / prev.revenue
        : null;
      const m = master && master.byCode && master.byCode[code];
      const shopeeId = (m && m.id) || '';
      const perfEntry = (shopeeId && perf && perf.byShopeeId) ? perf.byShopeeId[shopeeId] : null;
      const convRate = (perfEntry && perfEntry.convRate) || 0;
      const ctr = (perfEntry && perfEntry.ctr) || 0;
      if (growthRate !== null && growthRate !== undefined) {
        const g = growthRate * 100;
        if (g > T.explosion) return '爆發品';
        if (g >= T.growth)   return '成長品';
        if (g < T.heavyDrop) return '重跌品';
        if (g <= T.drop)     return '衰退品';
      }
      const ctrPct = ctr * 100;
      const convPct = convRate * 100;
      if (ctrPct > T.ctrMin) {
        if (convRate === 0) return '零轉換';
        if (convPct >= T.weakConvMin && convPct < T.weakConvMax) return '弱轉換';
        if (convPct >= T.lowConvMin && convPct <= T.lowConvMax)  return '轉換偏低';
      }
      return null;
    };

    // ======== 1. 洞察表：跨 3 個賣場統計今天的調整，依分類 tally ========
    const INSIGHT_SHOPS = ['玩樂', '好麻吉', '森之旅'];
    const insightCounts = {};
    INSIGHT_SHOPS.forEach(shop => {
      const notes = Store.get(`ec.insight_${shop}_notes`, {}) || {};
      Object.keys(notes).forEach(code => {
        const adjustments = (notes[code] && notes[code].adjustments) || [];
        const hit = adjustments.some(a => {
          const d = (a.date || '').slice(0, 10);
          const dateOk = d === todayDash || d === todaySlash;
          const byOk = !a.by || a.by === usernameId || a.by === userName;
          return dateOk && byOk;
        });
        if (hit) {
          const cls = classify(shop, code);
          if (cls) insightCounts[cls] = (insightCounts[cls] || 0) + 1;
        }
      });
    });

    // ======== 2. 淨利表：跨所有賣場統計，依 analysisLabel tally ========
    const profitCounts = {};
    try {
      if (typeof state === 'object' && state) {
        Object.keys(state).forEach(shopId => {
          const s = state[shopId];
          if (!s) return;
          // 商品碼 → 分析標籤
          const codeToLabel = {};
          if (Array.isArray(s._built)) {
            s._built.forEach(p => {
              codeToLabel[p.code] = p.analysisLabel || (p.analysis && p.analysis.label) || '';
            });
          }
          const k = 'ec_notes|' + shopId;
          const notes = (window.Store && Store._profitMem && Store._profitMem[k])
            || (typeof getNotes === 'function' ? getNotes(shopId) : {});
          Object.keys(notes || {}).forEach(code => {
            const adjustments = (notes[code] && notes[code].adjustments) || [];
            const hit = adjustments.some(a => {
              const d = (a.date || '').slice(0, 10);
              const dateOk = d === todayDash || d === todaySlash;
              const byOk = !a.by || a.by === usernameId || a.by === userName;
              return dateOk && byOk;
            });
            if (hit) {
              const lbl = codeToLabel[code] || '其他';
              profitCounts[lbl] = (profitCounts[lbl] || 0) + 1;
            }
          });
        });
      }
    } catch (e) { console.warn('[profit count]', e); }

    // ======== 3. 組合摘要文字 ========
    const ORDER = ['重跌品', '衰退品', '爆發品', '成長品', '零轉換', '弱轉換', '轉換偏低'];
    const EMOJI = { '重跌品':'🔴','衰退品':'🟥','爆發品':'🟡','成長品':'🟨','零轉換':'❎','弱轉換':'🟢','轉換偏低':'🟩' };
    const buildInsightBlock = () => {
      if (Object.keys(insightCounts).length === 0) return '';
      const lines = [];
      let idx = 1;
      ORDER.forEach(label => {
        if (insightCounts[label]) lines.push(`${idx++}. ${EMOJI[label]} ${label} ${insightCounts[label]} 個`);
      });
      return '【洞察表 · 今日調整】\n' + lines.join('\n');
    };
    const buildProfitBlock = () => {
      if (Object.keys(profitCounts).length === 0) return '';
      // 排序：高利潤商品 → 賠錢中 → 低淨利 → 危險商品 → 低效廣告 → 其他
      const PROFIT_ORDER = ['高利潤商品', '賠錢中', '低淨利', '危險商品', '低效廣告'];
      const keys = [...PROFIT_ORDER.filter(k => profitCounts[k]), ...Object.keys(profitCounts).filter(k => !PROFIT_ORDER.includes(k))];
      const lines = [];
      let idx = 1;
      keys.forEach(k => { lines.push(`${idx++}. ${k} ${profitCounts[k]} 個`); });
      return '【淨利表 · 今日調整】\n' + lines.join('\n');
    };
    const insightBlock = buildInsightBlock();
    const profitBlock = buildProfitBlock();

    // ======== 4. 更新工作日誌 ========
    const all = Store.get('ec.dailyProgress', {}) || {};
    const day = Object.assign({}, all[todayDash] || {});
    const existing = day[userName] || '';
    // 先把所有舊的自動摘要區塊清掉（不管是洞察表還是淨利表）
    let cleaned = existing
      .replace(/【洞察表 · 今日調整】[\s\S]*?(?=\n\n【|$)/g, '')
      .replace(/【淨利表 · 今日調整】[\s\S]*?(?=\n\n【|$)/g, '')
      .replace(/\s+$/, '');
    // 再 append 新版（如果有的話）
    const parts = [];
    if (cleaned) parts.push(cleaned);
    if (insightBlock) parts.push(insightBlock);
    if (profitBlock) parts.push(profitBlock);
    const newText = parts.join('\n\n');

    if (newText) day[userName] = newText;
    else delete day[userName]; // 全部都沒了 → 移除該人員那天的整筆紀錄
    const next = Object.assign({}, all);
    if (Object.keys(day).length === 0) delete next[todayDash];
    else next[todayDash] = day;

    if (typeof Store.setLocalOnly === 'function') {
      Store.setLocalOnly('ec.dailyProgress', next);
    } else {
      Store.set('ec.dailyProgress', next);
    }
    window.__dpPendingNames = window.__dpPendingNames || new Set();
    window.__dpPendingNames.add(userName);

    // 若工作日誌頁的 textarea 還在畫面上，同步 UI（但別蓋掉使用者正在打字的內容）
    const ta = document.querySelector(`.dp-textarea[data-dp-name="${userName}"]`);
    if (ta && document.activeElement !== ta) ta.value = newText;
    if (typeof window.__updateDpSyncBadge === 'function') window.__updateDpSyncBadge();

    const silent = opts && opts.silent;
    const pushToCloud = opts && opts.pushToCloud;
    const hasContent = insightBlock || profitBlock;

    // 若這次是由「☁ 同步雲端」按鈕觸發的，把工作日誌也一起推到雲端
    // 避免使用者按完 sync 後切頁還是被提醒「工作日誌未同步」
    if (pushToCloud && typeof Store.pushKeyToCloud === 'function') {
      Store.pushKeyToCloud('ec.dailyProgress').then(() => {
        window.__dpPendingNames.delete(userName);
        if (typeof window.__updateDpSyncBadge === 'function') window.__updateDpSyncBadge();
      }).catch(e => { console.warn('[autoSummary push]', e); });
    }

    if (hasContent && !silent) {
      const tail = pushToCloud ? '（已連同推給老闆）' : '（記得按「☁ 同步雲端」推給老闆）';
      showToast(`已自動更新 ${userName} 的工作日誌${tail}`, 'info');
    }
  },
  openInsightNoteModal(code) {
    const INSIGHT_SHOPS = ['玩樂', '好麻吉', '森之旅'];
    const currentShop = (this.filter.insightShop && INSIGHT_SHOPS.indexOf(this.filter.insightShop) >= 0)
      ? this.filter.insightShop : '玩樂';
    const notesKey = `ec.insight_${currentShop}_notes`;
    const all = Store.get(notesKey, {}) || {};
    const note = all[code] || { text: '', adjustments: [] };

    // 查商品名稱：先看母表（莫筆克名 > 商品名稱），再 fallback 到本週銷售
    const master = Store.get(`ec.insight_${currentShop}_master`, null);
    const masterEntry = master?.byCode?.[code];
    const weeks = Store.get(`ec.insight_${currentShop}_weeks`, []) || [];
    const salesEntry = (weeks[0]?.products || []).find(p => p.code === code);
    const productName = masterEntry?.mocbicName || masterEntry?.name || salesEntry?.name || '';

    // 紀錄樣式：淺紫色背景 + 紫色文字。同一天的多筆 → 同列顯示，用「、」串起；
    // ✕ 刪除整列（同一天的所有調整一次刪），data-del-date 帶日期。
    const renderAdjList = () => {
      const all = note.adjustments || [];
      if (all.length === 0) {
        return '<div style="padding:14px;text-align:center;color:var(--text-muted);font-size:12px">尚無調整紀錄</div>';
      }
      // 依日期分組，保留輸入順序
      const groups = new Map(); // date -> { date, texts: [] }
      all.forEach(a => {
        const d = a.date || '';
        if (!groups.has(d)) groups.set(d, { date: d, texts: [] });
        groups.get(d).texts.push(a.text || '');
      });
      // 最新日期排最上面
      const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
      return sortedKeys.map(k => {
        const g = groups.get(k);
        const joined = g.texts.join('、');
        return `
          <div style="padding:7px 11px;background:#eef2ff;border-left:3px solid #6366f1;border-radius:5px;margin-bottom:5px;font-size:12px;display:flex;gap:8px;align-items:flex-start">
            <span style="color:#6366f1;font-size:10px;font-weight:700;font-variant-numeric:tabular-nums;min-width:80px">${escapeHtml(g.date)}</span>
            <span data-edit-date="${escapeHtml(g.date)}" title="點兩下編輯" style="flex:1;line-height:1.4;color:#312e81;font-weight:500;cursor:pointer">${escapeHtml(joined)}</span>
            <button class="icon-btn" data-del-date="${escapeHtml(g.date)}" title="刪除這一天的所有紀錄" style="width:20px;height:20px;font-size:10px;color:#6366f1">✕</button>
          </div>`;
      }).join('');
    };

    // 多人協作策略：先 local-only 儲存，不直接推雲端
    // 使用者按 header 的「☁ 同步雲端」鈕才一次推上去，避免多人同時編輯互蓋
    const autoSave = () => {
      const textareaEl = document.getElementById('note-text');
      const longText = textareaEl ? textareaEl.value.trim() : (note.text || '');
      note.text = longText;
      const allNotes = Store.get(notesKey, {}) || {};
      if (!longText && (!note.adjustments || note.adjustments.length === 0)) {
        delete allNotes[code];
      } else {
        allNotes[code] = { text: longText, adjustments: note.adjustments || [] };
      }
      if (typeof Store.setLocalOnly === 'function') {
        Store.setLocalOnly(notesKey, allNotes);
        window.__insightPendingNotes = window.__insightPendingNotes || new Set();
        window.__insightPendingNotes.add(notesKey);
        if (typeof window.__updateInsightSyncBadge === 'function') window.__updateInsightSyncBadge();
      } else {
        Store.set(notesKey, allNotes); // 後備：本機 API 還沒準備好就走舊路徑
      }
    };

    // 給 onCancel 用：關閉前把還在輸入框的文字也存成紀錄，避免遺失
    const flushPendingInput = () => {
      const inp = document.getElementById('note-new-adj');
      if (!inp) return;
      const text = inp.value.trim();
      if (!text) return;
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
      note.adjustments = note.adjustments || [];
      note.adjustments.push({ date: dateStr, text, by: this.currentUser?.username || '' });
      inp.value = '';
      autoSave();
      this.render();
    };

    // 開 modal 前先記下 main 的捲軸位置，關閉後還原（不再強制置中，避免商品跳位）
    const _mainEl = document.querySelector('.main') || document.getElementById('main-content');
    const _savedScroll = _mainEl ? _mainEl.scrollTop : 0;
    // 關閉備註視窗後 → 還原原本捲軸位置，讓使用者停在原本看的地方
    const scrollBackToProduct = () => {
      requestAnimationFrame(() => {
        try {
          const mainEl = document.querySelector('.main') || document.getElementById('main-content');
          if (!mainEl) return;
          // 先試著還原原本位置
          mainEl.scrollTop = _savedScroll;
          // 若排序變動導致商品完全不在視野（例如剛加了調整，該商品被排到最新頂端），
          // 才 fallback 用 scrollIntoView 找回來。用容器 bounds 判斷，不是 window.innerHeight
          const el = document.querySelector(`[data-insight-note="${CSS.escape(code)}"]`);
          if (el) {
            const cRect = mainEl.getBoundingClientRect();
            const eRect = el.getBoundingClientRect();
            // 只有「完全在容器視野外」（整個元素在頂邊上或底邊下）才 fallback
            const totallyOutOfView = eRect.bottom < cRect.top || eRect.top > cRect.bottom;
            if (totallyOutOfView) el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
          }
        } catch {}
      });
    };

    this.openModal({
      title: productName ? `${code} · ${productName}` : code,
      width: '560px',
      hideFooter: true,
      enableEsc: true, // 洞察表備註專用：填完按 ESC 直接關閉視窗
      onCancel: () => { flushPendingInput(); scrollBackToProduct(); }, // X 按鈕 / ESC 關閉
      bodyHtml: `
        <div class="field">
          <label><span>調整紀錄 <span style="font-size:11px;font-weight:400;color:var(--text-muted)">（按 Enter 或「送出」新增，自動加日期、自動儲存。打了字直接關閉也會自動存）</span></span></label>
          <div id="note-adj-input-row" style="display:flex;gap:6px;margin-bottom:8px">
            <input type="text" id="note-new-adj" placeholder="例：調整主圖 / 加強廣告預算 +500" style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:5px;font-size:12px">
            <button id="note-save-adj" type="button" style="padding:6px 12px;border:0;border-radius:5px;background:var(--primary);color:white;font-size:12px;cursor:pointer">送出</button>
          </div>
          <div id="note-adj-list" style="max-height:240px;overflow-y:auto">${renderAdjList()}</div>
        </div>
        <div class="field">
          <label style="font-size:12px">長期備註<span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:4px">（商品特性、注意事項，自動儲存）</span></label>
          <textarea id="note-text" rows="2" placeholder="例：主圖偏暗需重拍 / 競品有 PD 認證" style="font-family:inherit;resize:vertical;font-size:12px;padding:6px 8px;min-height:50px">${escapeHtml(note.text || '')}</textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <button id="note-close-btn" type="button" style="padding:9px 22px;border:1px solid var(--border);border-radius:6px;background:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">關閉</button>
        </div>
      `,
      onMount: () => {
        const saveAdjBtn = document.getElementById('note-save-adj');
        const newAdjInput = document.getElementById('note-new-adj');
        const adjList = document.getElementById('note-adj-list');
        const textareaEl = document.getElementById('note-text');
        const closeBtn = document.getElementById('note-close-btn');

        // 打開即可直接輸入
        setTimeout(() => newAdjInput.focus(), 30);

        const bindDelButtons = () => {
          adjList.querySelectorAll('[data-del-date]').forEach(b => {
            b.addEventListener('click', () => {
              const targetDate = b.dataset.delDate;
              note.adjustments = (note.adjustments || []).filter(a => (a.date || '') !== targetDate);
              adjList.innerHTML = renderAdjList();
              autoSave();
              // 重新計算工作日誌摘要 → 該人員的「【洞察表 · 今日調整】」區塊立刻反映本次刪除
              // silent:true 不跳 toast；不直接推雲端，等使用者按「☁ 同步雲端」一次推完
              try { this._updateDailyProgressFromAdjustments({ silent: true }); } catch (e) { console.warn('[del->dp]', e); }
              this.render();
              bindDelButtons();
              bindEditChips();
            });
          });
        };

        // 雙擊調整記錄 → 變成 inline input 編輯
        const bindEditChips = () => {
          adjList.querySelectorAll('[data-edit-date]').forEach(span => {
            span.addEventListener('dblclick', () => {
              const targetDate = span.dataset.editDate;
              const current = span.textContent;
              const input = document.createElement('input');
              input.type = 'text';
              input.value = current;
              input.style.cssText = 'flex:1;padding:4px 8px;border:1px solid var(--primary);border-radius:4px;font-size:12px;font-family:inherit;color:#312e81;font-weight:500';
              const parent = span.parentNode;
              parent.replaceChild(input, span);
              input.focus();
              input.select();
              let done = false;
              const finish = (save) => {
                if (done) return; done = true;
                if (save) {
                  const newText = input.value.trim();
                  if (newText && newText !== current) {
                    // 該日所有紀錄合併為單筆新文字（仍保留原日期）
                    const others = (note.adjustments || []).filter(a => (a.date || '') !== targetDate);
                    others.push({ date: targetDate, text: newText, by: this.currentUser?.username || '' });
                    note.adjustments = others;
                    autoSave();
                    try { this._updateDailyProgressFromAdjustments({ silent: true }); } catch (e) { console.warn('[edit->dp]', e); }
                    this.render();
                  }
                }
                adjList.innerHTML = renderAdjList();
                bindDelButtons();
                bindEditChips();
              };
              input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); finish(true); }
                else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
              });
              input.addEventListener('blur', () => finish(true));
            });
          });
        };

        let lastCommittedText = '';
        let lastCommittedAt = 0;
        const commitAdj = () => {
          const text = newAdjInput.value.trim();
          if (!text) return;
          // 防呆：800ms 內相同文字不重複加入
          const now = Date.now();
          if (text === lastCommittedText && (now - lastCommittedAt) < 800) return;
          lastCommittedText = text;
          lastCommittedAt = now;

          const d = new Date();
          const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
          note.adjustments = note.adjustments || [];
          note.adjustments.push({ date: dateStr, text, by: this.currentUser?.username || '' });
          adjList.innerHTML = renderAdjList();

          // 視覺確認：輸入框變綠色 + 顯示 ✓ 已加入；0.5 秒後清空換下一筆
          newAdjInput.style.transition = 'background-color .15s, border-color .15s';
          newAdjInput.style.background = '#dcfce7';
          newAdjInput.style.borderColor = '#10b981';
          const flashTimer = window.__noteFlashTimer;
          if (flashTimer) clearTimeout(flashTimer);
          window.__noteFlashTimer = setTimeout(() => {
            if (newAdjInput && newAdjInput.value.trim() === text) {
              newAdjInput.value = '';
            }
            newAdjInput.style.background = '';
            newAdjInput.style.borderColor = '';
            newAdjInput.focus();
          }, 500);

          autoSave();
          try { this._updateDailyProgressFromAdjustments({ silent: true }); } catch (e) { console.warn('[add->dp]', e); }
          this.render();
          bindDelButtons();
          bindEditChips();
          showToast(`✓ 已加入：${text.length > 20 ? text.slice(0, 20) + '…' : text}`, 'success');
        };
        saveAdjBtn.addEventListener('click', commitAdj);
        newAdjInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitAdj(); });

        // 長期備註：失焦 / input 時自動儲存（input 用 debounce 避免每打一字就寫 Store）
        let textDebounce = null;
        textareaEl.addEventListener('input', () => {
          if (textDebounce) clearTimeout(textDebounce);
          textDebounce = setTimeout(() => { autoSave(); this.render(); }, 400);
        });
        textareaEl.addEventListener('blur', () => {
          if (textDebounce) { clearTimeout(textDebounce); textDebounce = null; }
          autoSave();
          this.render();
        });

        // 額外保護：失焦時也把還沒按 Enter 的文字存起來
        newAdjInput.addEventListener('blur', () => {
          // 避免 commitAdj 重複（按送出時也會 blur）
          setTimeout(() => {
            if (document.getElementById('note-new-adj') === newAdjInput && newAdjInput.value.trim()) {
              commitAdj();
            }
          }, 150);
        });

        closeBtn.addEventListener('click', () => {
          flushPendingInput();
          autoSave();
          this.render();
          this.closeModal();
          scrollBackToProduct();
        });

        bindDelButtons();
        bindEditChips();
      },
    });
  },
  exportInsightExcel() {
    if (typeof XLSX === 'undefined') { showToast('XLSX 函式庫未載入', 'error'); return; }
    const INSIGHT_SHOPS = ['玩樂', '好麻吉', '森之旅'];
    const currentShop = (this.filter.insightShop && INSIGHT_SHOPS.indexOf(this.filter.insightShop) >= 0)
      ? this.filter.insightShop : '玩樂';
    const sKey = (type) => `ec.insight_${currentShop}_${type}`;

    const master = Store.get(sKey('master'), null);
    const weeks = Store.get(sKey('weeks'), []) || [];
    const perf  = Store.get(sKey('perf'), null);
    const notes = Store.get(sKey('notes'), {}) || {};
    if (!weeks.length) { showToast(`${currentShop} 還沒有銷售資料可匯出`, 'error'); return; }

    // 對照週：和畫面上的選擇一致
    const sales = weeks[0];
    let compareIdx = 1;
    if (this.filter.insightCompare) {
      const i = weeks.findIndex(w => w.periodKey === this.filter.insightCompare);
      if (i > 0) compareIdx = i;
    }
    const salesPrev = (compareIdx > 0 && weeks[compareIdx]) ? weeks[compareIdx] : null;
    const T = Object.assign({}, window.INSIGHT_DEFAULT_THRESHOLDS, Store.get('ec.insightThresholds', {}) || {});

    const masterByCode = master?.byCode || {};
    const prevByCode = {};
    (salesPrev?.products || []).forEach(p => { prevByCode[p.code] = p; });
    // 上週類別需要前前一週
    const salesPrevPrev = (compareIdx + 1 < weeks.length) ? weeks[compareIdx + 1] : null;
    const prevPrevByCode = {};
    (salesPrevPrev?.products || []).forEach(p => { prevPrevByCode[p.code] = p; });
    const perfByShopeeId = perf?.byShopeeId || {};

    const classify = (g, conv, clicks, imp, ctr) => {
      if (g !== null && g !== undefined) {
        const gPct = g * 100;
        if (gPct > T.explosion) return '🟡 爆發品';
        if (gPct >= T.growth) return '🟨 成長品';
        if (gPct < T.heavyDrop) return '🔴 重跌品';
        if (gPct <= T.drop) return '🟥 衰退品';
      }
      const ctrPct = (ctr || 0) * 100;
      const convPct = (conv || 0) * 100;
      if (ctrPct > T.ctrMin) {
        if (conv === 0) return '❎ 零轉換';
        if (convPct >= T.weakConvMin && convPct < T.weakConvMax) return '🟢 弱轉換';
        if (convPct >= T.lowConvMin && convPct <= T.lowConvMax) return '🟩 轉換偏低';
      }
      return '';
    };
    const groupOf = (label) => {
      if (!label) return '';
      if (label.indexOf('爆發品') >= 0 || label.indexOf('成長品') >= 0) return '成長類';
      if (label.indexOf('衰退品') >= 0 || label.indexOf('重跌品') >= 0) return '下滑類';
      if (label.indexOf('轉換') >= 0) return '轉換類';
      return '';
    };

    // 把畫面上的篩選套進來：細分類（複選）+ 點擊率<3% 開關
    let selectedClasses = this.filter.insightClass;
    if (typeof selectedClasses === 'string') selectedClasses = selectedClasses === 'all' || !selectedClasses ? [] : [selectedClasses];
    if (!Array.isArray(selectedClasses)) selectedClasses = [];
    const selectedSet = new Set(selectedClasses);
    const ctrLowFilter = !!this.filter.insightCtrLow;

    let rows = sales.products.slice().sort((a, b) => b.revenue - a.revenue).map(s => {
      const m = masterByCode[s.code] || {};
      const id = m.id || '';
      const p = id ? (perfByShopeeId[id] || {}) : {};
      const prev = prevByCode[s.code];
      const prevPrev = prevPrevByCode[s.code];
      const g = prev && prev.revenue > 0 ? (s.revenue - prev.revenue) / prev.revenue : null;
      const prevG = prev && prevPrev && prevPrev.revenue > 0 ? (prev.revenue - prevPrev.revenue) / prevPrev.revenue : null;
      const n = notes[s.code] || {};
      const adjList = (n.adjustments || []).map(a => `${a.date} ${a.text}`).join(' | ');
      const cls = classify(g, p.convRate || 0, p.clicks || 0, p.impressions || 0, p.ctr || 0);
      const prevCls = prevG !== null ? classify(prevG, 0, 0, 0, 0) : '';
      const ctrVal = p.ctr || 0;
      return {
        _classifyKey: cls.replace(/^[^\s]+\s*/, ''),
        _ctr: ctrVal,
        '商品ID': id,
        '商品編號': s.code,
        '莫筆克名稱': m.mocbicName || '',
        '商品名稱': s.name,
        '上上上週營收': prevPrev?.revenue || '',
        '上上週營收': prev?.revenue || '',
        '上週營收': s.revenue,
        '成長率': g !== null ? (g * 100).toFixed(1) + '%' : '',
        '售出件數': s.qty,
        '獲利': s.profit,
        '曝光': p.impressions || '',
        '點擊': p.clicks || '',
        '點擊率': p.ctr ? (p.ctr * 100).toFixed(2) + '%' : '',
        '轉換率': p.convRate ? (p.convRate * 100).toFixed(2) + '%' : '',
        '大類': groupOf(cls),
        '上上週類別': prevCls,
        '上週類別': cls,
        '判斷結果': (prevCls && cls) ? `${prevCls} → ${cls}` : cls,
        '可用庫存': s.stock - s.demand,
        '備註': n.text || '',
        '調整紀錄': adjList,
      };
    });

    // 套類別篩選（複選任一命中即可）
    let suffix = '';
    if (selectedSet.size > 0) {
      rows = rows.filter(r => selectedSet.has(r._classifyKey));
      suffix = `_${Array.from(selectedSet).join('+')}`;
    }
    if (ctrLowFilter) {
      rows = rows.filter(r => r._ctr > 0 && r._ctr < 0.03);
      suffix += '_點擊率低於3%';
    }
    // 移除暫存欄位
    rows.forEach(r => { delete r._classifyKey; delete r._ctr; });

    if (rows.length === 0) { showToast('目前篩選沒有任何商品可匯出', 'error'); return; }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `營運表現_${currentShop}`);
    const now = new Date();
    const fname = `洞察表_${currentShop}${suffix}_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`;
    XLSX.writeFile(wb, fname);
    showToast(`已匯出 ${fname}（${rows.length} 筆）`, 'success');
  },
});
