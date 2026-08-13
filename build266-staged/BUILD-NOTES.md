# Build 266 (admin) / 137 (staff) — STAGED, NOT SHIPPED
**13 Aug 2026 · Bid Floors by Week Category (owner-designed, spec signed off in-session)**

## File placement (repo folder `vacation-kp.github.io`)
| Deliverable | Goes to |
|---|---|
| `admin/index.html` | `admin/index.html` |
| `index.html` | `index.html` |
| `versions.json` | `versions.json` → `{"index":137,"mobile":17,"admin":266}` |
| `claude-commit-msg.txt` | save as `.claude-commit-msg.txt` |
| `tests-build266.mjs` | `tests/` (standalone `node <file>`; `--pre` honesty mode needs pristine 265/136 at `/tmp/admin.html` + `/tmp/staff.html`) |

## What's in the build (one feature)
**BF — Bid Floors by Week Category.** The hardwired "high-demand weeks accept only bids 1–4 + combos" rule becomes admin-controlled, per category:
- **One rule:** a bid may be placed on a week only if it is at least as strong as the week category's floor (ladder 1/2/3 › 1/2 › 1 › 2 › … › 10 › NP). NP is the weakest bid, so any numeric floor blocks NP automatically.
- **Categories:** High demand (floor 3–10 or No floor; default **4** = old behavior) · Summer (default **No floor** = old behavior) · All other weeks (always No floor, fixed, shown in the card).
- **New card** "🎚 Bid Floors by Week Category" in Controls, directly below NP Bids by Phase. Dropdown wording: "No floor — all bids allowed" (never "NP"/"None"). Save = confirm dialog → `adminSettings.bidFloors` merge-write. **Locked once Phase 1 begins** (selects disabled AND click-time guard); unlocks via Reset Auction; values survive reset.
- **Engine enforcement, both twins (new — closes a pre-existing NE-4 soft spot):** a below-floor bid, or an NP bid whose *placement* phase had NP toggled off, can neither win nor block (NE-1 lockout floor excluded too). Legally placed NP bids survive later toggle flips (placement-phase rule, owner ruling).
- **Sanctioned override:** an explicit admin approval of a floor-filtered bid is honored by the engine (counted once, FTE included) and warned about in the Approve dialog — never silent. Unscorable / I2-reused / dead prior-phase bids stay refused exactly as before.
- Simulator derives allowed bids from the floors. Rules dialog + both welcome e-mails word the restriction dynamically (default text === the old sentence, character-for-character).
- **No cache, no reload machinery** — floors are read live from adminSettings. Deploying is a behavioral no-op until a floor is changed (test-proven).
- Engine call sites carry a documented `typeof _bfEngineFilter` guard so the extracted-code test harnesses (which assemble the engine in legacy scope) keep running; production always has the functions, and a pin-test fails if the check is ever removed.

## Verification status — ALL GATES RUN, ALL GREEN (13 Aug)
| Gate | Result |
|---|---|
| node --check, all inline scripts, both files | ✅ 8/8 |
| tests-build266.mjs (executed code, incl. full floor×value truth table, no-op equivalence, engine enforcement, override abuse) | ✅ 44/44 |
| Honesty run vs pristine 265/136 (`--pre`) | ✅ 0 passed / 30 failed — every test detects the pre-fix build |
| tests/run-all.mjs | ✅ same signature as the 265 baseline (never-events 20/20, fairplay 48/48, engine-fuzz 4/4, delta 91/91, inflight 17/17; the known mondays/_mergeP4RoundsView harness artifacts unchanged) |
| audit-handlers.mjs | ✅ 182 handlers, 0 violations |
| Playwright button sweep (4 passes) | ✅ all zeros |
| Dedicated BF-card browser test (render/save/cancel/lock incl. forced-guard bypass attempt) | ✅ 10/10 |
| Full-lifecycle browser run-through (P1→P4 rounds→finish) | ✅ natural finish, 0 errors, 0 never-event findings, mail discipline exact |
| **Adversarial fairness re-audit** (cross-site divergence over 52 weeks × 4 configs × 13 values, override abuse, NE-1 regression, boundaries, reset survival) | ✅ 11/11 |

## Behavior notes for the owner
1. Deploying this build changes **nothing** until you change a floor — and the card locks the moment Phase 1 begins (rehearsal included), so floors cannot change mid-auction.
2. The Approve dialog now warns (loudly, never blocks) when you approve a bid the engine doesn't score — that's your override authority, made visible.
3. Deploy timing is your call at push time; recommendation on record is the next between-phases pause.
