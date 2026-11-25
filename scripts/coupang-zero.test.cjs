// 酷澎「🎯 零動銷」（2026-11-25 第 1 塊）純函式測試：node scripts/coupang-zero.test.cjs
//   從 js/profit.js 抽 CUP-PM-PURE（2026-11-25 起動銷率卡用 cupSidListed／cupSidSellThroughCalc＝Wing 商品口徑）與 CUP-ZERO-PURE。
//   這裡的合成主檔沒有 sid ⇒ 每個商品頁自己算一個 Wing 商品單位，行為跟商品頁口徑相同；sid 的規則見 coupang-sid-unit.test.cjs。
//   另外檢查 _zeroTip 的 coupang 分支、按鈕與 window 名單都接上了。
//   CUP_BACKUP_JSON=<v3 備份檔> node scripts/coupang-zero.test.cjs   ← 另外用真實主檔／報表驗 2026-10 筆數（只印數字，不印內容）
//   資料預設全是合成的假資料；不碰瀏覽器、不碰雲端。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8').replace(/\r\n/g,'\n');
const between=(a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(src.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return src.slice(i,j+b.length); };
const code=[ between('/* ═══ CUP-PM-PURE-BEGIN','/* ═══ CUP-PM-PURE-END ═══ */'), between('/* ═══ CUP-ZERO-PURE-BEGIN','/* ═══ CUP-ZERO-PURE-END ═══ */'),
  'return { cupProductsListed, cupSellThroughCalc, cupSidIndex, cupSidListed, cupSidSellThroughCalc, _czBuild, _czNameIndex, _czOpenNote, _czIds };' ].join('\n');
const T=new Function(code)();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const LT='2026-11-17 20:50:12', OLD='2026-10-01 10:00:00';
const it=(sku,pid,code,stock,status,seen)=>({sku,pid,code,stock,status:status||'판매중',lastSeen:seen||LT});
const row=(code,qty,rev,dispId,name)=>({code,qty,rev,dispId,name:name===undefined?('名'+code):name});
const noNames={byDisp:{},byCode:{},byOther:{}};

// ── 名單＝在架 pid − 本月有賣的 dispId；筆數＝卡片 den − num ──
{ const doc={latestExport:LT,items:[
    it('1','P1','A',5), it('2','P1','B',0),          // P1：兩選項加總 5 ⇒ ①
    it('3','P2','C',0), it('4','P2','D',0),          // P2：全部 0 ⇒ ②
    it('5','P3','E',null), it('6','P3','F',3),       // P3：有選項沒數字但加總 >0 ⇒ ①（partial）
    it('7','P4','G',null),                           // P4：沒有任何數字 ⇒ ③
    it('8','P5','H',0), it('9','P5','I',0,'판매중지'), // P5：有選項在賣 ⇒ 上架；全部 0 ⇒ ②
    it('10','P6','J',9,'판매중지'),                    // P6：整頁停售 ⇒ 不在架
    it('11','P7','K',9,'판매중',OLD),                 // P7：不在最新清單 ⇒ 不在架
    it('12','P8','L',4),                             // P8：本月有賣（跟 P9 合在一列）
    it('13','P9','L',4),                             // P9：本月有賣（"/" 拆開）
    it('14','P10','A',2) ]};                          // P10：A 也掛在 P1 ⇒ 共用
  const rows=[row('L',3,300,'P8/P9'), row('M',1,100,'PX'), row('A',0,0,'P10'), row('Z',0,0,'')];
  const r=T._czBuild({doc,rows,prevRows:null,hist:[],names:noNames});
  const card=T.cupSidSellThroughCalc(rows, T.cupSidListed(doc).listed, T.cupSidIndex(doc));
  const old=T.cupSellThroughCalc(rows, T.cupProductsListed(doc).listed); ok(old.num===card.num&&old.den===card.den,'沒有 sid ⇒ 跟商品頁口徑一樣');
  ok(r.num===card.num&&r.den===card.den,'num／den 跟卡片同一支');
  ok(r.unsold===card.den-card.num,'筆數＝卡片 den − num');
  ok(card.num===3&&card.den===9&&r.unsold===6,'分母＝上架 8 頁 ∪ 有賣 3 頁（PX 不在清單）＝9；零動銷 6');
  const ids=k=>r.groups[k].map(x=>x.pid);
  ok(JSON.stringify(ids('have'))===JSON.stringify(['P1','P3','P10']),'① 依庫存多到少（5、3、2）');
  ok(JSON.stringify(ids('zero').slice().sort())===JSON.stringify(['P2','P5']),'② 全部有數字且 0');
  ok(JSON.stringify(ids('unknown'))===JSON.stringify(['P4']),'③ 沒有數字');
  const p1=r.groups.have.find(x=>x.pid==='P1'), p3=r.groups.have.find(x=>x.pid==='P3'), p5=r.groups.zero.find(x=>x.pid==='P5');
  ok(p1.stock===5&&p1.optN===2&&!p1.partial,'頁庫存＝選項加總');
  ok(p3.stock===3&&p3.partial,'部分選項沒數字');
  ok(p5.optN===2&&p5.stock===0,'停售的選項也算進選項數與加總（這頁在最新清單裡的所有選項）');
  ok(p1.shared.length===1&&p1.shared[0].code==='A'&&p1.shared[0].others===1&&r.multiPage===2,'跨頁原廠編號：P1、P10 都標');
  ok(r.latest===LT&&r.listedN===8&&r.soldNotListed===1,'清單日期、上架數');
  ok(!ids('have').concat(ids('zero'),ids('unknown')).some(p=>['P6','P7','P8','P9'].includes(p)),'停售頁、舊清單、有賣的不列'); }

// ── 品名四段順序 ──
{ const doc={latestExport:LT,items:[it('1','Q1','A',1),it('2','Q2','B',1),it('3','Q3','C',1),it('4','Q4','D',1)]};
  const own=[[row('X',1,1,'Q1','舊名')],[row('X',1,1,'Q1','新名')]];
  const all=[[row('B',1,1,'R9','別館B')],[row('A',1,1,'R8','別館A')]];
  const names=T._czNameIndex(own, all, {C:'PChome名', A:'不該用'});
  const r=T._czBuild({doc,rows:[],prevRows:null,hist:[],names});
  const by=Object.fromEntries(r.groups.have.map(x=>[x.pid,x]));
  ok(by.Q1.name==='新名'&&by.Q1.nameSrc==='report','① 本通路同 dispId，新的月份優先');
  ok(by.Q2.name==='別館B'&&by.Q2.nameSrc==='reportCode','② 兩館同原廠編號');
  ok(by.Q3.name==='PChome名'&&by.Q3.nameSrc==='other','③ PChome／MOMO 主檔');
  ok(by.Q4.name===''&&by.Q4.nameSrc==='','④ 沒有品名'); }

// ── 上月營收、最近有賣 ──
{ const doc={latestExport:LT,items:[it('1','S1','A',1),it('2','S2','B',1),it('3','S3','C',1)]};
  const prev=[row('A',2,200,'S1'), row('A',1,50,'S1'), row('B',1,90,'S2/S9')];
  const hist=[{ym:'2026-09',rows:[row('A',0,0,'S1')]},{ym:'2026-08',rows:[row('A',1,10,'S1'),row('B',2,20,'S2/S9')]},{ym:'2026-07',rows:[row('C',1,1,'S3')]}];
  const r=T._czBuild({doc,rows:[],prevRows:prev,hist,names:noNames});
  const by=Object.fromEntries(r.groups.have.map(x=>[x.pid,x]));
  ok(by.S1.rev===250&&!by.S1.revShared,'上月營收＝掛在這頁的列加總');
  ok(by.S2.rev===90&&by.S2.revShared,'跟其他頁合列 ⇒ 標 revShared');
  ok(by.S3.rev===0,'上月有報表但沒有這頁 ⇒ 0');
  ok(by.S1.lastSold==='2026-08'&&by.S2.lastSold==='2026-08'&&by.S3.lastSold==='2026-07','最近有賣：qty>0 的最近一個月');
  ok(r.groups.have[0].pid==='S1','同庫存依上月營收排');
  const r2=T._czBuild({doc,rows:[],prevRows:null,hist:[],names:noNames});
  ok(r2.groups.have.every(x=>x.rev===null&&x.lastSold===''),'沒有上月報表 ⇒ null'); }

// ── 邊界 ──
{ const r=T._czBuild({doc:null,rows:null,prevRows:null,hist:null,names:null});
  ok(r.unsold===0&&r.den===0&&r.num===0,'沒有主檔、沒有報表不丟錯');
  ok(JSON.stringify(T._czIds(' A / B /'))===JSON.stringify(['A','B']),'dispId 拆法同 cupSellThroughCalc');
  const on=T._czOpenNote('露營館','2026-10'); ok(on&&on.date==='2026/10/25'&&on.days===7,'玩樂開賣月：7 天');
  ok(T._czOpenNote('露營館','2026-11')===null&&T._czOpenNote('麻吉','2026-10')===null,'其他月份、其他館不提示'); }

// ── 接線：_zeroTip coupang 分支、按鈕、window 名單、overlay ──
{ ok(/kind==='coupang'\s*\n?\s*\?'「在架」是用目前最新一份商品清單/.test(src),'_zeroTip 在架句');
  ok(src.includes("onclick=\"openCoupangZeroModal('${shop}')\""),'cupRenderShop 工具列按鈕');
  ok(/openCoupangZeroModal,closeCoupangZeroModal,coupangZeroSetMonth,coupangZeroExportExcel,__cupZeroSnap,/.test(src),'window 名單');
  ok(src.includes('id="cz-modal-overlay"')&&src.includes('id="cz-modal-body"')&&src.includes('id="cz-modal-title"'),'cz overlay'); }

// ── 選填：真實備份（2026-10 Wing 商品口徑：好麻吉 564（商品頁口徑是 930）、玩樂 79） ──
const BK=process.env.CUP_BACKUP_JSON;
if(BK){
  const d=JSON.parse(fs.readFileSync(BK,'utf8'));
  const dec=v=>{ if(v==null) return v; if('stringValue' in v) return v.stringValue; if('integerValue' in v) return Number(v.integerValue); if('doubleValue' in v) return v.doubleValue; if('booleanValue' in v) return v.booleanValue; if('nullValue' in v) return null; if('timestampValue' in v) return v.timestampValue; if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec); if('mapValue' in v){ const o={},f=v.mapValue.fields||{}; for(const k in f) o[k]=dec(f[k]); return o; } return v; };
  const get=k=>{ const x=d[k]; if(!x||!x.fields) return null; const o={}; for(const f in x.fields) o[f]=dec(x.fields[f]); return o; };
  const want={ maji:{n:564,g:[313,251,0]}, luying:{n:79,g:[77,2,0]} };
  Object.keys(want).forEach(id=>{
    const items=[]; let latest=''; for(let i=0;i<4;i++){ const s=get('coupang_products/'+id+'_'+i); if(!s) continue; items.push(...s.items); if(s.latestExport>latest) latest=s.latestExport; }
    const doc={schema:1,latestExport:latest,items}, rep=get('coupang_reports/'+id+'_2026-10');
    const r=T._czBuild({doc,rows:rep.rows,prevRows:null,hist:[],names:noNames});
    const card=T.cupSidSellThroughCalc(rep.rows, T.cupSidListed(doc).listed, T.cupSidIndex(doc));
    const g=[r.groups.have.length,r.groups.zero.length,r.groups.unknown.length];
    console.log('[備份] '+id+' 2026-10：卡片 '+card.num+'/'+card.den+'，零動銷 '+r.unsold+'（'+g.join('／')+'），跨頁共用 '+r.multiPage);
    ok(r.unsold===card.den-card.num,id+' 筆數＝卡片 den − num');
    ok(r.unsold===want[id].n&&JSON.stringify(g)===JSON.stringify(want[id].g),id+' 2026-10 筆數');
  });
}
console.log('coupang-zero: '+n+' 項通過'+(BK?'（含真實備份）':''));
