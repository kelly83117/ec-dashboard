// 酷澎淨利表「合併商品頁」（2026-11-19）純函式測試：node scripts/coupang-page-merge.test.cjs
//   從 js/profit.js 抽 CUP-PG-PURE-BEGIN/END，以及它對照用的 cupEnrichRows、cupKpi、cupVatOf。
//   資料全是合成的假資料；不碰瀏覽器、不碰雲端。CUP_SAMPLE_JSON 指到一份 [{code,name,qty,rev,fee,dispId,…}] 的 JSON 時，另外用它驗守恆（樣本不進 repo）。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8').replace(/\r\n/g,'\n');
const between=(a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(src.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return src.slice(i,j+b.length); };
const line=re=>{ const m=src.match(re); if(!m) throw new Error('找不到 '+re); return m[0]; };
const fnMulti=name=>{ const i=src.indexOf('\nfunction '+name+'('); if(i<0) throw new Error('找不到 '+name); const j=src.indexOf('\n}\n',i); return src.slice(i+1,j+2); };
const code=[ line(/^function cupVatOf\(rev\)\{.*$/m), 'let __costMap={}; const momoLoadCostByOrigin=()=>__costMap;', fnMulti('cupEnrichRows'), fnMulti('cupKpi'),
  between('/* ═══ CUP-PG-PURE-BEGIN','/* ═══ CUP-PG-PURE-END ═══ */'),
  'return { cupPageIdsOf, cupPageAgg, cupPageNoteState, cupGroupByPage, cupGroupSort, cupGroupFilter, cupEnrichRows, cupKpi, setCost:m=>{__costMap=m;} };' ].join('\n');
const T=new Function(code)();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const near=(a,b)=>Math.abs(a-b)<1e-6;
const row=(code,qty,rev,fee,dispId,extra)=>Object.assign({code,name:'品 '+code,qty,rev,grossRev:rev+10,sellerCoupon:10,fee,dispId:dispId==null?'':dispId,stock:null},extra||{});
const E=rows=>T.cupEnrichRows(rows.map(r=>Object.assign({},r)));
const sumRev=rows=>rows.reduce((s,r)=>s+(r.rev||0),0);
const outerRev=items=>items.reduce((s,it)=>s+(it.type==='group'?it.agg.rev:(it.row.rev||0)),0);

T.setCost({A1:10,A2:20,A3:400,B1:5,C1:5,M1:10,M2:10,S1:10,N1:10});
// A 頁三個規格（A3 賠錢）、B 頁一個（不成組）、X 缺成本＋條碼掛在 P 頁、M1/M2 掛兩頁、N1 沒有 dispId
const base=()=>E([ row('A1',10,1000,150,'PA'), row('B1',2,200,30,'PB'), row('A2',5,600,90,'PA'), row('A3',1,300,45,'PA'),
  row('X1',3,90,12,'PP'), row('123456',1,50,8,'PP'), row('C1',4,80,10,'PP'),
  row('M1',2,100,15,'PQ/PA'), row('M2',1,60,9,'PZ/PQ'), row('S1',1,40,6,'PQ'), row('N1',1,30,5,'') ]);

// ── 分組 ──
{ const rows=base(), G=T.cupGroupByPage(rows), by={}; G.items.forEach(it=>{ if(it.type==='group') by[it.pageId]=it; });
  ok(G.stats.rows===11&&G.stats.groups===3&&G.stats.singles===2,'群組數／單列數');
  ok(by.PA&&by.PA.members.map(r=>r.code).join()==='A1,A2,A3,M1','PA：三個規格＋M1（PA 4 列 > PQ 3 列）');
  ok(by.PQ&&by.PQ.members.map(r=>r.code).join()==='M2,S1','PQ：M2（PZ 1 列 < PQ 3 列）＋S1');
  ok(by.PP&&by.PP.members.length===3,'PP：缺成本＋條碼＋有成本');
  ok(G.items.filter(it=>it.type==='single').map(it=>it.row.code).join()==='B1,N1','只有一個成員／沒有 dispId ⇒ 不成組');
  ok(G.items.map(it=>it.type==='group'?it.pageId:it.row.code).join()==='PA,B1,PP,PQ,N1','順序＝第一個成員出現的位置');
  ok(G.multi.M1===1&&G.multi.M2===1&&Object.keys(G.multi).length===2&&G.stats.multiRows===2,'另掛 N 頁');
  ok(G.stats.maxMembers===4&&G.stats.grouped===9,'最大群組／成組列數');
  // 守恆：外層列營收加總＝原本所有列營收加總；每一列剛好出現一次
  ok(near(outerRev(G.items),sumRev(rows)),'營收守恆');
  const seen=[]; G.items.forEach(it=>{ if(it.type==='group') it.members.forEach(r=>seen.push(r.code)); else seen.push(it.row.code); });
  ok(seen.length===rows.length&&new Set(seen).size===rows.length,'每列只歸一處');
  ok(rows.every(r=>!('isGroup' in r)),'不改動原本的列'); }
// 多頁歸屬：同數取寫在前面的
{ const G=T.cupGroupByPage(E([row('M1',1,10,1,'P2/P1'),row('M2',1,10,1,'P2/P1')]));
  ok(G.items.length===1&&G.items[0].pageId==='P2'&&G.items[0].members.length===2,'同數取第一個');
  const G2=T.cupGroupByPage(E([row('M1',1,10,1,' P1 / P2 '),row('S1',1,10,1,'P2')]));
  ok(G2.items[0].type==='group'&&G2.items[0].pageId==='P2','空白會修掉；歸到列數多的那一頁');
  const G3=T.cupGroupByPage(E([row('M1',1,10,1,'P1/P2')]));
  ok(G3.items[0].type==='single'&&G3.multi.M1===1&&G3.stats.groups===0,'多頁但只有自己 ⇒ 不成組');
  ok(T.cupGroupByPage(null).items.length===0&&T.cupGroupByPage([]).stats.maxMembers===0,'空輸入'); }
// ── 合計 ──
{ const rows=base(), G=T.cupGroupByPage(rows), g=G.items.find(it=>it.pageId==='PA'), a=g.agg, M=g.members;
  const s=k=>M.reduce((x,r)=>x+(r[k]||0),0);
  ok(a.qty===18&&a.rev===2000&&a.fee===300&&a.sellerCoupon===40&&a.grossRev===2040,'數量／營收／費用／賣家券／定價相加');
  ok(near(a.cost,s('cost'))&&near(a.gross,s('gross'))&&near(a.net,s('net'))&&near(a.tax,s('tax')),'成本／毛利／營業稅／淨利相加');
  ok(near(a.grossRate,a.gross/a.rev)&&near(a.netRate,a.net/a.rev)&&a.missN===0&&a.costStatus==='ok','比率＝加總後重算');
  const k=T.cupKpi(M); ok(near(a.net,k.net)&&near(a.netRate*100,k.rate)&&near(a.rev,k.rev)&&a.qty===k.qty,'跟 cupKpi 同一個答案');
  ok(M.find(r=>r.code==='A3').net<0&&a.net>0,'含賠錢規格：合計照加');
  ok(a.name==='品 A1'&&a.n===4&&a.pageId==='PA'&&a.isGroup===true,'名稱＝營收最高的成員'); }
{ // 缺成本：淨利／淨利率只算有成本的成員；營收仍是全部
  const rows=base(), g=T.cupGroupByPage(rows).items.find(it=>it.pageId==='PP'), a=g.agg, c1=g.members.find(r=>r.code==='C1'), k=T.cupKpi(g.members);
  ok(a.rev===220&&a.missN===2&&a.costStatus==='ok','營收全部、缺成本 2 個');
  ok(near(a.net,c1.net)&&near(a.netRate,c1.net/80)&&near(a.cost,c1.cost)&&near(a.gross,c1.gross)&&a.cRev===80&&a.cFee===10,'只算有成本的成員');
  ok(near(a.net,k.net)&&near(a.netRate*100,k.rate),'缺成本時也跟 cupKpi 一樣');
  const all=T.cupPageAgg('P',E([row('X1',1,10,1,'P'),row('X2',1,10,1,'P')]));
  ok(all.cost===null&&all.net===null&&all.netRate===null&&all.grossRate===null&&all.costStatus==='missing'&&all.missN===2&&all.rev===20,'全部缺成本 ⇒ null、不當 0');
  ok(T.cupPageAgg('P',E([row('111',1,10,1,'P'),row('222',1,10,1,'P')])).costStatus==='barcode','全部是條碼');
  const st=T.cupPageAgg('P',E([row('A1',1,10,1,'P',{stock:3}),row('A2',1,10,1,'P',{stock:null}),row('B1',1,10,1,'P',{stock:0})]));
  ok(st.stock===3&&T.cupPageAgg('P',E([row('A1',1,10,1,'P')])).stock===null,'庫存：有數字的相加；都沒有 ⇒ null'); }
// ── 調整欄 ──
{ const S=T.cupPageNoteState;
  ok(S([{note:''},{note:''},{}]).same&&S([{note:''},{}]).value===''&&S([{},{}]).filled===0,'全部空白＝一樣');
  const a=S([{note:'降價'},{note:'降價'}]); ok(a.same&&a.value==='降價'&&a.filled===2&&a.n===2,'全部相同');
  const b=S([{note:'降價'},{note:''},{note:'加券'}]); ok(!b.same&&b.value===''&&b.filled===2&&b.n===3,'不一致：N＝有填的筆數'); }
// ── 排序 ──
{ const rows=base(), G=T.cupGroupByPage(rows);
  const d=T.cupGroupSort(G.items,{col:'rev',dir:'desc'},true), key=it=>it.type==='group'?it.agg.rev:it.row.rev;
  ok(d.map(key).join()==='2000,220,200,100,30','外層用合計值排（大到小）');
  ok(d[0].members.map(r=>r.rev).join()==='1000,600,300,100','組內用同一欄排');
  const a=T.cupGroupSort(G.items,{col:'rev',dir:'asc'},true); ok(a.map(key).join()==='30,100,200,220,2000'&&a[4].members[0].rev===100,'小到大');
  ok(T.cupGroupSort(G.items,null,true)===G.items,'沒有排序＝原樣');
  ok(G.items[0].members.map(r=>r.code).join()==='A1,A2,A3,M1','排序不改動原本的組');
  const nr=T.cupGroupSort(G.items,{col:'netRate',dir:'asc'},true); ok(nr.length===5,'淨利率（null 當 0）不出錯');
  const nm=T.cupGroupSort(G.items,{col:'name',dir:'asc'},false); ok(nm.map(it=>it.type==='group'?it.agg.name:it.row.name).join()==='品 A1,品 B1,品 M2,品 N1,品 X1','文字欄用外層名稱'); }
// ── 搜尋 ──
{ const rows=base(), G=T.cupGroupByPage(rows);
  ok(T.cupGroupFilter(G.items,'  ')===G.items,'空白＝原樣');
  const f=T.cupGroupFilter(G.items,'a2'); ok(f.length===1&&f[0].pageId==='PA'&&f[0].forceOpen&&f[0].shown.map(r=>r.code).join()==='A2','任一成員符合 ⇒ 展開、只列符合的');
  ok(f[0].agg.rev===2000&&f[0].members.length===4,'外層合計與成員名單不隨搜尋變');
  const p=T.cupGroupFilter(G.items,'pq'); ok(p.length===2&&p[0].pageId==='PA'&&p[0].shown.map(r=>r.code).join()==='M1'&&p[1].shown.length===2,'用酷澎編號搜（含另掛的頁）');
  const s=T.cupGroupFilter(G.items,'B1'); ok(s.length===1&&s[0].type==='single','單列照舊');
  ok(T.cupGroupFilter(G.items,'zzz').length===0,'沒有符合'); }
// ── 真實樣本（選用）──
if(process.env.CUP_SAMPLE_JSON){
  const raw=JSON.parse(fs.readFileSync(process.env.CUP_SAMPLE_JSON,'utf8'));
  if(process.env.CUP_SAMPLE_COST) T.setCost(JSON.parse(fs.readFileSync(process.env.CUP_SAMPLE_COST,'utf8')));
  const rows=E(raw), G=T.cupGroupByPage(rows), k=T.cupKpi(rows);
  ok(near(outerRev(G.items),k.rev),'樣本：營收守恆');
  ok(G.stats.grouped+G.stats.singles===rows.length,'樣本：列數守恆');
  const qty=G.items.reduce((s,it)=>s+(it.type==='group'?it.agg.qty:(Number(it.row.qty)||0)),0); ok(qty===k.qty,'樣本：銷量守恆');
  const net=G.items.reduce((s,it)=>s+(it.type==='group'?(it.agg.net||0):(it.row.costStatus==='ok'?it.row.net:0)),0); ok(Math.abs(net-k.net)<1e-4,'樣本：淨利守恆（只算有成本的）');
  console.log('樣本：', JSON.stringify(G.stats), '營收', Math.round(k.rev));
}
console.log('✓ coupang-page-merge：'+n+' 項通過');
