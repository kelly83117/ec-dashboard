/* js/pages/dashboard.js -- methods extracted from original App, merged back via Object.assign(App, ...) */
const App = window.App;
const { Store, escapeHtml, showToast, fmtNTD, toDateStr, addDays, eachDay, sumDaily, getRangeDates, migratePlatforms, PLATFORMS, PLATFORMS_WITH_AD_SPEND, PLATFORM_MARKETPLACE, MARKETPLACE_BADGE, PLATFORM_GROUPS, marketplaceBadgeHtml } = window;

Object.assign(App, {
  viewDashboard() {
    // 讀取資料
    // ⚠ 絕對不要在這裡自動 Store.set 寫回 Firestore：
    //   雲端訂閱還沒完成時 Store.get 會拿到 null，落到 PLATFORMS 預設值；
    //   如果寫回去就會把使用者真實資料覆蓋成空。
    //   只在使用者實際儲存時才寫回。
    let platforms = Store.get(Store.KEYS.platforms, null);
    if (!platforms) platforms = JSON.parse(JSON.stringify(PLATFORMS));
    platforms = migratePlatforms(platforms); // 純記憶體轉換，不寫回

    const now = new Date();
    // 行銷每天填的是「昨日」資料；若使用者改了日期，以使用者選的為準（可補周末等）
    const defaultInputDate = toDateStr(addDays(now, -1));
    const todayStrLocal = toDateStr(now);
    // 不允許選未來日期
    if (this.filter.entryDate && this.filter.entryDate > todayStrLocal) {
      this.filter.entryDate = defaultInputDate;
    }
    const inputDateStr = this.filter.entryDate || defaultInputDate;
    // 比較對象 = 前一天
    const prevDateObj = new Date(inputDateStr + 'T00:00:00');
    const prevDateStr = toDateStr(addDays(prevDateObj, -1));
    const inputDateDisplay = inputDateStr.replace(/-/g, '/');

    const inputOf = (p) => +(p.daily?.[inputDateStr]) || 0;
    const prevOf  = (p) => +(p.daily?.[prevDateStr])  || 0;
    const inputTotal = platforms.reduce((s, p) => s + inputOf(p), 0);
    const prevTotal  = platforms.reduce((s, p) => s + prevOf(p),  0);
    const overallDelta = prevTotal > 0 ? (inputTotal / prevTotal - 1) * 100 : 0;

    // 當月總營收（從本月 1 號到昨天的累積）
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = toDateStr(monthStart);
    const yMonth = now.getFullYear();
    const mMonth = now.getMonth() + 1;
    let monthTotal = 0;
    let daysCounted = 0;
    const seenDays = new Set();
    platforms.forEach(p => {
      Object.keys(p.daily || {}).forEach(date => {
        if (date >= monthStartStr && date <= inputDateStr) {
          monthTotal += +p.daily[date] || 0;
          seenDays.add(date);
        }
      });
    });
    daysCounted = seenDays.size;
    const monthAvg = daysCounted > 0 ? monthTotal / daysCounted : 0;

    // 計算各群組的本月小計
    const monthGroupTotals = PLATFORM_GROUPS.map(g => {
      const members = platforms.filter(p => g.members.includes(p.name));
      let total = 0;
      members.forEach(p => {
        Object.keys(p.daily || {}).forEach(date => {
          if (date >= monthStartStr && date <= inputDateStr) {
            total += +p.daily[date] || 0;
          }
        });
      });
      return { ...g, total };
    });

    const monthBlock = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px 26px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap">
          <div style="min-width:240px">
            <div style="font-size:12px;color:var(--text-muted);letter-spacing:.05em;margin-bottom:8px;text-transform:uppercase">${yMonth} 年 ${mMonth} 月 · 當月總營收</div>
            <div style="font-size:34px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;letter-spacing:-0.02em;line-height:1.1">${fmtNTD(monthTotal)}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
              累積 ${daysCounted} 天　·　日均 ${fmtNTD(monthAvg)}
            </div>
          </div>
          <div style="display:flex;gap:32px;flex-wrap:wrap;justify-content:flex-end;flex:1">
            ${monthGroupTotals.slice(1).map(g => `
              <div style="text-align:right;min-width:120px">
                <div style="font-size:11px;color:var(--text-muted);letter-spacing:.05em;margin-bottom:4px;text-transform:uppercase">${escapeHtml(g.name.replace('總營收','').replace('營收','').trim())}</div>
                <div style="font-size:20px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums;letter-spacing:-0.02em">${fmtNTD(g.total)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // ── 檢視範圍（全頁共用：KPI 卡 / 排名長條 / 需要留意 / 圓餅圖）──
    // ⚠ 這與上面的「填寫日期」(filter.entryDate) 是兩回事：
    //   上面是「填」（只給填寫表格用）、這裡是「看」。兩者刻意分家，互不影響。
    const summaryRange = this.filter.summaryRange || 'yesterday';
    const customMonth = this.filter.summaryMonth || toDateStr(now).slice(0, 7);
    // 選日期：不允許未來
    if (this.filter.summaryDate && this.filter.summaryDate > todayStrLocal) {
      this.filter.summaryDate = defaultInputDate;
    }
    const customDay = this.filter.summaryDate || defaultInputDate;
    // 每日營收填寫預設收合；狀態記在 filter，重繪後才不會被打回收合
    const entryOpen = !!this.filter.revenueEntryOpen;

    // 工具：給一個範圍類型 + 月份字串，回傳該範圍要加總的日期清單 + 標籤
    const monthDates = (yyyymm) => {
      const [y, m] = yyyymm.split('-').map(Number);
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);   // 該月最後一天
      const limit = toDateStr(addDays(now, -1));  // 不超過昨日
      const arr = [];
      for (let d = new Date(firstDay); toDateStr(d) <= toDateStr(lastDay); d = addDays(d, 1)) {
        const s = toDateStr(d);
        if (s <= limit) arr.push(s);
      }
      return arr;
    };
    // 單日範圍：showDates 只有一天，比較對象是它的前一天
    const dayRange = (dStr, label) => ({
      kind: 'day',
      label,
      dateLabel: dStr.replace(/-/g, '/'),
      showDates: [dStr],
      compareDates: [toDateStr(addDays(new Date(dStr + 'T00:00:00'), -1))],
      compareLabel: '前一日',
    });
    // 月累計範圍：showDates 是該月每一天（不超過昨日），比較對象是前一個月
    // ⚠ 本月是「部分月」（只累計到昨日）。若拿它去比上月整月，13 天比 30 天會全面假跌 —
    //   實測 7/1–13 比 6 月整月會算出 −59%，但比 6/1–13 其實只有 −3.1%，
    //   且有 4 個實際成長的通路會被誤判成暴跌。故部分月一律只比上月「同期」天數。
    //   完整月份（上月 / 選過去月份）維持整月比整月，那是正常的商業比較。
    const monthRange = (yyyymm, label, compareLabel) => {
      const [yy, mm] = yyyymm.split('-').map(Number);
      const prevMs = toDateStr(new Date(yy, mm - 2, 1)).slice(0, 7);
      const showDates = monthDates(yyyymm);
      const isPartial = yyyymm === toDateStr(now).slice(0, 7);   // 本月才會被昨日截斷
      const cutDay = (isPartial && showDates.length)
        ? +showDates[showDates.length - 1].slice(8, 10)
        : 31;
      return {
        kind: 'month',
        label,
        dateLabel: `${yyyymm.replace('-', '/')} 月累計`,
        showDates,
        compareDates: monthDates(prevMs).filter(d => +d.slice(8, 10) <= cutDay),
        compareLabel: isPartial ? `${compareLabel}同期` : compareLabel,
      };
    };
    const buildRange = (key) => {
      const thisMs = toDateStr(now).slice(0, 7);
      const lastMs = toDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
      if (key === 'customDay')  return dayRange(customDay, customDay.replace(/-/g, '/'));
      if (key === 'thisMonth')  return monthRange(thisMs, `${thisMs.replace('-', '/')} 本月`, '上月');
      if (key === 'lastMonth')  return monthRange(lastMs, `${lastMs.replace('-', '/')} 上月`, '再上一月');
      if (key === 'customMonth') return monthRange(customMonth, customMonth.replace('-', '/'), '前一月');
      // yesterday（預設）— 固定為真正的昨天，不再跟著填寫日期跑
      return dayRange(defaultInputDate, '昨日');
    };
    const rangeInfo = buildRange(summaryRange);
    const sumOver = (p, dates) => dates.reduce((s, d) => s + (+p.daily?.[d] || 0), 0);
    const sumAdsOver = (p, dates) => dates.reduce((s, d) => s + (+p.dailyAdSpend?.[d] || 0), 0);

    // 日期列 —— 控制「檢視範圍」（不是填寫日期）
    // 單日 = 一顆日期 pill（原本的「昨日」按鈕已併入它）：
    //   看昨天 → 掛個「昨日」標記；看其他天 → 標記換成可點的「↩ 回昨日」。
    //   同一時間只有一個控制項高亮：日期 pill（單日）／本月／上月／選月份 四者擇一。
    const isDayView = summaryRange === 'yesterday' || summaryRange === 'customDay';
    const dayTagHtml = summaryRange === 'yesterday'
      ? '<span class="day-tag">昨日</span>'
      : '<button type="button" id="summary-day-reset" class="pill pill-sm day-reset" title="回到昨日">↩ 回昨日</button>';
    const summaryPills = `
      <div id="summary-pills" class="summary-pills">
        <span class="summary-pills-label">檢視</span>
        <span class="day-pill-group">
          <input type="date" id="summary-custom-day" class="pill-input day-pill${isDayView ? ' is-active' : ''}"
            value="${escapeHtml(customDay)}" max="${escapeHtml(todayStrLocal)}" title="挑一天看當日資料">
          ${dayTagHtml}
        </span>
        <span class="summary-pills-sep"></span>
        <button class="pill pill-sm ${summaryRange === 'thisMonth' ? 'active' : ''}" data-summary-range="thisMonth">本月</button>
        <button class="pill pill-sm ${summaryRange === 'lastMonth' ? 'active' : ''}" data-summary-range="lastMonth">上月</button>
        <span class="pill-picker">
          <span class="pill-picker-label">選月份：</span>
          <input type="month" id="summary-custom-month" class="pill-input${summaryRange === 'customMonth' ? ' is-active' : ''}"
            value="${escapeHtml(customMonth)}" max="${escapeHtml(toDateStr(now).slice(0,7))}">
        </span>
        <button type="button" id="toggle-revenue-entry" class="entry-toggle-btn${entryOpen ? ' is-open' : ''}"
          aria-expanded="${entryOpen ? 'true' : 'false'}" aria-controls="revenue-entry-panel">
          <span>✏️ 填寫每日營收</span>
          <span class="entry-toggle-caret">▼</span>
        </button>
      </div>
    `;

    // 佔比分母：全通路（= 所有平台）在目前範圍的營收
    const allChannelCur = platforms.reduce((s, p) => s + sumOver(p, rangeInfo.showDates), 0);

    // 用 data-* 帶 group members 索引，方便輸入時即時加上「未存欄位的差值」
    // data-ads-idxs：該通路「有投廣告」的成員索引，供 bindCardInputs 即時算 ROAS
    const summaryCards = PLATFORM_GROUPS.map((g, gi) => {
      const members = platforms.filter(p => g.members.includes(p.name));
      const memberIdxs = members.map(p => platforms.indexOf(p)).filter(i => i >= 0);
      const cur  = members.reduce((s, p) => s + sumOver(p, rangeInfo.showDates), 0);
      const prev = members.reduce((s, p) => s + sumOver(p, rangeInfo.compareDates), 0);
      const d    = prev > 0 ? ((cur / prev) - 1) * 100 : 0;
      const isMain = gi === 0;   // 全通路總營收 = 主卡
      const iconHtml = g.logo
        ? `<img class="summary-card-logo" src="${g.logo}" alt="${escapeHtml(g.name)}">`
        : `<span class="summary-card-icon">${g.icon}</span>`;
      // 是否「昨日」單日範圍 → 才需要 live 計算（多日範圍只能算已存的）
      const isSingleDay = rangeInfo.showDates && rangeInfo.showDates.length === 1
                          && rangeInfo.showDates[0] === inputDateStr;

      // 右上角漲跌 pill；沒有比較基準（前期為 0）時顯示「—」，不要畫成 ↑0.0%
      const deltaCls  = prev > 0 ? (d >= 0 ? 'up' : 'down') : 'flat';
      const deltaText = prev > 0 ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)}%` : '—';

      // 底部 ROAS / 廣告費 — 四張卡共用同一條算式（該群組有投廣告的成員加總）。
      // 主卡的成員是全部通路，所以它算出來就是「全通路整體 ROAS」，
      // 與填寫表格的「當日總計」列同義。
      const adsMembers = members.filter(p => PLATFORMS_WITH_AD_SPEND.has(p.name));
      const adsIdxs = adsMembers.map(p => platforms.indexOf(p)).filter(i => i >= 0);
      const ads = adsMembers.reduce((s, p) => s + sumAdsOver(p, rangeInfo.showDates), 0);
      const roas = (cur > 0 && ads > 0) ? (cur / ads).toFixed(2) : '—';
      const adsLine = adsMembers.length === 0
        ? '<span class="summary-card-noads">無廣告投放</span>'
        : `ROAS <strong class="summary-card-roas-val">${roas}</strong>　·　廣告 <span class="summary-card-ads-val">${fmtNTD(ads)}</span>`;
      const adsRowHtml = `<div class="summary-card-ads" data-ads-idxs="${adsIdxs.join(',')}">${adsLine}</div>`;

      // 主卡本身就是佔比的分母，不顯示「佔全通路」，只補整體 ROAS / 廣告費
      const footHtml = isMain
        ? `
          <div class="summary-card-foot">
            ${adsRowHtml}
          </div>`
        : `
          <div class="summary-card-foot">
            <div class="summary-card-share">佔全通路 <strong class="summary-card-share-val">${(allChannelCur > 0 ? (cur / allChannelCur) * 100 : 0).toFixed(1)}%</strong></div>
            ${adsRowHtml}
          </div>`;

      return `
        <div class="stat-card summary-card${isMain ? ' summary-card-main' : ''}" data-group-idx="${gi}" data-member-idxs="${memberIdxs.join(',')}" data-base-cur="${cur}" data-prev="${prev}" data-single-day="${isSingleDay ? '1' : '0'}">
          <div class="summary-card-head">
            ${iconHtml}
            <div class="summary-card-id">
              <span class="summary-card-title">${escapeHtml(g.name)}</span>
              <span class="summary-card-range">${escapeHtml(rangeInfo.label)}</span>
            </div>
            <div class="summary-card-trend">
              <span class="summary-card-delta ${deltaCls}">${deltaText}</span>
              <span class="summary-card-compare">較${escapeHtml(rangeInfo.compareLabel)}</span>
            </div>
          </div>
          <div class="summary-card-value">${fmtNTD(cur)}</div>
          ${footHtml}
        </div>
      `;
    }).join('');

    // 依通路分群（蝦皮 / MOMO / 酷澎）
    const marketOrder = ['shopee', 'momo', 'coupang'];
    const marketTint = { shopee: '#ee4d2d', momo: '#ec4899', coupang: '#3b82f6' };
    const grouped = { shopee: [], momo: [], coupang: [] };
    platforms.forEach((p, i) => {
      const m = PLATFORM_MARKETPLACE[p.name] || 'shopee';
      if (!grouped[m]) grouped[m] = [];
      grouped[m].push({ p, i });
    });

    // 單一賣場列
    const buildPlatformRow = (p, i) => {
      const td = inputOf(p);
      const yd = prevOf(p);
      const delta = yd > 0 ? ((td / yd) - 1) * 100 : 0;
      const hasAds = PLATFORMS_WITH_AD_SPEND.has(p.name);
      const inputAds = +(p.dailyAdSpend?.[inputDateStr]) || 0;
      const roas = (td > 0 && inputAds > 0) ? (td / inputAds).toFixed(2) : '—';
      const m = PLATFORM_MARKETPLACE[p.name] || 'shopee';
      const logoSrc = MARKETPLACE_BADGE[m].src;

      const deltaCell = yd > 0
        ? (delta >= 0
            ? `<span class="up" style="font-weight:600">↑ ${delta.toFixed(1)}%</span>`
            : `<span class="down" style="font-weight:600">↓ ${Math.abs(delta).toFixed(1)}%</span>`)
        : '<span style="color:var(--text-muted)">—</span>';

      const inputStyle = 'width:100%;max-width:110px;padding:4px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;text-align:center;color:var(--text);box-sizing:border-box;background:white;height:28px';

      // 輸入框預設帶入「當日已儲存」的值（加上千分位逗號），過 12 點跨日才會自動清成 0
      const fmt = v => (v > 0 ? (+v).toLocaleString() : '');
      const revValue = fmt(td);
      const adsValue = fmt(inputAds);

      const adsCell = hasAds
        ? `<input type="text" inputmode="numeric" class="card-ads" data-idx="${i}" data-original="${adsValue}" value="${adsValue}" placeholder="0" onfocus="this.select()"
              style="${inputStyle}">`
        : '<span style="color:var(--text-muted);font-size:14px">—</span>';

      const roasCell = hasAds
        ? `<span class="card-roas" data-idx="${i}" style="font-weight:700;font-variant-numeric:tabular-nums;color:${p.color};font-size:13px">${roas}</span>`
        : '<span style="color:var(--text-muted);font-size:13px">—</span>';

      return `
        <tr data-card-idx="${i}" style="border-top:1px solid var(--border)">
          <td style="padding:3px 6px;white-space:nowrap;overflow:hidden">
            <div style="display:flex;align-items:center;gap:6px;min-width:0">
              <img src="${logoSrc}" alt="" style="width:18px;height:18px;border-radius:4px;object-fit:contain;background:white;padding:1px;flex-shrink:0;box-shadow:0 1px 2px rgba(0,0,0,0.06)">
              <span style="font-weight:600;font-size:13px;white-space:nowrap" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
            </div>
          </td>
          <td style="padding:3px 8px;text-align:center">
            <input type="text" inputmode="numeric" class="card-rev" data-idx="${i}" data-original="${revValue}" value="${revValue}" placeholder="0" onfocus="this.select()"
              style="${inputStyle}">
          </td>
          <td style="padding:3px 8px;text-align:center">${adsCell}</td>
          <td style="padding:3px 8px;text-align:center">${roasCell}</td>
          <td style="padding:3px 8px;white-space:nowrap;font-size:12px;text-align:center">${deltaCell}</td>
          <td style="padding:3px 6px;white-space:nowrap;text-align:center">
            <button class="row-save-btn" data-idx="${i}" title="按此存檔 — 未按就不會寫入雲端" style="display:none;width:24px;height:24px;font-size:13px;font-weight:700;border:0;border-radius:5px;background:#10b981;color:white;cursor:pointer;box-shadow:0 1px 3px rgba(16,185,129,.35)">✓</button>
          </td>
        </tr>
      `;
    };

    // 通路分群分隔列 + 該通路的賣場列
    const marketRowsHtml = marketOrder.map(m => {
      const items = grouped[m] || [];
      if (items.length === 0) return '';
      const badge = MARKETPLACE_BADGE[m];
      const tint = marketTint[m] || '#6b7280';
      const dividerRow = `
        <tr style="background:var(--bg)">
          <td colspan="6" style="padding:6px 14px;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:7px">
              <img src="${badge.src}" alt="${escapeHtml(badge.name)}"
                style="width:14px;height:14px;border-radius:3px;object-fit:contain;flex-shrink:0">
              <span style="font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:.05em;text-transform:uppercase">${escapeHtml(badge.name)}</span>
              <span style="font-size:10px;color:var(--text-muted);font-weight:500">· ${items.length} 個賣場</span>
            </div>
          </td>
        </tr>
      `;
      const platformRows = items.map(({ p, i }) => buildPlatformRow(p, i)).join('');
      return dividerRow + platformRows;
    }).join('');

    // 當日總計列
    const grandRev = platforms.reduce((s, p) => s + inputOf(p), 0);
    const grandPrev = platforms.reduce((s, p) => s + prevOf(p), 0);
    const grandDelta = grandPrev > 0 ? ((grandRev / grandPrev) - 1) * 100 : 0;
    const grandAds = platforms
      .filter(p => PLATFORMS_WITH_AD_SPEND.has(p.name))
      .reduce((s, p) => s + (+(p.dailyAdSpend?.[inputDateStr]) || 0), 0);
    const grandRoas = grandAds > 0 ? (grandRev / grandAds).toFixed(2) : '—';
    const grandDeltaCell = grandPrev > 0
      ? (grandDelta >= 0
          ? `<span class="up" style="font-weight:700">↑ ${grandDelta.toFixed(1)}%</span>`
          : `<span class="down" style="font-weight:700">↓ ${Math.abs(grandDelta).toFixed(1)}%</span>`)
      : '<span style="color:var(--text-muted)">—</span>';

    const totalRow = `
      <tr style="background:var(--bg);border-top:2px solid var(--border)">
        <td style="padding:6px 6px;font-weight:800;font-size:13px;letter-spacing:.05em">當日總計</td>
        <td id="grand-rev-cell" data-base-rev="${grandRev}" style="padding:6px 4px;text-align:center;font-weight:800;font-size:13px;font-variant-numeric:tabular-nums">NT$ ${grandRev.toLocaleString()}</td>
        <td id="grand-ads-cell" data-base-ads="${grandAds}" style="padding:6px 4px;text-align:center;font-weight:700;font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums">NT$ ${grandAds.toLocaleString()}</td>
        <td id="grand-roas-cell" style="padding:6px 4px;text-align:center;font-weight:800;font-size:13px;color:#6366f1;font-variant-numeric:tabular-nums">${grandRoas}</td>
        <td id="grand-delta-cell" data-prev-total="${grandPrev}" style="padding:6px 4px;font-size:12px;text-align:center">${grandDeltaCell}</td>
        <td></td>
      </tr>
    `;

    const revenueTableHtml = `
      <div class="table-card" style="margin:0;width:100%;display:flex;flex-direction:column">
        <div class="table-card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 12px">
          <div>
            <h3 style="margin:0;font-size:14px">每日營收填寫</h3>
            <p style="margin:1px 0 0;font-size:11px;color:var(--text-muted)">輸入後按 Enter 或點別處跳出確認再儲存 · 過 12 點自動歸 0</p>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:4px;background:var(--bg);padding:3px 6px;border-radius:6px">
              <span style="font-size:11px;color:var(--text-muted);font-weight:500;padding-left:4px">填寫日期</span>
              <button id="entry-date-prev" title="前一天" style="padding:2px 7px;border:1px solid var(--border);border-radius:4px;background:white;color:var(--text-muted);font-size:11px;cursor:pointer;line-height:1">←</button>
              <input type="date" id="entry-date-picker" value="${escapeHtml(inputDateStr)}" max="${escapeHtml(todayStrLocal)}"
                style="padding:3px 6px;border:1px solid var(--border);border-radius:4px;font-size:12px;font-weight:600;font-family:inherit;color:var(--text);background:white;width:130px">
              <button id="entry-date-next" title="後一天" style="padding:2px 7px;border:1px solid var(--border);border-radius:4px;background:white;color:var(--text-muted);font-size:11px;cursor:pointer;line-height:1" ${inputDateStr >= todayStrLocal ? 'disabled' : ''}>→</button>
              ${inputDateStr !== defaultInputDate ? `<button id="entry-date-reset" title="回到昨天" style="padding:2px 7px;border:0;border-radius:4px;background:var(--primary-soft);color:var(--primary);font-size:10px;font-weight:600;cursor:pointer;margin-left:2px">昨天</button>` : ''}
            </div>
            <button id="open-month-detail" title="查看本月每日明細"
              style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;background:white;color:var(--text);font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px">
              📅 本月明細
            </button>
          </div>
        </div>
        <div class="table-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch">
          <table style="border-collapse:separate;border-spacing:0;width:100%;min-width:520px;table-layout:fixed">
            <thead>
              <tr style="background:var(--bg)">
                <th style="padding:5px 6px;text-align:left;font-size:11px;min-width:110px">賣場</th>
                <th style="padding:5px 4px;text-align:center;font-size:11px;width:115px">營收 NT$</th>
                <th style="padding:5px 4px;text-align:center;font-size:11px;width:115px">廣告費</th>
                <th style="padding:5px 4px;text-align:center;font-size:11px;width:58px">ROAS</th>
                <th style="padding:5px 4px;text-align:center;font-size:11px;width:78px">較前一日</th>
                <th style="padding:5px 4px;text-align:center;width:32px"></th>
              </tr>
            </thead>
            <tbody>
              ${marketRowsHtml}
              ${totalRow}
            </tbody>
          </table>
        </div>
      </div>
    `;

    return `
      <div class="page-header" style="margin-bottom:10px">
        <h2 style="font-size:22px;margin:0">儀表板首頁 <span class="live-dot">即時資料</span></h2>
        <p style="margin:2px 0 0;font-size:13px">歡迎回來，${escapeHtml(this.currentUser.name)}　·　${inputDateDisplay}</p>
      </div>
      ${summaryPills}
      <div class="stat-grid summary-grid">${summaryCards}</div>
      <div id="revenue-entry-panel" class="dash-entry${entryOpen ? '' : ' is-collapsed'}">${revenueTableHtml}</div>
      <div class="dash-main">
        ${this.channelRankingHtml(platforms, rangeInfo)}
        <div class="dash-main-col">
          ${this.channelAlertsHtml(platforms, rangeInfo)}
          ${this.channelPieHtml(platforms, rangeInfo)}
        </div>
      </div>
      <div class="dash-chart-row">${this.dailyLineChartHtml(platforms)}</div>
    `;
  },
  /* 各通路指標的單一計算來源 —— KPI 卡、排名長條、需要留意、圓餅圖共用，
     四塊的營收 / ROAS / 漲跌永遠不會算出不同答案。
     showDates / compareDates 是「日期陣列」：
       單日模式 = 長度 1 的陣列；月累計模式 = 該月每一天。
       所以單日只是陣列的特例，兩種模式共用同一條算式。
     - hasRoas：沒投廣告、或該範圍廣告費為 0 → 無法計算 ROAS（roas 為 null）
     - hasDelta：比較範圍營收為 0 → 沒有漲跌可言（delta 為 0，不可拿來判斷）
     - ⚠ 保留原始索引 i：它就是填寫表格的 data-idx，排序時絕不可就地 sort(platforms)，
       打亂會讓存檔寫到錯的賣場。 */
  channelMetrics(platforms, showDates, compareDates) {
    const sumRev = (p, dates) => dates.reduce((s, d) => s + (+p.daily?.[d] || 0), 0);
    const sumAds = (p, dates) => dates.reduce((s, d) => s + (+p.dailyAdSpend?.[d] || 0), 0);
    return platforms.map((p, i) => {
      const rev  = sumRev(p, showDates);
      const prev = sumRev(p, compareDates);
      const ads  = sumAds(p, showDates);
      const hasRoas = PLATFORMS_WITH_AD_SPEND.has(p.name) && ads > 0;
      const hasDelta = prev > 0;
      return {
        p, i, rev, prev, ads,
        hasRoas, roas: hasRoas ? rev / ads : null,
        hasDelta, delta: hasDelta ? ((rev / prev) - 1) * 100 : 0,
      };
    });
  },
  /* 各通路營收排名（水平長條）
     - 資料沿用 viewDashboard 同一份 platforms，指標走 channelMetrics()，不另接來源
     - 純 render、無事件綁定：日期切換與存檔都會走 this.render()，這裡自然跟著更新 */
  channelRankingHtml(platforms, rangeInfo) {
    const ranked = this.channelMetrics(platforms, rangeInfo.showDates, rangeInfo.compareDates)
      .sort((a, b) => b.rev - a.rev);

    const maxRev = Math.max(...ranked.map(m => m.rev), 0);
    const dateDisplay = rangeInfo.dateLabel;

    const legend = `
      <div class="rank-legend">
        <span class="rank-legend-item"><span class="rank-legend-dot is-good"></span>ROAS ≥ 10</span>
        <span class="rank-legend-item"><span class="rank-legend-dot is-mid"></span>5 – 10</span>
        <span class="rank-legend-item"><span class="rank-legend-dot is-low"></span>&lt; 5</span>
        <span class="rank-legend-item"><span class="rank-legend-dot is-none"></span>無廣告</span>
      </div>
    `;
    const head = `
      <div class="rank-card-head">
        <h3 class="rank-card-title">各通路營收排名</h3>
        <span class="rank-card-date">${escapeHtml(dateDisplay)}　·　依營收由高到低　·　漲跌較${escapeHtml(rangeInfo.compareLabel)}</span>
        ${legend}
      </div>
    `;

    if (maxRev <= 0) {
      return `
        <div class="rank-card">
          ${head}
          <div class="rank-empty">${escapeHtml(dateDisplay)} 還沒有營收資料 — 等各通路數字填入後，這裡會顯示排名</div>
        </div>
      `;
    }

    const rows = ranked.map((m) => {
      const { p, rev, hasRoas, roas, hasDelta, delta } = m;

      // ROAS 分級：沒投廣告、或當日廣告費為 0 → 灰、顯示「—」（跟填寫表格的慣例一致）
      let roasCls = 'is-none';
      let roasText = '—';
      if (hasRoas) {
        roasCls = roas >= 10 ? 'is-good' : (roas >= 5 ? 'is-mid' : 'is-low');
        roasText = roas.toFixed(2);
      }

      const pct = (rev / maxRev) * 100;
      // 長條太短時金額塞不進去 → 翻到長條外側
      const narrow = pct < 30;

      const deltaCls  = hasDelta ? (delta >= 0 ? 'up' : 'down') : 'flat';
      const deltaText = hasDelta
        ? `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}%`
        : '—';

      const market = PLATFORM_MARKETPLACE[p.name] || 'shopee';
      const logoSrc = MARKETPLACE_BADGE[market].src;

      return `
        <li class="rank-row">
          <span class="rank-name">
            <img class="rank-logo" src="${logoSrc}" alt="">
            <span class="rank-name-text" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
          </span>
          <span class="rank-bar-track">
            <span class="rank-bar ${roasCls}${narrow ? ' is-narrow' : ''}" style="--bar-pct:${pct.toFixed(1)}%">
              <span class="rank-bar-value">${fmtNTD(rev)}</span>
            </span>
          </span>
          <span class="rank-roas ${roasCls}">${roasText}</span>
          <span class="rank-delta ${deltaCls}">${deltaText}</span>
        </li>
      `;
    }).join('');

    return `
      <div class="rank-card">
        ${head}
        <ul class="rank-list">${rows}</ul>
      </div>
    `;
  },
  /* 需要留意 — 自動標記表現異常的通路
     - 指標走 channelMetrics()，與排名長條同一份計算
     - 純 render、無事件綁定：跟著既有重繪路徑更新
     門檻：跌幅 > 20%（需有比較期資料）、ROAS < 5（需 ROAS 可計算）；符合任一即列出。
     跌幅的比較基準隨檢視範圍走：單日 = 較前一日、月累計 = 較上月，原因文字會標明。 */
  channelAlertsHtml(platforms, rangeInfo) {
    const DROP_LIMIT = -20;   // 跌幅超過 20% → 標記
    // 與排名長條的紅色門檻對齊（channelRankingHtml 的 is-low 也是 < 5），
    // 避免出現「排名長條是黃燈、卻被列入需要留意」的矛盾
    const ROAS_LIMIT = 5;     // ROAS 低於 5 → 標記

    const alerts = this.channelMetrics(platforms, rangeInfo.showDates, rangeInfo.compareDates)
      .map((m) => {
        const reasons = [];
        // 比較期沒資料就沒有跌幅可言 → 不判斷（hasDelta 已含此保護）
        if (m.hasDelta && m.delta < DROP_LIMIT) {
          reasons.push({ kind: 'drop', text: `營收 ↓${Math.abs(m.delta).toFixed(1)}%（較${rangeInfo.compareLabel}）` });
        }
        // ROAS 無法計算（無廣告投放 / 該範圍廣告費 0）→ 不納入此條件
        if (m.hasRoas && m.roas < ROAS_LIMIT) {
          reasons.push({ kind: 'roas', text: `ROAS 偏低 ${m.roas.toFixed(2)}` });
        }
        return { ...m, reasons };
      })
      .filter((m) => m.reasons.length > 0);

    // 嚴重度優先：有跌幅的排前面（跌最多在最前），只有 ROAS 問題的排後面（ROAS 最低在前）
    alerts.sort((a, b) => {
      const aDrop = a.reasons.some(x => x.kind === 'drop');
      const bDrop = b.reasons.some(x => x.kind === 'drop');
      if (aDrop !== bDrop) return aDrop ? -1 : 1;
      if (aDrop && bDrop) return a.delta - b.delta;
      return a.roas - b.roas;
    });

    const dateDisplay = rangeInfo.dateLabel;
    const head = `
      <div class="alert-card-head">
        <h3 class="alert-card-title">需要留意</h3>
        <span class="alert-card-tag">系統自動標記</span>
        <span class="alert-card-count">${escapeHtml(dateDisplay)}${alerts.length ? `　·　${alerts.length} 個通路` : ''}</span>
      </div>
    `;

    if (alerts.length === 0) {
      const okText = rangeInfo.kind === 'month' ? '各通路表現穩定，無需特別留意' : '今日各通路表現穩定，無需特別留意';
      return `
        <div class="alert-card">
          ${head}
          <div class="alert-ok"><span>✓</span><span>${escapeHtml(okText)}</span></div>
        </div>
      `;
    }

    const rows = alerts.map((m) => {
      const market = PLATFORM_MARKETPLACE[m.p.name] || 'shopee';
      const logoSrc = MARKETPLACE_BADGE[market].src;
      const chips = m.reasons
        .map(x => `<span class="alert-chip is-${x.kind}">${escapeHtml(x.text)}</span>`)
        .join('');
      return `
        <li class="alert-row">
          <span class="alert-icon">⚠️</span>
          <img class="alert-logo" src="${logoSrc}" alt="">
          <span class="alert-name">${escapeHtml(m.p.name)}</span>
          <span class="alert-reasons">${chips}</span>
        </li>
      `;
    }).join('');

    return `
      <div class="alert-card">
        ${head}
        <ul class="alert-list">${rows}</ul>
      </div>
    `;
  },
  /* 各通路營收佔比（甜甜圈）— 沿用 index.html 既有的 Chart.js CDN，不引新套件
     - 指標走 channelMetrics()，與排名長條 / 需要留意同一份計算
     - 比照既有 _chartState 的做法：這裡只產生 markup + 把資料放進 _pieState，
       實際建圖在 initChannelPie()（DOM 進場後才有 canvas 可用）
     - 純 render、無事件綁定：跟著既有重繪路徑更新 */
  channelPieHtml(platforms, rangeInfo) {
    const metrics = this.channelMetrics(platforms, rangeInfo.showDates, rangeInfo.compareDates);
    const total = metrics.reduce((s, m) => s + m.rev, 0);
    const dateDisplay = rangeInfo.dateLabel;
    const head = `
      <div class="pie-card-head">
        <h3 class="pie-card-title">各通路營收佔比</h3>
        <span class="pie-card-date">${escapeHtml(dateDisplay)}</span>
      </div>
    `;
    // 營收 0 的通路不畫進圖，免得圖例掛一排 0.0%
    const slices = metrics.filter(m => m.rev > 0).sort((a, b) => b.rev - a.rev);

    if (total <= 0 || slices.length === 0) {
      this._pieState = null;
      return `<div class="pie-card">${head}<div class="pie-empty">${escapeHtml(dateDisplay)} 還沒有營收資料</div></div>`;
    }
    // CDN 掛掉 / 離線時不要整頁炸掉，給替代訊息（下次重繪會自己補上）
    if (typeof window.Chart === 'undefined') {
      this._pieState = null;
      return `<div class="pie-card">${head}<div class="pie-empty">圖表元件尚未載入 — 重新整理後即會顯示</div></div>`;
    }

    this._pieState = {
      labels: slices.map(m => m.p.name),
      values: slices.map(m => m.rev),
      colors: slices.map(m => m.p.color || '#94a3b8'),
      total,
    };

    const legend = slices.map((m) => {
      const pct = (m.rev / total) * 100;
      return `
        <span class="pie-legend-item">
          <span class="pie-legend-dot" style="--dot:${m.p.color || '#94a3b8'}"></span>
          ${escapeHtml(m.p.name)}
          <span class="pie-legend-pct">${pct.toFixed(1)}%</span>
        </span>
      `;
    }).join('');

    return `
      <div class="pie-card">
        ${head}
        <div class="pie-canvas-wrap"><canvas id="channel-pie"></canvas></div>
        <div class="pie-legend">${legend}</div>
      </div>
    `;
  },
  /* 建立甜甜圈圖 — 由 bindDashboardPills() 在每次 render 後呼叫。
     ⚠ 首頁每次改日期 / 存檔 / 雲端快照都會 render()，innerHTML 一換舊 canvas 就沒了，
       Chart 實例若不 destroy 會持續洩漏並可能報「Canvas is already in use」。
       這裡沿用 profit.js 的慣例：實例存起來、重建前先 destroy。 */
  initChannelPie() {
    if (this._channelPieChart) {
      try { this._channelPieChart.destroy(); } catch {}
      this._channelPieChart = null;
    }
    const canvas = document.getElementById('channel-pie');
    if (!canvas || !this._pieState || typeof window.Chart === 'undefined') return;
    // 保險：同一個 canvas 上若還掛著孤兒實例，一併清掉
    const orphan = window.Chart.getChart(canvas);
    if (orphan) { try { orphan.destroy(); } catch {} }

    const { labels, values, colors, total } = this._pieState;
    // 顏色一律讀 :root 變數，不在這裡寫死
    const css = getComputedStyle(document.documentElement);
    const cText    = css.getPropertyValue('--text').trim()       || '#111827';
    const cMuted   = css.getPropertyValue('--text-muted').trim() || '#6b7280';
    const cSurface = css.getPropertyValue('--surface').trim()    || '#ffffff';
    // canvas 不吃 CSS，字體要自己指定（對齊全站黑體）
    const font = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';

    // 圓心文字：直接畫在 canvas 上，座標取自圓弧中心 → 不會跑位
    const centerText = {
      id: 'channelPieCenter',
      afterDatasetsDraw(chart) {
        const arc = chart.getDatasetMeta(0)?.data?.[0];
        if (!arc) return;
        const { ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = cMuted;
        ctx.font = `600 11px ${font}`;
        ctx.fillText('全通路', arc.x, arc.y - 11);
        ctx.fillStyle = cText;
        ctx.font = `700 17px ${font}`;
        ctx.fillText(fmtNTD(total), arc.x, arc.y + 9);
        ctx.restore();
      },
    };

    this._channelPieChart = new window.Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: cSurface,
          borderWidth: 2,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        animation: { duration: 200 },
        plugins: {
          legend: { display: false },   // 圖例用 HTML 自己做，才標得上百分比
          tooltip: {
            callbacks: {
              label: (c) => {
                const pct = total > 0 ? (c.parsed / total) * 100 : 0;
                return ` ${c.label}　${fmtNTD(c.parsed)}（${pct.toFixed(1)}%）`;
              },
            },
          },
        },
      },
      plugins: [centerText],
    });
  },
  dailyLineChartHtml(platforms /* days param ignored now */) {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    // 年/月分開記：預設本月；不允許未來
    let yMonth = this.filter.chartYear || curY;
    let mMonth = this.filter.chartMonth || curM;
    if (yMonth > curY || (yMonth === curY && mMonth > curM)) {
      yMonth = curY; mMonth = curM;
    }
    const monthStart = new Date(yMonth, mMonth - 1, 1);
    const lastOfMonth = new Date(yMonth, mMonth, 0);
    const isCurrent = (yMonth === curY && mMonth === curM);
    // 本月只顯示到昨日；過去月份顯示整月
    const endDate = isCurrent ? addDays(now, -1) : lastOfMonth;
    const endStr = toDateStr(endDate);
    const monthLabel = isCurrent ? '本月' : `${mMonth}月`;
    // 給下拉選單用：年份從 2024 到當年；月份永遠 1-12（含禁用判斷由 JS 過濾或 disabled）
    const yearOpts = [];
    for (let y = curY; y >= 2024; y--) yearOpts.push(y);
    const monthOpts = Array.from({length:12}, (_,i)=>i+1);

    const dates = [];
    for (let d = new Date(monthStart); toDateStr(d) <= endStr; d = addDays(d, 1)) {
      dates.push(toDateStr(d));
    }

    // 切換：null = 總計（全部加總），string = 單一平台
    const activeName = this.filter.chartPlatform || null;

    // 圖例（全賣場 + 7 個平台）
    const allPill = `
      <button class="line-legend" data-name="" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:${activeName === null ? '#0f172a' : 'var(--bg)'};border:1px solid ${activeName === null ? '#0f172a' : 'var(--border)'};border-radius:999px;font-size:11px;color:${activeName === null ? 'white' : 'var(--text-muted)'};cursor:pointer;font-weight:500">🏪 全賣場</button>
    `;
    const platformPills = platforms.map(p => {
      const isActive = activeName === p.name;
      const isDimmed = activeName !== null && !isActive;
      const market = PLATFORM_MARKETPLACE[p.name] || 'shopee';
      const logoSrc = MARKETPLACE_BADGE[market].src;
      return `
        <button class="line-legend" data-name="${escapeHtml(p.name)}"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px 3px 3px;background:${isActive ? p.color : p.color + '14'};border:1px solid ${isActive ? p.color : p.color + '40'};border-radius:999px;font-size:11px;color:${isActive ? 'white' : p.color};cursor:pointer;font-weight:600;opacity:${isDimmed ? '0.45' : '1'};transition:opacity .15s">
          <img src="${logoSrc}" alt="" style="width:16px;height:16px;border-radius:50%;object-fit:contain;background:white;flex-shrink:0">
          ${escapeHtml(p.name)}
        </button>
      `;
    }).join('');

    // 計算每日資料
    // 全賣場模式（activeName == null）：7 條平台曲線同時顯示
    // 單一平台模式：只顯示該平台一條線
    const logoImgHtml = (platformName) => {
      const m = PLATFORM_MARKETPLACE[platformName] || 'shopee';
      const s = MARKETPLACE_BADGE[m];
      return `<img src="${s.src}" alt="${escapeHtml(s.name)}" style="width:18px;height:18px;border-radius:4px;object-fit:contain;background:white;padding:1px;vertical-align:middle;margin-right:6px;box-shadow:0 1px 2px rgba(0,0,0,0.06)">`;
    };

    let series, lineLabel, lineLabelHtml, lineColor, isMulti;
    if (activeName) {
      const p = platforms.find(x => x.name === activeName);
      if (p) {
        series = [{ name: p.name, color: p.color, icon: p.icon,
                    values: dates.map(d => +(p.daily?.[d]) || 0) }];
        lineLabel = p.name;
        lineLabelHtml = `${logoImgHtml(p.name)}<span style="vertical-align:middle">${escapeHtml(p.name)}</span>`;
        lineColor = p.color;
        isMulti = false;
      } else {
        series = platforms.map(pp => ({
          name: pp.name, color: pp.color, icon: pp.icon,
          values: dates.map(d => +(pp.daily?.[d]) || 0),
        }));
        lineLabel = '全賣場';
        lineLabelHtml = '<span style="vertical-align:middle">🏪 全賣場</span>';
        lineColor = '#0f172a';
        isMulti = true;
      }
    } else {
      series = platforms.map(pp => ({
        name: pp.name, color: pp.color, icon: pp.icon,
        values: dates.map(d => +(pp.daily?.[d]) || 0),
      }));
      lineLabel = '全賣場';
      lineLabelHtml = '<span style="vertical-align:middle">🏪 全賣場</span>';
      lineColor = '#0f172a';
      isMulti = true;
    }

    // 每日全平台資料供 tooltip 取用
    const dailyData = dates.map(d => ({
      date: d,
      total: platforms.reduce((s, pp) => s + (+pp.daily?.[d] || 0), 0),
      breakdown: platforms.map(pp => ({
        name: pp.name, icon: pp.icon, color: pp.color,
        value: +pp.daily?.[d] || 0,
      })),
    }));

    // 沒資料的空狀態
    if (dates.length === 0) {
      return `
        <div class="chart-card" style="margin-top:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px">
            <h3 style="margin:0;font-size:14px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">
              <select id="chart-year-sel" style="border:1px solid var(--border);background:white;border-radius:6px;height:26px;padding:0 6px;font-size:12px;font-family:inherit;cursor:pointer;color:var(--text)">
                ${yearOpts.map(y => `<option value="${y}" ${y===yMonth?'selected':''}>${y} 年</option>`).join('')}
              </select>
              <select id="chart-month-sel" style="border:1px solid var(--border);background:white;border-radius:6px;height:26px;padding:0 6px;font-size:12px;font-family:inherit;cursor:pointer;color:var(--text)">
                ${monthOpts.map(m => {
                  const isFuture = (yMonth===curY && m>curM);
                  return `<option value="${m}" ${m===mMonth?'selected':''} ${isFuture?'disabled':''}>${m} 月</option>`;
                }).join('')}
              </select>
              ${!isCurrent ? '<button id="chart-month-reset" title="回到本月" style="border:1px solid var(--border);background:white;border-radius:6px;padding:0 10px;height:26px;cursor:pointer;font-size:11px;color:var(--text-muted)">回本月</button>' : ''}
              <span style="margin-left:4px">每日營收</span>
            </h3>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${allPill}${platformPills}</div>
          <div style="text-align:center;padding:60px 20px;color:var(--text-muted);font-size:14px">
            ${monthLabel}還沒有資料 ${isCurrent ? '— 等行銷團隊進系統填入昨日數字後，這裡會顯示曲線' : ''}
          </div>
        </div>
      `;
    }

    const maxV = Math.max(1, ...series.flatMap(s => s.values));

    const W = 1000, H = 280;
    const padL = 60, padR = 20, padT = 20, padB = 32;
    const cw = W - padL - padR;
    const ch = H - padT - padB;
    const xStep = dates.length > 1 ? cw / (dates.length - 1) : cw / 2;

    // Y 軸刻度
    const yTicks = [];
    for (let i = 0; i <= 4; i++) {
      const y = padT + ch - (i / 4) * ch;
      const v = (maxV / 4) * i;
      yTicks.push(`
        <line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3,3"/>
        <text x="${padL - 10}" y="${y + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${this.fmtTick(v)}</text>
      `);
    }

    // X 軸日期標籤
    const xLabelEvery = Math.max(1, Math.round(dates.length / 8));
    const xLabels = dates.map((d, i) => {
      if (i % xLabelEvery !== 0 && i !== dates.length - 1 && i !== 0) return '';
      const x = padL + i * xStep;
      const label = d.slice(5).replace('-', '/');
      return `<text x="${x}" y="${H - padB + 18}" font-size="11" fill="#64748b" text-anchor="middle">${label}</text>`;
    }).join('');

    // 折線（每個 series 一條）
    const polylines = series.map(s => {
      const pts = s.values.map((v, i) => {
        const x = padL + i * xStep;
        const y = padT + ch - (v / maxV) * ch;
        return `${x},${y}`;
      }).join(' ');
      return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="${isMulti ? 2 : 2.5}" stroke-linejoin="round" stroke-linecap="round" />`;
    }).join('');

    // 資料點圓圈（每個 series 每天一個）
    const circles = series.map(s => s.values.map((v, i) => {
      const x = padL + i * xStep;
      const y = padT + ch - (v / maxV) * ch;
      return `<circle cx="${x}" cy="${y}" r="${isMulti ? 2.5 : 3}" fill="white" stroke="${s.color}" stroke-width="${isMulti ? 1.5 : 2}" />`;
    }).join('')).join('');

    // 保存 chart 狀態供 hover handler 使用
    this._chartState = { dates, dailyData, series, padL, xStep, W, H, padT, ch, maxV, lineColor, lineLabel, isMulti, activeName };

    // 計算目前選中的 series 累計：全賣場 = 7 個賣場全部加總；單一賣場 = 該賣場本月加總
    const seriesTotal = series.reduce((s, ss) => s + ss.values.reduce((a, b) => a + b, 0), 0);
    const daysWithData = dates.filter(d =>
      series.some(s => s.values[dates.indexOf(d)] > 0)
    ).length;
    const totalLabel = isMulti ? `${monthLabel}全賣場累計` : `${monthLabel}「${lineLabel}」累計`;

    return `
      <div class="chart-card" style="margin:0;padding:12px 14px;width:100%;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px;flex-shrink:0">
          <h3 style="margin:0;font-size:14px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">
            <select id="chart-year-sel" style="border:1px solid var(--border);background:white;border-radius:6px;height:26px;padding:0 6px;font-size:12px;font-family:inherit;cursor:pointer;color:var(--text)">
              ${yearOpts.map(y => `<option value="${y}" ${y===yMonth?'selected':''}>${y} 年</option>`).join('')}
            </select>
            <select id="chart-month-sel" style="border:1px solid var(--border);background:white;border-radius:6px;height:26px;padding:0 6px;font-size:12px;font-family:inherit;cursor:pointer;color:var(--text)">
              ${monthOpts.map(m => {
                const isFuture = (yMonth===curY && m>curM);
                return `<option value="${m}" ${m===mMonth?'selected':''} ${isFuture?'disabled':''}>${m} 月</option>`;
              }).join('')}
            </select>
            ${!isCurrent ? '<button id="chart-month-reset" title="回到本月" style="border:1px solid var(--border);background:white;border-radius:6px;padding:0 10px;height:26px;cursor:pointer;font-size:11px;color:var(--text-muted)">回本月</button>' : ''}
            <span style="margin-left:4px">${lineLabelHtml} 每日營收</span>
          </h3>
          <span style="font-size:11px;color:var(--text-muted)">滑鼠移上去看當日</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:10px;flex-shrink:0">
          <span style="font-size:11px;color:var(--text-muted);font-weight:600;letter-spacing:.05em">${escapeHtml(totalLabel)}</span>
          <span style="font-size:20px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;letter-spacing:-.01em">NT$ ${seriesTotal.toLocaleString()}</span>
          <span style="font-size:11px;color:var(--text-muted)">· ${daysWithData} 天有資料</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;flex-shrink:0">${allPill}${platformPills}</div>
        <div id="line-chart-container" style="position:relative;flex:1;min-height:240px;display:flex">
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
            ${yTicks.join('')}
            ${polylines}
            ${circles}
            ${xLabels}
            <line id="chart-guide" x1="0" y1="${padT}" x2="0" y2="${padT + ch}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" style="opacity:0;transition:opacity .1s" />
            ${isMulti ? '' : `<circle id="chart-active-dot" cx="0" cy="0" r="6" fill="${lineColor}" stroke="white" stroke-width="2" style="opacity:0;transition:opacity .1s" />`}
          </svg>
          <div id="line-chart-tooltip" style="position:absolute;display:none;background:#1e293b;color:white;padding:10px 14px;border-radius:8px;font-size:13px;pointer-events:none;box-shadow:0 8px 24px rgba(15,23,42,0.2);z-index:10;transform:translate(-50%, calc(-100% - 10px));min-width:200px"></div>
        </div>
      </div>
    `;
  },
  bindLineChartTooltip() {
    const container = document.getElementById('line-chart-container');
    if (!container || !this._chartState) return;
    const svg = container.querySelector('svg');
    const tooltip = document.getElementById('line-chart-tooltip');
    const guide   = document.getElementById('chart-guide');
    const activeDot = document.getElementById('chart-active-dot'); // 只有單一平台模式才有
    if (!svg || !tooltip || !guide) return;

    const { dates, dailyData, series, padL, xStep, W, H, padT, ch, maxV, isMulti, activeName } = this._chartState;

    const logoFor = (name) => {
      const m = PLATFORM_MARKETPLACE[name] || 'shopee';
      return MARKETPLACE_BADGE[m].src;
    };

    const fmtTooltip = (i) => {
      const data = dailyData[i];
      const dateStr = data.date.replace(/-/g, '/');
      if (isMulti) {
        // 全賣場模式：顯示日期 + 總計 + 7 個平台明細
        return `
          <div style="font-size:11px;opacity:0.7;margin-bottom:6px">${dateStr}</div>
          <div style="font-size:11px;opacity:0.7">全賣場總計</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.18);font-variant-numeric:tabular-nums">NT$ ${Math.round(data.total).toLocaleString()}</div>
          <div style="font-size:12px;line-height:1.7">
            ${data.breakdown.map(p => `
              <div style="display:flex;justify-content:space-between;gap:18px;align-items:center">
                <span style="opacity:0.9;display:inline-flex;align-items:center;gap:6px">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${p.color}"></span>
                  <img src="${logoFor(p.name)}" alt="" style="width:16px;height:16px;border-radius:3px;object-fit:contain;background:white;flex-shrink:0">
                  ${escapeHtml(p.name)}
                </span>
                <span style="font-variant-numeric:tabular-nums;opacity:${p.value > 0 ? 1 : 0.4}">${p.value > 0 ? p.value.toLocaleString() : '—'}</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        // 單一平台模式
        const p = data.breakdown.find(x => x.name === activeName);
        const v = p ? p.value : 0;
        return `
          <div style="font-size:11px;opacity:0.7;margin-bottom:4px">${dateStr}</div>
          ${p ? `<div style="font-size:12px;opacity:0.9;margin-bottom:4px;display:inline-flex;align-items:center;gap:6px">
            <img src="${logoFor(p.name)}" alt="" style="width:16px;height:16px;border-radius:3px;object-fit:contain;background:white;flex-shrink:0">
            ${escapeHtml(p.name)}
          </div>` : ''}
          <div style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums">NT$ ${Math.round(v).toLocaleString()}</div>
        `;
      }
    };

    const update = (e) => {
      const svgRect = svg.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const scaleX = svgRect.width / W;
      const scaleY = svgRect.height / H;
      const svgX = x / scaleX;

      let i = Math.round((svgX - padL) / xStep);
      i = Math.max(0, Math.min(dates.length - 1, i));

      const cx = padL + i * xStep;
      // 多線：tooltip 對齊到該日最高線；單線：對齊到該線
      const yVal = isMulti
        ? Math.max(...series.map(s => s.values[i]))
        : series[0].values[i];
      const cy = padT + ch - (yVal / maxV) * ch;

      tooltip.innerHTML = fmtTooltip(i);
      tooltip.style.left = `${cx * scaleX}px`;
      tooltip.style.top  = `${cy * scaleY}px`;
      tooltip.style.display = 'block';

      guide.setAttribute('x1', cx);
      guide.setAttribute('x2', cx);
      guide.style.opacity = '1';

      if (activeDot && !isMulti) {
        activeDot.setAttribute('cx', cx);
        activeDot.setAttribute('cy', cy);
        activeDot.style.opacity = '1';
      }
    };

    const hide = () => {
      tooltip.style.display = 'none';
      guide.style.opacity = '0';
      if (activeDot) activeDot.style.opacity = '0';
    };

    container.addEventListener('mousemove', update);
    container.addEventListener('mouseleave', hide);
  },
  fmtTick(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return Math.round(v / 1000) + 'K';
    return Math.round(v).toString();
  },
  revenueEntrySectionHtml(platforms) {
    const now = new Date();
    const todayStr = toDateStr(now);
    const entryDate = this.filter.entryDate || todayStr;

    const platformRows = platforms.map((p, i) => {
      const rev = (p.daily && p.daily[entryDate] != null) ? p.daily[entryDate] : '';
      const ads = (p.dailyAdSpend && p.dailyAdSpend[entryDate] != null) ? p.dailyAdSpend[entryDate] : '';
      const hasAds = PLATFORMS_WITH_AD_SPEND.has(p.name);
      return `
        <div style="display:flex;align-items:center;gap:14px;padding:10px 0;${i < platforms.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}">
          <span class="dept-tag" style="background:${p.color}22;color:${p.color};font-size:13px;padding:5px 12px;min-width:130px">
            ${p.icon} ${escapeHtml(p.name)}
          </span>
          <div style="display:flex;align-items:center;gap:6px;flex:1">
            <span style="font-size:12px;color:var(--text-muted);min-width:32px">營收</span>
            <input type="number" min="0" step="1" class="entry-rev" data-idx="${i}" value="${rev}" placeholder="0"
              style="flex:1;max-width:180px;padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-variant-numeric:tabular-nums;text-align:right">
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex:1">
            <span style="font-size:12px;color:var(--text-muted);min-width:36px">廣告費</span>
            ${hasAds ? `
              <input type="number" min="0" step="1" class="entry-ads" data-idx="${i}" value="${ads}" placeholder="0"
                style="flex:1;max-width:160px;padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-variant-numeric:tabular-nums;text-align:right">
            ` : `<span style="color:var(--text-muted);font-size:13px">—</span>`}
          </div>
        </div>
      `;
    }).join('');

    const isToday = entryDate === todayStr;

    return `
      <div style="margin-top:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 22px">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding-bottom:14px;margin-bottom:8px;border-bottom:1px solid var(--border)">
          <h3 style="margin:0;font-size:16px">💰 營收輸入</h3>
          <label style="font-weight:500;margin-left:8px">日期</label>
          <input type="date" id="entry-date" value="${entryDate}" max="${todayStr}"
            style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px">
          ${isToday
            ? `<span class="up" style="font-size:13px;font-weight:500">● 今日</span>`
            : `<button class="btn-ghost" id="entry-today" style="padding:5px 12px;font-size:12px">回到今日</button>`}
          <span id="entry-status" style="margin-left:auto;font-size:13px;color:var(--text-muted)"></span>
          <button class="btn-primary" id="entry-save" style="width:auto;padding:8px 22px">💾 儲存</button>
        </div>
        ${platformRows}
      </div>
    `;
  },
  bindDashboardPills() {
    // 甜甜圈圖：每次 render 後重建（含銷毀舊實例），不是事件綁定
    this.initChannelPie();

    // 每日營收填寫的展開 / 收合。
    // ⚠ 只切 class，絕對不要在這裡呼叫 this.render()：
    //   填寫表格必須一直留在 DOM（bindCardInputs 綁的 .card-rev / .card-ads 才不會失效，
    //   總覽卡的即時加總也才讀得到值），重繪還會把使用者打到一半的輸入洗掉。
    const entryBtn = document.getElementById('toggle-revenue-entry');
    if (entryBtn) {
      entryBtn.addEventListener('click', () => {
        const open = !this.filter.revenueEntryOpen;
        this.filter.revenueEntryOpen = open;
        entryBtn.classList.toggle('is-open', open);
        entryBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.getElementById('revenue-entry-panel')?.classList.toggle('is-collapsed', !open);
      });
    }
    // 曲線圖圖例：點哪個平台就單獨顯示，點「全部」回到所有平台
    document.querySelectorAll('.line-legend').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const next = name || null;
        // 點到同一個 → 也回到全部
        this.filter.chartPlatform = (this.filter.chartPlatform === next) ? null : next;
        this.render();
      });
    });
    // 折線圖年/月下拉：分開選
    const yearSel = document.getElementById('chart-year-sel');
    if (yearSel) yearSel.addEventListener('change', () => {
      this.filter.chartYear = +yearSel.value;
      this.render();
    });
    const monthSel = document.getElementById('chart-month-sel');
    if (monthSel) monthSel.addEventListener('change', () => {
      this.filter.chartMonth = +monthSel.value;
      this.render();
    });
    const resetBtn = document.getElementById('chart-month-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      this.filter.chartYear = null;
      this.filter.chartMonth = null;
      this.render();
    });
    // 總覽卡日期切換：昨日 / 前日 / 本月 / 上月
    document.querySelectorAll('#summary-pills [data-summary-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter.summaryRange = btn.dataset.summaryRange;
        this.render();
      });
    });
    // 檢視範圍 — 日期 pill（單日模式）
    const dayPicker = document.getElementById('summary-custom-day');
    if (dayPicker) {
      dayPicker.addEventListener('change', () => {
        if (!dayPicker.value) return;
        const todayLocal2 = toDateStr(new Date());
        const yesterdayLocal = toDateStr(addDays(new Date(), -1));
        const v = dayPicker.value > todayLocal2 ? todayLocal2 : dayPicker.value;
        this.filter.summaryDate = v;
        // 用日曆挑回昨天 → 正規化回「昨日」模式，
        // 免得停在「其實就是昨天、卻還顯示『回昨日』」的尷尬狀態
        this.filter.summaryRange = (v === yesterdayLocal) ? 'yesterday' : 'customDay';
        this.render();
      });
    }
    // 檢視範圍 — 「↩ 回昨日」（只在檢視日不是昨天時才存在，比照填寫表格的 #entry-date-reset）
    const dayReset = document.getElementById('summary-day-reset');
    if (dayReset) {
      dayReset.addEventListener('click', () => {
        this.filter.summaryRange = 'yesterday';
        this.filter.summaryDate = null;   // 清掉 → customDay 會重新落回昨天
        this.render();
      });
    }
    // 檢視範圍 — 選月份（月累計模式）
    const monthPicker = document.getElementById('summary-custom-month');
    if (monthPicker) {
      monthPicker.addEventListener('change', () => {
        this.filter.summaryMonth = monthPicker.value;
        this.filter.summaryRange = 'customMonth';
        this.render();
      });
    }
  },
  openMonthlyDetailModal(yArg, mArg) {
    let platforms = Store.get(Store.KEYS.platforms, null);
    if (!platforms) platforms = JSON.parse(JSON.stringify(PLATFORMS));
    platforms = migratePlatforms(platforms);

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth(); // 0-indexed
    const yMonth = (yArg != null) ? yArg : curY;
    const mMonth = (mArg != null) ? mArg : curM;
    const isCurrentMonth = (yMonth === curY && mMonth === curM);
    const lastDay = new Date(yMonth, mMonth + 1, 0).getDate();
    const todayDay = now.getDate();
    // 本月只顯示「1 號 → 今天」；過去月份顯示整個月
    const dayCount = isCurrentMonth ? todayDay : lastDay;
    const dates = Array.from({ length: dayCount }, (_, i) =>
      `${yMonth}-${String(mMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    );

    // 依通路分群（蝦皮 4 / MOMO 2 / 酷澎 1）
    const marketOrder = ['shopee', 'momo', 'coupang'];
    const marketTint = { shopee: '#ee4d2d', momo: '#ec4899', coupang: '#3b82f6' };
    const grouped = { shopee: [], momo: [], coupang: [] };
    platforms.forEach(p => {
      const m = PLATFORM_MARKETPLACE[p.name] || 'shopee';
      if (!grouped[m]) grouped[m] = [];
      grouped[m].push(p);
    });

    // 取所有平台的順序 + 各自是否有廣告費
    const flatPlatforms = [];
    marketOrder.forEach(m => grouped[m].forEach(p => flatPlatforms.push({ p, market: m })));

    // 計算每平台每日 / 每平台總計 / 每日總計 / 整月總計
    const get = (p, d) => +(p.daily?.[d]) || 0;
    const getAds = (p, d) => +(p.dailyAdSpend?.[d]) || 0;

    const platformTotals = flatPlatforms.map(({ p }) => {
      const rev = dates.reduce((s, d) => s + get(p, d), 0);
      const ads = PLATFORMS_WITH_AD_SPEND.has(p.name)
        ? dates.reduce((s, d) => s + getAds(p, d), 0)
        : 0;
      const roas = ads > 0 ? (rev / ads).toFixed(2) : '—';
      return { rev, ads, roas };
    });

    // 表頭：通路（合併欄）+ 每平台子欄 + 總計
    // Row 1: marketplace headers
    // Row 2: 營收 / 廣告費 / ROAS sub-headers

    const fmt = (n) => n > 0 ? n.toLocaleString() : '—';
    // 緊湊版：cell padding 縮一半、字小一級、line-height 收緊；筆電可一頁看完整月
    const fmtCell = (n, dim, leftBorder) => `<td style="padding:2px 6px;text-align:center;font-variant-numeric:tabular-nums;font-size:12px;color:${dim ? '#cbd5e1' : 'var(--text)'};line-height:1.25;${leftBorder ? `border-left:${leftBorder}` : ''}">${fmt(n)}</td>`;
    const fmtRoas = (rev, ads) => {
      if (ads === 0) return `<td style="padding:2px 6px;text-align:center;color:#cbd5e1;font-size:12px;line-height:1.25">—</td>`;
      const r = (rev / ads).toFixed(2);
      return `<td style="padding:2px 6px;text-align:center;font-variant-numeric:tabular-nums;font-size:12px;font-weight:600;color:#4f46e5;line-height:1.25">${r}</td>`;
    };

    // 建欄位設定：每平台佔幾欄
    const colSpec = flatPlatforms.map(({ p }) => {
      const hasAds = PLATFORMS_WITH_AD_SPEND.has(p.name);
      return { p, hasAds, cols: hasAds ? 3 : 1 };
    });

    // 通路合併表頭（緊湊版）
    const marketHeadHtml = marketOrder.map(m => {
      const items = grouped[m] || [];
      if (items.length === 0) return '';
      const tint = marketTint[m];
      const totalCols = items.reduce((s, p) => s + (PLATFORMS_WITH_AD_SPEND.has(p.name) ? 3 : 1), 0);
      const badge = MARKETPLACE_BADGE[m];
      return `<th colspan="${totalCols}" style="padding:3px 6px;background:${tint}14;color:${tint};text-align:center;font-size:12px;font-weight:700;border-left:2px solid ${tint};border-bottom:1px solid var(--border)"><img src="${badge.src}" style="width:12px;height:12px;vertical-align:middle;border-radius:3px;margin-right:3px;object-fit:contain">${escapeHtml(badge.name)}</th>`;
    }).join('');

    // 平台名稱列
    const platformHeadHtml = colSpec.map(({ p, cols }) => {
      return `<th colspan="${cols}" style="padding:3px 5px;text-align:center;font-size:12px;color:var(--text);font-weight:600;border-bottom:1px solid var(--border);border-left:1px solid var(--border);white-space:nowrap">${escapeHtml(p.name)}</th>`;
    }).join('');

    // 子欄位列（短標籤節省空間） — 各賣場第一欄加 border-left 區隔
    const subHeadHtml = colSpec.map(({ hasAds }) => {
      const lb = 'border-left:1px solid #94a3b8;';
      if (hasAds) {
        return `<th style="padding:3px 5px;text-align:center;font-size:10.5px;color:var(--text-muted);font-weight:600;border-bottom:1px solid var(--border);${lb}">營收</th>
                <th style="padding:3px 5px;text-align:center;font-size:10.5px;color:var(--text-muted);font-weight:600;border-bottom:1px solid var(--border)">廣告</th>
                <th style="padding:3px 5px;text-align:center;font-size:10.5px;color:var(--text-muted);font-weight:600;border-bottom:1px solid var(--border)">ROAS</th>`;
      }
      return `<th style="padding:3px 5px;text-align:center;font-size:10.5px;color:var(--text-muted);font-weight:600;border-bottom:1px solid var(--border);${lb}">營收</th>`;
    }).join('');

    // 每一天的資料列
    const todayStrLocal = toDateStr(new Date());
    let monthTotalRev = 0;
    let monthTotalAds = 0;
    const dayRowsHtml = dates.map(d => {
      const isToday = d === todayStrLocal;
      const dayLabel = d.slice(5).replace('-', '/');
      let dayRev = 0;
      let dayAds = 0;
      // 各通路當日小計（蝦皮 / MOMO / 酷澎）
      const marketSubtotals = { shopee: 0, momo: 0, coupang: 0 };
      const cells = colSpec.map(({ p, hasAds }) => {
        const rev = get(p, d);
        dayRev += rev;
        const m = PLATFORM_MARKETPLACE[p.name] || 'shopee';
        marketSubtotals[m] += rev;
        // 每個賣場的第一欄加 border-left 區隔
        const lb = '1px solid #94a3b8';
        if (hasAds) {
          const ads = getAds(p, d);
          dayAds += ads;
          return fmtCell(rev, rev === 0, lb) + fmtCell(ads, ads === 0) + fmtRoas(rev, ads);
        }
        return fmtCell(rev, rev === 0, lb);
      }).join('');
      monthTotalRev += dayRev;
      monthTotalAds += dayAds;

      const subtotalCell = (val, tint, bold) => `
        <td style="padding:2px 6px;text-align:center;font-size:12px;font-weight:${bold ? '700' : '600'};font-variant-numeric:tabular-nums;color:${val > 0 ? (tint || 'var(--text)') : '#cbd5e1'};background:var(--bg);border-left:1px solid var(--border)">${fmt(val)}</td>
      `;

      return `
        <tr style="background:${isToday ? '#eef2ff44' : 'transparent'};line-height:1.25">
          <td style="padding:2px 8px;text-align:center;font-size:12px;font-weight:600;color:${isToday ? 'var(--primary)' : 'var(--text-muted)'};font-variant-numeric:tabular-nums;white-space:nowrap;border-right:1px solid var(--border);background:${isToday ? '#f5f3ff' : 'var(--surface)'}">${escapeHtml(dayLabel)}${isToday ? ' ●' : ''}</td>
          ${cells}
          ${subtotalCell(marketSubtotals.shopee, '#ee4d2d')}
          ${subtotalCell(marketSubtotals.momo, '#ec4899')}
          ${subtotalCell(marketSubtotals.coupang, '#3b82f6')}
          <td style="padding:2px 8px;text-align:center;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;color:${dayRev > 0 ? 'var(--text)' : '#cbd5e1'};background:#fef3c7;border-left:2px solid var(--warn)">${fmt(dayRev)}</td>
        </tr>
      `;
    }).join('');

    // 總計列：個別賣場 + 通路小計（整列置中對齊）
    const totalCells = colSpec.map(({ hasAds }, idx) => {
      const t = platformTotals[idx];
      const lb = 'border-left:1px solid #94a3b8;';
      if (hasAds) {
        return `<td style="padding:4px 6px;text-align:center;font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;${lb}">${fmt(t.rev)}</td>
                <td style="padding:4px 6px;text-align:center;font-size:12px;font-weight:600;color:var(--text-muted);font-variant-numeric:tabular-nums">${fmt(t.ads)}</td>
                <td style="padding:4px 6px;text-align:center;font-size:12.5px;font-weight:700;color:#4f46e5;font-variant-numeric:tabular-nums">${t.roas}</td>`;
      }
      return `<td style="padding:4px 6px;text-align:center;font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;${lb}">${fmt(t.rev)}</td>`;
    }).join('');

    // 通路月總計
    const monthSubtotals = { shopee: 0, momo: 0, coupang: 0 };
    flatPlatforms.forEach(({ p, market }, idx) => {
      monthSubtotals[market] += platformTotals[idx].rev;
    });

    const tableHtml = `
      <div style="border:1px solid var(--border);border-radius:6px;overflow:auto;max-height:calc(95vh - 130px)">
        <table style="border-collapse:separate;border-spacing:0;width:100%;table-layout:auto;font-size:12px">
          <thead style="background:var(--surface);position:sticky;top:0;z-index:1">
            <tr>
              <th rowspan="3" style="padding:3px 8px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:600;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--surface);width:52px">日期</th>
              ${marketHeadHtml}
              <th colspan="4" rowspan="2" style="padding:3px 8px;text-align:center;font-size:12px;color:var(--text-muted);font-weight:700;border-left:2px solid var(--border);border-bottom:1px solid var(--border);background:var(--bg)">通路小計 / 當日總計</th>
            </tr>
            <tr>${platformHeadHtml}</tr>
            <tr>${subHeadHtml}
              <th style="padding:3px 6px;text-align:center;font-size:10.5px;color:#ee4d2d;font-weight:700;border-bottom:1px solid var(--border);background:#ee4d2d10;border-left:2px solid var(--border);white-space:nowrap;min-width:78px">蝦皮總營收</th>
              <th style="padding:3px 6px;text-align:center;font-size:10.5px;color:#ec4899;font-weight:700;border-bottom:1px solid var(--border);background:#ec489910;white-space:nowrap;min-width:74px">MOMO總營收</th>
              <th style="padding:3px 6px;text-align:center;font-size:10.5px;color:#3b82f6;font-weight:700;border-bottom:1px solid var(--border);background:#3b82f610;white-space:nowrap;min-width:72px">酷澎總營收</th>
              <th style="padding:3px 6px;text-align:center;font-size:10.5px;color:var(--warn);font-weight:700;border-bottom:1px solid var(--border);background:#fef3c7;border-left:2px solid var(--warn);white-space:nowrap;min-width:86px">當日總營收</th>
            </tr>
          </thead>
          <tbody>
            ${dayRowsHtml}
          </tbody>
          <tfoot>
            <tr style="background:var(--bg);border-top:2px solid var(--border);position:sticky;bottom:0;z-index:1">
              <td style="padding:4px 8px;text-align:center;font-size:12.5px;font-weight:800;color:var(--text);border-right:1px solid var(--border);background:var(--bg)">總計</td>
              ${totalCells}
              <td style="padding:4px 8px;text-align:center;font-size:12.5px;font-weight:800;color:#ee4d2d;background:#ee4d2d18;border-left:2px solid var(--border);font-variant-numeric:tabular-nums">${fmt(monthSubtotals.shopee)}</td>
              <td style="padding:4px 8px;text-align:center;font-size:12.5px;font-weight:800;color:#ec4899;background:#ec489918;font-variant-numeric:tabular-nums">${fmt(monthSubtotals.momo)}</td>
              <td style="padding:4px 8px;text-align:center;font-size:12.5px;font-weight:800;color:#3b82f6;background:#3b82f618;font-variant-numeric:tabular-nums">${fmt(monthSubtotals.coupang)}</td>
              <td style="padding:4px 8px;text-align:center;font-size:14px;font-weight:800;color:var(--warn);background:#fef3c7;border-left:2px solid var(--warn);font-variant-numeric:tabular-nums">${fmt(monthTotalRev)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="margin-top:5px;text-align:right;font-size:11px;color:var(--text-muted)">
        <span>${dates.length === 0 ? '本月還沒有任何日期可顯示' : `共 ${dates.length} 天${isCurrentMonth ? ' · ● 今天' : ''} · — 無資料`}</span>
      </div>
    `;

    this.openModal({
      title: `📅 ${yMonth} 年 ${mMonth + 1} 月 明細`,
      bodyHtml: tableHtml,
      width: '95vw',
      hideFooter: true,
      onMount: () => {
        // 把標題的「X 月」改成可點按鈕，點開會浮出其他月份清單
        const h3 = document.querySelector('#modal .modal-header h3');
        if (!h3) return;
        const monthBtns = [];
        for (let m = 0; m <= curM; m++) {
          const active = (m === mMonth);
          monthBtns.push(`<button data-y="${curY}" data-m="${m}" class="month-pick-item"
            style="padding:6px 12px;border:0;background:${active ? 'var(--primary)' : 'transparent'};color:${active ? 'white' : 'var(--text)'};font-size:13px;font-weight:${active ? '700' : '500'};cursor:pointer;text-align:left;font-family:inherit;border-radius:5px;white-space:nowrap">${m + 1} 月</button>`);
        }
        h3.innerHTML = `
          📅 ${yMonth} 年
          <span style="position:relative;display:inline-block">
            <button id="month-pick-btn" style="padding:2px 10px;border:1px solid var(--border);border-radius:6px;background:#f5f3ff;color:var(--primary);font-size:16px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px">
              ${mMonth + 1} 月 <span style="font-size:11px;opacity:.7">▾</span>
            </button>
            <div id="month-pick-pop" style="display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:100000;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);padding:4px;min-width:120px;flex-direction:column;gap:2px">
              ${monthBtns.join('')}
            </div>
          </span>
          明細
        `;
        const btn = document.getElementById('month-pick-btn');
        const pop = document.getElementById('month-pick-pop');
        const togglePop = (e) => {
          if (e) e.stopPropagation();
          const open = pop.style.display !== 'none';
          pop.style.display = open ? 'none' : 'flex';
        };
        btn.addEventListener('click', togglePop);
        // 點外面關掉
        document.addEventListener('click', function closer(ev) {
          if (!pop || !document.body.contains(pop)) {
            document.removeEventListener('click', closer);
            return;
          }
          if (pop.style.display === 'flex' && !pop.contains(ev.target) && ev.target !== btn) {
            pop.style.display = 'none';
          }
        });
        document.querySelectorAll('.month-pick-item').forEach(it => {
          it.addEventListener('click', () => {
            const y = +it.dataset.y;
            const m = +it.dataset.m;
            this.closeModal();
            setTimeout(() => this.openMonthlyDetailModal(y, m), 0);
          });
          it.addEventListener('mouseover', () => {
            if (it.style.background === 'transparent' || !it.style.background) {
              it.style.background = 'var(--bg)';
            }
          });
          it.addEventListener('mouseout', () => {
            const active = it.dataset.m === String(mMonth);
            if (!active) it.style.background = 'transparent';
          });
        });
      },
    });
  },
  restorePlatformsBackup() {
    const backup = Store.get(Store.KEYS.platformsBackup, null);
    if (!backup || !backup.data) {
      showToast('沒有可還原的備份', 'error');
      return;
    }
    const ts = new Date(backup.timestamp || 0);
    const tsLabel = isFinite(ts.getTime())
      ? `${ts.getFullYear()}/${String(ts.getMonth()+1).padStart(2,'0')}/${String(ts.getDate()).padStart(2,'0')} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`
      : '時間未知';

    // 統計備份內容
    const backupSummary = (backup.data || []).map(p => {
      const days = Object.keys(p.daily || {}).length;
      return `${p.name}：${days} 天有資料`;
    }).join('<br>');

    this.closeModal();
    this.openModal({
      title: '⚠️ 還原上一版營收資料',
      bodyHtml: `
        <div style="font-size:13px;color:var(--text);line-height:1.7">
          <p style="margin:0 0 10px">準備從備份還原以下資料：</p>
          <div style="padding:10px 14px;background:var(--bg);border-radius:6px;font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums;line-height:1.8;margin-bottom:12px">
            <div style="font-weight:600;color:var(--text);margin-bottom:6px">備份時間：${escapeHtml(tsLabel)}${backup.savedBy ? ` · 由 ${escapeHtml(backup.savedBy)} 觸發` : ''}</div>
            ${backupSummary}
          </div>
          <div style="padding:10px 12px;background:#fee2e2;border-left:3px solid #ef4444;border-radius:6px;font-size:12px">
            <strong>注意</strong>：還原會把目前所有營收 / 廣告費資料覆蓋成備份的版本。<br>
            如果你今天有填新的資料但還沒備份過，會 <strong>遺失</strong>。確定要還原嗎？
          </div>
        </div>
      `,
      saveLabel: '確認還原',
      cancelLabel: '取消',
      onSave: () => {
        // ⚠ 不再「還原前另存一份備份」：那會把整個 ec.platforms 再複製一份
        //   到 ec.platformsBackup，造成 Firestore 文件 *2 體積 → 1 MiB 超限
        //   (這正是先前所有寫入都被靜默 reject 的根因)
        //   若使用者按錯，可透過 Firestore 控制台的版本歷史復原
        Store.set(Store.KEYS.platforms, backup.data);
        showToast('✓ 已還原到備份版本', 'success');
        this.render();
        return true;
      },
    });
  },
  bindCardInputs() {
    // 本月明細按鈕
    const btnMonthDetail = document.getElementById('open-month-detail');
    if (btnMonthDetail) {
      btnMonthDetail.addEventListener('click', () => this.openMonthlyDetailModal());
    }
    // 填寫日期 picker + 前後一天按鈕
    const picker = document.getElementById('entry-date-picker');
    const todayLocal = toDateStr(new Date());
    const defaultEntry = toDateStr(addDays(new Date(), -1));
    if (picker) {
      picker.addEventListener('change', () => {
        let v = picker.value;
        if (!v) return;
        if (v > todayLocal) v = todayLocal;
        this.filter.entryDate = v;
        this.render();
      });
    }
    const prevBtn = document.getElementById('entry-date-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const cur = this.filter.entryDate || defaultEntry;
        const d = new Date(cur + 'T00:00:00');
        this.filter.entryDate = toDateStr(addDays(d, -1));
        this.render();
      });
    }
    const nextBtn = document.getElementById('entry-date-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const cur = this.filter.entryDate || defaultEntry;
        const d = new Date(cur + 'T00:00:00');
        const next = toDateStr(addDays(d, 1));
        if (next > todayLocal) return;
        this.filter.entryDate = next;
        this.render();
      });
    }
    const resetBtn = document.getElementById('entry-date-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.filter.entryDate = defaultEntry;
        this.render();
      });
    }

    // 寫入日期：以使用者於「填寫日期」picker 選的為準（預設昨天）
    const inputDateStr = this.filter.entryDate || toDateStr(addDays(new Date(), -1));

    // 字串「123,456」→ 數字 123456；空字串 / 非數字 → null
    const parseAmount = (raw) => {
      if (raw == null) return null;
      const digits = String(raw).replace(/[^\d]/g, '');
      if (digits === '') return null;
      const n = +digits;
      return isFinite(n) ? n : null;
    };
    // 數字 → 千分位字串
    const fmtAmount = (n) => (n != null && n > 0 ? n.toLocaleString() : '');

    // 比對兩個值用「數字本身」比，避免逗號干擾
    const sameVal = (a, b) => {
      const pa = parseAmount(a), pb = parseAmount(b);
      return (pa == null ? 0 : pa) === (pb == null ? 0 : pb);
    };

    // 該列輸入是否有改動
    const isDirty = (idx) => {
      const revEl = document.querySelector(`.card-rev[data-idx="${idx}"]`);
      const adsEl = document.querySelector(`.card-ads[data-idx="${idx}"]`);
      const revChanged = revEl && !sameVal(revEl.value, revEl.dataset.original);
      const adsChanged = adsEl && !sameVal(adsEl.value, adsEl.dataset.original);
      return revChanged || adsChanged;
    };

    // 顯示「未儲存」的視覺提示（橘色邊框 + 顯示快速儲存按鈕）
    const markUnsaved = (idx) => {
      const revEl = document.querySelector(`.card-rev[data-idx="${idx}"]`);
      const adsEl = document.querySelector(`.card-ads[data-idx="${idx}"]`);
      const orange = '#f59e0b';
      let anyDirty = false;
      if (revEl) {
        const changed = !sameVal(revEl.value, revEl.dataset.original);
        revEl.style.borderColor = changed ? orange : 'var(--border)';
        revEl.style.boxShadow = changed ? '0 0 0 2px #f59e0b22' : 'none';
        if (changed) anyDirty = true;
      }
      if (adsEl) {
        const changed = !sameVal(adsEl.value, adsEl.dataset.original);
        adsEl.style.borderColor = changed ? orange : 'var(--border)';
        adsEl.style.boxShadow = changed ? '0 0 0 2px #f59e0b22' : 'none';
        if (changed) anyDirty = true;
      }
      // 該列的「✓ 快速儲存」按鈕：dirty 時顯示，乾淨時隱藏
      const saveBtn = document.querySelector(`.row-save-btn[data-idx="${idx}"]`);
      if (saveBtn) saveBtn.style.display = anyDirty ? 'inline-block' : 'none';
    };

    // 邊打邊更新 ROAS（不存檔）
    const updateRoas = (idx) => {
      const roasEl = document.querySelector(`.card-roas[data-idx="${idx}"]`);
      if (!roasEl) return;
      const revEl = document.querySelector(`.card-rev[data-idx="${idx}"]`);
      const adsEl = document.querySelector(`.card-ads[data-idx="${idx}"]`);
      const rev = parseAmount(revEl?.value) || 0;
      const ads = parseAmount(adsEl?.value) || 0;
      roasEl.textContent = (rev > 0 && ads > 0) ? (rev / ads).toFixed(2) : '—';
    };

    // 邊打邊更新「當日總計」 + 上方 summary 卡片（不存檔，純 UI 反映輸入）
    // 邏輯：抓所有 .card-rev / .card-ads 當下 value 重新加總，覆蓋顯示
    const fmtNTD2 = (n) => 'NT$ ' + (Math.round(n) || 0).toLocaleString();
    const updateLiveTotals = () => {
      // 撈每個 idx 當下輸入值（已存的會跟 dataset.original 一致）
      const revByIdx = {};
      const adsByIdx = {};
      document.querySelectorAll('.card-rev').forEach(el => {
        revByIdx[+el.dataset.idx] = parseAmount(el.value) || 0;
      });
      document.querySelectorAll('.card-ads').forEach(el => {
        adsByIdx[+el.dataset.idx] = parseAmount(el.value) || 0;
      });
      const revVals = Object.values(revByIdx);
      const adsVals = Object.values(adsByIdx);
      const totalRev = revVals.reduce((a,b)=>a+b,0);
      const totalAds = adsVals.reduce((a,b)=>a+b,0);
      // 當日總計列
      const revCell = document.getElementById('grand-rev-cell');
      const adsCell = document.getElementById('grand-ads-cell');
      const roasCell = document.getElementById('grand-roas-cell');
      const deltaCell = document.getElementById('grand-delta-cell');
      if (revCell) revCell.textContent = fmtNTD2(totalRev);
      if (adsCell) adsCell.textContent = fmtNTD2(totalAds);
      if (roasCell) roasCell.textContent = (totalAds > 0 && totalRev > 0) ? (totalRev/totalAds).toFixed(2) : '—';
      if (deltaCell) {
        const prev = +deltaCell.dataset.prevTotal || 0;
        if (prev > 0) {
          const d = (totalRev / prev - 1) * 100;
          deltaCell.innerHTML = d >= 0
            ? `<span class="up" style="font-weight:700">↑ ${d.toFixed(1)}%</span>`
            : `<span class="down" style="font-weight:700">↓ ${Math.abs(d).toFixed(1)}%</span>`;
        }
      }
      // 上方 summary 卡片（僅單日範圍才同步）
      document.querySelectorAll('.summary-card').forEach(card => {
        if (card.dataset.singleDay !== '1') return;
        const memberIdxs = (card.dataset.memberIdxs || '').split(',').filter(Boolean).map(n=>+n);
        const cur = memberIdxs.reduce((s,i) => s + (revByIdx[i] || 0), 0);
        const prev = +card.dataset.prev || 0;
        const valEl = card.querySelector('.summary-card-value');
        if (valEl) valEl.textContent = fmtNTD2(cur);

        // 漲跌 pill：只換文字 + up/down class，不重建結構
        //（比較基準那行是獨立元素，不需要在這裡回填）
        const deltaEl = card.querySelector('.summary-card-delta');
        if (deltaEl && prev > 0) {
          const d = (cur / prev - 1) * 100;
          deltaEl.classList.remove('up', 'down', 'flat');
          deltaEl.classList.add(d >= 0 ? 'up' : 'down');
          deltaEl.textContent = `${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)}%`;
        }

        // 佔全通路 %：分母用當下所有通路的即時總額
        const shareEl = card.querySelector('.summary-card-share-val');
        if (shareEl) shareEl.textContent = totalRev > 0 ? ((cur / totalRev) * 100).toFixed(1) + '%' : '0.0%';

        // ROAS / 廣告費：只有該通路有廣告成員時才有這兩個欄位
        const adsRow = card.querySelector('.summary-card-ads[data-ads-idxs]');
        const adsIdxs = (adsRow?.dataset.adsIdxs || '').split(',').filter(Boolean).map(n=>+n);
        if (adsIdxs.length) {
          const ads = adsIdxs.reduce((s,i) => s + (adsByIdx[i] || 0), 0);
          const roasEl = card.querySelector('.summary-card-roas-val');
          const adsValEl = card.querySelector('.summary-card-ads-val');
          if (roasEl) roasEl.textContent = (cur > 0 && ads > 0) ? (cur / ads).toFixed(2) : '—';
          if (adsValEl) adsValEl.textContent = fmtNTD2(ads);
        }
      });
    };

    // 還原輸入框到原始值
    const revert = (idx) => {
      const revEl = document.querySelector(`.card-rev[data-idx="${idx}"]`);
      const adsEl = document.querySelector(`.card-ads[data-idx="${idx}"]`);
      if (revEl) revEl.value = revEl.dataset.original || '';
      if (adsEl) adsEl.value = adsEl.dataset.original || '';
      updateRoas(idx);
      markUnsaved(idx);
    };

    // 標記正在 commit 的列 — blur 還原邏輯看到這個 flag 就跳過，
    //   避免「按 Enter 觸發 commit、commit 還在跑、blur 提前還原」的競爭
    const isCommitting = new Set();

    // 寫入 store — async 版：本機先寫，然後等雲端確認，失敗會跳明確錯誤
    const commit = async (idx) => {
      const revEl = document.querySelector(`.card-rev[data-idx="${idx}"]`);
      const adsEl = document.querySelector(`.card-ads[data-idx="${idx}"]`);
      const platforms = Store.get(Store.KEYS.platforms, null);

      isCommitting.add(idx);
      window._platformJustSaved = Date.now();

      // ⚠ 不再寫 platformsBackup：跟 platforms 完全重複會讓 Firestore 文件 *2 體積，
      //   先前因此撞到 1 MiB 上限導致所有寫入被靜默拒絕。
      //   如需還原，請從 Firestore 控制台用版本歷史復原。

      const list = migratePlatforms(platforms ? platforms.map(p => ({ ...p })) : JSON.parse(JSON.stringify(PLATFORMS)));
      if (!list[idx]) return;

      const writeField = (key, val) => {
        list[idx][key] = list[idx][key] || {};
        if (val == null || isNaN(val)) delete list[idx][key][inputDateStr];
        else list[idx][key][inputDateStr] = Math.round(val);
      };

      if (revEl) writeField('daily', parseAmount(revEl.value));
      if (adsEl) writeField('dailyAdSpend', parseAmount(adsEl.value));

      // 1) 本機 _mem 先寫好（同步）— 用 setLocalOnly 避免 Store.set 自帶的 fire-and-forget
      //    雲端寫入，那條路徑出錯時會被吃掉，使用者看不到失敗
      const hasLocalOnly = typeof Store.setLocalOnly === 'function';
      if (hasLocalOnly) {
        Store.setLocalOnly(Store.KEYS.platforms, list);
      } else {
        Store.set(Store.KEYS.platforms, list);
      }

      showToast('儲存中...', 'info');

      // 2) 等雲端寫入完成 — 失敗就跳明確錯誤、輸入框維持橘色 dirty
      try {
        if (typeof Store.pushKeyToCloud === 'function') {
          await Store.pushKeyToCloud(Store.KEYS.platforms);
        }
      } catch (e) {
        console.error('[SAVE] ❌ 雲端儲存失敗', e);
        isCommitting.delete(idx);
        const errMsg = (e && e.message) ? e.message : String(e);
        showToast('❌ 雲端儲存失敗', 'error');
        this.showAlertModal({
          title: '儲存到雲端失敗',
          message: '你的值還在輸入框內（橘色邊框未消除），請再按一次 ✓ 重試。\n\n常見原因：雲端文件已達 1 MiB 上限，需要請管理員把舊月份封存。',
          detail: errMsg,
          kind: 'error',
          dedupeKey: 'save-platforms-' + idx,
        });
        return;
      }

      // 3) 雲端確認後才把 dataset.original 對齊新值 → 邊框變灰、✓ 按鈕隱藏
      if (revEl) {
        const formatted = fmtAmount(parseAmount(revEl.value));
        revEl.value = formatted;
        revEl.dataset.original = formatted;
      }
      if (adsEl) {
        const formatted = fmtAmount(parseAmount(adsEl.value));
        adsEl.value = formatted;
        adsEl.dataset.original = formatted;
      }
      markUnsaved(idx);
      isCommitting.delete(idx);
      try { updateLiveTotals(); } catch {}
      showToast('已儲存 ✓', 'success');
      // 若沒有其他列還在編輯（避免蓋掉使用者打到一半的值），
      //   做完整 re-render → 右側折線圖、本月累計、當月總營收全部更新
      const anyOtherDirty = Array.from(document.querySelectorAll('.card-rev, .card-ads')).some(el => {
        return !sameVal(el.value, el.dataset.original || '');
      });
      if (!anyOtherDirty) {
        try { this.render(); } catch {}
      }
    };

    // 顯示確認 / 取消 dialog
    let dialogOpen = false;
    const promptConfirm = (idx) => {
      if (dialogOpen) return; // 同一次只跳一次
      const revEl = document.querySelector(`.card-rev[data-idx="${idx}"]`);
      const adsEl = document.querySelector(`.card-ads[data-idx="${idx}"]`);
      const platforms = Store.get(Store.KEYS.platforms, null) || [];
      const platformName = platforms[idx]?.name || '此賣場';
      const dispVal = (n) => (n == null || n <= 0 ? '—' : n.toLocaleString());

      const revOldN = parseAmount(revEl?.dataset.original);
      const revNewN = parseAmount(revEl?.value);
      const adsOldN = parseAmount(adsEl?.dataset.original);
      const adsNewN = parseAmount(adsEl?.value);
      const revChanged = revEl && (revOldN || 0) !== (revNewN || 0);
      const adsChanged = adsEl && (adsOldN || 0) !== (adsNewN || 0);
      if (!revChanged && !adsChanged) return;

      const diffRow = (label, oldN, newN, changed) => {
        if (!changed) return '';
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px">
            <span style="min-width:60px;font-size:12px;color:var(--text-muted);font-weight:600">${escapeHtml(label)}</span>
            <span style="font-variant-numeric:tabular-nums;color:var(--text-muted);text-decoration:line-through;font-size:14px">${dispVal(oldN)}</span>
            <span style="color:var(--text-muted);font-size:12px">→</span>
            <span style="font-variant-numeric:tabular-nums;color:#f59e0b;font-weight:700;font-size:16px">${dispVal(newN)}</span>
          </div>
        `;
      };

      dialogOpen = true;
      this.openModal({
        title: `確認修改 — ${platformName}`,
        bodyHtml: `
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">
            日期：<strong style="color:var(--text)">${escapeHtml(inputDateStr)}</strong>
          </div>
          ${diffRow('營收', revOldN, revNewN, revChanged)}
          ${diffRow('廣告費', adsOldN, adsNewN, adsChanged)}
          <div style="margin-top:14px;padding:10px 12px;background:#f59e0b14;border-left:3px solid #f59e0b;border-radius:6px;font-size:12px;color:var(--text)">
            按「確認」會寫入雲端儲存；按「取消」會還原為原本的金額。
          </div>
        `,
        saveLabel: '確認',
        cancelLabel: '取消',
        onSave: () => {
          dialogOpen = false;
          commit(idx);
          return true;
        },
        onCancel: () => {
          // 沒按確認就還原 — 不要一直顯示未確認的數字
          dialogOpen = false;
          revert(idx);
        },
      });
    };

    // 列上的 ✓ 快速儲存按鈕：直接 commit
    document.querySelectorAll('.row-save-btn').forEach(btn => {
      btn.addEventListener('mousedown', (e) => e.preventDefault()); // 不要讓 input 先 blur
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.idx;
        console.warn('[SAVE] ✓ 按鈕被按下', { idx, ver: document.querySelector('meta[name=app-version]')?.content });
        commit(idx);
      });
    });

    // 輸入時：即時加千分位 + 更新 ROAS、標記未儲存
    document.querySelectorAll('.card-rev, .card-ads').forEach(el => {
      const idx = +el.dataset.idx;
      el.addEventListener('input', () => {
        // 即時格式化：保留游標相對位置
        const before = el.value;
        const caret = el.selectionStart || 0;
        const digitsBeforeCaret = before.slice(0, caret).replace(/[^\d]/g, '').length;
        const digits = before.replace(/[^\d]/g, '');
        const formatted = digits === '' ? '' : (+digits).toLocaleString();
        if (formatted !== before) {
          el.value = formatted;
          // 重新放游標：放在「相同位數之後」
          let count = 0, newCaret = formatted.length;
          for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) count++;
            if (count === digitsBeforeCaret) { newCaret = i + 1; break; }
          }
          try { el.setSelectionRange(newCaret, newCaret); } catch (_) {}
        }
        updateRoas(idx);
        markUnsaved(idx);
        updateLiveTotals();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          // Enter 視同按 ✓：有變動就 commit
          e.preventDefault();
          if (isDirty(idx)) commit(idx);
          else el.blur();
        } else if (e.key === 'Escape') {
          // Esc 取消編輯：還原為原值，然後失焦（blur handler 看到不 dirty 就不再動）
          e.preventDefault();
          if (isDirty(idx)) revert(idx);
          el.blur();
        }
      });

      // 失焦時若有未按 ✓ 的變動 → 自動還原為原值
      // （使用者要求：沒按勾勾不寫入雲端，且輸入框跳回原值，不要留橘色 dirty 狀態）
      el.addEventListener('blur', () => {
        // 延遲一下確認真的離開該列：
        //   - 同列 rev→ads 切換時不還原，等整列都離開
        //   - 點 ✓ 按鈕時 mousedown preventDefault 已擋掉 blur，這裡正常不會跑
        //   - 但保險起見也檢查 isCommitting，避免 commit 跑到一半被 revert
        setTimeout(() => {
          if (isCommitting.has(idx)) return;
          const active = document.activeElement;
          const sameRow = active && active.tagName === 'INPUT'
            && (active.classList.contains('card-rev') || active.classList.contains('card-ads'))
            && +active.dataset.idx === idx;
          if (sameRow) return;
          if (isDirty(idx)) revert(idx);
        }, 100);
      });
    });
  },
  bindRevenueEntry() {
    const recompute = () => {
      let totalRev = 0, totalAds = 0;
      document.querySelectorAll('.entry-rev').forEach(el => {
        const v = +el.value;
        if (isFinite(v)) totalRev += v;
      });
      document.querySelectorAll('.entry-ads').forEach(el => {
        const v = +el.value;
        if (isFinite(v)) totalAds += v;
      });
      document.querySelectorAll('.entry-roas').forEach(el => {
        const idx = +el.dataset.idx;
        const revEl = document.querySelector(`.entry-rev[data-idx="${idx}"]`);
        const adsEl = document.querySelector(`.entry-ads[data-idx="${idx}"]`);
        const rev = revEl ? +revEl.value : 0;
        const ads = adsEl ? +adsEl.value : 0;
        el.textContent = (rev > 0 && ads > 0) ? (rev / ads).toFixed(2) : '—';
      });
      const tr = document.getElementById('entry-total-rev');
      const ta = document.getElementById('entry-total-ads');
      const trs = document.getElementById('entry-total-roas');
      if (tr) tr.textContent = fmtNTD(totalRev);
      if (ta) ta.textContent = totalAds > 0 ? fmtNTD(totalAds) : '—';
      if (trs) trs.textContent = (totalRev > 0 && totalAds > 0) ? (totalRev / totalAds).toFixed(2) : '—';
    };

    document.querySelectorAll('.entry-rev, .entry-ads').forEach(el => {
      el.addEventListener('input', recompute);
    });

    const dateEl = document.getElementById('entry-date');
    if (dateEl) dateEl.addEventListener('change', () => {
      this.filter.entryDate = dateEl.value;
      this.render();
    });

    const todayBtn = document.getElementById('entry-today');
    if (todayBtn) todayBtn.addEventListener('click', () => {
      this.filter.entryDate = toDateStr(new Date());
      this.render();
    });

    const saveBtn = document.getElementById('entry-save');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const entryDate = (document.getElementById('entry-date') || {}).value || toDateStr(new Date());
      const platforms = Store.get(Store.KEYS.platforms, null) || JSON.parse(JSON.stringify(PLATFORMS));
      const migrated = migratePlatforms(platforms);
      const list = migrated;

      document.querySelectorAll('.entry-rev').forEach(el => {
        const idx = +el.dataset.idx;
        const v = el.value === '' ? null : +el.value;
        if (!list[idx]) return;
        list[idx].daily = list[idx].daily || {};
        if (v == null || isNaN(v)) delete list[idx].daily[entryDate];
        else list[idx].daily[entryDate] = Math.round(v);
      });
      document.querySelectorAll('.entry-ads').forEach(el => {
        const idx = +el.dataset.idx;
        const v = el.value === '' ? null : +el.value;
        if (!list[idx]) return;
        list[idx].dailyAdSpend = list[idx].dailyAdSpend || {};
        if (v == null || isNaN(v)) delete list[idx].dailyAdSpend[entryDate];
        else list[idx].dailyAdSpend[entryDate] = Math.round(v);
      });

      Store.set(Store.KEYS.platforms, list);
      showToast(`${entryDate.replace(/-/g, '/')} 已儲存`, 'success');
      const statusEl = document.getElementById('entry-status');
      if (statusEl) statusEl.textContent = '✓ 已同步到雲端';
    });
  },
  openPlatformModal(idx) {
    let platforms = Store.get(Store.KEYS.platforms, null);
    if (!platforms) platforms = JSON.parse(JSON.stringify(PLATFORMS));
    platforms = migratePlatforms(platforms);
    platforms = platforms.map(p => ({
      ...p,
      daily: { ...(p.daily || {}) },
      dailyAdSpend: { ...(p.dailyAdSpend || {}) },
    }));

    const p = platforms[idx];
    if (!p) { showToast('找不到此平台', 'error'); return; }

    const now = new Date();
    const todayStr = toDateStr(now);
    const yesterdayStr = toDateStr(addDays(now, -1));
    const hasAds = PLATFORMS_WITH_AD_SPEND.has(p.name);

    // 重新渲染 modal body 用：日期變動時更新欄位值
    const renderBody = (dateStr) => {
      const rev = (p.daily[dateStr] != null) ? p.daily[dateStr] : '';
      const ads = (p.dailyAdSpend[dateStr] != null) ? p.dailyAdSpend[dateStr] : '';
      const roas = (typeof rev === 'number' && rev > 0 && typeof ads === 'number' && ads > 0)
        ? (rev / ads).toFixed(2) : '—';
      return `
        <div class="field">
          <label>平台</label>
          <input value="${p.icon} ${escapeHtml(p.name)}" disabled
            style="background:var(--bg);color:var(--text-muted)">
        </div>
        <div class="field">
          <label>日期</label>
          <input type="date" id="m-date" value="${dateStr}" max="${todayStr}">
          <div style="margin-top:6px;font-size:12px;color:var(--text-muted)">
            預設為昨天，可改其他日期；改完日期欄位下方數字會跟著變
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>當日營收（NT$）</label>
            <input type="number" id="m-rev" min="0" step="1" value="${rev}" placeholder="0" onfocus="this.select()">
          </div>
          <div class="field">
            <label>廣告費（NT$）</label>
            ${hasAds
              ? `<input type="number" id="m-ads" min="0" step="1" value="${ads}" placeholder="0" onfocus="this.select()">`
              : `<input value="此平台沒有廣告費" disabled style="background:var(--bg);color:var(--text-muted)">`}
          </div>
        </div>
        ${hasAds ? `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${p.color}14;border-radius:var(--radius-sm);margin-top:8px">
            <span style="font-size:12px;color:var(--text-muted);letter-spacing:.05em">ROAS</span>
            <span id="m-roas" style="font-weight:700;font-variant-numeric:tabular-nums;color:${p.color};font-size:18px">${roas}</span>
          </div>
        ` : ''}
        <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
          留空表示「沒這筆」，會把該日數值刪掉；ROAS = 營收 ÷ 廣告費（自動算）
        </div>
      `;
    };

    this.openModal({
      title: `編輯：${p.icon} ${p.name}`,
      bodyHtml: renderBody(yesterdayStr),
      onMount: () => {
        const updateRoas = () => {
          const roasEl = document.getElementById('m-roas');
          if (!roasEl) return;
          const revEl = document.getElementById('m-rev');
          const adsEl = document.getElementById('m-ads');
          const rev = revEl ? +revEl.value : 0;
          const ads = adsEl ? +adsEl.value : 0;
          roasEl.textContent = (rev > 0 && ads > 0) ? (rev / ads).toFixed(2) : '—';
        };
        // 切換日期時，即時更新下方營收與廣告費欄位顯示
        const dateEl = document.getElementById('m-date');
        if (dateEl) dateEl.addEventListener('change', () => {
          const newDate = dateEl.value;
          if (!newDate) return;
          const revEl = document.getElementById('m-rev');
          const adsEl = document.getElementById('m-ads');
          const newRev = (p.daily[newDate] != null) ? p.daily[newDate] : '';
          const newAds = (p.dailyAdSpend[newDate] != null) ? p.dailyAdSpend[newDate] : '';
          if (revEl) revEl.value = newRev;
          if (adsEl) adsEl.value = newAds;
          updateRoas();
        });
        // 邊打邊更新 ROAS
        const revEl = document.getElementById('m-rev');
        const adsEl = document.getElementById('m-ads');
        if (revEl) revEl.addEventListener('input', updateRoas);
        if (adsEl) adsEl.addEventListener('input', updateRoas);
      },
      onSave: async () => {
        const dateStr = (document.getElementById('m-date') || {}).value;
        if (!dateStr) { showToast('請選擇日期', 'error'); return false; }

        const revRaw = (document.getElementById('m-rev') || {}).value;
        const rev = revRaw === '' ? null : +revRaw;
        if (rev != null && (!isFinite(rev) || rev < 0)) { showToast('營收需為非負數字', 'error'); return false; }
        if (rev == null) delete p.daily[dateStr];
        else p.daily[dateStr] = Math.round(rev);

        if (hasAds) {
          const adsRaw = (document.getElementById('m-ads') || {}).value;
          const ads = adsRaw === '' ? null : +adsRaw;
          if (ads != null && (!isFinite(ads) || ads < 0)) { showToast('廣告費需為非負數字', 'error'); return false; }
          if (ads == null) delete p.dailyAdSpend[dateStr];
          else p.dailyAdSpend[dateStr] = Math.round(ads);
        }

        // 走「await 雲端 + 失敗顯式告知」的模式，跟主要 commit() 一致，
        // 避免 Firestore reject 被靜默吃掉（先前 1MB 超限事件的根因）
        window._platformJustSaved = Date.now();
        if (typeof Store.setLocalOnly === 'function') Store.setLocalOnly(Store.KEYS.platforms, platforms);
        else Store.set(Store.KEYS.platforms, platforms);
        try {
          if (typeof Store.pushKeyToCloud === 'function') {
            await Store.pushKeyToCloud(Store.KEYS.platforms);
          }
        } catch (e) {
          const errMsg = (e && e.message) ? e.message : String(e);
          this.showAlertModal({
            title: '儲存到雲端失敗',
            message: '本機已存（重新整理會看到），但雲端 reject。\n\n常見原因：文件超過 1 MiB 限制。',
            detail: errMsg,
            kind: 'error',
          });
          return false;
        }
        showToast(`「${p.name}」${dateStr.replace(/-/g,'/')} 已更新`, 'success');
        setTimeout(() => { try { this.render(); } catch {} }, 0);
        return true;
      },
    });
  },
});
