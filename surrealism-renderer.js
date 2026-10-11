(() => {
  'use strict';
  // Draws the Surrealism film (surrealism-scene.js gives the state). A small WebGL studio renders the 3D sets: the room
  // (awake or dreaming, or holding the apple) and the street at dusk; everything is then composed on the film's 2D
  // canvas with its notes. Each chapter returns the control's target: a horizontal slider ('x'), a vertical one ('y'),
  // the apple, or a button ('chance').
  const {clamp,lerp,smooth}=window.SurrealScene,TAU=Math.PI*2;
  const normalize=vector=>{const length=Math.hypot(...vector)||1;return vector.map(value=>value/length);};
  const cross=(first,second)=>[first[1]*second[2]-first[2]*second[1],first[2]*second[0]-first[0]*second[2],first[0]*second[1]-first[1]*second[0]];
  const dot=(first,second)=>first.reduce((sum,value,index)=>sum+value*second[index],0);
  const mix3=(from,to,amount)=>from.map((value,index)=>lerp(value,to[index],amount));
  function multiply(first,second){const result=new Float32Array(16);for(let column=0;column<4;column++)for(let row=0;row<4;row++)for(let inner=0;inner<4;inner++)result[column*4+row]+=first[inner*4+row]*second[column*4+inner];return result;}
  // Model matrix: scale, then turn about z (roll), then about y (angle), then move.
  function axes(angle,roll){const cy=Math.cos(angle),sy=Math.sin(angle),cz=Math.cos(roll),sz=Math.sin(roll);return [[cy*cz,sz,-sy*cz],[-cy*sz,cz,sy*sz],[sy,0,cy]];}
  function transform(position,scale,angle=0,roll=0){const a=axes(angle,roll);return new Float32Array([...a[0].map(v=>v*scale[0]),0,...a[1].map(v=>v*scale[1]),0,...a[2].map(v=>v*scale[2]),0,...position,1]);}
  function normals(scale,angle=0,roll=0){const a=axes(angle,roll);return new Float32Array([...a[0].map(v=>v/scale[0]),...a[1].map(v=>v/scale[1]),...a[2].map(v=>v/scale[2])]);}
  function camera(aspect,orbit=0,focus=[0,1.75,-.2],reach=1){
    const distance=Math.max(11.8,9.7/Math.max(.5,aspect))*reach;
    const direction=normalize([.38+orbit,.27,.9]),eye=focus.map((value,index)=>value+direction[index]*distance);
    const forward=normalize(eye.map((value,index)=>value-focus[index])),right=normalize(cross([0,1,0],forward)),up=cross(forward,right);
    const view=new Float32Array([right[0],up[0],forward[0],0,right[1],up[1],forward[1],0,right[2],up[2],forward[2],0,-dot(right,eye),-dot(up,eye),-dot(forward,eye),1]);
    const focal=1/Math.tan(Math.PI/13),near=.1,far=80;
    const projection=new Float32Array([focal/aspect,0,0,0,0,focal,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
    return {eye,matrix:multiply(projection,view)};
  }
  function surface(horizontal,vertical,point){
    const vertices=[];
    function vertex(column,row){
      const first=column/horizontal,second=row/vertical,position=point(first,second),epsilon=.0001;
      const tangent=point(first+epsilon,second).map((value,index)=>value-position[index]),bitangent=point(first,second+epsilon).map((value,index)=>value-position[index]);
      let normal=normalize(cross(tangent,bitangent));if(Math.hypot(...normal)<.5)normal=normalize(position);
      return [...position,...normal];
    }
    for(let row=0;row<vertical;row++)for(let column=0;column<horizontal;column++){const corners=[vertex(column,row),vertex(column+1,row),vertex(column+1,row+1),vertex(column,row+1)];for(const index of [0,1,2,0,2,3])vertices.push(...corners[index]);}
    return new Float32Array(vertices);
  }
  function cube(){
    const vertices=[],faces=[[[1,0,0],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]],[[-1,0,0],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]],[[0,1,0],[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]],[[0,-1,0],[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]],[[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]];
    faces.forEach(face=>{for(const index of [1,2,3,1,3,4])vertices.push(...face[index],...face[0]);});return new Float32Array(vertices);
  }

  // ── The 3D studio. Materials: 0 plain, 1 checkered floor, 2 apple skin, 3 brass, 4 the window's sky, 5 leaf,
  // 6 lit from within (lamps, lit windows), 7 cloud, 8 the street's sky. uMelt droops whatever is drawn below uMeltAt. ──
  function createStudio(){
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
    if(!gl)return null;
    const vertexSource=`attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uModel,uCamera;uniform mat3 uNormal;uniform float uMelt;uniform vec3 uMeltAt;varying vec3 vWorld,vNormal;
      void main(){vec4 world=uModel*vec4(aPosition,1.0);
        if(uMelt>0.0){vec3 rel=world.xyz-uMeltAt;float below=max(0.0,.7-rel.y),sag=uMelt*(.4+.6*smoothstep(-.7,.7,rel.x));world.y-=sag*below*below*.85;world.x+=sag*rel.x*below*.2;}
        vWorld=world.xyz;vNormal=normalize(uNormal*aNormal);gl_Position=uCamera*world;}`;
    const fragmentSource=`precision highp float;varying vec3 vWorld,vNormal;uniform vec3 uColor,uEye,uApple,uLamp;uniform float uMaterial,uRadius,uDream,uNight,uSky,uLampOn;
      float hash(vec2 value){return fract(sin(dot(value,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 value){vec2 cell=floor(value),part=fract(value);part=part*part*(3.0-2.0*part);return mix(mix(hash(cell),hash(cell+vec2(1,0)),part.x),mix(hash(cell+vec2(0,1)),hash(cell+vec2(1,1)),part.x),part.y);}
      vec3 skyAt(vec2 at,float night,float edge){float clouds=noise(at)*.65+noise(at*2.1)*.25+noise(at*4.6)*.1;vec3 day=mix(vec3(.43,.64,.81),vec3(.95,.94,.86),smoothstep(.58-edge,.58+edge,clouds));
        vec3 dark=vec3(.02,.035,.08)+vec3(.85)*step(.993,hash(floor(at*70.0)))*.7;return mix(day,dark,night);}
      void main(){vec3 normal=normalize(vNormal),view=normalize(uEye-vWorld),light=normalize(vec3(-.62,.88,.55)),halfway=normalize(light+view);vec3 base=uColor;float rough=.72;
        if(uMaterial>5.5&&uMaterial<6.5){gl_FragColor=vec4(uColor,1.0);return;}
        if(uMaterial>3.5&&uMaterial<4.5){vec3 sky=skyAt(vWorld.xy*2.8,uSky,.115);gl_FragColor=vec4(mix(sky,sky*vec3(.13,.19,.32),uDream),1.0);return;}
        if(uMaterial>7.5){gl_FragColor=vec4(skyAt(vWorld.xy*vec2(.85,1.0)+vec2(3.0,1.0),uSky,.05),1.0);return;}
        if(uMaterial>6.5){float lit=max(dot(normal,light),0.0);vec3 cloud=mix(vec3(.74,.79,.88),vec3(1.0,.99,.96),lit*.8+.2);gl_FragColor=vec4(mix(cloud,cloud*vec3(.62,.72,.9),uDream*.3),1.0);return;}
        float grain=noise(vWorld.xz*180.0+vWorld.y*27.0);base*=.97+.06*grain;
        if(uMaterial>.5&&uMaterial<1.5){vec2 tile=vWorld.xz*.87;float checker=mod(floor(tile.x)+floor(tile.y),2.0);base=mix(vec3(.12,.20,.24),vec3(.72,.72,.64),checker);vec2 seam=abs(fract(tile)-.5);base*=1.0-.13*smoothstep(.476,.498,max(seam.x,seam.y));rough=.38;}
        if(uMaterial>1.5&&uMaterial<2.5){float skin=noise(vWorld.xy*4.0+vWorld.z)*.7+noise(vWorld.xz*23.0)*.3;base=mix(vec3(.16,.28,.045),vec3(.49,.61,.11),skin);base+=vec3(.09,.045,.005)*smoothstep(.80,.95,grain);rough=.22;}
        if(uMaterial>2.5&&uMaterial<3.5)rough=.19;
        float diffuse=max(dot(normal,light),0.0),occlusion=1.0;
        if(uMaterial<1.5&&uRadius>0.0){vec3 offset=uApple-vWorld;float along=dot(offset,light);float across=length(offset-light*along);occlusion=1.0-.64*(1.0-smoothstep(uRadius*.65,uRadius*1.3,across))*step(.05,along);}
        float ambient=.29+.17*(normal.y*.5+.5);float corner=1.0-.17*exp(-max(vWorld.y,0.0)*1.4);vec3 color=base*(vec3(.63,.75,.92)*ambient*corner+vec3(1.03,.94,.77)*diffuse*.86*occlusion);
        float specular=pow(max(dot(normal,halfway),0.0),mix(12.0,115.0,1.0-rough));vec3 specColor=uMaterial>2.5&&uMaterial<3.5?base*1.2:vec3(.94,.98,1.0);color+=specColor*specular*(1.0-rough)*.75*occlusion;
        color+=base*pow(1.0-max(dot(normal,view),0.0),3.0)*.20;
        if(uMaterial>.5&&uMaterial<1.5){vec2 pool=(vWorld.xz-vec2(-1.0,.6))/vec2(1.55,2.4);float sunlight=(1.0-smoothstep(.82,1.0,max(abs(pool.x),abs(pool.y))))*.2*(1.0-uDream);color+=vec3(1.0,.8,.45)*sunlight*occlusion;}
        color=mix(color,color*vec3(.47,.64,.85),uDream*.57);
        color=mix(color,color*vec3(.11,.15,.26),uNight*.9);
        if(uLampOn>0.0){vec3 toLamp=uLamp-vWorld;float near=dot(toLamp,toLamp),facing=max(dot(normal,normalize(toLamp)),0.0)*.7+.3;color+=base*vec3(1.0,.74,.4)*uLampOn*facing*1.5/(1.0+near*1.3);}
        gl_FragColor=vec4(pow(max(color,0.0),vec3(.83)),1.0);}`;
    function shader(type,source){const compiled=gl.createShader(type);gl.shaderSource(compiled,source);gl.compileShader(compiled);if(!gl.getShaderParameter(compiled,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(compiled));gl.deleteShader(compiled);return null;}return compiled;}
    const vertex=shader(gl.VERTEX_SHADER,vertexSource),fragment=shader(gl.FRAGMENT_SHADER,fragmentSource);if(!vertex||!fragment)return null;
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
    const uniforms=Object.fromEntries(['Model','Camera','Normal','Color','Eye','Material','Apple','Radius','Dream','Night','Sky','Lamp','LampOn','Melt','MeltAt'].map(name=>[name,gl.getUniformLocation(program,'u'+name)]));
    const attributes=[gl.getAttribLocation(program,'aPosition'),gl.getAttribLocation(program,'aNormal')];
    const meshes={};
    const shapes={box:cube(),sphere:surface(48,32,(horizontal,vertical)=>{const angle=horizontal*TAU,polar=vertical*Math.PI;return [Math.sin(polar)*Math.cos(angle),Math.cos(polar),Math.sin(polar)*Math.sin(angle)];}),
      apple:surface(80,56,(horizontal,vertical)=>{const angle=horizontal*TAU,polar=vertical*Math.PI,radial=Math.sin(polar)*(1+.045*Math.cos(angle*5)*Math.sin(polar))*(1+.08*Math.cos(polar));return [radial*Math.cos(angle),.96*Math.cos(polar)-.17*Math.exp(-Math.pow(polar/.23,2))+.10*Math.exp(-Math.pow((Math.PI-polar)/.24,2)),radial*Math.sin(angle)];}),
      ring:surface(64,12,(horizontal,vertical)=>{const angle=horizontal*TAU,tube=vertical*TAU;return [(1+.065*Math.cos(tube))*Math.cos(angle),(1+.065*Math.cos(tube))*Math.sin(angle),.065*Math.sin(tube)];}),
      leaf:surface(28,12,(horizontal,vertical)=>[horizontal,.16*Math.sin(horizontal*Math.PI)+.08*Math.pow(vertical*2-1,2),(vertical*2-1)*Math.sin(horizontal*Math.PI)*.32])};
    Object.entries(shapes).forEach(([name,data])=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);meshes[name]={buffer,count:data.length/6};});
    let lost=false;canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;});
    function draw(name,position,scale,color,material=0,angle=0,roll=0){
      const mesh=meshes[name];gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      attributes.forEach((attribute,index)=>{gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,3,gl.FLOAT,false,24,index*12);});
      gl.uniformMatrix4fv(uniforms.Model,false,transform(position,scale,angle,roll));gl.uniformMatrix3fv(uniforms.Normal,false,normals(scale,angle,roll));
      gl.uniform3fv(uniforms.Color,color);gl.uniform1f(uniforms.Material,material);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
    function project(position,matrix,wide,tall){const point=[...position,1],clip=Array.from({length:4},(_,row)=>point.reduce((sum,value,column)=>sum+value*matrix[column*4+row],0));return {x:(clip[0]/clip[3]*.5+.5)*wide,y:(.5-clip[1]/clip[3]*.5)*tall};}
    const plaster=[.68,.71,.68],trim=[.76,.74,.65],brass=[.66,.45,.19],ink=[.13,.17,.2];
    // The room: checkered floor, two walls, the window onto the sky.
    function room(){
      draw('box',[0,.03,0],[6.6,.25,4.4],[.18,.22,.25]);draw('box',[0,.17,0],[6.45,.035,4.3],plaster,1);
      draw('box',[0,2.17,-2.12],[6.6,4,.2],plaster);draw('box',[-3.21,2.17,0],[.18,4,4.4],[.55,.63,.63]);
      for(const vertical of [.35,3.94]){draw('box',[0,vertical,-1.98],[6.5,.14,.17],trim);draw('box',[-3.07,vertical,0],[.15,.14,4.15],trim);}
      draw('box',[-1.45,2.36,-1.98],[1.72,2.04,.10],[.12,.18,.22]);draw('box',[-1.45,2.36,-1.91],[1.48,1.82,.03],[.66,.8,.91],4);
      for(const horizontal of [-2.28,-.62])draw('box',[horizontal,2.36,-1.83],[.13,2.18,.16],trim);
      for(const vertical of [1.31,3.41])draw('box',[-1.45,vertical,-1.80],[1.87,.14,.23],trim);
      draw('box',[-1.45,2.36,-1.76],[.055,1.99,.1],trim);draw('box',[-1.45,2.36,-1.76],[1.68,.055,.1],trim);
      draw('box',[-1.45,1.29,-1.65],[2,.12,.6],trim);
    }
    // The dream: the wall clock melts and its hands race, clouds float in through the window, the table lifts off.
    const clockAt=[1.30,2.62,-1.79],pane=[-1.45,2.4,-2.3];
    const cloudsTo=[[-2.1,3.25,-.2],[-.15,3.4,1.0],[-2.3,2.35,1.35]],puffs=[[0,0,0,.42],[.4,.05,0,.32],[-.38,-.03,.06,.3],[.1,.23,0,.3],[-.14,.19,-.05,.26]];
    function dreaming(scene){
      const d=scene.dream,spin=scene.time*(.03+d*.55),minute=spin*TAU,hour=spin*TAU/6;
      gl.uniform1f(uniforms.Melt,d);gl.uniform3fv(uniforms.MeltAt,clockAt);
      draw('sphere',[1.30,2.62,-1.91],[.66,.66,.09],brass,3);draw('sphere',[1.30,2.62,-1.79],[.57,.57,.045],[.91,.87,.73]);draw('ring',[1.30,2.62,-1.72],[.6,.6,.6],brass,3);
      for(let index=0;index<12;index++){const angle=index/12*TAU;draw('sphere',[1.30+Math.sin(angle)*.46,2.62+Math.cos(angle)*.46,-1.72],[.021,.038,.014],[.15,.2,.23]);}
      draw('box',[1.30+Math.sin(minute)*.17,2.62+Math.cos(minute)*.17,-1.69],[.035,.34,.025],ink,0,0,-minute);
      draw('box',[1.30+Math.sin(hour)*.14,2.62+Math.cos(hour)*.14,-1.67],[.3,.032,.028],ink,0,0,Math.PI/2-hour);
      draw('sphere',[1.3,2.62,-1.64],[.045,.045,.03],brass,3);
      gl.uniform1f(uniforms.Melt,0);
      const lift=smooth(.35,1,d)*1.05+Math.sin(scene.time*1.3)*.04*d;
      draw('box',[1.15,.84+lift,.35],[1.7,.13,1.0],[.24,.14,.075]);for(const horizontal of [.48,1.82])for(const depth of [0,.7])draw('box',[horizontal,.47+lift,depth],[.065,.65,.065],brass,3);
      draw('ring',[1.0,.98+lift,.45],[.16,.16,.16],brass,3);draw('box',[1.34,.96+lift,.45],[.43,.045,.045],brass,3);draw('box',[1.50,1.03+lift,.45],[.055,.17,.055],brass,3);
      const clouds=cloudsTo.map((to,index)=>{
        const come=smooth(.12+index*.14,.7+index*.1,d),at=mix3(pane,to,come);at[1]+=Math.sin(scene.time*.8+index*2)*.06*come;
        if(come>.01)for(const [x,y,z,r] of puffs)draw('sphere',[at[0]+x*come,at[1]+y*come,at[2]+z],[r*come,r*come*.8,r*come],[1,1,1],7);
        return at;
      });
      return {clock:[1.62,2.0,-1.72],cloud:clouds[0],table:[1.15,.84+lift,.35],lift};
    }
    function apple(scene,radius,at){
      draw('apple',at,[radius,radius,radius],[.34,.49,.09],2,scene.orbit*.6);
      draw('sphere',[at[0]+radius*.035,at[1]+radius*.84,at[2]],[radius*.045,radius*.23,radius*.044],[.19,.10,.035]);
      draw('leaf',[at[0]+radius*.01,at[1]+radius*.93,at[2]],[radius*.73,radius*.73,radius*.73],[.12,.25,.06],5,-.5);
    }
    // The street: a pale house with its windows, a tree beside it, a lamp in front; the sky is its own (uSky),
    // the street darkens with uNight and the lamp lights up with it.
    const lampAt=[.95,2.02,-.35];
    function street(scene){
      const night=scene.night,glow=[1.0,.8,.45],glass=[.2,.27,.33];
      draw('box',[0,4.6,-3.6],[18,10,.1],[0,0,0],8);
      draw('box',[0,.03,0],[12,.25,7],[.2,.25,.21]);draw('box',[0,.17,.55],[12,.035,1.5],[.42,.43,.41]);draw('box',[0,.19,-.35],[12,.04,.08],[.55,.55,.52]);
      draw('box',[-.35,1.42,-1.95],[2.9,2.5,1.4],[.82,.8,.74]);
      draw('box',[-1.07,3.02,-1.95],[1.66,.13,1.62],[.32,.27,.25],0,0,.52);draw('box',[.37,3.02,-1.95],[1.66,.13,1.62],[.32,.27,.25],0,0,-.52);
      draw('box',[.45,3.45,-2.15],[.24,.75,.24],[.6,.56,.5]);
      const windowColor=mix3(glass,glow,smooth(.35,.85,night));
      for(const [x,y,lit] of [[-1.3,2.05,1],[-.35,2.05,0],[.6,2.05,1],[-1.3,1.05,0],[.6,1.05,1]]){
        draw('box',[x,y,-1.24],[.5,.62,.04],[.86,.85,.8]);draw('box',[x,y,-1.22],[.38,.5,.04],lit?windowColor:mix3(glass,[.3,.24,.16],night),6);
        draw('box',[x-.31,y,-1.21],[.12,.62,.03],[.2,.33,.25]);draw('box',[x+.31,y,-1.21],[.12,.62,.03],[.2,.33,.25]);
      }
      draw('box',[-.35,.82,-1.23],[.5,1.0,.05],[.18,.24,.2]);
      const leaves=[.11,.2,.1];
      draw('box',[2.25,1.25,-1.25],[.22,2.2,.22],[.25,.18,.12]);
      for(const [x,y,z,r] of [[2.25,3.0,-1.25,1.0],[1.85,2.55,-1.0,.72],[2.7,2.5,-.95,.74],[2.3,3.65,-1.4,.7],[2.85,3.2,-1.5,.65]])draw('sphere',[x,y,z],[r,r*.95,r],leaves);
      for(const [x,y,z,r] of [[-2.6,1.9,-1.6,1.1],[-3.2,2.5,-1.9,1.0],[-2.2,1.4,-1.0,.7],[-3.6,1.6,-1.2,.9]])draw('sphere',[x,y,z],[r,r,r],leaves);
      draw('box',[lampAt[0],1.1,lampAt[2]],[.07,1.85,.07],[.12,.13,.14]);draw('box',[lampAt[0],lampAt[1]+.17,lampAt[2]],[.22,.06,.22],[.12,.13,.14]);
      draw('sphere',lampAt,[.11,.13,.11],mix3([.62,.62,.58],[1,.92,.66],night),6);
      return {lamp:lampAt,sky:[-1.0,5.2,-3.5],house:[-.35,1.6,-1.2]};
    }
    function render(wide,tall,scene,mode){
      if(lost)return null;
      const pixelRatio=Math.min(devicePixelRatio||1,1.5),pixelWidth=Math.round(wide*pixelRatio),pixelHeight=Math.round(tall*pixelRatio);
      if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.useProgram(program);
      const streetMode=mode==='street',view=streetMode?camera(wide/tall,-.36,[-.1,2.7,-1.4],1.12):camera(wide/tall,mode==='apple'?scene.orbit:0);
      const radius=mode==='apple'?scene.apple*1.84:.18,appleAt=[mode==='apple'?(scene.appleX-.5)*4:0,.19+radius*.91,mode==='apple'?(scene.appleY-.53)*5+.3:.3];
      gl.uniformMatrix4fv(uniforms.Camera,false,view.matrix);gl.uniform3fv(uniforms.Eye,view.eye);
      gl.uniform1f(uniforms.Dream,mode==='dream'?scene.dream:0);gl.uniform1f(uniforms.Night,streetMode?scene.night:0);gl.uniform1f(uniforms.Sky,streetMode?scene.sky:0);
      gl.uniform1f(uniforms.LampOn,streetMode?smooth(.3,.9,scene.night):0);gl.uniform3fv(uniforms.Lamp,lampAt);gl.uniform1f(uniforms.Melt,0);gl.uniform3fv(uniforms.MeltAt,clockAt);
      const out={},place=point=>project(point,view.matrix,wide,tall);
      if(streetMode){gl.uniform1f(uniforms.Radius,0);gl.uniform3fv(uniforms.Apple,[0,0,0]);const spots=street(scene);for(const [name,point] of Object.entries(spots))out[name]=place(point);return {canvas,...out};}
      if(mode==='dream'){const lift=smooth(.35,1,scene.dream)*1.05;gl.uniform3fv(uniforms.Apple,[1.15,.84+lift,.35]);gl.uniform1f(uniforms.Radius,.75);}
      else{gl.uniform3fv(uniforms.Apple,appleAt);gl.uniform1f(uniforms.Radius,radius);}
      room();
      if(mode==='dream'){const spots=dreaming(scene);for(const name of ['clock','cloud','table'])out[name]=place(spots[name]);return {canvas,...out};}
      apple(scene,radius,appleAt);
      const center=place(appleAt),edge=place([appleAt[0]+radius,appleAt[1],appleAt[2]]);
      return {canvas,apple:{...center,radius:Math.abs(edge.x-center.x)}};
    }
    return {render};
  }

  // ── The film's canvas. ──
  window.createSurrealRenderer=(canvas,assets)=>{
    const ctx=canvas.getContext('2d'),studio=createStudio(),gold='#edca8d',cream='#efe6d4',sky='#a8cbe4',muted='#a7b8c5';
    const buffers=new Map();let width=1,height=1,target={};
    function buffer(name,wide,tall){let layer=buffers.get(name);if(!layer){layer=document.createElement('canvas');buffers.set(name,layer);}const pixelRatio=Math.min(devicePixelRatio||1,1.5);if(layer.width!==Math.round(wide*pixelRatio)||layer.height!==Math.round(tall*pixelRatio)){layer.width=Math.max(1,Math.round(wide*pixelRatio));layer.height=Math.max(1,Math.round(tall*pixelRatio));}return layer;}
    function path(points){ctx.beginPath();points.forEach((point,index)=>index?ctx.lineTo(...point):ctx.moveTo(...point));}
    function line(points,color='#d9c39c80',weight=1){ctx.save();path(points);ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.stroke();ctx.restore();}
    function text(value,left,top,size=12,color=cream,align='left',serif=false){ctx.save();ctx.font=`${size}px ${serif?"'Nanum Myeongjo',Georgia":"Arial,'Malgun Gothic'"},sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(value,left,top);ctx.restore();}
    function chip(value,left,top,color=cream,strong=false){ctx.save();ctx.font=`${strong?13:11}px Arial,'Malgun Gothic',sans-serif`;const wide=ctx.measureText(value).width+(strong?30:24),tall=strong?34:30;left=clamp(left,wide/2+8,width-wide/2-8);ctx.fillStyle='#0b1420e6';ctx.beginPath();ctx.roundRect(left-wide/2,top-tall/2,wide,tall,tall/2);ctx.fill();ctx.strokeStyle=strong?color+'88':'#d6c5a026';ctx.stroke();text(value,left,top,strong?13:11,color,'center');ctx.restore();return {left:left-wide/2,right:left+wide/2};}
    function shadow(left,top,wide,tall,opacity=.45){ctx.save();ctx.translate(left,top);ctx.scale(wide,tall);const shade=ctx.createRadialGradient(0,0,0,0,0,1);shade.addColorStop(0,`rgba(0,0,0,${opacity})`);shade.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=shade;ctx.fillRect(-1,-1,2,2);ctx.restore();}
    function glow(left,top,radius,color,opacity){ctx.save();ctx.globalAlpha*=opacity;const light=ctx.createRadialGradient(left,top,0,left,top,radius);light.addColorStop(0,color);light.addColorStop(1,color+'00');ctx.fillStyle=light;ctx.fillRect(left-radius,top-radius,radius*2,radius*2);ctx.restore();}
    function imageCover(image,box,source=null){if(!image.naturalWidth)return;const crop=source||{x:0,y:0,width:image.naturalWidth,height:image.naturalHeight},scale=Math.max(box.width/crop.width,box.height/crop.height),sourceWidth=box.width/scale,sourceHeight=box.height/scale;ctx.drawImage(image,crop.x+(crop.width-sourceWidth)/2,crop.y+(crop.height-sourceHeight)/2,sourceWidth,sourceHeight,box.x,box.y,box.width,box.height);}
    function frame(box,fill='#e9deca'){ctx.save();ctx.shadowColor='#0009';ctx.shadowBlur=28;ctx.shadowOffsetY=12;ctx.fillStyle=fill;ctx.fillRect(box.x,box.y,box.width,box.height);ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#e4c6945c';ctx.strokeRect(box.x+.5,box.y+.5,box.width-1,box.height-1);ctx.restore();}
    function atmosphere(){const light=ctx.createRadialGradient(width*.57,height*.3,0,width*.57,height*.3,width*.65);light.addColorStop(0,'#7894aa21');light.addColorStop(.55,'#293d5420');light.addColorStop(1,'#07101a00');ctx.fillStyle=light;ctx.fillRect(0,0,width,height);}
    // The note at the left of a chapter: a kicker, two or three lines in the serif, a line of detail under them.
    function sideNote(kicker,lines,detail,left,top){text(kicker,left,top,11,gold);lines.forEach((value,index)=>text(value,left,top+35+index*34,25,cream,'left',true));if(detail)(Array.isArray(detail)?detail:[detail]).forEach((value,index)=>text(value,left,top+52+lines.length*34+index*19,12,muted));}
    // A slider drawn on the canvas: its track, the part already travelled in gold, a word at each end.
    function slider(from,to,value,ends,vertical=false){
      const at=lerp(vertical?from.y:from.x,vertical?to.y:to.x,value),knob=vertical?{x:from.x,y:at}:{x:at,y:from.y};
      line([[from.x,from.y],[to.x,to.y]],'#d9c39c40',2);line([[from.x,from.y],[knob.x,knob.y]],gold+'cc',2);
      if(vertical){text(ends[0],from.x,from.y-30,11,muted,'center');text(ends[1],to.x,to.y+30,11,muted,'center');}
      else{text(ends[0],from.x,from.y+36,11,value<.5?cream:muted,'left');text(ends[1],to.x,to.y+36,11,value>=.5?cream:muted,'right');}
      return knob;
    }
    function fallbackRoom(box,scene){
      const inset={x:box.x+box.width*.2,y:box.y+box.height*.1,width:box.width*.65,height:box.height*.57};
      const faces=[{points:[[box.x,box.y],[inset.x,inset.y],[inset.x,inset.y+inset.height],[box.x,box.y+box.height]],colors:['#6a7c80','#9ea59c']},{points:[[inset.x,inset.y],[inset.x+inset.width,inset.y],[inset.x+inset.width,inset.y+inset.height],[inset.x,inset.y+inset.height]],colors:['#c9c8b8','#8c9a96']},{points:[[box.x,box.y+box.height],[inset.x,inset.y+inset.height],[inset.x+inset.width,inset.y+inset.height],[box.x+box.width,box.y+box.height]],colors:['#89968f','#233e44']}];
      faces.forEach(face=>{const gradient=ctx.createLinearGradient(box.x,box.y,box.x+box.width,box.y+box.height);gradient.addColorStop(0,face.colors[0]);gradient.addColorStop(1,face.colors[1]);path(face.points);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();});
      const radius=Math.min(box.width*.3,box.height*.44)*(scene.apple||.3),left=box.x+box.width*(scene.appleX||.5),top=box.y+box.height*.8-radius*.7;shadow(left,top+radius*.9,radius*1.15,radius*.25);
      const sheen=ctx.createRadialGradient(left-radius*.35,top-radius*.4,radius*.04,left+radius*.1,top+radius*.1,radius*1.1);sheen.addColorStop(0,'#bdca68');sheen.addColorStop(.28,'#8b9d39');sheen.addColorStop(.65,'#536b19');sheen.addColorStop(1,'#182d14');ctx.fillStyle=sheen;ctx.beginPath();ctx.ellipse(left,top,radius,radius*.92,0,0,TAU);ctx.fill();
      return {apple:{x:left,y:top,radius},clock:{x:box.x+box.width*.7,y:box.y+box.height*.3},cloud:{x:box.x+box.width*.4,y:box.y+box.height*.2},table:{x:box.x+box.width*.7,y:box.y+box.height*.7},lamp:{x:box.x+box.width*.6,y:box.y+box.height*.5},sky:{x:box.x+box.width*.3,y:box.y+box.height*.15},house:{x:box.x+box.width*.45,y:box.y+box.height*.6}};
    }
    function studioImage(box,scene,mode='apple',name='studio'){
      const rendered=studio?.render(box.width,box.height,scene,mode);
      if(!rendered)return fallbackRoom(box,scene);
      const layer=buffer(name,box.width,box.height),drawing=layer.getContext('2d');drawing.clearRect(0,0,layer.width,layer.height);drawing.drawImage(rendered.canvas,0,0,layer.width,layer.height);ctx.drawImage(layer,box.x,box.y,box.width,box.height);
      const out={};for(const [key,point] of Object.entries(rendered))if(key!=='canvas')out[key]={...point,x:box.x+point.x,y:box.y+point.y};
      return out;
    }

    // ── 1 · 꿈의 논리: the room, awake, drifts into a dream as the slider moves; each change is named where it happens. ──
    function dream(scene,geometry){
      const narrow=geometry.narrow,d=scene.dream,trackRoom=narrow?74:84,wide=Math.min(width*(narrow?.98:.66),(height-trackRoom)*1.62),tall=wide/1.62;
      const box={x:width*(narrow?.5:.63)-wide/2,y:Math.max(narrow?36:0,(height-trackRoom-tall)/2),width:wide,height:tall};
      const spots=studioImage(box,scene,'dream','dream');
      const changes=[['① 시계가 녹아내린다',spots.clock,.25],['② 구름이 방 안으로 들어온다',spots.cloud,.5],['③ 탁자가 공중에 뜬다',spots.table,.72]];
      // Each change is named where it happens; on a phone the scene gets only its number and the names go under the slider.
      changes.forEach(([label,point,from],index)=>{const show=smooth(from,from+.18,d);if(!show||!point)return;ctx.save();ctx.globalAlpha*=show;ctx.fillStyle=gold;ctx.beginPath();ctx.arc(point.x,point.y,3,0,TAU);ctx.fill();
        if(narrow){ctx.fillStyle='#0b1420e6';ctx.beginPath();ctx.arc(point.x,point.y-18,11,0,TAU);ctx.fill();text(label[0],point.x,point.y-17,13,gold,'center');text(label,box.x+box.width*.12,box.y+box.height+102+index*22,12,cream);}
        else chip(label,point.x,point.y-28,gold);ctx.restore();});
      const knob=slider({x:box.x+box.width*.12,y:box.y+box.height+34},{x:box.x+box.width*.88,y:box.y+box.height+34},d,['깨어 있는 방','꿈속의 방']);
      if(!narrow){
        const awake=d<.5;
        sideNote('꿈의 논리',awake?['평범한 방.','모든 것이','제자리에 있다.']:['꿈속에서는','이상한 일도','당연하다.'],awake?['시계는 제 속도로 가고,','구름은 창밖에 있다.']:['녹는 시계, 방 안의 구름 —','꿈꾸는 동안엔 이상하지 않다.'],width*.055,height*.18);
        text('초현실주의는 이 꿈의 세계를 그렸다',width*.055,height*.18+52+3*34+58,13,gold);
      }else chip(d<.5?'평범한 방 · 모든 것이 제자리':'꿈속에서는 이상한 일도 당연하다',width*.5,18,gold);
      target={kind:'x',key:'dream',x:knob.x,y:knob.y,from:box.x+box.width*.12,to:box.x+box.width*.88,value:d};
    }

    // ── 2 · 데페이즈망: the same apple, grown until it fills the room. ──
    function apple(scene,geometry){
      const narrow=geometry.narrow,wide=Math.min(width*(narrow?.98:.66),height*1.55),tall=Math.min(height*.94,wide/(narrow?.93:1.45));
      const box={x:width*(narrow?.5:.63)-wide/2,y:(height-tall)/2,width:wide,height:tall};
      shadow(box.x+wide*.5,box.y+tall*.9,wide*.45,tall*.08,.3);
      const rendered=studioImage(box,scene,'apple','apple');target={kind:'apple',...rendered.apple};
      const times=(scene.apple/.18).toFixed(1);
      if(!narrow){
        sideNote('데페이즈망 · 낯설게 하기',['사과도, 방도 평범하다.','이상한 건 크기 하나.'],['익숙한 물건을 엉뚱한 크기나 자리에 두면','평범한 방이 꿈처럼 낯설어진다.'],width*.055,height*.12);
        const inset={x:width*.055,y:height*.47,width:width*.18,height:height*.27};frame(inset,'#15232e');studioImage(inset,{...scene,apple:.18,appleX:.5,appleY:.53},'apple','ordinary');
        text('평소의 크기',inset.x+inset.width/2,inset.y+inset.height+20,11,muted,'center');
        text('× '+times,width*.055,height*.88,36,gold,'left',true);text('크기만 바뀌었다',width*.055+104,height*.885,11,muted);
      }else{chip('같은 사과 · 크기만 '+times+'배',width*.5,23,gold);text('크기 하나로, 방이 낯설어진다',width*.5,height-20,12,'#b9c8d0','center');}
    }

    // ── 3 · 낮과 밤: a street at dusk. Reality's rule (sky and street darken together), then Magritte's (the sky
    // turns back to noon while the street stays at midnight). The viewer moves the sky; the street stays dark. ──
    function rules(scene,left,top,wide){
      const cards=[['현실의 규칙','하늘이 저물면 거리도 함께 저문다',1-scene.rule,sky],['마그리트의 규칙','하늘은 정오인데, 거리는 한밤',scene.rule,gold]];
      cards.forEach(([title,body,on,color],index)=>{
        const y=top+index*96;ctx.save();ctx.globalAlpha*=.35+.65*on;ctx.fillStyle='#0b1420cc';ctx.beginPath();ctx.roundRect(left,y,wide,78,10);ctx.fill();
        ctx.strokeStyle=on>.5?color+'aa':'#d6c5a022';ctx.lineWidth=on>.5?1.4:1;ctx.stroke();
        text(title,left+18,y+24,12,color);text(body,left+18,y+51,16,cream,'left',true);ctx.restore();
      });
    }
    function street(scene,geometry){
      const narrow=geometry.narrow,wide=Math.min(width*(narrow?.98:.62),height*1.5),tall=Math.min(height*.96,wide/(narrow?.95:1.3));
      const box={x:width*(narrow?.46:.6)-wide/2,y:(height-tall)/2,width:wide,height:tall};
      ctx.save();ctx.beginPath();ctx.roundRect(box.x,box.y,box.width,box.height,6);ctx.clip();
      const spots=studioImage(box,scene,'street','street');
      const lit=smooth(.3,.9,scene.night);
      if(spots.lamp){glow(spots.lamp.x,spots.lamp.y,box.width*.09,'#ffd98a',.9*lit);glow(spots.lamp.x,spots.lamp.y+box.height*.3,box.width*.16,'#f2b860',.25*lit);}
      ctx.restore();
      const skyWord=scene.sky<.5?'하늘 · 낮':'하늘 · 밤',streetWord=scene.night<.5?'거리 · 낮':'거리 · 밤';
      chip(skyWord,box.x+box.width*.3,box.y+28,scene.sky<.5?gold:sky,true);chip(streetWord,box.x+box.width*.3,box.y+box.height-30,scene.night<.5?gold:sky,true);
      const rail=narrow?box.x+box.width-22:box.x+box.width+34,knob=slider({x:rail,y:box.y+40},{x:rail,y:box.y+box.height*.55},scene.sky,['☀ 낮','☾ 밤'],true);
      if(!narrow){text('하늘의 시간',rail,box.y+box.height*.55+54,11,muted,'center');rules(scene,width*.055,height*.2,Math.min(width*.23,300));
        text(scene.rule>.5?'이 규칙으로 그린 그림이 「빛의 제국」이다':'',width*.055,height*.2+212,12,gold);}
      else chip(scene.rule>.5?'마그리트의 규칙 · 하늘은 낮, 거리는 밤':'현실 · 하늘과 거리가 함께 저문다',width*.5,14,scene.rule>.5?gold:sky);
      target={kind:'y',key:'sky',x:knob.x,y:knob.y,from:box.y+40,to:box.y+box.height*.55,value:scene.sky};
    }

    // ── 4 · 우아한 시체: three players draw on paper folded so that none sees what came before; then it unfolds. ──
    function paper(box){frame(box);const tone=ctx.createLinearGradient(box.x,box.y,box.x+box.width,box.y+box.height);tone.addColorStop(0,'#f6eddd');tone.addColorStop(.6,'#e8dcc4');tone.addColorStop(1,'#d6c8ae');ctx.fillStyle=tone;ctx.fillRect(box.x,box.y,box.width,box.height);ctx.save();ctx.globalAlpha*=.08;for(let index=0;index<70;index++){const left=box.x+box.width*((index*.6180339)%1),top=box.y+box.height*((index*.4142135)%1);line([[left,top],[left+2,top+.3]],'#76644a');}ctx.restore();}
    function corpse(scene,geometry){
      const narrow=geometry.narrow,tall=Math.min(height-(narrow?150:136),width*(narrow?1.1:.62)),band=tall/3,wide=band*1.72;
      const sheet={x:width*.5-wide/2,y:narrow?height*.16:(height-tall)/2-4,width:wide,height:tall};
      paper(sheet);
      const names=['머리','몸통','다리'];
      scene.bands.forEach((state,index)=>{
        const top=sheet.y+index*band,image=assets.strips[index*6+scene.parts[index]];
        if(image?.naturalWidth&&state.draw>0){
          const scale=Math.min(sheet.width/image.naturalWidth,band/image.naturalHeight),drawWidth=image.naturalWidth*scale,drawHeight=image.naturalHeight*scale,vertical=index===0?band-drawHeight:index===2?0:(band-drawHeight)/2;
          ctx.save();ctx.beginPath();ctx.rect(sheet.x,top,sheet.width,band*state.draw);ctx.clip();ctx.drawImage(image,sheet.x+(sheet.width-drawWidth)/2,top+vertical,drawWidth,drawHeight);ctx.restore();
          if(state.draw<1){const y=top+band*state.draw,x=sheet.x+sheet.width*(.42+.16*Math.sin(state.draw*31));ctx.save();ctx.translate(x,y);ctx.rotate(-.7);ctx.fillStyle='#203a44';ctx.fillRect(-3,-52,6,44);ctx.fillStyle='#c2a16a';path([[-3,-8],[3,-8],[0,0]]);ctx.closePath();ctx.fill();ctx.restore();}
        }
        if(index)line([[sheet.x,top],[sheet.x+sheet.width,top]],'#7b6b4a55');
        // The fold: a flap of the same paper comes down over the finished part, so the next player can't see it.
        if(state.fold>0){const cover=band*state.fold;ctx.save();const flap=ctx.createLinearGradient(0,top,0,top+cover);flap.addColorStop(0,'#d9ccb1');flap.addColorStop(1,'#efe4cf');ctx.fillStyle=flap;ctx.fillRect(sheet.x,top,sheet.width,cover);
          ctx.shadowColor='#3b2a1a55';ctx.shadowBlur=10;ctx.shadowOffsetY=4;line([[sheet.x,top+cover],[sheet.x+sheet.width,top+cover]],'#8a7754',1.2);ctx.restore();
          if(state.fold>.9)text('접힘 · 다음 사람은 볼 수 없다',sheet.x+sheet.width/2,top+band/2,12,'#8a7754','center');}
        // Who is drawing which part.
        const active=scene.player===index,done=state.draw>=1;
        if(!narrow){const x=sheet.x+sheet.width+28,y=top+band/2;ctx.save();ctx.globalAlpha*=active?1:done?.75:.4;
          ctx.fillStyle=active?gold:'#0b1420';ctx.strokeStyle=gold+'88';ctx.beginPath();ctx.arc(x+14,y,14,0,TAU);ctx.fill();ctx.stroke();text(String(index+1),x+14,y+1,13,active?'#0b1420':gold,'center');
          text(`${index+1}번 사람 · ${names[index]}`,x+38,y-9,14,cream,'left',true);text(active?(index?'앞사람 그림은 접혀서 보이지 않는다':'아무 머리나 그리고, 접는다'):done?(index<2?'그리고, 접었다':'그렸다'):'차례를 기다린다',x+38,y+13,11,muted);ctx.restore();}
      });
      if(scene.reveal>0){ctx.save();ctx.globalAlpha*=scene.reveal;ctx.strokeStyle=gold;ctx.lineWidth=1.5;ctx.strokeRect(sheet.x-6,sheet.y-6,sheet.width+12,sheet.height+12);ctx.restore();
        if(!narrow)chip('펼치면 — 아무도 계획하지 않은 생물',sheet.x+sheet.width/2,sheet.y-26,gold,true);}
      if(!narrow)sideNote('우아한 시체 · 1925',['보지 않고','이어 그리기.'],['종이를 접어 앞 그림을 가린 채','셋이 머리·몸통·다리를 그린다.','','계획 대신 우연에 맡기면','무의식이 드러난다고 믿었다.'],width*.055,height*.18);
      else chip(scene.player>=0?`${scene.player+1}번 사람이 ${names[scene.player]}를 그린다 · 앞 그림은 접혀 있다`:'펼치면 — 아무도 계획하지 않은 생물',width*.5,height*.08,gold);
      target={kind:'chance',x:sheet.x+sheet.width/2,y:Math.min(height-24,sheet.y+sheet.height+34)};
    }

    // ── 5 · 또렷한 꿈: the painting from a dream's blur to photographic sharpness; then what makes it believable. ──
    function artBox(geometry,room=0){const tall=Math.min(height-58-room,width*(geometry.narrow?1.05:.72)),wide=tall*1120/1450;return {x:width*(geometry.narrow?.5:.6)-wide/2,y:Math.max(8,(height-room-tall)/2),width:wide,height:tall};}
    function clarity(scene,geometry){
      const image=assets.artwork;if(!image.naturalWidth)return;
      const art=artBox(geometry,62),c=scene.clarity;frame(art,'#121b23');
      ctx.save();ctx.beginPath();ctx.rect(art.x,art.y,art.width,art.height);ctx.clip();
      ctx.filter=`blur(${((1-c)*art.width/34).toFixed(1)}px) saturate(${lerp(.55,1,c).toFixed(2)}) brightness(${lerp(1.08,1,c).toFixed(2)})`;
      const bleed=(1-c)*art.width*.06;ctx.drawImage(image,art.x-bleed,art.y-bleed,art.width+bleed*2,art.height+bleed*2);ctx.filter='none';
      if(c<1){ctx.globalAlpha=(1-c)*.35;ctx.fillStyle='#c9d6e6';ctx.fillRect(art.x,art.y,art.width,art.height);}
      ctx.restore();
      if(scene.notes>0){
        ctx.save();ctx.globalAlpha*=scene.notes;
        const anchors=[{label:'나뭇잎 하나하나까지',horizontal:.33,vertical:.3,at:.2},{label:'켜진 가로등과 그 불빛',horizontal:.475,vertical:.73,at:.55},{label:'물에 비친 불빛',horizontal:.53,vertical:.91,at:.85}];
        anchors.forEach(anchor=>{const left=art.x+art.width*anchor.horizontal,top=art.y+art.height*anchor.vertical;ctx.fillStyle=gold;ctx.beginPath();ctx.arc(left,top,3,0,TAU);ctx.fill();
          if(geometry.narrow)chip(anchor.label,left,top-24,gold);else{const edge=art.x+art.width+40,labelY=art.y+art.height*anchor.at;line([[left,top],[edge-12,labelY]],gold+'99');chip(anchor.label,edge+70,labelY,gold);}});
        ctx.restore();
      }
      const knob=slider({x:art.x,y:art.y+art.height+30},{x:art.x+art.width,y:art.y+art.height+30},c,['흐릿한 꿈','또렷한 그림']);
      if(!geometry.narrow){
        sideNote('꿈을 사진처럼',c<.5?['꿈은 보통','흐릿하게 남는다.']:['초현실주의는 꿈을','사진처럼 그렸다.'],c<.5?['깨고 나면 장면이 흐려진다.']:['불가능한 장면인데도 너무 또렷해서,','우리는 그것을 진짜처럼 믿게 된다.'],width*.055,height*.24);
        text('빛의 제국 · 르네 마그리트 · 1956',width*.055,height*.24+52+2*34+56,12,gold);
      }else chip(c<.5?'꿈은 보통 흐릿하다':'초현실주의는 꿈을 사진처럼 그렸다',width*.5,14,gold);
      target={kind:'x',key:'clarity',x:knob.x,y:knob.y,from:art.x,to:art.x+art.width,value:c};
    }
    function draw(scene,geometry){
      width=geometry.width;height=geometry.height;const pixelRatio=Math.min(devicePixelRatio||1,2);ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.clearRect(0,0,width,height);atmosphere();target={};
      [dream,apple,street,corpse,clarity].forEach((render,index)=>{if(scene.layers[index]<=0)return;ctx.save();ctx.globalAlpha=scene.layers[index];render(scene,geometry);ctx.restore();});
      return target;
    }
    return {draw,threeDimensional:Boolean(studio)};
  };
})();
