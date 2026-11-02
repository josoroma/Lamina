// Six schematic atomic studies. Geometry uses enlarged teaching units, never real centimetres.
// Every pose derives from absolute loop time; the hydrogen cloud itself is stationary.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color as tslColor, mix, mx_noise_float, positionLocal, normalLocal, vec3, uniform, smoothstep, abs, float } from 'three/tsl';
import { msg } from '../../i18n/index.js';
import { FIGURE_DURATION } from '../../engine/figures/contract.js';

const C = { proton:'#b96e49', neutron:'#537b93', electron:'#487b9b', oxygen:'#b65245', hydrogen:'#f1ead9', carbon:'#354957', bond:'#b3c2c6', gold:'#ba9157', pale:'#dce8e8', ivory:'#eee9dc', dark:'#243e51' };
const TAU = Math.PI * 2;
const V = (p) => new THREE.Vector3(...p);
function kit(ctx) {
  const root=new THREE.Group(), layers=[], labels=[], parts=[], groups=new Map(), materials=new Map(), geometries=new Set();
  const small=new THREE.IcosahedronGeometry(1,1), round=new THREE.SphereGeometry(1,24,16);geometries.add(small);geometries.add(round);
  const material=(color,flat=false,finish='ceramic')=>{const key=color+flat+finish;if(!materials.has(key)){
    const grain=mx_noise_float(positionLocal.mul(finish==='stone'?14:48)).mul(.5).add(.5);
    materials.set(key,flat?ctx.flat({color}):ctx.ink({color,svgColor:color,colorNode:mix(tslColor(color).mul(.91),tslColor(color).mul(1.04),grain),roughness:finish==='metal'?.32:finish==='stone'?.67:.42,metalness:finish==='metal'?.42:.03,clearcoat:finish==='stone'?0:.23,hatch:.62,crossHatch:.5}));
  }return materials.get(key)};
  function mesh(geo,color,parent=root,outline=true,flat=false,finish='ceramic'){geometries.add(geo);const o=new THREE.Mesh(geo,material(color,flat,finish));parent.add(o);if(outline)ctx.outline(o,{width:.38});return o}
  function ball(p,r,color,parent=root,outline=true){const o=mesh(outline?round:small,color,parent,outline);o.position.set(...p);o.scale.setScalar(r);return o}
  function rod(a,b,r,color,parent=root){const va=V(a),vb=V(b),o=mesh(new THREE.CylinderGeometry(r,r,va.distanceTo(vb),10),color,parent,false);o.position.copy(va).add(vb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return o}
  function group(parent=root){const g=new THREE.Group();parent.add(g);return g}
  function layer(id,label,hint){const g=group();groups.set(id,g);layers.push({id,label,hint,visible:true});return g}
  function label(id,text,detail,parent,p,layer){const anchor=new THREE.Object3D();anchor.position.set(...p);parent.add(anchor);labels.push({id,text,detail,anchor,...(layer?{layer}:{})});}
  function part(id,name,object,color,layer){parts.push({id,name,object,color,...(layer?{layer}:{})});}
  function batch(points,color,parent=root){const dot=new THREE.IcosahedronGeometry(1,0),geos=points.map(([x,y,z,r])=>dot.clone().scale(r,r,r).translate(x,y,z));dot.dispose();const geo=mergeGeometries(geos);geos.forEach(g=>g.dispose());return mesh(geo,color,parent,false);}
  function line(points,color,parent=root,width=.65){const o=ctx.inkLine(points,{color,width});parent.add(o);return o;}
  function disk(p,r,h,color,parent=root,finish='ceramic'){const o=mesh(new THREE.CylinderGeometry(r,r,h,80,1),color,parent,true,false,finish);o.position.set(...p);return o;}
  return {ctx,root,layers,labels,parts,groups,mesh,ball,rod,group,layer,label,part,batch,line,disk,material,
    dispose(){const owned=new Set(materials.values());root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])owned.add(m)});geometries.forEach(g=>g.dispose());owned.forEach(m=>m.dispose());},
  };
}
function random(seed=17){let n=seed;return()=>{n=(1664525*n+1013904223)>>>0;return(n+.5)/4294967296}}
function ring(K,p,r,color,parent){const geo=new THREE.TorusGeometry(r,.055,8,72);const m=K.mesh(geo,color,parent,false);m.rotation.x=Math.PI/2;m.position.set(...p);return m}

function cloud(K){
 const cloud=K.layer('cloud',msg('Probability cloud'),msg('Fixed samples of possible electron position measurements'));
 const nucleus=K.layer('nucleus',msg('Atomic nucleus'),msg('The proton is enormously enlarged for visibility'));
 const detail=K.layer('detail',msg('Magnified nucleus'),msg('The inset repeats the central proton at a larger display scale'));
 const rnd=random(19),buckets=Array.from({length:5},()=>[]),a0=2.25,slice=uniform(8);
 // Uniform solid angle and Gamma(3,a0/2) radii sample |psi_1s|² per volume.
 // Thousands of stationary samples describe ONE electron's repeated measurements.
 for(let i=0;i<2400;i++){
   const r=-a0*.5*Math.log(rnd()*rnd()*rnd());if(r>7.3){i--;continue;}
   const z=2*rnd()-1,a=TAU*rnd(),q=Math.sqrt(1-z*z),bin=Math.min(4,Math.floor(r/1.5));
   buckets[bin].push([-1.3+r*q*Math.cos(a),8+r*z,r*q*Math.sin(a),.045+.022*rnd()]);
 }
 const colors=['#244a69','#356482','#56859e','#86a9b9','#b3c7cc'];
 buckets.forEach((points,i)=>{const m=K.batch(points,colors[i],cloud);
   m.material=K.ctx.ink({color:colors[i],svgColor:colors[i],colorNode:mix(tslColor(colors[i]),tslColor('#c39559'),float(1).sub(smoothstep(.08,.48,abs(positionLocal.y.sub(slice))))),roughness:.62,hatch:0});
   m.userData.castShadow=false;m.userData.receiveShadow=false;
   K.part('cloud-'+i,msg('Probability samples'),m,colors[i],'cloud');});
 const centre=K.ball([-1.3,8,0],.27,C.proton,nucleus);
 const enlarged=K.group(detail);enlarged.position.set(7.2,2.6,3.4);
 const proton=K.ball([0,0,0],1.42,C.proton,enlarged);proton.material=K.ctx.ink({color:C.proton,roughness:.29,metalness:.32,clearcoat:.35,hatch:.12,crossHatch:0});
 // An inset is a second depiction, not a second proton in hydrogen.
 K.disk([0,-1.64,0],2.13,.16,C.ivory,enlarged);ring(K,[0,-1.53,0],2.05,C.gold,enlarged);
 const plus=K.group(enlarged);plus.position.set(0,.07,1.43);
 K.rod([-.36,0,0],[.36,0,0],.045,C.ivory,plus);K.rod([0,-.36,0],[0,.36,0],.045,C.ivory,plus);
 const leader=K.ctx.inkLine([[-1.05,7.8,.3],[3.7,5.3,1.8],[5.8,3.4,2.8]],{color:'#9b9c91',width:.65,dashed:true});detail.add(leader);
 K.label('nucleus',msg('Proton'),msg('The magnified inset repeats the one proton at the cloud centre.'),proton,[0,1.45,0],'detail');
 K.label('cloud',msg('Probability cloud'),msg('These fixed dots are possible outcomes, not simultaneous electrons.'),cloud,[-4,10.9,2],'cloud');
 K.part('central-proton',msg('Proton'),centre,C.proton,'nucleus');K.part('magnified-proton',msg('Magnified nucleus'),proton,C.proton,'detail');
 return {title:msg('Hydrogen probability cloud'),bounds:{min:[-9,0,-7.4],max:[10,15.5,7.4]},pose(t,e){slice.value=8+5*Math.sin(t/5*TAU);cloud.position.x=-e*1.5;enlarged.position.y=2.6+e*2;centre.position.x=-1.3-e*1.5;}};
}
function isotopes(K){
 const protons=K.layer('protons',msg('Protons'),msg('Copper particles set the element’s atomic number'));
 const neutrons=K.layer('neutrons',msg('Neutrons'),msg('Blue particles change the isotope without changing charge'));
 const guides=K.layer('comparison',msg('Comparison guides'),msg('The three nuclei are separate enlarged counting models'));
 const refs=[];
 const entries=[{x:-7.1,p:[[0,0,0]],n:[],id:'hydrogen',name:msg('Hydrogen-1'),detail:msg('One proton, no neutrons.')},{x:0,p:[[-1.03,0,0]],n:[[1.03,0,0]],id:'deuterium',name:msg('Hydrogen-2'),detail:msg('One proton and one neutron: still hydrogen.')},{x:7.1,p:[[.86,.86,.86],[-.86,-.86,.86]],n:[[-.86,.86,-.86],[.86,-.86,-.86]],id:'helium',name:msg('Helium-4'),detail:msg('Two protons and two neutrons form this helium nucleus.')}];
 entries.forEach((s,j)=>{
   const pg=K.group(protons),ng=K.group(neutrons);pg.position.set(s.x,3.85,0);ng.position.copy(pg.position);
   s.p.forEach(p=>{const o=K.ball(p,1.48,C.proton,pg);o.material=K.ctx.ink({color:C.proton,roughness:.33,metalness:.27,clearcoat:.32,hatch:.18,crossHatch:.15});
     // The raised + is the charge legend, not a claim about proton surface structure.
     K.rod([p[0]-.3,p[1],p[2]+1.49],[p[0]+.3,p[1],p[2]+1.49],.038,C.ivory,pg);
     K.rod([p[0],p[1]-.3,p[2]+1.49],[p[0],p[1]+.3,p[2]+1.49],.038,C.ivory,pg);
   });
   s.n.forEach(p=>{const o=K.ball(p,1.48,C.neutron,ng);o.material=K.ctx.ink({color:C.neutron,roughness:.41,clearcoat:.25,hatch:.24,crossHatch:.15});});
   K.disk([s.x,.25,0],2.95,.3,C.ivory,guides);ring(K,[s.x,.43,0],2.82,C.gold,guides);
   for(let k=0;k<24;k++){const a=k*TAU/24,r=k%6===0?2.48:2.65;K.line([[s.x+Math.cos(a)*r,.435,Math.sin(a)*r],[s.x+Math.cos(a)*2.79,.435,Math.sin(a)*2.79]],'#b4afa1',guides,.55);}
   const leader=K.ctx.inkLine([[s.x,.5,0],[s.x,1.2,0]],{color:'#b4afa1',width:.65,dashed:true});guides.add(leader);
   refs.push({pg,ng,x:s.x,j});K.label(s.id,s.name,s.detail,pg,[0,j===2?2.55:1.95,0],'protons');
   K.part(s.id+'-p',msg('Protons'),pg,C.proton,'protons');if(s.n.length)K.part(s.id+'-n',msg('Neutrons'),ng,C.neutron,'neutrons');
 });
 return{title:msg('A census of three nuclei'),bounds:{min:[-10.6,0,-3.6],max:[10.6,7.8,3.6]},pose(t,e){const phase=t/5*TAU;
   refs.forEach(({pg,ng,x,j})=>{const rot=.18*Math.sin(phase);pg.position.set(x-e*.65,3.85,0);ng.position.set(x+e*1.2,3.85+e*1.2,0);pg.rotation.y=ng.rotation.y=rot;});
 }};
}
function water(K){
 const atoms=K.layer('atoms',msg('Water molecules'),msg('One oxygen and two hydrogens stay together'));
 const bonds=K.layer('bonds',msg('Covalent bonds'),msg('Rods mark electron sharing within each molecule'));
 const links=K.layer('attractions',msg('Between molecules'),msg('The dotted link marks a hydrogen-bond attraction'));
 const polarity=K.layer('polarity',msg('Partial charges'),msg('The charge signs show uneven sharing, not whole extra charges'));
 const molecules=[],ang=104.5*Math.PI/360,hx=3.2*Math.cos(ang),hz=3.2*Math.sin(ang),tilt=Math.atan2(1.2,8.6);
 function charge(parent,p,positive){
   const g=K.group(parent);g.position.set(...p);const col=positive?'#817052':'#f5e6cd';
   const path=[];for(let k=0;k<=28;k++){const a=k/28*TAU;path.push([-.26+.16*Math.cos(a),.12+.21*Math.sin(a),0]);}
   K.line(path,col,g,1.2);K.line([[-.31,.33,0],[-.48,.51,0],[-.3,.56,0]],col,g,1.2);
   K.rod([.05,.15,0],[.37,.15,0],.025,col,g);if(positive)K.rod([.21,-.01,0],[.21,.31,0],.025,col,g);
 }
 for(let i=0;i<2;i++){
  const g=K.group(atoms),b=K.group(bonds),pol=K.group(polarity);g.position.set(i?4.3:-4.3,i?5.8:4.6,0);
  g.rotation.order='ZYX';g.rotation.set(0,i?-.14:ang,i?-.11:tilt);b.position.copy(g.position);b.quaternion.copy(g.quaternion);pol.position.copy(g.position);pol.quaternion.copy(g.quaternion);
  const o=K.ball([0,0,0],1.93,C.oxygen,g),h=K.ball([hx,0,hz],1.24,C.hydrogen,g),h2=K.ball([hx,0,-hz],1.24,C.hydrogen,g);
  o.material=K.ctx.ink({color:C.oxygen,roughness:.27,clearcoat:.55,hatch:.16,crossHatch:.12});
  for(const sphere of [h,h2])sphere.material=K.ctx.ink({color:C.hydrogen,roughness:.31,clearcoat:.42,hatch:.22,crossHatch:0});
  for(const hp of [[hx,0,hz],[hx,0,-hz]]){const half=hp.map(v=>v*.53);K.rod([0,0,0],half,.34,'#be8070',b);K.rod(half,hp,.34,'#d7cdb5',b);}
  // Polarity is a graphic legend drawn on the enlarged atoms, not a surface photograph.
  charge(pol,[0,.1,1.96],false);charge(pol,[hx,.03,hz+1.27],true);charge(pol,[hx,.03,-hz+1.27],true);
  const arc=[];for(let n=0;n<=64;n++){const a=-ang+104.5*Math.PI/180*n/64;arc.push([4.15*Math.cos(a),-.6,4.15*Math.sin(a)]);}
  K.line(arc,'#a99b7b',pol,.8);for(const a of [-ang,ang])K.line([[3.95*Math.cos(a),-.6,3.95*Math.sin(a)],[4.37*Math.cos(a),-.6,4.37*Math.sin(a)]],'#a99b7b',pol,.8);
  molecules.push({g,b,pol});
  K.part('oxygen-'+i,msg('Oxygen'),o,C.oxygen,'atoms');K.part('hydrogen-'+i+'a',msg('Hydrogen'),h,C.hydrogen,'atoms');K.part('hydrogen-'+i+'b',msg('Hydrogen'),h2,C.hydrogen,'atoms');K.part('bond-'+i,msg('Covalent bonds'),b,C.bond,'bonds');
  if(!i){K.label('oxygen',msg('Oxygen'),msg('The oxygen end attracts shared electrons more strongly.'),o,[0,.1,.9],'atoms');K.label('hydrogen',msg('Hydrogen'),msg('Two hydrogens meet the oxygen at a bent angle.'),h,[0,1.24,0],'atoms');}
 }
 const dashes=Array.from({length:13},()=>K.ball([0,5,0],.105,C.gold,links,false));
 const linkAnchor=K.group(links);
 K.label('attraction',msg('Hydrogen bond'),msg('An attraction between molecules, different from the bonds within them.'),linkAnchor,[0,.65,0],'attractions');K.part('attraction',msg('Hydrogen bond'),links,C.gold,'attractions');
 const donor=new THREE.Vector3(hx,0,hz),a=new THREE.Vector3(),end=new THREE.Vector3();
 return{title:msg('Two water molecules'),bounds:{min:[-9,0,-5.4],max:[12,9.4,6]},pose(t,e){const d=.7*(1-Math.cos(t/5*TAU))+e*1.8;
   const second=molecules[1];for(const obj of [second.g,second.b,second.pol])obj.position.set(4.3+d,5.8+d*Math.tan(tilt),0);
   const first=molecules[0];first.g.updateMatrixWorld(true);a.copy(donor).applyQuaternion(first.g.quaternion).add(first.g.position);end.copy(second.g.position);
   dashes.forEach((dot,j)=>dot.position.copy(a).lerp(end,(j+1)/14));linkAnchor.position.copy(a).lerp(end,.5);
 }};
}
function states(K){
 const rnd=random(204),all=[];
 const definitions=[['solid',msg('Solid'),msg('Particles vibrate about an ordered arrangement.'),-7.5],['liquid',msg('Liquid'),msg('Nearby particles move past their neighbours.'),0],['gas',msg('Gas'),msg('Widely separated particles explore a larger volume.'),7.5]];
 definitions.forEach(([id,name,detail,x],j)=>{
   const g=K.layer(id,name,detail);g.position.x=x;const particles=K.group(g),vessel=K.group(g),positions=[];
   const radius=j===2?2.7:2.15,height=j===2?8.1:4.25;
   // Open-front vessel section: the model's contents remain visible without a wire cage.
   const wall=K.mesh(new THREE.CylinderGeometry(radius,radius,height,64,1,true,Math.PI/2,Math.PI),'#d3e4e7',vessel,false);
   wall.position.y=height/2+.35;wall.material=K.ctx.ink({color:'#c5dfe4',roughness:.22,clearcoat:.8,hatch:.12,crossHatch:0,side:THREE.DoubleSide});
   K.disk([0,.28,0],radius+.05,.15,'#dfebea',vessel);ring(K,[0,.39,0],radius,'#8ba7ad',vessel);ring(K,[0,height+.35,0],radius,'#b3cbd0',vessel);
   for(const a of [Math.PI/2,Math.PI*1.5])K.rod([Math.sin(a)*radius,.35,Math.cos(a)*radius],[Math.sin(a)*radius,height+.35,Math.cos(a)*radius],.045,'#adc8ce',vessel);
   for(let k=1;k<=5;k++){const y=.35+height*k/6;K.line([[radius*.72,y,-radius*.72],[radius*.82,y,-radius*.57]],'#8fa9af',vessel,.6);}
   for(let n=0;n<36;n++){
     let p;
     if(j===0)p=[(n%4-1.5)*.9,1.03+Math.floor(n/12)*.9,(Math.floor(n/4)%3-1)*.9];
     else if(j===1){const m=n%12,angle=TAU*(m<8?m/8:(m-8)/4)+Math.floor(n/12)*.22,r=m<8?1.45:.57;p=[r*Math.cos(angle),.98+Math.floor(n/12)*.91,r*Math.sin(angle)];}
     else p=[0,0,0];
     const ball=K.ball(p,.405,C.neutron,particles);ball.material=K.material(C.neutron);
     const phase=[rnd()*TAU,rnd()*TAU,rnd()*TAU];let trail=null;
     if(j===2&&n<6)trail=K.line([[0,0,0],[0,0,0],[0,0,0]],'#a6c0c8',particles,.7);
     positions.push({ball,p,phase,n,trail});
   }
   K.label(id,name,detail,g,[0,height+1,0],id);
   K.part(id,name,particles,C.neutron,id);K.part(id+'-vessel',msg('Cutaway vessel'),vessel,'#d3e4e7',id);all.push({g,vessel,j,x,positions});
 });
 function gasPosition(ph,phase){let x=2.12*Math.sin(ph+phase[0]),z=2.12*Math.cos(ph*3+phase[2]);const r=Math.hypot(x,z);if(r>2.2){x*=2.2/r;z*=2.2/r;}return [x,4.35+3.3*Math.sin(ph*2+phase[1]),z];}
 return{title:msg('Three states of matter'),bounds:{min:[-11,0,-3.3],max:[11,10.8,3.3]},pose(t,e){const ph=t/5*TAU;
   all.forEach(({g,vessel,j,x,positions})=>{g.position.x=x+(j-1)*e*.4;vessel.position.y=e*1.8;
     positions.forEach(({ball,p,phase,n,trail})=>{
       if(j===0)ball.position.set(p[0]+.055*Math.sin(ph*2+phase[0]),p[1]+.055*Math.cos(ph*2+phase[0]),p[2]+.035*Math.sin(ph*2+phase[1]));
       else if(j===1){const m=n%12,level=Math.floor(n/12),a=TAU*(m<8?m/8:(m-8)/4)+level*.22+(m<8?1:-1)*ph*(level%2+1),r=m<8?1.45:.57;ball.position.set(r*Math.cos(a),p[1]+.045*Math.sin(ph*2+phase[0]),r*Math.sin(a));}
       else {ball.position.set(...gasPosition(ph,phase));if(trail)trail.setPoints([gasPosition(ph-.13,phase),gasPosition(ph-.065,phase),gasPosition(ph,phase)]);}
     });
   });
 }};
}
function carbon(K){
 const nodes=K.layer('carbon',msg('Carbon atoms'),msg('The same element appears in both networks'));
 const bonds=K.layer('bonds',msg('Covalent bonds'),msg('Connectivity differs between diamond and graphite'));
 const specimens=K.layer('specimens',msg('Material samples'),msg('Macroscopic samples sit below enlarged atomic networks'));
 const dn=K.group(nodes),db=K.group(bonds);dn.position.set(-5.5,5.8,-1);db.position.copy(dn.position);
 dn.rotation.y=db.rotation.y=.28;dn.scale.setScalar(.91);db.scale.copy(dn.scale);
 const p=[],fcc=[[0,0,0],[0,.5,.5],[.5,0,.5],[.5,.5,0]];
 for(let x=-1;x<2;x++)for(let y=-1;y<2;y++)for(let z=-1;z<2;z++)for(const a of fcc)for(const shift of [0,.25]){
   const b=[x+a[0]+shift,y+a[1]+shift,z+a[2]+shift];if(b.every(v=>v>=0&&v<=1.5))p.push(b.map(v=>(v-.75)*4));
 }
 const seen=new Set(),unique=p.filter(v=>{const k=v.join(',');if(seen.has(k))return false;seen.add(k);return true});
 unique.forEach(v=>K.ball(v,.34,C.carbon,dn));
 for(let i=0;i<unique.length;i++)for(let j=0;j<i;j++)if(Math.abs(V(unique[i]).distanceTo(V(unique[j]))-Math.sqrt(3))<.02)K.rod(unique[i],unique[j],.12,'#91aab8',db);
 // A polished faceted specimen gives the atomic diagram an everyday referent.
 const jewel=K.group(specimens);jewel.position.set(-5.5,2.15,4.5);jewel.rotation.set(-.58,.25,.15);
 const vertices=[],tri=(a,b,c)=>vertices.push(...a,...b,...c),top=[],rim=[],belt=[];
 for(let i=0;i<8;i++){const a=i*TAU/8;top.push([1.15*Math.cos(a),1.35,1.15*Math.sin(a)]);rim.push([2.15*Math.cos(a),.35,2.15*Math.sin(a)]);belt.push([2.15*Math.cos(a),.2,2.15*Math.sin(a)]);}
 for(let i=0;i<8;i++){const j=(i+1)%8;tri([0,1.35,0],top[j],top[i]);tri(top[i],top[j],rim[i]);tri(top[j],rim[j],rim[i]);tri(rim[i],rim[j],belt[i]);tri(rim[j],belt[j],belt[i]);tri(belt[i],belt[j],[0,-1.65,0]);}
 const crystalGeo=new THREE.BufferGeometry();crystalGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));crystalGeo.computeVertexNormals();
 const gem=K.mesh(crystalGeo,'#c2dce6',jewel,false);gem.material=K.ctx.ink({color:'#c2e0eb',svgColor:'#c2e0eb',colorNode:mix(tslColor('#7dabc3'),tslColor('#f5fcff'),smoothstep(-.7,.8,normalLocal.dot(vec3(-.5,.8,1)))),roughness:.16,clearcoat:.68,hatch:.025,crossHatch:0,reflect:.3,side:THREE.DoubleSide});
 for(let i=0;i<8;i++){K.line([top[i],rim[i],belt[i],[0,-1.65,0]],'#7698aa',jewel,.45);K.line([top[i],top[(i+1)%8]],'#789bab',jewel,.45);}
 K.part('diamond-sample',msg('Diamond sample'),gem,'#c2dce6','specimens');
 const sheets=[];
 for(let level=0;level<3;level++){
   const g=K.group(nodes),b=K.group(bonds);g.position.set(5.5,4.3+level*1.35,-1);b.position.copy(g.position);const ps=[],ids=new Set();
   // Seven fused rings; every interior atom retains exactly three neighbours.
   const edge=1.16,centers=[[0,0]];for(let k=0;k<6;k++){const a=k*TAU/6;centers.push([Math.sqrt(3)*edge*Math.cos(a),Math.sqrt(3)*edge*Math.sin(a)]);}
   for(const center of centers)for(let k=0;k<6;k++){
     const a=Math.PI/6+k*TAU/6,v=[center[0]+edge*Math.cos(a),0,center[1]+edge*Math.sin(a)];const key=v.map(q=>Math.round(q*100)).join(',');if(!ids.has(key)){ids.add(key);ps.push(v);}
   }
   ps.forEach(v=>K.ball(v,.245,C.carbon,g));for(let i=0;i<ps.length;i++)for(let j=0;j<i;j++)if(Math.abs(V(ps[i]).distanceTo(V(ps[j]))-edge)<.025)K.rod(ps[i],ps[j],.095,'#91aab8',b);
   sheets.push({g,b,level});K.part('graphite-'+level,msg('Graphite sheets'),g,C.carbon,'carbon');K.part('graphite-bonds-'+level,msg('Covalent bonds'),b,'#91aab8','bonds');
 }
 const flakes=K.group(specimens);flakes.position.set(5.5,.35,4.6);
 const rnd=random(81),edge=[[-2.9,-.65],[-2.1,-1.3],[-.5,-1.5],[.1,-1.15],[1.7,-1.4],[2.85,-.5],[2.45,.6],[1.4,1.25],[.3,1.05],[-1.4,1.5],[-2.5,.75]];
 const flakePieces=[];for(let i=0;i<16;i++){
   const shape=new THREE.Shape();edge.forEach(([x,z],j)=>{const f=.91+.16*rnd();j?shape.lineTo(x*f,z*f):shape.moveTo(x*f,z*f)});shape.closePath();
   const geo=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.018,bevelThickness:.015});geo.rotateX(Math.PI/2);
   const flake=K.mesh(geo,i%3===0?'#4b5b62':'#34444d',flakes,true,false,'metal');flake.position.set((rnd()-.5)*.6,i*.075,(rnd()-.5)*.22);flake.rotation.y=(rnd()-.5)*.1;flake.userData.offset=flake.position.x;flakePieces.push(flake);
   K.part('graphite-sample-'+i,msg('Graphite sample'),flake,i%3===0?'#4b5b62':'#34444d','specimens');
 }
 for(let i=0;i<27;i++){const z=-.78+i*.057,x=-1.95+(i%4)*.13;K.line([[x,.025,z],[1.7-(i%5)*.19,.025,z+.035]],i%3?'#53646c':'#687880',flakePieces[15],.36);}
 // Interrupted leaders distinguish microscope enlargement from physical connections.
 for(const x of [-5.5,5.5]){const guide=K.ctx.inkLine([[x,2.8,3.7],[x,3.5,2.4],[x,4.2,1.3]],{color:'#a2a59c',width:.7,dashed:true});specimens.add(guide);}
 K.label('diamond',msg('Diamond network'),msg('Four tetrahedral bond directions connect the interior of diamond.'),dn,[-1,3.5,0],'carbon');
 K.label('graphite',msg('Graphite sheets'),msg('Hexagonal sheets have weaker interactions between their layers.'),sheets[2].g,[1,1.1,0],'carbon');
 K.label('bonds',msg('Covalent bonds'),msg('Rods show which atoms are connected; real bonds are not sticks.'),db,[1.7,.3,2],'bonds');
 K.part('diamond',msg('Diamond network'),dn,C.carbon,'carbon');K.part('diamond-bonds',msg('Covalent bonds'),db,'#91aab8','bonds');
 return{title:msg('Two arrangements of carbon'),bounds:{min:[-10,0,-5.4],max:[10,10,7]},pose(t,e){const phase=t/5*TAU;
   sheets.forEach(({g,b,level})=>{g.position.y=b.position.y=4.3+level*(1.35+e*.95);g.position.x=b.position.x=5.5+(level-1)*(.45*Math.sin(phase)+e*.6);});
   flakePieces.forEach((flake,i)=>{flake.position.x=flake.userData.offset+(i-7.5)*.018*Math.sin(phase);flake.position.y=i*(.075+e*.025);});
   dn.position.x=db.position.x=-5.5-e*.6;
 }};
}
function light(K){
 const levels=K.layer('levels',msg('Energy levels'),msg('Height represents energy, not position in the atom'));
 const event=K.layer('transition',msg('State marker'),msg('The marker changes allowed energy state'));
 const photons=K.layer('light',msg('Emitted light'),msg('A pulse symbol carries the released energy away'));
 const apparatus=K.layer('apparatus',msg('Spectroscope'),msg('A source, slit and prism separate wavelengths onto a screen'));
 const hardware=K.group(apparatus),chart=K.group(apparatus);
 function box(p,size,color,parent=hardware){const o=K.mesh(new THREE.BoxGeometry(...size),color,parent,true);o.position.set(...p);return o;}
 function cylinderX(p,r,len,color,parent=hardware){const o=K.mesh(new THREE.CylinderGeometry(r,r,len,48),color,parent,true,false,'metal');o.rotation.z=Math.PI/2;o.position.set(...p);return o;}
 function cable(points){const curve=new THREE.CatmullRomCurve3(points.map(V));return K.mesh(new THREE.TubeGeometry(curve,36,.065,8,false),'#3c454b',hardware,false);}
 // A restrained optical bench supplies the missing experimental context.
 box([0,.35,1],[19,.45,7.4],'#d5d4c8');
 for(const x of [-8,8])for(const z of [-1.6,3.6])K.disk([x,.12,z],.45,.22,C.dark,hardware,'metal');
 for(const z of [.25,2.8])K.rod([-8.5,.68,z],[8.4,.68,z],.1,'#a6a89b',hardware);
 // Cutaway discharge lamp: rear glass wall, electrodes, luminous gas column.
 K.disk([-7.6,1.05,1.5],.98,.6,C.dark,hardware,'metal');
 const glass=K.mesh(new THREE.CylinderGeometry(.65,.65,3.5,40,1,true,Math.PI/2,Math.PI),'#b7d8df',hardware,false);glass.position.set(-7.6,3.1,1.5);glass.material=K.ctx.ink({color:'#cce7e9',roughness:.19,clearcoat:.8,hatch:.08,side:THREE.DoubleSide});
 for(const y of [1.45,4.75])K.disk([-7.6,y,1.5],.74,.25,'#8b908d',hardware,'metal');
 const lamp=K.rod([-7.6,1.75,1.5],[-7.6,4.43,1.5],.19,'#dfaa77',photons);
 for(const y of [1.65,4.53])K.disk([-7.6,y,1.5],.34,.25,C.gold,hardware,'metal');
 cable([[-7.6,1.15,1.5],[-8.6,.85,2.4],[-8.6,.85,3.7],[-6.2,.85,3.8],[-6,.8,2.8]]);
 // Collimating tube with a narrow slit, a lens and a milled focusing collar.
 cylinderX([-4.8,3.1,1.5],.67,3.1,C.dark);
 for(const x of [-6.35,-4.95,-3.25])cylinderX([x,3.1,1.5],.76,.16,C.gold);
 for(let k=0;k<24;k++){const a=TAU*k/24;K.rod([-5.05,3.1+.77*Math.cos(a),1.5+.77*Math.sin(a)],[-4.85,3.1+.77*Math.cos(a),1.5+.77*Math.sin(a)],.022,'#8c7049',hardware);}
 const lens=cylinderX([-3.14,3.1,1.5],.57,.08,'#9ec7d3');lens.material=K.ctx.ink({color:'#b8dce8',roughness:.17,clearcoat:.7,hatch:.05});
 for(const x of [-5.7,-3.9]){K.rod([x,.72,1.5],[x,2.7,1.5],.16,'#9c9b8c',hardware);K.disk([x,.83,1.5],.66,.16,C.dark,hardware);}
 // A triangular dispersing prism, drawn as a solid cut crystal rather than a glow.
 const prismShape=new THREE.Shape();prismShape.moveTo(-1.15,-.95);prismShape.lineTo(1.3,-.95);prismShape.lineTo(0,1.35);prismShape.closePath();
 const prismGeo=new THREE.ExtrudeGeometry(prismShape,{depth:2.6,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.055,bevelThickness:.055});prismGeo.rotateX(-Math.PI/2);
 const prism=K.mesh(prismGeo,'#b6d4df',hardware,true);prism.position.set(0,1.8,1.5);prism.rotation.y=Math.PI;prism.material=K.ctx.ink({color:'#b6d9e7',roughness:.15,clearcoat:.75,hatch:.045,crossHatch:0,reflect:.35,transparent:true});prism.material.opacityNode=float(.47);
 K.disk([0,1.35,1.5],1.65,.25,C.dark,hardware,'metal');K.rod([0,.75,1.5],[0,1.25,1.5],.3,C.gold,hardware);
 // The screen records many emission events. Rays are possible paths, not a split photon.
 const screen=box([6.5,3.3,-2.1],[6.2,4.55,.25],C.dark),border=K.group(hardware);
 for(const y of [1.03,5.58])K.rod([3.35,y,-1.95],[9.65,y,-1.95],.06,C.gold,border);
 for(const x of [3.35,9.65])K.rod([x,1.03,-1.95],[x,5.58,-1.95],.06,C.gold,border);
 K.rod([6.5,.75,-2.1],[6.5,1,-2.1],.23,'#9c9b8c',hardware);K.disk([6.5,.8,-2.1],.8,.2,C.dark,hardware);
 const spectrum=[['#bd6754',8.45],['#d3ac5b',6.45],['#6a9fb7',4.45]],paths=[];
 spectrum.forEach(([color,x],i)=>{
   const stripe=box([x,3.3,-1.95],[.11,2.9,.05],color,photons);stripe.material=K.ctx.flat({color});
   for(const dx of [-.08,.08]){const edge=box([x+dx,3.3,-1.955],[.025,2.9,.045],color,photons);edge.material=K.ctx.flat({color});}
   const path=[[.5,3.1,1.5],[x,3.3,-1.86]];paths.push(path);K.line(path,color,photons,.8);
 });
 K.line([[-3.08,3.1,1.5],[-1.1,3.1,1.5]],'#c99f60',photons,1.15);
 // Separate energy chart: its vertical axis is energy, not an electron's location.
 const panel=box([-6.4,7.65,-3.2],[6.7,5.4,.18],C.ivory,chart);
 const chartLines=K.group(levels);for(const y of [5.8,7.5,9.6])K.rod([-9.1,y,-3.02],[-3.8,y,-3.02],.065,C.neutron,chartLines);
 K.rod([-9.55,5.25,-3.02],[-9.55,10.05,-3.02],.045,'#7f969f',chartLines);
 const arrow=K.mesh(new THREE.ConeGeometry(.14,.35,12),'#7f969f',chartLines,false);arrow.position.set(-9.55,10.2,-3.02);
 const marker=K.ball([-6.6,9.6,-2.85],.29,C.proton,event);marker.material=K.ctx.ink({color:C.proton,clearcoat:.4,hatch:.1});
 for(const g of [chart,chartLines,event])g.traverse(o=>{o.userData.castShadow=false;o.userData.receiveShadow=false;});
 K.rod([-4.45,9.36,-2.87],[-4.45,7.9,-2.87],.045,C.gold,event);const down=K.mesh(new THREE.ConeGeometry(.15,.32,12),C.gold,event,false);down.rotation.z=Math.PI;down.position.set(-4.45,7.75,-2.87);
 const pulse=K.group(photons);const wave=[];for(let i=0;i<=32;i++){const x=i/32*1.55;wave.push([x,.2*Math.sin(x*TAU*1.4),0]);}for(let i=1;i<wave.length;i++)K.rod(wave[i-1],wave[i],.045,'#c47c51',pulse);
 const source=V([-3.05,3.1,1.5]),prismPoint=V([.5,3.1,1.5]),target=V(paths[0][1]),dir=target.clone().sub(prismPoint).normalize();
 K.label('levels',msg('Energy levels'),msg('The bars stand for allowed energies, not spatial shelves.'),chartLines,[-8.1,8.35,-3.02],'levels');
 K.label('transition',msg('Transition'),msg('The marker represents the atom’s energy state, not an electron trajectory.'),marker,[0,.45,0],'transition');
 K.label('photon',msg('Emitted light'),msg('A pulse follows one path; the spectrum collects many emissions.'),photons,[2.2,3.8,.2],'light');
 K.part('levels',msg('Energy levels'),chartLines,C.neutron,'levels');K.part('marker',msg('State marker'),event,C.proton,'transition');K.part('light',msg('Emitted light'),pulse,'#c47c51','light');K.part('lamp',msg('Light source'),lamp,'#dfaa77','light');
 K.part('energy-chart',msg('Energy chart'),panel,C.ivory,'apparatus');K.part('prism',msg('Prism'),prism,'#b6d4df','apparatus');K.part('screen',msg('Spectrum screen'),screen,C.dark,'apparatus');
 return{title:msg('An atom emits light'),bounds:{min:[-10,0,-4],max:[10,11.3,5]},pose(t,e){const q=((t%5)+5)%5/5,emitted=q>=.24&&q<.83;
   marker.position.y=q<.24||q>=.9?9.6:7.5;event.position.z=e*.6;levels.position.z=-e*.5;chart.position.z=-e*.5;
   pulse.visible=emitted;const u=Math.max(0,Math.min(1,(q-.24)/.59));
   if(u<.42){pulse.position.copy(source).lerp(prismPoint,u/.42);pulse.rotation.set(0,0,0);}else{pulse.position.copy(prismPoint).lerp(target,(u-.42)/.58);pulse.rotation.set(0,-Math.atan2(dir.z,dir.x),0);}
   prism.position.y=1.8+e*1.8;lens.position.x=-3.14+e*.8;
 }};
}
const BUILD={cloud,isotopes,water,states,carbon,light};
export const ATOM_SCENES=Object.keys(BUILD);
export function createFigure(params={},ctx){const name=params.scene??'cloud';if(!BUILD[name])throw new Error(`Unknown atom scene ${name}`);const K=kit(ctx),spec=BUILD[name](K);K.root.name=`atom-${name}`;let amount=0,last=0;spec.pose(0,0);
 return{root:K.root,title:spec.title,duration:FIGURE_DURATION,layers:K.layers,labels:K.labels,parts:K.parts,bounds:spec.bounds,
 update(t,dt,state){last=t;amount=state?.explode??amount;spec.pose(t,amount)},setExplode(a){amount=Math.min(1,Math.max(0,a));spec.pose(last,amount)},setLayer(id,on){const g=K.groups.get(id);if(g)g.visible=!!on},dispose(){K.dispose()}};
}
