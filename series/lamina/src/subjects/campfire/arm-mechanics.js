import * as THREE from 'three/webgpu';

// A hinge at the elbow and distributed pronation along the forearm have
// different jobs. The source game rig has only one lowerarm bone; rotating
// that bone axially also rotates the elbow's blended skin ring.
export function installArmMechanics({root,body,meshes,bones,side='l'}) {
  const V=THREE.Vector3,Q=THREE.Quaternion;
  const upper=bones.get(`upperarm_${side}`),lower=bones.get(`lowerarm_${side}`),hand=bones.get(`hand_${side}`);
  root.updateWorldMatrix(true,true);
  const point=bone=>root.worldToLocal(bone.getWorldPosition(new V()));
  const orientation=object=>{
    object.updateWorldMatrix(true,false);
    const m=new THREE.Matrix4().multiplyMatrices(root.matrixWorld.clone().invert(),object.matrixWorld);
    return new Q().setFromRotationMatrix(m.extractRotation(m));
  };
  const shoulderRest=point(upper),elbowRest=point(lower),wristRest=point(hand);
  const u=elbowRest.clone().sub(shoulderRest),f=wristRest.clone().sub(elbowRest),upperLength=u.length(),lowerLength=f.length();
  u.normalize();f.normalize();
  const hinge=u.clone().cross(f).normalize();
  const frame=(axis,along)=>new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(axis,along,axis.clone().cross(along).normalize()));
  const restUpperFrame=frame(hinge,u),restLowerFrame=frame(hinge,f);
  const restUpper=orientation(upper),restLower=orientation(lower);
  const twistAxis=hand.position.clone().normalize();

  const mid=new THREE.Bone(),distal=new THREE.Bone();
  mid.name=`lowerarm_twist_mid_${side}`;distal.name=`lowerarm_twist_distal_${side}`;
  lower.add(mid);mid.add(distal);distal.add(hand);
  bones.set(mid.name,mid);bones.set(distal.name,distal);
  root.updateWorldMatrix(true,true);
  const skeletons=new Set(meshes.filter(m=>m.isSkinnedMesh).map(m=>m.skeleton));
  for(const skeleton of skeletons) {
    skeleton.bones.push(mid,distal);
    // SkeletonUtils shares inverse arrays; this instance owns its new bind.
    skeleton.boneInverses=[];skeleton.calculateInverses();skeleton.init();
  }
  // Only existing lowerarm influence is redistributed. Upperarm, hand and
  // digit weights stay unchanged; the proximal16% never receives axial roll.
  for(const mesh of meshes) {
    if(!mesh.isSkinnedMesh)continue;
    const g=mesh.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,p=g.attributes.position;
    const lowerIndex=mesh.skeleton.bones.indexOf(lower),midIndex=mesh.skeleton.bones.indexOf(mid),distalIndex=mesh.skeleton.bones.indexOf(distal);
    for(let i=0;i<p.count;i++) {
      let lowerWeight=0;const weights=new Map();
      for(let k=0;k<4;k++){const id=si.getComponent(i,k),weight=sw.getComponent(i,k);if(id===lowerIndex)lowerWeight+=weight;else if(weight)weights.set(id,(weights.get(id)||0)+weight);}
      if(!lowerWeight)continue;
      const position=new V().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);root.worldToLocal(position);
      const along=position.sub(elbowRest).dot(f)/lowerLength;
      const t=THREE.MathUtils.smoothstep(along,.16,.92),a=t<=.5?lowerIndex:midIndex,b=t<=.5?midIndex:distalIndex,blend=t<=.5?2*t:2*t-1;
      for(const[id,w]of [[a,lowerWeight*(1-blend)],[b,lowerWeight*blend]])if(w)weights.set(id,(weights.get(id)||0)+w);
      const entries=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=entries.reduce((total,[,w])=>total+w,0);
      for(let k=0;k<4;k++){si.setComponent(i,k,entries[k]?.[0]||0);sw.setComponent(i,k,(entries[k]?.[1]||0)/sum);}
    }
    si.needsUpdate=true;sw.needsUpdate=true;
  }
  const setOrientation=(bone,desired)=>{
    const parent=orientation(bone.parent);
    bone.quaternion.copy(parent.invert().multiply(desired));bone.updateWorldMatrix(false,true);
  };
  function solve(target,pole) {
    mid.quaternion.identity();distal.quaternion.identity();
    const start=point(upper),delta=target.clone().sub(start);
    const distance=THREE.MathUtils.clamp(delta.length(),Math.abs(upperLength-lowerLength)+.001,upperLength+lowerLength-.002),axis=delta.normalize();
    const bend=pole.clone().addScaledVector(axis,-pole.dot(axis));
    if(bend.lengthSq()<1e-10)bend.copy(hinge).cross(axis);
    bend.normalize();
    const along=(upperLength*upperLength+distance*distance-lowerLength*lowerLength)/(2*distance);
    const height=Math.sqrt(Math.max(0,upperLength*upperLength-along*along));
    const elbow=start.clone().addScaledVector(axis,along).addScaledVector(bend,height),wrist=start.clone().addScaledVector(axis,distance);
    const upperDirection=elbow.clone().sub(start).normalize(),forearmDirection=wrist.clone().sub(elbow).normalize();
    const bendAxis=upperDirection.clone().cross(forearmDirection).normalize();
    setOrientation(upper,frame(bendAxis,upperDirection).multiply(restUpperFrame.clone().invert()).multiply(restUpper));
    setOrientation(lower,frame(bendAxis,forearmDirection).multiply(restLowerFrame.clone().invert()).multiply(restLower));
  }
  function twist(angle) {
    mid.quaternion.setFromAxisAngle(twistAxis,angle*.5);
    distal.quaternion.setFromAxisAngle(twistAxis,angle*.5);
    mid.updateWorldMatrix(false,true);
  }
  return {solve,twist,twistBones:[mid,distal],twistAxis,restHinge:hinge,upperLength,lowerLength};
}
