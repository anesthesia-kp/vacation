# Start here — opening prompt for the next session

Paste the block below as your first message in the new chat. It is written to be self-contained.

---

```
Act as an elite, hyper-focused Senior Software Engineer on the KP East Bay Anesthesia
vacation-auction project. We are starting a fresh session because the previous one reached
~715k tokens of context.

Everything you need is in the repo:

  handoff.md                          state, decisions, constraints, next steps
  tests/run-all.mjs                   369 assertions across 5 suites
  INTEGRITY-AUDIT-2026-07-25.md       59 confirmed defects — the work queue

Do these three things, in order, and nothing else:

  1. Read handoff.md in full. Section 0 contains my standing rules — they are binding.
  2. Run: node tests/run-all.mjs
     Report the result. It is the ground truth about the code; trust it over any prose,
     including handoff.md itself.
  3. Confirm what is actually deployed live by fetching each page and reading `var BUILD`,
     plus versions.json, for:
       https://anesthesia-kp.github.io/vacation/
       https://anesthesia-kp.github.io/vacation/admin/
       https://anesthesia-kp.github.io/schedule/
       https://anesthesia-kp.github.io/schedule/admin/
     Expected 116 / 201 / 24 / 46, but that was never verified — tell me what you find.

Then STOP and wait for my instructions. Do not fix anything, do not modify any file, do not
push or publish. There are 59 confirmed defects and I will tell you which to work on.

Note: the auction is NOT live and must not go live until at least the critical and high
findings are fixed. The database currently holds a used dry-run state.
```

---

## What to have ready in the repo before starting

Place these in `vacation-kp.github.io/`:

```
handoff.md
START-HERE.md
tests/
  run-all.mjs
  test-fairplay.mjs
  test-audit-fixes.mjs
  test-delta-fixes.mjs
  test-backup-restore.mjs
  test-engine-fuzz.mjs
INTEGRITY-AUDIT-2026-07-25.md
```

The audit report was delivered in the previous chat. If it is not in the repo, download it from
there — the next session needs it as the work queue, and it is too large to reconstruct.

## Running the tests from anywhere

The suites resolve paths relative to themselves, assuming `tests/` sits beside the two repo folders'
common parent. If your layout differs:

```bash
REPO_ROOT=/Users/aaronfrankel/Documents/GitHub node tests/run-all.mjs
```

Expected output: `✅ all 5 suites passed — 369 assertions`

Any failure means the code changed underneath the tests. Investigate before doing anything else —
the suites extract functions verbatim from the shipping HTML, so a failure is real.
