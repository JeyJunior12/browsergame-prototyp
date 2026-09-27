// Kiezkönig – Ausbau-Funktionen (Etappe 4–6): Profil, Gästebuch, Freunde, Spendenlink, Plunder, Kronkorken,
// Banden komplett, Tierkampf, Wetter, Events, Wochenwettbewerb, Banden-Highscore, Admin-Events.
// Alle Spielregeln liegen in Supabase (SQL-Funktionen); hier nur Anzeige und Aufrufe.
const sb = window.kiezSupabase;
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => Number(n || 0).toFixed(2).replace('.', ',') + ' €';
const when = d => new Date(d).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
const say = (el, text, good) => { if (el) el.innerHTML = '<div class="notice ' + (good ? 'good' : 'bad') + '">' + text + '</div>'; };
const ROLE = { owner: 'Chef', co: 'Vize', officer: 'Offizier', member: 'Mitglied' };
const RANK = { member: 1, officer: 2, co: 3, owner: 4 };
const RARITY = { gewoehnlich: 'Gewöhnlich', selten: 'Selten', episch: 'Episch', legendaer: 'Legendär' };

async function rpc(fn, args) {
  const r = await sb.rpc(fn, args);
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
// Button-Klick mit Fehlermeldung; fn liefert Erfolgstext (HTML, bereits escaped)
// Letzte Meldung merken: Seiten laden nach einer Aktion neu, die Meldung soll danach sichtbar bleiben
let flash = null;
function restoreFlash() {
  if (!flash || Date.now() - flash.t > 8000) return;
  const el = document.querySelector('section.panel.active-view .' + flash.cls.split(' ')[0]);
  if (el && !el.innerHTML) say(el, flash.text, flash.good);
}
function act(btn, box, fn) {
  btn.onclick = async () => {
    btn.disabled = true;
    try { const t = await fn(); if (t) { say(box, t, true); if (box?.className) flash = { cls: box.className, text: t, good: true, t: Date.now() }; } }
    catch (e) { say(box, esc(e.message), false); }
    btn.disabled = false;
  };
}
// Eigene Kennung aus dem geladenen Profil (kein zusätzlicher Server-Aufruf, der direkt nach dem Login scheitern kann)
async function myId() { return window.kiezProfile?.id || (await sb.auth.getUser()).data.user?.id || null; }
async function names(ids) {
  const list = [...new Set(ids.filter(Boolean))];
  if (!list.length) return {};
  const { data } = await sb.from('profiles').select('id,username').in('id', list);
  return Object.fromEntries((data || []).map(p => [p.id, p.username]));
}
const playerLink = (id, name) => '<a href="#" class="kiez-player" data-id="' + esc(id) + '">' + esc(name || '?') + '</a>';
const refreshProfile = async () => { const p = await rpc('refresh_my_profile'); window.kiezRenderProfile?.(p); return p; };

// ---------- Styles ----------
const style = document.createElement('style');
style.textContent = `
.kf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.kf-box{background:#1c1e1c;border:1px solid #3f3e39;border-radius:4px;padding:10px 12px;margin:0 0 10px}
.kf-box h3{margin:0 0 8px;font-size:13px;color:#e8dcc0}
.kf-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0}
.kf-row input,.kf-row select,.kf-box textarea{padding:7px;background:#11110f;color:#e8dcc0;border:1px solid #4a473f;border-radius:3px;font:inherit}
.kf-box textarea{width:100%;min-height:80px;box-sizing:border-box}
.kf-list{list-style:none;margin:0;padding:0}.kf-list li{padding:5px 0;border-bottom:1px solid #2e2d29}
.kf-muted{color:#9a927e;font-size:11px}.kf-bio{white-space:pre-wrap;word-break:break-word}
.kf-table{width:100%;border-collapse:collapse;font-size:12px}.kf-table td,.kf-table th{padding:4px 6px;border-bottom:1px solid #2e2d29;text-align:left}
.kf-rar-selten{color:#7fb3ff}.kf-rar-episch{color:#c68cff}.kf-rar-legendaer{color:#ffc34d}
.kf-locked{opacity:.45}.kf-chat{max-height:260px;overflow:auto}
.panel a,.kf-box a,.kiez-slots-row a{color:#c4a747}.panel a:hover{color:#e8dcc0}
.kf-modal{position:fixed;inset:0;background:#000b;display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.kf-modal>div{background:#242321;border:4px solid #756346;max-width:420px;width:100%;padding:18px;color:#e8dcc0;text-align:center}
@media(max-width:600px){.kf-grid{grid-template-columns:1fr}}`;
document.head.appendChild(style);

// ---------- Neue Seiten ----------
const loaders = {};
function addPanel(id, title, label) {
  let sec = document.getElementById(id);
  if (!sec) {
    sec = document.createElement('section');
    sec.id = id; sec.className = 'panel';
    $('.main')?.appendChild(sec);
  }
  sec.innerHTML = '<h2>' + title + '</h2><div class="inside"><div class="kf-body"><div class="kz-skeleton" aria-label="Lade …"></div></div></div>';
  const side = $('.side');
  let b = side?.querySelector('[data-view="' + id + '"]');
  if (side && !b) { b = document.createElement('button'); b.dataset.view = id; b.textContent = label; side.insertBefore(b, $('#adminnav')); }
  if (b) b.onclick = () => show(id);
  watchPanels();
  return sec.querySelector('.kf-body');
}
// Jede Seite lädt ihre Daten, sobald sie sichtbar wird – egal über welches Menü, welchen Reiter oder Link
const activeWatch = new MutationObserver(ms => ms.forEach(m => {
  const s = m.target;
  if (s.classList.contains('active-view') && !(m.oldValue || '').includes('active-view')) loaders[s.id]?.();
}));
function watchPanels() {
  document.querySelectorAll('section.panel').forEach(s => { if (!s.dataset.kfw) { s.dataset.kfw = '1'; activeWatch.observe(s, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }); } });
}
function show(id) {
  const was = document.getElementById(id)?.classList.contains('active-view');
  window.kiezShowView?.(id);
  if (was) loaders[id]?.();
}
window.kiezGo = show;
window.kiezLoaders = loaders;

// ================= Profil =================
const profBody = addPanel('profil', 'Profil', '🪪 Profil');
let profileTarget = null;
window.kiezOpenProfile = id => { profileTarget = id || null; show('profil'); };
let profSeq = 0;
loaders.profil = async () => {
  const t = ++profSeq;
  const me = await myId(); if (!me) return;
  const id = profileTarget || me, own = id === me;
  const [pr, gm, gb, fr, bl] = await Promise.all([
    sb.from('profiles').select('id,username,title,level,xp,wins,losses,bio,motto,created_at,equipped_plunder,donations_received,donation_money,pet_wins,is_banned,avatar').eq('id', id).maybeSingle(),
    sb.from('gang_members').select('gang_id,role').eq('user_id', id).maybeSingle(),
    sb.from('guestbook_entries').select('id,author_id,body,created_at').eq('owner_id', id).order('created_at', { ascending: false }).limit(30),
    sb.from('friendships').select('*').or('and(user_id.eq.' + me + ',friend_id.eq.' + id + '),and(user_id.eq.' + id + ',friend_id.eq.' + me + ')'),
    sb.from('blocks').select('blocked_id').eq('user_id', me).eq('blocked_id', id)
  ]);
  const p = pr.data;
  if (!p) { profBody.innerHTML = 'Spieler nicht gefunden.'; return; }
  if (gm.data) gm.data.gangs = (await sb.from('gangs').select('name').eq('id', gm.data.gang_id).maybeSingle()).data;
  const plunderName = p.equipped_plunder ? (await sb.from('plunder_catalog').select('name').eq('id', p.equipped_plunder).maybeSingle()).data?.name : null;
  const authors = await names((gb.data || []).map(e => e.author_id));
  if (t !== profSeq) return;
  const f = (fr.data || [])[0], blocked = (bl.data || []).length > 0;
  const av = p.avatar && /^data:image\/(jpeg|png|webp);base64,/.test(p.avatar) ? '<div style="float:right;width:84px;height:84px;margin:0 0 8px 10px;border:3px solid #756346;background:#11110f center/cover;background-image:url(\'' + p.avatar + '\')"></div>' : '';
  let h = '<div class="kf-box">' + av + '<h3>' + esc(p.username) + (p.is_banned ? ' <span class="kf-muted">(gesperrt)</span>' : '') + '</h3>' + (p.title ? '<p class="kf-title">„' + esc(p.title) + '“</p>' : '')
    + (p.motto ? '<p><i>„' + esc(p.motto) + '“</i></p>' : '')
    + '<table class="kf-table"><tr><td>Level</td><td>' + p.level + '</td><td>Punkte</td><td>' + p.xp + '</td></tr>'
    + '<tr><td>Siege / Niederlagen</td><td>' + p.wins + ' / ' + p.losses + '</td><td>Tierkampf-Siege</td><td>' + p.pet_wins + '</td></tr>'
    + '<tr><td>Bande</td><td>' + (gm.data ? esc(gm.data.gangs?.name) + ' (' + ROLE[gm.data.role] + ')' : '–') + '</td><td>Plunder</td><td>' + esc(plunderName || '–') + '</td></tr>'
    + '<tr><td>Im Kiez seit</td><td>' + new Date(p.created_at).toLocaleDateString('de-DE') + '</td><td>Spenden erhalten</td><td>' + p.donations_received + '</td></tr></table>'
    + '<p class="kf-bio">' + (p.bio ? esc(p.bio) : '<span class="kf-muted">Noch keine Beschreibung.</span>') + '</p><div class="kf-row pact"></div><div class="pmsg"></div></div>';
  if (own) {
    const link = location.origin + '/?spende=' + encodeURIComponent(p.username);
    const today = await sb.from('donations').select('id', { count: 'exact', head: true }).eq('target_id', me).eq('donation_day', new Date().toISOString().slice(0, 10));
    h += '<div class="kf-box"><h3>💰 Dein Spendenlink</h3><p>Teile den Link: Jeder Besucher kann dir einmal am Tag ein paar Cent spenden – auch ohne Konto.</p>'
      + '<div class="kf-row"><input class="slink" readonly value="' + esc(link) + '" style="flex:1;min-width:200px"><button class="ghost scopy">Kopieren</button></div>'
      + '<p class="kf-muted">Heute: ' + (today.count || 0) + ' / 100 Spenden · Insgesamt ' + p.donations_received + ' Spenden, ' + eur(p.donation_money) + '</p></div>'
      + '<div class="kf-box"><h3>✏️ Profil bearbeiten</h3><div class="kf-row"><input class="emotto" maxlength="100" placeholder="Motto" style="flex:1" value="' + esc(p.motto) + '"></div>'
      + '<textarea class="ebio" maxlength="1000" placeholder="Erzähl etwas über dich …">' + esc(p.bio) + '</textarea><div class="kf-row"><button class="big esave">Speichern</button></div><div class="emsg"></div></div>';
  }
  h += '<div class="kf-box"><h3>📖 Gästebuch</h3>' + (!own ? '<div class="kf-row"><input class="gtext" maxlength="300" placeholder="Eintrag schreiben …" style="flex:1"><button class="ghost gsend">Eintragen</button></div><div class="gmsg"></div>' : '')
    + '<ul class="kf-list">' + ((gb.data || []).map(e => '<li><b>' + playerLink(e.author_id, authors[e.author_id]) + ':</b> ' + esc(e.body)
      + ' <span class="kf-muted">' + when(e.created_at) + '</span>' + ((own || e.author_id === me) ? ' <button class="ghost gdel" data-id="' + e.id + '">löschen</button>' : '') + '</li>').join('') || '<li class="kf-muted">Noch keine Einträge.</li>') + '</ul></div>';
  if (t !== profSeq) return;
  profBody.innerHTML = h;
  const box = profBody.querySelector('.pmsg');
  if (own) {
    profBody.querySelector('.scopy').onclick = () => { const i = profBody.querySelector('.slink'); i.select(); navigator.clipboard?.writeText(i.value); say(box, 'Link kopiert.', true); };
    act(profBody.querySelector('.esave'), profBody.querySelector('.emsg'), async () => {
      await rpc('update_bio', { new_bio: profBody.querySelector('.ebio').value, new_motto: profBody.querySelector('.emotto').value });
      setTimeout(loaders.profil, 600); return 'Gespeichert.';
    });
  } else {
    const bar = profBody.querySelector('.pact'), btn = (label, fn) => { const b = document.createElement('button'); b.className = 'ghost'; b.textContent = label; bar.appendChild(b); act(b, box, fn); };
    if (!f) btn('➕ Freund hinzufügen', async () => { const r = await rpc('friend_request', { target_id: id }); setTimeout(loaders.profil, 500); return r.status === 'accepted' ? 'Ihr seid jetzt befreundet.' : 'Freundschaftsanfrage verschickt.'; });
    else if (f.status === 'pending' && f.friend_id === me) btn('✅ Anfrage annehmen', async () => { await rpc('friend_respond', { requester_id: id, accept: true }); setTimeout(loaders.profil, 500); return 'Ihr seid jetzt befreundet.'; });
    else btn(f.status === 'accepted' ? '➖ Freundschaft beenden' : '✖ Anfrage zurückziehen', async () => { await rpc('friend_remove', { other_id: id }); setTimeout(loaders.profil, 500); return 'Erledigt.'; });
    btn('✉ Nachricht', async () => { window.kiezDM?.(id, p.username); return 'Das Gespräch ist unten rechts im Kiez-Chat geöffnet.'; });
    btn('👊 Angreifen', async () => { const r = await rpc('attack_player', { target_id: id }); window.kiezRenderProfile?.(r.profile); return r.result === 'win' ? 'Gewonnen (' + r.attacker_power + ':' + r.defender_power + ') – Beute ' + eur(r.loot) : 'Verloren (' + r.attacker_power + ':' + r.defender_power + ').'; });
    btn('🐾 Tierkampf', async () => petFight(id));
    btn('👥 In Bande einladen', async () => { const r = await rpc('gang_invite', { target_id: id }); return r.status === 'joined' ? 'Aufgenommen.' : 'Einladung verschickt.'; });
    btn(blocked ? '🔓 Entblocken' : '🚫 Blockieren', async () => { await rpc('block_player', { target_id: id, do_block: !blocked }); setTimeout(loaders.profil, 500); return blocked ? 'Entblockt.' : 'Blockiert – keine Post und keine Gästebucheinträge mehr.'; });
    act(profBody.querySelector('.gsend'), profBody.querySelector('.gmsg'), async () => { await rpc('write_guestbook', { target_id: id, entry: profBody.querySelector('.gtext').value }); setTimeout(loaders.profil, 400); return 'Eingetragen.'; });
  }
  profBody.querySelectorAll('.gdel').forEach(b => act(b, box, async () => { await rpc('delete_guestbook_entry', { entry_id: Number(b.dataset.id) }); setTimeout(loaders.profil, 300); return 'Gelöscht.'; }));
};
async function petFight(id) {
  const r = await rpc('pet_fight', { target_id: id });
  window.kiezRenderProfile?.(r.profile);
  return (r.result === 'win' ? '🐾 Dein ' + esc(r.my_pet) + ' gewinnt gegen ' + esc(r.enemy_pet) + ' (' + r.attacker_power + ':' + r.defender_power + ') · +' + eur(r.reward)
    : '🐾 Dein ' + esc(r.my_pet) + ' verliert gegen ' + esc(r.enemy_pet) + ' (' + r.attacker_power + ':' + r.defender_power + ').');
}
// Spielernamen überall anklickbar
document.addEventListener('click', e => { const a = e.target.closest('.kiez-player'); if (a) { e.preventDefault(); window.kiezOpenProfile(a.dataset.id); } });

// ================= Freunde =================
const friendBody = addPanel('freunde', 'Freunde', '🤝 Freunde');
loaders.freunde = async () => {
  const me = await myId(); if (!me) return;
  const [fr, bl] = await Promise.all([sb.from('friendships').select('*'), sb.from('blocks').select('blocked_id')]);
  const rows = fr.data || [], nm = await names(rows.flatMap(r => [r.user_id, r.friend_id]).concat((bl.data || []).map(b => b.blocked_id)));
  const other = r => r.user_id === me ? r.friend_id : r.user_id;
  const friends = rows.filter(r => r.status === 'accepted'), incoming = rows.filter(r => r.status === 'pending' && r.friend_id === me), outgoing = rows.filter(r => r.status === 'pending' && r.user_id === me);
  friendBody.innerHTML = '<div class="kf-box"><h3>🔎 Spieler suchen</h3><div class="kf-row"><input class="fq" placeholder="Name" style="flex:1"><button class="ghost fsearch">Suchen</button></div><ul class="kf-list fres"></ul></div>'
    + (incoming.length ? '<div class="kf-box"><h3>📨 Anfragen an dich</h3><ul class="kf-list">' + incoming.map(r => '<li>' + playerLink(r.user_id, nm[r.user_id]) + ' <button class="ghost facc" data-id="' + r.user_id + '">Annehmen</button> <button class="ghost fdec" data-id="' + r.user_id + '">Ablehnen</button></li>').join('') + '</ul></div>' : '')
    + '<div class="kf-box"><h3>🤝 Deine Freunde (' + friends.length + ')</h3><ul class="kf-list">' + (friends.map(r => '<li>' + playerLink(other(r), nm[other(r)]) + ' <button class="ghost frem" data-id="' + other(r) + '">Entfernen</button></li>').join('') || '<li class="kf-muted">Noch keine Freunde – such dir welche!</li>') + '</ul></div>'
    + (outgoing.length ? '<div class="kf-box"><h3>⏳ Offene Anfragen</h3><ul class="kf-list">' + outgoing.map(r => '<li>' + playerLink(r.friend_id, nm[r.friend_id]) + ' <button class="ghost frem" data-id="' + r.friend_id + '">Zurückziehen</button></li>').join('') + '</ul></div>' : '')
    + ((bl.data || []).length ? '<div class="kf-box"><h3>🚫 Blockiert</h3><ul class="kf-list">' + bl.data.map(b => '<li>' + playerLink(b.blocked_id, nm[b.blocked_id]) + ' <button class="ghost funb" data-id="' + b.blocked_id + '">Entblocken</button></li>').join('') + '</ul></div>' : '')
    + '<div class="fmsg"></div>';
  const box = friendBody.querySelector('.fmsg');
  const search = async () => {
    const q = friendBody.querySelector('.fq').value.trim(); if (q.length < 2) return;
    const { data } = await sb.from('profiles').select('id,username,level').ilike('username', '%' + q.replace(/[%_]/g, '') + '%').neq('id', me).limit(15);
    friendBody.querySelector('.fres').innerHTML = (data || []).map(p => '<li>' + playerLink(p.id, p.username) + ' <span class="kf-muted">Level ' + p.level + '</span></li>').join('') || '<li class="kf-muted">Niemand gefunden.</li>';
  };
  friendBody.querySelector('.fsearch').onclick = search;
  friendBody.querySelector('.fq').onkeydown = e => { if (e.key === 'Enter') search(); };
  friendBody.querySelectorAll('.facc').forEach(b => act(b, box, async () => { await rpc('friend_respond', { requester_id: b.dataset.id, accept: true }); loaders.freunde(); }));
  friendBody.querySelectorAll('.fdec').forEach(b => act(b, box, async () => { await rpc('friend_respond', { requester_id: b.dataset.id, accept: false }); loaders.freunde(); }));
  friendBody.querySelectorAll('.frem').forEach(b => act(b, box, async () => { await rpc('friend_remove', { other_id: b.dataset.id }); loaders.freunde(); }));
  friendBody.querySelectorAll('.funb').forEach(b => act(b, box, async () => { await rpc('block_player', { target_id: b.dataset.id, do_block: false }); loaders.freunde(); }));
};

// ================= Plunderkiste =================
const plunderBody = addPanel('plunder', 'Plunderkiste', '🎒 Plunder');
// Fester Platz für Inventar-Karte (Pfand verkaufen, Materialien) und Basteln aus index.html – die hängen sich vor #plunderlist
{ const pl = document.getElementById('plunder')?.querySelector('.inside');
  if (pl && !document.getElementById('plunderlist')) { const anchor = document.createElement('div'); anchor.id = 'plunderlist'; anchor.style.display = 'none'; pl.appendChild(anchor); } }
loaders.plunder = async () => {
  const me = await myId(); if (!me) return;
  const [cat, mine] = await Promise.all([sb.from('plunder_catalog').select('*').order('sort_order'), sb.from('user_plunder').select('*').eq('user_id', me)]);
  const have = Object.fromEntries((mine.data || []).map(x => [x.plunder_id, x.quantity]));
  const eq = window.kiezProfile?.equipped_plunder;
  plunderBody.innerHTML = '<p>Auf Pfandtouren findest du Plunder – je länger die Tour, desto öfter. Ein Stück kannst du anlegen: Es wirkt im Kampf und bei der Pfandtour. Doppelte kannst du verkaufen. In der Kronkorken-Kiste gibt es auch welchen.</p>'
    + '<p class="kf-muted">Gefunden: ' + Object.keys(have).length + ' / ' + (cat.data || []).length + ' Sorten</p><div class="kf-grid">'
    + (cat.data || []).map(c => {
      const n = have[c.id] || 0, bonus = [c.attack ? 'ATT +' + c.attack : '', c.defense ? 'DEF +' + c.defense : '', c.bottle_bonus ? 'Pfand +' + c.bottle_bonus + ' %' : ''].filter(Boolean).join(' · ');
      return '<div class="card' + (n ? '' : ' kf-locked') + '"><b class="kf-rar-' + c.rarity + '">' + esc(c.name) + (eq === c.id ? ' ✅' : '') + '</b><p class="kf-muted">' + RARITY[c.rarity] + (n ? ' · ' + n + '×' : ' · noch nicht gefunden') + '</p><p>' + esc(c.description) + '</p><p>' + bonus + '</p>'
        + (n ? '<div class="kf-row">' + (eq === c.id ? '<button class="ghost pun">Ablegen</button>' : '<button class="ghost peq" data-id="' + c.id + '">Anlegen</button>')
          + ' <button class="ghost psell" data-id="' + c.id + '">Verkaufen (' + eur(c.sell_price) + ')</button></div>' : '') + '</div>';
    }).join('') + '</div><div class="plmsg"></div>';
  const box = plunderBody.querySelector('.plmsg');
  plunderBody.querySelectorAll('.peq').forEach(b => act(b, box, async () => { window.kiezRenderProfile?.(await rpc('equip_plunder', { wanted: b.dataset.id })); setTimeout(loaders.plunder, 300); return 'Angelegt – wirkt ab sofort im Kampf und auf Pfandtouren.'; }));
  plunderBody.querySelectorAll('.pun').forEach(b => act(b, box, async () => { window.kiezRenderProfile?.(await rpc('equip_plunder', { wanted: null })); setTimeout(loaders.plunder, 300); return 'Abgelegt.'; }));
  plunderBody.querySelectorAll('.psell').forEach(b => act(b, box, async () => { const r = await rpc('sell_plunder', { wanted: b.dataset.id, qty: 1 }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.plunder, 800); return 'Verkauft für ' + eur(r.paid) + (Number(r.lost) > 0 ? ' (Rest passte nicht in den Geldbehälter)' : '') + '.'; }));
};

// ================= Kronkorken =================
const kkBody = addPanel('kronkorken', 'Kronkorken-Tausch', '🧢 Kronkorken');
const OFFERS = [
  ['energie', 5, '⚡ Energydrink', '+50 Energie sofort'],
  ['waschen', 4, '🚿 Heiße Dusche', 'Sauberkeit auf 100 %'],
  ['nuechtern', 3, '☕ Starker Kaffee', 'Promille sofort auf 0'],
  ['knast', 8, '🔑 Wärter bestechen', 'Sofort raus aus dem Knast'],
  ['plunderkiste', 15, '🎁 Plunderkiste', 'Ein zufälliges Plunderstück']
];
loaders.kronkorken = async () => {
  const p = await refreshProfile();
  kkBody.innerHTML = '<p>Kronkorken findest du auf Pfandtouren, bekommst sie für die Tagesbelohnung, für Erfolge und im Wochenwettbewerb. Hier tauschst du sie ein.</p>'
    + '<div class="kf-box"><h3>Dein Vorrat: 🧢 ' + (p?.bottlecaps || 0) + ' Kronkorken</h3></div><div class="kf-grid">'
    + OFFERS.map(o => '<div class="card"><b>' + o[2] + '</b><p>' + o[3] + '</p><button class="big kkbuy" data-id="' + o[0] + '">Tauschen – ' + o[1] + ' 🧢</button></div>').join('') + '</div><div class="kkmsg"></div>';
  kkBody.querySelectorAll('.kkbuy').forEach(b => act(b, kkBody.querySelector('.kkmsg'), async () => {
    const r = await rpc('bottlecap_shop', { offer: b.dataset.id }); window.kiezRenderProfile?.(r.profile);
    setTimeout(loaders.kronkorken, 1200); return esc(r.message) + ' (−' + r.cost + ' 🧢)';
  }));
};

// ================= Wettbewerb, Events, Wetter, Banden-Highscore =================
const compBody = addPanel('wettbewerb', 'Events & Wettbewerb', '🏁 Wettbewerb');
loaders.wettbewerb = async () => {
  const [w, ev, b, wi, gh, past] = await Promise.all([
    rpc('get_weather'), sb.from('events').select('*').gt('ends_at', new Date().toISOString()).order('starts_at'),
    rpc('weekly_ranking', { category: 'bottles' }), rpc('weekly_ranking', { category: 'wins' }), rpc('gang_highscore'),
    sb.from('competition_payouts').select('*').in('category', ['bottles', 'wins']).order('week_start', { ascending: false }).limit(6)
  ]);
  const pn = await names((past.data || []).map(x => x.user_id));
  const table = (rows, unit) => '<table class="kf-table"><tr><th>#</th><th>Spieler</th><th>' + unit + '</th></tr>' + ((rows || []).map(r => '<tr><td>' + r.rank + '</td><td>' + playerLink(r.user_id, r.username) + '</td><td>' + r.score + '</td></tr>').join('') || '<tr><td colspan="3" class="kf-muted">Noch niemand diese Woche.</td></tr>') + '</table>';
  compBody.innerHTML = '<div class="kf-grid"><div class="kf-box"><h3>🌦 Wetter heute</h3><p><b>' + esc(w.name) + '</b> · Pfand ' + (w.bonus >= 0 ? '+' : '') + w.bonus + ' %</p><p class="kf-muted">Morgen: ' + esc(w.tomorrow.name) + ' (' + (w.tomorrow.bonus >= 0 ? '+' : '') + w.tomorrow.bonus + ' %)</p></div>'
    + '<div class="kf-box"><h3>🎉 Events</h3>' + ((ev.data || []).map(e => '<p><b>' + esc(e.name) + '</b> – ' + esc(e.description) + '<br><span class="kf-muted">' + when(e.starts_at) + ' bis ' + when(e.ends_at) + (e.bottle_bonus ? ' · Pfand +' + e.bottle_bonus + ' %' : '') + (e.xp_bonus ? ' · Punkte +' + e.xp_bonus + ' %' : '') + '</span></p>').join('') || '<p class="kf-muted">Gerade kein Event. Schau bald wieder vorbei!</p>') + '</div></div>'
    + '<div class="kf-box"><h3>🏆 Wochenwettbewerb (Mo–So)</h3><p class="kf-muted">Preise je Kategorie: 1. Platz 50 🧢 + 500 Punkte · 2. Platz 30 🧢 + 300 · 3. Platz 15 🧢 + 150. Auszahlung automatisch nach Wochenende.</p><div class="kf-grid"><div><h3>♻️ Meiste Flaschen</h3>' + table(b, 'Flaschen') + '</div><div><h3>👊 Meiste Siege</h3>' + table(wi, 'Siege') + '</div></div>'
    + ((past.data || []).length ? '<p class="kf-muted">Letzte Sieger: ' + past.data.map(x => (x.category === 'bottles' ? '♻️' : '👊') + ' ' + x.rank + '. ' + esc(pn[x.user_id]) + ' (' + new Date(x.week_start).toLocaleDateString('de-DE') + ')').join(' · ') + '</p>' : '') + '</div>'
    + '<div class="kf-box"><h3>👥 Banden-Highscore</h3><table class="kf-table"><tr><th>#</th><th>Bande</th><th>Mitglieder</th><th>Punkte</th><th>Kriegssiege</th></tr>' + ((gh || []).map((g, i) => '<tr><td>' + (i + 1) + '</td><td><a href="#" class="kiez-gang" data-id="' + g.id + '">' + esc(g.name) + '</a></td><td>' + g.members + '</td><td>' + g.points + '</td><td>' + g.war_wins + '</td></tr>').join('') || '<tr><td colspan="5" class="kf-muted">Noch keine Banden.</td></tr>') + '</table></div>';
};

// ================= Banden =================
let gangView = null;
document.addEventListener('click', e => { const a = e.target.closest('.kiez-gang'); if (a) { e.preventDefault(); gangView = a.dataset.id; show('gangs'); window.kiezLoadGang(); } });
loaders.gangs = () => window.kiezLoadGang();
// Nur die neueste Ladeanfrage darf zeichnen (sonst überschreibt eine langsame alte Antwort neue Daten)
let gangSeq = 0;
const stale = t => t !== gangSeq;
window.kiezLoadGang = async () => {
  const el = document.getElementById('kiezgang'); if (!el) return;
  const t = ++gangSeq;
  const me = await myId(); if (!me) return;
  try { await rpc('resolve_gang_wars'); } catch (e) { /* nicht kritisch */ }
  const mine = (await sb.from('gang_members').select('*').eq('user_id', me).maybeSingle()).data;
  if (stale(t)) return;
  if (gangView && (!mine || gangView !== mine.gang_id)) return renderGangPublic(el, gangView, mine, t);
  gangView = null;
  if (!mine) return renderNoGang(el, me, t);
  return renderMyGang(el, me, mine, t);
};
async function gangMembers(gid) {
  const { data } = await sb.from('gang_members').select('user_id,role,joined_at').eq('gang_id', gid);
  const ids = (data || []).map(m => m.user_id);
  const pr = ids.length ? (await sb.from('profiles').select('id,username,level,xp').in('id', ids)).data || [] : [];
  const byId = Object.fromEntries(pr.map(p => [p.id, p]));
  (data || []).forEach(m => m.profiles = byId[m.user_id]);
  return (data || []).sort((a, b) => RANK[b.role] - RANK[a.role] || (b.profiles?.xp || 0) - (a.profiles?.xp || 0));
}
async function renderGangPublic(el, gid, mine, t) {
  const g = (await sb.from('gangs').select('*').eq('id', gid).maybeSingle()).data;
  if (!g) { gangView = null; return window.kiezLoadGang(); }
  const mem = await gangMembers(gid);
  if (stale(t)) return;
  el.innerHTML = '<div class="kf-row"><button class="ghost gback">← Zurück</button></div><div class="kf-box"><h3>' + esc(g.name) + '</h3><p class="kf-bio">' + (esc(g.description) || '<span class="kf-muted">Keine Beschreibung.</span>') + '</p>'
    + '<p class="kf-muted">' + mem.length + '/30 Mitglieder · Angriff ' + g.attack_level + '/10 · Verteidigung ' + g.defense_level + '/10 · Kriege ' + g.war_wins + ' S / ' + g.war_losses + ' N · ' + (g.is_open ? 'offen für alle' : 'nur mit Einladung') + '</p>'
    + (!mine ? '<div class="kf-row">' + (g.is_open ? '<button class="big gjoin">Beitreten</button>' : '<button class="big gapply">Bewerben</button>') + '</div>' : '')
    + '<ul class="kf-list">' + mem.map(m => '<li>' + playerLink(m.user_id, m.profiles?.username) + ' · ' + ROLE[m.role] + ' · Level ' + (m.profiles?.level || '?') + '</li>').join('') + '</ul><div class="gmsg"></div></div>';
  el.querySelector('.gback').onclick = () => { gangView = null; window.kiezLoadGang(); };
  const box = el.querySelector('.gmsg');
  const j = el.querySelector('.gjoin'), a = el.querySelector('.gapply');
  if (j) act(j, box, async () => { await rpc('join_gang', { wanted_gang: gid }); gangView = null; setTimeout(window.kiezLoadGang, 500); return 'Willkommen in der Bande!'; });
  if (a) act(a, box, async () => { await rpc('gang_apply', { wanted_gang: gid }); return 'Bewerbung verschickt.'; });
}
async function renderNoGang(el, me, t) {
  const [gangs, mem, req] = await Promise.all([sb.from('gangs').select('*').order('name'), sb.from('gang_members').select('gang_id'), sb.from('gang_requests').select('*').eq('user_id', me)]);
  const count = {}; (mem.data || []).forEach(m => count[m.gang_id] = (count[m.gang_id] || 0) + 1);
  const gn = Object.fromEntries((gangs.data || []).map(x => [x.id, x.name]));
  if (stale(t)) return;
  const invites = (req.data || []).filter(r => r.kind === 'invite'), applied = new Set((req.data || []).filter(r => r.kind === 'apply').map(r => r.gang_id));
  el.innerHTML = (invites.length ? '<div class="kf-box"><h3>📨 Einladungen</h3><ul class="kf-list">' + invites.map(r => '<li><b>' + esc(gn[r.gang_id]) + '</b> <button class="ghost ginvacc" data-id="' + r.gang_id + '">Annehmen</button> <button class="ghost ginvdec" data-id="' + r.gang_id + '">Ablehnen</button></li>').join('') + '</ul></div>' : '')
    + '<div class="kf-box"><h3>🏴 Eigene Bande gründen</h3><div class="kf-row"><input class="gname" maxlength="30" placeholder="Bandenname" style="flex:1"><button class="big gcreate">Gründen – 50,00 €</button></div></div>'
    + '<div class="kf-box"><h3>Banden im Kiez</h3><div class="kf-grid">' + ((gangs.data || []).map(g => '<div class="card"><b><a href="#" class="kiez-gang" data-id="' + g.id + '">' + esc(g.name) + '</a></b><p class="kf-muted">' + (count[g.id] || 0) + '/30 · ' + (g.is_open ? 'offen' : 'mit Einladung') + '</p><p>' + esc((g.description || '').slice(0, 120)) + '</p>'
      + (g.is_open ? '<button class="ghost gj" data-id="' + g.id + '">Beitreten</button>' : applied.has(g.id) ? '<button class="ghost gwd" data-id="' + g.id + '">Bewerbung zurückziehen</button>' : '<button class="ghost ga" data-id="' + g.id + '">Bewerben</button>') + '</div>').join('') || '<p class="kf-muted">Noch keine Bande. Gründe die erste!</p>') + '</div></div><div class="gmsg"></div>';
  const box = el.querySelector('.gmsg'), reload = () => setTimeout(window.kiezLoadGang, 400);
  act(el.querySelector('.gcreate'), box, async () => { await rpc('create_gang', { gang_name: el.querySelector('.gname').value }); await refreshProfile(); reload(); return 'Bande gegründet. Du bist jetzt Chef!'; });
  el.querySelectorAll('.ginvacc,.gj').forEach(b => act(b, box, async () => { await rpc('join_gang', { wanted_gang: b.dataset.id }); reload(); return 'Willkommen in der Bande!'; }));
  el.querySelectorAll('.ginvdec,.gwd').forEach(b => act(b, box, async () => { await rpc('gang_request_delete', { wanted_gang: b.dataset.id, target_id: me }); reload(); }));
  el.querySelectorAll('.ga').forEach(b => act(b, box, async () => { await rpc('gang_apply', { wanted_gang: b.dataset.id }); reload(); return 'Bewerbung verschickt.'; }));
}
async function renderMyGang(el, me, mine, t) {
  const gid = mine.gang_id, myRank = RANK[mine.role];
  const [g, mem, req, chat, log, wars, allGangs] = await Promise.all([
    sb.from('gangs').select('*').eq('id', gid).single(), gangMembers(gid),
    sb.from('gang_requests').select('*').eq('gang_id', gid),
    sb.from('gang_messages').select('*').eq('gang_id', gid).order('created_at', { ascending: false }).limit(30),
    sb.from('gang_log').select('*').eq('gang_id', gid).order('created_at', { ascending: false }).limit(25),
    sb.from('gang_wars').select('*').or('attacker_gang.eq.' + gid + ',defender_gang.eq.' + gid).order('started_at', { ascending: false }).limit(10),
    sb.from('gangs').select('id,name')
  ]);
  const G = g.data, gname = Object.fromEntries((allGangs.data || []).map(x => [x.id, x.name]));
  const nm = await names((req.data || []).map(r => r.user_id).concat((chat.data || []).map(c => c.user_id), (log.data || []).map(l => l.user_id)));
  const cost = l => 50 * Math.pow(l + 1, 2);
  const activeWar = (wars.data || []).find(w => !w.resolved);
  if (stale(t)) return;
  const apps = (req.data || []).filter(r => r.kind === 'apply'), invs = (req.data || []).filter(r => r.kind === 'invite');
  el.innerHTML = '<div class="kf-box"><h3>🏴 ' + esc(G.name) + ' <span class="kf-muted">– du bist ' + ROLE[mine.role] + '</span></h3>'
    + '<p class="kf-bio">' + (esc(G.description) || '<span class="kf-muted">Keine Beschreibung.</span>') + '</p>'
    + '<table class="kf-table"><tr><td>Kasse</td><td><b>' + eur(G.balance) + '</b></td><td>Mitglieder</td><td>' + mem.length + '/30</td></tr><tr><td>Angriff</td><td>' + G.attack_level + '/10 (+' + G.attack_level * 2 + ' ATT)</td><td>Verteidigung</td><td>' + G.defense_level + '/10 (+' + G.defense_level * 2 + ' DEF)</td></tr><tr><td>Bandenkriege</td><td>' + G.war_wins + ' S / ' + G.war_losses + ' N</td><td>Aufnahme</td><td>' + (G.is_open ? 'offen' : 'Einladung') + '</td></tr></table>'
    + '<div class="kf-row"><input class="gdon" type="number" min="0.01" step="0.01" placeholder="Betrag"><button class="ghost gdonb">In die Kasse einzahlen</button>'
    + (myRank >= 3 ? ' <button class="ghost gup" data-k="attack"' + (G.attack_level >= 10 ? ' disabled' : '') + '>Angriff ausbauen (' + eur(cost(G.attack_level)) + ')</button> <button class="ghost gup" data-k="defense"' + (G.defense_level >= 10 ? ' disabled' : '') + '>Verteidigung ausbauen (' + eur(cost(G.defense_level)) + ')</button>' : '')
    + ' <button class="ghost gleave">Bande verlassen</button></div><div class="gmsg"></div></div>'
    + '<div class="kf-box"><h3>⚔️ Bandenkrieg</h3>' + (activeWar ? '<p><b>' + esc(gname[activeWar.attacker_gang]) + '</b> ' + activeWar.attacker_score + ' : ' + activeWar.defender_score + ' <b>' + esc(gname[activeWar.defender_gang]) + '</b> · Einsatz ' + eur(activeWar.stake) + ' · Ende ' + when(activeWar.ends_at) + '</p><p class="kf-muted">Jeder gewonnene Kampf zwischen Mitgliedern der beiden Banden zählt einen Punkt.</p>' : '<p class="kf-muted">Gerade kein Krieg.</p>')
    + (!activeWar && myRank >= 3 ? '<div class="kf-row"><select class="wtarget">' + (allGangs.data || []).filter(x => x.id !== gid).map(x => '<option value="' + x.id + '">' + esc(x.name) + '</option>').join('') + '</select><input class="wstake" type="number" min="20" value="50" style="width:90px"><button class="ghost wdecl">Krieg erklären (Einsatz aus der Kasse)</button></div><p class="kf-muted">24 Stunden. Gewinnt ihr, bekommt ihr den Einsatz zurück plus denselben Betrag aus der gegnerischen Kasse. Verliert ihr, geht der Einsatz an die Gegner.</p>' : '')
    + ((wars.data || []).filter(w => w.resolved).length ? '<ul class="kf-list">' + wars.data.filter(w => w.resolved).map(w => '<li class="kf-muted">' + esc(gname[w.attacker_gang]) + ' ' + w.attacker_score + ':' + w.defender_score + ' ' + esc(gname[w.defender_gang]) + ' – ' + (w.winner_gang ? 'Sieger: ' + esc(gname[w.winner_gang]) : 'unentschieden') + '</li>').join('') + '</ul>' : '') + '</div>'
    + '<div class="kf-box"><h3>👥 Mitglieder</h3><ul class="kf-list">' + mem.map(m => '<li>' + playerLink(m.user_id, m.profiles?.username) + ' · <b>' + ROLE[m.role] + '</b> · Level ' + (m.profiles?.level || '?')
      + (mine.role === 'owner' && m.user_id !== me ? ' <select class="grole" data-id="' + m.user_id + '">' + ['member', 'officer', 'co', 'owner'].map(r => '<option value="' + r + '"' + (r === m.role ? ' selected' : '') + '>' + (r === 'owner' ? 'Chef übergeben' : ROLE[r]) + '</option>').join('') + '</select>' : '')
      + (myRank >= 3 && RANK[m.role] < myRank ? ' <button class="ghost gkick" data-id="' + m.user_id + '">Rauswerfen</button>' : '') + '</li>').join('') + '</ul>'
    + (myRank >= 2 ? '<div class="kf-row"><input class="ginvname" placeholder="Spielername einladen"><button class="ghost ginv">Einladen</button></div>' : '')
    + (apps.length ? '<h3>Bewerbungen</h3><ul class="kf-list">' + apps.map(r => '<li>' + playerLink(r.user_id, nm[r.user_id]) + (myRank >= 2 ? ' <button class="ghost gappok" data-id="' + r.user_id + '">Aufnehmen</button> <button class="ghost gappno" data-id="' + r.user_id + '">Ablehnen</button>' : '') + '</li>').join('') + '</ul>' : '')
    + (invs.length ? '<p class="kf-muted">Eingeladen: ' + invs.map(r => esc(nm[r.user_id])).join(', ') + '</p>' : '') + '</div>'
    + (myRank >= 3 ? '<div class="kf-box"><h3>⚙️ Bandenprofil</h3><textarea class="gdesc" maxlength="1000">' + esc(G.description) + '</textarea><div class="kf-row"><label><input type="checkbox" class="gopen"' + (G.is_open ? ' checked' : '') + '> Jeder darf ohne Einladung beitreten</label> <button class="ghost gsave">Speichern</button></div></div>' : '')
    + '<div class="kf-box"><h3>💬 Bandenchat</h3><div class="kf-row"><input class="gchat" maxlength="500" placeholder="Nachricht an die Bande" style="flex:1"><button class="ghost gchatb">Senden</button></div><ul class="kf-list kf-chat">' + ((chat.data || []).map(c => '<li><b>' + esc(nm[c.user_id]) + ':</b> ' + esc(c.body) + ' <span class="kf-muted">' + when(c.created_at) + '</span></li>').join('') || '<li class="kf-muted">Noch still hier.</li>') + '</ul></div>'
    + '<div class="kf-box"><h3>📜 Protokoll</h3><ul class="kf-list">' + (log.data || []).map(l => '<li class="kf-muted">' + when(l.created_at) + ' · ' + esc(nm[l.user_id] || 'Kiez') + ' ' + esc(l.info) + (Number(l.amount) ? ' (' + eur(l.amount) + ')' : '') + '</li>').join('') + '</ul></div>';
  const box = el.querySelector('.gmsg'), reload = () => setTimeout(window.kiezLoadGang, 400), q = s => el.querySelector(s);
  act(q('.gdonb'), box, async () => { const r = await rpc('donate_to_gang', { amount: Number(q('.gdon').value) }); await refreshProfile(); reload(); return eur(r.donated) + ' eingezahlt.'; });
  el.querySelectorAll('.gup').forEach(b => act(b, box, async () => { await rpc('upgrade_gang', { kind: b.dataset.k }); reload(); return 'Ausgebaut – der Bonus gilt sofort.'; }));
  act(q('.gleave'), box, async () => { if (!confirm('Bande wirklich verlassen?')) return; await rpc('leave_gang'); reload(); return 'Du hast die Bande verlassen.'; });
  if (q('.wdecl')) act(q('.wdecl'), box, async () => { await rpc('declare_gang_war', { target_gang: q('.wtarget').value, stake: Number(q('.wstake').value) }); reload(); return 'Krieg erklärt!'; });
  el.querySelectorAll('.grole').forEach(s => s.onchange = async () => { if (s.value === 'owner' && !confirm('Chefrolle wirklich übergeben?')) return reload(); try { await rpc('set_gang_role', { target_id: s.dataset.id, new_role: s.value }); reload(); } catch (e) { say(box, esc(e.message)); } });
  el.querySelectorAll('.gkick').forEach(b => act(b, box, async () => { if (!confirm('Wirklich rauswerfen?')) return; await rpc('kick_gang_member', { target_id: b.dataset.id }); reload(); }));
  if (q('.ginv')) act(q('.ginv'), box, async () => {
    const n = q('.ginvname').value.trim(); const { data } = await sb.from('profiles').select('id').ilike('username', n.replace(/[%_]/g, '')).maybeSingle();
    if (!data) throw new Error('Spieler nicht gefunden'); const r = await rpc('gang_invite', { target_id: data.id }); reload(); return r.status === 'joined' ? 'Aufgenommen.' : 'Einladung verschickt.';
  });
  el.querySelectorAll('.gappok').forEach(b => act(b, box, async () => { await rpc('gang_invite', { target_id: b.dataset.id }); reload(); }));
  el.querySelectorAll('.gappno').forEach(b => act(b, box, async () => { await rpc('gang_request_delete', { wanted_gang: gid, target_id: b.dataset.id }); reload(); }));
  if (q('.gsave')) act(q('.gsave'), box, async () => { await rpc('update_gang_profile', { new_description: q('.gdesc').value, open_for_all: q('.gopen').checked }); reload(); return 'Gespeichert.'; });
  const sendChat = async () => { try { await rpc('post_gang_message', { message_body: q('.gchat').value }); reload(); } catch (e) { say(box, esc(e.message)); } };
  q('.gchatb').onclick = sendChat; q('.gchat').onkeydown = e => { if (e.key === 'Enter') sendChat(); };
}

// ================= Prügelei: Namen anklickbar + Tierkampf =================
function enhanceOpponents() {
  const list = document.getElementById('opponents'); if (!list) return;
  list.querySelectorAll('.card').forEach(card => {
    if (card.dataset.kf) return; const atk = card.querySelector('.attackplayer'); if (!atk) return;
    card.dataset.kf = '1'; const id = atk.dataset.id, b = card.querySelector('b');
    if (b) b.innerHTML = playerLink(id, b.textContent);
    const pf = document.createElement('button'); pf.className = 'ghost'; pf.textContent = '🐾 Tierkampf'; atk.after(' ', pf);
    act(pf, $('#fightmsg'), () => petFight(id));
  });
}
const oppObserver = new MutationObserver(enhanceOpponents);
if (document.getElementById('opponents')) oppObserver.observe(document.getElementById('opponents'), { childList: true });

// ================= Kopfzeile: Kronkorken, Wetter, Spendenbehälter =================
let weather = null;
async function updateHeader(p) {
  if (!p) return;
  const stats = $('.stats');
  if (stats) {
    let k = stats.querySelector('.kronkorken-stat');
    if (!k) { k = document.createElement('div'); k.className = 'stat kronkorken-stat'; k.style.cursor = 'pointer'; k.innerHTML = '<small>Kronkorken</small><b id="kkcount">0</b><em>Tauschen im Kiez</em>'; k.onclick = () => show('kronkorken'); stats.appendChild(k); }
    k.querySelector('b').textContent = p.bottlecaps ?? 0;
  }
  // Warnung, wenn der Geldbehälter voll ist (Einnahmen gehen sonst still verloren)
  const mEm = document.getElementById('money')?.parentElement?.querySelector('em');
  if (mEm) { const full = Number(p.money) >= Number(p.cash_capacity) - 0.001; mEm.textContent = full ? '⚠️ Behälter voll – ausbauen!' : 'Begrenzt durch Behälter'; mEm.style.color = full ? '#ff8a6a' : ''; }
  const title = $('#overview .classic-profile-title');
  if (title) {
    try { weather = weather || await rpc('get_weather'); } catch (e) { }
    let badge = title.querySelector('.kiez-weather-badge');
    if (weather && !badge) { badge = document.createElement('span'); badge.className = 'kiez-weather-badge'; badge.style.cssText = 'margin-left:10px;padding:3px 10px;background:#00000055;border-radius:10px;font-size:11px;color:#e8dcc0;vertical-align:middle;cursor:pointer'; badge.onclick = () => show('wettbewerb'); title.appendChild(badge); }
    if (badge && weather) badge.textContent = weather.name + ' · Pfand ' + (weather.bonus >= 0 ? '+' : '') + weather.bonus + '%';
  }
  const slot = $('.kiez-slots-row p');
  if (slot) {
    const fill = p.cash_capacity > 0 ? Math.min(100, Math.round(p.money / p.cash_capacity * 100)) : 0;
    slot.innerHTML = 'Fassungsvermögen: ' + eur(p.cash_capacity) + ' · Gefüllt zu <b>' + fill + ' %</b><br>' + (p.donations_received ? 'Schon ' + p.donations_received + ' Spenden über deinen Link (' + eur(p.donation_money) + ').' : 'Noch keine Spenden.') + ' <a href="#" class="kf-mylink">Spendenlink teilen</a>';
    slot.querySelector('.kf-mylink').onclick = e => { e.preventDefault(); window.kiezOpenProfile(); };
  }
}
let firstProfile = true;
window.kiezOnProfile = p => {
  updateHeader(p); if (p?.is_admin) addAdminEvents();
  applyAvatar(p); updateReferral(p);
  // Nach dem Login: eine schon geöffnete neue Seite, die noch ohne Konto geladen wurde, nachladen
  if (firstProfile) { firstProfile = false; watchPanels(); updateUnread(); loaders.rumors(); const open = document.querySelector('section.panel.active-view'); if (open && loaders[open.id] && open.id !== 'gangs') loaders[open.id](); }
};
setInterval(() => { if (window.kiezProfile) updateHeader(window.kiezProfile); }, 5000);

// ================= Admin: Events =================
function addAdminEvents() {
  const cards = $('#admin .cards'); if (!cards || cards.querySelector('.kf-events')) return;
  const c = document.createElement('div'); c.className = 'card kf-events';
  c.innerHTML = '<b>🎉 Events</b><div class="kf-row"><input class="ename" placeholder="Name (z. B. Doppelte Pfandwoche)" style="flex:1"></div><div class="kf-row"><input class="edesc" placeholder="Beschreibung" style="flex:1"></div>'
    + '<div class="kf-row"><label class="kf-muted">Start <input type="datetime-local" class="estart"></label><label class="kf-muted">Ende <input type="datetime-local" class="eend"></label></div>'
    + '<div class="kf-row"><label class="kf-muted">Pfand +% <input type="number" class="ebot" value="100" min="0" max="200" style="width:70px"></label><label class="kf-muted">Punkte +% <input type="number" class="exp" value="0" min="0" max="200" style="width:70px"></label><button class="ghost ecreate">Anlegen</button></div><ul class="kf-list elist"></ul><div class="emsg"></div>';
  cards.appendChild(c);
  const list = async () => {
    const { data } = await sb.from('events').select('*').order('starts_at', { ascending: false }).limit(10);
    c.querySelector('.elist').innerHTML = (data || []).map(e => '<li>' + esc(e.name) + ' <span class="kf-muted">' + when(e.starts_at) + '–' + when(e.ends_at) + '</span> <button class="ghost edel" data-id="' + e.id + '">löschen</button></li>').join('');
    c.querySelectorAll('.edel').forEach(b => act(b, c.querySelector('.emsg'), async () => { await rpc('admin_delete_event', { event_id: Number(b.dataset.id) }); list(); }));
  };
  act(c.querySelector('.ecreate'), c.querySelector('.emsg'), async () => {
    const v = s => c.querySelector(s).value;
    await rpc('admin_create_event', { event_name: v('.ename'), event_description: v('.edesc'), starts: new Date(v('.estart')).toISOString(), ends: new Date(v('.eend')).toISOString(), bottle_bonus: Number(v('.ebot')), xp_bonus: Number(v('.exp')) });
    list(); return 'Event angelegt.';
  });
  list();
}

// ================= Spendenlink-Besuch (?spende=Name), auch ohne Login =================
const spende = new URLSearchParams(location.search).get('spende');
if (spende) {
  const m = document.createElement('div'); m.className = 'kf-modal';
  m.innerHTML = '<div><h2>💰 Spende für ' + esc(spende) + '</h2><p>' + esc(spende) + ' sammelt im Kiezkönig Pfand und freut sich über ein paar Cent. Die Spende kostet dich nichts – sie kommt aus der Kiezkasse.</p><div class="kf-row" style="justify-content:center"><button class="big sgo">Jetzt spenden</button><button class="ghost sclose">Schließen</button></div><div class="smsg"></div></div>';
  document.body.appendChild(m);
  m.querySelector('.sclose').onclick = () => { m.remove(); history.replaceState(null, '', location.pathname); };
  act(m.querySelector('.sgo'), m.querySelector('.smsg'), async () => { const r = await rpc('donate_link', { target_name: spende }); m.querySelector('.sgo').remove(); return 'Danke! ' + esc(r.name) + ' bekommt ' + eur(r.amount) + '. Lust, selbst mitzuspielen? Einfach registrieren!'; });
}


// ================= Kiezpost: Systemnachrichten + gelesen/ungelesen =================
const NKIND = { kampf: '👊', tierkampf: '🐾', freund: '🤝', gaestebuch: '📖', bande: '👥', wettbewerb: '🏆', werben: '📣', lotto: '🎰', erfolg: '🎖', basar: '🛍', zocken: '🎲', quest: '📜', revier: '🏴' };
function ensureBox(panelSel, id, html) {
  const inside = document.querySelector(panelSel + ' > .inside'); if (!inside) return null;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div'); el.id = id; el.style.display = 'none'; el.innerHTML = html || ''; inside.appendChild(el);
    // aktiven Reiter neu anwenden, damit der neue Bereich gleich richtig ein-/ausgeblendet ist
    setTimeout(() => document.querySelector(panelSel + ' .section-tools .subtab-active')?.click(), 0);
  }
  return el;
}
loaders.messages = async () => {
  const box = ensureBox('#messages', 'kf-notifications');
  if (!box) return;
  const { data } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  box.innerHTML = '<div class="kf-box"><h3>🔔 Systemnachrichten</h3><ul class="kf-list">' + ((data || []).map(n => '<li' + (n.read_at ? '' : ' style="font-weight:700"') + '>' + (NKIND[n.kind] || '•') + ' ' + esc(n.body) + ' <span class="kf-muted">' + when(n.created_at) + '</span></li>').join('') || '<li class="kf-muted">Noch keine Systemnachrichten.</li>') + '</ul></div>';
  try { await rpc('mark_messages_read'); if ((data || []).some(n => !n.read_at)) await rpc('mark_notifications_read'); } catch (e) { }
  updateUnread();
};
async function updateUnread() {
  if (!window.kiezProfile) return;
  let c; try { c = await rpc('unread_counts'); } catch (e) { return; }
  const total = (c.messages || 0) + (c.notifications || 0);
  const slip = document.querySelector('.slip-messages b');
  if (slip) slip.textContent = total ? 'Postfach (' + total + ')' : 'Postfach';
  const nav = [...document.querySelectorAll('.side [data-view="messages"]')][0];
  if (nav) nav.textContent = '✉ Kiezpost' + (total ? ' (' + total + ')' : '');
  const sys = [...document.querySelectorAll('#messages .section-tools span')].find(x => x.textContent.startsWith('System'));
  if (sys) sys.textContent = 'System' + (c.notifications ? ' (' + c.notifications + ')' : '');
}
setInterval(updateUnread, 60000);

// ================= Erfolge: kommende Meilensteine mit Fortschritt =================
loaders.achievements = async () => {
  const box = ensureBox('#achievements', 'kf-milestones'); if (!box) return;
  const me = await myId(); if (!me) return;
  const [st, defs, got] = await Promise.all([rpc('achievement_progress'), sb.from('achievement_defs').select('*').order('sort_order'), sb.from('user_achievements').select('achievement_id').eq('user_id', me)]);
  const have = new Set((got.data || []).map(x => x.achievement_id));
  const open = (defs.data || []).filter(d => d.stat && !have.has(d.id)).map(d => ({ d, cur: Number(st[d.stat] || 0), pct: Math.min(100, Math.floor(Number(st[d.stat] || 0) / d.threshold * 100)) })).sort((a, b) => b.pct - a.pct);
  box.innerHTML = '<div class="kf-box"><h3>🎯 Kommende Meilensteine (' + open.length + ' offen, ' + have.size + ' geschafft)</h3><ul class="kf-list">' + open.map(o => '<li><b>' + esc(o.d.name) + '</b> – ' + esc(o.d.description) + '<div style="background:#11110f;height:8px;border-radius:4px;margin:4px 0"><div style="width:' + o.pct + '%;height:8px;border-radius:4px;background:#c4a747"></div></div><span class="kf-muted">' + Math.floor(o.cur) + ' / ' + Number(o.d.threshold) + ' · Belohnung ' + eur(o.d.reward) + (o.d.reward_caps ? ' + ' + o.d.reward_caps + ' 🧢' : '') + '</span></li>').join('') + '</ul></div>';
};

// ================= Glücksspiel: Kiez-Lotto =================
loaders.missions = async () => {
  const box = ensureBox('#missions', 'kf-lotto'); if (!box) return;
  const L = await rpc('lotto_info');
  box.innerHTML = '<div class="card" style="grid-column:1/-1"><b>🎰 Kiez-Lotto</b><p>Tippe eine Zahl von 1 bis 49 (2 € pro Los, bis zu 10 Lose pro Woche). Ziehung am ' + new Date(L.draw_at).toLocaleDateString('de-DE') + '. Wer richtig liegt, teilt sich den Topf – ohne Gewinner wandert er in den Jackpot.</p>'
    + '<p><b>Topf: ' + eur(L.pot) + '</b> · ' + L.tickets + ' Lose im Spiel · Deine Zahlen: ' + ((L.mine || []).join(', ') || '–') + '</p>'
    + (L.last ? '<p class="kf-muted">Letzte Ziehung: Zahl ' + L.last.number + ' · ' + (L.last.winners ? L.last.winners + ' Gewinner je ' + eur(L.last.prize) : 'kein Gewinner – Jackpot!') + '</p>' : '')
    + '<div class="kf-row"><input type="number" min="1" max="49" class="lnum" value="' + (1 + Math.floor(Math.random() * 49)) + '" style="width:80px"><button class="ghost lbuy">Los kaufen – 2,00 €</button></div><div class="lmsg"></div></div>';
  act(box.querySelector('.lbuy'), box.querySelector('.lmsg'), async () => {
    const r = await rpc('buy_lotto_ticket', { chosen: Number(box.querySelector('.lnum').value) }); window.kiezRenderProfile?.(r.profile);
    setTimeout(loaders.missions, 1500); return 'Los mit der Zahl ' + r.number + ' gekauft. Viel Glück!';
  });
};

// ================= Kiezladen: Gegenstände verkaufen =================
function enhanceInventory() {
  document.querySelectorAll('#inventorylist .card').forEach(card => {
    if (card.dataset.kfSell) return; const eq = card.querySelector('.equipitem'); if (!eq) return;
    card.dataset.kfSell = '1';
    const b = document.createElement('button'); b.className = 'ghost'; b.textContent = 'Verkaufen (50 %)'; eq.after(' ', b);
    const box = document.createElement('div'); card.appendChild(box);
    act(b, box, async () => { if (!confirm('Einen davon für den halben Preis verkaufen?')) return; const r = await rpc('sell_item', { wanted_item: eq.dataset.id }); window.kiezRenderProfile?.(r.profile); return esc(r.item) + ' verkauft für ' + eur(r.paid) + '.'; });
  });
}
const invEl = document.getElementById('inventorylist');
if (invEl) { new MutationObserver(enhanceInventory).observe(invEl, { childList: true }); enhanceInventory(); }

// ================= Kiez-Brett (öffentliche Pinnwand) =================
const boardBody = addPanel('brett', 'Kiez-Brett', '📌 Kiez-Brett');
loaders.brett = async () => {
  const me = await myId(); if (!me) return;
  const { data } = await sb.from('board_posts').select('*').order('created_at', { ascending: false }).limit(50);
  const nm = await names((data || []).map(x => x.user_id));
  const admin = window.kiezProfile?.is_admin;
  boardBody.innerHTML = '<p>Die Pinnwand für alle im Kiez: Suche, Angebote, Sprüche. Freundlich bleiben – Beleidigungen werden gelöscht.</p><div class="kf-box"><div class="kf-row"><input class="bpost" maxlength="300" placeholder="Was gibt es Neues im Kiez?" style="flex:1"><button class="big bsend">Anpinnen</button></div><div class="bmsg"></div></div>'
    + '<div class="kf-box"><ul class="kf-list">' + ((data || []).map(x => '<li><b>' + playerLink(x.user_id, nm[x.user_id]) + ':</b> ' + esc(x.body) + ' <span class="kf-muted">' + when(x.created_at) + '</span>' + (x.user_id === me || admin ? ' <button class="ghost bdel" data-id="' + x.id + '">löschen</button>' : '') + '</li>').join('') || '<li class="kf-muted">Noch leer – schreib den ersten Beitrag!</li>') + '</ul></div>';
  const box = boardBody.querySelector('.bmsg');
  const send = boardBody.querySelector('.bsend');
  act(send, box, async () => { await rpc('post_board', { message_body: boardBody.querySelector('.bpost').value }); setTimeout(loaders.brett, 300); });
  boardBody.querySelector('.bpost').onkeydown = e => { if (e.key === 'Enter') send.click(); };
  boardBody.querySelectorAll('.bdel').forEach(b => act(b, box, async () => { await rpc('delete_board_post', { post_id: Number(b.dataset.id) }); setTimeout(loaders.brett, 300); }));
};

// ================= Einstellungen =================
const setBody = addPanel('einstellungen', 'Einstellungen', '⚙️ Einstellungen');
loaders.einstellungen = async () => {
  const p = await refreshProfile(); if (!p) return;
  setBody.innerHTML = '<div class="kf-grid">'
    + '<div class="kf-box"><h3>🖼 Profilbild</h3><div class="kf-row"><div class="kf-av" style="width:72px;height:72px;background:#11110f center/cover;border:2px solid #4a473f' + (p.avatar ? ';background-image:url(\'' + p.avatar + '\')' : '') + '"></div><input type="file" accept="image/png,image/jpeg,image/webp" class="avfile"></div><div class="kf-row"><button class="ghost avdel">Bild entfernen</button></div><div class="avmsg"></div></div>'
    + '<div class="kf-box"><h3>✏️ Name ändern</h3><p class="kf-muted">Kostet 30 🧢 Kronkorken, höchstens alle 30 Tage. Du hast ' + p.bottlecaps + ' 🧢.</p><div class="kf-row"><input class="nname" maxlength="20" value="' + esc(p.username) + '"><button class="ghost nsave">Ändern</button></div><div class="nmsg"></div></div>'
    + '<div class="kf-box"><h3>🔑 Passwort ändern</h3><div class="kf-row"><input type="password" class="pw1" placeholder="Neues Passwort (mind. 6 Zeichen)" autocomplete="new-password"></div><div class="kf-row"><input type="password" class="pw2" placeholder="Wiederholen" autocomplete="new-password"><button class="ghost psave">Speichern</button></div><div class="pmsg2"></div></div>'
    + '<div class="kf-box"><h3>🎖 Titel</h3><p class="kf-muted">Zeig einen deiner Erfolge als Titel unter deinem Namen.</p><div class="kf-row"><select class="tsel" style="flex:1"><option value="">– kein Titel –</option></select><button class="ghost tsave">Übernehmen</button></div><div class="tmsg"></div></div>'
    + '<div class="kf-box"><h3>🚪 Abmelden</h3><p class="kf-muted">Meldet dich auf diesem Gerät ab.</p><button class="ghost lout">Abmelden</button></div></div>';
  const q = x => setBody.querySelector(x);
  q('.avfile').onchange = () => { const f = q('.avfile').files?.[0]; if (f) resizeAvatar(f).then(d => window.kiezSetAvatar(d)).then(() => { say(q('.avmsg'), 'Profilbild gespeichert.', true); setTimeout(loaders.einstellungen, 500); }).catch(e => say(q('.avmsg'), esc(e.message))); };
  act(q('.avdel'), q('.avmsg'), async () => { await rpc('set_avatar', { image: null }); await refreshProfile(); setTimeout(loaders.einstellungen, 300); return 'Entfernt.'; });
  act(q('.nsave'), q('.nmsg'), async () => { const r = await rpc('change_username', { new_name: q('.nname').value }); window.kiezRenderProfile?.(r); return 'Du heißt jetzt ' + esc(r.username) + '.'; });
  act(q('.psave'), q('.pmsg2'), async () => {
    const a = q('.pw1').value, b = q('.pw2').value;
    if (a.length < 6) throw new Error('Mindestens 6 Zeichen'); if (a !== b) throw new Error('Die Passwörter stimmen nicht überein');
    const { error } = await sb.auth.updateUser({ password: a }); if (error) throw new Error(error.message);
    q('.pw1').value = q('.pw2').value = ''; return 'Passwort geändert.';
  });
  q('.lout').onclick = () => document.getElementById('logout')?.click();
  const [ua, ad] = await Promise.all([sb.from('user_achievements').select('achievement_id').eq('user_id', p.id), sb.from('achievement_defs').select('id,name').order('sort_order')]);
  const got = new Set((ua.data || []).map(x => x.achievement_id));
  q('.tsel').innerHTML += (ad.data || []).filter(a => got.has(a.id)).map(a => '<option value="' + esc(a.id) + '"' + (a.name === p.title ? ' selected' : '') + '>' + esc(a.name) + '</option>').join('');
  act(q('.tsave'), q('.tmsg'), async () => { const r = await rpc('set_title', { achievement: q('.tsel').value || null }); window.kiezRenderProfile?.(r.profile); return r.title ? 'Dein Titel: „' + esc(r.title) + '“' : 'Titel entfernt.'; });
};
function resizeAvatar(file) {
  return new Promise((ok, fail) => {
    if (file.size > 8 * 1024 * 1024) return fail(new Error('Das Bild darf höchstens 8 MB groß sein'));
    const img = new Image(), rd = new FileReader();
    rd.onload = () => img.src = rd.result; rd.onerror = () => fail(new Error('Bild nicht lesbar'));
    img.onload = () => { const c = document.createElement('canvas'), sc = Math.min(1, 160 / Math.max(img.width, img.height)); c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .8)); };
    img.onerror = () => fail(new Error('Bild nicht lesbar')); rd.readAsDataURL(file);
  });
}
window.kiezSetAvatar = async data => { await rpc('set_avatar', { image: data }); const p = await refreshProfile(); applyAvatar(p); };
function applyAvatar(p) {
  const av = document.querySelector('.player-slip .profile-avatar'); if (!av || !p) return;
  if (p.avatar) { av.style.backgroundImage = 'url("' + p.avatar + '")'; av.classList.add('has-image'); }
}

// ================= Freunde werben (Werbelink) =================
let refChecked = 0;
async function updateReferral(p) {
  const row = [...document.querySelectorAll('#overview .profile-wide-row')].find(r => r.textContent.includes('Freunde in den Kiez einladen') || r.classList.contains('kf-ref'));
  if (!row || !p) return;
  if (!row.classList.contains('kf-ref')) {
    row.classList.add('kf-ref');
    row.innerHTML = '<h3>📣 Freunde in den Kiez einladen</h3><p>Wer sich über deinen Link anmeldet und Level 5 erreicht, bringt dir <b>25 Kronkorken + 100 Punkte</b> (und ihm selbst 10 Kronkorken).</p><div class="kf-row"><input class="rlink" readonly style="flex:1;min-width:180px"><button class="ghost rcopy">Kopieren</button></div><p class="kf-muted rcount"></p>';
    row.querySelector('.rcopy').onclick = () => { const i = row.querySelector('.rlink'); i.select(); navigator.clipboard?.writeText(i.value); row.querySelector('.rcount').textContent = 'Link kopiert.'; };
  }
  row.querySelector('.rlink').value = location.origin + '/?ref=' + encodeURIComponent(p.username);
  if (Date.now() - refChecked < 60000) return; refChecked = Date.now();
  const { count } = await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', p.id);
  row.querySelector('.rcount').textContent = 'Bisher geworben: ' + (count || 0);
}

// ================= Supermarkt: Essen (im Getränke-Fenster) =================
const FOOD = [['broetchen', '🥖 Altes Brötchen', 0.5, '−0,2 ‰ · +5 Energie'], ['currywurst', '🌭 Currywurst', 2, '−0,5 ‰ · +15 Energie'], ['doener', '🥙 Döner mit allem', 4, '−1,0 ‰ · +25 Energie'], ['eintopf', '🍲 Eintopf', 7.5, '−2,0 ‰ · +40 Energie']];
function addFood() { document.querySelectorAll('#kiezmodalbody, .supermarket-inline-body').forEach(addFoodTo); }
function addFoodTo(body) {
  const list = body?.querySelector('.drink-list'); if (!list || body.querySelector('.kf-food')) return;
  const w = document.createElement('div'); w.className = 'kf-food';
  w.innerHTML = '<h3 style="margin:12px 0 6px">🍽 Essen</h3><p class="kf-muted">Macht nüchtern und gibt Energie.</p><div class="drink-list">' + FOOD.map(f => '<div class="drink"><b>' + f[1] + '</b><p>' + f[3] + '</p><button class="big kf-eat" data-id="' + f[0] + '">Kaufen – ' + eur(f[2]) + '</button></div>').join('') + '</div><div class="kf-foodmsg"></div>';
  (body.querySelector('#drinkmsg') || list).after(w);
  w.querySelectorAll('.kf-eat').forEach(b => act(b, w.querySelector('.kf-foodmsg'), async () => { const r = await rpc('buy_food', { food: b.dataset.id }); window.kiezRenderProfile?.(r.profile); return esc(r.label) + ' gegessen: +' + r.energy + ' Energie, Promille jetzt ' + Number(r.profile.alcohol_level).toFixed(2).replace('.', ',') + ' ‰.'; }));
}
// Supermarkt gibt es als Fenster und im Laden (Reiter „Verbrauchbares“) – beide bekommen das Essen
const foodWatch = new MutationObserver(addFood);
function watchFood() { document.querySelectorAll('#kiezmodalbody, .supermarket-inline-body').forEach(b => { if (!b.dataset.kfFood) { b.dataset.kfFood = '1'; foodWatch.observe(b, { childList: true }); addFoodTo(b); } }); }
watchFood(); setInterval(watchFood, 2000);

// ================= Tiertraining: Liste aktualisieren, sobald ein Training fertig ist =================
setInterval(() => {
  const list = document.getElementById('mypets');
  if (!list?.offsetParent || !window.kiezProfile) return;
  const due = [...list.querySelectorAll('small')].some(sm => { const m = /bis (\d{1,2}):(\d{2})/.exec(sm.textContent); if (!m) return false; const d = new Date(); d.setHours(+m[1], +m[2], 59, 0); return d <= new Date(); });
  if (due) window.kiezLoadPets?.();
}, 15000);

// ================= Gerüchteküche: echte Kiez-News =================
loaders.rumors = async () => {
  const box = document.querySelector('#rumors .inside'); if (!box) return;
  try {
    const items = await rpc('kiez_news');
    box.innerHTML = items.map(i => '<p>' + i.icon + ' ' + esc(i.text) + '</p>').join('') + '<p>🗞️ Der Pfandpreis wechselt alle 20 Minuten zwischen <b>0,10 €</b> und <b>0,30 €</b>.</p>';
  } catch (e) { }
};
// Nach jedem Neuladen einer Seite die letzte Meldung wieder anzeigen
Object.keys(loaders).forEach(k => {
  const f = loaders[k];
  loaders[k] = async (...x) => {
    const body = document.querySelector('#' + k + ' .kf-body');
    try {
      await f(...x);
      // Noch kein Profil geladen (z. B. direkt nach dem Login): gleich nochmal versuchen statt „Lade …“ stehen zu lassen
      if (body && window.kiezProfile && body.querySelector(':scope > .kz-skeleton')) setTimeout(() => loaders[k](), 1500);
    } catch (e) {
      if (body) { body.innerHTML = '<div class="notice bad">Konnte nicht geladen werden: ' + esc(e.message) + '</div><button class="ghost kf-retry">Nochmal versuchen</button>'; body.querySelector('.kf-retry').onclick = () => loaders[k](); }
    }
    restoreFlash();
  };
});
{ const g = window.kiezLoadGang; window.kiezLoadGang = async (...x) => { await g(...x); restoreFlash(); }; }
// ================= Runde 6: Stadtteile, Basar, Zockerbude, Schließfach, Kiez-Geschichte, Kiez-Chat, Kampfprotokoll =================
const num = v => Number(String(v ?? '').replace(',', '.'));
const bar = (v, max) => '<div class="kf-bar"><span style="width:' + Math.max(0, Math.min(100, Math.round(100 * v / (max || 1)))) + '%"></span></div>';

// ---------- Stadtteile ----------
const distBody = addPanel('stadtteile', 'Stadtteile', '🏴 Stadtteile');
let distSeq = 0;
loaders.stadtteile = async () => {
  const t = ++distSeq;
  const o = await rpc('district_overview'); if (t !== distSeq) return;
  const p = window.kiezProfile || {};
  // Vorerst gesperrt (121/122): zeigen, was kommt, und ab wann – keine Revierwahl
  if (o.enabled === false) {
    const pct = o.needed ? Math.min(100, Math.round(o.active_players / o.needed * 100)) : 0;
    distBody.innerHTML = '<div class="kf-box kz-soon"><h3>Stadtteile – bald verfügbar</h3>'
      + '<p>Hier kämpfen Banden bald um die Viertel der Stadt: Jede Flasche und jeder gewonnene Kampf bringt deiner Bande Einfluss, '
      + 'die stärkste Bande besitzt das Viertel eine Woche lang und kassiert 250 € für die Bandenkasse.</p>'
      + '<p>Die Stadtteile öffnen, sobald <b>' + (o.needed || '?') + ' aktive Spieler</b> im Kiez sind. Gerade sind es <b>' + o.active_players + '</b>.</p>'
      + '<div class="progress"><span style="width:' + pct + '%"></span></div>'
      + (o.is_admin ? '<div class="kf-row"><button class="ghost kz-feat-on">Jetzt freischalten (Kiezaufsicht)</button></div>' : '')
      + '<div class="dmsg"></div></div>'
      + '<div class="kf-grid">' + o.districts.map(d => '<div class="card kf-district kz-locked"><b>' + esc(d.name) + '</b><p>' + esc(d.description) + '</p><p class="kf-muted">Bald verfügbar</p></div>').join('') + '</div>';
    const on = distBody.querySelector('.kz-feat-on');
    if (on) act(on, distBody.querySelector('.dmsg'), async () => { await rpc('admin_set_feature', { k: 'districts', on_off: true }); setTimeout(loaders.stadtteile, 300); return 'Stadtteile sind freigeschaltet.'; });
    restoreFlash();
    return;
  }
  distBody.innerHTML = '<div class="kf-box"><h3>Dein Revier</h3><p>'
    + (o.my_district ? 'Du bist im <b>' + esc((o.districts.find(d => d.id === o.my_district) || {}).name) + '</b> unterwegs.' : 'Du hast noch kein Revier gewählt.')
    + (o.my_gang ? '' : ' <span class="kf-muted">Ohne Bande sammelst du keinen Einfluss – <a href="#" class="kf-go" data-v="gangs">zur Bande</a>.</span>')
    + '</p><p class="kf-muted">Jede Pfandflasche, die du sammelst, bringt deiner Bande 1 Einflusspunkt in deinem Revier, jeder gewonnene Kampf 20. '
    + 'Die Bande mit dem meisten Einfluss besitzt das Viertel die ganze nächste Woche und bekommt 250 € in die Bandenkasse. '
    + 'Wertung endet am ' + new Date(o.week_ends).toLocaleDateString('de-DE') + '. Revier wechseln: einmal am Tag.</p></div>'
    + '<div class="kf-grid">' + o.districts.map(d => '<div class="card kf-district' + (d.id === o.my_district ? ' kf-mine' : '') + '"><b>' + esc(d.name) + '</b>'
      + '<p>' + esc(d.description) + '</p>'
      + '<p>Besitzer: ' + (d.owner ? '<b>🏴 ' + esc(d.owner) + '</b>' : '<span class="kf-muted">niemand</span>') + ' · ' + d.players + ' Spieler</p>'
      + '<p class="kf-muted">Diese Woche: ' + (d.top.length ? d.top.map((g, i) => (i + 1) + '. ' + esc(g.gang) + ' (' + g.points + ')').join(' · ') : 'noch kein Einfluss') + '</p>'
      + (o.my_gang ? '<p>Deine Bande: <b>' + d.mine + '</b> Punkte</p>' : '')
      + (d.id === o.my_district ? '<p><b>✔ Dein Revier</b></p>' : '<button class="big dpick" data-id="' + d.id + '">Hier Revier wählen</button>') + '</div>').join('')
    + '</div><div class="dmsg"></div>'
    + (o.is_admin ? '<div class="kf-row"><button class="ghost kz-feat-off">Stadtteile wieder sperren (Kiezaufsicht)</button></div>' : '');
  const box = distBody.querySelector('.dmsg');
  const off = distBody.querySelector('.kz-feat-off');
  if (off) act(off, box, async () => { await rpc('admin_set_feature', { k: 'districts', on_off: false }); setTimeout(loaders.stadtteile, 300); return 'Stadtteile sind wieder gesperrt.'; });
  distBody.querySelectorAll('.dpick').forEach(b => act(b, box, async () => { const r = await rpc('choose_district', { wanted: b.dataset.id }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.stadtteile, 300); return 'Dein Revier ist jetzt ' + esc(r.district) + '.'; }));
  distBody.querySelectorAll('.kf-go').forEach(a => a.onclick = e => { e.preventDefault(); show(a.dataset.v); });
  restoreFlash();
  if (!p.id) return;
};

// ---------- Plunder-Basar ----------
const basarBody = addPanel('basar', 'Plunder-Basar', '🛍 Basar');
let basarSeq = 0;
loaders.basar = async () => {
  const t = ++basarSeq;
  const me = await myId(); if (!me) return;
  const [ls, cat, mine] = await Promise.all([
    sb.from('market_listings').select('*').order('created_at', { ascending: false }).limit(150),
    sb.from('plunder_catalog').select('id,name,rarity,sell_price').order('sort_order'),
    sb.from('user_plunder').select('plunder_id,quantity').eq('user_id', me)]);
  if (t !== basarSeq) return;
  const C = Object.fromEntries((cat.data || []).map(c => [c.id, c]));
  const nm = await names((ls.data || []).map(l => l.seller_id)); if (t !== basarSeq) return;
  const own = (ls.data || []).filter(l => l.seller_id === me), other = (ls.data || []).filter(l => l.seller_id !== me);
  const eq = window.kiezProfile?.equipped_plunder;
  basarBody.innerHTML = '<p>Hier handeln Spieler untereinander mit Plunder. Du bekommst den Kaufpreis minus 5 % Marktgebühr. '
    + 'Was nicht mehr in deinen Geldbehälter passt, landet sicher im Schließfach.</p>'
    + '<div class="kf-box"><h3>Plunder anbieten</h3>' + ((mine.data || []).length ? '<div class="kf-row"><select class="msel" style="flex:2">'
      + (mine.data || []).map(x => '<option value="' + esc(x.plunder_id) + '">' + esc(C[x.plunder_id]?.name || x.plunder_id) + ' (' + x.quantity + '×' + (eq === x.plunder_id ? ', angelegt' : '') + ')</option>').join('')
      + '</select><input class="mqty" type="number" min="1" value="1" style="width:70px" aria-label="Menge"><input class="mprice" type="number" min="0.1" step="0.1" placeholder="Preis/Stück €" style="width:120px" aria-label="Preis pro Stück"><button class="big mlist">Einstellen</button></div>'
      + '<p class="kf-muted mhint"></p>' : '<p class="kf-muted">Du hast noch keinen Plunder. Den findest du auf Pfandtouren.</p>') + '<div class="mmsg"></div></div>'
    + (own.length ? '<div class="kf-box"><h3>Deine Angebote (' + own.length + '/10)</h3><ul class="kf-list">' + own.map(l => '<li>' + l.qty + '× <b>' + esc(C[l.plunder_id]?.name) + '</b> für ' + eur(l.price) + ' pro Stück <button class="ghost mcancel" data-id="' + l.id + '">Zurückziehen</button></li>').join('') + '</ul></div>' : '')
    + '<h3 class="shop-category">Angebote im Kiez</h3>'
    + (other.length ? '<div class="kf-grid">' + other.map(l => { const c = C[l.plunder_id] || {};
      return '<div class="card"><b class="kf-rar-' + c.rarity + '">' + esc(c.name) + '</b><p class="kf-muted">' + (RARITY[c.rarity] || '') + ' · von ' + playerLink(l.seller_id, nm[l.seller_id]) + '</p>'
        + '<p>' + l.qty + '× für je <b>' + eur(l.price) + '</b> <span class="kf-muted">(Händler zahlt ' + eur(c.sell_price) + ')</span></p>'
        + '<div class="kf-row"><button class="big mbuy" data-id="' + l.id + '" data-q="1">1 kaufen – ' + eur(l.price) + '</button>'
        + (l.qty > 1 ? '<button class="ghost mbuy" data-id="' + l.id + '" data-q="' + l.qty + '">Alle ' + l.qty + ' – ' + eur(l.qty * l.price) + '</button>' : '') + '</div></div>'; }).join('') + '</div>'
      : '<p class="kf-muted">Gerade bietet niemand etwas an.</p>') + '<div class="mmsg2"></div>';
  const q = x => basarBody.querySelector(x), box = q('.mmsg'), box2 = q('.mmsg2');
  const hint = () => { const c = C[q('.msel')?.value]; if (c && q('.mhint')) q('.mhint').textContent = 'Der Händler zahlt ' + eur(c.sell_price) + ' pro Stück – im Basar kannst du mehr verlangen.'; };
  if (q('.msel')) { q('.msel').onchange = hint; hint(); }
  if (q('.mlist')) act(q('.mlist'), box, async () => { await rpc('market_list', { wanted: q('.msel').value, qty: parseInt(q('.mqty').value, 10), price: num(q('.mprice').value) }); setTimeout(loaders.basar, 300); return 'Im Basar eingestellt.'; });
  basarBody.querySelectorAll('.mcancel').forEach(b => act(b, box, async () => { const r = await rpc('market_cancel', { listing: +b.dataset.id }); setTimeout(loaders.basar, 300); return r.returned + '× zurück in deiner Plunderkiste.'; }));
  basarBody.querySelectorAll('.mbuy').forEach(b => act(b, box2, async () => { const r = await rpc('market_buy', { listing: +b.dataset.id, qty: +b.dataset.q }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.basar, 300); return 'Gekauft: ' + r.bought + '× ' + esc(r.name) + ' für ' + eur(r.cost) + '.'; }));
  restoreFlash();
};

// ---------- Zockerbude ----------
const zockBody = addPanel('zockerbude', 'Zockerbude', '🎲 Zockerbude');
let zockSeq = 0;
loaders.zockerbude = async () => {
  const t = ++zockSeq;
  const p = await refreshProfile(); const me = p?.id; if (!me || t !== zockSeq) return;
  const [open, done] = await Promise.all([
    sb.from('dice_challenges').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(40),
    sb.from('dice_challenges').select('*').eq('status', 'done').or('challenger_id.eq.' + me + ',opponent_id.eq.' + me).order('resolved_at', { ascending: false }).limit(8)]);
  const nm = await names([...(open.data || []), ...(done.data || [])].flatMap(c => [c.challenger_id, c.opponent_id])); if (t !== zockSeq) return;
  const maxShell = Math.min(25, 1 + p.level), maxDice = Math.min(100, 5 * p.level);
  zockBody.innerHTML = '<p>Hinterzimmer hinter dem Kiosk. Hier wird gezockt – mit echtem Bargeld. Gewinne, die nicht mehr in deinen Geldbehälter passen, gehen ins Schließfach.</p>'
    + '<div class="kf-grid"><div class="card"><b>Hütchenspiel</b><p>Unter einem der drei Becher liegt die Kugel. Richtig getippt: <b>2,7-facher Einsatz</b>. Einsatz 0,10 € bis ' + eur(maxShell) + ' (steigt mit dem Level), höchstens 30 Runden am Tag.</p>'
    + '<div class="kf-row"><input class="sstake" type="number" min="0.1" step="0.1" value="1" style="width:90px" aria-label="Einsatz in Euro"> €</div>'
    + '<div class="kf-cups">' + [1, 2, 3].map(i => '<button class="kf-cup" data-i="' + i + '" aria-label="Becher ' + i + '"><i class="kf-cupimg"></i><i class="kf-ballimg"></i>Becher ' + i + '</button>').join('') + '</div><div class="smsg"></div></div>'
    + '<div class="card"><b>Würfelduell</b><p>Setz einen Betrag, ein anderer Spieler hält dagegen. Beide würfeln mit zwei Würfeln, die höhere Zahl gewinnt den Topf (minus 5 % für den Wirt). Einsatz 1 € bis ' + eur(maxDice) + '.</p>'
    + '<div class="kf-row"><input class="dstake" type="number" min="1" step="1" value="5" style="width:90px" aria-label="Einsatz in Euro"> € <button class="big dnew">Duell anbieten</button></div><div class="dmsg2"></div></div></div>'
    + '<h3 class="shop-category">Offene Würfelduelle</h3>'
    + ((open.data || []).length ? '<ul class="kf-list">' + open.data.map(c => '<li>' + playerLink(c.challenger_id, nm[c.challenger_id]) + ' setzt <b>' + eur(c.stake) + '</b> '
      + (c.challenger_id === me ? '<button class="ghost dcancel" data-id="' + c.id + '">Zurückziehen</button>' : '<button class="big dacc" data-id="' + c.id + '">Dagegenhalten</button>') + '</li>').join('') + '</ul>'
      : '<p class="kf-muted">Gerade will niemand würfeln. Biete selbst ein Duell an!</p>') + '<div class="dmsg3"></div>'
    + ((done.data || []).length ? '<h3 class="shop-category">Deine letzten Duelle</h3><ul class="kf-list">' + done.data.map(c => { const iAmC = c.challenger_id === me, other = iAmC ? c.opponent_id : c.challenger_id;
      return '<li>' + (c.winner_id === me ? '✅ Gewonnen' : '❌ Verloren') + ' gegen ' + playerLink(other, nm[other]) + ' · ' + (iAmC ? c.challenger_roll + ' : ' + c.opponent_roll : c.opponent_roll + ' : ' + c.challenger_roll) + ' · Einsatz ' + eur(c.stake) + ' <span class="kf-muted">' + when(c.resolved_at) + '</span></li>'; }).join('') + '</ul>' : '');
  const q = x => zockBody.querySelector(x);
  zockBody.querySelectorAll('.kf-cup').forEach(b => act(b, q('.smsg'), async () => {
    const r = await rpc('shell_game', { stake: num(q('.sstake').value), pick: +b.dataset.i }); window.kiezRenderProfile?.(r.profile);
    zockBody.querySelectorAll('.kf-cup').forEach(c => c.classList.toggle('kf-ball', +c.dataset.i === r.ball));
    return r.win ? 'Treffer! Die Kugel lag unter Becher ' + r.ball + '. Du bekommst ' + eur(r.payout) + '.' : 'Daneben – die Kugel lag unter Becher ' + r.ball + '. Einsatz weg.';
  }));
  act(q('.dnew'), q('.dmsg2'), async () => { const r = await rpc('dice_challenge', { stake: num(q('.dstake').value) }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.zockerbude, 300); return 'Duell angeboten. Dein Einsatz liegt beim Wirt, bis jemand dagegenhält.'; });
  zockBody.querySelectorAll('.dacc').forEach(b => act(b, q('.dmsg3'), async () => { const r = await rpc('dice_accept', { challenge: +b.dataset.id }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.zockerbude, 300);
    return '🎲 Du würfelst ' + r.my_roll + ', dein Gegner ' + r.their_roll + ' – ' + (r.win ? 'gewonnen! +' + eur(r.pot) : 'verloren.'); }));
  zockBody.querySelectorAll('.dcancel').forEach(b => act(b, q('.dmsg3'), async () => { const r = await rpc('dice_cancel', { challenge: +b.dataset.id }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.zockerbude, 300); return 'Zurückgezogen, ' + eur(r.refund) + ' zurück.'; }));
  restoreFlash();
};

// ---------- Schließfach ----------
const bankBody = addPanel('schliessfach', 'Schließfach', '🔐 Schließfach');
loaders.schliessfach = async () => {
  const p = await refreshProfile(); if (!p) return;
  const lim = 100 + p.level * 50, free = Math.max(0, p.cash_capacity - p.money);
  bankBody.innerHTML = '<p>Im Schließfach am Bahnhof ist dein Geld sicher: Bei einer Prügelei kann dir nur das Bargeld in der Tasche geklaut werden. '
    + 'Einzahlen kostet 2 % Gebühr, Abheben ist kostenlos – aber nur so viel, wie in deinen Geldbehälter passt.</p>'
    + '<div class="kf-grid"><div class="card"><b>Dein Schließfach</b><p class="kf-big">' + eur(p.bank_balance) + '</p><p class="kf-muted">Platz bis ' + eur(lim) + ' (wächst mit dem Level)</p>' + bar(p.bank_balance, lim) + '</div>'
    + '<div class="card"><b>Bargeld in der Tasche</b><p class="kf-big">' + eur(p.money) + '</p><p class="kf-muted">Geldbehälter: ' + eur(p.cash_capacity) + ' · frei ' + eur(free) + '</p>' + bar(p.money, p.cash_capacity) + '</div></div>'
    + '<div class="kf-grid"><div class="kf-box"><h3>Einzahlen</h3><div class="kf-row"><input class="bin" type="number" min="1" step="1" value="' + Math.floor(p.money) + '" style="width:110px" aria-label="Betrag einzahlen"> € <button class="big bdep">Einzahlen</button></div></div>'
    + '<div class="kf-box"><h3>Abheben</h3><div class="kf-row"><input class="bout" type="number" min="0.01" step="0.01" value="' + Math.min(Number(p.bank_balance), free).toFixed(2) + '" style="width:110px" aria-label="Betrag abheben"> € <button class="big bwd">Abheben</button></div></div></div><div class="bmsg"></div>';
  const q = x => bankBody.querySelector(x), box = q('.bmsg');
  act(q('.bdep'), box, async () => { const r = await rpc('bank_deposit', { amount: num(q('.bin').value) }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.schliessfach, 300); return eur(r.stored) + ' liegen jetzt im Schließfach (Gebühr ' + eur(r.fee) + ').'; });
  act(q('.bwd'), box, async () => { const r = await rpc('bank_withdraw', { amount: num(q('.bout').value) }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.schliessfach, 300); return 'Abgehoben.'; });
  restoreFlash();
};

// ---------- Kiez-Geschichte ----------
const questBody = addPanel('geschichte', 'Kiez-Geschichte', '📜 Kiez-Geschichte');
loaders.geschichte = async () => {
  const [s, defs] = await Promise.all([rpc('quest_status'), sb.from('quest_defs').select('step,title').order('step')]);
  const done = (defs.data || []).filter(d => d.step < s.step);
  if (s.finished) {
    questBody.innerHTML = '<div class="kf-box"><h3>Geschichte durchgespielt</h3><p>Du hast alle ' + s.total + ' Kapitel geschafft. Der Kiez erzählt sich deine Geschichte.</p></div>';
  } else {
    const q = s.quest;
    questBody.innerHTML = '<div class="card kf-quest"><b>Kapitel ' + q.step + ': ' + esc(q.title) + '</b><p class="kf-muted">Kapitel ' + q.step + ' von ' + s.total + '</p>'
      + '<p><i>' + esc(q.story) + '</i></p><p><b>Aufgabe:</b> ' + esc(q.task) + '</p>'
      + '<p>Fortschritt: ' + Math.min(s.value, q.goal).toLocaleString('de-DE') + ' / ' + Number(q.goal).toLocaleString('de-DE') + '</p>' + bar(s.value, q.goal)
      + '<p>Belohnung: ' + eur(q.reward_money) + ' · ' + q.reward_xp + ' Punkte' + (q.reward_caps ? ' · ' + q.reward_caps + ' 🧢' : '') + '</p>'
      + (s.done ? '<button class="big qclaim">Belohnung abholen</button>' : '<button class="big" disabled>Noch nicht geschafft</button>') + '<div class="qmsg"></div></div>';
    const b = questBody.querySelector('.qclaim');
    if (b) act(b, questBody.querySelector('.qmsg'), async () => { const r = await rpc('claim_quest'); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.geschichte, 400); return 'Kapitel „' + esc(r.title) + '“ geschafft: +' + eur(r.money) + ', +' + r.xp + ' Punkte' + (r.caps ? ', +' + r.caps + ' 🧢' : '') + '.'; });
  }
  if (done.length) questBody.insertAdjacentHTML('beforeend', '<div class="kf-box"><h3>Geschaffte Kapitel</h3><ul class="kf-list">' + done.map(d => '<li>✅ ' + d.step + '. ' + esc(d.title) + '</li>').join('') + '</ul></div>');
  restoreFlash();
};

// ---------- Kiez-Chat ----------
const chatBody = addPanel('chat', 'Kiez-Chat', '💬 Kiez-Chat');
let chatTimer = null;
loaders.chat = async () => {
  const me = await myId(); if (!me) return;
  if (!chatBody.querySelector('.cin')) {
    chatBody.innerHTML = '<p>Der Treffpunkt für alle im Kiez. Freundlich bleiben – Beleidigungen werden gelöscht.</p>'
      + '<div class="kf-box"><h3>Nachricht an alle</h3><div class="kf-row"><input class="cin" maxlength="300" placeholder="Nachricht an alle …" style="flex:1" aria-label="Nachricht"><button class="big csend">Senden</button></div><div class="cmsg"></div></div>'
      + '<div class="kf-box"><h3>Im Chat</h3><ul class="kf-list kf-chat"></ul></div>';
    const q = x => chatBody.querySelector(x);
    act(q('.csend'), q('.cmsg'), async () => { await rpc('post_chat', { message_body: q('.cin').value }); q('.cin').value = ''; await drawChat(); return 'Gesendet.'; });
    q('.cin').onkeydown = e => { if (e.key === 'Enter') q('.csend').click(); };
  }
  await drawChat();
  clearInterval(chatTimer);
  chatTimer = setInterval(() => { if (document.getElementById('chat')?.classList.contains('active-view') && !document.hidden) drawChat(); else clearInterval(chatTimer); }, 8000);
};
async function drawChat() {
  const me = await myId();
  const { data } = await sb.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(60);
  const nm = await names((data || []).map(m => m.user_id)), admin = !!window.kiezProfile?.is_admin;
  const list = chatBody.querySelector('.kf-chat'); if (!list) return;
  list.innerHTML = (data || []).map(m => '<li><b>' + playerLink(m.user_id, nm[m.user_id]) + ':</b> ' + esc(m.body) + ' <span class="kf-muted">' + when(m.created_at) + '</span>'
    + (m.user_id === me || admin ? ' <button class="ghost cdel" data-id="' + m.id + '" aria-label="Löschen">✕</button>' : '') + '</li>').join('') || '<li class="kf-muted">Noch still hier. Sag Hallo!</li>';
  list.querySelectorAll('.cdel').forEach(b => b.onclick = async () => { try { await rpc('delete_chat', { message_id: +b.dataset.id }); say(chatBody.querySelector('.cmsg'), 'Nachricht gelöscht.', true); drawChat(); } catch (e) { say(chatBody.querySelector('.cmsg'), esc(e.message)); } });
}

// ---------- Kampfprotokoll ----------
const fightBody = addPanel('kampfprotokoll', 'Kampfprotokoll', '📋 Kampfprotokoll');
loaders.kampfprotokoll = async () => {
  const r = await rpc('fight_history'), s = r.stats || {};
  const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : '–';
  fightBody.innerHTML = '<div class="kf-grid">'
    + '<div class="card"><b>Angriffe</b><p class="kf-big">' + s.attack_wins + ' / ' + s.attacks + '</p><p class="kf-muted">gewonnen · Quote ' + pct(s.attack_wins, s.attacks) + '</p></div>'
    + '<div class="card"><b>Verteidigungen</b><p class="kf-big">' + s.defense_wins + ' / ' + s.defenses + '</p><p class="kf-muted">abgewehrt · Quote ' + pct(s.defense_wins, s.defenses) + '</p></div>'
    + '<div class="card"><b>Beute</b><p class="kf-big">+' + eur(s.loot_won) + '</p><p class="kf-muted">verloren: ' + eur(s.loot_lost) + '</p></div></div>'
    + '<div class="kf-box"><h3>Letzte Kämpfe</h3>' + (r.fights.length ? '<table class="kf-table"><tr><th>Wann</th><th>Gegner</th><th>Art</th><th>Stärke</th><th>Ausgang</th><th>Beute</th></tr>'
      + r.fights.map(f => '<tr><td>' + when(f.created_at) + '</td><td>' + playerLink(f.opponent_id, f.opponent) + '</td><td>' + (f.i_attacked ? 'Angriff' : 'Verteidigung') + '</td><td>'
        + (f.i_attacked ? f.attacker_power + ' : ' + f.defender_power : f.defender_power + ' : ' + f.attacker_power) + '</td><td>' + (f.won ? '✅ Sieg' : '❌ Niederlage') + '</td><td>' + (f.won ? '+' : '−') + eur(f.loot) + '</td></tr>').join('') + '</table>'
      : '<p class="kf-muted">Noch keine Kämpfe. <a href="#" class="kf-go" data-v="pvp">Gegner suchen</a></p>') + '</div>';
  fightBody.querySelectorAll('.kf-go').forEach(a => a.onclick = e => { e.preventDefault(); show(a.dataset.v); });
};

// ---------- Seite öffnen, optional mit Reiter ----------
function go(view, tab) {
  window.kiezCloseNav?.();
  // Menüklick auf die schon offene Seite: trotzdem nach oben (automatisches Neuladen scrollt nicht mehr)
  if (document.getElementById(view)?.classList.contains('active-view')) window.scrollTo({ top: 0, behavior: 'smooth' });
  show(view);
  if (!tab) return;
  let n = 0;
  const pick = () => {
    const s = [...document.querySelectorAll('#' + view + ' .section-tools span, #' + view + ' .section-tools button')].find(x => x.textContent.trim() === tab);
    if (s) s.click(); else if (++n < 10) setTimeout(pick, 150);
  };
  setTimeout(pick, 120);
}
window.kiezGoTab = go;

// ---------- Hauptmenü nach Pennergame-Aufbau: 7 Bereiche, Unterpunkte klappen auf ----------
const NAV = [
  ['Mein Kiez', 'szene-uebersicht', [['Übersicht', 'overview'], ['Mein Profil', 'profil'], ['Plunderkiste & Inventar', 'plunder'], ['Kronkorken', 'kronkorken'],
    ['Begleiter', 'pets'], ['Unterkunft', 'gear'], ['Karriere', 'career'], ['Erfolge', 'achievements'], ['Einstellungen', 'einstellungen']]],
  ['Aktionen', 'szene-pfand', [['Pfand sammeln', 'pfand'], ['Verbrechen', 'pfand', 'Verbrechen begehen'], ['Schnorren', 'begging'], ['Weiterbildung', 'training'],
    ['Kiez-Geschichte', 'geschichte'], ['Tagesauftrag', 'missions']]],
  ['Stadt', 'szene-stadt', [['Stadtplan', 'citymap'], ['Stadtteile', 'stadtteile'], ['Kiezladen', 'store'], ['Apotheke', 'apotheke'], ['Schnorrplätze & Musik', 'income'],
    ['Plunder-Basar', 'basar'], ['Zockerbude', 'zockerbude'], ['Glücksspiel & Lotto', 'missions', 'Glücksspiel'], ['Schließfach', 'schliessfach']]],
  ['Kampf', 'szene-pruegelei', [['Gegner suchen', 'pvp'], ['Kampfprotokoll', 'kampfprotokoll'], ['Begleiter trainieren', 'pets']]],
  ['Bande', 'szene-bande', [['Meine Bande', 'gangs'], ['Stadtteile erobern', 'stadtteile'], ['Banden-Highscore', 'wettbewerb']]],
  ['Kommunikation', 'szene-post', [['Kiezpost', 'messages'], ['Kiez-Chat', 'chat'], ['Kiez-Brett', 'brett'], ['Freunde', 'freunde']]],
  ['Highscore', 'szene-rangliste', [['Rangliste', 'leaderboard'], ['Wettbewerb & Events', 'wettbewerb'], ['Erfolge', 'achievements']]]
];
function buildNav() {
  const mast = document.querySelector('.mast'); if (!mast || mast.querySelector('.kz-nav')) return;
  const nav = document.createElement('nav'); nav.className = 'kz-nav'; nav.setAttribute('aria-label', 'Hauptmenü');
  const drop = document.createElement('div'); drop.className = 'kz-drop hide'; drop.setAttribute('role', 'menu');
  let openIdx = -1, hideT = 0;
  const close = () => { drop.classList.add('hide'); openIdx = -1; nav.querySelectorAll('.kz-top').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-expanded', 'false'); }); };
  const open = (i, btn) => {
    clearTimeout(hideT);
    if (openIdx === i) return;
    const items = NAV[i][2].concat(i === 0 && window.kiezProfile?.is_admin ? [['Admin', 'admin']] : []);
    drop.innerHTML = items.map(([n, v, tb]) => '<button role="menuitem" data-v="' + v + '"' + (tb ? ' data-t="' + esc(tb) + '"' : '') + '>' + esc(n) + '</button>').join('');
    drop.querySelectorAll('button').forEach(x => x.onclick = () => { close(); go(x.dataset.v, x.dataset.t); });
    nav.querySelectorAll('.kz-top').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-expanded', 'false'); });
    btn.classList.add('on'); btn.setAttribute('aria-expanded', 'true');
    const r = btn.getBoundingClientRect();
    drop.classList.remove('hide');
    drop.style.top = (r.bottom + window.scrollY) + 'px';
    drop.style.left = Math.max(8, Math.min(r.left + window.scrollX, document.documentElement.clientWidth - drop.offsetWidth - 8)) + 'px';
    openIdx = i;
  };
  NAV.forEach(([label, pic], i) => {
    const b = document.createElement('button'); b.className = 'kz-top'; b.type = 'button'; b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = '<span class="kz-ico" style="background-image:url(\'/bilder/' + pic + '.webp\')"></span><span class="kz-lbl">' + label + '</span>';
    b.onclick = e => { e.stopPropagation(); if (openIdx === i) close(); else open(i, b); };
    b.onmouseenter = () => { if (matchMedia('(hover:hover)').matches) open(i, b); };
    b.onmouseleave = () => { hideT = setTimeout(close, 250); };
    nav.appendChild(b);
  });
  drop.onmouseenter = () => clearTimeout(hideT);
  drop.onmouseleave = () => { hideT = setTimeout(close, 250); };
  document.addEventListener('click', e => { if (!drop.contains(e.target) && !nav.contains(e.target)) close(); });
  window.addEventListener('resize', close);
  window.kiezCloseNav = close;
  const old = mast.querySelector('.classic-mainnav');
  if (old) old.after(nav); else mast.appendChild(nav);
  document.body.appendChild(drop);
}
buildNav();
setTimeout(buildNav, 1500);

// ---------- Stadtplan zum Anklicken ----------
// Karte in Viewbox-Koordinaten 1000×620; Orte liegen in den sechs Stadtteilen
const DIST_SHAPES = {
  bahnhof: '0,0 360,0 330,250 0,280', altstadt: '360,0 680,0 650,260 330,250', villen: '680,0 1000,0 1000,300 650,260',
  stadtpark: '0,280 330,250 360,620 0,620', markt: '330,250 650,260 640,620 360,620', hafen: '650,260 1000,300 1000,620 640,620'
};
const DIST_TINT = { bahnhof: 'rgba(96,90,84,.22)', altstadt: 'rgba(160,92,52,.18)', villen: 'rgba(214,190,120,.28)', stadtpark: 'rgba(110,140,80,.18)', markt: 'rgba(196,146,82,.20)', hafen: 'rgba(80,104,124,.22)' };
const DIST_LABEL = { bahnhof: [180, 24], altstadt: [540, 24], villen: [880, 24], stadtpark: [180, 286], markt: [500, 286], hafen: [880, 286] };
const PLACES = [
  ['Pfandannahme', 'pfand', '', 'szene-pfand', 90, 138], ['Schnorrplätze', 'income', 'Schnorrplätze', 'stadt-schnorrplaetze', 250, 188],
  ['Kiezladen', 'store', 'Zubehör', 'stadt-zubehoer', 400, 128], ['Waffenladen', 'store', 'Waffen', 'stadt-waffenladen', 610, 128], ['Volkshochschule', 'training', 'Fähigkeiten', 'szene-training', 505, 212],
  ['Schließfach', 'schliessfach', '', 'laden-geldversteck', 770, 132], ['Apotheke', 'apotheke', '', 'stadt-apotheke', 915, 200],
  ['Tierhandlung', 'pets', '', 'stadt-tierhandlung', 90, 370], ['Hinterhof', 'pvp', '', 'szene-pruegelei', 240, 440], ['Waschhaus', 'begging', 'Körperpflege', 'stadt-waschhaus', 110, 540],
  ['Supermarkt', 'store', 'Verbrauchbares', 'stadt-supermarkt', 420, 370], ['Plunder-Basar', 'basar', '', 'lager-inventar', 580, 370], ['Musikladen', 'income', 'Instrumente', 'stadt-musikladen', 430, 530],
  ['Zockerbude', 'zockerbude', '', 'stadt-gluecksspiel', 570, 520],
  ['Eigenheime', 'gear', '', 'stadt-eigenheime', 720, 400], ['Bandenversteck', 'gangs', '', 'szene-bande', 890, 425], ['Lottobude', 'missions', 'Glücksspiel', 'rubbellose', 735, 535]
];
async function buildCityMap() {
  const inside = document.querySelector('#citymap .inside'); if (!inside) return;
  if (!inside.querySelector('.kz-map')) {
    inside.innerHTML = '<p class="kz-maphint">Tipp auf einen Ort, um hineinzugehen. Farbige Viertel gehören gerade einer Bande – tipp auf den Namen eines Viertels für die Stadtteile.</p>'
      + '<div class="kz-mapwrap"><div class="kz-map"><svg viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><pattern id="kzhatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="rgba(155,60,31,.10)"/><line x1="0" y1="0" x2="0" y2="10" stroke="rgba(155,60,31,.35)" stroke-width="3"/></pattern>'
      + '<pattern id="kzmine" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" fill="rgba(209,169,79,.18)"/><line x1="0" y1="0" x2="0" y2="10" stroke="rgba(156,122,46,.45)" stroke-width="3"/></pattern></defs>'
      + '<rect width="1000" height="620" fill="#e6d6b1"/>'
      + Object.entries(DIST_SHAPES).map(([id, pts]) => '<polygon points="' + pts + '" fill="' + DIST_TINT[id] + '"/><polygon class="kz-dist" data-d="' + id + '" points="' + pts + '"/>').join('')
      // Park, Fluss, Bahn, Straßen
      + '<path d="M20 330 C120 300 250 310 300 360 L320 600 L20 600 Z" fill="#b9c79a" opacity=".55"/>'
      + [[70, 330], [140, 320], [200, 350], [60, 460], [180, 480], [260, 380], [270, 560], [40, 590]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="14" fill="#7f9a5a" opacity=".6"/>').join('')
      + '<path d="M640 620 C760 560 820 470 1000 380 L1000 620 Z" fill="#8fa7b0" opacity=".75"/><path d="M640 620 C760 560 820 470 1000 380" stroke="#5f7b86" stroke-width="3" fill="none"/>'
      + '<path d="M0 240 L330 205 L660 215 L1000 250" stroke="#5a4a36" stroke-width="5" fill="none" stroke-dasharray="14 8"/>'
      + ['M0 280 L330 250 L650 260 L1000 300', 'M360 0 L330 250 L360 620', 'M680 0 L650 260 L640 620', 'M330 250 L180 620', 'M650 260 L820 0', 'M0 150 L360 120', 'M650 440 L1000 470'].map(d =>
        '<path d="' + d + '" stroke="#fbf4e2" stroke-width="12" fill="none" stroke-linecap="round"/><path d="' + d + '" stroke="#a48f6b" stroke-width="2" fill="none" stroke-dasharray="6 6"/>').join('')
      + '<circle cx="500" cy="440" r="26" fill="#fbf4e2" stroke="#a48f6b" stroke-width="2"/>'
      + '<g class="kz-compass" transform="translate(955 575)"><circle r="26" fill="#fbf4e2" stroke="#6b5838" stroke-width="2"/><path d="M0 -20 L6 0 L0 20 L-6 0 Z" fill="#9b3c1f"/><text y="-28" text-anchor="middle" font-size="14" fill="#2a1f15">N</text></g>'
      + '</svg>'
      + Object.entries(DIST_LABEL).map(([id, [x, y]]) => '<button class="kz-dlabel" data-d="' + id + '" style="left:' + (x / 10) + '%;top:' + (y / 6.2) + '%"><b></b><small></small></button>').join('')
      + PLACES.map(([n, v, tb, pic, x, y]) => '<button class="kz-place" data-v="' + v + '"' + (tb ? ' data-t="' + tb + '"' : '') + ' style="left:' + (x / 10) + '%;top:' + (y / 6.2) + '%"><span style="background-image:url(\'/bilder/' + pic + '.webp\')"></span><em>' + n + '</em></button>').join('')
      + '</div></div>'
      + '<div class="kz-placelist"><b>Alle Orte:</b> ' + PLACES.map(([n, v, tb]) => '<button class="ghost kz-place2" data-v="' + v + '"' + (tb ? ' data-t="' + tb + '"' : '') + '>' + n + '</button>').join('') + '</div>';
    inside.querySelectorAll('.kz-place, .kz-place2').forEach(b => b.onclick = () => go(b.dataset.v, b.dataset.t));
    inside.querySelectorAll('.kz-dlabel').forEach(b => b.onclick = () => show('stadtteile'));
  }
  try {
    const o = await rpc('district_overview');
    o.districts.forEach(d => {
      const poly = inside.querySelector('.kz-dist[data-d="' + d.id + '"]'), lab = inside.querySelector('.kz-dlabel[data-d="' + d.id + '"]');
      if (poly) poly.setAttribute('class', 'kz-dist' + (d.owner_id ? (d.owner_id === o.my_gang ? ' kz-own-mine' : ' kz-own') : '') + (d.id === o.my_district ? ' kz-here' : ''));
      if (lab) { lab.querySelector('b').textContent = d.name; lab.querySelector('small').textContent = o.enabled === false ? 'bald' : d.owner ? d.owner : 'frei'; }
    });
  } catch (e) { /* Karte bleibt auch ohne Stadtteil-Daten benutzbar */ }
}
loaders.citymap = buildCityMap;
buildCityMap();

// ---------- Aussehen ----------
const style6 = document.createElement('style');
style6.textContent = `
html body:not(#kz1):not(#kz2) .classic-mainnav, html body:not(#kz1):not(#kz2) .classic-menu { display: none !important; }
html body:not(#kz1):not(#kz2) .kz-nav { display: flex; align-self: end; justify-self: center; gap: 2px; grid-column: 2; grid-row: 1; flex-wrap: nowrap; max-width: 100%; overflow-x: auto; scrollbar-width: none; }
html body:not(#kz1):not(#kz2) .kz-nav::-webkit-scrollbar { display: none; }
html body:not(#kz1):not(#kz2) .kz-top { flex: 0 0 auto; white-space: nowrap; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 78px; padding: 6px 4px 7px; background: transparent !important; border: 0 !important; border-radius: 8px 8px 0 0 !important; color: var(--ink) !important; font: 700 12px/1.1 var(--font-head) !important; text-transform: uppercase; letter-spacing: .04em; cursor: pointer; box-shadow: none !important; min-height: 0 !important; }
html body:not(#kz1):not(#kz2) .kz-top .kz-ico { width: 50px; height: 50px; border-radius: 50%; background: #3b2e22 center/cover no-repeat; border: 3px solid var(--paper-light); box-shadow: 0 0 0 2px var(--paper-edge), 0 4px 10px rgba(0,0,0,.35); transition: transform .15s; }
html body:not(#kz1):not(#kz2) .kz-top:hover .kz-ico, html body:not(#kz1):not(#kz2) .kz-top.on .kz-ico { transform: translateY(-2px) scale(1.06); box-shadow: 0 0 0 2px var(--rust), 0 6px 14px rgba(0,0,0,.4); }
html body:not(#kz1):not(#kz2) .kz-top.on { background: rgba(42,31,21,.12) !important; }
html body:not(#kz1):not(#kz2) .kz-drop { position: absolute; z-index: 9999; min-width: 230px; padding: 6px; background: var(--leather); border: 2px solid var(--brass-dark); border-radius: 0 0 var(--radius) var(--radius); box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 2px; }
html body:not(#kz1):not(#kz2) .kz-drop.hide { display: none; }
html body:not(#kz1):not(#kz2) .kz-drop button { text-align: left; padding: 11px 14px !important; min-height: 44px; background: transparent !important; color: var(--text) !important; border: 0 !important; border-radius: 4px !important; font: 600 15px var(--font-body) !important; box-shadow: none !important; }
html body:not(#kz1):not(#kz2) .kz-drop button:hover, html body:not(#kz1):not(#kz2) .kz-drop button:focus-visible { background: rgba(209,169,79,.16) !important; color: var(--brass) !important; }
html body:not(#kz1):not(#kz2) .kz-maphint { color: var(--muted); }
html body:not(#kz1):not(#kz2) .kz-mapwrap { overflow-x: auto; border-radius: var(--radius); border: 3px solid var(--paper-edge); box-shadow: var(--shadow); }
html body:not(#kz1):not(#kz2) .kz-map { position: relative; min-width: 860px; aspect-ratio: 1000 / 620; background: #e6d6b1 var(--paper-tex) center/cover; }
html body:not(#kz1):not(#kz2) .kz-map svg { position: absolute; inset: 0; width: 100%; height: 100%; mix-blend-mode: multiply; }
html body:not(#kz1):not(#kz2) .kz-dist { fill: transparent; stroke: #4e3f2a; stroke-width: 3; stroke-dasharray: 12 6; }
html body:not(#kz1):not(#kz2) .kz-dist.kz-own { fill: url(#kzhatch); }
html body:not(#kz1):not(#kz2) .kz-dist.kz-own-mine { fill: url(#kzmine); }
html body:not(#kz1):not(#kz2) .kz-dist.kz-here { stroke: #9b3c1f; stroke-width: 5; stroke-dasharray: none; }
html body:not(#kz1):not(#kz2) .kz-dlabel { position: absolute; transform: translate(-50%, 0); background: rgba(251,244,226,.88) !important; border: 1px solid #6b5838 !important; border-radius: 4px !important; padding: 3px 10px !important; min-height: 0 !important; color: #2a1f15 !important; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,.25) !important; line-height: 1.15; }
html body:not(#kz1):not(#kz2) .kz-dlabel b { display: block; font: 800 14px var(--font-head) !important; text-transform: uppercase; letter-spacing: .06em; color: #2a1f15 !important; }
html body:not(#kz1):not(#kz2) .kz-dlabel small { font: 600 12px var(--font-body); color: #6f2913; }
html body:not(#kz1):not(#kz2) .kz-place { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 3px; background: none !important; border: 0 !important; padding: 0 !important; min-height: 0 !important; box-shadow: none !important; cursor: pointer; z-index: 2; }
html body:not(#kz1):not(#kz2) .kz-place span { width: 62px; height: 62px; border-radius: 50%; background: #3b2e22 center/cover no-repeat; border: 3px solid #fbf4e2; box-shadow: 0 0 0 2px #6b5838, 0 5px 12px rgba(0,0,0,.45); transition: transform .15s; }
html body:not(#kz1):not(#kz2) .kz-place em { font: 700 12.5px var(--font-body); font-style: normal; color: #fbf4e2; background: #2a1f15; padding: 2px 8px; border-radius: 3px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,.35); }
html body:not(#kz1):not(#kz2) .kz-place:hover span, html body:not(#kz1):not(#kz2) .kz-place:focus-visible span { transform: scale(1.12); box-shadow: 0 0 0 3px #9b3c1f, 0 8px 16px rgba(0,0,0,.5); }
html body:not(#kz1):not(#kz2) .kz-place:hover em { background: #9b3c1f; }
html body:not(#kz1):not(#kz2) .kz-placelist { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
html body:not(#kz1):not(#kz2) .kz-placelist .ghost { min-height: 40px; padding: 6px 12px !important; }
html body:not(#kz1):not(#kz2) .kf-bar { height: 10px; background: rgba(0,0,0,.35); border-radius: 5px; overflow: hidden; margin: 6px 0; }
html body:not(#kz1):not(#kz2) .kf-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--rust), var(--brass)); }
html body:not(#kz1):not(#kz2) .kf-big { font: 700 26px var(--font-head); color: var(--paper-light); margin: 4px 0; }
html body:not(#kz1):not(#kz2) .kf-title { color: var(--brass); font-style: italic; margin: -4px 0 8px; }
html body:not(#kz1):not(#kz2) .kf-mine { border-color: var(--brass) !important; }
html body:not(#kz1):not(#kz2) .kf-cups { display: flex; gap: 8px; margin: 10px 0; }
html body:not(#kz1):not(#kz2) .kf-cup { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px !important; min-height: 70px; }
html body:not(#kz1):not(#kz2) .kf-cup { position: relative; font-size: 14px !important; }
html body:not(#kz1):not(#kz2) .kf-cupimg { display: block; width: 44px; height: 46px; background: linear-gradient(90deg, #6f2913, #b4532c 45%, #6f2913); clip-path: polygon(18% 0, 82% 0, 100% 100%, 0 100%); border-radius: 4px 4px 0 0; box-shadow: inset 0 -6px 0 rgba(0,0,0,.25); transition: transform .3s; }
html body:not(#kz1):not(#kz2) .kf-ballimg { position: absolute; top: 34px; width: 16px; height: 16px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff6d8, #d1a94f 60%, #7a5a1c); opacity: 0; }
html body:not(#kz1):not(#kz2) .kf-cup.kf-ball .kf-cupimg { transform: translateY(-16px) rotate(-8deg); }
html body:not(#kz1):not(#kz2) .kf-cup.kf-ball .kf-ballimg { opacity: 1; }
html body:not(#kz1):not(#kz2) .kf-chat li { padding: 6px 0; border-bottom: 1px solid var(--line); }
@media (max-width: 760px) {
  html body:not(#kz1):not(#kz2) .kz-nav { grid-column: 1 / -1; grid-row: auto; justify-self: stretch; justify-content: flex-start; padding: 0 6px; }
  html body:not(#kz1):not(#kz2) .kz-top { min-width: 64px; padding: 6px 7px 7px !important; font-size: 11px !important; }
  html body:not(#kz1):not(#kz2) .kz-nav { -webkit-mask-image: linear-gradient(90deg, #000 88%, transparent); mask-image: linear-gradient(90deg, #000 88%, transparent); }
  html body:not(#kz1):not(#kz2) .kz-maphint::after { content: ' Die Karte kannst du zur Seite wischen.'; }
  html body:not(#kz1):not(#kz2) .kz-top .kz-ico { width: 42px; height: 42px; }
}`;
document.head.appendChild(style6);


// ---------- Meldungen direkt beim Fenster der Aktion (wie bei Pennergame) ----------
// Merkt sich die Karte des zuletzt gedrückten Knopfs. Neue Meldungen werden in diese Karte gespiegelt (volle Breite),
// das Original ausgeblendet. Die Meldung bleibt stehen, auch wenn die Karte neu gezeichnet wird (Seite + Titel),
// bis eine neue Meldung kommt. Versteckte Knöpfe, die alte Skripte selbst drücken (z. B. nach einem Timer),
// gehören über ORIGIN zu ihrer sichtbaren Karte – so landet ein Timer-Ergebnis nie bei einem anderen Knopf.
const NEAR_CARD = '.card, .kf-box, .activity-card, .drink, .lead-card, .action-block, .status-detail, .profile-wide-row, li';
const ORIGIN = {
  begatspot: () => document.querySelector('.card[data-spot="' + (document.getElementById('begspotid')?.value || '') + '"]')
};
const titleOfCard = c => (c?.querySelector('h3, b, h4')?.textContent || '').trim();
const keyOf = c => ({ panel: c?.closest('section.panel')?.id, title: titleOfCard(c) });
const findCard = k => (k?.panel && k.title && [...document.querySelectorAll('#' + k.panel + ' :is(' + NEAR_CARD + ')')]
  .find(c => c.offsetParent && titleOfCard(c) === k.title)) || null;
let lastHit = null, shown = null;
document.addEventListener('click', e => {
  const b = e.target.closest('button, .crime-pick, [role="button"]');
  if (!b || b.closest('.kz-nav, .kz-drop, .kz-map, .section-tools, .kiez-quickbar, nav, .kz-dock')) return;
  let card;
  if (!b.offsetParent || b.classList.contains('hide')) { const r = ORIGIN[b.id]; card = r && r(); if (!card) return; }
  // Listenzeilen verschwinden oft beim Neuzeichnen – dann lieber der umgebende Kasten
  else card = b.closest(NEAR_CARD.replace(', li', '')) || b.closest('li');
  lastHit = { btn: b.offsetParent ? b : null, card, t: Date.now(), key: keyOf(card) };
}, true);
function nearCard() {
  if (!lastHit || Date.now() - lastHit.t > 9000) return null;
  return lastHit.card?.isConnected ? lastHit.card : findCard(lastHit.key);
}
function putNotice(card, html) {
  document.querySelectorAll('.kz-near').forEach(s => { if (s.parentElement !== card) s.remove(); });
  let slot = card.querySelector(':scope > .kz-near');
  if (!slot) { slot = document.createElement('div'); slot.className = 'kz-near'; card.appendChild(slot); }
  if (slot.innerHTML !== html) slot.innerHTML = html;
  return slot;
}
function placeNotice(n) {
  if (!n.isConnected || n.closest('.kz-near') || n.classList.contains('kz-moved') || !n.offsetParent) return;
  if (n.closest('#kiezmodal, .kf-modal, #loginmodal, #signupmodal, #auth, .kz-dock')) return;
  // Meldung gehört schon zu ihrer eigenen Karte (eigener Ergebniskasten ohne ID, z. B. Schnorrplatz nach dem Timer)? Dann bleibt sie dort.
  // Verschoben werden nur geteilte Meldungskästen (#…msg) und Meldungen außerhalb von Karten.
  const home = n.closest(NEAR_CARD.replace(', li', '')), shared = n.parentElement?.id && /msg$/.test(n.parentElement.id);
  if (home && !shared) return;
  const card = nearCard(); if (!card || card.contains(n)) return;
  const c = n.cloneNode(true); c.removeAttribute('id');
  const slot = putNotice(card, c.outerHTML);
  n.classList.add('kz-moved');
  shown = { key: keyOf(card), html: c.outerHTML, t: Date.now() };
  const box = slot.getBoundingClientRect();
  if (box.bottom > innerHeight || box.top < 0) slot.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
// Karte neu gezeichnet? Meldung wieder einsetzen (bis zu 1 Minute bzw. bis zur nächsten Meldung)
function keepShown() {
  if (!shown || Date.now() - shown.t > 60000) return;
  const c = findCard(shown.key);
  if (c && !c.querySelector(':scope > .kz-near')) putNotice(c, shown.html);
}
let keepQueued = false;
new MutationObserver(ms => {
  if (shown && !keepQueued) { keepQueued = true; requestAnimationFrame(() => { keepQueued = false; keepShown(); }); }
  if (!lastHit || Date.now() - lastHit.t > 9000) return;
  const found = new Set();
  ms.forEach(m => {
    const tgt = m.target.nodeType === 1 ? m.target : m.target.parentElement;
    const own = tgt?.closest?.('.notice'); if (own) found.add(own);
    m.addedNodes.forEach(x => { if (x.nodeType !== 1) return; if (x.matches('.notice')) found.add(x); x.querySelectorAll?.('.notice').forEach(y => found.add(y)); });
  });
  if (found.size) requestAnimationFrame(() => found.forEach(placeNotice));
}).observe(document.body, { childList: true, subtree: true, characterData: true });
const style7 = document.createElement('style');
style7.textContent = `html body:not(#kz1):not(#kz2) .notice.kz-moved { display: none !important; }
html body:not(#kz1):not(#kz2) .kz-near { clear: both; margin-top: 12px; grid-column: 1 / -1; flex: 1 0 100%; width: 100%; max-width: none; box-sizing: border-box; }
html body:not(#kz1):not(#kz2) .kz-near .notice { margin: 0; width: 100%; box-sizing: border-box; font-size: 15px !important; line-height: 1.45; animation: kzpop .25s ease-out; }
@keyframes kzpop { from { transform: translateY(-4px); opacity: 0; } to { transform: none; opacity: 1; } }`;
document.head.appendChild(style7);

// ================= Chat-Leiste unten rechts (ROADMAP Platz 1): ALL-Chat + Privatgespräche =================
// Eingeklappt: Balken „Kiez-Chat“ mit Zähler; aufgeklappt: Reiter „Alle“ / „Privat“, Gespräch mit einem Spieler.
// Live über Supabase Realtime (Tabellen chat_messages, messages), zusätzlich ruhiges Abfragen als Rückfall.
const DOCK = { open: false, view: 'all', partner: null, partnerName: '', lastAll: 0, blocked: new Set(), me: null, timer: null, suggestT: 0 };
const dockGet = (k, d) => { try { const v = localStorage.getItem('kz_dock_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const dockSet = (k, v) => { try { localStorage.setItem('kz_dock_' + k, JSON.stringify(v)); } catch (e) { } };
const dockTime = d => { const x = new Date(d), now = new Date(); return x.toDateString() === now.toDateString() ? x.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }); };
function buildDock() {
  if (document.getElementById('kz-dock') || !window.kiezProfile) return;
  DOCK.me = window.kiezProfile.id;
  const d = document.createElement('div');
  d.id = 'kz-dock'; d.className = 'kz-dock';
  d.innerHTML = '<button type="button" class="kz-dock-bar" aria-expanded="false" aria-controls="kz-dock-panel"><span class="kz-dock-dot" aria-hidden="true"></span><b>Kiez-Chat</b><span class="kz-dock-badge hide" aria-label="ungelesen"></span><span class="kz-dock-arrow" aria-hidden="true">▴</span></button>'
    + '<div class="kz-dock-panel" id="kz-dock-panel" role="dialog" aria-label="Kiez-Chat">'
    + '<div class="kz-dock-head"><button type="button" class="kz-dock-tab" data-v="all">Alle</button><button type="button" class="kz-dock-tab" data-v="dm">Privat <span class="kz-dock-badge kz-dm-badge hide"></span></button>'
    + '<button type="button" class="kz-dock-min" aria-label="Chat einklappen">▾</button></div>'
    + '<div class="kz-dock-sub"></div><div class="kz-dock-body" aria-live="polite"></div>'
    + '<div class="kz-dock-msg" role="status"></div>'
    + '<form class="kz-dock-form"><input class="kz-dock-in" maxlength="300" autocomplete="off" placeholder="Nachricht an alle …" aria-label="Nachricht"><button class="big" type="submit">Senden</button></form></div>';
  document.body.appendChild(d);
  const q = s => d.querySelector(s);
  q('.kz-dock-bar').onclick = () => dockToggle(true);
  q('.kz-dock-min').onclick = () => dockToggle(false);
  d.querySelectorAll('.kz-dock-tab').forEach(b => b.onclick = () => { DOCK.partner = null; dockView(b.dataset.v); });
  q('.kz-dock-form').onsubmit = async e => {
    e.preventDefault();
    const inp = q('.kz-dock-in'), txt = inp.value.trim(); if (!txt) return;
    const btn = q('.kz-dock-form button'); btn.disabled = true;
    try {
      if (DOCK.view === 'thread') await rpc('send_player_message', { target_id: DOCK.partner, message_body: txt });
      else await rpc('post_chat', { message_body: txt });
      inp.value = ''; dockMsg('');
      await dockRender();
    } catch (err) { dockMsg(esc(err.message)); }
    btn.disabled = false; inp.focus();
  };
  DOCK.lastAll = dockGet('lastall', 0);
  sb.from('blocks').select('blocked_id').then(r => { (r.data || []).forEach(x => DOCK.blocked.add(x.blocked_id)); });
  dockLive();
  const v = dockGet('view', 'all'), pr = dockGet('partner', null);
  if (v === 'thread' && pr) { DOCK.partner = pr.id; DOCK.partnerName = pr.name; }
  DOCK.view = v === 'thread' && !pr ? 'dm' : v;
  dockToggle(dockGet('open', false), true);
  dockBadges();
}
function dockMsg(html) { const m = document.querySelector('#kz-dock .kz-dock-msg'); if (m) m.innerHTML = html ? '<div class="notice bad">' + html + '</div>' : ''; }
function dockToggle(open, silent) {
  const d = document.getElementById('kz-dock'); if (!d) return;
  DOCK.open = !!open; dockSet('open', DOCK.open);
  d.classList.toggle('open', DOCK.open);
  d.querySelector('.kz-dock-bar').setAttribute('aria-expanded', DOCK.open ? 'true' : 'false');
  document.body.classList.toggle('kz-dock-full', DOCK.open && matchMedia('(max-width: 640px)').matches);
  if (DOCK.open) dockView(DOCK.view); else if (!silent) dockBadges();
}
function dockView(v) {
  DOCK.view = v; dockSet('view', v); dockSet('partner', v === 'thread' ? { id: DOCK.partner, name: DOCK.partnerName } : null);
  const d = document.getElementById('kz-dock'); if (!d) return;
  d.querySelectorAll('.kz-dock-tab').forEach(b => b.classList.toggle('on', b.dataset.v === (v === 'thread' ? 'dm' : v)));
  const form = d.querySelector('.kz-dock-form'), inp = d.querySelector('.kz-dock-in');
  form.classList.toggle('hide', v === 'dm');
  inp.maxLength = v === 'thread' ? 500 : 300;
  inp.placeholder = v === 'thread' ? 'Nachricht an ' + DOCK.partnerName + ' …' : 'Nachricht an alle …';
  dockMsg('');
  dockRender();
}
async function dockRender() {
  const d = document.getElementById('kz-dock'); if (!d || !DOCK.open) return;
  const body = d.querySelector('.kz-dock-body'), sub = d.querySelector('.kz-dock-sub');
  const nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 60;
  if (DOCK.view === 'all') {
    sub.innerHTML = '';
    const { data } = await sb.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(60);
    const list = (data || []).filter(m => !DOCK.blocked.has(m.user_id)).reverse();
    const nm = await names(list.map(m => m.user_id)), admin = !!window.kiezProfile?.is_admin;
    body.innerHTML = list.map(m => '<div class="kz-cm' + (m.user_id === DOCK.me ? ' mine' : '') + '"><button type="button" class="kz-cname" data-id="' + esc(m.user_id) + '" data-n="' + esc(nm[m.user_id] || '?') + '" title="Privat schreiben">' + esc(nm[m.user_id] || '?') + '</button>'
      + '<span class="kz-ct">' + dockTime(m.created_at) + '</span>'
      + (m.user_id === DOCK.me || admin ? '<button type="button" class="kz-cx" data-del="' + m.id + '" aria-label="Löschen" title="Löschen">✕</button>' : '<button type="button" class="kz-cx" data-rep="' + m.id + '" aria-label="Melden" title="Melden">⚑</button>')
      + '<div class="kz-cb">' + esc(m.body) + '</div></div>').join('') || '<p class="kf-muted kz-empty">Noch still hier. Sag Hallo!</p>';
    if (list.length) { DOCK.lastAll = list[list.length - 1].id; dockSet('lastall', DOCK.lastAll); }
    body.querySelectorAll('.kz-cname').forEach(b => b.onclick = () => { if (b.dataset.id !== DOCK.me) window.kiezDM(b.dataset.id, b.dataset.n); });
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { try { await rpc('delete_chat', { message_id: +b.dataset.del }); dockRender(); } catch (e) { dockMsg(esc(e.message)); } });
    body.querySelectorAll('[data-rep]').forEach(b => b.onclick = async () => { if (!confirm('Diese Nachricht der Kiezaufsicht melden?')) return; try { await rpc('report_chat', { message_id: +b.dataset.rep }); dockMsg(''); b.replaceWith(Object.assign(document.createElement('span'), { className: 'kz-ct', textContent: 'gemeldet' })); } catch (e) { dockMsg(esc(e.message)); } });
    if (nearBottom || !body.dataset.v || body.dataset.v !== 'all') body.scrollTop = body.scrollHeight;
  } else if (DOCK.view === 'dm') {
    sub.innerHTML = '<div class="kz-newdm"><input class="kz-dm-find" placeholder="Spielername eintippen …" aria-label="Empfänger suchen" autocomplete="off"><div class="kz-dm-sugg" role="listbox"></div></div>';
    const conv = await rpc('chat_conversations');
    body.innerHTML = (conv || []).map(c => '<button type="button" class="kz-conv" data-id="' + esc(c.partner) + '" data-n="' + esc(c.name) + '"><b>' + esc(c.name) + '</b>'
      + (c.unread > 0 ? '<span class="kz-dock-badge">' + c.unread + '</span>' : '') + '<span class="kz-ct">' + dockTime(c.last_at) + '</span>'
      + '<span class="kz-cprev">' + (c.last_mine ? 'Du: ' : '') + esc(c.last_body) + '</span></button>').join('') || '<p class="kf-muted kz-empty">Noch keine Gespräche. Tipp oben einen Namen ein oder klick im Chat auf einen Spieler.</p>';
    body.querySelectorAll('.kz-conv').forEach(b => b.onclick = () => window.kiezDM(b.dataset.id, b.dataset.n));
    const f = sub.querySelector('.kz-dm-find'), sg = sub.querySelector('.kz-dm-sugg');
    const suggest = async () => {
      const r = await rpc('find_players', { q: f.value });
      sg.innerHTML = (r || []).map(x => '<button type="button" role="option" data-id="' + esc(x.id) + '" data-n="' + esc(x.username) + '">' + esc(x.username) + ' <span class="kf-muted">Lvl ' + x.level + (x.friend ? ' · Freund' : '') + (x.gang ? ' · Bande' : '') + '</span></button>').join('')
        || (f.value.trim() ? '<p class="kf-muted">Kein Spieler mit diesem Namen.</p>' : '');
      sg.querySelectorAll('button').forEach(b => b.onclick = () => window.kiezDM(b.dataset.id, b.dataset.n));
    };
    f.oninput = () => { clearTimeout(DOCK.suggestT); DOCK.suggestT = setTimeout(suggest, 250); };
    f.onfocus = suggest;
    body.dataset.v = 'dm';
  } else {
    sub.innerHTML = '<div class="kz-thread-head"><button type="button" class="kz-back" aria-label="Zurück zu den Gesprächen">←</button><b>' + esc(DOCK.partnerName) + '</b><a href="#" class="kiez-player" data-id="' + esc(DOCK.partner) + '">Profil</a></div>';
    sub.querySelector('.kz-back').onclick = () => dockView('dm');
    const t = await rpc('chat_thread', { partner: DOCK.partner });
    body.innerHTML = (t.messages || []).map(m => '<div class="kz-bubble' + (m.mine ? ' mine' : '') + '"><div>' + esc(m.body) + '</div><span class="kz-ct">' + dockTime(m.created_at) + (m.mine && m.read_at ? ' · gelesen' : '') + '</span></div>').join('')
      || '<p class="kf-muted kz-empty">Schreib die erste Nachricht an ' + esc(DOCK.partnerName) + '.</p>';
    if (t.blocked) dockMsg('Ihr habt euch gegenseitig blockiert – Nachrichten gehen nicht.');
    body.scrollTop = body.scrollHeight;
  }
  body.dataset.v = DOCK.view;
  dockBadges();
}
async function dockBadges() {
  const d = document.getElementById('kz-dock'); if (!d) return;
  let all = 0, dm = 0;
  try {
    const u = await rpc('unread_counts'); dm = u?.messages || 0;
    if (!(DOCK.open && DOCK.view === 'all')) {
      const { count } = await sb.from('chat_messages').select('id', { count: 'exact', head: true }).gt('id', DOCK.lastAll || 0).neq('user_id', DOCK.me);
      all = DOCK.lastAll ? Math.min(99, count || 0) : 0;
    }
  } catch (e) { return; }
  const total = all + dm, bar = d.querySelector('.kz-dock-bar .kz-dock-badge'), dmb = d.querySelector('.kz-dm-badge');
  bar.textContent = total > 99 ? '99+' : total; bar.classList.toggle('hide', !total);
  dmb.textContent = dm; dmb.classList.toggle('hide', !dm);
}
function dockLive() {
  try {
    sb.channel('kz-dock')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => { if (DOCK.open && DOCK.view === 'all') dockRender(); else dockBadges(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'recipient_id=eq.' + DOCK.me }, p => {
        const from = p.new?.sender_id;
        if (DOCK.open && ((DOCK.view === 'thread' && DOCK.partner === from) || DOCK.view === 'dm')) dockRender(); else dockBadges();
      })
      .subscribe();
  } catch (e) { /* ohne Realtime bleibt das Abfragen */ }
  clearInterval(DOCK.timer);
  DOCK.timer = setInterval(() => { if (document.hidden) return; if (DOCK.open) dockRender(); else dockBadges(); }, 20000);
}
// Von überall ein Privatgespräch öffnen (Profil, Chat, Listen)
window.kiezDM = (id, name) => {
  if (!id || id === DOCK.me) return;
  DOCK.partner = id; DOCK.partnerName = name || 'Spieler';
  if (!document.getElementById('kz-dock')) buildDock();
  dockToggle(true, true); dockView('thread');
  setTimeout(() => document.querySelector('#kz-dock .kz-dock-in')?.focus(), 200);
};
buildDock();
{ const prev = window.kiezOnProfile; window.kiezOnProfile = p => { prev?.(p); buildDock(); }; }

// Kiezpost-Seite: Empfänger per Name statt Liste aller Spieler (Vorschläge: Freunde und Bande zuerst)
function upgradeMailForm() {
  const sel = document.getElementById('msgto'); if (!sel || document.getElementById('kz-msgname')) return;
  sel.classList.add('hide');
  const wrap = document.createElement('div'); wrap.className = 'kz-newdm';
  wrap.innerHTML = '<input id="kz-msgname" placeholder="Empfänger: Spielername eintippen …" aria-label="Empfänger" autocomplete="off"><div class="kz-dm-sugg" role="listbox"></div>';
  sel.after(wrap);
  const inp = wrap.querySelector('input'), sg = wrap.querySelector('.kz-dm-sugg');
  // Das alte Skript füllt die Liste bei jedem Neuladen mit allen Spielern – danach wieder auf die gewählte Person setzen
  let chosen = null;
  const want = () => chosen ? '<option value="' + esc(chosen.id) + '">' + esc(chosen.n) + '</option>' : '<option value="">–</option>';
  const apply = () => { if (sel.innerHTML !== want()) sel.innerHTML = want(); sel.value = chosen ? chosen.id : ''; };
  new MutationObserver(apply).observe(sel, { childList: true });
  const choose = (id, n) => { chosen = id ? { id, n } : null; apply(); if (n) inp.value = n; sg.innerHTML = ''; };
  const suggest = async () => {
    const r = await rpc('find_players', { q: inp.value });
    const exact = (r || []).find(x => x.username.toLowerCase() === inp.value.trim().toLowerCase());
    chosen = exact ? { id: exact.id, n: exact.username } : null; apply();
    sg.innerHTML = (r || []).map(x => '<button type="button" data-id="' + esc(x.id) + '" data-n="' + esc(x.username) + '">' + esc(x.username) + ' <span class="kf-muted">Lvl ' + x.level + (x.friend ? ' · Freund' : '') + (x.gang ? ' · Bande' : '') + '</span></button>').join('');
    sg.querySelectorAll('button').forEach(b => b.onclick = () => choose(b.dataset.id, b.dataset.n));
  };
  let t = 0; inp.oninput = () => { clearTimeout(t); t = setTimeout(suggest, 250); };
  inp.onfocus = () => { if (!inp.value) suggest(); };
  apply();
}
upgradeMailForm(); setTimeout(upgradeMailForm, 1500);

const style8 = document.createElement('style');
style8.textContent = `
html body:not(#kz1):not(#kz2) .kz-dock { position: fixed; right: 18px; bottom: 0; z-index: 9000; width: 340px; font-family: var(--font-body); }
html body:not(#kz1):not(#kz2) .kz-dock-bar { width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px 14px !important; min-height: 46px; border-radius: 10px 10px 0 0 !important; background: var(--leather) !important; color: var(--text) !important; border: 2px solid var(--brass-dark) !important; border-bottom: 0 !important; box-shadow: 0 -4px 16px rgba(0,0,0,.4) !important; font: 700 15px var(--font-head) !important; cursor: pointer; }
html body:not(#kz1):not(#kz2) .kz-dock-bar b { flex: 1; text-align: left; }
html body:not(#kz1):not(#kz2) .kz-dock-dot { width: 10px; height: 10px; border-radius: 50%; background: #6dbb4f; box-shadow: 0 0 0 3px rgba(109,187,79,.25); }
html body:not(#kz1):not(#kz2) .kz-dock-badge { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: var(--rust); color: #fff; font: 700 12px/22px var(--font-body); text-align: center; }
html body:not(#kz1):not(#kz2) .kz-dock-badge.hide { display: none; }
html body:not(#kz1):not(#kz2) .kz-dock-panel { display: none; }
html body:not(#kz1):not(#kz2) .kz-dock.open .kz-dock-bar { display: none; }
html body:not(#kz1):not(#kz2) .kz-dock.open .kz-dock-panel { display: flex; flex-direction: column; height: 460px; max-height: calc(100vh - 90px); background: var(--leather); border: 2px solid var(--brass-dark); border-bottom: 0; border-radius: 10px 10px 0 0; box-shadow: 0 -6px 24px rgba(0,0,0,.5); overflow: hidden; }
html body:not(#kz1):not(#kz2) .kz-dock-head { display: flex; gap: 4px; padding: 6px; background: var(--leather-2); border-bottom: 1px solid var(--line); }
html body:not(#kz1):not(#kz2) .kz-dock-tab, html body:not(#kz1):not(#kz2) .kz-dock-min { min-height: 38px; padding: 6px 12px !important; background: transparent !important; color: var(--muted) !important; border: 0 !important; border-radius: 6px !important; box-shadow: none !important; font: 700 14px var(--font-head) !important; }
html body:not(#kz1):not(#kz2) .kz-dock-tab.on { background: rgba(209,169,79,.18) !important; color: var(--brass) !important; }
html body:not(#kz1):not(#kz2) .kz-dock-min { margin-left: auto; font-size: 18px !important; }
html body:not(#kz1):not(#kz2) .kz-dock-sub:empty { display: none; }
html body:not(#kz1):not(#kz2) .kz-dock-sub { padding: 8px 10px; border-bottom: 1px solid var(--line); }
html body:not(#kz1):not(#kz2) .kz-dock-body { flex: 1; overflow-y: auto; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; color: var(--text); }
html body:not(#kz1):not(#kz2) .kz-cm { position: relative; padding: 6px 8px; border-radius: 6px; background: rgba(255,240,210,.04); }
html body:not(#kz1):not(#kz2) .kz-cm.mine { background: rgba(209,169,79,.10); }
html body:not(#kz1):not(#kz2) .kz-cname { background: none !important; border: 0 !important; padding: 0 !important; min-height: 0 !important; box-shadow: none !important; color: var(--brass) !important; font: 700 14px var(--font-body) !important; cursor: pointer; }
html body:not(#kz1):not(#kz2) .kz-ct { margin-left: 6px; color: var(--muted); font-size: 12px; }
html body:not(#kz1):not(#kz2) .kz-cx { position: absolute; right: 4px; top: 4px; background: none !important; border: 0 !important; padding: 2px 6px !important; min-height: 0 !important; box-shadow: none !important; color: var(--muted) !important; font-size: 13px !important; opacity: .6; }
html body:not(#kz1):not(#kz2) .kz-cx:hover { opacity: 1; color: var(--rust) !important; }
html body:not(#kz1):not(#kz2) .kz-cb { font-size: 15px; line-height: 1.4; word-wrap: break-word; }
html body:not(#kz1):not(#kz2) .kz-conv { display: grid; grid-template-columns: 1fr auto auto; gap: 2px 8px; align-items: center; text-align: left; width: 100%; padding: 9px 10px !important; min-height: 0 !important; background: rgba(255,240,210,.04) !important; border: 1px solid var(--line) !important; border-radius: 6px !important; box-shadow: none !important; color: var(--text) !important; font: 15px var(--font-body) !important; }
html body:not(#kz1):not(#kz2) .kz-conv b { color: var(--paper-light); }
html body:not(#kz1):not(#kz2) .kz-cprev { grid-column: 1 / -1; color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html body:not(#kz1):not(#kz2) .kz-bubble { max-width: 82%; align-self: flex-start; padding: 7px 10px; border-radius: 10px 10px 10px 2px; background: rgba(255,240,210,.07); font-size: 15px; line-height: 1.4; word-wrap: break-word; }
html body:not(#kz1):not(#kz2) .kz-bubble.mine { align-self: flex-end; border-radius: 10px 10px 2px 10px; background: rgba(155,60,31,.45); }
html body:not(#kz1):not(#kz2) .kz-bubble .kz-ct { display: block; margin: 2px 0 0; text-align: right; font-size: 11.5px; }
html body:not(#kz1):not(#kz2) .kz-thread-head { display: flex; align-items: center; gap: 10px; color: var(--paper-light); }
html body:not(#kz1):not(#kz2) .kz-thread-head b { flex: 1; font-family: var(--font-head); font-size: 16px; }
html body:not(#kz1):not(#kz2) .kz-back { min-height: 34px; padding: 2px 10px !important; }
html body:not(#kz1):not(#kz2) .kz-dock-msg:empty { display: none; }
html body:not(#kz1):not(#kz2) .kz-dock-msg { padding: 0 10px 6px; }
html body:not(#kz1):not(#kz2) .kz-dock-form { display: flex; gap: 6px; padding: 8px; border-top: 1px solid var(--line); background: var(--leather-2); }
html body:not(#kz1):not(#kz2) .kz-dock-form.hide { display: none; }
html body:not(#kz1):not(#kz2) .kz-dock-in { flex: 1; min-width: 0; min-height: 42px; padding: 8px 10px; }
html body:not(#kz1):not(#kz2) .kz-dock-form .big { min-height: 42px; padding: 6px 14px !important; }
html body:not(#kz1):not(#kz2) .kz-newdm { position: relative; }
html body:not(#kz1):not(#kz2) .kz-newdm input { width: 100%; box-sizing: border-box; min-height: 42px; padding: 8px 10px; }
html body:not(#kz1):not(#kz2) .kz-dm-sugg { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; max-height: 180px; overflow-y: auto; }
html body:not(#kz1):not(#kz2) .kz-dm-sugg button { text-align: left; min-height: 38px; padding: 6px 10px !important; background: rgba(255,240,210,.05) !important; color: var(--text) !important; border: 0 !important; box-shadow: none !important; font: 15px var(--font-body) !important; }
html body:not(#kz1):not(#kz2) .kz-dm-sugg button:hover { background: rgba(209,169,79,.16) !important; }
html body:not(#kz1):not(#kz2) .kz-empty { text-align: center; margin: 20px 8px; }
html body:not(#kz1):not(#kz2) .main { padding-bottom: 64px; }
@media (max-width: 640px) {
  html body:not(#kz1):not(#kz2) .kz-dock { right: 14px; bottom: 14px; width: auto; }
  html body:not(#kz1):not(#kz2) .kz-dock-bar { width: 58px; height: 58px; padding: 0 !important; justify-content: center; border-radius: 50% !important; border: 2px solid var(--brass-dark) !important; position: relative; }
  html body:not(#kz1):not(#kz2) .kz-dock-bar b, html body:not(#kz1):not(#kz2) .kz-dock-arrow { display: none; }
  html body:not(#kz1):not(#kz2) .kz-dock-bar::before { content: ''; width: 26px; height: 22px; border-radius: 6px; background: var(--brass); clip-path: polygon(0 0, 100% 0, 100% 75%, 35% 75%, 12% 100%, 15% 75%, 0 75%); }
  html body:not(#kz1):not(#kz2) .kz-dock-dot { display: none; }
  html body:not(#kz1):not(#kz2) .kz-dock-bar .kz-dock-badge { position: absolute; top: -4px; right: -4px; }
  html body:not(#kz1):not(#kz2) .kz-dock.open { inset: 0; width: auto; }
  html body:not(#kz1):not(#kz2) .kz-dock.open .kz-dock-panel { height: 100%; max-height: none; border-radius: 0; border: 0; }
  html body.kz-dock-full { overflow: hidden; }
}`;
document.head.appendChild(style8);

// ================= S2: Besitz sichtbar, Anlegen/Ablegen, Kampfwerte, Lernwarteschlange (ROADMAP 105–110, 69a/c/d, 73a) =================
const OWN = { cat: null, pets: null, combat: null, myPets: [], busy: false };
const SKILL_DE = { attack: 'Angriff', defense: 'Verteidigung', streetwise: 'Geschick', stamina: 'Ausdauer', speech: 'Sprechen', music: 'Musik', social: 'Sozialkontakte', pickpocket: 'Taschentricks' };
async function ownLoad() {
  if (!window.kiezProfile) return;
  if (!OWN.cat) {
    const [a, b] = await Promise.all([sb.from('shop_items').select('id,name,price,attack,defense,required_level,category'), sb.from('pet_catalog').select('id,name,price,required_level')]);
    OWN.cat = Object.fromEntries((a.data || []).map(x => [x.id, x])); OWN.pets = Object.fromEntries((b.data || []).map(x => [x.id, x]));
  }
  const [c, up] = await Promise.all([rpc('combat_overview'), sb.from('user_pets').select('pet_id,active').eq('user_id', window.kiezProfile.id)]);
  OWN.combat = c; OWN.myPets = up.data || [];
  ownDecorate(); combatBoxes();
}
const ownLabel = (txt, extra) => '<span class="kz-owned">✔ ' + txt + '</span>' + (extra || '');
function ownSlot(card) {
  let s = card.querySelector(':scope > .kz-own');
  if (!s) { s = document.createElement('div'); s.className = 'kz-own'; card.appendChild(s); }
  return s;
}
function ownDecorate() {
  const p = window.kiezProfile, c = OWN.combat; if (!p || !c || !OWN.cat) return;
  const owned = new Set(c.owned || []), on = new Set((c.equipped || []).map(x => x.id));
  document.querySelectorAll('.buyitem[data-id]').forEach(btn => {
    const it = OWN.cat[btn.dataset.id], card = btn.closest('.card'); if (!it || !card) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    if (owned.has(it.id)) {
      btn.style.setProperty('display', 'none', 'important'); card.classList.add('kz-is-owned');
      const state = on.has(it.id) ? 'on' : 'own', s = ownSlot(card);
      if (s.dataset.state === state) return; s.dataset.state = state;
      s.innerHTML = state === 'on' ? ownLabel('ANGELEGT', ' <button type="button" class="ghost kz-unequip">Ablegen</button>') : ownLabel('IM BESITZ', ' <button type="button" class="big kz-equip">Anlegen</button>');
      s.insertAdjacentHTML('beforeend', '<div class="kz-own-msg"></div>');
      const b = s.querySelector('button');
      // Die Meldung kommt in den neu gezeichneten Besitz-Bereich (der alte wird beim Neuzeichnen ersetzt)
      b.onclick = async () => {
        b.disabled = true;
        try {
          const r = await rpc(state === 'on' ? 'unequip_item' : 'equip_item', { wanted_item: it.id });
          OWN.combat = r.combat; ownDecorate(); combatBoxes();
          say(card.querySelector(':scope > .kz-own .kz-own-msg'), (state === 'on' ? esc(r.name) + ' abgelegt.' : esc(r.name) + ' angelegt.') + ' Angriff jetzt ' + r.combat.attack.total + ', Verteidigung ' + r.combat.defense.total + '.', true);
        } catch (e) { say(s.querySelector('.kz-own-msg'), esc(e.message), false); b.disabled = false; }
      };
      return;
    }
    card.classList.remove('kz-is-owned'); btn.style.removeProperty('display'); card.querySelector(':scope > .kz-own')?.remove();
    const lvl = p.level < it.required_level, poor = Number(p.money) < Number(it.price);
    btn.disabled = lvl || poor;
    btn.textContent = lvl ? '🔒 ab Level ' + it.required_level : poor ? btn.dataset.orig + ' · zu wenig Geld' : btn.dataset.orig;
    card.classList.toggle('kz-locked', lvl);
  });
  const mine = Object.fromEntries(OWN.myPets.map(x => [x.pet_id, x]));
  document.querySelectorAll('.buypet[data-id]').forEach(btn => {
    const pet = OWN.pets?.[btn.dataset.id], card = btn.closest('.card'); if (!pet || !card) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    const m = mine[pet.id];
    if (m) {
      btn.style.setProperty('display', 'none', 'important'); card.classList.add('kz-is-owned');
      const state = m.active ? 'on' : 'own', s = ownSlot(card);
      if (s.dataset.state === state) return; s.dataset.state = state;
      s.innerHTML = (state === 'on' ? ownLabel('DABEI') : ownLabel('IM BESITZ', ' <button type="button" class="big kz-petgo">Mitnehmen</button>')) + '<div class="kz-own-msg"></div>';
      const b = s.querySelector('.kz-petgo');
      if (b) b.onclick = async () => {
        b.disabled = true;
        try { await rpc('activate_pet', { wanted_pet: pet.id }); await ownLoad(); window.kiezLoadPets?.(); say(card.querySelector(':scope > .kz-own') && (card.querySelector(':scope > .kz-own .kz-own-msg') || card.querySelector(':scope > .kz-own').appendChild(Object.assign(document.createElement('div'), { className: 'kz-own-msg' }))), esc(pet.name) + ' kommt jetzt mit.', true); }
        catch (e) { say(s.querySelector('.kz-own-msg'), esc(e.message), false); b.disabled = false; }
      };
      return;
    }
    card.classList.remove('kz-is-owned'); btn.style.removeProperty('display'); card.querySelector(':scope > .kz-own')?.remove();
    const lock = p.social_skill < pet.required_level, poor = Number(p.money) < Number(pet.price);
    btn.disabled = lock || poor;
    btn.textContent = lock ? '🔒 Sozialkontakte Stufe ' + pet.required_level : poor ? btn.dataset.orig + ' · zu wenig Geld' : btn.dataset.orig;
    card.classList.toggle('kz-locked', lock);
  });
}
// Sammelgebiete und Schnorrplätze: Voraussetzungen vorab zeigen statt Fehlermeldung nach dem Klick (110)
function lockAreas() {
  const p = window.kiezProfile; if (!p) return;
  document.querySelectorAll('#income .area-unlock').forEach(btn => {
    const card = btn.closest('.card'); if (!card) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    const m = card.innerText.match(/Geschick Stufe (\d+)/), need = m ? +m[1] : 0, price = Number((btn.dataset.orig.match(/([\d.]+,\d{2})/) || [])[1]?.replace('.', '').replace(',', '.') || 0);
    const lock = need && p.streetwise < need, poor = price && Number(p.money) < price;
    btn.disabled = !!(lock || poor); if (lock || poor) btn.dataset.kzlock = '1'; else delete btn.dataset.kzlock;
    btn.textContent = lock ? '🔒 Geschick Stufe ' + need + ' nötig' : poor ? btn.dataset.orig + ' · zu wenig Geld' : btn.dataset.orig;
    card.classList.toggle('kz-locked', !!lock);
  });
  document.querySelectorAll('#income .card[data-spot]').forEach(card => {
    const m = card.innerText.match(/ab Sammelgebiet (\d+)/), need = m ? +m[1] : 1, btn = card.querySelector('.schnorr-go'); if (!btn) return;
    const lock = (p.area_level || 1) < need;
    if (lock) { btn.disabled = true; btn.dataset.kzlock = '1'; btn.textContent = '🔒 ab Sammelgebiet ' + need; card.classList.add('kz-locked'); }
    else if (card.classList.contains('kz-locked')) { btn.disabled = false; delete btn.dataset.kzlock; btn.textContent = 'Hingehen'; card.classList.remove('kz-locked'); }
  });
  // Andere Skripte schalten Knöpfe wieder frei – gesperrte bleiben trotzdem gesperrt
  document.querySelectorAll('[data-kzlock]').forEach(b => { if (!b.disabled) b.disabled = true; });
}
document.addEventListener('click', e => { if (e.target.closest('[data-kzlock]')) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
{ const inc = document.getElementById('income'); if (inc) new MutationObserver(() => { clearTimeout(lockAreas.t); lockAreas.t = setTimeout(lockAreas, 120); }).observe(inc, { childList: true, subtree: true }); }
{ const prev = window.kiezOnProfile; window.kiezOnProfile = p => { prev?.(p); lockAreas(); }; }
lockAreas();
// Ausblenden muss wirken: Viele alte Skripte setzen style.display='none', das Design überstimmt das mit !important.
// Jedes schwache „none“ im Spielbereich wird zu einem starken – Einblenden (display='' oder ein Wert) funktioniert wie gehabt.
function hardenHide(el) { if (el.style && el.style.display === 'none' && !el.style.getPropertyPriority('display')) el.style.setProperty('display', 'none', 'important'); }
{ const main = document.querySelector('.main') || document.body;
  main.querySelectorAll('[style*="display"]').forEach(hardenHide);
  new MutationObserver(ms => ms.forEach(m => { if (m.type === 'attributes') hardenHide(m.target); })).observe(main, { attributes: true, attributeFilter: ['style'], subtree: true }); }
// Kampfwerte aufgeschlüsselt: Grundwert + Boni (Laden, Prügelei)
function combatBoxes() {
  const c = OWN.combat; if (!c) return;
  const a = c.attack, d = c.defense, part = (v, l) => v ? ' + ' + v + ' ' + l : '';
  const html = '<h3>Deine Kampfwerte</h3><div class="kz-combat"><div><span>Angriff</span><b>' + a.total + '</b><small>Grundwert ' + a.base + part(a.items, 'Ausrüstung') + part(a.pets, 'Begleiter') + part(a.gang, 'Bande') + part(a.plunder, 'Plunder') + '</small></div>'
    + '<div><span>Verteidigung</span><b>' + d.total + '</b><small>Grundwert ' + d.base + part(d.shelter, 'Unterkunft') + part(d.items, 'Ausrüstung') + part(d.pets, 'Begleiter') + part(d.gang, 'Bande') + part(d.plunder, 'Plunder') + part(d.traps, 'Fallen') + '</small></div></div>'
    + '<p class="kf-muted">Angelegt: ' + ((c.equipped || []).map(x => esc(x.name)).join(' · ') || 'nichts – kauf etwas und leg es an') + '</p>';
  ['#store .inside', '#pvp .inside'].forEach(sel => {
    const host = document.querySelector(sel); if (!host) return;
    let box = host.querySelector(':scope > .kz-combat-box');
    if (!box) { box = document.createElement('div'); box.className = 'kf-box kz-combat-box'; host.prepend(box); }
    if (box.innerHTML !== html) box.innerHTML = html;
  });
}
let ownT = 0;
const ownSoon = () => { clearTimeout(ownT); ownT = setTimeout(ownDecorate, 150); };
['store', 'pets'].forEach(id => { const el = document.getElementById(id); if (el) new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !n.closest?.('.kz-own')))) ownSoon(); }).observe(el, { childList: true, subtree: true }); });
{ const prev = window.kiezOnProfile; window.kiezOnProfile = p => { prev?.(p); ownSoon(); }; }
['store', 'pets', 'pvp'].forEach(id => { const prev = loaders[id]; loaders[id] = async () => { await prev?.(); ownLoad(); }; });
// Nach Käufen im alten Skript neu laden (Kauf-Knopf wird angeklickt → kurz danach Stand holen)
document.addEventListener('click', e => { if (e.target.closest('.buyitem, .buypet, .activatepet, .equipitem, .craft-go')) setTimeout(ownLoad, 1500); });
ownLoad();

// ---------- Prügelei: Knöpfe sauber in einer Reihe (69a) + Nachricht (127) ----------
function tidyOpponents() {
  document.querySelectorAll('#opponents .card').forEach(card => {
    if (card.querySelector(':scope > .kz-actions')) return;
    const atk = card.querySelector('.attackplayer'); if (!atk) return;
    const row = document.createElement('div'); row.className = 'kz-actions';
    card.querySelectorAll(':scope > button').forEach(b => row.appendChild(b));
    const m = document.createElement('button'); m.type = 'button'; m.className = 'ghost'; m.textContent = 'Nachricht';
    m.onclick = () => window.kiezDM?.(atk.dataset.id, card.querySelector('b')?.textContent.trim());
    row.appendChild(m);
    card.appendChild(row);
  });
}
if (document.getElementById('opponents')) new MutationObserver(() => setTimeout(tidyOpponents, 50)).observe(document.getElementById('opponents'), { childList: true, subtree: true });
tidyOpponents();

// ---------- Weiterbildung: Stufenanzeige immer aktuell (69c) ----------
function syncSkillCards() {
  document.querySelectorAll('#training .skill-grid .card').forEach(card => {
    const lvl = Number(card.querySelector('b span')?.textContent || card.querySelector('.skill-info b span')?.textContent || 0); if (!lvl) return;
    const req = card.querySelector('.skill-requirements'), lab = card.querySelector('.skill-progress-label span:last-child'), bar = card.querySelector('.skill-progress span');
    const t = 'Aktuelle Stufe: ' + lvl + ' · Nächste Stufe erhöht die Wirkung dieser Fähigkeit.';
    if (req && req.textContent !== t) req.textContent = t;
    if (lab && lab.textContent !== 'Stufe ' + lvl) lab.textContent = 'Stufe ' + lvl;
    if (bar) bar.style.width = Math.max(3, Math.min(100, lvl / 1.5)) + '%';
  });
}
setInterval(() => { if (document.getElementById('training')?.classList.contains('active-view')) syncSkillCards(); }, 1000);

// ---------- Lernwarteschlange als eigener Reiter (69d) ----------
let queueTimer = 0;
async function drawQueue(msg) {
  const host = document.querySelector('#training .inside'); if (!host) return;
  let box = host.querySelector(':scope > .kz-queue');
  if (!box) { box = document.createElement('div'); box.className = 'kf-box kz-queue section-lead'; host.prepend(box); }
  let s;
  try { s = await rpc('training_queue_status'); } catch (e) { box.innerHTML = '<h3>Lernwarteschlange</h3><div class="notice bad">' + esc(e.message) + '</div>'; return; }
  if (s.profile) window.kiezRenderProfile?.(s.profile);
  const cur = s.current, left = cur ? Math.max(0, Math.round((new Date(cur.ends_at) - Date.now()) / 1000)) : 0;
  const fmt = sec => sec >= 3600 ? Math.floor(sec / 3600) + ' Std. ' + Math.floor(sec % 3600 / 60) + ' Min.' : Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') + ' Min.';
  let note = msg || '';
  if (s.finished) note += (note ? ' ' : '') + SKILL_DE[s.finished.finished] + ' abgeschlossen (+' + s.finished.points + ' Punkte).';
  if (s.started) note += (note ? ' ' : '') + 'Aus der Warteschlange gestartet: ' + SKILL_DE[s.started] + '.';
  box.innerHTML = '<h3>Lernwarteschlange</h3><p class="kf-muted">Plane bis zu 3 Weiterbildungen im Voraus. Ist eine fertig, startet die nächste automatisch – bezahlt wird erst beim Start.</p>'
    + '<div class="kz-q-now">' + (cur ? '<b>Läuft: ' + SKILL_DE[cur.skill] + ' → Stufe ' + cur.next_level + '</b><span class="kz-q-left">' + (left ? 'noch ' + fmt(left) : 'fertig!') + '</span>'
      + '<div class="kf-row">' + (left ? '<button type="button" class="ghost kz-q-cancel">Abbrechen (Hälfte zurück)</button>' : '<button type="button" class="big kz-q-done">Abschließen</button>') + '</div>'
      : '<b>Gerade lernst du nichts.</b>') + '</div>'
    + '<ol class="kz-q-list">' + (s.queue || []).map(q => '<li><span>' + SKILL_DE[q.skill] + ' → Stufe ' + q.next_level + ' · ' + eur(q.price) + ' · ' + q.minutes + ' Min.</span><button type="button" class="ghost kz-q-del" data-id="' + q.id + '">Entfernen</button></li>').join('') + '</ol>'
    + ((s.queue || []).length < 3 ? '<div class="kf-row"><select class="kz-q-skill" aria-label="Fähigkeit">' + Object.entries(SKILL_DE).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select><button type="button" class="big kz-q-add">Einplanen</button></div>' : '<p class="kf-muted">Warteschlange voll.</p>')
    + (s.problem ? '<div class="notice bad">Nächste Weiterbildung konnte nicht starten: ' + esc(s.problem) + '</div>' : '')
    + '<div class="kz-q-msg">' + (note ? '<div class="notice good">' + note + '</div>' : '') + '</div>';
  const q = x => box.querySelector(x), m = q('.kz-q-msg');
  if (q('.kz-q-add')) act(q('.kz-q-add'), m, async () => { await rpc('queue_training', { skill_type: q('.kz-q-skill').value }); setTimeout(() => drawQueue('Eingeplant.'), 50); return 'Eingeplant.'; });
  box.querySelectorAll('.kz-q-del').forEach(b => act(b, m, async () => { await rpc('unqueue_training', { entry_id: +b.dataset.id }); setTimeout(() => drawQueue('Entfernt.'), 50); return 'Entfernt.'; }));
  if (q('.kz-q-cancel')) act(q('.kz-q-cancel'), m, async () => { if (!confirm('Weiterbildung abbrechen? Du bekommst die Hälfte des Preises zurück.')) return ''; const r = await rpc('cancel_training'); window.kiezRenderProfile?.(r.profile); setTimeout(() => drawQueue('Abgebrochen, ' + eur(r.refund) + ' zurück.'), 50); return 'Abgebrochen.'; });
  if (q('.kz-q-done')) act(q('.kz-q-done'), m, async () => { setTimeout(drawQueue, 50); return ''; });
  clearTimeout(queueTimer);
  if (cur && document.getElementById('training')?.classList.contains('active-view')) queueTimer = setTimeout(() => drawQueue(), left > 0 ? Math.min(left * 1000 + 800, 30000) : 30000);
}
{ const prev = loaders.training; loaders.training = async () => { await prev?.(); drawQueue(); }; }
if (document.getElementById('training')?.classList.contains('active-view')) drawQueue();

// ---------- Klick auf „KIEZKÖNIG“ führt zur Startseite (73a) ----------
document.querySelectorAll('.logo').forEach(l => {
  l.style.cursor = 'pointer'; l.setAttribute('role', 'link'); l.title = 'Zur Startseite';
  l.addEventListener('click', () => { if (window.kiezProfile) { go('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }); } else window.scrollTo({ top: 0, behavior: 'smooth' }); });
});

const style9 = document.createElement('style');
style9.textContent = `
html body:not(#kz1):not(#kz2) .kz-own { clear: both; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 10px; }
html body:not(#kz1):not(#kz2) .kz-owned { font: 700 13px var(--font-body); letter-spacing: .08em; color: #9fcf86; text-transform: uppercase; }
html body:not(#kz1):not(#kz2) .kz-own-msg { flex: 1 0 100%; }
html body:not(#kz1):not(#kz2) .kz-own-msg:empty { display: none; }
html body:not(#kz1):not(#kz2) .card.kz-is-owned { border-color: rgba(159,207,134,.45) !important; }
html body:not(#kz1):not(#kz2) .card.kz-locked { opacity: .72; }
html body:not(#kz1):not(#kz2) .card.kz-locked .generated-item-thumb { filter: grayscale(.8); }
html body:not(#kz1):not(#kz2) .kz-combat { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 6px 0; }
html body:not(#kz1):not(#kz2) .kz-combat > div { display: flex; flex-direction: column; padding: 10px 12px; border-radius: 6px; background: rgba(255,240,210,.05); border: 1px solid var(--line); }
html body:not(#kz1):not(#kz2) .kz-combat span { color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: .08em; }
html body:not(#kz1):not(#kz2) .kz-combat b { font: 700 26px var(--font-head); color: var(--paper-light); }
html body:not(#kz1):not(#kz2) .kz-combat small { color: var(--muted); font-size: 13px; }
html body:not(#kz1):not(#kz2) .kz-actions { clear: both; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; width: 100%; }
html body:not(#kz1):not(#kz2) .kz-actions button { margin: 0 !important; }
html body:not(#kz1):not(#kz2) .kf-box.kz-queue { display: block !important; }
html body:not(#kz1):not(#kz2) .kz-q-now { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px; border-radius: 6px; background: rgba(255,240,210,.05); margin: 8px 0; }
html body:not(#kz1):not(#kz2) .kz-q-left { color: var(--brass); font-weight: 700; }
html body:not(#kz1):not(#kz2) .kz-q-now .kf-row { flex: 1 0 100%; }
html body:not(#kz1):not(#kz2) .kz-q-list { padding-left: 22px; margin: 8px 0; }
html body:not(#kz1):not(#kz2) .kz-q-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line); }
html body:not(#kz1):not(#kz2) .kz-q-skill { min-height: 42px; padding: 6px 10px; }
@media (max-width: 640px) { html body:not(#kz1):not(#kz2) .kz-combat { grid-template-columns: 1fr; } }`;
document.head.appendChild(style9);

// ================= S3: Kopfleiste führt genau zur passenden Karte (70–73) =================
// Ziel: [Seite, Reiter, Selektor der Karte]; die Karte wird nach dem Wechsel oben gezeigt und kurz hervorgehoben
const HEAD_LINKS = [
  ['#money', 'schliessfach', null, '#schliessfach .card, #schliessfach h2'],
  ['.alcohol-stat', 'store', 'Verbrauchbares', '#store .supermarket-inline'],
  ['.top-training-stat', 'training', 'Lernwarteschlange', '#training .kz-queue'],
  ['.price-stat', 'pfand', null, '.pfand-pricehistory-card'],
  ['#bottles', 'pfand', null, '#kz-pfandsell'],
  ['.clean-stat', 'begging', 'Körperpflege', '#begging .wash-list, #begging .card'],
  ['#energy', 'pfand', null, '#pfand .section-tools'],
  ['#level', 'training', 'Fähigkeiten', '#training .skill-grid'],
  ['.kronkorken-stat', 'kronkorken', null, '#kronkorken .kf-box, #kronkorken h2'],
];
// Pfandlager direkt auf der Pfand-Seite verkaufen (70) – Meldung erscheint in der Karte
function pfandSellCard() {
  const top = document.getElementById('pfanduebersicht');
  if (!top || document.getElementById('kz-pfandsell')) return;
  const c = document.createElement('div'); c.id = 'kz-pfandsell'; c.className = 'card kz-sell-card';
  c.innerHTML = '<b>🍾 Flaschen verkaufen</b><p>Im Pfandlager: <b class="kz-ps-n">0</b> Flaschen · Kurs <b class="kz-ps-p">–</b> pro Flasche</p>' +
    '<div class="kf-row"><input type="number" class="kz-ps-qty" min="1" step="1" placeholder="Anzahl"><button class="ghost kz-ps-some">Verkaufen</button><button class="ghost kz-ps-all">Alle verkaufen</button></div><div class="kz-ps-msg"></div>';
  top.after(c);
  const sell = qty => async () => {
    const box = c.querySelector('.kz-ps-msg');
    const { data, error } = await sb.rpc('sell_bottles', qty ? { qty } : {});
    if (error) { box.innerHTML = '<div class="notice bad">' + esc(error.message) + '</div>'; return; }
    window.kiezRenderProfile?.(data.profile);
    let t = 'Verkauft: ' + data.sold + ' Flaschen zu ' + eur(data.price) + ' – du bekommst ' + eur(data.paid) + '.';
    if (Number(data.lost) > 0) t += ' ' + eur(data.lost) + ' gingen verloren, weil dein Behälter voll war!';
    box.innerHTML = '<div class="notice good">' + esc(t) + '</div>'; syncPfandSell();
  };
  c.querySelector('.kz-ps-some').onclick = () => { const q = Math.floor(Number(c.querySelector('.kz-ps-qty').value)); if (!(q > 0)) { c.querySelector('.kz-ps-msg').innerHTML = '<div class="notice bad">Gib eine Anzahl ein</div>'; return; } sell(q)(); };
  c.querySelector('.kz-ps-all').onclick = () => sell(0)();
  syncPfandSell();
}
function syncPfandSell() {
  const c = document.getElementById('kz-pfandsell'); if (!c) return;
  c.querySelector('.kz-ps-n').textContent = document.getElementById('bottles')?.textContent || '0';
  c.querySelector('.kz-ps-p').textContent = document.getElementById('topprice')?.textContent || '–';
}
setInterval(() => { pfandSellCard(); syncPfandSell(); }, 1500);
const isShown = el => !!el && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
function jumpTo(view, tab, sel) {
  go(view, tab);
  let n = 0;
  const find = () => {
    const el = sel.split(',').map(x => [...document.querySelectorAll(x)].find(isShown)).find(Boolean); // Reihenfolge = Vorrang
    if (!el) { if (++n < 25) setTimeout(find, 120); return; }
    const card = el.matches('input,button,select,label') ? (el.closest('.card,.kf-box') || el) : el;
    const toCard = smooth => window.scrollTo({ top: Math.max(0, card.getBoundingClientRect().top + window.scrollY - 16), behavior: smooth ? 'smooth' : 'auto' });
    toCard(true);
    // Nachladende Bilder oder ein spätes Hochscrollen der Reiter verschieben die Karte – nachkorrigieren
    [700, 1400].forEach(t => setTimeout(() => { const y = card.getBoundingClientRect().top; if (y < 0 || y > 150) toCard(false); }, t));
    card.classList.remove('kz-flash'); void card.offsetWidth; card.classList.add('kz-flash');
    setTimeout(() => card.classList.remove('kz-flash'), 1800);
  };
  setTimeout(find, tab ? 650 : 300);
}
window.kiezJumpTo = jumpTo;
document.addEventListener('click', e => {
  const stat = e.target.closest?.('.stats .stat'); if (!stat) return;
  const hit = HEAD_LINKS.find(([m]) => stat.matches(m) || stat.querySelector(m)); if (!hit) return;
  e.preventDefault(); e.stopImmediatePropagation();
  stat.dataset.kzGo = hit[1];
  jumpTo(hit[1], hit[2], hit[3]);
}, true);
const style10 = document.createElement('style');
style10.textContent = `@keyframes kzflash{0%,100%{box-shadow:0 0 0 0 transparent}25%,70%{box-shadow:0 0 0 4px var(--brass,#c9a45c),0 0 22px 4px rgba(201,164,92,.55)}}
html body:not(#kz1):not(#kz2) .kz-flash{animation:kzflash 1.7s ease-in-out;border-radius:var(--radius,8px)}
html body:not(#kz1):not(#kz2) #kz-pfandsell .kf-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center;margin-top:8px}
html body:not(#kz1):not(#kz2) #kz-pfandsell .kz-ps-qty{width:110px;min-height:40px;font-size:15px}`;
document.head.appendChild(style10);

// ================= S3: Hintergrund pro Hauptbereich, weich überblendet und vorgeladen (74–77) =================
const bgFile = view => (NAV.find(c => c[2].some(x => x[1] === view)) || NAV[0])[1];
const bgLayer = document.createElement('div'); bgLayer.id = 'kz-bg'; bgLayer.innerHTML = '<i></i><i></i>'; document.body.prepend(bgLayer);
let bgNow = '', bgFront = 0;
function setBg(view) {
  const file = bgFile(view); if (file === bgNow) return; bgNow = file;
  const url = '/bilder/' + file + '.webp', img = new Image();
  img.onload = img.onerror = () => {
    if (bgNow !== file) return; // inzwischen schon weitergeklickt
    const next = bgLayer.children[1 - bgFront];
    next.style.backgroundImage = 'url("' + url + '")';
    next.classList.add('on'); bgLayer.children[bgFront].classList.remove('on'); bgFront = 1 - bgFront;
  };
  img.src = url;
}
const bgSync = () => {
  const inGame = !document.getElementById('game')?.classList.contains('hide');
  document.documentElement.classList.toggle('kz-bg-on', inGame);
  if (inGame) setBg(document.querySelector('section.panel.active-view:not(#rumors)')?.id || 'overview');
};
new MutationObserver(bgSync).observe(document.querySelector('.main') || document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
bgSync(); setTimeout(bgSync, 800);
// Alle Bereichsbilder im Leerlauf vorladen, damit beim Wechsel nichts nachlädt (77)
setTimeout(() => (window.requestIdleCallback || setTimeout)(() => NAV.forEach(c => { new Image().src = '/bilder/' + c[1] + '.webp'; })), 2500);
const style11 = document.createElement('style');
style11.textContent = `html.kz-bg-on{background:#0d0c0a !important}
html.kz-bg-on body:not(#kz1):not(#kz2){background:transparent none !important}
html.kz-bg-on body:not(#kz1):not(#kz2) .main:before{background-image:none !important}
#kz-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;display:none;background:#0d0c0a}
html.kz-bg-on #kz-bg{display:block}
#kz-bg i{position:absolute;inset:0;background:center 40% / cover no-repeat;opacity:0;transition:opacity .7s ease}
#kz-bg i.on{opacity:1}
#kz-bg:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#050505b0,transparent 30%,transparent 70%,#050505b0),linear-gradient(0deg,#0d0c0af0,#0d0c0a73 55%,#0d0c0a59)}
@keyframes kzin{from{opacity:.35;transform:translateY(4px)}to{opacity:1;transform:none}}
html body:not(#kz1):not(#kz2) section.panel.active-view{animation:kzin .22s ease-out}
html body:not(#kz1):not(#kz2) .kz-skeleton{min-height:360px;border-radius:var(--radius,8px);background:linear-gradient(100deg,#ffffff08 30%,#ffffff14 50%,#ffffff08 70%) 0 0/300% 100%;animation:kzsk 1.4s linear infinite}
@keyframes kzsk{to{background-position:-300% 0}}
@media (prefers-reduced-motion:reduce){#kz-bg i{transition:none}html body:not(#kz1):not(#kz2) section.panel.active-view,html body:not(#kz1):not(#kz2) .kz-skeleton{animation:none}}`;
document.head.appendChild(style11);

// ================= S4: Keine Emojis als Symbole in Karten, Werten und Knöpfen (66) =================
// Schloss/Haken werden zu einheitlichen Icons, Einheiten zu Wörtern, alle anderen Deko-Emojis fallen weg.
// Spielertexte (Chat, Post, Gästebuch, Profiltext) bleiben unangetastet – nur Titel/Werte/Knöpfe der Oberfläche.
const EMO = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍(?:\p{Extended_Pictographic})|[\u{1F3FB}-\u{1F3FF}])*️?/gu;
const EMO_ICON = { '🔒': 'lock', '✔': 'ok', '✔️': 'ok', '✅': 'ok' };
const EMO_WORD = { '🧢': 'Kronkorken', '⚡': 'Energie', '🛡': 'Schutz', '🛡️': 'Schutz', '⚔': 'Angriff', '⚔️': 'Angriff' };
const EMO_TAGS = 'h1,h2,h3,h4,b,strong,button,small,label,th,em,.cost,.kz-owned,summary,legend,option';
const EMO_SKIP = '#kz-dock,.kf-chat,.kz-chat,.chat-list,#chatlist,.guestbook,.kf-guestbook,.msg-body,.kz-usertext,textarea,input,[contenteditable]';
function deEmojiText(t) {
  const el = t.parentElement; if (!el || !el.matches(EMO_TAGS) || el.closest(EMO_SKIP)) return;
  const v = t.nodeValue; EMO.lastIndex = 0; if (!EMO.test(v)) return; EMO.lastIndex = 0;
  let icon = null;
  // Einheit als Wort nur direkt neben einer Zahl („5 🧢“ → „5 Kronkorken“) und nur, wenn das Wort nicht schon dasteht
  const txt = v.replace(EMO, (e, at) => {
    const k = EMO_ICON[e] || EMO_ICON[e.replace(/️/g, '')]; if (k) { icon = icon || k; return ''; }
    const w = EMO_WORD[e] ?? EMO_WORD[e.replace(/️/g, '')];
    const nearNum = /\d\s*$/.test(v.slice(0, at)) || /^\s*[+-]?\d/.test(v.slice(at + e.length));
    return w && nearNum && !v.includes(w) ? w : '';
  })
    .replace(/\s{2,}/g, ' ');
  const lead = !t.previousSibling || icon ? '' : (/^\s/.test(v) ? ' ' : '');
  const out = lead + txt.replace(/^\s+/, '');
  if (out === v) return;
  if (icon && !(t.previousSibling?.classList?.contains('kz-ico'))) { const i = document.createElement('i'); i.className = 'kz-ico kz-ico-' + icon; i.setAttribute('aria-hidden', 'true'); t.before(i); }
  t.nodeValue = out;
}
function deEmoji(root) {
  if (!root) return;
  if (root.nodeType === 3) return deEmojiText(root);
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const list = [];
  while ((n = w.nextNode())) list.push(n);
  list.forEach(deEmojiText);
}
const emoRoots = ['.main', '.stats'].map(x => document.querySelector(x)).filter(Boolean);
const emoObs = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') deEmojiText(m.target); else m.addedNodes.forEach(deEmoji); } });
emoRoots.forEach(r => { deEmoji(r); emoObs.observe(r, { childList: true, subtree: true, characterData: true }); });
const ICO = {
  lock: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z'/%3E%3C/svg%3E\")",
  ok: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M6.2 13.4 1.5 8.7l1.8-1.8 2.9 2.9 6.5-6.5 1.8 1.8z'/%3E%3C/svg%3E\")",
};
const style12 = document.createElement('style');
style12.textContent = `html body:not(#kz1):not(#kz2) .kz-ico{display:inline-block;width:.95em;height:.95em;margin-right:.35em;vertical-align:-.1em;background:currentColor;font-style:normal;flex:none}
html body:not(#kz1):not(#kz2) .kz-ico-lock{-webkit-mask:${ICO.lock} center/contain no-repeat;mask:${ICO.lock} center/contain no-repeat}
html body:not(#kz1):not(#kz2) .kz-ico-ok{-webkit-mask:${ICO.ok} center/contain no-repeat;mask:${ICO.ok} center/contain no-repeat;color:var(--moss,#6f8a3c)}
html body:not(#kz1):not(#kz2) .kiez-inventory-card div[style*="flex"]{align-items:flex-end !important}
html body:not(#kz1):not(#kz2) .stats .stat:before{filter:grayscale(1) sepia(.9) saturate(1.6) brightness(.62) contrast(1.1)}`;
document.head.appendChild(style12);

// ================= S5: Schnorrplätze – Bonus, Statistik, Leiter (135–140) =================
const pct = f => { const v = Math.round((Number(f) - 1) * 100); return (v >= 0 ? '+' : '−') + Math.abs(v) + ' %'; };
let begSeq = 0;
async function begRefresh() {
  const wrap = document.querySelector('#income .schnorr-spots'); if (!wrap || !window.kiezProfile) return;
  const t = ++begSeq; let o;
  try { o = await rpc('beg_overview'); } catch (e) { return; }
  if (t !== begSeq) return;
  const bx = wrap.querySelector('.kz-beg-bonus');
  if (bx) bx.innerHTML = '<div class="kz-bonus"><div><small>Dein Bonus</small><b>' + pct(o.bonus.total) + '</b></div>'
    + '<div><small>Begleiter</small><b>' + pct(o.bonus.pet) + '</b></div>'
    + '<div><small>Sauberkeit ' + o.cleanliness + ' %</small><b>' + pct(o.bonus.clean) + '</b></div>'
    + '<div><small>Rhetorik Stufe ' + o.speech + '</small><b>' + pct(o.bonus.speech) + '</b></div>'
    + '<div><small>Heute erschnorrt</small><b>' + eur(o.today) + '</b></div></div>';
  let nextMarked = false;
  wrap.querySelectorAll('.card[data-spot]').forEach(card => {
    const st = o.spots[card.dataset.spot], el = card.querySelector('.kz-sp-stat'), need = Number(card.dataset.area || 1);
    const open = o.area_level >= need;
    card.classList.toggle('kz-locked', !open);
    card.classList.toggle('kz-best', !!o.best_spot && o.best_spot === card.dataset.spot);
    const isNext = !open && !nextMarked && need === o.area_level + 1; if (isNext) nextMarked = true;
    card.classList.toggle('kz-next', isNext);
    if (el) el.textContent = !open ? (isNext ? 'Als Nächstes: mit Sammelgebiet ' + need + ' frei' : 'Ab Sammelgebiet ' + need)
      : st ? 'Heute: ' + eur(st.today) + ' in ' + st.times + '× · beste Runde ' + eur(st.best) : 'Heute noch nicht hier gewesen';
  });
}
window.kiezBegRefresh = begRefresh;
const prevIncome = loaders.income;
loaders.income = () => { prevIncome?.(); setTimeout(begRefresh, 200); };
setTimeout(begRefresh, 1500);
const style13 = document.createElement('style');
style13.textContent = `html body:not(#kz1):not(#kz2) #income .kz-lead{margin:0 0 10px;color:var(--muted,#bdb19d);font-size:15px}
html body:not(#kz1):not(#kz2) #income .kz-bonus{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px}
html body:not(#kz1):not(#kz2) #income .kz-bonus>div{background:rgba(0,0,0,.25);border:1px solid var(--line,#5a4a36);border-radius:var(--radius,8px);padding:8px 10px}
html body:not(#kz1):not(#kz2) #income .kz-bonus small{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) #income .kz-bonus b{font-size:18px;color:var(--brass,#d1a94f)}
html body:not(#kz1):not(#kz2) #income .kz-sp-desc{color:var(--muted,#bdb19d);font-size:15px}
html body:not(#kz1):not(#kz2) #income .kz-sp-facts{font-weight:700}
html body:not(#kz1):not(#kz2) #income .kz-sp-stat{font-size:14px;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) #income .kz-sp-bar{margin-top:8px}
html body:not(#kz1):not(#kz2) #income .kz-sp-bar[hidden]{display:none !important}
html body:not(#kz1):not(#kz2) #income .card.kz-locked,html body:not(#kz1):not(#kz2) #income .area-card.locked:not(.kz-cur){filter:grayscale(.85);opacity:.6}
html body:not(#kz1):not(#kz2) #income .card.kz-next{filter:none;opacity:1;box-shadow:0 0 0 2px var(--brass,#d1a94f) !important}
html body:not(#kz1):not(#kz2) #income .area-card.kz-cur{box-shadow:0 0 0 2px var(--moss,#6f8a3c) !important}
html body:not(#kz1):not(#kz2) #income .card.kz-best>b:after{content:'Bester Platz';margin-left:8px;padding:1px 8px;border-radius:10px;background:var(--brass,#d1a94f);color:#241b10;font-size:12px;vertical-align:2px}
html body:not(#kz1):not(#kz2) .kz-soon .progress{margin:6px 0 10px}`;
document.head.appendChild(style13);

// Zuletzt geöffnete neue Seite wiederherstellen
try { const last = localStorage.getItem('kiez_last_view'); if (loaders[last]) setTimeout(() => show(last), 1500); } catch (e) { }
if (window.kiezProfile) window.kiezOnProfile(window.kiezProfile);
