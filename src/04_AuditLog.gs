TGI.AuditLog = (function () {
  function write(entityType, entityId, action, details) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss && ss.getSheetByName('AuditLog');
    if (!sheet) return;

    var actor = '';
    try {
      actor = Session.getActiveUser().getEmail() || '';
    } catch (error) {
      actor = '';
    }

    sheet.appendRow([
      TGI.Util.uuid(),
      entityType,
      entityId,
      action,
      actor,
      JSON.stringify(details || {}),
      TGI.Util.nowIso()
    ]);
  }

  return { write: write };
})();