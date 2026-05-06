// Google Apps Script - paste this into script.google.com
// Deploy > Web app > Execute as: Me, Access: Anyone
//
// REQUIRED: enable external requests scope so UrlFetchApp can call ClickUp API
//   1. Project Settings > check "Show appsscript.json manifest file in editor"
//   2. Open appsscript.json and set:
//      {
//        "timeZone": "Asia/Kolkata",
//        "oauthScopes": [
//          "https://www.googleapis.com/auth/spreadsheets",
//          "https://www.googleapis.com/auth/script.external_request"
//        ],
//        "exceptionLogging": "STACKDRIVER",
//        "runtimeVersion": "V8"
//      }
//   3. Save, then re-deploy as a new version
//
// Script Property required before leave submissions work:
//   Project Settings > Script Properties > CLICKUP_API_KEY = pk_xxxxxxxxxx
//   Get your token: https://app.clickup.com/settings/apps

var SHEET_ID = '1DBkoD_R8SvO4tRJ3INsbr3PhNRrDvhicw8bGuRZWay4';
var SHEET_NAME = 'Sheet1';
var CLICKUP_LEAVE_LIST_ID = '901613881946';

function doGet(e) {
  if (!e.parameter || !e.parameter.payload) return alive();
  return routeRequest(e.parameter.payload);
}

function doPost(e) {
  var raw = (e.parameter && e.parameter.payload) ? e.parameter.payload
          : (e.postData && e.postData.contents) ? e.postData.contents
          : null;
  if (!raw) return errResponse('No data');
  return routeRequest(raw);
}

// Route based on action field inside the JSON payload
function routeRequest(raw) {
  try {
    var data = JSON.parse(raw);
    if (data.action === 'leave')          return handleLeave(data);
    if (data.action === 'checkYesterday') return checkYesterday(data);
    return writeAttendance(data);
  } catch (err) {
    return errResponse(err.toString());
  }
}

function writeAttendance(data) {
  try {
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
    return okResponse();
  } catch (err) {
    return errResponse(err.toString());
  }
}

// Returns { hasEntry: true/false } - did this employee check in on the given date?
function checkYesterday(data) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    var rows = sheet.getDataRange().getValues();
    var targetDate = data.date;   // e.g. "2026-05-05"
    var targetEmail = data.email; // match by email (more reliable than name)

    var hasEntry = rows.some(function(row) {
      var rowDate = row[0] instanceof Date
        ? Utilities.formatDate(row[0], 'Asia/Kolkata', 'yyyy-MM-dd')
        : String(row[0]);
      var rowEmail  = String(row[3]);
      var rowStatus = String(row[5]);
      return rowEmail === targetEmail &&
             rowDate  === targetDate  &&
             (rowStatus === 'On Time' || rowStatus === 'Late');
    });

    return ContentService
      .createTextOutput(JSON.stringify({ hasEntry: hasEntry }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return errResponse(err.toString());
  }
}

function handleLeave(data) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('CLICKUP_API_KEY');
    if (!apiKey) return errResponse('CLICKUP_API_KEY not set in Script Properties');

    var startTs    = new Date(data.startDate).getTime();
    var endTs      = new Date(data.endDate).getTime();
    var days       = Math.round((endTs - startTs) / 86400000) + 1;
    var startMonth = new Date(data.startDate).getMonth(); // 0 = January

    var leaveTypeMap = { Sick: 0, Vacation: 1, Personal: 2, Emergency: 3 };
    var leaveTypeIdx = leaveTypeMap[data.leaveType] !== undefined ? leaveTypeMap[data.leaveType] : 0;

    var taskName = 'Form Submission - #' + new Date().toISOString();

    var clickupPayload = {
      name: taskName,
      custom_fields: [
        { id: '9ba4ad87-8f6c-4460-808b-500f482b3b5a', value: 0 },           // Application Status: Pending
        { id: 'e0c1f504-e241-4a14-8c5c-1b2be5f1b46b', value: data.name },   // Employee Name
        { id: 'fb290949-bb8b-40f2-a937-d70049c32ce3', value: endTs },        // End Date
        { id: '0b2a4ada-1bad-4f00-8f2f-1739b1f4e72d', value: leaveTypeIdx }, // Leave Type
        { id: 'b5d98a83-0486-47be-a48f-b32116c10150', value: days },          // Number of Days
        { id: '55b20ccd-9dda-4561-9745-59c186c851b1', value: data.reason },  // Reason
        { id: 'bcca95bc-e5be-40cc-90bf-7c278efeb0eb', value: startTs },      // Start Date
        { id: '1d228785-d2e0-4fbd-921c-0b6cd998a197', value: startMonth }    // Month
      ]
    };

    var resp = UrlFetchApp.fetch(
      'https://api.clickup.com/api/v2/list/' + CLICKUP_LEAVE_LIST_ID + '/task',
      {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: apiKey },
        payload: JSON.stringify(clickupPayload),
        muteHttpExceptions: true
      }
    );

    var code = resp.getResponseCode();
    if (code < 200 || code >= 300) {
      return errResponse('ClickUp API ' + code + ': ' + resp.getContentText());
    }
    return okResponse();
  } catch (err) {
    return errResponse(err.toString());
  }
}

function alive()         { return json({ status: 'alive' }); }
function okResponse()    { return json({ result: 'ok' }); }
function errResponse(m)  { return json({ result: 'error', message: m }); }
function json(obj)       { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// Run this once from the editor to grant UrlFetchApp permission, then delete it
function grantUrlFetchScope() {
  var r = UrlFetchApp.fetch('https://httpbin.org/get');
  Logger.log(r.getContentText());
}
