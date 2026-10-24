/* Original procedural electro loop: no downloads or audio assets. */
(function(root){
'use strict';
const FORM_BARS=40;
// Preserve the original four-bar music verbatim, repeated ten times per form.
const ROOTS=Array.from({length:FORM_BARS},(_,bar)=>[45,41,48,43][bar%4]);
class FlightMusic{
 constructor(context){this.ctx=context;this.level=1;this.volume=.15;this.step=0;this.timer=null;this.nodes=new Set();this.bus=context.createGain();this.bus.connect(context.destination);this.bus.gain.value=0;
  this.noise=context.createBuffer(1,context.sampleRate*.2,context.sampleRate);const data=this.noise.getChannelData(0);let seed=12345;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
 }
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.bus.gain.setTargetAtTime(this.timer!==null?this.volume*.5:0,this.ctx.currentTime,.015);}
 start(){if(this.timer!==null)return;this.next=this.ctx.currentTime+.03;this.timer=setInterval(()=>this.schedule(),25);this.setVolume(this.volume);this.schedule();}
 stop(){if(this.timer!==null)clearInterval(this.timer);this.timer=null;this.bus.gain.cancelScheduledValues(this.ctx.currentTime);this.bus.gain.setTargetAtTime(0,this.ctx.currentTime,.01);for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();}
 play(freq,time,length,volume,type='triangle',endFreq=null){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,time+length);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.005);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g).connect(this.bus);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};o.start(time);o.stop(time+length+.01);}
 percussion(time,length,volume,cutoff){const n=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();n.buffer=this.noise;f.type='highpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+length);n.connect(f).connect(g).connect(this.bus);this.nodes.add(n);n.onended=()=>{this.nodes.delete(n);n.disconnect();f.disconnect();g.disconnect();};n.start(time);n.stop(time+length);}
 schedule(){if(this.timer===null||this.ctx.state!=='running')return;const beat=60/(132+Math.min(24,(this.level-1)*2));if(this.next<this.ctx.currentTime-.1)this.next=this.ctx.currentTime+.01;
  while(this.next<this.ctx.currentTime+.1){const s=this.step%16,bar=Math.floor(this.step/16)%FORM_BARS,t=this.next,root=ROOTS[bar],hz=n=>440*2**((n-69)/12);
   if(s%4===0)this.play(135,t,.16,.65,'sine',42); // four-on-the-floor kick
   if(s===4||s===12){this.percussion(t,.12,.20,1100);this.play(180,t,.07,.12,'triangle');}
   if(s%2===0)this.percussion(t,.035,s%4===2?.14:.075,6500);
   if([0,3,6,8,11,14].includes(s))this.play(hz(root),t,beat*.38,.19,'sawtooth');
   const arp=[0,7,12,15,12,7,3,7];if(s%2===1)this.play(hz(root+24+arp[(s-1)/2]),t,beat*.48,.075,'triangle');
   this.next+=beat/4;this.step++;
  }
 }
}
if(typeof module!=='undefined')module.exports={FlightMusic,FORM_BARS};root.FlightMusic=FlightMusic;
})(typeof globalThis!=='undefined'?globalThis:this);
