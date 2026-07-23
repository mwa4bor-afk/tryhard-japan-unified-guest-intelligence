TGI.FormBuilder = (function () {
  var PROPERTY_KEY = 'TGI_FORM_REGISTRY';

  function createAll(options) {
    options = options || {};
    var workbook = SpreadsheetApp.getActiveSpreadsheet();
    TGI.Util.assert(workbook, 'Run this function from the unified workbook.');
    var registry = loadRegistry();
    var results = [];

    TGI.FormDefinitions.all().forEach(function (definition) {
      var existing = registry[definition.key];
      var form;
      if (existing && existing.formId && !options.recreate) {
        try { form = FormApp.openById(existing.formId); } catch (error) { form = null; }
      }
      if (!form) {
        form = build(definition, workbook.getId());
      }
      registry[definition.key] = {
        key: definition.key,
        title: form.getTitle(),
        formId: form.getId(),
        editUrl: form.getEditUrl(),
        publishedUrl: form.getPublishedUrl(),
        workbookId: workbook.getId(),
        updatedAt: TGI.Util.nowIso()
      };
      results.push(registry[definition.key]);
    });

    saveRegistry(registry);
    return results;
  }

  function build(definition, workbookId) {
    var form = FormApp.create(definition.title);
    form.setDescription(definition.description || '');
    form.setConfirmationMessage(definition.confirmation || 'Thank you.');
    form.setCollectEmail(false);
    form.setProgressBar(true);
    form.setShowLinkToRespondAgain(false);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, workbookId);

    definition.fields.forEach(function (field) {
      addField(form, field);
    });
    return form;
  }

  function addField(form, field) {
    var item;
    if (field.type === 'text') {
      item = form.addTextItem();
    } else if (field.type === 'paragraph') {
      item = form.addParagraphTextItem();
    } else if (field.type === 'date') {
      item = form.addDateItem().setIncludesYear(true);
    } else if (field.type === 'multiple') {
      item = form.addMultipleChoiceItem().setChoiceValues(field.choices);
    } else if (field.type === 'checkbox') {
      item = form.addCheckboxItem().setChoiceValues(field.choices);
    } else if (field.type === 'scale') {
      item = form.addScaleItem()
        .setBounds(field.lower, field.upper)
        .setLabels(field.lowerLabel || '', field.upperLabel || '');
    } else {
      throw new Error('Unsupported form field type: ' + field.type);
    }

    item.setTitle(field.title);
    item.setRequired(field.required === true);
    item.setHelpText('[field:' + field.key + ']' + (field.helpText ? ' ' + field.helpText : ''));
    return item;
  }

  function loadRegistry() {
    var raw = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEY);
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (error) { return {}; }
  }

  function saveRegistry(registry) {
    PropertiesService.getScriptProperties().setProperty(PROPERTY_KEY, JSON.stringify(registry));
  }

  function getRegistry() { return loadRegistry(); }

  function getByFormId(formId) {
    var registry = loadRegistry();
    var keys = Object.keys(registry);
    for (var i = 0; i < keys.length; i += 1) {
      if (registry[keys[i]].formId === formId) return registry[keys[i]];
    }
    return null;
  }

  return {
    createAll: createAll,
    getRegistry: getRegistry,
    getByFormId: getByFormId
  };
})();
