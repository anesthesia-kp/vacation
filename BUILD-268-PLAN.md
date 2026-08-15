
---

## 18 · LATE ADDITIONS (owner rulings, 15 Aug — after the initial 268 build)

**Item 12 · Phase-derived title.** Staff header reads "Fall Vacation Auction" (pre-start +
Phases 1–3) and "Rolling Vacation Auction" (Phase 4), driven by the live phases snapshot.

**Item 13 · BETWEEN-PHASES UNLOCK — supersedes the §8/§12 strict freeze.** Owner rulings:
"everything editable between phases, every single feature," motivated by live-rehearsal
needs; full audit re-run demanded and performed. Final semantics:
- The 7 frozen dials (calendar, floors, caps ×2, NP-by-phase, overage, lowerings) unlock in
  the GAP after a phase's (or Phase-4 round's) results are SENT and before the next
  phase/round begins. Decisions-done-and-published is the line — the window between
  Complete Phase and Send Results STAYS locked (the manipulation hole).
- **One carve-out: the auction YEAR is Reset-only forever** (bids are keyed to the year's
  weeks). Enforced three ways: year selector disabled mid-auction, save refusal, and the
  server rule compares years (default 2027 when no config was ever saved).
- Server mirror: rules `inPhaseGap()` + `gapCalendarOk()` added to `configWriteAllowed`;
  reads the same three phases fields the client uses (completedPhases / resultsSent /
  p4RoundResultsSent); pin-tested against the client's `_phaseGapNow()`.
- **Warnings (owner-requested adequacy):** every gap dialog carries "⚠️ You are changing
  this BETWEEN PHASES of a LIVE auction"; floors + calendar gap-saves compute and show the
  exact list of existing bids the change would strand below-floor (extra danger-confirm on
  the calendar path; "users are NOT notified" stated); the NP-by-phase switch, previously
  dialog-less, now confirms when flipped mid-auction (plain toggle pre-auction, unchanged).
- Playground checklist grew to 17 cases (gap allow / private-window deny / year deny).
Verification after these additions: tests-build268 181/181 · honesty 12-fail · browser E2E
36/36 · 4-pass sweep clean · phase-runthrough 0 errors · cal-editor 14/14 · bf-card 10/10 ·
mobile clean (pre-existing advisory only) · mega-fuzz 100k ZERO on final bytes ·
never-events 20/20 @40k · handlers 182/0 · run-all real assertions all green.

## §19 · KP e-mail prompt race fix (KPFIX — owner report, 15 Aug, folded in pre-push)
Owner: "Occasionally, I get alerts to enter my KP email on login. It just happened even
though I already said don't ask again. I refreshed and it disappeared." Diagnosis: the
stored answer was always correct; the prompt decision ran against the saved-answers map
before it had genuinely loaded (the post-sign-in read's failure is deliberately swallowed
for offline resilience) — so a transient read hiccup read as "never answered". Staff 139
only. Three layers: decision inside the 300ms timeout on the freshest data; gated on
`_emLoadedOk` (set only by a successful getDoc or the authenticated snapshot; fail-quiet
≡ Remind-me-later); `_kpModalSync` auto-closes an open prompt when a late snapshot shows
the user answered. Owner chose "Fold in + full re-audit" — entire battery re-run green on
final bytes (see ADVERSARIAL-AUDIT-268.md, KPFIX addendum + re-audit verification block).
New tests: 16 suite assertions (tests-build268 → 197) + browser E2E section F (→ 41),
including a live reproduction of the bug against the pristine 138 fixture.
