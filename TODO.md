# To Do — KP Vacation Auction
**Updated 13 Aug 2026.** Owner-maintained; future Claude sessions should read this alongside `handoff.md`.

## E-mail / EmailJS

- [x] **EmailJS template footer added (13 Aug 2026, DONE — lives OUTSIDE the repo).**
  The shared template `template_rss3fn3` (the only template either site uses) now carries a
  footer under `{{changes}}`: "View your bids and auction status:
  https://anesthesia-kp.github.io/vacation/". Every e-mail from both sites gets it
  automatically. **Do NOT also add this link in code** — it would double up.
  Owner verified rendering with a test send.

- [ ] **Post-265 cleanup (LOW, cosmetic — do NOT do during code freeze):** two admin e-mail
  bodies already contained the site link before the footer existed and now show it twice:
  1. Bidding-reminder e-mail ("Place your bids here: …", admin ≈ line 5681 in build 265)
  2. "Add us to your contacts" e-mail ("Sign in here: ${AUCTION_SITE_URL}", admin ≈ line 9258)
  Decision 13 Aug: LEAVE AS-IS for now — the in-body links are contextual calls-to-action and
  duplication is harmless. If removed later: fold into the next real build after 265 ships,
  with the usual tests + honesty check. Never a standalone deploy.

## Test-suite maintenance (false reds, not build bugs — verified 12 Aug)

- [ ] `tests/test-backup-restore.mjs` + `tests/test-p4-rounds.mjs`: sandboxes for
  `closePhaseBidding` need a `mondays` stub (B5 made lock/close dialogs use
  `${mondays.length}`; the real page has it in module scope — verified, production fine).
  Until patched, both suites crash early on build 265.
- [ ] `tests/test-lead-admin.mjs`: the "Reset card is last on Controls" check greps for the
  old card name "Outbid Alert Queue"; B3 renamed it "E-mail Queue". Update the search string.
  (Actual card order verified correct: … → E-mail Queue → 📅 Auction Calendar → Reset/danger last.)

## Pre-deploy gates still owed for staged build 265/136

- [ ] **Playwright button sweep** (`tests/sweep/`, offline via fake/ stubs) — the one named
  gate not yet run. Required per NE-11 before launch.
- [ ] Owner reviews gate report v2, places staged files per BUILD-NOTES.md table, pushes
  personally. (All other gates green — see GATE-REPORT-build265.md.)
