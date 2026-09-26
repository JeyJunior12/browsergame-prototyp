// Kiezkönig – eigene Fotos (Ordner /bilder) den Karten zuordnen.
// Karten werden von vielen Skripten neu gezeichnet, deshalb per MutationObserver nach Titel zuordnen.
// Vorhandene Vorschaubilder (.generated-item-thumb/.asset-thumb) bekommen das Foto per CSS-Variable --kzbild
// (Regel in kiez-theme.css), fehlende werden als .kz-pic ergänzt. Emoji vor dem Titel fällt weg.
(() => {
  const CARD = '.card, .activity-card, .lead-card, .kf-box, .profile-wide-row';
  // [Bereich, Titel (RegExp), Datei]  – Titel = erstes b/h3/h4 der Karte
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
    ['#brett', /^$/, 'brett'],
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
    ['body', /^Park$/, 'klein-park']
  ];
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
    if (card.dataset.kzbild === file && card.querySelector(':scope>.generated-item-thumb, :scope>.asset-thumb')) return;
    card.dataset.kzbild = file;
    card.style.setProperty('--kzbild', 'url("/bilder/' + file + '.webp")');
    card.classList.add('kz-bild');
    if (!card.querySelector(':scope>.generated-item-thumb, :scope>.asset-thumb')) {
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
      document.querySelectorAll(scope === 'body' ? CARD : CARD.split(',').map(c => scope + ' ' + c.trim()).join(',')).forEach(card => {
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
