/* GPU terrain: continuous normals, rock strata, altitude mist and an organic edge.
   Kept independent of the transport; the Canvas renderer remains the fallback. */
window.createRomanticTerrain = function(elevation) {
  const surface=document.createElement('canvas');
  const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl)return null;
  let lost=false;
  surface.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});
  const vertex=`
    attribute vec3 aPosition;
    attribute vec2 aSlope;
    uniform vec2 uResolution, uCenter;
    uniform float uScale,uYaw,uVast;
    varying vec3 vPosition,vNormal;
    void main(){
      float grow=mix(1.,uVast,smoothstep(-.2,1.,aPosition.z));
      vec3 pos=vec3(aPosition.x,aPosition.y*grow,aPosition.z);
      float ca=cos(uYaw),sa=sin(uYaw);
      float rx=pos.x*ca-pos.z*sa,rz=pos.x*sa+pos.z*ca;
      vec2 pixel=uCenter+vec2(rx*1.18,-pos.y-rz*.47)*uScale;
      gl_Position=vec4(pixel.x/uResolution.x*2.-1.,1.-pixel.y/uResolution.y*2.,(rz-pos.y*.47)/28.,1.);
      vPosition=pos;vNormal=normalize(vec3(-aSlope.x*grow,1.,-aSlope.y*grow));
    }`;
  const fragment=`
    precision highp float;
    uniform float uWarmth,uFog;
    varying vec3 vPosition,vNormal;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
    void main(){
      vec3 p=vPosition,n=normalize(vNormal);
      float edge=length(vec2(p.x/7.,(p.z-.8)/5.5));
      float alpha=1.-smoothstep(.83,1.,edge);
      if(alpha<.005)discard;
      float grit=noise(p.xz*28.)*.12+noise(p.xz*62.)*.045;
      float strata=.5+.5*sin(p.y*38.+noise(p.xz*3.)*7.+p.x*1.7);
      float erosion=noise(vec2(p.x*12.+p.z*3.,p.y*2.4));
      vec3 rock=mix(vec3(.19,.25,.28),vec3(.44,.38,.27),uWarmth*.8);
      rock*=.90+grit+strata*.065+erosion*.12;
      float grass=smoothstep(.58,.91,n.y)*(1.-smoothstep(.65,1.9,p.y));
      rock=mix(rock,vec3(.22,.29,.25),grass*.55);
      float snow=smoothstep(2.75,4.3,p.y+noise(p.xz*8.)*.6)*smoothstep(.15,.8,n.y);
      rock=mix(rock,vec3(.70,.74,.69),snow*.58);
      vec3 sun=normalize(mix(vec3(-.8,.7,-.5),vec3(.65,.8,-.3),uWarmth));
      float diffuse=max(0.,dot(n,sun));
      float rim=pow(max(0.,dot(n,normalize(vec3(-.5,.35,.7)))),3.);
      float occlusion=.67+.33*smoothstep(.1,1.5,p.y);
      vec3 color=rock*(.35+diffuse*1.5)*occlusion+vec3(.24,.33,.37)*rim*.27;
      color+=vec3(.25,.18,.08)*pow(diffuse,7.)*uWarmth*.30;
      float distance=smoothstep(-3.,6.,p.z)*.25;
      color=mix(color,vec3(.32,.42,.45),distance);
      float mist=uFog*(1.-smoothstep(.65,1.75,p.y))*(.35+noise(p.xz*.9)*.25);
      color=mix(color,mix(vec3(.47,.58,.61),vec3(.68,.73,.69),uWarmth),mist);
      gl_FragColor=vec4(color,alpha);
    }`;
  function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}catch(error){console.warn('Terrain uses Canvas fallback:',error.message);return null;}
  const vertices=[],indices=[],nx=192,nz=128;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
    const x=-7+i*14/nx,z=-4.7+j*11/nz,eps=.025;
    vertices.push(x,elevation(x,z),z,(elevation(x+eps,z)-elevation(x-eps,z))/(eps*2),(elevation(x,z+eps)-elevation(x,z-eps))/(eps*2));
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,d=a+nx+1;indices.push(a,d,b,b,d,d+1);}
  gl.useProgram(program);
  const vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  for(const [name,size,offset] of [['aPosition',3,0],['aSlope',2,12]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,20,offset);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  const u=Object.fromEntries(['Resolution','Center','Scale','Yaw','Vast','Warmth','Fog'].map(n=>[n,gl.getUniformLocation(program,'u'+n)]));
  return function(c,w,h,options){
    if(lost)return false;
    const dpr=Math.min(devicePixelRatio||1,2),sw=Math.round(w*dpr),sh=Math.round(h*dpr);
    if(surface.width!==sw||surface.height!==sh){surface.width=sw;surface.height=sh;}
    gl.viewport(0,0,sw,sh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    gl.uniform2f(u.Resolution,w,h);gl.uniform2f(u.Center,options.cx,options.cy);
    for(const n of ['Scale','Yaw','Vast','Warmth','Fog'])gl.uniform1f(u[n],options[n.toLowerCase()]);
    gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    c.drawImage(surface,0,0,w,h);return true;
  };
};
