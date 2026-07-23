TGI.MessageTemplateService = (function () {
  var SHEET = 'Message_Templates';
  var HEADERS = ['template_id','name','channel','language','subject','body','status','created_at','updated_at'];

  function ensureSheet_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
    return sheet;
  }

  function all() {
    var sheet = ensureSheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS.length).getValues().map(function (row, index) {
      var record = { _row: index + 2 };
      HEADERS.forEach(function (header, column) { record[header] = row[column]; });
      return record;
    });
  }

  function find(templateId) {
    return all().filter(function (template) { return template.template_id === templateId; })[0] || null;
  }

  function save(input) {
    TGI.AccessControlService.requirePermission('marketing.manage');
    input = input || {};
    TGI.Util.assert(input.name, 'Template name is required.');
    TGI.Util.assert(input.body, 'Template body is required.');
    var existing = input.template_id ? find(input.template_id) : null;
    var now = new Date();
    var record = {
      template_id: input.template_id || TGI.Util.id('TPL'),
      name: input.name,
      channel: String(input.channel || 'EMAIL').toUpperCase(),
      language: input.language || 'ja',
      subject: input.subject || '',
      body: input.body,
      status: input.status || 'ACTIVE',
      created_at: existing ? existing.created_at : now,
      updated_at: now
    };
    var values = HEADERS.map(function (header) { return record[header]; });
    if (existing) ensureSheet_().getRange(existing._row,1,1,HEADERS.length).setValues([values]); else ensureSheet_().appendRow(values);
    TGI.AuditLog.write(SHEET, record.template_id, existing ? 'UPDATE' : 'CREATE', { name: record.name, channel: record.channel });
    return record;
  }

  function render(template, guest, extra) {
    var context = {};
    Object.keys(guest || {}).forEach(function (key) { context[key] = guest[key]; });
    Object.keys(extra || {}).forEach(function (key) { context[key] = extra[key]; });
    function apply(text) {
      return String(text || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, function (_, key) {
        return context[key] === undefined || context[key] === null ? '' : String(context[key]);
      });
    }
    return { subject: apply(template.subject), body: apply(template.body) };
  }

  return { ensureSheet: ensureSheet_, all: all, find: find, save: save, render: render };
})();