# Live auction run — build 258 (admin) / 133 (staff) — overnight 2026-08-09/10
Protocol: bids only AF & AAT via Edit Selections, 1 bid/user/window; simulator OFF;
no reminder/whitelist buttons; every send-results preview must list only AF/AAT.
Server verified clean at start (phases/schedule/bidPhase all empty; user reset before bed).

## Log
- 23:0x Signed in, dashboard on BUILD 258, state "Not started".
- P1: Begin ✓ (6 HD weeks, 46 locked) · bids AF/1 + AAT/2 on Wk7 via Edit Selections ✓ ·
  progress card "0 of 2, phase wording" ✓ · Close P1 bidding (backup→dialog, bare "Phase 1" labels correct) ✓ ·
  Approve AF / Deny AAT (deliberate override) ✓ · Complete P1: stale-decision advisory listed AAT WIN→DENIED, non-blocking ✓ ·
  Send P1 Results preview = exactly {AAT 1 denied, AF 1 approved} → sent 2 e-mails ✓ · console errors: 0
- P2: Smart Lock & Unlock gate on Begin ✓ (unlocked all 52) · bids AF/2 Wk20 + AAT/2 Wk30
  (AAT reusing returned denied number — allowed, correct) ✓ · bulk "Approve All Current Winners" (2) ✓ ·
  Complete P2 (no advisory — decisions match projections) ✓ · Send preview = {AAT 1 approved, AF 1 approved} → sent ✓
- P3: NP bid allowed in phase 3 ✓ (AAT NP Wk44, AF/3 Wk44, both proj WIN incl. NP) ·
  bulk approve 2 ✓ · Complete P3 ✓ · Send preview = {AAT, AF} only → sent ✓ · console errors: 0
- P4 begun (rounds live). R1: close button/dialog all read "Phase 4: Round 1", bullet "complete the round" [258 Fix3 ✓] ·
  progress card "2 remaining before ROUND can complete" [Fix2 ✓] · AF/4 + AAT/3 Wk21 · approve AAT, deny AF ·
  Complete Round 1 (1 approval, 1 denial → archive) → workflow went STRAIGHT to Send Round 1 Results
  (NOT back to approvals — last night's glitch does not reproduce on 258) · card: "No bids placed in this round yet" [Fix2 ✓] ·
  Send preview = {AAT 1 approved, AF 1 denied} → sent ✓ · workflow → Start Round 2 + demoted Complete Phase 4 ✓
- R2 (THE critical round): opened clean — card "No bids placed in this round yet" (NOT the false
  "0 of 2 decided") · server verified: AF denied bid RETIRED from schedule, number 4 returned;
  AAT Wk21 win in published archive · decide panel current view = round-2 working set only;
  filter has "Phase 4: Round 1 (locked)" · AF reused returned #4 ✓ · close button/dialog "Round 2" ✓ ·
  bulk approve 2 · Complete R2 (2 approvals, 0 denials) → Send preview {AAT, AF} → sent ✓ ·
  NO listener-race regression at any point (multiple staging+phases writes crossed) · console errors: 0
- R3 opened (Start Round 3 + Smart Lock reopen chain ✓) · bids AF/5 Wk40, AAT/4 Wk50 ·
  auction window set to 1h — countdown 00:58 — TIMER-EXPIRY close test in progress ·
  privacy probe: phaseStaging + approvals + denials all 403 PERMISSION_DENIED anonymously
  (unsent results invisible server-side ✓)
- R3: TIMER-EXPIRY close verified — countdown hit 0, auto-close fired (bidding closed, 52 locked,
  round-scoped pending message) · Complete Round 3 accepted the timer-expiry closure (256 fix holds) ·
  bulk approve 2 · Send preview {AAT, AF} → sent ✓ · Start Round 4 offered ·
  AUDIT RETURNED: 14 confirmed findings (1 critical, 5 high, 8 medium) — critical = value-blind
  _p4ArchivedDecisionRound makes a re-bid on a round-denied week invisible/undecidable. Testing live in R4.
- R4 LIVE CONFIRMATION OF AUDIT CRITICAL: AF re-bid (value 6) on Wk21 — the week AF was DENIED in R1 —
  saves fine and shows in Edit Selections (Round 4 view, proj WIN), but dashboard card says
  "No bids placed in this round yet" and pending counter ignores it. The value-blind
  _p4ArchivedDecisionRound treats the FRESH bid as the archived R1 denial. Confirmed exactly as audited.
  Cleanup: removing the re-bid via Edit Selections, then running R4 as the empty round.
- R4 empty-round path: "Complete Phase 4: Round 4 (empty)" → zero-decision "Mark as sent — continue"
  (no e-mails) ✓ · Complete Phase 4: rolling-round warning shown, confirmed → rounds-mode finish
  ("all rounds announced — nothing new e-mailed") → 🎉 auction finished ✓
- FINAL SERVER RECORD: p4Rounds {1,2,3,4} all sent; completedPhases[4] = union of round archives
  (approvals: 05-23, 08-29, 10-03, 12-12); resultsSent[4] stamped · console errors across entire run: 0
- E-MAIL TALLY: P1 (2), P2 (2), P3 (2), R1 (2), R2 (2), R3 (2) = 12 e-mails, every preview verified AF/AAT only.
