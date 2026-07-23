TGI.ReservationImportService = (function () {
  var SHEET = 'Reservations';
  var LOG_SHEET = 'Import_Log';
  var HEADERS = ['reservation_id','external_id','guest_id','location_id','guest_name','email','phone','arrival_date','departure_date','party_size','status','source','total_value','currency','imported_at'];
  var LOG_HEADERS = ['import_id','started_at','completed_at','source','rows_received','rows_created','rows_skipped','rows_failed','errors'];

  function ensure_(name, headers) {
    var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName(name)||ss.insertSheet(name);
    if(sheet.getLastRow()===0) sheet.getRange(1,1,1,headers.length).setValues([headers]); return sheet;
  }
  function records_() {
    var sheet=ensure_(SHEET,HEADERS); if(sheet.getLastRow()<2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS.length).getValues().map(function(row){var r={};HEADERS.forEach(function(h,i){r[h]=row[i];});return r;});
  }
  function normalize_(row, mapping, source) {
    function value(key) { var column=mapping[key]||key; return row[column]===undefined?'':row[column]; }
    return {
      reservation_id: TGI.Util.id('RES'), external_id: String(value('external_id')||''), location_id: String(value('location_id')||''),
      guest_name: String(value('guest_name')||''), email: String(value('email')||'').trim().toLowerCase(), phone: String(value('phone')||'').trim(),
      arrival_date: value('arrival_date'), departure_date: value('departure_date'), party_size: Number(value('party_size')||1),
      status: String(value('status')||'CONFIRMED').toUpperCase(), source: source||'CSV', total_value: Number(value('total_value')||0),
      currency: String(value('currency')||'JPY'), imported_at: new Date()
    };
  }
  function guest_(reservation) {
    var matches=[];
    if(reservation.email) matches=TGI.GuestRepository.findByEmail ? TGI.GuestRepository.findByEmail(reservation.email) : [];
    if(matches && matches.length) return matches[0];
    var parts=reservation.guest_name.split(/\s+/), first=parts.shift()||'Guest', last=parts.join(' ');
    return TGI.GuestRepository.save({first_name:first,last_name:last,email:reservation.email,phone:reservation.phone,source:'RESERVATION_IMPORT',notes:'Created from reservation import.'});
  }
  function importRows(rows, options) {
    TGI.AccessControlService.requirePermission('MANAGE_OPERATIONS');
    options=options||{}; var mapping=options.mapping||{}, source=options.source||'CSV', existing=records_(), seen={};
    existing.forEach(function(r){if(r.external_id)seen[source+'|'+r.external_id]=true;});
    var started=new Date(), created=0, skipped=0, failed=0, errors=[], sheet=ensure_(SHEET,HEADERS);
    (rows||[]).forEach(function(row,index){
      try {
        var r=normalize_(row,mapping,source);
        if(!r.external_id) throw new Error('external_id is required');
        if(!r.arrival_date) throw new Error('arrival_date is required');
        var key=source+'|'+r.external_id; if(seen[key]){skipped++;return;}
        var guest=guest_(r); r.guest_id=guest.guest_id;
        sheet.appendRow(HEADERS.map(function(h){return r[h]===undefined?'':r[h];})); seen[key]=true; created++;
      } catch(error) { failed++; errors.push('Row '+(index+1)+': '+error.message); }
    });
    var result={import_id:TGI.Util.id('IMP'),started_at:started,completed_at:new Date(),source:source,rows_received:(rows||[]).length,rows_created:created,rows_skipped:skipped,rows_failed:failed,errors:errors.join('\n')};
    ensure_(LOG_SHEET,LOG_HEADERS).appendRow(LOG_HEADERS.map(function(h){return result[h];}));
    TGI.AuditLog.write(LOG_SHEET,result.import_id,'IMPORT',result); return result;
  }
  function importCsv(csvText, options) {
    var matrix=Utilities.parseCsv(csvText||''); if(matrix.length<2) throw new Error('CSV must contain a header and at least one row.');
    var headers=matrix.shift(), rows=matrix.map(function(values){var row={};headers.forEach(function(h,i){row[h]=values[i];});return row;});
    return importRows(rows,options);
  }
  return { ensureSheets:function(){ensure_(SHEET,HEADERS);ensure_(LOG_SHEET,LOG_HEADERS);}, importRows:importRows, importCsv:importCsv, all:records_ };
})();