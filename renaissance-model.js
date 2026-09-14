/* Shared, dependency-free geometry for the visible perspective experiment. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PerspectiveModel=api;})(typeof globalThis==='object'?globalThis:this,()=>{
  'use strict';
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const PLANE_Z=-3,EYE_Z=-8,HEIGHT=2.6;
  // Intersection of the ray E -> P with the fixed, upright picture plane.
  function imprint(p,eyeHeight=2){const t=(PLANE_Z-EYE_Z)/(p[2]-EYE_Z);return [p[0]*t,eyeHeight+(p[1]-eyeHeight)*t,PLANE_Z];}
  function camera(center,yaw,pitch,scale,cx,cy){
    const right=[Math.cos(yaw),0,-Math.sin(yaw)];
    const up=[Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),Math.cos(yaw)*Math.sin(pitch)];
    const forward=[Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
    return p=>{const d=sub(p,center);return {x:cx+dot(d,right)*scale,y:cy-dot(d,up)*scale,z:dot(d,forward)};};
  }
  const starts=[0,8,18,30,40],ends=[8,18,30,40,50];
  function chapter(t){return t<8?0:t<18?1:t<30?2:t<40?3:4;}
  function state(t,manual={}){
    const c=chapter(t),turn=smooth(1.8,7,t)*(1-smooth(40,44,t));
    const distance=manual.distance??(c===2?lerp(2,15,smooth(19,26,t)):10);
    const eye=manual.eye??(c===3?2+1.1*Math.sin(clamp((t-31)/7)*Math.PI*2):2);
    return {t,chapter:c,turn,room:smooth(8,11,t)*(1-smooth(40,43,t)),rays:smooth(11,14,t)*(1-smooth(39.5,42,t)),inset:smooth(12,15,t)*(1-smooth(40,42,t)),compare:smooth(18,19.5,t)*(1-smooth(30,31,t)),horizon:smooth(30,32,t),art:smooth(44,47,t),artGuides:smooth(46,49,t),distance,eye,length:lerp(16,24,smooth(30,37,t))};
  }
  return {clamp,lerp,smooth,mix,dot,sub,imprint,camera,chapter,state,starts,ends,PLANE_Z,EYE_Z,HEIGHT};
});
