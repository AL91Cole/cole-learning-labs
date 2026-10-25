import {SCENARIOS} from './scenarios.js?release=20261025-learning-plans';

const esc=value=>String(value??'').replace(/[&<>"']/gu,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const NYS_CONCEPTS=Object.freeze(['Impacts of Computing','Computational Thinking','Networks and Systems Design','Cybersecurity','Digital Literacy']);
const CSTA_CONCEPTS=Object.freeze(['Algorithms & Design','Programming','Data & Analysis','Systems & Security','Computing & Society']);
export const STANDARDS_CONCEPTS=Object.freeze({nys:NYS_CONCEPTS,csta:CSTA_CONCEPTS});
const GRADES=Object.freeze(['7–8','9–10','11–12']);
export const STANDARDS_SOURCES=Object.freeze({
  checked:'2026-10-25',
  nys:'https://www.nysed.gov/standards-instruction/computer-science-and-digital-fluency',
  nysGuidance:'https://www.nysed.gov/standards-instruction/computer-science-and-digital-fluency-guidance-resources',
  cstaNewYork:'https://newyork.csteachers.org/about/learning-standards',
  nysBands:'https://www.nysed.gov/standards-instruction/computer-science-digital-literacy-faq',
  csta:'https://csteachers.org/pk12standards/',
  cstaView:'https://csteachers.org/pk12standards/view/'
});

// Author interpretations of observable lab tasks, not an official crosswalk,
// individual-standard coverage claim, assessment, endorsement or certification.
const MAPPINGS=[
  {pathway:'hardware',name:'Hardware & ServiceDesk',
    nys:['Networks and Systems Design','Computational Thinking'],csta:['Systems & Security'],
    practice:'Trace a signal path, connect compatible parts, and test one repair at a time.',
    evidence:'Explain each part’s role, show the change, and retest the original task.',
    examples:['INC-101','INC-105','INC-106']},
  {pathway:'network',name:'Networking & operating systems',
    nys:['Networks and Systems Design','Cybersecurity','Computational Thinking'],csta:['Systems & Security','Data & Analysis'],
    practice:'Build and trace network paths, separate guest access, and compare packet or service evidence.',
    evidence:'Show a changed path or access rule. Use packet headers or measured rates to explain the test result.',
    examples:['NET-208','NET-210','NET-215']},
  {pathway:'ai',name:'AI literacy & audit',
    nys:['Impacts of Computing','Computational Thinking','Cybersecurity','Digital Literacy'],
    csta:['Algorithms & Design','Programming','Data & Analysis','Systems & Security','Computing & Society'],
    practice:'Check claims and code, compare classifier outcomes, and protect fictional learner data.',
    evidence:'Cite a correction, compare group results, or explain a privacy or code choice. Chat use alone is not evidence.',
    examples:['AI-302','AI-303','AI-306']},
  {pathway:'security',name:'Ethical cybersecurity',
    nys:['Cybersecurity','Networks and Systems Design','Computational Thinking'],csta:['Systems & Security','Programming','Computing & Society'],
    practice:'Inspect fictional threats, compare access rules, and try safe containment and recovery choices.',
    evidence:'Name the threat, explain the smallest useful control, and show both an allowed and a denied test.',
    examples:['SEC-401','SEC-403','SEC-405']},
  {pathway:'coding',name:'Coding sandbox',
    nys:['Computational Thinking'],csta:['Algorithms & Design','Programming'],
    practice:'Build and debug expressions, decisions, and loops. Change inputs and compare visual results.',
    evidence:'Predict a result, run it, test a boundary or new input, and explain one revision. Use an open coding sandbox for your own project.',
    examples:['CODE-501','CODE-505','CODE-506']}
];
export const STANDARDS_ALIGNMENTS=Object.freeze(MAPPINGS.map(mapping=>Object.freeze({...mapping,
  nys:Object.freeze(mapping.nys),csta:Object.freeze(mapping.csta),examples:Object.freeze(mapping.examples),
  grades:Object.freeze(GRADES.filter(grade=>SCENARIOS.some(scenario=>scenario.track===mapping.pathway&&scenario.grade===grade)))
})));

/** Filters inspect only authored curriculum metadata. No records or learner work. */
export function filterStandardsAlignments({pathway='all',nys='all',csta='all',grade='all'}={}) {
  return STANDARDS_ALIGNMENTS.filter(row=>(pathway==='all'||row.pathway===pathway)&&
    (nys==='all'||row.nys.includes(nys))&&(csta==='all'||row.csta.includes(csta))&&
    (grade==='all'||row.grades.includes(grade)));
}
const options=(values,label)=>`<option value="all">${esc(label)}</option>`+values.map(value=>{
  const [id,text]=Array.isArray(value)?value:[value,value];return `<option value="${esc(id)}">${esc(text)}</option>`;
}).join('');
const list=values=>`<ul>${values.map(value=>`<li>${esc(value)}</li>`).join('')}</ul>`;
const exampleItems=ids=>ids.map(id=>`<li>${esc(id)} · ${esc(SCENARIOS.find(scenario=>scenario.id===id)?.title||id)}</li>`).join('');

export function standardsAlignmentHTML() {
  return `<section id="standards-alignment" class="wrap section standards-alignment" aria-labelledby="standards-heading">
  <p class="eyebrow">TEACHER PLANNING CONNECTIONS</p><h2 id="standards-heading">Find a standards connection.</h2>
  <p>Connect hands-on work with <strong>NYSED Computer Science and Digital Fluency</strong> and the national <strong>2026 CSTA PK–12</strong> concepts. Each row connects selected tasks across a pathway. Choose the concepts supported by your activity.</p>
  <p><a href="${STANDARDS_SOURCES.cstaNewYork}" target="_blank" rel="noopener noreferrer">CSTA New York’s learning-standards guide</a> points educators to the NYSED state framework. The two framework columns below keep New York and national CSTA concepts distinct.</p>
  <div class="library-options standards-filters" role="group" aria-label="Filter standards connections">
  <label for="standards-pathway">Pathway<select id="standards-pathway" data-standards-pathway>${options(STANDARDS_ALIGNMENTS.map(row=>[row.pathway,row.name]),'All pathways')}</select></label>
  <label for="standards-nys">NYSED concept<select id="standards-nys" data-standards-nys>${options(NYS_CONCEPTS,'All NYSED concepts')}</select></label>
  <label for="standards-csta">CSTA 2026 concept<select id="standards-csta" data-standards-csta>${options(CSTA_CONCEPTS,'All CSTA concepts')}</select></label>
  <label for="standards-grade">Lab starting grade<select id="standards-grade" data-standards-grade>${options(GRADES.map(grade=>[grade,'Grades '+grade]),'All lab grades')}</select></label>
  <button type="button" class="button button-outline button-small" data-standards-reset>Clear filters</button></div>
  <p class="result-count" data-standards-count role="status" aria-live="polite">5 pathways shown.</p>
  <p id="standards-band-help">Starting grades suggest a lesson entry point, not mastery. NYSED uses 7–8 and 9–12; CSTA’s foundational bands are middle school (6–8) and high school (9–12). Both 9–10 and 11–12 lab groups sit within the high-school bands. These connections do not claim CSTA high-school specialty coverage.</p>
  <p id="standards-scroll-help">On smaller screens, scroll sideways to see all four columns. Keyboard: focus the table, then use the Left and Right arrow keys.</p>
  <div class="standards-table-scroll" role="region" tabindex="0" aria-labelledby="standards-heading" aria-describedby="standards-band-help standards-scroll-help">
  <table class="standards-table"><caption>Suggested concept connections across the ${SCENARIOS.length} fictional investigations. Review the actual activity and student explanation before selecting an individual standard.</caption>
  <thead><tr><th scope="col">Pathway and examples</th><th scope="col">Practice and evidence to review</th><th scope="col">NYSED concepts</th><th scope="col">CSTA 2026 concepts</th></tr></thead><tbody>
  ${STANDARDS_ALIGNMENTS.map(row=>`<tr data-standards-row="${esc(row.pathway)}"><th scope="row"><a href="#labs/${esc(row.pathway)}">${esc(row.name)}</a>${row.pathway==='coding'?'<p><a href="#sandbox/blank">Build an original project →</a></p>':''}<p data-standards-grades>Starting grades ${esc(row.grades.join(', '))}</p><ul data-standards-examples>${exampleItems(row.examples)}</ul></th><td><p>${esc(row.practice)}</p><p><strong>Teacher look-for:</strong> ${esc(row.evidence)}</p></td><td>${list(row.nys)}</td><td>${list(row.csta)}</td></tr>`).join('')}
  </tbody></table></div>
  <p data-standards-empty hidden>No pathways match all these filters. Clear a concept or choose another pathway.</p>
  <div class="guide-callout"><p><strong>Choose the expectation; review the work.</strong> This task-based interpretation is not an official NYSED or CSTA review, endorsement, complete curriculum crosswalk, or proof of student mastery. Choose the individual grade-band expectation and assess the learner’s explanation and tests.</p></div>
  <details><summary>Official sources · checked October 25, 2026</summary><p><a href="${STANDARDS_SOURCES.nys}" target="_blank" rel="noopener noreferrer">NYSED state standards</a> · <a href="${STANDARDS_SOURCES.nysBands}" target="_blank" rel="noopener noreferrer">NYSED grade bands</a> · <a href="${STANDARDS_SOURCES.nysGuidance}" target="_blank" rel="noopener noreferrer">NYSED instructional guidance</a> · <a href="${STANDARDS_SOURCES.cstaNewYork}" target="_blank" rel="noopener noreferrer">CSTA New York’s guide</a> · <a href="${STANDARDS_SOURCES.csta}" target="_blank" rel="noopener noreferrer">2026 CSTA PK–12 standards</a> · <a href="${STANDARDS_SOURCES.cstaView}" target="_blank" rel="noopener noreferrer">CSTA’s official standards browser</a>. No individual standard codes are asserted here.</p></details>
  </section>`;
}

/** Local native selects keep keyboard behavior and work without remote services. */
export function mountStandardsAlignment(root) {
  if(!root?.querySelector||!root?.querySelectorAll)return ()=>{};
  const controls=Object.fromEntries(['pathway','nys','csta','grade'].map(key=>[key,root.querySelector('[data-standards-'+key+']')]));
  const count=root.querySelector('[data-standards-count]'),empty=root.querySelector('[data-standards-empty]'),reset=root.querySelector('[data-standards-reset]');
  const rows=[...root.querySelectorAll('[data-standards-row]')];
  if(Object.values(controls).some(control=>!control)||!count||!empty||!reset)return ()=>{};
  const update=()=>{
    const matches=filterStandardsAlignments(Object.fromEntries(Object.entries(controls).map(([key,control])=>[key,control.value])));
    const visible=new Set(matches.map(row=>row.pathway));
    for(const row of rows){
      row.hidden=!visible.has(row.dataset.standardsRow);
      const mapping=STANDARDS_ALIGNMENTS.find(item=>item.pathway===row.dataset.standardsRow);
      const examples=row.querySelector?.('[data-standards-examples]'),grades=row.querySelector?.('[data-standards-grades]');
      if(mapping){
        const selected=controls.grade.value,ids=selected==='all'?mapping.examples:SCENARIOS.filter(scenario=>scenario.track===mapping.pathway&&scenario.grade===selected).slice(0,3).map(scenario=>scenario.id);
        if(examples)examples.innerHTML=exampleItems(ids);
        if(grades)grades.textContent=selected==='all'?'Starting grades '+mapping.grades.join(', '):'Starting grades '+selected;
      }
    }
    count.textContent=`${matches.length} ${matches.length===1?'pathway':'pathways'} shown.${controls.grade.value==='all'?'':' Examples for grades '+controls.grade.value+'.'}`;
    empty.hidden=matches.length!==0;
  };
  const clear=()=>{for(const control of Object.values(controls))control.value='all';update();};
  for(const control of Object.values(controls))control.addEventListener('change',update);
  reset.addEventListener('click',clear);update();
  return ()=>{for(const control of Object.values(controls))control.removeEventListener('change',update);reset.removeEventListener('click',clear);};
}
