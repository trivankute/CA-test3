# Bit by bit

Open `multiply-practice.html` in a browser. This standalone file works offline without installation or a server.

- Practice unsigned multiplication with 3–10 bit operands.
- Choose Decimal or Octal in Number format. Each problem displays only the selected base; convert the operands to binary yourself.
- The example loads MC = 62 octal and MULT = 12 octal with a 6-bit operand width.
- Choose the system width separately from operand size: Minimum needed, Random compatible (up to 10 bits), or a fixed width that fits both operands. For example, 4-bit operands can use any 4–10-bit system. Changing the system width resets the table; Clear my work keeps the current system width. MULT is fixed at n bits; MC and PROD are fixed at 2n bits. The prompt states n-bit unsigned integers. Enter each register width yourself in the blank field below its name; widths are graded when you check your work. Add a row using + below the last row, or delete a row using ×.
- Record initialization, then one row at the end of each iteration, after add/no operation, shift MC left, and shift MULT right. Complete exactly n iterations: n + 1 rows including initialization. Existing saved detailed tables are migrated by keeping initialization and each completed iteration.
- Grading checks row count, binary characters, and each register value against its fixed bit width. Whitespace and line breaks are accepted between bits.
- Work is saved automatically if browser storage is available. New problem and Clear my work reset the practice table.
- Show solution opens a separate answer table.

Reference: [COD Figures 3.3, 3.4, and 3.6](https://cs.wheatoncollege.edu/~mgousie/comp220/Chapter03.pdf).

## Source and checks

The source files are `index.html`, `app.js`, and `multiply.js`. After editing, run `node build.cjs` to rebuild the standalone file. Run `node test-multiply.cjs` to check the algorithm and binary grading.

## Refined version

Select Hardware mode → Refined version. The table uses MC on the left and PROD on the right. Enter the register widths yourself. Initially PROD holds the multiplier in its low half and zeros in its high half. At each iteration, conditionally add MC to the upper half based on PROD bit 0, then shift carry + PROD right. MC stays unchanged. Carry is preserved internally until after the shift. Both modes use n + 1 rows, including initialization. Switching modes clears the practice table and retains the operands and system width.

## Division page

Open `division-practice.html` for a separate offline division practice page. Navigation links connect the two standalone pages when they are kept in the same folder. Division work is saved separately from multiplication work.

- First version: columns Q / Div / REM. Initially Q = 0, Div = divisor shifted left n bits, REM = dividend. Each iteration subtracts/restores REM, shifts Q left with the decision bit, then shifts Div right. There are n + 1 iterations, or n + 2 rows including initialization.
- Refined version: columns Div / REM. Div stays unchanged. Initially REM = dividend with zeros in its upper half. Each iteration shifts REM left, subtracts Div from the upper half, restores if negative, and sets REM bit 0 to the quotient bit. There are n iterations, or n + 1 rows including initialization. Final REM = [remainder | quotient]. Older saved separate-Q refined practice tables are reset because their register states no longer apply.
- Register widths remain blank for the learner to enter. Each mode checks widths, row count, binary formatting, and the end state of every iteration. Inputs are not length-limited. Division by zero is excluded from generated problems and rejected by the algorithm.
- The example is 7 ÷ 2 on a 4-bit system.

Run `node test-division.cjs` for division algorithm checks. `node build.cjs` rebuilds both standalone HTML files.

## Different operand widths

Every new random problem uses two operands with different actual bit lengths, each between 3 and 10 bits. First operand size controls the multiplicand or dividend; the other operand uses a randomly chosen different width. The system must fit both operands and can be wider. Example buttons retain their fixed textbook examples.

## Floating point page

Open `floating-practice.html` for offline floating-point practice. Navigation links connect all three pages. Its saved work is separate from multiplication and division.

- Custom binary formats use 1 sign bit, 3–8 exponent bits, and 3–10 fraction bits (7–19 bits total). Each size can be fixed or random. Bias follows 2^(E−1)−1. These are custom formats with IEEE-style rules, not standard IEEE interchange formats.
- Decimal → bits: encode the exact decimal shown into sign, exponent, and fraction. The algorithm uses exact integer fractions and round-to-nearest, ties-to-even, including overflow, subnormal rounding, and signed underflow to zero.
- Format limits: enter positive normal maximum/minimum first, then positive denormalized (subnormal) maximum/minimum. Zero, negative values, infinities, and NaNs are excluded.
- Bits → value: always decode the rounded representation of the decimal from Part 1. The bit pattern is revealed only when all three Part 1 fields are correct; the Part 3 answer can be entered at any time. Overflow can decode to signed infinity, and underflow can decode to signed zero.
- Numeric answers accept decimal and scientific e notation. Nonzero answers have a relative tolerance of 5e-6 (0.0005%); there is no absolute tolerance floor. Zero must preserve its sign. Inputs are not length-limited, although grading rejects excessively large decimal expressions. Bit fields require their exact width; whitespace is allowed.
- Show solution displays the correct fields, decoded classification/value, exact decimal values, or the format limits. All three parts appear together and share one format. Check my work grades all eight answer fields, Clear my work resets all answers, and Show solution displays all three parts. Example uses E=4, F=5 and −13.375, which rounds to −13.5, and Part 3 decodes that result as −13.5.

Source files: `floating.html`, `floating.js`, `floating-app.js`. Run `node test-floating.cjs` for all-format, boundary, midpoint-rounding, round-trip, and grading checks. `node build.cjs` rebuilds all three standalone HTML files.

Floating-point prompts and solution values are displayed in ordinary decimal notation, with all zeros written out rather than scientific notation. Existing saved prompts are converted on load. Scientific notation remains accepted as an optional answer input.

## Half-precision addition page

Open `half-addition-practice.html` or use Half Addition in the navigation. The format is fixed binary16: 1 sign bit, 5 exponent bits (bias 15), and 10 fraction bits. Work out A + B using one guard, one round, and one sticky bit, then enter the final 16-bit word and its decoded decimal value. Spaces may separate bit fields. Show all steps reveals input storage, exponent alignment, signed addition, normalization, G/R/S, nearest-even rounding, and the final encoding.

Operands are stored and rounded to half precision before addition. This page follows the requested exercise convention: any nonzero value whose rounded half exponent field is zero is flushed to positive zero, both when storing operands and storing the final sum. Standard IEEE binary16 supports subnormals; this exercise intentionally flushes them. Overflow uses signed infinity. Decimal grading uses the stored sum, not the exact sum of the original decimal operands.

Problem types include ordinary addition, exact halfway rounding, sticky-bit cases, cancellation, overflow, underflow, and the supplied COD example (26.125 + 0.4150390625 → 26.546875). Focused examples may use longer exact decimals to expose a rounding boundary. All displayed decimals avoid scientific notation. Work is saved separately from the other pages.

Source: `half-addition.html`, `half-addition.js`, `half-addition-app.js`. `node test-half-addition.cjs` compares 26,000 cases against native JavaScript Float16Array using the same flush-to-zero convention. `node build.cjs` rebuilds all four standalone pages.

The floating-point exercise uses four positive-only range answers and a decoding question linked to Part 1. Older saved limit/decode answers are reset when migrating, while sign/exponent/fraction answers are retained.

All four positive normal and denormalized limits (largest and smallest) accept rounding to 4–5 significant digits (relative tolerance 0.05%). Leading zeros are excluded from the significant-digit count; interior zeros count. All four approximate limit solution values also use 5 significant digits, alongside the exact values. Other numeric answers retain the 0.0005% tolerance. Zero is not accepted for nonzero minimum values.

Generated Part 1 decimals have at most four integer digits and four fractional digits, with no scientific notation. The sign does not count as a digit. Existing saved problems outside these limits are replaced and their answers reset. Format-limit answers retain their own precision rules.

## Half-precision multiplication page

Open `half-multiplication-practice.html` or select Half Multiplication in the navigation. It follows the same 16-bit input, decoded decimal answer, G/R/S nearest-even rounding, operand storage, overflow-to-signed-infinity, and underflow-to-zero conventions as Half Addition. Exact signed zero preserves the XOR sign.

The worked solution shows stored inputs, sign XOR, exponent addition, full significand multiplication, normalization, G/R/S, rounding carry, and final fields/value. Practice types include ordinary products, halfway ties, normalization shifts, sticky bits, zero, overflow, underflow, and an example (26.125 × 0.4150390625 → 10.84375). Generated normal products can include different operand signs.

Source: `half-multiplication.html`, `half-multiplication.js`, `half-multiplication-app.js`. Shared storage and G/R/S routines come from `half-addition.js`. Run `node test-half-multiplication.cjs` to compare 27,000 products with native Float16Array. `node build.cjs` rebuilds all five standalone pages.

Half Multiplication now explains each original operand before storage: fractional decimal-to-binary expansion, full original binary value, normalization, retained 10-bit fraction and G/R/S, then rounded stored half bits/value. The Conversion example uses −80.7494 × −0.2236, explicitly showing 0.7494 = 0.101111111101… before A rounds to −80.75.

Half Addition and Half Multiplication now spell out the exact G/R/S rounding decision, including the retained least-significant bit in halfway cases. Negative halfway practice includes −42.59375 + −0.015625 = −42.609375 exactly, rounded to −42.625 because significand 1364 is even (1363 is odd). The numeric nearest-even algorithm is unchanged.
