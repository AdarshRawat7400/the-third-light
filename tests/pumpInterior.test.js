import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SITES, CLUES } from '../src/story.js';
import { PLAYER_RADIUS, BUILDING_SHAPES } from '../src/collision.js';
import {
  createPumpInterior, PUMP_MACHINE_BLOCKS,
  pumpInteriorBlocksMove, pumpInteriorBlocksMoveFrom,
} from '../src/pumpInterior.js';

const site=SITES.find((entry)=>entry.id==='pump');

function reachableFloor() {
  // A quarter-metre walkability flood from just inside the +z entrance.
  const step=.25;
  const xAt=(i)=>-4.5+i*step;
  const zAt=(i)=>-3.5+i*step;
  const shape=BUILDING_SHAPES.pump;
  const valid=(i,j)=>i>=0&&i<=36&&j>=0&&j<=28
    && Math.abs(xAt(i))<shape.halfWidth-PLAYER_RADIUS
    && Math.abs(zAt(j))<shape.halfDepth-PLAYER_RADIUS
    && !pumpInteriorBlocksMove(site,site.x+xAt(i),site.z+zAt(j),PLAYER_RADIUS);
  const visited=new Set(['18,27']);
  const queue=[[18,27]];
  for(let cursor=0;cursor<queue.length;cursor++) {
    const [i,j]=queue[cursor];
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const ni=i+di,nj=j+dj,key=`${ni},${nj}`;
      if(!valid(ni,nj)||visited.has(key))continue;
      visited.add(key);
      queue.push([ni,nj]);
    }
  }
  return queue.map(([i,j])=>({x:xAt(i),z:zAt(j)}));
}

test('all pump-room clues remain within interaction range of a reachable floor point',()=>{
  const floor=reachableFloor();
  assert.ok(floor.length>300,'central and side service aisles should be connected');
  const roomClues=CLUES.filter((clue)=>clue.room==='pump');
  assert.ok(roomClues.length>=5);
  for(const clue of roomClues) {
    const nearest=Math.min(...floor.map(({x,z})=>Math.hypot(x-clue.x,z-clue.z)));
    assert.ok(nearest<2.75,`${clue.id} must be reachable, nearest ${nearest.toFixed(2)}m`);
  }
  assert.equal(pumpInteriorBlocksMove(site,site.x,site.z+3.3,PLAYER_RADIUS),false);
  for(const block of PUMP_MACHINE_BLOCKS) {
    assert.equal(pumpInteriorBlocksMove(site,site.x+block.x,site.z+block.z,PLAYER_RADIUS),true);
  }
});

test('a preexisting position inside the new machinery can move out, not deeper in',()=>{
  const fromX=site.x-2.25,fromZ=site.z-.74;
  assert.equal(pumpInteriorBlocksMoveFrom(site,fromX,fromZ,fromX-.08,fromZ,PLAYER_RADIUS),false);
  assert.equal(pumpInteriorBlocksMoveFrom(site,fromX-.08,fromZ,fromX,fromZ,PLAYER_RADIUS),true);
});

test('scene cues follow backup, pump, and drain milestones; dispose releases geometry',()=>{
  const scene=new THREE.Scene();
  const interior=createPumpInterior(scene,()=>42,site);
  assert.equal(interior.group.parent,scene);
  assert.equal(interior.group.position.y,42.08);
  assert.equal(interior.obstacles.length,2);
  const generator=interior.group.getObjectByName('generator flywheel');
  const pump=interior.group.getObjectByName('drain pump flywheel');
  const water=interior.group.getObjectByName('tunnel water sight glass');
  const before=water.scale.y;
  interior.update(.08,{standbyEnergized:true,powerRestored:false,tunnelDrained:false},.25);
  assert.ok(generator.rotation.x>0);
  assert.equal(pump.rotation.x,0);
  assert.ok(water.scale.y<before);
  interior.update(.08,{standbyEnergized:true,powerRestored:true,tunnelDrained:true},1);
  assert.ok(pump.rotation.x>0);
  assert.ok(water.scale.y<=.08);
  let released=0;
  interior.group.traverse((node)=>{
    if(node.isMesh)node.geometry.addEventListener('dispose',()=>released++);
  });
  interior.dispose();
  assert.equal(interior.group.parent,null);
  assert.ok(released>10);
  const firstReleaseCount=released;
  interior.dispose();
  assert.equal(released,firstReleaseCount,'dispose is idempotent');
});
