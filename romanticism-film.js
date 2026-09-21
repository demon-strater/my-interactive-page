(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('filmScene'),ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const bounds=[0,14,31,47,64,80];
  const playbackRate=1.8;
  const chapterNames=['뒷모습의 시선','미지와 상상','숭고','풍경과 감정','개인의 내면'];
  // Every chapter pairs a visible model transformation with one reading of the painting.
  const chapters=[
    {title:'뒤돌아 선 인물, 뤼켄피구어에 대하여',description:'돌아선 뒷모습이 그의 시선을 함께 바라보게 한다.',from:'그를 바라보다',to:'그의 시선을 공유하다'},
    {title:'보이지 않는 것과 상상력에 대하여',description:'안개가 계곡을 가리는 순간, 상상이 시작된다.',from:'드러난 계곡',to:'가려진 계곡'},
    {title:'숭고(Sublime)에 대하여',description:'거대한 자연 앞에서 인간은 한없이 작아진다.',from:'인간의 크기',to:'거대한 자연'},
    {title:'풍경에 담기는 감정에 대하여',description:'같은 골짜기가 비바람과 햇빛 속에서 다른 감정을 보여준다.',from:'폭풍과 불확실함',to:'빛과 가능성'},
    {title:'집단과 개인, 그림의 주인공에 대하여',description:'역사 속 무리 대신, 한 사람의 내면이 그림의 주인공이 된다.',from:'여럿의 무리',to:'한 개인'}
  ];
  // Three pauses ground the abstract camera language in real paintings, each timed to the
  // chapter it caps: the Rückenfigur device recurring across Friedrich's work follows "his back,
  // not his face"; the same nature read as terror (Turner) and as awe (Friedrich) follows "the
  // Sublime"; and crowded history painting versus one solitary figure sets up "no myth, no history".
  // Holds are in the film's own units; divide by playbackRate for real seconds. Each pause is long
  // enough to look at the paintings alone first (the captions and highlights fade in ~3s later).
  const compareWindows=[{start:13.2,end:14,hold:14.4},{start:46.2,end:47,hold:12.6},{start:63.2,end:64,hold:12.6}];
  const runtime=(80+compareWindows.reduce((sum,win)=>sum+win.hold,0))/playbackRate;
  const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  let holdRemaining=null,holdAt=null,lingering=false;
  document.querySelectorAll('.compare-grid').forEach(grid=>{
    grid.addEventListener('mouseenter',()=>{lingering=true;});
    grid.addEventListener('mouseleave',()=>{lingering=false;});
  });
  // Inside the hub's iframe the hub already shows its own back control.
  if(window.parent!==window)$('goHome').hidden=true;
  // Painting sizes and --transport-height come from the shared concept-compare.js.
  const fitComparisons=()=>window.fitComparisons?.();
  let w=1,h=1,dpr=1,time=0,playing=false,last=0,raf=0,index=-1,manual=null,intro=true,drag=null;
  const dragHints=['드래그해 시점을 돌려보세요 ↔','드래그해 안개를 움직여보세요 ↔','드래그해 자연의 크기를 바꿔보세요 ↔','드래그해 빛을 바꿔보세요 ↔','드래그해 개인을 드러내보세요 ↔'];
  function chapterAt(t){return Math.min(4,bounds.findIndex((v,i)=>i<5&&t<bounds[i+1])<0?4:bounds.findIndex((v,i)=>i<5&&t<bounds[i+1]));}
  function update(){
    const next=chapterAt(time);
    if(next!==index){
      index=next;document.body.dataset.chapter=index;const c=chapters[index];
      $('sceneTitle').getAnimations().forEach(a=>a.cancel());$('sceneTitle').textContent=c.title;
      $('sceneStatus').getAnimations().forEach(a=>a.cancel());$('sceneStatus').textContent=c.description;
      $('sceneCaption').replaceChildren(Object.assign(document.createElement('b'),{textContent:`${index+1} / ${chapters.length}`}),c.title);
      $('dragHint').textContent=dragHints[index];
      if(!reduced.matches&&playing){
        $('sceneTitle').animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:900,easing:'ease-out'});
        $('sceneStatus').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:800,easing:'ease-out',delay:150});
      }
    }
    document.body.classList.toggle('film-playing',playing);document.body.classList.toggle('film-ended',time>=80);
    $('playPause').textContent=playing?'Ⅱ':time>=80?'↺':'▷';
    $('playPause').setAttribute('aria-label',playing?'애니메이션 일시정지':time>=80?'애니메이션 다시 재생':'애니메이션 재생');
    $('filmSeek').value=time;$('filmFill').style.width=(time/80*100)+'%';
    const elapsed=(time+compareWindows.reduce((sum,win)=>sum+(time>=win.end?win.hold:time>=win.start?win.hold-(holdRemaining??0):0),0))/playbackRate;
    $('filmTime').textContent=`${clock(elapsed)} / ${clock(runtime)}`;
    document.querySelectorAll('[data-film-chapter]').forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
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
    const header=document.querySelector('.masthead').getBoundingClientRect(),footer=document.querySelector('.film-footer').getBoundingClientRect();
    window.drawRomanticWorld(ctx,w,h,time,ix,amount,{reduced:reduced.matches,transition,layout:{top:header.bottom+10,bottom:footer.top-8}});
    canvas.setAttribute('aria-valuenow',String(Math.round(amount*100)));
    canvas.setAttribute('aria-valuetext',`${chapterNames[ix]}: ${chapters[ix].from}에서 ${chapters[ix].to}(으)로, ${Math.round(amount*100)}퍼센트`);
  }
  function frame(now){
    raf=0;if(document.hidden||!playing)return;
    const dt=last?Math.min((now-last)/1000,.1)*playbackRate:0;last=now;
    if(holdRemaining!==null){
      // Autoplay freezes on the paired artworks rather than animating underneath them,
      // so the comparison never has to compete with a moving landscape for attention.
      // A pointer resting on the paintings holds the countdown as well.
      if(!lingering)holdRemaining-=dt;
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
  let entering=false;
  $('beginStudy').addEventListener('click',async()=>{
    if(entering||!intro)return;
    entering=true;
    const painting=$('beginStudy').querySelector('img'),box=painting.getBoundingClientRect();
    // Use the painted pixels, excluding object-fit letterboxing on narrow screens.
    const fit=Math.min(box.width/(painting.naturalWidth||box.width),box.height/(painting.naturalHeight||box.height));
    const rw=(painting.naturalWidth||box.width)*fit,rh=(painting.naturalHeight||box.height)*fit;
    const rect={left:box.left+(box.width-rw)/2,top:box.top+(box.height-rh)/2,width:rw,height:rh};
    const portal=painting.cloneNode();
    portal.removeAttribute('id');portal.alt='';portal.setAttribute('aria-hidden','true');
    Object.assign(portal.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',objectFit:'fill',zIndex:'100',pointerEvents:'none',transformOrigin:'50% 43%'});
    if(!reduced.matches)document.body.append(portal);
    intro=false;$('paintingIntro').hidden=true;document.body.classList.remove('artwork-intro');
    fitComparisons();
    playing=false;seek(0);
    if(!reduced.matches){
      $('atelier').inert=true;document.body.classList.add('entering-painting');
      const dx=innerWidth*.5-(rect.left+rect.width*.5),dy=innerHeight*.47-(rect.top+rect.height*.43);
      const scale=Math.max(innerWidth/Math.max(1,rect.width),innerHeight/Math.max(1,rect.height))*2.1;
      const zoom=portal.animate([
        {transform:'translate(0,0) scale(1)',opacity:1,filter:'blur(0px)',offset:0},
        {transform:`translate(${dx*.35}px,${dy*.35}px) scale(1.35)`,opacity:1,filter:'blur(0px)',offset:.32},
        {transform:`translate(${dx}px,${dy}px) scale(${scale})`,opacity:1,filter:'blur(3px)',offset:.76},
        {transform:`translate(${dx}px,${dy}px) scale(${scale*1.15})`,opacity:0,filter:'blur(12px)',offset:1}
      ],{duration:1450,easing:'cubic-bezier(.5,0,.2,1)',fill:'forwards'});
      const reveal=canvas.animate([{opacity:0,transform:'scale(1.16)'},{opacity:1,transform:'scale(1)'}],{duration:850,delay:600,easing:'ease-out',fill:'both'});
      await Promise.allSettled([zoom.finished,reveal.finished]);
      portal.remove();reveal.cancel();$('atelier').inert=false;document.body.classList.remove('entering-painting');
    }
    entering=false;playing=!reduced.matches;update();canvas.focus({preventScroll:true});
    start();
  });
  $('playPause').addEventListener('click',toggle);
  $('replay').addEventListener('click',()=>{if(intro)return;playing=!reduced.matches;seek(0);start();});
  $('filmSeek').addEventListener('input',e=>{playing=false;seek(Number(e.target.value));});
  document.querySelectorAll('[data-film-chapter]').forEach((button,i)=>button.addEventListener('click',()=>{playing=false;seek(bounds[i]);}));
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
  function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);$('paintingIntro').style.top=`${document.querySelector('.masthead').getBoundingClientRect().bottom+18}px`;fitComparisons();draw();}
  addEventListener('resize',resize);document.fonts.ready.then(resize);update();resize();start();
})();
