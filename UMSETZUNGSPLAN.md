# Umsetzungsplan ROADMAP – NEXUS-Sprint

Stand: 27.09.2026 · Grundlage: `ROADMAP.md` (Ideen-Speicher, alle Punkte inkl. ohne ⭐) · Methode: Skill `agentur-rollen` → NEXUS-Sprint,
Skill `boris-arbeitsweise` (planen → bauen → prüfen). Ein Claude arbeitet alle Rollen **nacheinander** ab (keine parallelen Agenten).

## 1. Modus und Ablauf

**NEXUS-Sprint** (bestehendes Spiel, viele neue Funktionen, mehrere Wochen). Phase 0 (Marktforschung) entfällt – das Spiel ist live.

```
Phase 1 Strategie      → dieser Plan: Backlog, Abhängigkeiten, Reihenfolge, Abnahmekriterien   (Freigabe durch Nutzer)
Phase 2 Fundament      → gemeinsame Bausteine zuerst (Karten-Baukasten, Besitz-Anzeige, Meldungen)
Phase 3 Bauen          → Sprints S1–S18, je ~10 ROADMAP-Punkte, jeder Punkt im Dev↔QA-Loop
Phase 4 Härten         → pro Sprint: Tests + Sicherheitsprüfung + Reality Check
Phase 5 Launch         → pro Sprint: PR + Merge (live) + Schnelltest live
Phase 6 Betrieb        → S19 Schlussprüfung + Durchspiel-Test Level 1–150, Balancing nachziehen
```

## 2. Rollen (nacheinander, je Aufgabe angekündigt)

| Rolle | Aufgabe im Projekt |
|---|---|
| Game Designer | Spielregeln, Abläufe, Belohnungen, Texte im Kiez-Ton |
| Economy Designer | Preise, Geld-Quellen/-Senken, Level-/Geldkurven (Wirtschaft, Balancing) |
| Backend Architect | Migrationen, SQL-Funktionen, Rechte, Realtime |
| Frontend Developer | Oberfläche in `kiez-features.js` / `kiez-theme.css`, Handy-Ansicht |
| UI Designer | Einheitliches Aussehen, Karten-Baukasten, keine Überlappungen |
| Security Engineer | Skill `security-review` bei Nutzereingaben, Chat, Handel, Geld |
| API Tester | `supabase/test/test_NNNN.sh` + Rundgang für jede neue Funktion |
| Evidence Collector | Browser-Klicktests, Screenshots PC + Handy |
| Reality Checker | Abnahme pro Sprint („NEEDS WORK“, bis alle Nachweise da sind); Skill `production-audit` vor jedem Livegang |

## 3. Qualitäts-Tore (Nachweise statt Behauptungen)

**Pro ROADMAP-Punkt (Dev↔QA-Loop, max. 3 Versuche, dann Nutzer fragen):**
1. Server: eigener Test in `test_NNNN.sh`, neue RPCs im Rundgang, alle Server-Tests grün
2. Browser: Klicktest wie ein Spieler, sichtbare Rückmeldung beim Knopf
3. Screenshot PC + Handy, keine Überlappung, kein Emoji-Ersatz für Bilder
4. Punkt in `ROADMAP.md` mit ✅ markiert

**Pro Sprint (vor dem Livegang):** `crawl.js` (LEER 0), `laden.js`, `meldungen.js`, `runde6.js`, `scroll.js`, `security-review` falls Eingaben/Geld,
`production-audit`, dann PR + Merge + Schnelltest auf der Live-Seite. Migrationen dürfen ohne Rückfrage live (Absprache 27.09.2026).

## 4. Warum nicht stur 1, 2, 3 …?

Die Nummern sind die Reihenfolge, in der die Ideen entstanden sind – nicht die sinnvolle Bau-Reihenfolge. Nach NEXUS (Sprint Prioritizer) gilt:
1. **Fehler zuerst** – sie stören jeden Spieler heute (Waffen mehrfach kaufbar, Meldungen falsch, Links falsch).
2. **Fundament vor Funktionen** – der Karten-Baukasten und die Besitz-Anzeige werden überall gebraucht; wer sie später baut, muss jede neue Seite nochmal anfassen.
3. **Systeme vor Balancing** – Preise und Werte (P) kann man erst ausgleichen, wenn alle Gegenstände, Fahrzeuge und Einnahmen existieren.
4. **Schlussprüfung ganz am Ende.**
Innerhalb eines Sprints wird nach Nummer gearbeitet.

## 5. Backlog nach Sprints (alle 146 Punkte)

| Sprint | Inhalt | ROADMAP-Punkte | Rollen |
|---|---|---|---|
| **S1** ✅ live | Chat-Leiste unten rechts, Kiezpost-Empfänger, Meldungen beim Knopf | 125–134, 69b, 69e, 69f, 69g | Backend, Frontend, Security |
| **S2** ✅ live | Fehler Waffen/Ausrüstung, Besitz sichtbar, Überlappungen, Stufenanzeige, Lernwarteschlange, Logo-Link | 105–110, 69a, 69c, 69d, 73a | Backend, Frontend, UI |
| **S3** | Kopfleisten-Links führen genau hin, flüssiger Seitenwechsel, offener Scroll-Fehler | 70–77 + Scroll-Fehler | Frontend, UI |
| **S4** | Einheitliches Aussehen überall + Prüfskript | 65–69 | UI, Frontend, Evidence |
| **S5** | Seite Schnorrplätze neu, Stadtteile vorerst sperren | 135–140, 121, 122 | Game Designer, Frontend |
| **S6** | Plunderkiste überarbeiten | 111–120 | Game Designer, Frontend, Backend |
| **S7** | Körperpflege mit Sinn, Hunger, Sucht/Entzug | 78–85, 24, 25 | Game Designer, Backend |
| **S8** | Banden I: Level, Bandenhaus, Wochenaufgaben, Kriege, Überfall, Bündnisse | 93–98, 11 | Game Designer, Backend, Frontend |
| **S9** | Banden II: Forum, Profil/Wappen, Rechte, Mitglieder, Boss, Saison, Anstupsen | 99–104, 12, 51 | Game Designer, Backend, Frontend |
| **S10** | Immer etwas zu tun I: Computer-Gegner/Kiezboss, Tagesaufgaben, Tour-Ereignisse, Mülltonne, kurze Touren, Chancen, Strähne, Blitzaufträge, Sortierspiel, Leiste „Als Nächstes“ | 1, 2, 3, 38–44 | Game Designer, Backend, Frontend |
| **S11** | Wiederkommen: Benachrichtigungen, Ticker, App, Tab-Titel, Login-Serie, Kiez-Zeiten, Pfand verdirbt, E-Mail, Ein-Klick, Tutorial | 5, 35, 37, 45–50, 52 | Frontend, Backend, Security |
| **S12** | Wirtschaft & Kampf: Pfand-Lager, Auktion, Kiosk, Kredithai, Revanche, Kopfgeld, Turnier, Wetten, Basar Waffen, Nebenjobs | 4, 13, 15–22 | Economy Designer, Backend, Frontend |
| **S13** | Charakter, Sozial, Welt: Kosmetik, Ruf, Mentor, Geschenke, Glücksrad, zu zweit, Tag/Nacht, Live-Ereignisse, Razzien, Nebenquests | 23, 26–34 | Game Designer, Backend, Frontend |
| **S14** | Langzeit: Sammelalbum, Kiez-Saison, Saison-Events, Neustart ab 150, Ranglisten, Statistik | 6–9, 14, 36 | Game Designer, Frontend |
| **S15** | Fahrzeuge I: Pfandtour, Führerschein (spät), Sprit/Pannen, Tuning, Schrottplatz, Stadtteil-Fahrten, Anzeige | 53–57, 63, 64 | Game Designer, Economy, Backend |
| **S16** | Fahrzeuge II: Wohnmobil, Fahrer-Jobs (spät), Rennen, Diebstahl, Bandenfahrzeug | 58–62 | Game Designer, Backend, Frontend |
| **S17** | Städte-Grundlage (gesperrt bis genug Spieler) | 10, 123, 124 | Backend Architect |
| **S18** | Balancing aller Gegenstände und Preise | 86–92 | Economy Designer |
| **S19** | Schlussprüfung + Durchspiel-Test Level 1–150 | 141–146 | Reality Checker, Evidence, Economy |

Bilder: Neue Seiten nutzen vorhandene Fotos; fehlende Motive kommen in `bilder-neu/BILDERLISTE.md` für die PC-Sitzung (Forge).

## 6. Risiken

- **Großer Umfang** → pro Sprint live gehen, damit Fehler früh auffallen; Sicherung vor jedem Sprint (Branch `sicherung-…`).
- **Wenige Spieler** → alles, was Mitspieler braucht (Kämpfe, Handel, Banden), bekommt Computer-Gegenstücke (S10) oder bleibt gesperrt (Stadtteile, Städte).
- **Balancing** → Werte sind bis S18/S19 vorläufig; Durchspiel-Test entscheidet.
