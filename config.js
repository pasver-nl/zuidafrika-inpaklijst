// ─────────────────────────────────────────────────────────────────
//  config.js  –  Pas dit bestand aan vóór je de app gebruikt.
//
//  Supabase URL & anon key vind je in:
//    Dashboard → Project Settings → API
//
//  De anon key is bedoeld om publiek te zijn (vergelijk met een
//  public API key). Row Level Security bepaalt wat wel/niet mag.
//  Commit dit bestand gerust naar GitHub – zie README voor uitleg.
// ─────────────────────────────────────────────────────────────────

const CONFIG = {
  // ── Supabase ───────────────────────────────────────────────────
  supabaseUrl:      'https://cbhvfxwkxihpakzuztoj.supabase.co',
  supabaseAnonKey:  'sb_publishable_YYFwz4Uy9JweHJO2Ys5aVA_nbxKxeLW',

  // ── Gezinsleden ────────────────────────────────────────────────
  //  Vervang deze namen met de echte namen van jullie gezin.
  //  Ze verschijnen in de dropdown bij "toegevoegd door" en
  //  "wie verwijdert".
  namen: [
    'Arden',
    'Diede',
    'Minke',
    'Pascal',
    'Ziva'
  ],

  // ── Vakantie-info (optioneel, alleen voor weergave) ────────────
  bestemming:    'Zuid-Afrika',
  vertrekdatum:  new Date('2026-07-25')
};
