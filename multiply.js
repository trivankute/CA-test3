(function (root) {
  'use strict';
  const binary = (value, width) => value.toString(2).padStart(width, '0');
  function validate(n, multiplicand, multiplier) {
    if (!Number.isInteger(n) || n < 3 || n > 10 ||
        ![multiplicand, multiplier].every(x => Number.isInteger(x) && x >= 0 && x < 2 ** n)) {
      throw new RangeError('Operands must fit the unsigned register (3–10 bits).');
    }
  }
  function trace(n, multiplicand, multiplier) {
    validate(n, multiplicand, multiplier);
    let mc = multiplicand, mult = multiplier, prod = 0;
    const rows = [];
    const push = (iteration, step, label) => rows.push({ iteration, step, label,
      values: [binary(mult, n), binary(mc, 2 * n), binary(prod, 2 * n)] });
    push(0, 0, 'Initial values');
    for (let i = 1; i <= n; i++) {
      const add = mult % 2 === 1;
      if (add) prod += mc;
      mc = (mc * 2) % (2 ** (2 * n));
      mult = Math.floor(mult / 2);
      push(i, 3, `${add ? 'Add MC to PROD' : 'No addition'}; shift MC left and MULT right`);
    }
    return rows;
  }
  function refinedTrace(n, multiplicand, multiplier) {
    validate(n, multiplicand, multiplier);
    let prod = multiplier;
    const rows = [];
    const push = (iteration, label) => rows.push({ iteration, label,
      values: [binary(multiplicand, n), binary(prod, 2 * n)] });
    push(0, 'Initial values');
    for (let i = 1; i <= n; i++) {
      const add = prod % 2 === 1;
      // Preserve the carry above the 2n-bit register until after the shift.
      // Reducing modulo 2^(2n) before shifting would lose this carry.
      if (add) prod += multiplicand * 2 ** n;
      prod = Math.floor(prod / 2);
      push(i, `${add ? 'Add MC to upper half' : 'No addition'}; shift carry + PROD right`);
    }
    return rows;
  }
  function checkCell(raw, expected) {
    const value = String(raw).replace(/\s/g, '');
    if (!value) return { ok: false, message: 'This cell is empty.' };
    if (!/^[01]+$/.test(value)) return { ok: false, message: 'Use only 0, 1, and whitespace.' };
    if (value.length !== expected.length) return { ok: false, message: `Expected ${expected.length} bits; received ${value.length}.` };
    return value === expected ? { ok: true, message: 'Correct' } : { ok: false, message: 'Incorrect value for this step.' };
  }
  const api = { binary, trace, refinedTrace, checkCell };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Multiply = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
