# Disputed audit items — tiebreaker evidence pack for your rulings

**30 July 2026.** All 13 remaining disputed items (9 medium, 4 low) adjudicated against build 226
by tiebreaker auditors, on top of the original confirm/refute pair each already had. Full agent
reports preserved in session. Items grouped by recommended ruling — you approve or override per
group. Nothing here has been changed in code.

## Group 1 — recommend CLOSE, no action (3 items)

**M6 · Denying losers promotes the next bidder.** The mechanism is real but it is now *ratified
design*: the Deny-All dialog explains it, and the build-218 contradiction check flags exactly the
risky case ("projects LOSE but APPROVED") at Complete Phase. Severity today: none.

**M8 · "Removing both founders = unrecoverable lockout."** Invalid on the load-bearing word. A
remaining admin can re-add the founders, and emptying the admin list from the Firebase console
automatically re-activates the two built-in founder accounts (that fallback is in the rules by
design). Inconvenient, never unrecoverable. Optional hardening logged: refuse founder removal
except self-removal.

**M3 · mailQueue/welcomeLog wholesale-writable.** The headline harm (one bidder erasing every
pending outbid alert) was closed by the July-26 rules fix (writes confined to one entry). The
one-entry-tamper residual is already on your accepted list. welcomeLog wipe = duplicate welcome
e-mails at worst; optional one-clause rules fix logged (would need console publish).

## Group 2 — recommend FIX as one small batch, "Batch D" (7 items, all small)

**M4 · Silent failure on admin bid edits — the only MEDIUM.** The "Action failed" safety net
exists but is disconnected by a one-word slip: the confirm dialogs call the write without
returning its promise, so a failed save shows no error and the table keeps the unsaved value.
Fix: return the promise (two call sites). *This is the one item worth doing soon.*

**M2 · Results-e-mail ledger save can fail silently**; in a narrow double-failure the error
message itself instructs a retry that would re-send all 37 results e-mails. Fix: retry/surface
that one write before any toast that says "try again."

**M5 · addUser toasts success even if the FTE save failed.** Three downstream gates already trap
the state loudly; fix is dropping one swallowed catch and branching the toast.

**M9 · Staff site: bid bookkeeping can silently fail after a successful bid** (floor, change-log
entry, timestamp; modal sticks open). The bid itself is never lost. Fix: reorder one mutation +
try/catch. (Staff file — would ride along with Batch A's staff build.)

**L1 · Text-format FTEs in a hand-edited backup slip past every check** and NaN the tie-fit
math. Fix: one-line number coercion in getUserFTE.

**L2 · Begin Phase failure toast says "nothing was changed" after week-locks WERE changed.**
Re-clicking converges; fix is honest wording.

**L3 · Restore One User is four separate saves, not one atomic one.** Failures are now named and
re-running completes it; fix is using the same writeBatch as full restore.

## Group 3 — recommend DEFER, decide separately (3 items)

**M1 · A whole tied group enters the lottery even when only one member fits.** Still real, but
the approve dialog now warns about the actual cap breach before you can act on it, so what's
left is a misleading DRAW badge. The fix touches the allocation engine in all THREE copies
(admin + staff twins) — parity-sensitive, the riskiest kind of change in this codebase. My
recommendation: defer until after launch-critical work, then do it as its own carefully-fuzzed
batch, or accept the badge quirk permanently.

**M7 · A backup can photograph a bid without its phase label** (the 28 documents are read at
slightly different instants; a restore of such a file misfiles that one bid). Needs a bid to land
in a sub-second window during a backup, plus a later restore of that exact file. Fix (post-fetch
consistency re-check) is backup code → full adversarial pass required. Defer or fold into
Batch C (single-user cloud restore), which is already backup work.

**L4 · Simulator writes fake bids person-by-person while claiming to be atomic**; a crash midway
leaves half-recorded fake bids — now only reachable inside deliberately-armed Rehearsal Mode.
Fix is a comment correction + honest error message; could ride along with any batch.

## Bookkeeping if you approve as recommended

Disputed queue: 13 → 0. Closed: M6, M8, M3. Batch D (7 small fixes): M4, M2, M5, M9, L1, L2,
L3. Deferred with owners: M1 (engine, own batch post-launch), M7 (backup, fold into Batch C),
L4 (ride-along). Batch order overall: push current stack → live-fire test → A → B → B2 → C → D.
