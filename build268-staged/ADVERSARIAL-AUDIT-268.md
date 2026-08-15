# Adversarial audit — build 268 (admin) / 139 (staff) + firestore.rules
**15 Aug 2026 · pre-ship, per house rule: fairness-critical changes are attacked before they ship.**
Attack surface: the 7-key config freeze, the stale-build gate, HD checkboxes, Bid Lowerings,
smart copy, the between-phases unlock (GAP addendum) and the KP-prompt race fix (KPFIX
addendum). Method: enumerate attacks, try each against the actual code (executed where
possible), fix or classify. **Two real findings, both FIXED before ship. Zero open criticals.**

## Findings that changed the build
**F-1 · Lowering counter lost-update (FIXED).** The first cut wrote `used: n+1` read-then-write.
Two tabs of the SAME user lowering simultaneously would each read 0 and write 1 — one free
lowering. Fixed: atomic server-side `increment(1)` on the user's own key. Executed proof in
tests-build268 (sentinel-shape assertion) + the browser E2E.
**F-2 · Local-mirror double count under latency compensation (FIXED).** Firestore's local
snapshot echo can fire BEFORE `setDoc` resolves; bumping the mirror by `blUsed()+1` after the
await then counted the spend twice locally (transiently denying a legitimate lowering).
Fixed: capture the expected count before the write, then `Math.max(echo, expected)` — the
server echo stays authoritative. Caught live by the browser E2E (second lowering wrongly
blocked in the harness, which fires echoes synchronously — a harsher scheduler than prod).

## Attacks that FAILED (the guards held) — each executed unless noted
- **Freeze / dotted-path bypass** (`updateDoc('auctionConfig.year')`): rules `diff().affectedKeys()`
  reports top-level keys → blocked. *Not executable here (no emulator) → Playground case 8.*
- **Freeze / single-key deleteField** inside a merge: affectedKeys catches it → blocked (same
  clause). *Playground case 9.*
- **Freeze / whole-document delete**: `request.method=='delete'` branch → blocked. Tested as text;
  Playground case 5.
- **Freeze blocking legit traffic**: all 22 `setDoc(adminRef…)` writers inventoried — the 7 frozen-key
  writers are the sanctioned editors (each now client-refuses at click time + translates a server
  denial); every other writer is a single non-frozen-key merge, incl. the gate's `requiredBuilds`
  ratchet (pinned NOT-frozen in the suite).
- **Gate / reload loop**: once-per-required-value sessionStorage guard — executed (second snapshot
  with same value → no second overlay; stale CDN can never loop it).
- **Gate / rollback attack** (restored backup carries old `requiredBuilds`): gate compares
  `required > mine` only → inert; next admin load re-arms. Executed.
- **Gate / ratchet downgrade** (stale versions.json from a CDN edge): one-way max() — executed
  (never writes a lower number).
- **HD checkboxes / two entries one week**: a federal holiday landing on an UNCHECKED fixed week
  still rides as a note; the auto entry is absorbed — executed (no duplicate-wk entries).
- **HD checkboxes / legacy config drift**: all-checked config ≡ 267 behavior byte-for-byte through
  the derivation chain; engines byte-identical to 267 (14 functions diffed — ZERO drift).
- **Lowering / cancel-then-rebid dodge**: the floor is the STORED bestBids value and survives
  cancellation (pre-existing design, re-verified) — the counter cannot be dodged by cancelling.
- **Lowering / two-tab stale options**: options built from stale state are re-checked at commit
  (L-3) — forced-enabled option submitted directly was refused with the exhausted message and
  ZERO state change (browser-executed).
- **Lowering / NP dodge**: numeric→NP is a lowering by the same comparator; NP under a BF floor
  or an NP-off phase stays independently blocked (checks run before the lowering path).
- **Lowering / free ride on raise**: raising never consumes (executed: counter untouched, floor
  ratchets up).
- **Lowering vs. engine fairness**: engines untouched (byte-identical); 100k-scenario mega-fuzz
  (1.8M checks) re-run on the final bytes — zero violations. A lowered bid is just a weaker bid.
- **Copy honesty**: every collapse form pinned; exhausted message pinned to never mention the
  admin override; caps collapse proven truth-preserving case-by-case (cumulative-cap semantics).

## GAP addendum (item 13, attacked 15 Aug after the owner's between-phases ruling)
- **Unlock during the private-decisions window?** NO — gap requires results SENT; the
  completed-but-unsent state stays locked. Executed on the client predicate AND pinned to
  the same three phase fields in rules (drift = red test). Playground case 17.
- **Year change smuggled through a gap?** Client: selector disabled + save refusal.
  Server: year comparison incl. the no-saved-config → 2027-default case; key-removal and
  doc-delete fail the comparison. Playground cases 15/16.
- **Concurrent gap-close race** (admin A saves a dial while admin B begins the next phase):
  rules re-evaluate against the CURRENT phases doc at write time — if the gap ended first,
  the server denies. Defence-in-depth beyond the client check.
- **Silent bid-stranding via gap reclassification** (floors or HD/summer changes making
  placed bids below-floor, which the engine then refuses silently): every gap dialog warns;
  floors + calendar saves compute and NAME the stranded bids (executed test); the calendar
  path adds a danger-confirm. Residual by design: users are not auto-notified — the admin
  is told exactly that.
- **Forged gap state?** The phases doc is admin-only; a non-admin cannot manufacture a gap.
- **Engine under gap-edited configs:** unchanged engines + the 100k mega-fuzz already sweep
  arbitrary configs; a gap edit is just a config the fuzzer has been hitting all along.

## KPFIX addendum (item 14, attacked 15 Aug after the owner's stale-prompt report)
- **Prompt suppressed forever by the fail-quiet gate?** NO — `_emLoadedOk` is per-page-load;
  the next login's read (or the authenticated snapshot, which retries by reconnection) sets
  it. A never-asked user skipped once is asked at the next login — the exact semantics of
  the existing "Remind me later" button. Executed (suite + browser F2 recovery step).
- **`_kpModalSync` closing a genuinely unanswered user's modal?** NO — it closes only on
  `__skip__` or a string containing `@`; the unanswered case is pinned to stay open
  (executed, both harnesses).
- **Modal closing under a typing user?** Only if THEIR answer lands from another tab/device
  or the admin saves one for them — in every such case the question is already answered;
  closing is correct. A colleague's answer cannot close it (own-key lookup).
- **Early snapshot before identity resolves?** `_kpModalSync` reads
  `emailsData[selectedSignInName]`; pre-sign-in that key is `''`/undefined → no-op, and the
  modal cannot be open then anyway (it is only scheduled from completeSignIn). try/catch'd.
- **Legacy-sandbox drift?** typeof-guarded (convention pin in the suite); older suites that
  extract completeSignIn see exactly the pre-fix decision shape.
- **Does the fix mask a data problem?** No data was ever lost — the stored answer was
  correct throughout (verified in the owner's report: refresh showed no prompt). The fix
  changes WHEN the check runs and what it requires, not what is stored.

## Accepted residuals (documented, owner-known, unchanged in kind from 267)
- **R-1 · Devtools self-service**: a user editing their own `bidLowerings` key or writing
  `schedule` directly bypasses client gates — the EXACT trust level of the existing priority
  lock (rules cannot validate nested values). Cross-checks: append-only change log + the new
  Fair Play `overLower` flag (executed). A devtools bid write that skips `logOwnChange` evades
  the flag too — same visibility as every devtools bid edit today (Priority Locks panel shows
  floor-vs-bid mismatches).
- **R-2 · changes-log forge half**: forged `lowered` entries naming a colleague could smear them
  on the Fair Play panel — pre-existing, advisory-only panel, documented since H9.
- **R-3 · Type-corrupt `currentPhase`** (string "2"): rules' `is number` guard reads not-underway
  while the client coerces — a malicious ADMIN could theoretically thread that needle; a
  malicious admin can already do anything (§5a of the plan). Fail direction on plain corruption
  is DENY (safe).
- **R-4 · Freeze is admin-scope defence-in-depth**, not an anti-admin guarantee (owner-acknowledged
  in the plan §5a).

## Verification state after the KPFIX re-audit (15 Aug, FINAL final bytes)
Full battery re-run at the owner's request after folding in item 14:
tests-build268 **197/197** (16 new KPFIX assertions) · honesty `--pre` **12 fails + abort**
(unchanged class) · browser E2E **41/41** (new section F: declined-user clean load, live
bug reproduction under a simulated transient read failure — separately PROVEN to show the
prompt on the pristine 138 fixture — recovery, legit-prompt preserved, late-answer
auto-close) · classic 4-pass button sweep **clean** (291+13 / 249+13 clicks, 0 errors) ·
phase-runthrough **0 errors** · cal-editor **14/14** · bf-card **10/10** · autoclose-race
**5/5** · mobile: staff one PRE-EXISTING advisory (rememberMe <32px), admin + bidflow clean ·
mega-fuzz **100k×6 = 1.8M checks ZERO** on final bytes · audit-handlers **182/0** ·
run-all: delta 91/91 · fairplay 48/48 · engine-fuzz 4/4 · never-events 20/20 ·
round-months 25/25 · send-inflight 17/17 · audit-fixes **333 real green** (one test-side
char-window widened 600→900 — the KPFIX comment lengthened _subscribeSensitiveOnce; the
pinned mailQueue listener itself is unchanged) · backup-restore 177/9* · high-fixes 127/1* ·
lead-admin 16/4* · p4-rounds 154/3* · priority-inversion 10/2* · reopen-smartlock 23/2* ·
zero-results 28/2* (*honesty-baseline artifact class, documented) · era suites
265/265-b5/266/267 = **25/46/44/26** vs md5-verified era fixtures (the 267 pair was
re-reconstructed from device git — `git show HEAD:` — and matches the prior fixtures
byte-for-byte: daf370c8/8d98ddd2) · engines **byte-identical to 267 (32 functions)** ·
twin generators (prioLockBullets, blAllowance) **byte-identical** across the two pages.

## Verification state at audit close (final bytes)
tests-build268: **156/156** · honesty `--pre` vs pristine 267/138+old rules: **12 fails + abort
(expected)** · browser E2E (real pages, stubbed Firebase): **36/36** · mega-fuzz 100k×6: **0
violations** · never-events @40k: 20/20 · fairplay 48/48 · engine-fuzz 4/4 · audit-handlers
182/**0** · backup-restore 177/9* · high-fixes 127/1* · lead-admin 16/4* · priority-inversion
10/2* (*failing assertions are all pre-fix-fixture HONESTY baselines, unavailable in this
environment — same documented artifact class as the 13-Aug session; every real assertion green).
COMPLETED after re-auth (15 Aug): delta-fixes **91/91** · audit-fixes **333 real-assertion
green** (33 honesty-baseline artifacts) · classic 4-pass button sweep **clean** (291+13
cancel / 249+13 confirm clicks, 0 console/page/native errors) · full-lifecycle
phase-runthrough **0 errors** · cal-editor browser test **14/14** and bf-card **10/10**
(both updated to the 268 contract: HD checkboxes; pre-auction unlock made explicit) ·
mobile sweeps clean (one PRE-EXISTING advisory: rememberMe tap target <32px) · era suites
tests-build265/265-b5/266/267 = **25/46/44/26 all green** against era-correct fixtures
reconstructed from git (the earlier reds were fixture placement, not regressions) ·
round-months **28/28** + reopen-smartlock real assertions green after filing the
documented-class sandbox stubs + one derived-count pin update.
