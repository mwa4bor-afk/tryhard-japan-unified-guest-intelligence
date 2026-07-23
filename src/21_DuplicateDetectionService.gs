TGI.DuplicateDetectionService = (function () {
  function candidates(minScore) {
    minScore = minScore === undefined ? 60 : Number(minScore);
    var guests = TGI.GuestRepository.all().filter(function (guest) {
      return String(guest.status || '').toUpperCase() !== 'MERGED';
    });
    var results = [];

    for (var i = 0; i < guests.length; i += 1) {
      for (var j = i + 1; j < guests.length; j += 1) {
        var scored = score_(guests[i], guests[j]);
        if (scored.score >= minScore) results.push(scored);
      }
    }

    return results.sort(function (a, b) { return b.score - a.score; });
  }

  function score_(a, b) {
    var score = 0;
    var reasons = [];
    var emailA = TGI.Util.email(a.email);
    var emailB = TGI.Util.email(b.email);
    var phoneA = TGI.Util.phone(a.phone);
    var phoneB = TGI.Util.phone(b.phone);
    var nameA = normalizeText_(a.full_name || (a.first_name + ' ' + a.last_name));
    var nameB = normalizeText_(b.full_name || (b.first_name + ' ' + b.last_name));

    if (emailA && emailA === emailB) { score += 70; reasons.push('same email'); }
    if (phoneA && phoneA === phoneB) { score += 70; reasons.push('same phone'); }
    if (nameA && nameA === nameB) { score += 20; reasons.push('same normalized name'); }
    if (a.date_of_birth && b.date_of_birth && String(a.date_of_birth) === String(b.date_of_birth)) {
      score += 20; reasons.push('same date of birth');
    }
    if (a.country && b.country && normalizeText_(a.country) === normalizeText_(b.country)) {
      score += 5; reasons.push('same country');
    }

    return {
      primary_candidate_id: choosePrimary_(a, b).guest_id,
      duplicate_candidate_id: choosePrimary_(a, b).guest_id === a.guest_id ? b.guest_id : a.guest_id,
      score: Math.min(score, 100),
      reasons: reasons,
      guest_a: a,
      guest_b: b
    };
  }

  function choosePrimary_(a, b) {
    var aVisits = Number(a.visit_count || 0);
    var bVisits = Number(b.visit_count || 0);
    if (aVisits !== bVisits) return aVisits > bVisits ? a : b;
    var aCreated = new Date(a.created_at || 0).getTime();
    var bCreated = new Date(b.created_at || 0).getTime();
    return aCreated <= bCreated ? a : b;
  }

  function normalizeText_(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g, '');
  }

  return { candidates: candidates, score: score_ };
})();
