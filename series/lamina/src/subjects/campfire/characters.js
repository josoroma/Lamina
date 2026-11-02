import * as THREE from 'three/webgpu';
import { createPersonRig } from './character-rig.js';
import { createAccessories } from './accessories.js';
import { createHandContact } from './hand-contact.js';

const V=(a)=>new THREE.Vector3(...a), TAU=Math.PI*2;

/** Seated, continuous human anatomy. Every pose is reconstructed from time. */
export function character(M,parent,{position=[0,0,0],yaw=0,child=false,footHeight,groundHeight}={}) {
  const role=child?'daughter':'father',g=M.group(parent,position);
  g.name=`campfire-${role}`;g.rotation.y=yaw;g.scale.setScalar(5);
  // Explicit print pigments keep pale fabric distinct from skin when the
  // vector exporter reduces a richly textured person to colour separations.
  g.userData.characterPalette=(child
    ? ['#e8c5b0','#674532','#a7b6aa','#657a90','#d3ddd9','#252f2e','#3b777a','#e5e0d6']
    : ['#d4b197','#493629','#4f6872','#3c4b52','#685f50','#151515','#252f2e','#e5e0d6'])
    .map(color=>({color,keepSmall:true}));
  const rig=createPersonRig(M,{child});g.add(rig.root);
  const {bones}=rig;
  rig.headFrame.name=`${role}-head`;
  const accessories=createAccessories(M,rig.headFrame,{child,
    headDimensions:rig.dimensions.accessoryHead??{width:child?.154:.174,height:child?.2:.24,depth:child?.166:.196},
    position:rig.dimensions.accessoryOffset??[0,child?.05:.055,child?-.003:-.005]});
  g.userData.headFrame=rig.headFrame;
  const inverse=new THREE.Matrix4(),relative=new THREE.Matrix4();
  const point=(name)=>{
    const p=bones.get(name).getWorldPosition(new THREE.Vector3());
    inverse.copy(rig.root.matrixWorld).invert();return p.applyMatrix4(inverse);
  };
  const orientation=(object)=>{
    object.updateWorldMatrix(true,false);inverse.copy(rig.root.matrixWorld).invert();
    relative.multiplyMatrices(inverse,object.matrixWorld);
    const q=new THREE.Quaternion();relative.decompose(new THREE.Vector3(),q,new THREE.Vector3());return q;
  };
  const setOrientation=(name,q)=>{
    const b=bones.get(name),parentQ=orientation(b.parent);
    b.quaternion.copy(parentQ.invert().multiply(q));
  };
  const turn=(name,axis,angle)=>setOrientation(name,
    new THREE.Quaternion().setFromAxisAngle(V(axis),angle).multiply(orientation(bones.get(name))));
  const aim=(name,end,direction)=>{
    const from=point(end).sub(point(name)).normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(from,direction.clone().normalize());
    setOrientation(name,q.multiply(orientation(bones.get(name))));
  };
  const move=(name,target)=>{
    const b=bones.get(name);b.parent.updateWorldMatrix(true,false);
    const local=new THREE.Matrix4().multiplyMatrices(rig.root.matrixWorld.clone().invert(),b.parent.matrixWorld).invert();
    b.position.copy(target.clone().applyMatrix4(local));
  };
  // Two-bone inverse kinematics keeps elbows and knees joined while the
  // pelvis stays on the log and both feet stay planted in the sand.
  const limb=(first,middle,last,target,pole)=>{
    const mechanics=first.startsWith('upperarm_')&&rig.armMechanics.get(first.slice(-1));
    if(mechanics){mechanics.solve(target,pole);return;}
    const start=point(first),a=point(middle).distanceTo(start),b=point(last).distanceTo(point(middle));
    const delta=target.clone().sub(start),d=THREE.MathUtils.clamp(delta.length(),Math.abs(a-b)+.001,a+b-.002),axis=delta.normalize();
    const bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
    const along=(a*a+d*d-b*b)/(2*d),h=Math.sqrt(Math.max(0,a*a-along*along));
    const elbow=start.clone().addScaledVector(axis,along).addScaledVector(bend,h);
    const reachable=start.clone().addScaledVector(axis,d);
    aim(first,middle,elbow.clone().sub(start));aim(middle,last,reachable.sub(point(middle)));
  };
  const footRest=Object.fromEntries(['l','r'].map(side=>[side,orientation(bones.get(`foot_${side}`))]));
  // Fit each sole to the sand beneath it instead of assigning both ankles
  // one height. The support points are the actual bottom tread vertices.
  const soleSupports=Object.fromEntries(['l','r'].map(side=>{
    const mesh=rig.meshes.find(m=>m.name==='trek-rubber'),points=[];
    if(mesh){
      const p=mesh.geometry.attributes.position,ix=mesh.geometry.attributes.skinIndex;
      const boneIndex=mesh.skeleton.bones.indexOf(bones.get(`foot_${side}`));
      let bottom=Infinity;
      for(let i=0;i<p.count;i++)if(ix.getX(i)===boneIndex)bottom=Math.min(bottom,p.getY(i));
      const seen=new Set(),origin=V(rig.dimensions.worldJoints[`foot_${side}`]);
      for(let i=0;i<p.count;i++)if(ix.getX(i)===boneIndex&&p.getY(i)<bottom+.003){
        const v=new THREE.Vector3().fromBufferAttribute(p,i),key=v.toArray().map(n=>n.toFixed(4)).join(',');
        if(!seen.has(key)){seen.add(key);points.push(v.sub(origin));}
      }
    }
    return [side,points];
  }));
  let contactMatrix='',contacts;
  function footContacts(){
    if(!groundHeight)return null;
    g.updateMatrix();const key=g.matrix.elements.join(',');if(key===contactMatrix)return contacts;
    contactMatrix=key;contacts={};
    const inverse=g.matrix.clone().invert(),step=.12;
    for(const[side,sign]of[['l',1],['r',-1]]){
      const target=V([sign*(child?.11:.16),0,child?.33:.43]);
      const centre=target.clone().applyMatrix4(g.matrix);
      const normal=V([-(groundHeight(centre.x+step,centre.z)-groundHeight(centre.x-step,centre.z))/(2*step),1,
        -(groundHeight(centre.x,centre.z+step)-groundHeight(centre.x,centre.z-step))/(2*step)]).normalize().transformDirection(inverse);
      const tilt=new THREE.Quaternion().setFromUnitVectors(V([0,1,0]),normal);
      let height=-Infinity;
      for(const support of soleSupports[side]){
        const sample=support.clone().applyQuaternion(tilt).add(target).applyMatrix4(g.matrix);
        height=Math.max(height,(groundHeight(sample.x,sample.z)+.008-sample.y)/g.scale.y);
      }
      target.y=Number.isFinite(height)?height:footHeight??(child?.065:.075);
      contacts[side]={target,orientation:tilt.multiply(footRest[side])};
    }
    return contacts;
  }
  function hand(side,direction,palm,curl,pointing=0,openGesture=false) {
    const name=`hand_${side}`,axis=direction.clone().normalize();
    aim(name,`middle_01_${side}`,axis);
    const wanted=palm.clone().addScaledVector(axis,-palm.dot(axis)).normalize();
    const palmRoll=()=>{
      const across=point(`index_01_${side}`).sub(point(`pinky_01_${side}`));
      const normal=new THREE.Vector3().crossVectors(axis,across).multiplyScalar(side==='l'?1:-1).normalize();
      return Math.atan2(axis.dot(new THREE.Vector3().crossVectors(normal,wanted)),normal.dot(wanted));
    };
    // Spread the daughter's palm rotation along the forearm, after the elbow
    // hinge. Rotating the entire lowerarm at its origin pinched the elbow ring.
    // The hand supplies only the small remaining roll at the wrist.
    const forearmAxis=point(name).sub(point(`lowerarm_${side}`)).normalize();
    const mechanics=rig.armMechanics.get(side);
    if(mechanics)mechanics.twist(palmRoll()*.85);
    else turn(`lowerarm_${side}`,forearmAxis.toArray(),palmRoll()*.85);
    aim(name,`middle_01_${side}`,axis);
    turn(name,axis.toArray(),palmRoll());
    const relaxed=child&&side==='l';
    for(const [finger,offset,spread] of [['index',0,relaxed?-.08:-.05],['middle',.025,0],['ring',.05,relaxed?-.10:-.06],['pinky',.08,relaxed?-.18:-.11]]) {
      // The bind hand already has a soft resting curve. A speaking gesture
      // needs only a little extra flexion, especially at the distal joints.
      const amount=finger==='index'?THREE.MathUtils.lerp(curl,openGesture?.035:.08,pointing):curl+offset*(openGesture?.3:1);
      for(let j=1;j<=3;j++) {
        const name=`${finger}_0${j}_${side}`,bone=bones.get(name),axes=rig.handAxes.get(name);
        if(j===1)bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axes.spread,spread));
        bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axes.flex,amount*(openGesture?[.65,.55,.3]:[.7,.86,.48])[j-1]));
      }
    }
    for(let j=1;j<=3;j++) {
      const name=`thumb_0${j}_${side}`,bone=bones.get(name),axes=rig.handAxes.get(name);
      if(j===1)bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axes.oppose,.055+curl*.05));
      bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axes.flex,[.035,.10,.07][j-1]));
    }
  }
  const hipY=child?.355:.445;
  const support=createHandContact(rig),supportArm=[];
  for(const[name,bone]of bones)for(let p=bone;p?.isBone;p=p.parent)if(p.name==='upperarm_r'){supportArm.push([name,bone]);break;}
  let supportKey='',supportPose;
  function restingHand(){
    const hip=point('thigh_r'),knee=point('calf_r');
    const key=[...hip.toArray(),...knee.toArray()].map(n=>n.toFixed(6)).join(',');
    const place=()=>{
      for(const[name,bone]of supportArm)bone.quaternion.copy(rig.restBones.get(name).quaternion);
      limb('upperarm_r','lowerarm_r','hand_r',supportPose.target,V([-1,-.35,0]));
      hand('r',supportPose.direction,supportPose.palm,child?.16:.08);
    };
    if(key!==supportKey){
      supportKey=key;support.prepare();
      const target=hip.clone().lerp(knee,.64);target.x-=child?.010:.014;
      const top=support.height(target.x,target.z),normal=Number.isFinite(top)?support.normal(target.x,target.z):V([0,1,0]);
      target.y=Number.isFinite(top)?top+.018:knee.y+.065;
      const direction=knee.clone().sub(hip);direction.addScaledVector(normal,-direction.dot(normal)).normalize();
      supportPose={target,direction,palm:normal.negate()};
      // Fit the complete palm and all five digits, not just the wrist. The
      // closest skin rests a millimetre above the actual deformed fabric.
      for(let i=0;i<5;i++){
        place();const clearance=support.clearance();
        if(!Number.isFinite(clearance)||Math.abs(clearance-.0015)<.0003)break;
        target.y+=.0015-clearance;
      }
      place();
    }else place();
  }
  function pose(t) {
    const q=TAU*t/5,reply=(.5-.5*Math.cos(q))**1.5,interest=1-reply;
    rig.resetPose();move('pelvis',V([0,hipY,0]));
    turn('spine_01',[1,0,0],child?.09:.055);
    turn('spine_02',[0,0,1],child?-.025:.018);
    const feet=footContacts();
    for(const [side,sign] of [['l',1],['r',-1]]) {
      limb(`thigh_${side}`,`calf_${side}`,`foot_${side}`,
        feet?.[side].target??V([sign*(child?.11:.16),footHeight??(child?.065:.075),child?.33:.43]),V([sign*.12,.05,1]));
      setOrientation(`foot_${side}`,feet?.[side].orientation??footRest[side]);
    }
    const shoulder=point('upperarm_l');
    // A genuine supporting contact, recomputed when terrain changes stance.
    restingHand();
    const active=child?interest:reply;
    if(child){
      // Keep the upper arm beside the ribs, with the elbow below the shoulder.
      // The quiet palm-up gesture sits over her lap and continues the forearm;
      // it does not turn toward the reader as a sustained stop signal.
      rig.armMechanics.get('l').solve(
        V([.067,shoulder.y-.191+interest*.012,.207]),V([.30,-1,-.15]));
      const direction=point('hand_l').sub(point('lowerarm_l')).normalize()
        .lerp(V([-.49,-.12,.87]).normalize(),.05).normalize();
      hand('l',direction,V([0,1,-.2]),.14+.02*interest,0,true);
    }else{
      limb('upperarm_l','lowerarm_l','hand_l',V([.32,shoulder.y-.13+reply*.035,.32]),V([1,-.8,-.1]));
      const direction=point('hand_l').sub(point('lowerarm_l')).normalize()
        .lerp(V([.1,.18+active*.08,1]).normalize(),.45).normalize();
      hand('l',direction,V([-.25,1,.12]),.06+.035*reply,0,true);
    }
    turn('neck_01',[0,1,0],(child?-1:1)*(.07+active*.06));
    turn('head',[0,1,0],(child?-1:1)*(.12+active*.1));
    turn('head',[1,0,0],.04+Math.sin(q)*.025);
    turn('head',[0,0,1],child?.03+.025*interest:-.015);
    rig.setMorph('exp_mouthSmileLeft',child?.44+.08*interest:.28+.08*reply);
    rig.setMorph('exp_mouthSmileRight',child?.40+.08*interest:.30+.06*reply);
    rig.setMorph('exp_browInnerUp',child?.13+.10*interest:.06);
    rig.setMorph('exp_browOuterUpLeft',child?.10:.025);
    rig.setMorph('exp_cheekSquintLeft',.045);rig.setMorph('exp_cheekSquintRight',.045);
    rig.setMorph('exp_jawOpen',active*(.035+.035*Math.sin(q*3)**2));
    rig.setMorph(child?'look_left':'look_right',.08+active*.06);
    rig.setMorph('look_down',.06*(1-active));
    const blinkAt=child?3.8:1.0,delta=Math.abs(t-blinkAt),pulse=delta<.115?Math.cos(Math.PI*delta/.23)**2:0;
    const blink=child?.055+.945*pulse:pulse;
    rig.setMorph('blink_left',blink);rig.setMorph('blink_right',blink);
    accessories.update(t);rig.updateWorld();
    // Export computes a tight posed box. It must not clip picking when the
    // next conversational pose moves outside that particular export frame.
    for(const mesh of rig.meshes) if(mesh.isSkinnedMesh) mesh.boundingBox=null;
  }
  pose(0);M.poses.push(pose);
  // Conservative local sphere for picking; skinning performs exact triangle hits.
  for(const mesh of rig.meshes) if(mesh.isSkinnedMesh) {
    mesh.boundingSphere=new THREE.Sphere(V([0,.65,.15]),1.5);mesh.boundingBox=null;
  }
  return {root:g,head:rig.headFrame,body:rig.body};
}
