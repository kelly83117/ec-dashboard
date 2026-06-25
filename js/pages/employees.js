/* js/pages/employees.js -- methods extracted from original App, merged back via Object.assign(App, ...) */
const App = window.App;
const { Store, escapeHtml, computeScore, getQuarterScore, getUserDeptLabel, trendFromQuarters, DEPT_COLORS } = window;

Object.assign(App, {
  viewEmployees() {
    const departments = Store.get(Store.KEYS.departments, []);
    const allUsers = Store.get(Store.KEYS.users, []);
    // 員工績效明細：排除管理員、以及未指派辦公室（全公司）的帳號
    const users = allUsers.filter(u => u.role !== 'admin' && getUserDepts(u).length > 0);
    const deptById = Object.fromEntries(departments.map(d => [d.id, d]));
    const filterDept = this.filter.dept === 'all' ? null : deptById[this.filter.dept];
    const filtered = !filterDept
      ? users
      : users.filter(u => getUserDepts(u).includes(filterDept.name));

    const quarter = this.filter.quarter || 'all';
    const sortKey = quarter === 'all' ? null : quarter;

    const ranked = filtered.map(u => ({
      ...u,
      score: computeScore(u),
      trend: trendFromQuarters(u),
    })).sort((a, b) => {
      const av = sortKey ? (getQuarterScore(a, sortKey) ?? -1) : a.score;
      const bv = sortKey ? (getQuarterScore(b, sortKey) ?? -1) : b.score;
      return bv - av;
    });

    const avgScore = ranked.length
      ? Math.round(ranked.reduce((s, e) => {
          const v = sortKey ? (getQuarterScore(e, sortKey) ?? 0) : e.score;
          return s + v;
        }, 0) / ranked.length * 10) / 10
      : 0;
    const excellent = ranked.filter(e => {
      const v = sortKey ? (getQuarterScore(e, sortKey) ?? 0) : e.score;
      return v >= 90;
    }).length;
    const needsImprov = ranked.filter(e => {
      const v = sortKey ? (getQuarterScore(e, sortKey) ?? 0) : e.score;
      return v > 0 && v < 60;
    }).length;
    const topPerformer = ranked[0];

    const deptByName = Object.fromEntries(departments.map(d => [d.name, d]));

    const cellScore = (val) => {
      if (val == null) return '<span style="color:var(--text-muted)">—</span>';
      const cls = val >= 90 ? 'trend-up' : val < 60 ? 'trend-down' : '';
      return `<span class="${cls}" style="font-weight:600">${val}</span>`;
    };
    const highlight = (q) => quarter === q ? 'style="background:var(--primary-soft)"' : '';

    const rows = ranked.length === 0 ? `
      <tr><td colspan="10"><div class="empty"><div class="emoji">📭</div>
        <div>尚無員工資料</div>
        <div style="font-size:13px;margin-top:4px">請先到「帳號管理」建立員工帳號</div>
      </div></td></tr>
    ` : ranked.map((u, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
      const userDepts = getUserDepts(u);
      const scoreClass = u.score >= 90 ? 'score-good' : u.score >= 80 ? 'score-ok' : 'score-bad';
      const trendIcon = u.trend === 'up' ? '<span class="trend-up">↑ 上升</span>'
        : u.trend === 'down' ? '<span class="trend-down">↓ 下降</span>'
        : '<span class="trend-flat">→ 持平</span>';
      const deptCell = userDepts.length === 0
        ? `<span style="color:var(--text-muted)">全公司</span>`
        : userDepts.map(dn => {
            const d = deptByName[dn];
            return d
              ? `<span class="dept-tag" style="background:${d.color}22;color:${d.color};margin-right:4px">${escapeHtml(d.name)}</span>`
              : `<span class="dept-tag" style="background:#e5e7eb;color:#6b7280;margin-right:4px">${escapeHtml(dn)}</span>`;
          }).join('');
      return `
        <tr>
          <td><span class="rank-badge ${rankClass}">${rank}</span></td>
          <td>
            <div class="employee-cell">
              <div class="employee-avatar">${escapeHtml(u.name.slice(0,1))}</div>
              <div>
                <div class="employee-name">${escapeHtml(u.name)}</div>
                <div class="employee-code">@${escapeHtml(u.username)}</div>
              </div>
            </div>
          </td>
          <td>${deptCell}</td>
          <td ${highlight('q1')}>${cellScore(getQuarterScore(u, 'q1'))}</td>
          <td ${highlight('q2')}>${cellScore(getQuarterScore(u, 'q2'))}</td>
          <td ${highlight('q3')}>${cellScore(getQuarterScore(u, 'q3'))}</td>
          <td ${highlight('q4')}>${cellScore(getQuarterScore(u, 'q4'))}</td>
          <td>
            <div class="score-cell">
              <div class="score-bar"><div class="${scoreClass}" style="width:${u.score}%"></div></div>
              <span class="score-value">${u.score}</span>
            </div>
          </td>
          <td>${trendIcon}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" title="編輯分數" onclick="App.openScoreModal('${escapeHtml(u.username)}')">✏️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const deptPills = `
      <button class="pill ${this.filter.dept === 'all' ? 'active' : ''}" data-dept="all">全部辦公室</button>
      ${departments.map(d => `
        <button class="pill ${this.filter.dept === d.id ? 'active' : ''}" data-dept="${d.id}">${escapeHtml(d.name)}</button>
      `).join('')}
    `;

    const quarterLabels = { all: '全年', q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4' };
    const quarterPills = ['all','q1','q2','q3','q4'].map(q => `
      <button class="pill ${quarter === q ? 'active' : ''}" data-quarter="${q}">${quarterLabels[q]}</button>
    `).join('');

    const currentLabel = quarterLabels[quarter];
    const tableSubtitle = quarter === 'all'
      ? `依全年平均分數排序 · 共 ${ranked.length} 人`
      : `依 ${currentLabel} 分數排序 · 共 ${ranked.length} 人`;

    return `
      <div class="page-header">
        <h2>績效管理 <span class="live-dot">即時更新</span></h2>
        <p>各辦公室員工 ${currentLabel} 績效分數（滿分 100 分）</p>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--info-soft);color:var(--info)">📊</div>
          <div class="stat-label">${currentLabel}平均分數</div>
          <div class="stat-value">${avgScore}</div>
          <div class="stat-meta">滿分 100 分</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--success-soft);color:var(--success)">🏆</div>
          <div class="stat-label">優秀員工（≥ 90）</div>
          <div class="stat-value">${excellent}</div>
          <div class="stat-meta">共 ${ranked.length} 人中</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--danger-soft);color:var(--danger)">⚠️</div>
          <div class="stat-label">待加強（&lt; 60）</div>
          <div class="stat-value">${needsImprov}</div>
          <div class="stat-meta">需關注並輔導</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--primary-soft);color:var(--primary)">⭐</div>
          <div class="stat-label">${currentLabel}最高分</div>
          <div class="stat-value" style="font-size:22px">${topPerformer ? escapeHtml(topPerformer.name) : '—'}</div>
          <div class="stat-meta">${topPerformer ? (sortKey ? (getQuarterScore(topPerformer, sortKey) ?? '—') : topPerformer.score) + ' 分' : ''}</div>
        </div>
      </div>
      <div class="filter-bar">
        ${deptPills}
        <span style="width:1px;height:24px;background:var(--border);margin:0 4px"></span>
        ${quarterPills}
        <span class="filter-spacer"></span>
        ${this.currentUser.role === 'admin' ? `<button class="btn-ghost" onclick="App.navigate('users')">前往帳號管理 ↗</button>` : ''}
      </div>
      <div class="table-card">
        <div class="table-card-header">
          <h3>員工績效明細</h3>
          <p>${tableSubtitle}</p>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th><th>員工</th><th>辦公室</th>
                <th ${highlight('q1')}>Q1</th>
                <th ${highlight('q2')}>Q2</th>
                <th ${highlight('q3')}>Q3</th>
                <th ${highlight('q4')}>Q4</th>
                <th>全年平均</th><th>趨勢</th><th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  },
  bindFilterBar() {
    document.querySelectorAll('.pill[data-dept]').forEach(p => {
      p.addEventListener('click', () => {
        this.filter.dept = p.dataset.dept;
        this.render();
      });
    });
    document.querySelectorAll('.pill[data-quarter]').forEach(p => {
      p.addEventListener('click', () => {
        this.filter.quarter = p.dataset.quarter;
        this.render();
      });
    });
  },
  openScoreModal(username) {
    const users = Store.get(Store.KEYS.users, []);
    const u = users.find(x => x.username === username);
    if (!u) { showToast('找不到此帳號', 'error'); return; }
    const qVal = q => (typeof u[q] === 'number' ? u[q] : '');
    const deptLabel = getUserDeptLabel(u);

    this.openModal({
      title: `編輯績效：${u.name}`,
      bodyHtml: `
        <div class="field">
          <label>帳號</label>
          <input value="@${escapeHtml(u.username)} · ${escapeHtml(u.name)} · ${escapeHtml(deptLabel)}" disabled
            style="background:var(--bg);color:var(--text-muted)">
        </div>
        <div style="margin:4px 0;font-size:13px;color:var(--text-muted)">
          季度績效分數（0–100，可空白；帳號其他欄位請至「帳號管理」修改）
        </div>
        <div class="field-row">
          <div class="field"><label>Q1</label><input type="number" id="f-q1" min="0" max="100" step="1" value="${qVal('q1')}"></div>
          <div class="field"><label>Q2</label><input type="number" id="f-q2" min="0" max="100" step="1" value="${qVal('q2')}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Q3</label><input type="number" id="f-q3" min="0" max="100" step="1" value="${qVal('q3')}"></div>
          <div class="field"><label>Q4</label><input type="number" id="f-q4" min="0" max="100" step="1" value="${qVal('q4')}"></div>
        </div>
      `,
      onSave: () => {
        const parseQ = (id) => {
          const raw = document.getElementById(id).value.trim();
          if (raw === '') return null;
          const n = Number(raw);
          if (!isFinite(n) || n < 0 || n > 100) return 'INVALID';
          return Math.round(n);
        };
        const q1 = parseQ('f-q1'), q2 = parseQ('f-q2'), q3 = parseQ('f-q3'), q4 = parseQ('f-q4');
        if ([q1,q2,q3,q4].includes('INVALID')) {
          showToast('季度分數需為 0–100 的整數', 'error');
          return false;
        }
        const list = Store.get(Store.KEYS.users, []);
        const i = list.findIndex(x => x.username === username);
        if (i < 0) { showToast('找不到此帳號', 'error'); return false; }
        list[i].q1 = q1; list[i].q2 = q2; list[i].q3 = q3; list[i].q4 = q4;
        Store.set(Store.KEYS.users, list);
        showToast('已更新', 'success');
        this.render();
        return true;
      },
    });
  },
});
