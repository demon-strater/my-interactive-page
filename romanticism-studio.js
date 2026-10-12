import {THREE,studio,material,mesh,box,lathe,tube,randomSource,TAU} from './art-quality.js';

function makeWanderer(){
  const group=new THREE.Group(),coat=material('cloth',0x283d3d),boots=material('wood',0x25231e),skin=material('ceramic',0xc1a98b,{roughness:.72}),hair=material('wood',0x5f5142);
  const torso=lathe(group,coat,[[.17,.3],[.145,.38],[.115,.57],[.145,.77],[.09,.82],[.075,.86]], [0,0,0],56);
  const p=torso.geometry.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),a=Math.atan2(p.getZ(i),p.getX(i)),fold=1+Math.sin(a*13)*.07*(1-(y-.3)/.56);p.setX(i,p.getX(i)*fold);p.setZ(i,p.getZ(i)*fold*.65);}torso.geometry.computeVertexNormals();
  for(const side of [-1,1]){
    const leg=mesh(group,new THREE.CapsuleGeometry(.041,.26,6,16),coat,[side*.065,.19,0]);leg.rotation.z=side*.13;
    box(group,boots,[side*.085,.035,-.032],[.091,.085,.18],.03);
    tube(group,coat,[[side*.13,.76,0],[side*.2,.61,.01],[side*.17,.48,-.04]],.046,14);
    mesh(group,new THREE.SphereGeometry(.041,20,12),skin,[side*.17,.46,-.04]);
  }
  mesh(group,new THREE.SphereGeometry(.094,40,28),skin,[0,.97,0]).scale.set(.82,1.18,.85);
  const scalp=mesh(group,new THREE.SphereGeometry(.101,40,24,0,TAU,0,Math.PI*.65),hair,[0,.997,.005]);scalp.scale.set(.85,1,.87);
  for(let i=0;i<9;i++)tube(group,hair,[[-.075+i*.018,1.03,.027],[-.07+i*.017,1.075,0],[-.06+i*.016,1.03,-.06]],.009,8);
  box(group,coat,[0,.862,.045],[.16,.05,.056],.01);
  tube(group,material('wood',0x8c7854),[[.17,.48,-.04],[.23,.5,-.04],[.28,.015,-.04]],.011,16);
  return group;
}
function makeTerrain(elevation){
  const world=studio({exposure:1.05,ambient:.45}),{scene}=world,rand=randomSource(1818),camera=new THREE.OrthographicCamera();
  const geometry=new THREE.PlaneGeometry(14,11,320,240);geometry.rotateX(-Math.PI/2);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getZ(i)+.8;p.setXYZ(i,x,elevation(x,z),-z);}
  geometry.computeVertexNormals();
  const rock=material('stone',0x8a8b78,{roughness:.94}),u={vast:{value:1},warmth:{value:.5},fog:{value:.3}};
  rock.onBeforeCompile=shader=>{
    shader.uniforms.uVast=u.vast;shader.uniforms.uWarmth=u.warmth;shader.uniforms.uFog=u.fog;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uVast;varying vec3 landscapePosition;varying vec3 landscapeNormal;')
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal.y/=mix(1.,uVast,smoothstep(-.2,1.,-position.z));')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y*=mix(1.,uVast,smoothstep(-.2,1.,-position.z));landscapePosition=transformed;landscapeNormal=normalize(objectNormal);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform float uWarmth,uFog;varying vec3 landscapePosition,landscapeNormal;
      float hashRock(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float rockNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hashRock(i),hashRock(i+vec2(1,0)),f.x),mix(hashRock(i+vec2(0,1)),hashRock(i+1.),f.x),f.y);}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 p=landscapePosition;float edge=length(vec2(p.x/7.,(-p.z-.8)/5.5));if(edge>.97)discard;
        float sediment=sin(p.y*47.+rockNoise(p.xz*2.4)*9.)*.5+.5;
        float crag=rockNoise(p.xz*17.+p.y*8.),fine=rockNoise(p.xz*93.);
        vec3 mineral=mix(vec3(.25,.31,.34),vec3(.43,.36,.26),uWarmth);
        mineral*=.73+.2*crag+.11*fine+.12*sediment;
        float moss=smoothstep(.55,.92,landscapeNormal.y)*(1.-smoothstep(.45,1.6,p.y));
        mineral=mix(mineral,vec3(.19,.25,.14),moss*.52);
        float snow=smoothstep(2.8,4.5,p.y+crag*.4)*smoothstep(.55,.9,landscapeNormal.y);
        mineral=mix(mineral,vec3(.65,.72,.72),snow*.72);diffuseColor.rgb=mineral;`)
      .replace('#include <dithering_fragment>',`#include <dithering_fragment>
        float mist=uFog*(1.-smoothstep(.45,1.65,landscapePosition.y))*.24;
        gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.52,.63,.62),mist);`);
  };
  const terrain=mesh(scene,geometry,rock);terrain.castShadow=false;
  // Individual rock formations and branched conifers supply scale and true parallax.
  const cragMat=material('stone',0x71776d),treeMat=material('cloth',0x243d30),trunkMat=material('wood',0x514534),forest=new THREE.Group();scene.add(forest);
  for(let i=0;i<75;i++){
    const x=-5.5+rand()*11,z=-1.8+rand()*3,y=elevation(x,z);if(y>.85||y<.17)continue;
    const h=.2+rand()*.32,tree=new THREE.Group();tree.position.set(x,y,-z);forest.add(tree);
    mesh(tree,new THREE.CylinderGeometry(.006,.016,h,7),trunkMat,[0,h/2,0]);
    for(let k=0;k<6;k++){
      const canopy=mesh(tree,new THREE.ConeGeometry(h*(.29-k*.026),h*.39,11,3),treeMat,[0,h*(.32+k*.115),0]);canopy.rotation.y=k*.79;
    }
  }
  for(let i=0;i<100;i++){
    const x=-6+rand()*12,z=-3.7+rand()*9.2,y=elevation(x,z);if(y<.22)continue;
    const r=.025+rand()*.075,rock=mesh(scene,new THREE.DodecahedronGeometry(r,1),cragMat,[x,y,-z]);rock.scale.set(1+rand(),.5+rand(),1);rock.rotation.set(rand(),rand(),rand());
    rock.userData.landscape={x,z,y};
  }
  const wanderer=makeWanderer();wanderer.position.set(-.45,elevation(-.45,-2.9),2.9);scene.add(wanderer);
  const crowd=Array.from({length:15},(_,i)=>{const figure=makeWanderer();figure.visible=false;scene.add(figure);return figure;});
  world.sun.position.set(-8,12,5);world.sun.intensity=3;world.sun.shadow.camera.far=60;
  return Object.assign(function(ctx,w,h,options){
    const {cx,cy,scale,yaw,vast,warmth,fog}=options;
    const sy=scale*Math.sqrt(1+.47*.47),sx=scale*1.18;
    Object.assign(camera,{left:-cx/sx,right:(w-cx)/sx,top:cy/sy,bottom:(cy-h)/sy,near:.1,far:120});
    camera.position.set(-Math.sin(yaw)*45,.47*45,Math.cos(yaw)*45);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
    u.vast.value=vast;u.warmth.value=warmth;u.fog.value=fog;
    world.sun.color.setHSL(.11,.25+warmth*.24,.84);world.sun.position.x=-7+warmth*11;
    wanderer.scale.setScalar(options.personScale??1);
    crowd.forEach((figure,i)=>{figure.visible=options.crowd!==undefined&&options.crowd<.65;if(!figure.visible)return;const depart=Math.min(1,options.crowd/.65),x=(i%5-2)*1.55,z=-2+Math.floor(i/5)*.9;figure.position.set(x+(i%2?1:-1)*depart*6,elevation(x,z),-z);figure.scale.setScalar(.88);});
    scene.traverse(o=>{if(!o.userData.landscape)return;const {y,z}=o.userData.landscape;const f=Math.max(0,Math.min(1,(z+.2)/1.2));o.position.y=y*(1+(vast-1)*f*f*(3-2*f));});
    const canvas=world.render(w,h,camera);if(!canvas)return false;ctx.drawImage(canvas,0,0,w,h);return true;
  },{detailed:true});
}
const fallback=window.createRomanticTerrain;
window.createRomanticTerrain=elevation=>{try{return makeTerrain(elevation);}catch(error){console.warn('Landscape fallback:',error);return fallback?.(elevation);}};
