// #544 健檢 MOMO 商品層「到齊」判斷：純函式測試。node scripts/health-momo-ready.test.cjs
//   從 js/profit.js 抽 HEALTH-MOMO-READY-PURE-BEGIN/END（healthMomoShopReady），不碰瀏覽器、不碰雲端。
//   四種情況：不 dirty、dirty、LZ1（讀取狀態同 _momoLsRead：LZ1 解得開＝ok、解不開＝bad）、完全沒有主檔。
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8');
const i=src.indexOf('HEALTH-MOMO-READY-PURE-BEGIN'), j=src.indexOf('// ─── harness 抽取標記：HEALTH-MOMO-READY-PURE-END');
if(i<0||j<0) throw new Error('找不到 HEALTH-MOMO-READY-PURE 區段');
const R=new Function(src.slice(i,j).replace(/^[^\n]*\n/,'')+'\nreturn healthMomoShopReady;')();
let n=0; const eq=(a,b,m)=>{ assert.strictEqual(a,b,m); n++; };

// 1. 不 dirty：只認雲端（_profitMem）；本機有舊的也不算（照改版前）
eq(R({ inMem:true,  dirty:false, local:'absent', n:0 }), true,  '不 dirty、雲端到了 ⇒ 到齊');
eq(R({ inMem:false, dirty:false, local:'ok',     n:1339 }), false, '不 dirty、只有本機（可能是舊的）⇒ 還沒到齊');
eq(R({ inMem:false, dirty:false, local:'absent', n:0 }), false, '不 dirty、什麼都沒有 ⇒ 還沒到齊');
// 2. dirty：雲端不會蓋，本機讀得到而且有商品 ⇒ 到齊
eq(R({ inMem:false, dirty:true,  local:'ok',     n:1339 }), true,  'dirty、本機 JSON 讀得到 ⇒ 到齊');
eq(R({ inMem:true,  dirty:true,  local:'absent', n:0 }), true,  'dirty、這個分頁剛存過（_profitMem 有）⇒ 到齊');
// 3. LZ1：狀態跟 JSON 同一套（_momoLsRead 解開＝ok）；解不開＝bad ⇒ 不算到齊（照改版前一直等、到逾時）
eq(R({ inMem:false, dirty:true,  local:'ok',     n:552 }), true,  'dirty、本機 LZ1 解得開 ⇒ 到齊');
eq(R({ inMem:false, dirty:true,  local:'bad',    n:0 }), false, 'dirty、本機 LZ1 解不開 ⇒ 不算到齊');
// 4. 完全沒有主檔
eq(R({ inMem:false, dirty:true,  local:'absent', n:0 }), false, 'dirty 但本機沒有主檔 ⇒ 不算到齊');
eq(R({ inMem:false, dirty:true,  local:'ok',     n:0 }), false, 'dirty、本機是空陣列 ⇒ 不算到齊');
eq(R(null), false, '沒有狀態 ⇒ 不算到齊');

console.log('health-momo-ready：'+n+' 項全部通過');
