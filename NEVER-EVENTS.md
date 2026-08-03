# NEVER-EVENTS — KP East Bay Anesthesia Vacation Auction

**Status: DRAFT for user review — edit freely; delete or add items before the test suite is built around it.**
**Drafted:** 3 Aug 2026, from the live code (staff 127 / admin 239) and handoff.
**Purpose:** the definitive list of things that must NEVER happen in a live auction. Each item names
the guard in the shipped code that prevents it, how it is proven today, and the planned pre-launch
verification (fuzz invariant IDs `F-n` refer to the never-events test suite being built).

A never-event here means: if it happens even once in a live auction, it is a launch-stopping defect.
Deliberate admin actions (explicit overrides, chosen overbooks) are NOT never-events — the admin's
authority is part of the design. The never-events are about what the SYSTEM does on its own.

---

## A. Fairness (the engine)

**NE-1 · Priority inversion.** A weaker-priority bid must never win, draw, or review a week where a
strictly-stronger bid was denied because it could not fit — unless the admin explicitly approved the
weaker bidder (that approval IS the sanctioned override).
*Guard:* admin 239 `_blockFloor` demotion in `computeApprovals`, measured against the natural
(pre-overbook) FTE baseline; prior-phase winners and explicit approvals exempt.
*Proven today:* `test-priority-inversion.mjs` (Week-7 repro, 5000-scenario fuzzer) + 3 Aug live
verification (2,500-scenario in-browser fuzz, full 4-phase rehearsal, 0 events).
*Planned:* F-1 in the mega-fuzz (every decided week of every random auction).

**NE-2 · Automatic over-cap.** The engine must never on its own place a week over the strict cap;
auto-elevated draws/reviews must never exceed cap + the review overage (currently 1.0 FTE, user's
setting). Only an explicit admin approval may exceed these — and the approve dialog must warn.
*Guard:* FP-safe fit test in both engines; `capBreaches(sim)` advisory counts the pending approval.
*Proven today:* engine suites + rehearsal. *Planned:* F-2.

**NE-3 · A prior-phase winner loses their week.** Wins from completed phases are permanent.
*Guard:* `priorWinners` locked into every later computation; the NE-1 demotion explicitly skips
them; the dead-bid replace path refuses prior winners (build 229).
*Proven today:* engine suites. *Planned:* F-3 across multi-phase fuzz runs.

**NE-4 · A forged or invalid bid wins, or blocks anyone.** A devtools-forged bid (value 0/-1/string,
reused priority number across weeks, forged future phase tag) must never win, never enter a draw,
and never trigger the NE-1 lockout floor.
*Guard:* H7 shape filter + I2 cross-week-reuse disqualification in BOTH twins; the NE-1 floor
re-applies both before honoring a denial.
*Proven today:* audit-fix suites. *Planned:* F-4 (fuzz injects malformed bids).

**NE-5 · An exact tie split by the machine.** Members of a tied group must never be partially
auto-elevated; resolving one draw member must never auto-approve or auto-deny another.
*Guard:* group-atomic engine loop; the deliberate no-auto-collapse of a lone remaining draw.
*Proven today:* engine suites (M1 accepted-design boundary respected). *Planned:* F-5.

## B. Identity & privacy

**NE-6 · Bidding as someone else.** No Google account may ever place, edit, or remove another
user's bid.
*Guard:* Firestore rules confine writes via `emailToUser`; duplicate login e-mails refused at entry
in both admin sites and FAIL CLOSED in the map (collision → excluded, loud warning); restore
REBUILDS the map from restored loginEmails.
*Proven today:* rules tests + duplicate-email suites + live test bid. *Planned:* button-sweep
re-verification of the entry refusal on both admin surfaces.

**NE-7 · Mid-phase decision leakage to staff.** The staff site must never reflect a live admin
approval or denial during an open phase — users see pure projections until results are sent.
*Guard:* structural — the staff `computeApprovals` cannot read `deniedData`/`approvalsData`
(declared but never consulted; security rules block the reads anyway); signature guards throw on
an accidental cross-port.
*Proven today:* pinned by test + 3 Aug live check. *Planned:* F-6 static assertion stays in suite.

## C. Data integrity

**NE-8 · A decision that shows on screen but never reached the server.** Every auction-critical
write must either verifiably land or report failure honestly ("NOT removed", "did NOT verifiably
arm") — never a silent local-only success.
*Guard:* atomic writeBatches (bid+tag, 5-op delete, one-user restore), read-back-verified timer
arm (227), honest failure toasts (233/234/235), commit-timeout reported as inconclusive.
*Proven today:* audit/backup suites + live-fire tests. *Planned:* button sweep exercises failure
dialogs; no new engine work.

**NE-9 · Backup/restore loses or alters a bid.** A restore must return exactly the backed-up
auction — bids, tags, locks, timestamps — and must always land with Rehearsal Mode OFF.
*Guard:* concurrent timed fetches with retry; M7 torn-read stability re-check; restore forces
rehearsal off; deleted-user restore refused.
*Proven today:* `test-backup-restore.mjs` (174 assertions) + 3 Aug live round-trip (114/114).
*Planned:* fresh launch-eve backup + restore drill on your go.

## D. The live run

**NE-10 · A live auction starts armed for rehearsal.** Skip-backup / skip-send / simulator paths
must be unreachable in a live run; Begin Phase 1 must force the real-vs-rehearsal choice.
*Guard:* Rehearsal Mode gates all skip surfaces with click-time re-checks in module scope
(222/237/238); restores force it off; launch checklist confirms OFF manually.
*Proven today:* five skip paths executed through real onclicks in tests. *Planned:* button sweep
confirms skip controls are ABSENT with rehearsal off.

**NE-11 · A destructive action with no dialog.** No auction-critical write or send may fire from a
single click; dialogs are paint, click-time GUARDS are the enforcement (standing decision).
*Proven today:* one-click sweep suites (D1–D13). *Planned:* the every-button sweep — each of the
~122+ handlers clicked, its dialog verified, its cancel verified, console watched for errors.

**NE-12 · Phase timing lies.** A phase must never close early against the server clock, and a timer
the admin believes armed must actually be armed on the server.
*Guard:* server-clock timer in rules; verified arm with read-back echo (the 30 Jul lost-write
class); feed-health gates on phase-freezing actions.
*Proven today:* timer suites + live verification. *Planned:* included in rehearsal confirmation pass.

**NE-13 · Results e-mail fires without explicit admin action.** Sends happen only through the
confirmed send flow; delivery-ledger failures must warn about the re-send trap.
*Guard:* send dialog + ledger retry + all-outcome warnings (Batch D). Mail stays live in rehearsal
by design — the send button is still a deliberate act.
*Proven today:* suites + 3 Aug live send. *Planned:* sweep verifies no other path reaches the mailer.

---

## What the mega-fuzz will assert on every decided week of every random auction
F-1 no priority inversion (mirrors the shipped guard from first principles, not by re-running it) ·
F-2 no automatic over-cap / over-overage · F-3 prior winners intact across phases · F-4 malformed
bids never win/block · F-5 tie groups never split automatically · F-6 staff/admin twins agree
everywhere denial-knowledge doesn't legitimately separate them · plus: no NaN in any FTE total,
determinism (same input → same output), and every winner actually placed a competing current-phase bid.

*Accepted-design boundaries honored (not bugs, per user rulings): review overage 1.0; tied groups
may all show DRAW when only some fit (admin authority); reset keeps rehearsal armed; staff site has
no auto-reconnect wrapper.*
