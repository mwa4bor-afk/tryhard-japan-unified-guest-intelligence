TGI.Util = (function () {
  function nowIso() { return new Date().toISOString(); }
  function uuid() { return Utilities.getUuid(); }
  function text(value) { return value == null ? '' : String(value).trim(); }
  function lower(value) { return text(value).toLowerCase(); }
  function email(value) { return lower(value); }
  function phone(value) { return text(value).replace(/[^0-9+]/g, ''); }
  function isEmail(value) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email(value)); }
  function normalizeDate(value) {
    if (!value) return '';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) throw new Error('Invalid date: ' + value);
    return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd');
  }
  function withDocumentLock(fn, timeoutMs) {
    var lock = LockService.getDocumentLock();
    lock.waitLock(timeoutMs || 30000);
    try { return fn(); } finally { lock.releaseLock(); }
  }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  return {
    nowIso: nowIso,
    uuid: uuid,
    text: text,
    lower: lower,
    email: email,
    phone: phone,
    isEmail: isEmail,
    normalizeDate: normalizeDate,
    withDocumentLock: withDocumentLock,
    assert: assert
  };
})();