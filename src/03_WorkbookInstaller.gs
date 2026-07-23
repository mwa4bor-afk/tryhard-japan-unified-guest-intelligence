TGI.WorkbookInstaller = (function () {
  function install(spreadsheet) {
    var ss = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    TGI.Util.assert(ss, 'Open or provide a Google Spreadsheet before installation.');

    TGI.Schema.names().forEach(function (name) {
      ensureSheet_(ss, name);
    });

    var props = PropertiesService.getDocumentProperties();
    props.setProperty(TGI.PROPERTY_KEYS.WORKBOOK_ID, ss.getId());
    props.setProperty(TGI.PROPERTY_KEYS.INSTALLED_AT, TGI.Util.nowIso());
    props.setProperty(TGI.PROPERTY_KEYS.SCHEMA_VERSION, TGI.Schema.version());

    return {
      workbookId: ss.getId(),
      workbookUrl: ss.getUrl(),
      schemaVersion: TGI.Schema.version()
    };
  }

  function ensureSheet_(ss, name) {
    var headers = TGI.Schema.headers(name);
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);

    if (sheet.getMaxColumns() < headers.length) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    }

    var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var empty = current.every(function (value) { return value === ''; });

    if (!empty && current.join('|') !== headers.join('|')) {
      throw new Error('Header mismatch in sheet ' + name + '. Refusing destructive migration.');
    }

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setWrap(true);
    sheet.autoResizeColumns(1, headers.length);

    if (sheet.getFilter()) sheet.getFilter().remove();
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), headers.length).createFilter();
  }

  return { install: install };
})();