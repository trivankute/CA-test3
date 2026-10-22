'use strict';
const $=id=>document.getElementById(id),T=MockTest;
const key='bit-by-bit-mock-test-v1';
let state,questions;
const controls=new Map();
const groups=[['registers','01','Integer hardware','Initial and final registers only · unsigned 4-bit systems'],['limits','02','Floating-point limits','Four positive limits · exponent and fraction widths up to 4 bits'],['encode','03','Decimal to bits','Four long decimals · 1–5–12 representation · 18 stored bits'],['decode','04','Hexadecimal to decimal','Decode the floating-point word, including subnormal and special values'],['arithmetic','05','Calculate, normalize, round','One addition and one multiplication · 4 fraction bits · G/R/S']];
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{$('saveState').textContent='Autosave unavailable in this browser.';}}
function el(tag,className,text){const item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=text;return item;}
function answerId(q,field){return `${q.id}-${field.id}`;}
function updateProgress(){
  const total=questions.reduce((n,q)=>n+q.fields.length,0),done=Object.values(state.answers).filter(x=>String(x).trim()).length;
  $('progress').textContent=`${done} / ${total} fields filled`;
}
function clearMark(q){
  for(const f of q.fields){const c=controls.get(answerId(q,f));c.input.classList.remove('correct','incorrect');c.input.removeAttribute('aria-invalid');c.message.textContent='';}
  $(`${q.id}-status`).textContent='';$(`${q.id}-solution`).hidden=true;
  $(`${q.id}-reveal`).textContent='Show answer';$(`${q.id}-reveal`).setAttribute('aria-expanded','false');
  $('score').hidden=true;
}
function inputFor(q,f,compact=false){
  const wrap=el('div',compact?'field compact':'field'),id=answerId(q,f);
  const label=el('label','',compact?'Bits':f.label);label.htmlFor=id;
  const input=el(compact?'input':'textarea');input.id=id;input.value=state.answers[id]||'';input.spellcheck=false;
  if(compact){input.type='text';input.inputMode='numeric';input.setAttribute('aria-label',f.label);}
  else{input.rows=1;input.setAttribute('aria-label',f.label);}
  input.placeholder=compact?'n':f.type==='bits'?'Binary digits':f.type==='significand'?'1.xxxx':f.type==='integer'?'Decimal integer':'Decimal value';
  const message=el('div','feedback');message.id=id+'-feedback';input.setAttribute('aria-describedby',message.id+(f.hint?' '+id+'-hint':''));
  input.oninput=()=>{state.answers[id]=input.value;clearMark(q);updateProgress();save();};
  wrap.append(label,input,message);
  if(f.hint){const hint=el('p','hint',f.hint);hint.id=id+'-hint';wrap.append(hint);}
  controls.set(id,{input,message});return wrap;
}
function checkQuestion(q){
  let count=0;
  for(const f of q.fields){
    const c=controls.get(answerId(q,f)),result=T.check(c.input.value,f);
    c.input.classList.remove('correct','incorrect');c.input.classList.add(result.ok?'correct':'incorrect');c.input.setAttribute('aria-invalid',String(!result.ok));
    c.message.textContent=result.ok?'✓ Correct':result.message;if(result.ok)count++;
  }
  $(`${q.id}-status`).textContent=`${count} / ${q.fields.length} fields correct`;
  return count;
}
function render(){
  questions=T.generate(state.seed,state.mode);controls.clear();$('questions').replaceChildren();$('score').hidden=true;
  $('roundingMode').value=state.mode;$('testNumber').textContent=`Test ${state.seed}`;
  $('activeRule').textContent=state.mode==='nearest-even'?'Nearest-even: GRS 100 increments only when the retained last bit is 1.':'Classroom: increment only when G = 1 and (R = 1 or S = 1). GRS 100 keeps the retained bits.';
  for(const [group,number,title,description] of groups){
    const section=el('section','test-group');section.id=group;
    const header=el('div','group-heading'),numberLabel=el('span','group-number',number),titles=el('div');
    titles.append(el('h2','',title),el('p','',description));header.append(numberLabel,titles);section.append(header);
    for(const q of questions.filter(q=>q.group===group)){
      const card=el('article','question');card.setAttribute('aria-labelledby',q.id+'-title');
      const top=el('div','question-top'),heading=el('h3','',q.title);heading.id=q.id+'-title';top.append(el('span','q-number',`Q${q.number.toString().padStart(2,'0')}`),heading);card.append(top,el('p','prompt',q.prompt));
      if(q.note)card.append(el('p','note',q.note));
      if(q.kind==='register'){
        const scroller=el('div','table-scroll'),table=el('table'),caption=el('caption','sr-only',`Question ${q.number} initial and final register contents`),head=el('thead'),tr=el('tr');
        const first=el('th','','Iteration');first.scope='col';tr.append(first);
        q.columns.forEach((name,i)=>{const th=el('th','',name);th.scope='col';th.append(inputFor(q,q.fields.find(f=>f.id===`width-${i}`),true));tr.append(th);});head.append(tr);
        const body=el('tbody');for(const row of ['initial','final']){const line=el('tr'),label=el('th','',row==='initial'?'0 · Initial':`${q.lastIteration} · Final`);label.scope='row';line.append(label);
          q.columns.forEach((name,i)=>{const cell=el('td'),f=q.fields.find(f=>f.id===`${row}-${i}`),input=inputFor(q,f);input.querySelector('label').classList.add('sr-only');cell.append(input);line.append(cell);});body.append(line);}
        table.append(caption,head,body);scroller.append(table);card.append(scroller);
        const decimals=el('div','answer-grid');q.fields.filter(f=>!f.id.startsWith('width-')&&!f.id.startsWith('initial-')&&!f.id.startsWith('final-')).forEach(f=>decimals.append(inputFor(q,f)));card.append(decimals);
      }else{const grid=el('div','answer-grid');q.fields.forEach(f=>grid.append(inputFor(q,f)));card.append(grid);}
      const actions=el('div','question-actions'),check=el('button','',`Check Q${q.number}`),reveal=el('button','quiet','Show answer'),status=el('span','question-status');status.id=q.id+'-status';status.setAttribute('role','status');
      check.onclick=()=>{checkQuestion(q);$('score').hidden=true;};reveal.id=q.id+'-reveal';reveal.setAttribute('aria-expanded','false');reveal.setAttribute('aria-controls',q.id+'-solution');
      const solution=el('div','solution');solution.id=q.id+'-solution';solution.hidden=true;solution.append(el('h4','','Answer & working'));
      q.solution.forEach(line=>solution.append(el('p','',line)));
      reveal.onclick=()=>{solution.hidden=!solution.hidden;reveal.textContent=solution.hidden?'Show answer':'Hide answer';reveal.setAttribute('aria-expanded',String(!solution.hidden));};
      actions.append(check,reveal,status);card.append(actions,solution);section.append(card);
    }
    $('questions').append(section);
  }
  updateProgress();
}
function fresh(){state={version:T.VERSION,seed:crypto.getRandomValues(new Uint32Array(1))[0],mode:$('roundingMode').value,answers:{}};render();save();}
$('newTest').onclick=fresh;
$('clearAll').onclick=()=>{state.answers={};render();save();};
$('roundingMode').onchange=()=>{state.mode=$('roundingMode').value;state.answers={};render();save();};
$('checkAll').onclick=()=>{
  let fields=0,correct=0,complete=0;for(const q of questions){const count=checkQuestion(q);correct+=count;fields+=q.fields.length;if(count===q.fields.length)complete++;}
  $('score').hidden=false;$('score').textContent=`${complete} / 18 questions fully correct · ${correct} / ${fields} answer fields correct`;$('score').scrollIntoView({behavior:'smooth',block:'center'});
};
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();$('checkAll').click();}});
try{
  const stored=JSON.parse(localStorage.getItem(key));
  if(stored&&stored.version===T.VERSION&&Number.isInteger(stored.seed)&&['nearest-even','nearest-ties-zero'].includes(stored.mode)&&stored.answers&&typeof stored.answers==='object'&&!Array.isArray(stored.answers)&&Object.values(stored.answers).every(x=>typeof x==='string')){
    const valid=new Set(T.generate(stored.seed,stored.mode).flatMap(q=>q.fields.map(f=>answerId(q,f))));
    stored.answers=Object.fromEntries(Object.entries(stored.answers).filter(([id])=>valid.has(id)));state=stored;
  }
}catch{/* Ignore invalid or unavailable browser storage. */}
if(state)render();else fresh();
