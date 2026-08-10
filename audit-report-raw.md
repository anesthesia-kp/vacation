# Vacation Auction — Phase 4 Rounds Audit: Final Report

**Audience:** Lead admin. Plain-language explanations come first; the code locations ("anchors") are there for whoever applies the fixes.
**Scope:** Phase 4 rounds machinery, staff builds 131–133 / admin builds 255–258, plus the Firestore rules as they interact with rounds.
**Date:** 2026-08-10

---

## 1. Verdict

The rounds machinery is **not yet safe for live use**. The core round cycle (close → decide → complete → send → next round) works, and the build 256–258 fixes hold — but the audit confirmed **one critical defect and four high-severity defects**, all adversarially verified against the actual code. The critical one is triggered by the *normal, advertised* workflow: your own results e-mail tells a denied user their bid number "becomes available again in the next round," but if they actually re-bid that same week, the admin site permanently loses track of the bid — it can never be decided, announced, or retired, yet it keeps competing for capacity all year. Two more findings publish staff e-mail addresses to the open internet. None of these require a hostile user with devtools; most require nothing but ordinary clicks. The good news: every fix is small and localized, and the worst family of bugs shares a single root cause (one helper function on the admin site missing a comparison its staff-site twin already has). **Recommendation: apply fixes A–D below before running another round; the rest before Phase 4 ends.**

---

## 2. Confirmed findings (ranked by severity)

### A. CRITICAL — A re-bid on a previously denied week becomes invisible to the admin forever

*(Two independent verification tracks confirmed this; a third confirmed the staff-side view of the same drift.)*

**What breaks in practice.** Say AA is denied week w2 in Round 1. You send Round 1 results (the e-mail explicitly invites re-bidding), start Round 2, and AA places a fresh bid on w2 with a different value — exactly as designed and advertised. From that moment:

- The admin dashboard shows **0 pending** for that bid; it never appears in the decide panel's current view.
- The Approve/Deny buttons **refuse** it with "archived round results cannot be changed" (the site thinks it's Round 1 history).
- Complete Round 2 passes its gate without deciding it; Send Round 2 never e-mails AA; Start Round 3 never retires it; Complete Phase 4's safety check never notices it.
- Meanwhile the bid **still competes in every projection** (it shows up in Draws & Reviews as a live competitor — whose buttons then refuse to work), consumes AA's bid number and cap slot, and on the staff site can even display as "Winning."

The bid squats undecided for the rest of the year. AA gets no outcome and no e-mail. Nothing surfaces the problem; the only escape is a manual schedule edit nothing prompts you to make.

**Root cause (one function).** The staff site's `p4AnnouncedDecision` (staff `index.html` ~926–938) deliberately treats a denial as "settled history" only while the *exact denied bid* is still on the board — a fresh re-bid reads as new and live. The admin twin, `_p4ArchivedDecisionRound` (admin `index.html` ~2058–2066), skips that comparison: it flags the user+week as archived history *forever*, regardless of what bid is actually there now. Every admin counter, gate, panel filter, and decision guard keys off this helper (`countPendingDecisions` :4304, `renderPhaseProgress` :2554, `simHasUndecidedBids` :3921, Complete Phase pending list :4638, decide-panel filter :6623, all four decision guards :6967/:7019/:7041/:7059).

**How to reproduce.** Deny a user's bid in Round N → Complete Round N → Send Round N Results → Start Round N+1 → have that user re-bid the same week with a different value → look at the admin dashboard: pending count is 0, decide panel doesn't list it, Approve/Deny refuse it, and the bid still appears in Draws & Reviews and projections.

**Smallest fix.** In `_p4ArchivedDecisionRound`, mirror the staff twin: for the *denials* branch, only return the archived round if the live bid still exists **and** JSON-equals the archived snapshot value (`arch.schedule[u][wk]`, which the archive already stores). One added condition; every downstream consumer then behaves correctly. Add a regression test to `test-p4-rounds.mjs` for "re-bid after retirement" — the current suite never exercises it.

---

### B. HIGH — A same-value re-bid on a denied week saves, then instantly freezes forever on the staff site

**What breaks in practice.** Same setup as A, but the user re-bids the denied week with the *same* bid value (the natural act — "I still want my 5 on that week"). The dropdown offers the number (it was returned), every gate passes (the old bid is gone at check time), the save lands — and then the bid *immediately* matches the Round 1 archive again and freezes as "DENIED in Round 1": no edit button, no cancel button, dropped from My Bids, with a message saying it "will clear automatically when the next round opens." **That message is false** — no later round ever retires it (retirement only touches the just-announced round's archive), and per finding A the admin can't decide or clear it either. The user has permanently burned one bid number and one cumulative-cap slot on a bid nobody will ever adjudicate, and it still competes in staff projections.

**Root cause.** A build-131 comment in staff `index.html` (~1955–1958) promises that re-bidding "the EXACT bid the results e-mail already denied" is blocked at confirm time — **but that check was never written**. The only gate (:1953) is `p4AnnouncedDecision`, which returns null at submit time because the retired bid is absent. The moment the write lands, the value matches the archive again and the denial "resurrects" (freeze surfaces: :2524, :2718, :1828, :2056).

**How to reproduce.** Deny a bid, send, start next round, then re-bid the same week with the identical value. The bid saves and instantly freezes with no user or admin recovery path.

**Smallest fix.** Implement the promised check: at confirm time, compare the *candidate* value against the archived denied value for that week (`p4Rounds[N].schedule[user][wk]`) and block an exact match with a clear message. Fixing A alone does not fix this (this is a staff-side gap); both edits are a few lines each.

---

### C. HIGH — The permanent "📮 Send Phase Results" button will mass re-mail every user their full-year results after Complete Phase 4

**What breaks in practice.** After you click ✓ Complete Phase 4 in rounds mode, the correct final step is the "Mark results sent" stamp — you ruled that a full-year recap e-mail would wrongly repeat months already past, and the dashboard's next-step box honors that. But the **Messaging Users card still shows its permanent green "Send Phase Results" button** (admin `index.html` :537), and it's the more obvious click. That path (`sendPhaseResultsEmails`, :5359) has no rounds-mode awareness: it targets the staged phase-4 year record (the union of every round archive), finds its dedup ledger empty (round sends were logged under different keys — `resultsSentTo['p4r'+N]`, not `resultsSentTo[4]`), and after one confirm dialog mails **every decided user of the entire year a duplicate recap** (~37 users, up to ~74 addresses), burning EmailJS quota. Worse, the send then stamps `resultsSent[4]`, so the mistake self-conceals.

**How to reproduce.** Complete all rounds, click ✓ Complete Phase 4, then click "Send Phase Results" on the Messaging Users card and confirm the preview.

**Smallest fix.** In `sendPhaseResultsEmails`, when the target phase is 4 and `phasesData.p4Rounds` is non-empty, refuse with a toast pointing to the finish stamp (`_p4FinishStamp`) — the same guard the next-step box already has, applied at the second entry point. One early-return.

---

### D. HIGH — The "results sent" ledger publishes staff e-mail addresses to the open internet

*(Confirmed twice under two lenses: raw PII harvest, and pre-announcement round-membership inference.)*

**What breaks in practice.** Every time results are sent (classic phase or round), the list of **raw e-mail addresses actually mailed** — Google login addresses and personal/KP addresses — is written into `resultsSentTo` on the `vacations/phases` document (round sender :5678, classic :5489). That document is **world-readable by design** (so staff can see announced results), and the rules never gate this field: anyone on the internet holding the page's public Firebase config — no login at all — can read it and harvest every address ever mailed, across every phase and round. This directly defeats the protections the rules deliberately put on the `emails`/`loginEmails`/`mailQueue` docs (firestore.rules :57–70, :216–218). Bonus leak: the ledger is written *before* the publish gate, so during a partially failed send an outsider can infer **which users had decisions in a round that hasn't been announced yet**.

**How to reproduce.** From any browser with the public Firebase config, do an anonymous `getDoc('vacations/phases')` and read `resultsSentTo`.

**Smallest fix.** Stop storing raw addresses on the public doc. Either (a) move the ledger to the admin-only `phaseStaging` doc (both senders read/write it, so it never needs to be public), or (b) store salted hashes of addresses (the pattern the welcome log already uses). Also migrate/delete the existing `resultsSentTo` keys already sitting on the live phases doc — fixing the code does not un-publish the data already there.

---

### E. MEDIUM — A second "Send" click during a long send re-mails the whole round

*(Confirmed twice independently.)*

**What breaks in practice.** The anti-double-send claim expires after 120 seconds and is never refreshed while the e-mail loop runs (:5648), but a ~35-user round at normal EmailJS speed takes 2–3 minutes with **no progress indicator** — the confirm modal closes instantly and the Send button stays on screen (the "sent" stamp lands only at the end). The per-address dedup ledger is also only saved to the server **after** the whole loop (:5678). So if you (or a second admin) click Send again past the 2-minute mark, the new run sees a stale claim, finds an empty ledger, and re-mails every address the first run already delivered to. The classic sender (:5452/:5489) has the identical structure.

**How to reproduce.** Start a round send with 30+ decided users on a slow connection; click Send again after ~2 minutes and confirm.

**Smallest fix.** Three small, complementary edits: refresh `claim.at` inside the loop (heartbeat every few sends); persist `sentAddrs` to the ledger incrementally instead of only at the end; and add `!(phasesData.p4RoundResultsSent||{})[N]` to the confirm-time re-check. Even just the incremental ledger write alone closes most of the window.

---### F. MEDIUM — Concurrent senders can silently erase each other's "already mailed" records

**What breaks in practice.** When each sender saves its ledger, it copies its *local, possibly stale* snapshot of the whole `resultsSentTo` map back to the server (:5489, :5678; same pattern in the claim releases :5506/:5518/:5691/:5707). If a leftover unsent Phase 3 is being retried by one admin while another sends Round 1 (both are reachable at once — advancing with unsent results is only a warning), whichever write lands last can **revert the other's ledger to an older state**. A later retry then re-mails addresses that were already delivered — defeating the exact dedup the ledger exists for. The same pattern can overwrite another session's *active* send claim with a stale released one.

**How to reproduce.** Requires two admins sending different targets concurrently with listener lag — a race, not deterministic, which is why it's medium.

**Smallest fix.** Write only your own key: `setDoc(phasesRef,{resultsSentTo:{[key]:[...sentAddrs]}},{merge:true})` — drop the `...(phasesData.resultsSentTo||{})` spread at all six sites. With `merge:true`, untouched keys are preserved automatically; the spread is not just unnecessary, it's the entire bug.

---

### G. MEDIUM — The staging feed has no "loaded yet?" flag, so the dashboard can act on a half-loaded picture

**What breaks in practice.** The page waits for five data feeds before showing workflow buttons, but the **sixth** — the admin-only staging doc that holds a completed-but-unsent round — sets no ready flag (:1654). On a slow or flaky connection (like the documented 30 Jul feed outage), a freshly opened admin page can render before that feed arrives. In that window: the archived-decision freeze **fails open** (an admin can flip an announced round's decision), the next-step box wrongly offers "✓ Complete Round N" again for an already-completed round, "Send Results" says there's nothing to send, and a re-click of Complete Round can **overwrite the staged archive** with rebuilt (possibly flipped) decisions — quietly violating "archived decisions are immutable." This is a sibling of the exact bug class build 258 fixed for the published side (invariant 6).

**How to reproduce.** Complete a round but don't send; reload the admin page on a throttled connection so the staging snapshot arrives last; observe the wrong next-step button and unguarded decision buttons until it lands. (The worst overwrite needs a narrow race; the fail-open guard window is the reliable part.)

**Smallest fix.** Add a `_stagingReady` flag set in the phaseStaging listener, include it in the `renderNextStep` readiness gate (:4430), and have the four decision guards plus `completeP4Round` refuse (or re-fetch) until it's set — the same pattern the other five feeds already use.

---

### H. MEDIUM — The bulk Approve-All / Deny-All buttons skip the "archived history" guard

**What breaks in practice.** The four single-bid decision buttons refuse to touch archived-round decisions; the bulk paths — `adApproveAllWinners` (:7074), `adDenyAllLosers` (:7114), and the auto-decide loop (:7312) — never check. Combined with finding A's ghost re-bid, a bulk click can decide a bid the panel says is settled history, and Complete Round then archives it: the year record can end up saying **both DENIED (Round 1) and APPROVED (Round 2) for the same user and week**, the round e-mail says "approved," and every panel display resolves to the *old* DENIED entry. The permanent record disagrees with what was mailed.

**How to reproduce.** Ghost re-bid from finding A projecting WIN → click "Approve All Winners" → Complete Round → compare the two round archives and the panel display against the sent e-mail.

**Smallest fix.** Fixing A removes the main trigger. Belt-and-braces: add the same `_p4ArchivedDecisionRound` skip to the three bulk/auto paths (one condition each), and have Complete Round's archive filter (:5570–5572) skip any user+week already present in an earlier round's archive.

---

### I. MEDIUM — Complete Round silently drops a disqualified approval; the "approval" is never announced and re-pends next round

**What breaks in practice.** The Complete Round gate counts a bid as "decided" if a live approval exists — but the archive filter then **silently drops** an approval whose bid became rule-breaking (e.g., the admin later added the same bid number on another week for that user via the Edit table, clicking through the dismissible "already used" warning). The confirm dialog says "✓ 1 approval," the round e-mail omits it, and after Start Round N+1 clears live approvals, the bid **re-appears as pending, undecided, with no explanation**. In classic mode this drop at least ended with the phase; in rounds mode it carries forward as confusion.

**How to reproduce.** Approve user AA on week A with number 3; via Edit table add number 3 for AA on week B (dismiss the warning); deny week B; Complete Round (gate passes, dialog shows the approval); Send (AA is mailed only the denial); Start next round (week A re-pends).

**Smallest fix.** Make Complete Round's confirm dialog reconcile: if the archive filter would drop any live decision, **block completion and name the affected user+week** instead of proceeding silently (:5570–5571). Also consider warning, at Edit-table time, when a duplicate-number add would void an existing *approval*.

---

### J. MEDIUM (accepted-residual candidate) — The bid floor and won-week locks are enforced only in the browser, not by the server rules

**What breaks in practice.** Firestore rules can confine a user to writing only their own top-level key, but cannot inspect the per-week values nested inside it — a limitation the rules themselves document (firestore.rules :161–162). So during an open bidding window, a user with devtools can lower or delete **their own** priority floor in `bestBids`, or rewrite **their own** live schedule value on a week they already won, bypassing the client-only equal-or-better rule. Verified limits: they cannot touch anyone else's bids, cannot alter the admin-only round archives or the year record, and the announced results stay intact. Rounds neither introduce nor worsen this — they replicate a pattern already present at every phase boundary.

**Smallest fix.** Not fixable in rules without a server component. Recommended: log it as a formally accepted residual (with a comment in the rules mentioning `bestBids`/won-week specifically), and optionally add an admin-side anomaly check that flags a floor value that got *weaker* between snapshots.

---

## 3. Items needing a human look

None. Every finding the audit surfaced was either confirmed by multiple independent verification passes (all listed above) or discarded; no verifier splits remained.

---

## 4. What this audit did NOT cover

- **Phases 1–3 classic machinery** beyond where it shares code with the round senders (findings C, E, F touch shared code; the classic flows were not independently re-audited end to end).
- **EmailJS delivery itself** — template rendering, provider-side failures, spam filtering, and quota behavior were taken as given; only the app's send/dedup/claim logic was examined.
- **Live-fire testing against production Firestore** — all verification was code-trace and locally executed extracted functions plus the existing test suites (12 suites, ~1,004 assertions, all green — note the suites do **not** cover the re-bid-after-retirement paths at the heart of findings A/B/H; adding those tests is part of the fixes).
- **The sign-in / account-verification pipeline, timer/smart-lock internals, and FTE/capacity math** — reviewed only where the rounds machinery touches them, not audited in their own right.
- **Operational concerns** — backup/restore of the phases and staging docs, GitHub Pages deployment integrity, and multi-admin coordination policy are process matters outside the code audit.

**Suggested order of work:** A + B (one small edit each, same root cause family, blocks the next round) → D (privacy, includes scrubbing already-published addresses) → C (one guard) → E + F (send-path hardening, six one-line edits plus a heartbeat) → G, H, I → J documented as accepted residual.