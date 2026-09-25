# Kiezkönig – Browsergame

Deutsches Browsergame im Stil von Pennergame (Pfand sammeln, Schnorren, Training, Kämpfe, Banden, Haustiere …). Eigene Texte, Bilder und Name – keine Pennergame-Inhalte kopieren, nur Spielmechaniken.

## Aufbau
- `index.html`: gesamte Oberfläche (HTML/CSS/JS in einer Datei, ~320 KB, sehr lange Zeilen → gezielt mit Grep suchen, nie komplett lesen).
- Bilder: Sprite-PNGs im Repo-Root.
- Backend: Supabase (Projekt-Ref `qazpwdyyzfdektlbtxae`). Login über `signInWithPassword`/`signUp`.
- **Spiellogik und Balancing liegen in Supabase-SQL-Funktionen** (46 RPCs, z. B. `sell_bottles`, `attack_player`, `join_gang`, `buy_item`), nicht im Repo. Tabellen u. a. `profiles` (mit `is_admin`), `inventory`, `gangs`, `gang_members`, `fights`, `shop_items`, `pet_catalog`, `defense_items`, `achievement_defs`, `daily_missions`, `messages`.
- Hosting: Vercel (Production = `main`, Previews pro Branch). `.claude/` wird per `.vercelignore` nicht deployed.

## Datenbank-Zugriff
- SQL läuft über die Supabase Management API (HTTPS), da Postgres-Ports in der Cloud-Umgebung gesperrt sind:
  `curl -sS -X POST "https://api.supabase.com/v1/projects/qazpwdyyzfdektlbtxae/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"query":"select 1"}'`
- Token nur aus der Umgebungsvariable `SUPABASE_ACCESS_TOKEN`, niemals in Code, Commits oder Chat.
- Jede Schema-/Funktionsänderung zusätzlich als Datei unter `supabase/migrations/NNNN_beschreibung.sql` ins Repo.
- Vor Änderungen den Ist-Stand nach `supabase/schema/` exportieren.

## Ziel und Vorgehen
Ziel: alle Pennergame-Funktionen, alles funktionsfähig, ausbalanciert. In Etappen, jede getestet:
1. Bestandsaufnahme: Schema/Funktionen exportieren, mit Pennergame vergleichen, Liste (funktioniert / kaputt / fehlt).
2. Reparieren: Bestehendes zum Laufen bringen.
3. Balancing: Wirtschaft, Training, Kämpfe durchrechnen und abstimmen.
4. Fehlende Funktionen ergänzen.

## Regeln
- Antworten auf Deutsch, kurz. Nutzer möchte Tokens sparen: gezielt lesen, keine Multi-Agent-Setups.
- Skills in `.claude/skills/` nutzen (boris-arbeitsweise, security-review bei Login/Eingaben/RLS).
- RLS-Policies bei jeder neuen Tabelle/Funktion prüfen; Admin-Rechte nur über `profiles.is_admin`.
- Änderungen selbst testen (Cloud-Browser/Playwright, SQL-Checks) bevor sie als fertig gemeldet werden.
