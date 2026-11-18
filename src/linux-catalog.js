// Linux basics course catalog: the fields the course page, the home page and the
// lab library show. The steps, files and checks of each lab live on the lab
// server (terminal-sandbox/linux-labs.js) and arrive when a machine starts.
export const LINUX_COURSE=Object.freeze([
  {id:'LNX-101',title:'Find Your Way Around',minutes:15,summary:'Meet the Linux desktop. Use the Files window and the terminal to look inside folders and read a file.',skills:['pwd','ls','cd','cat']},
  {id:'LNX-102',title:'Make, Copy, Move and Delete',minutes:20,summary:'Tidy a messy folder: make a folder, copy and rename files, and delete what is not needed.',skills:['mkdir','cp','mv','touch','rm']},
  {id:'LNX-103',title:'Read and Edit Text Files',minutes:20,summary:'Peek at a long file, fix a sign in a text editor, and write new files from the terminal.',skills:['head','tail','wc','>','>>']},
  {id:'LNX-104',title:'Who May Read, Write and Run',minutes:20,summary:'Read the permission letters on a file, let a script run, and make a private file private.',skills:['whoami','ls -l','chmod']},
  {id:'LNX-105',title:'Search, Filter and Get Help',minutes:25,summary:'Search inside files, count results with a pipe, find a file by name, and ask a command for help.',skills:['grep','|','find','--help']}
].map(lab=>Object.freeze({...lab,skills:Object.freeze(lab.skills)})));
// Cyber field labs: cases from the grades 7–8 course Intro to Cybersecurity and
// Responsible AI, done with real tools on the same real Linux desktop
// (terminal-sandbox/cyber-labs.js). `lesson` is the course lesson each one follows.
export const CYBER_FIELD_LABS=Object.freeze([
  {id:'CYB-101',lesson:2,title:'Lock Down the Club Roster',minutes:15,summary:'Give each person only the access they need: read real file permissions, tighten the roster and share a head count without names.',skills:['id','ls -l','chmod','wc -l']},
  {id:'CYB-102',lesson:4,title:'Real Ciphers, Real Fingerprints',minutes:20,summary:'Decode the locker note with a real command, then use SHA-256 fingerprints to catch the copy of the rules that changed.',skills:['tr','sha256sum','sha256sum -c']},
  {id:'CYB-103',lesson:7,title:'Read the Sign-in Log',minutes:20,summary:'Search a real sign-in log, count the failures and find the account and address behind a burst of failed sign-ins.',skills:['grep','cut','sort','uniq -c']},
  {id:'CYB-104',lesson:15,title:'Let Python Do the Counting',minutes:20,summary:'Run a real Python script on the sign-in log, change two settings and save an alert report.',skills:['python3','for','if','>']}
].map(lab=>Object.freeze({...lab,skills:Object.freeze(lab.skills)})));
const GROUPS=[LINUX_COURSE,CYBER_FIELD_LABS];
/** Every lab that runs only on a real Linux computer and opens at #linux/<id>. */
export const REAL_MACHINE_LABS=Object.freeze(GROUPS.flat());
export const linuxLab=id=>typeof id==='string'?REAL_MACHINE_LABS.find(lab=>lab.id===id)||null:null;
/** The lab after this one in the same group, so a course never runs on into the other. */
export const nextLinuxLab=id=>{for(const group of GROUPS){const index=group.findIndex(lab=>lab.id===id);if(index>=0)return group[index+1]||null;}return null;};
