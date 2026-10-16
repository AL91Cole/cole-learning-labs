const node = (tag, text, className) => {const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
export function workStatus(record, manager) {
  return (record.closed ? 'Delivered. ' : '') + (manager.persistent ? 'Saved on this device, without local encryption. Export and clear before sharing this profile.' : 'Private session: export before closing, reloading, or leaving this page.');
}
export function mountWorkControls({host, manager, getStore, replaceStore, onChange, onClear, scenarioId}) {
  if (!host) return;
  host.replaceChildren();host.className='work-privacy';
  const title=node('strong', manager.persistent ? 'Device saving is on' : 'Private session · device saving is off');
  const info=node('p', 'Keep real names, emails, student IDs, passwords, and private school details out of notes. This controls local saving; any approved connected-classroom sharing is separate.');
  const saved=node('p', !manager.persistent&&manager.hasSaved() ? 'An earlier saved copy exists on this browser. It is not loaded into this private session.' : '');
  const controls=node('div',null,'button-row');
  const save=node('button',manager.persistent?'Pause device saving':'Save on this device','lab-tool');save.type='button';
  const resume=node('button','Resume saved work','lab-tool');resume.type='button';resume.disabled=!manager.hasSaved();
  const clear=node('button','Clear local lab data','lab-tool');clear.type='button';
  const secure=node('a','Encrypted report tools','lab-tool');secure.href='secure-reports.html';secure.target='_blank';secure.rel='noopener noreferrer';
  controls.append(save,resume,clear,secure);
  const confirm=node('div',null,'work-privacy-confirm');confirm.hidden=true;
  const prompt=node('p');const consent=node('label');const checkbox=node('input');checkbox.type='checkbox';
  consent.append(checkbox,node('span','This is my own approved browser profile. I understand device-saved notes are not encrypted.'));
  const yes=node('button',null,'lab-tool'),cancel=node('button','Cancel','lab-tool');yes.type=cancel.type='button';
  const actions=node('div',null,'button-row');actions.append(yes,cancel);confirm.append(prompt,consent,actions);
  const status=node('p',null,'work-privacy-status');status.setAttribute('role','status');
  let requested='';
  function choose(mode) {
    requested=mode;checkbox.checked=false;confirm.hidden=false;consent.hidden=mode==='clear';yes.disabled=mode!=='clear';
    prompt.textContent=mode==='clear'?'Remove lab records and classroom selection from this browser and clear this page’s work? Export first. This does not delete downloads, clipboard contents, or previously submitted server records. Close other old lab tabs so they cannot save another copy.':mode==='resume'?'Replace this page’s private work with the saved copy and enable device saving? Export this page’s work first.':'Save this page’s work in this browser profile? Another person using the same profile may be able to read it.';
    yes.textContent=mode==='clear'?'Clear local lab data':mode==='resume'?'Resume & save on device':'Enable device saving';
  }
  save.addEventListener('click',()=>{if(manager.persistent){manager.pause();onChange();}else choose('save');});
  resume.addEventListener('click',()=>choose('resume'));clear.addEventListener('click',()=>choose('clear'));
  cancel.addEventListener('click',()=>{confirm.hidden=true;requested='';});checkbox.addEventListener('change',()=>{yes.disabled=!checkbox.checked;});
  yes.addEventListener('click',()=>{
    if(requested!=='clear'&&!checkbox.checked)return;
    if(requested==='clear'){const cleared=manager.clearAll();onClear(cleared);}
    else if(requested==='resume'){const restored=manager.resume();if(restored)replaceStore(restored);else status.textContent='Saved work could not be read. Private work is still on this page.';}
    else if(manager.enable(getStore()))onChange();else status.textContent='Device saving is unavailable. Export your private work before leaving.';
  });
  host.append(title,info,saved,controls,confirm,status);
  if (/^(?:INC-10[1-6]|NET-20[1-3]|AI-30[1-3]|SEC-40[1-3])$/.test(scenarioId||'')) {
    const share=node('a','Assign this public lab through Google Classroom ↗');
    share.href='https://classroom.google.com/share?url='+encodeURIComponent('https://www.colelearninglabs.com/#lab/'+scenarioId);
    share.target='_blank';share.rel='noopener noreferrer';
    const help=node('p','Only the public lab URL is shared when you open Google. No notes, alias, class code, grades, or roster are included. ');help.append(share);host.append(help);
  }
}
