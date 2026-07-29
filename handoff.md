# Handoff — KP East Bay Anesthesia Vacation Auction

**Written:** 29 July 2026, end of session · **By:** the outgoing Claude session
**Next session:** the user intends to run you as Opus 5. You are expected to operate as an
elite senior software engineer: precise, skeptical, evidence-driven, with high attention to
detail. The code must be excellent; the explanations must be simple (the user is not a coder).

---

## How to read this file

Prose carries beliefs, and beliefs decay. A previous handoff said "Current Bug/Blocker: None"
and three audits later that session's work had 59 confirmed defects. So:

- **[VERIFIED]** — proven by a test you can run, or observed directly against the live system.
- **[BELIEVED]** — reasoning, not independently confirmed. Treat as a lead, not a fact.

**If anything in this document conflicts with what the code actually does, the code is right
and this document is wrong — say so, and correct the record.**

**Start here, before reading further:**

```bash
REPO_ROOT=/Users/aaronfrankel/Documents/GitHub node tests/run-all.mjs   # 6 suites, 541 assertions
```

That command is the ground truth about the code. Then confirm live builds (see §1).

---

## 0. STANDING RULES — binding, read before doing anything

### The user's rules (verbatim, unchanged)

1. **Never rewrite entire files.** Output only the exact lines or functions that change, and
   always locate them by reading the current file first — never from memory.
2. **Before every code change:** read the target code, make the edit, syntax-check every inline
   `<script>` with `node --check`, and run the test suites when logic is touched.
3. **After each change:** bump `var BUILD` in the HTML **and** the matching key in
   `versions.json`, deliver the file, commit it to the repo, and give a concise commit summary
   ready to paste into GitHub Desktop.
4. **If you are unsure of an exact string, file path, or requirement, STOP and ask.**
5. **Keep explanations short and plain** (the user is not a coder) — but the code itself must
   be high quality, no shortcuts hidden behind simple language.
6. **Do NOT "fix" anything on the deferred / known-accepted list (§6) without asking first.**
7. **Do not agree with a bad idea.** Push back and explain why. The user asked for this
   explicitly; it has repeatedly caught real problems.
8. **Rules changes must be PUBLISHED in the Firebase console BEFORE pushing dependent client
   code.** (The console refuses to publish when content is identical to what's live — that
   means it's already published, not that something is broken.)

### Practices this project learned the hard way (equally binding)

- **Work in small batches by subsystem, and adversarially re-audit after each batch.** The
  measured fix→regression rate here is ~1:1. Every batch that skipped scrutiny shipped a
  defect that passed green tests — including one found in the outgoing session's own new
  feature (see §3).
- **Never let a test stub or pattern-match the thing it verifies — make it EXECUTE the real
  code.** The suites extract functions VERBATIM from the shipping HTML and run them against
  mock DOM/Firestore. Keep that standard. When you fix a bug, prove the new test FAILS against
  the old code (an "honesty check") before trusting it.
- **Verify every assumption against the code before acting on it.** Multiple "bugs" here have
  been the auditor's wrong assumption. The outgoing session also shipped a wrong fix (build
  124) by assuming what getCurrentUser() returned instead of reading it — the real cause was
  elsewhere. Read first.
- **Two extraction gotchas in the test harness:** the verbatim extractor brace-matches from the
  first `{` after the function name — so no default-param braces (`opts={}`) in extracted
  functions (use `opts=opts||{}` in the body) and no stray `{` in comments inside them.
- Prefer targeted grep + line-ranged reads over whole-file reads (admin file is ~560KB).

---

## 1. VERIFIED CURRENT STATE (29 Jul 2026)

- **Live builds: staff 125 / admin 217.** `versions.json` = `{"index":125,"mobile":16,"admin":217}`.
  [VERIFIED — cache-busted fetch of live pages + versions.json; user pushed 217 at session end —
  re-confirm live builds as your first act.] Schedule app untouched (24/46). **mobile.html is a
  retired redirect stub with no BUILD variable — ignore it** (the "mobile":16 key is vestigial).
- **Firestore rules are published and current**, including the new admin-only `backups`
  collection (manifest + `docs` subcollection, both `isAdmin()`-gated). [VERIFIED — anonymous
  probes: approvals/denials/changesDecisions/phaseStaging/mailQueue/emails/loginEmails/
  adminAccess/emailToUser/signInMisses/dailysched-adminAccess → 403; public bootstrap docs +
  whitelistConfirm → 200; backups → 403 to outsiders; AND an admin cloud-backup write succeeded
  live, which is only possible with the new block published.]
- **Test suite: 541 assertions across 6 suites, all passing.** [VERIFIED — run it.]
- **Pre-launch ops DONE (user-confirmed):** the dry run, the full Reset Auction, and the human
  check of the 21 bulk-set FTE-1.0 users.
- Firebase project `vacation-25e8e`. Default admins in rules: dr.vacation.goddess@gmail.com,
  aaronjfrankel@gmail.com. EmailJS `service_wpprivw` / `template_rss3fn3`, quota 2000/mo.
- Paths: `/Users/aaronfrankel/Documents/GitHub/` → `vacation-kp.github.io/` (index.html,
  admin/index.html, versions.json, firestore.rules), `schedule/`, `tests/`. Live at
  https://anesthesia-kp.github.io/vacation/ (staff) and …/vacation/admin/.

---

## 2. WHAT THIS SESSION DID (builds: staff 123→125, admin 209→217)

Each change was delivered, committed, tested; the cloud-backup feature was adversarially
audited (3 independent skeptics) and its findings fixed. All [VERIFIED] by the current suite.

1. **Staff 124→125 — whitelist-banner flash truly fixed.** Build 124's from-cache-snapshot
   hardening was correct but NOT the cause (a lesson in verifying assumptions). Root cause:
   the identity dropdown (`personSelect`) defaults to the FIRST roster option before sign-in,
   so the banner rendered for the wrong, unconfirmed person behind the login screen and
   flashed when the board appeared. Fix: banner keys off `selectedSignInName` (authoritative,
   "" until sign-in) and `completeSignIn()` re-renders it synchronously BEFORE revealing the
   board (the only place the board is shown). Executing tests incl. the exact repro.
2. **Admin 210 — whitelist ask e-mail wording:** "During the Department of Anesthesia vacation
   auction, you will receive time sensitive e-mail notifications from …".
3. **Admin 211 — whitelist send buttons:** reminder-to-unconfirmed is leftmost/primary; e-mail-
   everyone is small, far right, and its confirm dialog warns it includes already-confirmed
   users; the dashboard advisory button now e-mails the unconfirmed only. (The dashboard
   advisory itself auto-disappears once everyone confirms or Phase 1 starts.)
4. **Admin 212 — whitelist e-mails go to Google login addresses ONLY.** KP (@kp.org) addresses
   are excluded via `adminSendEmail`'s existing skip-set (shared mail code untouched); users
   with no Google login on file are skipped and counted in the dialog.
5. **Admin 213 — CLOUD BACKUPS (new feature) + rules.** One click saves the same 28-doc
   snapshot into admin-only `backups/bk<ts>` (manifest: ts/by/build/exportedAt/names/bytes/
   phase/bids/bidUsers) + `backups/bk<ts>/docs/<name>` pieces (`{j: JSON-string}`), one atomic
   29-op batch. Shared fetch path `_backupFetchAll()` + shared `_backupDocMap()` so local and
   cloud coverage can never diverge. List/restore/delete in the admin UI; keep-newest-15 with
   auto-prune; restore reuses the SAME double-confirm (typed RESTORE) + `_doFullRestore` path
   as file restore. Partial snapshots are refused outright (a partial cloud backup could never
   restore — H13 refuses partials).
6. **Admin 215 — adversarial audit of the backup feature + fixes** (3 skeptic agents; every
   claim checked against source). Confirmed-and-fixed:
   - **CRITICAL — prompt-clobber race:** `_backupThen`'s OK path read the global `_bkProceed`
     AFTER the multi-second backup await; a second prompt opened meanwhile swapped it, running
     the WRONG transition unconfirmed. Now every path binds its own transition via closure.
   - **HIGH — missing-document wipe (pre-existing, both restore paths):** a backup lacking a
     doc key (e.g. pre-changesDecisions files) restored that doc as `{}` and reported success.
     `_doFullRestore`'s pre-flight now aborts on absent keys exactly like unreadable ones
     (stored `null` = doc genuinely absent at backup time — still fine).
   - Busy-guard is a module flag failing CLOSED (was a DOM-button check failing open) with an
     honest "already running" message; prune can never delete the just-saved backup (skewed
     clock case); post-commit housekeeping errors can't fake "nothing was saved"; manifest
     `ts` now equals the snapshot's `_exportedAt` instant so cloud/file timer-resume math is
     identical; list renders only well-formed `bk<digits>` ids (defence-in-depth for onclick).
   - Also merged the Backups & Restore card, fixed a doubled Show/Hide chevron (the
     auto-collapsible injector needed the merged card on its exclusion list), compact 3-of-15
     list with "Show all" toggle.
7. **Admin 216-217 — backup UX per the user:** the backup-before-step prompt recommends ONLY
   the cloud backup (local button removed from that workflow; "⏭ Skip backup (testing)"
   retained; success-gating unchanged — a failed/partial cloud backup still blocks the
   transition). "Backup All Data" renamed **"💾 Local Hard Drive Backup"** and moved into the
   Backups & Restore card, right of the cloud button. Cloud list has its own "🛟 Restore from
   a cloud backup" header above the local-file restore section. Each backup row: Restore
   leftmost, 🗑 right.
8. **Admin 214 — Add User helper text corrected** ("Initials and FTE are required. Users are
   shared with the Daily Schedule, but FTE is not." — FTE is strictly required 0.4-1.0, no
   default; the old text described pre-audit behavior).

### Decisions the user made this session (do not relitigate; do not "fix")

- **whitelistConfirm is never reset, never backed up, never restored.** It is deliberately
  outside the auction lifecycle; confirmations persist across cycles. Recorded in the
  `_backupDocMap` comment.
- **mobile.html is ignored** (retired redirect).
- **No second Firebase project for backups.** In-project cloud backups + occasional local
  hard-drive files are the accepted design.
- Whitelist e-mails never go to KP addresses (that's the separate KP IT allowlist workstream).

---

## 3. THE TO-DO LIST (in the user's priority order — wait for their go-ahead)

1. **Live-fire check of backup/restore, cloud & local.** Take a cloud backup → 🛟 Restore it
   (identical state ⇒ zero risk) → confirm the loop. Then a 💾 Local Hard Drive Backup →
   load the file in the restore console → confirm it summarizes correctly. Nobody has yet
   executed a real cloud RESTORE against the live database. [BELIEVED safe; tests prove the
   logic, not the live round trip.]
2. **The two disputed criticals from INTEGRITY-AUDIT-2026-07-25.md** (the two skeptics split;
   these need the USER's decision, prepared by you with evidence + a plain recommendation):
   - **(a) `_backupThen` acting on an incomplete backup — largely CLOSED by this session:**
     both remaining paths are success-gated (cloud verifies the save; the local path was
     removed from that workflow). Remaining decision: formal sign-off, and whether
     "⏭ Skip backup (testing)" survives to launch.
   - **(b) Duplicate-login-e-mail access leak:** a duplicated Google login e-mail can grant
     one physician write access to another's bids (emailToUser maps e-mail→initials; a
     duplicate entry collides). UNTOUCHED. Needs evidence, recommendation, user ruling, fix.
3. **The original audit queue, in SMALL RE-AUDITED BATCHES:** 16 more disputed (user decides
   each), 28 medium, 14 low — see INTEGRITY-AUDIT-2026-07-25.md (each entry has file/line/
   evidence/repro). PLUS new small items from this session's audit: single-user restore is
   not reachable from a cloud backup (full-restore only; local files still support per-user
   restore — a deliberate scope cut, user may want it later); `vacations/passcodes` appears
   in neither isSensitiveDoc nor isAdminOnlyDoc, so it is world-readable and registered-user-
   writable via the catch-all (pre-existing observation — needs triage, it may be empty/unused).
4. **The 9 unverified critic findings** from the audit: run each through two-skeptic
   verification BEFORE acting. Expensive — use subagents, batch sensibly.
5. **E-mail deliverability (deferred, durable fix):** EmailJS sends via personal Gmail which
   can't be authenticated. Chosen path: ~$12/yr domain + transactional provider (SES/Resend/
   Brevo/Postmark) via EmailJS custom SMTP or swapped call-sites. The Whitelist Tracker is the
   interim Gmail-side mitigation. Separate user-side item: KP IT allowlist request for the
   sending address so @kp.org inboxes accept auction mail.

### Audits still needed (explicit)

- **None outstanding for the cloud-backup feature** — it received its adversarial pass and the
  fixes landed with executing tests. But builds 216-217 (UI-only changes on top) had tests and
  no re-audit; treat any NEXT touch of backup code as requiring a fresh adversarial pass.
- **Every future fix batch needs its own re-audit** (the ~1:1 regression rate is real).
- The **audit queue items themselves (§3.3, §3.4)** are the remaining known audit work.

---

## 4. ARCHITECTURE IN 10 LINES (read the code for the rest)

Two static sites (GitHub Pages) sharing one Firestore: staff `index.html` (bidding board,
sign-in via Google + emailToUser mapping, its own computeApprovals twin for projections) and
`admin/index.html` (roster, phases, approvals engine, timer rules, mail relay, backups,
whitelist tracker). All logic is inline `<script>` in each HTML file. The two
`computeApprovals` twins deliberately differ in SIGNATURE (admin takes `ignoreAdmin`, staff
takes a schedule snapshot) — port LOGIC only, never whole functions; both carry a runtime
guard that throws on a cross-port. The mail queue (`vacations/mailQueue`) is relayed by ANY
open signed-in page (staff or admin) with randomized delay + claim protocol — not admin-only.
Rules enforce: per-user bid confinement (writesOnlyOwnKeys via emailToUser), server-clock
timer expiry, explicit biddingClosed gate, append-only change log by containment (hasAll),
admin-only decision docs (approvals/denials/changesDecisions/phaseStaging), admin-only backups.

---

## 5. DEPLOY FLOW (every change)

read target code → minimal edit → `node --check` every inline `<script>` → run
`tests/run-all.mjs` (expect 541+, all green; add executing tests for anything you fix, with an
honesty check) → bump `var BUILD` + `versions.json` key → deliver file + commit summary →
if rules changed: user publishes in Firebase console BEFORE pushing → user pushes via GitHub
Desktop → confirm live via cache-busted fetch of the page reading `var BUILD`.

---

## 6. DEFERRED / KNOWN-ACCEPTED — do not "fix" without asking

- `getUserFTE`'s `1.0` fallback is an arithmetic guard, NOT a default (FTE_MAP deleted;
  missing-FTE state is made unreachable: usersMissingFte blocks Begin Phase, addUser refuses
  blank FTE, FTE_MIN 0.4 enforced on entry and read). Do not "simplify."
- Per-week lock enforcement in rules is impossible (nested map keys); biddingClosed is the gate.
- Client-clock timer DISPLAY skew; welcomeLog/mailStats insider griefing; rare multi-device
  double-welcome; OAuth consent showing vacation-25e8e.firebaseapp.com; mailQueue/welcomeLog/
  adminAccess excluded from restore (deliberate — stale queue re-sends mail, stale welcomeLog
  re-welcomes, stale adminAccess can lock the restoring admin out).
- mailQueue residual: a registered user can forge/delete ONE entry per write (full validation
  needs a server) — documented insider risk, size-≤1-key rule limits blast radius.
- Change-log FORGE half (appending an entry naming a colleague) can't be closed in rules;
  Fair Play Monitor is the advisory backstop.
- The staff site must NEVER read approvals/denials for the current phase (mid-phase privacy
  invariant). whitelistConfirm: see §2 decisions.

---

## 7. WAIT FOR INSTRUCTIONS

Read this file, run the suite, confirm the live builds, report your understanding briefly and
plainly — then STOP. Do not start any queue item, do not modify files, do not push or publish
until the user directs you. They drive the order of work.
