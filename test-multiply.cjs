const assert = require('node:assert/strict');
const { trace, refinedTrace, checkCell } = require('./multiply.js');

// A full small example, including unchanged states and shifts after MULT becomes zero.
assert.deepEqual(trace(3, 2, 3).map(r => r.values), [
  ['011','000010','000000'],
  ['001','000100','000010'],
  ['000','001000','000110'],
  ['000','010000','000110']
]);
const example = trace(6, 0o62, 0o12);
assert.equal(example.length, 7);
assert.deepEqual(example[0].values, ['001010', '000000110010', '000000000000']);
assert.deepEqual(example.at(-1).values, ['000000', '110010000000', '000111110100']);
assert.deepEqual(refinedTrace(3, 7, 7).map(r => r.values), [
  ['111', '000111'], ['111', '011111'], ['111', '101011'], ['111', '110001']
]); // Iterations 2 and 3 need the carry before shifting.
assert.deepEqual(refinedTrace(6, 0o62, 0o12).at(-1).values, ['110010', '000111110100']);

let cases = 0;
function verify(n, a, b) {
  const rows = trace(n, a, b);
  assert.equal(rows.length, 1 + n);
  for (let i = 0; i <= n; i++) {
    const values = rows[i].values;
    assert.equal(parseInt(values[0], 2), Math.floor(b / 2 ** i));
    assert.equal(parseInt(values[1], 2), a * 2 ** i);
    // Independent invariant: product contains contributions from the lowest i bits.
    assert.equal(parseInt(values[2], 2), a * (b % 2 ** i));
    values.forEach((v, c) => assert.equal(v.length, c === 0 ? n : 2*n));
  }
  assert.equal(parseInt(rows.at(-1).values[2], 2), a*b);
  const refined = refinedTrace(n, a, b);
  assert.equal(refined.length, n + 1);
  for (let i = 0; i <= n; i++) {
    assert.equal(refined[i].values[0], a.toString(2).padStart(n, '0'));
    assert.equal(refined[i].values[1].length, 2 * n);
    const invariant = Math.floor(b / 2 ** i) + a * (b % 2 ** i) * 2 ** (n - i);
    assert.equal(parseInt(refined[i].values[1], 2), invariant);
  }
  assert.equal(parseInt(refined.at(-1).values[1], 2), a*b);
  cases++;
}
for (let n = 3; n <= 6; n++) for (let a = 0; a < 2**n; a++) for (let b = 0; b < 2**n; b++) verify(n,a,b);
// Deterministic broad coverage of larger widths, with boundary operands.
let seed = 123456;
const rand = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
for (let n = 7; n <= 10; n++) {
  for (const a of [0,1,2**(n-1),2**n-1]) for (const b of [0,1,2**(n-1),2**n-1]) verify(n,a,b);
  for (let i = 0; i < 1000; i++) verify(n,rand(2**n),rand(2**n));
}
assert.equal(checkCell(' 0001\n1111 0100 ', '000111110100').ok, true);
for (const raw of ['', '500', '0b0011', '001_', '11', '000000000000']) assert.equal(checkCell(raw,'000111110100').ok,false);
assert.throws(() => trace(6,64,1), RangeError);
assert.throws(() => trace(2,1,1), RangeError);
assert.throws(() => refinedTrace(6,64,1), RangeError);
// Small operands on a larger system must still run the full system width.
assert.equal(refinedTrace(10, 9, 13).length, 11);
assert.equal(parseInt(refinedTrace(10, 9, 13).at(-1).values[1], 2), 117);
console.log(`PASS: ${cases} operand pairs in both modes, COD example, carry cases, per-cycle invariants, strict binary grading.`);
