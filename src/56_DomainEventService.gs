TGI.DomainEventService = (function () {
  var SHEET = 'Domain_Events';
  var HEADERS = ['event_id','event_type','entity_type','entity_id','guest_id','payload_json','status','created_at','processed_at','last_error'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function all() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS.length).getValues().map(function(row,index){
      var record = {_row:index+2};
      HEADERS.forEach(function(header,column){record[header]=row[column];});
      return record;
    });
  }

  function publish(eventType, payload, metadata) {
    TGI.AccessControlService.requirePermission('workflows.publish');
    metadata = metadata || {};
    var event = {
      event_id: TGI.Util.id('EVT'),
      event_type: String(eventType || '').trim(),
      entity_type: metadata.entity_type || '',
      entity_id: metadata.entity_id || '',
      guest_id: metadata.guest_id || '',
      payload_json: JSON.stringify(payload || {}),
      status: 'PENDING',
      created_at: new Date(),
      processed_at: '',
      last_error: ''
    };
    TGI.Util.assert(event.event_type, 'event_type is required.');
    ensureSheet_().appendRow(HEADERS.map(function(header){return event[header];}));
    TGI.AuditLog.write(SHEET,event.event_id,'PUBLISH',{event_type:event.event_type,entity_type:event.entity_type,entity_id:event.entity_id});
    return event;
  }

  function pending(limit) {
    return all().filter(function(event){return event.status === 'PENDING' || event.status === 'RETRY';}).slice(0,Number(limit || 50));
  }

  function update(event) {
    ensureSheet_().getRange(event._row,1,1,HEADERS.length).setValues([HEADERS.map(function(header){return event[header] === undefined ? '' : event[header];})]);
    return event;
  }

  function markProcessed(event) {
    event.status='PROCESSED'; event.processed_at=new Date(); event.last_error=''; return update(event);
  }

  function markFailed(event,error) {
    event.status='RETRY'; event.last_error=String(error && error.message ? error.message : error || '').slice(0,1000); return update(event);
  }

  return {ensureSheet:ensureSheet_,all:all,publish:publish,pending:pending,markProcessed:markProcessed,markFailed:markFailed};
})();
