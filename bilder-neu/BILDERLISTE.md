# Bilderliste Kiezkönig

Stand 26.09.2026 · geprüft: alle 24 Seiten mit allen Reitern + Startseite · **123 Bilder**

## Stil (wie die vorhandenen Fotos)
- **Gegenstände (512×512):** fotorealistisch, schmuddelig, ein Gegenstand mittig, dunkelbrauner Hintergrund, warmes orangefarbenes Streiflicht und Glühen, filmische Stimmung.
- **Szenen (800×500, 1600×700):** Großstadt bei Nacht, nasse Pflastersteine, Laternenlicht, Grün-/Orange-Töne.
- Immer: **kein Text, keine Buchstaben, keine Logos/Marken, keine erkennbaren echten Personen.**
- Englische Befehle funktionieren besser. Muster: `photorealistic gritty photo of <GEGENSTAND>, centered, dark brown textured background, warm orange rim light and glow, cinematic, highly detailed, no text, no letters, no logo`

## Speichern und Einbauen
- Ordner: **`bilder/`** im Projekt (neu anlegen). WebP, Qualität 80, Gegenstände max. 512 px, Szenen max. 1600 px. Ziel: unter 60 KB pro Gegenstand.
- `kiez-features.js`: Helfer `pic(datei)` → `<img class="kz-pic" src="/bilder/…" alt="" loading="lazy" width="512" height="512">` als erstes Kind der Karte; Emoji aus dem Titel entfernen.
- `index.html` (CRLF erhalten!): Startseite, Sammelgebiete, Erfolge, Ränge, Verteidigung – dort gibt es schon `.generated-item-thumb`; per CSS in `kiez-theme.css` `background-image:url(/bilder/…)` je Karte setzen (Muster: Regeln `.card[data-spot=…]` am Ende von `kiez-theme.css`).
- Danach prüfen: `test/browser/crawl.js` (LEER 0), Screenshot Handy + PC.

## A · Startseite (ausgeloggt) – bisher 0 Bilder, nur Emojis

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Kopfbereich | Titelbild | Nächtliche Kiezstraße, nasse Pflastersteine, Pfandflaschen am Bordstein, warmes Laternenlicht, Kiosk im Hintergrund | start-hero.webp | 1600×700 |
| „Pfand sammeln & verkaufen“ | Emoji 🛒 | Einkaufswagen voller Pfandflaschen in einer Seitengasse | start-pfand.webp | 800×500 |
| „Weiterbilden & aufsteigen“ | Emoji 🎓 | Stapel zerlesener Bücher und Kerze auf einer Parkbank | start-weiterbilden.webp | 800×500 |
| „Kämpfe & Tierkämpfe“ | Emoji 👊 | Bandagierte Fäuste, daneben ein struppiger Hund, Hinterhof | start-kampf.webp | 800×500 |
| „Banden & Bandenkriege“ | Emoji 👥 | Gruppe Silhouetten unter einer Brücke, Feuertonne | start-bande.webp | 800×500 |
| „Plunder, Kronkorken & Lotto“ | Emoji 🎁 | Holzkiste mit Krimskrams, Kronkorken, Lottokugeln | start-plunder.webp | 800×500 |
| „Wettbewerbe & Erfolge“ | Emoji 🏆 | Verbeulter Blechpokal auf Bierkisten, Scheinwerferlicht | start-wettbewerb.webp | 800×500 |

Die 4 kleinen Schritte oben (Pfand sammeln, Begleiter, Aufsteigen, Bande) nutzen dieselben Bilder klein.

## B · Profil

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Profilkopf ohne eigenes Profilbild | leer | Standard-Silhouette: Figur mit Kapuze unter Laterne, von hinten | profil-standard.webp | 512×512 |
| Dein Spendenlink | Emoji 💰 | Umgedrehter Hut mit Münzen auf dem Gehweg | profil-spende.webp | 512×512 |
| Profil bearbeiten | Emoji ✏️ | Füller auf zerknittertem Notizblock | profil-bearbeiten.webp | 512×512 |
| Gästebuch | Emoji 📖 | Aufgeschlagenes altes Lederbuch mit Kritzeleien (unlesbar) | profil-gaestebuch.webp | 512×512 |

## C · Plunderkiste und Lager – 13 Plunderstücke ohne Bild (Taubenpfeife hat schon eins)

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Kronkorkenkette | kein Bild | Halskette aus Kronkorken | plunder-kronkorkenkette.webp | 512×512 |
| Krone aus Alufolie | kein Bild | Krone aus zerknüllter Alufolie | plunder-alufolienkrone.webp | 512×512 |
| Einzelner Handschuh | kein Bild | Einzelner abgewetzter Wollhandschuh | plunder-ein_handschuh.webp | 512×512 |
| Rostiger Schlüssel | kein Bild | Großer rostiger Schlüssel | plunder-rostiger_schluessel.webp | 512×512 |
| Plastikblume | kein Bild | Staubige Plastikblume im gesprungenen Topf | plunder-plastikblume.webp | 512×512 |
| Taschenlampe ohne Batterie | kein Bild | Taschenlampe mit offenem Batteriefach | plunder-taschenlampe.webp | 512×512 |
| Fahrradkette | kein Bild | Ölige, aufgerollte Fahrradkette | plunder-fahrradkette.webp | 512×512 |
| Dosenpanzer | kein Bild | Brustpanzer aus zerdrückten Dosen (ohne Etiketten) | plunder-dosenpanzer.webp | 512×512 |
| Glücks-Pfandbon | kein Bild | Vergilbter Pfandbon mit Kleeblatt | plunder-glueckspfandbon.webp | 512×512 |
| Zerfledderter Stadtplan | kein Bild | Zerrissener, fleckiger Stadtplan | plunder-stadtplan.webp | 512×512 |
| Bauhelm mit Lampe | kein Bild | Gelber Bauhelm mit brennender Stirnlampe | plunder-bauhelm.webp | 512×512 |
| Goldene Pfanddose | kein Bild | Leuchtende goldene Getränkedose | plunder-goldene_dose.webp | 512×512 |
| Kiezzepter | kein Bild | Besenstiel-Zepter mit Glitzer und Stern | plunder-kiezzepter.webp | 512×512 |
| Dein Inventar | kein Bild | Prall gefüllter Jutesack mit Flaschen, Nägeln, Holz, Stoff | lager-inventar.webp | 512×512 |
| Holzschild | kein Bild | Schild aus alten Holzlatten | basteln-holzschild.webp | 512×512 |
| Stachelschild | kein Bild | Holzschild mit Nägeln gespickt | basteln-stachelschild.webp | 512×512 |
| Glasstachelschild | kein Bild | Holzschild mit Glasscherben | basteln-glasstachelschild.webp | 512×512 |
| Doppeltes Holzschild | kein Bild | Doppelt verstärktes Holzschild | basteln-doppelschild.webp | 512×512 |
| Ramponierter Anzug | kein Bild | Zerschlissener Anzug auf Kleiderbügel | basteln-anzug-alt.webp | 512×512 |
| Feiner Anzug | kein Bild | Geflickter, aber feiner Anzug | basteln-anzug-fein.webp | 512×512 |
| Kaputter Regenschirm | kein Bild | Regenschirm mit gebrochenen Speichen | basteln-schirm-kaputt.webp | 512×512 |
| Regenschirm | kein Bild | Reparierter Regenschirm | basteln-schirm.webp | 512×512 |

## D · Kronkorken-Tausch

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Dein Vorrat | Emoji 🧢 | Handvoll glänzender Kronkorken | kk-vorrat.webp | 512×512 |
| Energydrink | Emoji ⚡ | Energydose ohne Marke mit Blitz | kk-energie.webp | 512×512 |
| Heiße Dusche | Emoji 🚿 | Dampfender Duschkopf | kk-dusche.webp | 512×512 |
| Starker Kaffee | Emoji ☕ | Angeschlagene Tasse schwarzer Kaffee mit Dampf | kk-kaffee.webp | 512×512 |
| Wärter bestechen | Emoji 🔑 | Geldscheinbündel neben Gefängnis-Schlüsselbund | kk-knast.webp | 512×512 |
| Plunderkiste | Emoji 🎁 | Überquellende Holzkiste mit Krimskrams | kk-plunderkiste.webp | 512×512 |

## E · Banden

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Eigene Bande gründen | Emoji 🏴 | Schwarze Flagge mit Kronkorken-Symbol an Holzstange | bande-gruenden.webp | 512×512 |
| Banden im Kiez | kein Bild | Graffiti-Backsteinwand bei Nacht (ohne Schrift) | bande-liste.webp | 512×512 |
| Bandenkrieg | Emoji ⚔️ | Zwei gekreuzte Holzlatten vor Feuertonne | bande-krieg.webp | 512×512 |
| Bandenchat | Emoji 💬 | Zwei alte Funkgeräte | bande-chat.webp | 512×512 |
| Mitglieder | Emoji 👥 | Silhouetten einer Gruppe unter Brücke | bande-mitglieder.webp | 512×512 |
| Bandenkasse / Protokoll | Emoji 📜 | Verbeulte Blechkasse mit Münzen, Notizbuch | bande-kasse.webp | 512×512 |

Die letzten 4 sieht man nur als Bandenmitglied.

## F · Kiez-Brett und Freunde

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Kiez-Brett (Schreiben) | leerer Kasten | Korkbrett mit Zetteln und Reißzwecken | brett.webp | 512×512 |
| Freunde / Spieler suchen | Emoji 🔎 | Lupe über Stadtplan | freunde-suche.webp | 512×512 |
| Deine Freunde | Emoji 🤝 | Handschlag mit fingerlosen Handschuhen | freunde.webp | 512×512 |

## G · Wettbewerb und Rangliste

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Wetter heute | Emoji 🌦 | Straßenlaterne im Regen mit Pfütze | wetter.webp | 512×512 |
| Events | Emoji 🎉 | Lichterkette über einer Gasse | events.webp | 512×512 |
| Wochenwettbewerb | Emoji 🏆 | Verbeulter Blechpokal | wettbewerb-pokal.webp | 512×512 |
| Banden-Highscore | Emoji 👥 | Kleines Holz-Siegertreppchen | wettbewerb-banden.webp | 512×512 |

## H · Erfolge – 34 Karten teilen sich 4 Fotos (29× dasselbe)

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Erster Sack | gleiches Foto | Plastiktüte mit ein paar Pfandflaschen | erfolg-01.webp | 512×512 |
| Pfandbaron | gleiches Foto | Kiste voller Pfandflaschen | erfolg-02.webp | 512×512 |
| Containerkönig | gleiches Foto | Überquellender Glascontainer | erfolg-03.webp | 512×512 |
| Flaschenflüsterer | gleiches Foto | Hand hält Flasche ans Ohr | erfolg-04.webp | 512×512 |
| Pfandlegende | gleiches Foto | Golden leuchtender Flaschenberg | erfolg-05.webp | 512×512 |
| Kiezbekannt | gleiches Foto | Straßenschild mit Stern-Aufkleber | erfolg-06.webp | 512×512 |
| Kiezlegende | gleiches Foto | Abgewetzte Medaille am Band | erfolg-07.webp | 512×512 |
| Stadtgespräch | gleiches Foto | Zerknitterte Zeitung (ohne Schrift) | erfolg-08.webp | 512×512 |
| Kiezfürst | gleiches Foto | Siegelring mit Kronkorken | erfolg-09.webp | 512×512 |
| Kiezkönig | gleiches Foto | Kronkorken-Krone auf Samtkissen | erfolg-10.webp | 512×512 |
| Erste Schelle | gleiches Foto | Faust im fingerlosen Handschuh | erfolg-11.webp | 512×512 |
| Hinterhof-Boxer | gleiches Foto | Boxbandagen an rostigem Nagel | erfolg-12.webp | 512×512 |
| Kiezschläger | gleiches Foto | Schlagring aus Kronkorken | erfolg-13.webp | 512×512 |
| Unbesiegbar | gleiches Foto | Mülltonnendeckel als Schild | erfolg-14.webp | 512×512 |
| Kleingeldkönig | gleiches Foto | Häufchen Kupfermünzen | erfolg-15.webp | 512×512 |
| Geldsack | gleiches Foto | Praller Jute-Geldsack | erfolg-16.webp | 512×512 |
| Großverdiener | gleiches Foto | Dickes Geldbündel mit Gummiband | erfolg-17.webp | 512×512 |
| Schlagkräftig | gleiches Foto | Angespannter Arm mit Flaschen-Tattoo | erfolg-18.webp | 512×512 |
| Dickes Fell | gleiches Foto | Dicke Lederjacke | erfolg-19.webp | 512×512 |
| Kiezdiplomat | gleiches Foto | Handschlag über Kaffeebechern | erfolg-20.webp | 512×512 |
| Straßenmusiker | gleiches Foto | Gitarre mit Hut davor | erfolg-21.webp | 512×512 |
| Eigenes Dach | gleiches Foto | Zelt unter Brücke mit warmem Licht | erfolg-22.webp | 512×512 |
| Burgherr | gleiches Foto | Kleine Burg aus Kartons | erfolg-23.webp | 512×512 |
| Stadtkenner | gleiches Foto | Stadtplan mit vielen Routen | erfolg-24.webp | 512×512 |
| Stammgast | gleiches Foto | Kalenderblatt, jeder Tag angekreuzt | erfolg-25.webp | 512×512 |
| Urgestein | gleiches Foto | Alte Taschenuhr mit Sprung | erfolg-26.webp | 512×512 |
| Tierfreund | gleiches Foto | Struppiger Hund schaut hoch | erfolg-27.webp | 512×512 |
| Tierflüsterer | gleiches Foto | Taube frisst aus der Hand | erfolg-28.webp | 512×512 |
| Sammler | gleiches Foto | Schrank voller Krimskrams | erfolg-29.webp | 512×512 |
| Plunderkönig | gleiches Foto | Zepter aus Schrott | erfolg-30.webp | 512×512 |
| Beliebt | gleiches Foto | Kreideherz auf dem Pflaster | erfolg-31.webp | 512×512 |
| Bandenmitglied | gleiches Foto | Lederjacke mit Aufnäher (ohne Schrift) | erfolg-32.webp | 512×512 |
| Spendenmagnet | gleiches Foto | Hut voller Münzen und Scheine | erfolg-33.webp | 512×512 |
| Unterwelt | gleiches Foto | Dunkler Gasseneingang mit rotem Licht | erfolg-34.webp | 512×512 |
| Kommende Meilensteine | Emoji 🎯 | Kreidestriche und Zielscheibe an Wand | erfolg-meilensteine.webp | 512×512 |

Gesperrte Erfolge: dasselbe Bild grau per CSS – kein zweites Bild nötig. Das 🔒 vor dem Namen durch das graue Bild ersetzen.

## I · Karriere-Ränge – 14 von 15 zeigen dasselbe Foto

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| 1. Tüten-Neuling | gleiches Foto | Zerrissene Plastiktüte im Regen | rang-01.webp | 512×512 |
| 2. Pfand-Schnüffler | gleiches Foto | Hundenase schnüffelt an Flasche | rang-02.webp | 512×512 |
| 3. Parkbank-Profi | gleiches Foto | Parkbank bei Nacht mit Zeitungsdecke | rang-03.webp | 512×512 |
| 4. Kiosk-Bekannter | gleiches Foto | Kioskfenster bei Nacht, warmes Licht | rang-04.webp | 512×512 |
| 5. Kiezgestalt | gleiches Foto | Kapuzenfigur unter Laterne | rang-05.webp | 512×512 |
| 6. Gassen-Kapitän | gleiches Foto | Kapitänsmütze auf Kartonstapel | rang-06.webp | 512×512 |
| 7. Hinterhof-Boss | gleiches Foto | Thron aus alten Reifen im Hinterhof | rang-07.webp | 512×512 |
| 8. Viertel-Schreck | gleiches Foto | Bedrohlicher Schatten an Hauswand | rang-08.webp | 512×512 |
| 9. Straßen-Veteran | gleiches Foto | Abgewetzte Medaille und Hundemarke | rang-09.webp | 512×512 |
| 10. Asphalt-Baron | gleiches Foto | Zylinder auf Flaschenstapel | rang-10.webp | 512×512 |
| 11. Unterwelt-Promi | gleiches Foto | VIP-Band auf Kneipentresen (ohne Schrift) | rang-11.webp | 512×512 |
| 12. Pfand-Magnat | gleiches Foto | Tresor voller Pfandflaschen | rang-12.webp | 512×512 |
| 13. Stadtteil-Legende | gleiches Foto | Statue eines Straßenhelden mit Flasche | rang-13.webp | 512×512 |
| 14. Beton-Kaiser | gleiches Foto | Krone aus Beton und Baustahl | rang-14.webp | 512×512 |
| 15. KiezKönig | gleiches Foto | Goldener Thron aus Flaschenkisten | rang-15.webp | 512×512 |

## J · Einstellungen

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Profilbild | Emoji 🖼 | Alte Sofortbildkamera, Foto kommt raus | einst-profilbild.webp | 512×512 |
| Name ändern | Emoji ✏️ | Verbeultes leeres Namensschild an Tür | einst-name.webp | 512×512 |
| Passwort ändern | Emoji 🔑 | Schweres rostiges Vorhängeschloss | einst-passwort.webp | 512×512 |
| Abmelden | Emoji 🚪 | Halb offene Holztür mit Licht dahinter | einst-abmelden.webp | 512×512 |

## K · Glücksspiel

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Kiez-Lotto | gleiches Foto wie Rubbellose | Lottokugeln in kleiner Drahttrommel | lotto.webp | 512×512 |

## L · Sammelgebiete (Stadt & Einkommen → Schnorrplätze, obere Karten)

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Bahnhofs-Hinterhof | kein Bild | Hinterhof am Bahnhof, Gleise, Graffiti | gebiet-bahnhof.webp | 800×500 |
| Altglas-Gasse | kein Bild | Gasse mit Altglascontainern | gebiet-altglas.webp | 800×500 |
| Ranziger Stadtpark | kein Bild | Verwahrloster Park bei Nacht, Bank, Müll | gebiet-park.webp | 800×500 |
| Touristenmeile | kein Bild | Belebte Einkaufsstraße mit Souvenirständen | gebiet-touristen.webp | 800×500 |
| Luxusviertel-Hintereingang | kein Bild | Hintereingang eines Nobelhotels, Limousine | gebiet-luxus.webp | 800×500 |

## M · Laden → Verteidigung – 14 Sachen teilen sich 7 Fotos

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Elektrozaun aufstellen | doppeltes Foto | Improvisierter Elektrozaun mit Kabeln | vert-elektrozaun.webp | 512×512 |
| Fischernetz spannen | doppeltes Foto | Gespanntes Fischernetz in Gasse | vert-fischernetz.webp | 512×512 |
| Stacheldraht aufstellen | doppeltes Foto | Rolle Stacheldraht | vert-stacheldraht.webp | 512×512 |
| Selbstschussanlagen | doppeltes Foto | Selbstgebaute Konfetti-Kanone aus Rohren | vert-selbstschuss.webp | 512×512 |
| Wassergraben | doppeltes Foto | Wassergefüllter Graben vor Zelt | vert-wassergraben.webp | 512×512 |
| Fallgruben buddeln | doppeltes Foto | Mit Pappe abgedeckte Grube | vert-fallgrube.webp | 512×512 |
| Schlingfalle mit Bierköder | doppeltes Foto | Seilschlinge mit Bierflasche als Köder | vert-schlingfalle.webp | 512×512 |

Die jeweils ersten 7 behalten ihr Foto.

## N · Kleinigkeiten (optional, niedrige Priorität)

| Stelle | jetzt | Bild-Vorschlag | Datei | Größe |
|---|---|---|---|---|
| Übersicht: Freunde einladen | Emoji 📣 | Megafon an Laterne | klein-werben.webp | 512×512 |
| Übersicht: Container | Emoji 📦 | Blechdose als Spendenbehälter | klein-container.webp | 512×512 |
| Instrument / Gitarre | gleiches Foto | Grashalmflöte → Grashalm zwischen Fingern | klein-grashalm.webp | 512×512 |
| Park / Parkbank | gleiches Foto | Wiese mit Pappkarton-Lager | klein-park.webp | 512×512 |
