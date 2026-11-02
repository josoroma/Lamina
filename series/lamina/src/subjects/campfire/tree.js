import * as THREE from 'three/webgpu';
import { BladeSurface } from '../../kits/petal/index.js';
import { TAU } from './model.js';

// A deliberately small memory-diagram tree, not a named botanical species.
export function memoryTree(M,parent,pos=[0,0,0],scale=1){
 const g=M.group(parent,pos);g.scale.setScalar(scale);
 for(let i=0;i<5;i++){
  const a=i/5*TAU+.3,x=Math.cos(a),z=Math.sin(a);
  M.sweep(g,[[0,.32,0],[x*.3,.035,z*.3],[x*.78,-.14,z*.78]],[[.15,.14],[.10,.075],[.018,.014]],'#75513b',{radial:12,steps:16});
 }
 M.sweep(g,[[0,0,0],[-.12,1.6,.05],[.16,3.2,0],[.4,4.8,.05]],[[.3,.29],[.24,.23],[.14,.14],[.015,.015]],'#75513b',{radial:20,steps:35,ruffle:.045});
 for(let j=0;j<7;j++){
  const a=j*2.399,y=1.6+j*.4,reach=1.8-j*.07,bx=Math.cos(a)*reach,bz=Math.sin(a)*reach;
  M.sweep(g,[[.05,y,0],[bx*.45,y+.3,bz*.45],[bx,y+.95,bz]],[[.12,.12],[.075,.075],[.008,.008]],'#75513b',{radial:12,steps:20,ruffle:.04});
  for(let i=0;i<6;i++){
   const u=.22+i*.14,side=i%2?1:-1,leaf=new BladeSurface({length:1.1+(i%3)*.13,width:.5,profile:'lanceolate',cup:.18,fold:.13,curl:-.32,twist:side*.18,thickness:.024,segU:6,segV:12});
   const m=M.mesh(leaf.geometry,i%3?'#668958':'#819c63',g,[bx*u,y+.95*u,bz*u]);m.rotation.set(.6+Math.sin(a)*.5,a+side*.7,side*.95);
   const rib=M.line(m,[[0,.03,.025],[0,.4,.06],[0,.82,.01]],.012,'#b6bd7c',false,12);
   const rest=m.rotation.z;M.poses.push(t=>m.rotation.z=rest+.04*Math.sin(TAU*t/5+j*.6));
  }
 }
 return g;
}
