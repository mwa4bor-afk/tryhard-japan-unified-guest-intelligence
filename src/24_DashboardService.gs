TGI.DashboardService = (function () {
  var SUMMARY_SHEET = 'Dashboard';
  var LOCATION_SHEET = 'Location_Performance';
  var LOYALTY_SHEET = 'Loyalty_Segments';

  function rebuild() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var snapshot = TGI.KpiService.snapshot();
    var locations = TGI.KpiService.byLocation();
    var loyalty = TGI.KpiService.loyaltySegments();

    buildSummary_(spreadsheet, snapshot);
    buildLocations_(spreadsheet, locations);
    buildLoyalty_(spreadsheet, loyalty);
    TGI.AuditLog.write('Dashboard', SUMMARY_SHEET, 'REBUILD', {
      generated_at: snapshot.generated_at,
      location_count: locations.length,
      loyalty_segment_count: loyalty.length
    });
    return { snapshot: snapshot, locations: locations, loyalty: loyalty };
  }

  function sheet_(spreadsheet, name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);
    sheet.clear();
    sheet.clearCharts();
    return sheet;
  }

  function buildSummary_(spreadsheet, data) {
    var sheet = sheet_(spreadsheet, SUMMARY_SHEET);
    sheet.getRange('A1:D1').merge().setValue(TGI.APP_NAME + ' — Management Dashboard');
    sheet.getRange('A2:D2').merge().setValue('Generated: ' + data.generated_at);
    var rows = [
      ['Metric','Value','Metric','Value'],
      ['Total guests',data.total_guests,'Total stays',data.total_stays],
      ['Total spend',data.total_spend,'Average spend',data.average_spend],
      ['Average rating',data.average_rating,'NPS',data.nps],
      ['Promoters',data.promoters,'Detractors',data.detractors],
      ['Recovery cases',data.service_recovery_cases,'Recovery rate',data.service_recovery_rate],
      ['Open tasks',data.open_tasks,'Overdue tasks',data.overdue_tasks],
      ['Loyalty members',data.loyalty_members,'Marketing consents',data.active_marketing_consents]
    ];
    sheet.getRange(4,1,rows.length,4).setValues(rows);
    sheet.getRange('A1:D1').setFontWeight('bold').setFontSize(16);
    sheet.getRange('A4:D4').setFontWeight('bold');
    sheet.getRange('B6:B7').setNumberFormat('#,##0.00');
    sheet.getRange('D6:D7').setNumberFormat('#,##0.00');
    sheet.getRange('D9').setNumberFormat('0.0%');
    sheet.setFrozenRows(4);
    sheet.autoResizeColumns(1,4);
  }

  function buildLocations_(spreadsheet, rows) {
    var sheet = sheet_(spreadsheet, LOCATION_SHEET);
    var headers = ['Location','Stays','Spend','Average Spend','Average Rating','NPS','Recovery Cases','Recovery Rate'];
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
    if (rows.length) {
      var values = rows.map(function (r) {
        return [r.location,r.stays,r.spend,r.average_spend,r.average_rating,r.nps,r.recovery_cases,r.recovery_rate];
      });
      sheet.getRange(2,1,values.length,headers.length).setValues(values);
      sheet.getRange(2,3,values.length,4).setNumberFormat('#,##0.00');
      sheet.getRange(2,8,values.length,1).setNumberFormat('0.0%');
      var chart = sheet.newChart().asColumnChart()
        .addRange(sheet.getRange(1,1,values.length + 1,2))
        .setPosition(2,10,0,0)
        .setOption('title','Stays by Location')
        .build();
      sheet.insertChart(chart);
    }
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1,headers.length);
  }

  function buildLoyalty_(spreadsheet, rows) {
    var sheet = sheet_(spreadsheet, LOYALTY_SHEET);
    var headers = ['Tier','Members','Points Balance','Lifetime Points'];
    sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
    if (rows.length) {
      var values = rows.map(function (r) { return [r.tier,r.members,r.points_balance,r.lifetime_points]; });
      sheet.getRange(2,1,values.length,headers.length).setValues(values);
      sheet.getRange(2,2,values.length,3).setNumberFormat('#,##0');
      var chart = sheet.newChart().asPieChart()
        .addRange(sheet.getRange(1,1,values.length + 1,2))
        .setPosition(2,6,0,0)
        .setOption('title','Loyalty Members by Tier')
        .build();
      sheet.insertChart(chart);
    }
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1,headers.length);
  }

  return { rebuild: rebuild };
})();
