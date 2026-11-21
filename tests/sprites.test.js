'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const atlas=fs.readFileSync('assets/sprites/neon-atlas.svg','utf8');
test('sprite atlas has 32 cells and valid dimensions',()=>{
 assert.match(atlas,/<svg[^>]+width="1024"[^>]+height="512"/);
 assert.equal((atlas.match(/<g transform="translate\(/g)||[]).length,32);
 assert.match(atlas,/<\/svg>\s*$/);
});
test('all sprite frame IDs fit inside the atlas',()=>{
 const js=fs.readFileSync('sprites.js','utf8');
 const calls=[...js.matchAll(/draw\(ctx,(\d+),/g)].map(m=>Number(m[1]));
 assert.ok(calls.length>0);
 assert.ok(calls.every(i=>i>=0&&i<32));
});
test('sprite renderer draws from atlas after load',()=>{
 let image;
 class FakeImage{set src(v){this._src=v;image=this;}get src(){return this._src;}}
 const drawCalls=[];
 const ctx=new Proxy({globalAlpha:1,drawImage(...a){drawCalls.push(a);}},{
  get(target,key){return target[key]??(()=>{});},
  set(target,key,value){target[key]=value;return true;}
 });
 const sandbox={Image:FakeImage,Math,Object};
 vm.runInNewContext(fs.readFileSync('sprites.js','utf8')+'\nthis.sprites=SpaceSprites;',sandbox);
 assert.equal(sandbox.sprites.isReady(),false);
 image.onload();
 assert.equal(sandbox.sprites.isReady(),true);
 assert.equal(sandbox.sprites.draw(ctx,9,0,0,32,32),true);
 assert.equal(drawCalls.length,1);
 assert.equal(drawCalls[0][1],128);
 assert.equal(drawCalls[0][2],128);
});
