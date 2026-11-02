#!/usr/bin/env node
// Browser regression for the seated campfire support hand. Requires a running
// server; LAMINA_URL defaults to port 5173. This checks cloth contact and connected
// skin, not aesthetic quality or naturalness. It intentionally does not use the
// production contact solver, its height grid, or character userData.
import { chromium } from 'playwright-core';

const base=process.env.LAMINA_URL??'http://127.0.0.1:5173';
const browser=await chromium.launch({channel:'chrome',headless:true,args:[
  '--enable-unsafe-webgpu','--enable-features=WebGPU','--use-angle=metal','--ignore-gpu-blocklist',
]});
const failures=[];
const page=await browser.newPage({viewport:{width:1200,height:900}});
page.on('pageerror',error=>failures.push(`Runtime: ${error.message}`));
page.on('console',message=>{if(message.type()==='error')failures.push(`Console: ${message.text()}`)});

try {
  await page.goto(`${base}/#/en/fogata?plate=1&t=0&ui=0&labels=0`);
  await page.waitForFunction(()=>window.lamina?.ready,null,{timeout:120000});
  await page.evaluate(()=>lamina.ready);
  await page.evaluate(()=>{
    const Vector=lamina.stage.camera.position.constructor;
    const digits=['thumb','index','middle','ring','pinky'];
    const renderedIndices=mesh=>{
      const geometry=mesh.geometry,index=geometry.index;
      const length=index?.count??geometry.attributes.position.count;
      const start=geometry.drawRange.start||0,end=Math.min(length,start+geometry.drawRange.count);
      const used=new Set();for(let i=start;i<end;i++)used.add(index?index.getX(i):i);
      return [...used];
    };
    const skinWeight=(mesh,index,test)=>{
      const attributes=mesh.geometry.attributes;let result=0;
      for(let k=0;k<4;k++){
        const bone=mesh.skeleton.bones[attributes.skinIndex.getComponent(index,k)];
        if(test(bone.name))result+=attributes.skinWeight.getComponent(index,k);
      }
      return result;
    };
    const isHand=name=>name==='hand_r'||/^(thumb|index|middle|ring|pinky)_0[123]_r$/.test(name);
    const isPalm=name=>name==='hand_r';
    window.probeSupportHand=role=>{
      const actor=lamina.host.active.figure.root.getObjectByName(`campfire-${role}`);
      if(!actor)throw Error(`Missing ${role}`);
      const body=actor.getObjectByName('Body'),cloth=actor.getObjectByName('trousers');
      if(!body?.isSkinnedMesh||!cloth?.isSkinnedMesh)throw Error(`${role}: missing skinned body or trousers`);
      actor.updateWorldMatrix(true,true);
      const inverse=actor.matrixWorld.clone().invert();
      const posed=mesh=>{
        mesh.skeleton.update();const result=new Map();
        for(const index of renderedIndices(mesh))result.set(index,
          mesh.getVertexPosition(index,new Vector()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));
        return result;
      };
      const skin=posed(body),fabric=posed(cloth);
      const hand=[...skin.keys()].filter(index=>skinWeight(body,index,isHand)>.5);
      const palms=new Set(hand.filter(index=>skinWeight(body,index,isPalm)>.5));
      const regions=Object.fromEntries(digits.map(digit=>[digit,
        hand.filter(index=>skinWeight(body,index,name=>name.startsWith(`${digit}_`)&&name.endsWith('_r'))>.5).length]));

      // Use actual posed, indexed upper-thigh triangles, facing upward in the
      // person's coordinate system. A closed-volume test is inappropriate for
      // this garment because its waist and ankle openings are intentional.
      const upper=[],index=cloth.geometry.index.array;
      for(let i=0;i<index.length;i+=3){
        const ids=[index[i],index[i+1],index[i+2]],points=ids.map(id=>fabric.get(id));
        if(points.some(point=>!point))continue;
        const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
        if(normal.lengthSq()<1e-16||normal.y/normal.length()<.25)continue;
        if(ids.reduce((sum,id)=>sum+skinWeight(cloth,id,name=>name==='thigh_r'),0)/3<.5)continue;
        upper.push(points);
      }
      let sampled=0,palmSampled=0,penetrating=0,minGap=Infinity,palmMinGap=Infinity,maxDepth=0;
      for(const id of hand){
        const point=skin.get(id);let height=-Infinity;
        for(const[a,b,c]of upper){
          const denominator=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
          if(Math.abs(denominator)<1e-12)continue;
          const u=((b.z-c.z)*(point.x-c.x)+(c.x-b.x)*(point.z-c.z))/denominator;
          const v=((c.z-a.z)*(point.x-c.x)+(a.x-c.x)*(point.z-c.z))/denominator,w=1-u-v;
          if(u>=-1e-6&&v>=-1e-6&&w>=-1e-6)height=Math.max(height,u*a.y+v*b.y+w*c.y);
        }
        if(!Number.isFinite(height))continue;
        sampled++;const gap=point.y-height;
        minGap=Math.min(minGap,gap);maxDepth=Math.max(maxDepth,-gap);
        if(gap<-.001)penetrating++;
        if(palms.has(id)){palmSampled++;palmMinGap=Math.min(palmMinGap,gap)}
      }

      // UV seams duplicate positions. Weld those coincident vertices, then
      // traverse actual index edges of the selected palm and five digits.
      const keys=new Map(),adjacency=new Map();
      for(const id of hand){
        const key=skin.get(id).toArray().map(value=>Math.round(value*1e6)).join(',');
        keys.set(id,key);if(!adjacency.has(key))adjacency.set(key,new Set());
      }
      const triangles=body.geometry.index.array;
      for(let i=0;i<triangles.length;i+=3)for(let k=0;k<3;k++){
        const a=keys.get(triangles[i+k]),b=keys.get(triangles[i+(k+1)%3]);
        if(a===undefined||b===undefined)continue;adjacency.get(a).add(b);adjacency.get(b).add(a);
      }
      const unseen=new Set(adjacency.keys());let components=0;
      while(unseen.size){
        components++;const stack=[unseen.values().next().value];
        while(stack.length){const key=stack.pop();if(!unseen.delete(key))continue;
          for(const next of adjacency.get(key))if(unseen.has(next))stack.push(next);
        }
      }
      return {role,handVertices:hand.length,regions,components,sampled,palmSampled,
        penetrating,minGap,palmMinGap,maxDepth,clothTriangles:upper.length};
    };
  });

  for(const plate of [1,4,6]){
    await page.evaluate(async number=>{await lamina.plate(number);lamina.pause();await lamina.settle(200)},plate);
    for(const time of [0,1.25,2.5,3.75,5]){
      await page.evaluate(async value=>{lamina.setTime(value);await lamina.settle(30)},time);
      for(const role of plate===4?['daughter']:['father','daughter']){
        const result=await page.evaluate(role=>probeSupportHand(role),role);
        const problems=[];
        if(result.sampled<20||result.palmSampled<20)problems.push('insufficient actual hand/thigh overlap');
        if(result.penetrating)problems.push(`${result.penetrating} vertices penetrate beyond 1 mm; max ${(result.maxDepth*1000).toFixed(2)} mm`);
        if(!Number.isFinite(result.minGap)||result.minGap>.008)problems.push(`hand gap ${(result.minGap*1000).toFixed(2)} mm exceeds 8 mm`);
        if(!Number.isFinite(result.palmMinGap)||result.palmMinGap>.012)problems.push(`palm gap ${(result.palmMinGap*1000).toFixed(2)} mm exceeds 12 mm`);
        if(result.components!==1)problems.push(`indexed hand has ${result.components} welded components`);
        if(Object.values(result.regions).some(count=>count<10))problems.push(`missing digit skin: ${JSON.stringify(result.regions)}`);
        if(problems.length)failures.push(`Plate ${plate} t=${time} ${role}: ${problems.join('; ')}`);
      }
    }
  }
}catch(error){failures.push(error.stack??error.message)}finally{await browser.close()}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
else console.log('Campfire supporting-hand contact: 25 posed checks passed. Visual anatomy review remains separate.');
