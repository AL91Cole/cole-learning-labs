// Coding investigation cases: fictional briefs, clues and questions. The
// interpreter and workbench stay in coding-lab.js and download with the route.
const clue = (id,label,text) => ({id,label,text});
const question = (label,answer) => ({label,answer});

export const CODING_SCENARIOS = [
  {
    id:'CODE-501',title:'The Supply Calculator',track:'coding',grade:'7–8',minutes:20,
    summary: 'Make a supply calculator work for every order.',requester:'Virtual lab coordinator · Supply desk',
    goal:'Print the total cost: the supplied quantity multiplied by 3 credits per kit.',
    brief: 'Each kit costs 3 credits. Fix the calculation, then try every quantity card.',
    clues:[clue('input','Read the input contract','quantity is supplied by the test fixture. It can change between runs; do not replace it with a fixed number.'),clue('price','Read the price label','Each kit costs 3 credits. Print a number only: quantity multiplied by the price.'),clue('fixtures','Inspect the fixture sheet','The tests supply quantities 2, 5, and 0. A zero quantity must produce zero cost.')],
    questions:[question('What does quantity represent?','quantity is the number of kits requested. The simulator supplies a different value for each fixture.'),question('How should the answer look?','Print one numeric total, with no currency label. For two kits at 3 credits each, print 6.')],
    interviewFacts:[{keywords:['price','cost','credit','kit'],answer:'Each kit costs 3 credits. The output must be the supplied quantity multiplied by 3.'},{keywords:['input','quantity','fixture'],answer:'The simulator supplies quantity. Test quantities are 2, 5, and 0; the same program must handle all three.'}]
  },
  {
    id:'CODE-502',title:'The Classroom Thermostat',track:'coding',grade:'9–10',minutes:25,
    summary: 'Make a room display react to changing temperatures.',requester:'Virtual facilities technician · Room monitor',
    goal:'Print Heating below 20, Comfortable from 20 through 25, and Cooling above 25.',
    brief: 'Fix the display rule. Try 20 and 25 as well as a colder and warmer room. No real equipment is connected.',
    clues:[clue('contract','Read the control specification','The input temperature is a number. Below 20 print Heating. From 20 through 25 inclusive print Comfortable. Above 25 print Cooling.'),clue('boundary','Inspect the boundary tests','The tests include 18, 20, 25, and 30. The values 20 and 25 belong to Comfortable.'),clue('output','Read the display format','Print exactly one word per input: Heating, Comfortable, or Cooling. Letter case matters.')],
    questions:[question('Are the boundaries included?','Yes. Both 20 and 25 belong to Comfortable. Only values below 20 need Heating, and only values above 25 need Cooling.'),question('Is this connected to equipment?','No. The temperatures and display are fictional test fixtures inside this coding simulation.')],
    interviewFacts:[{keywords:['temperature','threshold','boundary','comfortable'],answer:'Below 20 means Heating. Both 20 and 25 are Comfortable. Above 25 means Cooling.'},{keywords:['fixture','test','input'],answer:'Tests supply temperatures 18, 20, 25, and 30. Print exactly one correctly capitalized mode word for each input.'}]
  },
  {
    id:'CODE-503',title:'The Workstation Readiness Loop',track:'coding',grade:'11–12',minutes:30,
    summary: 'Build the right readiness list for each room size.',requester:'Virtual deployment lead · Training room',
    goal:'Print Ready 1 through Ready N, one line per station, using the supplied stations count.',
    brief: 'The list includes a station that does not exist. Fix the loop, then compare its first and last lines for each room.',
    secondLook:{prompt:'Have someone trace one repeat of the loop with you.',checks:['What changes after each repeat?','Does that match the output for every test?']},
    clues:[clue('input','Read the deployment sheet','stations is supplied by the test fixture. Test room sizes are 1, 3, and 5.'),clue('sequence','Inspect the required checklist','A room with three stations needs Ready 1, Ready 2, and Ready 3 on separate lines. Do not print Ready 0 or an extra line.'),clue('loop','Read the loop card','Both loop forms need a start, a stopping boundary, and a step. Print exactly stations lines. The editor reference covers JavaScript for, Python range, and legacy repeat.')],
    questions:[question('What should the first line be?','The first line is Ready 1. A three-station room ends at Ready 3, with three lines total.'),question('How does repeat work?','repeat(count) executes the braced block count times. Counts must be whole numbers from 0 through 50. The simulator also limits total execution steps.')],
    interviewFacts:[{keywords:['station','room','fixture','input'],answer:'The supplied stations count changes between 1, 3, and 5. Print exactly that many readiness lines.'},{keywords:['loop','repeat','counter','start'],answer:'The first station is 1. repeat(stations) repeats the block once per station; advance the counter by one each time.'}]
  },
  {
    id:'CODE-504',title:'Pixel Pet Snack Time',track:'coding',grade:'7–8',minutes:20,
    summary:'Turn fictional snack tokens into a pixel pet’s energy display.',requester:'Noel · Pixel-pet caretaker',
    goal:'Print Energy followed by a space and snacks multiplied by 4. Zero snacks means Energy 0.',
    brief:'Each fictional snack token adds 4 energy points. Fix the total and keep the Energy label. These tokens are not real food.',
    clues:[clue('input','Read the snack tray','snacks is a read-only fixture input. The tray tries 0, 2, and 5 fictional snack tokens.'),clue('energy','Read the pet card','Each snack token adds exactly 4 energy points. No tokens add no energy.'),clue('format','Read the display card','Print one line: Energy, one space, then the total. For two tokens, the display must say Energy 8.')],
    questions:[question('Is this advice about feeding a pet?','No. This is an imaginary pixel pet and made-up snack tokens. It is a coding exercise, not real animal-care advice.'),question('How much energy does a token add?','Each fictional snack token adds 4 energy points. Keep the input variable so the same program works with every tray.')],
    interviewFacts:[{keywords:['snack','token','input','tray'],answer:'The fixture supplies snacks: 0, 2, and 5. Each fictional token adds 4 energy points.'},{keywords:['energy','display','label','output'],answer:'Print Energy, one space, then the total. Two snack tokens produce Energy 8; zero produces Energy 0.'}]
  },
  {
    id:'CODE-505',title:'Arcade Prize Patrol',track:'coding',grade:'9–10',minutes:25,
    summary:'Make a pretend prize desk respond at the right scores.',requester:'Kit · Arcade prize-desk volunteer',
    goal:'Print Try again below 50 points, Sticker from 50 through 99, and Badge for 100 or more.',
    brief:'The fictional prize desk mixes up scores of 50 and 100. Fix the decisions, then try the score cards. No real rewards are involved.',
    clues:[clue('threshold','Read the prize board','Below 50 points: Try again. From 50 through 99: Sticker. At 100 points or more: Badge.'),clue('fixtures','Read the score cards','The checks use points 0, 49, 50, 99, 100, and 140. Both thresholds must be tested.'),clue('format','Read the message card','Print exactly one message per score: Try again, Sticker, or Badge. Keep the capitalization and the space in Try again.')],
    questions:[question('What happens at exactly 50 or 100?','Exactly 50 earns Sticker. Exactly 100 earns Badge. A score of 49 still prints Try again.'),question('Can I change the score to win?','No. points is supplied and read-only. Repair the decisions so the same code handles all the score cards fairly.')],
    interviewFacts:[{keywords:['prize','threshold','boundary','sticker','badge'],answer:'Below 50 prints Try again; 50 through 99 prints Sticker; 100 or more prints Badge.'},{keywords:['point','score','input','fixture'],answer:'The fixture supplies points 0, 49, 50, 99, 100, and 140. Keep points read-only and test the same program on every card.'}]
  },
  {
    id:'CODE-506',title:'Rover Energy Planner',track:'coding',grade:'11–12',minutes:30,
    summary:'Build an energy total for a fictional rover trip.',requester:'Sol · Rover mission planner',
    goal:'Print one numeric total equal to 1 + 2 + ... + steps. With zero steps, print 0.',
    brief:'Leg 1 costs 1 energy unit, leg 2 costs 2, and so on. Fix the missing last leg and add every cost. No real rover is connected.',
    clues:[clue('input','Read the mission cards','steps is supplied and read-only. Test trip lengths are 0, 1, 4, and 6.'),clue('sum','Read the route costs','Start energy at 0. Add each leg’s number once, from 1 through steps. Four legs cost 1 + 2 + 3 + 4 = 10.'),clue('boundary','Inspect an empty trip','A zero-step trip runs no legs and prints 0. Print one numeric total after the loop, not one line per leg.')],
    questions:[question('What are the first and last legs?','The first leg is 1 and the last leg is steps. For four legs, add 1, 2, 3, and 4.'),question('When should the program print?','Print the accumulated energy once after the loop. For a zero-step trip, the untouched total is 0.')],
    interviewFacts:[{keywords:['leg','step','input','fixture','trip'],answer:'The fixture supplies steps 0, 1, 4, and 6. Number the legs 1 through steps; an empty trip has no legs.'},{keywords:['energy','sum','total','accumulat'],answer:'Start the energy total at 0, add each leg number once, then print one numeric total. Four legs cost 10.'}]
  }
];
