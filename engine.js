/* SpaceJumper deterministic fixed-step simulation. No browser dependencies. */
(function(root){
'use strict';
const C={width:540,height:960,gravity:1800,jump:780,speed:260,accel:2200,brake:2600,step:1/60,speeds:[45,55,65,78,92,105,118,130],bonusSize:26,mineLevel:10,version:'1.2.0'};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function contact(p,old,q){
 if(p.vy<0)return null;
 const a=old.y+40-q.oy,b=p.y+40-q.y;
 if(a>0.01||b<0||b-a<=0)return null;
 const t=clamp(-a/(b-a),0,1),x=old.x+(p.x-old.x)*t,qx=q.ox+(q.x-q.ox)*t;
 return x+28>qx&&x<qx+q.w?{q,t,x,qx}:null;
}
// Simulate a center-to-center jump with acceleration and braking. Check the
// slowest and fastest flow so pending speed changes cannot invalidate a row.
function reachable(from,to,gap,speed){
 let x=from,vx=0,y=0,vy=-C.jump,t=0;
 for(let i=0;i<90;i++){
  const oldY=y,oldT=t,delta=to-x;
  const desired=Math.sign(delta)*Math.min(C.speed,Math.sqrt(2*C.brake*Math.abs(delta)));
  vx+=clamp(desired-vx,-C.accel*C.step,C.accel*C.step);
  x+=vx*C.step;vy+=C.gravity*C.step;y+=vy*C.step;t+=C.step;
  if(vy>=0&&oldY<=-gap+speed*oldT&&y>=-gap+speed*t)return Math.abs(x-to)<=12;
 }
 return false;
}
function safeSpan(q){return {x:q.x+(q.spikeLeft||0),w:q.w-(q.spikeLeft||0)-(q.spikeRight||0)};}
function laserLength(level){return 160+200*clamp((level-6)/10,0,1);}
function mineDirections(level){return [1,2,4,6,8][clamp(Math.floor((level-C.mineLevel)/2),0,4)];}
function mineRays(m){return Array.from({length:m.count},(_,i)=>{const a=m.angle+i*2*Math.PI/m.count;return {x:m.x+Math.cos(a)*m.range,y:m.y+Math.sin(a)*m.range};});}
function beamHits(x,y,xx,yy,p){
 let near=0,far=1;
 for(const [start,delta,min,max] of [[x,xx-x,p.x-4,p.x+32],[y,yy-y,p.y-4,p.y+44]]){
  if(Math.abs(delta)<1e-8){if(start<min||start>max)return false;continue;}
  const a=(min-start)/delta,b=(max-start)/delta;
  near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return false;
 }
 return true;
}
class Game{
 constructor(seed=Date.now(),tutorial=false){this.seed=seed>>>0;this.rng=this.seed;this.tutorial=tutorial;this.time=0;this.tick=0;this.score=0;this.jumps=0;this.combo=0;this.maxCombo=0;this.level=1;this.speed=tutorial?0:45;this.target=this.speed;this.platforms=[];this.items=[];this.lasers=[];this.mines=[];this.id=0;this.rows=0;this.reserves=0;this.flightEnd=-100;this.dead=false;this.events=[];this.inputs=[];this.lastInput='';this.p={x:256,y:740,vx:0,vy:0,ground:null,coyote:0,buffer:0,shield:false,reserve:false,flight:0,inv:0,manual:false};this.fill();}
 random(){let t=this.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
 emit(type,text){this.events.push({type,text});}
 platform(x,y,w=160,type='standard',route=false){const q={id:++this.id,x,y,ox:x,oy:y,base:x,w,type,route,phase:this.random()*6.28,age:0,crumble:null,visited:false};if(type==='spikes'){const mode=Math.floor(this.random()*3),spikes=w-80;q.spikeLeft=mode===0?spikes:mode===2?spikes/2:0;q.spikeRight=mode===1?spikes:mode===2?spikes/2:0;}this.platforms.push(q);return q;}
 fill(startY=780){this.platforms=[];this.items=[];this.lasers=[];this.mines=[];const q=this.platform(170,startY,200,'standard',true);q.visited=true;this.p.ground=q;for(let y=startY-100;y>-110;y-=100)this.row(y);}
 row(y){
 this.rows++;const lv=Math.min(this.level,8),w=[180,160,145,130,120,110,100,100][lv-1];
 const centered=this.tutorial||lv===1;
 const previous=this.platforms.filter(q=>q.route).sort((a,b)=>a.y-b.y)[0];
 const from=previous?previous.x+previous.w/2:270;
 let center=270;
 if(!centered){
  center=from;
  for(let attempt=0;attempt<60;attempt++){
   const candidate=w/2+this.random()*(C.width-w);
   if(Math.abs(candidate-from)<60)continue;
   if(reachable(from,candidate,100,45)&&reachable(from,candidate,100,130)){center=candidate;break;}
  }
  // A bounded sideways step is also reachable if rejection sampling runs out.
  if(center===from)center=from+(from<270?100:-100);
 }
 const route=this.platform(center-w/2,y,w,'standard',true);
 if(!this.tutorial){
  const types=['standard'];if(lv>=2)types.push('narrow');if(lv>=3)types.push('crumble');if(lv>=4)types.push('drift');if(lv>=5)types.push('spikes');
  const type=types[this.rows%types.length],width=type==='narrow'?80:120;
  const margin=type==='drift'?20:0;
  // Secondary platforms share a row, with a bonus-sized clear gap even at
  // maximum drift. Consecutive rows have 100 units of vertical separation.
  const intervals=[[margin,route.x-C.bonusSize-width-margin],[route.x+route.w+C.bonusSize+margin,C.width-width-margin]].filter(([a,b])=>b>=a);
  if(intervals.length){const interval=intervals[Math.floor(this.random()*intervals.length)];
   const x=interval[0]+this.random()*(interval[1]-interval[0]);
   const q=this.platform(x,y,width,type);
   if(this.rows%4===0)this.items.push({x:q.x+width/2,y:y-30,type:this.rows%12===0?'core':'crystal',q,offset:30});
  }
  if(this.rows%15===0){const choices=['shield','flight','reserve'];let type=choices[Math.floor(this.random()*3)];if(type==='flight'&&(this.p.flight>0||this.time-this.flightEnd<12))type='shield';if(type==='reserve'&&this.reserves>=2)type='shield';if(type==='reserve')this.reserves++;this.items.push({x:center,y:y-30,type,q:route,offset:30});}
  if(this.level>=6&&this.rows%7===0){
   const span=laserLength(this.level),leftSide=this.random()<.5;
   this.lasers.push({x:leftSide?0:C.width-span,w:span,y:y-70,age:0});
  }
  if(this.level>=C.mineLevel&&this.rows%11===0){
   this.mines.push({x:100+this.random()*340,y:y-50,age:0,count:mineDirections(this.level),angle:Math.floor(this.random()*8)*Math.PI/4,range:90});
  }
 }
 if(this.rows%4===1)this.items.push({x:center,y:y-30,type:'crystal',q:route,offset:30});
 }

 jump(){const p=this.p;if(p.flight||(!p.ground&&p.coyote<=0))return false;p.ground=null;p.coyote=0;p.buffer=0;p.vy=-C.jump;p.manual=true;this.jumps++;this.score+=10;const level=1+Math.floor(this.jumps/15);if(level!==this.level){this.level=level;this.emit('notice','УРОВЕНЬ '+level+' · Новый сектор');}this.emit('jump');return true;}
 damage(cause){const p=this.p;if(cause!=='Пропущена платформа'&&p.inv>0)return false;if(cause!=='Пропущена платформа'&&p.shield){p.shield=false;p.inv=1.2;p.manual=false;this.combo=0;this.emit('notice','Щит поглотил удар');return false;}if(p.reserve){p.reserve=false;p.flight=0;p.inv=2;p.x=256;p.y=500;p.vx=p.vy=0;p.coyote=p.buffer=0;p.manual=false;this.combo=0;this.fill(540);this.rescue=.35;this.emit('notice','Резервный модуль · спасение');return true;}if(this.tutorial){this.p.x=256;this.p.y=740;this.p.vx=this.p.vy=0;this.fill();return true;}this.dead=true;this.cause=cause;this.emit('death',cause);return true;}
 pickup(item){const p=this.p;switch(item.type){case'crystal':this.score+=25;break;case'core':this.score+=100;break;case'shield':if(p.shield)this.score+=25;else p.shield=true;break;case'reserve':if(p.reserve)this.score+=100;else p.reserve=true;break;case'flight':p.flight=4;p.ground=null;p.coyote=0;p.buffer=0;p.manual=false;p.vy=0;this.combo=0;break;}this.emit('pickup',item.type);}
 step(input={},dt=C.step){
 if(this.dead)return;this.tick++;const inputKey=JSON.stringify(input);if(inputKey!==this.lastInput){this.inputs.push([this.tick,{...input}]);this.lastInput=inputKey;}
 if(this.rescue>0){this.rescue-=dt;return;}this.time+=dt;const p=this.p;
 p.inv=Math.max(0,p.inv-dt);p.buffer=Math.max(0,p.buffer-dt);p.coyote=Math.max(0,p.coyote-dt);if(input.jump)p.buffer=.12;
 if(this.tutorial&&this.jumps>=2)this.target=25;
 this.speed+=clamp(this.target-this.speed,-42.5*dt,42.5*dt);
 const old={x:p.x,y:p.y};
 for(const q of this.platforms){q.ox=q.x;q.oy=q.y;q.y+=this.speed*dt;q.age+=dt;if(q.type==='drift')q.x=q.base+Math.sin(q.age*1.5+q.phase)*20;if(q.crumble!==null)q.crumble-=dt;}
 this.platforms=this.platforms.filter(q=>q.y<1000&&(q.crumble===null||q.crumble>0));
 if(p.ground){const q=p.ground;if(!this.platforms.includes(q)){p.ground=null;p.coyote=.09;}else{p.x+=q.x-q.ox;p.y=q.y-40;}}
 const axis=(input.right?1:0)-(input.left?1:0);p.vx+=clamp(axis*C.speed-p.vx,-(axis?C.accel:C.brake)*dt,(axis?C.accel:C.brake)*dt);p.x=clamp(p.x+p.vx*dt,0,512);
 if(p.ground&&(p.x+28<=p.ground.x||p.x>=p.ground.x+p.ground.w)){p.ground=null;p.coyote=.09;p.vy=this.speed;}
 if(p.buffer>0)this.jump();
 let landing=null;
 if(p.flight>0){p.flight=Math.max(0,p.flight-dt);p.y-=input.hold?100*dt:0;p.vy=0;if(!p.flight){this.flightEnd=this.time;this.emit('notice','Полёт завершён');}}
 else if(!p.ground){p.vy=Math.min(1000,p.vy+C.gravity*dt);p.y+=p.vy*dt;const hits=this.platforms.map(q=>contact(p,old,q)).filter(Boolean).sort((a,b)=>a.t-b.t);if(hits.length){landing=hits[0];const q=landing.q;p.ground=q;p.y=q.y-40;p.vy=0;p.coyote=0;if(q.type==='crumble'&&q.crumble===null)q.crumble=.7;}}
 if(p.y<0){p.y=0;p.vy=0;}
 for(const l of this.lasers){l.y+=this.speed*dt;if(l.y>=160)l.age+=dt;}this.lasers=this.lasers.filter(l=>l.y<960&&l.age<6);
 for(const m of this.mines){m.y+=this.speed*dt;if(m.y>=160)m.age+=dt;}this.mines=this.mines.filter(m=>m.y<1060);
 if(p.y+40>=900){this.damage('Пропущена платформа');return;}
 if(landing&&landing.q.type==='spikes'){const q=landing.q;if((q.spikeLeft&&landing.x<landing.qx+q.spikeLeft)||(q.spikeRight&&landing.x+28>landing.qx+q.w-q.spikeRight)){if(this.damage('Шипы'))return;}}
 for(const l of this.lasers){if(l.age>=1.2&&l.age<1.65&&p.x+28>l.x&&p.x<l.x+l.w&&p.y<l.y+5&&p.y+40>l.y-5){if(this.damage('Лазер'))return;}}
 for(const m of this.mines){const phase=m.age%3;if(m.age>0&&phase>=1.2&&phase<1.55&&mineRays(m).some(r=>beamHits(m.x,m.y,r.x,r.y,p))){if(this.damage('Лазерная мина'))return;}}
 this.items=this.items.filter(item=>{if(!this.platforms.includes(item.q))return false;item.x=item.q.x+item.q.w/2;item.y=item.q.y-item.offset;if(Math.abs(p.x+14-item.x)<28&&Math.abs(p.y+20-item.y)<35){this.pickup(item);return false;}return item.y<960;});
 if(landing){const q=landing.q;if(!q.visited){this.score+=20*Math.min(1+Math.floor(this.combo/5),4);const safe=safeSpan(q);if(Math.abs(p.x+14-(safe.x+safe.w/2))<=safe.w*.15)this.score+=10;if(p.manual)this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);q.visited=true;}else this.combo=0;p.manual=false;this.target=this.tutorial?25:C.speeds[Math.min(this.level,8)-1];this.emit('land');if(p.buffer>0)this.jump();}
 const top=Math.min(...this.platforms.filter(q=>q.route).map(q=>q.y));if(top>-10)this.row(top-100);
 if(this.tutorial&&this.jumps>=5&&this.maxCombo>=2){this.complete=true;this.emit('tutorial');}
 }
}
const api={Game,C,contact,reachable,safeSpan,laserLength,mineDirections,mineRays,beamHits};if(typeof module!=='undefined')module.exports=api;root.SpaceJumper=api;
})(typeof globalThis!=='undefined'?globalThis:this);
