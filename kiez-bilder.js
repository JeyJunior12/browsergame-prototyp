// Kiezkönig – eigene Fotos (Ordner /bilder) den Karten zuordnen.
// Karten werden von vielen Skripten neu gezeichnet, deshalb per MutationObserver nach Titel zuordnen.
// Vorhandene Vorschaubilder (.generated-item-thumb/.asset-thumb) bekommen das Foto per CSS-Variable --kzbild
// (Regel in kiez-theme.css), fehlende werden als .kz-pic ergänzt. Emoji vor dem Titel fällt weg.
(() => {
  const CARD = '.card, .activity-card, .lead-card, .kf-box, .profile-wide-row, .drink';
  // [Bereich, Titel (RegExp), Datei]  – Titel = erstes b/h3/h4 der Karte; Bereich mit '=' = Selektor der Karte selbst
  const R = [
    // Profil
    ['#profil', /Dein Spendenlink/, 'profil-spende'],
    ['#profil', /Profil bearbeiten/, 'profil-bearbeiten'],
    ['#profil', /Gästebuch/, 'profil-gaestebuch'],
    // Plunderkiste, Inventar, Basteln
    ['#plunder', /^Kronkorkenkette/, 'plunder-kronkorkenkette'],
    ['#plunder', /^Krone aus Alufolie/, 'plunder-alufolienkrone'],
    // Plunder ohne eigenes Foto (Durchspiel-Test 175) – Ersatzbild, bis das neue erzeugt ist
    ['#plunder', /^Abgebrannte Wunderkerze/, 'plunder-wunderkerze|plunder-taschenlampe'], ['#plunder', /^Arbeitshandschuhe/, 'plunder-arbeitshandschuhe|plunder-ein_handschuh'],
    ['#plunder', /^Goldkette/, 'plunder-goldkette|plunder-kronkorkenkette'], ['#plunder', /^Kaputte Sonnenbrille/, 'plunder-sonnenbrille|plunder-rostiger_schluessel'],
    ['#plunder', /^Kürbislaterne/, 'plunder-kuerbislaterne|plunder-plastikblume'], ['#plunder', /^Lebkuchenherz/, 'plunder-lebkuchenherz|plunder-plastikblume'],
    ['#plunder', /^Leeres Feuerzeug/, 'plunder-feuerzeug|plunder-taschenlampe'], ['#plunder', /^Megafon/, 'plunder-megafon|plunder-taschenlampe'],
    ['#plunder', /^Schoko-Osterhase/, 'plunder-osterhase|plunder-goldene_dose'], ['#plunder', /^Tüte Taubenfutter/, 'plunder-taubenfutter|plunder-taubenpfeife'],
    ['#plunder', /^Wasserpistole/, 'plunder-wasserpistole|waffe-wasserbomben'], ['#plunder', /^Weihnachtsmütze/, 'plunder-weihnachtsmuetze|plunder-alufolienkrone'],
    ['#plunder', /^Einzelner Handschuh/, 'plunder-ein_handschuh'],
    ['#plunder', /^Rostiger Schlüssel/, 'plunder-rostiger_schluessel'],
    ['#plunder', /^Plastikblume/, 'plunder-plastikblume'],
    ['#plunder', /^Taschenlampe/, 'plunder-taschenlampe'],
    ['#plunder', /^Fahrradkette/, 'plunder-fahrradkette'],
    ['#plunder', /^Dosenpanzer/, 'plunder-dosenpanzer'],
    ['#plunder', /^Glücks-Pfandbon/, 'plunder-glueckspfandbon'],
    ['#plunder', /^Zerfledderter Stadtplan/, 'plunder-stadtplan'],
    ['#plunder', /^Bauhelm/, 'plunder-bauhelm'],
    ['#plunder', /^Goldene Pfanddose/, 'plunder-goldene_dose'],
    ['#plunder', /^Kiezzepter/, 'plunder-kiezzepter'],
    ['#plunder', /^Dein Inventar/, 'lager-inventar'],
    ['#plunder', /^Holzschild/, 'basteln-holzschild'],
    ['#plunder', /^Stachelschild/, 'basteln-stachelschild'],
    ['#plunder', /^Glasstachelschild/, 'basteln-glasstachelschild'],
    ['#plunder', /^Doppeltes Holzschild/, 'basteln-doppelschild'],
    ['#plunder', /^Ramponierter Anzug/, 'basteln-anzug-alt'],
    ['#plunder', /^Feiner Anzug/, 'basteln-anzug-fein'],
    ['#plunder', /^Kaputter Regenschirm/, 'basteln-schirm-kaputt'],
    ['#plunder', /^Regenschirm/, 'basteln-schirm'],
    // S4: Infokästen ohne Bild
    ['#training', /^Lernwarteschlange/, 'training-parallel'],
    ['body', /^Deine Kampfwerte/, 'kampf-staerke'],
    // Kronkorken
    ['#kronkorken', /^Dein Vorrat/, 'kk-vorrat'],
    ['#kronkorken', /^Energydrink/, 'kk-energie'],
    ['#kronkorken', /^Heiße Dusche/, 'kk-dusche'],
    ['#kronkorken', /^Starker Kaffee/, 'kk-kaffee'],
    ['#kronkorken', /^Wärter bestechen/, 'kk-knast'],
    ['#kronkorken', /^Plunderkiste/, 'kk-plunderkiste'],
    // Banden
    ['#gangs', /^Eigene Bande gründen/, 'bande-gruenden'],
    ['#gangs', /^Banden im Kiez/, 'bande-liste'],
    ['#gangs', /^Bandenkrieg/, 'bande-krieg'],
    ['#gangs', /^Bandenchat/, 'bande-chat'],
    ['#gangs', /^Mitglieder/, 'bande-mitglieder'],
    ['#gangs', /^(Bandenkasse|Protokoll)/, 'bande-kasse'],
    // Runde 6: Stadtteile, Basar, Zockerbude, Schließfach, Kiez-Geschichte, Chat, Kampfprotokoll, Titel
    ['#stadtteile', /^Dein Revier/, 'start-bande'],
    ['#stadtteile', /^Stadtteile – bald/, 'bande-krieg'],
    ['#bandenhaus', /Bandenlevel/, 'bande-liste'], ['#bandenhaus', /^Wochenaufgaben/, 'bande-kasse'], ['#bandenhaus', /^Wer hat/, 'bande-mitglieder'],
    ['#bandenhaus', /^Bandenhaus überfallen/, 'bande-krieg'], ['#bandenhaus', /^Letzte Kriege/, 'bande-krieg'], ['#bandenhaus', /^Kriegs-Rangliste/, 'bande-liste'],
    ['#bandenhaus', /^Verbündete/, 'bande-gruenden'], ['#bandenhaus', /^Bandenforum|^Neues Thema/, 'bande-chat'], ['#bandenhaus', /^Mitglieder/, 'bande-mitglieder'],
    ['#bandenhaus', /^Aus der Kasse/, 'bande-kasse'], ['#bandenhaus', /^Bandenboss/, 'kampf-gegner'], ['#bandenhaus', /^Banden-Saison/, 'bande-liste'],
    ['#bandenhaus', /^Bandenprofil|^Rechte/, 'bande-gruenden'], ['#bandenhaus', /^Kneipe/, 'essen-dosenbier'], ['#bandenhaus', /^Trainingsraum/, 'szene-training'],
    ['#bandenhaus', /^Zwinger/, 'szene-tiere'], ['#bandenhaus', /^Werkstatt/, 'basteln-doppelschild'], ['#bandenhaus', /^Lager/, 'lager-inventar'], ['#bandenhaus', /^Tresor/, 'laden-geldversteck'],
    ['#bandenhaus', /^Kein Bandenhaus/, 'bande-gruenden'], ['#bandenhaus', /^Krieg:|^Euer Überfall|^Überfall von/, 'bande-krieg'],
    ['#begging', /^Dein Zustand/, 'pflege-katzenwaesche'], ['#apotheke', /^Krankheit/, 'stadt-apotheke'],
    ['#plunder', /^Angelegt/, 'lager-inventar'], ['#plunder', /^Sammlung/, 'kk-plunderkiste'],
    ['#overview', /^Gerade im Kiez/, 'mission-heute'], ['#missions', /^Heute: 3 Aufgaben/, 'mission-heute'], ['#einstellungen', /^Hinweise/, 'post-fach'],
    ['#ausruestung', /^Angelegt/, 'lager-inventar'], ['#ausruestung', /^Deine Kampfwerte/, 'kampf-staerke'],
    ['#plunder', /^Bauarbeiter/, 'plunder-bauhelm'], ['#plunder', /^Kiezadel/, 'plunder-kiezzepter'], ['#plunder', /^Taubenkönig/, 'plunder-taubenpfeife'],
    ['#plunder', /^Pfandjäger/, 'plunder-goldene_dose'], ['#plunder', /^Straßenkämpfer/, 'plunder-fahrradkette'],
    ['#stadtteile', /^Bahnhofsviertel/, 'gebiet-bahnhof'], ['#stadtteile', /^Altstadt/, 'gebiet-touristen'], ['#stadtteile', /^Hafen/, 'heim-kran'],
    ['#stadtteile', /^Stadtpark/, 'gebiet-park'], ['#stadtteile', /^Marktplatz/, 'schnorr-fussgaengerzone'], ['#stadtteile', /^Villenviertel/, 'gebiet-luxus'],
    ['#basar', /^Plunder anbieten/, 'lager-inventar'], ['#basar', /^Deine Angebote/, 'kk-plunderkiste'],
    ['#zockerbude', /^Hütchenspiel/, 'zocker-huetchen|stadt-gluecksspiel'], ['#zockerbude', /^Würfelduell/, 'zocker-wuerfel|stadt-gluecksspiel'],
    ['#schliessfach', /^Dein Schließfach/, 'laden-geldversteck'], ['#schliessfach', /^Bargeld in der Tasche/, 'ausbau-2'],
    ['#schliessfach', /^Einzahlen/, 'profil-spende'], ['#schliessfach', /^Abheben/, 'bande-kasse'],
    ...['erfolg-01', 'skill-sprechen', 'skill-angriff', 'erfolg-27', 'erfolg-11', 'erfolg-04', 'erfolg-19', 'erfolg-32', 'erfolg-31', 'erfolg-29',
      'erfolg-24', 'erfolg-12', 'uebersicht-aufstieg', 'verbrechen-einbruch', 'erfolg-22', 'erfolg-02', 'erfolg-10'].map((f, i) => ['#geschichte', new RegExp('^Kapitel ' + (i + 1) + ':'), f]),
    ['#geschichte', /^Geschaffte Kapitel/, 'erfolg-meilensteine'], ['#geschichte', /^Geschichte durchgespielt/, 'rang-15'],
    ['#chat', /^Nachricht an alle/, 'post-schreiben'], ['#chat', /^Im Chat/, 'bande-chat'],
    ['#kampfprotokoll', /^Angriffe/, 'kampf-staerke'], ['#kampfprotokoll', /^Verteidigungen/, 'kampf-verteidigung'],
    ['#kampfprotokoll', /^Beute/, 'bande-kasse'], ['#kampfprotokoll', /^Letzte Kämpfe/, 'kampf-gegner'],
    ['#einstellungen', /^Titel/, 'erfolg-07'],
    // Kiez-Brett und Freunde
    ['=#brett .kf-box:has(.bpost)', /.*/, 'brett'],
    ['#freunde', /^Spieler suchen/, 'freunde-suche'],
    ['#freunde', /^Deine Freunde/, 'freunde'],
    // Wettbewerb
    ['#wettbewerb', /^Wetter heute/, 'wetter'],
    ['#wettbewerb', /^Events/, 'events'],
    ['#wettbewerb', /^Wochenwettbewerb/, 'wettbewerb-pokal'],
    ['#wettbewerb', /^Banden-Highscore/, 'wettbewerb-banden'],
    // Erfolge (Reihenfolge wie achievement_defs)
    ...['Erster Sack', 'Pfandbaron', 'Containerkönig', 'Flaschenflüsterer', 'Pfandlegende', 'Kiezbekannt', 'Kiezlegende',
      'Stadtgespräch', 'Kiezfürst', 'Kiezkönig', 'Erste Schelle', 'Hinterhof-Boxer', 'Kiezschläger', 'Unbesiegbar',
      'Kleingeldkönig', 'Geldsack', 'Großverdiener', 'Schlagkräftig', 'Dickes Fell', 'Kiezdiplomat', 'Straßenmusiker',
      'Eigenes Dach', 'Burgherr', 'Stadtkenner', 'Stammgast', 'Urgestein', 'Tierfreund', 'Tierflüsterer', 'Sammler',
      'Plunderkönig', 'Beliebt', 'Bandenmitglied', 'Spendenmagnet', 'Unterwelt']
      .map((n, i) => ['#achievementlist', new RegExp('^' + n + '$'), 'erfolg-' + String(i + 1).padStart(2, '0')]),
    ['#achievements', /^Kommende Meilensteine/, 'erfolg-meilensteine'],
    // Karriere-Ränge
    ...['Tüten-Neuling', 'Pfand-Schnüffler', 'Parkbank-Profi', 'Kiosk-Bekannter', 'Kiezgestalt', 'Gassen-Kapitän',
      'Hinterhof-Boss', 'Viertel-Schreck', 'Straßen-Veteran', 'Asphalt-Baron', 'Unterwelt-Promi', 'Pfand-Magnat',
      'Stadtteil-Legende', 'Beton-Kaiser', 'KiezKönig']
      .map((n, i) => ['#rankladder', new RegExp('^' + (i + 1) + '\\. ' + n), 'rang-' + String(i + 1).padStart(2, '0')]),
    // Einstellungen
    ['#einstellungen', /^Profilbild/, 'einst-profilbild'],
    ['#einstellungen', /^Name ändern/, 'einst-name'],
    ['#einstellungen', /^Passwort ändern/, 'einst-passwort'],
    ['#einstellungen', /^Abmelden/, 'einst-abmelden'],
    // Glücksspiel
    ['#missions', /^Kiez-Lotto/, 'lotto'],
    // Verteidigung (die ersten 7 behalten ihr Foto)
    ['body', /^Elektrozaun aufstellen/, 'vert-elektrozaun'],
    ['body', /^Fischernetz spannen/, 'vert-fischernetz'],
    ['body', /^Stacheldraht aufstellen/, 'vert-stacheldraht'],
    ['body', /^Selbstschussanlagen/, 'vert-selbstschuss'],
    ['body', /^Wassergraben/, 'vert-wassergraben'],
    ['body', /^Fallgruben buddeln/, 'vert-fallgrube'],
    ['body', /^Schlingfalle/, 'vert-schlingfalle'],
    // Kleinigkeiten
    ['#overview', /^Freunde in den Kiez einladen/, 'klein-werben'],
    ['#overview', /Container/, 'klein-container'],
    ['body', /^Grashalmflöte/, 'klein-grashalm'],
    ['body', /^Park$/, 'klein-park'],
    // ===== Runde 2: alte Sprite-Bilder =====
    // Stadtplan
    ...[['Zubehör', 'zubehoer'], ['Supermarkt', 'supermarkt'], ['Tierhandlung', 'tierhandlung'], ['Waffenladen', 'waffenladen'],
      ['Apotheke', 'apotheke'], ['Waschhaus', 'waschhaus'], ['Schnorrplätze', 'schnorrplaetze'], ['Musikladen', 'musikladen'],
      ['Eigenheime', 'eigenheime'], ['Glücksspiel', 'gluecksspiel']].map(([n, f]) => ['#citymap', new RegExp('^' + n + '$'), 'stadt-' + f]),
    // Apotheke
    ['=.pharmacy-card.pharmacy-pump', /.*/, 'apo-magenpumpe'],
    ['=.pharmacy-card.pharmacy-insurance', /.*/, 'apo-versicherung'],
    // Laden
    ...[['Mottenzerfressene Jacke', 'laden-jacke'], ['Halber Regenschirm', 'laden-schirm-halb'], ['Getunter Einkaufswagen', 'laden-wagen'],
      ['Ausgeblichene Warnweste', 'laden-warnweste'], ['Mehrlagige Kartonrüstung', 'laden-kartonruestung'], ['Zerkratzter Bauhelm', 'laden-bauhelm'],
      ['Veteranen-Wintermantel', 'laden-wintermantel'], ['Mofamotor für den Wagen', 'laden-mofamotor'], ['Unheimliche Glücksflasche', 'laden-gluecksflasche'],
      ['Kettenhandschuhe', 'laden-kettenhandschuhe'], ['Trillerpfeife', 'laden-trillerpfeife'], ['Klappspaten', 'laden-klappspaten'],
      ['Taschenlampe', 'laden-taschenlampe'], ['Survival-Rucksack', 'laden-rucksack'], ['Funkgerät', 'laden-funkgeraet'],
      ['Solarpanel-Set', 'laden-solarpanel'], ['Gepanzerte Handkarre', 'laden-handkarre'], ['Zubehör: Geldversteck', 'laden-geldversteck'],
      ['Krummes Zahnstocher-Bündel', 'waffe-zahnstocher'], ['Abgebrochene Limo-Flasche', 'waffe-limoflasche'], ['Wasserbomben', 'waffe-wasserbomben'],
      ['Kettenschloss', 'waffe-kettenschloss'], ['Schlagring', 'waffe-schlagring'], ['Schwert', 'waffe-schwert'],
      ['Silvesterknaller', 'waffe-silvesterknaller'], ['Spraydose', 'waffe-spraydose'], ['Gummiknüppel', 'waffe-gummiknueppel'],
      ['Heizungsrohr', 'waffe-heizungsrohr'], ['Hammer', 'waffe-hammer'], ['Pfefferspray', 'waffe-pfefferspray'],
      ['Elektroschocker', 'waffe-elektroschocker'], ['Feuerlöscher', 'waffe-feuerloescher'], ['Gullideckel', 'waffe-gullideckel'],
      ['Nagelkeule', 'waffe-nagelkeule'],
      ['Dosenbier', 'essen-dosenbier'], ['Kartonwein', 'essen-kartonwein'], ['Kurzer', 'essen-kurzer'], ['Wodka', 'essen-wodka'],
      ['Feuerwasser', 'essen-feuerwasser'], ['Altes Brötchen', 'essen-broetchen'], ['Currywurst', 'essen-currywurst'],
      ['Döner mit allem', 'essen-doener'], ['Eintopf', 'essen-eintopf'],
      ['Handvoll Sand werfen', 'vert-sand'], ['Bananenschalen verteilen', 'vert-bananen'], ['Handvoll Salz', 'vert-salz'],
      ['Wegweiser aufstellen', 'vert-wegweiser'], ['Juckpulver verschleudern', 'vert-juckpulver'], ['Totstellen', 'vert-totstellen'],
      ['Tarnen', 'vert-tarnen'], ['Mit bösen Katzen werfen', 'vert-katzen'], ['Mit Spiegel blenden', 'vert-spiegel'],
      ['Vergiftetes Bier hinstellen', 'vert-giftbier'],
      // Begleiter
      ['Kakerlake', 'tier-kakerlake'], ['Goldfisch', 'tier-goldfisch'], ['Maus', 'tier-maus'], ['Hamster', 'tier-hamster'],
      ['Wellensittich', 'tier-wellensittich'], ['Taube', 'tier-taube'], ['Ratte', 'tier-ratte'], ['Hase', 'tier-hase'],
      ['Frettchen', 'tier-frettchen'], ['Katze', 'tier-katze'], ['Falke', 'tier-falke'], ['Schlange', 'tier-schlange'],
      ['Hausziege', 'tier-ziege'], ['Pudel', 'tier-pudel'], ['Dressierte Maus', 'tier-dressierte-maus'], ['Adler', 'tier-adler'],
      ['Schäferhund', 'tier-schaeferhund'], ['Pitbull', 'tier-pitbull'], ['Cocker Spaniel', 'tier-cocker'], ['Chihuahua', 'tier-chihuahua'],
      ['Pferd', 'tier-pferd'], ['Giraffe', 'tier-giraffe'], ['Krokodil', 'tier-krokodil'], ['Tiger', 'tier-tiger'],
      ['Äffchen', 'tier-affe'], ['Nashorn', 'tier-nashorn'],
      // S18: neue Stücke bis Level 150 (Fotos in bilder2.py, bis dahin Ersatzbild)
      ...[['Brechstange', 'waffe-brechstange'], ['Baseballschläger', 'waffe-baseballschlaeger'], ['Vorschlaghammer', 'waffe-vorschlaghammer'],
        ['Kettensäge ohne Kette', 'waffe-kettensaege'], ['Stuhlbein-Nunchakus', 'waffe-nunchakus'], ['Eishockeyschläger', 'waffe-hockeyschlaeger'],
        ['Einkaufswagen-Rammbock', 'waffe-rammbock'], ['Laubbläser-Kanone', 'waffe-laubblaeser'], ['Streusalz-Schleuder', 'waffe-salzschleuder'],
        ['Gabelstaplergabel', 'waffe-gabel'], ['Mini-Abrissbirne', 'waffe-abrissbirne'], ['Feuerwehraxt', 'waffe-feuerwehraxt'],
        ['Stählernes Kiezkönig-Zepter', 'waffe-zepter']].map(([n, f]) => ['body', new RegExp('^' + n + '$'), f + '|stadt-waffenladen']),
      ...[['Flohmarkt-Lederjacke', 'kleidung-lederjacke'], ['Motorradkombi', 'kleidung-motorradkombi'], ['Alte Feuerwehrjacke', 'kleidung-feuerwehrjacke'],
        ['Gebrauchte Schutzweste', 'kleidung-schutzweste'], ['Bundeswehr-Parka', 'kleidung-parka'], ['Chemieschutzanzug', 'kleidung-chemieschutz'],
        ['Stichschutzweste', 'kleidung-stichschutz'], ['Verstärkter Imkeranzug', 'kleidung-imkeranzug'], ['Ausgemusterter Kampfmittelanzug', 'kleidung-kampfmittelanzug'],
        ['Ritterrüstung aus dem Theaterfundus', 'kleidung-ritterruestung'], ['Kiez-Panzermantel', 'kleidung-panzermantel']].map(([n, f]) => ['body', new RegExp('^' + n + '$'), f + '|laden-wintermantel']),
      ...[['Nachtsichtgerät', 'zubehoer-nachtsicht'], ['Sperrmüll-Drohne', 'zubehoer-drohne'], ['Akku-Stirnlampe', 'zubehoer-stirnlampe'],
        ['Wärmebildkamera', 'zubehoer-waermebild'], ['Motorisierte Sackkarre', 'zubehoer-sackkarre'], ['Ghettoblaster mit Bass', 'zubehoer-ghettoblaster'],
        ['Kiez-Funknetz', 'zubehoer-funknetz'], ['Stahl-Lastenanhänger', 'zubehoer-anhaenger'], ['Notstromaggregat', 'zubehoer-generator'],
        ['Selbstgebaute Alarmanlage', 'zubehoer-alarmanlage'], ['Siegelring des Kiezkönigs', 'zubehoer-siegelring']].map(([n, f]) => ['body', new RegExp('^' + n + '$'), f + '|stadt-zubehoer']),
      ...[['Wolf', 'tier-wolf|heim-wolfsrudel'], ['Bär', 'tier-baer'], ['Löwe', 'tier-loewe'], ['Gorilla', 'tier-gorilla'], ['Elefant', 'tier-elefant']]
        .map(([n, f]) => ['body', new RegExp('^' + n + '$'), f.includes('|') ? f : f + '|stadt-tierhandlung']), ['Taubenpfeife', 'plunder-taubenpfeife'],
      // Unterkünfte
      ['Bürgersteig', 'heim-buergersteig'], ['Parkbank', 'heim-parkbank'], ['Pennerbox', 'heim-pennerbox'], ['Brunnen', 'heim-brunnen'],
      ['Brücke', 'heim-bruecke'], ['Katakomben', 'heim-katakomben'], ['Elbstrand', 'heim-elbstrand'], ['Baumhaus', 'heim-baumhaus'],
      ['Zelt', 'heim-zelt'], ['Wolfsrudel', 'heim-wolfsrudel'], ['Wohnwagen', 'heim-wohnwagen'], ['Boot', 'heim-boot'],
      ['Grabkammer', 'heim-grabkammer'], ['Tiefgarage', 'heim-tiefgarage'], ['Kakaofabrik', 'heim-kakaofabrik'], ['Kran', 'heim-kran'],
      ['Leuchtturm', 'heim-leuchtturm'], ['Alte Kirche', 'heim-kirche'], ['Burg', 'heim-burg'],
      // Schnorrplätze, Körperpflege, Musik
      ['Englischer Garten', 'schnorr-garten'], ['Hauptbahnhof', 'schnorr-bahnhof'], ['Fußgängerzone', 'schnorr-fussgaengerzone'],
      ['Jahrmarkt', 'schnorr-jahrmarkt'], ['Vor der Oper', 'schnorr-oper'],
      ['Katzenwäsche', 'pflege-katzenwaesche'], ['Schwamm & Seife', 'pflege-schwamm'], ['Waschanlage', 'pflege-waschanlage'],
      ['Brunnen', 'heim-brunnen'], ['Schwimmbad', 'kk-dusche'], ['Friseur', 'stadt-waschhaus'],
      ['Flaschenflöte', 'musik-flaschenfloete'], ['Glocke', 'musik-glocke'], ['Trommel', 'musik-trommel'], ['Akkordion', 'musik-akkordeon'],
      ['Radio', 'musik-radio'], ['Gitarre', 'musik-gitarre'], ['Saxophon', 'musik-saxophon'], ['Chor', 'musik-chor'],
      ['Straßenmusik-Kasse', 'musik-kasse'],
      // Verbrechen, Training, Aktionen
      ['Handtaschenraub', 'verbrechen-handtasche'], ['Ladendiebstahl', 'verbrechen-laden'], ['Auto aufbrechen', 'verbrechen-auto'],
      ['Einbruch', 'verbrechen-einbruch'], ['Tankstellenüberfall', 'verbrechen-tankstelle'], ['Bankraub', 'verbrechen-bank'],
      ['Kaugummiautomat aufbrechen', 'verbrechen-kaugummi'],
      ['Konzentrieren', 'training-konzentrieren'], ['Parallele Entwicklung', 'training-parallel'], ['Steigende Anforderungen', 'training-anforderungen'],
      ['Nachricht schreiben', 'post-schreiben'], ['Postfach', 'post-fach'], ['Heute im Kiez', 'mission-heute'], ['Rubbellose', 'rubbellose'],
      ['Nächster Aufstieg', 'uebersicht-aufstieg']
    ].map(([n, f]) => ['body', new RegExp('^' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), f]),
    ['#income', /^Instrument$/, 'musik-instrument'],
    ['#pfand', /^Übersicht$/, 'pfand-uebersicht'],
    ['#pfand', /^Pfandkurs-Verlauf$/, 'pfand-kurs'],
    ['body', /^Tägliche Serie/, 'mission-serie'],
    ...[['Angriff', 'angriff'], ['Verteidigung', 'verteidigung'], ['Geschick', 'geschick'], ['Ausdauer', 'ausdauer'], ['Sprechen', 'sprechen'],
      ['Musik', 'musik'], ['Sozialkontakte', 'sozial'], ['Taschentricks', 'taschentricks']]
      .map(([n, f]) => ['body', new RegExp('^' + n + ' \\d+$'), 'skill-' + f]),
    ['#pvp', /^Kampfstärke$/, 'kampf-staerke'],
    ['#pvp', /^Verteidigung$/, 'kampf-verteidigung'],
    ['#pvp', /^(?!Kampfstärke$|Verteidigung$).+/, 'kampf-gegner']
  ];
  // Schlussdurchsicht: nicht überall dasselbe Foto (Pfand-Seite, Prügelei)
  R.push(['#pfand', /^Flaschen verkaufen$/, 'pfand-kurs'], ['#pfand', /^Mülltonne durchwühlen$/, 'klein-container'],
    ['#pfand', /^Flaschen sortieren$/, 'lager-inventar'], ['#pfand', /^Pfandflaschen sammeln$/, 'start-pfand'],
    ['#pvp', /^Deine Kampfwerte$/, 'kampf-staerke'], ['#pvp', /^Kiezboss/, 'npc-boss|start-kampf'], ['#pvp', /^Computer-Gegner$/, 'kampf-verteidigung'],
    ['#pvp', /^Suff-Kopp/, 'npc-suffkopp|essen-feuerwasser'], ['#pvp', /^Pfandneider/, 'npc-pfandneider|gebiet-altglas'],
    ['#pvp', /^Türsteher/, 'npc-tuersteher|szene-pruegelei'], ['#pvp', /^Hafenboxer/, 'npc-hafenboxer|start-kampf'],
    ['#pvp', /^Kiezlegende/, 'npc-kiezlegende|rang-15'], ['#pvp', /^Revanche$/, 'kampf-staerke'],
    ['#pvp', /^Kopfgelder$/, 'profil-spende'], ['#pvp', /^Kampfturnier/, 'wettbewerb-pokal']);
  // Neue Seiten (S12–S17): Fotos statt reiner Textkarten – 'eigenes|ersatz' bis die eigenen Motive erzeugt sind
  R.push(
    ['#nebenjobs', /^Flyer/, 'job-flyer|brett'], ['#nebenjobs', /^Teller/, 'job-spuelen|essen-eintopf'], ['#nebenjobs', /^Umzugshelfer/, 'job-umzug|ausbau-3'],
    ['#nebenjobs', /^Nachtwache/, 'job-nachtwache|heim-kran'], ['#nebenjobs', /^Messehelfer/, 'job-messe|events'], ['#nebenjobs', /^Kurier/, 'job-kurier|laden-handkarre'],
    ['#nebenjobs', /^Umzugsfahrer/, 'job-umzugsfahrer|heim-wohnwagen'], ['#nebenjobs', /^Sperrmüll/, 'job-sperrmuell|klein-container'], ['#nebenjobs', /^Gerade:/, 'mission-heute'],
    ['#kiosk', /Kiosk/, 'kiosk|stadt-supermarkt'], ['#kiosk', /^Kioske in deiner Gegend/, 'stadt-eigenheime'],
    ['#kredithai', /^Der Kredithai/, 'kredithai|bande-kasse'],
    ['#auktion', /^Laufende Auktionen/, 'szene-laden'], ['#auktion', /^Selbst versteigern/, 'kk-plunderkiste'],
    ['#saison', /^Saison/, 'wettbewerb-pokal'],
    ['#kiezfiguren', /^Kiosk-Kemal/, 'figur-kemal|stadt-supermarkt'], ['#kiezfiguren', /^Oma Hilde/, 'figur-hilde|essen-broetchen'], ['#kiezfiguren', /^Ratten-Rudi/, 'figur-rudi|tier-ratte'],
    ['#garage', /^Unterwegs mit/, 'laden-wagen'], ['#garage', /^Einkaufswagen$/, 'laden-wagen'], ['#garage', /^Bollerwagen$/, 'fahrzeug-bollerwagen|ausbau-3'],
    ['#garage', /^Fahrrad/, 'fahrzeug-fahrrad|laden-handkarre'], ['#garage', /^Lastenrad$/, 'fahrzeug-lastenrad|laden-handkarre'], ['#garage', /^Mofa$/, 'fahrzeug-mofa|laden-mofamotor'],
    ['#garage', /^Rostiger Kombi$/, 'fahrzeug-kombi|verbrechen-auto'], ['#garage', /^Transporter$/, 'fahrzeug-transporter|verbrechen-auto'], ['#garage', /^Wohnmobil$/, 'fahrzeug-wohnmobil|heim-wohnwagen'],
    ['#garage', /^Schrottplatz$/, 'schrottplatz|klein-container'], ['#garage', /^(Straßenrennen|Rennen)/, 'rennen|verbrechen-auto'], ['#garage', /^Autoklau/, 'verbrechen-auto'],
    ['#garage', /^(Werkstatt|Tuning|Wartung)/, 'werkstatt|laden-klappspaten'], ['#garage', /^Führerschein/, 'training-anforderungen']);
  // Basar: dieselben Plunder-Fotos wie in der Plunderkiste
  R.push(...R.filter(r => r[0] === '#plunder' && r[2].startsWith('plunder-')).map(r => ['#basar', r[1], r[2]]));
  R.push(...R.filter(r => r[0] === '#store').map(r => ['#ausruestung', r[1], r[2]]));
  // Vorschaubilder, die das Foto über --kzbild bekommen (Rest wird als .kz-pic ergänzt)
  const THUMB = ':scope>.generated-item-thumb, :scope>.asset-thumb, :scope .skill-portrait, :scope .city-hub-img, :scope>.pharmacy-thumb';
  // Seitenköpfe je Bereich
  const SZENE = { nebenjobs: 'szene-stadt', auktion: 'szene-laden', kiosk: 'szene-stadt', kredithai: 'szene-post', kiezfiguren: 'szene-auftrag', saison: 'szene-erfolge', statistik: 'szene-rangliste', garage: 'szene-pfand', stadtteile: 'szene-bande', bandenhaus: 'szene-bande', ausruestung: 'szene-laden', basar: 'szene-laden', zockerbude: 'szene-stadt', schliessfach: 'szene-unterkunft', geschichte: 'szene-auftrag',
    chat: 'szene-post', kampfprotokoll: 'szene-pruegelei', pfand: 'szene-pfand', begging: 'szene-schnorren', income: 'szene-stadt', gear: 'szene-unterkunft', training: 'szene-training',
    messages: 'szene-post', gangs: 'szene-bande', missions: 'szene-auftrag', pets: 'szene-tiere', achievements: 'szene-erfolge',
    pvp: 'szene-pruegelei', store: 'szene-laden', leaderboard: 'szene-rangliste', career: 'szene-karriere' };
  const EMOJI = /^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍\s]+/u;
  const titleOf = c => c.querySelector(':scope>h3, :scope>b, :scope>h4, :scope>h2') || c.querySelector(':scope>.skill-info>b');
  const text = el => (el?.textContent || '').replace(EMOJI, '').replace(/^✅\s*/, '').trim();

  // Nur Bilder verwenden, die es wirklich gibt – sonst bleibt das alte Vorschaubild stehen
  const ok = {};
  const exists = file => {
    if (!(file in ok)) {
      ok[file] = null;
      const i = new Image();
      i.onload = () => { ok[file] = true; later(); };
      i.onerror = () => { ok[file] = false; };
      i.src = '/bilder/' + file + '.webp';
    }
    return ok[file] === true;
  };

  // Andere Skripte setzen alte Bilder als Inline-Stil (teils !important) – deshalb das Foto ebenfalls inline festnageln
  const pin = (el, url) => {
    if (el.style.getPropertyValue('background-image') === url) return;
    el.style.setProperty('background-image', url, 'important');
    el.style.setProperty('background-size', 'cover', 'important');
    el.style.setProperty('background-position', 'center', 'important');
    el.style.setProperty('background-repeat', 'no-repeat', 'important');
  };

  function apply(card, file, title) {
    // Gesperrter Erfolg: 🔒 durch graues Bild ersetzen
    if (title && /^🔒/.test(title.textContent)) { card.classList.add('kz-gesperrt'); }
    if (title?.firstChild?.nodeType === 3 && !/^✅/.test(title.firstChild.nodeValue)) {
      const v = title.firstChild.nodeValue.replace(EMOJI, '');
      if (v !== title.firstChild.nodeValue) title.firstChild.nodeValue = v;
    }
    const url = 'url("/bilder/' + file + '.webp")';
    card.querySelectorAll(THUMB).forEach(t => pin(t, url));
    if (card.dataset.kzbild === file && card.querySelector(THUMB)) return;
    card.dataset.kzbild = file;
    card.style.setProperty('--kzbild', url);
    card.classList.add('kz-bild');
    if (!card.querySelector(THUMB)) {
      const d = document.createElement('div');
      d.className = 'generated-item-thumb kz-pic';
      d.setAttribute('role', 'img');
      d.setAttribute('aria-label', text(title) || file);
      card.prepend(d);
      card.classList.add('has-generated-thumb');
    }
  }

  // Leistung: früher 350 × querySelectorAll über das ganze Dokument bei jeder DOM-Änderung (≈40 % Rechenzeit).
  // Jetzt: alle Karten einmal holen, pro Karte Titel + Bereich merken und nur neu zuordnen, wenn sich der Titel ändert.
  const SIMPLE = /^#[\w-]+$/;
  const EQ = R.filter(r => r[0][0] === '=');                         // Regeln mit eigenem Selektor
  const memo = new WeakMap();                                        // Karte → { key, file }
  const pick = file => { const parts = file.split('|'); const f = parts.find(exists); return { f, done: parts.every(p => ok[p] !== null && p in ok) || !!f }; };
  function fileFor(card, tx) {
    const ids = new Set(); for (let e = card.parentElement; e; e = e.parentElement) if (e.id) ids.add('#' + e.id);
    let res = null, done = true;
    // Garage: Kopf „Unterwegs mit: X“ / „Werkstatt: X“ zeigt das Foto des aktiven Fahrzeugs X (vorher Einkaufswagen bzw. Spaten)
    const vm = ids.has('#garage') && tx.match(/^(?:Unterwegs mit|Werkstatt): (.+)$/); if (vm) tx = vm[1];
    for (const [scope, re, file] of R) {
      if (scope[0] === '=') continue;
      if (scope !== 'body' && !(SIMPLE.test(scope) ? ids.has(scope) : card.closest(scope))) continue;
      if (!re.test(tx)) continue;
      // 'neu|ersatz': neues Foto, solange es noch fehlt das Ersatzbild
      const r = pick(file); if (!r.done) done = false; if (r.f) res = r.f;
    }
    return { file: res, done };
  }
  function run() {
    document.querySelectorAll(CARD).forEach(card => {
      const t = titleOf(card), tx = text(t);
      let m = memo.get(card);
      if (!m || m.key !== tx) { const r = fileFor(card, tx); m = { key: tx, file: r.file }; if (r.done) memo.set(card, m); else memo.delete(card); }
      if (m.file) apply(card, m.file, t);
    });
    for (const [scope, re, file] of EQ) document.querySelectorAll(scope.slice(1)).forEach(card => {
      const t = titleOf(card); if (!re.test(text(t))) return; const f = file.split('|').find(exists); if (f) apply(card, f, t);
    });
    // Sammelgebiete (Stadt & Einkommen → Schnorrplätze)
    document.querySelectorAll('.area-card[data-idx]').forEach(card => {
      const file = 'gebiet-' + ['bahnhof', 'altglas', 'park', 'touristen', 'luxus'][card.dataset.idx];
      if (exists(file)) apply(card, file, null);
    });
    // Seitenköpfe
    document.querySelectorAll('section.panel > .section-scene').forEach(el => {
      const file = SZENE[el.parentElement.id], url = 'url("/bilder/' + file + '.webp")';
      if (file && el.style.getPropertyValue('--scene-image') !== url && exists(file)) el.style.setProperty('--scene-image', url);
    });
    document.querySelectorAll('section.panel .scene-visual').forEach(el => {
      const file = SZENE[el.closest('section.panel').id];
      if (file && exists(file)) pin(el, 'url("/bilder/' + file + '.webp")');
    });
    // Großes Bild oben auf der Übersicht
    const hero = document.querySelector('#overview .overview-hero');
    if (hero && hero.dataset.kzbild !== 'szene-uebersicht' && exists('szene-uebersicht')) {
      hero.dataset.kzbild = 'szene-uebersicht';
      hero.style.backgroundImage = 'linear-gradient(0deg,rgba(9,11,12,.93),transparent 72%),url("/bilder/szene-uebersicht.webp")';
      hero.style.backgroundPosition = 'center';
    }
    // Ausbau-Vorschau (Unterkunft, Geldbehälter …)
    document.querySelectorAll('.equipment-sprite[data-pos]').forEach(el => {
      const file = 'ausbau-' + el.dataset.pos;
      if (el.dataset.kzbild !== file && exists(file)) {
        el.dataset.kzbild = file;
        el.style.setProperty('background', '#151310 url("/bilder/' + file + '.webp") center / cover no-repeat', 'important');
      }
    });
    // Aktueller Karriererang oben auf der Karriere-Seite
    const rt = document.getElementById('ranktitle'), rn = rt?.textContent.match(/Karriererang (\d+)/);
    if (rn) { const file = 'rang-' + rn[1].padStart(2, '0'); if (exists(file)) apply(rt.parentElement, file, rt); }
    // Profilkopf ohne eigenes Bild
    const head = document.querySelector('#profil .kf-box > h3:first-child');
    if (head && !head.parentElement.querySelector(':scope>.kz-avatar, :scope>div[style*="background-image"]')) {
      const d = document.createElement('div');
      d.className = 'kz-avatar'; d.setAttribute('role', 'img'); d.setAttribute('aria-label', 'Kein Profilbild');
      head.before(d);
    }
    heroNow();
  }
  let queued = false;
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; run(); }); } };
  // Seitenhintergrund (.main:before, --page-hero): das alte Skript setzt ihn bei jedem Menüklick, danach überschreiben
  const pageHero = id => {
    const file = id === 'overview' ? 'szene-uebersicht' : SZENE[id], main = document.querySelector('.main');
    if (main && file && exists(file)) { main.style.setProperty('--page-hero', 'url("/bilder/' + file + '.webp")'); main.style.setProperty('--page-hero-position', 'center'); }
  };
  document.querySelectorAll('.side [data-view]').forEach(b => b.addEventListener('click', () => pageHero(b.dataset.view)));
  const heroNow = () => pageHero(document.querySelector('section.active-view')?.id || 'overview');
  run();
  heroNow(); setTimeout(heroNow, 1500);
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
})();
