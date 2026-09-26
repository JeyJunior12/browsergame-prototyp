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
      ['Taschenlampe', 'laden-taschenlampe'], ['Survival-Rucksack', 'laden-rucksack'], ['Funkgeraet', 'laden-funkgeraet'],
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
      ['Schaeferhund', 'tier-schaeferhund'], ['Pitbull', 'tier-pitbull'], ['Cocker Spaniel', 'tier-cocker'], ['Chihuahua', 'tier-chihuahua'],
      ['Pferd', 'tier-pferd'], ['Giraffe', 'tier-giraffe'], ['Krokodil', 'tier-krokodil'], ['Tiger', 'tier-tiger'],
      ['Aeffchen', 'tier-affe'], ['Nashorn', 'tier-nashorn'], ['Taubenpfeife', 'plunder-taubenpfeife'],
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
  // Vorschaubilder, die das Foto über --kzbild bekommen (Rest wird als .kz-pic ergänzt)
  const THUMB = ':scope>.generated-item-thumb, :scope>.asset-thumb, :scope .skill-portrait, :scope .city-hub-img, :scope>.pharmacy-thumb';
  // Seitenköpfe je Bereich
  const SZENE = { pfand: 'szene-pfand', begging: 'szene-schnorren', income: 'szene-stadt', gear: 'szene-unterkunft', training: 'szene-training',
    messages: 'szene-post', gangs: 'szene-bande', missions: 'szene-auftrag', pets: 'szene-tiere', achievements: 'szene-erfolge',
    pvp: 'szene-pruegelei', store: 'szene-laden', leaderboard: 'szene-rangliste', career: 'szene-karriere' };
  const EMOJI = /^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍\s]+/u;
  const titleOf = c => c.querySelector(':scope>h3, :scope>b, :scope>h4, :scope>h2');
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

  function apply(card, file, title) {
    // Gesperrter Erfolg: 🔒 durch graues Bild ersetzen
    if (title && /^🔒/.test(title.textContent)) { card.classList.add('kz-gesperrt'); }
    if (title?.firstChild?.nodeType === 3 && !/^✅/.test(title.firstChild.nodeValue)) {
      const v = title.firstChild.nodeValue.replace(EMOJI, '');
      if (v !== title.firstChild.nodeValue) title.firstChild.nodeValue = v;
    }
    if (card.dataset.kzbild === file && card.querySelector(THUMB)) return;
    card.dataset.kzbild = file;
    card.style.setProperty('--kzbild', 'url("/bilder/' + file + '.webp")');
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

  function run() {
    for (const [scope, re, file] of R) {
      document.querySelectorAll(scope === 'body' ? CARD : scope[0] === '=' ? scope.slice(1) : CARD.split(',').map(c => scope + ' ' + c.trim()).join(',')).forEach(card => {
        const t = titleOf(card);
        if (re.test(text(t)) && exists(file)) apply(card, file, t);
      });
    }
    // Sammelgebiete (Stadt & Einkommen → Schnorrplätze)
    document.querySelectorAll('.schnorr-areas .area-card[data-idx]').forEach(card => {
      const file = 'gebiet-' + ['bahnhof', 'altglas', 'park', 'touristen', 'luxus'][card.dataset.idx];
      if (card.dataset.kzbild !== file && exists(file)) {
        card.dataset.kzbild = file;
        card.style.setProperty('--kzbild', 'url("/bilder/' + file + '.webp")');
        card.classList.add('kz-bild');
      }
    });
    // Seitenköpfe
    document.querySelectorAll('section.panel > .section-scene').forEach(el => {
      const file = SZENE[el.parentElement.id];
      if (file && el.dataset.kzbild !== file && exists(file)) {
        el.dataset.kzbild = file;
        el.style.setProperty('--scene-image', 'url("/bilder/' + file + '.webp")');
      }
    });
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
  }
  let queued = false;
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; run(); }); } };
  run();
  new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
})();
