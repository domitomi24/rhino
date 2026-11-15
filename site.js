const menu = document.querySelector('.menu');
const nav = document.querySelector('nav');
function toggleMenu(open) {
  nav.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
}
menu.addEventListener('click', () => toggleMenu(!nav.classList.contains('open')));
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => toggleMenu(false)));

const form = document.querySelector('#vehicle');
document.querySelectorAll('[data-service]').forEach(button => {
  button.addEventListener('click', () => {
    form.elements.dienst.value = button.dataset.service;
    document.querySelector('#intake').scrollIntoView();
    form.querySelector('fieldset:not([disabled]) [name=merk]')?.focus({preventScroll: true});
  });
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const summary = [
    'RHINO ECU TUNING — Voertuigintake', '',
    `Merk: ${data.get('merk').trim()}`,
    `Model: ${data.get('model').trim()}`,
    `Bouwjaar: ${data.get('jaar')}`,
    `Motor / vermogen: ${data.get('motor').trim()}`,
    ...(getSourceNames() ? [`Alientech-bron: ${getSourceNames()}`] : []),
    `Gewenste dienst: ${data.get('dienst')}`, '',
    'Modificaties of rijdoel:', data.get('extra').trim() || '—'
  ].join('\n');
  const url = URL.createObjectURL(new Blob([summary], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rhino-ecu-tuning-intake.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  form.querySelector('.status').textContent = 'Je intake is klaar om zelf door te sturen.';
});

const catalogPicker = document.querySelector('#catalog-picker');
const manualPicker = document.querySelector('#manual-picker');
const modeButton = document.querySelector('#vehicle-mode');
const brand = document.querySelector('#catalog-brand');
const model = document.querySelector('#catalog-model');
const year = document.querySelector('#catalog-year');
const engine = document.querySelector('#catalog-engine');
const match = document.querySelector('#catalog-match');
const performancePanel = document.querySelector('#performance');
const performanceStatus = document.querySelector('#performance-status');
const formatValue = new Intl.NumberFormat('nl-BE', {maximumFractionDigits: 1});
const performanceRows = [['pk', 1], ['Nm', 2]].map(([unit, index]) => {
  const id = unit.toLowerCase();
  return {
    unit,
    index,
    input: document.querySelector(`#tuned-${id}`),
    stock: document.querySelector(`#stock-${id}`),
    gain: document.querySelector(`#gain-${id}`)
  };
});
const sorter = new Intl.Collator('nl', { numeric: true });
let vehicles;

function setOptions(select, placeholder, choices = []) {
  select.replaceChildren(new Option(placeholder, ''), ...choices.map(value => new Option(value, value)));
  select.disabled = choices.length === 0;
}

function currentEngines() {
  return vehicles?.[brand.value]?.[model.value]?.[year.value];
}

function selectedVariant() {
  return catalogPicker.disabled || !engine.value ? undefined : currentEngines()?.[engine.value];
}

function getSourceNames() {
  const flags = selectedVariant()?.[0] ?? 0;
  return [
    ...(flags & 1 ? ['KESS3-lijst (01/2024)'] : []),
    ...(flags & 2 ? ['Powergate3-lijst (03/2026)'] : [])
  ].join(' en ');
}

function updatePerformance() {
  const variant = selectedVariant();
  const differences = [];
  performancePanel.hidden = !variant;
  for (const row of performanceRows) {
    const original = variant?.[row.index];
    const value = row.input.value.trim();
    const measured = /^\d+(?:[.,]\d)?$/.test(value) ? Number(value.replace(',', '.')) : 0;
    row.stock.textContent = original ? `${formatValue.format(original)} ${row.unit}` : '—';
    const difference = original && measured > 0 ? measured - original : null;
    row.gain.textContent = difference === null ? '—' :
      `${difference > 0 ? '+' : ''}${formatValue.format(difference)} ${row.unit}`;
    if (difference !== null) differences.push(row.gain.textContent);
  }
  performanceStatus.textContent = differences.length ? `Verschil: ${differences.join(', ')}.` : '';
}

for (const {input} of performanceRows) input.addEventListener('input', updatePerformance);

function updateMatch() {
  for (const {input} of performanceRows) input.value = '';
  updatePerformance();
  const sources = getSourceNames();
  match.hidden = !sources;
  match.textContent = sources ? `Vermeld in de ${sources}. De exacte ECU en softwareversie bepalen de compatibiliteit.` : '';
}

function updateEngines() {
  setOptions(engine, year.value ? 'Kies een motorvariant' : 'Kies eerst een bouwjaar',
    Object.keys(currentEngines() ?? {}).sort(sorter.compare));
  updateMatch();
}

function updateYears() {
  const years = Object.keys(vehicles?.[brand.value]?.[model.value] ?? {});
  setOptions(year, model.value ? 'Kies een bouwjaar' : 'Kies eerst een model', years.sort((a, b) => b - a));
  updateEngines();
}

brand.addEventListener('change', () => {
  setOptions(model, brand.value ? 'Kies een model' : 'Kies eerst een merk',
    Object.keys(vehicles?.[brand.value] ?? {}).sort(sorter.compare));
  updateYears();
});
model.addEventListener('change', updateYears);
year.addEventListener('change', updateEngines);
engine.addEventListener('change', updateMatch);

function setManual(manual) {
  catalogPicker.hidden = manual;
  catalogPicker.disabled = manual || !vehicles;
  manualPicker.hidden = !manual;
  manualPicker.disabled = !manual;
  modeButton.textContent = manual ? 'Kies uit de Alientech-lijst' : 'Mijn auto staat er niet bij';
  updateMatch();
}

modeButton.addEventListener('click', () => {
  setManual(manualPicker.hidden);
  form.querySelector('fieldset:not([disabled]) [name=merk]')?.focus();
});

form.addEventListener('submit', event => {
  if (catalogPicker.disabled && manualPicker.disabled) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setManual(true);
    manualPicker.querySelector('[name=merk]').focus();
  }
}, {capture: true});

fetch('vehicles-performance.json').then(response => {
  if (!response.ok) throw new Error('Voertuiglijst onbeschikbaar');
  return response.json();
}).then(data => {
  vehicles = data;
  setOptions(brand, 'Kies een merk', Object.keys(vehicles).sort(sorter.compare));
  if (manualPicker.hidden) setManual(false);
}).catch(() => {
  setManual(true);
  modeButton.hidden = true;
  document.querySelector('#catalog-error').hidden = false;
});

const cookieNotice = document.querySelector('#cookie-notice');
const cookieReopen = document.querySelector('#cookie-reopen');
const cookieStorageKey = 'rhino-cookie-notice-v1';
let openedFromFooter = false;

function showCookieNotice() {
  cookieNotice.hidden = false;
}

function hasDismissedCookieNotice() {
  try {
    return localStorage.getItem(cookieStorageKey) === 'dismissed';
  } catch {
    return false;
  }
}

cookieReopen.hidden = false;
if (!hasDismissedCookieNotice()) showCookieNotice();

cookieReopen.addEventListener('click', () => {
  openedFromFooter = true;
  showCookieNotice();
  document.querySelector('#cookie-title').focus();
});

document.querySelector('#cookie-dismiss').addEventListener('click', () => {
  try {
    localStorage.setItem(cookieStorageKey, 'dismissed');
  } catch {
    // The banner can still be closed when browser storage is unavailable.
  }
  cookieNotice.hidden = true;
  if (openedFromFooter) cookieReopen.focus();
  openedFromFooter = false;
});
