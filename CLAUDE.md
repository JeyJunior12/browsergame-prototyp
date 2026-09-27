# Kiezkönig – Browsergame

Deutsches Browsergame im Stil von Pennergame (Pfand sammeln, Schnorren, Training, Kämpfe, Banden, Haustiere …). Eigene Texte, Bilder und Name – keine Pennergame-Inhalte kopieren, nur Spielmechaniken.

## Nutzer
- Antworten auf Deutsch, kurz. Tokens sparen: gezielt lesen, keine Multi-Agent-Setups.
- Fragen **immer mit Auswahlmöglichkeiten** (AskUserQuestion) – der Nutzer will wenig schreiben.
- Nutzer ist kein Entwickler: Schritte für ihn einfach halten, Einstellungen per Screenshot erklären.
- Passwörter/Tokens nie im Chat annehmen; Secrets gehören in GitHub-Secrets.

## Aufbau
- `index.html`: gesamte Oberfläche (HTML/CSS/JS, ~320 KB, sehr lange Zeilen → nur mit Grep suchen, nie komplett lesen). **Zeilenenden CRLF** – beim Schreiben per Script erhalten (`newline=''`), sonst ist jede Zeile im Diff geändert.
- User-Inhalte in innerHTML immer mit `esc()` ausgeben (global im ersten `<script>` definiert).
- Backend: Supabase (Ref `qazpwdyyzfdektlbtxae`), Login `signInWithPassword`/`signUp`. Spiellogik und Balancing liegen in SQL-Funktionen (SECURITY DEFINER), Tabellen haben nur SELECT-Policies.
- Hosting: Vercel (Production = `main`, Preview pro Branch). `.claude/` per `.vercelignore` ausgeschlossen.

## Datenbank
- Ist-Stand (Export vom 25.09.2026): `supabase/schema/` – `functions/*.sql`, `tables.sql`, `policies.txt`, `triggers.sql`, `data/*.json` (Kataloge). Neu exportieren mit `supabase/export.sql`.
- **Änderungen nur als Migration** `supabase/migrations/NNNN_name.sql` (fortlaufend, nie alte ändern).
- **GitHub Action** `.github/workflows/supabase-migrations.yml`: bei Push → Tests gegen frische Postgres-Kopie → bei Erfolg spielt `supabase/deploy/apply.sh` neue Migrationen über die Management API ein (Secret `SUPABASE_ACCESS_TOKEN` in GitHub). Protokoll: `kiez_admin.migrations`. Nutzer hat automatisches Einspielen ausdrücklich gewählt; Session-Modus "Ask permissions" lassen, Push mit Migration braucht seine Bestätigung.
- Lokale Tests: Postgres 16 ist installiert. Server starten:
  `mkdir -p /var/tmp/pgtest && chown postgres /var/tmp/pgtest && su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/tmp/pgtest/data -A trust -U postgres" && su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/pgtest/data -l /var/tmp/pgtest/log -o '-p 55432 -k /var/tmp/pgtest' -w start"`
  Dann `supabase/test/reset.sh` (Schema + Daten + alle Migrationen) und `supabase/test/test_*.sh`. Für jede Migration einen `test_NNNN.sh` anlegen (Muster: `test_0001.sh`, `as_user <uid> "<sql>"`).
- Nach dem Push Lauf prüfen: `curl -sS https://api.github.com/repos/JeyJunior12/browsergame-prototyp/actions/runs?per_page=1`.

## Browser-Tests
- Netzwerk freigegeben (ab neuer Session): `cdn.jsdelivr.net`, `qazpwdyyzfdektlbtxae.supabase.co`, `github.com`, `api.github.com`, `*.vercel.app`.
- Playwright (global, `require($(npm root -g)+'/playwright')`), Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. localhost geht nicht durch den Proxy und Chromium kennt das Proxy-Zertifikat nicht → `context.route('**/*')`: Seite von Fake-Host `https://kiez.test/` aus dem Repo erfüllen, alles andere per `route.fetch()` durchreichen; Node mit `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` starten. RPCs im Test über `window.kiezSupabase.rpc`.
- Testkonto „ClaudeTester“ existiert (live, ohne E-Mail-Bestätigung registriert, Mail-Alias des Nutzers mit `+kieztest`). Passwort nur im Scratchpad der jeweiligen Session – bei neuer Session neues Konto `ClaudeTester2` o. ä. anlegen. Keine echten Spieler angreifen.

## Stand
- Gesamtplan mit allen Pennergame-Funktionen: `ROADMAP.md` (Etappen 1–7).
- Etappe 1+2 erledigt (Migration 0001 live). XSS-Schutz in `index.html` liegt im Branch, **noch nicht in `main`** (braucht PR + Merge durch Nutzer).
- Etappe 3 (Balancing, Migration 0002): `xp` = **Punkte** (UI sagt „Punkte“), Level = `kiez_level(xp)` = 1+√(xp/15) (max. 150, **seit 0016**: Punkte für Level L = 15×(L−1)², Pennergame-artig: schneller Einstieg, Level 150 aktiv ~1,5 Jahre; vorher 1+xp/250), per Trigger `profile_sync_level`, nie herabgestuft. Weiterbildung gibt 10+2×neue Stufe Punkte. Kampf nur Level 80–150 %, 3 Std. Sperre pro Gegner. Versicherung 1 €/Tag → Apotheke halb, halber Verlust. Konzentration: −10 % Trainingszeit, blockiert Tour/Kampf/Verbrechen/Kiezaktionen/Schnorren. Schnorren: nur `beg_at_spot` (6 Plätze nach Sammelgebiet), `beg_for_money` = Platz „strasse“.
- Helfer für neue Funktionen: `kiez_actor()` (Profil sperren, Bann prüfen, Energie auffüllen), `kiez_assert_free(p)` (Knast/Konzentration). Geldgewinne immer bis `cash_capacity` deckeln.
- Admin: Nutzer hat nur einen Account; `is_admin` muss er per SQL setzen (`update profiles set is_admin = true;`) – noch offen.

- Etappe 4–6 (Migrationen 0003–0005) live: Profil/Gästebuch/Freunde/Blockieren/Spendenlink, Plunder, Kronkorken, Wetter, Events, Banden (Ränge, Einladungen, Chat, Protokoll, Kriege), Tierkampf, Wochenwettbewerb, 34 Erfolge. Kampfwerte zentral in `kiez_attack_power`/`kiez_defense_power`.
- Oberfläche dafür in **`kiez-features.js`** (Modul, am Ende von `index.html` geladen): neue Seiten per `addPanel`, Loader pro Seite, Hooks `window.kiezShowView`, `kiezOnProfile`, `kiezOpenProfile(id)`, `kiezGo(view)`. Spielernamen mit Klasse `kiez-player` + `data-id` öffnen das Profil.
- **Neue Tabellen brauchen `grant select … to authenticated`** (Supabase vergibt hier keine Rechte automatisch) – `test_0006.sh` prüft das für jede Tabelle mit Policy.

## Pflicht-Tests vor jedem Push (Lehre aus Runde 2)
- Server: `supabase/test/reset.sh` + alle `test_*.sh`. **`test_9999_rundgang.sh` ruft jede Spielfunktion auf** – neue RPCs dort eintragen (fand z. B. den kaputten `commit_crime`).
- Browser: `test/browser/` (README dort): `crawl.js` (jeder Menüpunkt/Reiter, Erwartung `LEER: 0`), `spielen.js`, `laden.js` (jeder Kaufknopf braucht sichtbare Rückmeldung), `banden.js`. Wie ein Spieler klicken – nicht nur Code aufrufen.
- **Bereiche nie per Position ein-/ausblenden** (`children[3]`), immer per Selektor – andere Skripte verschieben Elemente (`CONTENT_ZONES`, `profileZones`).
- Meldungen erst **nach** dem Neuzeichnen setzen; es gibt doppelte IDs (z. B. `#drinkmsg` in Apotheke/Supermarkt/Fenster) → `kiezDrinkMsg()` oder im Container suchen.
- Nach dem Login lädt die Seite absichtlich neu (`location.reload`) – Tests nutzen `lib.login()`.

- **Testmodus** (für Kampf/Tierkampf/Bandenkrieg per Klick): Migrationen 0010/0011 gaben Testkonten `tester_fast_forward()`, `tester_set_stats()`, `tester_end_wars()` – Balancing bleibt unverändert. 0014 hat ihn samt Testkonten wieder entfernt. Für neue Tests: 0010+0011 als neue Migration erneut anlegen, 4 Testkonten registrieren, `test/browser/kampf.js` und `alles.js` laufen lassen, danach wie 0014 aufräumen.

## Design (Runde 4)
- **`kiez-theme.css`** = Designsystem „Kiez-Papier“, wird als letztes geladen. Farben/Schriften nur über die Tokens in `:root` ändern. Helles Papier für Kopf/Reiter/Knöpfe, dunkles Pergament für Inhalte, Akzente Messing/Rost. Schriften: Bitter (Überschriften), Source Sans 3 (Text), Alfa Slab One (Logo) – Google Fonts.
- Jede Regel hat den Präfix `html body:not(#kz1):not(#kz2)` (Vorrang vor alten `#seite`-Regeln in `index.html`). Neue Regeln genauso schreiben.
- Mindestgrößen: Text 15–16 px, Beschriftungen ≥ 12 px, Knöpfe ≥ 14 px/40 px hoch. Prüfen: Skript sucht Elemente < 13 px (Runde 4: 100 → 10, Rest Großbuchstaben-Labels).
- Bilder nur als **WebP** (84 MB PNG → 10,6 MB). SEO: Titel/Beschreibung/OG/Twitter/JSON-LD (WebSite, VideoGame, FAQPage) im `<head>`, H1 + Infobereich „Was dich im Kiez erwartet“ + FAQ auf der Startseite, `robots.txt`, `sitemap.xml`, `favicon.svg`, `og-image.jpg`, `site.webmanifest`. Domain steht in canonical/OG/Sitemap – bei eigener Domain dort ändern.
- **Bilder (Runde 5, 26.09.2026):** Alle Spielbilder sind eigene Fotos im Stil „Handyfoto Tageslicht, Penner-Alltag“ (Nutzerwunsch: echt wirkend, kein dunkler KI-Look, Hintergründe abwechselnd). Dateien in `bilder/*.webp` (303 Stück), erzeugt lokal mit Forge/RealVisXL über `bilder-neu/erzeugen.py` (+ Liste `bilder-neu/bilder2.py`); einzelnes Bild neu: `python bilder-neu/erzeugen.py <name>`. Zuordnung zur Karte **per Titel in `kiez-bilder.js`** (Tabelle `R`, Seitenköpfe `SZENE`); Foto wird inline mit !important am Vorschaubild gesetzt, weil alte Skripte in `index.html` Sprites inline setzen. Neue Karte mit Bild = Eintrag in `bilder2.py` + Zeile in `R`. Alte `*-sprite-*.webp` werden nicht mehr angezeigt, liegen aber noch im Repo.

## Stand Go-Live
Alle Etappen 1–7 erledigt und in `main` (PR #1, #2, #3). Runde 2: Systemnachrichten, Profilbild, Werbelink, Verkaufen, Kiez-Brett, Namensänderung, Lotto, Essen, Kiez-News, Einstellungen (0008/0009), live auf https://browsergame-prototyp.vercel.app. Admin: BehaarteUhse (0007).
Testkonten wurden nach Runde 3 gelöscht (0014) – bei Bedarf neu anlegen. Neue Arbeit immer auf neuem Stand von `main` beginnen.

## Runde 6 (26.09.2026): Pennergame-Aufbau
- **Sicherung vorher:** Branch `sicherung-2026-09-26` (= `main` vor Runde 6). Zurücksetzen der Oberfläche: `main` auf diesen Stand bringen (PR) oder in Vercel „Instant Rollback“. Migration 0015 fügt nur Neues hinzu und kann bleiben.
- **Migration 0015** (live): Stadtteile (`districts`, Einfluss per Trigger auf `weekly_scores`: Flasche 1, Sieg 20 Punkte → Wochensieger besitzt Viertel, +250 € Bandenkasse, `resolve_districts` lazy in `district_overview`), Plunder-Basar (`market_*`, 5 % Gebühr, Plunder wird beim Einstellen reserviert), Zockerbude (`shell_game` 2,7×, max. 30/Tag; `dice_*` Würfelduell mit Einsatz-Treuhand), Schließfach (`bank_*`, 2 % Gebühr, Grenze 100+50×Level, nicht klaubar), Kiez-Geschichte (`quest_defs`, 17 Kapitel, Werte aus `kiez_stats`), Kiez-Chat (`chat_messages`, 5 s Sperre), Titel (`set_title`), `fight_history`.
- **`kiez_pay(uid, betrag)`**: Auszahlung an Spieler – Tasche bis Geldbehälter voll, Rest ins Schließfach. Für neue Gewinne benutzen statt Geld zu kappen.
- **Menü** (`NAV` in `kiez-features.js`): 7 Bereiche wie Pennergame – Mein Kiez, Aktionen, Stadt, Kampf, Bande, Kommunikation, Highscore; Fotos als Symbole, Unterpunkte klappen auf (Hover/Tippen). `go(view, reiter)` / `window.kiezGoTab` öffnet Seite + Reiter. Altes `.classic-mainnav` ist nur ausgeblendet.
- **Stadtplan** (`#citymap`): gezeichnete Karte mit 6 Stadtteilen (Besitzer farbig) und 17 Orten (`PLACES`: Name, Seite, Reiter, Foto, x, y in 1000×620). Handy: Karte wischbar + Liste „Alle Orte“.
- Tests: `supabase/test/test_0015.sh`, `test/browser/runde6.js` (Klicks), `crawl.js` nutzt das neue Menü und die Kartenorte (177 Wege, LEER 0).
- **Meldungen beim Knopf** (Nutzerwunsch: IMMER beim Fenster der Aktion): `kiez-features.js` merkt den zuletzt gedrückten sichtbaren Knopf; erscheint danach (≤ 9 s) eine `.notice` weiter weg, wird sie in dessen Karte gespiegelt (`.kz-near`), Original `.kz-moved` ausgeblendet. Neu gezeichnete Karten werden über Seite + Titel wiedergefunden. Test: `test/browser/meldungen.js` (Abstand < 200 px).
- **Ideen-Speicher:** `ROADMAP.md` → „Ideen-Speicher“ (37 Ideen A–I + offener Scroll-Fehler). Nutzer will alle umgesetzt haben; vor dem Bauen dort abhaken.
- **Nächste Priorität (Nutzer, Platz 1):** Chat-Leiste unten rechts wie Facebook (ALL-Chat + Privatnachrichten), siehe `ROADMAP.md` → „PLATZ 1“ (128–134).

## ROADMAP-Runde (ab 27.09.2026) – Absprache mit dem Nutzer
- Komplette `ROADMAP.md` abarbeiten, **auch Ideen ohne ⭐** („wirklich alles“).
- Migrationen dürfen **ohne Rückfrage** eingespielt werden, sobald alle Tests grün sind (gilt für diese Runde).
- Nach jeweils ~10 erledigten ROADMAP-Punkten: PR + Merge (live) + kurzer Schnelltest (crawl/Klicktests). Erledigte Punkte in der ROADMAP mit ✅ markieren.
- Reihenfolge: Platz 1 Chat-Leiste → Meldungs-Fehler (69b/e/f/g) → R Waffen/Besitz → M/N Links + Seitenwechsel + Scroll-Fehler → L/U → V/T → S → O → Q → A/J → B–I → K → P → Schlussprüfung.
- S3: Kopfleiste → `HEAD_LINKS` in kiez-features.js (`window.kiezJumpTo(view, tab, sel)` springt zur Karte + `.kz-flash`), Prüfskript `test/browser/kopfleiste.js`. Hintergrund pro Hauptbereich = Bild der NAV-Kategorie in `#kz-bg` (zwei Ebenen, Überblenden). `load()` scrollt nie (3. Parameter von `showView`). Energie-Karten „Abendblätter/Pfand sortieren/…“ liegen unsichtbar in der Übersicht → in S10 wieder einbauen.
- S4: Emojis in Titeln/Werten/Knöpfen ersetzt `deEmoji` (MutationObserver) durch Icons `.kz-ico-lock/.kz-ico-ok` bzw. Wörter; Spielertexte ausgenommen (`EMO_SKIP`). Prüfskript `test/browser/aussehen.js` (Bild/Emoji/Reihe/Schrift/Überlappung, `MOBIL=1`). Felder 44 px = Knöpfe.
- S5 (0019): `beg_overview`, `beg_log`; Stadtteile per `feature_flags` gesperrt (`kiez_feature_on('districts')`, Admin `admin_set_feature`, automatisch ab 50 aktiven Spielern). Reiter Schnorrplätze/Sammelgebiete getrennt.
- S6 (0020): Plunder-Sets (`plunder_sets`, `kiez_plunder_bonus`), 21 Stücke, Saison-Stück, `plunder_overview`, `sell_plunder_duplicates`; Oberfläche mit 4 Reitern, `window.kiezOpenBox(id)`.
- S7 (0021): `kiez_body_tick` in `kiez_actor` (Sauberkeit −1 %/Std., Hunger −4 %/Std., Sucht, Krankheit), Stufen `kiez_clean_tier`, Läden `kiez_shop_price`, `body_status`, `heal_sickness`, `detox`, Waschen 6 Stufen.
- S8/S9 (0022/0023): Seite **Bandenhaus** (9 Reiter): Level/XP (`kiez_gang_xp`), Räume, Wochenaufgaben, Krieg/Waffenruhe/Kapitulation, Überfall, Bündnisse, Forum, Mitglieder/Anstupsen, Boss, Saison, Wappen/Rechte (`kiez_gang_can`). Browsertest mit Attrappe `test/browser/fixtures/bandenhaus.json` (Ausgabe der lokalen DB).
- S10/S11 Server (0024/0025) live: Computer-Gegner, Kiezboss, Tagesaufgaben, Mülltonne, kurze Touren, Tour-Ereignisse, Chancen, Strähne, Blitzaufträge, Sortierspiel, `next_actions`; Login-Serie mit Schutz, Kiez-Zeiten (`kiez_time`), Pfand-Klau, Ticker, Tutorial, `quick_unload_sell`, `welcome_back`. Oberfläche dafür folgt (Entwurf im Scratchpad → neu schreiben, falls verloren).

