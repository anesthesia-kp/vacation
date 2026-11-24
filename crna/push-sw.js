// push-sw.js — the Vacation Auction's push alerts background file (build 547; the Home Screen badge, build 548; the Auction Alert hand-over, build 549).
// Its job: when an alert arrives, show it, even while the site is closed, and keep the Home Screen icon's red number. It keeps no copies of pages,
// loads nothing and has no "fetch" handler, so the site itself works exactly as it does without it.
// The same file sits beside each staff page (/vacation/, /vacation/crna/, /vacation/testing/);
// crna-stamp.mjs copies it byte for byte. There is no Firebase in here: the mail server sends a plain
// web push whose words are { title, body, url, text }.

var FALLBACK_TITLE = 'Auction Alert'; // [551 · §551]

// [548] B1 The Home Screen icon's red number: how many of this site's alerts are showing. Only where the device has it
// (setAppBadge); any failure is ignored, and it never stops an alert from showing or a tap from opening the site.
function setBadge() {
  try {
    var nav = self.navigator;
    if (!nav || typeof nav.setAppBadge !== 'function' || typeof self.registration.getNotifications !== 'function') return Promise.resolve();
    return self.registration.getNotifications().then(function (list) {
      var n = (list && list.length) || 0;
      if (n > 0) return nav.setAppBadge(n);
      if (typeof nav.clearAppBadge === 'function') return nav.clearAppBadge();
      return nav.setAppBadge(0);
    }).catch(function () {});
  } catch (e) { return Promise.resolve(); }
}

// [551 · §552] A tap clears the icon's red number outright (alerts stay listed); a new alert sets it again. Failures ignored.
function clearBadge() {
  try {
    var nav = self.navigator;
    if (nav && typeof nav.clearAppBadge === 'function') return nav.clearAppBadge().catch(function () {});
    if (nav && typeof nav.setAppBadge === 'function') return nav.setAppBadge(0).catch(function () {});
  } catch (e) {}
  return Promise.resolve();
}

// [549] The tapped alert's whole e-mail, for this site's page (its "Auction Alert" box). It is kept in a store named by THIS
// registration's scope — the three sites share one web address, so each site's page reads only its own — where a page that opens
// fresh finds it (the page deletes it when it reads it; the next tap writes over it). Any failure is ignored: the tap still opens the site.
var ALERT_STORE = 'kp-auction-alert ';
function storeAlert(text) {
  try {
    if (typeof text !== 'string' || !text || !self.caches) return Promise.resolve();
    var scope = self.registration.scope;
    return self.caches.open(ALERT_STORE + scope).then(function (c) {
      return c.put(scope + 'auction-alert', new Response(JSON.stringify({ text: text, at: Date.now() }), { headers: { 'Content-Type': 'application/json' } }));
    }).catch(function () {});
  } catch (e) { return Promise.resolve(); }
}

// An alert arrives. ALWAYS show a notification, even when the message is empty or unreadable:
// iPhones take away a site's permission when a push shows nothing.
self.addEventListener('push', function (event) {
  var j = {};
  try {
    j = event.data ? event.data.json() : {};
  } catch (e) {
    // Not JSON: use the plain text, if any, as the alert's text.
    try { j = { body: event.data.text() }; } catch (e2) { j = {}; }
  }
  if (!j || typeof j !== 'object') j = {};
  // The server's message keeps its words under "data"; words at the top level are read too.
  var d = (j.data && typeof j.data === 'object') ? j.data : j;
  var title = (typeof d.title === 'string' && d.title.trim()) ? d.title : FALLBACK_TITLE;
  var body = (typeof d.body === 'string') ? d.body : '';
  var url = (typeof d.url === 'string') ? d.url : '';
  var text = (typeof d.text === 'string') ? d.text : ''; // [549] the e-mail's whole text, kept with the alert for its tap
  event.waitUntil(self.registration.showNotification(title, { body: body, data: { url: url, text: text } }).then(setBadge)); // [548] B1 the badge after it shows
});

// The alert is tapped: close it, then bring the site forward — the window already showing it,
// if one is open, otherwise a new one at the alert's address (or this site's own address).
// [549] The e-mail's text is stored for this site's page first (beside finding the window), and also sent to the window that comes forward.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var target = data.url || self.registration.scope;
  var text = (typeof data.text === 'string') ? data.text : ''; // [549]
  // Compare addresses without "?…" or "#…", and treat ".../" and ".../index.html" as the same page.
  // (Only the same page counts: the admin page and the CRNA and testing sites sit inside the MD
  // site's folder, and must not be the window that comes forward for an MD alert.)
  function samePage(a, b) {
    function clean(u) {
      try { u = new URL(u, self.registration.scope).href; } catch (e) { return String(u); }
      return u.split('#')[0].split('?')[0].replace(/index\.html$/, '');
    }
    return clean(a) === clean(b);
  }
  event.waitUntil(Promise.all([
    Promise.all([storeAlert(text), self.clients.matchAll({ type: 'window', includeUncontrolled: true })]).then(function (r) { // [549] stored before the page is told or opened
      var list = r[1] || [];
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c && c.url && samePage(c.url, target) && typeof c.focus === 'function') {
          if (text) { try { c.postMessage({ type: 'kp-auction-alert', scope: self.registration.scope, text: text }); } catch (e) {} } // [549]
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
    clearBadge() // [551 · §552] the number cleared outright, beside the opening (548 B1 lowered it to the alerts still listed)
  ]));
});
