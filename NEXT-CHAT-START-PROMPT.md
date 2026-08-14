# NEXT CHAT START PROMPT — KP Vacation Auction
**Written 13 Aug 2026 by the Claude session that shipped builds 265–267. Read fully before touching anything. This supersedes the previous version of this file.**

## What this is
Live production system: vacation-week auction for ~60 anesthesiologists (Kaiser East Bay).
- Staff site: `vacation-kp.github.io/index.html` → https://anesthesia-kp.github.io/vacation/
- Admin site: `vacation-kp.github.io/admin/index.html` (~750KB, single file)
- GitHub Pages + shared Firebase (Firestore, Google login). Repo `anesthesia-kp/vacation`.
- **The tests live in a SIBLING repo**: `Documents/GitHub/tests/` (a prior session wasted a day believing they didn't exist — they're one folder over, not inside the site repo).
- A LIVE GROUP REHEARSAL with real users is running (Phase 2 underway as of writing). "Rehearsal Mode" the software toggle is the owner's personal test switch and is OFF during the live rehearsal — don't conflate the two.

## Current state — all caught up, nothing in flight
**Live: admin 267 / staff 138 / mobile 17** (`versions.json` = `{"index":138,"mobile":17,"admin":267}`), live-verified after each push. Three builds shipped 12–13 Aug, every gate green each time:
- **265/136**: noindex; mail-queue parking (5 strikes → ⛔ Parked dialog); honest queue labels; mailStats removed from the restore map (counter-undercount ROOT CAUSE — later proven in production when the owner's reset+restore left the counter accurate); Auction Calendar config core (`adminSettings.auctionConfig`, defaults ≡ old literals, locked once Phase 1 begins).
- **266/137**: **Bid Floors by Week Category** — one rule: a bid must be at least as strong as the category's floor (ladder 1/2/3 › 1/2 › 1 › … › 10 › NP). HD default '4' (≡ old hardwired), Summer default 'none', other weeks always 'none'. `adminSettings.bidFloors`; card in Controls below NP-by-phase; dropdown wording "No floor — all bids allowed" (never "NP"/"None"). **ENGINE-enforced on both twins** (below-floor and NP-from-NP-off-placement-phase bids can neither win nor block; explicit admin approval remains the sanctioned, warned-about override). Locked at Phase 1; survives Reset.
- **267/138**: Calendar editor redesign — the SIX high-demand weeks are FIXED IDENTITY (⛷️ Ski, 🌸 Spring ×2, 🦃 Thanksgiving, 🎄 Christmas, 🎆 NYE; no rename/re-icon/delete/HD-toggle; only week placement chosen). ✨ Suggest fills exactly Thanks/Xmas/NYE; Ski+Springs have NO default and clear on year change. Five federal holidays auto-label from the year (🕊️🏛️🇺🇸🎇🛠️); one landing on a chosen HD week rides as a `note` → dual label ("⛷️ Ski Week · 🏛️ Presidents' Day"), display-only. Reminder + contacts e-mails now point at the EmailJS footer link (single link).
- **Outside the repo**: the shared EmailJS template `template_rss3fn3` carries a footer link ("View your bids and auction status: https://anesthesia-kp.github.io/vacation/", trailing slash). Never re-add that link in code.

**Verification state**: per-build suites (25/25, 46/46, 44/44, 26/26) with honesty runs proving each fails pre-fix; run-all real assertions green; audit-handlers 0 violations; Playwright button sweeps clean; full-lifecycle browser run-through (P1→P4 rounds→finish) 0 errors 0 never-event findings; adversarial bid-floors audit 11/11; **mega-fuzz: 100,000 random-config scenarios × 6 invariants = 1.8M checks, ZERO violations** (incl. twin-agreement F-6). Function inventory: every function added/changed in 265–267 has an executed test. See `MEGA-AUDIT-265-267.md`, `TODO.md`, and `build26x-staged/BUILD-NOTES.md` in the site repo folder.

## Outstanding work, in order

### 1 · While the rehearsal finishes — NOTHING. Do not deploy or change anything mid-phase without explicit owner direction.

### 2 · AFTER the rehearsal completes: THE FINAL EXHAUSTIVE MULTI-CLAUDE ADVERSARIAL AUDIT (owner-requested, the next chat's main event)
The owner wants one last, no-stone-unturned audit of the (essentially complete) system, using multi-agent orchestration with adversarial review. **The owner must explicitly request it in-chat ("run a multi-agent workflow audit" / "ultracode") — that's the opt-in for multi-agent orchestration.** Recommended shape (compose with the Workflow tool; scout inline first, then fan out):
- **Dimensions (one finder agent each, blind to the others)**: fairness engine & NE-1..NE-13 · bid floors + NP semantics · calendar/config derivation & cross-site twin identity · mail system (queue/parking/welcome/results/ledger) · backup/restore/reset lifecycle · Firestore rules vs client assumptions · phase lifecycle & P4 rounds · UI wiring/dialog guards · staleness/race conditions (snapshots, two-tab, multi-admin) · copy/docs truthfulness (do dialogs and e-mails tell the truth about behavior?).
- **Adversarial verify**: every finding goes to 2–3 independent skeptic agents prompted to REFUTE it against the actual code; only confirmed findings survive. Loop-until-dry (rounds until 2 consecutive rounds find nothing new).
- **Feed the agents the real artifacts**: the live files (byte-verify against GitHub first), `firestore.rules`, `NEVER-EVENTS.md`, `handoff.md`, `TODO.md`, the test suites. Run the whole existing battery first so agents chase gaps, not solved ground.
- **Triage output** critical/high vs deferred-minor, house style. Owner decides what ships in the final build.

### 3 · LAUNCH-EVE (between rehearsal end and the real auction) — the closing ritual
1. **Firestore-rule hardening build (~268)**: server-side freeze of `auctionConfig` + `bidFloors` once Phase 1 begins (today the lock is client-side only; this converts a promise into a guarantee). This is the ONE hardening the prior session recommends actually shipping. Fold in anything the mega-audit confirmed. Full gates + honesty tests as always.
2. **Backup-and-restore drill** on the owner's go (NE-9's planned launch-eve item): fresh cloud backup, full restore, verify round-trip.
3. **Timer verification pass** during a live phase (NE-12).
4. Optional: `FUZZ_N=500000 node tests/mega-fuzz.mjs` (~3 min) for a deeper sweep.
5. **Reset Auction** → calendar + floors unlock → owner configures the real year with the new editor (six weeks incl. school-calendar Ski/Springs, floors as desired). Verify the no-op→configured transition (one reload per page, by design).

### 4 · Housekeeping (no urgency)
- Owner commits/pushes the `tests` repo (repaired suites + new files sit uncommitted there).
- Deferred-minor list in `TODO.md` (tab-refocus version check; nothing else open).

## Working discipline — binding house rules + hard-won session lessons
- THE OWNER does all git pushes personally. Never push, never deploy, never write to production Firebase. The owner is not a coder: plain language, high-quality code, and PUSH BACK on bad ideas.
- Propose the smallest change → explicit "go" → make ONLY that change. Never rewrite whole files (targeted edits; the admin file is ~750KB).
- Every fix ships with tests that EXECUTE real extracted code + an honesty check proving the test FAILS on the pre-fix build. Bump `var BUILD` AND `versions.json` together; update `.claude-commit-msg.txt`.
- Anything touching HIGH_DEMAND_WEEKS / floors / Smart Lock / FTE caps / approvals / Phase-4 = fairness-critical → adversarial re-audit before ship. Keep the admin/staff twins identical where they're meant to be (byte-compare `_acNormalize` etc.).
- Engine code carries `typeof _bfEngineFilter==='function'` guards ONLY so extracted-code test sandboxes with legacy scope keep running — production always has the functions; a pin-test fails if the check is removed. Preserve this convention.
- **Deploy is TWO steps** (a push was once wasted on this): (1) Claude files staged files into the working tree (staged folders like `build268-staged/` are inert until copied), (2) owner commits + pushes in GitHub Desktop. Byte-verify (cmp) after filing; verify live files (raw.githubusercontent + versions.json, cache-busted) after every push. WebFetch truncates the 750KB admin file — BUILD markers + pre-push byte-identity are the proof, not full-file greps.
- E-mails only to test accounts during testing; EmailJS quota is limited — no bulk sends.
- The version auto-refresh runs on page LOAD only; open tabs keep the old build until revisit (by design). GitHub Pages caches ~10 min.

## Verification toolbox (all in the `tests` sibling repo)
`run-all.mjs` (aggregator) · `audit-handlers.mjs` · per-build suites `tests-build265/265-b5/266/267.mjs` (fixture paths at the top of each: pristine PRIOR-build copies, reconstructable from git history; `--pre` = honesty mode) · **`mega-fuzz.mjs`** (env `FUZZ_N`, deterministic seeds, runs real extracted engines under random configs) · `test-never-events.mjs` (env `NEVER_FUZZ_N`) · `sweep/` Playwright harness (`make-site.mjs` with env `REPO_ROOT`, `driver.mjs` 4-pass button sweep, plus `phase-runthrough.mjs` full-lifecycle driver, `bf-card-test.mjs`, `cal-editor-test.mjs`). In cloud sessions Chromium is preinstalled — launch Playwright with `executablePath` pointing at the preinstalled build if versions mismatch. Known: suites run best in a cloud session with fixtures at `/tmp` (see each file's header); the sandboxed sweep suppresses the editor-save one-shot reload (unit-covered elsewhere).

## Known accepted behaviors (owner-ruled — do NOT "fix")
- Reset+restore re-welcomes every user once (Reset clears the welcome log by design; Restore deliberately keeps the current log). Documented in TODO.
- Deleting a prior-phase winner KEEPS their FTE entry (their archived wins keep consuming correct capacity); archives are frozen history. A full restore DOES rewrite the roster.
- Draw wheel takes no automatic action; admin approves the winner manually. Tied groups may all show DRAW. Review overage 1.0. Reset keeps rehearsal armed. Staff site has no auto-reconnect.
- Floors/calendar LOCKED all auction (rehearsal included) — the cards showing 🔒 mid-auction is correct.

**First moves for the new session**: read this file, `TODO.md`, `MEGA-AUDIT-265-267.md`, and `NEVER-EVENTS.md`; verify live builds via `versions.json`; confirm with the owner whether the rehearsal is complete; then run item 2 (the multi-Claude audit) on the owner's explicit go. Finish this project in excellent fashion — the standard set so far is: every claim executed, every fix honesty-proven, every fairness change adversarially attacked, and the owner's authority absolute.
