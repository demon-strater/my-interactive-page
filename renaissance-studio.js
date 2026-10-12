import {THREE,studio,material,mesh,box,classicalColumn,TAU} from './art-quality.js';

function buildHall(scene){
  const stone=material('marble',0xc4b598,{roughness:.48}),dark=material('marble',0x5c655c),cream=material('marble',0xd2c7ae),bronze=material('metal',0xa58b55);
  const hall=new THREE.Group();scene.add(hall);
  // Separate pale and dark inlaid tiles give the perspective lines real surfaces.
  const tileGeometry=new THREE.BoxGeometry(.985,.065,1.98),count=8*16;
  for(const [parity,mat] of [[0,cream],[1,dark]]){
    const tiles=new THREE.InstancedMesh(tileGeometry,mat,count/2),dummy=new THREE.Object3D();let i=0;
    for(let z=0;z<16;z++)for(let x=0;x<8;x++)if((x+z)%2===parity){dummy.position.set(x-3.5,-.035,z*2+1);dummy.updateMatrix();tiles.setMatrixAt(i++,dummy.matrix);}
    tiles.receiveShadow=true;hall.add(tiles);
  }
  const bays=[];
  for(let z=0;z<=28;z+=4){
    const bay=new THREE.Group();bay.position.z=z;hall.add(bay);bays.push(bay);
    for(const x of [-3.5,3.5]){const column=classicalColumn(stone,{height:3.3,radius:.25});column.position.x=x;bay.add(column);}
    for(let i=0;i<30;i++){
      const a=(i+.5)/30*Math.PI;
      const block=box(bay,stone,[Math.cos(a)*3.54,3.29+Math.sin(a)*1.72,0],[.38,.21,.31],.012);block.rotation.z=Math.atan2(1.72*Math.cos(a),-3.54*Math.sin(a));
    }
    for(const x of [-3.5,3.5]){
      box(bay,stone,[x,3.31,2],[.42,.19,4]);box(bay,bronze,[x,3.47,2],[.44,.035,4]);
      for(let step=0;step<8;step++)box(bay,stone,[x,3.15,.25+step*.5],[.48,.17,.09],.008);
    }
  }
  const columns=[classicalColumn(material('marble',0xbfa566),{accent:bronze}),classicalColumn(material('marble',0x568f87),{accent:material('metal',0x7abbb0)})];
  columns[0].position.set(-1.25,0,2);columns[1].position.set(1.25,0,10);scene.add(...columns);
  return {hall,bays,columns,update(s){columns[1].position.z=s.distance;for(const bay of bays)bay.visible=bay.position.z<=s.length;}};
}
function createRenaissanceStudio(){
  const world=studio({exposure:.95}),{scene}=world,model=buildHall(scene);
  world.sun.position.set(-4,12,-3);world.sun.target.position.set(0,1,10);scene.add(world.sun.target);world.sun.shadow.camera.far=65;
  const orthographic=new THREE.OrthographicCamera(),perspective=new THREE.PerspectiveCamera(2*Math.atan(4.95/10)*180/Math.PI,6.4/4.95,.1,80);
  const picture=document.createElement('canvas');picture.width=960;picture.height=Math.round(960*4.95/6.4);const ctx=picture.getContext('2d');let cache='';
  function drawSpace(ctx,w,h,s,r){
    model.update(s);
    const front=Math.min(r.w*.76/6.4,r.h*.82/4.95),side=Math.min(r.w*.9/29,r.h*.74/10),scale=front+(side-front)*s.turn;
    const focus=new THREE.Vector3(0,2.025+(1.5-2.025)*s.turn,-3+10*s.turn),yaw=-1.12*s.turn,pitch=.24*s.turn;
    const forward=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    const cx=r.x+r.w*.5,cy=r.y+r.h*.51;
    Object.assign(orthographic,{left:-cx/scale,right:(w-cx)/scale,top:cy/scale,bottom:(cy-h)/scale,near:.1,far:150});
    orthographic.position.copy(focus).addScaledVector(forward,60);orthographic.lookAt(focus);orthographic.updateProjectionMatrix();
    scene.background=null;const canvas=world.render(w,h,orthographic);if(!canvas)return false;
    ctx.save();ctx.globalAlpha=s.room;ctx.drawImage(canvas,0,0,w,h);ctx.restore();return true;
  }
  function renderPicture(s){
    const key=[s.eye,s.distance,s.length].join(':');if(key===cache)return picture;
    model.update(s);perspective.position.set(0,s.eye,-8);perspective.lookAt(0,s.eye,10);perspective.updateProjectionMatrix();perspective.projectionMatrix.elements[9]=-(s.eye-2.025)*2/4.95;
    scene.background=new THREE.Color(0x26333b);const canvas=world.render(picture.width,picture.height,perspective);if(!canvas)return null;
    ctx.save();ctx.clearRect(0,0,picture.width,picture.height);ctx.translate(picture.width,0);ctx.scale(-1,1);ctx.drawImage(canvas,0,0,picture.width,picture.height);ctx.restore();cache=key;return picture;
  }
  function drawHall(ctx,w,h,vp,amount){
    model.columns.forEach(c=>c.visible=false);model.bays.forEach(b=>b.visible=true);
    const focal=w*.49*8/3.5,eye=(h-vp.y*h)*8/focal;
    perspective.fov=2*Math.atan(h/(2*focal))*180/Math.PI;perspective.aspect=w/h;perspective.position.set(0,eye,-8);perspective.lookAt(0,eye,10);perspective.updateProjectionMatrix();
    perspective.projectionMatrix.elements[8]=vp.x*2-1;perspective.projectionMatrix.elements[9]=vp.y*2-1;
    scene.background=null;const canvas=world.render(w,h,perspective);if(!canvas)return false;
    ctx.save();ctx.globalAlpha=.32+.54*amount;ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(canvas,0,0,w,h);ctx.restore();return true;
  }
  return {drawSpace,renderPicture,drawHall};
}
window.createRenaissanceStudio=()=>{try{return createRenaissanceStudio();}catch(error){console.warn('Architecture uses its Canvas fallback:',error);return null;}};
