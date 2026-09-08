/** Paste into Extensions → Apps Script in the private organizer spreadsheet. */
const MATRIX_SHEET_ID = '1zOpBa4Z3RACdbAthXltReQa8bdWU2yRPHZiqqQlWkk4';
const MATRIX_TAB = 'Matrix Fellows responses';
const MATRIX_HEADERS = ['Response ID', 'Submitted (Central)', 'Name', 'Email', 'Grade level', 'Interests', 'Goals', 'Experience', 'Consent version', 'Feedback & ideas'];

function installMatrixSync() {
  if (!PropertiesService.getScriptProperties().getProperty('MATRIX_SYNC_TOKEN')) {
    throw new Error('Set MATRIX_SYNC_TOKEN in Project Settings → Script properties first.');
  }
  syncMatrixResponses();
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncMatrixResponses') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('syncMatrixResponses').timeBased().everyMinutes(15).create();
}

function syncMatrixResponses() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const token = PropertiesService.getScriptProperties().getProperty('MATRIX_SYNC_TOKEN');
    if (!token) throw new Error('Missing MATRIX_SYNC_TOKEN.');
    const spreadsheet = SpreadsheetApp.openById(MATRIX_SHEET_ID);
    const sheet = spreadsheet.getSheetByName(MATRIX_TAB) || spreadsheet.insertSheet(MATRIX_TAB);
    if (!sheet.getLastRow()) {
      sheet.getRange(1, 1, 1, MATRIX_HEADERS.length).setValues([MATRIX_HEADERS]);
      sheet.setFrozenRows(1);
    }
    const headers = sheet.getRange(1, 1, 1, MATRIX_HEADERS.length).getValues()[0];
    if (headers[1] === 'Submitted (UTC)') headers[1] = MATRIX_HEADERS[1];
    // Upgrade the original nine-column sheet without moving any existing data.
    if (headers.slice(0, 9).join('|') === MATRIX_HEADERS.slice(0, 9).join('|') && headers[9] === '' && sheet.getLastColumn() === 9) {
      sheet.getRange(1, 10).setValue(MATRIX_HEADERS[9]);
      headers[9] = MATRIX_HEADERS[9];
    }
    if (headers.join('|') !== MATRIX_HEADERS.join('|')) throw new Error('Response tab headers changed. Restore the original columns before syncing.');
    const existing = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, MATRIX_HEADERS.length).getValues() : [];
    const seen = new Set(existing.map(row => String(row[0])));
    const missingFeedback = new Map(existing.flatMap((row, index) => row[9] === '' ? [[String(row[0]), index + 2]] : []));
    // Scan from zero each run: sequence IDs can commit out of order. Dedup by ID
    // makes retries safe, including failures after Sheets writes a batch.
    let cursor = 0;
    const started = Date.now();
    while (true) {
      const response = UrlFetchApp.fetch('https://matrixfellows.com/api/join-sheet?after=' + cursor, {
        headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
      });
      if (response.getResponseCode() !== 200) throw new Error('Matrix sync failed (HTTP ' + response.getResponseCode() + '). Check the token or try again later.');
      const payload = JSON.parse(response.getContentText());
      if (!Array.isArray(payload.responses)) throw new Error('Unexpected response format.');
      // Backfill feedback captured while an older version of this script ran.
      // Never overwrite an organizer's existing feedback cell.
      payload.responses.forEach(item => {
        const row = missingFeedback.get(String(item.id));
        if (row && item.note) {
          sheet.getRange(row, 10).setNumberFormat('@').setValue(matrixSafeText(item.note)).setWrap(true);
          missingFeedback.delete(String(item.id));
        }
      });
      const rows = payload.responses.filter(item => !seen.has(String(item.id))).map(item => [
        item.id, matrixCentralTime(item.created_at), item.name, item.email, item.grade, item.interests.join(' · '), item.goals.join(' · '), item.stage, item.consent_version, item.note || '',
      ].map(matrixSafeText));
      if (rows.length) {
        const range = sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, MATRIX_HEADERS.length);
        range.setNumberFormat('@').setValues(rows).setVerticalAlignment('top').setWrap(true);
        SpreadsheetApp.flush();
      }
      payload.responses.forEach(item => seen.add(String(item.id)));
      if (!payload.hasMore) break;
      if (payload.nextCursor <= cursor) throw new Error('Sync cursor did not advance.');
      cursor = payload.nextCursor;
      if (Date.now() - started > 240000) throw new Error('Sync exceeded four minutes. Existing rows are safe. Contact the site maintainer to increase sync capacity.');
    }
    matrixApplyLightTheme(sheet);
    PropertiesService.getScriptProperties().setProperty('MATRIX_LAST_SUCCESS', new Date().toISOString());
  } finally { lock.releaseLock(); }
}

/** Run once after replacing this script to restyle an existing response tab.
 *  No sync token is required. Converts ISO timestamps to Central display text;
 *  other response values and filters are preserved.
 */
function styleMatrixResponses() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('A sync is running. Try styling again shortly.');
  try {
    const sheet = SpreadsheetApp.openById(MATRIX_SHEET_ID).getSheetByName(MATRIX_TAB);
    if (!sheet || !sheet.getLastRow()) throw new Error('Run installMatrixSync first to create the response tab.');
    matrixApplyLightTheme(sheet);
  } finally { lock.releaseLock(); }
}

function matrixApplyLightTheme(sheet) {
  // Accept the original nine-column sheet as well as the feedback extension.
  const headers = sheet.getRange(1, 1, 1, MATRIX_HEADERS.length).getValues()[0];
  if (headers[1] === 'Submitted (UTC)') headers[1] = MATRIX_HEADERS[1];
  const columns = headers[9] === '' ? 9 : MATRIX_HEADERS.length;
  if (headers.slice(0, columns).join('|') !== MATRIX_HEADERS.slice(0, columns).join('|')) {
    throw new Error('Response tab headers changed. Restore the original columns before styling.');
  }
  const lastRow = sheet.getLastRow();
  sheet.getRange(1, 2).setValue(MATRIX_HEADERS[1]);
  // Keep deduplication/audit metadata intact, but out of the organizer's view.
  sheet.hideColumns(1);
  sheet.hideColumns(9);
  const palette = { ink: '#354155', muted: '#68778d', header: '#e8edf7', alternate: '#f5f7fb', line: '#d4deed', accent: '#46678b' };
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(1);
  sheet.setTabColor('#aebfdb');
  sheet.getRange(1, 1, lastRow, columns)
    .setFontFamily('Arial').setFontSize(10).setFontWeight('normal')
    .setFontColor(palette.ink).setVerticalAlignment('top').setHorizontalAlignment('left').setWrap(true);
  const widths = [100, 190, 180, 240, 140, 260, 260, 230, 130, 340];
  widths.slice(0, columns).forEach((width, index) => sheet.setColumnWidth(index + 1, width));
  if (lastRow > 1) {
    const count = lastRow - 1;
    const timestamps = sheet.getRange(2, 2, count, 1).getValues();
    const central = timestamps.map(([value]) => [matrixCentralTime(value)]);
    if (central.some((row, index) => row[0] !== timestamps[index][0])) {
      sheet.getRange(2, 2, count, 1).setNumberFormat('@').setValues(central);
    }
    const backgrounds = Array.from({ length: count }, (_, index) => Array(columns).fill(index % 2 ? palette.alternate : '#ffffff'));
    sheet.getRange(2, 1, count, columns).setBackgrounds(backgrounds);
    // Non-forced heights allow wrapped feedback to expand naturally.
    sheet.setRowHeights(2, count, 40);
    sheet.getRange(2, 1, count, 2).setFontColor(palette.muted).setFontSize(9);
    sheet.getRange(2, 3, count, 1).setFontWeight('bold');
    sheet.getRange(2, 4, count, 1).setFontColor(palette.accent);
    sheet.getRange(2, 9, count, 1).setFontColor(palette.muted).setFontSize(9);
  }
  sheet.getRange(1, 1, 1, columns)
    .setBackground(palette.header).setFontColor('#344660').setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setBorder(null, null, true, null, null, null, palette.line, SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(1, 44);
}

function matrixCentralTime(value) {
  // Leave already-formatted values and organizer edits alone.
  if (!(value instanceof Date) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(value))) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return value;
  return Utilities.formatDate(date, 'America/Chicago', 'MMM d, yyyy · h:mm a z');
}

function matrixSafeText(value) {
  const text = String(value == null ? '' : value);
  return /^\s*[=+@-]/.test(text) ? "'" + text : text;
}
