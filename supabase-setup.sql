-- ═══════════════════════════════════════════════════════════════
--  Zuid-Afrika Inpaklijst – Supabase database setup
--  Voer dit eenmalig uit in de Supabase SQL Editor
--  (Dashboard → SQL Editor → New query → Run)
--
--  ingepakt_handbagage / ingepakt_koffer zijn TEXT[]:
--  een array van namen, bijv. '{"Pascal","Arden"}'
--  Leeg array = niemand heeft het ingepakt.
-- ═══════════════════════════════════════════════════════════════

-- ── Tabel 1: items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  naam                TEXT        NOT NULL,
  aantal              INTEGER     NOT NULL DEFAULT 1,
  toegevoegd_door     TEXT        NOT NULL,
  toegevoegd_op       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingepakt_handbagage TEXT[]      NOT NULL DEFAULT '{}',
  ingepakt_koffer     TEXT[]      NOT NULL DEFAULT '{}',
  opmerking           TEXT
);

-- ── Tabel 2: verwijderde_items ─────────────────────────────────
CREATE TABLE IF NOT EXISTS verwijderde_items (
  id                  UUID        PRIMARY KEY,
  naam                TEXT        NOT NULL,
  aantal              INTEGER     NOT NULL DEFAULT 1,
  toegevoegd_door     TEXT        NOT NULL,
  toegevoegd_op       TIMESTAMPTZ NOT NULL,
  ingepakt_handbagage TEXT[]      NOT NULL DEFAULT '{}',
  ingepakt_koffer     TEXT[]      NOT NULL DEFAULT '{}',
  opmerking           TEXT,
  verwijderd_door     TEXT        NOT NULL,
  verwijderd_op       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ─────────────────────────────────────────
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE verwijderde_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gezin – alles toegestaan" ON items
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Gezin – alles toegestaan" ON verwijderde_items
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Realtime ───────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE items;


-- ═══════════════════════════════════════════════════════════════
--  MIGRATIE – alleen uitvoeren als je de tabellen al had aangemaakt
--  met de oude boolean-kolommen. Sla dit over bij een verse setup.
-- ═══════════════════════════════════════════════════════════════

-- ALTER TABLE items
--   DROP COLUMN IF EXISTS ingepakt_handbagage,
--   DROP COLUMN IF EXISTS ingepakt_koffer;
-- ALTER TABLE items
--   ADD COLUMN IF NOT EXISTS ingepakt_handbagage TEXT[] NOT NULL DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS ingepakt_koffer     TEXT[] NOT NULL DEFAULT '{}';
--
-- ALTER TABLE verwijderde_items
--   DROP COLUMN IF EXISTS ingepakt_handbagage,
--   DROP COLUMN IF EXISTS ingepakt_koffer;
-- ALTER TABLE verwijderde_items
--   ADD COLUMN IF NOT EXISTS ingepakt_handbagage TEXT[] NOT NULL DEFAULT '{}',
--   ADD COLUMN IF NOT EXISTS ingepakt_koffer     TEXT[] NOT NULL DEFAULT '{}';
