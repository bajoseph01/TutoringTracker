var STORE_TITLE = 'TutoringTracker Cloud Data';
var STATE_SHEET = 'Cloud State';
var LOG_SHEET = 'Sync Log';
var CHUNK_SIZE = 45000;

function doGet() {
  return HtmlService.createTemplateFromFile('Page')
    .evaluate()
    .setTitle('Tutoring Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getCloudState() {
  var store = getOrCreateStore_();
  var sheet = store.spreadsheet.getSheetByName(STATE_SHEET);
  var revision = Number(sheet.getRange('B2').getValue() || 0);
  var state = readState_(sheet);
  return {
    state: state,
    revision: revision,
    spreadsheetUrl: store.spreadsheet.getUrl()
  };
}

function saveCloudState(state, expectedRevision) {
  validateState_(state);
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var store = getOrCreateStore_();
    var sheet = store.spreadsheet.getSheetByName(STATE_SHEET);
    var currentRevision = Number(sheet.getRange('B2').getValue() || 0);
    if (expectedRevision !== null && Number(expectedRevision) !== currentRevision) {
      throw new Error('Cloud data changed on another device. Refresh before saving again.');
    }

    var json = JSON.stringify(state);
    var chunks = chunk_(json);
    var oldRows = Math.max(sheet.getLastRow() - 1, 1);
    sheet.getRange(2, 1, oldRows, 3).clearContent();
    sheet.getRange(2, 1, 1, 2).setValues([[new Date(), currentRevision + 1]]);
    sheet.getRange(2, 3, chunks.length, 1).setValues(chunks.map(function(value) { return [value]; }));

    var log = store.spreadsheet.getSheetByName(LOG_SHEET);
    log.appendRow([new Date(), currentRevision + 1, chunks.length, state.students.length, state.sessions.length]);
    if (log.getLastRow() > 501) log.deleteRows(2, log.getLastRow() - 501);
    SpreadsheetApp.flush();
    return { revision: currentRevision + 1, updatedAt: new Date().toISOString(), spreadsheetUrl: store.spreadsheet.getUrl() };
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateStore_() {
  var properties = PropertiesService.getScriptProperties();
  var id = properties.getProperty('STORE_SPREADSHEET_ID');
  if (id) {
    try {
      return { spreadsheet: SpreadsheetApp.openById(id) };
    } catch (error) {
      properties.deleteProperty('STORE_SPREADSHEET_ID');
    }
  }

  var spreadsheet = SpreadsheetApp.create(STORE_TITLE);
  var stateSheet = spreadsheet.getSheets()[0];
  stateSheet.setName(STATE_SHEET);
  stateSheet.getRange('A1:C1').setValues([['Updated', 'Revision', 'JSON chunks']]);
  stateSheet.getRange('A2:C2').setValues([[new Date(), 0, JSON.stringify({ students: [], sessions: [], creditTransactions: [] })]]);
  stateSheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  stateSheet.setFrozenRows(1);

  var log = spreadsheet.insertSheet(LOG_SHEET);
  log.getRange('A1:E1').setValues([['Updated', 'Revision', 'Chunks', 'Students', 'Sessions']]);
  log.getRange('A1:E1').setFontWeight('bold').setBackground('#e9e4d9');
  log.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  log.setFrozenRows(1);
  log.setColumnWidth(1, 170);
  log.setColumnWidths(2, 4, 90);
  stateSheet.hideSheet();
  properties.setProperty('STORE_SPREADSHEET_ID', spreadsheet.getId());
  return { spreadsheet: spreadsheet };
}

function readState_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { students: [], sessions: [], creditTransactions: [] };
  var json = sheet.getRange(2, 3, lastRow - 1, 1).getValues().map(function(row) { return row[0]; }).join('');
  return json ? JSON.parse(json) : { students: [], sessions: [], creditTransactions: [] };
}

function chunk_(text) {
  var chunks = [];
  for (var index = 0; index < text.length; index += CHUNK_SIZE) chunks.push(text.slice(index, index + CHUNK_SIZE));
  return chunks.length ? chunks : ['{}'];
}

function validateState_(state) {
  if (!state || !Array.isArray(state.students) || !Array.isArray(state.sessions) || !Array.isArray(state.creditTransactions)) {
    throw new Error('Invalid TutoringTracker data.');
  }
  if (JSON.stringify(state).length > 5000000) throw new Error('Tracker data is too large to sync safely.');
}
