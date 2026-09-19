(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('filmScene'),ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const bounds=[0,14,31,47,64,80];
  const playbackRate=1.5;
  const chapterNames=['The gaze','The unknown','The sublime','Inner life','The individual'];
  // Every chapter pairs a visible model transformation with one reading of the painting.
  const chapters=[
    {title:'See the world through someone else.',description:'A figure turned away invites us to share his gaze.',from:'Observe him',to:'Share his gaze'},
    {title:'What you cannot see, you imagine.',description:'Where the fog conceals, imagination begins.',from:'Reveal the valley',to:'Conceal it'},
    {title:'Small before something immense.',description:'Vast nature brings wonder and unease together.',from:'Human scale',to:'Vast nature'},
    {title:'The landscape becomes a feeling.',description:'The same landscape, transformed by light.',from:'Cool distance',to:'Warm possibility'},
    {title:'An entire world. One inner life.',description:'One person’s feeling becomes the subject.',from:'Many figures',to:'One individual'}
  ];
  // Three pauses ground the abstract camera language in real paintings, each timed to the
  // chapter it caps: the Rückenfigur device recurring across Friedrich's work follows "his back,
  // not his face"; the same nature read as terror (Turner) and as awe (Friedrich) follows "the
  // Sublime"; and crowded history painting versus one solitary figure sets up "no myth, no history".
  const compareWindows=[{start:13.2,end:14,hold:4.5},{start:46.2,end:47,hold:5},{start:63.2,end:64,hold:6}];
  let holdRemaining=null,holdAt=null;
  let w=1,h=1,dpr=1,time=0,playing=false,last=0,raf=0,index=-1,manual=null,intro=true,drag=null;
  const dragHints=['Drag to turn the view ↔','Drag to move the fog ↔','Drag to change nature’s scale ↔','Drag to change the light ↔','Drag to reveal the individual ↔'];
  function chapterAt(t){return Math.min(4,bounds.findIndex((v,i)=>i<5&&t<bounds[i+1])<0?4:bounds.findIndex((v,i)=>i<5&&t<bounds[i+1]));}
  function update(){
    const next=chapterAt(time);
    if(next!==index){
      index=next;document.body.dataset.chapter=index;const c=chapters[index];
      $('sceneTitle').getAnimations().forEach(a=>a.cancel());$('sceneTitle').textContent=c.title;
      $('sceneStatus').getAnimations().forEach(a=>a.cancel());$('sceneStatus').textContent=c.description;
      $('dragHint').textContent=dragHints[index];
      if(!reduced.matches&&playing){
        $('sceneTitle').animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:900,easing:'ease-out'});
        $('sceneStatus').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:800,easing:'ease-out',delay:150});
      }
    }
    document.body.classList.toggle('film-playing',playing);document.body.classList.toggle('film-ended',time>=80);
    $('playPause').textContent=playing?'Pause Ⅱ':time>=80?'Replay ↺':'Play ▷';
    $('playPause').setAttribute('aria-label',playing?'Pause animation':time>=80?'Replay animation':'Play animation');
    // Window order follows chapter order: the Rückenfigur trio lands right after "his back, not
    // his face"; the Sublime pair lands right after that chapter; the history-vs-individual pair
    // lands right before the closing chapter it sets up.
    const showRuckenfigur=time>=compareWindows[0].start&&time<compareWindows[0].end;
    const showSublime=time>=compareWindows[1].start&&time<compareWindows[1].end;
    const showHistory=time>=compareWindows[2].start&&time<compareWindows[2].end;
    $('compareTwo').classList.toggle('visible',showRuckenfigur);$('compareTwo').setAttribute('aria-hidden',String(!showRuckenfigur));
    $('compareThree').classList.toggle('visible',showSublime);$('compareThree').setAttribute('aria-hidden',String(!showSublime));
    $('compareOne').classList.toggle('visible',showHistory);$('compareOne').setAttribute('aria-hidden',String(!showHistory));
    const comparison=showRuckenfigur||showSublime||showHistory;
    document.body.classList.toggle('showing-comparison',comparison);
    canvas.tabIndex=intro||comparison?-1:0;
    canvas.setAttribute('aria-hidden',String(intro||comparison));
  }
  function draw(){
    if(intro)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const ix=Math.max(0,index),phase=(time-bounds[ix])/(bounds[ix+1]-bounds[ix]);
    const amount=manual===null?phase:manual;
    const nearest=bounds.slice(1,-1).reduce((a,b)=>Math.abs(time-b)<Math.abs(a)?time-b:a,99);
    const transition=reduced.matches||manual!==null?0:Math.abs(nearest)<.85?(nearest+.85)/1.7:0;
    const header=document.querySelector('.masthead').getBoundingClientRect(),hint=$('dragHint').getBoundingClientRect();
    window.drawRomanticWorld(ctx,w,h,time,ix,amount,{reduced:reduced.matches,transition,layout:{top:header.bottom+20,bottom:hint.top-18}});
    canvas.setAttribute('aria-valuenow',String(Math.round(amount*100)));
    canvas.setAttribute('aria-valuetext',`${chapterNames[ix]}: ${chapters[ix].from} to ${chapters[ix].to}, ${Math.round(amount*100)} percent`);
  }
  function frame(now){
    raf=0;if(document.hidden||!playing)return;
    const dt=last?Math.min((now-last)/1000,.1)*playbackRate:0;last=now;
    if(holdRemaining!==null){
      // Autoplay freezes on the paired artworks rather than animating underneath them,
      // so the comparison never has to compete with a moving landscape for attention.
      holdRemaining-=dt;
      if(holdRemaining<=0){holdRemaining=null;holdAt=null;}
    }else{
      const next=Math.min(80,time+dt);
      const hit=compareWindows.find(win=>time<win.start&&next>=win.start);
      if(hit){time=hit.start;holdAt=hit;holdRemaining=hit.hold;}else time=next;
    }
    if(time>=80)playing=false;
    update();draw();if(playing)raf=requestAnimationFrame(frame);
  }
  function start(){last=0;if(playing&&!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
  function seek(t){manual=null;holdRemaining=null;holdAt=null;time=Math.max(0,Math.min(80,t));update();draw();}
  function toggle(){if(intro)return;manual=null;playing=!playing;if(time>=80)seek(0);update();start();}
  $('beginStudy').addEventListener('click',()=>{
    intro=false;$('paintingIntro').hidden=true;document.body.classList.remove('artwork-intro');
    playing=!reduced.matches;seek(0);canvas.focus({preventScroll:true});
    if(!reduced.matches)canvas.animate([{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'scale(1)'}],{duration:750,easing:'cubic-bezier(.2,.65,.3,1)'});
    start();
  });
  $('playPause').addEventListener('click',toggle);
  addEventListener('romantic-art-ready',()=>draw());
  function manipulate(value){
    manual=Math.max(0,Math.min(1,value));playing=false;holdRemaining=null;holdAt=null;
    // Manipulation stays inside this chapter and never opens a timed comparison overlay.
    const end=Math.min(bounds[index+1]-.01,compareWindows.find(win=>win.start>bounds[index]&&win.start<bounds[index+1])?.start-.02||Infinity);
    time=bounds[index]+manual*(end-bounds[index]);update();draw();
  }
  canvas.addEventListener('pointerdown',e=>{
    if(intro||!e.isPrimary||e.button!==0||document.body.classList.contains('showing-comparison'))return;
    const top=document.querySelector('.masthead').getBoundingClientRect().bottom;
    if(e.clientY<top||e.clientY>$('dragHint').getBoundingClientRect().top)return;
    const current=manual===null?(time-bounds[index])/(bounds[index+1]-bounds[index]):manual;
    drag={id:e.pointerId,x:e.clientX,amount:current,wasPlaying:playing,moved:false};playing=false;update();
    canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');canvas.focus({preventScroll:true});
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const dx=e.clientX-drag.x;if(Math.abs(dx)>3)drag.moved=true;
    if(drag.moved)manipulate(drag.amount+dx/Math.max(180,w*.55));
  });
  function finishDrag(e){
    if(!drag||e.pointerId!==drag.id)return;
    const resume=!drag.moved&&drag.wasPlaying;drag=null;canvas.classList.remove('dragging');
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(resume){playing=true;update();start();}
  }
  canvas.addEventListener('pointerup',finishDrag);canvas.addEventListener('pointercancel',finishDrag);canvas.addEventListener('lostpointercapture',finishDrag);
  canvas.addEventListener('keydown',e=>{
    if(intro)return;
    const current=manual===null?(time-bounds[index])/(bounds[index+1]-bounds[index]):manual;
    if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();manipulate(e.key==='Home'?0:e.key==='End'?1:current+(e.key==='ArrowRight'?.05:-.05));}
    if(e.code==='Space'){e.preventDefault();toggle();}
  });
  $('openFilm').addEventListener('click',()=>{playing=false;update();$('conceptMovie').showModal();$('conceptVideo').play().catch(()=>{});});
  $('closeFilm').addEventListener('click',()=>$('conceptMovie').close());$('conceptMovie').addEventListener('close',()=>$('conceptVideo').pause());
  // Space offers the same transport control when focus is outside interactive elements.
  addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();toggle();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else start();});
  reduced.addEventListener('change',()=>{playing=false;update();draw();});
  function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);$('paintingIntro').style.top=`${document.querySelector('.masthead').getBoundingClientRect().bottom+18}px`;draw();}
  addEventListener('resize',resize);document.fonts.ready.then(resize);update();resize();start();
})();
