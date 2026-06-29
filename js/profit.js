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
          <button class="stab" id="momo-summary-btn" style="background:#e91e8c;color:#fff;border-color:#e91e8c;font-weight:700;width:100%;justify-content:center;font-size:15px;opacity:0.9" onclick="setMomoShop('總表',this)">MOMO｜總表</button>
          <div style="display:flex;align-items:center;gap:4px;background:#f3f4f6;border-radius:7px;padding:2px">
            <button class="stab" style="font-size:15px" onclick="setMomoShop('甲配',this)"><span class="sdot" style="background:#d4380d"></span>甲配</button>
            <button class="stab" style="font-size:15px" onclick="setMomoShop('乙配',this)"><span class="sdot" style="background:#fa541c"></span>乙配</button>
            <button class="stab" style="font-size:15px" onclick="setMomoShop('MO+麻吉',this)"><span class="sdot" style="background:#ff7a45"></span>MO+麻吉</button>
            <button class="stab" style="font-size:15px" onclick="setMomoShop('MO+森之旅',this)"><span class="sdot" style="background:#ffa940"></span>MO+森之旅</button>
          </div>
        </div>
      </div>
      <div id="header-btn-block" style="display:none;flex-direction:column;align-items:flex-end;gap:6px">
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
    <div id="header-kpi-block" style="display:none;align-items:center;gap:18px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid #f3f4f6">
      <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">本期總營收</div><div style="display:flex;align-items:baseline;gap:5px"><div id="kv-rev-header" style="font-size:20px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;letter-spacing:-.01em">—</div><span id="kv-rev-change-header" style="font-size:12px;font-weight:600"></span></div></div>
      <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">本期純利</div><div id="kv-net-header" style="font-size:20px;font-weight:700;color:#10b981;font-variant-numeric:tabular-nums;letter-spacing:-.01em">—</div></div>
      <div><div style="font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:2px">廣告費</div><div id="kv-ads-header" style="font-size:20px;font-weight:700;color:#f59e0b;font-variant-numeric:tabular-nums;letter-spacing:-.01em">—</div></div>
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
          <input type="file" id="upm-selads-input" accept=".xlsx,.xls" onchange="onGlobalFile(event,'selads')">
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
          <input type="file" id="upm-groupads-input" accept=".xlsx,.xls" style="display:none" onchange="onGlobalFile(event,'groupads')">
          <button onclick="document.getElementById('upm-groupads-input').click()" style="margin-top:6px;width:100%;border:1.5px dashed #d1d5db;border-radius:9px;padding:8px;background:#fff;color:#6b7280;cursor:pointer;font-size:13px;font-weight:600" onmouseover="this.style.borderColor='#5b5fcf';this.style.color='#5b5fcf'" onmouseout="this.style.borderColor='#d1d5db';this.style.color='#6b7280'">＋ 新增廣告群組</button>
        </div>
      </div>
      <div class="ana-modal-ftr" style="justify-content:space-between;align-items:center">
        <span style="font-size:12px;color:#9ca3af">上傳莫筆克＋廣告報表後可產生</span>
        <button class="gen-btn" id="upm-gen-btn" onclick="onGlobalGenerate()" disabled>▶ 產生報表</button>
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
SHOPS.forEach(s=>{state[s.id]={rawMobic:null,rawAds:null,rawSelAds:null,rawGroupAdsList:[],rawMap:{},curMonth:_initCurMonth,curHalf:'first',days:15,_built:null,_period:'',filters:{},sorts:{},tagFilters:[]};});
let globalMap={};
let curShop='總表';
let openPopup=null;

// ── Storage（雲端優先、本地為快取後備） ──
// 雲端寫入失敗時必須讓使用者知道（不能靜默吞掉），否則資料只留本機，重整就消失
function _cloudWriteSafe(key, payload, label){
  const showModal = (opts) => {
    if (window.App && typeof window.App.showAlertModal === 'function') {
      window.App.showAlertModal(opts);
    } else {
      // App 還沒就緒就退回 toast；不要再用 native alert
      if (typeof window.showToast === 'function') window.showToast('⚠️ ' + opts.title + '：' + opts.message.split('\n')[0], 'error');
    }
  };
  if(!window.__cloudProfit){
    showModal({ title: '雲端未連線', message: '資料只存在本機，重新整理會消失。\n本次寫入：' + (label || key), kind: 'warn', dedupeKey: 'profit-no-cloud' });
    return;
  }
  window.__cloudProfit.setField(key, payload).catch(e => {
    const msg = String(e && e.message || e);
    if(msg.indexOf('exceeds the maximum allowed size') >= 0){
      showModal({
        title: '雲端寫入失敗（淨利表 1 MiB 已滿）',
        message: (label || key) + '\n\n請通知 Kelly 把舊月份搬到 archive。\n資料還在本機，重整前請先匯出 Excel 備份！',
        detail: msg, kind: 'error', dedupeKey: 'profit-quota-' + key,
      });
    } else {
      showModal({
        title: '雲端寫入失敗',
        message: (label || key) + '\n\n資料只存本機，重整會消失。請聯絡 Kelly。',
        detail: msg, kind: 'error', dedupeKey: 'profit-fail-' + key,
      });
    }
    console.error('[cloud write fail]', label || key, e);
  });
}
function lsKey(shop,month,half){return`ec|${shop}|${month}|${half}`;}
function lsSave(shop,month,half,built,period,days){
  // 只存本機；同步雲端需手動按「☁ 同步雲端」
  const payload={built,period,days,rate:getPlatformRate(),ts:Date.now()};
  try{localStorage.setItem(lsKey(shop,month,half),JSON.stringify(payload));}catch(e){}
  const k=lsKey(shop,month,half);
  try{if(typeof Store!=='undefined'&&Store._profitMem)Store._profitMem[k]=payload;}catch{}
  _showSyncBtn(shop);
}
function _showSyncBtn(shop){
  const btn=document.getElementById('global-sync-btn');
  if(btn){btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';btn.style.background='#f59e0b';btn.style.color='#fff';btn.style.borderColor='#f59e0b';btn.textContent='☁ 同步雲端';}
}
function syncToCloud(shop){
  const btn=document.getElementById('global-sync-btn');
  if(btn){btn.disabled=true;btn.textContent='同步中…';}
  if(!window.__cloudProfit||!window.__cloudProfitCol){
    if(window.App&&typeof App.showAlertModal==='function') App.showAlertModal({title:'雲端未連線',message:'淨利表的雲端尚未就緒，請重新整理。',kind:'warn'});
    else if(typeof showToast==='function') showToast('雲端未連線','error');
    if(btn)btn.disabled=false;return;
  }
  const promises=[];
  // 同步報表
  const s=state[shop];
  if(s&&s._built){
    const k=lsKey(shop,s.curMonth,s.curHalf);
    const payload=Store._profitMem&&Store._profitMem[k];
    if(payload) promises.push(window.__cloudProfitCol.setReport(k,payload));
  }
  // 同步備註（按期間獨立存）
  const _nk=shop+'|'+(s?.curMonth||'')+'|'+(s?.curHalf||'');
  const notes=getNotes(_nk);
  if(Object.keys(notes).length>0) promises.push(window.__cloudProfit.setField('ec_notes|'+_nk,notes));
  // 同步編輯
  const edits=getEdits(shop);
  if(Object.keys(edits).length>0) promises.push(window.__cloudProfit.setField('ec_edits|'+shop,edits));
  if(promises.length===0){
    if(typeof showToast==='function') showToast('沒有需要同步的資料','info');
    if(btn)btn.disabled=false;return;
  }
  Promise.all(promises).then(()=>{
    if(btn){btn.textContent='✓ 已同步';btn.style.background='#10b981';btn.style.borderColor='#10b981';setTimeout(()=>{btn.style.display='none';},2000);}
    // 同步成功後，把今天的調整摘要自動寫入該同事的工作日誌（含洞察表與淨利表）
    // pushToCloud:true → 連同工作日誌也一起推給老闆，避免切頁時還跳「未同步」提醒
    try { if(window.App && typeof App._updateDailyProgressFromAdjustments === 'function') App._updateDailyProgressFromAdjustments({ pushToCloud: true }); }
    catch(e){ console.warn('[autoSummary profit]', e); }
  }).catch(e=>{
    const msg=(e&&e.message)||String(e);
    if(window.App&&typeof App.showAlertModal==='function'){
      App.showAlertModal({title:'淨利表同步失敗',message:'部分資料沒推上雲端。資料還在本機，重整前請先匯出 Excel 備份。',detail:msg,kind:'error'});
    } else if(typeof showToast==='function') showToast('同步失敗：'+msg,'error');
    if(btn){btn.disabled=false;btn.textContent='☁ 同步雲端';}
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
        const kpi=document.getElementById('header-kpi-block');if(kpi)kpi.style.display='flex';
        const btnB=document.getElementById('header-btn-block');if(btnB)btnB.style.display='flex';
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
    <label class="ucard" id="uc-ads-${shop}"><input type="file" accept=".csv" onchange="onFile(event,'${shop}','ads')"><div class="ucard-icon" id="ui-ads-${shop}">📣</div><div class="ucard-info"><div class="ucard-title" id="ut-ads-${shop}">蝦皮廣告報表</div><div class="ucard-sub">.csv</div></div><span id="del-ads-${shop}" onclick="event.preventDefault();event.stopPropagation();deleteUpload('${shop}','ads')" style="display:none;margin-left:auto;color:#ef4444;cursor:pointer;padding:2px 8px;font-size:14px;flex-shrink:0" title="刪除">🗑</span></label>
    <label class="ucard" id="uc-selads-${shop}"><input type="file" accept=".xlsx,.xls" onchange="onFile(event,'${shop}','selads')"><div class="ucard-icon" id="ui-selads-${shop}">🎯</div><div class="ucard-info"><div class="ucard-title" id="ut-selads-${shop}">選品廣告清單</div><div class="ucard-sub">.xlsx（選填）</div></div><span id="del-selads-${shop}" onclick="event.preventDefault();event.stopPropagation();deleteUpload('${shop}','selads')" style="display:none;margin-left:auto;color:#ef4444;cursor:pointer;padding:2px 8px;font-size:14px;flex-shrink:0" title="刪除">🗑</span></label>
    <div class="spin-row" id="spin-${shop}"><div class="spin"></div>讀取中…</div>
    <button class="gen-btn" id="gen-${shop}" onclick="generate('${shop}')" disabled>▶ 產生並儲存</button>
  </div>
  <div style="display:none" id="kpi-${shop}">
    <div id="kv-rev-${shop}"></div>
    <div id="kv-net-${shop}"></div>
    <div id="kv-ads-${shop}"></div>
  </div>
  <div class="toolbar" id="tb-${shop}" style="position:relative">
    <span id="period-tag-${shop}" style="display:none"></span>
    <input type="text" class="search-input" id="search-${shop}" placeholder="🔍 搜尋商品…" oninput="applyFilters('${shop}')" style="display:none">
    <span class="row-cnt" id="cnt-${shop}"></span>
    <div style="margin-left:auto;display:flex;align-items:center;gap:4px;position:relative">
      <button class="col-pick-btn" id="tag-btn-${shop}" onclick="toggleTagPopup('${shop}',this)">🏷 標籤</button>
      <div class="tag-filter-bar" id="tfbar-${shop}"></div>
    </div>
    <div class="col-picker-wrap"><button class="col-pick-btn" onclick="openColPicker('${shop}',this)">☰ 欄位</button></div>
    <button class="col-pick-btn" onclick="openDistModal('${shop}')" style="margin-left:2px">📊 階層圖</button>
  </div>
  <div id="tbl-${shop}">
    <div class="empty"><div class="empty-icon">📋</div><div class="empty-hint">選擇區間後上傳報表，按「▶ 產生並儲存」</div></div>
  </div>`;
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
  updateDaysBadge(shop);
  updateHalfBtnLabels(shop);
  tryLoadSaved(shop);
}
function onHalfChange(shop,half,btn){
  delete _editedAt[shop]; // 用戶主動切換區間，清除 edit 保護
  state[shop].curHalf=half;
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
function loadIntoUI(shop,built,period,days){
  if(built&&Array.isArray(built)){
    built.forEach(r=>{
      r.analysis=calcAnalysis(r.adsFee||0,r.pureRate||0,r.targetROI??null,r.roiDiff??null,r.clicks||0,r.pureProfit||0);
      r.analysisLabel=r.analysis?.label||'';
      if(shop==='好麻吉'){
        r.growthAnalysis=calcGrowthAnalysis(r.growthRate??null,r.rev||0,r.prevRev??null,r.pureRate||0);
        r.growthAnalysisLabel=r.growthAnalysis?.label||'';
      }
    });
  }
  state[shop]._built=built;state[shop]._period=period;state[shop]._days=days;
  state[shop].filters={};state[shop].sorts={};state[shop].tagFilters=getTagFilters();
  document.getElementById('period-tag-'+shop).textContent=period;
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
      wb.SheetNames.forEach(sName=>{
        const rows=XLSX.utils.sheet_to_json(wb.Sheets[sName],{defval:''});
        const sk=SHOPS.find(s=>sName.includes(s.id)||s.id.includes(sName))?.id||sName;
        if(!globalMap[sk])globalMap[sk]={};
        rows.forEach(r2=>{
          const code=(r2['商品選項貨號']||r2['商品編號']||'').toString().trim();
          let sid=r2['商品ID'];if(!code||!sid)return;
          sid=Math.round(Number(sid)).toString();
          if(sid==='NaN'||sid==='0'||sid.length<5)return;
          if(!globalMap[sk][code]){globalMap[sk][code]={sids:[],name:''};cnt++;}
          if(!globalMap[sk][code].sids.includes(sid))globalMap[sk][code].sids.push(sid);
          const pName=(r2['莫比克名']||r2['商品名稱']||'').trim();
          if(pName&&!globalMap[sk][code].name)globalMap[sk][code].name=pName;
        });
      });
      try{localStorage.setItem('ec|filemeta|globalMap',JSON.stringify({name:file.name,cnt}));}catch(e){}
      SHOPS.forEach(s=>{
        state[s.id].rawMap=globalMap[s.id]||{};
        const uc=document.getElementById('uc-map-'+s.id);
        const ui=document.getElementById('ui-map-'+s.id);
        const ut=document.getElementById('ut-map-'+s.id);
        const us=document.getElementById('us-map-'+s.id);
        if(uc)uc.className='ucard ok';
        if(ui)ui.textContent='✅';
        if(ut)ut.textContent=file.name;
        if(us)us.textContent=`已載入 ${cnt} 筆`;
        const del=document.getElementById('del-map-'+s.id);if(del)del.style.display='';
        checkReady(s.id);
      });
      // 驗證對照表（先關閉 modal，確保警示可見）
      closeUploadModal();
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
  // CSV 廣告費總計（所有 SID 的花費）
  let csvTotal=0;
  s.rawAds.forEach(r=>{
    const sid=(r['商品 ID']||'').trim();
    const spend=num(r['花費']||0);
    if(sid&&sid!=='-'&&spend>0)csvTotal+=spend;
  });
  // 報表廣告費總計（只有對到商品的）
  const reportTotal=built.reduce((acc,r)=>acc+(r.adsFee||0),0);
  const diff=Math.round((reportTotal-csvTotal)*100)/100;
  if(Math.abs(diff)<0.5)return; // 差不到 $0.50 忽略
  const sign=diff>0?'+':'';
  const msg=`[${shop}] 廣告費對帳差異：CSV 總計 ${fmtAds(csvTotal)}，報表合計 ${fmtAds(reportTotal)}（差 ${sign}${fmtAds(diff)}）\n可能原因：商品對照表有 SID 重複對應到多個商品，或有 SID 不在對照表內。`;
  showMapWarnBanner(msg);
}

function showMapWarnBanner(msg){
  let el=document.getElementById('map-warn-banner');
  if(!el){
    el=document.createElement('div');
    el.id='map-warn-banner';
    el.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9999;background:#fff8e6;border:2px solid #f59e0b;border-radius:10px;padding:16px 20px;max-width:680px;width:90vw;box-shadow:0 4px 24px rgba(0,0,0,.15);font-size:13px;line-height:1.7;color:#92400e;white-space:pre-wrap;';
    document.body.appendChild(el);
  }
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div>${msg.replace(/\n/g,'<br>')}</div><button onclick="document.getElementById('map-warn-banner').remove()" style="flex-shrink:0;background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px">關閉</button></div>`;
}

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
        try{localStorage.setItem(fmKey(shop,'ads'),JSON.stringify({name:file.name}));}catch(e){}
        markCard(shop,'ads','✅',file.name,'ok');
      }catch(err){markCard(shop,'ads','❌','讀取失敗','err');}
      setSpin(shop,false);checkReady(shop);
    };r.readAsArrayBuffer(file);
  }else if(type==='selads'){
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const wb=XLSX.read(ev.target.result,{type:'binary'});
        const sName=wb.SheetNames[0];
        state[shop].rawSelAds=XLSX.utils.sheet_to_json(wb.Sheets[sName],{defval:''});
        try{localStorage.setItem(fmKey(shop,'selads'),JSON.stringify({name:file.name}));}catch(e){}
        markCard(shop,'selads','✅',file.name,'ok');
      }catch(err){markCard(shop,'selads','❌','讀取失敗','err');}
      setSpin(shop,false);checkReady(shop);
    };r.readAsBinaryString(file);
  }else if(type==='groupads'){
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const wb=XLSX.read(ev.target.result,{type:'binary'});
        const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
        if(!state[shop].rawGroupAdsList)state[shop].rawGroupAdsList=[];
        state[shop].rawGroupAdsList.push({name:file.name,rows});
        saveGroupAdsMeta(shop);
      }catch(err){alert('讀取失敗：'+file.name);}
      setSpin(shop,false);checkReady(shop);
    };r.readAsBinaryString(file);
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
        <div style="font-size:11px;color:#9ca3af">${g.rows.length} 筆</div>
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
  let hi=lines.findIndex(l=>l.includes('廣告名稱')&&l.includes('花費'));if(hi<0)hi=7;
  const headers=splitCSV(lines[hi]).map(h=>h.replace(/^"|"$/g,'').trim());
  return lines.slice(hi+1).filter(l=>l.trim()).map(line=>{
    const vals=splitCSV(line).map(v=>v.replace(/^"|"$/g,'').trim());
    const obj={};headers.forEach((h,i)=>{obj[h]=vals[i]||'';});return obj;
  }).filter(r=>r['廣告名稱']);
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
      if(!sidNames[sid]){const n=(r['商品名稱']||r['名稱']||'').trim();if(n)sidNames[sid]=n;}
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
  const result=[...typeA,...typeB];
  console.log(`[${shop}] TypeA(sid無對應):${typeA.length}, TypeB(有廣告無銷售):${typeB.length}`, result);
  return result;
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
      <span>共 <b style="color:#374151">${unmatched.length}</b> 筆廣告費找不到對應銷售商品，合計 <b style="color:#b45309">$${fmtN(Math.round(totalSpend))}</b></span>
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
    <div style="padding:14px 20px;display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #e5e7eb">
      <button onclick="document.getElementById('unmatched-modal-ov').remove()" style="padding:8px 18px;border:1.5px solid #e5e7eb;border-radius:8px;background:white;font-size:13px;font-weight:600;color:#6b7280;cursor:pointer">取消</button>
      <button onclick="confirmUnmatched()" style="padding:8px 18px;border:0;border-radius:8px;background:#5b5fcf;font-size:13px;font-weight:700;color:white;cursor:pointer">確認並產生報表</button>
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
  const adsById={};const directROIById={};const roiById={};const clicksById={};
  (s.rawAds||[]).forEach(r=>{
    const sid=(r['商品 ID']||'').trim();
    const spend=num(r['花費']||0);
    const droi=num(r['直接投入產出比']||0);
    const roi=num(r['投入產出比']||0);
    const clicks=num(r['點擊數']||0);
    if(sid&&sid!=='-'){
      if(spend>0)adsById[sid]=(adsById[sid]||0)+spend;
      if(droi>0)directROIById[sid]=droi;
      if(roi>0)roiById[sid]=roi;
      if(clicks>0)clicksById[sid]=(clicksById[sid]||0)+clicks;
    }
  });
  // 合併選品廣告清單（只加花費，無 ROI/點擊資料）
  (s.rawSelAds||[]).forEach(r=>{
    const sid=(r['商品 ID']||r['商品ID']||'').trim();
    const spend=num(r['花費']||r['廣告費']||0);
    if(sid&&sid!=='-'&&spend>0)adsById[sid]=(adsById[sid]||0)+spend;
  });
  // 合併廣告群組
  (s.rawGroupAdsList||[]).forEach(g=>(g.rows||[]).forEach(r=>{
    const sid=(r['商品 ID']||r['商品ID']||'').trim();
    const spend=num(r['花費']||r['廣告費']||0);
    if(sid&&sid!=='-'&&spend>0)adsById[sid]=(adsById[sid]||0)+spend;
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

  // 有廣告費但無銷售：用商品清單的名稱
  Object.keys(adsByCode).forEach(code=>{
    if(!agg[code]){
      const sids=sidsForCode[code]||[];
      // 找商品名稱：優先用清單的名稱
      const pName=nameForCode[code]||'';
      const displayName=pName||`（商品ID: ${sids[0]||'未知'}）`;
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
    const analysis=calcAnalysis(adsFee,pureRate,targetROI,roiDiff,clicks,pureProfit);
    // 上半月營收 & 成長比（只有好麻吉）
    const prevRev = prevRevMap[p.code] ?? null;
    const growthRate = (prevRev!==null && prevRev>0) ? (p.rev - prevRev) / prevRev : null;
    const growthAnalysis = shop==='好麻吉' ? calcGrowthAnalysis(growthRate, p.rev, prevRev, pureRate) : null;
    return{code:p.code,name:p.name,shopeeIds:p.shopeeIds,qty:p.qty,rev:p.rev,gross:p.gross,
      adsFee,platFee,pureProfit,pureRate,adsPct,targetROI,directROI,roi,roiDiff,
      dayBudget,clicks,stock:p.stock,fromMobic:p.fromMobic,analysis,
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
function calcAnalysis(adsFee, pureRate, targetROI, roiDiff, clicks, pureProfit){
  const t=getAnaThresh();
  const dis=new Set(getDisabledAnaTags());
  const ok=l=>!dis.has(l);
  const D=adsFee, H=pureRate*100, K=targetROI, N=roiDiff, O=clicks, P=pureProfit;
  if(ok('危險商品')&&D===0 && H>=0 && H<t.dangerMaxH) return{label:'危險商品',cls:'tag-danger'};
  if(ok('高利潤商品')&&D===0 && H>t.highMinH) return{label:'高利潤商品',cls:'tag-high'};
  if(ok('賠錢中')&&D>0 && H<0) return{label:'賠錢中',cls:'tag-lose'};
  if(ok('低淨利')&&D>0 && ((K!==null&&K!==undefined&&K<0)||(N===null||N===undefined||!isFinite(N)))) return{label:'低淨利',cls:'tag-low'};
  if(ok('低效廣告')&&D>0 && H>=0 && H<t.badAdsMaxH) return{label:'低效廣告',cls:'tag-bad'};
  for(const ct of getCustomAnaRules()){
    if(evalAnaConds(ct.conds,{D,H,K,N,O,P}))return{label:ct.label,cls:ct.cls||'tag-add100'};
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

// ── 分析設定 Modal ──
let _anaNewConds=[];
const ANA_FIELD_OPTS=[
  {v:'D',l:'廣告費(D)'},{v:'H',l:'淨利率%(H)'},{v:'K',l:'目標ROI(K)'},
  {v:'N',l:'實際-目標(N)'},{v:'O',l:'點擊數(O)'},{v:'P',l:'純利(P)'}
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
  _anaNewConds=[];
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
    const show=ok||wasLoaded;
    document.getElementById('upm-'+id).className='ucard'+(show?' ok':'');
    document.getElementById('upm-'+id+'-icon').textContent=show?okIcon:defaultIcon;
    document.getElementById('upm-'+id+'-title').textContent=show?(meta?.name||okLabel).slice(0,22):defaultLabel;
    document.getElementById('upm-'+id+'-status').textContent=ok?'✅ 已載入':wasLoaded?'✅ 已載入（需重新上傳）':'✗ 未載入';
    document.getElementById('upm-'+id+'-status').style.color=show?'#10b981':'#ef4444';
    document.getElementById('upm-'+id+'-input').disabled=ok;
    document.getElementById('upm-'+id+'-input').style.pointerEvents=ok?'none':'';
    document.getElementById('upm-'+id+'-del').style.opacity=show?'1':'0.35';
    document.getElementById('upm-'+id+'-del').style.pointerEvents=show?'':'none';
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
  const rMeta=(label,val,bg='#f0f4fa')=>`<tr><td colspan="3" style="padding:7px 14px;font-size:12px;border:${BDR};background:${bg};text-align:left"><b>${label}</b></td><td style="padding:7px 14px;font-size:13px;font-weight:700;border:${BDR};background:${bg};text-align:left">${val}</td></tr>`;

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
    <thead><tr>${th('欄位',BLU_HD)}${th('項目（扣除廣告費）',BLU_HD)}${th('數量',BLU_HD)}${th('商品數量佔比 %',BLU_HD)}</tr></thead>
    <tbody>
      ${rMeta('總投廣商品數量',adsTotal)}
      ${rMeta('投廣日預算均值','NT$'+avgBudget)}
      ${adsRows}
    </tbody>
  </table>
  <table style="${T}">
    <thead><tr>${th('欄位',GRN_HD)}${th('項目（廣告費為 $0）',GRN_HD)}${th('數量',GRN_HD)}${th('商品數量佔比 %',GRN_HD)}</tr></thead>
    <tbody>
      ${rMeta('未投廣商品數量',noAdsTotal,'#e8f4fc')}
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
        document.getElementById('upm-mobic-title').textContent=ok?'莫筆克已載入':'莫筆克銷售分析';
      }else if(type==='ads'){
        const ok=!!s.rawAds;
        document.getElementById('upm-ads').className='ucard'+(ok?' ok':'');
        document.getElementById('upm-ads-icon').textContent=ok?'✅':'📣';
        document.getElementById('upm-ads-title').textContent=ok?'廣告報表已載入':'蝦皮廣告報表';
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
  const clsOpts=ANA_CLS_OPTS.map(o=>`<option value="${o.v}">${o.l}</option>`).join('');
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
      <div class="ana-field-row"><label>名稱</label><input type="text" id="anas-new-label" placeholder="標籤名稱"></div>
      <div class="ana-field-row"><label>顏色</label><select id="anas-new-cls">${clsOpts}</select></div>
      <div class="ana-conds-wrap" id="ana-new-conds">${condRows}</div>
      <button class="ana-add-cond-btn" onclick="addNewAnaCond()">＋ 新增條件</button>
      <div class="ana-submit-row"><button class="ana-add-rule-btn" onclick="submitNewAnaRule()">新增標籤</button></div>
    </div>`;
}
function addNewAnaCond(){_anaNewConds.push({f:'D',op:'>=',v:'0'});renderAnaModalBody();}
function removeNewCond(i){_anaNewConds.splice(i,1);renderAnaModalBody();}
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
  _anaNewConds=[];
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
      r.analysis=calcAnalysis(r.adsFee||0,r.pureRate||0,r.targetROI??null,r.roiDiff??null,r.clicks||0,r.pureProfit||0);
      r.analysisLabel=r.analysis?.label||'';
      if(s.id==='好麻吉'){
        r.growthAnalysis=calcGrowthAnalysis(r.growthRate??null,r.rev||0,r.prevRev??null,r.pureRate||0);
        r.growthAnalysisLabel=r.growthAnalysis?.label||'';
      }
    });
    applyFilters(s.id);
  });
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
  _growthNewConds=[];
  renderGrowthModalBody();
  ov.classList.add('open');
}
function closeGrowthSettings(){document.getElementById('growth-overlay')?.classList.remove('open');}
function renderGrowthModalBody(){
  const t=getGrowthThresh();const custom=getCustomGrowthRules();
  const disabled=getDisabledGrowthTags();
  const inp=(id,val,step='1',w='70px')=>`<input type="number" id="grths-${id}" value="${val}" step="${step}" style="width:${w}">`;
  const clsOpts=ANA_CLS_OPTS.map(o=>`<option value="${o.v}">${o.l}</option>`).join('');
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
      <div class="ana-field-row"><label>名稱</label><input type="text" id="grths-new-label" placeholder="標籤名稱"></div>
      <div class="ana-field-row"><label>顏色</label><select id="grths-new-cls">${clsOpts}</select></div>
      <div class="ana-conds-wrap" id="growth-new-conds">${condRows}</div>
      <button class="ana-add-cond-btn" onclick="addGrowthCond()">＋ 新增條件</button>
      <div class="ana-submit-row"><button class="ana-add-rule-btn" onclick="submitNewGrowthRule()">新增標籤</button></div>
    </div>`;
}
function addGrowthCond(){_growthNewConds.push({f:'G',op:'>=',v:'0'});renderGrowthModalBody();}
function removeGrowthCond(i){_growthNewConds.splice(i,1);renderGrowthModalBody();}
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
  _growthNewConds=[];renderGrowthModalBody();reapplyAnaToAll();
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
  bar.innerHTML=`<div class="tf-all-wrap">${allPill}</div><div class="tf-rows">${row1}${row2}</div>`;
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
  if(s.tagFilters?.length)list=list.filter(r=>s.tagFilters.some(l=>r.analysis?.label===l||r.growthAnalysis?.label===l));
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
    const kpi=document.getElementById('header-kpi-block');if(kpi)kpi.style.display='flex';
    const btnB=document.getElementById('header-btn-block');if(btnB)btnB.style.display='flex';
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
  const analysis=calcAnalysis(adsFee,pureRate,targetROI,roiDiff,r.clicks,pureProfit);
  const growthRate=r.growthRate;
  const growthAnalysis=shop==='好麻吉'?calcGrowthAnalysis(growthRate,rev,r.prevRev,pureRate):null;
  Object.assign(built[idx],{adsFee,platFee,pureProfit,pureRate,adsPct,targetROI,roiDiff,dayBudget,analysis,growthAnalysis});
  const s=state[shop];lsSave(shop,s.curMonth,s.curHalf,built,s._period,s._days);
}

// ── Note modal ──
const PROFIT_COLS=[
  {key:'adsFee',label:'廣告費'},{key:'rev',label:'營收'},{key:'gross',label:'毛利'},
  {key:'pureProfit',label:'淨利'},{key:'pureRate',label:'淨利率%'},{key:'adsPct',label:'廣告佔比'},
  {key:'stock',label:'可用庫存'},{key:'targetROI',label:'目標ROI'},{key:'directROI',label:'直接ROI'},
  {key:'roi',label:'投入產出'},{key:'roiDiff',label:'實際-目標'},{key:'clicks',label:'點擊數'},
  {key:'dayBudget',label:'日預算'},{key:'analysisLabel',label:'分析'},{key:'note',label:'調整'},
  {key:'growthRate',label:'成長比',grow:true},{key:'growthAnalysis',label:'成長分析',grow:true},{key:'growthNote',label:'成長調整',grow:true},
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
function renderColPicker(shop){
  const m=document.getElementById('colpick-'+shop);if(!m)return;
  const hc=getHiddenCols(shop);
  const cols=PROFIT_COLS.filter(c=>!c.grow||shop==='好麻吉');
  const vis=cols.length-hc.size;
  m.innerHTML=`<div style="padding:6px 13px 4px;font-size:11px;color:#9ca3af;font-weight:700;display:flex;justify-content:space-between;align-items:center">欄位 <span>${vis}/${cols.length}</span></div>`
    +cols.map(c=>`<div class="cp-row" onclick="toggleHiddenCol('${shop}','${c.key}');event.stopPropagation()">
      <input type="checkbox" ${!hc.has(c.key)?'checked':''} style="margin:0;pointer-events:none"> ${c.label}
    </div>`).join('')
    +`<div style="padding:4px 13px 6px;border-top:1px solid #e5e7eb;text-align:right">
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
  applyFilters(shopKey.split('|')[0].replace('_growth',''));
}
function deleteProfitNote(origIdx){
  if(!_pnm)return;
  const {shopKey,code}=_pnm;
  const notes=getNotes(shopKey);if(!notes[code])return;
  if(typeof notes[code]==='string')notes[code]={adjustments:[{date:'',text:notes[code]}]};
  notes[code].adjustments.splice(origIdx,1);
  if(!notes[code].adjustments.length)delete notes[code];
  saveNotes(shopKey,notes);renderPnmList();applyFilters(shopKey.replace('_growth',''));
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
  setKpis(shop,tRev,tGross,tAds,tPure);
  document.getElementById('period-tag-'+shop).textContent=s._period||'';
  document.getElementById('cnt-'+shop).textContent=list.length+' 筆';

  const ss=s.sorts||{};
  const si=(col)=>ss.col===col?(ss.dir==='asc'?' ▲':' ▼'):'';
  const hasF=(col)=>!!(s.filters?.[col])||ss.col===col;
  const thN=(col,label)=>`<th><div class="th-wrap"><span onclick="setSort('${shop}','${col}',ss.col==='${col}'&&ss.dir==='asc'?'desc':'asc')" style="cursor:pointer">${label}${si(col)}</span><button class="filter-btn ${hasF(col)?'on':''}" onclick="event.stopPropagation();openFilter('${shop}','${col}',true,this)">▾</button></div></th>`;
  const thT=(col,label,sticky='')=>`<th class="tl" style="${sticky}"><div class="th-wrap tl"><span onclick="setSort('${shop}','${col}',ss.col==='${col}'&&ss.dir==='asc'?'desc':'asc')" style="cursor:pointer">${label}${si(col)}</span><button class="filter-btn ${hasF(col)?'on':''}" onclick="event.stopPropagation();openFilter('${shop}','${col}',false,this)">▾</button></div></th>`;

  const hc=getHiddenCols(shop);const vc=k=>!hc.has(k);
  let html=`<div class="tscroll"><table><thead><tr>
    ${thT('code','編號','position:sticky;left:0;z-index:4;background:#f8f9fc')}
    ${thT('name','名稱 / ID','position:sticky;left:60px;z-index:4;background:#f8f9fc')}
    ${vc('adsFee')?thN('adsFee','廣告費'):''}
    ${vc('rev')?thN('rev',shop==='好麻吉'?'營收 / 上半月':'營收'):''}
    ${vc('gross')?thN('gross','毛利'):''}
    ${vc('pureProfit')?thN('pureProfit','淨利'):''}
    ${vc('pureRate')?thN('pureRate','淨利率%'):''}
    ${vc('adsPct')?thN('adsPct','廣告佔比'):''}
    ${vc('stock')?thN('stock','可用庫存'):''}
    ${vc('targetROI')?thN('targetROI','目標ROI'):''}
    ${vc('directROI')?thN('directROI','直接ROI'):''}
    ${vc('roi')?thN('roi','投入產出'):''}
    ${vc('roiDiff')?thN('roiDiff','實際-目標'):''}
    ${vc('clicks')?thN('clicks','點擊數'):''}
    ${vc('dayBudget')?thN('dayBudget','日預算'):''}
    ${vc('analysisLabel')?thT('analysisLabel','分析'):''}
    ${vc('note')?'<th class="tl">調整</th>':''}
    ${shop==='好麻吉'?`
    ${vc('growthRate')?thN('growthRate','成長比'):''}
    ${vc('growthAnalysis')?thT('growthAnalysisLabel','成長分析'):''}
    ${vc('growthNote')?'<th class="tl">成長調整</th>':''}`:''}
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

    if(!r.fromMobic){
      const adsId=`td-${shop}-${r.code}-adsFee`;
      const pc=r.pureProfit>=0?'td-pos':'td-neg';
      const noRevSpan1=[vc('rev'),vc('gross')].filter(Boolean).length;
      const noRevSpan2=[vc('pureRate'),vc('adsPct'),vc('stock'),vc('targetROI'),vc('directROI'),vc('roi'),vc('roiDiff'),vc('clicks'),vc('dayBudget'),vc('analysisLabel')].filter(Boolean).length;
      html+=`<tr class="tr-no-rev">
        <td class="tl td-code" style="position:sticky;left:0;background:#fff;z-index:2">${r.code}</td>
        <td class="tl td-name" style="position:sticky;left:60px;background:#fff;z-index:2;color:#9ca3af">${r.name}<div class="sub-id">ID: ${idStr}</div></td>
        ${vc('adsFee')?`<td class="td-num td-amber ${isEdited('adsFee')?'cell-edited':''}" id="${adsId}" onclick="startEdit('${shop}','${r.code}','adsFee','${adsId}')" style="cursor:pointer" title="點擊編輯"><span class="cell-val">${fmtAds(r.adsFee)}</span></td>`:''}
        ${noRevSpan1>0?`<td colspan="${noRevSpan1}" style="color:#d1d5db;text-align:center;font-size:12px">—</td>`:''}
        ${vc('pureProfit')?`<td id="td-${shop}-${r.code}-pureProfit" class="td-num ${pc}">$${fmtN(r.pureProfit)}</td>`:''}
        ${noRevSpan2>0?`<td colspan="${noRevSpan2}" style="color:#d1d5db;text-align:center;font-size:12px">— 無銷售資料 —</td>`:''}
        ${vc('note')?buildNoteCell(noteKey,r.code,noteId,(()=>{const ec=notes[r.code];const rn=r.note?{adjustments:[{date:'',text:r.note}]}:null;if(ec&&rn){return{adjustments:[...rn.adjustments,...(ec.adjustments||[])]}}return ec||rn;})()):''}
        ${shop==='好麻吉'?(()=>{const gnoteId=`gnote-${shop}-${r.code}`;return`${vc('growthRate')?'<td></td>':''}${vc('growthAnalysis')?'<td></td>':''}${vc('growthNote')?buildNoteCell(shop+'_growth',r.code,gnoteId,getNotes(shop+'_growth')[r.code]):''}`;})():''}
      </tr>`;
    }else{
      html+=`<tr>
        <td class="tl td-code" style="position:sticky;left:0;background:#fff;z-index:2">${r.code}</td>
        <td class="tl td-name" style="position:sticky;left:60px;background:#fff;z-index:2">${r.name}<div class="sub-id">ID: ${idStr}</div></td>
        ${vc('adsFee')?editTd('adsFee',fmtAds(r.adsFee),'td-amber'):''}
        ${vc('rev')?`<td class="td-num">$${fmtN(r.rev)}${shop==='好麻吉'?`<div class="sub-rev">${r.prevRev!==null?'上半月 $'+fmtN(r.prevRev):'—'}</div>`:''}</td>`:''}
        ${vc('gross')?`<td class="td-num">$${fmtN(r.gross)}</td>`:''}
        ${vc('pureProfit')?`<td id="td-${shop}-${r.code}-pureProfit" class="td-num ${pc}">$${fmtN(r.pureProfit)}</td>`:''}
        ${vc('pureRate')?`<td id="td-${shop}-${r.code}-pureRate">${pill(r.pureRate*100)}</td>`:''}
        ${vc('adsPct')?`<td id="td-${shop}-${r.code}-adsPct" class="td-num">${(r.adsPct*100).toFixed(2)}%</td>`:''}
        ${vc('stock')?`<td class="td-num">${r.stock.toLocaleString()}</td>`:''}
        ${vc('targetROI')?`<td id="td-${shop}-${r.code}-targetROI" class="td-num">${r.targetROI!==null?r.targetROI.toFixed(2):'—'}</td>`:''}
        ${vc('directROI')?`<td class="td-num">${r.directROI>0?r.directROI.toFixed(2):'—'}</td>`:''}
        ${vc('roi')?`<td class="td-num">${r.roi>0?r.roi.toFixed(2):'—'}</td>`:''}
        ${vc('roiDiff')?`<td id="td-${shop}-${r.code}-roiDiff" class="td-num">${roiDiffStr}</td>`:''}
        ${vc('clicks')?`<td class="td-num">${r.clicks>0?r.clicks.toLocaleString():'—'}</td>`:''}
        ${vc('dayBudget')?`<td id="td-${shop}-${r.code}-dayBudget" class="td-num">${r.dayBudget>0?'$'+fmtN(r.dayBudget):'—'}</td>`:''}
        ${vc('analysisLabel')?`<td id="td-${shop}-${r.code}-analysis" class="tl">${anaHtml}</td>`:''}
        ${vc('note')?buildNoteCell(noteKey,r.code,noteId,(()=>{const ec=notes[r.code];const rn=r.note?{adjustments:[{date:'',text:r.note}]}:null;if(ec&&rn){return{adjustments:[...rn.adjustments,...(ec.adjustments||[])]}}return ec||rn;})()):''}
        ${shop==='好麻吉'?(()=>{
          const gnoteId=`gnote-${shop}-${r.code}`;
          return `
          ${vc('growthRate')?`<td class="td-num" style="text-align:center">${r.growthRate===null?'<span style="color:#9ca3af">—</span>':`<span style="color:${r.growthRate>=0?'#10b981':'#ef4444'};font-weight:700">${r.growthRate>=0?'↑':'↓'} ${Math.abs(r.growthRate*100).toFixed(0)}%</span>`}</td>`:''}
          ${vc('growthAnalysis')?`<td class="tl">${r.growthAnalysis&&r.growthAnalysis.label?`<span class="tag ${r.growthAnalysis.cls}">${r.growthAnalysis.label}</span>`:'—'}</td>`:''}
          ${vc('growthNote')?buildNoteCell(shop+'_growth',r.code,gnoteId,getNotes(shop+'_growth')[r.code]):''}`;
        })():''}
      </tr>`;
    }
    rowIdx++;
  });

  let fRev=0,fGross=0,fAds=0,fPure=0,fQty=0;
  list.forEach(r=>{fRev+=r.rev;fGross+=r.gross;fAds+=r.adsFee;fPure+=r.pureProfit;fQty+=r.qty;});
  let fPrevRev=0; list.forEach(r=>{if(r.prevRev)fPrevRev+=r.prevRev;});
  const fGrowth=(fPrevRev>0)?(fRev-fPrevRev)/fPrevRev:null;
  html+=`<tr class="tr-total">
    <td class="tl" colspan="2">小計（${list.length}筆）</td>
    <td class="td-num td-amber">$${fmtN(fAds)}</td>
    <td class="td-num">$${fmtN(fRev)}${shop==='好麻吉'?`<div class="sub-rev">$${fmtN(fPrevRev)}</div>`:''}</td>
    <td class="td-num">$${fmtN(fGross)}</td>
    <td class="td-num ${fPure>=0?'td-pos':'td-neg'}">$${fmtN(fPure)}</td>
    <td>${fRev>0?pill(fPure/fRev*100):'—'}</td>
    <td colspan="9"></td>
    <td></td>
    ${shop==='好麻吉'?`
    <td class="td-num" style="text-align:center">${fGrowth===null?'<span style="color:#9ca3af">—</span>':`<span style="color:${fGrowth>=0?'#10b981':'#ef4444'};font-weight:700">${fGrowth>=0?'↑':'↓'} ${Math.abs(fGrowth*100).toFixed(0)}%</span>`}</td>
    <td></td><td></td>`:''}
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
function saveSummaryRows(rows){
  window._summaryJustSaved=Date.now();
  try{localStorage.setItem('ec_summary_v1',JSON.stringify(rows));}catch{}
  _cloudWriteSafe('_summary_v1', rows, '總表');
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
  rows.push({id:'sw_'+Date.now(),start,end,shops:{}});
  rows.sort((a,b)=>a.start.localeCompare(b.start));
  saveSummaryRows(rows);
  btn.closest('.ana-overlay').remove();
  renderSummary();
}
function deleteSummaryRow(id){
  if(!confirm('確定刪除這週的資料？'))return;
  saveSummaryRows(getSummaryRows().filter(r=>r.id!==id));
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
    if(!isNaN(v)&&v>0)row.shops[shop][field]=v;else delete row.shops[shop][field];
    saveSummaryRows(rows);
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
  const kpiBlock=document.getElementById('header-kpi-block');
  const btnBlock=document.getElementById('header-btn-block');
  if(kpiBlock)kpiBlock.style.display=isSummary?'none':'flex';
  if(btnBlock)btnBlock.style.display=isSummary?'none':'flex';
  // sync global export button
  const gb=document.getElementById('global-exp-btn');
  if(gb){
    if(shop==='總表'){gb.disabled=true;}
    else{gb.disabled=!(state[shop]?._built?.length);}
  }
  if(shop==='總表')renderSummary();
  else{if(state[shop]?._built?.length)applyFilters(shop);syncHeaderKpis(shop);}
}

const MOMO_SHOPS=['總表','甲配','乙配','MO+麻吉','MO+森之旅'];
let curMomoShop=null;

function momoShopHTML(shop){return`
  <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb">
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">本期總營收</div><div style="font-size:20px;font-weight:700;color:#374151">—</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">本期純利</div><div style="font-size:20px;font-weight:700;color:#10b981">—</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">月份</div><div style="font-size:16px;font-weight:600;color:#374151">—</div></div>
    <div><div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">區間</div><div style="font-size:16px;font-weight:600;color:#374151">—</div></div>
    <div style="margin-left:auto;display:flex;gap:8px">
      <button class="export-btn" disabled style="opacity:0.4;cursor:default">⬆ 上傳檔案</button>
      <button class="export-btn" disabled style="opacity:0.4;cursor:default">☁ 同步雲端</button>
      <button class="export-btn" disabled style="opacity:0.4;cursor:default">⬇ 匯出 Excel</button>
    </div>
  </div>
  <div style="background:#f9fafb;border:1.5px dashed #d1d5db;border-radius:10px;padding:48px;text-align:center;color:#9ca3af">
    <div style="font-size:36px;margin-bottom:8px">📊</div>
    <div style="font-size:14px;font-weight:600">階層分布圖</div>
    <div style="font-size:12px;margin-top:4px">上傳資料後可查看</div>
  </div>`;}

function setMomoShop(shop,btn){
  curMomoShop=shop;
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.querySelectorAll('.shop-content').forEach(el=>el.classList.remove('active'));
  const el=document.getElementById('momo-content-'+shop);
  if(el){el.classList.add('active');if(!el.dataset.init){el.innerHTML=momoShopHTML(shop);el.dataset.init='1';}}
  const kpiBlock=document.getElementById('header-kpi-block');
  const btnBlock=document.getElementById('header-btn-block');
  if(kpiBlock)kpiBlock.style.display='none';
  if(btnBlock)btnBlock.style.display='none';
}

function updateHalfBtnLabels(shop){
  const m=state[shop]?.curMonth||'2026/05';
  const[y,mo]=m.split('/');
  const last=new Date(+y,+mo,0).getDate();
  const curHalf=state[shop]?.curHalf||'first';
  const btns=[
    {id:'first',label:`${mo}/1–${mo}/15`},
    {id:'second',label:`${mo}/16–${mo}/${last}`},
    {id:'full',label:`${mo}/1–${mo}/${last}`},
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

Object.assign(window, {
  _cloudRead,_cloudWrite,_cloudWriteSafe,_doGenerate,_showSyncBtn,addGrowthCond,addNewAnaCond,
  applyFilters,applyFpNum,applyFpTxt,buildDistHtml,buildNoteCell,buildShop,calcAnalysis,
  calcGrowthAnalysis,checkAdsReconcile,checkReady,clearColFilter,closeAdsEditModal,
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
  openUploadModal,outsideClick,parseAdsCsv,patchRow,pill,readGrowthNewConds,readNewConds,
  reapplyAnaToAll,recalcRow,removeGroupAds,removeGrowthCond,removeNewCond,renderAnaModalBody,
  renderColPicker,renderGroupAdsCards,renderGrowthModalBody,renderPnmList,renderSummary,
  renderTable,resetHiddenCols,resetUploadCards,restoreAnaTag,restoreGrowthTag,saveAnaSettings,
  saveAnaThresh,saveCustomAnaRules,saveCustomGrowthRules,saveEdits,saveGroupAdsMeta,
  saveGrowthSettings,saveGrowthThresh,saveNotes,saveSummaryRows,saveTagFilters,setColFilter,
  setKpis,setMomoShop,setShop,setSort,setSpin,setTagFilter,shopHTML,showMapWarnBanner,splitCSV,
  startEdit,startNote,submitNewAnaRule,submitNewGrowthRule,submitProfitNote,syncHeaderKpis,
  syncToCloud,toggleHiddenCol,toggleTagPopup,toggleTfDrop,tryLoadSaved,umHideDrop,umSearch,
  umSelect,umSetAll,umToggle,updateAdsEditPreview,updateDaysBadge,updateHalfBtnLabels,
  updateTagFilterBar,validateMapWarnings,
});
