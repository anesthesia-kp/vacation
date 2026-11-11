#!/usr/bin/env node
// crna-stamp.mjs — generates the TESTING SITE from the MD pages.
//
// [testing site · DECISIONS §317, §319–§322, 31 Oct 2026] The copy this script makes is the
// owner's TESTING SITE: served at /vacation/testing/ (staff) and /vacation/testing/admin/,
// wired to the separate Firebase project crna-vacation, with a thin red band on both pages.
// The script, its config file (crna-config.json) and the "crna" prefix on browser-storage
// names keep their old names on purpose (§321 Q1): nobody sees them, and every guard below
// is written against them. Everything below that says "CRNA" means this copy.
//
// THE RULE (owner, 17 Aug 2026): "I want all the code to come from my main vacation repo
// so that the 2 sites remain identical other than users." This script is how that stays
// TRUE rather than intended: testing/index.html and testing/admin/index.html are GENERATED from
// index.html and admin/index.html with a fixed, named set of transforms — and nothing
// else. Never hand-edit a testing/ file; edit the MD page and re-run:
//
//     node crna-stamp.mjs
//
// tests/test-crna-stamp.mjs regenerates the same output and fails the battery if the
// committed testing/ files don't match — so an MD build that forgets to re-stamp goes red.
//
// THE TRANSFORMS, and why each exists:
//   1. FIREBASE CONFIG — swapped for the CRNA project's (from crna-config.json).
//      Separate users, bids, alerts, admins. Their own database entirely.
//   2. BROWSER-STORAGE KEYS — renamed with a crna prefix. Both sites live on ONE web
//      origin (anesthesia-kp.github.io), so localStorage/sessionStorage are SHARED:
//      unrenamed, a CRNA visit would poison the MD page's cached auction config and
//      vice versa. Every key is renamed; a canary pass proves none survived.
//   3. LABELS — the owner's approved wording (§321): tab titles "Testing Site — Vacation
//      Auction" / "… Admin", the admin heading "Dashboard Testing Site — <year>", and the
//      thin red band "🧪 TESTING SITE — not the real auction" at the top of both pages.
//   4. CROSS-LINKS — the admin page's link to the staff page points at /vacation/testing/…
//      so nobody hops from the testing site into the real one without noticing.
//   5. versions.json — a testing/ copy, same build numbers (identical code = same builds).
//      The stale-build gate works unchanged (both pages fetch it relatively).
//
//   NOT transformed, deliberately: LEAD_ADMIN_EMAIL (dr.vacation.goddess@gmail.com stays
//   the unremovable lead admin on BOTH sites); EmailJS service/template (shared account
//   until the owner decides otherwise — an open decision in TODO §1a); every line of
//   application logic.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// ── the CRNA Firebase project (client config — public by nature, same as the MD one) ──
const CFG_PATH = join(here, 'crna-config.json');
if (!existsSync(CFG_PATH)) {
  console.error('crna-config.json is missing. Create it (see TODO §1a checklist) first.');
  process.exit(2);
}
const CFG = JSON.parse(readFileSync(CFG_PATH, 'utf8'));
// [26 Aug 2026 · owner ruling, DECISIONS §118] While the CRNA sites are SUSPENDED nothing is
// stamped: testing/ is deliberately absent from the repo so GitHub Pages serves 404 for both
// addresses. Revival recipe: TODO.md (CRNA-SUSPENDED). Exit 0 — a suspended stamp is not an error.
if (CFG.suspended === true) {
  console.log('⏸ CRNA suspended (crna-config.json "suspended": true) — nothing stamped, testing/ stays absent.');
  process.exit(0);
}
const FB = CFG.firebase || {};
const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const placeholder = REQUIRED.some(k => !FB[k] || String(FB[k]).includes('REPLACE_ME'));
if (placeholder) {
  console.log('⚠️  crna-config.json still holds REPLACE_ME values — stamping anyway for the');
  console.log('   working tree, but DO NOT PUSH testing/ until the real Firebase config is in.');
}

let MD_APPCHECK = null;
// ── transform machinery: every replacement states how many times it MUST hit ──
let src = {};
const fail = m => { console.error('⛔ STAMP ABORTED: ' + m); process.exit(1); };
function rep(page, from, to, exactly) {
  const n = src[page].split(from).length - 1;
  if (n !== exactly) fail(`"${String(from).slice(0, 60)}" found ${n}× in ${page}, expected ${exactly}. The MD page changed shape — update the stamper deliberately, never silently.`);
  src[page] = src[page].split(from).join(to);
}

src.staff = readFileSync(join(here, 'index.html'), 'utf8');
src.admin = readFileSync(join(here, 'admin', 'index.html'), 'utf8');
const versions = JSON.parse(readFileSync(join(here, 'versions.json'), 'utf8'));

// ── 1 · Firebase config: replace each MD field value with the CRNA one ──
const MD_FB = {};
for (const k of REQUIRED) {
  const m = src.staff.match(new RegExp(k + ':"([^"]+)"'));
  if (!m) fail('could not read MD firebase field ' + k + ' from index.html');
  MD_FB[k] = m[1];
}
for (const k of REQUIRED) {
  const to = FB[k] || ('REPLACE_ME_' + k);
  rep('staff', `${k}:"${MD_FB[k]}"`, `${k}:"${to}"`, 1);
  rep('admin', `${k}:"${MD_FB[k]}"`, `${k}:"${to}"`, 1);
}

// ── 1b · App Check site key ────────────────────────────────────────────────────────
// CRNA is a SEPARATE Firebase project, so it needs its OWN reCAPTCHA key — an MD key
// would simply fail to attest there. Read the MD key out of the page rather than
// hardcoding it, so this cannot silently drift from what the page actually ships.
//
// HISTORY, so nobody re-adds the old transform: until build 281/146 this slot swapped
// the auth domain quoted in the sign-in help note ("Google will show a screen that says
// …firebaseapp.com"), because naming the MD screen on the CRNA site would train CRNAs
// to trust the wrong screen. The owner REPLACED that note with a security line on
// 19 Aug 2026 (DECISIONS §64), so there is no domain left in the copy to swap. The
// protection did NOT go away: MD_FB.authDomain is now a FORBIDDEN token below, which
// is strictly stronger — the old code repaired a leak, the canary refuses to ship one.
{
  const m = src.staff.match(/APPCHECK_SITE_KEY\s*=\s*"([^"]+)"/);
  if (!m) fail('could not read the MD App Check site key (APPCHECK_SITE_KEY) from index.html');
  MD_APPCHECK = m[1];
  const to = CFG.appCheckSiteKey || 'REPLACE_ME_appCheckSiteKey';
  if (to.startsWith('REPLACE_ME')) {
    console.log('\u26a0\ufe0f  crna-config.json has no appCheckSiteKey — stamping a placeholder.');
    console.log('   DO NOT PUSH testing/ until the real CRNA reCAPTCHA site key is in.');
  }
  rep('staff', '"' + MD_APPCHECK + '"', '"' + to + '"', 1);
  rep('admin', '"' + MD_APPCHECK + '"', '"' + to + '"', 1);
}

// ── 2 · Browser-storage keys: rename EVERY one (shared origin!) ──
// counts pinned from the 17 Aug inventory of builds 139/269; a count change means the
// MD pages changed — update deliberately.
const KEYS = [
  //  [literal, staffCount, adminCount, replacement]
  ["'auctionConfigV1'", 2, 2, "'crnaAuctionConfigV1'"],
  ['"vk_lastUser"', 1, 0, '"crna_vk_lastUser"'],
  ["'adminRemembered'", 0, 5, "'crnaAdminRemembered'"],
  ["'insightsView'", 0, 2, "'crnaInsightsView'"],
  ["'acReloadedFor'", 2, 2, "'crnaAcReloadedFor'"],
  ['"vrl-"', 2, 2, '"crna-vrl-"'],
  ["'rbgate-'", 1, 1, "'crna-rbgate-'"],
  // [testing site · 31 Oct 2026] two names added to the MD pages since August
  ["'reportsView'", 0, 2, "'crnaReportsView'"],   // admin: the capacity report's view
  ["'vacVisit'", 1, 0, "'crnaVacVisit'"],         // staff: VISIT_LS, the visit record
  ["'srSeen.'", 2, 0, "'crnaSrSeen.'"],
];
for (const [lit, ns, na, to] of KEYS) {
  if (ns) rep('staff', lit, to, ns);
  if (na) rep('admin', lit, to, na);
}

// ── 3 · Labels — the owner's exact spec ──
// [build 274 · C7] The MD pages now carry their own labels (owner's deferred "MD site
// label"), so these rules SWAP MD → CRNA instead of inserting from unlabeled pages.
// [227 · §296] The staff page carries no MD label line (owner, 26 Oct 2026), so there is no header-sub line to swap here.
// [testing site · §321] the owner's approved wording (PLAN §4).
rep('staff', '<title>MD Vacation Auction — Department of Anesthesia</title>',
             '<title>Testing Site — Vacation Auction</title>', 1);
rep('admin', '<div class="page-title" style="margin:0">Dashboard MD Vacation Auction — <span id="acYearHdr">2027</span></div>',
             '<div class="page-title" style="margin:0">Dashboard Testing Site — <span id="acYearHdr">2027</span></div>', 1);
rep('admin', '<title>MD Vacation Auction Admin</title>',
             '<title>Testing Site — Vacation Auction Admin</title>', 1);

// ── 3b · THE THIN RED BAND (owner, 31 Oct 2026, §321: "make it a thin red band") ──
// One line at the very top of both pages, so the testing site is never mistaken for the real
// one. It is drawn by the html element itself (html::before), NOT inside the page's body: the
// staff page scales its whole body by 1.15 on wide screens (body{zoom:1.15}), which would
// stretch a band placed in the body. The html element makes room for it (padding-top), so
// the page's own content starts below it. It is drawn above EVERYTHING (the highest z-index):
// the sign-in screen is a full-screen layer, and a band drawn under it would vanish exactly
// where it matters (render check, 31 Oct 2026). At the top of the page it can therefore lie
// over the top 16px of a full-screen box or sheet — but only to the eye: it never takes a
// tap or click (pointer-events:none), so whatever is under it still works. It scrolls away
// with the page. System font: nothing to load.
const BAND = '<style id="testing-band">html{padding-top:16px!important}' +
  'html::before{content:"\\1F9EA  TESTING SITE \\2014  not the real auction";' +
  'position:absolute;top:0;left:0;right:0;height:16px;z-index:2147483647;' +
  'background:#b3261e;color:#ffffff;font:700 10.5px/16px system-ui,-apple-system,sans-serif;' +
  'letter-spacing:.08em;text-align:center;white-space:nowrap;overflow:hidden;pointer-events:none}</style>';
rep('staff', '<body>', '<body>\n' + BAND, 1);
rep('admin', '<body>\n<!-- [build 227 · CONNECTION INTEGRITY]', '<body>\n' + BAND + '\n<!-- [build 227 · CONNECTION INTEGRITY]', 1);

// ── 3c · RELATIVE FILE ADDRESSES (testing site, 31 Oct 2026) ──
// The copy is served one folder below the MD page, so a relative address would look for its
// file inside testing/. Each points one folder up, at the MD site's own file.
rep('staff', 'url(fonts/', 'url(../fonts/', 2);                          // the two font files
rep('staff', "'img/destinations/'", "'../img/destinations/'", 1);         // the destination pictures
rep('admin', 'url(../fonts/', 'url(../../fonts/', 4);                    // the two font files, twice

// ── 4 · Cross-links between the two CRNA pages ──
// [testing site · 31 Oct 2026] the staff page carries no link to the admin page (so there is
// nothing to swap there — the link guard below still refuses any MD link that appears).
rep('admin', 'https://anesthesia-kp.github.io/vacation/?portal=1',
             'https://anesthesia-kp.github.io/vacation/testing/?portal=1', 1);

// ── 2b · BAKED-IN DATA: the MD roster is hardcoded as `names`' starting value in BOTH
// pages. On the MD site the database overwrites it instantly; on the CRNA site an empty
// database means the page KEEPS it (the missing-doc guard) — so the MD roster appeared on
// the live CRNA site on release day, 17 Aug. The CRNA copies start EMPTY: their roster
// comes only from the crna-vacation database, entered by the admin.
for (const page of ['staff', 'admin']) {
  const m = src[page].match(/let names\s*=\s*\[[^\]]*\];/);
  if (!m) fail('could not find the hardcoded names array in ' + page);
  src[page] = src[page].replace(m[0], 'let names=[]; // [CRNA] no baked-in roster — the crna-vacation database is the only source');
}
{ // canary: no trace of the MD initials list may survive
  const probe = '"AD","ADG","AF"';
  for (const page of ['staff', 'admin']) if (src[page].includes(probe)) fail('MD roster initials survived in crna ' + page);
}

// ── GENERIC STORAGE GUARD (owner: "paramount that the sites never contaminate each
// other", 17 Aug). The named-key list above covers every key that exists TODAY. This scan
// covers every key that exists EVER: any literal storage key in the CRNA output that does
// not start with "crna" ABORTS the stamp. A future MD build that adds a new storage key
// cannot silently reopen the shared-origin collision — the stamp refuses until the new
// key is added to the rename table above, deliberately.
for (const page of ['staff', 'admin']) {
  const calls = src[page].match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*(['"])((?:(?!\1).)*)\1/g) || [];
  for (const c of calls) {
    const key = c.match(/\(\s*['"]([^'"]*)['"]/)[1];
    if (!/^crna/i.test(key)) fail(`generic storage guard: literal key "${key}" in crna ${page} is not crna-prefixed — a NEW storage key was added to the MD pages; add it to the rename table.`);
  }
  // keys built from a prefix string (e.g. "crna-vrl-" + PAGE) — every prefix literal that
  // feeds a storage call via a variable must also be crna-prefixed; the named table
  // handles the two known ones ("vrl-", "rbgate-") and this assertion pins them:
  if (/['"]vrl-['"]/.test(src[page]) || /['"]rbgate-['"]/.test(src[page]))
    fail('generic storage guard: an un-renamed storage-key prefix survived in ' + page);
}

// ── [stamp guard v2 · audit LOW, 20 Aug 2026] The scan above sees only LITERAL keys.
// Variable-keyed calls (REMEMBER_KEY — 7 staff sites incl. the 156 revocation branch —
// and the rbgate 'k') are invisible to it and are protected only by the rename table.
// So PIN the variable-keyed count per page: a future MD build that adds a storage key
// through a const deviates from the pin and ABORTS the stamp, forcing the new key into
// the rename table (and this pin bumped) deliberately — never silently.
const VARKEY_PIN = { staff: 11, admin: 2 }; // counted at MD builds 156/290; staff 9 → 11 at 235 (VISIT_LS, renamed in the table above)
for (const page of ['staff', 'admin']) {
  const total   = (src[page].match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(/g) || []).length;
  const literal = (src[page].match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*['"]/g) || []).length;
  const varkeyed = total - literal;
  if (varkeyed !== VARKEY_PIN[page])
    fail(`generic storage guard v2: crna ${page} has ${varkeyed} variable-keyed storage call sites (pinned ${VARKEY_PIN[page]}) — a storage key was added or removed via a variable; put it in the rename table and bump the pin deliberately.`);
}

// ── [v3 · RA-L3, 20 Aug 2026] v2 pins only the COUNT — a count-preserving key SWAP
// (repointing an existing storage call at a new, un-renamed const) sailed through with a
// green stamp (proven by the audit's negative test). Pin the exact IDENTIFIER SET too:
// any new or renamed variable inside a storage call aborts the stamp until it is added
// here AND handled in the rename table deliberately. (The two sites share one web origin,
// so a shared un-renamed key silently mixes MD and CRNA state.)
const VARKEY_NAMES = { staff: ['REMEMBER_KEY', 'VISIT_LS', 'k'], admin: ['k'] }; // read from MD builds 158/294; VISIT_LS added at staff 235
for (const page of ['staff', 'admin']) {
  const seen = [...new Set([...src[page].matchAll(/(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*([A-Za-z_$][\w$]*)/g)].map(m => m[1]))].sort();
  const pin = [...VARKEY_NAMES[page]].sort();
  if (JSON.stringify(seen) !== JSON.stringify(pin))
    fail(`generic storage guard v3: crna ${page} variable-keyed storage identifiers are [${seen}] but the pin says [${pin}] — a storage call was repointed at a new variable; add it to VARKEY_NAMES and the rename table deliberately.`);
}

// ── 4b · NO SCHEDULING LINKS on the CRNA site (owner, 18 Aug 2026: "for now, they do
// not belong there" — the Daily Schedule is an MD tool; revisit if/when a CRNA schedule
// exists, tracked in TODO). Both entries in the admin's Other Systems card are removed;
// the guard below then refuses ANY /schedule/ link that ever tries to ride back in.
rep('admin', '      <a href="https://anesthesia-kp.github.io/schedule/?portal=1" target="_blank" rel="noopener">User Scheduling →</a>\n', '', 1);
{
  const i = src.admin.indexOf('<a id="otherSysSchedAdmin"');
  if (i < 0) fail('scheduling-admin link anchor not found');
  const j = src.admin.indexOf('</a>', i);
  src.admin = src.admin.slice(0, i) + '<!-- [CRNA] Scheduling Admin link removed — MD tool -->' + src.admin.slice(j + 4);
}

// ── GENERIC LINK GUARD: no CRNA page may link to an MD auction page. Any absolute
// /vacation/ URL in the testing-site output must be /vacation/testing/… — a future MD build that
// adds a new self-link cannot silently point CRNAs at the MD site.
for (const page of ['staff', 'admin']) {
  const links = src[page].match(/https:\/\/anesthesia-kp\.github\.io\/vacation\/[^"'\s)]*/g) || [];
  for (const u of links) {
    if (!u.startsWith('https://anesthesia-kp.github.io/vacation/testing/')) fail(`generic link guard: testing-site ${page} links outside /vacation/testing/: ${u} — add a transform.`);
  }
  // [testing site · review, 31 Oct 2026] also refuse every OTHER spelling of a /vacation address
  // that could open the real site: protocol-relative or with no trailing slash, and root-relative
  // ("/vacation/…" as a quoted address). Only /vacation/testing/ may appear.
  const anyHost = src[page].match(/anesthesia-kp\.github\.io\/vacation(?!\/testing\/)[^"'`\s)]*/g) || [];
  if (anyHost.length) fail(`generic link guard: testing-site ${page} has an address into the real site: ${anyHost[0]} — add a transform.`);
  const rootRel = src[page].match(/["'`(=]\/vacation(?!\/testing\/)[\/?#"'`)]/g) || [];
  if (rootRel.length) fail(`generic link guard: testing-site ${page} has a root-relative /vacation address: ${rootRel[0]} — add a transform.`);
  if (/href="https:\/\/anesthesia-kp\.github\.io\/schedule\//.test(src[page]))
    fail(`generic link guard: CRNA ${page} links to the Daily Schedule — removed by owner ruling 18 Aug; add a transform if this is ever reversed deliberately.`);
}

// ── CANARY: nothing MD-only may survive in the CRNA output ──
const FORBIDDEN = [MD_FB.projectId, MD_FB.appId, MD_FB.authDomain, MD_FB.apiKey, MD_FB.messagingSenderId, MD_APPCHECK,
  "'auctionConfigV1'", '"vk_lastUser"', "'adminRemembered'", "'insightsView'",
  "'acReloadedFor'", '"vrl-"', "'rbgate-'", "'reportsView'", "'vacVisit'"];
for (const bad of FORBIDDEN.filter(Boolean)) {
  for (const page of ['staff', 'admin']) {
    if (src[page].includes(bad)) fail(`canary: MD-only token ${bad} survived in crna ${page}`);
  }
}

// ── SHARED-ORIGIN HAZARDS (testing site · review, 31 Oct 2026): both sites live on one web
// origin, so anything that reaches ALL of the origin's storage, or a name every page on it
// shares, must not appear — it could wipe or read the real site's data. None appear in the MD
// pages today (checked 31 Oct 2026); a future MD build that adds one stops the stamp here.
for (const page of ['staff', 'admin']) {
  const hz = src[page].match(/(?:localStorage|sessionStorage)\s*\.\s*(?:clear|key)\s*\(|(?:localStorage|sessionStorage)\s*\[|BroadcastChannel|serviceWorker|locks\.request|document\.cookie|indexedDB\.open/g) || [];
  if (hz.length) fail(`shared-origin guard: testing-site ${page} uses ${hz[0]} — it reaches the real site's browser data too; handle it deliberately.`);
}

// ── write ──
// [testing site · §320] the output folder is testing/ (served at /vacation/testing/).
mkdirSync(join(here, 'testing', 'admin'), { recursive: true });
writeFileSync(join(here, 'testing', 'index.html'), src.staff);
writeFileSync(join(here, 'testing', 'admin', 'index.html'), src.admin);
writeFileSync(join(here, 'testing', 'versions.json'), JSON.stringify(versions));
console.log('✅ stamped testing/index.html (build ' + versions.index + '), testing/admin/index.html (build ' + versions.admin + '), testing/versions.json');
console.log(placeholder ? '⚠️  WITH PLACEHOLDER FIREBASE CONFIG — not pushable yet.' : 'firebase project: ' + FB.projectId);

export const stampedFor = { versions, placeholder };
