// 酷澎第 1 塊「Wing 商品 ID」（2026-11-25）測試：node scripts/coupang-wing-id.test.cjs
//   Wing 商品 ID＝price_inventory A 欄「供應商商品ID」＝主檔 sid。只顯示與搜尋，不改任何數字。
//   從 js/profit.js 抽 CUP-PM-PURE（cupSidIndex／cupSidLookup／cupSidText）、cupSidOf／cupIdSubHtml 包裝、CUP-PG-PURE（cupGroupFilter）、CUP-ZERO-PURE（_czBuild 的 sids）。
//   CUP_BACKUP_JSON=<v3 備份檔> node scripts/coupang-wing-id.test.cjs   ← 另外用真實主檔驗燕麥杯、醫藥包、多 sid 頁（只印數字與 ID，不印品名）
//   資料預設全是合成的假資料；不碰瀏覽器、不碰雲端。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8').replace(/\r\n/g,'\n');
const between=(a,b,incl)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(src.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return src.slice(i, incl===false?j:j+b.length); };
const code=[
  'const _momoEsc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");',
  'let __docs={}, _cupProdBad={}; function cupLoadProducts(shop){ return __docs[shop]||null; }',
  between('/* ═══ CUP-PM-PURE-BEGIN','/* ═══ CUP-PM-PURE-END ═══ */'),
  between('const _cupSidIdxCache','// 寫本機：LZ1',false),
  between('/* ═══ CUP-PG-PURE-BEGIN','/* ═══ CUP-PG-PURE-END ═══ */'),
  between('/* ═══ CUP-ZERO-PURE-BEGIN','/* ═══ CUP-ZERO-PURE-END ═══ */'),
  'return { cupSidIndex, cupSidLookup, cupSidText, cupSidOf, cupIdSubHtml, cupGroupByPage, cupGroupFilter, _czBuild, cupProductsListed, cupSellThroughCalc,',
  '  setDocs:d=>{ __docs=d; }, setBad:b=>{ _cupProdBad=b; } };' ].join('\n');
const T=new Function(code)();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const LT='2026-11-17 20:50:12';
const it=(sku,pid,sid,code,stock)=>({sku,pid,sid,code,stock:stock==null?1:stock,status:'판매중',lastSeen:LT});

// 合成主檔：燕麥杯（三個選項兩頁、同一個 sid）、醫藥包（四頁同一個 sid）、多 sid 頁、沒有 sid 的選項
const OAT='1134696003491861', BAG='1134696003491933';
const doc={schema:1,latestExport:LT,items:[
  it('595827072335873','595827072335878',OAT,'F421-01'),
  it('702043094024202','702043094007833',OAT,'F421-11'),
  it('702043094138890','702043094007833',OAT,'F421-12'),
  it('b1','606736880746498',BAG,'H249-01'), it('b2','606714264993794',BAG,'H249-02'),
  it('b3','606714353074176',BAG,'H249-03'), it('b4','606718262214656',BAG,'H249-04'),
  it('m1','590679256252419','1134696003491166','M-1'), it('m2','590679256252419','1134696002411485','M-2'),
  it('n1','P-NOSID','','NS-1'),
]};

// ── 純函式：cupSidIndex／cupSidLookup ──
{ const idx=T.cupSidIndex(doc);
  ['F421-01','F421-11','F421-12'].forEach(c=>ok(T.cupSidLookup(idx,null,c)===OAT,c+' 用原廠編號 → '+OAT));
  ok(T.cupSidLookup(idx,'595827072335878','F421-01')===OAT&&T.cupSidLookup(idx,'702043094007833','F421-11')===OAT,'燕麥杯兩頁都是同一個 sid');
  ['606736880746498','606714264993794','606714353074176','606718262214656'].forEach(p=>ok(T.cupSidLookup(idx,p,'')===BAG,'醫藥包 '+p+' → '+BAG));
  ok(eq(T.cupSidLookup(idx,'590679256252419',''),['1134696002411485','1134696003491166']),'一頁掛兩個 sid ⇒ 排序過的陣列');
  ok(T.cupSidLookup(idx,'NOPE','NOPE')===null,'都查不到 ⇒ null');
  ok(T.cupSidLookup(idx,'P-NOSID','NS-1')===null,'選項沒有 sid ⇒ null（不回空字串）');
  ok(T.cupSidLookup(idx,'NOPE','F421-12')===OAT,'dispId 查不到 ⇒ 退回原廠編號');
  ok(T.cupSidLookup(idx,'595827072335878','M-1')===OAT,'dispId 查得到就不看原廠編號');
  ok(eq(T.cupSidLookup(idx,' 595827072335878 / 606736880746498 ',''),[OAT,BAG].sort()),'"A/B" 拆開取聯集');
  ok(T.cupSidLookup(null,'595827072335878','F421-01')===null,'沒有對照表 ⇒ null');
  ok(T.cupSidText(null)===''&&T.cupSidText(OAT)===OAT&&T.cupSidText(['1','2'])==='1、2','cupSidText');
  ok(eq(T.cupSidIndex(null),{byPid:{},byCode:{}}),'沒有主檔不丟錯'); }

// ── 包裝：cupSidOf（主檔沒到 ⇒ null）、cupIdSubHtml（沒有 sid ⇒ 跟改版前逐字相同） ──
{ T.setDocs({}); T.setBad({});
  ok(T.cupSidOf('麻吉','595827072335878','F421-01')===null,'主檔沒到 ⇒ null');
  const old=did=>`<div class="mm-sub-line" title="酷澎商品編號 ${did}">酷澎編號 ${did}</div>`;
  ok(T.cupIdSubHtml('麻吉','595827072335878','F421-01')===old('595827072335878'),'主檔沒到 ⇒ 小字跟改版前逐字相同');
  ok(T.cupIdSubHtml('麻吉','','F421-01')==='','沒有 dispId 也沒有 sid ⇒ 空字串（同改版前）');
  T.setDocs({'麻吉':doc});
  ok(T.cupSidOf('麻吉','595827072335878','F421-01')===OAT,'主檔到了 ⇒ 查得到');
  const h=T.cupIdSubHtml('麻吉','702043094007833','F421-11');
  ok(h.includes('>Wing 商品 ID '+OAT+'｜頁 702043094007833</div>'),'小字格式「Wing 商品 ID {sid}｜頁 {dispId}」');
  ok(T.cupIdSubHtml('麻吉','NOPE','NOPE')===old('NOPE'),'查不到 sid ⇒ 照舊');
  ok(T.cupIdSubHtml('麻吉','590679256252419','').includes('Wing 商品 ID 1134696002411485、1134696003491166｜'),'多 sid 用「、」接');
  T.setBad({'麻吉':true}); ok(T.cupSidOf('麻吉','595827072335878','F421-01')===null,'本機主檔讀不到 ⇒ null'); T.setBad({}); }

// ── 搜尋：cupGroupFilter 第三個參數（沒給 ⇒ 行為同改版前） ──
{ const rows=[{code:'F421-01',name:'燕麥杯 A',dispId:'595827072335878'},{code:'F421-11',name:'燕麥杯 B',dispId:'702043094007833'},{code:'F421-12',name:'燕麥杯 C',dispId:'702043094007833'},{code:'Z-1',name:'別的',dispId:'X1'}];
  const G=T.cupGroupByPage(rows);
  const sidOf=r=>T.cupSidText(T.cupSidOf('麻吉',r.dispId,r.code));
  ok(T.cupGroupFilter(G.items,OAT).length===0,'沒給 sidOf ⇒ 不比對 sid（同改版前）');
  const f=T.cupGroupFilter(G.items,OAT,sidOf);
  ok(f.length===2&&f.some(x=>x.type==='single'&&x.row.code==='F421-01')&&f.some(x=>x.type==='group'&&x.pageId==='702043094007833'&&x.shown.length===2),'貼 Wing 商品 ID ⇒ 兩頁都搜得到');
  ok(eq(T.cupGroupFilter(G.items,'燕麥杯',sidOf).map(x=>x.type),T.cupGroupFilter(G.items,'燕麥杯').map(x=>x.type)),'搜品名結果不變'); }

// ── 零動銷：每列多帶 sids，分組與筆數不變 ──
{ const rows=[{code:'F421-11',qty:1,rev:10,dispId:'702043094007833'}];
  const r=T._czBuild({doc,rows,prevRows:null,hist:[],names:{byDisp:{},byCode:{},byOther:{}}});
  const all=['have','zero','unknown'].flatMap(g=>r.groups[g]);
  const card=T.cupSellThroughCalc(rows,T.cupProductsListed(doc).listed);
  ok(r.unsold===card.den-card.num,'筆數＝卡片 den − num');
  ok(eq(all.find(x=>x.pid==='595827072335878').sids,[OAT]),'燕麥杯頁帶 sids');
  ok(eq(all.find(x=>x.pid==='590679256252419').sids,['1134696002411485','1134696003491166']),'多 sid 頁帶兩個');
  ok(eq(all.find(x=>x.pid==='P-NOSID').sids,[]),'沒有 sid ⇒ 空陣列');
  ok(!all.some(x=>x.pid==='702043094007833'),'有賣的頁不列'); }

// ── 接線：畫面字樣、匯出欄位、搜尋提示 ──
{ ok(src.includes('<th class="tl us-th-case">Wing 商品 ID</th><th>庫存</th>'),'零動銷表頭改名');
  ok(src.includes("['分組','商品名稱','Wing 商品 ID(sid)','酷澎編號(pid)','原廠編號','選項數','庫存','庫存說明','上月營收','最近有賣']"),'零動銷匯出加 sid、保留 pid');
  ok(src.includes("d.ym+' 零動銷',[5,6,8],"),'零動銷匯出數字欄位跟著右移一格');
  ok(src.includes("cols.map(c=>c.label).concat(['Wing 商品 ID','商品頁 ID'])"),'淨利表匯出兩欄加在最後');
  ok(src.includes("_cupSearch[shop], r=>cupSidText(cupSidOf(shop,r.dispId,r.code)))"),'合併商品頁搜尋接 sid');
  const tblFn=src.split('function renderCoupangTableBody(')[1].split('\nfunction ')[0];
  ok((tblFn.match(/cupIdSubHtml\(shop, /g)||[]).length===3,'品名小字三處（全部規格、外層列、成員列）都走 cupIdSubHtml');
  ok(!tblFn.includes('酷澎編號 ${did}'),'表格裡不再自己拼「酷澎編號」小字');
  const re=(src.match(/const __RO_WRITE_RE\s*=\s*\/(.*)\//)||[])[1]||'';
  ok(!/cupSidOf|cupIdSubHtml/.test(re),'沒有加進唯讀白名單'); }

// ── 選填：真實備份 ──
const BK=process.env.CUP_BACKUP_JSON;
if(BK){
  const d=JSON.parse(fs.readFileSync(BK,'utf8'));
  const dec=v=>{ if(v==null) return v; if('stringValue' in v) return v.stringValue; if('integerValue' in v) return Number(v.integerValue); if('doubleValue' in v) return v.doubleValue; if('booleanValue' in v) return v.booleanValue; if('nullValue' in v) return null; if('timestampValue' in v) return v.timestampValue; if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec); if('mapValue' in v){ const o={},f=v.mapValue.fields||{}; for(const k in f) o[k]=dec(f[k]); return o; } return v; };
  const get=k=>{ const x=d[k]; if(!x||!x.fields) return null; const o={}; for(const f in x.fields) o[f]=dec(x.fields[f]); return o; };
  const items=[]; let latest=''; for(let i=0;i<4;i++){ const s=get('coupang_products/maji_'+i); if(!s) continue; items.push(...s.items); if(s.latestExport>latest) latest=s.latestExport; }
  const real={schema:1,latestExport:latest,items}; T.setDocs({'麻吉':real});
  ['F421-01','F421-11','F421-12'].forEach(c=>ok(T.cupSidOf('麻吉','',c)===OAT,'[備份] '+c+' → '+OAT));
  ok(T.cupSidOf('麻吉','595827072335878','')===OAT&&T.cupSidOf('麻吉','702043094007833','')===OAT,'[備份] 燕麥杯兩頁');
  ['606736880746498','606714264993794','606714353074176','606718262214656'].forEach(p=>ok(T.cupSidOf('麻吉',p,'')===BAG,'[備份] 醫藥包 '+p));
  const idx=T.cupSidIndex(real), multi=Object.keys(idx.byPid).filter(k=>idx.byPid[k].length>1);
  ok(multi.length===4&&multi.every(p=>Array.isArray(T.cupSidOf('麻吉',p,''))),'[備份] 一頁多 sid 的 4 頁都回陣列');
  const rep=get('coupang_reports/maji_2026-10'), none=rep.rows.filter(r=>T.cupSidOf('麻吉',r.dispId,r.code)==null).length;
  console.log('[備份] 好麻吉主檔 pid '+Object.keys(idx.byPid).length+'、sid '+new Set(items.map(x=>x.sid).filter(Boolean)).size+'、一頁多 sid '+multi.length+' 頁；2026-10 報表 '+rep.rows.length+' 列，查不到 sid '+none+' 列');
  const z=T._czBuild({doc:real,rows:rep.rows,prevRows:null,hist:[],names:{byDisp:{},byCode:{},byOther:{}}});
  ok(z.unsold===930,'[備份] 零動銷仍是 930');
  ok(['have','zero','unknown'].flatMap(g=>z.groups[g]).every(x=>x.sids.length>0),'[備份] 零動銷 930 列都有 sid');
}
console.log('coupang-wing-id: '+n+' 項通過'+(BK?'（含真實備份）':''));
