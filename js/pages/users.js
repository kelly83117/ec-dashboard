/* js/pages/users.js -- methods extracted from original App, merged back via Object.assign(App, ...) */
const App = window.App;
const { Store, escapeHtml, showToast, hashPassword, computeScore, OFFICE_CONFIG, OFFICE_FEATURES } = window;

Object.assign(App, {
  viewUsers() {
    if (this.currentUser.role !== 'admin') {
      return `<div class="placeholder-page"><div class="emoji">🔒</div><h3>權限不足</h3><p>僅管理員可存取此頁面</p></div>`;
    }
    const users = Store.get(Store.KEYS.users, []);
    const rows = users.map(u => {
      const isAdmin = u.role === 'admin';
      const crossBadge = (isAdmin || u.crossOfficeAccess === true)
        ? `<span class="badge-role" style="background:var(--success-soft);color:var(--success)">🌐 跨辦公室</span>`
        : `<span class="badge-role" style="background:var(--warn-soft);color:var(--warn)">僅本辦公室</span>`;
      return `
        <div class="user-row">
          <div class="employee-avatar">${escapeHtml(u.name.slice(0,1))}</div>
          <div class="info">
            <div class="name">${escapeHtml(u.name)}
              <span class="badge-role ${isAdmin?'role-admin':'role-staff'}">${isAdmin?'管理員':'員工'}</span>
              ${crossBadge}
            </div>
            <div class="meta">@${escapeHtml(u.username)} · ${escapeHtml(getUserDeptLabel(u))}</div>
          </div>
          <button class="icon-btn" title="編輯" onclick="App.openUserModal('${escapeHtml(u.username)}')">✏️</button>
          ${u.username === this.currentUser.username
            ? ''
            : `<button class="icon-btn danger" title="刪除" onclick="App.deleteUser('${escapeHtml(u.username)}')">🗑️</button>`}
        </div>
      `;
    }).join('');

    return `
      <div class="page-header">
        <h2>員工帳號管理</h2>
      </div>
      <div class="filter-bar">
        <span class="filter-spacer"></span>
        <button class="btn-add" onclick="App.openUserModal()">+ 新增帳號</button>
      </div>
      <div class="table-card">${rows || '<div class="empty"><div class="emoji">👥</div>尚無帳號</div>'}</div>
    `;
  },
  openUserModal(username) {
    const users = Store.get(Store.KEYS.users, []);
    const user = username ? users.find(u => u.username === username) : null;
    const isEdit = !!user;
    const departments = Store.get(Store.KEYS.departments, []);
    const u = user || { username:'', name:'', role:'staff', departments: [], crossOfficeAccess: false };
    const userDepts = getUserDepts(u);

    this.openModal({
      title: isEdit ? '編輯帳號' : '新增帳號',
      bodyHtml: `
        <div class="field"><label>姓名</label><input id="f-uname" value="${escapeHtml(u.name)}" required></div>
        <div class="field">
          <label>帳號</label>
          <input id="f-uusername" value="${escapeHtml(u.username)}" ${isEdit?'readonly':''} required>
        </div>
        <div class="field">
          <label>${isEdit ? '新密碼（留空保留原密碼）' : '初始密碼（留空預設為 123）'}</label>
          <input type="password" id="f-upassword" placeholder="${isEdit ? '不改密碼請留空' : '預設 123'}">
        </div>
        <div class="field">
          <label>權限</label>
          <select id="f-urole">
            <option value="staff" ${u.role==='staff'?'selected':''}>員工</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>管理員</option>
          </select>
        </div>
        <div class="field">
          <label>權限設定</label>
          <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;background:white">
            <div style="display:grid;grid-template-columns:1fr 70px;padding:9px 14px;background:#f3f4f6;font-size:12px;font-weight:700;color:#374151">
              <div>功能</div>
              <div style="text-align:center">啟用</div>
            </div>
            ${departments.map(d => {
              const isChecked = userDepts.includes(d.name);
              const features = OFFICE_FEATURES[d.name] || [];
              const savedFeatures = (u.officeFeatures && u.officeFeatures[d.name]);
              const hasFeatures = features.length > 0;
              const parentRow = `
                <div class="perm-parent-row" data-dept="${escapeHtml(d.name)}" style="display:grid;grid-template-columns:1fr 70px;padding:10px 14px;border-top:1px solid #e5e7eb;background:white;align-items:center">
                  <div ${hasFeatures ? `class="perm-expand" data-dept-toggle="${escapeHtml(d.name)}" style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none"` : 'style="display:flex;align-items:center;gap:8px"'}>
                    ${hasFeatures ? `<span class="perm-chevron" data-state="collapsed" style="display:inline-block;font-size:10px;color:#6b7280;width:12px;transition:transform .15s">▶</span>` : '<span style="display:inline-block;width:12px"></span>'}
                    <span style="font-weight:600;font-size:13px;color:#000">${escapeHtml(d.name)}</span>
                  </div>
                  <div style="text-align:center">
                    <input type="checkbox" class="f-udept-cb" value="${escapeHtml(d.name)}" ${isChecked ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer">
                  </div>
                </div>
              `;
              const subRows = hasFeatures ? features.map(f => {
                const fChecked = !Array.isArray(savedFeatures) ? true : savedFeatures.includes(f.key);
                return `
                  <div class="perm-sub-row" data-parent="${escapeHtml(d.name)}" style="display:none;grid-template-columns:1fr 70px;padding:7px 14px 7px 48px;border-top:1px solid #f3f4f6;background:#fafbfc;align-items:center">
                    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#000">
                      <span style="color:#9ca3af">─</span>
                      <span>${escapeHtml(f.label)}</span>
                    </div>
                    <div style="text-align:center">
                      <input type="checkbox" class="f-ufeat-cb" data-dept="${escapeHtml(d.name)}" value="${escapeHtml(f.key)}" ${fChecked ? 'checked' : ''} ${isChecked ? '' : 'disabled'} style="width:16px;height:16px;cursor:${isChecked ? 'pointer' : 'not-allowed'};${isChecked ? '' : 'opacity:.4'}">
                    </div>
                  </div>
                `;
              }).join('') : '';
              return parentRow + subRows;
            }).join('')}
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
            點 ▶ 展開該部門可使用的功能；停用辦公室時下方功能會自動鎖住<br>
            未啟用任何辦公室＝全公司（不歸屬特定辦公室）
          </div>
        </div>
      `,
      onMount: () => {
        // 點 ▶/▼ 展開或收起該部門的子功能
        document.querySelectorAll('[data-dept-toggle]').forEach(area => {
          area.addEventListener('click', () => {
            const deptName = area.dataset.deptToggle;
            const chevron = area.querySelector('.perm-chevron');
            const isCollapsed = chevron.dataset.state === 'collapsed';
            chevron.dataset.state = isCollapsed ? 'expanded' : 'collapsed';
            chevron.style.transform = isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)';
            document.querySelectorAll(`.perm-sub-row[data-parent="${deptName}"]`).forEach(row => {
              row.style.display = isCollapsed ? 'grid' : 'none';
            });
          });
        });
        // 父啟用切換時，子功能跟著可/不可用（不會自動取消勾選，只是 disable）
        document.querySelectorAll('.f-udept-cb').forEach(cb => {
          cb.addEventListener('change', () => {
            const deptName = cb.value;
            document.querySelectorAll(`.f-ufeat-cb[data-dept="${deptName}"]`).forEach(sub => {
              sub.disabled = !cb.checked;
              sub.style.cursor = cb.checked ? 'pointer' : 'not-allowed';
              sub.style.opacity = cb.checked ? '1' : '.4';
            });
          });
        });
      },
      onSave: () => {
        const name = document.getElementById('f-uname').value.trim();
        const usernameNew = document.getElementById('f-uusername').value.trim();
        const password = document.getElementById('f-upassword').value;
        const role = document.getElementById('f-urole').value;
        const selectedDepts = Array.from(document.querySelectorAll('.f-udept-cb'))
          .filter(cb => cb.checked)
          .map(cb => cb.value);
        // 收集每個部門的子功能勾選 → officeFeatures
        const officeFeatures = {};
        selectedDepts.forEach(deptName => {
          if (!OFFICE_FEATURES[deptName]) return;
          const features = Array.from(document.querySelectorAll(`.f-ufeat-cb[data-dept="${deptName}"]`))
            .filter(cb => cb.checked)
            .map(cb => cb.value);
          officeFeatures[deptName] = features;
        });
        if (!name || !usernameNew) { showToast('請填寫姓名與帳號', 'error'); return false; }
        const list = Store.get(Store.KEYS.users, []);
        if (!isEdit && list.some(x => x.username.toLowerCase() === usernameNew.toLowerCase())) { showToast('帳號已存在（不分大小寫）', 'error'); return false; }
        if (isEdit) {
          const i = list.findIndex(x => x.username === user.username);
          list[i].name = name;
          list[i].role = role;
          list[i].departments = selectedDepts;
          delete list[i].department; // 移除舊欄位
          delete list[i].crossOfficeAccess; // 已移除此功能
          list[i].officeFeatures = officeFeatures;
          delete list[i].canManageLineNotify; // 改由 officeFeatures.行銷.lineNotify 取代
          if (password) {
            list[i].password = hashPassword(password);
          }
        } else {
          const initialPw = password || '123';
          list.push({ username: usernameNew, name, role, departments: selectedDepts, officeFeatures, password: hashPassword(initialPw) });
        }
        Store.set(Store.KEYS.users, list);

        // 若編輯的是當前登入者，更新側欄與權限
        if (isEdit && user.username === this.currentUser.username) {
          this.currentUser.name = name;
          this.currentUser.role = role;
          this.currentUser.departments = selectedDepts;
          delete this.currentUser.department;
          delete this.currentUser.crossOfficeAccess;
          this.currentUser.officeFeatures = officeFeatures;
          delete this.currentUser.canManageLineNotify;
          this.applyUserPerms(this.currentUser);
        }

        showToast(isEdit ? '已更新' : '已新增', 'success');
        this.render();
        return true;
      },
    });
  },
  deleteUser(username) {
    if (username === this.currentUser.username) {
      showToast('不能刪除自己的帳號', 'error');
      return;
    }
    const list = Store.get(Store.KEYS.users, []);
    const user = list.find(u => u.username === username);
    if (!user) return;
    if (!confirm(`確定要刪除帳號「${user.name}」？`)) return;
    Store.set(Store.KEYS.users, list.filter(u => u.username !== username));
    showToast('已刪除', 'success');
    this.render();
  },
  openChangePasswordModal() {
    const username = this.currentUser?.username;
    if (!username) { showToast('尚未登入', 'error'); return; }

    this.openModal({
      title: `修改密碼：${this.currentUser.name}`,
      bodyHtml: `
        <div class="field">
          <label>目前密碼</label>
          <input type="password" id="f-pwold" autocomplete="current-password">
        </div>
        <div class="field">
          <label>新密碼</label>
          <input type="password" id="f-pwnew" autocomplete="new-password" placeholder="請輸入新密碼">
        </div>
        <div class="field">
          <label>再次輸入新密碼</label>
          <input type="password" id="f-pwnew2" autocomplete="new-password" placeholder="與新密碼相同">
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
          密碼有區分大小寫；改完下次登入請用新密碼
        </div>
      `,
      onSave: () => {
        const oldPw  = document.getElementById('f-pwold').value;
        const newPw  = document.getElementById('f-pwnew').value;
        const newPw2 = document.getElementById('f-pwnew2').value;
        if (!newPw) { showToast('請輸入新密碼', 'error'); return false; }
        if (newPw !== newPw2) { showToast('兩次新密碼不一致', 'error'); return false; }

        const list = Store.get(Store.KEYS.users, []);
        const i = list.findIndex(x => x.username.toLowerCase() === username.toLowerCase());
        if (i < 0) { showToast('找不到此帳號', 'error'); return false; }

        // 後門容錯：admin 永遠可用 admin123 改自己的密碼
        const isAdminBackdoor = list[i].username === 'admin' && oldPw === 'admin123';
        if (!isAdminBackdoor && hashPassword(oldPw) !== list[i].password) {
          showToast('目前密碼錯誤', 'error');
          return false;
        }

        list[i].password = hashPassword(newPw);
        Store.set(Store.KEYS.users, list);
        showToast('密碼已更新', 'success');
        return true;
      },
    });
  },
});
