const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Authored controls only. Guidance moves focus; it never performs a task,
// submits work, changes a simulation, or decides whether a learner has passed.
const TARGETS=Object.freeze({
  'arcade-network':'[data-ga="rotate"]:not(:disabled)',
  'arcade-hardware':'[data-ga="select-part"]',
  'arcade-security':'[data-ga="gate"]',
  'arcade-ai':'[data-ga="select-card"]',
  'arcade-coding':'[data-ga="append"]',
  'quest-answer':'[data-cq="choose"],[data-cq-first]',
  'elementary-answer':'[data-elementary-action="choose"]',
  'foundation-item':'[data-foundation-inspect],.foundation-visual button',
  'inbox-evidence':'[data-id-action="inspect"]',
  'sandbox-code':'[data-sandbox-editor]',
  'studio-code':'[data-studio-code]',
  'studio-network':'[data-ns-add]',
  'practice-tools':'[data-practice-workspace] button:not(:disabled)',
  'lab-question':'#student-question',
  'lab-clue':'[data-clue]:not(:disabled):not([aria-pressed="true"])',
  'lab-symptoms':'#symptoms','lab-plan':'#plan','lab-save':'#save-idea',
  'lab-next':'#page-one-next','lab-workspace':'#workspace button:not(:disabled),#coding-editor',
  'lab-test':'#run-hypothesis-test','lab-explain':'#workbench-next',
  'lab-notebook':'[data-experiment-field]','lab-attempt':'[data-experiment-save]',
  'lab-notes':'#notes','lab-reflection':'#reflection','lab-verify':'#verify-task','lab-finish':'#close-ticket'
});

export const GAME_GUIDES=Object.freeze({
  network:{first:'Turn a path tile. Can you join Source to Library?',action:'Show me the path tiles',steps:['Select a tile to turn it a quarter turn. The ends must meet the next tile.','Choose Send packet to test your route.','Follow the highlighted route and the result. Change one thing and test again.']},
  hardware:{first:'Pick a part from the tray, then choose its matching slot.',action:'Show me the parts tray',steps:['Read the mission budget and part labels. Select a part, then its slot in the case.','Fit all six parts. Connect virtual power, switch on, then start the build test.','Read the checks. Switch off and disconnect power before replacing a part.']},
  security:{first:'Change a gate, then see which couriers get through.',action:'Show me the gate switches',steps:['Read the authorized couriers and the task each needs to do.','Set the service, identity and scope gates. Watch what the emergency bypass permits.','Dispatch the couriers. Keep useful access open while holding unauthorized requests.']},
  ai:{first:'Choose a card, then the basket its evidence belongs in.',action:'Show me the cards',steps:['Read the fact on a card. Use the mission rule, not a distracting color.','Select the card, then a basket. You can move it again.','Place every card, then test. Review the marked cards and try another idea.']},
  coding:{first:'Add arrow blocks to tell the rover where to go.',action:'Show me the arrow blocks',steps:['Find the rover, cargo and home on the board or its text map.','Add directions in order. Select a numbered block to remove it.','Run the rover and watch its route. Adjust the blocks, then test every room.']}
});

export function renderLearningBrief({first,steps=[],target,action='Show me where',label='Start here'}={}){
  if(typeof first!=='string'||!first.trim())return '';
  const allowed=Object.hasOwn(TARGETS,target);
  return '<section class="learning-brief" aria-label="Activity instructions"><div class="learning-first"><span class="learning-spark" aria-hidden="true">✦</span><p><strong>'+esc(label)+'</strong> '+esc(first)+'</p>'+(allowed?'<button type="button" class="learning-find" data-guide-target="'+esc(target)+'">'+esc(action)+' <span aria-hidden="true">→</span></button>':'')+'</div>'+(steps.length?'<details class="learning-how"><summary>How this works</summary><ol>'+steps.slice(0,4).map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol><p>Use the buttons with a mouse, touch, or Tab and Enter. Try an idea, read the result, and change your plan.</p></details>':'')+'</section>';
}

export function renderNextChallenge({href,title,copy='',label='Keep exploring'}={}){
  if(typeof href!=='string'||!/^#[a-z][A-Za-z0-9/?=&_-]*$/u.test(href)||typeof title!=='string')return '';
  return '<aside class="learning-next" aria-label="Choose your next activity"><span class="learning-next-mark" aria-hidden="true">✦</span><div><p class="learning-next-label">'+esc(label)+'</p><h3>'+esc(title)+'</h3>'+(copy?'<p>'+esc(copy)+'</p>':'')+'</div><a class="button" href="'+esc(href)+'">Try this next <span aria-hidden="true">→</span></a></aside>';
}

export function renderStartingPoints(){
  return '<details class="learning-starts"><summary>Not sure what to choose? Find your starting point</summary><div class="learning-start-grid">'+[
    ['#explore','Picture adventures · K–6','Choose, check and try again. Short challenges for younger explorers.'],
    ['#learn/hardware','Meet the basics · 7–12','Explore the parts and try one guided task before a full investigation.'],
    ['#arcade/packet-post','Play a quick game','Turn path tiles and find a route for a packet.'],
    ['#quests/python','Learn coding from zero · 7–12','Make a message, then build toward a small project.'],
    ['#lab/INC-101','Solve a mystery · 7–12','Ask Ms. Rivera what happened and investigate her blank monitor.']
  ].map(([href,title,copy])=>'<a href="'+href+'"><strong>'+title+'</strong><span>'+copy+'</span><span aria-hidden="true">→</span></a>').join('')+'</div></details>';
}

export function investigationNextStep({section=1,asked=false,clarified=false,clues=0,symptoms=false,hypothesis=false,saved=false,ready=false,tested=false,passed=false,answered=false,current=false,unfinished=false,verified=false,notes=false,reflection=false,complete=false}={}){
  if(complete)return {message:'You finished the investigation. Review your report, then choose a new mystery.',target:'lab-finish',action:'Review my report'};
  if(section===1){
    if(!asked||!clarified)return {message:'Ask the requester a question about the problem. Their answer can give you a new clue.',target:'lab-question',action:'Ask my first question'};
    if(clues<2)return {message:'Read '+(2-clues)+' more clue'+(clues===1?'':'s')+'. Compare what you can observe with the requester’s answer.',target:'lab-clue',action:'Find a clue'};
    if(!symptoms)return {message:'Describe what you noticed before guessing the cause.',target:'lab-symptoms',action:'Describe the symptoms'};
    if(!hypothesis)return {message:'Suggest a cause and explain which clue supports your idea.',target:'lab-plan',action:'Write my first idea'};
    if(!saved)return {message:'Save your symptoms and first idea. You can change your mind after testing.',target:'lab-save',action:'Find Save first idea'};
    return {message:'Your request and clues are ready. Try your idea at the workbench.',target:'lab-next',action:'Find the next step'};
  }
  if(section===2){
    if(ready)return {message:'Your current test and evidence are ready. Explain what changed and what the result supports.',target:'lab-explain',action:'Find Check & explain'};
    if(passed&&(unfinished||!answered))return {message:'Record your prediction, evidence, change, observation and explanation in the notebook. Then save the tested attempt.',target:'lab-notebook',action:'Find the experiment notebook'};
    if(passed&&!current)return {message:'The setup changed after the saved attempt. Test it again and save the new evidence.',target:'lab-test',action:'Find Test my idea'};
    if(passed)return {message:'Review the notebook and save the attempt that shows the original task working.',target:'lab-attempt',action:'Find Save this attempt'};
    return tested?{message:'Read the latest test result. Change one thing at the workbench and test your new idea.',target:'lab-workspace',action:'Find the workbench controls'}:{message:'Try one change at the workbench, then choose Test my idea to see what it does.',target:'lab-workspace',action:'Find the workbench controls'};
  }
  if(!verified)return {message:'Check the original task against the current setup. A changed setup needs a fresh check.',target:'lab-verify',action:'Find the task check'};
  if(!notes)return {message:'Describe what you changed and what the test actually showed.',target:'lab-notes',action:'Explain the change'};
  if(!reflection)return {message:'Explain whether the evidence supported your idea and what you learned.',target:'lab-reflection',action:'Reflect on the result'};
  return {message:'Your evidence and explanation are ready. Finish, then review your report.',target:'lab-finish',action:'Find Finish investigation'};
}

export function mountLearningGuides(root){
  if(!root?.addEventListener)return ()=>{};
  let disposed=false;
  const click=event=>{
    const button=event.target?.closest?.('button[data-guide-target]');
    if(disposed||!button||!root.contains(button)||button.disabled||!Object.hasOwn(TARGETS,button.dataset.guideTarget))return;
    const target=[...root.querySelectorAll(TARGETS[button.dataset.guideTarget])].find(node=>!node.disabled&&!node.closest?.('[hidden]')&&(!node.getClientRects||node.getClientRects().length));
    if(!target)return;
    target.focus({preventScroll:true});target.scrollIntoView?.({block:'center',behavior:'instant'});
  };
  root.addEventListener('click',click);return ()=>{if(disposed)return;disposed=true;root.removeEventListener('click',click);};
}
