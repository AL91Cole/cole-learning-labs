/** Presentation-only continuity when a local workbench replaces its markup. */
const scopes=new WeakMap();
const controls='button,input,select,textarea,summary,[tabindex]';
const marker=node=>{
  const names=['id','name','type','aria-label',...(node?.getAttributeNames?.()||[]).filter(name=>name.startsWith('data-'))];
  return [...new Set(names)].map(name=>[name,node?.getAttribute?.(name)]).filter(([,value])=>value!==null&&value!==undefined);
};
function identity(node) {
  const attributes=marker(node),form=node?.closest?.('form');
  const type=node?.getAttribute?.('type');
  return JSON.stringify([node?.localName||node?.tagName,attributes,form?marker(form):[],
    ['checkbox','radio'].includes(type)?node.value:'',
    attributes.some(([name])=>name==='id'||name==='name'||name==='aria-label'||name.startsWith('data-'))?'':String(node?.textContent||'').trim()]);
}

export function captureWorkspaceView(root,scope) {
  const previous=scopes.get(root);scopes.set(root,scope);
  if(previous!==undefined&&previous!==scope)return ()=>{};
  const details=[...(root.querySelectorAll?.('details')||[])].map(node=>node.open);
  const active=root.ownerDocument?.activeElement,owned=!!active&&!!root.contains?.(active);
  const key=owned?identity(active):null;
  const matching=owned?[...(root.querySelectorAll?.(controls)||[])].filter(node=>identity(node)===key):[];
  const occurrence=matching.indexOf(active);
  const selection=owned&&typeof active.selectionStart==='number'?{start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection}:null;
  const scroll=owned?{top:active.scrollTop,left:active.scrollLeft}:null;
  return ()=>{
    [...(root.querySelectorAll?.('details')||[])].forEach((node,index)=>{if(index<details.length)node.open=details[index];});
    if(!owned||occurrence<0)return;
    const doc=root.ownerDocument,now=doc?.activeElement;
    // A later user move outside the workbench always wins over restoration.
    if(now&&now!==active&&now!==doc.body&&now.isConnected!==false&&!root.contains?.(now))return;
    const target=[...(root.querySelectorAll?.(controls)||[])].filter(node=>identity(node)===key)[occurrence];
    if(!target||target.disabled||target.hidden||target.closest?.('[hidden], [inert]'))return;
    for(let child=target,parent=target.parentElement;parent&&parent!==root;child=parent,parent=parent.parentElement){
      if(parent.localName==='details'&&!parent.open&&child.localName!=='summary')return;
    }
    target.focus?.({preventScroll:true});
    if(selection&&target.setSelectionRange)target.setSelectionRange(selection.start,selection.end,selection.direction||'none');
    if(scroll){target.scrollTop=scroll.top;target.scrollLeft=scroll.left;}
  };
}
