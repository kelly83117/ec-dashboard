// 酷澎商品彈窗「定價與成本」試算（2026-11-19）純函式測試：node scripts/coupang-pricing-calc.test.cjs
//   從 js/profit.js 抽 CUP-PC-PURE-BEGIN/END 與 cupVatOf、COUPANG_FEE_RATES、cupPCInit（假的主檔／成本表），不碰瀏覽器、不碰雲端。
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8');
const cut=(a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); return src.slice(i,j); };
const pure=cut('CUP-PC-PURE-BEGIN','// ─── harness 抽取標記：CUP-PC-PURE-END').replace(/^[^\n]*\n/,'');
const line=re=>{ const m=src.match(re); if(!m) throw new Error('找不到 '+re); return m[0]; };
const vat=line(/^function cupVatOf\(rev\)\{.*$/m), rates=line(/^const COUPANG_FEE_RATES=\{.*$/m);
const init=cut('function cupPCInit(shop, r){','function _cupPCVal(');
const F=new Function('__master','__costMap', rates+'\n'+vat+'\n'+pure+'\nconst cupPCMasterPrice=()=>__master; const momoLoadCostByOrigin=()=>__costMap;\n'+init+'\nreturn {cupPCFeeNote,cupPCFeeRate,cupPCFixedPerUnit,cupPCCalc,_cupPCSame,_cupPCMoney,_cupPCPct,cupPCInit,cupVatOf};');
const enrich=(r,unit,T)=>{ const has=unit!=null; r.cost=has?Math.round(unit*r.qty):null; r.costStatus=has?'ok':(/^\d+$/.test(r.code)?'barcode':'missing'); r.tax=T.cupVatOf(r.rev); r.net=has?(r.rev-r.tax-r.cost-r.fee):null; r.netRate=(r.net!=null&&r.rev>0)?r.net/r.rev:null; return r; };
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
{ const T=F(null,{});
  ok(Math.abs(T.cupPCFeeRate()-0.145)<1e-12,'費率＝deal+flow+freeShip');
  // 1) 沒改任何格：試算淨利率＝r.netRate（F421-01 2026-10 好麻吉的實際數字）
  const r=enrich({code:'F421-01',qty:93,rev:4171,grossRev:4557,sellerCoupon:386,fee:678},25,T), S=T.cupPCInit('麻吉',r), c=T.cupPCCalc(S.cur,S.feeRate,S.fixed);
  ok(Math.abs(c.rate-r.netRate)<1e-12,'預設值試算＝netRate'); ok(Math.abs(S.fixed-(678-4171*0.145)/93)<1e-12,'每件固定額');
  // 2) 售價 59、成本 30（賣家券不動）手算
  const c2=T.cupPCCalc({cost:30,price:59,coupon:S.orig.coupon},S.feeRate,S.fixed), n2=59-386/93;
  ok(Math.abs(c2.n-n2)<1e-12&&Math.abs(c2.fee-(n2*0.145+S.fixed))<1e-12&&Math.abs(c2.tax-n2*5/105)<1e-12&&Math.abs(c2.net-(n2-30-c2.fee-c2.tax))<1e-12&&Math.abs(c2.rate-c2.net/n2)<1e-12,'改售價成本手算');
  // 3) 隨機 2000 列：預設值一律＝netRate
  let seed=7; const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  for(let i=0;i<2000;i++){ const qty=1+Math.floor(rnd()*300), gross=Math.round(qty*(20+rnd()*900)), cp=Math.round(gross*rnd()*0.2), rev=gross-cp, fee=Math.round(rev*0.145+2*Math.ceil(qty*rnd())+rnd()*30);
    const r=enrich({code:'A'+i,qty,rev,grossRev:gross,sellerCoupon:cp,fee},Math.round(rnd()*400*100)/100,T), S=T.cupPCInit('x',r), c=T.cupPCCalc(S.cur,S.feeRate,S.fixed);
    if(r.netRate==null) ok(c.rate==null,'無淨利率'); else ok(Math.abs(c.rate-r.netRate)*100<0.05,'隨機列 '+i+' 差 '+Math.abs(c.rate-r.netRate)*100); }
  // 3b) 不封底：實際平台費比 營收×費率 低（例 營收 $5、平台費 $0）→ 固定額是負的，預設值仍＝netRate
  { const r=enrich({code:"H270-10",qty:1,rev:5,grossRev:6,sellerCoupon:1,fee:0},2,T), S=T.cupPCInit("麻吉",r), c=T.cupPCCalc(S.cur,S.feeRate,S.fixed); ok(S.fixed<0&&Math.abs(c.rate-r.netRate)<1e-12,"負的固定額"); }
  // 3c) 平台費小字：≥0「＋ 每件」、<0「，每件調整 −」（U+2212）；四捨五入後是 0 的負數算 ≥0
  { const a=T.cupPCFeeNote(0.145,0.7872), b=T.cupPCFeeNote(0.145,-0.73), z=T.cupPCFeeNote(0.145,-0.001), q0=T.cupPCFeeNote(0.145,0);
    ok(a.part==='14.5% ＋ 每件 $0.79'&&!a.neg&&/每單 \$2 發票費與運費金流/.test(a.title)&&!/零頭/.test(a.title),'小字 ≥0');
    ok(b.part==='14.5%，每件調整 \u2212$0.73'&&b.neg&&/零頭/.test(b.title),'小字 <0');
    ok(z.part==='14.5% ＋ 每件 $0.00'&&!z.neg&&q0.part==='14.5% ＋ 每件 $0.00','小字 0');
    // 改價後負的每件調整照算：H270-10 售價 ×2
    const r=enrich({code:'H270-10',qty:1,rev:5,grossRev:6,sellerCoupon:1,fee:0},2,T), S=T.cupPCInit('麻吉',r), c=T.cupPCCalc({cost:2,price:12,coupon:1},S.feeRate,S.fixed);
    ok(Math.abs(c.fee-(11*0.145-0.725))<1e-12&&Math.abs(c.net-(11-2-(11*0.145-0.725)-11*5/105))<1e-12,'負調整改價'); }
  // 4) 缺成本：成本留空、淨利率 null；填了才算
  const m=enrich({code:'C118-03',qty:1,rev:120,grossRev:69,sellerCoupon:-51,fee:19},null,T), Sm=T.cupPCInit('麻吉',m);
  ok(Sm.orig.cost===null&&Sm.costStatus==='missing'&&T.cupPCCalc(Sm.cur,Sm.feeRate,Sm.fixed).rate===null,'缺成本不算'); ok(T.cupPCCalc(Object.assign({},Sm.cur,{cost:40}),Sm.feeRate,Sm.fixed).rate!=null,'缺成本填了才算');
  // 5) 純數字條碼：同樣成本留空
  const b=enrich({code:'4710001112223',qty:5,rev:500,grossRev:500,sellerCoupon:0,fee:83},null,T), Sb=T.cupPCInit('麻吉',b);
  ok(Sb.costStatus==='barcode'&&Sb.orig.cost===null&&T.cupPCCalc(Sb.cur,Sb.feeRate,Sb.fixed).rate===null,'條碼不算');
  // 6) 格式：負數用 U+2212
  ok(T._cupPCPct(-0.0123)==='\u22121.2%'&&T._cupPCPct(-0.0001)==='0.0%'&&T._cupPCMoney(-3.456)==='\u2212$3.46'&&T._cupPCPct(null)==='—','格式');
  ok(T._cupPCSame(4.15,386/93)&&!T._cupPCSame(4.2,386/93)&&T._cupPCSame(null,null)&&!T._cupPCSame(null,0),'兩位小數內相同');
}
{ // 7) 本月沒有銷量：售價用主檔（最低）、賣家券 0、固定額 0、成本用成本表單位成本
  const T=F({min:199,max:249,n:3},{'Z1-01':80});
  const z=enrich({code:'Z1-01',qty:0,rev:0,grossRev:0,sellerCoupon:0,fee:0},80,T), S=T.cupPCInit('麻吉',z), c=T.cupPCCalc(S.cur,S.feeRate,S.fixed);
  ok(S.orig.price===199&&S.orig.coupon===0&&S.fixed===0&&S.orig.cost===80&&S.actual===null,'qty=0 預設值'); ok(Math.abs(c.fee-199*0.145)<1e-12&&Math.abs(c.rate-(199-80-199*0.145-199*5/105)/199)<1e-12,'qty=0 只算費率');
  const T2=F(null,{}); const S2=T2.cupPCInit('麻吉',enrich({code:'Z1-02',qty:0,rev:0,grossRev:0,sellerCoupon:0,fee:0},null,T2)); ok(S2.orig.price===null&&T2.cupPCCalc(S2.cur,S2.feeRate,S2.fixed)===null,'qty=0 沒主檔留空');
}
console.log('coupang-pricing-calc：'+n+' 項通過');
