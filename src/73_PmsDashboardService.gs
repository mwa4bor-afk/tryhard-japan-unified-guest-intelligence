TGI.PmsDashboardService = (function () {
  var SHEET = 'PMS_Dashboard';

  function rebuild() {
    TGI.AccessControlService.requirePermission('pms.view');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var out = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    out.clear();
    out.getRange('A1:B1').setValues([['PMS Synchronization Dashboard','Generated']]);
    out.getRange('A2:B2').setValues([['Generated at',new Date()]]);
    var sync = ss.getSheetByName('PMS_Sync_State');
    var quarantine = ss.getSheetByName('PMS_Quarantine');
    var summary = { connections:0, completed:0, with_errors:0, failed_records:0, open_quarantine:0 };
    if (sync && sync.getLastRow() > 1) {
      var values = sync.getRange(2,1,sync.getLastRow()-1,10).getValues();
      summary.connections = values.length;
      values.forEach(function(r){ if (r[5] === 'COMPLETED') summary.completed++; if (r[5] === 'COMPLETED_WITH_ERRORS') summary.with_errors++; summary.failed_records += Number(r[8] || 0); });
      out.getRange(5,1,1,10).setValues([['Provider','Property','Cursor','Last Started','Last Completed','Status','Received','Imported','Failed','Last Error']]);
      out.getRange(6,1,values.length,10).setValues(values);
    }
    if (quarantine && quarantine.getLastRow() > 1) {
      quarantine.getRange(2,1,quarantine.getLastRow()-1,9).getValues().forEach(function(r){ if (r[7] === 'OPEN') summary.open_quarantine++; });
    }
    out.getRange('D1:E6').setValues([
      ['Metric','Value'],['Connections',summary.connections],['Completed',summary.completed],['Completed with errors',summary.with_errors],['Failed records',summary.failed_records],['Open quarantine',summary.open_quarantine]
    ]);
    out.setFrozenRows(1);
    out.autoResizeColumns(1,10);
    TGI.AuditLog.write('PMS_DASHBOARD_REBUILT','PMSDashboard',SHEET,summary);
    return summary;
  }

  return { rebuild: rebuild };
})();