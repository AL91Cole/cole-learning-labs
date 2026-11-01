import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ELEMENTARY_LABS,renderElementaryCatalogue,renderElementaryLab,mountElementaryLab} from '../src/elementary-labs.js';

// Native-button DOM boundary: exercise the real controller and authored models.
// Browser rendering and managed school-device acceptance are separate checks.
const decode=text=>text.replace(/&(?:amp|lt|gt|quot|#39);/gu,value=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[value]));
function fixture(id='EX-HW-1'){
  const document={activeElement:null},listeners=new Map();
  const element=(dataset={})=>({dataset,disabled:false,focus(){document.activeElement=this;},closest(selector){return selector==='button[data-elementary-action]'&&this.dataset.elementaryAction?this:null;}});
  const feedback={textContent:'',dataset:{}},reset=element({elementaryAction:'reset'});
  const body={markup:'',buttons:[],prompt:null,finished:null,
    set innerHTML(markup){
      this.markup=markup;this.buttons=[...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gu)].map(match=>{
        const attrs=Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/gu)].map(attr=>[attr[1],decode(attr[2])]));
        const button=element({elementaryAction:attrs['data-elementary-action'],elementaryChoice:attrs['data-elementary-choice']});
        // The authored choice label is its final span; control labels are plain
        // text. This fixture recognizes that shape rather than sanitizing HTML.
        const label=attrs['data-elementary-choice']?match[2].match(/<span>([^<]*)<\/span>$/u)?.[1]:match[2];
        assert.equal(typeof label,'string','Expected the authored button-label shape.');
        assert.equal(label.includes('<'),false,'Control labels must remain plain text.');
        button.disabled=/\bdisabled\b/u.test(match[1]);button.attributes=attrs;button.textContent=decode(label);return button;
      });
      this.prompt=markup.includes('data-elementary-prompt')?element():null;
      this.finished=markup.includes('data-elementary-finished')?element():null;
    },
    querySelectorAll(selector){assert.equal(selector,'[data-elementary-choice]');return this.buttons.filter(button=>button.dataset.elementaryChoice);},
    querySelector(selector){
      if(selector==='[data-elementary-prompt]')return this.prompt;
      if(selector==='[data-elementary-finished]')return this.finished;
      const action=selector.match(/^\[data-elementary-action="([^"]+)"\]$/u)?.[1];assert.ok(action,selector);
      return this.buttons.find(button=>button.dataset.elementaryAction===action)||null;
    }
  };
  const shell={dataset:{elementaryLab:id,elementaryComplete:'false'},
    querySelector(selector){if(selector==='[data-elementary-body]')return body;if(selector==='[data-elementary-feedback]')return feedback;assert.fail(selector);},
    contains(button){return button===reset||body.buttons.includes(button);},
    addEventListener(name,handler){assert.equal(name,'click');listeners.set(name,handler);},
    removeEventListener(name,handler){assert.equal(listeners.get(name),handler);listeners.delete(name);}
  };
  const root={querySelector(selector){assert.equal(selector,'[data-elementary-lab]');return shell;}};
  const controller=mountElementaryLab(root,{id});
  function button(action,choice){return action==='reset'?reset:body.buttons.find(candidate=>candidate.dataset.elementaryAction===action&&(choice===undefined||candidate.dataset.elementaryChoice===choice));}
  return {id,document,listeners,root,shell,body,feedback,controller,button,
    click(action,choice){const target=button(action,choice);assert.ok(target,`Missing ${id} ${action} ${choice??''}`);if(!target.disabled)listeners.get('click')?.({target});return target;},
    get complete(){return shell.dataset.elementaryComplete==='true';},
    get output(){const text=body.markup.match(/<output data-elementary-output>([^<]*)<\/output>/u)?.[1];return text===undefined?null:decode(text);},
    get progress(){return [...body.markup.matchAll(/<progress\b[^>]*value="(\d+)"/gu)].map(match=>Number(match[1]))[0];}
  };
}

const solutions={
  'EX-HW-1':['screen','keys','mouse'],'EX-NET-1':['left','right','send'],
  'EX-AI-1':['look','blue','help'],'EX-SEC-1':['adult','keep','robot'],'EX-CODE-1':['two','three','two'],
  'EX-HW-2':['off','unplug','adult'],'EX-NET-2':['library','art','none'],
  'EX-AI-2':['some','check','fiction'],'EX-SEC-2':['pause','check','report'],'EX-CODE-2':['five','six','three'],
  'EX-HW-3':['blank','picture','blank'],'EX-NET-3':['address','name','delivered'],
  'EX-AI-3':['sample','wider','limited'],'EX-SEC-3':['canvas','deny','approved'],'EX-CODE-3':['ten','four','fifteen']
};
const finish=view=>{for(const [index,answer] of solutions[view.id].entries()){view.click('choose',answer);assert.equal(view.progress,index,'Selecting cannot award completion.');view.click('check');assert.equal(view.progress,index+1);if(index<2)view.click('next');}assert.equal(view.complete,true);};

test('the authored collection contains three suggested bands and five distinct topics in each, with immutable content',()=>{
  assert.equal(ELEMENTARY_LABS.length,15);assert.equal(new Set(ELEMENTARY_LABS.map(lab=>lab.id)).size,15);
  for(const band of ['K–1','2–3','4–6']){
    const labs=ELEMENTARY_LABS.filter(lab=>lab.band===band);assert.equal(labs.length,5);
    assert.deepEqual(labs.map(lab=>lab.track).sort(),['ai','coding','hardware','network','security']);
    for(const lab of labs){assert.match(lab.id,/^EX-(?:HW|NET|AI|SEC|CODE)-[123]$/u);assert.equal(lab.tasks.length,3);assert.equal(lab.grade,band);}
  }
  assert.ok(Object.isFrozen(ELEMENTARY_LABS));assert.ok(Object.isFrozen(ELEMENTARY_LABS[0].tasks[0].choices[0]));
  assert.throws(()=>{ELEMENTARY_LABS[0].tasks[0].answer='mouse';},TypeError);
});

test('catalogue filtering returns the five real activities for a known band and never reflects unknown input',()=>{
  const links=html=>[...html.matchAll(/href="#explore\/(EX-[A-Z]+-[123])"/gu)].map(match=>match[1]);
  assert.equal(links(renderElementaryCatalogue()).length,15);
  for(const band of ['K–1','2–3','4–6']){
    const html=renderElementaryCatalogue({band});assert.deepEqual(links(html),ELEMENTARY_LABS.filter(lab=>lab.band===band).map(lab=>lab.id));
    assert.match(html,/href="#explore">← All age bands/u);
  }
  const poison='<img src=x onerror=alert(1)>';
  assert.equal(links(renderElementaryCatalogue({band:poison})).length,15);assert.equal(renderElementaryCatalogue({band:poison}).includes(poison),false);
});

test('all activities use labeled pictures and native buttons without free text, enrollment, audio or links to external services',()=>{
  for(const lab of ELEMENTARY_LABS){
    const html=renderElementaryLab(lab.id);
    assert.match(html,/<svg[^>]*role="img"[^>]*aria-label="[^"]+"/u,lab.id);
    assert.match(html,/data-elementary-feedback role="status" aria-live="polite"/u);
    assert.doesNotMatch(html,/<(?:input|textarea|form|iframe|script|audio|video)\b|https?:\/\//iu,lab.id);
    for(const button of html.matchAll(/<button\b([^>]*)>/gu))assert.match(button[1],/type="button"/u);
    assert.match(html,/href="#explore\?band=(?:k1|2-3|4-6)"/u);
  }
});

test('unknown, inherited and malformed lab identifiers cannot mount a controller or appear as page markup',()=>{
  const root=new Proxy({}, {get(){assert.fail('Unknown activity touched the DOM.');}});
  for(const id of [undefined,null,{},[],{toString(){throw Error('Must not coerce');}},'constructor','__proto__','EX-HW-4','ex-hw-1','<script>alert(1)</script>']){
    assert.doesNotThrow(()=>mountElementaryLab(root,{id}).dispose());
    const html=renderElementaryLab(id);assert.match(html,/Choose an available activity/u);assert.doesNotMatch(html,/<script|data-elementary-lab=/u);
  }
  assert.doesNotThrow(()=>mountElementaryLab(null,{id:'EX-HW-1'}).dispose());
});

test('a matching activity needs a checked answer, rejects wrong answers and carries useful focus through the next challenge',()=>{
  const view=fixture();view.click('check');assert.equal(view.progress,0);assert.equal(view.complete,false);
  assert.equal(view.document.activeElement,view.button('choose','screen'),'Checking without an answer focuses a real choice.');
  view.click('choose','keys');assert.equal(view.button('choose','keys').attributes['aria-pressed'],'true');
  view.click('check');assert.equal(view.progress,0);assert.equal(view.feedback.dataset.tone,'retry');
  view.click('choose','screen');view.click('check');assert.equal(view.progress,1);assert.equal(view.complete,false);
  assert.equal(view.document.activeElement,view.button('next'));assert.equal(view.button('choose','screen').disabled,true);
  view.click('next');assert.equal(view.document.activeElement,view.body.prompt);assert.equal(view.progress,1);
  assert.ok(view.body.markup.includes('type letters'));view.controller.dispose();
});

test('a step-order activity refuses a later safety step and never advances from selecting alone',()=>{
  const view=fixture('EX-HW-2');view.click('choose','unplug');view.click('check');
  assert.equal(view.progress,0);assert.equal(view.complete,false);assert.equal(view.feedback.dataset.tone,'retry');
  finish(view);assert.match(view.feedback.textContent,/not permission to open a real device/u);
  assert.equal(view.document.activeElement,view.body.finished);assert.match(view.body.markup,/not a grade/u);view.controller.dispose();
});

test('prediction runs compute counter changes and both conditional branches rather than trusting a choice',()=>{
  const view=fixture('EX-CODE-2');view.click('choose','three');view.click('check');
  assert.equal(view.output,'5');assert.equal(view.progress,0);assert.equal(view.feedback.dataset.tone,'retry');
  view.click('choose','five');assert.equal(view.output,null);view.click('check');assert.equal(view.output,'5');view.click('next');
  view.click('choose','six');view.click('check');assert.equal(view.output,'6');view.click('next');
  view.click('choose','three');view.click('check');assert.equal(view.output,'3');assert.equal(view.complete,true);view.controller.dispose();
  const advanced=fixture('EX-CODE-3');
  for(const [index,[answer,result]] of [['ten','10'],['four','4'],['fifteen','15']].entries()){
    advanced.click('choose',answer);advanced.click('check');assert.equal(advanced.output,result);if(index<2)advanced.click('next');
  }
  assert.equal(advanced.complete,true);advanced.controller.dispose();
});

test('picture models distinguish route failures, display inputs and network prerequisites',()=>{
  for(const [id,expected] of [['EX-NET-2',['Library','Art room','No delivery']],['EX-HW-3',['No picture','Picture visible','No picture']],['EX-NET-3',['Address missing','Name lookup missing','Delivered']],['EX-CODE-1',['Space 2','Space 3','Space 2']]]){
    const view=fixture(id);
    for(const [index,answer] of solutions[id].entries()){
      view.click('choose',answer);view.click('check');assert.equal(view.output,expected[index],id);if(index<2)view.click('next');
    }
    assert.equal(view.complete,true);view.controller.dispose();
  }
});

test('each of the fifteen activities has a complete retryable path, and reset/remount do not retain choices',()=>{
  for(const lab of ELEMENTARY_LABS){
    const view=fixture(lab.id);finish(view);view.click('reset');
    assert.equal(view.progress,0);assert.equal(view.complete,false);assert.equal(view.output,null);
    assert.ok(view.body.buttons.filter(button=>button.dataset.elementaryChoice).every(button=>button.attributes['aria-pressed']==='false'));
    view.click('choose',solutions[lab.id][0]);view.click('check');assert.equal(view.progress,1);
    view.controller.dispose();const next=mountElementaryLab(view.root,{id:lab.id});assert.equal(view.progress,0);assert.equal(view.complete,false);next.dispose();
  }
});

test('forged choices, outside events and early next actions cannot create progress; disposal removes interaction',()=>{
  const view=fixture('EX-SEC-3'),handler=view.listeners.get('click');
  const forged={dataset:{elementaryAction:'choose',elementaryChoice:'not-an-authored-choice'},closest(){return this;},focus(){}};
  handler({target:forged});assert.equal(view.progress,0);
  view.body.buttons.push(forged);handler({target:forged});view.click('check');assert.equal(view.progress,0);
  const next={dataset:{elementaryAction:'next'},closest(){return this;}};view.body.buttons.push(next);handler({target:next});assert.equal(view.progress,0);
  const before=view.body.markup;view.controller.dispose();assert.equal(view.listeners.size,0);assert.doesNotThrow(()=>view.controller.dispose());
  handler({target:forged});assert.equal(view.body.markup,before);
});

test('rendering, checking, resetting and disposing never consult network, browser storage, identity or telemetry',async()=>{
  const descriptors=new Map();
  for(const name of ['fetch','XMLHttpRequest','WebSocket','EventSource','localStorage','sessionStorage','indexedDB','navigator']){
    descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,get(){assert.fail(`Activity consulted ${name}.`);}});
  }
  try{
    renderElementaryCatalogue();
    for(const lab of ELEMENTARY_LABS){renderElementaryLab(lab.id);const view=fixture(lab.id);finish(view);view.click('reset');view.controller.dispose();}
  }finally{for(const [name,descriptor] of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}
  const source=await readFile(new URL('../src/elementary-labs.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|speechSynthesis|eval|Function)\s*(?:\.|\()/u);
  assert.doesNotMatch(source,/^import\b/mu,'The activity does not import a service or a general code runtime.');
});
