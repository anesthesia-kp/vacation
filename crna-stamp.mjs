#!/usr/bin/env node
// crna-stamp.mjs — generates the CRNA SITE and the TESTING SITE from the MD pages.
//
// [three sites · DECISIONS §386, §451–§454, 14 Nov 2026] Two copies, each made from the same MD pages:
//   · CRNA    → crna/     served at /vacation/crna/ and /vacation/crna/admin/; Firebase project
//               crna-vacation (crna-config.json); browser-storage prefix "crna"; the CRNA labels;
//               App Check through reCAPTCHA v3, like the MD site.
//   · TESTING → testing/  served at /vacation/testing/ and /vacation/testing/admin/; Firebase project
//               testing-vacation (testing-config.json); storage prefix "tst"; the testing labels (its
//               staff line and admin heading in oxblood, §461); App Check through Fraud Defense (reCAPTCHA Enterprise) — a new
//               project can no longer register reCAPTCHA v3 in App Check (PLAN §8, DECISIONS §454).
// The script keeps its old name on purpose (§321 Q1): nobody sees it, and the suites name it.
//
// THE RULE (owner, 17 Aug 2026): "I want all the code to come from my main vacation repo
// so that the 2 sites remain identical other than users." This script is how that stays
// TRUE rather than intended: every copy is GENERATED from index.html and admin/index.html with
// a fixed, named set of transforms — and nothing else. Never hand-edit a crna/ or testing/ file;
// edit the MD page and re-run:
//
//     node crna-stamp.mjs
//
// tests/test-crna-stamp.mjs regenerates the same output and fails the battery if a committed
// copy doesn't match — so an MD build that forgets to re-stamp goes red.
//
// THE TRANSFORMS, and why each exists (applied to each copy with that copy's own settings):
//   1. FIREBASE CONFIG — swapped for the copy's project (from its config file).
//      Separate users, bids, alerts, admins. Their own database entirely.
//   1b. APP CHECK — the copy's own site key; for the testing copy also the Fraud Defense
//      provider (ReCaptchaEnterpriseProvider) in place of ReCaptchaV3Provider.
//   2. BROWSER-STORAGE KEYS — renamed with the copy's prefix. All three sites live on ONE web
//      origin (anesthesia-kp.github.io), so localStorage/sessionStorage are SHARED: unrenamed,
//      one site's cached auction config would poison another's. Every key is renamed; a canary
//      pass proves none survived, and the two copies' prefixes never meet.
//   3. LABELS — the owner's approved wording: CRNA (17 Aug 2026; §452 T8) and testing (§321), and
//      the site's name in the staff page's line under the title (§461: MD → CRNA / Testing); the
//      testing copy's staff line and admin heading in oxblood (§461; the red band of §321 removed).
//   4. CROSS-LINKS — the admin page's link to the staff page points at the copy's own folder,
//      so nobody hops from a copy into the real site without noticing.
//   5. versions.json — a copy in each folder, same build numbers (identical code = same builds).
//      The stale-build gate works unchanged (both pages fetch it relatively).
//   6. PUSH ALERTS [547 · push] — the staff page's public push key, the one line
//      `const PUSH_VAPID_KEY = "…";`, swapped for the copy's own (its config's "vapidKey"; "" = push alerts
//      off on that copy: the menu item stays hidden and no push code runs), and push-sw.js — the background
//      file that shows an alert — copied beside the copy's staff page byte for byte. A push key is public by
//      design; only a public key's shape is accepted (87 letters, digits, - and _), so the 43-character
//      PRIVATE key can never be pasted into a config by mistake.
//   7. HOME SCREEN ICON, NAME AND WEB-APP SETTINGS FILE [547 · icons] — each page's <head> carries its Home Screen icon
//      (<link rel="apple-touch-icon">, img/app-icons/<site>-<page>-180.png), its Home Screen name (<meta name="apple-mobile-web-app-title">)
//      and <link rel="manifest" href="manifest.webmanifest"> — a RELATIVE address, so each page reads the settings file in its OWN folder.
//      The copy's icon and name replace the MD ones (the icon one folder further up, like the pictures), and the copy's two settings
//      files are made from the MD ones (manifest.webmanifest, admin/manifest.webmanifest): the copy's name, colour, icons and an id of its
//      own (/vacation/<folder>/…, an absolute path, so no two of the six ever share one). Shared origin: a settings file applies only to
//      the pages that link it; its scope is its own folder (start_url and scope "./"), so a copy's installed app is its own folder.
//      The MD icons and names, and the other copy's, are FORBIDDEN in a copy's pages and settings files.
//
//   NOT transformed, deliberately: LEAD_ADMIN_EMAIL (dr.vacation.goddess@gmail.com stays
//   the unremovable lead admin on EVERY site); every line of application logic. E-mail links
//   are chosen by each project's mail server (§452 T7), not by the pages.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fail = m => { console.error('⛔ STAMP ABORTED: ' + m); process.exit(1); };
const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

// ── THE COPIES ─────────────────────────────────────────────────────────────────────────
// prefix: the browser-storage prefix (shared origin). labels: [staff <title>, admin heading words,
// admin <title>]. site: the name in the staff page's line under the title. color: that whole line's
// and the admin heading's colour (null = the page's own). provider: the App Check provider class.
const COPIES = [
  { name: 'CRNA',    folder: 'crna',    config: 'crna-config.json',    prefix: 'crna', site: 'CRNA',    color: null,      provider: 'ReCaptchaV3Provider',
    labels: ['CRNA Vacation Auction — Department of Anesthesia', 'Dashboard CRNA Vacation Auction', 'CRNA Vacation Auction Admin'],
    app: { staff: { name: 'CRNA Vac', icon: 'crna-staff', color: '#2F6690' }, admin: { name: 'CRNA Admin', icon: 'crna-admin', color: '#2E343C' } } }, // [547 · icons] the owner's names, 22 Nov 2026
  { name: 'TESTING', folder: 'testing', config: 'testing-config.json', prefix: 'tst',  site: 'Testing', color: '#5C1F15', provider: 'ReCaptchaEnterpriseProvider',
    labels: ['Testing Site — Vacation Auction', 'Dashboard Testing Site', 'Testing Site — Vacation Auction Admin'],
    app: { staff: { name: 'Testing', icon: 'testing-staff', color: '#C98A2E' }, admin: { name: 'Test Admin', icon: 'testing-admin', color: '#2E343C' } } }, // [547 · icons]
];

const MD = {
  staff: readFileSync(join(here, 'index.html'), 'utf8'),
  admin: readFileSync(join(here, 'admin', 'index.html'), 'utf8'),
};
const versions = JSON.parse(readFileSync(join(here, 'versions.json'), 'utf8'));

// The MD values every copy must lose (read out of the page, never hardcoded, so they cannot drift).
const MD_FB = {};
for (const k of REQUIRED) {
  const m = MD.staff.match(new RegExp(k + ':"([^"]+)"'));
  if (!m) fail('could not read MD firebase field ' + k + ' from index.html');
  MD_FB[k] = m[1];
}
const MD_APPCHECK = ((MD.staff.match(/APPCHECK_SITE_KEY\s*=\s*"([^"]+)"/) || [])[1]) || fail('could not read the MD App Check site key (APPCHECK_SITE_KEY) from index.html');
// [547 · push] The MD public push key: exactly ONE line `const PUSH_VAPID_KEY = "…";` on the staff page ("" until the Firebase console
// step = push alerts off); the admin page carries none. And push-sw.js, the background file every copy gets byte for byte.
const VAPID_OK = k => typeof k === 'string' && (k === '' || /^[A-Za-z0-9_-]{80,100}$/.test(k));
const MD_VAPID_HITS = [...MD.staff.matchAll(/const PUSH_VAPID_KEY = "([^"\\\n]*)";/g)];
if (MD_VAPID_HITS.length !== 1) fail('the staff page must carry exactly one line const PUSH_VAPID_KEY = "…"; (found ' + MD_VAPID_HITS.length + ')');
if (MD.admin.includes('PUSH_VAPID_KEY')) fail('the admin page names PUSH_VAPID_KEY — only the staff page\'s one line is swapped; handle it deliberately');
const MD_VAPID = MD_VAPID_HITS[0][1];
if (!VAPID_OK(MD_VAPID)) fail('the MD PUSH_VAPID_KEY is neither "" nor a public push key (87 letters, digits, - and _)');
if (!existsSync(join(here, 'push-sw.js'))) fail('push-sw.js (the push alerts background file) is missing beside index.html');
const PUSH_SW = readFileSync(join(here, 'push-sw.js'));
// [547 · icons] The MD Home Screen icon, name and settings file of each page: exactly one of each line, and the settings file in the page's
// own folder in the exact shape the copies are made from (a changed shape stops the stamp — update the stamper deliberately).
const APP_KEYS = ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color', 'icons'];
const MD_APP = {};
for (const page of ['staff', 'admin']) {
  const up = page === 'staff' ? '' : '../', dir = page === 'staff' ? '' : 'admin/';
  const ic = [...MD[page].matchAll(/<link rel="apple-touch-icon" href="((?:\.\.\/)*)img\/app-icons\/([a-z]+-(?:staff|admin))-180\.png">/g)];
  const nm = [...MD[page].matchAll(/<meta name="apple-mobile-web-app-title" content="([^"<>]+)">/g)];
  if (ic.length !== 1 || (MD[page].match(/apple-touch-icon/g) || []).length !== 1 || ic[0][1] !== up || !ic[0][2].endsWith('-' + page))
    fail(`the MD ${page} page must carry exactly one <link rel="apple-touch-icon" href="${up}img/app-icons/<site>-${page}-180.png"> [547 · icons]`);
  if (nm.length !== 1 || (MD[page].match(/apple-mobile-web-app-title/g) || []).length !== 1) fail(`the MD ${page} page must carry exactly one <meta name="apple-mobile-web-app-title" content="…"> [547 · icons]`);
  if (MD[page].split('<link rel="manifest" href="manifest.webmanifest">').length !== 2 || (MD[page].match(/rel="manifest"/g) || []).length !== 1)
    fail(`the MD ${page} page must carry exactly one <link rel="manifest" href="manifest.webmanifest"> (its own folder's file) [547 · icons]`);
  const p = join(here, dir + 'manifest.webmanifest');
  if (!existsSync(p)) fail(`${dir}manifest.webmanifest (the MD ${page} page's web-app settings file) is missing [547 · icons]`);
  let man; try { man = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { fail(`${dir}manifest.webmanifest is not valid JSON: ${e.message} [547 · icons]`); }
  const icon = ic[0][2], name = nm[0][1], id = '/vacation/' + dir;
  const srcOk = i => i && typeof i.src === 'string' && new RegExp('^' + up.replace(/\./g, '\\.') + 'img/app-icons/' + icon + '-(192|512)\\.png$').test(i.src);
  if (JSON.stringify(Object.keys(man)) !== JSON.stringify(APP_KEYS) || man.id !== id || man.name !== name || man.short_name !== name || man.start_url !== './'
      || man.scope !== './' || man.display !== 'standalone' || !/^#[0-9A-Fa-f]{6}$/.test(man.background_color) || !Array.isArray(man.icons) || !man.icons.length || !man.icons.every(srcOk))
    fail(`${dir}manifest.webmanifest is not in the shape the copies are made from (keys ${APP_KEYS.join(', ')}; id ${id}; name and short_name "${name}"; start_url and scope "./"; standalone; icons ${up}img/app-icons/${icon}-192/512.png) [547 · icons]`);
  MD_APP[page] = { up, dir, icon, name, man };
}

// Each copy's own settings, read once, so each copy can also refuse the OTHER copy's values.
const CFG = {};
for (const c of COPIES) {
  const p = join(here, c.config);
  if (!existsSync(p)) fail(c.config + ' is missing. Create it (the ' + c.name + ' project config) first.');
  CFG[c.name] = JSON.parse(readFileSync(p, 'utf8'));
  // [547 · push] "vapidKey" is REQUIRED in a live copy's config: "" (push alerts off there) or the copy's own PUBLIC push key.
  if (CFG[c.name].suspended !== true && typeof CFG[c.name].vapidKey !== 'string') fail(c.config + ' has no "vapidKey" — add "vapidKey": "" (it stays "" until the Firebase console step).');
  if (CFG[c.name].suspended !== true && !VAPID_OK(CFG[c.name].vapidKey)) fail(c.config + ' "vapidKey" is not a public push key (87 letters, digits, - and _) — the PRIVATE key never goes here.');
}

// ── 2 · Browser-storage keys: rename EVERY one (shared origin!) ──
// counts pinned from the 17 Aug inventory of builds 139/269; a count change means the
// MD pages changed — update deliberately. The new name is built from the copy's prefix:
// a camel-case key gets the prefix in front with its first letter raised; a key with a
// separator keeps it ("vrl-" → "crna-vrl-"; "vk_lastUser" → "crna_vk_lastUser").
const KEYS = [
  //  [literal, staffCount, adminCount, newName(prefix)]
  ["'auctionConfigV1'", 2, 2, p => `'${p}AuctionConfigV1'`],
  ['"vk_lastUser"', 1, 0, p => `"${p}_vk_lastUser"`],
  ["'adminRemembered'", 0, 5, p => `'${p}AdminRemembered'`],
  ["'insightsView'", 0, 2, p => `'${p}InsightsView'`],
  ["'acReloadedFor'", 2, 2, p => `'${p}AcReloadedFor'`],
  ['"vrl-"', 2, 2, p => `"${p}-vrl-"`],
  ["'rbgate-'", 1, 1, p => `'${p}-rbgate-'`],
  // [testing site · 31 Oct 2026] two names added to the MD pages since August
  ["'reportsView'", 0, 2, p => `'${p}ReportsView'`],   // admin: the capacity report's view
  ["'vacVisit'", 1, 0, p => `'${p}VacVisit'`],         // staff: VISIT_LS, the visit record
  ["'srSeen.'", 2, 0, p => `'${p}SrSeen.'`],
  ["'kp_push_dev'", 2, 0, p => `'${p}_kp_push_dev'`], // [547 · push] staff: this browser's push alerts device id
];

// [stamp guard v2 · audit LOW, 20 Aug 2026] variable-keyed storage calls, pinned by count …
const VARKEY_PIN = { staff: 11, admin: 2 }; // counted at MD builds 156/290; staff 9 → 11 at 235 (VISIT_LS, renamed in the table above)
// [v3 · RA-L3, 20 Aug 2026] … and by the exact identifier set (a count-preserving swap sailed through v2).
const VARKEY_NAMES = { staff: ['REMEMBER_KEY', 'VISIT_LS', 'k'], admin: ['k'] }; // read from MD builds 158/294; VISIT_LS added at staff 235

// Every copy is made and checked first; only when ALL of them pass is anything written, so a
// guard that stops one copy never leaves the other freshly written beside a stale one (review LOW).
const results = COPIES.map(stampCopy);
for (const r of results) {
  if (r.src) {
    mkdirSync(join(r.OUT, 'admin'), { recursive: true });
    writeFileSync(join(r.OUT, 'index.html'), r.src.staff);
    writeFileSync(join(r.OUT, 'admin', 'index.html'), r.src.admin);
    writeFileSync(join(r.OUT, 'versions.json'), JSON.stringify(versions));
    writeFileSync(join(r.OUT, 'push-sw.js'), PUSH_SW);   // [547 · push] the same bytes as the MD file
    writeFileSync(join(r.OUT, 'manifest.webmanifest'), r.app.staff);            // [547 · icons] the copy's own web-app settings files
    writeFileSync(join(r.OUT, 'admin', 'manifest.webmanifest'), r.app.admin);
  }
  console.log(r.msg);
}

function stampCopy(copy) {
  const CFGc = CFG[copy.name];
  const OUT = join(here, copy.folder);
  // [26 Aug 2026 · owner ruling, DECISIONS §118] A SUSPENDED copy is not stamped: its folder is
  // deliberately absent from the repo so GitHub Pages serves 404 for both addresses. Not an error.
  if (CFGc.suspended === true) return { msg: `⏸ ${copy.name} suspended (${copy.config} "suspended": true) — nothing stamped, ${copy.folder}/ stays absent.` };

  const FB = CFGc.firebase || {};
  const placeholder = REQUIRED.some(k => !FB[k] || String(FB[k]).includes('REPLACE_ME'));
  if (placeholder) {
    console.log(`⚠️  ${copy.config} still holds REPLACE_ME values — stamping anyway for the`);
    console.log(`   working tree, but DO NOT PUSH ${copy.folder}/ until the real Firebase config is in.`);
  }

  // ── transform machinery: every replacement states how many times it MUST hit ──
  const src = { staff: MD.staff, admin: MD.admin };
  function rep(page, from, to, exactly) {
    const n = src[page].split(from).length - 1;
    if (n !== exactly) fail(`${copy.name}: "${String(from).slice(0, 60)}" found ${n}× in ${page}, expected ${exactly}. The MD page changed shape — update the stamper deliberately, never silently.`);
    src[page] = src[page].split(from).join(to);
  }
  const P = copy.prefix;
  const ADDR = `https://anesthesia-kp.github.io/vacation/${copy.folder}/`;

  // ── 1 · Firebase config: replace each MD field value with the copy's ──
  for (const k of REQUIRED) {
    const to = FB[k] || ('REPLACE_ME_' + k);
    rep('staff', `${k}:"${MD_FB[k]}"`, `${k}:"${to}"`, 1);
    rep('admin', `${k}:"${MD_FB[k]}"`, `${k}:"${to}"`, 1);
  }

  // ── 1b · App Check: the copy's own site key, and its provider ──
  // Each copy is a SEPARATE Firebase project, so it needs its OWN reCAPTCHA key — an MD key
  // would simply fail to attest there. (History: until build 281/146 this slot swapped the auth
  // domain quoted in a sign-in help note; that note was replaced on 19 Aug 2026, §64, and
  // MD_FB.authDomain is a FORBIDDEN token below instead — strictly stronger.)
  {
    const to = CFGc.appCheckSiteKey || 'REPLACE_ME_appCheckSiteKey';
    if (String(to).startsWith('REPLACE_ME')) {
      console.log(`⚠️  ${copy.config} has no appCheckSiteKey — stamping a placeholder.`);
      console.log(`   DO NOT PUSH ${copy.folder}/ until the real reCAPTCHA site key is in.`);
    }
    rep('staff', '"' + MD_APPCHECK + '"', '"' + to + '"', 1);
    rep('admin', '"' + MD_APPCHECK + '"', '"' + to + '"', 1);
    // [§454, 14 Nov 2026] the testing project is registered with Fraud Defense: its pages ask that
    // provider (same Firebase library file, same site key slot, same auto-refresh) — the import and
    // the one `new …(APPCHECK_SITE_KEY)`, twice per page.
    if (copy.provider !== 'ReCaptchaV3Provider') {
      rep('staff', 'ReCaptchaV3Provider', copy.provider, 2);
      rep('admin', 'ReCaptchaV3Provider', copy.provider, 2);
    }
  }

  // ── 1c · [547 · push] the public push key: the copy's own ("" = push alerts off on that copy) ──
  rep('staff', `const PUSH_VAPID_KEY = "${MD_VAPID}";`, `const PUSH_VAPID_KEY = "${CFGc.vapidKey}";`, 1);

  // ── 2 · Browser-storage keys ──
  for (const [lit, ns, na, to] of KEYS) {
    if (ns) rep('staff', lit, to(P), ns);
    if (na) rep('admin', lit, to(P), na);
  }

  // ── 3 · Labels — the owner's exact wording ──
  // [build 274 · C7] The MD pages carry their own labels, so these rules SWAP MD → the copy's.
  // [259 · §461] The staff page names its site in the line under the title ("Dept. of Anesthesia · MD · 2027");
  // the copy's name replaces it, and a copy with a colour (testing: oxblood) gets it on that WHOLE line and
  // on its admin heading. An inline colour beats the page's own (the redesign rule skips styled elements).
  const COLOR = copy.color ? `color:${copy.color}` : '';
  rep('staff', '<p class="header-sub">Dept. of Anesthesia &nbsp;·&nbsp; <span id="siteLabel">MD</span>',
               `<p class="header-sub"${COLOR ? ` style="${COLOR}"` : ''}>Dept. of Anesthesia &nbsp;·&nbsp; <span id="siteLabel">${copy.site}</span>`, 1);
  rep('staff', '<title>MD Vacation Auction — Department of Anesthesia</title>', `<title>${copy.labels[0]}</title>`, 1);
  rep('admin', '<div class="page-title" style="margin:0">Dashboard MD Vacation Auction — <span id="acYearHdr">2027</span></div>',
               `<div class="page-title" style="margin:0${COLOR ? ';' + COLOR : ''}">${copy.labels[1]} — <span id="acYearHdr">2027</span></div>`, 1);
  rep('admin', '<title>MD Vacation Auction Admin</title>', `<title>${copy.labels[2]}</title>`, 1);
  rep('admin', "const SITE_SHORT='MD';", `const SITE_SHORT='${copy.site}';`, 1); // [428 · RA-13 F2 · §463] the short name a backup records and its file name carries

  // ── 3c · RELATIVE FILE ADDRESSES ──
  // Each copy is served one folder below the MD page, so a relative address would look for its
  // file inside the copy's folder. Each points one folder up, at the MD site's own file.
  rep('staff', 'url(fonts/', 'url(../fonts/', 2);                          // the two font files
  rep('staff', "'img/destinations/'", "'../img/destinations/'", 1);         // the destination pictures
  rep('admin', 'url(../fonts/', 'url(../../fonts/', 4);                    // the two font files, twice

  // ── 7 · [547 · icons] Home Screen icon, name and web-app settings file: the copy's own ──
  // The icon sits one folder further up, like the pictures; the manifest link stays relative, so it reads the copy's own folder's file,
  // which is made here from the MD one: the copy's name, colour, icons and its own id. Nothing else in it changes.
  const app = {};
  for (const page of ['staff', 'admin']) {
    const md = MD_APP[page], cp = copy.app[page];
    rep(page, `<link rel="apple-touch-icon" href="${md.up}img/app-icons/${md.icon}-180.png">`, `<link rel="apple-touch-icon" href="../${md.up}img/app-icons/${cp.icon}-180.png">`, 1);
    rep(page, `<meta name="apple-mobile-web-app-title" content="${md.name}">`, `<meta name="apple-mobile-web-app-title" content="${cp.name}">`, 1);
    rep(page, '<link rel="manifest" href="manifest.webmanifest">', '<link rel="manifest" href="manifest.webmanifest">', 1);   // relative: the copy's own file
    const m = JSON.parse(JSON.stringify(md.man));
    m.id = `/vacation/${copy.folder}/${md.dir}`;
    m.name = cp.name; m.short_name = cp.name;
    m.background_color = cp.color; m.theme_color = cp.color;
    m.icons = m.icons.map(i => Object.assign({}, i, { src: i.src.replace(`${md.up}img/app-icons/${md.icon}-`, `../${md.up}img/app-icons/${cp.icon}-`) }));
    // the copy's file, checked as a browser reads it: scope = its own folder; every icon is the copy's, at /vacation/img/app-icons/
    const at = `https://h/vacation/${copy.folder}/${md.dir}manifest.webmanifest`;
    if (new URL(m.scope, at).pathname !== `/vacation/${copy.folder}/${md.dir}` || new URL(m.start_url, at).pathname !== `/vacation/${copy.folder}/${md.dir}`
        || !m.icons.every(i => new RegExp(`^/vacation/img/app-icons/${cp.icon}-(192|512)\\.png$`).test(new URL(i.src, at).pathname)))
      fail(`${copy.name}: the ${page} web-app settings file does not stay inside /vacation/${copy.folder}/${md.dir} with the ${copy.name} icons [547 · icons]`);
    app[page] = JSON.stringify(m, null, 2) + '\n';
  }

  // ── 4 · Cross-link: the admin page's link to the staff page stays inside the copy ──
  // The staff page carries no link to the admin page (nothing to swap there — the link guard
  // below still refuses any MD link that appears).
  rep('admin', 'https://anesthesia-kp.github.io/vacation/?portal=1', ADDR + '?portal=1', 1);

  // ── 2b · BAKED-IN DATA: the MD roster is hardcoded as `names`' starting value in BOTH
  // pages. On the MD site the database overwrites it instantly; on a copy an empty database
  // means the page KEEPS it (the missing-doc guard) — so the MD roster appeared on the CRNA
  // site on release day, 17 Aug. Every copy starts EMPTY: its roster comes only from its own
  // database, entered by its admin.
  for (const page of ['staff', 'admin']) {
    const m = src[page].match(/let names\s*=\s*\[[^\]]*\];/);
    if (!m) fail(copy.name + ': could not find the hardcoded names array in ' + page);
    src[page] = src[page].replace(m[0], `let names=[]; // [${copy.name}] no baked-in roster — the ${FB.projectId || 'copy\'s'} database is the only source`);
  }
  { // canary: no trace of the MD initials list may survive
    const probe = '"AD","ADG","AF"';
    for (const page of ['staff', 'admin']) if (src[page].includes(probe)) fail(`MD roster initials survived in the ${copy.name} ${page} page`);
  }

  // ── GENERIC STORAGE GUARD (owner: "paramount that the sites never contaminate each
  // other", 17 Aug). The named-key list above covers every key that exists TODAY. This scan
  // covers every key that exists EVER: any literal storage key in the copy that does not start
  // with the copy's prefix ABORTS the stamp — until the new key is added to the table, deliberately.
  const prefixed = new RegExp('^' + P, 'i');
  for (const page of ['staff', 'admin']) {
    const calls = src[page].match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*(['"])((?:(?!\1).)*)\1/g) || [];
    for (const c of calls) {
      const key = c.match(/\(\s*['"]([^'"]*)['"]/)[1];
      if (!prefixed.test(key)) fail(`generic storage guard: literal key "${key}" in the ${copy.name} ${page} page is not ${P}-prefixed — a NEW storage key was added to the MD pages; add it to the rename table.`);
    }
    // keys built from a prefix string (e.g. "crna-vrl-" + PAGE): the two known prefixes are pinned here.
    if (/['"]vrl-['"]/.test(src[page]) || /['"]rbgate-['"]/.test(src[page]))
      fail(`generic storage guard: an un-renamed storage-key prefix survived in the ${copy.name} ${page} page`);
  }

  // ── [stamp guard v2] the variable-keyed count, pinned per page ──
  for (const page of ['staff', 'admin']) {
    const total   = (src[page].match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(/g) || []).length;
    const literal = (src[page].match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*['"]/g) || []).length;
    const varkeyed = total - literal;
    if (varkeyed !== VARKEY_PIN[page])
      fail(`generic storage guard v2: the ${copy.name} ${page} page has ${varkeyed} variable-keyed storage call sites (pinned ${VARKEY_PIN[page]}) — a storage key was added or removed via a variable; put it in the rename table and bump the pin deliberately.`);
  }

  // ── [v3 · RA-L3] the variable-keyed identifier SET, pinned per page ──
  for (const page of ['staff', 'admin']) {
    const seen = [...new Set([...src[page].matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*([A-Za-z_$][\w$]*)/g)].map(m => m[1]))].sort();
    const pin = [...VARKEY_NAMES[page]].sort();
    if (JSON.stringify(seen) !== JSON.stringify(pin))
      fail(`generic storage guard v3: the ${copy.name} ${page} page's variable-keyed storage identifiers are [${seen}] but the pin says [${pin}] — a storage call was repointed at a new variable; add it to VARKEY_NAMES and the rename table deliberately.`);
  }

  // ── 4b · NO SCHEDULING LINKS on a copy (owner, 18 Aug 2026: "for now, they do not belong
  // there" — the Daily Schedule is an MD tool). Both entries in the admin's Other Systems card
  // are removed; the guard below then refuses ANY /schedule/ link that ever tries to ride back in.
  rep('admin', '      <a href="https://anesthesia-kp.github.io/schedule/?portal=1" target="_blank" rel="noopener">User Scheduling →</a>\n', '', 1);
  {
    const i = src.admin.indexOf('<a id="otherSysSchedAdmin"');
    if (i < 0) fail(copy.name + ': scheduling-admin link anchor not found');
    const j = src.admin.indexOf('</a>', i);
    src.admin = src.admin.slice(0, i) + `<!-- [${copy.name}] Scheduling Admin link removed — MD tool -->` + src.admin.slice(j + 4);
  }

  // ── GENERIC LINK GUARD: a copy may link only inside its OWN folder ──
  // Any absolute /vacation/ address must be /vacation/<folder>/… — a future MD build that adds a
  // new self-link cannot silently point a copy's users at another site.
  const esc = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  for (const page of ['staff', 'admin']) {
    const links = src[page].match(/https:\/\/anesthesia-kp\.github\.io\/vacation\/[^"'\s)]*/g) || [];
    for (const u of links) if (!u.startsWith(ADDR)) fail(`generic link guard: the ${copy.name} ${page} page links outside /vacation/${copy.folder}/: ${u} — add a transform.`);
    // every OTHER spelling of a /vacation address: protocol-relative, no trailing slash, root-relative.
    const anyHost = src[page].match(new RegExp('anesthesia-kp\\.github\\.io\\/vacation(?!\\/' + esc(copy.folder) + '\\/)[^"\'`\\s)]*', 'gi')) || [];
    if (anyHost.length) fail(`generic link guard: the ${copy.name} ${page} page has an address into another site: ${anyHost[0]} — add a transform.`);
    const rootRel = src[page].match(new RegExp('["\'`(=]\\/vacation(?!\\/' + esc(copy.folder) + '\\/)[\\/?#"\'`)]', 'g')) || [];
    if (rootRel.length) fail(`generic link guard: the ${copy.name} ${page} page has a root-relative /vacation address: ${rootRel[0]} — add a transform.`);
    if (/href="https:\/\/anesthesia-kp\.github\.io\/schedule\//.test(src[page]))
      fail(`generic link guard: the ${copy.name} ${page} page links to the Daily Schedule — removed by owner ruling 18 Aug; add a transform if this is ever reversed deliberately.`);
  }

  // ── CANARY: nothing MD-only, and nothing of the OTHER copy, may survive ──
  const others = COPIES.filter(o => o !== copy);
  const FORBIDDEN = ['<span id="siteLabel">MD</span>', MD_FB.projectId, MD_FB.appId, MD_FB.authDomain, MD_FB.apiKey, MD_FB.messagingSenderId, MD_APPCHECK,
    "'auctionConfigV1'", '"vk_lastUser"', "'adminRemembered'", "'insightsView'",
    "'acReloadedFor'", '"vrl-"', "'rbgate-'", "'reportsView'", "'vacVisit'",
    MD_VAPID, "'kp_push_dev'"];   // [547 · push] the MD push key (when set — "" is filtered out below) and the push device id's key
  for (const o of others) {
    const ofb = (CFG[o.name].firebase || {});
    FORBIDDEN.push(ofb.projectId, ofb.appId, ofb.apiKey, ofb.authDomain, CFG[o.name].appCheckSiteKey, `'${o.prefix}AuctionConfigV1'`, `"${o.prefix}-vrl-"`,
      CFG[o.name].vapidKey);   // [547 · push] the other copy's push key, when set
  }
  if (copy.provider !== 'ReCaptchaV3Provider') FORBIDDEN.push('ReCaptchaV3Provider');
  // [547 · icons] the MD Home Screen icons and names, and the other copy's: never on a copy's pages, never in its settings files
  const APP_BAD = [];
  for (const a of [MD_APP.staff, MD_APP.admin].concat(...others.map(o => [o.app.staff, o.app.admin]))) APP_BAD.push(`img/app-icons/${a.icon}-`, `content="${a.name}"`);
  FORBIDDEN.push(...APP_BAD);
  for (const page of ['staff', 'admin']) {
    const t = app[page], mj = JSON.parse(t);
    for (const a of [MD_APP.staff, MD_APP.admin].concat(...others.map(o => [o.app.staff, o.app.admin])))
      if (t.includes(`img/app-icons/${a.icon}-`) || mj.name === a.name || mj.short_name === a.name) fail(`canary: the ${a.name} icon or name (MD-only or another copy's) survived in the ${copy.name} ${page} web-app settings file [547 · icons]`);
    if (mj.id === MD_APP[page].man.id) fail(`canary: the ${copy.name} ${page} web-app settings file kept the MD id ${mj.id} [547 · icons]`);
  }
  for (const bad of FORBIDDEN.filter(b => b && !String(b).startsWith('REPLACE_ME'))) {
    for (const page of ['staff', 'admin']) {
      if (src[page].includes(bad)) fail(`canary: token ${bad} (MD-only or another copy's) survived in the ${copy.name} ${page} page`);
    }
  }

  // ── SHARED-ORIGIN HAZARDS (testing site · review, 31 Oct 2026): every site lives on one web
  // origin, so anything that reaches ALL of the origin's storage, or a name every page on it
  // shares, must not appear — it could wipe or read the real site's data. None appear in the MD
  // pages today (checked 31 Oct 2026); a future MD build that adds one stops the stamp here.
  for (const page of ['staff', 'admin']) {
    const hz = src[page].match(/(?:localStorage|sessionStorage)\s*\.\s*(?:clear|key)\s*\(|(?:localStorage|sessionStorage)\s*\[|BroadcastChannel|locks\.request|document\.cookie|indexedDB\.open/g) || [];
    if (hz.length) fail(`shared-origin guard: the ${copy.name} ${page} page uses ${hz[0]} — it reaches the real site's browser data too; handle it deliberately.`);
  }
  // [547 · push] SERVICE WORKERS, handled deliberately: the staff page registers push-sw.js for its OWN folder, for push alerts. A
  // registration reaches its folder and every folder below it — the MD site's (/vacation/) covers the /vacation/crna/ and /vacation/testing/
  // pages too — so a copy must never pick up a registration it did not make (and with it the MD site's push address): every handle
  // comes from register('./push-sw.js', { scope: './' }), and getRegistration / getRegistrations, which can answer with ANOTHER site's
  // registration, are refused. The admin page uses no service worker at all.
  if (/serviceWorker/.test(src.admin)) fail(`service-worker guard: the ${copy.name} admin page uses serviceWorker — only the staff page may (push alerts); handle it deliberately.`);
  {
    const s = src.staff;
    const gr = s.match(/getRegistrations?\s*\(/);
    if (gr) fail(`service-worker guard: the ${copy.name} staff page calls ${gr[0]}…) — on the shared origin it can answer with ANOTHER site's registration (the MD one covers /vacation/${copy.folder}/); take the handle from navigator.serviceWorker.register('./push-sw.js',{scope:'./'}) instead.`);
    const regs = s.match(/\.register\s*\([^)]*\)/g) || [];
    const own = r => /^\.register\s*\(\s*(['"])\.\/push-sw\.js\1\s*,\s*\{\s*scope\s*:\s*(['"])\.\/\2\s*\}\s*\)$/.test(r);
    const bad = regs.filter(r => !own(r));
    if (bad.length) fail(`service-worker guard: the ${copy.name} staff page registers ${bad[0]} — the only registration allowed is register('./push-sw.js',{scope:'./'}) (the copy's own folder).`);
    if (/serviceWorker/.test(s) && !regs.length) fail(`service-worker guard: the ${copy.name} staff page uses serviceWorker but never registers push-sw.js for its own folder.`);
  }

  // ── made and checked: written by the caller once every copy has passed ──
  return { OUT, src, app, msg: `✅ ${copy.name}: stamped ${copy.folder}/index.html (build ${versions.index}), ${copy.folder}/admin/index.html (build ${versions.admin}), ${copy.folder}/versions.json, ${copy.folder}/push-sw.js (push alerts ${CFGc.vapidKey ? 'on: the copy\'s own key' : 'off: no key yet'}) [547 · push], ${copy.folder}/manifest.webmanifest and ${copy.folder}/admin/manifest.webmanifest (Home Screen "${copy.app.staff.name}" / "${copy.app.admin.name}") [547 · icons] — `
    + (placeholder ? '⚠️  WITH PLACEHOLDER FIREBASE CONFIG — not pushable yet.' : 'firebase project: ' + FB.projectId) };
}

export const stampedFor = { versions, copies: COPIES.map(c => c.folder) };
