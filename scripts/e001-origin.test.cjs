// MO+ 未結算月（E001）估算成本：逐原廠數量 × 各自成本（2026-11-20）。node scripts/e001-origin.test.cjs
//   從 js/profit.js 抽 momoParseE001、momoMergeE001Docs、E001-ORIGIN-PURE-BEGIN/END、momoMoPlusOriginCost，不碰瀏覽器、不碰雲端。
//   真實資料（選用，資料不進 repo）：E001_BACKUP_JSON＝v3 備份檔；E001_EXTRA_DOCS＝逗號分隔的 Firestore REST 文件 JSON（例 2611）。
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8').replace(/\r\n/g,'\n');   // Windows 工作區是 CRLF（autocrlf）
const cut=(a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); return src.slice(i,j); };
const line=re=>{ const m=src.match(re); if(!m) throw new Error('找不到 '+re); return m[0]; };
const code=[
  line(/^const MOMO_NO_ORIGIN=.*$/m),
  line(/^function momoMoPlusNum\(v\)\{.*$/m),
  cut('function momoMoPlusOrderToPeriod(orderNo){','// 訂單編號 14 碼 → 下單日'),
  cut('function momoMoPlusOrderDate(orderNo){','\n}\n')+'\n}\n',
  "const MOMO_E001_SOLD_STATUS=['配送結束'], MOMO_E001_INTRANSIT_STATUS=[], MOMO_E001_EXCLUDED_STATUS=[];",
  line(/^const MOMO_E001_COLS=.*$/m),
  cut('function momoParseE001(rows){','// MO+ 未結算月費率估算'),
  line(/^function momoPeriodSrcCode\(period\)\{.*$/m),
  cut('function momoMergeE001Docs(docs){','// ─── harness 抽取標記：E001-ORIGIN-PURE-BEGIN'),
  cut('// ─── harness 抽取標記：E001-ORIGIN-PURE-BEGIN','// ─── harness 抽取標記：E001-ORIGIN-PURE-END'),
  line(/^function momoMoPlusOriginParts\(o\)\{.*$/m),
  cut('function momoMoPlusOriginCost(costMap, o){','const MOMO_UNMATCHED_BLOCK_RATIO'),
].join('\n');
const T=new Function(code+'\nreturn {momoParseE001,momoMergeE001Docs,momoE001OriginsQty,momoE001OriginsCost,momoE001OriginsTip,momoMoPlusOriginCost,MOMO_NO_ORIGIN};')();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
// 現行邏輯（改版前）：合併後 skuOrigin（最舊來源月贏）|| 主檔原廠，costMap>0 才算，一個原廠 × 整期銷量
function oldCost(ed, sku, keys, prodOrigin, costMap){ let q=0; keys.forEach(k=>{ q+=((ed.bySku[sku]||{})[k]||0); }); const o=(ed.skuOrigin[sku])||prodOrigin||''; const cov=!!(o&&Number(costMap[o])>0); return {cogs:cov?Number(costMap[o])*q:0, covered:cov, q}; }
function newCost(ed, sku, keys, prodOrigin, costMap){ let q=0; keys.forEach(k=>{ q+=((ed.bySku[sku]||{})[k]||0); }); const r=T.momoE001OriginsCost(T.momoE001OriginsQty(ed, sku, keys, prodOrigin, q), costMap); r.q=q; return r; }

// ── 1. 解析：同品號同月兩個原廠、空白原廠、跨月尾巴 ──
{ const H=['訂單編號','訂單狀態','商品編號','商品原廠編號','數量','商品售價'];
  const rows=[H,
    ['66110100000001','配送結束','S1','A-01',2,35], ['66110200000002','配送結束','S1','A-02',3,35], ['66111800000003','配送結束','S1','A-01',1,35],
    ['66110300000004','配送結束','S2','',4,10], ['66110400000005','配送結束','S2','無',1,10],
    ['66103000000006','配送結束','S1','A-09',5,35], ['66110500000007','取消訂單','S1','A-03',9,35]];
  const p=T.momoParseE001(rows); ok(p.ok,'解析成功');
  ok(JSON.stringify(p.bySkuOrigin.S1)===JSON.stringify({'2026-11-H1':{'A-01':2,'A-02':3},'2026-11-H2':{'A-01':1},'2026-10-H2':{'A-09':5}}),'逐原廠數量 '+JSON.stringify(p.bySkuOrigin.S1));
  ok(JSON.stringify(p.bySkuOrigin.S2)===JSON.stringify({'2026-11-H1':{[T.MOMO_NO_ORIGIN]:5}}),'空白／無 → NO_ORIGIN');
  Object.keys(p.bySku).forEach(s=>Object.keys(p.bySku[s]).forEach(k=>{ const t=Object.values(p.bySkuOrigin[s][k]).reduce((a,b)=>a+b,0); ok(t===p.bySku[s][k],'Σ 原廠數量＝bySku '+s+' '+k); }));
  ok(p.skuOrigin.S1==='A-01'&&!('S2' in p.skuOrigin),'skuOrigin 照舊（第一筆、空白不記）');
  // 合併：新格式文件 → 成本逐原廠
  const ed=T.momoMergeE001Docs({'2611':Object.assign({src:'2611'},p)});
  ok(!ed.legacySrc['2611'],'新格式不是 legacy');
  ok(!ed.bySkuOrigin.S1['2026-10-H2'],'跨月尾巴不歸 2611 主掌');
  const cm={'A-01':15,'A-02':62};
  const c=newCost(ed,'S1',['2026-11-H1','2026-11-H2'],'',cm);
  ok(c.cogs===3*15+3*62 && c.covered && c.coverage===1,'混規格成本＝Σ 各原廠 '+c.cogs);
  ok(c.detail[0].o==='A-01'&&c.detail[0].q===3&&c.detail[1].o==='A-02','明細依件數排序');
  // 無原廠：有主檔原廠 → 併過去；沒有 → 缺成本
  const c2=newCost(ed,'S2',['2026-11-H1'],'A-01',cm); ok(c2.cogs===5*15&&c2.covered,'無原廠退回主檔原廠');
  const c3=newCost(ed,'S2',['2026-11-H1'],'',cm); ok(c3.cogs===0&&!c3.covered&&c3.missingOrigins[0]==='(無原廠編號)'&&c3.noOriginQty===5,'無原廠、沒主檔原廠 → 缺成本');
  // 部分缺成本：規則同已結算列
  const c4=newCost(ed,'S1',['2026-11-H1','2026-11-H2'],'',{'A-01':15}); ok(c4.cogs===45&&!c4.covered&&c4.coverage===0.5&&c4.missingOrigins.join()==='A-02','部分缺成本');
  ok(/A-01 × 3 件 × \$15；A-02 × 3 件 × 缺成本$/.test(T.momoE001OriginsTip(c4.detail,false)),'tooltip '+T.momoE001OriginsTip(c4.detail,false));
  ok(/重傳訂單明細會更準$/.test(T.momoE001OriginsTip(c4.detail,true)),'legacy 提示');
  // 組合原廠
  const ed2=T.momoMergeE001Docs({'2611':{src:'2611',bySku:{X:{'2026-11-H1':2}},bySkuRev:{X:{'2026-11-H1':100}},skuOrigin:{X:'B-1+B-2'},bySkuOrigin:{X:{'2026-11-H1':{'B-1+B-2':2}}}}});
  ok(newCost(ed2,'X',['2026-11-H1'],'',{'B-1':10,'B-2':5}).cogs===30,'組合原廠相加');
}
// ── 2. 舊格式文件：每個來源月只用自己的原廠 ──
{ const d9={src:'2609',bySku:{S:{'2026-08-H2':2,'2026-09-H1':4}},bySkuRev:{S:{'2026-09-H1':140}},skuOrigin:{S:'J47-05'}};
  const d11={src:'2611',bySku:{S:{'2026-11-H1':1}},bySkuRev:{S:{'2026-11-H1':35}},skuOrigin:{S:'J47-03'}};
  const ed=T.momoMergeE001Docs({'2609':d9,'2611':d11}), cm={'J47-03':15,'J47-05':62};
  ok(ed.legacySrc['2609']&&ed.legacySrc['2611'],'兩份都是 legacy');
  ok(ed.skuOrigin.S==='J47-05','skuOrigin 顯示用照舊最舊贏');
  ok(newCost(ed,'S',['2026-11-H1'],'',cm).cogs===15,'11 月用 J47-03');
  ok(newCost(ed,'S',['2026-09-H1'],'',cm).cogs===4*62,'9 月用 J47-05');
  ok(!ed.bySkuOrigin.S['2026-08-H2'],'8 月尾巴不歸 2609');
  ok(oldCost(ed,'S',['2026-11-H1'],'',cm).cogs===62,'舊算法 11 月 $62（重現問題）');
  // 新舊混合：新格式優先
  const d11n=Object.assign({},d11,{bySkuOrigin:{S:{'2026-11-H1':{'J47-04':1}}}});
  const edm=T.momoMergeE001Docs({'2609':d9,'2611':d11n}); ok(!edm.legacySrc['2611']&&newCost(edm,'S',['2026-11-H1'],'',Object.assign({'J47-04':20},cm)).cogs===20,'新格式優先');
}
// ── 3. 等價：每個品號只有單一原廠、成本 >0、無組合原廠時，新舊結果相同 ──
{ let seed=11; const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  for(let t=0;t<300;t++){ const docs={}, cm={}; const srcs=['2609','2610','2611'];
    const orig={}; for(let i=0;i<20;i++){ orig['P'+i]='O'+i; cm['O'+i]=1+Math.round(rnd()*300); }
    srcs.forEach(s=>{ const ym='20'+s.slice(0,2)+'-'+s.slice(2); const d={src:s,bySku:{},bySkuRev:{},skuOrigin:{},bySkuOrigin:rnd()<0.5?{}:null};
      for(let i=0;i<20;i++){ if(rnd()<0.4) continue; const sku='P'+i, k=ym+(rnd()<0.5?'-H1':'-H2'), q=1+Math.floor(rnd()*9);
        d.bySku[sku]={[k]:q}; d.bySkuRev[sku]={[k]:q*50}; d.skuOrigin[sku]=orig[sku]; if(d.bySkuOrigin) d.bySkuOrigin[sku]={[k]:{[orig[sku]]:q}}; }
      if(!d.bySkuOrigin) delete d.bySkuOrigin; docs[s]=d; });
    const ed=T.momoMergeE001Docs(docs);
    ['2026-09','2026-10','2026-11'].forEach(ym=>{ const keys=[ym+'-H1',ym+'-H2']; Object.keys(ed.bySku).forEach(sku=>{ const a=oldCost(ed,sku,keys,'',cm), b=newCost(ed,sku,keys,'',cm); if(!a.q) return; ok(a.cogs===b.cogs&&a.covered===b.covered,'等價 '+t+' '+sku+' '+ym); }); });
  }
}
// ── 4. 真實資料 ──
const BK=process.env.E001_BACKUP_JSON;
if(BK){
  const dec=v=>{ if(v==null) return v; if('stringValue' in v) return v.stringValue; if('integerValue' in v) return Number(v.integerValue); if('doubleValue' in v) return v.doubleValue;
    if('booleanValue' in v) return v.booleanValue; if('nullValue' in v) return null; if('timestampValue' in v) return v.timestampValue;
    if('mapValue' in v){ const o={}, f=v.mapValue.fields||{}; for(const k in f) o[k]=dec(f[k]); return o; } if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec); return v; };
  const decDoc=d=>{ const o={}, f=(d&&d.fields)||{}; for(const k in f) o[k]=dec(f[k]); return o; };
  const j=JSON.parse(fs.readFileSync(BK,'utf8'));
  (process.env.E001_EXTRA_DOCS||'').split(',').filter(Boolean).forEach(f=>{ const r=JSON.parse(fs.readFileSync(f,'utf8')); if(r.name) j[r.name.replace(/^.*\/documents\//,'')]=r; });
  const cm=decDoc(j['momo_cost_by_origin/account']).costMap||{};
  const report={};
  [['mo_maji','MO+麻吉'],['mo_senzhilu','MO+森之旅'],['mo_wanle','MO+玩樂']].forEach(([id,shop])=>{
    const docs={}; Object.keys(j).filter(k=>k.startsWith('momo_e001/'+id+'_')).forEach(k=>{ const d=decDoc(j[k]); docs[d.src]=d; });
    const po={}; (decDoc(j['momo_products/'+id]||{}).items||[]).forEach(p=>{ if(p&&p.sku) po[p.sku]=p.origin||''; });
    const ed=T.momoMergeE001Docs(docs);
    Object.keys(docs).sort().forEach(s=>{ const ym='20'+s.slice(0,2)+'-'+s.slice(2), keys=[ym+'-H1',ym+'-H2']; const ch=[];
      Object.keys(ed.bySku).forEach(sku=>{ const a=oldCost(ed,sku,keys,po[sku],cm), b=newCost(ed,sku,keys,po[sku],cm); if(!a.q) return;
        if(Math.abs(a.cogs-b.cogs)>1e-9||a.covered!==b.covered) ch.push({sku,q:a.q,old:a.cogs,new:b.cogs,oc:a.covered,nc:b.covered,det:b.detail}); });
      report[shop+'|'+s]=ch; });
  });
  const r11=report['MO+麻吉|2611'];
  if(r11){
    console.log('MO+麻吉 2611 成本有變的品號：'+r11.length+' 個，covered 有變：'+r11.filter(x=>x.oc!==x.nc).length);
    fs.writeFileSync(path.join(process.env.E001_OUT_DIR||require('os').tmpdir(),'e001-2611-changed.json'), JSON.stringify(r11.map(x=>x.sku).sort()));
    // 勘查報告的 90 是「原廠不同」的品號；其中 24 個新舊原廠單位成本相同、1 個兩邊都缺成本 ⇒ 成本有變的是 65 個（2026-11-20 確認）
    ok(r11.length===65,'好麻吉 2611 成本有變的品號數應為 65（實際 '+r11.length+'）');
    ok(r11.filter(x=>x.oc!==x.nc).map(x=>x.sku).sort().join()==='TP00011830000674,TP00011830000948,TP00011830001308','有成本 → 缺成本的 3 個');
    const m=r11.find(x=>x.sku==='TP00011830001013'); ok(m&&m.old===62&&m.new===15&&m.det[0].o==='J47-03','滑鼠墊 J47-03 $15 '+JSON.stringify(m));
    fs.writeFileSync(path.join(process.env.E001_OUT_DIR||require('os').tmpdir(),'e001-2611-changed.json'), JSON.stringify(r11.map(x=>x.sku).sort()));
  }
  Object.keys(report).forEach(k=>{ if(k!=='MO+麻吉|2611') console.log(k+'：成本有變 '+report[k].length+' 個（此來源月已結算，畫面不走 E001）'); });
}
console.log('e001-origin：'+n+' 項全部通過');
