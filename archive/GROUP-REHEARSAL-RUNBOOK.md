# Group Rehearsal Runbook — Admin Script (~40 minutes)

A sped-up, all-phases dry run with real users on the real system. Everything is live: real
bids, real e-mails, real security rules. Rehearsal Mode is ON so you have the skip tools; the
data all gets wiped by a Reset at the end.

**What this rehearsal proves:** sign-in for every user · mobile rendering · bidding, editing,
cancelling · the bid rules (floors, no number reuse, high-demand limits, NP phases) · live
projections · outbid alerts arriving by e-mail (= deliverability + whitelist check) · draws and
the wheel · approve/deny including an over-cap override · phase completion · results e-mails
matching what users tracked · bid numbers consumed/returned correctly across phases · caps.

---

## Part 0 — Days before (not on rehearsal day)

1. Send every user the **participant guide** (GROUP-REHEARSAL-USER-GUIDE.md) and tell them the
   date/time. Ask them to do its "Before rehearsal day" section NOW — especially the sender
   whitelisting. This rehearsal is your chance to close out the unconfirmed whitelist list.
2. Admin site → confirm every roster user has a **login e-mail** and an **FTE** (Begin Phase
   refuses if any FTE is missing). Fix stragglers now, not live.
3. FTE Availability panel → every week has a **saved capacity** (no yellow "NOT SAVED" rows).
4. Check your EmailJS quota headroom (2000/mo): this rehearsal sends roughly
   (users × 4 results e-mails) + outbid alerts — budget ~200 for 37 users.
5. **Print the half-sheet bid trackers (GROUP-REHEARSAL-BID-TRACKER) — one per user — and bring
   pens.** Users track on paper, not their phones.

## Part A — 15 minutes before start (admin alone)

1. Hard-refresh the admin site → footer/console shows build **238** or later.
2. **☁️ Back up to cloud now** (pre-rehearsal baseline).
3. **Reset Auction** (type RESET). Rehearsal Mode stays ON through a reset by design — if it
   isn't on yet, arm it in the Testing section (danger confirm).
4. Timer: leave duration at 48h (you'll close phases manually — the countdown just needs to be
   running so bidding is open).
5. Smart Lock: confirm Phase 1 state — high-demand weeks unlockable, standard weeks locked.
6. Have the admin page open on a laptop, ideally shared on a screen/Zoom so users can watch
   draws get resolved. Keep this page open the whole time — it's also the mail relay.

## Part B — The live script

Announce each "ROUND" out loud (or in the meeting chat). Users act only when you call a round —
that's what keeps this to 40 minutes.

### 0:00 — Sign-in & phones (5 min)
- Hand each user a printed bid tracker and a pen. Users: guide steps 1–3 (open site on phone,
  Google sign-in, check "Signed in as" is THEM, whitelist-confirm button).
- **You verify:** Whitelist Tracker count climbing toward 37/37. Anyone who can't sign in →
  check their login e-mail on the roster (typo = locked out; fix and have them retry).
- Ask: "Anyone whose screen looks broken or cut off — screenshot it and send it to me." That's
  the mobile-rendering test, on every real device model at once.

### 0:05 — Begin Phase 1
- Dashboard → **Begin Phase 1** → backup prompt (⏭ Skip backup & continue) → choose
  **keep Rehearsal Mode ON** (this is a rehearsal run-through). Timer starts.
- **You verify:** timer counting down on the dashboard; users confirm their boards flipped to
  "Phase 1" with only the 6 high-demand weeks biddable.

### 0:07 — ROUND 1: Phase 1 bidding (6 min)
Call these out; they force every rule to fire at least once:
1. "**Everyone place a bid on Ski Week** (Feb 14) — any of 1, 2, 3, 4, 1/2, 1/2/3." This
   guarantees competition, a draw, and outbid alerts.
2. "Place **one more bid** on any other high-demand week — but NOT the same number you already
   used." Then: "Now deliberately TRY to reuse a number you already used — it should refuse."
3. "One volunteer: **cancel** a bid, then re-bid the same week — notice it only accepts your
   old number or STRONGER (that's your priority floor)."
4. "Try to bid a number bigger than 4 on a high-demand week — it should refuse."
- Everyone: **write each bid on your tracker sheet** as you place it.
- **You verify:** bids appearing live on your dashboard; the Popcornometer moving; a DRAW
  visible on Ski Week; outbid users report the alert e-mail arriving (may take a minute —
  this is the deliverability test).

### 0:13 — Close Phase 1 & decide (6 min)
- Users: "Look at your board — write PROJECTED next to each bid: WIN, DRAW, REVIEW, or lose."
- **⏱ Close Phase Bidding** → this time take a REAL **☁️ Cloud Backup & Continue** (tests the
  backup under load, with the progress counter).
- **You verify:** every user's board shows bidding closed; nobody can bid (have one try).
- Approvals/Denials: resolve the Ski Week draw with the **wheel** (on the shared screen — this
  is the fun part, let them watch). **Deny one volunteer** (warn them first). **Approve one
  user over cap** — confirm the dialog's cap warning names them including the pending approval.
- **✓ Complete Phase 1** → confirm (note the contradicted-decision list stays empty unless you
  overrode something — read it if it shows).
- **📮 Send Phase Results** → real e-mails go out.
- Users: "Check your e-mail. Does it match the PROJECTED note on your sheet? Winners: your board
  shows the week locked in. Denied volunteer: your bid number should be back."

### 0:19 — Begin Phase 2 + ROUND 2 (7 min)
- **Begin Phase 2** → use **⏭ Skip backup & continue** this time (tests the skip path live).
- **You verify (and call out):** all 52 weeks now open; each user's "My Bids Remaining" row is
  missing the numbers they WON with (consumed forever) but has back the numbers they were
  DENIED or lost with. Users check this against their sheet — this is the bookkeeping test.
- ROUND 2: "Everyone place 1–2 bids on any standard week. Then EDIT one of them to a stronger
  number — and try to edit it WEAKER, which should refuse (the floor again)."
- Close bidding → quick approvals (approve everything except one deliberate deny) → Complete →
  Send Results → users check e-mail vs their sheet again.

### 0:26 — Phase 3 + NP bids (6 min)
- **Begin Phase 3.** ROUND 3: "Everyone place ONE **NP** bid (it's now allowed) and one
  numbered bid. Anyone who bid NP: notice NP is the weakest — a numbered bid beats it."
- Close → in Draws & Reviews, show an NP-vs-number outcome on the shared screen → decide →
  Complete → Send Results → users verify.

### 0:32 — Phase 4, the finale (5 min)
- **Begin Phase 4.** ROUND 4: "Last chance — place any final bid with what you have left."
- Close → decide → **Complete Phase 4** (note the dialog says it's the final phase) → Send
  Results.
- **You verify:** the auction shows complete; user boards show the final state; each user's
  won weeks across all 4 phases match their tracker sheet. Ask: "Anyone whose results don't
  match what they tracked — speak now." That's the accuracy sign-off you wanted.

### 0:37 — Debrief & teardown (5 min)
- Collect: rendering screenshots, any e-mail that never arrived (note WHO — that's a
  whitelist/deliverability lead, not necessarily a bug), anything that surprised anyone.
- Thank everyone; they're done. Then, admin alone:
  1. **Reset Auction** (wipes the rehearsal data).
  2. **Turn Rehearsal Mode OFF** (the pill on the Current Phase card — Reset deliberately
     does NOT do this).
  3. Confirm timer state you want for launch (probably OFF until real Phase 1).
  4. **☁️ Back up to cloud now** — this is your launch-eve baseline.

---

## Admin verification checklist (tick during the run)

| # | Check | When |
|---|-------|------|
| 1 | All users signed in; "Signed in as" correct on each phone | 0:00 |
| 2 | Whitelist Tracker → 37/37 (or note who's missing) | 0:00 |
| 3 | Mobile rendering clean (screenshots collected if not) | 0:00 |
| 4 | Begin Phase 1: timer starts, boards open, high-demand only | 0:05 |
| 5 | Number-reuse refused; weaker-bid refused; high-demand >4 refused | Round 1 |
| 6 | Outbid alert e-mails ARRIVE on real phones | Round 1 |
| 7 | Draw shown; wheel resolves it; deny works; over-cap override warns correctly | 0:13 |
| 8 | Real cloud backup completes with progress counter | 0:13 |
| 9 | Results e-mails match users' own projected sheets | each phase |
| 10 | Won numbers consumed / denied numbers returned in Phase 2 | 0:19 |
| 11 | Skip backup & continue works live | 0:19 |
| 12 | NP allowed in Phase 3, refused earlier; NP loses to numbers | 0:26 |
| 13 | Phase 4 completion = auction complete state | 0:32 |
| 14 | Teardown: Reset → Rehearsal OFF → timer set → launch-eve backup | 0:37 |

**If something breaks mid-rehearsal:** don't debug live. Note it, screenshot it, keep moving —
the phases are independent enough that one hiccup doesn't sink the run. Bring findings back to
a work session afterward; anything the rehearsal surfaces is in-scope to fix under the freeze.
