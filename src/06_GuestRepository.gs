TGI.GuestRepository = (function () {
  function sheet_() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Guests');
    TGI.Util.assert(sheet, 'Guests sheet is missing. Run installation first.');
    return sheet;
  }

  function all() {
    var sheet = sheet_();
    if (sheet.getLastRow() < 2) return [];
    return sheet
      .getRange(2, 1, sheet.getLastRow() - 1, TGI.Schema.headers('Guests').length)
      .getValues()
      .map(TGI.Guest.fromRow);
  }

  function findById(guestId) {
    return all().filter(function (guest) {
      return guest.guest_id === guestId;
    })[0] || null;
  }

  function findDuplicates(input) {
    var normalizedEmail = TGI.Util.email(input.email);
    var normalizedPhone = TGI.Util.phone(input.phone);
    return all().filter(function (guest) {
      return (normalizedEmail && TGI.Util.email(guest.email) === normalizedEmail) ||
        (normalizedPhone && TGI.Util.phone(guest.phone) === normalizedPhone);
    });
  }

  function save(input) {
    return TGI.Util.withDocumentLock(function () {
      var guest = TGI.Guest.normalize(input);
      var sheet = sheet_();
      var rowNumber = locateRow_(guest.guest_id);

      if (rowNumber) {
        var prior = TGI.Guest.fromRow(
          sheet.getRange(rowNumber, 1, 1, TGI.Schema.headers('Guests').length).getValues()[0]
        );
        guest.created_at = prior.created_at || guest.created_at;
        sheet
          .getRange(rowNumber, 1, 1, TGI.Schema.headers('Guests').length)
          .setValues([TGI.Guest.toRow(guest)]);
        TGI.AuditLog.write('Guest', guest.guest_id, 'UPDATE', guest);
      } else {
        sheet.appendRow(TGI.Guest.toRow(guest));
        TGI.AuditLog.write('Guest', guest.guest_id, 'CREATE', guest);
      }

      return guest;
    });
  }

  function locateRow_(guestId) {
    var sheet = sheet_();
    if (sheet.getLastRow() < 2) return 0;
    var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (var index = 0; index < ids.length; index++) {
      if (ids[index][0] === guestId) return index + 2;
    }
    return 0;
  }

  return {
    all: all,
    findById: findById,
    findDuplicates: findDuplicates,
    save: save
  };
})();