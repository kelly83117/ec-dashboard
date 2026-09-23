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
- **TEST_NOWRITE**：雲端物件 17 → 18（`__cloudKpi`），方法 25 → 26。
- **回滾**：profit.js 讀寫改回 `_kpi_v1`（舊資料還在 `app/profit`）。
