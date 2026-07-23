TGI.PmsSyncService = (function () {
  var SYNC = 'PMS_Sync_State';
  var QUARANTINE = 'PMS_Quarantine';
  var RESERVATIONS = 'Reservations';
  var SYNC_HEADERS = ['provider','property_id','cursor','last_started_at','last_completed_at','last_status','records_received','records_imported','records_failed','last_error'];
  var Q_HEADERS = ['quarantine_id','provider','property_id','external_id','error','payload_json','created_at','status','resolved_at'];
  var R_HEADERS = ['reservation_id','provider','external_reservation_id','property_id','arrival_date','departure_date','status','guest_first_name','guest_last_name','guest_email','guest_phone','total_amount','currency','raw_json','created_at','updated_at'];

  function sheet_(name, headers) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var s = ss.getSheetByName(name) || ss.insertSheet(name);
    if (!s.getLastRow()) s.getRange(1,1,1,headers.length).setValues([headers]);
    return s;
  }

  function rows_(sheet, headers) {
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues().map(function(r){ var o={}; headers.forEach(function(h,i){o[h]=r[i];}); return o; });
  }

  function upsertReservation_(record) {
    var s = sheet_(RESERVATIONS, R_HEADERS);
    var rows = rows_(s, R_HEADERS);
    var key = record.provider + ':' + record.external_reservation_id;
    var index = -1;
    rows.some(function(r,i){ if ((r.provider + ':' + r.external_reservation_id) === key) { index=i; return true; } return false; });
    var now = new Date();
    var saved = {
      reservation_id: index >= 0 ? rows[index].reservation_id : TGI.Util.id('RES'), provider: record.provider,
      external_reservation_id: record.external_reservation_id, property_id: record.property_id,
      arrival_date: record.arrival_date, departure_date: record.departure_date, status: record.status,
      guest_first_name: record.guest_first_name, guest_last_name: record.guest_last_name,
      guest_email: record.guest_email, guest_phone: record.guest_phone, total_amount: record.total_amount,
      currency: record.currency, raw_json: record.raw_json, created_at: index >= 0 ? rows[index].created_at : now, updated_at: now
    };
    var values = R_HEADERS.map(function(h){ return saved[h]; });
    if (index >= 0) s.getRange(index+2,1,1,R_HEADERS.length).setValues([values]); else s.appendRow(values);
    return saved;
  }

  function quarantine_(provider, propertyId, payload, error) {
    sheet_(QUARANTINE, Q_HEADERS).appendRow([TGI.Util.id('PMQ'),provider,propertyId,String(payload.id || payload.reservationID || payload.confirmationNumber || ''),String(error).slice(0,1000),JSON.stringify(payload),new Date(),'OPEN','']);
  }

  function saveState_(state) {
    var s = sheet_(SYNC, SYNC_HEADERS), rows = rows_(s, SYNC_HEADERS), index = -1;
    rows.some(function(r,i){ if (r.provider===state.provider && r.property_id===state.property_id) { index=i; return true; } return false; });
    var values = SYNC_HEADERS.map(function(h){return state[h] || '';});
    if (index >= 0) s.getRange(index+2,1,1,SYNC_HEADERS.length).setValues([values]); else s.appendRow(values);
  }

  function ingest(provider, propertyId, payloads, cursor) {
    TGI.AccessControlService.requirePermission('pms.sync');
    TGI.PmsProviderAdapters.install();
    var state = { provider:String(provider).toUpperCase(), property_id:String(propertyId), cursor:cursor || '', last_started_at:new Date(), last_completed_at:'', last_status:'RUNNING', records_received:(payloads||[]).length, records_imported:0, records_failed:0, last_error:'' };
    saveState_(state);
    (payloads || []).forEach(function(payload){
      try { upsertReservation_(TGI.PmsAdapterRegistryService.normalize(provider, payload, {property_id:propertyId})); state.records_imported++; }
      catch (e) { state.records_failed++; state.last_error=String(e); quarantine_(provider, propertyId, payload, e); }
    });
    state.last_completed_at = new Date(); state.last_status = state.records_failed ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED'; saveState_(state);
    if (TGI.DomainEventService) TGI.DomainEventService.publish('pms.sync.completed', state, {source:'PmsSyncService'});
    return state;
  }

  return { ingest: ingest, ensureSheets: function(){ sheet_(SYNC,SYNC_HEADERS); sheet_(QUARANTINE,Q_HEADERS); sheet_(RESERVATIONS,R_HEADERS); return true; } };
})();