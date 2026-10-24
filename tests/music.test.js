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
