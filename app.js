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
  [t('startRun'),()=>start()],
  [t('tutorial'),()=>start(true),true],
  [t('settingsButton'),openSettings,true]
 ]);
}
function start(tutorial=false){
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
  [t('restartLabel'),()=>start(),true],
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
  [t('againLabel'),again],
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
async function again(){
 if(adTransition)return;
 adTransition=true;
 runsSinceAd+=1;
 if(runsSinceAd>=2){
  runsSinceAd=0;
  await Platform.showFullscreenAd();
 }
 adTransition=false;
 start();
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
function draw(){
 const time=game.time,p=game.p;
 ctx.clearRect(0,0,540,960);
 const bg=ctx.createLinearGradient(0,0,540,960);
 bg.addColorStop(0,'#111e32');
 bg.addColorStop(1,'#09111e');
 ctx.fillStyle=bg;
 ctx.fillRect(0,0,540,960);
 for(let i=0;i<65;i++){
  const x=(i*137+43)%540,y=(i*197+(prefs.reduced?0:time*6))%960;
  rect(x,y,i%4===0?2:1,2,i%4===0?'#62758d':'#293d55');
 }
 for(const x of [16,524]){
  rect(x,0,2,960,'#314156');
  for(let y=-60;y<960;y+=120){
   const yy=y+(time*game.speed*.35)%120;
   rect(x-4,yy,10,38,'#263b51');
   rect(x-3,yy,2,15,'#627b8a');
  }
 }
 ctx.strokeStyle='#26364c';
 ctx.lineWidth=1;
 ctx.beginPath();
 ctx.arc(405,185,100,0,Math.PI*2);
 ctx.stroke();
 ctx.fillStyle='#16273b';
 ctx.beginPath();
 ctx.arc(405,185,85,0,Math.PI*2);
 ctx.fill();
 for(const q of game.platforms){
  const color={standard:'#8ae6ee',narrow:'#b4a0ff',crumble:'#eac37b',drift:'#84b6ff',spikes:'#ff9979'}[q.type];
  rect(q.x,q.y,q.w,15,'#293e50');
  rect(q.x,q.y,q.w,4,color);
  rect(q.x+6,q.y+7,q.w-12,2,'#456271');
  for(let x=q.x+10;x<q.x+q.w;x+=24)rect(x,q.y+15,8,4,'#192b3c');
  if(q.type==='crumble'){
   line(q.x+q.w*.4,q.y,q.x+q.w*.5,q.y+9,'#0c1628',3);
   line(q.x+q.w*.5,q.y+9,q.x+q.w*.6,q.y+3,'#0c1628',3);
   if(q.crumble!==null)rect(q.x,q.y-5,q.w*q.crumble/.7,2,'#ff8c70');
  }
  if(q.type==='drift'){
   ctx.fillStyle=color;
   ctx.font='14px system-ui';
   ctx.fillText('↔',q.x+q.w/2-7,q.y+30);
  }
  if(q.type==='spikes'){
   ctx.fillStyle=color;
   for(const [start,end] of [[q.x,q.x+(q.spikeLeft||0)],[q.x+q.w-(q.spikeRight||0),q.x+q.w]])for(let x=start;x<end-6;x+=10){
    ctx.beginPath();
    ctx.moveTo(x,q.y);
    ctx.lineTo(x+5,q.y-12);
    ctx.lineTo(x+10,q.y);
    ctx.fill();
   }
  }
 }
 for(const item of game.items){
  ctx.save();
  ctx.translate(item.x,item.y);
  if(!prefs.reduced)ctx.translate(0,Math.sin(time*3+item.x)*3);
  const colors={crystal:'#bcf782',core:'#ffcf74',shield:'#89ceff',flight:'#d6a7ff',reserve:'#ffacb8'};
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
   ctx.stroke();
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
  ctx.setLineDash(l.age<1.2?[8,8]:[]);
  line(l.x,l.y,l.x+l.w,l.y,l.age<1.2?'#e7aa76':'#ff754f',l.age<1.2?2:7);
  ctx.setLineDash([]);
  ctx.fillStyle='#ffb289';
  ctx.font='13px system-ui';
  ctx.fillText(l.age<1.2?t('laserWarning'):'',l.x+10,l.y-12);
 }
 for(const m of game.mines){
  const phase=m.age%3,active=m.age>0&&phase>=1.2&&phase<1.55,warning=phase<1.2;
  ctx.fillStyle=active?'#fff0d2':'#e28cff';
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
 }
 ctx.save();
 ctx.translate(p.x,p.y);
 if(p.inv<=0||Math.floor(time*12)%2){
  if(p.shield){
   ctx.strokeStyle='#89ceff';
   ctx.lineWidth=2;
   ctx.beginPath();
   ctx.ellipse(14,20,27,33,0,0,Math.PI*2);
   ctx.stroke();
  }
  if(p.vy<0||p.flight>0){
   ctx.fillStyle='#bdf782';
   ctx.beginPath();
   ctx.moveTo(3,36);
   ctx.lineTo(8,55);
   ctx.lineTo(13,36);
   ctx.fill();
  }
  rect(-4,17,7,17,'#617287');
  rect(3,13,22,22,'#e0e5df');
  rect(2,0,24,21,'#edf1e9');
  rect(6,5,20,11,'#253e51');
  rect(8,6,14,3,'#9bd9df');
  rect(4,34,8,6,'#9dacbb');
  rect(18,34,8,6,'#9dacbb');
  rect(25,20,4,12,'#c1cece');
  rect(9,24,10,4,'#bcf782');
 }
 ctx.restore();
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
     $('notice').textContent=e.key?I18n.notice(lang,e):e.text;
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
  resume();
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
