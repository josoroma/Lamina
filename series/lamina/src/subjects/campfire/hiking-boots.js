// Native, foot-bound trekking footwear. All visible panels, laces and tread
// are geometry, so close inspection and the book's vector export agree.
import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, mix, mx_noise_float, positionLocal } from 'three/tsl';

export function createHikingBoots(M,body,bones,child) {
  const meshes=[],size=child?.76:1;
  const pigment={leather:child?'#a9b9ae':'#685f50',mesh:child?'#526e6c':'#3d4944',rubber:'#252f2e',foam:child?'#c3cbbd':'#8c8a74',accent:child?'#3b777a':'#9c764b',lace:child?'#d8e1d9':'#d5c5a2',seam:child?'#d0dbd2':'#b6a68a',metal:'#59615c'};
  const materials={};
  function material(kind,roughness=.91) {
    if(materials[kind])return materials[kind];
    const base=new THREE.Color(pigment[kind]);
    const grain=mx_noise_float(positionLocal.mul(kind==='mesh'?1600:2400)).mul(.5).add(.5);
    const albedo=mix(color(base.clone().multiplyScalar(kind==='mesh'?.76:.91)),color(base.clone().multiplyScalar(1.055)),grain);
    const m=M.ctx.ink({color:pigment[kind],colorNode:albedo,svgColor:pigment[kind],roughness,metalness:kind==='metal'?.25:0,reflect:.2,hatch:0,crossHatch:0,side:THREE.DoubleSide});
    m.name=`Trekking ${kind}`;
    // Keep the print separations compatible with the character's eight inks:
    // pale sole/cord, coloured upper and dark tread stay visibly distinct.
    const print=(kind==='foam'||kind==='lace'||kind==='seam')?'#e5e0d6':child&&kind==='leather'?'#d3ddd9':pigment[kind];
    m.userData.exportColorNode=color(print);M.materials.set(`trekking-${m.uuid}`,m);materials[kind]=m;return m;
  }
  // Heel-to-toe sections of the shaped last: width and upper height, metres.
  const sections=[[-.078,.003,.070],[-.066,.033,.120],[-.042,.047,.150],[-.008,.050,.154],[.030,.054,.135],[.070,.059,.105],[.115,.059,.079],[.153,.052,.067],[.181,.033,.057],[.197,.002,.042]];
  function section(z) {
    let i=0;while(i<sections.length-2&&z>sections[i+1][0])i++;
    const a=sections[i],b=sections[i+1],prev=sections[Math.max(0,i-1)],next=sections[Math.min(sections.length-1,i+2)];
    const t=THREE.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1),t2=t*t,t3=t2*t,dz=b[0]-a[0];
    const value=k=>(2*t3-3*t2+1)*a[k]+(t3-2*t2+t)*(b[k]-prev[k])/(b[0]-prev[0])*dz+(-2*t3+3*t2)*b[k]+(t3-t2)*(next[k]-a[k])/(next[0]-a[0])*dz;
    return {width:Math.max(.001,value(1)),top:Math.max(.038,value(2))};
  }
  function surface(z,angle,lift=0) {
    const s=section(z),x=Math.sin(angle)*(s.width+lift),y=.033+(Math.cos(angle)+1)*.5*(s.top-.033)+lift;
    return new THREE.Vector3(x,y,z);
  }
  function roof(x,z,lift=0) {
    const s=section(z),angle=Math.asin(THREE.MathUtils.clamp(x/s.width,-.995,.995));return surface(z,angle,lift);
  }
  function patch(z0,z1,angle0,angle1,lift=0,rows=28,columns=20) {
    const p=[],ix=[];
    for(let j=0;j<=rows;j++)for(let k=0;k<=columns;k++) {
      const u=j/rows,v=k/columns,angle=angle0+(angle1-angle0)*v,z=z0+(z1-z0)*u;
      p.push(...surface(z,angle,lift).toArray());
    }
    for(let j=0;j<rows;j++)for(let k=0;k<columns;k++){const a=j*(columns+1)+k,b=a+columns+1;ix.push(a,b,a+1,a+1,b,b+1);}
    if(angle1-angle0>Math.PI*1.99)for(const end of [0,rows]) {
      const z=end===0?z0:z1,s=section(z),centre=p.length/3;p.push(0,.033+(s.top-.033)*.5+lift,z);
      for(let k=0;k<columns;k++){const a=end*(columns+1)+k,b=a+1;ix.push(...(end===0?[centre,a,b]:[centre,b,a]));}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
  }
  const outline=new THREE.CatmullRomCurve3([[0,-.080],[.034,-.071],[.052,-.035],[.055,.015],[.065,.075],[.062,.126],[.048,.171],[.025,.194],[0,.201],[-.029,.192],[-.050,.168],[-.058,.120],[-.060,.068],[-.048,.015],[-.047,-.035],[-.033,-.071]].map(([x,z])=>new THREE.Vector3(x,0,z)),true,'catmullrom',.35);
  function sole(lo,hi,scale=1) {
    const p=[],ix=[],n=80;
    for(const y of [lo,hi])for(let i=0;i<n;i++) {const v=outline.getPoint(i/n);p.push(v.x*scale,y+Math.max(0,v.z-.115)*.09,v.z);}
    for(let i=0;i<n;i++){const j=(i+1)%n;ix.push(i,j,n+i,j,n+j,n+i);}
    const lower=p.length/3;p.push(0,lo,.055);const upper=p.length/3;p.push(0,hi,.055);
    for(let i=0;i<n;i++){const j=(i+1)%n;ix.push(lower,j,i,upper,n+i,n+j);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
  }
  for(const side of ['l','r']) {
    const foot=bones.get(`foot_${side}`).getWorldPosition(new THREE.Vector3()),boneIndex=body.skeleton.bones.indexOf(bones.get(`foot_${side}`));
    body.userData.trekkingSoleSupport??={};
    body.userData.trekkingSoleSupport[side]={bone:`foot_${side}`,restMinY:.002+.001*size,
      points:[-.056,.034,.100,.164].flatMap(z=>[-.018,.018].map(x=>[foot.x+x*size,.002+.001*size,foot.z+z*size])),
      heelZ:foot.z-.080*size,toeZ:foot.z+.201*size,width:.138*size};
    function add(g,kind,name) {
      g.scale(size,size,size);g.translate(foot.x,.002,foot.z);
      const count=g.attributes.position.count,skinIndex=new Uint16Array(count*4),skinWeight=new Float32Array(count*4);
      for(let i=0;i<count;i++){skinIndex[i*4]=boneIndex;skinWeight[i*4]=1;}
      g.setAttribute('skinIndex',new THREE.BufferAttribute(skinIndex,4));g.setAttribute('skinWeight',new THREE.BufferAttribute(skinWeight,4));g.computeBoundingBox();g.computeBoundingSphere();
      const mesh=new THREE.SkinnedMesh(g,material(kind,kind==='rubber'?.97:kind==='metal'?.67:.91));mesh.name=`trek-${name}-${side}`;mesh.bind(body.skeleton,body.bindMatrix);mesh.frustumCulled=false;body.parent.add(mesh);meshes.push(mesh);return mesh;
    }
    function line(points,r,kind,name,closed=false) {
      const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)),closed,'catmullrom',.35);
      return add(new THREE.TubeGeometry(curve,points.length===2?1:Math.max(12,points.length*4),r,6,closed),kind,name);
    }
    add(sole(.011,.024,1.035),'rubber','lugged-outsole');
    add(sole(.024,.036,1.015),'foam','cushioned-midsole');
    add(patch(-.078,.197,-Math.PI,Math.PI,0,48,32),'mesh','woven-upper');
    // Rounded protective caps wrap the toe and heel instead of ending in a
    // flat box. They sit above the flexing woven vamp and beside the outsole.
    add(patch(.124,.197,-Math.PI,Math.PI,.0028,24,32),'rubber','toe-guard');
    add(patch(-.078,-.043,-Math.PI,Math.PI,.0022,14,30),'leather','heel-counter');
    for(const sign of [-1,1]) {
      add(patch(-.041,.108,sign*.24*Math.PI,sign*.77*Math.PI,.0018,24,12),'leather',`quarter-panel-${sign}`);
      // Strong heel-to-forefoot reinforcement, with two visible stitched
      // seams following the curved leather panel rather than a decal.
      for(const angle of [.26,.73]) {
        const points=Array.from({length:20},(_,i)=>surface(-.036+i/19*.136,sign*angle*Math.PI,.0034));
        for(let i=0;i<points.length-1;i+=2)line([points[i],points[i+1]],.00065,'seam',`panel-stitch-${sign}-${angle}-${i}`);
      }
      // An eye-stay at each edge of the tongue gives the laces a real seat.
      add(patch(-.013,.108,sign*.13*Math.PI,sign*.24*Math.PI,.0048,24,8),'leather',`eye-stay-${sign}`);
    }
    // Raised, rounded tongue with a narrow coloured top label.
    add(patch(-.025,.111,-.13*Math.PI,.13*Math.PI,.0058,28,14),'mesh','padded-tongue');
    add(patch(-.018,-.005,-.115*Math.PI,.115*Math.PI,.0072,4,12),'accent','tongue-tab');
    const laceRows=[.004,.029,.054,.079,.099],laces=[];
    for(let i=0;i<laceRows.length;i++) {
      const z=laceRows[i],half=section(z).width*Math.sin(.185*Math.PI);
      const pair=[];
      for(const sign of [-1,1]) {
        const v=roof(sign*half,z,.008),eyelet=new THREE.TorusGeometry(.0035,.00095,6,12);eyelet.rotateX(-Math.PI/2);eyelet.translate(...v.toArray());add(eyelet,'metal',`eyelet-${i}-${sign}`);pair.push(v);
      }
      laces.push(pair);
    }
    for(let i=0;i<laces.length-1;i++)for(const direction of [0,1]) {
      const a=laces[i][direction],b=laces[i+1][1-direction],mid=roof(0,(a.z+b.z)*.5,.012);
      line([a,mid,b],.00175,'lace',`cross-lace-${i}-${direction}`);
    }
    // Tie the visible lace on the exposed instep, clear of the trouser cuff.
    const knot=roof(0,.070,.010);
    for(const sign of [-1,1]) {
      const loop=[knot.clone(),knot.clone().add(new THREE.Vector3(sign*.017,.002,-.011)),knot.clone().add(new THREE.Vector3(sign*.028,0,.004)),knot.clone().add(new THREE.Vector3(sign*.014,-.001,.010)),knot.clone()];
      line(loop,.0016,'lace',`lace-bow-${sign}`);
      line([knot.clone(),roof(sign*.017,.090,.010),roof(sign*.035,.110,.006)],.00155,'lace',`lace-end-${sign}`);
    }
    // Soft collar visible around the trouser cuff and a woven heel pull tab.
    const collar=Array.from({length:40},(_,i)=>{const t=i/40*Math.PI*2;return new THREE.Vector3(Math.sin(t)*.042,.135+Math.cos(t)*.003,-.018+Math.cos(t)*.044);});
    line(collar,.0065,'mesh','padded-ankle-collar',true);
    line([[-.006,.120,-.071],[-.006,.150,-.069],[.006,.150,-.069],[.006,.120,-.071]],.0028,'accent','heel-pull-loop');
    // Real tread blocks project beyond the outsole and remain visible from
    // front and profile. Underside blocks complete the heel/forefoot grip.
    for(const sign of [-1,1])for(let row=0;row<7;row++) {
      const z=-.054+row*.035,w=section(z).width;
      const block=new RoundedBoxGeometry(.019,.015,.023,1,.002);block.rotateY(sign*(row%2?.20:-.20));block.translate(sign*(w-.002),.009,z);add(block,'rubber',`edge-tread-${sign}-${row}`);
    }
    for(const z of [-.056,-.027,.034,.067,.100,.134,.164])for(const sign of [-1,1]) {
      const block=new RoundedBoxGeometry(.027,.011,.014,1,.0016);block.rotateY(sign*.35);block.translate(sign*.018,.0065,z);add(block,'rubber',`underside-grip-${sign}-${z}`);
    }
    // A slim rubber rand makes the edge of the leather legible above foam.
    const rand=Array.from({length:64},(_,i)=>{const v=outline.getPoint(i/64);v.y=.037+Math.max(0,v.z-.115)*.09;return v;});line(rand,.002,'rubber','protective-rand',true);
  }
  // Each pigment is one draw call per person, while retaining every piece's
  // topology and foot weights. Grain is procedural, so UVs are unnecessary.
  const batches=new Map();
  for(const mesh of meshes) {
    if(!batches.has(mesh.material))batches.set(mesh.material,[]);
    mesh.geometry.deleteAttribute('uv');
    batches.get(mesh.material).push(mesh);
  }
  const combined=[];
  for(const[mat,parts]of batches) {
    const buffers=parts.map(m=>m.geometry.index?m.geometry.toNonIndexed():m.geometry);
    const geometry=mergeGeometries(buffers);geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.SkinnedMesh(geometry,mat);mesh.name=`trek-${mat.name.replace('Trekking ','')}`;mesh.userData.parts=parts.map(p=>p.name);
    mesh.bind(body.skeleton,body.bindMatrix);mesh.frustumCulled=false;body.parent.add(mesh);combined.push(mesh);
    for(let i=0;i<parts.length;i++){parts[i].removeFromParent();if(buffers[i]!==parts[i].geometry)buffers[i].dispose();parts[i].geometry.dispose();}
  }
  return combined;
}
