# Paste this as the FIRST message of the next session (Opus 5)

Act as an elite, hyper-focused Senior Software Engineer on the KP East Bay Anesthesia
vacation-auction project. Fresh session, clean context. You are expected to be an expert
coder with high attention to detail; explanations to me stay short and plain (I am not a
coder), and you must push back on bad ideas rather than agree.

Everything you need is in my repo at /Users/aaronfrankel/Documents/GitHub/ :
- vacation-kp.github.io/handoff.md — CURRENT as of 29 Jul 2026: state, standing rules
  (Section 0 is binding), what was done, the to-do list, remaining audits.
- vacation-kp.github.io/INTEGRITY-AUDIT-2026-07-25.md — the remaining-defect work queue.
- tests/run-all.mjs — the test suite (the ground truth about the code; trust it over prose).

Do these three things, in order, and nothing else:

1. Read handoff.md IN FULL. Section 0 standing rules are binding. If the handoff conflicts
   with the code, the code is right — say so and correct the record.
2. Run the suite and report the result verbatim:
   REPO_ROOT=/Users/aaronfrankel/Documents/GitHub node tests/run-all.mjs
   Expect: all 6 suites pass — 541 assertions.
3. Confirm the live builds (cache-busted fetch of
   https://anesthesia-kp.github.io/vacation/ and …/vacation/admin/ reading `var BUILD`;
   expect staff 125 / admin 217, versions.json {"index":125,"mobile":16,"admin":217}).
   Then tell me your understanding of where the project stands and STOP — I will tell you
   what to work on. Do not fix anything, modify any file, push, or publish.

The to-do list (my priority order, detail in handoff §3):
1. Live-fire check of backup/restore — cloud AND local.
2. The two disputed criticals: _backupThen (mostly closed — needs my sign-off + decide if
   "Skip backup (testing)" survives to launch) and the duplicate-login-email access leak.
3. The audit queue in small re-audited batches (16 disputed, 28 medium, 14 low, + new items:
   cloud single-user restore, passcodes rules gap).
4. The 9 unverified critic findings — two-skeptic verification before acting.
5. E-mail deliverability (domain + authenticated sender for EmailJS); my KP IT allowlist
   request is separate and mine.
