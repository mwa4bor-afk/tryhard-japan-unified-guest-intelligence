TGI.PmsProviderAdapters = (function () {
  function text(v) { return v == null ? '' : String(v); }
  function date(v) { return v ? new Date(v) : ''; }
  function amount(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function base(provider, id, propertyId, arrival, departure, guest, status, total, currency, raw) {
    return {
      provider: provider,
      external_reservation_id: text(id),
      property_id: text(propertyId),
      arrival_date: date(arrival),
      departure_date: date(departure),
      status: text(status || 'CONFIRMED').toUpperCase(),
      guest_first_name: text(guest.first_name),
      guest_last_name: text(guest.last_name),
      guest_email: text(guest.email).toLowerCase(),
      guest_phone: text(guest.phone),
      total_amount: amount(total),
      currency: text(currency || 'JPY').toUpperCase(),
      raw_json: JSON.stringify(raw || {})
    };
  }

  var cloudbeds = {
    normalizeReservation: function (p, c) {
      var g = p.guest || p.guestDetails || {};
      return base('CLOUDBEDS', p.reservationID || p.id, c.property_id || p.propertyID, p.startDate || p.checkIn, p.endDate || p.checkOut,
        { first_name: g.firstName, last_name: g.lastName, email: g.email, phone: g.phone }, p.status, p.total || p.grandTotal, p.currency, p);
    }
  };

  var mews = {
    normalizeReservation: function (p, c) {
      var g = p.Customer || p.customer || {};
      return base('MEWS', p.Id || p.id, c.property_id || p.ServiceId || p.serviceId, p.StartUtc || p.startUtc, p.EndUtc || p.endUtc,
        { first_name: g.FirstName || g.firstName, last_name: g.LastName || g.lastName, email: g.Email || g.email, phone: g.Phone || g.phone }, p.State || p.state, p.TotalAmount || p.totalAmount, p.Currency || p.currency, p);
    }
  };

  var opera = {
    normalizeReservation: function (p, c) {
      var g = p.guest || p.primaryGuest || {};
      return base('OPERA', p.reservationId || p.confirmationNumber, c.property_id || p.hotelId || p.propertyId, p.arrivalDate, p.departureDate,
        { first_name: g.firstName, last_name: g.lastName, email: g.email, phone: g.phone }, p.reservationStatus || p.status, p.totalAmount || p.balance, p.currencyCode || p.currency, p);
    }
  };

  function install() {
    TGI.PmsAdapterRegistryService.register('CLOUDBEDS', cloudbeds);
    TGI.PmsAdapterRegistryService.register('MEWS', mews);
    TGI.PmsAdapterRegistryService.register('OPERA', opera);
    return TGI.PmsAdapterRegistryService.names();
  }

  return { install: install, cloudbeds: cloudbeds, mews: mews, opera: opera };
})();