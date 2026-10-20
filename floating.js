(function (root) {
  'use strict';
  function format(e, f) {
    if (!Number.isInteger(e) || e < 3 || e > 8 || !Number.isInteger(f) || f < 3 || f > 10) throw new RangeError('Invalid format.');
    const bias = 2 ** (e - 1) - 1;
    return { e, f, bias, emin: 1 - bias, emax: bias, total: 1 + e + f };
  }
  const bits = (x, width) => Number(x).toString(2).padStart(width, '0');
  function randomDecimal(random = Math.random) {
    const integer = (a,b) => a + Math.floor(random() * (b-a+1));
    const sign = integer(0,1) ? '-' : '';
    if (integer(0,19) === 0) return sign + '0';
    const digits = integer(0,4), places = integer(0,4);
    const whole = digits === 0 ? 0 : integer(10 ** (digits-1), 10 ** digits - 1);
    const fraction = places ? String(integer(0,10 ** places-1)).padStart(places,'0').replace(/0+$/,'') : '';
    return sign + whole + (fraction ? '.' + fraction : '');
  }
  function parseDecimal(raw) {
    const text = String(raw).trim();
    if (text.length > 2000) throw new Error('Decimal input is too long to evaluate.');
    const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i.exec(text);
    if (!match) throw new Error('Enter a decimal number.');
    const tail = match[3] || match[4] || '';
    const exponent = Number(match[5] || 0) - tail.length;
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 2000) throw new Error('Decimal exponent is too large to evaluate.');
    let numerator = BigInt((match[2] || '0') + tail), denominator = 1n;
    if (exponent >= 0) numerator *= 10n ** BigInt(exponent);
    else denominator = 10n ** BigInt(-exponent);
    return { sign: match[1] === '-' ? 1 : 0, numerator, denominator };
  }
  function plainDecimal(raw) {
    const { sign, numerator, denominator } = parseDecimal(raw);
    const places = denominator.toString().length - 1;
    let text = numerator.toString();
    if (places) {
      text = text.padStart(places + 1, '0');
      text = (text.slice(0,-places) + '.' + text.slice(-places)).replace(/0+$/, '').replace(/\.$/, '');
    }
    return (sign ? '-' : '') + text;
  }
  function roundScaled(n, d, shift) {
    if (shift >= 0) n <<= BigInt(shift); else d <<= BigInt(-shift);
    const q = n / d, r = n % d;
    return q + (2n * r > d || (2n * r === d && q % 2n === 1n) ? 1n : 0n);
  }
  function encode(decimal, e, f) {
    const fmt = format(e, f), { sign, numerator: n, denominator: d } = parseDecimal(decimal);
    const pack = (exp, frac) => [String(sign), bits(exp, e), bits(frac, f)];
    if (n === 0n) return pack(0, 0);
    let power = n.toString(2).length - d.toString(2).length;
    if (power >= 0 ? n < (d << BigInt(power)) : (n << BigInt(-power)) < d) power--;
    if (power < fmt.emin) {
      const frac = roundScaled(n, d, f - fmt.emin);
      return frac >= 2n ** BigInt(f) ? pack(1, 0) : pack(0, frac);
    }
    if (power > fmt.emax) return pack(2 ** e - 1, 0);
    let significand = roundScaled(n, d, f - power);
    if (significand === 2n ** BigInt(f + 1)) { power++; significand >>= 1n; }
    if (power > fmt.emax) return pack(2 ** e - 1, 0);
    return pack(power + fmt.bias, significand - 2n ** BigInt(f));
  }
  function decode(fields, e, f) {
    const fmt = format(e, f);
    if (!Array.isArray(fields) || fields.length !== 3 || fields.some((s,i) => typeof s !== 'string' || !/^[01]+$/.test(s) || s.length !== [1,e,f][i])) throw new Error('Invalid bit fields.');
    const sign = Number(fields[0]), exponent = parseInt(fields[1],2), fraction = parseInt(fields[2],2);
    if (exponent === 2 ** e - 1) return { kind: fraction ? 'NaN' : 'infinity', sign, text: fraction ? 'NaN' : sign ? '-INF' : '+INF', value: fraction ? NaN : sign ? -Infinity : Infinity };
    const coefficient = exponent ? 2 ** f + fraction : fraction;
    const power = (exponent ? exponent - fmt.bias : fmt.emin) - f;
    const value = (sign ? -1 : 1) * coefficient * 2 ** power;
    return { kind: coefficient === 0 ? 'zero' : exponent ? 'normal' : 'subnormal', sign, coefficient, power, value,
      text: dyadicText(coefficient, power, sign) };
  }
  function dyadicText(coefficient, power, sign = 0) {
    let n = BigInt(coefficient), text;
    if (power >= 0) text = String(n << BigInt(power));
    else {
      const places = -power;
      text = String(n * 5n ** BigInt(places)).padStart(places + 1, '0');
      text = (text.slice(0,-places) + '.' + text.slice(-places)).replace(/0+$/, '').replace(/\.$/, '');
    }
    return (sign ? '-' : '') + text;
  }
  function limits(e, f) {
    const fmt = format(e,f);
    return {
      max: decode(['0', bits(2 ** e - 2,e), '1'.repeat(f)],e,f),
      min: decode(['1', bits(2 ** e - 2,e), '1'.repeat(f)],e,f),
      minPositive: decode(['0', '0'.repeat(e), bits(1,f)],e,f),
      maxSubnormal: decode(['0', '0'.repeat(e), '1'.repeat(f)],e,f),
      minNormal: decode(['0', bits(1,e), '0'.repeat(f)],e,f)
    };
  }
  function checkBits(raw, expected) {
    const value = String(raw).replace(/\s/g,'');
    if (!value) return { ok:false, message:'This field is empty.' };
    if (!/^[01]+$/.test(value)) return { ok:false, message:'Use only 0, 1, and whitespace.' };
    if (value.length !== expected.length) return { ok:false, message:`Expected ${expected.length} bits; received ${value.length}.` };
    return { ok:value === expected, message:value === expected ? 'Correct' : 'Incorrect bit pattern. Check normalization and rounding.' };
  }
  function checkValue(raw, expected, options = {}) {
    const text = String(raw).trim();
    if (expected.kind === 'NaN') return { ok:/^nan$/i.test(text), message:'Enter NaN for this bit pattern.' };
    if (expected.kind === 'infinity') {
      const valid = expected.sign ? /^-(?:inf(?:inity)?|∞)$/i : /^\+?(?:inf(?:inity)?|∞)$/i;
      return { ok:valid.test(text), message:`This pattern represents ${expected.text}.` };
    }
    try {
      const actual = parseDecimal(text), target = parseDecimal(expected.text);
      const actualSigned = (actual.sign ? -1n : 1n) * actual.numerator;
      const targetSigned = (target.sign ? -1n : 1n) * target.numerator;
      const difference = actualSigned * target.denominator - targetSigned * actual.denominator;
      const magnitude = difference < 0n ? -difference : difference;
      // Four or five significant digits for minimum-positive exercises; six otherwise.
      // Never use an absolute floor that could accept zero for tiny values.
      const tolerance = options.significantDigits === 4 ? 500n : options.significantDigits === 5 ? 50n : 5n;
      const ok = target.numerator === 0n ? actual.numerator === 0n && actual.sign === target.sign :
        magnitude * 1000000n <= tolerance * target.numerator * actual.denominator;
      return { ok, message:expected.kind === 'zero' ? 'Check the sign of zero; use -0 for negative zero.' : `Incorrect value. Use decimal notation (relative tolerance ${options.significantDigits === 4 ? '0.05%' : options.significantDigits === 5 ? '0.005%' : '0.0005%'}).` };
    } catch (error) { return { ok:false, message:error.message }; }
  }
  const api = { format, bits, randomDecimal, parseDecimal, plainDecimal, encode, decode, dyadicText, limits, checkBits, checkValue };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Floating = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
