/* ═══════════════════════════════════════════════════════════════
   app.js  –  Zuid-Afrika Inpaklijst 2026
   Vanilla JS + Supabase v2 (CDN)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Config-check ───────────────────────────────────────────────
if (typeof CONFIG === 'undefined') {
  document.getElementById('laadscherm').classList.add('verborgen');
  const fout = document.getElementById('verbinding-fout');
  document.getElementById('verbinding-tekst').textContent =
    'config.js kon niet worden geladen. Controleer of het bestand bestaat naast index.html.';
  fout.classList.remove('verborgen');
  throw new Error('CONFIG is niet gedefinieerd – config.js ontbreekt of heeft een syntaxfout.');
}

// ── Supabase-client ────────────────────────────────────────────
const db = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);

// ── State ──────────────────────────────────────────────────────
let alleItems   = [];          // alle items uit de DB
let actieveFilter  = 'alles'; // 'alles' | 'niet-ingepakt' | 'ingepakt'
let teVerwijderenId = null;    // UUID van het item dat verwijderd wordt

// ── DOM-verwijzingen ───────────────────────────────────────────
const $laadscherm      = document.getElementById('laadscherm');
const $hoofd           = document.getElementById('hoofd');
const $verbindingFout  = document.getElementById('verbinding-fout');
const $itemsContainer  = document.getElementById('items-container');
const $prullenbak      = document.getElementById('prullenbak-container');
const $voortgangTekst   = document.getElementById('voortgang-tekst');
const $voortgangPct     = document.getElementById('voortgang-pct');
const $voortgangBalk    = document.querySelector('.voortgang-balk');
const $voortgangVulling = document.getElementById('voortgang-vulling');
const $zichtbareTeller = document.getElementById('zichtbare-teller');
const $headerSub       = document.getElementById('header-sub');

// Modals
const $modalToevoegen       = document.getElementById('modal-toevoegen');
const $formToevoegen        = document.getElementById('form-toevoegen');
const $invoerNaam           = document.getElementById('invoer-naam');
const $invoerAantal         = document.getElementById('invoer-aantal');
const $invoerOpmerking      = document.getElementById('invoer-opmerking');
const $invoerToegevoegdDoor = document.getElementById('invoer-toegevoegd-door');

const $modalVerwijderen       = document.getElementById('modal-verwijderen');
const $verwijderBevestiging   = document.getElementById('verwijder-bevestiging');
const $invoerVerwijderdDoor   = document.getElementById('invoer-verwijderd-door');
const $bevestigVerwijderen    = document.getElementById('bevestig-verwijderen');

// ── Helpers ────────────────────────────────────────────────────
function escHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function dagTot(datum) {
  const nu   = new Date();
  const doel = new Date(datum);
  nu.setHours(0,0,0,0);
  doel.setHours(0,0,0,0);
  return Math.round((doel - nu) / 86400000);
}

function hb(item)  { return Array.isArray(item.ingepakt_handbagage) ? item.ingepakt_handbagage : []; }
function kf(item)  { return Array.isArray(item.ingepakt_koffer)     ? item.ingepakt_koffer     : []; }

function statusKlasse(item) {
  const inHb = new Set(hb(item));
  const inKf = new Set(kf(item));
  // Tel hoeveel gezinsleden in minstens één locatie zijn aangevinkt
  const ingepakt = CONFIG.namen.filter(n => inHb.has(n) || inKf.has(n)).length;
  if (ingepakt === 0)                    return '';              // niemand
  if (ingepakt === CONFIG.namen.length)  return 'status-beide'; // iedereen → groen
  return 'status-deels';                                         // deels → goud
}

function gefilterdeItems() {
  switch (actieveFilter) {
    case 'niet-ingepakt':
      return alleItems.filter(i => hb(i).length === 0 && kf(i).length === 0);
    case 'ingepakt':
      return alleItems.filter(i => hb(i).length > 0  || kf(i).length > 0);
    default:
      return alleItems;
  }
}

// ── UI: toast-meldingen ────────────────────────────────────────
function toonToast(tekst, type = 'succes') {
  const div = document.createElement('div');
  div.className = `toast toast--${type}`;
  div.textContent = tekst;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3200);
}

// ── UI: voortgangsbalk ─────────────────────────────────────────
function updateVoortgang() {
  const totaal   = alleItems.length;
  const ingepakt = alleItems.filter(i => hb(i).length > 0 || kf(i).length > 0).length;
  const pct      = totaal > 0 ? Math.round((ingepakt / totaal) * 100) : 0;

  $voortgangTekst.textContent = `${ingepakt} van ${totaal} items ingepakt`;
  $voortgangPct.textContent   = `${pct}%`;
  $voortgangVulling.style.width = `${pct}%`;

  if ($voortgangBalk) $voortgangBalk.setAttribute('aria-valuenow', pct);
}

// ── UI: countdown in header ────────────────────────────────────
function updateHeader() {
  const dagen = dagTot(CONFIG.vertrekdatum);
  if (isNaN(dagen)) return;

  if (dagen > 0) {
    $headerSub.textContent = `Vertrek 25 juli 2026 · nog ${dagen} dag${dagen === 1 ? '' : 'en'}`;
  } else if (dagen === 0) {
    $headerSub.textContent = 'Vandaag vertrekken we! 🎉';
  } else {
    $headerSub.textContent = 'Vertrek 25 juli 2026';
  }
}

// ── Render: locatiesectie (handbagage of koffer) ───────────────
function maakLocatieSectie(item, veld, emoji, label) {
  const personen = Array.isArray(item[veld]) ? item[veld] : [];
  const chips = CONFIG.namen.map(naam => `
    <label class="persoon-chip ${personen.includes(naam) ? 'aan' : ''}">
      <input type="checkbox"
             data-id="${escHtml(item.id)}"
             data-veld="${veld}"
             data-naam="${escHtml(naam)}"
             ${personen.includes(naam) ? 'checked' : ''}>
      ${escHtml(naam)}
    </label>
  `).join('');

  return `
    <div class="locatie-sectie">
      <div class="locatie-kop">
        <span class="locatie-titel">${emoji} ${label}</span>
        <div class="locatie-snelknoppen">
          <button class="snel-knop" data-id="${escHtml(item.id)}"
                  data-veld="${veld}" data-actie="allen">Iedereen</button>
          <button class="snel-knop" data-id="${escHtml(item.id)}"
                  data-veld="${veld}" data-actie="geen">Niemand</button>
        </div>
      </div>
      <div class="persoon-chips">${chips}</div>
    </div>
  `;
}

// ── Render: itemkaart ──────────────────────────────────────────
function maakItemKaart(item) {
  const div = document.createElement('div');
  div.className = `item-kaart ${statusKlasse(item)}`;
  div.dataset.id = item.id;

  const datum = new Date(item.toegevoegd_op).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'short'
  });

  div.innerHTML = `
    <div class="kaart-kop">
      <span class="item-naam">${escHtml(item.naam)}</span>
      <div class="kaart-kop-rechts">
        <span class="item-aantal">${escHtml(item.aantal)}×</span>
        <button class="verwijder-knop" data-id="${escHtml(item.id)}"
                aria-label="Verwijder ${escHtml(item.naam)}" title="Verwijderen">
          🗑️
        </button>
      </div>
    </div>
    ${item.opmerking ? `<p class="item-opmerking">${escHtml(item.opmerking)}</p>` : ''}
    <p class="item-meta">${escHtml(item.toegevoegd_door)} · ${datum}</p>
    ${maakLocatieSectie(item, 'ingepakt_handbagage', '✈️', 'Handbagage')}
    ${maakLocatieSectie(item, 'ingepakt_koffer',     '🧳', 'Koffer')}
  `;

  return div;
}

// ── Render: itemlijst ──────────────────────────────────────────
function renderItems() {
  const items = gefilterdeItems();
  $itemsContainer.innerHTML = '';

  if (items.length === 0) {
    const leeg = document.createElement('div');
    leeg.className = 'leeg-bericht';
    if (actieveFilter === 'alles') {
      leeg.innerHTML = '<span class="leeg-bericht-groot">📦</span>Nog geen items.<br>Tik op <strong>+</strong> om te beginnen!';
    } else if (actieveFilter === 'niet-ingepakt') {
      leeg.innerHTML = '<span class="leeg-bericht-groot">✅</span>Alles is ingepakt!';
    } else {
      leeg.innerHTML = '<span class="leeg-bericht-groot">📋</span>Nog niets ingepakt.';
    }
    $itemsContainer.appendChild(leeg);
  } else {
    items.forEach(item => $itemsContainer.appendChild(maakItemKaart(item)));
  }

  const n = items.length;
  $zichtbareTeller.textContent = n === 1 ? '1 item' : `${n} items`;
}

// ── Render: prullenbak ─────────────────────────────────────────
function renderPrullenbak(items) {
  $prullenbak.innerHTML = '';

  if (items.length === 0) {
    const leeg = document.createElement('div');
    leeg.className = 'leeg-bericht';
    leeg.innerHTML = '<span class="leeg-bericht-groot">🗑️</span>Prullenbak is leeg.';
    $prullenbak.appendChild(leeg);
    return;
  }

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item-kaart verwijderd-kaart';

    const datumToeg = new Date(item.toegevoegd_op).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const datumVerw = new Date(item.verwijderd_op).toLocaleString('nl-NL', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    div.innerHTML = `
      <div class="kaart-kop">
        <span class="item-naam">${escHtml(item.naam)}</span>
        <span class="item-aantal">${escHtml(item.aantal)}×</span>
      </div>
      ${item.opmerking ? `<p class="item-opmerking">${escHtml(item.opmerking)}</p>` : ''}
      <p class="prullenbak-meta">
        Toegevoegd door <strong>${escHtml(item.toegevoegd_door)}</strong> op ${datumToeg}<br>
        Verwijderd door <strong>${escHtml(item.verwijderd_door)}</strong> op ${datumVerw}
      </p>
    `;

    $prullenbak.appendChild(div);
  });
}

// ── Database: items ophalen ────────────────────────────────────
async function laadItems() {
  const { data, error } = await db
    .from('items')
    .select('*')
    .order('toegevoegd_op', { ascending: false });

  if (error) throw error;

  alleItems = data ?? [];
  renderItems();
  updateVoortgang();
}

// ── Database: prullenbak ophalen ───────────────────────────────
async function laadPrullenbak() {
  const { data, error } = await db
    .from('verwijderde_items')
    .select('*')
    .order('verwijderd_op', { ascending: false });

  if (error) {
    toonToast('Kon prullenbak niet laden.', 'fout');
    return;
  }

  renderPrullenbak(data ?? []);
}

// ── Database: item toevoegen ───────────────────────────────────
async function voegItemToe(naam, aantal, toegevoegdDoor, opmerking) {
  const { error } = await db.from('items').insert({
    naam,
    aantal,
    toegevoegd_door: toegevoegdDoor,
    opmerking:       opmerking || null
  });

  if (error) throw error;
  await laadItems();
}

// ── DB-helper: pas array lokaal + in DOM aan, schrijf naar DB ──
async function schrijfLocatieArray(id, veld, nieuweArray) {
  const item = alleItems.find(i => i.id === id);
  if (item) {
    item[veld] = nieuweArray;
    const kaart = $itemsContainer.querySelector(`.item-kaart[data-id="${id}"]`);
    if (kaart) {
      kaart.className = `item-kaart ${statusKlasse(item)}`;
      kaart.querySelectorAll(`.persoon-chip input[data-veld="${veld}"]`).forEach(inp => {
        const aan = nieuweArray.includes(inp.dataset.naam);
        inp.checked = aan;
        inp.closest('.persoon-chip')?.classList.toggle('aan', aan);
      });
    }
    updateVoortgang();
  }

  const { error } = await db
    .from('items')
    .update({ [veld]: nieuweArray })
    .eq('id', id);

  if (error) {
    toonToast('Kon status niet opslaan.', 'fout');
    await laadItems();
  }
}

// ── Database: één persoon toevoegen/verwijderen uit een locatie ─
async function updateIngepakt(id, veld, naam, checked) {
  const item = alleItems.find(i => i.id === id);
  if (!item) return;

  const huidig = Array.isArray(item[veld]) ? [...item[veld]] : [];
  if (checked && !huidig.includes(naam)) {
    huidig.push(naam);
  } else if (!checked) {
    const idx = huidig.indexOf(naam);
    if (idx > -1) huidig.splice(idx, 1);
  }

  await schrijfLocatieArray(id, veld, huidig);
}

// ── Database: iedereen/niemand in één klik ─────────────────────
async function zetAllen(id, veld, actie) {
  const nieuweArray = actie === 'allen' ? [...CONFIG.namen] : [];
  await schrijfLocatieArray(id, veld, nieuweArray);
}

// ── Database: item verwijderen → prullenbak ────────────────────
async function verwijderItem(id, verwijderdDoor) {
  const item = alleItems.find(i => i.id === id);
  if (!item) throw new Error('Item niet gevonden in lokale lijst');

  // Kopieer naar verwijderde_items (zelfde UUID bewaren)
  const { error: kopieErr } = await db.from('verwijderde_items').insert({
    id:                  item.id,
    naam:                item.naam,
    aantal:              item.aantal,
    toegevoegd_door:     item.toegevoegd_door,
    toegevoegd_op:       item.toegevoegd_op,
    ingepakt_handbagage: item.ingepakt_handbagage,
    ingepakt_koffer:     item.ingepakt_koffer,
    opmerking:           item.opmerking,
    verwijderd_door:     verwijderdDoor
  });
  if (kopieErr) throw kopieErr;

  // Verwijder uit items
  const { error: verwijderErr } = await db.from('items').delete().eq('id', id);
  if (verwijderErr) throw verwijderErr;

  await laadItems();
}

// ── Realtime ───────────────────────────────────────────────────
function setupRealtime() {
  db.channel('items-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'items' },
      () => laadItems()
    )
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Realtime kon niet verbinden – changes van andere apparaten worden niet live getoond.');
      }
    });
}

// ── Modal-helpers ──────────────────────────────────────────────
function openModal(modal)  { modal.classList.remove('verborgen'); }
function sluitModal(modal) { modal.classList.add('verborgen'); }

function openToevoegModal() {
  $formToevoegen.reset();
  $invoerAantal.value = 1;
  openModal($modalToevoegen);
  setTimeout(() => $invoerNaam.focus(), 60);
}

function openVerwijderModal(id) {
  const item = alleItems.find(i => i.id === id);
  if (!item) return;
  teVerwijderenId = id;
  $verwijderBevestiging.textContent =
    `Weet je zeker dat je "${item.naam}" wilt verwijderen? Het item wordt naar de prullenbak verplaatst.`;
  $invoerVerwijderdDoor.value = '';
  openModal($modalVerwijderen);
}

// ── Namen invullen in dropdowns ────────────────────────────────
function vulNamenIn() {
  const selects = [$invoerToegevoegdDoor, $invoerVerwijderdDoor];
  CONFIG.namen.forEach(naam => {
    selects.forEach(sel => {
      const opt = document.createElement('option');
      opt.value = naam;
      opt.textContent = naam;
      sel.appendChild(opt);
    });
  });
}

// ── Event listeners ────────────────────────────────────────────
function koppelEvents() {

  // Tabbladen
  document.querySelectorAll('.tab-knop').forEach(knop => {
    knop.addEventListener('click', () => {
      const tab = knop.dataset.tab;
      document.querySelectorAll('.tab-knop').forEach(k => k.classList.remove('actief'));
      knop.classList.add('actief');
      document.querySelectorAll('.tab-inhoud').forEach(t => t.classList.add('verborgen'));
      document.getElementById(`tab-${tab}`).classList.remove('verborgen');
      if (tab === 'prullenbak') laadPrullenbak();
    });
  });

  // Filters
  document.querySelectorAll('.filter-knop').forEach(knop => {
    knop.addEventListener('click', () => {
      actieveFilter = knop.dataset.filter;
      document.querySelectorAll('.filter-knop').forEach(k => k.classList.remove('actief'));
      knop.classList.add('actief');
      renderItems();
    });
  });

  // FAB
  document.getElementById('fab-toevoegen').addEventListener('click', openToevoegModal);

  // Modal sluiten via backdrop
  $modalToevoegen.querySelector('.modal-achtergrond')
    .addEventListener('click', () => sluitModal($modalToevoegen));
  $modalVerwijderen.querySelector('.modal-achtergrond')
    .addEventListener('click', () => sluitModal($modalVerwijderen));

  // Annuleer-knoppen
  document.getElementById('annuleer-toevoegen')
    .addEventListener('click', () => sluitModal($modalToevoegen));
  document.getElementById('annuleer-verwijderen')
    .addEventListener('click', () => sluitModal($modalVerwijderen));

  // Formulier: item toevoegen
  $formToevoegen.addEventListener('submit', async e => {
    e.preventDefault();
    const naam          = $invoerNaam.value.trim();
    const aantal        = parseInt($invoerAantal.value, 10) || 1;
    const toegevoegdDoor = $invoerToegevoegdDoor.value;
    const opmerking     = $invoerOpmerking.value.trim();

    if (!naam || !toegevoegdDoor) {
      toonToast('Vul naam en "wie voegt toe" in.', 'fout');
      return;
    }

    const submitKnop = $formToevoegen.querySelector('[type="submit"]');
    submitKnop.disabled = true;
    submitKnop.textContent = 'Bezig…';

    try {
      await voegItemToe(naam, aantal, toegevoegdDoor, opmerking);
      sluitModal($modalToevoegen);
      toonToast(`"${naam}" toegevoegd! 📦`);
    } catch (err) {
      console.error(err);
      toonToast('Kon item niet toevoegen. Probeer opnieuw.', 'fout');
    } finally {
      submitKnop.disabled = false;
      submitKnop.textContent = 'Toevoegen';
    }
  });

  // Knop: bevestig verwijderen
  $bevestigVerwijderen.addEventListener('click', async () => {
    const verwijderdDoor = $invoerVerwijderdDoor.value;
    if (!verwijderdDoor) {
      toonToast('Selecteer wie dit verwijdert.', 'fout');
      return;
    }

    $bevestigVerwijderen.disabled = true;
    $bevestigVerwijderen.textContent = 'Bezig…';

    try {
      await verwijderItem(teVerwijderenId, verwijderdDoor);
      sluitModal($modalVerwijderen);
      toonToast('Item naar prullenbak verplaatst.');
    } catch (err) {
      console.error(err);
      toonToast('Kon item niet verwijderen.', 'fout');
    } finally {
      $bevestigVerwijderen.disabled = false;
      $bevestigVerwijderen.textContent = 'Verwijderen';
      teVerwijderenId = null;
    }
  });

  // Event-delegatie op itemscontainer
  $itemsContainer.addEventListener('change', async e => {
    const inp = e.target;
    if (inp.type === 'checkbox' && inp.dataset.id && inp.dataset.veld && inp.dataset.naam) {
      await updateIngepakt(inp.dataset.id, inp.dataset.veld, inp.dataset.naam, inp.checked);
    }
  });

  $itemsContainer.addEventListener('click', async e => {
    const snelKnop = e.target.closest('.snel-knop');
    if (snelKnop) {
      await zetAllen(snelKnop.dataset.id, snelKnop.dataset.veld, snelKnop.dataset.actie);
      return;
    }
    const verwijderKnop = e.target.closest('.verwijder-knop');
    if (verwijderKnop) openVerwijderModal(verwijderKnop.dataset.id);
  });

  // Escape sluit open modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      sluitModal($modalToevoegen);
      sluitModal($modalVerwijderen);
    }
  });
}

// ── Initialisatie ──────────────────────────────────────────────
async function init() {
  updateHeader();
  vulNamenIn();
  koppelEvents();

  try {
    await laadItems();
    setupRealtime();

    $laadscherm.classList.add('verborgen');
    $hoofd.classList.remove('verborgen');
  } catch (err) {
    console.error('Initialisatiefout:', err);
    $laadscherm.classList.add('verborgen');

    let tekst = 'Geen verbinding met de database. Controleer je internet en herlaad de pagina.';
    if (CONFIG.supabaseUrl.includes('JOUW_PROJECT_ID')) {
      tekst = 'config.js is nog niet ingesteld. Vul je Supabase URL en anon key in.';
    }
    document.getElementById('verbinding-tekst').textContent = tekst;
    $verbindingFout.classList.remove('verborgen');
  }
}

init();
