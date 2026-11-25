/* Миша — оригинальный русский медведь. Рисуется в SVG, 8 состояний + одежда за достижения. */
(function(){
const STATES=['hello','think','happy','sad','cheer','board','celebrate','explain'];
function eyes(s){
  const L=84,R=116,y=74;
  if(s==='happy'||s==='celebrate') return `<path d="M${L-6} ${y+2}q6-9 12 0M${R-6} ${y+2}q6-9 12 0" stroke="#2b1a0e" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  if(s==='sad') return `<g class="m-blink"><circle cx="${L}" cy="${y+2}" r="4.5" fill="#2b1a0e"/><circle cx="${R}" cy="${y+2}" r="4.5" fill="#2b1a0e"/></g><path d="M${L-8} ${y-12}l12 5M${R+8} ${y-12}l-12 5" stroke="#2b1a0e" stroke-width="3" stroke-linecap="round"/><path d="M${L+5} ${y+8}q-2 9 0 13" stroke="#5ab4e6" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const dx=s==='think'?3:0, dy=s==='think'?-3:0;
  return `<g class="m-blink"><circle cx="${L+dx}" cy="${y+dy}" r="4.8" fill="#2b1a0e"/><circle cx="${R+dx}" cy="${y+dy}" r="4.8" fill="#2b1a0e"/><circle cx="${L+dx+1.5}" cy="${y+dy-1.5}" r="1.5" fill="#fff"/><circle cx="${R+dx+1.5}" cy="${y+dy-1.5}" r="1.5" fill="#fff"/></g>`
   +(s==='explain'?`<path d="M${L-9} ${y-13}l13 -3M${R+9} ${y-13}l-13 -3" stroke="#2b1a0e" stroke-width="3" stroke-linecap="round"/>`:'');
}
function mouth(s){
  const m='stroke="#2b1a0e" stroke-width="3" fill="none" stroke-linecap="round"';
  switch(s){
    case 'happy':case 'celebrate':return `<path d="M88 100q12 14 24 0z" fill="#b5413a" stroke="#2b1a0e" stroke-width="3" stroke-linejoin="round"/>`;
    case 'sad':return `<path d="M91 106q9-9 18 0" ${m}/>`;
    case 'think':return `<path d="M93 103h12" ${m}/>`;
    case 'explain':return `<ellipse cx="100" cy="103" rx="6" ry="5" fill="#b5413a" stroke="#2b1a0e" stroke-width="2.5"/>`;
    default:return `<path d="M90 100q10 9 20 0" ${m}/>`;
  }
}
function arms(s){
  const c='#8b5a2b';
  const arm=(x,y,rot,cls='')=>`<g style="transform:rotate(${rot}deg);transform-origin:${x}px ${y}px"><g class="${cls}" style="transform-origin:${x}px ${y}px;transform-box:view-box"><ellipse cx="${x}" cy="${y+16}" rx="11" ry="22" fill="${c}"/><circle cx="${x}" cy="${y+36}" r="9" fill="#9a6432"/></g></g>`;
  switch(s){
    case 'hello':return arm(46,118,24)+arm(154,118,-150,'m-wave');
    case 'celebrate':return arm(46,118,150,'m-jump')+arm(154,118,-150,'m-jump');
    case 'cheer':return arm(46,118,22)+`<g style="transform:rotate(-140deg);transform-origin:154px 118px"><ellipse cx="154" cy="134" rx="11" ry="22" fill="${c}"/><circle cx="154" cy="154" r="10" fill="#9a6432"/><rect x="159" y="145" width="7" height="14" rx="3.5" fill="#9a6432"/></g>`;
    case 'board':return arm(46,118,22)+`<g><rect x="118" y="130" width="76" height="52" rx="5" fill="#2f5d50" stroke="#c89b5a" stroke-width="4"/><path d="M128 146h40M128 158h52M128 170h30" stroke="#f3efe6" stroke-width="2.5" stroke-linecap="round" opacity=".9"/></g><g style="transform:rotate(-70deg);transform-origin:154px 118px"><ellipse cx="154" cy="134" rx="11" ry="22" fill="${c}"/></g><path d="M158 100L132 140" stroke="#c89b5a" stroke-width="4" stroke-linecap="round"/>`;
    case 'think':return arm(46,118,22)+`<path d="M148 128Q150 110 124 107" stroke="#8b5a2b" stroke-width="20" stroke-linecap="round" fill="none"/><circle cx="121" cy="107" r="9" fill="#9a6432"/>`;
    case 'explain':return arm(46,118,60)+arm(154,118,-60);
    default:return arm(46,118,22)+arm(154,118,-22);
  }
}
function outfit(o){
  o=o||{};
  const scarf=['#c0392b','#2a7f8e','#e0a526'][o.scarf||0];
  const scarf2=['#8f2a1f','#1d5963','#a87a14'][o.scarf||0];
  const hat=['#6b7280','#c89b2c','#3a4a6b'][o.hat||0];
  const hat2=['#8a909c','#e6c25a','#546a96'][o.hat||0];
  return {scarf,scarf2,hat,hat2,samovar:!!o.samovar};
}
function svg(state,o,opt){
  state=STATES.includes(state)?state:'hello';
  const c=outfit(o);
  const bob=(state==='celebrate'||state==='sad'||opt&&opt.still)?'':'m-bob';
  const shake=state==='sad'?'m-shake':'';
  const extra=state==='think'?`<g class="m-think"><circle cx="150" cy="30" r="5" fill="#bbb"/><circle cx="162" cy="16" r="8" fill="#ccc"/><text x="152" y="8" font-size="16" fill="#777">?</text></g>`:
    state==='celebrate'?`<g class="m-jump"><circle cx="30" cy="40" r="4" fill="#e0a526"/><circle cx="172" cy="46" r="4" fill="#c0392b"/><rect x="20" y="70" width="7" height="7" fill="#2a7f8e" transform="rotate(30 23 73)"/><rect x="176" y="80" width="7" height="7" fill="#3c9d5d" transform="rotate(-20 179 83)"/><path d="M100 4l3 8 8 1-6 6 2 9-7-5-7 5 2-9-6-6 8-1z" fill="#e0a526"/></g>`:'';
  const sam=c.samovar?`<g transform="translate(-6 14)"><path d="M10 168q-2-22 15-22t15 22v14H10z" fill="#d9a233" stroke="#8a5a06" stroke-width="2"/><rect x="12" y="140" width="26" height="8" rx="3" fill="#b9821f"/><circle cx="25" cy="136" r="4" fill="#8a5a06"/><path class="m-steam" d="M22 128q-4-8 0-14M28 128q4-8 0-14" stroke="#bbb" stroke-width="2" fill="none"/></g>`:'';
  return `<svg viewBox="0 0 200 220" role="img" aria-label="Миша: ${state}"><g class="${bob} ${shake}">
  <ellipse cx="100" cy="212" rx="46" ry="6" fill="rgba(0,0,0,.12)"/>
  <ellipse cx="76" cy="196" rx="20" ry="14" fill="#8b5a2b"/><ellipse cx="124" cy="196" rx="20" ry="14" fill="#8b5a2b"/>
  <ellipse cx="100" cy="150" rx="52" ry="55" fill="#8b5a2b"/><ellipse cx="100" cy="160" rx="32" ry="36" fill="#d9a86c"/>
  ${arms(state)}
  <circle cx="64" cy="48" r="13" fill="#8b5a2b"/><circle cx="136" cy="48" r="13" fill="#8b5a2b"/><circle cx="64" cy="48" r="6" fill="#d9a86c"/><circle cx="136" cy="48" r="6" fill="#d9a86c"/>
  <circle cx="100" cy="82" r="43" fill="#9a6432"/>
  <path d="M52 68q-6 36 8 50" fill="none"/>
  <ellipse cx="100" cy="95" rx="20" ry="15" fill="#ecd0a4"/><ellipse cx="100" cy="88" rx="7" ry="5" fill="#2b1a0e"/>
  <path d="M100 93v4" stroke="#2b1a0e" stroke-width="2.5"/>
  ${mouth(state)}
  ${eyes(state)}
  <g fill="none" stroke="#2b3139" stroke-width="3"><circle cx="84" cy="74" r="12.5"/><circle cx="116" cy="74" r="12.5"/><path d="M96.5 74h7M71.5 72l-8-3M128.5 72l8-3"/></g>
  <circle cx="84" cy="74" r="12" fill="rgba(180,220,240,.25)"/><circle cx="116" cy="74" r="12" fill="rgba(180,220,240,.25)"/>
  <path d="M60 112q40 18 80 0l2 14q-42 20-84 0z" fill="${c.scarf}"/><path d="M70 120l4 12M90 126l2 14M110 126l-2 14M130 120l-4 12" stroke="${c.scarf2}" stroke-width="3"/>
  <path d="M128 124l14 36q4 8-6 10l-8-2-4-38z" fill="${c.scarf}"/><path d="M130 146l12-2M132 154l12-2" stroke="${c.scarf2}" stroke-width="3"/>
  <path d="M54 56q-4-34 46-34t46 34q-12-12-46-12T54 56z" fill="${c.hat}"/>
  <path d="M56 54q44-14 88 0l-2 10q-42-10-84 0z" fill="${c.hat2}"/>
  <path d="M58 58q-10 4-12 28q2 14 12 16 6-16 2-42z" fill="${c.hat}"/><path d="M142 58q10 4 12 28q-2 14-12 16-6-16-2-42z" fill="${c.hat}"/>
  <path d="M100 30l3.6 7.4 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z" fill="#d6402f" stroke="#f3c9a0" stroke-width="1"/>
  ${sam}${extra}</g></svg>`;
}
window.Misha={STATES,svg,
  mount(el,state,o,opt){el.innerHTML=svg(state,o,opt)},
  html(state,o,opt){return `<div class="misha">${svg(state,o,opt)}</div>`}};
})();
