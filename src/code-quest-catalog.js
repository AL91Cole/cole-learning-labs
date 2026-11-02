export const CODE_QUESTS=Object.freeze([
  ['python','Python','Readable scripting and data examples'],['javascript','JavaScript','Interactive web examples'],
  ['java','Java','Typed program examples'],['cpp','C++','Systems and game-program examples'],
  ['csharp','C#','Typed application examples'],['typescript','TypeScript','JavaScript examples with type annotations'],
  ['sql','SQL','Questions about a small table'],['go','Go','Typed service-program examples'],
  ['rust','Rust','Typed systems-program examples'],['swift','Swift','Apple-platform program examples'],
  ['kotlin','Kotlin','Typed application examples'],['ruby','Ruby','Readable scripting examples']
].map(([id,title,summary])=>Object.freeze({id,title,summary,minutes:40,grade:'7–12'})));
export const codeQuestMeta=id=>typeof id==='string'?CODE_QUESTS.find(quest=>quest.id===id)||null:null;
