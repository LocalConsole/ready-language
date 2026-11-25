/* Узбекский язык: словарь data/uz.json + перевод DOM «на лету» + перевод данных при загрузке.
   Русский остаётся языком кода; пока lang='ru' этот файл ничего не делает. */
(function(){
const CY=/[А-Яа-яЁё]/,LET='А-Яа-яЁё';
const U=App.UZ={on:false,ui:null,data:null,words:null,re:null,map:null,pat:[]};
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// шаблонные фразы с подстановками: [regex, функция/строка]
U.pat=[
 [/^([\d.,]+) ч$/,'$1 soat'],
 [/^Слово (\d+) из (\d+)$/,'$1 / $2 so\'z'],
 [/^Новое слово (\d+) из (\d+)$/,'Yangi so\'z $1 / $2'],
 [/^Вопрос (\d+) из (\d+)$/,'Savol $1 / $2'],
 [/^Что означает слово «(.+)»\?$/,'«$1» so\'zi nimani anglatadi?'],
 [/^Как по-английски: «(.+)»\?$/,'Inglizchada qanday: «$1»?'],
 [/^Составь предложение со словом «(.+)»\.?$/,'«$1» so\'zi bilan gap tuz.'],
 [/^«(.+)» — это перевод слова «(.+)»\.?$/,'«$1» — bu «$2» so\'zining tarjimasi.'],
];
function tr(s){
 if(!s||!CY.test(s))return s;
 const m=s.match(/^(\s*)([\s\S]*?)(\s*)$/),core=m[2];
 let r=U.map.get(core);
 if(r==null){
  for(const [re,rep] of U.pat){if(re.test(core)){r=core.replace(re,rep);break}}
  if(r==null)r=U.re?core.replace(U.re,x=>U.map.get(x)||x):core;
 }
 return m[1]+r+m[3];
}
U.tr=tr;
function build(){
 const ui=U.ui;U.map=new Map();const keys=[];
 for(const k in ui){const kk=k.trim();U.map.set(kk,ui[k]);
  // подстрочная замена: длинные фразы и явные короткие фрагменты (счётчики «1 из 5»)
  if(kk.length>=6||['из','мин','слов','стр.','дн.','Слово','Ответ','Опыт','Миша','Урок:','цель','Понял','Назад','Дальше','Ответ','прил.','гл.','сущ.','Слов:','легче','Шарф','ИИ','серия'].includes(kk))keys.push(kk)}
 keys.sort((a,b)=>b.length-a.length);
 const part=k=>{const a=CY.test(k[0])?`(?<![${LET}])`:'',z=CY.test(k[k.length-1])?`(?![${LET}])`:'';return a+esc(k)+z};
 U.re=keys.length?new RegExp(keys.map(part).join('|'),'g'):null;
}
function walkData(o){
 if(Array.isArray(o)){for(let i=0;i<o.length;i++){const v=o[i];if(typeof v==='string'){if(CY.test(v)&&U.data[v])o[i]=U.data[v]}else if(v&&typeof v==='object')walkData(v)}}
 else if(o&&typeof o==='object'){for(const k in o){const v=o[k];if(typeof v==='string'){if(CY.test(v)&&U.data[v])o[k]=U.data[v]}else if(v&&typeof v==='object')walkData(v)}}
}
App.uzInit=async function(){
 if(I18N.lang!=='uz')return;
 try{const r=await fetch('data/uz.json');const j=await r.json();U.ui=j.ui;U.data=j.data;U.words=j.words;U.on=true;build()}catch(e){console.warn('uz.json',e)}
 if(!U.on)return;
 document.documentElement.lang='uz';
 const ttl=tr(document.title);document.title=ttl;
 ['alert','confirm','prompt'].forEach(n=>{const o=window[n];window[n]=function(m,...a){return o.call(window,tr(String(m)),...a)}});
 start();
};
App.uzData=function(D){
 if(!U.on)return;
 D.words.forEach(w=>{if(U.words[w.id])w.tr=U.words[w.id]});
 ['questions','lessons','sources'].forEach(n=>walkData(D[n]));
};
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','CODE']);
const ATTR=['placeholder','title','aria-label','alt'];
function doNode(n){
 if(n.nodeType===3){const p=n.parentNode;if(p&&SKIP.has(p.nodeName))return;const v=n.nodeValue;if(CY.test(v)){const t=tr(v);if(t!==v)n.nodeValue=t}return}
 if(n.nodeType!==1||n.nodeName==='SCRIPT'||n.nodeName==='STYLE')return;
 for(const a of ATTR){if(n.hasAttribute&&n.hasAttribute(a)){const v=n.getAttribute(a);if(CY.test(v)){const t=tr(v);if(t!==v)n.setAttribute(a,t)}}}
 if(n.nodeName==='INPUT'&&/^(button|submit)$/.test(n.type)&&CY.test(n.value))n.value=tr(n.value);
 if(n.nodeName==='TEXTAREA'||n.nodeName==='CODE')return;
 for(let c=n.firstChild;c;c=c.nextSibling)doNode(c);
}
let q=new Set(),sch=false;
function flush(){sch=false;const l=[...q];q=new Set();for(const n of l){if(n.isConnected||n.nodeType===3)doNode(n)}}
function start(){
 doNode(document.body);
 new MutationObserver(ms=>{for(const m of ms){
   if(m.type==='childList')m.addedNodes.forEach(n=>q.add(n));
   else if(m.type==='characterData')q.add(m.target);
   else if(m.type==='attributes')q.add(m.target)}
  if(!sch){sch=true;queueMicrotask(flush)}})
 .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});
}
})();
