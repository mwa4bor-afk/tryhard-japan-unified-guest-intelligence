TGI.ConfigService = (function () {
  var PREFIX = 'TGI_CONFIG_';
  var DEFAULTS = {
    DEFAULT_CURRENCY: 'JPY',
    DEFAULT_LANGUAGE: 'ja',
    DEFAULT_LOCATION: 'TryHard Japan',
    DUPLICATE_SCORE_THRESHOLD: '60',
    RECOVERY_DUE_HOURS: '24',
    LAPSED_GUEST_DAYS: '180',
    VIP_LIFETIME_VALUE: '100000',
    HIGH_VALUE_LIFETIME_VALUE: '50000',
    DAILY_REFRESH_HOUR: '6',
    AUTOMATION_ENABLED: 'true'
  };

  function get(key) {
    TGI.Util.assert(DEFAULTS.hasOwnProperty(key), 'Unknown configuration key: ' + key);
    var value = PropertiesService.getDocumentProperties().getProperty(PREFIX + key);
    return value === null ? DEFAULTS[key] : value;
  }

  function getNumber(key) {
    var value = Number(get(key));
    TGI.Util.assert(!isNaN(value), 'Configuration value is not numeric: ' + key);
    return value;
  }

  function getBoolean(key) {
    return /^(true|1|yes)$/i.test(String(get(key)));
  }

  function set(key, value) {
    TGI.Util.assert(DEFAULTS.hasOwnProperty(key), 'Unknown configuration key: ' + key);
    PropertiesService.getDocumentProperties().setProperty(PREFIX + key, String(value));
    TGI.AuditLog.write('Configuration', key, 'UPDATE', { value: String(value) });
    return get(key);
  }

  function reset(key) {
    TGI.Util.assert(DEFAULTS.hasOwnProperty(key), 'Unknown configuration key: ' + key);
    PropertiesService.getDocumentProperties().deleteProperty(PREFIX + key);
    return get(key);
  }

  function all() {
    var result = {};
    Object.keys(DEFAULTS).forEach(function (key) { result[key] = get(key); });
    return result;
  }

  function validate() {
    var errors = [];
    ['DUPLICATE_SCORE_THRESHOLD','RECOVERY_DUE_HOURS','LAPSED_GUEST_DAYS','VIP_LIFETIME_VALUE','HIGH_VALUE_LIFETIME_VALUE','DAILY_REFRESH_HOUR']
      .forEach(function (key) {
        if (isNaN(Number(get(key)))) errors.push(key + ' must be numeric.');
      });
    var hour = Number(get('DAILY_REFRESH_HOUR'));
    if (hour < 0 || hour > 23) errors.push('DAILY_REFRESH_HOUR must be between 0 and 23.');
    return { valid: errors.length === 0, errors: errors, values: all() };
  }

  return { get: get, getNumber: getNumber, getBoolean: getBoolean, set: set, reset: reset, all: all, validate: validate };
})();