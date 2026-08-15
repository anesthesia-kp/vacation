# Adversarial audit — build 269 (admin only)
**15 Aug 2026 · pre-ship. Attack surface: the server-fresh reads (senders, publish,
begin-phase, restore, log archive), their refusal paths, and the sandbox guards.**

## Attacks tried against the new code
- **Cache impersonating the server** — `getDocFromServer` by SDK contract never serves
  cache; offline → rejection → every caller refuses/aborts. Executed (throwing stub) in
  tests-build269 for all five sites.
- **Refusal path leaks a partial send** — the `_lf.ok` check runs BEFORE any e-mail work,
  inside the try/finally that releases the in-flight guard; a refusal sends zero e-mails
  and releases the guard. Executed (round-sender harness: 0 e-mails + guard released).
- **Hung server read wedges the send button** — a hang holds the in-flight guard (safe
  direction: nothing sends, nothing is stamped); Firestore fails server reads promptly
  when disconnected, and the guard is finally-released on rejection. Residual R-1 below.
- **Publish throws where it never did** — every caller verified to wrap it in try/catch
  with a "nothing was changed / retry" toast (sender, zero-results mark-sent, both skip
  paths, P4 finish stamp). The batch is atomic: a thrown read = zero writes. Executed
  (publish harness: throw → sets.length 0).
- **Stale mirror resurrecting cleared data via the preserve** — the 269 preserves copy
  ONLY the server read back; the mirrors are never spread into a replace anymore. A tab
  that slept through a Reset cannot resurrect the old ledger (its replace would carry the
  server's post-reset state).
- **Begin-phase race (admin B begins while admin A's send is publishing)** — unchanged
  in kind from 268; the ledger preserve is now server-fresh on both sides, so the loser
  of the race can no longer erase the winner's ledger. Both replaces carry it.
- **In-flight log entry lost by the server-read archive** — closed in-build (self-audit
  finding): the archive merges server ∪ mirrors deduped by entry id, so neither a stale
  mirror nor a pending write loses trail entries. Executed pin.
- **Sandbox-guard downgrade in production** — impossible: production always defines the
  symbols; the guards only ever activate in extracted-code sandboxes. Pins fail if a
  guard is removed (convention pins in tests-build269).
- **Reproduction of the original incident** — the browser repro (blip during send →
  restore → re-send) produces 4/4 duplicates on the pushed-268 bytes and ZERO on 269;
  the ledger visibly survives the blip in the 269 run. This is the incident's exact
  mechanism, executed on real pages.

## Accepted residuals
- **R-1 · No client-side timeout on the new server reads** — a pathologically hung (not
  failed) read stalls the action with the in-flight guard held until the SDK gives up;
  the stall direction is safe (nothing sent/stamped/destroyed) and a reload recovers.
  Same class as pre-existing getDoc uses; the backup fetch's `_withTimeout` pattern can
  be grafted later if it ever bites.
- **R-2 · The e-mails themselves remain client-sent (EmailJS)** — a crash mid-loop still
  loses at most the ledger write for the final few addresses; the ledger write + retry
  path (unchanged from 259/234) covers it, now on server truth.
- **R-3 · A malicious admin** can still do anything an admin can do (plan §5a precedent).

## Verdict
Zero open criticals. The 15 Aug incident mechanism (stale-mirror erasure / torn publish /
lost change-log archive) is closed at every write site, with executed proof on both sides
of the fix (268 reproduces; 269 does not).
