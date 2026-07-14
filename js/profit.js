/* ===================== 淨利表 ===================== */
const Store = window.Store;

window.__profitTabHtml = `<div style="background:white;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
  <div style="padding:10px 14px;border-bottom:1px solid #e5e7eb">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:5px">
          <button class="stab active" style="background:#ee4d2d;color:#fff;border-color:#ee4d2d;font-weight:700;width:100%;justify-content:center;font-size:15px" onclick="setShop('總表',this)">蝦皮｜總表</button>
          <div style="display:flex;align-items:center;gap:4px;background:#f3f4f6;border-radius:7px;padding:2px">
            <button class="stab" style="font-size:15px" onclick="setShop('好麻吉',this)"><span class="sdot" style="background:#5b5fcf"></span>好麻吉</button>
            <button class="stab" style="font-size:15px" onclick="setShop('玩樂',this)"><span class="sdot" style="background:#10b981"></span>玩樂</button>
            <button class="stab" style="font-size:15px" onclick="setShop('森之旅',this)"><span class="sdot" style="background:#f59e0b"></span>森之旅</button>
            <button class="stab" style="font-size:15px" onclick="setShop('維克',this)"><span class="sdot" style="background:#14b8a6"></span>維克</button>
          </div>
        </div>
        <div style="width:1px;background:#e5e7eb;align-self:stretch"></div>
        <div style="display:flex;flex-direction:column;gap:5px">
          <button class="stab" id="momo-summary-btn" style="background:#e4007f;color:#fff;border-color:#e4007f;font-weight:700;width:100%;justify-content:center;font-size:15px;opacity:0.9" onclick="setMomoShop('總表',this)">MOMO｜總表</button>
          <div style="display:flex;align-items:center;gap:4px;background:#f3f4f6;border-radius:7px;padding:2px">
            <button class="stab" style="font-size:15px" onclick="setMomoShop('甲配',this)"><span class="sdot" style="background:#d4380d"></span>甲配</button>
            <button class="stab" style="font-size:15px" onclick="setMomoShop('乙配',this)"><span class="sdot" style="background:#fa541c"></span>乙配</button>
            <button class="stab" style="font-size:15px" onclick="setMomoShop('MO+麻吉',this)"><span class="sdot" style="background:#ff7a45"></span>MO+麻吉</button>
            <button class="stab" style="font-size:15px" onclick="setMomoShop('MO+森之旅',this)"><span class="sdot" style="background:#ffa940"></span>MO+森之旅</button>
          </div>
        </div>
        <div style="width:1px;background:#e5e7eb;align-self:stretch"></div>
        <div style="display:flex;flex-direction:column;gap:5px">
          <button class="stab" style="background:#0ea5e9;color:#fff;border-color:#0ea5e9;font-weight:700;width:100%;justify-content:center;font-size:15px;opacity:0.9" onclick="setCoupangShop('總表',this)">酷澎｜總表</button>
          <div style="display:flex;align-items:center;gap:4px;background:#f3f4f6;border-radius:7px;padding:2px">
            <button class="stab" style="font-size:15px" onclick="setCoupangShop('麻吉',this)"><span class="sdot" style="background:#c0392b"></span>麻吉</button>
            <button class="stab" style="font-size:15px" onclick="setCoupangShop('露營館',this)"><span class="sdot" style="background:#e74c3c"></span>露營館</button>
          </div>
        </div>
      </div>
    </div>
    <div id="header-kpi-row" style="display:none;align-items:center;gap:18px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid #f3f4f6">
      <div id="header-kpi-block" style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">本期總營收</div><div style="display:flex;align-items:baseline;gap:5px"><div id="kv-rev-header" style="font-size:20px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;letter-spacing:-.01em">—</div><span id="kv-rev-change-header" style="font-size:12px;font-weight:600"></span></div></div>
        <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">本期純利</div><div id="kv-net-header" style="font-size:20px;font-weight:700;color:#10b981;font-variant-numeric:tabular-nums;letter-spacing:-.01em">—</div></div>
        <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">廣告費</div><div id="kv-ads-header" style="font-size:20px;font-weight:700;color:#f59e0b;font-variant-numeric:tabular-nums;letter-spacing:-.01em">—</div></div>
      </div>
      <div id="header-btn-block" style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-left:auto">
        <div id="profit-period-wrap-row" style="display:none;align-items:center;gap:8px">
          <div id="profit-period-wrap" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="export-btn" onclick="openUploadModal()" style="border-color:#5b5fcf;color:#5b5fcf">⬆ 上傳檔案</button>
          <button id="global-sync-btn" class="export-btn" onclick="syncToCloud(curShop)" style="opacity:0.4;cursor:default" disabled>☁ 同步雲端</button>
          <button id="global-exp-btn" class="export-btn" onclick="doExport(curShop)" disabled>⬇ 匯出 Excel</button>
        </div>
      </div>
    </div>
  </div>
  <div class="ana-overlay" id="coupang-upload-overlay" onclick="if(event.target===this)closeCoupangUpload()">
    <div class="ana-modal" style="width:480px;max-width:96vw">
      <div class="ana-modal-hdr"><span id="coupang-upload-title">上傳檔案｜酷澎</span><button class="ana-close-btn" onclick="closeCoupangUpload()">✕</button></div>
      <div class="ana-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <label class="ucard" id="cup-mobic-card" style="width:100%;box-sizing:border-box">
          <input type="file" id="cup-mobic-input" accept=".xlsx,.xls" onchange="onCoupangFile(event,'mobic')">
          <div class="ucard-icon">📦</div>
          <div style="flex:1;min-width:0">
            <div class="ucard-title">莫筆克銷售分析</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">含銷售額、銷售成本、毛利、數量、庫存 (.xlsx)</div>
          </div>
          <span id="cup-mobic-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
        </label>
        <label class="ucard" id="cup-idlist-card" style="width:100%;box-sizing:border-box">
          <input type="file" id="cup-idlist-input" accept=".xlsx,.xls" onchange="onCoupangFile(event,'idlist')">
          <div class="ucard-icon">📋</div>
          <div style="flex:1;min-width:0">
            <div class="ucard-title">商品ID清單</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">商品ID ↔ 編號對照 (.xlsx)</div>
          </div>
          <span id="cup-idlist-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
        </label>
      </div>
      <div class="ana-modal-ftr">
        <button class="gen-btn" id="cup-gen-btn" onclick="generateCoupang()" disabled>▶ 產生並儲存</button>
      </div>
    </div>
  </div>
  <div class="ana-overlay" id="momo-rpt-upload-overlay" onclick="if(event.target===this)closeMomoRptUpload()">
    <div class="ana-modal" style="width:480px;max-width:96vw">
      <div class="ana-modal-hdr"><span id="momo-rpt-upload-title">上傳檔案｜MOMO</span><button class="ana-close-btn" onclick="closeMomoRptUpload()">✕</button></div>
      <div class="ana-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <label class="ucard" id="myp-product-card" style="width:100%;box-sizing:border-box">
          <input type="file" id="myp-product-input" accept=".xlsx,.xls" onchange="onMomoRptFile(event,'product')">
          <div class="ucard-icon">📦</div>
          <div style="flex:1;min-width:0">
            <div class="ucard-title">商品分析報表</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">含瀏覽量、流量成長率、訂購數等商品明細 (.xls/.xlsx)</div>
          </div>
          <span id="myp-product-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
        </label>
        <label class="ucard" id="myp-sales-card" style="width:100%;box-sizing:border-box">
          <input type="file" id="myp-sales-input" accept=".xlsx,.xls" onchange="onMomoRptFile(event,'sales')">
          <div class="ucard-icon">📊</div>
          <div style="flex:1;min-width:0">
            <div class="ucard-title">銷售分析報表</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">含本期/前期總覽跟每日明細 (.xls/.xlsx)</div>
          </div>
          <span id="myp-sales-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
        </label>
      </div>
      <div class="ana-modal-ftr">
        <button class="gen-btn" id="myp-gen-btn" onclick="generateMomoRpt()" disabled>▶ 產生並儲存</button>
      </div>
    </div>
  </div>
  <div class="ana-overlay" id="aff-upload-overlay" onclick="if(event.target===this)closeAffUpload()">
    <div class="ana-modal" style="width:480px;max-width:96vw">
      <div class="ana-modal-hdr"><span id="aff-upload-title">上傳檔案｜聯盟行銷</span><button class="ana-close-btn" onclick="closeAffUpload()">✕</button></div>
      <div class="ana-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <label class="ucard" id="aff-conv-card" style="width:100%;box-sizing:border-box">
          <input type="file" id="aff-conv-input" accept=".csv" onchange="onAffFile(event,'conv')">
          <div class="ucard-icon">📦</div>
          <div style="flex:1;min-width:0">
            <div class="ucard-title">推廣訂單報表</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">SellerConversionReport (.csv)</div>
          </div>
          <span id="aff-conv-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
        </label>
        <label class="ucard" id="aff-list-card" style="width:100%;box-sizing:border-box">
          <input type="file" id="aff-list-input" accept=".xlsx,.xls" onchange="onAffFile(event,'list')">
          <div class="ucard-icon">📋</div>
          <div style="flex:1;min-width:0">
            <div class="ucard-title">蝦皮商品清單</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">商品ID ↔ 莫比克名對照，讀「好麻吉」分頁 (.xlsx)</div>
          </div>
          <span id="aff-list-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
        </label>
      </div>
      <div class="ana-modal-ftr">
        <button class="gen-btn" id="aff-gen-btn" onclick="generateAffRpt()" disabled>▶ 產生並儲存</button>
      </div>
    </div>
  </div>
  <div class="ana-overlay" id="coupang-dist-overlay" onclick="if(event.target===this)closeCoupangDist()">
    <div class="ana-modal" style="width:400px;max-width:96vw">
      <div class="ana-modal-hdr"><span>階層分布｜純利率區間</span><button class="ana-close-btn" onclick="closeCoupangDist()">✕</button></div>
      <div class="ana-modal-body" id="coupang-dist-body" style="padding:20px;overflow-y:auto;max-height:72vh"></div>
    </div>
  </div>
  <div class="ana-overlay" id="dist-modal-overlay" onclick="if(event.target===this)closeDistModal()">
    <div class="ana-modal" style="width:560px;max-width:96vw">
      <div class="ana-modal-hdr"><span>階層分布圖</span><button class="ana-close-btn" onclick="closeDistModal()">✕</button></div>
      <div class="ana-modal-body" id="dist-modal-body" style="padding:20px;overflow-y:auto;max-height:72vh"></div>
    </div>
  </div>
  <div class="ana-overlay" id="ads-edit-overlay" onclick="if(event.target===this)closeAdsEditModal()">
    <div class="ana-modal" style="width:400px;max-width:96vw">
      <div class="ana-modal-hdr"><span>修改廣告費</span><button class="ana-close-btn" onclick="closeAdsEditModal()">✕</button></div>
      <div class="ana-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:16px">
        <div>
          <div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">商品</div>
          <div id="ads-edit-product" style="font-size:14px;font-weight:600;color:#1a1a2e"></div>
        </div>
        <div style="display:flex;gap:20px">
          <div>
            <div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">目前廣告費</div>
            <div id="ads-edit-current" style="font-size:18px;font-weight:700;color:#f59e0b;font-variant-numeric:tabular-nums"></div>
          </div>
          <div style="flex:1">
            <div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">新廣告費</div>
            <input type="number" id="ads-edit-input" oninput="updateAdsEditPreview()" onkeydown="if(event.key==='Enter')confirmAdsEdit();if(event.key==='Escape')closeAdsEditModal()" style="width:100%;padding:7px 10px;border:1.5px solid #5b5fcf;border-radius:8px;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;outline:none;box-sizing:border-box">
          </div>
        </div>
        <div id="ads-edit-preview" style="background:#f8f9fc;border-radius:8px;padding:10px 14px;font-size:13px;min-height:36px"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
          <button onclick="closeAdsEditModal()" style="padding:8px 18px;border:1.5px solid #e5e7eb;border-radius:8px;background:white;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer">取消</button>
          <button onclick="confirmAdsEdit()" style="padding:8px 18px;border:0;border-radius:8px;background:#5b5fcf;font-size:13px;font-weight:700;color:white;cursor:pointer">確認修改</button>
        </div>
      </div>
    </div>
  </div>
  <div class="ana-overlay" id="delete-file-overlay" style="z-index:3000" onclick="if(event.target===this)closeDeleteFileModal()">
    <div class="ana-modal" style="width:360px;max-width:96vw">
      <div class="ana-modal-hdr"><span>刪除確認</span><button class="ana-close-btn" onclick="closeDeleteFileModal()">✕</button></div>
      <div class="ana-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:16px">
        <div id="delete-file-msg" style="font-size:14px;color:#374151;line-height:1.6"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
          <button onclick="closeDeleteFileModal()" style="padding:8px 18px;border:1.5px solid #e5e7eb;border-radius:8px;background:white;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer">取消</button>
          <button onclick="confirmDeleteFile()" style="padding:8px 18px;border:0;border-radius:8px;background:#ef4444;font-size:13px;font-weight:700;color:white;cursor:pointer">刪除</button>
        </div>
      </div>
    </div>
  </div>
  <div class="ana-overlay" id="upload-modal-overlay" onclick="if(event.target===this)closeUploadModal()">
    <div class="ana-modal" style="width:520px;max-width:96vw">
      <div class="ana-modal-hdr"><span>上傳檔案</span><button class="ana-close-btn" onclick="closeUploadModal()">✕</button></div>
      <div class="ana-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div style="font-size:12px;color:#9ca3af" id="upm-shop-hint">目前賣場：—</div>
          <div style="display:flex;align-items:center;gap:6px;background:#f3f4f6;border-radius:7px;padding:5px 10px">
            <span style="font-size:12px;color:#6b7280;font-weight:500">平台手續費</span>
            <input type="number" class="setting-input" id="platformRate" value="20.5" min="0" max="100" step="0.1" style="width:54px">
            <span style="font-size:12px;color:#6b7280">%</span>
          </div>
        </div>
        <label class="ucard" id="upm-map" style="width:100%;box-sizing:border-box">
          <input type="file" id="upm-map-input" accept=".xlsx,.xls" onchange="onGlobalFile(event,'map')">
          <button id="upm-map-del" onclick="event.preventDefault();event.stopPropagation();openDeleteFileModal('map')" style="background:none;border:none;cursor:pointer;font-size:17px;padding:2px 6px 2px 0;flex-shrink:0" title="刪除">🗑️</button>
          <div class="ucard-icon" id="upm-map-icon">🗂</div>
          <div class="ucard-info">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="ucard-title" id="upm-map-title">蝦皮商品清單</div>
              <span id="upm-map-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
            </div>
          </div>
        </label>
        <label class="ucard" id="upm-mobic" style="width:100%;box-sizing:border-box">
          <input type="file" id="upm-mobic-input" accept=".xlsx,.xls" onchange="onGlobalFile(event,'mobic')">
          <button id="upm-mobic-del" onclick="event.preventDefault();event.stopPropagation();openDeleteFileModal('mobic')" style="background:none;border:none;cursor:pointer;font-size:17px;padding:2px 6px 2px 0;flex-shrink:0" title="刪除">🗑️</button>
          <div class="ucard-icon" id="upm-mobic-icon">📦</div>
          <div class="ucard-info">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="ucard-title" id="upm-mobic-title">莫筆克銷售分析</div>
              <span id="upm-mobic-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
            </div>
            <div class="ucard-sub">.xlsx</div>
          </div>
        </label>
        <label class="ucard" id="upm-ads" style="width:100%;box-sizing:border-box">
          <input type="file" id="upm-ads-input" accept=".csv" onchange="onGlobalFile(event,'ads')">
          <button id="upm-ads-del" onclick="event.preventDefault();event.stopPropagation();openDeleteFileModal('ads')" style="background:none;border:none;cursor:pointer;font-size:17px;padding:2px 6px 2px 0;flex-shrink:0" title="刪除">🗑️</button>
          <div class="ucard-icon" id="upm-ads-icon">📣</div>
          <div class="ucard-info">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="ucard-title" id="upm-ads-title">蝦皮廣告報表</div>
              <span id="upm-ads-status" style="font-size:11px;font-weight:600;color:#ef4444">✗ 未載入</span>
            </div>
            <div class="ucard-sub">.csv</div>
          </div>
        </label>
        <label class="ucard" id="upm-selads" style="width:100%;box-sizing:border-box">
          <input type="file" id="upm-selads-input" accept=".xlsx,.xls,.csv" onchange="onGlobalFile(event,'selads')">
          <button id="upm-selads-del" onclick="event.preventDefault();event.stopPropagation();openDeleteFileModal('selads')" style="background:none;border:none;cursor:pointer;font-size:17px;padding:2px 6px 2px 0;flex-shrink:0" title="刪除">🗑️</button>
          <div class="ucard-icon" id="upm-selads-icon">🎯</div>
          <div class="ucard-info">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="ucard-title" id="upm-selads-title">選品廣告清單</div>
              <span id="upm-selads-status" style="font-size:11px;font-weight:600;color:#9ca3af">— 選填</span>
            </div>
            <div class="ucard-sub">.xlsx</div>
          </div>
        </label>
        <div style="margin-top:4px">
          <div style="font-size:11px;color:#9ca3af;font-weight:700;margin-bottom:4px;padding-left:2px">廣告群組（可多檔，選填）</div>
          <div id="upm-groupads-list" style="display:flex;flex-direction:column;gap:6px"></div>
          <input type="file" id="upm-groupads-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="onGlobalFile(event,'groupads')">
          <button onclick="document.getElementById('upm-groupads-input').click()" style="margin-top:6px;width:100%;border:1.5px dashed #d1d5db;border-radius:9px;padding:8px;background:#fff;color:#6b7280;cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.borderColor='#5b5fcf';this.style.color='#5b5fcf'" onmouseout="this.style.borderColor='#d1d5db';this.style.color='#6b7280'">＋ 新增廣告群組</button>
        </div>
      </div>
      <div class="ana-modal-ftr" style="justify-content:space-between;align-items:center">
        <span id="upm-gen-hint" style="font-size:12px;color:#9ca3af">上傳莫筆克＋廣告報表後可產生</span>
        <div style="display:flex;gap:8px;align-items:center">
          <button id="upm-clear-btn" onclick="clearPeriodFromModal()" style="padding:8px 16px;border:1.5px solid #fca5a5;border-radius:8px;background:#fff;color:#ef4444;font-size:13px;font-weight:600;cursor:pointer">🗑 清除重傳</button>
          <button class="gen-btn" id="upm-gen-btn" onclick="onGlobalGenerate()" disabled>▶ 產生報表</button>
        </div>
      </div>
    </div>
  </div>
  <div id="content-總表" class="shop-content active" style="padding:16px 20px;min-height:200px"></div>
  <div id="content-好麻吉" class="shop-content" style="padding:16px 20px"></div>
  <div id="content-玩樂" class="shop-content" style="padding:16px 20px"></div>
  <div id="content-森之旅" class="shop-content" style="padding:16px 20px"></div>
  <div id="content-維克" class="shop-content" style="padding:16px 20px"></div>
  <div id="content-酷澎" class="shop-content" style="padding:16px 20px"></div>
  <div id="momo-content-總表" class="shop-content" style="padding:16px 20px"></div>
  <div id="momo-content-甲配" class="shop-content" style="padding:16px 20px"></div>
  <div id="momo-content-乙配" class="shop-content" style="padding:16px 20px"></div>
  <div id="momo-content-MO+麻吉" class="shop-content" style="padding:16px 20px"></div>
  <div id="momo-content-MO+森之旅" class="shop-content" style="padding:16px 20px"></div>
  <div id="coupang-content-總表" class="shop-content" style="padding:16px 20px"></div>
  <div id="coupang-content-麻吉" class="shop-content" style="padding:16px 20px"></div>
  <div id="coupang-content-露營館" class="shop-content" style="padding:16px 20px"></div>
</div>`;

const SHOPS=[{id:'好麻吉',color:'#5b5fcf'},{id:'玩樂',color:'#10b981'},{id:'森之旅',color:'#f59e0b'},{id:'維克',color:'#14b8a6'}];
const MONTHS=['2026/01','2026/02','2026/03','2026/04','2026/05','2026/06','2026/07','2026/08','2026/09','2026/10','2026/11','2026/12'];
const HALVES=[{id:'first',label:'上半（1-15）'},{id:'second',label:'下半（16-末）'},{id:'full',label:'整月（1-末）'}];

const ANA_TAGS=[
  {label:'危險商品',cls:'tag-danger',dot:'#991b1b'},
  {label:'高利潤商品',cls:'tag-high',dot:'#065f46'},
  {label:'低淨利',cls:'tag-low',dot:'#92400e'},
  {label:'賠錢中',cls:'tag-lose',dot:'#7f1d1d'},
  {label:'低效廣告',cls:'tag-bad',dot:'#78350f'},
  {label:'加300',cls:'tag-add300',dot:'#1e40af'},
  {label:'加200',cls:'tag-add200',dot:'#1e40af'},
  {label:'加100',cls:'tag-add100',dot:'#5b21b6'},
  {label:'加50',cls:'tag-add50',dot:'#166534'},
  {label:'減300',cls:'tag-sub300',dot:'#7f1d1d'},
  {label:'減200',cls:'tag-sub200',dot:'#991b1b'},
  {label:'減100',cls:'tag-sub100',dot:'#9a3412'},
];
const GROWTH_TAGS=[
  {label:'🔴重跌品',cls:'tag-danger',dot:'#991b1b'},
  {label:'🟢爆發品',cls:'tag-high',dot:'#065f46'},
  {label:'👑高營收',cls:'tag-add300',dot:'#1e40af'},
  {label:'🟨中營收',cls:'tag-add200',dot:'#1e40af'},
  {label:'🟡發展品',cls:'tag-add100',dot:'#5b21b6'},
  {label:'🔻低利品',cls:'tag-low',dot:'#92400e'},
  {label:'⚫斷銷品',cls:'tag-lose',dot:'#7f1d1d'},
];
const state={};
const _initNow=new Date();const _initCurMonth=`${_initNow.getFullYear()}/${String(_initNow.getMonth()+1).padStart(2,'0')}`;
// 讀上次使用者離開時的月份/區間；沒有就用當月/上半月（讓使用者下次回來停在原本位置）
function _readLastMonth(shopId){try{const v=localStorage.getItem('ec_lastMonth_'+shopId);return v&&MONTHS.indexOf(v)>=0?v:_initCurMonth;}catch{return _initCurMonth;}}
function _readLastHalf(shopId){try{const v=localStorage.getItem('ec_lastHalf_'+shopId);return v==='first'||v==='second'?v:'first';}catch{return 'first';}}
SHOPS.forEach(s=>{state[s.id]={rawMobic:null,rawAds:null,rawSelAds:null,rawGroupAdsList:[],rawMap:{},curMonth:_readLastMonth(s.id),curHalf:_readLastHalf(s.id),days:15,_built:null,_period:'',filters:{},sorts:{},tagFilters:[]};});
let globalMap={};
let curShop='總表';
let openPopup=null;

// ── Storage（本機優先、雲端手動同步） ──
// 追蹤所有已改但還沒推雲端的 key，讓使用者按「☁ 同步雲端」時一次推
const _pendingSyncKeys = new Set();
function _markPending(key){
  _pendingSyncKeys.add(key);
  _showSyncBtn();
}
// 本機儲存（不推雲端），加到 pending 集合等使用者手動同步
function _cloudWriteSafe(key, payload, label){
  // 存 localStorage
  try{ localStorage.setItem(key, JSON.stringify(payload)); }catch{}
  // 存 in-memory mirror（讓其他讀取的地方拿得到最新值）
  try{ if(typeof Store!=='undefined' && Store._mem) Store._mem[key] = payload; }catch{}
  // 標記待同步
  _markPending(key);
}
function lsKey(shop,month,half){return`ec|${shop}|${month}|${half}`;}
function lsSave(shop,month,half,built,period,days){
  // 只存本機；同步雲端需手動按「☁ 同步雲端」
  const payload={built,period,days,rate:getPlatformRate(),ts:Date.now()};
  const k=lsKey(shop,month,half);
  try{localStorage.setItem(k,JSON.stringify(payload));}catch(e){}
  try{if(typeof Store!=='undefined'&&Store._profitMem)Store._profitMem[k]=payload;}catch{}
  // 記完整的 lsKey 到 pending set — 這樣使用者切到別的月份/賣場再產生報表，
  //   舊的月份/賣場也還在 pending 裡，按同步時會一起推上雲端（避免只推當前顯示那份）
  _pendingSyncKeys.add(k);
  _showSyncBtn(shop);
}
// 真實 pending 筆數（排除 __shop__| marker 和 _summary_v1）
//   _summary_v1 是總表資料，總表已改為自動同步（saveSummaryRows 直接推雲端），
//   不會經過 pending set；但舊版可能已把它塞進 set → 保險排除掉，避免離開頁面誤跳「未同步」。
function _realPendingCount(){
  let n=0;
  _pendingSyncKeys.forEach(k=>{
    if(k.startsWith('__shop__|')) return;
    if(k==='_summary_v1') return;
    n++;
  });
  return n;
}
window.__profitPendingCount = _realPendingCount;

function _showSyncBtn(shop){
  const btn=document.getElementById('global-sync-btn');
  if(!btn) return;
  const n=_realPendingCount();
  if(n===0){
    // 沒有待同步：按鈕還是可按（讓使用者隨時能推），但變灰淡
    btn.disabled=false;btn.style.opacity='0.6';btn.style.cursor='pointer';btn.style.background='';btn.style.color='';btn.style.borderColor='';btn.textContent='☁ 同步雲端';
  }else{
    // 有待同步：橘色亮起 + 顯示筆數
    btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';btn.style.background='#f59e0b';btn.style.color='#fff';btn.style.borderColor='#f59e0b';btn.textContent=`☁ 同步雲端 (${n})`;
  }
}
// 掃出本機所有 ec|shop|month|half 報表 key 塞進 pending set
//   讓 syncToCloud 不只推「本次會話新增」的，也把 localStorage 裡累積
//   （包含前次重整前留下、pending set 已清空）的一併推上雲端。
function _sweepAllLocalReportsIntoPending(){
  try{
    if(typeof Store!=='undefined'&&Store._profitMem){
      Object.keys(Store._profitMem).forEach(k=>{ if(k.startsWith('ec|')) _pendingSyncKeys.add(k); });
    }
  }catch{}
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith('ec|')){
        _pendingSyncKeys.add(k);
        // localStorage 有但 _profitMem 沒有 → 撈回 _profitMem 讓推送流程拿得到
        if(!(Store._profitMem&&Store._profitMem[k])){
          try{ Store._profitMem=Store._profitMem||{}; Store._profitMem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
      }
    }
  }catch{}
}

function syncToCloud(shop){
  const btn=document.getElementById('global-sync-btn');
  if(btn){btn.disabled=true;btn.textContent='同步中…';}
  if(!window.__cloudProfit||!window.__cloudProfitCol){
    if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'雲端未連線',message:'淨利表的雲端尚未就緒，請重新整理。',kind:'warn'});
    else if(typeof showToast==='function') showToast('雲端未連線','error');
    if(btn)btn.disabled=false;return;
  }
  // 一併把本機累積的所有 ec|* 報表塞進 pending，確保重整後遺失的也會被推
  _sweepAllLocalReportsIntoPending();
  const promises=[];
  const syncedReports=[]; // 記錄有推的報表 key，方便 debug + toast
  // 同步當前 shop 的備註 / 編輯（按期間獨立存）
  const s=state[shop];
  const _nk=shop+'|'+(s?.curMonth||'')+'|'+(s?.curHalf||'');
  const notes=getNotes(_nk);
  if(Object.keys(notes).length>0) promises.push(window.__cloudProfit.setField('ec_notes|'+_nk,notes));
  const edits=getEdits(shop);
  if(Object.keys(edits).length>0) promises.push(window.__cloudProfit.setField('ec_edits|'+shop,edits));
  // 遍歷所有 pending keys：
  //   ec|... 開頭  = 報表 key，用 setReport 推到 profits collection
  //   __shop__|... = shop-level marker，忽略（歷史原因保留）
  //   其他        = 設定/標籤/總表 rows 等，用 setField 推到 profit doc
  _pendingSyncKeys.forEach(pk=>{
    if(pk.startsWith('__shop__|')) return;
    if(pk.startsWith('ec|')){
      // 報表 key
      const payload=Store._profitMem&&Store._profitMem[pk];
      if(payload){ promises.push(window.__cloudProfitCol.setReport(pk,payload)); syncedReports.push(pk); }
      return;
    }
    // field key（設定類）
    let val=null;
    try{ if(Store._mem && Store._mem[pk]!==undefined) val=Store._mem[pk]; }catch{}
    if(val===null){ try{ const raw=localStorage.getItem(pk); if(raw) val=JSON.parse(raw); }catch{} }
    if(val!==null && val!==undefined) promises.push(window.__cloudProfit.setField(pk,val));
  });
  // 兼容舊行為：如果 pending 沒帶當前 shop 的報表（例如舊版產生的報表），額外推一次
  if(s&&s._built){
    const k=lsKey(shop,s.curMonth,s.curHalf);
    if(!syncedReports.includes(k)){
      const payload=Store._profitMem&&Store._profitMem[k];
      if(payload) promises.push(window.__cloudProfitCol.setReport(k,payload));
    }
  }
  console.log('[syncToCloud] pushing', promises.length, '筆；報表 keys:', syncedReports);
  if(promises.length===0){
    if(typeof showToast==='function') showToast('沒有需要同步的資料','info');
    if(btn){btn.disabled=false; _showSyncBtn();} return;
  }
  Promise.all(promises).then(()=>{
    // 同步完成 → 清 pending set
    _pendingSyncKeys.clear();
    if(btn){btn.textContent='✓ 已同步';btn.style.background='#10b981';btn.style.borderColor='#10b981';setTimeout(()=>{ _showSyncBtn(); },2000);}
    if(typeof showToast==='function') showToast('✓ 已同步 '+promises.length+' 筆到雲端','success');
    // 同步成功後，把今天的調整摘要自動寫入該同事的工作日誌
    try { if(window.App && typeof App._updateDailyProgressFromAdjustments === 'function') App._updateDailyProgressFromAdjustments({ pushToCloud: true }); }
    catch(e){ console.warn('[autoSummary profit]', e); }
  }).catch(e=>{
    const msg=(e&&e.message)||String(e);
    if(window.App&&typeof App.showAlertModal==='function'){
      App.showAlertModal({title:'淨利表同步失敗',message:'部分資料沒推上雲端。資料還在本機，重整前請先匯出 Excel 備份。',detail:msg,kind:'error'});
    } else if(typeof showToast==='function') showToast('同步失敗：'+msg,'error');
    if(btn){btn.disabled=false; _showSyncBtn();}
  });
}
function lsLoad(shop,month,half){
  const k=lsKey(shop,month,half);
  // 雲端優先：先看新的 profit doc，再 fallback 到舊的 main doc（過渡期相容）
  try{ if(typeof Store!='undefined' && Store._profitMem && Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!='undefined' && Store._mem && Store._mem[k]) return Store._mem[k]; }catch{}
  try{const d=localStorage.getItem(k);return d?JSON.parse(d):null;}catch{return null;}
}
function lsHasAny(shop){
  try{
    if(typeof Store!='undefined' && Store._profitMem){
      for(const k of Object.keys(Store._profitMem)){ if(k.startsWith(`ec|${shop}|`)) return true; }
    }
    if(typeof Store!='undefined' && Store._mem){
      for(const k of Object.keys(Store._mem)){ if(k.startsWith(`ec|${shop}|`)) return true; }
    }
  }catch{}
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k && k.startsWith(`ec|${shop}|`))return true;}
  return false;
}

// ── Init ──
SHOPS.forEach(s=>{const el=document.getElementById('content-'+s.id);if(el)el.innerHTML=shopHTML(s.id);});
SHOPS.forEach(s=>{onMonthChange(s.id);if(lsHasAny(s.id)){const d=document.getElementById('dot-'+s.id);if(d)d.classList.add('on');}});

// 從 localStorage 還原上傳卡片狀態（只還原 UI，原始資料需重新上傳才能產生）
(function restoreUploads(){
  try{
    const meta=localStorage.getItem('ec|filemeta|globalMap');
    if(meta){
      const m=JSON.parse(meta);
      SHOPS.forEach(s=>{
        const uc=document.getElementById('uc-map-'+s.id);
        const ui=document.getElementById('ui-map-'+s.id);
        const ut=document.getElementById('ut-map-'+s.id);
        const us=document.getElementById('us-map-'+s.id);
        if(uc)uc.className='ucard ok';
        if(ui)ui.textContent='✅';
        if(ut)ut.textContent=(m.name||'').length>22?(m.name||'').slice(0,22)+'…':(m.name||'');
        if(us)us.textContent=`已載入 ${m.cnt||''} 筆`;
        const del=document.getElementById('del-map-'+s.id);if(del)del.style.display='';
      });
    }
  }catch(e){}
  SHOPS.forEach(s=>{
    ['mobic','ads'].forEach(type=>{
      try{
        const meta=localStorage.getItem(`ec|filemeta|${s.id}|${type}`);
        if(meta){
          const m=JSON.parse(meta);
          markCard(s.id,type,'✅',m.name||'','ok');
        }
      }catch(e){}
    });
  });
})();

function deleteUpload(shop,type){
  const isMap=type==='map';
  const msg=isMap?'確定要刪除商品對照表？（所有賣場共用，刪除後需重新上傳）'
    :type==='mobic'?`確定要刪除 ${shop} 的莫筆克銷售資料？`
    :type==='ads'?`確定要刪除 ${shop} 的廣告報表？`
    :`確定要刪除 ${shop} 的選品廣告清單？`;
  if(!confirm(msg))return;
  if(isMap){
    try{localStorage.removeItem('ec|filemeta|globalMap');}catch(e){}
    globalMap={};
    SHOPS.forEach(s=>{
      state[s.id].rawMap={};
      const uc=document.getElementById('uc-map-'+s.id);
      const ui=document.getElementById('ui-map-'+s.id);
      const ut=document.getElementById('ut-map-'+s.id);
      const us=document.getElementById('us-map-'+s.id);
      if(uc)uc.className='ucard';
      if(ui)ui.textContent='🗂';
      if(ut)ut.textContent='蝦皮商品清單';
      if(us)us.textContent='';
      const del=document.getElementById('del-map-'+s.id);if(del)del.style.display='none';
    });
  }else{
    try{localStorage.removeItem(`ec|filemeta|${shop}|${type}`);}catch(e){}
    const icon=type==='mobic'?'📦':type==='ads'?'📣':'🎯';
    const title=type==='mobic'?'莫筆克銷售分析':type==='ads'?'蝦皮廣告報表':'選品廣告清單';
    if(type==='mobic')state[shop].rawMobic=null;
    else if(type==='ads')state[shop].rawAds=null;
    else state[shop].rawSelAds=null;
    markCard(shop,type,icon,title,'');
    checkReady(shop);
  }
}

// ── 雲端資料到達時自動重載 ──
window.addEventListener('profitDataReady', (e)=>{
  const changedShops = e.detail?.changedShops;
  // 剛儲存過（備註/編輯）→ Firestore echo 回來，不重新 render 避免閃爍
  const justSaved = window._shopJustSaved && (Date.now()-window._shopJustSaved < 5000);
  if(justSaved) return;
  // null/undefined = 初次載入，更新全部；空陣列 = 只有非賣場資料（如_summary_v1）變動，跳過
  const shopsToUpdate = changedShops==null ? SHOPS : SHOPS.filter(s=>changedShops.includes(s.id));
  try{
    shopsToUpdate.forEach(s=>{
      onMonthChange(s.id);
      // 若目前月份無資料，自動切到 profits collection 裡最新有資料的月份
      if(!state[s.id]?._built){
        const shopKeys=Object.keys(Store._profitMem||{}).filter(k=>k.startsWith(`ec|${s.id}|`));
        if(shopKeys.length>0){
          const months=[...new Set(shopKeys.map(k=>k.split('|')[2]))].filter(Boolean).sort().reverse();
          if(months[0]){
            const sel=document.getElementById('month-sel-'+s.id);
            if(sel&&sel.value!==months[0]){sel.value=months[0];onMonthChange(s.id);}
          }
        }
      }
      if(lsHasAny(s.id)){const d=document.getElementById('dot-'+s.id);if(d)d.classList.add('on');}
    });
    // 只有賣場資料（非 _summary_v1）變動時才重新渲染總表
    const hasSummaryChange=changedShops==null||(changedShops&&changedShops.length>0);
    const skipSummary=window._summaryJustSaved&&(Date.now()-window._summaryJustSaved<5000);
    if(typeof renderSummary==='function'&&hasSummaryChange&&!skipSummary) renderSummary();
    // 重載後確保當前賣場 tab 正確：只在 tab 真的跑掉時才修復
    if(curShop&&curShop!=='總表'){
      const content=document.getElementById('content-'+curShop);
      if(content&&!content.classList.contains('active')){
        document.querySelectorAll('.shop-content').forEach(el=>el.classList.remove('active'));
        content.classList.add('active');
        const kpi=document.getElementById('header-kpi-row');if(kpi)kpi.style.display='flex';
      }
      if(typeof syncHeaderKpis==='function')syncHeaderKpis(curShop);
    }
  }catch(e){ console.warn('[淨利表] 重載失敗', e); }
});

// ── v3 一次性遷移：把淨利表資料從 app/main 搬到 app/profit、本地推上去、清掉 app/main 的舊欄位 ──
(function backfillProfitToCloud(){
  const FLAG='ec.profit_backfilled_v3';
  const PREFIXES=['ec|','ec_edits|','ec_notes|','ec_ana_','ec_growth_','ec_hcols|'];
  function isProfitKey(k){ return PREFIXES.some(p=>k.startsWith(p)); }
  async function doBackfill(){
    try{
      if(localStorage.getItem(FLAG)==='1') return;
      if(!window.__cloudStore || !window.__cloudProfit) return;

      // 1) 抓 app/main 和 app/profit 的現況
      const [mainSnap, profitSnap] = await Promise.all([
        window.__cloudStore.getDoc(),
        window.__cloudProfit.getDoc(),
      ]);
      const mainData = (mainSnap && mainSnap.exists()) ? (mainSnap.data()||{}) : {};
      const profitData = (profitSnap && profitSnap.exists()) ? (profitSnap.data()||{}) : {};

      // 2) 從 app/main 搬到 app/profit（雲端為主，覆蓋本地）
      const fromMain = Object.keys(mainData).filter(isProfitKey);
      let moved = 0;
      for(const k of fromMain){
        if(profitData[k]!==undefined) continue; // app/profit 已有，不蓋
        try{ await window.__cloudProfit.setField(k, mainData[k]); moved++; }catch(e){ console.warn('搬移失敗', k, e); }
      }
      // 搬完後刪除 app/main 的舊欄位，釋放 1MB 額度
      if(fromMain.length>0){
        try{ await window.__cloudStore.removeFields(fromMain); console.log('[淨利表] 已從 app/main 清掉', fromMain.length, '個淨利表欄位'); }
        catch(e){ console.warn('清掉 app/main 失敗', e); }
      }

      // 3) 本地有但雲端兩邊都沒有的 → 推到 app/profit
      const localKeys=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k && isProfitKey(k)) localKeys.push(k);
      }
      let pushed=0;
      for(const k of localKeys){
        if(profitData[k]!==undefined || mainData[k]!==undefined) continue;
        try{
          const val=JSON.parse(localStorage.getItem(k));
          await window.__cloudProfit.setField(k,val);
          pushed++;
        }catch{}
      }

      console.log(`[淨利表] backfill v3 完成：從 main 搬 ${moved} 筆、本地新推 ${pushed} 筆`);
      try{localStorage.setItem(FLAG,'1');}catch{}
    }catch(err){ console.warn('[淨利表] backfill v3 失敗', err); }
  }
  if(window.__cloudStore && window.__cloudProfit){ doBackfill(); }
  else{ window.addEventListener('cloudStoreReady', doBackfill, { once:true }); }
})();

function shopHTML(shop){return`
  <div style="display:none">
    <label class="ucard" id="uc-map-${shop}"><input type="file" accept=".xlsx,.xls" onchange="onMapFile(event,'${shop}')"><div class="ucard-icon" id="ui-map-${shop}">🗂</div><div class="ucard-info"><div class="ucard-title" id="ut-map-${shop}">蝦皮商品清單</div><div class="ucard-sub" id="us-map-${shop}"></div></div><span id="del-map-${shop}" onclick="event.preventDefault();event.stopPropagation();deleteUpload('${shop}','map')" style="display:none;margin-left:auto;color:#ef4444;cursor:pointer;padding:2px 8px;font-size:14px;flex-shrink:0" title="刪除">🗑</span></label>
    <label class="ucard" id="uc-mobic-${shop}"><input type="file" accept=".xlsx,.xls" onchange="onFile(event,'${shop}','mobic')"><div class="ucard-icon" id="ui-mobic-${shop}">📦</div><div class="ucard-info"><div class="ucard-title" id="ut-mobic-${shop}">莫筆克銷售分析</div><div class="ucard-sub">.xlsx</div></div><span id="del-mobic-${shop}" onclick="event.preventDefault();event.stopPropagation();deleteUpload('${shop}','mobic')" style="display:none;margin-left:auto;color:#ef4444;cursor:pointer;padding:2px 8px;font-size:14px;flex-shrink:0" title="刪除">🗑</span></label>
    <label class="ucard" id="uc-ads-${shop}"><input type="file" accept=".csv" onchange="onFile(event,'${shop}','ads')"><div class="ucard-icon" id="ui-ads-${shop}">📣</div><div class="ucard-info"><div class="ucard-title" id="ut-ads-${shop}">蝦皮廣告報表</div><div class="ucard-sub" id="us-ads-${shop}">.csv</div></div><span id="del-ads-${shop}" onclick="event.preventDefault();event.stopPropagation();deleteUpload('${shop}','ads')" style="display:none;margin-left:auto;color:#ef4444;cursor:pointer;padding:2px 8px;font-size:14px;flex-shrink:0" title="刪除">🗑</span></label>
    <label class="ucard" id="uc-selads-${shop}"><input type="file" accept=".xlsx,.xls,.csv" onchange="onFile(event,'${shop}','selads')"><div class="ucard-icon" id="ui-selads-${shop}">🎯</div><div class="ucard-info"><div class="ucard-title" id="ut-selads-${shop}">選品廣告清單</div><div class="ucard-sub" id="us-selads-${shop}">.xlsx / .csv（選填）</div></div><span id="del-selads-${shop}" onclick="event.preventDefault();event.stopPropagation();deleteUpload('${shop}','selads')" style="display:none;margin-left:auto;color:#ef4444;cursor:pointer;padding:2px 8px;font-size:14px;flex-shrink:0" title="刪除">🗑</span></label>
    <div class="spin-row" id="spin-${shop}"><div class="spin"></div>讀取中…</div>
    <button class="gen-btn" id="gen-${shop}" onclick="generate('${shop}')" disabled>▶ 產生並儲存</button>
  </div>
  <div style="display:none" id="kpi-${shop}">
    <div id="kv-rev-${shop}"></div>
    <div id="kv-net-${shop}"></div>
    <div id="kv-ads-${shop}"></div>
  </div>
  ${shop==='好麻吉'?`
  <div id="aff-header-${shop}" style="display:none">
    ${affHeaderHtml(shop)}
  </div>
  <div style="display:flex;gap:4px;border-bottom:1px solid #e4e6ef;margin-bottom:16px">
    <div class="shop-view-tab" id="svtab-${shop}-profit" onclick="setShopViewMode('${shop}','profit')" style="padding:9px 18px;font-size:13px;font-weight:700;color:#5b5fcf;border-bottom:2px solid #5b5fcf;cursor:pointer">淨利表</div>
    <div class="shop-view-tab" id="svtab-${shop}-affiliate" onclick="setShopViewMode('${shop}','affiliate')" style="padding:9px 18px;font-size:13px;font-weight:400;color:#9ca3af;border-bottom:2px solid transparent;cursor:pointer">聯盟行銷</div>
  </div>`:''}
  <div id="sv-profit-${shop}">
    <div class="toolbar" id="tb-${shop}" style="position:relative">
      <span id="period-tag-${shop}" style="display:none"></span>
      <input type="text" class="search-input" id="search-${shop}" placeholder="🔍 搜尋商品…" oninput="applyFilters('${shop}')" style="display:none">
      <span class="row-cnt" id="cnt-${shop}"></span>
      <span class="sugg-filter-chip" id="sugg-chip-${shop}">
        <span id="sugg-chip-text-${shop}"></span>
        <button onclick="clearSuggFilter('${shop}')">清除篩選</button>
      </span>
      <div style="margin-left:auto;display:flex;align-items:center;gap:4px;position:relative">
        <button class="col-pick-btn" id="tag-btn-${shop}" onclick="toggleTagPopup('${shop}',this)">🏷 標籤</button>
        <div class="tag-filter-bar" id="tfbar-${shop}"></div>
      </div>
      <div class="col-picker-wrap"><button class="col-pick-btn" onclick="openColPicker('${shop}',this)">☰ 欄位</button></div>
      <button class="col-pick-btn" onclick="openDistModal('${shop}')" style="margin-left:2px">📊 階層圖</button>
    </div>
    <div id="tbl-${shop}">
      <div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">選擇區間後上傳報表，按「▶ 產生並儲存」</div></div>
    </div>
  </div>
  ${shop==='好麻吉'?`
  <div id="sv-affiliate-${shop}" style="display:none">
    <div id="aff-content-${shop}">
      <div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">上傳兩個報表後按「▶ 產生並儲存」</div></div>
    </div>
  </div>`:''}`;
}
// 聯盟行銷（目前只有好麻吉）的「總覽列」：跟淨利表的 header-kpi-row 同一個視覺位置（切到聯盟行銷分頁時
// 兩邊互相替換顯示，各自獨立不共用元素、不會互相覆蓋），上傳「推廣訂單報表」+「蝦皮商品清單」兩份檔案。
function affHeaderHtml(shop){
  return `
  <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f3f4f6">
    <div id="aff-kpi-block-${shop}" style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
      <div style="font-size:13px;color:#9ca3af">尚未上傳報表</div>
    </div>
    <div style="display:flex;gap:8px;margin-left:auto">
      <button class="export-btn" onclick="openAffUpload('${shop}')" style="border-color:#5b5fcf;color:#5b5fcf">⬆ 上傳檔案</button>
      <button class="export-btn" id="aff-sync-${shop}" disabled style="opacity:0.4;cursor:default" onclick="syncAffRptToCloud('${shop}')">☁ 同步雲端</button>
      <button class="export-btn" id="aff-clear-${shop}" disabled style="opacity:0.4;cursor:default;border-color:#ef4444;color:#ef4444" onclick="clearAffRpt('${shop}')">🗑 清除</button>
    </div>
  </div>`;
}
// 賣場內容切換：淨利表 / 聯盟行銷（目前只有好麻吉有這個切換，兩個畫面都是同一份 shopHTML 裡的區塊，切換只是顯示/隱藏，不重新渲染）
const _shopViewMode={};
function setShopViewMode(shop,mode){
  _shopViewMode[shop]=mode;
  const profitEl=document.getElementById('sv-profit-'+shop);
  const affEl=document.getElementById('sv-affiliate-'+shop);
  const affHeaderEl=document.getElementById('aff-header-'+shop);
  const globalKpiRow=document.getElementById('header-kpi-row');
  if(profitEl)profitEl.style.display=mode==='profit'?'':'none';
  if(affEl){
    affEl.style.display=mode==='affiliate'?'':'none';
    if(mode==='affiliate'&&!affEl.dataset.loaded){affEl.dataset.loaded='1';affRptTryLoadSaved(shop);}
  }
  // 淨利表跟聯盟行銷各自獨立的總覽列，切分頁時互相替換顯示，不共用同一組元素
  if(affHeaderEl)affHeaderEl.style.display=mode==='affiliate'?'':'none';
  if(globalKpiRow&&shop==='好麻吉')globalKpiRow.style.display=mode==='affiliate'?'none':'flex';
  const tabs={profit:document.getElementById('svtab-'+shop+'-profit'),affiliate:document.getElementById('svtab-'+shop+'-affiliate')};
  Object.entries(tabs).forEach(([m,el])=>{
    if(!el)return;
    const active=m===mode;
    el.style.color=active?'#5b5fcf':'#9ca3af';
    el.style.fontWeight=active?'700':'400';
    el.style.borderBottomColor=active?'#5b5fcf':'transparent';
  });
}

// ── Period ──
function getPeriodLabel(month,half){
  const[y,m]=month.split('/');const last=new Date(+y,+m,0).getDate();
  if(half==='first')return`${month}/01 – ${month}/15`;
  if(half==='second')return`${month}/16 – ${month}/${last}`;
  return`${month}/01 – ${month}/${last}`;
}
function getDays(month,half){
  const[y,m]=month.split('/');const last=new Date(+y,+m,0).getDate();
  if(half==='first')return 15;if(half==='second')return last-15;return last;
}
function onMonthChange(shop){
  const sel=document.getElementById('month-sel-'+shop);
  if(!sel)return;
  delete _editedAt[shop]; // 用戶主動切換月份，清除 edit 保護
  state[shop].curMonth=sel.value;
  try{localStorage.setItem('ec_lastMonth_'+shop,sel.value);}catch{} // 記住這個賣場的最後月份
  updateDaysBadge(shop);
  updateHalfBtnLabels(shop);
  tryLoadSaved(shop);
}
function onHalfChange(shop,half,btn){
  delete _editedAt[shop]; // 用戶主動切換區間，清除 edit 保護
  state[shop].curHalf=half;
  try{localStorage.setItem('ec_lastHalf_'+shop,half);}catch{} // 記住這個賣場的最後區間
  updateHalfBtnLabels(shop);
  updateDaysBadge(shop);
  tryLoadSaved(shop);
}
function updateDaysBadge(shop){
  const d=getDays(state[shop].curMonth,state[shop].curHalf);
  state[shop].days=d;
  const badge=document.getElementById('days-badge-'+shop);
  if(badge)badge.textContent=d+' 天';
}
function resetUploadCards(shop){
  // 只重置舊版 per-shop 上傳卡片的 UI，不清除 rawMobic/rawAds
  const mobic=document.getElementById('uc-mobic-'+shop);
  if(mobic)mobic.className='ucard';
  const mi=document.getElementById('ui-mobic-'+shop);
  if(mi)mi.textContent='📦';
  const mt=document.getElementById('ut-mobic-'+shop);
  if(mt)mt.textContent='莫筆克銷售分析';
  const ads=document.getElementById('uc-ads-'+shop);
  if(ads)ads.className='ucard';
  const ai=document.getElementById('ui-ads-'+shop);
  if(ai)ai.textContent='📣';
  const at=document.getElementById('ut-ads-'+shop);
  if(at)at.textContent='蝦皮廣告報表';
  const selads=document.getElementById('uc-selads-'+shop);
  if(selads)selads.className='ucard';
  const sai=document.getElementById('ui-selads-'+shop);
  if(sai)sai.textContent='🎯';
  const sat=document.getElementById('ut-selads-'+shop);
  if(sat)sat.textContent='選品廣告清單';
  const sadel=document.getElementById('del-selads-'+shop);
  if(sadel)sadel.style.display='none';
  checkReady(shop);
}

function tryLoadSaved(shop){
  const s=state[shop];const rep=lsLoad(shop,s.curMonth,s.curHalf);
  // 每次切換區間都重置上傳卡片，避免誤以為已上傳
  resetUploadCards(shop);
  if(rep){loadIntoUI(shop,rep.built,rep.period,rep.days);}
  else{
    state[shop]._built=null;
    document.getElementById('tbl-'+shop).innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">此區間尚無資料，請上傳報表產生</div></div>`;
    document.getElementById('period-tag-'+shop).textContent='';
    if(curShop===shop){const gb=document.getElementById('global-exp-btn');if(gb)gb.disabled=true;}
    setKpis(shop,0,0,0,0);
    updateTagFilterBar(shop);
  }
}
function clearPeriodFromModal(){
  const shop=curShop==='總表'?SHOPS[0].id:curShop;
  clearPeriod(shop);
}
function clearPeriod(shop){
  const s=state[shop];
  const periodLabel=getPeriodLabel(s.curMonth,s.curHalf);
  if(!confirm(`確定要清除「${shop}」${periodLabel}的報表與已上傳的檔案嗎？`))return;
  // 清除報表
  try{localStorage.removeItem(lsKey(shop,s.curMonth,s.curHalf));}catch(e){}
  try{if(typeof Store!=='undefined'&&Store._profitMem)delete Store._profitMem[lsKey(shop,s.curMonth,s.curHalf)];}catch{}
  // 清除上傳的檔案資料（全部 localStorage filemeta key，不管哪個區間）
  state[shop].rawMobic=null;
  state[shop].rawAds=null;
  state[shop].rawSelAds=null;
  state[shop].rawGroupAdsList=[];
  state[shop]._built=null;state[shop]._period='';state[shop]._extraAdsFee=0;
  // 刪除所有此賣場的 filemeta（不限月份/區間）
  const keysToRemove=[];
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(`ec|filemeta|${shop}|`))keysToRemove.push(k);}
  keysToRemove.forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
  saveGroupAdsMeta(shop);
  // 重置上傳卡片 UI（uc- 舊版 & upm- 新版）
  resetUploadCards(shop);
  // 直接重設 upm 卡片（不靠 openUploadModal 重開）
  ['mobic','ads'].forEach(t=>{
    const icon=t==='mobic'?'📦':'📣';const label=t==='mobic'?'莫筆克銷售分析':'蝦皮廣告報表';
    const el=document.getElementById('upm-'+t);if(el)el.className='ucard';
    const ei=document.getElementById('upm-'+t+'-icon');if(ei)ei.textContent=icon;
    const et=document.getElementById('upm-'+t+'-title');if(et)et.textContent=label;
    const es=document.getElementById('upm-'+t+'-status');if(es){es.textContent='✗ 未載入';es.style.color='#ef4444';}
    const ed=document.getElementById('upm-'+t+'-del');if(ed){ed.style.opacity='0.35';ed.style.pointerEvents='none';}
    const inp=document.getElementById('upm-'+t+'-input');if(inp){inp.disabled=false;inp.style.pointerEvents='';inp.value='';}
  });
  const selSt=document.getElementById('upm-selads-status');if(selSt){selSt.textContent='— 選填';selSt.style.color='#9ca3af';}
  const selEl=document.getElementById('upm-selads');if(selEl)selEl.className='ucard';
  const selI=document.getElementById('upm-selads-icon');if(selI)selI.textContent='🎯';
  const selT=document.getElementById('upm-selads-title');if(selT)selT.textContent='選品廣告清單';
  const selD=document.getElementById('upm-selads-del');if(selD){selD.style.opacity='0.35';selD.style.pointerEvents='none';}
  const genBtn=document.getElementById('upm-gen-btn');if(genBtn)genBtn.disabled=true;
  // 重置表格 & KPI
  document.getElementById('period-tag-'+shop).textContent='';
  document.getElementById('period-tag-'+shop).style.display='none';
  const search=document.getElementById('search-'+shop);if(search)search.style.display='none';
  document.getElementById('cnt-'+shop).textContent='';
  document.getElementById('tbl-'+shop).innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">報表已清除，請重新上傳並產生</div></div>`;
  setKpis(shop,0,0,0,0);
  const gb=document.getElementById('global-exp-btn');if(gb)gb.disabled=true;
  // 重置廣告群組卡片
  const groupList=document.getElementById('upm-groupads-list');if(groupList)groupList.innerHTML='';
}
function loadIntoUI(shop,built,period,days){
  if(built&&Array.isArray(built)){
    built.forEach(r=>{
      r.analysis=calcAnalysis(r.adsFee||0,r.pureRate||0,r.targetROI??null,r.roiDiff??null,r.clicks||0,r.pureProfit||0,r.roi||0);
      r.analysisLabel=r.analysis?.label||'';
      r.testTags=calcTestTags(r.adsFee||0,r.pureRate||0,r.targetROI??null,r.roiDiff??null,r.clicks||0,r.pureProfit||0,r.roi||0);
      if(shop==='好麻吉'){
        r.growthAnalysis=calcGrowthAnalysis(r.growthRate??null,r.rev||0,r.prevRev??null,r.pureRate||0);
        r.growthAnalysisLabel=r.growthAnalysis?.label||'';
      }
    });
  }
  state[shop]._built=built;state[shop]._period=period;state[shop]._days=days;
  state[shop].filters={};state[shop].sorts={};state[shop].tagFilters=getTagFilters();
  document.getElementById('period-tag-'+shop).textContent=period;
  const cb=document.getElementById('clear-btn-'+shop);if(cb)cb.style.display='';
  if(curShop===shop){const gb=document.getElementById('global-exp-btn');if(gb)gb.disabled=false;}
  // patchRow 已更新過時：若 tbl 有 table 就跳過，避免閃爍；若 tbl 空（DOM 被清）仍需補渲染
  if(_editedAt[shop]){
    const tblEl=document.getElementById('tbl-'+shop);
    if(tblEl&&tblEl.querySelector('table'))return;
  }
  applyFilters(shop);
}

// ── Map ──
function onMapFile(e,shop){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const wb=XLSX.read(ev.target.result,{type:'binary'});
      globalMap={};let cnt=0;
      // 賣場別名：sheet 名稱含這些字串會分派到對應 shop（大小寫不敏感）
      const SHOP_MATCH_ALIASES = {
        '好麻吉': ['好麻吉','生活好麻吉'],
        '玩樂':   ['玩樂','玩樂盒子'],
        '森之旅': ['森之旅'],
        '維克':   ['維克','維克生活']
      };
      const sheetAssignments = []; // [{sheet, shop, codes}] 之後 console 輸出
      wb.SheetNames.forEach(sName=>{
        // 用 header:1 讀陣列，避免欄名有不可見字元導致對不到
        const raw=XLSX.utils.sheet_to_json(wb.Sheets[sName],{header:1,defval:''});
        if(raw.length<2){sheetAssignments.push({sheet:sName,shop:'(空 sheet)',codes:0});return;}
        // 找各欄的 index（從第一列 header 辨識）
        const hdr=raw[0].map(h=>String(h).trim());
        const colCode=hdr.findIndex(h=>h==='商品選項貨號'||h==='商品編號');
        const colSid=hdr.findIndex(h=>h==='商品ID'||h==='商品 ID');
        const colName=hdr.findIndex(h=>h==='莫比克名'||h==='商品名稱');
        if(colCode<0||colSid<0){sheetAssignments.push({sheet:sName,shop:'(缺欄位)',codes:0});return;}
        // 用別名 + fallback substring 分派
        const sNameLower = sName.toLowerCase();
        let sk = null;
        for(const s of SHOPS){
          const aliases = SHOP_MATCH_ALIASES[s.id] || [s.id];
          if(aliases.some(a=>sNameLower.includes(a.toLowerCase()) || a.toLowerCase().includes(sNameLower))){
            sk = s.id; break;
          }
        }
        if(!sk) sk = sName; // fallback：分到一個「未匹配」bucket，不會被任何 shop 使用
        if(!globalMap[sk])globalMap[sk]={};
        let sheetCnt = 0;
        raw.slice(1).forEach(row=>{
          const code=String(row[colCode]||'').trim();
          const rawSid=row[colSid];
          if(!code||rawSid===''||rawSid===undefined||rawSid===null)return;
          let sid=Math.round(Number(rawSid)).toString();
          if(sid==='NaN'||sid==='0'||sid.length<5)return;
          if(!globalMap[sk][code]){globalMap[sk][code]={sids:[],name:''};cnt++;sheetCnt++;}
          if(!globalMap[sk][code].sids.includes(sid))globalMap[sk][code].sids.push(sid);
          const pName=colName>=0?String(row[colName]||'').trim():'';
          if(pName&&!globalMap[sk][code].name)globalMap[sk][code].name=pName;
        });
        sheetAssignments.push({sheet:sName,shop:sk,codes:sheetCnt});
      });
      console.log('[商品對照表] sheet 分派結果：',sheetAssignments);
      try{localStorage.setItem('ec|filemeta|globalMap',JSON.stringify({name:file.name,cnt}));}catch(e){}
      SHOPS.forEach(s=>{
        state[s.id].rawMap=globalMap[s.id]||{};
        const shopCnt = Object.keys(globalMap[s.id]||{}).length;
        const uc=document.getElementById('uc-map-'+s.id);
        const ui=document.getElementById('ui-map-'+s.id);
        const ut=document.getElementById('ut-map-'+s.id);
        const us=document.getElementById('us-map-'+s.id);
        if(uc)uc.className = shopCnt > 0 ? 'ucard ok' : 'ucard'; // 0 筆就不顯示 ok
        if(ui)ui.textContent = shopCnt > 0 ? '✅' : '⚠️';
        if(ut)ut.textContent=file.name;
        if(us)us.textContent = shopCnt > 0 ? `已載入 ${shopCnt} 筆` : '⚠ 對照到 0 筆，此賣場廣告費將全部要手動對應';
        const del=document.getElementById('del-map-'+s.id);if(del)del.style.display='';
        checkReady(s.id);
      });
      // 若有任何賣場 0 筆 AND 有 sheet 未分派到任一賣場 → 跳「手動指派」modal
      const zeroShops = SHOPS.filter(s=>!globalMap[s.id]||Object.keys(globalMap[s.id]).length===0).map(s=>s.id);
      const orphanSheets = sheetAssignments.filter(a=>!SHOPS.some(s=>s.id===a.shop)&&a.codes>0);
      closeUploadModal();
      if(zeroShops.length>0 && orphanSheets.length>0){
        showSheetReassignModal(orphanSheets, zeroShops, sheetAssignments, file.name);
      } else if(zeroShops.length>0){
        showMapWarnBanner(
          `⚠️ 這些賣場沒有對照到商品：${zeroShops.join('、')}\n\n`+
          `已知 sheet 分派：\n`+
          sheetAssignments.map(a=>`・「${a.sheet}」→ ${a.shop}（${a.codes} 筆）`).join('\n')
        );
      }
      setTimeout(()=>validateMapWarnings(globalMap),200);
    }catch(err){alert('商品清單讀取失敗：'+err.message);}
  };
  r.readAsBinaryString(file);
}

function validateMapWarnings(gMap){
  // 只掃描目前賣場，避免其他賣場的警示干擾
  const shop=curShop==='總表'?SHOPS[0].id:curShop;
  const issues=[];
  const map=gMap[shop]||{};
  const sidToCode={};
  Object.entries(map).forEach(([code,entry])=>{
    const sids=Array.isArray(entry)?entry:(entry.sids||[]);
    sids.forEach(sid=>{
      if(!sidToCode[sid])sidToCode[sid]=[];
      sidToCode[sid].push(code);
    });
  });
  Object.entries(sidToCode).forEach(([sid,codes])=>{
    if(codes.length>1)issues.push({sid,codes});
  });
  if(!issues.length)return;
  const lines=issues.map(i=>`・SID ${i.sid} 同時對應到 ${i.codes.join('、')}（廣告費會重複計算）`).join('\n');
  showMapWarnBanner(`⚠️ [${shop}] 商品對照表有 ${issues.length} 筆 SID 重複對應，廣告費會重複計算：\n\n${lines}`);
}

function checkAdsReconcile(shop,built){
  const s=state[shop];
  if(!s.rawAds||!s.rawAds.length)return;
  // 彙整所有來源 SID→花費
  const adsById={};const sidNames={};
  const addSrc=(rows,sidKey,nameKey)=>(rows||[]).forEach(r=>{
    const sid=(r[sidKey]||r['商品ID']||'').trim();
    const spend=num(r['花費']||r['廣告費']||0);
    if(sid&&sid!=='-'&&spend>0){adsById[sid]=(adsById[sid]||0)+spend;}
    if(sid&&!sidNames[sid]){const n=(r[nameKey]||r['廣告/商品名稱']||r['商品名稱']||r['廣告名稱']||'').trim();if(n)sidNames[sid]=n;}
  });
  addSrc(s.rawAds,'商品 ID','商品名稱');
  addSrc(s.rawSelAds,'商品 ID','商品名稱');
  (s.rawGroupAdsList||[]).forEach(g=>addSrc(g.rows,'商品 ID','廣告/商品名稱'));
  const csvTotal=Object.values(adsById).reduce((a,b)=>a+b,0);
  const reportTotal=built.reduce((acc,r)=>acc+(r.adsFee||0),0);
  const diff=Math.round((reportTotal-csvTotal)*100)/100;
  if(Math.abs(diff)<0.5)return;
  // 找出未對應的 SID
  const mapped=new Set();
  Object.values(s.rawMap||{}).forEach(e=>{(Array.isArray(e)?e:(e.sids||[])).forEach(sid=>mapped.add(String(sid)));});
  const unmapped=Object.entries(adsById).filter(([sid])=>!mapped.has(String(sid))).map(([sid,spend])=>({sid,spend,name:sidNames[sid]||''})).sort((a,b)=>b.spend-a.spend);
  const sign=diff>0?'+':'';
  const msg=`[${shop}] 廣告費對帳差異：CSV 總計 ${fmtAds(csvTotal)}，報表合計 ${fmtAds(reportTotal)}（差 ${sign}${fmtAds(diff)}）`;
  showMapWarnBanner(msg,()=>showReconcileDetail(shop,unmapped,diff));
}
function showReconcileDetail(shop,unmapped,diff){
  let old=document.getElementById('reconcile-detail-ov');if(old)old.remove();
  const ov=document.createElement('div');
  ov.className='ana-overlay open';ov.id='reconcile-detail-ov';ov.style.zIndex='3100';
  const rows=unmapped.length?unmapped.map(u=>`<tr><td style="padding:5px 10px;color:#6b7280;font-size:12px">${u.sid}</td><td style="padding:5px 10px;font-size:12px;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.name||'—'}</td><td style="padding:5px 10px;text-align:right;font-weight:600;color:#b45309;font-size:12px">$${fmtN(Math.round(u.spend))}</td></tr>`).join(''):`<tr><td colspan="3" style="padding:16px;text-align:center;color:#9ca3af;font-size:12px">無未對應的 SID（差異可能來自重複對應）</td></tr>`;
  ov.innerHTML=`<div class="ana-modal" style="width:min(680px,95vw);max-height:85vh;display:flex;flex-direction:column">
    <div class="ana-modal-hdr"><span>廣告費對帳明細｜${shop}</span><button class="ana-close-btn" onclick="document.getElementById('reconcile-detail-ov').remove()">✕</button></div>
    <div style="padding:12px 20px;background:#fff8e6;border-bottom:1px solid #fde68a;font-size:12px;color:#92400e">
      差異 <b>${diff>0?'+':''}${fmtAds(diff)}</b>，下列 <b>${unmapped.length}</b> 個商品 SID 有廣告費但不在商品對照表中（廣告費無法分攤到商品）
    </div>
    <div style="overflow-y:auto;flex:1">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f9fafb;position:sticky;top:0">
          <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">商品 SID</th>
          <th style="padding:7px 10px;text-align:left;font-size:11px;color:#6b7280;font-weight:600">廣告名稱</th>
          <th style="padding:7px 10px;text-align:right;font-size:11px;color:#6b7280;font-weight:600">廣告費</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:10px 20px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af">
      解決方法：到「商品對照表」為這些 SID 加入對應的商品編號
    </div>
  </div>`;
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
}

let _warnDetailCb=null;
function showMapWarnBanner(msg,onDetail){
  _warnDetailCb=onDetail||null;
  let el=document.getElementById('map-warn-banner');
  if(!el){
    el=document.createElement('div');
    el.id='map-warn-banner';
    el.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;background:#fff8e6;border:2px solid #f59e0b;border-radius:10px;padding:16px 20px;max-width:680px;width:90vw;box-shadow:0 4px 24px rgba(0,0,0,.15);font-size:13px;line-height:1.7;color:#92400e;white-space:pre-wrap;';
    document.body.appendChild(el);
  }
  const detailBtn=onDetail?`<button onclick="_warnDetailCb&&_warnDetailCb()" style="flex-shrink:0;background:#fff;color:#b45309;border:1.5px solid #f59e0b;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;font-weight:600">查看明細</button>`:'';
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div>${msg.replace(/\n/g,'<br>')}</div><div style="display:flex;gap:6px;flex-shrink:0">${detailBtn}<button onclick="document.getElementById('map-warn-banner').remove()" style="background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">關閉</button></div></div>`;
}

// 手動指派 sheet → shop（自動對應失敗時彈出）
function showSheetReassignModal(orphanSheets, zeroShops, allAssignments, fileName){
  const old=document.getElementById('sheet-reassign-overlay'); if(old) old.remove();
  const modal=document.createElement('div');
  modal.id='sheet-reassign-overlay';
  modal.className='ana-overlay open';
  modal.style.zIndex='4000';
  const assignedList=allAssignments.filter(a=>SHOPS.some(s=>s.id===a.shop)).map(a=>`<div style="font-size:12px;color:#065f46;margin:2px 0">✓ 「${escapeHtmlLike(a.sheet)}」 → <b>${a.shop}</b>（${a.codes} 筆）</div>`).join('');
  const shopOpts=SHOPS.map(s=>{
    const isZero=zeroShops.includes(s.id);
    return `<option value="${s.id}"${isZero?' style="font-weight:700;background:#fef3c7"':''}>${s.id}${isZero?' ⚠ 缺對照':''}</option>`;
  }).join('');
  const orphanRows=orphanSheets.map((u,i)=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:10px;background:#fef3c7;border-radius:8px;border:1px solid #fcd34d">
      <div style="flex:1;font-size:13px">
        <div style="font-weight:600;color:#78350f">「${escapeHtmlLike(u.sheet)}」</div>
        <div style="font-size:11px;color:#9a3412;margin-top:2px">${u.codes} 筆商品資料</div>
      </div>
      <div style="font-size:13px;color:#78350f">→</div>
      <select id="reassign-sel-${i}" data-orig-key="${escapeHtmlLike(u.shop)}" style="padding:7px 12px;border:1px solid #d97706;border-radius:6px;font-size:13px;background:white;min-width:130px;font-weight:600">
        <option value="">-- 選擇賣場 --</option>
        ${shopOpts}
        <option value="__skip__">忽略此 sheet</option>
      </select>
    </div>`).join('');
  modal.innerHTML=`
    <div class="ana-modal" style="width:min(560px,95vw);max-height:90vh;display:flex;flex-direction:column">
      <div class="ana-modal-hdr">
        <span>🗂 指派 sheet 到賣場</span>
        <button class="ana-close-btn" onclick="document.getElementById('sheet-reassign-overlay').remove()">✕</button>
      </div>
      <div style="padding:16px;overflow-y:auto;flex:1">
        <div style="font-size:13px;color:#374151;margin-bottom:14px;line-height:1.6">
          你上傳的檔案<b>「${escapeHtmlLike(fileName)}」</b>內，下列 sheet 沒能自動對應到賣場。<br>
          請幫每個 sheet 指派要塞給哪個賣場：
        </div>
        ${orphanRows}
        ${assignedList?`<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280;margin-bottom:6px">已自動對應（不需處理）：</div>${assignedList}</div>`:''}
        <div style="margin-top:12px;font-size:11px;color:#9ca3af">下次上傳前把 sheet 改名成含賣場關鍵字（如「好麻吉」、「玩樂盒子」）可省下這步。</div>
      </div>
      <div style="padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('sheet-reassign-overlay').remove()" style="padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:white;font-size:13px;cursor:pointer">取消</button>
        <button id="reassign-confirm-btn" style="padding:8px 20px;border:0;border-radius:6px;background:#5b5fcf;color:white;font-size:13px;font-weight:600;cursor:pointer">✓ 確認指派</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('reassign-confirm-btn').addEventListener('click',()=>{
    let changed=0;
    orphanSheets.forEach((u,i)=>{
      const sel=document.getElementById('reassign-sel-'+i);
      const target=sel?.value;
      if(!target||target==='__skip__') return;
      const fromKey=u.shop;
      if(globalMap[fromKey]){
        globalMap[target]=globalMap[target]||{};
        // 合併（同 code 已存在的 sids 也累加，避免蓋掉）
        Object.entries(globalMap[fromKey]).forEach(([code,entry])=>{
          if(!globalMap[target][code]) globalMap[target][code]={sids:[],name:''};
          const srcSids=Array.isArray(entry)?entry:(entry.sids||[]);
          srcSids.forEach(sid=>{ if(!globalMap[target][code].sids.includes(sid)) globalMap[target][code].sids.push(sid); });
          if(!globalMap[target][code].name && entry.name) globalMap[target][code].name=entry.name;
        });
        delete globalMap[fromKey];
        changed++;
      }
    });
    // 更新每個 shop 的 rawMap + UI
    SHOPS.forEach(s=>{
      state[s.id].rawMap=globalMap[s.id]||{};
      const shopCnt=Object.keys(globalMap[s.id]||{}).length;
      const us=document.getElementById('us-map-'+s.id);
      const ui=document.getElementById('ui-map-'+s.id);
      const uc=document.getElementById('uc-map-'+s.id);
      if(us) us.textContent = shopCnt>0?`已載入 ${shopCnt} 筆`:'⚠ 對照到 0 筆';
      if(ui) ui.textContent = shopCnt>0?'✅':'⚠️';
      if(uc) uc.className = shopCnt>0?'ucard ok':'ucard';
    });
    document.getElementById('sheet-reassign-overlay').remove();
    if(typeof showToast==='function') showToast(`✓ 已重新指派 ${changed} 個 sheet`,'success');
    setTimeout(()=>validateMapWarnings(globalMap),100);
  });
}
// 簡易 escape（避開 sheet name 含 HTML 特殊字）
function escapeHtmlLike(s){return String(s||'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));}

// ── Files ──
function onFile(e,shop,type){
  const file=e.target.files[0];if(!file)return;setSpin(shop,true);
  if(type==='mobic'){
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const wb=XLSX.read(ev.target.result,{type:'binary'});
        const sName=wb.SheetNames.find(s=>s==='銷售統計'||s.includes('銷售'))||wb.SheetNames[0];
        state[shop].rawMobic=XLSX.utils.sheet_to_json(wb.Sheets[sName],{defval:''});
        try{localStorage.setItem(fmKey(shop,'mobic'),JSON.stringify({name:file.name}));}catch(e){}
        markCard(shop,'mobic','✅',file.name,'ok');
      }catch(err){markCard(shop,'mobic','❌','讀取失敗','err');}
      setSpin(shop,false);checkReady(shop);
    };r.readAsBinaryString(file);
  }else if(type==='ads'){
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const text=new TextDecoder('utf-8').decode(ev.target.result);
        state[shop].rawAds=parseAdsCsv(text);
        const spend=state[shop].rawAds.reduce((s,r)=>s+num(r['花費']||0),0);
        try{localStorage.setItem(fmKey(shop,'ads'),JSON.stringify({name:file.name}));}catch(e){}
        markCard(shop,'ads','✅',file.name,'ok');
        const us=document.getElementById('us-ads-'+shop);if(us)us.textContent=`廣告費：$${spend.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
      }catch(err){markCard(shop,'ads','❌','讀取失敗','err');}
      setSpin(shop,false);checkReady(shop);
    };r.readAsArrayBuffer(file);
  }else if(type==='selads'){
    const isCsv=file.name.toLowerCase().endsWith('.csv');
    const r=new FileReader();
    r.onload=ev=>{
      try{
        let rows;
        if(isCsv){
          rows=parseAdsCsv(ev.target.result);
        }else{
          const wb=XLSX.read(ev.target.result,{type:'binary'});
          rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
        }
        state[shop].rawSelAds=rows;
        const spend=rows.reduce((s,r)=>s+num(r['花費']||r['廣告費']||0),0);
        try{localStorage.setItem(fmKey(shop,'selads'),JSON.stringify({name:file.name}));}catch(e){}
        markCard(shop,'selads','✅',file.name,'ok');
        const us=document.getElementById('us-selads-'+shop);if(us)us.textContent=`廣告費：$${spend.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0})}`;
      }catch(err){markCard(shop,'selads','❌','讀取失敗','err');}
      setSpin(shop,false);checkReady(shop);
    };
    if(isCsv)r.readAsText(file,'UTF-8');else r.readAsBinaryString(file);
  }else if(type==='groupads'){
    const isCsv=file.name.toLowerCase().endsWith('.csv');
    const r=new FileReader();
    r.onload=ev=>{
      try{
        let rows;
        if(isCsv){
          rows=parseAdsCsv(ev.target.result);
        }else{
          const wb=XLSX.read(ev.target.result,{type:'binary'});
          rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
        }
        if(!state[shop].rawGroupAdsList)state[shop].rawGroupAdsList=[];
        state[shop].rawGroupAdsList.push({name:file.name,rows});
        saveGroupAdsMeta(shop);
      }catch(err){alert('讀取失敗：'+file.name);}
      setSpin(shop,false);checkReady(shop);
    };
    if(isCsv)r.readAsText(file,'UTF-8');else r.readAsBinaryString(file);
  }
}
function fmKey(shop,type){const s=state[shop]||{};return`ec|filemeta|${shop}|${s.curMonth||''}|${s.curHalf||''}|${type}`;}
function renderGroupAdsCards(shop){
  const list=document.getElementById('upm-groupads-list');if(!list)return;
  const arr=state[shop]?.rawGroupAdsList||[];
  if(!arr.length){list.innerHTML='';return;}
  list.innerHTML=arr.map((g,i)=>`
    <div style="display:flex;align-items:center;gap:8px;border:1.5px solid #10b981;border-radius:9px;padding:9px 14px;background:#f0fdf4">
      <span style="font-size:17px">✅</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:#065f46;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.name}</div>
        <div style="font-size:11px;color:#9ca3af">${g.rows.length} 筆｜廣告費：$${g.rows.reduce((s,r)=>s+num(r['花費']||r['廣告費']||0),0).toLocaleString('en-US',{maximumFractionDigits:0})}</div>
      </div>
      <button onclick="removeGroupAds('${shop}',${i})" style="background:none;border:none;cursor:pointer;font-size:17px;color:#ef4444;flex-shrink:0" title="刪除">🗑️</button>
    </div>`).join('');
}
function removeGroupAds(shop,idx){
  const arr=state[shop]?.rawGroupAdsList||[];
  arr.splice(idx,1);
  state[shop].rawGroupAdsList=arr;
  saveGroupAdsMeta(shop);
  renderGroupAdsCards(shop);
}
function saveGroupAdsMeta(shop){
  const arr=state[shop]?.rawGroupAdsList||[];
  try{localStorage.setItem(fmKey(shop,'groupads'),JSON.stringify(arr.map(g=>({name:g.name}))));}catch{}
}
function parseAdsCsv(text){
  const lines=text.split('\n');
  let hi=lines.findIndex(l=>l.includes('花費')&&(l.includes('商品 ID')||l.includes('商品ID')));if(hi<0)hi=7;
  const headers=splitCSV(lines[hi]).map(h=>h.replace(/^"|"$/g,'').trim());
  return lines.slice(hi+1).filter(l=>l.trim()).map(line=>{
    const vals=splitCSV(line).map(v=>v.replace(/^"|"$/g,'').trim());
    const obj={};headers.forEach((h,i)=>{obj[h]=vals[i]||'';});return obj;
  }).filter(r=>{const sid=(r['商品 ID']||r['商品ID']||'').trim();return sid&&sid!=='-';});
}
function splitCSV(line){const res=[];let cur='';let q=false;for(let c of line){if(c==='"'){q=!q;}else if(c===','&&!q){res.push(cur);cur='';}else{cur+=c;}}res.push(cur);return res;}
function markCard(shop,type,icon,title,cls){
  document.getElementById('uc-'+type+'-'+shop).className='ucard '+(cls||'');
  document.getElementById('ui-'+type+'-'+shop).textContent=icon;
  document.getElementById('ut-'+type+'-'+shop).textContent=title.length>22?title.slice(0,22)+'…':title;
  const del=document.getElementById('del-'+type+'-'+shop);
  if(del)del.style.display=cls==='ok'?'':'none';
}
function setSpin(shop,show){const el=document.getElementById('spin-'+shop);if(el)el.classList.toggle('show',show);}
function checkReady(shop){const s=state[shop];const g=document.getElementById('gen-'+shop);if(g)g.disabled=!(s.rawMobic&&s.rawAds);}
function getPlatformRate(){
  const el=document.getElementById('platformRate');
  if(!el) return 20.5/100; // 元素還沒渲染出來時用預設值，避免 null .value 噴錯
  return(parseFloat(el.value)||20.5)/100;
}

// ── 取得對應的「上期」區間 key ──
function getPrevPeriodKey(shop, month, half) {
  const [y, m] = month.split('/').map(Number);
  if (half === 'second') {
    // 下半月 → 上半月（同月）
    return lsKey(shop, month, 'first');
  } else if (half === 'first') {
    // 上半月 → 上個月下半月
    const prevMonth = m === 1
      ? `${y-1}/12`
      : `${y}/${String(m-1).padStart(2,'0')}`;
    return lsKey(shop, prevMonth, 'second');
  } else {
    // 整月 → 上個月整月
    const prevMonth = m === 1
      ? `${y-1}/12`
      : `${y}/${String(m-1).padStart(2,'0')}`;
    return lsKey(shop, prevMonth, 'full');
  }
}

// 取得上期報表的 code→rev map（雲端優先，過渡期看 main，最後 fallback 本地）
function getPrevRevMap(shop, month, half) {
  const key = getPrevPeriodKey(shop, month, half);
  let rep = null;
  try{ if(typeof Store!='undefined' && Store._profitMem && Store._profitMem[key]) rep = Store._profitMem[key]; }catch{}
  try{ if(!rep && typeof Store!='undefined' && Store._mem && Store._mem[key]) rep = Store._mem[key]; }catch{}
  if(!rep){
    try { rep = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  }
  if (!rep || !rep.built) return {};
  const map = {};
  rep.built.forEach(r => { if (r.code && r.rev) map[r.code] = r.rev; });
  return map;
}

// ── Generate ──
function findUnmatchedAds(shop){
  const s=state[shop];
  if((!s.rawAds||!s.rawAds.length)&&(!s.rawSelAds||!s.rawSelAds.length))return[];
  // 建立 adsById 與 sidNames
  const adsById={};const sidNames={};
  (s.rawAds||[]).forEach(r=>{
    const sid=(r['商品 ID']||'').trim();
    const spend=num(r['花費']||0);
    if(sid&&sid!=='-'){
      if(spend>0)adsById[sid]=(adsById[sid]||0)+spend;
      if(!sidNames[sid]){const n=(r['商品名稱']||r['廣告名稱']||r['名稱']||'').trim();if(n)sidNames[sid]=n;}
    }
  });
  // 合併選品廣告清單
  (s.rawSelAds||[]).forEach(r=>{
    const sid=(r['商品 ID']||r['商品ID']||'').trim();
    const spend=num(r['花費']||r['廣告費']||0);
    if(sid&&sid!=='-'){
      if(spend>0)adsById[sid]=(adsById[sid]||0)+spend;
      if(!sidNames[sid]){const n=(r['商品名稱']||r['廣告/商品名稱']||r['名稱']||'').trim();if(n)sidNames[sid]=n;}
    }
  });
  // 合併廣告群組
  (s.rawGroupAdsList||[]).forEach(g=>(g.rows||[]).forEach(r=>{
    const sid=(r['商品 ID']||r['商品ID']||'').trim();
    const spend=num(r['花費']||r['廣告費']||0);
    if(sid&&sid!=='-'){
      if(spend>0)adsById[sid]=(adsById[sid]||0)+spend;
      if(!sidNames[sid]){const n=(r['商品名稱']||r['名稱']||'').trim();if(n)sidNames[sid]=n;}
    }
  }));
  const pm=s.rawMap||{};
  // 建立 adsByCode 與 sidsForCode
  const adsByCode={};const sidsForCode={};const nameForCode={};
  Object.entries(pm).forEach(([code,entry])=>{
    const sids=Array.isArray(entry)?entry:(entry.sids||[]);
    const name=(entry.name)||'';
    sidsForCode[code]=sids;nameForCode[code]=name;
    sids.forEach(sid=>{if(adsById[sid]){adsByCode[code]=(adsByCode[code]||0)+adsById[sid];}});
  });
  // Type A：sid 有花費但完全不在 rawMap
  const mapped=new Set();
  Object.values(pm).forEach(e=>{const sids=Array.isArray(e)?e:(e.sids||[]);sids.forEach(sid=>mapped.add(String(sid)));});
  const typeA=Object.entries(adsById).filter(([sid])=>!mapped.has(String(sid))).map(([sid,spend])=>({type:'sid',sid,spend,name:sidNames[sid]||''}));
  // Type B：有廣告費的商品碼，但 rawMobic 這期沒有銷售
  const codesWithSales=new Set();
  (s.rawMobic||[]).forEach(r=>{const c=(r['商品編號']||'').trim();if(c)codesWithSales.add(c);});
  const typeB=Object.entries(adsByCode).filter(([code])=>!codesWithSales.has(code)).map(([code,spend])=>{
    const sids=sidsForCode[code]||[];
    const nameFromMap=nameForCode[code]||'';
    const nameFromAds=sids.map(sid=>sidNames[sid]||'').find(n=>n)||'';
    return {type:'code',code,spend,name:nameFromMap||nameFromAds,sids};
  });
  // TypeB（有廣告無銷售）由 buildShop 自動處理（建立零銷售列），不需要用戶介入
  const mapSidCount=mapped.size;
  console.log(`[${shop}] rawMap codes:${Object.keys(pm).length}, mapped SIDs:${mapSidCount}, adsById SIDs:${Object.keys(adsById).length}, TypeA:${typeA.length}, TypeB:${typeB.length}`);
  // 把診斷資訊附在 typeA 陣列上，供 modal 顯示
  typeA._debug={mapSidCount,adsSidCount:Object.keys(adsById).length};
  return typeA;
}

function generate(shop){
  setSpin(shop,true);
  const unmatched=findUnmatchedAds(shop);
  if(unmatched.length){
    setSpin(shop,false);
    openUnmatchedModal(shop,unmatched,()=>_doGenerate(shop));
    return;
  }
  _doGenerate(shop);
}
function _doGenerate(shop){
  setSpin(shop,true);
  setTimeout(()=>{
    try{
      const s=state[shop];
      const period=getPeriodLabel(s.curMonth,s.curHalf);
      const days=s.days;
      const built=buildShop(shop,days);
      lsSave(shop,s.curMonth,s.curHalf,built,period,days);
      const dotEl=document.getElementById('dot-'+shop);if(dotEl)dotEl.classList.add('on');
      loadIntoUI(shop,built,period,days);
      if(curShop==='總表')renderSummary();
      checkAdsReconcile(shop,built);
      checkSuggAlert(shop,built);
    }catch(err){alert('['+shop+'] 產生失敗：'+err.message+'\n\n'+err.stack);}
    setSpin(shop,false);
  },80);
}

function openUnmatchedModal(shop,unmatched,onConfirm){
  const s=state[shop];
  // 建立商品清單（有銷售的）供搜尋用
  const codeNames={};
  (s.rawMobic||[]).forEach(r=>{const c=(r['商品編號']||'').trim();if(c&&!codeNames[c])codeNames[c]=(r['商品名稱']||'').trim();});
  const allCodes=Object.keys(codeNames);
  // 存到 window 供 umSearch 使用
  window._umCodeNames=codeNames;window._umAllCodes=allCodes;

  const rows=unmatched.map((u,i)=>{
    const shortName=(u.name||'').slice(0,28)+((u.name||'').length>28?'…':'');
    const sidList=u.type==='code'?(u.sids||[]).join(', '):(u.sid||'');
    const codeTag=u.type==='code'?`<span style="font-size:11px;background:#f0f4ff;color:#5b5fcf;border-radius:3px;padding:1px 6px;margin-left:5px">${u.code}</span>`:'';
    const label=`<span style="font-family:monospace;font-size:14px;color:#374151">${sidList}</span>${codeTag}${shortName?`<br><span style="color:#6b7280;font-size:13px">${shortName}</span>`:''}`;

    return `<tr style="border-bottom:1px solid #f0f0f0">
      <td style="padding:8px 12px;vertical-align:middle;width:42%">
        <div style="font-size:12px;line-height:1.5;word-break:break-all">${label}</div>
        <div style="font-size:12px;color:#b45309;font-weight:600;margin-top:2px">廣告費: $${fmtN(Math.round(u.spend))}</div>
      </td>
      <td style="padding:8px 12px;vertical-align:middle;width:58%">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;white-space:nowrap">
            <input type="radio" name="um-${i}" value="merge" checked onchange="umToggle(${i})"> 加到現有商品
          </label>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;white-space:nowrap">
            <input type="radio" name="um-${i}" value="new" onchange="umToggle(${i})"> 新增到最下面
          </label>
        </div>
        <div id="um-wrap-${i}" style="position:relative;margin-top:5px;">
          <input id="um-inp-${i}" type="text" placeholder="搜尋編號或名稱…" oninput="umSearch(${i})" onfocus="umSearch(${i})" onblur="setTimeout(()=>umHideDrop(${i}),200)"
            style="width:180px;padding:3px 7px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:12px">
          <input type="hidden" id="um-sel-${i}" value="">
          <div id="um-drop-${i}" style="display:none;position:absolute;top:100%;left:0;width:280px;background:white;border:1.5px solid #e5e7eb;border-radius:6px;max-height:140px;overflow-y:auto;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.12);text-align:left"></div>
        </div>
      </td>
    </tr>`;
  }).join('');

  const totalSpend=unmatched.reduce((s,u)=>s+u.spend,0);
  const ov=document.createElement('div');
  ov.className='ana-overlay open';ov.id='unmatched-modal-ov';ov.style.zIndex='3000';
  ov.innerHTML=`<div class="ana-modal" style="width:min(860px,95vw);max-height:90vh;display:flex;flex-direction:column">
    <div class="ana-modal-hdr"><span>廣告費對帳 – ${shop}</span><button class="ana-close-btn" onclick="document.getElementById('unmatched-modal-ov').remove()">✕</button></div>
    <div style="padding:10px 20px;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>共 <b style="color:#374151">${unmatched.length}</b> 筆廣告費找不到對應銷售商品，合計 <b style="color:#b45309">$${fmtN(Math.round(totalSpend))}</b><span style="font-size:11px;color:#9ca3af;margin-left:10px">（商品清單已載入 ${unmatched._debug?.mapSidCount??'?'} 個SID，廣告共 ${unmatched._debug?.adsSidCount??'?'} 個SID）</span></span>
      <div style="display:flex;gap:6px">
        <button onclick="umSetAll('merge')" style="padding:4px 10px;border:1.5px solid #e5e7eb;border-radius:6px;background:white;font-size:11px;cursor:pointer;color:#374151">全部加到現有商品</button>
        <button onclick="umSetAll('new')" style="padding:4px 10px;border:1.5px solid #5b5fcf;border-radius:6px;background:white;font-size:11px;cursor:pointer;color:#5b5fcf">全部新增到最下面</button>
      </div>
    </div>
    <div style="overflow-y:auto;flex:1">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <colgroup><col style="width:48%"><col style="width:52%"></colgroup>
        <thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb">
          <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">商品 / 廣告費</th>
          <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">處理方式</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:14px 20px;display:flex;gap:8px;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb">
      <button onclick="ignoreAllUnmatched()" style="padding:8px 18px;border:1.5px solid #f59e0b;border-radius:8px;background:white;font-size:13px;font-weight:600;color:#b45309;cursor:pointer" title="廣告費計入總計但不新增商品行">忽略全部未對應</button>
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('unmatched-modal-ov').remove()" style="padding:8px 18px;border:1.5px solid #e5e7eb;border-radius:8px;background:white;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer">取消</button>
        <button onclick="confirmUnmatched()" style="padding:8px 18px;border:0;border-radius:8px;background:#5b5fcf;font-size:13px;font-weight:700;color:white;cursor:pointer">確認並產生報表</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  window._unmatchedCallback=onConfirm;
  window._unmatchedData=unmatched;
  window._unmatchedShop=shop;
}
function umToggle(i){
  const wrap=document.getElementById('um-wrap-'+i);
  const isMerge=document.querySelector(`input[name="um-${i}"][value="merge"]`)?.checked;
  if(wrap)wrap.style.display=isMerge?'':'none';
}
function umSearch(i){
  const inp=document.getElementById('um-inp-'+i);
  const drop=document.getElementById('um-drop-'+i);
  if(!inp||!drop)return;
  const q=inp.value.trim().toLowerCase();
  const codes=window._umAllCodes||[];
  const names=window._umCodeNames||{};
  const filtered=q?codes.filter(c=>c.toLowerCase().includes(q)||(names[c]||'').toLowerCase().includes(q)):codes;
  drop.innerHTML=filtered.slice(0,80).map(c=>`<div onclick="umSelect(${i},'${c.replace(/'/g,'\\\'')}')" style="padding:6px 10px;font-size:12px;cursor:pointer;border-bottom:1px solid #f3f4f6;color:#374151" onmouseenter="this.style.background='#f0f4ff'" onmouseleave="this.style.background=''">${c}${names[c]?' – <span style=color:#6b7280>'+names[c]+'</span>':''}</div>`).join('');
  drop.style.display=filtered.length?'':'none';
}
function umSelect(i,code){
  const inp=document.getElementById('um-inp-'+i);
  const sel=document.getElementById('um-sel-'+i);
  const drop=document.getElementById('um-drop-'+i);
  const names=window._umCodeNames||{};
  if(inp)inp.value=code+(names[code]?' – '+names[code]:'');
  if(sel)sel.value=code;
  if(drop)drop.style.display='none';
}
function umHideDrop(i){
  const drop=document.getElementById('um-drop-'+i);
  if(drop)drop.style.display='none';
}
function umSetAll(val){
  const n=window._unmatchedData?.length||0;
  for(let i=0;i<n;i++){
    const r=document.querySelector(`input[name="um-${i}"][value="${val}"]`);
    if(r){r.checked=true;umToggle(i);}
  }
}
function ignoreAllUnmatched(){
  // 把全部未對應廣告費記到 state，讓總廣告費正確但不新增商品行
  const unmatched=window._unmatchedData||[];
  const shop=window._unmatchedShop;
  if(shop&&state[shop]){
    const extra=unmatched.reduce((s,u)=>s+(u.spend||0),0);
    state[shop]._extraAdsFee=(state[shop]._extraAdsFee||0)+extra;
  }
  document.getElementById('unmatched-modal-ov')?.remove();
  if(window._unmatchedCallback)window._unmatchedCallback();
}
function confirmUnmatched(){
  const unmatched=window._unmatchedData||[];
  const shop=window._unmatchedShop;
  const s=state[shop];
  const n=unmatched.length;
  for(let i=0;i<n;i++){
    const u=unmatched[i];
    const isMerge=document.querySelector(`input[name="um-${i}"][value="merge"]`)?.checked;
    // 取得目標商品碼：先看 hidden input，再從文字框第一個 dash 前解析
    const getTargetCode=(idx)=>{
      let code=document.getElementById('um-sel-'+idx)?.value||'';
      if(!code){
        const txt=(document.getElementById('um-inp-'+idx)?.value||'').trim();
        if(txt)code=txt.split(' – ')[0].trim();
      }
      return code&&(window._umAllCodes||[]).includes(code)?code:'';
    };
    if(u.type==='code'){
      // 有廣告費但無銷售的商品碼
      const targetCode=isMerge?getTargetCode(i):'';
      if(isMerge&&targetCode){
        // 把這個 code 的 sids 移到 targetCode
        const srcEntry=s.rawMap[u.code];
        const srcSids=srcEntry?(Array.isArray(srcEntry)?srcEntry:(srcEntry.sids||[])):[];
        if(!s.rawMap[targetCode])s.rawMap[targetCode]={sids:[],name:''};
        const tgtEntry=s.rawMap[targetCode];
        const tgtSids=Array.isArray(tgtEntry)?tgtEntry:(tgtEntry.sids||[]);
        srcSids.forEach(sid=>{if(!tgtSids.includes(sid))tgtSids.push(sid);});
        if(Array.isArray(s.rawMap[targetCode]))s.rawMap[targetCode]=tgtSids;
        else s.rawMap[targetCode].sids=tgtSids;
        // 清掉原本的 sids
        if(Array.isArray(s.rawMap[u.code]))s.rawMap[u.code]=[];
        else if(s.rawMap[u.code])s.rawMap[u.code].sids=[];
      }
      // 選「新增到最下面」或merge但沒選商品 → 不動 rawMap，buildShop 會自動加
    } else {
      // type==='sid'：sid 完全不在 rawMap
      const sid=u.sid;
      const targetCode=isMerge?getTargetCode(i):'';
      if(isMerge&&targetCode){
        if(!s.rawMap[targetCode])s.rawMap[targetCode]={sids:[],name:''};
        const entry=s.rawMap[targetCode];
        const sids=Array.isArray(entry)?entry:(entry.sids||[]);
        if(!sids.includes(sid))sids.push(sid);
        if(Array.isArray(s.rawMap[targetCode]))s.rawMap[targetCode]=sids;
        else s.rawMap[targetCode].sids=sids;
      } else {
        const newCode='_u_'+sid;
        if(!s.rawMap[newCode])s.rawMap[newCode]={sids:[sid],name:''};
      }
    }
  }
  document.getElementById('unmatched-modal-ov')?.remove();
  if(window._unmatchedCallback)window._unmatchedCallback();
}

function buildShop(shop,days){
  const s=state[shop];const PLATFORM=getPlatformRate();
  const salesCol=s.rawMobic.length?Object.keys(s.rawMobic[0]).find(k=>k.startsWith('銷售數量')):null;
  const agg={};
  s.rawMobic.forEach(r=>{
    const code=(r['商品編號']||'').trim();if(!code)return;
    const name=(r['商品名稱']||'').trim();
    if(!agg[code])agg[code]={code,name,qty:0,rev:0,cost:0,gross:0,stock:0,shopeeIds:[],fromMobic:true};
    agg[code].qty+=num(r[salesCol]||0);agg[code].rev+=num(r['售價']||0);
    agg[code].cost+=num(r['成本']||0);agg[code].gross+=num(r['獲利']||0);
    agg[code].stock+=num(r['可用庫存']||0);
  });

  // 廣告資料：花費、直接投入產出比、投入產出比、點擊數
  // 優先順序：① 蝦皮廣告（rawAds）② 選品廣告（rawSelAds）③ 廣告群組（rawGroupAdsList）
  // 廣告費累加，ROI/點擊以①為主，①無資料才用②③補
  const adsById={};const directROIById={};const roiById={};const clicksById={};const sidNamesById={};
  const getSid=r=>(r['商品 ID']||r['商品ID']||'').trim();
  const getSidName=r=>(r['商品名稱']||r['廣告/商品名稱']||r['廣告名稱']||'').trim();
  // ① 蝦皮廣告 — 主要來源，ROI/點擊以此為準
  (s.rawAds||[]).forEach(r=>{
    const sid=getSid(r);if(!sid||sid==='-')return;
    const spend=num(r['花費']||0);
    const droi=num(r['直接投入產出比']||0);
    const roi=num(r['投入產出比']||0);
    const clicks=num(r['點擊數']||0);
    if(spend>0)adsById[sid]=(adsById[sid]||0)+spend;
    if(droi>0)directROIById[sid]=droi;
    if(roi>0)roiById[sid]=roi;
    if(clicks>0)clicksById[sid]=(clicksById[sid]||0)+clicks;
    const n=getSidName(r);if(n&&!sidNamesById[sid])sidNamesById[sid]=n;
  });
  // ② 選品廣告 — 廣告費累加，ROI/點擊僅補①未設的欄位
  (s.rawSelAds||[]).forEach(r=>{
    const sid=getSid(r);if(!sid||sid==='-')return;
    const spend=num(r['花費']||r['廣告費']||0);
    const droi=num(r['直接投入產出比']||0);
    const roi=num(r['投入產出比']||0);
    const clicks=num(r['點擊數']||0);
    if(spend>0)adsById[sid]=(adsById[sid]||0)+spend;
    if(!directROIById[sid]&&droi>0)directROIById[sid]=droi;
    if(!roiById[sid]&&roi>0)roiById[sid]=roi;
    if(!clicksById[sid]&&clicks>0)clicksById[sid]=clicks;
    const n=getSidName(r);if(n&&!sidNamesById[sid])sidNamesById[sid]=n;
  });
  // ③ 廣告群組 — 廣告費累加，ROI/點擊僅補①②未設的欄位
  (s.rawGroupAdsList||[]).forEach(g=>(g.rows||[]).forEach(r=>{
    const sid=getSid(r);if(!sid||sid==='-')return;
    const spend=num(r['花費']||r['廣告費']||0);
    const droi=num(r['直接投入產出比']||0);
    const roi=num(r['投入產出比']||0);
    const clicks=num(r['點擊數']||0);
    if(spend>0)adsById[sid]=(adsById[sid]||0)+spend;
    if(!directROIById[sid]&&droi>0)directROIById[sid]=droi;
    if(!roiById[sid]&&roi>0)roiById[sid]=roi;
    if(!clicksById[sid]&&clicks>0)clicksById[sid]=clicks;
    const n=getSidName(r);if(n&&!sidNamesById[sid])sidNamesById[sid]=n;
  }));

  const pm=s.rawMap||{};const adsByCode={};const directROIByCode={};const roiByCode={};const clicksByCode={};const sidsForCode={};const nameForCode={};
  Object.entries(pm).forEach(([code,entry])=>{
    // 相容新格式 {sids,name} 和舊格式 array
    const sids=Array.isArray(entry)?entry:(entry.sids||[]);
    const pName=Array.isArray(entry)?'':(entry.name||'');
    sidsForCode[code]=sids;
    if(pName)nameForCode[code]=pName;
    sids.forEach(sid=>{
      if(adsById[sid])adsByCode[code]=(adsByCode[code]||0)+adsById[sid];
      if(directROIById[sid])directROIByCode[code]=directROIById[sid];
      if(roiById[sid])roiByCode[code]=roiById[sid];
      if(clicksById[sid])clicksByCode[code]=(clicksByCode[code]||0)+clicksById[sid];
    });
  });
  Object.keys(agg).forEach(code=>{
    if(sidsForCode[code])agg[code].shopeeIds=sidsForCode[code];
  });

  // 有廣告費但無銷售：用商品清單的名稱，次用廣告CSV名稱
  Object.keys(adsByCode).forEach(code=>{
    if(!agg[code]){
      const sids=sidsForCode[code]||[];
      const pName=nameForCode[code]||'';
      const adName=sids.map(sid=>sidNamesById[sid]||'').find(n=>n)||'';
      const displayName=pName||adName||`（商品ID: ${sids[0]||'未知'}）`;
      agg[code]={code,name:displayName,qty:0,rev:0,cost:0,gross:0,stock:0,shopeeIds:sids,fromMobic:false};
    }
  });

  const prevRevMap = getPrevRevMap(shop, s.curMonth, s.curHalf);

  const built=Object.values(agg).map(p=>{
    const adsFee=adsByCode[p.code]||0;
    const directROI=directROIByCode[p.code]||0;
    const roi=roiByCode[p.code]||0;
    const clicks=clicksByCode[p.code]||0;
    const platFee=p.rev*PLATFORM;
    const pureProfit=p.gross-adsFee-platFee;
    const pureRate=p.rev>0?pureProfit/p.rev:0;
    const adsPct=p.rev>0?adsFee/p.rev:0;
    const denom=pureRate+adsPct-0.20;
    const targetROI=denom>0?1/denom:null;
    const roiDiff=(targetROI!==null&&directROI>0)?directROI-targetROI:null;
    const dayBudget=days>0?adsFee/days:0;
    const analysis=calcAnalysis(adsFee,pureRate,targetROI,roiDiff,clicks,pureProfit,roi);
    const testTags=calcTestTags(adsFee,pureRate,targetROI,roiDiff,clicks,pureProfit,roi);
    // 上半月營收 & 成長比（只有好麻吉）
    const prevRev = prevRevMap[p.code] ?? null;
    const growthRate = (prevRev!==null && prevRev>0) ? (p.rev - prevRev) / prevRev : null;
    const growthAnalysis = shop==='好麻吉' ? calcGrowthAnalysis(growthRate, p.rev, prevRev, pureRate) : null;
    return{code:p.code,name:p.name,shopeeIds:p.shopeeIds,qty:p.qty,rev:p.rev,gross:p.gross,
      adsFee,platFee,pureProfit,pureRate,adsPct,targetROI,directROI,roi,roiDiff,
      dayBudget,clicks,stock:p.stock,fromMobic:p.fromMobic,analysis,testTags,
      prevRev, growthRate, growthAnalysis};
  });
  built.sort((a,b)=>{if(!a.fromMobic&&b.fromMobic)return 1;if(a.fromMobic&&!b.fromMobic)return -1;return b.pureProfit-a.pureProfit;});
  return built;
}

// ── 分析規則設定（雲端同步） ──
const ANA_THRESH_DEF={clickMin:100,dangerMaxH:10,highMinH:30,badAdsMaxH:10,add300:3,add200:2,add100:1,add50:0,sub300:-3,sub200:-2,sub100:-1};
function _cloudRead(k){
  // 雲端優先：profit 文件 > 過渡期 main 文件 > 本地
  try{ if(typeof Store!='undefined' && Store._profitMem && Store._profitMem[k]!==undefined) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!='undefined' && Store._mem && Store._mem[k]!==undefined) return Store._mem[k]; }catch{}
  try{ const raw=localStorage.getItem(k); return raw?JSON.parse(raw):undefined; }catch{return undefined;}
}
function _cloudWrite(k,v){
  window._shopJustSaved=Date.now();
  try{localStorage.setItem(k,JSON.stringify(v));}catch{}
  _cloudWriteSafe(k, v, k);
}
function getAnaThresh(){const v=_cloudRead('ec_ana_thresh'); return Object.assign({},ANA_THRESH_DEF,v||{});}
function saveAnaThresh(t){_cloudWrite('ec_ana_thresh',t);}
function getCustomAnaRules(){return _cloudRead('ec_ana_custom')||[];}
function saveCustomAnaRules(r){_cloudWrite('ec_ana_custom',r);}
function getDisabledAnaTags(){return _cloudRead('ec_ana_disabled')||[];}
function disableAnaTag(label){const a=getDisabledAnaTags();if(!a.includes(label))a.push(label);_cloudWrite('ec_ana_disabled',a);renderAnaModalBody();reapplyAnaToAll();}
function restoreAnaTag(label){const a=getDisabledAnaTags().filter(l=>l!==label);_cloudWrite('ec_ana_disabled',a);renderAnaModalBody();reapplyAnaToAll();}
function evalAnaConds(conds,vals){
  if(!conds||!conds.length)return false;
  return conds.every(c=>{
    const v=vals[c.f];if(v===null||v===undefined)return false;
    const cv=parseFloat(c.v);
    if(c.op==='>')return v>cv;if(c.op==='>=')return v>=cv;
    if(c.op==='<')return v<cv;if(c.op==='<=')return v<=cv;
    if(c.op==='=')return v===cv;if(c.op==='!=')return v!==cv;
    return false;
  });
}

// ── 分析公式 ──
// $D=廣告費, $H=淨利率%, $K=目標ROI, $N=實際-目標, $O=點擊數, $P=純利
function calcAnalysis(adsFee, pureRate, targetROI, roiDiff, clicks, pureProfit, roi){
  const t=getAnaThresh();
  const dis=new Set(getDisabledAnaTags());
  const ok=l=>!dis.has(l);
  const D=adsFee, H=pureRate*100, K=targetROI, N=roiDiff, O=clicks, P=pureProfit, R=roi;
  if(ok('危險商品')&&D===0 && H>=0 && H<t.dangerMaxH) return{label:'危險商品',cls:'tag-danger'};
  if(ok('高利潤商品')&&D===0 && H>t.highMinH) return{label:'高利潤商品',cls:'tag-high'};
  if(ok('賠錢中')&&D>0 && H<0) return{label:'賠錢中',cls:'tag-lose'};
  if(ok('低淨利')&&D>0 && ((K!==null&&K!==undefined&&K<0)||(N===null||N===undefined||!isFinite(N)))) return{label:'低淨利',cls:'tag-low'};
  if(ok('低效廣告')&&D>0 && H>=0 && H<t.badAdsMaxH) return{label:'低效廣告',cls:'tag-bad'};
  for(const ct of getCustomAnaRules()){
    if(evalAnaConds(ct.conds,{D,H,K,N,O,P,R}))return{label:ct.label,cls:ct.cls||'tag-add100'};
  }
  if(N===null||N===undefined||!isFinite(N)||O<t.clickMin) return{label:'',cls:''};
  if(ok('加300')&&N>=t.add300) return{label:'加300',cls:'tag-add300'};
  if(ok('加200')&&N>=t.add200) return{label:'加200',cls:'tag-add200'};
  if(ok('加100')&&N>=t.add100) return{label:'加100',cls:'tag-add100'};
  if(ok('加50')&&N>=t.add50&&N<t.add100) return{label:'加50',cls:'tag-add50'};
  if(ok('減300')&&N<=t.sub300) return{label:'減300',cls:'tag-sub300'};
  if(ok('減200')&&N<=t.sub200) return{label:'減200',cls:'tag-sub200'};
  if(ok('減100')&&N<=t.sub100) return{label:'減100',cls:'tag-sub100'};
  return{label:'',cls:''};
}

// 新增自訂標籤表單共用：新增/刪除條件會整段重繪表單，重繪前先把使用者
// 已輸入的名稱/顏色/條件值同步回草稿變數，避免整段被預設值蓋掉。
function _syncCondDraft(conds,containerSel){
  document.querySelectorAll(containerSel+' .ana-cond-row').forEach((row,i)=>{
    if(!conds[i])return;
    conds[i].f=row.querySelector('.ana-cond-f').value;
    conds[i].op=row.querySelector('.ana-cond-op').value;
    conds[i].v=row.querySelector('.ana-cond-v').value;
  });
}

// ── 分析設定 Modal ──
let _anaNewConds=[];
let _anaNewLabel='';
let _anaNewCls='tag-add300';
const ANA_FIELD_OPTS=[
  {v:'D',l:'廣告費(D)'},{v:'H',l:'淨利率%(H)'},{v:'K',l:'目標ROI(K)'},
  {v:'N',l:'實際-目標(N)'},{v:'O',l:'點擊數(O)'},{v:'P',l:'純利(P)'},{v:'R',l:'投入產出(R)'}
];
const ANA_CLS_OPTS=[
  {v:'tag-add300',l:'藍色'},{v:'tag-high',l:'綠色'},{v:'tag-danger',l:'紅色'},
  {v:'tag-lose',l:'深紅'},{v:'tag-low',l:'橘色'},{v:'tag-bad',l:'棕色'},
  {v:'tag-add100',l:'紫色'},{v:'tag-add50',l:'淺綠'},
];
function openAnaSettings(shop){
  let ov=document.getElementById('ana-overlay');
  if(!ov){
    ov=document.createElement('div');ov.id='ana-overlay';ov.className='ana-overlay';
    ov.innerHTML=`<div class="ana-modal" onclick="event.stopPropagation()">
      <div class="ana-modal-hdr"><span class="ana-modal-title">⚙ 分析標籤設定</span><button class="ana-modal-x" onclick="closeAnaSettings()">✕</button></div>
      <div class="ana-modal-body" id="ana-modal-body"></div>
      <div class="ana-modal-ftr">
        <button class="ana-cancel-btn" onclick="closeAnaSettings()">取消</button>
        <button class="ana-save-btn" onclick="saveAnaSettings()">儲存並套用</button>
      </div>
    </div>`;
    ov.onclick=closeAnaSettings;
    document.body.appendChild(ov);
  }
  _anaNewConds=[];_anaNewLabel='';_anaNewCls='tag-add300';
  renderAnaModalBody();
  ov.classList.add('open');
}
function closeAnaSettings(){document.getElementById('ana-overlay')?.classList.remove('open');}

// ── Global Upload Modal ──
function openUploadModal(){
  const ov=document.getElementById('upload-modal-overlay');if(!ov)return;
  const shop=curShop==='總表'?SHOPS[0].id:curShop;
  document.getElementById('upm-shop-hint').textContent='目前賣場：'+shop;
  function getMeta(key){try{const m=localStorage.getItem(key);return m?JSON.parse(m):null;}catch{return null;}}
  function syncCard(id,ok,okIcon,defaultIcon,okLabel,defaultLabel,metaKey){
    const meta=getMeta(metaKey);
    const wasLoaded=!ok&&!!meta; // 刷新後有紀錄但無資料
    const card=document.getElementById('upm-'+id);
    // ok=綠色 ucard.ok，wasLoaded=暖色警告（提醒需重新上傳），未載入=一般
    card.className='ucard'+(ok?' ok':(wasLoaded?' warn':''));
    // icon 分三態：ok=綠✅、wasLoaded=🔄（提醒需重上傳）、未載入=預設 icon
    document.getElementById('upm-'+id+'-icon').textContent=ok?okIcon:(wasLoaded?'🔄':defaultIcon);
    document.getElementById('upm-'+id+'-title').textContent=(ok||wasLoaded)?(meta?.name||okLabel).slice(0,22):defaultLabel;
    document.getElementById('upm-'+id+'-status').textContent=ok?'✅ 已載入':wasLoaded?'🔄 點此重新上傳':'✗ 未載入';
    document.getElementById('upm-'+id+'-status').style.color=ok?'#10b981':wasLoaded?'#f59e0b':'#ef4444';
    // ok=true：禁用 input（需透過垃圾桶刪除後才能換檔），wasLoaded：啟用 input（點卡片直接重傳）
    document.getElementById('upm-'+id+'-input').disabled=ok;
    document.getElementById('upm-'+id+'-input').style.pointerEvents=ok?'none':'';
    // 垃圾桶只在 ok=true（真的載入中）才顯示，避免 label 內 button 衝突
    document.getElementById('upm-'+id+'-del').style.opacity=ok?'1':'0.35';
    document.getElementById('upm-'+id+'-del').style.pointerEvents=ok?'':'none';
    document.getElementById('upm-'+id).style.cursor=ok?'default':'pointer';
  }
  // sync map card state
  const mapOk=!!globalMap&&Object.keys(globalMap).length>0;
  syncCard('map',mapOk,'✅','🗂','蝦皮商品清單','蝦皮商品清單','ec|filemeta|globalMap');
  // sync mobic/ads
  const s=state[shop];
  const mobicOk=!!s.rawMobic;
  syncCard('mobic',mobicOk,'✅','📦','莫筆克銷售分析','莫筆克銷售分析',fmKey(shop,'mobic'));
  const adsOk=!!s.rawAds;
  syncCard('ads',adsOk,'✅','📣','蝦皮廣告報表','蝦皮廣告報表',fmKey(shop,'ads'));
  const seladsOk=!!s.rawSelAds;
  const seladsMeta=getMeta(fmKey(shop,'selads'));
  document.getElementById('upm-selads').className='ucard'+(seladsOk?' ok':'');
  document.getElementById('upm-selads-icon').textContent=seladsOk?'✅':'🎯';
  document.getElementById('upm-selads-title').textContent=seladsOk?(seladsMeta?.name||'選品廣告清單').slice(0,22):'選品廣告清單';
  document.getElementById('upm-selads-status').textContent=seladsOk?'✅ 已載入':'— 選填';
  document.getElementById('upm-selads-status').style.color=seladsOk?'#10b981':'#9ca3af';
  document.getElementById('upm-selads-del').style.opacity=seladsOk?'1':'0.35';
  document.getElementById('upm-selads-del').style.pointerEvents=seladsOk?'':'none';
  document.getElementById('upm-gen-btn').disabled=!(mobicOk&&adsOk);
  // 若三大檔中有任何一個是 wasLoaded 狀態（有 meta 但無 raw），提示使用者需要重新上傳
  const anyWasLoaded=(!mapOk&&!!getMeta('ec|filemeta|globalMap'))||(!mobicOk&&!!getMeta(fmKey(shop,'mobic')))||(!adsOk&&!!getMeta(fmKey(shop,'ads')));
  const hintEl=document.getElementById('upm-gen-hint');
  if(hintEl){
    if(anyWasLoaded&&!(mobicOk&&adsOk)){
      hintEl.innerHTML='⚠️ <b style="color:#b45309">頁面重整後解析的資料會清空</b>，請點 🔄 卡片重新上傳原檔案';
      hintEl.style.color='#b45309';
    } else {
      hintEl.textContent='上傳莫筆克＋廣告報表後可產生';
      hintEl.style.color='#9ca3af';
    }
  }
  renderGroupAdsCards(shop);
  ov.classList.add('open');
}
function closeUploadModal(){document.getElementById('upload-modal-overlay')?.classList.remove('open');}

let _deleteFilePending=null;
function openDeleteFileModal(type){
  const labels={'map':'蝦皮商品清單','mobic':'莫筆克銷售分析','ads':'蝦皮廣告報表','selads':'選品廣告清單'};
  _deleteFilePending=type;
  document.getElementById('delete-file-msg').textContent='確定要刪除「'+labels[type]+'」嗎？刪除後需重新上傳。';
  document.getElementById('delete-file-overlay').classList.add('open');
}
function closeDeleteFileModal(){
  _deleteFilePending=null;
  document.getElementById('delete-file-overlay')?.classList.remove('open');
}
function confirmDeleteFile(){
  const type=_deleteFilePending;
  if(!type){closeDeleteFileModal();return;}
  closeDeleteFileModal();
  if(type==='map'){
    globalMap={};
    try{localStorage.removeItem('ec|filemeta|globalMap');}catch(e){}
    SHOPS.forEach(s=>{state[s.id].rawMap={};});
    try{document.getElementById('upm-map-input').value='';}catch(e){}
  } else {
    const shop=curShop==='總表'?SHOPS[0].id:curShop;
    if(type==='mobic'){state[shop].rawMobic=null;try{localStorage.removeItem(fmKey(shop,'mobic'));}catch(e){};try{document.getElementById('upm-mobic-input').value='';}catch(e){}}
    if(type==='ads'){state[shop].rawAds=null;try{localStorage.removeItem(fmKey(shop,'ads'));}catch(e){};try{document.getElementById('upm-ads-input').value='';}catch(e){}}
    if(type==='selads'){state[shop].rawSelAds=null;try{localStorage.removeItem(fmKey(shop,'selads'));}catch(e){};try{document.getElementById('upm-selads-input').value='';}catch(e){}}
    delete state[shop]._built;
  }
  openUploadModal();
}

// ── Distribution Modal ──
function openDistModal(shop){
  const built=state[shop]?._built;
  if(!built||!built.length){alert('請先產生報表');return;}
  const ov=document.getElementById('dist-modal-overlay');if(!ov)return;
  document.getElementById('dist-modal-body').innerHTML=buildDistHtml(shop,built);
  ov.classList.add('open');
}
function closeDistModal(){document.getElementById('dist-modal-overlay')?.classList.remove('open');}
function buildDistHtml(shop,built){
  const ads=built.filter(r=>r.adsFee>0);
  const noAds=built.filter(r=>r.adsFee===0);
  const adsTotal=ads.length;
  const noAdsTotal=noAds.length;
  const adsWithBudget=ads.filter(r=>r.dayBudget>0);
  const avgBudget=adsWithBudget.length>0?Math.round(adsWithBudget.reduce((s,r)=>s+r.dayBudget,0)/adsWithBudget.length):0;
  const pct=(n,d)=>d>0?Math.round(n/d*100)+'%':'0%';
  const H=r=>r.pureRate*100;
  const aC=(fn)=>ads.filter(fn).length;
  const nC=(fn)=>noAds.filter(fn).length;
  // Colors
  const BLU_HD='#2E5496'; const BLU_HI='#4472C4'; const BLU_LT='#D9E2F3'; const BLU_LB='#BDD7EE';
  const ORG_HD='#C55A11'; const ORG_HI='#ED7D31'; const ORG_LT='#FCE4D6'; const ORG_LB='#F4B183';
  const GRN_HD='#2E75B6'; const GRN_HI='#5B9BD5'; const GRN_LT='#DDEBF7';
  const BDR='1px solid #c8d6e8';

  const T='border-collapse:collapse;width:100%;margin-bottom:28px;border-radius:6px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)';
  const th=(t,bg)=>`<th style="background:${bg};color:#fff;padding:8px 12px;font-size:12px;font-weight:700;text-align:center;border:${BDR}">${t}</th>`;
  const td=(t,bg='#fff',color='#222',bold=false)=>`<td style="padding:6px 12px;font-size:12px;text-align:center;border:${BDR};background:${bg};color:${color};font-weight:${bold?'700':'400'}">${t}</td>`;
  const tdL=(t,rs,bg,color='#fff')=>`<td rowspan="${rs}" style="padding:6px 12px;font-size:12px;text-align:center;font-weight:700;border:${BDR};background:${bg};color:${color}">${t}</td>`;
  const rMeta=(label,val,bg='#f0f4fa')=>`<tr><td style="padding:7px 14px;font-size:12px;border:${BDR};background:${bg};text-align:left"><b>${label}</b></td><td colspan="3" style="padding:7px 14px;font-size:13px;font-weight:700;border:${BDR};background:${bg};text-align:left">${val}</td></tr>`;

  // pureRate sub-rows for ads
  const aPureSub=[['< 0%',aC(r=>H(r)<0)],['0% - 10%',aC(r=>H(r)>=0&&H(r)<10)],['10% - 15%',aC(r=>H(r)>=10&&H(r)<15)],['15% - 20%',aC(r=>H(r)>=15&&H(r)<20)],['20% - 30%',aC(r=>H(r)>=20&&H(r)<30)],['>30%',aC(r=>H(r)>=30)]];
  // budget sub-rows for ads
  const aBudSub=[['< $100',aC(r=>r.dayBudget<100)],['$100 - $200',aC(r=>r.dayBudget>=100&&r.dayBudget<200)],['$200 - $300',aC(r=>r.dayBudget>=200&&r.dayBudget<300)],['$300 - $400',aC(r=>r.dayBudget>=300&&r.dayBudget<400)],['> $400',aC(r=>r.dayBudget>=400)]];

  const n20p=aC(r=>H(r)>=20), n20m=aC(r=>H(r)<20);
  const nB200p=aC(r=>r.dayBudget>200), nB200m=aC(r=>r.dayBudget<=200);

  const adsRows=`
    <tr>${tdL('淨利率',2,BLU_HI)}${td('>20%',BLU_HI,'#fff',true)}${td(n20p,BLU_HI,'#fff',true)}${td(pct(n20p,adsTotal),BLU_HI,'#fff',true)}</tr>
    <tr>${td('<20%',BLU_HI,'#fff',true)}${td(n20m,BLU_HI,'#fff',true)}${td(pct(n20m,adsTotal),BLU_HI,'#fff',true)}</tr>
    ${aPureSub.map(([l,n],i)=>`<tr>${i===0?tdL('淨利率階層',aPureSub.length,BLU_LB,'#1a3260'):''
      }${td(l,BLU_LT,'#1a3260')}${td(n,BLU_LT,'#1a3260')}${td(pct(n,adsTotal),BLU_LT,'#1a3260')}</tr>`).join('')}
    <tr>${tdL('日預算',2,ORG_HI)}${td('>$200',ORG_HI,'#fff',true)}${td(nB200p,ORG_HI,'#fff',true)}${td(pct(nB200p,adsTotal),ORG_HI,'#fff',true)}</tr>
    <tr>${td('<$200',ORG_HI,'#fff',true)}${td(nB200m,ORG_HI,'#fff',true)}${td(pct(nB200m,adsTotal),ORG_HI,'#fff',true)}</tr>
    ${aBudSub.map(([l,n],i)=>`<tr>${i===0?tdL('日預算階層',aBudSub.length,ORG_LB,'#5c2000'):''
      }${td(l,ORG_LT,'#5c2000')}${td(n,ORG_LT,'#5c2000')}${td(pct(n,adsTotal),ORG_LT,'#5c2000')}</tr>`).join('')}`;

  // no-ads pureRate sub-rows
  const nPureSub=[['< 0%',nC(r=>H(r)<0)],['0% - 10%',nC(r=>H(r)>=0&&H(r)<10)],['10% - 20%',nC(r=>H(r)>=10&&H(r)<20)],['20% - 30%',nC(r=>H(r)>=20&&H(r)<30)],['30% - 40%',nC(r=>H(r)>=30&&H(r)<40)],['>40%',nC(r=>H(r)>=40)]];
  const noAdsRows=nPureSub.map(([l,n],i)=>`<tr>${i===0?tdL('淨利率',nPureSub.length,GRN_HI):''
    }${td(l,GRN_LT,'#1a3260')}${td(n,GRN_LT,'#1a3260')}${td(pct(n,noAdsTotal),GRN_LT,'#1a3260')}</tr>`).join('');

  return `
  <table style="${T}">
    <tbody>
      ${rMeta('總投廣商品數量',adsTotal)}
      ${rMeta('投廣日預算均值','NT$'+avgBudget)}
      <tr>${th('欄位',BLU_HD)}${th('項目（扣除廣告費）',BLU_HD)}${th('數量',BLU_HD)}${th('商品數量佔比 %',BLU_HD)}</tr>
      ${adsRows}
    </tbody>
  </table>
  <table style="${T}">
    <tbody>
      ${rMeta('未投廣商品數量',noAdsTotal,'#e8f4fc')}
      <tr>${th('欄位',GRN_HD)}${th('項目（廣告費為 $0）',GRN_HD)}${th('數量',GRN_HD)}${th('商品數量佔比 %',GRN_HD)}</tr>
      ${noAdsRows}
    </tbody>
  </table>`;
}

function onGlobalFile(event,type){
  const shop=curShop==='總表'?SHOPS[0].id:curShop;
  if(type==='map'){
    // reuse existing map input logic by creating a fake event proxy
    onMapFile(event,shop);
    setTimeout(()=>{
      const mapOk=!!globalMap&&Object.keys(globalMap).length>0;
      document.getElementById('upm-map').className='ucard'+(mapOk?' ok':'');
      document.getElementById('upm-map-icon').textContent=mapOk?'✅':'🗂';
      document.getElementById('upm-map-title').textContent=mapOk?'商品清單已載入':'蝦皮商品清單';
    },500);
  } else {
    onFile(event,shop,type);
    setTimeout(()=>{
      const s=state[shop];
      if(type==='mobic'){
        const ok=!!s.rawMobic;
        document.getElementById('upm-mobic').className='ucard'+(ok?' ok':'');
        document.getElementById('upm-mobic-icon').textContent=ok?'✅':'📦';
        document.getElementById('upm-mobic-title').textContent=ok?'莫筆克銷售分析':'莫筆克銷售分析';
        const ms=document.getElementById('upm-mobic-status');if(ms){ms.textContent=ok?'✅ 已載入':'✗ 未載入';ms.style.color=ok?'#10b981':'#ef4444';}
        const md=document.getElementById('upm-mobic-del');if(md){md.style.opacity=ok?'1':'0.35';md.style.pointerEvents=ok?'':'none';}
        const mi=document.getElementById('upm-mobic-input');if(mi){mi.disabled=ok;mi.style.pointerEvents=ok?'none':'';}
        document.getElementById('upm-mobic').style.cursor=ok?'default':'pointer';
      }else if(type==='ads'){
        const ok=!!s.rawAds;
        document.getElementById('upm-ads').className='ucard'+(ok?' ok':'');
        document.getElementById('upm-ads-icon').textContent=ok?'✅':'📣';
        document.getElementById('upm-ads-title').textContent=ok?'蝦皮廣告報表':'蝦皮廣告報表';
        const as=document.getElementById('upm-ads-status');if(as){as.textContent=ok?'✅ 已載入':'✗ 未載入';as.style.color=ok?'#10b981':'#ef4444';}
        const ad=document.getElementById('upm-ads-del');if(ad){ad.style.opacity=ok?'1':'0.35';ad.style.pointerEvents=ok?'':'none';}
        const ai=document.getElementById('upm-ads-input');if(ai){ai.disabled=ok;ai.style.pointerEvents=ok?'none':'';}
        document.getElementById('upm-ads').style.cursor=ok?'default':'pointer';
      }else if(type==='selads'){
        const ok=!!s.rawSelAds;
        document.getElementById('upm-selads').className='ucard'+(ok?' ok':'');
        document.getElementById('upm-selads-icon').textContent=ok?'✅':'🎯';
        document.getElementById('upm-selads-title').textContent=ok?'選品廣告已載入':'選品廣告清單';
        document.getElementById('upm-selads-status').textContent=ok?'✅ 已載入':'— 選填';
        document.getElementById('upm-selads-status').style.color=ok?'#10b981':'#9ca3af';
      }else if(type==='groupads'){
        renderGroupAdsCards(shop);
        try{document.getElementById('upm-groupads-input').value='';}catch{}
      }
      const s2=state[shop];
      document.getElementById('upm-gen-btn').disabled=!(s2.rawMobic&&s2.rawAds);
    },800);
  }
}
function onGlobalGenerate(){
  const shop=curShop==='總表'?SHOPS[0].id:curShop;
  closeUploadModal();
  // switch to that shop first
  const btn=document.querySelector(`button[onclick*="setShop('${shop}']`)||document.querySelector(`[data-shop="${shop}"]`);
  if(curShop!==shop)setShop(shop,null);
  setTimeout(()=>generate(shop),50);
}

function renderAnaModalBody(){
  const t=getAnaThresh();const custom=getCustomAnaRules();
  const disabled=getDisabledAnaTags();
  const inp=(id,val,step='1',w='58px')=>`<input type="number" id="anas-${id}" value="${val}" step="${step}" style="width:${w}">`;
  const clsOpts=ANA_CLS_OPTS.map(o=>`<option value="${o.v}"${o.v===_anaNewCls?' selected':''}>${o.l}</option>`).join('');
  const condRowHtml=(i,c)=>`<div class="ana-cond-row" id="anacr-${i}">
    <select class="ana-cond-f">${ANA_FIELD_OPTS.map(o=>`<option value="${o.v}"${o.v===c.f?' selected':''}>${o.l}</option>`).join('')}</select>
    <select class="ana-cond-op">${['>=','>','<=','<','=','!='].map(o=>`<option value="${o}"${o===c.op?' selected':''}>${o}</option>`).join('')}</select>
    <input type="number" class="ana-cond-v" value="${c.v}" style="width:72px">
    <button class="ana-cond-del" onclick="removeNewCond(${i})">✕</button>
  </div>`;
  const condRows=_anaNewConds.map((c,i)=>condRowHtml(i,c)).join('');
  const trash=(label,fn)=>`<button class="ana-rule-del" onclick="${fn}(decodeURIComponent('${encodeURIComponent(label)}'))" title="停用此標籤">🗑</button>`;
  const customRows=custom.length?custom.map((ct,i)=>{
    const condDesc=ct.conds.map(c=>`${c.f} ${c.op} ${c.v}`).join(' 且 ');
    return`<div class="ana-rule-row"><span class="ana-rule-tag ${ct.cls||'tag-add100'}">${ct.label}</span><span class="ana-rule-desc" style="font-size:12px;color:#6b7280">${condDesc}</span><button class="ana-rule-del" onclick="deleteCustomAnaRule(${i})" title="刪除">🗑</button></div>`;
  }).join(''):`<div class="ana-custom-empty">尚無自訂標籤</div>`;
  const disabledSection=disabled.length?`<div class="ana-sec-hdr" style="margin-top:16px">已停用標籤</div>${disabled.map(l=>`<div class="ana-rule-row" style="opacity:.5"><span class="ana-rule-tag tag-low" style="min-width:auto;padding:4px 8px">${l}</span><span class="ana-rule-desc" style="font-size:12px;color:#9ca3af">已停用</span><button class="ana-rule-del" style="color:#10b981" onclick="restoreAnaTag(decodeURIComponent('${encodeURIComponent(l)}'))" title="恢復">↩</button></div>`).join('')}`:'';

  document.getElementById('ana-modal-body').innerHTML=`
    <div class="ana-sec-hdr">加減碼前提</div>
    <div class="ana-rule-row">
      <span class="ana-rule-tag tag-add300" style="min-width:72px">前提</span>
      <span class="ana-rule-desc">O欄（過去7天點擊）> ${inp('clickMin',t.clickMin)}</span>
    </div>
    <div class="ana-sec-hdr">加預算</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add300">加300</span><span class="ana-rule-desc">直接ROI差距（實際-目標）≥ ${inp('add300',t.add300)} (含)以上</span>${trash('加300','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add200">加200</span><span class="ana-rule-desc">直接ROI差距（實際-目標）≥ ${inp('add200',t.add200)} (含)以上</span>${trash('加200','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add100">加100</span><span class="ana-rule-desc">直接ROI差距（實際-目標）≥ ${inp('add100',t.add100)} (含)以上</span>${trash('加100','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add50">加50</span><span class="ana-rule-desc">直接ROI差距（實際-目標）≥ ${inp('add50',t.add50)} 且 < ${inp('add50max',t.add100)}</span>${trash('加50','disableAnaTag')}</div>
    <div class="ana-sec-hdr">減預算</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-sub300">減300</span><span class="ana-rule-desc">直接ROI差距（實際-目標）≤ ${inp('sub300',t.sub300)}</span>${trash('減300','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-sub200">減200</span><span class="ana-rule-desc">直接ROI差距（實際-目標）≤ ${inp('sub200',t.sub200)}</span>${trash('減200','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-sub100">減100</span><span class="ana-rule-desc">直接ROI差距（實際-目標）≤ ${inp('sub100',t.sub100)}</span>${trash('減100','disableAnaTag')}</div>
    <div class="ana-sec-hdr">分析標籤</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-high">高利潤商品</span><span class="ana-rule-desc">廣告費=0 且 純利率 > ${inp('highMinH',t.highMinH,'0.1')} %</span>${trash('高利潤商品','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-lose">賠錢中</span><span class="ana-rule-desc">廣告費 > 0 且 純利率 &lt; 0%</span>${trash('賠錢中','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-low">低淨利</span><span class="ana-rule-desc">廣告費 > 0 且 目標ROI &lt; 0<br><span style="color:#9ca3af;font-size:11px">或 廣告費 > 0 且 直接ROI差距顯示「—」</span></span>${trash('低淨利','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-danger">危險商品</span><span class="ana-rule-desc">廣告費=0 且 純利率 0%~${inp('dangerMaxH',t.dangerMaxH,'0.1')} %</span>${trash('危險商品','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-bad">低效廣告</span><span class="ana-rule-desc">廣告費 > 0 且 純利率 &lt; ${inp('badAdsMaxH',t.badAdsMaxH,'0.1')} %</span>${trash('低效廣告','disableAnaTag')}</div>
    <div class="ana-sec-hdr">自訂標籤</div>
    <div id="ana-custom-list">${customRows}</div>
    ${disabledSection}
    <div class="ana-add-box" style="margin-top:14px">
      <div class="ana-add-box-title">＋ 新增自訂標籤</div>
      <div class="ana-field-row"><label>名稱</label><input type="text" id="anas-new-label" placeholder="標籤名稱" value="${_anaNewLabel.replace(/"/g,'&quot;')}"></div>
      <div class="ana-field-row"><label>顏色</label><select id="anas-new-cls">${clsOpts}</select></div>
      <div class="ana-conds-wrap" id="ana-new-conds">${condRows}</div>
      <button class="ana-add-cond-btn" onclick="addNewAnaCond()">＋ 新增條件</button>
      <div class="ana-submit-row"><button class="ana-add-rule-btn" onclick="submitNewAnaRule()">新增標籤</button></div>
    </div>`;
}
function _syncAnaNewDraft(){
  _anaNewLabel=document.getElementById('anas-new-label')?.value??_anaNewLabel;
  _anaNewCls=document.getElementById('anas-new-cls')?.value??_anaNewCls;
  _syncCondDraft(_anaNewConds,'#ana-new-conds');
}
function addNewAnaCond(){_syncAnaNewDraft();_anaNewConds.push({f:'D',op:'>=',v:'0'});renderAnaModalBody();}
function removeNewCond(i){_syncAnaNewDraft();_anaNewConds.splice(i,1);renderAnaModalBody();}
function readNewConds(){
  const rows=document.querySelectorAll('#ana-new-conds .ana-cond-row');
  return Array.from(rows).map(r=>({
    f:r.querySelector('.ana-cond-f').value,
    op:r.querySelector('.ana-cond-op').value,
    v:r.querySelector('.ana-cond-v').value
  }));
}
function submitNewAnaRule(){
  const label=(document.getElementById('anas-new-label').value||'').trim();
  if(!label){alert('請輸入標籤名稱');return;}
  const cls=document.getElementById('anas-new-cls').value;
  const conds=readNewConds();
  if(!conds.length){alert('請至少新增一個條件');return;}
  const rules=getCustomAnaRules();
  rules.push({label,cls,conds});
  saveCustomAnaRules(rules);
  _anaNewConds=[];_anaNewLabel='';_anaNewCls='tag-add300';
  renderAnaModalBody();
  reapplyAnaToAll();
}
function deleteCustomAnaRule(i){
  const rules=getCustomAnaRules();rules.splice(i,1);saveCustomAnaRules(rules);
  renderAnaModalBody();reapplyAnaToAll();
}
function g(id){const el=document.getElementById('anas-'+id);return el?parseFloat(el.value):undefined;}
function saveAnaSettings(){
  const t={
    clickMin:g('clickMin')??100,
    dangerMaxH:g('dangerMaxH')??10,highMinH:g('highMinH')??30,badAdsMaxH:g('badAdsMaxH')??10,
    add300:g('add300')??3,add200:g('add200')??2,add100:g('add100')??1,add50:g('add50')??0,
    sub300:g('sub300')??-3,sub200:g('sub200')??-2,sub100:g('sub100')??-1,
  };
  saveAnaThresh(t);
  closeAnaSettings();
  reapplyAnaToAll();
}
function reapplyAnaToAll(){
  SHOPS.forEach(s=>{
    const built=state[s.id]._built;if(!built)return;
    built.forEach(r=>{
      r.analysis=calcAnalysis(r.adsFee||0,r.pureRate||0,r.targetROI??null,r.roiDiff??null,r.clicks||0,r.pureProfit||0,r.roi||0);
      r.analysisLabel=r.analysis?.label||'';
      r.testTags=calcTestTags(r.adsFee||0,r.pureRate||0,r.targetROI??null,r.roiDiff??null,r.clicks||0,r.pureProfit||0,r.roi||0);
      if(s.id==='好麻吉'){
        r.growthAnalysis=calcGrowthAnalysis(r.growthRate??null,r.rev||0,r.prevRev??null,r.pureRate||0);
        r.growthAnalysisLabel=r.growthAnalysis?.label||'';
      }
    });
    applyFilters(s.id);
  });
}

// ── 測試標籤（純自訂規則，沿用分析標籤同一套條件引擎，但獨立存放） ──
// 預設帶一筆規則進來：原本獨立「建議」功能唯一的規則（廣告效率過低，
// 點擊數>100 且 投入產出<10），併入測試標籤後就不用再維護獨立的建議規則系統。
const TEST_DEFAULT_RULES=[
  {label:'建議關閉廣告',cls:'tag-bad',conds:[{f:'O',op:'>',v:'100'},{f:'R',op:'<',v:'10'}]},
];
function getCustomTestRules(){
  const v=_cloudRead('ec_test_custom');
  return v||TEST_DEFAULT_RULES.map(r=>({...r,conds:r.conds.map(c=>({...c}))}));
}
function saveCustomTestRules(r){_cloudWrite('ec_test_custom',r);}
// 回傳「全部」符合條件的規則（不是只回傳第一個命中的），
// 讓同一列可以同時掛多個測試標籤。
function calcTestTags(D,H,K,N,O,P,R){
  const out=[];
  for(const ct of getCustomTestRules()){
    if(evalAnaConds(ct.conds,{D,H,K,N,O,P,R}))out.push({label:ct.label,cls:ct.cls||'tag-add100'});
  }
  return out;
}
function reapplyTestTagToAll(){
  SHOPS.forEach(s=>{
    const built=state[s.id]._built;if(!built)return;
    built.forEach(r=>{
      r.testTags=calcTestTags(r.adsFee||0,r.pureRate||0,r.targetROI??null,r.roiDiff??null,r.clicks||0,r.pureProfit||0,r.roi||0);
    });
    applyFilters(s.id);
  });
}
let _testDraft=null;
let _testEditShop=null;
function openTestSettings(shop){
  let ov=document.getElementById('test-overlay');
  if(!ov){
    ov=document.createElement('div');ov.id='test-overlay';ov.className='ana-overlay';
    ov.innerHTML=`<div class="ana-modal" onclick="event.stopPropagation()">
      <div class="ana-modal-hdr"><span class="ana-modal-title">⚙ 測試標籤設定</span><button class="ana-modal-x" onclick="closeTestSettings()">✕</button></div>
      <div class="ana-modal-body" id="test-modal-body"></div>
      <div class="ana-modal-ftr">
        <button class="ana-cancel-btn" onclick="closeTestSettings()">取消</button>
        <button class="ana-save-btn" onclick="saveTestSettings()">儲存並套用</button>
      </div>
    </div>`;
    ov.onclick=closeTestSettings;
    document.body.appendChild(ov);
  }
  _testEditShop=shop;
  _testDraft=getCustomTestRules().map(r=>({...r,conds:r.conds.map(c=>({...c}))}));
  renderTestModalBody();
  ov.classList.add('open');
}
function closeTestSettings(){document.getElementById('test-overlay')?.classList.remove('open');_testDraft=null;}
function syncTestDraftFromDOM(){
  if(!_testDraft)return;
  document.querySelectorAll('#test-modal-body .sugg-rule-row').forEach(card=>{
    const ri=parseInt(card.dataset.ri);const r=_testDraft[ri];if(!r)return;
    r.label=card.querySelector('.sr-name').value;
    r.cls=card.querySelector('.sr-color').value;
    card.querySelectorAll('.sugg-cond-row').forEach((row,ci)=>{
      if(!r.conds[ci])return;
      r.conds[ci].f=row.querySelector('.sc-f').value;
      r.conds[ci].op=row.querySelector('.sc-op').value;
      r.conds[ci].v=row.querySelector('.sc-v').value;
    });
  });
}
function testCondRowHtml(ri,ci,c){
  const fOpts=ANA_FIELD_OPTS.map(o=>`<option value="${o.v}"${o.v===c.f?' selected':''}>${o.l}</option>`).join('');
  const opOpts=['>','>=','<','<=','=','!='].map(o=>`<option value="${o}"${o===c.op?' selected':''}>${o}</option>`).join('');
  return`<div class="sugg-cond-row">
    <span style="font-size:12px;color:#9ca3af;width:20px;text-align:center">${ci>0?'且':'若'}</span>
    <select class="sc-f">${fOpts}</select>
    <select class="sc-op">${opOpts}</select>
    <input type="number" class="sc-v" value="${c.v}">
    <button onclick="removeTestDraftCond(${ri},${ci})" title="刪除條件" style="background:none;border:none;cursor:pointer;color:#9ca3af;margin-left:auto">✕</button>
  </div>`;
}
function testRuleCardHtml(r,ri){
  const colorOpts=ANA_CLS_OPTS.map(o=>`<option value="${o.v}"${o.v===r.cls?' selected':''}>${o.l}</option>`).join('');
  const{total,done}=testRuleStats(_testEditShop,r);
  let statCls='s-none',statText=total+' 項符合',barColor='#e5e7eb',pct=0;
  if(total>0){
    pct=Math.round(done/total*100);
    if(done===0){statCls='s-red';statText=`0/${total} 已完成`;barColor='#ef4444';}
    else if(done<total){statCls='s-amber';statText=`${done}/${total} 已完成`;barColor='#f59e0b';}
    else{statCls='s-green';statText='✓ 全部完成';barColor='#10b981';}
  }
  return`<div class="sugg-rule-row" data-ri="${ri}">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <input type="text" class="sr-name" value="${r.label}" style="flex:1;font-weight:700" placeholder="標籤名稱">
      <span class="sugg-rule-stat ${statCls}">${statText}</span>
      <button onclick="deleteTestDraftRule(${ri})" title="刪除標籤" style="background:none;border:none;cursor:pointer">🗑</button>
    </div>
    ${total>0?`<div class="sugg-rule-bar"><div class="sugg-rule-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>`:''}
    <div class="sr-conds" style="margin-top:10px">${r.conds.map((c,ci)=>testCondRowHtml(ri,ci,c)).join('')}</div>
    <button class="sugg-add-btn" onclick="addTestDraftCond(${ri})">＋ 新增條件</button>
    <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
      <span style="font-size:12px;color:#6b7280;white-space:nowrap">顏色</span>
      <select class="sr-color">${colorOpts}</select>
    </div>
  </div>`;
}
function renderTestModalBody(){
  const html=_testDraft.length?_testDraft.map((r,i)=>testRuleCardHtml(r,i)).join(''):'<div style="text-align:center;color:#9ca3af;font-size:12px;padding:10px">尚無測試標籤</div>';
  document.getElementById('test-modal-body').innerHTML=`
    <div style="font-size:12px;color:#9ca3af;margin-bottom:12px">符合規則全部條件的商品會掛上這個標籤，可以在「🏷 標籤」選單裡篩選；規則會記住，下次上傳不用重新設定。</div>
    <div id="test-active-list">${html}</div>
    <button class="sugg-add-btn" onclick="addTestDraftRule()" style="margin-top:2px">＋ 新增規則</button>`;
}
function addTestDraftCond(ri){syncTestDraftFromDOM();_testDraft[ri].conds.push({f:'D',op:'>=',v:'0'});renderTestModalBody();}
function removeTestDraftCond(ri,ci){syncTestDraftFromDOM();if(_testDraft[ri].conds.length>1)_testDraft[ri].conds.splice(ci,1);renderTestModalBody();}
function deleteTestDraftRule(ri){syncTestDraftFromDOM();_testDraft.splice(ri,1);renderTestModalBody();}
function addTestDraftRule(){
  syncTestDraftFromDOM();
  _testDraft.push({label:'新標籤',cls:'tag-add300',conds:[{f:'D',op:'>=',v:'0'}]});
  renderTestModalBody();
}
function saveTestSettings(){
  syncTestDraftFromDOM();
  saveCustomTestRules(_testDraft);
  closeTestSettings();
  reapplyTestTagToAll();
}

// ── 成長比分析公式（雲端同步） ──
const GROWTH_THRESH_DEF={fallPct:30,risePct:30,highRev:10000,midRevMin:7000,midRevMax:10000,devRevMin:5000,devRevMax:7000,lowPurePct:20};
function getGrowthThresh(){const v=_cloudRead('ec_growth_thresh'); return Object.assign({},GROWTH_THRESH_DEF,v||{});}
function saveGrowthThresh(t){_cloudWrite('ec_growth_thresh',t);}
function getCustomGrowthRules(){return _cloudRead('ec_growth_custom')||[];}
function getDisabledGrowthTags(){return _cloudRead('ec_growth_disabled')||[];}
function disableGrowthTag(label){const a=getDisabledGrowthTags();if(!a.includes(label))a.push(label);_cloudWrite('ec_growth_disabled',a);renderGrowthModalBody();reapplyAnaToAll();}
function restoreGrowthTag(label){const a=getDisabledGrowthTags().filter(l=>l!==label);_cloudWrite('ec_growth_disabled',a);renderGrowthModalBody();reapplyAnaToAll();}
function saveCustomGrowthRules(r){_cloudWrite('ec_growth_custom',r);}
function calcGrowthAnalysis(growthRate, rev, prevRev, pureRate) {
  const t=getGrowthThresh();
  const dis=new Set(getDisabledGrowthTags());
  const ok=l=>!dis.has(l);
  const G=growthRate, R=rev, P=pureRate*100;
  if(ok('🔴重跌品')&&G !== null && G < -(t.fallPct/100)) return { label:'🔴重跌品', cls:'tag-danger' };
  if(ok('🟢爆發品')&&G !== null && G > (t.risePct/100))  return { label:'🟢爆發品', cls:'tag-high' };
  for(const ct of getCustomGrowthRules()){
    if(evalAnaConds(ct.conds,{G:G??0,R,P,prevRev:prevRev??0}))return{label:ct.label,cls:ct.cls||'tag-add100'};
  }
  if(ok('👑高營收')&&R >= t.highRev)                           return { label:'👑高營收', cls:'tag-add300' };
  if(ok('🟨中營收')&&R >= t.midRevMin && R < t.midRevMax)      return { label:'🟨中營收', cls:'tag-add200' };
  if(ok('🟡發展品')&&R >= t.devRevMin && R < t.devRevMax)      return { label:'🟡發展品', cls:'tag-add100' };
  if(ok('🔻低利品')&&P < t.lowPurePct)                         return { label:'🔻低利品', cls:'tag-low' };
  if(ok('⚫斷銷品')&&prevRev !== null && prevRev > 0 && (rev === 0 || rev === null)) return { label:'⚫斷銷品', cls:'tag-lose' };
  return { label:'', cls:'' };
}

// ── 成長分析設定 Modal ──
let _growthNewConds=[];
let _growthNewLabel='';
let _growthNewCls='tag-add300';
const GROWTH_FIELD_OPTS=[
  {v:'G',l:'成長率%(G)'},{v:'R',l:'營收(R)'},{v:'P',l:'淨利率%(P)'},{v:'prevRev',l:'上期營收'}
];
function openGrowthSettings(shop){
  let ov=document.getElementById('growth-overlay');
  if(!ov){
    ov=document.createElement('div');ov.id='growth-overlay';ov.className='ana-overlay';
    ov.innerHTML=`<div class="ana-modal" onclick="event.stopPropagation()">
      <div class="ana-modal-hdr"><span class="ana-modal-title">⚙ 成長分析設定</span><button class="ana-modal-x" onclick="closeGrowthSettings()">✕</button></div>
      <div class="ana-modal-body" id="growth-modal-body"></div>
      <div class="ana-modal-ftr">
        <button class="ana-cancel-btn" onclick="closeGrowthSettings()">取消</button>
        <button class="ana-save-btn" onclick="saveGrowthSettings()">儲存並套用</button>
      </div>
    </div>`;
    ov.onclick=closeGrowthSettings;
    document.body.appendChild(ov);
  }
  _growthNewConds=[];_growthNewLabel='';_growthNewCls='tag-add300';
  renderGrowthModalBody();
  ov.classList.add('open');
}
function closeGrowthSettings(){document.getElementById('growth-overlay')?.classList.remove('open');}
function renderGrowthModalBody(){
  const t=getGrowthThresh();const custom=getCustomGrowthRules();
  const disabled=getDisabledGrowthTags();
  const inp=(id,val,step='1',w='70px')=>`<input type="number" id="grths-${id}" value="${val}" step="${step}" style="width:${w}">`;
  const clsOpts=ANA_CLS_OPTS.map(o=>`<option value="${o.v}"${o.v===_growthNewCls?' selected':''}>${o.l}</option>`).join('');
  const condRowHtml=(i,c)=>`<div class="ana-cond-row" id="grthcr-${i}">
    <select class="ana-cond-f">${GROWTH_FIELD_OPTS.map(o=>`<option value="${o.v}"${o.v===c.f?' selected':''}>${o.l}</option>`).join('')}</select>
    <select class="ana-cond-op">${['>=','>','<=','<','=','!='].map(o=>`<option value="${o}"${o===c.op?' selected':''}>${o}</option>`).join('')}</select>
    <input type="number" class="ana-cond-v" value="${c.v}" style="width:72px">
    <button class="ana-cond-del" onclick="removeGrowthCond(${i})">✕</button>
  </div>`;
  const condRows=_growthNewConds.map((c,i)=>condRowHtml(i,c)).join('');
  const trash=(label)=>`<button class="ana-rule-del" onclick="disableGrowthTag(decodeURIComponent('${encodeURIComponent(label)}'))" title="停用此標籤">🗑</button>`;
  const customRows=custom.length?custom.map((ct,i)=>{
    const condDesc=ct.conds.map(c=>`${c.f} ${c.op} ${c.v}`).join(' 且 ');
    return`<div class="ana-rule-row"><span class="ana-rule-tag ${ct.cls||'tag-add100'}">${ct.label}</span><span class="ana-rule-desc" style="font-size:12px;color:#6b7280">${condDesc}</span><button class="ana-rule-del" onclick="deleteCustomGrowthRule(${i})" title="刪除">🗑</button></div>`;
  }).join(''):`<div class="ana-custom-empty">尚無自訂標籤</div>`;
  const disabledSection=disabled.length?`<div class="ana-sec-hdr" style="margin-top:16px">已停用標籤</div>${disabled.map(l=>`<div class="ana-rule-row" style="opacity:.5"><span class="ana-rule-tag tag-low" style="min-width:auto;padding:4px 8px">${l}</span><span class="ana-rule-desc" style="font-size:12px;color:#9ca3af">已停用</span><button class="ana-rule-del" style="color:#10b981" onclick="restoreGrowthTag(decodeURIComponent('${encodeURIComponent(l)}'))" title="恢復">↩</button></div>`).join('')}`:'';
  document.getElementById('growth-modal-body').innerHTML=`
    <div class="ana-sec-hdr">成長類</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-danger">🔴重跌品</span><span class="ana-rule-desc">成長率 &lt; -${inp('fallPct',t.fallPct,'0.1')} %</span>${trash('🔴重跌品')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-high">🟢爆發品</span><span class="ana-rule-desc">成長率 > ${inp('risePct',t.risePct,'0.1')} %</span>${trash('🟢爆發品')}</div>
    <div class="ana-sec-hdr">營收類</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add300">👑高營收</span><span class="ana-rule-desc">營收 ≥ ${inp('highRev',t.highRev,'100','80px')}</span>${trash('👑高營收')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add200">🟨中營收</span><span class="ana-rule-desc">營收 ${inp('midRevMin',t.midRevMin,'100','80px')} ~ ${inp('midRevMax',t.midRevMax,'100','80px')}</span>${trash('🟨中營收')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add100">🟡發展品</span><span class="ana-rule-desc">營收 ${inp('devRevMin',t.devRevMin,'100','80px')} ~ ${inp('devRevMax',t.devRevMax,'100','80px')}</span>${trash('🟡發展品')}</div>
    <div class="ana-sec-hdr">利潤類</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-low">🔻低利品</span><span class="ana-rule-desc">淨利率 &lt; ${inp('lowPurePct',t.lowPurePct,'0.1')} %</span>${trash('🔻低利品')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-lose">⚫斷銷品</span><span class="ana-rule-desc">上期有銷售，本期營收 = 0</span>${trash('⚫斷銷品')}</div>
    <div class="ana-sec-hdr">自訂標籤</div>
    <div id="growth-custom-list">${customRows}</div>
    ${disabledSection}
    <div class="ana-add-box" style="margin-top:14px">
      <div class="ana-add-box-title">＋ 新增自訂標籤</div>
      <div class="ana-field-row"><label>名稱</label><input type="text" id="grths-new-label" placeholder="標籤名稱" value="${_growthNewLabel.replace(/"/g,'&quot;')}"></div>
      <div class="ana-field-row"><label>顏色</label><select id="grths-new-cls">${clsOpts}</select></div>
      <div class="ana-conds-wrap" id="growth-new-conds">${condRows}</div>
      <button class="ana-add-cond-btn" onclick="addGrowthCond()">＋ 新增條件</button>
      <div class="ana-submit-row"><button class="ana-add-rule-btn" onclick="submitNewGrowthRule()">新增標籤</button></div>
    </div>`;
}
function _syncGrowthNewDraft(){
  _growthNewLabel=document.getElementById('grths-new-label')?.value??_growthNewLabel;
  _growthNewCls=document.getElementById('grths-new-cls')?.value??_growthNewCls;
  _syncCondDraft(_growthNewConds,'#growth-new-conds');
}
function addGrowthCond(){_syncGrowthNewDraft();_growthNewConds.push({f:'G',op:'>=',v:'0'});renderGrowthModalBody();}
function removeGrowthCond(i){_syncGrowthNewDraft();_growthNewConds.splice(i,1);renderGrowthModalBody();}
function readGrowthNewConds(){
  return Array.from(document.querySelectorAll('#growth-new-conds .ana-cond-row')).map(r=>({
    f:r.querySelector('.ana-cond-f').value,op:r.querySelector('.ana-cond-op').value,v:r.querySelector('.ana-cond-v').value
  }));
}
function submitNewGrowthRule(){
  const label=(document.getElementById('grths-new-label').value||'').trim();
  if(!label){alert('請輸入標籤名稱');return;}
  const cls=document.getElementById('grths-new-cls').value;
  const conds=readGrowthNewConds();
  if(!conds.length){alert('請至少新增一個條件');return;}
  const rules=getCustomGrowthRules();rules.push({label,cls,conds});saveCustomGrowthRules(rules);
  _growthNewConds=[];_growthNewLabel='';_growthNewCls='tag-add300';renderGrowthModalBody();reapplyAnaToAll();
}
function deleteCustomGrowthRule(i){
  const rules=getCustomGrowthRules();rules.splice(i,1);saveCustomGrowthRules(rules);
  renderGrowthModalBody();reapplyAnaToAll();
}
function gg(id){const el=document.getElementById('grths-'+id);return el?parseFloat(el.value):undefined;}
function saveGrowthSettings(){
  const t={
    fallPct:gg('fallPct')??30,risePct:gg('risePct')??30,
    highRev:gg('highRev')??10000,
    midRevMin:gg('midRevMin')??7000,midRevMax:gg('midRevMax')??10000,
    devRevMin:gg('devRevMin')??5000,devRevMax:gg('devRevMax')??7000,
    lowPurePct:gg('lowPurePct')??20,
  };
  saveGrowthThresh(t);closeGrowthSettings();reapplyAnaToAll();
}

// ── Tag filter bar ──
function getTagFilters(){try{const r=localStorage.getItem('ec_tagfilters_user');return r?JSON.parse(r):[];}catch{return[];}}
function saveTagFilters(arr){try{localStorage.setItem('ec_tagfilters_user',JSON.stringify(arr));}catch{}}
function setTagFilter(shop,label){
  if(label===null){state[shop].tagFilters=[];saveTagFilters([]);}
  else{
    const arr=state[shop].tagFilters||[];
    const idx=arr.indexOf(label);
    if(idx>=0)arr.splice(idx,1);else arr.push(label);
    state[shop].tagFilters=arr;saveTagFilters(arr);
  }
  applyFilters(shop);
  // 重新開啟彈窗（innerHTML 更新後 open class 需補回）
  const bar=document.getElementById('tfbar-'+shop);
  if(bar)bar.classList.add('open');
}
function updateTagFilterBar(shop){
  const bar=document.getElementById('tfbar-'+shop);if(!bar)return;
  const built=state[shop]._built;if(!built||!built.length){bar.innerHTML='';return;}
  const sel=state[shop].tagFilters||[];
  const counts={};
  built.forEach(r=>{
    const a=r.analysis?.label;if(a)counts[a]=(counts[a]||0)+1;
    const g=r.growthAnalysis?.label;if(g)counts[g]=(counts[g]||0)+1;
    (r.testTags||[]).forEach(tt=>{counts[tt.label]=(counts[tt.label]||0)+1;});
  });
  const mkPill=(t)=>{
    const active=sel.includes(t.label)?' active':'';
    const lbl=t.label.replace(/'/g,"\\'");
    const cnt=counts[t.label]||0;
    const ca=`onclick="event.stopPropagation();setTagFilter('${shop}','${lbl}')"`;
    return`<span class="tfpill${active}" ${ca} title="${t.label}">${t.label}</span><span class="tfpill-cnt-cell" ${ca}>${cnt}</span>`;
  };
  const FIXED=[
    {label:'危險商品',dot:'#991b1b'},{label:'高利潤商品',dot:'#065f46'},
    {label:'低淨利',dot:'#92400e'},{label:'賠錢中',dot:'#7f1d1d'},{label:'低效廣告',dot:'#78350f'},
  ];
  const ADD_LBLS=['加300','加200','加100','加50'];
  const SUB_LBLS=['減300','減200','減100'];
  const mkDrop=(id,label,dot,lbls)=>{
    const total=lbls.reduce((s,l)=>s+(counts[l]||0),0);
    if(!total)return'';
    const isActive=lbls.some(l=>sel.includes(l));
    const items=lbls.filter(l=>counts[l]).map(l=>`<div class="tfdrop-item${sel.includes(l)?' sel':''}" onclick="event.stopPropagation();setTagFilter('${shop}','${l}');closeTfDrop()">${l} <span class="tfpill-cnt">${counts[l]}</span></div>`).join('');
    return`<div class="tfdrop-wrap"><span class="tfpill${isActive?' active':''}" style="width:100%" onclick="toggleTfDrop(event,'${id}')">${label} ▾</span><div class="tfdrop-menu" id="${id}">${items}</div></div><span class="tfpill-cnt-cell" onclick="event.stopPropagation();toggleTfDrop(event,'${id}')">${total}</span>`;
  };
  const total=built.length;
  const allActive=!sel.length;
  const allPill=`<span class="tfpill tfpill-all${allActive?'':' active'}" style="${allActive?'':'opacity:.7'}" onclick="event.stopPropagation();setTagFilter('${shop}',null)">全部 <span class="tfpill-cnt">${total}</span></span>`;
  const fixedPills=FIXED.filter(t=>counts[t.label]).map(mkPill).join('');
  const addDrop=mkDrop(`tfd-add-${shop}`,'加預算','#1e40af',ADD_LBLS);
  const subDrop=mkDrop(`tfd-sub-${shop}`,'減預算','#991b1b',SUB_LBLS);
  const customPills=getCustomAnaRules().filter(ct=>counts[ct.label]).map(ct=>{
    const active=sel.includes(ct.label)?' active':'';
    const lbl=ct.label.replace(/'/g,"\\'");
    const cnt=counts[ct.label]||0;
    const ca=`onclick="event.stopPropagation();setTagFilter('${shop}','${lbl}')"`;
    return`<span class="tfpill${active}" ${ca}>${ct.label}</span><span class="tfpill-cnt-cell" ${ca}>${cnt}</span>`;
  }).join('');
  const testPills=getCustomTestRules().map(ct=>{
    const{total,done}=testRuleStats(shop,ct);
    if(!total)return'';
    const active=sel.includes(ct.label)?' active':'';
    const lbl=ct.label.replace(/'/g,"\\'");
    const ca=`onclick="event.stopPropagation();setTagFilter('${shop}','${lbl}')"`;
    return`<span class="tfpill${active}" ${ca}>${ct.label}</span><span class="tfpill-cnt-cell" ${ca}>${done}/${total}</span>`;
  }).join('');
  const row0=`<div class="tfrow">
    <div><span class="tfrow-lbl">測試標籤</span><button class="ana-gear-btn" onclick="openTestSettings('${shop}')" title="設定測試標籤">⚙</button></div>
    <div class="tfrow-pills">${testPills||'<span style="font-size:11px;color:#9ca3af;padding:5px 0">尚無測試標籤，點 ⚙ 新增</span>'}</div>
  </div>`;
  const row1=`<div class="tfrow">
    <div><span class="tfrow-lbl">分析標籤</span><button class="ana-gear-btn" onclick="openAnaSettings('${shop}')" title="設定分析規則">⚙</button></div>
    <div class="tfrow-pills">${fixedPills}${addDrop}${subDrop}${customPills}</div>
  </div>`;
  let row2='';
  if(shop==='好麻吉'){
    const gCustomPills=getCustomGrowthRules().filter(ct=>counts[ct.label]).map(ct=>{
      const active=sel.includes(ct.label)?' active':'';const lbl=ct.label.replace(/'/g,"\\'");
      const cnt=counts[ct.label]||0;
      const ca=`onclick="event.stopPropagation();setTagFilter('${shop}','${lbl}')"`;
      return`<span class="tfpill${active}" ${ca}>${ct.label}</span><span class="tfpill-cnt-cell" ${ca}>${cnt}</span>`;
    }).join('');
    const gp=GROWTH_TAGS.filter(t=>counts[t.label]).map(mkPill).join('')+gCustomPills;
    if(gp)row2=`<div class="tfrow">
      <div><span class="tfrow-lbl">成長分析</span><button class="ana-gear-btn" onclick="openGrowthSettings('${shop}')" title="設定成長分析規則">⚙</button></div>
      <div class="tfrow-pills">${gp}</div>
    </div>`;
  }
  bar.innerHTML=`<div class="tf-all-wrap">${allPill}</div><div class="tf-rows">${row0}${row1}${row2}</div>`;
}
function toggleTagPopup(shop,btn){
  const bar=document.getElementById('tfbar-'+shop);if(!bar)return;
  const isOpen=bar.classList.contains('open');
  document.querySelectorAll('.tag-filter-bar.open').forEach(el=>el.classList.remove('open'));
  if(!isOpen){updateTagFilterBar(shop);bar.classList.add('open');}
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.tag-filter-bar')&&!e.target.closest('[id^="tag-btn-"]')){
    document.querySelectorAll('.tag-filter-bar.open').forEach(el=>el.classList.remove('open'));
  }
});
function toggleTfDrop(e,id){
  e.stopPropagation();
  const m=document.getElementById(id);if(!m)return;
  const wasOpen=m.classList.contains('open');
  closeTfDrop();
  if(!wasOpen)m.classList.add('open');
}
function closeTfDrop(){document.querySelectorAll('.tfdrop-menu.open').forEach(el=>el.classList.remove('open'));}
document.addEventListener('click',closeTfDrop);

// ── Filters & Sort ──
function applyFilters(shop){
  const s=state[shop];if(!s._built||!s._built.length)return;
  const q=(document.getElementById('search-'+shop).value||'').toLowerCase();
  let list=[...s._built];
  if(q)list=list.filter(r=>r.name.toLowerCase().includes(q)||r.code.toLowerCase().includes(q));
  if(s.tagFilters?.length)list=list.filter(r=>s.tagFilters.some(l=>r.analysis?.label===l||r.growthAnalysis?.label===l||(r.testTags||[]).some(tt=>tt.label===l)));
  if(s.suggFilterActive)list=list.filter(r=>r.testTags?.length);
  const PCT_COLS=new Set(['pureRate','adsPct','growthRate']);
  Object.entries(s.filters||{}).forEach(([col,f])=>{
    if(!f)return;
    if(f.type!=='range'&&(f.val===''||f.val===undefined))return;
    list=list.filter(r=>{
      const raw=r[col];
      const v=PCT_COLS.has(col)?num(raw)*100:raw;
      if(f.type==='text')return(raw+'').toLowerCase().includes(f.val.toLowerCase());
      if(f.type==='range'){const n=num(v);if(f.min!==null&&n<f.min)return false;if(f.max!==null&&n>f.max)return false;return true;}
      if(f.type==='min')return num(v)>=parseFloat(f.val);
      if(f.type==='max')return num(v)<=parseFloat(f.val);
      return true;
    });
  });
  const{col,dir}=s.sorts||{};
  if(col){
    list.sort((a,b)=>{
      if(!a.fromMobic&&b.fromMobic)return 1;if(a.fromMobic&&!b.fromMobic)return -1;
      let va=a[col],vb=b[col];
      if(va===null||va===undefined)va=dir==='asc'?Infinity:-Infinity;
      if(vb===null||vb===undefined)vb=dir==='asc'?Infinity:-Infinity;
      if(typeof va==='string')return dir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
      return dir==='asc'?va-vb:vb-va;
    });
  }
  renderTable(shop,list);
  updateTagFilterBar(shop);
  updateSuggChip(shop);
}
function setSort(shop,col,dir){state[shop].sorts={col,dir};applyFilters(shop);}
function setColFilter(shop,col,type,val){
  if(!state[shop].filters)state[shop].filters={};
  if(val===''||val===null)delete state[shop].filters[col];
  else state[shop].filters[col]={type,val};
  applyFilters(shop);
}
function clearColFilter(shop,col){delete(state[shop].filters||{})[col];state[shop].sorts={};applyFilters(shop);}
function applyFpNum(shop,col,sid){
  const minEl=document.getElementById('fp-min-'+sid);
  const maxEl=document.getElementById('fp-max-'+sid);
  console.log('[applyFpNum]',shop,col,sid,'minEl=',minEl,'maxEl=',maxEl);
  const min=minEl?.value??'';
  const max=maxEl?.value??'';
  console.log('[applyFpNum] min=',min,'max=',max);
  if(!state[shop].filters)state[shop].filters={};
  if(min===''&&max===''){delete state[shop].filters[col];}
  else state[shop].filters[col]={type:'range',min:min===''?null:parseFloat(min),max:max===''?null:parseFloat(max)};
  console.log('[applyFpNum] filter set=',JSON.stringify(state[shop].filters[col]));
  applyFilters(shop);
}
function applyFpTxt(shop,col,sid){
  const val=document.getElementById('fp-txt-'+sid)?.value??'';
  if(!state[shop].filters)state[shop].filters={};
  if(val==='')delete state[shop].filters[col];
  else state[shop].filters[col]={type:'text',val};
  applyFilters(shop);
}

// ── Filter Popup ──
function openFilter(shop,col,isNum,el){
  closePopup();
  const s=state[shop];const cf=s.filters?.[col];const cs=s.sorts;
  const p=document.createElement('div');
  const isLeft=el.closest('th.tl');
  p.className='filter-popup open'+(isLeft?' tl':'');
  const minV=cf?.type==='range'?cf.min??'':cf?.type==='min'?cf.val:'';
  const maxV=cf?.type==='range'?cf.max??'':cf?.type==='max'?cf.val:'';
  const sid=shop+'__'+col;
  if(isNum){
    p.innerHTML=`<div class="filter-popup-title">篩選範圍</div>
      <label class="fp-label">最小值</label>
      <input type="number" id="fp-min-${sid}" placeholder="不限" value="${minV}" style="margin-bottom:8px">
      <label class="fp-label">最大值</label>
      <input type="number" id="fp-max-${sid}" placeholder="不限" value="${maxV}" style="margin-bottom:6px">
      <div class="fp-sort-row">
        <button class="fp-sort-btn ${cs?.col===col&&cs?.dir==='asc'?'on':''}" onclick="setSort('${shop}','${col}','asc')">↑ 小到大</button>
        <button class="fp-sort-btn ${cs?.col===col&&cs?.dir==='desc'?'on':''}" onclick="setSort('${shop}','${col}','desc')">↓ 大到小</button>
      </div>
      <div class="fp-confirm-row">
        <button class="fp-clear2" onclick="clearColFilter('${shop}','${col}');closePopup()">✕ 清除</button>
        <button class="fp-confirm" onclick="applyFpNum('${shop}','${col}','${sid}');closePopup()">確定</button>
      </div>`;
  }else{
    p.innerHTML=`<div class="filter-popup-title">篩選文字</div>
      <input type="text" id="fp-txt-${sid}" placeholder="輸入關鍵字…" value="${cf?.val||''}" style="margin-bottom:6px">
      <div class="fp-sort-row">
        <button class="fp-sort-btn ${cs?.col===col&&cs?.dir==='asc'?'on':''}" onclick="setSort('${shop}','${col}','asc')">↑ A→Z</button>
        <button class="fp-sort-btn ${cs?.col===col&&cs?.dir==='desc'?'on':''}" onclick="setSort('${shop}','${col}','desc')">↓ Z→A</button>
      </div>
      <div class="fp-confirm-row">
        <button class="fp-clear2" onclick="clearColFilter('${shop}','${col}');closePopup()">✕ 清除</button>
        <button class="fp-confirm" onclick="applyFpTxt('${shop}','${col}','${sid}');closePopup()">確定</button>
      </div>`;
  }
  el.closest('th').style.position='relative';
  el.closest('th').appendChild(p);
  openPopup=p;
  setTimeout(()=>{const inp=p.querySelector('input');if(inp)inp.focus();document.addEventListener('mousedown',outsideClick);},0);
}
function outsideClick(e){if(openPopup&&!openPopup.contains(e.target)){closePopup();}}
function closePopup(){if(openPopup){openPopup.remove();openPopup=null;document.removeEventListener('mousedown',outsideClick);}}

// ── Edit overrides: edits[shop][code][col] = value, notes[shop][code] = text ──
// 雲端優先：寫入時同時存本地與雲端；讀取時優先用雲端 Store._mem
function getEdits(shop){
  const k='ec_edits|'+shop;
  try{ if(typeof Store!='undefined' && Store._profitMem && Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!='undefined' && Store._mem && Store._mem[k]) return Store._mem[k]; }catch{}
  try{return JSON.parse(localStorage.getItem(k)||'{}');}catch{return{};}
}
function saveEdits(shop,edits){
  window._shopJustSaved=Date.now();
  const k='ec_edits|'+shop;
  try{localStorage.setItem(k,JSON.stringify(edits));}catch{}
  try{if(typeof Store!=='undefined'&&Store._profitMem)Store._profitMem[k]=edits;}catch{}
  _showSyncBtn(shop);
}
function getNotes(shop){
  const k='ec_notes|'+shop;
  // 統一把舊版字串備註遷移成 {adjustments:[{date:'',text}]} 結構
  const migrate=(raw)=>{
    Object.keys(raw||{}).forEach(c=>{ if(typeof raw[c]==='string') raw[c]={adjustments:[{date:'',text:raw[c]}]}; });
    return raw||{};
  };
  try{ if(typeof Store!='undefined' && Store._profitMem && Store._profitMem[k]) return migrate(JSON.parse(JSON.stringify(Store._profitMem[k]))); }catch{}
  try{ if(typeof Store!='undefined' && Store._mem && Store._mem[k]) return migrate(JSON.parse(JSON.stringify(Store._mem[k]))); }catch{}
  try{ return migrate(JSON.parse(localStorage.getItem(k)||'{}')); }catch{return{};}
}
function saveNotes(shop,notes){
  window._shopJustSaved=Date.now();
  const k='ec_notes|'+shop;
  try{localStorage.setItem(k,JSON.stringify(notes));}catch{}
  try{if(typeof Store!=='undefined'&&Store._profitMem)Store._profitMem[k]=notes;}catch{}
  _showSyncBtn(shop);
  // 立即同步工作日誌摘要（不必等按 ☁ 同步雲端；silent 不顯示 toast 避免太吵）
  try{ if(window.App && typeof App._updateDailyProgressFromAdjustments==='function') App._updateDailyProgressFromAdjustments({silent:true}); }catch{}
}
function buildNoteCell(shopKey,code,noteId,noteData){
  let adjList=[];
  if(noteData){if(typeof noteData==='string')adjList=[{date:'',text:noteData}];else adjList=noteData.adjustments||[];}
  const adjMap=new Map();
  adjList.forEach(a=>{const d=a.date||'';if(!adjMap.has(d))adjMap.set(d,[]);adjMap.get(d).push(a.text||'');});
  const sorted=[...adjMap.keys()].filter(d=>d).sort((a,b)=>b.localeCompare(a));
  const noDateItems=adjMap.get('')||[];
  const hoverLines=sorted.map(d=>`${d}　${adjMap.get(d).join('、')}`);
  if(noDateItems.length)hoverLines.push(...noDateItems);
  const hoverText=hoverLines.join('\n');
  const latestDate=sorted[0]||'';
  const latestText=latestDate?adjMap.get(latestDate).join('、'):(noDateItems[0]||'');
  const hasNote=!!latestText;
  const bg=hasNote?'#fef3c7':'';const hBg=hasNote?'#fde68a':'#f3f4f6';
  const ce=code.replace(/'/g,"\\'");
  const ht=hoverText.replace(/"/g,'&quot;').replace(/</g,'&lt;');
  return`<td class="tl" style="padding:4px 8px;vertical-align:top">
    <div class="note-adj-cell" id="${noteId}" title="${ht}" style="background:${bg}"
      onmouseover="this.style.background='${hBg}'" onmouseout="this.style.background='${bg}'"
      onclick="openNotePopup('${shopKey}','${ce}')">
      ${hasNote?`<div style="flex:1;min-width:0">${latestDate?`<div class="note-adj-date">${latestDate}</div>`:''}<div class="note-adj-text">${latestText.replace(/</g,'&lt;')}</div></div><span style="font-size:13px;flex-shrink:0;margin-top:1px">📝</span>`
      :`<div style="flex:1;color:#9ca3af;font-size:11px;padding:2px 0">點此新增</div><span style="font-size:13px;flex-shrink:0">📝</span>`}
    </div>
  </td>`;
}

// 開始編輯數字
let _adsEditPending=null;
const _editedAt={}; // shop → timestamp，edit 後 2s 內阻擋 loadIntoUI 重渲染
function startEdit(shop,code,col,tdId){
  const r=state[shop]._built.find(x=>x.code===code);if(!r)return;
  const edits=getEdits(shop);
  const cur=(edits[code]?.[col]!==undefined)?edits[code][col]:r[col];
  _adsEditPending={shop,code,col,tdId};
  document.getElementById('ads-edit-product').textContent=r.name+' ('+r.code+')';
  document.getElementById('ads-edit-current').textContent=fmtAds(r.adsFee);
  const inp=document.getElementById('ads-edit-input');
  inp.value=isFinite(cur)?+cur.toFixed(0):'';
  updateAdsEditPreview();
  document.getElementById('ads-edit-overlay').classList.add('open');
  setTimeout(()=>{inp.focus();inp.select();},80);
}
function updateAdsEditPreview(){
  if(!_adsEditPending)return;
  const{shop,code}=_adsEditPending;
  const r=state[shop]._built.find(x=>x.code===code);if(!r)return;
  const newAds=parseFloat(document.getElementById('ads-edit-input').value);
  const el=document.getElementById('ads-edit-preview');
  if(isNaN(newAds)){el.innerHTML='';return;}
  const PLATFORM=getPlatformRate();
  const newPure=r.gross-newAds-(r.rev*PLATFORM);
  const newPureRate=r.rev>0?newPure/r.rev*100:0;
  const col=newPure>=0?'#10b981':'#ef4444';
  el.innerHTML=`修改後：純利 <strong style="color:${col}">$${fmtN(newPure)}</strong>　純利率 <strong style="color:${col}">${newPureRate.toFixed(1)}%</strong>`;
}
function confirmAdsEdit(){
  if(!_adsEditPending)return;
  const{shop,code,col,tdId}=_adsEditPending;
  const val=document.getElementById('ads-edit-input').value;
  closeAdsEditModal();
  _editedAt[shop]=Date.now(); // 記錄 edit 時間，阻擋後續 loadIntoUI 重渲染
  commitEdit(shop,code,col,val,tdId);
  // 若被 async 重渲染跳回總表，才介入修正（已正確則不動 DOM 避免閃爍）
  const stayOnShop=()=>{
    const target=document.getElementById('content-'+shop);
    if(!target)return;
    if(target.classList.contains('active')&&curShop===shop)return; // 已正確，不動
    curShop=shop;
    document.querySelectorAll('.shop-content').forEach(el=>el.classList.remove('active'));
    target.classList.add('active');
    const kpi=document.getElementById('header-kpi-row');if(kpi)kpi.style.display='flex';
    const wrapRow=document.getElementById('profit-period-wrap-row');if(wrapRow)wrapRow.style.display='flex';
    const periodEl=document.getElementById('period-row-'+shop);if(periodEl)periodEl.style.display='flex';
    SHOPS.forEach(s=>{if(s.id!==shop){const el=document.getElementById('period-row-'+s.id);if(el)el.style.display='none';}});
    document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
    const shopBtn=document.querySelector(`button[onclick*="setShop('${shop}'"]`);if(shopBtn)shopBtn.classList.add('active');
  };
  [50,200,500].forEach(t=>setTimeout(stayOnShop,t));
}
function closeAdsEditModal(){
  document.getElementById('ads-edit-overlay')?.classList.remove('open');
  _adsEditPending=null;
}

function commitEdit(shop,code,col,val,tdId){
  const edits=getEdits(shop);
  if(!edits[code])edits[code]={};
  const numVal=parseFloat(val);
  if(!isNaN(numVal)){edits[code][col]=numVal;}else{delete edits[code][col];}
  saveEdits(shop,edits);
  recalcRow(shop,code,edits[code]||{});
  // adsFee 只更新有變動的 cell，避免整張表重渲染造成閃爍
  if(col==='adsFee'){patchRow(shop,code,edits[code]||{});}
  else{applyFilters(shop);}
}

function patchRow(shop,code,ov){
  const r=state[shop]._built.find(x=>x.code===code);if(!r)return;
  const edited=ov.adsFee!==undefined;
  // adsFee cell
  const adsEl=document.getElementById(`td-${shop}-${code}-adsFee`);
  if(adsEl){
    adsEl.querySelector('.cell-val').textContent=fmtAds(r.adsFee);
    adsEl.className=`td-num td-amber ${edited?'cell-edited':''} `.trim();
    adsEl.style.cursor='pointer';
  }
  // pureProfit
  const pureEl=document.getElementById(`td-${shop}-${code}-pureProfit`);
  if(pureEl){pureEl.textContent='$'+fmtN(r.pureProfit);pureEl.className='td-num '+(r.pureProfit>=0?'td-pos':'td-neg');}
  // pureRate
  const rateEl=document.getElementById(`td-${shop}-${code}-pureRate`);
  if(rateEl)rateEl.innerHTML=pill(r.pureRate*100);
  // adsPct
  const pctEl=document.getElementById(`td-${shop}-${code}-adsPct`);
  if(pctEl)pctEl.textContent=(r.adsPct*100).toFixed(2)+'%';
  // targetROI
  const roiEl=document.getElementById(`td-${shop}-${code}-targetROI`);
  if(roiEl)roiEl.textContent=r.targetROI!==null?r.targetROI.toFixed(2):'—';
  // roiDiff
  const diffEl=document.getElementById(`td-${shop}-${code}-roiDiff`);
  if(diffEl)diffEl.innerHTML=r.roiDiff===null?'—':`<span style="color:${r.roiDiff>=0?'#10b981':'#ef4444'};font-weight:600">${r.roiDiff.toFixed(2)}</span>`;
  // dayBudget
  const budEl=document.getElementById(`td-${shop}-${code}-dayBudget`);
  if(budEl)budEl.textContent=r.dayBudget>0?'$'+fmtN(r.dayBudget):'—';
  // analysis
  const anaEl=document.getElementById(`td-${shop}-${code}-analysis`);
  if(anaEl){const a=r.analysis||{};anaEl.innerHTML=a.label?`<span class="tag ${a.cls}">${a.label}</span>`:'—';}
  // KPI 小計列
  syncHeaderKpis(shop);
}

function recalcRow(shop,code,ov){
  const built=state[shop]._built;const idx=built.findIndex(r=>r.code===code);if(idx<0)return;
  const r=built[idx];const PLATFORM=getPlatformRate();
  // 只有廣告費可以編輯，重算相關衍生欄位
  const adsFee=ov.adsFee!==undefined?ov.adsFee:r.adsFee;
  const rev=r.rev;const gross=r.gross;
  const platFee=rev*PLATFORM;
  const pureProfit=gross-adsFee-platFee;
  const pureRate=rev>0?pureProfit/rev:0;
  const adsPct=rev>0?adsFee/rev:0;
  const denom=pureRate+adsPct-0.20;
  const targetROI=denom>0?1/denom:null;
  const directROI=r.directROI;
  const days=state[shop]._days||1;
  const dayBudget=adsFee/days;
  const roiDiff=(targetROI!==null&&directROI>0)?directROI-targetROI:null;
  const analysis=calcAnalysis(adsFee,pureRate,targetROI,roiDiff,r.clicks,pureProfit,r.roi);
  const testTags=calcTestTags(adsFee,pureRate,targetROI,roiDiff,r.clicks,pureProfit,r.roi);
  const growthRate=r.growthRate;
  const growthAnalysis=shop==='好麻吉'?calcGrowthAnalysis(growthRate,rev,r.prevRev,pureRate):null;
  Object.assign(built[idx],{adsFee,platFee,pureProfit,pureRate,adsPct,targetROI,roiDiff,dayBudget,analysis,testTags,growthAnalysis});
  const s=state[shop];lsSave(shop,s.curMonth,s.curHalf,built,s._period,s._days);
}

// ── 建議（併入測試標籤，統一由 r.testTags 驅動，不再獨立維護一套規則）──
// 完成判定：只看「廣告調整」欄位有沒有打字（r.note 或使用者備註），
// 打了字就算完成，不用另外點擊標記。
function isSuggDone(shop,code){
  const s=state[shop];if(!s)return false;
  const noteKey=shop+'|'+s.curMonth+'|'+s.curHalf;
  const notes=getNotes(noteKey);
  const nd=notes[code];
  const hasEdited=nd&&(typeof nd==='string'?!!nd.trim():!!(nd.adjustments||[]).length);
  if(hasEdited)return true;
  const r=s._built?.find(x=>x.code===code);
  return !!(r&&r.note&&String(r.note).trim());
}
function testRuleStats(shop,rule){
  const built=state[shop]?._built||[];
  const matched=built.filter(r=>r.testTags?.some(tt=>tt.label===rule.label));
  const total=matched.length;
  const done=matched.filter(r=>isSuggDone(shop,r.code)).length;
  return{total,done};
}
function buildSuggCell(shop,r){
  if(!r.testTags?.length)return`<td class="tl" style="color:#d1d5db">—</td>`;
  const codeEsc=r.code.replace(/'/g,"\\'");
  const s=state[shop];const noteKey=shop+'|'+s.curMonth+'|'+s.curHalf;
  if(isSuggDone(shop,r.code)){
    return`<td class="tl"><span class="tag sugg-tag sugg-done" onclick="openNotePopup('${noteKey}','${codeEsc}')" title="點擊查看/編輯廣告調整">✓ 已優化</span></td>`;
  }
  const tagsHtml=r.testTags.map(tt=>`<span class="tag sugg-tag ${tt.cls}" onclick="openNotePopup('${noteKey}','${codeEsc}')" title="點擊填寫廣告調整，即算完成">${tt.label}</span>`).join(' ');
  return`<td class="tl">${tagsHtml}</td>`;
}
function updateSuggChip(shop){
  const s=state[shop];const chip=document.getElementById('sugg-chip-'+shop);if(!chip)return;
  if(s?.suggFilterActive){
    chip.style.display='flex';
    const n=(s._built||[]).filter(r=>r.testTags?.length).length;
    document.getElementById('sugg-chip-text-'+shop).textContent='已篩選：僅顯示 '+n+' 項符合建議規則的商品';
  }else{chip.style.display='none';}
}
function applySuggFilter(shop){
  const s=state[shop];if(!s)return;
  s.suggFilterActive=!s.suggFilterActive;
  applyFilters(shop);
}
function clearSuggFilter(shop){
  const s=state[shop];if(!s)return;
  s.suggFilterActive=false;
  applyFilters(shop);
}

// ── Suggestion alert popup（產生報表後跳出）──
let _suggAlertRows=null;
let _suggAlertShop=null;
function checkSuggAlert(shop,built){
  const matched=(built||[]).filter(r=>r.testTags?.length);
  const unresolved=matched.filter(r=>!isSuggDone(shop,r.code));
  if(!unresolved.length)return;
  _suggAlertRows=matched;_suggAlertShop=shop;
  let ov=document.getElementById('sugg-alert-overlay');
  if(!ov){
    ov=document.createElement('div');ov.id='sugg-alert-overlay';ov.className='ana-overlay';
    ov.innerHTML=`<div class="ana-modal" style="width:420px" onclick="event.stopPropagation()">
      <div class="ana-modal-hdr"><span class="ana-modal-title">⚠ 廣告效率提醒</span><button class="ana-modal-x" onclick="closeSuggAlert()">✕</button></div>
      <div style="padding:14px 22px;font-size:12.5px;color:#6b7280" id="sugg-alert-sub"></div>
      <div style="max-height:260px;overflow-y:auto;padding:0 22px" id="sugg-alert-list"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding:14px 22px;border-top:1px solid #e4e6ef">
        <button class="ana-cancel-btn" onclick="closeSuggAlert()">略過</button>
        <button class="ana-save-btn" onclick="gotoSuggFiltered()">前往查看</button>
      </div>
    </div>`;
    ov.onclick=closeSuggAlert;
    document.body.appendChild(ov);
  }
  renderSuggAlertList();
  ov.classList.add('open');
}
function closeSuggAlert(){document.getElementById('sugg-alert-overlay')?.classList.remove('open');}
function renderSuggAlertList(){
  const shop=_suggAlertShop;const rows=_suggAlertRows||[];
  const sub=document.getElementById('sugg-alert-sub');if(sub)sub.textContent=`「${shop}」有 ${rows.length} 項商品符合建議規則`;
  const list=document.getElementById('sugg-alert-list');if(!list)return;
  const s=state[shop];const noteKey=s?shop+'|'+s.curMonth+'|'+s.curHalf:shop;
  list.innerHTML=rows.map(r=>{
    const codeEsc=r.code.replace(/'/g,"\\'");
    const done=isSuggDone(shop,r.code);
    const tagsHtml=done
      ?`<span class="tag sugg-tag sugg-done" onclick="openNotePopup('${noteKey}','${codeEsc}')" title="點擊查看/編輯廣告調整">✓ 已優化</span>`
      :r.testTags.map(tt=>`<span class="tag sugg-tag ${tt.cls}" onclick="openNotePopup('${noteKey}','${codeEsc}')" title="點擊填寫廣告調整，即算完成">${tt.label}</span>`).join(' ');
    return`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid #f3f4f6">
      <span style="font-size:13px">${r.name}</span>
      <span style="display:flex;align-items:center;gap:10px">
        <span style="font-size:12px;color:#6b7280;font-family:monospace">點擊 ${r.clicks||0} · ROI ${(r.roi||0).toFixed(1)}</span>
        ${tagsHtml}
      </span>
    </div>`;
  }).join('');
}
function gotoSuggFiltered(){
  const shop=_suggAlertShop;
  closeSuggAlert();
  if(!shop)return;
  state[shop].suggFilterActive=true;
  applyFilters(shop);
  document.getElementById('tbl-'+shop)?.scrollIntoView({behavior:'smooth',block:'start'});
}

// ── Note modal ──
const PROFIT_COLS=[
  {key:'adsFee',label:'廣告費'},{key:'rev',label:'營收'},{key:'gross',label:'毛利'},
  {key:'pureProfit',label:'淨利'},{key:'pureRate',label:'淨利率%'},{key:'adsPct',label:'廣告佔比'},
  {key:'stock',label:'可用庫存'},{key:'targetROI',label:'目標ROI'},{key:'directROI',label:'直接ROI'},
  {key:'roi',label:'投入產出'},{key:'roiDiff',label:'實際-目標'},{key:'clicks',label:'點擊數'},
  {key:'dayBudget',label:'日預算'},{key:'analysisLabel',label:'分析'},{key:'note',label:'廣告調整'},
  {key:'growthRate',label:'成長比',grow:true},{key:'growthAnalysis',label:'成長分析',grow:true},{key:'growthNote',label:'商品調整',grow:true},
];
const _HCOLS_LS='ec_hcols_user';
function getHiddenCols(shop){
  try{const raw=localStorage.getItem(_HCOLS_LS);return new Set(raw?JSON.parse(raw):[]);}catch{return new Set();}
}
function toggleHiddenCol(shop,key){
  const s=getHiddenCols(shop);if(s.has(key))s.delete(key);else s.add(key);
  try{localStorage.setItem(_HCOLS_LS,JSON.stringify([...s]));}catch{}
  applyFilters(shop);renderColPicker(shop);
}

// ── 欄位順序（拖曳表頭調整，全欄共用一份順序、存 localStorage）──
const _COLORDER_LS='ec_colorder_user';
function getColOrder(){
  try{
    const raw=localStorage.getItem(_COLORDER_LS);
    const saved=raw?JSON.parse(raw):[];
    if(Array.isArray(saved)&&saved.length)return saved;
  }catch{}
  return PROFIT_COLS.map(c=>c.key);
}
function saveColOrder(order){try{localStorage.setItem(_COLORDER_LS,JSON.stringify(order));}catch{}}
function getOrderedCols(shop){
  const avail=PROFIT_COLS.filter(c=>!c.grow||shop==='好麻吉');
  const byKey=new Map(avail.map(c=>[c.key,c]));
  const order=getColOrder();
  const out=[];
  order.forEach(k=>{if(byKey.has(k)){out.push(byKey.get(k));byKey.delete(k);}});
  byKey.forEach(c=>out.push(c));
  return out;
}
let _colDrag=null;
function colDragStart(e,shop,key){
  _colDrag={shop,key};
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain',key);}catch{}
  e.currentTarget.classList.add('col-dragging');
}
function colDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';}
function colDrop(e,shop,targetKey){
  e.preventDefault();
  const th=e.currentTarget;th.classList.remove('col-drag-over');
  if(!_colDrag||_colDrag.shop!==shop||_colDrag.key===targetKey){_colDrag=null;return;}
  const rect=th.getBoundingClientRect();
  const after=(e.clientX-rect.left)>rect.width/2;
  let order=getColOrder().filter(k=>k!==_colDrag.key);
  let idx=order.indexOf(targetKey);
  if(idx<0)idx=order.length;else if(after)idx++;
  order.splice(idx,0,_colDrag.key);
  saveColOrder(order);
  _colDrag=null;
  applyFilters(shop);
  renderColPicker(shop);
}
function colDragEnd(e){e.currentTarget.classList.remove('col-dragging');document.querySelectorAll('.col-drag-over').forEach(el=>el.classList.remove('col-drag-over'));}
function colDragEnter(e){e.preventDefault();e.currentTarget.classList.add('col-drag-over');}
function colDragLeave(e){e.currentTarget.classList.remove('col-drag-over');}
function resetColOrder(shop){try{localStorage.removeItem(_COLORDER_LS);}catch{}applyFilters(shop);renderColPicker(shop);}

// 欄位選單裡也能直接拖曳排序（不用跑去拖表頭），跟表頭拖曳共用同一份 getColOrder/saveColOrder，
// 兩邊拖曳結果互通——這樣要把最後一欄搬到最前面，在這個直向清單裡拖一下就好，不用在寬表格上橫向拖半天。
let _cpRowDrag=null;
function cpRowDragStart(e,shop,key){
  _cpRowDrag={shop,key};
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain',key);}catch{}
  e.currentTarget.classList.add('cp-row-dragging');
}
function cpRowDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';}
function cpRowDragEnter(e){e.preventDefault();e.currentTarget.classList.add('cp-row-drag-over');}
function cpRowDragLeave(e){e.currentTarget.classList.remove('cp-row-drag-over');}
function cpRowDrop(e,shop,targetKey){
  e.preventDefault();
  const row=e.currentTarget;row.classList.remove('cp-row-drag-over');
  if(!_cpRowDrag||_cpRowDrag.shop!==shop||_cpRowDrag.key===targetKey){_cpRowDrag=null;return;}
  const rect=row.getBoundingClientRect();
  const after=(e.clientY-rect.top)>rect.height/2;
  let order=getColOrder().filter(k=>k!==_cpRowDrag.key);
  let idx=order.indexOf(targetKey);
  if(idx<0)idx=order.length;else if(after)idx++;
  order.splice(idx,0,_cpRowDrag.key);
  saveColOrder(order);
  _cpRowDrag=null;
  applyFilters(shop);
  renderColPicker(shop);
}
function cpRowDragEnd(e){e.currentTarget.classList.remove('cp-row-dragging');document.querySelectorAll('.cp-row-drag-over').forEach(el=>el.classList.remove('cp-row-drag-over'));}

function renderColPicker(shop){
  const m=document.getElementById('colpick-'+shop);if(!m)return;
  const hc=getHiddenCols(shop);
  const cols=getOrderedCols(shop);
  const vis=cols.length-hc.size;
  m.innerHTML=`<div style="padding:6px 13px 4px;font-size:11px;color:#9ca3af;font-weight:700;display:flex;justify-content:space-between;align-items:center">欄位 <span>${vis}/${cols.length}</span></div>`
    +cols.map(c=>`<div class="cp-row" draggable="true"
      ondragstart="cpRowDragStart(event,'${shop}','${c.key}')" ondragover="cpRowDragOver(event)"
      ondragenter="cpRowDragEnter(event)" ondragleave="cpRowDragLeave(event)"
      ondrop="cpRowDrop(event,'${shop}','${c.key}')" ondragend="cpRowDragEnd(event)"
      onclick="toggleHiddenCol('${shop}','${c.key}');event.stopPropagation()">
      <span class="cp-row-handle">⠿</span>
      <input type="checkbox" ${!hc.has(c.key)?'checked':''} style="margin:0;pointer-events:none"> ${c.label}
    </div>`).join('')
    +`<div style="padding:4px 13px 6px;border-top:1px solid #e5e7eb;text-align:right;display:flex;gap:10px;justify-content:flex-end">
      <button onclick="resetColOrder('${shop}')" style="font-size:11px;color:#5b5fcf;background:none;border:none;cursor:pointer;font-weight:600">重設順序</button>
      <button onclick="resetHiddenCols('${shop}')" style="font-size:11px;color:#5b5fcf;background:none;border:none;cursor:pointer;font-weight:600">顯示全部</button>
    </div>`;
}
function resetHiddenCols(shop){try{localStorage.removeItem(_HCOLS_LS);}catch{}applyFilters(shop);renderColPicker(shop);}
function openColPicker(shop,btn){
  let m=document.getElementById('colpick-'+shop);
  if(m){m.remove();return;}
  m=document.createElement('div');m.id='colpick-'+shop;m.className='col-picker-menu open';
  const wrap=btn?.closest('.col-picker-wrap');
  (wrap||btn?.parentElement||document.body).appendChild(m);
  renderColPicker(shop);
  setTimeout(()=>document.addEventListener('click',function h(e){if(!m.contains(e.target)){m.remove();document.removeEventListener('click',h);}},{},true),0);
}

let _pnm=null;
function openNotePopup(shopKey,code){
  _pnm={shopKey,code};
  let modal=document.getElementById('profit-note-modal');
  if(!modal){
    modal=document.createElement('div');modal.id='profit-note-modal';modal.className='pnm-overlay';
    modal.innerHTML=`<div class="pnm-box" onclick="event.stopPropagation()">
      <div class="pnm-header"><div class="pnm-title" id="pnm-title"></div><button class="pnm-close" onclick="closeProfitNoteModal()">×</button></div>
      <div class="pnm-body">
        <div class="pnm-section">調整紀錄（按 Enter 或「送出」新增，自動加日期・自動儲存）</div>
        <div class="pnm-input-row"><input id="pnm-inp" class="pnm-inp" type="text" placeholder="例：調整主圖 / 加強廣告預算 +500"><button class="pnm-send" onclick="submitProfitNote()">送出</button></div>
        <div id="pnm-list" class="pnm-list"></div>
      </div>
      <div class="pnm-footer"><button class="pnm-close-btn" onclick="closeProfitNoteModal()">關閉</button></div>
    </div>`;
    modal.onclick=closeProfitNoteModal;
    document.body.appendChild(modal);
    document.getElementById('pnm-inp').onkeydown=e=>{if(e.key==='Enter')submitProfitNote();if(e.key==='Escape')closeProfitNoteModal();};
  }
  const baseShop=shopKey.split('|')[0].replace('_growth','');
  const r=state[baseShop]?._built?.find(x=>x.code===code);
  document.getElementById('pnm-title').textContent=r?`${code}・${r.name}`:code;
  const pnmInp=document.getElementById('pnm-inp');if(pnmInp)pnmInp.value='';
  renderPnmList();
  modal.classList.add('open');
  setTimeout(()=>pnmInp?.focus(),60);
}
function renderPnmList(){
  if(!_pnm)return;
  const {shopKey,code}=_pnm;
  const notes=getNotes(shopKey);const nd=notes[code];
  let adj=[];
  if(nd){if(typeof nd==='string')adj=[{date:'',text:nd}];else adj=nd.adjustments||[];}
  const el=document.getElementById('pnm-list');if(!el)return;
  if(!adj.length){el.innerHTML='<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px">尚無調整紀錄</div>';return;}
  const map=new Map();
  adj.forEach((a,i)=>{const d=a.date||'—';if(!map.has(d))map.set(d,[]);map.get(d).push({text:a.text,i});});
  const sorted=[...map.keys()].sort((a,b)=>b.localeCompare(a));
  el.innerHTML=sorted.map(d=>map.get(d).map(({text,i})=>`<div class="pnm-entry">
    <div class="pnm-entry-date">${d}</div>
    <div class="pnm-entry-text">${text.replace(/</g,'&lt;')}</div>
    <button class="pnm-entry-del" onclick="deleteProfitNote(${i})">×</button>
  </div>`).join('')).join('');
}
function submitProfitNote(){
  if(!_pnm)return;
  const inp=document.getElementById('pnm-inp');const v=inp?.value.trim();if(!v)return;
  const {shopKey,code}=_pnm;
  const now=new Date();
  const today=`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
  const notes=getNotes(shopKey);
  if(!notes[code])notes[code]={adjustments:[]};
  if(typeof notes[code]==='string')notes[code]={adjustments:[{date:'',text:notes[code]}]};
  notes[code].adjustments.push({date:today,text:v});
  saveNotes(shopKey,notes);
  closeProfitNoteModal();
  const shop=shopKey.split('|')[0].replace('_growth','');
  applyFilters(shop);
}
function deleteProfitNote(origIdx){
  if(!_pnm)return;
  const {shopKey,code}=_pnm;
  const notes=getNotes(shopKey);if(!notes[code])return;
  if(typeof notes[code]==='string')notes[code]={adjustments:[{date:'',text:notes[code]}]};
  notes[code].adjustments.splice(origIdx,1);
  if(!notes[code].adjustments.length)delete notes[code];
  saveNotes(shopKey,notes);renderPnmList();applyFilters(shopKey.split('|')[0].replace('_growth',''));
}
function closeProfitNoteModal(){document.getElementById('profit-note-modal')?.classList.remove('open');_pnm=null;}
function startNote(shop,code){openNotePopup(shop,code);}
function commitNote(){}

// ── Render Table ──
function renderTable(shop,list){
  const s=state[shop];const built=s._built;
  const edits=getEdits(shop);
  const noteKey=shop+'|'+s.curMonth+'|'+s.curHalf;
  const notes=getNotes(noteKey);
  let tRev=0,tGross=0,tAds=0,tPure=0;
  const kpiSrc=list;
  kpiSrc.forEach(r=>{tRev+=r.rev;tGross+=r.gross;tAds+=r.adsFee;tPure+=r.pureProfit;});
  const extra=state[shop]?._extraAdsFee||0;
  tAds+=extra;tPure-=extra;
  setKpis(shop,tRev,tGross,tAds,tPure);
  document.getElementById('period-tag-'+shop).textContent=s._period||'';
  document.getElementById('cnt-'+shop).textContent=list.length+' 筆';

  const ss=s.sorts||{};
  const si=(col)=>ss.col===col?(ss.dir==='asc'?' ▲':' ▼'):'';
  const hasF=(col)=>!!(s.filters?.[col])||ss.col===col;
  const thN=(col,label,attrs='')=>`<th ${attrs}><div class="th-wrap"><span onclick="setSort('${shop}','${col}',ss.col==='${col}'&&ss.dir==='asc'?'desc':'asc')" style="cursor:pointer">${label}${si(col)}</span><button class="filter-btn ${hasF(col)?'on':''}" onclick="event.stopPropagation();openFilter('${shop}','${col}',true,this)">▾</button></div></th>`;
  const thT=(col,label,sticky='',attrs='')=>`<th class="tl" style="${sticky}" ${attrs}><div class="th-wrap tl"><span onclick="setSort('${shop}','${col}',ss.col==='${col}'&&ss.dir==='asc'?'desc':'asc')" style="cursor:pointer">${label}${si(col)}</span><button class="filter-btn ${hasF(col)?'on':''}" onclick="event.stopPropagation();openFilter('${shop}','${col}',false,this)">▾</button></div></th>`;

  const hc=getHiddenCols(shop);const vc=k=>!hc.has(k);
  const orderedCols=getOrderedCols(shop).filter(c=>vc(c.key));
  // 拖曳表頭調整欄位順序：拖曳來源/目標都用 data-colkey 標記的欄位鍵
  const dragAttrs=(key)=>`draggable="true" ondragstart="colDragStart(event,'${shop}','${key}')" ondragover="colDragOver(event)" ondragenter="colDragEnter(event)" ondragleave="colDragLeave(event)" ondrop="colDrop(event,'${shop}','${key}')" ondragend="colDragEnd(event)"`;
  const HEADER_LABEL={
    adsFee:'廣告費', rev:shop==='好麻吉'?'營收 / 上半月':'營收', gross:'毛利', pureProfit:'淨利',
    pureRate:'淨利率%', adsPct:'廣告佔比', stock:'可用庫存', targetROI:'目標ROI', directROI:'直接ROI',
    roi:'投入產出', roiDiff:'實際-目標', clicks:'點擊數', dayBudget:'日預算',
    analysisLabel:'分析', note:'廣告調整',
    growthRate:'成長比', growthAnalysis:'成長分析', growthNote:'商品調整',
  };
  const buildColHeader=(c)=>{
    const attrs=dragAttrs(c.key);
    if(c.key==='note'||c.key==='growthNote')return `<th class="tl" ${attrs}>${HEADER_LABEL[c.key]}</th>`;
    if(c.key==='analysisLabel')return thT('analysisLabel',HEADER_LABEL.analysisLabel,'',attrs);
    if(c.key==='growthAnalysis')return thT('growthAnalysisLabel',HEADER_LABEL.growthAnalysis,'',attrs);
    return thN(c.key,HEADER_LABEL[c.key],attrs);
  };
  let html=`<div class="tscroll"><table><thead><tr>
    ${thT('code','編號','position:sticky;left:0;z-index:4;background:#f8f9fc')}
    ${thT('name','名稱 / ID','position:sticky;left:60px;z-index:4;background:#f8f9fc')}
    ${orderedCols.map(buildColHeader).join('')}
    <th class="tl">建議</th>
  </tr></thead><tbody>`;

  let rowIdx=0;
  list.forEach(r=>{
    const pc=r.pureProfit>=0?'td-pos':'td-neg';
    const ov=edits[r.code]||{};
    const isEdited=(col)=>ov[col]!==undefined;
    const idStr=!r.shopeeIds?.length?'<span style="color:#d1d5db">—</span>':r.shopeeIds.length===1?r.shopeeIds[0]:'<span style="color:#f59e0b">多個</span>';
    const roiDiffStr=r.roiDiff===null?'—':`<span style="color:${r.roiDiff>=0?'#10b981':'#ef4444'};font-weight:600">${r.roiDiff.toFixed(2)}</span>`;
    const anaObj=r.analysis||{label:'',cls:''};
    const anaHtml=anaObj.label?`<span class="tag ${anaObj.cls}">${anaObj.label}</span>`:'—';
    const noteId=`note-${shop}-${r.code}`;

    // 可編輯數字欄 helper
    const editTd=(col,display,cls='')=>{
      const tid=`td-${shop}-${r.code}-${col}`;
      const edited=isEdited(col);
      return `<td class="td-num ${cls} ${edited?'cell-edited':''}" id="${tid}" onclick="startEdit('${shop}','${r.code}','${col}','${tid}')" style="cursor:pointer" title="點擊編輯">
        <span class="cell-val">${display}</span>
      </td>`;
    };

    const gnoteId=`gnote-${shop}-${r.code}`;
    const noteCellHtml=buildNoteCell(noteKey,r.code,noteId,(()=>{const ec=notes[r.code];const rn=r.note?{adjustments:[{date:'',text:r.note}]}:null;if(ec&&rn){return{adjustments:[...rn.adjustments,...(ec.adjustments||[])]}}return ec||rn;})());

    if(!r.fromMobic){
      const adsId=`td-${shop}-${r.code}-adsFee`;
      const MOBIC_BLANK=new Set(['growthRate','growthAnalysis']);
      const mobicCell={
        adsFee:`<td class="td-num td-amber ${isEdited('adsFee')?'cell-edited':''}" id="${adsId}" onclick="startEdit('${shop}','${r.code}','adsFee','${adsId}')" style="cursor:pointer" title="點擊編輯"><span class="cell-val">${fmtAds(r.adsFee)}</span></td>`,
        pureProfit:`<td id="td-${shop}-${r.code}-pureProfit" class="td-num ${pc}">$${fmtN(r.pureProfit)}</td>`,
        note:noteCellHtml,
        growthNote:shop==='好麻吉'?buildNoteCell(shop+'_growth',r.code,gnoteId,getNotes(shop+'_growth')[r.code]):'',
      };
      const bodyCells=orderedCols.map(c=>{
        if(mobicCell[c.key]!==undefined)return mobicCell[c.key];
        if(MOBIC_BLANK.has(c.key))return '<td></td>';
        return '<td style="color:#d1d5db;text-align:center;font-size:12px">—</td>';
      }).join('');
      html+=`<tr class="tr-no-rev">
        <td class="tl td-code" style="position:sticky;left:0;background:#fff;z-index:2">${r.code}</td>
        <td class="tl td-name" style="position:sticky;left:60px;background:#fff;z-index:2;color:#9ca3af">${r.name}<div class="sub-id">ID: ${idStr}</div></td>
        ${bodyCells}
        ${buildSuggCell(shop,r)}
      </tr>`;
    }else{
      const rowCell={
        adsFee:editTd('adsFee',fmtAds(r.adsFee),'td-amber'),
        rev:`<td class="td-num">$${fmtN(r.rev)}${shop==='好麻吉'?`<div class="sub-rev">${r.prevRev!==null?'上半月 $'+fmtN(r.prevRev):'—'}</div>`:''}</td>`,
        gross:`<td class="td-num">$${fmtN(r.gross)}</td>`,
        pureProfit:`<td id="td-${shop}-${r.code}-pureProfit" class="td-num ${pc}">$${fmtN(r.pureProfit)}</td>`,
        pureRate:`<td id="td-${shop}-${r.code}-pureRate">${pill(r.pureRate*100)}</td>`,
        adsPct:`<td id="td-${shop}-${r.code}-adsPct" class="td-num">${(r.adsPct*100).toFixed(2)}%</td>`,
        stock:`<td class="td-num">${r.stock.toLocaleString()}</td>`,
        targetROI:`<td id="td-${shop}-${r.code}-targetROI" class="td-num">${r.targetROI!==null?r.targetROI.toFixed(2):'—'}</td>`,
        directROI:`<td class="td-num">${r.directROI>0?r.directROI.toFixed(2):'—'}</td>`,
        roi:`<td class="td-num">${r.roi>0?r.roi.toFixed(2):'—'}</td>`,
        roiDiff:`<td id="td-${shop}-${r.code}-roiDiff" class="td-num">${roiDiffStr}</td>`,
        clicks:`<td class="td-num">${r.clicks>0?r.clicks.toLocaleString():'—'}</td>`,
        dayBudget:`<td id="td-${shop}-${r.code}-dayBudget" class="td-num">${r.dayBudget>0?'$'+fmtN(r.dayBudget):'—'}</td>`,
        analysisLabel:`<td id="td-${shop}-${r.code}-analysis" class="tl">${anaHtml}</td>`,
        note:noteCellHtml,
        growthRate:shop==='好麻吉'?`<td class="td-num" style="text-align:center">${r.growthRate===null?'<span style="color:#9ca3af">—</span>':`<span style="color:${r.growthRate>=0?'#10b981':'#ef4444'};font-weight:700">${r.growthRate>=0?'↑':'↓'} ${Math.abs(r.growthRate*100).toFixed(0)}%</span>`}</td>`:'',
        growthAnalysis:shop==='好麻吉'?`<td class="tl">${r.growthAnalysis&&r.growthAnalysis.label?`<span class="tag ${r.growthAnalysis.cls}">${r.growthAnalysis.label}</span>`:'—'}</td>`:'',
        growthNote:shop==='好麻吉'?buildNoteCell(shop+'_growth',r.code,gnoteId,getNotes(shop+'_growth')[r.code]):'',
      };
      html+=`<tr>
        <td class="tl td-code" style="position:sticky;left:0;background:#fff;z-index:2">${r.code}</td>
        <td class="tl td-name" style="position:sticky;left:60px;background:#fff;z-index:2">${r.name}<div class="sub-id">ID: ${idStr}</div></td>
        ${orderedCols.map(c=>rowCell[c.key]||'').join('')}
        ${buildSuggCell(shop,r)}
      </tr>`;
    }
    rowIdx++;
  });

  let fRev=0,fGross=0,fAds=0,fPure=0,fQty=0;
  list.forEach(r=>{fRev+=r.rev;fGross+=r.gross;fAds+=r.adsFee;fPure+=r.pureProfit;fQty+=r.qty;});
  let fPrevRev=0; list.forEach(r=>{if(r.prevRev)fPrevRev+=r.prevRev;});
  const fGrowth=(fPrevRev>0)?(fRev-fPrevRev)/fPrevRev:null;
  const totalCell={
    adsFee:`<td class="td-num td-amber">$${fmtN(fAds)}</td>`,
    rev:`<td class="td-num">$${fmtN(fRev)}${shop==='好麻吉'?`<div class="sub-rev">$${fmtN(fPrevRev)}</div>`:''}</td>`,
    gross:`<td class="td-num">$${fmtN(fGross)}</td>`,
    pureProfit:`<td class="td-num ${fPure>=0?'td-pos':'td-neg'}">$${fmtN(fPure)}</td>`,
    pureRate:`<td>${fRev>0?pill(fPure/fRev*100):'—'}</td>`,
    growthRate:shop==='好麻吉'?`<td class="td-num" style="text-align:center">${fGrowth===null?'<span style="color:#9ca3af">—</span>':`<span style="color:${fGrowth>=0?'#10b981':'#ef4444'};font-weight:700">${fGrowth>=0?'↑':'↓'} ${Math.abs(fGrowth*100).toFixed(0)}%</span>`}</td>`:'',
  };
  html+=`<tr class="tr-total">
    <td class="tl" colspan="2">小計（${list.length}筆）</td>
    ${orderedCols.map(c=>totalCell[c.key]||'<td></td>').join('')}
    <td></td>
  </tr></tbody></table></div>`;
  document.getElementById('tbl-'+shop).innerHTML=html;
}

// ── Summary ──
// ── Summary Table helpers (independent manual-entry table) ──
function getSummaryRows(){
  try{
    if(typeof Store!='undefined'&&Store._profitMem?._summary_v1)return Store._profitMem._summary_v1;
    const s=localStorage.getItem('ec_summary_v1');return s?JSON.parse(s):[];
  }catch{return [];}
}
// 多人同時編輯保護：寫入前先讀雲端最新，把 diff 疊上去再寫回
//   diff 可選：{type:'edit', rowId, shop, field, value, start, end}
//              {type:'add', row}
//              {type:'delete', rowId}
//   有 diff → fetch cloud → 套 diff → 寫回 (本地兩個人同時打不會互蓋)
//   沒 diff → 直接把 rows 整包寫回（fallback，保留舊行為）
async function saveSummaryRows(rows, diff){
  window._summaryJustSaved=Date.now();
  // 先本機立刻更新（UI 即時反映）
  try{localStorage.setItem('ec_summary_v1',JSON.stringify(rows));}catch{}
  // getSummaryRows() 讀取優先看 Store._profitMem；沒同步更新的話網路來回還沒完成、
  // 畫面就先重新 render 時會讀到舊值，看起來像數字消失了 → _mem + _profitMem 雙寫
  try{
    if(typeof Store!=='undefined'){
      if(Store._mem) Store._mem['_summary_v1']=rows;
      if(Store._profitMem) Store._profitMem['_summary_v1']=rows;
    }
  }catch{}
  // 有 diff 且雲端可連 → 讀最新版套 diff 上去（fetch-merge-write 避免多人互蓋）
  let mergedRows = rows;
  if(diff && window.__cloudProfit && typeof window.__cloudProfit.getDoc==='function'){
    try{
      const snap = await window.__cloudProfit.getDoc();
      const cloudRows = (snap.exists()? snap.data() : {})?.['_summary_v1'] || [];
      // 用 cloud 當基底，套 diff
      if(diff.type==='edit'){
        let cr = cloudRows.find(r=>r.id===diff.rowId);
        if(!cr){ cr = { id: diff.rowId, start: diff.start, end: diff.end, shops: {} }; cloudRows.push(cr); }
        cr.shops = cr.shops || {};
        cr.shops[diff.shop] = cr.shops[diff.shop] || {};
        if(diff.value != null && !isNaN(diff.value) && diff.value > 0) cr.shops[diff.shop][diff.field] = diff.value;
        else delete cr.shops[diff.shop][diff.field];
        mergedRows = cloudRows;
      } else if(diff.type==='add'){
        if(!cloudRows.find(r=>r.id===diff.row.id)) cloudRows.push(diff.row);
        cloudRows.sort((a,b)=>(a.start||'').localeCompare(b.start||''));
        mergedRows = cloudRows;
      } else if(diff.type==='delete'){
        mergedRows = cloudRows.filter(r=>r.id!==diff.rowId);
      }
      // 本機同步覆蓋成合併後版本，避免下次讀本機拿到舊資料
      try{localStorage.setItem('ec_summary_v1',JSON.stringify(mergedRows));}catch{}
      try{
        if(typeof Store!=='undefined'){
          if(Store._mem) Store._mem['_summary_v1']=mergedRows;
          if(Store._profitMem) Store._profitMem['_summary_v1']=mergedRows;
        }
      }catch{}
    }catch(e){ console.warn('[saveSummaryRows] 讀雲端合併失敗，直接寫本機版', e); }
  }
  // 推雲端（fire-and-forget，錯了跳 toast）
  try{
    if(window.__cloudProfit && typeof window.__cloudProfit.setField==='function'){
      const p = window.__cloudProfit.setField('_summary_v1', mergedRows);
      if(p && typeof p.then==='function'){
        p.catch(e=>{
          console.error('[saveSummaryRows] 雲端寫入失敗', e);
          if(typeof showToast==='function') showToast('❌ 總表雲端寫入失敗', 'error');
        });
      }
    }
  }catch(e){ console.error('[saveSummaryRows] 雲端寫入異常', e); }
}
function openAddSummaryRowModal(){
  const today=new Date();
  const fmtD=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dow=today.getDay()||7;
  const mon=new Date(today);mon.setDate(today.getDate()-dow+1);
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);
  const ov=document.createElement('div');
  ov.className='ana-overlay open';ov.style.zIndex='3000';
  ov.innerHTML=`<div class="ana-modal" style="width:320px;max-width:96vw">
    <div class="ana-modal-hdr"><span>新增週次</span><button class="ana-close-btn" onclick="this.closest('.ana-overlay').remove()">✕</button></div>
    <div class="ana-modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;flex-direction:column;gap:6px"><label style="font-size:12px;color:#6b7280;font-weight:600">開始日期</label>
        <input type="date" id="sum-add-start" value="${fmtD(mon)}" style="padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px"></div>
      <div style="display:flex;flex-direction:column;gap:6px"><label style="font-size:12px;color:#6b7280;font-weight:600">結束日期</label>
        <input type="date" id="sum-add-end" value="${fmtD(sun)}" style="padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
        <button onclick="this.closest('.ana-overlay').remove()" style="padding:8px 18px;border:1.5px solid #e5e7eb;border-radius:8px;background:white;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer">取消</button>
        <button onclick="confirmAddSummaryRow(this)" style="padding:8px 18px;border:0;border-radius:8px;background:#5b5fcf;font-size:13px;font-weight:700;color:white;cursor:pointer">新增</button>
      </div>
    </div></div>`;
  document.body.appendChild(ov);
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
}
function confirmAddSummaryRow(btn){
  const start=document.getElementById('sum-add-start').value;
  const end=document.getElementById('sum-add-end').value;
  if(!start||!end){alert('請填入日期');return;}
  if(start>end){alert('開始日期不能晚於結束日期');return;}
  const rows=getSummaryRows();
  if(rows.find(r=>r.start===start&&r.end===end)){alert('此週次已存在');return;}
  const newRow = {id:'sw_'+Date.now(),start,end,shops:{}};
  rows.push(newRow);
  rows.sort((a,b)=>a.start.localeCompare(b.start));
  // 傳 diff 讓 saveSummaryRows 疊在雲端最新版之上，避免蓋掉別人剛新增的其他週次
  saveSummaryRows(rows, { type:'add', row: newRow });
  btn.closest('.ana-overlay').remove();
  renderSummary();
}
function deleteSummaryRow(id){
  if(!confirm('確定刪除這週的資料？'))return;
  const filtered = getSummaryRows().filter(r=>r.id!==id);
  // 傳 diff 讓 saveSummaryRows 從雲端最新版扣掉這 id，避免刪除時蓋掉別人剛新增的
  saveSummaryRows(filtered, { type:'delete', rowId: id });
  renderSummary();
}
function editSummaryCell(rowId,shop,field,tdEl){
  const rows=getSummaryRows();
  const row=rows.find(r=>r.id===rowId);if(!row)return;
  if(!row.shops)row.shops={};
  if(!row.shops[shop])row.shops[shop]={};
  const curVal=row.shops[shop][field]||'';
  const origContent=tdEl.innerHTML;
  const inp=document.createElement('input');
  inp.type='number';inp.value=curVal;
  inp.style.cssText='width:80px;border:1.5px solid #5b5fcf;border-radius:4px;padding:2px 6px;font-size:12px;text-align:right;outline:none';
  tdEl.innerHTML='';tdEl.appendChild(inp);inp.focus();if(inp.value)inp.select();
  let done=false;
  const save=()=>{
    if(done)return;done=true;
    const v=parseFloat(inp.value);
    const isValid = !isNaN(v) && v > 0;
    if(isValid)row.shops[shop][field]=v;else delete row.shops[shop][field];
    // 傳 diff 讓 saveSummaryRows 能 fetch 雲端最新版 + 只疊這格改動，避免多人同時打互蓋
    saveSummaryRows(rows, { type:'edit', rowId, shop, field, value: isValid ? v : null, start: row.start, end: row.end });
    // patch cells without re-rendering
    const d=row.shops[shop]||{};
    const rate=getPlatformRate();
    const pure=(d.gross||0)-(d.ads||0)-(d.rev||0)*rate;
    const fmt=n=>fmtN(Math.round(n||0));
    const pct=(a,b)=>b>0?(a/b*100).toFixed(2)+'%':'—';
    const dash='<span style="color:#d1d5db">—</span>';
    const sid=`${rowId}__${shop}`;
    const patch=(sfx,html)=>{const el=document.getElementById('sc-'+sid+'-'+sfx);if(el)el.innerHTML=html;};
    patch('rev',d.rev?fmt(d.rev):dash);
    patch('ads',d.ads?`<span style="color:#b45309">${fmt(d.ads)}</span>`:dash);
    patch('gross',d.gross?fmt(d.gross):dash);
    const hasData=d.rev||d.gross||d.ads;
    patch('pure',hasData?`<span style="color:${pure>=0?'#059669':'#dc2626'}">${fmt(pure)}</span>`:dash);
    patch('pr',d.rev?pct(pure,d.rev):'—');
    patch('ar',(d.rev&&d.ads)?pct(d.ads,d.rev):'—');
    // restore cursor on edited cell
    tdEl.style.cursor='pointer';
  };
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}if(e.key==='Escape'){done=true;tdEl.innerHTML=origContent;}});
  inp.addEventListener('blur',save);
}

function renderSummary(){
  const el=document.getElementById('content-總表');
  if(!el)return;
  const rate=getPlatformRate();
  const isFullMonth=row=>{
    const s=new Date(row.start+'T12:00:00'),e=new Date(row.end+'T12:00:00');
    if(s.getFullYear()!==e.getFullYear()||s.getMonth()!==e.getMonth())return false;
    const lastDay=new Date(s.getFullYear(),s.getMonth()+1,0).getDate();
    return s.getDate()===1&&e.getDate()===lastDay;
  };
  const rows=getSummaryRows().slice().sort((a,b)=>{
    if(a.end!==b.end)return a.end.localeCompare(b.end);
    const af=isFullMonth(a),bf=isFullMonth(b);
    if(af!==bf)return af?1:-1;
    return a.start.localeCompare(b.start);
  });
  const fmt=n=>fmtN(Math.round(n||0));
  const pct=(a,b)=>b>0?(a/b*100).toFixed(2)+'%':'—';
  const calcPure=(d)=>(d.gross||0)-(d.ads||0)-(d.rev||0)*rate;

  const shopGroupHdr=SHOPS.map(s=>`<th colspan="6" style="text-align:center;background:${s.color};color:white;font-weight:700;font-size:13px;padding:7px 4px;border-left:2px solid rgba(255,255,255,.3)">${s.id}</th>`).join('');
  const shopSubHdr=SHOPS.map(()=>`<th style="min-width:75px;font-size:11px;font-weight:600;background:#f8fafc">營收</th><th style="min-width:62px;font-size:11px;font-weight:600;background:#f8fafc">廣告</th><th style="min-width:75px;font-size:11px;font-weight:600;background:#f8fafc">毛利</th><th style="min-width:75px;font-size:11px;font-weight:600;background:#f8fafc">純利</th><th style="min-width:58px;font-size:11px;font-weight:600;background:#f8fafc">純利率%</th><th style="min-width:58px;font-size:11px;font-weight:600;background:#f8fafc">廣告佔比%</th>`).join('');

  const dataCells=(shopMap,editable,rowId)=>SHOPS.map(s=>{
    const d=shopMap?.[s.id]||{};
    const p=calcPure(d);
    const bl='border-left:2px solid #e5e7eb;';
    const blB='border-left:2px solid #c7d2fe;';
    const borderL=editable?bl:blB;
    const bw=editable?'':'font-weight:700;';
    const onclick=(f)=>editable?`onclick="editSummaryCell('${rowId}','${s.id}','${f}',this)" style="${borderL}${bw}text-align:right;padding:5px 8px;cursor:pointer"`:`style="${borderL}${bw}text-align:right;padding:6px 8px"`;
    const dash='<span style="color:#d1d5db">—</span>';
    const sid=rowId?`${rowId}__${s.id}`:'';
    const hasData=d.rev||d.gross||d.ads;
    return`<td ${onclick('rev')} id="${sid?'sc-'+sid+'-rev':''}">${d.rev?fmt(d.rev):dash}</td>
      <td style="${bw}text-align:right;padding:5px 8px;color:#b45309;${editable?'cursor:pointer':''}" ${editable?`onclick="editSummaryCell('${rowId}','${s.id}','ads',this)"`:''} id="${sid?'sc-'+sid+'-ads':''}">${d.ads?fmt(d.ads):dash}</td>
      <td style="${bw}text-align:right;padding:5px 8px;${editable?'cursor:pointer':''}" ${editable?`onclick="editSummaryCell('${rowId}','${s.id}','gross',this)"`:''} id="${sid?'sc-'+sid+'-gross':''}">${d.gross?fmt(d.gross):dash}</td>
      <td style="${bw}text-align:right;padding:5px 8px;" id="${sid?'sc-'+sid+'-pure':''}">${hasData?`<span style="color:${p>=0?'#059669':'#dc2626'}">${fmt(p)}</span>`:dash}</td>
      <td style="${bw}text-align:right;padding:5px 8px" id="${sid?'sc-'+sid+'-pr':''}">${d.rev?pct(p,d.rev):'—'}</td>
      <td style="${bw}text-align:right;padding:5px 8px;color:#b45309" id="${sid?'sc-'+sid+'-ar':''}">${(d.rev&&d.ads)?pct(d.ads,d.rev):'—'}</td>`;
  }).join('');


  // 只顯示最近兩個月（本月 + 上個月），其他放進「歷史明細」彈窗
  const now=new Date();
  const prevDate=new Date(now.getFullYear(),now.getMonth()-1,1);
  const prevYM=`${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
  const recentRows=rows.filter(r=>r.end.substring(0,7)>=prevYM);
  const histRows=rows.filter(r=>r.end.substring(0,7)<prevYM);

  const thead=`<thead>
    <tr><th rowspan="2" style="padding:8px 12px;background:#f8fafc;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:left;white-space:nowrap;vertical-align:middle;min-width:110px;position:sticky;left:0;z-index:3">區間</th>${shopGroupHdr}</tr>
    <tr style="border-bottom:2px solid #e5e7eb">${shopSubHdr}</tr>
  </thead>`;

  // 主表用（無隱藏按鈕）
  const buildMainRow=(row)=>{
    const s=new Date(row.start+'T12:00:00'),e=new Date(row.end+'T12:00:00');
    const sm=s.getMonth()+1,sd=s.getDate(),em=e.getMonth()+1,ed=e.getDate();
    const full=isFullMonth(row);
    const label=full?`${sm}月份`:(sm===em?`${sm}/${sd} – ${sm}/${ed}`:`${sm}/${sd} – ${em}/${ed}`);
    const delBtn=`<button onclick="event.stopPropagation();deleteSummaryRow('${row.id}')" style="background:none;border:none;color:#d1d5db;cursor:pointer;font-size:10px;padding:0;vertical-align:middle;margin-left:4px" title="刪除">✕</button>`;
    if(full){
      return`<tr style="background:#eef2ff;border-top:2px solid #c7d2fe;border-bottom:2px solid #c7d2fe">
        <td style="padding:7px 10px;font-size:13px;font-weight:700;color:#4338ca;white-space:nowrap;position:sticky;left:0;background:#eef2ff;z-index:1">${label}${delBtn}</td>${dataCells(row.shops,true,row.id)}</tr>`;
    }
    return`<tr style="border-top:1px solid #f0f0f0">
      <td style="padding:5px 10px;font-size:12px;white-space:nowrap;color:#374151;font-variant-numeric:tabular-nums;position:sticky;left:0;background:white;z-index:1">${label}${delBtn}</td>${dataCells(row.shops,true,row.id)}</tr>`;
  };

  // 彈窗用（左側有 − 隱藏按鈕，帶 data-rid 供顯示全部用）
  const buildModalRow=(row,bgFull,bgNorm)=>{
    const s=new Date(row.start+'T12:00:00'),e=new Date(row.end+'T12:00:00');
    const sm=s.getMonth()+1,sd=s.getDate(),em=e.getMonth()+1,ed=e.getDate();
    const full=isFullMonth(row);
    const label=full?`${sm}月份`:(sm===em?`${sm}/${sd} – ${sm}/${ed}`:`${sm}/${sd} – ${em}/${ed}`);
    const hideBtnStyle='background:none;border:1px solid #d1d5db;border-radius:3px;color:#9ca3af;cursor:pointer;font-size:12px;padding:0 5px;line-height:18px;vertical-align:middle;margin-right:5px;flex-shrink:0';
    const hideBtn=`<button class="sum-hide-btn" onclick="event.stopPropagation();_sumToggleRow(this)" style="${hideBtnStyle}" title="隱藏此行">−</button>`;
    const bg1=bgFull||'#eef2ff',bg2=bgNorm||'white';
    const dataTds=dataCells(row.shops,false,row.id).replace(/<td /g,'<td class="sum-data-td" ');
    if(full){
      return`<tr data-rid="${row.id}" class="sum-modal-row" style="background:${bg1};border-top:2px solid #c7d2fe;border-bottom:2px solid #c7d2fe">
        <td style="padding:6px 10px 6px 8px;font-size:13px;font-weight:700;color:#4338ca;white-space:nowrap;position:sticky;left:0;background:${bg1};z-index:1;text-align:left">${hideBtn}${label}</td>${dataTds}</tr>`;
    }
    return`<tr data-rid="${row.id}" class="sum-modal-row" style="background:${bg2};border-top:1px solid #f0f0f0">
      <td style="padding:4px 10px 4px 8px;font-size:12px;white-space:nowrap;color:#374151;font-variant-numeric:tabular-nums;position:sticky;left:0;background:${bg2};z-index:1;text-align:left">${hideBtn}${label}</td>${dataTds}</tr>`;
  };

  const tbody=recentRows.map(r=>buildMainRow(r)).join('')||`<tr><td colspan="${1+SHOPS.length*6}" style="text-align:center;padding:40px;color:#9ca3af;font-size:13px">尚無資料，點下方「＋ 新增週次」開始輸入</td></tr>`;

  // 彈窗：歷史（淡綠）在上，近兩個月（白）在下
  const modalTbody=[
    ...histRows.map(r=>buildModalRow(r,'#f0fdf4','#f9fafb')),
    ...recentRows.map(r=>buildModalRow(r))
  ].join('');

  // 更新「已隱藏」chip 列
  function _sumRefreshChips(ov){
    const bar=ov.querySelector('#sum-chip-bar');
    if(!bar)return;
    const hidden=[...ov.querySelectorAll('.sum-modal-row[style*="display:none"],.sum-modal-row[style*="display: none"]')];
    if(!hidden.length){bar.style.display='none';bar.innerHTML='';return;}
    bar.style.display='flex';
    bar.innerHTML='<span style="font-size:11px;color:#9ca3af;white-space:nowrap;align-self:center">已隱藏：</span>'
      +hidden.map(tr=>{
        const rid=tr.dataset.rid;
        const lbl=tr.querySelector('td')?.textContent?.trim()||rid;
        return`<span style="display:inline-flex;align-items:center;gap:3px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;padding:2px 8px;font-size:11px;color:#64748b;white-space:nowrap">
          ${lbl}<button onclick="_sumRestoreRow('${rid}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:13px;padding:0;line-height:1;margin-left:2px" title="還原">＋</button>
        </span>`;
      }).join('')
      +'<button onclick="_sumShowAll()" style="margin-left:4px;padding:2px 8px;border:1px solid #e2e8f0;border-radius:12px;font-size:11px;color:#64748b;background:#f8fafc;cursor:pointer;white-space:nowrap">全部顯示</button>';
  }

  // 隱藏單行（完全消失，加入 chip）
  window._sumToggleRow=function(btn){
    const tr=btn.closest('tr');
    tr.style.display='none';
    const ov=document.getElementById('sum-hist-overlay');
    if(ov)_sumRefreshChips(ov);
  };

  // 還原單行（從 chip 點）
  window._sumRestoreRow=function(rid){
    const ov=document.getElementById('sum-hist-overlay');
    if(!ov)return;
    const tr=ov.querySelector(`.sum-modal-row[data-rid="${rid}"]`);
    if(tr)tr.style.display='';
    _sumRefreshChips(ov);
  };

  // 全部顯示
  window._sumShowAll=function(){
    const ov=document.getElementById('sum-hist-overlay');
    if(!ov)return;
    ov.querySelectorAll('.sum-modal-row').forEach(tr=>{tr.style.display='';});
    _sumRefreshChips(ov);
  };

  window._sumOpenModal=function(){
    const old=document.getElementById('sum-hist-overlay');
    if(old){old.remove();return;}
    const ov=document.createElement('div');
    ov.id='sum-hist-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML=`<div style="background:white;border-radius:14px;width:98%;max-width:1400px;height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.35)">
      <div style="padding:12px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:12px">
        <span style="font-weight:700;font-size:15px;color:#1e293b">📋 歷史明細　<span style="font-size:12px;font-weight:400;color:#94a3b8">共 ${rows.length} 筆　淡綠 = 已移入歷史</span></span>
        <button onclick="document.getElementById('sum-hist-overlay').remove()" style="background:none;border:none;font-size:24px;color:#94a3b8;cursor:pointer;line-height:1;flex-shrink:0">×</button>
      </div>
      <div id="sum-chip-bar" style="display:none;flex-wrap:wrap;gap:5px;padding:8px 16px;border-bottom:1px solid #f1f5f9;flex-shrink:0;align-items:center"></div>
      <div style="overflow:auto;flex:1;padding:0">
        <table style="border-collapse:collapse;width:100%;font-size:13px">${thead}<tbody>${modalTbody}</tbody></table>
      </div>
    </div>`;
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
    document.body.appendChild(ov);
  };

  const histBtn=rows.length?`<button onclick="window._sumOpenModal()" style="margin-bottom:10px;padding:4px 12px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:20px;font-size:12px;color:#64748b;font-weight:600;cursor:pointer">📋 歷史明細 <span style="color:#94a3b8;font-weight:400">${rows.length} 筆</span></button>`:'';

  el.innerHTML=`<div style="padding:14px 16px 16px">
    ${histBtn}
    <div class="tscroll"><table style="border-collapse:collapse;width:100%">
      ${thead}
      <tbody>${tbody}</tbody>
    </table></div>
    <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button onclick="openAddSummaryRowModal()" style="padding:7px 18px;border:1.5px dashed #c7d2fe;border-radius:8px;background:white;color:#5b5fcf;font-size:13px;font-weight:600;cursor:pointer">＋ 新增週次</button>
      <span style="font-size:11px;color:#9ca3af">純利 = 毛利 − 廣告 − 營收×${(rate*100).toFixed(1)}%　｜　點擊數字可編輯</span>
    </div>
  </div>`;
}

// ── KPI 月結表（行銷）──
// 每組（蝦皮/酷澎/業外/官網/MOMO）欄位不同：manual = 手動輸入，formula = 依 manual 算出（唯讀）。
// 公式是依畫面截圖回推的最佳猜測，數字對不上請直接跟我說要改哪一條公式。
function getKpiRows(){
  try{
    if(typeof Store!='undefined'&&Store._profitMem?._kpi_v1)return Store._profitMem._kpi_v1;
    const s=localStorage.getItem('ec_kpi_v1');return s?JSON.parse(s):[];
  }catch{return [];}
}
function saveKpiRows(rows){
  try{localStorage.setItem('ec_kpi_v1',JSON.stringify(rows));}catch{}
  try{ if(typeof Store!=='undefined'){ Store._profitMem=Store._profitMem||{}; Store._profitMem._kpi_v1=rows; } }catch{}
  // KPI 是偶爾才存一次的手動輸入，這裡沒有另外的「同步雲端」按鈕可以點，
  // 所以直接即時推雲端，不要走 _cloudWriteSafe 的「本機優先、等按鈕手動同步」流程
  // （不然像淨利表分頁那樣要另外去按同步鈕，資料才會真的進雲端）。
  if(window.__cloudProfit&&typeof window.__cloudProfit.setField==='function'){
    window.__cloudProfit.setField('_kpi_v1', rows).catch(e=>console.warn('[KPI] 雲端同步失敗，稍後會透過同步雲端按鈕補推',e));
  }
  _cloudWriteSafe('_kpi_v1', rows, 'KPI月結表');
}
const KPI_GROUPS=[
  {key:'shopee',title:'蝦皮',color:'#ee4d2d',shops:['好麻吉','玩樂','維克','森之旅'],
    manual:[{k:'qty',l:'訂單數'},{k:'rev',l:'實際營收'},{k:'cost',l:'商品成本'},{k:'ads',l:'廣告費'},{k:'fee',l:'手續費'},{k:'misc',l:'各項費用'}],
    formula:[
      {k:'aov',l:'客單價',fmt:'money',avg:true,calc:d=>d.qty>0?d.rev/d.qty:0},
      {k:'costPct',l:'成本佔比',fmt:'pct',calc:d=>d.rev>0?d.cost/d.rev:0},
      {k:'adsPct',l:'廣告佔比',fmt:'pct',calc:d=>d.rev>0?d.ads/d.rev:0},
      {k:'pure',l:'純利',fmt:'money',calc:d=>d.rev-d.cost-d.ads-d.fee-d.misc},
      {k:'pureRate',l:'純利率',fmt:'pct',calc:d=>d.rev>0?(d.rev-d.cost-d.ads-d.fee-d.misc)/d.rev:0},
    ],
    commonCostLabel:'倉儲運費+便利袋+宅配通+大榮（整組共同費用，只影響小計純利）',
    commonCostShortLabel:'物流運費',
    order:['aov','qty','rev','cost','costPct','ads','adsPct','fee','misc','_common','pure','pureRate']},
  {key:'coupang',title:'酷澎',color:'#7c6fe0',shops:['商城-好麻吉','商城-露營館','酷澎買斷'],
    manual:[{k:'qty',l:'訂單數'},{k:'rev',l:'營收'},{k:'cost',l:'商品成本'},{k:'fee',l:'手續費'},{k:'ret',l:'退貨運費'},{k:'tax',l:'稅金'},{k:'material',l:'耗材'}],
    formula:[
      {k:'pure',l:'純利',fmt:'money',calc:d=>d.rev-d.cost-d.fee-d.ret-d.tax-d.material},
      {k:'pureRate',l:'純利率',fmt:'pct',calc:d=>d.rev>0?(d.rev-d.cost-d.fee-d.ret-d.tax-d.material)/d.rev:0},
    ]},
  {key:'other',title:'業外',color:'#d63bb0',shops:['業外'],
    manual:[{k:'qty',l:'訂單數'},{k:'rev',l:'營收'},{k:'cost',l:'商品成本'},{k:'fee',l:'手續費'},{k:'ship',l:'運費'}],
    formula:[
      {k:'pure',l:'純利',fmt:'money',calc:d=>d.rev-d.cost-d.fee-d.ship},
      {k:'pureRate',l:'純利率',fmt:'pct',calc:d=>d.rev>0?(d.rev-d.cost-d.fee-d.ship)/d.rev:0},
    ]},
  {key:'website',title:'官網',color:'#2f9e5c',shops:['官網'],
    manual:[{k:'qty',l:'訂單數'},{k:'rev',l:'營收'},{k:'cost',l:'商品成本'},{k:'fee',l:'手續費'},{k:'ship',l:'運費'}],
    formula:[
      {k:'pure',l:'純利',fmt:'money',calc:d=>d.rev-d.cost-d.fee-d.ship},
      {k:'pureRate',l:'純利率',fmt:'pct',calc:d=>d.rev>0?(d.rev-d.cost-d.fee-d.ship)/d.rev:0},
    ]},
  {key:'momo',title:'MOMO',color:'#3a7bd5',shops:['MOMO-甲配','MOMO-寄倉','mo+0號店(好麻吉)','mo+1號店(森之旅)','mo+2號店(露營館)'],
    manual:[{k:'qty',l:'訂單數'},{k:'rev',l:'營收(進價稅)'},{k:'cost',l:'商品成本'},{k:'ret',l:'退貨金額'},{k:'ship',l:'寄倉運費'},{k:'misc',l:'各項費用'},{k:'material',l:'耗材'},{k:'receivable',l:'應收帳款11日'}],
    formula:[
      {k:'actualRev',l:'實際營收',fmt:'money',calc:d=>d.rev-d.ret},
      {k:'tax',l:'稅金(5%)',fmt:'money',calc:d=>(d.rev-d.ret)*0.05},
      {k:'pure',l:'純利(實收)',fmt:'money',calc:d=>(d.rev-d.ret)-d.cost-d.ship-d.misc-d.tax-d.material},
      {k:'pureRate',l:'純利率',fmt:'pct',calc:d=>(d.rev-d.ret)>0?((d.rev-d.ret)-d.cost-d.ship-d.misc-d.tax-d.material)/(d.rev-d.ret):0},
    ],
    order:['qty','rev','cost','ret','actualRev','ship','misc','tax','material','receivable','pure','pureRate'],
    // 寄倉運費：好麻吉／森之旅固定共用一筆合併儲存格（不算進這兩個賣場各自的純利，只影響小計）；
    // 甲配／露營館這個欄位不適用（灰底不能編輯）；寄倉維持自己獨立的數字。
    fieldMerge:{
      ship:{
        mergeGroups:[{shops:['mo+0號店(好麻吉)','mo+1號店(森之旅)']}],
        notApplicable:['MOMO-甲配','mo+2號店(露營館)'],
      },
    }},
];
function _kpiFmt(v,fmt){
  if(fmt==='pct')return v?(v*100).toFixed(2)+'%':'—';
  return v?fmtN(Math.round(v)):'—';
}
function _kpiCalcAll(d,group){
  const out={...d};
  // 公式欄位現在也能手動打數字覆蓋（例如稅金每月手算不一定剛好是 5%）——
  // 已經有手動填的值就不要被公式蓋掉，沒填才用公式算出預設值。
  group.formula.forEach(f=>{if(out[f.k]==null)out[f.k]=f.calc(out)||0;});
  return out;
}
// 一個月只會做一次這張表，所以不用「新增月份」的額外步驟——
// 年份/月份直接用下拉選單指定，選到的月份如果還沒有資料，
// 畫面上就顯示空白可編輯的表格，真的填了數字才會建立/儲存那個月。
function _kpiEmptyRow(month){return{id:month,month,shopee:{},coupang:{},other:{},website:{},momo:{}};}
function getOrCreateKpiRow(month){
  return getKpiRows().find(r=>r.month===month)||_kpiEmptyRow(month);
}
function deleteKpiRow(month){
  if(!confirm('確定清空這個月份的資料？'))return;
  saveKpiRows(getKpiRows().filter(r=>r.month!==month));
  renderKpiTab();
}
// 手動輸入欄允許打公式（例如 rev*21%），用同一個賣場已經填過的欄位名稱
// 當變數；備註只開放給手續費/運費類欄位（key 是 fee 或 ship 的都算）。
const KPI_NOTEABLE_FIELDS=new Set(['fee','ship']);
// 目前正在編輯公式的儲存格（供「點其他欄位帶入公式」使用）：{month,groupKey,shop,field,inputEl}
let _kpiFormulaCtx=null;
function _kpiFieldValues(shopData,group){
  const calc=_kpiCalcAll(shopData||{},group);
  const out={};
  Object.keys(calc).forEach(k=>{
    if(k.endsWith('Formula')||k.endsWith('Note'))return;
    out[k]=calc[k];
  });
  return out;
}
function _kpiEvalFormula(str,shopData,group){
  if(str==null||str==='')return NaN;
  let s=String(str).trim();
  if(s[0]==='=')s=s.slice(1).trim();
  if(/^-?\d+(\.\d+)?$/.test(s))return parseFloat(s);
  const values=_kpiFieldValues(shopData,group);
  // 中文欄位名稱（不能用 \b，中文不算 word 字元）跟英文 key（可以用 \b）都支援代換，
  // 先代換較長的名稱，避免「純利率」被「純利」搶先命中一部分。
  [...group.manual,...group.formula].slice().sort((a,b)=>b.l.length-a.l.length).forEach(f=>{
    if(s.includes(f.l))s=s.split(f.l).join('('+(Number(values[f.k])||0)+')');
  });
  Object.keys(values).sort((a,b)=>b.length-a.length).forEach(name=>{
    const re=new RegExp('\\b'+name+'\\b','g');
    if(re.test(s))s=s.replace(re,'('+(Number(values[name])||0)+')');
  });
  s=s.replace(/(\d+(\.\d+)?)\s*%/g,'($1/100)');
  if(!/^[\d+\-*/.()\s]+$/.test(s))return NaN;
  try{
    const val=Function('"use strict";return ('+s+')')();
    return typeof val==='number'&&isFinite(val)?val:NaN;
  }catch{return NaN;}
}
// 儲存格點擊分派：如果目前同一列有其他欄位正在編輯公式，點這裡是「帶入參照」而不是打開自己的編輯框。
function kpiCellClick(month,groupKey,shop,field,tdEl,editable){
  const ctx=_kpiFormulaCtx;
  if(ctx&&ctx.month===month&&ctx.groupKey===groupKey&&ctx.shop===shop&&ctx.field!==field){
    const group=KPI_GROUPS.find(g=>g.key===groupKey);
    const f=[...group.manual,...group.formula].find(x=>x.k===field);
    if(f){
      const inp=ctx.inputEl;
      const start=inp.selectionStart??inp.value.length;
      const end=inp.selectionEnd??inp.value.length;
      inp.value=inp.value.slice(0,start)+f.l+inp.value.slice(end);
      const pos=start+f.l.length;
      inp.focus();inp.setSelectionRange(pos,pos);
    }
    return;
  }
  if(editable)editKpiCell(month,groupKey,shop,field,tdEl);
}
function editKpiCell(month,groupKey,shop,field,tdEl){
  const rows=getKpiRows();
  let row=rows.find(r=>r.month===month);
  if(!row){row=_kpiEmptyRow(month);rows.push(row);rows.sort((a,b)=>a.month.localeCompare(b.month));}
  if(!row[groupKey])row[groupKey]={};
  if(!row[groupKey][shop])row[groupKey][shop]={};
  const shopData=row[groupKey][shop];
  const group=KPI_GROUPS.find(g=>g.key===groupKey);
  const curVal=shopData[field+'Formula']!=null?shopData[field+'Formula']:(shopData[field]!=null?shopData[field]:'');
  const origContent=tdEl.innerHTML;
  const inp=document.createElement('input');
  inp.type='text';inp.value=curVal;inp.placeholder='數字或公式，如 =實際營收*21%';
  inp.style.cssText='width:150px;border:1.5px solid #5b5fcf;border-radius:4px;padding:2px 6px;font-size:12px;text-align:right;outline:none';
  tdEl.innerHTML='';tdEl.style.whiteSpace='normal';tdEl.appendChild(inp);
  inp.focus();if(inp.value)inp.select();
  _kpiFormulaCtx={month,groupKey,shop,field,inputEl:inp};
  let done=false;
  const save=()=>{
    if(done)return;done=true;
    if(_kpiFormulaCtx&&_kpiFormulaCtx.inputEl===inp)_kpiFormulaCtx=null;
    const raw=inp.value.trim();
    const isPlain=/^-?\d+(\.\d+)?$/.test(raw);
    const computed=_kpiEvalFormula(raw,shopData,group);
    if(raw===''||isNaN(computed)){
      delete shopData[field];delete shopData[field+'Formula'];
    }else{
      // 打 0 是刻意要蓋成 0（跟完全沒填、留給公式自動算不一樣），要真的存下來，不能當作空白清掉。
      shopData[field]=computed;
      if(isPlain)delete shopData[field+'Formula'];else shopData[field+'Formula']=raw;
    }
    saveKpiRows(rows);
    renderKpiTab();
  };
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();save();}
    if(e.key==='Escape'){done=true;if(_kpiFormulaCtx&&_kpiFormulaCtx.inputEl===inp)_kpiFormulaCtx=null;tdEl.style.whiteSpace='';tdEl.innerHTML=origContent;}
  });
  inp.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==inp)save();},120));
}
// 手續費/運費的備註是「這個月、這個組別」共用一則，跟點哪個賣場的數字無關——
// 從欄位標題點進去編輯，跟編輯賣場數字的輸入框完全分開。
function editKpiFieldNote(month,groupKey,field,thEl){
  const rows=getKpiRows();
  let row=rows.find(r=>r.month===month);
  if(!row){row=_kpiEmptyRow(month);rows.push(row);rows.sort((a,b)=>a.month.localeCompare(b.month));}
  if(!row.kpiFieldNotes)row.kpiFieldNotes={};
  const key=groupKey+':'+field;
  const cur=row.kpiFieldNotes[key]||'';
  const origContent=thEl.innerHTML;
  const inp=document.createElement('input');
  inp.type='text';inp.value=cur;inp.placeholder='備註，如：便利袋8000、宅配通7000';
  inp.style.cssText='width:190px;border:1.5px solid #5b5fcf;border-radius:4px;padding:2px 6px;font-size:11.5px;text-align:right;outline:none;font-weight:400;color:#374151';
  inp.onclick=e=>e.stopPropagation();
  thEl.innerHTML='';thEl.appendChild(inp);
  inp.focus();if(inp.value)inp.select();
  let done=false;
  const save=()=>{
    if(done)return;done=true;
    const v=inp.value.trim();
    if(v)row.kpiFieldNotes[key]=v;else delete row.kpiFieldNotes[key];
    saveKpiRows(rows);
    renderKpiTab();
  };
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();save();}
    if(e.key==='Escape'){done=true;thEl.innerHTML=origContent;}
  });
  inp.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==inp)save();},120));
}
function editKpiCommonCost(month,groupKey,tdEl){
  const rows=getKpiRows();
  let row=rows.find(r=>r.month===month);
  if(!row){row=_kpiEmptyRow(month);rows.push(row);rows.sort((a,b)=>a.month.localeCompare(b.month));}
  const fieldName=groupKey+'Common';
  const curVal=row[fieldName]||'';
  const origContent=tdEl.innerHTML;
  const inp=document.createElement('input');
  inp.type='number';inp.value=curVal;
  inp.style.cssText='width:90px;border:1.5px solid #5b5fcf;border-radius:4px;padding:2px 6px;font-size:12px;text-align:right;outline:none';
  tdEl.innerHTML='';tdEl.appendChild(inp);inp.focus();if(inp.value)inp.select();
  let done=false;
  const save=()=>{
    if(done)return;done=true;
    const v=parseFloat(inp.value);
    if(!isNaN(v)&&v!==0)row[fieldName]=v;else delete row[fieldName];
    saveKpiRows(rows);
    renderKpiTab();
  };
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}if(e.key==='Escape'){done=true;tdEl.innerHTML=origContent;}});
  inp.addEventListener('blur',save);
}
// 只算總營收/總純利/純利率，不組 HTML——給總覽卡片跟明細表格共用。
function _kpiGroupTotals(row,group){
  const pureKey=group.formula.find(f=>f.l.includes('純利')&&!f.l.includes('率'))?.k;
  let totalRev=0,totalPure=0;
  group.shops.forEach(shop=>{
    const d=_kpiCalcAll(row[group.key]?.[shop]||{},group);
    totalRev+=d.rev||0;
    totalPure+=d[pureKey]||0;
  });
  if(group.commonCostLabel)totalPure-=(row[group.key+'Common']||0);
  return{totalRev,totalPure,pureRateAgg:totalRev>0?totalPure/totalRev:0,pureKey};
}
// 哪些「row.id:group.key」目前是展開狀態——只是畫面互動狀態，不用存雲端，
// 重新整理會回到全部收合。
const _kpiExpandedGroups=new Set();
function toggleKpiGroup(month,groupKey){
  const id=month+':'+groupKey;
  if(_kpiExpandedGroups.has(id))_kpiExpandedGroups.delete(id);else _kpiExpandedGroups.add(id);
  renderKpiTab();
}
function _kpiSummaryCardsHtml(row){
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px">
    ${KPI_GROUPS.map(g=>{
      const{totalPure,pureRateAgg,totalRev}=_kpiGroupTotals(row,g);
      return `<div style="background:#f8f9fc;border-radius:8px;padding:12px 14px">
        <div style="font-size:12px;color:#6b7280;display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:${g.color};display:inline-block;flex-shrink:0"></span>${g.title}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:6px">營收</div>
        <div style="font-size:19px;font-weight:700;color:#1f2937">NT$${fmtN(Math.round(totalRev))}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:5px">純利</div>
        <div style="font-size:14px;font-weight:600;color:${totalPure>=0?'#059669':'#dc2626'}">NT$${fmtN(Math.round(totalPure))}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">純利率 ${totalRev>0?(pureRateAgg*100).toFixed(2)+'%':'—'}</div>
      </div>`;
    }).join('')}
  </div>`;
}
// 找出某個賣場在某個欄位是否被合併（跟其他賣場共用一格）或不適用（例如 MOMO 寄倉運費：
// 好麻吉/森之旅共用一格、甲配/露營館不適用），回傳 null 代表這個賣場照正常方式獨立編輯。
function _kpiFieldMergeStatus(group,field,shop){
  const cfg=group.fieldMerge?.[field];
  if(!cfg)return null;
  if(cfg.notApplicable?.includes(shop))return{type:'na'};
  const g=cfg.mergeGroups?.find(mg=>mg.shops.includes(shop));
  if(g)return{type:'merged',shops:g.shops,mergeKey:group.key+':'+field+':'+g.shops[0]};
  return null;
}
function editKpiMergedField(month,mergeKey,tdEl){
  const rows=getKpiRows();
  let row=rows.find(r=>r.month===month);
  if(!row){row=_kpiEmptyRow(month);rows.push(row);rows.sort((a,b)=>a.month.localeCompare(b.month));}
  if(!row.kpiFieldMerges)row.kpiFieldMerges={};
  const curVal=row.kpiFieldMerges[mergeKey]!=null?row.kpiFieldMerges[mergeKey]:'';
  const origContent=tdEl.innerHTML;
  const inp=document.createElement('input');
  inp.type='number';inp.value=curVal;
  inp.style.cssText='width:100px;border:1.5px solid #5b5fcf;border-radius:4px;padding:2px 6px;font-size:12px;text-align:right;outline:none';
  tdEl.innerHTML='';tdEl.appendChild(inp);inp.focus();if(inp.value)inp.select();
  let done=false;
  const save=()=>{
    if(done)return;done=true;
    const v=parseFloat(inp.value);
    if(inp.value.trim()!==''&&!isNaN(v))row.kpiFieldMerges[mergeKey]=v;else delete row.kpiFieldMerges[mergeKey];
    saveKpiRows(rows);
    renderKpiTab();
  };
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}if(e.key==='Escape'){done=true;tdEl.innerHTML=origContent;}});
  inp.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==inp)save();},120));
}
function _kpiGroupTableHtml(row,group){
  const expanded=_kpiExpandedGroups.has(row.month+':'+group.key);
  // 公式欄位（如稅金、實際營收、純利）現在也能點擊打數字覆蓋，不是只有手動欄位才能編輯。
  const allCols=[...group.manual.map(c=>({...c,editable:true})),...group.formula.map(c=>({...c,editable:true}))];
  if(group.commonCostLabel)allCols.push({k:'_common',l:group.commonCostShortLabel||group.commonCostLabel,editable:false,isCommon:true});
  const cols=group.order?group.order.map(k=>allCols.find(c=>c.k===k)).filter(Boolean):allCols;
  // 欄位固定表格版面＋每欄等寬，欄位之間才會平均分配空間，不會被瀏覽器依內容長短撐出忽大忽小的間隔。
  const colgroup=`<colgroup><col style="width:130px">${cols.map(()=>`<col style="width:calc((100% - 130px)/${cols.length})">`).join('')}</colgroup>`;
  const thead=`<tr style="background:#f8f9fc">
    <th style="text-align:left;padding:7px 12px;color:#6b7280;font-size:11.5px;font-weight:700;background:#f8f9fc">${group.shops.length>1?'賣場':'名稱'}</th>
    ${cols.map(c=>{
      if(c.isCommon){
        return `<th style="padding:7px 10px;color:#6b7280;font-size:11.5px;font-weight:700;text-align:right;white-space:nowrap" title="${group.commonCostLabel}">${c.l}</th>`;
      }
      if(KPI_NOTEABLE_FIELDS.has(c.k)){
        const note=(row.kpiFieldNotes||{})[group.key+':'+c.k];
        const dot=note?` <span style="color:#f59e0b;font-size:8px" aria-hidden="true">●</span>`:'';
        const title=note?`備註：${note.replace(/"/g,'&quot;')}（點擊修改，這個月共用一則）`:'點擊新增這個月的備註（例如：便利袋8000、宅配通7000）';
        return `<th onclick="editKpiFieldNote('${row.month}','${group.key}','${c.k}',this)" style="padding:7px 10px;color:#6b7280;font-size:11.5px;font-weight:700;text-align:right;white-space:nowrap;cursor:pointer" title="${title}">${c.l}${dot}</th>`;
      }
      return `<th style="padding:7px 10px;color:#6b7280;font-size:11.5px;font-weight:700;text-align:right;white-space:nowrap">${c.l}</th>`;
    }).join('')}
  </tr>`;
  const{pureKey}=_kpiGroupTotals(row,group);
  // 共同費用：整組共用一筆，只影響小計純利，不分攤到各賣場——用 rowspan 直向合併成一欄，不再另外多一行。
  const commonField=group.key+'Common';
  const commonCost=row[commonField]||0;
  const totals={};
  let totalRev=0,totalPure=0;
  const bodyRows=group.shops.map((shop,shopIdx)=>{
    const raw=row[group.key]?.[shop]||{};
    // 有些欄位這個賣場是合併/不適用（例如 MOMO 寄倉運費），算這個賣場自己的純利時要當作 0，
    // 費用改成算在合併儲存格或小計上，不會讓這個賣場的公式因為缺值變成 NaN。
    let rawForCalc=raw;
    if(group.fieldMerge){
      const zeroFields={};
      Object.keys(group.fieldMerge).forEach(f=>{if(_kpiFieldMergeStatus(group,f,shop))zeroFields[f]=0;});
      if(Object.keys(zeroFields).length)rawForCalc={...raw,...zeroFields};
    }
    const d=_kpiCalcAll(rawForCalc,group);
    totalRev+=d.rev||0;
    totalPure+=d[pureKey]||0;
    const cells=cols.map(c=>{
      if(c.isCommon){
        if(shopIdx!==0)return '';
        const tid=`kpi-${row.month}-${group.key}-common`;
        const dispVal=commonCost?fmtN(Math.round(commonCost)):'<span style="color:#d1d5db">—</span>';
        return `<td id="${tid}" rowspan="${group.shops.length}" onclick="editKpiCommonCost('${row.month}','${group.key}',this)" style="padding:6px 10px;text-align:right;font-size:12.5px;cursor:pointer;white-space:nowrap;vertical-align:middle" title="${group.commonCostLabel}（點擊編輯，只影響小計純利，不影響單一賣場）">${dispVal}</td>`;
      }
      const mergeStatus=_kpiFieldMergeStatus(group,c.k,shop);
      if(mergeStatus?.type==='na'){
        return `<td style="padding:6px 10px;text-align:right;font-size:12.5px;color:#d1d5db" title="這個賣場不適用${c.l}">—</td>`;
      }
      if(mergeStatus?.type==='merged'){
        if(shopIdx!==group.shops.indexOf(mergeStatus.shops[0]))return '';
        const mergedVal=(row.kpiFieldMerges||{})[mergeStatus.mergeKey]||0;
        totals[c.k]=(totals[c.k]||0)+mergedVal;
        const tid=`kpi-${row.month}-${mergeStatus.mergeKey}`.replace(/["'\s:]/g,'_');
        const dispVal=mergedVal?fmtN(Math.round(mergedVal)):'<span style="color:#d1d5db">—</span>';
        return `<td id="${tid}" rowspan="${mergeStatus.shops.length}" onclick="editKpiMergedField('${row.month}','${mergeStatus.mergeKey.replace(/'/g,"\\'")}',this)" style="padding:6px 10px;text-align:right;font-size:12.5px;cursor:pointer;white-space:nowrap;vertical-align:middle" title="${mergeStatus.shops.join('+')}共用一格${c.l}，只影響小計，不算進各自純利">${dispVal}</td>`;
      }
      totals[c.k]=(totals[c.k]||0)+(d[c.k]||0);
      const tid=`kpi-${row.month}-${group.key}-${shop}-${c.k}`.replace(/["'\s]/g,'_');
      const shopArg=shop.replace(/'/g,"\\'");
      // 有明確存過值（就算是刻意打的 0）都要顯示出數字，不能因為是 0 就跟「完全沒填」一樣顯示 —。
      const explicitlySet=raw[c.k]!=null;
      const dispVal=explicitlySet?(c.fmt==='pct'?(d[c.k]*100).toFixed(2)+'%':fmtN(Math.round(d[c.k]))):_kpiFmt(d[c.k],c.fmt);
      const isPure=c.k.startsWith('pure')&&c.fmt==='money';
      const color=isPure?(d[c.k]>=0?'#059669':'#dc2626'):'#374151';
      return `<td id="${tid}" onclick="kpiCellClick('${row.month}','${group.key}','${shopArg}','${c.k}',this,true)" style="padding:6px 10px;text-align:right;font-size:12.5px;color:${color};cursor:pointer;white-space:nowrap" title="點擊編輯；輸入 = 後點其他欄位可帶入公式，如 =實際營收*21%">${dispVal}</td>`;
    }).join('');
    return `<tr style="border-top:1px solid #f0f0f0">
      <td style="padding:6px 12px;font-size:12.5px;font-weight:600;color:#374151;background:#fff;text-align:left;white-space:nowrap">${shop}</td>
      ${cells}
    </tr>`;
  }).join('');
  totalPure-=commonCost;
  const pureRateAgg=totalRev>0?totalPure/totalRev:0;
  const subtotalCells=cols.map(c=>{
    if(c.isCommon)return `<td style="padding:7px 10px;text-align:right;font-size:12.5px;font-weight:700;color:#374151">${commonCost?fmtN(Math.round(commonCost)):'—'}</td>`;
    if(c.k===pureKey)return `<td style="padding:7px 10px;text-align:right;font-size:12.5px;font-weight:700;color:${totalPure>=0?'#059669':'#dc2626'}">${fmtN(Math.round(totalPure))}</td>`;
    if(c.k==='pureRate')return `<td style="padding:7px 10px;text-align:right;font-size:12.5px;font-weight:700;color:#374151">${totalRev>0?(pureRateAgg*100).toFixed(2)+'%':'—'}</td>`;
    // 比率／平均型欄位（成本佔比、廣告佔比、客單價）不能直接加總，要用小計後的加總數字重算；
    // 其餘金額型欄位（不管原本是手動輸入還是公式，現在都能點擊覆蓋）本身可以加總，包含被手動覆蓋過的值。
    if(c.fmt!=='pct'&&!c.avg)return `<td style="padding:7px 10px;text-align:right;font-size:12.5px;font-weight:700;color:#374151">${totals[c.k]?fmtN(Math.round(totals[c.k])):'—'}</td>`;
    return `<td style="padding:7px 10px;text-align:right;font-size:12.5px;color:#374151">${_kpiFmt(c.calc(totals),c.fmt)}</td>`;
  }).join('');
  const subtotalRow=`<tr style="border-top:1px solid #e5e7eb;background:#f8f9fc">
    <td style="padding:7px 12px;font-size:12.5px;font-weight:700;color:#374151;background:#f8f9fc;text-align:left;white-space:nowrap">小計</td>
    ${subtotalCells}
  </tr>`;
  return `<div style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;overflow:hidden">
    <div onclick="toggleKpiGroup('${row.month}','${group.key}')" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:#fff">
      <span style="font-size:13px;font-weight:700;color:#1e293b;border-left:3px solid ${group.color};padding-left:8px">${group.title}</span>
      <span style="color:#9ca3af;display:inline-block;transition:transform .15s;transform:rotate(${expanded?90:0}deg)">▸</span>
    </div>
    ${expanded?`<div style="overflow-x:auto">
      <table style="border-collapse:collapse;table-layout:fixed;width:100%;min-width:700px">${colgroup}<thead>${thead}</thead><tbody>${bodyRows}${subtotalRow}</tbody></table>
    </div>`:''}
  </div>`;
}
// ── 檢視狀態：月結表／年度總表 切換、目前選的年月（預設今天所在的年月）──
let _kpiViewMode='month';
const _KPI_NOW=new Date();
let _kpiCurYear=_KPI_NOW.getFullYear();
let _kpiCurMonthNum=_KPI_NOW.getMonth()+1;
function _kpiYM(){return `${_kpiCurYear}-${String(_kpiCurMonthNum).padStart(2,'0')}`;}
function _kpiYearOptions(){
  const cur=_KPI_NOW.getFullYear();
  const years=[];
  for(let y=cur-2;y<=cur+1;y++)years.push(y);
  if(!years.includes(_kpiCurYear))years.push(_kpiCurYear);
  return years.sort((a,b)=>a-b);
}
function setKpiViewMode(mode){_kpiViewMode=mode;renderKpiTab();}
function setKpiYear(y){_kpiCurYear=parseInt(y);renderKpiTab();}
function setKpiMonthNum(m){_kpiCurMonthNum=parseInt(m);renderKpiTab();}
function _kpiMonthViewHtml(){
  const month=_kpiYM();
  const row=getOrCreateKpiRow(month);
  const yearOpts=_kpiYearOptions().map(y=>`<option value="${y}"${y===_kpiCurYear?' selected':''}>${y}年</option>`).join('');
  const monthOpts=Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}"${m===_kpiCurMonthNum?' selected':''}>${m}月</option>`).join('');
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
    <select onchange="setKpiYear(this.value)" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;font-weight:600;outline:none;cursor:pointer;font-variant-numeric:tabular-nums">${yearOpts}</select>
    <select onchange="setKpiMonthNum(this.value)" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;font-weight:600;outline:none;cursor:pointer;font-variant-numeric:tabular-nums">${monthOpts}</select>
    <button onclick="deleteKpiRow('${month}')" style="background:none;border:none;color:#d1d5db;cursor:pointer;font-size:12px;margin-left:4px" title="清空這個月份的資料">清空此月份</button>
  </div>
  ${_kpiSummaryCardsHtml(row)}
  ${KPI_GROUPS.map(g=>_kpiGroupTableHtml(row,g)).join('')}
  <div style="margin-top:6px"><span style="font-size:11px;color:#9ca3af">灰底欄位為公式自動計算，白底欄位點擊可編輯，點分組列可展開/收合明細</span></div>`;
}
// 年度總表：統一成一張表，列＝各賣場（依組別分段），欄＝12個月＋全年營收/純利/純利率，
// 不再是「月份 x 組別」趨勢表跟「各賣場全年統計」上下兩張表並存。
// 每個賣場固定顯示兩排：上面營收、下面純利（方案 F 的兩排版本，不用展開/切換）。
// 全年欄位固定同時顯示營收+純利，並附上跟去年全年比的成長率。
// 算某個賣場在指定年度的全年營收/純利（沿用月結表明細排除合併/不適用欄位的邏輯）。
function _kpiShopAnnualTotal(rows,year,group,shop,pureKey){
  let rev=0,pure=0;
  for(let m=1;m<=12;m++){
    const month=`${year}-${String(m).padStart(2,'0')}`;
    const row=rows.find(r=>r.month===month);
    if(!row)continue;
    const raw=row[group.key]?.[shop]||{};
    let rawForCalc=raw;
    if(group.fieldMerge){
      const zeroFields={};
      Object.keys(group.fieldMerge).forEach(f=>{if(_kpiFieldMergeStatus(group,f,shop))zeroFields[f]=0;});
      if(Object.keys(zeroFields).length)rawForCalc={...raw,...zeroFields};
    }
    const d=_kpiCalcAll(rawForCalc,group);
    rev+=d.rev||0;pure+=d[pureKey]||0;
  }
  return{rev,pure};
}
function _kpiYoyHtml(cur,prev){
  if(!prev)return '';
  const pct=(cur-prev)/prev*100;
  const color=pct>=0?'#059669':'#dc2626';
  const sign=pct>=0?'+':'';
  return ` <span style="font-weight:400;font-size:11px;color:${color}">(${sign}${pct.toFixed(1)}%)</span>`;
}
// 每個賣場給一個淺色底色（同品牌不同平台的變體共用同一色，例如「好麻吉」「商城-好麻吉」「mo+0號店(好麻吉)」都算橘色）。
const KPI_SHOP_COLORS=[
  {key:'好麻吉',bg:'#FFF1E0'},
  {key:'玩樂',bg:'#F1EAFB'},
  {key:'維克',bg:'#E8F1FC'},
  {key:'森之旅',bg:'#E9F7EC'},
  {key:'酷澎買斷',bg:'#FDECEF'},
  {key:'MOMO-甲配',bg:'#EEF0FA'},
  {key:'露營館',bg:'#FBEAF0'},
];
function _kpiShopBgColor(shop){
  const found=KPI_SHOP_COLORS.find(c=>shop.includes(c.key));
  return found?found.bg:'#ffffff';
}
function _kpiYearViewHtml(){
  const yearOpts=_kpiYearOptions().map(y=>`<option value="${y}"${y===_kpiCurYear?' selected':''}>${y}年</option>`).join('');
  const rows=getKpiRows();
  const prevYear=_kpiCurYear-1;
  const monthGrandRev=Array(12).fill(0),monthGrandPure=Array(12).fill(0);
  let grandRev=0,grandPure=0,grandPrevRev=0,grandPrevPure=0;
  const groupBlocks=KPI_GROUPS.map(g=>{
    const pureKey=g.formula.find(f=>f.l.includes('純利')&&!f.l.includes('率'))?.k;
    let groupRev=0,groupPure=0,groupPrevRev=0,groupPrevPure=0;
    const shopTrs=g.shops.map(shop=>{
      let annualRev=0,annualPure=0;
      const monthRevTds=[],monthPureTds=[];
      for(let i=0;i<12;i++){
        const month=`${_kpiCurYear}-${String(i+1).padStart(2,'0')}`;
        const row=rows.find(r=>r.month===month);
        if(!row){
          monthRevTds.push(`<td style="padding:5px 6px;text-align:left;font-size:11.5px;color:#d1d5db">—</td>`);
          monthPureTds.push(`<td style="padding:5px 6px;text-align:left;font-size:11.5px;color:#d1d5db">—</td>`);
          continue;
        }
        const raw=row[g.key]?.[shop]||{};
        // 有些欄位這個賣場是合併/不適用（例如 MOMO 寄倉運費好麻吉/森之旅共用），
        // 算純利時要當作 0，不能讓公式因為缺值變成 NaN（跟月結表明細的邏輯一致）。
        let rawForCalc=raw;
        if(g.fieldMerge){
          const zeroFields={};
          Object.keys(g.fieldMerge).forEach(f=>{if(_kpiFieldMergeStatus(g,f,shop))zeroFields[f]=0;});
          if(Object.keys(zeroFields).length)rawForCalc={...raw,...zeroFields};
        }
        const d=_kpiCalcAll(rawForCalc,g);
        const pureV=d[pureKey]||0,revV=d.rev||0;
        annualRev+=revV;annualPure+=pureV;
        monthGrandRev[i]+=revV;monthGrandPure[i]+=pureV;
        monthRevTds.push(`<td style="padding:5px 6px;text-align:left;font-size:11.5px;color:#6b7280">${revV?fmtN(Math.round(revV)):'—'}</td>`);
        monthPureTds.push(`<td style="padding:5px 6px;text-align:left;font-size:11.5px;color:${pureV<0?'#dc2626':'#374151'}">${pureV?fmtN(Math.round(pureV)):'—'}</td>`);
      }
      groupRev+=annualRev;groupPure+=annualPure;grandRev+=annualRev;grandPure+=annualPure;
      const prev=_kpiShopAnnualTotal(rows,prevYear,g,shop,pureKey);
      groupPrevRev+=prev.rev;groupPrevPure+=prev.pure;grandPrevRev+=prev.rev;grandPrevPure+=prev.pure;
      const rate=annualRev>0?annualPure/annualRev*100:null;
      const bg=_kpiShopBgColor(shop);
      return `<tr style="border-top:1px solid #f0f0f0;background:${bg}">
        <td rowspan="2" style="padding:6px 12px 6px 20px;font-size:12.5px;font-weight:600;color:#374151;text-align:left;white-space:nowrap;vertical-align:middle">${shop}</td>
        <td style="padding:5px 8px;font-size:10.5px;color:#9ca3af;white-space:nowrap">營收</td>
        ${monthRevTds.join('')}
        <td rowspan="2" style="padding:6px 8px;text-align:left;font-size:11.5px;color:#6b7280;vertical-align:middle">${annualRev?fmtN(Math.round(annualRev)):'—'}${_kpiYoyHtml(annualRev,prev.rev)}</td>
        <td rowspan="2" style="padding:6px 8px;text-align:left;font-size:11.5px;font-weight:700;color:${annualPure<0?'#dc2626':'#059669'};vertical-align:middle">${annualRev||annualPure?fmtN(Math.round(annualPure)):'—'}${_kpiYoyHtml(annualPure,prev.pure)}</td>
        <td rowspan="2" style="padding:6px 8px;text-align:left;font-size:11.5px;vertical-align:middle">${rate!==null?rate.toFixed(2)+'%':'—'}</td>
      </tr>
      <tr style="background:${bg}">
        <td style="padding:5px 8px;font-size:10.5px;color:#9ca3af;white-space:nowrap">純利</td>
        ${monthPureTds.join('')}
      </tr>`;
    }).join('');
    // 整組共同費用（如物流運費）全年加總要扣掉，跟賣場明細頁的小計邏輯一致（今年、去年都要扣）。
    if(g.commonCostLabel){
      for(let m=1;m<=12;m++){
        const monthCur=`${_kpiCurYear}-${String(m).padStart(2,'0')}`;
        const rowCur=rows.find(r=>r.month===monthCur);
        const cCur=rowCur?.[g.key+'Common']||0;
        groupPure-=cCur;grandPure-=cCur;
        const monthPrev=`${prevYear}-${String(m).padStart(2,'0')}`;
        const rowPrev=rows.find(r=>r.month===monthPrev);
        const cPrev=rowPrev?.[g.key+'Common']||0;
        groupPrevPure-=cPrev;grandPrevPure-=cPrev;
      }
    }
    const groupRate=groupRev>0?groupPure/groupRev*100:null;
    const headerRow=`<tr style="background:#f8f9fc;border-top:1px solid #e5e7eb">
      <td colspan="17" style="padding:7px 12px;font-size:12.5px;font-weight:700;color:#1e293b;border-left:3px solid ${g.color};text-align:left;white-space:nowrap">${g.title}
        <span style="font-weight:400;color:#9ca3af;margin-left:10px">全年純利 <b style="font-weight:700;color:${groupPure>=0?'#059669':'#dc2626'}">${fmtN(Math.round(groupPure))}</b>${_kpiYoyHtml(groupPure,groupPrevPure)}${groupRate!==null?`　純利率 ${groupRate.toFixed(2)}%`:''}</span>
      </td>
    </tr>`;
    return headerRow+shopTrs;
  }).join('');
  const grandRate=grandRev>0?grandPure/grandRev*100:null;
  const monthGrandRevTds=monthGrandRev.map(v=>`<td style="padding:6px 6px;text-align:left;font-size:11.5px;font-weight:700;color:#6b7280">${fmtN(Math.round(v))}</td>`).join('');
  const monthGrandPureTds=monthGrandPure.map(v=>`<td style="padding:6px 6px;text-align:left;font-size:11.5px;font-weight:700;color:${v<0?'#dc2626':'#374151'}">${fmtN(Math.round(v))}</td>`).join('');
  const grandRow=`<tr style="border-top:2px solid #e5e7eb;background:#f8f9fc">
    <td rowspan="2" style="padding:7px 12px;font-size:12.5px;font-weight:700;vertical-align:middle">全年總計</td>
    <td style="padding:5px 8px;font-size:10.5px;color:#9ca3af">營收</td>
    ${monthGrandRevTds}
    <td rowspan="2" style="padding:6px 8px;text-align:left;font-size:11.5px;font-weight:700;vertical-align:middle">${fmtN(Math.round(grandRev))}${_kpiYoyHtml(grandRev,grandPrevRev)}</td>
    <td rowspan="2" style="padding:6px 8px;text-align:left;font-size:11.5px;font-weight:700;color:${grandPure>=0?'#059669':'#dc2626'};vertical-align:middle">${fmtN(Math.round(grandPure))}${_kpiYoyHtml(grandPure,grandPrevPure)}</td>
    <td rowspan="2" style="padding:6px 8px;text-align:left;font-size:11.5px;font-weight:700;vertical-align:middle">${grandRate!==null?grandRate.toFixed(2)+'%':'—'}</td>
  </tr>
  <tr style="background:#f8f9fc">
    <td style="padding:5px 8px;font-size:10.5px;color:#9ca3af">純利</td>
    ${monthGrandPureTds}
  </tr>`;
  const monthHeaders=Array.from({length:12},(_,i)=>`<th style="padding:7px 6px;color:#6b7280;font-size:11px;font-weight:700;text-align:left;white-space:nowrap">${i+1}月</th>`).join('');
  return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
    <select onchange="setKpiYear(this.value)" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;font-weight:600;outline:none;cursor:pointer;font-variant-numeric:tabular-nums">${yearOpts}</select>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;overflow-x:auto">
    <table style="border-collapse:collapse;table-layout:fixed;width:100%;min-width:1250px">
      <colgroup><col style="width:110px"><col style="width:44px">${Array.from({length:12}).map(()=>'<col style="width:52px">').join('')}<col style="width:100px"><col style="width:100px"><col style="width:70px"></colgroup>
      <thead><tr style="background:#f8f9fc">
        <th style="text-align:left;padding:7px 12px;color:#6b7280;font-size:11.5px;font-weight:700">賣場</th>
        <th></th>
        ${monthHeaders}
        <th style="text-align:left;padding:7px 8px;color:#6b7280;font-size:11px;font-weight:700">全年營收</th>
        <th style="text-align:left;padding:7px 8px;color:#6b7280;font-size:11px;font-weight:700">全年純利</th>
        <th style="text-align:left;padding:7px 8px;color:#6b7280;font-size:11px;font-weight:700">純利率</th>
      </tr></thead>
      <tbody>${groupBlocks}${grandRow}</tbody>
    </table>
  </div>`;
}
function renderKpiTab(){
  const el=document.getElementById('kpi-tab-content');
  if(!el)return;
  const modeTabsHtml=`<div style="display:flex;gap:6px;margin-bottom:16px;border-bottom:1px solid #e5e7eb">
    <div onclick="setKpiViewMode('month')" style="padding:8px 16px;font-size:13px;font-weight:${_kpiViewMode==='month'?700:400};color:${_kpiViewMode==='month'?'#5b5fcf':'#9ca3af'};border-bottom:2px solid ${_kpiViewMode==='month'?'#5b5fcf':'transparent'};cursor:pointer">月結表</div>
    <div onclick="setKpiViewMode('year')" style="padding:8px 16px;font-size:13px;font-weight:${_kpiViewMode==='year'?700:400};color:${_kpiViewMode==='year'?'#5b5fcf':'#9ca3af'};border-bottom:2px solid ${_kpiViewMode==='year'?'#5b5fcf':'transparent'};cursor:pointer">年度總表</div>
    <div onclick="setKpiViewMode('score')" style="padding:8px 16px;font-size:13px;font-weight:${_kpiViewMode==='score'?700:400};color:${_kpiViewMode==='score'?'#5b5fcf':'#9ca3af'};border-bottom:2px solid ${_kpiViewMode==='score'?'#5b5fcf':'transparent'};cursor:pointer">評分表</div>
  </div>`;
  const body=_kpiViewMode==='year'?_kpiYearViewHtml():_kpiViewMode==='score'?_kpiScoreViewHtml():_kpiMonthViewHtml();
  el.innerHTML=`<div style="padding:14px 16px 16px">${modeTabsHtml}${body}</div>`;
  if(_kpiViewMode==='score'){renderScoreComparisonTable();renderScoreDetailPanel();}
}
function buildKpiTabHtml(){
  return `<div style="background:white;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div id="kpi-tab-content"></div>
  </div>`;
}

// ── KPI 評分表：季度 KPI 目標與權重設定 + 賣場月度評分比較 + 新品加分 ──
const SCORE_SHOPS=[
  {id:'好麻吉', pos:'大盤經營型｜重效率'},
  {id:'玩樂', pos:'成長放大型｜重成長'},
  {id:'森之旅', pos:'盤整修復型｜重體質'},
];
const SCORE_QUARTER_MONTHS={1:[1,2,3],2:[4,5,6],3:[7,8,9],4:[10,11,12]};
// 歷史種子資料（來自使用者提供的 Excel，Q2/Q3 目標與 4~7月實際數字）—
// 只在雲端/本機都還沒有對應資料時當預設值顯示，使用者一旦編輯就會改存真正的資料，不會被這裡覆蓋。
const SCORE_DEFAULT_TARGETS={
  2:{ 好麻吉:{rev:[24,20],grow:[12,null],ads:[70,50],bad:[10,15],w:[25,35,20,20]},
      玩樂:{rev:[24,20],grow:[15,null],ads:[70,50],bad:[10,15],w:[30,40,15,15]},
      森之旅:{rev:[22,18],grow:[10,null],ads:[60,40],bad:[15,20],w:[40,30,15,15]} },
  3:{ 好麻吉:{rev:[24,20],grow:[10,5],ads:[70,50],bad:[10,15],w:[25,35,20,20]},
      玩樂:{rev:[24,20],grow:[12,5],ads:[70,50],bad:[10,15],w:[25,30,20,25]},
      森之旅:{rev:[22,18],grow:[5,2],ads:[60,40],bad:[15,20],w:[30,10,30,30]} },
};
const SCORE_DEFAULT_MONTHLY={
  '2026-04':{ 好麻吉:{revA:24.86,prevProfit:1043332,curProfit:1243293,adsA:70,badA:8},
              玩樂:{revA:22.96,prevProfit:341737,curProfit:332194,adsA:55,badA:17},
              森之旅:{revA:21.14,prevProfit:111588,curProfit:108830,adsA:44,badA:25} },
  '2026-05':{ 好麻吉:{revA:25.99,prevProfit:1243293,curProfit:1288341,adsA:75,badA:6},
              玩樂:{revA:24.22,prevProfit:332194,curProfit:360003,adsA:65,badA:10},
              森之旅:{revA:20.75,prevProfit:108830,curProfit:77545,adsA:54,badA:17} },
  '2026-06':{ 好麻吉:{revA:24.83,prevProfit:1288341,curProfit:1331647,adsA:70,badA:8},
              玩樂:{revA:23.26,prevProfit:360003,curProfit:405220,adsA:53,badA:19},
              森之旅:{revA:18.94,prevProfit:77545,curProfit:68999,adsA:37,badA:24} },
  '2026-07':{ 好麻吉:{revA:24.83,prevProfit:1331647,curProfit:null,adsA:70,badA:8},
              玩樂:{revA:22.94,prevProfit:399710,curProfit:null,adsA:53,badA:19},
              森之旅:{revA:18.43,prevProfit:77545,curProfit:67134,adsA:37,badA:24} },
};

function getScoreTargetsAll(){
  try{
    if(typeof Store!='undefined'&&Store._profitMem?._score_targets_v1)return Store._profitMem._score_targets_v1;
    const s=localStorage.getItem('ec_score_targets_v1');return s?JSON.parse(s):{};
  }catch{return {};}
}
function saveScoreTargetsAll(all){
  try{localStorage.setItem('ec_score_targets_v1',JSON.stringify(all));}catch{}
  try{if(typeof Store!=='undefined'){Store._profitMem=Store._profitMem||{};Store._profitMem._score_targets_v1=all;}}catch{}
  if(window.__cloudProfit&&typeof window.__cloudProfit.setField==='function'){
    window.__cloudProfit.setField('_score_targets_v1', all).catch(e=>console.warn('[評分表] 目標雲端同步失敗',e));
  }
}
function getScoreTargetsForQ(year,q){
  const all=getScoreTargetsAll();
  const key=year+'-Q'+q;
  if(all[key])return all[key];
  return SCORE_DEFAULT_TARGETS[q]||null;
}

function getScoreMonthlyAll(){
  try{
    if(typeof Store!='undefined'&&Store._profitMem?._score_monthly_v1)return Store._profitMem._score_monthly_v1;
    const s=localStorage.getItem('ec_score_monthly_v1');return s?JSON.parse(s):{};
  }catch{return {};}
}
function saveScoreMonthlyAll(all){
  try{localStorage.setItem('ec_score_monthly_v1',JSON.stringify(all));}catch{}
  try{if(typeof Store!=='undefined'){Store._profitMem=Store._profitMem||{};Store._profitMem._score_monthly_v1=all;}}catch{}
  if(window.__cloudProfit&&typeof window.__cloudProfit.setField==='function'){
    window.__cloudProfit.setField('_score_monthly_v1', all).catch(e=>console.warn('[評分表] 月度雲端同步失敗',e));
  }
}
function getScoreMonthlyForKey(monthKey){
  const all=getScoreMonthlyAll();
  if(all[monthKey])return all[monthKey];
  return SCORE_DEFAULT_MONTHLY[monthKey]||{};
}

function getScoreBonusAll(){
  try{
    if(typeof Store!='undefined'&&Store._profitMem?._score_bonus_v1)return Store._profitMem._score_bonus_v1;
    const s=localStorage.getItem('ec_score_bonus_v1');return s?JSON.parse(s):{};
  }catch{return {};}
}
function saveScoreBonusAll(all){
  try{localStorage.setItem('ec_score_bonus_v1',JSON.stringify(all));}catch{}
  try{if(typeof Store!=='undefined'){Store._profitMem=Store._profitMem||{};Store._profitMem._score_bonus_v1=all;}}catch{}
  if(window.__cloudProfit&&typeof window.__cloudProfit.setField==='function'){
    window.__cloudProfit.setField('_score_bonus_v1', all).catch(e=>console.warn('[評分表] 加分雲端同步失敗',e));
  }
}

// 通用計分公式：達到目標拿滿分；界於目標與低標之間按比例；低於低標不得分。
// lowerBetter=true 時方向相反（用於低效廣告率：越低越好）。
function scoreCalcMetric(actual,target,low,weight,lowerBetter){
  if(actual==null||isNaN(actual)||target==null)return 0;
  if(!lowerBetter){
    if(actual>=target)return weight;
    if(low==null)return 0;
    if(actual<=low)return 0;
    return weight*(actual-low)/(target-low);
  }else{
    if(actual<=target)return weight;
    if(low==null)return 0;
    if(actual>=low)return 0;
    return weight*(low-actual)/(low-target);
  }
}
function scoreRound(n){return Math.round(n*100)/100;}
function computeShopMonthScore(shop,year,monthNum,q){
  const t=getScoreTargetsForQ(year,q)?.[shop];
  if(!t)return null;
  const monthKey=year+'-'+String(monthNum).padStart(2,'0');
  const m=getScoreMonthlyForKey(monthKey)[shop]||{};
  const hasData=m.revA!=null;
  const growA=(m.prevProfit>0&&m.curProfit!=null)?scoreRound((m.curProfit/m.prevProfit-1)*100):null;
  const revS=scoreRound(scoreCalcMetric(m.revA,t.rev[0],t.rev[1],t.w[0],false));
  const growS=growA==null?0:scoreRound(scoreCalcMetric(growA,t.grow[0],t.grow[1],t.w[1],false));
  const adsS=scoreRound(scoreCalcMetric(m.adsA,t.ads[0],t.ads[1],t.w[2],false));
  const badS=scoreRound(scoreCalcMetric(m.badA,t.bad[0],t.bad[1],t.w[3],true));
  const total=scoreRound(revS+growS+adsS+badS);
  return {t,m,growA,revS,growS,adsS,badS,total,hasData};
}
function scoreColor(s){
  if(s>=80)return{bg:'#ecfdf5',fg:'#059669',border:'#a7f3d0'};
  if(s>=50)return{bg:'#fffbeb',fg:'#b45309',border:'#fde68a'};
  return{bg:'#fef2f2',fg:'#dc2626',border:'#fecaca'};
}
// 單一指標的配分上限每個賣場都不一樣，不能直接套 scoreColor 的 80/50 門檻，
// 改用「拿到的分數 ÷ 該指標配分」的比例來判斷顏色。
function scoreRatioColor(score,weight){
  if(!weight)return{bg:'#f3f4f6',fg:'#9ca3af',border:'#e5e7eb'};
  const ratio=score/weight;
  if(ratio>=0.8)return{bg:'#ecfdf5',fg:'#059669',border:'#a7f3d0'};
  if(ratio>=0.4)return{bg:'#fffbeb',fg:'#b45309',border:'#fde68a'};
  return{bg:'#fef2f2',fg:'#dc2626',border:'#fecaca'};
}

function _scoreDefaultQ(){return Math.ceil((_KPI_NOW.getMonth()+1)/3);}
let _scoreCurQ=_scoreDefaultQ();
let _scoreCurYear=_KPI_NOW.getFullYear();
let _scoreDefsOpen=false;
// 明細用「點分數」決定要看哪幾格，可以點多格一起比較（不限同一個月或同一個賣場）——
// key 格式 "賣場|月份"。預設勾本季最新一個有資料月份的三個賣場。
function _scoreDefaultDetailCells(year,q){
  const months=SCORE_QUARTER_MONTHS[q];
  const withData=months.filter(m=>SCORE_SHOPS.some(s=>computeShopMonthScore(s.id,year,m,q)?.hasData));
  if(!withData.length)return new Set();
  const lastMonth=withData[withData.length-1];
  return new Set(SCORE_SHOPS.map(s=>s.id+'|'+lastMonth));
}
let _scoreDetailCells=_scoreDefaultDetailCells(_scoreCurYear,_scoreCurQ);

function setScoreQ(q){_scoreCurQ=q;_scoreDetailCells=_scoreDefaultDetailCells(_scoreCurYear,q);renderKpiTab();}
function toggleScoreDefs(){_scoreDefsOpen=!_scoreDefsOpen;renderKpiTab();}
function toggleScoreDetailCell(shop,month){
  const key=shop+'|'+month;
  if(_scoreDetailCells.has(key))_scoreDetailCells.delete(key);else _scoreDetailCells.add(key);
  renderScoreComparisonTable();
  renderScoreDetailPanel();
}

function scoreDefsHtml(q){
  const targets=getScoreTargetsForQ(_scoreCurYear,q);
  const growHasLow=targets?Object.values(targets).some(d=>d.grow[1]!=null):false;
  const defs=[
    {l:'純利率達成',def:'實際淨利率 ÷ 目標淨利率',rule:'大於等於目標：得滿分／界於目標與低標之間：依滿分比例計算／低於低標：不得分'},
    {l:'純利成長率',def:'(本期淨利 ÷ 前期淨利) － 1',rule:growHasLow?'大於等於目標：得滿分／界於目標與低標之間：依滿分比例計算／低於低標：不得分':'大於等於目標：得滿分／未達目標：不得分'},
    {l:'廣告合格率',def:'投廣商品中「淨利率 ≥ 20%」的商品數 ÷ 投廣商品數',rule:'大於等於目標：得滿分／界於目標與低標之間：依滿分比例計算／低於低標：不得分'},
    {l:'低效廣告率',def:'投廣商品中「淨利率 < 10%」的商品數 ÷ 投廣商品數',rule:'小於等於目標：得滿分／界於目標與低標之間：依滿分比例計算／大於低標：不得分（此項越低越好，方向跟其他三項相反）'},
  ];
  return defs.map((d,i)=>`<div style="padding:12px 16px;${i>0?'border-top:1px solid #f3f4f6':''}">
    <div style="font-size:12.5px;font-weight:700;color:#374151;margin-bottom:3px">${d.l}</div>
    <div style="font-size:11.5px;color:#6b7280;margin-bottom:4px">定義：${d.def}</div>
    <div style="font-size:11.5px;color:#9ca3af;line-height:1.6">計分：${d.rule}</div>
  </div>`).join('');
}

function scoreBonusHtml(){
  const key=_scoreCurYear+'-Q'+_scoreCurQ;
  const all=getScoreBonusAll();
  const count=all[key]?.count||0;
  const score=Math.min(count*2,10);
  return `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:8px;background:#fafafe">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:13px;font-weight:700;color:#374151">加分項　<span style="font-size:11px;font-weight:400;color:#9ca3af">不限賣場</span></div>
      <div style="display:flex;align-items:center;gap:8px">
        <button onclick="adjustScoreBonus(-1)" style="width:24px;height:24px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;line-height:1">－</button>
        <span style="font-size:13px;font-weight:700;color:#374151;min-width:16px;text-align:center">${count}</span>
        <button onclick="adjustScoreBonus(1)" style="width:24px;height:24px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;line-height:1">＋</button>
        <span style="font-size:12px;font-weight:700;color:#5b5fcf;margin-left:4px">+${score} 分</span>
      </div>
    </div>
    <div style="font-size:12px;color:#6b7280;line-height:1.6">新品 1 支加 2 分，上限 5 支／10 分<br>條件：附蝦皮連結，次月 5 號前填寫上月新品，需於當月底前完成上架</div>
  </div>`;
}
function adjustScoreBonus(delta){
  const key=_scoreCurYear+'-Q'+_scoreCurQ;
  const all=getScoreBonusAll();
  const cur=all[key]?.count||0;
  all[key]={count:Math.max(0,Math.min(5,cur+delta))};
  saveScoreBonusAll(all);
  renderKpiTab();
}

function _kpiScoreViewHtml(){
  const year=_scoreCurYear,q=_scoreCurQ;
  const targets=getScoreTargetsForQ(year,q);
  const qTabsHtml=[1,2,3,4].map(qq=>`<div onclick="setScoreQ(${qq})" style="padding:5px 14px;font-size:12px;font-weight:${qq===q?700:600};border-radius:16px;border:1px solid ${qq===q?'#5b5fcf':'#e5e7eb'};background:${qq===q?'#5b5fcf':''};color:${qq===q?'#fff':'#9ca3af'};cursor:pointer">Q${qq}</div>`).join('');

  const targetCardHtml=targets?SCORE_SHOPS.map((s,i)=>{
    const d=targets[s.id];
    if(!d)return'';
    const metrics=[{k:'rev',l:'純利率'},{k:'grow',l:'純利成長'},{k:'ads',l:'廣告合格率'},{k:'bad',l:'低效廣告率'}];
    return `<div style="padding:14px 16px;${i>0?'border-top:1px solid #f3f4f6':''}">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px">
        <div style="font-size:13.5px;font-weight:700;color:#374151">${s.id}</div>
        <div style="font-size:11px;color:#9ca3af">${s.pos}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        ${metrics.map((m,mi)=>`
          <div style="background:#f8f9fc;border-radius:8px;padding:8px 10px">
            <div style="font-size:10.5px;color:#9ca3af;font-weight:600;margin-bottom:4px">${m.l}</div>
            <div style="font-size:14px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums">${d[m.k][0]}%<span style="font-size:10.5px;font-weight:400;color:#b0b4c0"> / 低標 ${d[m.k][1]!=null?d[m.k][1]+'%':'—'}</span></div>
            <div style="font-size:10px;color:#5b5fcf;font-weight:600;margin-top:2px">配分 ${d.w[mi]} 分</div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join(''):`<div style="padding:24px;text-align:center;font-size:12px;color:#9ca3af">Q${q} 還沒有 KPI 目標設定，請按上面「✎ 編輯本季指標」建立</div>`;

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div style="display:flex;gap:6px">${qTabsHtml}</div>
    <div style="font-size:11px;color:#9ca3af">每季指標與權重可獨立調整</div>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <div style="font-size:13px;font-weight:700;color:#374151">Q${q} KPI 目標與權重設定</div>
    <div style="font-size:12px;font-weight:600;color:#5b5fcf;cursor:pointer" onclick="openEditScoreTargetsModal()">✎ 編輯本季指標</div>
  </div>

  <div onclick="toggleScoreDefs()" style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#5b5fcf;cursor:pointer;margin-bottom:10px">
    <span style="font-size:10px;transition:transform .15s;display:inline-block;${_scoreDefsOpen?'transform:rotate(90deg)':''}">▶</span>ⓘ 指標定義與計分方式說明
  </div>
  <div style="display:${_scoreDefsOpen?'block':'none'};border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:10px">${scoreDefsHtml(q)}</div>

  <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:8px">${targetCardHtml}</div>
  <div style="font-size:11px;color:#9ca3af;margin-bottom:24px">配分欄位總和建議為 100 分；按「✎ 編輯本季指標」可調整目標／低標／配分</div>

  <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px">賣場月度評分比較｜Q${q}</div>
  <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:10px" id="score-cmp-table"></div>
  <div style="font-size:11px;color:#9ca3af;margin-bottom:10px">點分數看明細，可以點多個一起比較；灰色分數代表當月還沒有資料</div>

  <div id="score-detail-panel" style="margin-bottom:20px"></div>

  ${q>=3?scoreBonusHtml():''}

  <div style="font-size:11px;color:#9ca3af">灰底欄位為公式自動帶入（依本季目標計算），白底欄位為每月手動填寫的實際數字</div>
  `;
}

function renderScoreComparisonTable(){
  const container=document.getElementById('score-cmp-table');
  if(!container)return;
  const year=_scoreCurYear,q=_scoreCurQ;
  const months=SCORE_QUARTER_MONTHS[q];
  const monthHeads=months.map(m=>`<th style="text-align:center;padding:8px 6px;font-size:11px;color:#6b7280;font-weight:700;min-width:64px">${m}月</th>`).join('');
  const rows=SCORE_SHOPS.map(s=>{
    const cells=months.map(m=>{
      const r=computeShopMonthScore(s.id,year,m,q);
      if(!r||!r.hasData)return `<td style="text-align:center;padding:8px 6px"><span style="color:#d1d5db;font-size:12px">—</span></td>`;
      const col=scoreColor(r.total);
      const active=_scoreDetailCells.has(s.id+'|'+m);
      return `<td style="text-align:center;padding:8px 6px">
        <span onclick="toggleScoreDetailCell('${s.id}',${m})" style="display:inline-block;min-width:44px;padding:3px 8px;border-radius:7px;background:${col.bg};color:${col.fg};border:${active?'1.5px solid '+col.fg:'1px solid '+col.border};font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;cursor:pointer">${r.total}</span>
      </td>`;
    }).join('');
    const vals=months.map(m=>{const r=computeShopMonthScore(s.id,year,m,q);return r&&r.hasData?r.total:null;}).filter(v=>v!=null);
    const avg=vals.length?scoreRound(vals.reduce((a,b)=>a+b,0)/vals.length):null;
    return `<tr style="border-top:1px solid #f3f4f6">
      <td style="padding:8px 12px"><div style="font-size:13px;font-weight:700;color:#374151">${s.id}</div><div style="font-size:10.5px;color:#9ca3af">${s.pos}</div></td>
      ${cells}
      <td style="text-align:center;padding:8px 10px;font-size:13px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums">${avg==null?'—':avg}</td>
    </tr>`;
  }).join('');
  container.innerHTML=`<table style="width:100%;border-collapse:collapse">
    <thead><tr style="background:#f8f9fc">
      <th style="text-align:left;padding:8px 12px;font-size:11px;color:#6b7280;font-weight:700">賣場</th>
      ${monthHeads}
      <th style="text-align:center;padding:8px 10px;font-size:11px;color:#6b7280;font-weight:700">本季平均</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function scoreShopMonthDetailHtml(s,year,month,q,isLast){
  const shop=s.id;
  const monthKey=year+'-'+String(month).padStart(2,'0');
  const r=computeShopMonthScore(shop,year,month,q);
  if(!r){
    return `<div style="padding:16px;${isLast?'':'border-bottom:1px solid #f3f4f6'};font-size:12px;color:#9ca3af">${shop}：${month}月還沒有本季目標設定</div>`;
  }
  const totCol=scoreColor(r.total);
  const metrics=[
    {l:'純利率',val:r.m.revA,target:r.t.rev[0],score:r.revS,weight:r.t.w[0],field:'revA'},
    {l:'純利成長',val:r.growA,target:r.t.grow[0],score:r.growS,weight:r.t.w[1],field:null},
    {l:'廣告合格率',val:r.m.adsA,target:r.t.ads[0],score:r.adsS,weight:r.t.w[2],field:'adsA'},
    {l:'低效廣告率',val:r.m.badA,target:r.t.bad[0],score:r.badS,weight:r.t.w[3],field:'badA'},
  ];
  const cardHtml=metrics.map(m=>{
    const col=scoreRatioColor(m.score,m.weight);
    const valDisp=m.val==null?'—':m.val+'%';
    const onclickAttr=m.field?`onclick="editScoreMonthlyCell('${monthKey}','${shop}','${m.field}',this)"`:'';
    const valStyle=m.field?'cursor:pointer;border-bottom:1px dashed #d1d5db':'';
    return `<div style="background:#f8f9fc;border-radius:8px;padding:10px 12px">
      <div style="font-size:10.5px;color:#9ca3af;font-weight:600;margin-bottom:6px">${m.l}</div>
      <div ${onclickAttr} style="font-size:16px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;display:inline-block;${valStyle}">${valDisp}</div>
      <div style="font-size:10.5px;color:#b0b4c0;margin-top:2px">目標 ${m.target}%</div>
      <div style="margin-top:6px;display:inline-block;padding:1px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${col.bg};color:${col.fg}">${m.score} 分</div>
    </div>`;
  }).join('');
  return `<div style="padding:14px 16px;${isLast?'':'border-bottom:1px solid #f3f4f6'}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="display:flex;align-items:baseline;gap:8px">
        <div style="font-size:13.5px;font-weight:700;color:#374151">${shop}</div>
        <div style="font-size:11px;color:#9ca3af">${s.pos}</div>
      </div>
      <div style="padding:3px 10px;border-radius:7px;background:${totCol.bg};color:${totCol.fg};border:1px solid ${totCol.border};font-size:13px;font-weight:700;font-variant-numeric:tabular-nums">${r.total} 分</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${cardHtml}</div>
    <div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:#9ca3af">
      <span onclick="editScoreMonthlyCell('${monthKey}','${shop}','prevProfit',this)" style="cursor:pointer;border-bottom:1px dashed #d1d5db">前期純利 <b style="color:#6b7280">${r.m.prevProfit!=null?fmtN(r.m.prevProfit):'—'}</b></span>
      <span onclick="editScoreMonthlyCell('${monthKey}','${shop}','curProfit',this)" style="cursor:pointer;border-bottom:1px dashed #d1d5db">本期純利 <b style="color:#6b7280">${r.m.curProfit!=null?fmtN(r.m.curProfit):'—'}</b></span>
    </div>
  </div>`;
}

// 明細改回「點分數」決定要看哪幾格，可以點多格一起比較（不限同一個月或同一個賣場）。
// 選到的格子照月份分組顯示，同一個月裡有選到的賣場會排在同一組底下。
function renderScoreDetailPanel(){
  const panel=document.getElementById('score-detail-panel');
  if(!panel)return;
  const year=_scoreCurYear,q=_scoreCurQ;
  const months=SCORE_QUARTER_MONTHS[q];
  const groups=months.map(month=>({
    month,
    shops:SCORE_SHOPS.filter(s=>_scoreDetailCells.has(s.id+'|'+month)),
  })).filter(g=>g.shops.length);
  if(!groups.length){
    panel.innerHTML=`<div style="padding:20px;font-size:12px;color:#9ca3af;text-align:center;border:1px dashed #e5e7eb;border-radius:10px">點上面的分數看明細，可以點多個一起比較</div>`;
    return;
  }
  panel.innerHTML=groups.map(g=>{
    const shopBlocks=g.shops.map((s,i)=>scoreShopMonthDetailHtml(s,year,g.month,q,i===g.shops.length-1)).join('');
    return `<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:10px">
      <div style="padding:8px 16px;font-size:12px;font-weight:700;color:#374151;background:#fafafe;border-bottom:1px solid #f3f4f6">${g.month}月指標明細</div>
      ${shopBlocks}
    </div>`;
  }).join('');
}

function editScoreMonthlyCell(monthKey,shop,field,tdEl){
  const all=getScoreMonthlyAll();
  if(!all[monthKey])all[monthKey]=JSON.parse(JSON.stringify(SCORE_DEFAULT_MONTHLY[monthKey]||{}));
  if(!all[monthKey][shop])all[monthKey][shop]={...(SCORE_DEFAULT_MONTHLY[monthKey]?.[shop]||{})};
  const curVal=all[monthKey][shop][field];
  const inp=document.createElement('input');
  inp.type='number';inp.step='0.01';inp.value=curVal??'';
  inp.style.cssText='width:90px;border:1.5px solid #5b5fcf;border-radius:4px;padding:2px 6px;font-size:12px;text-align:right;outline:none';
  tdEl.innerHTML='';tdEl.appendChild(inp);inp.focus();if(inp.value)inp.select();
  let done=false;
  const save=()=>{
    if(done)return;done=true;
    const v=parseFloat(inp.value);
    all[monthKey][shop][field]=isNaN(v)?null:v;
    saveScoreMonthlyAll(all);
    renderScoreComparisonTable();
    renderScoreDetailPanel();
  };
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();save();}});
  inp.addEventListener('blur',save);
}

function openEditScoreTargetsModal(){
  const year=_scoreCurYear,q=_scoreCurQ;
  const cur=getScoreTargetsForQ(year,q)||{};
  const ov=document.createElement('div');
  ov.className='ana-overlay open';ov.style.zIndex='3000';
  const metricRow=(shopId,label,key)=>{
    return `<div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr;gap:8px;align-items:center;margin-bottom:6px">
      <div style="font-size:12px;color:#6b7280">${label}</div>
      <input type="number" step="0.1" data-shop="${shopId}" data-key="${key}" data-field="target" placeholder="目標%" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px">
      <input type="number" step="0.1" data-shop="${shopId}" data-key="${key}" data-field="low" placeholder="低標%（可留空）" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px">
      <input type="number" step="1" data-shop="${shopId}" data-key="${key}" data-field="w" placeholder="配分" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px">
    </div>`;
  };
  const shopBlocks=SCORE_SHOPS.map(s=>{
    return `<div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f3f4f6">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:8px">${s.id} <span style="font-size:11px;font-weight:400;color:#9ca3af">${s.pos}</span></div>
      <div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr;gap:8px;margin-bottom:4px">
        <div></div><div style="font-size:10.5px;color:#9ca3af">目標</div><div style="font-size:10.5px;color:#9ca3af">低標</div><div style="font-size:10.5px;color:#9ca3af">配分</div>
      </div>
      ${metricRow(s.id,'純利率','rev')}${metricRow(s.id,'純利成長','grow')}${metricRow(s.id,'廣告合格率','ads')}${metricRow(s.id,'低效廣告率','bad')}
    </div>`;
  }).join('');
  ov.innerHTML=`<div class="ana-modal" style="width:520px;max-width:96vw;max-height:85vh;overflow-y:auto">
    <div class="ana-modal-hdr"><span>編輯 Q${q} KPI 目標與權重</span><button class="ana-close-btn" onclick="this.closest('.ana-overlay').remove()">✕</button></div>
    <div class="ana-modal-body" style="padding:20px">
      ${shopBlocks}
      <div style="font-size:11px;color:#9ca3af;margin-bottom:12px">低標留空代表沒有低標（未達目標就不得分）；每個賣場的配分總和建議為 100</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button onclick="this.closest('.ana-overlay').remove()" style="padding:8px 18px;border:1.5px solid #e5e7eb;border-radius:8px;background:white;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer">取消</button>
        <button onclick="saveScoreTargetsModal(this)" style="padding:8px 18px;border:0;border-radius:8px;background:#5b5fcf;font-size:13px;font-weight:700;color:white;cursor:pointer">儲存</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  SCORE_SHOPS.forEach(s=>{
    const d=cur[s.id]||{rev:[0,null],grow:[0,null],ads:[0,null],bad:[0,null],w:[25,25,25,25]};
    ['rev','grow','ads','bad'].forEach((k,ki)=>{
      ov.querySelector(`input[data-shop="${s.id}"][data-key="${k}"][data-field="target"]`).value=d[k][0]??'';
      ov.querySelector(`input[data-shop="${s.id}"][data-key="${k}"][data-field="low"]`).value=d[k][1]??'';
      ov.querySelector(`input[data-shop="${s.id}"][data-key="${k}"][data-field="w"]`).value=d.w[ki]??'';
    });
  });
}
function saveScoreTargetsModal(btn){
  const ov=btn.closest('.ana-overlay');
  const year=_scoreCurYear,q=_scoreCurQ;
  const all=getScoreTargetsAll();
  const key=year+'-Q'+q;
  const data={};
  SCORE_SHOPS.forEach(s=>{
    const get=(k,f)=>{
      const inp=ov.querySelector(`input[data-shop="${s.id}"][data-key="${k}"][data-field="${f}"]`);
      const v=parseFloat(inp.value);
      return isNaN(v)?null:v;
    };
    data[s.id]={
      rev:[get('rev','target'),get('rev','low')],
      grow:[get('grow','target'),get('grow','low')],
      ads:[get('ads','target'),get('ads','low')],
      bad:[get('bad','target'),get('bad','low')],
      w:[get('rev','w')??25,get('grow','w')??25,get('ads','w')??25,get('bad','w')??25],
    };
  });
  all[key]=data;
  saveScoreTargetsAll(all);
  ov.remove();
  renderKpiTab();
}

// ── (legacy unused) ──
// ── Tab switch ──
function setShop(shop,btn){
  curShop=shop;
  try{localStorage.setItem('ec_curShop',shop);}catch{}
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.querySelectorAll('.shop-content').forEach(el=>el.classList.remove('active'));
  document.getElementById('content-'+shop).classList.add('active');
  const wrap=document.getElementById('profit-period-wrap');
  const wrapRow=document.getElementById('profit-period-wrap-row');
  if(wrap){
    SHOPS.forEach(s=>{const el=document.getElementById('period-row-'+s.id);if(el)el.style.display=s.id===shop?'flex':'none';});
    const showPeriod=shop!=='總表';
    if(wrapRow)wrapRow.style.display=showPeriod?'flex':'none';
  }
  // show/hide KPI & upload/export when on 總表
  const isSummary=shop==='總表';
  const kpiBlock=document.getElementById('header-kpi-row');
  // 好麻吉的聯盟行銷分頁有自己獨立的總覽列，切回好麻吉時要記得沿用上次停在哪個分頁
  const onAffTab=shop==='好麻吉'&&_shopViewMode[shop]==='affiliate';
  if(kpiBlock)kpiBlock.style.display=(isSummary||onAffTab)?'none':'flex';
  const affHeaderEl=document.getElementById('aff-header-'+shop);
  if(affHeaderEl)affHeaderEl.style.display=onAffTab?'':'none';
  // sync global export button
  const gb=document.getElementById('global-exp-btn');
  if(gb){
    if(shop==='總表'){gb.disabled=true;}
    else{gb.disabled=!(state[shop]?._built?.length);}
  }
  // sync global sync button
  const sb=document.getElementById('global-sync-btn');
  if(sb){
    const hasData=shop!=='總表'&&!!(state[shop]?._built?.length);
    sb.disabled=!hasData;sb.style.opacity=hasData?'1':'0.4';sb.style.cursor=hasData?'pointer':'default';
    if(hasData){sb.style.background='#f59e0b';sb.style.color='#fff';sb.style.borderColor='#f59e0b';}
    else{sb.style.background='';sb.style.color='';sb.style.borderColor='';}
  }
  if(shop==='總表')renderSummary();
  else{if(state[shop]?._built?.length)applyFilters(shop);syncHeaderKpis(shop);}
}

const MOMO_SHOPS=['總表','甲配','乙配','MO+麻吉','MO+森之旅'];
let curMomoShop=null;

const _cupPeriod={};
function cupHalfLabel(month,half){
  const[y,mo]=month.split('/');const last=new Date(+y,+mo,0).getDate();
  if(half==='first')return`${mo}/1–${mo}/15`;
  if(half==='second')return`${mo}/16–${mo}/${last}`;
  return`${mo}/1–${mo}/${last}`;
}
function onCupMonthChange(shop,platform,sel){
  _cupPeriod[shop]=_cupPeriod[shop]||{month:'2026/06',half:'first'};
  _cupPeriod[shop].month=sel.value;
  if(platform==='coupang'){_cupPeriod[shop].half='full';}
  updateCupHalfSelect(shop,platform);
  if(platform==='coupang'&&shop!=='總表')cupTryLoadSaved(shop);
  if(platform==='coupang'&&shop==='總表')syncCoupangSummaryFromKpi();
}
function onCupHalfChange(shop,platform,sel){
  _cupPeriod[shop]=_cupPeriod[shop]||{month:'2026/06',half:'first'};
  _cupPeriod[shop].half=sel.value;
  if(platform==='coupang')cupTryLoadSaved(shop);
}
function updateCupHalfSelect(shop,platform){
  const p=_cupPeriod[shop]||{month:'2026/06',half:'first'};
  const sel=document.getElementById('cup-half-sel-'+shop);
  if(!sel)return;
  const opts=['first','second','full'];
  sel.innerHTML=opts.map(h=>`<option value="${h}"${h===p.half?' selected':''}>${cupHalfLabel(p.month,h)}</option>`).join('');
}

// ── 酷澎總表（跨店彙總儀表板）──
function coupangSumShopCardHTML(shop){
  return`<div style="background:#fff;border:1px solid #e4e6ef;border-radius:12px;padding:16px 20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-weight:700;font-size:15px;color:#1a1a2e">${shop}</span>
      <span style="font-size:12px;color:#9ca3af" id="cup-sum-${shop}-orders">— 筆訂單</span>
    </div>
    <div style="display:flex;gap:20px;margin-bottom:12px">
      <div><div style="font-size:12px;color:#9ca3af">營收</div><div style="font-size:17px;font-weight:700;color:#374151" id="cup-sum-${shop}-rev">—</div></div>
      <div><div style="font-size:12px;color:#9ca3af">純利</div><div style="font-size:17px;font-weight:700;color:#10b981" id="cup-sum-${shop}-profit">—</div></div>
      <div><div style="font-size:12px;color:#9ca3af">純利率</div><div style="font-size:17px;font-weight:700;color:#374151" id="cup-sum-${shop}-rate">—</div></div>
    </div>
    <div style="height:8px;border-radius:4px;background:#f3f4f6" id="cup-sum-${shop}-bar"></div>
  </div>`;
}
function coupangSummaryHTML(){
  _cupPeriod['總表']=_cupPeriod['總表']||{month:'2026/06',half:'full'};
  const p=_cupPeriod['總表'];
  return`
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <span style="font-size:12px;color:#6b7280;font-weight:500">月份</span>
    <select onchange="onCupMonthChange('總表','coupang',this)" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">
      ${MONTHS.map(mo=>`<option value="${mo}"${mo===p.month?' selected':''}>${mo}</option>`).join('')}
    </select>
    <div style="margin-left:auto;display:flex;gap:8px">
      <button class="col-pick-btn" id="cup-sum-view-card" onclick="setCoupangSummaryView('card')" style="border-color:#0ea5e9;color:#0ea5e9">卡片式</button>
      <button class="col-pick-btn" id="cup-sum-view-table" onclick="setCoupangSummaryView('table')">原始表格</button>
    </div>
  </div>

  <div id="cup-sum-card-view">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      <div style="background:#f8f9fc;border-radius:12px;padding:14px 16px">
        <div style="font-size:12px;color:#9ca3af;font-weight:600;margin-bottom:6px">總訂單數</div>
        <div style="font-size:22px;font-weight:700;color:#374151" id="cup-sum-kpi-orders">—</div>
      </div>
      <div style="background:#f8f9fc;border-radius:12px;padding:14px 16px">
        <div style="font-size:12px;color:#9ca3af;font-weight:600;margin-bottom:6px">總營收</div>
        <div style="font-size:22px;font-weight:700;color:#374151" id="cup-sum-kpi-rev">—</div>
      </div>
      <div style="background:#f8f9fc;border-radius:12px;padding:14px 16px">
        <div style="font-size:12px;color:#9ca3af;font-weight:600;margin-bottom:6px">總純利</div>
        <div style="font-size:22px;font-weight:700;color:#10b981" id="cup-sum-kpi-profit">—</div>
      </div>
      <div style="background:#f8f9fc;border-radius:12px;padding:14px 16px">
        <div style="font-size:12px;color:#9ca3af;font-weight:600;margin-bottom:6px">純利率</div>
        <div style="font-size:22px;font-weight:700;color:#374151" id="cup-sum-kpi-rate">—</div>
      </div>
    </div>

    <div style="background:#fff;border:1px solid #e4e6ef;border-radius:12px;padding:16px 20px;margin-bottom:20px">
      <div style="font-size:13px;color:#6b7280;font-weight:600;margin-bottom:10px">近 6 個月營收與純利趨勢</div>
      <div id="cup-sum-trend-empty" style="padding:48px 20px;text-align:center;color:#9ca3af">
        <div style="font-size:32px;margin-bottom:8px">📈</div>
        <div style="font-size:13px">尚未串接資料</div>
      </div>
      <div style="position:relative;height:240px;display:none" id="cup-sum-trend-wrap"><canvas id="cup-sum-trend-chart"></canvas></div>
    </div>

    <div style="font-size:13px;font-weight:700;color:#6b7280;margin-bottom:10px">酷澎商城</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
      ${coupangSumShopCardHTML('麻吉')}
      ${coupangSumShopCardHTML('露營館')}
      ${coupangSumShopCardHTML('買斷')}
    </div>
  </div>

  <div id="cup-sum-table-view" style="display:none">
    <div style="overflow-x:auto;border:1px solid #e4e6ef;border-radius:12px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:700">名稱</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">訂單數</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">營收</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">商品成本</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">手續費</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">退貨運費</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">稅金</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">耗材</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">純利</th>
            <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:700">純利率</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-top:1px solid #f0f2f7;font-weight:700;background:#fafbff">
            <td style="padding:8px 12px">酷澎商城</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-orders">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-rev">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-cost">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-fee">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-ret">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-tax">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-material">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-profit">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-mall-rate">—</td>
          </tr>
          <tr style="border-top:1px solid #f0f2f7">
            <td style="padding:8px 12px 8px 28px">麻吉</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-orders">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-rev">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-cost">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-fee">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-ret">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-tax">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-material">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-profit">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-麻吉-rate">—</td>
          </tr>
          <tr style="border-top:1px solid #f0f2f7">
            <td style="padding:8px 12px 8px 28px">露營館</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-orders">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-rev">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-cost">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-fee">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-ret">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-tax">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-material">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-profit">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-露營館-rate">—</td>
          </tr>
          <tr style="border-top:1px solid #f0f2f7">
            <td style="padding:8px 12px">酷澎(買斷)</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-qty">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-rev">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-cost">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-fee">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-ret">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-tax">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-material">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-profit">—</td>
            <td style="padding:8px 12px;text-align:right" id="cup-tbl-bo-rate">—</td>
          </tr>
          <tr class="tr-total">
            <td>總計</td>
            <td class="td-num" id="cup-tbl-total-orders">—</td>
            <td class="td-num" id="cup-tbl-total-rev">—</td>
            <td class="td-num" id="cup-tbl-total-cost">—</td>
            <td class="td-num" id="cup-tbl-total-fee">—</td>
            <td class="td-num" id="cup-tbl-total-ret">—</td>
            <td class="td-num" id="cup-tbl-total-tax">—</td>
            <td class="td-num" id="cup-tbl-total-material">—</td>
            <td class="td-num" id="cup-tbl-total-profit">—</td>
            <td class="td-num" id="cup-tbl-total-rate">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}
function setCoupangSummaryView(v){
  const cardEl=document.getElementById('cup-sum-card-view');
  const tableEl=document.getElementById('cup-sum-table-view');
  const btnCard=document.getElementById('cup-sum-view-card');
  const btnTable=document.getElementById('cup-sum-view-table');
  if(!cardEl||!tableEl)return;
  cardEl.style.display=v==='card'?'block':'none';
  tableEl.style.display=v==='table'?'block':'none';
  if(btnCard){btnCard.style.borderColor=v==='card'?'#0ea5e9':'';btnCard.style.color=v==='card'?'#0ea5e9':'';}
  if(btnTable){btnTable.style.borderColor=v==='table'?'#0ea5e9':'';btnTable.style.color=v==='table'?'#0ea5e9':'';}
}
// 酷澎總表的三個賣場（商城-好麻吉/商城-露營館/酷澎買斷）現在直接抓 KPI 那邊填好的資料，
// 不用再手動輸入一次；月份選單切換時（onCupMonthChange）跟頁籤第一次開啟時都會呼叫這裡。
function _cupKpiShopData(row,shop){
  const group=KPI_GROUPS.find(g=>g.key==='coupang');
  const raw=row?.coupang?.[shop]||{};
  const d=_kpiCalcAll(raw,group);
  const rev=d.rev||0,pure=d.pure||0;
  return{qty:d.qty||0,rev,cost:d.cost||0,fee:d.fee||0,ret:d.ret||0,tax:d.tax||0,material:d.material||0,pure,rate:rev>0?pure/rev*100:null};
}
function syncCoupangSummaryFromKpi(){
  const p=_cupPeriod['總表']||{month:'2026/06'};
  const month=p.month.replace('/','-');
  const row=getKpiRows().find(r=>r.month===month);
  const majhi=_cupKpiShopData(row,'商城-好麻吉');
  const camp=_cupKpiShopData(row,'商城-露營館');
  const buyout=_cupKpiShopData(row,'酷澎買斷');
  const mall={qty:majhi.qty+camp.qty,rev:majhi.rev+camp.rev,cost:majhi.cost+camp.cost,fee:majhi.fee+camp.fee,ret:majhi.ret+camp.ret,tax:majhi.tax+camp.tax,material:majhi.material+camp.material,pure:majhi.pure+camp.pure};
  mall.rate=mall.rev>0?mall.pure/mall.rev*100:null;
  const total={qty:mall.qty+buyout.qty,rev:mall.rev+buyout.rev,cost:mall.cost+buyout.cost,fee:mall.fee+buyout.fee,ret:mall.ret+buyout.ret,tax:mall.tax+buyout.tax,material:mall.material+buyout.material,pure:mall.pure+buyout.pure};
  total.rate=total.rev>0?total.pure/total.rev*100:null;

  const setTxt=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setTxt('cup-sum-kpi-orders',total.qty?fmtN(total.qty):'—');
  setTxt('cup-sum-kpi-rev',total.rev?'NT$'+fmtN(Math.round(total.rev)):'—');
  setTxt('cup-sum-kpi-profit',total.rev||total.pure?'NT$'+fmtN(Math.round(total.pure)):'—');
  setTxt('cup-sum-kpi-rate',total.rate!==null?total.rate.toFixed(2)+'%':'—');

  const fillCard=(shopLabel,d)=>{
    setTxt(`cup-sum-${shopLabel}-orders`,(d.qty?fmtN(d.qty):'0')+' 筆訂單');
    setTxt(`cup-sum-${shopLabel}-rev`,d.rev?fmtN(Math.round(d.rev)):'—');
    setTxt(`cup-sum-${shopLabel}-profit`,d.rev||d.pure?fmtN(Math.round(d.pure)):'—');
    setTxt(`cup-sum-${shopLabel}-rate`,d.rate!==null?d.rate.toFixed(2)+'%':'—');
  };
  fillCard('麻吉',majhi);
  fillCard('露營館',camp);
  fillCard('買斷',buyout);

  const fillTblRow=(prefix,d,qtyKey)=>{
    setTxt(`cup-tbl-${prefix}-${qtyKey}`,d.qty?fmtN(d.qty):'—');
    setTxt(`cup-tbl-${prefix}-rev`,d.rev?fmtN(Math.round(d.rev)):'—');
    setTxt(`cup-tbl-${prefix}-cost`,d.cost?fmtN(Math.round(d.cost)):'—');
    setTxt(`cup-tbl-${prefix}-fee`,d.fee?fmtN(Math.round(d.fee)):'—');
    setTxt(`cup-tbl-${prefix}-ret`,d.ret?fmtN(Math.round(d.ret)):'—');
    setTxt(`cup-tbl-${prefix}-tax`,d.tax?fmtN(Math.round(d.tax)):'—');
    setTxt(`cup-tbl-${prefix}-material`,d.material?fmtN(Math.round(d.material)):'—');
    setTxt(`cup-tbl-${prefix}-profit`,d.rev||d.pure?fmtN(Math.round(d.pure)):'—');
    setTxt(`cup-tbl-${prefix}-rate`,d.rate!==null?d.rate.toFixed(2)+'%':'—');
  };
  fillTblRow('mall',mall,'orders');
  fillTblRow('麻吉',majhi,'orders');
  fillTblRow('露營館',camp,'orders');
  fillTblRow('bo',buyout,'qty');
  fillTblRow('total',total,'orders');

  renderCupTrendChart(month);
}
let _cupTrendChart=null;
// 近 6 個月營收/純利趨勢：以目前選的月份為終點，往前推 6 個月，抓 KPI 三個賣場加總。
function renderCupTrendChart(endMonth){
  const emptyEl=document.getElementById('cup-sum-trend-empty');
  const wrapEl=document.getElementById('cup-sum-trend-wrap');
  const canvas=document.getElementById('cup-sum-trend-chart');
  if(!emptyEl||!wrapEl||!canvas)return;
  const rows=getKpiRows();
  const[endY,endM]=endMonth.split('-').map(Number);
  const months=[];
  for(let i=5;i>=0;i--){
    let y=endY,m=endM-i;
    while(m<=0){m+=12;y--;}
    months.push(`${y}-${String(m).padStart(2,'0')}`);
  }
  const labels=months.map(m=>m.slice(5)+'月');
  const revData=[],pureData=[];
  let hasAny=false;
  months.forEach(m=>{
    const row=rows.find(r=>r.month===m);
    const majhi=_cupKpiShopData(row,'商城-好麻吉'),camp=_cupKpiShopData(row,'商城-露營館'),buyout=_cupKpiShopData(row,'酷澎買斷');
    const rev=majhi.rev+camp.rev+buyout.rev,pure=majhi.pure+camp.pure+buyout.pure;
    if(rev)hasAny=true;
    revData.push(Math.round(rev));pureData.push(Math.round(pure));
  });
  if(!hasAny){
    emptyEl.style.display='block';wrapEl.style.display='none';
    if(_cupTrendChart){_cupTrendChart.destroy();_cupTrendChart=null;}
    return;
  }
  emptyEl.style.display='none';wrapEl.style.display='block';
  if(_cupTrendChart)_cupTrendChart.destroy();
  _cupTrendChart=new Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels,datasets:[
      {label:'營收',data:revData,borderColor:'#0ea5e9',backgroundColor:'#0ea5e9',tension:.3},
      {label:'純利',data:pureData,borderColor:'#10b981',backgroundColor:'#10b981',tension:.3},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{ticks:{callback:v=>fmtN(v)}}}}
  });
}

function momoShopHTML(shop,platform='momo'){
  const isCoupang=platform==='coupang';
  const hideCupHalf=isCoupang;
  const uploadBtn=isCoupang
    ?`<button class="export-btn" onclick="openCoupangUpload('${shop}')" style="border-color:#0ea5e9;color:#0ea5e9">⬆ 上傳檔案</button>`
    :`<button class="export-btn" disabled style="opacity:0.4;cursor:default">⬆ 上傳檔案</button>`;
  const tableArea=isCoupang
    ?`<div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px"><div class="col-picker-wrap"><button class="col-pick-btn" onclick="openCupColPicker('${shop}',this)">☰ 欄位</button></div><button class="col-pick-btn" onclick="openCoupangDist('${shop}')">📊 階層分布</button></div><div id="cup-tbl-${shop}"><div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">上傳兩個檔案後按「▶ 產生並儲存」</div></div></div>`
    :`<div style="background:#f9fafb;border:1.5px dashed #d1d5db;border-radius:10px;padding:48px;text-align:center;color:#9ca3af"><div style="font-size:36px;margin-bottom:8px">📊</div><div style="font-size:14px;font-weight:600">階層分布圖</div><div style="font-size:12px;margin-top:4px">上傳資料後可查看</div></div>`;
  _cupPeriod[shop]=_cupPeriod[shop]||{month:'2026/06',half:'first'};
  const p=_cupPeriod[shop];
  if(hideCupHalf)p.half='full';
  return`
  <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb">
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">本期總營收</div><div id="cup-kv-rev-${shop}" style="font-size:20px;font-weight:700;color:#374151">—</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">本期純利</div><div id="cup-kv-net-${shop}" style="font-size:20px;font-weight:700;color:#10b981">—</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">純利率</div><div id="cup-kv-rate-${shop}" style="font-size:20px;font-weight:700;color:#6366f1">—</div></div>
    <div style="margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:6px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:12px;color:#6b7280;font-weight:500">月份</span>
        <select onchange="onCupMonthChange('${shop}','${platform}',this)" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">
          ${MONTHS.map(mo=>`<option value="${mo}"${mo===p.month?' selected':''}>${mo}</option>`).join('')}
        </select>
        ${hideCupHalf?'':`
        <span style="font-size:12px;color:#6b7280;font-weight:500">區間</span>
        <select id="cup-half-sel-${shop}" onchange="onCupHalfChange('${shop}','${platform}',this)" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">
          ${['first','second','full'].map(h=>`<option value="${h}"${h===p.half?' selected':''}>${cupHalfLabel(p.month,h)}</option>`).join('')}
        </select>`}
      </div>
      <div style="display:flex;gap:8px">
        ${uploadBtn}
        ${isCoupang
          ?`<button class="export-btn" id="cup-sync-${shop}" disabled style="opacity:0.4;cursor:default" onclick="syncCoupangToCloud('${shop}')">☁ 同步雲端</button>`
          :`<button class="export-btn" disabled style="opacity:0.4;cursor:default">☁ 同步雲端</button>`}
        <button class="export-btn" disabled style="opacity:0.4;cursor:default">⬇ 匯出 Excel</button>
      </div>
    </div>
  </div>
  ${tableArea}`;
}

// MOMO 甲配專用畫面：跟其他 MOMO 賣場（乙配/MO+麻吉/MO+森之旅）的報表格式不一樣（多了流量/瀏覽量等欄位、
// 另外還有每日趨勢），所以另外做一套，不共用 momoShopHTML。
const _mypPeriod={};
const MYP_HALF_LABEL={first:'上半月',second:'下半月',full:'整月'};
// 整排（KPI 數字 + 月份/區間/上傳/同步）完全比照蝦皮好麻吉的 header-kpi-row：
// 左邊數字、右邊按鈕用 margin-left:auto 推到最右邊，同一行。
function momoYipeiHTML(shop){
  _mypPeriod[shop]=_mypPeriod[shop]||{month:'2026/06',half:'first'};
  const p=_mypPeriod[shop];
  return `
  <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-bottom:16px">
    <div id="myp-kpi-block-${shop}" style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
      <div style="font-size:13px;color:#9ca3af">尚未上傳報表</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-left:auto">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:12px;color:#6b7280;font-weight:500">月份</span>
        <select onchange="onMypMonthChange('${shop}',this)" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">
          ${MONTHS.map(mo=>`<option value="${mo}"${mo===p.month?' selected':''}>${mo}</option>`).join('')}
        </select>
        <span style="font-size:12px;color:#6b7280;font-weight:500">區間</span>
        <select id="myp-half-sel-${shop}" onchange="onMypHalfChange('${shop}',this)" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">
          ${['first','second','full'].map(h=>`<option value="${h}"${h===p.half?' selected':''}>${MYP_HALF_LABEL[h]}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px">
        <button class="export-btn" onclick="openMomoRptUpload('${shop}')" style="border-color:#5b5fcf;color:#5b5fcf">⬆ 上傳檔案</button>
        <button class="export-btn" id="myp-sync-${shop}" disabled style="opacity:0.4;cursor:default" onclick="syncMomoRptToCloud('${shop}')">☁ 同步雲端</button>
      </div>
    </div>
  </div>
  <div id="myp-content-${shop}">
    <div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">上傳兩個報表後按「▶ 產生並儲存」</div></div>
  </div>`;
}
function onMypMonthChange(shop,sel){
  _mypPeriod[shop]=_mypPeriod[shop]||{month:'2026/06',half:'first'};
  _mypPeriod[shop].month=sel.value;
  momoRptTryLoadSaved(shop);
}
function onMypHalfChange(shop,sel){
  _mypPeriod[shop]=_mypPeriod[shop]||{month:'2026/06',half:'first'};
  _mypPeriod[shop].half=sel.value;
  momoRptTryLoadSaved(shop);
}

// ── 酷澎 資料持久化 ──
function cupLsKey(shop,month,half){return'ec_coupang|'+shop+'|'+month+'|'+half;}
function cupLsSave(shop,month,half,rows){
  const payload={rows,ts:Date.now()};
  try{localStorage.setItem(cupLsKey(shop,month,half),JSON.stringify(payload));}catch(e){}
}
function cupLsLoad(shop,month,half){
  const k=cupLsKey(shop,month,half);
  try{if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]!==undefined)return Store._profitMem[k];}catch{}
  try{if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]!==undefined)return Store._mem[k];}catch{}
  try{const d=localStorage.getItem(k);return d?JSON.parse(d):null;}catch{return null;}
}
function cupShowSyncBtn(shop){
  const btn=document.getElementById('cup-sync-'+shop);
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';btn.style.background='#f59e0b';btn.style.color='#fff';btn.style.borderColor='#f59e0b';btn.textContent='☁ 同步雲端';}
}
function cupTryLoadSaved(shop){
  const p=_cupPeriod[shop]||{month:'2026/06',half:'first'};
  // 相容改成「只有月份」之前，可能存在上/下半月的舊資料
  const saved=cupLsLoad(shop,p.month,p.half)||(p.half==='full'&&(cupLsLoad(shop,p.month,'first')||cupLsLoad(shop,p.month,'second')));
  if(saved&&saved.rows){
    renderCoupangTable(shop,saved.rows);
    cupShowSyncBtn(shop);
  }else{
    const tbl=document.getElementById('cup-tbl-'+shop);
    if(tbl)tbl.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">上傳兩個檔案後按「▶ 產生並儲存」</div></div>`;
    const revEl=document.getElementById('cup-kv-rev-'+shop);
    const netEl=document.getElementById('cup-kv-net-'+shop);
    const rateEl=document.getElementById('cup-kv-rate-'+shop);
    if(revEl)revEl.textContent='—';
    if(netEl)netEl.textContent='—';
    if(rateEl)rateEl.textContent='—';
    const btn=document.getElementById('cup-sync-'+shop);
    if(btn){btn.disabled=true;btn.style.opacity='0.4';btn.style.cursor='default';btn.style.background='';btn.style.color='';btn.style.borderColor='';btn.textContent='☁ 同步雲端';}
  }
}
function syncCoupangToCloud(shop){
  const btn=document.getElementById('cup-sync-'+shop);
  if(btn){btn.disabled=true;btn.textContent='同步中…';}
  if(!window.__cloudProfit){
    if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'雲端未連線',message:'雲端尚未就緒，請重新整理。',kind:'warn'});
    else if(typeof showToast==='function') showToast('雲端未連線','error');
    if(btn)cupShowSyncBtn(shop);
    return;
  }
  const p=_cupPeriod[shop]||{month:'2026/06',half:'first'};
  const saved=cupLsLoad(shop,p.month,p.half);
  if(!saved){if(btn)btn.disabled=false;return;}
  window.__cloudProfit.setField(cupLsKey(shop,p.month,p.half),saved).then(()=>{
    if(btn){btn.textContent='✓ 已同步';btn.style.background='#10b981';btn.style.borderColor='#10b981';}
  }).catch(e=>{
    const msg=(e&&e.message)||String(e);
    if(window.App&&typeof App.showAlertModal==='function'){
      App.showAlertModal({title:'同步失敗',message:'資料還在本機，請稍後再試。',detail:msg,kind:'error'});
    }else if(typeof showToast==='function') showToast('同步失敗：'+msg,'error');
    cupShowSyncBtn(shop);
  });
}

function setMomoShop(shop,btn){
  curMomoShop=shop;
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.querySelectorAll('.shop-content').forEach(el=>el.classList.remove('active'));
  const el=document.getElementById('momo-content-'+shop);
  if(el){
    el.classList.add('active');
    if(!el.dataset.init){el.innerHTML=shop==='甲配'?momoYipeiHTML(shop):momoShopHTML(shop);el.dataset.init='1';}
  }
  const kpiBlock=document.getElementById('header-kpi-row');
  if(kpiBlock)kpiBlock.style.display='none';
  if(shop==='甲配')momoRptTryLoadSaved(shop);
}

function setCoupangShop(shop,btn){
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.querySelectorAll('.shop-content').forEach(el=>el.classList.remove('active'));
  const el=document.getElementById('coupang-content-'+shop);
  if(el){
    el.classList.add('active');
    if(!el.dataset.init){
      el.innerHTML=shop==='總表'?coupangSummaryHTML():momoShopHTML(shop,'coupang');
      el.dataset.init='1';
      if(shop==='總表')syncCoupangSummaryFromKpi();
    }
  }
  const kpiBlock=document.getElementById('header-kpi-row');
  if(kpiBlock)kpiBlock.style.display='none';
  if(shop!=='總表')cupTryLoadSaved(shop);
}

let _cupShop='';
const _cupFiles={mobic:null,idlist:null};

function openCoupangUpload(shop){
  _cupShop=shop;
  document.getElementById('coupang-upload-title').textContent='上傳檔案｜酷澎 · '+shop;
  document.getElementById('coupang-upload-overlay').style.display='flex';
}
function closeCoupangUpload(){
  document.getElementById('coupang-upload-overlay').style.display='none';
}
function onCoupangFile(e,type){
  const file=e.target.files[0];if(!file)return;
  _cupFiles[type]=file;
  const statusId={mobic:'cup-mobic-status',idlist:'cup-idlist-status'}[type];
  const el=document.getElementById(statusId);
  if(el){el.textContent='✓ '+file.name;el.style.color='#10b981';}
  const allReady=_cupFiles.mobic&&_cupFiles.idlist;
  const btn=document.getElementById('cup-gen-btn');
  if(btn)btn.disabled=!allReady;
}
const COUPANG_IDLIST_SHEET={'麻吉':'商品清單【好】','露營館':'商品清單【森】'};

function generateCoupang(){
  const btn=document.getElementById('cup-gen-btn');
  if(btn){btn.disabled=true;btn.textContent='處理中…';}
  const idSheet=COUPANG_IDLIST_SHEET[_cupShop];
  Promise.all([
    readXlsx(_cupFiles.mobic),
    readXlsx(_cupFiles.idlist,idSheet),
  ]).then(([mobicRows,idRows])=>{
    // 建立 編號 → 商品ID 對照表（商品ID清單：A=供應商商品ID, B=莫筆克編號, C=名稱）
    const codeToId={};
    idRows.slice(1).forEach(r=>{
      const id=String(r[0]||'').trim();
      const code=String(r[1]||'').trim();
      if(code)codeToId[code]=id;
    });
    // 解析莫筆克銷售分析（C=編號, D=商品名稱, J=可用庫存, O=銷售額, Q=銷售成本, R=毛利, S=銷售數量）
    const rows=[];
    mobicRows.slice(1).forEach(r=>{
      const code=String(r[2]||'').trim();   // C欄 編號
      const name=String(r[3]||'').trim();   // D欄 商品名稱
      if(!code&&!name)return;
      const stock=parseFloat(r[9])||0;       // J欄 可用庫存
      const rev=parseFloat(r[14])||0;        // O欄 銷售額
      const salesCost=parseFloat(r[16])||0;  // Q欄 銷售成本
      const gross=parseFloat(r[17])||0;      // R欄 毛利
      const qty=parseFloat(r[18])||0;        // S欄 銷售數量
      const productId=codeToId[code]||'';
      const net=gross-(rev*0.175);          // 純利 = 毛利 - 銷售額×17.5%
      const netRate=rev>0?net/rev:0;
      rows.push({productId,code,name,rev,salesCost,gross,net,netRate,qty,stock});
    });
    renderCoupangTable(_cupShop,rows);
    const p=_cupPeriod[_cupShop]||{month:'2026/06',half:'first'};
    cupLsSave(_cupShop,p.month,p.half,rows);
    cupShowSyncBtn(_cupShop);
    if(btn){btn.disabled=false;btn.textContent='▶ 產生並儲存';}
    closeCoupangUpload();
  }).catch(err=>{
    console.error(err);
    alert('解析失敗，請確認檔案格式');
    if(btn){btn.disabled=false;btn.textContent='▶ 產生並儲存';}
  });
}

function readXlsx(file,sheetName){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const data=new Uint8Array(e.target.result);
        const wb=XLSX.read(data,{type:'array'});
        const name=(sheetName&&wb.SheetNames.includes(sheetName))?sheetName:wb.SheetNames[0];
        const ws=wb.Sheets[name];
        resolve(XLSX.utils.sheet_to_json(ws,{header:1,defval:''}));
      }catch(err){reject(err);}
    };
    reader.onerror=reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── MOMO 甲配報表：上傳「商品分析」+「銷售分析」兩份 MOMO 後台報表，解析成 KPI 總覽 + 每日趨勢 + 商品明細表 ──
let _mypShop='';
const _mypFiles={product:null,sales:null};
const _mypData={};
function openMomoRptUpload(shop){
  _mypShop=shop;
  document.getElementById('momo-rpt-upload-title').textContent='上傳檔案｜MOMO · '+shop;
  document.getElementById('momo-rpt-upload-overlay').style.display='flex';
}
function closeMomoRptUpload(){
  document.getElementById('momo-rpt-upload-overlay').style.display='none';
}
function onMomoRptFile(e,type){
  const file=e.target.files[0];if(!file)return;
  _mypFiles[type]=file;
  const statusId={product:'myp-product-status',sales:'myp-sales-status'}[type];
  const el=document.getElementById(statusId);
  if(el){el.textContent='✓ '+file.name;el.style.color='#10b981';}
  const btn=document.getElementById('myp-gen-btn');
  if(btn)btn.disabled=!(_mypFiles.product&&_mypFiles.sales);
}
// 商品分析報表的「銷售表現」分頁：找到含「品號」的表頭列，後面接的就是商品明細，遇到空白列結束。
function parseMomoProductRows(rows){
  let headerIdx=-1;
  for(let i=0;i<rows.length;i++){if(rows[i]&&rows[i][1]==='品號'){headerIdx=i;break;}}
  if(headerIdx<0)return[];
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const pct=v=>parseFloat(String(v).replace('%',''))/100||0;
  const out=[];
  for(let i=headerIdx+1;i<rows.length;i++){
    const r=rows[i];
    if(!r||!r[1])break;
    out.push({
      code:String(r[1]).trim(),name:String(r[2]||'').trim(),price:num(r[3]),stock:num(r[4]),
      visitors:num(r[5]),views:num(r[6]),prevViews:num(r[7]),trafficGrowth:pct(r[8]),follows:num(r[9]),
      orderQty:num(r[10]),orderAmt:num(r[11]),convRate:pct(r[12]),cancelQty:num(r[13]),returnQty:num(r[14]),uncheckedQty:num(r[15]),
    });
  }
  return out;
}
// 銷售分析報表的「總覽」分頁：目前/前期/去年同期比較 + 每日明細（拿來畫趨勢線）。
function parseMomoSalesOverview(rows){
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const findRow=prefix=>rows.find(r=>r&&String(r[0]||'').startsWith(prefix));
  const toMetrics=r=>r?{buyers:num(r[1]),orders:num(r[2]),qty:num(r[3]),amt:num(r[4]),cost:num(r[5]),aov:num(r[6])}:null;
  const overview={
    current:toMetrics(findRow('目前')),
    prev:toMetrics(findRow('前期')),
    lastYear:toMetrics(findRow('去年同期')),
  };
  // 每日明細：表頭那列第一欄開頭是「日期」，接下來的列第一欄要是 MM/DD 格式，直到不是為止
  let dailyHeaderIdx=-1;
  for(let i=0;i<rows.length;i++){if(rows[i]&&String(rows[i][0]||'').startsWith('日期')){dailyHeaderIdx=i;break;}}
  const dailyTrend=[];
  if(dailyHeaderIdx>=0){
    for(let i=dailyHeaderIdx+1;i<rows.length;i++){
      const r=rows[i];
      if(!r||!/^\d{2}\/\d{2}$/.test(String(r[0]||'').trim()))break;
      dailyTrend.push({date:String(r[0]).trim(),buyers:num(r[1]),orders:num(r[2]),qty:num(r[3]),amt:num(r[4])});
    }
  }
  overview.dailyTrend=dailyTrend;
  return overview;
}
function generateMomoRpt(){
  const btn=document.getElementById('myp-gen-btn');
  if(btn){btn.disabled=true;btn.textContent='處理中…';}
  Promise.all([
    readXlsx(_mypFiles.product,'銷售表現'),
    readXlsx(_mypFiles.sales,'總覽'),
  ]).then(([productRows,salesRows])=>{
    const products=parseMomoProductRows(productRows);
    const overview=parseMomoSalesOverview(salesRows);
    if(!overview.current){throw new Error('找不到「目前」總覽列，請確認銷售分析報表格式');}
    const data={products,overview:{current:overview.current,prev:overview.prev,lastYear:overview.lastYear},dailyTrend:overview.dailyTrend,ts:Date.now()};
    const p=_mypPeriod[_mypShop]||{month:'2026/06',half:'first'};
    _mypData[_mypShop]=data;
    momoRptLsSave(_mypShop,p.month,p.half,data);
    renderMomoRptShop(_mypShop,data);
    momoRptShowSyncBtn(_mypShop);
    if(btn){btn.disabled=false;btn.textContent='▶ 產生並儲存';}
    closeMomoRptUpload();
  }).catch(err=>{
    console.error(err);
    alert('解析失敗，請確認檔案格式：'+((err&&err.message)||err));
    if(btn){btn.disabled=false;btn.textContent='▶ 產生並儲存';}
  });
}
function momoRptLsKey(shop,month,half){return'ec_momo_rpt|'+shop+'|'+month+'|'+half;}
function momoRptLsSave(shop,month,half,data){try{localStorage.setItem(momoRptLsKey(shop,month,half),JSON.stringify(data));}catch(e){}}
function momoRptLsLoad(shop,month,half){
  const k=momoRptLsKey(shop,month,half);
  try{if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]!==undefined)return Store._profitMem[k];}catch{}
  try{if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]!==undefined)return Store._mem[k];}catch{}
  try{const d=localStorage.getItem(k);return d?JSON.parse(d):null;}catch{return null;}
}
function momoRptShowSyncBtn(shop){
  const btn=document.getElementById('myp-sync-'+shop);
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';btn.style.background='#f59e0b';btn.style.color='#fff';btn.style.borderColor='#f59e0b';btn.textContent='☁ 同步雲端';}
}
function momoRptTryLoadSaved(shop){
  const p=_mypPeriod[shop]||{month:'2026/06',half:'first'};
  const saved=momoRptLsLoad(shop,p.month,p.half);
  if(saved){
    _mypData[shop]=saved;
    renderMomoRptShop(shop,saved);
    momoRptShowSyncBtn(shop);
  }else{
    delete _mypData[shop];
    const kpiBlock=document.getElementById('myp-kpi-block-'+shop);
    if(kpiBlock)kpiBlock.innerHTML=`<div style="font-size:13px;color:#9ca3af">尚未上傳報表</div>`;
    const content=document.getElementById('myp-content-'+shop);
    if(content)content.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">這個區間還沒有資料，上傳兩個報表後按「▶ 產生並儲存」</div></div>`;
    const btn=document.getElementById('myp-sync-'+shop);
    if(btn){btn.disabled=true;btn.style.opacity='0.4';btn.style.cursor='default';btn.style.background='';btn.style.color='';btn.style.borderColor='';btn.textContent='☁ 同步雲端';}
  }
}
function syncMomoRptToCloud(shop){
  const btn=document.getElementById('myp-sync-'+shop);
  if(btn){btn.disabled=true;btn.textContent='同步中…';}
  if(!window.__cloudProfit){
    if(window.App&&typeof App.showAlertModal==='function')App.showAlertModal({title:'雲端未連線',message:'雲端尚未就緒，請重新整理。',kind:'warn'});
    else if(typeof showToast==='function')showToast('雲端未連線','error');
    if(btn)momoRptShowSyncBtn(shop);
    return;
  }
  const p=_mypPeriod[shop]||{month:'2026/06',half:'first'};
  const saved=momoRptLsLoad(shop,p.month,p.half);
  if(!saved){if(btn)btn.disabled=false;return;}
  window.__cloudProfit.setField(momoRptLsKey(shop,p.month,p.half),saved).then(()=>{
    if(btn){btn.textContent='✓ 已同步';btn.style.background='#10b981';btn.style.borderColor='#10b981';}
  }).catch(e=>{
    const msg=(e&&e.message)||String(e);
    if(window.App&&typeof App.showAlertModal==='function'){
      App.showAlertModal({title:'同步失敗',message:'資料還在本機，請稍後再試。',detail:msg,kind:'error'});
    }else if(typeof showToast==='function')showToast('同步失敗：'+msg,'error');
    momoRptShowSyncBtn(shop);
  });
}

// KPI 數字（跟月份/按鈕同一行，塞進 myp-kpi-block）+ 每日趨勢圖 + 商品明細表（myp-content）
function renderMomoRptShop(shop,data){
  const kpiBlock=document.getElementById('myp-kpi-block-'+shop);
  const content=document.getElementById('myp-content-'+shop);
  if(!kpiBlock||!content)return;
  const cur=data.overview.current,prev=data.overview.prev;
  if(!cur){content.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">解析失敗，找不到總覽資料</div></div>`;return;}
  // 純利／純利率先留空，等下面商品明細表可以算出純利後再接上來（跟蝦皮好麻吉一樣：營收/純利/純利率）
  let revChangeHtml='';
  if(prev&&prev.amt>0&&cur.amt>0){
    const pct=(cur.amt-prev.amt)/prev.amt*100;
    const sign=pct>=0?'+':'';
    const col=pct>=0?'#10b981':'#ef4444';
    revChangeHtml=`<span style="color:${col}">(${sign}${pct.toFixed(1)}% 較上期)</span>`;
  }
  kpiBlock.innerHTML=`
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">營收</div><div style="display:flex;align-items:baseline;gap:5px"><div style="font-size:20px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;letter-spacing:-.01em">NT$ ${Math.round(cur.amt).toLocaleString()}</div><span style="font-size:12px;font-weight:600">${revChangeHtml}</span></div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">純利</div><div style="font-size:20px;font-weight:700;color:#10b981;font-variant-numeric:tabular-nums;letter-spacing:-.01em">—</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">純利率</div><div style="font-size:20px;font-weight:700;color:#6366f1;font-variant-numeric:tabular-nums;letter-spacing:-.01em">—</div></div>
  `;
  content.innerHTML=`
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px">
      <div class="col-picker-wrap"><button class="col-pick-btn" onclick="openMypColPicker('${shop}',this)">☰ 欄位</button></div>
    </div>
    <div id="myp-tbl-${shop}"></div>
  `;
  renderMomoRptTableBody(shop);
}

// 商品明細表欄位（跟蝦皮好麻吉/酷澎不同的欄位集合，另外存一份順序/顯示設定）
const MOMO_TABLE_COLS=[
  {k:'code',label:'品號'},{k:'name',label:'商品名稱'},
  {k:'stock',label:'可接單量',fmt:'num'},{k:'views',label:'瀏覽量',fmt:'num'},
  {k:'trafficGrowth',label:'流量成長率',fmt:'pct'},
  {k:'orderQty',label:'訂購數',fmt:'num'},{k:'orderAmt',label:'訂購金額',fmt:'money'},{k:'returnQty',label:'退貨數',fmt:'num'},
  // 毛利/純利/純利率：公式還沒定案，先把欄位放上去，資料還沒算出來時顯示 —
  {k:'gross',label:'毛利',fmt:'money'},{k:'net',label:'純利',fmt:'money'},{k:'netRate',label:'純利率',fmt:'pct'},
];
const MOMO_TABLE_LEFT_COLS=new Set(['code','name']);
const _MYP_COLORDER_LS='ec_colorder_momo';
function getMypColKeys(){
  try{const raw=localStorage.getItem(_MYP_COLORDER_LS);const saved=raw?JSON.parse(raw):[];if(Array.isArray(saved)&&saved.length)return saved;}catch{}
  return MOMO_TABLE_COLS.map(c=>c.k);
}
function saveMypColKeys(order){try{localStorage.setItem(_MYP_COLORDER_LS,JSON.stringify(order));}catch{}}
function getMypOrderedCols(){
  const byKey=new Map(MOMO_TABLE_COLS.map(c=>[c.k,c]));
  const out=[];
  getMypColKeys().forEach(k=>{if(byKey.has(k)){out.push(byKey.get(k));byKey.delete(k);}});
  byKey.forEach(c=>out.push(c));
  return out;
}
const _MYP_HCOLS_LS='ec_hcols_momo';
function getMypHiddenCols(){try{const raw=localStorage.getItem(_MYP_HCOLS_LS);return new Set(raw?JSON.parse(raw):[]);}catch{return new Set();}}
function toggleMypHiddenCol(shop,key){
  const s=getMypHiddenCols();if(s.has(key))s.delete(key);else s.add(key);
  try{localStorage.setItem(_MYP_HCOLS_LS,JSON.stringify([...s]));}catch{}
  renderMomoRptTableBody(shop);renderMypColPicker(shop);
}
function resetMypHiddenCols(shop){try{localStorage.removeItem(_MYP_HCOLS_LS);}catch{}renderMomoRptTableBody(shop);renderMypColPicker(shop);}
function resetMypColOrder(shop){try{localStorage.removeItem(_MYP_COLORDER_LS);}catch{}renderMomoRptTableBody(shop);renderMypColPicker(shop);}
let _mypColDrag=null;
function mypColDragStart(e,key){
  _mypColDrag=key;
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain',key);}catch{}
  e.currentTarget.classList.add('col-dragging');
}
function mypColDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';}
function mypColDragEnter(e){e.preventDefault();e.currentTarget.classList.add('col-drag-over');}
function mypColDragLeave(e){e.currentTarget.classList.remove('col-drag-over');}
function mypColDrop(e,shop,targetKey){
  e.preventDefault();
  e.currentTarget.classList.remove('col-drag-over');
  if(!_mypColDrag||_mypColDrag===targetKey){_mypColDrag=null;return;}
  const rect=e.currentTarget.getBoundingClientRect();
  const after=(e.clientX-rect.left)>rect.width/2;
  let order=getMypColKeys().filter(k=>k!==_mypColDrag);
  let idx=order.indexOf(targetKey);
  if(idx<0)idx=order.length;else if(after)idx++;
  order.splice(idx,0,_mypColDrag);
  saveMypColKeys(order);
  _mypColDrag=null;
  renderMomoRptTableBody(shop);
}
function mypColDragEnd(e){e.currentTarget.classList.remove('col-dragging');document.querySelectorAll('.col-drag-over').forEach(el=>el.classList.remove('col-drag-over'));}
let _mypPickRowDrag=null;
function mypPickRowDragStart(e,shop,key){
  _mypPickRowDrag=key;
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain',key);}catch{}
  e.currentTarget.classList.add('cp-row-dragging');
}
function mypPickRowDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';}
function mypPickRowDragEnter(e){e.preventDefault();e.currentTarget.classList.add('cp-row-drag-over');}
function mypPickRowDragLeave(e){e.currentTarget.classList.remove('cp-row-drag-over');}
function mypPickRowDrop(e,shop,targetKey){
  e.preventDefault();
  e.currentTarget.classList.remove('cp-row-drag-over');
  if(!_mypPickRowDrag||_mypPickRowDrag===targetKey){_mypPickRowDrag=null;return;}
  const rect=e.currentTarget.getBoundingClientRect();
  const after=(e.clientY-rect.top)>rect.height/2;
  let order=getMypColKeys().filter(k=>k!==_mypPickRowDrag);
  let idx=order.indexOf(targetKey);
  if(idx<0)idx=order.length;else if(after)idx++;
  order.splice(idx,0,_mypPickRowDrag);
  saveMypColKeys(order);
  _mypPickRowDrag=null;
  renderMomoRptTableBody(shop);renderMypColPicker(shop);
}
function mypPickRowDragEnd(e){e.currentTarget.classList.remove('cp-row-dragging');document.querySelectorAll('.cp-row-drag-over').forEach(el=>el.classList.remove('cp-row-drag-over'));}
function renderMypColPicker(shop){
  const m=document.getElementById('colpick-myp-'+shop);if(!m)return;
  const hc=getMypHiddenCols();
  const cols=getMypOrderedCols();
  const vis=cols.length-hc.size;
  m.innerHTML=`<div style="padding:6px 13px 4px;font-size:11px;color:#9ca3af;font-weight:700;display:flex;justify-content:space-between;align-items:center">欄位 <span>${vis}/${cols.length}</span></div>`
    +cols.map(c=>`<div class="cp-row" draggable="true"
      ondragstart="mypPickRowDragStart(event,'${shop}','${c.k}')" ondragover="mypPickRowDragOver(event)"
      ondragenter="mypPickRowDragEnter(event)" ondragleave="mypPickRowDragLeave(event)"
      ondrop="mypPickRowDrop(event,'${shop}','${c.k}')" ondragend="mypPickRowDragEnd(event)"
      onclick="toggleMypHiddenCol('${shop}','${c.k}');event.stopPropagation()">
      <span class="cp-row-handle">⠿</span>
      <input type="checkbox" ${!hc.has(c.k)?'checked':''} style="margin:0;pointer-events:none"> ${c.label}
    </div>`).join('')
    +`<div style="padding:4px 13px 6px;border-top:1px solid #e5e7eb;text-align:right;display:flex;gap:10px;justify-content:flex-end">
      <button onclick="resetMypColOrder('${shop}')" style="font-size:11px;color:#5b5fcf;background:none;border:none;cursor:pointer;font-weight:600">重設順序</button>
      <button onclick="resetMypHiddenCols('${shop}')" style="font-size:11px;color:#5b5fcf;background:none;border:none;cursor:pointer;font-weight:600">顯示全部</button>
    </div>`;
}
function openMypColPicker(shop,btn){
  let m=document.getElementById('colpick-myp-'+shop);
  if(m){m.remove();return;}
  m=document.createElement('div');m.id='colpick-myp-'+shop;m.className='col-picker-menu open';
  const wrap=btn?.closest('.col-picker-wrap');
  (wrap||btn?.parentElement||document.body).appendChild(m);
  renderMypColPicker(shop);
  setTimeout(()=>document.addEventListener('click',function h(e){if(!m.contains(e.target)){m.remove();document.removeEventListener('click',h);}},{},true),0);
}
const _mypSort={};
function mypSetSort(shop,col){
  const cur=_mypSort[shop];
  if(!cur||cur.col!==col)_mypSort[shop]={col,dir:'desc'};
  else if(cur.dir==='desc')_mypSort[shop]={col,dir:'asc'};
  else delete _mypSort[shop];
  renderMomoRptTableBody(shop);
}
function mypSortRows(shop,rows){
  const s=_mypSort[shop];
  if(!s)return rows;
  const colDef=MOMO_TABLE_COLS.find(c=>c.k===s.col);
  const isNum=!!(colDef&&colDef.fmt);
  return[...rows].sort((a,b)=>{
    if(isNum){
      const va=Number(a[s.col])||0,vb=Number(b[s.col])||0;
      return s.dir==='asc'?va-vb:vb-va;
    }
    const va=String(a[s.col]||''),vb=String(b[s.col]||'');
    return s.dir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
  });
}
function renderMomoRptTableBody(shop){
  const rows=mypSortRows(shop,(_mypData[shop]&&_mypData[shop].products)||[]);
  const tbl=document.getElementById('myp-tbl-'+shop);
  if(!tbl)return;
  if(!rows.length){tbl.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">沒有商品資料</div></div>`;return;}
  const fmtFns={
    money:n=>'NT$ '+Math.round(n).toLocaleString(),
    num:n=>Math.round(n).toLocaleString(),
    pct:n=>(n*100).toFixed(1)+'%',
  };
  const hc=getMypHiddenCols();
  const cols=getMypOrderedCols().filter(c=>!hc.has(c.k));
  const dragAttrs=(key)=>`draggable="true" ondragstart="mypColDragStart(event,'${key}')" ondragover="mypColDragOver(event)" ondragenter="mypColDragEnter(event)" ondragleave="mypColDragLeave(event)" ondrop="mypColDrop(event,'${shop}','${key}')" ondragend="mypColDragEnd(event)"`;
  const curSort=_mypSort[shop];
  const sortIcon=(key)=>curSort&&curSort.col===key
    ?`<span style="color:#5b5fcf;font-weight:700">${curSort.dir==='asc'?'▲':'▼'}</span>`
    :`<span style="color:#d1d5db">⇅</span>`;
  const thead=cols.map(c=>{
    const isLeft=MOMO_TABLE_LEFT_COLS.has(c.k);
    return `<th class="${isLeft?'tl':''}" ${dragAttrs(c.k)}><span class="th-wrap${isLeft?' tl':''}" onclick="mypSetSort('${shop}','${c.k}')" style="cursor:pointer;gap:4px">${c.label}${sortIcon(c.k)}</span></th>`;
  }).join('');
  const tbody=rows.map(r=>{
    const tds=cols.map(c=>{
      const v=r[c.k];
      const cls=MOMO_TABLE_LEFT_COLS.has(c.k)?'tl':'';
      // 瀏覽量下面順便帶出前期瀏覽量（不用另外佔一欄）
      if(c.k==='views'){
        return`<td class="${cls}"><div>${fmtFns.num(v)}</div><div style="font-size:10px;color:#9ca3af;margin-top:2px">前期 ${fmtFns.num(r.prevViews)}</div></td>`;
      }
      const disp=(v===undefined||v===null)?'<span style="color:#d1d5db">—</span>':(c.fmt?fmtFns[c.fmt](v):v);
      const style=c.k==='trafficGrowth'?`style="color:${v>=0?'#10b981':'#ef4444'};font-weight:700"`:'';
      return`<td class="${cls}" ${style}>${disp}</td>`;
    }).join('');
    return`<tr>${tds}</tr>`;
  }).join('');
  tbl.innerHTML=`<div class="tscroll"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
}

// ── 蝦皮好麻吉 聯盟行銷：上傳「推廣訂單報表」(SellerConversionReport.csv) + 「蝦皮商品清單」(.xlsx，讀好麻吉分頁)，
// 依商品ID合併算出銷售額/分潤率/推廣費用，商品名稱優先用商品清單裡的莫比克名，沒有的話退回報表自帶的蝦皮商品名稱 ──
let _affShop='';
const _affFiles={conv:null,list:null};
const _affData={};
function openAffUpload(shop){
  _affShop=shop;
  document.getElementById('aff-upload-title').textContent='上傳檔案｜聯盟行銷 · '+shop;
  document.getElementById('aff-upload-overlay').style.display='flex';
}
function closeAffUpload(){
  document.getElementById('aff-upload-overlay').style.display='none';
}
function onAffFile(e,type){
  const file=e.target.files[0];if(!file)return;
  _affFiles[type]=file;
  const statusId={conv:'aff-conv-status',list:'aff-list-status'}[type];
  const el=document.getElementById(statusId);
  if(el){el.textContent='✓ '+file.name;el.style.color='#10b981';}
  const btn=document.getElementById('aff-gen-btn');
  if(btn)btn.disabled=!(_affFiles.conv&&_affFiles.list);
}
function readCsvText(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=e=>resolve(e.target.result);
    reader.onerror=reject;
    reader.readAsText(file,'UTF-8');
  });
}
// 推廣訂單報表：一個商品ID可能出現很多列（每筆訂單一列），照ID合併加總銷售額/推廣費用，分潤率取同ID裡最常出現的那個。
function parseAffConversionCsv(text){
  const lines=text.replace(/^﻿/,'').split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length)return[];
  const headers=splitCSV(lines[0]).map(h=>h.replace(/^"|"$/g,'').trim());
  const idIdx=headers.indexOf('商品編號');
  const nameIdx=headers.indexOf('商品名稱');
  const priceIdx=headers.indexOf('購買價格($)');
  const rateIdx=headers.indexOf('推廣者商品分潤率');
  const costIdx=headers.indexOf('推廣費用($)');
  if(idIdx<0)throw new Error('找不到「商品編號」欄位，請確認是 SellerConversionReport 報表');
  const map=new Map();
  for(let i=1;i<lines.length;i++){
    const vals=splitCSV(lines[i]).map(v=>v.replace(/^"|"$/g,'').trim());
    const id=vals[idIdx];
    if(!id)continue;
    if(!map.has(id))map.set(id,{id,fallbackName:vals[nameIdx]||'',sales:0,cost:0,rateCounts:{}});
    const g=map.get(id);
    g.sales+=parseFloat(vals[priceIdx])||0;
    g.cost+=parseFloat(vals[costIdx])||0;
    const rate=vals[rateIdx];
    if(rate)g.rateCounts[rate]=(g.rateCounts[rate]||0)+1;
  }
  return[...map.values()].map(g=>{
    let bestRate='',bestCount=0;
    Object.entries(g.rateCounts).forEach(([rate,count])=>{if(count>bestCount){bestCount=count;bestRate=rate;}});
    return{id:g.id,fallbackName:g.fallbackName,sales:g.sales,cost:g.cost,rate:bestRate};
  });
}
function generateAffRpt(){
  const btn=document.getElementById('aff-gen-btn');
  if(btn){btn.disabled=true;btn.textContent='處理中…';}
  Promise.all([
    readCsvText(_affFiles.conv),
    readXlsx(_affFiles.list,'好麻吉'),
  ]).then(([csvText,mappingRows])=>{
    const products=parseAffConversionCsv(csvText);
    const header=mappingRows[0]||[];
    const idIdx=header.indexOf('商品ID');
    const mobicIdx=header.indexOf('莫比克名');
    const idToMobic={};
    for(let i=1;i<mappingRows.length;i++){
      const row=mappingRows[i];
      const rawId=row[idIdx];
      const mobic=row[mobicIdx];
      if(rawId==null||rawId==='')continue;
      const id=String(Math.trunc(rawId));
      if(mobic&&!idToMobic[id])idToMobic[id]=mobic;
    }
    products.forEach(p=>{
      const mobic=idToMobic[p.id];
      p.name=mobic||p.fallbackName;
      p.matched=!!mobic;
    });
    const totalSales=products.reduce((s,p)=>s+p.sales,0);
    const totalCost=products.reduce((s,p)=>s+p.cost,0);
    const data={products,totalSales,totalCost,ts:Date.now()};
    _affData[_affShop]=data;
    affRptLsSave(_affShop,data);
    renderAffRptShop(_affShop,data);
    affRptShowSyncBtn(_affShop);
    if(btn){btn.disabled=false;btn.textContent='▶ 產生並儲存';}
    closeAffUpload();
  }).catch(err=>{
    console.error(err);
    alert('解析失敗，請確認檔案格式：'+((err&&err.message)||err));
    if(btn){btn.disabled=false;btn.textContent='▶ 產生並儲存';}
  });
}
function affRptLsKey(shop){return'ec_aff_rpt|'+shop;}
function affRptLsSave(shop,data){try{localStorage.setItem(affRptLsKey(shop),JSON.stringify(data));}catch(e){}}
function affRptLsLoad(shop){
  const k=affRptLsKey(shop);
  try{if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]!==undefined)return Store._profitMem[k];}catch{}
  try{if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]!==undefined)return Store._mem[k];}catch{}
  try{const d=localStorage.getItem(k);return d?JSON.parse(d):null;}catch{return null;}
}
function affRptShowSyncBtn(shop){
  const btn=document.getElementById('aff-sync-'+shop);
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';btn.style.background='#f59e0b';btn.style.color='#fff';btn.style.borderColor='#f59e0b';btn.textContent='☁ 同步雲端';}
  const clearBtn=document.getElementById('aff-clear-'+shop);
  if(clearBtn){clearBtn.disabled=false;clearBtn.style.opacity='1';clearBtn.style.cursor='pointer';}
}
function affRptTryLoadSaved(shop){
  const saved=affRptLsLoad(shop);
  if(saved){_affData[shop]=saved;renderAffRptShop(shop,saved);affRptShowSyncBtn(shop);}
}
// 上傳錯資料或想重來時可以整個清掉（本機 + 雲端都刪），回到「尚未上傳報表」的初始狀態。
function clearAffRpt(shop){
  if(!confirm('確定要清除目前的聯盟行銷資料？清掉之後要重新上傳才會有資料。'))return;
  delete _affData[shop];
  try{localStorage.removeItem(affRptLsKey(shop));}catch{}
  const kpiBlock=document.getElementById('aff-kpi-block-'+shop);
  if(kpiBlock)kpiBlock.innerHTML=`<div style="font-size:13px;color:#9ca3af">尚未上傳報表</div>`;
  const content=document.getElementById('aff-content-'+shop);
  if(content)content.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">上傳兩個報表後按「▶ 產生並儲存」</div></div>`;
  const syncBtn=document.getElementById('aff-sync-'+shop);
  if(syncBtn){syncBtn.disabled=true;syncBtn.style.opacity='0.4';syncBtn.style.cursor='default';syncBtn.style.background='';syncBtn.style.color='';syncBtn.style.borderColor='';syncBtn.textContent='☁ 同步雲端';}
  const clearBtn=document.getElementById('aff-clear-'+shop);
  if(clearBtn){clearBtn.disabled=true;clearBtn.style.opacity='0.4';clearBtn.style.cursor='default';}
  if(window.__cloudProfit&&typeof window.__cloudProfit.removeFields==='function'){
    window.__cloudProfit.removeFields([affRptLsKey(shop)]).catch(e=>console.warn('[聯盟行銷] 雲端清除失敗',e));
  }
  showToast('已清除，可以重新上傳','success');
}
function syncAffRptToCloud(shop){
  const btn=document.getElementById('aff-sync-'+shop);
  if(btn){btn.disabled=true;btn.textContent='同步中…';}
  if(!window.__cloudProfit){
    if(window.App&&typeof App.showAlertModal==='function')App.showAlertModal({title:'雲端未連線',message:'雲端尚未就緒，請重新整理。',kind:'warn'});
    else if(typeof showToast==='function')showToast('雲端未連線','error');
    if(btn)affRptShowSyncBtn(shop);
    return;
  }
  const saved=affRptLsLoad(shop);
  if(!saved){if(btn)btn.disabled=false;return;}
  window.__cloudProfit.setField(affRptLsKey(shop),saved).then(()=>{
    if(btn){btn.textContent='✓ 已同步';btn.style.background='#10b981';btn.style.borderColor='#10b981';}
  }).catch(e=>{
    const msg=(e&&e.message)||String(e);
    if(window.App&&typeof App.showAlertModal==='function'){
      App.showAlertModal({title:'同步失敗',message:'資料還在本機，請稍後再試。',detail:msg,kind:'error'});
    }else if(typeof showToast==='function')showToast('同步失敗：'+msg,'error');
    affRptShowSyncBtn(shop);
  });
}
// KPI 數字（商品數/銷售額合計/推廣費用合計/分潤佔比）+ 商品明細表
function renderAffRptShop(shop,data){
  const kpiBlock=document.getElementById('aff-kpi-block-'+shop);
  const content=document.getElementById('aff-content-'+shop);
  if(!kpiBlock||!content)return;
  const{products,totalSales,totalCost}=data;
  const costRatio=totalSales>0?totalCost/totalSales*100:null;
  kpiBlock.innerHTML=`
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">商品數</div><div style="font-size:20px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;letter-spacing:-.01em">${products.length.toLocaleString()}</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">銷售額合計</div><div style="font-size:20px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;letter-spacing:-.01em">$${Math.round(totalSales).toLocaleString()}</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">推廣費用合計</div><div style="font-size:20px;font-weight:700;color:#f59e0b;font-variant-numeric:tabular-nums;letter-spacing:-.01em">$${Math.round(totalCost).toLocaleString()}</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">分潤佔比</div><div style="font-size:20px;font-weight:700;color:#6366f1;font-variant-numeric:tabular-nums;letter-spacing:-.01em">${costRatio===null?'—':costRatio.toFixed(1)+'%'}</div></div>
  `;
  content.innerHTML=`<div id="aff-tbl-${shop}"></div>`;
  renderAffRptTableBody(shop);
}
const _affSort={};
function affSetSort(shop,col){
  const cur=_affSort[shop];
  if(!cur||cur.col!==col)_affSort[shop]={col,dir:'desc'};
  else if(cur.dir==='desc')_affSort[shop]={col,dir:'asc'};
  else delete _affSort[shop];
  renderAffRptTableBody(shop);
}
function affSortRows(shop,rows){
  const s=_affSort[shop];
  if(!s)return rows;
  const numeric=new Set(['sales','cost','rateNum']);
  return[...rows].sort((a,b)=>{
    if(numeric.has(s.col)){
      const va=Number(a[s.col])||0,vb=Number(b[s.col])||0;
      return s.dir==='asc'?va-vb:vb-va;
    }
    const va=String(a[s.col]||''),vb=String(b[s.col]||'');
    return s.dir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
  });
}
function renderAffRptTableBody(shop){
  const products=((_affData[shop]&&_affData[shop].products)||[]).map(p=>({...p,rateNum:parseFloat(p.rate)||0}));
  const rows=affSortRows(shop,products);
  const tbl=document.getElementById('aff-tbl-'+shop);
  if(!tbl)return;
  if(!rows.length){tbl.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">沒有商品資料</div></div>`;return;}
  const cols=[
    {k:'id',label:'商品ID',left:true},
    {k:'name',label:'商品名稱',left:true},
    {k:'sales',label:'銷售額'},
    {k:'rateNum',label:'分潤率'},
    {k:'cost',label:'推廣費用'},
  ];
  const curSort=_affSort[shop];
  const sortIcon=(key)=>curSort&&curSort.col===key
    ?`<span style="color:#5b5fcf;font-weight:700">${curSort.dir==='asc'?'▲':'▼'}</span>`
    :`<span style="color:#d1d5db">⇅</span>`;
  const thead=cols.map(c=>`<th class="${c.left?'tl':''}"><span class="th-wrap${c.left?' tl':''}" onclick="affSetSort('${shop}','${c.k}')" style="cursor:pointer;gap:4px">${c.label}${sortIcon(c.k)}</span></th>`).join('');
  const tbody=rows.map(p=>`
    <tr>
      <td class="tl" style="font-family:'DM Mono',monospace;color:#9ca3af">${p.id}</td>
      <td class="tl">${escapeHtmlAff(p.name)}${p.matched?'':' <span style="font-size:10px;font-weight:600;padding:1px 6px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fde68a">代用名</span>'}</td>
      <td>$${Math.round(p.sales).toLocaleString()}</td>
      <td style="color:#5b5fcf;font-weight:700">${p.rate||'—'}</td>
      <td>$${Math.round(p.cost).toLocaleString()}</td>
    </tr>
  `).join('');
  tbl.innerHTML=`<div class="tscroll"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
}
function escapeHtmlAff(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function mergeCoupangRows(rows){
  const map=new Map();
  const order=[];
  rows.forEach(r=>{
    const key=r.code||r.productId||r.name;
    if(!map.has(key)){
      map.set(key,{...r});
      order.push(key);
    }else{
      const m=map.get(key);
      m.rev+=r.rev;
      m.salesCost+=r.salesCost;
      m.gross+=r.gross;
      m.qty+=r.qty;
      m.stock+=r.stock;
      if(!m.productId&&r.productId)m.productId=r.productId;
      if(!m.name&&r.name)m.name=r.name;
    }
  });
  return order.map(k=>{
    const m=map.get(k);
    m.net=m.gross-(m.rev*0.175);
    m.netRate=m.rev>0?m.net/m.rev:0;
    return m;
  });
}

const _cupMergedRows={};

function cupNotesKey(shop,month,half){return'ec_coupang_notes|'+shop+'|'+month+'|'+half;}
function cupLoadNotes(shop,month,half){
  try{const d=localStorage.getItem(cupNotesKey(shop,month,half));return d?JSON.parse(d):{};}catch{return{};}
}
function cupSaveNotes(shop,month,half,notes){
  try{localStorage.setItem(cupNotesKey(shop,month,half),JSON.stringify(notes));}catch(e){}
}
function onCupNoteChange(shop,code,value){
  const p=_cupPeriod[shop]||{month:'2026/06',half:'first'};
  const notes=cupLoadNotes(shop,p.month,p.half);
  notes[code]=value;
  cupSaveNotes(shop,p.month,p.half,notes);
  const rows=_cupMergedRows[shop]||[];
  const r=rows.find(x=>x.code===code);
  if(r)r.note=value;
  if(window.__cloudProfit)window.__cloudProfit.setField(cupNotesKey(shop,p.month,p.half),notes).catch(()=>{});
}

// 酷澎表格欄位定義（跟蝦皮好麻吉的 PROFIT_COLS 是不同欄位集合，麻吉/露營館共用一份順序）
const CUP_TABLE_COLS=[
  {k:'productId',label:'商品ID'},
  {k:'code',label:'編號'},
  {k:'name',label:'商品名稱'},
  {k:'rev',label:'銷售額',fmt:'money'},
  {k:'salesCost',label:'銷售成本',fmt:'num'},
  {k:'gross',label:'毛利',fmt:'num'},
  {k:'net',label:'純利',fmt:'money'},
  {k:'netRate',label:'純利率',fmt:'pct'},
  {k:'qty',label:'銷售數量',fmt:'num'},
  {k:'stock',label:'可用庫存',fmt:'num'},
  {k:'note',label:'調整'},
];
const CUP_TABLE_LEFT_COLS=new Set(['productId','code','name','note']);
const _CUP_COLORDER_LS='ec_colorder_coupang';
function getCupColKeys(){
  try{
    const raw=localStorage.getItem(_CUP_COLORDER_LS);
    const saved=raw?JSON.parse(raw):[];
    if(Array.isArray(saved)&&saved.length)return saved;
  }catch{}
  return CUP_TABLE_COLS.map(c=>c.k);
}
function saveCupColKeys(order){try{localStorage.setItem(_CUP_COLORDER_LS,JSON.stringify(order));}catch{}}
function getCupOrderedCols(){
  const byKey=new Map(CUP_TABLE_COLS.map(c=>[c.k,c]));
  const out=[];
  getCupColKeys().forEach(k=>{if(byKey.has(k)){out.push(byKey.get(k));byKey.delete(k);}});
  byKey.forEach(c=>out.push(c));
  return out;
}
// 欄位顯示/隱藏（跟順序一樣，麻吉/露營館共用一份）
const _CUP_HCOLS_LS='ec_hcols_coupang';
function getCupHiddenCols(){
  try{const raw=localStorage.getItem(_CUP_HCOLS_LS);return new Set(raw?JSON.parse(raw):[]);}catch{return new Set();}
}
function toggleCupHiddenCol(shop,key){
  const s=getCupHiddenCols();if(s.has(key))s.delete(key);else s.add(key);
  try{localStorage.setItem(_CUP_HCOLS_LS,JSON.stringify([...s]));}catch{}
  renderCoupangTableBody(shop);renderCupColPicker(shop);
}
function resetCupHiddenCols(shop){try{localStorage.removeItem(_CUP_HCOLS_LS);}catch{}renderCoupangTableBody(shop);renderCupColPicker(shop);}
function resetCupColOrder(shop){try{localStorage.removeItem(_CUP_COLORDER_LS);}catch{}renderCoupangTableBody(shop);renderCupColPicker(shop);}
// 欄位選單（跟好麻吉的 col-picker 同一套外觀，選單裡也能直接拖曳排序）
let _cupPickRowDrag=null;
function cupPickRowDragStart(e,shop,key){
  _cupPickRowDrag=key;
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain',key);}catch{}
  e.currentTarget.classList.add('cp-row-dragging');
}
function cupPickRowDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';}
function cupPickRowDragEnter(e){e.preventDefault();e.currentTarget.classList.add('cp-row-drag-over');}
function cupPickRowDragLeave(e){e.currentTarget.classList.remove('cp-row-drag-over');}
function cupPickRowDrop(e,shop,targetKey){
  e.preventDefault();
  e.currentTarget.classList.remove('cp-row-drag-over');
  if(!_cupPickRowDrag||_cupPickRowDrag===targetKey){_cupPickRowDrag=null;return;}
  const rect=e.currentTarget.getBoundingClientRect();
  const after=(e.clientY-rect.top)>rect.height/2;
  let order=getCupColKeys().filter(k=>k!==_cupPickRowDrag);
  let idx=order.indexOf(targetKey);
  if(idx<0)idx=order.length;else if(after)idx++;
  order.splice(idx,0,_cupPickRowDrag);
  saveCupColKeys(order);
  _cupPickRowDrag=null;
  renderCoupangTableBody(shop);renderCupColPicker(shop);
}
function cupPickRowDragEnd(e){e.currentTarget.classList.remove('cp-row-dragging');document.querySelectorAll('.cp-row-drag-over').forEach(el=>el.classList.remove('cp-row-drag-over'));}
function renderCupColPicker(shop){
  const m=document.getElementById('colpick-cup-'+shop);if(!m)return;
  const hc=getCupHiddenCols();
  const cols=getCupOrderedCols();
  const vis=cols.length-hc.size;
  m.innerHTML=`<div style="padding:6px 13px 4px;font-size:11px;color:#9ca3af;font-weight:700;display:flex;justify-content:space-between;align-items:center">欄位 <span>${vis}/${cols.length}</span></div>`
    +cols.map(c=>`<div class="cp-row" draggable="true"
      ondragstart="cupPickRowDragStart(event,'${shop}','${c.k}')" ondragover="cupPickRowDragOver(event)"
      ondragenter="cupPickRowDragEnter(event)" ondragleave="cupPickRowDragLeave(event)"
      ondrop="cupPickRowDrop(event,'${shop}','${c.k}')" ondragend="cupPickRowDragEnd(event)"
      onclick="toggleCupHiddenCol('${shop}','${c.k}');event.stopPropagation()">
      <span class="cp-row-handle">⠿</span>
      <input type="checkbox" ${!hc.has(c.k)?'checked':''} style="margin:0;pointer-events:none"> ${c.label}
    </div>`).join('')
    +`<div style="padding:4px 13px 6px;border-top:1px solid #e5e7eb;text-align:right;display:flex;gap:10px;justify-content:flex-end">
      <button onclick="resetCupColOrder('${shop}')" style="font-size:11px;color:#5b5fcf;background:none;border:none;cursor:pointer;font-weight:600">重設順序</button>
      <button onclick="resetCupHiddenCols('${shop}')" style="font-size:11px;color:#5b5fcf;background:none;border:none;cursor:pointer;font-weight:600">顯示全部</button>
    </div>`;
}
function openCupColPicker(shop,btn){
  let m=document.getElementById('colpick-cup-'+shop);
  if(m){m.remove();return;}
  m=document.createElement('div');m.id='colpick-cup-'+shop;m.className='col-picker-menu open';
  const wrap=btn?.closest('.col-picker-wrap');
  (wrap||btn?.parentElement||document.body).appendChild(m);
  renderCupColPicker(shop);
  setTimeout(()=>document.addEventListener('click',function h(e){if(!m.contains(e.target)){m.remove();document.removeEventListener('click',h);}},{},true),0);
}
let _cupColDrag=null;
function cupColDragStart(e,key){
  _cupColDrag=key;
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain',key);}catch{}
  e.currentTarget.classList.add('col-dragging');
}
function cupColDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';}
function cupColDragEnter(e){e.preventDefault();e.currentTarget.classList.add('col-drag-over');}
function cupColDragLeave(e){e.currentTarget.classList.remove('col-drag-over');}
function cupColDrop(e,shop,targetKey){
  e.preventDefault();
  e.currentTarget.classList.remove('col-drag-over');
  if(!_cupColDrag||_cupColDrag===targetKey){_cupColDrag=null;return;}
  const rect=e.currentTarget.getBoundingClientRect();
  const after=(e.clientX-rect.left)>rect.width/2;
  let order=getCupColKeys().filter(k=>k!==_cupColDrag);
  let idx=order.indexOf(targetKey);
  if(idx<0)idx=order.length;else if(after)idx++;
  order.splice(idx,0,_cupColDrag);
  saveCupColKeys(order);
  _cupColDrag=null;
  renderCoupangTableBody(shop);
}
function cupColDragEnd(e){e.currentTarget.classList.remove('col-dragging');document.querySelectorAll('.col-drag-over').forEach(el=>el.classList.remove('col-drag-over'));}

function renderCoupangTable(shop,rawRows){
  const rows=mergeCoupangRows(rawRows);
  const p=_cupPeriod[shop]||{month:'2026/06',half:'first'};
  const notes=cupLoadNotes(shop,p.month,p.half);
  rows.forEach(r=>{r.note=notes[r.code]||'';});
  _cupMergedRows[shop]=rows;
  const totalRev=rows.reduce((s,r)=>s+r.rev,0);
  const totalNet=rows.reduce((s,r)=>s+r.net,0);
  const totalRate=totalRev>0?totalNet/totalRev:0;
  // 更新 KPI
  const revEl=document.getElementById('cup-kv-rev-'+shop);
  const netEl=document.getElementById('cup-kv-net-'+shop);
  const rateEl=document.getElementById('cup-kv-rate-'+shop);
  if(revEl)revEl.textContent='NT$ '+Math.round(totalRev).toLocaleString();
  if(netEl)netEl.textContent='NT$ '+Math.round(totalNet).toLocaleString();
  if(rateEl)rateEl.textContent=(totalRate*100).toFixed(1)+'%';
  renderCoupangTableBody(shop);
}
// 點欄位標題排序：跟 setSort 一樣三段循環（大到小→小到大→還原原始順序），每個賣場各自記自己的排序狀態。
const _cupSort={};
function cupSetSort(shop,col){
  const cur=_cupSort[shop];
  if(!cur||cur.col!==col)_cupSort[shop]={col,dir:'desc'};
  else if(cur.dir==='desc')_cupSort[shop]={col,dir:'asc'};
  else delete _cupSort[shop];
  renderCoupangTableBody(shop);
}
function cupSortRows(shop,rows){
  const s=_cupSort[shop];
  if(!s)return rows;
  const colDef=CUP_TABLE_COLS.find(c=>c.k===s.col);
  const isNum=!!(colDef&&colDef.fmt);
  return[...rows].sort((a,b)=>{
    if(isNum){
      const va=Number(a[s.col])||0,vb=Number(b[s.col])||0;
      return s.dir==='asc'?va-vb:vb-va;
    }
    const va=String(a[s.col]||''),vb=String(b[s.col]||'');
    return s.dir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
  });
}
// 表格本體：跟蝦皮好麻吉共用同一套 table/th/td 全站樣式（width:100%、統一內距），
// 欄位可拖曳排序，順序另外存一份（欄位集合跟好麻吉不同）。
function renderCoupangTableBody(shop){
  const rows=cupSortRows(shop,_cupMergedRows[shop]||[]);
  const tbl=document.getElementById('cup-tbl-'+shop);
  if(!tbl)return;
  const fmtFns={
    money:n=>'NT$ '+Math.round(n).toLocaleString(),
    num:n=>Math.round(n).toLocaleString(),
    pct:n=>(n*100).toFixed(1)+'%',
  };
  const hc=getCupHiddenCols();
  const cols=getCupOrderedCols().filter(c=>!hc.has(c.k));
  const dragAttrs=(key)=>`draggable="true" ondragstart="cupColDragStart(event,'${key}')" ondragover="cupColDragOver(event)" ondragenter="cupColDragEnter(event)" ondragleave="cupColDragLeave(event)" ondrop="cupColDrop(event,'${shop}','${key}')" ondragend="cupColDragEnd(event)"`;
  const curSort=_cupSort[shop];
  // 平常就顯示一個淡灰色的排序小圖示，讓人看得出來這欄可以點擊排序；目前排序中的那欄改顯示實心箭頭
  const sortIcon=(key)=>curSort&&curSort.col===key
    ?`<span style="color:#5b5fcf;font-weight:700">${curSort.dir==='asc'?'▲':'▼'}</span>`
    :`<span style="color:#d1d5db">⇅</span>`;
  const thead=cols.map(c=>{
    const isLeft=CUP_TABLE_LEFT_COLS.has(c.k);
    return `<th class="${isLeft?'tl':''}" ${dragAttrs(c.k)}><span class="th-wrap${isLeft?' tl':''}" onclick="cupSetSort('${shop}','${c.k}')" style="cursor:pointer;gap:4px">${c.label}${sortIcon(c.k)}</span></th>`;
  }).join('');
  const tbody=rows.map(r=>{
    const tds=cols.map(c=>{
      const v=r[c.k];
      if(c.k==='note'){
        const esc=String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
        return`<td class="tl"><input type="text" value="${esc}" placeholder="輸入調整…" oninput="onCupNoteChange('${shop}','${r.code}',this.value)" style="width:120px;border:1px solid #e5e7eb;border-radius:5px;padding:2px 6px;font-size:12px;outline:none;background:#fff"></td>`;
      }
      const disp=c.fmt?fmtFns[c.fmt](v):v;
      const cls=CUP_TABLE_LEFT_COLS.has(c.k)?'tl':(c.k==='net'?(v>=0?'td-pos':'td-neg'):'');
      const style=c.k==='netRate'?`style="color:${v>=0?'#6366f1':'#ef4444'};font-weight:700"`:'';
      return`<td class="${cls}" ${style}>${disp}</td>`;
    }).join('');
    return`<tr>${tds}</tr>`;
  }).join('');
  tbl.innerHTML=`<div class="tscroll"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
}

function openCoupangDist(shop){
  const rows=_cupMergedRows[shop]||[];
  const buckets=[
    {label:'0%以下',test:r=>r.netRate<0},
    {label:'0~10%',test:r=>r.netRate>=0&&r.netRate<=0.10},
    {label:'11~20%',test:r=>r.netRate>0.10&&r.netRate<=0.20},
    {label:'21~30%',test:r=>r.netRate>0.20&&r.netRate<=0.30},
    {label:'31~40%',test:r=>r.netRate>0.30&&r.netRate<=0.40},
    {label:'41~50%',test:r=>r.netRate>0.40&&r.netRate<=0.50},
    {label:'50%以上',test:r=>r.netRate>0.50},
  ];
  const distRows=buckets.map(b=>({label:b.label,count:rows.filter(b.test).length}));
  const thStyle='padding:6px 10px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;white-space:nowrap;border-bottom:2px solid #e5e7eb;background:#f9fafb';
  const tdStyle='padding:6px 10px;font-size:13px;border-bottom:1px solid #f3f4f6;white-space:nowrap';
  const body=document.getElementById('coupang-dist-body');
  if(body){
    body.innerHTML=`
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px">商品總數：${rows.length}</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th style="${thStyle}">純利率區間</th><th style="${thStyle};text-align:right">商品數</th></tr></thead>
        <tbody>${distRows.map((d,i)=>`<tr><td style="${tdStyle};background:${i%2===0?'#fff':'#fafafa'}">${d.label}</td><td style="${tdStyle};text-align:right;background:${i%2===0?'#fff':'#fafafa'}">${d.count}</td></tr>`).join('')}</tbody>
      </table>`;
  }
  document.getElementById('coupang-dist-overlay').classList.add('open');
}
function closeCoupangDist(){
  document.getElementById('coupang-dist-overlay')?.classList.remove('open');
}

function updateHalfBtnLabels(shop){
  const m=state[shop]?.curMonth||'2026/05';
  const[y,mo]=m.split('/');
  const last=new Date(+y,+mo,0).getDate();
  const curHalf=state[shop]?.curHalf||'first';
  const btns=[
    {id:'first',label:'上半月'},
    {id:'second',label:'下半月'},
    {id:'full',label:'整月'},
  ];
  const container=document.getElementById('half-btns-'+shop);
  if(!container)return;
  container.innerHTML=`<select onchange="onHalfChange('${shop}',this.value,null)" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">${btns.map(h=>`<option value="${h.id}"${h.id===curHalf?' selected':''}>${h.label}</option>`).join('')}</select>`;
}

function initProfitPeriodControls(){
  const wrap=document.getElementById('profit-period-wrap');
  if(!wrap||wrap.dataset.init)return;
  wrap.dataset.init='1';
  SHOPS.forEach(s=>{
    const div=document.createElement('div');
    div.id='period-row-'+s.id;
    div.style.cssText='display:none;align-items:center;gap:8px;flex-wrap:wrap';
    div.innerHTML=`
      <span style="font-size:12px;color:#6b7280;font-weight:500">月份</span>
      <select id="month-sel-${s.id}" onchange="onMonthChange('${s.id}')" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">
        ${MONTHS.map(mo=>`<option value="${mo}" ${mo===(state[s.id].curMonth||'2026/05')?'selected':''}>${mo}</option>`).join('')}
      </select>
      <span style="font-size:12px;color:#6b7280;font-weight:500;margin-left:4px">區間</span>
      <div id="half-btns-${s.id}" style="display:flex;gap:4px"></div>`;
    wrap.appendChild(div);
    updateHalfBtnLabels(s.id);
  });
  if(curShop&&curShop!=='總表'){
    const el=document.getElementById('period-row-'+curShop);
    if(el)el.style.display='flex';
    const wrapRow=document.getElementById('profit-period-wrap-row');
    if(wrapRow)wrapRow.style.display='flex';
  }
}

function initShopUI(shop){
  onMonthChange(shop);
  if(lsHasAny(shop)){const d=document.getElementById('dot-'+shop);if(d)d.classList.add('on');}
  if(Object.keys(globalMap).length>0){
    const uc=document.getElementById('uc-map-'+shop);
    const ui=document.getElementById('ui-map-'+shop);
    if(uc)uc.className='ucard ok';
    if(ui)ui.textContent='✅';
  }
}

// ── Export ──
function doExport(shop){
  const built=state[shop]._built;if(!built?.length)return;
  const wb=XLSX.utils.book_new();
  const isHaomaji = shop === '好麻吉';
  const h=['商品ID','編號','商品名稱','廣告費','營收','毛利','淨利','淨利率%','廣告佔比%','可用庫存','目標ROI','直接投入產出','投入產出','實際-目標','點擊數','日預算','分析','調整備註',
    ...(isHaomaji?['上半月營收','成長比','成長分析','成長調整']:[])];
  const exportNotes=getNotes(shop);
  const d=built.map(r=>[
    !r.shopeeIds?.length?'未對應':r.shopeeIds.length===1?r.shopeeIds[0]:'多個',
    r.code,r.name,+r.adsFee.toFixed(0),+r.rev.toFixed(0),+r.gross.toFixed(0),+r.pureProfit.toFixed(0),
    +(r.pureRate*100).toFixed(2),+(r.adsPct*100).toFixed(2),r.stock,
    r.targetROI!==null?+r.targetROI.toFixed(2):'-',r.directROI>0?+r.directROI.toFixed(2):'-',
    r.roi>0?+r.roi.toFixed(2):'-',r.roiDiff!==null?+r.roiDiff.toFixed(2):'-',
    r.clicks>0?r.clicks:'-',r.dayBudget>0?+r.dayBudget.toFixed(0):'-',
    r.analysis?.label||'', exportNotes[r.code]||'',
    ...(isHaomaji?[
      r.prevRev!==null?+r.prevRev.toFixed(0):'-',
      r.growthRate!==null?+((r.growthRate*100).toFixed(2)):'-',
      r.growthAnalysis?.label||''
    ]:[])
  ]);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([h,...d]),shop);
  XLSX.writeFile(wb,`淨利表_${shop}_${state[shop]._period||''}.xlsx`);
}

// ── Helpers ──
function setKpis(shop,rev,gross,ads,pure,prevRev){
  const revEl=document.getElementById('kv-rev-'+shop);if(revEl)revEl.textContent='NT$ '+fmtN(rev);
  const pureEl=document.getElementById('kv-net-'+shop);
  const pureHtml='NT$ '+fmtN(pure)+(rev?` <span style="font-size:13px;color:#6b7280;font-weight:500">(${(pure/rev*100).toFixed(1)}%)</span>`:'');
  if(pureEl)pureEl.innerHTML=pureHtml;
  const adsHtml='NT$ '+fmtN(ads)+(rev?` <span style="font-size:13px;color:#6b7280;font-weight:500">(${(ads/rev*100).toFixed(2)}%)</span>`:'');
  const adsEl=document.getElementById('kv-ads-'+shop);if(adsEl)adsEl.innerHTML=adsHtml;
  if(shop!==curShop)return;
  const hRev=document.getElementById('kv-rev-header');
  const hNet=document.getElementById('kv-net-header');
  const hAds=document.getElementById('kv-ads-header');
  if(hRev)hRev.textContent='NT$ '+fmtN(rev);
  const chEl=document.getElementById('kv-rev-change-header');
  if(chEl){
    if(prevRev&&prevRev>0&&rev>0){const pct=(rev-prevRev)/prevRev*100;const sign=pct>=0?'+':'';const col=pct>=0?'#10b981':'#ef4444';chEl.innerHTML=`<span style="color:${col}">(${sign}${pct.toFixed(1)}% 較上期)</span>`;}
    else{chEl.innerHTML='';}
  }
  if(hNet){hNet.innerHTML=pureHtml;hNet.style.color=pure>=0?'#10b981':'#ef4444';}
  if(hAds)hAds.innerHTML=adsHtml;
}
function syncHeaderKpis(shop){
  if(shop==='總表'||!state[shop]){return;}
  const s=state[shop];
  if(!s._built||!s._built.length){setKpis(shop,0,0,0,0,null);return;}
  let tRev=0,tGross=0,tAds=0,tPure=0;
  s._built.forEach(r=>{tRev+=r.rev;tGross+=r.gross;tAds+=r.adsFee;tPure+=r.pureProfit;});
  // 直接讀取上期儲存報表算總營收
  let prevTotalRev=null;
  try{
    const m=s.curMonth,h=s.curHalf;
    const [y,mo]=m.split('/').map(Number);
    let prevM,prevH;
    if(h==='second'){prevM=m;prevH='first';}
    else if(h==='first'){prevM=mo===1?`${y-1}/12`:`${y}/${String(mo-1).padStart(2,'0')}`;prevH='second';}
    else{prevM=mo===1?`${y-1}/12`:`${y}/${String(mo-1).padStart(2,'0')}`;prevH='full';}
    const prevRep=lsLoad(shop,prevM,prevH);
    if(prevRep&&prevRep.built&&prevRep.built.length){let t=0;prevRep.built.forEach(r=>{t+=r.rev||0;});if(t>0)prevTotalRev=t;}
  }catch{}
  setKpis(shop,tRev,tGross,tAds,tPure,prevTotalRev);
}
function num(v){return parseFloat((v+'').replace(/[,$%]/g,'').trim())||0;}
function fmtN(v){return Math.abs(Math.round(v)).toLocaleString();}
function fmtAds(v){const n=Math.abs(v);return n===0?'0':n.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});}
function pill(r){if(r===null||r===undefined)return'<span class="pill pn">—</span>';const c=r>=55?'ph':r>=35?'pm':'pl';return`<span class="pill ${c}">${r.toFixed(1)}%</span>`;}

document.addEventListener('click', function(e) {
  if (e.target.closest('[data-office-tab="profit"]')) {
    setTimeout(function() {
      if (typeof SHOPS !== 'undefined') {
        try {
          SHOPS.forEach(function(s) {
            var el = document.getElementById('content-' + s.id);
            if (el && !el.innerHTML.trim() && typeof shopHTML === 'function') el.innerHTML = shopHTML(s.id);
          });
          if(typeof initProfitPeriodControls==='function') initProfitPeriodControls();
          SHOPS.forEach(function(s) { if (typeof initShopUI === 'function') initShopUI(s.id); });
          try{var _sv=localStorage.getItem('ec_curShop');if(_sv&&_sv!=='總表'&&typeof setShop==='function'){var _sb=document.querySelector("button[onclick*=\"setShop('"+_sv+"'\"]");setShop(_sv,_sb||null);}}catch{}
        } catch(e) { console.log(e); }
      }
    }, 150);
  }
});

/* ===================== window 匯流排 ===================== */
Object.assign(window, { SHOPS, MONTHS, HALVES, state, globalMap });
// curShop 是 module 內部 let，會被 setShop / setCoupangShop / setMomoShop 重新賦值。
// inline handler（如 onclick="syncToCloud(curShop)"）在 ESM 下讀不到 module scope，
// 用 defineProperty 掛成 window 的 live getter，每次讀都拿到最新值。
Object.defineProperty(window, 'curShop', { get: () => curShop, configurable: true });

Object.assign(window, {
  _cloudRead,_cloudWrite,_cloudWriteSafe,_doGenerate,_showSyncBtn,addGrowthCond,addNewAnaCond,
  applyFilters,applyFpNum,applyFpTxt,buildDistHtml,buildNoteCell,buildShop,calcAnalysis,
  calcGrowthAnalysis,checkAdsReconcile,checkReady,clearColFilter,clearPeriod,clearPeriodFromModal,closeAdsEditModal,
  closeAnaSettings,closeDeleteFileModal,closeDistModal,closeGrowthSettings,closePopup,
  closeProfitNoteModal,closeTfDrop,closeUploadModal,commitEdit,commitNote,confirmAddSummaryRow,
  confirmAdsEdit,confirmDeleteFile,confirmUnmatched,deleteCustomAnaRule,deleteCustomGrowthRule,
  deleteProfitNote,deleteSummaryRow,deleteUpload,disableAnaTag,disableGrowthTag,doExport,
  editSummaryCell,evalAnaConds,findUnmatchedAds,fmKey,fmtAds,fmtN,g,generate,getAnaThresh,
  getCustomAnaRules,getCustomGrowthRules,getDays,getDisabledAnaTags,getDisabledGrowthTags,
  getEdits,getGrowthThresh,getHiddenCols,getNotes,getPeriodLabel,getPlatformRate,getPrevPeriodKey,
  getPrevRevMap,getSummaryRows,getTagFilters,gg,initProfitPeriodControls,initShopUI,
  loadIntoUI,lsHasAny,lsKey,lsLoad,lsSave,markCard,num,onFile,onGlobalFile,onGlobalGenerate,
  onHalfChange,onMapFile,onMonthChange,openAddSummaryRowModal,openAnaSettings,openColPicker,
  openDeleteFileModal,openDistModal,openFilter,openGrowthSettings,openNotePopup,openUnmatchedModal,
  openTestSettings,closeTestSettings,addTestDraftCond,removeTestDraftCond,deleteTestDraftRule,addTestDraftRule,saveTestSettings,
  openUploadModal,outsideClick,parseAdsCsv,patchRow,pill,readGrowthNewConds,readNewConds,
  reapplyAnaToAll,recalcRow,removeGroupAds,removeGrowthCond,removeNewCond,renderAnaModalBody,
  renderColPicker,renderGroupAdsCards,renderGrowthModalBody,renderPnmList,renderSummary,
  renderTable,resetHiddenCols,resetUploadCards,restoreAnaTag,restoreGrowthTag,saveAnaSettings,
  buildKpiTabHtml,renderKpiTab,getKpiRows,saveKpiRows,setKpiViewMode,setKpiYear,setKpiMonthNum,
  deleteKpiRow,editKpiCell,editKpiCommonCost,toggleKpiGroup,kpiCellClick,editKpiFieldNote,editKpiMergedField,
  saveAnaThresh,saveCustomAnaRules,saveCustomGrowthRules,saveEdits,saveGroupAdsMeta,
  saveGrowthSettings,saveGrowthThresh,saveNotes,saveSummaryRows,saveTagFilters,setColFilter,
  closeCoupangDist,closeCoupangUpload,generateCoupang,onCoupangFile,onCupHalfChange,onCupMonthChange,onCupNoteChange,openCoupangDist,openCoupangUpload,renderCoupangTable,setCoupangShop,syncCoupangToCloud,setKpis,setMomoShop,setShop,setSort,setSpin,setTagFilter,shopHTML,showMapWarnBanner,showReconcileDetail,splitCSV,
  coupangSummaryHTML,setCoupangSummaryView,syncCoupangSummaryFromKpi,
  showSheetReassignModal,escapeHtmlLike,
  startEdit,startNote,submitNewAnaRule,submitNewGrowthRule,submitProfitNote,syncHeaderKpis,
  syncToCloud,toggleHiddenCol,toggleTagPopup,toggleTfDrop,tryLoadSaved,umHideDrop,umSearch,
  ignoreAllUnmatched,umSelect,umSetAll,umToggle,updateAdsEditPreview,updateDaysBadge,updateHalfBtnLabels,
  updateTagFilterBar,validateMapWarnings,
  applySuggFilter,clearSuggFilter,
  closeSuggAlert,gotoSuggFiltered,checkSuggAlert,
  updateSuggChip,buildSuggCell,
  colDragStart,colDragOver,colDrop,colDragEnd,colDragEnter,colDragLeave,resetColOrder,
  cpRowDragStart,cpRowDragOver,cpRowDragEnter,cpRowDragLeave,cpRowDrop,cpRowDragEnd,
  cupColDragStart,cupColDragOver,cupColDragEnter,cupColDragLeave,cupColDrop,cupColDragEnd,
  renderCoupangTableBody,
  toggleCupHiddenCol,resetCupHiddenCols,resetCupColOrder,openCupColPicker,
  cupPickRowDragStart,cupPickRowDragOver,cupPickRowDragEnter,cupPickRowDragLeave,cupPickRowDrop,cupPickRowDragEnd,
  cupSetSort,
  setShopViewMode,
  openMomoRptUpload,closeMomoRptUpload,onMomoRptFile,generateMomoRpt,syncMomoRptToCloud,
  onMypMonthChange,onMypHalfChange,
  openAffUpload,closeAffUpload,onAffFile,generateAffRpt,syncAffRptToCloud,affSetSort,clearAffRpt,
  openMypColPicker,toggleMypHiddenCol,resetMypHiddenCols,resetMypColOrder,
  mypColDragStart,mypColDragOver,mypColDragEnter,mypColDragLeave,mypColDrop,mypColDragEnd,
  mypPickRowDragStart,mypPickRowDragOver,mypPickRowDragEnter,mypPickRowDragLeave,mypPickRowDrop,mypPickRowDragEnd,
  mypSetSort,
  setScoreQ,toggleScoreDefs,adjustScoreBonus,editScoreMonthlyCell,toggleScoreDetailCell,
  openEditScoreTargetsModal,saveScoreTargetsModal,
});
