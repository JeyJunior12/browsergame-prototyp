# Balancing – Kiezkönig (S18, Migration 0032)

Geprüft wird automatisch mit `supabase/test/test_0032.sh` (Ausreißer, Lücken, Stufenleiter, Geldbehälter).

## Leitlinien
| Bereich | Regel |
|---|---|
| Waffe | Angriff ≈ 1,35 × Level, Preis ≈ 1,2–1,25 × Level² |
| Kleidung & Schutz | Verteidigung ≈ 1,27 × Level, Preis ≈ 1,2 × Level² |
| Zubehör | Angriff ≈ 0,5 × Level, Verteidigung ≈ 0,6 × Level, Preis ≈ 1,0 × Level² |
| Begleiter | Angriff/Verteidigung ≈ 2,2 × Level, Preis ≈ 3,5 × Level² (werden per Training vervielfacht) |
| Stufenleiter | pro Kategorie spätestens alle 16 Level ein neues Stück bis Level 150; nächstes Stück nie billiger oder schwächer |
| Bastelsachen | Level-Anforderung nach Stärke (vorher alle ab Level 1) |
| Geldbehälter | jede Stufe passt in den vorherigen Behälter: 20 / 95 / 900 / 9.000 € (vorher 150 € bei 100 € Platz und 75.000 € bei 10.000 € Platz = unerreichbar) |

## Einnahmen gegen Ausgaben (Richtwerte, Pfand ⌀ 0,20 €)
Flaschen pro 10 Min. = (5 + 4 × √Straßenkenntnis + (Sack − 1) × 2) × Sammelgebiet-Faktor (1,0–2,5) – seit 0034 (vorher 0,8 × Stufe linear → Geld im Überfluss ab Level ~40).

| Level | angenommene Werte | Flaschen/Std. | € pro Tag (≈ 8 Std. Touren) | nächstes Stück | Sparzeit |
|---|---|---|---|---|---|
| 5 | Straße 5, Sack 2, Gebiet 1 | ≈ 60 | ≈ 100 € | Trillerpfeife 45 € | Stunden |
| 20 | Straße 20, Sack 4, Gebiet 3 | ≈ 250 | ≈ 400 € | Kettenschloss 455 € | ~1 Tag |
| 40 | Straße 40, Sack 6, Gebiet 4 | ≈ 550 | ≈ 900 € | Brechstange 2.000 € | ~2 Tage |
| 100 | Straße 100, Sack 10, Gebiet 5 | ≈ 1.550 | ≈ 2.500 € | Streusalz-Schleuder 13.800 € | ~5 Tage |
| 150 | Straße 150, Sack 10, Gebiet 5 | ≈ 2.150 | ≈ 3.500 € | Kiezkönig-Zepter 28.100 € | ~8 Tage |

Dazu kommen Schnorren, Nebenjobs, Kämpfe und Bande – das nächste kleine Ziel liegt damit bei Stunden bis wenigen Tagen, die großen (Fahrzeuge, Begleiter ab Level 80) bei Wochen.

## Durchspiel-Test (S19, `supabase/test/durchspiel.sh`)
Echte Spielfunktionen, Zeit per Zeitstempel-Verschiebung. Strategie: Tour → verkaufen → essen/waschen → lernen (3 in der Warteschlange) → bestes bezahlbares Stück pro Platz, bestes Tier.

| Tag | Aktiv (4 Besuche/Tag): Level · Geld | Gelegenheit (1 Besuch/Tag): Level · Geld |
|---|---|---|
| 30 | 33 · 1.017 € | 21 · 4 € |
| 90 | 66 · 1.066 € | 39 · 1.991 € |
| 180 | 101 · 7.577 € | 59 · 26.619 € |
| 365 | ~129 · ~15.000 € | 92 · 124.759 € |
| 558 | **150** (Kiezkönig-Zepter + Panzermantel gekauft) | – |

Befunde und Folgen: lineare Straßenkenntnis ließ das Geld ab Level ~40 explodieren → 0034; Nebenjobs lohnten nicht → 0036; Tiere über Sozialkontakte 45 unkaufbar → 0033.
Offen: Gelegenheitsspieler sammeln Geld an (Simulator kauft keine Fahrzeuge/Bande) – im Live-Betrieb beobachten, ggf. späte Geldsenke.

## Kampf
Angriff = Angriffstraining × 3 + Straßenkenntnis + Ausrüstung + Begleiter + Bande + Plunder + 3 × Legende.
Mit Leitwerten macht Ausrüstung (Waffe + Zubehör ≈ 1,85 × Level) rund 30 % des Angriffs aus (Training ≈ 4 × Level) – Ausrüstung zählt, Level bleibt wichtiger.
Gegner nur 80–150 % des eigenen Levels, Beute 10 % der Tasche (mit Versicherung 5 %), 3 Std. Sperre pro Gegner.

## Laden (Stand Migration 0036)

| Kategorie | Stück | Level | Preis € | Angriff | Verteidigung | Wert/Level |
|---|---|---|---|---|---|---|
| craft | Holzschild | 5 | 25 | 0 | 8 | 1.60 |
| craft | Feiner Anzug | 7 | 80 | 2 | 9 | 1.57 |
| craft | Ramponierter Anzug | 7 | 85 | 1 | 10 | 1.57 |
| craft | Kaputter Regenschirm | 9 | 95 | 0 | 12 | 1.33 |
| craft | Nagelkeule | 10 | 50 | 15 | 0 | 1.50 |
| craft | Stachelschild | 10 | 60 | 0 | 14 | 1.40 |
| craft | Doppeltes Holzschild | 12 | 60 | 0 | 16 | 1.33 |
| craft | Glasstachelschild | 16 | 110 | 0 | 22 | 1.38 |
| craft | Regenschirm | 22 | 250 | 0 | 30 | 1.36 |
| kleidung | Ausgeblichene Warnweste | 3 | 28 | 0 | 6 | 2.00 |
| kleidung | Mehrlagige Kartonrüstung | 7 | 85 | 1 | 11 | 1.71 |
| kleidung | Zerkratzter Bauhelm | 14 | 240 | 2 | 18 | 1.43 |
| kleidung | Veteranen-Wintermantel | 22 | 650 | 5 | 28 | 1.50 |
| kleidung | Flohmarkt-Lederjacke | 30 | 1080 | 2 | 38 | 1.33 |
| kleidung | Motorradkombi | 38 | 1730 | 3 | 48 | 1.34 |
| kleidung | Alte Feuerwehrjacke | 47 | 2650 | 3 | 60 | 1.34 |
| kleidung | Gebrauchte Schutzweste | 57 | 3900 | 4 | 72 | 1.33 |
| kleidung | Bundeswehr-Parka | 68 | 5550 | 5 | 86 | 1.34 |
| kleidung | Chemieschutzanzug | 80 | 7700 | 5 | 102 | 1.34 |
| kleidung | Stichschutzweste | 93 | 10400 | 6 | 118 | 1.33 |
| kleidung | Verstärkter Imkeranzug | 107 | 13700 | 7 | 136 | 1.34 |
| kleidung | Ausgemusterter Kampfmittelanzug | 121 | 17600 | 8 | 154 | 1.34 |
| kleidung | Ritterrüstung aus dem Theaterfundus | 135 | 21900 | 9 | 171 | 1.33 |
| kleidung | Kiez-Panzermantel | 150 | 27000 | 10 | 190 | 1.33 |
| waffen | Krummes Zahnstocher-Bündel | 1 | 2 | 1 | 0 | 1.00 |
| waffen | Abgebrochene Limo-Flasche | 1 | 5 | 3 | 0 | 3.00 |
| waffen | Wasserbomben | 4 | 32 | 6 | 0 | 1.50 |
| waffen | Silvesterknaller | 7 | 68 | 9 | 0 | 1.29 |
| waffen | Spraydose | 9 | 117 | 12 | 0 | 1.33 |
| waffen | Gummiknüppel | 14 | 247 | 18 | 1 | 1.36 |
| waffen | Gullideckel | 16 | 329 | 21 | 2 | 1.44 |
| waffen | Kettenschloss | 19 | 455 | 25 | 2 | 1.42 |
| waffen | Schlagring | 21 | 561 | 28 | 2 | 1.43 |
| waffen | Heizungsrohr | 23 | 678 | 31 | 3 | 1.48 |
| waffen | Hammer | 26 | 804 | 34 | 3 | 1.42 |
| waffen | Pfefferspray | 28 | 940 | 37 | 1 | 1.36 |
| waffen | Elektroschocker | 31 | 1140 | 41 | 4 | 1.45 |
| waffen | Feuerlöscher | 33 | 1295 | 44 | 5 | 1.48 |
| waffen | Schwert | 35 | 1467 | 47 | 3 | 1.43 |
| waffen | Brechstange | 40 | 2000 | 54 | 3 | 1.43 |
| waffen | Baseballschläger | 46 | 2650 | 62 | 4 | 1.43 |
| waffen | Vorschlaghammer | 52 | 3400 | 70 | 4 | 1.42 |
| waffen | Kettensäge ohne Kette | 60 | 4500 | 81 | 5 | 1.43 |
| waffen | Stuhlbein-Nunchakus | 68 | 5800 | 92 | 6 | 1.44 |
| waffen | Eishockeyschläger | 76 | 7200 | 103 | 6 | 1.43 |
| waffen | Einkaufswagen-Rammbock | 85 | 9050 | 115 | 7 | 1.44 |
| waffen | Laubbläser-Kanone | 95 | 11300 | 128 | 8 | 1.43 |
| waffen | Streusalz-Schleuder | 105 | 13800 | 142 | 9 | 1.44 |
| waffen | Gabelstaplergabel | 116 | 16800 | 157 | 10 | 1.44 |
| waffen | Mini-Abrissbirne | 128 | 20500 | 173 | 11 | 1.44 |
| waffen | Feuerwehraxt | 140 | 24500 | 189 | 12 | 1.44 |
| waffen | Stählernes Kiezkönig-Zepter | 150 | 28100 | 202 | 12 | 1.43 |
| zubehoer | Kettenhandschuhe | 2 | 15 | 2 | 3 | 2.50 |
| zubehoer | Trillerpfeife | 5 | 45 | 3 | 4 | 1.40 |
| zubehoer | Klappspaten | 8 | 95 | 7 | 3 | 1.25 |
| zubehoer | Taschenlampe | 11 | 160 | 2 | 9 | 1.00 |
| zubehoer | Survival-Rucksack | 15 | 280 | 5 | 12 | 1.13 |
| zubehoer | Funkgerät | 19 | 420 | 8 | 10 | 0.95 |
| zubehoer | Solarpanel-Set | 24 | 650 | 6 | 18 | 1.00 |
| zubehoer | Mofamotor für den Wagen | 28 | 900 | 10 | 20 | 1.07 |
| zubehoer | Gepanzerte Handkarre | 32 | 1100 | 15 | 20 | 1.09 |
| zubehoer | Nachtsichtgerät | 38 | 1440 | 19 | 23 | 1.11 |
| zubehoer | Sperrmüll-Drohne | 48 | 2300 | 24 | 29 | 1.10 |
| zubehoer | Akku-Stirnlampe | 60 | 3600 | 30 | 36 | 1.10 |
| zubehoer | Wärmebildkamera | 74 | 5500 | 37 | 44 | 1.09 |
| zubehoer | Motorisierte Sackkarre | 90 | 8100 | 45 | 54 | 1.10 |
| zubehoer | Ghettoblaster mit Bass | 99 | 9800 | 50 | 59 | 1.10 |
| zubehoer | Kiez-Funknetz | 108 | 11700 | 54 | 65 | 1.10 |
| zubehoer | Stahl-Lastenanhänger | 118 | 13900 | 59 | 71 | 1.10 |
| zubehoer | Notstromaggregat | 128 | 16400 | 64 | 77 | 1.10 |
| zubehoer | Selbstgebaute Alarmanlage | 139 | 19300 | 70 | 83 | 1.10 |
| zubehoer | Siegelring des Kiezkönigs | 150 | 22500 | 75 | 90 | 1.10 |

## Begleiter (Leben = Mitleid-Bonus beim Schnorren)

| Tier | Level | Preis € | Angriff | Verteidigung | Mitleid |
|---|---|---|---|---|---|
| Kakerlake | 1 | 0.01 | 0 | 0 | 0 |
| Goldfisch | 3 | 1.00 | 1 | 1 | 1 |
| Maus | 5 | 1.50 | 2 | 3 | 7 |
| Hamster | 7 | 3.80 | 5 | 4 | 12 |
| Wellensittich | 9 | 5.00 | 7 | 5 | 16 |
| Taube | 11 | 7.50 | 8 | 3 | 1 |
| Ratte | 13 | 15.00 | 10 | 5 | 0 |
| Hase | 15 | 22.50 | 13 | 10 | 17 |
| Frettchen | 17 | 75.00 | 18 | 15 | 19 |
| Katze | 19 | 85.00 | 25 | 20 | 32 |
| Falke | 21 | 88.00 | 27 | 25 | 22 |
| Schlange | 23 | 95.00 | 44 | 38 | 10 |
| Hausziege | 25 | 100.00 | 36 | 40 | 21 |
| Pudel | 27 | 200.00 | 26 | 29 | 62 |
| Dressierte Maus | 29 | 1200.00 | 43 | 37 | 253 |
| Adler | 31 | 300.00 | 39 | 41 | 38 |
| Schäferhund | 33 | 600.00 | 55 | 45 | 43 |
| Pitbull | 35 | 1000.00 | 65 | 59 | 1 |
| Cocker Spaniel | 37 | 1470.00 | 59 | 40 | 56 |
| Chihuahua | 39 | 2000.00 | 32 | 28 | 133 |
| Pferd | 40 | 2500.00 | 62 | 69 | 80 |
| Giraffe | 41 | 3000.00 | 71 | 82 | 98 |
| Krokodil | 42 | 4800.00 | 95 | 75 | 30 |
| Tiger | 43 | 5000.00 | 110 | 70 | 69 |
| Äffchen | 44 | 5800.00 | 52 | 43 | 230 |
| Nashorn | 45 | 7000.00 | 100 | 95 | 39 |
| Wolf | 60 | 12600.00 | 135 | 110 | 50 |
| Bär | 80 | 22400.00 | 170 | 160 | 55 |
| Löwe | 100 | 35000.00 | 225 | 170 | 60 |
| Gorilla | 125 | 55000.00 | 270 | 250 | 65 |
| Elefant | 150 | 79000.00 | 320 | 340 | 70 |

## Nebenjobs

| Job | ab Level | Dauer | Lohn |
|---|---|---|---|
| Flyer verteilen | 1 | 20 Min. | 1.20 € |
| Teller spülen | 3 | 60 Min. | 4.50 € |
| Umzugshelfer | 8 | 120 Min. | 15.00 € |
| Nachtwache am Bauzaun | 15 | 240 Min. | 45.00 € |
| Messehelfer | 30 | 480 Min. | 190.00 € |
| Kurierfahrten | 40 | 90 Min. | 55.00 € |
| Umzugsfahrer | 55 | 180 Min. | 120.00 € |
| Sperrmüll-Tour | 70 | 240 Min. | 180.00 € |
