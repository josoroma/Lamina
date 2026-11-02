import * as THREE from 'three/webgpu';
import { color as nodeColor, mx_noise_float, positionLocal, normalLocal, vec3, mix, smoothstep } from 'three/tsl';
export const TAU=Math.PI*2;
export class Model {
  constructor(ctx,poses){this.ctx=ctx;this.poses=poses;this.materials=new Map();}
  material(color,flat=false,roughness=.8){
    const key=[color,flat,roughness].join();
    if(!this.materials.has(key)){
      const base=new THREE.Color(color);let colorNode=null;
      const wood=['#75513b','#352d2b','#b99a70','#514134','#694833','#312722'].includes(color);
      const skin=['#bb805d','#ad7454','#cf9872','#c08a64'].includes(color);
      const sea=['#13314a','#1d455c','#31657a','#4b8390'].includes(color);
      const sand=color==='#bda47a';
      const atom=['#3b3633','#b74937'].includes(color);
      const flame=['#d76322','#ef962e','#f3be59'].includes(color);
      if(wood){const grain=mx_noise_float(positionLocal.mul(vec3(.7,13,13))).mul(.5).add(.5);colorNode=mix(nodeColor(base.clone().multiplyScalar(.68)),nodeColor(base.clone().multiplyScalar(1.13)),grain);}
      if(atom){const tone=normalLocal.dot(vec3(.3,.7,.5)).mul(.4).add(.6);colorNode=mix(nodeColor(base.clone().multiplyScalar(.67)),nodeColor(base.clone().multiplyScalar(1.12)),tone);roughness=.3;}
      if(skin){const warm=normalLocal.dot(vec3(.35,.25,.9)).mul(.5).add(.5);colorNode=mix(nodeColor(base.clone().lerp(new THREE.Color('#536b7c'),.22)),nodeColor(base.clone().lerp(new THREE.Color('#efb775'),.16)),warm);}
      if(sand){const fine=mx_noise_float(positionLocal.mul(17)).mul(.5).add(.5),broad=mx_noise_float(positionLocal.mul(.9)).mul(.5).add(.5);colorNode=mix(nodeColor('#ad9062'),nodeColor('#d2bd92'),fine.mul(.34).add(broad.mul(.4)));}
      if(sea){const crest=smoothstep(.2,.8,positionLocal.y);const ripple=mx_noise_float(positionLocal.mul(vec3(.7,4,9))).mul(.12);colorNode=mix(nodeColor(base),nodeColor('#83b4bd'),crest.mul(.18).add(ripple));roughness=.36;}
      const material=flat?this.ctx.flat({color}):this.ctx.ink({color,colorNode,svgColor:color,roughness,hatch:flame?0:skin?.08:.13,emissiveNode:flame?nodeColor(base).mul(.72):undefined,sheen:['#526875','#ab6357'].includes(color)?.12:0});
      if(['#b5afa4','#c7c1b6'].includes(color)){material.transparent=true;material.depthWrite=false;material.opacityNode=material.opacityNode.mul(.16);}
      if(color==='#d76322'){material.transparent=true;material.depthWrite=false;material.opacityNode=material.opacityNode.mul(.68);}
      this.materials.set(key,material);
    }return this.materials.get(key);
  }

  mesh(g,color,parent,pos=[0,0,0],flat=false){const m=new THREE.Mesh(g,this.material(color,flat));m.position.set(...pos);parent.add(m);if(flat||['#d76322','#ef962e','#f3be59','#b5afa4','#c7c1b6'].includes(color)){m.userData.castShadow=false;m.userData.receiveShadow=false;}return m;}
  ellipsoid(parent,pos,scale,color,flat=false,segments=24){const g=new THREE.SphereGeometry(1,segments,16);g.scale(...scale);return this.mesh(g,color,parent,pos,flat);}
  group(parent,pos=[0,0,0]){const g=new THREE.Group();g.position.set(...pos);parent.add(g);return g;}
  line(parent,points,r,color,flat=false,segments=32){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return this.mesh(new THREE.TubeGeometry(c,segments,r,7,false),color,parent,[0,0,0],flat);}
  // A changing elliptical cross-section swept along a centreline. Flesh,
  // folded cloth, driftwood and flame all have authored silhouettes.
  sweep(parent,points,radii,color,{radial=16,steps=30,flat=false,ruffle=0}={}){
    const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),frames=c.computeFrenetFrames(steps,false),p=[],ix=[];
    for(let j=0;j<=steps;j++){const u=j/steps,at=c.getPoint(u),k=u*(radii.length-1),lo=Math.floor(k),v=k-lo,r0=radii[lo],r1=radii[Math.min(lo+1,radii.length-1)];for(let i=0;i<=radial;i++){const a=i/radial*TAU,rx=r0[0]+(r1[0]-r0[0])*v,ry=r0[1]+(r1[1]-r0[1])*v,noise=1+ruffle*(Math.sin(a*7+j*.8)+.35*Math.sin(a*13-j*.6));const q=at.clone().addScaledVector(frames.normals[j],Math.cos(a)*rx*noise).addScaledVector(frames.binormals[j],Math.sin(a)*ry*noise);p.push(q.x,q.y,q.z);if(j<steps&&i<radial){const n=j*(radial+1)+i;ix.push(n,n+1,n+radial+1,n+1,n+radial+2,n+radial+1);}}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return this.mesh(g,color,parent,[0,0,0],flat);
  }
  // Profiles [height, half-width, half-depth, depth-centre] with smooth
  // interpolation make continuous jaw, shoulder and waist contours.
  profile(parent,rows,color,{segments=40,steps=40,fold=0}={}){
    const c=new THREE.CatmullRomCurve3(rows.map(r=>new THREE.Vector3(r[1],r[2],r[3]??0))),p=[],ix=[];
    for(let j=0;j<=steps;j++){const u=j/steps,v=c.getPoint(u),y=rows[0][0]+u*(rows.at(-1)[0]-rows[0][0]);for(let i=0;i<=segments;i++){const a=i/segments*TAU,d=1+fold*Math.sin(a*8+u*12)*Math.sin(Math.PI*u);p.push(Math.cos(a)*Math.max(.002,v.x)*d,y,Math.sin(a)*Math.max(.002,v.y)*d+v.z);if(j<steps&&i<segments){const k=j*(segments+1)+i;ix.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return this.mesh(g,color,parent);
  }
  polygon(parent,pts,color){const s=new THREE.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));s.closePath();return this.mesh(new THREE.ShapeGeometry(s),color,parent);}
}
