# Build 265 (admin) / 136 (staff) — STAGED, NOT SHIPPED
**12 Aug 2026 · ALL FIVE backlog items as one batch**

## File placement (repo folder `vacation-kp.github.io`)
| Deliverable | Goes to |
|---|---|
| `admin/index.html` | `admin/index.html` |
| `index.html` | `index.html` |
| `versions.json` | `versions.json` → `{"index":136,"mobile":17,"admin":265}` |
| `claude-commit-msg.txt` | save as `.claude-commit-msg.txt` |
| `tests-build265.mjs`, `tests-build265-b5.mjs` | `tests/` (standalone `node <file>`; `--pre` honesty mode needs pristine 264/135 copies — paths at the top of each file) |

## What's in the batch
- **B1** `noindex` meta, both heads.
- **B2** Mail-queue parking (5 strikes → parked; ⛔ Parked dialog with Retry-all / per-entry delete; badge "N · M parked"; red flash tracks active only). Note: a strike counts on ANY send-attempt failure, not just EmailJS rejections — deliberate coarseness, flagged for your review earlier.
- **B3** Honest queue labels + toasts.
- **B4** `mailStats` removed from the restore map (root cause of the counter undercount). Backups unchanged.
- **B5 — Auction Calendar (item 5)**, per the signed-off touchpoint map:
  - One config object `adminSettings.auctionConfig` (admin-only writable — verified, **no rules change**): year, holiday weeks (label + emoji + short tag + high-demand flag + colors), summer start/end weeks.
  - **No-op proof**: with no saved config, every derived structure exactly equals the old hardcoded literal — HD set, staff SPECIAL_WEEKS (labels/colors/flags/slots), 5-slot caps, summer windows, label maps. Test-enforced, not just eyeballed. Deploying this build changes nothing until you save a config.
  - Load order: pages build from a localStorage cache at parse time; the adminSettings snapshot is authoritative and triggers ONE guarded reload on change. Config locks when Phase 1 begins (rehearsal included) → **mid-auction reloads are impossible**. Unlock = Reset Auction only; values survive reset.
  - New 📅 Auction Calendar card in Controls (above the danger zone): year picker (now+15), holiday row editor, ✨ suggestions (computable holidays; **Christmas + New Year's are always the last two weeks** per your rule; ski/spring manual), summer range pickers, 53-week info note. Save validates: names required, no duplicate weeks, summer start ≤ end, **≥1 high-demand holiday** (Phase 1 must have weeks).
  - Every user-visible "52 weeks"/"6 high-demand" count is now dynamic; header/login/welcome-e-mail years come from config.
  - Cosmetic unification (deliberate): the Lock-All-Except dialog's week list now uses each holiday's SHORT label consistently (old list mixed short/long).

## Verification status
| Gate step | Status |
|---|---|
| node --check, all inline scripts, both files | ✅ green |
| Items 1-4 tests (executed code) | ✅ 25/25 |
| B5 tests (executed code incl. no-op equivalence, suggestion pins for 2027/2028/2034, reload/loop-guard logic) | ✅ 46/46 |
| Honesty runs vs pristine 264/135 | ✅ 16 + 19 fix-tests fail pre-fix |
| Full diff audit | ✅ 42 admin + 12 staff hunks, all mapped to B1-B5/bumps |
| `tests/run-all.mjs` (Mac only) | ⬜ REQUIRED before deploy |
| `audit-handlers.mjs` (Mac only) | ⬜ REQUIRED before deploy |
| Playwright button sweep (Mac only) | ⬜ REQUIRED before deploy |
| **Adversarial fairness re-audit** (B5 touches HIGH_DEMAND_WEEKS derivation) | ⬜ REQUIRED before deploy |

Known artifact reminder: the 3 HONESTY CHECK lines in the main Mac suite fail when the on-disk baseline is recent — prove by running with no baseline.

## Two behavior notes for your eyes
1. **B2 strike coarseness** (from the earlier staging): any failure in a send attempt counts a strike. Five of anything deserves admin eyes; Retry-all un-parks instantly.
2. **B5 first-load reload**: the first time each browser loads a page after you SAVE a new calendar, it will visibly reload once (cache catch-up). Admin gets a toast first; staff reloads silently. Never happens mid-auction (config is locked then).
