// push-sw.js — the Vacation Auction's push alerts background file (build 547).
// Its ONE job: when an alert arrives, show it, even while the site is closed. It keeps no copies of pages,
// loads nothing and has no "fetch" handler, so the site itself works exactly as it does without it.
// The same file sits beside each staff page (/vacation/, /vacation/crna/, /vacation/testing/);
// crna-stamp.mjs copies it byte for byte. There is no Firebase in here: the mail server sends a plain
// web push whose words are { title, body, url }.

var FALLBACK_TITLE = 'Vacation Auction';

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
  event.waitUntil(self.registration.showNotification(title, { body: body, data: { url: url } }));
});

// The alert is tapped: close it, then bring the site forward — the window already showing it,
// if one is open, otherwise a new one at the alert's address (or this site's own address).
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var target = data.url || self.registration.scope;
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
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c && c.url && samePage(c.url, target) && typeof c.focus === 'function') return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
