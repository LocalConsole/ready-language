/* UI-ядро: данные, роутер, голос, генератор словарных вопросов, движок тестов, экран «Разбор ошибок с Мишей» */
(function(){
const {$,$$,esc,today,shuffle,pick,hash,uid,IDB,Store,Snd,confetti,toast,SRS}=App;
const S=()=>Store.s;
const D=App.D={};
App.views={};App.token=0;

/* ---------- данные ---------- */
App.loadData=async function(){
 const names=['words','questions','lessons','prompts','sources'];
 await Promise.all(names.map(async n=>{const r=await fetch('data/'+n+'.json');if(!r.ok)throw new Error('data/'+n);D[n]=await r.json()}));
 D.q={};D.questions.questions.forEach(q=>D.q[q.id]=q);
 D.passage={};[...D.questions.passages,...D.questions.listening].forEach(p=>D.passage[p.id]=p);
 D.lessonById={};D.lessons.lessons.forEach(l=>D.lessonById[l.id]=l);
 App.indexWords();
};
App.indexWords=function(){const m={};const add=w=>{m[w.w.toLowerCase()]=w};D.words.forEach(add);S().customWords.forEach(add);S().books.forEach(b=>(b.entries||[]).forEach(e=>add({id:e.id,w:e.w,tr:e.tr,def:e.def||'',pos:'',ex:'',topic:'book',lvl:2,custom:1})));D.widx=m};
App.allWords=()=>Object.values(D.widx);
App.lemma=function(raw){const w=raw.toLowerCase().replace(/[^a-z'-]/g,'').replace(/'s$/,'');if(D.widx[w])return D.widx[w];
 const tries=[w.replace(/ies$/,'y'),w.replace(/es$/,''),w.replace(/s$/,''),w.replace(/ed$/,''),w.replace(/ed$/,'e'),w.replace(/ing$/,''),w.replace(/ing$/,'e'),w.replace(/ly$/,''),w.replace(/ied$/,'y'),w.replace(/(.)\1ing$/,'$1')];
 for(const t of tries)if(t!==w&&D.widx[t])return D.widx[t];return null};

/* ---------- голос ---------- */
App.voices=()=>speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
App.speak=function(text,o){o=o||{};return new Promise(res=>{if(!('speechSynthesis' in window)){res(false);return}
 speechSynthesis.cancel();const lines=o.dialog?text.split('\n').filter(Boolean):[text];const vs=App.voices();let i=0;
 const next=()=>{if(i>=lines.length||App.stopSpeak){res(true);return}let ln=lines[i++],sp=0;const m=ln.match(/^([A-Za-z ]+):\s*/);if(m){ln=ln.slice(m[0].length);sp=/caller|student|woman|b$/i.test(m[1])?1:0}
  const u=new SpeechSynthesisUtterance(ln);u.lang='en-GB';u.rate=o.rate||.95;if(vs.length)u.voice=vs[(sp%vs.length+(o.vo||0))%vs.length];u.onend=next;u.onerror=next;speechSynthesis.speak(u)};App.stopSpeak=false;next();setTimeout(()=>res(true),Math.min(180000,text.length*120+5000))})};
App.stop=()=>{App.stopSpeak=true;try{speechSynthesis.cancel()}catch(e){}};
App.ACC={vocab:'vocab',grammar:'grammar',reading:'reading',listening:'listening',rw:'sat_rw',math:'sat_math'};
App.POS={n:'существительное',v:'глагол',adj:'прилагательное',adv:'наречие'};
App.head=(ic,title,sub,acc)=>`<div class="ph" data-acc="${acc||'vocab'}"><span class="pic">${ic}</span><div><h1>${title}</h1>${sub?'<p>'+sub+'</p>':''}</div></div>`;
App.beginner=()=>{const s=Store.s,d=s.diag;return !d||(d.skills&&d.skills.vocab!=null&&d.skills.vocab<.5)||App.level()<3};
App.say=(state,text)=>`<div class="say"><div class="misha">${Misha.svg(state,App.outfit())}</div><div class="bubble">${text}</div></div>`;
App.mood=(state,text)=>App.say(state,text||I18N.line(state));

/* ---------- генератор словарных вопросов ---------- */
const mutate=w=>{const out=new Set(),a=w.split('');const V='aeiou';
 const ops=[()=>{const i=1+Math.floor(Math.random()*Math.max(a.length-3,1));const b=[...a];[b[i],b[i+1]]=[b[i+1],b[i]];return b.join('')},
  ()=>{const i=1+Math.floor(Math.random()*(a.length-2));const b=[...a];b.splice(i,0,b[i]);return b.join('')},
  ()=>{const i=1+Math.floor(Math.random()*(a.length-2));const b=[...a];b.splice(i,1);return b.join('')},
  ()=>{const idx=a.map((c,i)=>V.includes(c)&&i>0?i:-1).filter(i=>i>=0);if(!idx.length)return w+'e';const i=pick(idx);const b=[...a];b[i]=pick(V.split('').filter(v=>v!==b[i]));return b.join('')}];
 let g=0;while(out.size<3&&g++<40){const m=pick(ops)();if(m!==w&&m.length>2)out.add(m)}return [...out]};
App.makeVQ=function(w,mode,pool){pool=pool||App.allWords();const others=shuffle(pool.filter(x=>x.w!==w.w));
 const info=`<b>${esc(w.w)}</b>${w.pos?' ('+w.pos+')':''} — ${esc(w.tr)}.${w.def?' '+esc(w.def)+'.':''}${w.ex?' Пример: <i>'+esc(w.ex)+'</i>':''}`;
 const base={id:'v:'+w.id+':'+mode,skill:'vocab',topic:'words',lvl:w.lvl||2,exam:'ielts',src:'Словарь',expl:info,wid:w.id,wd:w,typ:'mcq'};
 if(mode==='def'&&!w.def)mode='tr';if(mode==='cloze'&&!w.ex)mode='tr';
 const build=(q,opts,right,label)=>{const arr=shuffle(opts);return Object.assign(base,{q,opts:arr.map(o=>o.t),a:arr.findIndex(o=>o.right),wrong:arr.map(o=>o.right?'':o.why),id:base.id.replace(/:[^:]*$/,':'+mode)})};
 if(mode==='rev'){const d=others.filter(x=>x.w!==w.w).slice(0,3);return build('Как по-английски: «'+w.tr+'»?',[{t:w.w,right:1},...d.map(x=>({t:x.w,why:'«'+x.w+'» означает: '+x.tr+'.'}))])}
 if(mode==='tr'){const d=others.filter(x=>x.tr!==w.tr).slice(0,3);return build('Что означает слово «'+w.w+'»?',[{t:w.tr,right:1},...d.map(x=>({t:x.tr,why:'«'+x.tr+'» — это перевод слова «'+x.w+'».'}))])}
 if(mode==='def'){const d=others.filter(x=>x.def).slice(0,3);return build(w.def,[{t:w.w,right:1},...d.map(x=>({t:x.w,why:'«'+x.w+'» означает: '+x.tr+'.'}))])}
 if(mode==='cloze'){const sent=w.ex.replace(new RegExp(w.w.slice(0,Math.max(4,w.w.length-3))+'\\w*','i'),'_____');const d=others.filter(x=>x.pos===w.pos||!w.pos).slice(0,3);return build(sent,[{t:w.w,right:1},...d.map(x=>({t:x.w,why:'«'+x.w+'» ('+x.tr+') не подходит по смыслу.'}))])}
 if(mode==='spell'){return build('Выбери правильное написание:',[{t:w.w,right:1},...mutate(w.w).map(m=>({t:m,why:'Неверное написание. Правильно: '+w.w+'.'}))])}
 if(mode==='type')return Object.assign(base,{typ:'type',q:(w.def||w.tr),hint:w.tr,answer:w.w,opts:[],a:-1,wrong:[],lvl:3});
 if(mode==='dict')return Object.assign(base,{typ:'type',audio:w.w,q:'Послушай слово и напиши его',answer:w.w,opts:[],a:-1,wrong:[],lvl:3,hint:w.tr});
 if(mode==='sent')return Object.assign(base,{typ:'sent',q:'Составь предложение со словом «'+w.w+'» ('+w.tr+')',answer:w.w,opts:[],a:-1,wrong:[],lvl:3});
 return App.makeVQ(w,'tr',pool)};

/* ---------- статистика и журнал ошибок ---------- */
App.record=function(results){const s=S();s.stats=s.stats||{};const errs=[];
 for(const r of results){const q=r.q,st=s.stats[q.skill]||(s.stats[q.skill]={n:0,ok:0,w:0,wok:0});const w=[1,1.5,2][(q.lvl||2)-1]||1;st.n++;st.w+=w;if(r.ok){st.ok++;st.wok+=w}
  if(q.wid&&s.cards[q.wid])SRS.grade(q.wid,r.ok?4:1);
  if(!r.ok){errs.push(r);const snap=Object.assign({},q);delete snap.wd;const ex=s.errors.find(e=>e.qid===q.id);
   if(ex){ex.count++;ex.date=today();ex.ans=r.ans;ex.q=snap}else s.errors.push({id:uid(),qid:q.id,q:snap,ans:r.ans,date:today(),count:1,topic:q.topic,skill:q.skill});
   SRS.card('q:'+q.id,'error');s.cards['q:'+q.id].due=App.addDays(today(),1);
   if(q.wid)SRS.add(q.wid,'word')}
  else if(s.cards['q:'+q.id]){SRS.grade('q:'+q.id,4,'error')}}
 if(s.errors.length>600)s.errors=s.errors.slice(-600);Store.save();return errs};
App.finishSession=function(results,ctx){ctx=ctx||{};const errs=App.record(results);const ok=results.filter(r=>r.ok).length;
 if(ok===results.length&&results.length>=3)App.unlock('perfect');
 App.review={title:ctx.title||'Разбор',items:errs.map(r=>({kind:'q',q:r.q,ans:r.ans})),extra:ctx.extra||[]};return {ok,total:results.length,errs}};

/* ---------- движок тестов ---------- */
App.Quiz={
 run(o){return new Promise(resolve=>{const root=o.root,tok=App.token;const results=[];let i=0,tmr=null,left=o.timer||0,t0=Date.now(),done=false;
  const total=o.total||o.questions.length;
  const finish=(timeUp)=>{if(done)return;done=true;clearInterval(tmr);App.stop();resolve({results,total,ok:results.filter(r=>r.ok).length,timeUp:!!timeUp})};
  const drawTimer=()=>{const el=$('#qt',root);if(!el)return;const m=Math.floor(left/60),s=left%60;el.textContent=m+':'+String(s).padStart(2,'0');el.classList.toggle('low',left<=60)};
  if(left){tmr=setInterval(()=>{if(tok!==App.token){clearInterval(tmr);return}left--;drawTimer();if(left<=0)finish(true)},1000)}
  const show=()=>{if(tok!==App.token){clearInterval(tmr);return}
   const q=o.next?o.next(results,i):o.questions[i];if(!q||(!o.next&&i>=o.questions.length)||i>=total){finish();return}
   const p=q.passage?D.passage[q.passage]:null,isL=p&&p.skill==='listening',letters='ABCDEFGH';
   let ans=null,answered=false,played=false,qs=Date.now();
   root.innerHTML=`${o.header||''}<div class="card top" data-acc="${App.ACC[q.skill]||'vocab'}"><div class="q-head"><span class="pill ${q.skill}">${esc(o.title||'')}</span><span class="small mute qn">Вопрос ${i+1} из ${total}</span><span class="sp"></span>${left?'<span class="timer" id="qt"></span>':''}</div>
   <div class="bar"><i style="width:${Math.round(i/total*100)}%"></i></div><div style="height:.8rem"></div>
   ${p&&!isL?`<div class="passage" tabindex="0"><b>${esc(p.title)}</b>\n\n${esc(p.text)}</div>`:''}
   ${isL?`<div class="row" style="margin-bottom:.6rem"><button class="btn alt" id="play">▶ Слушать</button>${o.once?'':'<span class="small mute">можно переслушать</span>'}<label class="small"><input type="checkbox" id="sub"> субтитры</label></div><div class="passage" id="tr" hidden>${esc(p.text)}</div>`:''}
   ${q.audio?`<div class="row"><button class="btn alt" id="aud">🔊 Слушать слово</button></div>`:''}
   <h3 id="qq">${esc(q.q)}</h3>
   ${q.typ==='mcq'?q.opts.map((t,k)=>`<button class="opt" data-k="${k}"><i class="lt">${letters[k]}</i><span>${esc(t)}</span></button>`).join(''):`<input type="text" id="ti" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Ответ" placeholder="Твой ответ…">${q.hint?'<div class="small mute">Подсказка: '+esc(q.hint)+'</div>':''}`}
   <div id="fb"></div><div class="row" style="margin-top:.8rem"><button class="btn alt sm" id="skip">${t('skip')}</button><span class="sp"></span><button class="btn" id="go" ${q.typ==='mcq'&&!o.feedback?'disabled':''}>${q.typ==='mcq'&&o.feedback?t('next'):t('check')}</button></div></div>`;
   drawTimer();
   if(isL){$('#play',root).onclick=async()=>{if(o.once&&played)return;played=true;const b=$('#play',root);b.disabled=!!o.once;b.textContent='🔊 Играет…';await App.speak(p.text,{dialog:true,rate:.92});if(!done&&b.isConnected){b.textContent='▶ Ещё раз';b.disabled=!!o.once}};$('#sub',root).onchange=e=>$('#tr',root).hidden=!e.target.checked}
   if(q.audio)$('#aud',root).onclick=()=>App.speak(q.audio,{rate:.8});
   const commit=(skipped)=>{if(answered)return;answered=true;let ok=false;
    if(!skipped){if(q.typ==='mcq')ok=ans===q.a;else{const v=($('#ti',root).value||'').trim();ans=v;ok=q.typ==='sent'?(v.toLowerCase().includes(q.answer.toLowerCase().slice(0,Math.max(4,q.answer.length-3)))&&v.split(/\s+/).length>=4):v.toLowerCase()===q.answer.toLowerCase()}}
    results.push({q,ans:skipped?null:ans,ok,ms:Date.now()-qs});
    if(o.feedback){Snd.play(ok?'ok':'bad');$$('.opt',root).forEach((b,k)=>{b.disabled=true;if(k===q.a)b.classList.add('good');else if(k===ans)b.classList.add('bad')});
     const ex=q.ai?esc(q.expl):q.expl;const why=(!ok&&q.typ==='mcq'&&ans!=null&&q.wrong[ans])?`<div class="small" style="margin-top:.4rem">❌ ${esc(q.wrong[ans])}</div>`:'';
     $('#fb').innerHTML=`<div class="say" style="margin-top:.8rem"><div class="misha" style="width:74px">${Misha.svg(ok?'happy':'sad',App.outfit(),{still:1})}</div><div class="expl ${ok?'good':'bad'}" style="flex:1"><b class="vd">${ok?'✅ '+t('correct'):'❌ '+t('wrong')}</b>${q.typ==='type'?`<br>${t('rightAnswer')}: <b>${esc(q.answer)}</b>`:''}<br>${ex}${why}</div></div>`;
     const go=$('#go',root);go.disabled=false;go.textContent=t('next');go.onclick=()=>{i++;show()};$('#skip',root).hidden=true;if(isL)$('#tr',root).hidden=false;
     if(q.key&&isL){$('#tr',root).innerHTML=esc(p.text).replace(esc(q.key),m=>'<mark>'+m+'</mark>')}}
    else{i++;show()}};
   $$('.opt',root).forEach(b=>b.onclick=()=>{if(answered)return;Snd.play('tap');ans=+b.dataset.k;if(o.feedback){commit()}else{$$('.opt',root).forEach(x=>x.classList.toggle('sel',x===b));$('#go',root).disabled=false}});
   $('#go',root).onclick=()=>commit();$('#skip',root).onclick=()=>commit(true);
   const ti=$('#ti',root);if(ti){ti.focus();ti.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const g=$('#go',root);g.click()}}}
  };show()})}};

/* ---------- Разбор ошибок с Мишей ---------- */
App.views.review=function(root,arg){
 const src=arg==='journal'?{title:'Журнал ошибок',items:S().errors.slice().reverse().map(e=>({kind:'q',q:e.q,ans:e.ans,jid:e.id}))}:App.review;
 if(!src||!src.items.length&&!(src.extra&&src.extra.length)){root.innerHTML=`<div class="card center">${App.mood('celebrate','Ошибок нет — разбирать нечего. Редкая чистота!')}<p><a class="btn" href="#/home">На главную</a></p></div>`;return}
 const all=[...src.items,...(src.extra||[])];let skill='all',topic='all',idx=0,tr=0;
 const topicName=App.topicName;
 const filtered=()=>all.filter(x=>(skill==='all'||(x.q&&x.q.skill===skill)||(x.kind==='text'&&x.skill===skill))&&(topic==='all'||(x.q&&x.q.topic===topic)));
 const draw=()=>{const L=filtered();if(idx>=L.length)idx=Math.max(0,L.length-1);const it=L[idx];
  const skills=[...new Set(all.map(x=>x.q?x.q.skill:x.skill))],topics=[...new Set(all.filter(x=>x.q).map(x=>x.q.topic))];
  root.innerHTML=`<h2>${t('review')}</h2><p class="small mute">${esc(src.title||'')} · ошибок: ${all.length}. Ни одна не пропускается — просмотри все по порядку.</p>
  <div class="row" style="margin-bottom:.8rem"><select id="fs" style="width:auto" aria-label="Навык"><option value="all">Все навыки</option>${skills.map(s=>`<option ${s===skill?'selected':''} value="${s}">${s}</option>`).join('')}</select>
  <select id="ft" style="width:auto" aria-label="Тема"><option value="all">Все темы</option>${topics.map(s=>`<option ${s===topic?'selected':''} value="${s}">${esc(topicName(s))}</option>`).join('')}</select><span class="sp"></span><span class="chip">Ошибка ${L.length?idx+1:0} из ${L.length}</span></div>
  <div class="bar" style="margin-bottom:1rem"><i style="width:${L.length?Math.round((idx+1)/L.length*100):0}%"></i></div><div id="item"></div>
  <div class="row" style="margin-top:1rem"><button class="btn alt" id="pv" ${idx?'':'disabled'}>← ${t('back')}</button><span class="sp"></span>${idx<L.length-1?`<button class="btn" id="nx">${t('next')} →</button>`:`<a class="btn ok" href="#/home">Готово — на главную</a>`}</div>`;
  $('#fs').onchange=e=>{skill=e.target.value;idx=0;draw()};$('#ft').onchange=e=>{topic=e.target.value;idx=0;draw()};
  const nx=$('#nx');if(nx)nx.onclick=()=>{idx++;draw();scrollTo({top:0,behavior:'smooth'})};$('#pv').onclick=()=>{idx--;draw()};
  if(it)item(it,$('#item'))};
 const item=(it,el)=>{
  if(it.kind==='text'){el.innerHTML=`<div class="card">${App.mood('explain','Разберём предложение построчно.')}<h3>${esc(it.title||'Исправление')}</h3><table class="tbl"><tr><td>❌</td><td>${esc(it.original)}</td></tr><tr><td>✅</td><td><b>${esc(it.fix)}</b></td></tr><tr><td>💡</td><td>${esc(it.why||'')}</td></tr></table></div>`;return}
  const q=it.q,p=q.passage?D.passage[q.passage]:null,L=q.typ!=='mcq';
  const mine=it.ans==null?'— (пропущено)':(L?it.ans||'—':q.opts[it.ans]);const right=L?q.answer:q.opts[q.a];
  const inj=S().errors.some(e=>e.qid===q.id);
  const ex=q.ai?esc(q.expl):q.expl;
  el.innerHTML=`<div class="card stagger top" data-acc="${App.ACC[q.skill]||'danger'}"><div>${App.say('sad',I18N.line('sad'))}</div>
   <div><span class="pill ${q.skill}">${q.skill}</span> <span class="pill">${esc(topicName(q.topic))}</span> <span class="pill ${q.exam}">${q.exam}</span> <span class="small mute">· источник: ${esc(q.src||'')}</span></div>
   <div class="rs q"><h3><span class="n">1</span>Вопрос</h3>${p&&p.skill==='reading'?`<div class="passage">${esc(p.text)}</div>`:''}<p style="margin:.3rem 0"><b>${esc(q.q)}</b></p>${!L?`<ol type="A" class="small">${q.opts.map(o=>`<li>${esc(o)}</li>`).join('')}</ol>`:''}</div>
   <div class="rs mine"><h3><span class="n">✗</span>${t('yourAnswer')}</h3><b style="color:var(--bad)">${esc(mine)}</b></div>
   <div class="rs right"><h3><span class="n">✓</span>${t('rightAnswer')}</h3><b style="color:var(--ok)">${esc(right)}</b></div>
   <div class="rs why"><h3><span class="n">3</span>Почему именно так</h3>${ex}</div>
   <div class="rs no"><h3><span class="n">4</span>${t('whyNot')}</h3>${!L&&it.ans!=null&&q.wrong[it.ans]?`«${esc(mine)}» — ${esc(q.wrong[it.ans])}`:L?'Ответ не совпал с эталоном — сверь написание/смысл.':it.ans==null?'Вариант не выбран — на экзамене лучше всегда выбирать наиболее вероятный ответ.':'«'+esc(mine)+'» не подходит — сравни с правилом в пункте 3.'}</div>
   ${p&&p.skill==='listening'?`<div class="rs au"><h3><span class="n">6</span>Аудио и транскрипт</h3><button class="btn alt sm" id="ap">▶ Прослушать фрагмент</button><div class="passage" style="margin:.5rem 0 0">${esc(p.text).replace(q.key?esc(q.key):'§§',m=>'<mark>'+m+'</mark>')}</div></div>`:''}
   ${p&&p.skill==='reading'&&q.key?`<div class="expl small"><b>Где в тексте:</b> «${esc(q.key)}»</div>`:''}
   <div id="sim"></div>
   <div class="hint">👉 <span>Нажми «Попробуй сам» — Миша даст похожий вопрос, чтобы закрепить.</span></div>
   <div class="row" style="margin-top:.8rem"><button class="btn alt sm" id="ok">✓ ${t('understood')}</button><button class="btn alt sm" id="simp">🧸 ${t('simpler')}</button><button class="btn alt sm" id="jn">${inj?'📓 '+t('inJournal'):'📓 '+t('addJournal')}</button><button class="btn sm" id="try">🎯 ${t('tryYourself')}</button></div><div id="aix"></div></div>`;
  if(p&&p.skill==='listening'){$('#ap').onclick=()=>App.speak(q.key||p.text,{rate:.9})}
  $('#ok').onclick=()=>{Snd.play('ok');toast('Отмечено ✓');const n=$('#nx');if(n)n.click()};
  $('#jn').onclick=e=>{const s=S();const has=s.errors.findIndex(x=>x.qid===q.id);if(has>=0){s.errors.splice(has,1);e.target.textContent='📓 '+t('addJournal')}else{s.errors.push({id:uid(),qid:q.id,q:Object.assign({},q),ans:it.ans,date:today(),count:1,topic:q.topic,skill:q.skill});e.target.textContent='📓 '+t('inJournal')}Store.save()};
  $('#simp').onclick=async()=>{const b=$('#aix');b.innerHTML='<div class="skel"></div><div class="skel" style="width:70%"></div>';const r=await AI.explainSimpler(q,it.ans);b.innerHTML=r?`<div class="say" style="margin-top:.6rem"><div class="misha" style="width:80px">${Misha.svg('explain',App.outfit(),{still:1})}</div><div class="bubble">${esc(r).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>')}</div></div>`:`<div class="expl">${I18N.t('aiOff')}. Упрощённо: ${q.expl.replace(/<[^>]+>/g,'').split('.').slice(0,2).join('.')}.</div>`};
  const tryOne=async()=>{const b=$('#sim');b.innerHTML='<div class="skel"></div>';let sim=D.questions.questions.filter(x=>x.topic===q.topic&&x.id!==q.id&&!x.passage);
   if(q.wid)sim=[App.makeVQ(pick(App.allWords().filter(w=>w.id!==q.wid)),'tr')];
   let s2=sim.length?pick(sim):await AI.extraQuestion(topicName(q.topic),q.lvl||2);
   if(!s2){b.innerHTML='<div class="expl">Похожих заданий пока нет. Загляни в уроки по теме.</div>';return}
   b.innerHTML='<div class="card" id="mini"></div>';const r=await App.Quiz.run({root:$('#mini'),questions:[s2],feedback:true,title:'Теперь сам'});App.record(r.results);
   $('#mini').innerHTML=`<div class="say">${Misha.html(r.ok?'happy':'cheer',App.outfit(),{still:1})}<div class="bubble">${r.ok?'🎉 Получилось! Тема закрепляется.':'Ничего, она вернётся в повторение — ошибка уже в журнале.'}</div></div><div class="row"><button class="btn" id="again">🎯 Ещё один похожий</button><button class="btn alt" id="done">Закрыть</button></div>`;
   $('#again').onclick=tryOne;$('#done').onclick=()=>{$('#sim').innerHTML=''}};
  $('#try').onclick=tryOne;
  };draw()};
App.topicName=t=>({tenses_pp:'Present Perfect / Past Simple',articles:'Артикли',conditionals:'Условные',passive:'Пассив',prepositions:'Предлоги',relative:'Относительные придаточные',modal:'Модальные глаголы',subject_verb:'Согласование',reported:'Косвенная речь',comparatives:'Степени сравнения',gerunds:'Герундий / инфинитив',tfng:'True/False/Not Given',mcq_reading:'Reading: выбор ответа',headings:'Reading: заголовки',listening_form:'Listening: форма',listening_lecture:'Listening: лекции',sat_transitions:'SAT: связки',sat_boundaries:'SAT: границы предложений',sat_vocab:'SAT: слова в контексте',sat_concision:'SAT: краткость',m_linear:'Math: линейные ур-я',m_quad:'Math: квадраты и функции',m_percent:'Math: проценты и отношения',m_geo:'Math: геометрия',words:'Словарь'}[t]||t);

/* ---------- роутер ---------- */
const NAV=[['home','🏠','home'],['path','🗺️','path'],['practice','🎯','practice'],['exam','📝','exam'],['dash','📈','dash'],['me','🐻','me']];
App.go=h=>{location.hash=h};
App.route=async function(){App.token++;App.stop();const h=(location.hash||'#/home').slice(2),[name,...rest]=h.split('/');const root=$('#view');root.setAttribute('aria-busy','true');
 if(!S().profile&&!['start','settings','sources'].includes(name)){return App.go('#/start')}
 $$('#top nav a,#bottom a').forEach(a=>a.classList.toggle('on',a.dataset.r===name));
 root.innerHTML=`<div class="card">${App.mood('think',t('loading'))}<div class="skel"></div><div class="skel" style="width:60%"></div></div>`;
 const v=App.views[name]||App.views.home;
 try{await v(root,...rest.map(decodeURIComponent));root.classList.remove('enter');void root.offsetWidth;root.classList.add('enter')}
 catch(e){console.error(e);root.innerHTML=`<div class="card">${App.mood('sad','Что-то пошло не так, но я уже чиню.')}<pre class="small">${esc(e.message)}</pre><a class="btn" href="#/home">На главную</a></div>`}
 root.removeAttribute('aria-busy');scrollTo(0,0);const aiEl=$('#ai-ind');if(aiEl)AI.ping();
 try{IDB.set('lastActive',Date.now())}catch(e){}};
App.buildNav=function(){const lab={home:t('home'),path:t('path'),practice:t('practice'),exam:t('exam'),dash:t('dash'),me:t('me')};
 $('#top nav').innerHTML=NAV.map(([r,i])=>`<a href="#/${r}" data-r="${r}">${lab[r]}</a>`).join('');
 $('#bottom').innerHTML=NAV.map(([r,i])=>`<a href="#/${r}" data-r="${r}"><span>${i}</span>${lab[r]}</a>`).join('')};
App.applySettings=function(){const s=S().settings;let th=s.theme;if(th==='auto')th=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.dataset.theme=th;
 I18N.lang=s.lang;document.documentElement.lang=s.lang;document.body.classList.toggle('bigtext',!!s.big);document.body.classList.toggle('dys',!!s.dys);document.body.classList.toggle('reduce',!!s.reduce);
 const weak=(navigator.deviceMemory&&navigator.deviceMemory<=2)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2)||(navigator.connection&&(navigator.connection.saveData||/2g/.test(navigator.connection.effectiveType||'')));document.body.classList.toggle('lite',!!weak)};
})();
