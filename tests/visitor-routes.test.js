import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {learningRoute} from '../src/learning-tools.js';
import {routeAccess} from '../src/access-policy.js';
import {renderSignIn} from '../src/sign-in.js';

const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function router(open){
  const nodes=new Map(),node=()=>({innerHTML:'',classList:{add(){},remove(){}},setAttribute(){}});
  const context=vm.createContext({PUBLIC_LABS_OPEN:open,MEMBER_CONTENT:open,OWNER_PREVIEW:false,routeAccess,learningRoute,
    location:{hash:''},document:{title:'',body:node()},window:{scrollTo(){}},
    $:selector=>{if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},$$:()=>[],
    labNavigation:null,currentLab:null,routeCleanup:null,reportCleanup:null,classroomConnection:null,
    CATALOG:[],disposeHardware(){},preserveCodeDraft(){},esc:value=>String(value)});
  vm.runInContext(source.slice(source.indexOf('function activityNotFound('),source.indexOf('\nfunction checkCapstoneState(')),context);
  vm.runInContext(source.slice(source.indexOf('function renderRoute('),source.indexOf('\nfunction setSiteMenuOpen(')),context);
  return {context,render(hash){context.location.hash=hash;context.renderRoute();return nodes.get('#main').innerHTML;}};
}

test('unknown activity URLs show recovery links and never inherit membership copy in either release mode',()=>{
  for(const open of [true,false]){
    const r=router(open);
    for(const hash of ['#doesnotexist','#lab/FAKE-999','#membership/extra','#arcade/missing','#explore/missing','#learn/__proto__']){
      const html=r.render(hash);
      assert.match(html,/<h1>Activity not found<\/h1>/u);
      assert.match(html,/href="#labs"/u);assert.match(html,/href="#explore"/u);
      assert.doesNotMatch(html,/membership|reserved for members|FAKE-999|__proto__/iu);
      assert.equal(r.context.document.title,'Activity not found · Cole Learning Labs');
    }
    const html=r.render('#membership');
    assert.match(html,open?/All labs are open right now/u:/This activity requires membership/u);
    assert.equal(r.context.document.title,open?'Open lab access · Cole Learning Labs':'Membership required · Cole Learning Labs');
  }
});

test('open access leads to labs and keeps the protected sign-in destination in a closed disclosure',()=>{
  const html=renderSignIn({openLabs:true}),visible=html.replace(/<details\b[\s\S]*?<\/details>/gu,'');
  assert.match(visible,/<h1[^>]*>No sign-in needed<\/h1>/u);
  assert.match(visible,/href="#labs"/u);assert.doesNotMatch(visible,/pages\.dev|Verify your account/u);
  assert.match(html,/<details class="sign-in-approved"><summary>Previously approved account access/u);
  assert.match(html,/href="https:\/\/codex-private-owner-preview\.cole-learning-labs\.pages\.dev\/learn\/"/u);
  assert.match(html,/authenticator checks/u);
});
