// tests-build267.mjs — admin 267: e-mail link dedup + Auction Calendar redesign (fixed 6 HD).
// Logic tests EXECUTE code extracted from the real file. Honesty: --pre runs the same
// assertions against pristine admin 266 (staged fixture) — the CAL2/e-mail tests must fail.
// Fixtures: /tmp/build267/admin_index.html (new) · /tmp/build266/admin_index.html (pristine).
import { readFileSync } from 'fs';
const PRE = process.argv.includes('--pre');
const A = readFileSync(PRE ? '/tmp/build266/admin_index.html' : '/tmp/build267/admin_index.html', 'utf-8');
const S = readFileSync(PRE ? '/tmp/build266/index.html' : '/tmp/build267/index.html', 'utf-8');
const A266 = readFileSync('/tmp/build266/admin_index.html', 'utf-8');

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + ' — ' + e.message); } };
const ta = async (n, f) => { try { await f(); pass++; console.log('  ✅ ' + n); } catch (e) { fail++; console.log('  ❌ ' + n + ' — ' + e.message); } };
const assert = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const eq = (a, b, m) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((m || 'neq') + '\n    got:  ' + x + '\n    want: ' + y); };
function extractFn(src, header) {
  const i = src.indexOf(header); assert(i >= 0, 'missing `' + header.slice(0, 50) + '`');
  let j = src.indexOf('{', i), d = 0, k = j;
  for (; k < src.length; k++) { const c = src[k]; if (c === '{') d++; else if (c === '}') { d--; if (!d) { k++; break; } } }
  return src.slice(i, k);
}
function extractConstArr(src, header) { // const X=[ ... ];
  const i = src.indexOf(header); assert(i >= 0, 'missing ' + header);
  const j = src.indexOf('];', i); return src.slice(i, j + 2);
}

console.log(PRE ? '== HONESTY RUN (pre-fix admin 266: CAL2/e-mail tests below MUST FAIL) ==' : '== BUILD 267 TEST RUN — e-mail dedup + Auction Calendar redesign ==');

console.log('E · e-mail link dedup');
t('reminder e-mail no longer embeds the site URL', () => assert(!A.includes('Place your bids here: https://')));
t('reminder e-mail points at the footer link', () => assert(A.includes('Place your bids using the site link at the bottom of this e-mail.')));
t('contacts e-mail no longer embeds the site URL', () => assert(!A.includes('Sign in here: ${AUCTION_SITE_URL}')));
t('contacts e-mail points at the footer link', () => assert(A.includes('Sign in using the site link at the bottom of this e-mail.')));
t('AUCTION_SITE_URL const fully removed', () => assert(!A.includes('AUCTION_SITE_URL')));

console.log('CAL2 · fixed six high-demand weeks (executed)');
const helpers = extractFn(A, 'function getSundays')
  + '\nfunction dateKey(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }';
t('AC_HD_FIXED: exactly the six, fixed identity', () => {
  const arr = new Function(extractConstArr(A, 'const AC_HD_FIXED=') + ';return AC_HD_FIXED;')();
  eq(arr.map(f => f.label), ['Ski Week', 'Spring Break', 'Spring Break', 'Thanksgiving', 'Christmas', "New Year's"]);
  eq(arr.map(f => f.emoji), ['⛷️', '🌸', '🌸', '🦃', '🎄', '🎆']);
  eq(arr.map(f => f.auto), [false, false, false, true, true, true], 'computable flags');
});
let sug = null;
t('computeSuggestedHolidays byte-identical to build 266 (pinned math untouched)', () => {
  eq(extractFn(A, 'function computeSuggestedHolidays'), extractFn(A266, 'function computeSuggestedHolidays'));
});
t('_acAutoHolidays(2027) = 5 federal holidays incl. Presidents (executed)', () => {
  const code = helpers + '\n' + extractFn(A, 'function computeSuggestedHolidays') + '\n' + extractFn(A, 'function _acAutoHolidays') + ';return {_acAutoHolidays,getSundays,dateKey};';
  const m = new Function('Date', 'Math', 'String', 'Array', code)(Date, Math, String, Array);
  const got = m._acAutoHolidays(2027);
  const wk = i => m.dateKey(m.getSundays(2027)[i - 1]);
  eq(got.map(h => [h.emoji + ' ' + h.label, wk(h.idx)]), [
    ['🕊️ MLK Day', '2027-01-17'], ["🏛️ Presidents' Day", '2027-02-14'],
    ['🇺🇸 Memorial Day', '2027-05-30'],
    ['🎇 July 4th', '2027-07-04'], ['🛠️ Labor Day', '2027-09-05']]);
  assert(got.every(h => h.hd === false), 'a federal decoration claims high demand');
});
t('_acSuggestedHd(2027) fills exactly Thanksgiving/Christmas/New Year\'s (executed)', () => {
  const code = helpers + '\n' + extractFn(A, 'function computeSuggestedHolidays') + '\n' + extractFn(A, 'function _acSuggestedHd') + ';return {_acSuggestedHd,getSundays,dateKey};';
  const m = new Function('Date', 'Math', 'String', 'Array', code)(Date, Math, String, Array);
  const s = m._acSuggestedHd(2027);
  const wk = i => m.dateKey(m.getSundays(2027)[i - 1]);
  eq([wk(s.thanks), wk(s.xmas), wk(s.nye)], ['2027-11-21', '2027-12-19', '2027-12-26']);
  eq(Object.keys(s).sort(), ['nye', 'thanks', 'xmas'], 'extra keys suggested');
});

console.log('CAL2 · save flow (real saveAuctionCalendar, executed)');
{
  const AC_DEF_COLORS = {
    'Ski Week': { fg: '#00587c' }, 'Spring Break': { fg: '#4f42a3' }, 'Thanksgiving': { fg: '#b4470f' },
    'Christmas': { fg: '#00753a' }, "New Year's": { fg: '#006ba6' },
  };
  const mkCtx = (draft) => {
    const cap = { toasts: [], saved: null };
    const ctx = {
      _acDraft: draft,
      phase1Started: () => false,
      getSundays: null, dateKey: null, // filled from extracted helpers below
      toast: (m) => cap.toasts.push(m),
      openConfirm: () => {}, setTimeout: () => {},
      setDoc: async (_r, data) => { cap.saved = data; }, adminRef: {},
      document: { getElementById: () => null }, // _acReadDraftFromDom becomes a no-op
      AC: { holidays: [] }, AC_NEUTRAL_COLOR: { fg: '#00587c', bg: 'b', border: 'r' },
      AC_DEFAULTS: { holidays: Object.entries(AC_DEF_COLORS).map(([label, color]) => ({ label, color })) },
      Date, Math, String, Array, Number, Set, JSON, console,
    };
    return { ctx, cap };
  };
  const runSave = async (draft) => {
    const { ctx, cap } = mkCtx(draft);
    const code = helpers + '\n'
      + extractConstArr(A, 'const AC_HD_FIXED=') + '\n'
      + [ 'function computeSuggestedHolidays', 'function _acAutoHolidays', 'function _acColorFor', 'function _acNormalize', 'function _acReadDraftFromDom', 'async function saveAuctionCalendar' ].map(h => extractFn(A, h)).join('\n')
      + '\n;return saveAuctionCalendar;';
    const fn = new Function('ctx', `with(ctx){ ${code} }`)(ctx);
    await fn();
    return cap;
  };
  const FULL = { year: 2027, summerStartIdx: 22, summerEndIdx: 34, hd: { ski: 7, spring1: 13, spring2: 14, thanks: 47, xmas: 51, nye: 52 } };
  await ta('unset ski week → save refused, names the missing week', async () => {
    const cap = await runSave({ ...FULL, hd: { ...FULL.hd, ski: 0 } });
    assert(!cap.saved, 'saved despite unset week');
    assert(cap.toasts.some(m => /Choose a week for ⛷️ Ski Week/.test(m)), 'no naming toast: ' + JSON.stringify(cap.toasts));
  });
  await ta('duplicate HD weeks → save refused', async () => {
    const cap = await runSave({ ...FULL, hd: { ...FULL.hd, spring2: 13 } });
    assert(!cap.saved && cap.toasts.some(m => /same week/.test(m)));
  });
  await ta('valid draft → saves 6 fixed HD + 4 auto decorations, sorted, colors right', async () => {
    const cap = await runSave(JSON.parse(JSON.stringify(FULL)));
    assert(cap.saved && cap.saved.auctionConfig, 'nothing saved');
    const hol = cap.saved.auctionConfig.holidays;
    eq(hol.filter(h => h.highDemand).length, 6, 'HD count');
    eq(hol.filter(h => !h.highDemand).map(h => h.label), ['MLK Day', 'Memorial Day', 'July 4th', 'Labor Day']);
    const ski = hol.find(h => h.label === 'Ski Week');
    eq(ski.note, "🏛️ Presidents' Day", 'Presidents note missing on Ski Week (2027: same week)');
    assert(hol.filter(h => h.highDemand).every(h => h.color && h.color.fg), 'HD week missing fixed color');
    assert(hol.filter(h => !h.highDemand).every(h => h.color === null), 'decoration carries a color');
    const wks = hol.map(h => h.wk);
    eq(wks, [...wks].sort(), 'holidays not sorted by week');
    eq(hol.filter(h => h.label === 'Spring Break').length, 2, 'two spring breaks');
  });
  await ta('decoration colliding with a chosen HD week becomes a NOTE (dual label, no dup keys)', async () => {
    // Ski Week ON the MLK week (wk 3): MLK rides as a note; Presidents (wk 7) is freed → own entry
    const cap = await runSave({ ...FULL, hd: { ...FULL.hd, ski: 3 } });
    const hol = cap.saved.auctionConfig.holidays;
    const keys = hol.map(h => h.wk);
    eq(keys.length, new Set(keys).size, 'duplicate week keys in config');
    assert(!hol.some(h => h.label === 'MLK Day'), 'colliding decoration kept its own entry');
    eq(hol.find(h => h.label === 'Ski Week').note, '🕊️ MLK Day', 'collision did not become a note');
    assert(hol.some(h => h.label === "Presidents' Day" && !h.highDemand), 'freed Presidents entry missing');
  });
}

console.log('CAL2 · dual label (note) — both twins');
t('_acNormalize preserves the note IDENTICALLY on both sites (twin discipline)', () => {
  eq(extractFn(A, 'function _acNormalize'), extractFn(S, 'function _acNormalize'));
  assert(extractFn(A, 'function _acNormalize').includes('_e.note=h.note.trim().slice(0,60)'));
});
t('staff SPECIAL_WEEKS renders the dual label; default config unchanged (executed)', () => {
  const build = new Function('AC', 'AC_NEUTRAL_COLOR', extractFn(S, 'function getSundays') /*unused, scope*/ + `;
    const SPECIAL_WEEKS={};` + S.slice(S.indexOf('AC.holidays.forEach(h=>{'), S.indexOf('});', S.indexOf('AC.holidays.forEach(h=>{')) + 3) + `;return SPECIAL_WEEKS;`);
  const neutral = { fg: 'f', bg: 'b', border: 'r' };
  const withNote = build({ holidays: [{ wk: 'W', label: 'Ski Week', emoji: '⛷️', highDemand: true, note: "🏛️ Presidents' Day" }] }, neutral);
  eq(withNote.W.label, "⛷️ Ski Week · 🏛️ Presidents' Day");
  eq(withNote.W.slots, 5, 'HD behavior altered by a note');
  const noNote = build({ holidays: [{ wk: 'W', label: 'Ski Week', emoji: '⛷️', highDemand: true }] }, neutral);
  eq(noNote.W.label, '⛷️ Ski Week', 'default label changed');
});
t('editor auto-line flags a shared high-demand week', () =>
  assert(A.includes('shares a high-demand week; will show as a dual label')));
t('staff BUILD 138', () => assert(S.includes('var BUILD = 138')));

console.log('CAL2 · UI pins');
t('no High-demand checkbox, no add/delete rows, no editable name/emoji inputs', () => {
  assert(!A.includes('acHolHd') && !A.includes('_acAddHolRow') && !A.includes('_acDelHolRow') && !A.includes('acHolEmoji') && !A.includes('acHolLabel'), 'editable-holiday machinery still present');
});
t('suggest button targets exactly the three computable weeks', () =>
  assert(A.includes('✨ Suggest Thanksgiving / Christmas / New Year')));
t('unset weeks show an explicit "— choose week —" option', () =>
  assert(A.includes('— choose week —')));
t('school-calendar weeks clear on year change; computable weeks track the year (source pin)', () =>
  assert(/_acYearChanged[\s\S]{0,600}hd\.ski=0; _acDraft\.hd\.spring1=0; _acDraft\.hd\.spring2=0;[\s\S]{0,300}_acSuggestedHd\(y\)/.test(A)));
t('auto-labeled holidays line present (display-only, computed from the year)', () =>
  assert(A.includes('Auto-labeled holidays (fixed by the year, nothing to choose)')));
t('summer slots text sits on its own line below the selectors (1-2 lines)', () => {
  const i = A.indexOf("_acWkSelect('acSummerE'"); assert(i > 0, 'summer selector missing');
  const after = A.slice(i, i + 400);
  assert(/<\/div>\s*\n\s*<div style="font-size:11px;color:var\(--t2\);margin-top:3px">4 default slots per summer week<\/div>/.test(after), 'summer note not below the selector row');
  assert(!/<span[^>]*>\(4 default slots per summer week\)<\/span>/.test(A), 'old inline span remains');
});
t('editor lock + save lock unchanged (phase1Started gates both)', () => {
  const ed = A.slice(A.indexOf('window.openAuctionCalendarEditor'), A.indexOf('async function saveAuctionCalendar'));
  assert(ed.includes('phase1Started()'), 'open not locked');
  const sv = A.slice(A.indexOf('async function saveAuctionCalendar'), A.indexOf('// ── end Auction Calendar editor'));
  assert(sv.includes('phase1Started()'), 'save not locked');
});
t('old generic validation messages gone (replaced by exactly-six rule)', () =>
  assert(!A.includes('At least one high-demand holiday is required') && !A.includes('Every holiday needs a name')));

console.log('build');
t('admin BUILD 267', () => assert(A.includes('var BUILD = 267')));

console.log(`\n${PRE ? '[HONESTY RUN] ' : ''}RESULT: ${pass} passed, ${fail} failed`);
if (PRE) console.log('Honesty interpretation: failures above are the PROOF the tests detect the pre-fix build.');
process.exit(PRE ? 0 : (fail ? 1 : 0));
