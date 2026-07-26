# Handoff — KP East Bay Anesthesia Vacation Auction

**Written:** 25 July 2026, end of session · **By:** the outgoing Claude session

---

## How to read this file

The handoff that *started* this session was well written and stated "Current Bug / Blocker: **None.**"
Three audits later that session's work had 59 confirmed defects, one critical. The document was not
careless — it faithfully recorded what that session *believed*. Prose carries beliefs, and beliefs decay.

So every claim below is tagged:

- **[VERIFIED]** — proven by a test you can run, or observed directly in the live database.
- **[BELIEVED]** — my reasoning, not independently confirmed. Treat as a lead, not a fact.

**Do not trust the [BELIEVED] items enough to act on them without checking.** That is the single
lesson of this session.

**Start here, before reading further:**

```bash
node tests/run-all.mjs        # ~30 seconds, 369 assertions
```

That tells you the true state of the code faster and more reliably than any paragraph in this file.

---

## 0. Operating instructions — read before doing anything

These are **the user's standing rules**, carried forward verbatim from the previous session, followed
by practices this session learned the hard way. Both halves are binding.

### The user's rules (verbatim, unchanged)

1. **Never rewrite entire files.** Output only the exact lines or functions that change, and always
   locate them by reading the current file first — never from memory.
2. **Before every code change:** read the target code, make the edit, syntax-check every inline
   `<script>` with `node --check`, and run the test suites when logic is touched.
3. **After each change:** bump `var BUILD` in the HTML **and** the matching key in `versions.json`,
   deliver the file, commit it to the repo, and tell the user to push.
4. **If you are unsure of an exact string, file path, or requirement, STOP and ask.** Do not guess.
5. **Keep explanations under three sentences. Focus on the code.**
6. **Do NOT "fix" anything on the deferred / non-issues list without asking first.**

### The user's stated preferences

- They are **not a coder**. Keep explanations simple and plain — but the code itself must be high
  quality, with no shortcuts hidden behind simple language.
- **Do not agree with every idea.** If a request is a bad idea, or the answer is not what they want to
  hear, say so directly and explain why. They asked for this explicitly and it has already prevented
  at least one inverted-logic bug this session.
- **Every deployment gets its own concise commit summary**, written ready to paste into GitHub Desktop.
- **Never write an unprompted summary of the conversation.** Instead, **warn them when context is
  growing large enough that compaction is near**, so they know quality may be about to degrade. A
  watcher script for this is included at `tests/../ctx-watch` guidance below; if unavailable, report
  the context figure whenever it is asked for and flag it proactively past ~750k tokens.

### Practices this session learned the hard way

- **Verify every assumption against the code before acting on it.** Two "bugs" the fuzzer reported were
  the auditor's own wrong assumptions, not defects.
- **Never let a test stub the thing it is testing.** The one critical bug shipped this session passed
  four assertions because its test stubbed `computeApprovals` to match a belief about it.
- **Expect fixes to introduce defects — today's rate was about 1:1.** Re-audit after each batch rather
  than trusting a clean run of tests written by the same author who wrote the fix.
- **Tag claims as verified or believed** when reporting state, and never let a belief be phrased as a
  fact. That failure is what made the previous handoff dangerous.
- **Prefer targeted `grep` and line-ranged reads over whole-file reads**, and push bulk reading to
  subagents whose context stays out of the main conversation. Whole-file reads of the 520KB admin file
  were the largest single driver of context growth this session.

---

## 1. Current State & Progress

### Verified complete

**Test infrastructure — 369 assertions across 5 suites.** [VERIFIED — run the command above]
The suites extract functions **verbatim** from the shipping HTML and execute them, so they cannot
drift from the code. `tests/test-engine-fuzz.mjs` generates 4,000 random auctions and checks the
allocation invariants on 12,000 week-allocations; it also proves the staff and admin engines agree
on winners across 400 auctions, and that allocation is deterministic and order-independent.

**Backups genuinely restore an auction.** [VERIFIED — `tests/test-backup-restore.mjs`]
A mid-auction fixture was exported, re-parsed and restored through the real code paths, then the real
`computeApprovals` was re-run over the restored data: **every week's winners, draws, reviews, losers
and FTE totals came back identical.** The backup covers all 28 documents (none missing, none stale),
restore is one atomic 25-op batch, timer elapsed-time is preserved, an expired timer restores expired,
and `FETCH-FAILED` documents are skipped rather than wiping live data. **This is the safety net: any
remaining bug costs a restore, not an auction.**

**Firestore rules changes are live.** [VERIFIED — anonymous REST probes against the live project]
`changesDecisions`, `approvals`, `denials`, `mailQueue`, `emails`, `loginEmails`, `adminAccess`,
`emailToUser`, `signInMisses` and `dailysched/adminAccess` all return **403** to an anonymous reader.
`userList`, `phases`, `changes`, `slots`, `timer`, `schedule`, `usernames` still return **200**, so the
anonymous login bootstrap works. Confirmed by calibration: a denied-and-missing doc returns 403 while
an allowed-and-missing doc returns 404.

**Dry run reached step 4 of 6.** [VERIFIED — live database reads]
Reset → Begin Phase 1 verified (exactly the 6 high-demand weeks unlocked, 46 locked, timer armed,
FTE editing auto-locked); non-admin bidding verified from a real Google account with per-user
confinement holding; **outbid e-mail confirmed delivered** under the new registered-user-only
mailQueue gate; both server-side close gates confirmed (`biddingClosed: true` + timer expired + 52
weeks locked). Not yet done: approve/deny, Complete Phase, Send Results, final Reset.

**All 37 users have a saved FTE.** [VERIFIED — live `vacations/fteMap` read]
Distribution: 23 at 1.0, 7 at 0.8, 2 at 0.9, 2 at 0.6, one each at 0.7, 0.5, 0.4. Zero missing, zero
out of range. **Worth a human check:** the 23 at 1.0 include 21 that were bulk-set today on the
assumption they are full-time. If any is actually part-time, the engine will now score them as full
and nothing will flag it.

### Build state

| | Build | Committed to Mac | Pushed | Rules published |
|---|---|---|---|---|
| vacation staff | 116 | yes | **unknown** | — |
| vacation admin | 202 | yes | **unknown** | — |
| schedule staff | 24 | yes | **unknown** | — |
| schedule admin | 46 | yes | **unknown** | — |
| firestore.rules | — | yes | — | **yes, verified** |

**[BELIEVED]** Live was verified at 115/198 earlier in the session. Builds 116/200/201 were committed
to the Mac but their push was never confirmed — the device bridge and browser tools disconnected before
verification. **First action next session: confirm the live builds.** The published rules are current
regardless; that was verified after the last publish.

### NOT complete — the big one

**The full integrity audit found 59 confirmed defects. The critical is fixed; 58 remain.**

See `INTEGRITY-AUDIT-2026-07-25.md` (delivered to the user in chat; ask for it if it isn't in the
repo). 195 agents; 15 specialists each took one subsystem, every finding was challenged by **two
independent skeptics** and only listed as confirmed where both agreed. Also 18 **disputed** (the two
skeptics split — these need a human decision) and 9 unverified **critic** findings.

Severity spread as reported: **1 critical, 17 high, 28 medium, 13 low.**

**The critical is FIXED (build 202) — 17 high remain.** [VERIFIED — `tests/test-delta-fixes.mjs`]

**The critical (now fixed):** `_commitBeginPhase` cleared `approvals`/`denials` only for phases 2-4,
not Phase 1. Any decision written before launch — the simulator's auto-approve/deny, or a manual one —
survived into the real auction. A stale denial is invisible to the bidder: the staff site is forbidden
from reading denials, so their own board showed WIN while the admin engine dropped them, no outbid
alert fired, and `completePhase` froze the wrong winners.

Fixed in build 202: Phase 1 now clears both documents in one atomic batch with the phase stamp, and a
failed commit aborts Begin Phase rather than half-starting it. Locked in by tests.

Also in build 202, at the admin's request: **`Remove ALL Bids & Locks` has been deleted entirely**
(button and function). It was unused and was the likeliest route to the bug above, since it wiped bids
while deliberately preserving approvals/denials. **Reset Auction is now the only bulk-clear**, and it
clears decisions too. [VERIFIED — no remaining references; asserted by test]

---

## 2. Decisions Made & Why

**FTE has no defaults; the missing state is prevented, not valued.** `FTE_MAP` was deleted from both
sites. `getUserFTE` still ends in `1.0`, but that is an **arithmetic guard**, not a sentinel — it feeds
~49 capacity sums, and returning 0 would make an unset user consume nothing and therefore *win every
week*. The state is made unreachable instead: `usersMissingFte()` hard-blocks Begin Phase, `addUser`
refuses a blank FTE, and `FTE_MIN = 0.4` is enforced on entry **and** re-validated on read.
*Do not "simplify" this to a sentinel return.*

**Cap breaches are advisory, never blocking.** They were briefly fed into `approvalReadiness().ready`,
which `completePhase()` treats as a hard gate — and the only remedy offered (Close Bidding) cannot
change anyone's win count, so it deadlocked phase completion. `approvalReadiness()` now returns
`{ready, problems, warnings}`; cap breaches go in `warnings` and never affect `ready`.

**`capBreaches` counts ONLY from the winner set.** `computeApprovals` seeds each week's winners with
`getPriorPhaseWinners(wk)`, so `won[u]` already spans prior + current phases with each week counted
once. Adding `_adminPriorApprovedCount` on top double-counted. *This bug shipped because its test
stubbed `computeApprovals` to match an assumption about it.* It is now tested against the real engine.

**`biddingClosed` lives on the `timer` document, not `locks`.** The rules already fetch the timer doc
and identical lookups are cached, so gating on it costs **zero** extra document reads — and a bid write
already spends ~8 of Firestore's hard limit of 10. On `locks` it would have hit exactly 10.

**Decisions were split out of the world-readable change log.** Approve/deny/revoke entries go to
`vacations/changesDecisions` (admin read + admin write). Both sites already discarded decision entries
when rendering, so nothing user-facing lost information — only the leak.

**Schedule claims are won before they are assigned.** `decideReq` runs the open-shift transaction
first; winning the shift is what authorises the write. On failure it releases the claim and returns the
request to pending.

**Per-week locks are deliberately NOT enforced in Firestore rules.** Week keys live inside nested maps
that rules cannot diff. `biddingClosed` is the server-side gate instead.

---

## 3. Active Constraints

### Must not be altered without explicit instruction

- **`getUserFTE`'s `1.0` fallback** — see above. Removing or changing it to 0 inverts the auction.
- **Per-week lock enforcement in `firestore.rules`** — not possible; do not attempt.
- **The deferred list:** client-clock timer *display* skew (the security path is server-enforced);
  `welcomeLog`/`mailStats` insider griefing; rare multi-device double-welcome; the OAuth consent
  domain showing `vacation-25e8e.firebaseapp.com`; `mailQueue`/`welcomeLog`/`adminAccess` excluded
  from restore. All were reasoned through and deliberately accepted.
- **Both `computeApprovals` twins** intentionally differ in signature — admin takes a boolean
  `ignoreAdmin`, staff takes a schedule snapshot. Port **logic**, never whole functions. Both carry a
  runtime guard that throws on a cross-port.
- **The staff site must never read `approvalsData`/`deniedData` for the current phase.** This is the
  mid-phase privacy invariant.

### Paths and facts

```
/Users/aaronfrankel/Documents/GitHub/vacation-kp.github.io/   index.html, admin/index.html,
                                                              versions.json, firestore.rules
/Users/aaronfrankel/Documents/GitHub/schedule/                index.html, admin/index.html, versions.json
/Users/aaronfrankel/Documents/GitHub/anesthesia-kp.github.io/ landing page (untouched this session)
```

- Firebase project **`vacation-25e8e`**, shared by both apps. Collections `vacations/*` and `dailysched/*`.
- Default admins hardcoded in the rules: `dr.vacation.goddess@gmail.com`, `aaronjfrankel@gmail.com`.
- **Backup is 28 documents** (was 27; `changesDecisions` added today).
- EmailJS `service_wpprivw`, template `template_rss3fn3`, `{{changes}}` param. Welcome e-mails are
  plain text. Quota 2000/month.
- **Deploy flow:** edit → bump `var BUILD` **and** the matching key in `versions.json` → syntax-check
  every inline `<script>` with `node --check` → run `tests/run-all.mjs` → deliver → user pushes via
  GitHub Desktop. **Rules changes must be published in the Firebase console *before* pushing dependent
  client code.**
- **Never rewrite whole files.** Locate code by reading the current file, never from memory.
- The schedule app is a **non-functional demo** carrying a red banner and is not going live soon —
  but it writes to **shared** documents (`vacations/userList`, `usernames`, `loginEmails`), so damage
  there is real.

### Working agreement that actually caught things

- **Verify every assumption against the code before acting on it.** Two "bugs" found by the fuzzer were
  my own wrong assumptions (NP means "No Priority", not non-participation; a prior-phase winner may
  legitimately sit above a week's capacity after an admin override). Both were corrected in the tests,
  not the engine.
- **Never let a test stub the thing it is testing.** That is precisely how the critical `capBreaches`
  bug passed four assertions while being fundamentally wrong.
- **Expect fixes to introduce defects.** Today's rate was roughly 1:1 — the audit of a 12-fix batch
  found 12 new regressions. **Re-audit after each batch of fixes.**

---

## 4. Immediate Next Steps

*Context for the next session, in priority order. Nothing here should be started without the user
saying so.*

**The live build state is unconfirmed.** Builds 116/201 were committed to the Mac but never verified
live, because the device bridge and browser tools disconnected. Confirming what is actually deployed is
the natural first move, and it is cheap — fetching each page and reading `var BUILD`, plus
`versions.json`.

**The auction must not go live, and the dry run should not be completed, until at least the critical
and the 17 high findings are fixed.** Several would produce a wrong allocation silently, which is the
failure mode that actually harms people. The audit report is the work queue; each entry carries a file,
a line, quoted evidence and a reproduction.

**The fixes are best done in small batches by subsystem, each followed by a targeted re-audit** rather
than one large sweep. The evidence for this is direct: today, a 12-fix batch delivered with confidence
introduced 12 new regressions including a critical one.

**Several high findings live in `firestore.rules`** — bid *content* is never validated (a priority of 0
or a negative number wins every week), `vacations/changes` has no author confinement so any bidder can
forge or erase the audit trail, and `mailQueue` is fully writable by any registered user. These group
naturally into one rules edit and one publish.

**Eighteen disputed findings need a human decision**, not more analysis — the two skeptics genuinely
split on each. They include two rated critical by one side: `_backupThen` running an irreversible
action after an incomplete backup, and a duplicated Google login e-mail granting one physician write
access to another's bids.

**Nine critic findings were never verified.** They were produced by the completeness pass at the end
and should go through the same two-skeptic treatment before being acted on.

**The database currently holds a used test state** — Phase 1 with bidding closed and eight bidders. A
full **Reset Auction** (not the lighter "Remove All Bids" cleanup) is required before launch, and is
also the last step of the dry run.

**Twenty-one users were bulk-set to FTE 1.0 today** on the assumption they are full-time. A human
confirming that list would close the last unverified data question.

---

## 5. Wait for instructions

**Do not begin any of the work described above.**

Read this file, run `node tests/run-all.mjs`, confirm the live build state if asked, and then **wait for
the user to tell you what to work on.** Do not start fixing audit findings, do not modify any file, and
do not push or publish anything until explicitly instructed.

If anything in this document conflicts with what the code actually does, **the code is right and this
file is wrong** — say so, and correct the record.
