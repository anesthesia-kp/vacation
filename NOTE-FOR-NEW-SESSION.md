# Update for the current session — the missing test files have been repaired

Paste everything below the line into the new chat.

---

Update: the gap you found (Mac test files older than the handoff describes, 2 failures +
1 crash, missing `CODE-REVIEW-FINDINGS.md` and mobile sweep scripts) has been **repaired**
— your diagnosis of the cause was exactly right, but no reconstruction was needed. The
original Aug 7 session was still alive with all the files in its workspace, and it has now
written them to my Mac. Specifically:

1. **`tests/test-backup-restore.mjs`** — the Aug 7 version, with the two build-245
   "stale dialog stands down" tests and the harness `phasesData` mock (this is what fixes
   the crash you hit).
2. **`tests/test-audit-fixes.mjs`** and **`tests/test-high-fixes.mjs`** — the Aug 7
   versions with the widened source-scan windows (fixes your two false failures).
3. **`tests/sweep/mobile-test.mjs`, `mobile-admin.mjs`, `mobile-bidflow.mjs`** — the
   mobile regression scripts the handoff references.
4. **`tests/sweep/autoclose-race-test.mjs`** — NEW: the build-244 timer-race test,
   rebuilt as a permanent self-contained script (the original was a throwaway the Aug 7
   session deleted after running — the one thing genuinely lost). It was re-run against
   the shipped build-246 code before delivery: race scenario stands down, genuine expiry
   locks all 52 weeks, 5/5 checks pass. Run it with:
   `cd tests/sweep && node make-site.mjs && node autoclose-race-test.mjs`
   (needs Playwright + Chromium; in cloud sessions both are preinstalled — if the import
   fails locally, `npm i playwright` first).
5. **`vacation-kp.github.io/CODE-REVIEW-FINDINGS.md`** — the findings report the handoff
   told you to read; it now exists.

The full suite was re-verified in the source session immediately before writing back:
**810/810 assertions green** against the current (build 246) code. Note your local
assertion total may differ slightly — the honesty checks that need pre-fix baseline
builds skip themselves where baselines are absent, and say so.

## What to do now

1. Re-run `node tests/run-all.mjs` and `node tests/audit-handlers.mjs` — the 2 failures
   and the crash should be gone. Report the result.
2. Confirm `CODE-REVIEW-FINDINGS.md` reads correctly and finish anything the handoff
   asked you to do with it.
3. Nothing else changed: the live site was never wrong, the handoff needs no edits (its
   description of the test suite is simply true again), and the standing rules still
   apply — report and stop; no changes without an explicit go-ahead.

## New standing rule (add this to how you work)

**Test files are deliverables.** Any test, harness update, or verification script created
or modified in a session must be written back to the Mac (`~/Documents/GitHub/tests/...`)
in the same delivery step as the code it verifies — never left only in the session's
temporary workspace. That is how this gap happened: the Aug 7 session committed every
site file but kept its test updates cloud-side, and they would have died with the session.
When you finish any future change, list what you wrote to the Mac and confirm the tests
that prove the change are among the files written.

Also worth suggesting to me (the owner) at a natural moment: the 8 recovered files are on
my Mac but not yet committed to git — they should ride along in my next commit so the
repo history protects them too.
