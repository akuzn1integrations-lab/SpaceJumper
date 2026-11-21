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
  const isCrumble=q.type==='crumble';
  const isNarrow=q.type==='narrow';
  const isSpikes=q.type==='spikes';
  const isDrift=q.type==='drift';
  ctx.save();
  // Static light: animated shadowBlur was causing visible platform flicker.
  ctx.shadowColor=isCrumble?'#a854ee':'#4ddfff';
  ctx.shadowBlur=6;
  // All platform types use the same full-depth metal body. The narrow
  // platform is resized in width only; its vertical thickness stays fixed.
  // A single, trimmed source frame avoids the atlas' right-edge artefact.
  const realIndex=isDrift?8:0;
  const ok=drawReal(ctx,realIndex,q.x,q.y-23,q.w,62,18)||
   draw(ctx,isCrumble?7:isDrift?6:4,q.x,q.y-20,q.w,63);
  ctx.restore();
  if(!ok)return false;
  if(isCrumble){
   // A visibly aged, worn deck: rust-brown metal, faded edge lighting,
   // chipped plating and dark structural fractures. Fixed geometry/no flicker.
   ctx.save();
   const x=q.x,y=q.y-13,w=q.w;
   ctx.beginPath();ctx.roundRect(x+5,y,w-10,23,5);ctx.clip();
   ctx.fillStyle='rgba(48,27,32,.79)';ctx.fillRect(x+5,y,w-10,23);
   const rust=ctx.createLinearGradient(0,y,0,y+23);
   rust.addColorStop(0,'rgba(154,111,77,.85)');
   rust.addColorStop(.38,'rgba(93,65,62,.65)');
   rust.addColorStop(1,'rgba(34,28,39,.9)');
   ctx.fillStyle=rust;ctx.fillRect(x+5,y,w-10,23);
   // Deterministic chipped patches keep the old-metal appearance stable.
   for(let i=0;i<9;i++){
    const px=x+10+(i+.4)*(w-20)/10;
    ctx.fillStyle=i%3===0?'#b18a69':i%3===1?'#48333b':'#6d5550';
    ctx.fillRect(px,y+2+(i*7)%13,Math.max(3,w/35),2+(i%3));
   }
   ctx.strokeStyle='#29202b';ctx.lineWidth=2.5;
   const crack=q.crumble===null?.25:Math.min(1,1-q.crumble/.7);
   for(const k of [.28,.64]){
    const px=x+w*k;
    ctx.beginPath();ctx.moveTo(px,y);
    ctx.lineTo(px+w*.035,y+8);
    ctx.lineTo(px-w*.025,y+14+crack*4);
    ctx.lineTo(px+w*.015,y+23);ctx.stroke();
   }
   ctx.restore();
   // Amber, worn edge makes crumble platforms distinct from cyan standards.
   ctx.save();ctx.strokeStyle='#ba7754';ctx.lineWidth=2.5;
   ctx.beginPath();ctx.moveTo(x+9,y+20);ctx.lineTo(x+w-9,y+20);ctx.stroke();
   if(q.crumble!==null){
    ctx.fillStyle='#ffb36b';
    ctx.fillRect(x+7,y-3,Math.max(0,(w-14)*q.crumble/.7),3);
   }
   ctx.restore();
  }
  if(isSpikes){
   ctx.save();
   // Spikes are mounted ON the deck, within its visible upper surface.
   // Their tips cannot extend above the platform sprite silhouette.
   ctx.shadowBlur=0;
   const left=Math.max(0,q.spikeLeft||0),right=Math.max(0,q.spikeRight||0);
   const inset=Math.min(12,q.w*.11);
   const spans=[[q.x+inset,Math.min(q.x+left,q.x+q.w-inset)],
    [Math.max(q.x+q.w-right,q.x+inset),q.x+q.w-inset]];
   for(const [a,b] of spans){
    const width=b-a;
    if(width<6)continue;
    const count=Math.max(1,Math.floor(width/11));
    const step=width/count;
    for(let i=0;i<count;i++){
     const x=a+i*step;
     // Raster body occupies roughly q.y-13..q.y+10.
     ctx.beginPath();ctx.moveTo(x,q.y+2);
     ctx.lineTo(x+step/2,q.y-11);
     ctx.lineTo(x+step,q.y+2);ctx.closePath();
     ctx.fillStyle='#df526c';ctx.fill();
     ctx.strokeStyle='#ffbec5';ctx.lineWidth=1;ctx.stroke();
    }
   }
   ctx.restore();
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
  // All pickups use square source cells and uniform scale. Raster cells
  // were wide 256×128 crops, stretching tall crystals horizontally.
  const scale=reduced?1:1+Math.sin(time*4+item.x)*.035;
  ctx.save();ctx.translate(item.x,item.y+bob);ctx.scale(scale,scale);
  if(!reduced){ctx.shadowColor=item.type==='core'?'#ffbd50':'#54eaff';ctx.shadowBlur=7;}
  const ok=draw(ctx,index,-17,-19,34,38);
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
