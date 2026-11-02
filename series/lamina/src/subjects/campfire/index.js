// Six inspectable campfire studies. Diagram dimensions and timing are schematic.
// Every moving pose is derived from t; no accumulating particle simulation.
import * as THREE from 'three/webgpu';
import { msg } from '../../i18n/index.js';
import { FIGURE_DURATION } from '../../engine/figures/contract.js';
import { Model } from './model.js';
import { character } from './characters.js';
import { loadCharacterTemplates } from './character-rig.js';
import { driftwood, flames, firepit, coast, shoreHeightAt } from './landscape.js';
import { buildMechanism } from './mechanisms.js';
import { memoryTree } from './tree.js';
const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const C = { night:'#13243e', ocean:'#294d67', foam:'#aeced0', sand:'#b99e73', wood:'#704837', char:'#332e30', orange:'#e78035', gold:'#f3bb59', cream:'#ffe4a5', red:'#bd5545', green:'#648b57', skin:'#b47c58', blue:'#668db3' };
const TITLES = {
  shore:msg('A question beside the sea'), pyrolysis:msg('Wood becomes fuel gas'),
  reaction:msg('Atoms change partners'), heat:msg('Three paths for warmth'),
  light:msg('Flame, ember and spark'), sunlight:msg('Sunlight remembered by a tree'),
};

export async function createFigure(params = {}, ctx) {
  const scene = params.scene ?? 'shore';
  if (!TITLES[scene]) throw new Error(`Unknown campfire scene: ${scene}`);
  if (['shore','heat','sunlight'].includes(scene)) await loadCharacterTemplates();
  const root = new THREE.Group(); root.name = `campfire-${scene}`;
  const layers = [], labels = [], parts = [], poses = [];
  const groups = new Map(), materials = new Map();
  const M = new Model(ctx,poses);
  let explode = 0, lastT = 0;
  const mat = (color, flat=false) => {
    const key = `${color}:${flat}`;
    if (!materials.has(key)) materials.set(key, flat ? ctx.flat({color}) : ctx.ink({color,roughness:0.86}));
    return materials.get(key);
  };
  function layer(id, label, hint) { const g=new THREE.Group();g.name=label;root.add(g);groups.set(id,g);layers.push({id,label,visible:true,hint});return g; }
  function mesh(geo,color,parent=root,pos=[0,0,0],flat=false,outline=true) {
    const m = new THREE.Mesh(geo,mat(color,flat));m.position.set(...pos);parent.add(m);
    if (outline && !flat) ctx.outline(m,{width:0.65}); return m;
  }
  function ball(parent,pos,r,color,scale=[1,1,1],flat=false) {const m=mesh(new THREE.SphereGeometry(r,16,12),color,parent,pos,flat,!flat);m.scale.set(...scale);return m;}
  function box(parent,pos,size,color) {return mesh(new THREE.BoxGeometry(...size),color,parent,pos);}
  function rod(parent,a,b,r,color,flat=false) {
    const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),d=v2.clone().sub(v1);
    const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),10),color,parent,v1.add(v2).multiplyScalar(.5).toArray(),flat,!flat);
    m.quaternion.setFromUnitVectors(UP,d.normalize());return m;
  }
  function curve(parent,points,r,color,flat=false) {return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),30,r,7,false),color,parent,[0,0,0],flat,!flat);}
  function part(id,name,obj,color,layerId) {const palette=obj.userData.characterPalette??obj.userData.printPalette;
    const entry={id,name,object:obj,color,layer:layerId,
      ...(palette?{swatches:palette,minPatternPx:80,keepSmall:true}:{})};parts.push(entry);return entry;}
  function label(id,text,detail,parent,pos,layerId) {const anchor=new THREE.Object3D();anchor.position.set(...pos);parent.add(anchor);labels.push({id,text,detail,anchor,layer:layerId});return anchor;}
  function separated(g,delta) {const rest=g.position.clone();poses.push((t,e)=>g.position.copy(rest).addScaledVector(new THREE.Vector3(...delta),e));}
  function log(parent,pos=[0,1,0],yaw=0,len=8,charred=false) {return driftwood(M,parent,pos,yaw,len,charred);}
  function flame(parent,pos=[0,1.4,0],size=1) {return flames(M,parent,pos,size);}
  function sparks(parent,pos=[0,1.5,0],count=10) {
    const g=new THREE.Group();g.position.set(...pos);parent.add(g);
    // The visible half-cycle rises. Its zero-size return makes both the
    // rendered motion and the underlying transforms continuous at the seam.
    for(let i=0;i<count;i++){const s=ball(g,[0,0,0],.07+(i%3)*.025,C.gold,[1,1.9,1],true);poses.push(t=>{const phase=TAU*(t/5+i/count),u=.5-.5*Math.cos(phase);s.position.set(Math.sin(i*2.4+u*3)*u*2.8,.3+u*10,Math.cos(i*1.8)*u*1.4);s.scale.setScalar(Math.max(0,Math.sin(phase))**2);});}
    return g;
  }
  function fire(parent,pos=[0,0,0],size=1) {return firepit(M,parent,pos,size);}
  function person(parent,x,z,child=false) {return character(M,parent,{position:[x,.4,z],yaw:x>0?-.8:.77,child,groundHeight:shoreHeightAt}).root;}
  function beach() {
    const land=layer('shore',msg('Shore and sea'),msg('A schematic beach, with wind-driven waves.'));
    const landscape=coast(M,land);
    const people=layer('people',msg('Father and daughter'),msg('Two observers keep their distance and ask testable questions.'));
    driftwood(M,people,[-6,1.75,-.5],-.12,5.6,false,1.1);driftwood(M,people,[6.1,1.5,-.25],.25,4.4,false,.86);
    // Sit on the front half of each log. The earlier rearward placement let
    // an end cap pass through a calf when viewed from the book's high angle.
    const father=person(people,-5.35,-.5),daughter=person(people,5.65,0,true);father.scale.multiplyScalar(1.35);daughter.scale.multiplyScalar(1.38);
    const burning=layer('fire',msg('Campfire'),msg('Fuel gases react with oxygen above the heated wood.'));
    const hearth=fire(burning,[0,.5,3.7],1.05);burning.userData.printPalette=hearth.userData.printPalette;
    const embers=sparks(burning,[0,1.8,3.7],12);
    // A shallow curved night-sky cutout belongs to the diorama, leaving the
    // book's white stage intact. Its rounded outline is not a box backdrop.
    const skyP=[],skyI=[],nx=48,ny=18;
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const x=-10.8+i/nx*21.6,u=j/ny,h=1.2+9.6*Math.sqrt(Math.max(0,1-(x/10.8)**2));skyP.push(x,.25+u*h,-8.1+.9*(x/10.8)**2-.5*Math.sin(u*Math.PI));if(i<nx&&j<ny){const n=j*(nx+1)+i;skyI.push(n,n+1,n+nx+1,n+1,n+nx+2,n+nx+1);}}
    const skyGeo=new THREE.BufferGeometry();skyGeo.setAttribute('position',new THREE.Float32BufferAttribute(skyP,3));skyGeo.setIndex(skyI);skyGeo.computeVertexNormals();const sky=M.mesh(skyGeo,'#1d3348',land);sky.material.side=THREE.DoubleSide;
    for(let i=0;i<45;i++){const x=-9.5+((i*73)%191)/10,h=1.2+9.6*Math.sqrt(Math.max(0,1-(x/10.8)**2)),y=2.7+((i*47)%71)/10;if(y>h-.3)continue;const z=-7.94+.9*(x/10.8)**2-.5*Math.sin(y/h*Math.PI);M.ellipsoid(land,[x,y,z],[i%7===0?.076:.038,i%7===0?.076:.038,.025],i%3?'#c9d4cd':'#e6c489',true,8);}
    // A real rim and curved handle distinguish the waiting water pail.
    const bucket=M.group(people,[-9.3,.8,3.4]);M.sweep(bucket,[[0,0,0],[0,.5,0],[0,1.1,0]],[[.44,.44],[.5,.5],[.55,.55]],'#6e7e83',{radial:24,steps:8});
    M.ellipsoid(bucket,[0,1.1,0],[.51,.025,.51],'#344e60');const ring=[];for(let i=0;i<=40;i++){const a=i/40*TAU;ring.push([Math.cos(a)*.55,1.12,Math.sin(a)*.55]);}M.line(bucket,ring,.035,'#b2b7ad');M.line(bucket,[[-.55,.92,0],[-.52,1.65,0],[0,1.91,0],[.52,1.65,0],[.55,.92,0]],.035,'#758185');
    part('beach',msg('Beach'),land,C.sand,'shore');part('observers',msg('Observers'),people,shirtColor(),'people');part('campfire',msg('Campfire'),burning,C.orange,'fire');
    part('father',msg('Father'),father,'#4f6872','people');part('daughter',msg('Daughter'),daughter,'#a7b6aa','people');
    separated(land,[0,0,-2.5]);separated(people,[0,1.3,2]);
    return {land,people,burning,father,daughter,embers};
  }
  function shirtColor(){return '#587b91';}
  function arrow(parent,a,b,color,r=.11) {
    rod(parent,a,b,r,color,true);const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av).normalize();
    const tip=mesh(new THREE.ConeGeometry(r*3.1,r*6,12),color,parent,b,true,false);tip.quaternion.setFromUnitVectors(UP,d);return tip;
  }
  const shapes=layer('structure',msg('Material structure'),msg('Solid objects and the arrangement being explained.'));
  if(scene==='shore'||scene==='sunlight') {
    root.remove(shapes);groups.delete('structure');layers.pop();
    const b=beach();
    label('flame',msg('Flame'),msg('The visible flame is a region of hot reacting gas and glowing particles.'),b.burning,[0,4,3.7],'fire');
    label('waves',msg('Waves'),msg('Offshore waves carry energy while water largely moves back and forth.'),b.land,[.8,.7,-5.3],'shore');
    if(scene==='shore') label('question',msg('A good question'),msg('Father and daughter ask where the missing wood has gone.'),b.daughter.userData.headFrame,[0,.06,.07],'people');
    else {
      const energy=layer('sunlight',msg('Sunlight and tree'),msg('A memory diagram connects sunlight, growing wood and fire.'));
      const sun=M.ellipsoid(energy,[-7.5,10.6,-5.5],[1.18,1.18,1.18],'#efba5d');
      for(let i=0;i<12;i++){const a=i/12*TAU;M.line(energy,[[-7.5+Math.cos(a)*1.45,10.6+Math.sin(a)*1.45,-5.5],[-7.5+Math.cos(a)*1.8,10.6+Math.sin(a)*1.8,-5.5]],.025,'#d9b367',true,8);}
      const tree=memoryTree(M,energy,[3.5,shoreHeightAt(3.5,-2.5)-.025,-2.5],1.2);
      tree.name='grounded-memory-tree';
      M.line(energy,[[-5.6,10.7,-5.4],[-1.8,10.4,-4.5],[1,8,-3.4],[3.7,5.1,-2.4]],.045,'#d9b367',true);
      M.line(energy,[[3.7,.9,-2.1],[2.8,1.2,0],[1.8,2.4,2],[1.4,3.5,3.5]],.04,'#d9b367',true);
      // The tree moves with its ground during part separation too.
      const energyPart=part('sun-tree',msg('Sunlight and tree'),energy,C.green,'sunlight');
      // Keep foliage green when the native print exporter groups the tree
      // with its much larger golden Sun and connecting energy paths.
      energyPart.swatches=['#75513b','#668958','#819c63','#b6bd7c','#efba5d','#d9b367'].map(color=>({color,keepSmall:true}));
      separated(energy,[0,0,-2.5]);
      label('sun',msg('Sunlight'),msg('Fusion in the Sun supplies the light that plants use in photosynthesis.'),sun,[0,1.1,0],'sunlight');
      label('tree',msg('Growing wood'),msg('Photosynthesis builds energy-rich material from carbon dioxide and water.'),tree,[0,3.8,0],'sunlight');
    }
  } else { buildMechanism(scene,M,{root,shapes,layer,part,label,separated,poses,sparks,arrow}); }

  function pose(t) {const time=((t%5)+5)%5;for(const f of poses)f(time,explode);}
  pose(0);
  // Bounds include the entire story set, moving particles and separated parts.
  const bounds = {
    shore:{min:[-11.5,0,-9],max:[11.5,12,9]}, sunlight:{min:[-11.5,0,-9],max:[11.5,12.5,9]},
    pyrolysis:{min:[-9,0,-3],max:[10,11,4.5]}, reaction:{min:[-10,0,-4],max:[10,11.4,6]},
    heat:{min:[-11.5,0,-3],max:[11.5,13,7]}, light:{min:[-9,0,-3.5],max:[10.5,13,4.5]},
  }[scene];
  return {
    root,title:TITLES[scene],duration:FIGURE_DURATION,layers,labels,parts,bounds,
    update(t,dt,state){lastT=t;explode=state?.explode??explode;pose(t);},
    setLayer(id,visible){const g=groups.get(id);if(g)g.visible=visible;},
    setExplode(amount){explode=Math.max(0,Math.min(1,amount));pose(lastT);},
    dispose(){const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry)});for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();for(const m of M.materials.values())m.dispose();},
  };
}
