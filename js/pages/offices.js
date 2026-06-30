/* js/pages/offices.js -- methods extracted from original App, merged back via Object.assign(App, ...) */
const App = window.App;
const { Store, escapeHtml, showToast, toDateStr, addDays, OFFICE_CONFIG, OFFICE_FEATURES, hasOfficeFeature, canAccessOffice, getUserDepts, computeScore, getQuarterScore } = window;

Object.assign(App, {
  bindOfficeTabs(deptId) {
    document.querySelectorAll('.pill[data-office-tab]').forEach(p => {
      p.addEventListener('click', () => {
        this.filter.officeTab[deptId] = p.dataset.officeTab;
        this.render();
      });
    });
    // d1（行銷）：只有在主頁（有每日進度卡片）才綁；子頁不綁（避免 querySelector 找不到元素）
    if (deptId === 'd1' && document.querySelector('#dp-date-picker, .dp-card')) {
      this.bindWeeklyCalendar(deptId);
    }
    // d1 insight 子頁：洞察表上傳按鈕
    if (deptId === 'd1' && this.route === 'office-d1-insight') {
      this.bindInsightTab();
    }
    // d1 profit 子頁：初始化淨利表的賣場分頁內容
    if (deptId === 'd1' && this.route === 'office-d1-profit' && typeof SHOPS !== 'undefined') {
      // 進入淨利表 → 主動確保重量級訂閱已載入（archive doc + profits collection）
      if (typeof window.__loadHeavyProfitSubs === 'function') window.__loadHeavyProfitSubs();
      setTimeout(() => {
        try {
          SHOPS.forEach(s => {
            const el = document.getElementById('content-' + s.id);
            if (el && !el.innerHTML.trim() && typeof shopHTML === 'function') {
              el.innerHTML = shopHTML(s.id);
            }
          });
          if(typeof initProfitPeriodControls==='function') initProfitPeriodControls();
          SHOPS.forEach(s => {
            if (typeof initShopUI === 'function') initShopUI(s.id);
          });
          try{const _sv=localStorage.getItem('ec_curShop');if(_sv&&_sv!=='總表'&&typeof setShop==='function'){const _sb=document.querySelector("button[onclick*=\"setShop('"+_sv+"'\"]");setShop(_sv,_sb||null);}}catch{}
        } catch (e) { console.error('profit init failed', e); }
      }, 200);
    }
    // 動態 tab 的事件綁定
    const activeTab = this.filter.officeTab[deptId];
    const cfg = OFFICE_CONFIG[deptId];
    const tabKey = activeTab || cfg?.tabs?.[0]?.key;
    const tab = cfg?.tabs?.find(t => t.key === tabKey);
    if (tab?.dynamic === 'daily-progress') {
      this.bindDailyProgress(deptId);
    } else if (tab?.dynamic === 'weekly-calendar') {
      this.bindWeeklyCalendar(deptId);
    } else if (tab?.dynamic === 'design-kpi') {
      this.bindDesignKpi(deptId);
    } else if (tab?.dynamic === 'ai-select') {
      this.bindAiSelect(deptId);
    } else if (tab?.dynamic === 'trend-radar') {
      this.bindTrendRadar();
    } else if (tab?.dynamic === 'img-search') {
      this.bindImgSearch();
    } else if (tab?.dynamic === 'shopee-trend') {
      this.bindShopeeTrend();
    } else if (tab?.dynamic === 'supplier-mgmt') {
      this.bindSupplierTab();
    } else if (tab?.dynamic === 'profit-calc') {
      this.bindProfitCalcTab();
    } else if (tab?.dynamic === 'product-kanban') {
      this.bindKanbanTab();
    } else if (tab?.dynamic === 'competitor-track') {
      this.bindCompetitorTab();
    } else if (tab?.dynamic === 'launch-plan') {
      this.bindLaunchPlanTab();
    }
  },
  _designTimerTick() {
    if (this._designTimerInterval) { clearInterval(this._designTimerInterval); this._designTimerInterval = null; }
    if (!this._designTimer || this._designTimer.status !== 'running') return;
    const update = () => {
      const t = this._designTimer;
      if (!t || t.status !== 'running') {
        if (this._designTimerInterval) clearInterval(this._designTimerInterval);
        this._designTimerInterval = null;
        return;
      }
      const el = document.getElementById('designA-elapsed');
      if (!el) {
        // DOM 不在了（換頁），停掉
        clearInterval(this._designTimerInterval);
        this._designTimerInterval = null;
        return;
      }
      const totalSec = Math.floor((Date.now() - t.startTs) / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      el.textContent = h > 0
        ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        : `${m}:${String(s).padStart(2,'0')}`;
    };
    update();
    this._designTimerInterval = setInterval(update, 1000);
  },
  _designKpiState() {
    // 設計人員白名單 + 個人權限
    const DESIGNERS = ['林美玲', '沈思妤'];
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const myName = this.currentUser && this.currentUser.name;
    const myIsDesigner = DESIGNERS.includes(myName);
    // 選哪位設計師：本人只能看自己；admin 可切換
    let viewName = null;
    if (myIsDesigner) {
      viewName = myName; // 強制看自己，不可看別人
    } else if (isAdmin) {
      viewName = this.filter.designKpiName && DESIGNERS.includes(this.filter.designKpiName)
        ? this.filter.designKpiName : DESIGNERS[0];
    }
    // 月份：預設本月，admin 可切換
    const now = new Date();
    const defMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const yMonth = this.filter.designKpiMonth || defMonth;
    return { DESIGNERS, isAdmin, myName, myIsDesigner, viewName, yMonth };
  },
  _workingDaysInMonth(yMonthStr) {
    const [y, m] = yMonthStr.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    let count = 0;
    for (let d = 1; d <= last; d++) {
      const w = new Date(y, m - 1, d).getDay();
      if (w !== 0 && w !== 6) count++;
    }
    return count;
  },
  _workingDayIndexToday(yMonthStr) {
    const [y, m] = yMonthStr.split('-').map(Number);
    const now = new Date();
    const curY = now.getFullYear(), curM = now.getMonth() + 1;
    if (y !== curY || m !== curM) return this._workingDaysInMonth(yMonthStr); // 過去月份 → 滿
    let count = 0;
    const td = now.getDate();
    for (let d = 1; d <= td; d++) {
      const w = new Date(y, m - 1, d).getDay();
      if (w !== 0 && w !== 6) count++;
    }
    return count;
  },
  _calcDesignKpi(data) {
    const DESIGN_FIXED_TASKS = [
      { key: 't1', name: '設定小黃標、促銷組合、優惠券', schedule: '每週 4 小時', points: 10, monthlyTimes: 4 },
      { key: 't2', name: '上架（蝦皮、酷澎）', schedule: '每週一天', points: 10, monthlyTimes: 4 },
      { key: 't3', name: '排程洞察表換主圖', schedule: '每週一天', points: 5, monthlyTimes: 4 },
      { key: 't4', name: '優化標題（酷澎、蝦皮）', schedule: '每週一天', points: 5, monthlyTimes: 4 },
    ];
    const entries = (data && data.entries) || [];
    const totalCount = entries.length;
    const metCount = entries.filter(e => e.met).length;
    const rateA = totalCount > 0 ? (metCount / totalCount) : 0;
    const scoreA = rateA * 60;

    const fixedTasks = (data && data.fixedTasks) || {};
    const tasksScored = DESIGN_FIXED_TASKS.map(t => {
      const st = fixedTasks[t.key] || { missed: 0, errors: 0 };
      const missed = st.missed || 0;
      const errors = st.errors || 0;
      // 漏做 ≥ 1 直接歸零本項分數；否則只扣做錯（每次 -2）
      const score = missed >= 1 ? 0 : Math.max(0, t.points - errors * 2);
      return { ...t, missed, errors, score };
    });
    const scoreB = tasksScored.reduce((s, t) => s + t.score, 0);

    const skills = (data && data.skills) || [];
    const skillCount = skills.length;
    const scoreCBase = skillCount >= 3 ? 10 : (skillCount / 3) * 10;
    const scoreCExtra = Math.min(10, Math.max(0, skillCount - 3) * 5);

    const total = Math.min(100, scoreA + scoreB + scoreCBase + scoreCExtra);
    return {
      DESIGN_FIXED_TASKS, totalCount, metCount, rateA, scoreA,
      tasksScored, scoreB,
      skillCount, scoreCBase, scoreCExtra,
      total
    };
  },
  renderDesignKpiTab(deptId, color, dept) {
    const st = this._designKpiState();
    if (!st.viewName) {
      return `<div class="placeholder-page" style="padding:40px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">🔒</div>
        <h3 style="margin:0">不是設計團隊成員</h3>
        <p style="color:var(--text-muted);margin-top:8px">本頁僅設計人員（林美玲 / 沈思妤）及管理員可檢視</p>
      </div>`;
    }
    const key = `ec.designKpi_${st.viewName}_${st.yMonth}`;
    const data = Store.get(key, null) || { entries: [], fixedTasks: {}, skills: [] };
    const k = this._calcDesignKpi(data);

    // 進度條：今日基準 vs 實際
    const workDays = this._workingDaysInMonth(st.yMonth);
    const todayIdx = this._workingDayIndexToday(st.yMonth);
    const dailyTarget = 100 / workDays;
    const todayTarget = Math.min(100, dailyTarget * todayIdx);
    const diff = k.total - todayTarget;
    const diffSign = diff >= 0 ? '+' : '';
    const diffColor = diff >= 0 ? '#10b981' : '#ef4444';
    const diffLabel = diff >= 0 ? '領先' : '落後';

    // 「📖 指標說明」按鈕已移到 d4 的 tabBar 位置（取代原「個人績效」pill），這裡不再重複放
    // admin 才能切設計師 / 月份
    const switcher = st.isAdmin ? `
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${st.DESIGNERS.map(n => `<button class="pill ${n === st.viewName ? 'active' : ''}" data-design-pick="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join('')}
        <input type="month" class="design-kpi-month" value="${st.yMonth}" style="margin-left:8px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
      </div>` : `
      <input type="month" class="design-kpi-month" value="${st.yMonth}" style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">`;

    // ───────── A 區：工時記錄表 ─────────
    // 圖種與標準工時（依 D:\Windows\Desktop\設計.xlsx 指標說明圖 量化指標）
    const PRESET_TYPES = [
      { name: '主圖',          minutes: 20 },
      { name: '套圖',          minutes: 45 },
      { name: 'Banner',        minutes: 40 },
      { name: '剪輯（有素材）', minutes: 60 },
      { name: '剪輯（自拍）',   minutes: 120 },
      { name: '社群圖文',       minutes: 15 },
    ];
    const entriesRowsHtml = (data.entries || []).length === 0
      ? `<tr><td colspan="7" style="padding:24px;text-align:left;color:var(--text-muted);font-size:13px">本月還沒有工時記錄</td></tr>`
      : (data.entries || []).map((e, i) => `
        <tr data-entry-idx="${i}">
          <td style="padding:6px 8px;text-align:left;font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums">${escapeHtml(e.date || '')}</td>
          <td style="padding:6px 8px;text-align:left;font-size:13px">${escapeHtml(e.product || '')}</td>
          <td style="padding:6px 8px;text-align:left;font-size:13px;color:var(--text-muted)">${escapeHtml(e.type || '')}</td>
          <td style="padding:6px 8px;text-align:left;font-size:13px;font-variant-numeric:tabular-nums">${e.stdMinutes || ''}</td>
          <td style="padding:6px 8px;text-align:left">${e.met ? '<span style="color:#10b981;font-weight:700">✓ 達標</span>' : '<span style="color:#ef4444;font-weight:700">✗ 超時</span>'}</td>
          <td style="padding:6px 8px;text-align:left;font-size:12px;color:var(--text-muted)">${escapeHtml(e.note || '')}</td>
          <td style="padding:6px 8px;text-align:left"><button class="icon-btn design-entry-del" data-entry-idx="${i}" title="刪除" style="color:#ef4444">✕</button></td>
        </tr>`).join('');

    const sectionA = `
      <div class="table-card" style="margin-bottom:16px;border-top:3px solid #3b82f6">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <h3 style="margin:0;font-size:16px;color:#3b82f6">A. 達標工時內完成率</h3>
            <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">本月接 ${k.totalCount} 件 · 達標 ${k.metCount} 件 · 達標率 ${Math.round(k.rateA*100)}%</p>
          </div>
          <div style="font-size:24px;font-weight:800;color:#3b82f6;font-variant-numeric:tabular-nums">${Math.round(k.scoreA)} <span style="font-size:13px;color:var(--text-muted);font-weight:500">/ 60</span></div>
        </div>
        <div style="padding:10px 14px;background:var(--bg);border-bottom:1px solid var(--border);display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:130px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">日期</label><input type="date" id="designA-date" value="${toDateStr(new Date())}" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit"></div>
          ${(() => {
            const running = this._designTimer?.status === 'running';
            const tProduct = running ? escapeHtml(this._designTimer.product) : '';
            const tType = running ? this._designTimer.type : '';
            const tStd = running ? this._designTimer.stdMin : 20;
            const locked = running ? 'readonly tabindex="-1" title="計時中，不可修改" style="background:#f3f4f6;cursor:not-allowed"' : '';
            const lockedSel = running ? 'disabled title="計時中，不可修改" style="background:#f3f4f6;cursor:not-allowed"' : '';
            return `
              <div style="flex:2;min-width:160px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">商品 / 標題</label><input type="text" id="designA-product" placeholder="例：森之旅 夏季新品" value="${tProduct}" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit${running ? ';background:#f3f4f6;cursor:not-allowed' : ''}" ${running ? 'readonly tabindex="-1" title="計時中，不可修改"' : ''}></div>
              <div style="flex:1.2;min-width:130px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">圖種</label>
                <select id="designA-type" ${running ? 'disabled title="計時中，不可修改"' : ''} style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit;background:${running ? '#f3f4f6' : 'white'};${running ? 'cursor:not-allowed' : ''}">
                  ${PRESET_TYPES.map(t => `<option value="${escapeHtml(t.name)}" data-mins="${t.minutes}" ${tType === t.name ? 'selected' : ''}>${escapeHtml(t.name)}</option>`).join('')}
                  <option value="" data-mins="0">其他</option>
                </select>
              </div>
              <div style="width:90px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">標準(分)</label><input type="number" min="1" id="designA-mins" value="${tStd}" readonly tabindex="-1" title="依圖種自動帶入，不可手動修改" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit;text-align:center;background:#f3f4f6;color:var(--text-muted);cursor:not-allowed"></div>`;
          })()}
          <div style="flex:1.5;min-width:120px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">備註（選填）</label><input type="text" id="designA-note" placeholder="" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit"></div>
          ${this._designTimer?.status === 'running'
            ? `<button id="designA-stop" title="按下後自動新增此筆記錄" style="width:auto;padding:7px 14px;height:32px;font-size:13px;background:#ef4444;color:white;border:0;border-radius:6px;font-weight:600;cursor:pointer;font-variant-numeric:tabular-nums">⏹ 完成 <span id="designA-elapsed">0:00</span></button>`
            : `<button id="designA-start" title="先填商品 + 選圖種，按下開始計時；完成時自動新增" style="width:auto;padding:7px 14px;height:32px;font-size:13px;background:#10b981;color:white;border:0;border-radius:6px;font-weight:600;cursor:pointer">⏱ 開始計時</button>`}
          <button id="designA-add" class="btn-primary" style="width:auto;padding:7px 16px;height:32px;font-size:13px">＋ 新增</button>
        </div>
        <div class="table-wrap" style="max-height:300px;overflow-y:auto">
          <table style="width:auto;font-size:13px">
            <thead style="background:var(--surface);position:sticky;top:0">
              <tr>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:96px">日期</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:280px">商品</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:110px">圖種</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:80px">標準(分)</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:80px">是否達標</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:140px">備註</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:40px"></th>
              </tr>
            </thead>
            <tbody>${entriesRowsHtml}</tbody>
          </table>
        </div>
      </div>`;

    // ───────── B 區：固定任務 ─────────
    const taskRowsHtml = k.tasksScored.map(t => `
      <tr data-task-key="${t.key}">
        <td style="padding:8px 12px;text-align:left;font-size:13px;font-weight:600">${escapeHtml(t.name)}</td>
        <td style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted)">${escapeHtml(t.schedule)}</td>
        <td style="padding:8px 12px;text-align:left;font-size:13px;color:var(--text-muted);font-weight:600">${t.points}</td>
        <td style="padding:6px 8px;text-align:left"><input type="number" class="design-task-missed" data-task-key="${t.key}" min="0" value="${t.missed}" style="width:64px;padding:5px 6px;border:1px solid var(--border);border-radius:5px;font-size:13px;text-align:left;font-family:inherit"></td>
        <td style="padding:6px 8px;text-align:left"><input type="number" class="design-task-errors" data-task-key="${t.key}" min="0" value="${t.errors}" style="width:64px;padding:5px 6px;border:1px solid var(--border);border-radius:5px;font-size:13px;text-align:left;font-family:inherit"></td>
        <td style="padding:8px 12px;text-align:left;font-size:14px;font-weight:700;color:${t.score >= t.points ? '#10b981' : t.score > 0 ? '#f59e0b' : '#ef4444'};font-variant-numeric:tabular-nums">${Math.round(t.score)}</td>
      </tr>`).join('');

    const sectionB = `
      <div class="table-card" style="margin-bottom:16px;border-top:3px solid #f59e0b">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <h3 style="margin:0;font-size:16px;color:#f59e0b">B. 指派固定任務</h3>
            <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">滿分起算，漏做 ≥ 1 該項直接 0 分；做錯每次 -2</p>
          </div>
          <div style="font-size:24px;font-weight:800;color:#f59e0b;font-variant-numeric:tabular-nums">${Math.round(k.scoreB)} <span style="font-size:13px;color:var(--text-muted);font-weight:500">/ 30</span></div>
        </div>
        <div class="table-wrap">
          <table style="width:auto;font-size:13px">
            <thead style="background:var(--surface)">
              <tr>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:390px">固定任務</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:120px">執行時段</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:60px">配分</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:90px">漏做(次)</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:90px">做錯(次)</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:80px">本項得分</th>
              </tr>
            </thead>
            <tbody>${taskRowsHtml}</tbody>
          </table>
        </div>
      </div>`;

    // ───────── C 區：Skill 累積 ─────────
    const skillsRowsHtml = (data.skills || []).length === 0
      ? `<tr><td colspan="5" style="padding:24px;text-align:left;color:var(--text-muted);font-size:13px">本月尚無 Skill 紀錄（每月需 3 項才能拿基本 10 分）</td></tr>`
      : (data.skills || []).map((s, i) => `
        <tr data-skill-idx="${i}">
          <td style="padding:6px 8px;text-align:left;font-size:12px;color:var(--text-muted)">${escapeHtml(s.date || '')}</td>
          <td style="padding:6px 8px;text-align:left;font-size:13px;font-weight:600">${escapeHtml(s.name || '')}</td>
          <td style="padding:6px 8px;text-align:left;font-size:12px;color:var(--text-muted)">${escapeHtml(s.notes || '')}</td>
          <td style="padding:6px 8px;text-align:left">${s.confirmed ? '<span style="color:#10b981;font-weight:700">✓</span>' : '<span style="color:var(--text-muted)">—</span>'}</td>
          <td style="padding:6px 8px;text-align:left"><button class="icon-btn design-skill-del" data-skill-idx="${i}" title="刪除" style="color:#ef4444">✕</button></td>
        </tr>`).join('');

    const sectionC = `
      <div class="table-card" style="margin-bottom:16px;border-top:3px solid #10b981">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <h3 style="margin:0;font-size:16px;color:#10b981">C. Skill 技能累積</h3>
            <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">本月已存 ${k.skillCount} 項 · 目標 3 項 → 滿分 10 · 超過每項 +5（最多 +10）</p>
          </div>
          <div style="font-size:24px;font-weight:800;color:#10b981;font-variant-numeric:tabular-nums">${Math.round(k.scoreCBase)} <span style="font-size:13px;color:var(--text-muted);font-weight:500">/ 10</span>${k.scoreCExtra > 0 ? `<span style="font-size:13px;color:#10b981;font-weight:700;margin-left:6px">+${k.scoreCExtra}</span>` : ''}</div>
        </div>
        <div style="padding:10px 14px;background:var(--bg);border-bottom:1px solid var(--border);display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap">
          <div style="flex:1;min-width:120px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">日期</label><input type="date" id="designC-date" value="${toDateStr(new Date())}" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit"></div>
          <div style="flex:2;min-width:160px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">技能名稱</label><input type="text" id="designC-name" placeholder="例：學會 Photoshop 智慧物件" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit"></div>
          <div style="flex:3;min-width:200px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">內容 / 建檔位置</label><input type="text" id="designC-notes" placeholder="例：Google Drive/設計團隊/Skill/2026-06/" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit"></div>
          <button id="designC-add" class="btn-primary" style="width:auto;padding:7px 16px;height:32px;font-size:13px">＋ 新增</button>
        </div>
        <div class="table-wrap" style="max-height:240px;overflow-y:auto">
          <table style="width:100%;font-size:13px">
            <thead style="background:var(--surface);position:sticky;top:0">
              <tr>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:96px">日期</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:200px">技能名稱</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted)">內容 / 位置</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:80px">主管確認</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:40px"></th>
              </tr>
            </thead>
            <tbody>${skillsRowsHtml}</tbody>
          </table>
        </div>
      </div>`;

    // 進度條的視覺位置（0-100%）
    const pct = Math.max(0, Math.min(100, k.total));
    const targetPct = Math.max(0, Math.min(100, todayTarget));

    // 三張並排小卡：每日目標 / 今日應達 / 領先(落後)
    const statusBg = diff >= 0 ? '#ecfdf5' : '#fee2e2';
    const statusBand = diff >= 0 ? '#10b981' : '#ef4444';
    const statusIcon = diff >= 0 ? '🚀' : '⚠️';

    const header = `
      <div class="table-card" style="margin-bottom:16px;border-top:3px solid ${color}">
        <div style="padding:18px 22px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
            <div>
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:2px">設計師 · ${escapeHtml(st.viewName)}</div>
              <h2 style="margin:0;font-size:22px">${escapeHtml(st.yMonth.replace('-','/'))} 月績效</h2>
            </div>
            ${switcher}
          </div>

          <!-- 大字目前分數 -->
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px">
            <div style="font-size:42px;font-weight:800;color:${color};font-variant-numeric:tabular-nums;line-height:1">${Math.round(k.total)}</div>
            <div style="font-size:18px;color:var(--text-muted);font-weight:500">/ 100 分</div>
          </div>

          <!-- 進度條：藍色 = 實際分；紅色細線 = 今日基準位置 -->
          <div style="position:relative;height:14px;background:var(--bg);border-radius:8px;overflow:hidden;border:1px solid var(--border);margin-bottom:4px">
            <div style="position:absolute;top:0;left:0;height:100%;width:${pct}%;background:linear-gradient(90deg, ${color}88 0%, ${color} 100%);border-radius:7px;transition:width .3s ease"></div>
            <div style="position:absolute;top:-2px;bottom:-2px;left:${targetPct}%;width:2px;background:#ef4444" title="今日應達基準"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:14px">
            <span>0 分</span>
            <span style="color:#ef4444">▲ 今日應達 ${Math.round(todayTarget)}</span>
            <span>100 分</span>
          </div>

          <!-- 三張並排：每日進度分數拆解 -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px">
            <div style="background:#eef2ff;border-left:3px solid #6366f1;padding:10px 14px;border-radius:7px">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:2px">每日該完成的分數</div>
              <div style="font-size:22px;font-weight:800;color:#4338ca;font-variant-numeric:tabular-nums;line-height:1">${Math.round(dailyTarget)} <span style="font-size:12px;color:var(--text-muted);font-weight:500">分/天</span></div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:3px">100 分 ÷ ${workDays} 工作天</div>
            </div>
            <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:7px">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:2px">今天應該已累計</div>
              <div style="font-size:22px;font-weight:800;color:#92400e;font-variant-numeric:tabular-nums;line-height:1">${Math.round(todayTarget)} <span style="font-size:12px;color:var(--text-muted);font-weight:500">分</span></div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:3px">第 ${todayIdx} / ${workDays} 個工作天</div>
            </div>
            <div style="background:${statusBg};border-left:3px solid ${statusBand};padding:10px 14px;border-radius:7px">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:2px">${statusIcon} ${diffLabel}進度</div>
              <div style="font-size:22px;font-weight:800;color:${statusBand};font-variant-numeric:tabular-nums;line-height:1">${diffSign}${Math.round(diff)} <span style="font-size:12px;color:var(--text-muted);font-weight:500">分</span></div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${diff >= 0 ? '太棒了，繼續保持' : '加把勁就追得回來'}</div>
            </div>
          </div>
        </div>
      </div>`;

    return header + sectionA + sectionB + sectionC;
  },
  bindDesignKpi(deptId) {
    const st = this._designKpiState();
    if (!st.viewName) return;

    const saveAndRender = async (data) => {
      const key = `ec.designKpi_${st.viewName}_${st.yMonth}`;
      try {
        if (typeof Store.setLocalOnly === 'function') Store.setLocalOnly(key, data);
        else Store.set(key, data);
        if (typeof Store.pushKeyToCloud === 'function') {
          await Store.pushKeyToCloud(key);
        }
      } catch (e) {
        console.error('[designKpi save]', e);
        showToast('儲存失敗：' + (e && e.message || e), 'error');
        return;
      }
      this.render();
    };
    const loadData = () => {
      const key = `ec.designKpi_${st.viewName}_${st.yMonth}`;
      return Store.get(key, null) || { entries: [], fixedTasks: {}, skills: [] };
    };

    // 📖 指標說明 — 跳出 KPI 全圖
    const infoBtn = document.getElementById('design-kpi-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', () => this._openDesignKpiInfoModal());
    }

    // admin 切設計師
    document.querySelectorAll('[data-design-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter.designKpiName = btn.dataset.designPick;
        this.render();
      });
    });
    // 月份切換
    const monthInp = document.querySelector('.design-kpi-month');
    if (monthInp) {
      monthInp.addEventListener('change', () => {
        this.filter.designKpiMonth = monthInp.value;
        this.render();
      });
    }

    // A 區 — 圖種 select → 自動帶標準工時；選「其他」時清空（臨時指派不需計時）
    const typeSel = document.getElementById('designA-type');
    const minsInp = document.getElementById('designA-mins');
    if (typeSel && minsInp) {
      typeSel.addEventListener('change', () => {
        const opt = typeSel.options[typeSel.selectedIndex];
        const mins = +(opt?.dataset?.mins) || 0;
        minsInp.value = mins > 0 ? mins : '';
      });
    }
    // A 區 — 計時器：開始要先填商品，完成後直接新增到下方表格
    const startBtn = document.getElementById('designA-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const productEl = document.getElementById('designA-product');
        const product = (productEl?.value || '').trim();
        if (!product) { showToast('請先填寫「商品 / 標題」再開始計時', 'error'); productEl?.focus(); return; }
        // 暫存商品 + 圖種 + 標準分鐘到 timer state（render 後表單會重畫，要先存起來）
        const typeSelEl = document.getElementById('designA-type');
        const type = typeSelEl ? (typeSelEl.value || (typeSelEl.options[typeSelEl.selectedIndex]?.text || '其他')) : '';
        const stdMin = +((document.getElementById('designA-mins') || {}).value) || 0;
        if (stdMin <= 0) { showToast('「其他」類型無標準工時，請手動填表後按「＋ 新增」', 'error'); return; }
        this._designTimer = { startTs: Date.now(), status: 'running', product, type, stdMin };
        this.render();
      });
    }
    const stopBtn = document.getElementById('designA-stop');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        const t = this._designTimer;
        const elapsedMs = Date.now() - t.startTs;
        const elapsedMin = Math.max(1, Math.round(elapsedMs / 60000));
        const met = t.stdMin > 0 && elapsedMin <= t.stdMin;
        const data = loadData();
        data.entries = data.entries || [];
        data.entries.unshift({
          date: toDateStr(new Date()),
          product: t.product,
          type: t.type,
          stdMinutes: t.stdMin,
          met,
          note: `實際 ${elapsedMin} 分鐘`,
        });
        this._designTimer = null;
        saveAndRender(data);
        showToast(`✓ 已新增 ${t.product} · ${met ? '標準內' : '超時'} · ${elapsedMin} 分`, met ? 'success' : 'error');
      });
      this._designTimerTick();
    }
    // A 區 — 新增記錄
    const addABtn = document.getElementById('designA-add');
    if (addABtn) {
      addABtn.addEventListener('click', () => {
        const date = (document.getElementById('designA-date') || {}).value;
        const product = ((document.getElementById('designA-product') || {}).value || '').trim();
        const typeSelEl = document.getElementById('designA-type');
        const type = typeSelEl ? typeSelEl.value || (typeSelEl.options[typeSelEl.selectedIndex]?.text?.split(' ')[0] || '其他') : '';
        const stdMinutes = +((document.getElementById('designA-mins') || {}).value) || 0;
        const note = ((document.getElementById('designA-note') || {}).value || '').trim();
        // 手動新增 → 嘗試從備註的「實際 N 分鐘」推算達標；找不到就預設達標
        const m = note.match(/實際\s*(\d+)\s*分鐘/);
        const met = (m && stdMinutes > 0) ? (+m[1] <= stdMinutes) : true;
        if (!date || !product) { showToast('請填寫日期 + 商品', 'error'); return; }
        const data = loadData();
        data.entries = data.entries || [];
        data.entries.unshift({ date, product, type, stdMinutes, met, note });
        this._designTimer = null; // 新增成功 → 重置計時器
        saveAndRender(data);
      });
    }
    // A 區 — 刪除
    document.querySelectorAll('.design-entry-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.entryIdx;
        const data = loadData();
        (data.entries || []).splice(idx, 1);
        saveAndRender(data);
      });
    });

    // B 區 — 漏做 / 做錯次數變動
    const flushBField = (cls, field) => {
      document.querySelectorAll(cls).forEach(inp => {
        inp.addEventListener('change', () => {
          const tk = inp.dataset.taskKey;
          const v = Math.max(0, +inp.value || 0);
          const data = loadData();
          data.fixedTasks = data.fixedTasks || {};
          data.fixedTasks[tk] = data.fixedTasks[tk] || { missed: 0, errors: 0 };
          data.fixedTasks[tk][field] = v;
          saveAndRender(data);
        });
      });
    };
    flushBField('.design-task-missed', 'missed');
    flushBField('.design-task-errors', 'errors');

    // C 區 — 新增 skill
    const addCBtn = document.getElementById('designC-add');
    if (addCBtn) {
      addCBtn.addEventListener('click', () => {
        const date = (document.getElementById('designC-date') || {}).value;
        const name = ((document.getElementById('designC-name') || {}).value || '').trim();
        const notes = ((document.getElementById('designC-notes') || {}).value || '').trim();
        if (!date || !name) { showToast('請填寫日期 + 技能名稱', 'error'); return; }
        const data = loadData();
        data.skills = data.skills || [];
        data.skills.unshift({ date, name, notes, confirmed: false });
        saveAndRender(data);
      });
    }
    // C 區 — 刪除
    document.querySelectorAll('.design-skill-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.skillIdx;
        const data = loadData();
        (data.skills || []).splice(idx, 1);
        saveAndRender(data);
      });
    });
  },

  // 設計 KPI 指標說明 modal — 只放圖，不放標題（標題已寫在圖內）
  _openDesignKpiInfoModal() {
    this.openModal({
      title: '',
      width: '70vw',
      hideFooter: true,
      enableEsc: true,
      bodyHtml: `
        <div style="padding:0;text-align:center">
          <img src="assets/design/kpi_overview.jpg" alt="設計團隊 KPI 指標說明"
               style="display:block;max-width:100%;max-height:calc(80vh - 90px);width:auto;height:auto;margin:0 auto;border-radius:8px;border:1px solid var(--border)">
        </div>
      `,
    });
  },
  viewOffice(deptId, subRoute = null) {
    const departments = Store.get(Store.KEYS.departments, []);
    const dept = departments.find(d => d.id === deptId);
    const cfg = OFFICE_CONFIG[deptId];
    if (!dept || !cfg) {
      // 部門資料還沒載入完（雲端訂閱 race）→ 顯示空白，等下一次 render
      if (departments.length === 0) {
        return '<div style="padding:60px;text-align:center;color:transparent">.</div>';
      }
      return `<div class="placeholder-page"><div class="emoji">❓</div><h3>找不到此辦公室</h3></div>`;
    }
    if (!canAccessOffice(this.currentUser, dept)) {
      return `<div class="placeholder-page">
        <div class="emoji">🔒</div>
        <h3>權限不足</h3>
        <p>你的帳號未獲授權檢視「${escapeHtml(dept.name)}辦公室」</p>
        <p style="font-size:13px;color:var(--text-muted);margin-top:8px">請聯絡管理員開啟「跨辦公室檢視」權限</p>
      </div>`;
    }
    const members = (Store.get(Store.KEYS.users, [])).filter(u => getUserDepts(u).includes(dept.name));
    const color = dept.color;

    const statCards = cfg.stats.map(s => `
      <div class="stat-card">
        <div class="stat-icon" style="background:${color}22;color:${color}">${s.icon}</div>
        <div class="stat-label">${escapeHtml(s.label)}</div>
        <div class="stat-value">${escapeHtml(s.value)}</div>
        <div class="stat-meta">${escapeHtml(s.meta)}</div>
      </div>
    `).join('');

    const tabs = cfg.tabs || [];
    const activeTabKey = this.filter.officeTab[deptId] || tabs[0]?.key;
    const activeTab = tabs.find(t => t.key === activeTabKey) || tabs[0];

    // d4 設計：把 tabBar 整個換成「📖 指標說明」按鈕（取代原本的「個人績效」pill）
    //   d4 只有一個 tab，「個人績效」字樣其實沒意義；改放 KPI 圖按鈕更實用
    const tabBar = tabs.length === 0 ? '' : (deptId === 'd4' ? `
      <div class="filter-bar" style="margin-bottom:16px">
        <button id="design-kpi-info-btn" type="button" style="padding:7px 14px;font-size:13px;font-weight:600;border:0;border-radius:6px;background:var(--primary);color:white;cursor:pointer;font-family:inherit;box-shadow:0 1px 3px rgba(79,70,229,.25)">📖 指標說明</button>
      </div>
    ` : deptId === 'd3' ? `
      <div style="display:flex;flex-direction:column;gap:4px">
        ${tabs.map(t => `
          <button class="pill ${t.key === activeTabKey ? 'active' : ''}" data-office-tab="${escapeHtml(t.key)}"
            style="text-align:left;white-space:nowrap;justify-content:flex-start;padding:8px 14px">${escapeHtml(t.title)}</button>
        `).join('')}
      </div>
    ` : `
      <div class="filter-bar" style="margin-bottom:16px">
        ${tabs.map(t => `
          <button class="pill ${t.key === activeTabKey ? 'active' : ''}" data-office-tab="${escapeHtml(t.key)}">${escapeHtml(t.title)}</button>
        `).join('')}
      </div>
    `);

    let tabContent = '';
    if (activeTab) {
      if (activeTab.dynamic === 'weekly-calendar') {
        tabContent = this.renderWeeklyCalendarTab(deptId, color, dept);
      } else if (activeTab.dynamic === 'daily-progress') {
        tabContent = this.renderDailyProgressTab(deptId, color, dept);
      } else if (activeTab.dynamic === 'design-kpi') {
        tabContent = this.renderDesignKpiTab(deptId, color, dept);
      } else if (activeTab.dynamic === 'ai-select') {
        tabContent = this.renderAiSelectTab(deptId, color, dept);
      } else if (activeTab.dynamic === 'trend-radar') {
        tabContent = this.renderTrendRadarTab();
      } else if (activeTab.dynamic === 'img-search') {
        tabContent = this.renderImgSearchTab();
      } else if (activeTab.dynamic === 'shopee-trend') {
        tabContent = this.renderShopeeTrendTab();
      } else if (activeTab.dynamic === 'supplier-mgmt') {
        tabContent = this.renderSupplierTab();
      } else if (activeTab.dynamic === 'profit-calc') {
        tabContent = this.renderProfitCalcTab();
      } else if (activeTab.dynamic === 'product-kanban') {
        tabContent = this.renderKanbanTab();
      } else if (activeTab.dynamic === 'competitor-track') {
        tabContent = this.renderCompetitorTab();
      } else if (activeTab.dynamic === 'launch-plan') {
        tabContent = this.renderLaunchPlanTab();
      } else if (activeTab.key === 'profit') {
        tabContent = window.__profitTabHtml || '';
        setTimeout(function() {
          if (typeof SHOPS !== 'undefined') {
            try {
              SHOPS.forEach(function(s) {
                var el = document.getElementById('content-' + s.id);
                if (el && !el.innerHTML.trim() && typeof shopHTML === 'function') {
                  el.innerHTML = shopHTML(s.id);
                }
              });
              if(typeof initProfitPeriodControls==='function') initProfitPeriodControls();
              SHOPS.forEach(function(s) {
                if (typeof initShopUI === 'function') initShopUI(s.id);
              });
              if(typeof renderSummary==='function') renderSummary();
              // 重渲染後恢復正在操作的 tab
              try{const _sv=localStorage.getItem('ec_curShop')||(typeof curShop!=='undefined'&&curShop!=='總表'?curShop:null);if(_sv&&_sv!=='總表'&&typeof setShop==='function'){var _rb=document.querySelector("button[onclick*=\"setShop('"+_sv+"'\"]");setShop(_sv,_rb||null);}}catch{}
            } catch(e) { console.log(e); }
          }
        }, 200);
      } else if (activeTab.customHtml) {
        tabContent = activeTab.customHtml;
      } else {
        tabContent = `
          <div class="table-card" style="margin-bottom:16px">
            <div class="table-card-header"><h3>${escapeHtml(activeTab.title)}</h3></div>
            <div class="table-wrap">
              <table>
                <thead><tr>${activeTab.heads.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
                <tbody>
                  ${activeTab.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    }

    const cellQ = (v) => {
      if (v == null) return '<span style="color:var(--text-muted)">—</span>';
      const cls = v >= 90 ? 'trend-up' : v < 60 ? 'trend-down' : '';
      return `<span class="${cls}" style="font-weight:600">${v}</span>`;
    };

    const memberRows = members.length === 0
      ? `<tr><td colspan="6"><div class="empty"><div class="emoji">📭</div>此辦公室目前沒有成員<div style="font-size:13px;margin-top:4px;color:var(--text-muted)">請至「帳號管理」建立帳號並設定辦公室</div></div></td></tr>`
      : members.map(u => {
          const score = computeScore(u);
          const scoreClass = score >= 90 ? 'score-good' : score >= 80 ? 'score-ok' : 'score-bad';
          return `
            <tr>
              <td>
                <div class="employee-cell">
                  <div class="employee-avatar">${escapeHtml(u.name.slice(0,1))}</div>
                  <div>
                    <div class="employee-name">${escapeHtml(u.name)}</div>
                    <div class="employee-code">@${escapeHtml(u.username)}</div>
                  </div>
                </div>
              </td>
              <td>${cellQ(getQuarterScore(u, 'q1'))}</td>
              <td>${cellQ(getQuarterScore(u, 'q2'))}</td>
              <td>${cellQ(getQuarterScore(u, 'q3'))}</td>
              <td>${cellQ(getQuarterScore(u, 'q4'))}</td>
              <td>
                <div class="score-cell">
                  <div class="score-bar"><div class="${scoreClass}" style="width:${score}%"></div></div>
                  <span class="score-value">${score}</span>
                </div>
              </td>
            </tr>
          `;
        }).join('');

    // d1 行銷、d4 設計都不顯示「成員績效」表與上方統計卡片區
    //   d4 已改用個人 KPI 頁，集體季度績效不適用
    const showMemberKpiTable = deptId !== 'd1' && deptId !== 'd4' && deptId !== 'd3';
    const showStatGrid = deptId !== 'd1' && deptId !== 'd4';
    const inner = `
      ${showStatGrid ? `<div class="stat-grid">${statCards}</div>` : ''}
      ${deptId === 'd1' && !subRoute ? `<div style="margin-bottom:20px">${this.renderWeeklyCalendarTab(deptId, color, dept)}</div>` : ''}
      ${deptId === 'd1' && subRoute === 'profit' ? (window.__profitTabHtml || '') : ''}
      ${deptId === 'd1' && subRoute === 'insight' ? this.renderInsightTabHtml() : ''}
      ${deptId === 'd3' ? `
        <div style="display:grid;grid-template-columns:160px 1fr;gap:16px;align-items:start">
          <div>${tabBar}</div>
          <div>${tabContent}</div>
        </div>
      ` : deptId !== 'd1' ? tabBar + tabContent : ''}
      ${showMemberKpiTable ? `
        <div class="table-card">
          <div class="table-card-header">
            <h3>${escapeHtml(dept.name)}成員績效</h3>
            <p>共 ${members.length} 人 · 滿分 100 分 · 資料來源：帳號管理</p>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>員工</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>全年平均</th></tr>
              </thead>
              <tbody>${memberRows}</tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;
    return deptId === 'd3' ? `<div class="dept-d3-view">${inner}</div>` : inner;
  },
});
