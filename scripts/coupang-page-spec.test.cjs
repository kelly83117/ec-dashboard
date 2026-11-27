// 酷澎「合併商品頁」整頁各規格視窗（2026-11-27）純函式測試：node scripts/coupang-page-spec.test.cjs
//   從 js/profit.js 抽 CUP-PC-PURE（cupPCCalc 等）、CUP-PGA-PURE（規格名、加權、批次調價、儲存計畫、紀錄內容），
//   對照用的 cupEnrichRows、cupVatOf 與 CUP-PG-PURE（cupPageAgg）。資料全是合成的假資料；不碰瀏覽器、不碰雲端。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8').replace(/\r\n/g,'\n');
const between=(a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(src.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return src.slice(i,j+b.length); };
const line=re=>{ const m=src.match(re); if(!m) throw new Error('找不到 '+re); return m[0]; };
const fnMulti=name=>{ const i=src.indexOf('\nfunction '+name+'('); if(i<0) throw new Error('找不到 '+name); const j=src.indexOf('\n}\n',i); return src.slice(i+1,j+2); };
const code=[ line(/^const COUPANG_FEE_RATES=\{.*$/m), line(/^function cupVatOf\(rev\)\{.*$/m),
  'let __costMap={}; const momoLoadCostByOrigin=()=>__costMap;', fnMulti('cupEnrichRows'),
  between('// ─── harness 抽取標記：CUP-PC-PURE-BEGIN','// ─── harness 抽取標記：CUP-PC-PURE-END'),
  between('/* ═══ CUP-PG-PURE-BEGIN','/* ═══ CUP-PG-PURE-END ═══ */'),
  between('// ─── harness 抽取標記：CUP-PGA-PURE-BEGIN','// ─── harness 抽取標記：CUP-PGA-PURE-END'),
  'return { cupPCCalc, cupPCFeeRate, cupPCFixedPerUnit, cupEnrichRows, cupPageAgg, cupPgaSpecLabels, cupPgaWeighted, cupPgaBulkPrice, cupPgaNum, cupPgaSavePlan, cupPgaNote, setCost:m=>{__costMap=m;} };' ].join('\n');
const T=new Function(code)();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; }; const eq=(a,b,m)=>{ assert.deepStrictEqual(a,b,m); n++; };
const near=(a,b,e)=>Math.abs(a-b)<(e||1e-9);

// ── 規格名 ──
eq(T.cupPgaSpecLabels(['牛角包, 綠色, 大款 (大款 綠色)','牛角包 - 時尚, 黑色, 大款 (大款 黑色)']),['大款 綠色','大款 黑色'],'括號裡的選項值（前面不同也可以）');
eq(T.cupPgaSpecLabels(['杯子, 紅','杯子, 藍']),['紅','藍'],'沒有括號：拿掉共同開頭（切在逗號）');
eq(T.cupPgaSpecLabels(['同名','同名']),['同名','同名'],'共同開頭拿完是空的 ⇒ 整個品名');
eq(T.cupPgaSpecLabels(['只有一個']),['只有一個'],'只有一個成員 ⇒ 整個品名');
eq(T.cupPgaSpecLabels(['A (同)','B (同)']),['A (同)','B (同)'],'括號全相同 ⇒ 不用括號');
eq(T.cupPgaSpecLabels(['X (L)','Y']),['X (L)','Y'],'有成員沒括號 ⇒ 不用括號');
eq(T.cupPgaSpecLabels(['','']),['—','—'],'空白品名 ⇒ —');

// ── 加權：沒銷量、缺成本不參與；空 ⇒ null ──
const c=v=>T.cupPCCalc(v,0.145,1);
{ const w=T.cupPgaWeighted([{q:10,calc:c({cost:50,price:100,coupon:0})},{q:0,calc:c({cost:10,price:100,coupon:0})},{q:5,calc:c({cost:null,price:100,coupon:0})}]);
  ok(w.n===1 && near(w.rate, c({cost:50,price:100,coupon:0}).rate),'只算有銷量且有成本的列'); }
ok(T.cupPgaWeighted([]).rate===null && T.cupPgaWeighted(null).rate===null,'沒有列 ⇒ null');
{ const a=c({cost:50,price:100,coupon:0}), b=c({cost:20,price:60,coupon:5});
  const w=T.cupPgaWeighted([{q:3,calc:a},{q:7,calc:b}]); ok(near(w.rate,(a.net*3+b.net*7)/(a.n*3+b.n*7)),'依件數加權＝Σ淨利÷Σ營收'); }

// ── 沒改時：每列 cupPCCalc(本月單位值) × 件數 加權 ＝ 外層列 cupPageAgg.netRate（含 1 個缺成本） ──
{ T.setCost({P1:40,P2:55,P3:12});
  const rows=T.cupEnrichRows([
    {code:'P1',name:'x (紅)',qty:10,rev:1200,grossRev:1300,sellerCoupon:100,fee:190,dispId:'PG'},
    {code:'P2',name:'x (藍)',qty:3, rev:500, grossRev:500, sellerCoupon:0,  fee:80, dispId:'PG'},
    {code:'P3',name:'x (綠)',qty:7, rev:280, grossRev:300, sellerCoupon:20, fee:47, dispId:'PG'},
    {code:'P9',name:'x (黑)',qty:2, rev:90,  grossRev:90,  sellerCoupon:0,  fee:14, dispId:'PG'} ]);   // P9 缺成本
  const agg=T.cupPageAgg('PG',rows), fr=T.cupPCFeeRate();
  const calcs=rows.map(r=>({ q:r.qty, calc:T.cupPCCalc({ cost:r.costStatus==='ok'?r.cost/r.qty:null, price:r.grossRev/r.qty, coupon:r.sellerCoupon/r.qty }, fr, T.cupPCFixedPerUnit(r)) }));
  const w=T.cupPgaWeighted(calcs);
  ok(w.n===3,'缺成本那列不算'); ok(near(w.rate, agg.netRate, 1e-12),'加權淨利率＝cupPageAgg.netRate（'+w.rate+' vs '+agg.netRate+'）');
  rows.forEach((r,i)=>{ if(r.costStatus==='ok') ok(near(calcs[i].calc.rate, r.netRate, 1e-12),'單列＝總表 netRate '+r.code); }); }

// ── 批次調價（照 momoPCBulkApply） ──
ok(T.cupPgaBulkPrice(139,'pct',-10)===125,'−10% 四捨五入到整數元');
ok(T.cupPgaBulkPrice(139,'pct',0)===139,'0%＝原價');
ok(T.cupPgaBulkPrice(null,'pct',-10)===null && T.cupPgaBulkPrice(0,'pct',10)===null,'沒有售價不能調 %');
ok(T.cupPgaBulkPrice(5,'pct',-100)===null,'調到 0 ⇒ 不動');
ok(T.cupPgaBulkPrice(5,'abs',199)===199 && T.cupPgaBulkPrice(5,'abs',0)===null && T.cupPgaBulkPrice(5,'abs',-1)===null,'統一改為 $ 要 >0');

// ── 數字格式 ──
eq([T.cupPgaNum(139),T.cupPgaNum(69.5),T.cupPgaNum(68.255),T.cupPgaNum(null),T.cupPgaNum(NaN)],['139','69.5','68.26','—','—'],'cupPgaNum');

// ── 儲存計畫 ──
const R=[{code:'E3',label:'大款 綠色'},{code:'E2',label:'大款 黑色'},{code:'E4',label:'大款 米色'}];
const O={cost:{E3:68,E2:68.99,E4:68},price:{E3:139,E2:139,E4:139}};
{ const P=T.cupPgaSavePlan(R,O,{cost:{...O.cost},price:{...O.price}},{E3:68,E2:69,E4:68});
  ok(P.total===0 && P.specs===0 && !P.costs.length && !P.prices.length,'沒改 ⇒ 空計畫'); }
{ const P=T.cupPgaSavePlan(R,O,{cost:{...O.cost,E2:70},price:{...O.price,E3:159,E2:125}},{E3:68,E2:69,E4:68});
  eq(P.costs,[{code:'E2',label:'大款 黑色',from:69,to:70}],'成本：舊值用成本表現值 69（不是畫面的 68.99）');
  eq(P.prices.map(o=>[o.code,o.from,o.to]),[['E3',139,159],['E2',139,125]],'售價：畫面順序');
  ok(P.specs===2 && P.total===3,'規格數＝2（E2 成本＋售價算 1 個）、項目＝3');
  ok(T.cupPgaNote(P,' 雙12降價 ')==='整頁調整（2 個規格）：售價 大款 綠色 139→159、大款 黑色 139→125；成本 大款 黑色 69→70｜原因：雙12降價','紀錄內容（照範例）'); }
{ const P=T.cupPgaSavePlan(R,O,{cost:{...O.cost,E2:69},price:{...O.price}},{E3:68,E2:69,E4:68});
  ok(P.total===0,'畫面原值 68.99、改成 69＝成本表現值 ⇒ 不用寫'); }
{ const P=T.cupPgaSavePlan(R,O,{cost:{...O.cost,E4:70},price:{...O.price}},{});
  eq(P.costs,[{code:'E4',label:'大款 米色',from:68,to:70}],'成本表沒有這個編號 ⇒ 舊值用畫面原值');
  ok(T.cupPgaNote(P,'補')==='整頁調整（1 個規格）：成本 大款 米色 68→70｜原因：補','只改成本：沒有售價段'); }
{ const P=T.cupPgaSavePlan(R,O,{cost:{...O.cost},price:{...O.price,E4:149}},{E3:68,E2:69,E4:68});
  ok(!P.costs.length && P.prices.length===1 && T.cupPgaNote(P,'測').indexOf('成本')<0,'只改售價：沒有成本段'); }
{ // 同一個原廠編號出現在兩列（成本連動）：成本只列一次，規格數兩列都算
  const R2=[{code:'Z1',label:'A'},{code:'Z1',label:'B'},{code:'Z2',label:'C'}];
  const P=T.cupPgaSavePlan(R2,{cost:{Z1:10,Z2:5},price:{Z1:50,Z2:30}},{cost:{Z1:12,Z2:5},price:{Z1:50,Z2:30}},{Z1:10,Z2:5});
  ok(P.costs.length===1 && P.costs[0].code==='Z1' && P.specs===2,'同原廠：成本一筆、規格數 2'); }
{ const P=T.cupPgaSavePlan(R,O,{cost:{...O.cost,E3:null},price:{...O.price,E4:null}},{E3:68});
  ok(P.costs.length===1 && P.costs[0].to===null && P.prices[0].to===null,'清空的格子也列出來（存檔前另外擋 >0）'); }

console.log('✓ coupang-page-spec：'+n+' 項通過');
