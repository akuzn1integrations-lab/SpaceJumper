'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function mockCanvas(){
 const g=new Proxy({}, {get(target,key){
  if(key==='createLinearGradient')return ()=>({addColorStop(){}});
  if(key==='canvas')return null;
  return target[key]??(()=>{});
 },set(target,key,value){target[key]=value;return true;}});
 return {width:0,height:0,getContext:()=>g};
}
const sandbox={document:{createElement:()=>mockCanvas()},Math,Map,Object};
vm.runInNewContext(fs.readFileSync('chibi.js','utf8')+'\nthis.chibi=ChibiAstronaut;',sandbox);
const chibi=sandbox.chibi;
test('all chibi states generate cached 96px sprites',()=>{
 for(const state of chibi.states){
  const frame=chibi.sprite(state,0);
  assert.equal(frame.width,96);
  assert.equal(frame.height,96);
  assert.equal(chibi.sprite(state,0),frame);
 }
});
test('reduced motion keeps sprite frame stable',()=>{
 assert.equal(chibi.frame('idle',0,true),chibi.frame('idle',123,true));
});
test('pose selection responds to game state',()=>{
 const base={inv:0,vy:0,flight:0};
 assert.equal(chibi.stateOf(base,{},false),'idle');
 assert.equal(chibi.stateOf(base,{left:true},false),'run');
 assert.equal(chibi.stateOf({...base,vy:-100},{},false),'jump');
 assert.equal(chibi.stateOf({...base,vy:200},{},false),'fall');
 assert.equal(chibi.stateOf({...base,inv:1},{},false),'hurt');
 assert.equal(chibi.stateOf(base,{},true),'land');
});
