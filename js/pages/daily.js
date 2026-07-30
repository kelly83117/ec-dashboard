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
    // 月曆待辦事項條的淡色底：左邊一條深色，底色用淡色，不要整條實色
    const PERSON_LIGHT = {
      '陳君葳': { bg: '#ede9fe', text: '#6d28d9' },
      '洪嘉蓮': { bg: '#dbeafe', text: '#1d4ed8' },
      '郭雅琪': { bg: '#fef3c7', text: '#92400e' },
    };
    const users = Store.get(Store.KEYS.users, []);
    const now = new Date();
    const todayStr = toDateStr(now);
    const isAdmin = this.currentUser && this.currentUser.role === 'admin';
    const myName = (this.currentUser && (this.currentUser.name || this.currentUser.username)) || '';
    // 舊欄位 canManageLineNotify 仍兼容；新版改用 officeFeatures['行銷'].includes('lineNotify')
    const canManageLine = isAdmin
      || hasOfficeFeature(this.currentUser, '行銷', 'lineNotify')
      || (this.currentUser && this.currentUser.canManageLineNotify === true);

    if (!this.filter.dashboardMarketing) this.filter.dashboardMarketing = {};
    const f = this.filter.dashboardMarketing;
    if (!f.viewDate) f.viewDate = todayStr;
    const viewDate = f.viewDate;
    const isToday = viewDate === todayStr;
    // 過去日期唯讀（保留歷史紀錄不能改），今天和未來日期都可以新增待辦事項（方便先排之後要做的事）
    const isEditable = viewDate >= todayStr;
    const dateDisplay = viewDate.replace(/-/g, '/');
    if (!f.calMonth) f.calMonth = viewDate.slice(0, 7);
    const calMonth = f.calMonth;
    const allProgressForCal = Store.get('ec.dailyProgress', {}) || {};

    // 老闆指派的任務：以卡片形式放在右邊待辦事項最上面，已完成的收進「歷史」
    const bossTasks = (Store.get('ec.bossTasks', []) || []).slice();
    const doneCount = bossTasks.filter(t => t.status === 'done').length;
    const pendingBossTasks = bossTasks.filter(t => t.status !== 'done').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const bossStatusChip = pendingBossTasks.length === 0
      ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#d1fae5;color:#047857;font-size:11px;font-weight:600">✓ 全部完成</span>`
      : `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600">${pendingBossTasks.length} 筆待處理</span>`;
    const bossItemRows = pendingBossTasks.map(t => {
      const assigneeColor = t.assignee === '全體' ? '#f59e0b' : (PERSON_COLORS[t.assignee] || '#f59e0b');
      const canToggle = isAdmin || t.assignee === '全體' || t.assignee === myName;
      return `
        <div class="dp-todo-row" data-task-id="${escapeHtml(t.id)}" style="display:flex;align-items:center;gap:8px;padding:6px 2px;border-bottom:1px solid #f3f4f6">
          <span style="color:${assigneeColor};font-size:13px;flex-shrink:0">●</span>
          <span style="flex:1;min-width:0;font-size:13px;color:var(--text);word-break:break-word">${escapeHtml(t.desc || '')}</span>
          <span style="font-size:10px;color:var(--text-muted);flex-shrink:0;white-space:nowrap">${escapeHtml(t.assignee || '')}</span>
          <input type="checkbox" class="boss-task-toggle" data-task-id="${escapeHtml(t.id)}" ${canToggle ? '' : 'disabled'} style="width:16px;height:16px;cursor:${canToggle ? 'pointer' : 'not-allowed'};flex-shrink:0">
          ${isAdmin ? `
            <button class="boss-task-edit" data-task-id="${escapeHtml(t.id)}" title="編輯" style="border:0;background:none;color:#94a3b8;cursor:pointer;font-size:12px;flex-shrink:0">✎</button>
            <button class="boss-task-del" data-task-id="${escapeHtml(t.id)}" title="刪除" style="border:0;background:none;color:#d1d5db;cursor:pointer;font-size:13px;flex-shrink:0">✕</button>
          ` : ''}
        </div>
      `;
    }).join('');
    const bossEmptyHint = pendingBossTasks.length === 0 ? `<div style="padding:10px 2px;color:var(--text-muted);font-size:12.5px">目前沒有指派中的任務</div>` : '';
    const bossCardHtml = `
      <div class="dp-card" style="background:white;border:1px solid var(--border);border-radius:10px;padding:14px 14px 12px;display:flex;flex-direction:column;gap:8px;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <div style="width:38px;height:38px;border-radius:50%;background:#f59e0b;color:white;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">📋</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--text)">老闆指派任務</div>
            <div style="margin-top:2px">${bossStatusChip}</div>
          </div>
        </div>
        <div class="dp-todo-list">${bossItemRows}${bossEmptyHint}</div>
      </div>
    `;

    const allProgress = Store.get('ec.dailyProgress', {}) || {};
    const dayProgress = allProgress[viewDate] || {};
    // 舊資料是一整段文字，第一次在新版打勾清單顯示時包成一筆項目，不會不見
    // v163 起：舊字串裡若含「【洞察表 · 今日調整】」/「【淨利表 · 今日調整】」段落，
    //   parse 出來包成結構化 auto item（render 才能走 chip 卡片版），剩下純使用者文字包 legacy todo
    const INSIGHT_LINE_RE = /\d+\.\s+\S+\s+(\S+?)\s+(\d+)\s*個/g;
    const PROFIT_LINE_RE  = /\d+\.\s+(\S+?)\s+(\d+)\s*個/g;
    const parseLegacyAuto = (text) => {
      let residual = text;
      const items = [];
      const iMatch = residual.match(/【洞察表 · 今日調整】([\s\S]*?)(?=\n\n【|$)/);
      if (iMatch) {
        const counts = {};
        let m; INSIGHT_LINE_RE.lastIndex = 0;
        while ((m = INSIGHT_LINE_RE.exec(iMatch[1])) !== null) counts[m[1]] = parseInt(m[2], 10);
        if (Object.keys(counts).length > 0) items.push({ id: 'auto-insight-legacy', kind: 'insight-summary', counts, done: false, auto: true });
        residual = residual.replace(iMatch[0], '');
      }
      const pMatch = residual.match(/【淨利表 · 今日調整】([\s\S]*?)(?=\n\n【|$)/);
      if (pMatch) {
        const counts = {};
        let m; PROFIT_LINE_RE.lastIndex = 0;
        while ((m = PROFIT_LINE_RE.exec(pMatch[1])) !== null) counts[m[1]] = parseInt(m[2], 10);
        if (Object.keys(counts).length > 0) items.push({ id: 'auto-profit-legacy', kind: 'profit-summary', counts, done: false, auto: true });
        residual = residual.replace(pMatch[0], '');
      }
      return { autoItems: items, userText: residual.trim() };
    };
    const normItems = (v) => {
      if (Array.isArray(v)) return v;
      if (v && String(v).trim()) {
        const raw = String(v).trim();
        // 沒含 auto 段落頭 → 老 legacy 純文字，走原路徑
        if (raw.indexOf('【洞察表 · 今日調整】') < 0 && raw.indexOf('【淨利表 · 今日調整】') < 0) {
          return [{ id: 'legacy', text: raw, done: false }];
        }
        const { autoItems, userText } = parseLegacyAuto(raw);
        const out = autoItems.slice();
        if (userText) out.push({ id: 'legacy', text: userText, done: false });
        return out;
      }
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
      // 統計「已完成 / 全部」只算使用者自己的待辦，自動摘要卡不計
      const userItems = p.items.filter(it => it && !it.kind);
      const doneCount = userItems.filter(it => it.done).length;
      const statusChip = userItems.length === 0
        ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600">尚未填</span>`
        : doneCount === userItems.length
          ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#d1fae5;color:#047857;font-size:11px;font-weight:600">✓ 全部完成</span>`
          : `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:#e0e7ff;color:#4338ca;font-size:11px;font-weight:600">${doneCount}/${userItems.length} 已完成</span>`;
      const avatarHtml = p.avatar
        ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.name)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:38px;height:38px;border-radius:50%;background:${PERSON_COLORS[p.name]};color:white;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;flex-shrink:0">${escapeHtml(initial)}</div>`;
      // 自動摘要 item 專用 render：分類 chips + 顏色區塊，沒 checkbox 也沒 ✕
      // 顏色跟洞察表本身 classifyMetrics 的 GROW / DROP / CONV 三大群完全對齊
      //   下滑類（重跌品 / 衰退品）→ 橘紅
      //   成長類（爆發品 / 成長品）→ 黃
      //   轉換類（零轉換 / 弱轉換 / 轉換偏低）→ 綠
      const INSIGHT_ORDER = ['重跌品', '衰退品', '爆發品', '成長品', '零轉換', '弱轉換', '轉換偏低'];
      const GROUP_DROP = { bg:'#ffedd5', fg:'#c2410c' }; // 下滑類：橘 (marketing.js:236)
      const GROUP_GROW = { bg:'#fef9c3', fg:'#a16207' }; // 成長類：黃 (marketing.js:235)
      const GROUP_CONV = { bg:'#dcfce7', fg:'#15803d' }; // 轉換類：綠 (marketing.js:237)
      const INSIGHT_STYLE = {
        '重跌品':   { emoji:'🔴', ...GROUP_DROP },
        '衰退品':   { emoji:'🟥', ...GROUP_DROP },
        '爆發品':   { emoji:'🟡', ...GROUP_GROW },
        '成長品':   { emoji:'🟨', ...GROUP_GROW },
        '零轉換':   { emoji:'❎', ...GROUP_CONV },
        '弱轉換':   { emoji:'🟢', ...GROUP_CONV },
        '轉換偏低': { emoji:'🟩', ...GROUP_CONV },
      };
      const PROFIT_ORDER = ['高利潤商品', '賠錢中', '低淨利', '危險商品', '低效廣告'];
      const PROFIT_STYLE = {
        '高利潤商品': { bg:'#dcfce7', fg:'#166534' },
        '賠錢中':     { bg:'#fee2e2', fg:'#991b1b' },
        '低淨利':     { bg:'#fef3c7', fg:'#92400e' },
        '危險商品':   { bg:'#fecaca', fg:'#7f1d1d' },
        '低效廣告':   { bg:'#e0e7ff', fg:'#3730a3' },
        '其他':       { bg:'#f3f4f6', fg:'#374151' },
      };
      const renderSummaryCard = (opts) => {
        // clickable（預設 false）：chip 改成 <button class="ins-chip">，點擊由 bindWeeklyCalendar
        //   的既有委派接手開 openInsightDetailModal；顏色只經 --chip-bg / --chip-fg CSS 變數傳
        const chipInner = (c) => `${c.emoji ? `<span>${c.emoji}</span>` : ''}<span>${escapeHtml(c.label)}</span><span style="opacity:.7">·</span><strong>${c.count}</strong>`;
        const chipsHtml = opts.chips.map(c => opts.clickable ? `
          <button type="button" class="ins-chip" style="--chip-bg:${c.bg};--chip-fg:${c.fg}"
                  data-ins-person="${escapeHtml(p.name)}" data-ins-date="${escapeHtml(viewDate)}" data-ins-label="${escapeHtml(c.label)}">
            ${chipInner(c)}
          </button>` : `
          <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:${c.bg};color:${c.fg};font-size:12px;font-weight:600;line-height:1.4;white-space:nowrap">
            ${chipInner(c)}
          </span>`).join('');
        return `
          <div class="dp-summary-card" style="background:${opts.headBg};border-left:3px solid ${opts.headColor};border-radius:6px;padding:8px 10px 9px;margin:2px 0 4px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
              <span style="font-size:11px;font-weight:700;color:${opts.headColor};letter-spacing:.02em">${escapeHtml(opts.title)}</span>
              <span style="font-size:10px;color:${opts.headColor};opacity:.7;font-weight:500">自動更新</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">${chipsHtml}</div>
          </div>`;
      };
      const renderItem = (it) => {
        if (it && it.kind === 'insight-summary') {
          const counts = it.counts || {};
          const keys = INSIGHT_ORDER.filter(k => counts[k]);
          if (keys.length === 0) return '';
          const chips = keys.map(k => ({ label:k, count:counts[k], ...(INSIGHT_STYLE[k]||{}) }));
          return renderSummaryCard({ title:'洞察表 · 今日調整', headBg:'#faf5ff', headColor:'#7e22ce', chips, clickable:true });
        }
        if (it && it.kind === 'profit-summary') {
          const counts = it.counts || {};
          const orderedKeys = [...PROFIT_ORDER.filter(k => counts[k]), ...Object.keys(counts).filter(k => !PROFIT_ORDER.includes(k))];
          if (orderedKeys.length === 0) return '';
          const chips = orderedKeys.map(k => ({ label:k, count:counts[k], emoji:'', ...(PROFIT_STYLE[k]||PROFIT_STYLE['其他']) }));
          return renderSummaryCard({ title:'淨利表 · 今日調整', headBg:'#eff6ff', headColor:'#1d4ed8', chips });
        }
        return `
        <div class="dp-todo-row" data-item-id="${escapeHtml(it.id)}" style="display:flex;align-items:center;gap:8px;padding:6px 2px;border-bottom:1px solid #f3f4f6">
          <span style="color:${PERSON_COLORS[p.name]};font-size:13px;flex-shrink:0">●</span>
          <span style="flex:1;min-width:0;font-size:13px;color:${it.done ? '#9ca3af' : 'var(--text)'};text-decoration:${it.done ? 'line-through' : 'none'};word-break:break-word">${escapeHtml(it.text)}</span>
          <input type="checkbox" class="dp-todo-check" data-item-id="${escapeHtml(it.id)}" data-dp-name="${escapeHtml(p.name)}" ${it.done ? 'checked' : ''} ${isEditable ? '' : 'disabled'} style="width:16px;height:16px;cursor:${isEditable ? 'pointer' : 'default'};flex-shrink:0">
          ${it.done ? '<span style="font-size:10.5px;color:#10b981;font-weight:700;flex-shrink:0">已完成</span>' : ''}
          ${isEditable ? `<button class="dp-todo-del" data-item-id="${escapeHtml(it.id)}" data-dp-name="${escapeHtml(p.name)}" title="刪除" style="border:0;background:none;color:#d1d5db;cursor:pointer;font-size:13px;flex-shrink:0">✕</button>` : ''}
        </div>`;
      };
      const itemRows = p.items.map(renderItem).join('');
      const emptyHint = p.items.length === 0 ? `<div style="padding:10px 2px;color:var(--text-muted);font-size:12.5px">${isEditable ? '還沒有待辦事項' : '這天沒有紀錄'}</div>` : '';
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
          ${isEditable ? `
            <div style="display:flex;gap:6px;margin-top:2px">
              <input type="text" class="dp-todo-add-input" data-dp-name="${escapeHtml(p.name)}" placeholder="新增待辦事項，按 Enter 加入"
                style="flex:1;min-width:0;padding:7px 10px;border:1px solid var(--border);border-radius:7px;font-family:inherit;font-size:13px;color:var(--text)">
              <button class="dp-todo-add-btn" data-dp-name="${escapeHtml(p.name)}" style="padding:7px 12px;border:0;border-radius:7px;background:var(--primary-soft);color:var(--primary);font-size:13px;font-weight:600;cursor:pointer">+</button>
            </div>
          ` : ''}
          ${buildCardAdjustmentsHtml(p.name, viewDate)}
        </div>
      `;
    }).join('');

    // 左邊月曆：可以直接點日期切換查看，格子裡直接顯示當天每個人的待辦事項（跟右邊卡片同步），方便回頭找哪一天做過什麼
    const [calY, calM] = calMonth.split('-').map(Number);
    const firstWeekday = new Date(calY, calM - 1, 1).getDay();
    const daysInMonth = new Date(calY, calM, 0).getDate();
    const MAX_CAL_BARS = 5;
    const calCells = [];
    for (let i = 0; i < firstWeekday; i++) calCells.push('<div></div>');
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calY}-${String(calM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isCellToday = dateStr === todayStr;
      const isCellSelected = dateStr === viewDate;
      const dayEntries = allProgressForCal[dateStr] || {};
      const dayItems = [];
      ALLOWED_NAMES.forEach(n => {
        const v = dayEntries[n];
        const arr = Array.isArray(v) ? v : (v && String(v).trim() ? [{ text: String(v).trim(), done: false }] : []);
        // 自動摘要 item (kind: 'insight-summary' | 'profit-summary') 不塞進月曆條列
        arr.forEach(it => {
          if (!it || it.kind) return;
          dayItems.push({ text: it.text, done: !!it.done, color: PERSON_COLORS[n], light: PERSON_LIGHT[n] });
        });
      });
      const shownItems = dayItems.slice(0, MAX_CAL_BARS);
      const extraCount = dayItems.length - shownItems.length;
      const barsHtml = shownItems.map(it => `
        <div style="display:flex;align-items:stretch;background:${it.light.bg};border-radius:4px;overflow:hidden;width:100%;box-sizing:border-box;opacity:${it.done ? '0.55' : '1'}">
          <span style="width:3px;flex-shrink:0;background:${it.color}"></span>
          <span style="flex:1;min-width:0;font-size:10px;line-height:1.6;padding:1px 5px;color:${it.light.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:${it.done ? 'line-through' : 'none'}">${escapeHtml(it.text)}</span>
        </div>
      `).join('');
      const extraHtml = extraCount > 0 ? `<div style="font-size:9.5px;color:var(--text-muted);padding-left:2px">+${extraCount}</div>` : '';
      // 第三塊：當日淨利表調整筆數，每人一行，置於 todo 橫條上方。用既有 getAdjIndex()（不重解析），
      //   依 ADJ_SHOP_TO_PERSON 歸人，ALLOWED_NAMES 順序，只顯示有筆數的人（天然上限 3，不與 MAX_CAL_BARS 合併）。
      //   顏色走 PERSON_COLORS / PERSON_LIGHT，用 CSS 變數傳給 css/daily-adjustments.css 的排版規則。
      const adjDay = getAdjIndex()[dateStr.replace(/-/g, '/')] || [];
      const adjCountByPerson = {};
      adjDay.forEach(r => {
        const person = ADJ_SHOP_TO_PERSON[r.shop];
        if (person) adjCountByPerson[person] = (adjCountByPerson[person] || 0) + 1;
      });
      const adjRowsHtml = ALLOWED_NAMES
        .filter(n => adjCountByPerson[n])
        .map(n => `<div class="adj-cal-row" style="--adj-cal-c:${PERSON_COLORS[n]};--adj-cal-bg:${PERSON_LIGHT[n].bg};--adj-cal-fg:${PERSON_LIGHT[n].text}"><span class="adj-cal-stripe"></span><span class="adj-cal-label"><span class="adj-cal-name">${escapeHtml(n.slice(0, 1))}</span><span class="adj-cal-num">${adjCountByPerson[n]}</span></span></div>`)
        .join('');
      const numBg = isCellSelected ? 'var(--primary)' : isCellToday ? 'var(--primary-soft)' : 'transparent';
      const numColor = isCellSelected ? 'white' : isCellToday ? 'var(--primary)' : 'var(--text)';
      calCells.push(`
        <button class="dp-cal-day" data-date="${dateStr}"
          style="position:relative;min-width:0;min-height:130px;border:${isCellSelected ? '2px solid var(--primary)' : '1px solid #f1f5f9'};border-radius:10px;background:white;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:6px;gap:3px;overflow:hidden">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${numBg};color:${numColor};font-size:13px;font-weight:${isCellSelected || isCellToday ? '700' : '500'};flex-shrink:0">${d}</span>
          <div style="display:flex;flex-direction:column;gap:2px;width:100%">${adjRowsHtml}${barsHtml}${extraHtml}</div>
        </button>
      `);
    }
    const legendHtml = ALLOWED_NAMES.map(n => `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted)"><span style="width:7px;height:7px;border-radius:50%;background:${PERSON_COLORS[n]}"></span>${escapeHtml(n)}</span>`).join('');
    const calendarHtml = `
      <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:20px;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <button id="dp-cal-prev-month" style="border:0;background:none;cursor:pointer;font-size:20px;color:var(--text-muted);padding:2px 10px">‹</button>
          <div style="font-size:18px;font-weight:700">${calY}年${calM}月</div>
          <button id="dp-cal-next-month" style="border:0;background:none;cursor:pointer;font-size:20px;color:var(--text-muted);padding:2px 10px">›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;font-size:13px;color:var(--text-muted);text-align:center;margin-bottom:10px">
          <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">${calCells.join('')}</div>
        <div style="display:flex;gap:16px;justify-content:center;margin-top:16px">${legendHtml}</div>
        ${!isToday ? `<button id="dp-back-today" style="width:100%;margin-top:12px;padding:8px;border:0;border-radius:6px;background:var(--primary-soft);color:var(--primary);font-size:13px;font-weight:600;cursor:pointer">回到今天</button>` : ''}
      </div>
    `;

    return `
      <div style="background:#fcfcfd;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px 16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div style="min-width:0">
            <h3 style="margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em">每日工作進度 · ${escapeHtml(dateDisplay)}${isToday ? '<span style="margin-left:8px;font-size:11px;font-weight:500;color:var(--primary);background:var(--primary-soft);padding:2px 8px;border-radius:999px">今天</span>' : ''}</h3>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            ${isEditable ? `<button id="dp-sync-cloud" title="把進度上傳到雲端，同事才看得到" style="padding:5px 12px;border:1px solid #cbd5e1;background:white;border-radius:6px;font-size:12px;color:#475569;cursor:pointer;display:inline-flex;align-items:center;gap:6px"><span>☁ 同步雲端</span><span id="dp-sync-badge" style="display:none;min-width:18px;height:18px;padding:0 5px;background:#ef4444;color:white;border-radius:9px;font-size:10px;font-weight:700;align-items:center;justify-content:center;line-height:1">0</span></button>` : ''}
            <button id="boss-task-history" title="查看已完成的歷史任務" style="padding:5px 11px;border:1px solid #cbd5e1;background:white;border-radius:6px;font-size:12px;color:#475569;cursor:pointer;display:inline-flex;align-items:center;gap:5px">📜 歷史 (${doneCount})</button>
            ${isAdmin ? `<button id="boss-task-add" style="padding:5px 12px;border:0;border-radius:6px;background:#f59e0b;color:white;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px">+ 新增任務</button>` : ''}
            ${canManageLine ? `<button id="boss-task-line-cfg" title="LINE 通知設定" style="padding:5px 11px;border:1px solid #cbd5e1;background:white;border-radius:6px;font-size:12px;color:#475569;cursor:pointer;display:inline-flex;align-items:center;gap:5px">⚙️ LINE 通知</button>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">
          ${calendarHtml}
          <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
            ${bossCardHtml}
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
          // 同步把這筆任務加進被指派人今天的待辦事項清單，不用自己再打一次
          const allProgress = Store.get('ec.dailyProgress', {}) || {};
          const nextProgress = { ...allProgress };
          const todayEntry = { ...(nextProgress[todayStr] || {}) };
          recipients.forEach(name => {
            const existingItems = Array.isArray(todayEntry[name]) ? todayEntry[name].slice() : [];
            existingItems.push({ id: genId(), text, done: false, bossTaskId: newTask.id });
            todayEntry[name] = existingItems;
          });
          nextProgress[todayStr] = todayEntry;
          Store.set('ec.dailyProgress', nextProgress);
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

    // 第六塊：淨利表調整 pill → 開明細彈窗。用「事件委派」掛在持久容器 #main-content 上，
    //   且只掛一次（旗標守衛，避免每次 render 重複掛而觸發多次）。放函式開頭：下方 748 行
    //   有「過去日期唯讀」的提早 return，若把綁定放末端，看過去日期時永遠跑不到。
    //   委派讀當下 DOM 的 dataset，所以之後每次 render 產生的新 pill 都自動生效。
    if (!this._adjPillDelegated) {
      this._adjPillDelegated = true;
      const host = document.getElementById('main-content');
      if (host) host.addEventListener('click', (e) => {
        // 本期優化進度：點通路列 → 展開/收折同卡片內對應明細（同委派，讀當下 DOM）
        const toggle = e.target.closest && e.target.closest('.adj-prog-toggle');
        if (toggle) {
          const shop = toggle.dataset.progShop || '';
          const card = toggle.closest('.dp-card') || document;
          const sel = (window.CSS && CSS.escape) ? CSS.escape(shop) : shop;
          const detail = card.querySelector(`[data-prog-detail="${sel}"]`);
          if (detail) {
            detail.hidden = !detail.hidden;
            const caret = toggle.querySelector('.adj-prog-caret');
            if (caret) caret.textContent = detail.hidden ? '▾' : '▴';
          }
          return;
        }
        // 洞察表「今日調整」chip → 開洞察明細彈窗（同委派，讀當下 DOM 的 dataset）
        const insChip = e.target.closest && e.target.closest('.ins-chip');
        if (insChip) {
          this.openInsightDetailModal(insChip.dataset.insPerson, insChip.dataset.insDate, insChip.dataset.insLabel);
          return;
        }
        const pill = e.target.closest && e.target.closest('.adj-pill');
        if (!pill) return;
        this.openAdjustmentDetailModal(pill.dataset.adjPerson, pill.dataset.adjDate, pill.dataset.adjKind, pill.dataset.adjGroup);
      });
    }

    // 老闆任務：新增 / 編輯 / 刪除 / 切換完成 / 歷史 / LINE 設定
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
        if (b.disabled) { showToast('沒有權限', 'error'); return; }
        const list = (Store.get('ec.bossTasks', []) || []).slice();
        const idx = list.findIndex(t => t.id === b.dataset.taskId);
        if (idx < 0) return;
        const t = list[idx];
        const canToggle = isAdmin || t.assignee === '全體' || t.assignee === myName;
        if (!canToggle) { showToast('沒有權限', 'error'); return; }
        const wasNotDone = t.status !== 'done';
        if (t.status === 'done') {
          list[idx] = { ...t, status: 'todo', doneAt: null, doneBy: null };
        } else {
          list[idx] = { ...t, status: 'done', doneAt: Date.now(), doneBy: myName };
        }
        Store.set('ec.bossTasks', list);
        // 同步更新同事待辦清單中，從這筆老闆任務複製過去的項目勾選狀態
        const dp = Store.get('ec.dailyProgress', {}) || {};
        let dpChanged = false;
        const nextDp = { ...dp };
        Object.keys(nextDp).forEach(dateKey => {
          const dayEntry = nextDp[dateKey];
          if (!dayEntry) return;
          let dayChanged = false;
          const nextDay = { ...dayEntry };
          Object.keys(nextDay).forEach(person => {
            const items = nextDay[person];
            if (!Array.isArray(items)) return;
            const newItems = items.map(it => it.bossTaskId === t.id ? { ...it, done: wasNotDone } : it);
            if (newItems.some((it, i) => it !== items[i])) {
              nextDay[person] = newItems;
              dayChanged = true;
            }
          });
          if (dayChanged) {
            nextDp[dateKey] = nextDay;
            dpChanged = true;
          }
        });
        if (dpChanged) Store.set('ec.dailyProgress', nextDp);
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

    // 自動儲存（debounce 1.5s）— 過去日期唯讀，今天和未來日期都可以寫
    const viewDate = (this.filter.dashboardMarketing && this.filter.dashboardMarketing.viewDate) || todayStr;
    if (viewDate < todayStr) return; // 過去日期唯讀

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
        // 如果這筆待辦事項是老闆指派的任務同步過來的，勾選/取消勾選時同步更新老闆指派任務的完成狀態
        if (item && item.bossTaskId) {
          const list = (Store.get('ec.bossTasks', []) || []).slice();
          const idx = list.findIndex(t => t.id === item.bossTaskId);
          if (idx >= 0) {
            const t = list[idx];
            const wasNotDone = t.status !== 'done';
            list[idx] = cb.checked
              ? { ...t, status: 'done', doneAt: Date.now(), doneBy: name }
              : { ...t, status: 'todo', doneAt: null, doneBy: null };
            Store.set('ec.bossTasks', list);
            if (cb.checked && wasNotDone) {
              const dueLine = t.due ? '\n📅 預計完成日：' + t.due.replace(/-/g, '/') : '';
              const msg = '✅ 任務完成通知\n' + (t.desc || '')
                + '\n👤 完成者：' + name
                + dueLine
                + '\n→ 前往儀表板查看 https://kelly83117.github.io/ec-dashboard/';
              this.pushLineNotifyToBoss(msg).then(r => {
                if (r && r.ok) showToast('已通知老闆 LINE', 'info');
                else if (r && !r.skipped) console.warn('[line notify boss]', r);
              });
            }
          }
        }
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
  openAdjustmentDetailModal(person, viewDate, kind, group) {
    const slashDate = String(viewDate || '').replace(/-/g, '/');
    const recs = (getAdjIndex()[slashDate] || []).filter(r => ADJ_SHOP_TO_PERSON[r.shop] === person);
    const list = _adjRecsForGroup(recs, kind, group);   // ← 與 pill 計數同一個函式，數字保證一致
    const parts = String(viewDate).split('-');
    const md = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;

    // 「沒有動作」沉底：反向判斷——有動作關鍵字＝action，否則 noAction（見 ADJ_ACTION_RE）
    const action = [], noAction = [];
    list.forEach(r => (ADJ_ACTION_RE.test(String(r.text || '')) ? action : noAction).push(r));

    // 交叉紀錄：這個商品在洞察表的調整（唯讀、預設收折；原生 <details>，不掛任何事件）。
    // muted（沒有動作沉底列）也照樣顯示。
    const crossInsightHtml = (r) => {
      const entries = _crossInsightFor(r.shop, r.code);
      if (entries.length === 0) return '';
      return `
        <details class="adj-x adj-x-ins">
          <summary>洞察表另有 ${entries.length} 筆</summary>
          ${entries.map(x => `
          <div class="adj-x-row">
            <span class="adj-x-date">${escapeHtml(x.date || '未記日期')}</span>
            <span class="adj-x-text">${escapeHtml(x.text || '')}</span>
          </div>`).join('')}
        </details>`;
    };

    const itemHtml = (r, muted) => `
      <div class="adj-modal-item${muted ? ' adj-modal-item-muted' : ''}">
        <div class="adj-modal-item-hd">
          <span class="adj-modal-shop">${escapeHtml(r.shop || '')}</span>
          <span class="adj-modal-code">${escapeHtml(r.code || '')}</span>
          <span class="adj-modal-name">${escapeHtml(r.name || '')}</span>
          <span class="adj-src adj-src-${r.src||'report'}">${r.src==='ads'?'廣告調整':r.src==='growth'?'商品調整':r.src==='import'?'舊版匯入':'報表匯入'}</span>
        </div>
        <div class="adj-modal-text">${escapeHtml(r.text || '')}</div>
        ${crossInsightHtml(r)}
      </div>`;

    const bodyHtml = `
      <div class="adj-modal-sub">${escapeHtml(md)} · ${list.length} 項</div>
      <div class="adj-modal-list">
        ${action.map(r => itemHtml(r, false)).join('')}
        ${noAction.length ? `
          <div class="adj-modal-divider"></div>
          <div class="adj-modal-noact">沒有動作 · ${noAction.length} 項</div>
          ${noAction.map(r => itemHtml(r, true)).join('')}
        ` : ''}
      </div>`;

    this.openModal({ title: `${person} · ${group}`, width: '520px', hideFooter: true, bodyHtml });
  },
  openInsightDetailModal(person, viewDate, label) {
    // 洞察表「今日調整」chip 明細：純唯讀，只讀 Store，不寫任何東西。
    //   通路歸屬用模組層 ADJ_PERSON_TO_SHOPS（由 ADJ_SHOP_TO_PERSON 反查，單一來源）；
    //   分類用 window.__insightClassify（marketing.js 抽出的共用判定）＝「依目前資料重算」，
    //   所以歷史日期若門檻 / 銷售資料已變動，明細可能與當日 chip 數字不同。
    const slashDate = String(viewDate || '').replace(/-/g, '/');
    const shops = ADJ_PERSON_TO_SHOPS[person] || [];
    const rows = [];
    shops.forEach(shop => {
      const notes = Store.get(`ec.insight_${shop}_notes`, {}) || {};
      const master = Store.get(`ec.insight_${shop}_master`, null);
      Object.keys(notes).forEach(code => {
        const adjustments = (notes[code] && notes[code].adjustments) || [];
        const hits = adjustments.filter(a => {
          const d = (a.date || '').slice(0, 10);
          return d === viewDate || d === slashDate;
        });
        if (hits.length === 0) return;
        const cls = window.__insightClassify ? window.__insightClassify(shop, code) : null;
        if (cls !== label) return;
        // 品名 fallback：mocbicName 優先，順序對齊洞察表 marketing.js 彈窗的取名邏輯
        //（玩樂主檔的 name 是空字串、品名在 mocbicName，實測 C150/E142/H333）
        const m = (master && master.byCode) ? master.byCode[code] : null;
        const prodName = m ? (m.mocbicName || m.name || '') : '';
        rows.push({ shop, code, name: prodName, texts: hits.map(a => a.text || '') });
      });
    });

    const parts = String(viewDate).split('-');
    const md = `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;

    // 交叉紀錄：這個商品在淨利表的調整（唯讀、預設收折；原生 <details>，不掛任何事件）
    const HALF_ZH = { first: '上半月', second: '下半月', full: '整月' };
    const crossProfitHtml = (r) => {
      const h = _crossProfitFor(r.shop, r.code);
      const nP = (h && h.period) || [], nG = (h && h.growth) || [];
      if (nP.length === 0 && nG.length === 0) return '';
      const row = (left, text) => `
        <div class="adj-x-row">
          <span class="adj-x-date">${escapeHtml(left)}</span>
          <span class="adj-x-text">${escapeHtml(text)}</span>
        </div>`;
      return `
        <details class="adj-x adj-x-profit">
          <summary>淨利表另有 ${nP.length + nG.length} 筆</summary>
          ${nG.length ? `<div class="adj-x-grp">商品調整</div>` + nG.map(g => row(g.date || '未記日期', g.text || '')).join('') : ''}
          ${nP.length ? `<div class="adj-x-grp">廣告調整／報表</div>` + nP.map(p => row(`${p.month} ${HALF_ZH[p.half] || p.half || ''}`, p.text || '')).join('') : ''}
        </details>`;
    };

    const itemHtml = (r) => `
      <div class="adj-modal-item">
        <div class="adj-modal-item-hd">
          <span class="adj-modal-shop">${escapeHtml(r.shop || '')}</span>
          <span class="adj-modal-code">${escapeHtml(r.code || '')}</span>
          <span class="adj-modal-name">${escapeHtml(r.name || '')}</span>
        </div>
        ${r.texts.map(t => `<div class="adj-modal-text">${escapeHtml(t)}</div>`).join('')}
        ${crossProfitHtml(r)}
      </div>`;

    const bodyHtml = rows.length > 0 ? `
      <div class="adj-modal-sub">${escapeHtml(md)} · ${rows.length} 項 · 依目前資料重算</div>
      <div class="adj-modal-list">${rows.map(itemHtml).join('')}</div>` : `
      <div class="adj-modal-sub">${escapeHtml(md)} · 0 項 · 依目前資料重算</div>
      <div class="adj-modal-list">
        <div class="adj-modal-item">
          <div class="adj-modal-text">這個期間查不到洞察調整紀錄（可能是該通路沒有紀錄，或分類門檻已變動）</div>
        </div>
      </div>`;

    this.openModal({ title: `${person} · ${label}`, width: '520px', hideFooter: true, bodyHtml });
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

// ============================================================================
// collectAdjustments() — 純函式：把淨利表報表 built[]/rows[] 裡 row.note 的
//   自由文字，依內嵌「月/日」切成一段一段的調整紀錄。不經 ec.dailyProgress
//   摘要層、不碰任何 render / bind，只掛 window 供 Console / 日後功能取用。
//   回傳：[{ date:'YYYY/MM/DD'|null, shop, code, name, text }]
//   ⚠ date 為 null（note 裡沒有可辨識日期）的段一律保留，不丟。
// ============================================================================
function collectAdjustments() {
  const out = [];
  const seen = new Set();
  const mem = (window.Store && Store._profitMem) || {};
  // 第四塊：標籤一律重算。profit.js 排在 daily.js 之後 import，calc 可能還沒掛好。
  const hasCalc = typeof window.calcAnalysis === 'function'
               && typeof window.calcGrowthAnalysis === 'function';
  if (!hasCalc) console.warn('[collectAdjustments] window.calcAnalysis / calcGrowthAnalysis 尚未就緒（profit.js 可能還沒載完），本次不計算標籤，下次呼叫重試');
  let labelErrCount = 0;   // calc throw 的列數，迴圈後統一 warn 一次（別每列洗版）
  const repIdx = {};   // 第二趟用：{ 'shop|month|half': { code: row } }，第一趟順手建、不重掃
  const nameIdx = {};  // 通路級：'通路' → {code: 商品名}。名字與期間無關，所有來源共用
  // 所有來源的唯一出口：統一去重 + push。dk 公式與原本完全相同。
  const _pushRec = (rec) => {
    if (!rec.text) return;
    const dk = rec.shop + '␟' + (rec.code || '') + '␟' + (rec.date || '') + '␟' + rec.text;
    if (seen.has(dk)) return;
    seen.add(dk);
    out.push(rec);
  };
  // 標籤計算抽成共用：報表列 row → {anaLabel,anaCls,growthLabel,growthCls}；無 row / calc 未就緒 → 全空
  const _labelsOf = (row) => {
    const r = { anaLabel:'', anaCls:'', growthLabel:'', growthCls:'' };
    if (!hasCalc || !row) return r;
    try {
      const _a = window.calcAnalysis(row.adsFee, row.pureRate, row.targetROI, row.roiDiff, row.clicks, row.pureProfit, row.roi);
      r.anaLabel = _a.label; r.anaCls = _a.cls || '';
      const _g = window.calcGrowthAnalysis(row.growthRate, row.rev, row.prevRev, row.pureRate);
      r.growthLabel = _g.label; r.growthCls = _g.cls || '';
    } catch (e) { labelErrCount++; }
    return r;
  };
  // 掃描順序決定去重時「誰先寫入」（去重邏輯不變：先寫入優先、後來略過）。
  //   同一筆調整可能出現在多份報表（整月 full vs 半月 first/second），重算標籤可能不一致。
  //   規則：半月(first/second) 排在 full 前 → 一律以半月報表為準；同 rank 再按 key 字串排，
  //   確保跨 Firestore snapshot 的 Object.keys() 順序抖動時結果仍穩定。
  const _periodRank = (k) => {
    const half = k.split('|')[3];
    if (half === 'first' || half === 'second') return 0;
    if (half === 'full') return 1;
    return 2;
  };
  const scanKeys = Object.keys(mem).sort((a, b) => {
    const ra = _periodRank(a), rb = _periodRank(b);
    return ra !== rb ? ra - rb : (a < b ? -1 : a > b ? 1 : 0);
  });
  scanKeys.forEach(key => {
    if (key.indexOf('ec|') !== 0) return;        // 只掃報表 key 'ec|...'
    if (key.indexOf('filemeta') >= 0) return;    // 排除 filemeta
    const parts = key.split('|');
    const shop = parts[1];
    const year = (parts[2] || '').split('/')[0]; // 'ec|好麻吉|2026/06|first' → '2026'
    const rep = mem[key];
    const rows = Array.isArray(rep && rep.built) ? rep.built      // built 優先
               : Array.isArray(rep && rep.rows)  ? rep.rows       // 沒有才 rows
               : [];
    rows.forEach(row => {
      const pk = shop + '|' + parts[2] + '|' + parts[3];
      (repIdx[pk] = repIdx[pk] || {})[row.code] = row;
      if (row.name) (nameIdx[shop] = nameIdx[shop] || {})[row.code] = row.name;
      const note = row && row.note;
      if (typeof note !== 'string') return;       // 只處理字串 note

      // 第四塊：每列只算一次標籤（各段共用，切多段不重算）。一律重算、不讀 row.analysisLabel（避免舊規則快照）。
      //   getAdjIndex() 在月曆 render 迴圈裡跑，任何 throw 都會炸掉整頁 → 每列 try/catch，該列給空標籤並累計。
      const { anaLabel, anaCls, growthLabel, growthCls } = _labelsOf(row);

      const re = /(\d{1,2})\/(\d{1,2})/g;         // 找所有「月/日」
      const marks = [];
      let m;
      while ((m = re.exec(note)) !== null) {
        const mo = parseInt(m[1], 10), da = parseInt(m[2], 10);
        if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {   // 月 1-12、日 1-31 才算
          marks.push({ mo, da, start: m.index, end: m.index + m[0].length });
        }
      }

      const trimSeg = s => s.replace(/^[\s；;，,、]+/, '').replace(/[\s；;，,、]+$/, '');
      const pushSeg = (dateStr, rawText) => {
        const text = trimSeg(rawText);
        if (!text) return;                          // 空段丟掉
        _pushRec({ date: dateStr, shop, code: row.code, name: (row.name || ''), text, anaLabel, anaCls, growthLabel, growthCls, period: parts[2] + '|' + parts[3], src: 'report' });
      };

      if (marks.length === 0) { pushSeg(null, note); return; }  // 無日期 → 整段 date=null
      if (marks[0].start > 0) pushSeg(null, note.slice(0, marks[0].start)); // 首日期前 → null
      for (let i = 0; i < marks.length; i++) {                  // 每個日期→下一個日期之間
        const segStart = marks[i].end;                          // 段文字不含日期 token
        const segEnd = (i + 1 < marks.length) ? marks[i + 1].start : note.length;
        const dateStr = year + '/' + String(marks[i].mo).padStart(2, '0') + '/' + String(marks[i].da).padStart(2, '0');
        pushSeg(dateStr, note.slice(segStart, segEnd));
      }
    });
  });
  // 第二趟：掃同事手打的 ec_notes|（廣告調整 / 商品調整）。一定放在第一趟之後（要用 repIdx）。
  // _growthPeriodOf 由 profit.js 掛在 window，而 daily.js 先載入 → 執行期守衛
  const hasGP = typeof window._growthPeriodOf === 'function';
  if (!hasGP) console.warn('[collectAdjustments] window._growthPeriodOf 尚未就緒，商品調整這次不納入，下次呼叫重試');

  scanKeys.forEach(key => {
    if (key.indexOf('ec_notes|') !== 0) return;
    const isGrowth = /_growth$/.test(key);
    const p = key.split('|');
    let shop, fixedPeriod = null, src;
    if (isGrowth) {
      if (!hasGP) return;
      shop = key.slice('ec_notes|'.length).replace(/_growth$/, '');
      src = 'growth';
    } else if (p.length >= 4 && p[2] && p[3]) {
      shop = p[1];
      fixedPeriod = p[2] + '|' + p[3];
      src = 'ads';
    } else {
      shop = key.slice('ec_notes|'.length);   // 舊版 key（無期間），例 ec_notes|玩樂
      src = 'import';
    }
    if (!shop || shop.indexOf('|') >= 0) return;
    const notes = mem[key] || {};
    Object.keys(notes).forEach(code => {
      const v = notes[code];
      const arr = (typeof v === 'string') ? [{ date:'', text:v }] : ((v && v.adjustments) || []);
      arr.forEach(a => {
        const text = String((a && a.text) || '').trim();
        if (!text) return;
        const d = String((a && a.date) || '');
        const date = /^\d{4}\/\d{2}\/\d{2}$/.test(d) ? d : null;
        const period = isGrowth ? window._growthPeriodOf(a) : fixedPeriod;
        const row = (period && repIdx[shop + '|' + period]) ? repIdx[shop + '|' + period][code] : null;
        const L = _labelsOf(row);
        _pushRec({
          date, shop, code, name: (row && row.name) || (nameIdx[shop] && nameIdx[shop][code]) || '', text,
          anaLabel: L.anaLabel, anaCls: L.anaCls,
          growthLabel: L.growthLabel, growthCls: L.growthCls,
          period: period || '', src
        });
      });
    });
  });
  if (labelErrCount > 0) console.warn('[collectAdjustments] 標籤重算有', labelErrCount, '列 throw，已給空標籤（可能是舊報表欄位異常）');
  console.log('[collectAdjustments] 總計', out.length,
              '｜有日期', out.filter(r => r.date).length,
              '｜無日期', out.filter(r => !r.date).length,
              '｜有分析標籤', out.filter(r => r.anaLabel).length,
              '｜有成長標籤', out.filter(r => r.growthLabel).length);
  console.log('[collectAdjustments] 來源拆解 ｜報表 note',
    out.filter(r=>r.src==='report').length,
    '｜廣告調整', out.filter(r=>r.src==='ads').length,
    '｜商品調整', out.filter(r=>r.src==='growth').length,
    '｜舊版匯入', out.filter(r=>r.src==='import').length);
  return out;
}

// ============================================================================
// 淨利表調整紀錄 — 工作日誌右側面板的唯讀顯示（第二塊）
//   資料源：collectAdjustments()，依日期索引後查表。純唯讀，不寫任何 Store。
//   通路→人 對應寫在本檔（不引 marketing.js；洞察表日後將廢除）。
// ============================================================================
const ADJ_ALLOWED_NAMES  = ['陳君葳', '洪嘉蓮', '郭雅琪'];              // 顯示順序
// ⚠️ 這份表在 marketing.js:1699 有一份 SHOP_TO_PERSON，內容必須一致。改這裡一定要一起改那裡。
// ⚠️ 2026-07-29 更正：玩樂是郭雅琪 2026/04 起接手，先前寫成洪嘉蓮是錯的。
// ⚠️ 維克目前無人負責，值填 '未指派'。這個通路是老闆指定要保留的，不可以從表裡移除 ——
//    marketing.js 的 INSIGHT_SHOPS = Object.keys(SHOP_TO_PERSON) 由本表 key 推導，
//    少一個通路 = 該通路的洞察活動完全不被統計，而且不報錯。
// ⚠️ 已知限制：'未指派' 不在硬寫的 ALLOWED_NAMES 裡，工作日誌月曆/卡片目前不會顯示它
//    （daily.js 約 273 行的 filter 會濾掉）。這是已知的顯示缺口，另排處理。
//    有人接手維克時把名字填進來即可自動正確。
const ADJ_SHOP_TO_PERSON = { '好麻吉': '洪嘉蓮', '玩樂': '郭雅琪', '森之旅': '陳君葳', '維克': '未指派' };
const ADJ_MAX_ROWS = 10;                                              // 每人預設顯示筆數
// 人 → 通路（反查）：{ 洪嘉蓮:['好麻吉'], 郭雅琪:['玩樂'], 陳君葳:['森之旅'], 未指派:['維克'] }
const ADJ_PERSON_TO_SHOPS = Object.keys(ADJ_SHOP_TO_PERSON).reduce((m, shop) => {
  const p = ADJ_SHOP_TO_PERSON[shop];
  (m[p] = m[p] || []).push(shop);
  return m;
}, {});
// 開發期檢查：同一 label 若出現不同 cls，warn 一次（cls 取「該組第一筆」是推論，這裡驗證它）
const _adjClsWarned = new Set();
function _warnAdjClsMismatch(label, a, b) {
  if (_adjClsWarned.has(label)) return;
  _adjClsWarned.add(label);
  console.warn(`[buildCardAdjustments] 標籤「${label}」出現不一致 cls：「${a}」vs「${b}」，pill 沿用第一筆的 cls`);
}

// 第六塊：淨利 pill 排序（警訊優先）；不在清單者（自訂規則）排在建議調預算後、未分類前
const ADJ_ANA_ORDER = ['賠錢中', '危險商品', '低效廣告', '低淨利', '高利潤商品', '建議調預算'];
// 淨利分桶：加/減 系列（級距是設定值，用前綴判斷、不寫死字串）合併成「建議調預算」，其餘用 anaLabel
function _adjAnaBucket(r) {
  if (!r.anaLabel) return null;
  return (r.anaLabel.startsWith('加') || r.anaLabel.startsWith('減')) ? '建議調預算' : r.anaLabel;
}
// pill 計數與 modal 明細「唯一來源」：取某人某日某 (kind, group) 的紀錄陣列
function _adjRecsForGroup(recs, kind, group) {
  if (kind === 'growth') return recs.filter(r => r.growthLabel === group);
  if (group === '未分類') return recs.filter(r => !r.anaLabel && !r.growthLabel);
  return recs.filter(r => _adjAnaBucket(r) === group);   // 含「建議調預算」合併桶
}
// 「有動作」關鍵字：反向判斷——text 出現任一關鍵字＝有動作，否則沉底歸「沒有動作」。
//   「開頭是什麼」不穩（例：「清倉品先不動」開頭是清倉品），改偵測動作字眼是否出現。這條之後可能再調。
const ADJ_ACTION_RE = /預算|廣\s*\d|ROI|roi|漲價|調漲|降價|調降|開廣告|關廣告|加速|換.{0,2}圖|標題|分類|優惠券|活動|調整售價|調價/;

// ── 交叉紀錄查詢（兩個明細彈窗互相補上對方的資料）────────────────────────
// 兩支都純唯讀、只在點開彈窗時呼叫。注意：模組層無法物理上放在 openAdjustmentDetailModal
// 之前（該方法在上方 Object.assign(App,{...}) 區塊內），function 宣告有 hoisting，行為等價。
// 查某商品在洞察表的調整：依 date 分組、同日多筆用「、」串成一列（跟洞察表彈窗一致），新到舊。
function _crossInsightFor(shop, code) {
  const nd = (Store.get(`ec.insight_${shop}_notes`, {}) || {})[code];
  if (!nd) return [];
  let adj;
  if (typeof nd === 'string') adj = [{ date: '', text: nd }];                       // 舊版：整筆是字串
  else if (typeof nd.adjustments === 'string') adj = [{ date: '', text: nd.adjustments }];
  else adj = nd.adjustments || [];
  const map = new Map();
  adj.forEach(a => {
    if (!a || !a.text || !String(a.text).trim()) return;   // 只留 text 非空的
    const d = a.date || '';
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(String(a.text));
  });
  return [...map.keys()]
    .sort((a, b) => String(b).localeCompare(String(a)))    // 日期新到舊
    .map(d => ({ date: d, text: map.get(d).join('、') }));
}
// 查某商品在淨利表的調整：走 profit.js 掛在 window 的唯讀出口。
// profit.js 比 daily.js 後載入，但這是點擊時才呼叫，執行期守衛就夠。
function _crossProfitFor(shop, code) {
  if (typeof window.profitNoteHistoryFor !== 'function') {
    console.warn('[daily] profitNoteHistoryFor 尚未就緒，淨利表紀錄這次不顯示');
    return { period: [], growth: [] };
  }
  try { return window.profitNoteHistoryFor(shop, code) || { period: [], growth: [] }; }
  catch (e) { console.warn('[daily] 淨利表紀錄查詢失敗', e); return { period: [], growth: [] }; }
}

let _adjIndexCache = null;
let _adjLabelsReady = false;
// collectAdjustments() 要掃 ~26000 列，只在首次呼叫時跑一次，之後查表 O(1)。
// 只索引有日期的紀錄（無日期的無法落到特定某天）。
// ⚠ 快取照建（getAdjIndex 在月曆 render 迴圈裡每格呼叫一次，不快取會 35 格 × 26k 列卡死）；
//   但記下標籤有沒有算成功：這次 profit.js 還沒就緒（標籤全空）就標記 not ready，
//   下次呼叫時 calc 好了才重建一次。
function getAdjIndex() {
  const calcOk = typeof window.calcAnalysis === 'function'
              && typeof window.calcGrowthAnalysis === 'function'
              && typeof window._growthPeriodOf === 'function';   // 第二趟的商品調整也依賴它
  if (_adjIndexCache && (_adjLabelsReady || !calcOk)) return _adjIndexCache;
  const idx = {};
  collectAdjustments().forEach(r => {
    if (!r.date) return;
    (idx[r.date] = idx[r.date] || []).push(r);
  });
  _adjIndexCache = idx;
  _adjLabelsReady = calcOk;
  return idx;
}
// 雲端 profit 資料有更新 → 索引 + 標籤就緒旗標一起失效，下次 render 自然重建（firebase.js 既有事件）
window.addEventListener('profitDataReady', () => {
  _adjIndexCache = null; _adjLabelsReady = false;
  // 報表資料（window.state._built）更新 → 若正在工作日誌頁(office-d1)，重繪一次讓卡片本期進度即時反映；
  //   其他頁不動（資料已進 Store，切過去自然渲染）。route 判斷沿用 app.js 既有慣例（App.render 重繪當前 route）。
  if (window.App && window.App.route === 'office-d1' && typeof window.App.render === 'function') window.App.render();
});

// 進度明細的嚴重度排序:要處理的在上、好消息在下。
// 🔴 比對用「顯示名」(mapAnaLabel 之後)且先剝掉開頭 emoji——
//    資料層原始標籤與畫面顯示名不同(mapAnaLabel 翻譯),成長標籤帶 emoji 前綴。
const _PROG_ANA_RANK=['賠錢中','危險商品','低淨利','低效廣告'];
const _PROG_GROWTH_RANK=['重跌品','衰退品','低利品','弱轉換','發展品','成長品','中營收','高營收','爆發品'];
function _progDisplayName(label){
  const shown=(window.mapAnaLabel?window.mapAnaLabel(label):label)||'';
  return shown.replace(/^[^\u4e00-\u9fffA-Za-z0-9]+/,'');   // 剝掉開頭 emoji/符號
}
function _progRank(label,kind){
  const n=_progDisplayName(label);
  if(kind==='growth'){
    const i=_PROG_GROWTH_RANK.indexOf(n);
    return i>=0?i:50;
  }
  const i=_PROG_ANA_RANK.indexOf(n);
  if(i>=0)return i;
  let m;
  if((m=n.match(/^ROI\s*-(\d+)/)))return 10+Math.max(0,9-(+m[1]));  // ROI 負數:越負越前(-3→16,-1→18)
  if((m=n.match(/^減(\d+)/)))return 20+Math.max(0,9-(+m[1])/100);   // 減預算:金額大在前
  if((m=n.match(/^加(\d+)/)))return 25+Math.max(0,9-(+m[1])/100);   // 加預算:金額大在前
  if((m=n.match(/^ROI\s*(\d+)/)))return 30+(+m[1]);                 // ROI 正數:數字小在前(離目標近)
  if(/^[加減]/.test(n))return 28;      // 無數字的加減(保底)
  if(/^ROI/.test(n))return 40;         // 無數字的 ROI(保底)
  if(n==='高利潤商品')return 90;       // 好事墊底
  return 50;
}
function buildProgressHtml(person){
  const shops=ADJ_PERSON_TO_SHOPS[person]||[];
  if(!shops.length)return'';
  const hasSLP=typeof window.shopLabelProgress==='function';
  const results=shops.map(shop=>({shop,p:hasSLP?window.shopLabelProgress(shop):null}));
  const anyP=results.find(r=>r.p);
  const pt=anyP?`本期優化進度（${anyP.p.month} ${anyP.p.half==='first'?'上半月':'下半月'}）`:'本期優化進度';
  const bar=(d,t)=>{const pct=Math.round(d/t*100);
    return`<span class="adj-prog-num">${d}/${t}</span><span class="adj-prog-bar"><span class="adj-prog-fill" style="width:${pct}%"></span></span><span class="adj-prog-pct">${pct}%</span>`;};
  // 明細列(小標籤)不畫條:數字 + 符號 + %。
  // ✓=100% 完成(綠)、無符號=進行中(藍)、!=低於50%(琥珀)。
  // 符號是主判讀(不依賴色覺)、顏色是輔助;刻意不用紅——期中偏低是常態不是過錯。
  const flat=(d,t)=>{const pct=Math.round(d/t*100);
    const cls=pct>=100?'adj-prog-p100':pct>=50?'adj-prog-p50':'adj-prog-p0';
    const mark=pct>=100?'✓ ':pct<50?'! ':'';
    return`<span class="adj-prog-num">${d}/${t}</span><span class="adj-prog-pct ${cls}">${mark}${pct}%</span>`;};
  const rows=results.map(({shop,p})=>{
    if(!p)return`<div class="adj-prog-row"><span class="adj-prog-shop">${escapeHtml(shop)}</span><span class="adj-prog-na">—</span></div>`;
    const grp=(title,obj,kind)=>{
      const keys=Object.keys(obj).sort((a,b)=>{
        const ra=_progRank(a,kind),rb=_progRank(b,kind);
        return ra!==rb?ra-rb:obj[b].t-obj[a].t;
      });
      if(!keys.length)return'';
      let gd=0,gt=0;keys.forEach(l=>{gd+=obj[l].d;gt+=obj[l].t;});
      // 分組小總結:該組所有標籤桶的加總(一商品雙標籤會重複計,語意為「標籤完成度」)
      return`<div class="adj-prog-row adj-prog-grp"><span class="adj-prog-shop">${escapeHtml(title)}</span>${bar(gd,gt)}</div>`+keys.map(l=>{
        const{t,d}=obj[l];
        return`<div class="adj-prog-row adj-prog-sub"><span class="adj-prog-shop">${escapeHtml(window.mapAnaLabel?window.mapAnaLabel(l):l)}</span>${flat(d,t)}</div>`;
      }).join('');
    };
    return`<button type="button" class="adj-prog-row adj-prog-toggle" data-prog-shop="${escapeHtml(shop)}">
        <span class="adj-prog-shop">${escapeHtml(shop)}</span>${bar(p.doneTotal,p.total)}<span class="adj-prog-caret">▾</span>
      </button>
      <div class="adj-prog-detail" data-prog-detail="${escapeHtml(shop)}" hidden>
        ${grp('廣告分析',p.ana,'ana')}${grp('成長分析',p.growth,'growth')}
      </div>`;
  }).join('');
  return`<div class="adj-prog">
    <div class="adj-prog-title">${pt}</div>
    ${rows}
    <div class="adj-prog-note">依通路負責人歸屬，非個人操作紀錄；點通路列展開明細</div>
    <div class="adj-prog-note"><span class="adj-prog-p100">✓ 完成</span>　<span class="adj-prog-p50">進行中</span>　<span class="adj-prog-p0">! 低於50%</span>　·　各標籤分母為帶該標籤的商品數</div>
  </div>`;
}
// 第六塊：某人某日的「淨利表調整」區塊，注入人員卡片底部。只留標題 + 兩排 pill，明細改走彈窗。
//   viewDate: 'YYYY-MM-DD'。回傳 HTML；非郭雅琪且當日 0 筆 → 回 ''（連分隔線都不出）。
//   pill 為 <button>，click 由 bindWeeklyCalendar 綁 → openAdjustmentDetailModal。
//   pill 計數一律走 _adjRecsForGroup（與 modal 明細同源，數字保證一致）。
function buildCardAdjustmentsHtml(person, viewDate) {
  const slashDate = String(viewDate || '').replace(/-/g, '/');
  const recs = (getAdjIndex()[slashDate] || []).filter(r => ADJ_SHOP_TO_PERSON[r.shop] === person);
  const shops = ADJ_PERSON_TO_SHOPS[person] || [];

  // 空狀態：郭雅琪（維克無淨利表）顯示提示；其他人當日 0 筆 → 不顯示整塊
  if (recs.length === 0) {
    if (person === '郭雅琪') {
      return `
        <div class="adj-sec">
          <div class="adj-sec-head"><span class="adj-sec-title">淨利表調整</span></div>
          <div class="adj-none">${escapeHtml(shops.join('、'))}沒有淨利表資料</div>
          ${buildProgressHtml(person)}
        </div>`;
    }
    return buildProgressHtml(person)?`<div class="adj-sec">${buildProgressHtml(person)}</div>`:'';
  }

  const total = recs.length;
  const personAttr = escapeHtml(person);
  const dateAttr = escapeHtml(viewDate);

  // 蒐集各排的桶 label；cls 取「該桶第一筆」（中性桶不需要），同桶不同 cls → dev warn
  const anaLabelSet = new Set();
  const growthLabelSet = new Set();
  const firstCls = {};   // key: `${kind}|${label}` → cls
  const noteCls = (kind, label, cls) => {
    if (!cls) return;
    const k = kind + '|' + label;
    if (!(k in firstCls)) firstCls[k] = cls;
    else if (firstCls[k] !== cls) _warnAdjClsMismatch(label, firstCls[k], cls);
  };
  recs.forEach(r => {
    const b = _adjAnaBucket(r);
    if (b) { anaLabelSet.add(b); if (b !== '建議調預算') noteCls('ana', b, r.anaCls); } // 合併桶不驗 cls
    if (r.growthLabel) { growthLabelSet.add(r.growthLabel); noteCls('growth', r.growthLabel, r.growthCls); }
  });
  if (recs.some(r => !r.anaLabel && !r.growthLabel)) anaLabelSet.add('未分類');

  // 中性灰：加/減混合的建議調預算、無狀態的未分類（硬套顏色＝假訊號）
  const NEUTRAL = new Set(['建議調預算', '未分類']);
  const mkBucket = (label, kind) => ({
    label, kind,
    count: _adjRecsForGroup(recs, kind, label).length,                    // ← 與 modal 同源
    cls: NEUTRAL.has(label) ? 'adj-pill-plain' : (firstCls[kind + '|' + label] || ''),
  });
  // 淨利排序：固定序 → 自訂規則(筆數 desc) → 未分類
  const anaRank = (label) => {
    if (label === '未分類') return 100;
    const i = ADJ_ANA_ORDER.indexOf(label);
    return i >= 0 ? i : 50;   // 自訂規則：在建議調預算(5) 後、未分類(100) 前
  };
  const anaBuckets = [...anaLabelSet].map(l => mkBucket(l, 'ana')).sort((a, b) => {
    const ra = anaRank(a.label), rb = anaRank(b.label);
    return ra !== rb ? ra - rb : b.count - a.count;
  });
  const growthBuckets = [...growthLabelSet].map(l => mkBucket(l, 'growth')).sort((a, b) => b.count - a.count);

  const pillHtml = (g) => `<button type="button" class="adj-pill ${g.cls}" data-adj-person="${personAttr}" data-adj-date="${dateAttr}" data-adj-kind="${g.kind}" data-adj-group="${escapeHtml(g.label)}">${escapeHtml(window.mapAnaLabel(g.label))} <b>${g.count}</b></button>`;
  const anaPills = anaBuckets.map(pillHtml).join('');
  const growthPills = growthBuckets.map(pillHtml).join('');

  return `
    <div class="adj-sec">
      <div class="adj-sec-head">
        <span class="adj-sec-title">淨利表調整</span>
        <span class="adj-sec-total">${total}</span>
      </div>
      ${anaPills ? `<div class="adj-pill-group"><div class="adj-pills-label">廣告分析</div><div class="adj-pills">${anaPills}</div></div>` : ''}
      ${growthPills ? `<div class="adj-pill-group"><div class="adj-pills-label">成長分析</div><div class="adj-pills">${growthPills}</div></div>` : ''}
      ${buildProgressHtml(person)}
    </div>`;
}

Object.assign(window, { collectAdjustments, getAdjIndex, buildCardAdjustmentsHtml });
