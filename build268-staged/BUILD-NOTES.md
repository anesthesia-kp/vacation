# Build 268 (admin) / 139 (staff) + firestore.rules — notes
**Built 15 Aug 2026 in a cloud session on the owner's go ("build 268, I'll push when Phase 2
closes"). NOT yet pushed. Plan of record: `BUILD-268-PLAN.md` (repo root) — every owner ruling
cited there. Staged copies in this folder are INERT until filed into the working tree.**

## The fourteen items (+ the audit's two fixes)
1 · **Config freeze, server-side** — `firestore.rules`: 7 adminSettings keys (`auctionConfig`,
`bidFloors`, `npAllowedPhases`, `maxBidsPerPhase`, `maxBidsCumulative`, `reviewThreshold`,
`bidLowerings` fwd-declared) frozen while `auctionUnderway()` (≡ client `phase1Started()`),
including whole-document delete. Cheap-test-first: zero extra doc reads on ordinary writes.
Unlocks at Reset (phases doc overwrite drops `phase1Started`).
2 · **passcodes → admin-write-only** (was: any registered user via catch-all). READ stays public
(login bootstrap) — deliberately NOT in isSensitiveDoc; comment in rules warns future sessions.
3 · **Restore pre-flight** — `_doFullRestore` refuses a cross-config restore mid-auction BEFORE
the mail-queue clear (content-compare via `_cfgCanon` stable stringify; identical-but-reordered
configs pass). 268-born docs exempt from the absent==unusable rule (`RESTORE_ABSENT_OK_268`) so
pre-268 backups stay restorable.
4 · **Plain-language denials** — `_cfgDeniedMsg` translates permission-denied on ALL sanctioned
frozen-key editors (calendar, floors, lowerings, caps, NP toggles, overage).
5 · **Freeze pin** — client `FROZEN_CONFIG_KEYS` ↔ rules `frozenConfigKeys()` compared by the
suite; drift = red test.
6/7 · **Stale-build gate** — head checks now cache-busted (`?v=N` replace — closes the
stuck-reload hole) + refocus re-check (≥60s throttle) on BOTH twins; push-driven Part A:
`adminSettings.requiredBuilds` one-way ratchet armed by the admin page from versions.json,
obeyed by every open tab via the existing snapshot; non-dismissible 5s overlay → cache-busted
reload; once per required value per tab (loop-proof); restored-backup rollback inert.
`requiredBuilds` deliberately NOT frozen.
8 · **All fairness dials aligned** — caps, NP-by-phase, FTE overage now ALSO client-refuse at
click time once Phase 1 begins (server already refuses via item 1).
9 · **HD checkboxes return** — six fixed-identity weeks each carry a High-demand checkbox
(default checked ≡ 267). Unchecked = regular week, keeps its label, still must be placed;
notes ride on all six placed weeks; zero-checked allowed behind a dedicated loud confirm +
an EMPTY-Phase-1 warning at Begin Phase 1; every count/list derived (no hardcoded 6/46).
10 · **Bid Lowerings** — PEOPLE panel between Users and Whitelist. Global W/X/Y/Z (0–9 or
unlimited; P4 = per round), default 0 ≡ no-op. Staff: below-floor options open only while
allowance remains; confirm panel states from→to + remaining BEFORE commit; L-3 re-check at
commit; floor moves DOWN on a spent lowering (owner ruling); spend = atomic `increment(1)`
after the bid lands; change log records `lowered`. Refusal message never mentions the admin
override (owner ruling). Admin: usage table (archived per phase/round via `bidLoweringsArchive`
+ current window); Fair Play `overLower` flag; counter clears exactly where priority locks
clear (phase begin, round begin, reset, delete-all); both docs in backup+restore maps.
Rules: `bidLowerings` joins isBidDoc (own-key + timer + biddingClosed); archive admin-only.
11 · **Smart copy** — Option A priority-lock sentence (owner wording) generated from settings
with auto-collapse (equal→"per phase", 0→classic sentence, unlimited→no counting, mixed→
enumerated with "not at all"/"freely"); grouped caps collapse (truth-preserving for cumulative
caps, all-unlimited→sentence vanishes); equal floors merge to one sentence; NP sentence was
already collapsed (136). All generators twin-shared/byte-identical where meant; welcome
e-mails + rules list + admin card preview all derive from the same functions.
Audit fixes: atomic increment + echo-safe mirror (see ADVERSARIAL-AUDIT-268.md).
12 · **Phase-derived title** — staff header: "Fall Vacation Auction" (pre-start + P1–3),
"Rolling Vacation Auction" (P4); live via the phases snapshot.
13 · **BETWEEN-PHASES UNLOCK** (owner ruling, supersedes the strict freeze): all 7 dials
editable in the gap after results are SENT and before the next phase/round begins; the
private-decisions window stays locked; the auction YEAR is Reset-only forever (client
triple-block + server year comparison, default 2027 when no config saved). Gap dialogs
warn "BETWEEN PHASES of a LIVE auction"; floors/calendar gap-saves list the exact bids a
change would strand below-floor (extra danger-confirm on the calendar); the NP-by-phase
switch confirms when flipped mid-auction. Rules: inPhaseGap() + gapCalendarOk() in
configWriteAllowed; Playground checklist now 17 cases.

14 · **KP-prompt race fix** (owner report 15 Aug, folded in pre-push; staff 139 only): the
"add your KP e-mail" prompt intermittently re-appeared for users who had answered
"don't ask again". Root cause: the prompt decision ran against the saved-answers map
BEFORE it had genuinely loaded — the post-sign-in `getDoc(emailsRef)` failure is
deliberately swallowed, leaving an empty map that reads as "never answered". Three
layers: (a) the show/skip decision moved INSIDE the 300ms timeout and re-reads the
freshest data (an answer or an admin off-switch landing in the gap is honored);
(b) `_emLoadedOk` — a genuinely-loaded flag set only by the getDoc success and the
authenticated snapshot — gates the prompt, fail-quiet ≡ "Remind me later" (never
wrongly prompts someone who answered; a never-asked user is simply asked next login);
(c) `_kpModalSync` auto-closes an already-open prompt when a late-arriving snapshot
shows the user answered (and never closes it for a genuinely unanswered user).
typeof-guarded per the sandbox convention. Executed proof: 16 new suite assertions +
browser E2E section F (5 assertions), including a live reproduction of the bug against
the pristine 138 fixture.

## Sandbox convention honored
New references inside functions that older test sandboxes extract are typeof-guarded /
spread-guarded (`_doFullRestore` map + pre-flight, lifecycle batch writes, staff bid-flow
touch points, `_emLoadedOk` in completeSignIn). Legacy scope ⇒ exactly the pre-268
behavior; production always has the symbols; pins fail if a guard is removed.

## Deploy (owner)
1. File staged → working tree (done by the session when the device re-authenticates), owner
   commits + pushes in GitHub Desktop (`.claude-commit-msg.txt` ready).
2. Live-verify versions.json (cache-busted) = {"index":139,"mobile":17,"admin":268}.
3. **Rules publish** (console) per `RULES-PUBLISH-CHECKLIST-268.md` — Playground cases FIRST,
   note the History-tab rollback, publish in a quiet window, then the 60-second user-path
   smoke test and the live denial proof.
4. The stale-build gate arms itself on the first admin page-load after the push.
