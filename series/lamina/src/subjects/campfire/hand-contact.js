import * as THREE from 'three/webgpu';

// A posed cloth surface, sampled only when the seated stance changes. Keeping
// this separate from the illustration avoids a fixed-height "resting" hand
// disappearing inside a knee on higher ground.
export function createHandContact(rig, side='r') {
  const cloth=rig.meshes.find(m=>m.name==='trousers'),body=rig.body;
  const handBones=new Set();
  body.skeleton.bones.forEach((bone,i)=>{
    for(let p=bone;p?.isBone;p=p.parent)if(p.name===`hand_${side}`){handBones.add(i);break;}
  });
  const si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight;
  const handVertices=[...new Set(body.geometry.index.array)].filter(i=>{
    let weight=0;for(let k=0;k<4;k++)if(handBones.has(si.getComponent(i,k)))weight+=sw.getComponent(i,k);
    return weight>.35;
  });
  const cell=.035,grid=new Map(),rootInverse=new THREE.Matrix4();
  const key=(x,z)=>`${Math.floor(x/cell)},${Math.floor(z/cell)}`;
  const localVertex=(mesh,i,out)=>mesh.getVertexPosition(i,out).applyMatrix4(mesh.matrixWorld).applyMatrix4(rootInverse);
  function prepare(){
    rig.updateWorld();rootInverse.copy(rig.root.matrixWorld).invert();grid.clear();
    const index=cloth.geometry.index,positions=new Map();
    for(const i of index.array)if(!positions.has(i))positions.set(i,localVertex(cloth,i,new THREE.Vector3()));
    for(let i=0;i<index.count;i+=3){
      const a=positions.get(index.getX(i)),b=positions.get(index.getX(i+1)),c=positions.get(index.getX(i+2));
      const determinant=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
      if(Math.abs(determinant)<1e-10)continue;
      const triangle={a,b,c,determinant};
      const x0=Math.floor(Math.min(a.x,b.x,c.x)/cell),x1=Math.floor(Math.max(a.x,b.x,c.x)/cell);
      const z0=Math.floor(Math.min(a.z,b.z,c.z)/cell),z1=Math.floor(Math.max(a.z,b.z,c.z)/cell);
      for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
        const id=`${x},${z}`;if(!grid.has(id))grid.set(id,[]);grid.get(id).push(triangle);
      }
    }
  }
  function height(x,z){
    let top=-Infinity;
    for(const{a,b,c,determinant}of grid.get(key(x,z))??[]){
      const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/determinant;
      const v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/determinant,w=1-u-v;
      if(Math.min(u,v,w)>=-1e-7)top=Math.max(top,u*a.y+v*b.y+w*c.y);
    }
    return top;
  }
  function normal(x,z){
    const d=.012,h=height(x,z),sample=(x,z)=>{const y=height(x,z);return Number.isFinite(y)?y:h;};
    return new THREE.Vector3(-(sample(x+d,z)-sample(x-d,z))/(2*d),1,-(sample(x,z+d)-sample(x,z-d))/(2*d)).normalize();
  }
  function clearance(){
    rig.updateWorld();rootInverse.copy(rig.root.matrixWorld).invert();
    let minimum=Infinity;const p=new THREE.Vector3();
    for(const i of handVertices){localVertex(body,i,p);const top=height(p.x,p.z);if(Number.isFinite(top))minimum=Math.min(minimum,p.y-top);}
    return minimum;
  }
  return {prepare,height,normal,clearance};
}
