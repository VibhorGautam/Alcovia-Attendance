// Google Apps Script - paste this into script.google.com
// Deploy > Web app > Execute as: Me, Access: Anyone

const SHEET_ID = '1DBkoD_R8SvO4tRJ3INsbr3PhNRrDvhicw8bGuRZWay4';
const SHEET_NAME = 'Sheet1';

function doPost(e) {
  try {
    var data;
    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error('No data received');
    }

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

    sheet.appendRow([
      data.date,
      data.day,
      data.name,
      data.email,
      data.time,
      data.status,
      data.ip,
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

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'alive' }))
    .setMimeType(ContentService.MimeType.JSON);
}
