TGI.PmsAdapterRegistryService = (function () {
  var adapters = {};

  function register(name, adapter) {
    name = String(name || '').toUpperCase();
    TGI.Util.assert(name, 'PMS adapter name is required.');
    TGI.Util.assert(adapter && typeof adapter.normalizeReservation === 'function', 'Adapter must implement normalizeReservation().');
    adapters[name] = adapter;
    return name;
  }

  function get(name) {
    return adapters[String(name || '').toUpperCase()] || null;
  }

  function names() {
    return Object.keys(adapters).sort();
  }

  function normalize(provider, payload, context) {
    var adapter = get(provider);
    TGI.Util.assert(adapter, 'Unsupported PMS provider: ' + provider);
    var normalized = adapter.normalizeReservation(payload || {}, context || {});
    validate_(normalized);
    return normalized;
  }

  function validate_(record) {
    TGI.Util.assert(record.external_reservation_id, 'External reservation ID is required.');
    TGI.Util.assert(record.property_id, 'Property ID is required.');
    TGI.Util.assert(record.arrival_date, 'Arrival date is required.');
    TGI.Util.assert(record.departure_date, 'Departure date is required.');
    return true;
  }

  return { register: register, get: get, names: names, normalize: normalize };
})();