/* js/pages/modal.js -- methods extracted from original App, merged back via Object.assign(App, ...) */
const App = window.App;


Object.assign(App, {
  openModal({ title, bodyHtml, onSave, onMount, onCancel, onDelete, saveLabel, cancelLabel, deleteLabel, width, hideFooter, enableEsc }) {
    const modal = document.getElementById('modal');
    if (width) modal.style.maxWidth = width;
    else modal.style.maxWidth = '';
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="icon-btn" id="modal-close-x">✕</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${hideFooter ? '' : `
        <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div>
            ${onDelete ? `<button id="modal-delete" style="padding:10px 18px;border:1px solid #fecaca;border-radius:8px;background:white;color:#dc2626;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='white'">🗑 ${escapeHtml(deleteLabel || '刪除')}</button>` : ''}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-ghost" id="modal-cancel">${escapeHtml(cancelLabel || '取消')}</button>
            <button class="btn-primary" style="width:auto;padding:10px 20px" id="modal-save">${escapeHtml(saveLabel || '儲存')}</button>
          </div>
        </div>
      `}
    `;
    document.getElementById('modal-backdrop').classList.add('show');
    const closeWithCancel = () => {
      if (typeof onCancel === 'function') onCancel();
      this.closeModal();
    };
    // ESC 關閉 modal — 預設關閉，避免儀表板首頁 / 淨利表的輸入框
    //   被誤觸時觸發 onCancel 連帶把使用者剛打的值還原為空白
    //   只有明確 opt-in 的 modal（目前僅洞察表備註）才會啟用
    if (this._modalEscHandler) document.removeEventListener('keydown', this._modalEscHandler);
    if (enableEsc) {
      this._modalEscHandler = (e) => {
        if (e.key !== 'Escape') return;
        if (e.defaultPrevented) return; // 已被 inner handler 處理
        e.preventDefault();
        closeWithCancel();
      };
      document.addEventListener('keydown', this._modalEscHandler);
    }

    if (onMount) onMount();
    document.getElementById('modal-close-x').onclick = closeWithCancel;
    if (!hideFooter) {
      document.getElementById('modal-cancel').onclick = closeWithCancel;
      document.getElementById('modal-save').onclick = () => {
        const ok = onSave();
        if (ok) this.closeModal();
      };
      if (onDelete) {
        const delBtn = document.getElementById('modal-delete');
        if (delBtn) delBtn.onclick = () => {
          const ok = onDelete();
          if (ok) this.closeModal();
        };
      }
    }
  },
  closeModal() {
    document.getElementById('modal-backdrop').classList.remove('show');
    if (this._modalEscHandler) {
      document.removeEventListener('keydown', this._modalEscHandler);
      this._modalEscHandler = null;
    }
  },
  closeModalOnBackdrop(e) {
    if (e.target.id === 'modal-backdrop') this.closeModal();
  },

  /* 通用警示彈窗 — 取代原生 alert()，用儀表板現行 modal 風格
   *   App.showAlertModal({ title, message, kind: 'error'|'warn'|'info', detail, onClose })
   *   kind 控制左側色帶與 emoji；detail 是可選的小字補充說明
   *   為避免短時間內同類錯誤連跳多個視窗，同 key 的呼叫會 dedupe。
   */
  showAlertModal({ title, message, kind, detail, onClose, dedupeKey }) {
    kind = kind || 'info';
    const k = String(dedupeKey || title || message || '').slice(0, 80);
    if (k) {
      this._alertModalSeen = this._alertModalSeen || {};
      const last = this._alertModalSeen[k] || 0;
      if (Date.now() - last < 2500) return; // 2.5s 內同 key 不重彈
      this._alertModalSeen[k] = Date.now();
    }
    const style = {
      error: { emoji: '❌', band: '#ef4444', bg: '#fee2e2' },
      warn:  { emoji: '⚠️', band: '#f59e0b', bg: '#fef3c7' },
      info:  { emoji: 'ℹ️', band: '#3b82f6', bg: '#dbeafe' },
    }[kind] || { emoji: 'ℹ️', band: '#6b7280', bg: '#f3f4f6' };
    const detailHtml = detail
      ? `<pre style="margin:10px 0 0;padding:8px 10px;background:#f1f5f9;border-radius:6px;font-size:11px;font-family:ui-monospace,Consolas,Menlo,monospace;color:#475569;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto">${String(detail).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</pre>`
      : '';
    this.openModal({
      title: `${style.emoji} ${title || '系統訊息'}`,
      width: '480px',
      hideFooter: true,
      enableEsc: true,
      bodyHtml: `
        <div style="padding:14px 16px;background:${style.bg};border-left:3px solid ${style.band};border-radius:7px;font-size:14px;color:var(--text);line-height:1.6">
          ${String(message || '').replace(/\n/g, '<br>')}
        </div>
        ${detailHtml}
        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <button id="alert-modal-ok" type="button" style="padding:9px 22px;border:0;border-radius:6px;background:var(--primary);color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">知道了</button>
        </div>
      `,
      onMount: () => {
        const btn = document.getElementById('alert-modal-ok');
        if (btn) btn.addEventListener('click', () => {
          this.closeModal();
          if (typeof onClose === 'function') onClose();
        });
      },
    });
  },
});
