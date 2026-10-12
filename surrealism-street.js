import * as THREE from './vendor/three/three.module.min.js';
import { Reflector } from './vendor/three/Reflector.js';

// A self-contained, locally hosted set for the opening chapter. The daylight sky
// is deliberately independent of the lighting on the architecture and the canal.
const TAU = Math.PI * 2;
function randomSource(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function surfaceTexture(kind, renderer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), random = randomSource(418 + kind.length);
  const tones = { plaster:[180,176,157], stone:[124,128,120], brick:[99,84,70], slate:[60,70,76], paving:[87,93,91] };
  const base = tones[kind], pixels = ctx.createImageData(512,512);
  for (let i=0;i<pixels.data.length;i+=4) {
    const grain = (random()-.5)*29;
    for (let c=0;c<3;c++) pixels.data[i+c] = base[c]+grain;
    pixels.data[i+3] = 255;
  }
  ctx.putImageData(pixels,0,0);
  if (kind === 'plaster') {
    for(let i=0;i<170;i++) {
      const x=random()*512,y=random()*512,r=10+random()*60;
      const wash=ctx.createRadialGradient(x,y,0,x,y,r);
      wash.addColorStop(0,`rgba(67,75,61,${random()*.08})`);wash.addColorStop(1,'rgba(67,75,61,0)');
      ctx.fillStyle=wash;ctx.fillRect(x-r,y-r,r*2,r*2);
    }
  } else {
    const cellW=kind==='slate'?42:kind==='brick'?85:128,cellH=kind==='slate'?32:kind==='brick'?32:64;
    for(let row=0;row<512/cellH;row++) for(let column=-1;column<512/cellW;column++) {
      const x=column*cellW+(row%2)*cellW/2,y=row*cellH;
      ctx.fillStyle=`rgba(${random()>.5?'211,204,178':'12,20,23'},${.04+random()*.14})`;
      ctx.fillRect(x+2,y+2,cellW-3,cellH-3);
      ctx.strokeStyle=kind==='slate'?'#111c2680':'#252b2670';ctx.lineWidth=kind==='slate'?2:2.5;
      ctx.strokeRect(x+1,y+1,cellW-1,cellH-1);
      ctx.fillStyle='#d7d4c023';ctx.fillRect(x+3,y+2,cellW-5,1);
      if(kind==='slate') {
        ctx.strokeStyle='#ffffff09';ctx.beginPath();ctx.moveTo(x+cellW*.3,y+3);ctx.lineTo(x+cellW*.25,y+cellH-3);ctx.stroke();
      }
    }
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createStreetStudio() {
  const canvas=document.createElement('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.1,180);
  const random=randomSource(1956),batches=new Map(),dummy=new THREE.Object3D();
  const boxGeometry=new THREE.BoxGeometry(1,1,1),rodGeometry=new THREE.CylinderGeometry(1,1,1,10);
  const materials={};
  function material(name,color,roughness=.8,metalness=0,texture=null) {
    const map=texture?surfaceTexture(texture,renderer):null;
    return materials[name]=new THREE.MeshStandardMaterial({color,roughness,metalness,map,bumpMap:map,bumpScale:texture==='plaster'?.028:.055});
  }
  const plaster=material('plaster',0xc1bcaa,.94,0,'plaster');
  const stone=material('stone',0xc3c3b8,.88,0,'stone');
  const brick=material('brick',0xaaa69a,.88,0,'brick');
  const slate=material('slate',0x788895,.73,.12,'slate');
  const wood=material('wood',0x354639,.8);
  const frame=material('frame',0x969b86,.62);
  const iron=material('iron',0x263238,.4,.78);
  const brass=material('brass',0x89734b,.35,.7);
  const dark=material('dark',0x070c0e,.96);
  const bark=material('bark',0x3d3d2d,.98,0,'stone');
  const paving=material('paving',0x737f83,.36,.16,'paving');
  paving.map.repeat.set(12,5);
  const ground=material('ground',0x141f1b,.95);
  const glass=new THREE.MeshStandardMaterial({color:0x172124,roughness:.2,metalness:.35});
  const warmGlass=new THREE.MeshStandardMaterial({color:0xc4a367,emissive:0xffb95c,emissiveIntensity:.85,roughness:.4});
  const curtain=new THREE.MeshStandardMaterial({color:0xb9a481,emissive:0xbc7d3c,emissiveIntensity:.26,roughness:1});

  // Repeated mouldings, window bars, paving and branches share GPU draw calls.
  function instance(geometry,mat,position,scale,rotation=[0,0,0],color=null) {
    const key=geometry.uuid+mat.uuid;
    if(!batches.has(key))batches.set(key,{geometry,mat,items:[]});
    dummy.position.set(...position);dummy.scale.set(...scale);dummy.rotation.set(...rotation);dummy.updateMatrix();
    batches.get(key).items.push({matrix:dummy.matrix.clone(),color});
  }
  const box=(mat,position,scale,rotation)=>instance(boxGeometry,mat,position,scale,rotation);
  function rod(mat,from,to,radius,endRadius=radius) {
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),direction=b.clone().sub(a);
    if(Math.abs(radius-endRadius)<.001) {
      dummy.position.copy(a.add(b).multiplyScalar(.5));dummy.scale.set(radius,direction.length(),radius);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());dummy.updateMatrix();
      const key=rodGeometry.uuid+mat.uuid;
      if(!batches.has(key))batches.set(key,{geometry:rodGeometry,mat,items:[]});
      batches.get(key).items.push({matrix:dummy.matrix.clone()});
    } else {
      const geometry=new THREE.CylinderGeometry(endRadius,radius,direction.length(),10);
      geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));
      geometry.translate(...a.add(b).multiplyScalar(.5).toArray());
      const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
    }
  }
  function mesh(geometry,mat,position=[0,0,0]) {
    const object=new THREE.Mesh(geometry,mat);object.position.set(...position);object.castShadow=object.receiveShadow=true;scene.add(object);return object;
  }

  // Sky light never illuminates the street. Its own shader gives clouds depth and soft edges.
  const skyUniforms={night:{value:0}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(110,40,24),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,
    vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp float;varying vec3 direction;uniform float night;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+7.1;a*=.5;}return v;}
      void main(){vec3 d=normalize(direction);float h=max(d.y,0.);vec2 p=d.xz/(h+.42)*2.1+vec2(5.2,1.7);
        float field=fbm(p*2.2),edge=fbm(p*6.5);float cloud=smoothstep(.46,.66,field+.075*edge);
        vec3 blue=mix(vec3(.66,.78,.84),vec3(.22,.48,.72),pow(h,.45));
        vec3 white=mix(vec3(.68,.74,.76),vec3(1.,.98,.91),smoothstep(.45,.7,field+fbm(p+vec2(.05,.12))*.18));
        vec3 day=mix(blue,white,cloud);float stars=step(.9982,hash(floor(p*145.)))*smoothstep(.13,.5,h);
        vec3 dark=mix(vec3(.028,.052,.086),vec3(.006,.015,.035),h)+stars*.4;
        dark=mix(dark,vec3(.075,.09,.12),cloud*.42);gl_FragColor=vec4(mix(day,dark,night),1.);}`
  }));
  scene.add(sky);

  // Canal-side house, with a real hipped roof, cut stone surrounds and recessed sash windows.
  box(ground,[0,-.16,-5],[80,.3,17]);
  box(paving,[0,.035,.95],[60,.1,3.3]);
  box(brick,[0,.12,2.72],[60,.38,.38]);
  for(let x=-18;x<18;x+=.72)box(stone,[x,.34,2.68],[.7,.13,.53]);
  box(brick,[0,.38,-1.7],[5.65,.75,3.25]);
  box(plaster,[0,2.46,-1.7],[5.4,3.75,3]);
  for(const y of [.7,2.57,4.25])box(stone,[0,y,-.14],[5.65,.13,.18]);
  for(const x of [-2.72,2.72])for(let y=.86;y<4.2;y+=.29) {
    box(stone,[x,y,-.13],[.27,.25,.2]);
    box(stone,[x,y,-.36],[.17,.25,.37]);
  }
  for(const [y,w,d] of [[4.3,5.63,3.24],[4.4,5.83,3.44],[4.48,5.95,3.55]])box(stone,[0,y,-1.7],[w,.095,d]);
  for(let x=-2.7;x<=2.7;x+=.25)box(stone,[x,4.32,-.045],[.08,.15,.17]);
  const roofVertices=[[-3,4.5,.14],[3,4.5,.14],[1.75,5.98,-1.7],[-1.75,5.98,-1.7],[-3,4.5,-3.54],[3,4.5,-3.54]];
  const roofFaces=[[0,1,2],[0,2,3],[5,4,3],[5,3,2],[1,5,2],[4,0,3]],positions=[],uvs=[];
  for(const face of roofFaces)for(const i of face){positions.push(...roofVertices[i]);uvs.push(roofVertices[i][0]*.43,roofVertices[i][2]*.72);}
  const roofGeometry=new THREE.BufferGeometry();roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));roofGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));roofGeometry.computeVertexNormals();mesh(roofGeometry,slate);
  rod(iron,[-1.8,6,-1.7],[1.8,6,-1.7],.06);
  box(brick,[1.68,5.7,-2.15],[.56,1.65,.57]);box(stone,[1.68,6.52,-2.15],[.69,.12,.7]);
  for(const x of [1.53,1.83])mesh(new THREE.CylinderGeometry(.085,.115,.27,14),brick,[x,6.72,-2.15]);
  // Dormer and its miniature pediment.
  box(plaster,[-.25,5.13,-.56],[1.01,.77,.47]);
  box(dark,[-.25,5.14,-.30],[.64,.59,.05]);box(glass,[-.25,5.14,-.267],[.49,.48,.03]);
  for(const x of [-.55,.05])box(frame,[x,5.14,-.24],[.06,.63,.07]);
  box(frame,[-.25,5.14,-.23],[.04,.52,.04]);
  for(const s of [-1,1])box(slate,[-.25+s*.3,5.65,-.47],[.7,.07,.75],[0,0,-s*.55]);

  function windowAt(x,y,lit) {
    const z=-.13,w=.84,h=1.16;
    box(dark,[x,y,z],[w+.19,h+.16,.12]);
    box(lit?warmGlass:glass,[x,y,z+.073],[w-.08,h-.06,.025]);
    if(lit)for(const side of [-1,1])for(let i=0;i<4;i++)box(curtain,[x+side*(.26+i*.028),y,z+.09],[.035,h-.09,.025]);
    for(const side of [-1,1]) {
      box(stone,[x+side*(w/2+.09),y,z+.1],[.12,h+.27,.17]);
      box(frame,[x+side*(w/2-.014),y,z+.13],[.062,h+.05,.1]);
      box(wood,[x+side*(w/2+.3),y,z+.015],[.27,h+.08,.07]);
      for(let k=0;k<11;k++)box(wood,[x+side*(w/2+.3),y-h/2+.08+k*.101,z+.065],[.245,.045,.045],[.22,0,0]);
      for(const yy of [-.43,.43])box(iron,[x+side*(w/2+.3),y+yy,z+.09],[.24,.025,.018]);
    }
    for(const yy of [-h/2,h/2])box(frame,[x,y+yy,z+.14],[w,.07,.11]);
    box(stone,[x,y+h/2+.13,z+.13],[w+.36,.14,.24]);
    box(stone,[x,y-h/2-.1,z+.19],[w+.38,.12,.39]);
    box(frame,[x,y,z+.16],[.045,h,.08]);box(frame,[x,y+.04,z+.17],[w,.046,.08]);
  }
  [-1.76,0,1.76].forEach((x,i)=>windowAt(x,3.36,i===0||i===2));
  [-1.76,1.76].forEach((x,i)=>windowAt(x,1.6,i===1));
  // Panelled door, fanlight, handle and three worn entrance steps.
  box(stone,[0,1.2,-.1],[1.23,2.27,.19]);box(wood,[0,1.12,.018],[.99,2.02,.08]);
  for(const x of [-.23,.23])for(const y of [.65,1.34]) {
    box(frame,[x,y,.072],[.35,.5,.025]);box(wood,[x,y,.094],[.29,.44,.025]);
  }
  box(warmGlass,[0,2.03,.05],[.86,.25,.04]);
  for(const x of [-.28,0,.28])box(iron,[x,2.03,.09],[.025,.27,.02]);
  mesh(new THREE.SphereGeometry(.034,14,10),brass,[.34,1.02,.14]);
  for(let i=0;i<3;i++)box(stone,[0,.15+i*.09,.48-i*.13],[1.35-i*.08,.14,.85-i*.22]);
  // Side-wall masonry and rainwater goods keep the oblique view dimensional.
  for(const x of [-2.83,2.83]) {
    rod(iron,[x,.25,.02],[x,4.38,.02],.034);
    rod(iron,[x,4.39,.02],[x,4.39,-3.35],.045);
    for(const y of [.7,2.6,4])box(iron,[x,y,.02],[.1,.035,.1]);
  }
  for(const z of [-1.1,-2.4]) {
    box(dark,[2.706,3.35,z],[.035,1.26,.7]);box(glass,[2.73,3.35,z],[.02,1.1,.56]);
    for(const y of [2.74,3.36,3.97])box(stone,[2.76,y,z],[.13,.06,.82]);
    box(frame,[2.76,3.35,z],[.07,1.18,.04]);
  }

  // Fine wrought-iron fence with spearheads and stone gateposts.
  const spearGeometry=new THREE.ConeGeometry(.036,.11,4);
  for(const side of [-1,1]) {
    const start=side<0?-8:1.05,end=side<0?-1.05:8;
    box(brick,[(start+end)/2,.34,.97],[end-start,.43,.26]);
    for(const y of [.66,1.24])box(iron,[(start+end)/2,y,.97],[end-start,.035,.045]);
    for(let x=start;x<end;x+=.19) {
      rod(iron,[x,.53,.97],[x,1.39,.97],.012);
      instance(spearGeometry,iron,[x,1.42,.97],[1,1,1]);
    }
    for(const x of [side*1.04,side*4.35,side*7.9]) {
      box(stone,[x,.72,.97],[.29,1.24,.36]);box(stone,[x,1.37,.97],[.4,.11,.46]);
      mesh(new THREE.SphereGeometry(.13,14,10),stone,[x,1.54,.97]);
    }
  }

  // Individual folded leaves rather than spherical canopies. Every leaf and twig
  // is seeded once; scrubbing the timeline never changes the silhouette.
  const leafGeometry=new THREE.BufferGeometry();
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.38,.3,.04,0,.5,.16, 0,0,0,0,.5,.16,.38,.3,.04, -.38,.3,.04,0,1,0,0,.5,.16, 0,.5,.16,0,1,0,.38,.3,.04],3));
  leafGeometry.computeVertexNormals();
  const leafMaterial=new THREE.MeshStandardMaterial({color:0x5f7450,roughness:.94,side:THREE.DoubleSide});
  function tree(x,z,height,spread,seed) {
    const rand=randomSource(seed),tips=[];
    function branch(from,direction,length,radius,depth) {
      const to=from.clone().addScaledVector(direction,length);
      rod(bark,from.toArray(),to.toArray(),radius);
      if(depth===0){tips.push(to);return;}
      const count=depth===3?5:3;
      for(let i=0;i<count;i++) {
        const angle=i/count*TAU+rand()*1.2,reach=depth===3?.95:.75;
        const next=new THREE.Vector3(Math.cos(angle)*reach,.52+rand()*.68,Math.sin(angle)*reach).addScaledVector(direction,.35).normalize();
        branch(to,next,length*(.52+rand()*.16),radius*.5,depth-1);
      }
    }
    branch(new THREE.Vector3(x,.1,z),new THREE.Vector3(.045,1,0),height*.37,.17,3);
    for(const tip of tips)for(let i=0;i<120;i++) {
      const angle=rand()*TAU,vertical=rand()*2-1,r=Math.cbrt(rand())*spread*.26;
      const ring=Math.sqrt(1-vertical*vertical),size=.085+rand()*.14;
      instance(leafGeometry,leafMaterial,[tip.x+Math.cos(angle)*ring*r,tip.y+vertical*r*.8,tip.z+Math.sin(angle)*ring*r],
        [size,size*(1+rand()*.5),size],[rand()*TAU,rand()*TAU,rand()*TAU],new THREE.Color().setHSL(.23+rand()*.065,.16+rand()*.24,.31+rand()*.22));
    }
  }
  tree(-4.25,-.52,9.0,4.6,82);tree(4.75,-2.9,8.4,4.5,119);
  // A quieter second depth plane of planting and neighbouring roofs.
  for(let i=0;i<60;i++) {
    const x=(random()-.5)*38,z=-5-random()*11,h=.8+random()*2.1;
    for(let j=0;j<260;j++) {
      const angle=random()*TAU,vertical=random()*2-1,r=Math.cbrt(random()),ring=Math.sqrt(1-vertical*vertical),size=.18+random()*.18;
      instance(leafGeometry,leafMaterial,[x+Math.cos(angle)*ring*r*1.15,h+vertical*r*h*.7,z+Math.sin(angle)*ring*r],
        [size,size,size],[random()*TAU,random()*TAU,random()*TAU],new THREE.Color().setHSL(.26,.22,.2+random()*.14));
    }
  }
  for(const x of [-12,-8,8,12]) {
    box(brick,[x,1.8,-11],[3.1,3.6,3]);
    for(const side of [-1,1]) {
      box(slate,[x+side*.83,4,-11],[1.95,.12,3.3],[0,0,-side*.55]);
      for(const y of [1.3,2.8])box(dark,[x+side*.7,y,-9.47],[.47,.84,.04]);
    }
  }

  // Cast iron lantern: lathed base and column, four framed panes, cap and finial.
  const lampPosition=new THREE.Vector3(.8,3.38,1.88);
  const profile=[[.15,0],[.16,.08],[.12,.15],[.11,.37],[.075,.48],[.042,.58],[.031,2.6],[.068,2.65],[.074,2.74],[.1,2.78]];
  mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),28),iron,[lampPosition.x,.14,lampPosition.z]);
  box(iron,[.8,2.96,1.88],[.34,.07,.34]);
  const lanternGlass=new THREE.MeshStandardMaterial({color:0xffe6aa,emissive:0xffcd7c,emissiveIntensity:2.4,roughness:.25});
  box(lanternGlass,[.8,3.23,1.88],[.245,.47,.245]);
  for(const x of [-1,1])for(const z of [-1,1])rod(iron,[.8+x*.145,2.98,1.88+z*.145],[.8+x*.18,3.52,1.88+z*.18],.015);
  box(iron,[.8,3.51,1.88],[.39,.055,.39]);
  mesh(new THREE.ConeGeometry(.29,.22,4),iron,[.8,3.645,1.88]).rotation.y=Math.PI/4;
  mesh(new THREE.SphereGeometry(.043,16,10),brass,[.8,3.81,1.88]);
  function haloTexture() {
    const c=document.createElement('canvas');c.width=c.height=128;const context=c.getContext('2d');
    const g=context.createRadialGradient(64,64,1,64,64,64);g.addColorStop(0,'#fff9dfa0');g.addColorStop(.12,'#ffe4a84a');g.addColorStop(.4,'#ffc37614');g.addColorStop(1,'#ffb05400');
    context.fillStyle=g;context.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
  }
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTexture(),color:0xffd39b,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  glow.position.copy(lampPosition);glow.position.y=3.27;glow.scale.set(2.4,2.4,1);scene.add(glow);
  const hemi=new THREE.HemisphereLight(0x8eafdb,0x182522,.47);scene.add(hemi);
  // Daylight fill belongs to the street, independently of the impossible night sky.
  const daylightAmbient=new THREE.AmbientLight(0xfff3db,0);scene.add(daylightAmbient);
  const daylightFill=new THREE.DirectionalLight(0xe9f3ff,0);daylightFill.position.set(7,9,12);scene.add(daylightFill);
  const moon=new THREE.DirectionalLight(0xa6bed5,.85);moon.position.set(-6,11,7);moon.castShadow=true;
  moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-12,right:12,top:12,bottom:-9,near:1,far:35});moon.shadow.normalBias=.045;moon.shadow.bias=-.0002;scene.add(moon);
  const lamp=new THREE.PointLight(0xffcd8c,16,10,2);lamp.position.set(.8,3.24,1.88);scene.add(lamp);
  const pool=new THREE.SpotLight(0xffd29d,30,11,1.12,.72,1.7);pool.position.set(.8,3.16,1.88);pool.target.position.set(.8,0,1.88);pool.castShadow=true;pool.shadow.mapSize.set(1024,1024);pool.shadow.bias=-.0005;scene.add(pool,pool.target);
  const doorway=new THREE.PointLight(0xffbb70,2.5,2.6,2);doorway.position.set(0,1.8,.45);scene.add(doorway);

  // A genuine mirrored render, with small horizontal ripples and a dark water tint.
  const reflectionShader={
    uniforms:THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms),
    vertexShader:Reflector.ReflectorShader.vertexShader,
    fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform float daylight;varying vec4 vUv;
      void main(){vec2 uv=vUv.xy/vUv.w;float wave=sin(uv.y*380.+sin(uv.x*57.)*1.8+time*.7);
        vec2 offset=vec2(wave*.0008,sin(uv.y*170.+time*.4)*.0004);
        vec3 reflected=texture2D(tDiffuse,uv+offset).rgb;
        reflected+=texture2D(tDiffuse,uv+offset+vec2(.0015,0.)).rgb;reflected*=.5;
        float glint=pow(.5+.5*sin(uv.y*690.+uv.x*27.),14.)*.012;
        vec3 tint=mix(vec3(.19,.25,.28),vec3(.62,.74,.78),daylight);
        vec3 ambient=mix(vec3(.004,.009,.013),vec3(.045,.095,.105),daylight);
        gl_FragColor=vec4(reflected*tint+ambient+glint*(1.+daylight*2.),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  };
  reflectionShader.uniforms.time={value:0};
  reflectionShader.uniforms.daylight={value:0};
  const water=new Reflector(new THREE.PlaneGeometry(100,55),{textureWidth:1024,textureHeight:1024,clipBias:.003,shader:reflectionShader,multisample:0});
  water.rotation.x=-Math.PI/2;water.position.set(0,-.03,30.3);scene.add(water);

  for(const {geometry,mat,items} of batches.values()) {
    const instanced=new THREE.InstancedMesh(geometry,mat,items.length);
    items.forEach((item,i)=>{instanced.setMatrixAt(i,item.matrix);if(item.color)instanced.setColorAt(i,item.color);});
    instanced.castShadow=instanced.receiveShadow=true;instanced.computeBoundingSphere();scene.add(instanced);
  }
  let lost=false,lastWidth=0,lastHeight=0,shadowReady=false;
  canvas.addEventListener('webglcontextlost',()=>{lost=true;});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;shadowReady=false;});
  function render(width,height,state) {
    if(lost)return null;
    const dpr=Math.min(devicePixelRatio||1,width<500?1.5:2);
    if(lastWidth!==width||lastHeight!==height) {
      renderer.setPixelRatio(dpr);renderer.setSize(Math.max(1,Math.round(width)),Math.max(1,Math.round(height)),false);
      lastWidth=width;lastHeight=height;camera.aspect=width/height;
      const retreat=Math.max(1,.88/camera.aspect);
      camera.position.set(5.6*retreat,4.3*retreat,20*retreat);camera.lookAt(0,3.45,-.4);camera.updateProjectionMatrix();
    }
    skyUniforms.night.value=state.sky;
    // The street moves toward daylight as the sky moves toward night.
    const night=state.night,day=1-night;
    renderer.toneMappingExposure=1.12+day*.65;
    hemi.intensity=.47+day*7.5;
    hemi.color.setHex(0x8eafdb).lerp(new THREE.Color(0xc9e5ff),day);
    hemi.groundColor.setHex(0x182522).lerp(new THREE.Color(0x96937b),day);
    moon.intensity=.85+day*7.2;
    moon.color.setHex(0xa6bed5).lerp(new THREE.Color(0xffedce),day);
    daylightAmbient.intensity=day*2.4;daylightFill.intensity=day*4.5;
    lamp.intensity=16*night;pool.intensity=30*night;doorway.intensity=2.5*night;
    warmGlass.emissiveIntensity=.85*night;curtain.emissiveIntensity=.26*night;
    lanternGlass.emissiveIntensity=2.4*night;glow.material.opacity=night;
    lanternGlass.color.setHex(0xffe6aa).lerp(new THREE.Color(0x667578),day);
    water.material.uniforms.time.value=state.time;
    water.material.uniforms.daylight.value=day;
    renderer.shadowMap.autoUpdate=!shadowReady;
    renderer.render(scene,camera);shadowReady=true;
    const project=point=>{const v=point.clone().project(camera);return {x:(v.x*.5+.5)*width,y:(.5-v.y*.5)*height};};
    return {canvas,lamp:project(lampPosition),sky:project(new THREE.Vector3(-1,8,-5)),house:project(new THREE.Vector3(0,2.5,0))};
  }
  return {render};
}

window.createSurrealStreetStudio=()=>{
  try{return createStreetStudio();}
  catch(error){console.warn('Detailed street renderer unavailable; using the lightweight scene.',error);return null;}
};
