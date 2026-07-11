# Vacation Auction — deploy notes

Three static HTML files. No build step, no dependencies.

| File | What it is |
|---|---|
| `index.html` | Desktop user site |
| `mobile.html` | Mobile user site |
| `a5696c46...html` | Admin panel (obscure filename is deliberate) |

Live at **vacation-kp.netlify.app**.

---

## One-time setup

Run these once, in this folder.

```bash
# 1. Start tracking history
git init
git add .
git commit -m "Baseline: auth gate, letter badges, simulator fixes"

# 2. Install and log in to Netlify
npm install -g netlify-cli
netlify login          # opens a browser, no password typed anywhere

# 3. Point this folder at the existing site
netlify link           # choose vacation-kp
```

That's it. **Do not** connect this repo to Netlify's git auto-deploy in the
dashboard — see the warning below.

---

## Everyday use

**Save a version** (free, unlimited — do this often):

```bash
git add .
git commit -m "what changed"
```

**Push it live** (costs credits — do this rarely, in batches):

```bash
netlify deploy --prod
```

**Undo a bad change** — this is the whole point of the repo:

```bash
git log --oneline           # find the last good commit
git checkout <hash> -- .    # restore those files
netlify deploy --prod       # push the good version live
```

---

## Why deploys are manual

Netlify's free plan is credit-based: **300 credits/month**, and a production
deploy costs **15 credits** — about **20 deploys per month**.

Git auto-deploy would fire on every push, so a typo fixed twice costs 30
credits. Worse: if the account runs out of credits, **every project on it is
paused until the next billing cycle** — the auction would go dark mid-bidding.

So: commit freely, deploy deliberately. Batch a session's changes into one
deploy rather than shipping after each tweak.

> **Check first:** if this Netlify account was created before 4 Sept 2025 it's
> on the legacy plan (100 GB bandwidth, 300 build minutes, no deploy cap) and
> none of the above applies. Look under Team settings → Billing → Usage.
> Migrating to credit pricing is permanent — don't do it without checking.

---

## Things that must not be undone

- **The auth gate.** All three files defer Firestore listeners until anonymous
  sign-in resolves (`authReady` + the wrapped `onSnapshot`). Without it,
  listeners fire without a token, get `permission-denied`, and never retry —
  which looks fine in a normal browser and breaks completely in incognito.
- **Priority scoring** uses a sorted join in all three files. Never revert to
  the `.includes()` form.
- **Week keys are Sunday-anchored** and parsed as local time, never UTC.
