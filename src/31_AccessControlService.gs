TGI.AccessControlService = (function () {
  var KEY = 'TGI_ACCESS_ROLES';
  var ROLES = { ADMIN: 'ADMIN', MANAGER: 'MANAGER', OPERATOR: 'OPERATOR', VIEWER: 'VIEWER' };
  var PERMISSIONS = {
    ADMIN: ['*'],
    MANAGER: ['dashboard.rebuild', 'dashboard.view', 'insights.generate', 'insights.view', 'tasks.manage', 'guests.merge', 'exports.create', 'privacy.review', 'operations.manage', 'reservations.import', 'reports.view', 'integrations.manage', 'integrations.enqueue', 'integrations.process'],
    OPERATOR: ['tasks.manage', 'contacts.create', 'guests.edit', 'insights.view', 'reservations.import', 'reports.view', 'integrations.enqueue'],
    VIEWER: ['dashboard.view', 'insights.view', 'reports.view']
  };

  function currentEmail() {
    return String(Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '').toLowerCase();
  }

  function load() {
    var raw = PropertiesService.getDocumentProperties().getProperty(KEY);
    return raw ? JSON.parse(raw) : {};
  }

  function save(map) {
    PropertiesService.getDocumentProperties().setProperty(KEY, JSON.stringify(map || {}));
    return map;
  }

  function bootstrap() {
    var map = load();
    var email = currentEmail();
    if (email && !Object.keys(map).length) {
      map[email] = ROLES.ADMIN;
      save(map);
      TGI.AuditLog.write('ACCESS_BOOTSTRAPPED', 'AccessControl', email, { role: ROLES.ADMIN });
    }
    return map;
  }

  function roleFor(email) {
    var map = bootstrap();
    return map[String(email || currentEmail()).toLowerCase()] || ROLES.VIEWER;
  }

  function can(permission, email) {
    var permissions = PERMISSIONS[roleFor(email)] || [];
    return permissions.indexOf('*') !== -1 || permissions.indexOf(permission) !== -1;
  }

  function requirePermission(permission) {
    if (!can(permission)) throw new Error('Access denied for permission: ' + permission);
    return true;
  }

  function setRole(email, role) {
    requirePermission('access.manage');
    role = String(role || '').toUpperCase();
    if (!ROLES[role]) throw new Error('Invalid role: ' + role);
    var map = load();
    map[String(email || '').toLowerCase()] = role;
    save(map);
    TGI.AuditLog.write('ACCESS_ROLE_SET', 'AccessControl', email, { role: role });
    return map;
  }

  function summary() {
    var map = bootstrap();
    return Object.keys(map).sort().map(function (email) { return { email: email, role: map[email] }; });
  }

  return { ROLES: ROLES, currentEmail: currentEmail, bootstrap: bootstrap, roleFor: roleFor, can: can, requirePermission: requirePermission, setRole: setRole, summary: summary };
})();