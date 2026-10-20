const assert=require('node:assert/strict'),FP=require('./floating.js'),H=require('./half-addition.js'),M=require('./half-multiplication.js');
const mode='nearest-ties-zero';
const example=H.add('-42.59375','-0.015625',mode);
assert.equal(example.decoded.text,'-42.59375');
assert.deepEqual(example.fields,['1','10100','0101010011']);
assert.equal(example.rounding.increment,false);
assert.match(H.roundingReason(example.rounding,true,mode),/Do not increment/);
for(const last of [0n,1n])for(let g=0;g<=1;g++)for(let r=0;r<=1;r++)for(let s=0;s<=1;s++){
  const coefficient=((1024n+last)<<3n)+BigInt(g*4+r*2+s);
  assert.equal(H.grs(coefficient,3,mode).increment,!!(g&&(r||s)));
}
assert.equal(H.store('1.00146484375',mode).decoded.text,'1.0009765625');
assert.equal(H.store('1.00146484375').decoded.text,'1.001953125');
assert.equal(H.store('65520',mode).decoded.text,'65504');
assert.equal(H.store('65520.01',mode).decoded.text,'+INF');
assert.equal(M.multiply('1.5','1.0009765625',mode).decoded.text,'1.5009765625');
assert.equal(M.explainOperand('1.00146484375',mode).increment,false);
assert.equal(H.add('-42.59375','-0.015625','nearest-even').decoded.text,'-42.625');
const buffer=new ArrayBuffer(2),native=new Float16Array(buffer),word=new Uint16Array(buffer);
const values=Array.from({length:0x7c00},(_,i)=>{word[0]=i;return native[0];});
function referenceStore(value){
  if(Number.isNaN(value))return NaN;
  if(value===0)return Object.is(value,-0)?0x8000:0;
  const sign=value<0?0x8000:0,magnitude=Math.abs(value);
  if(magnitude>65520)return sign|0x7c00;
  let lo=0,hi=values.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(values[mid]<=magnitude)lo=mid;else hi=mid-1;}
  let chosen=lo;
  if(lo<values.length-1&&magnitude-values[lo]>values[lo+1]-magnitude)chosen++;
  if(chosen<0x0400)return 0;
  return sign|chosen;
}
function referenceValue(bits){if(Number.isNaN(bits))return NaN;word[0]=bits;return native[0];}
let seed=123456,count=0;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<10000;i++){
  const texts=[];
  for(let j=0;j<2;j++)texts.push(FP.decode([String(Math.floor(random()*2)),FP.bits(Math.floor(random()*31),5),FP.bits(Math.floor(random()*1024),10)],5,10).text);
  const [a,b]=texts,x=referenceValue(referenceStore(Number(a))),y=referenceValue(referenceStore(Number(b)));
  for(const [result,exact] of [[H.add(a,b,mode),x+y],[M.multiply(a,b,mode),x*y]]){
    const expected=referenceStore(exact);
    if(Number.isNaN(expected))assert.equal(result.decoded.kind,'NaN');else assert.equal(parseInt(result.fields.join(''),2),expected);
    count++;
  }
}
console.log(`PASS: ${count} classroom-rule operations against an independent nearest-value reference; all G/R/S combinations, input storage, tie overflow boundary, sign, and optional nearest-even.`);
