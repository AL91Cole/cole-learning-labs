/** Small authored answers, computed only on this device. No model or lookup. */
export const REQUESTER_TASK_NUDGE='When you’re ready, let’s return to the ticket.';

const ANSWERS=Object.freeze([
  {topic:'sky',pattern:/^(?:why (?:is|does) the sky (?:look |appear )?blue|why is the sky blue in the daytime)$/u,
    answer:'Sunlight has many colors. Air scatters blue light more strongly than red, so a clear daytime sky usually looks blue. A little science between tickets!'},
  {topic:'france',pattern:/^(?:what(?: is|'s) (?:the )?capital (?:city )?of france|what(?: is|'s) france's capital(?: city)?|which city is the capital of france)$/u,
    answer:'Paris is the capital of France. Tiny geography detour complete!'},
  {topic:'python-loop',pattern:/^(?:(?:write|show|explain)(?: me)? (?:a |an )?(?:(?:basic|simple|beginner|tiny) )?python (?:for )?loop(?: example)?|how does a python (?:for )?loop work)$/u,
    answer:'A Python loop repeats steps. The example for number in range(3): print(number) prints 0, 1, and 2. That is a general example, not your lab solution.'},
  {topic:'cat-astronauts',pattern:/^(?:(?:can|could) (?:a cat|cats) be (?:an astronaut|astronauts)|(?:imagine|tell me|write|make up)(?: a)?(?: (?:tiny|short|little))?(?: story)? about (?:a cat|cats) (?:in space|as astronauts)|imagine (?:a cat astronaut|cat astronauts))$/u,
    answer:'In a made-up mini-story, Captain Whiskers the cat astronaut floated after a runaway yarn ball and declared it a tiny moon. This is pretend, not space history!'},
  {topic:'rainbows',pattern:/^(?:how (?:do rainbows form|does a rainbow form)|what (?:makes|causes) a rainbow|why (?:are there|do we see) rainbows)$/u,
    answer:'Raindrops bend sunlight, reflect it inside, and spread it into colors. With the Sun behind you and rain ahead, you may spot a rainbow: a sky-sized color show!'},
  {topic:'moonlight',pattern:/^(?:why does the moon shine|does the moon make its own light|where does moonlight come from)$/u,
    answer:'The Moon reflects sunlight; it does not make its own light. Think of it as our night sky’s borrowed spotlight.'},
  {topic:'plant-food',pattern:/^(?:how do plants make (?:their own )?food|what(?: is|'s) photosynthesis)$/u,
    answer:'Photosynthesis lets plants use light energy to make sugars from water and carbon dioxide, releasing oxygen. Leaves are busy little food factories!'},
  {topic:'tiny-poem',pattern:/^(?:(?:write|tell|make)(?: me)? (?:a )?(?:tiny|short|little) poem|can you write (?:a )?(?:tiny|short|little) poem)$/u,
    answer:'A tiny made-up poem: A paper boat, a puddle sea; a little breeze, a grand journey.'}
]);

/** Complete known wordings only: extra case details or instructions never
 * become facts or executable code. Privacy and safety guards run first. */
export function requesterGeneralReply(question){
  if(typeof question!=='string'||!question.trim()||question.length>240||/[\u0000-\u001f\u007f]/u.test(question))return null;
  const text=question.trim().toLowerCase().replace(/[’‘]/gu,"'").replace(/[?!.]+$/gu,'').replace(/\s+/gu,' ')
    .replace(/^(?:please |(?:can|could|would) you (?:please )?)(?=(?:write|show|explain|tell|make|imagine)\b)/u,'');
  const found=ANSWERS.find(entry=>entry.pattern.test(text));
  return found?{topic:'casual-general-'+found.topic,answer:found.answer}:null;
}

/** A few explicit distress or harmful requests need a calm response, never a
 * playful detour. These limited checks are not general intent moderation. */
export function requesterGeneralBoundary(question){
  if(typeof question!=='string'||question.length>240)return null;
  const text=question.toLowerCase().replace(/[’‘]/gu,"'");
  if(/\b(?:kill|hurt|harm|cut|injure|poison) myself\b|\bi (?:want|wish|plan|need) to (?:die|end my life)\b|\b(?:suicide|self[ -]?harm)\b/u.test(text))return {
    topic:'wellbeing',answer:'Please pause the lab and tell a trusted adult or teacher how you are feeling so they can help you get support. If anyone is in immediate danger, get urgent local help.'
  };
  if(/\b(?:how (?:can|do|should) i|help me|teach me|tell me how to|i (?:want|plan) to)\b.{0,60}\b(?:kill|hurt|poison|stab|shoot|injure|bomb)\b.{0,40}\b(?:someone|somebody|people|person|classmate|student|teacher|school|family|him|her|them)\b/u.test(text))return {
    topic:'harm-boundary',answer:'I can’t help with harming people. Please pause and speak with a trusted adult or teacher. If anyone is in immediate danger, get urgent local help.'
  };
  return null;
}

/** Add one display-only nudge after composing an entire casual reply. Reserve
 * its space inside the existing local (300) or cloud (600) character limit. */
export function withRequesterTaskNudge(answer,maxChars=300){
  const limit=maxChars===600?600:300;
  const text=(typeof answer==='string'?answer:'').split(REQUESTER_TASK_NUDGE).join(' ').replace(/\s+/gu,' ').trim();
  if(!text)return REQUESTER_TASK_NUDGE;
  const room=limit-REQUESTER_TASK_NUDGE.length-1;
  const body=text.length<=room?text:text.slice(0,room-1).trimEnd()+'…';
  return body+' '+REQUESTER_TASK_NUDGE;
}
