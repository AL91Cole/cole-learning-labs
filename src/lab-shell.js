// Simulated shell for the lab desktop. It gives the learner a terminal that
// feels like a small Linux machine (ls, cat, nano, python3, ping…) while every
// result comes from the lab's own simulation engines: the read-only diagnostic
// tools, the bounded coding interpreter and the workspace actions. Nothing here
// executes real commands, touches real files or reaches a network. The module
// is pure: the page passes in getState/action callbacks and reads results back.
import {workspaceDiagnostic} from './workspaces.js?release=20261107-tech-team';
import {supportsCodingLab, codingDefinition, executeCoding, codingStarter} from './coding-lab.js?release=20261107-tech-team';

const normalize = id => typeof id === 'string' ? id.replaceAll('-', '').toUpperCase() : '';
export const SHELL_USER = 'student', SHELL_HOST = 'lab-pc', HOME = '/home/student', LAB_DIR = HOME + '/lab';
const LIMITS = Object.freeze({line:240, history:50});

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
  help:'Lists every command this practice terminal understands.', ls:'Lists files in the current folder. ls -l shows sizes and whether a file is writable.', cat:'Prints a file. Example: cat README.txt', cd:'Changes folder: cd lab, cd .., cd ~', pwd:'Prints the current folder.',
  nano:'Opens a file in the Text Editor window. Example: nano program.py', python3:'Runs program.py with one input value. Example: python3 program.py 2', node:'Runs program.js with one input value. Example: node program.js 2', check:'Runs every input card against the saved program (same as Run all fixtures).',
  console:'Opens the Lab Console window with the lab’s settings and test.', files:'Opens the Files window.', clear:'Clears the terminal.', history:'Shows your recent commands.', echo:'Prints text.', whoami:'Prints your user name.', hostname:'Prints this machine’s name.', date:'Prints the simulated clock.', man:'Shows what a command does. Example: man cat',
  ip:'Shows or changes the workstation address. Examples: ip addr · ip addr add 10.24.8.25/24 dev eth0 · ip route add default via 10.24.8.1', resolvectl:'Sets the DNS server. Example: resolvectl dns eth0 10.24.8.53'
});

const maskFromPrefix = prefix => {const bits = Number(prefix); if (!Number.isInteger(bits) || bits < 0 || bits > 32) return null; const value = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0; return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');};
const ipv4 = value => /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(value);
const settingsText = state => Object.entries(state).filter(([name, value]) => !['tested', 'results', 'workspaceEdits', 'checkRuns', 'output', 'errors', 'sourceAtRun', 'languageAtRun', 'fixtureIndex', 'solutions', 'history', 'response', 'networkBench'].includes(name) && (typeof value !== 'object' || Array.isArray(value))).map(([name, value]) => name + ': ' + (Array.isArray(value) ? (value.length ? value.join(', ') : '(none)') : String(value))).join('\n') || '(no saved settings)';

/** The virtual files a learner can list and read. Content is regenerated from the scenario and the current state. */
export function labFiles(scenario, state = {}) {
  const coding = supportsCodingLab(scenario.id), files = new Map();
  const add = (path, content, writable = false) => files.set(path, {path, name:path.slice(path.lastIndexOf('/') + 1), content:String(content), writable});
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

function resolve(cwd, target) {
  if (!target || target === '~') return HOME;
  const base = target.startsWith('/') ? [] : cwd.split('/').filter(Boolean), parts = target.replace(/^~/, HOME).split('/').filter(Boolean);
  const stack = target.startsWith('/') || target.startsWith('~') ? [] : base;
  for (const part of parts) {if (part === '.') continue; if (part === '..') stack.pop(); else stack.push(part);}
  return '/' + stack.join('/');
}

/** A shell session. run(line) returns {output, kind, open?, clear?}. */
export function createLabShell(scenario, {getState, action = () => ({message:'', kind:'info'}), verify = null} = {}) {
  const coding = supportsCodingLab(scenario.id), tools = labTools(scenario.id), history = [];
  let cwd = LAB_DIR;
  const state = () => getState() || {};
  const files = () => labFiles(scenario, state());
  const listing = path => {
    const all = files(), prefix = path.endsWith('/') ? path : path + '/';
    if (path === '/' ) return ['home/'];
    if (path === '/home') return ['student/'];
    if (path === HOME) return ['lab/'];
    const names = new Set();
    for (const file of all.values()) if (file.path.startsWith(prefix)) {const rest = file.path.slice(prefix.length); names.add(rest.includes('/') ? rest.slice(0, rest.indexOf('/')) + '/' : rest);}
    return [...names].sort();
  };
  const isDir = path => ['/', '/home', HOME, LAB_DIR, LAB_DIR + '/resources'].includes(path);
  const prompt = () => SHELL_USER + '@' + SHELL_HOST + ':' + (cwd.startsWith(HOME) ? '~' + cwd.slice(HOME.length) : cwd) + '$';
  const info = (output, extra = {}) => ({output, kind:'info', ...extra});
  const warn = output => ({output, kind:'warning'});
  const notFound = name => warn('bash: ' + name + ': command not found. Type help to see what this practice terminal understands.');
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
  function run(line) {
    if (typeof line !== 'string') return warn('Type a command.');
    const text = line.trim().slice(0, LIMITS.line);
    if (!text) return info('');
    history.push(text); if (history.length > LIMITS.history) history.shift();
    const words = text.replace(/^sudo\s+/, '').split(/\s+/), command = words[0].toLowerCase(), args = words.slice(1), lower = text.toLowerCase().replace(/^sudo\s+/, '').replace(/\s+/g, ' ');
    if (tools.includes(lower)) {const result = action('inspect-command', {command:lower}); return {output:result.message, kind:result.kind || 'info', tool:true};}
    if (!coding && tools.some(tool => tool.split(' ')[0] === command)) return warn('Try the full tool name: ' + tools.filter(tool => tool.split(' ')[0] === command).join(' · '));
    switch (command) {
      case 'help': return info(['This is a practice terminal. It understands:', '  ' + ['help', 'ls', 'cd', 'pwd', 'cat', 'nano', 'clear', 'history', 'echo', 'whoami', 'hostname', 'date', 'man', 'console', 'files', ...(coding ? ['python3 program.py <input>', 'node program.js <input>', './check'] : []), ...(normalize(scenario.id) === 'NET201' ? ['ip addr', 'ip addr add', 'ip route add', 'resolvectl dns'] : [])].join(', '), ...(tools.length ? ['Lab tools for this case:', '  ' + tools.join(' · ')] : []), 'No real system, network or file is touched.'].join('\n'));
      case 'clear': return info('', {clear:true});
      case 'pwd': return info(cwd);
      case 'whoami': return info(SHELL_USER);
      case 'hostname': return info(SHELL_HOST);
      case 'date': return info(new Date().toString());
      case 'uname': return info('Linux ' + SHELL_HOST + ' 6.1.0-practice #1 SMP x86_64 GNU/Linux (simulated)');
      case 'history': return info(history.map((item, index) => String(index + 1).padStart(4) + '  ' + item).join('\n'));
      case 'echo': {
        const redirect = text.match(/^echo\s+(?:nameserver\s+)?(\S+)\s*>\s*\/etc\/resolv\.conf$/i);
        if (redirect && normalize(scenario.id) === 'NET201') return setNetwork({dns:redirect[1]});
        return info(args.join(' ').replace(/^["']|["']$/g, ''));
      }
      case 'man': case '--help': {const name = (args[0] || '').toLowerCase(); return MAN[name] ? info(name + ' — ' + MAN[name]) : warn('No manual entry for ' + (args[0] || '(nothing)') + '. Type help.');}
      case 'cd': {const target = resolve(cwd, args[0] || '~'); if (!isDir(target)) return warn('cd: ' + (args[0] || '~') + ': No such directory'); cwd = target; return info('');}
      case 'ls': case 'dir': {
        const flags = args.filter(arg => arg.startsWith('-')), target = resolve(cwd, args.find(arg => !arg.startsWith('-')) || '.');
        if (!isDir(target)) {const file = files().get(target); return file ? info(flags.includes('-l') ? (file.writable ? '-rw-r--r--' : '-r--r--r--') + '  ' + file.content.length + '  ' + file.name : file.name) : warn('ls: cannot access ' + (args.find(arg => !arg.startsWith('-')) || target) + ': No such file or directory');}
        const names = listing(target);
        if (!flags.includes('-l')) return info(names.join('  '));
        const all = files();
        return info(names.map(name => {const file = all.get((target.endsWith('/') ? target : target + '/') + name); return name.endsWith('/') ? 'drwxr-xr-x  -  ' + name : (file?.writable ? '-rw-r--r--' : '-r--r--r--') + '  ' + String(file?.content.length ?? 0).padStart(5) + '  ' + name;}).join('\n'));
      }
      case 'cat': case 'less': case 'more': case 'head': case 'tail': {
        if (!args.length) return warn(command + ': give a file name, for example: cat README.txt');
        const outputs = args.filter(arg => !arg.startsWith('-')).map(arg => {const file = files().get(resolve(cwd, arg)); if (!file) return command + ': ' + arg + ': No such file or directory'; const lines = file.content.split('\n'); return command === 'head' ? lines.slice(0, 10).join('\n') : command === 'tail' ? lines.slice(-10).join('\n') : file.content;});
        return info(outputs.join('\n'));
      }
      case 'nano': case 'vi': case 'vim': case 'gedit': case 'edit': case 'open': {
        if (['console', 'settings', 'lab-console'].includes((args[0] || '').toLowerCase())) return info('Opening the Lab Console…', {open:{app:'console'}});
        if (['files', 'folder'].includes((args[0] || '').toLowerCase())) return info('Opening Files…', {open:{app:'files'}});
        const target = resolve(cwd, args[0] || ''), file = files().get(target);
        if (!file) return warn(command + ': ' + (args[0] || '(no file)') + ': No such file. Use ls to see the lab files.');
        return info('Opening ' + file.name + ' in the Text Editor…' + (file.writable ? '' : ' (read-only)'), {open:{app:'editor', path:file.path}});
      }
      case 'console': case 'lab-console': case 'settings': return info('Opening the Lab Console…', {open:{app:'console'}});
      case 'files': case 'explorer': case 'pcmanfm': return info('Opening Files…', {open:{app:'files'}});
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
      case 'ping': case 'nslookup': case 'traceroute': case 'ssh': case 'curl': case 'wget': case 'nmap': return warn(command + ': this practice terminal only runs the lab tools' + (tools.length ? ' (' + tools.join(' · ') + ')' : '') + '. No real network is reachable.');
      case 'rm': case 'mv': case 'cp': case 'touch': case 'mkdir': case 'chmod': case 'apt': case 'apt-get': return warn(command + ': the lab files are managed for you. Edit program files with nano; change settings in the Lab Console.');
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
    if (['addr', 'a', 'address'].includes(sub) && (!args[1] || args[1] === 'show')) return info(['1: lo: <LOOPBACK,UP> inet 127.0.0.1/8', '2: eth0: <BROADCAST,MULTICAST,UP> state UP', '    inet ' + current.ip + ' netmask ' + current.mask, '    gateway ' + current.gateway + '  dns ' + current.dns, '(saved practice settings; use the Lab Console or ip addr add to change them)'].join('\n'));
    if (['addr', 'a', 'address'].includes(sub) && args[1] === 'add') {
      const [address, prefix] = (args[2] || '').split('/'), mask = prefix === undefined ? current.mask : maskFromPrefix(prefix);
      if (!ipv4(address) || !mask) return warn('ip: use ip addr add <address>/<prefix> dev eth0, for example ip addr add 10.24.8.25/24 dev eth0');
      return setNetwork({ip:address, mask});
    }
    if (['route', 'r'].includes(sub) && args[1] === 'add' && args[2] === 'default' && args[3] === 'via' && args[4]) return setNetwork({gateway:args[4]});
    if (['route', 'r'].includes(sub)) return info('default via ' + current.gateway + ' dev eth0\n' + current.ip + '/' + current.mask + ' dev eth0 scope link');
    return warn('ip: try ip addr, ip addr add <address>/<prefix> dev eth0, ip route, or ip route add default via <gateway>');
  }
  return {run, prompt, files, history:() => [...history], cwd:() => cwd, coding, tools};
}
