'use strict';
// Pre-rendered image atlas: each frame is a real SVG image sprite, not a Canvas drawing.
// The atlas is intentionally static; animation is driven by frame selection and transforms.
const SpaceSprites=(()=>{
 const image=new Image();
 let ready=false;
 image.onload=()=>{ready=true;};
 image.onerror=()=>{ready=false;};
 image.src='assets/sprites/neon-atlas.svg';
 const W=128;
 const realistic=new Image();
 let realisticReady=false;
 realistic.onload=()=>{realisticReady=true;};
 realistic.onerror=()=>{realisticReady=false;};
 realistic.src='assets/sprites/spacejumper-realistic-assets.webp';
 function drawReal(ctx,index,x,y,w,h,trim=0){
  if(!realisticReady)return false;
  // Each atlas cell is 256×128. Trim horizontal edges for platform cells:
  // the generated sheet has fragments of neighbouring sprites at the edges.
  const sx=(index%8)*256+trim;
  const sw=256-2*trim;
  ctx.drawImage(realistic,sx,Math.floor(index/8)*128,sw,128,x,y,w,h);
  return true;
 }
 const raster=new Image();
 let rasterReady=false;
 raster.onload=()=>{rasterReady=true;};
 raster.onerror=()=>{rasterReady=false;};
 raster.src='assets/sprites/astronaut-chibi-atlas.webp';
 function drawRaster(ctx,index,x,y,w,h){
  if(!rasterReady)return false;
  ctx.drawImage(raster,(index%4)*128,Math.floor(index/4)*128,128,128,x,y,w,h);
  return true;
 }
 const astronautAtlas=new Image();
 let astronautReady=false,lastFacing=1;
 astronautAtlas.onload=()=>{astronautReady=true;};
 astronautAtlas.onerror=()=>{astronautReady=false;};
 astronautAtlas.src='assets/sprites/astronaut-animated.svg';
 function drawAstronautFrame(ctx,index,x,y,w,h){
  if(!astronautReady)return false;
  ctx.drawImage(astronautAtlas,(index%8)*W,Math.floor(index/8)*W,W,W,x,y,w,h);
  return true;
 }
 function draw(ctx,index,x,y,w,h,alpha=1){
  if(!ready)return false;
  ctx.save();ctx.globalAlpha*=alpha;
  ctx.drawImage(image,(index%8)*W,Math.floor(index/8)*W,W,W,x,y,w,h);
  ctx.restore();return true;
 }
 function platform(ctx,q,time,reduced){
  const index={standard:4,narrow:7,crumble:5,drift:6,spikes:4}[q.type]??4;
  ctx.save();
  if(!reduced){ctx.shadowColor=q.type==='crumble'?'#ff9b43':'#4ddfff';ctx.shadowBlur=8+Math.sin(time*2+q.x)*2;}
  // Keep the platform body on one stable frame. Different generated
  // frames have different centring and visible neighbouring fragments.
  // Animate only the glow; this prevents jumping/sliding sprite geometry.
  const realIndex=q.type==='crumble'?12:q.type==='drift'?8:
   q.type==='narrow'?2:q.type==='spikes'?0:0;
  const ok=drawReal(ctx,realIndex,q.x,q.y-23,q.w,62,18)||
   draw(ctx,index,q.x,q.y-20,q.w,63);
  ctx.restore();
  if(!ok)return false;
  if(q.type==='spikes'){
   ctx.save();ctx.shadowColor='#ff506f';ctx.shadowBlur=reduced?0:8;
   // Respect the actual left/right spike lengths set by the game engine.
   for(const [a,b] of [[q.x,q.x+(q.spikeLeft||0)],[q.x+q.w-(q.spikeRight||0),q.x+q.w]]){
    for(let x=a;x<b-7;x+=11){
     ctx.beginPath();ctx.moveTo(x,q.y);ctx.lineTo(x+5.5,q.y-15);ctx.lineTo(x+11,q.y);ctx.closePath();
     ctx.fillStyle='#ff577a';ctx.fill();ctx.strokeStyle='#ffd0d8';ctx.lineWidth=1.2;ctx.stroke();
    }
   }
   ctx.restore();
  }
  if(q.type==='crumble'&&q.crumble!==null){
   ctx.fillStyle='#ffac55';ctx.fillRect(q.x,q.y-5,Math.max(0,q.w*q.crumble/.7),3);
  }
  return true;
 }
 function astronaut(ctx,p,held,time,reduced){
  if(held.left&&!held.right)lastFacing=-1;
  else if(held.right&&!held.left)lastFacing=1;
  if(!astronautReady&&!rasterReady)return false;
  const hurt=p.inv>0;
  if(hurt&&Math.floor(time*12)%2===0)return true;
  const airborne=p.vy<0||p.flight>0;
  const running=!!(held.left||held.right);
  const falling=p.vy>140;
  const index=hurt?20+(reduced?0:Math.floor(time*7)%4):
   (airborne||falling)?10+(reduced?0:Math.floor(time*9)%6):
   running?4+(reduced?0:Math.floor(time*12)%6):28+(reduced?0:Math.floor(time*3)%4);
  const rasterIndex=hurt?15:airborne?13:falling?14:running?8+(reduced?0:Math.floor(time*12)%4):8;
  const side=index>=4&&index<16||index>=28;
  const cx=p.x+13,cy=p.y+19;
  ctx.save();
  // Exhaust is a world-space vertical effect. It must never inherit the
  // character's left/right mirroring or the diagonal shape of atlas frame 30.
  if(airborne&&!reduced){
   const flicker=Math.sin(time*22)*4;
   ctx.save();
   ctx.fillStyle='#28cfff';ctx.shadowColor='#46eaff';ctx.shadowBlur=12;
   ctx.beginPath();
   ctx.moveTo(cx-7,cy+24);ctx.lineTo(cx,cy+47+flicker);
   ctx.lineTo(cx+7,cy+24);ctx.closePath();ctx.fill();
   ctx.fillStyle='#e1ffff';ctx.beginPath();
   ctx.moveTo(cx-3,cy+26);ctx.lineTo(cx,cy+38+flicker*.5);
   ctx.lineTo(cx+3,cy+26);ctx.closePath();ctx.fill();
   ctx.restore();
  }
  ctx.translate(cx,cy);
  // Flip the astronaut only; the jet exhaust stays vertical.
  const facingLeft=lastFacing<0;
  if(facingLeft&&(rasterReady?rasterIndex>=8&&rasterIndex<=14:side))ctx.scale(-1,1);
  const ok=(rasterReady&&drawRaster(ctx,rasterIndex,-34,-36,68,72))||
   drawAstronautFrame(ctx,index,-34,-36,68,72);
  ctx.restore();
  // Shield indicator floats above the helmet, leaving the character unobscured.
  if(p.shield){
   ctx.save();
   const bob=reduced?0:Math.sin(time*3)*2;
   ctx.translate(cx,cy-51+bob);
   if(!reduced){ctx.shadowColor='#5deaff';ctx.shadowBlur=10;}
   if(!draw(ctx,12,-12,-14,24,28)){
    ctx.strokeStyle='#7ceaff';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(10,-6);
    ctx.lineTo(9,5);ctx.lineTo(0,12);ctx.lineTo(-9,5);
    ctx.lineTo(-10,-6);ctx.closePath();ctx.stroke();
   }
   ctx.restore();
  }
  return ok;
 }
 function pickup(ctx,item,time,reduced){
  const index={crystal:9,core:10,shield:12,flight:15,reserve:14}[item.type];
  if(index===undefined)return false;
  const bob=reduced?0:Math.sin(time*3+item.x)*3;
  const scale=reduced?1:1+Math.sin(time*4+item.x)*.055;
  ctx.save();ctx.translate(item.x,item.y+bob);ctx.scale(scale,scale);
  if(!reduced){ctx.shadowColor=item.type==='core'?'#ffbd50':'#54eaff';ctx.shadowBlur=9;}
  const realIndex={crystal:26,core:27,shield:29,flight:28,reserve:30}[item.type];
  const ok=drawReal(ctx,realIndex,-17,-19,34,38)||draw(ctx,index,-17,-19,34,38);
  ctx.restore();return ok;
 }
 function mine(ctx,m,time,reduced){
  const n=m.count>=8?21:m.count>=4?20:m.count>=2?19:18;
  ctx.save();ctx.translate(m.x,m.y);
  if(!reduced)ctx.rotate(time*.5);
  const realIndex=m.count>=8?25:m.count>=4?24:m.count>=2?23:22;
  const ok=drawReal(ctx,realIndex,-23,-23,46,46)||draw(ctx,n,-23,-23,46,46);
  ctx.restore();return ok;
 }
 function laser(ctx,l,time,reduced){
  const active=l.age>=1.2;
  ctx.save();
  const pulse=reduced?1:1+Math.sin(time*22)*.1;
  ctx.shadowColor=active?'#ff426b':'#ffae64';ctx.shadowBlur=reduced?0:16;
  ctx.strokeStyle=active?'#ff496b':'#ffb16e';ctx.lineWidth=active?7*pulse:2;
  if(!active)ctx.setLineDash([8,8]);
  ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+l.w,l.y);ctx.stroke();
  ctx.setLineDash([]);
  if(active){ctx.strokeStyle='#fff1df';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(l.x+l.w,l.y);ctx.stroke();}
  const ok=drawReal(ctx,19+(active?2:0),l.x-20,l.y-23,40,46)||draw(ctx,17,l.x-15,l.y-19,30,38);
  ctx.restore();return ok;
 }
 return Object.freeze({draw,platform,astronaut,pickup,mine,laser,isReady:()=>ready||realisticReady});
})();
