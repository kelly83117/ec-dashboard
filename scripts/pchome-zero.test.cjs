// PChome「🎯 零動銷」（2026-11-25 第 2 塊）測試：node scripts/pchome-zero.test.cjs
//   從 js/profit.js 抽 PCH-PG-PURE（pchomePageAnchor 等）與 PCH-ZERO-PURE（_pzBuild），用合成資料測分組、品名、上月營收、最近有賣。
//   另外檢查 _zeroTip 的 pchome 分支、兩個工具列按鈕、window 名單、overlay、pchomeDxByCode 只加欄位。
//   PCHOME_BACKUP_JSON=<v3 備份檔> node scripts/pchome-zero.test.cjs
//     ← 另外把整支 profit.js 載進 node vm 沙箱（DOM、localStorage、雲端都是空的；fetch 一律拒絕），讀備份驗 2026-10：
//       轉單帳務月 264 款（莫筆克 230／3／31）、轉單日曆月 257 款、寄倉 16 款，而且都＝卡片 den − num。只印數字，不印內容。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert'), vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'js','profit.js'),'utf8').replace(/\r\n/g,'\n');
const between=(a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(src.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return src.slice(i,j+b.length); };
const baseLine=(src.match(/^function pchomeBaseCode\(v\)\{.*\}$/m)||[])[0];
if(!baseLine) throw new Error('找不到 pchomeBaseCode');
const T=new Function([ baseLine, between('/* ═══ PCH-PG-PURE-BEGIN','/* ═══ PCH-PG-PURE-END'), between('/* ═══ PCH-ZERO-PURE-BEGIN','/* ═══ PCH-ZERO-PURE-END ═══ */'),
  'return { _pzBuild, pchomePageAnchor };' ].join('\n'))();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m+'\n  實際 '+JSON.stringify(a)+'\n  預期 '+JSON.stringify(b));
const it=(code,pages,specs,name,sellable)=>({code,pages,specs,name,sellable:sellable===undefined?null:sellable});

// ── 名單＝denSet − numSet；分組看莫筆克加總 ──
{ const items=[
    it('A1',['P1'],{P1:'002'},'P1 第二規格',3), it('A2',['P1'],{P1:'001'},'P1 第一規格',4),   // P1：5＋0 ⇒ ①
    it('B1',['P2'],{P2:'001'},'P2',0), it('B2',['P2'],{P2:'002'},'P2b',0),                    // P2：0＋0 ⇒ ②
    it('C1',['P3'],{P3:'001'},'P3',null), it('C2',['P3'],{P3:'002'},'P3b'),                   // P3：一個有 2、一個不在莫筆克 ⇒ ①（部分）
    it('D1',['P4'],{P4:'001'},'P4'),                                                          // P4：不在莫筆克 ⇒ ③
    it('E1',['P5'],{P5:'001'},'P5'), it('E2',['P5'],{P5:'002'},'P5b'),                        // P5：0＋沒資料 ⇒ ③
    it('F1',['P6','P1'],{P6:'001',P1:'003'},'P6',1),                                          // F1 掛兩款（P1、P6）；P6 有賣
    it('G1',['P7'],{P7:'001'},'P7') ];
  const stock={A1:5,A2:0,B1:0,B2:'0',C1:2,E1:0,F1:7,G1:1};
  const r=T._pzBuild({items,denSet:['P1','P2','P3','P4','P5','P6','P7'],numSet:['P6','P7'],stock,prevRev:null,hist:[]});
  ok(r.den===7&&r.num===2&&r.unsold===5,'款數＝den − num');
  const ids=k=>r.groups[k].map(x=>x.base);
  eq(ids('have'),['P1','P3'],'① 依庫存多到少（P1＝5＋0＋7、P3＝2）');
  eq(ids('zero'),['P2'],'② 全部有數字而且是 0（字串 "0" 也算數字）');
  eq(ids('unknown').slice().sort(),['P4','P5'],'③ 有料號不在莫筆克、加總不大於 0');
  const p1=r.groups.have[0], p3=r.groups.have[1];
  ok(p1.stock===12&&p1.specN===3&&!p1.partial,'一款的庫存＝底下料號加總（含掛兩款的 F1）');
  ok(p1.sellable===8,'PChome 可賣量加總（只放提示／Excel）');
  ok(p1.anchor==='A2'&&p1.name==='P1 第一規格','品名取規格碼最小的料號（001）');
  ok(p1.specs.find(s=>s.code==='F1').otherPages===1,'F1 也掛在另外 1 款');
  ok(p3.partial&&p3.stock===2,'部分料號沒有莫筆克資料');
  ok(r.specTotal===3+2+2+1+2,'料號數＝每款成員加總');
  ok(!ids('have').concat(ids('zero'),ids('unknown')).some(b=>b==='P6'||b==='P7'),'有賣的款不列'); }

// ── 上月營收、最近有賣 ──
{ const items=[it('A1',['S1'],{S1:'001'},'S1'), it('A2',['S1'],{S1:'002'},'S1b'), it('B1',['S2','S9'],{S2:'001',S9:'001'},'S2'), it('C1',['S3'],{S3:'001'},'S3')];
  const stock={A1:1,A2:1,B1:1,C1:1};
  const hist=[{ym:'2026-09',numSet:['S9']},{ym:'2026-08',numSet:['S1','S2']},{ym:'2026-07',numSet:['S3']}];
  const r=T._pzBuild({items,denSet:['S1','S2','S3'],numSet:[],stock,prevRev:{A1:200,A2:50,B1:90},hist});
  const by=Object.fromEntries(r.groups.have.map(x=>[x.base,x]));
  ok(by.S1.rev===250&&!by.S1.revShared,'上月營收＝這款料號加總');
  ok(by.S2.rev===90&&by.S2.revShared,'料號同時掛別款 ⇒ revShared');
  ok(by.S3.rev===0,'上個月有資料但沒賣 ⇒ 0');
  ok(by.S1.lastSold==='2026-08'&&by.S2.lastSold==='2026-08'&&by.S3.lastSold==='2026-07','最近有賣＝往回第一個在 numSet 的月份');
  ok(r.groups.have[0].base==='S1','同庫存依上月營收排');
  const r2=T._pzBuild({items,denSet:['S1'],numSet:[],stock,prevRev:null,hist:[]});
  ok(r2.groups.have[0].rev===null&&r2.groups.have[0].lastSold==='','沒有上個月 ⇒ null'); }

// ── 邊界 ──
{ const r=T._pzBuild(null);
  ok(r.unsold===0&&r.den===0&&r.num===0,'沒有資料不丟錯');
  const r2=T._pzBuild({items:[],denSet:['X'],numSet:[],stock:{}});
  ok(r2.groups.unknown.length===1&&r2.groups.unknown[0].specN===0&&r2.groups.unknown[0].name==='','分母有、但找不到料號 ⇒ ③、不丟錯'); }

// ── 接線 ──
{ ok(/kind==='pchome'\s*\n?\s*\?'「在架」是用目前的 PChome 上架清單判斷/.test(src),'_zeroTip 在架句');
  ok(src.includes('日曆月只有訂單明細，沒有每筆訂單的商品編號')&&src.includes('通路健檢的 PChome 動銷率是轉單＋寄倉合併'),'_zeroTip 寬鬆、健檢兩句');
  ok(src.split("openPchomeZeroModal(\\''+shop+'\\')").length-1===2,'兩個工具列（帳務月、日曆月）都有按鈕');
  ok(/openPchomeZeroModal,closePchomeZeroModal,pchomeZeroSetMonth,pchomeZeroExportExcel,__pchomeZeroSnap,/.test(src),'window 名單');
  ok(src.includes('id="pz-modal-overlay"')&&src.includes('id="pz-modal-body"')&&src.includes('id="pz-modal-title"'),'pz overlay');
  ok(/return \{num:Object\.keys\(num\)\.length, den:Object\.keys\(den\)\.length, denSet:Object\.keys\(den\), numSet:Object\.keys\(num\)\};/.test(src),'pchomeDxByCode：num／den 原樣、只加 denSet／numSet');
  const re=(src.match(/__RO_WRITE_RE\s*=\s*\/(.*)\/[a-z]*;/)||[])[1]||'';
  ok(!/PchomeZero|pchomeZero/.test(re),'零動銷 handler 不在唯讀白名單（本檔看 profit.js；app.js 由 ro-ui-whitelist 檢查）'); }

// ── 選填：真實備份 ──
const BK=process.env.PCHOME_BACKUP_JSON;
if(BK){
  const R=JSON.parse(fs.readFileSync(BK,'utf8'));
  const dec=v=>{ if(v==null) return v; if('stringValue' in v) return v.stringValue; if('integerValue' in v) return Number(v.integerValue); if('doubleValue' in v) return v.doubleValue; if('booleanValue' in v) return v.booleanValue; if('nullValue' in v) return null; if('timestampValue' in v) return v.timestampValue; if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec); if('mapValue' in v){ const o={},f=v.mapValue.fields||{}; for(const k in f) o[k]=dec(f[k]); return o; } return v; };
  const get=k=>{ const x=R[k]; if(!x||!x.fields) return null; const o={}; for(const f in x.fields) o[f]=dec(x.fields[f]); return o; };
  const pm={};
  ['app/profit_notes_2026','app/profit_notes_2026_2','app/profit'].forEach(k=>Object.assign(pm,get(k)||{}));
  Object.keys(pm).forEach(k=>{ if(k.startsWith('ec|')) delete pm[k]; });
  pm.ec_pchome_products=get('app/pchome_products').list;
  const ob=get('app/pchome_orders'), fl={}; Object.values(ob).forEach(b=>Object.assign(fl,b)); pm.ec_pchome_orders=fl;
  pm.ec_pchome_recon=get('app/pchome_recon').data;
  pm.ec_momo_stock_by_origin=get('momo_stock/current');
  const noop=()=>{}, any=new Proxy(function(){}, {get:(t,k)=>k===Symbol.toPrimitive?(()=>''):(['innerHTML','textContent','value'].includes(k)?'':any),apply:()=>any,set:()=>true});
  const lsm=new Map();
  const Store={_mem:{},_profitMem:pm,get:()=>null,set:noop,setLocalOnly:noop};
  const w0={Store,App:{route:'',isReadOnly:()=>true},addEventListener:noop,removeEventListener:noop,dispatchEvent:noop,location:{hostname:'node',href:''},navigator:{userAgent:'node'},matchMedia:()=>({matches:false,addEventListener:noop}),requestIdleCallback:noop,innerWidth:1400};
  const win=new Proxy(w0,{get:(t,k)=>(k in t)?t[k]:(typeof k==='string'&&k.startsWith('__')&&(!k.startsWith('__cloud')||k==='__cloudDrainLatest'||k==='__cloudSubscribeCached')?(()=>undefined):undefined)});
  const ctx={window:win,document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>any,addEventListener:noop,removeEventListener:noop,body:any,head:any,documentElement:any,readyState:'complete',visibilityState:'visible'},
    localStorage:{getItem:k=>lsm.has(k)?lsm.get(k):null,setItem:(k,v)=>lsm.set(k,String(v)),removeItem:k=>lsm.delete(k),key:i=>[...lsm.keys()][i]??null,get length(){return lsm.size;},clear:()=>lsm.clear()},
    console:{log:noop,info:noop,warn:noop,error:noop,table:noop,debug:noop},setTimeout:()=>0,clearTimeout:noop,setInterval:()=>0,clearInterval:noop,queueMicrotask:noop,
    Promise,Map,Set,WeakMap,JSON,Math,Date,Number,String,Array,Object,BigInt,RegExp,Error,TextEncoder,TextDecoder,Intl,Symbol,Proxy,Reflect,isNaN,isFinite,parseInt,parseFloat,escape,unescape,encodeURIComponent,decodeURIComponent,
    navigator:w0.navigator,location:w0.location,Store,App:w0.App,Chart:function(){},showToast:noop,escapeHtmlLike:s=>String(s==null?'':s),
    MutationObserver:function(){return {observe:noop,disconnect:noop};},ResizeObserver:function(){return {observe:noop,disconnect:noop};},requestAnimationFrame:noop,performance:{now:()=>Date.now()},
    Blob:function(){},URL:{createObjectURL:()=>''},fetch:()=>Promise.reject(new Error('no network')),addEventListener:noop,removeEventListener:noop,getComputedStyle:()=>({}),CustomEvent:function(){},Event:function(){},HTMLElement:function(){}};
  ctx.globalThis=ctx; ctx.self=ctx;
  vm.createContext(ctx);
  const vd=path.join(ROOT,'js','vendor'), lz=fs.readdirSync(vd).find(f=>/^lz-string.*\.js$/.test(f));
  vm.runInContext(fs.readFileSync(path.join(vd,lz),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js','profit.js'),'utf8'),ctx,{filename:'profit.js'});
  const snap=ctx.__pchomeZeroSnap('2026-10');
  const want={ '轉單・帳務月':{n:264,g:[230,3,31]}, '轉單・日曆月':{n:257,g:null}, '寄倉・帳務月':{n:16,g:null}, '寄倉・日曆月':{n:16,g:null} };
  Object.keys(want).forEach(k=>{ const s=snap[k]; ok(s&&s.款數!=null,k+' 算得出來');
    console.log('[備份] '+k+' 2026-10：卡片 '+s.動銷率+'，零動銷 '+s.款數+' 款（'+s.料號數+' 料號；'+s.有庫存+'／'+s.沒庫存+'／'+s.庫存不明+'）');
    ok(s.款數===s.卡片分母減分子,k+' 款數＝卡片 den − num');
    ok(s.款數===want[k].n,k+' 2026-10 款數 '+want[k].n);
    if(want[k].g) eq([s.有庫存,s.沒庫存,s.庫存不明],want[k].g,k+' 三組'); });
  // 卡片用的 num／den 跟 snap 同一支：直接算一次對照
  const c=ctx.pchomeDxByCode(ctx.pchomeProfitCalc(ctx.pchomeMonthEntry('2026-10'),'轉單'),'轉單');
  ok(c.num===42&&c.den===306&&c.denSet.length===306&&c.numSet.length===42,'轉單帳務月卡片 42/306、集合大小一致');
}
console.log('pchome-zero: '+n+' 項通過'+(BK?'（含真實備份）':''));
