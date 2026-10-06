import * as THREE from '../vendor/three.module.js';
import { VEHICLES } from './core.js';

export function studioEnvironment(renderer){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const c=canvas.getContext('2d'),gradient=c.createLinearGradient(0,0,0,512);
 gradient.addColorStop(0,'#a7bcca');gradient.addColorStop(.47,'#738d9f');gradient.addColorStop(.51,'#263c4b');gradient.addColorStop(1,'#152531');c.fillStyle=gradient;c.fillRect(0,0,1024,512);
 c.fillStyle='#f4faff';c.fillRect(85,70,190,115);c.fillRect(570,105,80,135);c.fillStyle='#b2d5e5';c.fillRect(800,180,125,90);
 const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(texture);texture.dispose();pmrem.dispose();return target.texture;
}
const mat=(color,opts={})=>new THREE.MeshPhysicalMaterial({color,roughness:.27,metalness:.48,clearcoat:1,clearcoatRoughness:.14,...opts});
const rubber=mat(0x101317,{roughness:.88,metalness:.02,clearcoat:0}),alloy=mat(0xbfc7ce,{metalness:.92,roughness:.2}),dark=mat(0x17212a,{roughness:.52,metalness:.15,clearcoat:0}),glass=mat(0x101f2a,{metalness:.10,roughness:.15,clearcoat:.45,envMapIntensity:.55}),chrome=mat(0xd0d9dc,{metalness:1,roughness:.15});
function mesh(group,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function box(g,w,h,d,x,y,z,material){return mesh(g,new THREE.BoxGeometry(w,h,d),material,x,y,z);}
function surface(g,vertices,material){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));const idx=[];for(let i=1;i<vertices.length-1;i++)idx.push(0,i,i+1);geometry.setIndex(idx);geometry.computeVertexNormals();return mesh(g,geometry,material);}
function line(g,points,color=0x26303a,width=.012){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(g,new THREE.TubeGeometry(curve,Math.max(3,points.length*3),width,4,false),mat(color,{roughness:.6,metalness:.12,clearcoat:0}));}
// Longitudinal rings form curved bodywork instead of an extruded flat silhouette.
function loft(g,sections,material,angular=false){const verts=[],idx=[],ring=angular?8:16;
 for(const s of sections){const [z,width,bottom,top]=s;for(let i=0;i<ring;i++){const theta=2*Math.PI*i/ring,sn=Math.sin(theta),cs=Math.cos(theta),power=angular?.20:.30;const x=Math.sign(sn)*Math.pow(Math.abs(sn),power)*width/2,y=(bottom+top)/2+Math.sign(cs)*Math.pow(Math.abs(cs),power)*(top-bottom)/2;verts.push(x,y,z);}}
 for(let s=0;s<sections.length-1;s++)for(let i=0;i<ring;i++){const a=s*ring+i,b=s*ring+(i+1)%ring,c=a+ring,d=b+ring;idx.push(a,c,b,b,c,d);}
 for(let i=1;i<ring-1;i++){idx.push(0,i,i+1);const base=(sections.length-1)*ring;idx.push(base,base+i+1,base+i);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();return mesh(g,geo,material);
}
function roundedBox(g,w,h,d,r,x,y,z,material){r=Math.min(r,w/2,h/2);const shape=new THREE.Shape(),a=-w/2,b=-h/2;shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);shape.lineTo(a+w,b+h-r);shape.quadraticCurveTo(a+w,b+h,a+w-r,b+h);shape.lineTo(a+r,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-r);shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);const geo=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:4});geo.translate(0,0,-d/2);return mesh(g,geo,material,x,y,z);}
const specs={
 ev6:{belt:.97,roof:1.50,rear:-1.78,rearRoof:-.70,frontRoof:.57,front:1.44,roofWidth:1.52,baseWidth:1.73,wheelbase:2.90,bonnet:.88,bumper:.70},
 cybertruck:{belt:1.16,roof:1.88,rear:-1.45,rearRoof:-.30,frontRoof:-.30,front:1.37,roofWidth:1.87,baseWidth:1.96,wheelbase:3.58,bonnet:1.11,bumper:.91},
 'model-s':{belt:.89,roof:1.38,rear:-1.79,rearRoof:-.68,frontRoof:.50,front:1.47,roofWidth:1.47,baseWidth:1.73,wheelbase:2.96,bonnet:.82,bumper:.63},
 'model-y':{belt:1.00,roof:1.72,rear:-1.88,rearRoof:-.77,frontRoof:.45,front:1.47,roofWidth:1.48,baseWidth:1.73,wheelbase:2.90,bonnet:.91,bumper:.73},
 ioniq5:{belt:1.07,roof:1.61,rear:-1.94,rearRoof:-1.13,frontRoof:.67,front:1.48,roofWidth:1.56,baseWidth:1.72,wheelbase:3.00,bonnet:1.00,bumper:.93},
 ev3:{belt:1.15,roof:1.78,rear:-1.87,rearRoof:-1.54,frontRoof:.56,front:1.30,roofWidth:1.54,baseWidth:1.70,wheelbase:2.68,bonnet:1.10,bumper:.99}
};
export function carModel(id){const v=VEHICLES.find(v=>v.id===id)||VEHICLES[0],s=specs[v.id],g=new THREE.Group(),L=v.length,W=v.width,end=L/2;
 const paint=mat(v.color,{metalness:id==='cybertruck'?.9:.5,roughness:id==='cybertruck'?.31:.24,clearcoat:id==='cybertruck'?.1:1});
 const sections=[[-end,W*.83,.47,s.bumper],[-end+.16,W*.96,.40,s.belt*.98],[-end+.48,W,.40,s.belt],[-1.2,W,.42,s.belt+.025],[0,W,.43,s.belt+.03],[1.1,W,.41,s.belt],[end-.45,W*.97,.40,s.bonnet],[end-.13,W*.91,.46,s.bumper+.09],[end,W*.78,.50,s.bumper]];
 loft(g,sections,paint,id==='cybertruck');box(g,W*.84,.09,L*.83,0,.38,0,dark);
 const canopy=[[s.rear,s.baseWidth,s.belt-.02,s.belt+.08],[s.rearRoof,s.roofWidth,s.belt,s.roof-.025],[(s.rearRoof+s.frontRoof)/2,s.roofWidth+.045,s.belt,s.roof],[s.frontRoof,s.roofWidth,s.belt,s.roof-.025],[s.front,s.baseWidth*.95,s.belt-.02,s.belt+.03]];
 if(id==='cybertruck')canopy.splice(2,2);loft(g,canopy,paint,id==='cybertruck');
 const windowMat=glass.clone();windowMat.side=THREE.DoubleSide;const base=s.baseWidth/2,roof=s.roofWidth/2;
 surface(g,[[-base*.90,s.belt+.095,s.front+.028],[base*.90,s.belt+.095,s.front+.028],[roof*.92,s.roof+.012,s.frontRoof+.095],[-roof*.92,s.roof+.012,s.frontRoof+.095]],windowMat);
 surface(g,[[-base*.93,s.belt+.095,s.rear-.026],[-roof*.91,s.roof+.006,s.rearRoof-.09],[roof*.91,s.roof+.006,s.rearRoof-.09],[base*.93,s.belt+.095,s.rear-.026]],windowMat);
 for(const side of [-1,1]){
  surface(g,[[side*(base+.012),s.belt+.085,s.rear+.17],[side*(roof+.023),s.roof-.09,s.rearRoof+.09],[side*(roof+.023),s.roof-.09,s.frontRoof-.08],[side*(base*.95+.012),s.belt+.075,s.front-.18]],windowMat);
  const pillarZ=id==='cybertruck'?-.30:-.23,pillarWidth=id==='ev3'?.13:.095;
  surface(g,[[side*(base+.026),s.belt+.076,pillarZ-pillarWidth/2],[side*(roof+.035),s.roof-.075,pillarZ-pillarWidth/2],[side*(roof+.035),s.roof-.075,pillarZ+pillarWidth/2],[side*(base+.026),s.belt+.076,pillarZ+pillarWidth/2]],dark);
  line(g,[[side*base,s.belt+.055,s.rear+.13],[side*(W/2+.008),s.belt+.01,-.5],[side*(W/2+.008),s.belt-.015,1.25]],id==='cybertruck'?0x41494e:0xa0b0b5,.014);
  line(g,[[side*(W/2+.01),.49,pillarZ],[side*(W/2+.022),s.belt-.08,pillarZ]],0x30434b,.009);
  for(const z of [-.92,.74])box(g,.035,.046,.27,side*(W/2+.019),s.belt-.15,z,id==='cybertruck'?dark:chrome);
  const mirror=new THREE.Group();mirror.position.set(side*(W/2+.10),s.belt+.03,s.front-.36);mirror.rotation.y=side*.12;g.add(mirror);box(mirror,.17,.035,.15,-side*.05,-.08,0,dark);roundedBox(mirror,.28,.12,.22,.045,0,0,0,paint);box(mirror,.23,.065,.018,0,.003,-.12,glass);
  box(g,.035,.08,L*.68,side*(W/2+.017),.45,0,dark);
 }
 if(id!=='cybertruck'){const zmid=(s.rearRoof+s.frontRoof)/2,len=s.frontRoof-s.rearRoof;const roofPanel=roundedBox(g,s.roofWidth*.77,len*.77,.018,.15,0,s.roof+.009,zmid,glass);roofPanel.rotation.x=-Math.PI/2;}
 const head=mat(0xe0fff9,{emissive:0x87e7e1,emissiveIntensity:.6,metalness:.2}),red=mat(0xff2449,{emissive:0xed082a,emissiveIntensity:.7,metalness:.2}),frontZ=end+.012,rearZ=-end-.013;
 roundedBox(g,W*.87,.16,.024,.04,0,s.bumper+.015,frontZ,(id==="ioniq5"||id==="ev3")?dark:paint);roundedBox(g,W*.80,.15,.028,.04,0,s.bumper+.035,rearZ,dark);
 if(id==='ioniq5'){for(const side of [-1,1])for(let i=0;i<4;i++)for(let j=0;j<2;j++){box(g,.10,.072,.029,side*(.47+i*.122),s.bumper+.014+j*.092,frontZ+.019,head);box(g,.10,.072,.029,side*(.47+i*.122),s.bumper+.014+j*.092,rearZ-.019,red);}}
 else if(id==='ev3'){for(const side of [-1,1]){roundedBox(g,.069,.46,.035,.026,side*W*.408,s.bumper+.02,frontZ,head);roundedBox(g,.38,.064,.035,.022,side*W*.323,s.bumper+.23,frontZ,head);roundedBox(g,.070,.44,.035,.024,side*W*.409,s.bumper+.07,rearZ,red);roundedBox(g,.25,.064,.035,.022,side*W*.35,s.bumper+.28,rearZ,red);}}
 else if(id==='cybertruck'){box(g,W*.91,.037,.022,0,s.bumper+.15,frontZ,head);box(g,W*.87,.036,.022,0,s.belt-.065,rearZ,red);}
 else{for(const side of [-1,1]){const lamp=roundedBox(g,W*.27,.090,.043,.038,side*W*.319,s.bumper+.112,frontZ,head);lamp.rotation.z=side*(id==='ev6'?.15:.10);const tail=roundedBox(g,W*.30,.065,.037,.02,side*W*.303,s.bumper+.12,rearZ,red);tail.rotation.z=-side*.11;}if(id==='ev6')line(g,[[-W*.40,s.bumper+.14,rearZ-.014],[-W*.29,s.belt-.09,rearZ-.027],[0,s.belt-.11,rearZ-.03],[W*.29,s.belt-.09,rearZ-.027],[W*.40,s.bumper+.14,rearZ-.014]],0xff2552,.027);}
 roundedBox(g,W*.60,.10,.032,.04,0,.535,frontZ,dark);roundedBox(g,.48,.115,.035,.018,0,.69,frontZ+.027,mat(0xced7d8,{metalness:.25,roughness:.6}));roundedBox(g,.49,.12,.035,.018,0,.65,rearZ-.019,mat(0xdae3e1,{metalness:.2,roughness:.6}));
 for(const side of [-1,1])line(g,[[side*.66,s.belt+.033,s.front+.04],[side*.73,s.bonnet+.015,end-.42],[side*.55,s.bumper+.068,end-.14]],0x34434a,.006);
 if(id==='cybertruck'){box(g,W*.77,.047,1.14,0,s.belt+.006,-2.04,dark);for(let i=0;i<12;i++)box(g,W*.75,.012,.022,0,s.belt+.035,-2.57+i*.095,alloy);for(const side of [-1,1])box(g,.10,.16,1.3,side*W*.445,s.belt-.025,-2.01,paint);}
 else if(id==='ev6'||id==='ioniq5'||id==='ev3'){const spoiler=roundedBox(g,s.baseWidth*.98,.055,.23,.024,0,s.belt+.12,s.rear-.05,id==='ev6'?dark:paint);spoiler.rotation.x=-.05;}
 const wheels=[],pivots=[];
 for(const axle of [-1,1])for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*(W/2-.115),.46,axle*s.wheelbase/2);g.add(pivot);const wheel=new THREE.Group();pivot.add(wheel);
  const tire=mesh(wheel,new THREE.CylinderGeometry(.435,.435,.265,32),rubber);tire.rotation.z=Math.PI/2;
  const outer=side*.145,hub=mesh(wheel,new THREE.CylinderGeometry(.328,.328,.025,32),dark,outer,0,0);hub.rotation.z=Math.PI/2;
  const ring=mesh(wheel,new THREE.TorusGeometry(.319,.026,6,32),alloy,outer+side*.013,0,0);ring.rotation.y=Math.PI/2;
  const disc=mesh(wheel,new THREE.CylinderGeometry(.24,.24,.019,24),mat(0x696f76,{metalness:.8,roughness:.4}),outer-side*.027,0,0);disc.rotation.z=Math.PI/2;
  for(let i=0;i<5;i++){const angle=i*Math.PI*2/5,spoke=box(wheel,.037,.265,.064,outer+side*.012,Math.cos(angle)*.152,Math.sin(angle)*.152,id==='cybertruck'?dark:alloy);spoke.rotation.x=angle;}
  const center=mesh(wheel,new THREE.CylinderGeometry(.073,.073,.052,16),alloy,outer+side*.03,0,0);center.rotation.z=Math.PI/2;box(pivot,.032,.14,.11,outer-side*.028,.14,.19,mat(0xb63438,{roughness:.5}));
  for(let i=0;i<20;i++){const angle=i*Math.PI*2/20,groove=box(wheel,.254,.012,.026,0,Math.cos(angle)*.435,Math.sin(angle)*.435,dark);groove.rotation.x=angle;}
  wheels.push(wheel);if(axle===1)pivots.push(pivot);
 }
 const flame=new THREE.Group();for(const side of [-1,1]){const m=mesh(flame,new THREE.ConeGeometry(.20,1.6,10),new THREE.MeshBasicMaterial({color:0x65ffe2}),side*.56,.45,-end-.77);m.rotation.x=-Math.PI/2;}flame.visible=false;g.add(flame);
 const bubble=mesh(g,new THREE.SphereGeometry(L*.66,20,14),new THREE.MeshBasicMaterial({color:0x72dfff,wireframe:true,transparent:true,opacity:.22}),0,.85,0);bubble.visible=false;g.userData={wheels,pivots,flame,bubble,vehicle:id};return g;
}
export class CarPreview{
 constructor(canvas){this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.scene=new THREE.Scene();this.scene.environment=studioEnvironment(this.renderer);this.scene.add(new THREE.HemisphereLight(0xe5f5ff,0x405466,2));const key=new THREE.DirectionalLight(0xfff2df,3);key.position.set(4,7,5);this.scene.add(key);const fill=new THREE.DirectionalLight(0x9fd2f0,2);fill.position.set(-5,3,-4);this.scene.add(fill);this.camera=new THREE.PerspectiveCamera(24,1,.1,100);this.camera.position.set(5.2,2.25,5.9);this.camera.lookAt(0,.86,0);this.setVehicle('ev6');}
 setVehicle(id){if(this.model){this.scene.remove(this.model);this.model.traverse(o=>o.geometry?.dispose());}this.model=carModel(id);this.scene.add(this.model);}
 render(time){const rect=this.canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;const w=Math.round(rect.width),h=Math.round(rect.height);if(this.w!==w||this.h!==h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}this.model.rotation.y=time*.12;this.renderer.render(this.scene,this.camera);}
}





