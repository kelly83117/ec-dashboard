#!/usr/bin/env node
// #510 前置：MOMO 商品主檔兩個漏洞的 node 測試（只讀 repo 檔案，不寫檔、不連網路、不碰瀏覽器）。
//
//   node scripts/momo-products-writeback.test.cjs
//   MOMO_BASE_REV=<commit>（預設 d8f7a75）＝改版前的版本，用 git show 取舊程式，證明舊版真的會出事（新版不會）
//
// 做法：從 js/profit.js 抽出真實函式（存檔、讀取、LZ1、lastpushed、合併、推送），從 js/firebase.js 抽出 momo_products 訂閱
//   處理每份文件的那段，每台電腦一個 vm（各自 localStorage／Store／dirty），共用一份假雲端；setShop 會讓每台都收到一次快照
//  （模擬 Firestore 本機寫入延遲補償：寫的那台自己也同步收到，而且收到時還是 dirty → 被守衛跳過）。syncToCloud 只模擬 products 那段
//  （分派 → momoSyncProductsMerge → 成功才清 pending 與 dirty），兩行原文有變就停。
//
//   A「推完本機沒更新 → 下次推回」：雲端清掉 N 筆；X 有 dirty、本機還有 N 筆；X 同步 → 再改 1 筆 → 再同步。
//   B「別台新增被當成刪除」：X dirty 時 Y 新增並推（X 收不到）；X 同步；X 再改 1 筆 → 再同步。另外跑使用者給的順序（X 推完 → X 再改 → Y 推）。
//   C 對照組：X 沒有 dirty。
//   本機格式：JSON、LZ1（就地壓縮後）、LZ1（空間不足、存檔當場改寫 LZ1）；另跑 lastpushed 不存在（bootstrap）。
//   另外：推送期間本機又存過 ⇒ 不寫回；甲乙配商品資料同步的「已下架、不建檔」。
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm'), cp=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const BASE_REV=process.env.MOMO_BASE_REV||'d8f7a75';
let pass=0, fail=0;
const ok=(c,m)=>{ if(c){ pass++; } else { fail++; console.log('  ✗ '+m); } };
const norm=s=>s.replace(/\r\n/g,'\n');
const readCur=f=>norm(fs.readFileSync(path.join(ROOT,f),'utf8'));
const readRev=(rev,f)=>norm(cp.execFileSync('git',['show',rev+':'+f],{cwd:ROOT,encoding:'utf8',maxBuffer:64<<20}));

// ── 抽函式 ──
const TOP=/^(?:async function |function |const |let |var |window\.|class |\/\* ═|\/\/ ═|\/\/ ──|\/\/ PROFIT|\/\/ #510|\/\/ 跳到另一個)/;
function extractor(pf){
  const lines=pf.split('\n');
  const fn=(name,optional)=>{
    const re=new RegExp('^(?:async )?function '+name+'[(]');
    const i=lines.findIndex(l=>re.test(l)); if(i<0){ if(optional) return ''; throw new Error('找不到 function '+name); }
    let j=i+1; while(j<lines.length&&!TOP.test(lines[j])) j++;
    const s=lines.slice(i,j).join('\n'); new Function(s); return s;
  };
  const line=re=>{ const l=lines.find(x=>re.test(x)); if(!l) throw new Error('找不到 '+re); return l; };
  const win=name=>{ const re=new RegExp('^window[.]'+name+'=function'); const i=lines.findIndex(l=>re.test(l)); if(i<0) throw new Error('找不到 window.'+name);
    let j=i+1; while(j<lines.length&&!TOP.test(lines[j])) j++; return lines.slice(i,j).join('\n'); };
  return {fn,line,win};
}
const NAMES=['_lz1Unwrap','_lz1Encode','momoProductsKey','_momoLsRead','_momoLzCacheMap','_momoLzUnwrapCached','_momoLsWrite','_momoLsSameContent',
  '_momoLsCompressOne','_momoLsBadMap','_momoLsReadNote','_momoProductsSaveBlocked','_momoProductsPendingUnreadable','momoLoadProducts',
  'momoDocCapVerdict','momoSaveProducts','momoPendingProducts','_momoReadJson','_momoDirtyAdd','_momoDirtyDel','_momoIsDirty','momoProductsLastPushedKey',
  '_momoProductsBuildSig','_momoProductsLastPushedGet','_momoProductsLastPushedSet','momoProductsDirtySkus','momoProductsPlanMerge','_momoDelGuardLevel',
  '_momoDelGuardAbortMsg','momoSyncProductsMerge','momoFsSanitizeDeep','_momoStableStr','momoBuildSyncPlan'];
function buildSources(pf, fb){
  const X=extractor(pf);
  if(!/ok\.forEach\(k=>\{ if\(k\.startsWith\('ec_momo_products\|'\)\)\{ try\{ _momoDirtyDel\(k\); \}catch\{\}/.test(pf)) throw new Error('syncToCloud 清 products dirty 的那行變了');
  if(!/tasks\.push\(\{key:pk,run:\(\)=>momoSyncProductsMerge\(shop\)\}\)/.test(pf)) throw new Error('syncToCloud 分派 products 的那行變了');
  const src=[ X.line(/^const _LS_COMPRESS_MOMO_WRITE=/), X.line(/^const _LS_COMPRESS_MOMO_MIGRATE=/), X.line(/^const _MOMO_PDIRTY_LS=/), X.line(/^const _MOMO_PLP_LS=/),
    X.line(/^const MOMO_DOC_WARN_KB=/), X.line(/^const MOMO_DOC_BLOCK_RATIO=/), X.line(/^const MOMO_DEL_GUARD_MIN=/), X.line(/^const MOMO_DEL_GUARD_CONFIRM_RATIO=/), X.line(/^const MOMO_DEL_GUARD_ABORT_RATIO=/),
    ...NAMES.map(n=>X.fn(n)), X.fn('_momoProductsWriteBackLocal',true), X.fn('momoSyncInactiveNewHtml',true),
    X.win('__momoShouldSkipCloudOverwrite'), X.win('__momoIsProductsDirty'), X.win('__momoProductsLastPushedSet') ].join('\n');
  const a=fb.indexOf('onSnapshot(momoProductsColRef'); const b=fb.indexOf('const data = d.data() || {};',a), e=fb.indexOf('changed.push(shop);',b);
  if(a<0||b<0||e<0) throw new Error('找不到 firebase.js momo_products 訂閱');
  const sub='function __subApply(d, changed){ const MOMO_DOCID_SHOP={}; '+fb.slice(b,e+'changed.push(shop);'.length)+'\n}';
  const sync=`async function __syncProducts(){
    const ok=[], failed=[], skipped=[];
    for(const pk of [..._pendingSyncKeys]){
      if(!pk.startsWith('ec_momo_products|')) continue;
      const shop=pk.split('|')[1];
      if(_momoProductsPendingUnreadable(pk)){ skipped.push(pk); continue; }
      try{ await momoSyncProductsMerge(shop); ok.push(pk); }catch(e){ failed.push({pk,msg:String(e&&e.message||e)}); }
    }
    ok.forEach(k=>{ _pendingSyncKeys.delete(k); });
    ok.forEach(k=>{ if(k.startsWith('ec_momo_products|')){ try{ _momoDirtyDel(k); }catch{} } });
    return {ok,failed,skipped};
  }`;
  return src+'\n'+sub+'\n'+sync;
}
const LZSRC=readCur('js/vendor/lz-string-1.5.0.min.js');
const STUBS=`
  const _pendingSyncKeys=new Set(); function _markPending(k){ _pendingSyncKeys.add(k); }
  function _momoOIsDirty(){ return false; } const _momoODirtyMem=new Set(); function _momoODirtyRegistryCorrupt(){ return false; }
  function _momoRfIsKey(){ return false; } function _momoRfDirtyHas(){ return false; }
  function _momoIsAdminUser(){ return false; } function _momoLoggedIn(){ return false; } function showToast(){} function _momoLsNotifyWriteFail(){}
  function _momoLsCompressSoon(){} function momoShopDisplay(s){ return s; } function momoFsSafeKey(k){ return k; }
  function _momoDocCapGuard(){ return {ok:true}; }
  function momoVisibleMonths(){ return []; } function momoExpandPeriod(){ return []; } function momoAggregatePeriods(){ return {}; } function momoLoadF1102(){ return {}; }
  function _momoEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  window.__delConfirmAnswer=false; window.__delConfirmAsked=[];
  async function _momoDelGuardConfirm(o){ window.__delConfirmAsked.push(o); return window.__delConfirmAnswer; }
  window.__MOMO_MERGE_ENFORCE=true;
`;
function world(SRC){
  const cloud={}, tabs=[]; const clone=x=>JSON.parse(JSON.stringify(x));
  const snapshotAll=shops=>tabs.forEach(t=>t.receive(shops));
  function makeTab(){
    const store=new Map(); let quota=Infinity;
    const used=ex=>{ let t=0; store.forEach((v,k)=>{ if(k!==ex) t+=k.length+v.length; }); return t; };
    const ls={ getItem:k=>store.has(k)?store.get(k):null,
      setItem:(k,v)=>{ v=String(v); if(used(k)+k.length+v.length>quota){ const e=new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e; } store.set(k,v); },
      removeItem:k=>{ store.delete(k); }, key:i=>[...store.keys()][i]||null, get length(){ return store.size; } };
    const ctx={ localStorage:ls, Store:{_profitMem:{},_mem:{}}, console:{log(){},info(){},warn(){},error(){},table(){}},
      TextEncoder, setTimeout:()=>0, clearTimeout(){}, Date, JSON, Math, Map, Set, Object, Array, String, Number, Promise, Error, isFinite, RegExp };
    ctx.window=ctx; ctx.__events=[];
    ctx.CustomEvent=function(type,init){ this.type=type; this.detail=init&&init.detail; }; ctx.dispatchEvent=e=>{ ctx.__events.push(e.type); return true; };
    vm.createContext(ctx);
    vm.runInContext(LZSRC+'\nwindow.LZString=LZString;',ctx);
    vm.runInContext(STUBS+SRC,ctx);
    ctx.__getDocHook=null;
    ctx.__cloudMomo={
      getDoc:async shop=>{ const snapItems=clone(cloud[shop]||[]); const ex=cloud[shop]!==undefined; if(ctx.__getDocHook){ const h=ctx.__getDocHook; ctx.__getDocHook=null; h(); } return { exists:()=>ex, data:()=>({shop, items:snapItems}) }; },
      setShop:async (shop, items)=>{ cloud[shop]=clone(items); snapshotAll([shop]); },
    };
    const run=n=>vm.runInContext(n,ctx);
    const t={ ctx, store, ls,
      receive(shops){ (shops||Object.keys(cloud)).forEach(shop=>{ if(cloud[shop]===undefined) return; run('__subApply')({ data:()=>({shop, items:clone(cloud[shop])}), id:shop }, []); }); },
      load:shop=>run('momoLoadProducts')(shop),
      pending:shop=>run('momoPendingProducts')('ec_momo_products|'+shop),
      edit(shop, mut){ const arr=clone(run('momoLoadProducts')(shop)); mut(arr); ctx._momoJustSaved=0; const r=run('momoSaveProducts')(shop, arr); ctx._momoJustSaved=0; return r; },
      sync:()=>run('__syncProducts')(),
      dirty:shop=>run('_momoIsDirty')('ec_momo_products|'+shop),
      lsRead:(k,shape)=>run('_momoLsRead')(k,shape),
      compressLocal(shop){ run('_momoLsCompressOne')('ec_momo_products_lastpushed|'+shop); run('_momoLsCompressOne')('ec_momo_products|'+shop); },
      fmt(shop){ const p=ls.getItem('ec_momo_products|'+shop), l=ls.getItem('ec_momo_products_lastpushed|'+shop); const f=x=>x==null?'absent':(x.startsWith('LZ1:')?'LZ1':'JSON'); return {products:f(p), lastpushed:f(l)}; },
      setQuota(q){ quota=q; }, used:()=>used(null),
      reload(){ ctx.Store._profitMem={}; ctx.Store._mem={}; run('_pendingSyncKeys.clear()'); t.receive(); },
      run,
    };
    tabs.push(t); return t;
  }
  return { cloud, makeTab, snapshotAll, clone };
}
const SHOP='甲配';
const items=(nA,nD)=>{ const a=[]; for(let i=0;i<nA;i++) a.push({sku:'A'+i,name:'在架'+i+'【享屋】不鏽鋼保溫杯',cost:10,discontinued:false,history:[{date:'2026-08-01',note:'新增成本'}],periods:{'2026-10-H1':{s:'2610:1:100'}}});
  for(let i=0;i<nD;i++) a.push({sku:'D'+i,name:'下架'+i+'【享屋】多色收納盒',cost:5,discontinued:true,history:[],periods:{}}); return a; };
const cnt=(arr,p)=>(arr||[]).filter(x=>String(x.sku).startsWith(p)).length;
const setCost=(t,sku,v)=>t.edit(SHOP,arr=>{ arr.find(x=>x.sku===sku).cost=v; });

async function setup(SRC, fmt, nA, nD){
  const W=world(SRC); W.cloud[SHOP]=items(nA,nD);
  const X=W.makeTab(), Y=W.makeTab(); X.reload(); Y.reload();
  if(fmt==='LZ1'){ X.compressLocal(SHOP); Y.compressLocal(SHOP); }
  if(fmt==='LZ1-quota'){ X.compressLocal(SHOP); X.setQuota(X.used()+2000); }   // 剛好放得下 LZ1、放不下未壓縮 JSON ⇒ 存檔當場改寫 LZ1
  return {W,X,Y};
}
async function caseA(SRC, fmt, o){
  const {W,X}=await setup(SRC, fmt, 30, 40); const r={};
  if(o.bootstrap) X.ls.removeItem('ec_momo_products_lastpushed|'+SHOP);
  if(o.xDirty) setCost(X,'A0',11);
  r.fmtAfterEdit=X.fmt(SHOP);
  W.cloud[SHOP]=W.cloud[SHOP].filter(p=>!/^D/.test(p.sku)); W.snapshotAll([SHOP]);   // 清理腳本：雲端直接拿掉 N 筆
  r.xLocalAfterCleanup=cnt(X.load(SHOP),'D');
  if(o.xDirty){ const s=await X.sync(); r.s1=s; r.cloudAfterSync1=cnt(W.cloud[SHOP],'D'); r.xPendingAfterSync1=cnt(X.pending(SHOP),'D'); r.fmtAfterSync1=X.fmt(SHOP);
    r.lsReadOk=X.lsRead('ec_momo_products|'+SHOP,'array').state; }
  setCost(X,'A1',12); const s2=await X.sync(); r.s2=s2;
  r.cloudD=cnt(W.cloud[SHOP],'D'); r.cloudA=cnt(W.cloud[SHOP],'A');
  r.a0=W.cloud[SHOP].find(p=>p.sku==='A0').cost; r.a1=W.cloud[SHOP].find(p=>p.sku==='A1').cost;
  r.fmtEnd=X.fmt(SHOP); r.dirtyEnd=X.dirty(SHOP);
  return r;
}
async function caseB(SRC, fmt, order, k){
  const {W,X,Y}=await setup(SRC, fmt, 30, 0); const r={};
  const addY=()=>Y.edit(SHOP,arr=>{ for(let i=0;i<k;i++) arr.push({sku:'Y'+i,name:'Y新增'+i,cost:1,history:[],periods:{}}); });
  if(order==='user'){ setCost(X,'A0',11); await X.sync(); setCost(X,'A1',12); addY(); await Y.sync(); r.xSync=await X.sync(); }
  else if(order==='yFirst'){ setCost(X,'A0',11); addY(); await Y.sync(); r.xLocalY=cnt(X.load(SHOP),'Y'); await X.sync(); r.cloudYMid=cnt(W.cloud[SHOP],'Y');
    setCost(X,'A1',12); X.ctx.__delConfirmAsked.length=0; r.xSync=await X.sync(); r.asked=X.ctx.__delConfirmAsked.length; }
  else { addY(); await Y.sync(); r.xLocalY=cnt(X.load(SHOP),'Y'); setCost(X,'A1',12); r.xSync=await X.sync(); }
  r.cloudY=cnt(W.cloud[SHOP],'Y'); r.a0=(W.cloud[SHOP].find(p=>p.sku==='A0')||{}).cost; r.a1=(W.cloud[SHOP].find(p=>p.sku==='A1')||{}).cost;
  return r;
}

(async()=>{
  const fbCur=readCur('js/firebase.js'), pfCur=readCur('js/profit.js');
  const CUR=buildSources(pfCur, fbCur);
  let BASE=null; try{ BASE=buildSources(readRev(BASE_REV,'js/profit.js'), readRev(BASE_REV,'js/firebase.js')); }catch(e){ console.log('  ⚠ 取不到改版前程式（'+BASE_REV+'）：'+e.message+'；只跑新版'); }

  // ── 改版前：A、B 真的會發生（證明測試抓得到漏洞）──
  if(BASE){
    for(const fmt of ['JSON','LZ1']){
      const a=await caseA(BASE, fmt, {xDirty:true});
      ok(a.cloudAfterSync1===0 && a.cloudD===40, '[改前 '+fmt+'] A：第一次同步雲端不變、第二次同步 40 筆被推回（實際 '+a.cloudAfterSync1+' → '+a.cloudD+'）');
      const b=await caseB(BASE, fmt, 'yFirst', 3);
      ok(b.cloudY===0 && b.asked===0, '[改前 '+fmt+'] B：Y 新增的 3 筆被刪、刪除防線沒問（實際剩 '+b.cloudY+'、問了 '+b.asked+' 次）');
    }
  }
  // ── 新版 ──
  for(const fmt of ['JSON','LZ1','LZ1-quota']){
    const a=await caseA(CUR, fmt, {xDirty:true});
    if(fmt==='LZ1-quota') ok(a.fmtAfterEdit.products==='LZ1'&&a.fmtAfterEdit.lastpushed==='LZ1', '[新 '+fmt+'] 前提：存檔當場改寫 LZ1（'+JSON.stringify(a.fmtAfterEdit)+'）');
    ok(a.s1.ok.length===1 && a.cloudAfterSync1===0, '['+fmt+'] A：第一次同步成功、雲端仍是 0 筆');
    ok(a.xPendingAfterSync1===0, '['+fmt+'] A：推完本機（待推那份）已跟上合併結果（剩 '+a.xPendingAfterSync1+'）');
    ok(a.lsReadOk==='ok', '['+fmt+'] A：寫回後本機讀得懂（'+a.lsReadOk+'）');
    ok(a.cloudD===0 && a.cloudA===30, '['+fmt+'] A：再改 1 筆再同步，N 筆沒有被推回（雲端 D='+a.cloudD+'、A='+a.cloudA+'）');
    ok(a.a0===11 && a.a1===12 && a.dirtyEnd===false, '['+fmt+'] A：兩次修改都在雲端、dirty 清掉');
    const inv=f=>!(f.products==='LZ1' && f.lastpushed==='JSON');
    ok(inv(a.fmtAfterSync1)&&inv(a.fmtEnd), '['+fmt+'] products 是 LZ1 ⇒ lastpushed 是 LZ1 或不存在（'+JSON.stringify(a.fmtAfterSync1)+' / '+JSON.stringify(a.fmtEnd)+'）');
    const c=await caseA(CUR, fmt==='LZ1-quota'?'LZ1':fmt, {xDirty:false});
    ok(c.xLocalAfterCleanup===0 && c.cloudD===0 && c.a1===12, '['+fmt+'] C：X 沒 dirty ⇒ 收到快照跟上、不會推回');
    const b=await caseB(CUR, fmt==='LZ1-quota'?'LZ1':fmt, 'yFirst', 3);
    ok(b.xLocalY===0 && b.cloudYMid===3, '['+fmt+'] B 前提：X dirty 收不到 Y 的快照、X 第一次同步保留 Y 的 3 筆');
    ok(b.cloudY===3 && b.asked===0 && b.a0===11 && b.a1===12, '['+fmt+'] B：X 再改再同步，Y 的 3 筆沒被刪（剩 '+b.cloudY+'）');
    const b25=await caseB(CUR, fmt==='LZ1-quota'?'LZ1':fmt, 'yFirst', 25);
    ok(b25.cloudY===25 && b25.asked===0 && b25.a1===12, '['+fmt+'] B（25 筆）：不會被刪、也不會跳刪除確認、X 的修改有推上去');
    const bu=await caseB(CUR, fmt==='LZ1-quota'?'LZ1':fmt, 'user', 3);
    ok(bu.cloudY===3 && bu.a0===11 && bu.a1===12, '['+fmt+'] B（X 推完 → X 再改 → Y 推）：Y 的 3 筆在、X 的修改都在');
    const bc=await caseB(CUR, fmt==='LZ1-quota'?'LZ1':fmt, 'control', 3);
    ok(bc.xLocalY===3 && bc.cloudY===3 && bc.a1===12, '['+fmt+'] C：X 沒 dirty ⇒ 收到 Y 的快照、不會刪');
  }
  // ── bootstrap（lastpushed 不存在）：已知限制，改前改後一樣；寫回不會讓它變差 ──
  {
    const cur=await caseA(CUR,'JSON',{xDirty:true,bootstrap:true});
    ok(cur.cloudAfterSync1===40, 'bootstrap（已知限制）：沒有 lastpushed 又有 dirty ⇒ 第一次同步就把本機多的 40 筆當新增推回（改前改後一樣）');
    ok(cur.cloudA===30 && cur.a0===11 && cur.a1===12, 'bootstrap：不刪任何雲端品號、兩次修改都在');
    ok(cur.xPendingAfterSync1===40, 'bootstrap：寫回後本機＝合併結果（含推回的 40 筆）');
    if(BASE){ const b=await caseA(BASE,'JSON',{xDirty:true,bootstrap:true}); ok(b.cloudAfterSync1===cur.cloudAfterSync1 && b.cloudD===cur.cloudD, 'bootstrap：改前改後結果相同'); }
  }
  // ── 推送期間本機又存過 ⇒ 不寫回，剛存的修改保住、下次同步推上去 ──
  {
    const {W,X}=await setup(CUR,'JSON',5,0);
    setCost(X,'A0',11);
    X.ctx.__getDocHook=()=>{ setCost(X,'A2',22); };   // getDoc 之後、setShop 之前又存了一筆
    await X.sync();
    ok(X.load(SHOP).find(p=>p.sku==='A2').cost===22 && X.pending(SHOP).find(p=>p.sku==='A2').cost===22, '推送期間又存過：本機的 A2=22 沒被合併結果蓋掉');
    ok(W.cloud[SHOP].find(p=>p.sku==='A0').cost===11, '推送期間又存過：這次推的 A0 有上雲');
    // 已知（既有行為、這次沒改）：syncToCloud 推成功會清掉這把 key 的 pending／dirty，A2 要等下一次存檔才會再被同步撿到
    setCost(X,'A3',33); await X.sync();
    ok(W.cloud[SHOP].find(p=>p.sku==='A2').cost===22 && W.cloud[SHOP].find(p=>p.sku==='A3').cost===33, '下一次存檔再同步：A2、A3 都上雲（比 lastpushed，不會漏）');
  }
  // ── 寫回不標 pending／dirty、合併有帶進別台修改才發 momoDataReady ──
  {
    const {W,X,Y}=await setup(CUR,'JSON',5,0);
    setCost(X,'A0',11); Y.edit(SHOP,arr=>arr.push({sku:'Y0',name:'y',cost:1,history:[],periods:{}})); await Y.sync();
    X.ctx.__events.length=0; await X.sync();
    ok(cnt(X.load(SHOP),'Y')===1 && X.dirty(SHOP)===false && X.run('_pendingSyncKeys.size')===0, '寫回帶進 Y0、沒有標 dirty／pending');
    ok(X.ctx.__events.includes('momoDataReady'), '合併帶進別台修改 ⇒ 發 momoDataReady 讓畫面跟上');
    setCost(X,'A1',12); X.ctx.__events.length=0; await X.sync();
    ok(!X.ctx.__events.includes('momoDataReady'), '合併結果＝本機 ⇒ 不發事件');
  }
  // ── 甲乙配商品資料同步：銷售狀況不是「進行」的未建檔品號不進一鍵新增 ──
  {
    const W=world(CUR); const T=W.makeTab();
    T.ctx.Store._profitMem['ec_momo_products|甲配']=[{sku:'1',name:'舊',cost:5,purchasePrice:10,salePrice:20,origin:'O1',discontinued:false}];
    T.ctx.Store._profitMem['ec_momo_products|乙配']=[];
    const info={products:{甲配:{
      '1':{sku:'1',origin:'O1',name:'舊',purchasePrice:10,salePrice:20,status:'進行'},
      '2':{sku:'2',origin:'O2',name:'新-進行',purchasePrice:10,salePrice:20,status:'進行'},
      '3':{sku:'3',origin:'O3',name:'新-停售<b>',purchasePrice:10,salePrice:20,status:'停售'},
      '4':{sku:'4',origin:'',name:'新-空白',purchasePrice:10,salePrice:20,status:''},
      '5':{sku:'5',origin:'O9',name:'新-進行缺成本',purchasePrice:10,salePrice:20,status:'進行'} }, 乙配:{}}, unknownWarehouse:[]};
    const parsed={info, cost:{costByOrigin:{O1:5,O2:6,O3:7}}};
    const P=T.run('momoBuildSyncPlan')(parsed).shops['甲配'];
    ok(JSON.stringify(P.newItems.map(x=>x.sku))==='["2","5"]', '一鍵新增只剩「進行」的 2、5（'+P.newItems.map(x=>x.sku)+'）');
    ok(JSON.stringify(P.newInactive.map(x=>x.sku+':'+x.status))==='["3:停售","4:"]', '已下架、不建檔：3（停售）、4（空白）');
    ok(JSON.stringify(P.noCost.map(x=>x.sku))==='["5"]', '查無成本只列「進行」的未建檔（不列不建檔的）');
    if(BASE){
      const WB=world(BASE); const TB=WB.makeTab(); TB.ctx.Store._profitMem=JSON.parse(JSON.stringify(T.ctx.Store._profitMem));
      const PB=TB.run('momoBuildSyncPlan')(parsed).shops['甲配'];
      ok(JSON.stringify(PB.newItems.map(x=>x.sku))==='["2","3","4","5"]', '[改前] 一鍵新增會帶進 3、4（證明漏洞）');
      const strip=o=>{ const c=Object.assign({},o); delete c.newInactive; return c; };
      const pbOnlyActive=Object.assign({},PB,{newItems:PB.newItems.filter(x=>x.status==='進行'), noCost:PB.noCost.filter(x=>['2','5','1'].includes(x.sku))});
      ok(JSON.stringify(strip(P))===JSON.stringify(pbOnlyActive), '其他欄位（成本／價格／名稱／上下架／未比對到）跟改前完全相同');
      // 沒有不建檔品號時，整份計畫跟改前逐字相同（只多一個空陣列）
      const info2={products:{甲配:{'1':info.products.甲配['1'],'2':info.products.甲配['2']},乙配:{}},unknownWarehouse:[]};
      const a2=T.run('momoBuildSyncPlan')({info:info2,cost:parsed.cost}), b2=TB.run('momoBuildSyncPlan')({info:info2,cost:parsed.cost});
      ['甲配','乙配'].forEach(s=>{ ok(a2.shops[s].newInactive.length===0 && JSON.stringify(strip(a2.shops[s]))===JSON.stringify(b2.shops[s]), '全是進行：'+s+' 計畫跟改前逐字相同'); });
    }
    const html=T.run('momoSyncInactiveNewHtml')(P.newInactive);
    ok(/已下架、不建檔（2 筆）/.test(html) && !/style=/.test(html) && !/<input|<button|onclick/.test(html), '預覽區塊：標題筆數、沒有 inline style、沒有勾選或按鈕');
    ok(html.includes('&lt;b&gt;') && html.includes('銷售狀況：停售') && html.includes('銷售狀況：空白'), '預覽區塊：品名有跳脫、狀態原文／空白');
    ok(T.run('momoSyncInactiveNewHtml')([])==='', '沒有不建檔品號 ⇒ 不出區塊');
  }
  // ── 版面規則：新樣式在 css/、走 :root 變數 ──
  { const css=readCur('css/profit.css'); ok(/\.mm-sync-inact\{[^}]*var\(--text-muted\)[^}]*var\(--border\)/.test(css), 'css/profit.css 有 .mm-sync-inact（顏色走 :root 變數）'); }

  console.log((fail?'✗':'✓')+' momo-products-writeback：'+pass+' 項通過'+(fail?'，'+fail+' 項失敗':''));
  process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
