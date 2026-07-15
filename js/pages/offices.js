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
    // d2 KPI 子頁：議價表
    if (deptId === 'd2' && this.route === 'office-d2-kpi') {
      this.bindD2KpiTab();
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
    } else if (tab?.dynamic === 'new-products') {
      this.bindNewProductsTab();
    } else if (tab?.dynamic === 'ai-select') {
      this.bindAiSelect(deptId);
    } else if (tab?.dynamic === 'trend-radar') {
      this.bindTrendRadar();
    } else if (tab?.dynamic === 'festival-calendar') {
      // 靜態渲染，不需要額外 bind
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
    const myDepts = (this.currentUser && this.currentUser.departments) || [];
    const myIsDesigner = DESIGNERS.includes(myName);
    const myIsMarketing = myDepts.includes('行銷');
    // 行銷退回權限：admin 或 行銷部門
    const canReject = isAdmin || myIsMarketing;
    // 選哪位設計師：本人只能看自己；admin / 行銷 可切換
    let viewName = null;
    if (myIsDesigner) {
      viewName = myName;
    } else if (isAdmin || myIsMarketing) {
      viewName = this.filter.designKpiName && DESIGNERS.includes(this.filter.designKpiName)
        ? this.filter.designKpiName : DESIGNERS[0];
    }
    // 月份：預設本月，admin / 行銷 可切換
    const now = new Date();
    const defMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const yMonth = this.filter.designKpiMonth || defMonth;
    return { DESIGNERS, isAdmin, myName, myIsDesigner, myIsMarketing, canReject, viewName, yMonth };
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
    // 被行銷退回的算超時（不算達標）
    const metCount = entries.filter(e => e.met && !e.rejected).length;
    const rejectedCount = entries.filter(e => e.rejected).length;
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
      DESIGN_FIXED_TASKS, totalCount, metCount, rejectedCount, rateA, scoreA,
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
    // admin / 行銷 才能切設計師 / 月份（行銷需要看設計師 KPI 才能退回）
    const switcher = (st.isAdmin || st.myIsMarketing) ? `
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
      : (data.entries || []).map((e, i) => {
          const rejected = !!e.rejected;
          const rowBg = rejected ? 'background:#fef2f2' : '';
          const rejectTitle = rejected
            ? `行銷退回：${e.rejectReason || ''}　— ${e.rejectedBy || ''}　${e.rejectedAt ? new Date(e.rejectedAt).toLocaleDateString('zh-TW') : ''}`
            : '';
          const metCell = rejected
            ? `<span style="color:#ef4444;font-weight:700" title="${escapeHtml(rejectTitle)}">✗ 行銷退回</span>`
            : (e.met ? '<span style="color:#10b981;font-weight:700">✓ 達標</span>' : '<span style="color:#ef4444;font-weight:700">✗ 超時</span>');
          // 按鈕組合：退回 / 解除退回 / 重做 / 刪除
          const btnSz = 'width:36px;height:36px;font-size:20px';
          const rejectBtn = (st.canReject && !rejected)
            ? `<button class="icon-btn design-entry-reject" data-entry-idx="${i}" title="行銷退回（時間達標但品質不滿意）" style="${btnSz};color:#f59e0b;margin-right:2px">↩</button>` : '';
          const unrejectBtn = (st.canReject && rejected)
            ? `<button class="icon-btn design-entry-unreject" data-entry-idx="${i}" title="解除退回（誤按或設計師已修正）" style="${btnSz};color:#10b981;margin-right:2px">↪</button>` : '';
          const redoBtn = rejected
            ? `<button class="icon-btn design-entry-redo" data-entry-idx="${i}" title="重做計時（完成後覆蓋此筆時間並清除退回）" style="${btnSz};color:#3b82f6;margin-right:2px">🔄</button>` : '';
          return `
            <tr data-entry-idx="${i}" style="${rowBg}">
              <td style="padding:6px 8px;text-align:left;font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums">${escapeHtml(e.date || '')}</td>
              <td style="padding:6px 8px;text-align:left;font-size:13px">${escapeHtml(e.product || '')}</td>
              <td style="padding:6px 8px;text-align:left;font-size:13px;color:var(--text-muted)">${escapeHtml(e.type || '')}</td>
              <td style="padding:6px 8px;text-align:left;font-size:13px;font-variant-numeric:tabular-nums">${e.stdMinutes || ''}</td>
              <td style="padding:6px 8px;text-align:left">${metCell}</td>
              <td style="padding:6px 8px;text-align:left;font-size:12px;color:var(--text-muted);line-height:1.6">${(() => {
                if (!e.note) return '';
                // 每個「→」開一行，數字粗體 + 深色，原因斜體
                let h = escapeHtml(e.note);
                h = h.replace(/ → /g, '<br>↳ ');
                h = h.replace(/(\d+)\s*分鐘/g, '<strong style="color:var(--text);font-variant-numeric:tabular-nums">$1 分</strong>');
                h = h.replace(/（原因：([^）]+)）/g, '<span style="color:#ef4444">（$1）</span>');
                return h;
              })()}</td>
              <td style="padding:6px 8px;text-align:right;white-space:nowrap">${rejectBtn}${unrejectBtn}${redoBtn}<button class="icon-btn design-entry-del" data-entry-idx="${i}" title="刪除" style="${btnSz};color:#ef4444">✕</button></td>
            </tr>`;
        }).join('');

    const sectionA = `
      <div class="table-card" style="margin-bottom:16px;border-top:3px solid #3b82f6">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <h3 style="margin:0;font-size:16px;color:#3b82f6">A. 達標工時內完成率</h3>
            <p style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">本月接 ${k.totalCount} 件 · 達標 ${k.metCount} 件${k.rejectedCount > 0 ? ` · <span style="color:#ef4444;font-weight:600">行銷退回 ${k.rejectedCount} 件</span>` : ''} · 達標率 ${Math.round(k.rateA*100)}%</p>
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
              <div style="width:90px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">標準(分鐘)</label><input type="number" min="1" id="designA-mins" value="${tStd}" readonly tabindex="-1" title="依圖種自動帶入，不可手動修改" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit;text-align:center;background:#f3f4f6;color:var(--text-muted);cursor:not-allowed"></div>`;
          })()}
          <div style="flex:1.5;min-width:120px"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:3px">備註</label><input type="text" id="designA-note" placeholder="" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-family:inherit"></div>
          ${this._designTimer?.status === 'running'
            ? `<button id="designA-stop" title="按下後自動新增此筆記錄" style="width:auto;padding:7px 14px;height:32px;font-size:13px;background:#ef4444;color:white;border:0;border-radius:6px;font-weight:600;cursor:pointer;font-variant-numeric:tabular-nums">⏹ 完成 <span id="designA-elapsed">0:00</span></button>`
            : `<button id="designA-start" title="先填商品 + 選圖種，按下開始計時；完成時自動新增" style="width:auto;padding:7px 14px;height:32px;font-size:13px;background:#10b981;color:white;border:0;border-radius:6px;font-weight:600;cursor:pointer">⏱ 開始計時</button>`}
          <button id="designA-add" class="btn-primary" style="width:auto;padding:7px 16px;height:32px;font-size:13px">＋ 新增</button>
        </div>
        <div class="table-wrap" style="max-height:300px;overflow-y:auto">
          <table style="width:100%;font-size:13px">
            <thead style="background:var(--surface);position:sticky;top:0">
              <tr>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:96px">日期</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:274px">商品</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:120px">圖種</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:75px">標準(分鐘)</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:90px">是否達標</th>
                <th style="padding:7px 8px;text-align:left;font-size:12px;color:var(--text-muted);width:110px">備註</th>
                <th style="padding:7px 8px;text-align:right;font-size:12px;color:var(--text-muted)"></th>
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
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:370px">固定任務</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:120px">執行時段</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:75px">配分</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:90px">漏做(次)</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:var(--text-muted);width:110px">做錯(次)</th>
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

          <!-- 進度條：實際得分 vs 100 -->
          <div style="position:relative;height:14px;background:var(--bg);border-radius:8px;overflow:hidden;border:1px solid var(--border);margin-bottom:4px">
            <div style="position:absolute;top:0;left:0;height:100%;width:${pct}%;background:linear-gradient(90deg, ${color}88 0%, ${color} 100%);border-radius:7px;transition:width .3s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted)">
            <span>0 分</span>
            <span>100 分</span>
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
        if (t.redoEntryIdx != null && data.entries[t.redoEntryIdx]) {
          // 重做模式：覆蓋原 entry 的時間 + 清退回標記，但 note 保留歷史
          const old = data.entries[t.redoEntryIdx];
          const oldNote = (old.note || '').trim();
          const reason = old.rejectReason || '';
          const reasonSeg = reason ? `（原因：${reason}）` : '';
          const newNote = oldNote
            ? `${oldNote} → 重做 ${elapsedMin} 分鐘${reasonSeg}`
            : `重做 ${elapsedMin} 分鐘${reasonSeg}`;
          data.entries[t.redoEntryIdx] = {
            ...old,
            date: toDateStr(new Date()),
            met,
            note: newNote,
            rejected: false,
            rejectReason: '',
            rejectedBy: '',
            rejectedAt: 0,
          };
          this._designTimer = null;
          saveAndRender(data);
          showToast(`🔄 已重做 ${t.product} · ${met ? '標準內' : '超時'} · ${elapsedMin} 分`, met ? 'success' : 'error');
        } else {
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
        }
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
    // A 區 — 行銷退回（admin / 行銷部門可按）
    document.querySelectorAll('.design-entry-reject').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.entryIdx;
        const data = loadData();
        const e = (data.entries || [])[idx];
        if (!e) return;
        this.openModal({
          title: `行銷退回：${e.product || ''}`,
          bodyHtml: `
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">
              這筆紀錄會從「✓ 達標」改成「✗ 行銷退回」，A 區達標率會即時下降。
              設計師後續可按 🔄 重做計時，完成後會覆蓋這筆時間並清掉退回標記。
            </div>
            <label style="display:block;font-size:12px;color:var(--text-muted);margin-bottom:4px">退回理由（必填）</label>
            <textarea id="reject-reason" placeholder="例：主圖配色不符品牌、字體太小、背景雜亂..." style="width:100%;min-height:80px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;resize:vertical"></textarea>
            <div style="font-size:11px;color:var(--text-muted);margin-top:6px">退回者：${escapeHtml(this.currentUser?.name || this.currentUser?.username || '')}</div>`,
          saveLabel: '確認退回',
          onSave: () => {
            const reason = (document.getElementById('reject-reason')?.value || '').trim();
            if (!reason) { showToast('請填寫退回理由', 'error'); return false; }
            const data2 = loadData();
            const e2 = (data2.entries || [])[idx];
            if (e2) {
              e2.rejected = true;
              e2.rejectReason = reason;
              e2.rejectedBy = this.currentUser?.name || this.currentUser?.username || '';
              e2.rejectedAt = Date.now();
              saveAndRender(data2);
            }
            return true;
          },
          onMount: () => { setTimeout(() => document.getElementById('reject-reason')?.focus(), 50); },
        });
      });
    });
    // A 區 — 解除退回
    document.querySelectorAll('.design-entry-unreject').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.entryIdx;
        const data = loadData();
        const e = (data.entries || [])[idx];
        if (!e) return;
        e.rejected = false;
        e.rejectReason = '';
        e.rejectedBy = '';
        e.rejectedAt = 0;
        saveAndRender(data);
        showToast(`已解除退回 ${e.product || ''}`, 'success');
      });
    });
    // A 區 — 重做計時（rejected entry 才會出現）
    document.querySelectorAll('.design-entry-redo').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this._designTimer?.status === 'running') {
          showToast('已有計時中，請先按「⏹ 完成」', 'error'); return;
        }
        const idx = +btn.dataset.entryIdx;
        const data = loadData();
        const e = (data.entries || [])[idx];
        if (!e) return;
        const stdMin = +e.stdMinutes || 0;
        if (stdMin <= 0) { showToast('此筆無標準工時（其他類型），無法重做計時', 'error'); return; }
        this._designTimer = {
          startTs: Date.now(), status: 'running',
          product: e.product, type: e.type, stdMin,
          redoEntryIdx: idx,
        };
        this.render();
        showToast(`🔄 重做計時開始：${e.product}`, 'success');
      });
    });
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
      } else if (activeTab.dynamic === 'new-products') {
        tabContent = this.renderNewProductsTab();
      } else if (activeTab.dynamic === 'ai-select') {
        tabContent = this.renderAiSelectTab(deptId, color, dept);
      } else if (activeTab.dynamic === 'trend-radar') {
        tabContent = this.renderTrendRadarTab();
      } else if (activeTab.dynamic === 'festival-calendar') {
        tabContent = this.renderFestivalCalendarTab();
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
    const showMemberKpiTable = deptId !== 'd1' && deptId !== 'd4' && deptId !== 'd3' && !(deptId === 'd2' && subRoute === 'kpi');
    const showStatGrid = deptId !== 'd1' && deptId !== 'd4' && deptId !== 'd3' && !(deptId === 'd2' && subRoute === 'kpi');
    const inner = `
      ${showStatGrid ? `<div class="stat-grid">${statCards}</div>` : ''}
      ${deptId === 'd3' ? `<div style="margin-bottom:20px">${this.renderFestivalCalendarTab()}</div>` : ''}
      ${deptId === 'd1' && !subRoute ? `<div style="margin-bottom:20px">${this.renderWeeklyCalendarTab(deptId, color, dept)}</div>` : ''}
      ${deptId === 'd1' && subRoute === 'kpi' ? this.renderMarketingKpiTabHtml() : ''}
      ${deptId === 'd1' && subRoute === 'profit' ? (window.__profitTabHtml || '') : ''}
      ${deptId === 'd1' && subRoute === 'insight' ? this.renderInsightTabHtml() : ''}
      ${deptId === 'd2' && subRoute === 'kpi' ? this.renderD2KpiTabHtml() : ''}
      ${deptId === 'd3' ? `
        <div class="d3-tab-layout">
          <div class="d3-tab-bar">${tabBar}</div>
          <div class="d3-tab-content">${tabContent}</div>
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

  renderMarketingKpiTabHtml() {
    setTimeout(function() {
      if (typeof renderKpiTab === 'function') renderKpiTab();
    }, 200);
    return (typeof buildKpiTabHtml === 'function') ? buildKpiTabHtml() : '';
  },

  renderD2KpiSummaryHtml(scoreCount = 0, scoreAvg = 0) {
    const blue = (v) => `<span style="display:inline-block;background:#fffde7;color:#1565c0;font-weight:700;padding:2px 10px;border-radius:5px;font-size:12px;min-width:44px;text-align:center">${v}</span>`;
    const red = (v) => v > 0
      ? `<span style="display:inline-block;background:#fff1f2;color:#b71c1c;font-weight:700;padding:2px 10px;border-radius:5px;font-size:12px;min-width:44px;text-align:center">${v}</span>`
      : `<span style="display:inline-block;background:#f3f4f6;color:#9ca3af;font-weight:700;padding:2px 10px;border-radius:5px;font-size:12px;min-width:44px;text-align:center">0</span>`;
    const subH = (cols) => `<div style="display:grid;grid-template-columns:${cols.map(c=>c.w||'1fr').join(' ')};background:#e8f5e9;border-bottom:1px solid #c8e6c9">${cols.map(c=>`<div style="padding:5px 10px;font-size:11px;font-weight:600;color:#388e3c;text-align:center">${c.l}</div>`).join('')}</div>`;
    const row = (cols, bg='#fff') => `<div style="display:grid;grid-template-columns:${cols.map(c=>c.w||'1fr').join(' ')};align-items:center;background:${bg};border-bottom:1px solid #f3f4f6">${cols.map(c=>`<div style="padding:7px 10px;font-size:12px;${c.center?'text-align:center':''}">${c.v}</div>`).join('')}</div>`;
    const totalScore = scoreCount + scoreAvg;

    const leftPanel = `
      <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;flex:1;min-width:280px">
        <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">選品 — 每季</div>
        ${subH([{l:'項目',w:'2fr'},{l:'目標支數'},{l:'配分'},{l:'本月得分'}])}
        ${row([{v:'管量：新品數量（季）',w:'2fr'},{v:blue('50'),center:true},{v:blue('30'),center:true},{v:red(0),center:true}])}
        <div style="background:#f0faf0;padding:6px 10px;font-size:11px;font-weight:600;color:#2e7d32;border-bottom:1px solid #c8e6c9">管質分層（三層互斥）</div>
        ${subH([{l:'分層條件',w:'2fr'},{l:'毛利門檻(≥)'},{l:'目標'},{l:'配分'},{l:'本月得分'}])}
        ${row([{v:'毛利 ≥ 1萬',w:'2fr'},{v:blue('10,000'),center:true},{v:blue('2'),center:true},{v:blue('10'),center:true},{v:red(0),center:true}])}
        ${row([{v:'毛利 ≥ 8千（< 1萬）',w:'2fr'},{v:blue('8,000'),center:true},{v:blue('5'),center:true},{v:blue('6'),center:true},{v:red(0),center:true}],'#fafafa')}
        ${row([{v:'毛利 ≥ 5千（< 8千）',w:'2fr'},{v:blue('5,000'),center:true},{v:blue('5'),center:true},{v:blue('4'),center:true},{v:red(0),center:true}])}
        <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">議價 — 每月</div>
        ${subH([{l:'指標',w:'2fr'},{l:'目標值'},{l:'配分'},{l:'本月得分'}])}
        ${row([{v:'議價數量目標（個／月）',w:'2fr'},{v:blue('20'),center:true},{v:blue('20'),center:true},{v:red(scoreCount),center:true}])}
        ${row([{v:'議價比 平均幅度門檻（≥）',w:'2fr'},{v:blue('10.0%'),center:true},{v:blue('20'),center:true},{v:red(scoreAvg),center:true}],'#fafafa')}
        <div style="padding:5px 10px;font-size:11px;color:#6b7280;background:#fafafa;border-bottom:1px solid #f3f4f6">前 10 項平均議價幅度 ≥ 門檻，給滿分；未達則 0（全有全無）</div>
      </div>`;

    const rightPanel = `
      <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;flex:1;min-width:260px;display:flex;flex-direction:column">
        <div style="flex:1">
          <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">叫貨出錯率 — 每月</div>
          ${subH([{l:'出錯率門檻 (≤)',w:'2fr'},{l:'配分'},{l:'本月得分'}])}
          ${row([{v:blue('1.0%'),center:true,w:'2fr'},{v:blue('10'),center:true},{v:red(0),center:true}])}
          <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">加分（AI 三表寫進儀表板）— 每月</div>
          ${subH([{l:'每完成一項',w:'1fr'},{l:'適用項目',w:'3fr'},{l:'本月加分',w:'1fr'}])}
          ${row([{v:blue('+10'),center:true,w:'1fr'},{v:'訂價表 ／ 議價表 ／ 圍購表 ／ 其他工具',w:'3fr'},{v:red(0),center:true,w:'1fr'}])}
          <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">扣分（單價未更新）— 每月</div>
          ${subH([{l:'每次扣分'},{l:'單月上限'},{l:'本月扣分'}])}
          ${row([{v:blue('−3'),center:true},{v:blue('−15'),center:true},{v:red(0),center:true}])}
        </div>
        <div style="background:linear-gradient(135deg,#1a7a6e,#0f5349);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-top:2px solid #0f5349">
          <div>
            <div style="font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.06em;margin-bottom:2px">本月得分總計</div>
            <div style="font-size:11px;color:rgba(255,255,255,.5)">議價數量 ${scoreCount} ＋ 議價比 ${scoreAvg} ＋ 其他 0</div>
          </div>
          <div style="font-size:36px;font-weight:900;color:${totalScore>=40?'#6ee7b7':totalScore>0?'#fde68a':'#9ca3af'};line-height:1">${totalScore}<span style="font-size:14px;font-weight:400;color:rgba(255,255,255,.5);margin-left:4px">分</span></div>
        </div>
      </div>`;

    return `
    <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:18px;background:#fff">
      <div style="background:#1a7a6e;color:#fff;padding:12px 16px">
        <div style="font-size:15px;font-weight:700;margin-bottom:5px">📊 採購績效 KPI 計分架構</div>
        <div style="font-size:11px;opacity:.85;line-height:1.9">
          每月總分 ＝ 選品季分 ÷ 3 ＋ 當月議價（40）＋ 當月出錯率（10）＋ 加分 − 扣分 &nbsp;｜&nbsp; 季累計 ＝ 三個月當月總分合計
        </div>
      </div>
      <div style="display:flex;gap:14px;padding:14px;flex-wrap:wrap;background:#f9fafb">
        ${leftPanel}
        ${rightPanel}
      </div>
    </div>`;
  },

  renderD2KpiTabHtml() {
    const activeQ = Store.get('ec.d2.kpi.quarter', 'Q3');
    const storeKey = activeQ === 'Q3' ? 'ec.d2.bargain' : `ec.d2.bargain.${activeQ.toLowerCase()}`;
    const list = Store.get(storeKey, []);

    const quarterTabs = ['Q1','Q2','Q3','Q4'].map(q => {
      const active = q === activeQ;
      return `<button class="d2-q-tab" data-q="${q}" style="padding:7px 22px;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;${active ? 'background:#1a7a6e;color:#fff;' : 'background:#f3f4f6;color:#6b7280;'}">${q}</button>`;
    }).join('');

    // 非 Q3 季別若無資料顯示佔位（仍顯示子分頁）
    if (activeQ !== 'Q3' && list.length === 0) {
      const _activeStab = Store.get('ec.d2.kpi.stab', '議價表');
      const _stabNames = ['選品','毛利計算','議價表','叫貨出錯率','加分項','扣分項'];
      const _stabTabsHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${_stabNames.map(t => `<button class="d2-stab" data-t="${t}" style="padding:6px 16px;border-radius:20px;border:1px solid ${_activeStab===t?'#059669':'#e5e7eb'};background:${_activeStab===t?'#059669':'#fff'};color:${_activeStab===t?'#fff':'#374151'};font-size:13px;font-weight:${_activeStab===t?'700':'400'};cursor:pointer">${t}</button>`).join('')}
      </div>`;
      const _stabContent = _activeStab === '議價表' ? `
        <div class="table-card">
          <div class="table-card-header"><h3>💰 議價表</h3><p>${activeQ} 尚無資料</p></div>
          <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">尚無資料，點擊「＋ 新增」開始建立</div>
          <div style="padding:12px 16px;border-top:1px solid var(--border)">
            <button id="bg-add-btn" style="padding:7px 16px;background:#059669;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
          </div>
          <div id="bg-form" style="display:none;padding:16px;background:#f0fdf4;border-bottom:1px solid var(--border)">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">
              <input id="bg-date" type="date" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
              <input id="bg-item" placeholder="品名 *" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
              <input id="bg-orig" type="number" placeholder="原始成本" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
              <input id="bg-note" placeholder="更改備註" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
              <input id="bg-b1" type="number" placeholder="第一次議價" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
              <input id="bg-b2" type="number" placeholder="第二次議價" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
              <input id="bg-b3" type="number" placeholder="第三次議價" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            </div>
            <div style="display:flex;gap:8px">
              <button id="bg-save" style="padding:8px 18px;background:#059669;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
              <button id="bg-cancel" style="padding:8px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
            </div>
          </div>
        </div>`
      : `<div class="table-card" style="padding:40px;text-align:center;color:#9ca3af;font-size:14px">📋 ${_activeStab} — 尚無資料，開發中</div>`;
      return `
        <div style="display:flex;gap:8px;margin-bottom:16px">${quarterTabs}</div>
        ${this.renderD2KpiSummaryHtml(0, 0)}
        ${_stabTabsHtml}
        ${_stabContent}`;
    }

    const quarterTabsHtml = `<div style="display:flex;gap:8px;margin-bottom:16px">${quarterTabs}</div>`;
    const priceCell = v => Number(v) ? 'NT$' + Number(v).toLocaleString() : '<span style="color:var(--text-muted)">—</span>';
    // 計算每筆議價比並排序找前10名
    const withPct = list.map((r, i) => {
      const orig = Number(r.orig || 0);
      const bids = [r.b1, r.b2, r.b3].map(Number);
      const lastBid = [...bids].reverse().find(v => v > 0) || 0;
      const pctNum = orig && lastBid ? ((orig - lastBid) / orig) * 100 : -1;
      return { r, i, orig, lastBid, pctNum };
    });
    // 依議價比排序（有議價比的在前，無的在後）
    const sorted = [...withPct].sort((a, b) => b.pctNum - a.pctNum);
    const top10 = sorted.slice(0, 10);
    const rest = sorted.slice(10);

    const renderRow = ({ r, i, orig, lastBid, pctNum }) => {
      const pct = pctNum > 0 ? pctNum.toFixed(1) + '%' : '—';
      return `<tr style="vertical-align:middle;text-align:center">
        <td>${escapeHtml(r.date || '')}</td>
        <td style="font-weight:600;text-align:left">${escapeHtml(r.item || '')}</td>
        <td>${priceCell(r.orig)}</td>
        <td>${priceCell(r.b1)}</td>
        <td>${priceCell(r.b2)}</td>
        <td>${priceCell(r.b3)}</td>
        <td style="font-weight:700;font-size:12px;color:${pctNum > 0 ? '#059669' : 'var(--text-muted)'}">
          <span>${pct}</span>
        </td>
        <td style="font-size:12px">${escapeHtml(r.note || '')}</td>
        <td style="white-space:nowrap"><div style="display:flex;gap:5px;justify-content:center">
          <button class="bg-edit" data-i="${i}" style="padding:3px 10px;border:1px solid #dbeafe;background:#eff6ff;color:#2563eb;border-radius:5px;font-size:12px;cursor:pointer">編輯</button>
          <button class="bg-del" data-i="${i}" style="padding:3px 10px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button>
        </div></td>
      </tr>`;
    };

    const top10Rows = list.length === 0
      ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:28px;font-size:13px">尚無資料，點擊「＋ 新增」開始建立</td></tr>`
      : top10.map(renderRow).join('');

    const restSection = rest.length > 0 ? `
      <tr><td colspan="9" style="padding:0;border:0">
        <details>
          <summary style="cursor:pointer;padding:10px 14px;font-size:12px;color:var(--text-muted);background:#f9fafb;border-top:1px solid var(--border);list-style:none;display:flex;align-items:center;gap:6px;user-select:none">
            <span style="font-size:10px">▶</span> 其他 ${rest.length} 筆紀錄
          </summary>
          <div style="max-height:280px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse">
              <tbody>${rest.map(renderRow).join('')}</tbody>
            </table>
          </div>
        </details>
      </td></tr>` : '';
    // KPI 計算
    const nowYM = new Date().toISOString().slice(0, 7); // "2026-07"
    const monthList = list.filter(r => (r.date || '').startsWith(nowYM));
    const monthCount = monthList.length;
    const top10pcts = [...withPct].filter(x => x.pctNum > 0).sort((a, b) => b.pctNum - a.pctNum).slice(0, 10).map(x => x.pctNum);
    const avgTop10 = top10pcts.length ? (top10pcts.reduce((s, v) => s + v, 0) / top10pcts.length) : 0;
    const scoreCount = monthCount >= 20 ? 20 : 0;
    const scoreAvg = avgTop10 >= 10 ? 20 : 0;

    const kpiCard = (icon, label, value, subLabel, score, fullScore) => {
      const pass = score >= fullScore;
      return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;min-width:180px;flex:1">
        <div style="font-size:22px;margin-bottom:4px">${icon}</div>
        <div style="font-size:24px;font-weight:700;color:var(--text)">${value}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${label}</div>
        <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;background:${pass ? '#f0fdf4' : '#fafafa'};border-radius:7px;padding:6px 10px">
          <span style="font-size:11px;color:${pass ? '#059669' : '#9ca3af'}">${subLabel}</span>
          <span style="font-weight:700;font-size:15px;color:${pass ? '#059669' : '#d1d5db'}">${score}<span style="font-size:11px;font-weight:400">/${fullScore}分</span></span>
        </div>
      </div>`;
    };

    const totalScore = scoreCount + scoreAvg;
    const scoreColor = totalScore >= 40 ? '#059669' : totalScore > 0 ? '#f59e0b' : '#9ca3af';
    const badge = (label, value, pass) =>
      `<div style="display:flex;flex-direction:column;align-items:center;background:${pass ? '#f0fdf4' : '#f9fafb'};border:1px solid ${pass ? '#bbf7d0' : '#e5e7eb'};border-radius:8px;padding:6px 14px;min-width:90px">
        <span style="font-size:16px;font-weight:800;color:${pass ? '#059669' : '#6b7280'}">${value}</span>
        <span style="font-size:10px;color:#9ca3af;margin-top:1px">${label}</span>
      </div>`;

    const activeStab = Store.get('ec.d2.kpi.stab', '議價表');
    const stabNames = ['選品','毛利計算','議價表','叫貨出錯率','加分項','扣分項'];
    const stabTabsHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      ${stabNames.map(t => `<button class="d2-stab" data-t="${t}" style="padding:6px 16px;border-radius:20px;border:1px solid ${activeStab===t?'#059669':'#e5e7eb'};background:${activeStab===t?'#059669':'#fff'};color:${activeStab===t?'#fff':'#374151'};font-size:13px;font-weight:${activeStab===t?'700':'400'};cursor:pointer">${t}</button>`).join('')}
    </div>`;

    const spKey = `ec.d2.sp.${activeQ.toLowerCase()}`;
    const spList = Store.get(spKey, []);
    const spRows = spList.map((r, i) => `<tr>
      <td>${escapeHtml(r.spDate || '')}</td>
      <td style="font-weight:600">${escapeHtml(r.spName || '')}</td>
      <td>${escapeHtml(r.spLaunch || '')}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.spLink ? `<a href="${escapeHtml(r.spLink)}" target="_blank" style="color:#2563eb;font-size:12px">${escapeHtml(r.spLink)}</a>` : '—'}</td>
      <td style="white-space:nowrap"><div style="display:flex;gap:5px;justify-content:center">
        <button class="sp-edit" data-i="${i}" style="padding:3px 10px;border:1px solid #dbeafe;background:#eff6ff;color:#2563eb;border-radius:5px;font-size:12px;cursor:pointer">編輯</button>
        <button class="sp-del" data-i="${i}" style="padding:3px 10px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button>
      </div></td>
    </tr>`).join('');

    const stabContent = activeStab === '選品' ? `
      <div class="table-card">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div><h3>🛍️ 選品</h3><p>記錄選品資訊（共 ${spList.length} 筆）</p></div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="display:flex;flex-direction:column;align-items:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 14px;min-width:80px">
              <span style="font-size:16px;font-weight:800;color:#059669">${spList.filter(r=>r.spLink).length} 筆</span>
              <span style="font-size:10px;color:#9ca3af">已上蝦皮</span>
            </div>
            <button id="sp-add-btn" style="padding:7px 16px;background:#059669;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
          </div>
        </div>
        <div id="sp-form" style="display:none;padding:16px;background:#f0fdf4;border-bottom:1px solid var(--border)">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">
            <input id="sp-date" type="date" placeholder="填表時間" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="sp-name" placeholder="商品名稱 *" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="sp-launch" type="date" placeholder="上架時間" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="sp-link" placeholder="蝦皮賣場連結" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          </div>
          <div style="display:flex;gap:8px">
            <button id="sp-save" style="padding:8px 18px;background:#059669;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
            <button id="sp-cancel" style="padding:8px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>填表時間</th><th>商品名稱</th><th>上架時間</th><th>蝦皮賣場連結</th><th></th></tr></thead>
          <tbody>${spRows}</tbody>
        </table></div>
      </div>`
    : activeStab === '議價表' ? `
      <div class="table-card" data-store-key="${storeKey}">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <h3>💰 議價表</h3>
            <p>記錄每次採購議價過程與最終議價比（共 ${list.length} 筆）</p>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${badge('當月議價數', monthCount + ' 筆', scoreCount > 0)}
            ${badge('前10名平均議價比', avgTop10 ? avgTop10.toFixed(1) + '%' : '—', scoreAvg > 0)}
            <div style="display:flex;flex-direction:column;align-items:center;background:#fff;border:2px solid ${scoreColor};border-radius:8px;padding:6px 14px;min-width:80px">
              <span style="font-size:18px;font-weight:800;color:${scoreColor}">${totalScore}</span>
              <span style="font-size:10px;color:#9ca3af">/ 40 分</span>
            </div>
            <button id="bg-add-btn" style="padding:7px 16px;background:#059669;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
          </div>
        </div>
        <div id="bg-form" style="display:none;padding:16px;background:#f0fdf4;border-bottom:1px solid var(--border)">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">
            <input id="bg-date" type="date" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="bg-item" placeholder="品名 *" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="bg-orig" type="number" placeholder="原始成本" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="bg-note" placeholder="更改備註" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
            <input id="bg-b1" type="number" placeholder="第一次議價" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="bg-b2" type="number" placeholder="第二次議價" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="bg-b3" type="number" placeholder="第三次議價" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          </div>
          <div style="display:flex;gap:8px">
            <button id="bg-save" style="padding:8px 18px;background:#059669;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
            <button id="bg-cancel" style="padding:8px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>日期</th><th>品名</th><th style="text-align:center">原始成本</th><th style="text-align:center">第一次議價</th><th style="text-align:center">第二次議價</th><th style="text-align:center">第三次議價</th><th style="text-align:center">議價比</th><th>更改</th><th></th></tr></thead>
          <tbody>${top10Rows}${restSection}</tbody>
        </table></div>
      </div>`
    : `<div class="table-card" style="padding:40px;text-align:center;color:#9ca3af;font-size:14px">📋 ${activeStab} — 尚無資料，開發中</div>`;

    return `
      ${quarterTabsHtml}
      ${this.renderD2KpiSummaryHtml(scoreCount, scoreAvg)}
      ${stabTabsHtml}
      ${stabContent}`;
  },
  bindD2KpiTab() {
    // 季別切換
    document.querySelectorAll('.d2-q-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.set('ec.d2.kpi.quarter', btn.dataset.q);
        this.render();
      });
    });

    // 子分頁切換
    document.querySelectorAll('.d2-stab').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.set('ec.d2.kpi.stab', btn.dataset.t);
        this.render();
      });
    });

    // 選品表單
    const spForm = document.getElementById('sp-form');
    if (spForm) {
      const activeQ2 = Store.get('ec.d2.kpi.quarter', 'Q3');
      const spKey = `ec.d2.sp.${activeQ2.toLowerCase()}`;
      const spSaveBtn = document.getElementById('sp-save');
      let spEditIndex = -1;
      const spFields = ['sp-date','sp-name','sp-launch','sp-link'];
      const clearSp = () => {
        spFields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        spEditIndex = -1;
        spSaveBtn.textContent = '儲存';
        spForm.style.display = 'none';
      };
      document.getElementById('sp-add-btn')?.addEventListener('click', () => {
        if (spForm.style.display !== 'none') { clearSp(); return; }
        clearSp(); spForm.style.display = '';
      });
      document.getElementById('sp-cancel')?.addEventListener('click', clearSp);
      spSaveBtn?.addEventListener('click', () => {
        const name = document.getElementById('sp-name')?.value.trim();
        if (!name) { alert('請填寫商品名稱'); return; }
        const entry = {
          spDate: document.getElementById('sp-date')?.value,
          spName: name,
          spLaunch: document.getElementById('sp-launch')?.value,
          spLink: document.getElementById('sp-link')?.value.trim(),
        };
        const list = Store.get(spKey, []);
        if (spEditIndex >= 0) { list[spEditIndex] = entry; } else { list.push(entry); }
        Store.set(spKey, list);
        this.render();
      });
      document.querySelectorAll('.sp-edit').forEach(btn => btn.addEventListener('click', () => {
        const list = Store.get(spKey, []);
        const r = list[+btn.dataset.i]; if (!r) return;
        spEditIndex = +btn.dataset.i;
        document.getElementById('sp-date').value = r.spDate || '';
        document.getElementById('sp-name').value = r.spName || '';
        document.getElementById('sp-launch').value = r.spLaunch || '';
        document.getElementById('sp-link').value = r.spLink || '';
        spSaveBtn.textContent = '更新';
        spForm.style.display = '';
        spForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }));
      document.querySelectorAll('.sp-del').forEach(btn => btn.addEventListener('click', () => {
        const list = Store.get(spKey, []);
        list.splice(+btn.dataset.i, 1);
        Store.set(spKey, list);
        this.render();
      }));
    }

    const form = document.getElementById('bg-form');
    if (!form) return;
    const activeQ = Store.get('ec.d2.kpi.quarter', 'Q3');
    const storeKey = activeQ === 'Q3' ? 'ec.d2.bargain' : `ec.d2.bargain.${activeQ.toLowerCase()}`;
    const saveBtn = document.getElementById('bg-save');
    let editIndex = -1;
    const fields = ['bg-date','bg-item','bg-orig','bg-note','bg-b1','bg-b2','bg-b3'];
    const clearForm = () => {
      fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      editIndex = -1;
      saveBtn.textContent = '儲存';
      form.style.display = 'none';
    };
    document.getElementById('bg-add-btn')?.addEventListener('click', () => {
      if (form.style.display !== 'none') { clearForm(); return; }
      clearForm(); form.style.display = '';
    });
    document.getElementById('bg-cancel')?.addEventListener('click', clearForm);
    saveBtn?.addEventListener('click', () => {
      const item = document.getElementById('bg-item')?.value.trim();
      if (!item) { alert('請填寫品名'); return; }
      const entry = {
        date: document.getElementById('bg-date')?.value,
        item,
        orig: document.getElementById('bg-orig')?.value,
        b1: document.getElementById('bg-b1')?.value,
        b2: document.getElementById('bg-b2')?.value,
        b3: document.getElementById('bg-b3')?.value,
        note: document.getElementById('bg-note')?.value.trim(),
      };
      const list = Store.get(storeKey, []);
      if (editIndex >= 0) { list[editIndex] = entry; } else { list.push(entry); }
      Store.set(storeKey, list);
      this.render();
    });
    document.querySelectorAll('.bg-edit').forEach(btn => btn.addEventListener('click', () => {
      const list = Store.get(storeKey, []);
      const r = list[+btn.dataset.i]; if (!r) return;
      editIndex = +btn.dataset.i;
      document.getElementById('bg-date').value = r.date || '';
      document.getElementById('bg-item').value = r.item || '';
      document.getElementById('bg-orig').value = r.orig || '';
      document.getElementById('bg-b1').value = r.b1 || '';
      document.getElementById('bg-b2').value = r.b2 || '';
      document.getElementById('bg-b3').value = r.b3 || '';
      document.getElementById('bg-note').value = r.note || '';
      saveBtn.textContent = '更新';
      form.style.display = '';
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
    document.querySelectorAll('.bg-del').forEach(btn => btn.addEventListener('click', () => {
      const list = Store.get(storeKey, []);
      list.splice(+btn.dataset.i, 1);
      Store.set(storeKey, list);
      this.render();
    }));
  },

  renderFestivalCalendarTab() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yr = today.getFullYear();

    const FESTIVALS = [
      { name: '農曆春節',    date: '2026-02-17', prepDays: 60, emoji: '🧧', mult: 3, tags: ['年貨禮盒', '居家佈置', '保暖用品', '零食禮盒'] },
      { name: '情人節',      date: '2026-02-14', prepDays: 30, emoji: '💝', mult: 1.5, tags: ['香氛蠟燭', '收納禮盒', '居家佈置'] },
      { name: '38婦女節',    date: '2026-03-08', prepDays: 21, emoji: '🌸', mult: 1.5, tags: ['居家清潔', '收納整理', '廚房用品'] },
      { name: '清明連假',    date: '2026-04-04', prepDays: 21, emoji: '🌿', mult: 1.5, tags: ['戶外用品', '野餐墊', '保溫瓶'] },
      { name: '母親節',      date: '2026-05-10', prepDays: 30, emoji: '💐', mult: 2, tags: ['廚房用品', '居家收納', '保溫瓶', '保鮮盒'] },
      { name: '端午節',      date: '2026-06-19', prepDays: 21, emoji: '🐉', mult: 2, tags: ['廚房用品', '禮盒包裝', '保冷袋'] },
      { name: '父親節',      date: '2026-08-08', prepDays: 30, emoji: '👔', mult: 2, tags: ['居家工具', '戶外用品', '保溫瓶'] },
      { name: '中元節',      date: '2026-08-27', prepDays: 14, emoji: '🏮', mult: 1.5, tags: ['祭祀用品', '居家清潔', '整理收納'] },
      { name: '中秋節',      date: '2026-09-25', prepDays: 30, emoji: '🥮', mult: 2.5, tags: ['戶外烤肉', '保冷袋', '餐具組', '折疊桌椅'] },
      { name: '雙11購物節',  date: `${yr}-11-11`, prepDays: 45, emoji: '🛒', mult: 3, tags: ['全品類衝量', '收納箱', '廚房用品', '寢具'] },
      { name: '雙12購物節',  date: `${yr}-12-12`, prepDays: 30, emoji: '🎁', mult: 2, tags: ['年終清倉', '居家收納', '保溫瓶'] },
      { name: '聖誕節',      date: `${yr}-12-25`, prepDays: 30, emoji: '🎄', mult: 2, tags: ['居家佈置', '禮品包裝', '收納盒'] },
      { name: '跨年',        date: `${yr}-12-31`, prepDays: 14, emoji: '🎆', mult: 1.5, tags: ['派對用品', '居家清潔', '收納整理'] },
      { name: '元旦',        date: `${yr+1}-01-01`, prepDays: 14, emoji: '🎊', mult: 1.5, tags: ['新年大掃除', '收納箱', '清潔用品'] },
    ];

    // 下一個週一或週四
    const nextOrderDay = (fromDate) => {
      const d = new Date(fromDate);
      for (let i = 0; i <= 7; i++) {
        const day = d.getDay();
        if (day === 1 || day === 4) return new Date(d);
        d.setDate(d.getDate() + 1);
      }
      return d;
    };

    const rows = FESTIVALS
      .map(f => {
        let d = new Date(f.date);
        if (d < today) d.setFullYear(d.getFullYear() + 1);
        const days = Math.round((d - today) / 86400000);
        const prepDate = new Date(d - f.prepDays * 86400000);
        const prepDays = Math.round((prepDate - today) / 86400000);
        return { ...f, d, days, prepDate, prepDays };
      })
      .filter(f => f.days <= 180)
      .sort((a, b) => a.days - b.days);

    const urgColor = (days) => days <= 30 ? '#ef4444' : days <= 60 ? '#f97316' : '#22c55e';
    const urgBg   = (days) => days <= 30 ? '#fef2f2' : days <= 60 ? '#fff7ed' : '#f0fdf4';
    const urgLabel = (days) => days <= 30 ? '緊急' : days <= 60 ? '準備中' : '規劃中';

    const f = rows[0];
    if (!f) return `<div class="table-card" style="padding:14px 16px;color:var(--text-muted);font-size:13px">近期無重要節慶</div>`;

    const c = urgColor(f.days);
    const bg = urgBg(f.days);
    const orderDay = nextOrderDay(f.prepDays <= 0 ? today : f.prepDate);
    const isMonday = orderDay.getDay() === 1;
    const orderLabel = isMonday ? '週一主力叫貨 🔼 多叫' : '週四補量叫貨 🔽 少叫';
    const orderDayStr = f.prepDays <= 0
      ? `⚠️ 備貨時間已到！`
      : `最晚 ${f.prepDays} 天後 · ${orderDay.getMonth()+1}/${orderDay.getDate()}（${orderLabel}）`;

    return `
      <div style="border:1.5px solid ${c}33;border-radius:10px;padding:10px 14px;background:${bg};display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:24px">${f.emoji}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:14px;font-weight:700;color:var(--text)">${escapeHtml(f.name)}</span>
            <span style="font-size:12px;color:var(--text-muted)">${f.d.getMonth()+1}/${f.d.getDate()}</span>
            <span style="font-size:11px;padding:1px 8px;border-radius:999px;background:${c};color:white;font-weight:700">${urgLabel(f.days)}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${orderDayStr}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:5px">
            ${f.tags.map(t => `<span style="font-size:11px;padding:1px 7px;background:${c}18;color:${c};border-radius:999px;font-weight:600">${t}</span>`).join('')}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:28px;font-weight:800;color:${c};line-height:1">${f.days}</div>
          <div style="font-size:10px;color:${c};font-weight:600">天後</div>
        </div>
      </div>`;
  },
});
