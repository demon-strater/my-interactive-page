(() => {
  'use strict';
  const M=window.PerspectiveModel,{clamp,lerp,smooth,mix,imprint}=M;
  const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const SPEED=1.4;
  const compareOne=$('compareOne'),compareTwo=$('compareTwo');
  const titles=['그림과 공간의 착시에 대하여','원근법의 원리에 대하여','거리와 크기의 관계에 대하여','눈높이와 소실점에 대하여','명화 속 원근법에 대하여'];
  const hints=['화면을 옆으로 돌려 두께를 확인해 보세요','눈에서 뻗어나가는 빛의 선을 따라가 보세요','청록색 기둥을 앞뒤로 드래그해 보세요','눈의 높이를 위아래로 움직여 보세요','선을 따라 그림 속으로 들어가 보세요'];
  const gold='#e4bc78',cyan='#8edfd6',ink='#f4e9d5';
  // Autoplay freezes the scene at each window's start and holds it for the given real-world duration
  // (in ms) so the example artworks never animate underneath the narration — they fully replace it, then hand back.
  // Windows sit right at a chapter boundary (M.chapter switches at 8/18/30/40) so the artworks land only
  // once a whole chapter has finished narrating, never mid-chapter. The last entry holds on the finished
  // artwork before looping back to the start, so the piece runs on its own with no player chrome at all.
  // Every window gives the paintings a few seconds on their own before the captions, construction
  // lines and vanishing points fade in on top (see the transition delays in renaissance.css), so the
  // hold has to cover looking first and reading after. The last entry pauses on the finished School of
  // Athens for the same reason, before its guides draw in. updateUI indexes windows 0 and 1 by
  // position, so new windows are appended rather than inserted.
  const compareWindows=[{start:17.5,end:18,hold:7500},{start:39.5,end:40,hold:10000},{start:50,end:0,hold:5000,loop:true},{start:47.6,end:47.6,hold:2600}];
  let holdRemaining=null,holdAt=null,lingering=false;
  document.querySelectorAll('.compare-grid').forEach(grid=>{
    grid.addEventListener('mouseenter',()=>{lingering=true;});
    grid.addEventListener('mouseleave',()=>{lingering=false;});
  });
  let width=1,height=1,time=reduced.matches?7:0,playing=!reduced.matches,last=0,raf=0,currentChapter=-1;
  let manual={},drag=null,targets={},view=null,artReady=false,artFailed=false,showArtLines=true;
  const artwork=new Image();
  const plane=[[-3.2,-.45,-3],[3.2,-.45,-3],[3.2,4.5,-3],[-3.2,4.5,-3]];
  let hallCache={length:0,mesh:null};

  function path(points,close=true){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(close)ctx.closePath();}
  function line(a,b,color,alpha=1,weight=1,dash=[]){
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
  }
  function dot(p,color,r=3,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=r*3;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.restore();}
  function label(text,p,color=ink,alpha=1,align='center',size=11){
    ctx.save();ctx.globalAlpha=alpha;ctx.font=`${size}px Arial, 'Malgun Gothic', sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';
    const w=ctx.measureText(text).width;let x=p.x-w/2;if(align==='left')x=p.x;if(align==='right')x=p.x-w;
    ctx.fillStyle='#120f0ce8';ctx.fillRect(x-7,p.y-11,w+14,22);ctx.fillStyle=color;ctx.fillText(text,p.x,p.y);ctx.restore();
  }
  function polygon(points,fill,stroke,alpha=1,weight=.7){ctx.save();ctx.globalAlpha=alpha;path(points);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=weight;ctx.stroke();}ctx.restore();}
  function face(mesh,points,fill,stroke='#a68b5c'){mesh.push({points,fill,stroke});}
  function box(mesh,x,y,z,w,h,d,color){
    const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y+h,z-d/2],e=[x-w/2,y+h,z-d/2];
    const A=[a[0],a[1],z+d/2],B=[b[0],b[1],z+d/2],C=[c[0],c[1],z+d/2],E=[e[0],e[1],z+d/2];
    face(mesh,[a,b,c,e],color);face(mesh,[b,B,C,c],color);face(mesh,[A,a,e,E],color);face(mesh,[e,c,C,E],color);
  }
  function column(mesh,x,z,color){
    const base=color===cyan?'#31534e':'#625032',body=color===cyan?'#568e85':'#987644';
    box(mesh,x,0,z,.78,.16,.78,base);box(mesh,x,.16,z,.58,.12,.58,body);
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
      face(mesh,[[x+Math.cos(a)*.22,.28,z+Math.sin(a)*.22],[x+Math.cos(b)*.22,.28,z+Math.sin(b)*.22],[x+Math.cos(b)*.22,2.37,z+Math.sin(b)*.22],[x+Math.cos(a)*.22,2.37,z+Math.sin(a)*.22]],body,color);
    }
    box(mesh,x,2.37,z,.58,.1,.58,body);box(mesh,x,2.47,z,.78,.13,.78,base);
    mesh.forEach(f=>f.stroke=color);return mesh;
  }
  function hall(length){
    // Reuse geometry; the last floor strip extends continuously in chapter 4.
    const end=Math.round(length*10)/10;
    if(end===hallCache.length)return hallCache.mesh;
    const mesh=[];
    face(mesh,[[-3.8,0,0],[3.8,0,0],[3.8,0,end],[-3.8,0,end]],'#201b13','#82704b');
    for(let z=0;z<end;z+=2)for(let x=-3;x<4;x++)if((x+Math.round(z/2))%2===0){
      face(mesh,[[x,0.005,z],[x+1,0.005,z],[x+1,0.005,Math.min(end,z+2)],[x,0.005,Math.min(end,z+2)]],'#30291c','#524630');
    }
    for(let z=0;z<=end;z+=4){
      for(const x of [-3.5,3.5]){
        box(mesh,x,0,z,.65,.22,.78,'#51432c');box(mesh,x,.22,z,.38,2.96,.48,'#655438');box(mesh,x,3.18,z,.72,.18,.76,'#786344');
      }
      for(let j=0;j<20;j++){
        const a=j/20*Math.PI,b=(j+1)/20*Math.PI;
        const points=[[Math.cos(a)*3.5,3.27+Math.sin(a)*1.6,z],[Math.cos(b)*3.5,3.27+Math.sin(b)*1.6,z],[Math.cos(b)*3.72,3.27+Math.sin(b)*1.84,z],[Math.cos(a)*3.72,3.27+Math.sin(a)*1.84,z]];
        face(mesh,points,'#55462e','#9a8054');
      }
      if(z<end)for(const x of [-3.5,3.5])face(mesh,[[x,3.25,z],[x,3.25,Math.min(z+4,end)],[x,3.42,Math.min(z+4,end)],[x,3.42,z]],'#605035','#b49660');
    }
    hallCache={length:end,mesh};return mesh;
  }
  function drawMesh(mesh,project,alpha=1,flat=false){
    const faces=mesh.map(f=>({f,p:f.points.map(project),depth:flat?f.points.reduce((a,p)=>a+p[2],0)/f.points.length:0}));
    if(!flat)faces.forEach(f=>f.depth=f.p.reduce((a,p)=>a+p.z,0)/f.p.length);
    faces.sort((a,b)=>b.depth-a.depth);
    for(const {f,p} of faces)polygon(p,f.fill,f.stroke,alpha,.6);
  }
  function rects(s){
    const narrow=width<700,shown=s.inset;
    if(narrow){
      const iw=Math.min(width*.69,height*.52*6.4/4.95),ih=iw*4.95/6.4;
      return {main:{x:0,y:0,w:width,h:lerp(height,height*.55,shown)},inset:{x:(width-iw)/2,y:height-ih-22,w:iw,h:ih}};
    }
    const iw=Math.min(width*.31,height*.8*6.4/4.95),ih=iw*4.95/6.4;
    return {main:{x:0,y:0,w:width*(1-.36*shown),h:height},inset:{x:width-iw-60,y:(height-ih)/2,w:iw,h:ih}};
  }
  function makeView(s,r){
    const frontScale=Math.min(r.w*.76/6.4,r.h*.82/4.95);
    const sideScale=Math.min(r.w*.9/29,r.h*.74/10);
    const scale=lerp(frontScale,sideScale,s.turn);
    return M.camera(mix([0,2.025,-3],[0,1.5,7],s.turn),-1.12*s.turn,.24*s.turn,scale,r.x+r.w*.5,r.y+r.h*.51);
  }
  function planeImage(s,project,room,columns){
    const p=plane.map(project);
    polygon(p,'#17150f',gold,1,1.1);
    // A second parallel edge makes the thinness of the painted surface visible.
    if(s.turn>.05)polygon([plane[1],plane[2],[3.2,4.5,-2.94],[3.2,-.45,-2.94]].map(project),'#a48856','#dbc58d',1,.8);
    ctx.save();path(p);ctx.clip();
    const toPlane=p=>project(imprint(p,s.eye));
    drawMesh(room,toPlane,1,true);drawMesh(columns,toPlane,1,true);
    if(s.horizon>0&&s.art<.95){
      const a=project([-3.2,s.eye,-3]),b=project([3.2,s.eye,-3]);
      line(a,b,gold,s.horizon*(1-s.art),1,[5,6]);
    }
    ctx.restore();
    if(s.turn>.4){const top=project([0,4.5,-3]);label('그림의 평면',{x:top.x,y:top.y-20},gold,s.turn);}
    return p;
  }
  function rays(s,project){
    if(s.rays<=0)return;
    const eye=[0,s.eye,-8],E=project(eye),a=s.rays;
    for(const [x,z,color] of [[-1.25,2,gold],[1.25,s.distance,cyan]]){
      const top=[x,2.6,z],bottom=[x,0,z];
      polygon([E,project(top),project(bottom)],color,null,.045*a);
      for(const P of [top,bottom]){
        const I=imprint(P,s.eye),end=mix(P,eye,a);
        line(project(P),project(end),color,.6*a,1.2);
        const bead=mix(P,eye,(s.t*.24+(P[1]?0:.42))%1);
        dot(project(bead),color,2.1,a);
        dot(project(I),color,3.2,a);
      }
    }
    dot(E,gold,5,a);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=gold;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(E.x,E.y,15,9,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    label('눈(시점)',{x:E.x,y:E.y+28},gold,a);
    targets.eye={x:E.x,y:E.y,r:28};
    if(s.chapter===3){
      const lo=project([0,.8,-8]),hi=project([0,3.2,-8]);line(lo,hi,gold,.5,1,[3,4]);
      arrow({x:hi.x,y:hi.y-14},-Math.PI/2,gold);arrow({x:lo.x,y:lo.y+14},Math.PI/2,gold);
    }
  }
  function arrow(p,angle,color){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.strokeStyle=color;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-5,-4);ctx.lineTo(0,0);ctx.lineTo(-5,4);ctx.stroke();ctx.restore();
  }
  function sameSize(s,project){
    if(s.compare<.01)return;
    const a=s.compare;
    for(const [x,z,color] of [[-1.25,2,gold],[1.25,s.distance,cyan]]){
      const top=project([x-.6,2.6,z]),base=project([x-.6,0,z]);
      line(top,base,color,a,1.4);line({x:top.x-4,y:top.y},{x:top.x+4,y:top.y},color,a,1.4);line({x:base.x-4,y:base.y},{x:base.x+4,y:base.y},color,a,1.4);
      label('같은 높이',{x:top.x,y:top.y-19},color,a,'center',10);
    }
    const a0=project([1.25,.03,2]),a1=project([1.25,.03,16]);line(a0,a1,cyan,.5*a,1,[4,5]);
    arrow(a0,Math.atan2(a0.y-a1.y,a0.x-a1.x),cyan);arrow(a1,Math.atan2(a1.y-a0.y,a1.x-a0.x),cyan);
    const p=project([1.25,1.3,s.distance]);targets.column={x:p.x,y:p.y,r:Math.max(28,Math.abs(project([1.25,2.6,s.distance]).y-project([1.25,0,s.distance]).y)/2)};
    ctx.save();ctx.globalAlpha=.7*a;ctx.strokeStyle=cyan;ctx.setLineDash([3,5]);ctx.beginPath();ctx.ellipse(p.x,p.y,targets.column.r*.63,targets.column.r+8,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function inset(s,r,room,columns){
    if(s.inset<.01)return;
    ctx.save();ctx.globalAlpha=s.inset;
    const p2=p=>({x:r.x+(p[0]+3.2)/6.4*r.w,y:r.y+(4.5-p[1])/4.95*r.h,z:p[2]});
    ctx.shadowColor='#000';ctx.shadowBlur=28;ctx.fillStyle='#14120d';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.shadowBlur=0;
    ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();
    const project=p=>p2(imprint(p,s.eye));drawMesh(room,project,1,true);drawMesh(columns,project,1,true);
    const vp=p2([0,s.eye,-3]);
    if(s.horizon){
      line({x:r.x,y:vp.y},{x:r.x+r.w,y:vp.y},gold,s.horizon,1,[5,4]);
      // All depth-parallel rays converge to the vanishing point for the fixed plane.
      for(const P of [[-3.5,0,0],[3.5,0,0],[-3.5,3.4,0],[3.5,3.4,0]]){
        const from=project(P),to={x:lerp(from.x,vp.x,s.horizon),y:lerp(from.y,vp.y,s.horizon)};
        line(from,to,gold,.7*s.horizon,1.3);
        dot({x:lerp(from.x,vp.x,(s.t*.2)%1),y:lerp(from.y,vp.y,(s.t*.2)%1)},gold,2,s.horizon);
      }
      dot(vp,ink,3,s.horizon);
    }
    ctx.restore();ctx.strokeStyle='#c9a76d88';ctx.lineWidth=1;ctx.strokeRect(r.x,r.y,r.w,r.h);
    label('그림 위에 맺히는 상',{x:r.x+r.w/2,y:r.y-18},gold,1,'center',10);
    if(s.compare>.2){
      for(const [x,z,color] of [[-1.25,2,gold],[1.25,s.distance,cyan]]){
        const top=project([x,2.6,z]),bottom=project([x,0,z]);
        line({x:top.x+12,y:top.y},{x:bottom.x+12,y:bottom.y},color,s.compare,2.5);
      }
    }
    if(s.chapter===3){label('소실점',{x:vp.x,y:vp.y-17},gold,s.horizon,'center',10);label('눈높이',{x:r.x+r.w-7,y:vp.y+16},gold,s.horizon,'right',9);}
    ctx.restore();
  }
  function imageTriangle(image,dest,source,alpha){
    const [p0,p1,p2]=dest,[s0,s1,s2]=source;
    const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);
    if(Math.abs(den)<.001)return;
    const coeff=k=>[(p0[k]*(s1.y-s2.y)+p1[k]*(s2.y-s0.y)+p2[k]*(s0.y-s1.y))/den,(p0[k]*(s2.x-s1.x)+p1[k]*(s0.x-s2.x)+p2[k]*(s1.x-s0.x))/den,(p0[k]*(s1.x*s2.y-s2.x*s1.y)+p1[k]*(s2.x*s0.y-s0.x*s2.y)+p2[k]*(s0.x*s1.y-s1.x*s0.y))/den];
    const x=coeff('x'),y=coeff('y');ctx.save();ctx.globalAlpha=alpha;path(dest);ctx.clip();ctx.transform(x[0],y[0],x[1],y[1],x[2],y[2]);ctx.drawImage(image,0,0);ctx.restore();
  }
  function art(s,p){
    if(!s.art)return;
    if(!artReady){$('assetError').hidden=!artFailed;return;}
    // Texture shares the exact picture plane; the geometry-to-art dissolve never jumps to a modal.
    const dest=[p[3],p[2],p[1],p[0]],w=artwork.naturalWidth,h=artwork.naturalHeight;
    const uv=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
    imageTriangle(artwork,[dest[0],dest[1],dest[2]],[uv[0],uv[1],uv[2]],s.art);
    imageTriangle(artwork,[dest[0],dest[2],dest[3]],[uv[0],uv[2],uv[3]],s.art);
    const at=(u,v)=>({x:lerp(lerp(dest[0].x,dest[1].x,u),lerp(dest[3].x,dest[2].x,u),v),y:lerp(lerp(dest[0].y,dest[1].y,u),lerp(dest[3].y,dest[2].y,u),v)});
    if(showArtLines&&s.artGuides){
      const vp=at(.512,.471);
      for(const start of [[.282,.189],[.725,.184]]){
        const a=at(...start),b={x:lerp(a.x,vp.x,s.artGuides),y:lerp(a.y,vp.y,s.artGuides)};
        line(a,b,'#fff0a6',.9,2);dot(b,'#fff5c3',3);
      }
      ctx.save();ctx.globalAlpha=s.artGuides;ctx.strokeStyle='#fff0a6';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(vp.x,vp.y,13,0,Math.PI*2);ctx.stroke();ctx.restore();
      label('소실점',{x:vp.x,y:vp.y-25},'#fff1b9',s.artGuides);
      label('깊이 방향 · 도식',{x:dest[3].x+9,y:dest[3].y-16},ink,s.artGuides,'left',9);
    }
  }
  function render(){
    if(!ctx)return;
    const s=M.state(time,manual),r=rects(s);view=makeView(s,r.main);targets={};
    const dpr=Math.min(devicePixelRatio||1,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const room=hall(s.length),columns=[...column([],-1.25,2,gold),...column([],1.25,s.distance,cyan)];
    if(s.room){
      drawMesh(room,view,.62*s.room);drawMesh(columns,view,s.room);
      const baseA=view([-4,0,-8]),baseB=view([-4,0,s.length]);line(baseA,baseB,'#b8a17b',.16*s.room,1,[2,5]);
      const pos=view([0,5.4,10]);label('Space',pos,'#c2ae8c',s.room);
    }
    const corners=planeImage(s,view,room,columns);
    rays(s,view);sameSize(s,view);inset(s,r.inset,room,columns);art(s,corners);
    if(s.chapter===0&&time>3.8){const p=view([0,-.45,-3]);label('하나의 평평한 면',{x:p.x,y:p.y+25},gold,smooth(3.8,5,time));}
    if(s.chapter===4&&time<45){const p=view([0,-.45,-3]);label('원리에서 실제 그림으로',{x:p.x,y:p.y+24},gold,1-s.art);}
  }
  function updateUI(){
    const c=M.chapter(time);
    if(c!==currentChapter){
      currentChapter=c;$('sceneTitle').textContent=titles[c];$('sceneStatus').textContent=titles[c]+' '+hints[c];
      $('sceneCaption').replaceChildren(Object.assign(document.createElement('b'),{textContent:`${c+1} / ${titles.length}`}),titles[c]);
      $('artSource').hidden=c!==4;
    }
    $('playPause').textContent=playing?'Ⅱ':'▷';
    $('playPause').setAttribute('aria-label',playing?'영상 일시정지':'영상 재생');
    $('filmTime').textContent='00:'+String(Math.floor(time)).padStart(2,'0')+' / 00:50';
    $('filmFill').style.width=(time/50*100)+'%';
    [...$('progress').children].forEach((button,i)=>{button.classList.toggle('active',i===c);button.setAttribute('aria-current',i===c?'step':'false');});
    const showCompare1=time>=compareWindows[0].start&&time<compareWindows[0].end,showCompare2=time>=compareWindows[1].start&&time<compareWindows[1].end;
    compareOne.classList.toggle('visible',showCompare1);compareOne.setAttribute('aria-hidden',String(!showCompare1));
    compareTwo.classList.toggle('visible',showCompare2);compareTwo.setAttribute('aria-hidden',String(!showCompare2));
    document.body.classList.toggle('showing-comparison',showCompare1||showCompare2);
  }
  function frame(now){
    raf=0;if(document.hidden){last=0;return;}
    if(playing){
      const dt=last?Math.min(now-last,100):0;
      if(holdRemaining!==null){
        // The scene stays frozen (on an example artwork, or the finished painting at the very end); autoplay
        // only resumes once it's had its moment, then hands back — or loops back to the start. While the
        // pointer rests on the paintings the countdown waits too, so a viewer can look as long as they like.
        if(!lingering)holdRemaining-=dt;
        if(holdRemaining<=0){time=holdAt.end;if(holdAt.loop){manual={};currentChapter=-1;}holdRemaining=null;holdAt=null;}
      }else{
        const prev=time,next=Math.min(50,time+dt/1000*SPEED);
        const hit=compareWindows.find(w=>prev<w.start&&next>=w.start);
        if(hit){time=hit.start;holdAt=hit;holdRemaining=hit.hold;}
        else time=next;
      }
    }
    last=now;updateUI();render();if(playing)raf=requestAnimationFrame(frame);
  }
  function invalidate(){if(!raf)raf=requestAnimationFrame(frame);}
  function pause(){playing=false;last=0;holdRemaining=null;holdAt=null;invalidate();}
  function seek(chapter,autoplay=!reduced.matches){
    // Manual chapter jumps show the defining visual immediately, then continue its demonstration.
    const landing=reduced.matches?[7,16,26,36,50]:[0,11,19,32,44];time=landing[chapter];manual={};playing=autoplay;last=0;holdRemaining=null;holdAt=null;currentChapter=-1;invalidate();
  }
  [...$('progress').children].forEach((button,i)=>button.addEventListener('click',()=>seek(i,false)));
  $('playPause').addEventListener('click',()=>{if(playing)pause();else{if(time>=50){time=0;manual={};currentChapter=-1;holdRemaining=null;holdAt=null;}playing=true;last=0;invalidate();}});
  $('replay').addEventListener('click',()=>{time=0;manual={};playing=!reduced.matches;last=0;holdRemaining=null;holdAt=null;currentChapter=-1;invalidate();});
  addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();$('playPause').click();}});
  function setValue(kind,value){
    if(kind==='distance')manual.distance=clamp(value,2,16);else manual.eye=clamp(value,.8,3.2);
    invalidate();
  }
  function local(event){const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    const p=local(e),c=M.chapter(time),target=c===2?targets.column:c===3?targets.eye:null;
    if(!target||Math.hypot(p.x-target.x,p.y-target.y)>target.r+15)return;
    // Grabbing the column or the eye pauses the autoplay so the demonstration doesn't race ahead while it's held,
    // and stops the gesture from also being read as a swipe-to-navigate drag by the page-level listener.
    playing=false;last=0;holdRemaining=null;holdAt=null;
    drag={id:e.pointerId,kind:c===2?'distance':'eye'};canvas.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId||!view)return;
    const p=local(e);let value=0;
    // Orthographic scene projection: nearest point on the visible movement rail is the exact inverse.
    const lo=drag.kind==='distance'?2:.8,hi=drag.kind==='distance'?16:3.2;
    const a=view(drag.kind==='distance'?[1.25,1.3,lo]:[0,lo,-8]);
    const b=view(drag.kind==='distance'?[1.25,1.3,hi]:[0,hi,-8]);
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1));value=lerp(lo,hi,t);
    setValue(drag.kind,value);e.preventDefault();
  });
  function endDrag(e){
    if(!drag||drag.id!==e.pointerId)return;
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    drag=null;
    // Letting go hands control back to the film — it simply continues from here, still honoring the placement just made.
    playing=!reduced.matches;last=0;invalidate();
  }
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',()=>{drag=null;});
  canvas.addEventListener('keydown',e=>{
    const c=M.chapter(time),s=M.state(time,manual);
    if(c===2&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setValue('distance',s.distance+(e.key==='ArrowRight'?.5:-.5));}
    if(c===3&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setValue('eye',s.eye+(e.key==='ArrowUp'?.1:-.1));}
  });
  function resize(){
    const r=$('stage').getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);invalidate();
  }
  new ResizeObserver(resize).observe($('stage'));
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else invalidate();});
  reduced.addEventListener('change',()=>{if(reduced.matches)pause();});
  window.addEventListener('message',e=>{
    if(e.source!==parent||e.origin!==window.location.origin)return;
    if(e.data==='renaissance:resize')resize();
    if(e.data==='renaissance:enter')seek(0);
    if(e.data==='renaissance:leave')pause();
  });
  // Vanishing-point calibration: double-click anywhere on one of the three example artworks to move
  // its vanishing point (and the guide lines converging on it) to that spot. Saved per-browser so it
  // survives reloads, and logged to the console as exact percentages for reporting back.
  document.querySelectorAll('.img-wrap[data-vp-key]').forEach(wrap=>{
    const key='renaissance-vp-'+wrap.dataset.vpKey;
    const lines=wrap.querySelectorAll('.vp-lines line'),dot=wrap.querySelector('.vp-dot'),label=wrap.querySelector('.vp-label');
    function place(x,y){
      x=clamp(x,0,100);y=clamp(y,0,100);
      lines.forEach(l=>{l.setAttribute('x2',x);l.setAttribute('y2',y);});
      dot.style.left=x+'%';dot.style.top=y+'%';
      label.style.left=x+'%';label.style.top=y+'%';
    }
    const saved=localStorage.getItem(key);
    if(saved){const [sx,sy]=saved.split(',').map(Number);if(Number.isFinite(sx)&&Number.isFinite(sy))place(sx,sy);}
    wrap.addEventListener('dblclick',e=>{
      const r=wrap.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
      place(x,y);
      localStorage.setItem(key,x.toFixed(2)+','+y.toFixed(2));
      console.log(`[vanishing-point calibration] ${wrap.dataset.vpKey}: x=${x.toFixed(1)}%, y=${y.toFixed(1)}%`);
      // Give unlimited practical time to fine-tune without autoplay snatching the overlay away mid-adjustment.
      if(holdAt&&!holdAt.loop)holdRemaining=Math.max(holdRemaining||0,20000);
      e.preventDefault();
    });
  });
  artwork.onload=()=>{artReady=true;artFailed=false;$('assetError').hidden=true;invalidate();};
  artwork.onerror=()=>{artFailed=true;if(M.chapter(time)===4)$('assetError').hidden=false;invalidate();};
  function loadArt(){artFailed=false;$('assetError').hidden=true;artwork.src=encodeURI('아테네 학당.jpg');}
  $('retryArt').addEventListener('click',loadArt);
  if(!ctx){$('assetError').hidden=false;$('assetError').textContent='이 브라우저에서는 그림을 표시할 수 없습니다.';return;}
  loadArt();resize();
})();
