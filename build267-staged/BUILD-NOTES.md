# Build 267 (admin) / 138 (staff) — STAGED, NOT SHIPPED
**13 Aug 2026 · E-mail link dedup + Auction Calendar redesign (fixed six HD weeks, auto-labeled federal holidays, dual labels)**

## File placement (repo folder `vacation-kp.github.io`)
| Deliverable | Goes to |
|---|---|
| `admin/index.html` | `admin/index.html` |
| `index.html` | `index.html` |
| `versions.json` | `versions.json` → `{"index":138,"mobile":17,"admin":267}` |
| `claude-commit-msg.txt` | save as `.claude-commit-msg.txt` |
| `tests-build267.mjs` | `tests/` (fixtures: /tmp/build267 new · /tmp/build266 pristine for `--pre`) |

## What's in the build
**E — E-mail link dedup (admin).** The bidding-reminder and add-us-to-contacts e-mails no
longer embed the site URL (the EmailJS template footer carries it); both now say "…using the
site link at the bottom of this e-mail." `AUCTION_SITE_URL` const removed.

**CAL2 — Auction Calendar redesign (admin editor + staff label rendering).** Owner rulings 13 Aug:
- **The six high-demand weeks are fixed identity**: ⛷️ Ski Week, 🌸 Spring Break ×2, 🦃 Thanksgiving,
  🎄 Christmas, 🎆 New Year's. No HD checkbox, no renaming/re-iconing, no add, no delete —
  only each week's placement is chosen. They define Phase 1.
- **✨ Suggest button fills exactly Thanksgiving / Christmas / New Year's** (computable).
  Ski + the two Spring Breaks have **no default** — save refuses until all six are chosen
  ("Choose a week for ⛷️ Ski Week …"), and they **clear on year change** (school calendars
  don't carry across years; the computable three re-anchor automatically).
- **Auto-labeled federal holidays** — zero admin input, fixed by the year: 🕊️ MLK,
  🏛️ Presidents' Day, 🇺🇸 Memorial Day, 🎇 July 4th, 🛠️ Labor Day. Saved into the config as
  non-HD decorations. (`computeSuggestedHolidays` itself untouched — byte-identical, pins hold.)
- **Dual label on collision** (owner ruling): a federal holiday landing ON a chosen HD week
  (typically Presidents' Day = Ski Week) attaches as an informational `note` — the week
  displays "⛷️ Ski Week · 🏛️ Presidents' Day" on both sites, while every rule (slots, floors,
  Phase 1) sees only the HD identity. Staff change (build 138): `_acNormalize` preserves the
  note (twin-identical) + SPECIAL_WEEKS label rendering appends it. Display-only.
- **Summer**: "4 default slots per summer week" moved to its own line directly below the
  week selectors.

Deploy is a behavioral no-op: AC core defaults, BF core, and both engines are byte-identical
to deployed 266/137 (verified); nothing changes until a calendar is saved (post-reset).

## Verification — ALL GATES RUN, ALL GREEN (13 Aug)
| Gate | Result |
|---|---|
| node --check, all inline scripts, both files | ✅ 8/8 |
| tests-build267.mjs (executed save-flow, auto-holidays, dual-label twins, e-mail pins) | ✅ 26/26 |
| Honesty run vs pristine 266/137 (`--pre`) | ✅ 24 fail / 2 regression-passes |
| AC/BF cores + engines byte-identical to deployed build | ✅ verified |
| audit-handlers | ✅ 180 handlers, 0 violations |
| Key fairness suites (never-events 20/20 · fairplay 48/48 · engine-fuzz 4/4 · delta 91/91 · inflight 17/17) | ✅ |
| Playwright button sweep (4 passes) | ✅ all zeros |
| Dedicated editor browser test (fixed rows, year-change clearing, refusal, full save incl. Presidents-note) | ✅ 13/13 |
| BF card browser test (regression) | ✅ 10/10 |

Note for the sweep only: the sandbox suppresses the editor-save one-shot reload (the reload
path is covered by the build-265 unit suite); a real save still reloads both sites once.
