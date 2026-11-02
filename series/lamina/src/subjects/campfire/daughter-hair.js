import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU=Math.PI*2;
const V=p=>new THREE.Vector3(...p);
const lerp=THREE.MathUtils.lerp;

// Every patch has a transverse U and root-to-tip V. Fine shading follows that
// frame, including around the braid; it is not painted vertical on the head.
function patch(fn,across=8,along=28) {
  const positions=[],uv=[],indices=[];
  for(let j=0;j<=along;j++)for(let i=0;i<=across;i++){
    const u=i/across,v=j/along;positions.push(...fn(u,v));uv.push(u,v);
    if(i<across&&j<along){const a=j*(across+1)+i;indices.push(a,a+across+1,a+1,a+1,a+across+1,a+across+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function interpolate(values,t){const k=t*(values.length-1),i=Math.floor(k);return lerp(values[i],values[Math.min(i+1,values.length-1)],k-i);}

function lock(points,widths,depths,{steps=40,radial=12,phase=0}={}) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:V(p)));
  return patch((u,v)=>{
    const at=curve.getPoint(v),t=curve.getTangent(v).normalize();
    let across=new THREE.Vector3(1,0,0).addScaledVector(t,-t.x);
    if(across.lengthSq()<.02)across=new THREE.Vector3(0,0,1).addScaledVector(t,-t.z);
    across.normalize();const front=new THREE.Vector3().crossVectors(across,t).normalize();
    // A softly flattened bundle, not a round plastic cord. Its few shallow
    // flutes run along the lock and are subordinate to the overall volume.
    const a=u*TAU,flute=1+.022*Math.cos(a*5+phase+v*.6),w=interpolate(widths,v),d=interpolate(depths,v);
    return at.addScaledVector(across,Math.cos(a)*w*flute).addScaledVector(front,Math.sin(a)*d*flute).toArray();
  },radial,steps);
}

// Close-fitting skull guide. This is a construction surface; the visible
// coiffure consists of overlapping flow patches and feathered fringe locks.
function skull(direction,lift=0){
  const q=direction.clone().normalize(),front=q.z>0;
  return new THREE.Vector3(q.x*(1.026+lift),.38+q.y*(1.305+lift),
    q.z*((front?1.365:1.075)+lift)+.25*q.y*q.y-.035);
}
function direction(theta,x=0){return new THREE.Vector3(x,Math.cos(theta),Math.sin(theta)).normalize();}

/** Native, layered chestnut hair. Coordinates match the accessory eye frame. */
export function createDaughterHair({root,mesh,ellipsoid,hairColor,braidLength,braidRoots}) {
  const shades=[hairColor,'#65432f','#684632','#664431','#6a4833'];
  const batches=new Map();
  const add=(g,shade,name,parent=root)=>{
    const separate=/underlayer|crown part/.test(name),key=`${parent.id}:${shade}:${separate?name:'locks'}`;
    if(!batches.has(key))batches.set(key,{parent,shade,name:separate?name:'Layered directional hair',geometries:[]});
    batches.get(key).geometries.push(g);
  };
  const fibre=(points,r=.003,shade='#76523a',parent=root,name='Loose hair fibre')=>
    add(lock(points,[r*.45,r,r*.7,.00025],[r*.4,r*.8,r*.55,.0002],{steps:points.length>20?64:24,radial:5}),shade,name,parent);

  // An occluded underlayer prevents scalp holes between the locks. It ends
  // above the fringe tips, so it never imposes a hard bowl-cut silhouette.
  add(patch((u,v)=>{
    const a=u*TAU,front=THREE.MathUtils.smoothstep(Math.cos(a),.36,.8);
    const edge=lerp(1.60+.68*Math.max(0,-Math.cos(a)),Math.acos((.58-.38)/1.305),front),t=v*edge;
    return skull(new THREE.Vector3(Math.sin(a)*Math.sin(t),Math.cos(t),Math.cos(a)*Math.sin(t)),-.007).toArray();
  },64,24),'#60402e','Recessed hair underlayer');

  // Two softly interleaved fans sweep from a narrow crown part toward the
  // braid roots. Unequal spacing and gentle directional changes avoid both
  // a smooth helmet and the regular ridges of a molded wig.
  for(const side of [-1,1]){
    const count=31,min=-2.27,max=1.08;
    for(let i=0;i<count;i++){
      const middle=min+(i+.5)/count*(max-min),half=(max-min)/count*.61;
      add(patch((u,v)=>{
        const theta=middle+(u*2-1)*half;
        const partX=.014*Math.sin(theta*3)+.006*Math.sin(theta*5.3);
        const start=direction(theta,partX+side*(.009+.002*Math.sin(theta*2.7)));
        const finish=new THREE.Vector3(side*.98,-.16+.06*Math.sin(middle*1.3),-.28+.075*Math.cos(middle));
        const flow=start.lerp(finish.normalize(),v).normalize();
        // Bundle lift is about 1–2 mm on the fitted head, with no round tubes.
        const shoulder=Math.pow(Math.sin(Math.PI*u),.75);
        const bodyWave=.027*Math.sin(theta*2.6+v*2.7)*Math.sin(Math.PI*v);
        const lift=.018+bodyWave+shoulder*(.006+.002*Math.sin(i*1.7))*Math.sin(Math.PI*(v*.86+.07));
        return skull(flow,lift).toArray();
      },6,26),shades[(i+(side>0?1:0))%shades.length],'Swept crown lock');
    }
  }

  // A fine skin-toned part is visible only between the rooted lock fans.
  add(patch((u,v)=>{
    const theta=lerp(-1.58,.72,v),w=.006*Math.sin(Math.PI*v)**.5;
    return skull(direction(theta,(u*2-1)*w+.014*Math.sin(theta*3)+.006*Math.sin(theta*5.3)),.012).toArray();
  },3,36),'#78533c','Narrow natural crown part');

  function fringeSurface(x,y,bulge=0){
    const py=(y-.38)/1.305,pz=Math.sqrt(Math.max(.005,1-(x/1.026)**2-py*py));
    return [x,y,1.365*pz+.25*py*py-.035+bulge];
  }
  // The fringe is individual overlapping locks: separate tips, variable
  // lengths, and a slight sweep rather than a single straight solid ledge.
  for(let i=0;i<35;i++){
    const x=-.88+i/34*1.76,w=.037+.008*Math.sin(i*2.1);
    const tip=.43+.065*Math.sin(i*1.73)+.06*Math.abs(x)**3;
    const rootY=1.43-.13*Math.abs(x)+.03*Math.sin(i*.93),rootX=x*.53;
    add(patch((u,v)=>{
      const s=u*2-1,spread=lerp(.62,1,v),taper=1-.48*Math.pow(v,11);
      const xx=lerp(rootX,x,v)+s*w*spread*taper+.055*Math.sin(v*Math.PI)*Math.sin(i*.41+.6);
      const yy=lerp(rootY,tip,v)+Math.pow(Math.abs(s),1.7)*.055*Math.pow(v,5);
      const lift=.035+Math.sin(Math.PI*u)*(.009+.003*Math.sin(i))*Math.sin(Math.PI*(v*.85+.1));
      return fringeSurface(xx,yy,lift);
    },6,26),shades[(i+2)%shades.length],'Feathered fringe lock');
    // Each bundle resolves into three fine, overlapping wisps. Their curved
    // unequal tips make a translucent-looking edge from real thin geometry,
    // rather than a repeated row of broad triangular teeth.
    for(let strand=0;strand<3;strand++){
      const sign=strand-1,start=.77,tipY=Math.max(.28,tip-.04-.10*(.5+.5*Math.sin(i*1.93+strand*2.6)));
      add(patch((u,v)=>{
        const t=lerp(start,1.025,v),bend=.018*Math.sin(Math.PI*v+i*.7+strand);
        const center=lerp(rootX,x,t)+sign*w*.42+bend;
        const yy=lerp(lerp(rootY,tip,start),tipY,v);
        const width=.013*(1-v)**.72+.0002;
        return fringeSurface(center+(u*2-1)*width,yy,.043+.006*Math.sin(Math.PI*u));
      },3,16),shades[(i+strand)%shades.length],'Soft fringe end wisp');
    }
  }

  // Temple wisps break the polished outline around each ear; the braid
  // emerges from the gathered hair instead of an exposed cylindrical socket.
  for(const side of [-1,1]){
    // Fine edge locks follow the skull around the temple. They soften the
    // gathered-hair boundary without detached straps bridging to the braid.
    for(let i=0;i<17;i++){
      const along=.16+i/21;
      add(patch((u,v)=>{
        const theta=1.035+v*(.13+.025*Math.sin(i));
        const start=direction(theta,side*.01),finish=new THREE.Vector3(side*.98,-.16,-.24).normalize();
        const flow=start.lerp(finish,Math.min(.99,along+v*.105)).normalize();
        const q=skull(flow,.018),width=.009*(1-v)**.7+.0002;
        q.y+=(u*2-1)*width;
        return q.toArray();
      },3,14),shades[i%shades.length],'Fine temple hairline');
    }
    for(let i=0;i<5;i++){
      const points=[];
      for(let j=0;j<4;j++){
        const start=direction(1.07+j*.047,side*.01),finish=new THREE.Vector3(side*.98,-.16,-.24).normalize();
        const flow=start.lerp(finish,.28+i*.12+j*.025).normalize();
        points.push(skull(flow,.022));
      }
      add(lock(points,[.008,.011,.006,.0003],[.005,.006,.003,.0002],{steps:18,radial:7,phase:i}),
        shades[i%shades.length],'Short lying temple wisp');
    }
    for(let i=0;i<3;i++){
      const x=side*(.96+i*.015);
      add(lock([[x,.57,.28],[x*1.06,.32,.34],[x*1.035,.06,.31],[x*.98,-.13-i*.045,.24]],
        [.018,.023,.016,.0005],[.012,.018,.011,.0004],{steps:24,radial:7,phase:i}),shades[i],'Soft temple wisp');
    }
    const braid=new THREE.Group();braid.position.set(side*.90,.28,-.37);braid.scale.set(.86,1,.94);root.add(braid);braidRoots.push(braid);
    const length=braidLength*(side<0?1.015:.975);
    // The first woven section starts inside the swept hair behind the ear.
    // Subsequent control points retain their previous world positions: the
    // attachment rises/recedes without lifting or shortening the braid tails.
    const dx=side*.07/.86,dz=.12/.94;
    const c=new THREE.CatmullRomCurve3([[0,0,0],[side*.08+dx,-.62*length-.27,.25+dz],
      [-side*(side<0?.10:.055)+dx,-1.38*length-.27,.62+dz],[-side*.22+dx,-2.02*length-.27,.84+dz]].map(V));
    add(lock(c.points,[.135,.12,.09,.058],[.105,.095,.075,.048],{steps:48,radial:10}),hairColor,'Braid inner volume',braid);
    for(let strand=0;strand<3;strand++){
      const points=[],widths=[],depths=[];
      for(let j=0;j<=120;j++){
        const u=j/120,p=c.getPoint(u),t=c.getTangent(u).normalize();
        const across=new THREE.Vector3(1,0,0).addScaledVector(t,-t.x).normalize();
        const front=new THREE.Vector3().crossVectors(across,t).normalize();
        // Three strands exchange sides on a figure-eight track: over/under
        // is real depth, not three helices wrapped around a cylindrical rope.
        const phase=TAU*(4.25*u+.025*Math.sin(u*TAU))+strand*TAU/3+(side<0?.12:-.05),taper=1-.49*u;
        p.addScaledVector(across,.112*taper*Math.sin(phase)).addScaledVector(front,.064*taper*Math.sin(phase*2));
        points.push(p);widths.push(.113*taper*(1+.08*Math.sin(phase*.63+strand)));depths.push(.087*taper*(1+.07*Math.cos(phase*.71)));
      }
      add(lock(points,widths,depths,{steps:112,radial:10,phase:strand}),shades[strand],'Woven hair bundle',braid);
      // Subtle raised fibre ribbons follow the strand's path, not the braid
      // axis. Their low contrast reads as hair texture without dark grooves.
      const strandCurve=new THREE.CatmullRomCurve3(points);
      for(const fraction of [-.55,0,.55]){
        const trace=[];
        for(let j=0;j<=80;j++){
          const u=j/80,p=strandCurve.getPoint(u),t=strandCurve.getTangent(u).normalize();
          const across=new THREE.Vector3(1,0,0).addScaledVector(t,-t.x).normalize();
          const front=new THREE.Vector3().crossVectors(across,t).normalize();
          p.addScaledVector(across,interpolate(widths,u)*fraction)
            .addScaledVector(front,-interpolate(depths,u)*Math.sqrt(1-fraction*fraction)*1.01);
          trace.push(p);
        }
        fibre(trace,.0028,fraction===0?'#80573d':'#775137',braid,'Braid surface fibre');
      }
    }
    const end=c.getPoint(1);
    ellipsoid(end.toArray(),[.091,.047,.078],'#5f8c8b',braid,'Small fabric hair tie');
    for(let i=0;i<7;i++){
      const x=(i-3)*.022,zz=.018*Math.sin(i*2.2),length=.22+.07*(.5+.5*Math.sin(i*1.7));
      add(lock([[end.x+x,end.y+.015,end.z+zz],[end.x+x*1.25,end.y-.12,end.z+.045+zz],
        [end.x+x*.7,end.y-length,end.z+.11+zz]],
        [.022,.027,.0005],[.019,.020,.0004],{steps:22,radial:7,phase:i}),shades[i%shades.length],'Loose tapered braid tail',braid);
    }
    for(let i=0;i<3;i++){
      const at=c.getPoint(.15+i*.27),sg=i%2?1:-1;
      fibre([at.toArray(),[at.x+side*.12,at.y-.07,at.z+.015],[at.x+side*.15,at.y-.15,at.z+.05],[at.x+side*.11,at.y-.20,at.z+.06]],
        .0026,'#735039',braid,'Braid flyaway');
    }
  }
  // Sparse flyaways at the crown, deliberately below strand-count spectacle.
  for(let i=0;i<6;i++){
    const side=i%2?1:-1,theta=-1.0+i*.27,points=[];
    for(let j=0;j<5;j++){
      const v=j/4,d=direction(theta+v*.22,side*(.05+v*.40));
      points.push(skull(d,.025+.065*Math.sin(Math.PI*v)).toArray());
    }
    fibre(points,.0025,'#735039',root,'Crown flyaway');
  }
  // Share draw calls by pigment and moving braid group. The hidden scalp
  // remains separately named for inspection; all retained detail is geometry.
  for(const batch of batches.values()){
    const geometry=batch.geometries.length===1?batch.geometries[0]:mergeGeometries(batch.geometries,false);
    const m=mesh(geometry,batch.shade,batch.parent,batch.name,'hair');
    m.userData.hairLockCount=batch.geometries.length;
    if(batch.geometries.length>1)for(const g of batch.geometries)g.dispose();
  }
}
