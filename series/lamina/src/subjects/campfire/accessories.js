import * as THREE from 'three/webgpu';
import { color, mix, mx_noise_float, uv, vec3 } from 'three/tsl';
import { createDaughterHair } from './daughter-hair.js';

/*
 * Headwear is authored in an eye-centred frame: +Y up, +Z toward the face.
 * Canonical skull: width 2, crown +1.6, depth 2.04; eye line Y=0.
 * Width/depth measure the skull; height is eye-to-crown distance * 2.7/1.6.
 * The frame origin is at skull-centre Z, not the protruding corneal surface.
 * These are original meshes, except the four outlined IBM Plex glyphs below.
 */
const TAU = Math.PI * 2;
const V = (p) => new THREE.Vector3(...p);

function surface(fn, nu = 48, nv = 24) {
  const p = [], ix = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    p.push(...fn(i / nu, j / nv));
    if (j < nv && i < nu) {
      const a = j * (nu + 1) + i;
      ix.push(a, a + nu + 1, a + 1, a + 1, a + nu + 1, a + nu + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(ix); g.computeVertexNormals();
  return g;
}

function roundedFrame(cx, cy, w, h, r, z) {
  const pts = [];
  const corners = [[cx + w/2-r, cy+h/2-r, 0], [cx-w/2+r, cy+h/2-r, Math.PI/2],
    [cx-w/2+r, cy-h/2+r, Math.PI], [cx+w/2-r, cy-h/2+r, Math.PI*1.5]];
  for (const [x, y, a] of corners) for (let i=0; i<12; i++) {
    const q=a+i/12*Math.PI/2;
    pts.push([x+Math.cos(q)*r, y+Math.sin(q)*r, z-.07*Math.abs(x)]);
  }
  return pts;
}

function glyphShapes(path, offset) {
  const p = new THREE.ShapePath(), tokens=path.match(/[A-Z]|-?(?:\d*\.)?\d+/g);
  let n=0, x=0, y=0;
  while(n<tokens.length) {
    const cmd=tokens[n++], number=()=>Number(tokens[n++]);
    if(cmd==='M'){x=number();y=number();p.moveTo(x+offset,y);}
    else if(cmd==='L'){x=number();y=number();p.lineTo(x+offset,y);}
    else if(cmd==='H'){x=number();p.lineTo(x+offset,y);}
    else if(cmd==='V'){y=number();p.lineTo(x+offset,y);}
    else if(cmd==='Q'){const a=number(),b=number();x=number();y=number();p.quadraticCurveTo(a+offset,b,x+offset,y);}
    else if(cmd==='Z')p.currentPath.closePath();
    else throw new Error(`Unsupported Head glyph command ${cmd}`);
  }
  return p.toShapes();
}

// Four glyphs from IBM Plex Sans Condensed Regular, Copyright 2019 IBM Corp.,
// SIL Open Font License 1.1. Existing @fontsource/ibm-plex-sans-condensed is the
// source font and carries the full license. The geometry spells the user's word
// "Head"; it does not reproduce a separate brand symbol or logo drawing.
const HEAD_GLYPHS = [
  [637,'M474 318H163V0H83V698H163V388H474V698H554V0H474Z'],
  [495,'M252 -12Q207 -12 168 3Q129 18 101 51Q73 84 57 135Q41 186 41 258Q41 330 57 381Q73 432 101 465Q129 498 168 513Q207 528 252 528Q297 528 334.5 513Q372 498 398 465Q424 432 438.5 381Q453 330 453 258V239H122V206Q122 130 156.5 92.5Q191 55 252 55Q304 55 337 77.5Q370 100 389 145L441 107Q417 54 370.5 21Q324 -12 252 -12ZM252 464Q190 464 156 425Q122 386 122 310V297H372V310Q372 464 252 464Z'],
  [483,'M402 0Q328 0 328 74V84H318Q305 37 270.5 12.5Q236 -12 188 -12Q113 -12 76 26Q39 64 39 138Q39 210 86.5 252Q134 294 235 294H328V351Q328 408 302.5 435Q277 462 222 462Q177 462 149.5 442.5Q122 423 102 386L57 428Q77 470 121 498.5Q165 527 225 527Q313 527 358.5 484.5Q404 442 404 359V67H456V0ZM207 54Q233 54 255.5 63Q278 72 294 86.5Q310 101 319 119.5Q328 138 328 158V236H233Q173 236 145.5 216Q118 196 118 158V130Q118 91 142 72.5Q166 54 207 54Z'],
  [524,'M372 84H362Q347 33 313.5 10.5Q280 -12 232 -12Q186 -12 151 7Q116 26 92 61Q68 96 56 146Q44 196 44 258Q44 320 56 370Q68 420 92 455Q116 490 151 509Q186 528 232 528Q280 528 313.5 505.5Q347 483 362 432H372V740H448V0H372ZM255 56Q279 56 300.5 63Q322 70 337.5 83Q353 96 362.5 114Q372 132 372 154V362Q372 384 362.5 402Q353 420 337.5 433Q322 446 300.5 453Q279 460 255 460Q192 460 159 420.5Q126 381 126 310V206Q126 135 159 95.5Q192 56 255 56Z'],
];

/**
 * Attach to a head-following frame at eye-line Y and skull-centre X/Z.
 * `headDimensions.height` scales eye-to-crown anatomy, as documented above.
 * `update(t)` is deterministic and periodic in 5 seconds; call it after posing
 * the skeleton. It moves only the two braid tails, by a deliberately small sway.
 */
export function createAccessories(M, parent, {
  child=false, headDimensions={width:2,height:2.7,depth:2.04},
  position=[0,0,0], hairColor='#674532', braidLength=1,
}={}) {
  const root=new THREE.Group();root.name=child?'braids-and-fringe':'head-cap-and-glasses';
  root.position.set(...position);
  root.scale.set(headDimensions.width/2,headDimensions.height/2.7,headDimensions.depth/2.04);
  parent.add(root);
  const owned=[];
  const material=(hex,kind='cloth')=>{
    const key=`accessory:${kind}:${hex}`;
    if(!M.materials.has(key)) {
      const base=color(hex); let colorNode,roughnessNode;
      if(kind==='hair') {
        const strand=mx_noise_float(vec3(uv().x.mul(28),uv().y.mul(.8),.37)).mul(.5).add(.5);
        colorNode=mix(base.mul(.72),base.mul(1.17),strand);
        roughnessNode=mix(.58,.84,strand);
      }
      const mat=M.ctx.ink({color:hex,svgColor:hex,colorNode,
        roughness:kind==='metal'?.32:kind==='hair'?.76:.84,
        sheen:0,
        metalness:kind==='metal'?.28:0,hatch:0,crossHatch:0,side:THREE.DoubleSide});
      if(roughnessNode)mat.roughnessNode=roughnessNode;
      M.materials.set(key,mat);
    }
    return M.materials.get(key);
  };
  const mesh=(geometry,hex,parent=root,name='Accessory',kind='cloth')=>{
    const m=new THREE.Mesh(geometry,material(hex,kind));m.name=name;parent.add(m);owned.push(m);return m;
  };
  const line=(points,r,hex,parent=root,name='Seam',kind='cloth',closed=false,steps=40)=>{
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(V),closed),steps,r,8,closed),hex,parent,name,kind);
  };
  const ellipsoid=(p,scale,hex,parent=root,name='Accessory',kind='cloth')=>{
    const geo=new THREE.SphereGeometry(1,24,14);geo.scale(...scale);geo.translate(...p);return mesh(geo,hex,parent,name,kind);
  };
  const braidRoots=[];

  if(child) {
    createDaughterHair({root,mesh,ellipsoid,hairColor,braidLength,braidRoots});
  } else {
    const cap=new THREE.Group();cap.name='Head cap';root.add(cap);
    const cloth='#151515',seam='#292929';
    const capPoint=(a,t,extra=0)=>[
      (1.075+extra)*Math.sin(t)*Math.sin(a),
      .36+(1.32+extra)*Math.cos(t),
      ((Math.cos(a)>0?1.34:1.205)+extra)*Math.sin(t)*Math.cos(a)
        +.22*Math.cos(t)**2-.035,
    ];
    mesh(surface((u,v)=>capPoint(u*TAU,v*Math.PI/2),64,28),cloth,cap,'Soft six-panel crown');
    for(let panel=0;panel<6;panel++) {
      const a=panel*TAU/6,pts=[];for(let k=0;k<=35;k++)pts.push(capPoint(a,.06+k/35*(Math.PI/2-.06),.007));
      line(pts,.007,seam,cap,'Subtle crown seam');
    }
    ellipsoid([0,1.69,.185],[.056,.023,.056],seam,cap,'Cap button');
    const band=[];for(let i=0;i<=80;i++)band.push(capPoint(i/80*TAU,Math.PI/2,.003));
    line(band,.026,cloth,cap,'Cap hem', 'cloth',true,80);
    const outline=new THREE.Shape();outline.moveTo(-.93,.55);
    outline.bezierCurveTo(-1.15,1.08,-1.13,1.59,-.85,1.83);
    outline.bezierCurveTo(-.48,2.06,.48,2.06,.85,1.83);
    outline.bezierCurveTo(1.13,1.59,1.15,1.08,.93,.55);
    outline.bezierCurveTo(.60,.96,-.60,.96,-.93,.55);
    const bill=new THREE.ExtrudeGeometry(outline,{depth:.026,bevelEnabled:true,bevelSegments:2,bevelSize:.014,bevelThickness:.008,curveSegments:24,steps:1});
    const bp=bill.attributes.position;
    for(let i=0;i<bp.count;i++){const x=bp.getX(i),z=bp.getY(i),h=bp.getZ(i);bp.setXYZ(i,x,.355+h-.14*(z-.6)/1.4+.035*x*x,z);}
    bill.computeVertexNormals();mesh(bill,cloth,cap,'Curved cap bill');
    // Raised, curved lettering stays real geometry, including the counters.
    let offset=0;const shapes=[];for(const [advance,path]of HEAD_GLYPHS){shapes.push(...glyphShapes(path,offset));offset+=advance;}
    const letters=new THREE.ExtrudeGeometry(shapes,{depth:7,bevelEnabled:false,curveSegments:7,steps:1}),lp=letters.attributes.position;
    const letterScale=1.16/offset;
    for(let i=0;i<lp.count;i++){
      const x=(lp.getX(i)-offset*.5)*letterScale,y=.64+lp.getY(i)*letterScale;
      const polar=(y-.36)/1.32;
      const z=1.34*Math.sqrt(Math.max(.01,1-polar**2))*Math.sqrt(Math.max(.01,1-(x/1.075)**2))+.22*polar**2-.035+.019+lp.getZ(i)*letterScale;
      lp.setXYZ(i,x,y,z);
    }
    letters.computeVertexNormals();mesh(letters,'#e5dcc6',cap,'Head lettering');
    // Restrained rectangular frames: rounded corners, shaped bridge and real
    // temple arms. Clear lenses are omitted so they cannot mask the pupils.
    const glasses=new THREE.Group();glasses.name='Thin optical glasses';root.add(glasses);
    for(const side of [-1,1]) {
      const frame=roundedFrame(side*.48,-.015,.74,.43,.105,1.28);
      line(frame,.018,'#3d4142',glasses,'Rounded rectangular lens rim','metal',true,64);
      line([[side*.86,.035,1.22],[side*1.015,.045,.78],[side*1.02,.015,.12],
        [side*1.015,-.11,-.10]],.021,'#3d4142',glasses,'Glasses temple','metal',false,28);
      ellipsoid([side*.865,.05,1.225],[.037,.024,.029],'#6f7776',glasses,'Glasses hinge','metal');
      line([[side*.21,.17,1.268],[side*.36,.197,1.261],[side*.50,.197,1.250]],.006,'#bac4c0',glasses,'Frame highlight','metal',false,16);
    }
    line([[-.12,.05,1.275],[-.075,.105,1.325],[0,.12,1.345],[.075,.105,1.325],[.12,.05,1.275]],.017,'#4b5151',glasses,'Glasses bridge','metal',false,28);
  }

  return {root,meshes:owned,braidRoots,
    update(t){const phase=TAU*((t%5+5)%5)/5;braidRoots.forEach((g,i)=>{g.rotation.z=.012*Math.sin(phase+(i?-.55:.55));g.rotation.x=.008*Math.sin(phase);});},
  };
}
