const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Game,C,safeSpan,laserLength,mineDirections,mineRays,beamHits}=require('../engine.js');
test('spikes can occupy left, right or both; safe portion stays 80',()=>{
 const g=new Game(9),modes=new Set();
 for(let i=0;i<100;i++){const q=g.platform(200,500,120,'spikes');modes.add([!!q.spikeLeft,!!q.spikeRight].join());assert.equal(safeSpan(q).w,80);}
 assert.equal(modes.size,3);
 for(const [left,right] of [[40,0],[0,40],[20,20]])for(const x of [201,246,291]){
  const h=new Game(10);h.platforms=[];h.items=[];h.platform(0,-2000,100,'standard',true);const q=h.platform(200,500,120,'spikes');q.spikeLeft=left;q.spikeRight=right;
  h.p.ground=null;h.p.x=x;h.p.y=459;h.p.vy=400;h.step();
  assert.equal(h.dead,!!((left&&x<200+left)||(right&&x+28>320-right)));
 }
});
test('laser grows over ten levels and then caps at two thirds',()=>{
 for(let level=6;level<=16;level++)assert.equal(laserLength(level),160+(level-6)*20);
 assert.equal(laserLength(99),C.width*2/3);
 for(const level of [6,10,16,30]){const g=new Game(1);g.level=level;g.rows=6;g.row(-200);const l=g.lasers.at(-1);assert.equal(l.w,laserLength(level));assert.ok(l.x>=0&&l.x+l.w<=540);}
});
function bounds(q){return {left:q.base-(q.type==='drift'?20:0),right:q.base+q.w+(q.type==='drift'?20:0),top:q.y-(q.type==='spikes'?12:0),bottom:q.y+19};}
test('all generated platforms have a bonus-sized gap, including drift envelopes',()=>{
 for(let level=1;level<=20;level++)for(let seed=1;seed<=12;seed++){
  const g=new Game(seed);g.level=level;g.fill();for(let n=0;n<20;n++)g.row(-200-n*100);
  for(let i=0;i<g.platforms.length;i++)for(let j=i+1;j<g.platforms.length;j++){
   const a=bounds(g.platforms[i]),b=bounds(g.platforms[j]);
   assert.ok(Math.max(a.left-b.right,b.left-a.right,a.top-b.bottom,b.top-a.bottom)>=C.bonusSize-1e-8,`level ${level}, seed ${seed}`);
  }
 }
});
test('mine progression and short rays',()=>{
 assert.deepEqual([10,12,14,16,18,40].map(mineDirections),[1,2,4,6,8,8]);
 for(let level=1;level<=20;level++){const g=new Game(2);g.level=level;g.rows=10;g.row(-200);assert.equal(g.mines.length,level<10?0:1);if(level<10)continue;const m=g.mines[0],rays=mineRays(m);assert.equal(rays.length,mineDirections(level));for(const r of rays)assert.ok(Math.abs(Math.hypot(r.x-m.x,r.y-m.y)-90)<1e-8);if(rays.length===2){assert.ok(Math.abs(rays[0].x+rays[1].x-2*m.x)<1e-8);assert.ok(Math.abs(rays[0].y+rays[1].y-2*m.y)<1e-8);}}
});
test('mine warning is harmless, active rays damage and shield/reserve apply',()=>{
 for(const [age,shield,reserve,dead] of [[.4,false,false,false],[1.21,false,false,true],[1.21,true,false,false],[1.21,false,true,false],[2,false,false,false]]){
  const g=new Game(3);g.p.x=250;g.p.y=400;g.p.ground=null;g.p.shield=shield;g.p.reserve=reserve;
  g.mines=[{x:220,y:420,age,count:1,angle:0,range:90}];g.step();assert.equal(g.dead,dead);if(dead)assert.equal(g.cause,'Лазерная мина');if(shield)assert.equal(g.p.shield,false);if(reserve){assert.equal(g.p.reserve,false);assert.equal(g.mines.length,0);}
 }
 assert.ok(beamHits(0,0,100,100,{x:45,y:45}));assert.equal(beamHits(0,0,10,10,{x:45,y:45}),false);
});
test('same seed reproduces high-level mine and spike generation',()=>{
 const a=new Game(99),b=new Game(99);for(const g of [a,b]){g.level=20;g.fill();for(let i=0;i<30;i++)g.row(-200-i*100);}assert.deepEqual(a,b);
});
