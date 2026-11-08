// Simulated shell for the lab desktop. It gives the learner a terminal that
// feels like a small Linux machine (ls, cat, nano, grep, python3, ping…) while
// every result comes from the lab's own simulation engines: the read-only
// diagnostic tools, the bounded coding interpreter and the workspace actions.
// Learners can also make their own files in a session-only home folder. Nothing
// here executes real commands, touches real files or reaches a network. The
// module is pure: the page passes in getState/action callbacks and reads
// results back.
import {workspaceDiagnostic} from './workspaces.js?release=20261107-tech-team';
import {supportsCodingLab, codingDefinition, executeCoding, codingStarter} from './coding-lab.js?release=20261107-tech-team';

const normalize = id => typeof id === 'string' ? id.replaceAll('-', '').toUpperCase() : '';
export const SHELL_USER = 'student', SHELL_HOST = 'lab-pc', HOME = '/home/student', LAB_DIR = HOME + '/lab';
export const OS_NAME = 'Practice Linux 24.04 LTS';
const LIMITS = Object.freeze({line:240, history:50, userFiles:40, fileBytes:4000, output:4000});
const SYSTEM_DIRS = Object.freeze(['/', '/home', '/etc', '/tmp', HOME, HOME + '/Desktop', HOME + '/Documents', HOME + '/Downloads', LAB_DIR, LAB_DIR + '/resources']);
const COMMANDS = Object.freeze(['help', 'ls', 'cd', 'pwd', 'cat', 'less', 'head', 'tail', 'grep', 'wc', 'nano', 'touch', 'mkdir', 'rm', 'cp', 'mv', 'echo', 'clear', 'history', 'whoami', 'id', 'hostname', 'uname', 'date', 'uptime', 'ps', 'df', 'free', 'env', 'which', 'man', 'console', 'files', 'exit', 'python3', 'node', './check', 'ip', 'resolvectl', 'sudo']);

// Each lab's practice tools, as the workspace defines them. The shell accepts them verbatim.
const TOOLS = Object.freeze({
  NET201:['ipconfig','ping 10.24.8.1','nslookup learn.school.test'], NET202:['ipconfig','net use','read handout','write handout'], NET203:['boot status','service school-update','list classroom-files'],
  AI301:['preview response','inspect privacy'], AI302:['open source','compare tickets'], AI303:['inspect key','inspect query','request own','request other'],
  SEC401:['inspect sender','inspect link','inspect headers'], SEC402:['show listeners','probe portal','inspect source'], SEC403:['show session','inspect rule'],
  NET204:['survey channels','measure desk','show radio'], NET205:['show queue','service spooler','show printer'], NET206:['list snapshots','inspect restored','compare manifest'],
  AI304:['trace data','preview activity','inspect participation'], AI305:['open source','preview summary','inspect boundary'], AI306:['show tickets','confusion matrix','group audit'],
  SEC404:['show recovery policy','inspect factor','preview recovery'], SEC405:['endpoint status','evidence register','recovery status'], SEC406:['inspect packages','verify manifest','preview pilot'],
  NET207:['trace layers','compare transports','inspect addresses'], NET208:['inspect layout','inspect devices','compare cables'], NET209:['calculate subnet','inspect addresses','trace boundary'],
  NET210:['inspect vlans','test guest path','inspect redundancy'], NET211:['inspect access','test portal rules','compare alert evidence'], NET212:['inspect link','trace path','compare probes'],
  NET213:['inspect call','measure media','inspect management record'], NET214:['calculate capacity','inspect access plan','inspect change record'], NET215:['inspect capture','inspect next hop','compare hop headers'],
  NET216:['inspect manager','calculate error rate','test alert receiver']
});
export const labTools = id => TOOLS[normalize(id)] || [];

const MAN = Object.freeze({
  help:'Lists every command this practice terminal understands.', ls:'Lists files. ls -l shows permissions and sizes; ls -a includes hidden files.', cat:'Prints a file. Example: cat README.txt', cd:'Changes folder: cd lab, cd .., cd ~, cd /etc', pwd:'Prints the current folder.',
  nano:'Opens a file in the Text Editor window. Example: nano program.py', touch:'Creates an empty file in your home folder. Example: touch notes.txt', mkdir:'Creates a folder in your home folder.', rm:'Removes a file you created. Lab files cannot be removed.', cp:'Copies a file. Example: cp README.txt Documents/', mv:'Moves or renames a file you created.',
  grep:'Searches a file for text. Example: grep credits resources/price.txt', wc:'Counts lines, words and characters. Example: wc -l fixtures.txt', head:'Prints the first lines of a file. head -n 3 README.txt', tail:'Prints the last lines of a file.',
  python3:'Runs program.py with one input value. Example: python3 program.py 2', node:'Runs program.js with one input value. Example: node program.js 2', check:'Runs every input card against the saved program (same as Run all fixtures).',
  console:'Opens the Lab Console window with the lab’s settings and test.', files:'Opens the Files window.', clear:'Clears the terminal (Ctrl+L does the same).', history:'Shows your recent commands.', echo:'Prints text. echo text > file writes it to a file.', whoami:'Prints your user name.', hostname:'Prints this machine’s name.', date:'Prints the simulated clock.', man:'Shows what a command does. Example: man cat', exit:'Closes this terminal window.',
  ip:'Shows or changes the workstation address. Examples: ip addr · ip addr add 10.24.8.25/24 dev eth0 · ip route add default via 10.24.8.1', resolvectl:'Sets the DNS server. Example: resolvectl dns eth0 10.24.8.53', df:'Shows simulated disk use.', free:'Shows simulated memory use.', ps:'Lists simulated processes.', uname:'Prints the simulated kernel. uname -a shows everything.'
});

const maskFromPrefix = prefix => {const bits = Number(prefix); if (!Number.isInteger(bits) || bits < 0 || bits > 32) return null; const value = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0; return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');};
const ipv4 = value => /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(value);
const settingsText = state => Object.entries(state).filter(([name, value]) => !['tested', 'results', 'workspaceEdits', 'checkRuns', 'output', 'errors', 'sourceAtRun', 'languageAtRun', 'fixtureIndex', 'solutions', 'history', 'response', 'networkBench'].includes(name) && (typeof value !== 'object' || Array.isArray(value))).map(([name, value]) => name + ': ' + (Array.isArray(value) ? (value.length ? value.join(', ') : '(none)') : String(value))).join('\n') || '(no saved settings)';
const stamp = () => {const now = new Date(); return now.toLocaleString('en-US', {month:'short'}) + ' ' + String(now.getDate()).padStart(2, ' ') + ' ' + now.toTimeString().slice(0, 5);};

/** The virtual files a learner can list and read. Content is regenerated from the scenario and the current state. */
export function labFiles(scenario, state = {}) {
  const coding = supportsCodingLab(scenario.id), files = new Map();
  const add = (path, content, writable = false) => files.set(path, {path, name:path.slice(path.lastIndexOf('/') + 1), content:String(content), writable});
  add('/etc/os-release', 'NAME="' + OS_NAME.split(' ').slice(0, 2).join(' ') + '"\nVERSION="' + OS_NAME.split(' ').slice(2).join(' ') + '"\nID=practice\nPRETTY_NAME="' + OS_NAME + '"\nHOME_URL="https://colelearninglabs.com/"\n# Simulated system. Nothing here is a real installation.');
  add('/etc/hostname', SHELL_HOST);
  add(HOME + '/Desktop/Lab Guide.txt', 'The Lab Guide is the panel beside this desktop. Follow its sections in order.');
  add(LAB_DIR + '/README.txt', [scenario.id + ' · ' + scenario.title, 'Requested by: ' + scenario.requester, '', scenario.brief, '', 'GOAL', scenario.goal, '', 'Lab resources are in the resources folder. Open the Lab Guide for the steps.'].join('\n'));
  for (const clue of scenario.clues) add(LAB_DIR + '/resources/' + clue.id + '.txt', clue.label + '\n\n' + clue.text);
  if (coding) {
    const definition = codingDefinition(scenario.id), language = state.language === 'python' ? 'python' : 'javascript', file = language === 'python' ? 'program.py' : 'program.js';
    add(LAB_DIR + '/' + file, typeof state.code === 'string' ? state.code : codingStarter(scenario.id, language), true);
    add(LAB_DIR + '/fixtures.txt', ['Input variable: ' + definition.input, 'Test inputs: ' + definition.values.join(', '), '', ...definition.values.map(value => definition.input + ' = ' + value + '  →  expected: ' + definition.expected(value).join(' / '))].join('\n'));
    add(LAB_DIR + '/check', '#!/bin/sh\n# Runs every fixture against ' + file + '. Use: ./check');
  } else {
    add(LAB_DIR + '/settings.txt', 'CURRENT SAVED SETTINGS (edit them in the Lab Console)\n\n' + settingsText(state));
    add(LAB_DIR + '/tools.txt', 'Practice tools for this lab:\n' + labTools(scenario.id).map(tool => '  ' + tool).join('\n') + '\n\nType a tool name in the terminal, or help for everything else.');
  }
  return files;
}

export function resolvePath(cwd, target) {
  if (!target || target === '~') return HOME;
  const absolute = target.startsWith('/') || target.startsWith('~');
  const parts = target.replace(/^~/, HOME).split('/').filter(Boolean), stack = absolute ? [] : cwd.split('/').filter(Boolean);
  for (const part of parts) {if (part === '.') continue; if (part === '..') stack.pop(); else stack.push(part);}
  return '/' + stack.join('/');
}
const parent = path => path.slice(0, path.lastIndexOf('/')) || '/';
const base = path => path.slice(path.lastIndexOf('/') + 1);

/** A shell session. run(line) returns {output, kind, open?, clear?, exit?}. */
export function createLabShell(scenario, {getState, action = () => ({message:'', kind:'info'}), verify = null} = {}) {
  const coding = supportsCodingLab(scenario.id), tools = labTools(scenario.id), history = [], userFiles = new Map(), userDirs = new Set();
  let cwd = LAB_DIR;
  const started = Date.now();
  const state = () => getState() || {};
  const files = () => {const all = labFiles(scenario, state()); for (const [path, file] of userFiles) all.set(path, file); return all;};
  const dirs = () => new Set([...SYSTEM_DIRS, ...userDirs]);
  const isDir = path => dirs().has(path);
  const children = path => {
    const prefix = path === '/' ? '/' : path + '/', names = new Map();
    for (const dir of dirs()) if (dir !== path && dir.startsWith(prefix)) {const rest = dir.slice(prefix.length); if (!rest.includes('/')) names.set(rest + '/', {dir:true, name:rest});}
    for (const file of files().values()) if (file.path.startsWith(prefix)) {const rest = file.path.slice(prefix.length); if (!rest.includes('/')) names.set(rest, {dir:false, name:rest, file});}
    return [...names.values()].sort((a, b) => a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1);
  };
  const prompt = () => SHELL_USER + '@' + SHELL_HOST + ':' + (cwd.startsWith(HOME) ? '~' + cwd.slice(HOME.length) : cwd) + '$';
  const info = (output, extra = {}) => ({output:String(output).slice(0, LIMITS.output), kind:'info', ...extra});
  const warn = output => ({output, kind:'warning'});
  const notFound = name => warn('bash: ' + name + ': command not found. Type help to see what this practice terminal understands.');
  const writableHere = path => path.startsWith(HOME + '/') && !path.startsWith(LAB_DIR + '/resources/') && !labFiles(scenario, state()).has(path);
  function writeUserFile(path, content) {
    if (!writableHere(path)) return warn('Permission denied: ' + path + '. Lab files are managed for you; create your own files in your home folder.');
    if (!isDir(parent(path))) return warn('No such directory: ' + parent(path));
    if (!userFiles.has(path) && userFiles.size >= LIMITS.userFiles) return warn('Your home folder is full for this session (' + LIMITS.userFiles + ' files).');
    userFiles.set(path, {path, name:base(path), content:String(content).slice(0, LIMITS.fileBytes), writable:true, user:true, modified:stamp()});
    return info('');
  }
  function runProgram(fileName, args) {
    const definition = codingDefinition(scenario.id), current = state(), language = fileName.endsWith('.py') ? 'python' : 'javascript';
    if (language !== (current.language === 'python' ? 'python' : 'javascript')) return warn(fileName + ': not found. The saved program is ' + (current.language === 'python' ? 'program.py' : 'program.js') + '. Switch the practice language in the Lab Console to change it.');
    const raw = args[0] ?? String(definition.values[0]), value = Number(raw);
    if (!Number.isSafeInteger(value) || Math.abs(value) > 1_000_000) return warn('Give one whole-number input, for example: ' + (language === 'python' ? 'python3 ' : 'node ') + fileName + ' ' + definition.values[0]);
    const result = executeCoding(current.code, {[definition.input]:value}, language);
    if (!result.ok) return warn(fileName + ': line ' + result.error.line + ': ' + result.error.message);
    const expected = definition.expected(value), matches = definition.values.includes(value) ? (JSON.stringify(result.output) === JSON.stringify(expected) ? '\n(matches the expected output for ' + definition.input + ' = ' + value + ')' : '\n(expected: ' + expected.join(' / ') + ')') : '';
    return info((result.output.join('\n') || '(no output)') + matches);
  }
  function runChecks() {
    const result = action('run-check');
    const next = state(), rows = Array.isArray(next.results) ? next.results : [];
    return {output:(rows.length ? rows.map(row => (row.ok ? '  PASS  ' : '  FAIL  ') + row.label).join('\n') + '\n' : '') + result.message, kind:result.kind || 'info'};
  }
  const readFile = (arg) => {const path = resolvePath(cwd, arg); if (isDir(path)) return {error:arg + ': Is a directory'}; const file = files().get(path); return file ? {file, path} : {error:arg + ': No such file or directory'};};
  function listing(args) {
    const flags = args.filter(arg => arg.startsWith('-')).join(''), long = flags.includes('l'), all = flags.includes('a'), targetArg = args.find(arg => !arg.startsWith('-')), target = resolvePath(cwd, targetArg || '.');
    if (!isDir(target)) {const file = files().get(target); if (!file) return warn('ls: cannot access \'' + targetArg + '\': No such file or directory'); return info(long ? row({dir:false, name:file.name, file}) : file.name);}
    const entries = children(target), hidden = all ? [{dir:true, name:'.'}, {dir:true, name:'..'}] : [];
    if (!long) return info([...hidden.map(entry => entry.name), ...entries.map(entry => entry.dir ? entry.name + '/' : entry.name)].join('  '), {entries:entries.map(entry => entry.dir ? entry.name + '/' : entry.name)});
    return info('total ' + entries.length + '\n' + [...hidden, ...entries].map(row).join('\n'));
  }
  const row = entry => (entry.dir ? 'drwxr-xr-x' : entry.file?.writable ? '-rw-r--r--' : '-r--r--r--') + ' 1 ' + SHELL_USER + ' ' + SHELL_USER + ' ' + String(entry.dir ? 4096 : entry.file?.content.length ?? 0).padStart(6) + ' ' + (entry.file?.modified || stamp()) + ' ' + entry.name + (entry.dir && entry.name !== '.' && entry.name !== '..' ? '/' : '');
  function complete(line) {
    const text = String(line || ''), words = text.split(/\s+/), current = words.at(-1) || '', first = words.length <= 1;
    if (first) return [...COMMANDS, ...tools].filter(item => item.startsWith(current)).map(item => item);
    const slash = current.lastIndexOf('/'), dirPart = slash >= 0 ? current.slice(0, slash + 1) : '', namePart = current.slice(slash + 1), dir = resolvePath(cwd, dirPart || '.');
    if (!isDir(dir)) return [];
    return children(dir).filter(entry => entry.name.startsWith(namePart)).map(entry => text.slice(0, text.length - current.length) + dirPart + entry.name + (entry.dir ? '/' : ''));
  }
  function run(line) {
    if (typeof line !== 'string') return warn('Type a command.');
    const text = line.trim().slice(0, LIMITS.line);
    if (!text) return info('');
    history.push(text); if (history.length > LIMITS.history) history.shift();
    const redirect = text.match(/^(.*?)\s*>\s*(\S+)\s*$/);
    if (redirect && /^echo\b/.test(redirect[1]) && !/\/etc\/resolv\.conf$/.test(redirect[2])) {
      const content = redirect[1].replace(/^echo\s*/, '').replace(/^["']|["']$/g, ''), path = resolvePath(cwd, redirect[2]);
      if (coding && files().get(path)?.writable && !userFiles.has(path)) {const result = action('save-code', {code:content}); return {output:result.message, kind:result.kind || 'info'};}
      return writeUserFile(path, content);
    }
    const words = text.replace(/^sudo\s+/, '').split(/\s+/), command = words[0].toLowerCase(), args = words.slice(1), lower = text.toLowerCase().replace(/^sudo\s+/, '').replace(/\s+/g, ' ');
    if (tools.includes(lower)) {const result = action('inspect-command', {command:lower}); return {output:result.message, kind:result.kind || 'info', tool:true};}
    if (!coding && tools.some(tool => tool.split(' ')[0] === command)) return warn('Try the full tool name: ' + tools.filter(tool => tool.split(' ')[0] === command).join(' · '));
    switch (command) {
      case 'help': return info(['Practice terminal on ' + SHELL_HOST + '. It understands:', '  files    ls, cd, pwd, cat, head, tail, grep, wc, nano, touch, mkdir, rm, cp, mv, echo > file', '  system   whoami, id, hostname, uname, date, uptime, ps, df, free, env, which, man, history, clear, exit', '  windows  console (Lab Console), files (Files), nano <file> (Text Editor)', ...(coding ? ['  program  python3 program.py <input>, node program.js <input>, ./check'] : []), ...(normalize(scenario.id) === 'NET201' ? ['  network  ip addr, ip addr add <addr>/<prefix> dev eth0, ip route add default via <gw>, resolvectl dns eth0 <server>'] : []), ...(tools.length ? ['  lab tools  ' + tools.join(' · ')] : []), 'Tab completes commands and file names. No real system, network or file is touched.'].join('\n'));
      case 'clear': return info('', {clear:true});
      case 'exit': case 'logout': return info('logout', {exit:true});
      case 'pwd': return info(cwd);
      case 'whoami': return info(SHELL_USER);
      case 'id': return info('uid=1000(' + SHELL_USER + ') gid=1000(' + SHELL_USER + ') groups=1000(' + SHELL_USER + '),27(sudo)');
      case 'hostname': return info(SHELL_HOST);
      case 'uname': return info(args.includes('-a') ? 'Linux ' + SHELL_HOST + ' 6.8.0-practice #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux' : args.includes('-r') ? '6.8.0-practice' : 'Linux');
      case 'date': return info(new Date().toString());
      case 'uptime': {const minutes = Math.max(1, Math.round((Date.now() - started) / 60000)); return info(new Date().toTimeString().slice(0, 8) + ' up ' + minutes + ' min,  1 user,  load average: 0.08, 0.05, 0.01');}
      case 'ps': return info(['    PID TTY          TIME CMD', '   1203 pts/0    00:00:00 bash', '   1340 pts/0    00:00:00 ' + (coding ? 'lab-check' : 'lab-console'), '   1401 pts/0    00:00:00 ps'].join('\n'));
      case 'df': return info(['Filesystem      Size  Used Avail Use% Mounted on', '/dev/sda1        20G  6.1G   13G  33% /', 'tmpfs           2.0G   12M  2.0G   1% /tmp', '(simulated)'].join('\n'));
      case 'free': return info(['               total        used        free      shared  buff/cache   available', 'Mem:            3934        1180        1902          24         852        2510', 'Swap:           2047           0        2047', '(simulated, MiB)'].join('\n'));
      case 'env': return info(['USER=' + SHELL_USER, 'HOME=' + HOME, 'SHELL=/bin/bash', 'PWD=' + cwd, 'LANG=en_US.UTF-8', 'LAB=' + scenario.id, 'TERM=xterm-256color'].join('\n'));
      case 'which': {const name = args[0] || ''; return COMMANDS.includes(name) && !['./check', 'sudo'].includes(name) ? info('/usr/bin/' + name) : warn(name ? name + ' not found' : 'which: give a command name');}
      case 'history': return info(history.map((item, index) => String(index + 1).padStart(4) + '  ' + item).join('\n'));
      case 'echo': {
        const dns = text.match(/^(?:sudo\s+)?echo\s+(?:nameserver\s+)?(\S+)\s*>\s*\/etc\/resolv\.conf$/i);
        if (dns && normalize(scenario.id) === 'NET201') return setNetwork({dns:dns[1]});
        return info(args.join(' ').replace(/^["']|["']$/g, ''));
      }
      case 'man': case '--help': {const name = (args[0] || '').toLowerCase().replace(/^\.\//, ''); return MAN[name] ? info(name.toUpperCase() + '(1)\n\n' + name + ' — ' + MAN[name]) : warn('No manual entry for ' + (args[0] || '(nothing)') + '. Type help.');}
      case 'cd': {const target = resolvePath(cwd, args[0] || '~'); if (!isDir(target)) return warn('bash: cd: ' + (args[0] || '~') + ': No such file or directory'); cwd = target; return info('');}
      case 'ls': case 'dir': return listing(args);
      case 'cat': case 'less': case 'more': {
        if (!args.length) return warn(command + ': give a file name, for example: cat README.txt');
        return info(args.filter(arg => !arg.startsWith('-')).map(arg => {const {file, error} = readFile(arg); return error ? command + ': ' + error : file.content;}).join('\n'));
      }
      case 'head': case 'tail': {
        let count = 10; const names = [];
        for (let index = 0; index < args.length; index++) {if (args[index] === '-n') {count = Math.max(1, Math.min(200, Number(args[++index]) || 10));} else if (/^-\d+$/.test(args[index])) count = Math.max(1, Math.min(200, Number(args[index].slice(1)))); else names.push(args[index]);}
        if (!names.length) return warn(command + ': give a file name, for example: ' + command + ' -n 3 README.txt');
        return info(names.map(arg => {const {file, error} = readFile(arg); if (error) return command + ': ' + error; const lines = file.content.split('\n'); return (command === 'head' ? lines.slice(0, count) : lines.slice(-count)).join('\n');}).join('\n'));
      }
      case 'grep': {
        const flags = args.filter(arg => arg.startsWith('-')).join(''), rest = args.filter(arg => !arg.startsWith('-'));
        if (rest.length < 2) return warn('grep: usage: grep [-i] [-n] <text> <file>');
        const needle = rest[0].replace(/^["']|["']$/g, ''), insensitive = flags.includes('i'), numbered = flags.includes('n'), matches = [];
        for (const arg of rest.slice(1)) {const {file, error} = readFile(arg); if (error) {matches.push('grep: ' + error); continue;} file.content.split('\n').forEach((line, index) => {if ((insensitive ? line.toLowerCase().includes(needle.toLowerCase()) : line.includes(needle))) matches.push((rest.length > 2 ? file.name + ':' : '') + (numbered ? (index + 1) + ':' : '') + line);});}
        return matches.length ? info(matches.join('\n')) : {output:'', kind:'info'};
      }
      case 'wc': {
        const flags = args.filter(arg => arg.startsWith('-')).join(''), names = args.filter(arg => !arg.startsWith('-'));
        if (!names.length) return warn('wc: give a file name, for example: wc -l fixtures.txt');
        return info(names.map(arg => {const {file, error} = readFile(arg); if (error) return 'wc: ' + error; const lines = file.content.split('\n').length, wordsCount = file.content.split(/\s+/).filter(Boolean).length, chars = file.content.length; const parts = flags.includes('l') ? [lines] : flags.includes('w') ? [wordsCount] : flags.includes('c') || flags.includes('m') ? [chars] : [lines, wordsCount, chars]; return parts.map(value => String(value).padStart(5)).join('') + ' ' + file.name;}).join('\n'));
      }
      case 'touch': {if (!args[0]) return warn('touch: give a file name'); const path = resolvePath(cwd, args[0]); if (files().has(path)) return info(''); return writeUserFile(path, '');}
      case 'mkdir': {if (!args[0]) return warn('mkdir: give a folder name'); const path = resolvePath(cwd, args.at(-1)); if (isDir(path)) return warn('mkdir: cannot create directory ‘' + args.at(-1) + '’: File exists'); if (!path.startsWith(HOME + '/') || !isDir(parent(path))) return warn('mkdir: cannot create directory ‘' + args.at(-1) + '’: Permission denied'); if (userDirs.size >= LIMITS.userFiles) return warn('mkdir: folder limit reached for this session'); userDirs.add(path); return info('');}
      case 'rm': {
        const names = args.filter(arg => !arg.startsWith('-')); if (!names.length) return warn('rm: give a file name');
        return info(names.map(arg => {const path = resolvePath(cwd, arg); if (userDirs.has(path)) {if (args.some(flag => /^-r/.test(flag)) || true) {for (const key of [...userFiles.keys()]) if (key.startsWith(path + '/')) userFiles.delete(key); userDirs.delete(path); return '';}} if (userFiles.has(path)) {userFiles.delete(path); return '';} return files().has(path) ? 'rm: cannot remove \'' + arg + '\': Permission denied (lab files are managed for you)' : 'rm: cannot remove \'' + arg + '\': No such file or directory';}).filter(Boolean).join('\n'));
      }
      case 'cp': case 'mv': {
        if (args.length < 2) return warn(command + ': usage: ' + command + ' <source> <destination>');
        const {file, error} = readFile(args[0]); if (error) return warn(command + ': ' + error);
        let destination = resolvePath(cwd, args[1]); if (isDir(destination)) destination = destination + '/' + file.name;
        const result = writeUserFile(destination, file.content); if (result.kind === 'warning') return result;
        if (command === 'mv') {if (!userFiles.has(file.path) || file.path === destination) return file.path === destination ? info('') : warn('mv: cannot move \'' + args[0] + '\': lab files are managed for you (it was copied instead)'); userFiles.delete(file.path);}
        return info('');
      }
      case 'nano': case 'vi': case 'vim': case 'gedit': case 'edit': case 'open': case 'xdg-open': {
        if (['console', 'settings', 'lab-console'].includes((args[0] || '').toLowerCase())) return info('Opening the Lab Console…', {open:{app:'console'}});
        if (['files', 'folder', '.'].includes((args[0] || '').toLowerCase())) return info('Opening Files…', {open:{app:'files', path:cwd}});
        if (!args[0]) return warn(command + ': give a file name, for example: nano notes.txt');
        const path = resolvePath(cwd, args[0]);
        if (isDir(path)) return info('Opening ' + args[0] + ' in Files…', {open:{app:'files', path}});
        let file = files().get(path);
        if (!file) {const created = writeUserFile(path, ''); if (created.kind === 'warning') return created; file = files().get(path);}
        return info('Opening ' + file.name + ' in the Text Editor…' + (file.writable ? '' : ' (read-only)'), {open:{app:'editor', path:file.path}});
      }
      case 'console': case 'lab-console': case 'settings': return info('Opening the Lab Console…', {open:{app:'console'}});
      case 'files': case 'explorer': case 'pcmanfm': case 'nautilus': return info('Opening Files…', {open:{app:'files', path:cwd}});
      case 'guide': return info('The Lab Guide is the panel beside this desktop.');
      case 'python3': case 'python': case 'node': {
        if (!coding) return notFound(command);
        const file = args[0] || (command === 'node' ? 'program.js' : 'program.py');
        if (!/^(?:\.\/)?program\.(?:py|js)$/.test(file)) return warn(command + ': can only run the lab program: ' + (command === 'node' ? 'node program.js <input>' : 'python3 program.py <input>'));
        return runProgram(file.replace(/^\.\//, ''), args.slice(1));
      }
      case './check': case 'check': case 'make': case 'npm': case 'pytest': {
        if (!coding) return notFound(command);
        if (command === 'npm' && args[0] !== 'test') return warn('npm: only npm test is available here.');
        if (command === 'make' && args.length && args[0] !== 'test') return warn('make: only make test is available here.');
        return runChecks();
      }
      case 'ip': return networkCommand(args);
      case 'ifconfig': case 'ipconfig': return normalize(scenario.id) === 'NET201' ? run('ipconfig') : notFound(command);
      case 'resolvectl': {if (normalize(scenario.id) !== 'NET201') return notFound(command); if (args[0] === 'dns' && args[2]) return setNetwork({dns:args[2]}); return warn('resolvectl: use resolvectl dns eth0 <server>');}
      case 'ping': case 'nslookup': case 'traceroute': case 'ssh': case 'curl': case 'wget': case 'nmap': case 'dig': return warn(command + ': this practice terminal only runs the lab tools' + (tools.length ? ' (' + tools.join(' · ') + ')' : '') + '. No real network is reachable.');
      case 'apt': case 'apt-get': case 'snap': case 'pip': case 'pip3': case 'chmod': case 'chown': case 'reboot': case 'shutdown': case 'passwd': return warn(command + ': not permitted on this practice machine.');
      default: return notFound(words[0]);
    }
  }
  function setNetwork(patch) {
    const current = state(), values = {ip:current.ip, mask:current.mask, gateway:current.gateway, dns:current.dns, ...patch};
    for (const [name, value] of Object.entries(patch)) if (!ipv4(value)) return warn('Invalid IPv4 address for ' + name + ': ' + value);
    const result = action('save-network', values);
    return {output:result.message, kind:result.kind || 'info'};
  }
  function networkCommand(args) {
    if (normalize(scenario.id) !== 'NET201') return notFound('ip');
    const current = state(), sub = (args[0] || '').toLowerCase();
    if (['addr', 'a', 'address'].includes(sub) && (!args[1] || args[1] === 'show')) return info(['1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN', '    inet 127.0.0.1/8 scope host lo', '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP', '    link/ether 52:54:00:12:34:56 brd ff:ff:ff:ff:ff:ff', '    inet ' + current.ip + ' netmask ' + current.mask + ' brd ' + current.ip.split('.').slice(0, 3).join('.') + '.255 scope global eth0', '    gateway ' + current.gateway + '  dns ' + current.dns, '(saved practice settings; use ip addr add or the Lab Console to change them)'].join('\n'));
    if (['addr', 'a', 'address'].includes(sub) && args[1] === 'add') {
      const [address, prefix] = (args[2] || '').split('/'), mask = prefix === undefined ? current.mask : maskFromPrefix(prefix);
      if (!ipv4(address) || !mask) return warn('ip: use ip addr add <address>/<prefix> dev eth0, for example ip addr add 10.24.8.25/24 dev eth0');
      return setNetwork({ip:address, mask});
    }
    if (['route', 'r'].includes(sub) && args[1] === 'add' && args[2] === 'default' && args[3] === 'via' && args[4]) return setNetwork({gateway:args[4]});
    if (['route', 'r'].includes(sub)) return info('default via ' + current.gateway + ' dev eth0 proto static\n' + current.ip + '/' + current.mask + ' dev eth0 proto kernel scope link src ' + current.ip);
    if (sub === 'link') return info('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP');
    return warn('ip: try ip addr, ip addr add <address>/<prefix> dev eth0, ip route, ip link, or ip route add default via <gateway>');
  }
  return {run, prompt, files, children, isDir, complete, writeFile:(path, content) => writeUserFile(path, content), history:() => [...history], cwd:() => cwd, coding, tools, home:HOME, labDir:LAB_DIR};
}
