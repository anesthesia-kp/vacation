# Start prompt — KP Vacation Auction (home stretch)

Paste everything below into the first message of the next chat.

---

I'm continuing development of my **KP East Bay Anesthesia Vacation Auction** web app. We are in the **home stretch** before the real live run. I need your most careful, highest-quality work: this late, breaking something is far worse than moving slowly. Precision and "do no harm" beat speed every time.

## Orient yourself before doing anything
- Read **`handoff.md`** (in the `vacation-kp.github.io` repo) top to bottom. The **⭐ BACKLOG** block at the very top (11 Aug 2026) is the current truth. Sections below it (dated 3 Aug, admin 239) are stale on build/test numbers — **trust the code over the doc**, and correct the record as you go.
- **Repo/URL gotcha:** the local folder is named `vacation-kp.github.io`, but its git remote is `github.com/anesthesia-kp/vacation`, which GitHub Pages serves at the LIVE url **`https://anesthesia-kp.github.io/vacation/`**. `admin/index.html` = admin site; `index.html` = staff site; `mobile.html` exists too. (The separate `anesthesia-kp.github.io` repo is just the org landing page — not this app.)
- **Current live state:** admin **264**, staff `index` **135**, `mobile` **17** (see `versions.json`). Build 264 = Begin-Phase-4 clears the `p4Rounds`/decision mirrors locally before the Round-1 month picker reads them (finding F1), matching the Start-Round-N+1 local-first pattern.

## The mission, in order
1. **Rehearsal is still running with real users** — I'm hunting for bugs. When something comes up, diagnose it *carefully*: read the actual code before concluding, reproduce the logic, never guess. (Last bug was a user's corrupted roster e-mail causing an EmailJS 422 loop — a data typo, not code. Good model for how to investigate.)
2. **After the rehearsal**, do the **5 BACKLOG items as ONE batched build**. For item 5 (holiday weeks + auction year → admin config), the **required first step is a read-only touchpoint map for me to sign off on before any edit** — no fairness-logic changes until I approve the map.
3. **After those updates**, deliver your **best full-project audit + Chrome run-throughs** before the live run — every phase, all Phase-4 rounds, all reports, and an explicit never-event check.

## Non-negotiable working discipline (this is why the app is solid — do not relax it)
- **Never rewrite whole files.** Read → targeted Edit only. Admin file is ~700KB — use grep + ranged reads.
- **Code freeze:** propose the smallest change, wait for my explicit "go," then make ONLY that change. No opportunistic edits, no drive-by "improvements."
- **Full gate before ANY build ships, all green:**
  - `synccheck` (`node --check` on every inline script),
  - `tests/run-all.mjs`,
  - `audit-handlers.mjs`,
  - the Playwright button sweep (cancel + confirm passes on both sites).
  - *Known artifact:* the 3 "HONESTY CHECK" lines FAIL when the on-disk pre-fix baseline is a recent build — that's a staging artifact, NOT a regression. Prove it by running those suites with no baseline (they go green).
  - *Playwright launch:* the pinned headless-shell is missing — find the installed browser under `/opt/pw-browsers/` and launch chromium with `executablePath` pointed at its `chrome-linux/chrome`.
- **Tests must EXECUTE the real extracted code** against mocks, plus an honesty check proving each new test FAILS against the pre-fix build. Source-pins alone are not enough for logic changes.
- **Bump `var BUILD` AND `versions.json[page]`** on every deploy of a page. **Deliver files AND write them into the repo folders** (I always want that). **I do ALL git pushing — you never push.** Update `.claude-commit-msg.txt` with the build summary.
- **Verify every assumption against the code before acting.** If the doc and the code disagree, the code wins — say so.
- **Fairness is sacred.** Never-events NE-1..NE-13 must hold. Anything touching `HIGH_DEMAND_WEEKS`, Smart Lock/Unlock, FTE caps/slots, approvals/winners, or Phase-4 rounds gets an adversarial re-audit before it ships.
- Explain in **plain language** (I'm not a strong coder) but write **excellent code**. **Push back on bad ideas — do not just agree with me.**
- **E-mails only to my test accounts during testing; simulator OFF for real runs.** No spamming real users while testing.

## Environment notes
- My Mac connects via the Cowork device bridge; it goes stale periodically. If file staging fails with `untrusted_device`, tell me to re-sign-in in the desktop app.
- I saw a GitHub Desktop "untrusted server / api.glb" certificate warning on my network — most likely SSL inspection on the hospital network, not an attack. I push from a trusted network. It does not affect the deployed site.

**Start by:** reading `handoff.md`, confirming the live build against `versions.json`, then ask me where the rehearsal stands and whether any new bug needs diagnosing.
