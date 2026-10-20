(function (root) {
  'use strict';
  const binary = (value, width) => value.toString(2).padStart(width, '0');
  function validate(n, dividend, divisor) {
    if (!Number.isInteger(n) || n < 3 || n > 10 ||
      ![dividend, divisor].every(x => Number.isInteger(x) && x >= 0 && x < 2 ** n) || divisor === 0) {
      throw new RangeError('Unsigned operands must fit 3–10 bits; divisor must be nonzero.');
    }
  }
  function trace(n, dividend, divisor) {
    validate(n, dividend, divisor);
    let q = 0, div = divisor * 2 ** n, rem = dividend;
    const rows = [];
    const push = (iteration, label) => rows.push({ iteration, label,
      values: [binary(q, n), binary(div, 2 * n), binary(rem, 2 * n)] });
    push(0, 'Initial values');
    // COD first version starts the divisor in the upper half: n+1 trials.
    for (let i = 1; i <= n + 1; i++) {
      const trial = rem - div;
      const bit = trial >= 0 ? 1 : 0;
      if (bit) rem = trial; // Otherwise restore the original remainder.
      q = (q * 2 + bit) % 2 ** n;
      div = Math.floor(div / 2);
      push(i, `${bit ? 'Keep subtraction; append 1 to Q' : 'Restore REM; append 0 to Q'}; shift Div right`);
    }
    return rows;
  }
  function refinedTrace(n, dividend, divisor) {
    validate(n, dividend, divisor);
    let rem = dividend;
    const rows = [], half = 2 ** n;
    const push = (iteration, label) => rows.push({ iteration, label,
      values: [binary(divisor, n), binary(rem, 2 * n)] });
    push(0, 'Initial values');
    // REM combines partial remainder (upper half) and dividend/quotient (lower).
    for (let i = 1; i <= n; i++) {
      const shifted = rem * 2;
      const trial = Math.floor(shifted / half) - divisor;
      const bit = trial >= 0 ? 1 : 0;
      rem = (bit ? trial * half + shifted % half : shifted) + bit;
      push(i, `Shift REM left; ${bit ? 'keep upper-half subtraction; set REM₀ = 1' : 'restore upper half; set REM₀ = 0'}`);
    }
    return rows;
  }
  function checkCell(raw, expected) {
    const value = String(raw).replace(/\s/g, '');
    if (!value) return { ok: false, message: 'This cell is empty.' };
    if (!/^[01]+$/.test(value)) return { ok: false, message: 'Use only 0, 1, and whitespace.' };
    if (value.length !== expected.length) return { ok: false, message: `Expected ${expected.length} bits; received ${value.length}.` };
    return value === expected ? { ok: true, message: 'Correct' } : { ok: false, message: 'Incorrect value for this iteration.' };
  }
  const api = { binary, trace, refinedTrace, checkCell };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Division = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
