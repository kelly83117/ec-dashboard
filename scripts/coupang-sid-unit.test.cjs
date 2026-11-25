// 酷澎第 2 塊「動銷率與零動銷改用 Wing 商品（sid）為單位」（2026-11-25）測試：node scripts/coupang-sid-unit.test.cjs
//   從 js/profit.js 抽 CUP-PM-PURE（cupSidIndex／cupSidListed／cupSidSellThroughCalc；舊的 cupProductsListed／cupSellThroughCalc 做對照）、
//   CUP-OV-PURE 的 cupOvCalc（第三個參數）、CUP-ZERO-PURE 的 _czBuild。
//   CUP_BACKUP_JSON=<v3 備份檔> node scripts/coupang-sid-unit.test.cjs   ← 另外用真實主檔／報表驗 2026-06～10（好麻吉 10 月 384/948、零動銷 564）
//   資料預設全是合成的假資料；不碰瀏覽器、不碰雲端。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8').replace(/\r\n/g,'\n');
const between=(a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(src.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return src.slice(i,j+b.length); };
const fnSrc=name=>{ const i=src.indexOf('\nfunction '+name+'('); if(i<0) throw new Error('找不到 '+name); const j=src.indexOf('\n}\n',i); return src.slice(i,j+3); };
const code=[
  'function cupKpi(rows){ return { rev:0, net:0, rate:null, qty:0 }; }',
  between('/* ═══ CUP-PM-PURE-BEGIN','/* ═══ CUP-PM-PURE-END ═══ */'),
  fnSrc('cupOvCalc'),
  between('/* ═══ CUP-ZERO-PURE-BEGIN','/* ═══ CUP-ZERO-PURE-END ═══ */'),
  'return { cupSidIndex, cupSidListed, cupSidSellThroughCalc, cupSidUnitsOfPid, cupProductsListed, cupSellThroughCalc, cupOvCalc, _czBuild, CUP_SID_UNIT_FROM };' ].join('\n');
const T=new Function(code)();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const LT='2026-11-17 20:50:12', OLD='2026-10-01 10:00:00';
const it=(sku,pid,sid,code,stock,status,seen)=>({sku,pid,sid,code,stock:stock==null?1:stock,status:status||'판매중',lastSeen:seen||LT});
const OAT='1134696003491861', BAG='1134696003491933', M1='1134696002411485', M2='1134696003491166';
const doc={schema:1,latestExport:LT,items:[
  it('o1','595827072335878',OAT,'F421-01',3), it('o2','702043094007833',OAT,'F421-11',2), it('o3','702043094007833',OAT,'F421-12',0),
  it('b1','606736880746498',BAG,'H249-01',1), it('b2','606714264993794',BAG,'H249-02',0), it('b3','606714353074176',BAG,'H249-03',0), it('b4','606718262214656',BAG,'H249-04',0),
  it('m1','590679256252419',M1,'M-1',0), it('m2','590679256252419',M2,'M-2',0),   // 一頁兩個 sid
  it('m3','PM2ONLY',M2,'M-3',5),                                                  // M2 另外還有一頁
  it('s1','PSTOP','9000000000000001','S-1',4,'판매중지'),                          // 整頁停售
  it('x1','POLD','9000000000000002','X-1',4,'판매중',OLD),                        // 不在最新清單
  it('n1','PNOSID','','N-1',0),                                                   // 主檔沒有 sid 的頁
]};
const row=(dispId,qty,code)=>({dispId,qty,rev:qty*100,code:code||'',name:'名'+dispId});

// ── 在架：在架商品頁底下所有 sid；查不到 sid 的頁自己一個 ──
{ const idx=T.cupSidIndex(doc), L=T.cupSidListed(doc, idx);
  ok(eq([...L.listed].sort(),[OAT,BAG,M1,M2,'p:PNOSID'].sort()),'在架單位＝燕麥杯、醫藥包、兩個 M、沒 sid 的頁');
  ok(L.pageListed.size===9,'在架商品頁 9 頁（舊口徑）');
  ok(eq(L.pagesOf[OAT],['595827072335878','702043094007833']),'燕麥杯兩頁');
  ok(L.pagesOf[BAG].length===4,'醫藥包 4 頁 → 一個 sid');
  ok(eq(L.pagesOf[M2].sort(),['590679256252419','PM2ONLY']),'M2 有兩頁（其中一頁跟 M1 共用）');
  ok(L.stopped.has('9000000000000001')&&!L.listed.has('9000000000000002'),'整頁停售、不在最新清單都不在架');
  ok(T.CUP_SID_UNIT_FROM==='2026/11/25','口徑日期'); }

// ── 有賣：燕麥杯任一頁有賣 ⇒ 一個單位、有賣；一頁多 sid ⇒ 每個都有賣；主檔查不到的 dispId 自己一個 ──
{ const idx=T.cupSidIndex(doc), L=T.cupSidListed(doc, idx);
  const r=T.cupSidSellThroughCalc([row('702043094007833',2,'F421-11'), row('595827072335878',0,'F421-01'), row('590679256252419',1), row('NOTINMASTER',1,'F421-12'), row('606736880746498/606714264993794',1)], L.listed, idx);
  ok(r.sold.has(OAT)&&[...r.sold].filter(u=>u===OAT).length===1,'燕麥杯 F421-11 有賣 ⇒ 一個 Wing 商品有賣');
  ok(r.sold.has(M1)&&r.sold.has(M2),'一頁兩個 sid、這頁有賣 ⇒ 兩個 sid 都有賣');
  ok(r.sold.has('p:NOTINMASTER')&&r.unmapped===1,'主檔查不到的 dispId 自己算一個（不退回用原廠編號查）');
  ok(r.sold.has(BAG),'"A/B" 拆開，醫藥包兩頁 → 同一個 sid');
  ok(r.num===5&&r.den===6&&r.soldNotListed===1,'分子 5（燕麥杯、M1、M2、醫藥包、查不到的頁）；分母＝在架 5 ∪ 分子 ⇒ 6');
  ok(eq([...r.soldPages].sort(),['590679256252419','606714264993794','606736880746498','702043094007833','NOTINMASTER'].sort()),'有賣的商品頁（qty 0 不算）');
  const old=T.cupSellThroughCalc([row('702043094007833',2)], T.cupProductsListed(doc).listed);
  ok(old.num===1&&old.den===9,'舊函式留著（商品頁口徑）');
  const e=T.cupSidSellThroughCalc(null, null, null); ok(e.num===0&&e.den===0&&e.pct===null,'沒有資料不丟錯'); }

// ── 總表：cupOvCalc 第三個參數 ──
{ const idx=T.cupSidIndex(doc), L=T.cupSidListed(doc, idx), rows=[row('702043094007833',2)];
  const a=T.cupOvCalc(rows, L.listed, idx), b=T.cupOvCalc(rows, T.cupProductsListed(doc).listed);
  ok(a.stNum===1&&a.stDen===5,'給 sidIdx ⇒ Wing 商品口徑');
  ok(b.stNum===1&&b.stDen===9,'不給 ⇒ 舊的商品頁口徑（現有測試照過）'); }

// ── 零動銷：一列一個 sid；庫存＝這個 sid 最新清單所有選項加總；提示要的逐頁狀態 ──
{ const rows=[row('702043094007833',1,'F421-11')];
  const r=T._czBuild({doc,rows,prevRows:[row('606736880746498',1,'H249-01'),row('606714264993794/ZZ',2,'H249-02')],hist:[{ym:'2026-09',rows:[row('PM2ONLY',3,'M-3')]}],names:{byDisp:{'606714353074176':'醫藥包名'},byCode:{},byOther:{}}});
  const all=['have','zero','unknown'].flatMap(g=>r.groups[g]), by=u=>all.find(x=>x.unit===u);
  const idx=T.cupSidIndex(doc), card=T.cupSidSellThroughCalc(rows, T.cupSidListed(doc, idx).listed, idx);
  ok(r.unsold===card.den-card.num&&r.unsold===4,'筆數＝卡片 den − num＝4（醫藥包、M1、M2、沒 sid 的頁）');
  ok(!by(OAT),'燕麥杯有一頁有賣 ⇒ 不列');
  const bag=by(BAG);
  ok(bag.stock===1&&bag.optN===4&&r.groups.have.includes(bag),'醫藥包庫存＝4 個選項加總 1 ⇒ ① 有庫存');
  ok(bag.pages.length===4&&bag.pageSold.every(p=>!p.sold)&&bag.pid.split('、').length===4,'4 個前台頁、本月都沒賣；pid 欄用頓號');
  ok(bag.name==='醫藥包名'&&bag.nameSrc==='report','品名：這個 sid 底下有品名的頁');
  ok(bag.rev===300&&bag.revShared,'上月營收＝掛在這個 sid 任一頁的列（跟別頁合列的標 revShared）');
  ok(by(M2).stock===5&&by(M2).optN===2&&by(M2).lastSold==='2026-09','M2：兩個選項加總 5；最近有賣看它任一頁');
  ok(by(M1).stock===0&&r.groups.zero.includes(by(M1)),'M1：全部 0 ⇒ ② 沒庫存');
  ok(eq(by('p:PNOSID').sids,[])&&by('p:PNOSID').pid==='PNOSID','沒 sid 的頁自己一列');
  ok(r.multiUnitPage===2,'一頁多 sid 的列數（M1、M2）'); }

// ── 接線：改用新函式的四個地方、文字 ──
{ const fnBody=name=>{ const i=src.indexOf('function '+name+'('); return src.slice(i, src.indexOf('\n}\n',i)); };
  ok(/cupSidListedOf\(shop\)/.test(fnBody('cupRenderSellThrough'))&&/cupSidSellThroughCalc\(prev\.rows/.test(fnBody('cupRenderSellThrough')),'動銷率卡＋比上月都用 Wing 商品口徑');
  ok(!/cupSellThroughCalc\(|cupProductsListed\(/.test(fnBody('cupRenderSellThrough')),'動銷率卡不再用舊函式');
  const hs=src.slice(src.indexOf('window.__healthCoupangSt=function'), src.indexOf('\n};\n', src.indexOf('window.__healthCoupangSt=function')));
  ok(/cupSidSellThroughCalc\(rep\.rows/.test(hs)&&!/cupSellThroughCalc\(/.test(hs),'健檢轉接用 Wing 商品口徑');
  ok(/cupOvCalc\(rows, L\?L\.listed:null, L\?L\.idx:null\)/.test(fnBody('cupOvShopData')),'總表用 Wing 商品口徑');
  ok(src.includes("以 Wing 商品（供應商商品 ID）為單位")&&src.includes("起改用此口徑，跟之前的數字不能直接比"),'卡片／ⓘ 說明文字');
  const hl=fs.readFileSync(path.join(__dirname,'..','js','pages','health.js'),'utf8');
  ok(hl.includes("coupang: [0.40, 0.35, 0.31]")&&!hl.includes("coupang: [0.33, 0.27, 0.23]"),'健檢酷澎動銷率線 v11＝40/35/31');
  ok(/coupang: \{ label: '酷澎 商城',[^\n]*sellThrough: \[0\.32, 0\.40\], stFlag: 'few'/.test(hl),'types.coupang.sellThrough＝[0.32, 0.40]、stFlag few 保留');
  ok(hl.includes("version: 'v11-2026-11'"),'BASE 版號 v11');
  ok(hl.includes("const HL_CUP_LINES = Object.freeze({ pureRate: Object.freeze([0.25, 0.22, 0.15]), sellThrough: Object.freeze([0.33, 0.27, 0.23]) });"),'11/18 補雲端線的紀錄工具沒動');
  ok(hl.includes("const HL_CUP_ST_FORMULA = '本月有賣出的 Wing 商品"),'健檢說明改 Wing 商品'); }

// ── 選填：真實備份 2026-06～10 ──
const BK=process.env.CUP_BACKUP_JSON;
if(BK){
  const d=JSON.parse(fs.readFileSync(BK,'utf8'));
  const dec=v=>{ if(v==null) return v; if('stringValue' in v) return v.stringValue; if('integerValue' in v) return Number(v.integerValue); if('doubleValue' in v) return v.doubleValue; if('booleanValue' in v) return v.booleanValue; if('nullValue' in v) return null; if('timestampValue' in v) return v.timestampValue; if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec); if('mapValue' in v){ const o={},f=v.mapValue.fields||{}; for(const k in f) o[k]=dec(f[k]); return o; } return v; };
  const get=k=>{ const x=d[k]; if(!x||!x.fields) return null; const o={}; for(const f in x.fields) o[f]=dec(x.fields[f]); return o; };
  const want={ maji:{'2026-06':'301/949','2026-07':'300/948','2026-08':'337/947','2026-09':'375/947','2026-10':'384/948'}, luying:{'2026-10':'1/80'} };
  Object.keys(want).forEach(id=>{
    const items=[]; let latest=''; for(let i=0;i<4;i++){ const s=get('coupang_products/'+id+'_'+i); if(!s) continue; items.push(...s.items); if(s.latestExport>latest) latest=s.latestExport; }
    const real={schema:1,latestExport:latest,items}, idx=T.cupSidIndex(real), L=T.cupSidListed(real, idx);
    Object.keys(want[id]).forEach(m=>{ const rep=get('coupang_reports/'+id+'_'+m), r=T.cupSidSellThroughCalc(rep.rows, L.listed, idx), o=T.cupSellThroughCalc(rep.rows, T.cupProductsListed(real).listed);
      console.log('[備份] '+id+' '+m+'：Wing 商品 '+r.num+'/'+r.den+'＝'+r.pct.toFixed(1)+'%（商品頁 '+o.num+'/'+o.den+'＝'+o.pct.toFixed(1)+'%），主檔查不到 '+r.unmapped+' 頁');
      ok(r.num+'/'+r.den===want[id][m], id+' '+m+' '+want[id][m]); });
    const rep=get('coupang_reports/'+id+'_2026-10'), z=T._czBuild({doc:real,rows:rep.rows,prevRows:null,hist:[],names:{byDisp:{},byCode:{},byOther:{}}});
    ok(z.unsold===(id==='maji'?564:79), id+' 零動銷 '+z.unsold);
    if(id==='maji'){ const oat=['F421-01','F421-11','F421-12'].map(c=>items.find(x=>x.code===c).sid); ok(oat.every(s=>s===OAT)&&!['have','zero','unknown'].some(g=>z.groups[g].some(x=>x.unit===OAT)),'[備份] 燕麥杯一個單位、本月有賣');
      const bagU=['have','zero','unknown'].flatMap(g=>z.groups[g]).find(x=>x.unit===BAG); console.log('[備份] 醫藥包 '+BAG+'：'+(bagU?'零動銷，'+bagU.pages.length+' 個在架頁':'本月有賣')); }
  });
}
console.log('coupang-sid-unit: '+n+' 項通過'+(BK?'（含真實備份）':''));
