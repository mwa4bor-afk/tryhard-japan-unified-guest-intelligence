TGI.GuestIntelligenceService = (function () {
  function generateAll() {
    var guests = TGI.GuestRepository.all();
    var created = [];
    guests.forEach(function (guest) {
      generatedForGuest_(guest).forEach(function (insight) {
        created.push(upsertInsight_(insight));
      });
    });
    TGI.AuditLog.write('AI_Insights', 'BATCH', 'GENERATE', { count: created.length });
    return created;
  }

  function generatedForGuest_(guest) {
    if (guest.status === 'MERGED') return [];
    var segment = TGI.GuestSegmentationService.segmentGuest(guest);
    var insights = [];
    var now = TGI.Util.nowIso();
    var expires = addDays_(new Date(), 30);

    insights.push(build_(guest.guest_id, 'SEGMENT', 'Guest segment: ' + segment,
      'Current deterministic segment is ' + segment + '.', 1, now, expires));

    if (segment === 'VIP' || segment === 'HIGH_VALUE') {
      insights.push(build_(guest.guest_id, 'NEXT_BEST_ACTION', 'Prioritize personalized recognition',
        'Review preferences before the next visit and assign a named host.', 0.9, now, expires));
    }
    if (segment === 'LAPSED') {
      insights.push(build_(guest.guest_id, 'RETENTION', 'Re-engagement opportunity',
        'Guest has not returned recently. Consider a consent-compliant personalized outreach.', 0.85, now, expires));
    }
    if (Number(guest.visit_count || 0) >= 2 && !guest.marketing_consent) {
      insights.push(build_(guest.guest_id, 'DATA_QUALITY', 'Marketing consent unavailable',
        'Do not send promotional outreach until valid consent is captured.', 1, now, expires));
    }
    return insights;
  }

  function build_(guestId, type, title, detail, confidence, generatedAt, expiresAt) {
    return {
      insight_id: stableId_(guestId, type),
      guest_id: guestId,
      insight_type: type,
      title: title,
      detail: detail,
      confidence: confidence,
      model: 'RULE_ENGINE_V1',
      generated_at: generatedAt,
      expires_at: expiresAt,
      status: 'ACTIVE'
    };
  }

  function upsertInsight_(insight) {
    return TGI.SheetRepository.upsert('AI_Insights', insight);
  }

  function stableId_(guestId, type) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, guestId + '|' + type);
    return 'ins_' + bytes.slice(0, 8).map(function (value) {
      var normalized = value < 0 ? value + 256 : value;
      return ('0' + normalized.toString(16)).slice(-2);
    }).join('');
  }

  function addDays_(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString();
  }

  return {
    generateAll: generateAll
  };
})();