import { THREE, TAU, studio, material, mesh, box, lathe, tube, vessel } from './art-quality.js';

function createObjects(){
  const world=studio({exposure:1.05}),{scene}=world,camera=new THREE.PerspectiveCamera(32,1,.1,80);
  const plaster=material('stone',0xb4c0bc,{bumpScale:.002,roughness:.92}),trim=material('ceramic',0xe4dcc4,{roughness:.68,clearcoat:.08}),walnut=material('wood',0x513424),brass=material('metal',0xb68b4b),dark=material('ceramic',0x263d39);
  box(scene,walnut,[0,-.1,0],[6.8,.22,4.8]);
  const black=material('marble',0x506269,{roughness:.52,bumpScale:.001}),ivory=material('marble',0xd6d1bd,{roughness:.48,bumpScale:.001});
  const tile=new THREE.BoxGeometry(.677,.055,.677);
  for(let x=0;x<10;x++)for(let z=0;z<7;z++)mesh(scene,tile,(x+z)%2?black:ivory,[-3.05+x*.68,.027,-2.03+z*.68]);
  box(scene,plaster,[0,2.35,-2.39],[6.8,4.6,.16]);box(scene,plaster,[-3.36,2.35,0],[.16,4.6,4.8]);
  for(const [y,h,depth] of [[.2,.19,.13],[.39,.06,.06],[4.48,.13,.16],[4.59,.08,.22],[4.35,.045,.065]]){
    box(scene,trim,[0,y,-2.25],[6.65,h,depth]);box(scene,trim,[-3.24,y,0],[depth,h,4.6]);
  }
  // Inset wall panelling, with mouldings that catch the raking window light.
  for(const x of [-2.5,-.9,.7,2.3])for(const y of [.65,1.12])box(scene,trim,[x,y,-2.28],[1.35,.027,.025],.006);
  for(const x of [-3.16,-1.83,-1.57,-.24,.03,1.36,1.62,2.97])box(scene,trim,[x,.885,-2.28],[.027,.47,.025],.006);
  const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=768;const sk=skyCanvas.getContext('2d');
  const gradient=sk.createLinearGradient(0,0,0,768);gradient.addColorStop(0,'#5f91ba');gradient.addColorStop(1,'#d5e1d8');sk.fillStyle=gradient;sk.fillRect(0,0,512,768);
  for(let i=0;i<18;i++){const x=(i*131)%540-20,y=(i*223)%740,r=30+(i%4)*20,g=sk.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#fff9eebb');g.addColorStop(1,'#fff9ee00');sk.fillStyle=g;sk.fillRect(x-r,y-r,r*2,r*2);}
  const skyMap=new THREE.CanvasTexture(skyCanvas);skyMap.colorSpace=THREE.SRGBColorSpace;
  box(scene,dark,[-1.4,2.62,-2.24],[1.96,2.68,.13]);
  box(scene,new THREE.MeshBasicMaterial({map:skyMap}),[-1.4,2.62,-2.155],[1.7,2.43,.025]);
  for(const x of [-2.38,-.42])box(scene,trim,[x,2.62,-2.11],[.17,2.84,.24]);
  for(const y of [1.25,3.99])box(scene,trim,[-1.4,y,-2.09],[2.16,.16,.29]);
  box(scene,trim,[-1.4,2.62,-2.06],[.06,2.55,.13]);box(scene,trim,[-1.4,2.62,-2.06],[1.8,.06,.13]);
  box(scene,trim,[-1.4,1.22,-1.93],[2.2,.12,.62]);
  // A folded curtain on the side of the casement.
  const curtain=material('cloth',0xc0c8bd,{side:THREE.DoubleSide}),cloth=new THREE.PlaneGeometry(.56,2.65,24,42),clothP=cloth.attributes.position;
  for(let i=0;i<clothP.count;i++){const x=clothP.getX(i),y=clothP.getY(i);clothP.setZ(i,Math.sin(x*38)*.052+Math.cos(y*1.4)*.035);clothP.setY(i,y-Math.cos(x*9)*.045);}
  cloth.computeVertexNormals();mesh(scene,cloth,curtain,[-2.33,2.62,-1.94]);
  world.sun.position.set(-4,7,4);world.sun.intensity=2.7;world.sun.shadow.radius=3;
  const windowLight=new THREE.PointLight(0xc8e6ff,9,8,2);windowLight.position.set(-1.4,3.1,-1.7);scene.add(windowLight);

  const table=new THREE.Group();table.position.set(1.12,0,.4);scene.add(table);
  box(table,walnut,[0,1.08,0],[1.98,.16,1.15],.055);box(table,ivory,[0,1.172,0],[1.84,.035,1.01],.018);
  for(const x of [-.75,.75])for(const z of [-.37,.37]){
    lathe(table,walnut,[[.075,0],[.08,.06],[.04,.12],[.045,.3],[.07,.36],[.055,.44],[.04,.65],[.055,.83],[.065,1]], [x,.08,z],40);
    lathe(table,brass,[[.082,.08],[.082,.13],[.06,.15]],[x,0,z],32);
  }
  box(table,walnut,[0,.92,0],[1.63,.25,.83]);box(table,brass,[0,.92,.433],[.21,.035,.035]);
  const key=new THREE.Group();key.position.set(-.22,1.22,.16);key.rotation.x=-Math.PI/2;table.add(key);
  mesh(key,new THREE.TorusGeometry(.105,.023,12,64),brass);
  box(key,brass,[.24,0,0],[.33,.036,.035],.009);box(key,brass,[.37,-.05,0],[.042,.11,.04],.008);box(key,brass,[.29,-.035,0],[.035,.075,.04],.006);

  const clock=new THREE.Group();clock.position.set(1.33,2.97,-2.04);scene.add(clock);
  mesh(clock,new THREE.CylinderGeometry(.78,.8,.105,96),walnut,[0,0,-.06],[Math.PI/2,0,0]);
  mesh(clock,new THREE.TorusGeometry(.735,.047,20,128),brass,[0,0,.018]);
  const dialCanvas=document.createElement('canvas');dialCanvas.width=dialCanvas.height=768;const dial=dialCanvas.getContext('2d');
  const tone=dial.createRadialGradient(335,290,20,384,384,380);tone.addColorStop(0,'#f8eed4');tone.addColorStop(1,'#bdae8c');dial.fillStyle=tone;dial.fillRect(0,0,768,768);
  dial.strokeStyle='#504835';dial.lineWidth=2;for(const r of [345,352,263]){dial.beginPath();dial.arc(384,384,r,0,TAU);dial.stroke();}
  const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];dial.textAlign='center';dial.textBaseline='middle';dial.fillStyle='#26332e';dial.font='42px Georgia';
  for(let i=0;i<60;i++){const a=i/60*TAU;dial.save();dial.translate(384,384);dial.rotate(a);dial.fillRect(-1.5,-335,3,i%5?10:21);dial.restore();if(i%5===0)dial.fillText(numerals[i/5],384+Math.sin(a)*298,384-Math.cos(a)*298);}
  dial.font='16px Georgia';dial.fillText('LE TEMPS',384,452);dial.font='12px Georgia';dial.fillText('PARIS',384,480);
  const dialMap=new THREE.CanvasTexture(dialCanvas);dialMap.colorSpace=THREE.SRGBColorSpace;
  mesh(clock,new THREE.CircleGeometry(.7,128),material('ceramic',0xffffff,{map:dialMap,roughness:.48}),[0,0,.033]);
  const hands=[];
  for(const [length,width,z] of [[.51,.021,.065],[.34,.029,.09]]){
    const shape=new THREE.Shape();shape.moveTo(-width,-.09);shape.lineTo(-width*.6,length*.84);shape.lineTo(0,length);shape.lineTo(width*.6,length*.84);shape.lineTo(width,-.09);shape.closePath();
    hands.push(mesh(clock,new THREE.ExtrudeGeometry(shape,{depth:.016,bevelEnabled:true,bevelSegments:2,bevelSize:.004,bevelThickness:.003}),dark,[0,0,z]));
  }
  mesh(clock,new THREE.SphereGeometry(.057,32,20),brass,[0,0,.123]).scale.z=.45;
  clock.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.userData.base=o.geometry.attributes.position.array.slice();}});

  const appleGroup=new THREE.Group();scene.add(appleGroup);
  const appleGeo=new THREE.SphereGeometry(1,112,80),ap=appleGeo.attributes.position;
  for(let i=0;i<ap.count;i++){
    const y=ap.getY(i),angle=Math.atan2(ap.getZ(i),ap.getX(i)),polar=Math.acos(Math.max(-1,Math.min(1,y))),waist=1+.08*y+.037*Math.cos(angle*5)*Math.sin(polar);
    ap.setXYZ(i,ap.getX(i)*waist,y*.95-.16*Math.exp(-Math.pow(polar/.23,2))+.1*Math.exp(-Math.pow((Math.PI-polar)/.24,2)),ap.getZ(i)*waist);
  }
  appleGeo.computeVertexNormals();
  const appleMat=material('ceramic',0x8caa37,{roughness:.43,clearcoat:.25,clearcoatRoughness:.38,bumpScale:.001});
  appleMat.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 skinPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nskinPosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 skinPosition;\nfloat skinNoise(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}')
      .replace('#include <color_fragment>','#include <color_fragment>\nfloat mottling=sin(skinPosition.x*7.+sin(skinPosition.y*8.))*sin(skinPosition.z*11.+skinPosition.y*4.);diffuseColor.rgb*=.94+.06*mottling;float blush=smoothstep(.12,.85,skinPosition.x+skinPosition.z*.4);diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,.9,.76),blush*.4);float speck=step(.995,skinNoise(floor(skinPosition*210.)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.7,.58,.26),speck*.28);');
  };
  mesh(appleGroup,appleGeo,appleMat);
  tube(appleGroup,walnut,[[0,.78,0],[.01,.95,0],[.075,1.13,-.035]],.04,24);
  const leafGeometry=new THREE.PlaneGeometry(.72,.29,32,12),lp=leafGeometry.attributes.position;
  for(let i=0;i<lp.count;i++){const x=lp.getX(i),y=lp.getY(i),t=(x+.36)/.72;lp.setXYZ(i,x+.34,.96+Math.sin(t*Math.PI)*.18+Math.abs(y)*.22,y*Math.sin(Math.PI*t));}
  leafGeometry.computeVertexNormals();mesh(appleGroup,leafGeometry,material('cloth',0x31451b,{side:THREE.DoubleSide}));
  tube(appleGroup,material('wood',0x788340),[[.01,.97,0],[.3,1.13,0],[.7,.96,0]],.006,28);

  // Ray-marched cloud volumes: light is scattered through density, rather than
  // painting overlapping white discs. The same form reads correctly from any angle.
  const clouds=[];
  function cloudMaterial(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,uniforms:{eye:{value:new THREE.Vector3()},opacity:{value:1}},
    vertexShader:`varying vec3 at;void main(){at=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp float;varying vec3 at;uniform vec3 eye;uniform float opacity;
      float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}
      float density(vec3 p){float shape=max(1.-length((p-vec3(-.42,-.12,0.))/vec3(.51,.4,.48)),1.-length((p-vec3(.04,.08,0.))/vec3(.54,.68,.51)));shape=max(shape,1.-length((p-vec3(.49,-.16,.04))/vec3(.46,.4,.42)));float n=noise(p*6.1)*.63+noise(p*13.8+3.)*.27+noise(p*29.1)*.1;return smoothstep(.01,.39,shape+(n-.5)*.68);}
      void main(){vec3 ray=normalize(at-eye),inv=1./ray,a=(-vec3(1.)-eye)*inv,b=(vec3(1.)-eye)*inv,lo=min(a,b),hi=max(a,b);float near=max(max(lo.x,lo.y),lo.z),far=min(min(hi.x,hi.y),hi.z);near=max(near,0.);if(far<near)discard;float stepSize=(far-near)/40.;vec4 sum=vec4(0.);vec3 light=normalize(vec3(-.55,.8,.7));for(int i=0;i<40;i++){vec3 p=eye+ray*(near+(float(i)+.5)*stepSize);float d=density(p);if(d>.005){float diffuse=max(dot(normalize(p*vec3(1.,1.4,1.)),light),0.);float shade=clamp(.12+.7*diffuse+(d-density(p+light*.26))*.3,.08,1.);vec3 color=mix(vec3(.39,.53,.6),vec3(1.,.98,.91),shade);float alpha=1.-exp(-d*stepSize*5.);sum.rgb+=(1.-sum.a)*color*alpha;sum.a+=(1.-sum.a)*alpha;if(sum.a>.98)break;}}if(sum.a<.005)discard;gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a*opacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});}
  for(const [to,scale] of [[[-1.5,2.9,.65],3.15],[[-.2,3.85,-.4],2.15]]){
    const cloud=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),cloudMaterial());cloud.scale.set(scale/2,scale/2,scale/2);cloud.userData.to=new THREE.Vector3(...to);scene.add(cloud);clouds.push(cloud);
  }
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=256;
  const shadowContext=shadowCanvas.getContext('2d'),gradientShadow=shadowContext.createRadialGradient(128,128,1,128,128,124);gradientShadow.addColorStop(0,'#07100edd');gradientShadow.addColorStop(.42,'#07100e88');gradientShadow.addColorStop(1,'#07100e00');shadowContext.fillStyle=gradientShadow;shadowContext.fillRect(0,0,256,256);
  const shadowMap=new THREE.CanvasTexture(shadowCanvas);
  const contactShadow=mesh(scene,new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),[0,.059,.3],[-Math.PI/2,0,0]);contactShadow.castShadow=false;
  let lastMelt=-1;
  function render(w,h,state,mode){
    camera.aspect=w/h;
    const focus=new THREE.Vector3(0,2.1,0),offset=new THREE.Vector3(6.6,3.8,12.8);
    camera.position.copy(focus).add(offset);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const corners=[[-3.44,-.21,-2.47],[3.44,-.21,-2.47],[-3.44,-.21,2.47],[3.44,-.21,2.47],[-3.44,4.67,-2.47],[3.44,4.67,-2.47],[-3.44,4.67,2.47]].map(p=>new THREE.Vector3(...p));
    for(let i=0;i<2;i++){const projected=corners.map(p=>p.clone().project(camera)),extent=Math.max(...projected.map(p=>Math.max(Math.abs(p.x),Math.abs(p.y))))/.96;offset.multiplyScalar(extent);camera.position.copy(focus).add(offset);camera.lookAt(focus);camera.updateMatrixWorld();}
    const dream=mode==='dream',amount=state.dream,radius=state.apple*1.84;
    table.visible=clock.visible=dream;appleGroup.visible=!dream;
    const smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
    const melt=smooth(.08,.38,amount),float=smooth(.66,1,amount);
    table.position.y=dream?float*1.3:0;table.rotation.z=-float*.045;
    hands[0].rotation.z=-state.time*(.19+amount*3.4);hands[1].rotation.z=-state.time*(.06+amount*.6);
    if(dream&&(lastMelt!==amount||amount>0)){
      clock.traverse(o=>{if(!o.isMesh)return;o.updateMatrix();const inverse=o.matrix.clone().invert(),p=o.geometry.attributes.position,base=o.userData.base,v=new THREE.Vector3();
        for(let i=0;i<p.count;i++){v.fromArray(base,i*3).applyMatrix4(o.matrix);const fall=Math.max(0,.18-v.y);v.y-=melt*fall*fall*1.45;v.x=v.x*(1-melt*fall*.4)+melt*fall*fall*.5;v.z+=melt*fall*fall*.28;v.applyMatrix4(inverse);p.setXYZ(i,v.x,v.y,v.z);}p.needsUpdate=true;o.geometry.computeVertexNormals();});lastMelt=amount;
    }
    appleGroup.position.set(0,.06+radius*.85,.3);appleGroup.scale.setScalar(radius);appleGroup.rotation.y=state.orbit;
    contactShadow.visible=true;contactShadow.position.x=dream?1.12:0;contactShadow.position.z=dream?.4:.3;contactShadow.scale.set(dream?2.9+float*.7:radius*2.8,dream?2+float*.5:radius*2.6,1);contactShadow.material.opacity=dream?.46-float*.18:.65;
    clouds.forEach((cloud,i)=>{const appear=smooth(.35+i*.08,.68+i*.08,amount);cloud.visible=dream&&appear>.001;cloud.position.set(-1.4,2.7,-2).lerp(cloud.userData.to,appear);cloud.updateMatrixWorld();cloud.material.uniforms.eye.value.copy(cloud.worldToLocal(camera.position.clone()));cloud.material.uniforms.opacity.value=appear*.96;});
    const canvas=world.render(w,h,camera);if(!canvas)return null;
    const project=p=>{const v=new THREE.Vector3(...p).project(camera);return{x:(v.x*.5+.5)*w,y:(.5-v.y*.5)*h};};
    const center=project(appleGroup.position.toArray()),edge=project(appleGroup.position.clone().add(new THREE.Vector3(radius,0,0)).toArray());
    // Where the room itself sits in the picture (floor slab and the two wall tops), as fractions of the frame, so the
    // film can enlarge the render until the room — not its empty surroundings — fills the stage.
    const hull=[[3.4,-.21,2.4],[-3.44,-.21,2.4],[3.4,-.21,-2.47],[-3.44,-.21,-2.47],[-3.44,4.67,2.4],[-3.44,4.67,-2.47],[3.4,4.67,-2.47]].map(project);
    const frame={left:Math.min(...hull.map(p=>p.x))/w,right:Math.max(...hull.map(p=>p.x))/w,top:Math.min(...hull.map(p=>p.y))/h,bottom:Math.max(...hull.map(p=>p.y))/h};
    return {canvas,frame,apple:{...center,radius:Math.abs(edge.x-center.x)},clock:project([1.5,2.6,-1.9]),cloud:project(clouds[0].position.toArray()),table:project([1.12,1.1+table.position.y,.4])};
  }
  return {render};
}
window.createSurrealObjectStudio=()=>{let instance;return {render(...args){try{instance??=createObjects();return instance.render(...args);}catch(error){console.warn('Object studio fallback:',error);return null;}}};};
