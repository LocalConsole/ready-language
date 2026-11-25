(async function(){
 const {$}=App;
 try{
  App.applySettings();App.buildNav();
  $('#logo-m').innerHTML=Misha.svg('hello',App.outfit(),{still:1}).replace('<svg ','<svg width="34" height="34" ');
  $('#hdr-xp').textContent=App.Store.s.xp;
  $('#ai-ind').onclick=()=>{location.hash='#/settings'};
  await App.loadData();
  if(speechSynthesis&&speechSynthesis.onvoiceschanged!==undefined)speechSynthesis.onvoiceschanged=()=>{};
  addEventListener('hashchange',App.route);
  matchMedia('(prefers-color-scheme:dark)').addEventListener&&matchMedia('(prefers-color-scheme:dark)').addEventListener('change',App.applySettings);
  await App.route();AI.ping();
  addEventListener('online',()=>AI.ping());addEventListener('offline',()=>AI.ping());
  if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
 }catch(e){
  console.error(e);
  $('#view').innerHTML='<div class="card"><h2>Не удалось загрузить данные</h2><p>Если ты открыл index.html двойным кликом — запусти локальный сервер (<code>python -m http.server</code>) или открой опубликованный сайт: браузер не даёт читать JSON с file://.</p><pre class="small">'+App.esc(e.message)+'</pre></div>';
 }
})();
