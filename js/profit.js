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
            <span style="width:1px;height:18px;background:#d1d5db;margin:0 2px"></span><button class="stab" style="font-size:15px" onclick="setShop('重點檢視',this)">重點檢視</button>
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
            <input type="number" class="setting-input" id="platformRate" value="20.5" min="0" max="100" step="0.1" style="width:54px" onchange="onPlatformRateChange()">
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
  <div id="content-重點檢視" class="shop-content" style="padding:16px 20px;min-height:200px"></div>
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
const _initCurHalf=_initNow.getDate()<=15?'first':'second';
// 為什麼不能直接字串排序：half 的字母序是 first < full < second，
// 與時間語意不符（full 涵蓋整月，應排在 first 之後、second 之前）。
// ⚠ _HALF_RANK 是 const（不會 hoist），而 _findLatestPeriod 會在下方 state 初始化時就被呼叫，
//   故 _HALF_RANK / _periodRank 必須定義在 state 初始化之前；_findLatestPeriod 才放 lsHasAny 下方。
const _HALF_RANK={first:0,full:1,second:2};
function _periodRank(month,half){
  return (month||'')+'#'+(_HALF_RANK[half]!==undefined?_HALF_RANK[half]:0);
}
// 預設期間：跳到該賣場「最新有資料」的期間（2026-07-24 修正）。
// 原因：報表要等該期間結束後才產生，所以「當期」永遠沒資料，
//       預設跟今天走會導致幾乎每天打開都是空白。
// 找不到任何報表才 fallback 到今天（新賣場 / 全新瀏覽器）。
function _readLastMonth(shopId){
  const p=_findLatestPeriod(shopId);
  if(p&&MONTHS.indexOf(p.month)>=0) return p.month;
  return MONTHS.indexOf(_initCurMonth)>=0?_initCurMonth:MONTHS[MONTHS.length-1];
}
function _readLastHalf(shopId){
  const p=_findLatestPeriod(shopId);
  return p?p.half:_initCurHalf;
}
SHOPS.forEach(s=>{state[s.id]={rawMobic:null,rawAds:null,rawSelAds:null,rawGroupAdsList:[],rawMap:{},curMonth:_readLastMonth(s.id),curHalf:_readLastHalf(s.id),days:15,_built:null,_period:'',filters:{},sorts:{},tagFilters:[],search:''};});
let globalMap={};
let curShop='總表';
let openPopup=null;

// ── Storage（本機優先、雲端手動同步） ──
// 追蹤所有已改但還沒推雲端的 key，讓使用者按「☁ 同步雲端」時一次推
const _pendingSyncKeys = new Set();
// 「✓ 已同步」2 秒後還原成待同步徽章的計時器 handle。
// 存起來讓下次 syncToCloud 一開始就 clearTimeout，避免上一次同步埋的重畫
// 在這一次同步的進度顯示（「同步中 i/N」）中途引爆、把進度蓋掉。
let _syncBtnRepaintTimer = null;
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
// ── lsSave 存檔失敗通報（配額滿了會靜默失敗，見 PR：lssave-quota-alert）──
let _lsFailNotified = false;   // 同一次 session 只彈一次窗，之後只出 toast

function _isQuotaErr(e){
  if(!e) return false;
  const n = e.name || '';
  return n === 'QuotaExceededError'
      || n === 'NS_ERROR_DOM_QUOTA_REACHED'
      || e.code === 22
      || e.code === 1014;
}

function _halfLabel(h){
  return h === 'first' ? '上半月' : h === 'second' ? '下半月' : h === 'full' ? '整月' : String(h||'');
}

// 判斷一筆調整日期是否屬於某期間。未知一律 false（date 格式錯、跨月、half 值不認得）。
// dateStr='2026/07/09'、month='2026/07'（來自 state[shop].curMonth）、half='first'|'second'|'full'
function _inPeriod(dateStr,month,half){
  if(!/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr))return false;
  if(dateStr.slice(0,7)!==month)return false;
  if(half==='full')return true;
  const day=+dateStr.slice(8,10);
  if(half==='first')return day<=15;
  if(half==='second')return day>=16;
  return false;
}
window._inPeriod=_inPeriod;

function _notifyLsSaveFail(shop, month, half, err){
  const who = shop + ' ' + month + '｜' + _halfLabel(half);
  const quota = _isQuotaErr(err);
  console.error('[lsSave] 存檔到 localStorage 失敗：' + who, err);

  const title = quota ? '本機空間已滿，報表沒存進電腦' : '報表沒存進電腦';
  const message =
    who + ' 的報表沒有存進這台電腦。\n' +
    '資料目前只在記憶體裡，重整或關掉分頁就會消失。\n\n' +
    '請現在按「☁ 同步雲端」把它推上去（推得上去，不受這個問題影響）。\n' +
    '保險起見也可以先按「匯出 Excel」留一份。';
  const detail = (err && (err.name || err.message))
    ? ('錯誤：' + (err.name||'') + ' ' + (err.message||'')) : '';

  if(!_lsFailNotified){
    _lsFailNotified = true;
    if(window.App && typeof App.showAlertModal === 'function'){
      App.showAlertModal({ title:title, message:message, detail:detail, kind:'error', dedupeKey:'lsSaveFail' });
      return;
    }
  }
  if(typeof showToast === 'function'){
    showToast('報表沒存進本機，請先按同步雲端再重整', 'error');
  }
}

function lsSave(shop,month,half,built,period,days){
  // 只存本機；同步雲端需手動按「☁ 同步雲端」
  const payload={built,period,days,rate:getPlatformRate(shop),ts:Date.now()};
  const k=lsKey(shop,month,half);
  let saveErr=null;
  try{localStorage.setItem(k,JSON.stringify(payload));}catch(e){saveErr=e;}
  try{if(typeof Store!=='undefined'&&Store._profitMem)Store._profitMem[k]=payload;}catch{}
  // 記完整的 lsKey 到 pending set — 這樣使用者切到別的月份/賣場再產生報表，
  //   舊的月份/賣場也還在 pending 裡，按同步時會一起推上雲端（避免只推當前顯示那份）
  _pendingSyncKeys.add(k);
  _showSyncBtn(shop);
  if(saveErr){ try{ _notifyLsSaveFail(shop, month, half, saveErr); }catch(e2){ console.error('[lsSave] 通報失敗', e2); } }
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
  if(typeof momoRefreshSyncBtn==='function') momoRefreshSyncBtn();   // MOMO 頁那顆同步鈕跟著刷新（同一個 pending 來源）
}
// 掃出本機所有 ec|shop|month|half 報表 key 塞進 pending set
//   讓 syncToCloud 不只推「本次會話新增」的，也把 localStorage 裡累積
//   （包含前次重整前留下、pending set 已清空）的一併推上雲端。
function _sweepAllLocalReportsIntoPending(){
  // ⚠️ 這裡的白名單前綴（ec_momo_products| / ec_momo_rent_records / ec| 非 filemeta）若改動，
  //    _momoSyncPendingCount()（本檔搜 `function _momoSyncPendingCount`）的唯讀版也要一起改，否則 MOMO 同步鈕亮暗會對不上。
  // 塊B：拿掉原本「掃 Store._profitMem 塞進 pending」那段。它會把雲端載回的報表
  //   也當 pending、再原封不動推回雲端 → 多人同時同步時「後按的用自己記憶體版本
  //   蓋掉全部」（舊蓋新的併發覆蓋）。改為只掃 localStorage：只推本機親手產生/編輯過的。
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      // MOMO 商品主檔（持續性資料）：走 field 分支（setField 讀 Store._mem），
      //   比照報表一起補掃，避免「存了商品→重整前沒同步」漏推。
      if(k&&k.startsWith('ec_momo_products|')){
        _pendingSyncKeys.add(k);
        if(!(Store._mem&&Store._mem[k])){
          try{ Store._mem=Store._mem||{}; Store._mem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
        continue;
      }
      // MOMO 倉租費（P6）：同商品主檔走 field 分支，補進來避免「存了→重整前沒同步」漏推
      if(k==='ec_momo_rent_records'){
        _pendingSyncKeys.add(k);
        if(!(Store._mem&&Store._mem[k])){
          try{ Store._mem=Store._mem||{}; Store._mem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
        continue;
      }
      // MOMO 月對帳（階段二）：ec_momo_reconcile|<shop>|<YYYY-MM> → momo_reconcile collection（每 shop 每月一 doc）
      if(k&&k.startsWith('ec_momo_reconcile|')){
        _pendingSyncKeys.add(k);
        if(!(Store._mem&&Store._mem[k])){
          try{ Store._mem=Store._mem||{}; Store._mem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
        continue;
      }
      // MOMO 運費（階段四）：ec_momo_freight|<shop>|<YYYY-MM> → 走 __cloudProfit.setField field 分支（不開新雲端物件，EXPECT 維持 7/12）
      if(k&&k.startsWith('ec_momo_freight|')){
        _pendingSyncKeys.add(k);
        if(!(Store._mem&&Store._mem[k])){
          try{ Store._mem=Store._mem||{}; Store._mem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
        continue;
      }
      // MOMO S1103 銷售排行榜：ec_momo_s1103|<period> → 同上 field 分支
      if(k&&k.startsWith('ec_momo_s1103|')){
        _pendingSyncKeys.add(k);
        if(!(Store._mem&&Store._mem[k])){
          try{ Store._mem=Store._mem||{}; Store._mem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
        continue;
      }
      // MOMO 優化紀錄（待辦C）：ec_momo_optlog|<shop> → 同上 field 分支（EXPECT 維持 7/12）
      if(k&&k.startsWith('ec_momo_optlog|')){
        _pendingSyncKeys.add(k);
        if(!(Store._mem&&Store._mem[k])){
          try{ Store._mem=Store._mem||{}; Store._mem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
        continue;
      }
      // MOMO 莫筆克 origin→cost 持久表（帳號級單一 key）→ 同上 field 分支
      if(k==='ec_momo_cost_by_origin'){
        _pendingSyncKeys.add(k);
        if(!(Store._mem&&Store._mem[k])){
          try{ Store._mem=Store._mem||{}; Store._mem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
        continue;
      }
      // filemeta 不上雲（雲端零讀取端）→ 不塞進 pending，省下「撈進來→推送略過→收尾刪」的白工
      if(k&&k.startsWith('ec|')&&!k.startsWith('ec|filemeta|')){
        _pendingSyncKeys.add(k);
        // localStorage 有但 _profitMem 沒有 → 撈回 _profitMem 讓推送流程拿得到
        if(!(Store._profitMem&&Store._profitMem[k])){
          try{ Store._profitMem=Store._profitMem||{}; Store._profitMem[k]=JSON.parse(localStorage.getItem(k)); }catch{}
        }
      }
    }
  }catch{}
}

async function syncToCloud(shop, allowKeys){   // allowKeys=Set → 只推選中的 key（逐項勾選）；不傳=全推
  const btn=document.getElementById('global-sync-btn');
  // 斷掉上一次同步埋的「2 秒後還原徽章」重畫，免得它在這次的進度顯示中途引爆蓋掉進度
  clearTimeout(_syncBtnRepaintTimer);
  if(btn){btn.disabled=true;btn.textContent='同步中…';}
  // 每一條出口都會覆寫 window.__lastSyncReport（含 ts），永久保留，方便日後診斷「同步怪怪的」
  const _report=(mode,extra)=>{ window.__lastSyncReport=Object.assign({ts:Date.now(),mode,ok:[],failed:[],skippedProblem:[],skippedByDesign:[]},extra||{}); };
  if(!window.__cloudProfit||!window.__cloudProfitCol){
    if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'雲端未連線',message:'淨利表的雲端尚未就緒，請重新整理。',kind:'warn'});
    else if(typeof showToast==='function') showToast('雲端未連線','error');
    _report('aborted',{reason:'雲端未連線'});
    if(btn)btn.disabled=false;return;
  }
  try{
    // 一併把本機累積的所有 ec|* 報表塞進 pending，確保重整後遺失的也會被推
    _sweepAllLocalReportsIntoPending();
    const s=state[shop];
    const isPlainObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
    const tasks=[];                 // { key, run:()=>Promise }：延遲執行，逐一 await（佇列深度恆為 1）
    const skippedByDesign=[];       // filemeta：故意不上雲，安靜
    const skippedProblem=[];        // 讀不到 / 損毀 / 非物件：一定要浮上來
    // 同步當前通路的備註 / 編輯（按期間獨立存）
    const _nk=shop+'|'+(s?.curMonth||'')+'|'+(s?.curHalf||'');
    const notes=getNotes(_nk);
    if(Object.keys(notes).length>0) tasks.push({key:'ec_notes|'+_nk,run:()=>window.__cloudProfit.setField('ec_notes|'+_nk,notes)});
    const edits=getEdits(shop);
    if(Object.keys(edits).length>0) tasks.push({key:'ec_edits|'+shop,run:()=>window.__cloudProfit.setField('ec_edits|'+shop,edits)});
    // 遍歷所有 pending keys 分類：
    //   ec|filemeta|... = filemeta，故意不上雲 → skippedByDesign（安靜）
    //   ec|... 其他      = 報表 key，payload 要是物件才推；讀不到/損毀 → skippedProblem（要講）
    //   __shop__|...     = 歷史 marker，忽略
    //   其他            = 設定/標籤等，用 setField 推
    _pendingSyncKeys.forEach(pk=>{
      if(pk.startsWith('__shop__|')) return;
      if(pk.startsWith('ec|filemeta|')){ skippedByDesign.push(pk); return; }
      if(pk.startsWith('ec|')){
        const payload=Store._profitMem&&Store._profitMem[pk];
        if(isPlainObj(payload)){ tasks.push({key:pk,run:()=>window.__cloudProfitCol.setReport(pk,payload)}); }
        else{ skippedProblem.push({key:pk,reason:'報表資料讀不到或損毀'}); }
        return;
      }
      if(pk.startsWith('ec_momo_products|')){   // MOMO 商品主檔 → momo_products collection（每賣場一 doc，避開 app/profit 1MB）
        const shop=pk.split('|')[1];
        const items=momoPendingProducts(pk);   // ⚠ 讀待同步本機值(_mem→localStorage)，非 momoLoadProducts(_profitMem 優先，會 stale)→ 推的==預覽看的
        if(window.__cloudMomo && Array.isArray(items)){ tasks.push({key:pk,run:()=>window.__cloudMomo.setShop(shop,items)}); }
        else{ skippedProblem.push({key:pk,reason:'MOMO 商品主檔讀不到，或雲端層未就緒'}); }
        return;
      }
      if(pk.startsWith('ec_momo_reconcile|')){   // MOMO 月對帳 → momo_reconcile collection（每 shop 每月一 doc）
        const parts=pk.split('|');   // ['ec_momo_reconcile', shop, 'YYYY-MM']
        const rShop=parts[1], rMonth=parts[2];
        const data=momoLoadReconcile(rShop, rMonth);   // _profitMem → _mem → localStorage
        if(window.__cloudReconcile && data && rShop && rMonth){ tasks.push({key:pk,run:()=>window.__cloudReconcile.setMonth(rShop,rMonth,data)}); }
        else{ skippedProblem.push({key:pk,reason:'MOMO 月對帳讀不到，或雲端層未就緒'}); }
        return;
      }
      // field key（設定類）
      let val=null;
      try{ if(Store._mem && Store._mem[pk]!==undefined) val=Store._mem[pk]; }catch{}
      if(val===null){ try{ const raw=localStorage.getItem(pk); if(raw) val=JSON.parse(raw); }catch{} }
      if(val!==null && val!==undefined) tasks.push({key:pk,run:()=>window.__cloudProfit.setField(pk,val)});
      else skippedProblem.push({key:pk,reason:'設定值讀不到'});
    });
    if(allowKeys instanceof Set){ const before=tasks.length; for(let i=tasks.length-1;i>=0;i--){ if(!allowKeys.has(tasks[i].key)) tasks.splice(i,1); } console.log('[syncToCloud] allowKeys 過濾:',before,'→',tasks.length,'｜選中:',[...allowKeys]); }   // 逐項勾選：只推選中的 key
    console.log('[syncToCloud] tasks:',tasks.length,'skippedProblem:',skippedProblem.length,'skippedByDesign:',skippedByDesign.length,'｜要推 keys:',tasks.map(t=>t.key));
    if(tasks.length===0){
      // 沒有要送的 task —— 但有 skippedProblem 一定要講，不能只說「沒有需要同步」（那正是舊 bug）
      if(skippedProblem.length>0){
        if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'淨利表同步未完成',message:'有 '+skippedProblem.length+' 筆資料在本機讀不到、沒推上去（可能損毀）。\n請到淨利表重新產生這些報表。',detail:skippedProblem.map(x=>x.key+'：'+x.reason).join('\n'),kind:'error'});
        else if(typeof showToast==='function') showToast('有 '+skippedProblem.length+' 筆資料讀不到','error');
        _report('nothing',{skippedProblem,skippedByDesign});
      }else{
        if(typeof showToast==='function') showToast('沒有需要同步的資料','info');
        _report('nothing',{skippedByDesign});
      }
      if(btn){btn.disabled=false; _showSyncBtn();} return;
    }
    // 逐一 await：一次只送一筆，佇列深度恆為 1 → 不會撞 resource-exhausted；一筆炸不拖垮其他
    const ok=[]; const failed=[];
    for(let i=0;i<tasks.length;i++){
      if(btn) btn.textContent='同步中 '+(i+1)+'/'+tasks.length;
      const _k=tasks[i].key;
      try{ await tasks[i].run(); ok.push(_k); console.log('[PUSH] ✓',_k); }   // collection(momo_products/reconcile)寫入分支現在也有 log，路徑不再是黑的
      catch(e){ failed.push({key:_k,msg:(e&&e.message)||String(e)}); console.error('[PUSH] ✗',_k,e); }
    }
    // pending 清理：只保留 failed + skippedProblem（要重試 / 要一直提醒），其餘刪掉
    // 只清掉「這次真的推成功」的 key（ok）；失敗/讀不到/逐項勾選未選的一律留在 pending 下次再推
    ok.forEach(k=>_pendingSyncKeys.delete(k));
    if(skippedByDesign.length) console.log('[syncToCloud] 略過 filemeta '+skippedByDesign.length+' 筆（不上雲）');
    _report('done',{ok,failed,skippedProblem,skippedByDesign});
    // 收尾：綠色「✓」只在 failed=0 且 skippedProblem=0 時出現；只要有問題就 ⚠ + 彈窗
    const problems=failed.length+skippedProblem.length;
    if(problems===0){
      if(btn){btn.textContent='✓ 已同步 '+ok.length+' 筆';btn.style.background='#10b981';btn.style.color='#fff';btn.style.borderColor='#10b981';_syncBtnRepaintTimer=setTimeout(()=>{ _showSyncBtn(); },2000);}
      if(typeof showToast==='function') showToast('✓ 已同步 '+ok.length+' 筆到雲端','success');
      // 同步成功後，把今天的調整摘要自動寫入該同事的工作日誌（失敗只記 console，不影響同步結果判定）
      try { if(window.App && typeof App._updateDailyProgressFromAdjustments === 'function') App._updateDailyProgressFromAdjustments({ pushToCloud: true }); }
      catch(e){ console.warn('[autoSummary profit]', e); }
    }else{
      if(btn){btn.disabled=false;btn.textContent='⚠ '+ok.length+' 成功 / '+problems+' 未完成';btn.style.background='#f59e0b';btn.style.color='#fff';btn.style.borderColor='#f59e0b';}
      const lines=[];
      failed.forEach(f=>lines.push('［失敗］'+f.key+'：'+f.msg));
      skippedProblem.forEach(p=>lines.push('［讀不到］'+p.key+'：'+p.reason));
      let msg='成功 '+ok.length+' 筆。';
      if(failed.length) msg+='\n'+failed.length+' 筆沒推上雲端，資料還在本機 → 重整前請先匯出 Excel 備份，稍後再按同步重試。';
      if(skippedProblem.length) msg+='\n'+skippedProblem.length+' 筆在本機讀不到（可能損毀）→ 請到淨利表重新產生這些報表。';
      if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'淨利表同步未完成',message:msg,detail:lines.join('\n'),kind:'error'});
      else if(typeof showToast==='function') showToast('同步未完成：'+problems+' 筆有問題','error');
    }
  }catch(err){
    // 安全網：任何沒預期到的 throw 也要留下 report、告訴使用者，絕不靜默
    const msg=(err&&err.message)||String(err);
    _report('error',{reason:msg});
    if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'淨利表同步異常',message:'同步過程發生未預期的錯誤，資料還在本機。',detail:msg,kind:'error'});
    else if(typeof showToast==='function') showToast('同步異常：'+msg,'error');
    if(btn){btn.disabled=false; _showSyncBtn();}
  }
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
// ── 找出某賣場「最新有資料」的期間（月份+區間）──
// 用 function declaration（會 hoist），故可在上方 state 初始化(:317 附近)時就被呼叫。
function _findLatestPeriod(shop){
  const prefix='ec|'+shop+'|';
  const seen=new Set();
  const collect=k=>{
    if(typeof k!=='string'||k.indexOf(prefix)!==0)return;
    const p=k.split('|');
    if(p.length<4)return;
    const month=p[2],half=p[3];
    if(!month||!half)return;
    if(_HALF_RANK[half]===undefined)return;   // 不認得的 half 一律略過
    seen.add(month+'|'+half);
  };
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Object.keys(Store._profitMem).forEach(collect); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Object.keys(Store._mem).forEach(collect); }catch{}
  try{ for(let i=0;i<localStorage.length;i++) collect(localStorage.key(i)); }catch{}
  if(!seen.size) return null;
  let best=null,bestRank='';
  seen.forEach(v=>{
    const [m,h]=v.split('|');
    const r=_periodRank(m,h);
    if(r>bestRank){bestRank=r;best={month:m,half:h};}
  });
  return best;
}
// 列出某賣場所有已存在的報表期間，由新到舊排序。
// 掃描邏輯與 _findLatestPeriod 相同，差別是回傳全部而非只回最新。
function _listPeriods(shop){
  const prefix='ec|'+shop+'|';
  const seen=new Set();
  const collect=k=>{
    if(typeof k!=='string'||k.indexOf(prefix)!==0)return;
    const p=k.split('|');
    if(p.length<4)return;
    const month=p[2],half=p[3];
    if(!month||!half)return;
    if(_HALF_RANK[half]===undefined)return;
    seen.add(month+'|'+half);
  };
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Object.keys(Store._profitMem).forEach(collect); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Object.keys(Store._mem).forEach(collect); }catch{}
  try{ for(let i=0;i<localStorage.length;i++) collect(localStorage.key(i)); }catch{}
  return [...seen].map(v=>{
    const [month,half]=v.split('|');
    return {month,half,rank:_periodRank(month,half)};
  }).sort((a,b)=>a.rank<b.rank?1:a.rank>b.rank?-1:0);   // 由新到舊
}
// 查某商品在所有期間的 note（廣告調整），由新到舊。
// ⚠️ lsLoad 命中記憶體時回傳的是【共用參照】，這裡只讀 r.note，絕不修改那些物件。
function _noteHistory(shop,code,skipMonth,skipHalf){
  const out=[];
  _listPeriods(shop).forEach(p=>{
    if(p.month===skipMonth&&p.half===skipHalf) return;

    // ① 匯入的：報表 built[] 裡的 r.note（純字串）
    let rep=null;
    try{ rep=lsLoad(shop,p.month,p.half); }catch{}
    const built=rep&&rep.built;
    if(Array.isArray(built)){
      const r=built.find(x=>x&&x.code===code);
      const t=r&&r.note;
      if(t&&String(t).trim()) out.push({month:p.month,half:p.half,text:String(t)});
    }

    // ② 手打的：ec_notes|{shop}|{month}|{half} 的 adjustments
    try{
      const nd=(getNotes(shop+'|'+p.month+'|'+p.half)||{})[code];
      const adjs=nd&&(typeof nd==='string'?[{date:'',text:nd}]:(nd.adjustments||[]));
      (adjs||[]).forEach(a=>{
        const t=a&&a.text;
        if(t&&String(t).trim()) out.push({month:p.month,half:p.half,text:String(t)});
      });
    }catch{}
  });
  return out;
}
const _userPickedPeriod={};   // 使用者主動切過月份/半月的賣場 → 之後不再自動跳，尊重其選擇
// 把某賣場的下拉切到「最新有資料的期間」。
// 回傳 true = 真的套用了（或已經在正確期間），false = 這次沒辦法套用（下拉還沒建好）。
// ⚠ 不設「已跳過」旗標：每次 profitDataReady 都重算跳到最新，直到使用者主動切月份為止。
//   這樣七月報表（profits collection 延後載入）到齊時能補跳過去，不會卡在六月。
function _applyLatestPeriod(shop){
  if(_userPickedPeriod[shop]) return true;      // 使用者已介入 → 尊重其選擇，永不自動跳
  const p=_findLatestPeriod(shop);
  if(!p){ return false; }                       // 還沒有任何報表 → 之後再試
  const sel=document.getElementById('month-sel-'+shop);
  if(!sel) return false;                        // 下拉還沒建好 → 之後再試
  if(MONTHS.indexOf(p.month)<0) return false;
  onMonthChange(shop, false, p.month, p.half);  // 直接走手動流程：byUser=false（不設旗標）、月+半月一次設好、只渲染一次
  return true;
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
      if(_userPickedPeriod[s.id]) onMonthChange(s.id);   // 已介入 → 只重載當前選擇（不跳、不設旗標）顯示最新資料
      else _applyLatestPeriod(s.id);                     // 沒介入 → 自動跳最新（內部呼叫 onMonthChange 完整渲染）
      if(lsHasAny(s.id)){const d=document.getElementById('dot-'+s.id);if(d)d.classList.add('on');}
    });
    // 只有賣場資料（非 _summary_v1）變動時才重新渲染總表
    const hasSummaryChange=changedShops==null||(changedShops&&changedShops.length>0);
    const skipSummary=window._summaryJustSaved&&(Date.now()-window._summaryJustSaved<5000);
    if(typeof renderSummary==='function'&&hasSummaryChange&&!skipSummary) renderSummary();
    // 重載後確保當前賣場 tab 正確：只在 tab 真的跑掉時才修復
    // ⚠ 守衛：這段是「蝦皮專屬」的 tab 修復（curShop 是蝦皮的）。只有當前顯示的是蝦皮容器（content-*）時才做；
    //   若使用者已切到 MOMO（momo-content-*）/酷澎（coupang-content-*），強制把蝦皮設 active 會搶走 .active、
    //   把人踢回蝦皮（甲配 pill 還亮、內容卻變蝦皮）。以 active 容器 id 前綴判斷，不列舉平台，加新平台不用改。
    const _activeEl=document.querySelector('.shop-content.active');
    const _inShopee=!_activeEl||_activeEl.id.startsWith('content-');
    if(_inShopee && curShop&&curShop!=='總表'){
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
      <input type="text" class="search-input" id="search-${shop}" placeholder="🔍 搜尋 編號 / 名稱 / ID…" oninput="setSearch('${shop}',this.value)">
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
function onMonthChange(shop,byUser,month,half){
  const sel=document.getElementById('month-sel-'+shop);
  if(!sel)return;
  if(byUser) _userPickedPeriod[shop]=true; // 使用者親手切月份 → 鎖住，之後不再自動跳
  if(month!==undefined) sel.value=month;          // 自動流程：用參數設月份下拉（程式設 value 不觸發 change、不重繪）
  if(half!==undefined)  state[shop].curHalf=half; // 自動流程：用參數設半月（純 state 指派，不重繪）
  delete _editedAt[shop]; // 用戶主動切換月份，清除 edit 保護
  state[shop].curMonth=sel.value;
  try{localStorage.setItem('ec_lastMonth_'+shop,sel.value);}catch{} // 記住這個賣場的最後月份
  updateDaysBadge(shop);
  updateHalfBtnLabels(shop);
  tryLoadSaved(shop);
}
function onHalfChange(shop,half,btn,byUser){
  if(byUser) _userPickedPeriod[shop]=true; // 使用者親手切半月 → 鎖住，之後不再自動跳
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
    const _hLbl=s.curHalf==='first'?'上半月':s.curHalf==='second'?'下半月':'整月';
    document.getElementById('tbl-'+shop).innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">${s.curMonth} ${_hLbl} 尚無資料，請上傳報表產生</div></div>`;
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
      r.growthAnalysis=calcGrowthAnalysis(r.growthRate??null,r.rev||0,r.prevRev??null,r.pureRate||0);
      r.growthAnalysisLabel=r.growthAnalysis?.label||'';
    });
  }
  state[shop]._built=built;state[shop]._period=period;state[shop]._days=days;
  state[shop].filters={};state[shop].sorts={};state[shop].tagFilters=[];   // 標籤篩選跟 filters/sorts 同批重置：切月份/切賽場不殘留（搜尋另行保留，見下一行）
  // search 刻意不重置：切月份保留關鍵字（唯一清掉它的是頁面初次載入時 state 的整包初始化）
  const _se=document.getElementById('search-'+shop);if(_se)_se.value=state[shop].search||'';
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
// ── 通路費率對照表（費率屬於通路，不是全站共用一個值）──
// 照 ANA_THRESH 的範式：_cloudRead/_cloudWrite + Object.assign 補預設
const SHOP_RATE_DEF={'好麻吉':20.5,'玩樂':20.5,'森之旅':20.5,'維克':17.5};
function getShopRates(){return Object.assign({},SHOP_RATE_DEF,_cloudRead('ec_shop_rate')||{});}
function saveShopRates(t){_cloudWrite('ec_shop_rate',t);}
function getPlatformRate(shop){
  const n=parseFloat(getShopRates()[shop]);
  return (Number.isFinite(n)&&n>=0 ? n : 20.5)/100;
}
function onPlatformRateChange(){
  const el=document.getElementById('platformRate');
  if(!el) return;
  const shop=(typeof curShop!=='undefined'&&curShop!=='總表')?curShop:SHOPS[0].id;
  const n=parseFloat(el.value);
  if(!Number.isFinite(n)||n<0||n>100){
    el.value=getShopRates()[shop];
    if(typeof showToast==='function') showToast('費率要介於 0 到 100 之間','error');
    return;
  }
  const t=getShopRates(); t[shop]=n; saveShopRates(t);
  if(typeof renderSummary==='function') try{renderSummary();}catch(e){console.error(e);}
  if(typeof showToast==='function') showToast(shop+' 手續費已改為 '+n+'%（記得按同步雲端）','success');
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
  const s=state[shop];const PLATFORM=getPlatformRate(shop);
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
    const pureRate=p.rev>0?pureProfit/p.rev:null;
    const adsPct=p.rev>0?adsFee/p.rev:0;
    const denom=pureRate+adsPct-0.20;
    const targetROI=denom>0?1/denom:null;
    const roiDiff=(targetROI!==null&&directROI>0)?directROI-targetROI:null;
    const dayBudget=days>0?adsFee/days:0;
    const analysis=calcAnalysis(adsFee,pureRate,targetROI,roiDiff,clicks,pureProfit,roi);
    const testTags=calcTestTags(adsFee,pureRate,targetROI,roiDiff,clicks,pureProfit,roi);
    // 上期營收 & 成長比（所有賣場都算：整月賣場比對上個月整月，好麻吉上/下半月比對同月/上月對應半月）
    const prevRev = prevRevMap[p.code] ?? null;
    const growthRate = (prevRev!==null && prevRev>0) ? (p.rev - prevRev) / prevRev : null;
    const growthAnalysis = calcGrowthAnalysis(growthRate, p.rev, prevRev, pureRate);
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
  if(ok('低淨利')&&D===0 && (N===null||N===undefined||!isFinite(N))) return{label:'低淨利',cls:'tag-low'};
  if(ok('賠錢中')&&D>0 && P<0) return{label:'賠錢中',cls:'tag-lose'};
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
  const _rEl=document.getElementById('platformRate');
  if(_rEl) _rEl.value=getShopRates()[shop];
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
  const H=r=>!(r.rev>0)?NaN:r.pureRate*100;
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
  const aPureSub=[['零營收（無淨利率）',aC(r=>!(r.rev>0))],['< 0%',aC(r=>H(r)<0)],['0% - 10%',aC(r=>H(r)>=0&&H(r)<10)],['10% - 15%',aC(r=>H(r)>=10&&H(r)<15)],['15% - 20%',aC(r=>H(r)>=15&&H(r)<20)],['20% - 30%',aC(r=>H(r)>=20&&H(r)<30)],['>30%',aC(r=>H(r)>=30)]];
  // budget sub-rows for ads
  const aBudSub=[['< $100',aC(r=>r.dayBudget<100)],['$100 - 未滿 $200',aC(r=>r.dayBudget>=100&&r.dayBudget<200)],['$200 - 未滿 $300',aC(r=>r.dayBudget>=200&&r.dayBudget<300)],['$300 - 未滿 $400',aC(r=>r.dayBudget>=300&&r.dayBudget<400)],['≥ $400',aC(r=>r.dayBudget>=400)]];

  const n20p=aC(r=>H(r)>=20), n20m=aC(r=>H(r)<20);
  const nB200p=aC(r=>r.dayBudget>=200), nB200m=aC(r=>r.dayBudget<200);
  const nZero=aC(r=>!(r.rev>0)); // ZERO-REV：零營收（rev 非正、有廣告）無淨利率。拿掉零營收兩列時連本行一起刪

  const adsRows=`
    <tr>${tdL('淨利率',3,BLU_HI)}${td('零營收（無淨利率）',BLU_HI,'#fff',true)}${td(nZero,BLU_HI,'#fff',true)}${td(pct(nZero,adsTotal),BLU_HI,'#fff',true)}</tr>
    <tr>${td('>20%',BLU_HI,'#fff',true)}${td(n20p,BLU_HI,'#fff',true)}${td(pct(n20p,adsTotal),BLU_HI,'#fff',true)}</tr>
    <tr>${td('<20%',BLU_HI,'#fff',true)}${td(n20m,BLU_HI,'#fff',true)}${td(pct(n20m,adsTotal),BLU_HI,'#fff',true)}</tr>
    ${aPureSub.map(([l,n],i)=>`<tr>${i===0?tdL('淨利率階層',aPureSub.length,BLU_LB,'#1a3260'):''
      }${td(l,BLU_LT,'#1a3260')}${td(n,BLU_LT,'#1a3260')}${td(pct(n,adsTotal),BLU_LT,'#1a3260')}</tr>`).join('')}
    <tr>${tdL('日預算',2,ORG_HI)}${td('≥$200',ORG_HI,'#fff',true)}${td(nB200p,ORG_HI,'#fff',true)}${td(pct(nB200p,adsTotal),ORG_HI,'#fff',true)}</tr>
    <tr>${td('<$200',ORG_HI,'#fff',true)}${td(nB200m,ORG_HI,'#fff',true)}${td(pct(nB200m,adsTotal),ORG_HI,'#fff',true)}</tr>
    ${aBudSub.map(([l,n],i)=>`<tr>${i===0?tdL('日預算階層',aBudSub.length,ORG_LB,'#5c2000'):''
      }${td(l,ORG_LT,'#5c2000')}${td(n,ORG_LT,'#5c2000')}${td(pct(n,adsTotal),ORG_LT,'#5c2000')}</tr>`).join('')}`;

  // no-ads pureRate sub-rows
  const nPureSub=[['零營收（無淨利率）',nC(r=>!(r.rev>0))],['< 0%',nC(r=>H(r)<0)],['0% - 10%',nC(r=>H(r)>=0&&H(r)<10)],['10% - 20%',nC(r=>H(r)>=10&&H(r)<20)],['20% - 30%',nC(r=>H(r)>=20&&H(r)<30)],['30% - 40%',nC(r=>H(r)>=30&&H(r)<40)],['>40%',nC(r=>H(r)>=40)]];
  const noAdsRows=nPureSub.map(([l,n],i)=>`<tr>${i===0?tdL('淨利率',nPureSub.length,GRN_HI):''
    }${td(l,GRN_LT,'#1a3260')}${td(n,GRN_LT,'#1a3260')}${td(pct(n,noAdsTotal),GRN_LT,'#1a3260')}</tr>`).join('');

  return `
  <div class="dist-note">本表統計全部 ${built.length} 筆商品,不隨表格篩選變動</div>
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

  // 顯示用備註：規則名旁標出「報表顯示為 ROI x」。來源用同一張 window.ANA_LABEL_DISPLAY，
  // 沒對應的（加50 等）自動不顯示。純顯示，不動 key / 規則值 / 存檔。
  const dispNote=(lbl)=>{const d=(window.ANA_LABEL_DISPLAY||{})[lbl];return d?`<span style="color:#9ca3af;font-size:11px;margin-left:6px">(報表顯示為 ${d})</span>`:'';};
  document.getElementById('ana-modal-body').innerHTML=`
    <div class="ana-sec-hdr">加減碼前提</div>
    <div class="ana-rule-row">
      <span class="ana-rule-tag tag-add300" style="min-width:72px">前提</span>
      <span class="ana-rule-desc">O欄（過去7天點擊）≥ ${inp('clickMin',t.clickMin)}</span>
    </div>
    <div class="ana-sec-hdr">加預算</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add300">加300</span>${dispNote('加300')}<span class="ana-rule-desc">直接ROI差距（實際-目標）≥ ${inp('add300',t.add300)} (含)以上</span>${trash('加300','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add200">加200</span>${dispNote('加200')}<span class="ana-rule-desc">直接ROI差距（實際-目標）≥ ${inp('add200',t.add200)} (含)以上</span>${trash('加200','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add100">加100</span>${dispNote('加100')}<span class="ana-rule-desc">直接ROI差距（實際-目標）≥ ${inp('add100',t.add100)} (含)以上</span>${trash('加100','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-add50">加50</span><span class="ana-rule-desc">直接ROI差距（實際-目標）≥ ${inp('add50',t.add50)} 且 < ${inp('add50max',t.add100)}</span>${trash('加50','disableAnaTag')}</div>
    <div class="ana-sec-hdr">減預算</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-sub300">減300</span>${dispNote('減300')}<span class="ana-rule-desc">直接ROI差距（實際-目標）≤ ${inp('sub300',t.sub300)}</span>${trash('減300','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-sub200">減200</span>${dispNote('減200')}<span class="ana-rule-desc">直接ROI差距（實際-目標）≤ ${inp('sub200',t.sub200)}</span>${trash('減200','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-sub100">減100</span>${dispNote('減100')}<span class="ana-rule-desc">直接ROI差距（實際-目標）≤ ${inp('sub100',t.sub100)}</span>${trash('減100','disableAnaTag')}</div>
    <div class="ana-sec-hdr">分析標籤</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-high">高利潤商品</span><span class="ana-rule-desc">廣告費=0 且 純利率 > ${inp('highMinH',t.highMinH,'0.1')} %</span>${trash('高利潤商品','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-lose">賠錢中</span><span class="ana-rule-desc">廣告費 > 0 且 淨利 &lt; 0</span>${trash('賠錢中','disableAnaTag')}</div>
    <div class="ana-rule-row"><span class="ana-rule-tag tag-low">低淨利</span><span class="ana-rule-desc">廣告費 > 0 且 目標ROI &lt; 0<br><span style="color:#9ca3af;font-size:11px">或 廣告費 > 0 且 直接ROI差距顯示「—」<br>或 廣告費 = 0 且 直接ROI差距顯示「—」</span></span>${trash('低淨利','disableAnaTag')}</div>
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
      r.growthAnalysis=calcGrowthAnalysis(r.growthRate??null,r.rev||0,r.prevRev??null,r.pureRate||0);
      r.growthAnalysisLabel=r.growthAnalysis?.label||'';
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
    const items=lbls.filter(l=>counts[l]).map(l=>`<div class="tfdrop-item${sel.includes(l)?' sel':''}" onclick="event.stopPropagation();setTagFilter('${shop}','${l}');closeTfDrop()">${window.mapAnaLabel(l)} <span class="tfpill-cnt">${counts[l]}</span></div>`).join('');
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
function applyFilters(shop,opts){
  const s=state[shop];if(!s)return;
  if(!s._built||!s._built.length)return;
  const q=(s.search||'').trim().toLowerCase();
  let list=[...s._built];
  if(q)list=list.filter(r=>r.name.toLowerCase().includes(q)||r.code.toLowerCase().includes(q)||(r.shopeeIds||[]).some(id=>String(id).toLowerCase().includes(q)));
  if(s.tagFilters?.length)list=list.filter(r=>s.tagFilters.some(l=>r.analysis?.label===l||r.growthAnalysis?.label===l||(r.testTags||[]).some(tt=>tt.label===l)));
  if(s.suggFilterActive)list=list.filter(r=>r.testTags?.length);
  const PCT_COLS=new Set(['pureRate','adsPct','growthRate']);
  Object.entries(s.filters||{}).forEach(([col,f])=>{
    if(!f)return;
    if(f.type!=='range'&&(f.val===''||f.val===undefined))return;
    list=list.filter(r=>{
      if(col==='pureRate'&&!(r.rev>0))return false;   // 零營收無淨利率(顯示「—」),不納入任何 pureRate 數值篩選
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
  renderTable(shop,list,opts);
  updateTagFilterBar(shop);
  updateSuggChip(shop);
}
function setSort(shop,col,dir){state[shop].sorts={col,dir};applyFilters(shop);}
function setSearch(shop,val){if(state[shop])state[shop].search=val;applyFilters(shop);}
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
  // 商品調整（_growth）：只取當期算顯示，其他期間僅計數（供「歷史 N」）。非 _growth 時 histCount 恆 0、adjList 不動 → 行為完全不變。
  let histCount=0;
  if(shopKey.indexOf('_growth')>=0){
    const bs=state[shopKey.replace('_growth','')];
    const cur=[];
    adjList.forEach(a=>{ if(bs&&_inPeriod(a.date,bs.curMonth,bs.curHalf))cur.push(a); else histCount++; });
    adjList=cur;
  }
  const adjMap=new Map();
  adjList.forEach(a=>{const d=a.date||'';if(!adjMap.has(d))adjMap.set(d,[]);adjMap.get(d).push(a.text||'');});
  const sorted=[...adjMap.keys()].filter(d=>d).sort((a,b)=>b.localeCompare(a));
  const noDateItems=adjMap.get('')||[];
  const hoverLines=sorted.map(d=>`${d}　${adjMap.get(d).join('、')}`);
  if(noDateItems.length)hoverLines.push(...noDateItems);
  if(histCount>0)hoverLines.push(`其他期間 ${histCount} 筆（點開查看）`);
  const hoverText=hoverLines.join('\n');
  const latestDate=sorted[0]||'';
  const latestText=latestDate?adjMap.get(latestDate).join('、'):(noDateItems[0]||'');
  const hasNote=!!latestText;
  const bg=hasNote?'#fef3c7':'';const hBg=hasNote?'#fde68a':'#f3f4f6';
  const ce=code.replace(/'/g,"\\'");
  const ht=hoverText.replace(/"/g,'&quot;').replace(/</g,'&lt;');
  // 商品調整不另加視覺元件（如「歷史 N」小標）：廣告調整欄當期無紀錄時也只顯示「點此新增」，
  // 歷史一律藏在彈窗裡；兩欄行為保持一致。其他期間的筆數僅走上面 hover 提示。
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
  const PLATFORM=getPlatformRate(shop);
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
    // ⚠ 同 profitDataReady 的守衛：使用者若已切到 MOMO/酷澎（active 容器非 content-*），別把蝦皮硬拉回來
    const _activeEl=document.querySelector('.shop-content.active');
    if(_activeEl && !_activeEl.id.startsWith('content-')) return;
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
    adsEl.querySelector('.cell-val').textContent='$'+fmtN(r.adsFee);
    adsEl.className=`td-num td-amber ${edited?'cell-edited':''} `.trim();
    adsEl.style.cursor='pointer';
  }
  // pureProfit
  const pureEl=document.getElementById(`td-${shop}-${code}-pureProfit`);
  if(pureEl){pureEl.textContent='$'+fmtN(r.pureProfit);pureEl.className='td-num '+(r.pureProfit>=0?'td-pos':'td-neg');}
  // pureRate
  const rateEl=document.getElementById(`td-${shop}-${code}-pureRate`);
  if(rateEl)rateEl.innerHTML=pill(!(r.rev>0)?null:r.pureRate*100);
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
  if(anaEl){const a=r.analysis||{};anaEl.innerHTML=a.label?`<span class="tag ${a.cls}">${window.mapAnaLabel(a.label)}</span>`:'—';}
  // KPI 小計列
  syncHeaderKpis(shop);
}

function recalcRow(shop,code,ov){
  const built=state[shop]._built;const idx=built.findIndex(r=>r.code===code);if(idx<0)return;
  const r=built[idx];const PLATFORM=getPlatformRate(shop);
  // 只有廣告費可以編輯，重算相關衍生欄位
  const adsFee=ov.adsFee!==undefined?ov.adsFee:r.adsFee;
  const rev=r.rev;const gross=r.gross;
  const platFee=rev*PLATFORM;
  const pureProfit=gross-adsFee-platFee;
  const pureRate=rev>0?pureProfit/rev:null;
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
  const growthAnalysis=calcGrowthAnalysis(growthRate,rev,r.prevRev,pureRate);
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
  {key:'dayBudget',label:'日預算'},{key:'analysisLabel',label:'廣告分析'},{key:'note',label:'廣告調整'},
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
  const avail=PROFIT_COLS;
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
        <div id="pnm-hist-wrap" style="display:none">
          <div class="pnm-section" style="margin-top:14px">其他期間的調整</div>
          <div id="pnm-hist" class="pnm-list"></div>
        </div>
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
  renderPnmHistory();
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
  // 商品調整（_growth）：只列當期。⚠ forEach 照跑保留原始索引 i（刪除鈕吃原始陣列索引），不符當期就 skip，不可先 filter 再重編。
  const isGrowth=shopKey.indexOf('_growth')>=0;
  const gS=isGrowth?state[shopKey.replace('_growth','')]:null;
  const map=new Map();
  adj.forEach((a,i)=>{
    if(isGrowth&&!(gS&&_inPeriod(a.date,gS.curMonth,gS.curHalf)))return;
    const d=a.date||'—';if(!map.has(d))map.set(d,[]);map.get(d).push({text:a.text,i});
  });
  if(!map.size){el.innerHTML=`<div style="padding:14px;text-align:center;color:#9ca3af;font-size:12px">${isGrowth?'本期尚無調整紀錄':'尚無調整紀錄'}</div>`;return;}
  const sorted=[...map.keys()].sort((a,b)=>b.localeCompare(a));
  el.innerHTML=sorted.map(d=>map.get(d).map(({text,i})=>`<div class="pnm-entry">
    <div class="pnm-entry-date">${d}</div>
    <div class="pnm-entry-text">${text.replace(/</g,'&lt;')}</div>
    <button class="pnm-entry-del" onclick="deleteProfitNote(${i})">×</button>
  </div>`).join('')).join('');
}
function renderPnmHistory(){
  const wrap=document.getElementById('pnm-hist-wrap');
  const box=document.getElementById('pnm-hist');
  if(!wrap||!box||!_pnm) return;
  const {shopKey,code}=_pnm;
  // 商品調整（{shop}_growth）：資料是同一個 adjustments 陣列，這裡列出「不屬於當期」的紀錄。
  // ⚠ 不能走下方 _noteHistory：它會 shopKey.split('|')[0]，_growth 沒有 '|' → 拿到不存在的通路 → 靜默空白。
  if(shopKey.indexOf('_growth')>=0){
    const gs=state[shopKey.replace('_growth','')];
    const gnd=getNotes(shopKey)[code];
    let gadj=[];
    if(gnd){if(typeof gnd==='string')gadj=[{date:'',text:gnd}];else gadj=gnd.adjustments||[];}
    const others=[];
    gadj.forEach((a,i)=>{ if(!(gs&&_inPeriod(a.date,gs.curMonth,gs.curHalf))) others.push({date:a.date,text:a.text,i}); });   // 保留原始索引 i
    if(!others.length){ wrap.style.display='none'; box.innerHTML=''; return; }
    others.sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')));   // 日期新到舊
    wrap.style.display='';
    box.innerHTML=others.map(o=>`<div class="pnm-entry">
      <div class="pnm-entry-date">${/^\d{4}\/\d{2}\/\d{2}$/.test(o.date||'')?o.date:'未記日期'}</div>
      <div class="pnm-entry-text">${String(o.text||'').replace(/</g,'&lt;')}</div>
      <button class="pnm-entry-del" onclick="deleteProfitNote(${o.i})">×</button>
    </div>`).join('');
    return;
  }
  const shop=shopKey.split('|')[0];
  const parts=shopKey.split('|');
  const curM=parts.length>=3?parts[1]:(state[shop]?state[shop].curMonth:'');
  const curH=parts.length>=3?parts[2]:(state[shop]?state[shop].curHalf:'');
  let hist=[];
  try{ hist=_noteHistory(shop,code,curM,curH); }catch(e){ console.error('[pnm] 歷史查詢失敗',e); }
  if(!hist.length){ wrap.style.display='none'; box.innerHTML=''; return; }
  wrap.style.display='';
  box.innerHTML=hist.map(h=>`<div class="pnm-entry">
    <div class="pnm-entry-date">${h.month} ${_halfLabel(h.half)}</div>
    <div class="pnm-entry-text">${String(h.text).replace(/</g,'&lt;')}</div>
  </div>`).join('');
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
  const shop=shopKey.split('|')[0].replace('_growth','');
  // 商品調整：新紀錄的日期（今天）不屬於目前檢視期間 → 提示去「其他期間」找，但絕不竄改日期
  if(shopKey.indexOf('_growth')>=0){
    const ss=state[shop];
    if(ss&&!_inPeriod(today,ss.curMonth,ss.curHalf)){
      const noteHalf=(+today.slice(8,10))<=15?'first':'second';
      const msg=`已記錄到 ${today.slice(0,7)} ${_halfLabel(noteHalf)}（目前檢視 ${ss.curMonth} ${_halfLabel(ss.curHalf)}），再點開這格可在下方「其他期間」看到`;
      if(typeof showToast==='function')showToast(msg,'info',5000);
    }
  }
  closeProfitNoteModal();
  applyFilters(shop,{keepScroll:true});
}
function deleteProfitNote(origIdx){
  if(!_pnm)return;
  const {shopKey,code}=_pnm;
  const notes=getNotes(shopKey);if(!notes[code])return;
  if(typeof notes[code]==='string')notes[code]={adjustments:[{date:'',text:notes[code]}]};
  notes[code].adjustments.splice(origIdx,1);
  if(!notes[code].adjustments.length)delete notes[code];
  saveNotes(shopKey,notes);renderPnmList();renderPnmHistory();applyFilters(shopKey.split('|')[0].replace('_growth',''),{keepScroll:true});
}
function closeProfitNoteModal(){document.getElementById('profit-note-modal')?.classList.remove('open');_pnm=null;}
function startNote(shop,code){openNotePopup(shop,code);}
function commitNote(){}

// ── Render Table ──
function renderTable(shop,list,opts){
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
    adsFee:'廣告費', rev:'營收 / 上期', gross:'毛利', pureProfit:'淨利',
    pureRate:'淨利率%', adsPct:'廣告佔比', stock:'可用庫存', targetROI:'目標ROI', directROI:'直接ROI',
    roi:'投入產出', roiDiff:'實際-目標', clicks:'點擊數', dayBudget:'日預算',
    analysisLabel:'廣告分析', note:'廣告調整',
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
    const anaHtml=anaObj.label?`<span class="tag ${anaObj.cls}">${window.mapAnaLabel(anaObj.label)}</span>`:'—';
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
        adsFee:`<td class="td-num td-amber ${isEdited('adsFee')?'cell-edited':''}" id="${adsId}" onclick="startEdit('${shop}','${r.code}','adsFee','${adsId}')" style="cursor:pointer" title="點擊編輯"><span class="cell-val">$${fmtN(r.adsFee)}</span></td>`,
        pureProfit:`<td id="td-${shop}-${r.code}-pureProfit" class="td-num ${pc}">$${fmtN(r.pureProfit)}</td>`,
        note:noteCellHtml,
        growthNote:buildNoteCell(shop+'_growth',r.code,gnoteId,getNotes(shop+'_growth')[r.code]),
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
        adsFee:editTd('adsFee','$'+fmtN(r.adsFee),'td-amber'),
        rev:`<td class="td-num">$${fmtN(r.rev)}<div class="sub-rev">${r.prevRev!==null?'上期 $'+fmtN(r.prevRev):'—'}</div></td>`,
        gross:`<td class="td-num">$${fmtN(r.gross)}</td>`,
        pureProfit:`<td id="td-${shop}-${r.code}-pureProfit" class="td-num ${pc}">$${fmtN(r.pureProfit)}</td>`,
        pureRate:`<td id="td-${shop}-${r.code}-pureRate">${pill(!(r.rev>0)?null:r.pureRate*100)}</td>`,
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
        growthRate:`<td class="td-num" style="text-align:center">${r.growthRate===null?'<span style="color:#9ca3af">—</span>':`<span style="color:${r.growthRate>=0?'#10b981':'#ef4444'};font-weight:700">${r.growthRate>=0?'↑':'↓'} ${Math.abs(r.growthRate*100).toFixed(0)}%</span>`}</td>`,
        growthAnalysis:`<td class="tl">${r.growthAnalysis&&r.growthAnalysis.label?`<span class="tag ${r.growthAnalysis.cls}">${r.growthAnalysis.label}</span>`:'—'}</td>`,
        growthNote:buildNoteCell(shop+'_growth',r.code,gnoteId,getNotes(shop+'_growth')[r.code]),
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
    rev:`<td class="td-num">$${fmtN(fRev)}<div class="sub-rev">$${fmtN(fPrevRev)}</div></td>`,
    gross:`<td class="td-num">$${fmtN(fGross)}</td>`,
    pureProfit:`<td class="td-num ${fPure>=0?'td-pos':'td-neg'}">$${fmtN(fPure)}</td>`,
    pureRate:`<td>${fRev>0?pill(fPure/fRev*100):'—'}</td>`,
    growthRate:`<td class="td-num" style="text-align:center">${fGrowth===null?'<span style="color:#9ca3af">—</span>':`<span style="color:${fGrowth>=0?'#10b981':'#ef4444'};font-weight:700">${fGrowth>=0?'↑':'↓'} ${Math.abs(fGrowth*100).toFixed(0)}%</span>`}</td>`,
  };
  html+=`<tr class="tr-total">
    <td class="tl" colspan="2">小計（${list.length}筆）</td>
    ${orderedCols.map(c=>totalCell[c.key]||'<td></td>').join('')}
    <td></td>
  </tr></tbody></table></div>`;
  const _tblHost=document.getElementById('tbl-'+shop);
  // keepScroll：覆蓋 innerHTML 會重建 .tscroll，捲動位置歸零。先存舊值、重繪後還原（含 scrollLeft，商品調整欄在最右）。
  let _prevScTop=null,_prevScLeft=null;
  if(opts&&opts.keepScroll){
    const _oldSc=_tblHost&&_tblHost.querySelector('.tscroll');
    if(_oldSc){_prevScTop=_oldSc.scrollTop;_prevScLeft=_oldSc.scrollLeft;}
  }
  _tblHost.innerHTML=html;
  if(opts&&opts.keepScroll&&_prevScTop!==null){
    const _newSc=_tblHost&&_tblHost.querySelector('.tscroll');
    if(_newSc){_newSc.scrollTop=_prevScTop;_newSc.scrollLeft=_prevScLeft;}
  }
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
    const rate=getPlatformRate(shop);
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
  const calcPure=(d,shopId)=>(d.gross||0)-(d.ads||0)-(d.rev||0)*getPlatformRate(shopId);

  const shopGroupHdr=SHOPS.map(s=>`<th colspan="6" style="text-align:center;background:${s.color};color:white;font-weight:700;font-size:13px;padding:7px 4px;border-left:2px solid rgba(255,255,255,.3)">${s.id}</th>`).join('');
  const shopSubHdr=SHOPS.map(()=>`<th style="min-width:75px;font-size:11px;font-weight:600;background:#f8fafc">營收</th><th style="min-width:62px;font-size:11px;font-weight:600;background:#f8fafc">廣告</th><th style="min-width:75px;font-size:11px;font-weight:600;background:#f8fafc">毛利</th><th style="min-width:75px;font-size:11px;font-weight:600;background:#f8fafc">純利</th><th style="min-width:58px;font-size:11px;font-weight:600;background:#f8fafc">純利率%</th><th style="min-width:58px;font-size:11px;font-weight:600;background:#f8fafc">廣告佔比%</th>`).join('');

  const dataCells=(shopMap,editable,rowId)=>SHOPS.map(s=>{
    const d=shopMap?.[s.id]||{};
    const p=calcPure(d,s.id);
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
      <span style="font-size:11px;color:#9ca3af">純利 = 毛利 − 廣告 − 營收×手續費　｜　點擊數字可編輯</span>
    </div>
  </div>`;
}

// ── 重點檢視：跨四家的簡潔檢視（2026-07-24 新增）──
// 自己一組月份/區間狀態，不碰 state[shop]，
// 因為 onMonthChange/onHalfChange 綁死 state[shop]，非賣場頁面用不了。
let _focusMonth=null, _focusHalf=null;

function _focusInitPeriod(){
  if(_focusMonth) return;
  // 預設跟淨利表同一套邏輯：用「有最多資料」的那家的最新期間
  let best=null;
  SHOPS.forEach(s=>{
    const p=_findLatestPeriod(s.id);
    if(!p) return;
    const r=(p.month||'')+'#'+(_HALF_RANK[p.half]!==undefined?_HALF_RANK[p.half]:0);
    if(!best||r>best.rank) best={month:p.month,half:p.half,rank:r};
  });
  if(best){ _focusMonth=best.month; _focusHalf=best.half; }
  else { _focusMonth=_initCurMonth; _focusHalf=_initCurHalf; }
}

function onFocusPeriodChange(){
  const m=document.getElementById('focus-month-sel');
  const h=document.getElementById('focus-half-sel');
  if(m) _focusMonth=m.value;
  if(h) _focusHalf=h.value;
  renderFocus();
}

// 重點檢視的欄位設定 —— 【刻意】與主表的 ec_hcols_user 完全分離。
// 主表那份是全站共用、不上雲；這份走 _cloudWrite（會進待同步清單，
// 按同步雲端後全公司共用），因為老闆選的欄位應該在他任何一台裝置都一樣。
const FOCUS_COLS_DEF=['rev','pureProfit','pureRate'];
function getFocusCols(){
  const v=_cloudRead('ec_focus_cols');
  if(Array.isArray(v)&&v.length) return v.slice();
  return FOCUS_COLS_DEF.slice();
}
function saveFocusCols(arr){ _cloudWrite('ec_focus_cols',arr); }
function toggleFocusCol(key){
  const cur=getFocusCols();
  const i=cur.indexOf(key);
  if(i>=0){
    if(cur.length<=1){                     // 至少要留一欄，全部關掉表格會變空殼
      if(typeof showToast==='function') showToast('至少要保留一個欄位','error');
      return;
    }
    cur.splice(i,1);
  }else{
    cur.push(key);
  }
  saveFocusCols(cur);
  renderFocus();
  openFocusColPicker(true);                // 重繪選單，維持開啟狀態
}

function openFocusColPicker(keepOpen){
  const old=document.getElementById('focus-col-menu');
  if(old){ old.remove(); if(!keepOpen) return; }
  const btn=document.getElementById('focus-col-btn');
  if(!btn) return;
  const cur=getFocusCols();
  const menu=document.createElement('div');
  menu.id='focus-col-menu';
  menu.style.cssText='position:absolute;z-index:60;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:6px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:320px;overflow-y:auto;min-width:160px';
  menu.innerHTML=PROFIT_COLS.map(c=>{
    const on=cur.indexOf(c.key)>=0;
    return `<div onclick="toggleFocusCol('${c.key}')" style="padding:5px 8px;cursor:pointer;font-size:13px;border-radius:5px;display:flex;align-items:center;gap:7px">
      <span style="display:inline-block;width:13px;height:13px;border:1px solid ${on?'#4f46e5':'#d1d5db'};border-radius:3px;background:${on?'#4f46e5':'#fff'};color:#fff;font-size:10px;line-height:13px;text-align:center">${on?'✓':''}</span>
      <span>${c.label}</span></div>`;
  }).join('');
  const r=btn.getBoundingClientRect();
  menu.style.left=(r.left+window.scrollX)+'px';
  menu.style.top=(r.bottom+window.scrollY+4)+'px';
  document.body.appendChild(menu);
  setTimeout(()=>{
    const close=ev=>{
      if(menu.contains(ev.target)||btn.contains(ev.target))return;
      menu.remove();document.removeEventListener('click',close);
    };
    document.addEventListener('click',close);
  },0);
}
// renderFocus 專用：fmtN 會取絕對值（Math.abs），負數會顯示成正數。
// 主表靠 CSS class 染紅來表達負值，但這裡需要數字本身就看得出正負。
function _fSigned(v){
  const n=Number(v)||0;
  return (n<0?'-$':'$')+fmtN(n);
}
// 依欄位型別決定顯示格式。
// 百分比欄與金額欄的呈現方式不同，不能一律當金額。
const _FOCUS_PCT_COLS=new Set(['pureRate','adsPct','growthRate']);
const _FOCUS_TEXT_COLS=new Set(['analysisLabel','note','growthAnalysis','growthNote']);
// 所有欄位（含 note/growthNote）直接從商品列 r 取：sheet-import 連同報表把調整寫進 built[]，
// r.note 已是純字串（不是 {adjustments} 結構）。growthAnalysis 是物件 {label,cls} → 取 .label；analysisLabel 已是字串。
function _focusCell(r,key){
  const v=r[key];
  if(_FOCUS_TEXT_COLS.has(key)){
    const t=(v==null?'':(typeof v==='object'?(v.label||''):String(v)));
    return `<td style="font-size:12px;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.replace(/"/g,'&quot;')}">${t}</td>`;
  }
  const n=Number(v);
  if(!isFinite(n)) return `<td class="td-num" style="color:#9ca3af">—</td>`;
  if(_FOCUS_PCT_COLS.has(key)){
    return `<td class="td-num ${n<0?'td-neg':''}">${(n*100).toFixed(1)}%</td>`;
  }
  return `<td class="td-num ${n<0?'td-neg':''}">${_fSigned(n)}</td>`;
}
function renderFocus(){
  const el=document.getElementById('content-重點檢視');
  if(!el) return;
  _focusInitPeriod();

  const cols=getFocusCols().map(k=>PROFIT_COLS.find(c=>c.key===k)).filter(Boolean);

  const halfLabel=h=>h==='first'?'上半月':h==='second'?'下半月':'整月';

  // 讀四家資料（lsLoad 是純讀取、零副作用，不碰 state）
  const data=SHOPS.map(s=>{
    const rep=lsLoad(s.id,_focusMonth,_focusHalf);
    const built=(rep&&Array.isArray(rep.built))?rep.built:null;
    let rev=0,ads=0,gross=0,pure=0;
    if(built) built.forEach(r=>{
      rev+=Number(r.rev)||0; ads+=Number(r.adsFee)||0;
      gross+=Number(r.gross)||0; pure+=Number(r.pureProfit)||0;
    });
    return {id:s.id,color:s.color,built,rev,ads,gross,pure};
  });

  // 上半：四張卡片
  const cards=data.map(d=>{
    if(!d.built) return `<div class="panel" style="padding:10px 12px">
      <div style="font-size:13px;font-weight:500;margin-bottom:6px">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${d.color};margin-right:5px"></span>${d.id}</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:12px">${_focusMonth} ${halfLabel(_focusHalf)}<br>尚無資料</div>
    </div>`;
    const pr=d.rev>0?(d.pure/d.rev*100).toFixed(1)+'%':'—';
    return `<div class="panel" style="padding:10px 12px">
      <div style="font-size:13px;font-weight:500;margin-bottom:6px">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${d.color};margin-right:5px"></span>${d.id}</div>
      <div style="font-size:11px;color:#9ca3af">營收</div>
      <div style="font-size:15px;margin-bottom:4px">${_fSigned(d.rev)}</div>
      <div style="font-size:11px;color:#9ca3af">淨利</div>
      <div style="font-size:15px" class="${d.pure<0?'td-neg':''}">${_fSigned(d.pure)} <span style="font-size:11px">${pr}</span></div>
    </div>`;
  }).join('');

  // 下半：四家商品混合，按淨利由低到高
  const rows=[];
  data.forEach(d=>{ if(d.built) d.built.forEach(r=>rows.push({shop:d.id,color:d.color,r:r})); });
  rows.sort((a,b)=>(Number(a.r.pureProfit)||0)-(Number(b.r.pureProfit)||0));

  const trs=rows.map(x=>{
    const r=x.r;
    const rev=Number(r.rev)||0, pure=Number(r.pureProfit)||0;
    const pr=rev>0?(pure/rev*100).toFixed(1)+'%':'—';
    return `<tr>
      <td style="font-size:12px;color:#6b7280;text-align:left">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${x.color};margin-right:4px"></span>${x.shop}</td>
      <td style="font-size:12px;text-align:left">${r.code||''}</td>
      <td style="font-size:12px;text-align:left;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.name||'').replace(/"/g,'&quot;')}">${r.name||''}</td>
      ${cols.map(c=>_focusCell(r,c.key)).join('')}
    </tr>`;
  }).join('');

  const monthOpts=MONTHS.map(mo=>`<option value="${mo}"${mo===_focusMonth?' selected':''}>${mo}</option>`).join('');
  const halfOpts=['first','second','full'].map(h=>`<option value="${h}"${h===_focusHalf?' selected':''}>${halfLabel(h)}</option>`).join('');

  el.innerHTML=`<div style="padding:14px 16px 16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <span style="font-size:12px;color:#6b7280">月份</span>
      <select id="focus-month-sel" class="setting-input" onchange="onFocusPeriodChange()" style="width:100px">${monthOpts}</select>
      <span style="font-size:12px;color:#6b7280">區間</span>
      <select id="focus-half-sel" class="setting-input" onchange="onFocusPeriodChange()" style="width:90px">${halfOpts}</select>
      <button id="focus-col-btn" class="col-pick-btn" onclick="openFocusColPicker()" style="margin-left:auto">☰ 選欄位</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:18px">${cards}</div>
    <div class="panel" style="padding:12px 14px">
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px">
        <span style="font-size:14px;font-weight:500">全部商品</span>
        <span style="font-size:12px;color:#6b7280">${rows.length} 筆</span>
        <span style="font-size:12px;color:#9ca3af;margin-left:auto">依淨利由低到高</span>
      </div>
      <div class="tscroll"><table style="table-layout:fixed;width:100%"><colgroup>
        <col style="width:14%"><col style="width:12%"><col style="width:30%">
        ${cols.map(()=>`<col style="width:${(44/Math.max(cols.length,1)).toFixed(2)}%">`).join('')}
      </colgroup><thead><tr>
        <th style="text-align:left">通路</th><th style="text-align:left">編號</th><th style="text-align:left">商品名</th>
        ${cols.map(c=>`<th${_FOCUS_TEXT_COLS.has(c.key)?' style="text-align:left"':''}>${c.label}</th>`).join('')}
      </tr></thead><tbody>${trs||`<tr><td colspan="${3+cols.length}" style="text-align:center;color:#9ca3af;padding:20px">此期間四家都沒有資料</td></tr>`}</tbody></table></div>
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
          <div style="background:#f8f9fc;border-radius:8px;padding:12px 14px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px">
              <div style="font-size:11.5px;color:#9ca3af;font-weight:600">${m.l}</div>
              <div style="padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700;background:#eef0fd;color:#5b5fcf;white-space:nowrap">配分 ${d.w[mi]} 分</div>
            </div>
            <div style="font-size:22px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;line-height:1.15">${d[m.k][0]}%</div>
            <div style="font-size:11.5px;color:#9ca3af;margin-top:3px">低標 ${d[m.k][1]!=null?d[m.k][1]+'%':'—'}</div>
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
  const editableNum=(label,field,val,fmtFn)=>`<span onclick="editScoreMonthlyCell('${monthKey}','${shop}','${field}',this)" style="cursor:pointer;border-bottom:1px dashed #d1d5db;display:inline-block">${label} <b style="color:#6b7280">${val!=null?fmtFn(val):'—'}</b></span>`;
  const simpleMetricCard=(label,val,target,score,weight,field)=>{
    const col=scoreRatioColor(score,weight);
    const valDisp=val==null?'—':val+'%';
    return `<div style="background:#f8f9fc;border-radius:8px;padding:12px 14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px">
        <div style="font-size:11.5px;color:#9ca3af;font-weight:600">${label}</div>
        <div style="padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700;background:${col.bg};color:${col.fg};white-space:nowrap">${score} 分</div>
      </div>
      <div onclick="editScoreMonthlyCell('${monthKey}','${shop}','${field}',this)" style="font-size:22px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;line-height:1.15;cursor:pointer;border-bottom:1px dashed #d1d5db;display:inline-block">${valDisp}</div>
      <div style="font-size:11.5px;color:#9ca3af;margin-top:3px">目標 ${target}%</div>
    </div>`;
  };
  // 純利成長不是直接填百分比，是靠「前期純利」「本期純利」兩個數字算出來的，
  // 所以這張卡把兩個輸入欄直接放進來，一眼看得出百分比是怎麼算出來的。
  const growCard=(()=>{
    const col=scoreRatioColor(r.growS,r.t.w[1]);
    const valDisp=r.growA==null?'—':r.growA+'%';
    return `<div style="background:#f8f9fc;border-radius:8px;padding:12px 14px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px">
        <div style="font-size:11.5px;color:#9ca3af;font-weight:600">純利成長</div>
        <div style="padding:2px 10px;border-radius:6px;font-size:12px;font-weight:700;background:${col.bg};color:${col.fg};white-space:nowrap">${r.growS} 分</div>
      </div>
      <div style="font-size:22px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;line-height:1.15">${valDisp}</div>
      <div style="font-size:11.5px;color:#9ca3af;margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span>目標 ${r.t.grow[0]}%</span>
        <span style="color:#d1d5db">｜</span>
        ${editableNum('前期','prevProfit',r.m.prevProfit,fmtN)}
        <span style="color:#d1d5db">→</span>
        ${editableNum('本期','curProfit',r.m.curProfit,fmtN)}
      </div>
    </div>`;
  })();
  const cardHtml=[
    simpleMetricCard('純利率',r.m.revA,r.t.rev[0],r.revS,r.t.w[0],'revA'),
    growCard,
    simpleMetricCard('廣告合格率',r.m.adsA,r.t.ads[0],r.adsS,r.t.w[2],'adsA'),
    simpleMetricCard('低效廣告率',r.m.badA,r.t.bad[0],r.badS,r.t.w[3],'badA'),
  ].join('');
  return `<div style="padding:14px 16px;${isLast?'':'border-bottom:1px solid #f3f4f6'}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="display:flex;align-items:baseline;gap:8px">
        <div style="font-size:13.5px;font-weight:700;color:#374151">${shop}</div>
        <div style="font-size:11px;color:#9ca3af">${s.pos}</div>
      </div>
      <div style="padding:3px 10px;border-radius:7px;background:${totCol.bg};color:${totCol.fg};border:1px solid ${totCol.border};font-size:13px;font-weight:700;font-variant-numeric:tabular-nums">${r.total} 分</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${cardHtml}</div>
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
  const isCross=(shop==='總表'||shop==='重點檢視');   // 跨賣場頁面，不屬於任何單一賣場
  const wrap=document.getElementById('profit-period-wrap');
  const wrapRow=document.getElementById('profit-period-wrap-row');
  if(wrap){
    SHOPS.forEach(s=>{const el=document.getElementById('period-row-'+s.id);if(el)el.style.display=s.id===shop?'flex':'none';});
    const showPeriod=!isCross;
    if(wrapRow)wrapRow.style.display=showPeriod?'flex':'none';
  }
  // show/hide KPI & upload/export when on 總表 / 重點檢視（跨賣場頁面）
  const kpiBlock=document.getElementById('header-kpi-row');
  // 好麻吉的聯盟行銷分頁有自己獨立的總覽列，切回好麻吉時要記得沿用上次停在哪個分頁
  const onAffTab=shop==='好麻吉'&&_shopViewMode[shop]==='affiliate';
  if(kpiBlock)kpiBlock.style.display=(isCross||onAffTab)?'none':'flex';
  const affHeaderEl=document.getElementById('aff-header-'+shop);
  if(affHeaderEl)affHeaderEl.style.display=onAffTab?'':'none';
  // sync global export button
  const gb=document.getElementById('global-exp-btn');
  if(gb){
    if(isCross){gb.disabled=true;}
    else{gb.disabled=!(state[shop]?._built?.length);}
  }
  // sync global sync button
  const sb=document.getElementById('global-sync-btn');
  if(sb){
    const hasData=!isCross&&!!(state[shop]?._built?.length);
    sb.disabled=!hasData;sb.style.opacity=hasData?'1':'0.4';sb.style.cursor=hasData?'pointer':'default';
    if(hasData){sb.style.background='#f59e0b';sb.style.color='#fff';sb.style.borderColor='#f59e0b';}
    else{sb.style.background='';sb.style.color='';sb.style.borderColor='';}
  }
  if(shop==='總表')renderSummary();
  else if(shop==='重點檢視')renderFocus();
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

/* ==================== MOMO 甲配/乙配 淨利表（新設計，P1）====================
   資料層走既有 rail：商品主檔存 'ec_momo_products|<shop>'（localStorage + Store._mem），
   按全域「☁ 同步雲端」時經 syncToCloud 的 field 分支 setField 上 app/profit。
   甲配/乙配共用同一組函式，靠 shop 參數區分（乙配運費+包材預設 0、多一個倉租費子分頁）。 */

// ── §1 商品主檔（持續性資料，獨立於月份）──
function momoProductsKey(shop){ return 'ec_momo_products|'+shop; }
function momoLoadProducts(shop){
  // 讀取順序照 ec_edits/ec_notes 慣例：_profitMem（雲端權威，跨裝置）→ _mem → localStorage。
  //   ec_momo_products 是 app/profit 的 field，雲端快照回來灌進 _profitMem；只讀 _mem 會漏（換台電腦讀不到）。
  const k=momoProductsKey(shop);
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]) return Store._mem[k]; }catch{}
  try{ const local=localStorage.getItem(k); if(local) return JSON.parse(local); }catch{}
  return [];
}
function momoSaveProducts(shop,products){
  const k=momoProductsKey(shop);
  try{ localStorage.setItem(k,JSON.stringify(products)); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Store._profitMem[k]=products; }catch{}  // 權威鏡像（跨裝置：momo_products 訂閱也灌這裡）
  try{ if(typeof Store!=='undefined'&&Store._mem) Store._mem[k]=products; }catch{}              // 保留三鏡像一致
  try{ window._momoJustSaved=Date.now(); }catch{}   // bounce-back 守衛：剛存過 5 秒內、momo_products 訂閱 echo 回來不覆蓋
  _markPending(k);   // 走既有 pending → 手動同步時 __cloudMomo.setShop 上雲（momo_products collection，每賣場一 doc）
}
// 「待同步的本機值」：_mem → localStorage（保留使用者編輯）。⚠ 不讀 _profitMem——它會被 momo_products 雲端 snapshot 洗回舊值，
//   若同步/預覽讀它就會拿到 stale。同步推送(syncToCloud)與預覽比對(_momoCollectPending)都走這個 → 保證「看到的==推的」。
function momoPendingProducts(pk){
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[pk]!==undefined) return Store._mem[pk]; }catch{}
  try{ const raw=localStorage.getItem(pk); if(raw) return JSON.parse(raw); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[pk]) return Store._profitMem[pk]; }catch{}   // 最後退回（無 pending 編輯時＝雲端值）
  return null;
}
// bounce-back 守衛（給 firebase.js 的 momo_products 訂閱呼叫；邏輯放這裡才讀得到私有 _pendingSyncKeys）：
//   本機有未同步變更（pending）或剛存過 → 雲端 echo 不覆蓋 _profitMem，保住本機版本。
window.__momoShouldSkipCloudOverwrite=function(k){
  try{ if(_pendingSyncKeys.has(k)) return true; }catch{}
  if(window._momoJustSaved && (Date.now()-window._momoJustSaved < 5000)) return true;
  return false;
};
// momo_products 訂閱推來更新時的精準重繪（不走 App.render/renderFromCloud、不整頁重繪，避免踢人）。
//   ⚠ 收緊守衛：① 變的是「當前 curMomoShop」② active 容器是 momo-content-*（使用者真的在 MOMO 頁，比照 v199 inShopee）
//   ③ 停在總表子分頁（其他子分頁沒有商品表）。只重繪那一張表 body。
window.addEventListener('momoDataReady',(e)=>{
  const changed=(e.detail&&e.detail.changedShops)||[];
  const shop=curMomoShop;
  if(!shop || changed.indexOf(shop)<0) return;
  const activeEl=document.querySelector('.shop-content.active');
  if(!activeEl || !activeEl.id.startsWith('momo-content-')) return;
  if((_momoSub[shop]||'profit')!=='profit') return;
  if(document.getElementById('momo-tbl-'+shop)) momoRenderProfitBody(shop);
});
// 月對帳雲端更新 → 清月費率快取 + 若正在看甲配/乙配總表則重繪（吃到新對帳單的權威營收/費用）
window.addEventListener('momoReconcileReady',()=>{
  if(typeof momoClearFeeRateCache==='function') momoClearFeeRateCache();
  const shop=curMomoShop;
  if((shop==='甲配'||shop==='乙配') && (_momoSub[shop]||'profit')==='profit' && document.getElementById('momo-tbl-'+shop)) momoRenderProfitBody(shop);
});
// ── 一次性遷移工具（手動在正式站 console 呼叫 window.momoMigrateProductsToCollection()，不 auto-run）──
//   把 app/profit 舊欄位 ec_momo_products|<shop> 搬進 momo_products collection。先寫新+驗證，「絕不」自動刪舊欄位——
//   刪除指令印出來給人工確認一致後再貼。順序：部署後隔 24h（快取淘汰）→ 跑此函式 → 驗證✅ → 才刪舊欄位。
async function momoMigrateProductsToCollection(){
  if(!window.__cloudMomo || !window.__cloudProfit){ console.error('[遷移] 雲端層未就緒，請重整'); return; }
  const shops=['甲配','乙配','MO+麻吉','MO+森之旅'];
  const report=[];
  let appProfit={};
  try{ const snap=await window.__cloudProfit.getDoc(); appProfit=snap.exists()?(snap.data()||{}):{}; }
  catch(e){ console.error('[遷移] 讀 app/profit 失敗',e); return; }
  for(const shop of shops){
    const k='ec_momo_products|'+shop;
    const oldItems=appProfit[k];
    if(!Array.isArray(oldItems)||oldItems.length===0){ report.push({shop, 狀態:'app/profit 無此欄位或空 → 略過（不需遷移）'}); continue; }
    try{ await window.__cloudMomo.setShop(shop, oldItems); }
    catch(e){ report.push({shop, 狀態:'❌ 寫入 collection 失敗：'+((e&&e.message)||e)}); continue; }
    let cloudCount='?', ok=false;
    try{ const cs=await window.__cloudMomo.getDoc(shop); const cd=cs.exists()?(cs.data()||{}):{}; cloudCount=(cd.items||[]).length; ok=(cloudCount===oldItems.length); }
    catch(e){ report.push({shop, 狀態:'❌ 驗證讀取失敗：'+((e&&e.message)||e)}); continue; }
    report.push({shop, app_profit筆數:oldItems.length, collection筆數:cloudCount, 驗證:ok?'✅ 一致':'❌ 不一致（先別刪）'});
  }
  console.table(report);
  console.log('%c⚠ 下一步：只對上表「驗證 ✅ 一致」的賣場，才刪 app/profit 舊欄位以回收空間。自行貼下列指令（逐賣場確認）：','color:#f59e0b;font-weight:700;font-size:13px');
  console.log("   await window.__cloudProfit.removeFields(['ec_momo_products|乙配']);   // 只刪已驗證一致的，勿刪未驗證/不一致的");
  return report;
}
// ── P6 倉租費（僅乙配）：公司層級月度總費用，不分攤、不進毛利。key 無 shop 後綴（全域一份）──
//   存取比照商品主檔三鏡像：load _profitMem→_mem→localStorage；save localStorage+_profitMem+_mem+_markPending。
//   走 syncToCloud 通用 field 分支（key 不含 'ec|'）→ __cloudProfit.setField → app/profit doc。
const MOMO_RENT_KEY='ec_momo_rent_records';
function momoLoadRent(){
  const k=MOMO_RENT_KEY;
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]) return Store._mem[k]; }catch{}
  try{ const local=localStorage.getItem(k); if(local) return JSON.parse(local); }catch{}
  return [];
}
function momoSaveRent(records){
  const k=MOMO_RENT_KEY;
  try{ localStorage.setItem(k,JSON.stringify(records)); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Store._profitMem[k]=records; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Store._mem[k]=records; }catch{}
  _markPending(k);
}

// ── §2 計算邏輯（甲配/乙配共用同一條公式鏈；毛利公式用實際甲配 Excel 反推驗證過）──
function momoEffectiveAt(history,date){   // 依日期找當時生效的成本/售價版本（P1 尚未接，見規格 §199）
  const sorted=[...history].filter(h=>h.date<=date).sort((a,b)=>a.date>b.date?1:-1);
  return sorted[sorted.length-1]||history[0];
}
function momoCalcMargin({cost,purchasePrice,salePrice,shippingPackaging}){
  const H=salePrice*0.25;                 // 抽成手續費
  const J=(salePrice-H)*0.003;            // 行銷活動
  const K=(salePrice-H)*0.06;             // 活動服務費
  const G=(shippingPackaging||0)+J+K;     // Momo 總成本
  const L=salePrice-G-H;                  // 入帳金額
  const M=(purchasePrice*5)/105;          // 銷項稅金 = 進價×5%÷1.05
  const N=L-cost-M;                       // 實際毛利
  return { unitProfit:N, marginPct: purchasePrice?(N/purchasePrice)*100:0 };
}
// 甲配/乙配 新增表單即時毛利率預覽——「供應商模式」口徑，與淨利表 momoAggregatePeriods 甲乙分支同一套（不是上面售價基準的 momoCalcMargin）：
//   營收 R = 未稅進價(= 含稅進價/1.05)；費用 = R×feeRate；毛利 = R − R×feeRate − cost；毛利率 = 毛利/R = 1 − feeRate − cost/未稅進價。
//   feeRate 取近3月已對帳均費率（可靠時，與 aggregate 未對帳分支 line~5800 同源）、否則退 MOMO 專屬 6.8%。售價/運費/包材在此口徑不參與（運費已含在對帳單費率）。
//   ⇒ 建檔看到的毛利率 == 商品建好、對帳後在總表看到的毛利率（口徑一致，數量會約分掉）；§5 30% 內部獲利目標把關才掛在真淨利率上。
function momoCalcMarginSupplier(shop, {cost, purchasePrice}){
  const ppUntax=(purchasePrice||0)/1.05;   // 含稅進價 → 未稅（對帳金額口徑）
  let feeRate=0.068, feeMode='6.8%';
  const h=momoHistoricalFeeRate(shop);
  if(h && h.reliable){ feeRate=h.rate; feeMode='hist'; }
  if(!(ppUntax>0)) return { unitProfit:0, marginPct:0, feeRate, feeMode };
  const unitProfit=ppUntax*(1-feeRate)-(cost||0);
  return { unitProfit, marginPct:(unitProfit/ppUntax)*100, feeRate, feeMode };
}
// ═══ 階段二：甲配/乙配 新供應商淨利模型的月費率快取 ═══
//   feeRate = E(未稅=對帳單E÷1.05) ÷ A(未稅營收) → 每 SKU 費用 = R×feeRate，Σ全月 = E÷1.05（重現對帳單）。
//   6.8% 是 MOMO 專屬常數（未對帳時只能估比例費用）；絕不共用蝦皮全站費率框。
const _momoFeeRateCache={};   // 'shop|YYYY-MM' → {reconciled, feeRate, E_untax, A_untax, skus} | null(未對帳)
function momoClearFeeRateCache(){ for(const k in _momoFeeRateCache) delete _momoFeeRateCache[k]; }
function momoMonthFeeInfo(shop, month){
  const ck=shop+'|'+month;
  if(ck in _momoFeeRateCache) return _momoFeeRateCache[ck];
  let info=null;
  try{
    const rec=momoLoadReconcile(shop, month);
    if(rec && rec.summary && rec.summary.A && rec.summary.E!=null){
      const A_untax=rec.summary.A.untax||0;   // 整個帳號(甲+乙)發票未稅額 → feeRate 分母（跨兩店攤，Σ甲+Σ乙費用=E）
      const E_untax=rec.summary.E/1.05;   // 對帳單 E 是含稅（A+C−E+G 用含稅欄成立）→ 未稅
      const skus=rec.skus||{};
      const shopRev=Object.keys(skus).reduce((s,k)=>s+(skus[k].revUntax||0),0);   // 「該店」對帳金額未稅合計（自驗用；甲配≠整帳號A）
      if(A_untax>0) info={reconciled:true, feeRate:E_untax/A_untax, E_untax, A_untax, shopRev, skus};
    }
  }catch(e){}
  _momoFeeRateCache[ck]=info;
  return info;
}
// 未對帳月的費用估算：用「最近 3 個月已對帳」的 feeRate 平均（方案C）。
//   為何近 3 月不是全 6 月：feeRate 有 regime shift（六個月實測 1~3月~29% → 4~6月~26%，MOMO 加費用項不需改約），
//   近月代表當前結構、離散度也更小（近3月 sd~1.1pp < 全6月 ~1.6pp）。標準差 >3pp 時上層退回純 6.8%（見 momoAggregatePeriods）。
function momoHistoricalFeeRate(shop){
  const ck='__hist|'+shop;
  if(ck in _momoFeeRateCache) return _momoFeeRateCache[ck];
  const seen={};   // month → feeRate
  const scan=(store)=>{ if(!store) return; const pf='ec_momo_reconcile|'+shop+'|'; Object.keys(store).forEach(k=>{ if(k.indexOf(pf)!==0) return; const m=k.slice(pf.length); if(m in seen) return; const rec=store[k]; if(rec&&rec.summary&&rec.summary.A&&rec.summary.E!=null){ const A=rec.summary.A.untax||0; if(A>0) seen[m]=(rec.summary.E/1.05)/A; } }); };
  try{ scan(Store._profitMem); scan(Store._mem);
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); const pf='ec_momo_reconcile|'+shop+'|'; if(k&&k.indexOf(pf)===0){ const m=k.slice(pf.length); if(!(m in seen)){ try{ const rec=JSON.parse(localStorage.getItem(k)); if(rec&&rec.summary&&rec.summary.A&&rec.summary.E!=null){ const A=rec.summary.A.untax||0; if(A>0) seen[m]=(rec.summary.E/1.05)/A; } }catch(e){} } } }
  }catch(e){}
  const months=Object.keys(seen).sort();
  const recent=months.slice(-3);   // 最近 3 個月
  let info=null;
  if(recent.length){
    const vals=recent.map(m=>seen[m]);
    const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
    const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)*(b-mean),0)/vals.length);
    info={ rate:mean, n:recent.length, months:recent, sd, reliable:sd<=0.03 };   // sd>3pp → 不可靠，上層退 6.8%
  }
  _momoFeeRateCache[ck]=info;
  return info;
}
// 未對帳月的退貨率估算：用「最近 3 個月已對帳」的店級退貨率（Σ客退 ÷ Σ賣出）平均。
//   給退貨成本回沖用——未對帳月沒有對帳數量(net)，用此估 net = gross×(1−退貨率)，讓成本基準跟已對帳月一致（否則環比混基準）。
function momoHistoricalReturnRate(shop){
  const ck='__histRet|'+shop;
  if(ck in _momoFeeRateCache) return _momoFeeRateCache[ck];
  const seen={};   // month → 店級退貨率
  const calc=rec=>{ if(!rec||!rec.skus) return null; let ret=0,sold=0; Object.keys(rec.skus).forEach(sku=>{ const s=rec.skus[sku]; ret+=(s.retQty||0); sold+=((s.reconQty||0)+(s.retQty||0)); }); return sold>0?ret/sold:null; };
  const scan=(store)=>{ if(!store) return; const pf='ec_momo_reconcile|'+shop+'|'; Object.keys(store).forEach(k=>{ if(k.indexOf(pf)!==0) return; const m=k.slice(pf.length); if(m in seen) return; const r=calc(store[k]); if(r!=null) seen[m]=r; }); };
  try{ scan(Store._profitMem); scan(Store._mem);
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); const pf='ec_momo_reconcile|'+shop+'|'; if(k&&k.indexOf(pf)===0){ const m=k.slice(pf.length); if(!(m in seen)){ try{ const r=calc(JSON.parse(localStorage.getItem(k))); if(r!=null) seen[m]=r; }catch(e){} } } }
  }catch(e){}
  const months=Object.keys(seen).sort();
  const recent=months.slice(-3);
  let info=null;
  if(recent.length){ const vals=recent.map(m=>seen[m]); info={ rate:vals.reduce((a,b)=>a+b,0)/vals.length, n:recent.length, months:recent }; }
  _momoFeeRateCache[ck]=info;
  return info;
}
// 彙總單一商品（可傳一個期別或多個加總看整月）。shop 決定模型：
//   甲配/乙配 → 新供應商淨利模型（營收=未稅進價×對帳數量、費用=對帳單E攤、成本未稅、毛利率÷未稅營收）
//   其它（MO+麻吉/MO+森之旅）→ 維持原 momoCalcMargin 路徑，byte-identical（結構隔離，行為不變）
function momoAggregatePeriods(product,periodKeys,shop){
  const data=periodKeys.map(k=>(product.periods||{})[k]).filter(Boolean).map(c=>momoReadCell(c, product&&product.sku));   // 1b：統一讀取，相容舊 flat 與新 compact(sourced) cell
  const qty=data.reduce((s,d)=>s+(d.qty||0),0);
  const returnQty=data.reduce((s,d)=>s+(d.returnQty||0),0);

  if(shop!=='甲配' && shop!=='乙配'){
    // ── MO+ 麻吉 / MO+ 森之旅（及未指定 shop 的舊呼叫）：原公式，一字不改 ──
    const freightTotal=data.reduce((s,d)=> s+(d.freight!=null?d.freight:(product.shippingPackaging||0)*(d.qty||0)),0);
    const avgShipping=qty?freightTotal/qty:(product.shippingPackaging||0);
    const { marginPct, unitProfit }=momoCalcMargin({
      cost:product.cost, purchasePrice:product.purchasePrice,
      salePrice:product.salePrice, shippingPackaging:avgShipping
    });
    return {
      qty, revenue:qty*product.salePrice, profit:qty*unitProfit,
      margin:qty?marginPct:0,
      returnRate:qty?Math.round((returnQty/qty)*1000)/10:0
    };
  }

  // ── 甲配/乙配：新供應商淨利模型 ──
  const month = periodKeys.length ? String(periodKeys[0]).slice(0,7) : '';
  const sku = product.sku;
  const c1105RevPeriod = data.reduce((s,d)=>s+(d.revUntax||0),0);   // 選期別的 C1105 未稅營收（gross 暫估用）
  const fee = month ? momoMonthFeeInfo(shop, month) : null;
  let R=0, reconciled=false, splitEstimated=false, costQty=qty, costNetBasis=false;
  if(fee && fee.skus && fee.skus[sku] && fee.skus[sku].revUntax!=null){
    // 已對帳：R = 該SKU月營收(對帳金額未稅,已net客退) × (選期別C1105營收 ÷ 該SKU整月C1105營收)
    reconciled=true;
    const fs=fee.skus[sku];
    const skuMonthRev=fs.revUntax;
    const monthKeys=[month+'-H1', month+'-H2'];
    const c1105RevMonth=monthKeys.map(k=>(product.periods||{})[k]).filter(Boolean).map(c=>momoReadCell(c,sku)).reduce((s,d)=>s+(d.revUntax||0),0);
    const ratio = c1105RevMonth>0 ? (c1105RevPeriod/c1105RevMonth) : ((periodKeys.length>=2)?1:0);   // 半月拆分比例（跟營收同軌）
    if(c1105RevMonth>0){ R=skuMonthRev*ratio; if(c1105RevPeriod!==c1105RevMonth) splitEstimated=true; }
    else { R = (periodKeys.length>=2)?skuMonthRev:0; }   // 無 C1105 比例可拆：整月給全額、半月不亂拆給 0
    // 退貨成本回沖：成本用「對帳數量(net,已扣退貨)」而非出貨數量(gross)。退貨的貨回倉、成本延到再賣才認 → 與 net 營收同基準。半月按同比例拆。
    if(fs.reconQty!=null){ costQty = fs.reconQty*ratio; costNetBasis=true; }
  } else {
    R = c1105RevPeriod;   // 未對帳：無對帳數量
    const hr=momoHistoricalReturnRate(shop);   // 用近3月平均退貨率估 net = gross×(1−退貨率)，讓成本基準與已對帳月一致（否則環比混 gross/net 基準）
    if(hr && hr.rate>=0){ costQty = qty*(1-hr.rate); costNetBasis='est'; }
  }
  const cost=(product.cost||0)*costQty;
  // 未對帳費率（方案C）：近3月已對帳均 feeRate（可靠時）→ 否則退 6.8%
  let estFeeRate=0.068, estMode='6.8%';
  if(!reconciled){ const h=momoHistoricalFeeRate(shop); if(h && h.reliable){ estFeeRate=h.rate; estMode='hist'; } }
  const feeAmt = (reconciled&&fee) ? R*fee.feeRate : R*estFeeRate;
  const profit=R-feeAmt-cost;
  // 階段四：該SKU該期別出貨運費（供總表兩pass物流重分配；已對帳且有運費資料才有值，否則 null）
  let skuFreightPeriod=null;
  if(reconciled){ const frt=momoMonthFreightInfo(shop, month); if(frt){ skuFreightPeriod=periodKeys.reduce((s,pk)=>s+((frt.freight[sku]&&frt.freight[sku][pk])||0),0); } }
  // 退貨率改吃對帳單（cell 的 returnQty 欄根本不存在、S1105 未寫→原本全 0）。對帳單有逐 SKU 客退數量/金額（月顆粒）。
  //   退貨率 = 客退數量 ÷ 賣出數量（賣出=對帳數量+客退數量）。未對帳→null（畫面顯示「—」）。半月也顯示月值（對帳單月顆粒、標示）。
  let retRate=null, retQty=0, retAmt=0;
  if(reconciled && fee.skus[sku]){ const sk=fee.skus[sku]; retQty=sk.retQty||0; retAmt=sk.retAmt||0; const sold=(sk.reconQty||0)+retQty; retRate=sold>0?Math.round((retQty/sold)*1000)/10:0; }
  // S1103 瀏覽量 + 成交率（訂購數÷瀏覽量）。成交率除零：進榜瀏覽0→'zerodiv'(顯示—)；沒進榜→null(空白)。avgPrice 給單品分析用。
  const s1103Period = month ? (periodKeys.length>=2 ? month+'-FULL' : periodKeys[0]) : '';
  const sv = s1103Period ? momoS1103ForPeriod(sku, s1103Period) : null;
  let view=null, convRate=null, s1103Ord=null, avgPrice=null, viewEstimated=false;
  if(sv && sv.inReport){ view=sv.view; s1103Ord=sv.ord; viewEstimated=!!sv.estimated; avgPrice=sv.ord>0?sv.amt/sv.ord:null; convRate = view>0 ? Math.round((sv.ord/view)*1000)/10 : 'zerodiv'; }
  return {
    // 毛利率：R>0 才有意義；R=0 但有毛利（整批退貨 net 營收 0、成本仍在）→ null（畫面「—」，不是誤導的 0%）；R=0 且毛利≈0 → 0
    qty, revenue:R, profit, cost, costQty, costNetBasis, margin:R>0?(profit/R)*100:(Math.abs(profit)>0.5?null:0),
    returnRate:retRate, retQty, retAmt,
    view, convRate, s1103Ord, avgPrice, viewEstimated,
    reconciled, estimated:!reconciled, splitEstimated, estMode, skuFreightPeriod
  };
}

/* ═══════════════ 1b：qty 重建（sourced 緊湊編碼）═══════════════
   設計決定（自行拍板、記錄理由）：
   - cell 兩種格式並存：舊 flat {qty,freightCost,returnQty}；新 compact {s:"src:qty:rev|...", f:freightCost暫留}。
     s = qtySources 緊湊字串（來源:數量:未稅營收，| 分隔），qty/未稅營收讀取時 parse 加總、不另存欄位。
     理由：Firestore map 每層 +32 bytes overhead，1300 SKU×多期別×多源的巢狀 map 會撞 1MB（實測 1070KB）；
     字串編碼砍掉 map 骨架 → 甲配 602KB（見記憶 payload B案）。本 App 是整份 doc 讀進記憶體處理，不查 Firestore 欄位，故可讀性損失=0。
   - freightCost 暫留 f 不動（階段四改吃對帳單月權威）；freightRebuilt 省略=未重建（stage1 全未重建）。
   - 分隔符 : | ：品號純數字、來源 26MM、期別 YYYY-MM-Hx 皆不含（已掃 0 衝突），編碼時仍 assert 防未來格式變。 */
function momoDecodeSources(s){   // "2603:812:255310|2604:72:22640" → {'2603':{qty:812,rev:255310},...}
  const out={}; if(s==null||s==='') return out;
  String(s).split('|').forEach(part=>{ if(!part) return; const a=part.split(':'); if(a[0]) out[a[0]]={qty:+a[1]||0, rev:+a[2]||0}; });
  return out;
}
function momoEncodeSources(obj){   // {'2603':{qty,rev}} → "2603:812:255310|..."（來源排序，金額 round 整數）
  return Object.keys(obj||{}).sort().map(src=>{
    if(/[:|]/.test(src)) throw new Error('[MOMO] 來源鍵含分隔符 :| ，編碼會壞：'+src);
    return src+':'+Math.round(obj[src].qty||0)+':'+Math.round(obj[src].rev||0);
  }).join('|');
}
// 統一讀取一個 period cell → {qty, revUntax, freight, rebuilt}。相容舊 flat 與新 compact，並偵測舊版寫入污染。
function momoReadCell(cell, ctx){
  if(!cell||typeof cell!=='object') return {qty:0, revUntax:0, freight:null, rebuilt:false};
  if(cell.s!=null){   // 新 compact（sourced）
    const src=momoDecodeSources(cell.s); let q=0,r=0;
    Object.keys(src).forEach(k=>{ q+=src[k].qty; r+=src[k].rev; });
    if(cell.qty!=null || cell.qtySources!=null){   // 舊版 momoApplyUploadPlan 的 Object.assign 亂塞進 compact cell → 大聲警告、不靜默、以 sources 為準
      try{ console.error('%c[MOMO] compact cell 疑遭舊版寫入污染（混入 flat qty/qtySources），已以 sources 為準：'+(ctx||''), 'color:#dc2626;font-weight:700', cell); }catch{}
      cell._dirty=true;   // 供畫面標紅
    }
    return {qty:q, revUntax:r, freight:(cell.f!=null?cell.f:null), rebuilt:true, sources:src, dirty:!!cell._dirty};
  }
  return {qty:cell.qty||0, revUntax:0, freight:(cell.freightCost!=null?cell.freightCost:null), returnQty:cell.returnQty||0, rebuilt:false};
}
// 從多個 C1105 檔建重建計畫（每檔一個 26MM 來源）。files=[{src,parsed}]。回 plan[shop][sku][period]={sources:{src:{qty,rev}}}
function momoBuildRebuildPlan(files){
  const plan={甲配:{},乙配:{}};
  files.forEach(({src,parsed})=>{
    ['甲配','乙配'].forEach(shop=>{
      const sales=(parsed.sales&&parsed.sales[shop])||{}, rev=(parsed.revUntax&&parsed.revUntax[shop])||{};
      Object.keys(sales).forEach(sku=>{
        Object.keys(sales[sku]).forEach(period=>{
          if(!/^\d{4}-\d{2}-H[12]$/.test(period)) return;   // 防護：只收合法期別 key
          plan[shop][sku]=plan[shop][sku]||{};
          const cell=plan[shop][sku][period]=plan[shop][sku][period]||{sources:{}};
          cell.sources[src]=cell.sources[src]||{qty:0,rev:0};
          cell.sources[src].qty+=sales[sku][period];
          cell.sources[src].rev+=(rev[sku]&&rev[sku][period])||0;
        });
      });
    });
  });
  return plan;
}
// dry-run：比對重建計畫 vs 現有主檔，算逐期別 重建前/後 qty + 每件運費稀釋。不寫入。
function momoRebuildDryRun(files){
  const plan=momoBuildRebuildPlan(files);
  const report={ shops:{}, generatedFiles:files.map(f=>f.src) };
  ['甲配','乙配'].forEach(shop=>{
    const master=momoLoadProducts(shop);
    const bySku=new Map(master.map(p=>[p.sku,p]));
    const perPeriod={};   // period → {beforeQty,afterQty,freight,unmatchedSku:[]}
    const shopPlan=plan[shop]||{};
    Object.keys(shopPlan).forEach(sku=>{
      const prod=bySku.get(sku);
      Object.keys(shopPlan[sku]).forEach(period=>{
        const after=Object.values(shopPlan[sku][period].sources).reduce((s,x)=>s+x.qty,0);
        const cur=prod&&prod.periods&&prod.periods[period];
        const before=cur?momoReadCell(cur).qty:0;
        const freight=cur?(momoReadCell(cur).freight):null;
        const pp=perPeriod[period]=perPeriod[period]||{beforeQty:0,afterQty:0,freight:0,skuN:0,unmatched:0};
        pp.afterQty+=after; pp.beforeQty+=before; pp.skuN++;
        pp.freight+=(freight!=null?freight:(prod?(prod.shippingPackaging||0)*after:0));
        if(!prod) pp.unmatched++;
      });
    });
    const rows=Object.keys(perPeriod).sort().map(period=>{
      const p=perPeriod[period];
      const perUnitBefore=p.beforeQty?p.freight/p.beforeQty:0;   // 稀釋前每件運費
      const perUnitAfter =p.afterQty ?p.freight/p.afterQty :0;   // 稀釋後每件運費（qty↑ freight不動 → 變小）
      return {period, beforeQty:p.beforeQty, afterQty:p.afterQty, deltaQty:p.afterQty-p.beforeQty,
              freight:Math.round(p.freight), perUnitBefore:+perUnitBefore.toFixed(2), perUnitAfter:+perUnitAfter.toFixed(2),
              dilutionPct:perUnitBefore?+(100*(perUnitAfter-perUnitBefore)/perUnitBefore).toFixed(1):0, unmatchedSku:p.unmatched};
    });
    report.shops[shop]={rows, totalBefore:rows.reduce((s,r)=>s+r.beforeQty,0), totalAfter:rows.reduce((s,r)=>s+r.afterQty,0)};
  });
  try{ window.__momoRebuildReport=report; }catch{}
  return report;
}
// apply：把重建計畫寫成 compact cell（保留 freightCost 暫留 f）。⚠️ 停在雲端確認由 UI 把關，此函式只落盤三鏡像。
function momoRebuildApply(files){
  const plan=momoBuildRebuildPlan(files);
  let cellsWritten=0;
  ['甲配','乙配'].forEach(shop=>{
    const master=momoLoadProducts(shop);
    const bySku=new Map(master.map(p=>[p.sku,p]));
    const shopPlan=plan[shop]||{};
    Object.keys(shopPlan).forEach(sku=>{
      const prod=bySku.get(sku); if(!prod) return;   // 只寫已建檔 SKU（未比對到的略過，dry-run 已列）
      prod.periods=prod.periods||{};
      Object.keys(shopPlan[sku]).forEach(period=>{
        const oldCell=prod.periods[period]||{};
        const oldFreight=momoReadCell(oldCell).freight;   // 暫留舊 freightCost（新期別為 null → 不寫 f，讓 momoReadCell 回 null 走 shippingPackaging fallback）
        const newCell={ s: momoEncodeSources(shopPlan[sku][period].sources) };
        if(oldFreight!=null) newCell.f=oldFreight;   // 交付條件：新期別 freightCost 留 null 不寫 0
        prod.periods[period]=newCell;   // 整格取代成 compact（不 Object.assign，避免殘留 flat qty）
        cellsWritten++;
      });
    });
    momoSaveProducts(shop,master);
  });
  return {cellsWritten};
}
// history 修剪：只刪自動「新建檔」佔位，保留任何實際成本/售價異動。dry-run 不寫。
function momoTrimHistoryDryRun(){
  const out={shops:{}};
  ['甲配','乙配'].forEach(shop=>{
    const master=momoLoadProducts(shop);
    let toDelete=0, keep=0; const sample=[];
    master.forEach(p=>{ if(!p.history) return;
      p.history.forEach(h=>{ if(/新建檔/.test(String(h&&h.note||''))){ toDelete++; if(sample.length<3)sample.push({sku:p.sku,...h}); } else keep++; });
    });
    out.shops[shop]={products:master.length, toDelete, keep, sample};
  });
  return out;
}
function momoTrimHistoryApply(){
  let removed=0;
  ['甲配','乙配'].forEach(shop=>{
    const master=momoLoadProducts(shop);
    master.forEach(p=>{ if(!p.history) return; const before=p.history.length; p.history=p.history.filter(h=>!/新建檔/.test(String(h&&h.note||''))); removed+=before-p.history.length; });
    momoSaveProducts(shop,master);
  });
  return {removed};
}
// ── 1b：重建 UI（獨立子分頁；migration 工具，遷移完可移除。獨立入口避免污染 C1105 上傳共用流程）──
let _momoRebuildFiles=[];   // [{name, src, file}]
let _momoRebuildLastFiles=null;   // dry-run 時暫存解析結果，供 confirm apply 用（避免重讀檔）
const _momoEsc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function momoRebuildSrcFromName(name){ const m=String(name).match(/(\d{4})(?=\.xlsx?$)/i); return (m&&/^2\d(0[1-9]|1[0-2])$/.test(m[1]))?m[1]:null; }   // 檔名末4碼 26MM
function momoRenderRebuild(shop){
  const c=document.getElementById('momo-sub-content-'+shop); if(!c) return;
  const files=_momoRebuildFiles.length?_momoRebuildFiles.map((f,i)=>`<div style="font-size:12px;margin:2px 0">${f.src?'<b style="color:#5b5fcf">'+f.src+'</b>':'<span style="color:#dc2626">來源判不出</span>'} ← ${_momoEsc(f.name)} <a onclick="momoRebuildRemove(${i},'${shop}')" style="color:#ef4444;cursor:pointer;font-weight:700">✕</a></div>`).join(''):'<div style="color:#9ca3af;font-size:12px">尚未選檔（一次選齊要重建的所有 C1105，例 2601~2606；甲配乙配都從同批檔讀）</div>';
  c.innerHTML=`
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:12px;color:#9a3412;line-height:1.6">
      <b>⟳ qty 全期別重建（sourced 緊湊編碼）</b>：把每月 C1105 結算檔的貢獻<b>分來源</b>存進緊湊字串，修正「跨月結算檔互相覆蓋 qty」。<br>
      流程：選齊 C1105 → 產生預覽(dry-run) → 你確認雲端沒被別人動過 → 寫入 → 手動「☁ 同步雲端」。</div>
    <input type="file" accept=".xlsx,.xls" multiple onchange="momoRebuildPick(event,'${shop}')" style="font-size:12px">
    <div style="margin:8px 0;padding:8px;border:1px solid #eee;border-radius:6px">${files}</div>
    <button onclick="momoRebuildGenerate('${shop}')" ${_momoRebuildFiles.length?'':'disabled'} style="padding:7px 16px;border-radius:7px;border:none;background:${_momoRebuildFiles.length?'#5b5fcf':'#c7c9e6'};color:#fff;font-size:13px;font-weight:600;cursor:pointer">▶ 產生重建預覽（dry-run，不寫入）</button>
    <div id="momo-rebuild-report" style="margin-top:12px"></div>
    <hr style="margin:18px 0;border:none;border-top:1px solid #eee">
    <div style="font-size:13px;font-weight:700;margin-bottom:6px">history 修剪（payload B 案需要，把「新建檔」佔位清掉）</div>
    <button onclick="momoTrimPreview('${shop}')" style="padding:6px 14px;border-radius:7px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:13px;cursor:pointer">預覽修剪（dry-run）</button>
    <div id="momo-trim-report" style="margin-top:8px"></div>`;
}
function momoRebuildPick(e,shop){ Array.from(e.target.files||[]).forEach(file=>_momoRebuildFiles.push({name:file.name,src:momoRebuildSrcFromName(file.name),file})); e.target.value=''; momoRenderRebuild(shop); }
function momoRebuildRemove(i,shop){ _momoRebuildFiles.splice(i,1); momoRenderRebuild(shop); }
function momoRebuildGenerate(shop){
  const el=document.getElementById('momo-rebuild-report'); if(el) el.innerHTML='<div style="color:#9ca3af;font-size:13px">解析中…</div>';
  const bad=_momoRebuildFiles.filter(f=>!f.src);
  if(bad.length){ if(el) el.innerHTML='<div style="color:#dc2626;font-size:13px">來源判不出（檔名末尾要 _26MM，例 _2603）：'+bad.map(f=>_momoEsc(f.name)).join('、')+'</div>'; return; }
  Promise.all(_momoRebuildFiles.map(f=>momoReadWorkbook(f.file).then(wb=>({src:f.src,parsed:momoParseC1105(wb.firstSheet())}))))
    .then(files=>{ _momoRebuildLastFiles=files; momoRenderRebuildReport(momoRebuildDryRun(files), shop); })
    .catch(err=>{ if(el) el.innerHTML='<div style="color:#dc2626;font-size:13px">解析失敗：'+_momoEsc(err&&err.message||err)+'</div>'; });
}
function momoRenderRebuildReport(rep, shop){
  const el=document.getElementById('momo-rebuild-report'); if(!el) return;
  const shopBlock=s=>{ const sp=rep.shops[s]; if(!sp||!sp.rows.length) return `<div style="font-size:12px;color:#9ca3af">${s}：無資料</div>`;
    const rows=sp.rows.map(r=>{ const down=r.dilutionPct<0; return `<tr style="border-top:1px solid #f3f4f6">
      <td style="padding:3px 8px">${momoPeriodLabel(r.period)}</td>
      <td style="padding:3px 8px;text-align:right">${r.beforeQty}</td>
      <td style="padding:3px 8px;text-align:right;font-weight:600">${r.afterQty}</td>
      <td style="padding:3px 8px;text-align:right;color:${r.deltaQty>0?'#16a34a':'#6b7280'}">${r.deltaQty>0?'+':''}${r.deltaQty}</td>
      <td style="padding:3px 8px;text-align:right">${r.perUnitBefore} → <b style="color:${down?'#dc2626':'#374151'}">${r.perUnitAfter}</b> ${down?'▼'+Math.abs(r.dilutionPct)+'%':''}</td>
      <td style="padding:3px 8px;text-align:right;color:${r.unmatchedSku?'#f97316':'#9ca3af'}">${r.unmatchedSku||''}</td></tr>`; }).join('');
    return `<div style="font-weight:700;margin:8px 0 4px">${s}（重建前 ${sp.totalBefore} → 後 ${sp.totalAfter}）</div>
      <div style="max-height:260px;overflow:auto;border:1px solid #eee;border-radius:6px"><table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr style="text-align:right;color:#6b7280;position:sticky;top:0;background:#fafafa"><th style="padding:3px 8px;text-align:left">期別</th><th style="padding:3px 8px">重建前qty</th><th style="padding:3px 8px">重建後qty</th><th style="padding:3px 8px">Δ</th><th style="padding:3px 8px">每件運費(稀釋)</th><th style="padding:3px 8px">未建檔SKU</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`; };
  el.innerHTML=`<div style="font-size:13px;font-weight:700;margin-bottom:4px">重建預覽（尚未寫入）</div>
    <div style="font-size:12px;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:8px;margin-bottom:8px">⚠️ 每件運費「稀釋」= qty 補回但 freight 未動 → 每件變小（紅▼）。這是階段一單獨做的已知失真，階段四 freight 重建才修正。</div>
    ${shopBlock('甲配')}${shopBlock('乙配')}
    <div style="margin-top:10px;display:flex;gap:8px">
      <button onclick="momoRebuildDownloadReport()" style="padding:6px 14px;border-radius:7px;border:1px solid #e5e7eb;background:#fff;color:#5b5fcf;font-size:13px;cursor:pointer">⬇ 下載報告 JSON</button>
      <button onclick="momoRebuildConfirm('${shop}')" style="padding:6px 16px;border-radius:7px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:600;cursor:pointer">確認重建寫入（會先讀雲端讓你核對）</button></div>`;
}
function momoRebuildDownloadReport(){ try{ const blob=new Blob([JSON.stringify(window.__momoRebuildReport||{},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='momo_rebuild_report.json'; a.click(); }catch(e){ alert('下載失敗：'+e.message); } }
async function momoRebuildConfirm(shop){
  // 交付條件：apply 前讀雲端讓使用者核對 812/161（沒被別人動過）
  let cloudMsg='（雲端讀取失敗，仍可寫本機但請自行確認）';
  try{
    const q=async(sh)=>{ const snap=await window.__cloudMomo.getDoc(sh); const items=(snap.exists()&&snap.data().items)||[]; let t=0,t3=0; items.forEach(p=>{ if(!p.periods)return; Object.keys(p.periods).forEach(k=>{ const rc=momoReadCell(p.periods[k]); t+=rc.qty; if(k==='2026-03-H2')t3+=rc.qty; }); }); return {t,t3}; };
    const j=await q('甲配'), y=await q('乙配');
    cloudMsg=`雲端現值：甲配 3月下=${j.t3}（總${j.t}）／乙配 3月下=${y.t3}（總${y.t}）\n（重建前應為 甲配3月下 812 / 乙配 161；若不同代表被別人動過）`;
  }catch(e){}
  if(!confirm('確認重建寫入（本機三鏡像；之後要手動「☁ 同步雲端」才上雲）？\n\n'+cloudMsg+'\n\n確定要以重建結果整格取代這些期別？')) return;
  const res=momoRebuildApply(_momoRebuildLastFiles||[]);
  if(typeof showToast==='function') showToast('已重建寫入 '+res.cellsWritten+' 格（記得按 ☁ 同步雲端）','success');
  momoRenderRebuild(shop);
}
function momoTrimPreview(shop){
  const r=momoTrimHistoryDryRun(); const el=document.getElementById('momo-trim-report'); if(!el) return;
  const b=Object.keys(r.shops).map(s=>`${s}：刪 ${r.shops[s].toDelete} 筆「新建檔」佔位 / 保留 ${r.shops[s].keep} 筆實際異動`).join('　');
  el.innerHTML=`<div style="font-size:12px;line-height:1.7">${b}<br><span style="color:#9a3412">⚠️ 目前 history 幾乎全是「新建檔」佔位（0 真實異動）→ 修剪≈清空，base 已有現值不丟真資料。</span></div>
    <button onclick="momoTrimBackupAndApply('${shop}')" style="margin-top:6px;padding:6px 14px;border-radius:7px;border:none;background:#dc2626;color:#fff;font-size:13px;font-weight:600;cursor:pointer">先下載備份 → 確認修剪</button>`;
}
function momoTrimBackupAndApply(shop){
  try{ ['甲配','乙配'].forEach(s=>{ const blob=new Blob([JSON.stringify({shop:s,items:momoLoadProducts(s)},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='momo_products_backup_'+(s==='甲配'?'jia':'yi')+'.json'; a.click(); }); }catch(e){ alert('備份下載失敗，中止修剪：'+e.message); return; }
  if(!confirm('已下載兩份備份 JSON。確認執行 history 修剪（刪除「新建檔」佔位）？此動作寫本機三鏡像，之後要手動同步。')) return;
  const res=momoTrimHistoryApply();
  if(typeof showToast==='function') showToast('已修剪 '+res.removed+' 筆 history 佔位（記得按 ☁ 同步雲端）','success');
  momoTrimPreview(shop);
}

/* ═══════════════ 階段二：對帳單（月權威）解析 + 營收側 ═══════════════
   對帳單「訂單貨款」分頁 → 逐SKU（品號層，單品彙總）。依「賣出方式」分通路：一般販售→甲配、寄倉販售→乙配。
   營收=對帳金額(未稅) 為 SKU 月權威值（已 net 客退）；半月拆分才估算（用 C1105 revUntaxSum 比例）。 */
function momoParseReconcile(rows, otherRows){
  let h=-1; for(let i=0;i<Math.min(rows.length,30);i++){ if((rows[i]||[]).map(c=>String(c).trim()).includes('品號')){ h=i; break; } }
  if(h<0) throw new Error('對帳單：找不到「品號」表頭（要「訂單貨款」分頁，不是摘要頁）');
  const hd=(rows[h]||[]).map(c=>String(c).trim()); const ix=n=>hd.indexOf(n);
  const I={sku:ix('品號'),sell:ix('賣出方式'),rq:ix('對帳數量'),rev:ix('對帳金額(未稅)'),tx:ix('對帳稅額'),retQ:ix('客退數量'),retA:ix('客退金額'),holdQ:ix('保留數量'),holdA:ix('保留金額'),tax:ix('應稅')};
  if(I.sku<0||I.rev<0||I.sell<0) throw new Error('對帳單：缺必要欄（需要 品號 / 賣出方式 / 對帳金額(未稅)）');
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const byShop={甲配:{},乙配:{}}, unknownSell=[];
  for(let i=h+1;i<rows.length;i++){ const r=rows[i]; if(!r) continue; const sku=String(r[I.sku]||'').trim(); if(!sku) continue;
    const sell=String(r[I.sell]||'').trim();
    const shop= sell==='一般販售'?'甲配' : sell==='寄倉販售'?'乙配' : null;
    if(!shop){ if(unknownSell.length<20) unknownSell.push({sku,sell}); continue; }
    const b=byShop[shop][sku]=byShop[shop][sku]||{reconQty:0,revUntax:0,tax:0,retQty:0,retAmt:0,holdQty:0,holdAmt:0,taxable:null};
    b.reconQty+=num(r[I.rq]); b.revUntax+=num(r[I.rev]); if(I.tx>=0)b.tax+=num(r[I.tx]);
    if(I.retQ>=0)b.retQty+=num(r[I.retQ]); if(I.retA>=0)b.retAmt+=num(r[I.retA]);
    if(I.holdQ>=0)b.holdQty+=num(r[I.holdQ]); if(I.holdA>=0)b.holdAmt+=num(r[I.holdA]);
    if(b.taxable===null&&I.tax>=0) b.taxable=String(r[I.tax]||'').trim();
  }
  // 彙總各通路 A（未稅營收）供驗收
  const shopTotal=s=>Object.values(byShop[s]).reduce((a,x)=>a+x.revUntax,0);
  // 「其他訂單」分頁（如廠訴請賠，非每月都有 → 分頁數不固定，用選填 rows 容忍；金額不靜默丟、獨立歸屬）
  const otherOrders=[]; let otherUntax=0;
  if(otherRows&&otherRows.length){
    let oh=-1; for(let i=0;i<Math.min(otherRows.length,10);i++){ if((otherRows[i]||[]).map(c=>String(c).trim()).includes('請賠金額(+/-)')){ oh=i; break; } }
    if(oh>=0){ const ohd=(otherRows[oh]||[]).map(c=>String(c).trim());
      const oi={sku:ohd.indexOf('品號'),item:ohd.indexOf('請賠項目'),name:ohd.indexOf('發票品名'),amt:ohd.indexOf('請賠金額(+/-)')};
      for(let i=oh+1;i<otherRows.length;i++){ const r=otherRows[i]; if(!r) continue; const amtTax=num(r[oi.amt]); if(!amtTax&&!String(r[oi.sku]||'').trim()) continue;
        const amtUntax=Math.round(amtTax/1.05);   // 請賠金額為含稅（2604: 247含稅→235未稅）
        otherOrders.push({sku:String(r[oi.sku]||'').trim(), item:String(r[oi.item]||'').trim(), name:String(r[oi.name]||'').trim(), amtTax, amtUntax}); otherUntax+=amtUntax; }
    }
  }
  return {byShop, unknownSell, otherOrders, meta:{revUntax:{甲配:Math.round(shopTotal('甲配')),乙配:Math.round(shopTotal('乙配'))}, otherUntax}};
}
// SKU 層月營收（對帳單權威、精確）→ 拆到半月期別（只這步估算，用 C1105 該 SKU 的 revUntaxSum 比例）。
//   c1105RevByPeriod: {period: revUntaxSum}（該 SKU 該月各期別 gross）。total=0（對帳單有此 SKU 但 C1105 該月沒有）→ 回空，
//   邊界 a（拆不出半月）由上層處理：整月列、標「無法拆半月」，不靜默丟。
// 對帳單本機儲存（每 shop 每月一份，比照 momoLoadProducts 三鏡像；雲端走 momo_reconcile collection，接線在同步層）
function momoReconcileKey(shop,month){ return 'ec_momo_reconcile|'+shop+'|'+month; }
function momoLoadReconcile(shop,month){
  const k=momoReconcileKey(shop,month);
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]) return Store._mem[k]; }catch{}
  try{ const l=localStorage.getItem(k); if(l) return JSON.parse(l); }catch{}
  return null;   // null = 該月未對帳（總表走 C1105 gross 暫估）
}
function momoSaveReconcile(shop,month,data){
  const k=momoReconcileKey(shop,month);
  try{ localStorage.setItem(k,JSON.stringify(data)); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Store._profitMem[k]=data; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Store._mem[k]=data; }catch{}
}
// ═══ S1103 銷售排行榜（獨立 key ec_momo_s1103|period，帳號級、品號 join 甲乙主檔）═══
//   一檔四 sheet，只讀「熱銷排行」（325筆涵蓋其餘三個 top-100）。取 品號/訂購數/瀏覽量/訂購金額；
//   丟 目前售價/可接單量（匯出當下快照，回溯會拿今天值）。期別由日期區間判（整月/半月）。
function momoParseS1103(wb){
  const names=wb.names||[];
  const sn=names.includes('熱銷排行')?'熱銷排行':names[0];
  const rows=wb.sheet?wb.sheet(sn):wb;   // 相容：傳 workbook 或直接 rows
  const R=rows||[];
  // 期別：找 "MM/DD~MM/DD"（年份無在檔內 → 假設當年 2026；整月=1~月底、H1=1~15、H2=16~月底）
  let period=null, range='';
  for(let i=0;i<6;i++){ const line=(R[i]||[]).map(x=>String(x)).join(' '); const m=line.match(/(\d{1,2})\/(\d{1,2})\s*[~～-]\s*(\d{1,2})\/(\d{1,2})/); if(m){ range=m[0]; const mo=String(+m[1]).padStart(2,'0'), d1=+m[2], d2=+m[4]; const y='2026'; period = (d1<=1&&d2<=16)?`${y}-${mo}-H1` : (d1>=15)?`${y}-${mo}-H2` : `${y}-${mo}-FULL`; break; } }
  // 表頭列
  let h=-1; for(let i=0;i<15;i++){ if((R[i]||[]).some(x=>/品號|商品編號/.test(String(x)))){ h=i; break; } }
  if(h<0) throw new Error('S1103 找不到品號表頭（是不是選錯 sheet 或檔格式變了）');
  const hdr=R[h].map(x=>String(x).trim());
  const ci={ sku:hdr.findIndex(x=>/品號|商品編號/.test(x)), ord:hdr.indexOf('訂購數'), view:hdr.indexOf('瀏覽量'), amt:hdr.indexOf('訂購金額') };
  if(ci.ord<0||ci.view<0||ci.amt<0) throw new Error('S1103 缺欄位（需要 訂購數/瀏覽量/訂購金額）：實際='+hdr.join('、'));
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const skus={}; for(let i=h+1;i<R.length;i++){ const sku=String(R[i][ci.sku]||'').trim(); if(!sku) continue; skus[sku]={ord:num(R[i][ci.ord]), view:num(R[i][ci.view]), amt:num(R[i][ci.amt])}; }
  return { period, range, sheet:sn, skus, count:Object.keys(skus).length };
}
function momoS1103Key(period){ return 'ec_momo_s1103|'+period; }
function momoLoadS1103(period){ const k=momoS1103Key(period);
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]) return Store._mem[k]; }catch{}
  try{ const l=localStorage.getItem(k); if(l) return JSON.parse(l); }catch{}
  return null; }
function momoSaveS1103(period,data){ const k=momoS1103Key(period);
  try{ localStorage.setItem(k,JSON.stringify(data)); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Store._profitMem[k]=data; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Store._mem[k]=data; }catch{} }
// 該 SKU 在「總表選的期別」的 S1103 瀏覽/成交（整月直接讀；半月現有檔多為整月 → 沿用整月值、標估算）
function momoS1103ForPeriod(sku, period){
  if(!period) return null;
  const mo=period.slice(0,7);
  // 先找同期別檔；沒有再退整月檔（半月未下載時沿用整月）
  let rec=momoLoadS1103(period), estimated=false;
  if(!rec && !period.endsWith('-FULL')){ rec=momoLoadS1103(mo+'-FULL'); if(rec) estimated=true; }
  if(!rec || !rec.skus) return null;
  const s=rec.skus[sku]; if(!s) return {inReport:false};   // 沒進榜 → 空值（跟「進榜瀏覽0」區分）
  return { inReport:true, ord:s.ord, view:s.view, amt:s.amt, estimated };
}
// sanity check：S1103 訂購數 vs C1105 qty。基準=交集品號（非總和）；不變式 訂購數≥qty（下單≥對帳）；逐SKU反向=異常。
// S1103 sanity：交集品號比較 + 不變式「下單量 ≥ 對帳量」。qty 來源兩態：
//   本次上傳 C1105 → momoS1103QtyFromC1105；只傳 S1103（回溯補檔）→ momoS1103QtyFromStore 用主檔已存 qty（b 方案：資料已在系統裡，不必再傳一次 C1105）。
function momoS1103QtyFromC1105(c1105, moPfx){
  const q={};
  ['甲配','乙配'].forEach(sh=>{ const sales=(c1105.sales&&c1105.sales[sh])||{}; Object.keys(sales).forEach(sku=>{ Object.keys(sales[sku]).forEach(period=>{ if(!moPfx||period.startsWith(moPfx)){ q[sku]=(q[sku]||0)+sales[sku][period]; } }); }); });
  return q;
}
function momoS1103QtyFromStore(moPfx){   // 主檔已存 qty：掃甲乙配 products 的 periods，取同月 compact/flat cell 的 qty 加總
  const q={};
  ['甲配','乙配'].forEach(sh=>{ momoLoadProducts(sh).forEach(p=>{ if(!p.periods||!p.sku) return; Object.keys(p.periods).forEach(k=>{ if(!moPfx||k.startsWith(moPfx)){ const rc=momoReadCell(p.periods[k], p.sku); q[p.sku]=(q[p.sku]||0)+(rc.qty||0); } }); }); });
  return q;
}
function momoS1103Sanity(s1103, qtyMap, source){
  const rankSet=new Set(Object.keys(s1103.skus)), qtySet=new Set(Object.keys(qtyMap).filter(k=>qtyMap[k]>0));
  const inter=[...rankSet].filter(s=>qtySet.has(s));
  // 反向（訂購<qty）：兩態門檻——差距>3「且」>5% 才算顯著（亮紅列表）；否則歸「小幅略過」只計數。
  //   單看絕對值→大銷量小比例誤差洗版；單看比例→小銷量±1 洗版；兩條件並用才穩（已用 2606 真檔驗：−19/30%、−18/67%、−8/80% 留、−2/22%、−2/5% 濾掉）。
  const allRev=inter.filter(s=>s1103.skus[s].ord < qtyMap[s]).map(s=>({sku:s, ord:s1103.skus[s].ord, qty:qtyMap[s], gap:qtyMap[s]-s1103.skus[s].ord}))
    .sort((a,b)=>b.gap-a.gap);   // 反向差距大的排前面（最需要查的先看）
  const reversed=allRev.filter(r=>r.gap>3 && (r.gap/r.qty)>0.05);   // 顯著反向
  const reversedMinorN=allRev.length-reversed.length;              // 小幅反向筆數（差距≤3 或 ≤5%）
  return {
    inter:inter.length,
    onlyRank:[...rankSet].filter(s=>!qtySet.has(s)).length,
    onlyC1105:[...qtySet].filter(s=>!rankSet.has(s)).length,
    interOrd:inter.reduce((a,s)=>a+s1103.skus[s].ord,0),
    interQty:inter.reduce((a,s)=>a+qtyMap[s],0),
    reversed, reversedMinorN, source: source||''
  };
}
// 對帳單「摘要頁 PDF」文字 → 12 項費用 + A/C/E/G + 實際應付。label-based（攤平換行、靠項目名不靠行順序，容忍左右兩欄交錯 + 月份項數不固定）。
//   自我驗收：Σ12費用==E 且 A含稅+C含稅−E+G==實際應付（A+C-E+G 用含稅欄）。任一不符 valid=false + errors。
const MOMO_FEE_LABELS=['行銷贊助金','耗材/派工/運費','物流費用-第三方物流','活動贊助金(網路)','分攤包裝材料費','銷售獎勵金','遲延罰款','物流費用-超商取貨','寄倉分攤運費','寄倉倉租費(EC)','平台服務費','付費報表訂閱'];
function momoParseReconcileSummary(rawText){
  const t=String(rawText||'').replace(/\s+/g,' ');
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const parseN=s=>(s==null||s==='')?null:parseFloat(String(s).replace(/,/g,''));
  const numAfter=label=>{ const m=t.match(new RegExp(esc(label)+'\\s*(-?[\\d,]+)')); return m?parseN(m[1]):null; };
  const errors=[];
  const pm=t.match(/對帳區間\s*(\d{4})\/(\d{2})\/\d{2}/); const period=pm?pm[1]+'-'+pm[2]:null;
  const reconNo=(t.match(/對帳號碼\s*(\d+)/)||[])[1]||null;
  const aM=t.match(/開發票金額\(應稅\)\s*A\s*(-?[\d,]+)\s+(-?[\d,]+)\s+(-?[\d,]+)/);
  const cM=t.match(/折讓單金額\(應稅\)\s*C\s*(-?[\d,]+)\s+(-?[\d,]+)\s+(-?[\d,]+)/);
  const A=aM?{untax:parseN(aM[1]),tax:parseN(aM[2]),incl:parseN(aM[3])}:null;
  const C=cM?{untax:parseN(cM[1]),tax:parseN(cM[2]),incl:parseN(cM[3])}:{untax:0,tax:0,incl:0};
  // 其他訂單（廠訴請賠等，非每月有）：摘要頁是獨立 A 行「其他訂單 未稅 稅 含稅」（請分別開立）→ 併入 A 供 formula 驗收
  const oM=t.match(/其他訂單\s*(-?[\d,]+)\s+(-?[\d,]+)\s+(-?[\d,]+)/);
  const other=oM?{untax:parseN(oM[1]),tax:parseN(oM[2]),incl:parseN(oM[3])}:{untax:0,tax:0,incl:0};
  const fees={}; let feeSum=0;
  MOMO_FEE_LABELS.forEach(l=>{ const v=numAfter(l); if(v!=null){ fees[l]=v; feeSum+=v; } });
  const eM=t.match(/各項費用及罰則\s*總計\s*E\s*(-?[\d,]+)/); const E=eM?parseN(eM[1]):null;
  const holdPrev=numAfter('前期保留款(+)'), holdCur=numAfter('本期保留款(-)');
  const gM=t.match(/保留款總計\s*G[^-\d]*(-?[\d,]+)/); const G=gM?parseN(gM[1]):null;
  const pM=t.match(/實際應付貴公司金額\s*\(A\+C-E\+G\)\s*(-?[\d,]+)/); const payable=pM?parseN(pM[1]):null;
  const feesSumOk = E!=null && Math.abs(feeSum-E)<=1;
  const formulaOk = !!A && payable!=null && G!=null && Math.abs((A.incl+other.incl+(C?C.incl:0)-E+G)-payable)<=1;
  if(!feesSumOk) errors.push('Σ12費用('+feeSum+')≠E('+E+')');
  if(!formulaOk) errors.push('A含稅+其他+C含稅−E+G≠實際應付');
  return {period, reconNo, A, C, other, fees, feeSum, E, hold:{prev:holdPrev,cur:holdCur,G}, payable, valid:{feesSumOk,formulaOk,all:feesSumOk&&formulaOk}, errors};
}
function momoSplitRevenueToPeriods(monthRevUntax, c1105RevByPeriod){
  const keys=Object.keys(c1105RevByPeriod||{});
  const total=keys.reduce((s,p)=>s+(c1105RevByPeriod[p]||0),0);
  const out={};
  if(total>0) keys.forEach(p=>{ out[p]=monthRevUntax*(c1105RevByPeriod[p]/total); });
  return {byPeriod:out, splittable:total>0};
}
// 瀏覽器抽 PDF 文字層（pdf.js CDN；只月對帳用）。多方法：優先 pdfjsLib，退回 window['pdfjs-dist/build/pdf']。
async function momoReadPdfText(file){
  const lib=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
  if(!lib) throw new Error('pdf.js 尚未載入（請硬重整；或該月改用手動輸入）');
  try{ lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }catch{}
  const buf=await file.arrayBuffer();
  const doc=await lib.getDocument({data:buf}).promise;
  let text='';
  for(let i=1;i<=doc.numPages;i++){ const pg=await doc.getPage(i); const tc=await pg.getTextContent(); text+=tc.items.map(it=>it.str).join(' ')+'\n'; }
  return text;
}
// ── 階段二：月對帳 UI（獨立子分頁）。上傳 對帳單明細.xls(營收) + 摘要.pdf(12費用)，交叉核對對帳號碼，重現驗收值 ──
let _momoReconMonth='';           // 選中的對帳月（YYYY-MM）
let _momoReconStage={xls:null, pdf:null, xlsName:'', pdfName:''};
function momoReconMonthOptions(){ const out=[]; for(let y=2026,m=1;(y<2026)||(m<=12);m++){ out.push(`2026-${String(m).padStart(2,'0')}`); } return out; }
function momoRenderRecon(shop){
  const c=document.getElementById('momo-sub-content-'+shop); if(!c) return;
  if(!_momoReconMonth) _momoReconMonth='2026-06';
  const opts=momoReconMonthOptions().map(m=>`<option value="${m}"${m===_momoReconMonth?' selected':''}>${m}</option>`).join('');
  const stat=f=>f?'<span class="mm-ok">✓ '+_momoEsc(f)+'</span>':'<span class="mm-muted">未選</span>';
  const ready=_momoReconStage.xls&&_momoReconStage.pdf;
  c.innerHTML=`
    <div class="mm-note" style="background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:10px 12px;margin-bottom:14px">
      上傳當月供應商對帳單，交叉核對並重現 MOMO 實際應付金額<br>
      Excel 提供逐 SKU 營收，PDF 提供 12 項費用
    </div>
    <div style="margin-bottom:12px">
      <div class="mm-uprow"><div class="mm-uplbl">對帳年月</div><div class="mm-upctl"><select class="mm-sel" onchange="momoReconSetMonth(this.value)">${opts}</select></div></div>
      <div class="mm-uprow"><div class="mm-uplbl">供應商對帳單-Excel <span class="mm-code">C1101</span><span class="req">*必要</span><div class="mm-hint">逐 SKU 營收、對帳數量、客退、保留款</div></div><div class="mm-upctl"><input type="file" accept=".xls,.xlsx" onchange="momoReconPick(event,'xls','${shop}')">${stat(_momoReconStage.xlsName)}</div></div>
      <div class="mm-uprow"><div class="mm-uplbl">供應商對帳單-PDF <span class="mm-code">C1101</span><span class="req">*必要</span><div class="mm-hint">12 項費用、A/C/E/G、實際應付</div></div><div class="mm-upctl"><input type="file" accept=".pdf" onchange="momoReconPick(event,'pdf','${shop}')">${stat(_momoReconStage.pdfName)}</div></div>
    </div>
    <button class="mm-btn-primary" onclick="momoReconGenerate('${shop}')" ${ready?'':'disabled'}>▶ 產生對帳</button>
    <div id="momo-recon-report" style="margin-top:12px"></div>
    <details style="margin-top:16px"><summary style="cursor:pointer;font-size:12px;color:#6b7280;font-weight:600;user-select:none">▸ 費用組成說明（點開）</summary>${momoFeeExplainerHTML()}</details>`;
}
// 階段四：甲配運費上傳區塊（月對帳頁底部；C1105 + C1202第三方/超商 → 逐SKU出貨形狀）
function momoReconSetMonth(m){ _momoReconMonth=m; }
function momoReconPick(e,kind,shop){ const f=(e.target.files||[])[0]; if(f){ _momoReconStage[kind]=f; _momoReconStage[kind+'Name']=f.name; } e.target.value=''; momoRenderRecon(shop); }
async function momoReconGenerate(shop){
  const el=document.getElementById('momo-recon-report'); if(el) el.innerHTML='<div style="color:#9ca3af;font-size:13px">解析中…</div>';
  try{
    const wb=await momoReadWorkbook(_momoReconStage.xls);
    const main=wb.sheet('訂單貨款')||wb.firstSheet();
    const other=wb.names.includes('其他訂單')?wb.sheet('其他訂單'):null;
    const detail=momoParseReconcile(main, other);
    const pdfText=await momoReadPdfText(_momoReconStage.pdf);
    const summ=momoParseReconcileSummary(pdfText);
    momoRenderReconReport(shop, detail, summ);
  }catch(err){ if(el) el.innerHTML='<div style="color:#dc2626;font-size:13px">解析失敗：'+_momoEsc(err&&err.message||err)+'<br>（PDF 抽取失敗時，可改走手動輸入 — 後續版本開放）</div>'; }
}
function momoRenderReconReport(shop, detail, summ){
  const el=document.getElementById('momo-recon-report'); if(!el) return;
  const n=v=>v==null?'—':momoMoney(v);
  // 交叉核對：xls 的甲乙 A vs pdf 的 A；月份 vs 選的對帳月
  const xlsA=(detail.meta.revUntax.甲配||0)+(detail.meta.revUntax.乙配||0);
  const aMatch=summ.A&&Math.abs(xlsA+ (detail.meta.otherUntax||0) - summ.A.untax)<=2;
  const monthMatch=summ.period===_momoReconMonth;
  const okColor=b=>b?'#10b981':'#dc2626';
  const feeRows=MOMO_FEE_LABELS.filter(l=>summ.fees[l]!=null).map(l=>`<tr><td class="l">${l}</td><td class="num">${n(summ.fees[l])}</td></tr>`).join('');
  el.innerHTML=`
    <div class="mm-recon-h">對帳結果 — ${_momoReconMonth}</div>
    <div class="mm-recon-box">
      對帳號碼 <b>${_momoEsc(summ.reconNo||'?')}</b>　對帳區間月 <b style="color:${okColor(monthMatch)}">${summ.period||'?'}</b> ${monthMatch?'✓':'⚠與所選月不符'}<br>
      A(未稅營收)：xls甲乙合計 <b>${n(xlsA)}</b>${detail.meta.otherUntax?'+其他'+n(detail.meta.otherUntax):''} vs pdf A <b>${n(summ.A&&summ.A.untax)}</b> <span style="color:${okColor(aMatch)}">${aMatch?'✓ 一致':'⚠ 不一致'}</span><br>
      一般販售(甲配) ${n(detail.meta.revUntax.甲配)}　寄倉販售(乙配) ${n(detail.meta.revUntax.乙配)}
    </div>
    <div class="mm-recon-cols">
      <div class="mm-recon-col">
        <div class="h">12 項費用（總計 E = ${n(summ.E)}）</div>
        <table class="mm-recon-tbl"><tbody>${feeRows}</tbody></table>
      </div>
      <div class="mm-recon-col">
        <div class="h">終極驗收（A+C−E+G）</div>
        <table class="mm-recon-tbl"><tbody>
          <tr><td class="l">A 含稅${summ.other&&summ.other.incl?'（+其他 '+n(summ.other.incl)+'）':''}</td><td class="num">${n(summ.A&&summ.A.incl)}</td></tr>
          <tr><td class="l">C 含稅（折讓）</td><td class="num">${n(summ.C&&summ.C.incl)}</td></tr>
          <tr><td class="l">E 費用總計</td><td class="num">−${n(summ.E)}</td></tr>
          <tr><td class="l">保留款 G（前期 ${n(summ.hold&&summ.hold.prev)} / 本期 −${n(summ.hold&&summ.hold.cur)}）</td><td class="num">${n(summ.hold&&summ.hold.G)}</td></tr>
          <tr><td class="l"><b>momo 實際應付</b></td><td class="num"><b>${n(summ.payable)}</b></td></tr>
        </tbody></table>
        <div class="mm-selfcheck" style="background:${summ.valid.all?'#ecfdf5':'#fef2f2'};color:${summ.valid.all?'#065f46':'#991b1b'}">
          自驗：Σ12費用==E ${summ.valid.feesSumOk?'✓':'✗'}　A+C−E+G==實際應付 ${summ.valid.formulaOk?'✓':'✗'}${summ.errors.length?'<br>'+summ.errors.map(_momoEsc).join('；'):''}</div>
      </div>
    </div>
    <div class="mm-row" style="margin-top:12px">
      <button onclick="momoReconStore('${shop}')" ${summ.valid.all?'':'disabled'} class="mm-btn-primary" style="${summ.valid.all?'background:#10b981':''}">存本月對帳（${summ.valid.all?'自驗通過':'自驗未過，先查'}）</button>
      <span class="mm-hint">存後按「☁ 同步雲端」上雲（momo_reconcile）</span>
    </div>`;
  window.__momoReconLast={detail, summ, month:_momoReconMonth};
}
function momoReconStore(shop){
  const L=window.__momoReconLast; if(!L||!L.summ.valid.all){ alert('自驗未過，不存'); return; }
  // 每 shop 存該賣場的逐SKU（detail.byShop[shop]）+ 該月摘要（summ，兩賣場共用月費用）
  ['甲配','乙配'].forEach(s=>{ momoSaveReconcile(s, L.month, { month:L.month, reconNo:L.summ.reconNo, skus:L.detail.byShop[s]||{}, summary:L.summ, savedShop:s }); });
  momoClearFeeRateCache();   // 總表下次重繪即吃到這份對帳單（該月轉「已對帳」權威）
  if(typeof showToast==='function') showToast('已存 '+L.month+' 月對帳（甲配+乙配，記得按 ☁ 同步雲端）','success');
}
// ═══ 階段四：甲配物流 SKU 層分攤（獨立 freight key，不寫 cell → 繞過 1b-5 compact 防呆）═══
//   對帳單物流總額(權威) × C1202 出貨形狀(訂編 join)；period 內按 R-share 錨定物流 total 再按形狀重分配 → 月總/期別總不變。
function momoFreightKey(shop,month){ return 'ec_momo_freight|'+shop+'|'+month; }
function momoLoadFreight(shop,month){ const k=momoFreightKey(shop,month);
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]) return Store._mem[k]; }catch{}
  try{ const l=localStorage.getItem(k); if(l) return JSON.parse(l); }catch{}
  return null; }
function momoSaveFreight(shop,month,data){ const k=momoFreightKey(shop,month);
  try{ localStorage.setItem(k,JSON.stringify(data)); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Store._profitMem[k]=data; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Store._mem[k]=data; }catch{} }
// 從 C1105 + C1202(第三方+超商) 建甲配逐SKU逐期別出貨運費（reuse 既有解析：訂編 join、排除非「出貨」列）
// 對帳單甲配物流總額(第三方+超商)未稅（÷1.05）
function momoLogisticsJiaTotalUntax(month){ const rec=momoLoadReconcile('甲配',month); const f=(rec&&rec.summary&&rec.summary.fees)||{}; return ((f['物流費用-第三方物流']||0)+(f['物流費用-超商取貨']||0))/1.05; }
// 甲配物流分攤 context（月級）：logiTotal + feeRate + shopRev + otherRate + freight。無對帳單或無運費 → null（總表退回營收攤）。
function momoMonthFreightInfo(shop, month){
  if(shop!=='甲配') return null;   // 乙配後做（寄倉分攤含回收，另設計）
  const ck='__frt|'+shop+'|'+month;
  if(ck in _momoFeeRateCache) return _momoFeeRateCache[ck];
  let info=null;
  try{
    const fi=momoMonthFeeInfo(shop, month);
    const fr=momoLoadFreight(shop, month);
    if(fi && fi.reconciled && fi.shopRev>0 && fr && fr.freight && Object.keys(fr.freight).length){
      const logi=momoLogisticsJiaTotalUntax(month);
      const 甲配總費用=fi.shopRev*fi.feeRate;
      info={ reconciled:true, logiTotal:logi, feeRate:fi.feeRate, shopRev:fi.shopRev,
             otherRate:(甲配總費用-logi)/fi.shopRev, freight:fr.freight, unmatched:fr.unmatched||0 };
    }
  }catch(e){}
  _momoFeeRateCache[ck]=info;
  return info;
}
function momoFeeExplainerHTML(){
  const rows=[
    ['銷售獎勵金','3%','比例'],
    ['活動贊助金','3%','比例'],
    ['平台服務費','0.5%','比例'],
    ['行銷贊助金','0.3%','比例'],
    ['物流-第三方','對帳單','分攤'],
    ['物流-超商','對帳單','分攤'],
    ['寄倉分攤運費','對帳單','分攤'],
    ['寄倉倉租費','對帳單','估算'],
    ['分攤包裝材料費','對帳單','估算'],
    ['耗材/派工/運費','對帳單','估算'],
    ['遲延罰款','對帳單','攤入'],
    ['付費報表訂閱','對帳單','攤入'],
  ];
  const tone={'比例':'#2563eb','分攤':'#059669','估算':'#d97706','攤入':'#059669'};
  const tr=rows.map(([a,b,c])=>`<tr><td class="l">${a}</td><td class="r" style="color:#374151">${b}</td><td class="l" style="color:${tone[c]||'#374151'};font-weight:600">${c}</td></tr>`).join('');
  return `<div style="margin-top:14px;max-width:460px">
    <table class="mm-fee-tbl">
      <thead><tr><th class="l">項目</th><th class="r">費率/來源</th><th class="l">處理</th></tr></thead>
      <tbody>${tr}</tbody>
    </table>
    <div class="mm-note" style="margin-top:8px;line-height:2">
      12 項全部按營收比例攤入單品（月加總 = 對帳單 E）<br>
      營收＝未稅進價 × 對帳數量　淨利＝營收 − 費用 − 成本
    </div>
  </div>`;
}

// ── §3 期別工具 ──
function momoAllPeriods(shop){
  const set=new Set();
  momoLoadProducts(shop).forEach(p=>{ if(p.periods) Object.keys(p.periods).forEach(k=>{ if(/^\d{4}-\d{2}-H[12]$/.test(k)) set.add(k); }); });   // 濾掉髒 key，免得下拉標成正常月份跟真的混淆
  // 整月：每個有半月資料的月份補一個 YYYY-MM-FULL（精確，不估算；半月才是估算切分）。排在該月兩個半月之後。
  const months=new Set([...set].map(k=>k.slice(0,7)));
  months.forEach(mo=>set.add(mo+'-FULL'));
  return [...set].sort((a,b)=>{   // 先月份，再 H1<H2<FULL（FULL 排半月後）
    const ma=a.slice(0,7), mb=b.slice(0,7);
    if(ma!==mb) return ma<mb?-1:1;
    const ord=s=>s.endsWith('H1')?0:s.endsWith('H2')?1:2;
    return ord(a)-ord(b);
  });
}
// 上線首月：更早的月份只有零星跨月訂單、資料不完整 → 不列入期別下拉（純隱藏選項）。
//   ⚠ 底層資料原樣保留、momoAllPeriods 仍回傳、彙總/整月照算；只有下拉選項與環比基準受此邊界影響。
const MOMO_FIRST_PERIOD='2026-01';
// 下拉可見的月份清單（YYYY-MM，>= 上線首月，去重排序）。給分段期別控制的「月」選單與預設期別用。
function momoVisibleMonths(shop){
  return [...new Set(momoAllPeriods(shop).filter(k=>k.slice(0,7)>=MOMO_FIRST_PERIOD).map(k=>k.slice(0,7)))].sort();
}
// FULL → 該月的 H1+H2 期別鍵（給彙總展開用）；非 FULL 原樣單鍵回傳
function momoExpandPeriod(period){
  if(!period) return [];
  if(period.endsWith('-FULL')){ const mo=period.slice(0,7); return [mo+'-H1', mo+'-H2']; }
  return [period];
}
function momoPeriodLabel(period){
  const [,m,half]=period.split('-');
  return `${Number(m)}月${half==='FULL'?'整月':half==='H1'?'上':'下'}`;
}
// MOMO 共用金額格式：$ 緊貼數字、千分位逗號、四捨五入到元、負數用 -$。我們只有台幣，去掉多餘的 NT；保留 $ 好跟數量欄位（銷量/瀏覽量）並排時分得出哪個是錢。
//   全站設計統一時可沿用（見記憶 dashboard-design-unify）。⚠ 只用在整數金額（營收/毛利/費用/淨利）；成本等要保留小數的欄位不套（會被 round 掉）。
function momoMoney(v){ const n=Math.round(Number(v)||0); return (n<0?'-$':'$')+Math.abs(n).toLocaleString(); }
function momoOrderToPeriod(orderNo){   // 訂單編號前 6 碼 YYMMDD 判半月（拆掉 dash 後綴後取前 6，14 碼不影響）
  const prefix=String(orderNo).trim().split('-')[0];
  if(!/^\d{6}/.test(prefix)) return null;                 // 前 6 碼須純數字（擋 '#6...' 等髒列，不逐段 Number 以免寬鬆轉換）
  const yy=prefix.slice(0,2), mm=prefix.slice(2,4), dd=prefix.slice(4,6);
  const mn=Number(mm), dn=Number(dd);
  if(mn<1||mn>12||dn<1||dn>31) return null;                // mm 01-12、dd 01-31，明確排除 0
  return `20${yy}-${mm}-${dn<=15?'H1':'H2'}`;              // 拼 key 用原字串（保 "06" 不變 "6"）
}
// # COD 訂單的訂編非 YYMMDD 格式（momoOrderToPeriod 判不出）→ 用「訂單成立日」判期別的 fallback。
//   已用 6 檔 11,926 筆正常訂單驗證：訂編前6碼 100% == 訂單成立日、0 筆期別跨界，故 fallback 與主規則同軌、可靠。
function momoDateToPeriod(dateStr){
  const m=/(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(String(dateStr||''));
  if(!m) return null;
  const mn=+m[2], dn=+m[3];
  if(mn<1||mn>12||dn<1||dn>31) return null;
  return `${m[1]}-${String(mn).padStart(2,'0')}-${dn<=15?'H1':'H2'}`;
}
function momoChannelFromDeliveryType(t){
  if(t==='寄倉') return '乙配';
  if(t==='指定貨運'||t==='超商取貨') return '甲配';
  return null;
}

// ── 甲配/乙配 子分頁外殼（.stab 之外自帶樣式，避免干擾全域 tab active 機制）──
const MOMO_SUBTABS_JIA=[['總表','profit'],['批次維護','batch'],['商品同步','sync'],['訂單明細','upload'],['月對帳','recon'],['⟳重建','rebuild']];
const MOMO_SUBTABS_YI =[['總表','profit'],['批次維護','batch'],['商品同步','sync'],['訂單明細','upload'],['月對帳','recon'],['倉租費','rent'],['⟳重建','rebuild']];
const _momoSub={};          // shop -> 目前子分頁 id
const _momoPeriodSel={};    // shop -> 選中的期別 key（'' = 尚無資料）
const _momoSearch={};       // shop -> 搜尋字串
const _momoSort={};         // shop -> {col,dir}
const _momoShowDiscontinued={};   // shop -> 是否顯示已下架（預設 false=隱藏；模組變數，重整回預設，比照 search/sort）
// ── 共用搜尋框 helper（MOMO 框架）：input + 右側絕對定位清除 ✕。handler=全域函式名(shop,value)。設計統一那輪推廣全站。
function momoSearchBox(shop, id, value, placeholder, handler, wrapStyle){
  const esc=String(value==null?'':value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  return `<span class="mm-search-wrap"${wrapStyle?` style="${wrapStyle}"`:''}>
    <input id="${id}" class="mm-search-inp" type="text" placeholder="${placeholder}" value="${esc}" oninput="${handler}('${shop}',this.value);momoSearchClearToggle('${id}')">
    <span class="mm-search-clear" id="${id}__clr"${value?' style="display:flex"':''} title="清除" onclick="momoSearchClear('${id}','${handler}','${shop}')">✕</span>
  </span>`;
}
function momoSearchClearToggle(id){ const i=document.getElementById(id), c=document.getElementById(id+'__clr'); if(i&&c) c.style.display=i.value?'flex':'none'; }
function momoSearchClear(id,handler,shop){ const i=document.getElementById(id); if(i)i.value=''; if(typeof window[handler]==='function') window[handler](shop,''); momoSearchClearToggle(id); if(i)i.focus(); }
function momoRenderShop(shop){
  const el=document.getElementById('momo-content-'+shop);
  if(!el) return;
  const subs=shop==='乙配'?MOMO_SUBTABS_YI:MOMO_SUBTABS_JIA;
  if(!_momoSub[shop]) _momoSub[shop]='profit';
  const pills=subs.map(([label,id])=>{
    const on=_momoSub[shop]===id;
    return `<button onclick="momoSetSub('${shop}','${id}')" style="padding:5px 14px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid ${on?'#e4007f':'#e5e7eb'};background:${on?'#e4007f':'#fff'};color:${on?'#fff':'#6b7280'}">${label}</button>`;
  }).join('');
  el.innerHTML=`
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;align-items:center">${pills}
      <button id="momo-sync-btn-${shop}" onclick="momoOpenSyncPreview('${shop}')" style="margin-left:auto;padding:5px 14px;border-radius:7px;font-size:13px;font-weight:600;border:1px solid #e5e7eb;background:#fff;color:#6b7280">☁ 同步雲端</button>
    </div>
    <div id="momo-sub-content-${shop}"></div>`;
  momoRenderSub(shop);
  momoRefreshSyncBtn(shop);   // 依 pending 筆數點亮/淡灰
}
function momoSetSub(shop,id){ _momoSub[shop]=id; momoRenderShop(shop); }
function momoRenderSub(shop){
  const c=document.getElementById('momo-sub-content-'+shop);
  if(!c) return;
  const sub=_momoSub[shop]||'profit';
  if(sub==='profit'){ c.innerHTML=momoProfitTableHTML(shop); momoRenderProfitBody(shop); return; }
  if(sub==='batch'){ momoRenderBatch(shop); return; }
  if(sub==='upload'){ momoRenderUpload(shop); return; }
  if(sub==='sync'){ momoRenderProductSync(shop); return; }
  if(sub==='rent'){ momoRenderRent(shop); return; }
  if(sub==='recon'){ momoRenderRecon(shop); return; }
  if(sub==='rebuild'){ momoRenderRebuild(shop); return; }
  const names={batch:'批次維護',upload:'訂單明細',sync:'商品資料同步',rent:'倉租費彙總',recon:'月對帳',rebuild:'全期別重建'};
  c.innerHTML=`<div class="empty"><div class="empty-icon">🚧</div><div class="empty-hint">「${names[sub]||sub}」建置中（後續階段開放）</div></div>`;
}

// ── MOMO 同步鈕（甲配/乙配 pill 列最右）+ 同步預覽視窗 ──
//   #header-kpi-row（全域鈕所在）在 MOMO 頁被隱藏，MOMO 需自備入口；此鈕呼叫預覽 → 確認 → 全域 syncToCloud。
// 唯讀待同步計數（只給 MOMO 同步鈕決定亮/暗用）：只數 key，不 mutate _pendingSyncKeys、不回填 Store、不 parse value。
// ⚠️ 這裡的白名單前綴必須跟 _sweepAllLocalReportsIntoPending()（本檔搜 `function _sweepAllLocalReportsIntoPending`）
//    保持一致——那邊改了前綴，這邊也要一起改，否則鈕亮暗會跟實際會推的對不上。
function _momoSyncPendingCount(){
  const keys=new Set();
  // (1) 這個 session 已 _markPending 的（排除 marker / _summary_v1，比照 _realPendingCount）
  _pendingSyncKeys.forEach(k=>{ if(k.startsWith('__shop__|'))return; if(k==='_summary_v1')return; keys.add(k); });
  // (2) localStorage 裡符合 sweep 白名單前綴的——重整後 session 標記已清空，靠這個撐起亮暗（只讀 key 名，不 parse value）
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i); if(!k) continue;
      if(k.startsWith('ec_momo_products|') || k==='ec_momo_rent_records' || k.startsWith('ec_momo_reconcile|') || k.startsWith('ec_momo_freight|') || k.startsWith('ec_momo_s1103|') || k.startsWith('ec_momo_optlog|') || k==='ec_momo_cost_by_origin'
         || (k.startsWith('ec|') && !k.startsWith('ec|filemeta|'))) keys.add(k);
    }
  }catch{}
  return keys.size;
}
function momoRefreshSyncBtn(shop){
  shop=shop||curMomoShop;
  const btn=document.getElementById('momo-sync-btn-'+shop);
  if(!btn) return;
  const has=_momoSyncPendingCount()>0;   // 唯讀估算，只決定亮/暗；真正筆數在預覽視窗（真 sweep 算的）
  if(has){ btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';btn.style.background='#f59e0b';btn.style.color='#fff';btn.style.borderColor='#f59e0b'; }
  else   { btn.disabled=true; btn.style.opacity='0.4';btn.style.cursor='default';btn.style.background='#fff';btn.style.color='#6b7280';btn.style.borderColor='#e5e7eb'; }
  btn.textContent='☁ 同步雲端';           // 不顯示筆數（避免估算數字與預覽對不上）
}
function _momoCount(v){ return Array.isArray(v)?v.length : (v&&typeof v==='object')?Object.keys(v).length : (v==null?0:1); }
// 穩定序列化（排序物件 key）→ 比對「內容是否不同」不受 Firestore 回來的 key 順序影響，零 key-order 誤報
function _momoStableStr(v){
  if(v===null||typeof v!=='object') return JSON.stringify(v);
  if(Array.isArray(v)) return '['+v.map(_momoStableStr).join(',')+']';
  return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+_momoStableStr(v[k])).join(',')+'}';
}
// 差異明細（本機 vs 雲端）：陣列(products)按 sku、物件(reconcile)按欄位。回 {total, samples:[{item,field,local,cloud}] 前20}。
//   通用診斷——任何一筆 diff 都能直接看出「哪個 SKU/欄位、本機值 vs 雲端值」，不用再猜。
function _momoNorm(v){ try{ return JSON.parse(JSON.stringify(v===undefined?null:v)); }catch(e){ return v; } }
function _momoRepr(v){ const s=(v!==null&&typeof v==='object')?JSON.stringify(v):String(v); return s.length>120?s.slice(0,120)+'…':s; }   // tooltip 全值（截 120）
// 人話描述變化：陣列講筆數差(+多出的 date)、物件講「內容不同」、純值講「X → Y」（截短）；不倒整串 raw JSON
function _momoDescChange(a,b){
  if(Array.isArray(a)||Array.isArray(b)){
    const A=Array.isArray(a)?a:[], B=Array.isArray(b)?b:[];
    if(A.length!==B.length){ const key=x=>(x&&x.date)||_momoStableStr(_momoNorm(x)); const more=A.length>B.length?A:B, lessSet=new Set((A.length>B.length?B:A).map(key)); const dates=more.filter(x=>!lessSet.has(key(x))).map(x=>x&&x.date).filter(Boolean); const who=A.length>B.length?'本機':'雲端'; return `本機 ${A.length} 筆 / 雲端 ${B.length} 筆（${who}多 ${Math.abs(A.length-B.length)} 筆${dates.length?'：'+dates.slice(0,3).join('、'):''}）`; }
    return `各 ${A.length} 筆、內容不同`;
  }
  if((a&&typeof a==='object')||(b&&typeof b==='object')) return '物件內容不同';
  const sv=v=>{ const s=String(v); return s.length>24?s.slice(0,24)+'…':s; };
  return `${sv(a)} → ${sv(b)}`;
}
function momoDiffDetail(local, cloud){
  const eqF=(a,b)=>_momoStableStr(_momoNorm(a))===_momoStableStr(_momoNorm(b));
  const fieldDiffs=(a,b,label,cap)=>{ const out=[]; const keys=[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])]; for(const k of keys){ const av=a?a[k]:undefined, bv=b?b[k]:undefined; if(!eqF(av,bv)){ out.push({item:label, field:k, desc:_momoDescChange(av,bv), local:_momoRepr(av), cloud:_momoRepr(bv)}); if(out.length>=cap) break; } } return out; };
  const samples=[]; let total=0;
  if(Array.isArray(local)||Array.isArray(cloud)){
    const idx=arr=>{ const m=new Map(); (arr||[]).forEach(x=>{ if(x&&x.sku!=null) m.set(String(x.sku),x); }); return m; };
    const lm=idx(local), cm=idx(cloud); const allSku=[...new Set([...lm.keys(),...cm.keys()])];
    for(const sku of allSku){ const a=lm.get(sku), b=cm.get(sku); if(eqF(a,b)) continue; total++;
      if(samples.length<20){ if(!a) samples.push({item:sku,field:'(整筆)',desc:'雲端有、本機缺'}); else if(!b) samples.push({item:sku,field:'(整筆)',desc:'本機有、雲端缺'}); else fieldDiffs(a,b,sku,3).forEach(d=>{ if(samples.length<20)samples.push(d); }); }
    }
  } else {
    const fd=fieldDiffs(local,cloud,'(欄位)',999); total=fd.length; samples.push(...fd.slice(0,20));
  }
  return {total, samples};
}
// 收集「這次同步實際會推的 key」——與 syncToCloud 同源：先跑同一個 sweep，再讀同一個 _pendingSyncKeys。
//   絕不自己掃 localStorage（會漏掉 session 內標過、不在 sweep 白名單的 key → 預覽騙人）。
function _momoCollectPending(shop){
  _sweepAllLocalReportsIntoPending();          // 與 syncToCloud:458 同一個函式，冪等
  const items=[], seen=new Set();
  const add=(key,kind,val)=>{ if(seen.has(key))return; seen.add(key); items.push({key,kind,localVal:val,localCount:_momoCount(val)}); };
  // syncToCloud 開頭那兩條 shop 專屬 extra（465-469）：MOMO 賣場通常為空
  try{ const s=state[shop]; const _nk=shop+'|'+((s&&s.curMonth)||'')+'|'+((s&&s.curHalf)||''); const notes=getNotes(_nk); if(notes&&Object.keys(notes).length>0) add('ec_notes|'+_nk,'其他設定',notes); }catch{}
  try{ const edits=getEdits(shop); if(edits&&Object.keys(edits).length>0) add('ec_edits|'+shop,'其他設定',edits); }catch{}
  _pendingSyncKeys.forEach(pk=>{
    if(pk.startsWith('__shop__|')) return;               // marker，不推
    if(pk.startsWith('ec|filemeta|')) return;            // 故意不上雲
    if(pk.startsWith('ec|')){ add(pk,'蝦皮報表', Store._profitMem&&Store._profitMem[pk]); return; }   // → setReport（profits collection）
    let val=null;
    if(pk.startsWith('ec_momo_products|')){ val=momoPendingProducts(pk); }   // 與同步推送同源（_mem→localStorage），保證預覽比對的==推的
    else { try{ if(Store._mem&&Store._mem[pk]!==undefined) val=Store._mem[pk]; }catch{}
      if(val===null){ try{ const raw=localStorage.getItem(pk); if(raw) val=JSON.parse(raw); }catch{} } }
    const kind = pk.startsWith('ec_momo_products|')?'MOMO商品主檔' : pk==='ec_momo_rent_records'?'MOMO倉租費' : pk.startsWith('ec_momo_reconcile|')?'MOMO月對帳' : pk.startsWith('ec_momo_freight|')?'MOMO運費' : pk.startsWith('ec_momo_s1103|')?'MOMO排行榜' : pk==='ec_momo_cost_by_origin'?'MOMO成本表' : '其他設定';
    add(pk,kind,val);
  });
  return items;
}
async function momoOpenSyncPreview(shop){
  if(!window.__cloudProfit){
    if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'雲端未連線',message:'雲端尚未就緒，請重新整理後再同步。',kind:'warn'});
    else if(typeof showToast==='function') showToast('雲端未連線','error');
    return;
  }
  const items=_momoCollectPending(shop);
  let cloud={};
  try{ const snap=await window.__cloudProfit.getDoc(); cloud=snap.exists()?(snap.data()||{}):{}; }
  catch(e){ const m=(e&&e.message)||String(e); if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'讀取雲端失敗',message:'無法讀取雲端現況，請稍後再試。',detail:m,kind:'error'}); else if(typeof showToast==='function') showToast('讀取雲端失敗','error'); return; }
  // MOMO 商品主檔改讀 momo_products collection（每賣場一 doc），與寫入 __cloudMomo.setShop 同源；
  //   併發 getDoc（只讀真正 pending 的賣場）→ 延遲≈一次來回；沿用已在 READ_OK 白名單的 getDoc，不動防護碼。
  //   cloud doc 是 { shop, items:[...] }，取 .items 比對（不是整個 doc）。單一賣場讀失敗只標該列無法比對，不讓整個預覽掛掉。
  const momoCloud={};   // 'ec_momo_products|<shop>' → { items:[...]|undefined } 或 { error:true }
  const momoItems=items.filter(it=>it.kind==='MOMO商品主檔');
  if(momoItems.length && window.__cloudMomo){
    const pfx='ec_momo_products|';
    const momoShops=[...new Set(momoItems.map(it=>it.key.slice(pfx.length)))];
    await Promise.all(momoShops.map(async sh=>{
      const key=pfx+sh;
      try{ const s=await window.__cloudMomo.getDoc(sh); momoCloud[key]= s.exists()?{items:((s.data()&&s.data().items)||[])}:{items:undefined}; }
      catch(e){ momoCloud[key]={error:true}; }
    }));
  }
  // 🔴 月對帳讀 momo_reconcile collection（與寫入 __cloudReconcile.setMonth 同源）——舊碼讀 app/profit doc（那裡根本沒有）→ 雲端永遠 0/「新」。
  const reconCloud={};   // 'ec_momo_reconcile|shop|month' → docData|undefined 或 {__error:true}
  const reconItems=items.filter(it=>it.kind==='MOMO月對帳');
  if(reconItems.length && window.__cloudReconcile){
    await Promise.all(reconItems.map(async it=>{
      const parts=it.key.split('|');   // ['ec_momo_reconcile', shop, 'YYYY-MM']
      try{ const s=await window.__cloudReconcile.getDoc(parts[1], parts[2]); reconCloud[it.key]= s.exists()?(s.data()||{}):undefined; }
      catch(e){ reconCloud[it.key]={__error:true}; }
    }));
  }
  // 內容比對：兩邊都先過 JSON round-trip 正規化（strip undefined、統一型別）→ 消除 Firestore 回來與本機的假差異（undefined 被丟、數字/字串）。
  const _norm=v=>{ try{ return JSON.parse(JSON.stringify(v===undefined?null:v)); }catch(e){ return v; } };
  const _eq=(a,b)=>_momoStableStr(_norm(a))===_momoStableStr(_norm(b));
  items.forEach(it=>{
    if(it.kind==='蝦皮報表'){ it.status='uncomparable'; it.cloudCount=null; return; }   // 不同 collection（profits），app/profit 讀不到
    if(it.kind==='MOMO商品主檔'){
      const mc=momoCloud[it.key];
      if(!mc || mc.error){ it.status='readfail'; it.cloudCount=null; return; }   // __cloudMomo 缺 / 該賣場讀失敗 → 不掛掉整個預覽，單列標無法比對
      const cItems=mc.items; it._cloudVal=cItems;
      if(cItems===undefined){ it.status='new'; it.cloudCount=0; }
      else { it.cloudCount=_momoCount(cItems); it.status=_eq(it.localVal,cItems)?'same':'diff'; }
      return;
    }
    if(it.kind==='MOMO月對帳'){
      const rc=reconCloud[it.key];
      if(rc&&rc.__error){ it.status='readfail'; it.cloudCount=null; return; }
      if(rc===undefined){ it.status='new'; it.cloudCount=0; return; }
      it._cloudVal=rc; it.cloudCount=_momoCount(rc); it.status=_eq(it.localVal,rc)?'same':'diff';
      return;
    }
    const cv=cloud[it.key]; it._cloudVal=cv;
    if(cv===undefined){ it.status='new'; it.cloudCount=0; }
    else { it.cloudCount=_momoCount(cv); it.status=_eq(it.localVal,cv)?'same':'diff'; }
  });
  // 差異明細掛到每筆 diff item（modal 顯示 + 報告都用）
  items.forEach(it=>{ if(it.status==='diff'){ try{ it.diff=momoDiffDetail(it.localVal, it._cloudVal); }catch(e){ it.diffErr=String(e&&e.message||e); } } });
  // #3：把這次預覽的比對快照 + 差異明細寫進 __lastSyncReport（MOMO 同步先前完全沒診斷輸出）。confirm 後 syncToCloud 會再覆寫成 'done'。
  try{ window.__lastSyncReport={ ts:Date.now(), mode:'momo-preview', shop, items:items.map(it=>({key:it.key,kind:it.kind,localCount:it.localCount,cloudCount:it.cloudCount,status:it.status,diff:it.diff,diffErr:it.diffErr})) }; }catch(e){}
  momoRenderSyncPreviewModal(shop, items);
}
function momoRenderSyncPreviewModal(shop, items){
  let ov=document.getElementById('momo-sync-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='momo-sync-overlay'; document.body.appendChild(ov); }
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.onclick=e=>{ if(e.target===ov) momoCloseSyncPreview(); };
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const typeColor={'MOMO商品主檔':'#5b5fcf','MOMO倉租費':'#0ea5e9','蝦皮報表':'#e4007f','其他設定':'#9ca3af'};
  const statusCell=it=>{
    if(it.status==='new')    return `<span style="color:#10b981;font-weight:600">新增</span>`;
    if(it.status==='same')   return `<span style="color:#9ca3af">無變更</span>`;
    if(it.status==='uncomparable') return `<span style="color:#9ca3af">無法比對（不同 collection）</span>`;
    if(it.status==='readfail') return `<span style="color:#d97706">無法比對（雲端讀取失敗，仍會整包覆蓋）</span>`;
    const cnt=(it.cloudCount!==it.localCount)?`（雲端 ${it.cloudCount} / 本機 ${it.localCount} 筆）`:'';
    return `<span style="color:#9a3412;font-weight:600" title="推了會用本機整包覆蓋雲端${cnt}">內容不同</span>`;
  };
  const anyDiff=items.some(it=>it.status==='diff');
  // 差異明細（diff item）：預設收合，摘要一行「N 筆不同 · 展開」；明細講變化(陣列講筆數)不倒 JSON；全值在 title tooltip
  const diffHtml=it=>{ const d=it.diff; if(!d||!d.samples||!d.samples.length) return it.diffErr?`<div class="mm-sync-diff">差異明細計算失敗：${esc(it.diffErr)}</div>`:'';
    const ss=d.samples.map(s=>`<div class="mm-sync-diff-row"${(s.local!=null||s.cloud!=null)?` title="本機：${esc(String(s.local))}　|　雲端：${esc(String(s.cloud))}"`:''}>· <b>${esc(String(s.item))}</b>${(s.field&&s.field!=='(整筆)')?' · '+esc(s.field):''}：${esc(s.desc||'')}</div>`).join('');
    return `<details class="mm-sync-diff"><summary>${d.total} 筆不同 · 展開</summary>${ss}${d.total>d.samples.length?`<div style="color:#9ca3af;margin-top:2px">（僅列前 ${d.samples.length}）</div>`:''}</details>`; };
  // 逐列 HTML；checked=預設是否勾選（有變更→勾、無變更→不勾）
  const rowHtml=(it,checked)=>`<tr style="border-top:1px solid #f3f4f6">
      <td style="padding:6px 4px;text-align:center"><input type="checkbox" class="mm-sync-chk" data-key="${esc(it.key)}" ${checked?'checked':''} onchange="momoSyncUpdateCount()"></td>
      <td style="padding:6px 8px;font-family:monospace;word-break:break-all">${esc(it.key)}</td>
      <td style="padding:6px 8px;color:${typeColor[it.kind]||'#6b7280'};font-weight:600;white-space:nowrap">${it.kind}</td>
      <td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums">${it.localCount}</td>
      <td style="padding:6px 8px;text-align:right;font-variant-numeric:tabular-nums">${it.cloudCount==null?'—':it.cloudCount}</td>
      <td style="padding:6px 8px">${statusCell(it)}${it.status==='diff'?diffHtml(it):''}</td>
    </tr>`;
  const changed=items.filter(it=>it.status!=='same'), unchanged=items.filter(it=>it.status==='same');   // 只有 changed 需要你決定
  const theadHtml=`<thead><tr style="text-align:left;color:#6b7280;font-weight:600">
      <th style="padding:6px 4px;text-align:center"><input type="checkbox" id="mm-sync-all" checked onchange="momoSyncToggleAll(this.checked)"></th>
      <th style="padding:6px 8px">資料 key</th><th style="padding:6px 8px">類型</th><th style="padding:6px 8px;text-align:right">本機</th><th style="padding:6px 8px;text-align:right">雲端</th><th style="padding:6px 8px">狀態 / 差異</th>
    </tr></thead>`;
  const mainHtml = changed.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px">${theadHtml}<tbody id="mm-sync-main-body">${changed.map(it=>rowHtml(it,true)).join('')}</tbody></table>`
    : `<div style="padding:18px;text-align:center;color:#9ca3af;font-size:13px">目前沒有需要同步的項目${unchanged.length?`（另有 ${unchanged.length} 項無變更）`:''}</div>`;
  const unchangedHtml = unchanged.length
    ? `<details class="mm-sync-unchanged"><summary>另有 ${unchanged.length} 項無變更 · 展開（預設不推，可個別勾）</summary><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px"><tbody>${unchanged.map(it=>rowHtml(it,false)).join('')}</tbody></table></details>`
    : '';
  ov.innerHTML=`<div style="background:#fff;border-radius:12px;max-width:820px;width:100%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.25)">
    <div style="padding:16px 20px;border-bottom:1px solid #eef0f2;font-size:15px;font-weight:700">同步預覽 — 勾選要推送到雲端的項目</div>
    <div style="padding:12px 20px;overflow:auto">
      <div style="font-size:12px;color:#6b7280;margin-bottom:10px;line-height:1.6">只列出<b>有變更</b>（新增／內容不同）的項目，預設全勾；無變更的收在下方。<b>勾選推送的會用本機整包覆蓋雲端（無版本比對、系統無法判斷誰新）</b>，請確認不會蓋掉同事的更新。</div>
      ${anyDiff?`<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#9a3412;line-height:1.6">⚠️ 有項目<b>內容不同</b>——點該列「展開」看差在哪個 SKU/欄位，確認是你要覆蓋的再保持勾選。</div>`:''}
      ${mainHtml}
      ${unchangedHtml}
    </div>
    <div style="padding:14px 20px;border-top:1px solid #eef0f2;display:flex;gap:10px;justify-content:flex-end">
      <button onclick="momoCloseSyncPreview()" style="padding:7px 16px;border-radius:7px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:13px;cursor:pointer">取消</button>
      <button id="mm-sync-confirm-btn" onclick="momoConfirmSync('${shop}')" ${changed.length?'':'disabled'} style="padding:7px 18px;border-radius:7px;border:none;background:${changed.length?'#10b981':'#c7c9e6'};color:#fff;font-size:13px;font-weight:600;cursor:${changed.length?'pointer':'default'}">確認同步${changed.length?'（'+changed.length+' 項）':''}</button>
    </div>
  </div>`;
}
function momoSyncToggleAll(checked){ document.querySelectorAll('#mm-sync-main-body .mm-sync-chk').forEach(c=>{c.checked=checked;}); momoSyncUpdateCount(); }   // 全選只作用在「有變更」主表
function momoSyncUpdateCount(){
  const n=[...document.querySelectorAll('.mm-sync-chk')].filter(c=>c.checked).length;   // 按鈕計數=實際會推的（含展開後手勾的無變更項）
  const btn=document.getElementById('mm-sync-confirm-btn'); if(btn){ btn.disabled=(n===0); btn.textContent='確認同步'+(n?'（'+n+' 項）':''); btn.style.background=n?'#10b981':'#c7c9e6'; btn.style.cursor=n?'pointer':'default'; }
  const main=[...document.querySelectorAll('#mm-sync-main-body .mm-sync-chk')], mn=main.filter(c=>c.checked).length;
  const all=document.getElementById('mm-sync-all'); if(all){ all.checked=(main.length>0&&mn===main.length); all.indeterminate=(mn>0&&mn<main.length); }
}
function momoCloseSyncPreview(){ const ov=document.getElementById('momo-sync-overlay'); if(ov) ov.remove(); }
function momoConfirmSync(shop){
  const keys=[...document.querySelectorAll('.mm-sync-chk')].filter(c=>c.checked).map(c=>c.getAttribute('data-key'));
  momoCloseSyncPreview();
  if(!keys.length){ if(typeof momoRefreshSyncBtn==='function') momoRefreshSyncBtn(shop); return; }
  Promise.resolve(syncToCloud(shop, new Set(keys))).then(()=>momoRefreshSyncBtn(shop)).catch(()=>momoRefreshSyncBtn(shop));   // 只推選中的 key
}

// ── 畫面一：商品獲利總表（甲配/乙配共用）──
// 預設順序（品號固定首欄、不進欄位選單）：進價 / 售價 / 瀏覽量 / 成交率 / 本期銷量 / 營收 / 毛利率 / 毛利貢獻 / 退貨率。
//   欄寬存 sessionStorage、綁「欄位名(k)」不綁索引 → 重排不錯位（見 momoColW / momoColResizeDrag）。
const MOMO_PROFIT_COLS=[
  {k:'name',label:'品號 / 商品',left:true,w:320,fixed:true},
  {k:'ppUntax',label:'進價',fmt:'money',w:100,info:'未稅進價（＝含稅進價 ÷ 1.05）。淨利表營收＝未稅進價 × 對帳數量，是所有毛利/淨利計算的基準。'},
  {k:'salePrice',label:'售價',fmt:'money',w:100},
  {k:'view',label:'瀏覽量',fmt:'num',w:96,info:'S1103 銷售排行榜（熱銷）當期瀏覽量。沒進榜的商品顯示空白（無資料）。'},
  {k:'qty',label:'本期銷量',fmt:'num',w:100},
  {k:'convRate',label:'成交率',fmt:'pct1',w:96,info:'訂購數 ÷ 瀏覽量（S1103）。進榜但瀏覽量=0 顯示「—」；沒進榜顯示空白。低成交率＝看了不買。'},
  {k:'revenue',label:'營收',fmt:'money',w:120},
  {k:'margin',label:'毛利率',fmt:'pct1',w:100,info:'用商品「目前」成本計算，非當期歷史成本；檢視過去月份時用現在成本回算。'},
  {k:'profit',label:'毛利貢獻',fmt:'money',w:120,info:'用商品「目前」成本計算，非當期歷史成本；檢視過去月份時用現在成本回算。'},
  {k:'returnRate',label:'退貨率',fmt:'pct1',w:96,info:'客退數量 ÷ 賣出數量（賣出=對帳數量+客退數量），來源=對帳單逐SKU、月顆粒。未對帳月顯示「—」。hover 看退貨件數/金額。'},
];
// 總表欄寬：sessionStorage 記憶（撐過 F5、不佔 localStorage）；拖曳 th 右緣把手調整
function momoColW(shop, colKey, def){ return momoUiW('col|'+shop+'|'+colKey, def); }
function momoColResizeDrag(ev, shop, colKey){
  ev.preventDefault(); ev.stopPropagation();
  const tbl=ev.target.closest('table'); if(!tbl) return;
  const cols=momoDisplayCols(shop);                          // ⚠ 用「目前顯示的欄」找 colgroup 索引，不是靜態 MOMO_PROFIT_COLS，否則重排/隱藏後會拖錯欄
  const idx=cols.findIndex(c=>c.k===colKey); if(idx<0) return;
  const col=tbl.querySelectorAll('colgroup col')[idx]; if(!col) return;
  const startX=ev.clientX, startW=parseInt(col.style.width)||cols[idx].w;
  const move=e=>{ let w=Math.max(60, startW+(e.clientX-startX)); col.style.width=w+'px'; col.dataset.w=w; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); if(col.dataset.w) momoUiWSet('col|'+shop+'|'+colKey, col.dataset.w); };   // 存 key（欄名），重排後仍對得上
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up);
}
// ── 總表欄位管理：顯示/隱藏 + 拖曳排序。存 localStorage（本機記憶、不上雲；key 不在 sync 白名單前綴內）。品號(name)固定首欄、永遠顯示、不進選單。
const _MOMO_COLCFG_LS='momo_cols|';   // + shop（每賣場各自一份，甲/乙/MO+ 欄位可不同）
function momoColDefKeys(){ return MOMO_PROFIT_COLS.filter(c=>!c.fixed).map(c=>c.k); }   // 非固定欄的預設順序（= 陣列宣告順序）
function momoLoadColCfg(shop){
  let cfg={order:momoColDefKeys(), hidden:[]};
  try{ const raw=localStorage.getItem(_MOMO_COLCFG_LS+shop); if(raw){ const o=JSON.parse(raw);
    if(o&&Array.isArray(o.order)) cfg.order=o.order.slice();
    if(o&&Array.isArray(o.hidden)) cfg.hidden=o.hidden.slice();
  } }catch(e){}
  const defk=momoColDefKeys();
  cfg.order=cfg.order.filter(k=>defk.includes(k));               // 濾掉已不存在的殘鍵
  defk.forEach(k=>{ if(!cfg.order.includes(k)) cfg.order.push(k); });   // 新增的欄（如「進價」）補到尾端，舊 cfg 不會漏
  return cfg;
}
function momoSaveColCfg(shop,cfg){ try{ localStorage.setItem(_MOMO_COLCFG_LS+shop, JSON.stringify({order:cfg.order, hidden:cfg.hidden})); }catch(e){} }
// 目前要顯示的欄位定義：品號永遠第一 + 依 cfg.order 排、濾掉 hidden
function momoDisplayCols(shop){
  const cfg=momoLoadColCfg(shop);
  const byK=new Map(MOMO_PROFIT_COLS.map(c=>[c.k,c]));
  const hidden=new Set(cfg.hidden);
  const nameCol=MOMO_PROFIT_COLS.find(c=>c.fixed);
  const out=nameCol?[nameCol]:[];
  cfg.order.forEach(k=>{ if(byK.has(k)&&!hidden.has(k)) out.push(byK.get(k)); });
  return out;
}
// 欄位選單（外觀/互動沿用蝦皮那顆的 col-picker CSS；但這是 MOMO 自己的一份，完全不動同事的蝦皮程式）
let _momoColDrag=null;
function momoColToggle(shop,key){ const cfg=momoLoadColCfg(shop); const h=new Set(cfg.hidden); if(h.has(key))h.delete(key);else h.add(key); cfg.hidden=[...h]; momoSaveColCfg(shop,cfg); momoRenderProfitBody(shop,true); momoRenderColPicker(shop); }
function momoColDragStart(e,shop,key){ _momoColDrag={shop,key}; e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',key);}catch{} e.currentTarget.classList.add('cp-row-dragging'); }
function momoColDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; }
function momoColDragEnter(e){ e.preventDefault(); e.currentTarget.classList.add('cp-row-drag-over'); }
function momoColDragLeave(e){ e.currentTarget.classList.remove('cp-row-drag-over'); }
function momoColDrop(e,shop,targetKey){
  e.preventDefault(); const row=e.currentTarget; row.classList.remove('cp-row-drag-over');
  if(!_momoColDrag||_momoColDrag.shop!==shop||_momoColDrag.key===targetKey){_momoColDrag=null;return;}
  const cfg=momoLoadColCfg(shop);
  const rect=row.getBoundingClientRect(); const after=(e.clientY-rect.top)>rect.height/2;
  let order=cfg.order.filter(k=>k!==_momoColDrag.key);
  let idx=order.indexOf(targetKey); if(idx<0)idx=order.length; else if(after)idx++;
  order.splice(idx,0,_momoColDrag.key);
  cfg.order=order; momoSaveColCfg(shop,cfg); _momoColDrag=null;
  momoRenderProfitBody(shop,true); momoRenderColPicker(shop);
}
function momoColDragEnd(e){ e.currentTarget.classList.remove('cp-row-dragging'); document.querySelectorAll('.cp-row-drag-over').forEach(el=>el.classList.remove('cp-row-drag-over')); }
function momoColResetOrder(shop){ try{localStorage.removeItem(_MOMO_COLCFG_LS+shop);}catch{} momoRenderProfitBody(shop,true); momoRenderColPicker(shop); }
function momoColShowAll(shop){ const cfg=momoLoadColCfg(shop); cfg.hidden=[]; momoSaveColCfg(shop,cfg); momoRenderProfitBody(shop,true); momoRenderColPicker(shop); }
function momoRenderColPicker(shop){
  const m=document.getElementById('momo-colpick-'+shop); if(!m) return;
  const cfg=momoLoadColCfg(shop); const hidden=new Set(cfg.hidden);
  const byK=new Map(MOMO_PROFIT_COLS.map(c=>[c.k,c]));
  const cols=cfg.order.map(k=>byK.get(k)).filter(Boolean);
  const vis=cols.filter(c=>!hidden.has(c.k)).length;
  m.innerHTML=`<div style="padding:6px 13px 4px;font-size:11px;color:#9ca3af;font-weight:700;display:flex;justify-content:space-between;align-items:center">欄位 <span>${vis}/${cols.length}</span></div>`
    +cols.map(c=>`<div class="cp-row" draggable="true"
      ondragstart="momoColDragStart(event,'${shop}','${c.k}')" ondragover="momoColDragOver(event)"
      ondragenter="momoColDragEnter(event)" ondragleave="momoColDragLeave(event)"
      ondrop="momoColDrop(event,'${shop}','${c.k}')" ondragend="momoColDragEnd(event)"
      onclick="momoColToggle('${shop}','${c.k}');event.stopPropagation()">
      <span class="cp-row-handle">⠿</span>
      <input type="checkbox" ${!hidden.has(c.k)?'checked':''} style="margin:0;pointer-events:none"> ${c.label}
    </div>`).join('')
    +`<div style="padding:4px 13px 6px;border-top:1px solid #e5e7eb;text-align:right;display:flex;gap:10px;justify-content:flex-end">
      <button onclick="momoColResetOrder('${shop}')" style="font-size:11px;color:#5b5fcf;background:none;border:none;cursor:pointer;font-weight:600">重設順序</button>
      <button onclick="momoColShowAll('${shop}')" style="font-size:11px;color:#5b5fcf;background:none;border:none;cursor:pointer;font-weight:600">顯示全部</button>
    </div>`;
}
function momoOpenColPicker(shop,btn){
  let m=document.getElementById('momo-colpick-'+shop);
  if(m){ m.remove(); return; }   // 再點一次關閉
  m=document.createElement('div'); m.id='momo-colpick-'+shop; m.className='col-picker-menu open';
  const wrap=btn&&btn.closest('.col-picker-wrap');
  (wrap||(btn&&btn.parentElement)||document.body).appendChild(m);
  momoRenderColPicker(shop);
  setTimeout(()=>document.addEventListener('click',function h(e){ if(!m.contains(e.target)){ m.remove(); document.removeEventListener('click',h); } }),0);   // 點外面關閉（延後掛避免這次點擊立刻觸發）
}
try{ localStorage.removeItem('ec_momo_hint_colw'); }catch(e){}   // 一次性提示已移除，清掉舊 flag 不留在 localStorage
function momoProfitTableHTML(shop){
  const allP=momoAllPeriods(shop);
  const months=momoVisibleMonths(shop);   // >= 上線首月的月份（下拉只列這些；更早的跨月零星訂單隱藏但仍計入計算）
  // 預設期別＝最新「有資料」月份的整月（即使尚未對帳也照顯示，未對帳由 statusBanner 標🟡估算）。
  //   只要目前選值不在「可見期別」集合（含 undefined/空/已過期/被邊界隱藏的舊月）就重設，避免卡在空期別顯示 0。
  //   例：七月完全沒傳→落 6月整月；七月只傳 C1105（對帳單未到）→落 7月整月並標估算。
  const visibleKeys=new Set(allP.filter(k=>k.slice(0,7)>=MOMO_FIRST_PERIOD));
  if(!visibleKeys.has(_momoPeriodSel[shop])){
    _momoPeriodSel[shop]= months.length ? months[months.length-1]+'-FULL' : '';
  }
  const curMo=(_momoPeriodSel[shop]||'').slice(0,7);
  const curHalf=(/-(H1|H2|FULL)$/.exec(_momoPeriodSel[shop]||'')||[])[1]||'FULL';
  // 分段期別控制：月下拉 + 上/下/整月 三段按鈕（取代原本每月三項、越長越長的單一長下拉）。
  //   年份併進月標籤（目前只有 2026，不另開單選年下拉徒增點擊）。某半月無資料→該段 disabled。
  const monthOpts=months.length
    ? months.map(mo=>`<option value="${mo}"${mo===curMo?' selected':''}>${mo.slice(0,4)}/${+mo.slice(5,7)}</option>`).join('')
    : `<option value="">尚無期別資料</option>`;
  const segBtns=months.length
    ? [['上','H1'],['下','H2'],['整月','FULL']].map(([lbl,h])=>{
        const exists = h==='FULL' || allP.includes(curMo+'-'+h);   // FULL 恆有（有半月就補）；H1/H2 視資料
        return `<button class="mm-seg${curHalf===h?' on':''}"${exists?'':' disabled'} onclick="momoSetPeriodHalf('${shop}','${h}')">${lbl}</button>`;
      }).join('')
    : '';
  const q=(_momoSearch[shop]||'').replace(/"/g,'&quot;');
  const total=momoLoadProducts(shop).length;
  const discCount=momoLoadProducts(shop).filter(p=>p.discontinued===true).length;   // 當前主檔已下架筆數
  const activeCount=total-discCount;
  const showDisc=!!_momoShowDiscontinued[shop];
  const discToggle=discCount>0
    ? `<button class="mm-chip${showDisc?' on':''}" style="${showDisc?'background:#5b5fcf;border-color:#5b5fcf':''}" onclick="momoToggleDiscontinued('${shop}')">${showDisc?'隱藏已下架':'顯示已下架（'+discCount+'）'}</button>`
    : '';
  // 版面：期別控制 + 總覽卡片留在上方；搜尋列這一整格移到表格正上方（跟它作用的對象貼在一起）。
  //   搜尋框放在「殼」(本函式) 而非 momo-tbl，才不會每敲一鍵就被重繪掉焦點（momoOnSearch 只重繪表格）。
  return `
    <div class="mm-row" style="margin-bottom:10px">
      <span class="mm-field"><span class="mm-lbl">期別</span><select class="mm-sel" onchange="momoSetPeriodMonth('${shop}',this.value)">${monthOpts}</select><span class="mm-seg-grp">${segBtns}</span></span>
      <span id="momo-status-${shop}" class="mm-field"></span>
    </div>
    <div id="momo-ov-${shop}"></div>
    <div class="mm-row" id="momo-toolbar-${shop}" style="margin:14px 0 8px;gap:18px">
      ${momoSearchBox(shop, 'momo-search-'+shop, _momoSearch[shop]||'', '搜尋 品號 / 名稱 / 原廠編號', 'momoOnSearch', 'flex:1;min-width:180px;max-width:320px')}
      <span class="mm-stat"><span class="mm-stat-item">總<b>${total}</b></span><span class="mm-stat-item">上架<b>${activeCount}</b></span><span class="mm-stat-item">下架<b>${discCount}</b></span></span>
      ${discToggle}
      <span class="col-picker-wrap" style="position:relative;margin-left:auto">
        <button class="mm-chip" onclick="momoOpenColPicker('${shop}',this)">☰ 欄位</button>
      </span>
    </div>
    <div id="momo-tbl-${shop}"></div>`;
}
function momoSetPeriod(shop,val){ _momoPeriodSel[shop]=val; momoRenderProfitBody(shop); }
// 分段控制：換月保留目前的 上/下/整月 段；若新月沒那個半月則退回整月。重繪整個 profit 子內容以更新下拉+段高亮+段 disabled。
function momoSetPeriodMonth(shop,mo){
  if(!mo) return;
  const half=(/-(H1|H2|FULL)$/.exec(_momoPeriodSel[shop]||'')||[])[1]||'FULL';
  const use = (half!=='FULL' && !momoAllPeriods(shop).includes(mo+'-'+half)) ? 'FULL' : half;
  _momoPeriodSel[shop]=mo+'-'+use;
  const c=document.getElementById('momo-sub-content-'+shop);
  if(c){ c.innerHTML=momoProfitTableHTML(shop); momoRenderProfitBody(shop); }
}
function momoSetPeriodHalf(shop,half){
  const mo=(_momoPeriodSel[shop]||'').slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(mo)) return;
  _momoPeriodSel[shop]=mo+'-'+half;
  const c=document.getElementById('momo-sub-content-'+shop);
  if(c){ c.innerHTML=momoProfitTableHTML(shop); momoRenderProfitBody(shop); }
}
function momoOnSearch(shop,val){ _momoSearch[shop]=val; momoRenderProfitBody(shop,true); }   // 只重繪表格，搜尋框在殼裡不動→不掉焦點
// 切換顯示/隱藏已下架：重繪整個 profit 子內容（連按鈕標籤一起更新；search/period/sort 狀態都在模組變數裡，重繪會保留）
function momoToggleDiscontinued(shop){
  _momoShowDiscontinued[shop]=!_momoShowDiscontinued[shop];
  const c=document.getElementById('momo-sub-content-'+shop);
  if(c){ c.innerHTML=momoProfitTableHTML(shop); momoRenderProfitBody(shop); }
}
function momoProfitSetSort(shop,col){
  const cur=_momoSort[shop];
  if(!cur||cur.col!==col)_momoSort[shop]={col,dir:'desc'};
  else if(cur.dir==='desc')_momoSort[shop]={col,dir:'asc'};
  else delete _momoSort[shop];
  momoRenderProfitBody(shop,true);   // 排序只動表格，總覽不變
}
// 環比：整月比上月整月、半月比上月同半月（跟蝦皮邏輯一致）
function momoPrevPeriodKey(periodKey){
  const m=/^(\d{4})-(\d{2})-(H1|H2|FULL)$/.exec(periodKey||''); if(!m) return '';
  let y=+m[1], mo=+m[2]-1; if(mo<1){ mo=12; y--; }
  return y+'-'+String(mo).padStart(2,'0')+'-'+m[3];
}
// 某期別的總覽合計（全商品、含已下架，反映該期實際生意；加權毛利率=Σ淨利÷Σ營收）
function momoPeriodTotals(shop, periodKey){
  if(!periodKey) return {hasData:false, rev:0, profit:0, qty:0, margin:0, missCost:0};
  const keys=momoExpandPeriod(periodKey);
  let rev=0, profit=0, qty=0, any=false, missCost=0, missCostDisc=0;   // missCost：該期有營收但缺成本 → 淨利虛高；Disc=其中已下架
  momoLoadProducts(shop).forEach(p=>{
    const a=momoAggregatePeriods(p, keys, shop);
    // 有營收就計入（含 qty=0 但對帳有金額的跨月結算 SKU；與總表逐列一致 → Σ營收=對帳單該店金額）
    const active = a.qty>0 || Math.abs(a.revenue)>0.5;
    if(active){ any=true; rev+=a.revenue; profit+=a.profit; qty+=a.qty; if(!(Number(p.cost)>0)){ missCost++; if(p.discontinued===true) missCostDisc++; } }
  });
  return { hasData:any, rev, profit, qty, margin:rev>0?(profit/rev)*100:0, missCost, missCostDisc };
}
function momoRenderProfitBody(shop, tableOnly){
  const tbl=document.getElementById('momo-tbl-'+shop);
  if(!tbl) return;
  const period=_momoPeriodSel[shop];
  const q=(_momoSearch[shop]||'').trim().toLowerCase();
  const all=momoLoadProducts(shop);
  momoClearFeeRateCache();   // 每次重繪清月費率快取 → 吃到最新對帳單（快取只在這一輪 1300 SKU 內共用）
  let rows=all.map(p=>{
    const agg=momoAggregatePeriods(p, period?momoExpandPeriod(period):[], shop);
    // ppUntax=未稅進價（含稅進價÷1.05）：進價欄顯示用、也可排序；淨利表營收基準口徑
    return { sku:p.sku||'', origin:p.origin||'', name:p.name||'', salePrice:p.salePrice||0, ppUntax:(Number(p.purchasePrice)||0)/1.05, discontinued:!!p.discontinued, ...agg };
  });
  // ═══ 階段四：甲配物流按 C1202 出貨形狀重分配（此時 rows=全商品，period 總和才正確）═══
  //   period 內錨定 物流total=logiTotal×(R_period/月R)、再按形狀分 → Σ甲配fee=甲配R×feeRate 不變（月總/期別總不動、逐SKU重分配）。
  let _freightMode='none';   // none=非甲配已對帳｜proportional=甲配已對帳但無運費(營收攤)｜precise=甲配訂編精算
  if(shop==='甲配' && period){
    const mo=String(period).slice(0,7);
    const frt=momoMonthFreightInfo(shop, mo);
    if(frt){
      _freightMode='proportional';
      const involved=rows.filter(r=>(r.revenue>0.5||r.qty>0));
      const R_period=involved.reduce((s,r)=>s+(r.revenue||0),0);
      const shape_period=involved.reduce((s,r)=>s+(r.skuFreightPeriod||0),0);
      const logiPeriod=frt.shopRev>0 ? frt.logiTotal*(R_period/frt.shopRev) : 0;
      if(shape_period>0){
        _freightMode='precise';
        involved.forEach(r=>{
          const 物流_i=logiPeriod*((r.skuFreightPeriod||0)/shape_period);
          const 其他_i=(r.revenue||0)*frt.otherRate;
          r.profit=(r.revenue||0)-物流_i-其他_i-(r.cost||0);
          // ⚠ 與 momoAggregatePeriods 的 margin 同款判斷：營收0但有毛利（整批退貨仍扣運費/成本）→ null（畫面「—」），不可回 0（會蓋掉 aggregate 算對的 null → 顯示誤導的 0%）。
          r.margin=r.revenue>0?(r.profit/r.revenue)*100:(Math.abs(r.profit)>0.5?null:0);
        });
      }
    }
  }
  window.__momoFreightMode=_freightMode;   // 供 banner 用
  // 搜尋時忽略「已下架」篩選（搜得到已下架商品，避免以為資料掉了）；沒搜尋時預設隱藏已下架
  let searchMatchedDisc=0;
  if(q){
    rows=rows.filter(r=>(r.sku+' '+r.name+' '+r.origin).toLowerCase().includes(q));
    searchMatchedDisc=rows.filter(r=>r.discontinued).length;
  }else if(!_momoShowDiscontinued[shop]){
    rows=rows.filter(r=>!r.discontinued);
  }
  const sort=_momoSort[shop]||{col:'revenue',dir:'desc'};   // 預設營收高→低（使用者點欄位可改；清除排序也回到這個預設）
  if(sort){
    rows.sort((a,b)=>{
      const va=a[sort.col], vb=b[sort.col];
      if(typeof va==='number'&&typeof vb==='number') return sort.dir==='asc'?va-vb:vb-va;
      return sort.dir==='asc'?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));
    });
  }
  const cols=momoDisplayCols(shop);   // 目前顯示的欄（含使用者排序/隱藏）；colgroup/thead/tbody/欄寬拖曳一律用這份
  const fmt={ money:v=>momoMoney(v), num:v=>Math.round(v).toLocaleString(), pct1:v=>(Math.round(v*10)/10)+'%' };
  const arrow=c=> sort&&sort.col===c ? (sort.dir==='asc'?' ▲':' ▼') : '';
  // 欄寬拖曳：colgroup 定寬（table-layout:fixed）+ 每個 th 右緣把手；寬度存 sessionStorage、綁欄名不綁索引
  const colgroup=`<colgroup>${cols.map(c=>`<col style="width:${momoColW(shop,c.k,c.w)}px">`).join('')}</colgroup>`;
  const thead=cols.map(c=>{
    const info=c.info?`<span class="mm-info" title="${c.info}" onclick="event.stopPropagation()">?</span>`:'';
    return `<th class="mm-th${c.left?' tl':''}" onclick="momoProfitSetSort('${shop}','${c.k}')" style="cursor:pointer;text-align:${c.left?'left':'right'}">${c.label}${info}${arrow(c.k)}<span class="mm-col-grip" onmousedown="momoColResizeDrag(event,'${shop}','${c.k}')" onclick="event.stopPropagation()"></span></th>`;
  }).join('');
  const tbody=rows.map(r=>{
    const tds=cols.map(c=>{
      if(c.k==='name'){
        const nmEsc=String(r.name||'').replace(/"/g,'&quot;');
        // 商品名截斷「跟著欄寬」(CSS：flex:1+min-width:0+ellipsis)，拉寬即見更多、拉滿見全名；hover title 顯示全名
        //   已下架標記移到第二行（穩定資訊，不受商品名長度截掉）
        const discTag=r.discontinued?` · <span style="color:#9ca3af;font-weight:600">已下架</span>`:'';
        return `<td class="tl"><div class="mm-name-wrap"><span class="mm-name-clip" title="${nmEsc}">${r.name||'—'}</span></div><div class="mm-sub-line">品號 ${r.sku||'—'}${r.origin?' · 原廠 '+r.origin:''}${discTag}</div></td>`;
      }
      if(c.k==='returnRate'){
        // 對帳單來源：未對帳=「—」；有值標退貨數/金額於 tooltip、月顆粒；>6% 橘
        if(r.returnRate==null) return `<td style="text-align:right;color:#c7cad1" title="此月未對帳，無退貨資料">—</td>`;
        const rr=r.returnRate;
        const tip=`退貨 ${Math.round(r.retQty||0)} 件 / ${momoMoney(r.retAmt||0)}（對帳單月值${(period&&!period.endsWith('-FULL'))?'，半月沿用月值':''}）\n退貨的商品成本已回沖（貨退回倉、之後再賣才認成本），故高退貨率不再被誇大成大賠；但出貨運費已付(不回沖)+可能耗損/重新入庫，高退貨率仍是警訊。`;
        let st='text-align:right;overflow:hidden;text-overflow:ellipsis'; if(rr>6) st+=';font-weight:700;color:#f97316';
        return `<td style="${st}" title="${tip}">${(Math.round(rr*10)/10)}%</td>`;
      }
      if(c.k==='view'){
        // S1103 瀏覽量：沒進榜=空白（無資料）；在榜但瀏覽0=「—」（S1103 缺漏，非 0 曝光——有銷量不可能 0 人看，跟退貨率當初全 0 同類誤導）；有值顯示
        if(r.view==null) return `<td style="text-align:right;color:#e5e7eb" title="此商品未進 S1103 熱銷榜（無瀏覽資料）"></td>`;
        if(r.view===0) return `<td style="text-align:right;color:#c7cad1" title="在榜但 S1103 未提供瀏覽量（資料缺漏，非 0 曝光）">—</td>`;
        return `<td style="text-align:right;overflow:hidden;text-overflow:ellipsis"${r.viewEstimated?' title="半月未下載，沿用整月 S1103 值（估算）"':''}>${Math.round(r.view).toLocaleString()}${r.viewEstimated?' <span style="color:#d97706;font-size:10px">估</span>':''}</td>`;
      }
      if(c.k==='convRate'){
        // 成交率：沒進榜=空白；進榜瀏覽0=「—」；否則 %。低成交(<2%)橘標(看了不買)
        if(r.convRate==null) return `<td style="text-align:right;color:#e5e7eb" title="未進 S1103 熱銷榜（無資料）"></td>`;
        if(r.convRate==='zerodiv') return `<td style="text-align:right;color:#c7cad1" title="進榜但瀏覽量=0，無法算成交率">—</td>`;
        const cr=r.convRate; let st='text-align:right;overflow:hidden;text-overflow:ellipsis'; if(cr<2) st+=';font-weight:700;color:#f97316';
        return `<td style="${st}" title="訂購 ${Math.round(r.s1103Ord||0)} ÷ 瀏覽 ${Math.round(r.view||0)}${r.viewEstimated?'（半月沿用整月·估算）':''}">${(Math.round(cr*10)/10)}%</td>`;
      }
      if(c.k==='margin'){
        // 營收0但有毛利（整批退貨）→ margin=null → 「—」，不顯示誤導的 0%；負毛利標紅（是負值，不是 0）
        if(r.margin==null) return `<td style="text-align:right;color:#c7cad1;font-weight:700" title="營收為 0（此期可能整批退貨）→ 毛利率無法計算">—</td>`;
        const m=r.margin;
        return `<td style="text-align:right;overflow:hidden;text-overflow:ellipsis;font-weight:700;color:${m>=25?'#10b981':(m<0?'#dc2626':'#374151')}">${(Math.round(m*10)/10)}%</td>`;
      }
      const v=r[c.k];
      const disp=c.fmt?fmt[c.fmt](v):v;
      let style='text-align:right;overflow:hidden;text-overflow:ellipsis';   // fixed layout：窄欄時裁切不外溢
      return `<td style="${style}">${disp}</td>`;
    }).join('');
    return `<tr onclick="momoOpenAnalysis('${shop}','${r.sku}')" style="cursor:pointer">${tds}</tr>`;   // 點列 → 單品分析 modal
  }).join('');
  const discHint=(q&&searchMatchedDisc>0)?`<div style="font-size:11px;color:#9ca3af;margin-bottom:8px">搜尋結果包含已下架商品（${searchMatchedDisc} 筆）</div>`:'';
  const tblMinW=cols.reduce((s,c)=>s+momoColW(shop,c.k,c.w),0);
  const tableHTML = rows.length
    ? `<div class="tscroll"><table style="table-layout:fixed;min-width:${tblMinW}px">${colgroup}<thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`
    : `<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">${all.length?'沒有符合搜尋的商品':'尚無商品資料，請到「批次維護」新增（後續階段開放）'}</div></div>`;
  // 總覽卡片 / 對帳狀態 / 自驗 只在「完整重繪」時算+注入 momo-ov（搜尋/排序 tableOnly 時不動 → 省算、也保住自驗收合狀態、搜尋框不掉焦點）
  if(!tableOnly){
    const isJiaYi=(shop==='甲配'||shop==='乙配');
    const mo = period?String(period).slice(0,7):'';
    const fi = (isJiaYi&&mo)?momoMonthFeeInfo(shop, mo):null;
    // 對帳狀態（甲乙）：已對帳→期別旁極簡小綠標；未對帳→灰標 + 短橫幅（費用估算來源 + 虛高警示不弱化）
    let statusBanner='', statusChip='';
    if(isJiaYi && period){
      if(fi&&fi.reconciled){
        statusChip=`<span class="mm-status ok" title="營收=對帳金額(未稅,已扣退貨)、費用=對帳單各項÷1.05 按營收攤">✓ 已對帳</span>`;
        if(shop==='甲配'){
          if(_freightMode==='precise') statusChip+=` <span class="mm-status ok" title="物流按 C1202 訂編逐SKU精算歸戶（退貨率高的商品吃到自己的運費）">🟢 物流精算</span>`;
          else statusChip+=` <span class="mm-status no" title="此月無 C1202 運費資料，物流仍按營收比例攤（估算）→ 到訂單明細上傳 C1202 升級">🟡 物流估算</span>`;
        } else if(shop==='乙配'){
          statusChip+=` <span class="mm-status no" title="乙配物流精算（C1204）為階段四待做項；目前物流併在對帳單 feeRate 按營收比例攤，SKU 歸屬不精確">🟡 物流估算</span>`;
        }
      } else {
        const h=momoHistoricalFeeRate(shop);
        statusChip=`<span class="mm-status no">⚠ 未對帳</span>`;
        const feeTxt=(h&&h.reliable)
          ? `費用用近 <b>${h.n}</b> 月均費率 <b>${(h.rate*100).toFixed(1)}%</b> 估算（σ${(h.sd*100).toFixed(1)}pp）`
          : `費用僅估 <b>6.8%</b>，<b>淨利偏高約 19pp</b>（歷史樣本不足）`;
        const hr=momoHistoricalReturnRate(shop);
        const costTxt=hr?`、成本按近 ${hr.n} 月均退貨率 <b>${(hr.rate*100).toFixed(1)}%</b> 估回沖（與已對帳月同基準）`:'、成本暫用出貨數量（無退貨率樣本可估）';
        statusBanner=`<div class="mm-banner mm-banner-warn">⚠ <b>未對帳</b>（${mo}）· 營收 C1105 暫估、${feeTxt}${costTxt} → 到「月對帳」上傳當月對帳單轉權威值</div>`;
      }
    }
    const stEl=document.getElementById('momo-status-'+shop); if(stEl) stEl.innerHTML=statusChip;
    const curT=momoPeriodTotals(shop, period);
    let prevKey=momoPrevPeriodKey(period);
    // 上線首月（含）之前只有零星跨月訂單、明顯不完整 → 不當環比基準：清空 prevKey 使環比顯示「—」而非誤導百分比。（2025/12 底層資料仍保留、不刪。）
    if(prevKey && prevKey.slice(0,7) < MOMO_FIRST_PERIOD) prevKey='';
    const prevT=momoPeriodTotals(shop, prevKey);
    // 自驗：驗證邏輯保留，但通過時「完全不顯示」（不留標記，省版面）；只有對不上才警示。
    let verifyBlock='';
    if(isJiaYi && fi && fi.reconciled && period.endsWith('-FULL')){
      const expect=fi.shopRev;   // 該店對帳金額未稅合計（非整帳號 A：甲配 521,538 / 乙配 65,101）
      const diff=curT.rev - expect;
      const ok=Math.abs(diff)<=Math.max(50, expect*0.001);
      verifyBlock = ok ? '' : `<div class="mm-verify-err">⚠ 整月 Σ營收 ${momoMoney(curT.rev)} ≠ 對帳單該店金額 ${momoMoney(expect)}（差 ${momoMoney(diff)}，主檔可能缺對帳單裡的品號）</div>`;
    }
    const overview=momoOverviewHTML(shop, period, curT, prevT, prevKey, verifyBlock);
    const ov=document.getElementById('momo-ov-'+shop); if(ov) ov.innerHTML=overview+statusBanner;
  }
  tbl.innerHTML=discHint+tableHTML;
}

/* ═══════════════ 單品分析 modal（待辦B）+ optimizationLog（待辦C）═══════════════
   點總表列 → 大 modal（總表不卸載，overlay 覆蓋；關閉即移除 overlay，期別/捲動自動保留）。
   標題放商品名；7 區塊：月銷量長條 / 瀏覽量‖銷量 / 成交均價線 / 毛利率折線(青=已對帳系統計算、灰=未對帳估算) /
   成本售價時間軸 / 優化紀錄 / 跨通路同 origin 並列。⚠ 成本仍當前值(momoEffectiveAt 未接)，毛利率折線圖上註記。 */
const _MOMO_CY='#0891b2';   // 青：已對帳（系統計算，可靠）
const _MOMO_GY='#9ca3af';   // 灰：未對帳（估算/搬遷歷史）
let _momoAnalysisCharts=[];  // 開啟中的 Chart 實例，關閉時 destroy

// optimizationLog 資料層：ec_momo_optlog|<shop> → { sku:[{date,type,note,linked?}] }（只存有紀錄的 SKU）。走 __cloudProfit.setField field 分支（EXPECT 7/12）。
function momoOptlogKey(shop){ return 'ec_momo_optlog|'+shop; }
function momoLoadOptlog(shop){ const k=momoOptlogKey(shop);
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]) return Store._mem[k]; }catch{}
  try{ const l=localStorage.getItem(k); if(l) return JSON.parse(l); }catch{}
  return {}; }
function momoSaveOptlog(shop,map){ const k=momoOptlogKey(shop);
  try{ localStorage.setItem(k,JSON.stringify(map)); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Store._profitMem[k]=map; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Store._mem[k]=map; }catch{}
  try{ _markPending(k); }catch{}   // 走既有 pending → 同步時 __cloudProfit.setField（field 分支）
}
const MOMO_OPTLOG_TYPES=['調價','調成本','下架','補貨','改運費','其他'];
function momoAddOptlog(shop,sku){
  const sel=document.getElementById('momo-optlog-type'), note=document.getElementById('momo-optlog-note');
  const type=sel?sel.value:'其他', txt=note?note.value.trim():'';
  if(!txt){ if(sel)sel.focus(); if(note){note.focus();note.style.borderColor='#dc2626';} return; }
  const map=momoLoadOptlog(shop); map[sku]=map[sku]||[];
  const by=(window.App&&window.App.currentUser&&window.App.currentUser.username)||'';
  // 預留接「工作日誌」欄位（見 memory momo-optlog-worklog-link）：軟連結靠 date+shop→負責人，硬連結/商品反查靠 id+sku。linked?:{field,from,to} 之後再加。
  map[sku].push({ id:'opt_'+Date.now()+'_'+Math.floor(Math.random()*100000), ...momoNowParts(), shop, sku, by, type, note:txt });
  momoSaveOptlog(shop,map);
  if(typeof momoRefreshSyncBtn==='function') momoRefreshSyncBtn(shop);
  momoRenderOptlogSection(shop,sku);   // 只重繪紀錄區塊，不動圖表
}
function momoDeleteOptlog(shop,sku,idx){
  const map=momoLoadOptlog(shop); if(!map[sku]) return;
  map[sku].splice(idx,1); if(!map[sku].length) delete map[sku];
  momoSaveOptlog(shop,map);
  if(typeof momoRefreshSyncBtn==='function') momoRefreshSyncBtn(shop);
  momoRenderOptlogSection(shop,sku);
}

// 逐月序列（13 個月上限，實際由 momoAllPeriods 決定）：qty/margin/reconciled + S1103 瀏覽/成交均價 + 半月完整度。
function momoSkuMonthly(shop,product){
  const months=[...new Set(momoAllPeriods(shop).map(k=>k.slice(0,7)))].sort();
  return months.map(mo=>{
    const agg=momoAggregatePeriods(product,[mo+'-H1',mo+'-H2'],shop);
    const sv=momoS1103ForPeriod(product.sku, mo+'-FULL');
    const inR=sv&&sv.inReport;
    const active = agg.qty>0 || Math.abs(agg.revenue)>0.5;   // 該月此商品有無生意
    return {
      mo, label:Number(mo.slice(5,7))+'月',
      qty:agg.qty, active,
      margin: active ? agg.margin : null,   // 沒生意的月份 → 毛利率不畫點（同總表「營收0顯示—」原則）
      reconciled:!!agg.reconciled,
      view: inR?sv.view:null, ord: inR?sv.ord:null,
      avgPrice: (inR&&sv.ord>0)?sv.amt/sv.ord:null,
      viewEst: !!(sv&&sv.estimated),
      half: momoMonthHalfState(mo)   // both / H1only / H2only（全站該月完整度）
    };
  });
}

function momoOpenAnalysis(shop,sku){
  const p=momoLoadProducts(shop).find(x=>x.sku===sku);
  if(!p){ if(typeof showToast==='function') showToast('找不到商品 '+sku,'error'); return; }
  let ov=document.getElementById('momo-analysis-overlay');
  if(!ov){ ov=document.createElement('div'); ov.id='momo-analysis-overlay'; document.body.appendChild(ov); }
  ov.className='ana-overlay open'; ov.style.cssText='position:fixed;inset:0;z-index:4000;background:rgba(15,23,42,.5);display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto';
  ov.onclick=e=>{ if(e.target===ov) momoCloseAnalysis(); };
  momoRenderAnalysis(shop,p);
}
function momoCloseAnalysis(){
  _momoAnalysisCharts.forEach(c=>{ try{ c.destroy(); }catch{} }); _momoAnalysisCharts=[];
  const ov=document.getElementById('momo-analysis-overlay'); if(ov) ov.remove();
  // 總表未卸載 → 期別/捲動位置自動保留，無需還原
}
function momoRenderAnalysis(shop,p){
  const ov=document.getElementById('momo-analysis-overlay'); if(!ov) return;
  const series=momoSkuMonthly(shop,p);
  const nmEsc=_momoEsc(p.name||p.sku);
  const disc=p.discontinued?` <span style="font-size:12px;color:#9ca3af;font-weight:600">· 已下架</span>`:'';
  const otherShop = shop==='甲配'?'乙配':'甲配';
  const partialMonths=series.filter(s=>s.active && s.half!=='both').map(s=>s.label);   // 只警告「此商品真的有生意」且該月僅半月資料的月份
  const viewPts=series.filter(s=>s.view!=null).length;    // 有效瀏覽量月數
  const pricePts=series.filter(s=>s.avgPrice!=null).length; // 有效成交均價月數
  const s1103Empty=`<div style="font-size:12px;color:#94a3b8;padding:16px;text-align:center;background:#f8fafc;border-radius:8px">僅 ${Math.max(viewPts,pricePts)} 個月有 S1103 資料，補上其他月份才看得出趨勢（回溯上傳各月 S1103 後自動出圖）。</div>`;
  ov.innerHTML=`<div style="background:#fff;border-radius:14px;max-width:900px;width:100%;box-shadow:0 16px 50px rgba(0,0,0,.3);overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid #eef0f2;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="min-width:0">
        <div style="font-size:16px;font-weight:800;color:#1e293b;line-height:1.35">${nmEsc}${disc}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px">品號 ${_momoEsc(p.sku)}${p.origin?' · 原廠 '+_momoEsc(p.origin):''} · ${shop}</div>
      </div>
      <button onclick="momoCloseAnalysis()" style="flex-shrink:0;width:32px;height:32px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#64748b;font-size:18px;cursor:pointer;line-height:1">✕</button>
    </div>
    <div style="padding:16px 20px;max-height:calc(100vh - 140px);overflow:auto">
      ${partialMonths.length?`<div style="font-size:11px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;padding:6px 10px;margin-bottom:12px">註：${partialMonths.join('、')} 只有半個月資料，該月長條/趨勢偏低是正常的（非銷量崩盤）。</div>`:''}

      <div class="mm-ana-sec"><div class="mm-ana-h">月銷量（件）</div>
        <div style="position:relative;height:180px"><canvas id="mm-ana-qty"></canvas></div></div>

      <div class="mm-ana-sec"><div class="mm-ana-h">瀏覽量 ‖ 銷量</div>
        ${viewPts>=2?`<div style="position:relative;height:180px"><canvas id="mm-ana-view"></canvas></div>`:s1103Empty}
        ${viewPts>=2&&series.some(s=>s.viewEst)?`<div style="font-size:11px;color:#d97706;margin-top:4px">部分月份瀏覽量為半月沿用整月的估算值（標「估」）。</div>`:''}
      </div>

      <div class="mm-ana-sec"><div class="mm-ana-h">成交均價（訂購金額 ÷ 訂購數）</div>
        ${pricePts>=2?`<div style="position:relative;height:150px"><canvas id="mm-ana-price"></canvas></div>`:s1103Empty}</div>

      <div class="mm-ana-sec"><div class="mm-ana-h">毛利率（%）　<span style="font-size:11px;font-weight:400;color:#94a3b8"><span style="color:${_MOMO_CY}">■</span> 青=已對帳(系統計算)　<span style="color:${_MOMO_GY}">■</span> 灰=未對帳(估算)</span></div>
        <div style="position:relative;height:160px"><canvas id="mm-ana-margin"></canvas></div>
        <div style="font-size:11px;color:#d97706;margin-top:4px">註：各月毛利率一律用商品「目前」成本回算（歷史成本尚未接 momoEffectiveAt）→ 不反映當月真實成本，看趨勢別看絕對值。</div></div>

      <div class="mm-ana-sec"><div class="mm-ana-h">成本 / 售價異動時間軸</div>${momoHistoryTimelineHTML(p)}</div>

      <div class="mm-ana-sec" id="momo-optlog-sec"></div>

      <div class="mm-ana-sec"><div class="mm-ana-h">跨通路關聯（同原廠編號）</div>${momoCrossChannelHTML(shop,otherShop,p)}</div>
    </div>
  </div>`;
  momoRenderOptlogSection(shop,p.sku);
  // 圖表（innerHTML 後同步建立；存實例供關閉時 destroy）
  _momoAnalysisCharts.forEach(c=>{ try{c.destroy();}catch{} }); _momoAnalysisCharts=[];
  if(typeof Chart==='undefined') return;
  const labels=series.map(s=>s.label);
  const barColor=series.map(s=>s.half==='both'?'#5b5fcf':'#c7d2fe');   // 半月月份淡色
  const qtyCv=document.getElementById('mm-ana-qty');
  if(qtyCv) _momoAnalysisCharts.push(new Chart(qtyCv.getContext('2d'),{ type:'bar',
    data:{labels,datasets:[{label:'月銷量',data:series.map(s=>s.qty),backgroundColor:barColor,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}} }));
  const viewCv=document.getElementById('mm-ana-view');
  if(viewCv) _momoAnalysisCharts.push(new Chart(viewCv.getContext('2d'),{ type:'bar',
    data:{labels,datasets:[
      {type:'bar',label:'銷量',data:series.map(s=>s.qty),backgroundColor:'#c7d2fe',borderRadius:4,yAxisID:'y'},
      {type:'bar',label:'瀏覽量',data:series.map(s=>s.view),backgroundColor:'#f59e0b',borderRadius:4,yAxisID:'y1'}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{
      y:{position:'left',beginAtZero:true,ticks:{precision:0},title:{display:true,text:'銷量'}},
      y1:{position:'right',beginAtZero:true,grid:{drawOnChartArea:false},title:{display:true,text:'瀏覽量'}}}} }));
  const priceCv=document.getElementById('mm-ana-price');
  if(priceCv) _momoAnalysisCharts.push(new Chart(priceCv.getContext('2d'),{ type:'line',
    data:{labels,datasets:[{label:'成交均價',data:series.map(s=>s.avgPrice),borderColor:'#10b981',backgroundColor:'#10b981',tension:.3,spanGaps:true,pointRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'$'+Math.round(v)}}}} }));
  const mgCv=document.getElementById('mm-ana-margin');
  if(mgCv) _momoAnalysisCharts.push(new Chart(mgCv.getContext('2d'),{ type:'line',
    data:{labels,datasets:[{label:'毛利率',data:series.map(s=>s.margin),
      borderColor:'#64748b',tension:.3,spanGaps:true,
      pointBackgroundColor:series.map(s=>s.reconciled?_MOMO_CY:_MOMO_GY),
      pointBorderColor:series.map(s=>s.reconciled?_MOMO_CY:_MOMO_GY),pointRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v+'%'}}}} }));
}
// 成本/售價異動時間軸（product.history；最後一筆=目前生效）
function momoHistoryTimelineHTML(p){
  const h=(p.history||[]);
  if(!h.length) return `<div style="font-size:12px;color:#94a3b8">尚無異動紀錄。</div>`;
  const rows=[...h].map((x,i)=>({...x,_i:i})).reverse();   // 新→舊
  const curIdx=h.length-1;
  return `<div style="max-height:180px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="text-align:left;color:#94a3b8;position:sticky;top:0;background:#fff">
      <th style="padding:4px 8px;text-align:left">日期</th><th style="padding:4px 8px;text-align:right">成本</th><th style="padding:4px 8px;text-align:right">進價</th><th style="padding:4px 8px;text-align:right">售價</th><th style="padding:4px 8px;text-align:left">事由</th></tr></thead>
    <tbody>${rows.map(x=>`<tr style="border-top:1px solid #f1f5f9${x._i===curIdx?';background:#ecfdf5':''}">
      <td style="padding:4px 8px;white-space:nowrap;text-align:left">${_momoEsc(x.date||'')}${x._i===curIdx?' <span style="color:#059669;font-weight:700">目前生效</span>':''}</td>
      <td style="padding:4px 8px;text-align:right">${x.cost!=null?Math.round(x.cost*100)/100:'—'}</td>
      <td style="padding:4px 8px;text-align:right">${x.purchasePrice!=null?Math.round(x.purchasePrice):'—'}</td>
      <td style="padding:4px 8px;text-align:right">${x.salePrice!=null?Math.round(x.salePrice):'—'}</td>
      <td style="padding:4px 8px;color:#64748b;text-align:left">${_momoEsc(x.note||'')}</td></tr>`).join('')}</tbody></table></div>`;
}
// 跨通路關聯：另一通路同 origin 的商品並列（origin 空 → 不顯示；spec：只有一邊有=標本通路獨有）
function momoCrossChannelHTML(shop,otherShop,p){
  if(!p.origin) return `<div style="font-size:12px;color:#94a3b8">此商品無原廠編號（origin 空），無法跨通路關聯。</div>`;
  const others=momoLoadProducts(otherShop).filter(x=>x.origin===p.origin);
  if(!others.length) return `<div style="font-size:12px;color:#64748b">原廠 ${_momoEsc(p.origin)} 只在 <b>${shop}</b> 上架（本通路獨有，${otherShop} 無對應商品）。</div>`;
  return `<div style="font-size:12px;color:#64748b;margin-bottom:6px">原廠 ${_momoEsc(p.origin)} 在 <b>${otherShop}</b> 的對應商品（點可切換分析）：</div>
    ${others.map(x=>`<div onclick="momoOpenAnalysis('${otherShop}','${x.sku}')" style="padding:7px 10px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:5px;cursor:pointer;background:#f8fafc">
      <b>${_momoEsc(x.name||'—')}</b>${x.discontinued?' <span style="color:#9ca3af;font-size:11px">已下架</span>':''}
      <div style="color:#94a3b8;font-size:11px;margin-top:1px">品號 ${_momoEsc(x.sku)} · ${otherShop} · 成本 ${x.cost!=null?Math.round(x.cost*100)/100:'—'} / 售價 ${x.salePrice!=null?Math.round(x.salePrice):'—'}</div></div>`).join('')}`;
}
// 優化紀錄區塊（只重繪這塊，不動圖表）
function momoRenderOptlogSection(shop,sku){
  const el=document.getElementById('momo-optlog-sec'); if(!el) return;
  const list=(momoLoadOptlog(shop)[sku])||[];
  const rows=list.length ? [...list].map((e,i)=>({e,i})).reverse().map(({e,i})=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-top:1px solid #f1f5f9">
      <span style="flex-shrink:0;font-size:11px;color:#94a3b8;width:74px">${_momoEsc(e.date||'')}</span>
      <span style="flex-shrink:0;font-size:11px;font-weight:700;color:#4f46e5;background:#eef2ff;border-radius:5px;padding:1px 7px">${_momoEsc(e.type||'其他')}</span>
      <span style="flex:1;font-size:12px;color:#334155;min-width:0;word-break:break-word">${_momoEsc(e.note||'')}</span>
      <a onclick="momoDeleteOptlog('${shop}','${sku}',${i})" title="刪除" style="flex-shrink:0;color:#ef4444;cursor:pointer;font-weight:700">✕</a>
    </div>`).join('') : `<div style="font-size:12px;color:#94a3b8;padding:4px 0">尚無優化紀錄。記下調價/調成本/下架/補貨等人工動作，之後跟銷量圖並看因果。</div>`;
  el.innerHTML=`<div class="mm-ana-h">優化紀錄${list.length?`（${list.length}）`:''}</div>
    <div style="margin-bottom:8px">${rows}</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <select id="momo-optlog-type" class="mm-sel" style="font-size:12px;padding:5px 8px;border:1px solid #e5e7eb;border-radius:7px">${MOMO_OPTLOG_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}</select>
      <input id="momo-optlog-note" type="text" placeholder="例：調降售價 15%" style="flex:1;min-width:160px;font-size:12px;padding:6px 9px;border:1px solid #e5e7eb;border-radius:7px" onkeydown="if(event.key==='Enter')momoAddOptlog('${shop}','${sku}')">
      <button onclick="momoAddOptlog('${shop}','${sku}')" class="mm-btn-primary" style="font-size:12px;padding:6px 14px">＋ 新增</button>
    </div>`;
}
// 環比單一 KPI 的箭頭+顏色（rev/profit/qty：升=綠好、降=紅；上期無資料=—灰）
function momoKpiDelta(cur, prev, hasPrev){
  if(!hasPrev || !prev) return {txt:'—', color:'#9ca3af'};
  const d=(cur-prev)/Math.abs(prev)*100, up=d>=0;
  return { txt:(up?'▲ ':'▼ ')+Math.abs(d).toFixed(1)+'%', color: up?'#059669':'#dc2626' };
}
// 總覽 KPI 區塊：總營收/總淨利/加權毛利率/總銷量 + 環比。毛利率按絕對值門檻著色（非方向），環比 pp 差中性色。
function momoOverviewHTML(shop, period, cur, prev, prevKey, verifyTxt){
  if(!period) return '';
  const hasPrev=!!prev.hasData;
  const prevLbl=prevKey?momoPeriodLabel(prevKey):'上期';
  const money=v=>momoMoney(v);
  const marginColor=m=> m>=25?'#059669':m>=15?'#d97706':'#dc2626';   // 毛利率看絕對值：≥25綠 / ≥15橘 / <15紅
  const marginDelta=hasPrev?((cur.margin-prev.margin>=0?'+':'')+(cur.margin-prev.margin).toFixed(1)+'pp'):'—';
  const cards=[
    {label:'總營收', val:money(cur.rev), d:momoKpiDelta(cur.rev,prev.rev,hasPrev)},
    {label:'總淨利', val:money(cur.profit), d:momoKpiDelta(cur.profit,prev.profit,hasPrev)},
    {label:'加權毛利率', info:'總淨利 ÷ 總營收', val:cur.margin.toFixed(1)+'%', valColor:marginColor(cur.margin), d:{txt:marginDelta,color:'#9ca3af'}},
    {label:'總銷量', val:Math.round(cur.qty).toLocaleString()+' 件', d:momoKpiDelta(cur.qty,prev.qty,hasPrev)},
  ];
  const cardHTML=cards.map(c=>`<div class="mm-kpi">
    <div class="mm-kpi-l">${c.label}${c.info?` <span class="mm-info" title="${c.info}">?</span>`:''}</div>
    <div class="mm-kpi-v"${c.valColor?` style="color:${c.valColor}"`:''}>${c.val}</div>
    <div class="mm-kpi-d" style="color:${c.d.color}">${c.d.txt}<span class="base"> vs ${prevLbl}</span></div>
  </div>`).join('');
  // 缺成本警示（可點 → 跳批次維護 + 自動套「缺成本」篩選 + 開顯示已下架，確保兩邊看到同一批）
  const discNote=cur.missCostDisc>0?`（其中 ${cur.missCostDisc} 已下架）`:'';
  const missWarn=cur.missCost>0
    ? `<div class="mm-banner mm-banner-err click" onclick="momoJumpBatchFilter('${shop}','nocostP')" title="點擊跳到批次維護、自動篩出「本期有營收的缺成本」這幾個（含已下架）">⚠ <b>${cur.missCost}</b> 個有營收的商品缺成本${discNote}，總淨利可能高估 → <u>點此修正</u></div>`
    : '';
  return `<div class="mm-kpis">${cardHTML}</div>${verifyTxt||''}${missWarn}`;   // verifyTxt 已是完整區塊（收合<details>或警示<div>），不再外包 .mm-verify
}

// ── 畫面二：批次維護（編輯現有商品 / 新增商品；甲配乙配共用）──
function momoNowParts(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  return {
    date: d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()),   // 'YYYY-MM-DD'（勿改，momoEffectiveAt 靠它字串比較）
    time: p(d.getHours())+':'+p(d.getMinutes())                       // 'HH:mm' 本機時間（非 UTC）
  };
}
const _momoBatchMode={};    // shop -> 'edit' | 'add'
const _momoBatchSel={};     // shop -> 選中商品 sku（edit 模式）
const _momoBatchSearch={};  // shop -> 搜尋字串（edit 模式）
const _momoBatchFilter={};  // shop -> ''|'nocost'|'nopp'|'nosp'（異常篩選，edit 模式）
const _momoBatchShowDisc={}; // shop -> 批次維護是否顯示已下架（預設 false，比照總表）
// 商品異常判定：缺成本/進價/售價（0/null/負都算缺）
function momoProductAnomalies(p){
  const miss=v=>!(Number(v)>0);
  const cost=miss(p.cost), pp=miss(p.purchasePrice), sp=miss(p.salePrice);
  return { cost, pp, sp, any:cost||pp||sp };
}
// 該商品在「總表目前選的期別」有沒有營收（缺成本·本期有營收 篩選用；跟總覽警示同口徑）
function momoHasPeriodRevenue(p, shop, period){
  if(!period) return false;
  const a=momoAggregatePeriods(p, momoExpandPeriod(period), shop);
  return a.qty>0 || Math.abs(a.revenue)>0.5;
}
// 從總覽缺成本警示點擊 → 跳批次維護、自動套「缺成本·本期有營收」篩選（就是警示說的那幾個）、清搜尋
function momoJumpBatchFilter(shop, key){
  _momoSub[shop]='batch';
  _momoBatchMode[shop]='edit';
  _momoBatchFilter[shop]=key||'';
  _momoBatchSearch[shop]='';
  _momoBatchSel[shop]='';
  if(key==='nocost'||key==='nocostP') _momoBatchShowDisc[shop]=true;   // 缺成本可能含已下架 → 自動開，確保跟總覽數字對得上
  momoRenderShop(shop);   // 重繪整個 MOMO 賣場（切子分頁）
}
function momoBatchSetFilter(shop, key){ _momoBatchFilter[shop]=(_momoBatchFilter[shop]===key?'':key); momoRenderBatchEdit(shop); }
function momoBatchToggleDisc(shop){ _momoBatchShowDisc[shop]=!_momoBatchShowDisc[shop]; momoRenderBatchEdit(shop); }
// UI 寬度記憶：用 sessionStorage（撐過 F5、不佔快滿的 localStorage 額度、天然 per-tab）
function momoUiW(key, def){ try{ const v=sessionStorage.getItem('ec_momo_w|'+key); return v?+v:def; }catch(e){ return def; } }
function momoUiWSet(key, v){ try{ sessionStorage.setItem('ec_momo_w|'+key, String(Math.round(v))); }catch(e){} }
// 批次維護左右欄可拖曳分隔線（左=清單、右=編輯區）；即時改 grid、放開存 sessionStorage
function momoBatchSplitDrag(ev, shop){
  ev.preventDefault();
  const grid=document.getElementById('momo-batch-grid-'+shop); if(!grid) return;
  const startX=ev.clientX, startW=momoUiW('batch|'+shop, 300);
  const move=e=>{ let w=Math.max(200, Math.min(600, startW+(e.clientX-startX))); grid.style.gridTemplateColumns=w+'px 6px 1fr'; grid.dataset.w=w; };
  const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up); if(grid.dataset.w) momoUiWSet('batch|'+shop, grid.dataset.w); };
  document.addEventListener('mousemove',move); document.addEventListener('mouseup',up);
}
const _momoAddPpOverride={}; // shop -> 進價是否被手動覆蓋（add 模式）
const _MOMO_INP='width:100%;padding:6px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box';
const _MOMO_LB='font-size:11px;color:#6b7280;font-weight:600';
function momoDefaultShip(shop){ return shop==='乙配'?0:77; }   // fallback：無對帳資料可估時退回的寫死值（甲77/乙0）
const MOMO_PACKAGING_COST=3;   // 固定包材（具名常數，勿散落魔術數字）
// 新增商品「運費+包材」預設值 = 近3月每件平均運費 + 包材。甲配=對帳單物流費(第三方+超商)、乙配=寄倉分攤運費，÷該月出貨件數(reconQty+retQty)。
//   回 {ok, value, freightAvg, n, months}。ok=false → 無足夠資料，value 退 momoDefaultShip（上層標示，不靜默）。MO+ 不動。
function momoAvgShip(shop){
  if(shop!=='甲配'&&shop!=='乙配') return {ok:false, value:momoDefaultShip(shop), n:0};
  const seen={};   // month → {freight(未稅), qty(出貨件數)}
  const take=(m,rec)=>{ if((m in seen)||!rec||!rec.summary||!rec.skus) return; const f=rec.summary.fees||{};
    const freight = shop==='甲配' ? ((f['物流費用-第三方物流']||0)+(f['物流費用-超商取貨']||0))/1.05 : (f['寄倉分攤運費']||0)/1.05;
    let qty=0; Object.keys(rec.skus).forEach(sku=>{ const s=rec.skus[sku]; qty+=(s.reconQty||0)+(s.retQty||0); });
    if(qty>0 && freight>0) seen[m]={freight, qty}; };
  const scan=store=>{ if(!store) return; const pf='ec_momo_reconcile|'+shop+'|'; Object.keys(store).forEach(k=>{ if(k.indexOf(pf)===0) take(k.slice(pf.length), store[k]); }); };
  try{ scan(Store._profitMem); scan(Store._mem);
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); const pf='ec_momo_reconcile|'+shop+'|'; if(k&&k.indexOf(pf)===0&&!(k.slice(pf.length) in seen)){ try{ take(k.slice(pf.length), JSON.parse(localStorage.getItem(k))); }catch(e){} } }
  }catch(e){}
  const months=Object.keys(seen).sort().slice(-3);   // 最近3月
  if(!months.length) return {ok:false, value:momoDefaultShip(shop), n:0};
  const tf=months.reduce((s,m)=>s+seen[m].freight,0), tq=months.reduce((s,m)=>s+seen[m].qty,0);
  const freightAvg = tq>0 ? tf/tq : 0;
  return { ok:freightAvg>0, freightAvg, n:months.length, months, value: freightAvg>0 ? (Math.round(freightAvg)+MOMO_PACKAGING_COST) : momoDefaultShip(shop) };
}
function momoRenderBatch(shop){
  const c=document.getElementById('momo-sub-content-'+shop);
  if(!c) return;
  if(!_momoBatchMode[shop]) _momoBatchMode[shop]='edit';
  const mode=_momoBatchMode[shop];
  const tab=(label,m)=>{ const on=mode===m; return `<button onclick="momoBatchSetMode('${shop}','${m}')" style="padding:5px 14px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid ${on?'#5b5fcf':'#e5e7eb'};background:${on?'#5b5fcf':'#fff'};color:${on?'#fff':'#6b7280'}">${label}</button>`; };
  c.innerHTML=`
    <div style="display:flex;gap:6px;margin-bottom:16px">${tab('編輯現有商品','edit')}${tab('新增商品','add')}</div>
    <div id="momo-batch-body-${shop}"></div>`;
  if(mode==='edit') momoRenderBatchEdit(shop); else momoRenderBatchAdd(shop);
}
function momoBatchSetMode(shop,m){ _momoBatchMode[shop]=m; momoRenderBatch(shop); }

// 編輯模式：搜尋清單（左）+ 選中商品編輯表單與歷程（右）
function momoRenderBatchEdit(shop){
  const body=document.getElementById('momo-batch-body-'+shop);
  if(!body) return;
  const raw=_momoBatchSearch[shop]||'';
  const all=momoLoadProducts(shop);
  momoClearFeeRateCache();   // 本期有營收判定要吃最新對帳單
  const period=_momoPeriodSel[shop]||'';
  const cnt={nocost:0,nocostP:0,nopp:0,nosp:0,disc:0};
  all.forEach(p=>{ const a=momoProductAnomalies(p); if(a.cost){ cnt.nocost++; if(period&&(shop==='甲配'||shop==='乙配')&&momoHasPeriodRevenue(p,shop,period)) cnt.nocostP++; } if(a.pp)cnt.nopp++; if(a.sp)cnt.nosp++; if(p.discontinued===true)cnt.disc++; });
  const filt=_momoBatchFilter[shop]||'', showDisc=!!_momoBatchShowDisc[shop];
  const total=all.length, activeCount=total-cnt.disc;
  const perLbl=period?momoPeriodLabel(period):'';
  const fbtn=(label,key,n,color)=>{ const on=filt===key; return `<button class="mm-chip${on?' on':''}" style="${on?'background:'+color+';border-color:'+color:(n>0?'color:'+color:'')}" onclick="momoBatchSetFilter('${shop}','${key}')">${label}${n>0?' '+n:''}</button>`; };
  const allBtn=`<button class="mm-chip${!filt?' on':''}" style="${!filt?'background:#5b5fcf;border-color:#5b5fcf':''}" onclick="momoBatchSetFilter('${shop}','')">全部</button>`;
  const discBtn=cnt.disc>0?`<button class="mm-chip${showDisc?' on':''}" style="${showDisc?'background:#5b5fcf;border-color:#5b5fcf':''}" onclick="momoBatchToggleDisc('${shop}')">${showDisc?'隱藏已下架':'顯示已下架（'+cnt.disc+'）'}</button>`:'';
  // 缺成本拆兩個：本期有營收（跟總覽警示同數字，正在讓淨利失真的那幾個）+ 全部
  const nocostChips=(shop==='甲配'||shop==='乙配')&&period
    ? `${fbtn('缺成本·本期有營收','nocostP',cnt.nocostP,'#dc2626')}${fbtn('缺成本·全部','nocost',cnt.nocost,'#dc2626')}`
    : `${fbtn('缺成本','nocost',cnt.nocost,'#dc2626')}`;
  body.innerHTML=`
    <div class="mm-row" style="margin-bottom:8px">
      <button class="mm-btn" style="color:#5b5fcf" onclick="momoSetSub('${shop}','profit')">← 回總表</button>
      <span class="mm-muted" style="margin:0 2px">|</span>
      <span class="mm-lbl" style="font-size:11px">篩選異常</span>
      ${allBtn}${nocostChips}${fbtn('缺進價','nopp',cnt.nopp,'#d97706')}${fbtn('缺售價','nosp',cnt.nosp,'#d97706')}
      <span style="margin-left:auto">${discBtn}</span>
    </div>
    ${filt==='nocostP'?`<div class="mm-row" style="margin-bottom:6px"><span class="mm-status no" style="font-size:11px">缺成本·本期有營收 = <b>${perLbl}</b> 該期別有營收、正在讓淨利失真的商品（跟總表警示同一批）</span></div>`:''}
    <div class="mm-row" style="margin-bottom:10px">
      <span class="mm-stat">商品 總 <b>${total}</b>　上架 <b>${activeCount}</b>　下架 <b>${cnt.disc}</b></span>
    </div>
    <div id="momo-batch-grid-${shop}" style="display:grid;grid-template-columns:${momoUiW('batch|'+shop,300)}px 6px 1fr;align-items:start">
      <div style="padding-right:12px">
        ${momoSearchBox(shop, 'momo-batch-search-'+shop, raw, '搜尋 品號/名稱/原廠編號', 'momoBatchSearch', 'display:flex;margin-bottom:8px')}
        <div id="momo-batch-list-${shop}" style="max-height:440px;overflow-y:auto"></div>
      </div>
      <div onmousedown="momoBatchSplitDrag(event,'${shop}')" title="拖曳調整左右寬度" style="cursor:col-resize;background:#eef0f4;border-radius:3px;align-self:stretch;min-height:440px"></div>
      <div id="momo-batch-form-${shop}" style="padding-left:12px"></div>
    </div>`;
  momoRenderBatchEditList(shop);
  momoRenderBatchEditForm(shop);
}
function momoRenderBatchEditList(shop){
  const el=document.getElementById('momo-batch-list-'+shop);
  if(!el) return;
  const raw=_momoBatchSearch[shop]||'';
  const q=raw.trim().toLowerCase();
  const filt=_momoBatchFilter[shop]||'', showDisc=!!_momoBatchShowDisc[shop];
  const period=_momoPeriodSel[shop]||'';
  const all=momoLoadProducts(shop);
  if(!all.length){ el.innerHTML=`<div style="font-size:13px;color:#9ca3af;padding:8px">尚無商品，請切到「新增商品」建立第一筆</div>`; return; }
  let list=all;
  if(q) list=list.filter(p=>((p.sku||'')+' '+(p.name||'')+' '+(p.origin||'')).toLowerCase().includes(q));   // 搜尋時不隱藏下架（找得到）
  else if(!showDisc) list=list.filter(p=>p.discontinued!==true);                                             // 沒搜尋才套「隱藏已下架」
  if(filt) list=list.filter(p=>{ const a=momoProductAnomalies(p);
    if(filt==='nocost') return a.cost;
    if(filt==='nocostP') return a.cost && momoHasPeriodRevenue(p, shop, period);   // 缺成本·本期有營收（跟總覽警示同批）
    if(filt==='nopp') return a.pp;
    if(filt==='nosp') return a.sp;
    return true;
  });
  const filtLbl={nocost:'缺成本·全部',nocostP:'缺成本·本期有營收',nopp:'缺進價',nosp:'缺售價'}[filt]||'';
  if(!list.length){ el.innerHTML=`<div style="font-size:13px;color:#9ca3af;padding:8px">沒有符合的商品${filtLbl?'（篩選：'+filtLbl+'）':''}</div>`; return; }
  const sel=_momoBatchSel[shop];
  const bdg=(t,c)=>`<span style="display:inline-block;font-size:10px;color:${c};background:${c}1a;border-radius:4px;padding:0 5px;margin-left:3px;font-weight:600;vertical-align:middle">${t}</span>`;
  el.innerHTML=list.slice(0,50).map(p=>{
    const on=p.sku===sel, an=momoProductAnomalies(p);
    let badges='';
    if(an.cost) badges+=bdg('缺成本','#dc2626');
    if(an.pp) badges+=bdg('缺進價','#d97706');
    if(an.sp) badges+=bdg('缺售價','#d97706');
    if(p.discontinued===true) badges+=`<span style="display:inline-block;font-size:10px;color:#9ca3af;background:#f3f4f6;border-radius:4px;padding:0 5px;margin-left:3px;font-weight:500;vertical-align:middle">已下架</span>`;
    return `<div onclick="momoBatchSelect('${shop}','${p.sku}')" style="padding:7px 10px;border-radius:7px;cursor:pointer;font-size:13px;border:1px solid ${on?'#5b5fcf':'transparent'};border-left:3px solid ${an.any?'#dc2626':(on?'#5b5fcf':'transparent')};background:${on?'#eef0fb':'#f9fafb'};margin-bottom:4px">
      <b>${p.name||'—'}</b>${badges}<div style="color:#9ca3af;font-size:11px;margin-top:1px">品號 ${p.sku||'—'}${p.origin?' · 原廠 '+p.origin:''}</div></div>`;
  }).join('') + (list.length>50?`<div style="font-size:11px;color:#9ca3af;padding:4px 10px">只顯示前 50 筆，請用搜尋縮小範圍</div>`:'');
}
function momoRenderBatchEditForm(shop){
  const el=document.getElementById('momo-batch-form-'+shop);
  if(!el) return;
  const p=momoLoadProducts(shop).find(x=>x.sku===_momoBatchSel[shop]);
  if(!p){ el.innerHTML=`<div style="font-size:13px;color:#9ca3af;padding:20px;text-align:center">← 從左側選一個商品來編輯</div>`; return; }
  const hist=(p.history&&p.history.length)? [...p.history].reverse().map(h=>`
    <div style="font-size:12px;padding:6px 10px;border-left:2px solid #e5e7eb;margin-bottom:4px">
      <span style="color:#9ca3af">${h.date}${h.time?' '+h.time:''}</span> 成本 ${h.cost} / 進價 ${h.purchasePrice} / 售價 ${h.salePrice}${h.note?`<span style="color:#6b7280"> — ${h.note}</span>`:''}
    </div>`).join('') : `<div style="font-size:12px;color:#9ca3af">尚無歷程</div>`;
  el.innerHTML=`
    <div style="font-size:14px;font-weight:700">${p.name||'—'}</div>
    <div style="font-size:11px;color:#9ca3af;margin-bottom:12px">品號 ${p.sku||'—'}${p.origin?' · 原廠 '+p.origin:''}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">
      <div><label style="${_MOMO_LB}">成本</label><input id="momo-edit-cost-${shop}" type="number" value="${p.cost??''}" style="${_MOMO_INP}"></div>
      <div><label style="${_MOMO_LB}">進價(含稅)</label><input id="momo-edit-pp-${shop}" type="number" value="${p.purchasePrice??''}" style="${_MOMO_INP}"></div>
      <div><label style="${_MOMO_LB}">售價(含稅)</label><input id="momo-edit-sp-${shop}" type="number" value="${p.salePrice??''}" style="${_MOMO_INP}"></div>
    </div>
    <div style="margin-bottom:10px"><label style="${_MOMO_LB}">異動原因（必填）</label><input id="momo-edit-note-${shop}" type="text" placeholder="例：供應商調漲進價" style="${_MOMO_INP}"></div>
    <button onclick="momoBatchSubmitEdit('${shop}')" style="padding:7px 18px;border-radius:7px;border:none;background:#5b5fcf;color:#fff;font-size:13px;font-weight:600;cursor:pointer">送出（新增一筆歷程）</button>
    <div style="margin-top:16px">
      <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">異動歷程（新到舊）</div>${hist}
    </div>`;
}
function momoBatchSearch(shop,val){ _momoBatchSearch[shop]=val; momoRenderBatchEditList(shop); }
function momoBatchSelect(shop,sku){ _momoBatchSel[shop]=sku; momoRenderBatchEditList(shop); momoRenderBatchEditForm(shop); }
function momoBatchSubmitEdit(shop){
  const products=momoLoadProducts(shop);
  const p=products.find(x=>x.sku===_momoBatchSel[shop]);
  if(!p) return;
  const cost=parseFloat(document.getElementById('momo-edit-cost-'+shop).value);
  const pp=parseFloat(document.getElementById('momo-edit-pp-'+shop).value);
  const sp=parseFloat(document.getElementById('momo-edit-sp-'+shop).value);
  const note=document.getElementById('momo-edit-note-'+shop).value.trim();
  if(!(cost>=0)||!(pp>=0)||!(sp>=0)){ alert('成本 / 進價 / 售價需為 ≥0 的數字'); return; }
  if(!note){ alert('請填異動原因'); return; }
  p.cost=cost; p.purchasePrice=pp; p.salePrice=sp;           // 更新「目前」值
  p.history=p.history||[];
  p.history.push({...momoNowParts(),cost,purchasePrice:pp,salePrice:sp,note});  // append 一筆，不覆蓋舊值
  momoSaveProducts(shop,products);
  momoRenderBatchEditForm(shop);   // 刷新歷程列表
  if(typeof showToast==='function') showToast('已更新並記錄一筆歷程','success');
}

// 新增模式：進價預設售價×75%（可覆蓋）+ 即時毛利率預覽
function momoRenderBatchAdd(shop){
  const body=document.getElementById('momo-batch-body-'+shop);
  if(!body) return;
  _momoAddPpOverride[shop]=false;
  const shipInfo=momoAvgShip(shop);   // 運費+包材預設 = 近3月每件平均運費 + 包材
  const shipSrc = shipInfo.ok
    ? `<span class="mm-cost-src-ok">近 ${shipInfo.n} 月平均運費 ${Math.round(shipInfo.freightAvg)} + 包材 ${MOMO_PACKAGING_COST}</span>`
    : `<span class="mm-cost-src-warn">無足夠對帳資料可估運費，暫用預設 ${shipInfo.value}，請自行確認</span>`;
  body.innerHTML=`
    <div style="max-width:600px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="${_MOMO_LB}">商品編號（選填，留空自動產生 TEMP-）</label><input id="momo-add-sku-${shop}" type="text" style="${_MOMO_INP}"></div>
        <div><label style="${_MOMO_LB}">原廠編號（必填）</label><input id="momo-add-origin-${shop}" type="text" oninput="momoAddOriginLookup('${shop}')" placeholder="例：E192-02" style="${_MOMO_INP}"></div>
      </div>
      <div style="margin-bottom:10px"><label style="${_MOMO_LB}">商品名稱（必填）</label><input id="momo-add-name-${shop}" type="text" style="${_MOMO_INP}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:4px">
        <div><label style="${_MOMO_LB}">成本（必填）</label><input id="momo-add-cost-${shop}" type="number" oninput="momoAddRecalc('${shop}')" style="${_MOMO_INP}"><div id="momo-add-cost-src-${shop}" style="font-size:11px;margin-top:2px;line-height:1.4"></div></div>
        <div><label style="${_MOMO_LB}">售價含稅（必填）</label><input id="momo-add-sp-${shop}" type="number" oninput="momoAddRecalc('${shop}')" style="${_MOMO_INP}"></div>
        <div><label style="${_MOMO_LB}">進價含稅（必填）</label><input id="momo-add-pp-${shop}" type="number" oninput="momoAddPpInput('${shop}')" style="${_MOMO_INP}"><a id="momo-add-revert-${shop}" onclick="momoAddRevertPp('${shop}')" style="display:none;font-size:11px;color:#5b5fcf;cursor:pointer">↺ 改回公式值(售價×75%)</a></div>
        <div><label style="${_MOMO_LB}">運費+包材</label><input id="momo-add-ship-${shop}" type="number" value="${shipInfo.value}" oninput="momoAddRecalc('${shop}')" style="${_MOMO_INP}"><div style="font-size:11px;margin-top:2px;line-height:1.4">${shipSrc}</div></div>
      </div>
      <div id="momo-add-preview-${shop}" style="font-size:13px;margin:12px 0"><span style="color:#9ca3af">成本 / 進價 / 售價填齊後即時計算毛利率</span></div>
      <button onclick="momoBatchSubmitAdd('${shop}')" style="padding:7px 18px;border-radius:7px;border:none;background:#10b981;color:#fff;font-size:13px;font-weight:600;cursor:pointer">新增商品</button>
    </div>`;
}
function momoAddRecalc(shop){
  const g=id=>document.getElementById('momo-add-'+id+'-'+shop);
  const cost=parseFloat(g('cost').value)||0;
  const sp=parseFloat(g('sp').value)||0;
  const shipRaw=parseFloat(g('ship').value);
  const ship=(shipRaw>=0)?shipRaw:momoDefaultShip(shop);
  const ppEl=g('pp');
  if(!_momoAddPpOverride[shop]) ppEl.value= sp? Math.round(sp*0.75):'';   // 進價自動 = 售價×75%（未覆蓋時）
  const pp=parseFloat(ppEl.value)||0;
  const prev=g('preview');
  if(!prev) return;
  if(cost&&pp&&sp){
    // 甲配/乙配 走供應商模式口徑（與總表淨利表一致）；MO+ 等維持原售價基準 momoCalcMargin（byte-identical）
    const isJiaYi=(shop==='甲配'||shop==='乙配');
    const r=isJiaYi ? momoCalcMarginSupplier(shop,{cost,purchasePrice:pp}) : momoCalcMargin({cost,purchasePrice:pp,salePrice:sp,shippingPackaging:ship});
    const marginPct=r.marginPct;
    const ok=marginPct>=30;   // §5：新品上架我們自己訂的獲利目標 30%（非 MOMO 規定；掛在供應商口徑真淨利率上才有意義）
    prev.innerHTML=`毛利率 <b style="color:${ok?'#10b981':'#f97316'};font-size:15px">${Math.round(marginPct*10)/10}%</b> <span style="color:${ok?'#10b981':'#f97316'};font-weight:600;margin-left:6px">${ok?'✓ 超過 30%':'⚠ 未達 30%'}</span>`;
  }else{
    prev.innerHTML=`<span style="color:#9ca3af">成本 / 進價 / 售價填齊後即時計算毛利率</span>`;
  }
}
function momoAddPpInput(shop){
  _momoAddPpOverride[shop]=true;
  const l=document.getElementById('momo-add-revert-'+shop); if(l) l.style.display='inline';
  momoAddRecalc(shop);
}
function momoAddRevertPp(shop){
  _momoAddPpOverride[shop]=false;
  const l=document.getElementById('momo-add-revert-'+shop); if(l) l.style.display='none';
  momoAddRecalc(shop);
}
// 輸入原廠編號 → 查成本。原則：成本框任何時刻都要跟「當下原廠」一致，絕不留前一筆殘值。
//   原廠值一變就無條件重跑（不看成本框現值）：查到→覆寫、查無/多值→清空。主來源=莫筆克持久表，退回主檔既有商品同 origin cost。
function momoAddOriginLookup(shop){
  const origin=(document.getElementById('momo-add-origin-'+shop).value||'').trim();
  const src=document.getElementById('momo-add-cost-src-'+shop);
  const costEl=document.getElementById('momo-add-cost-'+shop);
  if(!src||!costEl) return;
  const setCost=c=>{ costEl.value=(c==null?'':c); momoAddRecalc(shop); };   // 無條件寫入（含清空）
  if(!origin){ setCost(null); src.innerHTML=''; return; }   // 原廠清空 → 成本也清（成本綁原廠）
  // (a) 莫筆克持久表（主來源，跨 session 都在）
  let mobicCost=null;
  try{ const m=momoLoadCostByOrigin(); if(m && m[origin]!=null) mobicCost=m[origin]; }catch(e){}
  // (b) 主檔既有商品同 origin 的 distinct cost（甲乙配都掃；同 origin=同件貨=同成本）
  const byCost=new Map();
  ['甲配','乙配'].forEach(sh=>{ momoLoadProducts(sh).forEach(p=>{ if(p.origin===origin && Number(p.cost)>0){ const c=Number(p.cost); if(!byCost.has(c)) byCost.set(c,{sku:p.sku,shop:sh}); } }); });
  if(mobicCost!=null){
    setCost(mobicCost);
    const diff=byCost.size&&!byCost.has(Number(mobicCost));
    src.innerHTML=`<span class="mm-cost-src-ok">來源：莫筆克（${mobicCost}）</span>`+(diff?`<span class="mm-cost-src-warn">　同原廠既有商品成本不同（${[...byCost.keys()].join(' / ')}）</span>`:'');
    return;
  }
  if(byCost.size===0){ setCost(null); src.innerHTML=`<span class="mm-cost-src-warn">查無此原廠編號的成本，請手動輸入</span>`; return; }   // 查無 → 清空成本
  if(byCost.size===1){ const c=[...byCost.keys()][0], info=byCost.get(c); setCost(c); src.innerHTML=`<span class="mm-cost-src-ok">來源：既有商品 品號 ${info.sku}（${info.shop}）</span>`; return; }
  // 多值不一致 → 清空成本、列出讓選（避免亂帶）
  setCost(null);
  const opts=[...byCost.entries()].map(([c,info])=>`<a class="mm-cost-pick" onclick="momoAddPickCost('${shop}',${c})">${c}（品號 ${info.sku}）</a>`).join('');
  src.innerHTML=`<span class="mm-cost-src-err">同原廠編號有不一致的成本，請選一個：</span> ${opts}`;
}
function momoAddPickCost(shop,c){ const el=document.getElementById('momo-add-cost-'+shop); if(el){ el.value=c; momoAddRecalc(shop); } const src=document.getElementById('momo-add-cost-src-'+shop); if(src) src.innerHTML=`<span class="mm-cost-src-ok">已選成本 ${c}（既有商品）</span>`; }
function momoBatchSubmitAdd(shop){
  const g=id=>document.getElementById('momo-add-'+id+'-'+shop);
  const name=g('name').value.trim();
  const cost=parseFloat(g('cost').value);
  const pp=parseFloat(g('pp').value);
  const sp=parseFloat(g('sp').value);
  let sku=g('sku').value.trim();
  const origin=g('origin').value.trim();
  const shipRaw=parseFloat(g('ship').value);
  if(!name){ alert('商品名稱必填'); return; }
  if(!origin){ alert('原廠編號必填（用來跨通路對應、帶出成本）'); return; }   // 只約束新增；編輯現有商品不擋（舊品空值率甲7.1%/乙15.4%）
  if(!(cost>=0)||!(pp>=0)||!(sp>=0)){ alert('成本 / 進價 / 售價必填且為 ≥0 的數字'); return; }
  const products=momoLoadProducts(shop);
  if(!sku) sku='TEMP-'+Date.now();
  if(products.some(x=>x.sku===sku)){ alert('商品編號重複：'+sku); return; }
  const shipping=(shipRaw>=0)?shipRaw:momoDefaultShip(shop);
  products.push({sku,origin,name,cost,purchasePrice:pp,salePrice:sp,shippingPackaging:shipping,
    history:[{...momoNowParts(),cost,purchasePrice:pp,salePrice:sp,note:'新增商品'}], periods:{}});
  momoSaveProducts(shop,products);
  if(typeof showToast==='function') showToast('已新增商品 '+sku,'success');
  _momoBatchMode[shop]='edit'; _momoBatchSel[shop]=sku; _momoBatchSearch[shop]='';   // 切到編輯模式並選中新商品
  momoRenderBatch(shop);
}

// ── 畫面三：C1105 月度資料上傳（甲配/乙配共用一個入口，一次餵兩個主檔）──
//  檔案：C1105(必要) / 甲配UnsendList(選填) / 乙配UnsendList雙分頁(選填) / S1105(選填,欄位待實測)
//  期別：甲配從訂編判、乙配運費用銷量比例往下拆；欄位用表頭名定位、缺欄即報錯（不靜默算錯）。
const _momoUpFiles={c1105:null,jia:[],yi:null,s1105:null,s1103:null};   // jia 可多檔；s1103=銷售排行榜（帳號級）
let _momoUpPlan=null;

// 開 workbook 一次，可依「分頁名」精準取；找不到分頁回 null（不靜默 fallback 到第一頁，避免讀錯分頁）
function momoReadWorkbook(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const wb=XLSX.read(e.target.result,{type:'array'});
        resolve({
          names:wb.SheetNames.slice(),
          sheet:(name)=>(name&&wb.SheetNames.includes(name))?XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:''}):null,
          firstSheet:()=>XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''}),
        });
      }catch(err){ reject(err); }
    };
    reader.onerror=reject;
    reader.readAsArrayBuffer(file);
  });
}
// 在 rows 前 30 列找「含所有必要標題」的表頭列，回 {headerIdx, idx:{field:colIndex}}；缺欄位就 throw 講明缺哪個
function momoLocateCols(rows,fieldMap,label){
  const fields=Object.keys(fieldMap);
  for(let i=0;i<Math.min(rows.length,30);i++){
    const row=(rows[i]||[]).map(c=>String(c).trim());
    const idx={}; let allFound=true;
    for(const f of fields){
      let found=-1;
      for(let c=0;c<row.length;c++){ if(fieldMap[f].includes(row[c])){ found=c; break; } }
      if(found<0){ allFound=false; break; }
      idx[f]=found;
    }
    if(allFound) return {headerIdx:i, idx};
  }
  throw new Error(label+'：找不到必要欄位表頭（需要：'+fields.map(f=>fieldMap[f][0]).join('、')+'）');
}
// C1105：依配送類型分通路、依訂編判期別、依品號加總數量 → sales[通路][sku][期別]=qty
function momoParseC1105(rows){
  const {headerIdx,idx}=momoLocateCols(rows,{order:['訂單編號'],deliveryType:['配送類型'],sku:['品號'],qty:['數量']},'C1105 訂單商品明細');
  // 「訂單成立日」為選填欄（供 # COD 訂單 date-fallback 用）：獨立找、找不到=-1，不塞進 momoLocateCols 的必要欄，
  //   以免某些檔缺這欄就整份 throw。缺此欄時 fallback 自動失效、退回原本的 drop 行為。
  const iOrderDate=(rows[headerIdx]||[]).map(c=>String(c).trim()).indexOf('訂單成立日');
  // 「進價(未稅)」為選填欄（供淨利表新模型算未稅營收=未稅進價×對帳數量的 revUntax 權重用）：
  //   獨立找、缺欄=-1（revUntax 該筆記 0），不塞 momoLocateCols 必要欄以免舊檔缺欄整份 throw。
  const iPriceUntax=(rows[headerIdx]||[]).map(c=>String(c).trim()).indexOf('進價(未稅)');
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const sales={甲配:{},乙配:{}}, revUntax={甲配:{},乙配:{}}, orderSkuQty={}, unknownChannel=[], badPeriod=[], dateFallback=[];
  for(let i=headerIdx+1;i<rows.length;i++){
    const r=rows[i]; if(!r) continue;
    const sku=String(r[idx.sku]||'').trim(); if(!sku) continue;
    const qty=num(r[idx.qty]);
    const rev=iPriceUntax>=0?Math.round(num(r[iPriceUntax])*qty):0;   // 未稅進價×數量（round整數，供 qtySources 緊湊編碼）
    // 訂單組成表（拆掉行項次序後綴 → 14 碼訂編），供甲配運費按數量比例往下拆
    const orderCore=String(r[idx.order]||'').split('-')[0].trim();
    if(orderCore){ orderSkuQty[orderCore]=orderSkuQty[orderCore]||{}; orderSkuQty[orderCore][sku]=(orderSkuQty[orderCore][sku]||0)+qty; }
    const channel=momoChannelFromDeliveryType(String(r[idx.deliveryType]||'').trim());
    if(!channel){ if(unknownChannel.length<20) unknownChannel.push({order:r[idx.order],type:r[idx.deliveryType]}); continue; }
    let period=momoOrderToPeriod(r[idx.order]);
    if(!period && iOrderDate>=0){   // # COD 訂單訂編非 YYMMDD → 用訂單成立日 fallback，不再靜默 drop 真交易
      period=momoDateToPeriod(r[iOrderDate]);
      if(period && dateFallback.length<50) dateFallback.push({order:orderCore, date:r[iOrderDate], channel, sku, qty, period});
    }
    if(!period){ if(badPeriod.length<20) badPeriod.push({order:r[idx.order]}); continue; }
    sales[channel][sku]=sales[channel][sku]||{};
    sales[channel][sku][period]=(sales[channel][sku][period]||0)+qty;
    revUntax[channel][sku]=revUntax[channel][sku]||{};
    revUntax[channel][sku][period]=(revUntax[channel][sku][period]||0)+rev;
  }
  return {sales,revUntax,orderSkuQty,unknownChannel,badPeriod,dateFallback};
}
// 甲配 UnsendList（舊式）：運費只記在每張訂單第一列（訂編/品號/運費），續列空白。
//   → 依「訂編」收該訂單總運費（運費欄）。分攤到各 SKU 在 momoAllocateJiaFreight 用 C1105 數量比例做。
function momoParseUnsendJia(rows){
  const {headerIdx,idx}=momoLocateCols(rows,{order:['訂編','訂單編號'],fee:['運費'],status:['出貨單狀況']},'甲配運費分攤明細（[C1202] 超取/甲指第三方運費）');
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const orderFreight={};
  for(let i=headerIdx+1;i<rows.length;i++){
    const r=rows[i]; if(!r) continue;
    // 只取「出貨」列：排除退貨列（退貨運費是不同名目、另走 C1201）與 None 月結小計列，
    //   同訂編才不會混到兩個不同運費值。
    if(String(r[idx.status]||'').trim()!=='出貨') continue;
    const order=String(r[idx.order]||'').trim(); if(!order) continue;   // 續列訂編空白 → 略過
    const orderCore=order.split('-')[0];
    if(orderFreight[orderCore]===undefined) orderFreight[orderCore]=num(r[idx.fee]);   // 取該訂單（出貨列）運費
  }
  return {orderFreight};
}
// 甲配運費分攤：該訂單總運費 × 該訂單各 SKU 在 C1105 的數量比例 → freight[sku][期別]（期別由訂編判）
function momoAllocateJiaFreight(orderFreight, orderSkuQty){
  const freight={}, unmatchedOrders=[], badPeriod=[];
  Object.keys(orderFreight).forEach(order=>{
    const fee=orderFreight[order]; if(!(fee>0)) return;
    const period=momoOrderToPeriod(order);
    if(!period){ if(badPeriod.length<20) badPeriod.push({order}); return; }
    const skuQty=orderSkuQty[order];
    if(!skuQty){ if(unmatchedOrders.length<20) unmatchedOrders.push(order); return; }   // 運費單訂編在 C1105 找不到
    const total=Object.values(skuQty).reduce((s,q)=>s+q,0);
    if(total<=0) return;
    Object.keys(skuQty).forEach(sku=>{
      freight[sku]=freight[sku]||{};
      freight[sku][period]=(freight[sku][period]||0)+fee*(skuQty[sku]/total);
    });
  });
  return {freight,unmatchedOrders,badPeriod};
}
// 乙配 UnsendList 單分頁：依品號加總「扣款費用」（不是扣款金額/比例）→ {sku: 該分頁小計}
function momoParseUnsendYiSheet(rows,label){
  const {headerIdx,idx}=momoLocateCols(rows,{sku:['品號'],fee:['扣款費用']},label);
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const out={};
  for(let i=headerIdx+1;i<rows.length;i++){
    const r=rows[i]; if(!r) continue;
    const sku=String(r[idx.sku]||'').trim(); if(!sku) continue;
    out[sku]=(out[sku]||0)+num(r[idx.fee]);
  }
  return out;
}
// S1105 退貨（欄位待實測，先合理猜測；對不到會 throw 講明缺哪欄，測試時再校準）
function momoParseS1105(rows){
  const {headerIdx,idx}=momoLocateCols(rows,{order:['訂單編號'],deliveryType:['配送類型'],sku:['品號'],qty:['退貨數量','退貨數','數量']},'S1105 退貨商品明細');
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const returns={甲配:{},乙配:{}}, badPeriod=[];
  for(let i=headerIdx+1;i<rows.length;i++){
    const r=rows[i]; if(!r) continue;
    const sku=String(r[idx.sku]||'').trim(); if(!sku) continue;
    const channel=momoChannelFromDeliveryType(String(r[idx.deliveryType]||'').trim()); if(!channel) continue;
    const period=momoOrderToPeriod(r[idx.order]);
    if(!period){ if(badPeriod.length<20) badPeriod.push({order:r[idx.order]}); continue; }   // 不靜默丟棄：收集浮出來
    returns[channel][sku]=returns[channel][sku]||{};
    returns[channel][sku][period]=(returns[channel][sku][period]||0)+num(r[idx.qty]);
  }
  return {returns,badPeriod};
}
// 組更新計畫（不寫入）：算出每賣場×SKU×期別的 {qty,freightCost,returnQty}，並標出未比對/覆蓋/雲端風險
function momoBuildUploadPlan(parsed){
  const c=parsed.c1105;
  const plan={ shops:{}, unknownChannel:c.unknownChannel, badPeriod:c.badPeriod.slice(), overwrite:[], jiaUnmatchedOrders:[],
    filesUsed:{c1105:true,jia:!!parsed.jia,yi:!!parsed.yi,s1105:!!parsed.s1105} };
  ['甲配','乙配'].forEach(shop=>{
    const master=momoLoadProducts(shop);
    const bySku=new Map(master.map(p=>[p.sku,p]));
    const sales=c.sales[shop]||{};
    const ret=(parsed.s1105&&parsed.s1105.returns[shop])||{};
    const jiaFreight=(shop==='甲配'&&parsed.jia)?parsed.jia.freight:null;
    const yiMonth=(shop==='乙配'&&parsed.yi)?parsed.yi:null;   // {sku: 當月運費總額}
    const updates={}, matched=[], unmatched=[], anomalyNoSales=[], periods=new Set(); let totalQty=0;
    Object.keys(sales).forEach(sku=>{
      if(!bySku.has(sku)){ unmatched.push(sku); return; }
      matched.push(sku);
      const perQty=sales[sku];
      const monthQty=Object.values(perQty).reduce((s,q)=>s+q,0);
      updates[sku]={};
      Object.keys(perQty).forEach(period=>{
        periods.add(period); totalQty+=perQty[period];
        // 階段四：cell 只寫 qty。運費不再寫 cell.freightCost（死碼，甲乙新模型不讀）→ 改存獨立 freight key（見 plan.jiaFreight）。
        //   退貨也不再寫 cell.returnQty（S1105 已移除，退貨走對帳單 retQty）。
        updates[sku][period]={qty:perQty[period]};
        const exist=bySku.get(sku).periods&&bySku.get(sku).periods[period];
        if(exist&&exist.qty!=null){ plan.overwrite.push({shop,sku,period,oldQty:exist.qty,newQty:perQty[period]}); }
      });
    });
    if(yiMonth){   // 乙配：有運費但當月無銷量 → 無法按比例拆，列異常
      Object.keys(yiMonth).forEach(sku=>{
        const hasSales=sales[sku]&&Object.values(sales[sku]).some(q=>q>0);
        if(!hasSales&&yiMonth[sku]>0) anomalyNoSales.push({sku,fee:yiMonth[sku]});
      });
    }
    const cloudRisk=(master.length>0)&&!_pendingSyncKeys.has(momoProductsKey(shop));  // 主檔非待同步 → 現值等於已上雲
    plan.shops[shop]={updates,matched,unmatched,anomalyNoSales,periods:[...periods].sort(),totalQty,cloudRisk};
  });
  // 階段四：甲配運費 freight[sku][period]（已由 momoAllocateJiaFreight 拆好）→ apply 時存獨立 key（不寫 cell、不受 compact 防呆影響）
  plan.jiaFreight=(parsed.jia&&parsed.jia.freight)||null;
  return plan;
}
// 寫入：只更新「已建檔」的 SKU 的 periods；欄位級 merge（這次沒帶的欄位保留舊值），覆蓋 qty/freight/return
function momoApplyUploadPlan(plan){
  // 1b-5：寫入前全掃防呆。單檔上傳的 Object.assign 會把 flat qty 混進已重建的 compact cell（有 .s）→ 資料當場髒掉。
  //   遷移後唯一安全入口是「⟳重建」；但七月灌新資料 + 同事不知情都會走單檔上傳，約定守不住。
  //   → 只要任一目標 cell 已是 compact，整批拒絕、一格都不寫（不部分寫、不靜默略過），要求改用重建分頁。
  //   完整解（單檔上傳也寫 compact = 1c）留階段二；這裡先把「必爆」變「用不了」。
  const migrated=new Set();
  ['甲配','乙配'].forEach(shop=>{
    const sp=plan.shops[shop]; if(!sp||!Object.keys(sp.updates).length) return;
    const bySku=new Map(momoLoadProducts(shop).map(p=>[p.sku,p]));
    Object.keys(sp.updates).forEach(sku=>{ const p=bySku.get(sku); if(!p||!p.periods) return;
      Object.keys(sp.updates[sku]).forEach(period=>{ const cell=p.periods[period]; if(cell&&cell.s!=null) migrated.add(shop); });
    });
  });
  if(migrated.size) return {ok:false, migratedShops:[...migrated]};   // 拒絕整批
  ['甲配','乙配'].forEach(shop=>{
    const sp=plan.shops[shop]; if(!sp||!Object.keys(sp.updates).length) return;
    const master=momoLoadProducts(shop);
    const bySku=new Map(master.map(p=>[p.sku,p]));
    Object.keys(sp.updates).forEach(sku=>{
      const p=bySku.get(sku); if(!p) return;
      p.periods=p.periods||{};
      Object.keys(sp.updates[sku]).forEach(period=>{
        if(!/^\d{4}-\d{2}-H[12]$/.test(period)){ console.warn('[momo] 期別 key 格式不合，拒絕寫入：',shop,sku,period); return; }   // 第二層防護：擋非法 key 進主檔
        p.periods[period]=Object.assign({}, p.periods[period]||{}, sp.updates[sku][period]);
      });
    });
    momoSaveProducts(shop,master);
  });
  return {ok:true};
}
// ── 一次性清理工具：清掉主檔 periods 裡格式不合的髒 key ──
//   ⚠ 用法：修碼部署 → 正式站確認新版生效 → 在 F12 Console 打 window.momoCleanDirtyPeriodKeys()
//     → 檢視列出的明細 → 清完按「☁ 同步雲端」推上雲。不 auto-run（掛 window 供手動呼叫）。
function momoCleanDirtyPeriodKeys(){
  const RE=/^\d{4}-\d{2}-H[12]$/;
  const found=[]; let removed=0; const dirtyShops=new Set();
  ['甲配','乙配'].forEach(shop=>{
    const master=momoLoadProducts(shop);
    let shopChanged=false;
    master.forEach(p=>{
      if(!p.periods) return;
      Object.keys(p.periods).forEach(k=>{
        if(RE.test(k)) return;
        const cell=p.periods[k];
        found.push({shop, sku:p.sku, badKey:k, qty:(cell&&cell.qty)!=null?cell.qty:''});
        delete p.periods[k];
        removed++; shopChanged=true;
      });
    });
    if(shopChanged){ momoSaveProducts(shop,master); dirtyShops.add(shop); }   // markPending → 之後按同步才上雲
  });
  if(!found.length){ console.log('%c[momo] 清理完成：沒有髒 key，主檔乾淨 ✓','color:#10b981;font-weight:700'); return {removed:0,shops:[]}; }
  console.log('%c[momo] 已刪除 '+removed+' 個髒 key（下方明細）；記得按「☁ 同步雲端」推上雲','color:#ef4444;font-weight:700');
  console.table(found);
  if(typeof showToast==='function') showToast('已清理 '+removed+' 個髒期別 key，記得按 ☁ 同步雲端才會上雲','success');
  return {removed, shops:[...dirtyShops], detail:found};
}
function momoRenderUpload(shop){
  const c=document.getElementById('momo-sub-content-'+shop);
  if(!c) return;
  const f=_momoUpFiles;
  // 統一版型：標籤欄固定 250px，第一行「名稱 + 代號 + 必要/選填」，第二行灰字補充；控制欄同基準線
  const fileRow=(type,name,code,required,sub)=>{
    const on=!!f[type];
    return `<div class="mm-uprow">
      <div class="mm-uplbl">${name}${code?' <span class="mm-code">'+code+'</span>':''}${required?'<span class="req">*必要</span>':'<span class="opt">選填</span>'}${sub?`<div class="mm-hint">${sub}</div>`:''}</div>
      <div class="mm-upctl"><input type="file" accept=".xlsx,.xls" onchange="momoUploadFile('${shop}','${type}',event)"><span class="${on?'mm-ok':'mm-muted'}">${on?'✓ '+_momoEsc(f[type].name):'未選'}</span>${on?`<a onclick="momoUploadRemove('${shop}','${type}')" title="移除此檔" style="color:#ef4444;cursor:pointer;font-weight:700">✕</a>`:''}</div>
    </div>`;
  };
  const jiaFiles=f.jia||[];
  const jiaRow=`<div class="mm-uprow">
    <div class="mm-uplbl">甲配運費 <span class="mm-code">C1202</span><span class="opt">選填·可多檔</span><div class="mm-hint">第三方 + 超商</div></div>
    <div class="mm-upctl" style="align-items:flex-start;min-width:0">
      <input type="file" accept=".xlsx,.xls" multiple onchange="momoUploadFile('${shop}','jia',event)" style="flex-shrink:0">
      <div style="min-width:0;flex:1;display:flex;flex-direction:column;gap:3px">
        ${jiaFiles.length
          ? jiaFiles.map((x,i)=>`<div style="display:flex;align-items:center;gap:6px;max-width:100%;min-height:20px"><span class="mm-ok" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_momoEsc(x.name)}">✓ ${_momoEsc(x.name)}</span><a onclick="momoUploadRemoveJia('${shop}',${i})" title="移除此檔" style="color:#ef4444;cursor:pointer;font-weight:700;flex-shrink:0">✕</a></div>`).join('')+`<a onclick="momoUploadClearJia('${shop}')" style="color:#5b5fcf;cursor:pointer;font-size:12px">清除全部</a>`
          : '<span class="mm-muted" style="min-height:20px;display:flex;align-items:center">未選</span>'}
      </div>
    </div>
  </div>`;
  c.innerHTML=`
    <div style="max-width:780px">
      <div class="mm-note" style="background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:10px 12px;margin-bottom:14px">
        上傳當月訂單明細（C1105）+ 甲配運費（C1202）。依配送類型自動分流至甲配／乙配。<br>
        <span class="mm-muted">乙配運費、退貨已改由月對帳頁的對帳單處理，這頁不收。排行榜（S1103）可單獨上傳補歷史期別，不必連 C1105 一起傳。</span>
      </div>
      ${fileRow('c1105','訂單商品明細','C1105',true,'依配送類型分流至甲配／乙配（更新銷量/運費用）')}
      ${jiaRow}
      ${fileRow('s1103','銷售排行榜','S1103',false,'瀏覽量／成交率（可單獨上傳補期別）')}
      <button class="mm-btn-primary" style="margin-top:10px" onclick="momoUploadGenerate('${shop}')" ${(f.c1105||f.s1103)?'':'disabled'}>▶ 產生預覽</button>
      <div id="momo-up-preview-${shop}" style="margin-top:16px"></div>
    </div>`;
}
function momoUploadFile(shop,type,e){
  const files=e.target.files; if(!files||!files.length) return;
  if(type==='jia'){   // 可多檔：append + 依檔名/大小去重（支援一次多選或分次加）
    _momoUpFiles.jia=_momoUpFiles.jia||[];
    Array.from(files).forEach(fl=>{ if(!_momoUpFiles.jia.some(x=>x.name===fl.name&&x.size===fl.size)) _momoUpFiles.jia.push(fl); });
  }else{
    _momoUpFiles[type]=files[0];
  }
  momoRenderUpload(shop);
}
function momoUploadRemove(shop,type){ _momoUpFiles[type]=null; _momoUpPlan=null; momoRenderUpload(shop); }   // 清該檔 + 清預覽（避免鬼影）
function momoUploadRemoveJia(shop,i){ if(_momoUpFiles.jia) _momoUpFiles.jia.splice(i,1); _momoUpPlan=null; momoRenderUpload(shop); }
function momoUploadClearJia(shop){ _momoUpFiles.jia=[]; _momoUpPlan=null; momoRenderUpload(shop); }   // 修：補清 _momoUpPlan（既有鬼影）
function momoUploadGenerate(shop){
  // 至少要 C1105 或 S1103 其一。只傳 S1103＝回溯補排行榜（sanity 用主檔已存 qty 比對，不必再傳一次 C1105）。
  if(!_momoUpFiles.c1105 && !_momoUpFiles.s1103){ alert('請至少選 C1105（銷量/運費）或 S1103（排行榜）'); return; }
  const prev=document.getElementById('momo-up-preview-'+shop);
  if(prev) prev.innerHTML='<div style="font-size:13px;color:#9ca3af">解析中…</div>';
  const jiaFiles=_momoUpFiles.jia||[];
  Promise.all([
    _momoUpFiles.c1105?momoReadWorkbook(_momoUpFiles.c1105):Promise.resolve(null),
    Promise.all(jiaFiles.map(fl=>momoReadWorkbook(fl))),
    _momoUpFiles.yi?momoReadWorkbook(_momoUpFiles.yi):Promise.resolve(null),
    _momoUpFiles.s1105?momoReadWorkbook(_momoUpFiles.s1105):Promise.resolve(null),
    _momoUpFiles.s1103?momoReadWorkbook(_momoUpFiles.s1103):Promise.resolve(null),
  ]).then(([c1105wb,jiaWbs,yiwb,s1105wb,s1103wb])=>{
    const c1105=c1105wb?momoParseC1105(c1105wb.firstSheet()):null;
    // S1103 銷售排行榜（帳號級）：單獨 try/catch，失敗只讓瀏覽量部分失效、不中止整份。
    //   qty 來源：本次有傳 C1105 → 用本次；否則 → 主檔已存 qty（b 方案）。
    let s1103=null, s1103Sanity=null, s1103Error=null;
    if(s1103wb){ try{
      s1103=momoParseS1103(s1103wb);
      const moPfx=(s1103.period||'').slice(0,7);
      const qtyMap = c1105 ? momoS1103QtyFromC1105(c1105, moPfx) : momoS1103QtyFromStore(moPfx);
      s1103Sanity=momoS1103Sanity(s1103, qtyMap, c1105?'本次 C1105':'主檔已存 qty');
    }catch(err){ s1103Error=(err&&err.message)||String(err); console.warn('[momo] S1103 解析失敗，已略過：',s1103Error); } }
    // 只傳 S1103（沒 C1105）→ 建 s1103-only 精簡 plan，跳過銷量/運費/退貨處理
    if(!c1105){
      _momoUpPlan={ s1103Only:true, shops:{}, overwrite:[], badPeriod:[], unknownChannel:[], s1103, s1103Sanity, s1103Error };
      momoRenderUploadPreview(shop);
      return;
    }
    let jia=null, jiaInfo=null;
    if(jiaWbs.length){   // 多份物流商運費檔各自解析、合併訂編→運費（不同物流商訂單不重疊）
      const orderFreight={};
      jiaWbs.forEach(wb=>{
        const raw=momoParseUnsendJia(wb.firstSheet());
        Object.keys(raw.orderFreight).forEach(o=>{ if(orderFreight[o]===undefined) orderFreight[o]=raw.orderFreight[o]; });
      });
      const alloc=momoAllocateJiaFreight(orderFreight, c1105.orderSkuQty);   // 用 C1105 數量比例往下拆
      jia={freight:alloc.freight};
      jiaInfo={unmatchedOrders:alloc.unmatchedOrders, badPeriod:alloc.badPeriod};
    }
    let yi=null;
    if(yiwb){
      const s1=yiwb.sheet('寄倉分攤出貨運費'), s2=yiwb.sheet('寄倉分攤回收運費');
      if(!s1||!s2) throw new Error('乙配運費檔缺分頁：需要「寄倉分攤出貨運費」+「寄倉分攤回收運費」（實際分頁：'+yiwb.names.join('、')+'）');
      const m1=momoParseUnsendYiSheet(s1,'乙配-寄倉分攤出貨運費'), m2=momoParseUnsendYiSheet(s2,'乙配-寄倉分攤回收運費');
      yi={}; [m1,m2].forEach(m=>Object.keys(m).forEach(sku=>{ yi[sku]=(yi[sku]||0)+m[sku]; }));
    }
    // S1105 止血：單獨 try/catch，解析失敗只讓退貨部分失效（s1105=null），不中止整份上傳（C1105/運費照常）
    let s1105=null, s1105Error=null;
    if(s1105wb){ try{ s1105=momoParseS1105(s1105wb.firstSheet()); }catch(err){ s1105Error=(err&&err.message)||String(err); console.warn('[momo] S1105 解析失敗，已略過（退貨率不會更新）：',s1105Error); } }
    _momoUpPlan=momoBuildUploadPlan({c1105,jia,yi,s1105});
    _momoUpPlan.s1105Error=s1105Error;
    _momoUpPlan.s1103=s1103; _momoUpPlan.s1103Sanity=s1103Sanity; _momoUpPlan.s1103Error=s1103Error;
    if(jiaInfo){ _momoUpPlan.jiaUnmatchedOrders=jiaInfo.unmatchedOrders; _momoUpPlan.badPeriod=_momoUpPlan.badPeriod.concat(jiaInfo.badPeriod); }
    if(s1105&&s1105.badPeriod&&s1105.badPeriod.length) _momoUpPlan.badPeriod=_momoUpPlan.badPeriod.concat(s1105.badPeriod);   // S1105 退貨判不出期別的訂編也浮出來
    momoRenderUploadPreview(shop);
  }).catch(err=>{
    console.error(err);
    const msg=(err&&err.message)||String(err);
    const friendly=/password/i.test(msg)?'有檔案還沒解密（密碼保護）。C1105 請先自行解密、另存一份沒密碼的再上傳。':msg;
    const p=document.getElementById('momo-up-preview-'+shop);
    if(p) p.innerHTML=`<div style="color:#ef4444;font-size:13px">解析失敗：${friendly}</div>`;
  });
}
function momoRenderUploadPreview(shop){
  const el=document.getElementById('momo-up-preview-'+shop);
  if(!el||!_momoUpPlan) return;
  const P=_momoUpPlan;
  const shopBlock=s=>{
    const sp=P.shops[s]; if(!sp) return '';
    const unm=sp.unmatched.length?`<div style="color:#f97316;font-size:12px;margin-top:4px">未比對到商品主檔 ${sp.unmatched.length} 個（不會寫入，請先到批次維護新增再重傳）：${sp.unmatched.slice(0,15).join('、')}${sp.unmatched.length>15?' …':''}</div>`:'';
    const ano=sp.anomalyNoSales.length?`<div style="color:#f97316;font-size:12px;margin-top:4px">有運費但當月無銷量 ${sp.anomalyNoSales.length} 個（無法按比例拆，略過）：${sp.anomalyNoSales.slice(0,10).map(a=>a.sku).join('、')}</div>`:'';
    return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:8px">
      <b>${s}</b>：${sp.matched.length} 個 SKU 有更新、期別 ${sp.periods.map(momoPeriodLabel).join(' / ')||'—'}、總銷量 ${sp.totalQty}${unm}${ano}</div>`;
  };
  let owHtml='';
  const _shrink=P.overwrite.filter(o=>o.newQty!=null&&o.oldQty!=null&&o.newQty<o.oldQty);   // qty 變小的覆蓋（跨結算檔覆蓋的訊號）
  if(P.overwrite.length){
    const owByShop={};
    P.overwrite.forEach(o=>{ owByShop[o.shop]=(owByShop[o.shop]||0)+1; });
    const owParts=Object.keys(owByShop).map(s=>`${s} ${owByShop[s]} 筆`).join('、');
    const riskyShops=[...new Set(P.overwrite.filter(o=>P.shops[o.shop]&&P.shops[o.shop].cloudRisk).map(o=>o.shop))];
    // 明細表：變小(縮水)排前面、標紅底 → 讓「18→2」這種跨檔覆蓋一眼現形（原本只給筆數，看不出變大變小）
    const owSorted=P.overwrite.slice().sort((a,b)=>{
      const da=(a.newQty<a.oldQty)?0:1, db=(b.newQty<b.oldQty)?0:1;
      if(da!==db) return da-db;
      return (b.oldQty-b.newQty)-(a.oldQty-a.newQty);   // 縮水多的在前
    });
    const owRows=owSorted.map(o=>{
      const down=o.newQty<o.oldQty, up=o.newQty>o.oldQty;
      const col=down?'#dc2626':(up?'#16a34a':'#9ca3af');
      return `<tr style="border-top:1px solid #f3f4f6${down?';background:#fef2f2':''}">
        <td style="padding:3px 8px">${o.shop}</td>
        <td style="padding:3px 8px;font-family:monospace">${o.sku}</td>
        <td style="padding:3px 8px">${momoPeriodLabel(o.period)}</td>
        <td style="padding:3px 8px;text-align:right;color:${col};font-weight:${down?'700':'400'}">${o.oldQty} → ${o.newQty}${down?' ▼':(up?' ▲':'')}</td>
      </tr>`;
    }).join('');
    owHtml=`<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:12px;color:#9a3412;line-height:1.6">
      ⚠ 這次會<b>覆蓋已有資料的期別：${owParts}</b>（賣場×SKU×期別），原本數字會被新數字取代。
      ${_shrink.length?`<div style="margin-top:4px;font-weight:700;color:#b91c1c">其中 <b>${_shrink.length} 筆 qty 會變小</b>（下表紅底）——很可能是把別份結算檔的貢獻蓋掉，請確認不是誤覆蓋。</div>`:''}
      ${riskyShops.length?`<div style="margin-top:4px;font-weight:700">${riskyShops.join('、')} 的商品主檔目前不在待同步狀態 → 這些很可能是<u>已同步雲端、別人看過的正式數字</u>，確認你真的要改。</div>`:''}
      <div style="margin-top:6px;max-height:200px;overflow:auto;background:#fff;border:1px solid #fde4c8;border-radius:6px">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="text-align:left;color:#9a3412;position:sticky;top:0;background:#fff7ed">
            <th style="padding:3px 8px">賣場</th><th style="padding:3px 8px">SKU</th><th style="padding:3px 8px">期別</th><th style="padding:3px 8px;text-align:right">舊 → 新 qty</th>
          </tr></thead><tbody>${owRows}</tbody>
        </table>
      </div></div>`;
  }
  // 判不出期別 = 有問題（不是單純略過）→ 橘字獨立區塊、列出實際訂編給人追查
  let badHtml='';
  if(P.badPeriod.length){
    const orders=P.badPeriod.map(b=>b.order).filter(o=>o!=null&&String(o).trim()!=='').map(o=>String(o).trim());
    const shown=orders.slice(0,20).join('、');
    const more=P.badPeriod.length>20?` …等 ${P.badPeriod.length} 筆`:'';
    badHtml=`<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:12px;color:#9a3412;line-height:1.6">
      ⚠ <b>訂編無法判斷期別，${P.badPeriod.length} 筆未寫入</b>（訂編前 6 碼非 YYMMDD、或月/日超出範圍）。請檢查是不是小計 / 頁尾 / 錯誤列：
      <div style="margin-top:4px;word-break:break-all;font-family:monospace">${shown}${more}</div></div>`;
  }
  // S1105 止血：退貨檔解析失敗 → 橘字說明、退貨率不更新，但其餘照常寫入（同 badPeriod 風格）
  const s1105ErrHtml=P.s1105Error?`<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:12px;color:#9a3412;line-height:1.6">
      ⚠ <b>S1105 退貨明細解析失敗，已略過（退貨率不會更新）</b>：<div style="margin-top:4px;word-break:break-all">${P.s1105Error}</div></div>`:'';
  const skips=[];
  if(P.unknownChannel.length) skips.push(`未知配送類型 ${P.unknownChannel.length} 筆`);
  if(P.jiaUnmatchedOrders&&P.jiaUnmatchedOrders.length) skips.push(`甲配運費訂單在 C1105 找不到 ${P.jiaUnmatchedOrders.length} 筆（該運費未分攤）`);
  const skipHtml=skips.length?`<div style="font-size:12px;color:#9ca3af;margin-bottom:8px">略過（未計入）：${skips.join('、')}</div>`:'';
  // S1103 排行榜 sanity（交集比較、不變式「下單量 ≥ 對帳量」）。⚠ 所有插值一律 _momoEsc：SKU/訊息含「<」會被當標籤吃字（舊 bug）。
  let s1103Html='';
  if(P.s1103Error){ s1103Html=`<div class="mm-banner mm-banner-warn" style="margin-bottom:8px">⚠ 排行榜（S1103）解析失敗，已略過（瀏覽量不會更新）：${_momoEsc(P.s1103Error)}</div>`; }
  else if(P.s1103 && P.s1103Sanity){ const s=P.s1103Sanity; const revBad=s.reversed.length>0; const diff=Math.round(s.interOrd-s.interQty);
    const minorNote = s.reversedMinorN>0 ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">另有 ${s.reversedMinorN} 筆小幅反向（差距 ≤3 或 ≤5%）已略過（月邊界零頭，不需看）</div>` : '';
    s1103Html=`<div class="mm-recon-box" style="margin-bottom:8px">
      📊 <b>排行榜 ${_momoEsc(P.s1103.period||'?')}</b>（${_momoEsc(P.s1103.range||'')}）· 熱銷 ${P.s1103.count} 品號　—　sanity（交集品號比較）<br>
      交集 <b>${s.inter}</b>：訂購數 ${Math.round(s.interOrd).toLocaleString()} vs qty ${Math.round(s.interQty).toLocaleString()}（差 ${diff.toLocaleString()}${s.interOrd>=s.interQty?' · 下單 ≥ 對帳 ✓':' · <span style="color:#dc2626;font-weight:700">反向</span>'}）　榜-only ${s.onlyRank}　qty-only ${s.onlyC1105}
      <div style="font-size:11px;color:#9ca3af;margin-top:2px">qty 比對來源：${_momoEsc(s.source||'—')}</div>
      ${minorNote}
    </div>`;
    if(revBad){
      const rows=s.reversed.slice(0,50).map(r=>`<tr style="border-top:1px solid #fecaca">
        <td style="padding:3px 8px;font-family:monospace">${_momoEsc(r.sku)}</td>
        <td style="padding:3px 8px;text-align:right">${Math.round(r.ord).toLocaleString()}</td>
        <td style="padding:3px 8px;text-align:right">${Math.round(r.qty).toLocaleString()}</td>
        <td style="padding:3px 8px;text-align:right;color:#dc2626;font-weight:700">${Math.round(r.ord-r.qty).toLocaleString()}</td>
      </tr>`).join('');
      s1103Html+=`<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:12px;color:#991b1b;line-height:1.6">
        <b>⚠ ${s.reversed.length} 個 SKU 顯著反向（訂購數 &lt; qty，差距 &gt;3 且 &gt;5%）</b>
        <div style="margin-top:3px;color:#b91c1c">「下單量 ≥ 對帳量」理論上恆真。反向多半來自：跨月訂單兩邊歸月口徑不同（S1103 依下單日、qty 依出貨/對帳），或 S1103 訂購數已扣取消。這裡只列差距大的、值得查的。</div>
        <div style="margin-top:6px;max-height:200px;overflow:auto;background:#fff;border:1px solid #fecaca;border-radius:6px">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="text-align:left;color:#991b1b;position:sticky;top:0;background:#fef2f2">
              <th style="padding:3px 8px">品號</th><th style="padding:3px 8px;text-align:right">S1103 訂購數</th><th style="padding:3px 8px;text-align:right">qty</th><th style="padding:3px 8px;text-align:right">差</th>
            </tr></thead><tbody>${rows}</tbody>
          </table></div>
        ${s.reversed.length>50?`<div style="margin-top:4px;color:#9ca3af">（僅顯示反向差距最大的前 50 筆，共 ${s.reversed.length} 筆）</div>`:''}
      </div>`;
    }
  }
  // 只傳 S1103（回溯補排行榜）：不動銷量/運費，只存排行榜
  if(P.s1103Only){
    el.innerHTML=`
      <div style="font-size:13px;font-weight:700;margin-bottom:8px">預覽（尚未寫入）</div>
      <div class="mm-note" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:12px;color:#1e40af">
        只上傳排行榜（S1103）→ <b>只更新瀏覽量／成交率</b>，不動銷量與運費。sanity 用主檔已存 qty 比對。
      </div>
      ${s1103Html}
      ${P.s1103?`<button onclick="momoUploadApply('${shop}')" style="padding:7px 18px;border-radius:7px;border:none;background:#10b981;color:#fff;font-size:13px;font-weight:600;cursor:pointer">確認寫入排行榜</button>`:'<div style="color:#ef4444;font-size:13px">排行榜解析失敗，無法寫入</div>'}
      <button onclick="momoUploadCancel('${shop}')" style="margin-left:8px;padding:7px 14px;border-radius:7px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:13px;cursor:pointer">取消</button>`;
    return;
  }
  el.innerHTML=`
    <div style="font-size:13px;font-weight:700;margin-bottom:8px">預覽（尚未寫入）</div>
    ${shopBlock('甲配')}${shopBlock('乙配')}${owHtml}${badHtml}${s1105ErrHtml}${s1103Html}${skipHtml}
    <button onclick="momoUploadApply('${shop}')" style="padding:7px 18px;border-radius:7px;border:none;background:${_shrink.length?'#dc2626':'#10b981'};color:#fff;font-size:13px;font-weight:600;cursor:pointer">確認寫入${_shrink.length?'（⚠️ '+_shrink.length+' 筆會變小）':(P.overwrite.length?'（含覆蓋 '+P.overwrite.length+' 筆）':'')}</button>
    <button onclick="momoUploadCancel('${shop}')" style="margin-left:8px;padding:7px 14px;border-radius:7px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;font-size:13px;cursor:pointer">取消</button>`;
}
function momoUploadApply(shop){
  if(!_momoUpPlan) return;
  // ⓪ S1103 銷售排行榜（獨立 key、帳號級、不寫 cell）→ 先存，不受 qty 防呆影響
  let s1103Month='';
  if(_momoUpPlan.s1103 && _momoUpPlan.s1103.period){ momoSaveS1103(_momoUpPlan.s1103.period, { period:_momoUpPlan.s1103.period, range:_momoUpPlan.s1103.range, skus:_momoUpPlan.s1103.skus }); s1103Month=_momoUpPlan.s1103.period; momoClearFeeRateCache(); }
  // 只傳 S1103（回溯補排行榜）：存完就收工，不碰銷量/運費 cell
  if(_momoUpPlan.s1103Only){
    _momoUpPlan=null; _momoUpFiles.s1103=null;
    if(typeof showToast==='function') showToast(s1103Month?'已寫入排行榜 '+s1103Month+'（記得按 ☁ 同步雲端）':'排行榜未寫入','success');
    momoRenderUpload(shop);
    return;
  }
  // ① 階段四：先存甲配運費（獨立 freight key，不寫 cell → 不受 qty compact 防呆影響，已對帳月份也能灌運費）
  let freightMonths=[];
  if(_momoUpPlan.jiaFreight){
    const byMonth={};   // month → {sku:{period:$}}
    Object.keys(_momoUpPlan.jiaFreight).forEach(sku=>{ Object.keys(_momoUpPlan.jiaFreight[sku]).forEach(period=>{ const mo=period.slice(0,7); byMonth[mo]=byMonth[mo]||{}; byMonth[mo][sku]=byMonth[mo][sku]||{}; byMonth[mo][sku][period]=_momoUpPlan.jiaFreight[sku][period]; }); });
    Object.keys(byMonth).forEach(mo=>{ momoSaveFreight('甲配', mo, { month:mo, freight:byMonth[mo] }); freightMonths.push(mo); });
    if(freightMonths.length) momoClearFeeRateCache();
  }
  // ② qty 寫 cell（已對帳/compact 月份會被 1b-5 防呆整批拒 → 那是預期，qty 本就正確；運費已在 ① 存好）
  const res=momoApplyUploadPlan(_momoUpPlan);
  if(res&&res.ok===false){
    // 白話文案（給使用者看、不是給開發看）
    const title=freightMonths.length?'運費已存，銷量未更新':'銷量未更新（本月數字已正確）';
    const msg=freightMonths.length
      ? `本月銷量已對帳、數字正確，不需要重傳。\n運費已存入 ${freightMonths.join('、')}，物流精算生效。\n若要更新銷量，請用「⟳重建」分頁。`
      : `本月銷量已對帳、數字正確，不需要重傳。\n若要更新銷量，請用「⟳重建」分頁。`;
    const s1103msg=s1103Month?`\n排行榜（瀏覽量/成交率）已存入 ${s1103Month}。`:'';
    if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title,message:msg+s1103msg,kind:(freightMonths.length||s1103Month)?'info':'warn'});
    else alert(title+'\n\n'+msg+s1103msg);
    _momoUpPlan=null; _momoUpFiles.c1105=null; _momoUpFiles.jia=[]; _momoUpFiles.s1103=null;
    momoRenderUpload(shop);
    return;
  }
  const total=Object.values(_momoUpPlan.shops).reduce((s,sp)=>s+sp.matched.length,0);
  _momoUpPlan=null; _momoUpFiles.c1105=null; _momoUpFiles.jia=[]; _momoUpFiles.s1103=null;
  if(typeof showToast==='function') showToast('已寫入 '+total+' 個 SKU 的 qty'+(freightMonths.length?' + 運費 '+freightMonths.join('、'):'')+(s1103Month?' + 排行榜 '+s1103Month:'')+'（記得按 ☁ 同步雲端）','success');
  momoRenderUpload(shop);
}
function momoUploadCancel(shop){ _momoUpPlan=null; momoRenderUpload(shop); }

// ── 畫面四：商品資料同步（莫筆克成本 各倉商品列表 + MOMO商品資訊 → 差異預覽 5 類）──
//  莫筆克(各倉「商品資料」分頁)：品項條碼→origin、銷售成本→cost（origin 對照表）
//  MOMO商品資訊：倉別→通路(供應商=甲配/寄倉=乙配)、商品編號=sku(合併變體取第一)、
//    商品原廠編號=origin、商品名稱、進價、售價(含稅)、銷售狀況(進行/暫時中斷/永久中斷)
const _momoSyncFiles={info:null,cost:null};
let _momoSyncParsed=null, _momoSyncPlan=null;
function momoParseProductInfo(rows){
  const {headerIdx,idx}=momoLocateCols(rows,{
    warehouse:['倉別'], sku:['商品編號'], origin:['商品原廠編號'], name:['商品名稱'],
    purchase:['進價'], sale:['售價(含稅)','售價（含稅）'], status:['銷售狀況']
  },'MOMO商品資訊');
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const chOf=w=>{ w=String(w||'').trim(); if(w==='供應商')return '甲配'; if(w==='寄倉')return '乙配'; return null; };
  const products={甲配:{},乙配:{}}, unknownWarehouse=[];
  for(let i=headerIdx+1;i<rows.length;i++){
    const r=rows[i]; if(!r) continue;
    const sku=String(r[idx.sku]||'').trim(); if(!sku) continue;
    const ch=chOf(r[idx.warehouse]);
    if(!ch){ if(unknownWarehouse.length<20) unknownWarehouse.push({sku,warehouse:r[idx.warehouse]}); continue; }
    if(products[ch][sku]) continue;   // 合併變體：取第一個（Q1）
    products[ch][sku]={
      sku, origin:String(r[idx.origin]||'').trim(), name:String(r[idx.name]||'').trim(),
      purchasePrice:num(r[idx.purchase]), salePrice:num(r[idx.sale]), status:String(r[idx.status]||'').trim()
    };
  }
  return {products, unknownWarehouse};
}
function momoParseCostList(rows){
  const {headerIdx,idx}=momoLocateCols(rows,{origin:['品項條碼'], cost:['銷售成本']},'莫筆克成本(各倉商品列表)');
  const num=v=>parseFloat(String(v).replace(/,/g,''))||0;
  const costByOrigin={};
  for(let i=headerIdx+1;i<rows.length;i++){
    const r=rows[i]; if(!r) continue;
    const origin=String(r[idx.origin]||'').trim(); if(!origin) continue;
    if(costByOrigin[origin]===undefined) costByOrigin[origin]=num(r[idx.cost]);   // 取第一個
  }
  return {costByOrigin};
}
// 莫筆克 origin→cost 持久化（帳號級獨立 key）。商品同步解析成本檔時累積寫入；新增商品輸原廠→查此表帶成本。走 field 分支(EXPECT 7/12)。
function momoCostByOriginKey(){ return 'ec_momo_cost_by_origin'; }
function momoLoadCostByOrigin(){ const k=momoCostByOriginKey();
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]) return Store._mem[k]; }catch{}
  try{ const l=localStorage.getItem(k); if(l) return JSON.parse(l); }catch{}
  return {}; }
function momoSaveCostByOrigin(map){ const k=momoCostByOriginKey();
  try{ localStorage.setItem(k,JSON.stringify(map)); }catch{}
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Store._profitMem[k]=map; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Store._mem[k]=map; }catch{}
  try{ _markPending(k); }catch{} }
function momoPersistCostByOrigin(costByOrigin){   // 併入持久表（新值覆蓋舊值），回報更新筆數
  const map=momoLoadCostByOrigin(); let added=0,updated=0;
  Object.keys(costByOrigin||{}).forEach(o=>{ if(!o) return; const c=costByOrigin[o]; if(map[o]===undefined) added++; else if(Number(map[o])!==Number(c)) updated++; map[o]=c; });
  momoSaveCostByOrigin(map);
  return {added,updated,total:Object.keys(map).length};
}
// 三態：兩檔=完整比對；只莫筆克成本=只比成本（掃主檔既有商品的 origin→cost）；只商品資訊=比品名/售價/狀態/新品（無成本）。
function momoBuildSyncPlan(parsed){
  const hasInfo=!!(parsed&&parsed.info), hasCost=!!(parsed&&parsed.cost);
  const costMap=hasCost?parsed.cost.costByOrigin:{};
  const plan={ shops:{}, unknownWarehouse:hasInfo?parsed.info.unknownWarehouse:[], mode:(hasInfo&&hasCost)?'both':(hasCost?'cost':'info') };
  ['甲配','乙配'].forEach(shop=>{
    const master=momoLoadProducts(shop);
    const bySku=new Map(master.map(p=>[p.sku,p]));
    const costChanged=[], priceChanged=[], nameChanged=[], discontinued=[], newItems=[], noCost=[];
    const seen=new Set();
    if(hasInfo){
      const incoming=parsed.info.products[shop]||{};
      Object.keys(incoming).forEach(sku=>{
        seen.add(sku);
        const inc=incoming[sku];
        const newCost=(hasCost && inc.origin && costMap[inc.origin]!==undefined)?costMap[inc.origin]:null;
        const p=bySku.get(sku);
        if(!p){   // 未建檔
          newItems.push({sku, origin:inc.origin, name:inc.name, purchasePrice:inc.purchasePrice, salePrice:inc.salePrice, cost:(newCost!=null?newCost:0), status:inc.status});
          if(hasCost && newCost===null && inc.origin) noCost.push({sku, origin:inc.origin, name:inc.name});
          return;
        }
        if(hasCost){
          if(newCost===null){ if(inc.origin) noCost.push({sku, origin:inc.origin, name:p.name}); }   // Q3：查無成本，成本不動
          else if(Number(p.cost)!==Number(newCost)) costChanged.push({sku, name:p.name, old:p.cost, new:newCost});
        }
        if(Number(p.purchasePrice)!==Number(inc.purchasePrice)||Number(p.salePrice)!==Number(inc.salePrice))
          priceChanged.push({sku, name:p.name, oldP:p.purchasePrice, newP:inc.purchasePrice, oldS:p.salePrice, newS:inc.salePrice});
        if(String(p.name||'')!==String(inc.name||'')) nameChanged.push({sku, old:p.name, new:inc.name});
        if(inc.status && inc.status!=='進行' && !p.discontinued) discontinued.push({sku, name:p.name, status:inc.status});   // Q2
      });
    } else if(hasCost){
      // 只有莫筆克成本 → 掃主檔既有商品，按其 origin 查成本檔比對（不比品名/售價/狀態、不新增品）
      master.forEach(p=>{
        if(!p.origin) return;
        const newCost=costMap[p.origin];
        if(newCost===undefined) return;   // 此 origin 不在成本檔 → 略過
        if(Number(p.cost)!==Number(newCost)) costChanged.push({sku:p.sku, name:p.name, old:p.cost, new:newCost});
      });
    }
    const notSeen=hasInfo?master.filter(p=>!seen.has(p.sku)).map(p=>p.sku):[];
    plan.shops[shop]={costChanged,priceChanged,nameChanged,discontinued,newItems,noCost,notSeen};
  });
  return plan;
}
function _momoSyncAfterApply(shop,msg){
  _momoSyncPlan=momoBuildSyncPlan(_momoSyncParsed);   // 重新比對 → 已套用的項目自然消失
  momoRenderSyncPreview(shop);
  if(typeof showToast==='function') showToast(msg+'（記得按 ☁ 同步雲端）','success');
}
function momoSyncApplyCost(shop){
  const items=(_momoSyncPlan.shops[shop]||{}).costChanged||[]; if(!items.length){ if(typeof showToast==='function') showToast(shop+' 沒有可套用的成本變動項目','info'); return; }
  const master=momoLoadProducts(shop), bySku=new Map(master.map(p=>[p.sku,p]));
  items.forEach(it=>{ const p=bySku.get(it.sku); if(!p)return; p.cost=it.new; p.history=p.history||[]; p.history.push({...momoNowParts(),cost:it.new,purchasePrice:p.purchasePrice,salePrice:p.salePrice,note:'商品資料同步：成本更新'}); });
  momoSaveProducts(shop,master); _momoSyncAfterApply(shop, shop+' 已更新 '+items.length+' 筆成本');
}
function momoSyncApplyPrice(shop){
  const items=(_momoSyncPlan.shops[shop]||{}).priceChanged||[]; if(!items.length){ if(typeof showToast==='function') showToast(shop+' 沒有可套用的售價/進價變動項目','info'); return; }
  const master=momoLoadProducts(shop), bySku=new Map(master.map(p=>[p.sku,p]));
  items.forEach(it=>{ const p=bySku.get(it.sku); if(!p)return; p.purchasePrice=it.newP; p.salePrice=it.newS; p.history=p.history||[]; p.history.push({...momoNowParts(),cost:p.cost,purchasePrice:it.newP,salePrice:it.newS,note:'商品資料同步：進價/售價更新'}); });
  momoSaveProducts(shop,master); _momoSyncAfterApply(shop, shop+' 已更新 '+items.length+' 筆進價/售價');
}
function momoSyncApplyName(shop){
  const items=(_momoSyncPlan.shops[shop]||{}).nameChanged||[]; if(!items.length){ if(typeof showToast==='function') showToast(shop+' 沒有可套用的名稱變動項目','info'); return; }
  const master=momoLoadProducts(shop), bySku=new Map(master.map(p=>[p.sku,p]));
  items.forEach(it=>{ const p=bySku.get(it.sku); if(p) p.name=it.new; });   // 名稱不進歷程
  momoSaveProducts(shop,master); _momoSyncAfterApply(shop, shop+' 已更新 '+items.length+' 筆名稱');
}
function momoSyncApplyDiscontinued(shop){
  const items=(_momoSyncPlan.shops[shop]||{}).discontinued||[]; if(!items.length){ if(typeof showToast==='function') showToast(shop+' 沒有可標記下架的項目','info'); return; }
  const master=momoLoadProducts(shop), bySku=new Map(master.map(p=>[p.sku,p]));
  items.forEach(it=>{ const p=bySku.get(it.sku); if(p) p.discontinued=true; });
  momoSaveProducts(shop,master); _momoSyncAfterApply(shop, shop+' 已標記 '+items.length+' 筆下架');
}
function momoSyncApplyNew(shop){
  const items=(_momoSyncPlan.shops[shop]||{}).newItems||[]; if(!items.length){ if(typeof showToast==='function') showToast(shop+' 沒有可一鍵新增的未建檔項目','info'); return; }
  const master=momoLoadProducts(shop), have=new Set(master.map(p=>p.sku)); let added=0;
  items.forEach(it=>{ if(have.has(it.sku))return; master.push({sku:it.sku, origin:it.origin, name:it.name, cost:it.cost, purchasePrice:it.purchasePrice, salePrice:it.salePrice, shippingPackaging:momoDefaultShip(shop), history:[{...momoNowParts(),cost:it.cost,purchasePrice:it.purchasePrice,salePrice:it.salePrice,note:'商品資料同步：新建檔'}], periods:{}}); have.add(it.sku); added++; });
  momoSaveProducts(shop,master); _momoSyncAfterApply(shop, shop+' 已新增 '+added+' 個商品');
}
function momoRenderProductSync(shop){
  const c=document.getElementById('momo-sub-content-'+shop);
  if(!c) return;
  const f=_momoSyncFiles;
  const fileRow=(type,label)=>{
    const on=!!f[type];
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:250px;font-size:13px;color:#374151">${label} <span class="mm-atleast">（至少擇一）</span></div>
      <input type="file" accept=".xlsx,.xls" onchange="momoSyncFile('${shop}','${type}',event)" style="font-size:12px">
      <span style="font-size:12px;color:${on?'#10b981':'#9ca3af'}">${on?'✓ '+f[type].name:'尚未選擇'}</span>
      ${on?`<a onclick="momoSyncRemove('${shop}','${type}')" title="移除此檔" style="color:#ef4444;cursor:pointer;font-size:13px;font-weight:700">✕</a>`:''}
    </div>`;
  };
  const canGen=!!(f.info||f.cost);
  let genHint;
  if(!canGen) genHint='請至少上傳一個檔案（莫筆克成本 或 MOMO商品資訊）';
  else if(f.cost&&!f.info) genHint='目前只比對「成本」；要一併比品名／售價／上下架，請補上 MOMO 商品資訊';
  else if(f.info&&!f.cost) genHint='目前只比對「品名／售價／上下架」；要一併比成本，請補上莫筆克成本';
  else genHint='完整比對（成本 ＋ 品名／售價／上下架狀態）';
  c.innerHTML=`
    <div style="max-width:840px">
      <div style="font-size:12px;color:#6b7280;background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:10px 12px;margin-bottom:14px;line-height:1.6">
        <b>兩份檔至少擇一</b>即可產生差異預覽（同時比對 <b>甲配 + 乙配</b>）：只傳莫筆克成本＝比成本差異；只傳 MOMO 商品資訊＝比品名／售價／上下架；兩份都傳＝完整比對。莫筆克成本＝各倉商品列表（品項條碼→原廠編號、銷售成本→成本）；MOMO商品資訊＝MOMO後台商品主檔（倉別分通路）。套用後成本/價格走歷程（新增一筆、不覆蓋）。
      </div>
      ${fileRow('cost','莫筆克成本（元創數位_各倉_商品列表）')}
      ${fileRow('info','MOMO商品資訊（MOMO後台商品主檔）')}
      <button onclick="momoSyncGenerate('${shop}')" ${canGen?'':'disabled'} style="margin-top:10px;padding:7px 18px;border-radius:7px;border:none;background:${canGen?'#5b5fcf':'#c7c9e6'};color:#fff;font-size:13px;font-weight:600;cursor:${canGen?'pointer':'not-allowed'}">▶ 產生差異預覽</button>
      <span class="mm-gen-hint">${genHint}</span>
      <div id="momo-sync-preview-${shop}" style="margin-top:16px"></div>
    </div>`;
}
function momoSyncFile(shop,type,e){
  const file=e.target.files[0]; if(!file) return;
  _momoSyncFiles[type]=file; momoRenderProductSync(shop);
}
function momoSyncRemove(shop,type){ _momoSyncFiles[type]=null; _momoSyncPlan=null; _momoSyncParsed=null; momoRenderProductSync(shop); }   // 清該檔 + 清預覽/解析結果

// ── 畫面五：倉租費彙總（僅乙配）——手動輸入月度總額，不分攤、不進毛利，只做紀錄+彙總 ──
function momoRentFmt(v){ return '$'+Number(v||0).toLocaleString('en-US'); }
function momoRentSyncBtn(){   // 依當前選的月份是否已有紀錄，切換按鈕文字（新增/更新）
  const mEl=document.getElementById('momo-rent-month'), bEl=document.getElementById('momo-rent-submit');
  if(!mEl||!bEl) return;
  const m=mEl.value;
  const exists=m&&momoLoadRent().some(r=>r.month===m);
  bEl.textContent=exists?('更新 '+m):'新增';
}
function momoRentSubmit(shop){
  const mEl=document.getElementById('momo-rent-month'), aEl=document.getElementById('momo-rent-amount'), nEl=document.getElementById('momo-rent-note');
  const month=((mEl&&mEl.value)||'').trim();
  if(!/^\d{4}-\d{2}$/.test(month)){ alert('請先選擇月份'); return; }
  const raw=((aEl&&aEl.value)||'').trim();
  const amount=Number(raw);   // 一定轉成 number，避免月均字串相加
  if(raw===''||!Number.isFinite(amount)||amount<0){ alert('金額必須是 0 或正數'); return; }
  const note=((nEl&&nEl.value)||'').trim();
  const records=momoLoadRent().slice();
  const i=records.findIndex(r=>r.month===month);
  const updated=i>=0;
  if(updated) records[i]={month,amount,note};   // 同月覆蓋
  else records.push({month,amount,note});
  momoSaveRent(records);
  momoRenderRent(shop);
  if(typeof showToast==='function') showToast((updated?'已更新 ':'已新增 ')+month+' 的倉租費（記得按 ☁ 同步雲端）','success');
}
function momoRentDelete(shop,month){
  const records=momoLoadRent().filter(r=>r.month!==month);
  momoSaveRent(records);
  momoRenderRent(shop);
  if(typeof showToast==='function') showToast('已刪除 '+month+' 的倉租費（記得按 ☁ 同步雲端）','info');
}
function momoRenderRent(shop){
  const c=document.getElementById('momo-sub-content-'+shop);
  if(!c) return;
  const records=momoLoadRent().slice().sort((a,b)=> a.month<b.month?1:a.month>b.month?-1:0);   // 新到舊
  const n=records.length;
  const total=records.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const avg=n?Math.round(total/n):0;
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const listHtml=records.length
    ? records.map(r=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #eef0f2;border-radius:7px;margin-bottom:6px">
        <div style="width:80px;font-weight:600;font-size:13px">${r.month}</div>
        <div style="width:120px;text-align:right;font-size:13px;font-variant-numeric:tabular-nums">${momoRentFmt(r.amount)}</div>
        <div style="flex:1;font-size:12px;color:#6b7280;word-break:break-all">${esc(r.note)}</div>
        <a onclick="momoRentDelete('${shop}','${r.month}')" title="刪除" style="color:#ef4444;cursor:pointer;font-weight:700;font-size:13px">✕</a>
      </div>`).join('')
    : `<div class="empty" style="padding:28px 0;text-align:center;color:#9ca3af"><div style="font-size:26px">📦</div><div style="font-size:13px;margin-top:6px">還沒有倉租費紀錄，從上方新增第一筆</div></div>`;
  c.innerHTML=`
    <div style="max-width:640px">
      <div style="font-size:12px;color:#6b7280;background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:10px 12px;margin-bottom:14px;line-height:1.6">
        倉租費是乙配（寄倉）的<b>公司層級月度總費用</b>（對應對帳單「寄倉倉租費(EC)」），<b>不分攤到商品、不進毛利</b>，這裡只做紀錄與彙總。
      </div>
      <div style="display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:16px">
        <div><div style="font-size:12px;color:#6b7280;margin-bottom:3px">月份</div><input type="month" id="momo-rent-month" onchange="momoRentSyncBtn()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px"></div>
        <div><div style="font-size:12px;color:#6b7280;margin-bottom:3px">金額</div><input type="number" min="0" step="1" id="momo-rent-amount" placeholder="0" style="width:120px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px"></div>
        <div style="flex:1;min-width:140px"><div style="font-size:12px;color:#6b7280;margin-bottom:3px">備註（選填）</div><input type="text" id="momo-rent-note" style="width:100%;padding:6px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px"></div>
        <button id="momo-rent-submit" onclick="momoRentSubmit('${shop}')" style="padding:7px 16px;border-radius:7px;border:none;background:#5b5fcf;color:#fff;font-size:13px;font-weight:600;cursor:pointer">新增</button>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div style="flex:1;background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:12px 14px">
          <div style="font-size:12px;color:#6b7280">累計總計</div>
          <div style="font-size:20px;font-weight:700;color:#1a1a2e;font-variant-numeric:tabular-nums">${momoRentFmt(total)}</div>
        </div>
        <div style="flex:1;background:#f9fafb;border:1px solid #eef0f2;border-radius:8px;padding:12px 14px">
          <div style="font-size:12px;color:#6b7280">月均（${n} 個月）</div>
          <div style="font-size:20px;font-weight:700;color:#1a1a2e;font-variant-numeric:tabular-nums">${momoRentFmt(avg)}</div>
        </div>
      </div>
      <div>${listHtml}</div>
    </div>`;
  momoRentSyncBtn();
}
function momoSyncGenerate(shop){
  if(!_momoSyncFiles.info && !_momoSyncFiles.cost){ alert('請至少上傳一個檔案（莫筆克成本 或 MOMO商品資訊）'); return; }   // 至少擇一
  const prev=document.getElementById('momo-sync-preview-'+shop);
  if(prev) prev.innerHTML='<div style="font-size:13px;color:#9ca3af">解析中…</div>';
  Promise.all([
    _momoSyncFiles.cost?momoReadWorkbook(_momoSyncFiles.cost):Promise.resolve(null),
    _momoSyncFiles.info?momoReadWorkbook(_momoSyncFiles.info):Promise.resolve(null)
  ]).then(([costWb,infoWb])=>{
    let cost=null, info=null;
    if(costWb){ const costRows=costWb.sheet('商品資料')||costWb.firstSheet(); cost=momoParseCostList(costRows); try{ momoPersistCostByOrigin(cost.costByOrigin); }catch(e){} }   // 持久化 origin→cost（新增商品帶成本用）
    if(infoWb){ info=momoParseProductInfo(infoWb.firstSheet()); }
    _momoSyncParsed={info,cost};
    _momoSyncPlan=momoBuildSyncPlan(_momoSyncParsed);
    momoRenderSyncPreview(shop);
  }).catch(err=>{
    console.error(err);
    const msg=(err&&err.message)||String(err);
    const friendly=/password/i.test(msg)?'有檔案還沒解密（密碼保護），請先解密再上傳。':msg;
    const p=document.getElementById('momo-sync-preview-'+shop);
    if(p) p.innerHTML=`<div style="color:#ef4444;font-size:13px">解析失敗：${friendly}</div>`;
  });
}
function momoRenderSyncPreview(shop){
  const el=document.getElementById('momo-sync-preview-'+shop);
  if(!el||!_momoSyncPlan) return;
  const P=_momoSyncPlan;
  const cat=(label,items,fn,txt,color)=>{
    if(!items.length) return '';
    const sample=items.slice(0,8).map(x=>x.name||x.sku).join('、');
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;border-top:1px solid #f3f4f6">
      <div style="flex:1;font-size:12px"><b style="color:${color}">${label} ${items.length}</b><div style="color:#9ca3af;margin-top:2px">${sample}${items.length>8?' …':''}</div></div>
      <button onclick="${fn}('${shop}')" style="padding:4px 12px;border-radius:6px;border:none;background:#10b981;color:#fff;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">${txt}</button></div>`;
  };
  const shopBlock=s=>{
    const sp=P.shops[s]; if(!sp) return '';
    const inner=cat('成本有變動',sp.costChanged,'momoSyncApplyCost','套用成本','#374151')
      +cat('售價/進價有變動',sp.priceChanged,'momoSyncApplyPrice','套用價格','#374151')
      +cat('商品名稱有變動',sp.nameChanged,'momoSyncApplyName','套用名稱','#374151')
      +cat('已下架（銷售狀況≠進行）',sp.discontinued,'momoSyncApplyDiscontinued','標記下架','#9ca3af')
      +cat('未建檔品項',sp.newItems,'momoSyncApplyNew','一鍵新增','#5b5fcf')
      +(sp.noCost.length?`<div style="font-size:12px;color:#f97316;padding:6px 0;border-top:1px solid #f3f4f6">查無成本 ${sp.noCost.length}（莫筆克表沒這些原廠編號，成本不動）：${sp.noCost.slice(0,10).map(x=>x.origin).join('、')}</div>`:'')
      +(sp.notSeen.length?`<div style="font-size:12px;color:#9ca3af;padding:6px 0;border-top:1px solid #f3f4f6">本次未比對到 ${sp.notSeen.length}（主檔有、這份 MOMO資訊沒有）</div>`:'');
    const clean=!sp.costChanged.length&&!sp.priceChanged.length&&!sp.nameChanged.length&&!sp.discontinued.length&&!sp.newItems.length&&!sp.noCost.length&&!sp.notSeen.length;
    return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700;margin-bottom:2px">${s}</div>
      ${clean?'<div style="font-size:12px;color:#10b981">無差異</div>':inner}</div>`;
  };
  const uw=P.unknownWarehouse.length?`<div style="font-size:12px;color:#9ca3af;margin-bottom:8px">未知倉別（非供應商/寄倉）${P.unknownWarehouse.length} 筆，已略過</div>`:'';
  // 只畫「當前賣場」那塊（cat 的按鈕綁 shop===當前，跨賣場靜默失敗的坑就此消失）；另一賣場改成一行可點提示
  const other = shop==='甲配'?'乙配':'甲配';
  const osp = P.shops[other];
  let otherHint='';
  if(osp){
    const parts=[];
    if(osp.newItems.length)     parts.push(osp.newItems.length+' 筆未建檔');
    if(osp.discontinued.length) parts.push(osp.discontinued.length+' 筆待標記下架');
    if(osp.costChanged.length)  parts.push(osp.costChanged.length+' 筆成本有變動');
    if(osp.priceChanged.length) parts.push(osp.priceChanged.length+' 筆售價/進價有變動');
    if(osp.nameChanged.length)  parts.push(osp.nameChanged.length+' 筆名稱有變動');
    const extras=[];
    if(osp.noCost.length)  extras.push(osp.noCost.length+' 筆查無成本');
    if(osp.notSeen.length) extras.push(osp.notSeen.length+' 筆未比對到');
    const msg = parts.length ? (other+'另有 '+parts.join('、')+' — 切換到'+other+'分頁處理')
              : extras.length ? (other+'另有 '+extras.join('、')+'（切換到'+other+'分頁查看）')
              : (other+'無差異');
    otherHint=`<button onclick="momoJumpShop('${other}')" style="width:100%;text-align:left;margin-top:6px;padding:8px 12px;border-radius:8px;border:1px dashed #c7c9e6;background:#f5f6ff;color:#5b5fcf;font-size:12px;font-weight:600;cursor:pointer">↪ ${msg}</button>`;
  }
  el.innerHTML=`<div style="font-size:13px;font-weight:700;margin-bottom:8px">差異預覽（套用後才寫入；成本/價格走歷程）</div>${shopBlock(shop)}${otherHint}${uw}`;
}
// 跳到另一個 MOMO 賣場分頁：click 真 tab 才會同步高亮 pill（setMomoShop 靠 btn 設 active）
function momoJumpShop(shop){
  const tab=document.querySelector('.stab[onclick="setMomoShop(\''+shop+'\',this)"]');
  if(tab) tab.click(); else setMomoShop(shop);
}

// ── 畫面六（P5）：淨利階層彙總（MOMO｜總表，甲配/乙配兩卡並排）──
//  band 用 §2 marginPct（實際毛利÷進價含稅），沿用 §9 門檻；動銷率分母排除 discontinued；
//  查無成本(!cost>0)不進 band 但仍算動銷；Action Plan 上雲(存檔失敗要提示)。
let _momoSummaryMonth;   // 'YYYY-MM'（自己的月份狀態，不借 _cupPeriod）
function momoSummaryMonths(){   // 兩賣場 periods 月份聯集（YYYY-MM），排序
  const set=new Set();
  ['甲配','乙配'].forEach(shop=>momoLoadProducts(shop).forEach(p=>{
    if(p.periods) Object.keys(p.periods).forEach(k=>{ const m=String(k).slice(0,7); if(/^\d{4}-\d{2}$/.test(m)) set.add(m); });
  }));
  return [...set].sort();
}
function momoMonthHalfState(month){   // 補強①：三態半月判斷；只認合格式 key（髒 key 不影響）
  const RE=/^(\d{4}-\d{2})-H([12])$/;
  let h1=false, h2=false;
  ['甲配','乙配'].forEach(shop=>momoLoadProducts(shop).forEach(p=>{
    if(!p.periods) return;
    Object.keys(p.periods).forEach(key=>{
      const mm=RE.exec(key);            // 不合 ^YYYY-MM-H[12]$ 的髒 key 直接略過
      if(!mm || mm[1]!==month) return;
      if(mm[2]==='1') h1=true; else h2=true;
    });
  }));
  if(h1&&h2) return 'both';
  if(h1) return 'H1only';
  if(h2) return 'H2only';
  return 'none';
}
function momoHalfLabel(state){ return state==='H1only'?'（僅上半月）':state==='H2only'?'（僅下半月）':''; }
function momoShopMonthStats(shop,month){
  const all=momoLoadProducts(shop);
  const active=all.filter(p=>!p.discontinued);        // 補強②：未下架＝!discontinued（含 undefined/false）
  const discCount=all.filter(p=>p.discontinued===true).length;
  // 驗算：未下架 + 已下架 === 主檔總數；對不上代表有第三種狀態
  if(active.length+discCount!==all.length)
    console.warn('[momo P5] 驗算不符（'+shop+'）：未下架 '+active.length+' + 已下架 '+discCount+' ≠ 主檔 '+all.length+' → 可能有第三種 discontinued 狀態，請停下來檢查');
  else
    console.log('[momo P5] '+shop+' '+month+' 驗算：未下架 '+active.length+' + 已下架 '+discCount+' = 主檔 '+all.length+' ✓');
  const pk=[month+'-H1', month+'-H2'];
  const sold=active.map(p=>({p, agg:momoAggregatePeriods(p, pk, shop)})).filter(x=>x.agg.qty>0);   // 該月有銷量
  const noCost=sold.filter(x=>!(Number(x.p.cost)>0));   // 查無成本：仍算動銷、但不進 band
  const banded=sold.filter(x=>Number(x.p.cost)>0);
  const bands={lt0:0,b0_10:0,b10_15:0,b15_20:0,b20_30:0,gt30:0};
  banded.forEach(x=>{ const v=x.agg.margin;
    if(v<0)bands.lt0++; else if(v<10)bands.b0_10++; else if(v<15)bands.b10_15++; else if(v<20)bands.b15_20++; else if(v<30)bands.b20_30++; else bands.gt30++; });
  return {
    activeCount:active.length, discCount, allCount:all.length,
    soldCount:sold.length, noCostCount:noCost.length, bands,
    ge20:bands.b20_30+bands.gt30, lt20:bands.lt0+bands.b0_10+bands.b10_15+bands.b15_20,
    rate: active.length? sold.length/active.length : 0
  };
}
// Action Plan：ec_momo_action_plans（單一物件，key `{shop}-{yyyy-mm}`），上雲走既有 field rail
function momoLoadActionPlans(){
  const k='ec_momo_action_plans';
  try{ if(typeof Store!=='undefined'&&Store._profitMem&&Store._profitMem[k]) return Store._profitMem[k]; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem&&Store._mem[k]) return Store._mem[k]; }catch{}
  try{ const l=localStorage.getItem(k); if(l) return JSON.parse(l); }catch{}
  return {};
}
function momoSaveActionPlan(shop,month,text){   // 回傳 setItem 是否成功（僅此路徑加成功檢查，不動 momoSaveProducts）
  const k='ec_momo_action_plans';
  const all=momoLoadActionPlans(); all[shop+'-'+month]=text;
  let ok=true;
  try{ localStorage.setItem(k, JSON.stringify(all)); }catch(e){ ok=false; console.error('[momo action plan] localStorage 存檔失敗：', e); }
  try{ if(typeof Store!=='undefined'&&Store._profitMem) Store._profitMem[k]=all; }catch{}
  try{ if(typeof Store!=='undefined'&&Store._mem) Store._mem[k]=all; }catch{}
  _markPending(k);
  return ok;
}
function momoActionPlanSave(shop){
  const ta=document.getElementById('momo-ap-'+shop);
  const st=document.getElementById('momo-ap-status-'+shop);
  if(!ta) return;
  const ok=momoSaveActionPlan(shop, _momoSummaryMonth||'', ta.value);
  if(st){
    if(ok){ st.textContent='已儲存（記得按 ☁ 同步雲端）'; st.style.color='#10b981'; }
    else { st.textContent='⚠ 儲存失敗，localStorage 可能已滿——請先匯出/清理再試'; st.style.color='#ef4444'; }
  }
}
function momoSetSummaryMonth(val){ _momoSummaryMonth=val; momoRenderSummary(); }
function momoSummaryCardHTML(shop,month){
  const s=momoShopMonthStats(shop,month);
  const plans=momoLoadActionPlans();
  const apVal=(plans[shop+'-'+month]||'').replace(/</g,'&lt;');
  const ratePct=Math.round(s.rate*1000)/10;
  const rateColor=s.rate>=0.6?'#10b981':'#f97316';
  const bandDen=s.soldCount;   // §9：佔比分母＝商品數量（該月有銷量）
  const pctOf=n=>bandDen>0?(Math.round(n/bandDen*1000)/10)+'%':'—';
  const rowSub=(label,n)=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0"><span style="color:#6b7280">${label}</span><span style="font-variant-numeric:tabular-nums">${n} <span style="color:#9ca3af">(${pctOf(n)})</span></span></div>`;
  const b=s.bands;
  const soldZero=s.soldCount===0;
  return `
  <div style="flex:1;min-width:300px;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;background:#fff">
    <div style="font-size:15px;font-weight:700;color:#e4007f">${shop}</div>
    <div style="font-size:10.5px;color:#9ca3af;margin-bottom:10px">淨利率 = 實際毛利 ÷ 進價(含稅)</div>
    <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:2px">
      <span style="font-size:12px;color:#6b7280">商品數量</span>
      <b style="font-size:20px;font-variant-numeric:tabular-nums">${s.soldCount}</b>
      <span style="font-size:12px;color:#9ca3af">/ 所有商品 ${s.activeCount}</span>
    </div>
    <div style="font-size:11px;color:#9ca3af;margin-bottom:8px">（另有 ${s.discCount} 筆已下架，未計入）</div>
    <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #f3f4f6">
      <span style="font-size:12px;color:#6b7280">動銷率</span>
      <b style="font-size:18px;color:${rateColor};font-variant-numeric:tabular-nums">${ratePct}%</b>
      <span style="font-size:11px;color:#9ca3af">（健康值 60%）</span>
    </div>
    ${soldZero?`<div style="font-size:12px;color:#9ca3af;padding:8px 0">該月無銷量資料</div>`:`
    <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:6px">淨利階層分佈</div>
    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;padding:3px 0"><span style="color:#10b981">≥20%（綠）</span><span style="font-variant-numeric:tabular-nums">${s.ge20} <span style="color:#9ca3af">(${pctOf(s.ge20)})</span></span></div>
    ${rowSub('　20% - 30%',b.b20_30)}
    ${rowSub('　&gt;30%',b.gt30)}
    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;padding:3px 0;margin-top:4px"><span style="color:#f97316">&lt;20%（橘）</span><span style="font-variant-numeric:tabular-nums">${s.lt20} <span style="color:#9ca3af">(${pctOf(s.lt20)})</span></span></div>
    ${rowSub('　&lt;0%',b.lt0)}
    ${rowSub('　0% - 10%',b.b0_10)}
    ${rowSub('　10% - 15%',b.b10_15)}
    ${rowSub('　15% - 20%',b.b15_20)}
    ${s.noCostCount>0?`<div style="font-size:12px;color:#f97316;margin-top:8px;padding-top:8px;border-top:1px dashed #fed7aa">⚠️ 成本待確認 ${s.noCostCount} 筆（未納入分佈）</div>`:''}
    `}
    <div style="margin-top:12px">
      <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:4px">Action Plan</div>
      <textarea id="momo-ap-${shop}" onblur="momoActionPlanSave('${shop}')" placeholder="這個月的行動計畫…" style="width:100%;min-height:64px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;outline:none;box-sizing:border-box;resize:vertical">${apVal}</textarea>
      <div id="momo-ap-status-${shop}" style="font-size:11px;margin-top:3px;min-height:14px"></div>
    </div>
    <div style="font-size:10px;color:#9ca3af;margin-top:10px;line-height:1.5">淨利率依商品目前成本/售價計算，非當期歷史成本（規格 §199）</div>
  </div>`;
}
function momoRenderSummary(){
  const el=document.getElementById('momo-content-總表');
  if(!el) return;
  const months=momoSummaryMonths();
  if(_momoSummaryMonth===undefined || (_momoSummaryMonth && !months.includes(_momoSummaryMonth)))
    _momoSummaryMonth = months.length?months[months.length-1]:'';
  if(!months.length){
    el.innerHTML=`<div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">尚無期別資料，請先在甲配/乙配上傳 C1105</div></div>`;
    return;
  }
  const m=_momoSummaryMonth;
  const opts=months.map(mo=>`<option value="${mo}"${mo===m?' selected':''}>${mo}${momoHalfLabel(momoMonthHalfState(mo))}</option>`).join('');
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:13px;color:#6b7280;font-weight:500">月份</span>
      <select onchange="momoSetSummaryMonth(this.value)" style="padding:5px 10px;border:1px solid #e5e7eb;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;color:#1a1a2e">${opts}</select>
      ${(()=>{const st=momoMonthHalfState(m); return (st==='H1only'||st==='H2only')?`<span style="font-size:12px;color:#f97316">⚠️ 此月${st==='H1only'?'僅上半月':'僅下半月'}資料，數字勿與完整月份直接比較</span>`:'';})()}
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:stretch">
      ${momoSummaryCardHTML('甲配',m)}
      ${momoSummaryCardHTML('乙配',m)}
    </div>`;
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
    if(shop==='甲配'||shop==='乙配'){
      momoRenderShop(shop);   // 新設計：自帶子分頁，每次進來重繪（不用 dataset.init 快取）
    }else if(shop==='總表'){
      momoRenderSummary();    // P5 淨利階層彙總（每次進來重繪，不快取）
    }else if(!el.dataset.init){
      el.innerHTML=momoShopHTML(shop);   // MO+麻吉 / MO+森之旅：維持舊佔位（momoShopHTML 酷澎共用，勿動）
      el.dataset.init='1';
    }
  }
  const kpiBlock=document.getElementById('header-kpi-row');
  if(kpiBlock)kpiBlock.style.display='none';
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
  const numeric=new Set(['sales','cost','rateNum','costPct']);
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
  const products=((_affData[shop]&&_affData[shop].products)||[]).map(p=>({...p,rateNum:parseFloat(p.rate)||0,costPct:p.sales>0?p.cost/p.sales:0}));
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
    {k:'costPct',label:'推廣佔比'},
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
      <td style="color:#f59e0b;font-weight:700">${p.sales>0?(p.costPct*100).toFixed(1)+'%':'—'}</td>
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
  container.innerHTML=`<select onchange="onHalfChange('${shop}',this.value,null,true)" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">${btns.map(h=>`<option value="${h.id}"${h.id===curHalf?' selected':''}>${h.label}</option>`).join('')}</select>`;
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
      <select id="month-sel-${s.id}" onchange="onMonthChange('${s.id}',true)" style="padding:4px 10px;background:white;border:1px solid #e5e7eb;border-radius:7px;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;outline:none;cursor:pointer;color:#1a1a2e">
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
  if(_userPickedPeriod[shop]) onMonthChange(shop);   // 已介入 → 只重載當前選擇（不跳）
  else _applyLatestPeriod(shop);                     // 沒介入 → 自動跳最新（內部完整渲染）
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
  const h=['商品ID','編號','商品名稱','廣告費','營收','毛利','淨利','淨利率%','廣告佔比%','可用庫存','目標ROI','直接投入產出','投入產出','實際-目標','點擊數','日預算','分析','調整備註',
    '上期營收','成長比','成長分析','成長調整'];
  const exportNotes=getNotes(shop);
  const exportGrowthNotes=getNotes(shop+'_growth');
  const d=built.map(r=>[
    !r.shopeeIds?.length?'未對應':r.shopeeIds.length===1?r.shopeeIds[0]:'多個',
    r.code,r.name,+r.adsFee.toFixed(0),+r.rev.toFixed(0),+r.gross.toFixed(0),+r.pureProfit.toFixed(0),
    !(r.rev>0)?'-':+(r.pureRate*100).toFixed(2),+(r.adsPct*100).toFixed(2),r.stock,
    r.targetROI!==null?+r.targetROI.toFixed(2):'-',r.directROI>0?+r.directROI.toFixed(2):'-',
    r.roi>0?+r.roi.toFixed(2):'-',r.roiDiff!==null?+r.roiDiff.toFixed(2):'-',
    r.clicks>0?r.clicks:'-',r.dayBudget>0?+r.dayBudget.toFixed(0):'-',
    r.analysis?.label||'', exportNotes[r.code]||'',
    r.prevRev!==null?+r.prevRev.toFixed(0):'-',
    r.growthRate!==null?+((r.growthRate*100).toFixed(2)):'-',
    r.growthAnalysis?.label||'',
    exportGrowthNotes[r.code]?.adjustments?.map(a=>a.text).join('; ')||''
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
  onHalfChange,onMapFile,onMonthChange,onPlatformRateChange,openAddSummaryRowModal,openAnaSettings,openColPicker,
  openDeleteFileModal,openDistModal,openFilter,openGrowthSettings,openNotePopup,openUnmatchedModal,
  openTestSettings,closeTestSettings,addTestDraftCond,removeTestDraftCond,deleteTestDraftRule,addTestDraftRule,saveTestSettings,
  openUploadModal,outsideClick,parseAdsCsv,patchRow,pill,readGrowthNewConds,readNewConds,
  reapplyAnaToAll,recalcRow,removeGroupAds,removeGrowthCond,removeNewCond,renderAnaModalBody,
  renderColPicker,renderGroupAdsCards,renderGrowthModalBody,renderPnmList,renderSummary,renderFocus,onFocusPeriodChange,openFocusColPicker,toggleFocusCol,
  renderTable,resetHiddenCols,resetUploadCards,restoreAnaTag,restoreGrowthTag,saveAnaSettings,
  buildKpiTabHtml,renderKpiTab,getKpiRows,saveKpiRows,setKpiViewMode,setKpiYear,setKpiMonthNum,
  deleteKpiRow,editKpiCell,editKpiCommonCost,toggleKpiGroup,kpiCellClick,editKpiFieldNote,editKpiMergedField,
  saveAnaThresh,saveCustomAnaRules,saveCustomGrowthRules,saveEdits,saveGroupAdsMeta,
  saveGrowthSettings,saveGrowthThresh,saveNotes,saveSummaryRows,saveTagFilters,setColFilter,
  closeCoupangDist,closeCoupangUpload,generateCoupang,onCoupangFile,onCupHalfChange,onCupMonthChange,onCupNoteChange,openCoupangDist,openCoupangUpload,renderCoupangTable,setCoupangShop,syncCoupangToCloud,setKpis,setMomoShop,setShop,setSort,setSearch,setSpin,setTagFilter,shopHTML,showMapWarnBanner,showReconcileDetail,splitCSV,
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
  momoSetSub,momoSetPeriod,momoSetPeriodMonth,momoSetPeriodHalf,momoOnSearch,momoProfitSetSort,momoToggleDiscontinued,momoMoney,
  momoOpenColPicker,momoColToggle,momoColDragStart,momoColDragOver,momoColDragEnter,momoColDragLeave,momoColDrop,momoColDragEnd,momoColResetOrder,momoColShowAll,
  momoBatchSetMode,momoBatchSearch,momoBatchSelect,momoBatchSubmitEdit,momoBatchSubmitAdd,
  momoAddRecalc,momoAddPpInput,momoAddRevertPp,momoAddOriginLookup,momoAddPickCost,
  momoUploadFile,momoUploadClearJia,momoUploadRemove,momoUploadRemoveJia,momoUploadGenerate,momoUploadApply,momoUploadCancel,
  momoSyncFile,momoSyncRemove,momoSyncGenerate,momoSyncApplyCost,momoSyncApplyPrice,momoSyncApplyName,momoSyncApplyDiscontinued,momoSyncApplyNew,momoJumpShop,
  momoSetSummaryMonth,momoActionPlanSave,momoCleanDirtyPeriodKeys,momoMigrateProductsToCollection,
  momoRentSubmit,momoRentDelete,momoRentSyncBtn,
  momoRebuildPick,momoRebuildRemove,momoRebuildGenerate,momoRebuildDownloadReport,momoRebuildConfirm,momoTrimPreview,momoTrimBackupAndApply,
  momoRebuildDryRun,momoRebuildApply,momoTrimHistoryDryRun,momoTrimHistoryApply,
  momoParseReconcile,momoSplitRevenueToPeriods,momoParseReconcileSummary,momoLoadReconcile,momoSaveReconcile,
  momoReadPdfText,momoRenderRecon,momoReconSetMonth,momoReconPick,momoReconGenerate,momoReconStore,
  momoJumpBatchFilter,momoBatchSetFilter,momoBatchToggleDisc,momoBatchSplitDrag,momoColResizeDrag,
  momoOpenAnalysis,momoCloseAnalysis,momoAddOptlog,momoDeleteOptlog,
  momoSearchClear,momoSearchClearToggle,
  momoOpenSyncPreview,momoConfirmSync,momoCloseSyncPreview,momoRefreshSyncBtn,momoSyncToggleAll,momoSyncUpdateCount,
  openAffUpload,closeAffUpload,onAffFile,generateAffRpt,syncAffRptToCloud,affSetSort,clearAffRpt,
  setScoreQ,toggleScoreDefs,adjustScoreBonus,editScoreMonthlyCell,toggleScoreDetailCell,
  openEditScoreTargetsModal,saveScoreTargetsModal,
});
