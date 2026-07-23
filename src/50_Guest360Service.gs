TGI.Guest360Service = (function () {
  var SHEET = 'Guest_360';

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  }

  function writeSection_(sheet, startRow, title, rows, width) {
    sheet.getRange(startRow, 1).setValue(title).setFontWeight('bold');
    if (rows.length) sheet.getRange(startRow + 1, 1, rows.length, width).setValues(rows);
    return startRow + rows.length + 2;
  }

  function rebuild(guestId) {
    TGI.AccessControlService.requirePermission('guest360.view');
    var snapshot = TGI.GuestTimelineService.snapshot(guestId);
    var guest = snapshot.guest;
    var sheet = ensureSheet_();
    sheet.clear();

    sheet.getRange('A1').setValue('TRYHARD JAPAN — GUEST 360').setFontWeight('bold').setFontSize(16);
    sheet.getRange('A2').setValue('Guest ID');
    sheet.getRange('B2').setValue(guest.guest_id);
    sheet.getRange('A3').setValue('Name');
    sheet.getRange('B3').setValue(guest.full_name || [guest.first_name, guest.last_name].filter(Boolean).join(' '));
    sheet.getRange('A4').setValue('Email');
    sheet.getRange('B4').setValue(guest.email || '');
    sheet.getRange('A5').setValue('Phone');
    sheet.getRange('B5').setValue(guest.phone || '');
    sheet.getRange('A6').setValue('Language / Country');
    sheet.getRange('B6').setValue((guest.language || '') + (guest.country ? ' / ' + guest.country : ''));
    sheet.getRange('A7').setValue('Status / Consent');
    sheet.getRange('B7').setValue((guest.status || '') + ' / ' + (guest.marketing_consent || 'UNKNOWN'));
    sheet.getRange('A8').setValue('Visits / Lifetime Value');
    sheet.getRange('B8').setValue(Number(guest.visit_count || 0) + ' / ¥' + Math.round(Number(guest.lifetime_value || 0)).toLocaleString());
    sheet.getRange('A9').setValue('Last Activity');
    sheet.getRange('B9').setValue(snapshot.last_activity_at || '');

    var row = 11;
    var countRows = Object.keys(snapshot.event_counts).sort().map(function (type) { return [type, snapshot.event_counts[type]]; });
    row = writeSection_(sheet, row, 'ACTIVITY SUMMARY', countRows, 2);

    var timelineRows = TGI.GuestTimelineService.timeline(guestId, { limit: 200 }).map(function (event) {
      return [event.occurred_at, event.event_type, event.status, event.summary, event.source_sheet, event.event_id];
    });
    sheet.getRange(row, 1).setValue('TIMELINE').setFontWeight('bold');
    sheet.getRange(row + 1, 1, 1, 6).setValues([['Occurred At', 'Type', 'Status', 'Summary', 'Source', 'Record ID']]).setFontWeight('bold');
    if (timelineRows.length) sheet.getRange(row + 2, 1, timelineRows.length, 6).setValues(timelineRows);

    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 6);
    sheet.setColumnWidth(4, 500);
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 6).setVerticalAlignment('top');
    TGI.AuditLog.write(SHEET, guestId, 'REBUILD', { event_count: snapshot.event_count });
    return snapshot;
  }

  function rebuildFromActiveRow() {
    TGI.AccessControlService.requirePermission('guest360.view');
    var sheet = SpreadsheetApp.getActiveSheet();
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var guestColumn = headers.indexOf('guest_id') + 1;
    TGI.Util.assert(guestColumn > 0, 'Active sheet does not contain a guest_id column.');
    var guestId = sheet.getRange(sheet.getActiveCell().getRow(), guestColumn).getValue();
    TGI.Util.assert(guestId, 'Select a row containing a guest_id.');
    return rebuild(guestId);
  }

  function find(query) {
    TGI.AccessControlService.requirePermission('guest360.view');
    query = String(query || '').trim().toLowerCase();
    if (!query) return [];
    return TGI.SheetRepository.all('Guests').filter(function (guest) {
      return [guest.guest_id, guest.full_name, guest.first_name, guest.last_name, guest.email, guest.phone]
        .join(' ').toLowerCase().indexOf(query) !== -1;
    }).slice(0, 50);
  }

  return { ensureSheet: ensureSheet_, rebuild: rebuild, rebuildFromActiveRow: rebuildFromActiveRow, find: find };
})();