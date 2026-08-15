# Rules publish — build 268 · owner checklist (console, ~15 minutes)
The rules file ships in the same push as the pages, but Firebase only applies it when YOU
publish it in the console. Do this AFTER the push, in a quiet window (rehearsal paused/complete,
nobody bidding). The pages are safe either way in the meantime — the client locks are live.

## 0 · Before anything
- Firebase console → Firestore Database → **Rules**. Open the **History** tab once, just to see
  the one-click revert list. This is your undo.
- Copy the CURRENTLY-published rules into a scratch file (belt and braces).

## 1 · Paste, then Playground BEFORE publish
Paste the new `firestore.rules` into the editor (don't publish yet). Open **Rules Playground**
and simulate against the DRAFT — auth = your admin Google UID with verified e-mail:

| # | Simulate | Expect |
|---|---|---|
| 1 | update `vacations/adminSettings` — payload sets `auctionConfig` to its EXACT current value | **Allow** ← the same-auction-restore case; if this DENIES, STOP and tell the session |
| 2 | update `vacations/adminSettings` — change `bidFloors.highDemand` to another value | **Deny** (auction underway) |
| 3 | update `vacations/adminSettings` — change `auctionConfig.year` | **Deny** |
| 4 | update `vacations/adminSettings` — `{emailNotifsEnabled:false}` only | **Allow** |
| 5 | delete `vacations/adminSettings` | **Deny** |
| 6 | update `vacations/adminSettings` — `{requiredBuilds:{index:999,admin:999}}` | **Allow** (gate must work mid-auction) |
| 7 | same as 2 but signed out / non-admin | **Deny** |
| 8 | update `vacations/adminSettings` — nested single field `auctionConfig.year` via field path | **Deny** |
| 9 | update `vacations/adminSettings` — payload `{bidFloors: <deleteField>}` | **Deny** |
| 10 | update `vacations/passcodes` as a REGISTERED NON-ADMIN user | **Deny** (was Allow before 268) |
| 11 | get `vacations/passcodes` signed OUT | **Allow** (login bootstrap must keep working) |
| 12 | update `vacations/bidLowerings` as registered user JD, payload touching ONLY their own key | **Allow** (timer off / bidding open state) |
| 13 | update `vacations/bidLowerings` as JD touching KQ's key | **Deny** |
| 14 | GAP state (set phases: completedPhases has currentPhase key AND resultsSent has it) — update `adminSettings` changing `bidFloors` | **Allow** (between-phases unlock) |
| 15 | Same GAP — update changing `auctionConfig` but SAME `year` | **Allow** |
| 16 | Same GAP — update changing `auctionConfig.year` to a different year | **Deny** (year is Reset-only) |
| 17 | Phase COMPLETED but results NOT sent (completedPhases has the key, resultsSent does NOT) — change `bidFloors` | **Deny** (the private-decisions window stays locked) |

All 17 as expected → **Publish**.

## 2 · Immediately after publish (60–90 seconds)
1. Staff site, test account: sign in, place a bid, remove it. (Proves no unrelated clause broke —
   the realistic failure mode.)
2. Admin page: flip any e-mail toggle → works.
3. Admin page devtools console — the live denial proof (safe by construction: it must fail):
   `firebase` isn't global; easiest is the Bid Floors card → change a floor → Save. Expect the
   new plain-language toast: "🔒 The auction is underway — the bid floors are locked on the
   server…". (The card's own click-refusal fires first if Phase 1 has begun — that toast also
   counts as PASS for the client half; the server half was proven in the Playground.)
4. Later, at launch-eve Reset: after Reset Auction, the Calendar/Floors/Lowerings cards unlock
   and save normally — proves the unlock path live.

Anything unexpected → History tab → revert to the previous version → tell the session.
