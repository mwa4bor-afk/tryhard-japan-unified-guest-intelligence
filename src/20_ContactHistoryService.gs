TGI.ContactHistoryService = (function () {
  var CHANNELS = ['EMAIL', 'PHONE', 'SMS', 'LINE', 'IN_PERSON', 'SOCIAL', 'OTHER'];
  var DIRECTIONS = ['INBOUND', 'OUTBOUND'];

  function record(input) {
    input = input || {};
    TGI.Util.assert(input.guest_id, 'guest_id is required.');
    TGI.Util.assert(TGI.GuestRepository.findById(input.guest_id), 'Guest not found: ' + input.guest_id);
    var contact = {
      contact_id: TGI.Util.uuid(),
      guest_id: input.guest_id,
      channel: normalize_(input.channel, CHANNELS, 'OTHER'),
      direction: normalize_(input.direction, DIRECTIONS, 'OUTBOUND'),
      subject: input.subject || '',
      summary: input.summary || '',
      outcome: input.outcome || '',
      owner_email: TGI.Util.email(input.owner_email),
      contacted_at: input.contacted_at || TGI.Util.nowIso(),
      created_at: TGI.Util.nowIso()
    };
    return TGI.SheetRepository.append('ContactLog', contact);
  }

  function forGuest(guestId) {
    return TGI.SheetRepository.findBy('ContactLog', 'guest_id', guestId).sort(function (a, b) {
      return new Date(b.contacted_at || 0) - new Date(a.contacted_at || 0);
    });
  }

  function latest(guestId) {
    return forGuest(guestId)[0] || null;
  }

  function countSince(guestId, since) {
    var cutoff = new Date(since);
    return forGuest(guestId).filter(function (entry) {
      return new Date(entry.contacted_at || 0) >= cutoff;
    }).length;
  }

  function normalize_(value, valid, fallback) {
    var normalized = String(value || fallback).trim().replace(/\s+/g, '_').toUpperCase();
    return valid.indexOf(normalized) >= 0 ? normalized : fallback;
  }

  return { record: record, forGuest: forGuest, latest: latest, countSince: countSince };
})();
