// Beginner course catalog: the fields the home page and lab library show.
// The full models, checks, jobs and simulations stay in foundation-model.js and
// download with the beginner-course route.
export const FOUNDATION_CATALOG=Object.freeze([
  {id:'hardware',code:'HW-100',slug:'hardware',track:'hardware',title:'Meet the computer',grade:'7–12',minutes:15,nextLab:'INC-101',summary:'Meet the parts, learn their jobs and fit virtual memory safely.'},
  {id:'network',code:'NET-200',slug:'network',track:'network',title:'Follow a network connection',grade:'7–12',minutes:12,nextLab:'NET-201',summary:'Meet the network devices and follow a classroom connection.'},
  {id:'ai',code:'AI-300',slug:'ai',track:'ai',title:'Understand an AI response',grade:'7–12',minutes:12,nextLab:'AI-301',summary:'Learn how an AI reply is made and check a practice answer.'},
  {id:'security',code:'SEC-400',slug:'security',track:'security',title:'Practice safe security habits',grade:'7–12',minutes:12,nextLab:'SEC-401',summary:'Learn where testing is allowed and how to protect a practice account.'},
  {id:'coding',code:'CODE-500',slug:'coding',track:'coding',title:'Read, change, and test code',grade:'7–12',minutes:15,nextLab:'CODE-501',summary:'Read a short program, fix its calculation and check the results.'}
].map(Object.freeze));
