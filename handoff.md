# Handoff — KP East Bay Anesthesia Vacation Auction

**Written:** 30 July 2026, replacing the 29 July handoff · **By:** the Opus/Fable session of 30 Jul
**Convention unchanged:** **[VERIFIED]** = proven by a runnable test or direct observation.
**[BELIEVED]** = reasoning. If this document conflicts with the code, the code is right — say so
and correct the record.

**Start here:**
```bash
REPO_ROOT=/Users/aaronfrankel/Documents/GitHub node tests/run-all.mjs   # 6 suites, 646 assertions
```

---

## 0. STANDING RULES — binding, unchanged from the previous handoff

The user's eight rules verbatim (never rewrite whole files; read → edit → `node --check` every
inline script → run suites; bump `var BUILD` AND versions.json, deliver, commit summary; STOP and
ask when unsure; plain explanations, high-quality code; don't touch the deferred list (§6) without
asking; do not agree with bad ideas — push back; rules changes PUBLISHED in Firebase console before
dependent client code pushes). Plus the learned practices: small batches by subsystem with an
adversarial re-audit after each (measured fix→regression ≈ 1:1); tests must EXECUTE extracted real
code with an honesty check proving each new test FAILS against the pre-fix build; verify every
assumption against code before acting; extractor gotchas (no default-param braces `opts={}` in
extracted functions, no stray `{` in comments inside them); prefer grep + ranged reads (admin file
~590KB).

**New standing decisions this session (do not relitigate):**
- **No one-click destructive actions, in rehearsal OR live.** Every auction-critical write or send
  passes through a dialog; dialogs are paint, GUARDS at the moment of action are the enforcement.
- **Rehearsal Mode** (stored flag still `adminSettings.simulatorEnabled`) gates the simulator,
  "⏭ Skip backup (testing)", and "⏭ Skip sending (testing)". Mail stays LIVE in rehearsal (user
  tests e-mail constantly). Arming always confirms (danger-styled once phases run); disarm is
  one-click, including from the dashboard pill on the Current Phase card. Begin Phase 1 asks
  real-launch vs rehearsal-run. Every restore lands with rehearsal OFF. Visibility replaces
  unreachability — only the human knows a real run from a rehearsal.
- **Duplicate login e-mails are refused at entry in BOTH admin sites and fail CLOSED in the map**
  (collided address excluded → that Google account can bid as nobody; loud warning). Restore
  REBUILDS emailToUser from the restored loginEmails — never trusts the stored map.
- **passcodes: retired permanently** (user ruling 30 Jul). `passcodesEnabled` stays off forever;
  world-readable by design, unsecurable client-side; Google sign-in is the gate. Accepted.
- The user always wants delivered files WRITTEN into the repo folders without asking.

## 1. CURRENT STATE (31 Jul 2026)

- **Live (pushed):** staff 126 / admin 232 (Batches A/B/C + audits, live test bid verified).
  **On the user's disk, awaiting push:** staff **127**, admin **235**, versions.json
  {"index":127,"mobile":16,"admin":235}, updated tests, this handoff. Builds 233–235
  (Batches B2 and D) were adversarially audited BEFORE deploy; the audit's 3 findings
  (Cancel-Bid twin of the adminRemove fix, virgin-DB not-found fallback, ledger warning on the
  success toast) were fixed as 235.
- **Test suite: 800 assertions, 6 suites, all green** against the workspace copy; every new
  test carries an executed honesty check against the shipped baseline (or a reconstructed
  pre-fix build) proving it fails there. [VERIFIED]
- Firestore rules: unchanged this session; published state as before (backups block included).
- Schedule app: admin 48 (was 46) — duplicate-email twin fix only. Staff schedule 24 untouched.
- Firebase project vacation-25e8e; EmailJS service_wpprivw/template_rss3fn3, quota 2000/mo.

## 2. WHAT THIS SESSION DID (admin 217→229, staff 125→126, schedule 46→48, tests 541→704)

1. **218** — Complete Phase warning rewritten to CONTRADICTED decisions only (projected WIN but
   denied / projected LOSE but approved — new mirror check `_allStaleApprovals`). Draws/reviews
   denials are normal resolution and never warn (user ruling; a denied whole draw is legitimate).
   Backup stall fixed: `_backupFetchAll` concurrent + 20s timeout + one retry + sticky progress
   counter ("X of 28"); commit timeout reported as inconclusive.
2. **219** — one-click sweep fixes D1–D5: adminChangePriority (onchange dropdown!) now confirms
   with old→new + side effects, cancel redraws; `_fixClosePhaseBidding` split entry/worker with
   its own confirm before the backup prompt (dashboard route calls the worker, never two dialogs);
   `_fixLockAllWeeksInline`, `toggleGlobalLock`, `saveAllSlots` (diff-counting, no-op refusal) all
   confirm.
3. **220** — Rehearsal Mode (see §0). One-way door BOTH sides at the time; `_beginPhase1SimOverride`
   removed.
4. **221** — audit fix: commit-timeout catch no longer swallows DEFINITE commit failures
   (permission-denied etc. report FAILED + code; only tagged timeouts are inconclusive).
5. **222** — audit fixes: click-time re-checks everywhere (skip-backup button, skip-results
   onConfirm, `_execSimulationApprovals`); `_phasesReady` load-window guard on arming;
   renderSimPanel can't re-enable Run past the gate; cancel-blur for the D3 dialog.
6. **223** — user's design: rehearsal run-throughs restored. Hard refusal replaced by danger
   confirm; dashboard pill with one-click Turn off; `_beginPhase1KeepRehearsal` ghost path.
7. **224** — pill inline with Current Phase title; arming ALWAYS confirms (plain pre-launch).
8. **225/226 + schedule 47/48** — duplicate-login-email CRITICAL fixed both sites (see §0);
   restore rebuilds emailToUser (audit HIGH); pre-launch arming re-checks phase1Started at
   confirm time; disarm failures reported honestly; schedule saveSchedUser loaded-gate + batch
   orphan check.

**Audits run (all "skeptical Claude" adversarial):** backup/restore changes (found the 221 issue),
UI wiring, rehearsal lifecycle ×2 (found the 222 and 226 issues), duplicate-email fix (found the
restore HIGH). Two-skeptic verification (confirmer vs refuter pairs) of sweep D6–D13 and the 3
critic leads — see VERIFICATION-2026-07-30.md for full verdicts.

## 3. THE QUEUE (user-approved order; wait for go-ahead per batch)

0. **Write files to disk; user pushes vacation + schedule repos.** Then hard-refresh, confirm
   live admin 226.
1. **Live-fire backup/restore check — PASSED 30 Jul.** [VERIFIED] Cloud backup → cloud restore
   round-tripped the real database: A↔B diff showed ONLY the timestamp, one restore-log entry,
   and a 57.0s timer shift that exactly matches the resume math (expired-in-place preserved).
   The test also EXPOSED the dead-feed/lost-write incident: a network storm killed the tab's
   listeners (stale "timer off" display) and Begin Phase 1's timer arm write was lost silently
   (both backup files prove lastChange stayed 28 Jul). Fixed in build 227 (below).
2. **Batch A — DONE (staff 126 / admin 228) + connection integrity (227) + audit fixes (229).**
   227: onSnapshot auto-resubscribe with backoff, feedStaleBanner, `_feedsHealthyOrExplain` gates
   on every phase-freezing action, VERIFIED timer arm (`_armPhaseTimer` setDoc + read-back echo,
   both under 15s timeouts — the 30 Jul lost-write case now reports "did NOT verifiably arm").
   228: staff atomic bid+tag writeBatch (Lead 3); admin dead-bid replacement dialog (Lead 2);
   `_stableStr` order-insensitive settings compare + named diff keys (the "1 setting differ"
   live-fire false positive). 229 (adversarial-audit findings on the above): fromCache snapshots
   are NOT recovery (dead feed forwards nothing until a genuine server snapshot); prior-phase
   WINNERS refused in the replace path (wins are permanent); replace dialog gets adminBidIssues
   warnings; action-time `_feedsHealthyOrExplain` re-checks inside Complete Phase's onConfirm and
   `_commitBeginPhase`; Send Phase Results gated. **Live test bid PASSED 31 Jul** (place + remove,
   test account, timer restarted, Smart Lock applied) — the atomic writeBatch clears the published
   rules on the real server. Batch A fully closed. [VERIFIED]
3. **Batch B — DONE (build 230).** D9 login-email old→new confirm (+ 232: click-time duplicate
   re-check), D10 alerts-OFF danger confirm (ON stays one-click), D6 prio-lock confirms both ways,
   D8 KP-address old→new confirm (welcome moved inside confirm; no-change = no-op), D13 per-week
   capacity diff-confirm (no-op refused; unsaved week always counts as change; + 232: Cancel
   reverts the row inputs), Lead 1 `finalFteForWeek` orphan filter (+ 232: I2-reuse check too —
   full mirror of completePhase's snapshot filter).
4. **Batch C — DONE (builds 231/232, the pre-launch requirement).** "👤 One user…" button on every
   cloud backup row → same picker/preview/danger-confirm flow as file backups (shared
   `_restoreUserFlow`, feed-health gated). `_doUserRestore` is now ONE atomic batch (was 4
   sequential writes) with a timed-out commit (inconclusive "may still apply — check before
   retrying") and a wholesale-replace not-found fallback. `_cbFetchFile` (shared by full + one-user
   cloud restore) is concurrent, timed out per read with one retry, progress-counted. M7 torn-read
   fix: after a clean backup fetch, schedule/bidPhase/bestBids/bidTimes are re-read adjacently
   until stable (order-insensitive compare) — a mid-fetch bid can no longer be photographed
   without its tag/lock/timestamp. 232 also: deleted-user restore is refused with re-add-first
   instructions (no ghost bidder at default FTE); FETCH-FAILED schedule can't junk the picker
   roster. Accepted cosmetic: the sticky counter can sit at "28 of 28" up to ~40s during a slow
   re-check.
5. **Batch B2 — DONE (build 233, audit fixes 235).** Both admin delete paths (adminRemove AND
   Draws & Reviews' Cancel Bid) run through ONE shared atomic 5-op delete (`_adminDeleteBidAtomic`)
   with honest failure ("NOT removed/cancelled", nothing logged or e-mailed), a virgin-database
   not-found fallback (skips only docs that don't exist; real rejections report PARTIAL), and
   local state touched only after the server confirms. capBreaches(sim) counts the PENDING
   approval being confirmed (both approve dialogs pass it; the note says "includes the approval
   you are confirming now"); Complete Phase's confirm shows the cap advisory.
6. **Batch D — DONE (admin 234 / staff 127; user go-ahead 31 Jul = the formal Group-2 ruling).**
   M4: the three bid-edit confirms RETURN the write promise (the "Action failed" net is
   reconnected) and a failed save reverts the table. M2: the delivered-address ledger retries
   once and ALL THREE outcome toasts warn about the re-send trap when it can't save. M5: addUser
   tells the truth when the FTE save fails. M9 (staff): bookkeeping failures after a saved bid
   are caught ("Your bid IS saved…"), the modal always closes, and local floor/timestamp mirrors
   stamp only after their writes land. L1: getUserFTE coerces string FTEs on BOTH sites. L2:
   Begin Phase failure toasts stopped claiming "nothing was changed". L3 had already shipped in
   231. Per the same ruling: Group 1 closed (M6/M8/M3), deferrals stand (M1 post-launch engine
   batch, L4 ride-along; M7 shipped with Batch C).
7. **Confirmed audit queue:** 28 medium, 14 low, small re-audited batches.
8. **E-mail deliverability — user ruling 30 Jul, FINAL: no domain purchase.** EmailJS keeps
   sending via personal Gmail. Deliverability rests on (a) the Whitelist Tracker — getting all 37
   users confirmed is now a genuine LAUNCH item — and (b) the KP IT allowlist request, which stays
   on the to-do as the USER'S item (needs someone at KP). Do not re-propose the domain.

**Refuted / accepted (do NOT fix without asking):** D7 flushMailQueue (queue auto-sends anyway;
optional 30000ms tweak), D11 toggleNpPhase (engine never reads the flag; placement gate only),
D12 saveFte (armed-mode confirm suffices; logged idea: auto-relock). Logged non-blocking: schedule
race warning asymmetry, staff generic permission error for duplicate-locked users, toast blanking
progress counter, keep-15 momentary overrun after commit-timeout, saveAllSlots writes all 104
fields while dialog counts changes.

## 4. ARCHITECTURE — unchanged (the 29 Jul handoff's §4 ten-line summary is still accurate)

Two static sites + schedule app sharing one Firestore. All logic inline `<script>`. Two
computeApprovals twins differ in SIGNATURE deliberately; port logic only. Mail relayed by any open
signed-in page. Rules enforce per-user bid confinement via emailToUser (now collision-fail-closed),
server-clock timer, biddingClosed gate, append-only changes, admin-only decisions/backups.

## 5. DEPLOY FLOW — unchanged. Rules changes publish in the console BEFORE dependent client pushes.

## 6. DEFERRED / KNOWN-ACCEPTED — the 29 Jul list still stands, PLUS: passcodes retired
permanently; the refuted items in §3 above.

## 7. WAIT FOR INSTRUCTIONS between batches. The user drives the order.
