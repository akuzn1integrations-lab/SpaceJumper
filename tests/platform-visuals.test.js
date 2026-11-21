'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const images=[];
 class ImageMock{constructor(){images.push(this);}set src(v){this._src=v;}get src(){return this._src;}}
 const calls=[];
 const ctx=new Proxy({globalAlpha:1,drawImage(...args){calls.push({type:'image',args});},fillRect(...args){calls.push({type:'rect',args});},moveTo(...args){calls.push({type:'move',args});}},{
  get(target,key){return target[key]??(()=>{});},
  set(target,key,value){target[key]=value;return true;}
 });
 const scope={Image:ImageMock,Math,Object};
 vm.runInNewContext(fs.readFileSync('sprites.js','utf8')+'\nthis.sprites=SpaceSprites;',scope);
 images.forEach(i=>i.onload());
 return {sprites:scope.sprites,calls,ctx,images};
}
test('standard platform uses identical sprite and shadow on successive frames',()=>{
 const {sprites,calls,ctx}=setup(),q={type:'standard',x:100,y:200,w:160};
 sprites.platform(ctx,q,0,false);const first=calls.filter(x=>x.type==='image').map(x=>x.args.slice(1));
 calls.length=0;sprites.platform(ctx,q,10,false);
 assert.deepEqual(calls.filter(x=>x.type==='image').map(x=>x.args.slice(1)),first);
});
test('narrow platform uses full-depth raster body with trimmed edges',()=>{
 const {sprites,calls,ctx,images}=setup();
 sprites.platform(ctx,{type:'narrow',x:100,y:200,w:80},1,false);
 assert.equal(calls.find(x=>x.type==='image').args[0],images[1]);
});
test('crumbling platform draws cracks but no spikes',()=>{
 const {sprites,calls,ctx}=setup();
 const q={type:'crumble',x:100,y:200,w:120,crumble:.3};
 sprites.platform(ctx,q,2,false);
 assert.ok(calls.some(x=>x.type==='rect'));
 assert.ok(calls.some(x=>x.type==='move'));
});
test('spike geometry stays within visible rounded ends',()=>{
 const {sprites,calls,ctx}=setup();
 const q={type:'spikes',x:100,y:200,w:120,spikeLeft:40,spikeRight:0};
 sprites.platform(ctx,q,0,false);
 const spikeMoves=calls.filter(x=>x.type==='move').map(x=>x.args[0]);
 assert.ok(spikeMoves.length>0);
 assert.ok(spikeMoves.every(x=>x>=109&&x<=211));
});

test('all pickup types use square source frames and keep their proportions',()=>{
 const {sprites,calls,ctx,images}=setup();
 for(const type of ['crystal','core','shield','flight','reserve']){
  calls.length=0;
  assert.equal(sprites.pickup(ctx,{type,x:100,y:200},0,true),true);
  const call=calls.find(x=>x.type==='image').args;
  assert.equal(call[0],images[0]);
  assert.equal(call[3],128);
  assert.equal(call[4],128);
  assert.equal(call[7],34);
  assert.equal(call[8],38);
 }
});
test('crumble and narrow use the same full-depth platform base',()=>{
 const {sprites,calls,ctx,images}=setup();
 for(const type of ['narrow','crumble']){
  calls.length=0;
  sprites.platform(ctx,{type,x:100,y:200,w:80,crumble:null},0,true);
  const call=calls.find(x=>x.type==='image').args;
  assert.equal(call[0],images[1]);
  assert.equal(call[4],128);
  assert.equal(call[8],62);
 }
});
