/* ИИ-слой: заменяемые провайдеры, автопереключение, кэш, индикатор лимита, локальные запасные варианты */
(function(){
const {IDB,Store,hash,today,esc}=App;
const CFG=()=>window.MISHA_CONFIG||{};
const P={
 groq:{name:'Groq',async call(m,key,cfg){const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model:(cfg.models||{}).groq||'llama-3.3-70b-versatile',messages:m.messages,temperature:.3,response_format:m.json?{type:'json_object'}:undefined})});return fin(r,j=>j.choices[0].message.content)}},
 gemini:{name:'Gemini',async call(m,key,cfg){const mod=(cfg.models||{}).gemini||'gemini-2.0-flash';const sys=m.messages.filter(x=>x.role==='system').map(x=>x.content).join('\n');const cont=m.messages.filter(x=>x.role!=='system').map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]}));
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents:cont,generationConfig:{temperature:.3,responseMimeType:m.json?'application/json':'text/plain'}})});return fin(r,j=>j.candidates[0].content.parts[0].text)}},
 openrouter:{name:'OpenRouter',async call(m,key,cfg){const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model:(cfg.models||{}).openrouter||'meta-llama/llama-3.3-70b-instruct:free',messages:m.messages,temperature:.3})});return fin(r,j=>j.choices[0].message.content)}},
 proxy:{name:'Прокси',async call(m,url){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:m.messages,json:!!m.json})});return fin(r,j=>j.text||j.choices[0].message.content)}}};
async function fin(r,pick){const rem=r.headers.get('x-ratelimit-remaining-requests');if(!r.ok){const e=new Error('HTTP '+r.status);e.status=r.status;e.rem=rem;throw e}const j=await r.json();return {text:pick(j),rem}}

const AI={cool:{},usage:null,
 u(){if(!this.usage||this.usage.d!==today()){try{this.usage=JSON.parse(localStorage.getItem('misha.ai'))}catch(e){}if(!this.usage||this.usage.d!==today())this.usage={d:today(),n:{},rem:{}}}return this.usage},
 keyFor(p){const s=Store.s.settings.keys,c=CFG();return p==='proxy'?(s.proxy||c.proxyUrl||''):(s[p]||(c.keys||{})[p]||'')},
 providers(){return (Store.s.settings.order||Object.keys(P)).filter(p=>P[p]&&this.keyFor(p)&&!(this.cool[p]>Date.now()))},
 configured(){return (Store.s.settings.order||Object.keys(P)).filter(p=>P[p]&&this.keyFor(p))},
 available(){return navigator.onLine&&this.providers().length>0},
 status(){const u=this.u(),c=this.configured();if(!c.length)return {ok:false,text:'ИИ: нет ключа',detail:'Добавь ключ в Настройках — пока работает локальная база.'};
  const lim=CFG().dailySoftLimit||{};const parts=c.map(p=>{const used=u.n[p]||0,max=lim[p]||200,rem=u.rem[p];return `${P[p].name}: ${rem!=null?rem+' осталось':used+'/'+max}${this.cool[p]>Date.now()?' (отдыхает)':''}`});
  return {ok:this.available(),text:'ИИ '+(this.available()?'●':'○'),detail:parts.join(' · ')}},
 async ask(o){/* o:{system,prompt,json,key,noCache} → {text,from,cached} либо бросает ошибку */
  const key='ai:'+hash((o.system||'')+'|'+o.prompt);
  if(!o.noCache){const c=await IDB.get(key);if(c)return {text:c,from:'cache',cached:true}}
  const m={json:o.json,messages:[{role:'system',content:o.system||'You are Misha, a friendly Russian bear teaching English for IELTS and SAT. Answer concisely.'},{role:'user',content:o.prompt}]};
  let lastErr;for(const p of this.providers()){try{const r=await P[p].call(m,this.keyFor(p),CFG());const u=this.u();u.n[p]=(u.n[p]||0)+1;if(r.rem!=null)u.rem[p]=r.rem;localStorage.setItem('misha.ai',JSON.stringify(u));await IDB.set(key,r.text);this.ping();return {text:r.text,from:p}}catch(e){lastErr=e;this.cool[p]=Date.now()+(e.status===429?60e3:e.status===401||e.status===403?3600e3:20e3);this.ping()}}
  throw lastErr||new Error('no-ai')},
 ping(){const el=document.getElementById('ai-ind');if(el){const s=this.status();el.textContent=s.text;el.title=s.detail}},
 /* ===== Высокоуровневые функции с локальной запасной веткой ===== */
 async json(o){const r=await this.ask(Object.assign({json:true},o));let t=r.text.trim().replace(/^```json|^```|```$/g,'').trim();try{return JSON.parse(t)}catch(e){const m=t.match(/\{[\s\S]*\}/);if(m)return JSON.parse(m[0]);throw e}},
 async wordInfo(word){const w=(word||'').toLowerCase();try{return await this.json({prompt:`Give JSON for the English word "${w}": {"tr":"перевод на русский (кратко)","def":"simple English definition","pos":"part of speech","ipa":"/ipa/","ex":"one example sentence","mnemonic":"короткая мнемоника на русском"}`,system:'You are a precise bilingual English-Russian dictionary. Output JSON only.'})}catch(e){return null}},
 async explainSimpler(q,userAns){try{const r=await this.ask({prompt:`Объясни ошибку простыми словами по-русски (5–6 предложений, как ребёнку). Вопрос: ${q.q}\nВарианты: ${q.opts.join(' | ')}\nПравильный: ${q.opts[q.a]}\nОтвет ученика: ${userAns==null?'нет':q.opts[userAns]}\nУже было объяснено: ${q.expl.replace(/<[^>]+>/g,'')}`,system:'Ты Миша, дружелюбный русский медведь-репетитор английского. Отвечай на русском, коротко, с лёгким юмором.'});return r.text}catch(e){return null}},
 async gradeWriting(task,text,exam){const crit=exam==='sat'?'Standard English Conventions, Expression of Ideas, Organization, Word Choice':'Task Response/Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy';
  try{return await this.json({system:'You are a strict certified IELTS/SAT examiner. Output JSON only. Comments in Russian, quotes in English.',prompt:`Grade this ${exam==='sat'?'SAT':'IELTS'} writing. Task: ${task}\nCriteria: ${crit}.\nReturn JSON: {"overall":number (IELTS band 0-9 in 0.5 steps; for SAT 1-4 scale of overall quality),"criteria":[{"name":"","band":number,"comment":"по-русски"}],"errors":[{"original":"exact fragment","fix":"correction","why":"объяснение по-русски"}],"improved":"improved full version of the text"}\nText:\n${text}`})}catch(e){return null}},
 async gradeSpeaking(prompt,transcript,wpm){try{return await this.json({system:'You are a strict certified IELTS speaking examiner. Output JSON only. Comments in Russian.',prompt:`Task: ${prompt}\nTranscript (speech recognition, may lack punctuation), pace ${wpm||'?'} wpm:\n${transcript}\nReturn JSON: {"overall":number,"criteria":[{"name":"Fluency & Coherence","band":0,"comment":""},{"name":"Lexical Resource","band":0,"comment":""},{"name":"Grammatical Range & Accuracy","band":0,"comment":""},{"name":"Pronunciation (estimate from text only)","band":0,"comment":""}],"errors":[{"original":"","fix":"","why":""}],"improved":"a better version of the answer"}`})}catch(e){return null}},
 async simplify(text){try{return (await this.ask({prompt:'Rewrite this text in simple English (CEFR A2-B1), keep the meaning, keep paragraphs:\n'+text.slice(0,3500)})).text}catch(e){return null}},
 async makeQuestions(text){try{return await this.json({prompt:`Write 4 multiple-choice reading comprehension questions (IELTS style) for this text. JSON: {"qs":[{"q":"","opts":["","","",""],"a":0,"expl":"объяснение по-русски"}]}\n${text.slice(0,3500)}`})}catch(e){return null}},
 async extraQuestion(topic,lvl){try{const j=await this.json({prompt:`Create ONE new multiple-choice practice question (4 options) on the topic "${topic}" for an IELTS/SAT learner, level ${lvl}/3. JSON: {"q":"","opts":["","","",""],"a":0,"expl":"подробное объяснение по-русски"}`});return j&&j.q?Object.assign({id:'ai_'+hash(j.q),topic,skill:'grammar',lvl,wrong:['','','',''],src:'ИИ-генерация',ai:true},j):null}catch(e){return null}}};

/* ===== Локальная оценка Writing / Speaking (без ИИ), честно помечается как примерная ===== */
const LINK=['however','moreover','furthermore','therefore','in addition','for example','for instance','on the other hand','as a result','consequently','although','whereas','in conclusion','firstly','secondly','nevertheless','while'];
const FILL=['um','uh','er','like','you know','i mean'];
AI.localWriting=function(text,minWords,exam){const words=(text.match(/[A-Za-z']+/g)||[]);const n=words.length;const sents=text.split(/[.!?]+\s/).filter(s=>s.trim().length>3);
 const uniq=new Set(words.map(w=>w.toLowerCase())).size;const ttr=n?uniq/n:0;const lw=text.toLowerCase();const links=LINK.filter(l=>lw.includes(l)).length;const paras=text.split(/\n\s*\n/).filter(x=>x.trim()).length;
 const avg=sents.length?n/sents.length:0;const long=words.filter(w=>w.length>=8).length/Math.max(n,1);
 const clamp=(x)=>Math.max(3,Math.min(8,Math.round(x*2)/2));
 const ta=clamp(3+Math.min(n/minWords,1.15)*3.2),cc=clamp(3.5+Math.min(links,6)*.45+(paras>=3?.8:0)),lr=clamp(3.5+ttr*3.4+long*6),gr=clamp(4+Math.min(avg,22)/8+(sents.length>=8?.8:0));
 const issues=[];if(n<minWords)issues.push({original:`(${n} слов)`,fix:`Нужно минимум ${minWords}`,why:'Недобор слов сильно снижает Task Achievement/Response.'});
 if(links<3)issues.push({original:'(мало связок)',fix:'Добавь However, Moreover, As a result…',why:'Связки повышают Coherence & Cohesion, но не злоупотребляй ими.'});
 if(paras<3)issues.push({original:'(структура)',fix:'Раздели на 4 абзаца',why:'Intro / Body 1 / Body 2 / Conclusion.'});
 const rep={};words.forEach(w=>{w=w.toLowerCase();if(w.length>4)rep[w]=(rep[w]||0)+1});Object.entries(rep).filter(([w,c])=>c>=5).slice(0,3).forEach(([w,c])=>issues.push({original:w+' ×'+c,fix:'Найди синонимы',why:'Повторы снижают Lexical Resource.'}));
 const overall=Math.round(((ta+cc+lr+gr)/4)*2)/2;
 return {local:true,overall,criteria:[{name:'Task Response',band:ta,comment:`Слов: ${n}${n<minWords?' — меньше нормы':''}.`},{name:'Coherence & Cohesion',band:cc,comment:`Связок: ${links}, абзацев: ${paras}.`},{name:'Lexical Resource',band:lr,comment:`Разнообразие лексики (TTR): ${ttr.toFixed(2)}.`},{name:'Grammatical Range & Accuracy',band:gr,comment:`Средняя длина предложения: ${avg.toFixed(1)} слов. Точность грамматики локально не проверяется.`}],errors:issues,improved:''}};
AI.localSpeaking=function(transcript,secs){const words=(transcript.match(/[A-Za-z']+/g)||[]);const n=words.length;const wpm=secs?Math.round(n/(secs/60)):0;const lw=' '+transcript.toLowerCase()+' ';const fill=FILL.reduce((a,f)=>a+(lw.split(' '+f+' ').length-1),0);const uniq=new Set(words.map(w=>w.toLowerCase())).size;
 const clamp=x=>Math.max(3,Math.min(8,Math.round(x*2)/2));
 const fc=clamp(3.5+Math.min(wpm,130)/35-fill*.15),lr=clamp(3.5+(n?uniq/n:0)*4),gr=clamp(4+Math.min(n,160)/50),pr=clamp(5);
 return {local:true,overall:Math.round(((fc+lr+gr+pr)/4)*2)/2,wpm,criteria:[{name:'Fluency & Coherence',band:fc,comment:`Темп ≈ ${wpm} слов/мин, слов-паразитов: ${fill}.`},{name:'Lexical Resource',band:lr,comment:'Оценка по разнообразию слов.'},{name:'Grammatical Range & Accuracy',band:gr,comment:'Локально точность грамматики не проверяется.'},{name:'Pronunciation',band:pr,comment:'Без ИИ и аудио-анализа произношение не оценивается — это нейтральное значение.'}],errors:fill?[{original:'um / uh / like',fix:'Делай паузу вместо паразитов',why:'Паузы звучат увереннее.'}]:[],improved:''}};
window.AI=AI;
})();
