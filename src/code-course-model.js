import {codeQuestMeta} from './code-quest-catalog.js?release=20261102-arcade';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const output={python:'print(%)',javascript:'console.log(%);',java:'System.out.println(%);',cpp:'std::cout << (%) << "\\n";',csharp:'System.Console.WriteLine(%);',typescript:'console.log(%);',go:'fmt.Println(%)',rust:'println!("{}", %);',swift:'print(%)',kotlin:'println(%)',ruby:'puts(%)'};
const variables={python:'energy = □',javascript:'const energy = □;',java:'int energy = □;',cpp:'int energy = □;',csharp:'int energy = □;',typescript:'const energy: number = □;',go:'energy := □',rust:'let energy = □;',swift:'let energy = □',kotlin:'val energy = □',ruby:'energy = □'};
const declare=(id,name,value)=>variables[id].replace('energy',name).replace('□',value);
const say=(id,value)=>output[id].replaceAll('%',value);
const condition=(id,expression,yes,no)=>id==='python'?`if ${expression}:\n    print("${yes}")\nelse:\n    print("${no}")`:id==='ruby'?`if ${expression}\n  puts("${yes}")\nelse\n  puts("${no}")\nend`:id==='go'?`if ${expression} {\n    fmt.Println("${yes}")\n} else {\n    fmt.Println("${no}")\n}`:id==='rust'?`if ${expression} {\n    println!("${yes}");\n} else {\n    println!("${no}");\n}`:id==='swift'?`if ${expression} {\n    print("${yes}")\n} else {\n    print("${no}")\n}`:`if (${expression}) {\n  ${say(id,'"'+yes+'"')}\n} else {\n  ${say(id,'"'+no+'"')}\n}`;
const loops=freeze({
  python:'for step in range(□):\n    print("Step")',javascript:'for (let step = 0; step < □; step++) {\n  console.log("Step");\n}',java:'for (int step = 0; step < □; step++) {\n  System.out.println("Step");\n}',cpp:'for (int step = 0; step < □; step++) {\n  std::cout << "Step\\n";\n}',csharp:'for (int step = 0; step < □; step++) {\n  System.Console.WriteLine("Step");\n}',typescript:'for (let step: number = 0; step < □; step++) {\n  console.log("Step");\n}',go:'for step := 0; step < □; step++ {\n    fmt.Println("Step")\n}',rust:'for _step in 0..□ {\n    println!("Step");\n}',swift:'for _ in 0..<□ {\n    print("Step")\n}',kotlin:'repeat(□) {\n    println("Step")\n}',ruby:'□.times do\n  puts("Step")\nend'
});
const functions=freeze({
  python:'def total(items, per_box):\n    return items □ per_box',javascript:'function total(items, perBox) {\n  return items □ perBox;\n}',java:'static int total(int items, int perBox) {\n  return items □ perBox;\n}',cpp:'int total(int items, int perBox) {\n  return items □ perBox;\n}',csharp:'int Total(int items, int perBox) {\n  return items □ perBox;\n}',typescript:'function total(items: number, perBox: number): number {\n  return items □ perBox;\n}',go:'func total(items int, perBox int) int {\n    return items □ perBox\n}',rust:'fn total(items: i32, per_box: i32) -> i32 {\n    items □ per_box\n}',swift:'func total(_ items: Int, _ perBox: Int) -> Int {\n    return items □ perBox\n}',kotlin:'fun total(items: Int, perBox: Int): Int {\n    return items □ perBox\n}',ruby:'def total(items, per_box)\n  items □ per_box\nend'
});
const collections=freeze({
  python:'items = ["seed", "lamp", "book"]\nprint(items[□])',javascript:'const items = ["seed", "lamp", "book"];\nconsole.log(items[□]);',java:'String[] items = {"seed", "lamp", "book"};\nSystem.out.println(items[□]);',cpp:'std::vector<std::string> items = {"seed", "lamp", "book"};\nstd::cout << items[□] << "\\n";',csharp:'string[] items = {"seed", "lamp", "book"};\nSystem.Console.WriteLine(items[□]);',typescript:'const items: string[] = ["seed", "lamp", "book"];\nconsole.log(items[□]);',go:'items := []string{"seed", "lamp", "book"}\nfmt.Println(items[□])',rust:'let items = ["seed", "lamp", "book"];\nprintln!("{}", items[□]);',swift:'let items = ["seed", "lamp", "book"]\nprint(items[□])',kotlin:'val items = listOf("seed", "lamp", "book")\nprintln(items[□])',ruby:'items = ["seed", "lamp", "book"]\nputs(items[□])'
});
export const COURSE_CHIPS=freeze({hello:'"Hello, rover!"',bye:'"Goodbye!"',six:'6',text:'"6"',bool:'true',plus:'+',times:'*',minus:'-',greater:'>','at-least':'>=','at-most':'<=',two:'2',three:'3',four:'4',zero:'0',one:'1',asc:'ASC',desc:'DESC',sum:'SUM',count:'COUNT',max:'MAX',name:'name',energy:'energy',all:'*'});
export const COURSE_ROBOTS=freeze([{name:'Comet',energy:2},{name:'Luna',energy:3},{name:'Pip',energy:4}]);
const lesson=(title,goal,teach,example,choices,hint)=>({title,goal,teach,example,choices,hint});
const BASE_LESSONS=freeze([
  lesson('Show a message','Make it say Hello, rover!','Text goes inside quotes. This text is called a string.','"Hi" → Hi',['hello','bye','six'],'Choose the words inside quotes.'),
  lesson('Keep a number','Give energy the number 6.','A variable is a name for a value. Here, energy needs a number.','6 is a number. "6" is text.',['six','text','bool'],'Numbers do not need quotes.'),
  lesson('Add two numbers','Make 6 and 4 add up to 10.','Use + to add numbers. Use * to multiply, or - to subtract.','2 + 3 → 5',['plus','times','minus'],'Choose + to add.'),
  lesson('Make a choice','Use Recharge for 2. Use Ready for 3 or more.','>= means “at least.” It includes the number you compare with.','3 >= 3 → yes',['greater','at-least','at-most'],'At least 3 includes exactly 3.'),
  lesson('Repeat an action','Show Step three times.','A loop repeats an action. Choose how many times to repeat it.','Repeat twice → Step, Step',['two','three','four'],'Use 3 for three repetitions.'),
  lesson('Use a function','Find the total for each pair of numbers.','A function keeps a rule for reuse. This rule multiplies the two numbers you give it.','total(2, 3) → 6',['plus','times','minus'],'Type * to multiply.'),
  lesson('Pick a list item','Pick lamp from the list.','A list keeps items in order. Counting positions starts at 0.','["seed", "lamp", "book"] → lamp is at 1',['zero','one','two'],'The second item has position 1.'),
  lesson('Try a small project','Find the cost. Say Ready when the budget can pay.','First multiply boxes by price. Then check whether the budget covers the cost.','2 boxes × 3 tokens = 6. Budget 6 → Ready.',['plus','times','minus','greater','at-least','at-most'],'Use * for cost. Use >= to include an exact budget.')
]);
const SQL_LESSONS=freeze([
  BASE_LESSONS[0],lesson('Name a value','Show the number 6 in the energy column.','A result column holds one kind of value. AS names it. Numbers need no quotes.','SELECT 6 AS energy → energy: 6',['six','text','bool'],'Choose 6 without quotes.'),BASE_LESSONS[2],
  lesson('Filter rows with WHERE','Show robots with energy 3 or more.','A table has rows and columns. WHERE keeps only rows matching a rule.','energy >= 3 → Luna and Pip',['greater','at-least','at-most'],'Use >= to include exactly 3.'),
  lesson('Order the result','Show the lowest energy first.','ORDER BY sorts rows. ASC goes up; DESC goes down.','ASC → 2, 3, 4',['asc','desc'],'Choose ASC for small to large.'),
  lesson('Summarize a column','Add all energy values. Get 9.','SUM adds a column. COUNT counts values. MAX finds the biggest value.','SUM of 2, 3 and 4 → 9',['sum','count','max'],'Type SUM to add the energy values.'),
  lesson('Pick a column','Show names only.','A column holds one kind of value. SELECT chooses which columns to show.','SELECT name → names only',['name','energy','all'],'Type name for the names column.'),
  lesson('Try a small query','Show energy 3 or more, highest first: Pip, Luna.','Use WHERE to filter. Use ORDER BY to sort the remaining rows.','energy >= 3, then DESC → Pip, Luna',['greater','at-least','at-most','asc','desc'],'Type >= in the first gap and DESC in the second.')
]);
const FIRST_LINES=freeze({python:'print shows a message. Put text inside quotes.',javascript:'console.log shows a message. Put text inside quotes.',java:'System.out.println shows a message. Put text inside quotes.',cpp:'std::cout shows a message. Put text inside quotes.',csharp:'System.Console.WriteLine shows a message. Put text inside quotes.',typescript:'console.log shows a message. Put text inside quotes.',go:'fmt.Println shows a message. Put text inside quotes.',rust:'println! shows a message. Put text inside quotes.',swift:'print shows a message. Put text inside quotes.',kotlin:'println shows a message. Put text inside quotes.',ruby:'puts shows a message. Put text inside quotes.',sql:'SELECT shows a value. Put text inside single quotes.'});
const COURSES=freeze(Object.fromEntries(Object.keys(FIRST_LINES).map(id=>[id,(id==='sql'?SQL_LESSONS:BASE_LESSONS).map((item,index)=>index===0?{...item,teach:FIRST_LINES[id],example:id==='sql'?"SELECT 'Hi'; → Hi":say(id,'"Hi"')+' → Hi'}:id==='csharp'&&index===5?{...item,example:'Total(2, 3) → 6'}:item)])));
export const courseLessons=id=>Object.hasOwn(COURSES,id)?COURSES[id]:BASE_LESSONS;
export const courseChip=(id,choice)=>id==='sql'&&['hello','bye','text'].includes(choice)?COURSE_CHIPS[choice].replaceAll('"',"'"):id==='python'&&choice==='bool'?'True':COURSE_CHIPS[choice];
export function courseTemplate(id,index){
  if(!codeQuestMeta(id))return '';
  if(id==='sql')return ['SELECT □ AS message;','SELECT □ AS energy;','SELECT 6 □ 4 AS energy;','SELECT name FROM robots WHERE energy □ 3;','SELECT name FROM robots ORDER BY energy □;','SELECT □(energy) AS result FROM robots;','SELECT □ FROM robots;','SELECT name FROM robots\nWHERE energy □ 3\nORDER BY energy ◇;'][index]||'';
  if(index===0)return say(id,'□');if(index===1)return variables[id];
  if(index===2)return declare(id,'energy','6')+'\n'+declare(id,'bonus','4')+'\n'+say(id,'energy □ bonus');
  if(index===3)return declare(id,'energy','3')+'\n'+condition(id,'energy □ 3','Ready','Recharge');
  if(index===4)return loops[id];if(index===5)return functions[id];if(index===6)return collections[id];
  return declare(id,'boxes','2')+'\n'+declare(id,'perBox','3')+'\n'+declare(id,'budget','6')+'\n'+declare(id,'cost','boxes □ perBox')+'\n'+condition(id,'budget ◇ cost','Ready','Save more');
}
const compare=(choice,a,b)=>choice==='at-least'?a>=b:choice==='greater'?a>b:a<=b;
const calculate=(choice,a,b)=>choice==='plus'?a+b:choice==='times'?a*b:a-b;
export function checkCourse(id,index,choice,second){
  const lessons=courseLessons(id),current=lessons[index];
  if(!codeQuestMeta(id)||!current||!current.choices.includes(choice))return {ok:false,output:'Choose or type a code fragment for this step.'};
  if(index===7){
    const allowedSecond=id==='sql'?['asc','desc']:['greater','at-least','at-most'];
    const allowedFirst=id==='sql'?['greater','at-least','at-most']:['plus','times','minus'];
    if(!allowedFirst.includes(choice)||!allowedSecond.includes(second))return {ok:false,output:'Complete both code gaps before checking.'};
    if(id==='sql'){const rows=COURSE_ROBOTS.filter(r=>compare(choice,r.energy,3)).toSorted((a,b)=>second==='desc'?b.energy-a.energy:a.energy-b.energy);return {ok:rows.map(r=>r.name).join(',')==='Pip,Luna',output:rows.map(r=>r.name).join('\n')||'(no rows)'};}
    const orders=[[2,3,6],[3,3,8],[4,2,10]],actual=orders.map(([boxes,unit,budget])=>compare(second,budget,calculate(choice,boxes,unit))),expected=[true,false,true];
    return {ok:actual.every((value,i)=>value===expected[i]),output:orders.map(([boxes,unit,budget],i)=>`${boxes} × ${unit}, budget ${budget} → ${actual[i]?'Ready':'Save more'}`).join('\n')};
  }
  if(index===0){const value=choice==='hello'?'Hello, rover!':choice==='bye'?'Goodbye!':'6';return {ok:value==='Hello, rover!',output:value};}
  if(index===1)return {ok:choice==='six',output:choice==='six'?(id==='sql'?'energy: 6':'energy holds the number 6'):choice==='text'?'This is text. Try a number.':'This is a yes/no value. Try a number.'};
  if(index===2){const value=calculate(choice,6,4);return {ok:value===10,output:String(value)};}
  if(index===3){const answers=COURSE_ROBOTS.map(r=>compare(choice,r.energy,3));return {ok:answers.every((value,i)=>value===(COURSE_ROBOTS[i].energy>=3)),output:id==='sql'?COURSE_ROBOTS.filter((_,i)=>answers[i]).map(r=>r.name).join('\n'):COURSE_ROBOTS.map((r,i)=>`${r.energy} → ${answers[i]?'Ready':'Recharge'}`).join('\n')};}
  if(id==='sql'){
    if(index===4)return {ok:choice==='asc',output:(choice==='desc'?[...COURSE_ROBOTS].reverse():COURSE_ROBOTS).map(r=>r.name).join('\n')};
    if(index===5){const value=choice==='sum'?9:choice==='count'?3:4;return {ok:value===9,output:String(value)};}
    return {ok:choice==='name',output:COURSE_ROBOTS.map(r=>choice==='name'?r.name:choice==='energy'?r.energy:r.name+' | '+r.energy).join('\n')};
  }
  if(index===4){const times=choice==='two'?2:choice==='three'?3:4;return {ok:times===3,output:Array(times).fill('Step').join('\n')};}
  if(index===5){const inputs=[[2,3],[3,4],[0,5]],values=inputs.map(([a,b])=>calculate(choice,a,b)),name=id==='csharp'?'Total':'total';return {ok:values.every((value,i)=>value===inputs[i][0]*inputs[i][1]),output:inputs.map(([a,b],i)=>`${name}(${a}, ${b}) → ${values[i]}`).join('\n')};}
  const value=['seed','lamp','book'][choice==='zero'?0:choice==='one'?1:2];return {ok:value==='lamp',output:value};
}
export const initialCourse=id=>codeQuestMeta(id)?{id,lesson:0,choice:null,second:null,passed:false,finished:false,feedback:'',output:null,typed:'',typedSecond:'',turns:0}:null;
export function resolveCourseChip(id,index,text,second=false){
  if(typeof text!=='string'||text.length>160)return null;
  const trimmed=text.trim(),choices=courseLessons(id)[index]?.choices||[];
  const allowed=index===7?(second?(id==='sql'?['asc','desc']:['greater','at-least','at-most']):(id==='sql'?['greater','at-least','at-most']:['plus','times','minus'])):choices;
  const normalize=value=>id==='sql'&&index>=3?value.toUpperCase():value;
  return allowed.find(choice=>normalize(courseChip(id,choice))===normalize(trimmed))||null;
}
export function courseAction(state,action,value){
  if(!state||!codeQuestMeta(state.id))return state;
  if(action==='restart')return initialCourse(state.id);
  if(state.finished)return state;
  const lesson=courseLessons(state.id)[state.lesson];if(!lesson)return state;
  if(action==='choose'&&!state.passed&&lesson.choices.includes(value))return {...state,choice:value,feedback:'',output:null,turns:state.turns+1};
  if(action==='choose-second'&&!state.passed&&state.lesson===7&&lesson.choices.includes(value))return {...state,second:value,feedback:'',output:null,turns:state.turns+1};
  if(action==='type'&&!state.passed&&value&&typeof value.first==='string'&&typeof value.second==='string'&&value.first.length<=160&&value.second.length<=160)return {...state,typed:value.first,typedSecond:value.second,choice:resolveCourseChip(state.id,state.lesson,value.first),second:resolveCourseChip(state.id,state.lesson,value.second,true),feedback:'',output:null};
  if(action==='check'&&!state.passed){const result=checkCourse(state.id,state.lesson,state.choice,state.second);return {...state,passed:result.ok,output:result.output,feedback:result.ok?lesson.teach:'Try another answer. The example can help.',turns:state.turns+1};}
  if(action==='next'&&state.passed)return state.lesson===7?{...state,finished:true}:{...initialCourse(state.id),lesson:state.lesson+1};
  return state;
}
