TGI.GuestResolutionService = (function () {
  function splitName_(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return { first: parts.shift() || 'Unknown', last: parts.join(' ') || 'Guest' };
  }

  function resolve(input) {
    input = input || {};
    var email = input.email || input.guest_email || '';
    var phone = input.phone || input.guest_phone || '';
    var duplicates = TGI.GuestRepository.findDuplicates({ email: email, phone: phone });

    if (duplicates.length > 1) {
      TGI.AuditLog.write('Guest', duplicates[0].guest_id, 'AMBIGUOUS_MATCH', {
        email: email,
        phone: phone,
        candidate_guest_ids: duplicates.map(function (guest) { return guest.guest_id; })
      });
    }

    var guest = duplicates[0] || null;
    var names = splitName_(input.guest_name || '');
    if (!guest) {
      guest = {
        first_name: input.first_name || names.first,
        last_name: input.last_name || names.last,
        email: email,
        phone: phone,
        country: input.country || '',
        language: input.language || '',
        date_of_birth: input.date_of_birth || '',
        marketing_consent: Boolean(input.marketing_consent),
        source: input.source || 'FORM',
        first_seen_at: input.occurred_at || input.submitted_at || TGI.Util.nowIso(),
        last_seen_at: input.occurred_at || input.submitted_at || TGI.Util.nowIso(),
        notes: input.notes || 'Created through guest resolution service.'
      };
    } else {
      guest.first_name = input.first_name || guest.first_name;
      guest.last_name = input.last_name || guest.last_name;
      guest.email = email || guest.email;
      guest.phone = phone || guest.phone;
      guest.country = input.country || guest.country;
      guest.language = input.language || guest.language;
      guest.date_of_birth = input.date_of_birth || guest.date_of_birth;
      guest.marketing_consent = guest.marketing_consent || Boolean(input.marketing_consent);
      guest.last_seen_at = input.occurred_at || input.submitted_at || guest.last_seen_at;
    }

    return TGI.GuestRepository.save(guest);
  }

  return { resolve: resolve };
})();
