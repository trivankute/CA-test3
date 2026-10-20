const assert = require('node:assert/strict');
const FP = require('./floating.js');
assert.equal(FP.plainDecimal('1.23e-5'),'0.0000123');
assert.equal(FP.plainDecimal('-1.234e8'),'-123400000');
assert.equal(FP.plainDecimal('0e-30'),'0');
assert.equal(FP.plainDecimal('-0e-30'),'-0');
assert.equal(FP.plainDecimal('1.2300e2'),'123');
assert.equal(FP.plainDecimal('1e-40'),'0.'+'0'.repeat(39)+'1');
assert.equal(FP.plainDecimal('1e38'),'1'+'0'.repeat(38));
const decoded = (s,e,f,E,F) => FP.decode([s,FP.bits(e,E),FP.bits(f,F)],E,F);
assert.deepEqual(FP.encode('1.0625',3,3),['0','011','000']); // even rounds down
assert.deepEqual(FP.encode('1.1875',3,3),['0','011','010']); // even rounds up
assert.deepEqual(FP.encode('-13.375',4,5),['1','1010','10110']);
assert.deepEqual(FP.encode('0.015625',3,3),['0','000','000']); // half minimum subnormal
assert.deepEqual(FP.encode('0.046875',3,3),['0','000','010']);
assert.deepEqual(FP.encode('0.234375',3,3),['0','001','000']); // subnormal → normal
assert.deepEqual(FP.encode('15.499999',3,3),['0','110','111']);
assert.deepEqual(FP.encode('15.5',3,3),['0','111','000']); // overflow midpoint
assert.deepEqual(FP.encode('-1e-100',3,3),['1','000','000']);
assert.deepEqual(FP.encode('-0',8,10),['1','00000000','0000000000']);
assert.equal(decoded('0',7,0,3,3).text,'+INF');
assert.equal(decoded('1',7,0,3,3).text,'-INF');
assert.equal(decoded('0',7,1,3,3).kind,'NaN');
assert.equal(decoded('1',7,7,3,3).kind,'NaN');
assert.equal(decoded('0',0,1,3,3).text,'0.03125');
assert.equal(decoded('0',1,0,3,3).text,'0.25');
assert.equal(decoded('0',6,7,3,3).text,'15');
assert.equal(decoded('1',0,0,3,3).text,'-0');
let patterns=0,seed=7789;
const rand=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
for(let i=0;i<10000;i++) {
  const input=FP.randomDecimal(()=>rand(1000000)/1000000);
  assert.match(input,/^-?\d{1,4}(?:\.\d{1,4})?$/);
  assert.ok(Math.abs(Number(input))<=9999.9999);
}
function verify(e,f,sign,exponent,fraction) {
  const fields=[String(sign),FP.bits(exponent,e),FP.bits(fraction,f)], value=FP.decode(fields,e,f);
  const bias=2**(e-1)-1;
  if(exponent===2**e-1) {
    assert.equal(value.kind,fraction===0?'infinity':'NaN');
    assert.ok(FP.checkValue(value.text,value).ok);
  } else {
    const independent=(sign?-1:1)*(exponent===0?fraction/2**f:1+fraction/2**f)*2**(exponent===0?1-bias:exponent-bias);
    assert.ok(Object.is(value.value,independent));
    assert.deepEqual(FP.encode(value.text,e,f),fields); // exact decimal round trip
    assert.ok(FP.checkValue(value.text,value).ok);
    assert.ok(FP.checkValue(Object.is(value.value,-0)?'-0':value.value.toPrecision(6),value).ok);
  }
  patterns++;
}
for(let e=3;e<=8;e++) for(let f=3;f<=10;f++) {
  const fmt=FP.format(e,f); assert.ok(fmt.total<32); assert.equal(fmt.bias,2**(e-1)-1);
  for(const s of [0,1]) for(const ex of [0,1,2**e-2,2**e-1]) for(const fr of [0,1,2**f-1]) verify(e,f,s,ex,fr);
  for(let i=0;i<300;i++) verify(e,f,rand(2),rand(2**e),rand(2**f));
  const lim=FP.limits(e,f);
  assert.equal(lim.max.value,(2-2**(-f))*2**fmt.emax);
  assert.equal(lim.min.value,-lim.max.value);
  assert.equal(lim.minPositive.value,2**(fmt.emin-f));
  assert.equal(lim.minNormal.value,2**fmt.emin);
  assert.equal(lim.maxSubnormal.value,(1-2**(-f))*2**fmt.emin);
  assert.ok(lim.minPositive.value <= lim.maxSubnormal.value && lim.maxSubnormal.value < lim.minNormal.value);
  assert.equal(FP.checkValue('0',lim.minPositive).ok,false);
  assert.equal(FP.checkValue('-1',lim.minPositive).ok,false);
}
// Exhaustive encoding/decoding for the smallest formats.
for(let e=3;e<=4;e++) for(let f=3;f<=5;f++)
  for(let s=0;s<=1;s++) for(let ex=0;ex<2**e;ex++) for(let fr=0;fr<2**f;fr++) verify(e,f,s,ex,fr);
// Every adjacent positive midpoint in a small format: exact ties choose even.
for(let e=3;e<=4;e++) for(let f=3;f<=5;f++) {
  const values=[];
  for(let ex=0;ex<2**e-1;ex++) for(let fr=0;fr<2**f;fr++) values.push(decoded('0',ex,fr,e,f));
  for(let i=0;i<values.length-1;i++) {
    const lower=values[i],upper=values[i+1], midpoint=(lower.value+upper.value)/2;
    // For these small formats the midpoint is exact in binary64, and decimal strings are exact.
    const chosen=i%2===0?i:i+1;
    assert.deepEqual(FP.encode(String(midpoint),e,f),['0',FP.bits(Math.floor(chosen/2**f),e),FP.bits(chosen%2**f,f)]);
  }
}
assert.ok(FP.checkValue('0.0312501',decoded('0',0,1,3,3)).ok);
assert.equal(FP.checkValue('0.03126',decoded('0',0,1,3,3)).ok,false);
assert.equal(FP.checkValue('0',decoded('1',0,0,3,3)).ok,false);
assert.equal(FP.checkValue('-0',decoded('1',0,0,3,3)).ok,true);
assert.equal(FP.checkValue('-INF',decoded('0',7,0,3,3)).ok,false);
assert.equal(FP.checkValue('infinity',decoded('0',7,0,3,3)).ok,true);
assert.equal(FP.checkValue('nan',decoded('0',7,2,3,3)).ok,true);
assert.equal(FP.checkValue('NaN',decoded('0',1,0,3,3)).ok,false);
const tinyNormal=FP.limits(8,10).minPositive;
const fiveDigitAnswer=FP.plainDecimal(tinyNormal.value.toPrecision(5));
assert.ok(FP.checkValue(fiveDigitAnswer,tinyNormal,{significantDigits:5}).ok);
assert.equal(FP.checkValue(fiveDigitAnswer,tinyNormal).ok,false);
assert.equal(FP.checkValue('0',tinyNormal,{significantDigits:5}).ok,false);
for(let e=3;e<=8;e++) for(let f=3;f<=10;f++) {
  const lim=FP.limits(e,f);
  for(const value of [lim.max,lim.minNormal,lim.maxSubnormal,lim.minPositive]) {
    const rounded=FP.plainDecimal(value.value.toPrecision(5));
    assert.ok(FP.checkValue(rounded,value,{significantDigits:5}).ok);
    for(const digits of [4,5]) {
      const answer=FP.plainDecimal(value.value.toPrecision(digits));
      assert.ok(FP.checkValue(answer,value,{significantDigits:4}).ok);
    }
    assert.equal(FP.checkValue('0',value,{significantDigits:4}).ok,false);
  }
}
assert.ok(FP.checkValue('0.014648',FP.limits(4,4).maxSubnormal,{significantDigits:4}).ok);
assert.ok(FP.checkBits('10 1\n0','1010').ok);
assert.equal(FP.checkBits('0b1010','1010').ok,false);
assert.equal(FP.checkBits('101','1010').ok,false);
assert.throws(()=>FP.parseDecimal('1eInfinity'));
assert.throws(()=>FP.format(9,10));
console.log(`PASS: ${patterns} bit patterns across all 48 formats; exact decimal round trips, exhaustive small formats, midpoint rounding, limits, overflow, subnormals, signed zero, INF/NaN, and answer grading.`);
