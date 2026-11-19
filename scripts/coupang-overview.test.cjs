// 酷澎｜總表（2026-11-19）資料層純函式測試：node scripts/coupang-overview.test.cjs
//   從 js/profit.js 抽 CUP-OV-PURE-BEGIN/END，以及它用到的 cupKpi、cupVatOf、cupEnrichRows、CUP-PM-PURE（動銷率）、MOMO_ANALYSIS_CFG、momoMoney、_momoEsc。
//   資料全是合成的假資料；不碰瀏覽器、不碰雲端。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8').replace(/\r\n/g,'\n');
const between=(a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(src.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return src.slice(i,j+b.length); };
const line=re=>{ const m=src.match(re); if(!m) throw new Error('找不到 '+re); return m[0]; };
const fnMulti=name=>{ const i=src.indexOf('\nfunction '+name+'('); if(i<0) throw new Error('找不到 '+name); const j=src.indexOf('\n}\n',i); return src.slice(i+1,j+2); };
const code=[ line(/^const MOMO_ANALYSIS_CFG=.*$/m), line(/^const _momoEsc=.*$/m), line(/^function momoMoney\(v\)\{.*$/m), line(/^function cupVatOf\(rev\)\{.*$/m),
  'let __costMap={}; const momoLoadCostByOrigin=()=>__costMap;', fnMulti('cupEnrichRows'), fnMulti('cupKpi'),
  between('/* ═══ CUP-PM-PURE-BEGIN','/* ═══ CUP-PM-PURE-END ═══ */'), between('/* ═══ CUP-OV-PURE-BEGIN','/* ═══ CUP-OV-PURE-END ═══ */'),
  'return { cupOvCalc, cupOvStockByCode, cupOvAnalysisCalc, cupEnrichRows, cupKpi, cupProductsListed, cupSellThroughCalc, setCost:m=>{__costMap=m;}, CFG:MOMO_ANALYSIS_CFG };' ].join('\n');
const T=new Function(code)();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const row=(code,qty,rev,fee,dispId)=>({code,name:code,qty,rev,grossRev:rev,sellerCoupon:0,fee,dispId:dispId||('P'+code)});
const E=rows=>T.cupEnrichRows(rows.map(r=>Object.assign({},r)));
const txt=a=>a.suggestions.map(x=>x.html.replace(/<[^>]+>/g,' ')).join(' || ');

T.setCost({A:10,B:50,C:90,D:10,E:10});
// ── cupOvCalc：等於 cupKpi；沒有報表 has:false；動銷率用同一支 ──
{ const rows=E([row('A',10,1000,150,'P1'),row('B',2,200,30,'P2'),row('X',1,100,15,'P3'),row('123456',1,50,8,'P4')]);
  const k=T.cupKpi(rows), listed=new Set(['P1','P2','P9','P8']), d=T.cupOvCalc(rows, listed);
  ok(d.has&&d.rev===k.rev&&d.net===k.net&&d.rate===k.rate&&d.qty===k.qty,'合計＝cupKpi');
  ok(d.cRev===1200,'cRev 只算有成本的列');
  const st=T.cupSellThroughCalc(rows, listed); ok(d.stNum===st.num&&d.stDen===st.den&&d.stNum===4&&d.stDen===6,'動銷率同一支');
  const none=T.cupOvCalc(null, listed); ok(!none.has&&none.rev===0&&none.net===0&&none.rate===null&&none.stNum===null,'沒有報表');
  ok(T.cupOvCalc(rows,null).stDen===null,'沒有主檔 ⇒ 動銷率 null'); }
// ── cupOvStockByCode：最新清單加總；不在最新清單、庫存不明不放 ──
{ const doc={latestExport:'2026-11-17 20:50:12',items:[{sku:'1',code:'A',stock:0,lastSeen:'2026-11-17 20:50:12'},{sku:'2',code:'A',stock:0,lastSeen:'2026-11-17 20:50:12'},
    {sku:'3',code:'B',stock:0,lastSeen:'2026-11-17 20:50:12'},{sku:'4',code:'B',stock:5,lastSeen:'2026-11-17 20:50:12'},
    {sku:'5',code:'C',stock:null,lastSeen:'2026-11-17 20:50:12'},{sku:'6',code:'D',stock:0,lastSeen:'2026-10-01 00:00:00'},{sku:'7',code:'',stock:0,lastSeen:'2026-11-17 20:50:12'}]};
  const s=T.cupOvStockByCode(doc);
  ok(s.by.A===0&&s.by.B===5&&!('C' in s.by)&&!('D' in s.by)&&s.latest===doc.latestExport,'庫存表'); ok(Object.keys(T.cupOvStockByCode(null).by).length===0,'沒有主檔'); }
// ── 規則 ──
{ // A 賺、B 小虧、C 大虧、X 缺成本、條碼不算缺成本、Z 沒動不納入
  const cur=E([row('A',10,1000,150),row('B',2,100,15),row('C',3,270,40),row('X',1,300,45),row('123456',1,50,8),row('Z',0,0,0)]);
  const a=T.cupOvAnalysisCalc('麻吉',cur,null,{isLatest:false});
  ok(a.hasProducts&&a.counts.r1.n===2,'規則1 筆數'); ok(Math.abs(a.counts.r1.amt-(-(cur[1].net)-(cur[2].net)))<1e-9,'規則1 金額');
  ok(a.counts.r5.n===1&&a.counts.r5.amt===300&&a.missN===1,'規則5 只算 missing'); ok(a.counts.r3.n===0&&a.counts.r4.n===0,'沒上月、非最新月 ⇒ 3、4 不產出');
  ok(a.suggestions.length===2&&a.suggestions[0].impact>=a.suggestions[1].impact&&a.topImpact===a.suggestions[0].impact,'只取前 2 則、依影響金額');
  ok(/最慘 C：/.test(txt(a)),'最慘＝虧最多');
  const none=T.cupOvAnalysisCalc('露營館',null,null,{}); ok(!none.hasProducts&&none.suggestions.length===0&&none.topImpact===-1,'沒有報表'); }
{ // 規則2：前 20% 且 0≤淨利率<10%
  T.setCost({H:78,L:10,M:10,N:10,O:10});
  const cur=E([row('H',10,1000,100),row('L',1,100,10),row('M',1,90,9),row('N',1,80,8),row('O',1,70,7)]);
  const a=T.cupOvAnalysisCalc('麻吉',cur,null,{}); ok(cur[0].netRate>=0&&cur[0].netRate<0.10,'前提'); ok(a.counts.r2.n===1&&a.counts.r2.amt===1000,'規則2'); }
{ // 規則3：跌超過 marginDropPt；當月未完不產出；小字沒有「成本上升」
  T.setCost({P:50,Q:50,R:50});
  const prev=E([row('P',10,1000,145),row('Q',10,1000,145),row('R',0,0,0)]), cur=E([row('P',10,800,116),row('Q',10,990,144),row('R',5,500,70)]);
  const a=T.cupOvAnalysisCalc('麻吉',cur,prev,{});
  ok(a.counts.r3.n===1,'規則3 筆數（Q 跌不到 5pt、R 上月沒賣）'); ok(/淨利率惡化/.test(txt(a))&&/成交均價下降 \$100→\$80（售價或賣家券變動）/.test(txt(a))&&/上月用目前成本回算/.test(txt(a)),'規則3 小字');
  ok(!/成本上升/.test(txt(a)),'不可出現成本上升');
  ok(T.cupOvAnalysisCalc('麻吉',cur,prev,{incomplete:true}).counts.r3.n===0,'當月未完不產出'); ok(T.cupOvAnalysisCalc('麻吉',cur,null,{}).counts.r3.n===0,'沒有上月不產出');
  // 均價沒掉（平台費變多）→ 中性句
  const cur2=E([row('P',10,1000,300)]), a2=T.cupOvAnalysisCalc('麻吉',cur2,prev,{}); ok(a2.counts.r3.n===1&&/· 售價、賣家券或平台費變動；/.test(txt(a2)),'中性句'); }
{ // 規則4：只在最新月、庫存加總 0、不在主檔不判
  T.setCost({A:10,B:10,C:10,D:10});
  const cur=E([row('A',5,500,70),row('B',5,400,60),row('C',5,300,45),row('D',5,200,30),row('W',0,0,0)]);
  const stock={by:{A:0,B:3,W:0},latest:'2026-11-17 20:50:12'};
  const a=T.cupOvAnalysisCalc('麻吉',cur,null,{isLatest:true,stock}); ok(a.counts.r4.n===1&&a.counts.r4.amt===500,'規則4（C、D 不在主檔不判；W 沒賣）'); ok(/庫存為 11\/17 清單當下/.test(txt(a)),'註明清單日期');
  ok(T.cupOvAnalysisCalc('麻吉',cur,null,{isLatest:false,stock}).counts.r4.n===0,'不是最新月不產出'); ok(T.cupOvAnalysisCalc('麻吉',cur,null,{isLatest:true,stock:null}).counts.r4.n===0,'沒有主檔不產出'); }
{ // 全部正常 ⇒ noAnomaly
  T.setCost({A:10}); const a=T.cupOvAnalysisCalc('麻吉',E([row('A',10,1000,145)]),null,{}); ok(a.noAnomaly&&a.topImpact===0,'本期無異常'); }
ok(T.CFG.lowMarginPct===10&&T.CFG.marginDropPt===5&&T.CFG.topRevPctile===0.2,'門檻沿用 MOMO_ANALYSIS_CFG');
console.log('coupang-overview：'+n+' 項通過');
