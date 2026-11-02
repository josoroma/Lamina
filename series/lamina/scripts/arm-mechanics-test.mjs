#!/usr/bin/env node
// Mechanical regressions on the licensed source mesh. No renderer, texture,
// network or visual-quality assertion: this protects bind pose and joints.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three/webgpu';
import {installArmMechanics} from '../src/subjects/campfire/arm-mechanics.js';

const file=readFileSync(new URL('../public/assets/characters/human-base.glb',import.meta.url));
const jsonLength=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+jsonLength).toString());
const binary=file.subarray(28+jsonLength);
function accessor(id) {
  const a=gltf.accessors[id],view=gltf.bufferViews[a.bufferView];
  const size={SCALAR:1,VEC3:3,VEC4:4,MAT4:16}[a.type];
  const bytes={5121:1,5123:2,5126:4}[a.componentType];
  assert(size&&bytes&&!a.sparse&&!a.normalized,'Fixture decoder expects plain source attributes');
  const result=new Float32Array(a.count*size),stride=view.byteStride||size*bytes,start=(view.byteOffset||0)+(a.byteOffset||0);
  for(let i=0;i<a.count;i++)for(let k=0;k<size;k++) {
    const offset=start+i*stride+k*bytes;
    result[i*size+k]=a.componentType===5126?binary.readFloatLE(offset):a.componentType===5123?binary.readUInt16LE(offset):binary.readUInt8(offset);
  }
  return {array:result,size};
}
const source=gltf.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
for(const [name,id]of Object.entries({position:source.attributes.POSITION,skinIndex:source.attributes.JOINTS_0,skinWeight:source.attributes.WEIGHTS_0})) {
  const a=accessor(id);geometry.setAttribute(name,new THREE.BufferAttribute(name==='skinIndex'?new Uint16Array(a.array):a.array,a.size));
}
geometry.setIndex(Array.from(accessor(source.indices).array));
const joints=new Set(gltf.skins[0].joints),bodyIndex=gltf.nodes.findIndex(n=>n.name==='Body');
const nodes=gltf.nodes.map((n,i)=>{
  const o=i===bodyIndex?new THREE.SkinnedMesh(geometry,new THREE.MeshBasicNodeMaterial()):joints.has(i)?new THREE.Bone():new THREE.Group();
  o.name=n.name||'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;
});
gltf.nodes.forEach((n,i)=>n.children?.forEach(j=>nodes[i].add(nodes[j])));
const root=new THREE.Group();gltf.scenes[gltf.scene].nodes.forEach(i=>root.add(nodes[i]));root.updateMatrixWorld(true);
const body=nodes[bodyIndex],skeleton=new THREE.Skeleton(gltf.skins[0].joints.map(i=>nodes[i]));body.bind(skeleton);
const second=new THREE.SkinnedMesh(geometry.clone(),new THREE.MeshBasicNodeMaterial());body.parent.add(second);second.bind(skeleton,body.bindMatrix);
const meshes=[body,second],bones=new Map(skeleton.bones.map(b=>[b.name,b]));
const originalIndices=geometry.attributes.skinIndex.array.slice(),originalWeights=geometry.attributes.skinWeight.array.slice();
const originalNames=skeleton.bones.map(b=>b.name),positions=geometry.attributes.position;
const refresh=()=>{root.updateMatrixWorld(true);skeleton.update();};refresh();
const rest=Array.from({length:positions.count},(_,i)=>body.getVertexPosition(i,new THREE.Vector3()));
const mechanics=new Map(['l','r'].map(side=>[side,installArmMechanics({root,body,meshes,bones,side})]));refresh();
assert.equal(skeleton.bones.length,57,'Append exactly two twist stages per arm, once per shared skeleton');
let bindError=0,untouched=0;
for(let i=0;i<positions.count;i++) {
  bindError=Math.max(bindError,body.getVertexPosition(i,new THREE.Vector3()).distanceTo(rest[i]));
  const affected=[0,1,2,3].some(k=>/^lowerarm_[lr]$/.test(originalNames[originalIndices[i*4+k]])&&originalWeights[i*4+k]>0);
  if(!affected){untouched++;for(let k=0;k<4;k++){assert.equal(geometry.attributes.skinIndex.getComponent(i,k),originalIndices[i*4+k]);assert.equal(geometry.attributes.skinWeight.getComponent(i,k),originalWeights[i*4+k]);}}
  let sum=0;for(let k=0;k<4;k++){assert(geometry.attributes.skinIndex.getComponent(i,k)<skeleton.bones.length);sum+=geometry.attributes.skinWeight.getComponent(i,k);}
  assert(Math.abs(sum-1)<1e-5,'Keep normalized skin weights');
}
assert(bindError<1e-6,`Twist installation must not move rest geometry (${bindError})`);
for(const side of ['l','r']) {
  const helper=mechanics.get(side),point=n=>bones.get(`${n}_${side}`).getWorldPosition(new THREE.Vector3());
  const shoulder=point('upperarm'),elbowRest=point('lowerarm'),wristRest=point('hand'),axis=wristRest.clone().sub(elbowRest).normalize();
  const fixed=[];
  for(let i=0;i<positions.count;i++) {
    const weight=[0,1,2,3].reduce((sum,k)=>sum+(originalNames[originalIndices[i*4+k]]===`lowerarm_${side}`?originalWeights[i*4+k]:0),0);
    if(weight>.5&&rest[i].clone().sub(elbowRest).dot(axis)/helper.lowerLength<.16)fixed.push(i);
  }
  assert(fixed.length>10,'Exercise the actual proximal elbow ring');
  const elbow=shoulder.clone().add(new THREE.Vector3(0,-helper.upperLength,0));
  const target=elbow.clone().add(new THREE.Vector3(0,0,helper.lowerLength));
  helper.solve(target,new THREE.Vector3(0,-1,0));refresh();
  assert(point('lowerarm').distanceTo(elbow)<1e-5,'Solve the requested elbow hinge position');
  assert(point('hand').distanceTo(target)<1e-5,'Solve the requested wrist position');
  const before=fixed.map(i=>body.getVertexPosition(i,new THREE.Vector3())),wrist=point('hand');
  for(const angle of [-Math.PI/2,Math.PI/2,0]) {
    helper.twist(angle);refresh();
    assert(point('hand').distanceTo(wrist)<1e-5,'Axial twist must not displace the wrist target');
    for(let j=0;j<fixed.length;j++)assert(body.getVertexPosition(fixed[j],new THREE.Vector3()).distanceTo(before[j])<1e-6,'Pronation must leave the proximal elbow ring on its hinge');
  }
}
console.log(`Arm mechanics passed: ${positions.count} source vertices, bind error ${bindError.toExponential(2)}, ${untouched} unaffected vertices, both 90° hinges and ±90° twist.`);
