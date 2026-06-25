$ErrorActionPreference = 'Stop'
Set-Location 'D:\Windows\Desktop\claude\ec-dashboard'
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$lines = [System.IO.File]::ReadAllLines('js\app.js', $utf8NoBom)

$pageMap = [ordered]@{}
$pageMap['modal']     = @('openModal','closeModal','closeModalOnBackdrop')
$pageMap['dashboard'] = @('viewDashboard','dailyLineChartHtml','bindLineChartTooltip','fmtTick','revenueEntrySectionHtml','bindDashboardPills','openMonthlyDetailModal','restorePlatformsBackup','bindCardInputs','bindRevenueEntry','openPlatformModal')
$pageMap['marketing'] = @('renderInsightTabHtml','parseInsightExcel','parseInsightMasterExcel','parseInsightPerfExcel','migrateInsightDataIfNeeded','bindInsightTab','openInsightSettingsModal','_updateDailyProgressFromAdjustments','openInsightNoteModal','exportInsightExcel')
$pageMap['employees'] = @('viewEmployees','bindFilterBar','openScoreModal')
$pageMap['daily']     = @('renderWeeklyCalendarTab','openBossLineConfigModal','openBossTaskHistoryModal','openBossTaskModal','bindWeeklyCalendar','bindDailyProgress','openDailyTaskModal','deleteDailyTask','openQuickTodoModal')
$pageMap['offices']   = @('bindOfficeTabs','_designKpiState','_workingDaysInMonth','_workingDayIndexToday','_calcDesignKpi','renderDesignKpiTab','bindDesignKpi','_openDesignKpiInfoModal','viewOffice')
$pageMap['users']     = @('viewUsers','openUserModal','deleteUser','openChangePasswordModal')

$appStart = -1; $appEnd = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '^const App = \{') { $appStart = $i }
  elseif ($appStart -ne -1 -and $lines[$i] -match '^\};') { $appEnd = $i; break }
}
Write-Host "App object range: line $($appStart+1) .. $($appEnd+1)"

function Find-Range($lines, $appStart, $appEnd, $methodName) {
  for ($i = $appStart + 1; $i -lt $appEnd; $i++) {
    if ($lines[$i] -match "^  ${methodName}\s*\(") {
      $depth = 0
      $started = $false
      $j = $i
      while ($j -le $appEnd) {
        $opens = ([regex]::Matches($lines[$j], '\{')).Count
        $closes = ([regex]::Matches($lines[$j], '\}')).Count
        $depth += $opens - $closes
        if (-not $started -and $opens -gt 0) { $started = $true }
        if ($started -and $depth -eq 0) {
          return @{ start = $i; end = $j }
        }
        $j++
      }
    }
  }
  return $null
}

$pageToolsImports = @{}
$pageToolsImports['modal']     = ''
$pageToolsImports['dashboard'] = 'Store, escapeHtml, showToast, fmtNTD, toDateStr, addDays, eachDay, sumDaily, getRangeDates, migratePlatforms, PLATFORMS, PLATFORMS_WITH_AD_SPEND, PLATFORM_MARKETPLACE, MARKETPLACE_BADGE, PLATFORM_GROUPS, marketplaceBadgeHtml'
$pageToolsImports['marketing'] = 'Store, escapeHtml, showToast, toDateStr, addDays, todayStr'
$pageToolsImports['employees'] = 'Store, escapeHtml, computeScore, getQuarterScore, getUserDeptLabel, trendFromQuarters, DEPT_COLORS'
$pageToolsImports['daily']     = 'Store, escapeHtml, showToast, toDateStr, addDays, todayStr, genId, DAILY_TASK_STATUS, DAILY_TASK_STATUS_LIST, TASK_CATEGORIES, TASK_CATEGORY_NAMES, TASK_CATEGORY_ALIASES, getCategoryMeta, getCategoryItems'
$pageToolsImports['offices']   = 'Store, escapeHtml, showToast, toDateStr, addDays, OFFICE_CONFIG, OFFICE_FEATURES, hasOfficeFeature, canAccessOffice, getUserDepts, computeScore, getQuarterScore'
$pageToolsImports['users']     = 'Store, escapeHtml, showToast, hashPassword, computeScore, OFFICE_CONFIG, OFFICE_FEATURES'

$linesToRemove = New-Object 'System.Collections.Generic.HashSet[int]'

foreach ($entry in $pageMap.GetEnumerator()) {
  $pageName = $entry.Key
  $methods = $entry.Value
  $pageFile = "js\pages\${pageName}.js"
  $blocks = New-Object System.Collections.ArrayList
  $foundCount = 0
  foreach ($m in $methods) {
    $range = Find-Range $lines $appStart $appEnd $m
    if ($range -eq $null) { Write-Host "  [!] method not found: $m"; continue }
    $methodLines = ($lines[$range.start..$range.end] -join "`n")
    [void]$blocks.Add($methodLines)
    for ($k = $range.start; $k -le $range.end; $k++) { [void]$linesToRemove.Add($k) }
    $foundCount++
  }
  $tools = $pageToolsImports[$pageName]
  $toolsImport = ''
  if ($tools) { $toolsImport = "const { $tools } = window;" }
  $header = "/* js/pages/${pageName}.js -- methods extracted from original App, merged back via Object.assign(App, ...) */"
  $body = "$header`nconst App = window.App;`n$toolsImport`n`nObject.assign(App, {`n$($blocks -join ",`n")`n});`n"
  [System.IO.File]::WriteAllText($pageFile, $body, $utf8NoBom)
  Write-Host "  + $pageFile  ($foundCount methods)"
}

$newLines = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $lines.Length; $i++) {
  if (-not $linesToRemove.Contains($i)) {
    [void]$newLines.Add($lines[$i])
  }
}
Write-Host "`napp.js: $($lines.Length) -> $($newLines.Count) lines  (removed $($lines.Length - $newLines.Count))"
[System.IO.File]::WriteAllText('js\app.js', ($newLines -join "`n"), $utf8NoBom)
Write-Host "OK: js/app.js rewritten"
