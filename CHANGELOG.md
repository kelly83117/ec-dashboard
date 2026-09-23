# CHANGELOG

## 2026-09-23 — KPI 月結表改為逐格存雲端（feat/kpi-cell-save）

- **問題**：每存一格就把 `_kpi_v1`（所有月份整個陣列）整包寫進 `app/profit`，而且 `_markPending('_kpi_v1')`
  讓這台電腦在按同步前擋掉雲端快照 → 看不到別人新填的數字，下一次存檔就把別人的資料蓋掉。
- **改法**：新文件 `app/kpi`（`months.{YYYY-MM}.{路徑}` + `meta.{YYYY-MM}.{路徑}={by,at}`），
  `window.__cloudKpi.writePaths` 用 FieldPath 一次原子寫入改到的那幾格。四條編輯路徑（一般格／備註／
  共同費用／合併欄位）與「清空此月份」都改走 `kpiWriteCell`，不再經 `saveKpiRows` / `_markPending`。
- **畫面不變**：訂閱 `app/kpi` 後轉回原本的 rows 陣列放進 `Store._profitMem._kpi_v1`，讀取端一行未改。
  別人改的格子即時出現；正在輸入時延後重畫、不洗掉輸入框。寫入失敗 → toast + 該格標紅，不寫 localStorage 假裝成功。
- **搬移**：`__kpiMigrateToV2()`（dryRun，console 印每月格數與各通路營收/純利並與畫面對帳）→
  `__kpiMigrateToV2({dryRun:false})`。搬移前畫面＝舊 `_kpi_v1` 為底 + `app/kpi` 疊上。舊 `_kpi_v1` 保留當備份。
- **TEST_NOWRITE**：雲端物件 17 → 18（`__cloudKpi`），方法 25 → 27（`writePaths` + `smokeWritePaths`）。
- **月結表畫面改版**（同一支 PR；年度總表、評分表不動；公式／`_kpiGroupTotals`／fieldMerge 攤提一行未改）：
  - 總覽：填寫進度鈕（`_kpiFillSlots` 單一算法）、四格大數字（全通路純利／營收／訂單數／客單價，較上月沿用 cmpOk 守衛）、
    「每 100 元營收，錢去哪了」瀑布圖（類別對照 `KPI_WF_MAP`、「其他」用差額，console 印各類金額）、
    營收組成＋本月重點、各通路表（可展開看各店，唯讀）。原本逐欄可編輯的明細表移除。
  - 填寫模式：左側通路清單＋鍵盤說明；每格直接是輸入框（上月值、空格虛線框、±50% 提醒可本機略過、「暫」／「未完成」）、
    合併欄位領頭格填總額、=公式與欄位備註保留；Enter／↓／Tab 移格、Enter 或失焦即存；「整欄沿用上月」與
    Excel 多格貼上都一次原子寫入；底部顯示最後編輯者與「下一個通路」；「清空此月份」移到這裡。
  - `__kpiSmokeTest()`：只寫 `app/kpi_smoke`，驗真實 FieldPath 寫入（本機需另貼放行碼）。
- **回滾**：profit.js 讀寫改回 `_kpi_v1`（舊資料還在 `app/profit`）。
