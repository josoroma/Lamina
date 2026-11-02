// Sculpted, microscopy-inspired illustrations. These surfaces are deliberately
// schematic, not coordinates from an experimental molecular structure.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, mix, mx_noise_float, positionLocal, vec3 } from 'three/tsl';
import { msg } from '../../i18n/index.js';
export const TAU=Math.PI*2;
export const C={teal:'#71a7a0',pale:'#d0ded0',dark:'#426e70',gold:'#d9b96b',coral:'#cc886c',purple:'#9886ad',blue:'#8bacbe',cream:'#eee0b7',green:'#77996d',rose:'#c6a0ae'};
export function surface(fn,nu=48,nv=24){const p=[],uv=[],ind=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){p.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv);}for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;ind.push(a,b,a+1,b,b+1,a+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return g;}
export function organic(scale=[1,1,1],seed=0,cut=false,detail=32){return surface((u,v)=>{const ph=(cut?Math.PI:0)+u*(cut?Math.PI:TAU),th=v*Math.PI;const r=1+.035*Math.sin(ph*5+seed)*Math.sin(th*4)+.022*Math.cos(ph*3-th*5+seed);return[scale[0]*r*Math.cos(ph)*Math.sin(th),scale[1]*r*Math.cos(th),scale[2]*r*Math.sin(ph)*Math.sin(th)];},detail,20);}
export function pathGeo(points,r=.07,segments=48,radial=7,closed=false){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),segments,r,radial,closed);}
export function transformed(geo,pos=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){const m=new THREE.Matrix4().compose(new THREE.Vector3(...pos),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));return geo.applyMatrix4(m);}
export class Model{
 constructor(ctx){this.ctx=ctx;this.root=new THREE.Group();this.layers=[];this.labels=[];this.parts=[];this.groups=new Map();this.mats=new Map();this.resources=new Set();this.seq=0;}
 group(id,label,hint,c){const g=new THREE.Group();g.name=id;g.userData.cellLabel=label;this.root.add(g);this.groups.set(id,g);this.layers.push({id,label,hint,visible:true});return g;}
 mat(c){if(!this.mats.has(c)){const n=mx_noise_float(positionLocal.mul(vec3(2.7,3.7,2.9))).mul(.5).add(.5);this.mats.set(c,this.ctx.ink({colorNode:mix(color(c).mul(.84),color(c).mul(1.08),n),svgColor:c,side:THREE.DoubleSide,hatch:.22,crossHatch:.25,roughness:.62,clearcoat:.08}));}return this.mats.get(c);}
 mesh(g,c,parent=this.root,pos=[0,0,0],scale=[1,1,1]){const o=new THREE.Mesh(g,this.mat(c));o.position.set(...pos);o.scale.set(...scale);parent.add(o);this.resources.add(g);o.name=`cell-part-${this.seq++}`;let name=msg('Cell model');for(let a=parent;a;a=a.parent)if(a.userData.cellLabel){name=a.userData.cellLabel;break;}this.parts.push({id:o.name,name,object:o,color:c});return o;}
 batch(gs,c,parent){if(!gs.length)return null;const g=mergeGeometries(gs);for(const x of gs)x.dispose();return this.mesh(g,c,parent);}
 ball(c,parent,pos,r=.3,scale=[1,1,1]){return this.mesh(organic(scale,0,false,20),c,parent,pos,[r,r,r]);}
 blob(c,parent,pos,scale,seed=0){return this.mesh(organic(scale,seed),c,parent,pos);}
 tube(points,r,c,parent,closed=false){return this.mesh(pathGeo(points,r,Math.max(32,points.length*3),7,closed),c,parent);}
 ring(r,w,c,parent,pos,scale=[1,1,1]){return this.mesh(new THREE.TorusGeometry(r,w,7,40),c,parent,pos,scale);}
 label(id,text,detail,parent,pos,layer){const a=new THREE.Object3D();a.position.set(...pos);parent.add(a);this.labels.push({id,text,detail,anchor:a,layer});return a;}
 shell(parent,{pos=[0,0,0],scale=[4,2,1.6],outer=C.teal,inner=C.pale,seed=0}){const g=new THREE.Group();g.position.set(...pos);parent.add(g);this.mesh(organic(scale,seed,true,56),outer,g);this.mesh(organic(scale.map(v=>v*.955),seed,true,56),inner,g,[0,0,.035]);for(const [r,c,w]of[[1,outer,.065],[.953,inner,.038]]){const pts=[];for(let i=0;i<80;i++){const a=i/80*TAU,n=1+.025*Math.sin(a*5+seed);pts.push([scale[0]*Math.cos(a)*n*r,scale[1]*Math.sin(a)*n*r,.03]);}this.tube(pts,w,c,g,true);}return g;}
 dispose(){for(const g of this.resources)g.dispose();for(const m of this.mats.values())m.dispose();}
}
// Flattened, rippled membrane sac with a rounded continuous perimeter.
export function cisterna(K,parent,{center=[0,0,0],rx=1.2,rz=.6,depth=.1,phase=0,color=C.blue}){const g=surface((u,v)=>{const ph=u*TAU,th=v*Math.PI,r=1+.07*Math.sin(ph*3+phase);return[rx*r*Math.cos(ph)*Math.sin(th),depth*Math.cos(th)+.1*Math.sin(ph*2+phase)*Math.sin(th),rz*r*Math.sin(ph)*Math.sin(th)];},40,12);return K.mesh(g,color,parent,center);}
export function mitochondrion(K,parent,pos,scale=1,angle=0,detail=true){const g=new THREE.Group();g.position.set(...pos);g.rotation.z=angle;g.scale.setScalar(scale);parent.add(g);K.shell(g,{scale:[1.75,.75,.7],outer:'#b97764',inner:'#e0ad83',seed:2});
 // Cristae are curved flattened invaginations, attached to the inner membrane.
 const gs=[];for(let j=0;j<7;j++){const x=-1.35+j*.43,amp=.54*Math.sqrt(Math.max(.15,1-(x/1.7)**2));gs.push(surface((u,v)=>{const z=-.55+u*.92,y=-amp+v*amp*1.65;return[x+.12*Math.sin(v*Math.PI)+.05*Math.sin(u*TAU+j),y,z+.08*Math.sin(v*Math.PI)];},12,8));}K.batch(gs,'#cc8c64',g);
 if(detail){const dots=[];for(let j=0;j<7;j++)for(let k=0;k<3;k++)dots.push(transformed(new THREE.SphereGeometry(.055,7,5),[-1.3+j*.43,.16+k*.12,.18]));K.batch(dots,'#f0d6a0',g);}return g;}
export function ribosome(K,parent,pos,scale=1){const g=new THREE.Group();g.position.set(...pos);g.scale.setScalar(scale);parent.add(g);K.mesh(surface((u,v)=>{const a=u*TAU,t=v*Math.PI,r=1+.13*Math.sin(t*3)*Math.cos(a*3)+.065*Math.sin(a*5+t*5);return[.8*r*Math.cos(a)*Math.sin(t),.65*r*Math.cos(t),.59*r*Math.sin(a)*Math.sin(t)];},40,24),'#b8a1be',g,[0,.3,0]);K.blob('#897499',g,[-.05,-.48,.05],[.7,.3,.55],7);const granules=[];for(let i=0;i<21;i++){const a=i*2.399,z=1-2*(i+.5)/21,r=Math.sqrt(1-z*z);granules.push(transformed(organic([.17,.14,.15],i,false,10),[.65*r*Math.cos(a),.3+.5*z,.48*r*Math.sin(a)]));}K.batch(granules,'#a88eae',g);for(let j=0;j<3;j++){const pts=[];for(let i=0;i<28;i++){const a=-.2+i/27*Math.PI*1.15;pts.push([.64*Math.cos(a),.17+j*.18+.05*Math.sin(a*3),.43*Math.sin(a)]);}K.tube(pts,.025,'#d1b8cf',g);}K.tube([[-.65,-.21,.4],[-.2,-.14,.5],[.3,-.15,.45],[.7,-.21,.25]],.045,'#d8bdd4',g);return g;}
