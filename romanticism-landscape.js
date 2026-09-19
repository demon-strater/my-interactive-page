/* A deterministic relief model for exploring Romantic composition. */
(() => {
'use strict';
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t);},gold='#dec193',teal='#96c8c7';
const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x,z){const a=Math.floor(x),b=Math.floor(z),u=ease(x-a),v=ease(z-b);return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v);}
function elevation(x,z){const ridge=Math.exp(-Math.pow((z-3-.45*Math.sin(x)) / 1.7,2)),peaks=.55+2.9*Math.exp(-Math.abs(x+3.8)*.68)+2.3*Math.exp(-Math.abs(x-3.2)*.72);return .12+ridge*(peaks+noise(x*1.3,z)*.32)+noise(x*2.2,z*2.2)*.085+noise(x*5,z*5)*.025+1.6*Math.exp(-Math.pow((x+.45)/1.15,2)-Math.pow(z+2.9,2));}
const NX=68,NZ=44,grid=[];
for(let j=0;j<=NZ;j++){const row=[];for(let i=0;i<=NX;i++){const x=-7+i*14/NX,z=-4+j*10/NZ;row.push({x,z,y:elevation(x,z)});}grid.push(row);}
const art=new Image();art.src='romanticism-wanderer.jpg';art.addEventListener('load',()=>window.dispatchEvent(new Event('romantic-art-ready')));
function line(c,pts,color,width=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function poly(c,pts,color,seam=false){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=color;c.fill();if(seam){c.strokeStyle=color;c.lineWidth=.65;c.stroke();}}
function text(c,s,x,y,size=10,color=gold,align='left'){c.font=size+'px Arial, sans-serif';c.textAlign=align;c.fillStyle=color;c.fillText(s,x,y);}
function wrappedText(c,value,x,y,width,size,color){
 c.font=size+'px Arial, sans-serif';const words=value.split(' ');let row='',lineY=y;
 for(const word of words){const next=row?row+' '+word:word;if(row&&c.measureText(next).width>width){text(c,row,x,lineY,size,color);row=word;lineY+=size*1.45;}else row=next;}
 if(row)text(c,row,x,lineY,size,color);
}
function callout(c,a,x,y,title,detail,color=gold){
 const size=c.studySmall?13:15,width=c.studyNoteWidth;
 // Both leaders finish above the reserved text row; neither crosses another caption.
 line(c,[a,{x:x+12,y:y-27},{x:x+12,y:y-17}],color+'88',.8);
 c.beginPath();c.arc(a.x,a.y,3,0,TAU);c.fillStyle=color;c.fill();
 text(c,title,x,y,size,color);wrappedText(c,detail,x,y+24,width,size,'#c0cdcc');
}
function person(c,x,y,s=1,alpha=1){
 c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha*=alpha;c.fillStyle='#080f12';c.strokeStyle='#bbad8c';c.lineWidth=.6;
 c.beginPath();c.moveTo(-5,-38);c.bezierCurveTo(-13,-36,-11,-22,-14,-10);c.lineTo(-7,-8);c.lineTo(-6,0);c.lineTo(-1,0);c.lineTo(1,-13);c.lineTo(4,0);c.lineTo(9,0);c.lineTo(6,-11);c.lineTo(13,-13);c.bezierCurveTo(9,-22,12,-34,5,-38);c.closePath();c.fill();c.stroke();
 const coat=c.createLinearGradient(-9,0,10,0);coat.addColorStop(0,'#142026');coat.addColorStop(.65,'#263b3e');coat.addColorStop(1,'#6a7268');c.fillStyle=coat;
 c.beginPath();c.moveTo(-6,-36);c.lineTo(6,-36);c.lineTo(10,-13);c.lineTo(0,-16);c.lineTo(-11,-12);c.closePath();c.fill();
 c.fillStyle='#a39778';c.beginPath();c.ellipse(0,-42,4.8,6,0,0,TAU);c.fill();c.fillStyle='#292d2b';c.beginPath();c.moveTo(-5,-41);c.bezierCurveTo(-8,-52,8,-51,5,-41);c.lineTo(2,-44);c.lineTo(-2,-42);c.fill();
 line(c,[{x:9,y:-29},{x:15,y:-22},{x:18,y:-24}],'#56615b',3);line(c,[{x:18,y:-26},{x:22,y:2}],'#bda981',1);line(c,[{x:0,y:-34},{x:-1,y:-18}],'#a9ae933d',.6);c.restore();
}
function render(c,w,h,time,index,amount,settings={}){
 const p=ease(amount),t=settings.reduced?0:time,warmth=index===3?p:index===2?p*.8:.55;
 const fog=index===1?mix(.01,1,p):index===2?.48:.65,vast=index===2?mix(.65,1.8,p):1,yaw=index===0?mix(-.42,-.12,p):-.12;
 const compact=w>=700&&h<500;
 const area=settings.layout||{top:h*.23,bottom:h*.85},noteHeight=compact?8:w<500?112:94;
 const stageBottom=area.bottom-noteHeight,stageHeight=Math.max(30,stageBottom-area.top);
 const cx=w*.5;
 const extent=grid.reduce((max,row)=>Math.max(max,...row.map(v=>v.y*(v.z>0?vast:1)+v.z*.47+Math.abs(v.x)*.08)),1);
 const s=Math.max(1,Math.min(w*(compact?.026:.062),stageHeight/(extent+2.7))),cy=stageBottom-s*2.7;
 c.studySmall=w<500||compact;c.studyNoteWidth=w*(compact?.21:.40);
 const project=(x,y,z)=>({x:cx+(x*Math.cos(yaw)-z*Math.sin(yaw))*s,y:cy-y*s+(x*Math.sin(yaw)+z*Math.cos(yaw))*s*-.47});
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#101a1f');bg.addColorStop(.55,'#111b20');bg.addColorStop(1,'#070d12');c.fillStyle=bg;c.fillRect(0,0,w,h);
 const glow=c.createRadialGradient(cx,cy-h*.16,0,cx,cy-h*.16,w*.38);glow.addColorStop(0,'rgba(110,136,132,.12)');glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(0,0,w,h);
 c.save();c.globalAlpha=.24;for(let z=-4;z<=6;z++)line(c,[project(-7,-.48,z),project(7,-.48,z)],'#52656a',.5);for(let x=-7;x<=7;x++)line(c,[project(x,-.48,-4),project(x,-.48,6)],'#52656a',.5);c.restore();
 const height=v=>v.y*(v.z>0?vast:1);
 for(let j=NZ-1;j>=0;j--)for(let i=0;i<NX;i++){
  const a=grid[j][i],b=grid[j][i+1],d=grid[j+1][i],e=grid[j+1][i+1];
  for(const tri of [[a,d,b],[b,d,e]]){const avg=tri.reduce((sum,v)=>sum+height(v),0)/3,dx=(height(b)-height(a))/(14/NX),dz=(height(d)-height(a))/(10/NZ),normal=Math.sqrt(dx*dx+dz*dz+1),lit=clamp((-.65*dx+.5-.4*dz)/normal,.05,.95);const r=mix(24,143,lit)+warmth*(18+avg*10),g=mix(42,151,lit)+warmth*avg*5,bv=mix(52,164,lit)-warmth*(15+avg*6);poly(c,tri.map(v=>project(v.x,height(v),v.z)),'rgb('+(r|0)+','+(g|0)+','+(bv|0)+')',true);}
 }
 const edge=grid[0];for(let i=0;i<NX;i++)poly(c,[project(edge[i].x,edge[i].y,-4),project(edge[i+1].x,edge[i+1].y,-4),project(edge[i+1].x,-.48,-4),project(edge[i].x,-.48,-4)],i%4===0?'#253438':'#1b292e');
 // Marching squares gives true topographic isolines.
 for(let level=.4;level<4.8;level+=.32){c.beginPath();for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const q=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]],hits=[];for(let k=0;k<4;k++){const a=q[k],b=q[(k+1)%4],ya=height(a),yb=height(b);if((ya<level)!==(yb<level)){const f=(level-ya)/(yb-ya);hits.push(project(mix(a.x,b.x,f),level+.008,mix(a.z,b.z,f)));}}
  for(let k=0;k+1<hits.length;k+=2){c.moveTo(hits[k].x,hits[k].y);c.lineTo(hits[k+1].x,hits[k+1].y);}}
  c.strokeStyle='rgba(203,218,196,'+(level>2?.16:.08)+')';c.lineWidth=.6;c.stroke();}
 // A continuous fog bank conceals the terrain as the control moves.
 for(let j=0;j<30;j++){const z=5-j*.26,pts=[];for(let i=0;i<=60;i++){const x=-7+i*14/60,y=.58+fog*.58+Math.sin(x*.65+z+t*.12)*.08;pts.push(project(x,y,z));}for(let i=60;i>=0;i--){const x=-7+i*14/60;pts.push(project(x,.45+fog*.5,z-.40));}poly(c,pts,'rgba(185,207,198,'+fog*(.035+.035*Math.sin(j/30*Math.PI))+')');}
 // Feathered cloud volumes make occlusion legible without replacing the relief with a flat veil.
 c.save();
 const outline=[...grid[NZ].map(v=>project(v.x,height(v),v.z)),...grid.slice().reverse().map(row=>project(row[NX].x,height(row[NX]),row[NX].z)),...grid[0].slice().reverse().map(v=>project(v.x,height(v),v.z)),...grid.map(row=>project(row[0].x,height(row[0]),row[0].z))];
 c.beginPath();outline.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.clip();
 for(let i=0;i<32;i++){
  const x=-6.5+(i%8)*1.8+Math.sin(t*.13+i)*.25,z=-1.4+Math.floor(i/8)*.8,v=project(x,.8+fog*.45,z);
  c.save();c.translate(v.x,v.y);c.scale(1,.32);const r=s*(1.6+hash(i,2)),g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(206,221,211,'+fog*.28+')');g.addColorStop(.5,'rgba(190,208,201,'+fog*.13+')');g.addColorStop(1,'rgba(190,208,201,0)');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();
 }c.restore();
 const foot=project(-.45,elevation(-.45,-2.9)+.02,-2.9),ps=s/40*(index===2?mix(1,.65,p):1);
 if(index===4)for(let i=0;i<9;i++){const x=(i-4)*1.04,z=-2+Math.abs(i-4)*.12,v=project(x,elevation(x,z),z);person(c,v.x,v.y,s/63,(1-p)*.65);}
 person(c,foot.x,foot.y,ps);const head={x:foot.x,y:foot.y-46*ps};
 // Reserve a separate two-column annotation row, measured below the model and above controls.
 const leftX=w*.06,leftY=compact?area.top+stageHeight*.45:stageBottom+35,rightX=w*(compact?.73:.54),rightY=leftY;
 if(index===0){const target=project(.6,2.7,4.6);c.save();const beam=c.createLinearGradient(head.x,head.y,target.x,target.y);beam.addColorStop(0,'#dfc79b55');beam.addColorStop(1,'#dfc79b00');poly(c,[head,{x:target.x-75*s/50,y:target.y-25},{x:target.x+75*s/50,y:target.y-25}],beam);c.setLineDash([4,6]);line(c,[head,target],'#e8d1a48c',.8);c.restore();callout(c,head,leftX,leftY,'THE FIGURE','You borrow his point of view.');callout(c,target,rightX,rightY,'THE GAZE','The face stays unseen.');
 }else if(index===1){callout(c,project(-.5,1.5,-3),leftX,leftY,'THE KNOWN','Rock: a definite, solid edge.');callout(c,project(2,1.15,1),rightX,rightY,'THE UNKNOWN','Fog: a world left unresolved.',teal);
 }else if(index===2){c.save();c.beginPath();c.rect(cx-s*7.5,area.top,s*15,stageHeight);c.clip();for(let j=0;j<22;j++){const pts=[];for(let k=0;k<48;k++){const x=-8+k*.35,z=1.2+j*.18,y=2+Math.sin(x*.38+j*.07-t*.13)*(.6+p)+j*.055;pts.push(project(x,y,z));}c.setLineDash([30+j*2,90]);c.lineDashOffset=-t*(12+j*.4);line(c,pts,'rgba(213,195,157,'+(.06+p*.12)+')',.7);}c.restore();callout(c,head,leftX,leftY,'HUMAN SCALE','Small, vulnerable, still looking.');callout(c,project(2,3.2*vast,3),rightX,rightY,'THE SUBLIME','Wonder at what overwhelms us.');
 }else if(index===3){callout(c,project(2,2,3),rightX,rightY,'ONE LANDSCAPE','Light changes its emotional meaning.');callout(c,head,leftX,leftY,'INNER LIFE',p<.5?'Uncertainty and distance.':'Stillness and possibility.');
 }else{callout(c,head,leftX,leftY,'THE INDIVIDUAL','One experience becomes the subject.');callout(c,project(2,2.8,3),rightX,rightY,'NATURE AS FEELING','An outer world, an inner response.');}
 if(index===4&&p>.78&&art.complete&&art.naturalWidth){c.save();c.globalAlpha=ease((p-.78)/.22);c.fillStyle='#0b1418';c.fillRect(0,area.top,w,area.bottom-area.top);const ah=Math.min(area.bottom-area.top-40,w*.83*art.naturalHeight/art.naturalWidth),aw=ah*art.naturalWidth/art.naturalHeight,ax=(w-aw)/2,ay=area.top;c.drawImage(art,ax,ay,aw,ah);text(c,'CASPAR DAVID FRIEDRICH · 1818',w/2,ay+ah+27,13,gold,'center');c.restore();}
}
window.drawRomanticWorld=render;
})();
