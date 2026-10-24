/* SpaceJumper deterministic fixed-step simulation. No browser dependencies. */
(function(root){
'use strict';
const C={width:540,height:960,gravity:1800,jump:780,speed:260,accel:2200,brake:2600,step:1/60,speeds:[45,55,65,78,92,105,118,130],version:'1.0.0'};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function contact(p,old,q){
 if(p.vy<0)return null;
 const a=old.y+40-q.oy,b=p.y+40-q.y;
 if(a>0.01||b<0||b-a<=0)return null;
 const t=clamp(-a/(b-a),0,1),x=old.x+(p.x-old.x)*t,qx=q.ox+(q.x-q.ox)*t;
 return x+28>qx&&x<qx+q.w?{q,t,x,qx}:null;
}
class Game{
 constructor(seed=Date.now(),tutorial=false){this.seed=seed>>>0;this.rng=this.seed;this.tutorial=tutorial;this.time=0;this.tick=0;this.score=0;this.jumps=0;this.combo=0;this.maxCombo=0;this.level=1;this.speed=tutorial?0:45;this.target=this.speed;this.platforms=[];this.items=[];this.lasers=[];this.id=0;this.rows=0;this.reserves=0;this.flightEnd=-100;this.dead=false;this.events=[];this.inputs=[];this.lastInput='';this.p={x:256,y:740,vx:0,vy:0,ground:null,coyote:0,buffer:0,shield:false,reserve:false,flight:0,inv:0,manual:false};this.fill();}
 random(){let t=this.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
 emit(type,text){this.events.push({type,text});}
 platform(x,y,w=160,type='standard',route=false){const q={id:++this.id,x,y,ox:x,oy:y,base:x,w,type,route,phase:this.random()*6.28,age:0,crumble:null,visited:false};this.platforms.push(q);return q;}
 fill(){this.platforms=[];this.items=[];this.lasers=[];const q=this.platform(170,780,200,'standard',true);q.visited=true;this.p.ground=q;for(let y=680;y>-110;y-=100)this.row(y);}
 row(y){
 this.rows++;const lv=Math.min(this.level,8),w=[180,160,145,130,120,110,100,100][lv-1];
 // Conservative fallback spine: same center, <=100 vertical separation. Safe at every supported speed.
 this.platform(270-w/2,y,w,'standard',true);
 if(!this.tutorial){let types=['standard'];if(lv>=2)types.push('narrow');if(lv>=3)types.push('crumble');if(lv>=4)types.push('drift');if(lv>=5)types.push('spikes');let type=types[this.rows%types.length],width=type==='narrow'?80:120;const left=this.rows%2===0;const q=this.platform(left?24:396,y-35,width,type);if(this.rows%4===0)this.items.push({x:q.x+width/2,y:y-65,type:this.rows%12===0?'core':'crystal',q,offset:30});
 if(this.rows%15===0){const choices=['shield','flight','reserve'];let type=choices[Math.floor(this.random()*3)];if(type==='flight'&&(this.p.flight>0||this.time-this.flightEnd<12))type='shield';if(type==='reserve'&&this.reserves>=2)type='shield';if(type==='reserve')this.reserves++;this.items.push({x:270,y:y-30,type,q:this.platforms[this.platforms.length-2],offset:30});}
 if(lv>=6&&this.rows%7===0)this.lasers.push({x:left?0:380,w:160,y:y-70,age:0});
 }
 if(this.rows%4===1)this.items.push({x:270,y:y-30,type:'crystal',q:this.platforms.find(q=>q.route&&q.y===y),offset:30});
 }
 jump(){const p=this.p;if(p.flight||(!p.ground&&p.coyote<=0))return false;p.ground=null;p.coyote=0;p.buffer=0;p.vy=-C.jump;p.manual=true;this.jumps++;this.score+=10;const level=1+Math.floor(this.jumps/15);if(level!==this.level){this.level=level;this.emit('notice','УРОВЕНЬ '+level+' · Новый сектор');}this.emit('jump');return true;}
 damage(cause){const p=this.p;if(cause!=='Пропущена платформа'&&p.inv>0)return false;if(cause!=='Пропущена платформа'&&p.shield){p.shield=false;p.inv=1.2;p.manual=false;this.combo=0;this.emit('notice','Щит поглотил удар');return false;}if(p.reserve){p.reserve=false;p.flight=0;p.inv=2;p.x=256;p.y=500;p.vx=p.vy=0;p.coyote=p.buffer=0;p.manual=false;this.combo=0;this.fill();const q=this.platform(170,540,200,'standard',true);q.visited=true;p.ground=q;this.rescue=.35;this.emit('notice','Резервный модуль · спасение');return true;}if(this.tutorial){this.p.x=256;this.p.y=740;this.p.vx=this.p.vy=0;this.fill();return true;}this.dead=true;this.cause=cause;this.emit('death',cause);return true;}
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
 if(p.y+40>=900){this.damage('Пропущена платформа');return;}
 if(landing&&landing.q.type==='spikes'&&landing.x+28>landing.qx+80){if(this.damage('Шипы'))return;}
 for(const l of this.lasers){if(l.age>=1.2&&l.age<1.65&&p.x+28>l.x&&p.x<l.x+l.w&&p.y<l.y+5&&p.y+40>l.y-5){if(this.damage('Лазер'))return;}}
 this.items=this.items.filter(item=>{if(!this.platforms.includes(item.q))return false;item.x=item.q.x+item.q.w/2;item.y=item.q.y-item.offset;if(Math.abs(p.x+14-item.x)<28&&Math.abs(p.y+20-item.y)<35){this.pickup(item);return false;}return item.y<960;});
 if(landing){const q=landing.q;if(!q.visited){this.score+=20*Math.min(1+Math.floor(this.combo/5),4);const safe=q.type==='spikes'?80:q.w;if(Math.abs(p.x+14-(q.x+safe/2))<=safe*.15)this.score+=10;if(p.manual)this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);q.visited=true;}else this.combo=0;p.manual=false;this.target=this.tutorial?25:C.speeds[Math.min(this.level,8)-1];this.emit('land');if(p.buffer>0)this.jump();}
 const top=Math.min(...this.platforms.filter(q=>q.route).map(q=>q.y));if(top>-10)this.row(top-100);
 if(this.tutorial&&this.jumps>=5&&this.maxCombo>=2){this.complete=true;this.emit('tutorial');}
 }
}
const api={Game,C,contact};if(typeof module!=='undefined')module.exports=api;root.SpaceJumper=api;
})(typeof globalThis!=='undefined'?globalThis:this);
