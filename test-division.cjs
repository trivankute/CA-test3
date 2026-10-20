const assert = require('node:assert/strict');
const { trace, refinedTrace, checkCell } = require('./division.js');
assert.deepEqual(trace(3, 7, 2).map(r => r.values), [
  ['000','010000','000111'], ['000','001000','000111'],
  ['000','000100','000111'], ['001','000010','000011'], ['011','000001','000001']
]);
assert.deepEqual(refinedTrace(3,7,2).map(r => r.values), [
  ['010','000111'], ['010','001110'], ['010','001101'], ['010','001011']
]);
let cases = 0;
function verify(n, a, b) {
  const first = trace(n,a,b), refined = refinedTrace(n,a,b), half = 2**n;
  assert.equal(first.length, n+2);
  assert.equal(refined.length, n+1);
  for (let i=1; i<=n+1; i++) {
    const [q,div,rem] = first[i].values.map(v => parseInt(v,2));
    const scale = 2**(n+1-i);
    assert.equal(q, Math.floor(a/(b*scale)));
    assert.equal(rem, a-b*q*scale);
    assert.equal(div, Math.floor(b*half/2**i));
    first[i].values.forEach((v,c) => assert.equal(v.length, c===0?n:2*n));
  }
  for (let i=0; i<=n; i++) {
    const [div,rem] = refined[i].values.map(v => parseInt(v,2));
    const remaining = 2**(n-i), prefix = Math.floor(a/remaining);
    assert.equal(div, b);
    assert.equal(rem, (prefix%b)*half + (a%remaining)*2**i + Math.floor(prefix/b));
    assert.equal(refined[i].values[0].length,n);
    assert.equal(refined[i].values[1].length,2*n);
  }
  const q = parseInt(first.at(-1).values[0],2), r = parseInt(first.at(-1).values[2],2);
  assert.equal(q, Math.floor(a/b)); assert.equal(r, a%b);
  assert.equal(a,b*q+r); assert.ok(r>=0 && r<b);
  assert.equal(parseInt(refined.at(-1).values[0],2),b);
  assert.equal(parseInt(refined.at(-1).values[1],2),r*half+q);
  cases++;
}
for(let n=3;n<=6;n++) for(let a=0;a<2**n;a++) for(let b=1;b<2**n;b++) verify(n,a,b);
let seed=12345;
const rand = max => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed%max; };
for(let n=7;n<=10;n++) {
  for(const a of [0,1,7,2**(n-1),2**n-1]) for(const b of [1,2,3,2**(n-1),2**n-1]) verify(n,a,b);
  for(let i=0;i<1000;i++) verify(n,rand(2**n),1+rand(2**n-1));
}
for (const f of [trace,refinedTrace]) {
  assert.throws(()=>f(4,7,0),RangeError);
  assert.throws(()=>f(4,16,1),RangeError);
  assert.throws(()=>f(2,1,1),RangeError);
}
assert.equal(checkCell('00 101\n0','001010').ok,true);
for(const bad of ['', '0b001010','00102','1010']) assert.equal(checkCell(bad,'001010').ok,false);
console.log(`PASS: ${cases} division pairs in both modes; every iteration, restoration, quotient/remainder, widths, zero divisor, and binary grading.`);
