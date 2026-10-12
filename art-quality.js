import * as THREE from './vendor/three/three.module.min.js';
export { THREE };

// Shared construction tools: geometry is built once, materials are local and
// deterministic, and every study keeps its own camera and interaction model.
export const TAU=Math.PI*2;
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export function randomSource(seed=42){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const maps=new Map(),shapes=new Map();
export function surfaceMap(kind='stone'){
  if(maps.has(kind))return maps.get(kind);
  const size=512,c=document.createElement('canvas');c.width=c.height=size;
  const ctx=c.getContext('2d'),pixels=ctx.createImageData(size,size),random=randomSource(1357);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,grain=random(),swirl=Math.sin(x*.019+Math.sin(y*.025)*2.1+Math.sin(x*.055+y*.024)*.8);
    let v=221+(grain-.5)*22;
    if(kind==='marble')v-=Math.pow(1-Math.abs(swirl),18)*61+Math.pow(1-Math.abs(swirl+.25),12)*12;
    if(kind==='wood')v=170+Math.sin(x*.23+Math.sin(y*.009)*2+Math.sin(x*.018)*7)*15+(grain-.5)*25;
    if(kind==='metal')v=216+(grain-.5)*10+Math.sin(y*3.14)*4;
    if(kind==='cloth')v=201+(x%3===0||y%3===0?-25:4)+(grain-.5)*12;
    if(kind==='ceramic')v=237+(grain-.5)*8;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=clamp(v,0,255);pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;maps.set(kind,texture);return texture;
}
export function material(kind,color,options={}){
  const roughness={marble:.3,wood:.5,metal:.28,cloth:.94,ceramic:.23,stone:.85}[kind]??.6;
  return new THREE.MeshPhysicalMaterial({color,map:surfaceMap(kind),bumpMap:surfaceMap(kind),bumpScale:kind==='cloth'?.015:kind==='stone'?.035:.008,
    roughness,metalness:kind==='metal'?.78:0,clearcoat:kind==='ceramic'?.55:kind==='wood'?.18:0,clearcoatRoughness:.25,...options});
}
export function roundedBox(w=1,h=1,d=1,r=.06,segments=8){
  const key=[w,h,d,r,segments].join(':');if(shapes.has(key))return shapes.get(key);
  r=Math.min(r,w*.24,h*.24,d*.24);
  const g=new THREE.BoxGeometry(w,h,d,segments,segments,segments),p=g.attributes.position,n=g.attributes.normal;
  const inner=new THREE.Vector3(),point=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i);inner.set(clamp(point.x,-w/2+r,w/2-r),clamp(point.y,-h/2+r,h/2-r),clamp(point.z,-d/2+r,d/2-r));
    normal.copy(point).sub(inner).normalize();point.copy(inner).addScaledVector(normal,r);p.setXYZ(i,point.x,point.y,point.z);n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  g.computeBoundingSphere();shapes.set(key,g);return g;
}
export function mesh(parent,geometry,mat,position=[0,0,0],rotation=null){
  const m=new THREE.Mesh(geometry,mat);m.position.set(...position);if(rotation)m.rotation.set(...rotation);
  m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}
export function box(parent,mat,position,size,r=.025){return mesh(parent,roundedBox(...size,r),mat,position);}
export function lathe(parent,mat,profile,position=[0,0,0],segments=64){return mesh(parent,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),segments),mat,position);}
export function tube(parent,mat,points,r=.03,segments=40){
  return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,10,false),mat);
}
export function rod(parent,mat,a,b,r=.04){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),direction=to.clone().sub(from);
  const m=mesh(parent,new THREE.CylinderGeometry(r,r,direction.length(),20),mat,from.add(to).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return m;
}

function environment(renderer){
  const room=new THREE.Scene();room.background=new THREE.Color(.11,.13,.17);
  const panels=[[[0,5,0],[12,1,10],0xffe4c0,3], [[-6,1,1],[1,7,8],0xb4d5ff,2], [[6,3,-3],[1,5,6],0xffffff,4]];
  for(const [p,s,c,i] of panels)mesh(room,new THREE.BoxGeometry(...s),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i)}),p);
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(room,.055);pmrem.dispose();
  room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}
export function lighting(renderer,scene,{shadowSize=2048,exposure=1.05,key=0xffdfb3,fill=0x96b6dc,ambient=.35}={}){
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=exposure;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const env=environment(renderer);scene.environment=env.texture;scene.environmentIntensity=.35;
  scene.add(new THREE.HemisphereLight(fill,0x25201a,ambient));
  const sun=new THREE.DirectionalLight(key,3.2);sun.position.set(-5,9,7);sun.castShadow=true;sun.shadow.mapSize.set(shadowSize,shadowSize);
  Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:.1,far:70});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
  const rim=new THREE.DirectionalLight(fill,1.65);rim.position.set(6,5,-7);scene.add(rim);
  addEventListener('pagehide',e=>{if(!e.persisted){env.dispose();renderer.dispose();}},{once:true});
  return {sun,rim};
}
export function studio(options={}){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  const scene=new THREE.Scene(),lights=lighting(renderer,scene,options);let width=0,height=0,lost=false;
  renderer.setClearColor(0,0);
  renderer.domElement.addEventListener('webglcontextlost',()=>{lost=true;});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;dispatchEvent(new Event('art-quality:restored'));});
  function render(w,h,camera){
    if(lost)return null;
    const dpr=Math.min(devicePixelRatio||1,w<500?1.5:2);
    if(width!==w||height!==h){width=w;height=h;renderer.setPixelRatio(dpr);renderer.setSize(Math.max(1,Math.round(w)),Math.max(1,Math.round(h)),false);}
    renderer.render(scene,camera);return renderer.domElement;
  }
  return {renderer,scene,render,...lights};
}

// Retrofit the standalone studies without changing their picking, simulation or
// deformation data. Newly spawned pieces receive the same finish on their first frame.
export function enhanceScene(renderer,scene,{finish='ceramic',floor=-3,bevel=true,background=null}={}){
  scene.traverse(o=>{if(o.isLight)o.intensity*=.25;});lighting(renderer,scene);
  if(background!==null)scene.background=new THREE.Color(background);
  if(floor!==null){const ground=mesh(scene,new THREE.PlaneGeometry(100,100),material('stone',scene.background?.clone().lerp(new THREE.Color(0x77736c),.15)??0x272832),[0,floor,0],[-Math.PI/2,0,0]);ground.castShadow=false;}
  const seen=new WeakSet(),seenMaterials=new WeakSet(),prior=scene.onBeforeRender;
  scene.onBeforeRender=function(...args){
    prior?.apply(this,args);
    scene.traverse(o=>{
      if(!o.isMesh||seen.has(o))return;seen.add(o);o.castShadow=o.receiveShadow=true;
      const g=o.geometry,p=g?.parameters;
      if(bevel&&g?.type==='BoxGeometry'&&!g.userData.base)o.geometry=roundedBox(p.width,p.height,p.depth,Math.min(p.width,p.height,p.depth)*.09);
      for(const mat of Array.isArray(o.material)?o.material:[o.material]){
        if(!mat?.isMeshStandardMaterial||seenMaterials.has(mat))continue;seenMaterials.add(mat);
        mat.envMapIntensity=.65;
        if(!mat.map&&!mat.bumpMap){mat.bumpMap=surfaceMap(finish);mat.bumpScale=finish==='stone'?.024:.01;}
        mat.roughness=clamp(mat.roughness*.78,.2,.94);mat.needsUpdate=true;
      }
    });
  };
}

export function classicalColumn(mat,{height=2.6,radius=.22,accent=null}={}){
  const group=new THREE.Group(),stone=accent||mat;
  box(group,stone,[0,.08,0],[radius*3.5,.16,radius*3.5]);
  lathe(group,mat,[[radius*1.5,.16],[radius*1.55,.20],[radius*1.3,.25],[radius*1.32,.3],[radius,.34]]);
  const shaft=new THREE.CylinderGeometry(radius*.85,radius,height-.69,96,20),pos=shaft.attributes.position;
  for(let i=0;i<pos.count;i++){
    const angle=Math.atan2(pos.getZ(i),pos.getX(i)),y=(pos.getY(i)/(height-.69)+.5),flute=1-.065*(.5+.5*Math.cos(angle*24));
    const entasis=1+.035*Math.sin(y*Math.PI);pos.setX(i,pos.getX(i)*flute*entasis);pos.setZ(i,pos.getZ(i)*flute*entasis);
  }
  shaft.computeVertexNormals();mesh(group,shaft,mat,[0,height/2,0]);
  lathe(group,mat,[[radius*.86,height-.35],[radius*1.2,height-.3],[radius*1.4,height-.24],[radius*1.45,height-.2],[radius*1.45,height-.14]]);
  box(group,stone,[0,height-.07,0],[radius*3.5,.14,radius*3.5]);
  for(const side of [-1,1])for(const z of [-1,1]){
    const scroll=mesh(group,new THREE.TorusGeometry(radius*.36,radius*.1,8,32,TAU*.9),mat,[side*radius*1.12,height-.26,z*radius*1.08]);scroll.rotation.y=z<0?Math.PI:0;
  }
  return group;
}

export function vessel(mat,{radius=1,height=2,style='bottle'}={}){
  const profiles={bottle:[[.68,0],[.76,.05],[.77,.15],[.8,.95],[.72,1.15],[.3,1.4],[.22,1.7],[.22,1.9],[.29,1.92],[.29,2]],
    urn:[[.48,0],[.55,.1],[.36,.22],[.34,.4],[.68,.55],[.9,.9],[.84,1.3],[.47,1.58],[.45,1.75],[.62,1.84],[.63,2]],
    vase:[[.53,0],[.65,.08],[.8,.6],[.76,1.1],[.42,1.5],[.3,1.8],[.38,1.95],[.39,2]]};
  const g=new THREE.LatheGeometry(profiles[style].map(([r,y])=>new THREE.Vector2(r*radius,y*height/2)),80);return new THREE.Mesh(g,mat);
}
