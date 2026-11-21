'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {Game,C}=require('../engine.js');
test('platforms stay inside side rails, including maximum drift',()=>{
 let count=0;
 for(let seed=1;seed<=200;seed++){
  const game=new Game(seed);
  for(let level=1;level<=25;level++){
   game.level=level;
   for(let i=0;i<20;i++)game.row(-100-i*100);
  }
  for(const q of game.platforms){
   const drift=q.type==='drift'?20:0;
   assert.ok(q.x-drift>=C.railInset-1e-6,`left rail: seed=${seed} id=${q.id}`);
   assert.ok(q.x+q.w+drift<=C.width-C.railInset+1e-6,`right rail: seed=${seed} id=${q.id}`);
   count++;
  }
 }
 assert.ok(count>200000);
});
test('drifting platform reaches neither rail at maximum excursion',()=>{
 const game=new Game(12);
 const q=game.platform(-100,0,120,'drift');
 assert.equal(q.x,C.railInset+20);
 const right=game.platform(999,0,120,'drift');
 assert.equal(right.x+right.w+20,C.width-C.railInset);
});
