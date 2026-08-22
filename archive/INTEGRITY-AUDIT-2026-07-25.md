# Full Integrity Audit — KP East Bay Anesthesia Vacation Auction

**Date:** 25 July 2026  ·  **Audited builds:** vacation 116 / 201, schedule 24 / 46, published Firestore rules

## Method

195 agents. Fifteen specialists each took one subsystem and read the real source. Every finding was then
challenged by **two independent skeptics with different lenses** — one attacking the code claim, one attacking
whether the state is reachable in practice. A finding is listed as CONFIRMED only where **both** skeptics agreed.
Two completeness critics then hunted for what the specialists missed. 12.3M tokens, ~6 hours.

**90 raw findings → 59 confirmed · 18 disputed · 12 refuted**, plus 9 unverified critic findings.

Read the confirmed list as the work queue. Disputed items are where the two skeptics disagreed — they need a
human call, not more analysis. Critic findings were found late and have NOT been through verification.

---

## Confirmed findings

### CRITICAL (1)

#### C1. Begin Phase 1 does not clear approvals/denials, so pre-launch simulator decisions carry into the live auction

`vacation-kp.github.io/admin/index.html:4078` · breaks **other (I4/I7 + I5 divergence between staff and admin projections)** · found by *simulator*

**Evidence**

```
`_commitBeginPhase` clears the decision docs only for phases 2-4:

'''
  if(next===1){
    await setDoc(phasesRef,{currentPhase:1,phase1Started:true,phaseBeganAt:{...(phasesData.phaseBeganAt||{}),1:Date.now()}},{merge:true});
  } else {
    ...
    batch.set(approvalsRef,{});
    batch.set(deniedRef,{});
'''
(admin/index.html:4078-4093)

Arming the simulator before launch costs one click with no confirmation, because `toggleSimulator` only escalates when the auction is already live (admin/index.html:3117): `if(phase1Started()){ ...two confirms... }`, and `phase1Started()` (admin/index.html:3706) is false until Begin Phase 1.

The staff site can never reveal the damage: its `computeApprovals` (index.html:901-906) is explicitly forbidden from reading decisions — "it consults deniedData/approvalsData — which this site must NEVER do, per the mid-phase privacy invariant" — so users' own projections ignore the stale denial while the admin's engine drops them.
```

**Failure scenario**

Before go-live the admin arms the simulator (one click, no confirm), runs a full simulation and Auto-Approve/Deny to rehearse the flow, then cleans up with "Remove All Bids and Priority Locks" (which preserves approvals/denials) and turns the simulator off. Begin Phase 1 does not clear the decision docs and shows no warning about them. Real clinicians then bid on the 6 high-demand weeks. Any clinician the simulator happened to deny on, say, 2027-12-19 is silently excluded from `computeApprovals` for that week — their real bid of 1 shows WIN on their own staff board (staff never reads denials), shows LOSE in admin, generates no outbid alert, and `completePhase(1)` snapshots the stale approvals of whoever the simulator approved as permanent Phase-1 wins. The wrong physicians get Christmas week and the loser has no way to see it coming.

**Verifier notes:** CONFIRMED on code grounds; every quoted line is accurate and the path is reachable.  DEFECT. `_commitBeginPhase` (admin/index.html:4076-4095) branches on `next===1` and writes only `{currentPhase:1,phase1Started:true,phaseBeganAt}`. Only the else branch (phases 2-4) runs `batch.set(approvalsRef,{}); batch.set(deniedRef,{})`. A grep of every `approvalsRef`/`deniedRef` write shows the only wholesale

### HIGH (16)

#### H1. Removing a user mid-auction makes getPriorPhaseFteWon value their locked-in prior wins at the 1.0 fallback, shrinking every later phase's real capacity

`vacation-kp.github.io/admin/index.html:1719` · breaks **I4** · found by *engine-core*

**Evidence**

```
getPriorPhaseFteWon: `for(const u of getPriorPhaseWinners(wk)) total+=getUserFTE(u);` (admin/index.html:1719) and getUserFTE: `return fteData[u]!==undefined?fteData[u]:1.0;` (1630).

removeUser deletes the FTE entry but NOT the completed-phase snapshot that getPriorPhaseWinners reads: `updateDoc(fteRef,{[u]:deleteField()}).catch(()=>{})` (7272) — it touches userList, schedule, bidPhase, live approvals and live denials, but never `phases.completedPhases[N].approvals`, which is getPriorPhaseWinners' only source (1705-1716).

The gate that is supposed to make the 1.0 fallback unreachable does not cover this set: `const scored=new Set(names||[]); for(const u in (scheduleData||{})){ if(scheduleData[u]&&Object.keys(scheduleData[u]).length) scored.add(u); }` (1645-1646). A removed user is in neither `names` (arrayRemove'd from userList at 7264) nor `scheduleData` (deleted at 7268), so usersMissingFte() returns [] and blockedByMissingFte() (4063) lets Begin Phase proceed. The comment at 1622-1629 claims "no auction can run while anyone is unset and this line stays unreachable" — that is false for prior-phase winners, and the comment at 1638-1640 claims usersMissingFte "Checks everyone the 
```

**Failure scenario**

Week 2027-01-03, admin-saved capacity 3.0, review threshold at its default 0.5. Phase 1 completes with X (FTE 0.6), Y (1.0) and Z (1.0) approved for that week. Between phases X leaves the department and the admin clicks Remove User on X. Phase 2 begins; N (FTE 0.4) bids #1 on that week — the only phase-2 bidder.

Expected: priorFte = 0.6+1.0+1.0 = 2.6; N's group test is round(2.6+0.4-3.0)=0 <= 0, so N is a clean WIN and the week fills to exactly 3.0.

Actual (verified by executing the real functions extracted from the file): fteData['X'] is gone, so getUserFTE('X') returns the 1.0 guard, priorFte = 3.0, N's test is round(3.0+0.4-3.0)=0.4 > 0 -> settled, single-member group, overage 0.4 <= 0.5 -> N is downgraded from WIN to REVIEW. With the threshold set to 0.1 instead, N becomes an outright LOSE. Both sites show it identically, nothing warns, and 0.4 FTE of real capacity has silently van

**Verifier notes:** Confirmed on code, both sites. (1) getPriorPhaseWinners (admin 1705-1716 / user 881-891) reads ONLY phasesData.completedPhases[N].approvals[wk] and applies no roster/fteData/scheduleData filter; getPriorPhaseFteWon (1717-1720 / 895-898) values each with getUserFTE, whose fallback is `fteData[u]!==undefined?fteData[u]:1.0` (1630 / 843). (2) I read removeUser's full body (7245-7306): it writes userL

#### H2. "Deny All Current Losers" denies from one stale projection, so the bidder the engine would promote once the blocker is denied is denied in the same batch

`vacation-kp.github.io/admin/index.html:5795` · breaks **I4** · found by *engine-core*

**Evidence**

```
adDenyAllLosers takes ONE projection and then writes every denial from it: `const ap=computeApprovals();` (5795), `if(!a.winners.has(u)&&!a.draws.has(u)&&!a.reviews.has(u)){ toDeny.push({user:u,wk}); }` (5808-5810), then `for(const {user,wk} of toDeny){ await updateDoc(deniedRef,{[wk]:arrayUnion(user)})... }` (5822-5826) with no recomputation between writes.

That contradicts the engine's own semantics: computeApprovals drops denied users from `reqs` (`if(!ignoreAdmin&&deniedHereChk) continue;`, 1802) and then stops the week at the FIRST non-fitting group (`let settled=false; ... if(settled) continue;`, 1815-1817). So denying the blocking group re-opens the week for the next group — one click at a time produces a different, better allocation than the bulk button.

The stale-denial safety net does not catch it: _reconcileStaleDenials only runs from adminChangePriority/adminRemove (6194, 6218) and tests against `computeApprovals(true)` (6065), the natural projection that still contains the blocker — so the wrongly denied user still projects 'lose' and the denial is never reconciled. _execSimulationApprovals has the same one-snapshot pattern (5928, 5959).
```

**Failure scenario**

Week 2027-01-03, admin-saved capacity 3.4, review threshold 0.1. Bidders: A (FTE 1.0, bid 1), B (1.0, bid 2), C (1.0, bid 3), D (0.6, bid 4), E (0.4, bid 5).

Engine run (verified against the extracted code): A,B,C fit to 3.0; D's group gives round(3.0+0.6-3.4)=0.2 > 0 -> settled, single member, overage 0.2 > T=0.1 -> no review -> LOSE; E is never evaluated (settled) -> LOSE.

If the admin clicks Deny on D alone, the very next recompute gives winners {A,B,C,E} with fteWon 3.4 — E fits the remaining 0.4 exactly and shows as WIN, ready to approve.

If the admin clicks "Deny All Current Losers", D and E are both written from the pre-denial snapshot. The recompute now returns winners {A,B,C}, fteWon 3.0, with E marked denied. completePhase accepts it (every bid is decided), the phase-2 snapshot freezes E as denied, and E is e-mailed a loss for a week the site's own engine says they win. The 

**Verifier notes:** CONFIRMED. I re-read every cited function in /home/claude/work/vacation-kp.github.io/admin/index.html and the quoted evidence is accurate line-for-line.  1) The one-snapshot bulk write is real. `window.adDenyAllLosers=function(){` is at 5794; 5795 is `const ap=computeApprovals();`. The selection loop (5801-5813) pushes `{user:u,wk}` for every current-phase bidder not already approved/denied where 

#### H3. Phase 4 (final phase) results are permanently invisible to users — the results-visibility state machine has no exit from the terminal state

`vacation-kp.github.io/index.html:1982` · breaks **I9** · found by *phase-lifecycle*

**Evidence**

```
Staff site gates ALL completed-phase visibility on "a later phase has begun":

  index.html:1982  const keys=Object.keys(completed).filter(k=>Number(k)<curPh).sort(...)
  index.html:884   for(const phNum of Object.keys(cp)){ if(Number(phNum)>=cur) continue;   // getPriorPhaseWinners
  index.html:1154  for(const ph of Object.keys(cp)){ if(Number(ph)>=cur) continue;         // priorApprovedCount

The admin side never advances past 4:

  admin/index.html:4229  const next=cur+1; if(next>4){toast('Phase 4 is the final phase.','warn');return;}
  admin/index.html:3827  html=box('Phase 4 is complete and results are sent — the auction is finished. 🎉','');   // NO button, terminal state

So currentPhase is 4 forever, and `Number(4) < 4` is false for every reader. Additionally completePhase locks every week (admin/index.html:4005 `await _lockEveryWeek()`), and the staff board suppresses the win badge on locked weeks:

  index.html:2357  if(!isLocked&&priorWon){ ... '🏆 Won in Phase ${wonInPhase} — Locked In' ... }

so after the auction ends even the Phase 1-3 badges vanish from the calendar, leaving Phase History as the only user-facing record — and it excludes Phase 4.
```

**Failure scenario**

Admin completes Phase 4, then clicks "Send Phase 4 Results"; resultsSent[4] is set and renderNextStep shows "the auction is finished 🎉". A physician (say MK, who won Wk 51 Dec 19 in Phase 4) opens https://anesthesia-kp.github.io/vacation/. Every week tile is greyed out (all 52 locked), no 🏆 badge appears anywhere, and "Phase History" lists only Phases 1, 2 and 3. MK's final — and most contested — vacation allocation is nowhere on the site. There is no admin action that can make it appear: beginNextPhase refuses next>4, and the terminal renderNextStep branch offers no button at all. The only record of the final allocation is the one-shot e-mail, which is exactly the channel that can silently fail (see sendPhaseResultsEmails findings).

**Verifier notes:** CONFIRMED on code grounds, with two of the claim's embellishments corrected (neither overturns it).  Defect confirmed: - index.html:1981-1982 openPhaseHistory: `const curPh=Number(phasesData.currentPhase||1); const keys=Object.keys(completed).filter(k=>Number(k)<curPh)` — Phase 4 excluded when currentPhase==4. - index.html:882-885 getPriorPhaseWinners: `if(Number(phNum)>=cur) continue;` — Phase-4 

#### H4. approvalReadiness declares the phase closed whenever the countdown timer is OFF, and the inline "Lock all weeks" fix reaches that state without ever setting the server-side gate

`vacation-kp.github.io/admin/index.html:5555` · breaks **I3** · found by *phase-lifecycle*

**Evidence**

```
admin/index.html:5549-5565:

  const allWeeksLocked = !!locksData.globalLock || mondays.every(d=>!!locksData?.weeks?.[dateKey(d)]);
  const timerRunning = !!(timerData?.enabled && timerData?.lastChange && (((timerData.durationHours||48)*3600000)-(Date.now()-timerData.lastChange)>0));
  const phaseOpen = !biddingIsClosedFlag() && timerRunning && !locksData.globalLock;
  ...
  return {ready:problems.length===0, problems, warnings};

With the timer disabled, timerRunning is false, so phaseOpen is false regardless of biddingClosed. `ready` therefore becomes true as soon as the week locks are set — and the readiness warning offers a button that does exactly that and nothing else:

  admin/index.html:5619  <button ... onclick="_fixLockAllWeeksInline()">🔒 Lock all weeks</button>
  admin/index.html:5666  window._fixLockAllWeeksInline=async function(){ await _lockEveryWeek(); toast('🔒 All weeks locked','warn'); _refreshReadinessBox(); };

No biddingClosed write anywhere on that path. `ready` is what gates completePhase (admin/index.html:3897 `const rdy=approvalReadiness(); if(!rdy.ready){...return;}`) and what makes renderNextStep print "Bidding is closed" (admin/index.html:3848). Per-wee
```

**Failure scenario**

Phase 2 with the timer toggled OFF. Admin opens Approvals/Denials and sees the readiness warning "not all weeks are locked". Rather than "⏱ Stop bidding & lock all weeks now", they click the adjacent "🔒 Lock all weeks" button. locksData.weeks is now fully true, timerRunning is false, biddingClosed was never written. approvalReadiness().ready flips to true, _refreshReadinessBox prints "✓ Bidding is now closed and all weeks are locked — safe to approve/deny", and the dashboard offers "Complete Phase 2". Meanwhile firestore.rules still permits bid writes for every registered user (timerNotExpired passes on enabled!=true, biddingNotClosed passes on the absent flag), and the staff site's isAuctionClosed() returns false so the page is still live. A user writing to vacations/schedule during the approval window changes computeApprovals under the admin, and completePhase snapshots a scheduleData

**Verifier notes:** CONFIRMED on code. (1) approvalReadiness (admin/index.html:5548-5566) computes phaseOpen = !biddingIsClosedFlag() && timerRunning && !globalLock, and timerRunning is false whenever timerData.enabled!==true. So with the timer OFF the "phase is open" problem is never pushed, and ready flips to true the moment allWeeksLocked is satisfied. biddingIsClosedFlag() is timerData?.biddingClosed===true (line

#### H5. timerWriteSane still lets any registered bidder truncate the phase to ~1 hour from devtools

`firestore.rules:186` · breaks **I3** · found by *timer*

**Evidence**

```
firestore.rules:178-191 `timerWriteSane()` bounds a user's timer write only by `durationHours >= 1`, `<= 72`, a fresh `lastChange` (±600000 of request.time) and `lastChange + int(durationHours*3600000) > request.time.toMillis() + 3600000`. The comment at rules:175-177 claims the last clause "is the one that actually closes the hole", but it only requires the NEW deadline to be one hour out — it never compares the new deadline with the EXISTING one (`resource.data.lastChange + resource.data.durationHours`). Rules:214 grants the write to any `isRegisteredUser() && timerNotExpired() && timerWriteSane()`.
```

**Failure scenario**

Phase 1, day 0, timer just reset: `timer = {enabled:true, lastChange: now, durationHours: 48}` — 47h remain and 30 of 37 physicians have not bid yet. Dr. X (a registered bidder, already holding a winning position) opens devtools with the public Firebase config and runs `setDoc(doc(db,'vacations','timer'),{lastChange:Date.now(),durationHours:1.5},{merge:true})`. Every clause passes: keys are exactly lastChange/durationHours; lastChange is within ±10 min of request.time; 1.5 is in [1,72]; deadline = lastChange+5,400,000 > request.time+3,600,000. The write is ACCEPTED. Both sites' `isAuctionClosed()` and the server's `timerNotExpired()` now put the deadline 90 minutes out instead of 47 hours; at expiry `_autoCloseOnExpiry` (admin/index.html:6924) locks all 52 weeks. The phase is decided on a 90-minute window, every physician who was asleep or on shift loses their chance to counter-bid, and 

**Verifier notes:** Confirmed on code grounds. firestore.rules:178-191 timerWriteSane() references only request.resource.data — the existing deadline (resource.data.lastChange / resource.data.durationHours) is never read, so the function bounds the NEW deadline to >= request.time + 1h but never requires it to be >= the current deadline. Rules:214 is the sole clause covering docId=='timer' (isBidDoc() at :126 excludes

#### H6. Phase results become world-readable at "Complete Phase", before results are sent — the staff site's own privacy rule says they must not be

`vacation-kp.github.io/firestore.rules:197` · breaks **I5** · found by *rules-security*

**Evidence**

```
The read rule publishes `phases` to everyone: `allow read: if isAdminReadDoc(docId) ? isAdmin() : (isRelayDoc(docId) ? ... : (isSensitiveDoc(docId) ? isVerifiedAccount() : true));` (firestore.rules:197-199), and the comment at firestore.rules:81-83 deliberately excludes `phases` from the admin-read gate. But admin/index.html:3985-3996 writes, at Complete Phase, `setDoc(phasesRef,{currentPhase:cur, completedPhases:{...,[cur]:{approvals:apSnap, denials:denSnap, schedule:snap, projections:...}}})` — note `currentPhase` stays `cur`. Results are a SEPARATE later step: `resultsSent[cur]` is only stamped at admin/index.html:4615 (and 3790). The staff site itself treats that interval as private: index.html:1979-1982 `// PRIVACY RULE: a phase that is completed but whose successor has NOT begun is still hidden — results only become visible once the next phase starts.` and filters `Object.keys(completed).filter(k=>Number(k)<curPh)`; getPriorPhaseWinners (index.html:884) and priorApprovedCount (index.html:1154) apply the same `Number(ph)>=cur → skip`. So the UI hides it while the rules publish it — and every staff browser already holds the data, because index.html:1254 subscribes `onSnapshot(p
```

**Failure scenario**

Admin finishes approving Phase 2 at 16:00 and clicks "Complete Phase", intending to review once more and click "Send Phase Results" the next morning. Between those two clicks, any physician (in fact any anonymous visitor, since the rule evaluates to `true`) opens the staff site and types `phasesData.completedPhases[2].approvals` / `.denials` in the console: the complete per-week winner and denied list for the phase that is still `currentPhase`, plus `.schedule` and `.projections`. They learn they were denied Week 2027-07-04 — and who beat them — hours before anyone is told, while the admin still believes nothing has been released and could still revoke an approval.

**Verifier notes:** CONFIRMED — I tried to refute this on code grounds and could not; every load-bearing quote is accurate and the path is reachable.  1) The read rule really does publish `phases` to everyone. firestore.rules:196-199: `allow read: if isAdminReadDoc(docId) ? isAdmin() : (isRelayDoc(docId) ? (isRegisteredUser() || isAdmin()) : (isSensitiveDoc(docId) ? isVerifiedAccount() : true));`. For docId=='phases'

#### H7. Rules validate WHO writes a bid but never WHAT — a priority of 0 or a negative number wins every week, and the admin table renders it as "1"

`vacation-kp.github.io/firestore.rules:209` · breaks **I4** · found by *rules-security*

**Evidence**

```
The only constraint on bid content is key ownership: `|| (isBidDoc(docId) && (isAdmin() || (isRegisteredUser() && writesOnlyOwnKeys() && timerNotExpired() && biddingNotClosed())))` (firestore.rules:208-209), and writesOnlyOwnKeys (firestore.rules:132-140) only checks `affectedKeys().hasOnly(myInitials())` — the top-level initials key. Nothing checks the value. Both engines score raw: admin/index.html:1656 `function pScore(p){ if(p==="NP")return 99; if(Array.isArray(p)){...} return p+1; }` and staff index.html:861-871 `priorityScore` identically. So pScore(-1)=0 and pScore(0)=1, strictly stronger than any legitimate single bid (pScore(1)=2). The admin's primary review control is built from a fixed option list, admin/index.html:6042: `['1',...,'10','NP','1,2','1,2,3'].map(v=>`<option value="${v}"${String(pl)===v.replace(/,/g,'/')?' selected':''}>...`)` — a stored value of 0/-1 matches no option, so no `selected` is emitted and the browser shows the first option, "1". adminBidIssues (admin/index.html:6117-6150) checks phase-1 high-demand, locks, NP, number reuse and the cumulative cap — it never range-checks the value, and it only runs on admin-entered bids anyway.
```

**Failure scenario**

Dr XX, a registered bidder, opens devtools on the staff site and runs `setDoc(doc(db,'vacations','schedule'),{XX:{'2027-07-04':-1}},{merge:true})` plus the matching `bidPhase` write. Both writes pass the rules (affectedKeys = ['XX']). computeApprovals on both sites now sorts XX at score -0 ahead of every colleague's legitimate "1", so XX is the projected WIN on the busiest summer week and consumes the FTE cap. The admin opens Edit Selections to review and sees XX's bid displayed as "1" — indistinguishable from an honest top bid. The same gap lets a user write the number "1" on all six Phase-1 Sundays at once, breaking the one-number-per-phase rule (I2), which is enforced only in the client's option-disabling code (index.html:1725-1728).

**Verifier notes:** Independently confirmed both the defect and a reachable path.  DEFECT. firestore.rules:200-210 gates bid-doc writes purely on identity: `(isBidDoc(docId) && (isAdmin() || (isRegisteredUser() && writesOnlyOwnKeys() && timerNotExpired() && biddingNotClosed())))`. writesOnlyOwnKeys() (rules:132-140) is only `request.resource.data.diff(resource.data).affectedKeys().hasOnly(myInitials())` — a top-level

#### H8. timerWriteSane still lets any registered bidder cut the countdown to ~60 minutes, which auto-locks all 52 weeks

`vacation-kp.github.io/firestore.rules:178` · breaks **other** · found by *rules-security*

**Evidence**

```
firestore.rules:178-191 permits a user timer write when `lastChange` is within ±10 minutes of server time, `durationHours` is in [1,72], and `lastChange + int(durationHours*3600000) > request.time.toMillis() + 3600000`. Nothing anchors the new deadline to the OLD deadline, so the floor is now+1h, not "no earlier than before". The header comment at firestore.rules:175-177 claims clause 3 "is the one that actually closes the hole" — it only raises the floor from arbitrary to one hour. The consequence is wired up: admin/index.html:6880-6894 `_autoCloseOnExpiry()` fires on any open admin page when `remaining<=0` and calls `await _lockEveryWeek()`, toasting "Timer expired — bidding closed automatically (all weeks locked)". The quiet-hours protection (index.html:1035, `_quietAdjustExpiry`) is bypassed entirely because the attacker writes `durationHours` directly rather than going through `timerResetHours`.
```

**Failure scenario**

At 02:00 Pacific on day 3 of Phase 2, with the countdown showing 44 hours left, registered bidder AB runs in devtools: `setDoc(doc(db,'vacations','timer'),{lastChange:Date.now()+300000,durationHours:1},{merge:true})`. Every clause passes (lastChange is 5 min in the future, <10 min; duration 1 ≥ 1 and ≤ 72; deadline = now+65min > now+60min). The phase now expires at 03:05 while every other physician is asleep — the quiet-hours rule that exists precisely to stop overnight closes never applies. At 03:05 the first open admin page locks all 52 weeks and bidding is over; colleagues who were planning to bid the next morning never get to. Repeating the write every few minutes pins the auction at "65 minutes remaining" indefinitely, so the attacker also controls exactly when it dies.

**Verifier notes:** CONFIRMED on code grounds — I tried to refute this and could not.  DEFECT VERIFIED (firestore.rules:178-191). timerWriteSane() contains no comparison against the OLD document's values. Every inequality is against request.time only: lastChange within ±600000ms of server time, durationHours in [1,72], and `lastChange + int(durationHours*3600000) > request.time.toMillis() + 3600000`. The evidence is 

#### H9. vacations/changes has no author confinement — any registered bidder can forge or erase the audit trail that drives the Fair Play Monitor

`vacation-kp.github.io/firestore.rules:225` · breaks **I6** · found by *rules-security*

**Evidence**

```
`changes` matches no earlier clause and lands on the catch-all: `|| (!isAdminOnlyDoc(docId) && !isBidDoc(docId) && docId != 'timer' && docId != 'signInMisses' && docId != 'emails' && (isRegisteredUser() || isAdmin()))` (firestore.rules:225-227). That clause references neither `resource` nor `request.resource`, so a registered user may overwrite or delete the whole document. Compare `emails` one line up (firestore.rules:217) which IS confined by writesOnlyOwnKeys — the same protection was simply not extended to the log. The log is not cosmetic: admin/index.html:2301 `_fpEventFilter` and 2320-2360 `_fpAnalyzePhase` replay it and attribute misconduct to the attacker-supplied `e.user` field — `const u=e.user,wk=e.weekKey;` then `bump(u,'winCancel',wk,e.ts,'canceled a bid in a WINNING position ...')` and `bump(u,'lateTimer',...)`. Deleting the doc is equally permitted (no resource guard), and the staff site's own writer is a plain arrayUnion at index.html:1555 with no server-side shape check.
```

**Failure scenario**

Bidder AB wants EF investigated. AB runs `updateDoc(doc(db,'vacations','changes'),{log:arrayUnion({id:'x1',user:'EF',weekKey:'2027-07-04',action:'added',actor:'user',bidValue:1,ts:T1},{id:'x2',user:'EF',weekKey:'2027-07-04',action:'removed',actor:'user',bidValue:1,ts:T1+600000})})`. The rules accept it. On the admin's Fair Play Monitor, EF is now flagged for a timer-stall round trip and, if the fabricated timestamps land near a reset, for cancelling a bid in a winning position — evidence the admin has no way to distinguish from real activity. Conversely, AB can erase their own genuine last-minute cancellations with `setDoc(doc(db,'vacations','changes'),{log:[]})`, which also silently destroys the 24h activity feed on both sites and every entry the next completePhase would have archived.

**Verifier notes:** Independently confirmed on code grounds; every quoted line matches the real files.  1) Rules gap is real and exact. In firestore.rules, isAdminOnlyDoc lists 'changesArchive' and 'changesDecisions' but NOT 'changes'. 'changes' is also not isBidDoc, not welcomeLog, not timer/emails/signInMisses. The only clause it can match is the catch-all at 225-227: `|| (!isAdminOnlyDoc(docId) && !isBidDoc(docId)

#### H10. Off-grid FTE values (e.g. 0.75) survive validation and defeat the 0.1-grid fit test, letting winners exceed a week's capacity

`vacation-kp.github.io/admin/index.html:1651` · breaks **I4** · found by *fte-capacity*

**Evidence**

```
getUserFTE returns the stored value RAW, with no grid snap:
  1630: function getUserFTE(u){ return fteData[u]!==undefined?fteData[u]:1.0; }
usersMissingFte only range-checks, never grid-checks:
  1650:     const n=Number(v);
  1651:     return isNaN(n)||n<FTE_MIN||n>1;
The engine's fit test rounds the AGGREGATE to the 0.1 grid:
  1819:      if(Math.round((fteWon+gf-cap)*10)/10<=0){ // FP-safe fit test
Today's snap-on-save (7425 `const val=Math.round(raw*10)/10;`, comment "[AUDIT 2026-07-25 #10]") only constrains NEW entries. There is no migration, no read-time normalisation (`onSnapshot(fteRef, snap=>{ fteData=snap.exists()?snap.data():{}; ...})` at 1428 stores raw), and no warning: the Users table renders `value="${fte}"` with `_unsaved=false` (7154-7162), so 0.75 looks like a normal saved value. A live post-fix re-entry path also exists — _doFullRestore writes the backup's fteMap verbatim:
  8055:      batch.set(ref, v||{});
so restoring ANY backup taken before 25 Jul 2026 puts off-grid values straight back.
The staff site is identical (index.html:843, 952), so both sites agree on the wrong answer — I7 hides it.
```

**Failure scenario**

Week 2027-12-19 has admin-saved capacity 3.0. Four physicians whose FTE was entered as 0.75, 0.75, 0.75 and 0.8 before 25 Jul 2026 (or restored from a pre-25-Jul backup) all bid priority 1 on it — one tie group. groupFte = 0.75+0.75+0.75+0.8 = 3.05, and in IEEE-754 `3.05 - 3.0 === 0.04999999999999982`, so `Math.round(0.04999999999999982*10)/10 === 0` and the `<=0` fit test PASSES. All four are scored WIN. The week is allocated 3.05 FTE against a 3.0 cap — I4 broken by 0.05 with no admin override — while the very same object reports `fteWon: Math.round(3.05*10)/10 = 3.1` against `fteCap: 3.0`, i.e. the header reads "Winning 3.1 of Cap 3.0" and nothing blocks, warns, or flags it (usersMissingFte returns [] because 0.75 and 0.8 are both inside [0.4, 1.0], so blockedByMissingFte lets the phase begin).

**Verifier notes:** Confirmed on code grounds. Every cited line reads as quoted. getUserFTE (admin/index.html:1630, staff index.html:843) returns fteData[u] raw; onSnapshot(fteRef,...) at :1428 stores the doc raw — and it is the ONLY data map without read-time normalisation (scheduleData:1396, approvalsData:1429, deniedData:1433, bidPhaseData:1434 all run through normalizeUserWkMap/normalizeWkArrayMap), so the asymme

#### H11. removeUser deletes a user's FTE but leaves their prior-phase wins, which then consume the 1.0 fallback and silently shrink every later phase's capacity

`vacation-kp.github.io/admin/index.html:7272` · breaks **I4** · found by *fte-capacity*

**Evidence**

```
removeUser deletes the FTE entry:
  7272:          updateDoc(fteRef,{[u]:deleteField()}).catch(()=>{}),
and also deletes the user from userListRef (7260), scheduleRef (7265) and the LIVE approvals/denials arrays (7280-7300) — but it never touches phasesRef. completePhase writes the winners into an immutable snapshot (3987: `completedPhases:{...,[cur]:{ ..., approvals:apSnap, ...}}`), so the removed user stays a prior-phase winner forever:
  1706: function getPriorPhaseWinners(wk){ ... cp[phNum]?.approvals||{} ... }
  1717: function getPriorPhaseFteWon(wk){ let total=0; for(const u of getPriorPhaseWinners(wk)) total+=getUserFTE(u); return total; }
With fteData[u] deleted, getUserFTE(u) falls back to 1.0 (1630). usersMissingFte cannot see them — it unions `names` (they were removed) with keys of live `scheduleData` (their bids were deleted):
  1645:   const scored=new Set(names||[]);
  1646:   try{ for(const u in (scheduleData||{})){ if(scheduleData[u]&&Object.keys(scheduleData[u]).length) scored.add(u); } }catch(_){}
so blockedByMissingFte (4063) does not fire and renderNextStep's fteNote banner (3814) never mentions them. The completePhase comment at 3963 confirms the semantics the
```

**Failure scenario**

Christmas week 2027-12-19, admin-saved capacity 5.0. Phase 1 completes with three approved winners: AB (FTE 0.6), CD (1.0), EF (1.0) — priorFte 2.6, and the frozen fteHead snapshot records available 2.4. AB then resigns and the admin clicks 🗑 Delete on AB in the Users panel (the dialog promises "All of this user's data will be permanently deleted... FTE setting"). Phase 2 begins. getPriorPhaseWinners still returns {AB, CD, EF}; getPriorPhaseFteWon now returns 1.0+1.0+1.0 = 3.0 because AB's fteMap entry is gone. A Phase-2 priority-1 group of GH (1.0), IJ (1.0) and KL (0.4) sums to 2.4: the correct test is Math.round((2.6+2.4-5.0)*10)/10 === 0 → all three WIN, but the actual test is Math.round((3.0+2.4-5.0)*10)/10 === 0.4 > 0 → the group does not fit and all three are demoted to DRAW. Three physicians are denied a week they mathematically won, the Phase-1 report still shows 2.4 available 

**Verifier notes:** Independently confirmed on code grounds, both the defect and a reachable path.  DEFECT CHAIN (all quotes verified in /home/claude/work/vacation-kp.github.io/admin/index.html): 1. removeUser (7244-7305) deletes fteMap: `7272: updateDoc(fteRef,{[u]:deleteField()}).catch(()=>{})`, userList (7263 arrayRemove), scheduleRef (7265) and the LIVE approvals/denials arrays (7282-7300). A grep of every `phase

#### H12. _reconcileStaleDenials silently reverts any denial of a bid that isn't a NATURAL loss — including deliberate draw-resolution and cap-enforcement denials

`vacation-kp.github.io/admin/index.html:6067` · breaks **I1** · found by *decisions*

**Evidence**

```
async function _reconcileStaleDenials(wk){ ... const nat=computeApprovals(true); // natural projection (ignores all admin decisions)
    for(const u of denied){
      if(getOutcome(wk,u,nat)!=='lose'){
        await updateDoc(deniedRef,{[wk]:arrayRemove(u)}).catch(()=>{});

The test is post-change state only — there is no before/after comparison, so it cannot distinguish "this user was denied because they lost, and the loss is now stale" from "the admin deliberately denied a projected WIN/DRAW". `nat` is computeApprovals(true), which explicitly does NOT skip denied users (line 1801: `if(!ignoreAdmin&&deniedHereChk) continue;`), so a denied natural winner/draw-participant always evaluates to 'win'/'draw' and is always un-denied. It is invoked unconditionally from every admin bid-write path on that week: adminChangePriority/_adminChangePriorityRaw (6196), adminRemove (6220), confirmAdminEdit (7872), confirmAdminCancel (7900) — and the Draws & Reviews rows themselves render a "✕ Cancel" button wired to confirmAdminCancel, so the trigger sits on the same screen as the denial.
```

**Failure scenario**

Phase 3, cumulative cap through Phase 3 = 2. Week W has capacity 2.0. Bidders: A (FTE 1.0, bid "1"), B (FTE 1.0, bid "2"), D (FTE 1.0, bid "5"). computeApprovals: A wins (fteWon 1.0), B wins (fteWon 2.0), D loses (2+1-2=1>0.5=T). A already won 2 weeks in Phases 1-2, so capBreaches flags "A would end Phase 3 with 3 weeks — over the cumulative cap of 2". The admin follows the UI's own advice and DENIES A on W. Recompute: A is excluded from reqs, so B wins and D is promoted to WIN — the slot correctly goes to D. The admin now edits D's bid on W (Edit Selections dropdown 5→4, or D's row "✕ Cancel" on Draws & Reviews). _adminChangePriorityRaw calls _reconcileStaleDenials('W'); denied=['A']; nat (ignoring denials) puts A in winners, so getOutcome !== 'lose' and A's denial is silently removed. Toast reads "✏️ D <wk> updated · lock cleared" with no mention of the reverted denial. A is now an und

**Verifier notes:** CONFIRMED — the code says exactly what the claim quotes and I could not refute it.  1. Defect exists as described. `_reconcileStaleDenials` (admin/index.html:6061) computes `nat=computeApprovals(true)` and deletes any denial where `getOutcome(wk,u,nat)!=='lose'`. This is a post-change-state-only test; there is no before/after comparison, no stored denial reason, no adminLog entry and no toast for 

#### H13. _doFullRestore commits a knowingly-partial restore when the backup has FETCH-FAILED documents

`vacation-kp.github.io/admin/index.html:8048` · breaks **I10** · found by *backup-restore*

**Evidence**

```
`if(typeof v==='string'){ bad.push(k); continue; } // FETCH-FAILED placeholder in the backup` (8048) — the loop skips that document and `await batch.commit()` (8057) still writes the other 24. The single-user path deliberately does the opposite: `if(unusable.length){ toast('🛟 Restore ABORTED — ...Restoring would delete ... Use a complete backup.','err'); return; }` (8104-8108), with a comment stating "a partial one is worse". The full path has no such pre-flight; the admin only learns afterwards via `toast(bad.length?('🛟 Restore complete, but '+bad.length+' document(s) were unreadable...'):...,'warn')` (8066) — a 3-second toast (8167) fired after the write is already durable. There is no undo.
```

**Failure scenario**

A backup taken during Phase 2 has `schedule: 'FETCH-FAILED: unavailable'` (all other 27 docs good). Two days later, mid-Phase-3, the admin full-restores it. The batch writes `phases` (currentPhase:2, completedPhases {1,2-absent}), `approvals`, `denials`, `bidPhase`, `bidTimes`, `locks` and `slots` from the backup but leaves the LIVE `schedule` — which now holds every physician's Phase-3 bids — untouched. Result: currentPhase reverts to 2 while 37 users' Phase-3 bids sit in schedule with bidPhase tags that were just rolled back to Phase-2 values, so `getUserBidPhaseAdmin` (1723-1736) infers phase from the wrong snapshot and `computeApprovals`' filter `if(getUserBidPhaseAdmin(u,wk)<Number(phasesData.currentPhase||1)) continue;` (1806) silently drops or admits the wrong bids. Approvals now reference weeks/users whose bids the restore did not bring back. The allocation is neither the backup'

**Verifier notes:** Confirmed on code. In _doFullRestore (admin/index.html 8027-8067) the batch loop does `if(typeof v==='string'){ bad.push(k); continue; }` (8048) and then unconditionally `await batch.commit()` (8057), writing the remaining 24 of the 25 mapped docs while the FETCH-FAILED one keeps its live value. `bad` is never consulted before the commit; the only notification is the toast at 8066, and window.toas

#### H14. Mail-queue claim is stamped but never released when the relay abandons after claiming — outbid alerts starve silently

`vacation-kp.github.io/index.html:1368` · breaks **I8** · found by *email*

**Evidence**

```
Staff `relayMailQueue` claims the entry BEFORE it checks that the mailer even exists:

'''
1356:        await updateDoc(mailQueueRef,{[qid+'.claimedAt']:Date.now(),[qid+'.claimedBy']:MQ_ID});
1357:        await new Promise(r=>setTimeout(r,2500));
1358:        if(mailQueueData[qid]?.claimedBy!==MQ_ID) continue;
...
1368:        if(typeof emailjs==='undefined') continue;      <-- abandons WITH our claim still written
'''

There is no code path anywhere in either relay that clears `claimedAt`/`claimedBy` on abandonment. The admin twin is worse — it has no `typeof emailjs` guard at all, so an unloaded mailer throws a ReferenceError inside the send loop (admin/index.html:1535) which is swallowed by `catch(err){ console.warn('Queue send failed for',e.user,err); }` (admin/index.html:1546), again leaving the claim in place. `_mqEligible` (index.html:1292) then treats the entry as ineligible for every OTHER page for the full 90 s: `(!e.claimedAt||(now-e.claimedAt)>90000)`. The blocked tab re-polls every 15 s (index.html:1047 `setInterval(...scheduleMailQueueRelay...,15000)`) plus its own `finally` re-schedule (index.html:1379), so it is the fastest bidder for the entry the instant the claim
```

**Failure scenario**

The EmailJS CDN script (`<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/...">`, index.html:330) fails to load in one physician's browser — hospital proxy, content blocker, or a flaky load; the failure is silent because `emailjs.init` is wrapped in `try{...}catch(e){}` (index.html:331). That tab stays open on the board all day. AD places a bid at 09:00 that flips MK from WIN to LOSE; AD's own tab dies before sending, so alert `q` sits in mailQueue. 30 s later the blocked tab claims `q` (writes claimedAt=T, claimedBy=idx_xxx), waits 2.5 s, confirms it owns it, hits line 1368 and silently abandons. `q` is now invisible to the admin page and every other staff page until T+90 s, at which point the blocked tab — polling every 15 s — re-claims and re-abandons it. MK never receives the outbid alert, the admin dashboard shows a red 'pending alerts' badge that never drains, and click

**Verifier notes:** The underlying defect is real and I confirmed it in the source. index.html:1356 writes `{[qid+'.claimedAt']:Date.now(),[qid+'.claimedBy']:MQ_ID}` BEFORE the capability check at 1368 `if(typeof emailjs==='undefined') continue;`, and `grep -n claimedAt` over the staff file returns only 1293 (_mqEligible) and 1356 — there is no path anywhere that clears claimedAt/claimedBy on abandonment; the claim i

#### H15. mailQueue is writable in full by any registered bidder — forged auction e-mails and silent destruction of every pending alert

`vacation-kp.github.io/firestore.rules:225` · breaks **I8** · found by *email*

**Evidence**

```
mailQueue is not in `isAdminOnlyDoc`, not in `isBidDoc`, and is not one of the specially-confined docs, so it falls through to the catch-all write clause with NO key confinement and NO shape validation:

'''
225:  || (!isAdminOnlyDoc(docId) && !isBidDoc(docId)
226:       && docId != 'timer' && docId != 'signInMisses' && docId != 'emails'
227:       && (isRegisteredUser() || isAdmin()));
'''

Today's `_knownRosterAddress` guard only covers the single-target `to` field (index.html:1339 and admin/index.html:1494 — `if(isWelcome && !_knownRosterAddress(e.to)) continue;`). The fan-out branch is unguarded: `recips=recipientsFor(e.user)` (index.html:1344) and the body is sent verbatim — `emailjs.send(...,{to_name:e.user,to_email:to,changes:e.body||''})` (index.html:1370, admin/index.html:1535). Neither `e.user` nor `e.body` is validated against anything. Contrast `emails`, which the same rules file DOES confine per-user (line 218, with the comment 'an insider could otherwise silently redirect a competitor's outbid alerts').
```

**Failure scenario**

Bidder X (one of the 37 registered physicians) opens devtools and runs `setDoc(doc(db,'vacations','mailQueue'),{evil:{user:'MK',body:'Hi MK,\n\nPhase 2 results: your bid on Dec 20 was DENIED.',ts:Date.now()-40000}},{merge:true})`. Within ~30 s the next open page (staff or admin) picks it up: it has no `to`, so `isWelcome` is false, `_knownRosterAddress` is never consulted, `recipientsFor('MK')` resolves MK's real Google and KP addresses, and the forged text is delivered to both from the department's own EmailJS account and counted against the shared quota. The same write permission lets X run `setDoc(mailQueueRef,{})` and destroy every pending outbid alert in the outbox with no trace — the exact data-loss the outbox pattern exists to prevent. (welcomeLog and mailStats sit behind the same catch-all clause: X can pre-mark every address as welcomed to suppress all welcome e-mails, or rewrit

**Verifier notes:** Could not refute; every cited line and control-flow step verified independently.  RULES: `mailQueue` occurs in firestore.rules only inside isRelayDoc() (lines 71-73), which is referenced solely by the `allow read` expression (line 198). It is not in isAdminOnlyDoc (lines 98-117, grep count 0), not in isBidDoc (line 126), and is not welcomeLog/timer/emails/signInMisses. The `allow write` block (lin

#### H16. A transient network failure during anonymous bootstrap permanently rejects authReady, killing every Firestore listener for the life of the tab

`vacation-kp.github.io/index.html:711` · breaks **I8** · found by *auth-roster*

**Evidence**

```
`const authReady = new Promise((resolve, reject) => { let _bootstrapped=false; onAuthStateChanged(auth, u => { if (u) { resolve(u); } else if (!_bootstrapped) { _bootstrapped=true; signInAnonymously(auth).catch(reject); } }, reject); });` (index.html:702-713). The `_bootstrapped` latch means the anonymous sign-in is attempted exactly ONCE and never retried, and its failure REJECTS the promise permanently. Every listener on the page goes through the deferred wrapper `function onSnapshot(ref,next,error){ ... authReady.then(()=>{ ... }).catch(()=>{}); ... }` (index.html:720-728), whose `.catch(()=>{})` silently swallows the rejection so nothing ever attaches. A later successful Google sign-in fires the same handler and calls `resolve(u)` — a no-op on an already-rejected promise. The only reaction is `authReady.catch(e => console.error('[Auth] anonymous sign-in failed:', ...))` (index.html:714), a console line the user never sees. startListening() — called from completeSignIn (index.html:2803) — uses the same wrapper (`unsubSchedule=onSnapshot(scheduleRef,...)`, index.html:1526), so it attaches nothing either. Contrast the schedule staff site, which retries on every auth change: `onAut
```

**Failure scenario**

A physician opens the auction on hospital wifi during a brief dropout. signInAnonymously rejects with auth/network-request-failed; authReady is now permanently rejected and zero listeners exist. The 1.5s fallback at index.html:687-693 sets _adminSettingsReady/_passcodesReady/_emailsReady/_usernamesReady all true and calls refreshLoginUsers(), so the sign-in screen unlocks normally with the hardcoded 37-name roster. Network returns; the user clicks 'Sign in with Google', which succeeds because the second handler uses getDoc (index.html:2639-2645), not the wrapper — resolveByEmail matches, completeSignIn() runs, the modal closes and mainContainer is shown. The user now sees a fully-rendered but permanently EMPTY board: scheduleData, locksData, timerData, phasesData, approvalsData and slotsData are all still at their initial values because no snapshot ever arrived. Their own existing bids a

**Verifier notes:** CONFIRMED on code grounds. (1) The quoted code at vacation-kp.github.io/index.html:702-714 is verbatim correct: `let _bootstrapped=false; onAuthStateChanged(auth, u => { if (u) { resolve(u); } else if (!_bootstrapped) { _bootstrapped=true; signInAnonymously(auth).catch(reject); } }, reject);`. The latch means the anon sign-in is attempted exactly once, and its failure rejects authReady permanently

### MEDIUM (28)

#### M1. guardAdminBid never flags a bid the high-demand-week rule forbids (numbers >4, or NP)

`vacation-kp.github.io/admin/index.html:6114` · breaks **I7** · found by *engine-parity*

**Evidence**

```
adminBidIssues() (admin/index.html:6108-6141) enumerates exactly five rule checks:
  // 1. Phase 1 is high-demand only.
  if(p1HighDemandOnly()&&!HIGH_DEMAND_WEEKS.has(wk)) out.push('Phase 1 is <strong>high-demand only</strong> ...');
  ... 2. locks ... 3. `if(isNP&&!npAllowedForPhase(cur))` ... 4. bid-number uniqueness ... 5. cumulative cap.
There is NO check that the value is inside the high-demand allowed set. The staff site enforces that rule twice — once as a UI gate (index.html:1721 `if(isHighPrioOnly&&v!=="NP"&&!HIGH_PRIORITY_ALLOWED.has(v)){opt.disabled=true;return;}` and index.html:1722 `if(v==="NP"){opt.disabled=hasCap||isHighPrioOnly||!npAllowedNow();return;}`) and once as a hard re-check at submit (index.html:1804): `if((weekMeta[wk]?.highPriorityOnly) && (val==="NP" || !HIGH_PRIORITY_ALLOWED.has(val))){ showCenterAlert("This high-demand week only accepts bids of 1, 2, 3, 4, \"1/2\", or \"1/2/3\"."); window.closeModal(); return; }` with HIGH_PRIORITY_ALLOWED=new Set(["1","2","3","4","1,2","1,2,3"]) (index.html:784) over the six weeks flagged highPriorityOnly (index.html:776-781) — the same six keys as admin's HIGH_DEMAND_WEEKS (admin/index.html:3247). The admin controls
```

**Failure scenario**

Phase 1 (high-demand only) is open. Admin opens Edit Selections → Add Bid, picks user JS, week "Sun Dec 19" (2027-12-19, Christmas — a HIGH_DEMAND_WEEKS/highPriorityOnly week) and priority 7, and clicks Add. adminBidIssues returns [] (the week IS high-demand so check 1 passes, it is unlocked, the value is not NP, 7 is unused, JS is under the cap), so the dialog title is the plain '➕ Add Bid' with no rule-breach list and no red 'Admin entries bypass every check the bidding engine applies' banner. scheduleData.JS['2027-12-19']=7 is written with bidPhase 1. Both computeApprovals twins then score it pScore(7)=8 and let it compete for a Christmas slot — a bid no physician could ever have placed there, since the staff site blocks anything outside {1,2,3,4,1/2,1/2/3} on that week. Same for NP: in a phase where NP is enabled (phase 3+ by default), admin can set NP on Christmas with no warning at

**Verifier notes:** Confirmed on code. (1) adminBidIssues (admin/index.html:6117-6150) contains exactly five checks — p1HighDemandOnly/standard-week, global+week locks, NP-per-phase, bid-number uniqueness, cumulative cap — and no membership test against any allowed-value set. grep for HIGH_PRIORITY_ALLOWED in admin/index.html returns ONLY lines 3303 and 3311, both inside the simulator (SIM_HIGH_PRIORITY_ALLOWED), so 

#### M2. Confirmed "Close Bidding" can silently do nothing — the new _bkBypass guard on _fixClosePhaseBidding re-prompts for a backup after the admin already confirmed

`admin/index.html:5648` · breaks **I3** · found by *timer*

**Evidence**

```
admin/index.html:3733 `if(!_bkBypass){ _backupThen('closing Phase '+cur+' bidding',function(){ _bkBypass=true; try{ window.closePhaseBidding(cur); } finally { _bkBypass=false; } }); return; }` — the wrapper's `finally` runs SYNCHRONOUSLY as soon as `closePhaseBidding` opens its modal (openConfirm at admin/index.html:7532 only mutates the DOM and returns), so `_bkBypass` is already back to `false` by the time the admin presses OK. The OK handler then runs `onConfirm:async()=>{ await _fixClosePhaseBidding(cur); }` (3743) and `_fixClosePhaseBidding` hits its own guard at 5648 `if(!_bkBypass){ _backupThen(...); return; }`. `_backupThen` (8129) passes no `onCancel`, and `closeConfirm` (7552) fires nothing when the dialog is dismissed.
```

**Failure scenario**

Admin clicks "⏱ Close Phase 1 bidding" on the dashboard. Dialog 1: "💾 Back up before closing Phase 1 bidding?" → they click "Backup & Continue" (a backup file downloads). Dialog 2: "⏱ Close Phase 1 bidding — the countdown timer expires immediately… all 52 weeks are locked" → they click the red "⏱ Close Bidding". Dialog 3 is the SAME backup prompt again. Having just downloaded a backup, the admin presses Cancel. `_fixClosePhaseBidding` returned before `_lockEveryWeek()`, before the timer-expiry write (5653) and before `setDoc(timerRef,{biddingClosed:true})` (5662). No toast, no error. Bidding is still fully open — timer running, zero weeks locked, biddingClosed unset — while the admin proceeds to approve/deny, and users keep changing bids underneath the decisions. The same double-prompt defeats the comment at admin/index.html:3906 ("backup was already offered … don't prompt twice in one 

**Verifier notes:** Independently confirmed both the defect and a reachable path.  Mechanism verified: openConfirm (admin/index.html:7532) is fully synchronous — it writes cmTitle/cmBody, assigns cmCallback, wires okBtn.onclick, calls classList.add("show") and returns; it never awaits the user. So the wrapper at admin/index.html:3733, `function(){ _bkBypass=true; try{ window.closePhaseBidding(cur); } finally { _bkByp

#### M3. Inline "Stop bidding & lock all weeks now" destroys the open approve/deny dialog and loses the pending decision

`admin/index.html:5617` · breaks **I8** · found by *timer*

**Evidence**

```
admin/index.html:5610-5618 renders `onclick="_fixClosePhaseBidding(${cur})"` INSIDE the approve/deny confirm body, and the comment at 5605-5607 states these inline fixes "act immediately (no nested confirm, which would replace the dialog the admin is in)". But `_fixClosePhaseBidding` now begins with `if(!_bkBypass){ _backupThen('closing Phase '+cur+' bidding', …); return; }` (5648), and `_backupThen` (8129-8138) calls `openConfirm`, which overwrites `cmTitle`/`cmBody` and reassigns `cmCallback` (7533-7539) on the single shared `#confirmModal`.
```

**Failure scenario**

Bidding is still open (timer running), so `approvalReadiness().ready` is false and every approve dialog carries the readiness box. Admin clicks "✓ Approve" on Dr. K for the week of 2027-07-04, then — before confirming — clicks the inline "⏱ Stop bidding & lock all weeks now". The approve dialog's title/body/OK-callback are replaced in place by the backup prompt; `cmCallback` (the `updateDoc(approvalsRef,{[wk]:arrayUnion('K')})` at admin/index.html:3880) is discarded. Admin completes the backup flow, bidding closes, `_refreshReadinessBox()` finds no `#readinessWarnBox` and returns silently. Dr. K is never approved, and nothing tells the admin the approval was dropped — it simply reappears as an undecided bid in the pending list.

**Verifier notes:** Independently confirmed on code grounds.  REACHABILITY: readinessWarnHtml() (admin/index.html:5624) is interpolated into the body of every approve/deny confirm dialog — adApprove:5692, adDeny:5711, bulk approve:5778, bulk deny:5818, confirmApprove:7824. When approvalReadiness().ready is false (bidding still open), _readinessProblemHtml() emits the button at 5617: onclick="_fixClosePhaseBidding(${c

#### M4. adminResetTimer clears biddingClosed and reports "bidding is open again" while all 52 weeks are still locked

`admin/index.html:7051` · breaks **I9** · found by *timer*

**Evidence**

```
admin/index.html:7051 `onConfirm:async()=>{ … setDoc(timerRef,{lastChange:_n,biddingClosed:false,durationHours:…},{merge:true}); toast("↺ Timer reset — bidding is open again","ok"); }`. The confirm body (7043-7045) says only "Reset timer to Xh from this moment?" and never mentions locks. The sibling path added the same day, `reopenBidding` (7018-7024), DOES compute `const lockedCount=mondays.filter(d=>!!locksData?.weeks?.[dateKey(d)]).length;` and warns "⚠️ N of 52 weeks are still locked — users can only bid on the unlocked ones." `_fixClosePhaseBidding` always runs `await _lockEveryWeek()` (5650) first, so after any Close Phase Bidding all 52 weeks are locked, and the staff site hard-blocks them at index.html:1577 and 1675 (`if(locksData.globalLock||locksData.weeks?.[wk]){ showCenterAlert("This week has been locked by the admin") }`).
```

**Failure scenario**

Admin closes Phase 2 bidding (all 52 weeks locked, timer expired, biddingClosed=true), starts approvals, then decides to give people six more hours. The Reset Timer button is enabled (the timer was expired, not disabled — `rb.disabled=!en` at 6844). They click "↺ Reset Timer" → "↺ Timer reset — bidding is open again". The staff countdown restarts and renderNextStep now reads "Phase 2 bidding is OPEN — users can place and change bids" (3841, since `biddingIsClosedFlag()` is now false and the timer is running). In reality every one of the 52 weeks is locked, so every physician who tries gets "This week has been locked by the admin — no changes allowed." The six extra hours are unusable and the admin has no indication why.

**Verifier notes:** Confirmed on code. admin/index.html:7051 adminResetTimer's onConfirm writes {lastChange:_n, biddingClosed:false, durationHours:...} and toasts "↺ Timer reset — bidding is open again"; the confirm body at 7043-7045 contains only the duration line plus an optional opening-window note — no lock check, no readinessWarnHtml(), no lockedCount. The sibling reopenBidding (7016-7024) performs the identical

#### M5. Failed biddingClosed write is swallowed and still toasted as success

`admin/index.html:5662` · breaks **I8** · found by *timer*

**Evidence**

```
admin/index.html:5662-5663 `await setDoc(timerRef,{biddingClosed:true},{merge:true}).catch(e=>console.error('biddingClosed set failed:',e));` immediately followed by the unconditional `toast('⏱ Phase '+cur+' bidding closed. …','ok');`. When the timer is OFF this is the ONLY server-side gate written — the expiry write at 5653 is skipped by `if(timerData.enabled===true)` — and per firestore.rules:141-151 `timerNotExpired()` returns true whenever `enabled` is false, so nothing else denies a bid write.
```

**Failure scenario**

Admin has the countdown timer switched OFF (the exact configuration biddingClosed was added for — see the rules comment at firestore.rules:152-159). They click Close Phase 3 bidding. `_lockEveryWeek()` succeeds; the `biddingClosed:true` write hits a transient network/Firestore error and is swallowed to console.error. The admin sees "⏱ Phase 3 bidding closed" and, because all weeks are locked and the timer is off, `approvalReadiness()` reports ready and renderNextStep says "Bidding is closed and every bid is decided". Server-side, `biddingNotClosed()` (rules:162-165) and `timerNotExpired()` both pass, so bid writes to vacations/schedule remain permitted for the whole approval window — the one hole the flag exists to plug is silently reopened while the UI insists it is shut.

**Verifier notes:** Confirmed on code grounds; the quoted evidence is verbatim accurate and the path is reachable.  1) admin/index.html:5662 `await setDoc(timerRef,{biddingClosed:true},{merge:true}).catch(e=>console.error('biddingClosed set failed:',e));` — the .catch resolves the awaited promise, so control always reaches 5663's unconditional `toast('⏱ Phase '+cur+' bidding closed…','ok')` and `_refreshReadinessBox(

#### M6. Disabling the timer writes lastChange:null, discarding the countdown; re-enabling leaves a timer that can never expire

`admin/index.html:6996` · breaks **I9** · found by *timer*

**Evidence**

```
admin/index.html:6996 `let payload={enabled:nv,lastChange:nv?timerData.lastChange:null};` — the disable path persists `lastChange:null`. Nothing requires it: every consumer checks `enabled` first (admin syncTimer 6847, `_autoCloseOnExpiry` 6929, staff renderCountdown index.html:1475, staff isAuctionClosed index.html:1078, and rules `timerNotExpired()` short-circuits on `enabled == false`). On re-enable, `payload.lastChange = timerData.lastChange` is now null, and the only recovery branch (6997-7002) fires solely when an opening-window rule is configured. Server-side, firestore.rules:148 `get(...).data.get('lastChange', null) == null` makes `timerNotExpired()` TRUE forever, and staff index.html:1078 `if(!timerData.enabled||!timerData.lastChange) return false;` reports the auction OPEN.
```

**Failure scenario**

Phase 1, 47.5h into a 48h window — 30 minutes left, the board is about to close. Admin toggles the timer OFF for a moment (to stop the red countdown while they check something) and immediately back ON, with no opening-window rule configured. The doc becomes `{enabled:true, lastChange:null, durationHours:48}`. The 47.5 hours of elapsed countdown are gone: the phase no longer closes in 30 minutes, and if no further bid arrives it never closes at all (both `isAuctionClosed()` and `timerNotExpired()` return open indefinitely). The staff countdown banner disappears entirely (index.html:1475-1477 hides it when `lastChange` is falsy) so users see no timer while the rules text still promises "Each phase ends when the countdown timer gets to 0." The next bid then arms a fresh full 48h window, extending the phase by ~2 days over what was advertised.

**Verifier notes:** Confirmed on code. admin/index.html:6996 `let payload={enabled:nv,lastChange:nv?timerData.lastChange:null};` writes lastChange:null on disable, and the onSnapshot at admin/index.html:1416 immediately overwrites local timerData, so the subsequent re-enable reads null and re-writes null. The only recovery branch (6997-7002) requires getTimerRules().openingWindow, which is null in DEFAULT_TIMER_RULES

#### M7. Staff PII (KP addresses, Google-login map, admin roster) is readable by any Google account on the internet — the exact gate today's mailQueue fix rejected as too weak

`vacation-kp.github.io/firestore.rules:199` · breaks **I6** · found by *rules-security*

**Evidence**

```
firestore.rules:199 gates the sensitive set with `isSensitiveDoc(docId) ? isVerifiedAccount() : true`, and isVerifiedAccount (firestore.rules:47-49) is only `request.auth != null && request.auth.token.email_verified == true` — any verified Google account anywhere, no relationship to the auction. isSensitiveDoc (firestore.rules:57-59) covers `['loginEmails','emails','adminAccess','emailToUser','signInMisses']`. Today's change reasoned the opposite way for the same data one screen above: firestore.rules:64-68 — "anyone with the (public) Firebase config could poll it from the open internet and harvest exactly the PII that `emails` is gated to protect. Reads now require a REGISTERED user (not merely any verified Google account): outsiders with a Google login are not auction participants" — yet `emails` itself keeps the weaker gate. `isRegisteredUser()` already exists (firestore.rules:35-41) and both sites read these docs only after a real sign-in (index.html:2636-2643 fetches them with the user's own credentials, admin/index.html:1386 defers every listener behind `authReady`), so the stronger gate would not break the anonymous bootstrap.
```

**Failure scenario**

An outsider views source on the public GitHub Pages site, copies the Firebase config, signs in with a throwaway Gmail (verified, not in loginEmails), and runs `getDoc(doc(db,'vacations','emails'))` → all 37 physicians' KP e-mail addresses; `getDoc(doc(db,'vacations','loginEmails'))` → their personal Google addresses keyed by initials; `getDoc(doc(db,'vacations','adminAccess'))` → the exact list of accounts that control the auction, a ready-made phishing target list. The identical request against `vacations/mailQueue` is correctly refused, which is what makes the inconsistency concrete rather than theoretical.

**Verifier notes:** CONFIRMED — the quoted evidence is verbatim accurate and the path is reachable.  Rules verified: firestore.rules:197-199 reads `allow read: if isAdminReadDoc(docId) ? isAdmin() : (isRelayDoc(docId) ? (isRegisteredUser() || isAdmin()) : (isSensitiveDoc(docId) ? isVerifiedAccount() : true));`. isVerifiedAccount() (47-49) is only `request.auth != null && request.auth.token.email_verified == true` — n

#### M8. A bid can be saved with no priority-lock floor, no change-log entry, and no error, if the timer expires (or admin closes bidding) between the schedule write and the bestBids write

`vacation-kp.github.io/index.html:1857` · breaks **I2 (also I8)** · found by *bid-validation*

**Evidence**

```
confirmPriority():
'''
const okSaveBid=await persistScheduleChange(user,wk,newPrio,_prev);
if(okSaveBid){
    await saveBestBid(user,wk,newPrio);          // line 1857 — NOT wrapped in try/catch
    logOwnChange(user,wk,isNewBid?'added':'edited',newPrio);
    ...
    await setDoc(bidTimesRef,{[user]:{[wk]:nowTs2}},{merge:true});   // line 1863
} else { ...undo... }
window.closeModal();                              // line 1870 — last statement, outside the if/else
'''
saveBestBid (line 1740-1748) does `await setDoc(bestBidsRef,{[user]:{[wk]:prio}},{merge:true})`. `bestBids` and `bidTimes` are both in `isBidDoc` in firestore.rules line 126 and are therefore gated by `timerNotExpired() && biddingNotClosed()` (rules line 209) — exactly the same server-side gate as `schedule`. The NP branch has the identical shape (line 1823). There is no `window.addEventListener('unhandledrejection', …)` anywhere in either file (grep returns nothing), and the button is a bare `onclick="confirmPriority()"` (line 451) with no `.catch`.
```

**Failure scenario**

Timer has ~1 s left (or the admin clicks "Close Phase Bidding", which sets `timer.biddingClosed=true` at admin/index.html:5662). Dr. AD presses Submit Bid on Week 47 with bid 1. `persistScheduleChange`'s `setDoc(scheduleRef,…)` is accepted by the server just under the wire and returns true. One round-trip later `saveBestBid`'s write to `bestBids` is rejected by `biddingNotClosed()`/`timerNotExpired()`. The exception propagates out of `confirmPriority`, so: (a) `logOwnChange` never runs → the bid is missing from the Fair Play change log even though it counted; (b) `bidTimes` is never stamped; (c) `window.closeModal()` never runs → the modal sits open with zero feedback; (d) most importantly `bestBids['AD']['2027-11-21']` is never written, so the priority-lock floor for that week does not exist. The admin then uses the newly-added `reopenBidding()` (admin/index.html:7016) or `adminResetTim

**Verifier notes:** CONFIRMED. Every quoted line matches the real files. index.html:1855-1870 is verbatim as claimed: `const okSaveBid=await persistScheduleChange(...)`, then inside the `if(okSaveBid)` block a bare `await saveBestBid(user,wk,newPrio)` (1857) followed by logOwnChange, bidTimes setDoc (1863), and `window.closeModal()` (1870) outside the if/else. saveBestBid (1740-1748) does `await setDoc(bestBidsRef,{[

#### M9. Admin cannot enter or edit a bid on any week where the user has a leftover losing bid from a prior phase — a bid the user themselves can freely place

`vacation-kp.github.io/admin/index.html:6229` · breaks **other (admin/staff parity for "is this bid allowed")** · found by *bid-validation*

**Evidence**

```
`adminAddSelection` line 6229:
'''
if(scheduleData[u]?.[wk]!==undefined){toast(`${u} already has this week`,"err");return;}
'''
The test is on raw schedule presence, not on `isCurrentPhaseBidAdmin`. Losing bids are never purged — `completePhase` snapshots `scheduleData` (admin/index.html:3951) but only clears `worstBids`, `changes` and `changesDecisions`; the live `schedule` doc keeps every prior-phase bid forever.
The edit path is closed too — `renderEditTable` line 6039-6043:
'''
const isHistorical=bidPh<cur;
const controls=isHistorical? `<span …>Phase ${bidPh} — locked</span>` : `<select …>`;
const removeBtn=isHistorical?'':`<button … onclick="adminRemove(…)">Remove</button>`;
'''
and with the default `'current'` phase filter the row is not even listed (`bidMatchesPhaseFilter`, line 1772: `return !isDenied&&bidPh===cur`).
The staff site has no such restriction: `openPriorityModal` gates on `isVisibleBid` (line 1681) / `getPriorPhaseWinners` (1677), both of which are false for a lost prior-phase bid, and `persistScheduleChange` re-tags `bidPhase` to the current phase (line 1610).
```

**Failure scenario**

Phase 1 is high-demand only; ~37 physicians bid on 6 weeks with ~5 FTE capacity each, so most lose. Say Dr. LO bids 5 on 2027-12-19 in Phase 1 and is denied. Phase 2 begins and 2027-12-19 still has availability, so Smart Lock unlocks it. Dr. LO phones the admin (on leave / no laptop) and asks for bid 2 on that week. Admin opens Edit Selections → Add: user LO, week Dec 19 → "LO already has this week" and nothing is written. Switching the phase filter to "All" shows the row as "Phase 1 — locked" with no dropdown and no Remove button. There is no UI path at all for the admin to place, change, or clear that bid — while Dr. LO could have placed it themselves in two clicks.

**Verifier notes:** Confirmed on all four legs.  (1) Stale losing bids persist: completePhase (admin/index.html:3949) deep-copies scheduleData into completedPhases[cur].schedule and never deletes from scheduleRef; adDeny only arrayUnions into deniedRef; _commitBeginPhase clears approvalsRef/deniedRef/worstBidsRef but not scheduleRef. I enumerated every scheduleRef write in the file (3526, 3656, 6189, 6215, 6244, 6494

#### M10. adminBidIssues never checks the high-demand allowed-bid set, so the admin can silently enter a bid on a Christmas/Thanksgiving/Ski week that no bidder could ever place

`vacation-kp.github.io/admin/index.html:6117` · breaks **I3 / I7 parity** · found by *bid-validation*

**Evidence**

```
`adminBidIssues` (6117-6150) runs exactly five checks: Phase-1-high-demand-only week eligibility, locks, NP-by-phase, bid-number uniqueness, cumulative cap. Its only use of `HIGH_DEMAND_WEEKS` is the inverse test at line 6123:
'''
if(p1HighDemandOnly()&&!HIGH_DEMAND_WEEKS.has(wk))
  out.push('Phase 1 is <strong>high-demand only</strong> — this is a standard week…');
'''
There is no check that, when the week IS high-demand, `val` is in the allowed set. `SIM_HIGH_PRIORITY_ALLOWED` (line 3303) exists and is used only by `simGetAllowedBids` (3311); a grep for `HIGH_DEMAND_WEEKS` shows uses at 2650, 3247, 3311, 4192, 6123 only.
The staff site enforces this in two places and it is phase-independent: `openPriorityModal` line 1721 disables the options, and `confirmPriority` line 1804 re-blocks:
'''
if((weekMeta[wk]?.highPriorityOnly) && (val==="NP" || !HIGH_PRIORITY_ALLOWED.has(val))){ showCenterAlert("This high-demand week only accepts bids of 1, 2, 3, 4, \"1/2\", or \"1/2/3\"."); … }
'''
(`HIGH_PRIORITY_ALLOWED` = {"1","2","3","4","1,2","1,2,3"}, index.html:784; the six `highPriorityOnly` weeks in SPECIAL_WEEKS at 775-781 are exactly `HIGH_DEMAND_WEEKS`.)
```

**Failure scenario**

Phase 3. Dr. SC e-mails the admin "put me down for Christmas week, I'll take a 9 since I don't expect to get it." Admin → Edit Selections → Add: SC / 2027-12-19 / 9. `adminBidIssues` returns [] (the week is high-demand so check #1 doesn't fire; NP is on in Phase 3; 9 is unused; SC is under the cap), so the dialog title is the benign '➕ Add Bid' with no warning at all and the bid is written. Every real bidder is hard-blocked from placing 5-10 or NP on that week. Dr. SC's 9 now sits in the tie-break ordering below everyone else's legal bids and shows in the public per-week bid list on the staff board — visible proof of an unequal rule, with no record that the admin was ever told it was an override.

**Verifier notes:** Confirmed on code grounds; the claim survives adversarial re-reading.  1. Defect confirmed. /home/claude/work/vacation-kp.github.io/admin/index.html:6117-6150 `adminBidIssues` runs exactly five checks (Phase-1 high-demand-only week eligibility, global/week lock, NP-by-phase, bid-number uniqueness incl. prior-phase consumption, cumulative cap). Its only `HIGH_DEMAND_WEEKS` use is the inverse test a

#### M11. Schedule admin toasts "Saved login e-mail" after a silently-failed clear of the shared vacations/loginEmails entry

`schedule/admin/index.html:1557` · breaks **I8** · found by *bid-validation*

**Evidence**

```
'''
} else if(kind==='lem'){
    const v=(document.getElementById('ulem_'+u)?.value||'').trim().toLowerCase();
    if(v && !v.includes('@')){ schedToast('Login e-mail must be a valid address','err'); return; }
    try{ if(v) await setDoc(loginEmailsRef,{[u]:v},{merge:true}); else await updateDoc(loginEmailsRef,{[u]:deleteField()}).catch(()=>{}); }   // 1557 — the CLEAR branch swallows its own error inside the try
    catch(e){ return sharedErr(e); }
    await syncEmailToUserFromLogin();
    schedToast('Saved login e-mail · '+u,'ok');                                         // 1560
'''
The set branch is protected by the outer catch; the clear branch is not, because the inner `.catch(()=>{})` consumes the rejection before it can reach it. The same asymmetry is at line 1515 (`saveSchedUser`) and for `kind==='fn'`/`'em'`. `vacations/loginEmails` is in `isAdminOnlyDoc` (firestore.rules:110) and requires `isAdmin()` — the *vacation* admin list — while this page is gated only by `dailysched/adminAccess`; the file's own [M-12] comments confirm a schedule-only admin is an expected role.
```

**Failure scenario**

A schedule-only admin (in `dailysched/adminAccess`, not in `vacations/adminAccess`) is told "Dr. XJ has left, take her out of the auction." They blank the Login E-mail field on the Users row and press Save. The `updateDoc(loginEmailsRef,{XJ:deleteField()})` is denied and swallowed. `syncEmailToUserFromLogin()` then also fails and briefly shows its error toast, which is immediately overwritten in the same toast element by `schedToast('Saved login e-mail · XJ','ok')`. The admin walks away believing the account is closed. Dr. XJ is still in `loginEmails`, so `isRegisteredUser()` still passes and she can still sign in and place bids that consume real FTE.

**Verifier notes:** Confirmed on code grounds; I could not refute it.  DEFECT (real): schedule/admin/index.html:1557 — `try{ if(v) await setDoc(loginEmailsRef,...); else await updateDoc(loginEmailsRef,{[u]:deleteField()}).catch(()=>{}); } catch(e){ return sharedErr(e); }`. The inner `.catch(()=>{})` makes the awaited promise resolve to undefined, so the outer catch is unreachable on the CLEAR branch; control falls th

#### M12. The Daily Schedule admin adds users to the shared vacations/userList with no auction FTE, and grants them login access in the same action

`schedule/admin/index.html:1473` · breaks **other** · found by *fte-capacity*

**Evidence**

```
1465:  if(fteRaw!==''){ const v=parseFloat(fteRaw); ... }   // FTE is OPTIONAL here
1473:    try{ await updateDoc(userListRef,{users:arrayUnion(initials)}); }
1474:    catch(e2){ if(e2&&e2.code==='not-found') await setDoc(userListRef,{users:[initials]},{merge:true}); else throw e2; }
1478:    if(loginEmail){ await setDoc(loginEmailsRef,{[initials]:loginEmail},{merge:true}); await syncEmailToUserFromLogin(); }
1481:    if(fteVal!==null) await mergeFields(schedFteRef,{[initials]:fteVal});
userListRef is `doc(db,"vacations","userList")` (511) — the AUCTION roster — while schedFteRef is `doc(db,"dailysched","fteMap")` (508), explicitly "Never read from or written to the auction's fteMap". So this path writes the auction roster and the auction login allow-list (plus emailToUser, the doc the security rules use to confine bid writes) but can never write vacations/fteMap. The success message even says so: 1489: msg.textContent='Added '+initials+(fteVal===null?' — set their FTE here when ready.':'.') — "here" being the schedule site's own FTE. The auction's only defence is blockedByMissingFte (admin/index.html:4063), which gates Begin Phase but not a phase already running.
```

**Failure scenario**

Mid-Phase-2, an admin adds locum 'RS' on the Daily Schedule admin site, filling in initials, full name and their Google login e-mail but leaving the (optional) FTE blank. vacations/userList gains RS, vacations/loginEmails gains their address, and syncEmailToUserFromLogin rebuilds vacations/emailToUser so the auction security rules will accept RS's bid writes. RS signs into the auction site the same day and bids on three open weeks. getUserFTE('RS') returns the 1.0 guard on both sites, so RS consumes 1.0 FTE per week. If RS is really 0.5 FTE, a week with capacity 3.0 and a tie group of RS + two 1.0 colleagues computes Math.round((0+3.0-3.0)*10)/10 = 0 with the true values (all three win) but Math.round((0+3.0-3.0)*10)/10 with the fallback is also 0 — whereas a group of RS + three 0.8 colleagues sums to 3.4 instead of the true 2.9 and is rejected outright, sending four physicians to DRAW. 

**Verifier notes:** Confirmed on code, and my refutation attempts all failed.  DEFECT CONFIRMED: - /home/claude/work/schedule/admin/index.html:1452 window.addSchedUser requires ONLY initials (`if(!initials){...return;}`); FTE is validated only inside `if(fteRaw!==''){...}` (1465). Its writes hit vacations/userList (userListRef, defined 511), vacations/usernames, vacations/loginEmails (514) and then syncEmailToUserFro

#### M13. Denials are never reconciled after reopenBidding(), so a user who improves their bid stays frozen at LOSE by a stale denial

`vacation-kp.github.io/admin/index.html:7016` · breaks **I1** · found by *decisions*

**Evidence**

```
reopenBidding (7016) writes only {biddingClosed:false, lastChange, durationHours} and tells the admin "Approvals and denials already made are not touched." _reconcileStaleDenials — the function that exists precisely to un-freeze users whose slot re-opened — is not called here, and it is not reachable from any user-side bid write (its only call sites are 6196, 6220, 7872, 7900, all admin bid-edit paths). Once deniedData[wk] contains a user, computeApprovals (1801) drops them from reqs entirely no matter how strong their new bid is: they are not in winners, draws, reviews, or even `losers` (1846 builds allBidders from reqs). adminResetTimer (7037) also clears biddingClosed, giving a second entry point that looks like a pure timer control.
```

**Failure scenario**

Phase 2. Admin closes bidding, then denies C on week W (C bid "7" and naturally lost). The admin then discovers a data problem, clicks "↩ Reopen Phase 2 bidding" and unlocks week W as the dialog instructs. C re-bids W at "2", which under the rules now wins outright. deniedData['W'] still contains C, so computeApprovals excludes C from reqs — C is neither winner nor loser in the admin's projection, while the staff site (which cannot see denials, by design) shows C as a projected WIN for the rest of the phase. countPendingDecisions treats C as already decided, so nothing blocks completion; completePhase snapshots denSnap with C in it (3952/3966) and C's results e-mail says DENIED for a week they won on the published rules. The row is visible in Approvals/Denials as "proj: WIN ✕ DENIED", but nothing flags it and the admin has no reason to revisit a bid they already decided.

**Verifier notes:** Confirmed on code. reopenBidding (admin/index.html:7016) writes only {biddingClosed:false, lastChange, durationHours} and never touches deniedRef; its modal says "Approvals and denials already made are not touched." adminResetTimer (7037) is a second entry point that clears biddingClosed the same way. _reconcileStaleDenials (6061) — which removes a denial when getOutcome(wk,u,computeApprovals(true

#### M14. The readiness box's "Stop bidding & lock all weeks now" button opens a nested confirm that destroys the approve/deny dialog it was launched from

`vacation-kp.github.io/admin/index.html:5648` · breaks **I9** · found by *decisions*

**Evidence**

```
window._fixClosePhaseBidding=async function(cur){ if(!_bkBypass){ _backupThen('closing Phase '+cur+' bidding',...); return; } — and _backupThen (8129) calls openConfirm. openConfirm (7532) is a SINGLE modal: it overwrites #cmTitle/#cmBody and reassigns cmCallback/cmCancelCallback, so the second call annihilates the first dialog. This directly contradicts the comment three lines above the function (5638-5640): "they act immediately (no nested confirm, which would replace the dialog the admin is in) and then refresh the warning box in place." _fixLockAllWeeksInline (5667) has no _backupThen and does behave as documented. The follow-up _refreshReadinessBox() then no-ops on `if(!box) return;` because the box was destroyed with the dialog.
```

**Failure scenario**

Admin opens Approvals/Denials mid-phase and clicks "✓ Approve" on a WIN row. adApprove's dialog renders with readinessWarnHtml() showing "⚠️ Bidding isn't fully closed yet" plus the inline fix button. The admin clicks "⏱ Stop bidding & lock all weeks now". _bkBypass is false (this dialog was not entered via _backupThen), so _backupThen fires and openConfirm replaces the approve dialog with "💾 Back up before closing Phase N bidding?". cmCallback — the approval — is overwritten and discarded. The admin backs up, bidding closes, a success toast appears, and the admin returns to a list where the bid they were approving is still undecided, with no error and no indication that the approval was dropped. The same _bkBypass reset also makes closePhaseBidding (3733) prompt for a backup twice per invocation, defeating the "don't prompt twice in one gesture" comment at 3906.

**Verifier notes:** Independently confirmed on code. (1) openConfirm is a single shared modal: only one definition at admin/index.html:7532 and one #confirmModal/#cmBody at :971/:974; it unconditionally overwrites cmTitle/cmBody and reassigns cmCallback/cmCancelCallback with no "already open" guard. (2) _bkBypass (declared :8127) is false inside an approve dialog — adApprove (:5680) is called directly from the row bu

#### M15. Full restore rolls the EmailJS quota counter (mailStats) backwards, under-reporting e-mails that were really sent

`vacation-kp.github.io/admin/index.html:8029` · breaks **I8** · found by *backup-restore*

**Evidence**

```
The restore map at 8029 includes `mailStats:mailStatsRef`, and the batch does a full overwrite: `batch.set(ref, v||{})` (8055). mailStats is a monotonic side-effect counter of real outbound e-mail — `function trackEmailSent(){ const k=emailCycleKey(); updateDoc(mailStatsRef,{[k]:increment(1)})... }` (4282-4285), read by the quota meter `const n=Number(mailStatsData[emailCycleKey()]||0);` against `const MAIL_QUOTA=2000;` (4441-4449). The code reasons explicitly about exactly this hazard for two sibling documents and excludes them — "mailQueue (cleared — stale entries re-send e-mails), welcomeLog (kept current — an older log re-welcomes users)" (8030-8032) — and the restore dialog itself tells the admin "E-mails already sent cannot be unsent" (8006). mailStats has the identical irreversible-side-effect property and is restored anyway.
```

**Failure scenario**

Backup taken 20 July with mailStats['cy2026-07'] = 1450. Over the next four days the site sends 480 outbid/reminder alerts → 1930 of the 2000 cycle quota. On 24 July the admin full-restores the 20 July backup to undo a bad phase. The batch writes mailStats back to 1450, so the meter shows "1,450 of 2,000 sent this cycle" — 550 of headroom that does not exist. The admin then runs Send Results to all 37 physicians (74 addresses via recipientsFor). EmailJS rejects everything past the real 2000, `adminSendEmail` catches each rejection (4297) and the run reports partial failures, but roughly 15 physicians never receive their Phase results e-mail and the meter still reads under quota, so the admin has no reason to suspect the cap.

**Verifier notes:** CONFIRMED on code. /home/claude/work/vacation-kp.github.io/admin/index.html:8029 really does list `mailStats:mailStatsRef` in _doFullRestore's map, and the loop writes `batch.set(ref, v||{})` (~8055) — a full document overwrite, not a merge. mailStats is genuinely a ledger of externally-realized side effects: `trackEmailSent(){ const k=emailCycleKey(); updateDoc(mailStatsRef,{[k]:increment(1)})...

#### M16. Full restore rewrites the world-readable `changes` document verbatim, re-publishing approve/deny decisions for the live phase

`vacation-kp.github.io/admin/index.html:8029` · breaks **I5** · found by *backup-restore*

**Evidence**

```
The restore map at 8029 includes `changes:changesRef` and writes it unfiltered via `batch.set(ref, v||{})` (8055). Until today's split, adminLog appended approve/deny/revoke entries to `changes`; the split is dated today — `const ref = isDecisionEntry(entry) ? changesDecisionsRef : changesRef;` (6684) — with the comment at 6677-6682 stating that writing decisions to `changes` "streamed the live winner/loser list mid-phase — the exact thing the H-4 read gate on approvals/denials exists to prevent". `changes` is world-readable in the published rules (`allow read: if isAdminReadDoc(docId) ? isAdmin() : (isRelayDoc(docId) ? ... : (isSensitiveDoc(docId) ? isVerifiedAccount() : true));`, firestore.rules:197-199 — `changes` matches none of the three gated sets), and every staff browser holds the RAW document: `onSnapshot(changesRef,snap=>{ changesData=snap.exists()?snap.data():{log:[]}; ...})` (index.html:1118). The staff site only filters decisions at RENDER time (`!isDecisionEntry(e)` at index.html:2073 and 2153) — the entries are still in memory and readable from devtools. Nothing in _doFullRestore strips them.
```

**Failure scenario**

On 24 July (BUILD 199, pre-split) the admin backs up before Complete Phase, while `changes.log` contains ~110 entries of `{action:'approve'|'deny', user:'AD', weekKey:'2027-03-14'}` for the still-undecided Phase 2. On 26 July she full-restores that file to undo a mistake, putting Phase 2 back into approvals-in-progress. The batch writes the pre-split `changes.log` — decisions included — back to the world-readable document. Every signed-in physician's open tab receives it within a second; the rendered log hides the entries but `changesData.log` in the console lists exactly who was approved and who was denied for every high-demand week, before any results e-mail goes out.

**Verifier notes:** Confirmed on all four links.  (1) admin/index.html:8029 maps `changes:changesRef` and the loop at 8046-8055 writes it verbatim — `batch.set(ref, v||{})` — with only two exceptions (string FETCH-FAILED placeholders are skipped; `timer.lastChange` is rebased). No filtering of decision entries anywhere in `_doFullRestore`, and `loadRestoreFiles` (7951-7968) only JSON.parses and timestamp-validates, s

#### M17. renderRestoreList fabricates a bid count for a backup whose schedule failed to fetch, hiding that the file is unusable

`vacation-kp.github.io/admin/index.html:7950` · breaks **I8** · found by *backup-restore*

**Evidence**

```
The file gate accepts a FETCH-FAILED schedule: `if(!d._exportedAt||d.schedule===undefined) throw new Error('not an auction backup file');` (7957) — a string is not undefined, so it passes. `function _bidCount(sch){ let users=0,weeks=0; for(const u in (sch||{})){ const n=Object.keys(sch[u]||{}).length; if(n>0){users++;weeks+=n;} } return {users,weeks}; }` (7950) is then called as `bc=_bidCount(d.schedule)` (7975) on that string: `for...in` over a string yields character indices, `sch[u]` is a single character, and `Object.keys('F')` is `['0']` → length 1, so every character counts as one user with one bid. The card at 7991 renders `${bc.weeks} bid${...} across ${bc.users} user${...}` with no unreadable marker anywhere. The same string also pollutes the single-user picker: `const roster=[...new Set([...((d.userList||{}).users||[]),...Object.keys(d.schedule||{}),...names])].sort();` (8070) adds "0","1","2",… as selectable users.
```

**Failure scenario**

A backup whose schedule read failed stores `"schedule": "FETCH-FAILED: unavailable"` (24 characters). Loading it into the restore console renders "Taken 24 Jul 2026, 4:12 PM · Phase 2 · 24 bids across 24 users · timer 9h 14m left" — a plausible-looking card with a green-bordered 🛟 Full Restore button. The admin, seeing 24 bids, picks this file over an older good one and runs the full restore; per the finding above it commits everything EXCEPT the schedule and only then says one document was unreadable. The 👤 Restore One User dropdown for the same file lists "0","1","2"…"23" alongside the real initials.

**Verifier notes:** CONFIRMED on all three legs.  PRODUCING PATH IS REAL: exportBackup (/home/claude/work/vacation-kp.github.io/admin/index.html ~8150) does `catch(e){ out[name]='FETCH-FAILED: '+(e.code||e.message); fails++; }` and then unconditionally blobs + a.click()-downloads the file no matter what `fails` is. `_exportedAt` is set before the fetch loop, so the file always carries a parseable timestamp. The only 

#### M18. Staff and admin recipientsFor disagree on address case, defeating the sentTo dedupe and re-sending already-delivered alerts

`vacation-kp.github.io/index.html:1306` · breaks **I7** · found by *email*

**Evidence**

```
Staff lower-cases every recipient it emits:

'''
1306:  const add=v=>{ if(!v) return; const s=String(v).trim().toLowerCase(); if(!s||s==='__skip__'||seen.has(s)) return; seen.add(s); out.push(s); };
'''

Admin de-dupes on a lower-cased key but emits the address VERBATIM:

'''
1179:  const add=(e)=>{ ... const v=e.trim(); ... const k=v.toLowerCase(); if(seen.has(k)) return; seen.add(k); out.push(v); };
'''

Both relays then dedupe against `sentTo` with a case-SENSITIVE `Array.includes`:

'''
index.html:1346:  { const done=Array.isArray(e.sentTo)?e.sentTo:[]; recips=recips.filter(to=>!done.includes(to)); }
admin/index.html:1515: { const done=Array.isArray(e.sentTo)?e.sentTo:[]; recips=recips.filter(to=>!done.includes(to)); }
'''

and record with the same string they sent to (`arrayUnion(to)` index.html:1370 / `arrayUnion(email)` admin/index.html:1535). Login e-mails are normalised on save (admin/index.html:6302 `.trim().toLowerCase()`, 7233, schedule/admin 1557/1500), but KP secondary addresses are stored VERBATIM everywhere: staff `saveEmail` (index.html:2966 `setDoc(emailsRef,{[user]:val})` where `val` is only `.trim()`ed), admin `adminSaveEmail` (admin/index.html:6275), admin add-
```

**Failure scenario**

MK's KP address is saved from a phone (autocapitalise on) as `MKahn@kp.org`; his login e-mail is `mk@kp.org`. AD places a bid that flips MK's projection. AD's tab queues entry q, sends to both addresses, and records `sentTo:['mk@kp.org','mkahn@kp.org']` (lower-cased by staff recipientsFor). The terminal delete on that path is fire-and-forget with no retry — `updateDoc(mailQueueRef,{[qid]:deleteField()}).catch(()=>{})` (index.html:2537) — and AD closes the tab before it flushes. 30 s later the admin page sweeps: `recipientsFor('MK')` returns `['mk@kp.org','MKahn@kp.org']`; `done.includes('MKahn@kp.org')` is false, so the filter keeps it, the entry is claimed and MK receives a second identical outbid e-mail. The quota meter is double-charged. The reverse ordering (admin relays first, a staff tab retries) fails the same way.

**Verifier notes:** Confirmed on the real code. index.html:1306 pushes the lower-cased string (`out.push(s)`), while admin/index.html:1179 dedupes on `k=v.toLowerCase()` but pushes the trim-only `v` — the "De-duped, lower-cased" comment above it is false. Both relays filter `sentTo` with case-sensitive `Array.includes` (index:1346, admin:1515) and record the exact string sent (index:1370, admin:1535). KP secondary ad

#### M19. flushMailQueue's 5-second minimum age races the bidder's own in-flight send, and the badge invites the admin to press it during exactly that window

`vacation-kp.github.io/admin/index.html:1552` · breaks **I8** · found by *email*

**Evidence**

```
The default sweep uses a 30 s floor whose stated purpose is to let the bidder's browser finish its inline send first (`_mqEligible`, admin/index.html:1464-1470: 'the 30s that lets a real bidder's own browser send its alert inline first'). The manual flush deliberately drops it to 5 s:

'''
1552:  const sent=await processMailQueue(5000); // 5s guard against racing an in-flight bidder send
'''

The originating tab never participates in the claim protocol — `sendEmailNotifications` writes the entry and sends immediately with no claim (index.html:2533-2537) — so the claim protocol offers no protection here; only the `sentTo` array does, and it is written only AFTER each send returns. Meanwhile `updateMailQueueBadge` flashes both rows red for ANY non-empty queue, including an entry two seconds old that is about to be deleted normally:

'''
1457:  const pending=n>0;
1459:  ['mqRowTop','mqRow'].forEach(id=>{ const r=document.getElementById(id); if(r) r.classList.toggle('mq-pending',pending); });
'''

(`.mq-pending` is an infinite red flash animation, admin/index.html:241.)
```

**Failure scenario**

MK has two addresses on file. AD bids at T=0 on a slow hospital wifi; entry q is written and AD's tab starts its inline loop — first `emailjs.send` returns at T+4 s (sentTo=['mk@kp.org']), the second call is still in flight. The admin, seeing the red flashing 'Outbid alerts pending: 1' row, clicks Flush at T+5 s. `processMailQueue(5000)` finds q eligible, its snapshot shows sentTo=['mk@kp.org'] only, so it claims, waits 2500 ms, re-verifies, and at T+8 s sends to MK's KP address — which AD's tab delivers at T+9 s. MK receives two copies of the same outbid alert and the quota is double-charged.

**Verifier notes:** Confirmed on code. All quoted evidence is verbatim and accurate. (1) admin/index.html:1552 `processMailQueue(5000)` really does drop the age floor to 5s on the manual flush path, while the automatic sweep (1474-1475) uses 30000 and `_mqEligible`'s own comment (1466-1468) states that 30s exists specifically to "let a real bidder's own browser send its alert inline first". A bidder entry carries no 

#### M20. quickContinue() enters the board as whoever localStorage names, without checking the live Google session's identity

`vacation-kp.github.io/index.html:2740` · breaks **I6** · found by *auth-roster*

**Evidence**

```
`window.quickContinue=function(){ if(!_rememberedName) return; ... const cu=auth.currentUser; if(cu && !cu.isAnonymous && cu.email){ selectedSignInName=_rememberedName; completeSignIn(); } else { ... userGoogleSignIn(); } }` (index.html:2736-2752) — the only test is that SOME non-anonymous session exists; `cu.email` is never resolved and never compared to `_rememberedName`. `_rememberedName` comes straight from localStorage: `if(names.includes(remembered)){ _rememberedName=remembered; w.style.display="block"; ... }` (index.html:2701-2706), and initSigninScreen() re-runs on every refreshLoginUsers() call (index.html:2557-2559), which fires from the usernames listener (1247) and the userList listener (1401). signinShowPicker() clears `selectedSignInName=""` but leaves BOTH `_rememberedName` and REMEMBER_KEY intact (index.html:2711-2724). The sibling schedule site fixes exactly this: `const initials=resolveByEmail(cu.email); if(initials && initials===_schedRemembered){ finishSignIn(initials); } else { signShowPicker(); }` with the comment "[M-15] The live Google session is the ONLY identity source ... a stale localStorage('schedUser') plus any other registered Google login could other
```

**Failure scenario**

Shared department workstation. Dr. AF signs in with Remember me checked → localStorage vk_lastUser='AF' and a browserLocalPersistence Google session. Later, Dr. B (a resident, or a physician using a personal gmail not on the roster) opens the site and signs in with Google. resolveByEmail returns null, so the handler shows 'This Google account isn't registered' and RETURNS at index.html:2661 — REMEMBER_KEY is still 'AF' and B's non-anonymous session is now the live, persisted one. B reloads. At load, refreshLoginUsers()→initSigninScreen() reads localStorage, sets _rememberedName='AF' and renders the 'Continue as AF' hero as the page's primary CTA, while the auth handler is still blocked on two sequential getDoc round-trips (index.html:2639-2640) before it can hide the hero. B clicks Continue: auth.currentUser is non-anonymous with an e-mail, so selectedSignInName='AF', completeSignIn() ru

**Verifier notes:** CONFIRMED, with severity reduced from high to medium.  Defect confirmed verbatim. index.html:2736-2752 — quickContinue() tests only `cu && !cu.isAnonymous && cu.email`, then does `selectedSignInName=_rememberedName; completeSignIn();`. `cu.email` is never resolved. grep shows resolveByEmail() has exactly ONE call site in the whole file (line 2648, in the onAuthStateChanged handler); completeSignIn

#### M21. Countdown banner and Timer Rules text ignore timerData.biddingClosed — with the timer off, users are told bidding is still open after the admin has closed it

`vacation-kp.github.io/index.html:1475` · breaks **I7** · found by *staff-ui*

**Evidence**

```
`isAuctionClosed()` was taught the flag today (index.html:1077 `if(timerData.biddingClosed===true) return true;`) but the two functions that TELL the user about closure were not. index.html:1475-1477 (renderCountdown): `if(!timerData.enabled||!timerData.lastChange){ banner.classList.remove("visible","urgent","warning"); return; }` — returns before the `remaining<=0` branch that renders "Bidding closed" and calls `showAuctionClosedModal()` (index.html:1482-1489). index.html:1055-1057 (renderTimerRulesInfo): `if(...timerData.enabled!==true&&biddingOpen()){ el.innerHTML='...the bidding countdown timer is currently <strong>off</strong> — there is no countdown, and bidding stays open until the admin closes the phase.'; return; }`. Neither consults `timerData.biddingClosed`. Timer-off-plus-closed is a first-class supported state: admin/index.html:5647-5662 `_fixClosePhaseBidding` only expires the countdown `if(timerData.enabled===true)` and otherwise relies solely on `await setDoc(timerRef,{biddingClosed:true},{merge:true})` — that is the entire point of the AUDIT #2 flag, per firestore.rules:152-165.
```

**Failure scenario**

Admin runs Phase 1 with the countdown disabled (admin/index.html:6983 toggleTimerEnabled → `{enabled:false,lastChange:null}`), which the staff Rules panel correctly describes as "timer is off". Admin then clicks "⏱ Close Phase 1 bidding". `_fixClosePhaseBidding` skips the timer-expiry write (timer is off) and writes only `biddingClosed:true`. On all 37 staff pages: `isAuctionClosed()` now returns true, so `renderCalendar` drops every ✎/✕ button and every week click pops "The auction has closed" — but `renderCountdown` hits the `!timerData.enabled` early return, so the banner stays hidden, the ⛔ "Auction Closed" modal never fires, and the Rules → Timer Rules panel still reads "bidding stays open until the admin closes the phase." A user who expands the rules is affirmatively told bidding is open, sees no closure notice anywhere, and only discovers otherwise by clicking a week. The admin's

**Verifier notes:** Confirmed on code grounds; every cited line matches the real files.  DEFECT CONFIRMED: - `grep -n "biddingClosed"` over the whole staff file /home/claude/work/vacation-kp.github.io/index.html returns exactly ONE hit: line 1077 inside `isAuctionClosed()` (`if(timerData.biddingClosed===true) return true;`). No other staff-side code consults the flag. - `renderCountdown` (index.html:1476-1478): `if(!

#### M22. _fpWasWinning ignores prior-phase winners' consumed FTE — every cancel on a carried-over week is flagged "WINNING position" in phases 2-4

`vacation-kp.github.io/admin/index.html:2318` · breaks **other** · found by *fairplay-reports*

**Evidence**

```
Line 2317-2318: `for(const uu in wkMap){ ... if(pScore(o.val)<my) used+=getUserFTE(uu); }` / `return used+getUserFTE(u)<=getSlots(wk)+0.001;`  `used` is built ONLY from `wkMap`, which _fpAnalyzePhase populates exclusively from this phase's change-log events (line 2320-2366). It never adds `getPriorPhaseFteWon(wk)`. The real engine does: computeApprovals seeds `let fteWon=priorFte;` (admin/index.html:1811, with `const priorFte=getPriorPhaseFteWon(wk);` at 1795) and `getSlots(wk)` returns the FULL week capacity, not the remaining capacity. So _fpWasWinning measures every bid against a week that it believes is completely empty of prior winners.
```

**Failure scenario**

Week 2027-07-05, admin capacity 4.0. Phase 1 completes with three prior winners holding 3.0 FTE (remaining 1.0). Phase 2 opens; A (FTE 1.0) bids 2 and B (FTE 1.0) bids 5. computeApprovals: fteWon starts at 3.0, A fits (4.0), B does not (5.0>4.0) → B is LOSING, dead last, no chance. B cancels their bid 5. _fpWasWinning(wkMap,'B',wk,5): my=pScore(5)=6; only A is strictly stronger so used=1.0; 1.0+1.0=2.0 <= 4.0+0.001 → true. The Fair Play Report prints for physician B: "canceled a bid in a WINNING position (5)" and counts it as an incident, and renderBadBehavior's banner counts B among "users flagged". B was never winning. This misfires for essentially every non-NP cancel on any week that carries prior-phase winners, i.e. across the whole of phases 2, 3 and 4 — the admin is handed a fairness report naming physicians who did nothing.

**Verifier notes:** Confirmed on code. (1) The defect is real: _fpWasWinning (admin/index.html:2314-2319) computes `used` solely by walking `wkMap` and adding getUserFTE for strictly-stronger current-phase bidders, then compares `used+getUserFTE(u) <= getSlots(wk)+0.001`. getSlots (1683-1693) returns the FULL admin-entered week capacity with no deduction for prior-phase winners. The real engine, computeApprovals, see

#### M23. _fpWasWinning treats a DRAW participant as "winning", contradicting its own stated rule

`vacation-kp.github.io/admin/index.html:2317` · breaks **I7** · found by *fairplay-reports*

**Evidence**

```
Comment at line 2312 states "(ties/draws don't count as winning)", but line 2317 only accumulates FTE for users bidding STRICTLY stronger: `if(pScore(o.val)<my) used+=getUserFTE(uu);`. Equal-score peers are skipped entirely. computeApprovals (line 1815-1827) instead groups equal scores and applies a whole-group fit test: `const gf=group.reduce((s,r)=>s+r.fte,0); if(Math.round((fteWon+gf-cap)*10)/10<=0){ winners } else { ... group.forEach(r=>draws.add(r.user)) }`. A tied group that fails the group test is a DRAW, not a win.
```

**Failure scenario**

Week 2027-12-19, capacity 1.0, Phase 1 (no prior winners). Physicians C and D both bid 3 (score 4), both FTE 1.0. computeApprovals: the group of {C,D} has gf=2.0, 0+2.0-1.0=1.0 > 0 → settled, group.length>1, each individually fits within threshold → C and D are both DRAW. C then withdraws. _fpWasWinning(wkMap,'C',wk,3): D has an equal score so is skipped, used=0; 0+1.0 <= 1.0+0.001 → true. The Fair Play Report records "C canceled a bid in a WINNING position (3)" — C was in a two-way draw with a 50% chance, not a winning position, and the code's own comment says draws must not count.

**Verifier notes:** CONFIRMED. I re-read the cited function and everything it calls.  1) The quoted evidence is verbatim accurate. /home/claude/work/vacation-kp.github.io/admin/index.html:2312 — "// still fits in the week's slots (ties/draws don't count as winning). Uses current" — and 2317: `for(const uu in wkMap){ if(uu===u) continue; const o=wkMap[uu]; if(!o||o.val===undefined||o.val==='NP') continue; if(pScore(o.

#### M24. Struggling-user "can improve" test never considers the 1,2 and 1,2,3 combo bids, flagging users 🔴 stuck when they can still win outright

`vacation-kp.github.io/admin/index.html:2480` · breaks **other** · found by *fairplay-reports*

**Evidence**

```
Line 2479-2480: `const pool=availableNumbersFor(u);` (returns single integers 1..10, line 2451) and `const cand=(wk)=>{const hd=...HIGH_DEMAND_WEEKS.has(wk);return pool.filter(n=>!hd||n<=4);};`. The improvability tests at 2497 (`cand(wk).some(n=>pScore(n)<=bar)`) and 2506 (`cand(wk).some(n=>pScore(n)<ownSc)`) therefore only ever evaluate single numbers, whose best possible score is pScore(1)=2 (line 1656). But the bidding engine accepts combos: staff index.html:784 `const HIGH_PRIORITY_ALLOWED=new Set(["1","2","3","4","1,2","1,2,3"]);` and index.html:1723-1726 enables the "1,2"/"1,2,3" options whenever their component numbers are unused. pScore gives those scores 1 and 0 — strictly stronger than any single number.
```

**Failure scenario**

High-demand week 2027-12-19 in Phase 1. The single winner V (FTE 1.0, cap 1.0) bid "1,2" → pScore=1, so `bar` computed at 2489-2493 is 1. Physician U has bid 3 on that week (losing) and still holds 1, 2 and 4 free, so availableNumbersFor(U) returns [1,2,4,5,...]; cand filters to [1,2,4] with scores 2, 3, 5. None is <= 1, no other losing/draw week helps, so canImprove stays false and renderStruggling (line 2529) lists U under "🔴 Cannot improve". In reality U can re-bid "1,2" (score 1) to force a draw with V, or — since re-bidding this week frees the 3 — "1,2,3" (score 0) to take the week outright. The admin is told a physician is stuck when they hold the strongest bid in the auction.

**Verifier notes:** Confirmed on the real code; every quoted line matches.  1) The pool really is singles-only. admin/index.html:2451 `return [1,2,3,4,5,6,7,8,9,10].filter(x=>!used.has(x));` and 2480 `const cand=(wk)=>{...return pool.filter(n=>!hd||n<=4);}` — cand can only ever yield integers, never the combo tokens.  2) Combos strictly dominate any single. pScore (admin:1656): `if(s==='1,2,3')return 0; if(s==='1,2')

#### M25. Full restore of any pre-split backup re-publishes admin approve/deny decisions into the world-readable vacations/changes doc

`vacation-kp.github.io/admin/index.html:8055` · breaks **I5** · found by *fairplay-reports*

**Evidence**

```
_doFullRestore's map includes `changes:changesRef` (line 8029) and the batch writes each document back verbatim: line 8055 `batch.set(ref, v||{});`. There is no filtering of decision entries out of `d.changes`. Before today's split, adminLog appended every approve/deny/revoke to changesRef — firestore.rules:84-89 says so explicitly ("the admin's approve/deny/revoke entries used to be appended to the world-readable `changes` log"). `changes` is not in isAdminReadDoc (rules line 91) or isSensitiveDoc (line 58), so rules line 197-199 leaves it `allow read: if true`, and the staff page holds it live in `changesData` (index.html:1118).
```

**Failure scenario**

Admin takes a backup on 24 Jul (build 199) partway through Phase 2 approvals; vacations/changes in that file contains entries like {user:'AB', weekKey:'2027-12-19', action:'deny', type:'admin-deny', actor:'admin'} for every decision made so far. On 26 Jul, mid-Phase-3 bidding, something goes wrong and the admin runs 🛟 Full Restore from that file (the UI calls a backup "the auction's only undo" and offers one before every Close/Complete/Begin Phase). batch.set writes the pre-split log straight back into vacations/changes. Every signed-in physician's browser now holds the complete Phase-2 winner/loser list in `changesData.log`, readable from devtools in one line — exactly the leak firestore.rules:84-89 says the split closed. The admin UI filters decision entries out of the change log (isDecisionEntry, line 2166), so nothing on screen reveals that the leak has been reinstated.

**Verifier notes:** I tried to refute this on code grounds and could not. Every link in the chain checks out in the real files.  1) No filtering in the restore path. /home/claude/work/vacation-kp.github.io/admin/index.html:8029 `const map={... changes:changesRef, changesDecisions:changesDecisionsRef, ...}` and the loop at 8046-8056 is the whole transform: `let v=d[k]; if(typeof v==='string'){bad.push(k);continue;}` (

#### M26. Simulator bid writes never clear stale approvals/denials for the (user, week) they write — every other admin bid-write path does

`vacation-kp.github.io/admin/index.html:3526` · breaks **other (I4/I7 fairness + silent wrong allocation)** · found by *simulator*

**Evidence**

```
`_runSimulationNow`'s write block (admin/index.html:3521-3610) writes schedule, bidPhase, bidTimes, worstBids and the change log:

'''
    for(const user of Object.keys(newSchedule)){
      const dotted={}; for(const wk of Object.keys(newSchedule[user])) dotted[user+'.'+wk]=newSchedule[user][wk];
      await mergeFields(scheduleRef, dotted);
    }
'''

It never touches `approvalsRef`/`deniedRef`. Every OTHER admin path that creates or changes a bid does:

`adminAddSelection` (admin/index.html:6246-6249):
'''
      // Clear any stale approval/denial for this user+week so the freshly added bid
      // can actually compete instead of being frozen by a leftover LOSE.
      await updateDoc(approvalsRef,{[wk]:arrayRemove(u)}).catch(()=>{});
      await updateDoc(deniedRef,{[wk]:arrayRemove(u)}).catch(()=>{});
'''
`_adminChangePriorityRaw` (admin/index.html:6193-6194) does the same, `adminRemove` (admin/index.html:6218-6219) too.

Why that matters: `computeApprovals` (admin/index.html:1801) drops a denied bidder from the competition entirely — `if(!ignoreAdmin&&deniedHereChk) continue;` — and (admin/index.html:1840) force-promotes anyone in `approvalsData[wk]` into `winners` with their F
```

**Failure scenario**

Phase 2 is open. Admin arms the simulator, clicks Run Simulation, then Auto-Approve/Deny Results — `_execSimulationApprovals` writes real entries into vacations/approvals and vacations/denials (e.g. MK denied on 2027-06-06, GV approved on 2027-06-06). Admin decides the board was too thin, uses Controls → "Remove All Bids and Priority Locks" to wipe the fake bids (that action deliberately leaves approvals/denials in place), and runs the simulator again. The new run gives MK a bid of 1 on 2027-06-06 and GV a bid of 9 on the same week. Because the simulator does not clear the leftover decisions, `computeApprovals` skips MK entirely (stale denial) so MK's 1 can never win and MK is not even listed as a competitor, while GV's 9 is force-added to `winners` and consumes 1.0 FTE ahead of every stronger bid. The admin sees a projection and a winner list that no bid ordering could produce, with not

**Verifier notes:** Verified against the real code; every load-bearing element of the claim holds.  1. `_runSimulationNow` (admin/index.html:3415-3610) writes scheduleRef, bidPhaseRef, bidTimesRef, worstBidsRef, changesRef, timerRef and alerts — grep confirms zero references to `approvalsRef`/`deniedRef` anywhere in that function.  2. Every sibling admin bid-write path DOES clear both: `_adminChangePriorityRaw` (6193

#### M27. New admin-bid guard omits the high-demand allowed-number rule, so an admin edit can win a high-demand week with a throwaway bid number

`vacation-kp.github.io/admin/index.html:6123` · breaks **other** · found by *todays-fixes*

**Evidence**

```
adminBidIssues() (admin/index.html:6117-6150) — written today to flag "things no bidder could do" — checks exactly five rules: (1) `if(p1HighDemandOnly()&&!HIGH_DEMAND_WEEKS.has(wk))`, (2) locks, (3) `if(isNP&&!npAllowedForPhase(cur))`, (4) bid-number uniqueness, (5) cumulative cap. There is NO check that a high-demand week only accepts 1,2,3,4,"1,2","1,2,3". Every other component enforces that rule: the staff modal disables the options (index.html:1721 `if(isHighPrioOnly&&v!=="NP"&&!HIGH_PRIORITY_ALLOWED.has(v)){opt.disabled=true;}`), confirmPriority re-checks it at submit (index.html:1804 `if((weekMeta[wk]?.highPriorityOnly) && (val==="NP" || !HIGH_PRIORITY_ALLOWED.has(val)))`), and even the simulator honours it (admin/index.html:3311 `if(HIGH_DEMAND_WEEKS.has(wk)) return SIM_HIGH_PRIORITY_ALLOWED;` with SIM_HIGH_PRIORITY_ALLOWED=["1","2","3","4","1,2","1,2,3"] at 3303). Both admin write paths that consume adminBidIssues — adminChangePriority (6172) and adminAddSelection (6233) — therefore save such a bid with no warning at all. The rule applies in EVERY phase, so check (1) does not cover it from Phase 2 onward.
```

**Failure scenario**

Phase 2. Christmas week 2027-12-19 has capacity 5.0. Bidders A,B,C,D (FTE 1.0 each) hold bids 1,2,3,4 — the only numbers the site allows there — total 4.0 of 5.0. The admin opens Edit Selections and sets E (FTE 1.0) to "9" on 2027-12-19. adminBidIssues returns [] (not Phase 1, week unlocked, not NP, 9 unused by E, edit not new), so _adminChangePriorityRaw writes it with the ordinary "✏️ E updated" toast and no warning. computeApprovals puts E in the last score group: round((4.0+1.0-5.0)*10)/10 <= 0, so E WINS Christmas having spent bid number 9, while every legitimate bidder had to burn one of their four strongest numbers to compete there. E keeps 1-4 for other weeks.

**Verifier notes:** Confirmed on code, not comments.  1) The omission is real. adminBidIssues (admin/index.html:6117-6150) contains exactly five checks — p1HighDemandOnly/standard week, global+per-week lock, NP-per-phase, bid-number uniqueness, cumulative cap (isNew only). No allowed-number check for high-demand weeks. Grep of the whole admin file for HIGH_PRIORITY yields only the simulator's SIM_HIGH_PRIORITY_ALLOWE

#### M28. Reset Timer clears the server-side bidding-closed flag and reports "bidding is open again" while all 52 weeks are still locked

`vacation-kp.github.io/admin/index.html:7051` · breaks **other** · found by *todays-fixes*

**Evidence**

```
adminResetTimer's onConfirm (admin/index.html:7051) now writes `{lastChange:_n,biddingClosed:false,durationHours:...}` and toasts "↺ Timer reset — bidding is open again". It never inspects or changes locksData. The only supported way in to that state is closePhaseBidding → _fixClosePhaseBidding, which calls `await _lockEveryWeek()` (5649, dotted `weeks.<wk>=true` for all mondays) before setting the flag. The sibling function added in the same batch, reopenBidding (7016-7036), does check: `const lockedCount=mondays.filter(d=>!!locksData?.weeks?.[dateKey(d)]).length;` and renders "⚠️ N of 52 weeks are still locked — users can only bid on the unlocked ones." adminResetTimer has no equivalent, yet its new toast makes the stronger claim.
```

**Failure scenario**

Admin clicks "⏱ Close Phase 2 bidding" (all 52 weeks locked, timer expired, biddingClosed=true), then decides to give people another day and clicks "↺ Reset Timer" on the Timer card. Toast: "↺ Timer reset — bidding is open again". Server-side the gate is genuinely open and the staff board goes live (isAuctionClosed() returns false — index.html:1077-1079), with a running countdown. But every week is still locked, so every user who clicks any week gets "This week has been locked by the admin — no changes allowed." (index.html:1576/1674/1794). The admin believes bidding reopened and waits; no bid can be placed on any of the 52 weeks.

**Verifier notes:** Confirmed on code. admin/index.html:7037-7052 adminResetTimer writes {lastChange, biddingClosed:false, durationHours} and toasts "↺ Timer reset — bidding is open again" with zero reference to locksData; the sibling reopenBidding (7016-7036) added in the same batch does check (`const lockedCount=mondays.filter(d=>!!locksData?.weeks?.[dateKey(d)]).length;` → "⚠️ N of 52 weeks are still locked"). The

### LOW (14)

#### L1. The bid-phase tag write is fire-and-forget, and losing it silently removes a re-bid from the auction with no admin path to fix it

`vacation-kp.github.io/index.html:1610` · breaks **I3** · found by *engine-core*

**Evidence**

```
persistScheduleChange awaits the bid but not its phase tag: `await setDoc(scheduleRef, {[user]: {[wk]: bid}}, {merge:true});` then `setDoc(bidPhaseRef, {[user]: {[wk]: _ph}}, {merge:true}).catch(()=>{});` (index.html:1608-1610). No IndexedDB persistence is enabled (`const db = getFirestore(app);`, index.html:609), so an unflushed mutation is lost with the tab.

With no tag, both engines fall back to the completed-phase snapshots, which store the FULL merged schedule: `for(const n of phNums){ const snapSched=cp[n]?.schedule; if(snapSched&&snapSched[u]&&snapSched[u][wk]!==undefined) return n; }` (admin/index.html:1729-1732; index.html:1925). A phase-2 re-bid on a week the user also bid in phase 1 therefore resolves to phase 1 and is dropped by `if(getUserBidPhaseAdmin(u,wk)<Number(phasesData.currentPhase||1)) continue;` (admin/index.html:1806).

The admin has no repair path: completePhase skips it (`if(!isCurrentPhaseBidAdmin(u,wk)) continue; // historical bid, skip`, 3919), the Edit table renders it as `Phase ${bidPh} — locked` with no <select> and no Remove button (6039-6042), and adminAddSelection refuses (`if(scheduleData[u]?.[wk]!==undefined){toast(u+" already has this week","er
```

**Failure scenario**

Phase 1: user MK bids 3 on the 2027-11-21 Thanksgiving week and loses; phase 1 completes, so completedPhases['1'].schedule.MK['2027-11-21'] = 3. Phase 2 opens and MK re-bids 3 on the same week. `setDoc(scheduleRef, ...)` resolves against the server; MK closes the tab in the following moment, so the bidPhase mutation never leaves the browser.

Result: bidPhase has no entry, so getUserBidPhase/getUserBidPhaseAdmin both return 1. computeApprovals excludes the bid on both sites, so MK never competes for that week in phase 2 and the week's projection is computed as if MK had not bid. completePhase's pending loop skips the bid, so the admin is never prompted to approve or deny it and the phase completes cleanly. MK's board shows the week as un-bid, and myCountedWeeks/bidPoolInfo (index.html:1937, 1215-1219) also exclude it, so number 3 is offered again and MK's cumulative-cap count (bidLimitSt

**Verifier notes:** CONFIRMED, with severity reduced from medium to low.  Every quoted line is accurate. index.html:1608-1610 really does `await setDoc(scheduleRef, {[user]:{[wk]:bid}}, {merge:true});` and then fires the phase tag un-awaited with a swallowed rejection: `setDoc(bidPhaseRef, {[user]:{[wk]:_ph}}, {merge:true}).catch(()=>{});`. index.html:609 is `const db = getFirestore(app);` and a repo-wide grep for Pe

#### L2. Completed-phase approvals/denials become world-readable at Complete Phase, before results e-mails are sent

`vacation-kp.github.io/admin/index.html:3985` · breaks **I5** · found by *engine-parity*

**Evidence**

```
completePhase() writes the decision snapshot into the phases doc while currentPhase is still the phase just decided (admin/index.html:3985-3999):
  await setDoc(phasesRef,{
    currentPhase:cur,
    completedPhases:{...(phasesData.completedPhases||{}),[cur]:{ completedAt:Date.now(), approvals:apSnap, denials:denSnap, schedule:snap, ... projections:serializeProjections() }}
  },{merge:true});
firestore.rules:197 makes that document world-readable (`allow read: if isAdminReadDoc(docId) ? isAdmin() : ...` and isAdminReadDoc is only ['approvals','denials','changesDecisions'] — firestore.rules:90-92; the comment at firestore.rules:80-83 explicitly keeps `phases` public). Every staff browser already holds it: index.html:1254 `onSnapshot(phasesRef, snap=>{ phasesData=snap.exists()?snap.data():... })`. The staff UI hides it — getPriorPhaseWinners skips `Number(phNum)>=cur` (index.html:884) and openPhaseHistory filters `Number(k)<curPh` (index.html:1982) — so this is UI-only concealment of data already delivered to the client, exactly the situation the H-4 gate on approvals/denials was added to end. The admin's own dialog asserts the opposite (admin/index.html:4237): 'Users have not been no
```

**Failure scenario**

Admin finishes deciding Phase 1 and clicks Complete Phase, then goes to lunch before clicking '📮 Send Phase Results'. During that window any signed-in bidder opens devtools on the staff site and reads the already-loaded phasesData (or issues a plain getDoc on vacations/phases, permitted by rule 197): completedPhases['1'].approvals and .denials give the complete winner and loser list for every one of the 52 weeks — including every colleague's Christmas/Thanksgiving outcome — before a single results e-mail has gone out. The staff board keeps showing pre-decision projections, so nothing on screen reveals that the results are already sitting in the browser.

**Verifier notes:** Every cited line checks out in the real files, and the path is trivially reachable.  WRITE: admin/index.html ~3984 `await setDoc(phasesRef,{currentPhase:cur, completedPhases:{...(phasesData.completedPhases||{}),[cur]:{completedAt:Date.now(), approvals:apSnap, denials:denSnap, schedule:snap, fteHead..., projections:serializeProjections()}}},{merge:true})`. currentPhase is written as `cur` — the pha

#### L3. skipPhaseResults swallows its write failure and reports success

`vacation-kp.github.io/admin/index.html:3790` · breaks **I8** · found by *phase-lifecycle*

**Evidence**

```
admin/index.html:3789-3792:

  onConfirm:async()=>{
    await setDoc(phasesRef,{resultsSent:{...(phasesData.resultsSent||{}),[cur]:Date.now()}},{merge:true}).catch(()=>{});
    toast('⏭ Phase '+cur+' results skipped (no e-mail sent)','warn');
  }

This is the only forward transition out of the (completedPhases[cur] && !resultsSent[cur]) state when the e-mail path cannot complete — sendPhaseResultsEmails returns without ever setting resultsSent when the archive holds no decisions (admin/index.html:4547-4550 "No approvals or denials recorded for Phase N") — so a swallowed failure here is a swallowed failure of the state machine's only exit. openConfirm's global rejection net at :7548 is bypassed precisely because the .catch(()=>{}) absorbs the rejection first.
```

**Failure scenario**

Phase 3 completes during a testing pass with no approvals recorded (all bids denied and then the denials revoked, so the archive's approvals and denials are empty arrays). sendPhaseResultsEmails aborts with "No approvals or denials recorded for Phase 3" and never writes resultsSent. Admin clicks "⏭ Skip sending (testing)". The phases write is rejected — the admin's e-mail was just moved out of vacations/adminAccess by a co-admin, so isAdmin() is false and the write is denied — and the rejection is discarded. Toast reads "⏭ Phase 3 results skipped (no e-mail sent)", so the admin believes the step is done and moves on, but resultsSent[3] was never written and "Begin Phase 4" never appears. The admin has been told an action succeeded that left zero state change, with no error anywhere.

**Verifier notes:** Code confirms the defect verbatim. admin/index.html:3789-3792 does `await setDoc(phasesRef,{resultsSent:{...}},{merge:true}).catch(()=>{});` followed by an unconditional success toast — no branch inspects whether the write landed. The `.catch(()=>{})` provably defeats openConfirm's M-14 rejection net at :7548 (`if(cb){ try{ await cb(); }catch(err){ ... toast('Action failed: '+(err?.message||err),'

#### L4. Duration slider and label are overwritten every second with the STAGE hours, misreporting the live auction window

`admin/index.html:6978` · breaks **I8** · found by *timer*

**Evidence**

```
admin/index.html:6975-6982 `syncDurationUI()` sets `const h=(typeof currentStageHours==='function')?currentStageHours():(timerData.durationHours||48); if(dd) dd.textContent=h+"h"; if(sl && document.activeElement!==sl) sl.value=durIdxFor(h);` — it displays `currentStageHours()` (derived from elapsed days + stage rules, 6733) rather than the persisted `timerData.durationHours`. It is invoked from the 1-second tick (`startTick`, 6899) and from `syncTimer` (6836). The manual set at 6956-6958 writes `{durationHours:h,enabled:true}` and does not touch the stage rules.
```

**Failure scenario**

Phase 1, day 0 (stage 0 = 48h). Admin drags the window slider to 6h and confirms; the toast says "⏱️ Auction window set to 6h" and the doc now holds durationHours:6. Within one second the slider snaps back to the 48 stop and the label reads "48h", while the countdown digits beside it show ~6h remaining. The admin, believing the change did not stick, drags to 48 and confirms — `if(en&&h===curHrs)` is false (curHrs is 6), so this actually WRITES durationHours:48 and extends the window they meant to shorten.

**Verifier notes:** Confirmed on code. admin/index.html:6968-6981 syncDurationUI() sets both the "Auction window" label (#durationDisplay, markup line 464) and the slider position from currentStageHours() (6733), which is computed only from getTimerRules().stages + elapsed days via timerPhaseStartMs() and never reads timerData.durationHours. The live countdown and actual expiry use the persisted value instead: getDur

#### L5. Quiet-hours extension lands at 10:00 AM instead of 9:00 AM PT on the spring-forward Sunday

`index.html:1033` · breaks **other** · found by *timer*

**Evidence**

```
index.html:1033 (and identically admin/index.html:6726) `function _laWallToMs(y,mo,d,h,mi){ const guess=Date.UTC(y,mo-1,d,h,mi); const p=_laParts(guess); const back=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute); return guess+(guess-back); }` samples the Pacific UTC offset at instant `guess`, which is 7-8 hours BEFORE the target wall time — i.e. 1-2 AM on the target day when the target is 9 AM. On the second Sunday in March the DST transition (2 AM) falls between the sampled instant and the target, so the PST offset (-8) is applied to a PDT wall time. Executed against Node's ICU: `_laWallToMs(2027,3,13,9,0)` → "Mar 13, 2027, 9:00 AM PT" (correct), `_laWallToMs(2027,3,14,9,0)` → "Mar 14, 2027, 10:00 AM PT" (wrong), `_laWallToMs(2027,3,15,9,0)` → "Mar 15, 2027, 9:00 AM PT". Same result for 2026-03-08. The error affects any `quietEnd` in 4..9 (default is 9).
```

**Failure scenario**

Timer rules at defaults (quietStart 21, quietEnd 9, quietWhenHoursLE 6) and the phase is far enough along that the stage reset is 3h. A physician places a bid at 12:30 AM PT on Sunday 14 Mar 2027. `timerResetHours` computes raw expiry 4:30 AM, sees it inside quiet hours, and calls `_quietAdjustExpiry` → `_laWallToMs(2027,3,14,9,0)` = 10:00 AM PDT, giving durationHours 8.5. The auction stays open until 10:00 AM, one hour past the deadline stated in the staff timer box and in the welcome e-mail ("…it's pushed to 9 AM") — the extra hour is available to anyone still awake and unavailable to anyone who set an alarm for the published 9 AM close.

**Verifier notes:** Confirmed on code grounds, with the real files read and the real function executed.  DEFECT: index.html:1033 (identical at admin/index.html:6726) `_laWallToMs(y,mo,d,h,mi){ const guess=Date.UTC(y,mo-1,d,h,mi); const p=_laParts(guess); const back=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute); return guess+(guess-back); }` samples the Pacific offset a single time at `guess`, the UTC instant carry

#### L6. bulkSaveMissingFte writes the list of users captured before the dialog opened, so it can overwrite an FTE saved in the meantime

`vacation-kp.github.io/admin/index.html:7390` · breaks **I8** · found by *fte-capacity*

**Evidence**

```
7390:  const miss=usersMissingFte();          // captured BEFORE openConfirm
7391:  if(!miss.length){ toast('Every user already has a saved FTE.','ok'); return; }
7392:  openConfirm({
...
7401:    onConfirm:async()=>{
7402:      const raw=parseFloat(document.getElementById('bulkFteVal')?.value);
7403:      if(isNaN(raw)||raw<FTE_MIN||raw>1){ toast('FTE must be between '+FTE_MIN+' and 1','err'); return; }
7404:      const val=Math.round(raw*10)/10;
7405:      const patch={}; miss.forEach(u=>{ patch[u]=val; });    // one write, not N
7407:        await setDoc(fteRef,patch,{merge:true});
The onConfirm closure never re-evaluates usersMissingFte(), even though the fteMap onSnapshot (1428) keeps fteData live the whole time the modal is open. The toast on 7409 then reports the stale count as a success.
```

**Failure scenario**

Two auction admins are working through the roster before launch (both are on the shared vacations/adminAccess list, so both have the Users panel open). Admin A opens "✔ Set FTE for all 3…" — miss is captured as ['GH','IJ','KL'] — and pauses to check the roster spreadsheet. Admin B meanwhile types 1.0 into GH's box and clicks Save, so vacations/fteMap.GH becomes 1.0 and A's fteMissingBox re-renders to show only IJ and KL. Admin A now types 0.5 (IJ and KL are the two half-timers) and confirms. The patch built from the stale `miss` is {GH:0.5, IJ:0.5, KL:0.5}, and the setDoc merge overwrites GH's just-saved 1.0 with 0.5. The toast reads "✔ Saved FTE 0.5 for 3 users", usersMissingFte now returns [] so every gate reports ready, and GH is scored as consuming 0.5 for the whole auction — under-consuming a full-time physician by 0.5 FTE on every week they win, which is precisely the direction tha

**Verifier notes:** Confirmed on code. admin/index.html:7390 captures `const miss=usersMissingFte()` before openConfirm, and the onConfirm closure (7401-7412) uses that captured array verbatim: `const patch={}; miss.forEach(u=>{ patch[u]=val; }); await setDoc(fteRef,patch,{merge:true});` with no re-evaluation of usersMissingFte()/fteData. The data is live throughout: onSnapshot(fteRef,...) at 1428 reassigns fteData a

#### L7. A welcome queued for an address that later leaves the roster can never be sent and is never deleted

`vacation-kp.github.io/index.html:1339` · breaks **I9** · found by *email*

**Evidence**

```
Today's guard skips — deliberately never deletes — a single-target entry whose address is not on the roster, on both sites:

'''
index.html:1339:      if(isWelcome && !_knownRosterAddress(e.to)) continue;
admin/index.html:1494:     if(isWelcome && !_knownRosterAddress(e.to)) continue;
'''

`_knownRosterAddress` (index.html:1314, admin/index.html:1186) scans only the CURRENT `loginEmails`/`emails` values, so an address that has since been overwritten or cleared can never satisfy it again. `sendWelcomeEmail` persists the entry to mailQueue before attempting the send (index.html:2929, admin/index.html:4416), so a failed send always leaves one behind. There is no per-entry removal control in the admin UI — `flushMailQueue` is the only handle, and it reports 'Nothing old enough to send yet (or another page just took it)' (admin/index.html:1553) for a permanently skipped entry.
```

**Failure scenario**

A physician types `jsmth@kp.org` into the KP e-mail prompt. `saveEmail` stores it and calls `welcomeOnce`, which writes queue entry `q={to:'jsmth@kp.org',...}` and then fails the inline `emailjs.send` (the account is over its 2000 monthly quota). Noticing the typo, they immediately re-save `j.smith@kp.org`, overwriting `emails[JS]`. `q` is now un-sendable forever: every sweep on every page hits line 1339 and skips it without deleting. The admin dashboard's mail-queue badge flashes red permanently, misreporting a pending outbid alert that does not exist, and the only way to clear it is Reset Auction (`setDoc(mailQueueRef,{})`, admin/index.html:3686) — which would destroy the whole auction.

**Verifier notes:** Defect confirmed in code. index.html:1339 and admin/index.html:1494 place `if(isWelcome && !_knownRosterAddress(e.to)) continue;` ahead of every delete path in the sweep (the `_welcomed` drop at 1343/1498, the no-recipient drop at 1352/1510, the terminal delete at 1375/1540), and the comments state the skip is deliberately non-deleting. `_knownRosterAddress` (index.html:1314, admin/index.html:1186

#### L8. A failed sign-in permanently latches _subscribeSensitiveOnce, leaving the mailQueue listener dead for the rest of the tab's life

`vacation-kp.github.io/index.html:2646` · breaks **other** · found by *auth-roster*

**Evidence**

```
The handler subscribes BEFORE it knows whether the account is registered: `_subscribeSensitiveOnce(); const justNow=_userJustSignedIn; const initials=resolveByEmail(u.email); if(!initials){ ... showSigninError("This Google account ("+u.email+") isn't registered for the auction..."); return; }` (index.html:2646-2662). _subscribeSensitiveOnce is a one-shot latch that attaches mailQueue: `if(_sensitiveSubbed) return; _sensitiveSubbed=true; ... _sensitiveUnsubs.push(onSnapshot(mailQueueRef, snap=>{ mailQueueData=snap.exists()?snap.data():{}; scheduleMailQueueRelay(); }));` (index.html:2610-2617). mailQueue reads require a REGISTERED user, not merely a verified one: `isRelayDoc(docId) ? (isRegisteredUser() || isAdmin())` (rules:198) — so for an unregistered verified account that listener is rejected permission-denied and, as index.html:2621 itself notes, 'a rejected snapshot listener NEVER retries'. The only reset of the latch is _unsubscribeSensitive() (index.html:2624-2629), reachable solely via signinShowPicker/userSignOut — and the error branch displays the PICKER panel, whose only control is `onclick="userGoogleSignIn()"` (index.html:365), which does not tear down.
```

**Failure scenario**

Dr. NG's login e-mail is recorded in the admin as 'n.gupta@kp.org' but she signs in with 'ngupta@kp.org'. resolveByEmail returns null, so the picker + 'isn't registered' error are shown — but _subscribeSensitiveOnce has already run, _sensitiveSubbed is now permanently true, and the mailQueue listener has been killed with permission-denied. She phones the admin, who corrects the address; she clicks 'Sign in with Google' again on the same tab (the picker's only button) and picks the right account. She gets in and bids normally, but _subscribeSensitiveOnce() returns immediately at its latch, so mailQueue is never re-subscribed: mailQueueData stays {} and scheduleMailQueueRelay() is never invoked. Her tab — often the one left open longest during a phase — silently contributes nothing to the outbid-alert relay for the rest of the session, so alerts queued by bidders who closed their browsers 

**Verifier notes:** Independently confirmed on code grounds.  (1) Ordering: index.html:2646 calls _subscribeSensitiveOnce() BEFORE the registration check at 2648 (`const initials=resolveByEmail(u.email); if(!initials){...return;}`). Quoted evidence is accurate.  (2) Latch: index.html:2610-2617 — `if(_sensitiveSubbed) return; _sensitiveSubbed=true;` then pushes `onSnapshot(mailQueueRef, snap=>{ mailQueueData=...; sche

#### L9. "My Bids Remaining" always shows an NP chip even in phases where the admin has disabled NP bids

`vacation-kp.github.io/index.html:1240` · breaks **other** · found by *staff-ui*

**Evidence**

```
index.html:1240 (renderBidPool): `const remHtml=(pool.remaining.length?pool.remaining.map(n=>chip(n,'rem')).join(''):'<span ...>None</span>')+chip('NP','rem');` — the NP chip is appended unconditionally. `npAllowedNow()` (index.html:1129) is never consulted here, although every other NP surface honours it: the modal option is disabled at index.html:1722 (`if(v==="NP"){opt.disabled=hasCap||isHighPrioOnly||!npAllowedNow();return;}`) and confirm re-checks at index.html:1799. The default policy is NP OFF for phases 1-2 (`return v===undefined?(ph>=3):v!==false;`).
```

**Failure scenario**

Phase 1 goes live with the shipped default (`adminSettings.npAllowedPhases` unset → NP off for phases 1 and 2). Every one of the 37 physicians opens the board and the "My Bid Count → My Bids Remaining" panel lists green chips 1-10 plus a green NP chip, i.e. it states NP is still available to them. It is not: NP is greyed out in the bid dropdown on every week, and if reached another way `confirmPriority` rejects it with "NP bids are not enabled for Phase 1". Phase 1 is also high-demand-only, where NP is refused regardless of phase (index.html:1804), so the chip is wrong for every clickable week in the first phase.

**Verifier notes:** Core defect verified in /home/claude/work/vacation-kp.github.io/index.html:1231 — `const remHtml=(pool.remaining.length?...:'<span ...>None</span>')+chip('NP','rem');` appends the NP chip unconditionally, using the green 'rem' (available) styling. Neither renderBidPool (1226) nor bidPoolInfo (1212) consults npAllowedNow(). A full grep of npAllowedNow shows only three sites: definition (1129), drop

#### L10. Clear Change Log drops the resetAt fence, making both sites' "changes in last 24h" counters jump from 0 to a phantom count

`vacation-kp.github.io/admin/index.html:6702` · breaks **I7** · found by *fairplay-reports*

**Evidence**

```
Line 6702: `onConfirm:async()=>{ await setDoc(changesRef,{log:[]}); await setDoc(changesDecisionsRef,{log:[]}).catch(()=>{}); ... }` — plain setDoc with no merge and no resetAt, so the `resetAt` field completePhase wrote (line 4036 `setDoc(changesRef,{log:[],resetAt:Date.now()})`) is deleted. changeEvents24h then falls back to a bare 24h window on BOTH sites (admin line 2173 `const cutoff=Math.max(Date.now()-86400000, changesResetAt||0);`, staff index.html:2072 `Math.max(Date.now()-86400000, changesData.resetAt||0)`) and, because the log is now empty, its `logged` de-dup set is empty too, so every bidTimes stamp in the window is emitted as an 'extra' event (line 2178). completePhase does not clear bidTimesRef.
```

**Failure scenario**

Phase 1 completes Monday 09:00; resetAt=Mon 09:00 and both sites correctly show "0 changes in last 24h" / Popcornometer "Quiet". 25 bids were placed Sunday 20:00-Monday 08:00, so bidTimesData still holds 25 stamps inside the trailing 24h. At Monday 10:00 the admin clicks "Clear Log". changesResetAt becomes 0 on both sites, and changeEvents24h now returns 25 synthetic {actor:'sim'} events. The admin Popcornometer flips to "25 bid changes in last 24h · Steady popping" and every physician's "📋 25 changes in last 24h" popover lists 25 rows naming who bid on which week — for a phase that closed an hour earlier, contradicting the stated rule at line 4025-4027 that the counters must read 0 after a phase closes.

**Verifier notes:** CONFIRMED — every quoted line matches the real code and the path is fully reachable.  TRIGGER IS LIVE: admin/index.html:742 `<button class="btn btn-danger" ... onclick="clearChangelog()">Clear Log</button>` is a real button in the changelog panel; handler defined at 6697.  THE DEFECT: line 6702 `onConfirm:async()=>{ await setDoc(changesRef,{log:[]}); await setDoc(changesDecisionsRef,{log:[]}).catc

#### L11. Simulator treats NP as a single-use, permanently-consumable bid token; the real rule is unlimited and never consumed

`vacation-kp.github.io/admin/index.html:3496` · breaks **I7 (simulated board is not reachable by real bidders)** · found by *simulator*

**Evidence**

```
The simulator puts 'NP' into the same used-priority set as numeric bids:
- admin/index.html:3458 `if(p==="NP") priorUsedPrios.add('NP');` (prior-phase win)
- admin/index.html:3477 `if(v==='NP') usedPrios.add('NP');` (existing current-phase bid)
- admin/index.html:3496 `if(b==='NP'){ if(usedPrios.has('NP')) return false; }` (exclusion filter)
- admin/index.html:3510 `if(bid==='NP') usedPrios.add('NP');`

The real engine does the opposite. `getPriorPhaseUsedPriorities` (index.html:1943-1955) explicitly skips it: `if(p==="NP") continue; // NP doesn't consume a numeric bid`. `bidPoolInfo` (index.html:1212-1224) counts NP separately (`npCount`) and never adds it to `usedNums`. `openPriorityModal` (index.html:1722) disables NP only for lock/high-demand/phase reasons, never for reuse: `if(v==="NP"){opt.disabled=hasCap||isHighPrioOnly||!npAllowedNow();return;}`. The welcome e-mail text the admin site itself generates (admin/index.html:3759) states the rule: "there is no limit on how many NP bids you can place, beyond the running cap above".
```

**Failure scenario**

Phase 3 (NP enabled by default per `npDefaultFor(ph){ return ph>=3; }`), "Bids per user" set to 5, no cumulative cap. A real clinician may place 5 NP bids. The simulator will place at most one NP per user, and for any user whose Phase-2 NP bid was approved, `priorUsedPrios` contains 'NP' so the simulator will place zero NP bids for them for the rest of the auction. The simulated Phase 3/4 board therefore contains roughly 1/5 of the NP volume a real Phase 3 produces, so any FTE-capacity or review-threshold tuning validated against it is calibrated against a board real bidders cannot produce.

**Verifier notes:** The code-level defect is confirmed and reachable, but the claimed invariant break and the quantified impact are both wrong.  CONFIRMED: All four cited simulator lines exist verbatim in admin/index.html (3458 `if(p==="NP") priorUsedPrios.add('NP');`, 3477 `if(v==='NP') usedPrios.add('NP');`, 3496 `if(b==='NP'){ if(usedPrios.has('NP')) return false; }`, 3510 `if(bid==='NP') usedPrios.add('NP');`), a

#### L12. Simulator enforces the priority-lock floor even when the admin has switched priority locks OFF

`vacation-kp.github.io/admin/index.html:3501` · breaks **I7 (simulator is more restrictive than real bidders)** · found by *simulator*

**Evidence**

```
admin/index.html:3501-3504 applies the floor unconditionally:
'''
        if(_floor!==undefined){
          const parsed=b==='NP'?'NP':(b.includes(',')?b.split(',').map(Number):parseInt(b));
          if(pScore(parsed)>pScore(_floor)) return false;
        }
'''
where `_floor=(worstBidsData[user]||{})[wk]` (admin/index.html:3494).

The staff site gates the identical rule on the admin toggle (index.html:1693, 1701):
'''
  const prioLockOn=adminSettings.priorityLockEnabled!==false;
  ...
  const hasCap=prioLockOn&&capPrio!==undefined&&capPrio!=="NP";
'''
and the same gate is repeated on the removal path (index.html:1882). Meanwhile `saveBestBid` (index.html:1740-1750) writes the floor unconditionally — it has no `priorityLockEnabled` check — so `bestBids` is populated even while locks are disabled.
```

**Failure scenario**

Admin turns "Priority Lock" OFF in Controls (a supported setting) so users may re-bid weaker. Users bid, and `saveBestBid` still records floors — say LO's floor on 2027-07-04 is 2. A real user LO is free to bid 8 on that week. The simulator, topping up in the same phase, filters every option with `pScore > pScore(2)` and can only ever assign LO a 1, 2 or 1/2 there. The simulated board is systematically top-heavy on floored weeks relative to the live rules, so draw/review frequencies measured from it understate what will actually happen.

**Verifier notes:** CONFIRMED. I attacked every link and none broke.  1. The quoted simulator code is verbatim and unconditional. /home/claude/work/vacation-kp.github.io/admin/index.html:3494-3505 inside `_runSimulationNow`: ``` const _floor=(worstBidsData[user]||{})[wk]; // [M-5] existing priority-lock floor, if any const allowed=simGetAllowedBids(wk).filter(b=>{   ...   if(_floor!==undefined){     const parsed=b===

#### L13. The biddingClosed write is the only unguarded write in Close Phase Bidding, and its failure is swallowed while the toast reports bidding closed

`vacation-kp.github.io/admin/index.html:5662` · breaks **I8** · found by *todays-fixes*

**Evidence**

```
admin/index.html:5662-5663: `await setDoc(timerRef,{biddingClosed:true},{merge:true}).catch(e=>console.error('biddingClosed set failed:',e)); toast('⏱ Phase '+cur+' bidding closed. …','ok');`. Every other write in _fixClosePhaseBidding propagates its error (5649 `await _lockEveryWeek();`, 5653 `await setDoc(timerRef,{lastChange:…})`), so a failure there aborts before the toast via openConfirm's catch (7548). This one is caught to console and execution continues to an unconditional success toast plus _refreshReadinessBox(). The flag matters most in exactly the configuration where nothing else stops bids: line 5652 `if(timerData.enabled===true)` skips the timer-expiry write when the timer is OFF, so with the timer off `biddingClosed` is the sole server-side gate (firestore.rules:209 biddingNotClosed()).
```

**Failure scenario**

Timer toggled OFF (a supported configuration). Admin clicks Close Phase 3 bidding. _lockEveryWeek() succeeds, the timer-expiry write is skipped, and the biddingClosed setDoc fails (transient rejection/blip) — the error goes only to devtools console. The admin sees "⏱ Phase 3 bidding closed" and starts approving. firestore.rules' biddingNotClosed() still passes and timerNotExpired() passes (timer disabled), so any registered user can still write bids from devtools while decisions are being made — the precise hole [AUDIT 2026-07-25 #2] was added to close, reported as closed.

**Verifier notes:** Independently confirmed on the real files.  CODE (admin/index.html): 5649 `await _lockEveryWeek();` and 5653 `await setDoc(timerRef,{lastChange:Date.now()-getDurationMs()-1000},{merge:true})` both propagate; 5652 `if(timerData.enabled===true)` skips 5653 entirely when the timer is off; 5662 `await setDoc(timerRef,{biddingClosed:true},{merge:true}).catch(e=>console.error('biddingClosed set failed:'

#### L14. Staff countdown banner ignores biddingClosed, showing a live "bids reset the timer" countdown while every bid is refused

`vacation-kp.github.io/index.html:1478` · breaks **other** · found by *todays-fixes*

**Evidence**

```
isAuctionClosed() was changed today to honour the flag (index.html:1077 `if(timerData.biddingClosed===true) return true;`) and gates every mutation path plus renderCalendar (2255). renderCountdown (1456-1519) was not updated: it bails only on `!biddingOpen()` (1470) and `!timerData.enabled||!timerData.lastChange` (1475), then computes `remaining=DURATION-(Date.now()-timerData.lastChange)` and only shows "Bidding closed" / showAuctionClosedModal() when `remaining<=0` (1482-1488). With biddingClosed=true and positive remaining it renders the live countdown and the description "Resets to Nh with each bid change" (1514) or the opening-window text (1500), and the auction-closed modal never fires.
```

**Failure scenario**

Timer is toggled OFF mid-phase (toggleTimerEnabled writes lastChange:null, admin/index.html:6996). Admin clicks Close Phase 2 bidding: with the timer off, only biddingClosed:true is written (5652 skips the expiry write). Admin then toggles the timer back ON; because timerData.lastChange is null and an opening window is configured, the payload becomes `{enabled:true,lastChange:began,durationHours:owr.days*24}` (admin/index.html:7002), giving a large positive remaining. Every staff page now shows a running days/hours countdown with "Opening window — the timer counts down continuously…", no auction-closed pop-up, and a clickable-looking board — but every week click answers "The auction has closed — no more changes allowed."

**Verifier notes:** Confirmed on code grounds; could not refute.  DEFECT (vacation-kp.github.io/index.html): `grep -n "biddingClosed" index.html` returns exactly ONE hit — line 1077 inside isAuctionClosed(). renderCountdown (1456-1519) therefore has no way to see the flag. Its only gates are `if(!biddingOpen())` (1470) and `if(!timerData.enabled||!timerData.lastChange)` (1475). biddingOpen() (1008-1011) is `return cp

---

## Disputed — the two skeptics disagreed

These need your judgement. One skeptic confirmed, the other refuted.

**[critical] _backupThen() runs the irreversible action even when the backup it just took is incomplete**  
`vacation-kp.github.io/admin/index.html:8136`

Scenario: Admin clicks 💣 Reset Auction → chooses "💾 Backup & Continue". The getDoc for `schedule` hits a transient failure (Firestore `unavailable`, or a permission blip while the adminAccess get is re-evaluated). exportBackup writes `"schedule": "FETCH-FAILED: unavailable"` into the downloaded JSON, toasts a warning that vanishes in 3 seconds, and resolves normally. `window._bkProceed()` fires immediately, the admin types RESET, and `setDoc(scheduleRef,{})` at 3656 wipes every bid by all 37 physicians. T

- CONFIRMED: Confirmed on code grounds; every quoted line is verbatim accurate.

1) exportBackup (admin/index.html:8142-8162) cannot signal failure to its caller. Line 8148 `let fails=0;` and 8150-8151 `try{ const s=await getDoc(ref); out[name]=s.exists()?s.data():null; } catch(e){ out[name]='FETCH-FAILED: '+(e.code||e.message); fa
- REFUTED: The code facts in the claim are accurate, but the failure scenario is not reachable; every mechanism proposed for producing a data-losing `FETCH-FAILED` is either impossible under the published rules or self-masking.

CODE FACTS CONFIRMED (/home/claude/work/vacation-kp.github.io/admin/index.html)
- 8136: `onConfirm:asy

**[critical] A duplicated Google login e-mail silently grants one physician write access to another's bids (server-enforced)**  
`vacation-kp.github.io/admin/index.html:1105`

Scenario: Admin adds locum "JS" on the Users page and, not yet having their address, pastes an address already recorded for "AF" (or simply mistypes JS's address into a value that equals AF's). loginEmails is now {AF:'john.smith@gmail.com', JS:'john.smith@gmail.com'} and maybeSyncEmailToUser writes emailToUser = {'john.smith@gmail.com':['AF','JS']}. Dr. Smith signs in on the staff site; resolveByEmail (index.html:2575) scans `names` and returns the FIRST match — say 'AF' — so personSelect.value='AF' and e

- CONFIRMED: Every cited line checks out against the real files, and the control flow reaches the described state.

CONFIRMED EVIDENCE:
1. admin/index.html:1101-1108 `_buildEmailToUser()` is quoted verbatim and accumulates collisions into a list with no detection: `(map[em]=map[em]||[]).push(initials);`. No branch, no warning, no r
- REFUTED: The code facts check out (email->list map at admin/index.html:1101-1108, hasOnly(myInitials()) at firestore.rules:128-140, no uniqueness validation in adminSaveLoginEmail:6299-6306 or addUser:7218-7220), but the failure scenario is not reachable as described.

(1) Self-contradictory premise: the scenario says the admin

**[high] adminRemove reports success after a failed schedule delete, leaving the bid live in Firestore while the admin's board shows it gone**  
`vacation-kp.github.io/admin/index.html:6215`

Scenario: Admin B is in `vacations/adminAccess` but is not one of the two hard-coded defaults. Mid-phase, the other admin removes Admin B's address from the list (or empties `emails`, which makes `accessDocExists()` false at firestore.rules:10 and drops Admin B to the `isDefaultAdmin()` branch). Admin B's page has no idea — every listener already has its data. Admin B clicks Remove on Dr. MK's bid for 2027-12-19. The `updateDoc(scheduleRef,…)` is denied; the `.catch(()=>{})` eats it; `scheduleData['MK']['

- CONFIRMED: Confirmed on code grounds.

DEFECT VERIFIED (admin/index.html:6209-6222). adminRemove's onConfirm deletes scheduleData[u][wk] locally BEFORE writing, then issues five updateDoc calls each terminated with .catch(()=>{}), then unconditionally fires toast("🗑 Removed · lock cleared"). Nothing between the local delete and t
- REFUTED: The code smell is real but the claimed failure state is not reachable, because the finder's load-bearing premise about Firestore behaviour is wrong.

CONFIRMED PARTS: admin/index.html:6215 `adminRemove` does swallow every write with `.catch(()=>{})` and fires `toast("🗑 Removed · lock cleared")` unconditionally at 6221;

**[high] Cumulative-cap warning is computed from pre-decision state and is absent from the Complete Phase gate, so the breach a decision creates is never shown**  
`vacation-kp.github.io/admin/index.html:5603`

Scenario: Cumulative cap through Phase 3 = 2. User A won 1 week in Phase 1 and 1 week in Phase 2 (prior wins = 2). In Phase 3, A is tied with B on week W and lands in a DRAW (A is in ap[W].draws, NOT in ap[W].winners). The admin opens Draws & Reviews and clicks "✓ Approve as Win" on A. confirmApprove (7808) builds its body with readinessWarnHtml(); capBreaches counts A's winner-set entries = 2 prior + 0 current = 2, which is not > 2, so _capWarnHtml returns '' and the dialog shows no cap warning at all — 

- CONFIRMED: Both halves of the code claim check out, but the finder's specific numbers are impossible; the defect survives only under a narrower precondition, so severity drops to medium.

CONFIRMED — pre-decision computation. /home/claude/work/vacation-kp.github.io/admin/index.html:5603 `function _capWarnHtml(){ const r=approvalR
- REFUTED: Code claims check out, but the scenario is unreachable. Verified: _capWarnHtml (admin 5603) → approvalReadiness (5548) → capBreaches (5575) → computeApprovals all read pre-decision state, and completePhase (3892-3946) consumes only rdy.ready/rdy.problems with no warnings in its confirm body. So the mechanism the finder

**[high] No simulator-armed guard on Begin Phase 2/3/4, and no armed indicator outside the Simulator panel**  
`vacation-kp.github.io/admin/index.html:4246`

Scenario: Admin arms the simulator during Phase 1 (deliberately, after the two confirms, to reproduce a bug), finishes Phase 1, completes it, and clicks Begin Phase 2 the next morning from the dashboard without visiting the Simulator panel. `simulatorEnabled` is still true and nothing says so. Any later click on Run Simulation writes fake bids for all 37 clinicians into the live Phase 2 board, resets the live countdown for everyone, and queues outbid e-mails to real addresses — the exact outcome the Phase

- REFUTED: The claim's literal code observations are accurate, but the defect does not survive scrutiny — the point of damage is guarded twice over, and the Phase-1 guard sits at a boundary that Phases 2/3/4 do not have.

CONFIRMED FACTS (the claim reads the code correctly):
- admin/index.html:4123 — beginPhase1 does block on `ad
- CONFIRMED: Both the defect and a reachable path independently confirmed in the real file.

DEFECT CONFIRMED. admin/index.html:4122-4136 — beginPhase1 hard-blocks when adminSettings.simulatorEnabled===true, with a red interstitial, one-click disarm (okText:'🔒 Turn OFF simulator & continue') and an explicit _beginPhase1SimOverride(

**[medium] A tied group is drawn in full even when only one member can fit, putting members past the review threshold into the lottery**  
`vacation-kp.github.io/admin/index.html:1825`

Scenario: Week 2027-01-03, capacity 3.0, review threshold 0.5 (default). A (FTE 1.0, bid 1), B (1.0, bid 2), C (0.6, bid 3) fit to fteWon 2.6. Then a three-way tie at bid 4: D (FTE 0.4), E (1.0), F (1.0). Group FTE 2.4 -> round(2.6+2.4-3.0)=2.0 > 0, does not fit. anyFits is true only because of D: round(2.6+0.4-3.0)=0 <= 0.5. E and F individually give round(2.6+1.0-3.0)=0.6, which is greater than T=0.5.

Verified output: draws = {D, E, F}. Had E bid one number lower and stood alone at that priority, the s

- CONFIRMED: Defect confirmed at admin/index.html:1825-1827 (mirrored at index.html:959-961 and admin/index.html:4729-4730): the per-member fit test is `group.some(r=>Math.round(((fteWon+r.fte)-cap)*10)/10<=T)` but the consequence `group.forEach(r=>draws.add(r.user))` is applied to the whole tied group. I re-ran the real loop body 
- REFUTED: Code fact confirmed (some-gate + forEach at admin/index.html:1825-1827, index.html:959-961, admin/index.html:4729-4730), and draws={D,E,F} is producible with legal data (FTE 0.4-1.0 on a 0.1 grid, admin-entered cap 3.0, equal pScore ties). But the harm is not reachable and both supporting contrasts are wrong. (1) "A lo

**[medium] sendPhaseResultsEmails swallows the resultsSentTo write, so a retry re-sends the entire roster's results e-mails**  
`vacation-kp.github.io/admin/index.html:4609`

Scenario: Phase 1 completes; admin clicks "📮 Send Phase 1 Results". All 37 e-mails go out via EmailJS. The setDoc at :4609 persisting resultsSentTo is then rejected (the admin's browser has just gone offline, or the write races another tab's phases write) and is swallowed; the setDoc at :4615 for resultsSent fails for the same reason and is also swallowed. Toast reads "📮 Phase 1 results: 37 e-mails sent". But renderNextStep still shows "Phase 1 is complete, but users have NOT been e-mailed their results y

- CONFIRMED: CONFIRMED, with one correction to the stated trigger mechanism.

Verified in /home/claude/work/vacation-kp.github.io/admin/index.html:

1. `resultsSentTo` appears in exactly three places in the whole 521KB file: the comment at 4584, the read at 4588, the write at 4609. There is no alternate ledger — `adminSendEmail` (4
- REFUTED: The code description is accurate (admin/index.html:4609 and :4615 both use .catch(()=>{}), dedup at :4588 is seeded only from the persisted doc, claim released at :4623, and the retry click path via renderNextStep :3822 / beginNextPhase :4238 is real), but the failure scenario is not reachable as described.

1. Offline

**[medium] mailQueue and welcomeLog are wholesale-writable by any registered user — one write silently discards every pending outbid alert**  
`vacation-kp.github.io/firestore.rules:206`

Scenario: Bidder AB places a strong bid that outbids three colleagues; their alerts are queued but not yet relayed. AB runs `setDoc(doc(db,'vacations','mailQueue'),{})`. The write is accepted, the three queued alerts vanish, and no page — staff or admin — has any record that they existed, so the colleagues are never told they lost their position and never re-bid. Nothing in either UI reports a problem. The symmetric write `setDoc(doc(db,'vacations','welcomeLog'),{})` re-arms the welcome mail for all 37 ad

- CONFIRMED: Independently confirmed both the defect and a reachable path.

DEFECT (firestore.rules:193-227): `allow write` grants welcomeLog explicitly at line 206 (`|| (docId == 'welcomeLog' && (isRegisteredUser() || isAdmin()))`) with no request.resource predicate. mailQueue is absent from isAdminOnlyDoc (98-117) and isBidDoc (1
- REFUTED: The rule text checks out — /home/claude/work/vacation-kp.github.io/firestore.rules:206 grants welcomeLog to any isRegisteredUser(), and mailQueue falls through the catch-all at 225-227 with no request.resource constraint, so setDoc(...,{}) / deleteDoc() are both accepted for any of the 37 bidders. But the claim's headl

**[medium] A failed schedule write in _adminChangePriorityRaw is an unhandled rejection: no error toast, no success toast, and the Edit Selections table keeps displaying the unsaved value**  
`vacation-kp.github.io/admin/index.html:6177`

Scenario: Same revoked-admin state as above (or any permission-denied on `vacations/schedule`). Admin changes Dr. GV's bid on Week 13 from 6 to 2 via the Edit Selections dropdown. `scheduleData['GV']['2027-03-28']` is set to 2 in memory, the write is denied, `mergeFields` rethrows, and the rejection is dropped on the floor: no "Action failed" toast, no "✏️ updated" toast, and no Firestore snapshot (nothing changed) so `renderEditTable` never redraws. The dropdown continues to read 2 for the rest of the se

- REFUTED: The code quotes are accurate (mergeFields at 1149 rethrows when the setDoc fallback also fails; the arrow at 6177 has a block body with no return so openConfirm's M-14 net at 7548 awaits undefined; line 6042 is an inline onchange that discards the promise; no unhandledrejection handler exists). But the claim's load-bea
- CONFIRMED: Both the defect and a reachable path survive adversarial checking.

DEFECT (all verified in /home/claude/work/vacation-kp.github.io/admin/index.html):
- 6177: guardAdminBid(...,()=>{ window._adminChangePriorityRaw(u,wk,val); }) — arrow has a block body with no return, so proceed() yields undefined. guardAdminBid (6153)

**[medium] addUser swallows a failed fteMap write and toasts success, putting a scored user on the roster with no FTE**  
`vacation-kp.github.io/admin/index.html:7231`

Scenario: Admin adds new hire 'ZQ' with FTE 0.6. The arrayUnion on userList commits; the immediately following setDoc on vacations/fteMap fails (transient network drop, or the admin's session token expires between the two round-trips and the second write is rejected). The toast reads "👤 Added ZQ · FTE 0.6" and the input is cleared, so the admin has explicit confirmation the FTE was stored. It was not. ZQ is now on the roster with no fteMap entry; getUserFTE(ZQ) returns the 1.0 guard, and if this happens d

- CONFIRMED: CONFIRMED as a real but low-severity defect. The quoted lines are verbatim: /home/claude/work/vacation-kp.github.io/admin/index.html:7231 does `await setDoc(fteRef,{[val]:fte},{merge:true}).catch(()=>{});` and 7241 toasts "Added ... FTE <n>" unconditionally, so any rejection of the FTE write yields a green toast assert
- REFUTED: The literal code smell is real — admin/index.html:7231 does `await setDoc(fteRef,{[val]:fte},{merge:true}).catch(()=>{})` and line 7241 toasts "· FTE "+fte unconditionally. But the claimed reachable path fails on five independent grounds.

(1) IDENTICAL RULES GATE, WRONG ORDER. firestore.rules puts both 'fteMap' AND 'u

**[medium] Denying losers one at a time promotes weaker bidders past the `settled` barrier, so the admin is offered a REVIEW/DRAW that the engine and the staff site both score as LOSE**  
`vacation-kp.github.io/admin/index.html:1800`

Scenario: Week W, capacity 3.0, review threshold at its default 0.5 (getReviewThreshold, 1195). Bidders: A (FTE 1.0, bid "1"), B and C (FTE 1.0 each, bid "2"), D and E (FTE 1.0 each, bid "3"), F (FTE 0.4, bid "4"). Natural projection on both sites: A wins (1.0), B+C win (3.0), the D/E group overflows (3+2-3=2>0) so settled=true and anyFits is false (3+1-3=1 > 0.5) → D and E LOSE, and F is never evaluated → F LOSES. F's board on the staff site says LOSE. The admin works the Approvals/Denials list top-down 

- REFUTED: The mechanism is real but every claimed consequence is either by design or already reachable without it, so the finding does not stand.

CONFIRMED MECHANICALLY (admin/index.html:1799-1832): `if(!ignoreAdmin&&deniedHereChk) continue;` does drop denied users from `reqs`, so denying both members of the group that set `set
- CONFIRMED: Confirmed both the defect and a reachable click path.

DEFECT (verified in the real file): admin/index.html:1800-1801 removes a denied user from `reqs` entirely (`if(!ignoreAdmin&&deniedHereChk) continue;`), so a denied bidder never forms a group and never sets `settled` at 1816-1832. Denying a LOSER frees no FTE but d

**[medium] exportBackup's 28 sequential non-transactional reads can capture a bid without its bidPhase tag, changing the restored allocation**  
`vacation-kp.github.io/admin/index.html:8149`

Scenario: Mid-Phase-2, physician AD places bid '2' on 2027-03-14 (a high-demand week she also bid on and LOST in Phase 1, so `completedPhases[1].schedule.AD['2027-03-14']` exists). Her schedule write commits at T; her un-awaited bidPhase write commits at T+300ms. The admin clicks 💾 Backup at T-50ms: getDoc(schedule) returns at T+40ms (bid present), getDoc(bidPhase) returns at T+180ms (tag absent). The file has `schedule.AD['2027-03-14']='2'` with no `bidPhase.AD['2027-03-14']`. The next day the admin full

- REFUTED: Refuted on ordering grounds: the cited mechanism (28 sequential non-transactional reads) cannot produce the described failure, and the quoted evidence actually disproves it.

WRITE ORDER IS STRICT. index.html:1607-1610 — `await setDoc(scheduleRef, {[user]:{[wk]:bid}}, {merge:true});` then `setDoc(bidPhaseRef, {[user]:{
- CONFIRMED: The underlying defect is real and confirmed in code, but two elements of the narration are wrong and the severity is overstated.

CONFIRMED: exportBackup (admin/index.html:8146-8153) is 28 sequential awaited getDoc calls with no runTransaction/getAll, under a comment at 8145 asserting the file "IS the complete auction 

**[medium] Removing both founder accounts from adminAccess is permitted and produces an unrecoverable admin lockout**  
`vacation-kp.github.io/admin/index.html:1364`

Scenario: vacations/adminAccess = ['dr.vacation.goddess@gmail.com','aaronjfrankel@gmail.com']. The department grants admin to the new scheduler, alice@kp.org → list is 3. Tidying up, alice removes aaronjfrankel (length 3 > 1, allowed) → list is 2, then removes dr.vacation.goddess (length 2 > 1, allowed) → list is ['alice@kp.org']. Both founders are now permanently locked out: accessDocExists() is true (size 1), isListedAdmin() is false for them, so isAdmin() is false and every write they attempt — includi

- REFUTED: REFUTED. The code does what it is explicitly documented to do, and the claimed "unrecoverable" state is neither unrecoverable nor produced by code.

1) Not a defect — it is the stated design, in two places. admin/index.html:1207-1211: "The admin list lives in the vacations/adminAccess document — EVERY admin on it is eq
- CONFIRMED: Confirmed on both the defect and reachability.

DEFECT (verified in the real files):
- admin/index.html:1362-1377 `removeAdminEmail` gates only on `adminAccessEmails.length<=1`. There is no DEFAULT_ADMIN_EMAILS check. `renderAdminAccess` (1332-1345) emits a "Remove" button for EVERY entry, founders included, whenever t

**[medium] saveBestBid writes the priority floor to local state before persisting and its rejection aborts confirmPriority — modal left open, no change-log entry, no error shown**  
`vacation-kp.github.io/index.html:1745`

Scenario: User MK currently has bid 5 on week 2027-09-12 and re-bids 3 on it. `persistScheduleChange` writes `schedule.MK['2027-09-12']=3` successfully and returns true. In the next few hundred milliseconds the admin clicks "Close Phase 3 bidding" (admin/index.html:5662 sets `timer.biddingClosed=true`), so `setDoc(bestBidsRef,...)` comes back permission-denied. Outcome on MK's screen: `bestBidsData.MK['2027-09-12']` is already 3 locally although the server still holds 5; the Submit Bid button appears to d

- CONFIRMED: The code defect is real and I confirmed it independently, but roughly half the finder's evidence is wrong and the reachable window is much narrower than claimed, so severity drops to low.

CONFIRMED:
- index.html:1740-1749 `saveBestBid` does `bestBidsData[user][wk]=prio` then `await setDoc(bestBidsRef,{[user]:{[wk]:pri
- REFUTED: The code mechanics are accurately described: saveBestBid (index.html:1740-1748) mutates bestBidsData before the await with no rollback, and window.confirmPriority (1778-1870) has no try/catch, so a throw from `await saveBestBid` at 1823/1857 (and removeSelection:1897) would skip logOwnChange, the bidTimes stamp and clo

**[low] getUserFTE returns the stored FTE without Number() coercion while usersMissingFte validates a coerced copy, so a string FTE passes the gate and NaNs the group-fit test**  
`vacation-kp.github.io/admin/index.html:1630`

Scenario: An admin recovers from a hand-edited backup JSON in which fteMap reads {"AD":"0.6","AF":"0.6"} (quoted numbers — the shape a JSON editor or spreadsheet export easily produces). _doFullRestore accepts it, and usersMissingFte() reports nothing because Number("0.6") is 0.6 and in range, so Begin Phase is not blocked.

On a week with capacity 3.0 where AD and AF are tied on bid 1: expected group FTE 1.2, comfortably fitting, both WIN. Verified actual: gf becomes the string "0.60.6", the fit test eva

- CONFIRMED: Confirmed on code grounds, with the caveat that it requires a hand-altered backup file.

DEFECT CONFIRMED. admin/index.html:1630 `function getUserFTE(u){ return fteData[u]!==undefined?fteData[u]:1.0; }` returns the raw stored value, and fteData is assigned unnormalized from the snapshot at 1428 (`fteData=snap.exists()?
- REFUTED: The code-level defect is genuine and I reproduced it precisely, but the claimed reachable path does not survive scrutiny.

WHAT I CONFIRMED (mechanics):
- /home/claude/work/vacation-kp.github.io/admin/index.html:1630 `function getUserFTE(u){ return fteData[u]!==undefined?fteData[u]:1.0; }` returns the raw stored value;

**[low] Begin Next Phase applies week-lock changes, then reports "nothing was changed" if the phase-advance batch fails**  
`vacation-kp.github.io/admin/index.html:4222`

Scenario: Phase 1 is complete and its results are sent. Admin clicks "▶ Begin Phase 2", then "✨ Smart Lock & Unlock, then Begin Phase 2". mergeFields succeeds and unlocks the 44 standard weeks that now have availability. The writeBatch at :4092 then fails (offline). Toast reads "Could not begin Phase 2 — nothing was changed". In fact 44 weeks were just unlocked while currentPhase is still 1 with completedPhases[1] set — a state the auction is never supposed to occupy — and the admin has been explicitly to

- CONFIRMED: CONFIRMED at low severity, with two corrections to the finder's write-up.

Code verified verbatim in /home/claude/work/vacation-kp.github.io/admin/index.html:
- :4220-4223 (Smart Lock & Unlock path): `try{ await mergeFields(locksRef,dotted); } catch(...){ ... return; }` then `const ok=await _commitBeginPhase(next); if(
- REFUTED: The code ordering is real (admin/index.html:4216-4224 commits mergeFields before the batch, and :4093 says "nothing was changed"), and lockedWeeksWithAvailability() at :5864 does include the ~44 Phase-1-locked standard weeks. But the reachability argument fails on three independent grounds.

(1) The stated trigger is t

**[low] _doUserRestore performs four unbatched writes, so a mid-sequence failure leaves the user's bids and phase tags from different points in time**  
`vacation-kp.github.io/admin/index.html:8109`

Scenario: Admin restores AD from a Phase-3 backup. `updateDoc(scheduleRef,{AD:{...}})` and the bestBids/bidTimes writes succeed; the fourth write to bidPhaseRef fails (session token expired between the third and fourth round-trip → permission-denied, so the setDoc fallback fails too). AD's schedule now holds the backup's Phase-3 bids while bidPhase still holds the post-backup tag map, which has no entry for the two weeks AD had since removed and re-added. getUserBidPhaseAdmin (1723-1736) resolves those un

- CONFIRMED: Confirmed on code. admin/index.html:8098 is the quoted pairs array and 8110-8119 is a plain sequential loop of four awaited updateDoc calls with no writeBatch, while writeBatch is imported (line 1058) and the sibling _doFullRestore deliberately uses one under the comment at 8041-8042 ("One atomic batch: all-or-nothing,
- REFUTED: The code is quoted accurately — `_doUserRestore` (/home/claude/work/vacation-kp.github.io/admin/index.html:8098-8122) really does four sequential single-document writes with no `writeBatch`, while the sibling `_doFullRestore` (8041-8056) batches 25 writes with an explicit "all-or-nothing" comment. The UI path to the fu

**[low] Simulator's schedule write is documented as atomic but is a per-user loop; a mid-loop failure leaves untagged, unlogged bids in the live schedule**  
`vacation-kp.github.io/admin/index.html:3521`

Scenario: The network drops (or a Firestore quota error fires) after 12 of 37 users have been written. The catch prints "Error: Failed to get document because the client is offline" with no indication that anything was written. Those 12 users' bids are live in vacations/schedule with no bidPhase tag, no bidTimes stamp, no bestBids floor, and no change-log entry — so they are invisible to the Popcornometer and the bid-activity chart, but `computeApprovals` scores them (untagged bids default to the current 

- CONFIRMED: Confirmed on code. admin/index.html:3519-3527 carries the comment "Write all bids atomically" while the code is a sequential per-user loop of `await mergeFields(scheduleRef, dotted)` — `names` has exactly 37 entries, so up to 37 separate writes to the same document. No writeBatch is used, even though writeBatch is impo
- REFUTED: The code fact is accurate but trivial (the loop at /home/claude/work/vacation-kp.github.io/admin/index.html:3524-3527 really is 37 sequential `mergeFields` calls under a comment that says "atomically"). The *defect* — a reachable partial write whose harm is what the claim describes — does not survive checking.

1. The 

---

## Completeness critics — unverified

Found by two agents asked what the fifteen specialists missed. NOT verified by skeptics; treat as leads.

**[high] Report/grid FTE header counts orphaned live approvals the engine ignores — a week reads FULL while computeApprovals says capacity is free**  
`/home/claude/work/vacation-kp.github.io/admin/index.html:4761`

Phase 2 live, week 2027-07-04, capacity 3.0. Admin approves C (FTE 1.0) early from the Draws & Reviews panel (the readiness box explicitly offers "…or override and proceed by confirming below", admin/index.html:5620), while weeks are still unlocked. C then removes that bid on the staff site (removeSelection, index.html:1878 — permitted, the week is unlocked, and the staff site cannot write vacations/approvals). approvalsData['2027-07-04'] still contains C; scheduleData.C['2027-07-04'] is gone.
E

**[high] No uniqueness check on the Google login e-mail — one address mapped to two initials lets one physician write the other's bids and locks the second out of their own account**  
`/home/claude/work/vacation-kp.github.io/admin/index.html:1105`

Admin fills the Users table and copy-pastes a row: both MK and MKA end up with loginEmails.MK = loginEmails.MKA = 'mk.smith@gmail.com' (a realistic entry error — the two initials differ by one character and the table has 37 rows). maybeSyncEmailToUser writes emailToUser = { 'mk.smith@gmail.com': ['MK','MKA'] }.
MKA signs in with her own Google account. resolveByEmail scans `names` and returns 'MK' (alphabetically first), so completeSignIn puts her on MK's board: she sees MK's bids, and every bid

**[high] Admin can never enter a current-phase bid on a week that carries a dead prior-phase bid**  
`/home/claude/work/vacation-kp.github.io/admin/index.html:6229`

Phase 1 (high-demand only) closes; Dr. MK bid 3 on 2027-11-21 (Thanksgiving) and was denied, so scheduleData.MK['2027-11-21']=3 with bidPhase 1. Phase 2 opens and Thanksgiving still has 1.4 FTE remaining, so Smart Lock unlocks it. MK e-mails the admin "I was on service and missed the window — please put me down for Thanksgiving at 2." The admin opens Add Bid, picks MK / Nov 21 / 2 and gets "MK already has this week"; Edit Selections on the default Current-Phase filter shows no MK row for that we

**[high] persistScheduleChange reports success when the bidPhase tag write fails, silently deleting a re-bid from the allocation**  
`/home/claude/work/vacation-kp.github.io/index.html:1610`

Phase 2. Dr. AF lost 2027-12-19 in Phase 1 with bid 4, so bidPhase.AF['2027-12-19'] already equals 1. On hospital wifi AF re-bids that week at 1: the schedule write lands, then the connection blips and the bidPhase write to 2 is rejected and swallowed. AF sees the bid on their board (local optimistic tag). Two minutes later another physician places any bid, the bidPhase snapshot fires, bidPhaseData is replaced from the server and AF's tag is back to 1. From that moment schedule.AF['2027-12-19']=

**[medium] deleteAllUsers leaves every completed-phase snapshot intact, so "deleted" users still hold locked-in wins that consume capacity and burn bid numbers for the rebuilt roster**  
`/home/claude/work/vacation-kp.github.io/admin/index.html:7334`

Auction is in Phase 3. Phase 1 and 2 are complete; AD won 2027-12-19 in Phase 1 with bid 1, and MK won it in Phase 2 with bid 2 (week capacity 5.0, both FTE 1.0). The admin decides the roster is wrong and clicks "Delete ALL Users", then re-adds the same 37 initials (same initials are the department standard) with fresh FTEs. currentPhase is still 3, so completedPhases {1,2} are still < 3 and still live inputs.
Result on the very next render: computeApprovals for 2027-12-19 starts with winners = 

**[medium] "Add Bid" is the only admin bid-write path that does not clear the priority-lock floor, freezing the user out of the bid the admin just entered for them**  
`/home/claude/work/vacation-kp.github.io/admin/index.html:6247`

Phase 2. LP bids 2 on the week of 2027-08-15, then changes her mind and removes it — bestBids.LP['2027-08-15'] is left at 2, schedule has no entry. She phones the admin and asks for a throwaway 8 on that week instead. The admin uses Edit Selections → Add Bid, picks LP / 2027-08-15 / 8. adminBidIssues returns [] (no rule it checks is broken), so the plain "➕ Add Bid" dialog appears and the bid is written; bestBids.LP['2027-08-15'] stays 2.
LP now sees an 8 on her calendar that she cannot touch: o

**[medium] "Save All Weeks" rewrites all 52 capacities and Smart Lock Controls from a table that renderSlotsPanel deliberately refuses to refresh while the admin's cursor is in it**  
`/home/claude/work/vacation-kp.github.io/admin/index.html:7523`

Two auction admins (the department has a default list of two, firestore.rules:17-20). Admin A is on the FTE Availability panel with the cursor inside the input for the week of 2027-03-07, typing a new value. Admin B, on a phone, corrects the Christmas week 2027-12-19 from 5.0 to 4.0 via saveOneSlot. The slots snapshot reaches A's page, refreshAll fires, renderSlotsPanel returns immediately at line 7436 because `tb.contains(document.activeElement)` is true — so A's `slot_2027-12-19` input still r

**[medium] Completed-phase approvals and denials are published in the world-readable phases doc before results e-mails are sent**  
`/home/claude/work/vacation-kp.github.io/admin/index.html:3985`

Admin clicks Complete Phase 1 at 09:00 and goes into clinic; results e-mails are not sent until 17:00. At 09:05 any signed-in physician opens devtools on the staff site and reads `phasesData.completedPhases[1].approvals` and `.denials` — the complete winner and loser list for all six high-demand weeks, eight hours before anyone is told. They now know exactly which weeks freed up and can plan their Phase-2 bids against the real results while everyone else is still looking at projections.

**[medium] mailQueue alert entries are relayed with no roster validation of the user field, so any registered user can e-mail arbitrary text to any colleague from the department account**  
`/home/claude/work/vacation-kp.github.io/index.html:1345`

Dr. CZ, a registered bidder, opens devtools on the staff site and writes `setDoc(mailQueueRef,{x1:{user:'MTN',body:'Auction admin: your Phase 2 bids were invalidated, do not bid again until told.',ts:Date.now()-60000}},{merge:true})`. Thirty seconds later the next page to run the sweep resolves recipientsFor('MTN') to MTN's real Google and KP addresses and sends that text from the department's EmailJS service, indistinguishable from a genuine outbid alert. Repeating it also burns the shared mont

---

## Coverage

**engine-core** — 5 raw findings. The core of computeApprovals is sound: I extracted the real functions (admin/index.html:1195, 1630, 1656, 1683-1694, 1705-1740, 1782-1875) and the staff twin (index.html:651-988) into an executable harness and differential-fuzzed 300k random configurations over the real 0.1 FTE grid. The two engines

**engine-parity** — 2 raw findings. The two computeApprovals twins are behaviourally identical — I verified this both by statement-by-statement diff and by a 4,000-case differential fuzz of the two extracted engines, which found zero divergence in winners/draws/reviews/losers or any FTE total. Every listed shared helper matches too. T

**phase-lifecycle** — 8 raw findings. Eight defects in the vacation-auction phase state machine, two of them serious enough to change real allocations or hide them from users.\n\nThe worst is structural rather than a write bug: user-facing visibility of a completed phase is gated on `Number(k) < currentPhase` (index.html:1982, :884, :11

**timer** — 9 raw findings. Traced the full timer subsystem across firestore.rules, the staff site and the admin site. The timer *engine* (DEFAULT_TIMER_RULES, getTimerRules, _owNorm, stage0Hours, timerResetHours, quiet-hours helpers, openingWindowActive, timerPhaseStartMs) is byte-identical between the two sites and cannot pr

**rules-security** — 7 raw findings. firestore.rules is structurally sound on the things it explicitly set out to do — per-user bid confinement via emailToUser, server-clock expiry, admin-only control docs, biddingNotClosed at zero extra document-access cost, signInMisses own-key confinement — and I could not break I6 for the bid docum

**bid-validation** — 7 raw findings. Seven defects in the bid-authorization paths. The staff-side gate sequence itself is sound — I re-verified the confirmPriority rewrite and both the NP and numeric branches correctly use the captured local `wk` throughout, and every rule enforced at modal-open is re-enforced at confirm time. The real

**fte-capacity** — 6 raw findings. Six defects in the FTE / week-capacity subsystem, two of them able to break I4 (winners exceeding a week's capacity) with no admin override and no warning anywhere in the UI.

The most serious is a gap in today's own fix. saveFte now snaps FTE to the 0.1 grid (admin/index.html:7425, "[AUDIT 2026-07-

**decisions** — 6 raw findings. The capBreaches rewrite itself is arithmetically correct — I could not construct a false positive or a missed breach from its counting — but its two consumers make it useless at the moments that matter: it is computed from pre-decision state (so it can never warn about the approval being confirmed) 

**backup-restore** — 8 raw findings. The backup itself is complete in coverage — I independently enumerated all 28 `vacations/*` documents touched by either vacation site (and confirmed the schedule app only ever reads vacations/userList, usernames, emails, loginEmails, emailToUser, phases, approvals, passcodes, adminSettings — all cov

**email** — 6 raw findings. Six defects in the e-mail subsystem, all reachable. The most serious is that neither relay ever releases a claim it has written when it abandons an entry after claiming it (staff bails at `typeof emailjs==='undefined'` AFTER the claim; the admin twin has no such guard at all and swallows the resulti

**auth-roster** — 6 raw findings. Six defects found in the authentication / onboarding / roster surface. Two are I6 (identity confinement) breaks: the admin UI never checks that a Google login e-mail is unique, and `_buildEmailToUser` deliberately maps one address to a *list* of initials, so a single mistyped/duplicated address make

**staff-ui** — 5 raw findings. Five defects in the staff site's rendering/client state. The two most serious are (1) the `adminSettings` snapshot handler never schedules a render, so an admin's live `reviewThreshold` change leaves every user's outcome badges and per-week FTE breakdown stale and in direct disagreement with the adm

**fairplay-reports** — 5 raw findings. Five defects. Two are in the Fair Play Monitor's core win test (`_fpWasWinning`), which ignores prior-phase FTE and ignores equal-score ties — together they wrongly accuse physicians of "canceling a bid in a WINNING position" across phases 2-4 and in any draw. One is in the struggling-user flag, whi

**simulator** — 6 raw findings. The simulator's bid-generation logic is largely faithful to the real engine — I verified the high-demand allowlist, per-phase NP toggle, bid-number uniqueness, prior-phase week/number consumption, the bestBids ratchet, bidPhase/bidTimes stamping, the change-log destination, outbid-alert diffing, the

**todays-fixes** — 4 raw findings. Reviewed every 25-Jul marker and the code each change touched. The batch is in much better shape than the previous one: no dead call sites (all 88 admin onclick handlers plus all dynamic ones resolve), all 14 inline scripts pass node --check, approvalReadiness's new {ready,problems,warnings} shape i

---

## Refuted

- [high] adApprove silently swallows the denial-clear write, then completePhase snapshots the user as a permanent winner while every live projection treats them as denied
- [high] _fixClosePhaseBidding reports "bidding closed" even when the server-side biddingClosed write fails — and with the timer off that write is the only thing that closes bidding
- [medium] renderNextStep's missing-week-capacity branch pre-empts the entire phase workflow, and it holds the only call sites for Complete Phase / Begin Phase 1 / Begin Next Phase
- [high] completePhase copies the admin-only decision log into world-readable changesArchive, re-opening the leak that changesDecisions was created today to close
- [low] The published cap rule ("only weeks you win count") contradicts the implementation, which counts every live bid this phase — including NP bids that can never win and bids the admin has denied
- [medium] Smart Lock treats a deliberately-zero-capacity week as "has availability" whenever its Smart Lock Control is 0 or negative, and auto-unlocks it
- [low] weeksMissingCapacity() still pre-empts the entire phase workflow mid-auction — the same regression class delta-audit #5 fixed for missing FTE
- [medium] A backup key that is absent (rather than null) wipes the live document on full restore and deletes the user's live data on single-user restore
- [medium] Signing out mid-relay still claims and then abandons every remaining queued alert
- [medium] adminSaveLoginEmail reports success when the bid-security map sync fails, leaving a user who can sign in but cannot bid
- [high] adminSettings snapshot never re-renders the board — reviewThreshold change leaves every user's outcome badges stale and disagreeing with admin
- [high] bidPhase tag write is fire-and-forget with a swallowed catch while the local tag is set optimistically — a bid that renders as live never competes and is invisible to the admin