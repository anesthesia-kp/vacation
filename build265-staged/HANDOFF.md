# HANDOFF — KP Vacation Auction · staged build admin 265 / staff 136
**Written 12 Aug 2026 by the claude.ai chat session that built this batch. Read fully before touching anything.**

## What this is
Live production system: vacation-week auction for ~60 anesthesiologists (Kaiser East Bay).
- Staff site: `index.html` → https://anesthesia-kp.github.io/vacation/
- Admin site: `admin/index.html` (~700KB, single file)
- GitHub Pages + shared Firebase (Firestore, Google login). Repo: `anesthesia-kp/vacation`.
- A live REHEARSAL with real users may still be running. **Nothing deploys until the owner says the rehearsal is done.**

## Current state
- The folder `build265-staged/` (wherever the owner placed it) contains a STAGED, NOT-SHIPPED build: all 5 backlog items. See `BUILD-NOTES.md` there for contents, and `claude-commit-msg.txt` for the prepared commit message.
- In-chat verification already done: node --check green; 25/25 + 46/46 tests green (both suites included, standalone `node <file>`); honesty runs fail 16+19 fix-tests against pristine 264/135; full diff audit (42+12 hunks, all mapped).
- The repo's live files are still 264/135. `versions.json` must become `{"index":136,"mobile":17,"admin":265}` at deploy.

## Your job (in order) — DO NOT DEPLOY
1. Run `tests/run-all.mjs` (repo test suite). Known artifact: 3 HONESTY CHECK lines false-fail when the on-disk baseline is recent — verify by running without a baseline before treating as real.
2. Run `audit-handlers.mjs` against the STAGED files (they add 7+ new buttons/handlers: calendar editor, parked-mail dialog).
3. Run the Playwright button sweep against the STAGED files (serve locally; do not point at the live site with test writes).
4. Adversarial fairness re-audit of B5: it changes how HIGH_DEMAND_WEEKS, SPECIAL caps, staff SPECIAL_WEEKS, and summer windows are DERIVED (from `adminSettings.auctionConfig`, defaults = old literals). Attack load order, cache staleness, the reload loop guard, and cross-site consistency. Fairness never-events list NE-1..NE-13 is in the repo docs.
5. Report results to the owner. THE OWNER does all git pushes personally. Never push, never deploy, never write to production Firebase.

## Working discipline (owner's standing rules — binding)
- Code freeze until rehearsal ends: propose the smallest change, wait for an explicit "go", make ONLY that change.
- Never rewrite whole files. Targeted edits only (the admin file is ~700KB).
- Every fix ships with tests that EXECUTE real extracted code, plus an honesty check proving the test fails on the pre-fix build.
- Bump `var BUILD` AND `versions.json` together on every deploy. Update `.claude-commit-msg.txt`.
- Anything touching HIGH_DEMAND_WEEKS / Smart Lock / FTE caps / approvals / Phase-4 = fairness-critical → adversarial re-audit before ship.
- E-mails only to test accounts during testing. EmailJS quota is limited — no bulk sends.
- The owner is not a coder: plain-language explanations, high-quality code, and push back on bad ideas rather than agreeing.

## After the gates pass (still owner-driven)
Owner places staged files per the table in BUILD-NOTES.md, reviews, pushes. Then: full-project audit + browser run-throughs of every phase (all Phase-4 rounds, all reports, explicit never-event checks), triaged critical/high vs deferred minor.
