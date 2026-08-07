# Session Handoff — August 7, 2026

**Purpose:** Complete state-of-project after the pre-launch hardening session. A fresh session (or a future you) should be able to work from this document alone. It supersedes memory of the chat that produced it. Read alongside `handoff.md` (project fundamentals), `NEVER-EVENTS.md` (safety charter), and `CODE-REVIEW-FINDINGS.md` (full findings detail).

---

## 1. Current deployed state

| Component | Build | Where it deploys |
|---|---|---|
| Staff site `index.html` | **130** | GitHub Pages (push to repo) |
| Admin site `admin/index.html` | **246** | GitHub Pages (push to repo) |
| `mobile.html` (redirect shell) | **17** | GitHub Pages (push to repo) |
| `firestore.rules` | L1 fix included | **Firebase — deploys SEPARATELY**: `firebase deploy --only firestore:rules`, or Firebase console → Firestore → Rules → paste → Publish |
| `versions.json` | `{"index":130,"mobile":17,"admin":246}` | GitHub Pages |

As of this writing the user confirmed **245 live**; builds 130/246 (the E1 counter fix) are written to the local GitHub folder awaiting push. The rules file with the L1 change is also in the folder — confirm it has been deployed to Firebase (site pushes do NOT deploy it).

Auction state at handoff: **staged demo state** — Not started, Rehearsal Mode ON, timer disabled, 0 weeks locked, no bids. A colleague run-through/demo was scheduled for today (Aug 7).

## 2. Fixes shipped this session (all fully tested)

| Build | Fix | What it does |
|---|---|---|
| admin 242 | Dashboard cold-load flash (part 1) | Readiness flags suppress the false "52 weeks have no saved FTE capacity" and lagging decided-counter during snapshot load |
| admin 243 | Cold-load flash (part 2) | Whole Next Step box waits for all five data feeds; no branch paints from half-loaded data |
| admin 244 | **H1** — timer auto-close race | `_autoCloseOnExpiry` re-reads the timer from the server before locking; a last-second bid that extended the countdown makes it stand down. Verified by a test reproducing the exact race |
| admin 245 | **M2** — removeUser uses `arrayRemove` per week (no clobber of a concurrent admin's decision) |
| admin 245 | **H2** — Complete Phase / Close Bidding re-check phase identity at confirm-click; stale dialogs stand down (2 dedicated suite tests) |
| admin 245 | **L4** — Send Phase Results targets the OLDEST unsent completed phase (a skipped phase's results can no longer be orphaned) |
| mobile 17 | **L5** — redirect restores leading `?` (no more 404 on `?auto=1&x=...` bookmarks) |
| rules | **L1** — `welcomeLog` write is append-only for registered users (wipe/forge denied; admin bypass kept). Verified by 10-case logic model; NOT emulator-tested (no emulator in sandbox) — mirrors the deployed `changes` rule pattern |
| staff 130 / admin 246 | **E1** — email quota counter: `setDoc(...{[k]:increment(1)},{merge:true})` replaces a fallback that could reset the cycle count to 1 on a transient write failure (user observed 94 vs EmailJS-actual 133) |

Earlier cosmetic changes (this same session, already live): confetti button removed (staff 128–129); "Under Review (R)" reworded on both sites incl. emails and the reports tooltip.

## 3. Verification net (how everything was proven)

- **Suite:** `tests/run-all.mjs` — 8 suites, **810 assertions** (incl. 2 new H2 stand-down tests). All green at handoff.
- **Handler audit:** `tests/audit-handlers.mjs` — 175 inline handlers, 0 scope violations.
- **Sandbox sweeps** (`tests/sweep/`): `driver.mjs` clicks every control on both sites, cancel- and confirm-pass, against a fake Firebase — all zeros. `mobile-test.mjs` (staff at iPhone-14 viewport incl. full touch bid flow), `mobile-admin.mjs` (all 12 admin panels), `mobile-bidflow.mjs`. Run: `node make-site.mjs && node driver.mjs` (Playwright preinstalled in cloud sessions).
  - Known acceptable flag: staff login `#rememberMe` checkbox <32px — its label is tappable; not a defect.
- **Engine:** 500k+ fuzzed auction lifecycles across 5 seeds — zero never-events. `tests/test-never-events.mjs` (`NEVER_FUZZ_N` env var scales it).
- **Live testing:** four complete 4-phase auctions on the deployed site (runs 1–4), including one full pass with every control setting changed (overage 0.5, caps 2/2, NP-in-P1, priority lock off, timer 24h) — all settings enforced correctly, all completions zero-contradiction, then everything restored and reset.
- **Skeptical review:** 5-lens adversarial panel + refutation pass over both sites + rules. 10 findings, 0 critical, all documented in `CODE-REVIEW-FINDINGS.md`. Engine math and security rules verified sound (no priority inversion, no over-cap approvals, no cross-user writes, no mid-phase decision leak, no two-site engine drift).

## 4. Deliberately-open items (documented residuals — do NOT fix casually)

Per the owner's explicit direction ("better to leave it alone than create new problems"), these remain open **on purpose**. Each is neutralized operationally:

- **M1** — results e-mails could double-send if TWO admins click Send within a slow >2-min send window. *Mitigation: single admin runs the auction (owner's standing practice).* Fix sketch (only if two-admin duty ever becomes real): renew the send-claim mid-loop; persist the `resultsSentTo` ledger incrementally.
- **L2** — mailQueue claim is claim/settle/re-check (3 guards) but not a transaction; a rare duplicate outbid alert is possible with a lagging background tab. *Worst case: one duplicate e-mail.* Fix sketch: wrap the claim in `runTransaction` (already used elsewhere).
- **L3** — a bid queued on an offline device during a previous round can replay into a freshly-reset auction (rules accept bid writes while the timer doc is `enabled:false`, which is Reset's end state). *Mitigation habit: after Reset Auction, turn **Global Lock ON** until you Begin Phase 1; glance at the board for unexpected populated cells before launch.* Begin Phase arms the timer with `biddingClosed:false` in the same verified merge, so a code fix would touch the launch lifecycle — deemed not worth the risk.
- **Cosmetic:** admin Approvals week-header stat line clips at phone width ("Remaining" truncated; derivable from cap − winning). Not worth a layout change.
- **Two dashboard load artifacts are FIXED** (242/243) — the honest loading placeholder for 1–2s on a cold load is intended behavior, not a bug.

## 5. Operating notes for the LIVE auction

1. **Run as the sole admin.** Most residual risks require two simultaneous admins.
2. **Timer:** the owner intends to let the timer expire on its own live — this is now safe (build 244 fix). The admin machine's clock should be OS-synced (macOS default). Keep one admin page open at/after expiry so auto-close can fire; the manual Close Bidding path also still works.
3. **Rehearsal Mode:** it was found unexpectedly OFF once this session — always verify the red banner state before a rehearsal (ON) and before real launch (OFF). Reset keeps it armed by design.
4. **After any Reset:** Global Lock ON until Begin Phase 1 (see L3).
5. **Email quota:** the in-app meter is advisory; **EmailJS's dashboard is the source of truth** (meter can now only under- vs never over-state by cycle-window mismatch — app cycle resets on the configurable day, default the 22nd, which may differ from EmailJS's billing day). Counter clobber bug fixed in 130/246.
6. **Results e-mails:** send (or rehearsal-skip) each phase's results before beginning the next phase — the dashboard Next Step prompts this. As of 245 an earlier unsent phase is auto-targeted, but don't rely on it live.
7. **Don't reload the admin dashboard mid-presentation**; give it ~2s after opening (loading placeholders are honest now, but still).
8. Emails currently only reach **test accounts** (owner-confirmed); rehearsal sends were skip-sent throughout testing.

## 6. Accepted design decisions (do NOT relitigate)

- `computeApprovals` has deliberately different signatures on the two sites (admin: `ignoreAdmin` boolean; staff: schedule snapshot). Port logic only.
- Reset Auction keeps Rehearsal Mode armed. Review overage up to 1.0 allowed; overage locks while the current phase has bids (incl. after the final phase — reset clears it). No email-domain restriction; passcodes retired; staff site doesn't auto-reconnect. NP phase toggle is superseded by the high-demand week rule (P1 weeks are all high-demand → NP-in-P1 toggle is moot; correct behavior). Priority-lock OFF legalizes below-floor bids; re-enabling doesn't unwind them. Cap raise auto-raises later phases' caps.

## 7. Standing workflow rules (owner's preferences)

- **CODE FREEZE discipline:** diagnose fully first; propose; wait for explicit go-ahead; smallest possible change; never rewrite whole files.
- Full gate for every change: `node --check` extracted scripts → full suite (`tests/run-all.mjs`) → handler audit → sandbox sweep (desktop + mobile) → build bump in the file **and** `versions.json` → deliver files into the chat **and** write them to the Mac's GitHub folder (`~/Documents/GitHub/vacation-kp.github.io/`) → paste-ready commit message. The owner pushes; sessions never push.
- `firestore.rules` deploys via Firebase separately — remind the owner every time it changes.
- Push back on risky ideas; don't chase cosmetic bugs near launch; owner values honesty about what is and isn't proven.

## 8. Commit for the pending E1 push

```
email counter: atomic create-or-increment (staff 130, admin 246)

trackEmailSent's fallback reset the cycle total to 1 whenever the
increment write blipped (observed live: app said 94, EmailJS said 133).
Replace with setDoc({[cycleKey]: increment(1)}, {merge:true}) — one
atomic create-or-increment, no clobber path. Counter is advisory only;
EmailJS dashboard remains the quota source of truth.

Verified: suite 810/810, handler audit clean, desktop + mobile sweeps
clean, counter semantics execute-tested (43 sends + mid-stream blip
→ 43; first-send doc creation → 1).
```
