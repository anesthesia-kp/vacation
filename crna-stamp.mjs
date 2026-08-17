#!/usr/bin/env node
// crna-stamp.mjs — generates the CRNA Vacation Auction from the MD pages.
//
// THE RULE (owner, 17 Aug 2026): "I want all the code to come from my main vacation repo
// so that the 2 sites remain identical other than users." This script is how that stays
// TRUE rather than intended: crna/index.html and crna/admin/index.html are GENERATED from
// index.html and admin/index.html with a fixed, named set of transforms — and nothing
// else. Never hand-edit a crna/ file; edit the MD page and re-run:
//
//     node crna-stamp.mjs
//
// tests/test-crna-stamp.mjs regenerates the same output and fails the battery if the
// committed crna/ files don't match — so an MD build that forgets to re-stamp goes red.
//
// THE TRANSFORMS, and why each exists:
//   1. FIREBASE CONFIG — swapped for the CRNA project's (from crna-config.json).
//      Separate users, bids, alerts, admins. Their own database entirely.
//   2. BROWSER-STORAGE KEYS — renamed with a crna prefix. Both sites live on ONE web
//      origin (anesthesia-kp.github.io), so localStorage/sessionStorage are SHARED:
//      unrenamed, a CRNA visit would poison the MD page's cached auction config and
//      vice versa. Every key is renamed; a canary pass proves none survived.
//   3. LABELS — the owner's exact spec (17 Aug): staff page gets "CRNA" on its own line
//      below the auction title, above the Department line, same size as that line;
//      admin dashboard title reads "Dashboard CRNA Vacation Auction — 2027";
//      both <title> tags carry CRNA so browser tabs are tellable apart.
//   4. CROSS-LINKS — the staff↔admin portal links point at /vacation/crna/… so nobody
//      hops from a CRNA page into the MD admin without noticing.
//   5. versions.json — a crna/ copy, same build numbers (identical code = same builds).
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
const FB = CFG.firebase || {};
const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const placeholder = REQUIRED.some(k => !FB[k] || String(FB[k]).includes('REPLACE_ME'));
if (placeholder) {
  console.log('⚠️  crna-config.json still holds REPLACE_ME values — stamping anyway for the');
  console.log('   working tree, but DO NOT PUSH crna/ until the real Firebase config is in.');
}

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

// ── 1b · The sign-in help note quotes the auth domain VERBATIM to teach users which
// Google screen is safe. On the CRNA site Google shows the CRNA domain — the note must
// say that one, or it trains CRNAs to trust the wrong screen. (Found by the canary.)
{
  const to = FB.authDomain || 'REPLACE_ME_authDomain';
  rep('staff', '“' + MD_FB.authDomain + '.”', '“' + to + '.”', 1);
  rep('admin', '“' + MD_FB.authDomain + '.”', '“' + to + '.”', 1);
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
];
for (const [lit, ns, na, to] of KEYS) {
  if (ns) rep('staff', lit, to, ns);
  if (na) rep('admin', lit, to, na);
}

// ── 3 · Labels — the owner's exact spec ──
rep('staff',
  '<h1 class="header-top" id="headerTitle">Fall Vacation Auction</h1>',
  '<h1 class="header-top" id="headerTitle">Fall Vacation Auction</h1>\n    <p class="header-sub" style="margin:2px 0 0">CRNA</p>', 1);
rep('staff', '<title>Department of Anesthesia Scheduler</title>',
             '<title>CRNA Vacation Auction — Department of Anesthesia</title>', 1);
rep('admin', '<div class="page-title" style="margin:0">Dashboard</div>',
             '<div class="page-title" style="margin:0">Dashboard CRNA Vacation Auction — 2027</div>', 1);
rep('admin', '<title>Vacation Auction Admin</title>',
             '<title>CRNA Vacation Auction Admin</title>', 1);

// ── 4 · Cross-links between the two CRNA pages ──
rep('staff', 'https://anesthesia-kp.github.io/vacation/admin/?portal=1',
             'https://anesthesia-kp.github.io/vacation/crna/admin/?portal=1', 1);
rep('admin', 'https://anesthesia-kp.github.io/vacation/?portal=1',
             'https://anesthesia-kp.github.io/vacation/crna/?portal=1', 1);

// ── CANARY: nothing MD-only may survive in the CRNA output ──
const FORBIDDEN = [MD_FB.projectId, MD_FB.appId,
  "'auctionConfigV1'", '"vk_lastUser"', "'adminRemembered'", "'insightsView'",
  "'acReloadedFor'", '"vrl-"', "'rbgate-'"];
for (const bad of FORBIDDEN) {
  for (const page of ['staff', 'admin']) {
    if (src[page].includes(bad)) fail(`canary: MD-only token ${bad} survived in crna ${page}`);
  }
}

// ── write ──
mkdirSync(join(here, 'crna', 'admin'), { recursive: true });
writeFileSync(join(here, 'crna', 'index.html'), src.staff);
writeFileSync(join(here, 'crna', 'admin', 'index.html'), src.admin);
writeFileSync(join(here, 'crna', 'versions.json'), JSON.stringify(versions));
console.log('✅ stamped crna/index.html (build ' + versions.index + '), crna/admin/index.html (build ' + versions.admin + '), crna/versions.json');
console.log(placeholder ? '⚠️  WITH PLACEHOLDER FIREBASE CONFIG — not pushable yet.' : 'firebase project: ' + FB.projectId);

export const stampedFor = { versions, placeholder };
