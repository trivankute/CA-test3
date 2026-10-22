const assert=require('node:assert/strict'),T=require('./mock-test.js'),FP=require('./floating.js');
// Independent enumeration of positive finite 1-5-12 values, including subnormals.
const values=Array.from({length:31*4096},(_,word)=>{
  const e=word>>12,f=word&4095;return e?(1+f/4096)*2**(e-15):f*2**-26;
});
function referenceEncode(decimal,mode){
  const n=Number(decimal),sign=n<0||Object.is(n,-0)?131072:0,m=Math.abs(n);
  if(m>65532||(m===65532&&mode==='nearest-even'))return sign|126976;
  let lo=0,hi=values.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(values[mid]<=m)lo=mid;else hi=mid-1;}
  if(lo<values.length-1){const down=m-values[lo],up=values[lo+1]-m;if(down>up||(down===up&&mode==='nearest-even'&&lo%2))lo++;}
  return sign|lo;
}
let count=0;
for(const mode of ['nearest-even','nearest-ties-zero'])for(let seed=0;seed<100;seed++){
  const questions=T.generate(seed,mode);
  assert.equal(questions.length,18);assert.deepEqual(T.generate(seed,mode),questions);
  assert.deepEqual(questions.map(q=>q.group),[...Array(4).fill('registers'),...Array(4).fill('limits'),...Array(4).fill('encode'),...Array(4).fill('decode'),...Array(2).fill('arithmetic')]);
  for(const q of questions)for(const f of q.fields){
    assert.ok(T.check(T.answerText(f),f).ok,`${seed} ${q.id} ${f.id}`);
    assert.equal(T.check('',f).ok,false);assert.equal(T.check('invalid',f).ok,false);count++;
  }
  for(const q of questions.slice(0,4)){
    const get=id=>q.fields.find(f=>f.id===id).expected,a=Number(get('a')),b=Number(get('b'));
    if(q.number===1){assert.equal(parseInt(get('final-2'),2),a*b);assert.equal(get('final-0'),'0000');}
    if(q.number===2){assert.equal(parseInt(get('final-1'),2),a*b);assert.equal(get('initial-0'),get('final-0'));}
    if(q.number===3){assert.equal(parseInt(get('final-0'),2),Math.floor(a/b));assert.equal(parseInt(get('final-2'),2),a%b);assert.equal(parseInt(get('final-1'),2),Math.floor(b/2));assert.equal(q.lastIteration,5);}
    if(q.number===4){assert.equal(parseInt(get('final-1'),2),(a%b)*16+Math.floor(a/b));assert.equal(q.lastIteration,4);}
  }
  for(const q of questions.slice(4,8)){
    const [,e,f]=q.prompt.match(/1 sign bit, (\d) exponent bits, (\d) fraction bits/).map(Number),bias=2**(e-1)-1;
    const expected=q.number===5?(2-2**-f)*2**bias:q.number===6?2**(1-bias):q.number===7?(1-2**-f)*2**(1-bias):2**(1-bias-f);
    assert.equal(q.fields[0].expected.value,expected);
  }
  for(const q of questions.slice(8,12)){
    const decimal=q.prompt.match(/^Encode (\S+) in/)[1],bits=q.fields[0].expected;
    assert.equal(bits.length,18);assert.equal(parseInt(bits,2),referenceEncode(decimal,mode));
    assert.equal(T.check(bits.slice(1),q.fields[0]).ok,false);
  }
  for(const q of questions.slice(12,16)){
    const word=parseInt(q.prompt.match(/0x[0-9A-F]+/)[0],16),sign=word>>17,e=(word>>12)&31,f=word&4095,d=q.fields[0].expected;
    assert.ok(word<2**18);
    const expected=e===31?(f?NaN:sign?-Infinity:Infinity):(sign?-1:1)*(e?(1+f/4096)*2**(e-15):f*2**-26);
    if(Number.isNaN(expected))assert.equal(d.kind,'NaN');else assert.equal(d.value,expected);
  }
  for(const q of questions.slice(16)){
    assert.equal(q.fields[0].expected.split('.')[1].length,6);
    assert.equal(q.fields[2].expected.split('.')[1].length,4);
    assert.equal(q.fields[1].expected.length,5);assert.equal(q.fields[3].expected.length,5);
    const f=q.fields[0];assert.ok(T.check(f.expected.slice(0,-2)+'|'+f.expected.slice(-2),f).ok);
    assert.equal(T.check(f.expected+'0',f).ok,false);
  }
}
// Rounding boundaries and exact round trips in the newly supported 12-bit fraction.
for(const mode of ['nearest-even','nearest-ties-zero'])for(const decimal of ['1.0001220703125','1.0003662109375','65532','65532.001','0.000000007450580596923828125','-0']){
  assert.equal(parseInt(FP.encode(decimal,5,12,mode).join(''),2),referenceEncode(decimal,mode));
}
for(let word=0;word<126976;word+=47){const bits=word.toString(2).padStart(18,'0'),fields=[bits[0],bits.slice(1,6),bits.slice(6)];assert.deepEqual(FP.encode(FP.decode(fields,5,12).text,5,12),fields);}
console.log(`PASS: 200 complete tests, ${count} answer fields; independent register arithmetic, limits, 18-bit encode/decode references, 12-bit rounding boundaries, G/R field widths and input validation.`);
