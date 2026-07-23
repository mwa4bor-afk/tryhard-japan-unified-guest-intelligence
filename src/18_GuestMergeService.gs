TGI.GuestMergeService = (function () {
  var RELATED_SHEETS = ['Stays', 'Preferences', 'Loyalty', 'ContactLog', 'Tasks', 'AI_Insights'];

  function merge(primaryGuestId, duplicateGuestId, options) {
    options = options || {};
    TGI.Util.assert(primaryGuestId && duplicateGuestId, 'Both guest IDs are required.');
    TGI.Util.assert(primaryGuestId !== duplicateGuestId, 'Guest IDs must be different.');

    return TGI.Util.withDocumentLock(function () {
      var primary = TGI.GuestRepository.findById(primaryGuestId);
      var duplicate = TGI.GuestRepository.findById(duplicateGuestId);
      TGI.Util.assert(primary, 'Primary guest not found: ' + primaryGuestId);
      TGI.Util.assert(duplicate, 'Duplicate guest not found: ' + duplicateGuestId);

      var merged = mergeFields_(primary, duplicate, options.preferDuplicateFields || []);
      merged.guest_id = primaryGuestId;
      merged.visit_count = Number(primary.visit_count || 0) + Number(duplicate.visit_count || 0);
      merged.lifetime_value = Number(primary.lifetime_value || 0) + Number(duplicate.lifetime_value || 0);
      merged.first_seen_at = earliest_(primary.first_seen_at, duplicate.first_seen_at);
      merged.last_seen_at = latest_(primary.last_seen_at, duplicate.last_seen_at);
      merged.notes = combineNotes_(primary.notes, duplicate.notes, duplicateGuestId);

      var saved = TGI.GuestRepository.save(merged);
      var reassigned = reassignRelated_(duplicateGuestId, primaryGuestId);

      duplicate.status = 'MERGED';
      duplicate.notes = combineNotes_(duplicate.notes, 'Merged into ' + primaryGuestId, duplicateGuestId);
      duplicate.updated_at = TGI.Util.nowIso();
      TGI.GuestRepository.save(duplicate);

      TGI.AuditLog.write('Guest', primaryGuestId, 'MERGE', {
        primary_guest_id: primaryGuestId,
        duplicate_guest_id: duplicateGuestId,
        reassigned_records: reassigned
      });

      return { guest: saved, duplicate: duplicate, reassigned: reassigned };
    });
  }

  function reassignRelated_(fromGuestId, toGuestId) {
    var counts = {};
    RELATED_SHEETS.forEach(function (sheetName) {
      var records = TGI.SheetRepository.findBy(sheetName, 'guest_id', fromGuestId);
      counts[sheetName] = records.length;
      records.forEach(function (record) {
        record.guest_id = toGuestId;
        if (record.updated_at !== undefined) record.updated_at = TGI.Util.nowIso();
        TGI.SheetRepository.upsert(sheetName, record);
      });
    });
    return counts;
  }

  function mergeFields_(primary, duplicate, preferDuplicateFields) {
    var result = {};
    var prefer = {};
    preferDuplicateFields.forEach(function (field) { prefer[field] = true; });
    Object.keys(primary).concat(Object.keys(duplicate)).forEach(function (field) {
      if (prefer[field] && duplicate[field] !== '' && duplicate[field] !== null && duplicate[field] !== undefined) {
        result[field] = duplicate[field];
      } else {
        result[field] = primary[field] !== '' && primary[field] !== null && primary[field] !== undefined
          ? primary[field]
          : duplicate[field];
      }
    });
    return result;
  }

  function earliest_(a, b) {
    if (!a) return b || '';
    if (!b) return a;
    return new Date(a) <= new Date(b) ? a : b;
  }

  function latest_(a, b) {
    if (!a) return b || '';
    if (!b) return a;
    return new Date(a) >= new Date(b) ? a : b;
  }

  function combineNotes_(a, b, sourceId) {
    var parts = [];
    if (a) parts.push(String(a));
    if (b) parts.push('[Merged record ' + sourceId + '] ' + String(b));
    return parts.join('\n\n');
  }

  return { merge: merge };
})();
