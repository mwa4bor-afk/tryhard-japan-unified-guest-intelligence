TGI.WorkflowRuleService = (function () {
  var SHEET = 'Workflow_Rules';
  var HEADERS = ['rule_id','name','event_type','condition_json','action_type','action_json','priority','status','created_at','updated_at'];

  function ensureSheet_() {
    var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName(SHEET)||ss.insertSheet(SHEET);
    if(sheet.getLastRow()===0) sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function all() {
    var sheet=ensureSheet_(); if(sheet.getLastRow()<2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS.length).getValues().map(function(row,index){var record={_row:index+2};HEADERS.forEach(function(h,i){record[h]=row[i];});return record;});
  }

  function save(input) {
    TGI.AccessControlService.requirePermission('workflows.manage');
    input=input||{}; TGI.Util.assert(input.name,'Rule name is required.'); TGI.Util.assert(input.event_type,'event_type is required.'); TGI.Util.assert(input.action_type,'action_type is required.');
    var now=new Date(), existing=all(), index=-1, record={
      rule_id:input.rule_id||TGI.Util.id('RUL'), name:input.name, event_type:String(input.event_type),
      condition_json:typeof input.condition_json==='string'?input.condition_json:JSON.stringify(input.conditions||{}),
      action_type:String(input.action_type).toUpperCase(), action_json:typeof input.action_json==='string'?input.action_json:JSON.stringify(input.action||{}),
      priority:Number(input.priority||100), status:String(input.status||'ACTIVE').toUpperCase(), created_at:input.created_at||now, updated_at:now
    };
    existing.some(function(item,i){if(item.rule_id===record.rule_id){index=i;record.created_at=item.created_at;return true;}return false;});
    var values=HEADERS.map(function(h){return record[h];}), sheet=ensureSheet_();
    if(index>=0) sheet.getRange(index+2,1,1,HEADERS.length).setValues([values]); else sheet.appendRow(values);
    TGI.AuditLog.write(SHEET,record.rule_id,index>=0?'UPDATE':'CREATE',{name:record.name,event_type:record.event_type,action_type:record.action_type});
    return record;
  }

  function activeFor(eventType) {
    return all().filter(function(rule){return rule.status==='ACTIVE' && rule.event_type===eventType;}).sort(function(a,b){return Number(a.priority||100)-Number(b.priority||100);});
  }

  function parseJson_(value) { try { return value ? JSON.parse(value) : {}; } catch(error) { throw new Error('Invalid rule JSON: '+error.message); } }

  function matches(rule,event) {
    var conditions=parseJson_(rule.condition_json), payload=parseJson_(event.payload_json);
    return Object.keys(conditions).every(function(path){
      var expected=conditions[path], current=path.split('.').reduce(function(value,key){return value==null?undefined:value[key];},payload);
      if(expected && typeof expected==='object' && expected.operator){
        if(expected.operator==='gte') return Number(current)>=Number(expected.value);
        if(expected.operator==='lte') return Number(current)<=Number(expected.value);
        if(expected.operator==='in') return (expected.value||[]).indexOf(current)!==-1;
        if(expected.operator==='contains') return String(current||'').indexOf(String(expected.value||''))!==-1;
      }
      return String(current)===String(expected);
    });
  }

  return {ensureSheet:ensureSheet_,all:all,save:save,activeFor:activeFor,matches:matches,parseAction:function(rule){return parseJson_(rule.action_json);}};
})();
