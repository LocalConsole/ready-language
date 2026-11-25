/* Ядро: утилиты, хранилище, IndexedDB, звуки, конфетти, SRS, план, достижения */
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const dayDiff=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5);
const addDays=(s,n)=>{const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36)};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---- IndexedDB key-value (кэш ИИ, тексты, записи) ---- */
const IDB={db:null,
 open(){return this.db||(this.db=new Promise((res,rej)=>{if(!window.indexedDB)return rej('no idb');const r=indexedDB.open('misha',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
 async get(k){try{const db=await this.open();return await new Promise(res=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>res(undefined)})}catch(e){try{return JSON.parse(localStorage.getItem('kv:'+k))}catch(_){return undefined}}},
 async set(k,v){try{const db=await this.open();return await new Promise(res=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res(true);tx.onerror=()=>res(false)})}catch(e){try{localStorage.setItem('kv:'+k,JSON.stringify(v))}catch(_){}}},
 async del(k){try{const db=await this.open();db.transaction('kv','readwrite').objectStore('kv').delete(k)}catch(e){localStorage.removeItem('kv:'+k)}},
 async keys(){try{const db=await this.open();return await new Promise(res=>{const q=db.transaction('kv').objectStore('kv').getAllKeys();q.onsuccess=()=>res(q.result)})}catch(e){return []}}};

/* ---- Состояние ---- */
const DEF=()=>({v:1,profile:null,xp:0,streak:{count:0,last:null,freezes:1},daily:{},lessons:{},cards:{},errors:[],customWords:[],texts:[],books:[],homework:[],
 exams:[],diag:null,mission:{},settings:{theme:'auto',lang:'ru',sound:true,big:false,dys:false,reduce:false,keys:{groq:'',gemini:'',openrouter:'',proxy:''},order:['groq','gemini','openrouter','proxy']},
 achievements:[],bookmarks:{},readPos:{},writing:[],speaking:[],spent:0,created:Date.now()});
let S;
function load(){try{S=Object.assign(DEF(),JSON.parse(localStorage.getItem('misha.state')||'{}'));S.settings=Object.assign(DEF().settings,S.settings||{});S.settings.keys=Object.assign(DEF().settings.keys,S.settings.keys||{})}catch(e){S=DEF()}return S}
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem('misha.state',JSON.stringify(S))}catch(e){console.warn('save fail',e)}},120)}
const Store={get s(){return S},load,save,flush(){clearTimeout(saveT);try{localStorage.setItem('misha.state',JSON.stringify(S))}catch(e){}},reset(){S=DEF();localStorage.removeItem('misha.state')},
 export(){return JSON.stringify({app:'misha',at:new Date().toISOString(),state:S})},
 import(txt){const o=JSON.parse(txt);if(!o||!o.state)throw new Error('bad file');S=Object.assign(DEF(),o.state);save()}};
load();

/* ---- Звук ---- */
let AC;
const Snd={play(kind){if(!S.settings.sound)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const seq={ok:[[660,.08],[880,.12]],bad:[[220,.14],[165,.18]],win:[[523,.1],[659,.1],[784,.1],[1047,.2]],tap:[[440,.04]],flip:[[330,.05]]}[kind]||[];let t=AC.currentTime;for(const [f,d] of seq){const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.12,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d+.02);t+=d}}catch(e){}}};

/* ---- Конфетти ---- */
function confetti(n){if(document.body.classList.contains('lite')||document.body.classList.contains('reduce')||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const c=document.getElementById('confetti');if(!c)return;c.width=innerWidth;c.height=innerHeight;const x=c.getContext('2d');const col=['#c0392b','#e0a526','#2a7f8e','#3c9d5d','#fff'];
 const P=Array.from({length:n||120},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*.4,vx:(Math.random()-.5)*4,vy:2+Math.random()*4,r:4+Math.random()*5,c:pick(col),a:Math.random()*6,va:(Math.random()-.5)*.3}));
 let f=0;(function tick(){x.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.a+=p.va;p.vy+=.04;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r,-p.r/2,p.r*2,p.r);x.restore()});if(++f<200)requestAnimationFrame(tick);else x.clearRect(0,0,c.width,c.height)})()}
function toast(msg,ms){const d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),ms||2600)}

/* ---- XP / уровень / серия / одежда ---- */
const level=()=>Math.floor(Math.sqrt(S.xp/60))+1;
const lvlProgress=()=>{const l=level(),a=60*(l-1)*(l-1),b=60*l*l;return (S.xp-a)/(b-a)};
function outfit(){const l=level();return {scarf:l>=3?(l>=6?2:1):0,hat:l>=5?(l>=8?2:1):0,samovar:l>=4||S.achievements.includes('streak7')}}
const ACH={first:['🎓','Первый урок'],streak3:['🔥','3 дня подряд'],streak7:['🫖','7 дней подряд (самовар!)'],words50:['📚','50 слов в SRS'],exam1:['📝','Первый пробный экзамен'],perfect:['💯','Тест без ошибок'],diag:['🧭','Диагностика пройдена'],writer:['✍️','Первое Writing'],speaker:['🎤','Первое Speaking'],lvl5:['🎩','Уровень 5 — новая шапка']};
function unlock(id){if(S.achievements.includes(id))return;S.achievements.push(id);save();toast('🏆 Достижение: '+ACH[id][1]);confetti(80);Snd.play('win')}
function checkAch(){const n=Object.keys(S.cards).length;if(n>=50)unlock('words50');if(S.streak.count>=3)unlock('streak3');if(S.streak.count>=7)unlock('streak7');if(level()>=5)unlock('lvl5')}
function touchDay(minutes){const d=today();const rec=S.daily[d]||(S.daily[d]={xp:0,min:0});rec.min+=minutes||0;
 if(S.streak.last!==d){const gap=S.streak.last?dayDiff(S.streak.last,d):1;
  if(gap===1)S.streak.count++;else if(gap>1){const miss=gap-1;if(S.streak.freezes>=miss){S.streak.freezes-=miss;S.streak.count++;toast('❄️ Заморозка серии спасла '+miss+' дн.')}else S.streak.count=1}else S.streak.count=1;
  S.streak.last=d;if(S.streak.count%7===0)S.streak.freezes=Math.min(3,S.streak.freezes+1)}
 save()}
function addXP(n,minutes){const before=level();S.xp+=n;const d=today();(S.daily[d]||(S.daily[d]={xp:0,min:0})).xp+=n;touchDay(minutes);if(level()>before){toast('⭐ Уровень '+level()+'! Миша получил обновку.');confetti(100);Snd.play('win')}checkAch();save();const el=document.getElementById('hdr-xp');if(el)el.textContent=S.xp}

/* ---- SRS (SM-2) ---- */
const SRS={
 card(id,kind){return S.cards[id]||(S.cards[id]={id,kind:kind||'word',ef:2.5,int:0,reps:0,due:today(),lapses:0,seen:0,ok:0})},
 add(id,kind){const had=!!S.cards[id];this.card(id,kind);save();return !had},
 grade(id,q,kind){const c=this.card(id,kind);c.seen++;if(q>=3){c.ok++;c.reps++;c.int=c.reps===1?1:c.reps===2?3:Math.round(c.int*c.ef)}else{c.reps=0;c.int=0;c.lapses++}
  c.ef=Math.max(1.3,c.ef+(0.1-(5-q)*(0.08+(5-q)*0.02)));c.due=addDays(today(),Math.max(c.int,q>=3?1:0));save();return c},
 due(kind){const t=today();return Object.values(S.cards).filter(c=>c.due<=t&&(!kind||c.kind===kind))},
 mastery(id){const c=S.cards[id];if(!c)return 0;return c.reps>=4?2:c.reps>=1?1:0}};

/* ---- План / цели ---- */
const Plan={
 est(){const d=S.diag,ex=S.exams;let band=null,sat=null;
  const li=ex.filter(e=>e.type==='ielts').slice(-1)[0],ls=ex.filter(e=>e.type==='sat').slice(-1)[0];
  band=li?li.band:d&&d.band!=null?d.band:null;sat=ls?ls.sat:d&&d.sat!=null?d.sat:null;return {band,sat}},
 hoursNeeded(){const p=S.profile;if(!p)return 0;const e=this.est();let h=0;
  if(p.goal.ielts){const cur=e.band==null?3.5:e.band;h+=Math.max(0,p.goal.ielts-cur)*70}
  if(p.goal.sat){const cur=e.sat==null?900:e.sat;h+=Math.max(0,p.goal.sat-cur)/100*35}
  return Math.max(h,6)},
 studiedHours(){return (Object.values(S.daily).reduce((a,d)=>a+(d.min||0),0))/60},
 daysLeft(){const p=S.profile;if(!p)return 0;const ds=[p.dates&&p.dates.ielts,p.dates&&p.dates.sat].filter(Boolean).sort();return ds.length?Math.max(1,dayDiff(today(),ds[0])):90},
 minutesPerDay(){const left=Math.max(this.hoursNeeded()-this.studiedHours()*0.8,2)*60;return Math.min(120,Math.max(15,Math.ceil(left/this.daysLeft())))},
 todayMin(){return (S.daily[today()]||{}).min||0}};
/* ---- Уровень по результату диагностики ---- */
const Level={cefr(a){return a<.2?'A1':a<.38?'A2':a<.55?'B1':a<.72?'B2':a<.87?'C1':'C2'},
 band(a){return Math.round((2.5+6.5*a)*2)/2},sat(a){return Math.round((400+1200*a)/10)*10}};

window.App=Object.assign(window.App||{},{$,$$,esc,today,dayDiff,addDays,shuffle,pick,hash,uid,IDB,Store,Snd,confetti,toast,level,lvlProgress,outfit,ACH,unlock,addXP,touchDay,SRS,Plan,Level,checkAch});
})();
