// Home-page entry cards for the game arcade, coding language paths and Inbox Defender.
// They read catalogs only, so the home page never downloads a game or course engine.
import {ARCADE_CATALOG,ARCADE_TRACKS as TRACKS,ARCADE_SYMBOLS as SYMBOLS} from './arcade-catalog.js?release=20261107-tech-team';
import {LINUX_COURSE} from './linux-catalog.js?release=20261107-tech-team';
export function renderArcadeEntry(topic='all'){
  const games=ARCADE_CATALOG.filter(game=>topic==='all'||game.track===topic);
  return '<section class="wrap ga-entry" aria-labelledby="game-entry-title"><div><p class="eyebrow">'+games.length+' game labs · No ticket required</p><h2 id="game-entry-title">Game on. Build a fix as you play.</h2><p>Route packets, build a PC, defend a gate, sort AI evidence or program a rover. No countdown. Explore, test and retry.</p></div><a class="button" href="#arcade">Enter the game arcade →</a><div class="ga-entry-topics">'+Object.entries(TRACKS).filter(([id])=>topic==='all'||topic===id).map(([id,name])=>'<span>'+SYMBOLS[id]+' '+name+' · 5 games</span>').join('')+'</div></section>';
}
export function renderCodeQuestEntry(){return '<section class="wrap cq-entry"><div><p class="eyebrow">12 beginner language paths · Eight lessons each</p><h2>Code, one small win at a time.</h2><p>Learn a concept, practice the syntax and build a small supply helper. Start with Python or JavaScript, or explore another language.</p></div><a class="button" href="#quests">Choose a coding language →</a></section>';}
export function renderInboxDefenderEntry() {
  return '<section class="wrap id-entry" aria-labelledby="inbox-entry-title"><div><p class="eyebrow">Play a mission · Free · Grades K–12</p><h2 id="inbox-entry-title">Your inbox. Your call.</h2><p>Five messages. Inspect the clues and watch your decision change the scene. Choose picture patrol with an adult or an evidence challenge. No timer.</p></div><a class="button" href="#play/inbox-defender">Play Inbox Defender <span aria-hidden="true">→</span></a></section>';
}
export function renderLinuxEntry() {
  return '<section class="wrap id-entry linux-entry" aria-labelledby="linux-entry-title"><div><p class="eyebrow">'+LINUX_COURSE.length+' beginner labs · Free · Grades 7–12</p><h2 id="linux-entry-title">Learn Linux on a real Linux computer.</h2><p>Open a real Linux desktop in your browser. Find files, tidy folders, edit text, set permissions and search, one small step at a time.</p></div><a class="button" href="#linux">Start Linux basics <span aria-hidden="true">→</span></a></section>';
}
