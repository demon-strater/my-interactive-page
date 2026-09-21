/* A deterministic relief model for exploring Romantic composition. */
(() => {
'use strict';
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t);},gold='#dec193',teal='#96c8c7';
const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x,z){const a=Math.floor(x),b=Math.floor(z),u=ease(x-a),v=ease(z-b);return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v);}
function elevation(x,z){
 const ridge=Math.exp(-Math.pow((z-2.8-.45*Math.sin(x)) / 1.75,2)),peaks=.55+2.9*Math.exp(-Math.abs(x+3.8)*.68)+2.3*Math.exp(-Math.abs(x-3.2)*.72);
 const crags=(1-Math.abs(noise(x*1.55,z*1.8)*2-1))*.30+noise(x*4.5,z*4.5)*.045;
 const edge=ease((1.05-Math.hypot(x/7,(z-.8)/5.5))/.28);
 return (.12+ridge*(peaks+crags)+noise(x*2.2,z*2.2)*.07+noise(x*12,z*12)*.006+1.6*Math.exp(-Math.pow((x+.45)/1.15,2)-Math.pow(z+2.9,2)))*edge;
}
const NX=68,NZ=44,grid=[];
for(let j=0;j<=NZ;j++){const row=[];for(let i=0;i<=NX;i++){const x=-7+i*14/NX,z=-4+j*10/NZ;row.push({x,z,y:elevation(x,z)});}grid.push(row);}
const terrain=window.createRomanticTerrain?.(elevation);
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
 const fog=index===1?mix(0,1,p):index===2?.28:index===3?mix(.9,.18,p):.35,vast=index===2?mix(.55,2.35,p):1,yaw=index===0?mix(-1.05,.10,p):-.12;
 const compact=w>=700&&h<500;
 const area=settings.layout||{top:h*.18,bottom:h*.91},noteHeight=compact?4:w<500?82:62;
 const stageBottom=area.bottom-noteHeight,stageHeight=Math.max(30,stageBottom-area.top);
 // Fit the actual silhouette, not a rectangular slab. Reserve the maximum height
 // for the entire sublime chapter so its growth cannot be cancelled by auto-fitting.
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const angle of [yaw])for(const row of grid)for(const v of row){
  if(Math.hypot(v.x/7,(v.z-.8)/5.5)>1)continue;
  const x=(v.x*Math.cos(angle)-v.z*Math.sin(angle))*1.18,y=-v.y*mix(1,index===2?2.35:1,ease((v.z+.2)/1.2))-(v.x*Math.sin(angle)+v.z*Math.cos(angle))*.47;
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 const s=Math.max(1,Math.min(w*(compact?.53:.94)/(maxX-minX),stageHeight*.94/(maxY-minY)));
 const cx=w*.5-(minX+maxX)*s*.5,cy=area.top+stageHeight*.5-(minY+maxY)*s*.5;
 c.studySmall=w<500||compact;c.studyNoteWidth=w*(compact?.21:.40);
 const zoom=index===0?mix(.86,1,p):1;
 const project=(x,y,z)=>({x:cx+(x*Math.cos(yaw)-z*Math.sin(yaw))*s*zoom*1.18,y:cy-y*s*zoom+(x*Math.sin(yaw)+z*Math.cos(yaw))*s*-.47*zoom});
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#101a1f');bg.addColorStop(.55,'#111b20');bg.addColorStop(1,'#070d12');c.fillStyle=bg;c.fillRect(0,0,w,h);
 const glow=c.createRadialGradient(cx,cy-h*.16,0,cx,cy-h*.16,w*.38);glow.addColorStop(0,'rgba(110,136,132,.12)');glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(0,0,w,h);
 const height=v=>v.y*mix(1,vast,ease((v.z+.2)/1.2));
 const gpu=terrain?.(c,w,h,{cx,cy,scale:s*zoom,yaw,vast,warmth,fog});
 if(!gpu)for(let j=NZ-1;j>=0;j--)for(let i=0;i<NX;i++){
  const a=grid[j][i],b=grid[j][i+1],d=grid[j+1][i],e=grid[j+1][i+1];
  const fade=1-ease((Math.hypot(a.x/7,(a.z-.8)/5.5)-.83)/.17);if(fade<=0)continue;
  c.save();c.globalAlpha=fade;
  for(const tri of [[a,d,b],[b,d,e]]){const avg=tri.reduce((sum,v)=>sum+height(v),0)/3,dx=(height(b)-height(a))/(14/NX),dz=(height(d)-height(a))/(10/NZ),normal=Math.sqrt(dx*dx+dz*dz+1),lit=clamp((-.65*dx+.5-.4*dz)/normal,.05,.95);const r=mix(24,143,lit)+warmth*(18+avg*10),g=mix(42,151,lit)+warmth*avg*5,bv=mix(52,164,lit)-warmth*(15+avg*6);poly(c,tri.map(v=>project(v.x,height(v),v.z)),'rgb('+(r|0)+','+(g|0)+','+(bv|0)+')',true);}c.restore();
 }
 // Marching squares gives true topographic isolines.
 if(!gpu)for(let level=.4;level<4.8;level+=.32){c.beginPath();for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const q=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]],hits=[];for(let k=0;k<4;k++){const a=q[k],b=q[(k+1)%4],ya=height(a),yb=height(b);if((ya<level)!==(yb<level)){const f=(level-ya)/(yb-ya);hits.push(project(mix(a.x,b.x,f),level+.008,mix(a.z,b.z,f)));}}
  for(let k=0;k+1<hits.length;k+=2){c.moveTo(hits[k].x,hits[k].y);c.lineTo(hits[k+1].x,hits[k+1].y);}}
  c.strokeStyle='rgba(203,218,196,'+(level>2?.16:.08)+')';c.lineWidth=.6;c.stroke();}
 // A visible winding route disappears beneath the cloud volume: the unknown is
 // demonstrated by the loss of landmarks, not just by a change in tint.
 if(index===1){
  const route=[];for(let k=0;k<=60;k++){const z=-2.6+k*.12,x=Math.sin(z*1.2)*1.25;route.push(project(x,elevation(x,z)+.035,z));}
  line(c,route,'#ead3a5',Math.max(1.5,s*.045));
  for(let k=0;k<4;k++){const z=-1.5+k*1.3,x=Math.sin(z*1.2)*1.25,v=project(x,elevation(x,z)+.08,z);c.beginPath();c.arc(v.x,v.y,3,0,TAU);c.fillStyle=gold;c.fill();}
 }
 // Small trees give the mountains a readable scale without a rectangular pedestal.
 for(let i=0;i<70;i++){const x=-5.5+hash(i,22)*11,z=-1.8+hash(i,23)*3.2,y=elevation(x,z);if(y>.95||y<.16)continue;const v=project(x,y,z),size=s*(.045+hash(i,24)*.06);line(c,[v,{x:v.x,y:v.y-size*2.5}],'#162b2b',.7);for(let k=0;k<3;k++)poly(c,[{x:v.x,y:v.y-size*(3-k*.55)},{x:v.x-size*(.4+k*.18),y:v.y-size*(1.5-k*.55)},{x:v.x+size*(.4+k*.18),y:v.y-size*(1.5-k*.55)}],'#203836');}
 // Soft volumes can drift beyond the terrain: no clipping path and no hard fog edge.
 c.save();
 for(let i=0;i<48;i++){
  const x=-5.7+(i%12)*1.03+Math.sin(t*.13+i)*.2,z=-1.4+Math.floor(i/12)*.9,v=project(x,.7+fog*.65,z),edge=1-ease((Math.abs(x)-3.8)/2.4);
  c.save();c.translate(v.x,v.y);c.scale(1,.36);const r=s*(1.05+hash(i,2)*.8),g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(206,221,211,'+fog*.38*edge+')');g.addColorStop(.5,'rgba(190,208,201,'+fog*.16*edge+')');g.addColorStop(1,'rgba(190,208,201,0)');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();
 }c.restore();
 const foot=project(-.45,elevation(-.45,-2.9)+.02,-2.9),ps=s/40*(index===2?mix(1.5,.55,p):index===0?zoom:1);
 if(index===4)for(let i=0;i<15;i++){const x=(i%5-2)*1.55,z=-2+Math.floor(i/5)*.9,v=project(x,elevation(x,z),z),depart=ease(p/.65);person(c,v.x+(i%2?1:-1)*depart*s*6,v.y-depart*s*.6,s/45,1-depart);}
 // Weather is a spatial event: slanting rain gives way to long shafts of light.
 if(index===3){
  c.save();
  const storm=1-ease(p/.68);
  for(let i=0;i<16;i++){const x=cx+(i-7.5)*s*.6+p*s*3,y=area.top+s*(.6+hash(i,4)*.5);c.save();c.translate(x,y);c.scale(1,.32);const r=s*1.3,g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(73,94,113,'+(1-p)*.32+')');g.addColorStop(1,'rgba(73,94,113,0)');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore();}
  for(let i=0;i<110;i++){const f=(hash(i,6)+t*.55)%1,x=w*(.10+hash(i,5)*.8),y=area.top+f*(stageHeight-s*.65);line(c,[{x,y},{x:x-s*.20,y:y+s*.45}],'rgba(180,211,234,'+storm*.35*Math.sin(f*Math.PI)+')',.8);}
  const light=ease((p-.25)/.75);for(let i=0;i<7;i++){const x=cx+s*(i*.8-2);poly(c,[{x:cx+s*3,y:area.top},{x:x-s*.4,y:stageBottom},{x:x+s*.6,y:stageBottom}],'rgba(255,219,147,'+light*.055+')');}
  c.globalAlpha=light;const sun={x:cx+s*3,y:area.top+s*.45},halo=c.createRadialGradient(sun.x,sun.y,0,sun.x,sun.y,s*1.7);halo.addColorStop(0,'#ffe8b5bb');halo.addColorStop(1,'#ffe8b500');c.fillStyle=halo;c.fillRect(sun.x-s*1.7,sun.y-s*1.7,s*3.4,s*3.4);c.beginPath();c.arc(sun.x,sun.y,s*.15,0,TAU);c.fillStyle='#fff0cf';c.fill();
  c.restore();
 }
 if(index===4){
  c.save();c.globalAlpha=ease(p/.6);const radius=s*(2.8-1.7*p);c.beginPath();c.ellipse(foot.x,foot.y+3,radius,radius*.3,0,0,TAU);c.strokeStyle='#e6c59099';c.lineWidth=1.3;c.stroke();c.restore();
 }
 person(c,foot.x,foot.y,ps);const head={x:foot.x,y:foot.y-46*ps};
 // Reserve a separate two-column annotation row, measured below the model and above controls.
 const leftX=w*(compact?.035:.06),leftY=compact?area.top+stageHeight*.66:stageBottom+16,rightX=w*(compact?.755:.54),rightY=leftY;
 if(index===0){const target=project(.6,2.7,4.6);c.save();const beam=c.createLinearGradient(head.x,head.y,target.x,target.y);beam.addColorStop(0,'#dfc79b55');beam.addColorStop(1,'#dfc79b00');poly(c,[head,{x:target.x-75*s/50,y:target.y-25},{x:target.x+75*s/50,y:target.y-25}],beam);c.setLineDash([4,6]);line(c,[head,target],'#e8d1a48c',.8);c.restore();callout(c,head,leftX,leftY,'인물','그의 시선을 빌려 본다.');callout(c,target,rightX,rightY,'시선','얼굴은 보이지 않는다.');
 }else if(index===1){callout(c,project(-.5,1.5,-3),leftX,leftY,'알려진 길','길을 따라 계곡 속으로.');callout(c,project(2,1.15,1),rightX,rightY,'미지의 영역','길이 사라지고, 그 너머를 상상한다.',teal);
 }else if(index===2){c.save();for(let j=0;j<22;j++){const pts=[];for(let k=0;k<48;k++){const x=-6.3+k*.268,z=1.2+j*.18,y=2+Math.sin(x*.38+j*.07-t*.13)*(.6+p)+j*.055;pts.push(project(x,y,z));}c.setLineDash([30+j*2,90]);c.lineDashOffset=-t*(12+j*.4);line(c,pts,'rgba(213,195,157,'+(.06+p*.12)+')',.7);}c.restore();callout(c,head,leftX,leftY,'인간의 크기','작고 연약하지만, 여전히 바라본다.');callout(c,project(2,3.2*vast,3),rightX,rightY,'숭고','압도하는 것 앞의 경이로움.');
 }else if(index===3){callout(c,project(2,2,3),rightX,rightY,'같은 풍경','빛이 감정의 의미를 바꾼다.');callout(c,head,leftX,leftY,'내면',p<.5?'불확실함과 거리감.':'고요함과 가능성.');
 }else{callout(c,head,leftX,leftY,'개인','한 사람의 경험이 그림의 주제가 된다.');callout(c,project(2,2.8,3),rightX,rightY,'감정이 된 자연','바깥의 세계, 안의 반응.');}
 if(index===4&&p>.78&&art.complete&&art.naturalWidth){c.save();c.globalAlpha=ease((p-.78)/.22);c.fillStyle='#0b1418';c.fillRect(0,area.top,w,area.bottom-area.top);const ah=Math.min(area.bottom-area.top-40,w*.83*art.naturalHeight/art.naturalWidth),aw=ah*art.naturalWidth/art.naturalHeight,ax=(w-aw)/2,ay=area.top;c.drawImage(art,ax,ay,aw,ah);text(c,'카스파르 다비드 프리드리히 · 1818',w/2,ay+ah+27,13,gold,'center');c.restore();}
}
window.drawRomanticWorld=render;
})();
