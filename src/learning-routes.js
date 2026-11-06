// Route parsing shared by the start-up bundle and every lazily loaded learning route.
// It stays free of lab content so the home page can parse a URL without downloading a workbench.
export const learningModes = Object.freeze([
  Object.freeze({id:'guided',label:'Guided',description:'Start with a model, visible question starters, and a step-by-step reasoning prompt.'}),
  Object.freeze({id:'independent',label:'Independent',description:'Choose your own first question and test. Open the model or vocabulary whenever useful.'}),
  Object.freeze({id:'challenge',label:'Challenge',description:'Compare another possible cause and explain a result that would distinguish it. Support remains available.'})
]);
export function learningRoute(hash) {
  const [path,query='']=String(hash||'').replace(/^#/,'').split('?'),params=new URLSearchParams(query);
  const [page='home',id,step]=path.split('/');
  const mode=learningModes.some(item=>item.id===params.get('mode'))?params.get('mode'):'guided';
  const route={page:page||'home',id,mode,sequence:params.get('sequence')==='opening-day'?'opening-day':null};
  if(['arcade','quests'].includes(page)&&path.split('/').length>2)return {page:'unknown',id:undefined,mode:'guided',sequence:null};
  if(page==='play'&&path!=='play/inbox-defender')return {page:'unknown',id:undefined,mode:'guided',sequence:null};
  // Starting style only. A link never selects a message, a decision or a finished shift.
  if(page==='play'&&params.get('style')==='picture')route.style='picture';
  if(page==='signin'&&path!=='signin')return {page:'unknown',id:undefined,mode:'guided',sequence:null};
  if(page==='explore'){
    if(path.split('/').length>2)return {page:'unknown',id:undefined,mode:'guided',sequence:null};
    const band=[['k1','K–1'],['2-3','2–3'],['4-6','4–6']].find(([code])=>code===params.get('band'))?.[1];
    if(!id&&band)route.band=band;
  }
  if(page==='lab')route.section=Math.max(1,['request','workbench','explain'].indexOf(step)+1);
  return route;
}
export function labPageHash(id,section,{mode='guided',sequence=null}={}) {
  const step=['request','workbench','explain'][Number(section)-1]||'request';
  const params=new URLSearchParams({mode:learningModes.some(item=>item.id===mode)?mode:'guided'});
  if(sequence==='opening-day')params.set('sequence',sequence);
  return '#lab/'+encodeURIComponent(id)+'/'+step+'?'+params;
}
