const assert=require('node:assert/strict');
const {test}=require('node:test');
const {Game,C,contact}=require('../engine.js');
test('one-way surfaces and relative movement',()=>{
 const q={x:100,ox:100,y:110,oy:100,w:100};
 assert.equal(contact({x:120,y:80,vy:-50},{x:120,y:60},q),null);
 assert.equal(contact({x:120,y:65,vy:50},{x:120,y:60},q),null);
 assert.ok(contact({x:120,y:90,vy:400},{x:120,y:50},q));
 assert.equal(contact({x:250,y:90,vy:400},{x:250,y:50},q),null);
});
test('earliest swept crossing and drifting surface interpolation',()=>{
 const p={x:120,y:120,vy:900},old={x:120,y:20};
 const qs=[{x:100,ox:100,y:140,oy:140,w:100},{x:100,ox:100,y:100,oy:100,w:100}];
 assert.equal(qs.map(q=>contact(p,old,q)).sort((a,b)=>a.t-b.t)[0].q.y,100);
 assert.ok(contact(p,old,{x:200,ox:100,y:100,oy:100,w:100}));
});
test('manual jumps score once; held input cannot auto-jump',()=>{
 const g=new Game(1);g.step({jump:true,hold:true});assert.equal(g.jumps,1);assert.equal(g.score,10);
 for(let i=0;i<90;i++)g.step({hold:true});assert.equal(g.jumps,1);assert.ok(g.p.ground);
});
test('buffered landing launches one jump',()=>{
 const g=new Game(1);g.platforms=[];g.items=[];const q=g.platform(170,500,200);g.p.ground=null;g.p.x=250;g.p.y=459;g.p.vy=200;g.step({jump:true});assert.equal(g.jumps,1);assert.ok(g.p.vy<0);assert.equal(g.p.ground,null);
});
test('shield, invulnerability, bottom and rescue priority',()=>{
 const g=new Game(2);g.p.shield=true;g.damage('Шипы');assert.equal(g.p.shield,false);assert.equal(g.dead,false);assert.equal(g.p.inv,1.2);
 g.damage('Лазер');assert.equal(g.dead,false);g.p.reserve=true;g.damage('Пропущена платформа');assert.equal(g.p.reserve,false);assert.equal(g.dead,false);assert.equal(g.p.y,500);
 g.damage('Пропущена платформа');assert.equal(g.dead,true);
});
test('flight suppresses jumps and ends with gravity restored',()=>{
 const g=new Game(3);g.pickup({type:'flight'});g.step({jump:true,hold:true});assert.equal(g.jumps,0);assert.equal(g.combo,0);for(let i=0;i<250;i++)g.step({});assert.equal(g.p.flight,0);assert.ok(g.flightEnd>0);
});
test('level one and tutorial retain the centered route',()=>{
 for(const tutorial of [false,true]){const g=new Game(4,tutorial);if(tutorial)g.level=8;g.row(-180);assert.ok(g.platforms.filter(q=>q.route).every(q=>q.x+q.w/2===270));}
});
test('later levels scatter platforms within bounds and require lateral movement',()=>{
 for(let level=2;level<=8;level++)for(let seed=1;seed<=20;seed++){
  const g=new Game(seed);g.level=level;g.fill();for(let row=0;row<90;row++)g.row(-200-row*100);let low=0,high=540;
  const route=g.platforms.filter(q=>q.route);
  for(let i=1;i<route.length;i++){
   const q=route[i],prev=route[i-1];
   assert.ok(Math.abs(q.x+q.w/2-prev.x-prev.w/2)>=59.99);
   low=Math.max(low,q.x-28);high=Math.min(high,q.x+q.w);
  }
  assert.ok(low>high,'no single stationary horizontal position spans the whole route');
  for(const q of g.platforms){const margin=q.type==='drift'?20:0;assert.ok(q.base-margin>=0);assert.ok(q.base+q.w+margin<=540);}
  for(const item of g.items)assert.equal(item.x,item.q.x+item.q.w/2);
 }
});
test('random main transitions can be landed using actual player physics',()=>{
 for(let level=2;level<=8;level++)for(let seed=1;seed<=10;seed++){
  const source=new Game(seed);source.level=level;source.fill();const rows=source.platforms.filter(q=>q.route);
  for(let n=1;n<rows.length;n++)for(const speed of [45,130]){
   const g=new Game(seed);g.platforms=[];g.items=[];g.lasers=[];g.speed=g.target=speed;
   g.platform(0,-2000,100,'standard',true);
   const from=g.platform(rows[n-1].x,700,rows[n-1].w),to=g.platform(rows[n].x,600,rows[n].w);
   g.p.x=from.x+from.w/2-14;g.p.y=660;g.p.ground=from;
   for(let t=0;t<80;t++){
    const delta=to.x+to.w/2-g.p.x-14,stopping=g.p.vx*g.p.vx/(2*C.brake);
    const steer=Math.abs(delta)>Math.max(3,stopping)?Math.sign(delta):0;
    g.step({jump:t===0,left:steer<0,right:steer>0});
    if(g.p.ground)break;
   }
   assert.equal(g.p.ground,to,`level ${level}, seed ${seed}, row ${n}, speed ${speed}`);
  }
 }
});
test('seed and input reproduce identical simulation',()=>{
 const a=new Game(123),b=new Game(123);for(let i=0;i<2000;i++){const input={jump:i%50===0,left:i%200<20,right:i%200>180};a.step(input);b.step(input);}assert.deepEqual(a,b);
});
