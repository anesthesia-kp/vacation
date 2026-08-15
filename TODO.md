# To Do — KP Vacation Auction
**Updated 13 Aug 2026 (evening).** Owner-maintained; future Claude sessions should read this alongside `handoff.md`.

## Builds

- [x] **Build 265/136 DEPLOYED (13 Aug).** All gates green pre-push; post-deploy audit clean
  (full lifecycle run-through, 0 errors, 0 never-event findings). See GATE-REPORT + POST-DEPLOY-AUDIT.
- [x] **Build 266/137 — Bid Floors by Week Category — DEPLOYED 13 Aug (owner push), live verified (`versions.json` = 137/17/266).**
  One rule: a bid must be at least as strong as the week category's floor (HD default 4,
  Summer default No floor, all other weeks always No floor). Engine-enforced on both sites
  (closes the NE-4 below-floor/forged-NP soft spot); locked once Phase 1 begins; behavioral
  no-op until a floor is changed (test-proven: 44/44 + honesty 0/30 + adversarial 11/11).
  NOTE: the Bid Floors card shows LOCKED while the auction runs (Phase 1 has begun) — by
  design; floors become editable after Reset Auction, for the next auction setup.
- [x] **Build 267/138 — Calendar redesign (fixed 6 HD weeks) + e-mail link dedup — DEPLOYED 13 Aug (owner push, mid-Phase-2; engines byte-identical = zero behavior change), live verified (`versions.json` = 138/17/267).**
  Fixed identity for the six HD weeks (no rename/delete/HD-toggle); ✨ Suggest fills
  Thanksgiving/Christmas/New Year's; Ski + Spring Breaks have no default and clear on year
  change; 5 federal holidays auto-label from the year; a holiday landing on a chosen HD week
  rides as a dual label ("⛷️ Ski Week · 🏛️ Presidents' Day") — display only. Reminder +
  contacts e-mails now point at the footer link. Behavioral no-op until a calendar is saved.
  Gates were 26/26 · honesty 24-fail · sweep clean · editor browser test 13/13. E-mails now
  carry a single (footer) link; EmailJS footer URL fixed to trailing-slash form by owner.

- [ ] **Build 268/139 + rules — BUILT + FULLY RE-AUDITED 15 Aug (incl. late owner items: Fall/Rolling title, BETWEEN-PHASES unlock w/ year carve-out + live-auction warnings, KP-prompt race fix), AWAITING OWNER PUSH + rules publish (17-case Playground checklist).**
  All ten plan items: 7-key server config freeze (+passcodes fix, restore pre-flight,
  plain-language denials, freeze pin), stale-build gate (cache-busted + refocus + push-driven
  overlay), HD checkboxes (default all-checked ≡ 267), Bid Lowerings (default 0 ≡ no-op),
  smart-copy auto-collapse. Adversarial audit: 2 findings, both fixed pre-ship. Gates:
  tests-build268 156/156 + honesty 12-fail, browser E2E 36/36, mega-fuzz 100k ZERO, engines
  byte-identical to 267. See BUILD-268-PLAN.md + build268-staged/ (notes, audit, RULES-PUBLISH
  checklist). After push: verify live versions.json = 139/17/268, then the console rules
  publish per checklist. FULL battery COMPLETED 15 Aug after re-auth: delta 91/91,
  audit-fixes 333 real green, 4-pass sweep clean (0 errors), phase-runthrough 0 errors,
  cal-editor 14/14 + bf-card 10/10 (both updated to the 268 contract), mobile sweeps clean
  (one pre-existing advisory: rememberMe tap target <32px), era suites 25/46/44/26 all
  green vs git-reconstructed era fixtures — zero regressions. Remaining reds everywhere are
  the documented honesty-baseline artifact class only.
  KPFIX (owner report 15 Aug, folded in pre-push): the intermittent "add your KP e-mail"
  prompt re-appearing for users who had already declined was a sign-in race — the saved
  answers were checked against a not-yet-loaded (empty) map whenever the post-sign-in read
  transiently failed. Fixed in staff 139 only (decision inside the 300ms timeout on fresh
  data; gated on a genuinely-loaded flag, fail-quiet ≡ Remind-later; a late-arriving answer
  auto-closes an open prompt). Full battery re-run on final bytes at the owner's request:
  tests-build268 197/197 + honesty 12-fail+abort, browser E2E 41/41 (new section F also
  reproduces the bug live against the pristine 138 fixture), 4-pass sweep clean, runthrough
  0 errors, mega-fuzz 100k ZERO, era suites 25/46/44/26, engines byte-identical to 267
  (32 fns) + twin generators identical.

## E-mail / EmailJS

- [x] **EmailJS template footer added (13 Aug 2026, DONE — lives OUTSIDE the repo).**
  The shared template `template_rss3fn3` (the only template either site uses) now carries a
  footer under `{{changes}}`: "View your bids and auction status:
  https://anesthesia-kp.github.io/vacation/". Every e-mail from both sites gets it
  automatically. **Do NOT also add this link in code** — it would double up.
  Owner verified rendering with a test send.

- [ ] **Post-265 cleanup (LOW, cosmetic):** two admin e-mail bodies already contained the site
  link before the footer existed and now show it twice:
  1. Bidding-reminder e-mail ("Place your bids here: …")
  2. "Add us to your contacts" e-mail ("Sign in here: ${AUCTION_SITE_URL}")
  Decision 13 Aug: LEAVE AS-IS — the in-body links are contextual calls-to-action and
  duplication is harmless. If removed later: fold into a future real build, with the usual
  tests + honesty check. Never a standalone deploy.

- [x] **Known interaction (13 Aug, verified in code — by design, not a bug): Reset Auction
  clears the welcome-e-mail log ("new cycle = fresh welcomes"), and Restore deliberately does
  NOT restore it. So a reset-then-restore re-welcomes every user on their next sign-in — one
  duplicate welcome each, self-limiting. Costs a little EmailJS quota; the Controls welcome
  toggle can silence it if ever needed.**

## Test-suite maintenance (false reds, not build bugs)

- [x] `tests/test-backup-restore.mjs` + `tests/test-p4-rounds.mjs`: FIXED + FILED 13 Aug — sandboxes for
  `closePhaseBidding` need a `mondays` stub (B5 made lock/close dialogs use
  `${mondays.length}`; the real page has it in module scope — verified, production fine).
  Patched copies verified (176/9 and 154/3 vs the live-equivalent build; remaining reds are
  honesty-baseline artifacts) and filed into `tests/`. Owner commits/pushes the tests repo whenever.
- [x] `tests/test-lead-admin.mjs`: FIXED + FILED 13 Aug — search string updated to "E-mail Queue"
  (16/4 = clean baseline; remaining reds are honesty artifacts).
  (Actual card order verified correct: … → E-mail Queue → 📅 Auction Calendar → Reset/danger last.)
- [ ] After 266 ships: copy `tests-build266.mjs` into `tests/` (it's in `build266-staged/`;
  `--pre` honesty mode needs pristine 265/136 copies at `/tmp/admin.html` + `/tmp/staff.html`).

## Optional hardening (deferred-minor, no urgency)

- [ ] Firestore rule freezing `auctionConfig` + `bidFloors` once Phase 1 starts (today the
  Phase-1 lock is client-side; editor is the only sanctioned write path).
- [ ] Version auto-refresh on tab re-focus (today: page-load only; idle tabs keep the old
  build until next visit — acceptable, documented).
