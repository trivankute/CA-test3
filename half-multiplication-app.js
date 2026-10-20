'use strict';
const $=id=>document.getElementById(id),FP=Floating,H=HalfMultiplication;
const saveKey='bit-by-bit-half-multiplication-v1';
let state;
const calculate=()=>H.multiply(state.a,state.b);
function save(){try{localStorage.setItem(saveKey,JSON.stringify(state));}catch{$('saveState').textContent='Autosave unavailable; keep this tab open to retain your work.';}}
function clearFeedback(){
  $('result').hidden=true;$('solution').hidden=true;$('showSolution').textContent='Show all steps';$('showSolution').setAttribute('aria-expanded','false');
  for(const id of ['bitsAnswer','decimalAnswer']){$(id).classList.remove('correct','incorrect');$(id).removeAttribute('aria-invalid');$(id+'Message').textContent='';}
}
function render(){
  $('problemType').value=state.type;$('aValue').textContent=state.a;$('bValue').textContent=state.b;
  $('bitsAnswer').value=state.bits||'';$('decimalAnswer').value=state.decimal||'';clearFeedback();
}
function newProblem(example=false){
  const type=example?'example':$('problemType').value;
  const [a,b]=H.generate(type);state={a,b,type,bits:'',decimal:''};render();save();
}
$('new').onclick=()=>newProblem();$('example').onclick=()=>newProblem(true);$('problemType').onchange=()=>newProblem();
$('clear').onclick=()=>{state.bits='';state.decimal='';render();save();};
for(const [id,key] of [['bitsAnswer','bits'],['decimalAnswer','decimal']]){
  $(id).oninput=()=>{state[key]=$(id).value;clearFeedback();save();};
}
$('check').onclick=()=>{
  const result=calculate();
  const checks=[FP.checkBits($('bitsAnswer').value,result.fields.join('')),FP.checkValue($('decimalAnswer').value,result.decoded)];
  ['bitsAnswer','decimalAnswer'].forEach((id,i)=>{
    const answer=checks[i];$(id).classList.remove('correct','incorrect');$(id).classList.add(answer.ok?'correct':'incorrect');
    $(id).setAttribute('aria-invalid',String(!answer.ok));$(id+'Message').textContent=answer.ok?'✓ Correct':answer.message;
  });
  const correct=checks.filter(r=>r.ok).length;$('result').hidden=false;$('result').classList.toggle('error',correct!==2);
  $('result').textContent=correct===2?'✓ Both answers are correct!':`${correct}/2 answers correct. Use the product of the stored half-precision operands, then round the result.`;
};
function operandExplanation(operand,name){
  const d=operand.decoded,conversion=H.explainOperand(operand.decimal);
  const lines=[`${name}: fractional part ${conversion.fractionalDecimal} = ${conversion.fractionalBinary}₂.`,
    `${name}: original decimal ${operand.decimal} = ${conversion.rawBinary}₂ (before rounding).`];
  if(!conversion.zero){
    lines.push(`${name}: normalize → ${conversion.normalized}₂ × 2^(${conversion.exponent}).`);
    lines.push(`${name}: keep ${conversion.kept} at exponent ${conversion.roundExponent}; G = ${conversion.guard}, R = ${conversion.round}, S = ${conversion.sticky} → ${conversion.increment?'round the magnitude up':'keep the retained bits'}.`);
    if(conversion.exponent < -14)lines.push(`${name}: the stored exponent is below the normal range; apply the underflow-to-zero rule if rounding does not produce a normal value.`);
  }
  lines.push(`${name}: stored half = ${operand.fields.join(' | ')} → ${d.text}${operand.underflow?' (underflow → 0)':''}.`);
  if(d.kind==='normal')lines.push(`${name}: stored normalized value = ${d.sign?'-':''}${HalfAddition.binaryAt(d.coefficient,-10)}₂ × 2^(${d.power+10}).`);
  return lines;
}
$('showSolution').onclick=()=>{
  const opening=$('solution').hidden;$('solution').hidden=!opening;$('showSolution').textContent=opening?'Hide steps':'Show all steps';$('showSolution').setAttribute('aria-expanded',String(opening));
  if(!opening)return;
  const result=calculate();$('solutionBody').replaceChildren();
  const step=(heading,lines)=>{
    const item=document.createElement('section'),title=document.createElement('h3');title.textContent=heading;item.append(title);
    for(const line of lines){const p=document.createElement('p');p.textContent=line;item.append(p);}$('solutionBody').append(item);
  };
  step('1 · Convert each original decimal, then store it in half precision',[
    ...operandExplanation(result.a,'A'),...operandExplanation(result.b,'B'),
    'The original fractional binary digits, normalized significand, and rounded stored fraction are different stages. Multiply only after both operands have been rounded to half precision.'
  ]);
  if(result.special){
    step('2 · Special-value arithmetic',['The stored operands include an infinity. Zero times infinity produces NaN. Otherwise, the result is infinity with sign A XOR sign B.']);
  }else{
    const x=result.a.decoded,y=result.b.decoded;
    step('2 · Find the sign and add the exponents',[
      `Sign = ${x.sign} XOR ${y.sign} = ${result.sign}.`,
      `Unbiased exponent A = ${x.power+10}; exponent B = ${y.power+10}. Sum = ${result.exponentSum}.`,
      'For normal operands, the stored exponent calculation is E_A + E_B − 15. Normalize the significand product before checking the final exponent.'
    ]);
    step('3 · Multiply the significands',[
      `${result.significandA}₂ × ${result.significandB}₂ = ${result.rawProduct}₂.`,
      `Unnormalized product = ${result.sign?'-':'+'}${result.rawProduct}₂ × 2^(${result.exponentSum}).`,
      `Exact product of the stored values = ${result.exact}.`
    ]);
    if(result.exponent===null){
      step('4 · Normalize and round',['The exact product is zero. There are no nonzero discarded bits: G = 0, R = 0, S = 0.']);
    }else{
      const r=result.rounding,retained=BigInt(r.retained).toString(2).padStart(11,'0');
      const roundExponent=Math.max(-14,result.exponent);
      step('4 · Normalize',[
        `Normalized magnitude = ${result.normalized}₂ × 2^(${result.exponent}).`,
        result.normalizationShift===1?'The significand product is at least 2. Shift it right by one place and increase the exponent by 1.':'The significand product is already below 2; no initial right shift is needed.',
        result.exponent < -14 ? 'The exponent is below the normal minimum −14. Evaluate rounding at exponent −14, then apply the underflow-to-zero rule.' : `Unbiased exponent = ${result.exponent}; biased exponent before a possible rounding carry = ${result.exponent+15}.`
      ]);
      step('5 · Use one guard, one round, and one sticky bit',[
        `Retain ${retained[0]}.${retained.slice(1)} at exponent ${roundExponent}. G = ${r.guard}, R = ${r.round}, S = ${r.sticky}.`,
        'S is the OR of all bits after R. Increment exactly when G = 1 and at least one of R, S, or the retained last bit is 1.',
        HalfAddition.roundingReason(r,result.sign===1),
        `${r.increment?'Increment':'Keep'} the retained significand. Rounded significand integer: ${r.retained} → ${r.rounded}.`,
        BigInt(r.rounded)>=2048n?'The rounded significand carries into a new leading bit: shift it right once and increase the exponent by 1.':'No exponent carry is needed.'
      ]);
      if(result.underflow)step('6 · Apply the requested underflow rule',[
        `Before flushing: ${result.rawFields.join(' | ')}. This is subnormal or rounds to zero. Store 0 as 0000000000000000.`
      ]);
      else if(result.decoded.kind==='infinity')step('6 · Handle overflow',['The rounded exponent exceeds +15. Store an all-one exponent and an all-zero fraction; preserve the sign to produce +INF or −INF.']);
    }
  }
  step('Final answer',[
    `Sign | exponent | fraction = ${result.fields.join(' | ')}`,
    `16 bits = ${result.fields.join('')}`,
    `Decoded decimal = ${result.decoded.text}`
  ]);
};
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();$('check').click();}});
try{
  const stored=JSON.parse(localStorage.getItem(saveKey));
  if(stored&&['mixed','ordinary','tie','sticky','normalization','zero','overflow','underflow','example','conversion'].includes(stored.type)&&typeof stored.bits==='string'&&typeof stored.decimal==='string'){
    H.multiply(stored.a,stored.b);state=stored;
  }
}catch{/* Ignore an invalid or unavailable save. */}
if(state)render();else newProblem();
