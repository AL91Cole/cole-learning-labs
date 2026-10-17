import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MathUtils } from '../src/three.core.js';

test('graphics UUIDs remain valid and never use Math.random as a fallback',()=>{
  const previous=Math.random;
  try {
    Math.random=()=>{throw new Error('Weak randomness must not generate a UUID.');};
    const ids=Array.from({length:256},()=>MathUtils.generateUUID());
    assert.equal(new Set(ids).size,256);
    for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }finally{Math.random=previous;}
});

test('documented hashes identify the reviewed local engine and its license',()=>{
  const notes=readFileSync(new URL('../docs/THIRD-PARTY.md',import.meta.url),'utf8');
  assert.match(notes,/0\.186\.0/);
  assert.match(notes,/CSPRNG/);
  for(const file of ['three.module.js','three.core.js']) {
    const hash=createHash('sha256').update(readFileSync(new URL('../src/'+file,import.meta.url))).digest('hex');
    assert.ok(notes.includes(`src/${file} SHA-256: ${hash}`));
  }
  assert.match(readFileSync(new URL('../assets/three-LICENSE.txt',import.meta.url),'utf8'),/Permission is hereby granted/);
});
