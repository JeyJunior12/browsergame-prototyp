# Kiezkönig – Gesamtplan

Ziel: alle Kernfunktionen von Pennergame, voll funktionsfähig (Logik in Supabase-SQL, Oberfläche in `index.html`),
mit eigenen Texten und Bildern. Jede Etappe = Migration(en) + Tests + Browser-Test mit Testkonto + Push.

```
Browser (index.html) ──rpc──▶ Supabase SQL-Funktionen (Spiellogik, SECURITY DEFINER)
        ▲                               │
        └────── select (nur lesen) ◀────┘ Tabellen mit SELECT-Policies
GitHub push ──▶ Action: Tests (Postgres) ──▶ Migration live in Supabase
```

## Stand der Funktionen

| Bereich | Pennergame | Kiezkönig | Etappe |
|---|---|---|---|
| Pfandtour mit Dauer, Flaschenkurs, Verkaufen | ✔ | ✔ | – |
| Punkte / Level / Kampfbereich 80–150 % | ✔ | ✔ (0002) | 3 ✅ |
| Weiterbildungen (8 Skills), Konzentration | ✔ | ✔ (0002 mit Nachteil) | 3 ✅ |
| Kämpfe, Schutzzeit, Knast, Kaution, Verbrechen | ✔ | ✔ | 3 ✅ |
| Alkohol/Promille, Apotheke, Krankenversicherung | ✔ | ✔ (0002 sinnvoll) | 3 ✅ |
| Schnorren, Schnorrplätze nach Gebiet, Musizieren | ✔ | ✔ (0002: 6 Plätze) | 3 ✅ |
| Waschen/Sauberkeit, Unterkünfte, Geldbehälter | ✔ | ✔ | – |
| Waffen/Schutz/Zubehör, Haustiere + Training | ✔ | ✔ | – |
| Tagesbelohnung, Tagesmission, Erfolge | ✔ | ✔ 34 Erfolge (0005) | 6 ✅ |
| Spendenlink (auch ohne Login) | ✔ | ✔ (0003/0006) | 4 ✅ |
| Plunder (14 Stück, anlegen, verkaufen) | ✔ | ✔ (0003) | 4 ✅ |
| Kronkorken + Tauschladen | ✔ | ✔ (0003) | 4 ✅ |
| Profil: Bio, Motto, Gästebuch, fremde Profile | ✔ | ✔ (0003) | 4 ✅ |
| Freundesliste, Spielersuche, Blockieren | ✔ | ✔ (0003) | 4 ✅ |
| Nachrichten | ✔ | ✔ | – |
| Bande: Ränge, Einladungen, Bewerbungen, Chat, Protokoll | ✔ | ✔ (0004) | 5 ✅ |
| Bandenkriege, Banden-Highscore | ✔ | ✔ (0004) | 5 ✅ |
| Tierkämpfe | ✔ | ✔ (0005) | 6 ✅ |
| Wetter (Server, wirkt auf Pfand), Preisverlauf | ✔ | ✔ (0003) | 6 ✅ |
| Events (Admin), Wochenwettbewerb mit Preisen | ✔ | ✔ (0005) | 6 ✅ |
| Highscore Spieler (Punkte), Häuser mit Preisen | ✔ | ✔ | 6 ✅ |
| Admin/Moderation, Live-Check, Mobile | – | ✔ live | 7 ✅ |
| Systemnachrichten (Kampfberichte, Anfragen, Gewinne), gelesen/ungelesen | ✔ | ✔ (0008) | 8 ✅ |
| Profilbild, Einstellungen (Passwort, Name), Freunde werben | ✔ | ✔ (0008) | 8 ✅ |
| Gegenstände verkaufen, Essen, Kiez-Lotto, Kiez-Brett, Kiez-News | ✔ | ✔ (0008/0009) | 8 ✅ |
| Stadtteile erobern (Banden-Einfluss, Wochenbesitz, Revierkasse) | ✔ | ✔ (0015) | 9 ✅ |
| Plunder-Basar zwischen Spielern | ✔ | ✔ (0015) | 9 ✅ |
| Zockerbude: Hütchenspiel, Würfelduell | ✔ | ✔ (0015) | 9 ✅ |
| Schließfach (Geld sicher vor Überfällen) | ✔ | ✔ (0015) | 9 ✅ |
| Aufgabenkette „Kiez-Geschichte“, Kiez-Chat, Titel, Kampfprotokoll | ✔ | ✔ (0015) | 9 ✅ |
| Menü mit 7 Bereichen, klickbarer Stadtplan | ✔ | ✔ | 9 ✅ |

## Etappen
1. ✅ Bestandsaufnahme
2. ✅ Sicherheit & Logikfehler (0001)
3. ✅ Balancing (0002): ein Punkte-System, Kampfbereich, Versicherung, Konzentration, Preise, Schnorren
4. ✅ Soziales & Nebenwährungen (0003, 0006)
5. ✅ Banden komplett (0004)
6. ✅ Langzeitmotivation (0005)
7. ✅ Go-Live: Rechte-Check (0006), Admin (0007), Mobile geprüft, live auf Vercel
8. ✅ Runde 2: Klick-Tests aller Seiten/Knöpfe, leere Reiter repariert, Verbrechen repariert (0009), restliche Pennergame-Funktionen (0008/0009)

## Ideen-Speicher (Stand 27.09.2026 – noch NICHT gebaut, Nutzer will alle)

Ziel: Es gibt fast immer etwas zu tun – auch mit wenigen Spielern. Empfohlener Start: 1, 2, 3, 5.

### Offener Fehler
- Seite scrollt nach 10–15 s ohne Eingabe nach oben (trotz Fix in PR #27; Ursache noch nicht gefunden, Nutzer hat Suche vertagt). Vermutung: Neuzeichnen einer Seite macht sie kurz kürzer. Test-Skizze: alle Seiten 20 s warten, `scrollTo`/`scrollIntoView`/`focus` mitprotokollieren.

### A. Immer etwas zu tun
1. Computer-Gegner in jedem Level-Bereich + wöchentlicher Kiezboss (alle prügeln gemeinsam, Beute für alle)
2. Täglich 3 wechselnde Aufgaben + Wochenaufgaben
3. Ereignisse auf der Pfandtour mit Entscheidung (Hund, Polizei, voller Container …)
4. Nebenjobs mit Laufzeit parallel zur Pfandtour
5. Browser-Hinweis, wenn Tour/Weiterbildung/Energie fertig (Push, als App installierbar)

### B. Langfristige Ziele
6. Sammelalbum: Plunder-Sets mit Dauerbonus
7. Kiez-Saison: kostenlose Belohnungsleiter über 4 Wochen
8. Saison-Events (Advent, Silvester, Ostern, Halloween) mit eigenem Plunder
9. Nach Level 150: Neustart mit Dauerbonus („Kiez-Legende“)

### C. Aus Pennergame, fehlt noch
10. Mehrere Städte als eigene Spielwelten
11. Bandenhaus mit mehr Ausbauten + Bandenaufgaben (Wochenziele)
12. Forum / Bandenforum mit Themen
13. Waffen und Ausrüstung im Basar handeln
14. Mehr Ranglisten (Tiere, Geld, Flaschen, Kampfquote)

### D. Wirtschaft
15. Pfand-Lager & Spekulation: Flaschen horten, bei hohem Kurs verkaufen (Lager ausbaubar, Flaschen können „verschwinden“)
16. Auktionshaus für seltenen Plunder (Gebote, Laufzeit)
17. Eigener Kiosk-Stand: passive Einnahmen, ausbaubar, kann überfallen werden
18. Kredithai: Geld leihen mit Zinsen, bei Verzug kommen Schläger

### E. Kämpfe
19. Revanche: nach Niederlage einmal sofort zurückschlagen
20. Kopfgeld auf Spieler aussetzen, wer ihn besiegt, kassiert
21. Wöchentliches Kampfturnier (K.-o.-Baum, automatisch ausgetragen)
22. Wetten auf Tierkämpfe und Bandenkriege

### F. Charakter
23. Kosmetik: Kleidung, Avatar-Rahmen, Titel-Farben
24. Hunger/Durst: regelmäßig essen, sonst weniger Energie
25. Sucht & Entzug beim Alkohol (Nachteil bei zu viel Promille über Tage)
26. Ruf bei Kiez-Gruppen (Polizei, Unterwelt, Nachbarn) mit Freischaltungen

### G. Sozial
27. Mentor-System: Erfahrene nehmen Neulinge auf, beide bekommen Bonus
28. Geschenke an Freunde (Plunder, Getränke, Kronkorken)
29. Tägliches Glücksrad („Mülltonnen-Lotterie“, 1 Dreh am Tag)
30. Freundes-Aktionen: zu zweit auf Pfandtour mit Bonus

### H. Welt
31. Tag und Nacht: nachts andere Aktionen, Chancen und Preise
32. Live-Stadtereignisse: z. B. „Konzert im Stadtpark – 1 Std. doppelt Pfand dort“
33. Razzien und Viertel-Ereignisse in den Stadtteilen
34. Nebenquests von Kiez-Figuren (mehrteilig, neben der Kiez-Geschichte)

### I. Komfort
35. Einsteiger-Tutorial Schritt für Schritt
36. Statistikseite mit Verlaufskurven (Punkte, Geld, Flaschen)
37. Schnellaktionen: „Alles verkaufen & neue Tour starten“ mit einem Klick

