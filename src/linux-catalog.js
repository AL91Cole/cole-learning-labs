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
export const linuxLab=id=>typeof id==='string'?LINUX_COURSE.find(lab=>lab.id===id)||null:null;
export const nextLinuxLab=id=>{const index=LINUX_COURSE.findIndex(lab=>lab.id===id);return index>=0&&index<LINUX_COURSE.length-1?LINUX_COURSE[index+1]:null;};
