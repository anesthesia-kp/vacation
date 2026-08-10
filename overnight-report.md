# Overnight Report — Vacation Auction (Mon 10 Aug 2026, ~1:45 AM)

Two jobs ran tonight while you slept: a **full live auction** driven through your Chrome on build 258, and a **42-agent adversarial audit** of the rounds machinery. Both are done. The short version: **258's fixes all held up live**, the audit found **one critical and five high problems** beyond them, and **builds 259 (admin) + 134 (staff) fixing every critical/high are on your Mac, fully gated, waiting for your push**. Nothing was pushed and no rules deploy is needed.

---

## 1 · The live auction run (build 258) — PASSED

A complete auction, start to finish, through your admin page: **Phases 1–3, then Phase 4 with four rounds**, ending with Complete Phase 4 and the finish stamp ("the auction is finished 🎉"). Every e-mail preview was checked before sending — **12 e-mails total, every one to AF or AAT only**, zero to anyone else. Zero console errors across the entire night.

Everything on our checklist passed, at the exact spots that failed you yesterday:

- **The glitch did not reproduce.** After Complete Round 1, the workflow went straight to "Send Round 1 Results" — not back to Approvals/Denials. Round 2 opened with correct counts ("No bids placed in this round yet", not "0 of 2 decided").
- **Round boundaries behave.** AF's denied bid was retired from the schedule, its number 4 was returned and successfully reused; AAT's announced win stayed locked; the decide panel's current view showed only the open round; the filter offers "Phase 4: Round 1 (locked)".
- **Round-aware wording everywhere** — "Close Phase 4: Round N bidding" on the button, dialog, backup prompt, and toast (the 258 wording fix, live).
- **Timer-expiry close works.** Round 3 was closed by letting a 1-hour timer run out: the auto-close fired, locked all 52 weeks, and Complete Round accepted the timer-expiry closure.
- **Empty round works.** Round 4 ran the "complete the empty round" → "Mark as sent — continue" path with zero e-mails.
- **Privacy held server-side.** Anonymous reads of the staging doc and live decision docs return PERMISSION_DENIED — unsent results genuinely invisible.
- **Final year record correct**: all four round archives published and sent, Phase 4's record is their union, finish stamp set.

The full blow-by-blow is in `live-run-log.md`. The auction data was left in the natural "finished" state — do a **Reset Auction** before your own test today.

## 2 · The adversarial audit — 14 confirmed findings (1 critical, 5 high, 8 medium)

Seven independent reviewer agents swept the rounds machinery from different angles; every finding was then attacked by 2–3 skeptic agents told to refute it. 31 raw findings boiled down to 14 that survived. Per your launch rule, I fixed the critical/high set and only documented the rest.

### Fixed tonight in builds 259/134 (on your Mac, awaiting your push)

**CRITICAL — the "invisible re-bid" (I reproduced it live in Round 4).** The results e-mail tells a denied user their number "becomes available again for the next round," and the Start Round dialog says denied weeks are "re-biddable with any bid." But when a user actually did that, the admin page treated the fresh bid as already-settled Round-1 history: it never showed up as pending, never appeared on the decide panel, the approve/deny buttons refused it, and no round would ever announce or retire it. It would have squatted invisibly for the rest of the year, silently consuming that user's bid number and cap slot while still competing in projections. Root cause: the admin's archive-checker matched denials by name only, while the staff site's twin correctly checks whether the *exact denied bid* is still on the board. One-function fix, mirrored from the staff site — every counter and gate heals at once. I verified it live: bid placed via Edit Selections showed "No bids placed in this round yet" on the 258 dashboard.

**HIGH — mass re-mail trap.** After finishing Phase 4 in rounds mode, the always-visible green "Send Phase Results" button on the Messaging Users card would have e-mailed **every decided user the entire year's results again** (~37 people), with zero dedup — the exact recap you ruled out. The dashboard's guided flow had the guard; this second button didn't. It now routes exactly like the guided flow: unsent round → round sender; finished-in-rounds → the no-e-mail finish stamp; already stamped → "nothing to send."

**HIGH — staff same-value re-bid trap.** A build-131 comment *promised* "you can't re-bid the EXACT denied bid," but no code enforced it. A user who re-bid the same value (the most natural act — their preference didn't change) got a bid that saved and then instantly froze as the old denial: uncancellable, invisible in My Bids, permanently eating a number and a cap slot with no recovery. Staff 134 makes the promised block real, with a clear message telling them to pick a different value.

**HIGH — staff e-mail addresses were public.** The "who already got this e-mail" ledger (raw addresses of everyone mailed) was being written onto the world-readable phases document — readable by anyone with the site's public config, no login needed. This is exactly the PII your rules carefully gate everywhere else. The ledger now lives on the admin-only staging document; no rules change needed. The addresses leaked so far are only AF/AAT test addresses, and your pre-launch **Reset Auction wipes them**.

### Documented, not fixed (mediums — none block launch in single-admin use)

In your normal one-admin usage these are edge cases; they matter mostly if two admins ever work simultaneously or a send is interrupted mid-loop: the send claim expires after 120s while a long e-mail loop could still be running (a second Send click mid-send could duplicate already-delivered mails — don't double-click Send; the per-address ledger limits the damage); two multi-admin write races on the claim/ledger fields; a cold-load beat where round state renders before the staging doc's first snapshot; the bulk Approve-All/Deny-All buttons bypass the archived-decision guard; a technically-invalid approved bid is silently dropped from a round archive at Complete Round; and the priority-floor/won-week locks remain client-side only (a devtools user could bypass them — the engine catches most of it; documented residual). Also 14 low-severity items were found but deliberately not verified or chased (list preserved in the raw audit report) — mostly labels, history display, and cosmetic round-numbering; one worth knowing: **the cloud-backup list doesn't record round numbers**, so a year of round backups all say "Phase 4."

## 3 · What's on your Mac right now

Site repo: `admin/index.html` (BUILD 259), `index.html` (BUILD 134), `versions.json` (259/134/17), commit message ready in `.claude-commit-msg.txt`. Tests repo: three updated suites + commit message. **Full gate passed**: syntax clean, 12 suites / 1028 assertions (24 new regressions for tonight's fixes), handler audit 176/0, full every-button sweep clean on both sites. firestore.rules untouched.

## 4 · Suggested morning sequence

Push both repos → confirm versions.json shows 259/134 live → **Reset Auction** (clears my overnight test data AND purges the leaked test addresses) → run your own test. The one new behavior worth trying yourself: deny someone in a round, start the next round, and re-bid that week — different value should appear as a normal pending bid; the exact same value should be politely refused.
