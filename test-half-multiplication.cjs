const assert=require('node:assert/strict'),FP=require('./floating.js'),M=require('./half-multiplication.js');
const sample=M.multiply('26.125','0.4150390625');
const conversion=M.explainOperand('-80.7494');
assert.ok(conversion.fractionalBinary.startsWith('0.101111111101'));
assert.ok(conversion.rawBinary.startsWith('-1010000.101111111101'));
assert.ok(conversion.normalized.startsWith('-1.010000101111'));
assert.equal(conversion.exponent,6);
assert.equal(conversion.kept,'1.0100001011');
assert.deepEqual([conversion.guard,conversion.round,conversion.sticky],[1,1,1]);
assert.equal(conversion.increment,true);
assert.equal(conversion.stored.decoded.text,'-80.75');
assert.deepEqual(M.multiply('-80.7494','-0.2236').fields,['0','10011','0010000100']);
assert.equal(M.multiply('-80.7494','-0.2236').decoded.text,'18.0625');
assert.equal(M.explainOperand('0.5').fractionalBinary,'0.1');
assert.equal(M.explainOperand('2').rawBinary,'10.0');
assert.equal(M.explainOperand('-0').rawBinary,'-0.0');
assert.equal(M.explainOperand('1.00048828125').increment,false);
assert.deepEqual(sample.fields,['0','10010','0101101100']);
assert.equal(sample.decoded.text,'10.84375');
assert.deepEqual([sample.rounding.guard,sample.rounding.round,sample.rounding.sticky],[1,1,1]);
for(const [a,b,value] of [['1.5','2.5','3.75'],['-1.5','2.5','-3.75'],['-1.5','-2.5','3.75'],['0','-2','-0']])assert.equal(M.multiply(a,b).decoded.text,value);
const up=M.multiply('1.5','1.0009765625'),down=M.multiply('1.5','1.0029296875');
assert.deepEqual([up.rounding.guard,up.rounding.round,up.rounding.sticky],[1,0,0]);
assert.equal(up.rounding.increment,true);assert.equal(down.rounding.increment,false);
const carry=M.multiply('1.5','1.3330078125');
assert.equal(carry.rounding.rounded,'2048');assert.equal(carry.decoded.text,'2');
assert.equal(M.multiply('1.75','1.75').normalizationShift,1);
assert.equal(M.multiply('65504','2').decoded.text,'+INF');
assert.equal(M.multiply('-65504','2').decoded.text,'-INF');
assert.equal(M.multiply('0.00006103515625','0.5').underflow,true);
assert.equal(M.multiply('0.00006103515625','0.5').decoded.text,'0');
assert.equal(M.multiply('10000000000','0').decoded.kind,'NaN');
const buffer=new ArrayBuffer(2),native=new Float16Array(buffer),word=new Uint16Array(buffer);
function nativeStore(value){native[0]=value;return (word[0]&0x7c00)===0&&value!==0?0:word[0];}
function nativeValue(bits){word[0]=bits;return native[0];}
function reference(a,b){const av=nativeValue(nativeStore(Number(a))),bv=nativeValue(nativeStore(Number(b)));return nativeStore(av*bv);}
let seed=123987,cases=0;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
function verify(a,b){
  const result=M.multiply(a,b),expected=reference(a,b),got=parseInt(result.fields.join(''),2);
  const nan=(expected&0x7c00)===0x7c00&&(expected&0x3ff)!==0;
  if(nan)assert.equal(result.decoded.kind,'NaN');else assert.equal(got,expected,`${a} × ${b}`);
  assert.equal(result.fields.join('').length,16);
  if(!result.special&&result.exponent!==null){
    const r=result.rounding;assert.equal(r.increment,!!(r.guard&&(r.round||r.sticky||BigInt(r.retained)%2n===1n)));
  }
  cases++;
}
for(const type of ['ordinary','tie','sticky','normalization','zero','overflow','underflow']){
  for(let i=0;i<1000;i++){
    const [a,b]=M.generate(type,random);verify(a,b);const r=M.multiply(a,b);
    if(type==='tie')assert.deepEqual([r.rounding.guard,r.rounding.round,r.rounding.sticky],[1,0,0]);
    if(type==='sticky')assert.equal(r.rounding.sticky,1);
    if(type==='normalization')assert.equal(r.normalizationShift,1);
    if(type==='overflow')assert.equal(r.decoded.kind,'infinity');
    if(type==='underflow'){assert.equal(r.underflow,true);assert.equal(r.decoded.text,'0');}
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
console.log(`PASS: ${cases} products against native Float16Array with the exercise flush-to-zero rule; sample, XOR sign, significand product, exponent addition, normalization, G/R/S, ties-even, carry, INF/NaN, signed zero, and underflow.`);
