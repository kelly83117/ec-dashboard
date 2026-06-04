/* =============================================================
 *  YC 元創 · 雲端同步腳本（已停用版本）
 *
 *  ⛔ 此版本已停用「自動同步 Sheet → Dashboard」功能。
 *     行銷團隊現在直接在 dashboard 填營收，不再從 Sheet 推送。
 *
 *  ➜ 第一次貼上：執行 disableSync() 一次，會清掉所有觸發條件
 *  ➜ 如未來想恢復：把舊的同步邏輯加回去並執行 installTrigger()
 * ============================================================= */

/**
 * 一鍵停用所有同步觸發條件。
 * 第一次貼這份程式碼後，請執行此函式一次。
 */
function disableSync() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  for (const t of triggers) {
    ScriptApp.deleteTrigger(t);
    removed++;
  }
  Logger.log('✅ 已刪除 ' + removed + ' 個觸發條件，Sheet 不會再自動同步到 Dashboard。');
  Logger.log('行銷團隊請直接在 https://kelly83117.github.io/ec-dashboard/ 填寫每日營收。');
}

/**
 * 保留空函式避免舊觸發條件殘留呼叫時報錯。
 * 即使有殘留的 onEditSync 觸發條件，這支函式什麼都不做。
 */
function onEditSync(e) {
  // 已停用：不做任何事
  return;
}

/**
 * 保留空函式避免舊觸發條件殘留呼叫時報錯。
 */
function syncRevenueToDashboard() {
  // 已停用：不做任何事
  Logger.log('⚠️ 同步功能已停用。若要恢復，請改用舊版程式碼並重新執行 installTrigger()。');
  return;
}

/**
 * 保留：列出目前還有哪些觸發條件（方便檢查）
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) {
    Logger.log('目前沒有任何觸發條件 ✅');
    return;
  }
  Logger.log('目前的觸發條件：');
  for (const t of triggers) {
    Logger.log(' - 函式: ' + t.getHandlerFunction() + ' / 事件: ' + t.getEventType());
  }
}
