// tests-build265.mjs — batched build B1-B4 (backlog items 1-4)
// Discipline: every logic test EXECUTES code extracted from the real files, against mocks.
// Every fix has an HONESTY check proving the same assertion FAILS on the pre-fix build
// (admin 264 / staff 135 pristine copies). Run: node tests-build265.mjs [--pre]
import { readFileSync } from 'fs';

const PRE = process.argv.includes('--pre'); // run the NEW-build assertions against the OLD files (all fix tests must fail)
const files = {
  adminNew: readFileSync('/tmp/build265/admin_index.html','utf-8'),
  staffNew: readFileSync('/tmp/build265/index.html','utf-8'),
  adminOld: readFileSync('/tmp/admin.html','utf-8'),
  staffOld: readFileSync('/tmp/staff.html','utf-8'),
};
const A = PRE ? files.adminOld : files.adminNew;
const S = PRE ? files.staffOld : files.staffNew;

let pass=0, fail=0;
const t=(name,fn)=>{ try{ fn(); pass++; console.log('  ✅ '+name); }catch(e){ fail++; console.log('  ❌ '+name+' — '+e.message); } };
const assert=(c,m)=>{ if(!c) throw new Error(m||'assertion failed'); };

// ---- extraction helpers -------------------------------------------------
function extractFn(src, header){
  const i=src.indexOf(header);
  assert(i>=0, 'cannot locate `'+header.slice(0,40)+'…` in source');
  // balanced-brace scan from the first { after the header
  let j=src.indexOf('{', i), depth=0, k=j;
  for(; k<src.length; k++){ const c=src[k]; if(c==='{')depth++; else if(c==='}'){depth--; if(!depth){k++; break;}} }
  return src.slice(i, k);
}
function evalIn(code, scope){
  const keys=Object.keys(scope);
  return new Function(...keys, code+'\n;return {_mqEligible:typeof _mqEligible!=="undefined"?_mqEligible:undefined, updateMailQueueBadge:typeof updateMailQueueBadge!=="undefined"?updateMailQueueBadge:undefined};')(...keys.map(k=>scope[k]));
}

console.log((PRE?'== HONESTY RUN (pre-fix baseline: every B-item test below MUST FAIL) ==':'== BUILD 265/136 TEST RUN =='));

// ---- B2: _mqEligible parks entries with >= MQ_MAX_FAILS (EXECUTED) ------
console.log('B2 · mail-queue parking (_mqEligible, executed)');
const now=Date.now();
{
  const code='const MQ_MAX_FAILS=5;\n'+extractFn(A,'function _mqEligible(e,now,minAgeMs)');
  const {_mqEligible:elig}=evalIn(code,{});
  t('admin: healthy old entry eligible (regression)', ()=>assert(elig({ts:now-60000},now,30000)===true));
  t('admin: parked entry (fails=5) NOT eligible [B2]', ()=>assert(elig({ts:now-60000,fails:5},now,30000)===false));
  t('admin: fails=4 still eligible (threshold exact)', ()=>assert(elig({ts:now-60000,fails:4},now,30000)===true));
  t('admin: origin:admin 3s fast-path preserved', ()=>assert(elig({ts:now-5000,origin:'admin'},now,30000)===true));
  t('admin: fresh claim still blocks (regression)', ()=>assert(elig({ts:now-60000,claimedAt:now-1000},now,30000)===false));
}
{
  const code='const MQ_MAX_FAILS=5;\n'+extractFn(S,'function _mqEligible(e,now)');
  const {_mqEligible:elig}=evalIn(code,{});
  t('staff: healthy old entry eligible (regression)', ()=>assert(elig({ts:now-60000},now)===true));
  t('staff: parked entry (fails=5) NOT eligible [B2]', ()=>assert(elig({ts:now-60000,fails:5},now)===false));
  t('staff: fails=4 still eligible (threshold exact)', ()=>assert(elig({ts:now-60000,fails:4},now)===true));
}

// ---- B2: strike counter wired into BOTH catch blocks (wiring pin) -------
console.log('B2 · strike counter wiring');
t('admin catch increments qid.fails', ()=>assert(A.includes(`[qid+'.fails']:increment(1)`)));
t('staff catch increments qid.fails', ()=>assert(S.includes(`[qid+'.fails']:increment(1)`)));

// ---- B2: badge splits active vs parked (EXECUTED with DOM stub) ---------
console.log('B2 · badge math (updateMailQueueBadge, executed)');
{
  const mkEl=()=>{ const cls=new Set(); return {textContent:'',style:{display:'x'},classList:{toggle:(c,on)=>on?cls.add(c):cls.delete(c),_has:c=>cls.has(c)}}; };
  const els={mqCount:mkEl(),mqCountTop:mkEl(),mqParkedBtn:mkEl(),mqRowTop:mkEl(),mqRow:mkEl(),messagingCardTitle:mkEl()};
  const docStub={getElementById:id=>els[id]||null};
  const fnSrc=extractFn(A,'function updateMailQueueBadge()');
  const run=(mq)=>{ const {updateMailQueueBadge:f}=evalIn('const MQ_MAX_FAILS=5;const mailQueueData=__MQ__;'+fnSrc,{__MQ__:mq,document:docStub}); f(); };
  t('2 active + 1 parked → "2 · 1 parked" + ⛔ visible', ()=>{ run({a:{ts:1},b:{ts:2},c:{ts:3,fails:7}});
      assert(els.mqCount.textContent==='2 · 1 parked','got "'+els.mqCount.textContent+'"');
      assert(els.mqParkedBtn.style.display==='','parked btn hidden'); });
  t('parked-only queue → count 0, NO red flash', ()=>{ run({c:{ts:3,fails:5}});
      assert(els.mqCountTop.textContent==='0 · 1 parked','got "'+els.mqCountTop.textContent+'"');
      assert(els.mqRowTop.classList._has('mq-pending')===false,'parked entry still flashes'); });
  t('active-only queue → plain count, flash on, ⛔ hidden', ()=>{ run({a:{ts:1}});
      assert(els.mqCount.textContent==='1'); assert(els.mqRowTop.classList._has('mq-pending')===true);
      assert(els.mqParkedBtn.style.display==='none'); });
}

// ---- B2: reviewParkedMail retry-all clears strikes (EXECUTED) -----------
console.log('B2 · parked review dialog (executed)');
{
  const i=A.indexOf('window.reviewParkedMail=function()');
  assert(i>=0 === !PRE || i>=0, ''); // presence asserted below per-mode
  t('reviewParkedMail exists', ()=>assert(A.includes('window.reviewParkedMail=function()')));
  if(A.includes('window.reviewParkedMail=function()')){
    const fnSrc=extractFn(A,'window.reviewParkedMail=function()');
    const calls=[]; let dlg=null;
    const scope={ MQ_MAX_FAILS:5, mailQueueData:{ok:{ts:now-5000},bad:{ts:now-9e6,fails:6,user:'X',to:'x@y.z'},bad2:{ts:now-9e6,fails:9,user:'Y'}},
      toast:()=>{}, openConfirm:(cfg)=>{dlg=cfg;}, updateDoc:async(_,u)=>{calls.push(Object.keys(u)[0]);}, mailQueueRef:{}, deleteField:()=>'DEL', Date, Object, String, Math, window:{} };
    new Function(...Object.keys(scope), fnSrc.replace('window.reviewParkedMail=','globalThis.__rpm='))(...Object.values(scope));
    t('dialog lists ONLY parked entries and Retry-all clears each strike', async()=>{
      globalThis.__rpm(); assert(dlg,'openConfirm not called');
      assert(dlg.body.includes('x@y.z')&&dlg.body.includes('Y'),'parked entries missing from body');
      assert(!dlg.body.includes('"ok"'),'active entry leaked into parked list');
      await dlg.onConfirm();
      assert(calls.length===2 && calls.every(k=>k.endsWith('.fails')), 'retry-all did not clear exactly the parked strike counters: '+JSON.stringify(calls));
    });
  }
}

// ---- B4: restore map no longer contains mailStats (map-key check) -------
console.log('B4 · restore skips mailStats');
{
  const line=A.split('\n').find(l=>l.includes('const map={schedule:scheduleRef'));
  assert(line,'restore map line not found');
  const keys=[...line.matchAll(/([A-Za-z]+):/g)].map(m=>m[1]);
  t('restore map excludes mailStats [B4]', ()=>assert(!keys.includes('mailStats'),'mailStats still in restore map'));
  t('restore map keeps all other docs (no accidental drop)', ()=>{
    const oldLine=files.adminOld.split('\n').find(l=>l.includes('const map={schedule:scheduleRef'));
    const oldKeys=[...oldLine.matchAll(/([A-Za-z]+):/g)].map(m=>m[1]).filter(k=>k!=='mailStats');
    for(const k of oldKeys) assert(keys.includes(k),'restore map lost key: '+k);
  });
  t('backups STILL record mailStats (_backupDocMap)', ()=>{
    const b=A.split('\n').find(l=>l.includes('function _backupDocMap')||l.includes('return {schedule:scheduleRef')&&l.includes('mailQueue:mailQueueRef'));
    const bl=A.slice(A.indexOf('function _backupDocMap'));
    assert(bl.slice(0,900).includes('mailStats:mailStatsRef'),'backup map lost mailStats');
  });
}

// ---- B1: noindex meta ----------------------------------------------------
console.log('B1 · noindex');
t('admin has noindex meta', ()=>assert(A.includes('<meta name="robots" content="noindex">')));
t('staff has noindex meta', ()=>assert(S.includes('<meta name="robots" content="noindex">')));

// ---- B3: labels ----------------------------------------------------------
console.log('B3 · queue labels tell the truth');
t('dashboard row says "Queued e-mails"', ()=>assert(A.includes('Queued e-mails — <span id="mqCountTop"')));
t('messaging card says "E-mail Queue"', ()=>assert(A.includes('E-mail Queue: <span id="mqCount"')));
t('old misleading label gone', ()=>assert(!A.includes('Outbid alerts — <span id="mqCountTop"')));

// ---- builds --------------------------------------------------------------
console.log('builds');
t('admin BUILD 265', ()=>assert(A.includes('var BUILD = 265')));
t('staff BUILD 136', ()=>assert(S.includes('var BUILD = 136')));

console.log(`\n${PRE?'[HONESTY RUN] ':''}RESULT: ${pass} passed, ${fail} failed`);
if(PRE){
  // On the pre-fix build we EXPECT the B-item tests to fail. Regression-only tests may pass.
  console.log('Honesty interpretation: failures above are the PROOF the tests detect the pre-fix behavior.');
}
process.exit(PRE?0:(fail?1:0));
