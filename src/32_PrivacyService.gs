TGI.PrivacyService = (function () {
  function retentionDays_() {
    var config = TGI.ConfigService.getAll ? TGI.ConfigService.getAll() : {};
    return Number(config.retention_days || 1095);
  }

  function review() {
    TGI.AccessControlService.requirePermission('privacy.review');
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays_());
    var guests = TGI.SheetRepository.all('Guests');
    var candidates = guests.filter(function (guest) {
      if (String(guest.status || '').toUpperCase() === 'MERGED') return false;
      var activity = guest.last_seen || guest.updated_at || guest.created_at;
      return activity && new Date(activity) < cutoff;
    }).map(function (guest) {
      return { guest_id: guest.guest_id, last_activity: guest.last_seen || guest.updated_at || guest.created_at, status: guest.status || '' };
    });
    return { retention_days: retentionDays_(), cutoff: cutoff, candidates: candidates };
  }

  function anonymizeGuest(guestId, reason) {
    TGI.AccessControlService.requirePermission('privacy.review');
    var guest = TGI.SheetRepository.findByPrimaryKey('Guests', guestId);
    if (!guest) throw new Error('Guest not found: ' + guestId);
    guest.first_name = 'ANONYMIZED';
    guest.last_name = guestId;
    guest.email = '';
    guest.phone = '';
    guest.birth_date = '';
    guest.address = '';
    guest.postal_code = '';
    guest.marketing_consent = false;
    guest.status = 'ANONYMIZED';
    guest.notes = 'Anonymized: ' + String(reason || 'retention/privacy request');
    guest.updated_at = new Date();
    TGI.SheetRepository.upsert('Guests', guest);
    TGI.AuditLog.write('PRIVACY_ANONYMIZATION', 'Guest', guestId, { reason: reason || '', actor: TGI.AccessControlService.currentEmail() });
    return guest;
  }

  function withdrawMarketingConsent(guestId, source) {
    var guest = TGI.SheetRepository.findByPrimaryKey('Guests', guestId);
    if (!guest) throw new Error('Guest not found: ' + guestId);
    guest.marketing_consent = false;
    guest.updated_at = new Date();
    TGI.SheetRepository.upsert('Guests', guest);
    TGI.ContactHistoryService.record({ guest_id: guestId, channel: 'SYSTEM', direction: 'INBOUND', subject: 'Marketing consent withdrawn', summary: String(source || 'Guest request') });
    return guest;
  }

  return { review: review, anonymizeGuest: anonymizeGuest, withdrawMarketingConsent: withdrawMarketingConsent };
})();
