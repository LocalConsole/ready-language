/* Экраны 1: главная, старт, диагностика, путь, урок, словарь, книги, читалка */
(function(){
const {$,$$,esc,today,shuffle,pick,uid,Store,Snd,confetti,toast,SRS,Plan,Level,addXP,addDays,dayDiff,IDB}=App;
const S=()=>Store.s,V=App.views,D=App.D;
const ring=(pct,label,color)=>{const r=36,c=2*Math.PI*r;return `<div class="ring"><svg width="84" height="84"><circle class="bg" cx="42" cy="42" r="${r}"/><circle class="fg" cx="42" cy="42" r="${r}" style="${color?'stroke:'+color+';':''}stroke-dasharray:${c};stroke-dashoffset:${c*(1-Math.min(1,pct))}"/></svg><b>${label}</b></div>`};
App.ring=ring;
const goals=()=>{const g=(S().profile||{}).goal||{};return {ielts:!!g.ielts,sat:!!g.sat}};
const modsFor=()=>{const g=goals();return D.lessons.modules.filter(m=>m.exam==='both'||(m.exam==='ielts'&&g.ielts)||(m.exam==='sat'&&g.sat))};
const lessonsFor=()=>{const mm=modsFor().map(m=>m.id);return D.lessons.lessons.filter(l=>mm.includes(l.module))};
const SKILL_MOD={vocab:'vocab',grammar:'grammar',reading:'reading',listening:'listening',rw:'sat_rw',math:'sat_math'};
App.nextLesson=function(){const all=lessonsFor(),done=S().lessons;const todo=all.filter(l=>!done[l.id]);if(!todo.length)return null;
 const d=S().diag;if(d&&d.weak){for(const sk of d.weak){const m=SKILL_MOD[sk];const l=todo.find(x=>x.module===m);if(l)return l}}return todo[0]};
App.missionDone=k=>{const m=S().mission[today()]||(S().mission[today()]={});m[k]=true;Store.save()};

/* ---------- Главная ---------- */
V.home=function(root){const s=S(),p=s.profile,d=today(),rec=s.daily[d]||{xp:0,min:0},m=s.mission[d]||{};
 const plan=Plan.minutesPerDay(),dl=Plan.daysLeft(),est=Plan.est(),due=SRS.due('word').length,nl=App.nextLesson(),errs=s.errors.length;
 const lost=s.streak.last&&dayDiff(s.streak.last,d)>1;const doneAll=m.words&&m.lesson&&m.errors;
 const st=doneAll?'celebrate':lost?'sad':rec.min>0?'cheer':'hello';
 const tasks=[
  {k:'words',ic:'📚',t:due?`Повтори слова: ${due} к повторению`:'Выучи 5 новых слов',sub:'≈ 5 мин',h:due?'#/vocab/review':'#/vocab/new'},
  {k:'lesson',ic:nl?nl.icon:'🏁',t:nl?'Урок: '+nl.title:'Все уроки пройдены!',sub:nl?'≈ '+nl.min+' мин':'Запусти пробный экзамен',h:nl?'#/lesson/'+nl.id:'#/exam'},
  {k:'errors',ic:'📓',t:errs?'Разбери ошибки (3 из журнала)':'Быстрый тест на 5 вопросов',sub:'≈ 5 мин',h:errs?'#/journal/train':'#/quick'}];
 root.innerHTML=`<div class="card">${App.mood(st,doneAll?'Миссия дня выполнена! Самовар на стол.':lost?'Серия прервалась… но мы начнём новую. Я никуда не ушёл.':'Давай начнём с миссии дня — всего 15–20 минут.')}</div>
 <div class="grid g3"><div class="card row" style="margin:0">${ring(Math.min(1,rec.min/plan),rec.min+'′')}<div><b>Сегодня</b><div class="small mute">цель ${plan} мин</div></div></div>
 <div class="card row" style="margin:0">${ring(App.lvlProgress(),App.level(),'var(--gold)')}<div><b>Уровень</b><div class="small mute">${s.xp} XP</div></div></div>
 <div class="card row" style="margin:0">${ring(Math.min(1,s.streak.count/7),'🔥'+s.streak.count,'var(--teal)')}<div><b>${t('streak')}</b><div class="small mute">❄️ заморозок: ${s.streak.freezes}</div></div></div></div>
 <div class="card" style="margin-top:1rem"><h2>${t('mission')}</h2>${tasks.map(x=>`<a class="node" style="width:100%;margin:.4rem 0;${m[x.k]?'border-color:var(--ok)':''}" href="${x.h}"><span class="ic">${m[x.k]?'✅':x.ic}</span><span><b>${esc(x.t)}</b><br><span class="small mute">${x.sub}</span></span></a>`).join('')}</div>
 <div class="grid g2"><div class="card"><h3>🎯 ${t('goal')}</h3>${p.goal.ielts?`<p>IELTS <b>${p.goal.ielts}</b> ${est.band!=null?`· сейчас ≈ <b>${est.band}</b>`:''}<br><span class="small mute">экзамен: ${p.dates.ielts||'—'}</span></p>`:''}${p.goal.sat?`<p>SAT <b>${p.goal.sat}</b> ${est.sat!=null?`· сейчас ≈ <b>${est.sat}</b>`:''}<br><span class="small mute">экзамен: ${p.dates.sat||'—'}</span></p>`:''}
 <p><b>${dl}</b> ${t('daysLeft')} · нужно ≈ <b>${plan}</b> ${t('minPerDay')}</p><a class="btn alt sm" href="#/dash">Прогноз и график</a></div>
 <div class="card"><h3>Быстрый доступ</h3><div class="row"><a class="btn alt sm" href="#/vocab">📚 Слова</a><a class="btn alt sm" href="#/reader">📖 Читалка</a><a class="btn alt sm" href="#/writing">✍️ Writing</a><a class="btn alt sm" href="#/speaking">🎤 Speaking</a><a class="btn alt sm" href="#/shadow">🎧 Диктант</a><a class="btn alt sm" href="#/journal">📓 Ошибки</a></div>
 ${!s.diag?'<p style="margin-top:.8rem"><a class="btn" href="#/diag">🧭 Пройти диагностику</a></p>':''}</div></div>`};

/* ---------- Старт / онбординг ---------- */
V.start=function(root){const st={ielts:true,sat:false,band:7,sat_s:1400,di:addDays(today(),90),ds:addDays(today(),120)};let step=0;
 const draw=()=>{
  if(step===0)root.innerHTML=`<div class="card">${App.mood('hello','Привет! Я Миша — бывший двоечник, ныне преподаватель. Выбери, к чему готовимся.')}<h2>Цель</h2><div class="grid g3">
   <button class="card opt" id="gi" style="margin:0;${st.ielts?'border-color:var(--teal)':''}"><h3>🇬🇧 IELTS</h3><span class="small mute">Academic / General</span></button>
   <button class="card opt" id="gs" style="margin:0;${st.sat?'border-color:var(--teal)':''}"><h3>🇺🇸 Digital SAT</h3><span class="small mute">Reading &amp; Writing + Math</span></button></div>
   <div class="row" style="margin-top:1rem"><select id="lg" style="width:auto"><option value="ru">Русский</option><option value="en" ${S().settings.lang==='en'?'selected':''}>English</option></select><span class="sp"></span><button class="btn" id="nx">${t('next')}</button></div></div>`,
   $('#gi').onclick=()=>{st.ielts=!st.ielts;draw()},$('#gs').onclick=()=>{st.sat=!st.sat;draw()},$('#lg').onchange=e=>{S().settings.lang=e.target.value;Store.save();App.applySettings();App.buildNav();draw()},
   $('#nx').onclick=()=>{if(!st.ielts&&!st.sat)return toast('Выбери хотя бы один экзамен');step=1;draw()};
  else if(step===1)root.innerHTML=`<div class="card">${App.mood('board','Поставим цель и дату — по ним посчитаю нагрузку.')}
   ${st.ielts?`<label>IELTS target band: <b id="bv">${st.band}</b></label><input type="range" id="b" min="5" max="9" step="0.5" value="${st.band}" style="width:100%"><label>Дата IELTS</label><input type="date" id="di" value="${st.di}" min="${today()}">`:''}
   ${st.sat?`<label>SAT цель: <b id="sv">${st.sat_s}</b></label><input type="range" id="s" min="1000" max="1600" step="10" value="${st.sat_s}" style="width:100%"><label>Дата SAT</label><input type="date" id="ds" value="${st.ds}" min="${today()}">`:''}
   <div class="row" style="margin-top:1rem"><button class="btn alt" id="bk">${t('back')}</button><span class="sp"></span><button class="btn" id="nx">${t('next')}</button></div></div>`,
   (()=>{const b=$('#b');if(b)b.oninput=()=>{st.band=+b.value;$('#bv').textContent=st.band};const s=$('#s');if(s)s.oninput=()=>{st.sat_s=+s.value;$('#sv').textContent=st.sat_s};
    $('#bk').onclick=()=>{step=0;draw()};$('#nx').onclick=()=>{if($('#di'))st.di=$('#di').value;if($('#ds'))st.ds=$('#ds').value;step=2;draw()}})();
  else root.innerHTML=`<div class="card">${App.mood('think','С чего начнём? Диагностика займёт ~15 минут и покажет сильные и слабые места.')}<div class="grid g2">
   <button class="card opt" id="dz" style="margin:0"><h3>🧭 ${t('diag')}</h3><span class="small mute">адаптивный тест → уровень и персональный план</span></button>
   <button class="card opt" id="zr" style="margin:0"><h3>🌱 ${t('zero')}</h3><span class="small mute">идём по карте с первого урока</span></button></div></div>`,
   (()=>{const fin=(go)=>{S().profile={goal:{ielts:st.ielts?st.band:0,sat:st.sat?st.sat_s:0},dates:{ielts:st.ielts?st.di:null,sat:st.sat?st.ds:null},created:today()};Store.save();App.go(go)};$('#dz').onclick=()=>fin('#/diag');$('#zr').onclick=()=>fin('#/home')})()};
 draw()};

/* ---------- Диагностика (адаптивная) ---------- */
V.diag=async function(root){const g=goals();const stages=[
  {id:'vocab',title:'Vocabulary',n:6,ad:'vocab'},{id:'grammar',title:'Grammar',n:6,ad:'grammar'},
  ...(g.ielts?[{id:'reading',title:'Reading',fixed:['r1','r2','r3','r4','r5']},{id:'listening',title:'Listening',fixed:['l1q1','l1q2','l1q3','l1q4'],once:true}]:[]),
  ...(g.sat?[{id:'rw',title:'SAT Reading & Writing',n:5,ad:'rw'},{id:'math',title:'SAT Math',n:5,ad:'math'}]:[])];
 root.innerHTML=`<div class="card">${App.mood('board',`Диагностика: ${stages.map(s=>s.title).join(' → ')}. Вопросы подстраиваются под тебя. Не гадай — «не знаю» тоже ответ (кнопка «Пропустить»).`)}<p class="center"><button class="btn" id="go">${t('start')}</button></p></div>`;
 await new Promise(r=>$('#go').onclick=r);const tok=App.token;const all=[],per={};
 for(const st of stages){if(tok!==App.token)return;let q;const used=new Set();let L=2;
  const pool=st.ad==='vocab'?null:D.questions.questions.filter(x=>x.skill===st.ad);
  const wordPool=App.allWords().filter(w=>!w.custom);
  const nextAd=(res,i)=>{if(i>0){const last=res[res.length-1];L=Math.max(1,Math.min(3,L+(last.ok?1:-1)))}
    if(st.ad==='vocab'){const c=shuffle(wordPool.filter(w=>!used.has(w.id)&&w.lvl===L));const w=(c[0]||shuffle(wordPool.filter(w=>!used.has(w.id)))[0]);used.add(w.id);return App.makeVQ(w,L===1?'tr':L===2?'def':'spell',wordPool)}
    const c=pool.filter(x=>!used.has(x.id)).sort((a,b)=>Math.abs(a.lvl-L)-Math.abs(b.lvl-L)||Math.random()-.5)[0];if(!c)return null;used.add(c.id);return c};
  const o={root,title:'Диагностика · '+st.title,feedback:false,once:st.once};
  if(st.fixed){o.questions=st.fixed.map(id=>D.q[id])}else{o.next=nextAd;o.total=st.n}
  const r=await App.Quiz.run(o);all.push(...r.results);per[st.id]=r.results}
 const sk={};for(const [k,res] of Object.entries(per)){let w=0,ok=0;res.forEach(r=>{const x=[1,1.5,2][(r.q.lvl||2)-1];w+=x;if(r.ok)ok+=x});sk[k]=w?ok/w:0}
 const ie=['vocab','grammar','reading','listening'].filter(k=>sk[k]!=null),sa=['rw','math'].filter(k=>sk[k]!=null);
 const mean=a=>a.length?a.reduce((x,k)=>x+sk[k],0)/a.length:null;const ia=mean(ie),sa_=mean(sa),acc=ia!=null?ia:sa_;
 const weak=Object.keys(sk).sort((a,b)=>sk[a]-sk[b]);
 S().diag={date:today(),skills:sk,cefr:Level.cefr(acc),band:ia!=null?Level.band(ia):null,sat:sa_!=null?Level.sat(sa_):null,weak};
 App.unlock('diag');const fs=App.finishSession(all,{title:'Диагностика'});addXP(40,15);Store.save();
 const bars=Object.entries(sk).map(([k,v])=>`<div style="margin:.5rem 0"><div class="row"><b style="width:90px">${k}</b><div class="bar sp"><i style="width:${Math.round(v*100)}%"></i></div><span>${Math.round(v*100)}%</span></div></div>`).join('');
 root.innerHTML=`<div class="card">${App.mood(acc>.6?'happy':'cheer',`Готово! Твой уровень ≈ <b>${S().diag.cefr}</b>${S().diag.band!=null?`, IELTS ≈ <b>${S().diag.band}</b>`:''}${S().diag.sat!=null?`, SAT ≈ <b>${S().diag.sat}</b>`:''}.`)}
 <h3>Карта сильных и слабых сторон</h3>${bars}<p><b>Слабее всего:</b> ${weak.slice(0,2).join(', ')}. Начнём с них — план уже перестроен.</p>
 <p>Нужно ≈ <b>${Plan.minutesPerDay()}</b> мин в день (${Plan.daysLeft()} дней до экзамена).</p>
 <div class="row">${fs.errs.length?`<a class="btn alt" href="#/review">Разбор ошибок (${fs.errs.length})</a>`:''}<a class="btn" href="#/path">К карте пути</a></div></div>`;confetti(70)};

/* ---------- Карта пути ---------- */
V.path=function(root){const done=S().lessons,nl=App.nextLesson();
 root.innerHTML=`<h1>🗺️ Карта пути</h1>${nl?`<div class="card">${App.mood('board','Следующая остановка: <b>'+esc(nl.title)+'</b>.')}</div>`:''}<div class="map">${modsFor().map(m=>{const ls=D.lessons.lessons.filter(l=>l.module===m.id),n=ls.filter(l=>done[l.id]).length;
  return `<div class="mod"><h3>${m.icon} ${esc(m.title)} <span class="chip">${n}/${ls.length}</span></h3><div class="bar" style="margin-bottom:.6rem"><i style="width:${ls.length?n/ls.length*100:0}%"></i></div><div class="road">${ls.map(l=>`<a class="node ${done[l.id]?'done':nl&&nl.id===l.id?'next':''}" href="#/lesson/${l.id}"><span class="ic">${done[l.id]?'✅':l.icon}</span><span><b>${esc(l.title)}</b><br><span class="small mute">${l.min} мин ${done[l.id]?'· '+done[l.id].score+'%':''}</span></span></a>`).join('')}</div></div>`}).join('')}</div>`};

/* ---------- Урок ---------- */
V.lesson=async function(root,id){const L=D.lessonById[id];if(!L)return App.go('#/path');
 const steps=['explain','example'];let pool=[];
 if(L.topic==='words')steps.push('vocab');else if(L.task&&(L.task.type==='writing'||L.task.type==='speaking'))steps.push('task');else{pool=D.questions.questions.filter(q=>q.topic===L.topic);steps.push('practice');if(pool.length>=4)steps.push('test')}
 steps.push('hw');let i=0;const all=[];const bar=()=>`<div class="bar" style="margin:.6rem 0 1rem"><i style="width:${Math.round(i/steps.length*100)}%"></i></div>`;
 const hdr=`<div class="row"><a class="btn alt sm" href="#/path">← Путь</a><h2 class="sp" style="margin:0">${L.icon} ${esc(L.title)}</h2></div>`;
 const loop=async()=>{while(i<steps.length){const st=steps[i];
  if(st==='explain'){root.innerHTML=`${hdr}${bar()}<div class="card">${App.say('board',`<ul class="stagger" style="margin:0;padding-left:1.1rem">${L.explain.map(x=>`<li>${x}</li>`).join('')}</ul>`)}${L.tip?`<div class="expl">💡 ${esc(L.tip)}</div>`:''}<p class="center"><button class="btn" id="n">${t('next')}</button></p></div>`;await new Promise(r=>$('#n').onclick=r)}
  else if(st==='example'){root.innerHTML=`${hdr}${bar()}<div class="card">${App.say('explain','<b>Пример</b><br>'+L.example)}<p class="center"><button class="btn" id="n">К практике</button></p></div>`;await new Promise(r=>$('#n').onclick=r)}
  else if(st==='vocab'){const ws=shuffle(App.allWords().filter(w=>!S().cards[w.id]&&!w.custom)).slice(0,5);ws.forEach(w=>SRS.add(w.id,'word'));const qs=ws.flatMap(w=>[App.makeVQ(w,'tr'),App.makeVQ(w,w.def?'def':'tr')]);
   await showWords(root,ws);const r=await App.Quiz.run({root,questions:qs,feedback:true,title:L.title});all.push(...r.results);App.missionDone('words')}
  else if(st==='practice'||st==='test'){const half=pool.length>=4?Math.ceil(pool.length/2):pool.length;const qs=st==='practice'?pool.slice(0,half):pool.slice(half);
   const r=await App.Quiz.run({root,questions:qs,feedback:st==='practice',title:st==='practice'?'Практика':'Мини-тест',header:hdr});all.push(...r.results)}
  else if(st==='task'){root.innerHTML=`${hdr}${bar()}<div class="card">${App.mood('cheer','Практика прямо на сайте — это и есть домашка.')}<p class="center"><a class="btn" href="${L.task.type==='writing'?'#/write/'+L.task.id:'#/speaking'}">Открыть задание</a> <button class="btn alt" id="n">Я сделаю позже →</button></p></div>`;await new Promise(r=>$('#n').onclick=r)}
  else if(st==='hw'){break}
  i++}
  const fs=App.finishSession(all,{title:'Урок: '+L.title});const score=all.length?Math.round(fs.ok/all.length*100):100;
  const first=!Object.keys(S().lessons).length;S().lessons[L.id]={score:Math.max(score,(S().lessons[L.id]||{}).score||0),date:today()};if(first)App.unlock('first');
  addXP(20+fs.ok*5,L.min);App.missionDone('lesson');Store.save();confetti(score>=60?120:30);Snd.play(score>=60?'win':'bad');
  const hw=L.task?'Выполни задание в разделе «'+(L.task.type==='writing'?'Writing':'Speaking')+'».':L.topic==='words'?'Повтори 5 новых слов завтра — они уже в SRS.':'Завтра повтори ошибки из журнала — они уже там.';
  root.innerHTML=`${hdr}<div class="card">${App.mood(score>=60?'celebrate':'cheer',`Урок пройден! Результат: <b>${score}%</b> (+${20+fs.ok*5} XP).`)}<div class="expl">📝 <b>Домашка:</b> ${hw}</div>
  <div class="row" style="margin-top:1rem">${fs.errs.length?`<a class="btn alt" href="#/review">Разбор ошибок (${fs.errs.length})</a>`:''}<a class="btn" href="#/path">Дальше по карте</a></div></div>`};
 loop()};

/* ---------- Мнемоника / морфология ---------- */
const PRE={un:'не',re:'снова',inter:'между',sub:'под',pre:'до',dis:'не/разъединять',mis:'ошибочно',over:'сверх',under:'под',in:'не/в',im:'не/в',ex:'из',de:'вниз/от',con:'вместе',pro:'вперёд',trans:'через'};
const SUF={tion:'сущ. (действие)',sion:'сущ. (действие)',ment:'сущ. (результат)',ness:'сущ. (качество)',able:'можно сделать',ible:'можно сделать',ive:'прил. (склонный)',ize:'гл. (делать)',ise:'гл. (делать)',ate:'гл.',ify:'гл. (делать)',ous:'прил. (полный)',ity:'сущ. (качество)',al:'прил.',ful:'полный',less:'без'};
App.morph=function(w){const lw=w.toLowerCase(),p=Object.keys(PRE).sort((a,b)=>b.length-a.length).find(x=>lw.startsWith(x)&&lw.length>x.length+3),s=Object.keys(SUF).sort((a,b)=>b.length-a.length).find(x=>lw.endsWith(x)&&lw.length>x.length+3);
 if(!p&&!s)return '';return '🧩 '+(p?`<b>${p}-</b> (${PRE[p]})`:'')+(p&&s?' + корень + ':p?' + корень':'')+(s?`<b>-${s}</b> (${SUF[s]})`:'')};
App.mnemonic=async function(w){const r=await AI.ask({prompt:`Придумай короткую русскую мнемонику (созвучие + образ) чтобы запомнить английское слово "${w.w}" = "${w.tr}". Одно-два предложения.`}).catch(()=>null);
 return r?r.text:`Образ: представь «${w.tr}» и проговори «${w.w}» вслух три раза — звук + картинка лучше запоминаются вместе.`};
async function showWords(root,ws){let k=0;return new Promise(res=>{const draw=()=>{const w=ws[k];root.innerHTML=`<div class="card"><div class="row"><b>Новые слова ${k+1}/${ws.length}</b><span class="sp"></span><button class="btn alt sm" id="sp">🔊</button></div><h2 class="center" style="margin:1rem 0 .2rem">${esc(w.w)} <span class="small mute">${w.pos||''}</span></h2><p class="center"><b>${esc(w.tr)}</b><br>${esc(w.def||'')}<br><i class="mute">${esc(w.ex||'')}</i></p><p class="small center">${App.morph(w.w)}</p><p class="center"><button class="btn alt sm" id="mn">💡 Мнемоника</button></p><div id="mnx" class="small center"></div><p class="center"><button class="btn" id="n">${k<ws.length-1?t('next'):'К проверке'}</button></p></div>`;
  $('#sp').onclick=()=>App.speak(w.w,{rate:.8});$('#mn').onclick=async()=>{$('#mnx').innerHTML='<div class="skel"></div>';$('#mnx').textContent=await App.mnemonic(w)};$('#n').onclick=()=>{if(++k<ws.length)draw();else res()}};draw()})}

/* ---------- Словарь / SRS ---------- */
V.vocab=async function(root,sub,arg){const s=S(),words=App.allWords();
 if(!sub){const due=SRS.due('word').length,inS=Object.values(s.cards).filter(c=>c.kind==='word').length,mast=Object.values(s.cards).filter(c=>c.kind==='word'&&c.reps>=4).length;
  root.innerHTML=`<h1>📚 ${t('words')}</h1><div class="card">${App.mood('hello',due?`К повторению ${due} слов. Давай по чуть-чуть.`:'На сегодня повторений нет — можно взять новые слова.')}
  <div class="row"><span class="chip">Всего: ${words.length}</span><span class="chip">В SRS: ${inS}</span><span class="chip">Выучено: ${mast}</span><span class="chip">К повторению: ${due}</span></div></div>
  <div class="grid g3"><a class="card node" style="width:auto;margin:0" href="#/vocab/review"><span class="ic">🃏</span><b>Повторить (SRS)</b></a><a class="card node" style="width:auto;margin:0" href="#/vocab/new"><span class="ic">🌱</span><b>5 новых слов</b></a>
  <a class="card node" style="width:auto;margin:0" href="#/vocab/mode/choice"><span class="ic">✅</span><b>Выбор ответа</b></a><a class="card node" style="width:auto;margin:0" href="#/vocab/mode/type"><span class="ic">⌨️</span><b>Ввод по определению</b></a>
  <a class="card node" style="width:auto;margin:0" href="#/vocab/mode/dict"><span class="ic">🔊</span><b>Аудио-диктовка</b></a><a class="card node" style="width:auto;margin:0" href="#/vocab/mode/spell"><span class="ic">🔍</span><b>Найди ошибку в написании</b></a>
  <a class="card node" style="width:auto;margin:0" href="#/vocab/list"><span class="ic">📖</span><b>Список и темы</b></a><a class="card node" style="width:auto;margin:0" href="#/books"><span class="ic">📕</span><b>Книги и домашки</b></a></div>`;return}
 if(sub==='review'||sub==='new'){let ws;if(sub==='review'){const ids=SRS.due('word').slice(0,15).map(c=>c.id);ws=ids.map(id=>D.widx&&App.allWords().find(w=>w.id===id)).filter(Boolean)}
  else{const lv=App.level()<3?[1,2]:App.level()<6?[2,3]:[3];ws=shuffle(words.filter(w=>!s.cards[w.id]&&(lv.includes(w.lvl)||Math.random()<.2))).slice(0,5)}
  if(!ws.length){root.innerHTML=`<div class="card">${App.mood('celebrate','Всё повторено! Возвращайся завтра.')}<a class="btn" href="#/vocab">Назад</a></div>`;App.missionDone('words');return}
  if(sub==='new'){await showWords(root,ws);ws.forEach(w=>SRS.add(w.id,'word'))}
  let k=0,okc=0;const draw=()=>{if(k>=ws.length){addXP(5+ws.length*2,5);App.missionDone('words');confetti(50);root.innerHTML=`<div class="card">${App.mood('celebrate',`Серия пройдена: ${okc}/${ws.length} уверенно.`)}<a class="btn" href="#/vocab">Дальше</a></div>`;return}
   const w=ws[k];root.innerHTML=`<div class="row"><b>${k+1}/${ws.length}</b><div class="bar sp"><i style="width:${k/ws.length*100}%"></i></div></div><div class="fc" id="fc" tabindex="0" role="button" aria-label="Перевернуть"><div><div class="f"><b>${esc(w.w)}</b><span class="mute">${w.pos||''}</span><button class="btn alt sm" id="sp" style="margin-top:.6rem">🔊</button></div><div class="b"><b>${esc(w.tr)}</b><span>${esc(w.def||'')}</span><i class="small mute">${esc(w.ex||'')}</i><span class="small">${App.morph(w.w)}</span></div></div></div>
   <div id="gr" class="row" style="justify-content:center;margin-top:1rem" hidden><button class="btn alt" data-q="1">Снова</button><button class="btn alt" data-q="3">Трудно</button><button class="btn" data-q="4">Хорошо</button><button class="btn ok" data-q="5">Легко</button></div><p class="small mute center">Пробел — перевернуть · 1–4 — оценка</p>`;
   const fc=$('#fc'),flip=()=>{fc.classList.add('flip');Snd.play('flip');$('#gr').hidden=false};fc.onclick=e=>{if(e.target.id==='sp')return;flip()};$('#sp').onclick=e=>{e.stopPropagation();App.speak(w.w,{rate:.8})};
   const grade=q=>{SRS.grade(w.id,q,'word');if(q>=4)okc++;k++;draw()};$$('#gr button').forEach(b=>b.onclick=()=>grade(+b.dataset.q));
   root.onkeydown=e=>{if(e.key===' '){e.preventDefault();flip()}if(['1','2','3','4'].includes(e.key)&&!$('#gr').hidden)grade([1,3,4,5][+e.key-1])};fc.focus()};draw();return}
 if(sub==='mode'){const m=arg,pool=shuffle(words.filter(w=>!w.custom||w.def)).slice(0,8);const mm=m==='choice'?(w=>pick(['tr','def','cloze'])):(()=>m);
  const qs=pool.map(w=>App.makeVQ(w,mm(w)));pool.forEach(w=>SRS.add(w.id,'word'));const r=await App.Quiz.run({root,questions:qs,feedback:true,title:'Слова'});const fs=App.finishSession(r.results,{title:'Слова'});addXP(5+fs.ok*3,6);App.missionDone('words');
  root.innerHTML=`<div class="card">${App.mood(fs.ok>=6?'celebrate':'cheer',`Результат: ${fs.ok}/${fs.total}`)}<div class="row">${fs.errs.length?'<a class="btn alt" href="#/review">Разбор ошибок</a>':''}<a class="btn" href="#/vocab">Назад</a></div></div>`;return}
 if(sub==='list'){let topic='all',q='';const draw=()=>{const tp=[...new Set(words.map(w=>w.topic))];const L=words.filter(w=>(topic==='all'||w.topic===topic)&&(!q||(w.w+w.tr).toLowerCase().includes(q)));
  root.innerHTML=`<div class="row"><a class="btn alt sm" href="#/vocab">←</a><h2 class="sp" style="margin:0">Список слов (${L.length})</h2></div><div class="row" style="margin:.6rem 0"><input type="text" id="q" placeholder="Поиск…" value="${esc(q)}" style="max-width:240px"><select id="tp" style="width:auto"><option value="all">Все темы</option>${tp.map(x=>`<option ${x===topic?'selected':''}>${x}</option>`).join('')}</select></div>
  <table class="tbl">${L.slice(0,150).map(w=>{const m=SRS.mastery(w.id);return `<tr><td><b>${esc(w.w)}</b> <span class="small mute">${w.pos||''}</span><div class="small">${App.morph(w.w)}</div></td><td>${esc(w.tr)}</td><td>${['⚪','🟡','🟢'][m]}</td><td><button class="btn alt sm" data-a="${w.id}">+</button></td></tr>`}).join('')}</table>`;
  $('#q').oninput=e=>{q=e.target.value.toLowerCase();draw();$('#q').focus();$('#q').setSelectionRange(q.length,q.length)};$('#tp').onchange=e=>{topic=e.target.value;draw()};$$('[data-a]').forEach(b=>b.onclick=()=>{SRS.add(b.dataset.a,'word');toast('Добавлено в SRS');b.disabled=true})};draw()}};

/* ---------- Книги и домашки ---------- */
const parseWords=txt=>{let page=1,out=[];for(const raw of txt.split(/\r?\n/)){const ln=raw.trim();if(!ln)continue;const pm=ln.match(/^(?:#|p\.?|стр\.?|page)\s*(\d+)/i);if(pm&&ln.length<14){page=+pm[1];continue}
  const parts=ln.split(/\s+[-–—]\s+|\t|;|\|/).map(x=>x.trim());if(parts.length<2)continue;const pg=ln.match(/^\[(\d+)\]/);out.push({id:'b_'+uid(),w:parts[0].replace(/^\[\d+\]\s*/,''),tr:parts[1],def:parts[2]||'',page:pg?+pg[1]:page})}return out};
V.books=function(root){const s=S(),cfg=(window.MISHA_CONFIG||{}).books||[];
 const lib=cfg.map(b=>{const own=s.books.find(x=>x.id===b.id),n=own?own.entries.length:0,pg=own&&n?[Math.min(...own.entries.map(e=>e.page)),Math.max(...own.entries.map(e=>e.page))]:null;return `<tr><td><b>${esc(b.title)}</b> <span class="pill ${b.exam}">${b.exam}</span></td><td>${n} слов${pg?` · стр. ${pg[0]}–${pg[1]}`:''}</td></tr>`}).join('');
 root.innerHTML=`<div class="row"><a class="btn alt sm" href="#/vocab">←</a><h1 class="sp" style="margin:0">📕 Книги и домашки</h1></div>
 <div class="card">${App.mood('board','Я не храню тексты защищённых книг — добавь слова сам (из своей копии) со страницами. Формат: <code>#12</code> — номер страницы, затем строки <code>слово - перевод - определение</code>.')}<table class="tbl" style="margin-top:.6rem">${lib}</table></div>
 <div class="card"><h3>Добавить слова из книги</h3><label>Книга</label><select id="bk">${cfg.map(b=>`<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select><label>Слова (или загрузи .txt)</label><textarea id="bt" placeholder="#12\nabandon - покидать - to leave completely\nacquire - приобретать\n#13\n…" style="min-height:140px"></textarea>
 <div class="row" style="margin-top:.5rem"><input type="file" id="bf" accept=".txt,.csv,.md" style="width:auto"><span class="sp"></span><button class="btn" id="badd">Добавить</button></div></div>
 <div class="card"><h3>Поставить домашку</h3><div class="row"><select id="hb" style="width:auto">${s.books.map(b=>`<option value="${b.id}">${esc(b.title||b.id)}</option>`).join('')||'<option value="">— сначала добавь слова —</option>'}</select>стр. <input type="number" id="hf" value="1" style="width:80px" min="1"> – <input type="number" id="ht" value="5" style="width:80px" min="1"><button class="btn" id="hadd">Задать</button></div></div>
 <div class="card"><h3>Мои домашки</h3>${s.homework.length?s.homework.map(h=>{const b=s.books.find(x=>x.id===h.book);const n=b?b.entries.filter(e=>e.page>=h.from&&e.page<=h.to).length:0;return `<div class="row" style="padding:.4rem 0;border-bottom:1px solid var(--line)"><span>${h.done?'✅':'📌'} Выучи слова со стр. <b>${h.from}–${h.to}</b> из «${esc(b?b.title:h.book)}» (${n})</span><span class="sp"></span><button class="btn alt sm" data-l="${h.id}">Учить</button><button class="btn sm" data-e="${h.id}">Экзамен</button></div>`}).join(''):'<p class="mute">Пока нет домашек.</p>'}</div>`;
 $('#bf').onchange=async e=>{const f=e.target.files[0];if(f)$('#bt').value=await f.text()};
 $('#badd').onclick=()=>{const id=$('#bk').value,ents=parseWords($('#bt').value);if(!ents.length)return toast('Не нашёл строк «слово - перевод»');let b=s.books.find(x=>x.id===id);if(!b){b={id,title:(cfg.find(c=>c.id===id)||{}).title||id,entries:[]};s.books.push(b)}
  ents.forEach(e=>{const ex=b.entries.find(x=>x.w.toLowerCase()===e.w.toLowerCase());if(ex)Object.assign(ex,e,{id:ex.id});else b.entries.push(e)});Store.save();App.indexWords();toast('Добавлено слов: '+ents.length);V.books(root)};
 $('#hadd').onclick=()=>{if(!$('#hb').value)return;s.homework.push({id:uid(),book:$('#hb').value,from:+$('#hf').value,to:+$('#ht').value,created:today(),done:false});Store.save();V.books(root)};
 $$('[data-l]').forEach(b=>b.onclick=()=>App.go('#/hw/learn/'+b.dataset.l));$$('[data-e]').forEach(b=>b.onclick=()=>App.go('#/hw/exam/'+b.dataset.e))};
V.hw=async function(root,mode,id){const s=S(),h=s.homework.find(x=>x.id===id);if(!h)return App.go('#/books');const b=s.books.find(x=>x.id===h.book);const ws=b?b.entries.filter(e=>e.page>=h.from&&e.page<=h.to):[];
 if(!ws.length){root.innerHTML=`<div class="card">${App.mood('sad','В этих страницах нет слов. Добавь их в «Книги».')}<a class="btn" href="#/books">Назад</a></div>`;return}
 ws.forEach(w=>SRS.add(w.id,'word'));
 if(mode==='learn'){await showWords(root,shuffle(ws).slice(0,12).map(e=>({...e,pos:'',ex:''})));root.innerHTML=`<div class="card">${App.mood('happy','Слова добавлены в повторение. Через день проверю!')}<a class="btn" href="#/books">Ок</a></div>`;return}
 const lv=App.level()<3?'low':App.level()<6?'mid':'high';const pool=ws.map(e=>({...e,pos:'',ex:'',topic:'book',lvl:2}));
 const sample=shuffle(pool).slice(0,10);const qs=sample.map((w,i)=>lv==='low'?App.makeVQ(w,'tr',pool.length>=4?pool:App.allWords()):lv==='mid'?App.makeVQ(w,w.def?'def':'tr',pool.length>=4?pool:App.allWords()):(i%3===2?App.makeVQ(w,'sent'):App.makeVQ(w,w.def?'type':'dict')));
 const r=await App.Quiz.run({root,questions:qs,feedback:true,title:'Экзамен по домашке'});const fs=App.finishSession(r.results,{title:'Домашка стр. '+h.from+'–'+h.to});if(fs.ok/fs.total>=.7)h.done=true;addXP(10+fs.ok*3,8);Store.save();
 root.innerHTML=`<div class="card">${App.mood(h.done?'celebrate':'cheer',`Результат: ${fs.ok}/${fs.total}. ${h.done?'Домашка зачтена!':'Нужно ≥70% — повтори слова и приходи снова.'} Результаты уже в SRS.`)}<div class="row">${fs.errs.length?'<a class="btn alt" href="#/review">Разбор</a>':''}<a class="btn" href="#/books">Ок</a></div></div>`};

/* ---------- Читалка ---------- */
async function unzip(buf){const dv=new DataView(buf);let e=buf.byteLength-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;if(e<0)throw new Error('zip');const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out=[],dec=new TextDecoder();
 for(let i=0;i<n;i++){if(dv.getUint32(p,true)!==0x02014b50)break;const m=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true),name=dec.decode(buf.slice(p+46,p+46+nl));p+=46+nl+el+cl;
  const ln=dv.getUint16(lo+26,true),le=dv.getUint16(lo+28,true),st=lo+30+ln+le;out.push({name,m,data:buf.slice(st,st+cs)})}return out}
async function readEpub(file){const files=await unzip(await file.arrayBuffer());let txt='';for(const f of files.filter(x=>/\.(x?html?)$/i.test(x.name)).sort((a,b)=>a.name.localeCompare(b.name))){let b=f.data;if(f.m===8)b=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
  const doc=new DOMParser().parseFromString(new TextDecoder().decode(b),'text/html');doc.querySelectorAll('script,style').forEach(x=>x.remove());txt+=[...doc.querySelectorAll('p,h1,h2,h3,li')].map(x=>x.textContent.trim()).filter(Boolean).join('\n\n')+'\n\n'}return txt.trim()}
const libTexts=()=>[...D.questions.passages.map(p=>({id:p.id,title:p.title,text:p.text,src:p.src,builtin:1})),...S().texts];
V.reader=async function(root,id){const s=S();
 if(!id){root.innerHTML=`<h1>📖 ${t('reader')}</h1><div class="card">${App.mood('hello','Тапни любое слово — покажу перевод, определение, произношение.')}</div>
  <div class="card"><h3>Библиотека</h3>${libTexts().map(x=>`<a class="node" style="width:100%" href="#/reader/${x.id}"><span class="ic">${x.builtin?'📘':'📄'}</span><span><b>${esc(x.title)}</b><br><span class="small mute">${esc(x.src||'твой текст')} · прочитано ${Math.round((s.readPos[x.id]||0)*100)}%</span></span></a>`).join('')}</div>
  <div class="card"><h3>Добавить свой текст</h3><input type="text" id="tt" placeholder="Название"><textarea id="tx" placeholder="Вставь текст…" style="min-height:120px"></textarea><div class="row" style="margin-top:.5rem"><input type="file" id="tf" accept=".txt,.md,.html,.epub,.pdf" style="width:auto"><span class="sp"></span><button class="btn" id="ta">Добавить</button></div><p class="small mute">.txt, .md, .html и .epub читаются прямо в браузере. PDF без внешних библиотек не разобрать — скопируй текст и вставь. Файлы не покидают устройство.</p></div>`;
  $('#tf').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#tt').value=f.name.replace(/\.[^.]+$/,'');try{if(/\.epub$/i.test(f.name))$('#tx').value=await readEpub(f);else if(/\.pdf$/i.test(f.name))toast('PDF: вставь текст вручную');else{let tx=await f.text();if(/\.html?$/i.test(f.name))tx=new DOMParser().parseFromString(tx,'text/html').body.textContent;$('#tx').value=tx}}catch(er){toast('Не удалось прочитать файл')}};
  $('#ta').onclick=()=>{const tx=$('#tx').value.trim();if(!tx)return;s.texts.push({id:'u_'+uid(),title:$('#tt').value||'Мой текст',text:tx,src:'добавлено пользователем'});Store.save();V.reader(root)};return}
 const T=libTexts().find(x=>x.id===id);if(!T)return App.go('#/reader');let shown=T.text,cfg={fs:1.15,lh:1.9,sepia:false};
 const render=()=>{const known=w=>{const lw=App.lemma(w);const c=lw&&s.cards[lw.id];return c?(c.reps>=2?'known':'unk'):''};
  const html=shown.split(/\n+/).filter(Boolean).map((p,pi)=>`<p data-p="${pi}">${p.replace(/([A-Za-z][A-Za-z'’-]*)|([^A-Za-z]+)/g,(m,w,o)=>w?`<span class="w ${known(w)}" tabindex="0">${esc(w)}</span>`:esc(o))} <button class="btn alt sm" data-bm="${pi}" aria-label="Закладка" style="padding:0 .3rem">${(s.bookmarks[id]||[]).includes(pi)?'🔖':'＋'}</button></p>`).join('');
  root.innerHTML=`<div class="row"><a class="btn alt sm" href="#/reader">←</a><h2 class="sp" style="margin:0">${esc(T.title)}</h2></div>
  <div class="row" style="margin:.6rem 0"><label class="small">Aa <input type="range" id="rf" min="0.9" max="1.8" step=".05" value="${cfg.fs}" style="width:90px"></label><label class="small">≡ <input type="range" id="rl" min="1.4" max="2.6" step=".1" value="${cfg.lh}" style="width:90px"></label><label class="small"><input type="checkbox" id="rs" ${cfg.sepia?'checked':''}> сепия</label><span class="sp"></span><button class="btn alt sm" id="simp">🧸 Упрощённый текст</button><button class="btn alt sm" id="rq">❓ Вопросы</button></div>
  <div class="bar"><i id="rp" style="width:${Math.round((s.readPos[id]||0)*100)}%"></i></div><div class="reader ${cfg.sepia?'sepia':''}" id="rd" style="--rfs:${cfg.fs}rem;--rlh:${cfg.lh}">${html}</div><div id="rqx"></div><div id="wp"></div>`;
  $('#rf').oninput=e=>{cfg.fs=+e.target.value;$('#rd').style.setProperty('--rfs',cfg.fs+'rem')};$('#rl').oninput=e=>{cfg.lh=+e.target.value;$('#rd').style.setProperty('--rlh',cfg.lh)};$('#rs').onchange=e=>{cfg.sepia=e.target.checked;$('#rd').classList.toggle('sepia',cfg.sepia)};
  $$('[data-bm]').forEach(b=>b.onclick=()=>{const L=s.bookmarks[id]||(s.bookmarks[id]=[]),p=+b.dataset.bm,i=L.indexOf(p);i>=0?L.splice(i,1):L.push(p);b.textContent=i>=0?'＋':'🔖';Store.save()});
  $$('.w',root).forEach(w=>{w.onclick=()=>lookup(w);w.onkeydown=e=>{if(e.key==='Enter')lookup(w)}});
  $('#simp').onclick=async()=>{const b=$('#simp');b.textContent='…';const r=await AI.simplify(T.text);if(r){shown=r;render();toast('Упрощённая версия (ИИ)')}else{b.textContent='🧸 Упрощённый текст';toast(I18N.t('aiOff'))}};
  $('#rq').onclick=async()=>{const box=$('#rqx');let qs=D.questions.questions.filter(q=>q.passage===id);if(!qs.length){box.innerHTML='<div class="skel"></div>';const j=await AI.makeQuestions(T.text);if(j&&j.qs)qs=j.qs.map((q,i)=>({id:'rq'+uid()+i,skill:'reading',topic:'mcq_reading',lvl:2,exam:'ielts',src:'ИИ',ai:true,typ:'mcq',wrong:['','','',''],...q}))}
   if(!qs.length){box.innerHTML=`<div class="expl">${I18N.t('aiOff')}. Вопросов для этого текста нет.</div>`;return}box.innerHTML='<div class="card" id="rqq"></div>';const r=await App.Quiz.run({root:$('#rqq'),questions:qs.map(q=>({...q,passage:q.passage||null})),feedback:true,title:'Вопросы к тексту'});const fs=App.finishSession(r.results,{title:'Вопросы к тексту'});addXP(5+fs.ok*4,5);$('#rqq').insertAdjacentHTML('beforeend',`<p class="center">${fs.ok}/${fs.total}. ${fs.errs.length?'<a href="#/review">Разбор ошибок</a>':''}</p>`)};
 };
 let sc;const onScroll=()=>{const d=document.documentElement,p=Math.min(1,d.scrollTop/Math.max(1,d.scrollHeight-innerHeight));const el=$('#rp');if(el)el.style.width=Math.round(p*100)+'%';clearTimeout(sc);sc=setTimeout(()=>{s.readPos[id]=Math.max(s.readPos[id]||0,p);Store.save()},400)};
 addEventListener('scroll',onScroll,{passive:true});window.addEventListener('hashchange',()=>removeEventListener('scroll',onScroll),{once:true});
 async function lookup(el){const raw=el.textContent,lw=App.lemma(raw);const box=$('#wp');box.innerHTML=`<div class="pop"><div class="skel"></div><div class="skel" style="width:60%"></div></div>`;
  let info=lw?{w:lw.w,tr:lw.tr,def:lw.def,pos:lw.pos,ex:lw.ex,ipa:'',local:1,id:lw.id}:null;
  if(!info){const r=await AI.wordInfo(raw);if(r)info={w:raw.toLowerCase(),tr:r.tr,def:r.def,pos:r.pos,ex:r.ex,ipa:r.ipa,mn:r.mnemonic}}
  const inS=info&&info.id&&s.cards[info.id];
  box.innerHTML=`<div class="pop" role="dialog" aria-label="Слово"><div class="row"><h2 style="margin:0">${esc(info?info.w:raw)}</h2><span class="small mute" id="ipa">${esc(info&&info.ipa||'')}</span><span class="small mute">${esc(info&&info.pos||'')}</span><span class="sp"></span><button class="btn alt sm" id="ps">🔊</button><button class="btn alt sm" id="pc" aria-label="Закрыть">✕</button></div>
  ${info?`<p><b>${esc(info.tr||'')}</b><br>${esc(info.def||'')}${info.ex?`<br><i class="mute">${esc(info.ex)}</i>`:''}</p>${info.mn?`<p class="small">💡 ${esc(info.mn)}</p>`:''}<p class="small">${App.morph(info.w)}</p><button class="btn" id="pa">${inS?'✓ В моих словах':'＋ '+t('addWord')}</button>`
  :`<p class="mute">${I18N.t('aiOff')}. Слова нет в локальном словаре.</p><input type="text" id="mt" placeholder="Свой перевод"><p><button class="btn" id="pa">＋ ${t('addWord')}</button> <a class="btn alt" target="_blank" rel="noopener" href="https://dictionary.cambridge.org/dictionary/english-russian/${encodeURIComponent(raw.toLowerCase())}">Cambridge ↗</a></p>`}</div>`;
  $('#ps').onclick=()=>App.speak(raw,{rate:.8});$('#pc').onclick=()=>box.innerHTML='';
  $('#pa').onclick=()=>{let w=lw;if(!w){const tr=info?info.tr:($('#mt')&&$('#mt').value)||'?';w={id:'c_'+raw.toLowerCase(),w:raw.toLowerCase(),tr,def:info?info.def:'',pos:info?info.pos:'',ex:info?info.ex:'',topic:'custom',lvl:2,custom:1};if(!s.customWords.find(x=>x.id===w.id))s.customWords.push(w);App.indexWords()}SRS.add(w.id,'word');Store.save();toast('Добавлено в мои слова');el.classList.add('unk');box.innerHTML=''}}
 render()};
})();
