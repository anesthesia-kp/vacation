# Verification report — 8 sweep findings + 3 critic leads

**Date:** 30 July 2026 · against vacation build 226 / staff 125 / schedule 48
**Method:** two independent skeptic agents per group — one ordered to CONFIRM, one ordered to
REFUTE — reconciled by me, with one factual disagreement resolved by reading the code directly.
**No code was changed.** Fixes wait until you've pushed the current stack (my rule, stated when
you left: no new fix batches on top of five unpushed builds).

Every verdict below cites current line numbers in the agents' full reports (kept in session).

---

## The 8 sweep findings (D6–D13)

| # | Finding | Verdict | Why |
|---|---|---|---|
| **D9** | Login e-mail saves with no confirm | **FIX** (medium) | A typo instantly propagates into the security map and locks that physician out of sign-in AND bidding — in a deadline auction, "reversible later" can still cost them a phase window, and they can't self-diagnose a failed Google login. The 225 duplicate guard covers only duplicates, not typos. Sibling clear-button already confirms with exactly the right warning. |
| **D10** | Outbid-alerts toggle, bare, no confirm | **FIX** (medium) | The one finding BOTH skeptics upheld. While off, alerts are never even queued (both sites verified), so re-enabling recovers nothing — a one-click flip with a permanently lost window. Confirm the OFF direction. |
| **D6** | Priority-lock master toggle, bare | **FIX** (low-medium) | The refuter proved it's policy-not-data (locks preserved, still recorded while off, re-enable restores everything) — but bids placed below a committed floor during the off-window are legal writes that can't be unwound. Same bare-toggle class as the already-fixed global lock; the one-line confirm matches your no-one-click rule. |
| D8 | KP-address save can fire a welcome e-mail | **Your call** | Refuter showed it's quadruple-gated and requires typing an address + clicking Save; worst case is one generic welcome e-mail to a typo'd address. Confirming old→new would be cheap and match the sibling, but it's consistency, not safety. |
| D13 | Per-week capacity save, no confirm | **Your call** | Nothing downstream fires automatically (grep-complete: no alerts, no snapshots); re-saving the old value restores everything. But the bulk save now confirms with a diff while the per-week button doesn't, and the panel's deliberate don't-refresh-while-typing behavior makes stale saves possible. A D4-style diff-confirm would be cheap. |
| D7 | "Send Pending" mail flush, no preview | **Refuted / won't fix** | Everything in the queue auto-sends within ~30–45 s with no click at all; the button only accelerates. Optional one-word tweak (pass 30000 instead of 5000) to close a duplicate-send race. |
| D11 | NP toggle mid-phase | **Refuted / won't fix** | The engine never reads the flag (grep-complete): placed NP bids are untouched, keep competing, nothing recomputes. It's purely a placement gate — flipping back restores the exact rule. |
| D12 | FTE save inside armed edit mode | **Refuted / won't fix** | The arming toggle already confirms — danger-styled when live, with wording that says to switch it back off. A typed number + labeled Save inside an explicitly armed mode isn't one-click accidental; nothing escapes (no alerts, no log, no e-mail). Logged enhancement: auto-relock the mode after N minutes. |

**Recommended batch when you're back and pushed: D9 + D10 + D6** — three confirm dialogs, all
following the exact D5 pattern that already shipped, one build, one re-audit.

## The 3 critic leads

**Lead 3 — staff site loses a re-bid when the phase-tag write fails: CONFIRMED, the most
serious open item.** Both skeptics agree the mechanism exists verbatim (staff 1694: the tag
write is fire-and-forget with a swallowed error; 2016-2019: an untagged re-bid on a week from a
completed phase inherits the OLD phase; 982: the engine then drops it). The refuter narrowed it
honestly: fresh-week bids are immune; the harm is re-bids on previously-lost weeks, and it's
mostly self-revealing — EXCEPT at the deadline, which is exactly when re-bids cluster and when
the rules' server-clock gate can accept write 1 and reject write 2 one round-trip later. User's
screen says success; the bid is dead; nothing logs it. **Fix shape:** await both writes together
(or one batch) and surface failure honestly. Staff file change → staff build 126.

**Lead 2 — admin dead-end on weeks with a dead prior-phase bid: CONFIRMED (medium-high).**
Both skeptics agree, with full traces. A physician who lost week X in phase N leaves a dead
schedule entry; in phase N+1 the admin's Add Bid refuses ("already has this week"), Edit
Selections locks the row and hides its Remove button, and the one function that would fix
everything (it retags the phase correctly) is unreachable from any UI. During close/approve —
when only the admin can write — there is NO path. Compounds Lead 3: its failure state is
admin-unrepairable. **Fix shape:** make the Add Bid duplicate check phase-aware and route it
through the existing retag write-set.

**Lead 1 — report headers count orphaned approvals: CONFIRMED-WITH-CORRECTIONS (medium).**
The skeptics disagreed on the facts; I read the code myself. The refuter is right that the
dashboard, Draws & Reviews, approve dialogs, and the staff site all use the engine's numbers —
but `finalFteForWeek` (5142), which feeds the **View Report heading, print export, and CSV**,
unions raw live `approvalsData` with no orphan guard (5159-5160). A mid-phase orphan (admin
approves early, user removes the bid — reachable, and the code's own comments say so) makes the
printed/exported report disagree with every working screen, including possible double-counting.
Completion cleans it and two other warnings flag it, so it's mid-phase-display only.
**Fix shape:** filter the live list by scorable-bid existence, mirroring the engine's guard.

## Suggested order once you've pushed

1. **Batch A (staff + admin):** Lead 3 (staff 126) + Lead 2 (admin 227) — they compound each
   other, and Lead 3 is bidder-facing silent loss.
2. **Batch B (admin):** D9 + D10 + D6 confirms + Lead 1 header filter.
3. Each batch: executing tests with honesty checks, then its own skeptic pass, per §0.

## Still in the queue after that

- The 18 disputed audit items — need your per-item rulings; evidence packs can be prepared.
- 28 medium / 14 low confirmed audit items, in small batches.
- Your live-fire backup test (runbook ready).
- E-mail domain + KP IT allowlist (calendar-bound, start anytime).
- Logged, non-blocking: schedule-side race warning asymmetry, staff "insufficient permissions"
  message for locked-out duplicates, D12 auto-relock idea, D7 30s tweak, 3 cosmetic LOWs.
