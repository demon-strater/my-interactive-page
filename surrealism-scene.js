(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SurrealScene=api;})(typeof globalThis==='object'?globalThis:this,()=>{
  'use strict';
  // The film's timeline: a pure function of time (0–60 s) and of what the viewer has set by hand. Each chapter shows
  // something ordinary first, then breaks one rule of reality in front of the viewer:
  //   0  꿈의 논리      an ordinary room drifts into a dream: the clock melts, clouds come in, the table lifts
  //   1  데페이즈망     the same apple, grown until it fills the room
  //   2  낮과 밤        a street at dusk: sky and street darken together (reality's rule), then the sky turns back to
  //                     noon while the street stays at midnight (Magritte's rule)
  //   3  우아한 시체    three players draw head, body and legs on paper folded so none sees the others; then it unfolds
  //   4  또렷한 꿈      the painting goes from a dream's blur to photographic sharpness, then its details are named
  const CHAPTER=12,END=60;
  const clamp=(value,low=0,high=1)=>Math.max(low,Math.min(high,value));
  const lerp=(from,to,amount)=>from+(to-from)*amount;
  const smooth=(start,end,value)=>{const amount=clamp((value-start)/(end-start));return amount*amount*(3-2*amount);};
  const chapter=time=>Math.min(4,Math.floor(clamp(time,0,END)/CHAPTER));
  // Which head, body and legs (0–5 each) a round of the corpse game draws; round 0 is the film's own.
  const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  const corpse=seed=>seed?[1,2,3].map(part=>Math.floor(hash(seed*7+part)*6)):[3,1,3];
  // The corpse game, by seconds into a round: each player draws (draw), then folds it out of the next one's sight
  // (fold; the last player doesn't); at the end the paper unfolds.
  function game(age){
    const unfold=smooth(6.6,7.6,age);
    return {age,unfold,reveal:smooth(7.6,8.6,age),player:age<2.4?0:age<4.6?1:age<6.3?2:-1,
      bands:[0,1,2].map(k=>({draw:smooth(.3+k*2.2,1.6+k*2.2,age),fold:k<2?smooth(1.8+k*2.2,2.3+k*2.2,age)*(1-unfold):0}))};
  }
  function state(time,manual={}){
    const t=clamp(time,0,END),fade=k=>k?smooth(k*CHAPTER,k*CHAPTER+1.2,t):1;
    const layers=[0,1,2,3,4].map(k=>fade(k)*(k<4?1-fade(k+1):1));
    const byHand=manual.sky!==undefined;
    return {time:t,chapter:chapter(t),layers,
      dream:clamp(manual.dream??smooth(2.5,8.5,t)),
      apple:clamp(manual.apple??lerp(.18,1,smooth(14,20.5,t)),.15,1.15),appleX:clamp(manual.appleX??.5,.28,.72),appleY:clamp(manual.appleY??.53,.35,.67),orbit:lerp(-.05,.055,smooth(13,21,t)),
      night:byHand?1:smooth(25,28.5,t),rule:byHand?1:smooth(29.4,30.4,t),sky:clamp(manual.sky??smooth(25,28.5,t)*(1-smooth(30.6,33.6,t))),
      parts:corpse(manual.seed??0),...game(manual.age??t-36.8),
      clarity:clamp(manual.clarity??smooth(51,55,t)),notes:smooth(55.5,57.5,t)};
  }
  function layout(width,height){return {width,height,narrow:width<650};}
  return {CHAPTER,END,clamp,lerp,smooth,chapter,state,layout};
});
