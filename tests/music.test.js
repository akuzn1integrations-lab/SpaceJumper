const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FlightMusic}=require('../music.js');
function context(){
 const events=[];const param=()=>({value:0,setValueAtTime(v,t){events.push(['value',v,t]);},exponentialRampToValueAtTime(v,t){assert.ok(v>0);events.push(['ramp',v,t]);},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({connect(n){return n;},disconnect(){},start(t){events.push(['start',t]);},stop(){events.push(['stop']);},gain:param(),frequency:param()});
 return {currentTime:0,state:'running',sampleRate:8000,destination:{},events,createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}};
}
test('music schedules percussion and tones, avoids duplicate timers and stops on pause',()=>{
 const ctx=context(),m=new FlightMusic(ctx);try{m.setVolume(.3);m.start();const timer=m.timer;m.start();assert.equal(m.timer,timer);assert.ok(ctx.events.some(e=>e[0]==='start'));assert.ok(m.nodes.size>0);const step=m.step;m.stop();assert.equal(m.nodes.size,0);assert.equal(m.timer,null);ctx.currentTime=2;m.schedule();assert.equal(m.step,step);m.start();assert.ok(m.step>step);}finally{m.stop();}
});
test('music tempo increases with level and volume can mute it',()=>{
 const a=new FlightMusic(context()),b=new FlightMusic(context());try{b.level=50;a.start();b.start();assert.ok(b.next<a.next);b.setVolume(0);assert.equal(b.volume,0);b.setVolume(2);assert.equal(b.volume,1);}finally{a.stop();b.stop();}
});
const {makeArrangement,FORM_BARS}=require('../music.js');
test('music has a forty-bar form with harmonic variations and a bridge',()=>{
 const form=makeArrangement(()=>.3);assert.equal(FORM_BARS,40);assert.equal(form.length,40);
 assert.notDeepEqual(form.slice(0,4),form.slice(4,8));
 assert.ok(form.slice(20,24).every(bar=>bar.sparse));
 assert.ok(form[36].energy>form[20].energy);
 for(const bar of form){assert.equal(bar.melody.length,8);assert.ok(bar.bass.every(s=>s>=0&&s<16));assert.ok(bar.melody.every(n=>Number.isFinite(n)));}
 assert.notDeepEqual(form,makeArrangement(()=>.8));
});
test('a new arrangement is generated after forty bars and not on pause',()=>{
 let calls=0;const ctx=context(),m=new FlightMusic(ctx,()=>{calls++;return calls%10/10;});
 try{m.start();const original=m.arrangement,firstCalls=calls;m.stop();m.start();assert.equal(m.arrangement,original);assert.equal(calls,firstCalls);
  m.step=FORM_BARS*16;m.next=ctx.currentTime+.01;m.schedule();assert.notEqual(m.arrangement,original);assert.ok(calls>firstCalls);assert.equal(m.cycle,1);
 }finally{m.stop();}
});
