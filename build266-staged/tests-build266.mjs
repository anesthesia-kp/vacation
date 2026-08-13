// tests-build266.mjs — Bid Floors by Week Category (admin 266 / staff 137)
// Discipline: logic tests EXECUTE code extracted from the real files. Honesty: --pre runs the
// same assertions against pristine admin 265 / staff 136 (BF tests must fail there).
// Killer test: NO-OP EQUIVALENCE — with no saved floors, the allowed-bid decision on every
// (week category × bid value) is EXACTLY the old hardwired behavior.
// Fixture paths: /tmp/build266/* (new) and /tmp/admin.html + /tmp/staff.html (pristine 265/136).
import { readFileSync } from 'fs';
const PRE = process.argv.includes('--pre');
const A = readFileSync(PRE ? '/tmp/admin.html' : '/tmp/build266/admin_index.html', 'utf-8');
const S = readFileSync(PRE ? '/tmp/staff.html' : '/tmp/build266/index.html', 'utf-8');

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + ' — ' + e.message); } };
const assert = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const eq = (a, b, m) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((m || 'not equal') + '\n    got:  ' + x + '\n    want: ' + y); };

function extractFn(src, header) {
  const i = src.indexOf(header);
  assert(i >= 0, 'cannot locate `' + header.slice(0, 50) + '…`');
  let j = src.indexOf('{', i), d = 0, k = j;
  for (; k < src.length; k++) { const c = src[k]; if (c === '{') d++; else if (c === '}') { d--; if (!d) { k++; break; } } }
  return src.slice(i, k);
}

// ── shared sandbox: BF core extracted from each site, with that site's scorer ──
function bfSandbox(src, site, { adminSettings = {} } = {}) {
  const scorer = site === 'admin'
    ? extractFn(src, 'function pScore(p)')
    : 'function priorityScore(p){\n  if(p==="NP") return 99;\n  if(Array.isArray(p)){\n    const s=[...p].sort((a,b)=>a-b).join(\',\');\n    if(s===\'1,2,3\') return 0;\n    if(s===\'1,2\') return 1;\n    return Math.min(...p)+1;\n  }\n  return p+1;\n}';
  const core = ['const BF_DEFAULTS=', 'function _bfNormalize', 'function bfFloors()', 'function _bfParse', 'function bfAllows', 'function bfAllowedText', 'function bfRulesBullets']
    .map(h => h.startsWith('const') ? src.slice(src.indexOf(h), src.indexOf('\n', src.indexOf(h)) + 1) : extractFn(src, h)).join('\n');
  const floorFor = extractFn(src, 'function bfFloorFor');
  const env = {
    adminSettings,
    weekMeta: { HD: { highPriorityOnly: true }, SUM: { summerOnly: true }, OTHER: {} },
    HIGH_DEMAND_WEEKS: new Set(['2027-02-14']),
    AC_SUMMER_START: new Date('2027-05-30T00:00:00'), AC_SUMMER_END: new Date('2027-08-22T00:00:00'),
    AC: { holidays: [
      { wk: '2027-02-14', label: 'Ski Week', highDemand: true }, { wk: '2027-03-28', label: 'Spring Break', highDemand: true },
      { wk: '2027-04-04', label: 'Spring Break', highDemand: true }, { wk: '2027-11-21', label: 'Thanksgiving', highDemand: true },
      { wk: '2027-12-19', label: 'Christmas', highDemand: true }, { wk: '2027-12-26', label: "New Year's", highDemand: true }] },
    Date, Array, String, Number, Object, JSON, Math, parseInt,
  };
  const code = scorer + '\n' + core + '\n' + floorFor +
    '\n;return {bfFloors,bfFloorFor,bfAllows,_bfParse,_bfNormalize,bfAllowedText,bfRulesBullets};';
  return new Function(...Object.keys(env), code)(...Object.values(env));
}

const ALL_VALUES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '1,2', '1,2,3', 'NP'];
const OLD_HD_ALLOWED = new Set(['1', '2', '3', '4', '1,2', '1,2,3']); // the removed hardwired set

console.log(PRE ? '== HONESTY RUN (pre-fix 265/136: BF tests below MUST FAIL) ==' : '== BUILD 266/137 TEST RUN — Bid Floors ==');

console.log('BF · core + NO-OP EQUIVALENCE (executed, both sites)');
for (const [site, src] of [['admin', A], ['staff', S]]) {
  t(site + ': BF core present', () => assert(src.includes('const BF_DEFAULTS=') && src.includes('function _bfEngineFilter')));
  if (!src.includes('const BF_DEFAULTS=')) continue;
  const sb = bfSandbox(src, site);
  const wk = site === 'admin' ? { hd: '2027-02-14', sum: '2027-07-04', oth: '2027-01-10' } : { hd: 'HD', sum: 'SUM', oth: 'OTHER' };
  t(site + ': defaults = {highDemand:"4",summer:"none"}', () => eq(sb.bfFloors(), { highDemand: '4', summer: 'none' }));
  t(site + ': NO-OP — HD week allowed set === old hardwired set (all 13 values)', () => {
    for (const v of ALL_VALUES) eq(sb.bfAllows(sb._bfParse(v), sb.bfFloorFor(wk.hd)), OLD_HD_ALLOWED.has(v), 'value ' + v);
  });
  t(site + ': NO-OP — summer & other weeks allow every value (old behavior)', () => {
    for (const v of ALL_VALUES) { assert(sb.bfAllows(sb._bfParse(v), sb.bfFloorFor(wk.sum)), 'summer ' + v); assert(sb.bfAllows(sb._bfParse(v), sb.bfFloorFor(wk.oth)), 'other ' + v); }
  });
  t(site + ': full truth table — every floor × every value matches the strength rule', () => {
    const score = p => p === 'NP' ? 99 : (Array.isArray(p) ? ({ '1,2,3': 0, '1,2': 1 })[[...p].sort((a, b) => a - b).join(',')] ?? Math.min(...p) + 1 : p + 1);
    for (const f of ['3', '4', '5', '6', '7', '8', '9', '10']) for (const v of ALL_VALUES) {
      const p = sb._bfParse(v);
      eq(sb.bfAllows(p, f), v !== 'NP' && score(p) <= Number(f) + 1, `floor ${f} value ${v}`);
    }
    for (const v of ALL_VALUES) assert(sb.bfAllows(sb._bfParse(v), 'none'), 'none ' + v);
  });
  t(site + ': saved floors are adopted live from adminSettings', () => {
    const sb2 = bfSandbox(src, site, { adminSettings: { bidFloors: { highDemand: '7', summer: '3' } } });
    assert(sb2.bfAllows(7, sb2.bfFloorFor(wk.hd)) && !sb2.bfAllows(8, sb2.bfFloorFor(wk.hd)), 'HD floor 7');
    assert(sb2.bfAllows(3, sb2.bfFloorFor(wk.sum)) && !sb2.bfAllows(4, sb2.bfFloorFor(wk.sum)), 'summer floor 3');
    assert(!sb2.bfAllows('NP', sb2.bfFloorFor(wk.sum)), 'NP blocked under numeric floor');
  });
  t(site + ': _bfNormalize rejects 2, 11, garbage; corrupt config → defaults (no throw)', () => {
    assert(sb._bfNormalize({ highDemand: '2', summer: 'none' }) === null);
    assert(sb._bfNormalize({ highDemand: '11', summer: 'none' }) === null);
    assert(sb._bfNormalize({ highDemand: '4' }) === null);
    assert(sb._bfNormalize('lol') === null);
    const sb2 = bfSandbox(src, site, { adminSettings: { bidFloors: { highDemand: 'DROP TABLE', summer: [] } } });
    eq(sb2.bfFloors(), { highDemand: '4', summer: 'none' });
  });
  t(site + ': default rules bullet === the old hardwired sentence EXACTLY', () => {
    eq(sb.bfRulesBullets(), [`On the highest demand weeks (Ski Week, Spring Break, Thanksgiving, Christmas, New Year's), only bids of 1, 2, 3, 4, 1/2, or 1/2/3 may be used`]);
  });
}

console.log('BF · ENGINE enforcement (real computeApprovals, executed — admin twin)');
{
  const names = ['function pScore(p)', 'function _isScorableBid(p)', 'function getUserFTE(', 'function getSlots(', 'function getUserBidPhaseAdmin(', 'function getPriorPhaseWinners(', 'function getPriorPhaseFteWon(', 'function getReviewThreshold(', 'function npAllowedForPhase(', 'function bfFloors()', 'function bfFloorFor', 'function bfAllows', 'function _bfParse', 'function _bfEngineFilter', 'function _bfOverrideEligible', 'function _bfNormalize', 'function computeApprovals('];
  const has = h => A.indexOf(h) >= 0;
  t('admin: all engine pieces extractable', () => { for (const h of names) assert(has(h), 'missing ' + h); });
  const run = ({ schedule, bidPhase, denied = {}, approvals = {}, npPhases = {}, floors = undefined, slots = { '2027-02-14': 1, '2027-01-10': 1 } }) => {
    const code = A.slice(A.indexOf('const BF_DEFAULTS='), A.indexOf('\n', A.indexOf('const BF_DEFAULTS=')) + 1) + names.map(h => extractFn(A, h)).join('\n');
    const ctx = {
      scheduleData: schedule, bidPhaseData: bidPhase, deniedData: denied, approvalsData: approvals,
      phasesData: { currentPhase: 1, completedPhases: {}, phase1Started: true },
      adminSettings: { reviewThreshold: 1.0, npAllowedPhases: npPhases, ...(floors ? { bidFloors: floors } : {}) },
      slotsData: slots, fteData: { U1: 1, U2: 1, U3: 1 }, bestBidsData: {},
      mondays: [new Date('2027-02-14T00:00:00'), new Date('2027-01-10T00:00:00')],
      dateKey: d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      weekMeta: {}, HIGH_DEMAND_WEEKS: new Set(['2027-02-14']),
      AC_SUMMER_START: new Date('2027-05-30T00:00:00'), AC_SUMMER_END: new Date('2027-08-22T00:00:00'),
      _i2DisqualifiedSet: () => new Set(), p4RoundWinnersOn: () => new Set(), console, Number, Array, Object, Set, Math, JSON, String, isNaN, Infinity, parseInt, Date,
    };
    return new Function('ctx', `with(ctx){ ${code}\n return computeApprovals(false); }`)(ctx);
  };
  t('forged below-floor bid (7 on HD week) cannot win a THIN week [engine]', () => {
    const ap = run({ schedule: { U1: { '2027-02-14': 7 } }, bidPhase: { U1: { '2027-02-14': 1 } } });
    const w = ap['2027-02-14'];
    assert(!w.winners.has('U1') && !w.draws.has('U1') && !w.reviews.has('U1'), 'below-floor bid won/drew/reviewed: ' + JSON.stringify([...w.winners]));
  });
  t('legal bid wins alongside it; forged below-floor bid stays out [engine]', () => {
    const ap = run({ schedule: { U1: { '2027-02-14': 7 }, U2: { '2027-02-14': 4 } }, bidPhase: { U1: { '2027-02-14': 1 }, U2: { '2027-02-14': 1 } } });
    const w = ap['2027-02-14'];
    assert(w.winners.has('U2') && !w.winners.has('U1'));
  });
  t('floors read live: floor 7 makes the same bid legal [engine]', () => {
    const ap = run({ schedule: { U1: { '2027-02-14': 7 } }, bidPhase: { U1: { '2027-02-14': 1 } }, floors: { highDemand: '7', summer: 'none' } });
    assert(ap['2027-02-14'].winners.has('U1'));
  });
  t('forged NP in an NP-OFF phase cannot win an empty standard week [engine]', () => {
    const ap = run({ schedule: { U1: { '2027-01-10': 'NP' } }, bidPhase: { U1: { '2027-01-10': 1 } }, npPhases: { 1: false } });
    assert(!ap['2027-01-10'].winners.has('U1'));
  });
  t('legally placed NP (phase toggle ON at placement) still competes [engine, regression]', () => {
    const ap = run({ schedule: { U1: { '2027-01-10': 'NP' } }, bidPhase: { U1: { '2027-01-10': 1 } }, npPhases: { 1: true } });
    assert(ap['2027-01-10'].winners.has('U1'));
  });
  t('explicit admin approval of a below-floor bid IS honored (sanctioned override) [engine]', () => {
    const ap = run({ schedule: { U1: { '2027-02-14': 7 } }, bidPhase: { U1: { '2027-02-14': 1 } }, approvals: { '2027-02-14': ['U1'] } });
    const w = ap['2027-02-14'];
    assert(w.winners.has('U1'), 'override ignored');
    eq(w.fteWon, 1, 'override FTE not counted');
  });
  t('below-floor denied bid never sets the NE-1 lockout floor (source pin)', () =>
    assert(A.includes('never a legal competitor — it blocks nothing') || /_blockFloor[\s\S]{0,600}_bfEngineFilter/.test(A), 'blockFloor exclusion missing'));
}

console.log('BF · staff twin engine (executed)');
{
  const has = h => S.indexOf(h) >= 0;
  t('staff: engine filter present in competitor loop (source pin)', () =>
    assert(/getUserBidPhase\(u,wk\)<Number\(phasesData\.currentPhase\|\|1\)\) continue;[\s\S]{0,400}_bfEngineFilter\(u,wk,p\)\) continue;\n\s*reqs\.push\(\{user:u,score:priorityScore/.test(S)));
  t('staff: _bfEngineFilter uses PLACEMENT phase for NP (source pin)', () =>
    assert(S.includes('npAllowedForPhase(getUserBidPhase(u,wk))')));
  t('admin: _bfEngineFilter uses PLACEMENT phase for NP (source pin)', () =>
    assert(A.includes('npAllowedForPhase(getUserBidPhaseAdmin(u,wk))')));
  t('staff: _bfEngineFilter executes correctly (extracted)', () => {
    const dflt = S.slice(S.indexOf('const BF_DEFAULTS='), S.indexOf('\n', S.indexOf('const BF_DEFAULTS=')) + 1);
    const code = dflt + extractFn(S, 'function bfAllows') + '\n' + extractFn(S, 'function bfFloors()') + '\n' + extractFn(S, 'function _bfNormalize') + '\n' + extractFn(S, 'function bfFloorFor') + '\n' + extractFn(S, 'function _bfEngineFilter') + '\nfunction priorityScore(p){return p==="NP"?99:(Array.isArray(p)?({"1,2,3":0,"1,2":1})[[...p].sort((a,b)=>a-b).join(",")]??Math.min(...p)+1:p+1);}';
    const env = { adminSettings: {}, weekMeta: { HD: { highPriorityOnly: true }, O: {} }, npAllowedForPhase: ph => ph >= 3, getUserBidPhase: () => 1, parseInt, Array, String, Number, Math };
    const f = new Function(...Object.keys(env), code + ';return _bfEngineFilter;')(...Object.values(env));
    assert(f('u', 'HD', 4) === true, 'legal HD bid');
    assert(f('u', 'HD', 7) === false, 'below-floor HD bid');
    assert(f('u', 'O', 'NP') === false, 'NP placed in NP-off phase 1');
  });
}

console.log('BF · simulator derives from floors (executed)');
{
  t('sim: default floors reproduce the old allowed lists exactly', () => {
    const code = 'const SIM_ALL_BIDS=["1","2","3","4","5","6","7","8","9","10","NP","1,2","1,2,3"];\n' + A.slice(A.indexOf('const BF_DEFAULTS='), A.indexOf('\n', A.indexOf('const BF_DEFAULTS=')) + 1)
      + extractFn(A, 'function pScore(p)') + '\n' + extractFn(A, 'function _bfNormalize') + '\n' + extractFn(A, 'function bfFloors()') + '\n' + extractFn(A, 'function bfFloorFor') + '\n' + extractFn(A, 'function _bfParse') + '\n' + extractFn(A, 'function bfAllows') + '\n' + extractFn(A, 'function simGetAllowedBids(wk)');
    const mk = (npOn, floors) => new Function('ctx', `with(ctx){ ${code}\n return simGetAllowedBids; }`)({
      adminSettings: floors ? { bidFloors: floors } : {}, phasesData: { currentPhase: 1 },
      npAllowedForPhase: () => npOn, HIGH_DEMAND_WEEKS: new Set(['HDWK']),
      AC_SUMMER_START: new Date('2027-05-30T00:00:00'), AC_SUMMER_END: new Date('2027-08-22T00:00:00'),
      Date, Array, String, Number, Math, parseInt, console,
    });
    eq(mk(true)('HDWK'), ['1', '2', '3', '4', '1,2', '1,2,3'], 'HD default = old SIM_HIGH_PRIORITY_ALLOWED');
    eq(mk(true)('2027-01-10'), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'NP', '1,2', '1,2,3'], 'other week np-on = all');
    eq(mk(false)('2027-01-10'), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '1,2', '1,2,3'], 'np-off drops NP');
    eq(mk(true, { highDemand: '4', summer: '6' })('2027-07-04'), ['1', '2', '3', '4', '5', '6', '1,2', '1,2,3'], 'summer floor 6');
  });
}

console.log('BF · UI wiring (source pins)');
t('staff picker uses bfFloorFor (old hardwired check gone)', () => assert(S.includes('const _bfF=bfFloorFor(wk);') && !S.includes('HIGH_PRIORITY_ALLOWED.has(v)')));
t('staff save guard names the floor dynamically', () => assert(S.includes('bfAllowedText(_bfF)') && !S.includes('only accepts bids of 1, 2, 3, 4, \\"1/2\\", or \\"1/2/3\\"')));
t('staff rules line is dynamic (id + updater)', () => assert(S.includes('id="ruleBidFloors"') && S.includes("getElementById('ruleBidFloors')")));
t('staff welcome e-mail bullet from bfRulesBullets', () => assert(S.includes('...bfRulesBullets(),')));
t('admin welcome e-mail bullet from bfRulesBullets', () => assert(A.includes('...bfRulesBullets(),')));
t('admin card present below NP Bids by Phase', () => {
  const np = A.indexOf('NP Bids by Phase'); const bf = A.indexOf('🎚 Bid Floors by Week Category');
  assert(np > 0 && bf > np && bf - np < 4000, 'card missing or misplaced');
});
t('admin card: dropdown label is "No floor — all bids allowed" (never "NP"/"None")', () =>
  assert(A.includes("v==='none'?'No floor — all bids allowed':v")));
t('admin card: fixed all-other-weeks row', () => assert(A.includes('No floor — all bids allowed · <i>always</i>')));
t('admin save: click-time phase1Started guard + merge write', () =>
  assert(/window\._bfChanged=function\(\)\{\s*\n\s*\/\/[^\n]*\n\s*if\(phase1Started\(\)\)/.test(A) && A.includes('setDoc(adminRef,{bidFloors:cfg},{merge:true})')));
t('admin card renderer disables selects once Phase 1 begins', () => assert(A.includes('el.disabled=locked;')));
t('admin render hook alongside NP toggles', () => assert(A.includes('renderBidFloorsCard(); // [build 266 · BF]')));
t('adApprove warns on below-floor / NP-forged override (never silent)', () =>
  assert(A.includes('_bfWarnHtml') && A.includes("BELOW this week's bid floor")));
t('old hardwired sim list gone', () => assert(!A.includes('SIM_HIGH_PRIORITY_ALLOWED')));

console.log('builds');
t('admin BUILD 266', () => assert(A.includes('var BUILD = 266')));
t('staff BUILD 137', () => assert(S.includes('var BUILD = 137')));

console.log(`\n${PRE ? '[HONESTY RUN] ' : ''}RESULT: ${pass} passed, ${fail} failed`);
if (PRE) console.log('Honesty interpretation: failures above are the PROOF the tests detect the pre-fix behavior.');
process.exit(PRE ? 0 : (fail ? 1 : 0));
