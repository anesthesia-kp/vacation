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
- [ ] **Build 267/138 — Calendar redesign (fixed 6 HD weeks) + e-mail link dedup — STAGED in `build267-staged/`, ALL GATES GREEN, awaiting owner placement + push.**
  Fixed identity for the six HD weeks (no rename/delete/HD-toggle); ✨ Suggest fills
  Thanksgiving/Christmas/New Year's; Ski + Spring Breaks have no default and clear on year
  change; 5 federal holidays auto-label from the year; a holiday landing on a chosen HD week
  rides as a dual label ("⛷️ Ski Week · 🏛️ Presidents' Day") — display only. Reminder +
  contacts e-mails now point at the footer link. Behavioral no-op until a calendar is saved.
  TWO STEPS to deploy: ask Claude to file into the working tree, then commit + push.
  Gates: 26/26 · honesty 24-fail · sweep clean · editor browser test 13/13.

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
