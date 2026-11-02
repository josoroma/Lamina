import * as THREE from 'three/webgpu';
import { TAU } from './model.js';

export function driftwood(M,parent,pos=[0,1,0],yaw=0,len=8,charred=false,radius=.9){
 const g=M.group(parent,pos);g.rotation.y=yaw;
 M.sweep(g,[[-len/2,0,0],[-len*.2,.09,.05],[len*.17,-.02,-.07],[len/2,.05,.02]],[[radius*.8,radius*.85],[radius,radius*.97],[radius*.94,radius*.9],[radius*.72,radius*.8]],charred?'#352d2b':'#75513b',{radial:30,steps:42,ruffle:.07});
 for(const s of [-1,1]){
  const end=M.ellipsoid(g,[s*len*.5,s===1?.05:0,.02],[.045,radius*.73,radius*.75],charred?'#514134':'#b99a70');
  for(let k=1;k<7;k++){const pts=[];for(let j=0;j<=48;j++){const a=j/48*TAU,r=radius*(.08+k*.1)*(1+.055*Math.sin(a*5+k));pts.push([s*(len*.5+.049),Math.cos(a)*r+.025,Math.sin(a)*r+.02]);}M.line(g,pts,.012,charred?'#261f1d':'#866549',false,48);}
  for(let k=0;k<3;k++){const a=k*2.4+.5;M.line(g,[[s*(len*.5+.052),Math.cos(a)*radius*.23,Math.sin(a)*radius*.23],[s*(len*.5+.054),Math.cos(a+.1)*radius*.72,Math.sin(a+.1)*radius*.72]],.022,'#3c3029',false,12);}
 }
 for(let i=0;i<23;i++){const a=i/23*TAU,pts=[];for(let j=0;j<8;j++){const x=-len*.46+j*len*.92/7,r=radius*(.82+.14*Math.sin(j/7*Math.PI));pts.push([x,Math.cos(a+.035*Math.sin(j*1.3+i))*r+.03,Math.sin(a+.035*Math.sin(j*1.3+i))*r]);}M.line(g,pts,.02+(i%4)*.007,charred?(i%3?'#221d1b':'#6e5740'):(i%3?'#4e382b':'#9a7751'),false,28);}
 // A broken branch and a bark knot interrupt the cylindrical silhouette.
 M.sweep(g,[[len*.18,.6*radius,-.25],[len*.25,radius*1.2,-.5],[len*.31,radius*1.4,-.65]],[[.25,.24],[.18,.16],[.04,.04]],charred?'#312722':'#694833',{radial:14,steps:14,ruffle:.07});
 return g;
}

export function flames(M,parent,pos=[0,1.3,0],size=1){
 const g=M.group(parent,pos);g.scale.setScalar(size);
 // Preserve the authored hot-gas colours in printable plates. Automatic
 // pigment merging can mistake a narrow orange tongue for neighbouring rock.
 g.userData.printPalette=['#ef962e','#f3be59','#ffe6a2'].map(color=>({color,keepSmall:true}));
 // Each tongue has depth, a changing cross-section and an independent curl.
 for(let i=0;i<8;i++){
  const a=i*2.399,x=Math.cos(a)*.62,z=Math.sin(a)*.55,h=3.5+(i%3)*.65;
  const tongue=M.sweep(g,[[x,0,z],[x+.35*Math.sin(i),h*.23,z+.1],[x-.32,h*.52,z+.26],[x+.4*Math.cos(i),h*.78,z-.12],[x+.65*Math.sin(i+1),h,z+.1]],[[.43,.35],[.57,.4],[.33,.27],[.16,.12],[.005,.005]],i%3===0?'#d76322':i%3===1?'#ef962e':'#f3be59',{radial:18,steps:32,ruffle:.09});
  M.poses.push(t=>{const q=TAU*t/5;tongue.scale.set(1+.07*Math.sin(q*2+i),1+.11*Math.sin(q*3+i*1.8),1+.09*Math.cos(q*2+i));tongue.rotation.y=.06*Math.sin(q*2+i);});
 }
 for(let i=0;i<3;i++)M.sweep(g,[[Math.sin(i*2)*.4,.1,.4],[Math.sin(i*2+.8)*.45,.9,.35],[Math.sin(i*2+1)*.3,2,.25]],[[.28,.23],[.28,.2],[.002,.002]],'#ffe6a2',{flat:true,radial:14,steps:20});
 return g;
}

export function firepit(M,parent,pos=[0,0,0],size=1,{smoke=true}={}){
 const g=M.group(parent,pos);g.scale.setScalar(size);
 // Eight source pigments cover ash, stone, char, bark, end grain and flame.
 // These are export swatches only; the live materials retain their detail.
 g.userData.printPalette=['#5b5146','#81776a','#352d2b','#75513b','#b99a70',
   '#ef962e','#f3be59','#ffe6a2'].map(color=>({color,keepSmall:true}));
 M.ellipsoid(g,[0,.07,0],[2.4,.12,2.05],'#5b5146');
 for(let i=0;i<11;i++){const a=i/11*TAU,r=2.65+.15*Math.sin(i*4);const rock=M.ellipsoid(g,[Math.cos(a)*r,.28,Math.sin(a)*r],[.42+(i%3)*.08,.3,.37],'#81776a',false,16);rock.rotation.set(.2*Math.sin(i),i,.1*Math.cos(i));}
 driftwood(M,g,[-.1,.6,.15],.43,4.6,true,.48);driftwood(M,g,[.1,.8,-.1],-.6,4.7,false,.48);driftwood(M,g,[.1,.9,0],1.2,4.2,true,.35);
 for(let i=0;i<20;i++){const a=i*2.4,r=.4+(i%5)*.33;const coal=M.ellipsoid(g,[Math.cos(a)*r,.3,Math.sin(a)*r],[.2,.14,.17],i%4===0?'#f6c05d':i%3===0?'#bd4b20':'#4a3326',i%4===0,12);}
 flames(M,g,[0,.9,0],.9);
 if(smoke){for(let i=0;i<4;i++){const s=M.sweep(g,[[.2*i,4,.1],[.1+i*.2,5.4,-.3],[.8+i*.12,6.5,.1],[1.4+i*.1,7.4,-.2]],[[.1,.12],[.28,.21],[.36,.25],[.005,.005]],i%2?'#b5afa4':'#c7c1b6',{radial:8,steps:28});s.userData.noOcclude=true;s.userData.castShadow=false;M.poses.push(t=>{s.rotation.y=.1*Math.sin(TAU*t/5+i);s.scale.x=1+.15*Math.sin(TAU*t/5+i);});}}
 return g;
}

// Height of the authored sand surface, used to seat roots on the actual land.
export function shoreHeightAt(x,z){
 const a=Math.atan2((z-2)/6.5,x/10.5),edge=1+.055*Math.sin(a*3)+.025*Math.cos(a*7);
 const r=Math.hypot(x/10.5,(z-2)/6.5)/edge;
 return .12+.58*(1-r*r)+.15*Math.sin(x*.45+z*.3)*Math.sin(r*Math.PI)+.06*Math.sin(x*2+z);
}

export function coast(M,parent){
 const sand=M.group(parent);
 const p=[],ix=[],R=60,N=18;
 for(let j=0;j<=N;j++){const r=j/N;for(let i=0;i<=R;i++){const a=i/R*TAU,edge=1+.055*Math.sin(a*3)+.025*Math.cos(a*7);const x=Math.cos(a)*10.5*r*edge,z=2+Math.sin(a)*6.5*r*edge;const y=.12+.58*(1-r*r)+.15*Math.sin(x*.45+z*.3)*Math.sin(r*Math.PI)+.06*Math.sin(x*2+z);p.push(x,y,z);if(j<N&&i<R){const k=j*(R+1)+i;ix.push(k,k+1,k+R+1,k+1,k+R+2,k+R+1);}}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();M.mesh(geo,'#bda47a',sand);
 // A continuous low rim closes the cutaway without a ring of toy pebbles.
 const rim=[];for(let i=0;i<=90;i++){const a=i/90*TAU,edge=1+.055*Math.sin(a*3)+.025*Math.cos(a*7);rim.push([Math.cos(a)*10.5*edge,.13,2+Math.sin(a)*6.5*edge]);}M.line(sand,rim,.085,'#b89d71',false,110);
 for(let i=0;i<75;i++){const x=-9+((i*73)%180)/10,z=-3+((i*41)%105)/10;if(x*x/100+(z-2)*(z-2)/40>.85)continue;M.ellipsoid(sand,[x,shoreHeightAt(x,z)+.018,z],[.025+(i%3)*.018,.025,.04],i%4?'#a68d65':'#d5c29e',false,8);}
 const sea=M.group(parent);
 // Three curved sheets have real changing crests and deep, scalloped edges.
 for(let k=0;k<4;k++){
  const positions=[],inds=[],nx=48,nz=12;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const v=j/nz,edge=.88+.12*Math.sin(v*Math.PI)+.035*Math.sin(v*9+k),x=(-10.5+i/nx*21)*edge,z=-8+k*.9+v*1.8+.48*Math.cos(x*.24)+.12*Math.sin(x*.8+k),y=.18+Math.sin(v*Math.PI)**3*(.48+k*.12)+.08*Math.sin(x*.64+k);positions.push(x,y,z);if(i<nx&&j<nz){const n=j*(nx+1)+i;inds.push(n,n+nx+1,n+1,n+1,n+nx+1,n+nx+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(inds);g.computeVertexNormals();const w=M.mesh(g,['#13314a','#1d455c','#31657a','#4b8390'][k],sea);const rest=Float32Array.from(g.attributes.position.array);
  M.poses.push(t=>{const q=TAU*t/5;for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const n=(j*(nx+1)+i)*3,xx=rest[n];g.attributes.position.setY(n/3,rest[n+1]+.1*Math.sin(xx*.6-q+k)*Math.sin(j/nz*Math.PI));}g.attributes.position.needsUpdate=true;g.computeVertexNormals();});
  if(k>1){const pts=[];for(let i=0;i<46;i++){const x=-10.3+i*.46;pts.push([x,.22,-6.35+k*.9+.48*Math.cos(x*.24)+.12*Math.sin(x*.8+k)]);}const foam=M.line(sea,pts,.05,k===3?'#d3d5bd':'#a5b6ae',false,70);M.poses.push(t=>{foam.position.z=.12*Math.sin(TAU*t/5+k);foam.position.y=.04*Math.cos(TAU*t/5+k);});}
 }
 return {sand,sea};
}
