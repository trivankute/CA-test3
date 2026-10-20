const assert=require('node:assert/strict'),FP=require('./floating.js'),H=require('./half-addition.js');
const sample=H.add('26.125','0.4150390625');
assert.deepEqual(sample.fields,['0','10011','1010100011']);
assert.equal(sample.exact,'26.5400390625');
assert.equal(sample.decoded.text,'26.546875');
assert.deepEqual([sample.rounding.guard,sample.rounding.round,sample.rounding.sticky],[1,0,1]);
assert.equal(sample.rounding.increment,true);
const negativeTie=H.add('-42.59375','-0.015625');
assert.equal(negativeTie.exact,'-42.609375');
assert.deepEqual([negativeTie.rounding.guard,negativeTie.rounding.round,negativeTie.rounding.sticky],[1,0,0]);
assert.equal(negativeTie.rounding.retained,'1363');
assert.equal(negativeTie.rounding.increment,true);
assert.deepEqual(negativeTie.fields,['1','10100','0101010100']);
assert.equal(negativeTie.decoded.text,'-42.625');
assert.match(H.roundingReason(negativeTie.rounding,true),/exactly halfway/);
assert.match(H.roundingReason(negativeTie.rounding,true),/1 \(odd\)/);
assert.match(H.roundingReason(negativeTie.rounding,true),/more negative/);
const negativeEvenTie=H.add('-42.5625','-0.015625');
assert.equal(negativeEvenTie.rounding.increment,false);
assert.equal(negativeEvenTie.decoded.text,'-42.5625');
assert.match(H.roundingReason(negativeEvenTie.rounding,true),/0 \(even\)/);
assert.match(H.roundingReason(H.add('1','0.0001').rounding),/below halfway/);
assert.match(H.roundingReason(sample.rounding),/above halfway/);
assert.match(H.roundingReason(H.add('1','1').rounding),/result is exact/);
for(const [a,b,value,increment] of [
  ['1','0.00048828125','1',false],
  ['1.0009765625','0.00048828125','1.001953125',true],
  ['1.9990234375','0.00048828125','2',true],
  ['-1','-0.00048828125','-1',false]
]){
  const result=H.add(a,b);assert.equal(result.decoded.text,value);
  assert.deepEqual([result.rounding.guard,result.rounding.round,result.rounding.sticky],[1,0,0]);
  assert.equal(result.rounding.increment,increment);
}
assert.equal(H.add('65504','32').decoded.text,'+INF');
assert.equal(H.add('-65504','-32').decoded.text,'-INF');
assert.equal(H.add('1','-1').decoded.text,'0');
assert.equal(H.add('1','0.0001').rounding.sticky,1);
assert.equal(H.add('1','0.0001').decoded.text,'1');
assert.equal(H.add('0.000061094760894775390625','-0.00006103515625').underflow,true);
assert.deepEqual(H.add('0.000061094760894775390625','-0.00006103515625').fields,['0','00000','0000000000']);
assert.equal(H.add('10000000000','-10000000000').decoded.kind,'NaN');
const buffer=new ArrayBuffer(2),native=new Float16Array(buffer),word=new Uint16Array(buffer);
function nativeStore(value){native[0]=value;return (word[0]&0x7c00)===0&&value!==0?0:word[0];}
function nativeValue(bits){word[0]=bits;return native[0];}
function reference(a,b){
  const av=nativeValue(nativeStore(Number(a))),bv=nativeValue(nativeStore(Number(b)));
  return nativeStore(av+bv);
}
let seed=45678,cases=0;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
function verify(a,b){
  const result=H.add(a,b),expected=reference(a,b),got=parseInt(result.fields.join(''),2);
  const nan=(expected&0x7c00)===0x7c00&&(expected&0x3ff)!==0;
  if(nan)assert.equal(result.decoded.kind,'NaN');else assert.equal(got,expected,`${a} + ${b}`);
  assert.equal(result.fields.join('').length,16);
  if(!result.special&&result.exponent!==null){
    const r=result.rounding;
    assert.equal(r.increment,!!(r.guard&&(r.round||r.sticky||BigInt(r.retained)%2n===1n)));
  }
  cases++;
}
for(const type of ['ordinary','tie','sticky','cancellation','overflow','underflow']){
  for(let i=0;i<1000;i++){
    const [a,b]=H.generate(type,random);verify(a,b);
    const result=H.add(a,b);
    if(type==='tie')assert.deepEqual([result.rounding.guard,result.rounding.round,result.rounding.sticky],[1,0,0]);
    if(type==='overflow')assert.equal(result.decoded.kind,'infinity');
    if(type==='underflow'){assert.equal(result.underflow,true);assert.equal(result.decoded.text,'0');}
  }
}
for(let i=0;i<20000;i++){
  const strings=[];
  for(let j=0;j<2;j++){
    const sign=Math.floor(random()*2),exp=Math.floor(random()*31),frac=Math.floor(random()*1024);
    strings.push(FP.decode([String(sign),FP.bits(exp,5),FP.bits(frac,10)],5,10).text);
  }
  verify(...strings);
}
console.log(`PASS: ${cases} additions against native Float16Array with the exercise flush-to-zero rule; sample, G/R/S, ties-even, exponent carry, operand storage, cancellation, overflow, and underflow.`);
