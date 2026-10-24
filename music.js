/* Original procedural electro loop: no downloads or audio assets. */
(function(root){
'use strict';
const FORM_BARS=40;
// Ten four-bar phrases: A minor harmony, a quieter bridge and a final build.
// Randomness belongs to the music only, never to the game's seeded generator.
function makeArrangement(random=Math.random){
 const pick=values=>values[Math.min(values.length-1,Math.floor(random()*values.length))];
 const chords={A:[45,3],F:[41,4],C:[48,4],G:[43,4],D:[38,3],E:[40,4]};
 const progressions=[['A','F','C','G'],['A','C','G','F'],['D','F','A','G'],['F','G','A','A'],['A','G','F','E'],['D','A','F','E']];
 const energy=[.7,.85,1,.9,1.05,.55,.7,.9,1,1.1];
 const motifs=[[0,2,3,4,3,2,1,2],[0,1,2,3,2,1,0,2],[3,2,1,0,1,2,4,2],[0,2,1,3,4,3,2,1],[2,0,1,2,3,4,2,1]];
 const bassPatterns=[[0,3,6,8,11,14],[0,2,6,8,10,14],[0,3,7,8,11,15],[0,6,8,14]];
 const bars=[];
 for(let phrase=0;phrase<10;phrase++){
  const progression=phrase===0?progressions[0]:pick(progressions),motif=pick(motifs),bass=pick(bassPatterns);
  for(let bar=0;bar<4;bar++){
   const [root,third]=chords[progression[bar]],tones=[0,third,7,12,12+third];
   const melody=motif.map(i=>tones[i]);
   // Small phrase endings and octave answers, rather than unrelated random notes.
   if(bar===3)melody[7]=pick([0,7,12]);
   bars.push({root,energy:energy[phrase],melody,bass:[...bass],octave:phrase===5?12:24,
    sparse:phrase===5||phrase===6,fill:bar===3?pick([1,2,3]):0,
    answer:phrase>=2&&phrase!==5&&bar%2===1,hat:pick([.9,1,1.1])});
  }
 }
 return bars;
}
class FlightMusic{
 constructor(context,random=Math.random){this.random=random;this.arrangement=makeArrangement(random);this.cycle=0;this.ctx=context;this.level=1;this.volume=.15;this.step=0;this.timer=null;this.nodes=new Set();this.bus=context.createGain();this.bus.connect(context.destination);this.bus.gain.value=0;
  this.noise=context.createBuffer(1,context.sampleRate*.2,context.sampleRate);const data=this.noise.getChannelData(0);let seed=12345;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
 }
 setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.bus.gain.setTargetAtTime(this.timer!==null?this.volume*.5:0,this.ctx.currentTime,.015);}
 start(){if(this.timer!==null)return;this.next=this.ctx.currentTime+.03;this.timer=setInterval(()=>this.schedule(),25);this.setVolume(this.volume);this.schedule();}
 stop(){if(this.timer!==null)clearInterval(this.timer);this.timer=null;this.bus.gain.cancelScheduledValues(this.ctx.currentTime);this.bus.gain.setTargetAtTime(0,this.ctx.currentTime,.01);for(const node of this.nodes){try{node.stop();}catch{}}this.nodes.clear();}
 play(freq,time,length,volume,type='triangle',endFreq=null){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,time+length);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.005);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g).connect(this.bus);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();g.disconnect();};o.start(time);o.stop(time+length+.01);}
 percussion(time,length,volume,cutoff){const n=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();n.buffer=this.noise;f.type='highpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+length);n.connect(f).connect(g).connect(this.bus);this.nodes.add(n);n.onended=()=>{this.nodes.delete(n);n.disconnect();f.disconnect();g.disconnect();};n.start(time);n.stop(time+length);}
 schedule(){if(this.timer===null||this.ctx.state!=='running')return;const beat=60/(132+Math.min(24,(this.level-1)*2));if(this.next<this.ctx.currentTime-.1)this.next=this.ctx.currentTime+.01;
  while(this.next<this.ctx.currentTime+.1){
   const cycle=Math.floor(this.step/(FORM_BARS*16));
   if(cycle!==this.cycle){this.cycle=cycle;this.arrangement=makeArrangement(this.random);}
   const s=this.step%16,bar=this.arrangement[Math.floor(this.step/16)%FORM_BARS],t=this.next,hz=n=>440*2**((n-69)/12),e=bar.energy;
   if(s%4===0)this.play(135,t,.16,.6*Math.min(e,1),'sine',42);
   if(s===4||s===12){this.percussion(t,.12,.18*e,1100);this.play(180,t,.07,.1*e,'triangle');}
   if(s%2===0)this.percussion(t,s%4===2?.05:.025,(s%4===2?.13:.065)*bar.hat*e,6500);
   if(bar.bass.includes(s))this.play(hz(bar.root+(s===14&&bar.answer?12:0)),t,beat*.38,.18*e,'sawtooth');
   if(s%2===1&&(!bar.sparse||s%4===1))this.play(hz(bar.root+bar.octave+bar.melody[(s-1)/2]),t,beat*(bar.sparse?.8:.48),.07*e,'triangle');
   if(bar.answer&&s===10)this.play(hz(bar.root+36+bar.melody[1]),t,beat*.7,.035,'sine');
   if(bar.fill&&s>=13&&(bar.fill!==1||s%2===1)){
    this.percussion(t,.045,.055*e,bar.fill===3?2400:4200);
   }
   this.next+=beat/4;this.step++;
  }
 }
}
if(typeof module!=='undefined')module.exports={FlightMusic,makeArrangement,FORM_BARS};root.FlightMusic=FlightMusic;
})(typeof globalThis!=='undefined'?globalThis:this);
