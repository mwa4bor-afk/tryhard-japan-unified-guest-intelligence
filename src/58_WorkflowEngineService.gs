TGI.WorkflowEngineService = (function () {
  var LOG_SHEET='Workflow_Executions';
  var LOG_HEADERS=['execution_id','event_id','rule_id','action_type','status','result_json','error','started_at','completed_at'];

  function ensureLog_(){var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(LOG_SHEET)||ss.insertSheet(LOG_SHEET);if(sheet.getLastRow()===0)sheet.getRange(1,1,1,LOG_HEADERS.length).setValues([LOG_HEADERS]);return sheet;}
  function executions_(){var sheet=ensureLog_();if(sheet.getLastRow()<2)return[];return sheet.getRange(2,1,sheet.getLastRow()-1,LOG_HEADERS.length).getValues().map(function(row){var r={};LOG_HEADERS.forEach(function(h,i){r[h]=row[i];});return r;});}
  function alreadyExecuted_(eventId,ruleId){return executions_().some(function(x){return x.event_id===eventId&&x.rule_id===ruleId&&x.status==='COMPLETED';});}
  function interpolate_(value,event,payload){if(typeof value==='string')return value.replace(/\{\{([^}]+)\}\}/g,function(_,path){var root={event:event,payload:payload};return path.trim().split('.').reduce(function(v,k){return v==null?'':v[k];},root);});if(Array.isArray(value))return value.map(function(v){return interpolate_(v,event,payload);});if(value&&typeof value==='object'){var out={};Object.keys(value).forEach(function(k){out[k]=interpolate_(value[k],event,payload);});return out;}return value;}
  function executeAction_(rule,event){var payload=event.payload_json?JSON.parse(event.payload_json):{},action=interpolate_(TGI.WorkflowRuleService.parseAction(rule),event,payload),type=String(rule.action_type||'').toUpperCase();
    if(type==='CREATE_CASE')return TGI.GuestCaseService.create({guest_id:action.guest_id||event.guest_id,title:action.title||event.event_type,description:action.description||JSON.stringify(payload),priority:action.priority||'NORMAL',category:action.category||'AUTOMATION',source_type:'WORKFLOW',source_id:event.event_id,owner_email:action.owner_email||''});
    if(type==='CREATE_TASK')return TGI.TaskService.create({guest_id:action.guest_id||event.guest_id,title:action.title||event.event_type,description:action.description||'',priority:action.priority||'NORMAL',assigned_to:action.assigned_to||'',due_at:action.due_at||''});
    if(type==='ENQUEUE_INTEGRATION')return TGI.IntegrationQueueService.enqueue(action.integration_id,action.event_type||event.event_type,action.payload||payload,{entity_type:event.entity_type,entity_id:event.entity_id,max_attempts:action.max_attempts||5});
    if(type==='AUDIT')return TGI.AuditLog.write('WORKFLOW_ACTION',event.event_id,rule.rule_id,action);
    throw new Error('Unsupported workflow action: '+type);
  }
  function log_(record){ensureLog_().appendRow(LOG_HEADERS.map(function(h){return record[h]===undefined?'':record[h];}));return record;}
  function processEvent(event){TGI.AccessControlService.requirePermission('workflows.process');var rules=TGI.WorkflowRuleService.activeFor(event.event_type),results=[];
    rules.forEach(function(rule){if(alreadyExecuted_(event.event_id,rule.rule_id)||!TGI.WorkflowRuleService.matches(rule,event))return;var started=new Date(),execution={execution_id:TGI.Util.id('EXE'),event_id:event.event_id,rule_id:rule.rule_id,action_type:rule.action_type,status:'RUNNING',result_json:'',error:'',started_at:started,completed_at:''};
      try{var result=executeAction_(rule,event);execution.status='COMPLETED';execution.result_json=JSON.stringify(result||{});execution.completed_at=new Date();}
      catch(error){execution.status='FAILED';execution.error=String(error&&error.message?error.message:error).slice(0,1000);execution.completed_at=new Date();}
      log_(execution);results.push(execution);
    });
    var failures=results.filter(function(x){return x.status==='FAILED';});if(failures.length)TGI.DomainEventService.markFailed(event,failures.map(function(x){return x.error;}).join('; '));else TGI.DomainEventService.markProcessed(event);return results;
  }
  function processPending(limit){TGI.AccessControlService.requirePermission('workflows.process');var events=TGI.DomainEventService.pending(limit||25),summary={events:events.length,executions:0,completed:0,failed:0};events.forEach(function(event){var results=processEvent(event);summary.executions+=results.length;results.forEach(function(r){summary[r.status==='COMPLETED'?'completed':'failed']++;});});return summary;}
  return {ensureLog:ensureLog_,executions:executions_,processEvent:processEvent,processPending:processPending};
})();
