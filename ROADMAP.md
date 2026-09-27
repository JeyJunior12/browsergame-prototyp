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

**⭐ Vom Nutzer ausgewählt für später (27.09.2026):** 17, 19, 20, 22, 23, 24, 25, 26, 29, 30, 31, 32, 34, 37 – Kiosk-Stand, Revanche, Kopfgeld, Wetten, Kosmetik, Hunger, Sucht/Entzug, Ruf, Glücksrad, Pfandtour zu zweit, Tag/Nacht, Live-Stadtereignisse, Nebenquests, Ein-Klick-Verkaufen. Dazu aus J: 38, 39, 40 (eher selten), 43, 44, 47, 48, 49. Dazu aus K (Fahrzeuge): 53, 54 (erst später), 55, 56, 57, 59 (erst später), 60, 61, 63, 64. Dazu L (einheitliches Aussehen): 65–69. Dazu M (Wegweiser): 70–73. Alle übrigen Ideen bleiben ebenfalls im Plan.

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
17. Eigener Kiosk-Stand: passive Einnahmen, ausbaubar, kann überfallen werden ⭐
18. Kredithai: Geld leihen mit Zinsen, bei Verzug kommen Schläger

### E. Kämpfe
19. Revanche: nach Niederlage einmal sofort zurückschlagen ⭐
20. Kopfgeld auf Spieler aussetzen, wer ihn besiegt, kassiert ⭐
21. Wöchentliches Kampfturnier (K.-o.-Baum, automatisch ausgetragen)
22. Wetten auf Tierkämpfe und Bandenkriege ⭐

### F. Charakter
23. Kosmetik: Kleidung, Avatar-Rahmen, Titel-Farben ⭐
24. Hunger/Durst: regelmäßig essen, sonst weniger Energie ⭐
25. Sucht & Entzug beim Alkohol (Nachteil bei zu viel Promille über Tage) ⭐
26. Ruf bei Kiez-Gruppen (Polizei, Unterwelt, Nachbarn) mit Freischaltungen ⭐

### G. Sozial
27. Mentor-System: Erfahrene nehmen Neulinge auf, beide bekommen Bonus
28. Geschenke an Freunde (Plunder, Getränke, Kronkorken)
29. Tägliches Glücksrad („Mülltonnen-Lotterie“, 1 Dreh am Tag) ⭐
30. Freundes-Aktionen: zu zweit auf Pfandtour mit Bonus ⭐

### H. Welt
31. Tag und Nacht: nachts andere Aktionen, Chancen und Preise ⭐
32. Live-Stadtereignisse: z. B. „Konzert im Stadtpark – 1 Std. doppelt Pfand dort“ ⭐
33. Razzien und Viertel-Ereignisse in den Stadtteilen
34. Nebenquests von Kiez-Figuren (mehrteilig, neben der Kiez-Geschichte) ⭐

### I. Komfort
35. Einsteiger-Tutorial Schritt für Schritt
36. Statistikseite mit Verlaufskurven (Punkte, Geld, Flaschen)
37. Schnellaktionen: „Alles verkaufen & neue Tour starten“ mit einem Klick ⭐

### J. Alle 3–5 Minuten etwas tun & wiederkommen (27.09.2026)
38. Mülltonne durchwühlen alle 3 Min. (Flaschen, Kronkorken, Kleingeld, selten Plunder, manchmal Rattenbiss) ⭐
39. Kurze Pfandtouren 3 und 5 Min. (pro Minute so ergiebig wie 10 Min.) ⭐
40. Plötzliche Chancen auf der Seite („Tourist verliert 2 € – 15 Sek. zum Aufheben“) – **eher selten** ⭐
41. Glückssträhne: Bonus, wenn man innerhalb von 5 Min. weiterspielt
42. Blitzaufträge alle 5 Min.
43. Flaschen-Sortierspiel (30 Sek., Bonus-Pfand) ⭐
44. Leiste „Als Nächstes“ mit Countdowns und Ein-Klick-Aktionen ⭐
45. Live-Ticker „Gerade im Kiez“
46. Handy-Benachrichtigungen (als App installierbar)
47. Tab-Titel blinkt („(1) Tour fertig!“) ⭐
48. Login-Serie mit steigenden Belohnungen + Serien-Schutz ⭐
49. Feste Kiez-Zeiten (z. B. 19–20 Uhr Happy Hour, 22 Uhr Razzia) ⭐
50. Liegengelassenes Pfand verdirbt / wird geklaut
51. Bande kann dich anstupsen, Bandenziel braucht dich
52. Optionale E-Mail „Während du weg warst …“

### K. Fahrzeuge (27.09.2026)
Aufstieg: Einkaufswagen → Bollerwagen → Fahrrad mit Anhänger → Lastenrad → Mofa → rostiger Kombi → Transporter → Wohnmobil. Am Anfang ist man ein echter Penner – Motorfahrzeuge erst deutlich später.
53. Fahrzeug wirkt auf die Pfandtour: mehr Flaschen, schneller, weiter entfernte Sammelgebiete ⭐
54. Führerschein als Weiterbildung (Theorie + Praxis), nötig für Mofa/Auto – **erst später erreichbar, nicht früh** ⭐
55. Sprit und Pannen: Tanken kostet, zufällige Pannen/Polizeikontrolle ohne TÜV ⭐
56. Tuning aus Plunder/Material: Reifen, Motor, Anhänger, Hupe, Lackierung ⭐
57. Schrottplatz: Autoteile ausschlachten → Material, Schrott verkaufen ⭐
58. Wohnmobil als Unterkunft
59. Fahrer-Jobs mit Laufzeit (Kurier, Umzugshilfe, Sperrmüll) – **erst später, am Anfang ist man ein richtiger Penner** ⭐
60. Straßenrennen gegen Spieler mit Einsatz, Zuschauer wetten ⭐
61. Autodiebstahl + Schutz (Lenkradkralle, Garage, Tier im Auto) ⭐
62. Bandenfahrzeug (Transporter) mit Bonus für Stadtteile/Bandenkriege
63. Fahrten zwischen Stadtteilen: ohne Auto dauert Revierwechsel länger, mit Auto sofort ⭐
64. Fahrzeug + Lackierung im Profil und auf dem Stadtplan zeigen ⭐

### L. Einheitliches Aussehen überall (27.09.2026) ⭐
Nutzerwunsch: Ungleichheiten auf allen Seiten richtig machen. Beispiel: Karte „Dein Inventar“ (Pfand-/Übersichtsbereich) hat kein Foto, Emojis als Symbole (🍾 🔩 🪵 🔺 🧵), Eingabefeld und Knöpfe unterschiedlich hoch.
65. Jede Karte gleich aufgebaut: Foto links/oben, Titel, Text, Knöpfe in einer Reihe – auf jeder Seite, auch dort, wo dieselbe Karte ein zweites Mal vorkommt ⭐
66. Keine Emojis als Symbole in Karten und Werten – stattdessen einheitliche kleine Bilder/Icons oder nur Text ⭐
67. Eingabefelder und Knöpfe gleich hoch und bündig (Menge + Verkaufen + Alle verkaufen in einer Linie) ⭐
68. Gleiche Abstände, Schriftgrößen und Farben für Überschriften, Werte und Hinweise auf allen Seiten ⭐
69. Prüfskript, das alle Seiten durchgeht und Abweichungen meldet (Karte ohne Bild, Emoji im Titel, ungleiche Knopfhöhen) ⭐
69a. Nichts darf sich überlappen oder schief stehen: Beispiel Gegnerliste (Prügelei) – „Angreifen“ ragt über das Foto, „Tierkampf“/„Melden“ kleben darunter. Knöpfe einer Karte in einer sauberen Reihe mit Abstand, auf PC und Handy; Prüfskript meldet überlappende Elemente ⭐

### M. Wegweiser: Klick führt genau dorthin (27.09.2026) ⭐
Nutzerwunsch: Wer oben auf einen Wert klickt, muss direkt bei der passenden Stelle landen. Beispiel: Klick auf „Pfandlager“ in der Kopfleiste öffnet die Plunderkiste, der Pfand-Bereich (Flaschen verkaufen) kommt erst weiter unten – komplett falsch.
70. „Pfandlager“ oben führt direkt zum Flaschen-Verkaufen (Pfand-Seite, Bereich sichtbar ganz oben) ⭐
71. Alle Werte in der Kopfleiste prüfen und richtig verlinken (Bargeld → Schließfach/Einnahmen, Alkoholpegel → Apotheke/Supermarkt, Weiterbildung → Weiterbildung, Pfandpreis → Pfandkurs, Energie → Aktionen, Kronkorken → Kronkorken-Tausch) ⭐
72. Nach dem Sprung zur Stelle scrollen und sie kurz hervorheben, damit man sofort sieht, wo man ist ⭐
73. Prüfskript: jeden Link/Wert anklicken und prüfen, ob die passende Karte oben im Bild steht ⭐

