(() => {
  'use strict';
  // The Surrealism concept film: four chapters of 12 seconds (surrealism-scene.js), each showing something ordinary and
  // then one rule of reality broken, with one control the viewer can take over — a slider (dream, sky), the
  // apple, or a button that deals a new round of the corpse game. Two pauses show real paintings between chapters.
  const model=window.SurrealScene,{clamp,END}=model,$=id=>document.getElementById(id);
  const canvas=$('filmScene'),ctx=canvas.getContext('2d'),control=$('sceneControl'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const titles=['낮과 밤의\n낯선 공존','현실의 규칙이\n풀리는 꿈','크기 하나로\n낯설어진 방','우연이 만난\n하나의 그림'];
  const concepts=[
    ['모순된 공존','함께 있을 수 없는 두 순간을 한 장면에 놓습니다.','하늘과 거리는 같은 시간','낮과 밤이 한 장면에'],
    ['꿈과 무의식','꿈에서는 물성과 중력의 규칙도 자유로워집니다.','단단한 시계 · 바닥 위 탁자','녹는 시간 · 떠오르는 사물'],
    ['데페이즈망','익숙한 사물의 크기를 바꾸면, 평범한 공간도 낯설어집니다.','방 안에 놓인 작은 사과','방을 가득 채우는 사과'],
    ['우아한 시체 · 공동 그리기','앞사람의 그림을 보지 않고 그립니다. 우연이 새로운 이미지를 만듭니다.','따로 그린 머리 · 몸통 · 다리','아무도 계획하지 않은 결합']
  ];
  const descriptions=[
    '현실에서는 하늘이 어두워지면 거리도 함께 어두워진다. 마그리트는 이 규칙을 깨고, 하늘은 정오인데 거리는 한밤인 장면을 그렸다. 그 그림이 「빛의 제국」이다.',
    "초현실주의(超現實主義)는 '현실을 넘어선 현실'이라는 뜻이다. 꿈속에서는 시계가 녹고 구름이 방으로 들어와도 이상하다고 느끼지 않는다. 1924년 앙드레 브르통과 화가들은 이런 꿈과 무의식의 세계를 그림으로 옮기려 했다.",
    "사과도 방도 평범한데, 크기 하나만 바꾸자 방이 꿈처럼 낯설어진다. 익숙한 물건을 엉뚱한 크기나 자리에 두어 낯설게 만드는 방법을 '데페이즈망(dépaysement)'이라고 한다.",
    "종이를 접어 앞사람의 그림을 가린 채, 세 사람이 머리·몸통·다리를 차례로 그린다. 펼치면 아무도 계획하지 않은 생물이 나타난다. 초현실주의자들은 이런 우연 속에서 무의식이 드러난다고 믿었다."];
  // Chapter 4's button already reads "다시 그려 보기", so it gets no hint line under the film.
  const hints=['손잡이를 내리면 하늘은 밤으로, 거리는 낮으로 바뀝니다.','손잡이를 오른쪽으로 — 시계, 구름, 탁자가 차례로 변합니다.','사과를 좌우로 끌어 보세요. 방은 그대로, 사과의 크기만 바뀝니다.','다시 그려 보기를 누르면, 그리고 접고 펼치는 과정을 볼 수 있습니다.'];
  const panels=[$('compareOne'),$('compareTwo')],windows=[{start:11.8,end:12,hold:8000,panel:1},{start:23.8,end:24,hold:8000,panel:0}];
  const atIntro=()=>document.body.classList.contains('artwork-intro');
  const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  let width=1,height=1,time=0,playing=false,last=0,raf=0,currentChapter=-1,manual={},drag=null,hold=null,lingering=false,dealing=false,target={},inset=0,comparison=null,lastInsight='';
  const artwork=new Image(),landscape=new Image(),strips=Array.from({length:18},()=>new Image()),failed=new Set();
  const assets=[{image:artwork,src:'morning.png'},{image:landscape,src:'gallery/surrealism-tanguy-indefinite-divisibility.jpg'},...strips.map((image,index)=>({image,src:`s${index+1}.png`}))];
  if(!ctx){$('assetError').hidden=false;$('assetError').textContent='이 브라우저에서는 그림을 표시할 수 없습니다.';return;}
  const renderer=window.createSurrealRenderer(canvas,{artwork,landscape,strips});
  document.body.dataset.renderer=renderer.threeDimensional?'webgl':'canvas';
  // Sliders and the apple show their direction with chevrons drawn in surrealism-film.css; only the corpse game's button has words.
  const glyphs={chance:'다시 그려 보기 ↻'};
  function render(){
    if(hold){control.hidden=true;return;}
    // inset: the margin each side of the stage kept clear so the picture is centred on screen beside the title column.
    const scene=model.state(time,manual);
    if(comparison&&scene.chapter===0)scene.night=scene.sky;
    target=renderer.draw(scene,{...model.layout(width,height),inset});
    const insights=[comparison?'같은 시간의 하늘과 거리':scene.sky<.5?'밝은 하늘 + 어두운 거리':'어두운 하늘 + 밝은 거리',scene.dream<.08?'01 / 아직은 평범한 방':scene.dream<.38?'01 / 단단한 시계가 녹습니다':scene.dream<.7?'02 / 바깥의 구름이 들어옵니다':'03 / 탁자가 중력을 벗어납니다',`같은 방 · 사과 ${(scene.apple/.18).toFixed(1)}배`,scene.reveal>.5?'펼치면, 예상하지 못한 한 장면':scene.player>=0?`${scene.player+1}번째 사람 / ${['머리','몸통','다리'][scene.player]}를 그리는 중`:'접힌 종이를 펼치는 중'];
    const insight=insights[scene.chapter];if(insight!==lastInsight){$('liveInsight').textContent=insight;lastInsight=insight;}
    const kind=target.kind;
    control.hidden=!kind||Boolean(hold)||Boolean(comparison)||atIntro()||scene.layers[scene.chapter]<.7;
    let left=target.x||width*.9,top=target.y||height*.5;
    if(kind==='apple'){left+=target.radius*.68;top+=target.radius*.60;}
    control.dataset.kind=kind||'none';control.style.left=clamp(left,24,width-24)+'px';control.style.top=clamp(top,24,height-24)+'px';
    control.firstElementChild.textContent=glyphs[kind]||'';
    const value=kind==='apple'?scene.apple:target.value;
    if(kind!=='chance'&&value!==undefined){control.setAttribute('aria-valuenow',String(Math.round(value*100)));control.setAttribute('aria-valuetext',kind==='apple'?`사과 크기 ${(value/.18).toFixed(1)}배`:`${Math.round(value*100)}퍼센트`);}
  }
  function updateUI(){
    const chapter=model.chapter(time);document.body.dataset.chapter=chapter;document.body.classList.toggle('film-playing',playing);document.body.classList.toggle('film-ended',time>=END);
    if(chapter!==currentChapter){
      currentChapter=chapter;$('sceneTitle').textContent=titles[chapter];$('sceneStatus').textContent=descriptions[chapter];$('sceneHint').textContent=hints[chapter];
      document.querySelector('.mf-eyebrow').textContent=`초현실주의 / ${String(chapter+1).padStart(2,'0')}`;
      const [term,meaning,ordinary,broken]=concepts[chapter];$('conceptTerm').textContent=term;$('conceptMeaning').textContent=meaning;$('ordinaryRule').textContent=ordinary;$('brokenRule').textContent=broken;
      $('compareReality').hidden=chapter===3;
      document.body.style.setProperty('--concept-top',`${document.querySelector('.masthead').getBoundingClientRect().bottom+28}px`);
      canvas.setAttribute('aria-label',titles[chapter]);control.setAttribute('aria-label',hints[chapter]||'다시 그려 보기');
      const slider=chapter!==3;control.setAttribute('role',slider?'slider':'button');
      if(slider){control.setAttribute('aria-orientation',chapter===0?'vertical':'horizontal');control.setAttribute('aria-valuemin','0');control.setAttribute('aria-valuemax','100');}
      else['aria-orientation','aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'].forEach(name=>control.removeAttribute(name));
    }
    $('playPause').dataset.state=playing?'playing':'paused';$('playPause').setAttribute('aria-label',playing?'영상 일시정지':'영상 재생');$('filmTime').textContent=`${clock(time)} / ${clock(END)}`;$('filmFill').style.width=time/END*100+'%';
    [...$('progress').children].forEach((button,index)=>{button.classList.toggle('active',index===chapter);button.setAttribute('aria-current',index===chapter?'step':'false');});
    panels.forEach((panel,index)=>{const visible=hold?.panel===index;panel.classList.toggle('visible',visible);panel.setAttribute('aria-hidden',String(!visible));panel.inert=!visible;});document.body.classList.toggle('showing-comparison',Boolean(hold));
  }
  function frame(now){
    raf=0;if(document.hidden){last=0;return;}const elapsed=last?Math.min(now-last,100):0;last=now;
    if(playing&&!drag){
      if(hold){if(!lingering)hold.remaining-=elapsed;if(hold.remaining<=0){time=hold.end;hold=null;}}
      else{const next=Math.min(END,time+elapsed/1000),boundary=windows.find(window=>time<window.start&&next>=window.start);if(boundary){time=boundary.start;hold={...boundary,remaining:boundary.hold};}else time=next;}
      if(time>=END)playing=false;
    }
    if(dealing){manual.age+=elapsed/1000;if(manual.age>=9)dealing=false;}
    updateUI();render();if(playing||dealing)raf=requestAnimationFrame(frame);
  }
  function invalidate(){if(!raf)raf=requestAnimationFrame(frame);}
  function pause(){playing=false;last=0;invalidate();}
  function reset(chapter=0,autoplay=false){time=(reduced.matches?[10,21,34,46.5]:[0,13.3,25.3,37.3])[chapter];manual={};comparison=null;$('compareReality').setAttribute('aria-pressed','false');$('compareReality').innerHTML='현실과 비교 <span aria-hidden="true">↔</span>';hold=null;drag=null;dealing=false;playing=autoplay&&!reduced.matches;last=0;currentChapter=-1;invalidate();}
  function toggle(){if(atIntro())return;if(comparison)$('compareReality').click();if(playing)pause();else{if(time>=END)reset();playing=true;last=0;invalidate();}}
  // A new round of the corpse game: a new head, body and legs, drawn and folded again from the start.
  function deal(){if(model.chapter(time)!==3||hold)return;pause();manual.seed=(manual.seed??0)+1;manual.age=reduced.matches?9:0;dealing=!reduced.matches;invalidate();}
  // Sliders hold a value 0–1 under target.key; the apple keeps its own size and place.
  function setValue(key,value){manual[key]=clamp(value);invalidate();}
  $('compareReality').addEventListener('click',()=>{
    pause();const chapter=model.chapter(time);
    if(comparison){manual=comparison.manual;comparison=null;}
    else{comparison={manual:{...manual}};if(chapter===1)manual.dream=0;if(chapter===2)manual.apple=.18;}
    $('compareReality').setAttribute('aria-pressed',String(Boolean(comparison)));$('compareReality').innerHTML=comparison?'상상으로 돌아가기 <span aria-hidden="true">↔</span>':'현실과 비교 <span aria-hidden="true">↔</span>';invalidate();
  });
  panels.forEach(panel=>{const grid=panel.querySelector('.compare-grid');grid.addEventListener('pointerenter',()=>{lingering=true;});grid.addEventListener('pointerleave',()=>{lingering=false;});});
  [...$('progress').children].forEach((button,index)=>button.addEventListener('click',()=>{lingering=false;reset(index,false);}));
  $('playPause').addEventListener('click',toggle);$('replay').addEventListener('click',()=>reset(0,true));
  addEventListener('artwork-intro:enter',()=>reset());
  addEventListener('artwork-intro:entered',()=>{playing=!reduced.matches;last=0;invalidate();control.focus({preventScroll:true});});
  addEventListener('keydown',event=>{if(event.code!=='Space'||atIntro()||document.body.classList.contains('entering-painting'))return;if(event.target===document.body||event.target===control||event.target===canvas){event.preventDefault();toggle();}});
  control.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&target.kind==='chance'){event.preventDefault();deal();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||!target.kind||target.kind==='chance')return;
    event.preventDefault();pause();const step=['ArrowRight','ArrowDown'].includes(event.key)?.05:-.05;
    if(target.kind==='apple'){manual.apple=clamp(model.state(time,manual).apple+step*2,.15,1.15);invalidate();}else setValue(target.key,(manual[target.key]??target.value)+step);
  });
  control.addEventListener('click',()=>{if(target.kind==='chance')deal();});
  function local(event){const bounds=canvas.getBoundingClientRect();return {x:event.clientX-bounds.left,y:event.clientY-bounds.top};}
  function startDrag(event){
    if(event.button!==0||atIntro()||hold||control.hidden||!target.kind||target.kind==='chance')return;
    const point=local(event),fromCanvas=event.currentTarget===canvas;
    if(fromCanvas){
      if(target.kind==='apple'&&Math.hypot(point.x-target.x,point.y-target.y)>target.radius+24)return;
      // A press on a slider's track moves the knob there.
      if(target.kind==='x'){if(Math.abs(point.y-target.y)>22||point.x<target.from-12||point.x>target.to+12)return;setValue(target.key,(point.x-target.from)/(target.to-target.from));}
      if(target.kind==='y'){if(Math.abs(point.x-target.x)>22||point.y<target.from-12||point.y>target.to+12)return;setValue(target.key,(point.y-target.from)/(target.to-target.from));}
    }
    const scene=model.state(time,manual);
    drag={id:event.pointerId,point,scene,kind:target.kind,key:target.key,from:target.from,to:target.to,start:target.kind==='apple'?scene.apple:manual[target.key]??target.value,resume:playing};
    playing=false;last=0;control.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();invalidate();
  }
  function moveDrag(event){
    if(!drag||drag.id!==event.pointerId)return;const point=local(event),deltaX=point.x-drag.point.x,deltaY=point.y-drag.point.y;
    if(drag.kind==='x')setValue(drag.key,drag.start+deltaX/(drag.to-drag.from));
    if(drag.kind==='y')setValue(drag.key,drag.start+deltaY/(drag.to-drag.from));
    if(drag.kind==='apple'){const scene=drag.scene;manual.apple=clamp(scene.apple+deltaX/width*2,.15,1.15);invalidate();}
    event.preventDefault();
  }
  function endDrag(event){if(!drag||drag.id!==event.pointerId)return;const resume=drag.resume;drag=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);playing=resume&&!reduced.matches&&!document.hidden;last=0;invalidate();}
  [canvas,control].forEach(element=>{element.addEventListener('pointerdown',startDrag);element.addEventListener('pointermove',moveDrag);element.addEventListener('pointerup',endDrag);element.addEventListener('pointercancel',endDrag);element.addEventListener('lostpointercapture',endDrag);});
  // On a wide screen the title stands in a column over the stage's left edge; the same margin is kept clear on both
  // sides so the picture sits in the middle of the screen. Narrow screens put the title above the stage instead.
  function resize(){const bounds=$('stage').getBoundingClientRect();width=Math.max(1,bounds.width);height=Math.max(1,bounds.height);
    document.body.style.setProperty('--concept-top',`${document.querySelector('.masthead').getBoundingClientRect().bottom+28}px`);
    inset=matchMedia('(min-width:701px)').matches?Math.max(0,document.querySelector('.masthead').getBoundingClientRect().right-bounds.left+24):0;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);invalidate();}
  new ResizeObserver(resize).observe($('stage'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;dealing=false;drag=null;last=0;if(raf)cancelAnimationFrame(raf);raf=0;updateUI();}else invalidate();});
  reduced.addEventListener('change',()=>{if(reduced.matches)reset(model.chapter(time));});
  $('goHome').hidden=window.parent!==window;document.body.classList.toggle('in-frame',window.parent!==window);$('goHome').addEventListener('click',()=>{location.href='index.html';});
  $('enterRoom').addEventListener('click',event=>{pause();if(window.parent!==window){event.preventDefault();parent.postMessage({type:'surrealism:enter-room'},'*');}});
  function loadAssets(){assets.forEach(({image,src})=>{if(image.naturalWidth)return;image.onload=()=>{failed.delete(src);$('assetError').hidden=!failed.size;invalidate();};image.onerror=()=>{failed.add(src);$('assetError').hidden=false;invalidate();};image.src=src;});}
  $('retryArt').addEventListener('click',loadAssets);
  document.fonts?.ready.then(invalidate);
  loadAssets();resize();
  if(new URLSearchParams(location.search).get('study')==='1'){
    const enterStudy=()=>$('beginStudy').click();
    if(document.readyState==='complete')enterStudy();
    else document.addEventListener('DOMContentLoaded',enterStudy,{once:true});
  }
})();
