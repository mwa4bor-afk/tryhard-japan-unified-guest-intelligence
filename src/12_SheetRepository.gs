TGI.SheetRepository = (function () {
  function sheet_(sheetName) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    TGI.Util.assert(sheet, sheetName + ' sheet is missing. Run installation first.');
    return sheet;
  }

  function toRecord_(headers, row) {
    var record = {};
    headers.forEach(function (header, index) { record[header] = row[index]; });
    return record;
  }

  function all(sheetName) {
    var sheet = sheet_(sheetName);
    var headers = TGI.Schema.headers(sheetName);
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length)
      .getValues()
      .map(function (row) { return toRecord_(headers, row); });
  }

  function findByPrimaryKey(sheetName, value) {
    var key = TGI.Schema.primaryKey(sheetName);
    return all(sheetName).filter(function (record) { return record[key] === value; })[0] || null;
  }

  function findBy(sheetName, field, value) {
    return all(sheetName).filter(function (record) { return record[field] === value; });
  }

  function append(sheetName, record) {
    return TGI.Util.withDocumentLock(function () {
      var sheet = sheet_(sheetName);
      var headers = TGI.Schema.headers(sheetName);
      var key = headers[0];
      sheet.appendRow(headers.map(function (header) {
        return record[header] === undefined ? '' : record[header];
      }));
      TGI.AuditLog.write(sheetName, record[key], 'CREATE', record);
      return record;
    });
  }

  function upsert(sheetName, record) {
    return TGI.Util.withDocumentLock(function () {
      var sheet = sheet_(sheetName);
      var headers = TGI.Schema.headers(sheetName);
      var key = headers[0];
      TGI.Util.assert(record[key], sheetName + ' primary key is required: ' + key);
      var rowNumber = locateRow_(sheet, record[key]);
      var values = headers.map(function (header) {
        return record[header] === undefined ? '' : record[header];
      });
      if (rowNumber) {
        sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
      } else {
        sheet.appendRow(values);
      }
      TGI.AuditLog.write(sheetName, record[key], rowNumber ? 'UPDATE' : 'CREATE', record);
      return record;
    });
  }

  function locateRow_(sheet, primaryKeyValue) {
    if (sheet.getLastRow() < 2) return 0;
    var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (var index = 0; index < ids.length; index += 1) {
      if (ids[index][0] === primaryKeyValue) return index + 2;
    }
    return 0;
  }

  return {
    all: all,
    findByPrimaryKey: findByPrimaryKey,
    findBy: findBy,
    append: append,
    upsert: upsert
  };
})();
