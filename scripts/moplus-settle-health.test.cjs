// #532 MO+ 未補齊提醒擴到通路健檢／MOMO 總表／KPI：純函式測試。node scripts/moplus-settle-health.test.cjs
//   不碰瀏覽器、不碰雲端。從原始碼抽函式（依名稱找 function 宣告、括號配對）：
//   - js/profit.js：MOPLUS-SETTLE-COVER-PURE 區段（momoMoPlusSettleCover／momoMoPlusSettleText／momoMoPlusSettleNeedText）
//   - js/pages/health.js：_hlSettleOf、_hlSettleText、_hlTileSettleTip、_hlStdSellMonth、_hlStdHistAgg、_hlStdHistText
//   檢查：①「暫定」只看 snap 裡的 settle，不改分數；② 近 6 月排除未補齊的月份、灰字「不含未補齊 N 個月」；
//         ③ 沒有 settle 時近 6 月跟改版前同一份結果（多一個 settleN:0、settleNote:''）；④ 總表／KPI 共用的「還缺哪份檔」文字。
const fs=require('fs'), path=require('path'), assert=require('assert');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; }; const eq=(a,b,m)=>{ assert.deepStrictEqual(a,b,m); n++; };

// ── profit.js 純函式 ──
const P=read('js/profit.js');
const i=P.indexOf('MOPLUS-SETTLE-COVER-PURE-BEGIN'), j=P.indexOf('// ─── harness 抽取標記：MOPLUS-SETTLE-COVER-PURE-END');
if(i<0||j<0) throw new Error('找不到 MOPLUS-SETTLE-COVER-PURE 區段');
const pure=P.slice(i,j).replace(/^[^\n]*\n/,'');
const { momoMoPlusSettleCover:C, momoMoPlusSettleText:T, momoMoPlusSettleNeedText:NEED }=new Function(pure+'\nreturn {momoMoPlusSettleCover,momoMoPlusSettleText,momoMoPlusSettleNeedText};')();
const L=['2601','2602','2603','2604','2605','2606','2607','2608','2609','2610'];
eq(NEED([C('2026-10-FULL',L)]),'要等 12 月初上傳 11 月對帳明細','10 整月：要等 11 月檔');
eq(NEED([C('2026-10-FULL',L),C('2026-10-FULL',['2610'])]),'要等 12 月初上傳 11 月對帳明細','兩家同一份檔只列一次');
eq(NEED([C('2026-09-FULL',L)]),'','9 月已補齊：空字串');
eq(NEED([C('2026-09-FULL',['2601','2602','2603','2604','2605','2606','2607','2608','2610'])]),'缺 2026/09 對帳明細，請到「月對帳」補傳','漏傳 2609：補傳');
eq(NEED([C('2026-11-FULL',L)]),'要等 12 月初上傳 11 月對帳明細、1 月初上傳 12 月對帳明細','11 月：當月檔、下個月檔都還沒有');
eq(NEED([]),'','沒有店：空字串');
eq(NEED([C('2026-10-H1',L)]),'','10 上半（h1Mostly）不算未補齊');

// ── health.js 抽函式 ──
const H=read('js/pages/health.js');
function fn(src,name){
  const k=src.indexOf('function '+name+'('); if(k<0) throw new Error('找不到 '+name);
  let p=src.indexOf('{',src.indexOf(')',k)), d=0, q=null, esc=false;
  for(let x=p;x<src.length;x++){ const c=src[x];
    if(q){ if(esc){esc=false;continue;} if(c==='\\'){esc=true;continue;} if(c===q) q=null; continue; }
    if(c==='"'||c==="'"||c==='`'){ q=c; continue; }
    if(c==='{') d++; else if(c==='}'){ d--; if(d===0) return src.slice(k,x+1); } }
  throw new Error('括號不配對 '+name);
}
// 模板字串裡有 ${…}，上面的簡易掃描把整個 ` 當字串跳過，所以 ${ } 裡的 { } 不影響配對。
const names=['_hlSettleOf','_hlSettleText','_hlTileSettleTip','_hlStdSellMonth','_hlStdHistAgg','_hlStdHistText'];
const stub=`
const _hlFinite=v=>typeof v==='number'&&isFinite(v);
const _hlYmLabel=m=>m.slice(0,4)+'/'+m.slice(5,7);
const _hlFmtPct=v=>(v*100).toFixed(1)+'%';
const _hlFmtMoney=v=>'$'+Math.round(v).toLocaleString('en-US');
const HEALTH_RULES={ minRev:30000 };
const HL_STD_HIST_N=6;
const _HL_STD_WAIT=['loading','timeout','notLoaded'];
const _hlStdSub=(r,dim,key)=>{ const d=(r.dims||[]).find(x=>x.key===dim); return d?d.subs.find(x=>x.key===key):null; };
let HEALTH_CHANNELS=[];
function _hlProdOf(ch,month,snap){ if(!ch.prod) return {state:'na'}; const s=snap&&snap.prod&&snap.prod[ch.prod.platform+'|'+ch.prod.shop+'|'+month]; return s?{state:'ready',snap:s}:{state:'loading'}; }
`;
const api=new Function(stub+names.map(x=>fn(H,x)).join('\n')+'\nreturn {'+names.join(',')+', setCh:c=>{HEALTH_CHANNELS=c;}};')();

const chM={ id:'moplus-maji', label:'MO+ 好麻吉', type:'moplus', prod:{ platform:'momo', shop:'MO+麻吉' } };
const chS={ id:'moplus-sen', label:'MO+ 森之旅', type:'moplus', prod:{ platform:'momo', shop:'MO+森之旅' } };
const chJ={ id:'momo-jia', label:'甲配', type:'momoJia', prod:{ platform:'momo', shop:'甲配' } };
api.setCh([chM,chS,chJ]);
const settleSnap=(shop,m,on)=>{ const o={ status:'ok', rows:[] }; if(on) Object.defineProperty(o,'settle',{ value:{ worst:'waitNext', tip:'還沒補齊：缺 2026/11 對帳明細（12 月初上傳後補齊）。目前只含已結算的部分，銷量、營收偏低。' }, enumerable:false }); return o; };
const months=['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'];
const mkSnap=onMonths=>{ const prod={}; [chM,chS,chJ].forEach(ch=>months.forEach(m=>{ prod['momo|'+ch.prod.shop+'|'+m]=settleSnap(ch.prod.shop,m,ch.type==='moplus'&&onMonths.includes(m)); })); return { prod }; };
const stRes=(num,den,pureStatus)=>{ const s={ key:'sellThrough', status:'ok', raw:num/den }; Object.defineProperty(s,'stCount',{ value:{num,den}, enumerable:false });
  return { status:'ok', dims:[{ key:'structure', subs:[s] },{ key:'profit', subs:[{ key:'pureRate', status:pureStatus||'ok' }] }], items:[{ key:'sellThrough', status:'ok', score:80 }] }; };

// ① settle 只看 snap；甲配永遠 null；不可列舉（JSON 看不到）
{ const s=mkSnap(['2026-10']);
  ok(api._hlSettleOf(chM,'2026-10',s),'麻吉 10 月未補齊');
  ok(!api._hlSettleOf(chM,'2026-09',s),'麻吉 9 月補齊');
  ok(!api._hlSettleOf(chJ,'2026-10',s),'甲配不適用');
  eq(JSON.stringify(s.prod['momo|MO+麻吉|2026-10']),JSON.stringify({status:'ok',rows:[]}),'settle 不進 JSON');
  const t=api._hlSettleText(api._hlSettleOf(chM,'2026-10',s),'2026-10');
  ok(t.startsWith('2026/10 銷量還沒補齊：缺 2026/11 對帳明細'),'提醒全文開頭：'+t);
  ok(/純利率（KPI 月結）不受影響/.test(t)&&/暫定/.test(t),'提醒全文含純利率不受影響、暫定');
  const r={ id:'moplus-maji', month:'2026-10', items:[{ key:'sellThrough', status:'ok', score:80 }] };
  eq(api._hlTileSettleTip(r,s),t,'卡片暫定提示＝提醒全文');
  eq(api._hlTileSettleTip(Object.assign({},r,{ items:[{ key:'sellThrough', status:'loading' }] }),s),'','動銷率沒計分：不標暫定');
  eq(api._hlTileSettleTip(Object.assign({},r,{ month:'2026-09' }),s),'','補齊的月份不標');
  eq(api._hlTileSettleTip(Object.assign({},r,{ id:'momo-jia' }),s),'','甲配不標'); }

// ② 近 6 月排除＋灰字
const per=(ch,snap,vals)=>({ label:ch.label, rows:months.map((m,k)=>api._hlStdSellMonth(ch,m,snap,stRes(vals[k][0],vals[k][1],vals[k][2]))) });
const V_M=[[218,653],[253,654],[207,651],[217,652],[199,651],[189,651]];   // 麻吉 2026-05～10（離線站實測）
{ const off=mkSnap([]), on=mkSnap(['2026-10']);
  const a=api._hlStdHistAgg([per(chM,off,V_M)],months), b=api._hlStdHistAgg([per(chM,on,V_M)],months);
  eq(a.n,6,'改版前算 6 個月'); eq(a.settleN,0,'沒有未補齊');
  eq(b.n,5,'排除 10 月剩 5 個月'); eq(b.settleN,1,'未補齊 1 個月');
  eq(b.excluded.map(x=>x.month),['2026-10'],'10 月進「沒算進去」');
  ok(/銷量還沒補齊/.test(b.excluded[0].reason),'原因寫銷量還沒補齊');
  eq(Math.round(b.rate*1000)/10,33.5,'平均 33.5%（1094÷3261）');
  eq(Math.round(a.rate*1000)/10,32.8,'改版前平均 32.8%');
  const ta=api._hlStdHistText(a,'sellThrough'), tb=api._hlStdHistText(b,'sellThrough');
  eq(ta.settleNote,'','改版前沒有灰字'); eq(tb.settleNote,'不含未補齊 1 個月','灰字');
  eq(tb.avg,'33.5%','格子平均');
  ok(/沒算進去：\n2026\/10　2026\/10 銷量還沒補齊/.test(tb.tip),'提示列出沒算進去的月份'); }
// 只有未補齊那個月是計分月份 ⇒ 改用營收未滿的月份（僅供參考），規則同改版前
{ const V_S=[[59,277,'smallRev'],[49,277,'smallRev'],[57,277,'smallRev'],[40,277,'smallRev'],[50,277,'smallRev'],[42,277]];
  const b=api._hlStdHistAgg([per(chS,mkSnap(['2026-10']),V_S)],months), t=api._hlStdHistText(b,'sellThrough');
  ok(b.refOnly,'森之旅：只剩參考月份'); eq(t.avg,'18.4%','森之旅平均 18.4%'); eq(t.settleNote,'不含未補齊 1 個月','森之旅灰字'); }
// 類型列：三家都未補齊的月份整個不算
{ const b=api._hlStdHistAgg([per(chM,mkSnap(['2026-10']),V_M),per(chS,mkSnap(['2026-10']),[[59,277,'smallRev'],[49,277,'smallRev'],[57,277,'smallRev'],[40,277,'smallRev'],[50,277,'smallRev'],[42,277]])],months);
  eq(b.n,5,'類型列 5 個月'); eq(b.settleN,1,'類型列未補齊 1 個月'); }
// ③ 沒有 settle：每個月的結果跟拿掉這條規則前一樣（ok／num／den）
{ const r=per(chM,mkSnap([]),V_M).rows; ok(r.every(x=>x.ok&&!x.settle),'沒有未補齊：每個月都算'); eq(r.map(x=>x.num),V_M.map(v=>v[0]),'分子不變'); }

console.log('moplus-settle-health：'+n+' 項全部通過');
