TGI.CaseDashboardService = (function () {
  var SHEET = 'Case_Dashboard';

  function rebuild() {
    TGI.AccessControlService.requirePermission('cases.view');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    sheet.clear();
    var cases = TGI.GuestCaseService.all();
    var open = TGI.GuestCaseService.openCases();
    var evaluations = TGI.CaseSlaService.scan();
    var overdue = evaluations.filter(function (item) { return item.overdue; });
    var responseBreaches = evaluations.filter(function (item) { return item.first_response_breached; });
    var byPriority = {};
    var byOwner = {};
    open.forEach(function (record) {
      byPriority[record.priority] = (byPriority[record.priority] || 0) + 1;
      var owner = record.owner_email || 'UNASSIGNED';
      byOwner[owner] = (byOwner[owner] || 0) + 1;
    });
    var rows = [
      ['TRYHARD GUEST CASE OPERATIONS DASHBOARD','',''],
      ['Generated',new Date(),''],
      ['Total cases',cases.length,''],
      ['Open cases',open.length,''],
      ['Overdue cases',overdue.length,''],
      ['First-response breaches',responseBreaches.length,''],
      ['Escalated open cases',open.filter(function (record) { return Number(record.escalation_level || 0) > 0; }).length,''],
      ['','',''],
      ['OPEN CASES BY PRIORITY','COUNT','']
    ];
    Object.keys(byPriority).sort().forEach(function (key) { rows.push([key,byPriority[key],'']); });
    rows.push(['','',''],['OPEN CASES BY OWNER','COUNT','']);
    Object.keys(byOwner).sort().forEach(function (key) { rows.push([key,byOwner[key],'']); });
    rows.push(['','',''],['BREACHED CASES','PRIORITY','DUE']);
    overdue.sort(function (a,b) { return new Date(a.case.due_at) - new Date(b.case.due_at); }).slice(0,50).forEach(function (item) {
      rows.push([item.case.case_id + ' — ' + item.case.subject,item.case.priority,item.case.due_at]);
    });
    sheet.getRange(1,1,rows.length,3).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1,3);
    TGI.AuditLog.write(SHEET,'CASE_DASHBOARD','REBUILD',{total:cases.length,open:open.length,overdue:overdue.length,response_breaches:responseBreaches.length});
    return { total: cases.length, open: open.length, overdue: overdue.length, first_response_breaches: responseBreaches.length, by_priority: byPriority, by_owner: byOwner };
  }

  return { rebuild: rebuild };
})();