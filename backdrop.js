'use strict';
// Detailed deterministic parallax scenery, rendered to cached Canvas layers.
// No external images, requests or gameplay dependencies.
const SpaceBackdrop=(()=>{
 const W=540,H=960;
 let layers=null;
 function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
 function layer(){const c=document.createElement('canvas');c.width=W;c.height=H;return [c,c.getContext('2d')];}
 function ellipse(g,x,y,rx,ry,color,rotation=0){g.save();g.translate(x,y);g.rotate(rotation);g.fillStyle=color;g.beginPath();g.ellipse(0,0,rx,ry,0,0,Math.PI*2);g.fill();g.restore();}
 function glow(g,x,y,r,color){const a=g.createRadialGradient(x,y,0,x,y,r);a.addColorStop(0,color);a.addColorStop(1,'#00000000');g.fillStyle=a;g.fillRect(x-r,y-r,r*2,r*2);}
 function make(){
  const random=rng(20261121);
  const [base,g]=layer();
  let fill=g.createLinearGradient(0,0,200,H);fill.addColorStop(0,'#03091b');fill.addColorStop(.48,'#060c24');fill.addColorStop(1,'#020817');g.fillStyle=fill;g.fillRect(0,0,W,H);
  // Nebula dust: many faint translucent clouds rather than opaque shapes.
  for(let i=0;i<250;i++){
   const x=random()*W,y=random()*H,r=15+random()*110;
   const c=i%3===0?'rgba(140,64,220,0.036)':i%3===1?'rgba(30,110,255,0.035)':'rgba(40,215,240,0.018)';
   glow(g,x,y,r,c);
  }
  glow(g,392,160,230,'rgba(98,34,196,0.21)');
  glow(g,110,650,210,'rgba(24,89,209,0.13)');
  // Milky-way band, clusters and distant stars.
  for(let i=0;i<1250;i++){
   const x=random()*W,y=random()*H,band=Math.abs(x-(W*.74-y*.22));
   const alpha=(band<130?.12:.025)+random()*.38;
   const sz=random()<.05?1.6:.45+random()*.65;
   g.fillStyle='rgba(189,220,255,'+alpha.toFixed(3)+')';
   g.fillRect(x,y,sz,sz);
  }
  // Spiral galaxy in upper right, restrained so platforms remain readable.
  g.save();g.translate(410,174);g.rotate(-.45);
  glow(g,0,0,118,'rgba(111,55,220,0.22)');
  for(let arm=0;arm<3;arm++)for(let i=0;i<230;i++){
   const t=i/230*3.8*Math.PI,rad=4+i*.36;
   const a=t+arm*2*Math.PI/3,scatter=(random()-.5)*18;
   ellipse(g,Math.cos(a)*(rad+scatter),Math.sin(a)*(rad*.43+scatter*.3),.5+random()*1.3,.5+random()*.6,'rgba(189,134,255,'+(.06+random()*.3)+')');
  }
  glow(g,0,0,26,'rgba(255,218,230,0.7)');
  g.restore();
  // Atmospheric planet, partially off-screen at bottom left.
  const px=-75,py=1155,pr=390;
  glow(g,px,py,pr+80,'rgba(36,107,245,0.19)');
  g.save();g.beginPath();g.arc(px,py,pr,0,Math.PI*2);g.clip();
  const planet=g.createRadialGradient(80,905,35,px,py,pr*1.6);
  planet.addColorStop(0,'#285a91');planet.addColorStop(.38,'#0f376e');planet.addColorStop(.8,'#091a3d');planet.addColorStop(1,'#030917');
  g.fillStyle=planet;g.fillRect(0,0,W,H);
  for(let i=0;i<230;i++){
   const x=px+(random()*2-1)*pr,y=py+(random()*2-1)*pr;
   if((x-px)**2+(y-py)**2>pr*pr)continue;
   ellipse(g,x,y,6+random()*52,2+random()*13,'rgba(167,208,244,'+(.015+random()*.075)+')',-.45);
  }
  for(let i=0;i<70;i++){
   const x=px+(random()*2-1)*pr,y=py+(random()*2-1)*pr;
   ellipse(g,x,y,random()*2.5+1,random()*1.5+.5,'rgba(255,180,112,0.35)');
  }
  g.restore();
  g.strokeStyle='rgba(104,189,255,.8)';g.lineWidth=5;g.shadowColor='#3b9cff';g.shadowBlur=18;
  g.beginPath();g.arc(px,py,pr,3.2,5.7);g.stroke();g.shadowBlur=0;
  // Distant station silhouette in top-left.
  g.save();g.translate(110,188);g.rotate(-.28);g.globalAlpha=.55;
  g.strokeStyle='#4b78b5';g.lineWidth=7;g.beginPath();g.ellipse(0,0,76,21,0,0,Math.PI*2);g.stroke();
  g.strokeStyle='#6c9bc9';g.lineWidth=2;g.beginPath();g.ellipse(0,0,76,21,0,0,Math.PI*2);g.stroke();
  g.fillStyle='#1c355c';g.fillRect(-12,-52,24,106);
  g.fillStyle='#6b9bca';for(let i=-2;i<=2;i++)g.fillRect(-9,i*18,18,3);
  g.restore();
  const [foreground,fg]=layer();
  // Small foreground rocks with facets, not on the main central travel lane.
  for(const [x,y,r] of [[45,530,19],[489,580,22],[477,785,17],[60,340,12]]){
   fg.save();fg.translate(x,y);fg.rotate(random()*6);
   fg.beginPath();
   for(let i=0;i<9;i++){const a=i*Math.PI*2/9,rr=r*(.7+random()*.35);i?fg.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):fg.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
   fg.closePath();fg.fillStyle='#17223b';fg.fill();fg.strokeStyle='#57658e';fg.lineWidth=1.3;fg.stroke();
   ellipse(fg,-r*.2,-r*.25,r*.37,r*.15,'rgba(132,142,190,.26)',-.3);
   fg.restore();
  }
  return {base,foreground};
 }
 function draw(ctx,time,speed,reduced){
  layers??=make();
  ctx.drawImage(layers.base,0,0);
  // Transparent moving dust creates depth without making obstacles less visible.
  const shift=reduced?0:time*Math.min(speed||45,180)*.07;
  ctx.save();ctx.globalAlpha=.45;
  for(let i=0;i<65;i++){
   const x=(i*173+31)%W,y=((i*239+shift*(1+i%3*.25))%H+H)%H;
   ctx.fillStyle=i%7===0?'#b2dfff':'#5179b7';
   ctx.fillRect(x,y,i%7===0?1.7:1,1.5);
  }
  ctx.globalAlpha=.62;
  const drift=reduced?0:Math.sin(time*.12)*7;
  ctx.drawImage(layers.foreground,drift,0);
  ctx.restore();
  // Dark contrast veil keeps cyan hazards and collectibles legible.
  ctx.fillStyle='rgba(1,7,22,.18)';ctx.fillRect(0,0,W,H);
 }
 return Object.freeze({draw});
})();
