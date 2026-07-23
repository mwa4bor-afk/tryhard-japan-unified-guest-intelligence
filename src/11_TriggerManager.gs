TGI.TriggerManager = (function () {
  function installFormSubmitTriggers() {
    var registry = TGI.FormBuilder.getRegistry();
    var formIds = Object.keys(registry).map(function (key) { return registry[key].formId; }).filter(Boolean);
    TGI.Util.assert(formIds.length, 'Create the forms before installing triggers.');

    removeManagedTriggers_();
    var created = [];
    formIds.forEach(function (formId) {
      var form = FormApp.openById(formId);
      var trigger = ScriptApp.newTrigger('onUnifiedFormSubmit').forForm(form).onFormSubmit().create();
      created.push({ triggerId: trigger.getUniqueId(), formId: formId, title: form.getTitle() });
    });
    PropertiesService.getScriptProperties().setProperty('TGI_TRIGGER_REGISTRY', JSON.stringify(created));
    return created;
  }

  function removeManagedTriggers_() {
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === 'onUnifiedFormSubmit') ScriptApp.deleteTrigger(trigger);
    });
  }

  function listManagedTriggers() {
    return ScriptApp.getProjectTriggers().filter(function (trigger) {
      return trigger.getHandlerFunction() === 'onUnifiedFormSubmit';
    }).map(function (trigger) {
      return {
        triggerId: trigger.getUniqueId(),
        handler: trigger.getHandlerFunction(),
        sourceId: trigger.getTriggerSourceId(),
        eventType: String(trigger.getEventType())
      };
    });
  }

  return {
    installFormSubmitTriggers: installFormSubmitTriggers,
    listManagedTriggers: listManagedTriggers
  };
})();
