TGI.LoyaltyProgramService = (function () {
  var TIER_SHEET = 'Loyalty_Tiers';
  var MEMBER_SHEET = 'Loyalty_Members';
  var TIER_HEADERS = ['tier_id','tier_name','minimum_qualifying_points','earn_multiplier','benefits_json','status','created_at','updated_at'];
  var MEMBER_HEADERS = ['member_id','guest_id','tier_id','points_balance','qualifying_points','lifetime_points','joined_at','last_activity_at','status','updated_at'];

  function ensureSheet_(name, headers) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  function rows_(name, headers) {
    var sheet = ensureSheet_(name, headers);
    if (sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function (row, index) {
      var item = { _row: index + 2 };
      headers.forEach(function (header, column) { item[header] = row[column]; });
      return item;
    });
  }

  function initializeDefaults() {
    TGI.AccessControlService.requirePermission('loyalty.manage');
    ensureSheet_(TIER_SHEET, TIER_HEADERS);
    ensureSheet_(MEMBER_SHEET, MEMBER_HEADERS);
    if (!rows_(TIER_SHEET, TIER_HEADERS).length) {
      [
        ['TIER_MEMBER','Member',0,1,'{}','ACTIVE'],
        ['TIER_SILVER','Silver',1000,1.1,'{"priority_service":true}','ACTIVE'],
        ['TIER_GOLD','Gold',5000,1.25,'{"priority_service":true,"welcome_amenity":true}','ACTIVE'],
        ['TIER_PLATINUM','Platinum',15000,1.5,'{"priority_service":true,"welcome_amenity":true,"manager_recognition":true}','ACTIVE']
      ].forEach(function (tier) {
        var now = new Date();
        ensureSheet_(TIER_SHEET, TIER_HEADERS).appendRow(tier.concat([now, now]));
      });
    }
    return { tiers: allTiers().length, members: allMembers().length };
  }

  function allTiers() { return rows_(TIER_SHEET, TIER_HEADERS); }
  function allMembers() { return rows_(MEMBER_SHEET, MEMBER_HEADERS); }

  function tierForPoints(points) {
    var active = allTiers().filter(function (tier) { return String(tier.status).toUpperCase() === 'ACTIVE'; });
    active.sort(function (a, b) { return Number(b.minimum_qualifying_points || 0) - Number(a.minimum_qualifying_points || 0); });
    return active.filter(function (tier) { return Number(points || 0) >= Number(tier.minimum_qualifying_points || 0); })[0] || null;
  }

  function enroll(guestId) {
    TGI.AccessControlService.requirePermission('loyalty.manage');
    var existing = allMembers().filter(function (member) { return String(member.guest_id) === String(guestId); })[0];
    if (existing) return existing;
    var tier = tierForPoints(0);
    var now = new Date();
    var record = {
      member_id: TGI.Util.id('LOY'), guest_id: guestId, tier_id: tier ? tier.tier_id : '', points_balance: 0,
      qualifying_points: 0, lifetime_points: 0, joined_at: now, last_activity_at: now, status: 'ACTIVE', updated_at: now
    };
    ensureSheet_(MEMBER_SHEET, MEMBER_HEADERS).appendRow(MEMBER_HEADERS.map(function (header) { return record[header]; }));
    TGI.AuditLog.write('LOYALTY_MEMBER_ENROLLED', 'LoyaltyMember', record.member_id, { guest_id: guestId });
    return record;
  }

  function updateMember(member) {
    member.updated_at = new Date();
    ensureSheet_(MEMBER_SHEET, MEMBER_HEADERS).getRange(member._row, 1, 1, MEMBER_HEADERS.length).setValues([MEMBER_HEADERS.map(function (header) { return member[header]; })]);
    return member;
  }

  function refreshTier(member) {
    var tier = tierForPoints(member.qualifying_points);
    if (tier) member.tier_id = tier.tier_id;
    return updateMember(member);
  }

  function findMemberByGuest(guestId) {
    return allMembers().filter(function (member) { return String(member.guest_id) === String(guestId); })[0] || null;
  }

  return {
    initializeDefaults: initializeDefaults,
    allTiers: allTiers,
    allMembers: allMembers,
    tierForPoints: tierForPoints,
    enroll: enroll,
    findMemberByGuest: findMemberByGuest,
    updateMember: updateMember,
    refreshTier: refreshTier
  };
})();