// 容量提醒擴充（2026-11-19）純函式測試：node scripts/cap-docs.test.cjs
//   抽 js/firebase.js 的 PROFIT_DOC_MEASURE_BEGIN/END（文件大小量法）、js/app.js 的 PROFIT_CAP_DOCS_BEGIN/END（哪些文件成卡）、
//   js/profit.js 的 MOMO-DOC-CAP-PURE（推 momo_products 前的 95% 防線）。資料全是合成的；不碰瀏覽器、不碰雲端。
//   CAP_BACKUP_JSON 指到 ec-tools v3 備份檔（Firestore REST 形狀）時，另外用真實文件算大小並印出來（備份不進 repo）。
'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8').replace(/\r\n/g,'\n');
const between=(src,a,b)=>{ const i=src.indexOf(a), j=src.indexOf(b,i); if(i<0||j<0) throw new Error('找不到 '+a); if(src.indexOf(a,i+1)>=0) throw new Error('標記重複 '+a); return src.slice(i,j+b.length); };
const line=(src,re)=>{ const m=src.match(re); if(!m) throw new Error('找不到 '+re); return m[0]; };
const fb=read('js/firebase.js'), app=read('js/app.js'), pf=read('js/profit.js');
const M=new Function(between(fb,'// PROFIT_DOC_MEASURE_BEGIN','// PROFIT_DOC_MEASURE_END')+'\nreturn { profitDocMeasure, PROFIT_DOC_LIMIT_BYTES };')();
const A=new Function([line(app,/^const PROFIT_CAP_DOC_WARN = .*$/m), line(app,/^const PROFIT_CAP_DOC_RED = .*$/m),
  between(app,'// PROFIT_CAP_DOCS_BEGIN','// PROFIT_CAP_DOCS_END'), 'return { __profitCapDocs, __profitCapGroups, PROFIT_CAP_DOC_WARN, PROFIT_CAP_DOC_RED };'].join('\n'))();
const P=new Function(between(pf,'/* ═══ MOMO-DOC-CAP-PURE-BEGIN','/* ═══ MOMO-DOC-CAP-PURE-END ═══ */')+'\nreturn { momoDocCapVerdict, MOMO_DOC_BLOCK_RATIO };')();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };

// ── 門檻沒動 ──
ok(A.PROFIT_CAP_DOC_WARN===0.70&&A.PROFIT_CAP_DOC_RED===0.90,'獨立文件門檻 70%／90%');
ok(P.MOMO_DOC_BLOCK_RATIO===0.95,'推送防線 95%（驗收時暫時調低，改回後這條要過）');
ok(/const MOMO_DOC_WARN_KB=700;/.test(pf),'存檔預警門檻仍是 700KB');
// ── 量法：momo_products 文件形狀 ──
{ const m=M.profitDocMeasure({shop:'甲配',items:[{sku:'A',n:1}],updatedAt:0},'momo_products/jia');
  // 路徑 (13+1)+(3+1)+16=34；+32；shop(5)+('甲配'6+1)=12；items(6)+[sku(4)+('A'1+1)+n(2)+8]=22；updatedAt(10)+8=18
  ok(m.bytes===34+32+12+22+18,'位元組算法（'+m.bytes+'）'); ok(M.PROFIT_DOC_LIMIT_BYTES===1048576,'單檔上限 1 MiB'); }
// ── 哪些文件成卡：名稱與標籤由 groups 給 ──
{ const d=(ratio,idxRatio)=>({ratio,idxRatio:idxRatio||0,bytes:Math.round(ratio*1048576),idx:1});
  const s={ growth:{'好麻吉':d(.75),'玩樂':d(.2)}, optlog:{'甲配':d(.92)},
    momoProducts:{jia:Object.assign(d(.596),{shop:'甲配'}), mo_maji:Object.assign(d(.71),{shop:'MO+麻吉'}), yi:d(.1,.95)}, insight:{'好麻吉':d(.884),'維克':d(.3)} };
  const out=A.__profitCapDocs(A.__profitCapGroups(s));
  ok(out.map(x=>x.label+'|'+x.name+'|'+x.level).join(' ; ')===
    '優化紀錄（甲配）|app/optlog_甲配|red ; MOMO 商品主檔（yi）|momo_products/yi|red ; 商品調整（好麻吉）|app/growth_好麻吉|warn ; MOMO 商品主檔（MO+麻吉）|momo_products/mo_maji|warn ; 洞察表資料（好麻吉）|app/insight_好麻吉|warn',
    '成卡清單、名稱、標籤、順序');
  ok(!out.some(x=>/jia|維克|玩樂/.test(x.name)),'沒到 70% 的不列（甲配 59.6%）');
  // 原本兩類：只給 growth／optlog 時跟改版前一樣
  const old=A.__profitCapDocs(A.__profitCapGroups({growth:s.growth,optlog:s.optlog}));
  ok(old.map(x=>x.label+' '+x.name+' '+x.level).join(' ; ')==='優化紀錄（甲配） app/optlog_甲配 red ; 商品調整（好麻吉） app/growth_好麻吉 warn','growth／optlog 的名稱、標籤、順序不變');
  ok(old[0].bytes===s.optlog['甲配'].bytes&&old[0].ratio===.92,'數字欄位照搬');
  // 沒訂閱到 ⇒ 沒有那一項、不是 0
  ok(A.__profitCapDocs(A.__profitCapGroups({})).length===0&&A.__profitCapDocs(A.__profitCapGroups(null)).length===0,'什麼都沒有 ⇒ 空');
  ok(A.__profitCapDocs(A.__profitCapGroups({momoProducts:{jia:{}} ,insight:{'好麻吉':null}})).length===0,'沒有數字的不列');
  ok(A.__profitCapDocs([{map:{x:d(.7)},name:k=>'col/'+k,label:k=>'自訂 '+k}])[0].label==='自訂 x','呼叫端可以傳自己的名稱與標籤'); }
// ── 95% 防線 ──
{ const L=1048576, V=P.momoDocCapVerdict;
  ok(V('甲配',624876,L,.95).ok&&V('甲配',624876,L,.95).pct===59.6,'59.6% 放行');
  ok(V('甲配',Math.floor(L*.95),L,.95).ok,'剛好 95% 以下放行');
  const b=V('甲配',1000000,L,.95); ok(!b.ok&&b.pct===95.4,'95.4% 擋下');
  ok(b.msg==='甲配商品資料已接近雲端單檔上限（目前 95.4%），這次沒有推上去，資料還在這台電腦。請通知 Keani 處理。','訊息逐字');
  ok(V('甲配',624876,L,.5).ok===false&&/目前 59\.6%/.test(V('甲配',624876,L,.5).msg),'門檻調成 50% 時甲配會被擋（驗收用）');
  ok(V('甲配',NaN,L,.95).ok&&V('甲配',undefined,L,.95).ok&&V('甲配',1,0,.95).ok,'量不到 ⇒ 放行'); }
// ── setShop 呼叫點都先過防線 ──
{ const calls=pf.split('\n').filter(l=>/window\.__cloudMomo\.setShop\(shop,/.test(l)&&!/^\s*\/\//.test(l));
  ok(calls.length===3,'直接呼叫 __cloudMomo.setShop 的地方＝3 處（'+calls.length+'）');
  const i=pf.indexOf('await window.__cloudMomo.setShop(shop, _outItems);'); ok(i>0&&/_momoDocCapGuard\(shop, _outItems\);[^\n]*\n\s*$/.test(pf.slice(i-200,i)),'momoSyncProductsMerge：setShop 前一行是防線');
  ok(calls.filter(l=>/_momoDocCapGuard\(shop, _it\); (await )?window\.__cloudMomo\.setShop\(shop, _it\)/.test(l)).length===2,'另外兩處同一行先過防線');
  const k=pf.indexOf('_momoProductsLastPushedSet(shop, plan.merged);'); ok(k>i,'lastpushed 在 setShop 之後才更新（防線 throw 就不會走到）'); }
// ── 700KB 彈窗只給管理員 ──
{ const i=pf.indexOf('const _kb=(new TextEncoder().encode(_json).length)/1024;'), blk=pf.slice(i, pf.indexOf('window.__momoSizeWarn=',i));
  ok(/console\.error\('%c\[MOMO size\] '\+msg/.test(blk),'console 那行還在（所有人）');
  const j=blk.indexOf('if(_momoIsAdminUser()){'); ok(j>0&&blk.indexOf('showToast(msg')>j&&blk.indexOf('App.showAlertModal(')>j&&blk.indexOf('console.error')<j,'toast 與彈窗都在管理員判斷裡面、console 在外面'); }
// ── 真實備份（選用）──
if(process.env.CAP_BACKUP_JSON){
  const B=JSON.parse(fs.readFileSync(process.env.CAP_BACKUP_JSON,'utf8'));
  const dec=v=>{ if('stringValue' in v) return v.stringValue; if('integerValue' in v) return Number(v.integerValue); if('doubleValue' in v) return Number(v.doubleValue);
    if('booleanValue' in v) return v.booleanValue; if('nullValue' in v) return null; if('timestampValue' in v) return new Date(v.timestampValue);
    if('mapValue' in v) return decF(v.mapValue.fields||{}); if('arrayValue' in v) return (v.arrayValue.values||[]).map(dec); return null; };
  const decF=f=>{ const o={}; Object.keys(f).forEach(k=>{ o[k]=dec(f[k]); }); return o; };
  const stats={momoProducts:{},insight:{}};
  Object.keys(B).filter(p=>/^momo_products\//.test(p)||/^app\/insight_/.test(p)).forEach(p=>{
    const data=decF(B[p].fields||{}), m=M.profitDocMeasure(data,p), e={bytes:m.bytes,ratio:m.ratio,idx:m.idx,idxRatio:m.idxRatio};
    if(/^momo_products\//.test(p)){ e.shop=data.shop; stats.momoProducts[p.split('/')[1]]=e; } else stats.insight[p.slice('app/insight_'.length)]=e;
    console.log(p.padEnd(26), String(m.bytes).padStart(8)+' B', (m.bytes/1048576*100).toFixed(1).padStart(5)+'%', '索引 '+m.idx+'（'+(m.idxRatio*100).toFixed(1)+'%）');
  });
  console.log('成卡：', A.__profitCapDocs(A.__profitCapGroups(stats)).map(x=>x.label+' '+Math.round(x.ratio*100)+'% '+x.level).join(' ; ')||'（無）');
  const jia=decF(B['momo_products/jia'].fields); const push=M.profitDocMeasure({shop:'甲配',items:jia.items,updatedAt:0},'momo_products/jia');
  console.log('甲配推送量測：', push.bytes, P.momoDocCapVerdict('甲配',push.bytes,1048576,.95).pct+'%', 'JSON 長度量法 KB：', Math.round(Buffer.byteLength(JSON.stringify(jia.items))/1024));
}
console.log('✓ cap-docs：'+n+' 項通過');
