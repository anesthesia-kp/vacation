# BUILD LOG — Vacation Auction (MD)

**Why this file exists.** Same reason as the schedule's: commit subjects have been lost to
mis-pastes before, so every build gets a row here, written at the same time as the code.
Agreed 17 Aug 2026; starts at build 270 (history before 270 lives in
`anesthesia-kp.github.io/HANDOFF.md` and `DECISIONS.md`, both committed).

The build number below is authoritative: read out of `var BUILD` in that commit's own
bytes, not taken from the commit subject.

| build | commit | date | what shipped |
|---|---|---|---|
| **270 · staff 140** | *(fill sha at push)* | 18 Aug 2026 | THE M3 BUILD — mixed-case e-mail fix (TODO §1 B2, scope frozen 17 Aug + one 18 Aug ruling, DECISIONS §58). (1) READ SIDE: admin `recipientsFor` returns LOWER-CASED addresses (`out.push(k)`) — what its comment always claimed and what the staff site always did — so the two sites agree regardless of stored case; no data migration. (2) SAVE HYGIENE, both sites' KP-address saves (`_normKpEmail`, byte-identical in both files): trim + lower-case; refuse ONLY the unarguable — whitespace inside · more than one @ · domain without a dot · leading/trailing dot in local part or domain. NO domain policy (HANDOFF D5). Admin Users-page save, Add User secondary (refusal now toasted, never silent), staff KP prompt. (3) CASE-BLIND ALREADY-SENT CHECKS (owner ruling 18 Aug): `_sentAddrsFor` + `_ledgerFresh` lower-case ledger membership; both sites' mail-queue `sentTo` skips lower-case before comparing — a pre-270 mixed-case ledger entry can never cause a duplicate results e-mail on retry. CRNA restamped from the fixed MD pages (crna/ bytes change; mechanical, pinned by test-crna-stamp). Gates: NEW `tests/test-m3-email-case.mjs` 43/43 executing both sites' real extracted functions on a mixed-case roster · honesty `--pre` vs pushed 269/139 fixtures (md5s in the suite header) fails exactly on the defect · FULL auction battery 16 suites / 1,144 assertions green in-cloud · `node --check` clean on all 4 pages. Two suite harnesses re-anchored to the lower-case contract (test-p4-rounds stub + [D] fixture kept mixed-case on purpose; test-audit-fixes D8 sandbox bundles `_normKpEmail`) — no assertion weakened. |
