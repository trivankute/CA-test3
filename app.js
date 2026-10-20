'use strict';
const $ = id => document.getElementById(id);
let names = ['MULT', 'MC', 'PROD'];
const blankRow = () => names.map(() => '');
const expectedTrace = () => (state.mode === 'refined' ? Multiply.refinedTrace : Multiply.trace)(state.n, state.mc, state.mult);
const key = 'bit-by-bit-v1';
let state;
for (let n = 3; n <= 10; n++) $('size').add(new Option(`${n} bit`, n));
for (let n = 3; n <= 10; n++) $('systemSize').add(new Option(`${n}-bit system`, n));
function renderHeaders() {
  $('headers').replaceChildren();
  $('answerHeaders').replaceChildren();
  names.forEach((name, i) => {
  const th = document.createElement('th');
  th.scope = 'col';
  th.innerHTML = `${name}<label class="bits"><input type="text" inputmode="numeric" aria-label="${name} bit width" data-width="${i}" placeholder="?"> bits</label><span class="bitfeedback"></span>`;
  $('headers').append(th);
  const answerTh = document.createElement('th'); answerTh.textContent = name; $('answerHeaders').append(answerTh);
  th.querySelector('input').oninput = event => { state.widths[i] = event.target.value; hideFeedback(); save(); };
  });
  $('add').closest('td').colSpan = names.length;
}
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); }
  catch { $('saveState').textContent = 'Autosave is unavailable. Keep this tab open to retain your work.'; }
}
function hideFeedback() {
  $('result').hidden = true;
  document.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  document.querySelectorAll('.ok,.bad').forEach(el => el.classList.remove('ok', 'bad'));
  document.querySelectorAll('.feedback,.bitfeedback').forEach(el => el.textContent = '');
}
function labelRow(index) {
  return index === 0 ? '0 · Initial values' : `${index} · End of iteration ${index}`;
}
function appendRow(values, index) {
  const tr = document.createElement('tr');
  values.forEach((value, col) => {
    const td = document.createElement('td');
    const top = document.createElement('div'); top.className = 'celltop';
    if (col === 0) {
      const label = document.createElement('span'); label.textContent = labelRow(index); top.append(label);
      const remove = document.createElement('button'); remove.className = 'remove'; remove.textContent = '×';
      remove.setAttribute('aria-label', `Delete row ${index + 1}`);
      remove.onclick = () => { state.rows.splice(index, 1); hideFeedback(); renderRows(); save(); };
      top.append(remove);
    }
    const input = document.createElement('textarea'); input.rows = 1; input.spellcheck = false;
    input.setAttribute('aria-label', `Row ${index + 1}, ${names[col]}`);
    input.placeholder = 'Enter binary…'; input.value = value;
    const feedback = document.createElement('div'); feedback.className = 'feedback';
    feedback.id = `feedback-${index}-${col}`; input.setAttribute('aria-describedby', feedback.id);
    input.oninput = () => { state.rows[index][col] = input.value; hideFeedback(); save(); };
    td.append(top, input, feedback); tr.append(td);
  });
  $('rows').append(tr);
}
function renderRows() {
  $('rows').replaceChildren();
  state.rows.forEach(appendRow);
  $('rowCount').textContent = `${state.rows.length} ${state.rows.length === 1 ? 'row' : 'rows'} added`;
}
function render() {
  names = state.mode === 'refined' ? ['MC', 'PROD'] : ['MULT', 'MC', 'PROD'];
  $('mode').value = state.mode;
  renderHeaders();
  const version = state.mode === 'refined' ? 'refined version' : 'first version';
  $('versionTitle').textContent = `Unsigned multiplication · ${version}`;
  $('versionFooter').textContent = `${version} hardware · Shift & add`;
  $('rowInstructions').textContent = state.mode === 'refined' ?
    'Record the initial values, then one row after each complete iteration (conditional add, then right shift of carry + PROD). Enter register values in binary.' :
    'Record the initial values, then one row after each complete iteration (conditional add, MC left shift, MULT right shift). Enter register values in binary.';
  $('firstRules').hidden = state.mode === 'refined';
  $('refinedRules').hidden = state.mode !== 'refined';
  const minimum = Math.max(3, Math.floor(Math.log2(Math.max(state.mc, state.mult, 1))) + 1);
  $('systemSize').value = state.systemMode || 'auto';
  [...$('systemSize').options].forEach(option => {
    option.disabled = /^\d+$/.test(option.value) && Number(option.value) < minimum;
  });
  $('badge').textContent = `${state.n}-bit unsigned integers`;
  $('systemInfo').textContent = `Multiply the following ${state.n}-bit unsigned integers using the ${version} of the multiplication hardware.`;
  $('base').value = String(state.base);
  for (const [prefix, value] of [['mc', state.mc], ['mult', state.mult]]) {
    $(prefix + 'Number').innerHTML = `${value.toString(state.base)}<sub>${state.base}</sub>`;
  }
  document.querySelectorAll('[data-width]').forEach((el, i) => {
    el.value = state.widths[i];
  });
  $('solution').hidden = true; $('showAnswer').textContent = 'Show solution'; $('showAnswer').setAttribute('aria-expanded', 'false');
  hideFeedback(); renderRows();
}
function start(n, mc, mult, base = Number($('base').value)) {
  const minimum = Math.max(3, Math.floor(Math.log2(Math.max(mc, mult, 1))) + 1);
  let systemMode = $('systemSize').value;
  if (/^\d+$/.test(systemMode) && Number(systemMode) < minimum) systemMode = 'auto';
  n = systemMode === 'random' ? minimum + Math.floor(Math.random() * (11 - minimum)) :
    systemMode === 'auto' ? minimum : Number(systemMode);
  const mode = $('mode').value;
  names = mode === 'refined' ? ['MC', 'PROD'] : ['MULT', 'MC', 'PROD'];
  state = { n, mc, mult, base, mode, systemMode, tableMode: 'iteration', widths: blankRow(), rows: [blankRow()] };
  render(); save();
}
$('add').onclick = () => {
  state.rows.push(blankRow()); hideFeedback(); renderRows(); save();
  $('rows').lastElementChild.querySelector('textarea').focus();
};
$('base').onchange = () => { state.base = Number($('base').value); render(); save(); };
$('mode').onchange = () => {
  state.mode = $('mode').value;
  names = state.mode === 'refined' ? ['MC', 'PROD'] : ['MULT', 'MC', 'PROD'];
  state.widths = blankRow(); state.rows = [blankRow()]; render(); save();
};
$('systemSize').onchange = () => start(state.n, state.mc, state.mult, state.base);
$('new').onclick = () => {
  const n = $('size').value === 'random' ? 3 + Math.floor(Math.random() * 8) : Number($('size').value);
  const [mc, mult] = Operands.generatePair(n);
  start(n, mc, mult);
};
$('example').onclick = () => { $('size').value = '6'; $('systemSize').value = 'auto'; start(6, 0o62, 0o12, 8); };
$('clear').onclick = () => {
  state.widths = blankRow(); state.rows = [blankRow()]; render(); save();
};
$('check').onclick = () => {
  const expected = expectedTrace();
  const widths = state.mode === 'refined' ? [state.n, 2 * state.n] : [state.n, 2 * state.n, 2 * state.n];
  let correctWidths = 0, correctCells = 0;
  document.querySelectorAll('[data-width]').forEach((el, i) => {
    const ok = /^\d+$/.test(el.value.trim()) && Number(el.value) === widths[i];
    el.classList.remove('ok', 'bad'); el.classList.add(ok ? 'ok' : 'bad');
    el.setAttribute('aria-invalid', String(!ok));
    el.closest('th').querySelector('.bitfeedback').textContent = ok ? '✓ Correct width' : 'Incorrect bit width. Try again.';
    if (ok) correctWidths++;
  });
  [...$('rows').children].forEach((tr, row) => [...tr.children].forEach((td, col) => {
    const result = expected[row] ? Multiply.checkCell(state.rows[row][col], expected[row].values[col]) : { ok: false, message: 'Extra row after all n iterations.' };
    td.classList.remove('ok', 'bad'); td.classList.add(result.ok ? 'ok' : 'bad');
    td.querySelector('textarea').setAttribute('aria-invalid', String(!result.ok));
    td.querySelector('.feedback').textContent = result.ok ? '✓ Correct' : result.message;
    if (result.ok) correctCells++;
  }));
  const difference = state.rows.length - expected.length;
  const all = difference === 0 && correctWidths === names.length && correctCells === expected.length * names.length;
  $('result').hidden = false; $('result').classList.toggle('error', !all);
  $('result').textContent = `${all ? '✓ Everything is correct! ' : 'Review your work. '}${correctWidths}/${names.length} widths correct · ${correctCells}/${expected.length * names.length} cells correct. ${difference === 0 ? `Correct row count: ${expected.length}.` : `${Math.abs(difference)} ${difference > 0 ? 'extra' : 'missing'} rows: expected ${expected.length} = 1 + ${state.n}.`}`;
};
$('showAnswer').onclick = () => {
  const opening = $('solution').hidden;
  $('solution').hidden = !opening; $('showAnswer').textContent = opening ? 'Hide solution' : 'Show solution';
  $('showAnswer').setAttribute('aria-expanded', String(opening));
  if (!opening) return;
  const product = state.mc * state.mult;
  $('product').textContent = `Final PROD = ${Multiply.binary(product, 2 * state.n)}₂ = ${product.toString(state.base)}${state.base === 8 ? '₈' : '₁₀'}. ${state.n} iterations, ${1 + state.n} rows including initialization.`;
  $('answerRows').replaceChildren();
  expectedTrace().forEach((row, index) => {
    const tr = document.createElement('tr');
    row.values.forEach((value, col) => {
      const td = document.createElement('td');
      const note = document.createElement('small');
      note.textContent = col === 0 ? labelRow(index) : col === 1 ? row.label : '\u00a0';
      td.append(note, document.createTextNode(value)); tr.append(td);
    });
    $('answerRows').append(tr);
  });
};
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); $('check').click(); }
});
try {
  const stored = JSON.parse(localStorage.getItem(key));
  if (stored &&
    Array.isArray(stored.rows) && stored.rows.every(row => Array.isArray(row) && row.length === (stored.mode === 'refined' ? 2 : 3) && row.every(x => typeof x === 'string'))) {
    Multiply.trace(stored.n, stored.mc, stored.mult);
    stored.base = stored.base === 8 ? 8 : 10;
    stored.mode = stored.mode === 'refined' ? 'refined' : 'first';
    const columns = stored.mode === 'refined' ? 2 : 3;
    if (stored.tableMode !== 'iteration') {
      stored.rows = stored.rows.filter((_, i) => i % 3 === 0);
      stored.tableMode = 'iteration';
    }
    if (!Array.isArray(stored.widths) || stored.widths.length !== columns || !stored.widths.every(x => typeof x === 'string')) {
      stored.widths = Array(columns).fill('');
    }
    if (!['auto', 'random', ...Array.from({ length: 8 }, (_, i) => String(i + 3))].includes(stored.systemMode)) {
      stored.systemMode = String(stored.n);
    }
    state = stored;
  }
} catch { /* A blocked or old save must not prevent practice. */ }
if (state) render(); else $('new').click();
