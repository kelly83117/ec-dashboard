// #523 MO+ 結算提醒改看對帳明細有沒有傳：純函式測試。node scripts/moplus-settle-cover.test.cjs
//   從 js/profit.js 抽 MOPLUS-SETTLE-COVER-PURE-BEGIN/END（momoMoPlusSettleCover / momoMoPlusSettleText），不碰瀏覽器、不碰雲端。
//   三家的來源月清單＝2026-11-23 14:22 v3 備份（ec-backup-20261123-1422.json）裡 momo_moplus_origins 的 doc（不含 master）。
//   有設 MOPLUS_BACKUP_JSON 指到 v3 備份檔時，改用備份裡實際的清單再跑一次「實際清單」那組（檔案不進 repo）。
const fs=require('fs'), path=require('path'), assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'..','js','profit.js'),'utf8');
const i=src.indexOf('MOPLUS-SETTLE-COVER-PURE-BEGIN'), j=src.indexOf('// ─── harness 抽取標記：MOPLUS-SETTLE-COVER-PURE-END');
if(i<0||j<0) throw new Error('找不到 MOPLUS-SETTLE-COVER-PURE 區段');
const pure=src.slice(i,j).replace(/^[^\n]*\n/,'');
const { momoMoPlusSettleCover:C, momoMoPlusSettleText:T }=new Function(pure+'\nreturn {momoMoPlusSettleCover,momoMoPlusSettleText};')();
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; };
const eq=(a,b,m)=>{ assert.deepStrictEqual(a,b,m); n++; };
const states=c=>c.halves.map(h=>h.state);

// ── 實際清單（2026-11-23 備份）──
let REAL={ 'MO+麻吉':['2601','2602','2603','2604','2605','2606','2607','2608','2609','2610'],
           'MO+森之旅':['2601','2602','2603','2604','2605','2606','2607','2608','2609','2610'],
           'MO+玩樂':['2610'] };
if(process.env.MOPLUS_BACKUP_JSON){
  const b=JSON.parse(fs.readFileSync(process.env.MOPLUS_BACKUP_JSON,'utf8')), got={};
  Object.keys(b).filter(k=>k.startsWith('momo_moplus_origins/')).forEach(k=>{ const f=b[k].fields||b[k]; const v=x=>x&&(x.stringValue!=null?x.stringValue:x);
    const shop=v(f.shop), s=String(v(f.src)); if(/^\d{4}$/.test(s)) (got[shop]=got[shop]||[]).push(s); });
  Object.keys(got).forEach(k=>got[k].sort());
  console.log('用備份清單：', JSON.stringify(got)); REAL=got;
}
['MO+麻吉','MO+森之旅'].forEach(shop=>{
  const L=REAL[shop];
  for(let mo=1; mo<=9; mo++){ const ym='2026-'+String(mo).padStart(2,'0');
    ['H1','H2','FULL'].forEach(h=>{ const c=C(ym+'-'+h, L); ok(c.worst==='complete', shop+' '+ym+' '+h+' 應完整，得到 '+c.worst); ok(!T(c,{}).incomplete && !T(c,{}).warn.length && !T(c,{}).info, shop+' '+ym+h+' 不提醒'); }); }
  eq(C('2026-10-H1',L).worst,'h1Mostly',shop+' 10 上＝h1Mostly');
  eq(C('2026-10-H2',L).worst,'waitNext',shop+' 10 下＝waitNext');
  eq(C('2026-10-FULL',L).worst,'waitNext',shop+' 10 整月＝waitNext');
  eq(states(C('2026-10-FULL',L)),['h1Mostly','waitNext'],shop+' 10 整月兩半');
  eq(C('2026-11-FULL',L).worst,'waitSelf',shop+' 11 整月＝waitSelf（E001）');
  eq(C('2025-12-H2',L).worst,'complete',shop+' 2025-12 不提醒');
});
// 玩樂：第一個來源月＝2610
{ const L=REAL['MO+玩樂'];
  eq(C('2026-09-FULL',L).worst,'complete','玩樂第一個來源月以前不提醒');
  eq(C('2026-10-H2',L).worst,'waitNext','玩樂 10 下 waitNext');
  eq(C('2026-10-H1',L).worst,'h1Mostly','玩樂 10 上 h1Mostly'); }

// ── 文字（A-368 實例）──
{ const L=REAL['MO+麻吉'];
  const t=T(C('2026-10-H2',L),{qty:{'2026-10-H2':130}});
  eq(t.warn,['🕐 <b>2026/10 下半月還沒補齊</b>（目前 130 件）：要等 12 月初上傳 11 月對帳明細。銷量、營收、動銷率、零動銷清單、漲跌先不要當依據；毛利率、淨利率、成本可以參考。'],'10 下文字');
  ok(t.incomplete && t.zeroWarn && t.info==='','10 下：晶片未補齊、零動銷提醒');
  ok(t.chipTip.includes('缺 2026/11 對帳明細（12 月初上傳後補齊）'),'晶片提示寫缺哪份');
  const tf=T(C('2026-10-FULL',L),{qty:{'2026-10-H2':130}});
  ok(tf.warn[0].startsWith('🕐 <b>2026/10 整月（下半月）還沒補齊</b>（下半月目前 130 件）：要等 12 月初上傳 11 月對帳明細。'),'10 整月主詞');
  const t1=T(C('2026-10-H1',L),{});
  eq(t1,{incomplete:false,chipTip:'',warn:[],info:'ℹ 上半月大致完整，少數訂單要等 11 月對帳明細上傳後補上。',zeroWarn:false},'10 上灰字');
  ok(T(C('2026-10-H2',L),{}).warn[0].indexOf('（目前')<0,'沒有件數就不寫件數');
  // E001：整月兩份檔都要講到、上半下半各自的時間
  eq(T(C('2026-11-FULL',L),{e001Est:true}).warn,['🕐 <b>本期還沒有對帳明細</b>，目前是訂單明細估算；上半月要等 12 月初上傳 11 月對帳明細、下半月要等 1 月初上傳 12 月對帳明細才會補齊。'],'11 整月 E001');
  eq(T(C('2026-11-H1',L),{e001Est:true}).warn,['🕐 <b>本期還沒有對帳明細</b>，目前是訂單明細估算；要等 12 月初上傳 11 月對帳明細才會補齊。'],'11 上 E001');
  eq(T(C('2026-11-H2',L),{e001Est:true}).warn,['🕐 <b>本期還沒有對帳明細</b>，目前是訂單明細估算；要等 1 月初上傳 12 月對帳明細才會補齊。'],'11 下 E001');
  ok(T(C('2026-11-FULL',L),{e001Est:true}).zeroWarn,'E001 期別零動銷也提醒');
  // 不要出現「提早下載」之類
  ['2026-10-H1','2026-10-H2','2026-10-FULL','2026-11-H1','2026-11-H2','2026-11-FULL'].forEach(pk=>{ const x=T(C(pk,L),{e001Est:pk.startsWith('2026-11')}); ok(!/提早|提前|下載/.test(JSON.stringify(x)),pk+' 沒有提早下載字眼'); });
}

// ── 人造清單 ──
// gap：2610 沒傳、2611 已傳 → 2026-09 下半 gap、10 上 missingSelf
{ const L=['2608','2609','2611'];
  eq(C('2026-09-H2',L).worst,'gap','09 下 gap'); eq(C('2026-09-H1',L).worst,'gap','09 上（缺 M+1 但後面已傳）也是 gap');
  eq(C('2026-10-H1',L).worst,'missingSelf','10 上 missingSelf'); eq(C('2026-10-H2',L).worst,'missingSelf','10 下（缺當月檔）missingSelf');
  const g=T(C('2026-09-FULL',L),{});
  eq(g.warn,['⚠ <b>缺 2026/10 對帳明細</b>（之後的月份已上傳），這期銷量、營收不會自動補齊，請到「月對帳」補傳。'],'gap 文字');
  ok(g.incomplete && g.chipTip.includes('之後的月份已上傳，請到「月對帳」補傳'),'gap 晶片');
  const s=T(C('2026-10-FULL',L),{});
  eq(s.warn,['⚠ <b>缺 2026/10 對帳明細</b>（之後的月份已上傳），上半月幾乎沒有資料，這期銷量、營收不會自動補齊，請到「月對帳」補傳。'],'missingSelf 整月文字');
  eq(T(C('2026-10-H2',L),{}).warn,['⚠ <b>缺 2026/10 對帳明細</b>（之後的月份已上傳），這期銷量、營收不會自動補齊，請到「月對帳」補傳。'],'missingSelf 下半月不寫上半月');
  // 缺檔優先於 E001 文字
  ok(T(C('2026-10-FULL',L),{e001Est:true}).warn[0].startsWith('⚠ <b>缺 2026/10'),'缺檔優先');
}
// M+1 有、M 沒有，而且之後沒有更後面的月份
{ const L=['2609','2611']; eq(C('2026-10-H1',L).worst,'missingSelf','M+1 已傳、M 沒傳＝missingSelf'); eq(C('2026-11-H1',L).worst,'h1Mostly','11 上 h1Mostly'); }
// 店的第一個月以前、2026-01 以前
{ const L=['2605','2606'];
  eq(C('2026-04-FULL',L).worst,'complete','第一個來源月以前不提醒');
  eq(C('2026-05-H2',L).worst,'complete','05 下：2606 有'); eq(C('2026-06-H2',L).worst,'waitNext','06 下 waitNext');
  eq(C('2025-12-FULL',['2512']).worst,'complete','2026-01 以前不提醒（就算有 2512）');
  eq(C('2026-01-H2',['2601']).worst,'waitNext','2026-01 本身照常判斷'); }
// 跨年：2026/12 下半等 2027/01 月檔（2 月初拿得到）
{ const L=['2611','2612'];
  const c=C('2026-12-H2',L); eq(c.worst,'waitNext','12 下 waitNext');
  eq(c.halves[0].key,{src:'2701',month:'2027-01',availMonth:'2027-02',later:false},'12 下 key＝2027-01 月檔、2 月初');
  ok(T(c,{qty:{'2026-12-H2':5}}).warn[0].startsWith('🕐 <b>2026/12 下半月還沒補齊</b>（目前 5 件）：要等 2 月初上傳 1 月對帳明細。'),'跨年文字');
  eq(C('2026-12-H2',['2611','2612','2701']).worst,'complete','2701 傳了就完整');
  eq(T(C('2027-01-FULL',['2612']),{e001Est:true}).warn,['🕐 <b>本期還沒有對帳明細</b>，目前是訂單明細估算；上半月要等 2 月初上傳 1 月對帳明細、下半月要等 3 月初上傳 2 月對帳明細才會補齊。'],'2027-01 E001'); }
// 沒有任何來源月（只有 E001 的新店）
{ eq(C('2026-11-FULL',[]).worst,'waitSelf','空清單＝waitSelf'); }
// 雜項：髒 key、master、亂序
{ eq(C('2026-10-H2',['master','2611','2610','abc']).worst,'complete','忽略 master／髒 key、亂序');
  eq(C('bad',['2610']),null,'不合法期別回 null'); eq(T(null,{}).incomplete,false,'null cover 不提醒'); }

console.log('moplus-settle-cover：'+n+' 項全部通過');
