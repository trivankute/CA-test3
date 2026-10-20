'use strict';
const $ = id => document.getElementById(id), FP = Floating;
const saveKey = 'bit-by-bit-floating-v1';
let state;
const randomInt = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const fieldIds = { encode:['signAnswer','expAnswer','fracAnswer'], limits:['normalMaxAnswer','normalMinAnswer','subnormalMaxAnswer','subnormalMinAnswer'], decode:['valueAnswer'] };
for(let n=3;n<=8;n++) $('expSize').add(new Option(`${n} bits`,n));
for(let n=3;n<=10;n++) $('fracSize').add(new Option(`${n} bits`,n));
function save() {
  try { localStorage.setItem(saveKey,JSON.stringify(state)); }
  catch { $('saveState').textContent = 'Autosave unavailable; keep this tab open to retain your work.'; }
}
function pretty(value, significantDigits = 10) {
  if (!Number.isFinite(value.value)) return value.text;
  if (Object.is(value.value,-0)) return '-0';
  return FP.plainDecimal(Number(value.value.toPrecision(significantDigits)).toString());
}
function updateLinkedPattern() {
  const fields=FP.encode(state.decimal,state.e,state.f);
  const complete=fieldIds.encode.every((id,i)=>FP.checkBits(state.answers[id]||'',fields[i]).ok);
  ['givenSign','givenExp','givenFrac'].forEach((id,i)=>$(id).textContent=complete?fields[i]:'?'.repeat(fields[i].length));
  $('linkedNote').textContent=complete?'This is your correctly encoded result from Part 1. Decode the represented value after rounding.':'Decode the representation you find in Part 1. Its bit pattern will appear here when all three bit fields in Part 1 are correct.';
}
function resetFeedback() {
  $('result').hidden=true; $('solution').hidden=true; $('showSolution').textContent='Show solution'; $('showSolution').setAttribute('aria-expanded','false');
  document.querySelectorAll('.answer-field').forEach(el => { el.classList.remove('correct','incorrect'); el.removeAttribute('aria-invalid'); });
  document.querySelectorAll('.field-message').forEach(el => el.textContent='');
}
function render() {
  const fmt=FP.format(state.e,state.f);
  state.decimal=FP.plainDecimal(state.decimal);
  $('expSize').value=state.expChoice; $('fracSize').value=state.fracChoice;
  $('formatBadge').textContent=`${fmt.total}-bit format`;
  $('formatSign').textContent='1 bit'; $('formatExp').textContent=`${state.e} bits`; $('formatFrac').textContent=`${state.f} bits`;
  $('bias').textContent=`Bias = ${fmt.bias} · Round to nearest, ties to even`;
  $('decimalValue').textContent=state.decimal;
  updateLinkedPattern();
  $('signWidth').textContent='1 bit'; $('expWidth').textContent=`${state.e} bits`; $('fracWidth').textContent=`${state.f} bits`;
  for(const ids of Object.values(fieldIds)) for(const id of ids) $(id).value=state.answers[id]||'';
  resetFeedback();
}
function newProblem(example=false) {
  const expChoice=example?'4':$('expSize').value, fracChoice=example?'5':$('fracSize').value;
  const e=expChoice==='random'?randomInt(3,8):Number(expChoice), f=fracChoice==='random'?randomInt(3,10):Number(fracChoice);
  state={ e,f,expChoice,fracChoice,exerciseVersion:2,decimal:example?'-13.375':FP.randomDecimal(),answers:{} };
  render(); save();
}
function expected() {
  const {e,f}=state;
  const limits=FP.limits(e,f);
  const encoded=FP.encode(state.decimal,e,f);
  return { encode:encoded, limits:[limits.max,limits.minNormal,limits.maxSubnormal,limits.minPositive], decode:[FP.decode(encoded,e,f)] };
}
for(const ids of Object.values(fieldIds)) for(const id of ids) {
  $(id).setAttribute('aria-describedby',id+'Message');
  $(id).oninput=()=>{ state.answers[id]=$(id).value; resetFeedback(); updateLinkedPattern(); save(); };
}
$('expSize').onchange=()=>newProblem(); $('fracSize').onchange=()=>newProblem();
$('new').onclick=()=>newProblem();
$('example').onclick=()=>newProblem(true);
$('clear').onclick=()=>{ state.answers={}; render(); save(); };
$('check').onclick=()=>{
  const values=expected(), ids=Object.values(fieldIds).flat(); let count=0;
  for(const [part, fields] of Object.entries(fieldIds)) fields.forEach((id,i)=>{
    const result=part==='encode'?FP.checkBits($(id).value,values[part][i]):FP.checkValue($(id).value,values[part][i],{significantDigits:part==='limits'?4:6});
    $(id).classList.remove('correct','incorrect'); $(id).classList.add(result.ok?'correct':'incorrect');
    $(id).setAttribute('aria-invalid',String(!result.ok));
    $(id+'Message').textContent=result.ok?'✓ Correct':result.message;
    if(result.ok) count++;
  });
  $('result').hidden=false; $('result').classList.toggle('error',count!==ids.length);
  $('result').textContent=count===ids.length?`✓ Everything is correct! ${count}/${ids.length} fields.`:`${count}/${ids.length} fields correct. Review the highlighted answers.`;
};
$('showSolution').onclick=()=>{
  const opening=$('solution').hidden; $('solution').hidden=!opening; $('showSolution').textContent=opening?'Hide solution':'Show solution';
  $('showSolution').setAttribute('aria-expanded',String(opening));
  if(!opening) return;
  const values=expected(); $('solutionBody').replaceChildren();
  const add=(title,text)=>{
    const item=document.createElement('p'), label=document.createElement('strong'); label.textContent=title+': ';
    item.append(label,document.createTextNode(text)); $('solutionBody').append(item);
  };
  {
    add('1. Sign | Exponent | Fraction',values.encode.join(' | '));
    const decoded=FP.decode(values.encode,state.e,state.f);
    add('Represented value',`${pretty(decoded)} (${decoded.kind})`);
    if(Number.isFinite(decoded.value)) add('Exact decimal',decoded.text);
  }
  {
    ['Largest positive normal','Smallest positive normal','Largest positive denormalized','Smallest positive denormalized'].forEach((title,i)=>{
      add(`2. ${title}`,`${pretty(values.limits[i],5)} (exact: ${values.limits[i].text})`);
    });
  }
  {
    const value=values.decode[0]; add('3. Bit pattern from Part 1',values.encode.join(' | ')); add('Decoded value',pretty(value)); add('Classification',value.kind);
    if(Number.isFinite(value.value)) {
      add('Exact decimal',value.text);
      add('Calculation',`${value.sign?'-':''}${value.coefficient} × 2^(${value.power})`);
    } else add('Rule',value.kind==='NaN'?'All exponent bits are 1, and the fraction is nonzero.':'All exponent bits are 1, and the fraction is zero. The sign determines +INF or -INF.');
  }
};
document.addEventListener('keydown',event=>{ if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();$('check').click();} });
try {
  const stored=JSON.parse(localStorage.getItem(saveKey));
  if(stored &&
    ['random',...Array.from({length:6},(_,i)=>String(i+3))].includes(stored.expChoice) &&
    ['random',...Array.from({length:8},(_,i)=>String(i+3))].includes(stored.fracChoice) &&
    stored.answers && Object.values(stored.answers).every(v=>typeof v==='string')) {
    FP.format(stored.e,stored.f); FP.encode(stored.decimal,stored.e,stored.f);
    stored.decimal=FP.plainDecimal(stored.decimal);
    if(!/^-?\d{1,4}(?:\.\d{1,4})?$/.test(stored.decimal)) {
      stored.decimal=FP.randomDecimal(); stored.answers={};
    }
    if(stored.exerciseVersion!==2) {
      stored.answers=Object.fromEntries(fieldIds.encode.filter(id=>typeof stored.answers[id]==='string').map(id=>[id,stored.answers[id]]));
    }
    stored.exerciseVersion=2; delete stored.pattern; delete stored.decodeType; state=stored;
  }
} catch { /* Ignore an outdated or unavailable save. */ }
if(state) render(); else newProblem();
