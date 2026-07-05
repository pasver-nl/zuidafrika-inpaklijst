# 🌍 Zuid-Afrika Inpaklijst 2026

Gedeelde familie-inpaklijst voor de vakantie naar Zuid-Afrika (25 juli 2026).
Gebouwd als statische web-app: vanilla HTML/CSS/JS + Supabase als live database.

---

## Wat doet de app?

| Functie | Details |
|---|---|
| **Gedeelde lijst** | Via Supabase Realtime zichtbaar op alle apparaten tegelijk |
| **Item toevoegen** | Naam, aantal, opmerking, en wie toevoegt (dropdown) |
| **Checkboxes** | Per item twee onafhankelijke vinkjes: ✈️ Handbagage en 🧳 Koffer |
| **Snel instellen** | Dropdown: Niets / Handbagage / Koffer / Beide – handig op mobiel |
| **Voortgang** | Bovenaan: "X van Y items ingepakt" + voortgangsbalk |
| **Filteren** | Alles · Nog te doen · Ingepakt |
| **Prullenbak** | Verwijderde items bewaard met naam verwijderaar + tijdstip |
| **Countdown** | Header toont het aantal dagen tot vertrek |

**Definitie "ingepakt":** een item telt mee zodra minimaal één locatie (Handbagage of Koffer) is aangevinkt. De redenatie: sommige items gaan alleen in handbagage (paspoort, medicijnen), andere alleen in de koffer. Een bewuste keuze = ingepakt.

---

## Eerste keer instellen

### Stap 1 – Supabase-database aanmaken

1. Maak gratis een account op [supabase.com](https://supabase.com)
2. Maak een nieuw project aan (kies een wachtwoord dat je ergens bewaart)
3. Ga naar **SQL Editor → New query**
4. Plak de inhoud van `supabase-setup.sql` en klik **Run**

#### Realtime inschakelen

Ga naar **Database → Replication → supabase_realtime** en zet de tabel **items** op **aan**.
Of voer dit commando uit in de SQL Editor (staat ook al in het SQL-bestand):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE items;
```

### Stap 2 – `config.js` aanpassen

Open `config.js` en vul in:

```js
const CONFIG = {
  supabaseUrl:     'https://JOUW_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'JOUW_ANON_KEY',
  namen: ['Pascal', 'Naam2', 'Naam3', 'Naam4', 'Naam5'],
  ...
};
```

Je vindt de URL en anon key in Supabase onder **Project Settings → API**.

> **Waarom staat `config.js` niet in `.gitignore`?**
> De **anon key** (anonymous key) is in Supabase bewust een publieke key.
> Hij staat altijd zichtbaar in de browser (in de broncode of DevTools).
> Row Level Security (RLS) bepaalt wat anonieme gebruikers mogen doen – in
> dit geval lezen en schrijven. Zolang je maar nooit de **service_role key**
> publiceert, is er geen veiligheidsprobleem. Commit `config.js` dus gewoon.

---

## Lokaal testen

De app laadt Supabase via CDN, dus je hebt een lokale HTTP-server nodig
(direct openen via `file://` werkt niet vanwege CORS).

```bash
# Python (geen installatie nodig)
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code: installeer de extensie "Live Server" en klik "Go Live"
```

Open dan [http://localhost:8080](http://localhost:8080) in je browser.

---

## Publiceren op GitHub Pages

1. Push alle bestanden naar een **publieke** GitHub-repository
   (of private als je GitHub Pro hebt)
2. Ga naar **Settings → Pages**
3. Kies bij **Source**: _Deploy from a branch_
4. Selecteer branch **main**, map **/ (root)**
5. Klik **Save**

Na ~1 minuut is de app live op:
`https://JOUW_GEBRUIKERSNAAM.github.io/REPO_NAAM/`

Deel die link met je gezinsleden – iedereen kan meteen inpakken.

---

## Seed-script: items in bulk importeren

Met `scripts/seed.mjs` importeer je een JSON-bestand in één keer.

### Installatie (eenmalig, alleen lokaal)

```bash
npm install @supabase/supabase-js
```

### JSON-formaat

Maak een bestand aan, bijv. `items.json`:

```json
{
  "items": [
    {
      "naam": "Paspoort",
      "aantal": 5,
      "toegevoegd_door": "Pascal",
      "toegevoegd_op": "2026-01-01T10:00:00Z",
      "ingepakt": { "handbagage": false, "koffer": false },
      "opmerking": "Controleer verloopdatum!"
    },
    {
      "naam": "Zonnebrandcrème SPF50",
      "aantal": 3,
      "toegevoegd_door": "Pascal",
      "ingepakt": { "handbagage": false, "koffer": false },
      "opmerking": ""
    }
  ]
}
```

Velden `toegevoegd_op` en `opmerking` zijn optioneel.

### Uitvoeren

```bash
SUPABASE_URL=https://jouw-project.supabase.co \
SUPABASE_KEY=jouw_anon_key \
node scripts/seed.mjs items.json
```

Het script print welke items zijn geïmporteerd (met UUID).
Je kunt het meerdere keren draaien; elke keer worden nieuwe rows toegevoegd.

---

## Bestandsstructuur

```
zuidafrika-inpaklijst/
├── index.html            Hoofd HTML
├── style.css             Stijlen (Zuid-Afrika thema, mobile-first)
├── app.js                Applicatielogica
├── config.js             ← Pas dit aan!  Supabase URL, key en namen
├── supabase-setup.sql    SQL om eenmalig in Supabase te draaien
├── scripts/
│   └── seed.mjs          Bulk-import script (alleen lokaal)
└── README.md             Dit bestand
```

---

## Tips

- **Meerdere apparaten?** Deel gewoon de GitHub Pages URL – geen account nodig.
- **Offline?** De app toont een duidelijke foutmelding als Supabase niet bereikbaar is.
- **Namen wijzigen?** Pas het `namen`-array in `config.js` aan en herlaad.
- **Verkeerd item verwijderd?** Zie de Prullenbak-tab – items staan daar met alle info.
