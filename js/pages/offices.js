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
    // d2 訂價表
    if (deptId === 'd2' && this.route === 'office-d2-pricing') {
      this.bindD2PricingTab();
    }
    // d2 新品毛利表
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
    const showMemberKpiTable = deptId !== 'd1' && deptId !== 'd4' && deptId !== 'd3' && !(deptId === 'd2' && (subRoute === 'kpi' || subRoute === 'pricing' || subRoute === 'margin'));
    const showStatGrid = deptId !== 'd1' && deptId !== 'd4' && deptId !== 'd3' && !(deptId === 'd2' && (subRoute === 'kpi' || subRoute === 'pricing' || subRoute === 'margin'));
    const inner = `
      ${showStatGrid ? `<div class="stat-grid">${statCards}</div>` : ''}
      ${deptId === 'd3' ? `<div style="margin-bottom:20px">${this.renderFestivalCalendarTab()}</div>` : ''}
      ${deptId === 'd1' && !subRoute ? `<div style="margin-bottom:20px">${this.renderWeeklyCalendarTab(deptId, color, dept)}</div>` : ''}
      ${deptId === 'd1' && subRoute === 'kpi' ? this.renderMarketingKpiTabHtml() : ''}
      ${deptId === 'd1' && subRoute === 'profit' ? (window.__profitTabHtml || '') : ''}
      ${deptId === 'd1' && subRoute === 'insight' ? this.renderInsightTabHtml() : ''}
      ${deptId === 'd2' && subRoute === 'kpi' ? this.renderD2KpiTabHtml() : ''}
      ${deptId === 'd2' && subRoute === 'pricing' ? this.renderD2PricingTabHtml() : ''}
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

  renderD2KpiSummaryHtml(activeQ = 'Q3', monthNums = ['07','08','09'], monthScores = [{sc:0,sa:0},{sc:0,sa:0},{sc:0,sa:0}]) {
    const mLabels = monthNums.map(m => `${parseInt(m)}月得分`);
    const blue = (v) => `<span style="display:inline-block;background:#fffde7;color:#1565c0;font-weight:700;padding:2px 10px;border-radius:5px;font-size:13px;min-width:40px;text-align:center">${v}</span>`;
    const sc = (v) => v > 0
      ? `<span style="display:inline-block;background:#fff1f2;color:#b71c1c;font-weight:700;padding:2px 10px;border-radius:5px;font-size:13px;min-width:36px;text-align:center">${v}</span>`
      : `<span style="display:inline-block;background:#f3f4f6;color:#9ca3af;font-weight:700;padding:2px 10px;border-radius:5px;font-size:13px;min-width:36px;text-align:center">0</span>`;
    const mCols = mLabels.map(l => ({l, w:'1fr'}));
    // 每月版 header（議價用）
    const subH = (baseCols) => {
      const all = [...baseCols, ...mCols];
      return `<div style="display:grid;grid-template-columns:${all.map(c=>c.w||'1fr').join(' ')};background:#e8f5e9;border-bottom:1px solid #c8e6c9">${all.map(c=>`<div style="padding:6px 10px;font-size:12px;font-weight:600;color:#388e3c;text-align:center">${c.l}</div>`).join('')}</div>`;
    };
    const row = (baseCols, scoreFn, bg = '#fff') => {
      const scs = monthScores.map(ms => ({v:sc(scoreFn(ms)),center:true,w:'1fr'}));
      const all = [...baseCols, ...scs];
      return `<div style="display:grid;grid-template-columns:${all.map(c=>c.w||'1fr').join(' ')};align-items:center;background:${bg};border-bottom:1px solid #f3f4f6">${all.map(c=>`<div style="padding:8px 10px;font-size:13px;${c.center?'text-align:center':''}">${c.v}</div>`).join('')}</div>`;
    };
    // 每季版 header（選品用）— 單一「本季得分」欄
    const subHQ = (baseCols) => {
      const all = [...baseCols, {l:'本季得分', w:'1fr'}];
      return `<div style="display:grid;grid-template-columns:${all.map(c=>c.w||'1fr').join(' ')};background:#e8f5e9;border-bottom:1px solid #c8e6c9">${all.map(c=>`<div style="padding:6px 10px;font-size:12px;font-weight:600;color:#388e3c;text-align:center">${c.l}</div>`).join('')}</div>`;
    };
    const rowQ = (baseCols, scoreVal = 0, bg = '#fff') => {
      const all = [...baseCols, {v:sc(scoreVal),center:true,w:'1fr'}];
      return `<div style="display:grid;grid-template-columns:${all.map(c=>c.w||'1fr').join(' ')};align-items:center;background:${bg};border-bottom:1px solid #f3f4f6">${all.map(c=>`<div style="padding:8px 10px;font-size:13px;${c.center?'text-align:center':''}">${c.v}</div>`).join('')}</div>`;
    };
    const nowM = new Date().getMonth() + 1;
    const curIdx = monthNums.findIndex(m => parseInt(m) === nowM);
    const cur = monthScores[curIdx >= 0 ? curIdx : monthScores.length - 1] || {sc:0,sa:0};
    const totalScore = cur.sc + cur.sa + (cur.bonus || 0);
    const totalsStr = monthScores.map((ms, i) => `${parseInt(monthNums[i])}月 ${ms.sc+ms.sa+(ms.bonus||0)}分`).join(' ／ ');

    const leftPanel = `
      <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;flex:1;min-width:280px">
        <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">選品 — 每季</div>
        ${subHQ([{l:'項目',w:'2fr'},{l:'目標支數'},{l:'配分'}])}
        ${rowQ([{v:'管量：新品數量（季）',w:'2fr'},{v:blue('50'),center:true},{v:blue('30'),center:true}], 0)}
        <div style="background:#f0faf0;padding:6px 10px;font-size:11px;font-weight:600;color:#2e7d32;border-bottom:1px solid #c8e6c9">管質分層（三層互斥）</div>
        ${subHQ([{l:'分層條件',w:'2fr'},{l:'毛利門檻(≥)'},{l:'目標'},{l:'配分'}])}
        ${rowQ([{v:'毛利 ≥ 1萬',w:'2fr'},{v:blue('10,000'),center:true},{v:blue('2'),center:true},{v:blue('10'),center:true}], 0)}
        ${rowQ([{v:'毛利 ≥ 8千（< 1萬）',w:'2fr'},{v:blue('8,000'),center:true},{v:blue('5'),center:true},{v:blue('6'),center:true}], 0, '#fafafa')}
        ${rowQ([{v:'毛利 ≥ 5千（< 8千）',w:'2fr'},{v:blue('5,000'),center:true},{v:blue('5'),center:true},{v:blue('4'),center:true}], 0)}
        <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">議價 — 每月</div>
        ${subH([{l:'指標',w:'2fr'},{l:'目標值'},{l:'配分'}])}
        ${row([{v:'議價數量目標（個／月）',w:'2fr'},{v:blue('20'),center:true},{v:blue('20'),center:true}], ms => ms.sc)}
        ${row([{v:'議價比 平均幅度門檻（≥）',w:'2fr'},{v:blue('10.0%'),center:true},{v:blue('20'),center:true}], ms => ms.sa, '#fafafa')}
        <div style="padding:5px 10px;font-size:11px;color:#6b7280;background:#fafafa;border-bottom:1px solid #f3f4f6">前 10 項平均議價幅度 ≥ 門檻，給滿分；未達則 0（全有全無）</div>
      </div>`;

    const rightPanel = `
      <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;flex:1;min-width:260px;display:flex;flex-direction:column">
        <div style="flex:1">
          <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">叫貨出錯率 — 每月</div>
          ${subH([{l:'出錯率門檻 (≤)',w:'2fr'},{l:'配分'}])}
          ${row([{v:blue('1.0%'),center:true,w:'2fr'},{v:blue('10'),center:true}], () => 0)}
          <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">加分（訂價表／議價表／圍購表／其他工具）— 每月</div>
          ${subH([{l:'每完成一項加分',w:'2fr'}])}
          ${row([{v:blue('+10'),center:true,w:'2fr'}], ms => ms.bonus || 0)}
          <div style="background:#1a7a6e;color:#fff;font-weight:700;font-size:12px;padding:8px 12px">扣分（單價未更新）— 每月</div>
          ${subH([{l:'每次扣分'},{l:'單月上限'}])}
          ${row([{v:blue('−3'),center:true},{v:blue('−15'),center:true}], () => 0)}
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
    // 共用子分頁季別（議價表/叫貨/加分項/扣分項共用）
    const activeStabQ = Store.get('ec.d2.kpi.stabQ', activeQ);
    const storeKey = activeStabQ === 'Q3' ? 'ec.d2.bargain' : `ec.d2.bargain.${activeStabQ.toLowerCase()}`;
    const list = Store.get(storeKey, []);

    const quarterTabs = ['Q1','Q2','Q3','Q4'].map(q => {
      const active = q === activeQ;
      return `<button class="d2-q-tab" data-q="${q}" style="padding:7px 22px;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;${active ? 'background:#1a7a6e;color:#fff;' : 'background:#f3f4f6;color:#6b7280;'}">${q}</button>`;
    }).join('');

    const quarterTabsHtml = `<div style="display:flex;gap:8px;margin-bottom:16px">${quarterTabs}</div>`;
    const sqLabels = {Q1:'1~3月',Q2:'4~6月',Q3:'7~9月',Q4:'10~12月'};
    const stabQTabsHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      ${['Q1','Q2','Q3','Q4'].map(q => {
        const act = q === activeStabQ;
        return `<button class="d2-stabq-tab" data-q="${q}" style="padding:5px 14px;border-radius:20px;border:1px solid ${act?'#1a7a6e':'#e5e7eb'};background:${act?'#1a7a6e':'#fff'};color:${act?'#fff':'#374151'};font-size:12px;font-weight:${act?'700':'400'};cursor:pointer">${q} <span style="font-size:11px;opacity:.85">${sqLabels[q]}</span></button>`;
      }).join('')}
    </div>`;
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
        <td style="text-align:center"><input type="checkbox" class="bg-toggle-changed" data-i="${i}" ${r.changed ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:#059669"></td>
        <td style="white-space:nowrap"><div style="display:flex;gap:5px;justify-content:center">
          <button class="bg-edit" data-i="${i}" style="padding:3px 10px;border:1px solid #d1fae5;background:#f0fdf4;color:#1a7a6e;border-radius:5px;font-size:12px;cursor:pointer">編輯</button>
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
    // KPI 計算 — 依 activeQ 算各月分數
    const year = new Date().getFullYear();
    const qMonthMap = {Q1:['01','02','03'],Q2:['04','05','06'],Q3:['07','08','09'],Q4:['10','11','12']};
    const activeMonths = qMonthMap[activeQ] || ['07','08','09'];
    const kpiStoreKey = activeQ === 'Q3' ? 'ec.d2.bargain' : `ec.d2.bargain.${activeQ.toLowerCase()}`;
    const kpiList = Store.get(kpiStoreKey, []);
    const bonusKey = `ec.d2.bonus.${activeQ.toLowerCase()}`;
    const bonusAll = Store.get(bonusKey, []);
    const monthScores = activeMonths.map(m => {
      const ym = `${year}-${m}`;
      const ml = kpiList.filter(r => (r.date || '').startsWith(ym));
      const pcts = ml.map(r => {
        const orig = Number(r.orig || 0), bids = [r.b1, r.b2, r.b3].map(Number);
        const last = [...bids].reverse().find(v => v > 0) || 0;
        return orig && last ? (orig - last) / orig * 100 : -1;
      });
      const top10p = pcts.filter(p => p > 0).sort((a, b) => b - a).slice(0, 10);
      const avg = top10p.length ? top10p.reduce((s, v) => s + v, 0) / top10p.length : 0;
      const bonusCount = bonusAll.filter(r => (r.date || '').startsWith(ym)).length;
      return { sc: ml.length >= 20 ? 20 : 0, sa: avg >= 10 ? 20 : 0, bonus: bonusCount * 10 };
    });
    // 當月議價徽章用（議價表 card 內顯示）
    const nowYM = new Date().toISOString().slice(0, 7);
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
    const stabNames = ['選品','新品毛利表','議價表','叫貨出錯率','加分項','扣分項'];
    const stabTabsHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      ${stabNames.map(t => `<button class="d2-stab" data-t="${t}" style="padding:6px 16px;border-radius:20px;border:1px solid ${activeStab===t?'#059669':'#e5e7eb'};background:${activeStab===t?'#059669':'#fff'};color:${activeStab===t?'#fff':'#374151'};font-size:13px;font-weight:${activeStab===t?'700':'400'};cursor:pointer">${t}</button>`).join('')}
    </div>`;

    const spKey = `ec.d2.sp.${activeQ.toLowerCase()}`;
    const spList = Store.get(spKey, []);
    const spSorted = spList.map((r, i) => ({ r, i })).sort((a, b) => (a.r.spDate || '').localeCompare(b.r.spDate || ''));
    const renderSpRow = ({ r, i }) => `<tr>
      <td>${escapeHtml(r.spDate || '')}</td>
      <td style="font-weight:600">${escapeHtml(r.spName || '')}</td>
      <td>${escapeHtml(r.spLaunch || '')}</td>
      <td>${r.spLink ? `<a href="${escapeHtml(r.spLink)}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:5px;color:#ea580c;font-size:12px;font-weight:600;text-decoration:none">🛒 前往賣場</a>` : '<span style="color:#d1d5db">—</span>'}</td>
      <td style="white-space:nowrap"><div style="display:flex;gap:5px;justify-content:center">
        <button class="sp-edit" data-i="${i}" style="padding:3px 10px;border:1px solid #d1fae5;background:#f0fdf4;color:#1a7a6e;border-radius:5px;font-size:12px;cursor:pointer">編輯</button>
        <button class="sp-del" data-i="${i}" style="padding:3px 10px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button>
      </div></td>
    </tr>`;
    const spTop10Rows = spSorted.slice(0, 10).map(renderSpRow).join('');
    const spRest = spSorted.slice(10);
    const spRestSection = spRest.length ? `<tr><td colspan="5" style="padding:0;border:0">
      <details><summary style="padding:8px 16px;cursor:pointer;font-size:12px;color:#6b7280;list-style:none;background:#f9fafb;border-top:1px solid #f3f4f6">▼ 顯示其餘 ${spRest.length} 筆</summary>
      <div style="max-height:320px;overflow-y:auto"><table style="width:100%;border-collapse:collapse">
        ${spRest.map(renderSpRow).join('')}
      </table></div></details></td></tr>` : '';

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
            <input id="sp-date" type="text" placeholder="填表時間（如 2026/07/15）" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="sp-name" placeholder="商品名稱 *" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="sp-launch" type="text" placeholder="上架時間（如 2026/07/15）" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="sp-link" placeholder="蝦皮賣場連結" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          </div>
          <div style="display:flex;gap:8px">
            <button id="sp-save" style="padding:8px 18px;background:#059669;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
            <button id="sp-cancel" style="padding:8px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>填表時間</th><th>商品名稱</th><th>上架時間</th><th>蝦皮賣場連結</th><th></th></tr></thead>
          <tbody>${spTop10Rows}${spRestSection}</tbody>
        </table></div>
      </div>`
    : activeStab === '議價表' ? `
      ${stabQTabsHtml}
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
            <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer;background:#fff"><input type="checkbox" id="bg-changed" style="width:15px;height:15px;accent-color:#059669;cursor:pointer"> 更改單價</label>
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
          <thead><tr><th>日期</th><th>品名</th><th style="text-align:center">原始成本</th><th style="text-align:center">第一次議價</th><th style="text-align:center">第二次議價</th><th style="text-align:center">第三次議價</th><th style="text-align:center">議價比</th><th style="text-align:center">更改單價</th><th></th></tr></thead>
          <tbody>${top10Rows}${restSection}</tbody>
        </table></div>
      </div>`
    : activeStab === '加分項' ? (() => {
      const bnKey = `ec.d2.bonus.${activeStabQ.toLowerCase()}`;
      const bnList = Store.get(bnKey, []);
      const bnSorted = bnList.map((r, i) => ({ r, i })).sort((a, b) => (b.r.date || '').localeCompare(a.r.date || ''));
      const bnItems = ['訂價表','議價表','圍購表','其他工具'];
      const bnTotalPts = bnList.length * 10;
      const renderBnRow = ({ r, i }) => `<tr style="vertical-align:middle">
        <td style="text-align:left;padding:8px 12px;font-size:13px">${escapeHtml(r.date || '')}</td>
        <td style="font-weight:600;text-align:left;padding:8px 12px;font-size:13px">${escapeHtml(r.item || '')}</td>
        <td style="text-align:center;padding:8px 12px"><span style="display:inline-block;background:#f0fdf4;color:#059669;font-weight:700;padding:2px 10px;border-radius:5px;font-size:12px">+10</span></td>
        <td style="text-align:left;padding:8px 12px;color:#6b7280;font-size:12px">${escapeHtml(r.note || '')}</td>
        <td style="white-space:nowrap"><div style="display:flex;gap:5px;justify-content:center">
          <button class="bn-edit" data-i="${i}" style="padding:3px 10px;border:1px solid #d1fae5;background:#f0fdf4;color:#1a7a6e;border-radius:5px;font-size:12px;cursor:pointer">編輯</button>
          <button class="bn-del" data-i="${i}" style="padding:3px 10px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button>
        </div></td>
      </tr>`;
      const bnRows = bnSorted.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:28px;font-size:13px">尚無資料，點擊「＋ 新增」開始建立</td></tr>`
        : bnSorted.map(renderBnRow).join('');
      return `${stabQTabsHtml}<div class="table-card">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <h3>⭐ 加分項</h3>
            <p>每完成一項 AI 三表寫進儀表板 +10 分（共 ${bnList.length} 筆）</p>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="display:flex;flex-direction:column;align-items:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 14px;min-width:80px">
              <span style="font-size:18px;font-weight:800;color:#059669">+${bnTotalPts}</span>
              <span style="font-size:10px;color:#9ca3af">本季加分</span>
            </div>
            <button id="bn-add-btn" style="padding:7px 16px;background:#059669;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
          </div>
        </div>
        <div id="bn-form" style="display:none;padding:16px;background:#f0fdf4;border-bottom:1px solid var(--border)">
          <div style="display:grid;grid-template-columns:1fr 2fr 2fr;gap:10px;margin-bottom:10px">
            <input id="bn-date" type="date" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <select id="bn-item" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;background:#fff">
              <option value="">選擇適用項目 *</option>
              ${bnItems.map(it => `<option value="${it}">${it}</option>`).join('')}
            </select>
            <input id="bn-note" placeholder="備註（選填）" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="bn-save" style="padding:8px 18px;background:#059669;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
            <button id="bn-cancel" style="padding:8px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th style="text-align:left">日期</th><th style="text-align:left">適用項目</th><th style="text-align:center">加分</th><th style="text-align:left">備註</th><th></th></tr></thead>
          <tbody>${bnRows}</tbody>
        </table></div>
      </div>`;
    })()
    : activeStab === '新品毛利表' ? this.renderD2MarginTabHtml()
    : (() => {
      const needStabQ = ['叫貨出錯率','扣分項'].includes(activeStab);
      return `${needStabQ ? stabQTabsHtml : ''}<div class="table-card" style="padding:40px;text-align:center;color:#9ca3af;font-size:14px">📋 ${activeStab} — 尚無資料，開發中</div>`;
    })();

    const nowM = new Date().getMonth() + 1;
    const curIdx = activeMonths.findIndex(m => parseInt(m) === nowM);
    const cur = monthScores[curIdx >= 0 ? curIdx : monthScores.length - 1] || {sc:0,sa:0};
    const kpiTotal = cur.sc + cur.sa + (cur.bonus || 0);
    const kpiTotalsStr = monthScores.map((ms, i) => `${parseInt(activeMonths[i])}月 ${ms.sc+ms.sa+(ms.bonus||0)}分`).join(' ／ ');
    const totalBarHtml = `<div style="background:linear-gradient(135deg,#1a7a6e,#0f5349);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;border-radius:10px;margin-bottom:14px">
      <div>
        <div style="font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.06em;margin-bottom:2px">當月得分總計</div>
        <div style="font-size:11px;color:rgba(255,255,255,.5)">${kpiTotalsStr}</div>
      </div>
      <div style="font-size:36px;font-weight:900;color:${kpiTotal>=40?'#6ee7b7':kpiTotal>0?'#fde68a':'#9ca3af'};line-height:1">${kpiTotal}<span style="font-size:14px;font-weight:400;color:rgba(255,255,255,.5);margin-left:4px">分</span></div>
    </div>`;

    return `
      ${quarterTabsHtml}
      ${totalBarHtml}
      <details id="kpi-summary-details" style="margin-bottom:18px;border:1px solid #d1fae5;border-radius:10px;overflow:hidden">
        <summary style="cursor:pointer;padding:10px 16px;background:#f0fdf4;color:#1a7a6e;font-size:13px;font-weight:700;list-style:none;display:flex;align-items:center;justify-content:space-between;user-select:none">
          <span>📊 計分架構（點擊展開）</span>
          <span style="font-size:11px;opacity:.7">▼</span>
        </summary>
        <div style="padding:14px;background:#fff">
          ${this.renderD2KpiSummaryHtml(activeQ, activeMonths, monthScores)}
        </div>
      </details>
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

    // 子分頁 Q 分頁切換（議價表/叫貨出錯率/加分項/扣分項共用）
    document.querySelectorAll('.d2-stabq-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.set('ec.d2.kpi.stabQ', btn.dataset.q);
        this.render();
      });
    });

    // 加分項表單
    const bnForm = document.getElementById('bn-form');
    if (bnForm) {
      const bnQ = Store.get('ec.d2.kpi.stabQ', Store.get('ec.d2.kpi.quarter', 'Q3'));
      const bnKey = `ec.d2.bonus.${bnQ.toLowerCase()}`;
      let bnEditIdx = -1;
      const bnSaveBtn = document.getElementById('bn-save');
      const clearBn = () => {
        ['bn-date','bn-item','bn-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        bnEditIdx = -1;
        if (bnSaveBtn) bnSaveBtn.textContent = '儲存';
        bnForm.style.display = 'none';
      };
      document.getElementById('bn-add-btn')?.addEventListener('click', () => {
        if (bnForm.style.display !== 'none') { clearBn(); return; }
        clearBn(); bnForm.style.display = '';
      });
      document.getElementById('bn-cancel')?.addEventListener('click', clearBn);
      bnSaveBtn?.addEventListener('click', () => {
        const item = document.getElementById('bn-item')?.value;
        if (!item) { alert('請選擇適用項目'); return; }
        const entry = {
          date: document.getElementById('bn-date')?.value,
          item,
          note: document.getElementById('bn-note')?.value.trim(),
        };
        const list = Store.get(bnKey, []);
        if (bnEditIdx >= 0) { list[bnEditIdx] = entry; } else { list.push(entry); }
        Store.set(bnKey, list);
        this.render();
      });
      document.querySelectorAll('.bn-edit').forEach(btn => btn.addEventListener('click', () => {
        const list = Store.get(bnKey, []);
        const r = list[+btn.dataset.i]; if (!r) return;
        bnEditIdx = +btn.dataset.i;
        document.getElementById('bn-date').value = r.date || '';
        document.getElementById('bn-item').value = r.item || '';
        document.getElementById('bn-note').value = r.note || '';
        if (bnSaveBtn) bnSaveBtn.textContent = '更新';
        bnForm.style.display = '';
        bnForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }));
      document.querySelectorAll('.bn-del').forEach(btn => btn.addEventListener('click', () => {
        const list = Store.get(bnKey, []);
        list.splice(+btn.dataset.i, 1);
        Store.set(bnKey, list);
        this.render();
      }));
    }

    const form = document.getElementById('bg-form');
    if (!form) return;
    const activeBQ = Store.get('ec.d2.kpi.stabQ', Store.get('ec.d2.kpi.quarter', 'Q3'));
    const storeKey = activeBQ === 'Q3' ? 'ec.d2.bargain' : `ec.d2.bargain.${activeBQ.toLowerCase()}`;
    const saveBtn = document.getElementById('bg-save');
    let editIndex = -1;
    const fields = ['bg-date','bg-item','bg-orig','bg-b1','bg-b2','bg-b3'];
    const clearForm = () => {
      fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const bgCh = document.getElementById('bg-changed'); if (bgCh) bgCh.checked = false;
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
        changed: document.getElementById('bg-changed')?.checked || false,
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
      const bgChanged = document.getElementById('bg-changed'); if (bgChanged) bgChanged.checked = !!r.changed;
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
    document.querySelectorAll('.bg-toggle-changed').forEach(cb => cb.addEventListener('change', () => {
      const list = Store.get(storeKey, []);
      if (list[+cb.dataset.i]) { list[+cb.dataset.i].changed = cb.checked; Store.set(storeKey, list); }
    }));

    // 新品毛利表（委派給 bindD2MarginTab）
    this.bindD2MarginTab();
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

  // ── 訂價表 ──────────────────────────────────────────────
  PRICING_SHEETS_ORDER: ['商品母表','生活好麻吉','玩樂盒子','森之旅','維克生活館','MOMO','FRIDAY'],

  // 各工作表費率常數（依 Excel $C$1 匯率、G欄 運費/kg¥、row2 各費率）
  // ship = 陸>台運費 ¥/kg（與原始成本同樣換匯，故實際成本 = (C+D+E×ship)×rmb）
  // incTax = 銷項稅金率（訂價表 Excel 顯示 None = 0，不含銷項稅）
  PRICING_SHEET_PARAMS: {
    '商品母表':   { rmb:4.5, ship:9, tax:0.05, txFee:0.08, promo:0.06, ret:0.02, fixed:9 },
    '生活好麻吉': { rmb:4.5, ship:9, tax:0.05, txFee:0.08, promo:0.06, ret:0.02, fixed:9 },
    '玩樂盒子':   { rmb:4.5, ship:9, tax:0.05, txFee:0.08, promo:0.06, ret:0.02, fixed:9 },
    '森之旅':     { rmb:4.5, ship:9, tax:0.05, txFee:0.08, promo:0.06, ret:0.02, fixed:9 },
    '維克生活館': { rmb:4.5, ship:9, tax:0.05, txFee:0.08, promo:0.06, ret:0.02, fixed:9 },
    'MOMO':       { rmb:4.5, ship:9, tax:0.05, txFee:0.08, promo:0.06, ret:0.02, fixed:9 },
    'FRIDAY':     { rmb:4.5, ship:9, tax:0.05, txFee:0.08, promo:0.06, ret:0.02, fixed:9 },
  },

  // 讀取費率：優先用 localStorage 儲存值，否則用預設
  _prGetRates(sheet) {
    const def = this.PRICING_SHEET_PARAMS[sheet] || this.PRICING_SHEET_PARAMS['訂價'];
    const saved = Store.get('ec.pricing.rates', {});
    return { ...def, ...(saved[sheet] || {}) };
  },

  // 費率設定面板 HTML
  _prRatesFormHtml() {
    const saved = Store.get('ec.pricing.rates', {});
    const rows = this.PRICING_SHEETS_ORDER.map(sh => {
      const d = this.PRICING_SHEET_PARAMS[sh];
      const r = { ...d, ...(saved[sh] || {}) };
      const inp = (field, val) =>
        `<input data-sh="${sh}" data-field="${field}" type="number" step="0.01" value="${val}"
          style="width:64px;padding:4px 6px;border:1px solid var(--border);border-radius:5px;font-size:12px;text-align:right;font-family:inherit">`;
      return `<tr>
        <td style="padding:6px 10px;font-weight:600;font-size:12px;white-space:nowrap">${sh}</td>
        <td style="padding:4px 6px;text-align:center">${inp('tax',   (r.tax*100).toFixed(1))}</td>
        <td style="padding:4px 6px;text-align:center">${inp('txFee',(r.txFee*100).toFixed(1))}</td>
        <td style="padding:4px 6px;text-align:center">${inp('promo',(r.promo*100).toFixed(1))}</td>
        <td style="padding:4px 6px;text-align:center">${inp('ret',  (r.ret*100).toFixed(1))}</td>
        <td style="padding:4px 6px;text-align:center">${inp('fixed', r.fixed)}</td>
      </tr>`;
    }).join('');
    return `<div id="pr-rates-panel" style="display:none;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--bg-secondary,#f9fafb)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:13px;font-weight:700;color:var(--text)">費率設定</span>
        <div style="display:flex;gap:6px">
          <button id="pr-rates-reset" style="padding:5px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;color:var(--text)">還原預設</button>
          <button id="pr-rates-save"  style="padding:5px 12px;background:#059669;color:white;border:0;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">儲存</button>
          <button id="pr-rates-close" style="padding:5px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;color:var(--text)">✕</button>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table style="border-collapse:collapse">
          <thead><tr style="color:#6b7280;border-bottom:1px solid var(--border)">
            <th style="padding:4px 10px;text-align:left;font-weight:600;font-size:12px">分頁</th>
            <th style="padding:4px 6px;text-align:center;font-weight:600;font-size:12px">稅金%</th>
            <th style="padding:4px 6px;text-align:center;font-weight:600;font-size:12px">成交%</th>
            <th style="padding:4px 6px;text-align:center;font-weight:600;font-size:12px">活動%</th>
            <th style="padding:4px 6px;text-align:center;font-weight:600;font-size:12px">退貨%</th>
            <th style="padding:4px 6px;text-align:center;font-weight:600;font-size:12px">固定費(NT$)</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="font-size:10px;color:#9ca3af;margin:8px 0 0">※ 導流品售價 ≥ 100 時自動 +9（運費包材+開發票）</p>
    </div>`;
  },

  _prCalcAll(sheet, origCost, landFreight, weight, price, roas, volume) {
    const p = this._prGetRates(sheet);
    const r2 = v => Math.round(v * 100) / 100;
    // Excel 公式：=(C+D+(E×G))*$C$1，G=運費/kg(¥)，$C$1=匯率
    // 陸>台運費也是人民幣，全部一起換匯
    const 陸台運費RMB = r2(weight * p.ship);
    const 陸台運費NT = r2(陸台運費RMB * p.rmb);
    const 實際成本 = r2((origCost + landFreight + 陸台運費RMB) * p.rmb);
    const 稅金 = r2(price * p.tax);
    const 成交 = r2(price * p.txFee);
    const 活動 = r2(price * p.promo);
    const 退貨 = r2(price * p.ret);
    // Excel: 入帳 = 售價-(稅金+成交+活動+退貨)，即 I-(K+SUM(L:N))
    const 平台費 = r2(稅金 + 成交 + 活動 + 退貨);
    // 導流品售價 ≥ 100：固定費 +9（運費包材+開發票）
    const 固定 = (sheet === '導流品' && price >= 100) ? 9 : 0;
    const 入帳 = r2(price - 平台費 - 固定);
    // Excel: 蝦皮總成本 = SUM(K:P) = 平台費+入帳+銷項 = 售價
    const 蝦皮總成本 = r2(price);
    // Excel: 實際毛利 = 入帳 - 實際成本 (O-H)
    const 實際毛利 = r2(入帳 - 實際成本);
    // Excel: 獲利% = 實際毛利 / 售價 (Q/I)
    const 獲利百分比 = price > 0 ? r2(實際毛利 / price * 10000) / 10000 : 0;
    const 成本率 = price > 0 ? r2(實際成本 / price * 10000) / 10000 : 0;
    const 廣告 = (roas > 0 && price > 0) ? r2(price / roas) : null;
    const 淨利潤 = volume ? r2(實際毛利 * volume - (廣告 || 0) * volume) : null;
    const 預估投入 = volume ? r2(volume * price) : null;
    return { 陸台運費NT, 實際成本, 稅金, 成交, 活動, 退貨, 蝦皮總成本, 入帳, 實際毛利, 獲利百分比, 成本率, 廣告, 淨利潤, 預估投入 };
  },

  _prBuildRow(sheet, inputs) {
    const { logistics, name, origCost, landFreight, weight, price, roas, volume, store, website, note } = inputs;
    const c = this._prCalcAll(sheet, origCost, landFreight, weight, price, roas, volume);
    const existingRows = window.__pricingData?.[sheet] || [];
    // 商品母表（或其他空白 RMB 工作表）的預設欄位結構
    const RMB_DEFAULT_COLS = ['商品編號','產品名稱','品項條碼','樣式','尺寸','原始成本','陸〉陸運費','陸>台運費(kg)','售價','實際成本','蝦皮總成本','入帳金額','實際毛利','獲利百分比','成本率','備註'];
    const baseCols = existingRows.length > 0
      ? Object.keys(existingRows[0])
      : (sheet === '商品母表' ? RMB_DEFAULT_COLS : []);
    // Victor 的 Y 欄「進貨」是 URL，JSON 未匯出時手動補上
    const cols = (sheet === 'Victor' && !baseCols.includes('進貨'))
      ? [...baseCols, '進貨']
      : baseCols;
    const row = { __custom: true, __id: Date.now() };
    for (const col of cols) {
      if (col === '集運') row[col] = logistics || '';
      else if (col === '產品名稱' || col === '試算名稱') row[col] = name;
      else if (col === '原始成本') row[col] = origCost;
      else if (col.includes('陸〉陸') || col.includes('陸>陸')) row[col] = landFreight;
      else if (col.includes('陸>台')) row[col] = weight;
      else if (col === '實際成本' || col === '商品成本') row[col] = c.實際成本;
      else if (col === '售價') row[col] = price;
      else if (col.includes('蝦皮') && col.includes('成本')) row[col] = c.蝦皮總成本;
      else if (col.startsWith('稅金') || col === '稅金') row[col] = c.稅金;
      else if (col.includes('廣告') && !col.includes('ROAS')) row[col] = c.廣告;
      else if (col.includes('運費+包材')) row[col] = c.固定;
      else if (col.includes('成交手續費')) row[col] = c.成交;
      else if (col.includes('活動服務費')) row[col] = c.活動;
      else if (col === '退貨率') row[col] = c.退貨;
      else if (col.includes('入帳金額')) row[col] = c.入帳;
      else if (col.includes('銷項稅金')) row[col] = c.銷項稅金;
      else if (col.includes('實際毛利')) row[col] = c.實際毛利;
      else if (col.includes('獲利百分比') || col === 'ROI') row[col] = c.獲利百分比;
      else if (col.includes('以下)') || col === '成本') row[col] = c.成本率;
      else if (col.includes('ROAS')) row[col] = roas || null;
      else if (col === '月銷量') row[col] = volume || null;
      else if (col === '進貨') row[col] = (sheet === 'Victor') ? (website || '') : (volume || null);
      else if (col === '網站') row[col] = website || '';
      else if (col.includes('淨利潤')) row[col] = c.淨利潤;
      else if (col.includes('預估投入')) row[col] = c.預估投入;
      else if (col === '網站') row[col] = website || '';
      else if (col === '賣場') row[col] = store || '';
      else if (col === '備註' || col === '行銷方法') row[col] = note || '';
    }
    return row;
  },

  _prColType(col, sheet) {
    if (col.includes('ROAS')) return 'roas';
    if (col.includes('百分比') || col === 'ROI' || col.includes('退貨率') || col.includes('以下)') || col === '成本率') return 'pct';
    if (col === '進貨' && sheet === 'Victor') return 'link';
    if (/月銷量|^進貨$|^數量$|^箱數$|^重量$/.test(col)) return 'count';
    if (col.includes('網站') || col.includes('連結')) return 'link';
    // 人民幣欄位：原始成本、陸內運費、陸>台運費
    if (col.includes('原始成本') || col.includes('陸〉陸') || col.includes('陸>陸')) return 'rmb';
    if (col.includes('陸>台')) return 'wtfreight'; // 單品重量(kg) × 9 = 陸>台運費
    if (['成本','售價','毛利','利潤','金額','入帳','稅金','廣告','運費','手續費','服務費','投入','報關','平均'].some(k => col.includes(k)) && !col.includes('ROAS')) return 'money';
    return 'text';
  },

  _prFmt(val, type) {
    if (val === null || val === undefined || val === '') return '<span style="color:#d1d5db">—</span>';
    if (type === 'pct') {
      const n = parseFloat(val);
      if (isNaN(n)) return escapeHtml(String(val));
      const pv = (Math.abs(n) < 5 ? (n * 100) : n).toFixed(1) + '%';
      const c = n >= (Math.abs(n) < 5 ? 0.2 : 20) ? '#059669' : n >= 0 ? '#f59e0b' : '#dc2626';
      return `<span style="color:${c};font-weight:700">${pv}</span>`;
    }
    if (type === 'roas') {
      const n = parseFloat(val);
      return isNaN(n) ? escapeHtml(String(val)) : `<span style="font-weight:600">${n.toFixed(2)}</span>`;
    }
    if (type === 'count') {
      const n = Number(val);
      return isNaN(n) ? escapeHtml(String(val)) : n.toLocaleString();
    }
    if (type === 'money') {
      const n = parseFloat(val);
      if (isNaN(n)) return escapeHtml(String(val));
      return `NT$${n.toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:2})}`;
    }
    if (type === 'rmb') {
      const n = parseFloat(val);
      if (isNaN(n)) return escapeHtml(String(val));
      return `¥${n.toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:2})}`;
    }
    if (type === 'wtfreight') {
      const n = parseFloat(val);
      if (isNaN(n)) return escapeHtml(String(val));
      // 陸>台運費 ¥/kg × 匯率 = NT$/kg；預設 9¥/kg × 4.5 = 40.5 NT$/kg
      const freight = Math.round(n * 9 * 4.5 * 100) / 100;
      return `NT$${freight.toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:2})}<span style="color:#9ca3af;font-size:10px;margin-left:3px">(${n}kg)</span>`;
    }
    if (type === 'link') {
      const s = String(val).trim();
      return s ? `<a href="${escapeHtml(s)}" target="_blank" rel="noopener" style="color:#ea580c;font-size:11px;font-weight:600">🔗</a>` : '<span style="color:#d1d5db">—</span>';
    }
    return `<span>${escapeHtml(String(val))}</span>`;
  },

  // 核心欄位（主表顯示）— 名稱欄固定排第一
  _prGetVisibleCols(allCols, sheet) {
    const cleanCols = allCols.filter(c => !c.startsWith('__'));
    const saved = Store.get(`ec.d2.pricing.cols.${sheet}`, null);
    if (!saved) return cleanCols;
    const allSet = new Set(cleanCols);
    const savedOrder = (saved.order || []).filter(c => allSet.has(c));
    const newCols = cleanCols.filter(c => !savedOrder.includes(c));
    const fullOrder = [...savedOrder, ...newCols];
    const hiddenSet = new Set(saved.hidden || []);
    return fullOrder.filter(c => !hiddenSet.has(c));
  },

  _prColPanelHtml(allCols, sheet) {
    const cleanCols = allCols.filter(c => !c.startsWith('__'));
    const saved = Store.get(`ec.d2.pricing.cols.${sheet}`, null);
    const savedOrder = (saved?.order || []).filter(c => cleanCols.includes(c));
    const newCols = cleanCols.filter(c => !savedOrder.includes(c));
    const fullOrder = [...savedOrder, ...newCols];
    const hiddenSet = new Set(saved?.hidden || []);
    const panelOpen = Store.get('ec.d2.pricing.colpanel', false);
    return `<div id="pr-col-panel" style="display:${panelOpen?'block':'none'};padding:12px 16px;background:#f8fafc;border-bottom:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px">欄位顯示與排序 <span style="font-weight:400;color:#9ca3af">拖曳排序・勾選顯示</span></div>
      <div id="pr-col-list" style="display:flex;flex-wrap:wrap;gap:6px;max-width:900px">
        ${fullOrder.map(c => `<div class="pr-col-item" data-col="${escapeHtml(c)}" draggable="true"
          style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;border:1px solid ${hiddenSet.has(c)?'#e5e7eb':'#2563eb'};background:${hiddenSet.has(c)?'#fff':'#eff6ff'};color:${hiddenSet.has(c)?'#9ca3af':'#2563eb'};font-size:12px;cursor:grab;user-select:none">
          <input type="checkbox" class="pr-col-check" data-col="${escapeHtml(c)}" ${hiddenSet.has(c)?'':'checked'} style="cursor:pointer;accent-color:#2563eb;width:13px;height:13px">
          <span>${escapeHtml(c)}</span><span style="color:#d1d5db;font-size:10px;margin-left:2px">⠿</span>
        </div>`).join('')}
      </div>
      <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
        <button id="pr-col-reset" style="padding:4px 12px;border:1px solid #e5e7eb;border-radius:5px;font-size:12px;cursor:pointer;background:#fff">重置預設</button>
        <span style="font-size:11px;color:#9ca3af">變更即時生效</span>
      </div>
    </div>`;
  },

  _prCoreCols(cols) {
    const NAME_FIRST = ['產品名稱','試算名稱','編號'];
    const OTHERS = new Set(['實際成本','商品成本','售價','賣場','備註','行銷方法','網站']);
    const CONTAINS = ['獲利百分比'];
    const nameCol = NAME_FIRST.find(n => cols.includes(n));
    const rest = cols.filter(c => (OTHERS.has(c) || CONTAINS.some(k => c.includes(k))) && !NAME_FIRST.includes(c));
    const core = nameCol ? [nameCol, ...rest] : rest;
    return core.length >= 2 ? core : cols.filter(c => !c.startsWith('__')).slice(0, 5);
  },

  _prNumFilterPanelHtml(coreCols, coreTypes, sheet) {
    const NUMERIC_TYPES = new Set(['pct','money','count','roas','rmb','wtfreight']);
    const numCols = coreCols.filter((c, i) => NUMERIC_TYPES.has(coreTypes[i]));
    if (!numCols.length) return '';
    const filters = Store.get(`ec.d2.pricing.numfilters.${sheet}`, {});
    const panelOpen = Store.get('ec.d2.pricing.filterpanel', false);
    const shortLabel = c => {
      if (c.includes('獲利百分比')) return '獲利%';
      if (c.includes('實際成本') || c === '商品成本') return '實際成本';
      return c;
    };
    const activeCount = Object.keys(filters).length;
    return `<div id="pr-filter-panel" style="display:${panelOpen?'block':'none'};padding:12px 16px;background:#f8fafc;border-bottom:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px">數值範圍篩選 <span style="font-weight:400;color:#9ca3af">留空 = 不篩選・% 欄輸入數字如 20</span>${activeCount?`<span style="margin-left:8px;background:#dbeafe;color:#2563eb;font-size:11px;padding:2px 8px;border-radius:10px">${activeCount} 條件啟用中</span>`:''}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center">
        ${numCols.map(c => {
          const idx = coreCols.indexOf(c);
          const type = coreTypes[idx];
          const f = filters[c] || {};
          const unit = type === 'pct' ? '%' : type === 'money' ? 'NT$' : type === 'rmb' ? '¥' : '';
          const hasFilter = f.min !== undefined && f.min !== null && f.min !== '' || f.max !== undefined && f.max !== null && f.max !== '';
          return `<div style="display:flex;align-items:center;gap:5px">
            <span style="font-size:11px;font-weight:600;color:${hasFilter?'#2563eb':'#374151'}">${escapeHtml(shortLabel(c))}</span>
            <input class="pr-nf-min" data-col="${escapeHtml(c)}" value="${f.min??''}" placeholder="最小" style="width:64px;padding:3px 7px;border:1px solid ${hasFilter?'#2563eb':'#e5e7eb'};border-radius:5px;font-size:12px;text-align:right;font-family:inherit">
            <span style="font-size:11px;color:#9ca3af">～</span>
            <input class="pr-nf-max" data-col="${escapeHtml(c)}" value="${f.max??''}" placeholder="最大" style="width:64px;padding:3px 7px;border:1px solid ${hasFilter?'#2563eb':'#e5e7eb'};border-radius:5px;font-size:12px;text-align:right;font-family:inherit">
            ${unit?`<span style="font-size:11px;color:#9ca3af">${unit}</span>`:''}
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
        <button id="pr-nf-reset" style="padding:4px 12px;border:1px solid #e5e7eb;border-radius:5px;font-size:12px;cursor:pointer;background:#fff">清除全部</button>
        <span style="font-size:11px;color:#9ca3af">變更即時生效</span>
      </div>
    </div>`;
  },

  _prAddFormHtml(sheet) {
    const p = this.PRICING_SHEET_PARAMS[sheet] || this.PRICING_SHEET_PARAMS['訂價'];
    const inp = (id, label, type='number', placeholder='', unit='') =>
      `<label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#6b7280;font-weight:600">
        ${label}${unit?`<span style="color:#9ca3af;font-weight:400;font-size:10px">${unit}</span>`:''}
        <input id="${id}" type="${type}" placeholder="${placeholder}"
          style="padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;text-align:${type==='number'?'right':'left'}">
      </label>`;
    const readOnly = (id, label, color='#2563eb') =>
      `<label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:#6b7280;font-weight:600">
        ${label}
        <div id="${id}" style="padding:7px 10px;border:1px solid #dbeafe;border-radius:6px;font-size:13px;font-weight:700;color:${color};background:#eff6ff;text-align:right;min-height:34px">—</div>
      </label>`;
    return `
    <div id="pr-add-form" style="display:none;padding:16px;background:#eff6ff;border-bottom:2px solid #059669">
      <div style="font-size:11px;color:#6b7280;margin-bottom:10px">費率：匯率 ${p.rmb}、陸>台運費 ${p.ship}¥/kg（≈NT$${p.ship*p.rmb}/kg）${p.ads?'、廣告 '+p.ads*100+'%':''}${p.tax?'、稅 '+p.tax*100+'%':''}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;align-items:start">
        ${inp('pf-name','產品名稱','text','請輸入商品名稱')}
        ${inp('pf-note','備註','text','')}
        ${inp('pf-website','網站連結','text','https://...')}
        <div></div>

        ${inp('pf-orig','原始成本','number','0','¥ 人民幣')}
        ${inp('pf-land','陸〉陸運費','number','0','¥ 人民幣')}
        ${inp('pf-weight','單品重量','number','0','kg')}
        ${readOnly('pc-cost','▶ 實際成本（自動）')}

        ${inp('pf-price','售價','number','0','NT$')}
        ${readOnly('pc-pct','▶ 獲利百分比（自動）','#059669')}
        ${readOnly('pc-profit','▶ 實際毛利（自動）')}
        ${readOnly('pc-income','▶ 入帳金額（自動）','#374151')}

        ${readOnly('pc-roas','▶ 廣告ROAS（自動）')}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="pr-form-save" style="padding:8px 20px;background:#059669;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
        <button id="pr-form-cancel" style="padding:8px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
      </div>
      <!-- 隱藏欄位供 _updatePreview 使用（不顯示但存值） -->
      <span id="pc-ship" style="display:none"></span>
      <span id="pc-tax" style="display:none"></span>
      <span id="pc-ads" style="display:none"></span>
      <span id="pc-fixed" style="display:none"></span>
      <span id="pc-tx" style="display:none"></span>
      <span id="pc-promo" style="display:none"></span>
      <span id="pc-ret" style="display:none"></span>
      <span id="pc-platform" style="display:none"></span>
      <span id="pc-inctax" style="display:none"></span>
      <span id="pc-costratio" style="display:none"></span>
    </div>`;
  },

  renderD2PricingTabHtml() {
    const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
    const q = Store.get('ec.d2.pricing.q', '');
    const loaded = !!window.__pricingData;

    const sheetTabs = this.PRICING_SHEETS_ORDER.map(s => {
      const cnt = loaded ? (window.__pricingData[s] || []).length : 0;
      const active = s === activeSheet;
      return `<button class="pr-stab" data-s="${s}" style="padding:5px 14px;border-radius:20px;border:1px solid ${active?'#2563eb':'#e5e7eb'};background:${active?'#2563eb':'#fff'};color:${active?'#fff':'#374151'};font-size:12px;font-weight:${active?'700':'400'};cursor:pointer;white-space:nowrap">${s}${loaded?` <span style="opacity:.6;font-size:11px">${cnt}</span>`:''}</button>`;
    }).join('');

    if (!loaded) {
      return `<div class="table-card">
        <div class="table-card-header"><div><h3>💹 訂價表</h3><p>蝦皮 / FB 商品訂價與利潤分析</p></div></div>
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap">${sheetTabs}</div>
        <div style="padding:40px;text-align:center;color:#9ca3af;font-size:13px">載入中…</div></div>`;
    }

    const sheetData = window.__pricingData[activeSheet] || [];
    // NT$ 成本分頁（非商品母表）自動補算展示欄，不修改原始資料
    const NT_SHEETS = ['生活好麻吉','玩樂盒子','森之旅','維克生活館','MOMO','FRIDAY'];
    const _needsCalc = NT_SHEETS.includes(activeSheet);
    let displayData = sheetData;
    if (_needsCalc) {
      const _rates0 = this._prGetRates(activeSheet);
      const CALC_EXTRA = ['實際成本','蝦皮總成本','入帳金額','實際毛利','獲利百分比','成本率'];
      const _refHasCalc = sheetData.find(r => !r.__custom && r['實際成本'] !== undefined);
      if (!_refHasCalc) {
        displayData = sheetData.map(r => {
          const ntc = +r['成本'] || 0;
          const pr  = +r['單品售價'] || 0;
          const oc  = ntc / (_rates0.rmb || 32);
          const c   = this._prCalcAll(activeSheet, oc, 0, 0, pr, 0, 0);
          return { ...r,
            稅金: c.稅金, 成交手續費: c.成交, 活動服務費: c.活動, 退貨率: c.退貨,
            實際成本: c.實際成本, 蝦皮總成本: c.蝦皮總成本, 入帳金額: c.入帳,
            實際毛利: c.實際毛利, 獲利百分比: c.獲利百分比, 成本率: c.成本率 };
        });
      }
    }
    // 優先從非自訂的 Excel 列取欄位順序，避免自訂列 key 順序不一致
    const refRow = displayData.find(r => !r.__custom) || displayData[0];
    const baseCols = refRow ? Object.keys(refRow).filter(k => !k.startsWith('__')) : [];
    // 合併自訂列可能新增的欄（例如 Victor 的「進貨」URL 欄）
    const customExtraCols = displayData.filter(r => r.__custom).flatMap(r => Object.keys(r).filter(k => !k.startsWith('__') && !baseCols.includes(k)));
    const allCols = [...baseCols, ...new Set(customExtraCols)];
    const coreCols = this._prGetVisibleCols(allCols, activeSheet);
    const coreTypes = coreCols.map(c => this._prColType(c, activeSheet));

    const sort = Store.get(`ec.d2.pricing.sort.${activeSheet}`, null);
    const numFilters = Store.get(`ec.d2.pricing.numfilters.${activeSheet}`, {});
    const _numVal = (val, type) => {
      if (val === null || val === undefined || val === '') return null;
      const n = parseFloat(val);
      if (isNaN(n)) return null;
      return type === 'pct' ? (Math.abs(n) < 5 ? n * 100 : n) : n;
    };

    let filteredWithIdx = q
      ? displayData.map((r, i) => ({ r, i })).filter(({ r }) => String(r['產品名稱'] || r['試算名稱'] || r['商品名稱'] || Object.values(r)[0] || '').toLowerCase().includes(q.toLowerCase()))
      : displayData.map((r, i) => ({ r, i }));

    // 套用數值範圍篩選
    const activeNumFilters = Object.entries(numFilters).filter(([, f]) =>
      (f.min !== '' && f.min !== null && f.min !== undefined) || (f.max !== '' && f.max !== null && f.max !== undefined));
    if (activeNumFilters.length) {
      filteredWithIdx = filteredWithIdx.filter(({ r }) =>
        activeNumFilters.every(([c, f]) => {
          const v = _numVal(r[c], this._prColType(c, activeSheet));
          if (v === null) return false;
          if (f.min !== '' && f.min !== null && f.min !== undefined && v < +f.min) return false;
          if (f.max !== '' && f.max !== null && f.max !== undefined && v > +f.max) return false;
          return true;
        })
      );
    }
    // 套用排序
    if (sort?.col) {
      const sortType = this._prColType(sort.col, activeSheet);
      filteredWithIdx = [...filteredWithIdx].sort((a, b) => {
        const av = _numVal(a.r[sort.col], sortType) ?? (sort.dir === 'asc' ? Infinity : -Infinity);
        const bv = _numVal(b.r[sort.col], sortType) ?? (sort.dir === 'asc' ? Infinity : -Infinity);
        return sort.dir === 'asc' ? av - bv : bv - av;
      });
    }

    const display = filteredWithIdx;

    const NAME_COLS = new Set(['產品名稱','試算名稱','編號']);
    // 縮短過長的欄位標題顯示
    const shortLabel = c => {
      if (c.includes('獲利百分比')) return '獲利%';
      if (c.includes('實際成本') || c === '商品成本') return '實際成本';
      return c;
    };
    // 欄位寬度（固定佈局用）
    const colWidth = c => {
      if (NAME_COLS.has(c)) return '35%';
      if (c === '售價') return '10%';
      if (c.includes('實際成本') || c === '商品成本') return '12%';
      if (c.includes('獲利百分比') || c === 'ROI') return '10%';
      return '11%';
    };
    const colMinWidth = c => NAME_COLS.has(c) ? '180px' : '90px';
    const SORTABLE_TYPES = new Set(['pct','money','count','roas','rmb','wtfreight']);
    const theadHtml = coreCols.map((c, ci) => {
      const isSortable = SORTABLE_TYPES.has(coreTypes[ci]);
      const isActive = sort?.col === c;
      const arrow = isActive ? (sort.dir === 'asc' ? '↑' : '↓') : '';
      const sortAttr = isSortable ? ` data-sort-col="${escapeHtml(c)}"` : '';
      const activeBg = isActive ? 'background:#eff6ff;color:#2563eb;' : '';
      const indicator = arrow
        ? `<span style="color:#2563eb;margin-left:3px">${arrow}</span>`
        : isSortable ? `<span style="color:#d1d5db;margin-left:2px;font-size:10px">⇅</span>` : '';
      return `<th${sortAttr} style="${activeBg}${isSortable?'cursor:pointer;':''}font-size:12px;padding:6px 10px;font-weight:600;text-align:${NAME_COLS.has(c)?'left':'right'};min-width:${colMinWidth(c)};white-space:nowrap">${escapeHtml(shortLabel(c))}${indicator}</th>`;
    }).join('') + '<th style="min-width:32px"></th>';

    const _td = (c) => `font-size:13px;padding:6px 10px;${NAME_COLS.has(c)?'text-align:left;max-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap':'text-align:right'}`;
    const useGrouping = activeSheet !== '商品母表' && display.length > 0 && display[0].r['商品名稱'] !== undefined;
    let tbodyHtml;
    if (!useGrouping) {
      tbodyHtml = display.map(({ r, i }) => {
        const isCustom = !!r.__custom;
        return `<tr class="pr-row" data-i="${i}" data-id="${r.__id||''}" style="border-bottom:1px solid #f3f4f6;cursor:pointer${isCustom?';background:#eff6ff':''}">` +
          coreCols.map((c, ci) => `<td style="${_td(c)}">${this._prFmt(r[c], coreTypes[ci])}</td>`).join('') +
          `<td style="text-align:center;padding:6px 4px">${isCustom?`<button class="pr-del-custom" data-id="${r.__id||''}" data-i="${i}" style="background:none;border:0;cursor:pointer;color:#f87171;font-size:13px;padding:0" title="刪除">🗑</button>`:'<span style="color:#d1d5db;font-size:11px">›</span>'}</td></tr>`;
      }).join('');
    } else {
      // 所有商品統一為群組標題列，標題顯示售價/毛利摘要，版面整齊一致
      const _nc = '商品名稱';
      const _grps = []; const _gm = new Map();
      for (const item of display) {
        const k = item.r[_nc] || ('__' + item.i);
        if (!_gm.has(k)) { const g = { k, items:[] }; _grps.push(g); _gm.set(k, g); }
        _gm.get(k).items.push(item);
      }
      const _priceCol  = coreCols.find(c => c === '單品售價');
      const _costCol   = coreCols.find(c => c === '成本');
      const _marginCol = coreCols.find(c => c === '實際毛利');
      const _pctCol    = coreCols.find(c => c === '獲利百分比');
      const _summaryTd = (col, items, style) => {
        if (!col) return `<td style="${style}"></td>`;
        const ci = coreCols.indexOf(col);
        const vals = items.map(({r}) => parseFloat(r[col])).filter(v => !isNaN(v));
        if (!vals.length) return `<td style="${style}"></td>`;
        const mn = Math.min(...vals), mx = Math.max(...vals);
        const fmt = v => this._prFmt(v, coreTypes[ci]);
        return `<td style="${style};color:#6b7280">${mn === mx ? fmt(mn) : fmt(mn)+'～'+fmt(mx)}</td>`;
      };
      tbodyHtml = _grps.map(({ k, items }) => {
        const kA = k.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
        const kE = escapeHtml(k);
        const count = items.length;
        const isCustomGroup = items.every(({r}) => r.__custom);
        // 群組標題：個別 td，商品名稱欄顯示 ▶ + 名稱，其餘欄顯示摘要數值
        const hdr = `<tr class="pr-group-hdr" data-grp="${kA}" style="border-bottom:1px solid #e5e7eb;cursor:pointer${isCustomGroup?';background:#eff6ff':''}">` +
          coreCols.map((c, ci) => {
            const s = _td(c);
            if (c === _nc) return `<td style="${s}"><span class="pr-grp-arr" style="display:inline-block;margin-right:6px;font-size:10px;color:#6b7280;transition:transform .15s">▶</span><strong style="font-weight:600">${kE}</strong>${count>1?`<span style="font-size:11px;color:#9ca3af;margin-left:8px;font-weight:400">${count} 種規格</span>`:''}</td>`;
            if (c === _priceCol || c === _costCol || c === _marginCol || c === _pctCol) return `<td style="${s}"></td>`;
            return `<td style="${s}"></td>`;
          }).join('') + `<td></td></tr>`;
        const rows = items.map(({ r, i }) => {
          const isCustom = !!r.__custom;
          return `<tr class="pr-row pr-child" data-grp="${kA}" data-i="${i}" data-id="${r.__id||''}" hidden style="border-bottom:1px solid #f3f4f6;cursor:pointer;background:${isCustom?'#eff6ff':'#f8fafc'}">` +
            coreCols.map((c, ci) => `<td style="${_td(c)}">${this._prFmt(r[c], coreTypes[ci])}</td>`).join('') +
            `<td style="text-align:center;padding:6px 4px">${isCustom?`<button class="pr-del-custom" data-id="${r.__id||''}" data-i="${i}" style="background:none;border:0;cursor:pointer;color:#f87171;font-size:13px;padding:0" title="刪除">🗑</button>`:'<span style="color:#d1d5db;font-size:11px">›</span>'}</td></tr>`;
        }).join('');
        return hdr + rows;
      }).join('');
    }

    const moreHtml = '';

    return `<div class="table-card">
      <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div><h3>💹 訂價表</h3><p>蝦皮 / FB 商品訂價與利潤分析</p></div>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="pr-search" value="${escapeHtml(q)}" placeholder="搜尋商品名稱…" style="padding:7px 12px;border:1px solid var(--border);border-radius:7px;font-size:13px;min-width:160px;font-family:inherit">
          <button id="pr-rates-btn" style="padding:7px 14px;background:var(--bg);border:1px solid var(--border);border-radius:7px;font-size:13px;cursor:pointer;color:var(--text)">⚙ 費率</button>
          <button id="pr-add-btn" style="padding:7px 16px;background:#059669;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap">＋ 新增</button>
        </div>
      </div>
      <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap;overflow-x:auto">${sheetTabs}</div>
      <div style="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center">
        <button id="pr-col-btn" style="padding:5px 14px;background:var(--bg);border:1px solid var(--border);border-radius:7px;font-size:13px;cursor:pointer;color:var(--text)">☰ 欄位</button>
        <button id="pr-filter-btn" style="padding:5px 14px;background:${Object.keys(numFilters).length?'#dbeafe':'var(--bg)'};border:1px solid ${Object.keys(numFilters).length?'#2563eb':'var(--border)'};border-radius:7px;font-size:13px;cursor:pointer;color:${Object.keys(numFilters).length?'#2563eb':'var(--text)'}">⊟ 範圍${sort?.col?` · ⇅`:''}${Object.keys(numFilters).length?` (${Object.keys(numFilters).length})`:''}</button>
      </div>
      ${this._prRatesFormHtml()}
      ${this._prColPanelHtml(allCols, activeSheet)}
      ${this._prNumFilterPanelHtml(coreCols, coreTypes, activeSheet)}
      ${this._prAddFormHtml(activeSheet)}
      <div style="padding:6px 16px;font-size:11px;color:#9ca3af;border-bottom:1px solid #f3f4f6">${activeSheet} · ${filteredWithIdx.length} 筆 · 點列展開全部欄位 · 綠底為手動新增</div>
      <div class="table-wrap" style="max-height:calc(100vh - 380px);overflow-y:auto;overflow-x:auto"><table style="width:100%">
        <thead style="position:sticky;top:0;z-index:2;background:#f9fafb"><tr>${theadHtml}</tr></thead>
        <tbody id="pr-tbody">${tbodyHtml}</tbody>
      </table></div>
      <style>#pr-tbody tr.pr-group-hdr td { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }</style>
      ${moreHtml}
    </div>`;
  },

  bindD2PricingTab() {
    const self = this;

    // 自動載入
    if (!window.__pricingData) {
      (async () => {
        try {
          const ver = document.querySelector('meta[name="app-version"]')?.content || '';
          const res = await fetch(`data/pricing.json?v=${ver}`);
          window.__pricingData = await res.json();
          self.render();
        } catch(e) { console.error('pricing.json 載入失敗：', e); }
      })();
    }

    document.getElementById('pr-load-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('pr-load-btn');
      if (btn) btn.textContent = '載入中…';
      try {
        const ver = document.querySelector('meta[name="app-version"]')?.content || '';
        const res = await fetch(`data/pricing.json?v=${ver}`);
        window.__pricingData = await res.json();
        self.render();
      } catch(e) { alert('載入失敗：' + e.message); }
    });


    document.querySelectorAll('.pr-stab').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.set('ec.d2.pricing.sheet', btn.dataset.s);
        Store.set('ec.d2.pricing.q', '');
        self.render();
      });
    });

    document.getElementById('pr-search')?.addEventListener('input', e => {
      if (e.isComposing) return; // 注音/倉頡組字中，等確認後再搜尋
      Store.set('ec.d2.pricing.q', e.target.value);
      self.render();
    });
    document.getElementById('pr-search')?.addEventListener('compositionend', e => {
      Store.set('ec.d2.pricing.q', e.target.value);
      self.render();
    });

    // 展開/收合群組（生活好麻吉等分頁）— 狀態存入 window.__prOpenGrps 跨 render 保留
    if (!window.__prOpenGrps) window.__prOpenGrps = new Set();
    // 重繪後恢復已展開的群組
    const tbody0 = document.getElementById('pr-tbody');
    if (tbody0) {
      Array.from(tbody0.rows).forEach(tr => {
        if (!tr.classList.contains('pr-group-hdr')) return;
        const grp = tr.getAttribute('data-grp');
        if (window.__prOpenGrps.has(grp)) {
          tr.dataset.open = '1';
          tr.style.background = '#eff6ff';
          const arr = tr.querySelector('.pr-grp-arr');
          if (arr) arr.style.transform = 'rotate(90deg)';
          Array.from(tbody0.rows).filter(r => r.classList.contains('pr-child') && r.getAttribute('data-grp') === grp)
            .forEach(r => r.removeAttribute('hidden'));
        }
      });
    }
    document.getElementById('pr-tbody')?.addEventListener('click', e => {
      const hdr = e.target.closest('tr.pr-group-hdr');
      if (!hdr) return;
      e.stopPropagation();
      const grp = hdr.getAttribute('data-grp');
      const tbody = document.getElementById('pr-tbody');
      const kids = Array.from(tbody.rows).filter(tr => tr.classList.contains('pr-child') && tr.getAttribute('data-grp') === grp);
      const open = hdr.dataset.open !== '1';
      hdr.dataset.open = open ? '1' : '0';
      hdr.style.background = open ? '#eff6ff' : '';
      const arr = hdr.querySelector('.pr-grp-arr');
      if (arr) arr.style.transform = open ? 'rotate(90deg)' : '';
      kids.forEach(tr => open ? tr.removeAttribute('hidden') : tr.setAttribute('hidden',''));
      if (open) window.__prOpenGrps.add(grp); else window.__prOpenGrps.delete(grp);
    });

    // 點列展開內聯編輯（事件委派）
    document.getElementById('pr-tbody')?.addEventListener('click', e => {
      if (e.target.closest('button.pr-del-custom') || e.target.closest('a')) return;
      const tr = e.target.closest('tr.pr-row');
      if (!tr) return;
      const idx = +tr.dataset.i;
      const detId = `pr-det-${idx}`;
      const existing = document.getElementById(detId);
      if (existing) { existing.remove(); tr.style.background = tr.dataset.custom==='1'?'#eff6ff':''; return; }
      document.querySelectorAll('.pr-detail-row').forEach(el => el.remove());
      document.querySelectorAll('tr.pr-row').forEach(el => el.style.background = el.dataset.custom==='1'?'#eff6ff':'');

      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      const sheetData = window.__pricingData?.[activeSheet] || [];
      const r = sheetData[idx];
      if (!r) return;

      const cols = Object.keys(r).filter(c => !c.startsWith('__'));
      const isMotherSheet = activeSheet === '商品母表';
      const nameCol2 = cols.find(c => c === '產品名稱' || c === '試算名稱') || null;
      const skuCol   = (isMotherSheet || cols.includes('商品編號')) ? '商品編號' : null;
      const barcodeCol = (isMotherSheet || cols.includes('品項條碼')) ? '品項條碼' : null;
      const styleCol = (isMotherSheet || cols.includes('樣式')) ? '樣式' : null;
      const sizeCol  = (isMotherSheet || cols.includes('尺寸')) ? '尺寸' : null;
      const origCostCol = cols.find(c => c === '原始成本') || null;
      const ntCostCol = cols.find(c => c === '成本') || null;          // NT$ 成本（新格式）
      const landCol = cols.find(c => c.includes('陸〉陸') || c.includes('陸>陸')) || null;
      const weightCol = cols.find(c => c.includes('陸>台') || c.includes('陸〉台')) || null;
      const priceCol = cols.find(c => c === '售價' || c === '單品售價') || null;
      const roasCol = cols.find(c => c.includes('ROAS')) || null;
      const volCol = cols.find(c => c === '月銷量') || null;
      const noteCol = cols.find(c => c === '備註' || c === '行銷方法') || null;
      const websiteCol = cols.find(c => c === '網站' || (c === '進貨' && activeSheet === 'Victor')) || null;
      // 是否為 NT$ 直接成本格式（無原始成本欄）
      const isNTCost = !origCostCol && !!ntCostCol;

      const txtInp = (id, label, val, w) =>
        `<label style="display:flex;flex-direction:column;gap:3px">
          <span style="font-size:10px;color:#6b7280;font-weight:600">${label}</span>
          <input id="pe-${id}" type="text" value="${escapeHtml(String(val??''))}" style="padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;width:${w||'110px'}">
        </label>`;
      const numInp = (id, label, val, unit) =>
        `<label style="display:flex;flex-direction:column;gap:3px">
          <span style="font-size:10px;color:#6b7280;font-weight:600">${label}${unit?` <span style="color:#9ca3af;font-weight:400">${unit}</span>`:''}</span>
          <input id="pe-${id}" type="number" value="${val??''}" style="padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit;text-align:right;width:110px">
        </label>`;
      const calcBox = (id, label) =>
        `<div style="display:flex;flex-direction:column;gap:3px">
          <span style="font-size:10px;color:#6b7280;font-weight:600">${label}</span>
          <div id="pe-c-${id}" style="padding:7px 10px;border:1px solid #dbeafe;border-radius:6px;font-size:13px;font-weight:700;color:#2563eb;background:#eff6ff;text-align:right;min-width:90px;min-height:34px">—</div>
        </div>`;

      const colspan = tr.querySelectorAll('td').length;
      const detTr = document.createElement('tr');
      detTr.id = detId;
      detTr.className = 'pr-detail-row';
      detTr.innerHTML = `<td colspan="${colspan}" style="padding:14px;background:#f8fafc;border-bottom:2px solid #2563eb">
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">
          ${skuCol    ? txtInp('sku',     '商品編號', r[skuCol],    '120px') : ''}
          ${nameCol2  ? txtInp('name',    '產品名稱', r[nameCol2],  '200px') : ''}
          ${barcodeCol? txtInp('barcode', '品項條碼', r[barcodeCol],'130px') : ''}
          ${styleCol  ? txtInp('style',   '樣式',     r[styleCol],  '100px') : ''}
          ${sizeCol   ? txtInp('size',    '尺寸',     r[sizeCol],   '100px') : ''}
          ${(skuCol||nameCol2||barcodeCol||styleCol||sizeCol) ? `<div style="width:1px;background:#e5e7eb;align-self:stretch;margin:0 4px"></div>` : ''}
          ${isNTCost  ? numInp('ntcost','成本',        r[ntCostCol], 'NT$') : ''}
          ${origCostCol ? numInp('orig','原始成本',    r[origCostCol],'¥') : ''}
          ${landCol     ? numInp('land','陸〉陸運費',  r[landCol],'¥') : ''}
          ${weightCol   ? numInp('wt',  '重量',        r[weightCol],'kg') : ''}
          ${priceCol    ? numInp('price','售價',        r[priceCol],'NT$') : ''}
          ${roasCol     ? numInp('roas','ROAS',         r[roasCol],'') : numInp('roas','ROAS','','')}
          ${volCol      ? numInp('vol', '月銷量',       r[volCol],'件') : numInp('vol','月銷量','','件')}
          <div style="width:1px;background:#e5e7eb;align-self:stretch;margin:0 4px"></div>
          ${calcBox('cost','▶ 實際成本')}
          ${calcBox('total','▶ 蝦皮總成本')}
          ${calcBox('income','▶ 入帳')}
          ${calcBox('margin','▶ 實際毛利')}
          ${calcBox('pct','▶ 獲利%')}
          ${calcBox('cr','▶ 成本%')}
          ${calcBox('adcost','▶ 廣告費')}
          ${calcBox('net','▶ 淨利潤')}
          ${websiteCol ? `<label style="display:flex;flex-direction:column;gap:3px">
            <span style="font-size:10px;color:#6b7280;font-weight:600">網站</span>
            <input id="pe-web" type="text" value="${escapeHtml(String(r[websiteCol]||''))}" placeholder="https://..." style="padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;width:180px">
          </label>` : ''}
          ${noteCol ? `<label style="display:flex;flex-direction:column;gap:3px">
            <span style="font-size:10px;color:#6b7280;font-weight:600">備註</span>
            <input id="pe-note" type="text" value="${escapeHtml(String(r[noteCol]||''))}" placeholder="備註" style="padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;width:150px">
          </label>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap">
          <button id="pe-save-${idx}" style="padding:7px 20px;background:#2563eb;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
          <button id="pe-cancel-${idx}" style="padding:7px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          <span style="font-size:11px;color:#9ca3af">輸入後自動試算</span>
          ${activeSheet === '商品母表' ? `
          <div style="width:1px;background:#e5e7eb;align-self:stretch;margin:0 4px"></div>
          <span style="font-size:11px;color:#6b7280">加入分頁：</span>
          <button data-copy-sheet="生活好麻吉" id="pe-copy-s0-${idx}" style="padding:7px 14px;background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">＋ 生活好麻吉</button>
          <button data-copy-sheet="玩樂盒子"  id="pe-copy-s1-${idx}" style="padding:7px 14px;background:#fef9c3;color:#b45309;border:1px solid #fde68a;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">＋ 玩樂盒子</button>
          <button data-copy-sheet="森之旅"    id="pe-copy-s2-${idx}" style="padding:7px 14px;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">＋ 森之旅</button>
          <button data-copy-sheet="維克生活館" id="pe-copy-s3-${idx}" style="padding:7px 14px;background:#fdf4ff;color:#7e22ce;border:1px solid #e9d5ff;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">＋ 維克生活館</button>
          <button data-copy-sheet="MOMO"      id="pe-copy-s4-${idx}" style="padding:7px 14px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">＋ MOMO</button>
          <button data-copy-sheet="FRIDAY"    id="pe-copy-s5-${idx}" style="padding:7px 14px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">＋ FRIDAY</button>
          ` : ''}
        </div>
      </td>`;
      tr.after(detTr);
      tr.style.background = '#e0eaff';

      const _calcPreview = () => {
        const rates = self._prGetRates(activeSheet);
        let oc, lf = 0, wt = 0;
        if (isNTCost) {
          // NT$ 成本欄：反推 RMB origCost（陸運費、重量為 0）
          const ntc = parseFloat(document.getElementById('pe-ntcost')?.value) || +r[ntCostCol] || 0;
          oc = ntc / rates.rmb;
        } else {
          oc = parseFloat(document.getElementById('pe-orig')?.value) || (origCostCol ? +r[origCostCol] : 0);
          lf = parseFloat(document.getElementById('pe-land')?.value) || (landCol ? +r[landCol] : 0);
          wt = parseFloat(document.getElementById('pe-wt')?.value)   || (weightCol ? +r[weightCol] : 0);
        }
        const pr   = parseFloat(document.getElementById('pe-price')?.value) || (priceCol ? +r[priceCol] : 0);
        const roas = parseFloat(document.getElementById('pe-roas')?.value)  || (roasCol ? +r[roasCol] : 0);
        const vol  = parseFloat(document.getElementById('pe-vol')?.value)   || (volCol ? +r[volCol] : 0);
        const c = self._prCalcAll(activeSheet, oc, lf, wt, pr, roas, vol);
        const nt = v => v != null ? 'NT$'+v.toLocaleString('zh-TW',{maximumFractionDigits:1}) : '—';
        const pf = v => { const p=Math.round(v*10000)/100; const col=p>=20?'#059669':p>=0?'#f59e0b':'#dc2626'; return `<span style="color:${col}">${p.toFixed(1)}%</span>`; };
        const s = (id,h) => { const el=document.getElementById(`pe-c-${id}`); if(el) el.innerHTML=h; };
        s('cost',   nt(c.實際成本));
        s('total',  nt(c.蝦皮總成本));
        s('income', nt(c.入帳));
        s('margin', nt(c.實際毛利));
        s('pct',    pr>0 ? pf(c.獲利百分比) : '—');
        s('cr',     pr>0 ? pf(c.成本率) : '—');
        s('adcost', roas>0 ? nt(c.廣告) : '—');
        s('net',    vol>0 ? nt(c.淨利潤) : '—');
      };
      _calcPreview();
      ['pe-ntcost','pe-orig','pe-land','pe-wt','pe-price','pe-roas','pe-vol'].forEach(id =>
        document.getElementById(id)?.addEventListener('input', _calcPreview));

      document.getElementById(`pe-save-${idx}`)?.addEventListener('click', () => {
        const _rates2 = self._prGetRates(activeSheet);
        let oc, lf = 0, wt = 0;
        if (isNTCost) {
          const ntc = parseFloat(document.getElementById('pe-ntcost')?.value) || +r[ntCostCol] || 0;
          oc = ntc / _rates2.rmb;
        } else {
          oc = parseFloat(document.getElementById('pe-orig')?.value) || (origCostCol ? +r[origCostCol] : 0);
          lf = parseFloat(document.getElementById('pe-land')?.value) || (landCol ? +r[landCol] : 0);
          wt = parseFloat(document.getElementById('pe-wt')?.value)   || (weightCol ? +r[weightCol] : 0);
        }
        const pr = parseFloat(document.getElementById('pe-price')?.value) || (priceCol ? +r[priceCol] : 0);
        const name2   = document.getElementById('pe-name')?.value    ?? (nameCol2   ? r[nameCol2]   : '');
        const note    = document.getElementById('pe-note')?.value    ?? (noteCol    ? r[noteCol]    : '');
        const website = document.getElementById('pe-web')?.value     ?? (websiteCol ? r[websiteCol] : '');
        const sku2    = document.getElementById('pe-sku')?.value     ?? (skuCol     ? r[skuCol]     : '');
        const barcode2= document.getElementById('pe-barcode')?.value ?? (barcodeCol ? r[barcodeCol] : '');
        const style2  = document.getElementById('pe-style')?.value   ?? (styleCol   ? r[styleCol]   : '');
        const size2   = document.getElementById('pe-size')?.value    ?? (sizeCol    ? r[sizeCol]    : '');
        const c = self._prCalcAll(activeSheet, oc, lf, wt, pr, +(r['廣告ROAS']||0), +(r['月銷量']||0));
        const allSaveCols = skuCol ? [...new Set([...cols, '商品編號','品項條碼','樣式','尺寸'])] : cols;
        const newRow = { ...r };
        for (const col of allSaveCols) {
          if (col === '商品編號') newRow[col] = sku2;
          else if (col === '品項條碼') newRow[col] = barcode2;
          else if (col === '樣式') newRow[col] = style2;
          else if (col === '尺寸') newRow[col] = size2;
          else if (col === '成本' && isNTCost) newRow[col] = parseFloat(document.getElementById('pe-ntcost')?.value) || +r[ntCostCol] || 0;
          else if (col === '單品售價') newRow[col] = pr;
          else if (col === '原始成本') newRow[col] = oc;
          else if (col.includes('陸〉陸') || col.includes('陸>陸')) newRow[col] = lf;
          else if (col.includes('陸>台') || col.includes('陸〉台')) newRow[col] = wt;
          else if (col === '售價') newRow[col] = pr;
          else if (col === '實際成本' || col === '商品成本') newRow[col] = c.實際成本;
          else if (col.includes('蝦皮') && col.includes('成本')) newRow[col] = c.蝦皮總成本;
          else if (col.startsWith('稅金') || col === '稅金') newRow[col] = c.稅金;
          else if (col.includes('廣告') && !col.includes('ROAS')) newRow[col] = c.廣告;
          else if (col.includes('運費+包材')) newRow[col] = c.固定;
          else if (col.includes('成交手續費')) newRow[col] = c.成交;
          else if (col.includes('活動服務費')) newRow[col] = c.活動;
          else if (col === '退貨率') newRow[col] = c.退貨;
          else if (col.includes('入帳金額') || col === '入帳') newRow[col] = c.入帳;
          else if (col.includes('銷項稅金')) newRow[col] = c.銷項稅金;
          else if (col.includes('實際毛利')) newRow[col] = c.實際毛利;
          else if (col.includes('獲利百分比') || col === 'ROI') newRow[col] = c.獲利百分比;
          else if (col.includes('以下)') || col === '成本') newRow[col] = c.成本率;
          else if (col.includes('淨利潤')) newRow[col] = c.淨利潤;
          else if (col.includes('預估投入')) newRow[col] = c.預估投入;
          else if (col === '產品名稱' || col === '試算名稱') newRow[col] = name2;
          else if (col === '備註' || col === '行銷方法') newRow[col] = note;
          else if (col === '網站' || (col === '進貨' && activeSheet === 'Victor')) newRow[col] = website;
        }
        window.__pricingData[activeSheet][idx] = newRow;
        if (r.__custom) {
          const custom = Store.get(`ec.d2.pricing.custom.${activeSheet}`, []);
          const ci2 = custom.findIndex(cx => cx.__id === r.__id);
          if (ci2 >= 0) custom[ci2] = newRow; else custom.unshift(newRow);
          Store.set(`ec.d2.pricing.custom.${activeSheet}`, custom);
        }
        self.render();
      });
      document.getElementById(`pe-cancel-${idx}`)?.addEventListener('click', () => {
        detTr.remove(); tr.style.background = r.__custom?'#eff6ff':'';
      });

      if (activeSheet === '商品母表') {
        const _copyToSheet = (targetSheet, btn) => {
          const oc = parseFloat(document.getElementById('pe-orig')?.value) || (origCostCol ? +r[origCostCol] : 0);
          const lf = parseFloat(document.getElementById('pe-land')?.value) || (landCol ? +r[landCol] : 0);
          const wt = parseFloat(document.getElementById('pe-wt')?.value)   || (weightCol ? +r[weightCol] : 0);
          const pr = parseFloat(document.getElementById('pe-price')?.value) || (priceCol ? +r[priceCol] : 0);
          const c  = self._prCalcAll(activeSheet, oc, lf, wt, pr, 0, 0);
          const name2    = document.getElementById('pe-name')?.value    || (nameCol2   ? String(r[nameCol2]||'')   : '');
          const sku2_    = document.getElementById('pe-sku')?.value     || (skuCol     ? String(r[skuCol]||'')     : '');
          const barcode_ = document.getElementById('pe-barcode')?.value || (barcodeCol ? String(r[barcodeCol]||'') : '');
          const style_   = document.getElementById('pe-style')?.value   || (styleCol   ? String(r[styleCol]||'')   : '');
          const size_    = document.getElementById('pe-size')?.value    || (sizeCol    ? String(r[sizeCol]||'')    : '');
          const ntCost = Math.round(c.實際成本 * 10) / 10;
          const newRow = {
            __custom: true,
            __id: 'cpy_' + Date.now(),
            商品編號: sku2_,
            商品名稱: name2,
            品項條碼: barcode_,
            樣式: style_,
            尺寸: size_,
            成本: ntCost,
            單品售價: pr,
          };
          if (!window.__pricingData[targetSheet]) window.__pricingData[targetSheet] = [];
          window.__pricingData[targetSheet].unshift(newRow);
          const custom = Store.get(`ec.d2.pricing.custom.${targetSheet}`, []);
          custom.unshift(newRow);
          Store.set(`ec.d2.pricing.custom.${targetSheet}`, custom);
          if (btn) { btn.textContent = '✓ 已加入'; btn.disabled = true; btn.style.opacity = '0.6'; }
        };
        detTr.querySelectorAll('[data-copy-sheet]').forEach(btn => {
          btn.addEventListener('click', () => _copyToSheet(btn.getAttribute('data-copy-sheet'), btn));
        });
      }
    });

    document.getElementById('pr-show-all')?.addEventListener('click', () => {
      if (!window.__pricingData) return;
      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      const q = Store.get('ec.d2.pricing.q', '');
      const sheetData = window.__pricingData[activeSheet] || [];
      const allCols = sheetData.length > 0 ? Object.keys(sheetData[0]) : [];
      const coreCols = self._prGetVisibleCols(allCols, activeSheet);
      const coreTypes = coreCols.map(c => self._prColType(c, activeSheet));
      const filteredWithIdx = q
        ? sheetData.map((r, i) => ({ r, i })).filter(({ r }) => String(r['產品名稱'] || Object.values(r)[0] || '').toLowerCase().includes(q.toLowerCase()))
        : sheetData.map((r, i) => ({ r, i }));
      const tbody = document.getElementById('pr-tbody');
      if (tbody) tbody.innerHTML = filteredWithIdx.map(({ r, i }) =>
        `<tr class="pr-row" data-i="${i}" style="border-bottom:1px solid #f3f4f6;cursor:pointer">` +
        coreCols.map((c, ci) => `<td style="font-size:13px;padding:8px 12px;${c==='產品名稱'||c==='試算名稱'?'text-align:left':'text-align:right'}">${self._prFmt(r[c], coreTypes[ci])}</td>`).join('') +
        `<td style="text-align:center;color:#d1d5db;font-size:11px;padding:8px 4px">›</td></tr>`
      ).join('');
      document.getElementById('pr-show-all')?.closest('div')?.remove();
    });

    // ── 新增表單 ──────────────────────────────────────────
    // 載入 JSON 後合併 localStorage 自訂列
    const _mergeCustomRows = () => {
      if (!window.__pricingData) return;
      self.PRICING_SHEETS_ORDER.forEach(sh => {
        const custom = Store.get(`ec.d2.pricing.custom.${sh}`, []);
        if (!custom.length) return;
        const existing = window.__pricingData[sh] || [];
        // 只移除已是自訂列的項目（r.__custom === true），保留所有 Excel 列
        window.__pricingData[sh] = [
          ...custom,
          ...existing.filter(r => !r.__custom)
        ];
      });
    };

    // 若已有 pricingData（頁面切換回來），直接合併
    if (window.__pricingData) _mergeCustomRows();

    // 攔截 fetch 完成後的合併（覆寫 pr-load-btn 的 handler）
    document.getElementById('pr-load-btn')?.addEventListener('click', async () => {
      // 原有 handler 已在上面綁過，這裡只需在 render 之後合併
      // 但無法串接，所以改成：短暫輪詢 __pricingData 出現後合併
      const wait = setInterval(() => {
        if (window.__pricingData) { clearInterval(wait); _mergeCustomRows(); }
      }, 100);
      setTimeout(() => clearInterval(wait), 5000);
    }, { once: true });

    // 欄位顯示/排序面板
    document.getElementById('pr-col-btn')?.addEventListener('click', () => {
      const panel = document.getElementById('pr-col-panel');
      if (!panel) return;
      const nowOpen = panel.style.display !== 'none';
      panel.style.display = nowOpen ? 'none' : 'block';
      Store.set('ec.d2.pricing.colpanel', !nowOpen);
    });

    const _saveColPrefs = () => {
      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      const items = [...document.querySelectorAll('.pr-col-item')];
      const order = items.map(el => el.dataset.col);
      const hidden = items.filter(el => !el.querySelector('.pr-col-check').checked).map(el => el.dataset.col);
      Store.set(`ec.d2.pricing.cols.${activeSheet}`, { order, hidden });
      self.render();
    };

    document.querySelectorAll('.pr-col-check').forEach(cb => {
      cb.addEventListener('change', _saveColPrefs);
    });

    document.getElementById('pr-col-reset')?.addEventListener('click', () => {
      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      Store.set(`ec.d2.pricing.cols.${activeSheet}`, null);
      self.render();
    });

    // 欄位拖曳排序（含插入位置指示）
    let _dragColSrc = null;
    const colList = document.getElementById('pr-col-list');
    // 建立插入指示線
    const _dragIndicator = document.createElement('div');
    _dragIndicator.id = 'pr-drag-indicator';
    _dragIndicator.style.cssText = 'width:3px;border-radius:3px;background:#2563eb;align-self:stretch;display:none;flex-shrink:0';
    const _clearIndicator = () => {
      _dragIndicator.style.display = 'none';
      if (_dragIndicator.parentNode) _dragIndicator.parentNode.removeChild(_dragIndicator);
    };
    document.querySelectorAll('.pr-col-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        _dragColSrc = item;
        setTimeout(() => { item.style.opacity = '0.35'; item.style.transform = 'scale(0.97)'; }, 0);
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        item.style.opacity = '1'; item.style.transform = '';
        _clearIndicator();
        _dragColSrc = null;
      });
      item.addEventListener('dragover', e => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        if (!_dragColSrc || _dragColSrc === item) return;
        const rect = item.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        _dragIndicator.style.display = 'block';
        if (e.clientX < mid) colList.insertBefore(_dragIndicator, item);
        else colList.insertBefore(_dragIndicator, item.nextSibling);
      });
      item.addEventListener('dragleave', e => {
        if (!item.contains(e.relatedTarget)) { /* indicator stays until next dragover */ }
      });
      item.addEventListener('drop', e => {
        e.preventDefault();
        _clearIndicator();
        if (!_dragColSrc || _dragColSrc === item) return;
        const rect = item.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        if (e.clientX < mid) colList.insertBefore(_dragColSrc, item);
        else colList.insertBefore(_dragColSrc, item.nextSibling);
        _saveColPrefs();
      });
    });

    // 數值範圍篩選面板
    document.getElementById('pr-filter-btn')?.addEventListener('click', () => {
      const panel = document.getElementById('pr-filter-panel');
      if (!panel) return;
      const nowOpen = panel.style.display !== 'none';
      panel.style.display = nowOpen ? 'none' : 'block';
      Store.set('ec.d2.pricing.filterpanel', !nowOpen);
    });
    const _saveNumFilters = () => {
      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      const filters = {};
      document.querySelectorAll('.pr-nf-min').forEach(inp => {
        const col = inp.dataset.col;
        const maxInp = document.querySelector(`.pr-nf-max[data-col="${CSS.escape(col)}"]`);
        const min = inp.value.trim();
        const max = maxInp?.value.trim() ?? '';
        if (min !== '' || max !== '')
          filters[col] = { min: min !== '' ? +min : null, max: max !== '' ? +max : null };
      });
      Store.set(`ec.d2.pricing.numfilters.${activeSheet}`, filters);
      self.render();
    };
    document.querySelectorAll('.pr-nf-min,.pr-nf-max').forEach(inp => inp.addEventListener('change', _saveNumFilters));
    document.getElementById('pr-nf-reset')?.addEventListener('click', () => {
      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      Store.set(`ec.d2.pricing.numfilters.${activeSheet}`, {});
      self.render();
    });

    // 排序（點欄位標題）
    document.querySelectorAll('th[data-sort-col]').forEach(th => {
      th.addEventListener('click', () => {
        const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
        const col = th.dataset.sortCol;
        const cur = Store.get(`ec.d2.pricing.sort.${activeSheet}`, null);
        if (cur?.col === col) {
          Store.set(`ec.d2.pricing.sort.${activeSheet}`, cur.dir === 'asc' ? {col, dir:'desc'} : null);
        } else {
          Store.set(`ec.d2.pricing.sort.${activeSheet}`, {col, dir:'asc'});
        }
        self.render();
      });
    });

    // 費率設定按鈕
    document.getElementById('pr-rates-btn')?.addEventListener('click', () => {
      const panel = document.getElementById('pr-rates-panel');
      if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('pr-rates-close')?.addEventListener('click', () => {
      const panel = document.getElementById('pr-rates-panel');
      if (panel) panel.style.display = 'none';
    });
    document.getElementById('pr-rates-save')?.addEventListener('click', () => {
      const saved = Store.get('ec.pricing.rates', {});
      document.querySelectorAll('#pr-rates-panel input[data-sh]').forEach(el => {
        const sh = el.dataset.sh;
        const field = el.dataset.field;
        if (!saved[sh]) saved[sh] = {};
        const val = parseFloat(el.value) || 0;
        // 稅金/成交/活動/退貨 存為小數（%/100）；固定費存 NT$
        saved[sh][field] = ['tax','txFee','promo','ret'].includes(field) ? val / 100 : val;
      });
      Store.set('ec.pricing.rates', saved);
      document.getElementById('pr-rates-panel').style.display = 'none';
      self.render();
      const t = document.getElementById('toast');
      if (t) { t.textContent = '費率已儲存'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); }
    });
    document.getElementById('pr-rates-reset')?.addEventListener('click', () => {
      if (!confirm('確定還原所有分頁為預設費率？')) return;
      Store.set('ec.pricing.rates', {});
      // 重填輸入框
      document.querySelectorAll('#pr-rates-panel input[data-sh]').forEach(el => {
        const sh = el.dataset.sh;
        const field = el.dataset.field;
        const def = self.PRICING_SHEET_PARAMS[sh];
        if (!def) return;
        el.value = ['tax','txFee','promo','ret'].includes(field)
          ? (def[field] * 100).toFixed(1)
          : def[field];
      });
    });

    // 新增按鈕 toggle
    document.getElementById('pr-add-btn')?.addEventListener('click', () => {
      const form = document.getElementById('pr-add-form');
      if (!form) return;
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    // 取消
    document.getElementById('pr-form-cancel')?.addEventListener('click', () => {
      const form = document.getElementById('pr-add-form');
      if (form) form.style.display = 'none';
    });

    // 即時試算
    const _updatePreview = () => {
      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      const origCost  = parseFloat(document.getElementById('pf-orig')?.value)   || 0;
      const landFreight = parseFloat(document.getElementById('pf-land')?.value) || 0;
      const weight    = parseFloat(document.getElementById('pf-weight')?.value) || 0;
      const price     = parseFloat(document.getElementById('pf-price')?.value)  || 0;
      const c = self._prCalcAll(activeSheet, origCost, landFreight, weight, price, 0, 0);
      const nt = v => v != null ? 'NT$' + v.toLocaleString('zh-TW', {minimumFractionDigits:0}) : '—';
      const pct = v => {
        const p = Math.round(v * 10000) / 100;
        const col = p >= 20 ? '#059669' : p >= 0 ? '#f59e0b' : '#dc2626';
        return `<span style="color:${col};font-weight:700">${p.toFixed(1)}%</span>`;
      };
      const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
      set('pc-ship',     nt(c.陸台運費NT));
      set('pc-cost',     nt(c.實際成本));
      set('pc-tax',      nt(c.稅金));
      set('pc-ads',      nt(c.廣告));
      set('pc-fixed',    nt(c.固定));
      set('pc-tx',       nt(c.成交));
      set('pc-promo',    nt(c.活動));
      set('pc-ret',      nt(c.退貨));
      set('pc-platform', nt(c.蝦皮總成本));
      set('pc-income',   nt(c.入帳));
      set('pc-inctax',   nt(c.銷項稅金));
      set('pc-profit',   `<strong>${nt(c.實際毛利)}</strong>`);
      set('pc-pct',      price > 0 ? pct(c.獲利百分比) : '—');
      set('pc-costratio',price > 0 ? pct(c.成本率)     : '—');
      set('pc-netloss',  c.淨利潤  != null ? nt(c.淨利潤)  : '—');
      set('pc-invest',   c.預估投入 != null ? nt(c.預估投入) : '—');
      const roasVal = c.獲利百分比 > 0.20 ? Math.round(1 / (c.獲利百分比 - 0.20) * 100) / 100 : null;
      set('pc-roas', roasVal != null ? roasVal.toFixed(2) : '—');
    };

    ['pf-orig','pf-land','pf-weight','pf-price'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', _updatePreview);
    });

    // 儲存
    document.getElementById('pr-form-save')?.addEventListener('click', () => {
      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      const get = id => document.getElementById(id)?.value.trim() || '';
      const inputs = {
        logistics:   get('pf-logistics'),
        name:        get('pf-name'),
        origCost:    parseFloat(get('pf-orig'))   || 0,
        landFreight: parseFloat(get('pf-land'))   || 0,
        weight:      parseFloat(get('pf-weight')) || 0,
        price:       parseFloat(get('pf-price'))  || 0,
        roas:        parseFloat(document.getElementById('pc-roas')?.innerText) || 0,
        volume:      0,
        store:       get('pf-store'),
        website:     get('pf-website'),
        note:        get('pf-note'),
      };
      if (!inputs.name) { alert('請輸入產品名稱'); return; }
      const newRow = self._prBuildRow(activeSheet, inputs);
      if (!window.__pricingData) window.__pricingData = {};
      if (!window.__pricingData[activeSheet]) window.__pricingData[activeSheet] = [];
      window.__pricingData[activeSheet].unshift(newRow);
      // 存 localStorage
      const existing = Store.get(`ec.d2.pricing.custom.${activeSheet}`, []);
      Store.set(`ec.d2.pricing.custom.${activeSheet}`, [newRow, ...existing]);
      self.render();
    });

    // 刪除自訂列（事件委派）
    document.getElementById('pr-tbody')?.addEventListener('click', e => {
      const delBtn = e.target.closest('.pr-del-custom');
      if (!delBtn) return;
      e.stopPropagation();
      const activeSheet = Store.get('ec.d2.pricing.sheet', '商品母表');
      const id = delBtn.dataset.id;
      // 從記憶體移除
      if (window.__pricingData?.[activeSheet]) {
        window.__pricingData[activeSheet] = window.__pricingData[activeSheet].filter(r => String(r.__id) !== String(id));
      }
      // 從 localStorage 移除
      const saved = Store.get(`ec.d2.pricing.custom.${activeSheet}`, []);
      Store.set(`ec.d2.pricing.custom.${activeSheet}`, saved.filter(r => String(r.__id) !== String(id)));
      self.render();
    });
  },

  renderD2MarginTabHtml() {
    const activeQ = Store.get('ec.d2.margin.q', 'Q3');
    const qKey = activeQ === 'Q3' ? 'ec.d2.margin' : `ec.d2.margin.${activeQ.toLowerCase()}`;
    const list = Store.get(qKey, []);
    const sqLabels = {Q1:'1~3月',Q2:'4~6月',Q3:'7~9月',Q4:'10~12月'};
    const qTabsHtml = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
      ${['Q1','Q2','Q3','Q4'].map(q => {
        const act = q === activeQ;
        return `<button class="mg-q-tab" data-q="${q}" style="padding:6px 16px;border-radius:20px;border:1px solid ${act?'#059669':'#e5e7eb'};background:${act?'#059669':'#fff'};color:${act?'#fff':'#374151'};font-size:13px;font-weight:${act?'700':'400'};cursor:pointer">${q} <span style="font-size:11px;opacity:.75">${sqLabels[q]}</span></button>`;
      }).join('')}
    </div>`;
    const priceF = v => Number(v) ? 'NT$' + Number(v).toLocaleString() : '<span style="color:var(--text-muted)">—</span>';
    const pctF = v => v != null ? `<span style="font-weight:700;color:${v >= 30 ? '#059669' : v >= 15 ? '#f59e0b' : '#dc2626'}">${v.toFixed(1)}%</span>` : '<span style="color:var(--text-muted)">—</span>';
    const rows = list.length === 0
      ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:28px;font-size:13px">尚無資料，點擊「＋ 新增」開始建立</td></tr>`
      : list.map((r, i) => {
          const cost = Number(r.cost || 0), rev = Number(r.rev || 0);
          const profit = rev - cost;
          const pct = rev > 0 ? profit / rev * 100 : null;
          return `<tr style="vertical-align:middle">
            <td style="text-align:center;color:#9ca3af;font-size:12px">${i + 1}</td>
            <td style="font-weight:600">${escapeHtml(r.name || '')}</td>
            <td style="text-align:right">${priceF(r.cost)}</td>
            <td style="text-align:right">${priceF(r.rev)}</td>
            <td style="text-align:right">${cost || rev ? priceF(profit) : '<span style="color:var(--text-muted)">—</span>'}</td>
            <td style="text-align:center">${pctF(pct)}</td>
            <td style="white-space:nowrap"><div style="display:flex;gap:5px;justify-content:center">
              <button class="mg-edit" data-i="${i}" style="padding:3px 10px;border:1px solid #d1fae5;background:#f0fdf4;color:#1a7a6e;border-radius:5px;font-size:12px;cursor:pointer">編輯</button>
              <button class="mg-del" data-i="${i}" style="padding:3px 10px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button>
            </div></td>
          </tr>`;
        }).join('');
    return `
      ${qTabsHtml}
      <div class="table-card">
        <div class="table-card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div><h3>📊 新品毛利表</h3><p>記錄商品成本與營收，自動計算毛利與毛利率（共 ${list.length} 筆）</p></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button id="mg-import-btn" style="padding:7px 16px;background:#1d4ed8;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">📥 匯入 Excel</button>
            <input id="mg-import-file" type="file" accept=".xlsx,.xls" style="display:none">
            <button id="mg-add-btn" style="padding:7px 16px;background:#059669;color:white;border:0;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">＋ 新增</button>
            ${list.length > 0 ? `<button id="mg-clear-btn" style="padding:7px 16px;background:#fff;color:#dc2626;border:1px solid #fca5a5;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer">🗑 一鍵清除</button>` : ''}
          </div>
        </div>
        <div id="mg-form" style="display:none;padding:16px;background:#f0fdf4;border-bottom:1px solid var(--border)">
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-bottom:10px">
            <input id="mg-name" placeholder="品名 *" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="mg-cost" type="number" placeholder="成本" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
            <input id="mg-rev" type="number" placeholder="營收" style="padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:inherit">
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="mg-save" style="padding:8px 18px;background:#059669;color:white;border:0;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">儲存</button>
            <button id="mg-cancel" style="padding:8px 14px;background:none;border:1px solid var(--border);border-radius:6px;font-size:13px;cursor:pointer">取消</button>
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th style="text-align:center;width:48px">編號</th><th style="text-align:left">品名</th><th style="text-align:right">成本</th><th style="text-align:right">營收</th><th style="text-align:right">毛利</th><th style="text-align:center">毛利率</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>
      ${(() => {
        const savesKey = activeQ === 'Q3' ? 'ec.d2.margin.saves' : `ec.d2.margin.saves.${activeQ.toLowerCase()}`;
        const saves = Store.get(savesKey, []);
        if (!saves.length) return '';
        return `<div class="table-card" style="margin-top:12px">
          <div class="table-card-header"><h3>📂 存檔記錄</h3><p>共 ${saves.length} 份，點擊「載入」可還原該次匯入的資料</p></div>
          <div class="table-wrap"><table>
            <thead><tr><th>存檔時間</th><th style="text-align:right">商品數</th><th></th></tr></thead>
            <tbody>${saves.map((s, si) => `<tr>
              <td>${escapeHtml(s.ts || '')}</td>
              <td style="text-align:right">${s.data ? s.data.length : 0} 筆</td>
              <td style="white-space:nowrap"><div style="display:flex;gap:5px;justify-content:center">
                <button class="mg-save-load" data-si="${si}" style="padding:3px 10px;border:1px solid #d1fae5;background:#f0fdf4;color:#1a7a6e;border-radius:5px;font-size:12px;cursor:pointer">載入</button>
                <button class="mg-save-del" data-si="${si}" style="padding:3px 10px;border:1px solid #fee2e2;background:#fff5f5;color:#dc2626;border-radius:5px;font-size:12px;cursor:pointer">刪除</button>
              </div></td>
            </tr>`).join('')}
            </tbody>
          </table></div>
        </div>`;
      })()}`;
  },

  bindD2MarginTab() {
    document.querySelectorAll('.mg-q-tab').forEach(btn => btn.addEventListener('click', () => {
      Store.set('ec.d2.margin.q', btn.dataset.q);
      this.render();
    }));
    const mgForm = document.getElementById('mg-form');
    if (!mgForm) return;
    const activeQ = Store.get('ec.d2.margin.q', 'Q3');
    const mgKey = activeQ === 'Q3' ? 'ec.d2.margin' : `ec.d2.margin.${activeQ.toLowerCase()}`;
    const mgSaveBtn = document.getElementById('mg-save');
    let mgEditIdx = -1;
    const clearMg = () => {
      ['mg-name','mg-cost','mg-rev'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      mgEditIdx = -1;
      mgSaveBtn.textContent = '儲存';
      mgForm.style.display = 'none';
    };
    document.getElementById('mg-add-btn')?.addEventListener('click', () => {
      if (mgForm.style.display !== 'none') { clearMg(); return; }
      clearMg(); mgForm.style.display = '';
    });
    document.getElementById('mg-cancel')?.addEventListener('click', clearMg);
    mgSaveBtn?.addEventListener('click', () => {
      const name = document.getElementById('mg-name')?.value.trim();
      if (!name) { showToast('請填寫品名'); return; }
      const entry = { name, cost: document.getElementById('mg-cost')?.value || '', rev: document.getElementById('mg-rev')?.value || '' };
      const list = Store.get(mgKey, []);
      if (mgEditIdx >= 0) { list[mgEditIdx] = entry; } else { list.push(entry); }
      Store.set(mgKey, list);
      clearMg();
      this.render();
    });
    document.querySelectorAll('.mg-edit').forEach(btn => btn.addEventListener('click', () => {
      const list = Store.get(mgKey, []);
      const r = list[+btn.dataset.i]; if (!r) return;
      mgEditIdx = +btn.dataset.i;
      document.getElementById('mg-name').value = r.name || '';
      document.getElementById('mg-cost').value = r.cost || '';
      document.getElementById('mg-rev').value = r.rev || '';
      mgSaveBtn.textContent = '更新';
      mgForm.style.display = '';
      mgForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
    document.querySelectorAll('.mg-del').forEach(btn => btn.addEventListener('click', () => {
      const list = Store.get(mgKey, []);
      list.splice(+btn.dataset.i, 1);
      Store.set(mgKey, list);
      this.render();
    }));

    // 存檔記錄：載入 / 刪除
    const savesKey = activeQ === 'Q3' ? 'ec.d2.margin.saves' : `ec.d2.margin.saves.${activeQ.toLowerCase()}`;
    document.querySelectorAll('.mg-save-load').forEach(btn => btn.addEventListener('click', () => {
      const saves = Store.get(savesKey, []);
      const s = saves[+btn.dataset.si];
      if (!s || !s.data) return;
      if (!confirm(`載入「${s.ts}」的存檔？目前資料將被覆蓋。`)) return;
      Store.set(mgKey, s.data);
      showToast('已載入存檔');
      this.render();
    }));
    document.querySelectorAll('.mg-save-del').forEach(btn => btn.addEventListener('click', () => {
      const saves = Store.get(savesKey, []);
      saves.splice(+btn.dataset.si, 1);
      Store.set(savesKey, saves);
      this.render();
    }));

    // 一鍵清除
    document.getElementById('mg-clear-btn')?.addEventListener('click', () => {
      if (!confirm('確定要清除所有資料？')) return;
      Store.set(mgKey, []);
      this.render();
    });

    // 匯入 Excel
    const importBtn = document.getElementById('mg-import-btn');
    const importFile = document.getElementById('mg-import-file');
    importBtn?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const XLSX = window.XLSX;
          if (!XLSX) { showToast('Excel 解析器尚未載入，請稍後再試'); return; }
          const wb = XLSX.read(ev.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (data.length < 2) { showToast('檔案無資料'); return; }
          const headers = data[0].map(h => String(h).trim());
          const nameIdx = headers.findIndex(h => h === '商品名稱');
          const revIdx  = headers.findIndex(h => h === '售價');
          const costIdx = headers.findIndex(h => h === '成本');
          if (nameIdx < 0 || revIdx < 0 || costIdx < 0) {
            showToast('找不到欄位：需要「商品名稱」「售價」「成本」'); return;
          }
          const map = new Map();
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const name = String(row[nameIdx] || '').trim();
            if (!name) continue;
            const rev  = Number(row[revIdx])  || 0;
            const cost = Number(row[costIdx]) || 0;
            if (map.has(name)) {
              map.get(name).rev  += rev;
              map.get(name).cost += cost;
            } else {
              map.set(name, { name, rev, cost });
            }
          }
          const merged = [...map.values()].map(r => ({
            name: r.name,
            rev:  Math.round(r.rev  * 100) / 100,
            cost: Math.round(r.cost * 100) / 100,
          }));
          Store.set(mgKey, merged);
          // 自動存檔
          const savesKey = activeQ === 'Q3' ? 'ec.d2.margin.saves' : `ec.d2.margin.saves.${activeQ.toLowerCase()}`;
          const saves = Store.get(savesKey, []);
          const now = new Date();
          const ts = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
          saves.unshift({ ts, data: merged });
          Store.set(savesKey, saves);
          importFile.value = '';
          showToast(`匯入完成，共 ${merged.length} 個商品，已自動存檔`);
          this.render();
        } catch (err) {
          showToast('匯入失敗：' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  },
});
