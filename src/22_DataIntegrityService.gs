TGI.DataIntegrityService = (function () {
  var RELATED_SHEETS = ['Stays', 'Preferences', 'Loyalty', 'ContactLog', 'Tasks', 'AI_Insights'];

  function validate() {
    var report = {
      generated_at: TGI.Util.nowIso(),
      valid: true,
      missing_sheets: [],
      header_mismatches: [],
      duplicate_primary_keys: [],
      orphaned_guest_references: [],
      invalid_guest_records: [],
      summary: {}
    };

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    TGI.Schema.names().forEach(function (sheetName) {
      var sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        report.missing_sheets.push(sheetName);
        return;
      }
      validateHeaders_(sheetName, sheet, report);
      validatePrimaryKeys_(sheetName, report);
    });

    if (!report.missing_sheets.length && spreadsheet.getSheetByName('Guests')) {
      validateGuests_(report);
      validateReferences_(report);
    }

    report.valid = !report.missing_sheets.length &&
      !report.header_mismatches.length &&
      !report.duplicate_primary_keys.length &&
      !report.orphaned_guest_references.length &&
      !report.invalid_guest_records.length;

    report.summary = {
      missing_sheets: report.missing_sheets.length,
      header_mismatches: report.header_mismatches.length,
      duplicate_primary_keys: report.duplicate_primary_keys.length,
      orphaned_guest_references: report.orphaned_guest_references.length,
      invalid_guest_records: report.invalid_guest_records.length
    };

    TGI.AuditLog.write('Workbook', spreadsheet.getId(), 'INTEGRITY_CHECK', report.summary);
    return report;
  }

  function validateHeaders_(sheetName, sheet, report) {
    var expected = TGI.Schema.headers(sheetName);
    var actual = sheet.getRange(1, 1, 1, expected.length).getValues()[0];
    expected.forEach(function (header, index) {
      if (actual[index] !== header) {
        report.header_mismatches.push({
          sheet: sheetName,
          column: index + 1,
          expected: header,
          actual: actual[index]
        });
      }
    });
  }

  function validatePrimaryKeys_(sheetName, report) {
    var records = TGI.SheetRepository.all(sheetName);
    var key = TGI.Schema.primaryKey(sheetName);
    var seen = {};
    records.forEach(function (record, index) {
      var value = String(record[key] || '');
      if (!value) {
        report.duplicate_primary_keys.push({ sheet: sheetName, key: '', row: index + 2, reason: 'missing' });
      } else if (seen[value]) {
        report.duplicate_primary_keys.push({ sheet: sheetName, key: value, row: index + 2, reason: 'duplicate' });
      } else {
        seen[value] = true;
      }
    });
  }

  function validateGuests_(report) {
    TGI.GuestRepository.all().forEach(function (guest) {
      try {
        TGI.Guest.normalize(guest);
      } catch (error) {
        report.invalid_guest_records.push({ guest_id: guest.guest_id, message: error.message });
      }
    });
  }

  function validateReferences_(report) {
    var guestIds = {};
    TGI.GuestRepository.all().forEach(function (guest) { guestIds[guest.guest_id] = true; });
    RELATED_SHEETS.forEach(function (sheetName) {
      TGI.SheetRepository.all(sheetName).forEach(function (record) {
        if (record.guest_id && !guestIds[record.guest_id]) {
          report.orphaned_guest_references.push({
            sheet: sheetName,
            record_id: record[TGI.Schema.primaryKey(sheetName)],
            guest_id: record.guest_id
          });
        }
      });
    });
  }

  return { validate: validate };
})();
