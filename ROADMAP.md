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

### 🥇 PLATZ 1 – Chat-Leiste unten rechts (wie Facebook) (27.09.2026) ⭐
Nutzerwunsch, höchste Priorität: ein ALL-Chat als kleine Leiste unten rechts, auf jeder Seite, die man auf- und zuklappen kann; jeder Spieler kann reinschreiben. Privatnachrichten dort mit einbinden.
128. ✅ Leiste unten rechts auf allen Seiten: eingeklappt nur ein Balken „Kiez-Chat“ mit Zähler ungelesener Nachrichten; aufgeklappt Fenster mit Verlauf und Eingabe; Zustand (auf/zu) bleibt beim Seitenwechsel erhalten ⭐
129. ✅ Reiter in der Leiste: „Alle“ (ALL-Chat, nutzt `chat_messages` aus 0015) und je ein Reiter/Fenster pro Privatgespräch; Klick auf einen Spielernamen öffnet ein Privatfenster ⭐
130. ✅ Privatnachrichten aus der Kiezpost dort als Gespräche (Verlauf wie Messenger); neue Nachrichten poppen als kleines Fenster auf und zählen im Balken ⭐
131. ✅ Live-Gefühl: neue Nachrichten ohne Neuladen (Supabase Realtime oder kurzes Abfragen), „schreibt gerade“ optional, Uhrzeit, Spielernamen klickbar zum Profil ⭐
132. ✅ Handy: Leiste als runder Knopf unten rechts, öffnet Vollbild-Chat; darf keine Knöpfe der Seite verdecken ⭐
133. ✅ Schutz: Sperre gegen Spam (bestehende 5 s), Blockierte ausblenden, Melden-Knopf, Admin/eigene Nachrichten löschen, Wortfilter für grobe Beleidigungen ⭐
134. ✅ Die bisherige Seite „Kiez-Chat“ bleibt als große Ansicht bzw. wird durch die Leiste ersetzt ⭐


**⭐ Vom Nutzer ausgewählt für später (27.09.2026):** 17, 19, 20, 22, 23, 24, 25, 26, 29, 30, 31, 32, 34, 37 – Kiosk-Stand, Revanche, Kopfgeld, Wetten, Kosmetik, Hunger, Sucht/Entzug, Ruf, Glücksrad, Pfandtour zu zweit, Tag/Nacht, Live-Stadtereignisse, Nebenquests, Ein-Klick-Verkaufen. Dazu aus J: 38, 39, 40 (eher selten), 43, 44, 47, 48, 49. Dazu aus K (Fahrzeuge): 53, 54 (erst später), 55, 56, 57, 59 (erst später), 60, 61, 63, 64. Dazu L (einheitliches Aussehen): 65–69. Dazu M (Wegweiser): 70–73. Dazu N (flüssiger Seitenwechsel): 74–77. Dazu O (Körperpflege): 78–85. Dazu P (Balancing Gegenstände & Preise): 86–92. Dazu Q (Bandensystem): 93–104. Dazu R (Fehler Waffen kaufen/anlegen, hohe Priorität): 105–109. Dazu S (Plunderkiste): 111–120. Dazu T (Stadtteile sperren, später Städte): 121–124. Dazu U (Kiezpost-Empfänger): 125–127. Dazu V (Schnorrplätze-Seite): 135–140. Alle übrigen Ideen bleiben ebenfalls im Plan. **Zum Schluss:** Gesamtprüfung + Durchspiel-Test Level 1–150 (141–146).

### Offener Fehler
- ✅ Seite scrollt nach 10–15 s ohne Eingabe nach oben – Ursache: `load()` (alle 60 s und nach Aktionen) rief `showView(currentView)` auf; passte die offene Seite nicht genau zu `currentView`, scrollte sie hoch. Behoben in S3 (Neuladen scrollt nie), Test `test/browser/leerlauf.js`.

### A. Immer etwas zu tun
1. ✅ Computer-Gegner in jedem Level-Bereich + wöchentlicher Kiezboss (alle prügeln gemeinsam, Beute für alle)
2. ✅ Täglich 3 wechselnde Aufgaben + Wochenaufgaben
3. ✅ Ereignisse auf der Pfandtour mit Entscheidung (Hund, Polizei, voller Container …)
4. ✅ Nebenjobs mit Laufzeit parallel zur Pfandtour
5. ✅ Browser-Hinweis, wenn Tour/Weiterbildung/Energie fertig (Push, als App installierbar)

### B. Langfristige Ziele
6. ✅ Sammelalbum: Plunder-Sets mit Dauerbonus
7. ✅ Kiez-Saison: kostenlose Belohnungsleiter über 4 Wochen
8. ✅ Saison-Events (Advent, Silvester, Ostern, Halloween) mit eigenem Plunder
9. ✅ Nach Level 150: Neustart mit Dauerbonus („Kiez-Legende“)

### C. Aus Pennergame, fehlt noch
10. ✅ Mehrere Städte als eigene Spielwelten
11. ✅ Bandenhaus mit mehr Ausbauten + Bandenaufgaben (Wochenziele)
12. ✅ Forum / Bandenforum mit Themen
13. ✅ Waffen und Ausrüstung im Basar handeln
14. ✅ Mehr Ranglisten (Tiere, Geld, Flaschen, Kampfquote)

### D. Wirtschaft
15. ✅ Pfand-Lager & Spekulation: Flaschen horten, bei hohem Kurs verkaufen (Lager ausbaubar, Flaschen können „verschwinden“)
16. ✅ Auktionshaus für seltenen Plunder (Gebote, Laufzeit)
17. ✅ Eigener Kiosk-Stand: passive Einnahmen, ausbaubar, kann überfallen werden ⭐
18. ✅ Kredithai: Geld leihen mit Zinsen, bei Verzug kommen Schläger

### E. Kämpfe
19. ✅ Revanche: nach Niederlage einmal sofort zurückschlagen ⭐
20. ✅ Kopfgeld auf Spieler aussetzen, wer ihn besiegt, kassiert ⭐
21. ✅ Wöchentliches Kampfturnier (K.-o.-Baum, automatisch ausgetragen)
22. ✅ Wetten auf Tierkämpfe und Bandenkriege ⭐

### F. Charakter
23. ✅ Kosmetik: Kleidung, Avatar-Rahmen, Titel-Farben ⭐
24. ✅ Hunger/Durst: regelmäßig essen, sonst weniger Energie ⭐
25. ✅ Sucht & Entzug beim Alkohol (Nachteil bei zu viel Promille über Tage) ⭐
26. ✅ Ruf bei Kiez-Gruppen (Polizei, Unterwelt, Nachbarn) mit Freischaltungen ⭐

### G. Sozial
27. ✅ Mentor-System: Erfahrene nehmen Neulinge auf, beide bekommen Bonus
28. ✅ Geschenke an Freunde (Plunder, Getränke, Kronkorken)
29. ✅ Tägliches Glücksrad („Mülltonnen-Lotterie“, 1 Dreh am Tag) ⭐
30. ✅ Freundes-Aktionen: zu zweit auf Pfandtour mit Bonus ⭐

### H. Welt
31. ✅ Tag und Nacht: nachts andere Aktionen, Chancen und Preise ⭐
32. ✅ Live-Stadtereignisse: z. B. „Konzert im Stadtpark – 1 Std. doppelt Pfand dort“ ⭐
33. ✅ Razzien und Viertel-Ereignisse in den Stadtteilen
34. ✅ Nebenquests von Kiez-Figuren (mehrteilig, neben der Kiez-Geschichte) ⭐

### I. Komfort
35. ✅ Einsteiger-Tutorial Schritt für Schritt
36. ✅ Statistikseite mit Verlaufskurven (Punkte, Geld, Flaschen)
37. ✅ Schnellaktionen: „Alles verkaufen & neue Tour starten“ mit einem Klick ⭐

### J. Alle 3–5 Minuten etwas tun & wiederkommen (27.09.2026)
38. ✅ Mülltonne durchwühlen alle 3 Min. (Flaschen, Kronkorken, Kleingeld, selten Plunder, manchmal Rattenbiss) ⭐
39. ✅ Kurze Pfandtouren 3 und 5 Min. (pro Minute so ergiebig wie 10 Min.) ⭐
40. ✅ Plötzliche Chancen auf der Seite („Tourist verliert 2 € – 15 Sek. zum Aufheben“) – **eher selten** ⭐
41. ✅ Glückssträhne: Bonus, wenn man innerhalb von 5 Min. weiterspielt
42. ✅ Blitzaufträge alle 5 Min.
43. ✅ Flaschen-Sortierspiel (30 Sek., Bonus-Pfand) ⭐
44. ✅ „Als Nächstes“ mit Countdowns – seit 151 als Liste in der Übersicht, Klick führt nur zur Seite (keine Ein-Klick-Aktion mehr) ⭐
45. ✅ Live-Ticker „Gerade im Kiez“
46. ✅ Handy-Benachrichtigungen (als App installierbar; Hinweise solange der Browser offen ist – echte Push ohne offenen Browser braucht einen Push-Dienst)
47. ✅ Tab-Titel blinkt („(1) Tour fertig!“) ⭐
48. ✅ Login-Serie mit steigenden Belohnungen + Serien-Schutz ⭐
49. ✅ Feste Kiez-Zeiten (z. B. 19–20 Uhr Happy Hour, 22 Uhr Razzia) ⭐
50. ✅ Liegengelassenes Pfand verdirbt / wird geklaut
51. ✅ Bande kann dich anstupsen, Bandenziel braucht dich
52. ✅ Optionale E-Mail „Während du weg warst …“ (im Spiel als Zusammenfassung beim Wiederkommen + Einstellung zum Abonnieren; echter Mailversand braucht einen Mailserver – vorbereitet)

### K. Fahrzeuge (27.09.2026)
Aufstieg: Einkaufswagen → Bollerwagen → Fahrrad mit Anhänger → Lastenrad → Mofa → rostiger Kombi → Transporter → Wohnmobil. Am Anfang ist man ein echter Penner – Motorfahrzeuge erst deutlich später.
53. ✅ Fahrzeug wirkt auf die Pfandtour: mehr Flaschen, schneller, weiter entfernte Sammelgebiete ⭐
54. ✅ Führerschein als Weiterbildung (Theorie + Praxis), nötig für Mofa/Auto – **erst später erreichbar, nicht früh** ⭐
55. ✅ Sprit und Pannen: Tanken kostet, zufällige Pannen/Polizeikontrolle ohne TÜV ⭐
56. ✅ Tuning aus Plunder/Material: Reifen, Motor, Anhänger, Hupe, Lackierung ⭐
57. ✅ Schrottplatz: Autoteile ausschlachten → Material, Schrott verkaufen ⭐
58. ✅ Wohnmobil als Unterkunft
59. ✅ Fahrer-Jobs mit Laufzeit (Kurier, Umzugshilfe, Sperrmüll) – **erst später, am Anfang ist man ein richtiger Penner** ⭐
60. ✅ Straßenrennen gegen Spieler mit Einsatz, Zuschauer wetten ⭐
61. ✅ Autodiebstahl + Schutz (Lenkradkralle, Garage, Tier im Auto) ⭐
62. ✅ Bandenfahrzeug (Transporter) mit Bonus für Stadtteile/Bandenkriege
63. ✅ Fahrten zwischen Stadtteilen: ohne Auto dauert Revierwechsel länger, mit Auto sofort ⭐
64. ✅ Fahrzeug + Lackierung im Profil und auf dem Stadtplan zeigen ⭐

### L. Einheitliches Aussehen überall (27.09.2026) ⭐
Nutzerwunsch: Ungleichheiten auf allen Seiten richtig machen. Beispiel: Karte „Dein Inventar“ (Pfand-/Übersichtsbereich) hat kein Foto, Emojis als Symbole (🍾 🔩 🪵 🔺 🧵), Eingabefeld und Knöpfe unterschiedlich hoch.
65. ✅ Jede Karte gleich aufgebaut: Foto links/oben, Titel, Text, Knöpfe in einer Reihe – auf jeder Seite, auch dort, wo dieselbe Karte ein zweites Mal vorkommt ⭐
66. ✅ Keine Emojis als Symbole in Karten und Werten – stattdessen einheitliche kleine Bilder/Icons oder nur Text ⭐
67. ✅ Eingabefelder und Knöpfe gleich hoch und bündig (Menge + Verkaufen + Alle verkaufen in einer Linie) ⭐
68. ✅ Gleiche Abstände, Schriftgrößen und Farben für Überschriften, Werte und Hinweise auf allen Seiten ⭐
69. ✅ Prüfskript, das alle Seiten durchgeht und Abweichungen meldet (Karte ohne Bild, Emoji im Titel, ungleiche Knopfhöhen) ⭐
69a. ✅ Nichts darf sich überlappen oder schief stehen: Beispiel Gegnerliste (Prügelei) – „Angreifen“ ragt über das Foto, „Tierkampf“/„Melden“ kleben darunter. Knöpfe einer Karte in einer sauberen Reihe mit Abstand, auf PC und Handy; Prüfskript meldet überlappende Elemente ⭐
69b. ✅ Meldungsfenster beim Knopf (grün/rot, seit PR #26) sieht schlecht aus: Beispiel Weiterbildung „Angriff“ – Meldung steckt als schmale Spalte unten links in der Karte, Text bricht Wort für Wort um. Stattdessen volle Kartenbreite (oder direkt unter dem Knopf), gleiches Aussehen wie andere Hinweise, gut lesbar ⭐
69c. ✅ Gleiche Karte prüfen: Titel „Angriff 3“, darunter „Aktuelle Stufe: 1“ – widersprüchliche Stufenangabe klären ⭐
69d. ✅ Reiter „Lernwarteschlange“ (Weiterbildung) zeigt dieselbe Seite wie „Fähigkeiten“ – eigener Inhalt nötig: laufende Weiterbildung mit Restzeit, geplante Stufen in Reihenfolge, Abbrechen/Abschließen. Allgemein prüfen: jeder Reiter muss etwas anderes zeigen als seine Nachbarn ⭐
69e. ✅ Meldungen verschwinden zu schnell: Beispiel Laden → Angebot „Regenschirm“ kaufen – grünes „Gekauft“ ist nach ~1 Sek. weg (Karte wird neu gezeichnet), nicht lesbar. Meldungen müssen mindestens ~6–8 Sek. stehen bleiben (auch wenn die Karte neu gezeichnet wird) oder bis zum nächsten Klick; überall prüfen ⭐
69f. ✅ Abmelden-Knopf im Spielerkasten oben rechts steht nicht mittig – sauber ausrichten (zentriert bzw. bündig mit dem Kasten), auf PC und Handy ⭐
69g. ✅ Meldung landet bei der falschen Karte: Beispiel Schnorrplätze – „Hingehen“ am Englischen Garten gedrückt, während der Timer läuft woanders geklickt (Altglas-Gasse „Freischalten“) → Ergebnis „+0,71 € von 7 Spenden kassiert“ erscheint bei der Altglas-Gasse. Jede Meldung gehört zu der Aktion, die sie ausgelöst hat (auch bei Timern/zeitversetzten Ergebnissen); Zuordnung pro Aktion statt „zuletzt geklickt“ ⭐

### M. Wegweiser: Klick führt genau dorthin (27.09.2026) ⭐
Nutzerwunsch: Wer oben auf einen Wert klickt, muss direkt bei der passenden Stelle landen. Beispiel: Klick auf „Pfandlager“ in der Kopfleiste öffnet die Plunderkiste, der Pfand-Bereich (Flaschen verkaufen) kommt erst weiter unten – komplett falsch.
70. ✅ „Pfandlager“ oben führt direkt zum Flaschen-Verkaufen (Pfand-Seite, Bereich sichtbar ganz oben) ⭐
71. ✅ Alle Werte in der Kopfleiste prüfen und richtig verlinken (Bargeld → Schließfach/Einnahmen, Alkoholpegel → Apotheke/Supermarkt, Weiterbildung → Weiterbildung, Pfandpreis → Pfandkurs, Energie → Aktionen, Kronkorken → Kronkorken-Tausch) ⭐
72. ✅ Nach dem Sprung zur Stelle scrollen und sie kurz hervorheben, damit man sofort sieht, wo man ist ⭐
73. ✅ Prüfskript: jeden Link/Wert anklicken und prüfen, ob die passende Karte oben im Bild steht ⭐
73a. ✅ Klick auf den Spielnamen „KIEZKÖNIG“ oben links führt immer zur Startseite (eingeloggt: Übersicht, ausgeloggt: Startseite), auf PC und Handy ⭐

### N. Flüssiger Seitenwechsel (27.09.2026) ⭐
Nutzerwunsch: Der Wechsel zwischen Seiten wirkt ruckelig, und das große Hintergrundbild wechselt bei jedem Klick zu stark – das stört.
74. ✅ Hintergrundbild nur pro Hauptbereich des Menüs wechseln (Mein Kiez, Aktionen, Stadt, Kampf, Bande, Kommunikation, Highscore), nicht bei jeder Unterseite/jedem Reiter ⭐
75. ✅ Weicher Übergang: Hintergrund sanft überblenden statt hart tauschen, Inhalt kurz einblenden (ohne Springen/Flackern) ⭐
76. ✅ Beim Wechsel kein „Lade …“-Aufblitzen und kein Zusammenfallen der Seite: alter Inhalt bleibt stehen, bis der neue da ist, Platz wird freigehalten ⭐
77. ✅ Bilder der Hintergründe vorladen, damit beim Wechsel nichts nachlädt ⭐

### O. Körperpflege mit echtem Sinn (27.09.2026) ⭐
Ist-Stand: Sauberkeit sinkt nur durch Pfandtouren, wirkt nur aufs Schnorren (Faktor Sauberkeit/200) und sperrt Touren unter 20 %. Waschen (Katzenwäsche/Schwamm/Waschanlage) lohnt sich dadurch kaum. Soll überall spürbar werden:
78. ✅ Sauberkeit sinkt auch mit der Zeit (z. B. −1 % pro Stunde) und durch Kämpfe, Verbrechen, Mülltonne ⭐
79. ✅ Stufen mit klaren Folgen, im Spiel sichtbar erklärt: gepflegt (Bonus), normal, schmuddelig, verwahrlost ⭐
80. ✅ Schnorren und Musik: saubere Spieler bekommen deutlich mehr, verwahrloste kaum etwas ⭐
81. ✅ Läden: Wer verwahrlost ist, wird aus Supermarkt/Apotheke rausgeworfen oder zahlt Aufschlag ⭐
82. ✅ Kämpfe: Gestank schreckt ab (kleiner Verteidigungsbonus) – aber weniger Beute beim Schnorren; Gegner sehen die Stufe ⭐
83. ✅ Gesundheit: dauerhaft verwahrlost → Krankheit (weniger Energie), Heilung in der Apotheke ⭐
84. ✅ Sozial: Freunde/Bande sehen die Stufe im Profil; Stadtteil Villenviertel nur ab „gepflegt“ gut nutzbar ⭐
85. ✅ Waschen sinnvoll staffeln: mehr Möglichkeiten (Brunnen kostenlos aber langsam, Schwimmbad, Friseur für Bonus), Waschausstattung als echte Investition ⭐

### P. Balancing aller Gegenstände und Preise (27.09.2026) ⭐
Nutzerwunsch: Alles, was Werte gibt, und alle Preise im Spiel einmal durchgehen und ausgewogen machen – passend zur neuen Level-Kurve (0016: Level 150 aktiv ~1,5 Jahre).
86. ✅ Vollständige Liste aller Dinge mit Werten: Waffen, Verteidigung/Kleidung, Zubehör, Begleiter/Tiere, Plunder, Bastelsachen, Unterkünfte, Instrumente, Bandenausbauten ⭐
87. ✅ Für jedes Stück: Preis, Level-Anforderung, Angriff/Verteidigung/Bonus → Wert pro Euro und pro Level vergleichen; Ausreißer (zu stark/zu billig, nutzlos/zu teuer) korrigieren ⭐
88. ✅ Klare Stufenleiter: jedes nächste Stück spürbar besser, aber teurer; keine „Pflichtkäufe“ und keine toten Gegenstände ⭐
89. ✅ Alle Preise im Spiel prüfen: Läden, Essen/Trinken, Apotheke, Versicherung, Waschen, Weiterbildung, Umzug, Sammelgebiete, Geldbehälter, Kaution, Bande gründen/ausbauen, Kronkorken-Tausch, Basar-Gebühr, Zockerbude-Einsätze, Schließfach ⭐
90. ✅ Einnahmen gegen Ausgaben rechnen: Wie lange spart ein normaler Spieler auf das nächste sinnvolle Ziel? Ziel: immer ein erreichbares nächstes Ziel in Stunden bis wenigen Tagen, große Ziele in Wochen ⭐
91. ✅ Kampfbalance: Level-Bereich 80–150 %, Beute, Versicherung, Tierkämpfe und Bandenboni zusammen prüfen, damit Ausrüstung zählt, aber Level nicht egal ist ⭐
92. ✅ Ergebnis als Tabelle festhalten (supabase/schema/data + Balancing-Notiz) und per Migration umsetzen, mit Test, der Ausreißer erkennt ⭐

### Q. Bandensystem komplett und umfangreich (27.09.2026) ⭐
Ist-Stand: gründen, Ränge (Chef/Vize/Offizier/Mitglied), Einladungen/Bewerbungen, Chat, Protokoll, Kasse, Ausbau Angriff/Verteidigung, Bandenkriege, Highscore, Stadtteile (0015). Soll Spaß machen und viel Tiefe haben:
93. ✅ Bandenlevel mit Erfahrung: Mitglieder-Aktionen (Flaschen, Siege, Einzahlungen, Kriege, Stadtteile) bringen Banden-Punkte; höheres Level = mehr Plätze und neue Ausbauten ⭐
94. ✅ Bandenhaus mit Räumen zum Ausbauen: Lager (Plunder teilen), Trainingsraum (schnellere Weiterbildung), Zwinger (Tier-Bonus), Werkstatt (Basteln), Tresor (Kasse sicher), Kneipe (Energie) ⭐
95. ✅ Bandenaufgaben pro Woche: gemeinsame Ziele (z. B. 50.000 Flaschen, 200 Siege), Belohnung für alle; Anzeige, wer wie viel beigetragen hat ⭐
96. ✅ Bandenkriege ausbauen: Kriegsziele und Einsatz, Kriegsverlauf mit Punkten pro Tag, Waffenruhe/Kapitulation, Kriegsbeute, Kriegs-Rangliste ⭐
97. ✅ Überfall aufs Bandenhaus: gegnerische Bande kann die Kasse angreifen, Verteidiger werden benachrichtigt und können helfen ⭐
98. ✅ Bündnisse und Feinde: Allianzen mit anderen Banden (kein Angriff untereinander, gemeinsame Kriege), Feindesliste ⭐
99. ✅ Bandenforum mit Themen, Ankündigungen vom Chef, Umfragen ⭐
100. ✅ Bandenprofil: Wappen/Farbe, Motto, Beitrittsbedingungen (Mindestlevel, offen/Bewerbung), öffentliche Erfolge ⭐
101. ✅ Feinere Rechte: wer darf einladen, auszahlen, ausbauen, Krieg erklären; Mitgliedsbeiträge und Auszahlungen aus der Kasse mit Protokoll ⭐
102. ✅ Mitgliederübersicht: aktiv/inaktiv, Beitrag diese Woche, anstupsen, Inaktive automatisch markieren ⭐
103. ✅ Bandenboss-Kampf: wöchentlicher Computer-Boss, den die ganze Bande gemeinsam schlägt ⭐
104. ✅ Banden-Saison mit Rangliste und Preisen (Kronkorken, Titel, Wappen-Rahmen) ⭐

### R. Fehler: Waffen/Ausrüstung kaufen und anlegen (27.09.2026) ⭐ – hohe Priorität
Gemeldet: Waffen lassen sich mehrfach kaufen; Anziehen/Ausrüsten für Werte funktioniert gar nicht.
105. ✅ Jede Waffe/jedes Ausrüstungsstück nur einmal kaufbar; danach zeigt die Karte „Im Besitz“ statt „Kaufen“ (Server prüft, nicht nur die Oberfläche) ⭐
106. ✅ Anlegen/Ablegen reparieren: ein Platz pro Art (Waffe, Kleidung/Schutz, Zubehör), angelegtes Stück sichtbar markiert, Werte wirken sofort in Kampf und Profil ⭐
107. ✅ Profil und Kampfanzeige zeigen Grundwert + Bonus durch Ausrüstung getrennt, damit man sieht, dass es wirkt ⭐
108. ✅ Bereits doppelt gekaufte Stücke: Duplikate automatisch zum Kaufpreis erstatten ⭐
109. ✅ Test per Klick: kaufen → zweiter Kauf gesperrt → anlegen → Angriffswert steigt → ablegen → Wert sinkt ⭐
110. ✅ Überall gilt: Was man schon besitzt, ist sofort sichtbar – Karte ausgegraut bzw. „Im Besitz ✔“ statt „Kaufen“, Knopf gesperrt oder „Mitnehmen/Anlegen“. Beispiel Begleiter „Kakerlake“: erst nach erneutem Kaufversuch kommt „Diesen Begleiter hast du schon“ – das darf nicht sein. Gilt für Begleiter, Waffen, Ausrüstung, Unterkünfte, Instrumente, Sammelgebiete, Waschausstattung, Ausbauten; zu teure/zu hohe Level-Stücke ebenfalls vorab kennzeichnen („ab Level X“, „zu wenig Geld“) ⭐
   Weiteres Beispiel: Schnorrplätze Hauptbahnhof/Fußgängerzone/Jahrmarkt zeigen „Hingehen“, erst nach Klick kommt „Diesen Platz schaltest du mit Sammelgebiet X frei“ → vorher als gesperrt kennzeichnen („🔒 ab Sammelgebiet 2“).
   Vorbild (Nutzer findet es gut): Unterkünfte „Häuser im Kiez“ – statt Kaufknopf steht unten „✔ AKTUELL BEWOHNT“ (Häkchen + Großbuchstaben, gedämpfte Farbe). Genau diesen Stil übernehmen: „✔ IM BESITZ“, „✔ ANGELEGT“, „✔ DABEI“ (Begleiter), „✔ FREIGESCHALTET“.

### S. Plunderkiste überarbeiten (27.09.2026) ⭐
Ist-Stand: Es werden alle 14 Plunderstücke untereinander gezeigt, auch nicht gefundene, dazu Inventar und Basteln auf derselben Seite – unübersichtlich.
111. ✅ Nur Gefundenes groß zeigen; nicht Gefundenes nur als kleine dunkle Umrisse mit „?“ und Seltenheit (Sammelreiz: „9 von 14 gefunden“) ⭐
112. ✅ Oben ein fester Platz „Angelegt“ mit dem getragenen Plunder und seinen Werten, daneben „Wechseln“ ⭐
113. ✅ Reiter statt einer langen Seite: „Meine Stücke“ · „Sammlung“ · „Basteln“ · „Lager/Material“ ⭐
114. ✅ Sortieren/Filtern: nach Seltenheit, Angriff, Verteidigung, Pfand-Bonus; Rahmenfarbe je Seltenheit ⭐
115. ✅ „Neu“-Markierung für frisch gefundene Stücke (bis man sie einmal angesehen hat) ⭐
116. ✅ Vergleich beim Antippen: Werte des Stücks gegen das angelegte (+/− farbig) ⭐
117. ✅ Doppelte mit einem Klick verkaufen oder direkt im Basar anbieten (Preisvorschlag) ⭐
118. ✅ Sets: zusammengehörige Stücke (z. B. „Bauarbeiter“: Bauhelm + Taschenlampe + Handschuh) geben Set-Bonus, Fortschritt sichtbar (verbindet mit Idee 6 Sammelalbum) ⭐
119. ✅ Öffnen-Moment: Plunderkiste aus dem Kronkorken-Tausch mit kurzer Öffnen-Animation und Seltenheits-Aufleuchten ⭐
120. ✅ Mehr Plunder für Langzeit: weitere Stücke pro Seltenheit, saisonale Stücke (Idee 8) ⭐

### T. Stadtteile vorerst sperren, später Städte (27.09.2026) ⭐
Nutzerwunsch: Die Stadtteile (Runde 6, 0015 – sind zurzeit live) bleiben vorerst gesperrt. Später wie bei Pennergame mehrere Städte, die man bewohnen kann – aber erst, wenn es genug Spieler gibt.
121. ✅ Stadtteile vorerst sperren: Menüpunkt/Karte zeigen „Bald verfügbar“ statt Revierwahl, Einfluss-Wertung pausieren; Daten und Server-Funktionen bleiben erhalten ⭐
122. ✅ Freischalten per Schalter (Admin) ab einer Spielerzahl, z. B. ab 50 aktiven Spielern ⭐
123. ✅ Später mehrere Städte (verbindet mit Idee 10): jede Stadt eigene Welt mit eigenen Ranglisten, Stadtteilen und Banden; Umzug in eine andere Stadt kostet Geld/Zeit ⭐
124. ✅ Erst wenn genug Spieler da sind: neue Stadt eröffnen, wenn die bestehende voll genug ist (Richtwert festlegen) ⭐

### U. Kiezpost: Empfänger richtig auswählen (27.09.2026) ⭐
Gemeldet: „Nachricht schreiben“ hat eine Auswahlliste mit allen Spielern (sogar dem eigenen Namen). Das skaliert nicht und ist unpraktisch.
125. ✅ Auswahlliste nur mit Freunden (und Bandenmitgliedern), eigener Name nie ⭐
126. ✅ Zusätzlich Namensfeld: Spielernamen eintippen, Vorschläge beim Tippen, Prüfung ob der Spieler existiert/einen blockiert hat ⭐
127. ✅ Von überall schreiben: auf Profilen, in Gegnerliste, Chat und Rangliste ein „Nachricht“-Knopf, der den Empfänger vorausfüllt ⭐

### V. Seite „Schnorrplätze“ neu gestalten (27.09.2026) ⭐
Nutzer: Die Seite ist noch nicht toll. Zurzeit stehen zwei ähnliche Dinge untereinander – Sammelgebiete (Bahnhofs-Hinterhof, Altglas-Gasse …, fürs Pfand) und Schnorrplätze (Englischer Garten, Hauptbahnhof …, fürs Schnorren) – das verwirrt, dazu lange Texte, Emojis (💰), Meldungen erst nach Klick.
135. ✅ Klar trennen: Reiter „Sammelgebiete (Pfand)“ und „Schnorrplätze (Kleingeld)“, jeweils mit kurzer Erklärung oben ⭐
136. ✅ Übersicht als Leiter/Weg: freigeschaltete Plätze hell, gesperrte grau mit „🔒 ab Sammelgebiet X“, der nächste freischaltbare hervorgehoben ⭐
137. ✅ Karten kurz und gleich: Foto, Name, „+0,20 € pro Spende · bis 10×“, Dauer; lange Erklärung nur einmal oben statt auf jeder Karte ⭐
138. ✅ Laufendes Schnorren direkt auf der Karte zeigen: Fortschrittsbalken + Restzeit, am Ende das Ergebnis genau dort (siehe 69g) ⭐
139. ✅ Was wirkt sichtbar machen: Mitleid des Begleiters, Sauberkeit, Rhetorik als kleine Werte („Dein Bonus: +35 %“) ⭐
140. ✅ Letzte Einnahmen pro Platz (heute verdient, bester Platz) als kleine Statistik ⭐

### 🏁 ZUM SCHLUSS – Gesamtprüfung und Durchspiel-Test Level 1 bis 150 (27.09.2026) ⭐
Nutzerwunsch: Ganz am Ende, wenn alles andere gebaut ist, noch einmal alles durchgehen.
141. ✅ Gesamtdurchgang: jede Seite, jeder Reiter, jeder Knopf auf PC und Handy – alle Punkte dieser Liste abhaken, prüfen ob die gemeldeten Fehler wirklich weg sind und ob alles zum Spiel passt (Texte, Bilder, Stil) ⭐ → Gesamtdurchsicht aller 79 Seiten/Reiter per Screenshot (PC + Handy), 19 Befunde behoben (siehe 155)
142. ✅ Testmodus nur für Testkonten wieder anlegen (wie 0010/0011): Wartezeiten überspringen, übersprungene Zeit mitzählen ⭐ → statt Live-Testmodus: lokaler Simulator mit Zeitsprung (`supabase/test/durchspiel.sh`, übersprungene Zeit = echte Spieltage), keine Testkonten im Live-Spiel nötig
143. ✅ Durchspiel-Test von Level 1 bis Level 150 mit realistischem Spielverhalten (z. B. „aktiver Spieler 3–5× am Tag“ und „Gelegenheitsspieler 1× am Tag“), jede Aktion echt über die Spielfunktionen ⭐ → aktiver Spieler (4 Besuche/Tag) und Gelegenheitsspieler (1 Besuch/Tag) über die echten Spielfunktionen
144. ✅ Dabei mitschreiben: Punkte, Geld, Werte, Level, Käufe, Wartezeiten pro Spieltag → Kurven für Geld, Punkte und Stärke über die Zeit (inkl. übersprungener Zeit = echte Spielzeit) ⭐ → Tabelle `sim_log` (Level, Punkte, Geld, Angriff, Verteidigung, Käufe, Fehler pro Tag)
145. ✅ Auswertung: Wo wird es zu zäh, wo zu leicht, wo fehlt Geld, wo ist Geld nutzlos, welche Gegenstände/Tiere sind zu stark oder nie sinnvoll → Balancing anpassen (verbindet mit P 86–92) und Test wiederholen ⭐ → Befunde: Geld explodierte ab Level ~40 → 0034 (√-Kurve); Nebenjobs sinnlos → 0036; Tiere nicht kaufbar über Sozial 45 → 0033. Ergebnis: aktiv Level 150 an Tag 558 (~1,5 Jahre), Geld bis Level ~140 knapp. Offen: Gelegenheitsspieler sammelt ~120.000 € im 1. Jahr an (Simulator kauft keine Fahrzeuge/Bande) – beobachten, ggf. späte Geldsenke
146. ✅ Danach Testmodus und Testkonten wieder entfernen (wie 0014) und Ergebnis in ROADMAP/CLAUDE.md festhalten ⭐ → nichts zu entfernen (kein Live-Testmodus, keine Testkonten angelegt); Ergebnis in BALANCING.md, ROADMAP und CLAUDE.md

### W. Ausrüstung verwalten (Nutzer, 27.09.2026) ⭐
147. ✅ Eigener Reiter „Ausrüstung“ (Mein Kiez): alle gekauften Waffen, Kleidung, Zubehör und Verteidigung mit Bild und Werten; Anlegen/Ablegen dort statt nur im Laden; angelegte Stücke je Platz oben, Kampfwerte daneben ⭐
148. ✅ Postfach: Privatnachricht aus der Chat-Leiste (z. B. „An ClaudeDesign: hi“) liegt als Kasten über dem Kartenbild und die Karte wirkt leer – Nachrichten im Postfach sauber als Liste in der Karte zeigen (Absender/Empfänger, Zeit, Antworten öffnet den Chat), nichts überlappt ⭐
149. ✅ Leiste „Als Nächstes“ lag als Kästchenreihe über dem Kopfbild (Nutzer-Screenshot) → jetzt eigene Karte „Als Nächstes“ oben in der Übersicht, als Liste (Name · Status · Knopf), Handy einspaltig
150. ✅ Reiter-Spalte rechts im selben alten Papier wie die Kopfzeile (Nutzer-Screenshot: war dunkel bzw. zu hell)
151. ✅ „Als Nächstes“: keine Leiste über dem Bild und keine Knöpfe, die sofort etwas auslösen → Liste in der Übersicht, jede Zeile führt nur zur passenden Seite/Karte
152. ✅ Seite ruckelt manchmal: Endlosschleife zwischen DOM-Beobachtern (Knopftexte/Emoji-Ersatz/alte Skripte) + Bildzuordnung bei jeder Änderung über 350 Regeln → Schreibschutz für unveränderte Texte, Bildzuordnung mit Zwischenspeicher (Leerlauf 0 Blockaden statt ~5/s, Seitenwechsel ~30 ms statt ~220 ms)
153. ✅ ROADMAP gegen alle Absprachen im Chat prüfen: fehlt etwas, das besprochen wurde? (Nutzer: „ich glaub du hast gar nicht alles rein gemacht“)
154. ✅ Alle Beschreibungen (Gegenstände, Tiere, Plunder, Jobs, Fahrzeuge, Orte, Aktionen, Meldungen) neu schreiben: assi, pennermäßig, lustig – eigener Stil, nichts von Pennergame kopieren → 0035 (≈190 Texte: Laden, Tiere, Plunder, Fahrzeuge, Sets, Stadtteile, Städte, Erfolge) + 0036 (Nebenjobs) + 20 Unterkünfte/Schnorrplätze in index.html
155. ✅ Alle Seiten durchgehen: Preise prüfen, Seiten ohne Sinn/schwache Seiten verbessern oder zusammenlegen, Aktionen die zu schnell/zu oft gleich wiederholbar sind begrenzen, falsche Knöpfe reparieren (verbindet mit 141/145) → 19 Befunde behoben (Pfand-Reiter echt statt Sprunglinks, Reiter „Sammelgebiete“ zeigte Instrumente, Laden-Reiter, doppelter Tagesauftrag, falscher Unterkunft-Titel + abgeschriebene Haustexte neu, Nebenjob-Lohn, Punkte-Anzeige, Tier-Sperre, Bilder, Lücken, Leistung)

## Runde „Durchspiel-Test“ (ab 27.09.2026) – wird nach dem Test vervollständigt
156. ✅ Kampfbereich neu (Nutzerwunsch): nach oben darf man **jeden** angreifen (auch viel höhere Level), nach unten nur bis **5 Level** unter dem eigenen – gilt für Spieler-Kampf, Tierkampf, Kiosk-Überfall und Kopfgeld
157. ✅ Stadt-Leiste (Zubehör, Supermarkt … Glücksspiel) läuft unter den Spielerkasten oben rechts – „Musikladen“ ist halb verdeckt (Nutzer-Screenshot). Leiste darf nie unter dem Kasten liegen: Platz rechts freihalten oder Leiste unter den Kasten umbrechen, am PC und Handy prüfen
158. ✅ Übersicht › Reiter „Haustier“ zeigt nur einen leeren Kasten „Dein Begleiter“ (Nutzer-Screenshot) – aktiven Begleiter mit Bild, Werten, Training anzeigen oder Reiter direkt zur Begleiter-Seite führen. Dazu im Ticker „Gerade im Kiez“: erster Eintrag ist anders eingerückt als die übrigen
159. ✅ Tierhandlung-Karten (Nutzer-Screenshot): gekauftes Tier, dessen Level-Grenze noch nicht erreicht ist, zeigt „Im Besitz“ + „Mitnehmen“ über dem Text „Benötigt Level 9“ und ist grau; Trainings-Meldung verdrängt Status/Knopf der Karte. Eindeutiger Zustand pro Karte (Besitz > Sperre), nichts übereinander

### Aus dem Durchspiel-Test (Bot über die echte Oberfläche, KiezTester, Befunde bis Level 32)
**D1 Fehler**
160. ✅ Tagesbelohnung: Meldung war unsichtbar, Serie zeigte immer 0 → Meldung am Knopf, Login-Serie, Knopf gesperrt wenn abgeholt
161. ✅ Stadt-Leiste „Glücksspiel“ öffnete Reiter Tagesauftrag
162. ✅ Unterkunft: Meldung „Eingezogen!“ verdrängte den Karteninhalt (alle Karten mit Meldung beim Knopf)
163. ✅ „Mein Profil“ (Mein Kiez) ist komplett leer
164. ✅ Übersicht: alter Profilblock zeigt falsche Werte (ATT 12/DEF 10 statt Kampfwerte, „Platzierung 20“ statt Rang, Helm als „Deine Waffe“, schwarzer Kasten statt Bild, unerklärter roter Laune-Balken)
165. ✅ Gekaufte Ausrüstung wird nicht angelegt; „Anlegen“ nur in Unterreitern → nach dem Kauf automatisch anlegen, wenn besser; Übersicht zeigt Knopf „Bestes anlegen“; „Anlegen“ bei Kleidung ohne Meldung
166. ✅ Knöpfe aktiv, obwohl es nicht geht (Weiterbildung/Tiertraining/Geldbehälter ohne Geld, Computer-Gegner und Kiezboss in der Pause) → gesperrt mit Grund + Restzeit; Kiezboss meldete in der Pause gar nichts
167. ✅ Bande gründen: keine Meldung, keine Bande
168. ✅ Rubbellos: „Gewonnen 5 €“ bei 10 € Einsatz, drei Felder zeigen „WIN“ → Gewinne erst ab Einsatz, Rest heißt Niete/Trostpreis; Gewinn über dem Geldbehälter ins Schließfach
169. ✅ Essen unter 20 % Sauberkeit verweigert ohne Hinweis → Meldung mit Link zum Waschhaus

**D2 Übersicht & Aussehen**
170. ✅ Laden „Zubehör“ zeigt zusätzlich alle Waffen (Seite ~11.000 px) → nur Zubehör
171. ✅ Lange Listen (Waffenladen, Kleidung, Tierhandlung, Karriere-Ränge) gruppieren: „Jetzt kaufbar“, „Als Nächstes“, Rest eingeklappt
172. ✅ Pfand-Seite neu ordnen: Aktionen (Tour, Verkaufen, Mülltonne, Sortieren) oben, Kurs-Tabelle klein/aufklappbar; doppelte Ausladen-Knöpfe zusammenlegen; „Gesch.: 7 (+14 %)“ verständlich; Seite springt nach „Ausladen & verkaufen“ um ~1.600 px
173. ✅ Verbrechen-Seite: eigener Titel (nicht „Pfandtour: Hinterhof“), nach Schwierigkeit sortiert, Level-Sperren sichtbar, Karten nicht so eng
174. ✅ Rangliste: Hauptliste als richtige Tabelle (Rang, Bild, Bande, Level, Punkte), eigener Platz hervorgehoben
175. ✅ Instrumente kompakt (gekaufte abgehakt statt großer grauer Knöpfe); Stadtplan-Ortsnamen ≥ 12 px; fehlende Plunder-Fotos (Arbeitshandschuhe)
176. ✅ Prüfung jeder Laden-Seite in gezielt eingestellten Zuständen (gekauft + Level zu niedrig, gesperrt, aktiv, im Training) – Fehler wie 159 fallen sonst nur zufällig auf

**D3 Balancing (Migration)**
177. ✅ Verbrechen mit Level-Grenzen (Bankraub ging ab Level 1: 450–900 €) und Bestechung/Kaution passend zur Tat (Knast war mit 8 Kronkorken egal)
178. ✅ Computer-Gegner wachsen schneller als der Spieler (Level 24: nur der schwächste schlagbar, 1 € + 4 Punkte) → Stärke relativ zum Spieler (z. B. 70–160 %), Beute/Punkte mit dem Level
179. ✅ Straßenmusik bringt ohne Aufwand mehr als eine 4-Std.-Pfandtour (Level 20: 150–250 € pro Hut) → Einnahmen/Obergrenze senken
180. ✅ Kiosk Stufe 1: 0,25 €/Std. (6 €/Tag) bei 120 € Ausbau → lohnend machen
181. ✅ Weiterbildungspreise der Nebenfähigkeiten viel zu hoch (Level 32: Sozialkontakte 1.178 €, Musik 750 € gegenüber Geschick 180 €) → angleichen; ab Level ~25 bremst sonst nur Geldmangel
182. ✅ Geldbehälter 1→2 kostet genau den vollen Behälter (20 €); Start fühlt sich zäh an
183. ✅ „Passanten anschnorren“ lohnt kaum (0,10–0,50 €, meist „Warte kurz“)
184. Gelegenheitsspieler häufen Geld an (Level 92 mit 124.000 € nach 1 Jahr) → Geldsenken (Fahrzeuge, Bande, Kosmetik, Unterhalt)

**D4 Minispiele statt nur Klicken (Nutzerwunsch)**
185. ✅ Verbrechen: „Schloss knacken“ – Zeiger im grünen Bereich stoppen, ändert die Erfolgschance
186. ✅ Rubbellos: Felder wirklich freirubbeln
187. ✅ Schnorren am Platz: Passant kommt vorbei, passenden Spruch wählen (Tourist, Oma, Anzugträger …)
188. ✅ Kampf: kurzer Reaktionsmoment („Ausweichen!“) gibt Bonus
189. ✅ Mülltonne: 3 von 9 Feldern aufdecken
190. ✅ Straßenmusik: Takt-Tippen für den Hut-Bonus
