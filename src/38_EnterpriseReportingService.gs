TGI.EnterpriseReportingService = (function () {
  var SHEET = 'Executive_Dashboard';

  function aggregateBy_(rows, field, valueField) {
    var result={};
    rows.forEach(function(row){
      var key=String(row[field]||'UNASSIGNED');
      if(!result[key]) result[key]={count:0,total:0};
      result[key].count+=1; result[key].total+=Number(row[valueField]||0);
    });
    return result;
  }

  function rebuild() {
    TGI.AccessControlService.requirePermission('VIEW_REPORTS');
    var ss=SpreadsheetApp.getActiveSpreadsheet();
    var sheet=ss.getSheetByName(SHEET)||ss.insertSheet(SHEET);
    sheet.clear();
    var reservations=TGI.ReservationImportService.all();
    var locations=TGI.LocationService.all();
    var staff=TGI.StaffService.all();
    var locationMap={}; locations.forEach(function(l){locationMap[l.location_id]=l.name;});
    var byLocation=aggregateBy_(reservations,'location_id','total_value');
    var rows=[['TRYHARD JAPAN EXECUTIVE OPERATIONS DASHBOARD',''],['Generated',new Date()],['Active locations',TGI.LocationService.active().length],['Active staff',staff.filter(function(s){return s.status==='ACTIVE';}).length],['Reservations',reservations.length],['Reservation value',reservations.reduce(function(sum,r){return sum+Number(r.total_value||0);},0)],['',''],['LOCATION','RESERVATIONS','VALUE']];
    Object.keys(byLocation).sort().forEach(function(id){rows.push([locationMap[id]||id,byLocation[id].count,byLocation[id].total]);});
    sheet.getRange(1,1,rows.length,3).setValues(rows.map(function(r){return [r[0]||'',r[1]===undefined?'':r[1],r[2]===undefined?'':r[2]];}));
    sheet.setFrozenRows(1); sheet.autoResizeColumns(1,3);
    TGI.AuditLog.write(SHEET,'EXECUTIVE','REBUILD',{reservations:reservations.length,locations:locations.length,staff:staff.length});
    return {reservations:reservations.length,locations:locations.length,staff:staff.length,location_summary:byLocation};
  }

  return { rebuild: rebuild };
})();