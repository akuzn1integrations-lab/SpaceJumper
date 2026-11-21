'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let prefs={volume:35,music:15,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,touchsize:56,left:'KeyA',right:'KeyD',jump:'Space',...read('sj-settings',{})};
let best=Number(read('sj-best',0))||0,game=new SpaceJumper.Game(2026),state='menu',held={},jumpPending=false,last=0,acc=0,noticeUntil=0,audio,musicPlayer;
let lang='ru',platformPausedRun=false,runsSinceAd=0,saveTimer=0,adTransition=false;
function t(key,vars){return I18n.t(lang,key,vars);}
function syncSettingsUI(){
 for(const key of ['volume','music','touchsize','reduced']){const el=$(key);if(!el)continue;el[key==='reduced'?'checked':'value']=prefs[key];}
 for(const key of ['left','right','jump']){const el=$('bind'+key);if(el)el.value=prefs[key];}
 document.documentElement.style.setProperty('--touch',prefs.touchsize+'px');
}
function applyLang(next){
 lang=I18n.normalize(next);
 document.documentElement.lang=lang;
 I18n.apply(lang,document);
 canvas.setAttribute('aria-label',t('canvasLabel'));
}
function sound(kind){
 try{
  if(!audio&&state!=='playing')return;
  audio??=new AudioContext();
  if(audio.state==='suspended')audio.resume();
  musicPlayer??=new FlightMusic(audio);
  musicPlayer.setVolume(prefs.music/100);
  state==='playing'?musicPlayer.start():musicPlayer.stop();
  if(!kind)return;
  const o=audio.createOscillator(),g=audio.createGain();
  o.type=kind==='death'?'sawtooth':'sine';
  o.frequency.setValueAtTime({jump:320,land:160,pickup:740,death:90}[kind]||440,audio.currentTime);
  o.frequency.exponentialRampToValueAtTime(kind==='death'?35:600,audio.currentTime+.12);
  g.gain.setValueAtTime(prefs.volume/100*.12,audio.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);
  o.connect(g).connect(audio.destination);
  o.start();
  o.stop(audio.currentTime+.18);
 }catch{}
}
function overlay(title,text,buttons){
 $('overlay').hidden=false;
 $('card').innerHTML='<div class="orb">✦</div><p class="eyebrow">SPACEJUMPER / FLIGHT CONTROL</p><h2>'+title+'</h2><div class="overlay-copy">'+text+'</div>';
 for(const [label,fn,secondary] of buttons){
  const b=document.createElement('button');
  b.textContent=label;
  b.className=secondary?'secondary':'primary';
  b.onclick=fn;
  $('card').append(b);
 }
}
function menu(){
 state='menu';
 held={};
 platformPausedRun=false;
 Platform.gameplayStop();
 sound();
 overlay(t('menuTitle'),t('menuText'),[
  [t('startRun'),()=>beginRun()],
  [t('tutorial'),()=>start(true),true],
  [t('settingsButton'),openSettings,true]
 ]);
}
function start(tutorial=false){
 if(Platform.pausedByPlatform||document.hidden)return;
 game=new SpaceJumper.Game(Date.now(),tutorial);
 state='playing';
 held={};
 jumpPending=false;
 acc=0;
 platformPausedRun=false;
 $('overlay').hidden=true;
 $('notice').textContent='';
 canvas.focus();
 sound();
 Platform.gameplayStart();
 requestFullscreenOnce();
}
function pause(){
 if(state!=='playing')return;
 state='paused';
 held={};
 jumpPending=false;
 Platform.gameplayStop();
 sound();
 overlay(t('pauseTitle'),t('pauseText'),[
  [t('continueLabel'),resume],
  [t('restartLabel'),()=>beginRun(),true],
  [t('settingsButton'),openSettings,true],
  [t('menuLabel'),menu,true]
 ]);
}
function resume(){
 if(state!=='paused')return;
 state='playing';
 acc=0;
 $('overlay').hidden=true;
 canvas.focus();
 Platform.gameplayStart();
 sound();
}
function openSettings(){
 if(state==='playing')pause();
 if(!$('config').open)$('config').showModal();
}
function saveSettingsSoon(){
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{Platform.save({settings:prefs});},800);
}
function requestFullscreenOnce(){
 if(document.fullscreenElement)return;
 if(!matchMedia('(pointer:coarse)').matches)return;
 const request=document.documentElement.requestFullscreen;
 if(!request)return;
 request.call(document.documentElement).catch(()=>{});
}
function renderResult(){
 const results='<div class="results">'+
  '<span>'+t('resultScore')+'<strong>'+game.score+'</strong></span>'+
  '<span>'+t('resultRecord')+'<strong>'+best+'</strong></span>'+
  '<span>'+t('resultJumps')+'<strong>'+game.jumps+'</strong></span>'+
  '<span>'+t('resultStreak')+'<strong>'+game.maxCombo+'</strong></span>'+
  '<span>'+t('resultLevel')+'<strong>'+game.level+'</strong></span>'+
  '</div>';
 const buttons=[
  [t('againLabel'),beginRun],
  [t('menuLabel'),menu,true]
 ];
 if(Platform.available&&!Platform.isAuthorized())buttons.push([t('loginForLeaderboard'),loginForLeaderboard,true]);
 overlay(t('disconnected'),I18n.cause(lang,game.cause||'fall')+results,buttons);
}
function finish(){
 state='over';
 Platform.gameplayStop();
 const isRecord=!game.tutorial&&game.score>best;
 if(!game.tutorial)best=Math.max(best,game.score);
 if(!game.tutorial){
  runsSinceAd+=1;
  save('sj-best',best);
  save('sj-last-run',{seed:game.seed,version:SpaceJumper.C.version,inputs:game.inputs,score:game.score});
 }
 sound('death');
 renderResult();
 if(!game.tutorial){
  Platform.save({
   best,
   settings:prefs,
   lastRun:{
    seed:game.seed,
    version:SpaceJumper.C.version,
    score:game.score,
    jumps:game.jumps,
    level:game.level,
    maxCombo:game.maxCombo,
    cause:game.cause
   }
  });
  Platform.saveStats({best});
  if(isRecord)Platform.submitScore('spacejumper_best',best);
 }
}
async function beginRun(){
 if(adTransition)return;
 adTransition=true;
 try{
  // Ads are only requested between completed runs, never during gameplay.
  if(runsSinceAd>=2){
   runsSinceAd=0;
   Platform.gameplayStop();
   sound();
   await Platform.showFullscreenAd();
  }
  // An ad may have moved the page into the background.
  if(document.hidden)return;
  start();
 }finally{
  adTransition=false;
 }
}
async function loginForLeaderboard(){
 const ok=await Platform.auth();
 if(!ok){
  $('notice').textContent=t('leaderboardUnavailable');
  noticeUntil=game.time+2;
  return;
 }
 const sent=await Platform.submitScore('spacejumper_best',best);
 $('notice').textContent=sent?t('loggedIn'):t('leaderboardUnavailable');
 noticeUntil=game.time+2;
 if(state==='menu')menu();
 else if(state==='over')renderResult();
}
function action(code){
 if(code===prefs.left||code==='ArrowLeft')return'left';
 if(code===prefs.right||code==='ArrowRight')return'right';
 if(code===prefs.jump)return'jump';
}
window.addEventListener('keydown',e=>{
 if($('config').open)return;
 if(e.code==='Escape'){e.preventDefault();state==='playing'?pause():resume();return;}
 const a=action(e.code);
 if(a){e.preventDefault();if(a==='jump'&&!held.jump&&!e.repeat)jumpPending=true;held[a]=true;}
});
window.addEventListener('keyup',e=>{const a=action(e.code);if(a)held[a]=false;});
window.addEventListener('blur',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
const gameFrame=document.querySelector('.game-frame');
if(gameFrame){
 gameFrame.addEventListener('contextmenu',e=>e.preventDefault());
 gameFrame.addEventListener('selectstart',e=>e.preventDefault());
}
for(const b of document.querySelectorAll('[data-action]')){
 b.onpointerdown=e=>{
  e.preventDefault();
  b.setPointerCapture(e.pointerId);
  const a=b.dataset.action;
  if(a==='jump'&&!held.jump)jumpPending=true;
  held[a]=true;
 };
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{held[b.dataset.action]=false;};
}
$('pause').onclick=()=>state==='playing'?pause():resume();
$('settings').onclick=openSettings;
for(const key of ['volume','music','touchsize','reduced']){
 const el=$(key);
 el[key==='reduced'?'checked':'value']=prefs[key];
 el.oninput=()=>{
  prefs[key]=key==='reduced'?el.checked:Number(el.value);
  save('sj-settings',prefs);
  saveSettingsSoon();
  document.documentElement.style.setProperty('--touch',prefs.touchsize+'px');
  sound();
 };
}
for(const key of ['left','right','jump']){
 const el=$('bind'+key);
 el.value=prefs[key];
 el.onkeydown=e=>{
  e.preventDefault();
  e.stopPropagation();
  if(e.code==='Escape'||['left','right','jump'].some(k=>k!==key&&prefs[k]===e.code))return;
  prefs[key]=e.code;
  el.value=e.code;
  save('sj-settings',prefs);
  saveSettingsSoon();
 };
}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function line(x,y,xx,yy,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
function neonGlow(color,blur=12){ctx.shadowColor=color;ctx.shadowBlur=prefs.reduced?0:blur;}
function neonPlatform(q,time){
 if(SpaceSprites.platform(ctx,q,time,prefs.reduced))return;
 const palette={standard:'#57eaff',narrow:'#b79aff',crumble:'#ffac55',drift:'#69ddff',spikes:'#ff6e8e'};
 const c=palette[q.type]||palette.standard;
 ctx.save();
 neonGlow(c,9);
 ctx.fillStyle='#182b48';ctx.strokeStyle=c;ctx.lineWidth=2;
 ctx.beginPath();ctx.roundRect(q.x,q.y,q.w,19,5);ctx.fill();ctx.stroke();
 ctx.shadowBlur=0;
 rect(q.x+7,q.y+5,Math.max(0,q.w-14),3,'#6cecff');
 rect(q.x+8,q.y+12,Math.max(0,q.w-16),2,'#344d71');
 for(let x=q.x+15;x<q.x+q.w-12;x+=32)rect(x,q.y+16,14,3,'#ffab50');
 if(q.type==='drift'){
  ctx.fillStyle='#6beeff';ctx.font='bold 19px system-ui';ctx.textAlign='center';
  ctx.fillText('«  »',q.x+q.w/2,q.y+38);ctx.textAlign='left';
 }
 if(q.type==='crumble'){
  ctx.strokeStyle='#ffac55';ctx.lineWidth=3;neonGlow('#ff8a45',8);
  ctx.beginPath();ctx.moveTo(q.x+q.w*.32,q.y+3);ctx.lineTo(q.x+q.w*.43,q.y+12);ctx.lineTo(q.x+q.w*.55,q.y+6);ctx.stroke();
  if(q.crumble!==null)rect(q.x,q.y-5,Math.max(0,q.w*q.crumble/.7),3,'#ffac55');
 }
 if(q.type==='spikes'){
  neonGlow('#ff587c',10);ctx.fillStyle='#ff577a';ctx.strokeStyle='#ffd0d8';
  for(const [a,b] of [[q.x,q.x+(q.spikeLeft||0)],[q.x+q.w-(q.spikeRight||0),q.x+q.w]]){
   for(let x=a;x<b-7;x+=11){ctx.beginPath();ctx.moveTo(x,q.y);ctx.lineTo(x+5.5,q.y-15);ctx.lineTo(x+11,q.y);ctx.closePath();ctx.fill();ctx.stroke();}
  }
 }
 ctx.restore();
}
function neonAstronaut(p,time){
 if(SpaceSprites.astronaut(ctx,p,held,time,prefs.reduced))return;
 // Sprite rendering only; engine hitboxes, position and physics are untouched.
 const pose=ChibiAstronaut.stateOf(p,held,false);
 const frame=ChibiAstronaut.frame(pose,time,prefs.reduced);
 ctx.save();
 if(p.inv>0&&Math.floor(time*12)%2===0){ctx.restore();return;}
 const cx=p.x+13,cy=p.y+19;
 if(p.shield){
  const bob=prefs.reduced?0:Math.sin(time*3)*2;
  ctx.strokeStyle='#7ceaff';ctx.lineWidth=2;
  neonGlow('#63eaff',9);
  ctx.beginPath();
  ctx.moveTo(cx,cy-63+bob);ctx.lineTo(cx+10,cy-58+bob);
  ctx.lineTo(cx+9,cy-47+bob);ctx.lineTo(cx,cy-40+bob);
  ctx.lineTo(cx-9,cy-47+bob);ctx.lineTo(cx-10,cy-58+bob);
  ctx.closePath();ctx.stroke();
 }
 if((p.vy<0||p.flight>0)&&!prefs.reduced){
  ctx.fillStyle='#3bdfff';neonGlow('#24d5ff',17);
  ctx.beginPath();ctx.moveTo(cx-7,cy+24);ctx.lineTo(cx,cy+48+Math.sin(time*23)*5);ctx.lineTo(cx+7,cy+24);ctx.closePath();ctx.fill();
 }
 ctx.shadowBlur=0;
 // 60×60 pixel visual footprint; 96×96 pre-rendered sprite scales down.
 // Flip horizontally when moving left, without affecting collision coordinates.
 ctx.translate(cx,cy);
 if(held.left&&!held.right)ctx.scale(-1,1);
 if(frame)ctx.drawImage(frame,-30,-30,60,60);
 ctx.restore();
}
function draw(){
 const time=game.time,p=game.p;
 ctx.clearRect(0,0,540,960);
 SpaceBackdrop.draw(ctx,time,game.speed,prefs.reduced);
 for(const x of [16,524]){
  rect(x,0,2,960,'#314156');
  for(let y=-60;y<960;y+=120){
   const yy=y+(time*game.speed*.35)%120;
   rect(x-4,yy,10,38,'#263b51');
   rect(x-3,yy,2,15,'#627b8a');
  }
 }
 for(const q of game.platforms)neonPlatform(q,time);
 for(const item of game.items){
  if(SpaceSprites.pickup(ctx,item,time,prefs.reduced))continue;
  ctx.save();
  ctx.translate(item.x,item.y);
  if(!prefs.reduced)ctx.translate(0,Math.sin(time*3+item.x)*3);
  const colors={crystal:'#59edff',core:'#ffcf74',shield:'#89ceff',flight:'#d6a7ff',reserve:'#ffacb8'};
  neonGlow(colors[item.type],12);
  ctx.strokeStyle=colors[item.type];
  ctx.fillStyle=colors[item.type];
  ctx.lineWidth=2;
  if(item.type==='crystal'||item.type==='core'){
   ctx.beginPath();
   ctx.moveTo(0,-12);
   ctx.lineTo(9,0);
   ctx.lineTo(0,12);
   ctx.lineTo(-9,0);
   ctx.closePath();
   ctx.fillStyle=item.type==='crystal'?'#0c718c':'#ab6b30';ctx.fill();ctx.stroke();
   if(item.type==='core')rect(-3,-3,6,6,colors.core);
  }else{
   ctx.strokeRect(-13,-13,26,26);
   ctx.font='bold 19px system-ui';
   ctx.textAlign='center';
   ctx.fillText({shield:'S',flight:'↑',reserve:'+'}[item.type],0,7);
  }
  ctx.restore();
 }
 for(const l of game.lasers){
  if(l.age>=1.65)continue;
  if(SpaceSprites.isReady()){
   SpaceSprites.laser(ctx,l,time,prefs.reduced);
   if(l.age<1.2){ctx.fillStyle='#ffb289';ctx.font='13px system-ui';ctx.fillText(t('laserWarning'),l.x+10,l.y-12);}
   continue;
  }
  ctx.setLineDash(l.age<1.2?[8,8]:[]);
  ctx.save();neonGlow(l.age<1.2?'#ffad55':'#ff4064',16);
  line(l.x,l.y,l.x+l.w,l.y,l.age<1.2?'#e7aa76':'#ff5577',l.age<1.2?2:7);
  ctx.restore();
  ctx.setLineDash([]);
  ctx.fillStyle='#ffb289';
  ctx.font='13px system-ui';
  ctx.fillText(l.age<1.2?t('laserWarning'):'',l.x+10,l.y-12);
 }
 for(const m of game.mines){
  if(SpaceSprites.isReady()){
   SpaceSprites.mine(ctx,m,time,prefs.reduced);
   const phase=m.age%3,active=m.age>0&&phase>=1.2&&phase<1.55,warning=phase<1.2;
   if(warning||active){ctx.save();ctx.setLineDash(active?[]:[4,6]);for(const ray of SpaceJumper.mineRays(m))line(m.x,m.y,ray.x,ray.y,active?'#ff825e':'#bd7bd3',active?6:1.5);ctx.restore();}
   continue;
  }
  const phase=m.age%3,active=m.age>0&&phase>=1.2&&phase<1.55,warning=phase<1.2;
  ctx.save();neonGlow(active?'#ff587a':'#b578ff',14);
  ctx.fillStyle=active?'#fff0d2':'#c68bff';
  ctx.beginPath();
  ctx.arc(m.x,m.y,11,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#251732';
  ctx.font='bold 12px system-ui';
  ctx.textAlign='center';
  ctx.fillText(m.count,m.x,m.y+4);
  ctx.textAlign='left';
  if(warning||active){
   ctx.setLineDash(active?[]:[4,6]);
   for(const ray of SpaceJumper.mineRays(m))line(m.x,m.y,ray.x,ray.y,active?'#ff825e':'#bd7bd3',active?6:1.5);
   ctx.setLineDash([]);
  }
  ctx.restore();
 }
 neonAstronaut(p,time);
 const haze=ctx.createLinearGradient(0,850,0,960);
 haze.addColorStop(0,'#ff754f00');
 haze.addColorStop(1,'#ff754f66');
 ctx.fillStyle=haze;
 ctx.fillRect(0,850,540,110);
 line(0,900,540,900,'#ff8b66',2);
 for(let x=0;x<540;x+=24)line(x,960,x+28,910,'#e48a6433',8);
 ctx.fillStyle='#ffad87';
 ctx.font='10px system-ui';
 ctx.textAlign='center';
 ctx.fillText(t('destructionZone'),270,930);
 ctx.textAlign='left';
 $('score').textContent=String(game.score).padStart(5,'0');
 $('best').textContent=String(best).padStart(5,'0');
 $('level').textContent=String(game.level).padStart(2,'0');
 $('combo').textContent='×'+Math.min(1+Math.floor(game.combo/5),4);
 $('jumps').textContent=game.jumps;
 $('streak').textContent=game.maxCombo;
 $('time').textContent=String(Math.floor(time/60)).padStart(2,'0')+':'+String(Math.floor(time%60)).padStart(2,'0');
 $('effects').textContent=[
  p.shield?t('shieldEffect'):'',
  p.reserve?t('reserveEffect'):'',
  p.flight>0?t('flightEffect',{time:p.flight.toFixed(1)}):''
 ].filter(Boolean).join(' · ');
 if(game.tutorial&&state==='playing'){
  $('notice').textContent=game.jumps<1?t('tutorialMove'):game.jumps<2?t('tutorialLand'):t('tutorialCollect');
 }else if(time>noticeUntil){
  $('notice').textContent='';
 }
}
function showGameNotice(event){
 const node=$('notice');
 const message=I18n.notice(lang,event);
 node.replaceChildren();
 node.classList.toggle('level-up',event?.key==='levelUp');
 if(event?.key==='levelUp'){
  // Two separately sized lines prevent long localized text from overflowing.
  const title=document.createElement('span');
  title.className='level-up-title';
  title.textContent=lang==='ru'?'УРОВЕНЬ '+event.level:'LEVEL '+event.level;
  const subtitle=document.createElement('span');
  subtitle.className='level-up-subtitle';
  subtitle.textContent=lang==='ru'?'НОВЫЙ СЕКТОР':'NEW SECTOR';
  node.append(title,subtitle);
 }else{
  node.textContent=message;
 }
}
function frame(now){
 const elapsed=Math.min((now-last)/1000,.1);
 last=now;
 if(state==='playing'){
  acc+=elapsed;
  while(acc>=SpaceJumper.C.step&&state==='playing'){
   game.step({left:!!held.left,right:!!held.right,hold:!!held.jump,jump:jumpPending});
   jumpPending=false;
   acc-=SpaceJumper.C.step;
   for(const e of game.events){
    if(['jump','land','pickup'].includes(e.type))sound(e.type);
    if(e.type==='notice'){
     showGameNotice(e.text);
     noticeUntil=game.time+2;
    }
   }
   game.events=[];
   if(game.dead)finish();
   else if(game.complete){
    Platform.gameplayStop();
    start(false);
    $('notice').textContent=t('tutorialDone');
    noticeUntil=3;
   }
  }
 }
 if(musicPlayer)musicPlayer.level=game.level;
 draw();
 requestAnimationFrame(frame);
}
Platform.onPause(()=>{
 if(state==='playing'){
  platformPausedRun=true;
  pause();
 }
});
Platform.onResume(()=>{
 if(platformPausedRun&&state==='paused'){
  platformPausedRun=false;
  if(!document.hidden)resume();
 }
});
applyLang(Platform.lang());
syncSettingsUI();
menu();
requestAnimationFrame(frame);
Platform.init().then(async()=>{
 Platform.ready();
 const cloud=await Platform.load(['best','settings']);
 if(cloud?.best>best){
  best=cloud.best;
  $('best').textContent=String(best).padStart(5,'0');
 }
 if(cloud?.settings){
  prefs={...prefs,...cloud.settings};
  save('sj-settings',prefs);
  syncSettingsUI();
  applyLang(Platform.lang());
  if(state==='menu')menu();
 }
 if(Platform.lang()!==lang){
  applyLang(Platform.lang());
  if(state==='menu')menu();
 }
});
