const steps = ['Find clues','Save an idea','Make a change','Test & record','Check & finish'];
const causes = ['The cable is unplugged.','The screen is too dim.'];
const predictions = ['The class site opens.','The connection still fails.'];

export function createTutorialState() {
  return {step:0,asked:false,clues:[],symptom:false,cause:-1,ideaSaved:false,connected:false,changed:false,prediction:-1,test:'',attemptSaved:false,verified:false,finished:false};
}

export function tutorialCanAdvance(state,step=state.step) {
  return [state.asked&&state.clues.length===2,state.ideaSaved,state.changed,state.test==='success'&&state.attemptSaved,state.finished][step]===true;
}

function reachableStep(state) {
  let step=0;
  while(step<4&&tutorialCanAdvance(state,step)) step++;
  return step;
}

export function tutorialTransition(state,action,value) {
  let next={...state,clues:[...state.clues]};
  if(action==='reset') return createTutorialState();
  if(action==='go') {
    if(Number.isInteger(value)&&value>=0&&value<=reachableStep(state)) next.step=value;
  } else if(action==='next'&&state.step<4&&tutorialCanAdvance(state)) next.step++;
  else if(action==='ask'&&state.step===0) next.asked=true;
  else if(action==='clue'&&state.step===0&&[0,1].includes(value)&&!next.clues.includes(value)) next.clues.push(value);
  else if(action==='symptom'&&state.step===1) next.symptom=true;
  else if(action==='cause'&&state.step===1&&[0,1].includes(value)) {next.cause=value;next.ideaSaved=false;}
  else if(action==='save-idea'&&state.step===1&&state.symptom&&state.cause>=0) next.ideaSaved=true;
  else if(action==='cable'&&[2,3].includes(state.step)) {
    next.connected=!state.connected;next.changed=true;next.test='';next.attemptSaved=false;next.verified=false;next.finished=false;
  } else if(action==='prediction'&&state.step===3&&[0,1].includes(value)) {
    next.prediction=value;next.test='';next.attemptSaved=false;next.verified=false;next.finished=false;
  } else if(action==='test'&&state.step===3&&state.prediction>=0) {
    next.test=state.connected?'success':'error';next.attemptSaved=false;next.verified=false;next.finished=false;
  } else if(action==='save-attempt'&&state.step===3&&state.test) next.attemptSaved=true;
  else if(action==='verify'&&state.step===4&&state.test==='success'&&state.attemptSaved&&state.connected) next.verified=true;
  else if(action==='finish'&&state.step===4&&state.verified) next.finished=true;
  return next;
}

function button(label,action,options={}) {
  return '<button type="button" class="button '+(options.outline?'button-outline':'')+'" data-tour-action="'+action+'"'+(options.value===undefined?'':' data-tour-value="'+options.value+'"')+(options.disabled?' disabled':'')+(options.pressed===undefined?'':' aria-pressed="'+options.pressed+'"')+'>'+label+'</button>';
}

function diagram(state,control=false) {
  const result=state.test==='success'?'The class site opened.':state.test==='error'?'Packet stopped: the cable is unplugged.':state.connected?'Cable connected. Ready to test.':'Cable unplugged. The class site cannot be reached.';
  return '<div class="tour-network '+(state.connected?'is-connected ':'')+(state.test?'tour-signal-'+state.test:'')+'"><div class="tour-network-path" aria-hidden="true"><span class="tour-device"><span class="tour-device-icon">▣</span>Laptop</span><span class="tour-wire"><i class="tour-packet"></i></span><span class="tour-device"><span class="tour-device-icon">▤</span>Switch</span><span class="tour-wire tour-wire-fixed"><i class="tour-packet"></i></span><span class="tour-device"><span class="tour-device-icon">▧</span>Class site</span></div><p class="tour-link-status">'+result+'</p>'+(control?button(state.connected?'Disconnect cable':'Connect cable','cable',{outline:true,pressed:state.connected}):'')+'</div>';
}

function task(state) {
  if(state.step===0) return '<p class="tour-request"><strong>Your request:</strong> Help a fictional student open the class site.</p>'+button(state.asked?'Question asked':'Ask: What happened?','ask',{outline:true,disabled:state.asked})+(state.asked?'<p class="tour-reply"><strong>Requester:</strong> “The class site stopped opening after I moved my laptop.”</p>':'')+diagram(state)+'<p>Select both clues. What do you notice?</p><div class="tour-choice-grid">'+button(state.clues.includes(0)?'✓ Browser: “No connection.”':'Inspect the browser','clue',{value:0,outline:true,pressed:state.clues.includes(0)})+button(state.clues.includes(1)?'✓ Cable: unplugged from laptop.':'Inspect the cable','clue',{value:1,outline:true,pressed:state.clues.includes(1)})+'</div>';
  if(state.step===1) return '<p>Keep what you see separate from what you think caused it.</p><fieldset class="tour-fieldset"><legend>Symptom · What happened?</legend>'+button('The class site will not open.','symptom',{outline:true,pressed:state.symptom})+'</fieldset><fieldset class="tour-fieldset"><legend>Possible cause · Your first idea</legend><div class="tour-choice-grid">'+causes.map((cause,index)=>button(cause,'cause',{value:index,outline:true,pressed:state.cause===index})).join('')+'</div></fieldset>'+button(state.ideaSaved?'First idea saved':'Save first idea','save-idea',{disabled:!state.symptom||state.cause<0||state.ideaSaved})+'<p class="tour-hint">A first idea can be wrong. Your test will give you more evidence.</p>';
  if(state.step===2) return '<p>Use the cable control. Watch the connection change.</p>'+diagram(state,true)+'<p class="tour-hint">In a lab, change one thing before testing.</p>';
  if(state.step===3) return '<p>Predict, run a test, then save what happened.</p>'+diagram(state,true)+'<fieldset class="tour-fieldset"><legend>My prediction</legend><div class="tour-choice-grid">'+predictions.map((prediction,index)=>button(prediction,'prediction',{value:index,outline:true,pressed:state.prediction===index})).join('')+'</div></fieldset><div class="tour-actions">'+button('Send test packet','test',{disabled:state.prediction<0})+'</div>'+(state.test?'<div class="tour-result '+(state.test==='success'?'is-success':'is-error')+'"><strong>'+ (state.test==='success'?'Success · site reached':'No connection · try another change')+'</strong><p>'+ (state.test==='success'?'The packet reached the class site and a reply came back.':'The packet stopped at the unplugged cable. Connect it and test again.')+'</p></div><details class="tour-notebook" open><summary>Experiment notebook</summary><p><strong>Prediction:</strong> '+predictions[state.prediction]+'</p><p><strong>Clue:</strong> The laptop cable was unplugged.</p><p><strong>Change:</strong> Cable '+(state.connected?'connected':'disconnected')+'.</p><p><strong>Result:</strong> '+(state.test==='success'?'The class site opened.':'The connection failed.')+'</p>'+button(state.attemptSaved?'Attempt saved':'Save attempt','save-attempt',{outline:true,disabled:state.attemptSaved})+'</details>':'<p class="tour-hint">Changing the cable or prediction clears the old result.</p>');
  if(state.finished) return '<div class="tour-result is-success"><strong>Tour complete</strong><p>You found clues, saved an idea, tested a change, and checked the request.</p></div><div class="tour-report"><h3>Your practice report</h3><p><strong>Symptom:</strong> The class site would not open.</p><p><strong>First idea:</strong> '+causes[state.cause]+'</p><p><strong>Evidence:</strong> An unplugged cable; a successful test after connecting it.</p><p><strong>Conclusion:</strong> The connection works with the cable attached.</p></div><p class="tour-hint">In a real lab, add your own explanation, then copy or download the report. Downloading a report does not submit it.</p><div class="tutorial-start"><a class="button" href="#labs">Choose a lab →</a><a class="button button-outline" href="#learn/coding">Try beginner coding</a></div>';
  return '<p>Check the original request before finishing.</p>'+diagram(state)+'<div class="tour-actions">'+button(state.verified?'Original task checked':'Check the original task','verify',{disabled:state.verified})+'</div>'+(state.verified?'<p class="tour-result is-success">The requested class site opens. Add your explanation in a real investigation.</p>':'<p class="tour-hint">A connected cable alone is not proof that the requested task works.</p>');
}

function feedback(state) {
  if(state.finished) return 'Tour complete. Your practice report is ready.';
  if(state.step===0) return (state.asked?'Question asked. ':'Ask the requester what happened. ')+state.clues.length+' of 2 clues inspected.';
  if(state.step===1) return state.ideaSaved?'First idea saved. Next is ready.':'Choose a symptom and a possible cause, then save your idea.';
  if(state.step===2) return state.changed?'Connection updated. Next is ready.':'Connect the cable to try a change.';
  if(state.step===3) return state.attemptSaved?(state.test==='success'?'Successful attempt saved. Next is ready.':'Failed attempt saved. Connect the cable and test again.'):state.test?'Read the result and save this attempt.':'Choose a prediction and send a test packet.';
  return state.verified?'Original task checked. Finish tour is ready.':'Check that the class site opens.';
}

export function renderTutorialPanel(state) {
  const reached=reachableStep(state);
  return '<ol class="tour-progress" aria-label="Tour steps">'+steps.map((label,index)=>'<li>'+button((index+1)+'. '+label,'go',{value:index,outline:true,disabled:index>reached}).replace('data-tour-action="go"','data-tour-action="go"'+(index===state.step?' aria-current="step"':''))+'</li>').join('')+'</ol><article class="tour-task"><p class="eyebrow">TRY IT · STEP '+(state.step+1)+' OF 5</p><h2 id="tutorial-task-title" tabindex="-1">'+steps[state.step]+'</h2>'+task(state)+'<div class="tour-footer">'+button('Restart tour','reset',{outline:true})+(state.finished?'':state.step===4?button('Finish tour & open practice report','finish',{disabled:!state.verified}):button('Next: '+steps[state.step+1]+' →','next',{disabled:!tutorialCanAdvance(state)}))+'</div></article>';
}

export function renderLabTutorial() {
  return '<section class="wrap page-intro"><p class="eyebrow">STUDENT GUIDE · TRY IT FIRST</p><h1>Learn by<br><em>trying a small lab.</em></h1><p>Help a laptop reach its class site. Five short steps show you how labs work.</p><p class="tour-hint">This is a practice tour. It does not earn lab credit or change an investigation.</p></section><section class="wrap tutorial-layout" aria-label="Hands-on lab tour"><div data-tour-panel>'+renderTutorialPanel(createTutorialState())+'</div><p class="tour-feedback" data-tour-status role="status" aria-live="polite" tabindex="-1">'+feedback(createTutorialState())+'</p></section><section class="wrap section tutorial-reference"><h2>Quick help when you need it</h2><details><summary>Choose your next activity</summary><p><a href="#learn/hardware">Learn the basics</a>: explore, practise, and explain. <a href="#labs">Investigations</a>: solve a fictional problem. <a href="#membership">Coding sandbox</a>: build your own project with no ticket or required repair.</p></details><details><summary>Follow the investigation steps</summary><p>Ask a requester question and inspect at least two clues. Save symptoms and your possible cause separately with <strong>Save first idea</strong>. Use the <strong>Experiment notebook</strong> to save your prediction, clue, change, and result. Complete each section to unlock Next.</p></details><details><summary>Use the virtual PC safely</summary><p>For internal parts: turn the PC off, disconnect AC, then remove the side panel. Read each blocked-action message. Use the named <strong>Part controls</strong> for keyboard and touch, or the picture. Match both video cable ends and the monitor <strong>Input</strong>. Secure parts, leads, and the panel before restarting.</p><p>Follow your teacher’s separate safety instructions for physical equipment.</p></details><details><summary>Keep your work and protect privacy</summary><p>Use fictional information. Keep real names, passwords, student IDs, and private school details out of notes and code. Work begins in page memory; closing or reloading can clear it. Optional investigation device saving is an explicit choice and is unencrypted. Sandbox drafts are not included.</p><p>Copy or download important work and open the file to check it. Submit through your teacher’s assignment system when asked. Downloading a report does not submit it.</p></details><details><summary>Keyboard, models, and coding limits</summary><p>Use Tab and Shift+Tab to move; Enter or Space activates buttons. Network, AI, and security tools use fictional local models. Sandbox programs use a limited language; imports, files, network requests, browser objects, and system commands are unavailable.</p></details></section>';
}

export function mountLabTutorial(root) {
  const panel=root.querySelector('[data-tour-panel]');
  const status=root.querySelector('[data-tour-status]');
  if(!panel||!status) return ()=>{};
  let state=createTutorialState(),active=true;
  const actions=new Set(['reset','go','next','ask','clue','symptom','cause','save-idea','cable','prediction','test','save-attempt','verify','finish']);
  const click=event=>{
    const control=event.target.closest?.('[data-tour-action]');
    if(!active||!control||!root.contains(control)||control.disabled) return;
    const action=control.dataset.tourAction;
    if(!actions.has(action)) return;
    const value=control.dataset.tourValue===undefined?undefined:Number(control.dataset.tourValue);
    state=tutorialTransition(state,action,value);
    panel.innerHTML=renderTutorialPanel(state);
    status.textContent=feedback(state);
    if(['go','next','reset','finish'].includes(action)) panel.querySelector('#tutorial-task-title')?.focus({preventScroll:true});
    else {
      const replacement=panel.querySelector('[data-tour-action="'+action+'"]'+(value===undefined?'':'[data-tour-value="'+value+'"]'));
      if(replacement&&!replacement.disabled) replacement.focus({preventScroll:true});
      else {
        const followup=action==='ask'?panel.querySelector('[data-tour-action="clue"][aria-pressed="false"]')||panel.querySelector('[data-tour-action="next"]:not([disabled])'):
          action==='save-idea'?panel.querySelector('[data-tour-action="next"]:not([disabled])'):
          action==='save-attempt'?panel.querySelector(state.test==='success'?'[data-tour-action="next"]:not([disabled])':'[data-tour-action="cable"]'):
          action==='verify'?panel.querySelector('[data-tour-action="finish"]:not([disabled])'):null;
        if(followup) followup.focus({preventScroll:true});
        else status.focus({preventScroll:true});
      }
    }
  };
  root.addEventListener('click',click);
  return ()=>{active=false;root.removeEventListener('click',click);};
}
