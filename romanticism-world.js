/* An animated explanatory diagram, in the same spirit as the Renaissance page's projection
   model: one persistent abstract geometry (a horizon, a cliff, a figure, a viewer's eye, and
   sightlines between them) whose parameters animate continuously through each chapter, rather
   than photographs with circles and arrows drawn on top. Real paintings appear only as the
   separate side-by-side comparison screens already in the page, and once, at the very end, the
   diagram itself dissolves into the real painting — the same move the Renaissance page makes
   when its geometry resolves into Raphael's School of Athens.
   (The hands-on experience page keeps its own separate hand-drawn renderer in
   romanticism-graphics.js; this file no longer depends on it.) */
(() => {
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
  const GOLD='#e4bc78',CYAN='#8edfd6',RED='#ff8a6a',CREAM='#f3ecd8';

  function loadImage(src){const img=new Image();img.ready=false;img.onload=()=>{img.ready=true;};img.src=src;return img;}
  const wanderer=loadImage('romanticism-wanderer.jpg');
  const turner=loadImage('romanticism-turner-hannibal.jpg');
  const horatii=loadImage('romanticism-horatii.jpg');

  function sourceRect(img,w,h,zoom,fx,fy,fit){
    const iw=img.naturalWidth||1,ih=img.naturalHeight||1;
    const base=fit==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih);
    const scale=base*(zoom||1);
    const sw=Math.min(iw,w/scale),sh=Math.min(ih,h/scale);
    const sx=clamp(fx*iw-sw/2,0,iw-sw),sy=clamp(fy*ih-sh/2,0,ih-sh);
    return {sx,sy,sw,sh,scale};
  }
  function drawFit(ctx,img,w,h,zoom,fx,fy,fit,alpha){
    if(!img.ready||alpha<=.003)return;
    const r=sourceRect(img,w,h,zoom,fx,fy,fit);
    const dw=r.sw*r.scale,dh=r.sh*r.scale,dx=(w-dw)/2,dy=(h-dh)/2;
    ctx.save();ctx.globalAlpha=clamp(alpha);ctx.drawImage(img,r.sx,r.sy,r.sw,r.sh,dx,dy,dw,dh);ctx.restore();
  }
  // A small framed reference card — real brushwork, right beside the diagram it grounds —
  // so an actual painting shows up inside every chapter, not only in the separate compare
  // screens. Positioned bottom-right, clear of the masthead, the footer, and the slider.
  function drawArtInset(ctx,w,h,img,alpha,fx,fy,zoom,credit){
    if(!img.ready||alpha<=.01)return;
    const iw=Math.min(w*.15,150),ih=iw*1.12,ix=w*.89-iw/2,iy=h*.72-ih/2;
    ctx.save();ctx.globalAlpha=alpha;
    ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=18;ctx.shadowOffsetY=5;
    ctx.fillStyle='#0b0e13';ctx.fillRect(ix-5,iy-5,iw+10,ih+10);
    ctx.restore();
    ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();ctx.rect(ix,iy,iw,ih-20);ctx.clip();
    const r=sourceRect(img,iw,ih-20,zoom||1,fx??.5,fy??.5,'cover');
    ctx.drawImage(img,r.sx,r.sy,r.sw,r.sh,ix,iy,iw,ih-20);
    ctx.restore();
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='rgba(228,188,120,.6)';ctx.lineWidth=1;ctx.strokeRect(ix,iy,iw,ih-20);
    if(credit){ctx.font=`8px Arial, sans-serif`;ctx.fillStyle='#cfc9bb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(credit,ix+iw/2,iy+ih-10);}
    ctx.restore();
  }

  function pillRect(ctx,x,y,w,h,r){
    ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }
  // Small attached labels only — the way the Renaissance page names "눈" or "그림판" right next
  // to the point in the diagram, never a headline sitting alone in the middle of the screen.
  function label(ctx,text,x,y,alpha,color,align){
    if(alpha<=.01)return;
    ctx.save();ctx.globalAlpha=clamp(alpha);ctx.font=`11px Arial, 'Malgun Gothic', sans-serif`;
    ctx.textAlign=align||'center';ctx.textBaseline='middle';
    const w=ctx.measureText(text).width;let x0=x-w/2;if(align==='left')x0=x;if(align==='right')x0=x-w;
    ctx.fillStyle='rgba(8,11,19,.86)';pillRect(ctx,x0-7,y-9.5,w+14,19,4);ctx.fill();
    ctx.fillStyle=color||CREAM;ctx.shadowColor=color||CREAM;ctx.shadowBlur=4;ctx.fillText(text,x,y);
    ctx.restore();
  }
  function dot(ctx,x,y,r,alpha,color){
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color||GOLD;ctx.shadowColor=color||GOLD;ctx.shadowBlur=r*2.5;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function ray(ctx,x1,y1,x2,y2,time,alpha,color,speed){
    if(alpha<=.01)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color||GOLD;ctx.lineWidth=1;ctx.setLineDash([2,5]);
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    const tt=(time*(speed||.22))%1;
    dot(ctx,mix(x1,x2,tt),mix(y1,y2,tt),2.2,alpha,color);
  }
  function drawHorizon(ctx,w,h,y,alpha){
    if(alpha<=.01)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='rgba(228,188,120,.4)';ctx.lineWidth=1;ctx.setLineDash([2,7]);
    ctx.beginPath();ctx.moveTo(w*.06,y);ctx.lineTo(w*.94,y);ctx.stroke();ctx.restore();
  }
  // The rock is drawn once as a single clean silhouette — solid fill, hard edge, no photographic
  // texture — so it visually argues "defined, certain" purely through how it's constructed.
  function drawCliff(ctx,x0,y0,scale,alpha){
    if(alpha<=.01)return;
    ctx.save();ctx.globalAlpha=alpha;
    const g=ctx.createLinearGradient(x0,y0-26*scale,x0,y0+70*scale);
    g.addColorStop(0,'#221c15');g.addColorStop(1,'#0a0806');
    ctx.fillStyle=g;ctx.strokeStyle='rgba(228,188,120,.55)';ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(x0-46*scale,y0+70*scale);ctx.lineTo(x0-34*scale,y0+8*scale);ctx.lineTo(x0-8*scale,y0-26*scale);
    ctx.lineTo(x0+9*scale,y0-8*scale);ctx.lineTo(x0+36*scale,y0+42*scale);ctx.lineTo(x0+46*scale,y0+70*scale);
    ctx.closePath();ctx.fill();ctx.stroke();
    // A thin lit edge along the top face reads as a single, deliberate highlight rather than texture.
    ctx.strokeStyle='rgba(255,224,168,.5)';ctx.beginPath();ctx.moveTo(x0-34*scale,y0+8*scale);ctx.lineTo(x0-8*scale,y0-26*scale);ctx.lineTo(x0+9*scale,y0-8*scale);ctx.stroke();
    ctx.restore();
  }
  // Concentric, gently breathing rings stand for "the unknown" — an edge that keeps moving,
  // rather than a shape with a fixed outline. Their radius is the same value that shrinks the
  // figure beside them, so scale (chapter 3) is one parameter change, not a new drawing.
  function drawUnknownField(ctx,cx,cy,radius,time,alpha,tone){
    if(alpha<=.01||radius<=1)return;
    ctx.save();ctx.globalAlpha=alpha;
    for(let i=0;i<5;i++){
      const r=radius*(.4+i*.15)+Math.sin(time*.35+i*1.3)*radius*.025;
      const warm=tone===undefined?0:tone;
      const c=warm>0?`rgba(${mix(180,255,warm)|0},${mix(200,150,warm)|0},${mix(220,110,warm)|0},${.2-i*.028})`
                    :`rgba(${mix(180,255,-warm)|0},${mix(200,140,-warm)|0},${mix(220,120,-warm)|0},${.2-i*.028})`;
      ctx.strokeStyle=c;ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,Math.max(1,r),0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  // The Rückenfigur pictogram: a head and a body, reduced to the minimum that still reads as
  // "a person, facing away" — deliberately schematic, the way a diagram figure should be.
  function drawFigureGlyph(ctx,x,y,scale,alpha,color){
    if(alpha<=.01||scale<=.02)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color||CREAM;ctx.fillStyle=color||CREAM;ctx.lineWidth=Math.max(.6,1.6*scale);
    ctx.beginPath();ctx.arc(x,y-15*scale,4.2*scale,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(x,y-11*scale);ctx.lineTo(x,y+11*scale);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y+11*scale);ctx.lineTo(x-7*scale,y+24*scale);ctx.moveTo(x,y+11*scale);ctx.lineTo(x+7*scale,y+24*scale);ctx.stroke();
    ctx.restore();
  }
  function drawEyeGlyph(ctx,x,y,r,alpha,color){
    if(alpha<=.01)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color||CYAN;ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=color||CYAN;ctx.beginPath();ctx.arc(x,y,r*.32,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function drawTimeline(ctx,w,h,drawP,alpha){
    if(alpha<=.01)return;
    const y=h*.62,x0=w*.28,x1=w*.72,draw=smooth(drawP);
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='rgba(228,188,120,.55)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x0+(x1-x0)*draw,y);ctx.stroke();ctx.restore();
    const points=[{t:.08,year:'1789',text:'Revolution'},{t:.5,year:'1804–15',text:'Napoleonic Wars'},{t:.94,year:'1818',text:'This painting'}];
    for(const p of points){
      if(draw<p.t)continue;
      const px=x0+(x1-x0)*p.t,localA=clamp((draw-p.t)*6)*alpha;
      if(localA<=.01)continue;
      dot(ctx,px,y,2.6,localA,GOLD);
      label(ctx,p.year,px,y-16,localA);label(ctx,p.text,px,y+16,localA);
    }
  }

  function drawAtmosphere(ctx,w,h,horizonY){
    const g=ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#0a0f1c');g.addColorStop(horizonY/h*.85,'#0d1626');g.addColorStop(1,'#04070c');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    const glow=ctx.createRadialGradient(w*.5,horizonY,0,w*.5,horizonY,w*.4);
    glow.addColorStop(0,'rgba(90,110,140,.18)');glow.addColorStop(1,'rgba(90,110,140,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  }
  function scene(ctx,w,h,time,index,pRaw,reduced){
    const p=smooth(pRaw);
    const cx=w*.5,horizonY=h*.42,figureY=horizonY+h*.06,eyeX=w*.5,eyeY=h*.78;
    drawAtmosphere(ctx,w,h,horizonY);

    if(index===0){
      // The figure and the viewer's eye appear, then two dotted sightlines animate outward —
      // his gaze forward, the viewer's gaze onto him — converging near the same point.
      const inA=smooth(p/.35);
      drawHorizon(ctx,w,h,horizonY,inA*.8);
      drawCliff(ctx,cx,figureY+18,1,inA);
      drawFigureGlyph(ctx,cx,figureY,1.4,inA,CREAM);
      const eyeA=smooth((p-.3)/.25);
      drawEyeGlyph(ctx,eyeX,eyeY,7,eyeA,CYAN);
      const rayA=smooth((p-.45)/.3);
      ray(ctx,cx,figureY-32,cx+w*.05,horizonY-h*.1,time,rayA,GOLD,.18);
      ray(ctx,eyeX,eyeY-8,cx+4,figureY+4,time,rayA,CYAN,.3);
      if(rayA>.3){label(ctx,'his gaze',cx+w*.05+10,horizonY-h*.1-4,rayA,GOLD,'left');label(ctx,'your gaze',eyeX,eyeY-20,rayA,CYAN);}
      if(p>.82)label(ctx,'RÜCKENFIGUR',cx,figureY+50,smooth((p-.82)/.18),CREAM);
      drawArtInset(ctx,w,h,wanderer,smooth((p-.18)/.2),.5,.33,2.1,'Friedrich, 1818');
    }else if(index===1){
      // The same cliff, drawn with total certainty, sits beside a field whose edge keeps
      // moving — reality and the unknown as two ways of drawing a line, not two captions.
      drawHorizon(ctx,w,h,horizonY,.7);
      drawCliff(ctx,cx*.72,figureY+18,1,1);
      drawFigureGlyph(ctx,cx*.72,figureY,1.3,1,CREAM);
      const fieldR=mix(h*.05,h*.22,smooth(p));
      drawUnknownField(ctx,cx*1.22,horizonY-h*.02,fieldR,time,1,0);
      const realA=Math.min(smooth((p-.08)/.14),smooth((.42-p)/.14));
      const unkA=Math.min(smooth((p-.5)/.14),smooth((.92-p)/.14));
      label(ctx,'REALITY',cx*.72,figureY+46,realA,GOLD);
      label(ctx,'THE UNKNOWN',cx*1.22,horizonY+h*.16,unkA,CYAN);
      drawArtInset(ctx,w,h,wanderer,smooth((p-.2)/.2),.5,.58,1.8,'Friedrich, 1818');
    }else if(index===2){
      // The same unknown-field radius that stood for fog now grows until it dwarfs the same
      // figure glyph — awe and terror as one shape read two ways, warm gold bleeding into red.
      const grow=smooth(p);
      const fieldR=mix(h*.1,h*.34,grow);
      const tone=Math.sin(p*Math.PI*1.4);
      drawUnknownField(ctx,cx,horizonY,fieldR,time,1,tone);
      drawHorizon(ctx,w,h,horizonY,.5);
      drawFigureGlyph(ctx,cx,figureY,mix(1.3,.4,grow),1,CREAM);
      const aweA=Math.min(smooth((p-.05)/.15),smooth((.35-p)/.15));
      const terrorA=Math.min(smooth((p-.4)/.12),smooth((.7-p)/.12));
      label(ctx,'AWE',cx-w*.09,horizonY+h*.14,aweA,GOLD);
      label(ctx,'TERROR',cx+w*.09,horizonY+h*.14,terrorA,RED);
      if(p>.8)label(ctx,'THE SUBLIME',cx,figureY+56,smooth((p-.8)/.2),CREAM);
      const insetSwap=smooth((p-.45)/.15);
      drawArtInset(ctx,w,h,wanderer,smooth((p-.1)/.15)*(1-insetSwap),.5,.45,1.15,'Friedrich, 1818');
      drawArtInset(ctx,w,h,turner,insetSwap,.4,.4,1.1,'Turner, 1812');
    }else if(index===3){
      // The drawn timeline is the whole scene for a moment; the steady figure returns beside
      // it as the decade's turbulence gives way to one person's unshaken attention.
      const timelineA=Math.max(0,1-smooth((p-.5)/.4));
      drawTimeline(ctx,w,h,clamp(p/.4,0,1),timelineA);
      drawHorizon(ctx,w,h,horizonY,.5);
      drawFigureGlyph(ctx,cx,figureY,1.3,1,CREAM);
      if(p>.55)label(ctx,'not trembling',cx,figureY+46,smooth((p-.55)/.3),GOLD);
      drawArtInset(ctx,w,h,wanderer,smooth((p-.75)/.2),.5,.5,1.05,'Friedrich, 1818');
    }else{
      // A scatter of small figures — the crowd of a history painting — travels inward and
      // becomes the one glyph left standing, which then dissolves into the real painting.
      const merge=smooth(clamp(p/.55));
      const seeds=[[-.30,-.05],[-.20,.08],[-.12,-.1],[.14,.07],[.24,-.06],[.32,.04],[-.08,.14],[.08,-.13]];
      for(const [sx,sy] of seeds){
        const x=mix(cx+sx*w,cx,merge),y=mix(figureY+sy*h*.3,figureY,merge),a=(1-merge*.95);
        if(a>.03)drawFigureGlyph(ctx,x,y,.55,a,'rgba(228,188,120,.8)');
      }
      drawHorizon(ctx,w,h,horizonY,.5*(1-merge*.6));
      drawFigureGlyph(ctx,cx,figureY,1.3,1,CREAM);
      if(p>.4&&p<.85)label(ctx,'THE INDIVIDUAL',cx,figureY+50,Math.min(smooth((p-.4)/.15),smooth((.85-p)/.15)),GOLD);
      const artA=smooth((p-.72)/.28);
      drawArtInset(ctx,w,h,horatii,Math.min(smooth((p-.05)/.12),smooth((.4-p)/.12)),.5,.42,1.15,'David, 1784');
      if(artA>.01)drawFit(ctx,wanderer,w,h,mix(1.4,1,artA),.5,.46,'cover',artA);
    }
  }

  window.drawRomanticWorld=function(ctx,w,h,time,index,amount,settings={}){
    scene(ctx,w,h,time,index,amount,settings.reduced);
    if(settings.transition>0){
      const a=Math.sin(settings.transition*Math.PI)*.4;
      const g=ctx.createLinearGradient(0,0,w,h);
      g.addColorStop(0,`rgba(173,188,207,${a*.1})`);g.addColorStop(.5,`rgba(196,205,216,${a})`);g.addColorStop(1,`rgba(173,188,207,${a*.15})`);
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }
  };
})();
