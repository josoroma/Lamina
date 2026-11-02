// Independent adapter for licensed CC0 MakeHuman mesh data. No upstream
// CharacterCreator runtime or generator code is included; see public assets.
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { color, texture, mix, vec3, float, attribute } from 'three/tsl';
import { createHikingBoots } from './hiking-boots.js';
import { installArmMechanics } from './arm-mechanics.js';

const ASSET = `${import.meta.env.BASE_URL}assets/characters/`;
const IDENTITIES = {
  father: { gender_male: 1, age_old: .12, muscle_min: .12, weight_min: .04,
    face_eye_size_incr: .025, face_nose_width_incr: .04, face_lips_incr: .06 },
  daughter: { gender_female: 1, age_child: .83, breast_cup_min: 1,
    muscle_min: .2, face_eye_size_incr: .015, face_jaw_width_decr: .1,
    face_nose_length_decr: .18, face_chin_decr: .2,face_cheekbones_decr: .08 },
};
const EXPRESSION_NAMES = new Set([
  'blink_left','blink_right','look_left','look_right','look_up','look_down',
  'exp_browInnerUp','exp_browOuterUpLeft','exp_browOuterUpRight',
  'exp_cheekSquintLeft','exp_cheekSquintRight',
  'exp_jawOpen','exp_mouthSmileLeft','exp_mouthSmileRight',
]);
let loading, templates;

function completeWeights(mesh, identity) {
  const result = { ...identity };
  for (const name of Object.keys(mesh.morphTargetDictionary || {})) {
    if (!name.startsWith('corr_')) continue;
    const [a,b] = name.slice(5).split('__');
    result[name] = (identity[a] || 0) * (identity[b] || 0);
  }
  return result;
}

function buildIdentity(source, jointData, identity) {
  const scene = cloneSkeleton(source);
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const original = mesh.geometry, geometry = original.clone();
    const dictionary = mesh.morphTargetDictionary || {};
    const weights = completeWeights(mesh, identity);
    for (const kind of ['position','normal']) {
      const initial = original.attributes[kind], targets = original.morphAttributes[kind];
      if (!initial) continue;
      const values = new Float32Array(initial.count * 3);
      for (let i=0; i<initial.count; i++) {
        let x=initial.getX(i), y=initial.getY(i), z=initial.getZ(i);
        for (const [name,weight] of Object.entries(weights)) {
          const delta=targets?.[dictionary[name]];
          if (!weight || !delta) continue;
          x+=delta.getX(i)*weight; y+=delta.getY(i)*weight; z+=delta.getZ(i)*weight;
        }
        if (kind==='normal') { const l=Math.hypot(x,y,z)||1; x/=l; y/=l; z/=l; }
        values.set([x,y,z],i*3);
      }
      geometry.setAttribute(kind,new THREE.BufferAttribute(values,3));
    }
    const keep=Object.keys(dictionary).filter(name=>EXPRESSION_NAMES.has(name));
    for (const kind of Object.keys(geometry.morphAttributes)) {
      geometry.morphAttributes[kind]=keep.map(name=>original.morphAttributes[kind][dictionary[name]]);
    }
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    mesh.geometry=geometry;mesh.updateMorphTargets();
    mesh.morphTargetDictionary=Object.fromEntries(keep.map((name,i)=>[name,i]));
    mesh.morphTargetInfluences=keep.map(()=>0);mesh.frustumCulled=false;
  });
  // Identity changes move the joint centres as well as the skin. Correctives
  // must participate here too, especially gender × childhood.
  const probe=source.getObjectByName('Body');
  const weights=completeWeights(probe,identity), destinations=new Map(), bones=[];
  scene.updateMatrixWorld(true);
  scene.traverse(bone=>{
    if (!bone.isBone) return;
    bones.push(bone);
    const target=bone.getWorldPosition(new THREE.Vector3());
    for (const [name,weight] of Object.entries(weights)) {
      const shift=jointData.morphs[name]?.[bone.name];
      if (shift && weight) target.addScaledVector(new THREE.Vector3(...shift),weight);
    }
    destinations.set(bone,target);
  });
  for (const bone of bones) {
    bone.parent.updateMatrixWorld(true);
    bone.position.copy(bone.parent.worldToLocal(destinations.get(bone).clone()));
    bone.updateMatrixWorld(true);
  }
  const skeletons=new Set();scene.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});
  // SkeletonUtils clones bones but intentionally shares inverse matrices.
  // Each identity needs its own array before recalculating its rest pose.
  for (const skeleton of skeletons) { skeleton.boneInverses=[];skeleton.calculateInverses(); }
  scene.updateMatrixWorld(true);
  return scene;
}

export async function loadCharacterTemplates() {
  if (templates) return templates;
  if (!loading) loading=(async()=>{
    const [gltf,joints]=await Promise.all([
      new GLTFLoader().loadAsync(`${ASSET}human-base.glb`),
      fetch(`${ASSET}body-joints.json`).then(r=>{if(!r.ok)throw Error('Character joints failed to load');return r.json();}),
    ]);
    templates={};
    for (const [name,identity] of Object.entries(IDENTITIES)) templates[name]=buildIdentity(gltf.scene,joints,identity);
    return templates;
  })();
  return loading;
}

function registerMaterial(M, material) {
  M.materials.set(`character-${material.uuid}`,material);
  return material;
}

// Digit joints have different bind orientations (and mirrored hands). Store
// their anatomical actions in joint-local space once, before any posing. The
// terminal joint has no child bone, so its own bind Y supplies the distal ray;
// reusing the preceding segment there adds an unwanted axial twist.
function anatomicalHandAxes(bones) {
  const result=new Map(),V=THREE.Vector3,Q=THREE.Quaternion;
  const point=name=>bones.get(name).getWorldPosition(new V());
  for(const side of ['l','r']) {
    const wrist=point(`hand_${side}`),middle=point(`middle_01_${side}`);
    const distal=middle.clone().sub(wrist).normalize();
    const radial=point(`index_01_${side}`).sub(point(`pinky_01_${side}`)).normalize();
    const palm=distal.clone().cross(radial).multiplyScalar(side==='l'?1:-1).normalize();
    for(const digit of ['index','middle','ring','pinky','thumb'])for(let joint=1;joint<=3;joint++) {
      const name=`${digit}_0${joint}_${side}`,bone=bones.get(name);
      const rotation=bone.getWorldQuaternion(new Q()),inverse=rotation.clone().invert();
      const direction=joint<3?point(`${digit}_0${joint+1}_${side}`).sub(point(name)).normalize():new V(0,1,0).applyQuaternion(rotation);
      // The thumb's nail/pad plane is oblique to the other four digits. Its
      // bind Z follows that plane; forcing it into the palm plane twists the
      // interphalangeal joint and turns the nail toward the wrong surface.
      const pad=digit==='thumb'?new V(0,0,1).applyQuaternion(rotation):palm;
      const flex=direction.clone().cross(pad).normalize();
      const away=digit==='middle'?radial.clone():point(`${digit}_01_${side}`).sub(middle);
      away.addScaledVector(palm,-away.dot(palm)).normalize();
      const spread=direction.clone().cross(away).normalize();
      const axes={flex:flex.applyQuaternion(inverse),spread:spread.applyQuaternion(inverse)};
      if(digit==='thumb') {
        // Opposition is a metacarpal action, separate from distal flexion:
        // bring the thumb toward the central fingers, slightly above the
        // palm. Use only at the first joint, in small expressive amounts.
        const toward=point(`middle_02_${side}`).sub(point(name));
        toward.addScaledVector(palm,toward.length()*.35);
        axes.oppose=direction.clone().cross(toward).normalize().applyQuaternion(inverse);
      }
      result.set(name,axes);
    }
  }
  return result;
}

function materialFor(M, original, child) {
  const name=original.name || '', skin=child?'#e8c5b0':'#d4b197';
  let base='#e7dfca', roughness=.55, colorNode;
  if (/Skin/i.test(name)) {
    base=skin;
    // Keep subtle pores and lip pigment from the source's neutral light
    // albedo; the character's complexion is selected independently.
    // The shared source is an adult skin scan. Quiet its coarse mottling on
    // the child while preserving the stronger rosy pigment of lips/palms.
    if(original.map) {
      const albedo=texture(original.map).rgb;
      const pigment=albedo.r.sub(albedo.g).smoothstep(.18,.32);
      const hand=child?attribute('characterHandDetail','float').smoothstep(.04,.9):float(0);
      const detail=child?mix(float(.34),float(.66),pigment.max(hand)):float(.66);
      colorNode=color(base).mul(mix(vec3(1),albedo.mul(1.15),detail));
    } else colorNode=color(base);
  } else if (/Eyebrow|Eyelash/i.test(name)) {
    base=child?'#71513b':'#332b27';
    colorNode=original.map?color(base).mul(child?mix(vec3(1),texture(original.map).rgb,.25):texture(original.map).rgb):color(base);
  } else if (/Iris/i.test(name)) {
    base=child?'#586b67':'#5e4935';roughness=.34;
    colorNode=original.map?texture(original.map).rgb.mul(color(base)).mul(1.4):color(base);
  } else if (/Eye/i.test(name)) {
    base='#e5e0d6';roughness=.4;
    colorNode=color(base);
  } else if (/Tongue/i.test(name)) {
    base='#874b48';colorNode=original.map?texture(original.map).rgb.mul(color(base)):color(base);
  } else if (/Teeth/i.test(name)) {
    base='#d4ccba';colorNode=original.map?texture(original.map).rgb.mul(color(base)):color(base);
  }
  const mat=M.ctx.ink({color:base,colorNode,svgColor:base,metalness:0,roughness,
    clearcoat:0,reflect:.35,hatch:0,crossHatch:0,side:THREE.DoubleSide});
  mat.name=`Portrait ${name}`;
  if(/Skin/i.test(name))mat.userData.exportColorNode=color(base);
  if (/Skin/i.test(name) && original.normalMap) {
    mat.normalMap=original.normalMap;const detail=child?.08:.18;mat.normalScale=new THREE.Vector2(detail,detail);
  }
  if (/Eyebrow|Eyelash/i.test(name) && original.map) {
    mat.opacityNode=texture(original.map).a;mat.alphaTest=child?.42:.25;
  }
  if (/Cornea/i.test(name)) {
    mat.transparent=true;mat.opacityNode=float(.055);mat.depthWrite=false;mat.roughness=.12;
  }
  return registerMaterial(M,mat);
}

// Clothing keeps the source's excellent joint weights, but gets its own
// relaxed surface and sewn edge loops. Welded adjacency also removes the
// visible UV-seam creases that a raw triangle mask would otherwise produce.
function clipGarment(g,keep) {
  const attributes=g.attributes,source=g.index.array,verts=[],triangles=[];
  const read=i=>({p:new THREE.Vector3().fromBufferAttribute(attributes.position,i),n:new THREE.Vector3().fromBufferAttribute(attributes.normal,i),uv:attributes.uv?[attributes.uv.getX(i),attributes.uv.getY(i)]:[0,0],weights:new Map(Array.from({length:4},(_,k)=>[attributes.skinIndex.getComponent(i,k),attributes.skinWeight.getComponent(i,k)]))});
  const blend=(a,b,t)=>{
    const weights=new Map();for(const[id,w]of a.weights)weights.set(id,w*(1-t));for(const[id,w]of b.weights)weights.set(id,(weights.get(id)||0)+w*t);
    return{p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.map((v,i)=>v+(b.uv[i]-v)*t),weights};
  };
  for(let i=0;i<source.length;i+=3) {
    let polygon=[read(source[i]),read(source[i+1]),read(source[i+2])];
    for(const cut of keep) {
      const next=[];
      for(let j=0;j<polygon.length;j++) {
        const a=polygon[j],b=polygon[(j+1)%polygon.length],da=cut(a.p,a),db=cut(b.p,b);
        if(da>=0)next.push(a);
        if((da>=0)!==(db>=0))next.push(blend(a,b,da/(da-db)));
      }
      polygon=next;if(!polygon.length)break;
    }
    if(polygon.length<3)continue;
    const base=verts.length;verts.push(...polygon);
    for(let j=1;j<polygon.length-1;j++)triangles.push(base,base+j,base+j+1);
  }
  const position=[],normal=[],uv=[],si=[],sw=[];
  for(const v of verts) {
    position.push(...v.p.toArray());normal.push(...v.n.toArray());uv.push(...v.uv);
    const w=[...v.weights].filter(([,weight])=>weight>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=w.reduce((s,[,v])=>s+v,0)||1;
    for(let k=0;k<4;k++){si.push(w[k]?.[0]||0);sw.push((w[k]?.[1]||0)/sum);}
  }
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(position,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));result.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));result.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));result.setIndex(triangles);return result;
}

function finishGarment(g,kind,{waist,neck,hips,shoulder,elbow,child,sourcePositions,clipped=false}) {
  const p=g.attributes.position,lookup=new Map(),groups=[],ids=new Map(),edges=new Map();
  for(const i of g.index.array) {
    if(ids.has(i))continue;
    const key=[sourcePositions.getX(i),sourcePositions.getY(i),sourcePositions.getZ(i)].map(v=>Math.round(v*100000)).join(',');
    let id=lookup.get(key);
    if(id===undefined){id=groups.length;lookup.set(key,id);groups.push({vertices:[],p:new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)),neighbors:new Set()});}
    groups[id].vertices.push(i);ids.set(i,id);
  }
  const index=g.index.array;
  for(let i=0;i<index.length;i+=3)for(let k=0;k<3;k++) {
    const a=ids.get(index[i+k]),b=ids.get(index[i+(k+1)%3]);if(a===b)continue;
    groups[a].neighbors.add(b);groups[b].neighbors.add(a);
    const key=a<b?`${a},${b}`:`${b},${a}`;edges.set(key,(edges.get(key)||0)+1);
  }
  const boundary=new Set();for(const[key,n]of edges)if(n===1)key.split(',').forEach(i=>boundary.add(+i));
  const boundaryKind=new Map(),unseen=new Set(boundary);
  while(unseen.size) {
    const stack=[unseen.values().next().value],component=[],centre=new THREE.Vector3();
    while(stack.length) {
      const i=stack.pop();if(!unseen.delete(i))continue;component.push(i);centre.add(groups[i].p);
      for(const j of groups[i].neighbors)if(boundary.has(j)&&unseen.has(j))stack.push(j);
    }
    centre.divideScalar(component.length);
    const cut=centre.y<waist+.09?'hem':Math.abs(centre.x)>shoulder.x*.75?'sleeve':'collar';
    for(const i of component)boundaryKind.set(i,cut);
  }
  // Paired smoothing steps relax contours without progressively shrinking
  // the garment into a painted-on anatomical surface.
  for(let pass=0;pass<16;pass++) {
    const lambda=pass%2 ? -.53 : .5;
    const next=groups.map((v,i)=>{
      if(boundary.has(i)||!v.neighbors.size)return v.p.clone();
      const mean=new THREE.Vector3();for(const j of v.neighbors)mean.add(groups[j].p);mean.divideScalar(v.neighbors.size);
      return v.p.clone().lerp(mean,lambda);
    });
    next.forEach((v,i)=>groups[i].p.copy(v));
  }
  const armAxis=elbow.clone().sub(shoulder),armLength=armAxis.length();armAxis.normalize();
  for(const id of boundary) {
    const v=groups[id].p;
    if(kind==='shirt'&&!clipped) {
      if(boundaryKind.get(id)==='hem') v.y=waist-.014;
      else if(boundaryKind.get(id)==='sleeve') {
        const q=new THREE.Vector3(Math.abs(v.x),v.y,v.z),d=q.clone().sub(shoulder).dot(armAxis);
        q.addScaledVector(armAxis,.52*armLength-d);v.set(Math.sign(v.x)*q.x,q.y,q.z);
      } else {
        // A continuous crew-neck with a slightly lower front edge.
        const front=Math.max(0,Math.min(1,(v.z+.035)/.12));v.y=neck-.018-front*.026;
      }
    } else if(kind==='trousers'&&!clipped) {
      if(v.y>hips-.04)v.y=waist+.018;
      else if(v.y<hips*.22)v.y=child?.07:.085;
    }
  }
  // The source's diagonal triangles become a smooth stitched opening rather
  // than a saw-toothed outline. Only loop neighbours participate here.
  for(let pass=0;pass<6;pass++) {
    const next=new Map();
    for(const id of boundary) {
      const group=groups[id],neighbors=[...group.neighbors].filter(i=>boundary.has(i));
      if(neighbors.length!==2)continue;
      const mean=groups[neighbors[0]].p.clone().add(groups[neighbors[1]].p).multiplyScalar(.5);
      next.set(id,group.p.clone().lerp(mean,.32));
    }
    for(const[id,v]of next)groups[id].p.copy(v);
  }
  for(const group of groups)for(const i of group.vertices)p.setXYZ(i,group.p.x,group.p.y,group.p.z);
  // Snapping a diagonal triangle with all three points on the cut would
  // make it degenerate in rest pose, then skinning could resurrect it as a
  // floating triangular shard. Remove those discarded edge slivers.
  const clean=[];
  for(let i=0;i<index.length;i+=3) {
    const a=index[i],b=index[i+1],c=index[i+2];
    if(!clipped&&boundary.has(ids.get(a))&&boundary.has(ids.get(b))&&boundary.has(ids.get(c)))continue;
    clean.push(a,b,c);
  }
  g.setIndex(clean);
  g.computeVertexNormals();
  const n=g.attributes.normal;
  for(const group of groups){const average=new THREE.Vector3();for(const i of group.vertices)average.add(new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)));average.normalize();for(const i of group.vertices)n.setXYZ(i,average.x,average.y,average.z);}
  g.computeBoundingBox();g.computeBoundingSphere();
}


function wardrobe(M, body, bones, child) {
  const geometry=body.geometry, positions=geometry.attributes.position,
    indices=geometry.index, skin=geometry.attributes.skinIndex, weights=geometry.attributes.skinWeight;
  const joint=name=>bones.get(name).getWorldPosition(new THREE.Vector3());
  const hips=joint('pelvis').y, neck=joint('neck_01').y,
    shoulder=joint('upperarm_l'), elbow=joint('lowerarm_l');
  const waist=hips+(neck-hips)*.2;
  const sets={skin:[],shirt:[],trousers:[],shoes:[]};
  function zone(a,b,c) {
    const q=new THREE.Vector3(), influence=new Map();
    for (const i of [a,b,c]) {
      q.x+=positions.getX(i)/3;q.y+=positions.getY(i)/3;q.z+=positions.getZ(i)/3;
      for(let k=0;k<4;k++) {
        const name=body.skeleton.bones[skin.getComponent(i,k)]?.name || '';
        influence.set(name,(influence.get(name)||0)+weights.getComponent(i,k)/3);
      }
    }
    const sum=predicate=>[...influence].reduce((v,[name,w])=>v+(predicate(name)?w:0),0);
    const fingers=sum(n=>/hand|index|middle|ring|pinky|thumb/.test(n));
    if (fingers>.12) return 'skin';
    const legs=sum(n=>/thigh|calf|foot|ball/.test(n));
    if (legs>.16) {
      const foot=sum(n=>/foot|ball/.test(n));
      return foot>.35?'shoes':'trousers';
    }
    const arms=sum(n=>/upperarm|lowerarm/.test(n));
    if (arms>.12) {
      const v=new THREE.Vector3(Math.abs(q.x),q.y,q.z).sub(shoulder), axis=elbow.clone().sub(shoulder);
      const u=v.dot(axis)/axis.lengthSq();
      return u<.72?'shirt':'skin';
    }
    if (q.y<waist) return 'trousers';
    // A broad, modest crew-neck opening; no triangle from the lower face is
    // borrowed for the garment. Its actual edge follows the torso topology.
    const collar=neck+.045;
    return q.y<collar?'shirt':'skin';
  }
  for(let i=0;i<indices.count;i+=3) {
    const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);
    sets[zone(a,b,c)].push(a,b,c);
    const y=(positions.getY(a)+positions.getY(b)+positions.getY(c))/3,x=(positions.getX(a)+positions.getX(b)+positions.getX(c))/3;
    // A real overlap at the waistband stays covered while the torso leans.
    if(zone(a,b,c)==='shirt'&&y<waist+.03)sets.trousers.push(a,b,c);
    if(zone(a,b,c)==='shoes'&&y>(child?.055:.075))sets.trousers.push(a,b,c);
    if(y>neck-.105&&Math.abs(x)<shoulder.x*.7&&zone(a,b,c)==='shirt')sets.skin.push(a,b,c);
    else if(zone(a,b,c)==='shirt'&&Math.abs(x)>shoulder.x*.7) {
      const z=(positions.getZ(a)+positions.getZ(b)+positions.getZ(c))/3,axis=elbow.clone().sub(shoulder);
      const along=new THREE.Vector3(Math.abs(x),y,z).sub(shoulder).dot(axis)/axis.lengthSq();
      if(along>.44&&[a,b,c].some(i=>Array.from({length:4},(_,k)=>/upperarm|lowerarm/.test(body.skeleton.bones[skin.getComponent(i,k)]?.name||'')&&weights.getComponent(i,k)>.05).some(Boolean)))sets.skin.push(a,b,c);
    }
  }
  // The fabric edge overlaps two rows of continuous skin at the neck and
  // arms, just as real clothing does; a cutout edge must never reveal a
  // triangular gap when the relaxed garment moves away from its body.
  const underlap=new Set(sets.skin),extra=[];
  for(let pass=0;pass<2;pass++) {
    const next=[];
    for(let i=0;i<sets.shirt.length;i+=3) {
      const tri=sets.shirt.slice(i,i+3);
      if(tri.some(v=>underlap.has(v))&&!tri.every(v=>underlap.has(v)))next.push(...tri);
    }
    for(const v of next)underlap.add(v);extra.push(...next);
  }
  sets.skin.push(...extra);
  // The original skin weights blend the shoulder into the pectoral region.
  // Those torso triangles must remain removed even if an edge-neighbour
  // expansion reached them: they can cross a relaxed shirt during a gesture.
  const safeSkin=[];
  for(let i=0;i<sets.skin.length;i+=3) {
    const tri=sets.skin.slice(i,i+3),[a,b,c]=tri;
    if(zone(a,b,c)==='shirt') {
      const q=new THREE.Vector3();for(const j of tri)q.add(new THREE.Vector3(positions.getX(j),positions.getY(j),positions.getZ(j)).multiplyScalar(1/3));
      if(q.y<neck-.105) {
        const axis=elbow.clone().sub(shoulder),along=new THREE.Vector3(Math.abs(q.x),q.y,q.z).sub(shoulder).dot(axis)/axis.lengthSq();
        if(along<.44||Math.abs(q.x)<shoulder.x*.95)continue;
      }
    }
    safeSkin.push(...tri);
  }
  sets.skin=safeSkin;
  const clothes=[];
  for(const [kind,col] of [['shirt',child?'#a7b6aa':'#4f6872'],['trousers',child?'#657a90':'#3c4b52']]) {
    let g=geometry.clone();g.setIndex(sets[kind]);
    const p=g.attributes.position,n=g.attributes.normal;
    const ease=kind==='shirt'?(child?.022:.018):kind==='trousers'?.014:.011;
    for(let i=0;i<p.count;i++) {
      let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      // Relaxed fabric bridges small anatomical relief and has independent
      // volume, while sharing the actual elbow, hip and knee skinning.
      const neckFit=kind==='shirt'?Math.max(0,Math.min(1,(y-(neck-.07))/.06)):0;
      const actualEase=ease*(1-neckFit)+.005*neckFit;
      x+=n.getX(i)*actualEase;y+=n.getY(i)*actualEase;z+=n.getZ(i)*actualEase;
      if(kind==='shirt') {
        const centre=Math.abs(x)<shoulder.x*.94,mid=y>waist-.03&&y<neck-.075;
        if(centre&&mid) {
          x*=child?1.12:1.08;
          const width=shoulder.x*(child?1.2:1.06),round=Math.sqrt(Math.max(0,1-(x/width)**2));
          z=z>0?.028+round*(child?.083:.113):-.015-round*(child?.071:.094);
        }
      }
      if(kind==='trousers'&&y>hips-.13&&Math.abs(x)<(child?.1:.14)&&z>0)z=Math.max(z,child?.105:.13);
      if(kind==='shoes') y=Math.max(y,.008);
      p.setXYZ(i,x,y,z);
    }
    if(kind==='shirt') {
      const axis=elbow.clone().sub(shoulder),length=axis.length();axis.normalize();
      const armBones=new Set(body.skeleton.bones.map((b,i)=>/upperarm|lowerarm/.test(b.name)?i:-1));
      const old=g;g=clipGarment(g,[p=>p.y-(waist-.014),p=>neck+.012-.10*(p.z+.015)-p.y,
        (p,v)=>Math.max(.12-[...v.weights].reduce((sum,[id,w])=>sum+(armBones.has(id)?w:0),0),.52*length-new THREE.Vector3(Math.abs(p.x),p.y,p.z).sub(shoulder).dot(axis))]);old.dispose();
    } else if(kind==='trousers') {
      const old=g;g=clipGarment(g,[p=>waist+.025-p.y,p=>p.y-(child?.075:.095)]);old.dispose();
    }
    finishGarment(g,kind,{waist,neck,hips,shoulder,elbow,child,sourcePositions:g.attributes.position,clipped:true});
    const mat=registerMaterial(M,M.ctx.ink({color:col,svgColor:col,roughness:.86,metalness:0,hatch:0,crossHatch:0,side:THREE.DoubleSide}));
    mat.name=`Clothing ${kind}`;
    const item=new THREE.SkinnedMesh(g,mat);item.name=kind;
    item.bind(body.skeleton,body.bindMatrix);
    if(g.morphAttributes.position?.length){item.morphTargetDictionary={...body.morphTargetDictionary};item.morphTargetInfluences=body.morphTargetInfluences;}item.frustumCulled=false;
    body.parent.add(item);clothes.push(item);
  }
  // Removed skin triangles prevent dark intersections and exposed anatomy
  // through a bent shirt or trousers. Clothing remains fully opaque.
  geometry.setIndex(sets.skin);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  clothes.push(...createHikingBoots(M,body,bones,child));
  return clothes;
}

export function createPersonRig(M,{child=false}={}) {
  if(!templates)throw Error('Await loadCharacterTemplates() before building people');
  const scene=cloneSkeleton(templates[child?'daughter':'father']),root=new THREE.Group();root.add(scene);
  const bones=new Map(),meshes=[];
  scene.traverse(o=>{
    if(o.isBone)bones.set(o.name,o);
    if(!o.isMesh)return;
    o.geometry=o.geometry.clone();o.frustumCulled=false;
    if(child&&o.name==='Body') {
      // Preserve the palm's flexion creases and nail contrast without
      // restoring the adult scan's mottling across the child's face. Bone
      // weights provide a continuous wrist transition that follows skinning.
      const si=o.geometry.attributes.skinIndex,sw=o.geometry.attributes.skinWeight;
      const detail=new Float32Array(si.count);
      for(let i=0;i<si.count;i++)for(let k=0;k<4;k++) {
        if(/^(hand|index|middle|ring|pinky|thumb)_/.test(o.skeleton.bones[si.getComponent(i,k)].name))detail[i]+=sw.getComponent(i,k);
      }
      o.geometry.setAttribute('characterHandDetail',new THREE.BufferAttribute(detail,1));
    }
    // The source lash cards were designed for an adult portrait close-up.
    // Their long spikes overpower a child's eyes at book scale; the modeled
    // eyelid rim supplies the quiet, natural edge needed here.
    if(o.name==='Eyelashes')o.visible=false;
    o.material=Array.isArray(o.material)?o.material.map(m=>materialFor(M,m,child)):materialFor(M,o.material,child);
    o.userData.castShadow=!/Eyelash|Eyebrow|Cornea/.test(o.name);
    meshes.push(o);
  });
  root.updateMatrixWorld(true);
  const body=scene.getObjectByName('Body');
  if(!body?.isSkinnedMesh)throw Error('CC0 character asset has no skinned body');
  const armMechanics=new Map();
  if(child)for(const side of ['l','r'])armMechanics.set(side,installArmMechanics({root,body,meshes,bones,side}));
  meshes.push(...wardrobe(M,body,bones,child));
  const restBones=new Map([...bones].map(([name,bone])=>[name,{position:bone.position.clone(),quaternion:bone.quaternion.clone(),scale:bone.scale.clone()}]));
  root.updateMatrixWorld(true);
  const handAxes=anatomicalHandAxes(bones);
  const headBone=bones.get('head'),headOrigin=headBone.getWorldPosition(new THREE.Vector3());
  const headFrame=new THREE.Group();headFrame.name='Head accessory frame';
  headBone.add(headFrame);
  headFrame.position.copy(headBone.worldToLocal(headOrigin.clone()));
  headFrame.quaternion.copy(headBone.getWorldQuaternion(new THREE.Quaternion()).invert());
  const worldJoints=Object.fromEntries([...bones].map(([name,bone])=>[name,bone.getWorldPosition(new THREE.Vector3()).toArray()]));
  const p=body.geometry.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight;
  const bodyBounds=new THREE.Box3(),headBounds=new THREE.Box3(),v=new THREE.Vector3();
  for(let i=0;i<p.count;i++) {
    v.fromBufferAttribute(p,i);bodyBounds.expandByPoint(v);let h=0;
    for(let k=0;k<4;k++)if(body.skeleton.bones[si.getComponent(i,k)].name==='head')h+=sw.getComponent(i,k);
    if(h>.75)headBounds.expandByPoint(v);
  }
  const iris=meshes.find(m=>m.name==='Eyes_2');iris.geometry.computeBoundingBox();
  const eye=iris.geometry.boundingBox.getCenter(new THREE.Vector3()),hs=headBounds.getSize(new THREE.Vector3());
  const skullZ=(headBounds.min.z+eye.z)/2;
  const dimensions={height:bodyBounds.max.y-bodyBounds.min.y,headOrigin:headOrigin.toArray(),headTop:headBounds.max.y-headOrigin.y,
    headWidth:hs.x,headDepth:hs.z,worldJoints,
    accessoryHead:{width:hs.x,height:(headBounds.max.y-eye.y)*2.7/1.6,depth:eye.z-headBounds.min.z},
    accessoryOffset:[0,eye.y-headOrigin.y,skullZ-headOrigin.z]};
  function resetPose(){
    for(const[name,bone]of bones){const rest=restBones.get(name);bone.position.copy(rest.position);bone.quaternion.copy(rest.quaternion);bone.scale.copy(rest.scale);}
    for(const mesh of meshes)mesh.morphTargetInfluences?.fill(0);
  }
  function setMorph(name,value){for(const mesh of meshes){const i=mesh.morphTargetDictionary?.[name];if(i!==undefined)mesh.morphTargetInfluences[i]=Math.max(0,Math.min(1,value));}}
  function updateWorld(){root.updateMatrixWorld(true);const skeletons=new Set(meshes.filter(m=>m.isSkinnedMesh).map(m=>m.skeleton));for(const skeleton of skeletons)skeleton.update();}
  updateWorld();
  return {root,body,bones,restBones,handAxes,armMechanics,meshes,resetPose,setMorph,updateWorld,headFrame,dimensions};
}
