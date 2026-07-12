# Vacation Auction — deploy & maintenance notes

Three static HTML pages backed by Firebase Firestore (project `vacation-25e8e`).
No build step, no dependencies.

| File | What it is |
|---|---|
| `index.html` | Desktop user site |
| `mobile.html` | Mobile user site |
| `a5696c46...html` | Admin panel (obscure filename is deliberate — do not rename) |
| `versions.json` | Auto-refresh version numbers (see below) |
| `.nojekyll` | Empty file — tells GitHub Pages to serve files as-is. Keep it. |
| `netlify.toml` | Legacy — only matters if we ever move back to Netlify |

## Current hosting: GitHub Pages

Live at **https://vacation-kp.github.io/** — served from this private repo
(`vacation-kp/vacation-kp.github.io`, GitHub Pro account).

**Every push to `main` deploys automatically** (rebuild takes ~60 seconds).
There is no per-deploy cost and no deploy cap. Push freely.

### The everyday workflow

1. Describe the change to the assistant (Claude) in plain language.
2. The assistant edits the files in this folder, bumps the changed page's
   `BUILD` number **and** the matching entry in `versions.json`, and runs its
   checks.
3. Open **GitHub Desktop** → review the changed files → type a short commit
   message → **Commit to main** → **Push origin**.
4. ~60s later the site is live. Open pages reload themselves (see below).

### Auto-refresh system

Each page has a `BUILD` number in its first `<script>` block and checks
`versions.json` on load. If the deployed number is newer, the page reloads
itself once — so nobody has to hard-refresh after a deploy.

**Rule: any edit to a page must bump that page's `BUILD` and the same key in
`versions.json`.** Keys: `index.html` → `"index"`, `mobile.html` → `"mobile"`,
admin file → `"admin"`. The assistant handles this; humans don't touch
`versions.json`.

Deliberately **no service worker** — `versions.json` was chosen as the
lighter, non-sticky alternative.

## Firebase

All data lives in Firestore under the `vacations` collection (schedule, locks,
approvals, denials, phases, bidPhase, fteMap, slots, userList, emails,
passcodes, bidTimes, bestBids, adminSettings, timer, changes, mailQueue).
`vacation-kp.github.io` is in Firebase's authorized domains. Emails go
through EmailJS (template `template_rss3fn3`) — the email *wrapper* is edited
at emailjs.com, not in this repo.

## Things that must NOT be undone

- **The auth gate.** All three files defer Firestore listeners until anonymous
  sign-in resolves (`authReady` + the wrapped `onSnapshot`). Without it the
  site silently breaks in incognito/private windows.
- **Priority scoring** uses a sorted join in all three files. Never revert to
  the `.includes()` form, and never let the three files' scoring drift apart.
- **Week keys are Sunday-anchored** and parsed as local time, never UTC.
- **Draws never auto-resolve.** Approving one member of a draw must leave the
  others as DRAW until the admin explicitly decides each one. No lone-draw
  collapse — in any of the three files.
- **`renderOverview` stays on `window`** (the dashboard phase dropdown breaks
  silently without it — every inline `onclick`/`onchange` handler needs its
  function window-bound).
- **The outbid-alert mail queue** (`mailQueue` doc + claim protocol in all
  three files). Alerts are written to the queue before sending; any open page
  delivers stranded ones. Don't remove the claim/verify steps — they're what
  prevents duplicate emails.
- **Per-week FTE availability** comes from the `slots` doc via `getSlots()`
  (admin) / `weekMeta[wk].slots` (user sites). Don't reintroduce hardcoded caps.

## If we move back to Netlify someday

`netlify.toml` is already set up (publish root, no build command). The old
process was: `netlify login`, `netlify link` (site `vacation-kp`), then
`netlify deploy --prod` to ship.

**Big caveat that made us leave:** Netlify's credit-based free plan gives
~300 credits/month and a production deploy costs 15 (~20 deploys/month). Do
**not** connect git auto-deploy on that plan — every push would burn credits,
and running out pauses every project on the account until the next cycle.
Commit freely, deploy deliberately, in batches. (Accounts created before
4 Sept 2025 may be on the legacy plan — 100 GB bandwidth, no deploy cap —
check Team settings → Billing before assuming either way. Migrating to credit
pricing is permanent.)

Also remember to add the Netlify domain to Firebase's authorized domains
before cutting over, and update any bookmarks — the auto-refresh system works
the same on any host.
