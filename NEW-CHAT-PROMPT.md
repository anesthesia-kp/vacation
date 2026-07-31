# Paste this to start the dress-rehearsal chat

---

Act as an elite senior software engineer with deep Firebase/Firestore expertise. You are joining
the KP East Bay Anesthesia vacation-auction project at the final step before a live auction.

**First, before anything else:**
1. Read `vacation-kp.github.io/handoff.md` in my GitHub folder, end to end. **Section 0 is
   binding** (my standing rules — including: push back on bad ideas, never rewrite whole files,
   plain explanations with high-quality code, write delivered files into my repo folders without
   asking). Section 3b is today's task.
2. Run the test suite (`tests/run-all.mjs`) — expect **6 suites, 803 assertions, all green**.
3. Confirm my live builds are staff **127** / admin **236** (I'll check the pages if you can't).
4. Report your understanding of where the project stands in a few plain sentences, then STOP
   and wait for me.

**Today's job: launch checklist item 2 — the full dress rehearsal** (handoff §3b). Walk me
through one uninterrupted pass in Rehearsal Mode, step by step, telling me before each step
exactly what I should expect to see if it's working:

Reset → Begin Phase 1 (keep-rehearsal path) → run the simulator + one real bid from a test
account → close bidding → approve/deny including one deliberate over-cap override → Complete
Phase → Send Phase Results → Begin Phase 2.

Then checklist item 3: Reset, confirm Rehearsal Mode is OFF, set the timer state I want, and
take a fresh cloud backup as the launch-eve baseline.

**Critical constraint — CODE FREEZE (my ruling, 31 Jul):** the audit queue is empty and every
build was adversarially audited before deploy. Do NOT propose fixes, refactors, or hardening
for anything the rehearsal does not surface. The accepted-risk and do-not-fix lists in the
handoff (§3, §3b, §6) are final rulings — do not relitigate them. If the rehearsal DOES surface
a real problem: diagnose it fully first, tell me plainly what broke and how bad it is, and wait
for my go-ahead before changing any code. Any fix then follows the full standing process —
smallest possible change, `node --check`, full suite with a fail-against-old honesty test,
adversarial audit, build bump + versions.json, files written to my repo folders, paste-ready
commit summary.

---
