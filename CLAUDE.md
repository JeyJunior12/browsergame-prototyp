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
- `index.html` lokal ausliefern (z. B. `python3 -m http.server`) und mit Playwright/Chromium testen (`executablePath: '/opt/pw-browsers/chromium'` falls nötig). Eigenes Testkonto „ClaudeTester“ registrieren; falls E-Mail-Bestätigung nötig → Nutzer fragen.

## Stand
- Etappe 1 (Bestandsaufnahme) erledigt. Etappe 2 teilweise: **Migration 0001 ist live** (Namen validiert, Upgrade-Cheats zu, Waschanlage/Begleiter-Doppelkauf, 3 Ausrüstungsplätze, Kampf-Absturz ohne Bande). XSS-Schutz in `index.html` liegt im Branch, **noch nicht in `main`** (braucht PR + Merge durch Nutzer).
- Admin: Nutzer hat nur einen Account; `is_admin` muss er per SQL setzen (`update profiles set is_admin = true;`) – noch offen.

## Offene Befunde → nächste Etappen
Etappe 3 – Balancing (vorher Entscheidungen per Auswahlfrage):
- Drei Level-Formeln (xp/100 in `collect_bottles`, xp/250 in `finish_collection`, Skillpunkte/8 in `finish_training`) → eine.
- `attack_player`: kein Punkte-/Levelbereich, kein Knast-Check, Energie ohne Regeneration geprüft.
- Krankenversicherung zieht täglich 10 % Bargeld, hat aber keinen Nutzen.
- Konzentration gratis, ohne Nachteil (−10 % Trainingszeit), blockiert nichts.
- Preise: Magen auspumpen 500 € vs. Bier 1 €; Rubbellos-Erwartungswert −69 %; Belohnungen teils über `cash_capacity`.
- Zwei Bettel-Systeme (`beg_for_money`, `beg_at_spot`); `beg_at_spot` hat nur 2 Plätze.
Etappe 4 – Fehlend/nur Oberfläche (kein Backend): Plunder, Kronkorken, Bio/Gästebuch, Wetter, Preisverlauf, Häuser-Galerie. Außerdem fehlen im Vergleich zu Pennergame u. a. Bandenkämpfe, Banden-Einladungen/Ränge, Spendenlink, Freundesliste, Events, mehr Erfolge (nur 6).
