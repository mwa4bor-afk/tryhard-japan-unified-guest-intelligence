TGI.AdminConsoleService = (function () {
  var SHEET_NAME = 'Admin_Console';

  function rebuild() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    sheet.clear();

    var kpi = TGI.KpiService.snapshot();
    var integrity = TGI.DataIntegrityService.validate();
    var privacy = TGI.PrivacyService.review();
    var roles = TGI.AccessControlService.summary();
    var automations = TGI.AutomationService.list();
    var forms = TGI.FormBuilder.getRegistry();

    var rows = [
      ['TryHard Japan CRM Administration', ''],
      ['Generated', new Date()],
      ['Current user', TGI.AccessControlService.currentEmail()],
      ['Current role', TGI.AccessControlService.roleFor()],
      ['', ''],
      ['System status', integrity.valid ? 'HEALTHY' : 'ATTENTION REQUIRED'],
      ['Registered forms', Object.keys(forms).length],
      ['Scheduled automations', automations.length],
      ['Active guests', kpi.total_guests],
      ['Open tasks', kpi.open_tasks],
      ['Overdue tasks', kpi.overdue_tasks],
      ['Retention review candidates', privacy.candidates.length],
      ['', ''],
      ['Authorized users', roles.length]
    ];

    roles.forEach(function (entry) { rows.push([entry.email, entry.role]); });
    sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    sheet.getRange('A1:B1').merge().setFontWeight('bold').setFontSize(16);
    sheet.autoResizeColumns(1, 2);
    sheet.setFrozenRows(1);
    TGI.AuditLog.write('ADMIN_CONSOLE_REBUILT', 'Spreadsheet', ss.getId(), { actor: TGI.AccessControlService.currentEmail() });
    return { sheet: SHEET_NAME, integrity: integrity, privacy_candidates: privacy.candidates.length, roles: roles };
  }

  return { rebuild: rebuild };
})();
