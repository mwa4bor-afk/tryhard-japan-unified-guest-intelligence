TGI.BackupService = (function () {
  function createSnapshot() {
    TGI.AccessControlService.requirePermission('exports.create');
    var source = SpreadsheetApp.getActiveSpreadsheet();
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    var backup = SpreadsheetApp.create(source.getName() + '_BACKUP_' + stamp);
    var defaultSheet = backup.getSheets()[0];

    source.getSheets().forEach(function (sheet) {
      var target = backup.insertSheet(sheet.getName().substring(0, 99));
      var range = sheet.getDataRange();
      if (range.getNumRows() && range.getNumColumns()) {
        target.getRange(1, 1, range.getNumRows(), range.getNumColumns()).setValues(range.getValues());
        target.setFrozenRows(sheet.getFrozenRows());
      }
    });
    backup.deleteSheet(defaultSheet);
    TGI.AuditLog.write('BACKUP_CREATED', 'Spreadsheet', backup.getId(), { source_id: source.getId(), url: backup.getUrl() });
    return { id: backup.getId(), name: backup.getName(), url: backup.getUrl(), created_at: new Date() };
  }

  function exportGuest(guestId) {
    TGI.AccessControlService.requirePermission('exports.create');
    var payload = { generated_at: new Date(), guest: TGI.SheetRepository.findByPrimaryKey('Guests', guestId), related: {} };
    if (!payload.guest) throw new Error('Guest not found: ' + guestId);
    ['Stays', 'Preferences', 'Loyalty', 'ContactLog', 'Tasks', 'AI_Insights'].forEach(function (sheetName) {
      payload.related[sheetName] = TGI.SheetRepository.findBy(sheetName, 'guest_id', guestId);
    });
    TGI.AuditLog.write('GUEST_EXPORT_CREATED', 'Guest', guestId, { actor: TGI.AccessControlService.currentEmail() });
    return JSON.stringify(payload, null, 2);
  }

  return { createSnapshot: createSnapshot, exportGuest: exportGuest };
})();
