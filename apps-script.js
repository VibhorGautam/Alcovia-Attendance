// Google Apps Script - paste this into script.google.com
// Deploy > Web app > Execute as: Me, Access: Anyone

var SHEET_ID = '1DBkoD_R8SvO4tRJ3INsbr3PhNRrDvhicw8bGuRZWay4';
var SHEET_NAME = 'Sheet1';

function doGet(e) {
  if (e.parameter && e.parameter.payload) {
    return writeRow(e.parameter.payload);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'alive' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (e.parameter && e.parameter.payload) {
    return writeRow(e.parameter.payload);
  }
  if (e.postData && e.postData.contents) {
    return writeRow(e.postData.contents);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'error', message: 'No data' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeRow(raw) {
  try {
    var data = JSON.parse(raw);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    sheet.appendRow([
      data.date,
      data.day,
      data.name,
      data.email,
      data.time,
      data.status,
      data.reason || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
