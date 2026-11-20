// 比對兩份 __momoE001RegressSnap() 指紋（2026-11-20，MO+ 未結算月 E001 成本修正）。只讀本機檔案。
//   node scripts/e001-origin.regress.cjs <改前.json> <改後.json> [--stage=1|2] [--expect-changed=<品號清單.json>]
//   stage 1（原廠修正）：2026-10 以前逐字相同；2026-11 只有 cost／profit／margin／covered／coverage／缺成本 可以變，qty／revenue 不准變；
//                        好麻吉 11 月整月成本有變的品號＝expect-changed。
//   stage 2（扣營業稅）：2026-10 以前逐字相同；2026-11 只有 profit／margin 變，margin 每個品號降 revenue×5/105÷revenue≈4.76pp。
const fs=require('fs');
const [a,b]=process.argv.slice(2,4).map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
const arg=k=>{ const m=process.argv.find(x=>x.startsWith('--'+k+'=')); return m?m.slice(k.length+3):null; };
const stage=Number(arg('stage')||1), expect=arg('expect-changed')?JSON.parse(fs.readFileSync(arg('expect-changed'),'utf8')):null;
const F=['sku','qty','revenue','cost','profit','margin','covered','coverage','missing','e001'];
const isNov=id=>/\|2026-11-/.test(id);
let fails=0; const fail=m=>{ fails++; if(fails<=40) console.log('✗ '+m); };
// 已知：每次載入 Firestore 傳回的物件欄位順序不一定相同，加總順序不同 ⇒ 浮點最後一位會差（相對誤差 ~1e-16），缺成本清單的順序也會不同。
//   所以 2026-10 以前先「逐字」比，不同的再用「正規化」比（數字相對誤差 ≤1e-12 算相同、缺成本清單排序後比），兩種結果分開列。
const canon=v=>Array.isArray(v)?v.map(canon):(typeof v==='number'?Number(v.toPrecision(12)):(typeof v==='string'&&v.indexOf('|')>=0?v.split('|').sort().join('|'):v));
let strictDiff=0, noise=0;
const S0=JSON.stringify;
const S=v=>S0(v);
const eqPre=(x,y,label)=>{ if(S0(x)===S0(y)) return; strictDiff++; if(S0(canon(x))===S0(canon(y))){ noise++; return; } fail(label); };
if(S(a.meta.months)!==S(b.meta.months)) fail('月份範圍不同');
// KPI：一律逐字相同
Object.keys(a.kpi).forEach(k=>eqPre(a.kpi[k], b.kpi[k], 'KPI '+k+' '+S(a.kpi[k])+' → '+S(b.kpi[k])));
const summary={};
Object.keys(a.rows).forEach(id=>{
  const A=a.rows[id], B=b.rows[id]||[];
  if(!isNov(id)){
    eqPre(A, B, '列 '+id+' 不同');
    eqPre(a.totals[id], b.totals[id], '合計 '+id+' '+S(a.totals[id])+' → '+S(b.totals[id]));
    return;
  }
  const mA=new Map(A.map(r=>[r[0],r])), mB=new Map(B.map(r=>[r[0],r]));
  if(S([...mA.keys()])!==S([...mB.keys()])) fail(id+' 品號清單不同');
  const changed=[]; let maxDev=0, nE001=0;
  mA.forEach((ra,sku)=>{ const rb=mB.get(sku); if(!rb) return;
    if(ra[1]!==rb[1]||ra[2]!==rb[2]) fail(id+' '+sku+' qty／revenue 變了 '+S(ra)+' → '+S(rb));
    if(ra[9]!==rb[9]) fail(id+' '+sku+' e001 旗標變了');
    if(!ra[9]){ if(S(ra)!==S(rb)) fail(id+' '+sku+' 不是 E001 估算列卻變了'); return; }
    nE001++;
    if(stage===1){ if(ra[3]!==rb[3]||ra[6]!==rb[6]) changed.push(sku); }
    else {
      if(ra[3]!==rb[3]||ra[6]!==rb[6]||ra[7]!==rb[7]||ra[8]!==rb[8]) fail(id+' '+sku+' stage2 成本／涵蓋不該變');
      const rev=ra[2]; if(rev>0){ const expP=ra[4]-rev*5/105; if(Math.abs(rb[4]-expP)>1e-6) fail(id+' '+sku+' 淨利應少 營收×5/105：'+ra[4]+' → '+rb[4]+'（預期 '+expP+'）');
        const expM=Math.round((expP/rev)*1000)/10; if(rb[5]!==expM) fail(id+' '+sku+' 淨利率 '+rb[5]+' 預期 '+expM); maxDev=Math.max(maxDev, Math.abs((ra[5]-rb[5])-100*5/105)); changed.push(sku); }
    }
  });
  summary[id]={ e001Rows:nE001, changed:changed.length, maxDevPp:stage===2?Math.round(maxDev*100)/100:undefined };
  if(stage===1 && expect && id==='MO+麻吉|2026-11-FULL'){ if(S(changed.sort())!==S(expect.slice().sort())) fail('好麻吉 11 月整月成本有變的品號 '+changed.length+' 個，跟離線預期 '+expect.length+' 個不同：多 '+S(changed.filter(x=>!expect.includes(x)))+' 少 '+S(expect.filter(x=>!changed.includes(x)))); }
});
console.log('各期別（2026-11）：'); Object.keys(summary).forEach(k=>console.log('  '+k+' '+S(summary[k])));
['MO+麻吉','MO+森之旅','MO+玩樂'].forEach(s=>['H1','H2','FULL'].forEach(h=>{ const id=s+'|2026-11-'+h; if(a.totals[id]) console.log('  合計 '+id+'：'+S(a.totals[id].slice(0,8))+' → '+S(b.totals[id].slice(0,8))); }));
const nonNov=Object.keys(a.rows).filter(id=>!isNov(id)).length;
console.log('2026-10 以前（'+nonNov+' 個期別的品號列＋合計、KPI '+Object.keys(a.kpi).length+' 個月）：逐字不同 '+strictDiff+' 處，其中浮點最後一位／清單順序 '+noise+' 處，真正不同 '+(strictDiff-noise)+' 處');
console.log(fails?'✗ '+fails+' 項不符':'✓ 全部符合');
process.exit(fails?1:0);
