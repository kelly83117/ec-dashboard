/* js/pages/daily.js -- methods extracted from original App, merged back via Object.assign(App, ...) */
const App = window.App;
const { Store, escapeHtml, showToast, toDateStr, addDays, todayStr, genId, DAILY_TASK_STATUS, DAILY_TASK_STATUS_LIST, TASK_CATEGORIES, TASK_CATEGORY_NAMES, TASK_CATEGORY_ALIASES, getCategoryMeta, getCategoryItems } = window;

Object.assign(App, {
  renderWeeklyCalendarTab(deptId, color, dept) {
    // 老闆指示：移除月曆/週曆/甘特圖，每位同事下班前 5 分鐘寫今日工作進度即可
    // 只保留 3 位同事：陳君葳、洪嘉蓮、郭雅琪
    const ALLOWED_NAMES = ['陳君葳', '洪嘉蓮', '郭雅琪'];
    // 月曆上用來標示「這天誰填過」的顏色點：陳君葳(Vivian)紫、洪嘉蓮(inna)藍、郭雅琪(Kelly)黃
    const PERSON_COLORS = { '陳君葳': '#8b5cf6', '洪嘉蓮': '#3b82f6', '郭雅琪': '#f59e0b' };
    const users = Store.get(Store.KEYS.users, []);
    const now = new Date();
    const todayStr = toDateStr(now);
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    // 舊欄位 canManageLineNotify 仍兼容；新版改用 officeFeatures['行銷'].includes('lineNotify')
    const canManageLine = isAdmin
      || hasOfficeFeature(this.currentUser, '行銷', 'lineNotify')
      || (this.currentUser && this.currentUser.canManageLineNotify === true);
    const myName = (this.currentUser && (this.currentUser.name || this.currentUser.username)) || '';

    if (!this.filter.dashboardMarketing) this.filter.dashboardMarketing = {};
    const f = this.filter.dashboardMarketing;
    if (!f.viewDate) f.viewDate = todayStr;
    if (f.viewDate > todayStr) f.viewDate = todayStr;
    const viewDate = f.viewDate;
    const isToday = viewDate === todayStr;
    const dateDisplay = viewDate.replace(/-/g, '/');
    if (!f.calMonth) f.calMonth = viewDate.slice(0, 7);
    const calMonth = f.calMonth;
    const allProgressForCal = Store.get('ec.dailyProgress', {}) || {};

    // 老闆指派的任務區
    const bossTasks = (Store.get('ec.bossTasks', []) || []).slice();
    bossTasks.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    const pendingCount = bossTasks.filter(t => t.status !== 'done').length;
    const assigneeOpts = ['全體', ...ALLOWED_NAMES];
    const dueChip = (due) => {
      if (!due) return '';
      const overdue = due < todayStr;
      const bg = overdue ? '#fee2e2' : '#f3f4f6';
      const fg = overdue ? '#dc2626' : '#4b5563';
      return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:6px;background:${bg};color:${fg};font-size:11px;font-weight:600;font-variant-numeric:tabular-nums">📅 ${escapeHtml(due.replace(/-/g, '/'))}${overdue ? ' 逾期' : ''}</span>`;
    };
    // 主畫面只列「未完成」任務；完成的進歷史紀錄 modal
    const pendingTasks = bossTasks.filter(t => t.status !== 'done');
    const doneCount = bossTasks.length - pendingTasks.length;
    const taskItems = pendingTasks.map(t => {
      const isMine = t.assignee === '全體' || t.assignee === myName;
      const canToggle = isAdmin || isMine;
      const assigneeBadge = t.assignee === '全體'
        ? '<span style="padding:2px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:700">全體</span>'
        : `<span style="padding:2px 8px;border-radius:999px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700">${escapeHtml(t.assignee || '—')}</span>`;
      return `
        <div class="boss-task-row" data-task-id="${escapeHtml(t.id)}" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:white;border:1px solid var(--border);border-radius:8px">
          <button class="boss-task-toggle" data-task-id="${escapeHtml(t.id)}" title="標記完成" ${canToggle ? '' : 'disabled'}
            style="width:22px;height:22px;border-radius:6px;border:1.5px solid #cbd5e1;background:white;color:white;font-size:13px;cursor:${canToggle ? 'pointer' : 'not-allowed'};flex-shrink:0;display:flex;align-items:center;justify-content:center;${canToggle ? '' : 'opacity:.5'}"></button>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:var(--text);line-height:1.5;white-space:pre-wrap;word-break:break-word">${escapeHtml(t.desc || '')}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px">
              ${assigneeBadge}
              ${dueChip(t.due)}
            </div>
          </div>
          ${isAdmin ? `
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="boss-task-edit" data-task-id="${escapeHtml(t.id)}" title="編輯" style="width:26px;height:26px;border:1px solid var(--border);background:white;border-radius:5px;font-size:12px;cursor:pointer;color:var(--text-muted)">✎</button>
              <button class="boss-task-del" data-task-id="${escapeHtml(t.id)}" title="刪除" style="width:26px;height:26px;border:1px solid #fecaca;background:white;border-radius:5px;font-size:12px;cursor:pointer;color:#dc2626">✕</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    const bossTasksHtml = `
      <div style="background:linear-gradient(180deg,#fef3c7,#fffbeb);border:1px solid #fcd34d;border-radius:10px;padding:14px 14px 12px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:${pendingTasks.length ? '10px' : '0'};flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:15px">📋</span>
            <h4 style="margin:0;font-size:14px;font-weight:700;color:#92400e">老闆指派的任務</h4>
            ${pendingCount > 0 ? `<span style="padding:2px 9px;border-radius:999px;background:#dc2626;color:white;font-size:11px;font-weight:700">${pendingCount} 待辦</span>` : '<span style="padding:2px 9px;border-radius:999px;background:#10b981;color:white;font-size:11px;font-weight:700">全數完成</span>'}
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button id="boss-task-history" title="查看已完成的歷史任務" style="padding:5px 11px;border:1px solid #fcd34d;background:white;border-radius:6px;font-size:12px;color:#92400e;cursor:pointer;display:inline-flex;align-items:center;gap:5px">📜 歷史 (${doneCount})</button>
            ${isAdmin ? `<button id="boss-task-add" style="padding:6px 14px;border:0;border-radius:7px;background:#f59e0b;color:white;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px">+ 新增任務</button>` : ''}
          </div>
        </div>
        ${pendingTasks.length === 0
          ? `<div style="padding:14px;text-align:center;color:#92400e;font-size:12px">${isAdmin ? (bossTasks.length === 0 ? '尚無任務。點上方「+ 新增任務」來指派' : '全數完成 🎉 點上方「📜 歷史」看已完成的任務') : '老闆目前沒有指派任務 ✓'}</div>`
          : `<div style="display:flex;flex-direction:column;gap:6px">${taskItems}</div>`
        }
      </div>
    `;

    const allProgress = Store.get('ec.dailyProgress', {}) || {};
    const dayProgress = allProgress[viewDate] || {};
    // 舊資料是一整段文字，第一次在新版打勾清單顯示時包成一筆項目，不會不見
    const normItems = (v) => {
      if (Array.isArray(v)) return v;
      if (v && String(v).trim()) return [{ id: 'legacy', text: String(v).trim(), done: false }];
      return [];
    };

    const personInfos = ALLOWED_NAMES.map(name => {
      const u = users.find(uu => uu.name === name || uu.username === name);
      return {
        name,
        avatar: u && (u.avatar || u.avatarUrl) || '',
        items: normItems(dayProgress[name]),
      };
    });

    const cards = personInfos.map(p => {
      const initial = p.name.slice(0, 1);
      const doneCount = p.items.filter(it => it.done).length;
      const statusChip = p.items.length === 0
        ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600">尚未填</span>`
        : doneCount === p.items.length
          ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#d1fae5;color:#047857;font-size:11px;font-weight:600">✓ 全部完成</span>`
          : `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#e0e7ff;color:#4338ca;font-size:11px;font-weight:600">${doneCount}/${p.items.length} 已完成</span>`;
      const avatarHtml = p.avatar
        ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.name)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:38px;height:38px;border-radius:50%;background:${PERSON_COLORS[p.name]};color:white;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0">${escapeHtml(initial)}</div>`;
      const itemRows = p.items.map(it => `
        <div class="dp-todo-row" data-item-id="${escapeHtml(it.id)}" style="display:flex;align-items:center;gap:8px;padding:6px 2px;border-bottom:1px solid #f3f4f6">
          <span style="color:${PERSON_COLORS[p.name]};font-size:13px;flex-shrink:0">●</span>
          <span style="flex:1;min-width:0;font-size:13px;color:${it.done ? '#9ca3af' : 'var(--text)'};text-decoration:${it.done ? 'line-through' : 'none'};word-break:break-word">${escapeHtml(it.text)}</span>
          <input type="checkbox" class="dp-todo-check" data-item-id="${escapeHtml(it.id)}" data-dp-name="${escapeHtml(p.name)}" ${it.done ? 'checked' : ''} ${isToday ? '' : 'disabled'} style="width:16px;height:16px;cursor:${isToday ? 'pointer' : 'default'};flex-shrink:0">
          ${it.done ? '<span style="font-size:10.5px;color:#10b981;font-weight:700;flex-shrink:0">已完成</span>' : ''}
          ${isToday ? `<button class="dp-todo-del" data-item-id="${escapeHtml(it.id)}" data-dp-name="${escapeHtml(p.name)}" title="刪除" style="border:0;background:none;color:#d1d5db;cursor:pointer;font-size:13px;flex-shrink:0">✕</button>` : ''}
        </div>
      `).join('');
      const emptyHint = p.items.length === 0 ? `<div style="padding:10px 2px;color:var(--text-muted);font-size:12.5px">${isToday ? '還沒有待辦事項' : '這天沒有紀錄'}</div>` : '';
      return `
        <div class="dp-card" data-dp-name="${escapeHtml(p.name)}" style="background:white;border:1px solid var(--border);border-radius:10px;padding:14px 14px 12px;display:flex;flex-direction:column;gap:8px;min-width:0">
          <div style="display:flex;align-items:center;gap:10px;min-width:0">
            ${avatarHtml}
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600;color:var(--text)">${escapeHtml(p.name)}</div>
              <div style="margin-top:2px">${statusChip}</div>
            </div>
            <span class="dp-saved-flag" style="display:none;color:#10b981;font-size:11px;font-weight:600;letter-spacing:.04em">✓ 已存</span>
          </div>
          <div class="dp-todo-list">${itemRows}${emptyHint}</div>
          ${isToday ? `
            <div style="display:flex;gap:6px;margin-top:2px">
              <input type="text" class="dp-todo-add-input" data-dp-name="${escapeHtml(p.name)}" placeholder="新增待辦事項，按 Enter 加入"
                style="flex:1;min-width:0;padding:7px 10px;border:1px solid var(--border);border-radius:7px;font-family:inherit;font-size:13px;color:var(--text)">
              <button class="dp-todo-add-btn" data-dp-name="${escapeHtml(p.name)}" style="padding:7px 12px;border:0;border-radius:7px;background:var(--primary-soft);color:var(--primary);font-size:13px;font-weight:600;cursor:pointer">+</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // 左邊月曆：可以直接點日期切換查看，格子下方會標每個人的顏色點（誰填過這天），方便回頭找哪一天做過什麼
    const [calY, calM] = calMonth.split('-').map(Number);
    const firstWeekday = new Date(calY, calM - 1, 1).getDay();
    const daysInMonth = new Date(calY, calM, 0).getDate();
    const calCells = [];
    for (let i = 0; i < firstWeekday; i++) calCells.push('<div></div>');
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calY}-${String(calM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isCellToday = dateStr === todayStr;
      const isCellSelected = dateStr === viewDate;
      const isFuture = dateStr > todayStr;
      const dayEntries = allProgressForCal[dateStr] || {};
      const filledNames = ALLOWED_NAMES.filter(n => {
        const v = dayEntries[n];
        return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
      });
      const bg = isCellSelected ? 'var(--primary)' : isCellToday ? 'var(--primary-soft)' : 'transparent';
      const fg = isCellSelected ? 'white' : isFuture ? '#cbd5e1' : 'var(--text)';
      const dots = filledNames.map(n => `<span style="width:6px;height:6px;border-radius:50%;background:${isCellSelected ? 'white' : PERSON_COLORS[n]}"></span>`).join('');
      calCells.push(`
        <button class="dp-cal-day" data-date="${dateStr}" ${isFuture ? 'disabled' : ''}
          style="position:relative;aspect-ratio:1;border:1px solid ${isCellToday && !isCellSelected ? 'var(--primary)' : 'transparent'};border-radius:9px;background:${bg};color:${fg};font-size:15px;font-weight:${isCellSelected || isCellToday ? '700' : '500'};cursor:${isFuture ? 'not-allowed' : 'pointer'};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding-bottom:2px">
          <span>${d}</span>
          <span style="display:flex;gap:2px;height:6px">${dots}</span>
        </button>
      `);
    }
    const legendHtml = ALLOWED_NAMES.map(n => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted)"><span style="width:7px;height:7px;border-radius:50%;background:${PERSON_COLORS[n]}"></span>${escapeHtml(n)}</span>`).join('');
    const calendarHtml = `
      <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:16px;flex:0 0 380px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <button id="dp-cal-prev-month" style="border:0;background:none;cursor:pointer;font-size:18px;color:var(--text-muted);padding:2px 8px">‹</button>
          <div style="font-size:16px;font-weight:700">${calY}年${calM}月</div>
          <button id="dp-cal-next-month" style="border:0;background:none;cursor:pointer;font-size:18px;color:var(--text-muted);padding:2px 8px">›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;font-size:12px;color:var(--text-muted);text-align:center;margin-bottom:6px">
          <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">${calCells.join('')}</div>
        <div style="display:flex;gap:14px;justify-content:center;margin-top:12px">${legendHtml}</div>
        ${!isToday ? `<button id="dp-back-today" style="width:100%;margin-top:10px;padding:7px;border:0;border-radius:6px;background:var(--primary-soft);color:var(--primary);font-size:12px;font-weight:600;cursor:pointer">回到今天</button>` : ''}
      </div>
    `;

    return `
      <div style="background:#fcfcfd;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px 16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div style="min-width:0">
            <h3 style="margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em">每日工作進度 · ${escapeHtml(dateDisplay)}${isToday ? '<span style="margin-left:8px;font-size:11px;font-weight:500;color:var(--primary);background:var(--primary-soft);padding:2px 8px;border-radius:999px">今天</span>' : ''}</h3>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${isToday ? `<button id="dp-sync-cloud" title="把今天的進度上傳到雲端，同事才看得到" style="padding:5px 12px;border:1px solid #cbd5e1;background:white;border-radius:6px;font-size:12px;color:#475569;cursor:pointer;display:inline-flex;align-items:center;gap:6px"><span>☁ 同步雲端</span><span id="dp-sync-badge" style="display:none;min-width:18px;height:18px;padding:0 5px;background:#ef4444;color:white;border-radius:9px;font-size:10px;font-weight:700;align-items:center;justify-content:center;line-height:1">0</span></button>` : ''}
            ${canManageLine ? `<button id="boss-task-line-cfg" title="LINE 通知設定" style="padding:5px 11px;border:1px solid #cbd5e1;background:white;border-radius:6px;font-size:12px;color:#475569;cursor:pointer;display:inline-flex;align-items:center;gap:5px">⚙️ LINE 通知</button>` : ''}
          </div>
        </div>
        ${bossTasksHtml}
        <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
          ${calendarHtml}
          <div style="flex:1;min-width:280px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
            ${cards}
          </div>
        </div>
      </div>
    `;
  },
  openBossLineConfigModal() {
    const ALLOWED_NAMES = ['陳君葳', '洪嘉蓮', '郭雅琪'];
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const canManageLine = isAdmin
      || hasOfficeFeature(this.currentUser, '行銷', 'lineNotify')
      || (this.currentUser && this.currentUser.canManageLineNotify === true);
    if (!canManageLine) { showToast('沒有權限', 'error'); return; }
    const cfg = Store.get('ec.lineConfig', null) || { workerUrl: '', secret: '', userIds: {}, bossUserIds: [] };
    const uid = (name) => (cfg.userIds && cfg.userIds[name]) || '';
    const bossIds = Array.isArray(cfg.bossUserIds) ? cfg.bossUserIds.filter(Boolean).join('\n') : '';

    this.openModal({
      title: 'LINE 通知設定',
      width: '560px',
      bodyHtml: `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.5;background:#f9fafb;padding:10px 12px;border-radius:7px">
          📖 設定步驟請見 <code>LINE_NOTIFY_SETUP.md</code>。所有欄位填好後，按下方「測試通知」會發一封測試訊息。
        </div>
        <div class="field">
          <label>Cloudflare Worker URL</label>
          <input type="url" id="ln-worker" placeholder="https://yc-line-notify.xxx.workers.dev" value="${escapeHtml(cfg.workerUrl || '')}" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:monospace">
        </div>
        <div class="field">
          <label>通知密碼（NOTIFY_SECRET）</label>
          <div style="position:relative">
            <input type="password" id="ln-secret" placeholder="跟 Cloudflare Worker 設的密碼一樣" value="${escapeHtml(cfg.secret || '')}" style="width:100%;padding:8px 38px 8px 10px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:monospace">
            <button type="button" data-toggle-reveal="ln-secret" title="顯示 / 隱藏" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);width:28px;height:28px;border:0;background:transparent;cursor:pointer;font-size:14px;color:var(--text-muted)">👁</button>
          </div>
        </div>
        <div style="margin-top:14px;padding-top:10px;border-top:1px solid #e5e7eb">
          <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px">同事 LINE userId<span style="font-weight:400;color:var(--text-muted);font-size:11px">（新任務時通知，格式：U 開頭 32 字元）</span></div>
          ${ALLOWED_NAMES.map(n => `
            <div class="field" style="margin-bottom:8px">
              <label style="font-size:12px">${escapeHtml(n)}</label>
              <div style="position:relative">
                <input type="password" data-line-uid="${escapeHtml(n)}" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value="${escapeHtml(uid(n))}" style="width:100%;padding:8px 38px 8px 10px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:monospace">
                <button type="button" data-toggle-reveal-uid="${escapeHtml(n)}" title="顯示 / 隱藏" style="position:absolute;right:6px;top:50%;transform:translateY(-50%);width:28px;height:28px;border:0;background:transparent;cursor:pointer;font-size:14px;color:var(--text-muted)">👁</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:14px;padding-top:10px;border-top:1px solid #e5e7eb">
          <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
            <span>老闆 LINE userId<span style="font-weight:400;color:var(--text-muted);font-size:11px">（任務完成時通知；一行一個，可填多個）</span></span>
            <button type="button" id="ln-boss-reveal" title="顯示 / 隱藏" style="border:0;background:transparent;cursor:pointer;font-size:14px;color:var(--text-muted)">👁</button>
          </div>
          <textarea id="ln-boss-ids" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style="width:100%;min-height:70px;padding:8px 10px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:monospace;resize:vertical;-webkit-text-security:disc;text-security:disc">${escapeHtml(bossIds)}</textarea>
        </div>
        <div style="margin-top:14px;display:flex;gap:8px">
          <button type="button" id="ln-test-btn" style="padding:8px 14px;border:1px solid var(--border);background:white;border-radius:7px;font-size:13px;cursor:pointer">📤 測試通知</button>
          <span id="ln-test-result" style="font-size:12px;color:var(--text-muted);align-self:center"></span>
        </div>
      `,
      saveLabel: '儲存設定',
      cancelLabel: '取消',
      onMount: () => {
        // 👁 切換顯示密碼欄
        const toggleInput = (input, btn) => {
          const isShown = input.type === 'text';
          input.type = isShown ? 'password' : 'text';
          btn.textContent = isShown ? '👁' : '🙈';
        };
        document.querySelectorAll('[data-toggle-reveal]').forEach(btn => {
          btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.toggleReveal);
            if (input) toggleInput(input, btn);
          });
        });
        document.querySelectorAll('[data-toggle-reveal-uid]').forEach(btn => {
          btn.addEventListener('click', () => {
            const input = document.querySelector(`[data-line-uid="${btn.dataset.toggleRevealUid}"]`);
            if (input) toggleInput(input, btn);
          });
        });
        const bossReveal = document.getElementById('ln-boss-reveal');
        const bossTextarea = document.getElementById('ln-boss-ids');
        if (bossReveal && bossTextarea) {
          bossReveal.addEventListener('click', () => {
            const masked = bossTextarea.style.webkitTextSecurity === 'disc' || !bossTextarea.style.webkitTextSecurity;
            bossTextarea.style.webkitTextSecurity = masked ? 'none' : 'disc';
            bossTextarea.style.textSecurity = masked ? 'none' : 'disc';
            bossReveal.textContent = masked ? '🙈' : '👁';
          });
        }

        const testBtn = document.getElementById('ln-test-btn');
        const testResult = document.getElementById('ln-test-result');
        if (testBtn) {
          testBtn.addEventListener('click', async () => {
            const workerUrl = (document.getElementById('ln-worker') || {}).value || '';
            const secret = (document.getElementById('ln-secret') || {}).value || '';
            const userIds = {};
            document.querySelectorAll('[data-line-uid]').forEach(i => { userIds[i.dataset.lineUid] = (i.value || '').trim(); });
            const bossIds = ((document.getElementById('ln-boss-ids') || {}).value || '')
              .split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
            if (!workerUrl || !secret) { testResult.textContent = '⚠️ 先填 Worker URL 與密碼'; testResult.style.color = '#dc2626'; return; }
            const ids = [...ALLOWED_NAMES.map(n => userIds[n]).filter(Boolean), ...bossIds];
            if (ids.length === 0) { testResult.textContent = '⚠️ 至少填一位 userId'; testResult.style.color = '#dc2626'; return; }
            testBtn.disabled = true;
            testResult.textContent = '送出中…'; testResult.style.color = 'var(--text-muted)';
            try {
              const resp = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Notify-Secret': secret },
                body: JSON.stringify({
                  recipientUserIds: ids,
                  message: '🔔 元創儀表板測試通知\n如果你收到這則訊息，代表設定成功 ✓',
                }),
              });
              const data = await resp.json().catch(() => ({}));
              if (resp.ok && data.ok) {
                testResult.textContent = `✓ 已送出，${ids.length} 位請看 LINE`; testResult.style.color = '#10b981';
              } else {
                testResult.textContent = '✕ 失敗：' + (data.error || resp.status); testResult.style.color = '#dc2626';
              }
            } catch (e) {
              testResult.textContent = '✕ 連線失敗：' + (e.message || e); testResult.style.color = '#dc2626';
            } finally {
              testBtn.disabled = false;
            }
          });
        }
      },
      onSave: () => {
        const userIds = {};
        document.querySelectorAll('[data-line-uid]').forEach(i => {
          const v = (i.value || '').trim();
          if (v) userIds[i.dataset.lineUid] = v;
        });
        const bossUserIds = ((document.getElementById('ln-boss-ids') || {}).value || '')
          .split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
        Store.set('ec.lineConfig', {
          workerUrl: ((document.getElementById('ln-worker') || {}).value || '').trim(),
          secret: ((document.getElementById('ln-secret') || {}).value || '').trim(),
          userIds,
          bossUserIds,
        });
        showToast('LINE 通知設定已儲存', 'success');
        return true;
      },
    });
  },
  openBossTaskHistoryModal() {
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const all = (Store.get('ec.bossTasks', []) || []).slice();
    const done = all.filter(t => t.status === 'done');
    // 完成時間越近排越前面
    done.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));

    const fmtDate = (ts) => {
      if (!ts) return '—';
      const d = new Date(ts);
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
      const hh = String(d.getHours()).padStart(2,'0'), mm = String(d.getMinutes()).padStart(2,'0');
      return `${y}/${m}/${day} ${hh}:${mm}`;
    };

    const items = done.map(t => {
      const assigneeBadge = t.assignee === '全體'
        ? '<span style="padding:2px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:700">全體</span>'
        : `<span style="padding:2px 8px;border-radius:999px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700">${escapeHtml(t.assignee || '—')}</span>`;
      const dueLine = t.due ? `<span style="font-size:11px;color:var(--text-muted)">📅 預計 ${escapeHtml(t.due.replace(/-/g, '/'))}</span>` : '';
      const doneByLine = t.doneBy ? `<span style="font-size:11px;color:#10b981;font-weight:600">✓ ${escapeHtml(t.doneBy)}</span>` : '';
      return `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:#f9fafb;border:1px solid var(--border);border-radius:8px">
          <div style="width:22px;height:22px;border-radius:6px;background:#10b981;color:white;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">✓</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:var(--text);line-height:1.5;white-space:pre-wrap;word-break:break-word">${escapeHtml(t.desc || '')}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:var(--text-muted)">
              ${assigneeBadge}
              ${doneByLine}
              <span>📅 完成 ${escapeHtml(fmtDate(t.doneAt))}</span>
              ${dueLine}
            </div>
          </div>
          ${isAdmin ? `<button class="boss-task-history-del" data-task-id="${escapeHtml(t.id)}" title="從歷史中刪除" style="width:26px;height:26px;border:1px solid #fecaca;background:white;border-radius:5px;font-size:12px;cursor:pointer;color:#dc2626;flex-shrink:0">✕</button>` : ''}
        </div>
      `;
    }).join('');

    this.openModal({
      title: `📜 已完成的歷史任務 (${done.length})`,
      width: '600px',
      bodyHtml: done.length === 0
        ? '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">目前還沒有已完成的任務</div>'
        : `<div style="display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto">${items}</div>`,
      hideFooter: true,
      onMount: () => {
        document.querySelectorAll('.boss-task-history-del').forEach(b => {
          b.addEventListener('click', () => {
            if (!confirm('從歷史中刪除這筆？無法復原。')) return;
            const list = (Store.get('ec.bossTasks', []) || []).filter(t => t.id !== b.dataset.taskId);
            Store.set('ec.bossTasks', list);
            showToast('已刪除', 'success');
            this.closeModal();
            this.openBossTaskHistoryModal();
            this.render();
          });
        });
      },
    });
  },
  openBossTaskModal(taskId) {
    const ALLOWED_NAMES = ['陳君葳', '洪嘉蓮', '郭雅琪'];
    const todayStr = toDateStr(new Date());
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    if (!isAdmin) { showToast('沒有權限', 'error'); return; }
    const all = (Store.get('ec.bossTasks', []) || []).slice();
    let existing = null;
    if (taskId) existing = all.find(t => t.id === taskId);
    const desc = existing ? existing.desc : '';
    const assignee = existing ? existing.assignee : '全體';
    const due = existing ? (existing.due || '') : '';

    this.openModal({
      title: existing ? '編輯任務' : '新增任務',
      width: '480px',
      bodyHtml: `
        <div class="field">
          <label>任務內容</label>
          <textarea id="bt-desc" placeholder="要交辦什麼事？" style="width:100%;min-height:90px;padding:10px;border:1px solid var(--border);border-radius:7px;font-family:inherit;font-size:13px;line-height:1.5;resize:vertical">${escapeHtml(desc)}</textarea>
        </div>
        <div class="field-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="field">
            <label>指派給</label>
            <select id="bt-assignee" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:7px;font-size:13px;background:white">
              ${['全體', ...ALLOWED_NAMES].map(n => `<option value="${escapeHtml(n)}" ${n === assignee ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>預計完成日（選填）</label>
            <input type="date" id="bt-due" value="${escapeHtml(due)}" min="${todayStr}" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:7px;font-size:13px;font-family:inherit">
          </div>
        </div>
      `,
      saveLabel: existing ? '儲存' : '指派',
      cancelLabel: '取消',
      onSave: () => {
        const descEl = document.getElementById('bt-desc');
        const assigneeEl = document.getElementById('bt-assignee');
        const dueEl = document.getElementById('bt-due');
        const text = (descEl && descEl.value || '').trim();
        if (!text) { showToast('請輸入任務內容', 'error'); return false; }
        const list = (Store.get('ec.bossTasks', []) || []).slice();
        const ALLOWED_NAMES = ['陳君葳', '洪嘉蓮', '郭雅琪'];
        const assigneeVal = assigneeEl ? assigneeEl.value : '全體';
        const dueVal = dueEl ? dueEl.value : '';
        if (existing) {
          const idx = list.findIndex(t => t.id === existing.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], desc: text, assignee: assigneeVal, due: dueVal };
          }
        } else {
          list.push({
            id: 'bt-' + Math.random().toString(36).slice(2, 10),
            desc: text,
            assignee: assigneeVal,
            due: dueVal,
            status: 'todo',
            createdBy: (this.currentUser && this.currentUser.username) || '',
            createdAt: Date.now(),
          });
        }
        Store.set('ec.bossTasks', list);
        showToast(existing ? '已更新' : '已指派', 'success');
        this.render();
        // 新增任務時自動推 LINE 通知（帶 task 物件 → worker 會送出有「✓ 標記完成」按鈕的卡片）
        // 編輯時不重發，避免吵到同事
        if (!existing) {
          const recipients = assigneeVal === '全體' ? ALLOWED_NAMES : [assigneeVal];
          const newTask = list[list.length - 1]; // 剛 push 進去的那一筆
          // fallback 文字（worker 不支援 task 格式時 / 老 worker 還是 legacy）
          const fallbackMsg = '🔔 元創內部通知\n[老闆指派任務]\n' + text
            + '\n👤 指派給：' + assigneeVal
            + (dueVal ? '\n📅 截止：' + dueVal.replace(/-/g, '/') : '')
            + '\n→ 前往儀表板查看 https://kelly83117.github.io/ec-dashboard/';
          this.pushLineNotify(recipients, fallbackMsg, { kind: 'assigned', task: newTask }).then(r => {
            if (r && r.skipped) { /* 未設定就靜默 */ }
            else if (r && r.ok) showToast('已通知 LINE', 'info');
            else if (r && !r.ok) console.warn('[line notify]', r);
          });
        }
        return true;
      },
    });
  },
  bindWeeklyCalendar(deptId) {
    const ensureFilter = () => {
      if (!this.filter.dashboardMarketing) this.filter.dashboardMarketing = {};
    };
    const todayStr = toDateStr(new Date());
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const myName = (this.currentUser && (this.currentUser.name || this.currentUser.username)) || '';

    // 老闆任務：新增 / 編輯 / 刪除 / 切換完成狀態 / 歷史 / LINE 設定
    const addBtn = document.getElementById('boss-task-add');
    if (addBtn) addBtn.addEventListener('click', () => this.openBossTaskModal());
    const historyBtn = document.getElementById('boss-task-history');
    if (historyBtn) historyBtn.addEventListener('click', () => this.openBossTaskHistoryModal());
    const lineCfgBtn = document.getElementById('boss-task-line-cfg');
    if (lineCfgBtn) lineCfgBtn.addEventListener('click', () => this.openBossLineConfigModal());
    document.querySelectorAll('.boss-task-edit').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openBossTaskModal(b.dataset.taskId);
      });
    });
    document.querySelectorAll('.boss-task-del').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('確定刪除這個任務？')) return;
        const list = (Store.get('ec.bossTasks', []) || []).filter(t => t.id !== b.dataset.taskId);
        Store.set('ec.bossTasks', list);
        showToast('已刪除', 'success');
        this.render();
      });
    });
    document.querySelectorAll('.boss-task-toggle').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const list = (Store.get('ec.bossTasks', []) || []).slice();
        const idx = list.findIndex(t => t.id === b.dataset.taskId);
        if (idx < 0) return;
        const t = list[idx];
        // 權限：admin、或本人被指派的（assignee = 自己 / 全體）才能切
        const canToggle = isAdmin || t.assignee === '全體' || t.assignee === myName;
        if (!canToggle) { showToast('沒有權限', 'error'); return; }
        const wasNotDone = t.status !== 'done';
        if (t.status === 'done') {
          list[idx] = { ...t, status: 'todo', doneAt: null, doneBy: null };
        } else {
          list[idx] = { ...t, status: 'done', doneAt: Date.now(), doneBy: myName };
        }
        Store.set('ec.bossTasks', list);
        this.render();
        // 由「未完成」→「完成」時通知老闆（取消勾選不通知，避免吵）
        if (wasNotDone) {
          const dueLine = t.due ? '\n📅 預計完成日：' + t.due.replace(/-/g, '/') : '';
          const msg = '✅ 任務完成通知\n' + (t.desc || '')
            + '\n👤 完成者：' + (myName || '未知')
            + dueLine
            + '\n→ 前往儀表板查看 https://kelly83117.github.io/ec-dashboard/';
          this.pushLineNotifyToBoss(msg).then(r => {
            if (r && r.ok) showToast('已通知老闆 LINE', 'info');
            else if (r && !r.skipped) console.warn('[line notify boss]', r);
          });
        }
      });
    });

    // 日期切換：改用左邊月曆點選，月曆本身可以前後翻月（不影響目前選的日期）
    document.querySelectorAll('.dp-cal-day').forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => {
        ensureFilter();
        this.filter.dashboardMarketing.viewDate = btn.dataset.date;
        this.render();
      });
    });
    const calPrevBtn = document.getElementById('dp-cal-prev-month');
    if (calPrevBtn) calPrevBtn.addEventListener('click', () => {
      ensureFilter();
      const cur = this.filter.dashboardMarketing.calMonth || todayStr.slice(0, 7);
      const d = new Date(cur + '-01T00:00:00');
      d.setMonth(d.getMonth() - 1);
      this.filter.dashboardMarketing.calMonth = toDateStr(d).slice(0, 7);
      this.render();
    });
    const calNextBtn = document.getElementById('dp-cal-next-month');
    if (calNextBtn) calNextBtn.addEventListener('click', () => {
      ensureFilter();
      const cur = this.filter.dashboardMarketing.calMonth || todayStr.slice(0, 7);
      const d = new Date(cur + '-01T00:00:00');
      d.setMonth(d.getMonth() + 1);
      this.filter.dashboardMarketing.calMonth = toDateStr(d).slice(0, 7);
      this.render();
    });
    const backTodayBtn = document.getElementById('dp-back-today');
    if (backTodayBtn) backTodayBtn.addEventListener('click', () => {
      ensureFilter();
      this.filter.dashboardMarketing.viewDate = todayStr;
      this.filter.dashboardMarketing.calMonth = todayStr.slice(0, 7);
      this.render();
    });

    // 自動儲存（debounce 1.5s）— 僅當查看「今天」時可寫
    const viewDate = (this.filter.dashboardMarketing && this.filter.dashboardMarketing.viewDate) || todayStr;
    if (viewDate !== todayStr) return; // 歷史日期唯讀

    // 每位同事各自的待同步狀態（誰打過字但還沒推雲端）
    window.__dpPendingNames = window.__dpPendingNames || new Set();
    const updateSyncBadge = () => {
      const btn = document.getElementById('dp-sync-cloud');
      const badge = document.getElementById('dp-sync-badge');
      if (!btn || !badge) return;
      const n = window.__dpPendingNames.size;
      if (n > 0) {
        badge.textContent = n;
        badge.style.display = 'inline-flex';
        btn.style.background = '#fef3c7';
        btn.style.borderColor = '#f59e0b';
        btn.style.color = '#92400e';
      } else {
        badge.style.display = 'none';
        btn.style.background = 'white';
        btn.style.borderColor = '#cbd5e1';
        btn.style.color = '#475569';
      }
    };

    // 只寫本機（不推雲端）+ 標記為 pending
    const normItemsForBind = (v) => {
      if (Array.isArray(v)) return v.slice();
      if (v && String(v).trim()) return [{ id: 'legacy', text: String(v).trim(), done: false }];
      return [];
    };
    const getItemsFor = (name) => {
      const all = Store.get('ec.dailyProgress', {}) || {};
      return normItemsForBind((all[viewDate] || {})[name]);
    };
    const saveProgressItems = (name, items) => {
      const all = Store.get('ec.dailyProgress', {}) || {};
      const day = { ...(all[viewDate] || {}) };
      if (items && items.length) day[name] = items;
      else delete day[name];
      const next = { ...all };
      if (Object.keys(day).length === 0) delete next[viewDate];
      else next[viewDate] = day;
      if (typeof Store.setLocalOnly === 'function') {
        Store.setLocalOnly('ec.dailyProgress', next);
      } else {
        Store.set('ec.dailyProgress', next);
      }
      window.__dpPendingNames.add(name);
      updateSyncBadge();
    };
    const addTodoItem = (name, text) => {
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      const items = getItemsFor(name);
      items.push({ id: genId(), text: trimmed, done: false });
      saveProgressItems(name, items);
      this.render();
    };
    document.querySelectorAll('.dp-todo-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const name = cb.dataset.dpName, id = cb.dataset.itemId;
        const items = getItemsFor(name);
        const item = items.find(it => it.id === id);
        if (item) item.done = cb.checked;
        saveProgressItems(name, items);
        this.render();
      });
    });
    document.querySelectorAll('.dp-todo-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.dpName, id = btn.dataset.itemId;
        saveProgressItems(name, getItemsFor(name).filter(it => it.id !== id));
        this.render();
      });
    });
    document.querySelectorAll('.dp-todo-add-input').forEach(inp => {
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        addTodoItem(inp.dataset.dpName, inp.value);
      });
    });
    document.querySelectorAll('.dp-todo-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.dp-card');
        const inp = card ? card.querySelector('.dp-todo-add-input') : null;
        if (!inp) return;
        addTodoItem(btn.dataset.dpName, inp.value);
      });
    });

    // ☁ 同步雲端按鈕：把本機累積的進度推到雲端
    const syncBtn = document.getElementById('dp-sync-cloud');
    if (syncBtn) {
      updateSyncBadge();
      syncBtn.addEventListener('click', async () => {
        if (window.__dpPendingNames.size === 0) {
          showToast('沒有待同步的進度', 'info');
          return;
        }
        if (typeof Store.pushKeyToCloud !== 'function') {
          this.showAlertModal({ title: '雲端尚未就緒', message: '請重新整理後再試。', kind: 'warn' });
          return;
        }
        syncBtn.disabled = true;
        const originalHtml = syncBtn.innerHTML;
        syncBtn.innerHTML = '<span>☁ 同步中…</span>';
        try {
          await Store.pushKeyToCloud('ec.dailyProgress');
          window.__dpPendingNames.clear();
          syncBtn.innerHTML = originalHtml;
          updateSyncBadge();
          showToast('已同步到雲端 ✓', 'success');
        } catch (e) {
          syncBtn.innerHTML = originalHtml;
          this.showAlertModal({ title: '同步失敗', message: '工作日誌沒推到雲端，請再試。', detail: (e && e.message) || String(e), kind: 'error' });
        } finally {
          syncBtn.disabled = false;
        }
      });
    }

    // 離開頁面前若有未同步，提醒
    if (!window.__dpUnloadGuardInstalled) {
      window.__dpUnloadGuardInstalled = true;
      window.addEventListener('beforeunload', (e) => {
        const n = window.__dpPendingNames ? window.__dpPendingNames.size : 0;
        if (n > 0) {
          e.preventDefault();
          e.returnValue = '';
          return '';
        }
      });
    }
  },
  bindDailyProgress(deptId) {
    // 員工下拉
    const emp = document.getElementById('dp-emp');
    if (emp) emp.addEventListener('change', () => {
      this.filter.dailyProgress.employee = emp.value;
      this.render();
    });
    // 日期區間
    const from = document.getElementById('dp-from');
    if (from) from.addEventListener('change', () => {
      this.filter.dailyProgress.dateFrom = from.value;
      this.render();
    });
    const to = document.getElementById('dp-to');
    if (to) to.addEventListener('change', () => {
      this.filter.dailyProgress.dateTo = to.value;
      this.render();
    });
    // 狀態 pills
    document.querySelectorAll('[data-dp-status]').forEach(p => {
      p.addEventListener('click', () => {
        this.filter.dailyProgress.status = p.dataset.dpStatus;
        this.render();
      });
    });
    // 清除篩選
    document.querySelectorAll('[data-dp-reset]').forEach(p => {
      p.addEventListener('click', () => {
        this.filter.dailyProgress = { employee: 'all', status: 'all', dateFrom: '', dateTo: '' };
        this.render();
      });
    });
    // 新增
    document.querySelectorAll('[data-dp-add]').forEach(p => {
      p.addEventListener('click', () => this.openDailyTaskModal(deptId));
    });
    // 編輯 / 刪除
    document.querySelectorAll('[data-dp-edit]').forEach(p => {
      p.addEventListener('click', () => this.openDailyTaskModal(deptId, p.dataset.dpEdit));
    });
    document.querySelectorAll('[data-dp-del]').forEach(p => {
      p.addEventListener('click', () => this.deleteDailyTask(p.dataset.dpDel));
    });
    // 行內待辦勾選 (timeline 內 checkbox 切換)
    document.querySelectorAll('.dp-todo-tick').forEach(cb => {
      cb.addEventListener('change', () => {
        const taskId = cb.dataset.taskId;
        const todoIdx = +cb.dataset.todoIdx;
        const list = Store.get(Store.KEYS.dailyTasks, []);
        const i = list.findIndex(x => x.id === taskId);
        if (i < 0) return;
        if (!Array.isArray(list[i].todos)) list[i].todos = [];
        if (list[i].todos[todoIdx]) {
          list[i].todos[todoIdx].done = cb.checked;
          Store.set(Store.KEYS.dailyTasks, list);
          this.render();
        }
      });
    });
  },
  openDailyTaskModal(deptId, taskId, prefill) {
    const all = Store.get(Store.KEYS.dailyTasks, []);
    const existing = taskId ? all.find(t => t.id === taskId) : null;
    const isEdit = !!existing;

    const dept = (Store.get(Store.KEYS.departments, [])).find(d => d.id === deptId);
    if (!dept) { showToast('找不到此辦公室', 'error'); return; }
    const members = (Store.get(Store.KEYS.users, [])).filter(u => getUserDepts(u).includes(dept.name));
    // 若是新增，預設員工 = 當前登入者（若是該辦公室成員），否則第一位成員
    const defaultEmp = (this.currentUser && getUserDepts(this.currentUser).includes(dept.name))
      ? this.currentUser.username
      : (members[0]?.username || '');

    const t = existing || {
      employee: defaultEmp,
      date: (prefill && prefill.date) || todayStr(),
      category: TASK_CATEGORY_NAMES[0],
      subcategory: '',
      title: '',
      status: '進行中',
      notes: '',
      todos: [],
      dueDate: '',
    };
    // 舊資料相容
    if (!Array.isArray(t.todos)) t.todos = [];

    if (members.length === 0) {
      showToast(`${dept.name}辦公室尚無成員，請先至帳號管理新增`, 'error');
      return;
    }

    // 建立分類下拉選項
    const categoryOptions = TASK_CATEGORY_NAMES.map(name =>
      `<option value="${escapeHtml(name)}" ${name === t.category ? 'selected' : ''}>${escapeHtml(name)}</option>`
    ).join('');

    // 依分類產生子項下拉的 HTML（支援 optgroup）
    const buildSubOptions = (catName, selected) => {
      const meta = getCategoryMeta(catName);
      if (!meta) return '<option value="">—</option>';
      if (meta.groups) {
        return '<option value="">— 請選擇 —</option>' + meta.groups.map(g =>
          `<optgroup label="${escapeHtml(g.name)}">${g.items.map(it =>
            `<option value="${escapeHtml(it)}" ${it === selected ? 'selected' : ''}>${escapeHtml(it)}</option>`
          ).join('')}</optgroup>`
        ).join('');
      }
      if (meta.items && meta.items.length) {
        return '<option value="">— 請選擇 —</option>' + meta.items.map(it =>
          `<option value="${escapeHtml(it)}" ${it === selected ? 'selected' : ''}>${escapeHtml(it)}</option>`
        ).join('');
      }
      return '<option value="">（此分類無子項）</option>';
    };

    // todos 列表 HTML（每條待辦可複選指派人員）
    // 標籤：根據選了幾個人，顯示「指派 / N 人 / 共同 N 人」
    const buildAssigneeLabel = (selectedUsernames) => {
      const n = selectedUsernames.length;
      if (n === 0) return '👤 指派';
      if (n === 1) {
        const u = members.find(m => m.username === selectedUsernames[0]);
        return `👤 ${u ? u.name : selectedUsernames[0]}`;
      }
      return `👥 共同 ${n} 人`;
    };
    const todoRowHtml = (text, done, idx, assignees = []) => {
      const sel = Array.isArray(assignees) ? assignees : (assignees ? [assignees] : []);
      return `
      <div class="todo-row" data-todo-idx="${idx}" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--bg);border-radius:6px;margin-bottom:4px">
        <input type="checkbox" class="todo-done" ${done ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;flex-shrink:0">
        <input type="text" class="todo-text" value="${escapeHtml(text)}" placeholder="輸入待辦事項" style="flex:1;min-width:0;border:0;background:transparent;font-size:13px;padding:2px;outline:none;${done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">
        <div class="todo-assignees-wrap" data-selected='${JSON.stringify(sel)}' style="position:relative;flex-shrink:0">
          <button type="button" class="todo-assignees-btn" style="padding:3px 8px;border:1px solid var(--border);border-radius:5px;background:white;color:var(--text);font-size:11px;font-family:inherit;cursor:pointer;white-space:nowrap;min-width:80px">${escapeHtml(buildAssigneeLabel(sel))} ▾</button>
          <div class="todo-assignees-pop" style="display:none;position:absolute;top:calc(100% + 4px);right:0;z-index:10000;background:white;border:1px solid var(--border);border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.12);min-width:150px;max-height:240px;overflow-y:auto;padding:4px">
            ${members.map(u => `
              <label style="display:flex;align-items:center;gap:6px;padding:5px 8px;cursor:pointer;font-size:12px;border-radius:4px;transition:background .1s" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" class="todo-assignee-cb" value="${escapeHtml(u.username)}" ${sel.includes(u.username) ? 'checked' : ''} style="width:14px;height:14px;cursor:pointer">
                <span>${escapeHtml(u.name)}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <button type="button" class="todo-del icon-btn" style="width:24px;height:24px;font-size:11px;flex-shrink:0">✕</button>
      </div>
    `;
    };

    this.openModal({
      title: isEdit ? '編輯工作進度' : '新增工作進度',
      bodyHtml: `
        <div class="field-row">
          <div class="field">
            <label>日期</label>
            <input type="date" id="dpf-date" value="${escapeHtml(t.date)}" required>
          </div>
          <div class="field">
            <label>員工</label>
            <select id="dpf-emp" ${isEdit ? 'disabled style="background:var(--bg);color:var(--text-muted)"' : ''}>
              ${members.map(u => `<option value="${escapeHtml(u.username)}" ${u.username === t.employee ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>工作內容分類</label>
            <select id="dpf-category">${categoryOptions}</select>
          </div>
          <div class="field">
            <label>子項</label>
            <select id="dpf-subcategory">${buildSubOptions(t.category, t.subcategory)}</select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>狀態</label>
            <select id="dpf-status">
              ${DAILY_TASK_STATUS_LIST.map(s => `<option value="${escapeHtml(s)}" ${s === t.status ? 'selected' : ''}>${DAILY_TASK_STATUS[s].emoji} ${s}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>預計完成日 <span style="font-size:11px;font-weight:400;color:var(--text-muted)">（選填）</span></label>
            <input type="date" id="dpf-due" value="${escapeHtml(t.dueDate || '')}">
          </div>
        </div>
        <div class="field">
          <label>備註 / 進度說明</label>
          <textarea id="dpf-notes" rows="3" placeholder="說明這次的工作內容、遇到的問題、需要的支援等" style="font-family:inherit;resize:vertical">${escapeHtml(t.notes || '')}</textarea>
        </div>
      `,
      onMount: () => {
        // 分類切換時，子項下拉同步更新
        const catEl = document.getElementById('dpf-category');
        const subEl = document.getElementById('dpf-subcategory');
        if (catEl && subEl) {
          catEl.addEventListener('change', () => {
            subEl.innerHTML = buildSubOptions(catEl.value, '');
          });
        }
        // todos 互動
        const todosWrap = document.getElementById('dpf-todos');
        let todoCounter = t.todos.length;
        if (todosWrap) {
          todosWrap.addEventListener('click', (e) => {
            if (e.target.classList.contains('todo-del')) {
              e.target.closest('.todo-row')?.remove();
              return;
            }
            // 點到指派按鈕 → 切換 popover
            const btn = e.target.closest('.todo-assignees-btn');
            if (btn) {
              const wrap = btn.parentElement;
              const pop = wrap.querySelector('.todo-assignees-pop');
              // 關掉其他開著的 popover
              todosWrap.querySelectorAll('.todo-assignees-pop').forEach(p => {
                if (p !== pop) p.style.display = 'none';
              });
              pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
              return;
            }
          });
          todosWrap.addEventListener('change', (e) => {
            if (e.target.classList.contains('todo-done')) {
              const row = e.target.closest('.todo-row');
              const txt = row?.querySelector('.todo-text');
              if (txt) {
                txt.style.textDecoration = e.target.checked ? 'line-through' : 'none';
                txt.style.color = e.target.checked ? 'var(--text-muted)' : 'var(--text)';
              }
            }
            // 指派 checkbox 變更 → 更新按鈕文字 + data-selected
            if (e.target.classList.contains('todo-assignee-cb')) {
              const wrap = e.target.closest('.todo-assignees-wrap');
              const checks = Array.from(wrap.querySelectorAll('.todo-assignee-cb:checked')).map(c => c.value);
              wrap.dataset.selected = JSON.stringify(checks);
              const btn = wrap.querySelector('.todo-assignees-btn');
              if (btn) btn.innerHTML = escapeHtml(buildAssigneeLabel(checks)) + ' ▾';
            }
          });
        }
        // 點 modal 任何其他地方關掉所有 popover
        document.addEventListener('click', (ev) => {
          if (!ev.target.closest('.todo-assignees-wrap')) {
            document.querySelectorAll('.todo-assignees-pop').forEach(p => { p.style.display = 'none'; });
          }
        });
        const addBtn = document.getElementById('dpf-todo-add');
        if (addBtn && todosWrap) {
          addBtn.addEventListener('click', () => {
            const tmp = document.createElement('div');
            tmp.innerHTML = todoRowHtml('', false, todoCounter++).trim();
            const newRow = tmp.firstChild;
            todosWrap.appendChild(newRow);
            newRow.querySelector('.todo-text')?.focus();
          });
        }
      },
      onSave: () => {
        const date = document.getElementById('dpf-date').value;
        const employee = document.getElementById('dpf-emp').value;
        const category = document.getElementById('dpf-category').value;
        const subcategory = document.getElementById('dpf-subcategory').value;
        const status = document.getElementById('dpf-status').value;
        const dueDate = document.getElementById('dpf-due').value || '';
        const notes = document.getElementById('dpf-notes').value.trim();
        // 待辦事項已從表單移除：編輯時保留原有 todos，新增時為空陣列
        const todos = isEdit ? (Array.isArray(t.todos) ? t.todos : []) : [];

        // 標題自動由「備註首行 → 子項 → 分類」推導，行銷顯示用
        const firstNoteLine = notes.split('\n')[0].trim();
        const title = firstNoteLine.slice(0, 60) || subcategory || category || '(未填寫)';

        if (!date) { showToast('請選擇日期', 'error'); return false; }
        if (!employee) { showToast('請選擇員工', 'error'); return false; }
        if (!category) { showToast('請選擇工作內容分類', 'error'); return false; }
        const empUser = members.find(u => u.username === employee);
        const employeeName = empUser ? empUser.name : employee;

        const list = Store.get(Store.KEYS.dailyTasks, []);
        if (isEdit) {
          const i = list.findIndex(x => x.id === taskId);
          if (i < 0) { showToast('找不到此筆紀錄', 'error'); return false; }
          list[i] = { ...list[i], date, employee, employeeName, category, subcategory, title, status, notes, todos, dueDate };
        } else {
          list.push({
            id: genId(),
            deptId,
            date,
            employee,
            employeeName,
            category,
            subcategory,
            title,
            status,
            notes,
            todos,
            dueDate,
            createdAt: Date.now(),
            createdBy: this.currentUser?.username || '',
          });
        }
        Store.set(Store.KEYS.dailyTasks, list);
        showToast(isEdit ? '已更新' : '已新增', 'success');
        this.render();
        return true;
      },
    });
  },
  deleteDailyTask(id) {
    const list = Store.get(Store.KEYS.dailyTasks, []);
    const t = list.find(x => x.id === id);
    if (!t) return;
    if (this.currentUser.role !== 'admin' && this.currentUser.username !== t.employee) {
      showToast('僅本人或管理員可刪除', 'error');
      return;
    }
    if (!confirm(`確定要刪除「${t.title}」？`)) return;
    Store.set(Store.KEYS.dailyTasks, list.filter(x => x.id !== id));
    showToast('已刪除', 'success');
    this.render();
  },
  openQuickTodoModal(deptId, taskId, opts) {
    const showDelete = !!(opts && opts.showDelete);
    const dept = (Store.get(Store.KEYS.departments, [])).find(d => d.id === deptId);
    if (!dept) { showToast('找不到此辦公室', 'error'); return; }
    const members = (Store.get(Store.KEYS.users, [])).filter(u => getUserDepts(u).includes(dept.name));
    if (members.length === 0) {
      showToast(`${dept.name}辦公室尚無成員，請先至帳號管理新增`, 'error');
      return;
    }
    const defaultEmp = (this.currentUser && getUserDepts(this.currentUser).includes(dept.name))
      ? this.currentUser.username
      : (members[0]?.username || '');

    // 編輯模式：讀現有任務並填入預設值
    let editing = null;
    let initType = 'self', initText = '', initAssignees = [];
    let initDate = todayStr(), initDue = '', initCategory = '', initStatus = '進行中';
    if (taskId) {
      const all = Store.get(Store.KEYS.dailyTasks, []);
      editing = all.find(x => x.id === taskId);
      if (!editing) { showToast('找不到此筆紀錄', 'error'); return; }
      initText = editing.todos?.[0]?.text || editing.title || '';
      initDate = editing.date || todayStr();
      initDue = editing.dueDate || '';
      initCategory = editing.category || '';
      initStatus = editing.status || '進行中';
      const td0 = editing.todos?.[0] || {};
      initAssignees = Array.isArray(td0.assignees) && td0.assignees.length
        ? td0.assignees
        : (td0.assignee ? [td0.assignee] : []);
      // 推斷類型
      if (editing.assignmentType) {
        initType = editing.assignmentType;
      } else if (initAssignees.length >= 2) {
        initType = 'shared';
      } else if (initAssignees.length === 1 && editing.employee !== initAssignees[0]) {
        initType = 'assigned';
      } else {
        initType = 'self';
      }
    }

    this.openModal({
      title: taskId ? '編輯待辦事項' : '新增待辦事項',
      bodyHtml: `
        <div class="field">
          <label>類型</label>
          <div id="qtf-type-pills" style="display:flex;gap:4px;background:#f3f4f6;padding:3px;border-radius:8px">
            <label data-type-pill="self" style="flex:1;padding:8px 10px;text-align:center;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;color:#9ca3af;transition:all .15s">
              <input type="radio" name="qtf-type" value="self" ${initType === 'self' ? 'checked' : ''} style="display:none">
              🙋 自己做
            </label>
            <label data-type-pill="assigned" style="flex:1;padding:8px 10px;text-align:center;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;color:#9ca3af;transition:all .15s">
              <input type="radio" name="qtf-type" value="assigned" ${initType === 'assigned' ? 'checked' : ''} style="display:none">
              👤 指派他人
            </label>
            <label data-type-pill="shared" style="flex:1;padding:8px 10px;text-align:center;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;color:#9ca3af;transition:all .15s">
              <input type="radio" name="qtf-type" value="shared" ${initType === 'shared' ? 'checked' : ''} style="display:none">
              👥 共同
            </label>
          </div>
        </div>
        <div class="field">
          <label>待辦內容</label>
          <input id="qtf-text" value="${escapeHtml(initText)}" placeholder="例：寄送 EDM 給合作品牌" required autofocus>
        </div>
        <div class="field" id="qtf-assigned-wrap" style="display:${initType === 'assigned' ? 'block' : 'none'}">
          <label>指派給</label>
          <select id="qtf-assigned-sel">
            ${members.filter(u => u.username !== defaultEmp).map(u => `<option value="${escapeHtml(u.username)}" ${initAssignees.includes(u.username) ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field" id="qtf-shared-wrap" style="display:${initType === 'shared' ? 'block' : 'none'}">
          <label>參與人員（可複選）</label>
          <div id="qtf-shared-list" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;border:1px solid var(--border);border-radius:6px;background:#fcfcfd;max-height:140px;overflow-y:auto">
            ${members.map(u => {
              const checked = initType === 'shared'
                ? initAssignees.includes(u.username)
                : (u.username === defaultEmp);
              return `
              <label style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border:1px solid var(--border);border-radius:5px;background:white;cursor:pointer;font-size:12px">
                <input type="checkbox" class="qtf-shared-cb" value="${escapeHtml(u.username)}" ${checked ? 'checked' : ''} style="width:14px;height:14px">
                ${escapeHtml(u.name)}
              </label>
              `;
            }).join('')}
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>開始日期</label>
            <input type="date" id="qtf-date" value="${escapeHtml(initDate)}" required>
          </div>
          <div class="field">
            <label>預計完成日 <span style="font-size:11px;font-weight:400;color:var(--text-muted)">（選填）</span></label>
            <input type="date" id="qtf-due" value="${escapeHtml(initDue)}">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>分類（選填）</label>
            <select id="qtf-category">
              <option value="">— 不指定 —</option>
              ${TASK_CATEGORY_NAMES.map(name => `<option value="${escapeHtml(name)}" ${name === initCategory ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>狀態</label>
            <select id="qtf-status">
              ${DAILY_TASK_STATUS_LIST.map(s => `<option value="${escapeHtml(s)}" ${s === initStatus ? 'selected' : ''}>${DAILY_TASK_STATUS[s].emoji} ${s}</option>`).join('')}
            </select>
          </div>
        </div>
      `,
      onMount: () => {
        const txt = document.getElementById('qtf-text');
        if (txt) { txt.focus(); txt.select && txt.select(); }
        // 類型切換
        const assignedWrap = document.getElementById('qtf-assigned-wrap');
        const sharedWrap = document.getElementById('qtf-shared-wrap');
        const pills = document.querySelectorAll('[data-type-pill]');
        const updateType = () => {
          const v = document.querySelector('input[name="qtf-type"]:checked')?.value || 'self';
          assignedWrap.style.display = v === 'assigned' ? 'block' : 'none';
          sharedWrap.style.display = v === 'shared' ? 'block' : 'none';
          pills.forEach(p => {
            const isActive = p.dataset.typePill === v;
            p.style.background = isActive ? 'white' : 'transparent';
            p.style.color = isActive ? (v === 'self' ? '#1e40af' : (v === 'assigned' ? '#5b21b6' : '#92400e')) : '#9ca3af';
            p.style.boxShadow = isActive ? '0 1px 2px rgba(0,0,0,.06)' : 'none';
          });
        };
        pills.forEach(p => p.addEventListener('click', () => {
          p.querySelector('input').checked = true;
          updateType();
        }));
        // 初次套用當前選中類型的樣式
        updateType();
      },
      saveLabel: taskId ? '儲存' : '新增',
      onDelete: (taskId && showDelete) ? () => {
        const editingNow = (Store.get(Store.KEYS.dailyTasks, [])).find(x => x.id === taskId);
        const titleForConfirm = editingNow?.title || editingNow?.todos?.[0]?.text || '此筆待辦';
        if (!confirm(`確定要刪除「${titleForConfirm}」？\n\n這個動作無法復原。`)) return false;
        const list2 = Store.get(Store.KEYS.dailyTasks, []);
        const j = list2.findIndex(x => x.id === taskId);
        if (j < 0) { showToast('找不到此筆紀錄', 'error'); return false; }
        list2.splice(j, 1);
        Store.set(Store.KEYS.dailyTasks, list2);
        showToast('已刪除', 'success');
        this.render();
        return true;
      } : null,
      onSave: () => {
        const type = document.querySelector('input[name="qtf-type"]:checked')?.value || 'self';
        const date = document.getElementById('qtf-date').value;
        const dueDate = document.getElementById('qtf-due').value || '';
        const category = document.getElementById('qtf-category').value;
        const status = document.getElementById('qtf-status').value || '進行中';
        const text = document.getElementById('qtf-text').value.trim();
        if (!date) { showToast('請選擇開始日期', 'error'); return false; }
        if (!text) { showToast('請填寫待辦內容', 'error'); return false; }

        // 解析類型 → 決定 owner（task.employee）跟 assignees
        let ownerUsername = defaultEmp;
        let assignees = [];
        if (type === 'self') {
          ownerUsername = (editing && editing.assignmentType === 'self') ? editing.employee : defaultEmp;
          assignees = [];
        } else if (type === 'assigned') {
          ownerUsername = document.getElementById('qtf-assigned-sel').value;
          if (!ownerUsername) { showToast('請選擇要指派的人員', 'error'); return false; }
          assignees = [ownerUsername];
        } else if (type === 'shared') {
          const checks = Array.from(document.querySelectorAll('.qtf-shared-cb:checked')).map(c => c.value);
          if (checks.length < 2) { showToast('共同類型至少要選 2 個人員', 'error'); return false; }
          assignees = checks;
          ownerUsername = (editing && editing.assignmentType === 'shared') ? editing.employee : defaultEmp;
        }

        const ownerUser = members.find(u => u.username === ownerUsername);
        const ownerName = ownerUser ? ownerUser.name : ownerUsername;
        const assigneeNames = assignees.map(un => {
          const u = members.find(m => m.username === un);
          return u ? u.name : un;
        });
        const title = text.slice(0, 60);

        const list = Store.get(Store.KEYS.dailyTasks, []);
        if (taskId) {
          // 編輯模式：以原任務為基礎更新
          const i = list.findIndex(x => x.id === taskId);
          if (i < 0) { showToast('找不到此筆紀錄', 'error'); return false; }
          const prev = list[i];
          list[i] = {
            ...prev,
            date,
            dueDate,
            employee: ownerUsername,
            employeeName: ownerName,
            category: category || '',
            title,
            status,
            todos: [{
              ...(prev.todos?.[0] || {}),
              text,
              assignees,
              assigneeNames,
              assignee: assignees[0] || '',
              assigneeName: assigneeNames[0] || '',
            }],
            assignmentType: type,
          };
          Store.set(Store.KEYS.dailyTasks, list);
          showToast('已更新待辦事項', 'success');
        } else {
          list.push({
            id: genId(),
            deptId,
            date,
            dueDate,
            employee: ownerUsername,
            employeeName: ownerName,
            category: category || '',
            subcategory: '',
            title,
            status,
            notes: '',
            todos: [{
              text,
              done: false,
              assignees,
              assigneeNames,
              assignee: assignees[0] || '',
              assigneeName: assigneeNames[0] || '',
            }],
            assignmentType: type,
            createdAt: Date.now(),
            createdBy: this.currentUser?.username || '',
          });
          Store.set(Store.KEYS.dailyTasks, list);
          showToast('已新增待辦事項', 'success');
        }
        this.render();
        return true;
      },
    });
  },
});
