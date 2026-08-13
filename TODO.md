# To Do — KP Vacation Auction
**Updated 13 Aug 2026 (evening).** Owner-maintained; future Claude sessions should read this alongside `handoff.md`.

## Builds

- [x] **Build 265/136 DEPLOYED (13 Aug).** All gates green pre-push; post-deploy audit clean
  (full lifecycle run-through, 0 errors, 0 never-event findings). See GATE-REPORT + POST-DEPLOY-AUDIT.
- [ ] **Build 266/137 — Bid Floors by Week Category — STAGED in `build266-staged/`, ALL GATES GREEN, awaiting owner push.**
  One rule: a bid must be at least as strong as the week category's floor (HD default 4,
  Summer default No floor, all other weeks always No floor). Engine-enforced on both sites
  (closes the NE-4 below-floor/forged-NP soft spot); locked once Phase 1 begins; behavioral
  no-op until a floor is changed (test-proven: 44/44 + honesty 0/30 + adversarial 11/11).
  Placement per the table in `build266-staged/BUILD-NOTES.md`; commit message prepared.
  Owner deploy timing: owner chose "as soon as gates pass"; recommendation on record is the
  next between-phases pause. Owner pushes personally, as always.

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

## Test-suite maintenance (false reds, not build bugs)

- [ ] `tests/test-backup-restore.mjs` + `tests/test-p4-rounds.mjs`: sandboxes for
  `closePhaseBidding` need a `mondays` stub (B5 made lock/close dialogs use
  `${mondays.length}`; the real page has it in module scope — verified, production fine).
  Working patched copies exist (verified: both suites then match baseline totals 176/9 and
  154/3 on builds 265 AND 266) — ask Claude to file them into `tests/` when convenient.
- [ ] `tests/test-lead-admin.mjs`: the "Reset card is last on Controls" check greps for the
  old card name "Outbid Alert Queue"; B3 renamed it "E-mail Queue". Update the search string.
  (Actual card order verified correct: … → E-mail Queue → 📅 Auction Calendar → Reset/danger last.)
- [ ] After 266 ships: copy `tests-build266.mjs` into `tests/` (it's in `build266-staged/`;
  `--pre` honesty mode needs pristine 265/136 copies at `/tmp/admin.html` + `/tmp/staff.html`).

## Optional hardening (deferred-minor, no urgency)

- [ ] Firestore rule freezing `auctionConfig` + `bidFloors` once Phase 1 starts (today the
  Phase-1 lock is client-side; editor is the only sanctioned write path).
- [ ] Version auto-refresh on tab re-focus (today: page-load only; idle tabs keep the old
  build until next visit — acceptable, documented).
