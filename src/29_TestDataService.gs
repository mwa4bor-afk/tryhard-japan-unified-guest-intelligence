TGI.TestDataService = (function () {
  var MARKER = '[TGI_TEST_DATA]';

  function seed() {
    TGI.WorkbookInstaller.install();
    var now = new Date();
    var guests = [
      createGuest_('Aiko','Tanaka','aiko.test@example.com','09011112222',3,120000,daysAgo_(12),true),
      createGuest_('Ken','Sato','ken.test@example.com','09022223333',2,45000,daysAgo_(45),true),
      createGuest_('Mina','Lee','mina.test@example.com','09033334444',1,12000,daysAgo_(220),false),
      createGuest_('John','Smith','john.test@example.com','09044445555',1,8000,daysAgo_(2),true)
    ];

    guests.forEach(function (guest, index) {
      TGI.StayService.create(guest, {
        location: index % 2 ? 'Osaka' : 'Tokyo', visit_date: daysAgo_(index * 15 + 1),
        spend: [60000,22000,12000,8000][index], experience_rating: [5,4,2,5][index],
        nps_score: [10,8,3,9][index], feedback: MARKER + ' seeded stay ' + (index + 1),
        service_recovery_required: index === 2
      });
      TGI.PreferenceService.upsert(guest.guest_id, 'EXPERIENCE', index % 2 ? 'Quiet seating' : 'Window seating', MARKER, 'HIGH');
    });

    TGI.LoyaltyService.apply(guests[0], { tier: 'PLATINUM', points_delta: 1200, submitted_at: now });
    TGI.LoyaltyService.apply(guests[1], { tier: 'GOLD', points_delta: 450, submitted_at: now });
    TGI.TaskService.create({ guest_id: guests[2].guest_id, title: MARKER + ' Recovery follow-up', description: 'Seeded overdue task', priority: 'HIGH', due_at: daysAgo_(2) });
    TGI.ContactHistoryService.recordInbound({ guest_id: guests[2].guest_id, channel: 'EMAIL', subject: MARKER + ' Complaint', summary: 'Seeded complaint', outcome: 'Pending review' });

    TGI.AuditLog.write('TestData', 'seed', 'CREATE', { guest_ids: guests.map(function (g) { return g.guest_id; }) });
    return { created: true, guest_ids: guests.map(function (g) { return g.guest_id; }) };
  }

  function createGuest_(first, last, email, phone, visits, value, lastSeen, consent) {
    return TGI.GuestRepository.save({
      first_name: first, last_name: last, email: email, phone: phone, country: 'Japan', language: 'ja',
      marketing_consent: consent, status: 'ACTIVE', source: 'SYSTEM', first_seen_at: daysAgo_(365),
      last_seen_at: lastSeen, visit_count: visits, lifetime_value: value, notes: MARKER
    });
  }

  function daysAgo_(days) {
    var date = new Date(); date.setDate(date.getDate() - days); return date;
  }

  return { seed: seed };
})();