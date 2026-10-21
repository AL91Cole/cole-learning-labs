/** Small, authored conversation building blocks. This is a bounded offline
 * character library, not a language model or a source of case evidence.
 * Normal use composes one short reply; the audit generator is lazy. */
const normalize = value => typeof value === 'string' ? value.toLowerCase().replace(/[’‘]/gu,"'").replace(/\s+/gu,' ').trim().replace(/[?!.]+$/gu,'') : '';
const hash = value => [...value].reduce((total,letter)=>(total*31+letter.charCodeAt(0))>>>0,0);
const bound = text => text.length <= 300 ? text : text.slice(0,299).trimEnd()+'…';
// The idea, scene, and small action are separately authored, rather than a
// large list of greetings with interchangeable names. None describe a repair.
const CARDS = [
  ['ocean','ocean|oceans|sea','The ocean has many habitats, from bright shallows to dark depths.','an underwater library with bubble windows','sketch a reef'],
  ['mountains','mountain|mountains','A mountain walk can offer a very different view at each turn.','a little mountain lookout above the clouds','draw a winding trail'],
  ['forest','forest|forests|woods','A forest is a community of plants, animals, and other living things.','a reading nook among tall trees','design a woodland path'],
  ['river','river|rivers','Rivers carry water downhill and shape the land along their route.','a gentle river with a tiny ferry','map the bends'],
  ['beach','beach|beaches|seaside','A beach changes as waves move sand and stones.','a beach where shells form a puzzle','draw a shell pattern'],
  ['garden','garden|gardens|gardening','A garden rewards patience and noticing small changes.','a garden with winding paths and friendly signs','plan a small flower bed'],
  ['trees','tree|trees','Trees provide shelter and change as they grow.','a tree house with a book basket','draw branching shapes'],
  ['flowers','flower|flowers','Flowers come in many shapes and colors, which makes them fun to draw.','a meadow with flowers shaped like bells','invent a flower pattern'],
  ['insects','insect|insects|bugs in nature','Insects have six legs, though they do not all look alike.','a tiny insect parade through a garden','sketch six-legged shapes'],
  ['butterflies','butterfly|butterflies','A butterfly changes greatly during its life cycle.','a butterfly carrying a paper invitation','draw a pair of patterned wings'],
  ['birds','bird|birds','Birds have feathers, but not every bird can fly.','a bird delivering a song instead of a letter','invent a feather pattern'],
  ['owls','owl|owls','Owls are birds with excellent hunting senses.','an owl who organizes a moonlit book club','design a book-club badge'],
  ['foxes','fox|foxes','Foxes are curious animals, and stories often give them clever roles.','a fox who solves a lost-picnic mystery','draw a trail of pawprints'],
  ['turtles','turtle|turtles|tortoise|tortoises','Turtles carry protective shells, but still need suitable habitats.','a turtle who runs a very patient delivery service','design a slow-and-steady route'],
  ['dogs','dog|dogs|puppy|puppies','Dogs have different needs and personalities; caring for one takes work.','a dog who finds a misplaced parade hat','sketch a playful companion'],
  ['cats','cat|cats|kitten|kittens','Cats communicate with posture, sounds, and movement.','a cat who guards a cardboard castle','design a climbing playground'],
  ['horses','horse|horses|pony|ponies','Horses are social animals that need skilled, gentle care.','a pony carrying books between imaginary villages','draw a peaceful meadow'],
  ['dinosaurs','dinosaur|dinosaurs','Fossils help people learn about dinosaurs that lived long ago.','a dinosaur visiting a very large library','invent a fossil exhibit'],
  ['stars','star|stars|stargazing','Stars are distant objects that give off light.','a star-shaped station for imaginary explorers','draw a constellation'],
  ['moon','moon|the moon','The Moon reflects sunlight; it does not make its own light.','a quiet Moon garden inside a glass dome','sketch a crater landscape'],
  ['mars','mars','Mars is a planet with a rocky surface. An imaginary visit needs an imaginary plan.','a red-planet campsite with a story tent','design an explorer badge'],
  ['space','space|outer space','Space stories let us wonder about places far beyond home.','a spaceship with a cozy reading corner','draw an imaginary star map'],
  ['planets','planet|planets|solar system','Planets orbit stars, and the planets in our solar system differ greatly.','a tour boat that sails between imaginary planets','make a planet comparison chart'],
  ['rockets','rocket|rockets','A rocket moves by pushing material out in the opposite direction.','a paper rocket carrying a tiny art gallery','draw a launch poster'],
  ['astronauts','astronaut|astronauts','Astronauts practice working carefully with a team.','an astronaut hosting a zero-gravity story hour','design a mission patch'],
  ['gravity','gravity','Gravity pulls objects toward one another. It helps keep us on Earth.','a room where story characters can float','draw a floating scene'],
  ['rainbows','rainbow|rainbows','A rainbow can appear when sunlight interacts with water droplets.','a rainbow bridge in a picture book','choose a color sequence'],
  ['volcanoes','volcano|volcanoes','A volcano is an opening where hot material can reach the surface.','a faraway volcano drawn on an adventure map','design a safe museum display'],
  ['rocks','rock|rocks|geology','Rocks can tell stories about how a place formed over time.','a museum where each stone has a story label','sketch an interesting texture'],
  ['seasons','season|seasons','Seasons bring repeating changes, though places experience them differently.','a park with a path for each season','draw four views of one tree'],
  ['snow','snow|snowflakes','Snowflakes are ice crystals; their patterns make lovely drawing ideas.','a snow village with colorful lanterns','design a paper snowflake'],
  ['rain','rain|rainy days','Rain is part of the movement of water around our planet.','a rainy-day cafe full of story umbrellas','draw a puddle reflection'],
  ['wind','wind|breezes','Wind is moving air. You can notice its effects without seeing the air itself.','a kite festival over an imaginary field','design a kite shape'],
  ['sunshine','sun|sunshine','Sunlight gives Earth energy and helps plants grow.','a sunlit courtyard with a shaded reading seat','draw shadows at different angles'],
  ['clouds','cloud|clouds','Clouds contain tiny water droplets or ice crystals.','a cloud that looks like a traveling castle','sketch three cloud shapes'],
  ['painting','painting|paintings|watercolors','Painting is a way to explore color, texture, and mood.','a gallery of tiny landscapes','choose a three-color palette'],
  ['drawing','drawing|sketching','Drawing can help turn a vague idea into something you can examine.','a sketchbook that opens into a small world','draw one object three ways'],
  ['sculpture','sculpture|sculptures','A sculpture lets an idea take a shape you can view from different sides.','a sculpture garden made of paper shapes','plan a folded-paper sculpture'],
  ['photography','photography|photographs','A photograph can frame one part of a scene; what is outside the frame still matters.','a photo walk through an imaginary town','choose an interesting viewpoint'],
  ['piano','piano|pianos','A piano can play high and low notes, loud and soft.','a piano concert for a room full of paper animals','invent a short rhythm'],
  ['guitar','guitar|guitars','A guitar makes sound when its strings vibrate.','a quiet guitar corner at a story festival','design a concert poster'],
  ['drums','drum|drums|drumming','Drums can make patterns that people feel and follow together.','a drum circle welcoming an imaginary parade','clap a simple rhythm'],
  ['dance','dance|dancing','Dance uses movement to express ideas and feelings.','a dance where everyone invents one friendly move','plan a short movement pattern'],
  ['poetry','poetry|poem|poems','A poem can make a small observation feel surprising. It does not have to rhyme.','a poetry tree with paper leaves','write a two-line nature poem'],
  ['stories','storytelling|stories|story books','A story can begin with a character, a wish, and a small obstacle.','a traveling story cart','invent a kind main character'],
  ['mysteries','mystery|mysteries|detective stories','A fair mystery gives readers clues they can think about.','a mystery about a missing festival ribbon','draw a clue map'],
  ['comics','comic|comics|comic strips','Comic panels can show a story one moment at a time.','a comic about a very polite dragon','plan three story panels'],
  ['origami','origami|paper folding','Origami turns a sheet of paper into a shape through folds.','a flock of folded birds delivering invitations','design a paper animal'],
  ['theater','theater|theatre|acting','Theater brings a story to life through voices, movement, and teamwork.','a tiny stage inside a cardboard box','plan a simple scene'],
  ['animation','animation|stop motion','Animation makes separate images appear to move when shown in sequence.','a stop-motion adventure starring paper shapes','sketch three changing poses'],
  ['board-games','board game|board games','A good board game gives players choices they can understand.','a cooperative game about restoring a garden','invent a fair turn rule'],
  ['puzzles','puzzle|puzzles','A puzzle can feel easier when you try a smaller piece first.','a puzzle box that opens to a tiny garden','design a pattern challenge'],
  ['chess','chess','Chess asks players to think about choices and their consequences.','a chess set with characters who explain their moves','draw an unusual chess piece'],
  ['riddles','riddle|riddles','A riddle plays with the way words can have more than one meaning.','a gate that opens for a friendly riddle','write a clue with two meanings'],
  ['treasure-maps','treasure map|treasure maps','A made-up treasure map can combine directions with a story.','an island whose treasure is a box of books','draw a map legend'],
  ['mazes','maze|mazes','A maze offers routes to explore; a wrong turn can still teach you something.','a garden maze with a picnic at its center','draw a path and a dead end'],
  ['cardboard','cardboard|cardboard models','Cardboard models make it easy to try an idea on a small scale.','a cardboard town with a welcoming square','design a miniature shop'],
  ['bridges','bridge|bridges','A bridge connects places across a gap. Its shape helps it carry loads.','a bridge joining two imaginary reading gardens','sketch two bridge shapes'],
  ['buildings','building|buildings|architecture','Buildings can be designed around the people who will use them.','a library with ramps and sunny reading nooks','plan a welcoming entrance'],
  ['robots','robot|robots','A robot follows a design and instructions; a story robot can be much more fanciful.','a robot who sorts lost mittens by color','design a friendly story robot'],
  ['inventions','invention|inventions|inventing','An invention starts with an idea about making something work differently.','an umbrella that paints harmless pretend rainbows','sketch a playful invention'],
  ['time-travel','time travel|time machine|travel in time','Time travel is a story idea, not something I can do.','a time machine that visits old storybooks','choose a make-believe destination'],
  ['superpowers','superpower|superpowers|super hero|superhero','An imaginary superpower is more interesting when it comes with a thoughtful choice.','a hero whose power makes shy voices easier to hear','design a helpful hero badge'],
  ['dragons','dragon|dragons','Dragons belong to stories, so we can invent their rules together.','a dragon who warms soup instead of guarding gold','draw a friendly dragon home'],
  ['mermaids','mermaid|mermaids','A mermaid story can imagine life beneath the waves.','a mermaid who keeps an underwater museum','design a sea-story doorway'],
  ['unicorns','unicorn|unicorns','Unicorns are imaginary creatures found in many stories.','a unicorn delivering art supplies to a forest school','invent a magical trail'],
  ['giants','giant|giants','A giant in a story changes the scale of ordinary things.','a gentle giant building a bird-sized village','draw a huge object beside a tiny one'],
  ['talking-animals','talking animal|talking animals|animals could talk','Talking animals let a story explore a different point of view.','a council of animals planning a shared garden','give two animals different opinions'],
  ['flying-houses','flying house|flying houses|houses could fly','A flying house needs only story rules, not a real building plan.','a house that floats toward the best sunset','design a room with a sky view'],
  ['invisibility','invisibility|invisible','Invisibility is a make-believe power; kindness still matters when nobody is watching.','an invisible helper returning lost library books','invent a fair rule for a magic cloak'],
  ['teleportation','teleportation|teleport','Teleportation in a story skips the journey between places.','a doorway between two imaginary art rooms','draw both sides of a magic doorway'],
  ['talking-computers','computers could talk|computer could talk|talking computer','A talking computer in a story can have a personality; real equipment does not reveal hidden facts that way.','a story computer that asks for a quiet reading break','write one line of imaginary dialogue'],
  ['bicycle-trip','bicycle trip|bike trip|bike ride','A planned bike ride can combine exercise with noticing a place.','a bicycle route through a made-up flower town','draw a route with rest stops'],
  ['trains','train|trains|train journey','A train journey can be a useful setting for a story with changing scenery.','a story train with a library carriage','invent names for three stations'],
  ['boats','boat|boats|boat ride','A boat story can turn a short crossing into an adventure.','a little boat carrying invitations across a pond','design a paper-boat flag'],
  ['picnics','picnic|picnics','A picnic can be simple: a place to sit, something to eat, and good company.','a picnic beside a tiny waterfall','plan a shared picnic menu'],
  ['camping','camping|campfire','Camping stories often bring together small surprises and teamwork.','a pretend campsite with a story lantern','draw a campsite layout'],
  ['festivals','festival|festivals|parade','A festival can bring different creative ideas into one celebration.','a lantern festival in a paper town','design a welcoming festival sign'],
  ['birthdays','birthday party|birthday parties','A thoughtful celebration can be small and still make someone feel included.','a birthday party where every guest adds a story page','invent a cooperative party game'],
  ['football','football|soccer','Team sports work best when players communicate and play fairly.','a friendly match where everyone gets a turn','design a team flag'],
  ['basketball','basketball','Basketball combines movement, practice, and team decisions.','a basketball court with a friendly passing challenge','plan a team warm-up'],
  ['swimming','swimming','Swimming takes practice and suitable supervision in a safe place.','a make-believe swim race between paper fish','draw a poolside mural'],
  ['cycling','cycling|bicycles','Cycling can be enjoyable with suitable equipment, rules, and a safe route.','a cycle parade through a story village','design a bicycle decoration'],
  ['skating','skating|skateboarding','Learning a new movement takes small steps and safe practice.','a skating show with a pretend moon theme','draw a simple movement sequence'],
  ['hiking','hiking|walking trails','A walk can be a chance to notice shapes, sounds, and small details.','a gentle trail leading to a storybook lookout','make an imaginary trail guide'],
  ['teamwork','teamwork|working together','Teamwork works better when people can ask questions and share clear roles.','a team building a welcoming paper village','give each teammate a helpful role'],
  ['friendship','friendship|friends','Friendship grows through listening, kindness, and respecting boundaries.','two friends helping a third finish a story map','invent a thoughtful small gesture'],
  ['kindness','kindness|being kind','Kindness can be a small action that makes someone feel included.','a kindness club that leaves encouraging bookmarks','write a welcoming message'],
  ['patience','patience|being patient','Patience gives us time to notice, practice, and try again.','a patient gardener waiting for an imaginary seed','draw a slow-growing story plant'],
  ['mistakes','mistakes|making mistakes','A mistake can show what needs another look; it is not a label for a person.','an artist turning a spilled paint mark into a tree','invent a useful second attempt'],
  ['curiosity','curiosity|being curious','Curiosity starts with noticing something and asking a question about it.','an explorer collecting questions instead of treasure','write three wonder questions'],
  ['creativity','creativity|being creative','Creativity can mean combining familiar ideas in a new way.','an inventor mixing a library and a garden','combine two ordinary objects in a sketch'],
  ['learning','learning|learning new things','Learning takes practice, useful feedback, and room to ask questions.','a story school where each lesson starts with a puzzle','plan one small practice step'],
  ['practice','practice|practicing|practising','A little focused practice can help more than rushing through everything at once.','a musician improving one short rhythm each day','choose one skill to rehearse'],
  ['goals','personal goals|setting goals','A useful goal describes a small result you can work toward.','a map with small milestones leading to an art show','break a creative goal into three steps'],
  ['choices','choices|making choices','Thinking about a choice includes considering who it affects.','a story with two kind ways to solve a disagreement','draw two possible story endings'],
  ['fairness','fairness|being fair','Fairness includes listening and checking whether a rule treats people reasonably.','a game club rewriting a confusing rule together','invent a turn-taking rule'],
  ['sharing','sharing','Sharing works better when people agree on boundaries and ask first.','a craft table with a friendly sign-out basket','plan a shared art-supply shelf'],
  ['communication','communication|listening','Clear communication includes listening and checking that you understood.','two explorers comparing their different maps','write a short clear invitation'],
  ['asking-help','asking for help|ask for help','Asking for help can be a useful next step when you are stuck.','a young artist asking a teammate to explain one fold','write a specific helpful question'],
  ['compliments','compliment|compliments','A useful compliment can name something someone worked hard on.','a gallery where visitors leave thoughtful comments','write a kind specific comment'],
  ['celebrating','celebrating|celebration','A celebration can recognize effort and progress as well as a finished result.','a small festival for everyone who tried a new skill','design a celebration badge'],
  ['cooking','cooking|baking','Cooking mixes planning, care, and creativity. Real cooking needs suitable supervision and safe tools.','a pretend cafe with a colorful menu','design a paper menu'],
  ['libraries','library|libraries','A library brings together stories, information, and places to explore ideas.','a library with a tiny door for storybook animals','design a reading nook'],
  ['music','music|musical instruments','Music can use rhythm, melody, and silence to create a mood.','a concert where every instrument tells a little story','choose a rhythm for a scene'],
  ['reading','reading|books','Reading can introduce another point of view, whether a book is factual or imagined.','a book club that draws its favorite scenes','design a book cover'],
  ['art','art|artwork','Art offers many ways to express an idea; there is no single right material.','an art show made entirely from paper scraps','make a small collage plan'],
  ['travel','travel|traveling|travelling','Imagining a journey can be fun without pretending I have visited a real place.','a journey through towns named after colors','draw a pretend travel journal'],
  ['islands','island|islands','An island is land surrounded by water. An imaginary one can have any story shape.','an island shaped like a sleeping turtle','draw a shore and a path inland'],
  ['castles','castle|castles','A castle makes an interesting story setting with rooms, gates, and unexpected passages.','a castle that opens its hall as a public library','design a welcoming castle gate'],
  ['balloons','balloon|balloons|hot air balloon','A balloon adventure can give a character a very different view of a story world.','a balloon carrying a tiny traveling theater','sketch a view from above'],
  ['underwater','underwater adventures|under the sea','An underwater fantasy can explore a world very different from our own.','a submarine shaped like a friendly fish','design a make-believe sea window']
];
export const REQUESTER_LIBRARY_TOPICS = Object.freeze(CARDS.map(([id,aliases,idea,scene,activity])=>Object.freeze({id,aliases:Object.freeze(aliases.split('|')),idea,scene,activity})));
const STYLES = Object.freeze(['explain','preference','story','imagine','create']);
const CASE_WORDS = /\b(?:pc|computer|monitor|screen|cable|ram|memory|network|request|problem|case|repair|test|code|program|printer|file|prompt|security|message|account|record|backup|router|drive|storage|wi-fi|wifi|dns|gateway|cost|temperature|fault|broken|changed|happened|before|after|equipment|boot|power|safety|internal|unplug|touch|permission|scope|rubric|password|privacy)\b/u;
const CURRENT_UNKNOWN = /\b(?:forecast|who won|world cup|super bowl|president|prime minister|capital of|quantum dragons|flibberflam|prices?|news|today|tomorrow|yesterday|last night|this morning|this afternoon|this evening|this week|currently|latest|newest)\b/u;
const FICTION = /\b(?:what if|imagine|imaginary|pretend|make up|made-up|story|stories|fantasy|could talk|could fly|talking computer)\b/u;
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&');
const MATCHERS = REQUESTER_LIBRARY_TOPICS.flatMap(topic=>topic.aliases.map(alias=>({topic,alias,pattern:new RegExp(`(?:^|\\b)${escaped(alias)}(?:$|\\b)`,'u')}))).sort((a,b)=>b.alias.length-a.alias.length);

function classify(question) {
  const text=normalize(question);
  if (!text || text.length>240 || CURRENT_UNKNOWN.test(text)) return null;
  const match=MATCHERS.find(entry=>entry.pattern.test(text));
  if (!match) return null;
  const talkingFantasy=match.topic.id==='talking-computers' && FICTION.test(text) && !CASE_WORDS.test(text.replace(match.pattern,''));
  if (CASE_WORDS.test(text) && !talkingFantasy) return null;
  // Do not turn an unknown assertion into an encyclopedia answer. These lines
  // respond to invitations to chat, wonder, imagine, or explain a known subject.
  if (!/^(?:(?:hi|hello|hey)[,! ]+)?(?:please |(?:can|could|would) you (?:please )?)?(?:what|what's|how|why|tell|explain|describe|imagine|pretend|make|invent|do you|would you|could we|can we|let's|i like|i love|i enjoy|have you|are you|which|your favorite|your favourite)\b/u.test(text) && text!==match.alias) return null;
  return match.topic;
}

/** Read-only topic lookup. It returns authored card data or null; it never
 * returns, forwards, or stores any fragment of the submitted question. */
export function requesterLibraryTopic(question) { return classify(question); }

function compose(topic,profile,style) {
  const name=profile.name, hobby=profile.interests;
  const lines={
    explain:`${topic.idea} I am ${name}; my interest in ${hobby} makes me want to ${topic.activity}.`,
    preference:`I would choose ${topic.scene}. I enjoy ${hobby}, so I would bring that creative angle and ${topic.activity}. What a fun scene to picture!`,
    story:`A tiny made-up story: ${name} discovered ${topic.scene}. At first the plan was muddled. By using a little imagination from ${hobby}, they found a way to ${topic.activity} with a new friend.`,
    imagine:`If we imagined ${topic.scene}, I would start small: ${topic.activity}. Then I would add a twist inspired by ${hobby}. As ${name}, I would leave room for another character's idea too.`,
    create:`My creative plan: first ${topic.activity}; next add a detail in ${profile.color}; finally give it a name. Since I enjoy ${hobby}, I would turn ${topic.scene} into a little project of my own.`
  };
  return bound(lines[style]);
}

/** Enumerate the actual bounded display strings for offline coverage audits.
 * No corpus is allocated by normal chat; consumers may stop the generator. */
export function* requesterLibraryVariants(scenario,profile) {
  if (!scenario?.id || !profile?.name || !profile?.interests || !profile?.color) return;
  for (const topic of REQUESTER_LIBRARY_TOPICS) for (const style of STYLES) yield Object.freeze({topic:`casual-library-${topic.id}`,style,answer:compose(topic,profile,style)});
}

export function requesterLibraryReply(scenario,profile,question,history=[]) {
  if (!profile) return null;
  const topic=classify(question);
  if (!topic) return null;
  const text=normalize(question);
  const repeats=(Array.isArray(history)?history.slice(-8):[]).filter(pair=>normalize(pair?.question)===text).length;
  let index=hash(`${scenario?.id}:${topic.id}`)%STYLES.length;
  if (/\b(?:story|stories|tale)\b/u.test(text)) index=2;
  else if (/\b(?:what if|imagine|pretend|could talk|could fly)\b/u.test(text)) index=3;
  else if (/\b(?:make|create|invent|design|plan)\b/u.test(text)) index=4;
  else if (/\b(?:like|love|favorite|favourite|would you|what do you think)\b/u.test(text)) index=1;
  else if (/^(?:what (?:is|are)|what's|why|how|explain|describe)\b/u.test(text)) index=0;
  return {topic:`casual-library-${topic.id}`,answer:compose(topic,profile,STYLES[(index+repeats)%STYLES.length])};
}

/** Topic context is recomputed from a prior question. Neither answer strings nor
 * arbitrary caller-supplied topic IDs are interpreted as facts or instructions. */
export function requesterLibraryFollowUp(scenario,profile,question,priorQuestion,turn=0) {
  const topic=classify(priorQuestion);
  if (!topic || !profile) return null;
  const text=normalize(question);
  const index=/^(?:why|how come|why is that|explain that|in simple words|say it simply)$/u.test(text)?0:/^(?:what about you|and you|how about you)$/u.test(text)?1:/\b(?:story|next|then)\b/u.test(text)?2:(3+turn)%STYLES.length;
  return {topic:`casual-library-${topic.id}`,answer:compose(topic,profile,STYLES[index])};
}
