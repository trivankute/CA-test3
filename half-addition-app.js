'use strict';
const $=id=>document.getElementById(id),FP=Floating,H=HalfAddition;
const saveKey='bit-by-bit-half-addition-v1';
let state;
const calculate=()=>H.add(state.a,state.b,state.roundingMode);
const roundingRule=()=>state.roundingMode==='nearest-ties-zero'?'Classroom: nearest, ties toward zero (GRS 100 → keep)':'IEEE: nearest, ties to even';
const incrementRule=()=>state.roundingMode==='nearest-ties-zero'?'Increment only when G = 1 and R or S is 1. GRS = 100 always keeps the retained bits.':'Increment when G = 1 and at least one of R, S, or the retained last bit is 1.';
function save(){try{localStorage.setItem(saveKey,JSON.stringify(state));}catch{$('saveState').textContent='Autosave unavailable; keep this tab open to retain your work.';}}
function clearFeedback(){
  $('result').hidden=true;$('solution').hidden=true;$('showSolution').textContent='Show all steps';$('showSolution').setAttribute('aria-expanded','false');
  for(const id of ['bitsAnswer','decimalAnswer']){$(id).classList.remove('correct','incorrect');$(id).removeAttribute('aria-invalid');$(id+'Message').textContent='';}
}
function render(){
  $('roundingMode').value=state.roundingMode; $('roundingRule').textContent=roundingRule();
  $('problemType').value=state.type;$('aValue').textContent=state.a;$('bValue').textContent=state.b;
  $('bitsAnswer').value=state.bits||'';$('decimalAnswer').value=state.decimal||'';clearFeedback();
}
function newProblem(example=false){
  const type=example?'example':$('problemType').value;
  const [a,b]=H.generate(type);state={a,b,type,roundingMode:$('roundingMode').value,bits:'',decimal:''};render();save();
}
$('roundingMode').onchange=()=>{state.roundingMode=$('roundingMode').value;state.bits='';state.decimal='';render();save();};
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
  $('result').textContent=correct===2?'✓ Both answers are correct!':`${correct}/2 answers correct. Use the sum of the stored half-precision operands, then round the result.`;
};
function operandExplanation(operand,name){
  const d=operand.decoded;
  return `${name} = ${operand.decimal} → ${operand.fields.join(' | ')} → stored value ${d.text}${operand.underflow?' (underflow → 0)':''}.`;
}
$('showSolution').onclick=()=>{
  const opening=$('solution').hidden;$('solution').hidden=!opening;$('showSolution').textContent=opening?'Hide steps':'Show all steps';$('showSolution').setAttribute('aria-expanded',String(opening));
  if(!opening)return;
  const result=calculate();$('solutionBody').replaceChildren();
  const step=(heading,lines)=>{
    const item=document.createElement('section'),title=document.createElement('h3');title.textContent=heading;item.append(title);
    for(const line of lines){const p=document.createElement('p');p.textContent=line;item.append(p);}$('solutionBody').append(item);
  };
  step('1 · Store A and B in half precision',[operandExplanation(result.a,'A'),operandExplanation(result.b,'B'),'Each operand is rounded using the selected rule before the addition.']);
  if(result.special){
    step('2 · Special-value arithmetic',['The stored operands include an infinity. Opposite-signed infinities produce NaN; otherwise the infinity determines the result.']);
  }else{
    const x=result.a.decoded,y=result.b.decoded,common=result.commonExponent;
    step('2 · Align the exponents',[
      `Common unbiased exponent = ${common}. Shift A right by ${common-(x.power+10)} and B right by ${common-(y.power+10)} places.`,
      `A = ${x.sign?'-':'+'}${result.alignedA}₂ × 2^(${common})`,
      `B = ${y.sign?'-':'+'}${result.alignedB}₂ × 2^(${common})`,
      'The full binary working below makes every discarded bit visible; the rounding decision compresses the discarded tail into one guard, one round, and one sticky bit.'
    ]);
    step('3 · Add the aligned significands',[
      `Signed sum = ${result.sign?'-':'+'}${result.alignedSum}₂ × 2^(${common}).`,
      `Exact sum of the stored values = ${result.exact}.`
    ]);
    if(result.exponent===null){
      step('4 · Normalize and round',['The exact sum is zero. There are no nonzero discarded bits: G = 0, R = 0, S = 0.']);
    }else{
      const r=result.rounding,retained=BigInt(r.retained).toString(2).padStart(11,'0');
      const roundExponent=Math.max(-14,result.exponent);
      step('4 · Normalize',[
        `Normalized magnitude = ${result.normalized}₂ × 2^(${result.exponent}).`,
        result.exponent < -14 ? 'The exponent is below the normal minimum −14. Evaluate rounding at exponent −14, then apply the underflow-to-zero rule.' : `Unbiased exponent = ${result.exponent}; biased exponent before a possible rounding carry = ${result.exponent+15}.`
      ]);
      step('5 · Use one guard, one round, and one sticky bit',[
        `Retain ${retained[0]}.${retained.slice(1)} at exponent ${roundExponent}. G = ${r.guard}, R = ${r.round}, S = ${r.sticky}.`,
        'S is the OR of all bits after R. '+incrementRule(),
        H.roundingReason(r,result.sign===1,state.roundingMode),
        ...(r.guard===1&&r.round===0&&r.sticky===0?[
          `Halfway candidates: ${FP.dyadicText(BigInt(r.retained),roundExponent-10,result.sign)} and ${FP.dyadicText(BigInt(r.retained)+1n,roundExponent-10,result.sign)}. ${state.roundingMode==='nearest-ties-zero'?'Keep the first candidate (smaller magnitude) under the classroom rule.':'Select the candidate whose retained significand is even.'}`
        ]:[]),
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
  if(stored&&['mixed','ordinary','tie','sticky','cancellation','overflow','underflow','example','negative-tie'].includes(stored.type)&&typeof stored.bits==='string'&&typeof stored.decimal==='string'){
    if(!['nearest-even','nearest-ties-zero'].includes(stored.roundingMode)){stored.roundingMode='nearest-ties-zero';stored.bits='';stored.decimal='';}
    H.add(stored.a,stored.b,stored.roundingMode);state=stored;
  }
}catch{/* Ignore an invalid or unavailable save. */}
if(state)render();else newProblem();
