import * as THREE from 'three/webgpu';
import { msg } from '../../i18n/index.js';
import { TAU } from './model.js';
import { driftwood, flames, firepit } from './landscape.js';
import { character } from './characters.js';

export function buildMechanism(scene,M,A){
 const {root,shapes,layer,part,label,separated,poses,sparks,arrow}=A;
 const charcoal='#352d2b',ember='#e58b31',gold='#efba5d';
 function fragment(parent,p,r,color,seed=1){const geo=new THREE.IcosahedronGeometry(r,2),v=geo.attributes.position;for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i),z=v.getZ(i),w=1+.13*Math.sin(x*5+y*3+z*7+seed);v.setXYZ(i,x*w,y*w,z*w);}geo.computeVertexNormals();return M.mesh(geo,color,parent,p);}
 function strand(parent,points,color,r=.055){return M.line(parent,points,r,color,false,42);}
 function tracer(parent,points,color,offset,size=.1){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),dot=M.ellipsoid(parent,[0,0,0],[size,size,size],color,true,12);poses.push(t=>{const q=TAU*(t/5+offset),u=.5-.5*Math.cos(q);dot.position.copy(c.getPoint(u));dot.scale.setScalar(Math.max(0,Math.sin(q))**2);});return dot;}
 if(scene==='pyrolysis'){
   const wood=driftwood(M,shapes,[0,1.65,.5],-.12,16,false,1.45);part('heated-log',msg('Heated wood'),wood,'#75513b','structure');
   const char=layer('char',msg('Charred layer'),msg('Heating leaves a carbon-rich solid residue.'));
   // Irregular carbonized plates separate from the fibres beneath them.
   for(let i=0;i<26;i++){const x=-7+(i%9)*1.7,z=-.6+Math.floor(i/9)*.75,y=2.65+.24*Math.sin(i*3);const chip=fragment(char,[x,y,z],.62,charcoal,i);chip.scale.set(1,.38,.76);chip.rotation.y=i*1.7;}
   for(let i=0;i<15;i++)strand(char,[[-6.9+i,.3+2.45,1.1],[-6.6+i,2.9,.55],[-6.45+i,2.72,-.15]],i%3?'#79381f':gold,.02);
   separated(char,[0,1.8,3]);part('char',msg('Charred layer'),char,charcoal,'char');
   // A splintered end exposes longitudinal fibres, rather than a generic box.
   for(let i=0;i<13;i++){const a=i/13*TAU,y=1.65+Math.cos(a)*1.05,z=.5+Math.sin(a)*1.05;M.sweep(shapes,[[5.6,y,z],[7.7,y+.1*Math.sin(i),z],[8.6+(i%3)*.16,y+.18,z+.08]],[[.1,.08],[.08,.06],[.004,.004]],i%2?'#ac875b':'#d0ad75',{radial:8,steps:16});}
   const gas=layer('gas',msg('Escaping gases'),msg('Small moving beads stand for a mixture of gases and vapours, not their actual sizes.'));
   const f=flames(M,gas,[-1.8,2.6,-.6],1.55);
   gas.userData.printPalette=[...f.userData.printPalette,...['#b7c5c9','#f1d6a0'].map(color=>({color,keepSmall:true}))];
   for(let i=0;i<8;i++){const x=-6+i*1.65,path=[[x,2.6,1.1],[x-.2,4,1.3],[x+.5,6.3,1],[x+1,9.8,.3]];strand(gas,path,'#c7c1b6',.12);for(let j=0;j<3;j++)tracer(gas,path,i%2?'#b7c5c9':'#f1d6a0',j/3+i*.13,.12+(i%3)*.035);}
   part('fuel-gases',msg('Fuel gases'),gas,gold,'gas');separated(gas,[0,1,-1]);
   label('wood',msg('Heated wood'),msg('Heat changes the large molecules that make up wood.'),wood,[5.3,.6,1.1],'structure');
   label('char',msg('Char'),msg('The dark solid left behind is richer in carbon than the original wood.'),char,[3.4,3.1,1],'char');
   label('gas',msg('Fuel gases'),msg('Some released gases can burn after mixing with air.'),gas,[3.8,7.2,1],'gas');
 }else if(scene==='reaction'){
   const atoms=layer('atoms',msg('Atoms'),msg('One overall carbon monoxide reaction; the animation is not a molecular reaction pathway.'));
   const bonds=layer('bonds',msg('Chemical bonds'),msg('Links show which atoms belong to each molecule.'));
   // The molecular demonstration floats above one restrained reaction arrow.
   // Only six atom meshes exist: exactly 2 carbon and 4 oxygen throughout.
   const start=[[-7,4.4,-1],[-5.3,4.4,-1],[-7,8.4,1.2],[-5.3,8.4,1.2],[-1.7,4.5,0],[-1.7,6.3,0]];
   const end=[[6,4.4,1],[4.2,4.4,1],[6,8.4,-1],[4.2,8.4,-1],[7.8,4.4,1],[7.8,8.4,-1]];
   const balls=start.map((p,i)=>M.ellipsoid(atoms,p,[i===0||i===2?.83:.94,i===0||i===2?.83:.94,i===0||i===2?.83:.94],i===0||i===2?'#3b3633':'#b74937',false,36));
   balls.forEach((o,i)=>part(`atom-${i}`,i===0||i===2?msg('Carbon atom'):msg('Oxygen atom'),o,i===0||i===2?'#3b3633':'#b74937','atoms'));
   const pairs=[[0,1],[2,3],[4,5],[0,4],[2,5]],sticks=pairs.map(()=>M.mesh(new THREE.CylinderGeometry(.16,.16,1,18),'#c2b7a2',bonds)),up=new THREE.Vector3(0,1,0),delta=new THREE.Vector3();
   const progress=t=>{const p=.5-.5*Math.cos(TAU*t/5),u=Math.max(0,Math.min(1,(p-.16)/.68));return u*u*(3-2*u);};
   poses.push((t,e)=>{const u=progress(t);balls.forEach((m,i)=>{m.position.set(...start[i]).lerp(new THREE.Vector3(...end[i]),u);m.position.y+=Math.sin(Math.PI*u)*(i%2?1.1:2.2)+e*(i%2?1.6:0);m.position.z+=Math.sin(Math.PI*u)*(i%2?-.9:.9);});sticks.forEach((m,j)=>{const[p,q]=pairs[j].map(i=>balls[i].position);m.visible=j===2?u<.35:j>2?u>.65:true;delta.copy(q).sub(p);m.position.copy(p).add(q).multiplyScalar(.5);m.scale.y=delta.length();m.quaternion.setFromUnitVectors(up,delta.normalize());});});
   const guide=arrow(shapes,[-8,.55,4],[8,.55,4],gold,.1);part('reaction-trays',msg('Before and after'),shapes,gold,'structure');part('bonds',msg('Chemical bonds'),bonds,'#c2b7a2','bonds');
   for(let i=0;i<4;i++)tracer(shapes,[[-8,.55,4],[-2,.55,4],[3,.55,4],[8,.55,4]],'#f5d18a',i/4,.12);
   const fuel=label('fuel',msg('Carbon monoxide'),msg('Two carbon monoxide molecules are one possible fuel in the gas mixture.'),balls[0],[0,1,0],'atoms');
   const oxygen=label('oxygen',msg('Oxygen'),msg('One oxygen molecule supplies two oxygen atoms.'),balls[4],[0,1,0],'atoms');
   const products=label('products',msg('Carbon dioxide'),msg('The same two carbon atoms and four oxygen atoms can form two carbon dioxide molecules.'),balls[2],[0,1,0],'atoms');
   poses.push(t=>{const u=progress(t);fuel.visible=oxygen.visible=u<.35;products.visible=u>.65;});
 }else if(scene==='heat'){
   const f=firepit(M,shapes,[-4,0,0],1.13);part('heat-source',msg('Campfire'),f,ember,'structure');
   driftwood(M,shapes,[7,1.2,2],0,4.6,false,.9);const girl=character(M,shapes,{position:[6.3,.2,2.05],yaw:-.87,child:true,footHeight:.028});girl.root.scale.multiplyScalar(1.28);
   const flow=layer('flow',msg('Air movement'),msg('Warm gases rise; cooler surrounding air moves inward.'));
   for(let i=0;i<4;i++){const x=-6.3+i*1.45,path=[[x,1.5,-.4],[x,4.2,-.8],[x+.4,8,-.7],[x+2,12,-1.2]];strand(flow,path,'#c7c1b6',.13);for(let j=0;j<3;j++)tracer(flow,path,'#d78c4f',i*.17+j/3,.105);}
   for(const s of [-1,1]){const path=[[s*11,.4,1],[s*8,.5,1],[s*5,.8,.5],[-4,2,0]];strand(flow,path,'#6e9baa',.05);for(let j=0;j<3;j++)tracer(flow,path,'#87b8c7',j/3,.09);}
   const rays=layer('radiation',msg('Thermal radiation'),msg('Electromagnetic radiation carries energy outward, including to a nearby observer.'));
   for(let i=0;i<5;i++){const path=[[-2,3+i*.22,.4],[.2,3.2+i*.2,1+i*.35],[3,3.4+i*.13,1.7+i*.3],[6,3.3+i*.2,2+i*.2]];strand(rays,path,'#d7aa61',.025);tracer(rays,path,'#ffe1a0',i/5,.055);}
   part('convection',msg('Air movement'),flow,'#d78c4f','flow');part('radiation',msg('Thermal radiation'),rays,gold,'radiation');part('observer',msg('Daughter'),girl.root,'#a7b6aa','structure');
   separated(flow,[0,0,-2]);separated(rays,[0,0,2]);
   label('convection',msg('Convection'),msg('Moving hot gases carry energy upward.'),flow,[-2.5,10.6,-.6],'flow');
   label('radiation',msg('Radiation'),msg('Radiation reaches the side of the fire without riding an air current.'),rays,[2.8,4.4,2.5],'radiation');
   label('conduction',msg('Conduction'),msg('Energy also passes through the solid wood by interactions between neighbouring particles.'),f,[-1,.8,1.1],'structure');
 }else if(scene==='light'){
   const glow=layer('glow',msg('Glowing matter'),msg('Hot soot, char and airborne fragments emit light.'));
   driftwood(M,shapes,[-5.5,1,0],-.2,6,true,1);const f=flames(M,glow,[-5.5,1.7,0],1.65);
   const emberLog=driftwood(M,shapes,[5.8,1.5,.6],-.35,8,true,1.4);
   for(let i=0;i<18;i++){const x=2.8+(i%6)*1.14,z=.15+Math.floor(i/6)*.66;const c=fragment(shapes,[x,2.5,z],.42,charcoal,i);c.scale.set(1,.55,.8);}
   for(let i=0;i<17;i++){const x=2.7+i*.38;strand(glow,[[x,2.45,-.15],[x+.17,2.79,.35],[x+.08,2.7,.8],[x+.3,2.35,1.3]],i%3?'#bc4e23':'#ffd473',.026+(i%3)*.008);}
   const soot=layer('particles',msg('Enlarged particles'),msg('The soot beads are enlarged enormously so their role can be seen.'));
   for(let i=0;i<14;i++){const cluster=M.group(soot);for(let j=0;j<3;j++)M.ellipsoid(cluster,[Math.sin(j*2.1)*.065,Math.cos(j*2.1)*.065,0],[.072,.065,.07],'#322d29',false,12);poses.push(t=>{const q=TAU*(t/5+i/14),u=.5-.5*Math.cos(q);cluster.position.set(-5.5+Math.sin(i*2.2)*.75,2.3+u*5.5,.7);cluster.scale.setScalar(Math.max(0,Math.sin(q))**2);});}
   const sp=sparks(glow,[5.5,2.6,.6],14);
   part('flame-light',msg('Yellow flame'),f,gold,'glow');part('ember',msg('Glowing ember'),emberLog,charcoal,'structure');part('soot',msg('Soot particles'),soot,charcoal,'particles');part('sparks',msg('Sparks'),sp,gold,'glow');part('char-cracks',msg('Glowing ember'),shapes,charcoal,'structure');
   separated(soot,[0,0,2.5]);
   label('soot',msg('Hot soot'),msg('Tiny carbon-rich particles contribute much of a wood flame’s yellow glow.'),soot,[-5.5,5.4,.9],'particles');
   label('ember',msg('Ember'),msg('A hot solid can glow even without a flame above it.'),emberLog,[1,1.3,.6],'structure');
   label('spark',msg('Spark'),msg('A spark here is a small hot fragment carried upward by the gas flow.'),sp,[0,6,0],'glow');
 }
}
