# Mega-audit — builds 265/266/267 (live: admin 267 / staff 138)
**13 Aug 2026 · Requested by owner: "additional audits or megafuzzing… check all new functions."**

## Verdict
**Zero findings.** A new 100,000-scenario configuration mega-fuzz (1.8M invariant checks), the
never-events fuzzer at 10× depth, a full re-run of all four build test suites, both adversarial
audits, and a function-by-function coverage inventory — all clean. One coverage gap was found
and closed during this audit (3 new executed tests); one harness bug was found in the new
fuzzer itself and fixed (the engine was correct).

## 1 · The new mega-fuzz (closes the real gap you sensed)
Every prior fuzzer ran the **default configuration**. Builds 266/267 made the rules
configurable, multiplying the state space — nothing had ever swept the non-default corners.
The new `mega-fuzz.mjs` runs the REAL extracted engines from the live files:

- **100,000 random scenarios** (deterministic seeds — any failure is replayable):
  random bids incl. forged shapes (0, −1, "3", 11, forged future phases) × random floor
  configs (3/4/5/10/none/invalid) × random NP-phase toggles × random denials & admin
  approvals × random FTEs and caps × HD/summer/standard weeks.
- **Six invariants per decided week** (1,800,000 checks):
  I1 below-floor bid never elevated (unless explicitly admin-approved) ·
  I2 NP from an NP-off placement phase never elevated ·
  I3 no NaN in any FTE total ·
  I4 no over-cap beyond the 1.0 review overage without admin approval ·
  I5 **twin agreement** — staff engine ≡ denial-blind admin engine, every week ·
  I6 determinism — same inputs, identical output.
- **Result: ZERO violations in 31.5s.**
- Honest note: the fuzzer's first draft flagged 300 false "below-floor elevated" findings —
  its own independent reference implementation mishandled floor "none". The engine was right;
  the harness was wrong; fixed. (Cross-checking engine vs. independent reimplementation is
  exactly how this is supposed to work.)
- `mega-fuzz.mjs` is reusable: `FUZZ_N=500000 node mega-fuzz.mjs` any time.

## 2 · Existing fuzzers, scaled
- `test-never-events.mjs` at **NEVER_FUZZ_N=40,000** (10× default) vs the live build: 20/20.
- `test-priority-inversion.mjs` (5,000-scenario inversion fuzz): real assertions green (run-all).
- `test-engine-fuzz.mjs`, `test-fairplay.mjs` (48 assertions): green vs the live build.

## 3 · Function inventory — every function added/changed in 265→267, with its executed proof
**Build 265 (all bytes carried unchanged into the live build):**
| Function | Executed proof |
|---|---|
| `_mqEligible` (parking) | tests-build265: threshold-exact tests, both sites |
| `updateMailQueueBadge` | executed with DOM stub: split counts, flash logic |
| `reviewParkedMail` | executed: dialog contents + retry-all clears strikes |
| AC core: `_acNormalize` `_acCheckRemote` `_acHDList` `_acTagMap` `_acNameMap` | b5 suite: no-op equivalence, reload/loop-guard, corrupt-cache — executed |
| `getSundays` | pinned 2027/2028/2034 (52/53-week years) |
| `computeSuggestedHolidays` | pinned vs independent math, 3 years; byte-identical through 266 AND 267 (verified twice) |
| restore map (mailStats removed) | map-key tests + **proven in production by your own reset+restore** (counter stayed accurate) |

**Build 266:**
| Function | Executed proof |
|---|---|
| `bfFloors` `bfFloorFor` `bfAllows` `_bfParse` `_bfNormalize` | full truth table (floor × 13 values), no-op equivalence, garbage-config fallback — executed both sites |
| `bfAllowedText` `bfRulesBullets` | default output === old hardwired sentence character-for-character |
| `_bfEngineFilter` | executed directly + inside the real engine (forged-bid scenarios) + 100k fuzz |
| `_bfOverrideEligible` | override honored; unscorable/I2/dead-bid abuse all refused — executed |
| `simGetAllowedBids` | executed: default = old lists exactly; floor-derived lists |
| `renderBidFloorsCard` `_bfChanged` | real-browser test 10/10 incl. forced lock-bypass attempt |

**Build 267:**
| Function | Executed proof |
|---|---|
| `AC_HD_FIXED` | identity/order/flags pinned |
| `_acAutoHolidays` | executed: 5 federal holidays on the right weeks (2027) |
| `_acSuggestedHd` | executed: exactly Thanks/Xmas/NYE, pinned week keys |
| `saveAuctionCalendar` | executed: unset-refusal, duplicate-refusal, full save (6 HD + 4 decorations + Presidents-note), collision→note |
| `_acDraftFromAC` | **gap closed in this audit**: 3 new executed tests (default, partial/legacy, unknown-label configs) |
| `_acEditorBody` `_acYearChanged` `_acSuggest` `_acReadDraftFromDom` | real-browser editor test 13/13 (render, year-change clearing, suggest, refusal, save through the DOM) |
| `_acNormalize` note support | executed both sites + twin-identity byte-compare |
| staff `SPECIAL_WEEKS` note rendering | executed: dual label with note, default label without — behavior unchanged for note-less configs |
| e-mail text changes | string pins (URL absent, footer-pointing sentences present) |

**Coverage claim, stated precisely:** every function added or modified across 265–267 now has
at least one test that *executes* it (not just greps for it), except pure-markup fragments,
which are covered by the button sweeps (0 violations) and the two dedicated browser tests.

## 4 · Full re-run, this session, against fixtures byte-verified to the live files
tests-build265 25/25 · tests-build265-b5 46/46 · tests-build266 44/44 · tests-build267 26/26 ·
adversarial bid-floors 11/11 · gap-closer 3/3 · plus §1–§2 above. All honesty modes previously
proven (16+19 / 30 / 24 fix-tests fail on their pre-fix builds).

## 5 · What this audit still cannot cover (unchanged, for honesty)
Real Firebase security-rule behavior and server timers (covered by the published-rules tests
and your live rehearsal), EmailJS's real deliverability, and multi-admin race conditions under
real network latency. These are exactly what the rehearsal itself is testing.
