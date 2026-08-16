# NEXT CHAT START PROMPT — KP Vacation Auction (+ Daily Schedule)
**Written 15 Aug 2026 by the session that shipped build 268/139+rules and built 269. Read fully before touching anything. Supersedes the previous version of this file AND `handoff.md`.**

## ⚠️ FIRST THING TO KNOW
**A LIVE GROUP REHEARSAL WITH REAL USERS (~60 anesthesiologists) IS STILL UNDERWAY.** As of writing: Phase 2 is complete with results sent (the auction sits in the between-phases gap; Phase 3 not yet begun). Treat every action as production. "Rehearsal Mode" the software toggle is the owner's personal testing switch and is normally OFF during this live rehearsal — don't conflate the two.

## What this is
Live production system: vacation-week auction for ~60 anesthesiologists (Kaiser East Bay).
- Staff site: `vacation-kp.github.io/index.html` → https://anesthesia-kp.github.io/vacation/
- Admin site: `vacation-kp.github.io/admin/index.html` (~780KB, single file)
- GitHub Pages + shared Firebase (Firestore, Google login). Repo `anesthesia-kp/vacation`, local at `Documents/GitHub/vacation-kp.github.io`.
- **Tests live in the SIBLING repo** `Documents/GitHub/tests/`.
- The **Daily Schedule** system (next session's development focus — see Outstanding §3) shares the Firebase project under the `dailysched` collection; its repos/pages are PRIMITIVE and far from real use.

## Current state
**Live: admin 268 / staff 139 / mobile 17, rules PUBLISHED** (pushed + console-published by the owner 15 Aug; post-publish live checks 1–4 green). 268/139 delivered: 7-key server config freeze with BETWEEN-PHASES unlock (gap = results SENT and next phase not begun; auction YEAR is Reset-only forever), passcodes admin-write-only, restore cross-config pre-flight, plain-language denials, stale-build gate (cache-busted reloads + refocus re-check + requiredBuilds ratchet), HD checkboxes (default all six checked), Bid Lowerings (live at default 0 = behavioral no-op), smart-copy auto-collapse, phase-derived staff title (Fall/Rolling), and the KP-e-mail-prompt race fix (never re-prompts a user who answered). The 17-case Playground checklist (`build268-staged/RULES-PUBLISH-CHECKLIST-268.md`) was superseded by live checks; sims remain OPTIONAL — note the expected results flip with auction state (gap vs mid-phase), and cases 1/15/17 are better proven by their live equivalents (case 1: a no-change calendar save mid-phase; case 17: a floors save in the completed-but-unsent window must refuse).

**Build 269 (admin only) is BUILT + FULLY AUDITED and sits UNPUSHED on the owner's Mac.** → **The next session's first order of business: have the owner push it** (commit msg ready in `.claude-commit-msg.txt`; files: admin/index.html, versions.json, TODO.md, build269-staged/; **NO Firebase console step** — rules unchanged), then live-verify versions.json = `{"index":139,"mobile":17,"admin":269}` cache-busted. Until 269 is live, the owner must NOT restore-then-resend results.

## The 15 Aug incident (why 269 exists) — read `build269-staged/BUILD-NOTES-269.md` + `ADVERSARIAL-AUDIT-269.md`
During the rehearsal, a Full Restore of a pre-completion backup followed by re-completing and re-sending Phase 2 results e-mailed **all 31 users a duplicate results e-mail** (the owner tried both cloud and file restores — same outcome). Root cause, reconstructed from the owner's own backup file and REPRODUCED end-to-end in the browser harness: at critical moments (send skip-list, publish, begin-phase, restore preserve, change-log archive) the admin page trusted its own possibly-stale in-memory mirrors. One feed blip during the send let the publish step erase the just-written delivered-address ledger and leave the server torn (resultsSent stamped, completedPhases unpublished — captured verbatim in the owner's 12:15 backup); the phase-2 change log was also reset without being archived. 269 = **server-truth reads (`getDocFromServer`) at every such moment, refusing in plain language when unverifiable** — plus the Full Restore feed-health gate that was missing. The incident reproduces on the 268 bytes (4/4 duplicated) and cannot occur on 269 (harness-proven both ways: `tests/sweep268/resend-repro-test.mjs`, env `SITE_ROOT`/`PORT` for fixture runs).
**Consequences to carry forward**: the duplicate e-mails can't be unsent; EmailJS quota took ~31–62 extra sends — check the meter before any bulk send. And a binding lesson: **never reassure the owner a protection exists without executed proof** — the ledger "protection" was asserted from code-reading and failed in production the same hour.

## Owner rulings from 15 Aug (do not re-litigate)
- **No e-mail freeze / no results-e-mail toggle feature.** The owner's need (advance the workflow without e-mailing during testing) is served by Rehearsal Mode's **"⏭ Skip sending (testing)"** button: toggle Rehearsal ON → skip-send → toggle OFF. Verified staff-invisible. Cautions: don't touch the simulator/auto-approve buttons while on; use "Cloud Backup & Continue", never the dashed skip-backup button; skipped users never get that phase's results e-mail.
- Between-phases edits of all 7 fairness dials are sanctioned (that's what the gap unlock is FOR); year changes remain Reset-only.

## Outstanding work, in order
### 1 · Owner pushes 269 (first thing) — then the rehearsal continues
Support the rehearsal: Phase 3 begin/close/complete/send, gap edits as the owner wishes. After 269 is live, restore-then-resend is safe again ("already sent — nothing new to send").
### 2 · Optional, owner's leisure: remaining Playground sims (adjusted expectations above)
### 3 · **NEW MAIN DEVELOPMENT TRACK: the Daily Schedule repos** (owner-requested focus for the next session)
The owner wants real headway on the schedule system — "still primitive and far away from actual use." Start by SURVEYING before building: inventory `Documents/GitHub/schedule/` (and the `schedule/` page in the site repo — it reads the auction's `adminSettings` read-only), the `dailysched` Firestore collection and its rules section (own `dailysched/adminAccess` admin list, independent of the auction's; `fteMap` locked to sched-admins [H-5 part 1]; the deeper H-5 per-author validation for requests/swaps/auditLog is DEFERRED pending a subcollection migration). Then agree a roadmap with the owner in plain language before writing code. The auction's house rules (small changes, executed tests, adversarial audits for anything fairness-adjacent, owner pushes) apply there too.
### 4 · THE FINAL EXHAUSTIVE MULTI-CLAUDE ADVERSARIAL AUDIT (before real launch; the owner must explicitly opt in — "run a multi-agent workflow audit" / "ultracode")
Shape (unchanged from prior planning): blind finder dimensions (fairness engine & NE-1..13 · floors+NP · calendar/config & twin identity · mail system incl. the NEW 269 ledger paths · backup/restore/reset · rules-vs-client incl. the gap unlock · phase lifecycle & P4 rounds · UI/dialog guards · staleness/races — note the stale-mirror class is now a PROVEN killer, hunt its siblings · copy truthfulness) → 2–3 adversarial skeptics per finding → loop-until-dry. Feed live-verified artifacts; run the existing battery first so agents chase gaps.
### 5 · LAUNCH-EVE ritual (after the audit)
Build ~270 only if the audit confirms findings → backup-and-restore drill (NE-9) → timer pass (NE-12) → optional `FUZZ_N=500000` → **Reset Auction** → owner configures the real year (calendar, floors, HD checkboxes, lowerings allowance).
### 6 · Housekeeping
Owner commits/pushes the `tests` repo whenever (currently modified/new: tests-build269.mjs, tests-build268.mjs, test-p4-rounds.mjs, test-audit-fixes.mjs, sweep268/{resend-repro-test,gate-bl-cal-test,fake-firestore}.mjs, sweep/fake/firebase-firestore.js, plus earlier-filed suites). `_to_delete/` in the site repo holds era-fixture scratch (era267/era268) — never commit; owner deletes in Finder whenever.

## Working discipline — binding house rules (unchanged + new lessons)
- THE OWNER does all git pushes personally. Never push, never deploy, never write to production Firebase. He is not a coder: plain language, high-quality code, PUSH BACK on bad ideas.
- Smallest change → explicit "go" → only that change. Targeted edits (admin file ~780KB, never rewrite).
- Every fix ships with tests that EXECUTE real extracted code + an honesty check proving failure on the pre-fix build. Bump `var BUILD` AND `versions.json` together; refresh `.claude-commit-msg.txt`. Fairness-critical → adversarial audit before ship. Twins stay byte-identical where meant.
- **Sandbox convention**: new references inside functions that extracted-code sandboxes run are typeof/spread-guarded — legacy scope ⇒ exactly the prior build's behavior; production always has the symbols; pins fail if a guard is removed. (269 extended this to `_ledgerFresh`/`getDocFromServer`.)
- **Server-truth convention (new, from the incident)**: any decision that can mass-e-mail, destroy, or publish must read the server (`getDocFromServer`) at action time and fail CLOSED with a plain-language toast. Never trust in-page mirrors for such decisions; never claim a protection without an executed reproduction.
- Deploy is TWO steps: Claude files to the working tree (md5/byte-verify device==cloud after filing), owner commits+pushes in GitHub Desktop; live-verify versions.json cache-busted after every push. WebFetch strips scripts — versions.json is the live marker.
- E-mails only to test accounts during testing; EmailJS quota limited; the shared template `template_rss3fn3` footer carries the site link — never re-add it in code.
- **Device-bridge lessons**: git commands through the bridge leave stale `index.lock` files (the bridge can't delete) — use `git --no-optional-locks` for any read-only git on the device, and if GitHub Desktop reports a lock, `mv` it aside (never rm). Staging can fail with `untrusted_device` 403 — the owner re-signs in via the desktop-app banner. Era fixtures reconstruct from device git (`git show <ref>:path`): era-267 pair md5 daf370c8/8d98ddd2, pushed-268 admin md5 14f9614193922b7e0fea592bfeee5e21.

## Verification toolbox (tests sibling repo; fixtures at /tmp in cloud sessions)
`run-all.mjs` (8 suites red = documented honesty-baseline class ONLY — verify non-honesty count is 0, don't chase) · `tests-build268.mjs` (197, `--pre` vs /tmp/{admin,staff}.html + rules-pre = 267/138 era) · `tests-build269.mjs` (40, `--pre` vs /tmp/build268/admin_index.html) · `sweep268/gate-bl-cal-test.mjs` (41 browser E2E) · `sweep268/resend-repro-test.mjs` (12; the incident regression test — MUST stay green; SITE_ROOT env replays it against old builds) · `mega-fuzz.mjs` reads /tmp/build267/* — **copy the CURRENT final bytes there before fuzzing, and restore the era-267 pair before running tests-build267** (fixture juggling; era pairs live in device git) · classic sweep (`make-site.mjs` → `driver.mjs` 4-pass, `phase-runthrough.mjs`, `cal-editor` 14, `bf-card` 10, `autoclose` 5, three mobile sweeps — one pre-existing advisory: rememberMe <32px) · `audit-handlers.mjs` (182/0) · engine byte-diff vs era-267 (32 fns) + twin generators. The sweep fakes now support `getDocFromServer` and `__fakeStore.mute/unmute` (connection-blip simulation).

## Known accepted behaviors (owner-ruled — do NOT "fix")
- Reset+restore re-welcomes every user once. Deleting a prior-phase winner keeps their FTE entry. Draw wheel takes no automatic action. Review overage 1.0. Reset keeps rehearsal armed. Staff site has no auto-reconnect.
- Fairness dials are editable ONLY pre-auction and in the between-phases gap (results sent); locked while a phase runs and in the completed-but-unsent window; YEAR is Reset-only — the 🔒 states are correct.
- The exhausted-lowering refusal never mentions the admin override. Results-send "already sent — nothing new to send" after a restore is CORRECT behavior, not a bug.

**First moves for the new session**: read this file, `TODO.md`, `build269-staged/BUILD-NOTES-269.md`, `NEVER-EVENTS.md`; verify live builds (versions.json, cache-busted); ask the owner where the rehearsal stands; get 269 pushed and live-verified; then open the Daily Schedule survey. The standard: every claim executed, every fix honesty-proven, every fairness change adversarially attacked, the owner's authority absolute — and no reassurance without reproduction.

---

## FILE HYGIENE — a STANDING RULE, not a one-off tidy-up

The owner's instruction, 16 Aug 2026: *"As files in my github folder pile up, I would like
to remain organized and remove old files. Please ensure that all obsolete files are placed
into a to delete folder or archive folder for when a file might be useful in the future."*

That applies to **every future session, in every repo.** It is not a task that was done
once; it is how this folder is kept.

**Where things go.** The main folders hold only what is live or in flight. Anything
outdated moves to `~/Documents/GitHub/_archive/<repo>/<category>/`, which sits OUTSIDE
every repo — so GitHub never serves it and GitHub Desktop never shows it, while every byte
stays on disk. True junk (`.DS_Store` and the like) goes to `_to_delete/`. **Nothing is
ever deleted.** "Archive" is the default; "delete" is only for machine-generated litter.

**The test, before moving anything.** Grep the WHOLE GitHub folder and move a file only
after confirming that no live page, no test suite, and no current handoff/TODO reads it.
**If you are unsure, it stays.** Being wrong costs a broken URL or a red battery; leaving
one extra file costs nothing.

**Never move** anything the live site serves. Be careful with files whose names look like
junk hashes — `0c0fd0a8….html` (schedule), `2nd-admin-page-234asld.html` and
`a5696c46….html` (auction) are **live redirects for old admin URLs**, not litter. Open one
and read its `<title>` before assuming. That guess was made wrong once already.

**Record every move** in `_archive/README.md`: what moved, where to, why, and — just as
important — what was deliberately KEPT and the reason. That file is the inventory; this
rule is the procedure. Do not duplicate one into the other.

**Scratch files must be gitignored, never committed.** `.claude-commit-msg*.txt`,
`.DS_Store`, staged build folders. ⚠️ **`.gitignore` does NOT apply to files git already
tracks.** Adding the rule is not enough: the tracked path must be **absent** in that commit
for the removal to land, so write that build's message to a name that is not yet tracked
(e.g. `.claude-commit-msg-hk.txt`). Writing the usual name recreates the tracked file and
turns a clean deletion into a modification — the cleanup then silently does not happen.
Verify with `git --no-optional-locks -C <repo> check-ignore -v <file>`; it prints the rule
and line that matched, and silence means NOT ignored.

**Housekeeping is its own commit**, never mixed into a build, so the diff stays readable.
Prove it before handing it over: `git diff --stat` should show ~1 insertion and no modified
application code, and every deleted file should hash-match its archived copy.

**The device bridge cannot delete** — `rm` fails with "Operation not permitted". Use `mv`.

---

## COMMIT SUMMARIES — binding

**Every repo** touched by a push gets its **own** summary — schedule and tests are two
summaries, not one. Keep them **SHORT**: a recognisable subject line plus two to four
lines. The reasoning goes in `BUILD-LOG.md` / `DECISIONS.md` / `HANDOFF.md`, which are
committed and cannot be lost.

Deliver each one to the **outputs column** with `SendUserFile` as `COMMIT-<repo>.txt`
(this is the copy the owner actually uses), write it to `<repo>/COMMIT-MESSAGE.txt`
(gitignored, and NOT a dotfile — a dot makes Finder hide it), and add the build's row to
`BUILD-LOG.md`. All three, every build. Full procedure in the handoff.
