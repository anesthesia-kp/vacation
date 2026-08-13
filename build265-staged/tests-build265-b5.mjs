// tests-build265-b5.mjs — item 5 (auction calendar config), builds admin 265 / staff 136
// Every logic test EXECUTES code extracted from the real files. Honesty: --pre runs the
// same assertions against pristine admin 264 / staff 135 (B5 tests must fail there).
// The killer test is NO-OP EQUIVALENCE: with no saved config, every derived structure
// must EXACTLY equal the literal the pre-fix build hardcoded.
import { readFileSync } from 'fs';
const PRE=process.argv.includes('--pre');
const A=readFileSync(PRE?'/tmp/admin.html':'/tmp/build265/admin_index.html','utf-8');
const S=readFileSync(PRE?'/tmp/staff.html':'/tmp/build265/index.html','utf-8');
const AOLD=readFileSync('/tmp/admin.html','utf-8');
const SOLD=readFileSync('/tmp/staff.html','utf-8');

let pass=0,fail=0;
const t=(n,f)=>{try{f();pass++;console.log('  ✅ '+n);}catch(e){fail++;console.log('  ❌ '+n+' — '+e.message);}};
const assert=(c,m)=>{if(!c)throw new Error(m||'assert');};
const eq=(a,b,m)=>{const x=JSON.stringify(a),y=JSON.stringify(b);if(x!==y)throw new Error((m||'not equal')+'\n    got:  '+x+'\n    want: '+y);};

function slice(src,startMark,endMark){
  const i=src.indexOf(startMark); assert(i>=0,'missing marker: '+startMark.slice(0,50));
  const j=src.indexOf(endMark,i); assert(j>i,'missing end marker: '+endMark.slice(0,50));
  return src.slice(i,j);
}
// getSundays + dateKey + wkDate exist on both builds — extract from whichever file we test
function extractHelpers(src){
  const end=src.includes('const AC_DEFAULTS=')?'const AC_DEFAULTS=':'const mondays=';
  const g=slice(src,'function getSundays',end);
  // dateKey/wkDate live later in the module; function-declaration hoisting covers the
  // real page. The sandbox shims these two one-line utilities (logic identical on both sites).
  return g+'\nfunction dateKey(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }\nfunction wkDate(wk){ return new Date(wk+"T00:00:00"); }\n';
}
// Build a sandbox that evaluates the AC core + helpers with a controllable environment
function makeSandbox(src,{cache=null, snapshotCfg='__none__'}={}){
  const helpers=extractHelpers(src);
  const core=slice(src,'const AC_DEFAULTS=','// ═════ end AUCTION CONFIG core');
  const log={reloads:0, lsSet:[], warns:0};
  const localStorageStub={_v:cache===null?null:JSON.stringify(cache),
    getItem(k){return this._v;}, setItem(k,v){log.lsSet.push(v); this._v=v;}};
  const sessionStore={};
  const sessionStorageStub={getItem:k=>sessionStore[k]??null,setItem:(k,v)=>{sessionStore[k]=v;}};
  const env={localStorage:localStorageStub,sessionStorage:sessionStorageStub,
    console:{warn:()=>{log.warns++;},log:()=>{}},
    toast:()=>{}, setTimeout:(fn)=>{log.reloads++;}, location:{reload:()=>{}}};
  const code=helpers+'\n'+core+`\n;return {AC,AC_SOURCE,AC_YEAR,
    AC_DEFAULTS,
    _acNormalize,_acCheckRemote,
    _acHDList:typeof _acHDList!=='undefined'?_acHDList:null,
    _acTagMap:typeof _acTagMap!=='undefined'?_acTagMap:null,
    _acNameMap:typeof _acNameMap!=='undefined'?_acNameMap:null,
    AC_SUMMER_START:typeof AC_SUMMER_START!=='undefined'?AC_SUMMER_START:null,
    AC_SUMMER_END:typeof AC_SUMMER_END!=='undefined'?AC_SUMMER_END:null,
    getSundays,dateKey};`;
  const out=new Function(...Object.keys(env),code)(...Object.values(env));
  return {...out,log};
}
// Extract the suggestion function (admin only) and execute it with helpers
function makeSuggest(src){
  const helpers=extractHelpers(src);
  const fn=slice(src,'function computeSuggestedHolidays','function _acWkOption');
  return new Function(helpers+'\n'+fn+'\n;return computeSuggestedHolidays;')();
}
const OLD_HD=["2027-02-14","2027-03-28","2027-04-04","2027-11-21","2027-12-19","2027-12-26"];
const OLD_TAGS={"2027-02-14":"⛷️ Ski","2027-03-28":"🌸 Spring","2027-04-04":"🌸 Spring","2027-11-21":"🦃 Thanks","2027-12-19":"🎄 Xmas","2027-12-26":"🎆 NYE"};
const OLD_NAMES={"2027-02-14":"Ski Week","2027-03-28":"Spring Break","2027-04-04":"Spring Break","2027-11-21":"Thanksgiving","2027-12-19":"Christmas","2027-12-26":"New Year's"};

console.log(PRE?'== HONESTY RUN (pre-fix 264/135: B5 tests below MUST FAIL) ==':'== B5 TEST RUN (admin 265 / staff 136) ==');

console.log('B5 · config core (executed, both sites)');
for(const [name,src] of [['admin',A],['staff',S]]){
  t(name+': core block present', ()=>assert(src.includes('const AC_DEFAULTS=')&&src.includes('_acCheckRemote')));
  if(!src.includes('const AC_DEFAULTS=')) continue;
  const sb=makeSandbox(src);
  t(name+': no cache → defaults, year 2027', ()=>{assert(sb.AC_SOURCE==='defaults');assert(sb.AC_YEAR===2027);});
  t(name+': NO-OP EQUIVALENCE — default HD set === old literal', ()=>{
    const hd=name==='admin'? sb._acHDList() : sb.AC.holidays.filter(h=>h.highDemand).map(h=>h.wk);
    eq(hd,OLD_HD);});
  t(name+': defaults reproduce old summer window', ()=>{
    eq(sb.AC.summerStartWk,'2027-05-30'); eq(sb.AC.summerEndWk,'2027-08-22');});
  t(name+': valid cached config is adopted', ()=>{
    const cfg={year:2029,summerStartWk:'2029-06-03',summerEndWk:'2029-08-26',holidays:[{wk:'2029-12-30',label:'X',highDemand:true}]};
    const sb2=makeSandbox(src,{cache:cfg});
    assert(sb2.AC_SOURCE==='cache'); assert(sb2.AC_YEAR===2029); eq(sb2.AC.holidays[0].short,'X');});
  t(name+': corrupt cache → defaults (no throw)', ()=>{
    const sb2=makeSandbox(src,{cache:{year:'lol',holidays:'nope'}});
    assert(sb2.AC_SOURCE==='defaults'&&sb2.AC_YEAR===2027);});
  t(name+': _acNormalize rejects bad year / bad week / empty label', ()=>{
    assert(sb._acNormalize({year:1999,summerStartWk:'2027-05-30',summerEndWk:'2027-08-22',holidays:[]})===null);
    assert(sb._acNormalize({year:2027,summerStartWk:'2027-05-30',summerEndWk:'2027-08-22',holidays:[{wk:'nope',label:'x'}]})===null);
    assert(sb._acNormalize({year:2027,summerStartWk:'2027-05-30',summerEndWk:'2027-08-22',holidays:[{wk:'2027-02-14',label:'  '}]})===null);});
  t(name+': remote change → cache write + ONE reload; matching remote → nothing', ()=>{
    const sb2=makeSandbox(src);
    sb2._acCheckRemote({auctionConfig:{year:2028,summerStartWk:'2028-05-28',summerEndWk:'2028-08-20',holidays:[{wk:'2028-12-31',label:'NY',highDemand:true}]}});
    assert(sb2.log.lsSet.length===1&&sb2.log.reloads===1,'expected 1 cache write + 1 reload, got '+JSON.stringify(sb2.log));
    // a DIFFERENT config afterwards is a new target → allowed to reload again
    sb2._acCheckRemote({auctionConfig:{year:2029,summerStartWk:'2029-06-03',summerEndWk:'2029-08-26',holidays:[{wk:'2029-12-30',label:'NY',highDemand:true}]}});
    assert(sb2.log.reloads===2,'a genuinely new config change must reload again: '+JSON.stringify(sb2.log));});
  t(name+': loop guard — same target twice without a real reload does NOT reload again', ()=>{
    const sb2=makeSandbox(src);
    const cfg={auctionConfig:{year:2028,summerStartWk:'2028-05-28',summerEndWk:'2028-08-20',holidays:[{wk:'2028-12-31',label:'NY',highDemand:true}]}};
    sb2._acCheckRemote(cfg); const r=sb2.log.reloads;
    // simulate the post-reload world where cache failed to stick: guard must stop the loop
    sb2._acCheckRemote(cfg);
    assert(sb2.log.reloads===r&&sb2.log.warns>=1,'loop guard failed: '+JSON.stringify(sb2.log));});
  t(name+': absent remote config with default build → no reload (deploy is a no-op)', ()=>{
    const sb2=makeSandbox(src);
    sb2._acCheckRemote({emailNotifsEnabled:true});
    assert(sb2.log.reloads===0&&sb2.log.lsSet.length===0,'no-op deploy reloaded: '+JSON.stringify(sb2.log));});
}

console.log('B5 · derived structures (admin, executed)');
{
  let sb=null; try{ sb=makeSandbox(A); }catch(_){ sb={AC:{holidays:[]},_acTagMap:null}; }
  if(sb._acTagMap){
    t('admin: default tag map === old specLabels literal', ()=>eq(sb._acTagMap(),OLD_TAGS));
    t('admin: default name map === old REPORT_SPECIAL literal', ()=>eq(sb._acNameMap(),OLD_NAMES));
    t('admin: summer Date objects match old constants', ()=>{
      eq(sb.AC_SUMMER_START.getTime(),new Date('2027-05-30T00:00:00').getTime());
      eq(sb.AC_SUMMER_END.getTime(),new Date('2027-08-22T00:00:00').getTime());});
  } else { t('admin: derived maps exist', ()=>assert(false,'no _acTagMap')); }
  t('admin: HIGH_DEMAND_WEEKS is derived (source pin)', ()=>assert(A.includes('const HIGH_DEMAND_WEEKS=new Set(_acHDList())')));
  t('admin: SPECIAL caps derived (source pin)', ()=>assert(A.includes('_acHDList().forEach(wk=>{ SPECIAL[wk]=5; })')));
  t('admin: simulator summer window derived (source pin)', ()=>assert(A.includes('const SIM_SUMMER_START=AC_SUMMER_START')));
  t('admin: welcome e-mail year dynamic', ()=>assert(A.includes('Welcome to the ${AC_YEAR} Anesthesia Vacation Auction!')));
  t('admin: no stray hardcoded 2027 date keys outside AC_DEFAULTS (code lines only)', ()=>{
    const stripped=A.replace(/const AC_DEFAULTS=[\s\S]*?\]\};/,'');
    const codeLines=stripped.split('\n').filter(l=>!l.trim().startsWith('//')&&!l.trim().startsWith('*'));
    const hits=codeLines.join('\n').match(/2027-\d\d-\d\d/g)||[];
    assert(hits.length===0,'stray literals: '+hits.slice(0,5).join(','));});
}

console.log('B5 · staff derived structures');
{
  let sb=null; try{ sb=makeSandbox(S); }catch(_){ sb={AC:{holidays:[]}}; }
  t('staff: SPECIAL_WEEKS built from config (source pin)', ()=>assert(S.includes('AC.holidays.forEach(h=>{')&&S.includes('SPECIAL_WEEKS[h.wk]=entry')));
  t('staff: NO-OP EQUIVALENCE — rebuilt SPECIAL_WEEKS === old literal (labels, colors, flags, slots)', ()=>{
    // execute the derivation with default AC and compare against the OLD literal parsed from 135
    const build=new Function('AC','AC_NEUTRAL_COLOR',`const SPECIAL_WEEKS={};
      AC.holidays.forEach(h=>{ const c=h.color||AC_NEUTRAL_COLOR;
        const entry={label:(h.emoji?h.emoji+' ':'')+h.label,color:c.fg,bg:c.bg,border:c.border};
        if(h.highDemand){ entry.slots=5; entry.highPriorityOnly=true; }
        SPECIAL_WEEKS[h.wk]=entry; });
      return SPECIAL_WEEKS;`);
    const rebuilt=build(sb.AC,{fg:"#00587c",bg:"rgba(125,211,252,.12)",border:"rgba(125,211,252,.25)"});
    const oldLit=new Function('return '+SOLD.slice(SOLD.indexOf('const SPECIAL_WEEKS={')+'const SPECIAL_WEEKS='.length, SOLD.indexOf('};',SOLD.indexOf('const SPECIAL_WEEKS={'))+1)+';')();
    // old literal: {label,slots,color,bg,border,highPriorityOnly}; rebuilt orders differ — compare per key/field
    const ok=Object.keys(oldLit);
    eq(Object.keys(rebuilt).sort(),ok.sort(),'week keys differ');
    for(const k of ok){ for(const f of ['label','slots','color','bg','border','highPriorityOnly']) eq(rebuilt[k][f],oldLit[k][f],`week ${k} field ${f}`); }});
  t('staff: summer window from config (source pin)', ()=>assert(S.includes("const summerStart=new Date(AC.summerStartWk+'T00:00:00')")));
  t('staff: welcome e-mail year dynamic', ()=>assert(S.includes('Welcome to the ${AC_YEAR} Anesthesia Vacation Auction!')));
  t('staff: snapshot calls _acCheckRemote', ()=>assert(S.includes('_acCheckRemote(adminSettings); _adminSettingsReady=true;')));
}

console.log('B5 · holiday suggestions (executed, pinned against independent math)');
{
  let sug=null;
  t('computeSuggestedHolidays exists (admin)', ()=>{try{sug=makeSuggest(A);}catch(_){sug=null;}assert(typeof sug==='function');});
  if(sug){
    const helpers=new Function(extractHelpers(A)+';return {getSundays,dateKey};')();
    const idx2wk=(y,i)=>helpers.dateKey(helpers.getSundays(y)[i-1]);
    const pins={ // independently computed with Python earlier this session
      2027:{MLK:'2027-01-17',Memorial:'2027-05-30','July 4':'2027-07-04',Labor:'2027-09-05',Thanks:'2027-11-21',Xmas:'2027-12-19',NYE:'2027-12-26'},
      2028:{MLK:'2028-01-16',Memorial:'2028-05-28','July 4':'2028-07-02',Labor:'2028-09-03',Thanks:'2028-11-19',Xmas:'2028-12-24',NYE:'2028-12-31'},
      2034:{MLK:'2034-01-15',Memorial:'2034-05-28','July 4':'2034-07-02',Labor:'2034-09-03',Thanks:'2034-11-19',Xmas:'2034-12-24',NYE:'2034-12-31'},
    };
    for(const y of [2027,2028,2034]){
      t(`suggestions pinned for ${y}`, ()=>{
        const got=sug(y);
        for(const h of got){ const want=pins[y][h.short]; assert(want,'unexpected suggestion '+h.short);
          eq(idx2wk(y,h.idx),want,`${y} ${h.short}`); }
        eq(got.filter(h=>h.hd).map(h=>h.short),['Thanks','Xmas','NYE'],'HD flags');
        eq(got.length,7);});
    }
    t('2027 HD suggestions coincide with current defaults (sanity)', ()=>{
      const got=sug(2027).filter(h=>h.hd).map(h=>idx2wk(2027,h.idx));
      eq(got,['2027-11-21','2027-12-19','2027-12-26']);});
  }
}

console.log('B5 · calendar math (executed)');
{
  const h=new Function(extractHelpers(A)+';return {getSundays,dateKey};')();
  t('getSundays: 2027=52 (Jan 3 → Dec 26)', ()=>{const s=h.getSundays(2027);eq(s.length,52);eq(h.dateKey(s[0]),'2027-01-03');eq(h.dateKey(s[51]),'2027-12-26');});
  t('getSundays: 2028=53 (Jan 2 → Dec 31)', ()=>{const s=h.getSundays(2028);eq(s.length,53);eq(h.dateKey(s[52]),'2028-12-31');});
  t('getSundays: 2034=53 (Jan 1 → Dec 31)', ()=>{const s=h.getSundays(2034);eq(s.length,53);eq(h.dateKey(s[0]),'2034-01-01');});
}

console.log('B5 · UI + lock wiring (source pins)');
t('Auction Calendar card in Controls', ()=>assert(A.includes('📅 Auction Calendar')&&A.includes('openAuctionCalendarEditor')));
t('editor refuses when phase1Started (open + save)', ()=>{
  const ed=A.slice(A.indexOf('window.openAuctionCalendarEditor'),A.indexOf('async function saveAuctionCalendar'));
  assert(ed.includes('phase1Started()'),'open not locked');
  const sv=A.slice(A.indexOf('async function saveAuctionCalendar'),A.indexOf('// ── end Auction Calendar editor'));
  assert(sv.includes('phase1Started()'),'save not locked');});
t('save refuses zero high-demand holidays', ()=>assert(A.includes('At least one high-demand holiday is required')));
t('save writes adminSettings.auctionConfig via merge', ()=>assert(A.includes('setDoc(adminRef,{auctionConfig:cfg},{merge:true})')));
t('dynamic week counts in dialogs (no user-visible hardcoded 52)', ()=>{
  assert(A.includes('Lock all ${mondays.length} weeks?'),'lock dialog');
  assert(!A.includes('Lock all 52 weeks?'),'old copy remains');});

console.log(`\n${PRE?'[HONESTY RUN] ':''}RESULT: ${pass} passed, ${fail} failed`);
process.exit(PRE?0:(fail?1:0));
