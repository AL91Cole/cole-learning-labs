// Expanded investigation cases: fictional briefs, clues and questions. The
// equipment models and renderers stay in expanded-labs.js and download with the route.
const clue = (id,label,text) => ({id,label,text});
const question = (label,answer) => ({label,answer});

export const EXPANDED_SCENARIOS = [
  {
    id:'NET-204',title:'Wireless Survey & Classroom Coverage',track:'network',grade:'7–8',minutes:25,
    summary: 'Use signal readings to explain why a classroom loses Wi-Fi.',requester:'Library studio · Wireless support',
    goal:'Provide stable coverage at the fictional reading desk without overlapping the neighboring access points.',
    brief: '“The tablets work near the doorway but lose Wi-Fi at the reading desk. The access point is inside a metal cupboard. Its radio settings already match the channel survey. Please improve coverage at the desk.”',
    intake:{kind:'detailed',missing:'',factIds:[]},
    clues:[clue('survey','Read the channel survey','Nearby 5 GHz access points occupy channels 36 and 44. Channel 40 is clear when the channel width is 20 MHz.'),clue('map','Inspect the room map','The ceiling-center location reaches the desk at −58 dBm. The cupboard and far hallway weaken the signal below the −67 dBm target.'),clue('device','Read the client specification','The fictional classroom tablets support 5 GHz. Use the school-approved access point; no student device settings or credentials are needed.')],
    questions:[question('Where does the connection drop?','At the reading desk, behind the metal storage cupboard.'),question('Which devices need coverage?','The fictional classroom tablets support 5 GHz and remain inside this room.')],
    interviewFacts:[{keywords:['channel','interference','survey'],answer:'The fixed survey lists channels 36 and 44 as occupied. Channel 40 is clear at a 20 MHz width.'},{keywords:['signal','coverage','location','cupboard','desk'],answer:'At the reading desk, the ceiling-center placement measures −58 dBm. The target is at least −67 dBm; metal-cupboard and hallway placements fall below it.'}]
  },
  {
    id:'NET-205',title:'The Stalled Print Queue',track:'network',grade:'9–10',minutes:25,
    summary: 'Trace a missing print job through the service, queue and printer choice.',requester:'Design classroom · PRINT-LAB-02',
    goal:'Print the original fictional handout JOB-041 through the approved classroom printer while preserving the job.',
    brief: '“I sent my handout to print, but nothing came out. Please keep my original job.” Ask when printing last worked and what happened since.',
    secondLook:{prompt:'Ask a second pair of eyes to trace the print job with you.',checks:['Where did the job stop in your latest test?','Does your idea explain that result?']},
    intake:{kind:'follow-up',missing:'Ask when printing last worked and what happened afterward.',factIds:['job-history']},
    clues:[clue('job','Inspect JOB-041','JOB-041 is the original two-page classroom handout. The teacher asks you to preserve it rather than clear the entire queue.'),clue('service','Inspect the spooler','The Print Spooler service is stopped. The queue panel also shows Paused.'),clue('port','Read the printer panel','CLASSROOM-PRINT at the approved simulated port is online and has paper. OLD-PRINTER is offline.'),{...clue('history','Record the printing history','Printing last worked before virtual maintenance changed the printer selection. The teacher clicked Print once; JOB-041 remains listed and has not printed.'),requiresFact:'job-history'}],
    questions:[question('When did it last print?','Printing worked before virtual maintenance changed the printer selection. I clicked Print once afterward, and JOB-041 stayed in the list without printing.'),question('Should I delete all jobs?','No. Keep JOB-041 and deliver that original handout.'),question('Is the classroom printer out of paper?','No. The approved printer is online with paper. Check the service, queue, and selected port.')],
    interviewFacts:[{id:'job-history',keywords:['last print','printing last work','printing history','what happened','maintenance','already tried'],answer:'Printing last worked before virtual maintenance changed the printer selection. I clicked Print once after that, but my handout did not print. JOB-041 stayed listed in the queue.',legacyAnswers:['Printing last worked before virtual maintenance changed the printer selection. I clicked Print once afterward; JOB-041 stayed listed without printing.']},{keywords:['spooler','service'],answer:'The fictional Print Spooler starts stopped. Starting it is one step; the queue and printer port must also be checked.'},{keywords:['job','paper','print','queue'],answer:'Keep the original JOB-041, a two-page handout. CLASSROOM-PRINT is online with paper; the old port is offline. Clearing the queue would lose the requested job.'}]
  },
  {
    id:'NET-206',title:'Backup Restore & File Integrity',track:'network',grade:'11–12',minutes:30,
    summary: 'Compare backup contents and recover the complete file without overwriting evidence.',requester:'Media studio · Recovery desk',
    goal:'Recover the verified original project-notes.txt into a separate folder and verify its contents without overwriting the current file.',
    brief: '“The file opens, but my project notes are missing. Use the backup list and original manifest to recover a complete copy into a separate folder. Keep the damaged file.”',
    intake:{kind:'detailed',missing:'',factIds:[]},
    clues:[clue('catalog','Read the backup catalog','Snapshot B-17 contains the verified two-section project notes. B-16 is incomplete; B-18 is an empty export.'),clue('destination','Read the recovery policy','Restore to Recovery/Project, retaining the damaged current copy for investigation. Do not overwrite or delete it.'),clue('manifest','Inspect the integrity manifest','B-17 manifest: title “Network project”; sections “Plan” and “Test results”; integrity label LAB-VERIFIED-17. A successful copy alone does not verify its contents.')],
    questions:[question('Is the newest copy always the best?','No. The newest export is empty. Compare the catalog and integrity manifest.'),question('Can I overwrite the damaged file?','Keep it as evidence. Use a separate recovery folder for the restored original.')],
    interviewFacts:[{keywords:['backup','snapshot','version','newest'],answer:'B-16 is incomplete, B-17 is the verified original, and B-18 is an empty export. The timestamp alone does not prove a useful backup.'},{keywords:['verify','integrity','manifest','file'],answer:'The original manifest lists Network project, Plan, Test results, and label LAB-VERIFIED-17. Restore separately, then compare the restored content with that manifest.'}]
  },
  {
    id:'AI-304',title:'Minimum Data, Meaningful Permission',track:'ai',grade:'7–8',minutes:25,
    summary: 'Build a reading activity with only the data it needs.',requester:'Learning design team · AI privacy review',
    goal:'Use invented text, skip learner details, preview locally, and offer an opt-out.',
    brief: 'The helper uses private records but only needs an invented paragraph. Change its input. Keep names off, use the local preview, and offer the non-AI option.',
    clues:[clue('task','Read the actual learning task','The task is to summarize an invented paragraph. Names, emails, IDs, diagnoses, and private records are unnecessary.'),clue('permission','Read the participation note','Learners must have an equivalent non-AI activity and be able to decline. A checked consent box is not a substitute for school review or legal requirements.'),clue('route','Inspect processing choices','This practice lab supports a local scripted preview using fictional text. It does not authorize external processing of student work.')],
    questions:[question('Does the helper need learner identifiers?','No. An invented paragraph is enough for this learning task.'),question('What if a learner declines?','Offer the equivalent teacher-written practice activity without a penalty.')],
    interviewFacts:[{keywords:['data','name','email','id','information'],answer:'Use an invented paragraph without identifiers or private learner records. The learning task does not need a name, email, student ID, or diagnosis.'},{keywords:['consent','permission','decline','option'],answer:'Give an equivalent non-AI activity and a clear opt-out. School review and applicable permissions remain necessary; a consent checkbox alone cannot establish legal compliance.'}]
  },
  {
    id:'AI-305',title:'Prompt Injection in a Source Card',track:'ai',grade:'9–10',minutes:30,
    summary: 'Sort a useful fact from a task-changing instruction.',requester:'Research classroom · AI source-review desk',
    goal:'Keep the network fact, cite S-12, and reject the private-roster request.',
    brief: 'Sort the network fact from the roster request. Follow the teacher’s task: keep the fact, cite S-12, and reject the task change.',
    clues:[clue('task','Read the teacher task','Summarize the single network fact from source S-12 and cite S-12. The task never asks for a roster or private data.'),clue('source','Inspect source S-12','S-12 states that a switch forwards frames within a local network. Its final paragraph tries to redirect the assistant to reveal a private roster.'),clue('boundary','Read the source boundary','Quoted or retrieved content is untrusted data. Reject instructions that change the task or request private information, and let a human review the result.')],
    questions:[question('Does text in the source become a new instruction?','No. The source can provide evidence, but it cannot override the teacher task.'),question('Is there a real roster in this lab?','No. The roster request is a fictional prompt-injection example; no roster exists or is accessed.')],
    interviewFacts:[{keywords:['instruction','injection','roster','source'],answer:'The last paragraph of S-12 tries to override the task and request a private roster. It is untrusted source content, not an authorized instruction. No real roster exists here.'},{keywords:['summary','cite','fact','switch'],answer:'The supplied fact is that a switch forwards frames within a local network. Cite source S-12, omit the injected request, and require human review.'}]
  },
  {
    id:'AI-306',title:'Classifier Thresholds & Human Review',track:'ai',grade:'11–12',minutes:35,
    summary: 'Move the threshold and watch which tickets reach review.',requester:'Help desk analytics · Decision review',
    goal:'Catch both urgent tickets, keep human review, and compare both groups.',
    brief: 'Two tickets are urgent, but one scores lower. Move the review threshold and compare both groups. Keep a human in charge. What can four examples tell you?',
    clues:[clue('tickets','Read the four ticket cards','T1 urgent score .90, T2 routine .60, T3 urgent .55, T4 routine .20. These four examples cannot establish performance for real students.'),clue('policy','Read the escalation policy','Missing an urgent request is costly in this exercise. Scores at or above .50 should enter a human review queue, not be automatically closed.'),clue('groups','Read the group audit','T1/T2 are fictional Group A and T3/T4 are Group B. Review both groups and describe the small sample; do not infer personal ability or a real-world fairness guarantee.')],
    questions:[question('Can a high overall accuracy hide a problem?','Yes. Check which urgent cases were missed and compare the two supplied groups.'),question('May the model close uncertain tickets by itself?','No. Send uncertain decisions to a human reviewer in this task.')],
    interviewFacts:[{keywords:['threshold','score','urgent'],answer:'The four fixed scores are T1 urgent .90, T2 routine .60, T3 urgent .55, and T4 routine .20. A .80 threshold misses T3; a .50 review threshold catches both urgent cases while also escalating T2.'},{keywords:['bias','fair','group','accuracy','human'],answer:'Review the confusion matrix and both fictional groups. This is only four examples, so it cannot prove real-world fairness or accuracy. The model routes candidates to human review and must not automatically close uncertain work.'}]
  },
  {
    id:'SEC-404',title:'MFA Recovery Without Sharing Secrets',track:'security',grade:'7–8',minutes:25,
    summary: 'Recover an account without sharing secrets or dropping MFA.',requester:'Help desk · Account recovery training',
    goal:'Verify identity, revoke the lost factor, use a limited reset, and record it.',
    brief: 'A staff member lost their authenticator. The chat asks you to disable MFA and share a secret. Build a safer recovery path without passwords or real codes.',
    clues:[clue('identity','Read the recovery policy','Verify the fictional requester through the approved help-desk identity-check route. Urgency or a chat message alone is not proof.'),clue('factor','Inspect the lost device record','The lost authenticator is still active. Revoke that factor before supervised enrollment of a replacement.'),clue('reset','Read reset requirements','Use a single-use supervised reset with an audit record. Keep MFA required; never request a password or share a recovery secret in chat.')],
    questions:[question('Should I ask for their password?','No. This recovery exercise does not collect passwords, secret codes, or personal information.'),question('Can I turn MFA off permanently?','No. Use the approved limited recovery route and enroll a replacement while keeping MFA required.')],
    interviewFacts:[{keywords:['identity','verify','urgent','requester'],answer:'Use the approved help-desk identity-check route. An urgent chat is not sufficient evidence of identity. This simulation uses only a fictional requester.'},{keywords:['mfa','factor','reset','password','code'],answer:'Never collect a password or share a real recovery secret. Revoke the lost factor, keep MFA required, use a single-use supervised reset, and record the action.'}]
  },
  {
    id:'SEC-405',title:'Ransomware Response & Evidence',track:'security',grade:'9–10',minutes:30,
    summary: 'Contain an alert and build a safe recovery path.',requester:'Incident response team · LAB-ENDPOINT-07',
    goal:'Isolate the affected PC, keep evidence, alert the team, and recover in a clean space.',
    brief: 'One PC reports unexpected file encryption. Use the guide to contain it, keep evidence, and plan recovery. Decide what must happen first.',
    secondLook:{prompt:'Pause and compare your response plan with a second reader.',checks:['Which event supports the action you chose?','What still needs checking before normal work resumes?']},
    clues:[clue('alert','Read the incident alert','LAB-ENDPOINT-07 is the affected fictional workstation. Other classroom endpoints are not showing this alert.'),clue('evidence','Read the response runbook','Isolate the affected endpoint from the network, preserve the supplied incident evidence, and notify the designated response team. Do not wipe it or run unapproved cleanup.'),clue('backup','Inspect recovery media','Offline backup R-08 is verified. Restore it into a separate clean recovery environment only after containment; do not attach it to the affected endpoint.')],
    questions:[question('Should I wipe the affected endpoint immediately?','No. Preserve the incident evidence and follow the response runbook.'),question('May I connect the backup to the infected machine?','No. Keep the offline backup separate and stage recovery in a clean environment after containment.')],
    interviewFacts:[{keywords:['contain','network','isolate','endpoint'],answer:'Isolate only the affected LAB-ENDPOINT-07, preserve its supplied evidence, and notify the designated response team. The other fictional endpoints are not showing this alert.'},{keywords:['backup','restore','wipe','evidence'],answer:'Do not wipe evidence or connect recovery media to the affected endpoint. Verified offline backup R-08 belongs in a clean, separate recovery environment after containment.'}]
  },
  {
    id:'SEC-406',title:'Software Supply Chain Verification',track:'security',grade:'11–12',minutes:35,
    summary: 'Compare three packages before a small pilot.',requester:'IT deployment team · Package review',
    goal:'Choose the approved package, check its signature and digest, and pilot as a standard user.',
    brief: 'Three packages claim to be the same tool. Compare them with the trusted manifest, check the selected copy, and plan a small pilot. Nothing is downloaded or run.',
    clues:[clue('publisher','Read the trusted publisher manifest','The approved publisher lists CLASSROOM-TOOL-4.2 from the approved catalog with signature “Training Publisher valid” and integrity label LAB-DIGEST-42.'),clue('packages','Inspect package cards','Package A matches the publisher manifest. Package B is an unsigned mirror. Package C claims the right version but its digest differs.'),clue('pilot','Read deployment policy','Verify signature and digest, then stage a limited pilot as a standard user. A familiar name or HTTPS alone does not prove package authenticity.')],
    questions:[question('Does an HTTPS download prove the package is safe?','No. HTTPS protects transport, while publisher and integrity checks address the supplied package. No single check guarantees safety.'),question('Should all users receive it with administrator rights first?','No. Stage a limited standard-user pilot after verification.')],
    interviewFacts:[{keywords:['package','signature','digest','publisher'],answer:'Package A matches the trusted manifest: CLASSROOM-TOOL-4.2, Training Publisher valid, LAB-DIGEST-42. B is unsigned and C has a mismatched digest.'},{keywords:['https','pilot','admin','deploy'],answer:'HTTPS alone does not establish package authenticity. Verify signature and integrity, then use a limited standard-user pilot; the simulation never downloads or executes a package.'}]
  }
];
