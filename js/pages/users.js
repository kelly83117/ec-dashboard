/* js/pages/users.js -- methods extracted from original App, merged back via Object.assign(App, ...) */
const App = window.App;
const { Store, escapeHtml, showToast, hashPassword, computeScore, OFFICE_CONFIG, OFFICE_FEATURES } = window;

// 姓名／帳號互撞規則（之後要靠姓名與 username 認人，兩者在全部帳號間都不能混淆）。
//   比對一律「去頭尾空白＋不分大小寫」；「其他帳號」用原本的 username 排除自己，
//   所以自己的姓名等於自己的 username 是允許的。
//   selfUsername：編輯時＝原本的 username；新增時＝null（此時才檢查新 username 撞別人姓名）。
//   checkName：編輯時只有姓名真的改了才檢查，避免舊資料或系統自動建的帳號（如「陳大明」）
//   本來就重名、讓整個帳號連改權限都存不了。
//   回傳錯誤訊息；沒撞到回 null。
const normId = s => String(s || '').trim().toLowerCase();
function userIdentityClash(list, { name, username, selfUsername, checkName }) {
  const others = list.filter(x => x.username !== selfUsername);
  if (checkName) {
    const n = normId(name);
    const sameName = others.find(x => normId(x.name) === n);
    if (sameName) return `姓名「${name}」已經是帳號 ${sameName.username} 的姓名`;
    if (others.some(x => normId(x.username) === n)) return `姓名「${name}」已經是別人的登入帳號`;
  }
  if (selfUsername == null) {
    const u = normId(username);
    const nameOwner = others.find(x => normId(x.name) === u);
    if (nameOwner) return `帳號「${username}」已經是帳號 ${nameOwner.username} 的姓名`;
  }
  return null;
}
// 編輯帳號存檔前確認視窗用的權限名稱（viewUsers 的 roleName 是區域函式，且把未設定也顯示成員工；
//   確認視窗要照實列出「從什麼改成什麼」，所以另外一份、未設定就照實寫）
const ROLE_LABELS = { admin: '管理員', staff: '員工', view: '檢視（唯讀）' };
const roleLabel = r => ROLE_LABELS[r] || '（未設定）';

Object.assign(App, {
  viewUsers() {
    const role = this.currentUser.role;
    // admin：完整管理；view：唯讀檢視（決策 3，寫入動作停用）；staff：不可存取
    if (role !== 'admin' && role !== 'view') {
      return `<div class="placeholder-page"><div class="emoji">🔒</div><h3>權限不足</h3><p>僅管理員可存取此頁面</p></div>`;
    }
    const ro = role === 'view';   // 唯讀檢視：顯示清單但停用新增/編輯/刪除
    const roAttr = ro ? 'disabled title="唯讀帳號無此權限"' : '';
    const roleName = r => r === 'admin' ? '管理員' : (r === 'view' ? '檢視' : '員工');
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
              <span class="badge-role ${isAdmin?'role-admin':'role-staff'}">${roleName(u.role)}</span>
              ${crossBadge}
            </div>
            <div class="meta">@${escapeHtml(u.username)} · ${escapeHtml(getUserDeptLabel(u))}</div>
          </div>
          <button class="icon-btn" title="${ro?'唯讀帳號無此權限':'編輯'}" ${roAttr} onclick="App.openUserModal('${escapeHtml(u.username)}')">✏️</button>
          ${u.username === this.currentUser.username
            ? ''
            : `<button class="icon-btn danger" title="${ro?'唯讀帳號無此權限':'刪除'}" ${roAttr} onclick="App.deleteUser('${escapeHtml(u.username)}')">🗑️</button>`}
        </div>
      `;
    }).join('');

    return `
      <div class="page-header">
        <h2>員工帳號管理${ro ? ' <span class="badge-role" style="background:var(--warn-soft);color:var(--warn)">唯讀檢視</span>' : ''}</h2>
      </div>
      <div class="filter-bar">
        <span class="filter-spacer"></span>
        <button class="btn-add" ${roAttr} onclick="App.openUserModal()">+ 新增帳號</button>
      </div>
      <div class="table-card">${rows || '<div class="empty"><div class="emoji">👥</div>尚無帳號</div>'}</div>
    `;
  },
  openUserModal(username) {
    if (this.isReadOnly && this.isReadOnly()) { showToast('🔒 檢視帳號為唯讀，無法修改資料', 'error'); return; }
    const users = Store.get(Store.KEYS.users, []);
    const user = username ? users.find(u => u.username === username) : null;
    const isEdit = !!user;
    const departments = Store.get(Store.KEYS.departments, []);
    const u = user || { username:'', name:'', role:'staff', departments: [], crossOfficeAccess: false };
    const userDepts = getUserDepts(u);

    this.openModal({
      title: isEdit ? '編輯帳號' : '新增帳號',
      bodyHtml: `
        <div class="field"><label>姓名</label><input id="f-uname" value="${escapeHtml(u.name)}" autocomplete="off" required></div>
        <div class="field">
          <label>帳號</label>
          <input id="f-uusername" value="${escapeHtml(u.username)}" required${isEdit ? ' readonly class="user-field-locked"' : ' autocomplete="off"'}>
          ${isEdit ? '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">帳號建立後不可修改</div>' : ''}
        </div>
        <div class="field">
          <label>${isEdit ? '新密碼（留空保留原密碼）' : '初始密碼（留空預設為 123）'}</label>
          <input type="password" id="f-upassword" autocomplete="new-password" readonly placeholder="${isEdit ? '不改密碼請留空' : '預設 123'}">
        </div>
        <div class="field">
          <label>權限</label>
          <select id="f-urole">
            <option value="staff" ${u.role==='staff'?'selected':''}>員工</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>管理員</option>
            <option value="view" ${u.role==='view'?'selected':''}>檢視（唯讀）</option>
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
        // 防瀏覽器密碼管理員自動填入：autocomplete="new-password" 只是「請求」，Chrome 不保證遵守；
        //   密碼欄先以 readonly 產生（主流瀏覽器不會自動填 readonly 欄位；常見做法，非規格保證），使用者點進去時才解除。
        //   否則管理員自己的密碼可能被悄悄填進來，存檔就把這個帳號的密碼改成跟管理員一樣。
        const pwEl = document.getElementById('f-upassword');
        if (pwEl) pwEl.addEventListener('focus', () => pwEl.removeAttribute('readonly'), { once: true });
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
        // username 建立後不可修改（之後要用它記錄誰改了什麼）：編輯時一律用原值，
        //   不讀輸入框——readonly 用 F12 就能拿掉，不能當防線。
        const usernameVal = isEdit ? user.username : document.getElementById('f-uusername').value.trim();
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
        if (!name || !usernameVal) { showToast('請填寫姓名與帳號', 'error'); return false; }
        const list = Store.get(Store.KEYS.users, []);
        // 撞名檢查只在新增時做（編輯不改 username，沒有撞名問題）
        if (!isEdit && list.some(x => x.username.toLowerCase() === usernameVal.toLowerCase())) {
          showToast('帳號已存在（不分大小寫）', 'error'); return false;
        }
        const clash = userIdentityClash(list, {
          name, username: usernameVal,
          selfUsername: isEdit ? user.username : null,
          checkName: !isEdit || normId(name) !== normId(user.name),
        });
        if (clash) { showToast(clash, 'error', 4000); return false; }
        // 編輯時的敏感變更，存檔前列出來讓操作的人確認（放在所有檢查之後：被擋下的不先跳確認）。
        //   姓名：存 username 的歷史紀錄會跟著顯示新姓名（帳號換人用）；密碼：可能是瀏覽器自動填入；權限：升降級。
        if (isEdit) {
          const changes = [];
          if (normId(name) !== normId(user.name)) changes.push(`・姓名：${user.name || '（空白）'} → ${name}（MOMO 優化紀錄、洞察表等存帳號的紀錄會改顯示新姓名；首頁營收署名、KPI 最後編輯等存姓名的會停在舊姓名）`);
          if (password) changes.push('・更改密碼（請確認是你剛剛輸入的，不是瀏覽器自動填入）');
          if (role !== user.role) changes.push(`・權限：${roleLabel(user.role)} → ${roleLabel(role)}`);
          // 管理員把自己降權：確定後就不能再改任何帳號（員工進不了帳號管理、檢視只能唯讀），只能靠別的管理員救
          const selfDemote = user.username === this.currentUser.username && user.role === 'admin' && role !== 'admin';
          const warn = selfDemote ? '\n\n⚠ 這是你自己的帳號。降權後你將無法再修改任何帳號（包括改回自己的權限），只能請其他管理員恢復。' : '';
          if (changes.length && !confirm(`即將修改帳號 ${user.username}（${user.name || '未填姓名'}）：\n${changes.join('\n')}${warn}\n\n確定要儲存嗎？`)) return false;
        }
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
          list.push({ username: usernameVal, name, role, departments: selectedDepts, officeFeatures, password: hashPassword(initialPw) });
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
    if (this.isReadOnly && this.isReadOnly()) { showToast('🔒 檢視帳號為唯讀，無法修改資料', 'error'); return; }
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
    if (this.isReadOnly && this.isReadOnly()) { showToast('🔒 檢視帳號為唯讀，無法修改資料', 'error'); return; }
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
