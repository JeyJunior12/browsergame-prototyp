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
  sec.innerHTML = '<h2>' + title + '</h2><div class="inside"><div class="kf-body">Lade …</div></div>';
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
loaders.profil = async () => {
  const me = await myId(); if (!me) return;
  const id = profileTarget || me, own = id === me;
  const [pr, gm, gb, fr, bl] = await Promise.all([
    sb.from('profiles').select('id,username,level,xp,wins,losses,bio,motto,created_at,equipped_plunder,donations_received,donation_money,pet_wins,is_banned,avatar').eq('id', id).maybeSingle(),
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
  const f = (fr.data || [])[0], blocked = (bl.data || []).length > 0;
  const av = p.avatar && /^data:image\/(jpeg|png|webp);base64,/.test(p.avatar) ? '<div style="float:right;width:84px;height:84px;margin:0 0 8px 10px;border:3px solid #756346;background:#11110f center/cover;background-image:url(\'' + p.avatar + '\')"></div>' : '';
  let h = '<div class="kf-box">' + av + '<h3>' + esc(p.username) + (p.is_banned ? ' <span class="kf-muted">(gesperrt)</span>' : '') + '</h3>'
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
    btn('✉ Nachricht', async () => { show('messages'); setTimeout(() => { const s = $('#msgto'); if (s) s.value = id; $('#msgbody')?.focus(); }, 300); });
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
  plunderBody.querySelectorAll('.peq').forEach(b => act(b, box, async () => { window.kiezRenderProfile?.(await rpc('equip_plunder', { wanted: b.dataset.id })); loaders.plunder(); }));
  plunderBody.querySelectorAll('.pun').forEach(b => act(b, box, async () => { window.kiezRenderProfile?.(await rpc('equip_plunder', { wanted: null })); loaders.plunder(); }));
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
window.kiezLoadGang = async () => {
  const el = document.getElementById('kiezgang'); if (!el) return;
  const me = await myId(); if (!me) return;
  try { await rpc('resolve_gang_wars'); } catch (e) { /* nicht kritisch */ }
  const mine = (await sb.from('gang_members').select('*').eq('user_id', me).maybeSingle()).data;
  if (gangView && (!mine || gangView !== mine.gang_id)) return renderGangPublic(el, gangView, mine);
  gangView = null;
  if (!mine) return renderNoGang(el, me);
  return renderMyGang(el, me, mine);
};
async function gangMembers(gid) {
  const { data } = await sb.from('gang_members').select('user_id,role,joined_at').eq('gang_id', gid);
  const ids = (data || []).map(m => m.user_id);
  const pr = ids.length ? (await sb.from('profiles').select('id,username,level,xp').in('id', ids)).data || [] : [];
  const byId = Object.fromEntries(pr.map(p => [p.id, p]));
  (data || []).forEach(m => m.profiles = byId[m.user_id]);
  return (data || []).sort((a, b) => RANK[b.role] - RANK[a.role] || (b.profiles?.xp || 0) - (a.profiles?.xp || 0));
}
async function renderGangPublic(el, gid, mine) {
  const g = (await sb.from('gangs').select('*').eq('id', gid).maybeSingle()).data;
  if (!g) { gangView = null; return window.kiezLoadGang(); }
  const mem = await gangMembers(gid);
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
async function renderNoGang(el, me) {
  const [gangs, mem, req] = await Promise.all([sb.from('gangs').select('*').order('name'), sb.from('gang_members').select('gang_id'), sb.from('gang_requests').select('*').eq('user_id', me)]);
  const count = {}; (mem.data || []).forEach(m => count[m.gang_id] = (count[m.gang_id] || 0) + 1);
  const gn = Object.fromEntries((gangs.data || []).map(x => [x.id, x.name]));
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
async function renderMyGang(el, me, mine) {
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
const NKIND = { kampf: '👊', tierkampf: '🐾', freund: '🤝', gaestebuch: '📖', bande: '👥', wettbewerb: '🏆', werben: '📣', lotto: '🎰', erfolg: '🎖' };
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
      if (body && window.kiezProfile && body.textContent.trim() === 'Lade …') setTimeout(() => loaders[k](), 1500);
    } catch (e) {
      if (body) { body.innerHTML = '<div class="notice bad">Konnte nicht geladen werden: ' + esc(e.message) + '</div><button class="ghost kf-retry">Nochmal versuchen</button>'; body.querySelector('.kf-retry').onclick = () => loaders[k](); }
    }
    restoreFlash();
  };
});
{ const g = window.kiezLoadGang; window.kiezLoadGang = async (...x) => { await g(...x); restoreFlash(); }; }
// Zuletzt geöffnete neue Seite wiederherstellen
try { const last = localStorage.getItem('kiez_last_view'); if (loaders[last]) setTimeout(() => show(last), 1500); } catch (e) { }
if (window.kiezProfile) window.kiezOnProfile(window.kiezProfile);
