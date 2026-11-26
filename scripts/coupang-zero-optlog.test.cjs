// 酷澎第 3 塊「零動銷彈窗加優化紀錄」（2026-11-26）測試：node scripts/coupang-zero-optlog.test.cjs
//   從 js/profit.js 抽 CUP-ZOL-PURE（錨點、新紀錄形狀、這個 Wing 商品的紀錄、格子 HTML），
//   CUP_BACKUP_JSON=<v3 備份檔> node scripts/coupang-zero-optlog.test.cjs   ← 另外用真實主檔／報表看 2026-06～10 每列都有錨點、'p:' 列數
//   資料預設全是合成的假資料；不碰瀏覽器、不碰雲端。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert'), cp=require('child_process');
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'js','profit.js'),'utf8').replace(/\r\n/g,'\n');
const app=fs.readFileSync(path.join(ROOT,'js','app.js'),'utf8').replace(/\r\n/g,'\n');
const between=(s,a,b)=>{ const i=s.indexOf(a), j=s.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(s.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return s.slice(i,j+b.length); };
const fnSrc=(s,name)=>{ const i=s.indexOf('\nfunction '+name+'('); if(i<0) throw new Error('找不到 '+name); const j=s.indexOf('\n}\n',i); return s.slice(i,j+3); };
const T=new Function(between(src,'/* ═══ CUP-ZOL-PURE-BEGIN','/* ═══ CUP-ZOL-PURE-END ═══ */')+
  '\nreturn { cupZolAnchor, cupZolMakeEntry, cupZolIndex, cupZolUnitListIdx, cupZolUnitList, cupZolLatest, cupZolNote, cupZolLeave, cupZolCellView, cupZolCellInnerHTML, CUP_ZOL_UNSAVED_MSG };')();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const TYPES=['商品內容優化','調價','上下架','相關商品','影片','五星好評','做活動','其他'];

// ── 錨點：最小的原廠編號 ──
ok(T.cupZolAnchor(['H249-03','H249-01','H249-02'])==='H249-01','亂序取最小');
ok(T.cupZolAnchor(['B','A','A',' C '])==='A','重複、前後空白');
ok(T.cupZolAnchor([])===''&&T.cupZolAnchor(null)===''&&T.cupZolAnchor(['',null])==='','沒有原廠編號 ⇒ 空字串');
ok(T.cupZolAnchor(['F421-12','F421-01','F421-11'])==='F421-01','燕麥杯錨點 F421-01');

// ── 新紀錄形狀：key 順序跟 momoAddOptlog 一樣，最後多 sid ──
{ const e=T.cupZolMakeEntry('麻吉','H249-01',{type:'調價',note:'售價 590 → 529'},'inna','2026-11-26','14:05','opt_1_2','1134696003491933');
  ok(eq(Object.keys(e),['id','date','time','shop','sku','by','type','note','sid']),'key 順序 id,date,time,shop,sku,by,type,note,sid');
  ok(e.sid==='1134696003491933'&&typeof e.sid==='string'&&e.type==='調價'&&e.note==='售價 590 → 529','內容');
  ok(T.cupZolMakeEntry('麻吉','X',{},'', 'd','t','i',123).type==='其他'&&T.cupZolMakeEntry('麻吉','X',{},'','d','t','i',123).sid==='123','沒給類型 ⇒ 其他；sid 轉字串');
  // momoAddOptlog 的物件寫法沒變（{ id, ...momoNowParts(), shop, sku, by, type, note }），新紀錄只是在最後多一個 sid
  const add=fnSrc(src,'momoAddOptlog');
  ok(add.includes("map[sku].push({ id:'opt_'+Date.now()+'_'+Math.floor(Math.random()*100000), ...momoNowParts(), shop, sku, by, type, note:txt });"),'momoAddOptlog 的紀錄寫法沒變');
  ok(/return \{\s*date:[^\n]*\n\s*time:/.test(fnSrc(src,'momoNowParts')),'momoNowParts 只有 date、time'); }

// ── 這個 Wing 商品的紀錄 ──
const SID='1134696003491933', OTHER='1134696002411485';
const r=(id,sku,o)=>Object.assign({id,date:'2026-11-2'+(id.length%9),time:'10:0'+(id.length%9),shop:'麻吉',sku,by:'inna',type:'調價',note:'n'+id},o||{});
const map={
  'H249-01':[ r('a1','H249-01',{sid:SID}), r('a2','H249-01'), r('a3','H249-01',{sid:OTHER}) ],
  'H249-02':[ r('b1','H249-02') ],
  'ZZZ-9':[ r('c1','ZZZ-9',{sid:SID}) ],                     // 掛在別的原廠編號底下，但 sid 是這個 ⇒ 也算
  'Q-1':[ r('d1','Q-1') ],                                     // 不是這個 sid 的原廠編號、沒有 sid ⇒ 不算
  'bad':'not array', 'H249-03':[null, 5, r('a1','H249-03',{sid:SID})],   // 同 id 只一筆；壞資料略過
};
const before=JSON.stringify(map);
{ const L=T.cupZolUnitList(map,['H249-01','H249-02','H249-03'],SID), ids=L.map(e=>e.id+'@'+e.sku);
  ok(ids.includes('a1@H249-01')&&ids.includes('c1@ZZZ-9'),'sid 相同：掛在哪個原廠編號都找得到');
  ok(ids.includes('a2@H249-01')&&ids.includes('b1@H249-02'),'這個 sid 的原廠編號底下沒有 sid 欄的紀錄');
  ok(!ids.some(x=>x.startsWith('a3'))&&!ids.some(x=>x.startsWith('d1')),'別的 sid、別的原廠編號不算');
  ok(L.filter(e=>e.id==='a1').length===1&&L.length===4,'同 id 只一筆，共 4 筆');
  ok(JSON.stringify(map)===before,'不改動傳進來的資料');
  ok(eq(T.cupZolUnitList(map,['H249-01'],OTHER).map(e=>e.id),['a3','a2']),'另一個 sid 共用 H249-01：只有自己的 sid 紀錄＋沒有 sid 欄的');
  ok(T.cupZolUnitList(null,['X'],'1').length===0&&T.cupZolUnitList([],null,'1').length===0,'沒有資料不丟錯'); }

// ── 最近一筆、格子 HTML ──
{ ok(T.cupZolLatest([{date:'2026-11-01',time:'10:00',id:'x'},{date:'2026-11-02',time:'09:00',id:'y'},{date:'2026-11-02',time:'09:00',id:'z'}]).id==='z','最近一筆：日期時間最大、同時間取後面');
  ok(T.cupZolLatest([])===null,'空清單 null');
  ok(T.cupZolLeave('  ')==='close'&&T.cupZolLeave(' a ')==='stay'&&T.cupZolNote(null)==='','空白 close／有字 stay');
  const deps={esc,types:TYPES,nameOf:u=>u==='inna'?'Inna':''};
  const empty=T.cupZolCellInnerHTML([],null,deps), load=T.cupZolCellInnerHTML([],null,Object.assign({loading:true},deps));
  ok(empty.includes('輸入優化紀錄…')&&empty.includes('onclick="event.stopPropagation();cupZeroOptlogCellEdit(this)"'),'空的：輸入優化紀錄…＋點擊開編輯');
  ok(load.includes('優化紀錄載入中…')&&!load.includes('輸入優化紀錄…'),'雲端還沒到：載入中，不顯示「輸入優化紀錄…」');
  const ns=T.cupZolCellInnerHTML([r('a1','H249-01',{sid:SID})],{type:'調價',note:'x'},Object.assign({noSid:true},deps));
  ok(ns.includes('主檔沒有 Wing 商品 ID，這一列不能記')&&!/cupZeroOptlogCell(Edit|Save)/.test(ns),'主檔沒有 sid：不能記、沒有任何寫入 handler');
  const L=T.cupZolUnitList(map,['H249-01','H249-02','H249-03'],SID), v=T.cupZolCellInnerHTML(L,null,deps);
  ok(v.includes('共 4 筆')&&v.includes('cupZeroOptlogListOpen(this)'),'有紀錄：共 N 筆、可以開清單');
  const iEdit=v.indexOf('cupZeroOptlogCellEdit'), iDivEnd=v.indexOf('</div>',iEdit), iN=v.indexOf('共 4 筆');
  ok(iEdit>0&&iDivEnd>0&&iN>iDivEnd,'「共 N 筆」不在掛了 cupZeroOptlogCellEdit 的元素裡');
  const ed=T.cupZolCellInnerHTML(L,{type:'其他',note:'加廣告 "200"',warn:true},deps);
  ok(ed.includes('value="加廣告 &quot;200&quot;"')&&ed.includes('<option value="其他" selected>'),'編輯中：草稿與類型帶回去（有跳脫）');
  ok(ed.includes('pch-ol-warn')&&ed.includes(T.CUP_ZOL_UNSAVED_MSG),'警示色＋提示');
  ok(ed.includes(`onkeydown="if(event.key==='Enter'&&!event.isComposing)cupZeroOptlogCellSave(this);else if(event.key==='Escape')cupZeroOptlogCellCancel()"`),'Enter 存、Esc 放棄');
  ok(ed.includes('onclick="cupZeroOptlogCellSave(this)">✓</button>')&&ed.includes('onclick="cupZeroOptlogCellCancel()">✕</button>'),'✓ 存、✕ 取消');
  const v1=T.cupZolCellView([r('a1','H249-01',{sid:SID})],deps.nameOf), v2=T.cupZolCellView([r('a2','H249-01')],deps.nameOf);
  ok(v1.title.includes('Wing 商品 ID '+SID)&&v1.title.includes('Inna')&&v2.title.includes('原廠編號 H249-01'),'滑鼠提示寫 Wing 商品 ID 或原廠編號');
  ok(!/pchomeOptlog/.test(between(src,'/* ═══ CUP-ZOL-PURE-BEGIN','/* ═══ CUP-ZOL-PURE-END ═══ */')),'沒有呼叫 PChome 那組'); }

// ── 真實備份 ──
const BK=process.env.CUP_BACKUP_JSON;
if(BK){
  const fnSrc2=name=>fnSrc(src,name);
  const Z=new Function(['function cupKpi(){ return {}; }', between(src,'/* ═══ CUP-PM-PURE-BEGIN','/* ═══ CUP-PM-PURE-END ═══ */'), fnSrc2('cupOvCalc'),
    between(src,'/* ═══ CUP-ZERO-PURE-BEGIN','/* ═══ CUP-ZERO-PURE-END ═══ */'), 'return { _czBuild };'].join('\n'))();
  const d=JSON.parse(fs.readFileSync(BK,'utf8'));
  const dec=v=>{ if(v==null) return v; if('stringValue' in v) return v.stringValue; if('integerValue' in v) return Number(v.integerValue); if('doubleValue' in v) return v.doubleValue; if('booleanValue' in v) return v.booleanValue; if('nullValue' in v) return null;
    if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec); if('mapValue' in v){ const o={}; for(const k in (v.mapValue.fields||{})) o[k]=dec(v.mapValue.fields[k]); return o; } if('timestampValue' in v) return v.timestampValue; return v; };
  const get=k=>{ const x=d[k]; if(!x||!x.fields) return null; const o={}; for(const f in x.fields) o[f]=dec(x.fields[f]); return o; };
  [['maji','麻吉'],['luying','露營館']].forEach(([id,shop])=>{
    const items=[]; let latest=''; for(let i=0;i<4;i++){ const s=get('coupang_products/'+id+'_'+i); if(!s) continue; items.push(...s.items); if(s.latestExport>latest) latest=s.latestExport; }
    ['2026-06','2026-07','2026-08','2026-09','2026-10'].forEach(m=>{ const rep=get('coupang_reports/'+id+'_'+m); if(!rep) return;
      const z=Z._czBuild({doc:{schema:1,latestExport:latest,items},rows:rep.rows,prevRows:null,hist:[],names:{byDisp:{},byCode:{},byOther:{}}});
      const all=['have','zero','unknown'].flatMap(g=>z.groups[g]), pU=all.filter(x=>String(x.unit).startsWith('p:')).length, noA=all.filter(x=>!T.cupZolAnchor(x.codes)).length;
      console.log('[備份] '+shop+' '+m+'：零動銷 '+all.length+' 列，主檔沒有 sid（p:）'+pU+' 列，沒有錨點 '+noA+' 列');
      ok(all.filter(x=>!String(x.unit).startsWith('p:')).every(x=>T.cupZolAnchor(x.codes)),'[備份] '+shop+' '+m+' 有 sid 的列都有錨點'); });
    const ol=get('app/optlog_'+shop); if(ol) console.log('[備份] app/optlog_'+shop+'：items '+Object.keys(ol.items||{}).length+'、tomb '+Object.keys(ol.tomb||{}).length);
  });
}
console.log('coupang-zero-optlog: '+n+' 項通過'+(BK?'（含真實備份）':''));
