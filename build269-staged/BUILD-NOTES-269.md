# Build 269 (admin only) — the 15 Aug incident hardening
**Built 15 Aug 2026, same-day response to a real production incident during the live group
rehearsal: after a Full Restore of a pre-completion backup, re-sending Phase 2 results
e-mailed all 31 users a SECOND results e-mail. Staff page (139), mobile (17) and
firestore.rules are UNCHANGED — this push needs NO Firebase console step.**

## The incident, reconstructed and reproduced
The owner's own backup file (12:15:07 PM, build 267) captured the torn server state:
`resultsSent` stamped for phase 1 only, `completedPhases` missing phase 2, the phase-2
change log reset 12 seconds earlier with NO phase-2 archive. Root disease, three instances,
one cause: **at critical moments the page trusted its own possibly-stale in-memory mirrors
instead of the server.**
1. The results senders decided "who already got mailed" from the tab mirror of the
   delivered-address ledger.
2. `_publishPhaseResults` REPLACED the staging doc from tab mirrors — a stale mirror
   erased the ledger the send had written seconds earlier, and could stamp resultsSent
   while never publishing the completed snapshot (the torn state above).
3. `completePhase` archived the change log from tab mirrors — a stale mirror archived
   nothing, then the resets destroyed the phase's audit trail anyway.
Reproduced end-to-end in the browser harness (`sweep268/resend-repro-test.mjs`): one
simulated feed blip during the send → ledger erased → restore → re-send → 4/4 duplicate
e-mails on the pushed-268 bytes; ZERO on 269.

## The fixes (all admin/index.html)
- **`_ledgerFresh`** — both senders (classic phase + P4 round) now read the delivered-
  address ledger from the SERVER (`getDocFromServer` — a cached copy is never proof) at
  the moment of sending. Unreachable server → the send REFUSES in plain language
  ("NOT sending, so nobody gets a duplicate e-mail") — fail closed, never mass-mail blind.
- **`_publishPhaseResults`** — publishes from a server read of the staging doc: the
  completed snapshot comes from the server (torn-state fix), and every field preserved
  across the staging replace (ledger, round ledger, staged rounds) comes from the same
  read (clobber fix). Unreachable → throws; every caller already treats that as
  "nothing changed, retry".
- **`_commitBeginPhase`** — the staging replace preserves the ledger from a server read;
  unverifiable → the phase does NOT begin (honest [234·L2] wording: week locks may
  already have changed).
- **Full Restore** — gains the feed-health gate it was missing (parity with Restore One
  User) plus PRE-FLIGHT 3: the ledger is verified on the server BEFORE any side effect
  (before even the mail-queue clear); unverifiable → abort, nothing changed. The staging
  preserve uses that read.
- **`completePhase` change-log archive** — merged log = SERVER reads of both log docs
  ∪ the tab mirrors, deduped by entry id (covers both a stale mirror AND an in-flight
  write), and the resets run ONLY after a verified archive — an unarchivable log is left
  intact for retry instead of being destroyed.

## Sandbox convention honored
Every new reference is typeof-guarded (`_ledgerFresh`, `getDocFromServer`,
`_feedsHealthyOrExplain` in the restore): legacy extracted-code sandboxes get exactly the
pre-269 behavior; production always has the symbols; suite pins fail if a guard is removed.

## Not in this build (deliberate)
- No e-mail freeze / results toggle: the owner's need ("advance without e-mailing during
  testing") is already served by Rehearsal Mode's "⏭ Skip sending (testing)" button —
  verified to be invisible to staff and to change nothing except revealing testing buttons.
- The already-sent duplicate e-mails cannot be unsent; EmailJS quota consumed accordingly.

## Verification (final bytes, full battery re-run)
tests-build269 **40/40** (executed: _ledgerFresh 4 states; round sender refuse/skip/send;
publish torn-state + clobber + legacy-scope; restore abort-before-side-effects) · honesty
`--pre` vs the pushed-268 fixture (md5 14f9614193922b7e0fea592bfeee5e21, reconstructed
from device git): **3 fails + abort** · resend-repro **12/12** on 269 AND the incident
faithfully REPRODUCES on the 268 fixture (ledger erased, 4/4 duplicated) — the fix has
teeth · tests-build268 **197/197** + honesty 12-fail+abort · browser E2E **41/41**
(ratchet pin now 139/269) · 4-pass button sweep **clean** (0 errors, all four passes) ·
phase-runthrough **finishedNaturally, 0 errors, 0 NE findings** · cal-editor 14/14 ·
bf-card 10/10 · autoclose 5/5 · mobile clean (one pre-existing advisory) · mega-fuzz
**100k×6 = 1.8M checks ZERO** · audit-handlers **182/0** · era suites 265/265-b5/266/267
= 25/46/44/26 vs md5-verified era fixtures · run-all: the same 8 documented
honesty-baseline-class reds ONLY (audit-fixes 333 real green; p4-rounds 154; all
non-honesty counts 0) · engines byte-identical to 267 (32 fns) + twin generators
identical · suite maintenance, all documented in-file: BUILD/versions pins → 269, four
p4-rounds shape pins → server-sourced forms, one audit-fixes slice window widened
(5400→6600), one L2-honest toast wording.

## Deploy (owner)
1. Push in GitHub Desktop (files: admin/index.html, versions.json, TODO.md,
   .claude-commit-msg.txt refresh, build269-staged/). **No Firebase console step — the
   rules did not change.**
2. Live-verify versions.json (cache-busted) = {"index":139,"mobile":17,"admin":269}.
   The stale-build gate force-reloads every open admin tab onto 269 automatically.
3. Optional live proof whenever convenient: with results already sent for a phase,
   click Send again → expect "already sent — nothing new to send" (the server ledger
   now guarantees it even after restores and connection blips).
