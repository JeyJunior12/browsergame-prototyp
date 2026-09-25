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
- Etappe 3 (Balancing, Migration 0002): `xp` = **Punkte** (UI sagt „Punkte“), Level = `kiez_level(xp)` = 1+xp/250 (max. 150), per Trigger `profile_sync_level`, nie herabgestuft. Weiterbildung gibt 10+2×neue Stufe Punkte. Kampf nur Level 80–150 %, 3 Std. Sperre pro Gegner. Versicherung 1 €/Tag → Apotheke halb, halber Verlust. Konzentration: −10 % Trainingszeit, blockiert Tour/Kampf/Verbrechen/Kiezaktionen/Schnorren. Schnorren: nur `beg_at_spot` (6 Plätze nach Sammelgebiet), `beg_for_money` = Platz „strasse“.
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

## Stand Go-Live
Alle Etappen 1–7 erledigt und in `main` (PR #1, #2, #3). Runde 2: Systemnachrichten, Profilbild, Werbelink, Verkaufen, Kiez-Brett, Namensänderung, Lotto, Essen, Kiez-News, Einstellungen (0008/0009), live auf https://browsergame-prototyp.vercel.app. Admin: BehaarteUhse (0007).
Testkonten wurden nach Runde 3 gelöscht (0014) – bei Bedarf neu anlegen. Neue Arbeit immer auf neuem Stand von `main` beginnen.
