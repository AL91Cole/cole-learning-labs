import {SCENARIOS} from './scenarios.js?release=20261020-requester26';

const esc=value=>String(value??'').replace(/[&<>"']/gu,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const NYS_CONCEPTS=Object.freeze(['Impacts of Computing','Computational Thinking','Networks and Systems Design','Cybersecurity','Digital Literacy']);
const CSTA_CONCEPTS=Object.freeze(['Algorithms & Design','Programming','Data & Analysis','Systems & Security','Computing & Society']);
const GRADES=Object.freeze(['7–8','9–10','11–12']);
export const STANDARDS_SOURCES=Object.freeze({
  checked:'2026-10-20',
  nys:'https://www.nysed.gov/standards-instruction/computer-science-and-digital-fluency',
  nysGuidance:'https://www.nysed.gov/standards-instruction/computer-science-and-digital-fluency-guidance-resources',
  csta:'https://csteachers.org/pk12standards/',
  cstaView:'https://csteachers.org/pk12standards/view/'
});

// Author interpretations of observable lab tasks, not an official crosswalk,
// individual-standard coverage claim, assessment, endorsement or certification.
const MAPPINGS=[
  {pathway:'hardware',name:'Hardware & ServiceDesk',
    nys:['Networks and Systems Design','Computational Thinking'],csta:['Systems & Security','Algorithms & Design'],
    practice:'Trace a signal or startup path, compare compatible components, and test a repair against the original request.',
    evidence:'Ask learners to connect a component or connection to its role, describe one controlled change, and show a successful acceptance test.',
    examples:['INC-101','INC-105','INC-106']},
  {pathway:'network',name:'Networking & operating systems',
    nys:['Networks and Systems Design','Cybersecurity','Computational Thinking'],csta:['Systems & Security','Algorithms & Design'],
    practice:'Investigate connectivity, permissions, services, wireless coverage, printing and recovery using fictional system evidence.',
    evidence:'Compare a before-and-after result, explain which network or system setting matters, and check that approved access or original files are preserved.',
    examples:['NET-201','NET-202','NET-206']},
  {pathway:'ai',name:'AI literacy & audit',
    nys:['Impacts of Computing','Computational Thinking','Cybersecurity','Digital Literacy'],
    csta:['Algorithms & Design','Programming','Data & Analysis','Systems & Security','Computing & Society'],
    practice:'Check AI claims against sources, compare classifier decisions, minimize fictional data, and review unsafe code or source instructions.',
    evidence:'Look for a cited correction, an explanation of unequal or uncertain decisions, and a justified privacy or code-review choice. Using optional chat alone is not this evidence.',
    examples:['AI-302','AI-303','AI-306']},
  {pathway:'security',name:'Ethical cybersecurity',
    nys:['Cybersecurity','Networks and Systems Design','Computational Thinking'],csta:['Systems & Security','Programming','Computing & Society'],
    practice:'Assess fictional phishing, account recovery, access controls, incident evidence and software integrity within authorized simulations.',
    evidence:'Ask for the threat and minimum necessary control, an allowed-and-denied retest, or a careful containment and evidence handoff.',
    examples:['SEC-401','SEC-403','SEC-405']},
  {pathway:'coding',name:'Coding sandbox',
    nys:['Computational Thinking'],csta:['Algorithms & Design','Programming'],
    practice:'Read, repair and run small programs involving expressions, decisions and bounded loops with changing fictional inputs.',
    evidence:'Compare expected and actual outputs, test a boundary or a changed input, and explain why the revised program works.',
    examples:['CODE-501','CODE-502','CODE-503']}
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
  <p>Explore how the five investigation pathways can support New York State Computer Science and Digital Fluency concepts and the <strong>2026 CSTA PK–12</strong> concepts. These are suggested teaching connections, not a claim that every lab addresses every listed concept.</p>
  <div class="library-options standards-filters" role="group" aria-label="Filter standards connections">
  <label for="standards-pathway">Pathway<select id="standards-pathway" data-standards-pathway>${options(STANDARDS_ALIGNMENTS.map(row=>[row.pathway,row.name]),'All pathways')}</select></label>
  <label for="standards-nys">NYS concept<select id="standards-nys" data-standards-nys>${options(NYS_CONCEPTS,'All NYS concepts')}</select></label>
  <label for="standards-csta">CSTA 2026 concept<select id="standards-csta" data-standards-csta>${options(CSTA_CONCEPTS,'All CSTA concepts')}</select></label>
  <label for="standards-grade">Lab starting grade<select id="standards-grade" data-standards-grade>${options(GRADES.map(grade=>[grade,'Grades '+grade]),'All lab grades')}</select></label>
  <button type="button" class="button button-outline button-small" data-standards-reset>Clear filters</button></div>
  <p class="result-count" data-standards-count role="status" aria-live="polite">5 pathways shown.</p>
  <p id="standards-band-help">Lab starting grades are teaching suggestions. NYSED uses grades 7–8 and 9–12 here; CSTA 2026 uses middle school (6–8) and high school (9–12). The lab’s 9–10 and 11–12 groups both sit within those high-school bands.</p>
  <div class="standards-table-scroll" role="region" tabindex="0" aria-labelledby="standards-heading" aria-describedby="standards-band-help">
  <table class="standards-table"><caption>Suggested concept connections across the 29 fictional investigations. Review the actual activity and student explanation before selecting an individual standard.</caption>
  <thead><tr><th scope="col">Pathway and examples</th><th scope="col">Practice and evidence to review</th><th scope="col">NYS concepts</th><th scope="col">CSTA 2026 concepts</th></tr></thead><tbody>
  ${STANDARDS_ALIGNMENTS.map(row=>`<tr data-standards-row="${esc(row.pathway)}"><th scope="row"><a href="#labs/${esc(row.pathway)}">${esc(row.name)}</a><p data-standards-grades>Starting grades ${esc(row.grades.join(', '))}</p><ul data-standards-examples>${exampleItems(row.examples)}</ul></th><td><p>${esc(row.practice)}</p><p><strong>Teacher look-for:</strong> ${esc(row.evidence)}</p></td><td>${list(row.nys)}</td><td>${list(row.csta)}</td></tr>`).join('')}
  </tbody></table></div>
  <p data-standards-empty hidden>No pathways match all these filters. Clear a concept or choose another pathway.</p>
  <div class="guide-callout"><p><strong>A planning aid, not certification.</strong> Mx. Cole’s concept-level interpretation is not an official NYSED or CSTA review, endorsement, complete curriculum crosswalk, or proof of student mastery. Districts choose the applicable standards, instruction and assessment. This table makes no privacy-law or accessibility-compliance determination.</p></div>
  <p>Official sources, checked October 20, 2026: <a href="${STANDARDS_SOURCES.nys}" target="_blank" rel="noopener noreferrer">NYSED standards and grade bands</a>, <a href="${STANDARDS_SOURCES.nysGuidance}" target="_blank" rel="noopener noreferrer">NYSED instructional guidance</a>, <a href="${STANDARDS_SOURCES.csta}" target="_blank" rel="noopener noreferrer">2026 CSTA PK–12 standards</a> and <a href="${STANDARDS_SOURCES.cstaView}" target="_blank" rel="noopener noreferrer">CSTA’s official standards browser</a>. No individual standard codes are asserted here.</p>
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
