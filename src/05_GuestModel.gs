TGI.Guest = (function () {
  function normalize(input) {
    input = input || {};
    var firstName = TGI.Util.text(input.first_name || input.firstName);
    var lastName = TGI.Util.text(input.last_name || input.lastName);
    var createdAt = input.created_at || TGI.Util.nowIso();

    var guest = {
      guest_id: TGI.Util.text(input.guest_id || input.guestId) || TGI.Util.uuid(),
      first_name: firstName,
      last_name: lastName,
      full_name: TGI.Util.text(input.full_name) || [firstName, lastName].filter(Boolean).join(' '),
      email: TGI.Util.email(input.email),
      phone: TGI.Util.phone(input.phone),
      country: TGI.Util.text(input.country),
      language: TGI.Util.text(input.language) || 'ja',
      date_of_birth: input.date_of_birth ? TGI.Util.normalizeDate(input.date_of_birth) : '',
      marketing_consent: TGI.Util.text(input.marketing_consent || TGI.Enums.CONSENT.UNKNOWN).toUpperCase(),
      status: TGI.Util.text(input.status || TGI.Enums.STATUS.ACTIVE).toUpperCase(),
      source: TGI.Util.text(input.source || TGI.Enums.SOURCE.MANUAL).toUpperCase(),
      first_seen_at: input.first_seen_at || TGI.Util.nowIso(),
      last_seen_at: input.last_seen_at || TGI.Util.nowIso(),
      visit_count: Number(input.visit_count || 0),
      lifetime_value: Number(input.lifetime_value || 0),
      notes: TGI.Util.text(input.notes),
      created_at: createdAt,
      updated_at: TGI.Util.nowIso()
    };

    validate(guest);
    return guest;
  }

  function validate(guest) {
    TGI.Util.assert(
      guest.first_name || guest.last_name || guest.email || guest.phone,
      'Guest requires a name, email, or phone.'
    );
    TGI.Util.assert(TGI.Util.isEmail(guest.email), 'Invalid guest email.');
    TGI.Util.assert(guest.visit_count >= 0, 'visit_count cannot be negative.');
    TGI.Util.assert(guest.lifetime_value >= 0, 'lifetime_value cannot be negative.');
    return true;
  }

  function toRow(guest) {
    return TGI.Schema.headers('Guests').map(function (header) {
      return guest[header] == null ? '' : guest[header];
    });
  }

  function fromRow(row) {
    var object = {};
    TGI.Schema.headers('Guests').forEach(function (header, index) {
      object[header] = row[index];
    });
    return object;
  }

  return {
    normalize: normalize,
    validate: validate,
    toRow: toRow,
    fromRow: fromRow
  };
})();