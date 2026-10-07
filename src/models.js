import * as THREE from '../vendor/three.module.js';
import { VEHICLES } from './core.js';
import { BLUEPRINTS } from './vehicle-blueprints.js';

export function studioEnvironment(renderer){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const c=canvas.getContext('2d'),gradient=c.createLinearGradient(0,0,0,512);
 gradient.addColorStop(0,'#a7bcca');gradient.addColorStop(.47,'#738d9f');gradient.addColorStop(.51,'#263c4b');gradient.addColorStop(1,'#152531');c.fillStyle=gradient;c.fillRect(0,0,1024,512);
 c.fillStyle='#f4faff';c.fillRect(85,70,190,115);c.fillRect(570,105,80,135);c.fillStyle='#b2d5e5';c.fillRect(800,180,125,90);
 const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(texture);texture.dispose();pmrem.dispose();return target.texture;
}
const physical=(color,opts={})=>new THREE.MeshPhysicalMaterial({color,roughness:.29,metalness:.36,clearcoat:.8,clearcoatRoughness:.19,...opts});
const rubber=physical(0x11151a,{roughness:.92,metalness:0,clearcoat:0}),trim=physical(0x182028,{roughness:.54,metalness:.13,clearcoat:0,side:THREE.DoubleSide}),alloy=physical(0xb8c1c9,{roughness:.24,metalness:.86,clearcoat:.1}),glass=physical(0x142630,{roughness:.18,metalness:.12,clearcoat:.65,envMapIntensity:.58,side:THREE.DoubleSide}),seam=physical(0x26333b,{roughness:.7,metalness:0,clearcoat:0,side:THREE.DoubleSide});
const headlamp=physical(0xd9f4f3,{emissive:0x99dedb,emissiveIntensity:.40,metalness:.15,side:THREE.DoubleSide}),taillamp=physical(0xc51e32,{emissive:0xe81b32,emissiveIntensity:.52,metalness:.2,side:THREE.DoubleSide}),plate=physical(0xcad0d0,{metalness:.2,roughness:.7});
function mesh(g,geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,w,h,d,x,y,z,m){return mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function geometry(points,indices){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.setIndex(indices);geo.computeVertexNormals();return geo;}
function patch(g,rows,m,reverse=false){const points=rows.flat(),n=rows[0].length,indices=[];for(let r=0;r<rows.length-1;r++)for(let c=0;c<n-1;c++){const a=r*n+c,b=a+1,d=a+n,e=d+1;indices.push(...(reverse?[a,b,d,b,e,d]:[a,d,b,b,d,e]));}return mesh(g,geometry(points,indices),m);}
function polygon(g,points,m,reverse=false){const i=[];for(let j=1;j<points.length-1;j++)i.push(...(reverse?[0,j+1,j]:[0,j,j+1]));return mesh(g,geometry(points,i),m);}
function sample(profile,z){let a=profile[0],b=profile.at(-1);for(let j=1;j<profile.length;j++)if(z<=profile[j][0]){a=profile[j-1];b=profile[j];break;}const t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0])));return a.map((v,i)=>i===0?z:v+(b[i]-v)*t);}
function roundedBox(g,w,h,d,r,x,y,z,m){r=Math.min(r,w/2,h/2);const s=new THREE.Shape(),a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:4});geo.translate(0,0,-d/2);return mesh(g,geo,m,x,y,z);}
function ribbon(g,pts,width,m,plane='front'){
 const rows=[];for(let i=0;i<pts.length;i++){const p=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],u=plane==='front'?b[0]-a[0]:b[2]-a[2],v=b[1]-a[1],d=Math.hypot(u,v)||1;
  const q=plane==='front'?[-v/d*width/2,u/d*width/2,0]:[0,u/d*width/2,-v/d*width/2];rows.push([p.map((x,k)=>x-q[k]),p.map((x,k)=>x+q[k])]);}
 return patch(g,rows,m);
}
// Merge static parts by material while keeping four rolling wheels and steering pivots.
function batch(group){group.updateMatrixWorld(true);const materials=new Map();for(const o of [...group.children]){if(!o.isMesh)continue;const geo=o.geometry.clone();geo.applyMatrix4(o.matrix);if(!geo.getAttribute('normal'))geo.computeVertexNormals();const entry=materials.get(o.material)||{positions:[],normals:[],indices:[],count:0};const p=geo.getAttribute('position'),n=geo.getAttribute('normal');entry.positions.push(...p.array);entry.normals.push(...n.array);const index=geo.index;if(index)for(const v of index.array)entry.indices.push(v+entry.count);else for(let i=0;i<p.count;i++)entry.indices.push(i+entry.count);entry.count+=p.count;materials.set(o.material,entry);geo.dispose();o.geometry.dispose();group.remove(o);}
 for(const [material,e] of materials){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(e.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(e.normals,3));geo.setIndex(e.indices);geo.computeBoundingSphere();mesh(group,geo,material);}
}
function bodyShell(g,v,s,paint,axles){
 const n=100,W=v.width,rows=[];
 for(let j=0;j<=n;j++){const z=-v.length/2+v.length*j/n,p=sample(s.body,z),width=p[1]*W/2,edge=p[2];let lower=s.bottom;
  for(const axle of axles){const dz=z-axle,rad=s.radius+.075;if(Math.abs(dz)<rad)lower=Math.max(lower,s.radius+Math.sqrt(rad*rad-dz*dz));}
  // Cut openings into the actual side skin rather than drawing arches over solid panels.
  for(const side of [-1,1]){const col=[];for(let k=0;k<5;k++){const t=k/4,y=lower+(edge-lower)*t,x=width-(1-t)*.028-.018*Math.sin(Math.PI*t);col.push([side*x,y,z]);}if(!rows[j])rows[j]=[];rows[j].push(col);}
 }
 for(let i=0;i<2;i++)patch(g,rows.map(r=>r[i]),paint,i===1);
 const intervals=[[-v.length/2,s.cabin[0][0]+.015],[s.cabin.at(-1)[0]-.015,v.length/2]];
 for(const [start,end] of intervals){const top=[];for(let j=0;j<=14;j++){const z=start+(end-start)*j/14,p=sample(s.body,z),r=[];for(let k=0;k<=12;k++){const t=-1+2*k/12;r.push([t*p[1]*W/2,p[2]+(s.angular?0:.035)*(1-t*t),z]);}top.push(r);}patch(g,top,paint);}
 const end=v.length/2;for(const sign of [-1,1]){const z=sign*end,p=sample(s.body,z),width=p[1]*W/2;polygon(g,[[-width,s.bottom,z],[width,s.bottom,z],[width,p[2],z],[-width,p[2],z]],paint,sign<0);}
 box(g,W*.73,.07,v.length*.88,0,s.bottom-.018,0,trim);
 if(s.cladding)for(const side of [-1,1]){for(const axle of axles){const rr=s.radius+.079,pts=[],count=s.angular?7:25;for(let i=0;i<=count;i++){const a=Math.PI*i/count,zz=axle+Math.cos(a)*rr,yy=s.radius+Math.sin(a)*rr;pts.push([side*(sample(s.body,zz)[1]*W/2+.009),yy,zz]);}ribbon(g,pts,.065,trim,'side');}
  box(g,.025,.09,axles[1]-axles[0]-s.radius*2-.08,side*(W/2-.006),s.bottom+.04,(axles[0]+axles[1])/2,trim);}
}
function cabinShell(g,v,s,paint){
 const W=v.width,profile=s.cabin,z0=profile[0][0],z1=profile.at(-1)[0],angular=s.angular;
 function skin(z,y,side,offset=0){const c=sample(profile,z),belt=sample(s.body,z)[2],t=Math.max(0,Math.min(1,(y-belt)/Math.max(.04,c[1]-belt)));return [side*(c[2]+(sample(s.body,z)[1]*W/2-c[2])*(1-t)+offset),y,z];}
 for(const side of [-1,1]){const rows=[];for(let j=0;j<=60;j++){const z=z0+(z1-z0)*j/60,c=sample(profile,z),belt=sample(s.body,z)[2],r=[];for(let k=0;k<=5;k++){const y=belt+(c[1]-belt)*k/5;r.push(skin(z,y,side));}rows.push(r);}patch(g,rows,paint,side>0);
  for(const [start,end] of s.windows){const rows=[];for(let j=0;j<=25;j++){const z=start+(end-start)*j/25,c=sample(profile,z),belt=sample(s.body,z)[2],bottom=belt+.065,top=Math.max(bottom+.003,c[1]-.065),r=[];for(let k=0;k<=5;k++){const y=bottom+(top-bottom)*k/5;r.push(skin(z,y,side,.010));}rows.push(r);}patch(g,rows,glass,side>0);}
  const beltpts=[];for(let j=0;j<=28;j++){const z=z0+.09+(z1-z0-.18)*j/28,y=sample(s.body,z)[2]+.041;beltpts.push(skin(z,y,side,.013));}ribbon(g,beltpts,.017,trim,'side');
  for(const z of [-.22,1.13]){const body=sample(s.body,z),x=side*(body[1]*W/2+.004);ribbon(g,[[x,s.bottom+.055,z],[x,body[2]-.02,z]],.005,seam,'side');}
  for(const z of [-.86,.70]){const b=sample(s.body,z);box(g,.018,.025,.20,side*(b[1]*W/2+.010),b[2]-.12,z,s.angular?trim:alloy);}
  const mz=profile.at(-1)[0]-.23,my=sample(s.body,mz)[2]+.038;
  const mirror=roundedBox(g,.20,.10,.24,.035,side*(W/2+.08),my,mz,paint);mirror.rotation.y=side*.16;
  box(g,.12,.025,.08,side*(W/2+.015),my-.056,mz,trim);box(g,.17,.075,.014,side*(W/2+.08),my,mz-.125,glass);
 }
 // The crown curves across the car, including both windshields; no flat glass box.
 const roof=[];for(let j=0;j<=64;j++){const z=z0+(z1-z0)*j/64,c=sample(profile,z),r=[];for(let k=0;k<=16;k++){const t=-1+2*k/16;r.push([t*c[2],c[1]+(angular?0:.025)*(1-t*t),z]);}roof.push(r);}patch(g,roof,paint);
 const frontTop=profile.at(-2)[0],rearTop=profile[1][0];
 function topGlass(start,end,factor=.92){const rows=[];for(let j=0;j<=14;j++){const z=start+(end-start)*j/14,c=sample(profile,z),r=[];for(let k=0;k<=16;k++){const t=(-1+2*k/16)*factor;r.push([t*c[2],c[1]+(angular?0:.025)*(1-t*t)+.012,z]);}rows.push(r);}patch(g,rows,glass);}
 topGlass(frontTop+.075,z1-.075,.91);topGlass(z0+.075,rearTop-.075,.91);
 if(s.glassRoof)topGlass(rearTop+.09,frontTop-.08,.82);
 if(s.angular){const p0=s.body[0],cab=profile[0];patch(g,[[[-v.width*.43,p0[2]+.012,p0[0]],[v.width*.43,p0[2]+.012,p0[0]]],[[-v.width*.40,cab[1]+.016,cab[0]],[v.width*.40,cab[1]+.016,cab[0]]]],trim);for(let i=0;i<14;i++){const z=p0[0]+.08+(cab[0]-p0[0]-.16)*i/13,y=p0[2]+(cab[1]-p0[2])*(z-p0[0])/(cab[0]-p0[0]);box(g,v.width*.84,.008,.014,0,y+.02,z,seam);}}
 else if(v.id==='ev6'||v.id==='ev3'||v.id==='ioniq5'){const z=profile[1][0],c=sample(profile,z);box(g,c[2]*2+.11,.032,.22,0,c[1]+.012,z-.10,trim);}
}
function lamps(g,v,s){
 const W=v.width,end=v.length/2,front=end+.018,rear=-end-.019,fy=sample(s.body,end)[2],ry=sample(s.body,-end)[2];
 roundedBox(g,W*.60,.085,.035,.025,0,s.bottom+.18,front,trim);roundedBox(g,W*.69,.13,.035,.025,0,s.bottom+.17,rear,trim);
 roundedBox(g,.43,.092,.023,.009,0,s.bottom+.34,front+.019,plate);roundedBox(g,.43,.092,.023,.009,0,s.bottom+.32,rear-.019,plate);
 if(v.id==='cybertruck'){box(g,W*.90,.033,.020,0,fy-.055,front,headlamp);box(g,W*.90,.033,.02,0,ry-.025,rear,taillamp);box(g,W*.95,.19,.07,0,s.bottom+.065,front,trim);box(g,W*.95,.17,.07,0,s.bottom+.065,rear,trim);return;}
 if(v.id==='model-y'){ribbon(g,[[-W*.44,fy+.065,front],[-W*.32,fy+.040,front+.014],[0,fy+.031,front+.032],[W*.32,fy+.040,front+.014],[W*.44,fy+.065,front]],.031,headlamp);ribbon(g,[[-W*.43,ry+.014,rear],[-W*.39,ry+.076,rear-.008],[0,ry+.080,rear-.019],[W*.39,ry+.076,rear-.008],[W*.43,ry+.014,rear]],.045,taillamp);
  for(const side of [-1,1])roundedBox(g,.23,.105,.028,.020,side*W*.35,fy-.19,front,trim);return;}
 if(v.id==='ev3'){for(const side of [-1,1]){ribbon(g,[[side*W*.28,fy+.090,front],[side*W*.43,fy+.12,front-.012],[side*W*.44,fy-.20,front]],.034,headlamp);ribbon(g,[[side*W*.35,ry+.21,rear+.025],[side*W*.44,ry+.105,rear],[side*W*.425,ry-.205,rear]],.041,taillamp);roundedBox(g,.09,.30,.032,.018,side*W*.42,fy-.057,front-.010,trim);}return;}
 if(v.id==='ev6'){for(const side of [-1,1]){polygon(g,[[side*W*.23,fy+.01,front],[side*W*.44,fy+.135,front-.040],[side*W*.425,fy-.135,front-.019]],trim);ribbon(g,[[side*W*.24,fy+.023,front+.010],[side*W*.43,fy+.143,front-.025],[side*W*.41,fy-.125,front],[side*W*.31,fy-.065,front+.006]],.027,headlamp);}
  ribbon(g,[[-W*.43,ry-.09,rear],[-W*.40,ry+.02,rear-.010],[-W*.32,ry+.155,rear-.02],[0,ry+.19,rear-.029],[W*.32,ry+.155,rear-.02],[W*.40,ry+.02,rear-.010],[W*.43,ry-.09,rear]],.039,taillamp);return;}
 if(v.id==='ioniq5'){for(const side of [-1,1]){box(g,.50,.14,.025,side*W*.32,fy+.027,front,trim);box(g,.50,.14,.025,side*W*.32,ry+.026,rear,trim);for(let i=0;i<4;i++)for(let j=0;j<2;j++){box(g,.086,.048,.035,side*(.39+i*.111),fy-.004+j*.062,front+.01,headlamp);box(g,.086,.048,.035,side*(.39+i*.111),ry-.004+j*.062,rear-.01,taillamp);}}return;}
 // Model S has swept lamp pockets and a low bonnet.
 for(const side of [-1,1]){polygon(g,[[side*W*.24,fy+.025,front],[side*W*.46,fy+.10,front-.04],[side*W*.43,fy-.05,front-.012],[side*W*.30,fy-.07,front+.006]],trim);ribbon(g,[[side*W*.27,fy+.014,front+.019],[side*W*.43,fy+.081,front-.012],[side*W*.405,fy-.025,front+.009],[side*W*.31,fy-.040,front+.016]],.026,headlamp);roundedBox(g,W*.24,.095,.028,.03,side*W*.335,ry+.025,rear,taillamp);}
}
function wheelModel(side,s){const wheel=new THREE.Group(),r=s.radius,width=s.angular?.31:.245;
 const tire=mesh(wheel,new THREE.CylinderGeometry(r,r,width,32),rubber);tire.rotation.z=Math.PI/2;
 const outside=side*(width/2+.003),rim=r*.755;const face=mesh(wheel,new THREE.CylinderGeometry(rim,rim,.026,32),trim,outside,0,0);face.rotation.z=Math.PI/2;
 const ring=mesh(wheel,new THREE.TorusGeometry(rim,.014,5,32),alloy,outside+side*.013,0,0);ring.rotation.y=Math.PI/2;
 for(let i=0;i<s.spokes;i++){const a=2*Math.PI*i/s.spokes,spoke=box(wheel,.026,rim*.84,s.angular?.08:.043,outside+side*.018,Math.cos(a)*rim*.49,Math.sin(a)*rim*.49,alloy);spoke.rotation.x=a+(s.spokes===5?.12:0);}
 const center=mesh(wheel,new THREE.CylinderGeometry(rim*.20,rim*.20,.045,14),trim,outside+side*.035,0,0);center.rotation.z=Math.PI/2;
 for(const x of [-width*.31,width*.31]){const t=mesh(wheel,new THREE.TorusGeometry(r*.982,.008,4,32),trim,x,0,0);t.rotation.y=Math.PI/2;}
 if(s.angular)for(let i=0;i<24;i++){const a=2*Math.PI*i/24,t=box(wheel,width*.88,.022,.041,0,Math.cos(a)*r,Math.sin(a)*r,rubber);t.rotation.x=a;}
 batch(wheel);return wheel;
}
// Pure geometry creation: no canvas or DOM access, suitable for offline GLB export.
export function carModel(id){
 const v=VEHICLES.find(v=>v.id===id)||VEHICLES[0],s=BLUEPRINTS[v.id],g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const paint=physical(v.color,{metalness:s.angular?.78:.38,roughness:s.angular?.37:.28,clearcoat:s.angular?.15:.9,side:THREE.DoubleSide});
 const frontAxle=v.length/2-s.frontOverhang,rearAxle=frontAxle-s.wheelbase,axles=[rearAxle,frontAxle];
 bodyShell(body,v,s,paint,axles);cabinShell(body,v,s,paint);lamps(body,v,s);batch(body);
 const wheels=[],pivots=[];for(const axle of axles)for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*(v.width/2-.115),s.radius,axle);g.add(pivot);const wheel=wheelModel(side,s);pivot.add(wheel);wheels.push(wheel);if(axle===frontAxle)pivots.push(pivot);}
 const flame=new THREE.Group(),flameMaterial=new THREE.MeshBasicMaterial({color:0x65ffe2});for(const side of [-1,1]){const m=mesh(flame,new THREE.ConeGeometry(.17,1.6,8),flameMaterial,side*.50,.42,-v.length/2-.76);m.rotation.x=-Math.PI/2;}batch(flame);flame.visible=false;g.add(flame);
 const bubble=mesh(g,new THREE.SphereGeometry(v.length*.66,20,14),new THREE.MeshBasicMaterial({color:0x72dfff,wireframe:true,transparent:true,opacity:.22}),0,.85,0);bubble.visible=false;
 g.name=v.id;g.userData={wheels,pivots,flame,bubble,vehicle:v.id,blueprint:s.source,wheelRadius:s.radius,dimensions:{length:v.length,width:v.width,height:v.height,wheelbase:s.wheelbase}};return g;
}
export class CarPreview{
 constructor(canvas){this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.98;this.scene=new THREE.Scene();this.scene.environment=studioEnvironment(this.renderer);this.scene.add(new THREE.HemisphereLight(0xe5f5ff,0x405466,1.7));const key=new THREE.DirectionalLight(0xfff2df,2.6);key.position.set(4,7,5);this.scene.add(key);const fill=new THREE.DirectionalLight(0x9fd2f0,1.6);fill.position.set(-5,3,-4);this.scene.add(fill);this.camera=new THREE.PerspectiveCamera(24,1,.1,100);this.camera.position.set(5.2,2.25,5.9);this.camera.lookAt(0,.83,0);this.setVehicle('ev6');}
 setVehicle(id){if(this.model){this.scene.remove(this.model);this.model.traverse(o=>o.geometry?.dispose());}this.model=carModel(id);this.scene.add(this.model);this.fitCamera();}
 fitCamera(){
  const rect=this.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  const {length,width,height}=this.model.userData.dimensions,aspect=rect.width/rect.height;
  const direction=new THREE.Vector3(5.2,1.42,5.9).normalize(),elevation=Math.asin(direction.y);
  // The horizontal cylinder encloses the complete turning car, mirrors and lamps.
  // Fit its tangent against all four frustum planes so every rotation stays inside.
  const radius=Math.hypot((length+.14)/2,(width+.42)/2),halfHeight=(height+.04)/2;
  const vertical=THREE.MathUtils.degToRad(this.camera.fov/2),horizontal=Math.atan(Math.tan(vertical)*aspect);
  const horizontalDistance=radius*Math.sqrt(1-(Math.sin(horizontal)*direction.y)**2)/Math.sin(horizontal)+halfHeight*direction.y;
  const verticalDistance=Math.max(...[-1,1].map(sign=>{const angle=vertical+sign*elevation;return (radius*Math.abs(Math.sin(angle))+halfHeight*Math.abs(Math.cos(angle)))/Math.sin(vertical);}));
  const distance=Math.max(7.99,horizontalDistance*1.08,verticalDistance*1.08),target=new THREE.Vector3(0,height/2,0);
  this.camera.aspect=aspect;this.camera.position.copy(target).addScaledVector(direction,distance);this.camera.lookAt(target);this.camera.updateProjectionMatrix();
 }
 render(time){const rect=this.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;const w=Math.round(rect.width),h=Math.round(rect.height);if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.fitCamera();}this.model.rotation.y=time*.12;this.renderer.render(this.scene,this.camera);}
}
