TGI.KpiService = (function () {
  function snapshot() {
    var guests = TGI.SheetRepository.all('Guests');
    var stays = TGI.SheetRepository.all('Stays');
    var tasks = TGI.SheetRepository.all('Tasks');
    var loyalty = TGI.SheetRepository.all('Loyalty');
    var ratings = stays.map(function (s) { return Number(s.experience_rating); }).filter(isFiniteNumber_);
    var npsValues = stays.map(function (s) { return Number(s.nps_score); }).filter(isFiniteNumber_);
    var spend = stays.reduce(function (sum, s) { return sum + (Number(s.spend) || 0); }, 0);
    var openTasks = tasks.filter(function (t) { return ['COMPLETED','CANCELLED'].indexOf(String(t.status).toUpperCase()) < 0; });
    var recoveryStays = stays.filter(function (s) { return truthy_(s.service_recovery_required); });

    return {
      generated_at: TGI.Util.nowIso(),
      total_guests: guests.filter(function (g) { return g.status !== 'MERGED'; }).length,
      total_stays: stays.length,
      total_spend: spend,
      average_spend: stays.length ? spend / stays.length : 0,
      average_rating: average_(ratings),
      nps: calculateNps_(npsValues),
      promoters: npsValues.filter(function (v) { return v >= 9; }).length,
      detractors: npsValues.filter(function (v) { return v <= 6; }).length,
      service_recovery_cases: recoveryStays.length,
      service_recovery_rate: stays.length ? recoveryStays.length / stays.length : 0,
      open_tasks: openTasks.length,
      overdue_tasks: TGI.TaskService.overdue().length,
      loyalty_members: loyalty.length,
      active_marketing_consents: guests.filter(function (g) { return truthy_(g.marketing_consent); }).length
    };
  }

  function byLocation() {
    var stays = TGI.SheetRepository.all('Stays');
    var groups = {};
    stays.forEach(function (stay) {
      var key = stay.location || 'Unknown';
      groups[key] = groups[key] || [];
      groups[key].push(stay);
    });
    return Object.keys(groups).sort().map(function (location) {
      var rows = groups[location];
      var ratings = rows.map(function (r) { return Number(r.experience_rating); }).filter(isFiniteNumber_);
      var nps = rows.map(function (r) { return Number(r.nps_score); }).filter(isFiniteNumber_);
      var spend = rows.reduce(function (sum, r) { return sum + (Number(r.spend) || 0); }, 0);
      var recovery = rows.filter(function (r) { return truthy_(r.service_recovery_required); }).length;
      return {
        location: location,
        stays: rows.length,
        spend: spend,
        average_spend: rows.length ? spend / rows.length : 0,
        average_rating: average_(ratings),
        nps: calculateNps_(nps),
        recovery_cases: recovery,
        recovery_rate: rows.length ? recovery / rows.length : 0
      };
    });
  }

  function loyaltySegments() {
    var rows = TGI.SheetRepository.all('Loyalty');
    var result = {};
    rows.forEach(function (row) {
      var tier = String(row.tier || 'STANDARD').toUpperCase();
      result[tier] = result[tier] || { tier: tier, members: 0, points_balance: 0, lifetime_points: 0 };
      result[tier].members += 1;
      result[tier].points_balance += Number(row.points_balance) || 0;
      result[tier].lifetime_points += Number(row.lifetime_points) || 0;
    });
    return Object.keys(result).sort().map(function (key) { return result[key]; });
  }

  function calculateNps_(values) {
    if (!values.length) return 0;
    var promoters = values.filter(function (v) { return v >= 9; }).length;
    var detractors = values.filter(function (v) { return v <= 6; }).length;
    return ((promoters - detractors) / values.length) * 100;
  }
  function average_(values) { return values.length ? values.reduce(function (a, b) { return a + b; }, 0) / values.length : 0; }
  function isFiniteNumber_(value) { return isFinite(value) && value !== 0 ? true : isFinite(value); }
  function truthy_(value) { return /^(true|yes|1)/i.test(String(value || '')); }

  return { snapshot: snapshot, byLocation: byLocation, loyaltySegments: loyaltySegments };
})();
