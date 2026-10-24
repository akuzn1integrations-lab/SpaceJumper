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
test('safe fallback remains traversable at all eight speeds',()=>{
 for(let level=1;level<=8;level++){const g=new Game(4);g.level=level;g.jumps=(level-1)*15;g.speed=g.target=C.speeds[level-1];for(let i=0;i<1800;i++){g.step({jump:!!g.p.ground&&g.p.y>300});assert.equal(g.dead,false,'level '+level+' tick '+i);}assert.ok(g.jumps>(level-1)*15+10);}
});
test('seed and input reproduce identical simulation',()=>{
 const a=new Game(123),b=new Game(123);for(let i=0;i<2000;i++){const input={jump:i%50===0,left:i%200<20,right:i%200>180};a.step(input);b.step(input);}assert.deepEqual(a,b);
});
