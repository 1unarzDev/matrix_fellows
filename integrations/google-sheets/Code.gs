/** Paste into Extensions → Apps Script in the private organizer spreadsheet. */
const MATRIX_SHEET_ID = '1zOpBa4Z3RACdbAthXltReQa8bdWU2yRPHZiqqQlWkk4';
const MATRIX_TAB = 'Matrix Fellows responses';
const MATRIX_HEADERS = ['Response ID', 'Submitted (UTC)', 'Name', 'Email', 'Grade level', 'Interests', 'Goals', 'Experience', 'Consent version', 'Feedback & ideas'];

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
      sheet.getRange(1, 1, 1, MATRIX_HEADERS.length).setBackground('#18222d').setFontColor('#d6d1ef').setFontWeight('bold');
      sheet.setColumnWidths(1, MATRIX_HEADERS.length, 180);
    }
    const headers = sheet.getRange(1, 1, 1, MATRIX_HEADERS.length).getValues()[0];
    // Upgrade the original nine-column sheet without moving any existing data.
    if (headers.slice(0, 9).join('|') === MATRIX_HEADERS.slice(0, 9).join('|') && headers[9] === '' && sheet.getLastColumn() === 9) {
      sheet.getRange(1, 10).setValue(MATRIX_HEADERS[9]).setBackground('#18222d').setFontColor('#d6d1ef').setFontWeight('bold');
      sheet.setColumnWidth(10, 320);
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
        item.id, item.created_at, item.name, item.email, item.grade, item.interests.join(' · '), item.goals.join(' · '), item.stage, item.consent_version, item.note || '',
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
    PropertiesService.getScriptProperties().setProperty('MATRIX_LAST_SUCCESS', new Date().toISOString());
  } finally { lock.releaseLock(); }
}

function matrixSafeText(value) {
  const text = String(value == null ? '' : value);
  return /^\s*[=+@-]/.test(text) ? "'" + text : text;
}
