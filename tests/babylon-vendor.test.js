import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as B from '../src/babylon.js';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const sha=text=>createHash('sha256').update(text).digest('hex');
test('the exact locally bundled Babylon version, build entry and Apache notices are recorded',()=>{
  const manifest=JSON.parse(read('docs/BABYLON-SUPPLY-CHAIN.json'));
  assert.equal(B.Engine.Version,'9.31.0');assert.equal(manifest.version,B.Engine.Version);
  assert.equal(manifest.bundlerVersion,'0.28.2');
  assert.equal(sha(read('src/babylon.js')),manifest.bundleSha256);
  assert.equal(sha(read('scripts/babylon-entry.mjs')),manifest.entrySha256);
  assert.equal(Buffer.byteLength(read('src/babylon.js')),manifest.bundleBytes);
  assert.ok(read('docs/THIRD-PARTY.md').includes(`src/babylon.js SHA-256: ${manifest.bundleSha256}`));
  assert.match(manifest.packages['node_modules/@babylonjs/core'].integrity,/^sha512-/);
  assert.equal(manifest.packages['node_modules/@babylonjs/core'].version,'9.31.0');
  assert.match(read('assets/babylon-LICENSE.txt'),/Apache License/);assert.match(read('assets/babylon-NOTICE.txt'),/The Babylon.js team/);
});
test('graphics GUIDs use CSPRNG and remain separate from student or authentication identifiers',()=>{
  const previous=Math.random;
  try{Math.random=()=>{throw Error('Weak randomness must not create graphics GUIDs.');};
    const ids=Array.from({length:256},()=>B.GUID.RandomId());assert.equal(new Set(ids).size,256);
    for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }finally{Math.random=previous;}
});
test('the bundled engine executes real PBR scene geometry, projection and picking without a browser or remote service',()=>{
  const engine=new B.NullEngine({renderWidth:320,renderHeight:240,textureSize:64});
  try{const scene=new B.Scene(engine);scene.useRightHandedSystem=true;
    const camera=new B.FreeCamera('test-camera',new B.Vector3(0,0,5),scene);camera.setTarget(B.Vector3.Zero());
    const box=B.MeshBuilder.CreateBox('test-pc',{size:1},scene);box.material=new B.PBRMaterial('test-steel',scene);box.material.metallic=.5;box.material.roughness=.6;
    box.computeWorldMatrix(true);scene.setTransformMatrix(camera.getViewMatrix(),camera.getProjectionMatrix());
    assert.equal(box.getTotalVertices(),24);assert.equal(box.material.getClassName(),'PBRMaterial');
    const ray=new B.Ray(new B.Vector3(0,0,5),new B.Vector3(0,0,-1));const result=scene.pickWithRay(ray);
    assert.equal(result.hit,true);assert.equal(result.pickedMesh,box);
    const projected=B.Vector3.Project(B.Vector3.Zero(),B.Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(320,240));
    assert.ok(Math.abs(projected.x-160)<.001);assert.ok(Math.abs(projected.y-120)<.001);
    scene.dispose();assert.equal(scene.isDisposed,true);
  }finally{engine.dispose();}
});
test('the selected graphics bundle embeds shader modules and does not require unsafe script evaluation',()=>{
  const bundle=read('src/babylon.js');
  assert.doesNotMatch(bundle,/\bimport\s*\(|\bimport\s+[^;]+\bfrom\s*["'](?:https?:|@babylonjs)/);
  assert.doesNotMatch(bundle,/\bnew\s+Function\s*\(|\beval\s*\(/);
  for(const key of ['SceneLoader','EnvironmentHelper','WebGPUEngine','WebXRDefaultExperience'])assert.equal(B[key],undefined);
  assert.ok(Buffer.byteLength(bundle)<2500000,'Review any increase in the selected graphics payload before publishing.');
});
