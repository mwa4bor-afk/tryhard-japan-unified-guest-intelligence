TGI.BusinessContinuityService = (function () {
  var SHEET = 'Continuity_Records';
  var HEADERS = ['record_id','record_type','status','started_at','completed_at','initiated_by','rpo_minutes','rto_minutes','backup_reference','recovery_reference','notes'];

  function sheet_() {
    var ss = SpreadsheetApp.getActive();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function append_(row) {
    sheet_().appendRow(HEADERS.map(function (key) { return row[key] === undefined ? '' : row[key]; }));
    return row;
  }

  function initialize() {
    TGI.AccessControlService.requirePermission('continuity.manage');
    sheet_();
    return { sheet: SHEET, initialized: true };
  }

  function createRecoveryPoint(input) {
    TGI.AccessControlService.requirePermission('continuity.run');
    input = input || {};
    var id = Utilities.getUuid();
    var now = new Date();
    var row = {
      record_id: id,
      record_type: 'RECOVERY_POINT',
      status: 'AVAILABLE',
      started_at: now,
      completed_at: now,
      initiated_by: TGI.AccessControlService.currentEmail(),
      rpo_minutes: Number(input.rpoMinutes || 0),
      rto_minutes: Number(input.rtoMinutes || 0),
      backup_reference: String(input.backupReference || ''),
      recovery_reference: '',
      notes: String(input.notes || '')
    };
    append_(row);
    TGI.AuditLog.write('RECOVERY_POINT_CREATED', 'BusinessContinuity', id, row);
    return row;
  }

  function beginRecoveryDrill(input) {
    TGI.AccessControlService.requirePermission('continuity.run');
    input = input || {};
    var row = {
      record_id: Utilities.getUuid(),
      record_type: 'RECOVERY_DRILL',
      status: 'IN_PROGRESS',
      started_at: new Date(),
      completed_at: '',
      initiated_by: TGI.AccessControlService.currentEmail(),
      rpo_minutes: Number(input.rpoMinutes || 0),
      rto_minutes: Number(input.rtoMinutes || 0),
      backup_reference: String(input.backupReference || ''),
      recovery_reference: '',
      notes: String(input.notes || '')
    };
    append_(row);
    TGI.AuditLog.write('RECOVERY_DRILL_STARTED', 'BusinessContinuity', row.record_id, row);
    return row;
  }

  function completeRecoveryDrill(recordId, input) {
    TGI.AccessControlService.requirePermission('continuity.manage');
    input = input || {};
    var sheet = sheet_();
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(recordId)) {
        sheet.getRange(i + 1, 3).setValue(input.success === false ? 'FAILED' : 'PASSED');
        sheet.getRange(i + 1, 5).setValue(new Date());
        sheet.getRange(i + 1, 10).setValue(String(input.recoveryReference || ''));
        sheet.getRange(i + 1, 11).setValue(String(input.notes || ''));
        TGI.AuditLog.write('RECOVERY_DRILL_COMPLETED', 'BusinessContinuity', recordId, input);
        if (TGI.DomainEventService && TGI.DomainEventService.publish) {
          TGI.DomainEventService.publish('platform.recovery.drill_completed', { recordId: recordId, success: input.success !== false });
        }
        return { recordId: recordId, status: input.success === false ? 'FAILED' : 'PASSED' };
      }
    }
    throw new Error('Continuity record not found: ' + recordId);
  }

  function summary() {
    TGI.AccessControlService.requirePermission('continuity.view');
    var values = sheet_().getDataRange().getValues();
    var counts = {};
    for (var i = 1; i < values.length; i++) counts[values[i][2]] = (counts[values[i][2]] || 0) + 1;
    return { total: Math.max(values.length - 1, 0), byStatus: counts };
  }

  return { initialize: initialize, createRecoveryPoint: createRecoveryPoint, beginRecoveryDrill: beginRecoveryDrill, completeRecoveryDrill: completeRecoveryDrill, summary: summary };
})();