TGI.Schema = (function () {
  var SCHEMA_VERSION = '1';
  var sheets = {
    Guests: ['guest_id','first_name','last_name','full_name','email','phone','country','language','date_of_birth','marketing_consent','status','source','first_seen_at','last_seen_at','visit_count','lifetime_value','notes','created_at','updated_at'],
    Stays: ['stay_id','guest_id','location','arrival_at','departure_at','party_size','booking_reference','room_or_table','spend','currency','experience_rating','nps_score','feedback','service_recovery_required','created_at','updated_at'],
    Preferences: ['preference_id','guest_id','category','value','confidence','source','first_observed_at','last_observed_at','created_at','updated_at'],
    Loyalty: ['loyalty_id','guest_id','tier','points_balance','lifetime_points','member_since','last_activity_at','created_at','updated_at'],
    ContactLog: ['contact_id','guest_id','channel','direction','subject','summary','outcome','owner_email','contacted_at','created_at'],
    Tasks: ['task_id','guest_id','title','description','priority','status','owner_email','due_at','completed_at','created_at','updated_at'],
    AI_Insights: ['insight_id','guest_id','insight_type','title','detail','confidence','model','generated_at','expires_at','status'],
    AuditLog: ['audit_id','entity_type','entity_id','action','actor_email','details_json','created_at']
  };

  function names() { return Object.keys(sheets); }
  function headers(name) {
    TGI.Util.assert(sheets[name], 'Unknown sheet: ' + name);
    return sheets[name].slice();
  }
  function primaryKey(name) { return headers(name)[0]; }
  function version() { return SCHEMA_VERSION; }

  return {
    names: names,
    headers: headers,
    primaryKey: primaryKey,
    version: version
  };
})();