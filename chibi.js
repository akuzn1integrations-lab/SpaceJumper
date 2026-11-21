'use strict';
// Chibi astronaut: prerendered Canvas sprite frames, no network or image assets.
// The game hitbox remains defined exclusively by engine.js.
const ChibiAstronaut=(()=>{
 const SIZE=96,frames=new Map();
 const states=['idle','run','jump','fall','land','hurt','pickup'];
 function sprite(state,step){
  const key=state+':'+step;
  if(frames.has(key))return frames.get(key);
  const c=document.createElement('canvas');c.width=SIZE;c.height=SIZE;
  const g=c.getContext('2d');
  if(!g)return null;
  g.translate(48,49);
  const running=state==='run',flying=state==='jump',falling=state==='fall';
  const stride=running?(step?1:-1):0;
  const bob=state==='idle'?(step?1:-1):0;
  g.translate(0,bob);
  const stroke=(color,width=2)=>{g.strokeStyle=color;g.lineWidth=width;g.stroke();};
  function capsule(x,y,w,h,r,fill,outline='#7d96ba'){
   g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();
   if(outline)stroke(outline,1.5);
  }
  // Compact cyan backpack.
  capsule(-24,-4,14,31,5,'#273c67');
  capsule(-23,2,8,21,3,'#42eaff','#0d79a8');
  // Legs and boots; small readable stride at gameplay scale.
  capsule(-13,23+stride*2,11,13,4,'#edf4ff');
  capsule(3,23-stride*2,11,13,4,'#edf4ff');
  capsule(-15,31+stride*2,14,7,3,'#a8c4e4');
  capsule(2,31-stride*2,14,7,3,'#a8c4e4');
  // Suit.
  capsule(-20,-7,40,38,12,'#f1f7ff');
  capsule(-20,11,40,5,2,'#ff9b38',null);
  capsule(-10,2,20,12,4,'#1a4169','#5bdeff');
  capsule(-6,5,12,6,2,'#5cf5ff',null);
  // Hands.
  const armY=state==='pickup'?-19:state==='hurt'?3:state==='jump'?-9:2;
  capsule(-27,armY,10,23,5,'#f1f7ff');
  capsule(17,armY,10,23,5,'#f1f7ff');
  capsule(-27,armY+11,10,6,2,'#ffa243',null);
  capsule(17,armY+11,10,6,2,'#ffa243',null);
  // Oversized chibi helmet and orange ear modules.
  g.beginPath();g.arc(0,-21,29,0,Math.PI*2);g.fillStyle='#f4f8ff';g.fill();stroke('#8ba9d3',2.5);
  for(const x of [-29,29]){
   g.beginPath();g.arc(x,-21,9,0,Math.PI*2);g.fillStyle='#ff9f38';g.fill();stroke('#d36b2c',2);
   g.beginPath();g.arc(x,-21,5,0,Math.PI*2);g.fillStyle='#0e3b64';g.fill();stroke('#5deaff',2);
  }
  g.beginPath();g.ellipse(0,-21,23,20,0,0,Math.PI*2);
  const visor=g.createLinearGradient(-18,-40,20,-6);
  visor.addColorStop(0,'#163c78');visor.addColorStop(.6,'#07142e');visor.addColorStop(1,'#0a254b');
  g.fillStyle=visor;g.fill();stroke('#6bdfff',1.5);
  // Expressions stay legible when the sprite is downscaled.
  g.strokeStyle=state==='hurt'?'#ff7b90':'#65edff';g.lineWidth=3.4;g.lineCap='round';
  const blink=state==='idle'&&step===3;
  for(const x of [-10,10]){
   g.beginPath();
   if(state==='hurt'){g.moveTo(x-4,-26);g.lineTo(x+4,-18);g.moveTo(x+4,-26);g.lineTo(x-4,-18);}
   else if(blink){g.moveTo(x-4,-21);g.lineTo(x+4,-21);}
   else {g.arc(x,-21,5,Math.PI*1.1,Math.PI*1.9);}
   g.stroke();
  }
  g.beginPath();
  if(state==='fall'||state==='hurt'){g.arc(0,-10,3,0,Math.PI*2);}
  else {g.arc(0,-13,5,0,Math.PI);}
  g.stroke();
  // Visor reflection.
  g.fillStyle='#c8f7ff';g.globalAlpha=.6;g.beginPath();g.ellipse(12,-32,5,2,-.5,0,Math.PI*2);g.fill();
  g.globalAlpha=1;
  frames.set(key,c);
  return c;
 }
 function frame(state,time,reduced){
  if(reduced)return sprite(state,0);
  const n=state==='run'?3:state==='idle'?4:2;
  return sprite(state,Math.floor(time*(state==='run'?12:5))%n);
 }
 function stateOf(player,held,landed){
  if(player.inv>0)return 'hurt';
  if(landed)return 'land';
  if(player.vy<0||player.flight>0)return 'jump';
  if(player.vy>140)return 'fall';
  if(held.left||held.right)return 'run';
  return 'idle';
 }
 return Object.freeze({sprite,frame,stateOf,states:Object.freeze(states)});
})();
