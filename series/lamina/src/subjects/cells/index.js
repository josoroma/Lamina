// Microscopy-inspired teaching models. Scale, colour, and timing are
// illustrative; no scene claims measured molecular coordinates or dynamics.
import * as THREE from 'three/webgpu';
import { FIGURE_DURATION } from '../../engine/figures/contract.js';
import { Model } from './model.js';
import { organization,membrane,protein,energy,photosynthesis,division } from './scenes.js';
const BUILDERS={organization,membrane,protein,energy,photosynthesis,division};
export const CELL_SCENES=Object.keys(BUILDERS);
export function createFigure(params={},ctx){const key=params.scene??'organization',build=BUILDERS[key];if(!build)throw new Error(`Unknown cell scene: ${key}`);const K=new Model(ctx);K.root.name=`cell-${key}`;const scene=build(K);let time=0,exploded=0;const box=new THREE.Box3();for(const t of[0,1,2,3,4,5]){scene.pose(t,0);K.root.updateMatrixWorld(true);box.expandByObject(K.root);}box.expandByScalar(.15);scene.pose(0,0);return{root:K.root,title:scene.title,duration:FIGURE_DURATION,layers:K.layers,labels:K.labels,parts:K.parts,bounds:{min:box.min.toArray(),max:box.max.toArray()},update(t,dt,state){time=((t%5)+5)%5;exploded=state?.explode??exploded;scene.pose(time,exploded);},setLayer(id,on){const g=K.groups.get(id);if(g)g.visible=on;},setExplode(a){exploded=Math.max(0,Math.min(1,a));scene.pose(time,exploded);},dispose(){K.dispose();}};}
