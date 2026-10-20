(function (root) {
  'use strict';
  function generatePair(firstBits, random = Math.random) {
    if (!Number.isInteger(firstBits) || firstBits < 3 || firstBits > 10) {
      throw new RangeError('Operand widths must be between 3 and 10 bits.');
    }
    const otherWidths = Array.from({ length: 8 }, (_, i) => i + 3).filter(n => n !== firstBits);
    const secondBits = otherWidths[Math.floor(random() * otherWidths.length)];
    const value = bits => 2 ** (bits - 1) + Math.floor(random() * 2 ** (bits - 1));
    return [value(firstBits), value(secondBits)];
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { generatePair };
  else root.Operands = { generatePair };
})(typeof globalThis === 'undefined' ? this : globalThis);
