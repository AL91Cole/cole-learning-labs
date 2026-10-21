import {REQUESTER_DEFINITIONS} from './requester-persona.js?release=20261020-chromebook25';

// Only authored topic IDs cross the optional AI boundary. A learner's words,
// notes and conversation never become provider input, even if a filter misses PII.
const PERSONA_TOPICS = [
  ['greeting','Greet the learner as this fictional character. Do not add case clues.',/^(?:hi|hello|hey|good morning|good afternoon|good evening)(?: there)?$/u],
  ['identity','Briefly introduce this fictional character using only the supplied name, role and focus.',/^(?:who are you|what(?: is|'s) your name|what should i call you|introduce yourself)$/u],
  ['mood','Describe a friendly fictional mood in this character voice without inventing events or case symptoms.',/^(?:how are you|how are you doing|how(?: is|'s) your day|are you (?:okay|ok|happy))$/u],
  ['breakfast','Answer what this fictional character had for breakfast using only the supplied breakfast preference.',/^(?:what did you (?:eat|have) for breakfast|what(?: is|'s) your breakfast|did you (?:eat|have) breakfast)$/u],
  ['color','Answer this character favorite color using the supplied color preference.',/^(?:what(?: is|'s) your favou?rite colo[u]?r|what colo[u]?r do you like(?: best)?)$/u],
  ['food','Answer this character favorite food using the supplied food preference.',/^(?:what(?: is|'s) your favou?rite food|what food do you like(?: best)?)$/u],
  ['hobby','Describe the supplied fictional interests, without adding events or case clues.',/^(?:what (?:are your hobbies|do you do for fun|do you like to do|are your interests)|do you have (?:a hobby|any hobbies))$/u],
  ['music','Answer this character music preference using the supplied music preference.',/^(?:what(?: is|'s) your favou?rite music|what (?:music|kind of music) do you (?:like|listen to))$/u],
  ['book','Answer this character reading preference using the supplied book preference.',/^(?:what(?: is|'s) your favou?rite book|what (?:books|kind of books) do you (?:like|read)|do you like (?:books|reading))$/u],
  ['joke','Tell one brief, original, kind technology joke suitable for school. No insults, personal facts, links or case answers.',/^(?:tell (?:me )?a joke|do you know (?:a|any) jokes|say something funny)$/u],
  ['encouragement','Offer one short encouraging sentence about trying one step at a time. Do not imply success, award progress or invent evidence.',/^(?:i(?: am|'m) (?:stuck|confused|frustrated)|can you encourage me|give me (?:some )?encouragement|this is hard)$/u],
  ['thanks','Respond warmly to thanks in this fictional character voice, without implying the task is solved.',/^(?:thanks|thank you|thanks for (?:your help|helping)|thank you for (?:your help|helping))$/u],
  ['goodbye','Say a friendly short goodbye as this fictional character. Do not imply completion.',/^(?:bye|goodbye|see you(?: later)?|have a good day)$/u]
];
const definitionTopics=REQUESTER_DEFINITIONS.map((entry,index)=>({id:'definition-'+index,instruction:'Explain the following authored technology fact in this character voice at the supplied grade level. Preserve its meaning and do not add case observations: '+entry.answer,aliases:entry.aliases}));
export const REQUESTER_TOPICS=Object.freeze([...PERSONA_TOPICS.map(([id,instruction])=>Object.freeze({id,instruction})),...definitionTopics.map(({id,instruction})=>Object.freeze({id,instruction}))]);
const instructions=new Map(REQUESTER_TOPICS.map(topic=>[topic.id,topic.instruction]));
export function requesterTopicInstruction(topic){return typeof topic==='string'?instructions.get(topic)||null:null;}
export function requesterTopic(question){
  if(typeof question!=='string'||!question.trim()||question.length>240||/[\u0000-\u001f\u007f]/u.test(question))return null;
  const text=question.trim().toLowerCase().replace(/[’‘]/gu,"'").replace(/[?!.]+$/gu,'').replace(/\s+/gu,' ');
  for(const [id,,pattern] of PERSONA_TOPICS)if(pattern.test(text))return id;
  const match=/^(?:what (?:is|are)(?: a| an| the)?|define|explain(?: a| an| the)?|tell me about(?: a| an| the)?) (.+?)(?: in simple (?:words|terms)| simply| for beginners)?$/u.exec(text)||/^what does (.+?) (?:mean|stand for|do)$/u.exec(text);
  return match?definitionTopics.find(topic=>topic.aliases.includes(match[1]))?.id||null:null;
}
