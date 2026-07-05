#!/usr/bin/env node
/**
 * scripts/seed.mjs
 * ──────────────────────────────────────────────────────────────
 * Importeer items in bulk vanuit een JSON-bestand naar Supabase.
 * Gebruik dit script lokaal; het hoeft NIET naar productie.
 *
 * Gebruik:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_KEY=jouw_anon_key \
 *   node scripts/seed.mjs [pad/naar/items.json]
 *
 * Als je geen pad opgeeft, wordt gezocht naar items.json in de
 * root van het project (één map boven scripts/).
 *
 * JSON-formaat (zie ook README.md):
 *   {
 *     "items": [
 *       {
 *         "naam": "Paspoort",
 *         "aantal": 5,
 *         "toegevoegd_door": "Pascal",
 *         "toegevoegd_op": "2026-01-01T12:00:00Z",   // optioneel
 *         "ingepakt": { "handbagage": false, "koffer": false },
 *         "opmerking": "Controleer verloopdatum!"    // optioneel
 *       }
 *     ]
 *   }
 * ──────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync }  from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// ── Omgevingsvariabelen ────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`
❌  SUPABASE_URL en/of SUPABASE_KEY niet ingesteld.

Stel ze in als omgevingsvariabelen:

  SUPABASE_URL=https://jouw-project.supabase.co \\
  SUPABASE_KEY=jouw_anon_key \\
  node scripts/seed.mjs items.json
`);
  process.exit(1);
}

// ── Supabase-client ────────────────────────────────────────────
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── JSON-bestand lezen ─────────────────────────────────────────
const __dir  = dirname(fileURLToPath(import.meta.url));
const padArg = process.argv[2];
const jsonPad = padArg
  ? resolve(process.cwd(), padArg)
  : join(__dir, '..', 'items.json');

let invoer;
try {
  invoer = JSON.parse(readFileSync(jsonPad, 'utf8'));
} catch (err) {
  console.error(`❌  Kon "${jsonPad}" niet lezen:\n   ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(invoer?.items) || invoer.items.length === 0) {
  console.error('❌  Geen items gevonden in het JSON-bestand (verwacht: { "items": [...] })');
  process.exit(1);
}

// ── Items mappen naar DB-formaat ───────────────────────────────
const nu = new Date().toISOString();

const rijen = invoer.items.map((item, i) => {
  if (!item.naam) {
    console.warn(`⚠️   Item #${i + 1} heeft geen naam – overgeslagen.`);
    return null;
  }
  return {
    naam:                item.naam,
    aantal:              Number(item.aantal) || 1,
    toegevoegd_door:     item.toegevoegd_door || 'Import',
    toegevoegd_op:       item.toegevoegd_op  || nu,
    ingepakt_handbagage: item.ingepakt?.handbagage ?? false,
    ingepakt_koffer:     item.ingepakt?.koffer     ?? false,
    opmerking:           item.opmerking || null
  };
}).filter(Boolean);

if (rijen.length === 0) {
  console.error('❌  Geen geldige items om te importeren.');
  process.exit(1);
}

console.log(`\n📦  ${rijen.length} item(s) gevonden in "${jsonPad}"`);
console.log('    Bezig met importeren naar Supabase…\n');

// ── Importeren ─────────────────────────────────────────────────
const { data, error } = await db
  .from('items')
  .insert(rijen)
  .select('id, naam');

if (error) {
  console.error('❌  Fout bij importeren:\n   ', error.message);
  if (error.details) console.error('   ', error.details);
  process.exit(1);
}

console.log(`✅  ${data.length} item(s) succesvol geïmporteerd:\n`);
data.forEach(r => console.log(`    · ${r.naam}  (${r.id})`));
console.log();
