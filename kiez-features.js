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
// Pfandlager-Größe je Stufe (0038)
const STORE_CAP = [250, 1000, 5000, 20000, 80000], STORE_PRICE = [15, 150, 1200, 8000];
const fmtN = n => Number(n).toLocaleString('de-DE');
function restoreFlash() {
  if (!flash || Date.now() - flash.t > 8000) return;
  const el = document.querySelector('section.panel.active-view .' + flash.cls.split(' ')[0]);
  if (el && !el.innerHTML) say(el, flash.text, flash.good);
}
function act(btn, box, fn) {
  btn.onclick = async () => {
    btn.disabled = true; flash = null;  // alte Meldung nicht nach dem Neuzeichnen wieder hervorholen (Nutzer: „Gekauft“ tauchte beim Einstellen auf)
    try { const t = await fn(); if (t) { say(box, t, true); if (box?.className) flash = { cls: box.className, text: t, good: true, t: Date.now() }; } }
    catch (e) { say(box, esc(e.message) + hintFor(e.message), false); }
    btn.disabled = false;
  };
}
// Fehlermeldung → passender Weg (Durchspiel-Test 169: „Wasch dich erst“ ohne Hinweis, wohin)
function hintFor(m) {
  const H = [[/wasch dich|sauberkeit/i, 'waschhaus', '', 'Zum Waschhaus'], [/energie/i, 'kronkorken', '', 'Energydrink für Kronkorken'],
    [/kohle|geld|€ in der tasche|so viel hast du nicht/i, 'pfand', 'Pfand sammeln', 'Pfand sammeln'], [/knast/i, 'pfand', 'Verbrechen', 'Zur Kaution'], [/hunger|essen/i, 'store', 'Verbrauchbares', 'Zum Supermarkt']];
  const h = H.find(x => x[0].test(m || '')); return h ? ' <a href="#" class="kz-hint" data-v="' + h[1] + '" data-t="' + h[2] + '">' + h[3] + ' ›</a>' : '';
}
document.addEventListener('click', e => { const a = e.target.closest('a.kz-hint'); if (!a) return; e.preventDefault(); go(a.dataset.v, a.dataset.t || undefined); });
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
  // Nie einen leeren Kasten zeigen (Durchspiel-Test: 7 s leer, weil 5 Abfragen nacheinander liefen)
  if (profBody.dataset.pid !== id || !profBody.querySelector('.kf-box')) { profBody.dataset.pid = id; profBody.innerHTML = '<div class="kf-box kf-muted">Lade Profil …</div>'; }
  const todayP = own ? sb.from('donations').select('id', { count: 'exact', head: true }).eq('target_id', me).eq('donation_day', new Date().toISOString().slice(0, 10)) : null;
  const [pr, gm, gb, fr, bl] = await Promise.all([
    sb.from('profiles').select('id,username,title,level,xp,wins,losses,bio,motto,created_at,equipped_plunder,donations_received,donation_money,pet_wins,is_banned,avatar,cleanliness').eq('id', id).maybeSingle(),
    sb.from('gang_members').select('gang_id,role').eq('user_id', id).maybeSingle(),
    sb.from('guestbook_entries').select('id,author_id,body,created_at').eq('owner_id', id).order('created_at', { ascending: false }).limit(30),
    sb.from('friendships').select('*').or('and(user_id.eq.' + me + ',friend_id.eq.' + id + '),and(user_id.eq.' + id + ',friend_id.eq.' + me + ')'),
    sb.from('blocks').select('blocked_id').eq('user_id', me).eq('blocked_id', id)
  ]);
  const p = pr.data;
  if (!p) { profBody.innerHTML = 'Spieler nicht gefunden.'; return; }
  const [gang, plu, authors, today] = await Promise.all([
    gm.data ? sb.from('gangs').select('name').eq('id', gm.data.gang_id).maybeSingle() : null,
    p.equipped_plunder ? sb.from('plunder_catalog').select('name').eq('id', p.equipped_plunder).maybeSingle() : null,
    names((gb.data || []).map(e => e.author_id)), todayP]);
  if (gm.data) gm.data.gangs = gang?.data;
  const plunderName = plu?.data?.name || null;
  if (t !== profSeq) return;
  const f = (fr.data || [])[0], blocked = (bl.data || []).length > 0;
  const av = p.avatar && /^data:image\/(jpeg|png|webp);base64,/.test(p.avatar) ? '<div style="float:right;width:84px;height:84px;margin:0 0 8px 10px;border:3px solid #756346;background:#11110f center/cover;background-image:url(\'' + p.avatar + '\')"></div>' : '';
  let h = '<div class="kf-box">' + av + '<h3>' + esc(p.username) + (p.is_banned ? ' <span class="kf-muted">(gesperrt)</span>' : '') + '</h3>' + (p.title ? '<p class="kf-title">„' + esc(p.title) + '“</p>' : '')
    + (p.motto ? '<p><i>„' + esc(p.motto) + '“</i></p>' : '')
    + '<table class="kf-table"><tr><td>Level</td><td>' + p.level + '</td><td>Punkte</td><td>' + p.xp + '</td></tr>'
    + '<tr><td>Siege / Niederlagen</td><td>' + p.wins + ' / ' + p.losses + '</td><td>Tierkampf-Siege</td><td>' + p.pet_wins + '</td></tr>'
    + '<tr><td>Bande</td><td>' + (gm.data ? esc(gm.data.gangs?.name) + ' (' + ROLE[gm.data.role] + ')' : '–') + '</td><td>Plunder</td><td>' + esc(plunderName || '–') + '</td></tr>'
    + '<tr><td>Im Kiez seit</td><td>' + new Date(p.created_at).toLocaleDateString('de-DE') + '</td><td>Spenden erhalten</td><td>' + p.donations_received + '</td></tr>'
    + '<tr><td>Aussehen</td><td>' + ({ gepflegt: 'Gepflegt', normal: 'Normal', schmuddelig: 'Schmuddelig', verwahrlost: 'Verwahrlost' })[window.kiezTierOf ? window.kiezTierOf(p.cleanliness ?? 100) : 'normal'] + '</td><td></td><td></td></tr></table>'
    + '<p class="kf-bio">' + (p.bio ? esc(p.bio) : '<span class="kf-muted">Noch keine Beschreibung.</span>') + '</p><div class="kf-row pact"></div><div class="pmsg"></div></div>';
  if (own) {
    const link = location.origin + '/?spende=' + encodeURIComponent(p.username);
    h += '<div class="kf-box"><h3>💰 Dein Spendenlink</h3><p>Teile den Link: Jeder Besucher kann dir einmal am Tag ein paar Cent spenden – auch ohne Konto.</p>'
      + '<div class="kf-row"><input class="slink" readonly value="' + esc(link) + '" style="flex:1;min-width:200px"><button class="ghost scopy">Kopieren</button></div>'
      + '<p class="kf-muted">Heute: ' + (today?.count || 0) + ' / 100 Spenden · Insgesamt ' + p.donations_received + ' Spenden, ' + eur(p.donation_money) + '</p></div>'
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
  let o; try { o = await rpc('plunder_overview'); } catch (e) { plunderBody.innerHTML = '<p class="notice bad">' + esc(e.message) + '</p>'; return; }
  PL.data = o; drawPlunder();
  // „Neu“ bleibt bis zum nächsten Öffnen sichtbar, gilt aber jetzt als angesehen
  if (o.items.some(i => i.new)) setTimeout(() => rpc('plunder_mark_seen').catch(() => {}), 2500);
};
function drawPlunder() {
  const o = PL.data; if (!o) return;
  const eq = o.items.find(i => i.id === o.equipped);
  const mine = o.items.filter(i => i.qty > 0);
  const dup = mine.reduce((a, i) => a + Math.max(0, i.qty - 1), 0), dupEur = mine.reduce((a, i) => a + Math.max(0, i.qty - 1) * Number(i.sell_price), 0);
  const stats = i => [i.attack ? 'Angriff +' + i.attack : '', i.defense ? 'Verteidigung +' + i.defense : '', i.bottle_bonus ? 'Pfand +' + i.bottle_bonus + ' %' : ''].filter(Boolean).join(' · ') || 'Keine Werte';
  const RANK = { gewoehnlich: 1, selten: 2, episch: 3, legendaer: 4 };
  const key = { rar: i => -RANK[i.rarity], att: i => -i.attack, def: i => -i.defense, pfand: i => -i.bottle_bonus }[PL.sort] || (i => -RANK[i.rarity]);
  const list = mine.filter(i => PL.filter === 'alle' || i.rarity === PL.filter).sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name));
  const setOf = id => o.sets.find(s => s.id === id);
  const b = o.bonus;
  plunderBody.innerHTML =
    // ---------- Meine Stücke ----------
    '<div class="kz-p-mine">'
    + '<div class="kf-box kz-p-slot"><h3>Angelegt</h3>' + (eq
      ? '<div class="card kz-rar-' + eq.rarity + '" data-pid="' + eq.id + '"><b>' + esc(eq.name) + '</b><p class="kf-muted">' + RARITY[eq.rarity] + '</p><p>' + stats(eq) + '</p><div class="kf-row"><button class="ghost pun">Ablegen</button><button class="ghost kz-p-swap">Wechseln</button></div></div>'
      : '<p class="kf-muted">Nichts angelegt. Wähl unten ein Stück – es wirkt im Kampf und auf Pfandtouren.</p>')
    + '<p class="kz-p-total">Plunder-Bonus gesamt: <b>Angriff +' + b.attack + ' · Verteidigung +' + b.defense + ' · Pfand +' + b.bottle + ' %</b>'
    + (b.sets.length ? ' <span class="kf-muted">(inkl. Sets: ' + b.sets.map(id => esc(setOf(id)?.name || id)).join(', ') + ')</span>' : '') + '</p></div>'
    + '<div class="kf-row kz-p-tools"><label>Sortieren <select class="kz-p-sort"><option value="rar">Seltenheit</option><option value="att">Angriff</option><option value="def">Verteidigung</option><option value="pfand">Pfand-Bonus</option></select></label>'
    + '<label>Zeigen <select class="kz-p-filter"><option value="alle">Alle</option>' + Object.keys(RANK).map(r => '<option value="' + r + '">' + RARITY[r] + '</option>').join('') + '</select></label>'
    + '<button class="ghost kz-p-dups"' + (dup ? '' : ' disabled') + '>' + (dup ? 'Doppelte verkaufen (' + dup + '× · ' + eur(dupEur) + ')' : 'Keine Doppelten') + '</button></div>'
    + '<div class="kz-p-msg"></div>'
    + (list.length ? '<div class="kf-grid kz-p-list">' + list.map(i => '<div class="card kz-rar-' + i.rarity + (i.id === o.equipped ? ' kz-p-on' : '') + '" data-pid="' + i.id + '">'
        + '<b>' + esc(i.name) + '</b>' + (i.new ? '<span class="kz-new">Neu</span>' : '')
        + '<p class="kf-muted">' + RARITY[i.rarity] + ' · ' + i.qty + '×' + (i.set_id ? ' · Set ' + esc(setOf(i.set_id)?.name || '') : '') + '</p>'
        + '<p>' + stats(i) + '</p><p class="kz-p-cmp" hidden></p>'
        + '<div class="kf-row">' + (i.id === o.equipped ? '<button class="ghost pun">Ablegen</button>' : '<button class="ghost peq" data-id="' + i.id + '">Anlegen</button>')
        + '<button class="ghost psell" data-id="' + i.id + '"' + (i.id === o.equipped && i.qty < 2 ? ' disabled' : '') + '>Verkaufen · ' + eur(i.sell_price) + '</button>'
        + (i.qty > 1 ? '<button class="ghost pmarket" data-id="' + i.id + '" data-price="' + (i.market_price || (Number(i.sell_price) * 2).toFixed(2)) + '">Im Basar anbieten</button>' : '') + '</div></div>').join('') + '</div>'
      : '<p class="kf-muted">' + (mine.length ? 'Kein Stück passt zum Filter.' : 'Noch kein Plunder. Auf Pfandtouren findest du welchen – je länger die Tour, desto öfter.') + '</p>')
    + '</div>'
    // ---------- Sammlung ----------
    + '<div class="kz-p-coll"><div class="kf-box"><h3>Sammlung: ' + o.found + ' von ' + o.total + ' gefunden</h3><div class="progress"><span style="width:' + Math.round(o.found / o.total * 100) + '%"></span></div></div>'
    + '<div class="kz-p-album">' + o.items.map(i => i.qty > 0
      ? '<div class="card kz-rar-' + i.rarity + '" data-pid="' + i.id + '"><b>' + esc(i.name) + '</b><p class="kf-muted">' + RARITY[i.rarity] + '</p><p>' + esc(i.description) + '</p></div>'
      : '<div class="kz-p-unknown kz-rar-' + i.rarity + '" title="Noch nicht gefunden"><span>?</span><small>' + RARITY[i.rarity] + (i.season ? ' · nur ' + ({ winter: 'im Winter', fruehling: 'im Frühling', sommer: 'im Sommer', herbst: 'im Herbst' })[i.season] : '') + '</small></div>').join('') + '</div>'
    + '<h3 class="kz-p-seth">Sets</h3><div class="kf-grid">' + o.sets.map(s => {
      const have = s.pieces.filter(x => x.have).length, done = have === s.pieces.length;
      return '<div class="kf-box kz-p-set' + (done ? ' kz-done' : '') + '"><h3>' + esc(s.name) + ' <small>' + have + '/' + s.pieces.length + '</small></h3><p class="kf-muted">' + esc(s.description) + '</p>'
        + '<ul>' + s.pieces.map(x => '<li class="' + (x.have ? 'kz-have' : '') + '">' + (x.have ? esc(x.name) : '???') + '</li>').join('') + '</ul>'
        + '<p>Bonus: ' + [s.attack ? 'Angriff +' + s.attack : '', s.defense ? 'Verteidigung +' + s.defense : '', s.bottle_bonus ? 'Pfand +' + s.bottle_bonus + ' %' : ''].filter(Boolean).join(' · ') + (done ? ' – <b>aktiv</b>' : '') + '</p></div>';
    }).join('') + '</div></div>';
  // Werte
  const sortSel = plunderBody.querySelector('.kz-p-sort'), filtSel = plunderBody.querySelector('.kz-p-filter');
  sortSel.value = PL.sort; filtSel.value = PL.filter;
  sortSel.onchange = () => { PL.sort = sortSel.value; drawPlunder(); };
  filtSel.onchange = () => { PL.filter = filtSel.value; drawPlunder(); };
  const box = plunderBody.querySelector('.kz-p-msg');
  const done = (txt, wait) => { setTimeout(loaders.plunder, wait || 300); return txt; };
  plunderBody.querySelectorAll('.peq').forEach(bt => act(bt, box, async () => { window.kiezRenderProfile?.(await rpc('equip_plunder', { wanted: bt.dataset.id })); return done('Angelegt – wirkt ab sofort im Kampf und auf Pfandtouren.'); }));
  plunderBody.querySelectorAll('.pun').forEach(bt => act(bt, box, async () => { window.kiezRenderProfile?.(await rpc('equip_plunder', { wanted: null })); return done('Abgelegt.'); }));
  plunderBody.querySelectorAll('.psell').forEach(bt => act(bt, box, async () => { const r = await rpc('sell_plunder', { wanted: bt.dataset.id, qty: 1 }); window.kiezRenderProfile?.(r.profile); return done('Verkauft für ' + eur(r.paid) + (Number(r.lost) > 0 ? ' (Rest passte nicht in den Geldbehälter)' : '') + '.', 800); }));
  const dupBtn = plunderBody.querySelector('.kz-p-dups');
  if (dup) act(dupBtn, box, async () => { const r = await rpc('sell_plunder_duplicates'); window.kiezRenderProfile?.(r.profile); return done(r.sold + ' doppelte Stücke verkauft für ' + eur(r.paid) + (Number(r.lost) > 0 ? ' (Rest passte nicht in den Geldbehälter)' : '') + '.', 800); });
  plunderBody.querySelector('.kz-p-swap')?.addEventListener('click', () => plunderBody.querySelector('.kz-p-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  plunderBody.querySelectorAll('.pmarket').forEach(bt => bt.onclick = () => { window.kiezBasarPrefill = { id: bt.dataset.id, price: bt.dataset.price }; show('basar'); });
  // Vergleich beim Antippen einer Karte (116)
  plunderBody.querySelectorAll('.kz-p-list .card').forEach(card => card.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    const i = o.items.find(x => x.id === card.dataset.pid), cmp = card.querySelector('.kz-p-cmp');
    if (!i || !cmp) return;
    if (!cmp.hidden) { cmp.hidden = true; return; }
    const base = eq || { attack: 0, defense: 0, bottle_bonus: 0 };
    const d = (v, w, lbl, u) => { const x = v - w; return '<span class="' + (x > 0 ? 'kz-up' : x < 0 ? 'kz-down' : '') + '">' + lbl + ' ' + (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x) + (u || '') + '</span>'; };
    cmp.innerHTML = i.id === o.equipped ? 'Das ist dein angelegtes Stück.' : 'Gegen ' + (eq ? esc(eq.name) : 'nichts angelegt') + ': ' + d(i.attack, base.attack, 'Angriff') + ' · ' + d(i.defense, base.defense, 'Verteidigung') + ' · ' + d(i.bottle_bonus, base.bottle_bonus, 'Pfand', ' %');
    cmp.hidden = false;
  }));
  applyPTab();
}
const PL = { data: null, sort: 'rar', filter: 'alle', tab: 'Meine Stücke' };
// Reiter statt einer langen Seite (113)
{
  const sec = document.getElementById('plunder');
  if (sec && !sec.querySelector(':scope > .section-tools')) {
    const t = document.createElement('div'); t.className = 'section-tools';
    t.innerHTML = ['Meine Stücke', 'Sammlung', 'Basteln', 'Lager/Material'].map(x => '<span>' + x + '</span>').join('');
    sec.querySelector(':scope > h2').after(t);
    t.addEventListener('click', e => { const s = e.target.closest('span'); if (!s) return; PL.tab = s.textContent.trim(); applyPTab(); });
  }
}
function applyPTab() {
  const sec = document.getElementById('plunder'); if (!sec) return;
  sec.querySelectorAll(':scope > .section-tools span').forEach(s => s.classList.toggle('subtab-active', s.textContent.trim() === PL.tab));
  const inside = sec.querySelector('.inside'); if (!inside) return;
  const vis = (el, on) => on ? el.style.removeProperty('display') : el.style.setProperty('display', 'none', 'important');
  [...inside.children].forEach(ch => {
    if (ch.id === 'plunderlist') return;
    if (ch.classList.contains('kf-body')) vis(ch, PL.tab === 'Meine Stücke' || PL.tab === 'Sammlung');
    else if (ch.classList.contains('kiez-inventory-card')) vis(ch, PL.tab === 'Lager/Material');
    else vis(ch, PL.tab === 'Basteln');
  });
  const m = plunderBody.querySelector('.kz-p-mine'), c = plunderBody.querySelector('.kz-p-coll');
  if (m) vis(m, PL.tab === 'Meine Stücke'); if (c) vis(c, PL.tab === 'Sammlung');
}
window.kiezPlunderTab = t => { PL.tab = t; applyPTab(); };
new MutationObserver(() => applyPTab()).observe(document.querySelector('#plunder .inside') || document.body, { childList: true });
// Basar: Preisvorschlag aus der Plunderkiste übernehmen (117)
setInterval(() => {
  const pre = window.kiezBasarPrefill; if (!pre) return;
  const sel = document.querySelector('#basar select.msel');
  const price = document.querySelector('#basar .mprice');
  if (!sel || !price || !document.getElementById('basar')?.classList.contains('active-view')) return;
  if ([...sel.options].some(o => o.value === pre.id)) sel.value = pre.id;
  price.value = pre.price; price.scrollIntoView({ block: 'center' }); price.focus();
  window.kiezBasarPrefill = null;
}, 400);
// Öffnen-Moment für die Kronkorken-Plunderkiste (119)
async function openBoxMoment(pid) {
  const { data: it } = await sb.from('plunder_catalog').select('name,rarity,description').eq('id', pid).maybeSingle();
  if (!it) return;
  const ov = document.createElement('div'); ov.className = 'kz-box-ov';
  ov.innerHTML = '<div class="kz-box-card"><div class="kz-box-chest"></div><div class="kz-box-item kz-rar-' + it.rarity + '"><small>' + RARITY[it.rarity] + '</small><b>' + esc(it.name) + '</b><p>' + esc(it.description) + '</p></div><button class="big kz-box-ok">Einpacken</button></div>';
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('kz-go'));
  setTimeout(() => ov.classList.add('kz-open'), 1100);
  const close = () => ov.remove();
  ov.querySelector('.kz-box-ok').onclick = close; ov.addEventListener('click', e => { if (e.target === ov) close(); });
}
window.kiezOpenBox = openBoxMoment;
const style14 = document.createElement('style');
style14.textContent = `html body:not(#kz1):not(#kz2) .kz-rar-gewoehnlich{--rar:#8d8a80}html body:not(#kz1):not(#kz2) .kz-rar-selten{--rar:#4f86c6}html body:not(#kz1):not(#kz2) .kz-rar-episch{--rar:#9b59c9}html body:not(#kz1):not(#kz2) .kz-rar-legendaer{--rar:#e0a53a}
html body:not(#kz1):not(#kz2) #plunder .card[class*="kz-rar-"]{border:2px solid var(--rar) !important}
html body:not(#kz1):not(#kz2) #plunder .card.kz-p-on{box-shadow:0 0 0 2px var(--moss,#6f8a3c),0 0 14px rgba(111,138,60,.45) !important}
html body:not(#kz1):not(#kz2) .kz-new{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:10px;background:var(--rust,#9b3c1f);color:#fff;font-size:12px;font-weight:700;vertical-align:2px}
html body:not(#kz1):not(#kz2) .kz-p-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:10px 0}
html body:not(#kz1):not(#kz2) .kz-p-tools label{display:flex;flex-direction:column;gap:3px;font-size:13px}
html body:not(#kz1):not(#kz2) .kz-p-cmp .kz-up{color:#8fc26a;font-weight:700}html body:not(#kz1):not(#kz2) .kz-p-cmp .kz-down{color:#e0795a;font-weight:700}
html body:not(#kz1):not(#kz2) #plunder .kz-p-list .card{cursor:pointer}
html body:not(#kz1):not(#kz2) .kz-p-album{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:10px 0}
html body:not(#kz1):not(#kz2) .kz-p-album .card{grid-column:span 2}
html body:not(#kz1):not(#kz2) .kz-p-unknown{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px;border:2px dashed var(--rar);border-radius:var(--radius,8px);background:rgba(0,0,0,.35);color:var(--rar)}
html body:not(#kz1):not(#kz2) .kz-p-unknown span{font:700 38px var(--font-head,serif);opacity:.8}
html body:not(#kz1):not(#kz2) .kz-p-unknown small{font-size:12px;text-transform:uppercase;letter-spacing:.04em;text-align:center;padding:0 6px}
html body:not(#kz1):not(#kz2) .kz-p-set ul{margin:6px 0;padding-left:18px}html body:not(#kz1):not(#kz2) .kz-p-set li{color:var(--muted,#bdb19d)}html body:not(#kz1):not(#kz2) .kz-p-set li.kz-have{color:var(--text,#e8e1c9);font-weight:700}
html body:not(#kz1):not(#kz2) .kz-p-set.kz-done{box-shadow:0 0 0 2px var(--brass,#d1a94f) !important}
html body:not(#kz1):not(#kz2) .kz-p-set h3 small{font-size:14px;color:var(--brass,#d1a94f);margin-left:6px}
.kz-box-ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);opacity:0;transition:opacity .25s}
.kz-box-ov.kz-go{opacity:1}
.kz-box-card{position:relative;width:min(360px,90vw);padding:24px;border-radius:12px;background:#231c14;border:1px solid #6b5536;text-align:center;color:#efe3c3;font-family:var(--font-body,sans-serif)}
.kz-box-chest{width:150px;height:110px;margin:0 auto 12px;background:center/cover url('/bilder/kk-plunderkiste.webp');border-radius:10px;animation:kzshake .35s ease-in-out 3}
.kz-box-item{display:none;padding:12px;border-radius:10px;border:2px solid var(--rar,#8d8a80);box-shadow:0 0 28px 6px var(--rar,#8d8a80)}
.kz-box-item small{display:block;text-transform:uppercase;letter-spacing:.06em;font-size:12px;color:var(--rar)}
.kz-box-item b{display:block;font:700 22px var(--font-head,serif);margin:4px 0}
.kz-open .kz-box-chest{display:none}.kz-open .kz-box-item{display:block;animation:kzpop .45s ease-out}
.kz-box-ok{margin-top:14px}
@keyframes kzshake{0%,100%{transform:rotate(0)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
@keyframes kzpop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.kz-rar-gewoehnlich{--rar:#8d8a80}.kz-rar-selten{--rar:#4f86c6}.kz-rar-episch{--rar:#9b59c9}.kz-rar-legendaer{--rar:#e0a53a}
@media (prefers-reduced-motion:reduce){.kz-box-chest,.kz-open .kz-box-item{animation:none}}`;
document.head.appendChild(style14);

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
    if (b.dataset.id === 'plunderkiste' && r.plunder) window.kiezOpenBox?.(r.plunder);
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
let gangNote = null;
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
  act(el.querySelector('.gcreate'), box, async () => { await rpc('create_gang', { gang_name: el.querySelector('.gname').value }); await refreshProfile(); gangNote = { txt: 'Bande gegründet. Du bist jetzt Chef! Unten findest du Bandenkasse, Mitglieder und Chat.', t: Date.now() }; reload(); return 'Bande gegründet. Du bist jetzt Chef!'; });
  el.querySelectorAll('.ginvacc,.gj').forEach(b => act(b, box, async () => { await rpc('join_gang', { wanted_gang: b.dataset.id }); gangNote = { txt: 'Willkommen in der Bande!', t: Date.now() }; reload(); return 'Willkommen in der Bande!'; }));
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
{ const g = window.kiezLoadGang; window.kiezLoadGang = async (...x) => { await g(...x); restoreFlash();
  // Gründen/Beitreten wechselt die ganze Ansicht – Meldung oben in der neuen Ansicht zeigen (Durchspiel-Test 167)
  const el = document.getElementById('kiezgang'); if (el && gangNote && Date.now() - gangNote.t < 15000 && !el.querySelector('.kz-gangnote')) { const n = document.createElement('div'); n.className = 'notice good kz-gangnote'; n.textContent = gangNote.txt; el.prepend(n); } }; }
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
  window.scrollTo(0, 0);  // jede Seite beginnt oben (Nutzerwunsch)
  show(view);
  if (!tab) { setTimeout(() => { const f = document.querySelector('#' + view + ' > .section-tools span'); if (f && !f.classList.contains('subtab-active') && f.offsetParent) f.click(); }, 120); return; }
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
  ['Mein Kiez', 'szene-uebersicht', [['Übersicht', 'overview'], ['Mein Profil', 'profil'], ['Ausrüstung', 'ausruestung'], ['Plunderkiste & Inventar', 'plunder'], ['Kronkorken', 'kronkorken'],
    ['Begleiter', 'pets', 'Meine Begleiter'], ['Unterkunft', 'gear'], ['Karriere', 'career'], ['Erfolge', 'achievements'], ['Kiez-Saison', 'saison'], ['Statistik', 'statistik'], ['Einstellungen', 'einstellungen']]],
  ['Aktionen', 'szene-pfand', [['Pfand sammeln', 'pfand', 'Pfand sammeln'], ['Verbrechen', 'pfand', 'Verbrechen'], ['Schnorren', 'begging'], ['Weiterbildung', 'training'],
    ['Kiez-Geschichte', 'geschichte'], ['Tagesauftrag', 'missions'], ['Nebenjobs', 'nebenjobs'], ['Kiez-Figuren', 'kiezfiguren']]],
  ['Stadt', 'szene-stadt', [['Stadtplan', 'citymap'], ['Stadtteile', 'stadtteile'], ['Kiezladen', 'store'], ['Apotheke', 'apotheke'], ['Schnorrplätze & Musik', 'income'],
    ['Waschhaus', 'waschhaus'], ['Plunder-Basar', 'basar'], ['Zockerbude', 'zockerbude'], ['Glücksspiel & Lotto', 'missions', 'Glücksspiel'], ['Schließfach', 'schliessfach'], ['Auktionshaus', 'auktion'], ['Kiosk', 'kiosk'], ['Kredithai', 'kredithai'], ['Garage', 'garage']]],
  ['Kampf', 'szene-pruegelei', [['Gegner suchen', 'pvp'], ['Kampfprotokoll', 'kampfprotokoll'], ['Begleiter trainieren', 'pets', 'Meine Begleiter']]],
  ['Bande', 'szene-bande', [['Meine Bande', 'gangs'], ['Bandenhaus', 'bandenhaus'], ['Stadtteile erobern', 'stadtteile'], ['Banden-Highscore', 'wettbewerb']]],
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
  ['Tierhandlung', 'pets', 'Tierhandlung', 'stadt-tierhandlung', 90, 370], ['Hinterhof', 'pvp', '', 'szene-pruegelei', 240, 440], ['Waschhaus', 'waschhaus', '', 'stadt-waschhaus', 110, 540],
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
const tabOf = sec => sec ? (sec.dataset.kztab || sec.querySelector(':scope > .section-tools span.subtab-active')?.textContent.trim() || '') : '';
const keyOf = c => { const sec = c?.closest('section.panel'); return { panel: sec?.id, title: titleOfCard(c), tab: tabOf(sec) }; };
const findCard = k => (k?.panel && k.title && tabOf(document.getElementById(k.panel)) === (k.tab || '') && [...document.querySelectorAll('#' + k.panel + ' :is(' + NEAR_CARD + ')')]
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
html body:not(#kz1):not(#kz2) .kz-near { clear: both; margin-top: 12px; grid-column: 1 / -1; flex: 0 0 auto; width: 100%; max-width: none; box-sizing: border-box; }
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
// Knopftext nur schreiben, wenn er sich wirklich ändert – sonst stoßen sich die DOM-Beobachter (Emoji-Ersatz, Bilder, alte Skripte) endlos gegenseitig an
function setLabel(btn, txt) { if (btn.dataset.kzlbl === txt && btn.textContent.includes(txt.replace(/^🔒\s*/, ''))) return; btn.dataset.kzlbl = txt; btn.textContent = txt; }
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
    setLabel(btn, lvl ? '🔒 ab Level ' + it.required_level : poor ? btn.dataset.orig + ' · zu wenig Geld' : btn.dataset.orig);
    card.classList.toggle('kz-locked', lvl);
  });
  const mine = Object.fromEntries(OWN.myPets.map(x => [x.pet_id, x]));
  document.querySelectorAll('.buypet[data-id]').forEach(btn => {
    const pet = OWN.pets?.[btn.dataset.id], card = btn.closest('.card'); if (!pet || !card) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    const m = mine[pet.id];
    if (m) {
      btn.style.setProperty('display', 'none', 'important'); card.classList.add('kz-is-owned');
      // gekauft schlägt gesperrt: kein grauer Kasten, kein „Benötigt Level …“ unter „Im Besitz“ (ROADMAP 159)
      card.classList.remove('kz-locked'); card.style.removeProperty('opacity');
      card.querySelectorAll(':scope > :not(.kz-own)').forEach(e => { if (e.childElementCount === 0 && /Benötigt|Noch gesperrt|Sozialkontakte Stufe|^🔒/.test(e.textContent.trim())) e.classList.add('kz-hide-lock'); });
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
    // wie buy_pet (0033): Spieler-Level und Sozialkontakte bis höchstens Stufe 45
    const needSoc = Math.min(45, pet.required_level), lvlLock = p.level < pet.required_level, lock = lvlLock || p.social_skill < needSoc, poor = Number(p.money) < Number(pet.price);
    btn.disabled = lock || poor;
    setLabel(btn, lvlLock ? '🔒 ab Level ' + pet.required_level : lock ? '🔒 Sozialkontakte Stufe ' + needSoc : poor ? btn.dataset.orig + ' · zu wenig Geld' : btn.dataset.orig);
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
    setLabel(btn, lock ? '🔒 Geschick Stufe ' + need + ' nötig' : poor ? btn.dataset.orig + ' · zu wenig Geld' : btn.dataset.orig);
    if (card.classList.contains('kz-locked') !== !!lock) card.classList.toggle('kz-locked', !!lock);
  });
  document.querySelectorAll('#income .card[data-spot]').forEach(card => {
    const need = Number(card.dataset.area) || 1, btn = card.querySelector('.schnorr-go'); if (!btn) return;
    const lock = (p.area_level || 1) < need;
    if (lock) { btn.disabled = true; btn.dataset.kzlock = '1'; setLabel(btn, '🔒 ab Sammelgebiet ' + need); if (!card.classList.contains('kz-locked')) card.classList.add('kz-locked'); }
    else if (card.classList.contains('kz-locked')) { btn.disabled = false; delete btn.dataset.kzlock; setLabel(btn, 'Hingehen'); card.classList.remove('kz-locked'); }
  });
  // Aktuelles Instrument ist kein gesperrtes – nicht ausgrauen (Nutzer-Screenshot)
  document.querySelectorAll('#income .instrument-card').forEach(c => { const cur = /Aktuelles Instrument/.test(c.textContent); if (c.classList.contains('kz-current') !== cur) c.classList.toggle('kz-current', cur); });
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
  ['.clean-stat', 'waschhaus', null, '#waschhaus .kz-wh-state'],
  ['#energy', 'pfand', null, '#pfand .section-tools'],
  ['#level', 'training', 'Fähigkeiten', '#training .skill-grid'],
  ['.kronkorken-stat', 'kronkorken', null, '#kronkorken .kf-box, #kronkorken h2'],
];
// Pfandlager direkt auf der Pfand-Seite verkaufen (70) – Meldung erscheint in der Karte
function pfandSellCard() {
  const top = document.getElementById('pfanduebersicht');
  if (!top || document.getElementById('kz-pfandsell')) return;
  const c = document.createElement('div'); c.id = 'kz-pfandsell'; c.className = 'card kz-sell-card';
  c.innerHTML = '<b>🍾 Flaschen verkaufen</b><p>Im Pfandlager: <b class="kz-ps-n">0</b> / <span class="kz-ps-cap">250</span> Flaschen · Kurs <b class="kz-ps-p">–</b> pro Flasche</p>' +
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
  { const cap = STORE_CAP[window.kiezProfile?.bottle_storage || 0], cs = c.querySelector('.kz-ps-cap'); if (cs && cs.textContent !== fmtN(cap)) cs.textContent = fmtN(cap); }
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
// Leistung: Alte Skripte schreiben Texte ständig neu (auch unverändert). Jede Schreibung weckt alle DOM-Beobachter,
// der Emoji-Ersatz ändert den Text, das alte Skript schreibt wieder → Endlosschleife (Ruckeln). Deshalb: gleicher Text = nichts tun.
{
  const EMO_RX = /[🔒✅]|✔️?/g, strip = x => String(x ?? '').replace(EMO_RX, '').replace(/\s+/g, ' ').trim();
  const tc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  Object.defineProperty(Node.prototype, 'textContent', { configurable: true, enumerable: tc.enumerable, get() { return tc.get.call(this); },
    set(v) {
      if (this.nodeType === 1) {
        const cur = tc.get.call(this), nv = String(v ?? ''), kids = this.children.length;
        if (!kids && cur === nv) return;
        if (kids && [...this.children].every(c => c.classList.contains('kz-ico')) && strip(cur) === strip(nv)) return;
      }
      tc.set.call(this, v);
    } });
  const ih = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, enumerable: ih.enumerable, get() { return ih.get.call(this); },
    set(v) { const nv = String(v ?? ''); if (nv.length < 3000 && ih.get.call(this) === nv) return; ih.set.call(this, v); } });
}
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
    if (el) el.textContent = !open ? (isNext ? 'Als Nächstes: mit Sammelgebiet ' + need + ' frei' : '')
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
html body:not(#kz1):not(#kz2) #income .card.kz-best>b:after{content:'Dein bester Platz';display:inline-block;white-space:nowrap;margin-left:8px;padding:1px 8px;border-radius:10px;background:var(--brass,#d1a94f);color:#241b10;font-size:12px;vertical-align:2px}
html body:not(#kz1):not(#kz2) .kz-soon .progress{margin:6px 0 10px}`;
document.head.appendChild(style13);

// ================= S7: Körperpflege mit Sinn, Hunger, Sucht (78–85, 24, 25) =================
const TIER_DE = { gepflegt: 'Gepflegt', normal: 'Normal', schmuddelig: 'Schmuddelig', verwahrlost: 'Verwahrlost' };
const tierOf = c => c >= 80 ? 'gepflegt' : c >= 50 ? 'normal' : c >= 20 ? 'schmuddelig' : 'verwahrlost';
window.kiezTierOf = tierOf;
const TIER_ROWS = [
  ['gepflegt', 'ab 80 %', 'Schnorren ×1,2 · Musik ×1,15 · Villenviertel offen'],
  ['normal', '50–79 %', 'Keine Vor- oder Nachteile'],
  ['schmuddelig', '20–49 %', 'Schnorren ×0,6 · Musik ×0,7 · Läden 20 % teurer · Gestank: Verteidigung +2'],
  ['verwahrlost', 'unter 20 %', 'Schnorren ×0,2 · Musik ×0,3 · Supermarkt/Apotheke werfen dich raus · Verteidigung +6 · nach 24 Std. krank'],
];
let bodySeq = 0;
async function drawBody() {
  if (!window.kiezProfile) return;
  const t = ++bodySeq; let b;
  try { b = await rpc('body_status'); } catch (e) { return; }
  if (t !== bodySeq) return;
  window.kiezRenderProfile?.(b.profile);
  const until = d => new Date(d).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  // Karte „Dein Zustand“ ganz oben in der Waschliste (Reiter Körperpflege)
  const list = document.querySelector('#begging .wash-list');
  if (list) {
    let c = list.querySelector('.kz-body'); if (!c) { c = document.createElement('div'); c.className = 'card kz-body'; list.prepend(c); }
    c.innerHTML = '<b>Dein Zustand: ' + TIER_DE[b.tier] + ' (' + b.cleanliness + ' % sauber)</b>'
      + '<table class="kf-table kz-tiers">' + TIER_ROWS.map(r => '<tr class="' + (r[0] === b.tier ? 'kz-now' : '') + '"><td>' + TIER_DE[r[0]] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</table>'
      + '<p class="kf-muted">Sauberkeit sinkt um 1 % pro Stunde' + (b.barber_until ? ' (dank Friseur bis ' + until(b.barber_until) + ' nur halb so schnell)' : '') + ', Kämpfe und Verbrechen kosten je 3 %, Pfandtouren je nach Dauer mehr.</p>'
      + '<div class="kz-meters"><div><small>Hunger</small><div class="progress"><span style="width:' + b.hunger + '%"></span></div><em>' + b.hunger + ' % satt' + (b.hunger < 30 ? ' – Energie kommt nur halb so schnell. Iss was im Supermarkt!' : '') + '</em></div>'
      + '<div><small>Sucht</small><div class="progress kz-bad"><span style="width:' + b.addiction + '%"></span></div><em>' + b.addiction + ' %' + (b.withdrawal ? ' – Entzug: Energie −25 %. Hilfe gibt es in der Apotheke.' : b.addiction >= 20 ? ' – wer tagelang über 2 ‰ bleibt, wird abhängig' : '') + '</em></div></div>'
      + (b.sick_until ? '<p class="notice bad">Du bist krank bis ' + until(b.sick_until) + ' – Energie kommt nur halb so schnell. Die Apotheke hilft.</p>' : '')
      + '<p class="kf-muted">Energie-Tempo gerade: ' + Math.round(b.energy_rate * 100) + ' %</p>';
  }
  // Apotheke: Krankheit heilen, Entzugskur
  const apo = document.querySelector('#apotheke .inside');
  if (apo) {
    let c = apo.querySelector('.kz-apo'); if (!c) { c = document.createElement('div'); c.className = 'card kz-apo'; apo.appendChild(c); }
    const price = (full) => eur(b.insured ? full / 2 : full) + (b.tier === 'schmuddelig' ? ' + 20 %' : '');
    c.innerHTML = '<b>Krankheit & Sucht</b>'
      + '<p>' + (b.sick_until ? 'Du bist krank bis ' + until(b.sick_until) + '.' : 'Du bist gesund.') + ' Sucht: ' + b.addiction + ' %' + (b.withdrawal ? ' (Entzug!)' : '') + '</p>'
      + '<div class="kf-row"><button class="ghost kz-heal"' + (b.sick_until ? '' : ' disabled') + '>Behandeln – ' + price(6) + '</button>'
      + '<button class="ghost kz-detox"' + (b.addiction >= 20 ? '' : ' disabled') + '>Entzugskur – ' + price(12) + '</button></div><div class="kz-apo-msg"></div>';
    const m = c.querySelector('.kz-apo-msg');
    act(c.querySelector('.kz-heal'), m, async () => { const r = await rpc('heal_sickness'); window.kiezRenderProfile?.(r.profile); setTimeout(drawBody, 300); return 'Behandelt für ' + eur(r.price) + ' – du bist wieder gesund.'; });
    act(c.querySelector('.kz-detox'), m, async () => { const r = await rpc('detox'); window.kiezRenderProfile?.(r.profile); setTimeout(drawBody, 300); return 'Entzugskur für ' + eur(r.price) + ' – der Durst ist weg.'; });
  }
  // Supermarkt-Essen: Hunger anzeigen
  document.querySelectorAll('.kf-food').forEach(f => {
    let h = f.querySelector('.kz-hunger'); if (!h) { h = document.createElement('p'); h.className = 'kz-hunger'; f.prepend(h); }
    h.textContent = 'Hunger: ' + b.hunger + ' % satt' + (b.hunger < 30 ? ' – iss was, sonst kommt Energie nur halb so schnell' : '');
  });
}
window.kiezDrawBody = drawBody;
{ const prevBeg = loaders.begging; loaders.begging = () => { prevBeg?.(); setTimeout(drawBody, 300); }; }
{ const prevApo = loaders.apotheke; loaders.apotheke = () => { prevApo?.(); setTimeout(drawBody, 300); }; }
{ const prevStore = loaders.store; loaders.store = () => { prevStore?.(); setTimeout(drawBody, 500); }; }
setTimeout(drawBody, 2500); setInterval(() => { if (!document.hidden && document.querySelector('#begging.active-view, #apotheke.active-view')) drawBody(); }, 60000);
// Gegner sehen die Stufe (82)
async function opponentTiers() {
  const cards = [...document.querySelectorAll('#opponents .card')].filter(c => c.querySelector('.attackplayer') && !c.dataset.kzTier);
  if (!cards.length) return;
  const ids = cards.map(c => c.querySelector('.attackplayer').dataset.id);
  const { data } = await sb.from('profiles').select('id,cleanliness').in('id', ids);
  const by = Object.fromEntries((data || []).map(x => [x.id, x.cleanliness]));
  cards.forEach(c => {
    const cl = by[c.querySelector('.attackplayer').dataset.id]; if (cl == null) return;
    c.dataset.kzTier = '1';
    const p = document.createElement('p'); p.className = 'kz-tiertag kz-t-' + tierOf(cl);
    p.textContent = 'Aussehen: ' + TIER_DE[tierOf(cl)] + (tierOf(cl) === 'verwahrlost' ? ' – stinkt, schwerer zu verprügeln' : tierOf(cl) === 'schmuddelig' ? ' – riecht streng' : '');
    (c.querySelector('p') || c.querySelector('b')).after(p);
  });
}
if (document.getElementById('opponents')) new MutationObserver(() => opponentTiers()).observe(document.getElementById('opponents'), { childList: true });
const style15 = document.createElement('style');
style15.textContent = `html body:not(#kz1):not(#kz2) .wash-list .kz-body{grid-column:1/-1}
html body:not(#kz1):not(#kz2) .wash-list{align-items:start !important}html body:not(#kz1):not(#kz2) .wash-card{display:flex !important;flex-direction:column}html body:not(#kz1):not(#kz2) .wash-card .wash-status{order:20}html body:not(#kz1):not(#kz2) .wash-card .kz-near{order:21}
html body:not(#kz1):not(#kz2) .kz-tiers td{padding:6px 8px;font-size:14px}
html body:not(#kz1):not(#kz2) .kz-tiers tr.kz-now td{background:rgba(209,169,79,.18);font-weight:700}
html body:not(#kz1):not(#kz2) .kz-meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:10px 0}
html body:not(#kz1):not(#kz2) .kz-meters small{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-meters em{display:block;font-style:normal;font-size:14px;margin-top:4px}
html body:not(#kz1):not(#kz2) .progress.kz-bad span{background:var(--rust,#9b3c1f) !important}
html body:not(#kz1):not(#kz2) .kz-tiertag{font-size:14px}
html body:not(#kz1):not(#kz2) .kz-t-gepflegt{color:#9bd17a}html body:not(#kz1):not(#kz2) .kz-t-schmuddelig{color:#e0b35a}html body:not(#kz1):not(#kz2) .kz-t-verwahrlost{color:#e0795a}`;
document.head.appendChild(style15);

// ================= S8: Bandenhaus – Level, Räume, Wochenaufgaben, Krieg & Überfall, Bündnisse (93–98, 11) =================
const houseBody = addPanel('bandenhaus', 'Bandenhaus', 'Bandenhaus');
const ROOMS = {
  kneipe: ['Kneipe', 'Einmal am Tag eine Runde: +10 Energie je Stufe.'],
  training: ['Trainingsraum', 'Weiterbildungen gehen 5 % schneller je Stufe.'],
  zwinger: ['Zwinger', 'Mit Begleiter: Angriff und Verteidigung +2 je Stufe.'],
  werkstatt: ['Werkstatt', 'Einmal am Tag Material zum Basteln (mehr je Stufe).'],
  lager: ['Lager', 'Plunder mit der Bande teilen – 10 Plätze je Stufe.'],
  tresor: ['Tresor', 'Bei Überfällen wird 15 % weniger je Stufe geraubt, dazu +5 Verteidigung.'],
};
const RANKV = { member: 1, officer: 2, co: 3, owner: 4 };
const HOUSE = { tab: 'Übersicht', data: null };
{
  const t = document.createElement('div'); t.className = 'section-tools';
  t.innerHTML = ['Übersicht', 'Räume', 'Wochenaufgaben', 'Krieg & Überfall', 'Bündnisse'].map(x => '<span>' + x + '</span>').join('');
  document.querySelector('#bandenhaus > h2')?.after(t);
  t.addEventListener('click', e => { const s = e.target.closest('span'); if (!s) return; HOUSE.tab = s.textContent.trim(); houseTab(); });
}
function houseTab() {
  document.querySelectorAll('#bandenhaus > .section-tools span').forEach(s => s.classList.toggle('subtab-active', s.textContent.trim() === HOUSE.tab));
  houseBody.querySelectorAll('[data-htab]').forEach(el => el.dataset.htab === HOUSE.tab ? el.style.removeProperty('display') : el.style.setProperty('display', 'none', 'important'));
}
let houseSeq = 0;
loaders.bandenhaus = async () => {
  const t = ++houseSeq; let o;
  try { o = await rpc('gang_house'); } catch (e) { houseBody.innerHTML = '<p class="notice bad">' + esc(e.message) + '</p>'; return; }
  if (t !== houseSeq) return;
  HOUSE.data = o;
  // ohne Bande keine leeren Reiter (ließen eine große Lücke über der Karte)
  { const bt = document.querySelector('#bandenhaus > .section-tools'); if (bt) o.gang ? bt.style.removeProperty('display') : bt.style.setProperty('display', 'none', 'important'); }
  if (!o.gang) { houseBody.innerHTML = '<div class="kf-box"><h3>Kein Bandenhaus</h3><p>Du bist in keiner Bande. Tritt einer bei oder gründe selbst eine – dann gibt es hier Räume, Wochenaufgaben, Kriege und Überfälle.</p><button class="ghost kf-go" data-v="gangs">Zu den Banden</button></div>'; houseBody.querySelector('.kf-go').onclick = () => show('gangs'); return; }
  const g = o.gang, lead = RANKV[o.role] >= 3, officer = RANKV[o.role] >= 2;
  const pctXp = Math.min(100, Math.round((g.xp - g.level_xp) / Math.max(1, g.next_xp - g.level_xp) * 100));
  const when = d => new Date(d).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const others = o.others.map(x => '<option value="' + x.id + '">' + esc(x.name) + ' (Level ' + x.level + ')</option>').join('');
  const TASK = { bottles: ['Flaschen sammeln', ''], wins: ['Kämpfe gewinnen', ''], donate: ['In die Kasse einzahlen', ' €'] };
  const activeWar = o.wars.find(w => !w.resolved), activeRaid = o.raids.find(r => !r.resolved);
  houseBody.innerHTML =
    // Übersicht
    '<div data-htab="Übersicht"><div class="kf-box"><h3>' + esc(g.name) + ' – Bandenlevel ' + g.level + '</h3>'
    + '<div class="progress"><span style="width:' + pctXp + '%"></span></div><p class="kf-muted">' + g.xp + ' Erfahrung' + (g.level < 20 ? ' · ' + (g.next_xp - g.xp) + ' bis Level ' + (g.level + 1) : ' · Höchstlevel') + '</p>'
    + '<table class="kf-table"><tr><td>Mitglieder</td><td>' + g.members + ' von ' + g.slots + ' Plätzen</td></tr><tr><td>Bandenkasse</td><td>' + eur(g.balance) + '</td></tr>'
    + '<tr><td>Ausbau Angriff / Verteidigung</td><td>Stufe ' + g.attack_level + ' / ' + g.defense_level + '</td></tr></table>'
    + '<p class="kf-muted">Erfahrung gibt es für jede gesammelte Flasche (1), jeden Sieg (25), jeden eingezahlten Euro (1), geschaffte Wochenaufgaben (500), gewonnene Kriege (500), Überfälle (200) und eroberte Viertel (1000). Jedes Level bringt 2 Plätze mehr und schaltet größere Räume frei.</p></div></div>'
    // Räume
    + '<div data-htab="Räume"><div class="kf-grid">' + Object.entries(ROOMS).map(([id, [name, desc]]) => {
      const lvl = o.rooms[id] || 0, need = 2 * (lvl + 1) - 1, cost = 100 * (lvl + 1) ** 2;
      const use = id === 'kneipe' && lvl ? '<button class="big kz-pub"' + (o.pub_ready ? '' : ' disabled') + '>' + (o.pub_ready ? 'Runde trinken' : 'Heute schon getrunken') + '</button>'
        : id === 'werkstatt' && lvl ? '<button class="big kz-shop"' + (o.workshop_ready ? '' : ' disabled') + '>' + (o.workshop_ready ? 'Werkstatt nutzen' : 'Heute schon genutzt') + '</button>' : '';
      return '<div class="card kz-room' + (lvl ? '' : ' kz-locked') + '" data-room="' + id + '"><b>' + name + '</b><p class="kf-muted">Stufe ' + lvl + ' von 5</p><p>' + desc + '</p>'
        + (id === 'lager' && lvl ? '<div class="kz-store">' + (o.storage.length ? o.storage.map(s => '<div class="kf-row"><span>' + esc(s.name) + ' ×' + s.qty + '</span><button class="ghost kz-take" data-id="' + s.id + '">Nehmen</button></div>').join('') : '<p class="kf-muted">Das Lager ist leer.</p>')
          + '<div class="kf-row"><select class="kz-putsel" aria-label="Plunder einlagern"></select><button class="ghost kz-put">Einlagern</button></div></div>' : '')
        + '<div class="kf-row">' + use + (lvl < 5 ? '<button class="ghost kz-build" data-room="' + id + '"' + (lead && g.level >= need ? '' : ' disabled') + '>'
          + (g.level < need ? 'Ausbau ab Bandenlevel ' + need : !lead ? 'Ausbau nur Chef/Vize · ' + eur(cost) : 'Ausbauen – ' + eur(cost)) + '</button>' : '<span class="kf-muted">Voll ausgebaut</span>') + '</div>'
        + '<div class="kz-room-msg"></div></div>';
    }).join('') + '</div></div>'
    // Wochenaufgaben
    + '<div data-htab="Wochenaufgaben"><div class="kf-box"><h3>Wochenaufgaben (bis ' + new Date(o.week_ends).toLocaleDateString('de-DE') + ')</h3><p class="kf-muted">Schafft ihr ein Ziel, bekommt jedes Mitglied 5 Kronkorken und 100 Punkte, die Bande 500 Erfahrung.</p>'
    + o.tasks.map(t => '<div class="kz-task' + (t.done ? ' kz-done' : '') + '"><b>' + TASK[t.kind][0] + (t.done ? ' – geschafft' : '') + '</b><div class="progress"><span style="width:' + Math.min(100, Math.round(t.progress / t.target * 100)) + '%"></span></div><small>' + t.progress + TASK[t.kind][1] + ' von ' + t.target + TASK[t.kind][1] + '</small></div>').join('')
    + '</div><div class="kf-box"><h3>Wer hat wie viel beigetragen?</h3>' + (o.contrib.length ? '<table class="kf-table"><tr><th>Spieler</th><th>Flaschen</th><th>Siege</th><th>Eingezahlt</th></tr>' + o.contrib.map(c => '<tr><td>' + playerLink(c.user_id, c.name) + '</td><td>' + c.bottles + '</td><td>' + c.wins + '</td><td>' + eur(c.donated) + '</td></tr>').join('') + '</table>' : '<p class="kf-muted">Diese Woche noch nichts.</p>') + '</div></div>'
    // Krieg & Überfall
    + '<div data-htab="Krieg & Überfall">'
    + (activeRaid ? (() => { const r = activeRaid, mine = r.attacker === g.id; return '<div class="kf-box kz-raid"><h3>' + (mine ? 'Euer Überfall auf ' + esc(r.defender_name) : 'Überfall von ' + esc(r.attacker_name) + '!') + '</h3><p>Endet ' + when(r.ends_at) + ' · Angreifer: ' + r.attackers + ' · Verteidiger: ' + r.defenders + '</p>'
      + '<div class="kf-row"><button class="big kz-joinraid" data-id="' + r.id + '"' + (r.joined ? ' disabled' : '') + '>' + (r.joined ? 'Du bist dabei' : mine ? 'Mitmachen (10 Energie)' : 'Verteidigen (10 Energie)') + '</button></div><div class="kz-raid-msg"></div></div>'; })() : '')
    + (activeWar ? (() => { const w = activeWar, att = w.attacker === g.id; return '<div class="kf-box kz-war"><h3>Krieg: ' + esc(w.attacker_name) + ' ' + w.attacker_score + ' : ' + w.defender_score + ' ' + esc(w.defender_name) + '</h3><p class="kf-muted">Einsatz ' + eur(w.stake) + ' · endet ' + when(w.ends_at) + (w.ceasefire_by && w.ceasefire_by !== g.id ? ' · Die Gegner bieten Waffenruhe an' : w.ceasefire_by === g.id ? ' · Ihr habt Waffenruhe angeboten' : '') + '</p>'
      + (w.days.length ? '<table class="kf-table"><tr><th>Tag</th><th>' + esc(w.attacker_name) + '</th><th>' + esc(w.defender_name) + '</th></tr>' + w.days.map(d => '<tr><td>' + new Date(d.day).toLocaleDateString('de-DE') + '</td><td>' + d.a + '</td><td>' + d.d + '</td></tr>').join('') + '</table>' : '')
      + (lead ? '<div class="kf-row"><button class="ghost kz-cease" data-id="' + w.id + '">' + (w.ceasefire_by && w.ceasefire_by !== g.id ? 'Waffenruhe annehmen' : 'Waffenruhe anbieten') + '</button><button class="ghost kz-surr" data-id="' + w.id + '">Kapitulieren</button></div>' : '')
      + '<div class="kz-war-msg"></div></div>'; })() : '')
    + '<div class="kf-grid">'
    + (officer ? '<div class="kf-box"><h3>Bandenhaus überfallen</h3><p class="kf-muted">15 Minuten: Mitglieder beider Banden können mitmachen. Gewinnt ihr, raubt ihr 10 % der gegnerischen Kasse (Tresor schützt). Kostet 10 Energie.</p><div class="kf-row"><select class="kz-raidsel">' + others + '</select><button class="big kz-raid-go">Überfallen</button></div><div class="kz-raid-msg2"></div></div>' : '')
    + '<div class="kf-box"><h3>Letzte Kriege</h3>' + (o.wars.filter(w => w.resolved).length ? '<table class="kf-table">' + o.wars.filter(w => w.resolved).map(w => '<tr><td>' + esc(w.attacker_name) + ' ' + w.attacker_score + ':' + w.defender_score + ' ' + esc(w.defender_name) + '</td><td>' + (w.winner === g.id ? 'gewonnen' : w.winner ? 'verloren' : 'unentschieden') + ' ' + esc(w.ended_how || '') + (Number(w.loot) ? ' · Beute ' + eur(w.loot) : '') + '</td></tr>').join('') + '</table>' : '<p class="kf-muted">Noch keine.</p>')
    + '<p class="kf-muted">Den Krieg erklärt der Chef oder Vize auf der Bandenseite.</p></div>'
    + '<div class="kf-box"><h3>Kriegs-Rangliste</h3><div class="kz-warrank kf-muted">Lade …</div></div></div></div>'
    // Bündnisse
    + '<div data-htab="Bündnisse"><div class="kf-box"><h3>Verbündete und Feinde</h3><p class="kf-muted">Verbündete können sich nicht bekriegen oder überfallen, und ihre Siege zählen in euren Kriegen mit (höchstens 3). Gegen Banden auf der Feindesliste dürft ihr ohne Wartezeit wieder Krieg erklären.</p>'
    + (o.relations.length ? '<table class="kf-table">' + o.relations.map(r => '<tr><td>' + esc(r.name) + '</td><td>' + (r.kind === 'ally' ? (r.status === 'active' ? 'Verbündet' : r.mine ? 'Bündnis angeboten' : 'möchte sich verbünden') : 'Feind') + '</td><td>'
      + (lead ? (!r.mine && r.status === 'pending' ? '<button class="ghost kz-rel" data-g="' + r.gang + '" data-k="ally">Annehmen</button>' : '<button class="ghost kz-rel" data-g="' + r.gang + '" data-k="none">Beenden</button>') : '') + '</td></tr>').join('') + '</table>' : '<p class="kf-muted">Noch keine.</p>')
    + (lead ? '<div class="kf-row"><select class="kz-relsel">' + others + '</select><button class="ghost kz-rel-ally">Bündnis anbieten</button><button class="ghost kz-rel-enemy">Als Feind markieren</button></div>' : '')
    + '<div class="kz-rel-msg"></div></div></div>';
  houseTab();
  const again = () => setTimeout(loaders.bandenhaus, 400);
  houseBody.querySelectorAll('.kz-build').forEach(b => act(b, b.closest('.card').querySelector('.kz-room-msg'), async () => { const r = await rpc('build_gang_room', { r: b.dataset.room }); again(); return ROOMS[r.room][0] + ' auf Stufe ' + r.level + ' ausgebaut (' + eur(r.cost) + ').'; }));
  const pub = houseBody.querySelector('.kz-pub'); if (pub) act(pub, pub.closest('.card').querySelector('.kz-room-msg'), async () => { const r = await rpc('gang_pub_drink'); window.kiezRenderProfile?.(r.profile); again(); return 'Prost! +' + r.energy + ' Energie.'; });
  const shop = houseBody.querySelector('.kz-shop'); if (shop) act(shop, shop.closest('.card').querySelector('.kz-room-msg'), async () => { const r = await rpc('gang_workshop'); window.kiezRenderProfile?.(r.profile); again(); return 'Gefunden: ' + r.nails + ' Nägel, ' + r.wood + ' Holz, ' + r.textile + ' Textil.'; });
  houseBody.querySelectorAll('.kz-take').forEach(b => act(b, b.closest('.card').querySelector('.kz-room-msg'), async () => { await rpc('gang_take_plunder', { wanted: b.dataset.id }); again(); return 'Genommen – liegt jetzt in deiner Plunderkiste.'; }));
  const putSel = houseBody.querySelector('.kz-putsel');
  if (putSel) {
    const me = await myId(); const [{ data: mine }, { data: cat }] = await Promise.all([sb.from('user_plunder').select('plunder_id,quantity').eq('user_id', me).gt('quantity', 0), sb.from('plunder_catalog').select('id,name')]);
    const nm = Object.fromEntries((cat || []).map(c => [c.id, c.name]));
    putSel.innerHTML = (mine || []).length ? mine.map(x => '<option value="' + x.plunder_id + '">' + esc(nm[x.plunder_id] || x.plunder_id) + ' (' + x.quantity + '×)</option>').join('') : '<option value="">Kein Plunder</option>';
    const put = houseBody.querySelector('.kz-put'); act(put, put.closest('.card').querySelector('.kz-room-msg'), async () => { if (!putSel.value) throw new Error('Du hast keinen Plunder'); await rpc('gang_store_plunder', { wanted: putSel.value }); again(); return 'Eingelagert.'; });
  }
  const jr = houseBody.querySelector('.kz-joinraid'); if (jr && !jr.disabled) act(jr, houseBody.querySelector('.kz-raid-msg'), async () => { const r = await rpc('join_gang_raid', { raid: Number(jr.dataset.id) }); window.kiezRenderProfile?.(r.profile); again(); return (r.side === 'attack' ? 'Du greifst mit ' : 'Du verteidigst mit ') + r.power + ' Kraft mit.'; });
  const rg = houseBody.querySelector('.kz-raid-go'); if (rg) act(rg, houseBody.querySelector('.kz-raid-msg2'), async () => { const s = houseBody.querySelector('.kz-raidsel'); if (!s.value) throw new Error('Keine Bande gewählt'); await rpc('start_gang_raid', { target_gang: s.value }); again(); return 'Überfall läuft – 15 Minuten! Deine Bande wurde benachrichtigt.'; });
  houseBody.querySelectorAll('.kz-cease').forEach(b => act(b, houseBody.querySelector('.kz-war-msg'), async () => { const r = await rpc('gang_war_ceasefire', { war: Number(b.dataset.id) }); again(); return r.status === 'ended' ? 'Waffenruhe – der Krieg ist beendet, Einsatz zurück.' : 'Waffenruhe angeboten.'; }));
  houseBody.querySelectorAll('.kz-surr').forEach(b => act(b, houseBody.querySelector('.kz-war-msg'), async () => { if (!confirm('Wirklich kapitulieren? Die Gegner gewinnen den Krieg.')) return 'Nicht kapituliert.'; await rpc('gang_war_surrender', { war: Number(b.dataset.id) }); again(); return 'Kapituliert.'; }));
  const relMsg = houseBody.querySelector('.kz-rel-msg');
  houseBody.querySelectorAll('.kz-rel').forEach(b => act(b, relMsg, async () => { await rpc('set_gang_relation', { target_gang: b.dataset.g, rel: b.dataset.k }); again(); return b.dataset.k === 'ally' ? 'Bündnis geschlossen.' : 'Beendet.'; }));
  const ra = houseBody.querySelector('.kz-rel-ally'); if (ra) act(ra, relMsg, async () => { const r = await rpc('set_gang_relation', { target_gang: houseBody.querySelector('.kz-relsel').value, rel: 'ally' }); again(); return r.status === 'active' ? 'Bündnis geschlossen.' : 'Bündnis angeboten – die andere Bande muss annehmen.'; });
  const re = houseBody.querySelector('.kz-rel-enemy'); if (re) act(re, relMsg, async () => { await rpc('set_gang_relation', { target_gang: houseBody.querySelector('.kz-relsel').value, rel: 'enemy' }); again(); return 'Auf die Feindesliste gesetzt.'; });
  rpc('gang_war_ranking').then(rk => { const el = houseBody.querySelector('.kz-warrank'); if (el) el.innerHTML = rk.length ? '<table class="kf-table"><tr><th>#</th><th>Bande</th><th>Siege</th><th>Niederlagen</th><th>Beute</th></tr>' + rk.map((x, i) => '<tr><td>' + (i + 1) + '</td><td><a href="#" class="kiez-gang" data-id="' + x.id + '">' + esc(x.name) + '</a></td><td>' + x.wins + '</td><td>' + x.losses + '</td><td>' + eur(x.loot) + '</td></tr>').join('') + '</table>' : 'Noch keine Kriege.'; }).catch(() => {});
};
// Laufender Überfall: Bandenhaus alle 30 s auffrischen
setInterval(() => { if (!document.hidden && HOUSE.tab === 'Krieg & Überfall' && document.getElementById('bandenhaus')?.classList.contains('active-view') && HOUSE.data?.raids?.some(r => !r.resolved)) loaders.bandenhaus(); }, 30000);
const style16 = document.createElement('style');
style16.textContent = `html body:not(#kz1):not(#kz2) .kz-task{margin:10px 0}html body:not(#kz1):not(#kz2) .kz-task small{font-size:13px;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-task.kz-done b{color:#9bd17a}
html body:not(#kz1):not(#kz2) .kz-raid{box-shadow:0 0 0 2px var(--rust,#9b3c1f) !important}
html body:not(#kz1):not(#kz2) .kz-store .kf-row{justify-content:space-between;gap:8px;margin:4px 0}
html body:not(#kz1):not(#kz2) .kz-room.kz-locked{opacity:.75}`;
document.head.appendChild(style16);

// ================= S9: Banden II – Forum, Mitglieder, Boss, Saison, Profil & Rechte (99–104, 12, 51) =================
const CREST_SVG = {
  flasche: '<path d="M27 8h10v10l5 8v26H22V26l5-8z"/>',
  faust: '<path d="M18 26h28v14a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12z M18 26v-6h7v6 M25 20v-4h7v10 M32 16v-2h7v12 M39 18h7v8"/>',
  krone: '<path d="M14 44V22l10 9 8-15 8 15 10-9v22z"/>',
  taube: '<path d="M14 36c6-12 20-16 30-10l8-4-4 8c0 10-10 18-24 16l-8 6 2-8c-2-2-4-4-4-8z"/>',
  anker: '<path d="M32 12a4 4 0 1 1 0 8 4 4 0 1 1 0-8zM30 20h4v26h-4zM22 26h20v4H22zM14 36c2 10 10 14 18 14s16-4 18-14l-6 2c-2 6-6 8-12 8s-10-2-12-8z"/>',
  stern: '<path d="M32 10l6 14 15 1-12 10 4 15-13-8-13 8 4-15-12-10 15-1z"/>',
  ratte: '<path d="M14 40c0-10 10-18 22-18 6 0 10 4 12 8l6 2-6 4c-2 6-8 8-14 8H20zM50 44c6 0 8 4 4 8"/>',
  schluessel: '<path d="M22 22a10 10 0 1 1 0 20 10 10 0 1 1 0-20zm8 8h24v4h-4v6h-4v-6h-4v6h-4v-6h-8z"/>',
};
const FRAME = { gold: '#e0b84a', silber: '#c9ccd1', bronze: '#b8743f' };
const crest = (g, size) => '<svg class="kz-crest" width="' + (size || 56) + '" height="' + Math.round((size || 56) * 1.15) + '" viewBox="0 0 64 74" aria-label="Wappen"><path d="M4 4h56v34c0 18-14 28-28 32C18 66 4 56 4 38z" fill="' + esc(g.color || '#9b3c1f') + '" stroke="' + (FRAME[g.frame] || '#241b10') + '" stroke-width="' + (g.frame ? 5 : 3) + '"/><g fill="#f3e6c4" transform="translate(0,4)">' + (CREST_SVG[g.crest] || CREST_SVG.flasche) + '</g></svg>';
window.kiezCrest = crest;
const ROLE_DE = { owner: 'Chef', co: 'Vize', officer: 'Offizier', member: 'Mitglied' };
const RIGHT_DE = { invite: 'Einladen', payout: 'Auszahlen', build: 'Ausbauen', war: 'Krieg erklären', raid: 'Überfall starten', announce: 'Ankündigungen' };
{ const t = document.querySelector('#bandenhaus > .section-tools'); if (t) t.insertAdjacentHTML('beforeend', ['Forum', 'Mitglieder', 'Boss & Saison', 'Einstellungen'].map(x => '<span>' + x + '</span>').join('')); }
const HX = { topic: null };
const baseHouse = loaders.bandenhaus;
loaders.bandenhaus = async () => {
  await baseHouse();
  const o = HOUSE.data; if (!o?.gang) return;
  const g = o.gang, lead = RANKV[o.role] >= 3, owner = o.role === 'owner';
  const [pub, forum, mem, boss, season, rights] = await Promise.all([rpc('gang_public', { gid: g.id }), rpc('gang_forum'), rpc('gang_members_overview'), rpc('gang_boss_status'), rpc('gang_season_ranking'),
    sb.from('gang_rights').select('right_name,min_role').eq('gang_id', g.id)]);
  const rightOf = Object.fromEntries((rights.data || []).map(r => [r.right_name, r.min_role]));
  const defaultRight = { invite: 'officer', raid: 'officer', payout: 'co', build: 'co', war: 'co', announce: 'co' };
  const when = d => new Date(d).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  // Wappen + öffentliche Erfolge in die Übersicht
  const ov = houseBody.querySelector('[data-htab="Übersicht"] .kf-box');
  if (ov) ov.insertAdjacentHTML('afterbegin', '<div class="kz-gang-head">' + crest(pub, 64) + '<div><p class="kz-motto">' + (pub.motto ? '„' + esc(pub.motto) + '“' : '<span class="kf-muted">Noch kein Motto</span>') + '</p><p class="kf-muted">Erfolge: ' + pub.war_wins + ' Kriegssiege · ' + pub.bosses + ' Bosse besiegt · ' + pub.tasks_done + ' Wochenaufgaben · ' + pub.districts + ' Viertel erobert'
    + (pub.frame ? ' · ' + ({ gold: 'Gold', silber: 'Silber', bronze: 'Bronze' })[pub.frame] + '-Rahmen (Saison ' + esc(pub.frame_season) + ')' : '') + '</p><p class="kf-muted">Aufnahme: ' + (pub.is_open ? 'offen' : 'nur mit Einladung/Bewerbung') + ' · ab Level ' + pub.min_level + '</p></div></div>');
  houseBody.insertAdjacentHTML('beforeend',
    // Forum
    '<div data-htab="Forum"><div class="kf-box kz-forum"></div></div>'
    // Mitglieder
    + '<div data-htab="Mitglieder"><div class="kf-box"><h3>Mitglieder (' + mem.members.length + ')</h3>' + (Number(mem.dues) > 0 ? '<p class="kf-muted">Wochenbeitrag: ' + eur(mem.dues) + ' (zählt über Einzahlungen in die Kasse)</p>' : '')
    + '<table class="kf-table kz-members"><tr><th>Name</th><th>Rang</th><th>Level</th><th>Zuletzt</th><th>Woche</th><th></th></tr>' + mem.members.map(m => '<tr class="kz-st-' + m.status + '"><td>' + playerLink(m.user_id, m.name) + '</td><td>' + ROLE_DE[m.role] + '</td><td>' + m.level + '</td><td>' + m.status + '<br><small>' + when(m.last_active) + '</small></td>'
      + '<td><small>' + m.bottles + ' Fl. · ' + m.wins + ' Siege · ' + eur(m.donated) + (Number(mem.dues) > 0 ? (m.dues_paid ? ' · Beitrag bezahlt' : ' · Beitrag offen') : '') + '</small></td>'
      + '<td>' + (m.user_id === window.kiezProfile?.id ? '' : '<button class="ghost kz-poke" data-id="' + m.user_id + '"' + (m.poked ? ' disabled' : '') + '>' + (m.poked ? 'Angestupst' : 'Anstupsen') + '</button>') + '</td></tr>').join('') + '</table><div class="kz-mem-msg"></div></div>'
    + '<div class="kf-box"><h3>Aus der Kasse auszahlen</h3><p class="kf-muted">Kasse: ' + eur(g.balance) + ' · erlaubt ab Rang ' + ROLE_DE[rightOf.payout || defaultRight.payout] + ' · pro Tag höchstens die Hälfte der Kasse. Jede Auszahlung steht mit Grund im Protokoll.</p>'
    + '<div class="kf-row"><select class="kz-paysel">' + mem.members.map(m => '<option value="' + m.user_id + '">' + esc(m.name) + '</option>').join('') + '</select><input class="kz-payamt" type="number" min="0.01" step="0.01" placeholder="Betrag €" style="width:120px"><input class="kz-paywhy" maxlength="120" placeholder="Grund"><button class="ghost kz-pay">Auszahlen</button></div><div class="kz-pay-msg"></div></div></div>'
    // Boss & Saison
    + '<div data-htab="Boss & Saison"><div class="kf-box kz-boss"><h3>Bandenboss der Woche: ' + esc(boss.name) + '</h3><div class="progress kz-bad"><span style="width:' + Math.round(boss.hp / boss.max_hp * 100) + '%"></span></div><p>' + (boss.defeated ? 'Besiegt! Nächste Woche kommt ein neuer.' : boss.hp + ' von ' + boss.max_hp + ' Lebenspunkten') + '</p>'
    + '<p class="kf-muted">Jedes Mitglied darf einmal pro Stunde zuschlagen (10 Energie, Schaden nach Angriffskraft). Ist der Boss erledigt, bekommt jeder, der mitgemacht hat, 10 Kronkorken und 200 Punkte.</p>'
    + '<div class="kf-row"><button class="big kz-hit"' + (boss.defeated || boss.next_hit_at ? ' disabled' : '') + '>' + (boss.defeated ? 'Besiegt' : boss.next_hit_at ? 'Wieder ab ' + when(boss.next_hit_at) : 'Zuschlagen') + '</button></div><div class="kz-boss-msg"></div>'
    + (boss.hits.length ? '<table class="kf-table"><tr><th>Spieler</th><th>Schaden</th><th>Schläge</th></tr>' + boss.hits.map(h => '<tr><td>' + playerLink(h.user_id, h.name) + '</td><td>' + h.damage + '</td><td>' + h.hits + '</td></tr>').join('') + '</table>' : '') + '</div>'
    + '<div class="kf-box"><h3>Banden-Saison ' + esc(season.season) + '</h3><p class="kf-muted">Jede Erfahrung zählt als Saisonpunkt. Am Monatsende: Platz 1–3 bekommen einen Gold-, Silber- oder Bronze-Rahmen fürs Wappen und jedes Mitglied 50/30/15 Kronkorken. Saison endet am ' + new Date(season.ends).toLocaleDateString('de-DE') + '.</p>'
    + (season.ranking.length ? '<table class="kf-table"><tr><th>#</th><th></th><th>Bande</th><th>Punkte</th></tr>' + season.ranking.map((x, i) => '<tr' + (x.id === g.id ? ' class="kz-now"' : '') + '><td>' + (i + 1) + '</td><td>' + crest(x, 26) + '</td><td><a href="#" class="kiez-gang" data-id="' + x.id + '">' + esc(x.name) + '</a></td><td>' + x.points + '</td></tr>').join('') + '</table>' : '<p class="kf-muted">Noch keine Punkte diesen Monat.</p>') + '</div></div>'
    // Einstellungen
    + '<div data-htab="Einstellungen"><div class="kf-box"><h3>Bandenprofil</h3>' + (lead ? '<div class="kz-look"><label>Motto <input class="kz-motto-in" maxlength="80" value="' + esc(pub.motto || '') + '"></label>'
      + '<label>Wappen <select class="kz-crest-in">' + Object.keys(CREST_SVG).map(c => '<option value="' + c + '"' + (c === pub.crest ? ' selected' : '') + '>' + ({ flasche: 'Flasche', faust: 'Faust', krone: 'Krone', taube: 'Taube', anker: 'Anker', stern: 'Stern', ratte: 'Ratte', schluessel: 'Schlüssel' })[c] + '</option>').join('') + '</select></label>'
      + '<label>Farbe <input class="kz-color-in" type="color" value="' + esc(pub.color) + '"></label>'
      + '<label>Mindestlevel <input class="kz-minlvl-in" type="number" min="1" max="150" value="' + pub.min_level + '"></label>'
      + '<label>Wochenbeitrag € <input class="kz-dues-in" type="number" min="0" max="1000" step="0.5" value="' + Number(mem.dues) + '"></label>'
      + '<label class="kz-check"><input class="kz-open-in" type="checkbox"' + (pub.is_open ? ' checked' : '') + '> Jeder darf beitreten</label>'
      + '<div class="kz-preview">' + crest(pub, 56) + '</div></div><div class="kf-row"><button class="big kz-look-save">Speichern</button></div><div class="kz-look-msg"></div>' : '<p class="kf-muted">Das Profil ändern Chef und Vize.</p>') + '</div>'
    + '<div class="kf-box"><h3>Rechte</h3><p class="kf-muted">Welcher Rang darf was? ' + (owner ? 'Nur der Chef kann das ändern.' : '') + '</p><table class="kf-table">' + Object.keys(RIGHT_DE).map(r => '<tr><td>' + RIGHT_DE[r] + '</td><td>' + (owner ? '<select class="kz-right" data-r="' + r + '">' + ['member', 'officer', 'co', 'owner'].filter(x => r !== 'payout' || x === 'co' || x === 'owner').map(x => '<option value="' + x + '"' + (x === (rightOf[r] || defaultRight[r]) ? ' selected' : '') + '>ab ' + ROLE_DE[x] + '</option>').join('') + '</select>' : 'ab ' + ROLE_DE[rightOf[r] || defaultRight[r]]) + '</td></tr>').join('') + '</table><div class="kz-right-msg"></div></div></div>');
  houseTab();
  const again = () => setTimeout(loaders.bandenhaus, 400);
  houseBody.querySelectorAll('.kz-poke').forEach(b => act(b, houseBody.querySelector('.kz-mem-msg'), async () => { await rpc('gang_poke', { target_id: b.dataset.id }); again(); return 'Angestupst – er bekommt eine Nachricht.'; }));
  act(houseBody.querySelector('.kz-pay'), houseBody.querySelector('.kz-pay-msg'), async () => { const r = await rpc('gang_payout', { target_id: houseBody.querySelector('.kz-paysel').value, amount: Number(houseBody.querySelector('.kz-payamt').value), reason: houseBody.querySelector('.kz-paywhy').value }); again(); return eur(r.paid) + ' ausgezahlt.'; });
  const hit = houseBody.querySelector('.kz-hit'); if (hit && !hit.disabled) act(hit, houseBody.querySelector('.kz-boss-msg'), async () => { const r = await rpc('gang_boss_hit'); window.kiezRenderProfile?.(r.profile); again(); return r.defeated ? 'Volltreffer – der Boss ist erledigt! Belohnung für alle, die mitgemacht haben.' : 'Treffer: ' + r.damage + ' Schaden. Noch ' + r.hp + ' Lebenspunkte.'; });
  const save = houseBody.querySelector('.kz-look-save');
  if (save) {
    const q = s => houseBody.querySelector(s);
    const prev = () => { q('.kz-preview').innerHTML = crest({ color: q('.kz-color-in').value, crest: q('.kz-crest-in').value, frame: pub.frame }, 56); };
    q('.kz-crest-in').onchange = prev; q('.kz-color-in').oninput = prev;
    act(save, q('.kz-look-msg'), async () => { await rpc('update_gang_look', { new_motto: q('.kz-motto-in').value, new_crest: q('.kz-crest-in').value, new_color: q('.kz-color-in').value, new_min_level: Number(q('.kz-minlvl-in').value), open_for_all: q('.kz-open-in').checked, dues: Number(q('.kz-dues-in').value) }); again(); return 'Bandenprofil gespeichert.'; });
  }
  houseBody.querySelectorAll('.kz-right').forEach(s => s.onchange = async () => { const box = houseBody.querySelector('.kz-right-msg'); try { await rpc('set_gang_right', { r: s.dataset.r, role_needed: s.value }); say(box, 'Gespeichert: ' + RIGHT_DE[s.dataset.r] + ' ab ' + ROLE_DE[s.value] + '.', true); } catch (e) { say(box, esc(e.message), false); } });
  drawForum(forum);
};
async function drawForum(list) {
  const box = houseBody.querySelector('.kz-forum'); if (!box) return;
  const o = HOUSE.data, lead = RANKV[o.role] >= RANKV[(await sb.from('gang_rights').select('min_role').eq('gang_id', o.gang.id).eq('right_name', 'announce').maybeSingle()).data?.min_role || 'co'];
  if (HX.topic) {
    let t; try { t = await rpc('gang_topic', { topic: HX.topic }); } catch (e) { HX.topic = null; return drawForum(list); }
    const total = (t.votes || []).reduce((a, b) => a + b, 0);
    box.innerHTML = '<p><a href="#" class="kz-back">← Alle Themen</a></p><h3>' + (t.announce ? '<span class="kz-tag">Ankündigung</span> ' : '') + esc(t.title) + '</h3>'
      + (t.options ? '<div class="kz-poll">' + t.options.map((op, i) => '<div class="kz-opt"><button class="ghost kz-vote" data-i="' + (i + 1) + '"' + (t.my_vote === i + 1 ? ' disabled' : '') + '>' + esc(op) + (t.my_vote === i + 1 ? ' (deine Wahl)' : '') + '</button><div class="progress"><span style="width:' + (total ? Math.round(t.votes[i] / total * 100) : 0) + '%"></span></div><small>' + t.votes[i] + ' Stimmen</small></div>').join('') + '</div>' : '')
      + t.posts.map(p => '<div class="kz-post"><b>' + playerLink(p.author_id, p.author) + '</b> <small class="kf-muted">' + new Date(p.created_at).toLocaleString('de-DE') + '</small><p>' + esc(p.body).replace(/\n/g, '<br>') + '</p></div>').join('')
      + '<textarea class="kz-reply" maxlength="2000" placeholder="Antworten …"></textarea><div class="kf-row"><button class="big kz-send">Antworten</button>'
      + (t.author_id === window.kiezProfile?.id || RANKV[o.role] >= 3 ? '<button class="ghost kz-del">Thema löschen</button>' : '') + '</div><div class="kz-forum-msg"></div>';
    box.querySelector('.kz-back').onclick = e => { e.preventDefault(); HX.topic = null; rpc('gang_forum').then(drawForum); };
    const m = box.querySelector('.kz-forum-msg');
    act(box.querySelector('.kz-send'), m, async () => { await rpc('gang_post', { topic: t.id, body: box.querySelector('.kz-reply').value }); drawForum(list); return 'Gesendet.'; });
    box.querySelectorAll('.kz-vote').forEach(b => act(b, m, async () => { await rpc('gang_vote', { topic: t.id, choice: Number(b.dataset.i) }); drawForum(list); return 'Abgestimmt.'; }));
    const del = box.querySelector('.kz-del'); if (del) act(del, m, async () => { if (!confirm('Thema wirklich löschen?')) return; await rpc('gang_topic_delete', { topic: t.id }); HX.topic = null; rpc('gang_forum').then(drawForum); return 'Gelöscht.'; });
    return;
  }
  box.innerHTML = '<h3>Bandenforum</h3>' + (list.length ? '<table class="kf-table kz-topics">' + list.map(t => '<tr><td><a href="#" class="kz-topic" data-id="' + t.id + '">' + (t.announce ? '<span class="kz-tag">Ankündigung</span> ' : '') + (t.poll ? '<span class="kz-tag">Umfrage</span> ' : '') + esc(t.title) + '</a></td><td><small>' + esc(t.author) + ' · ' + t.posts + ' Beiträge · ' + new Date(t.last_post_at).toLocaleDateString('de-DE') + '</small></td></tr>').join('') + '</table>' : '<p class="kf-muted">Noch keine Themen – mach das erste auf.</p>')
    + '<h3>Neues Thema</h3><input class="kz-ttitle" maxlength="80" placeholder="Titel"><textarea class="kz-tbody" maxlength="2000" placeholder="Text"></textarea>'
    + (lead ? '<label class="kz-check"><input type="checkbox" class="kz-tann"> Als Ankündigung oben anheften</label>' : '')
    + '<label class="kz-check"><input type="checkbox" class="kz-tpoll"> Mit Umfrage</label><input class="kz-topts" placeholder="Antworten, mit Komma getrennt (2–6)" hidden>'
    + '<div class="kf-row"><button class="big kz-tnew">Thema eröffnen</button></div><div class="kz-forum-msg"></div>';
  box.querySelectorAll('.kz-topic').forEach(a => a.onclick = e => { e.preventDefault(); HX.topic = Number(a.dataset.id); drawForum(list); });
  box.querySelector('.kz-tpoll').onchange = e => { box.querySelector('.kz-topts').hidden = !e.target.checked; };
  act(box.querySelector('.kz-tnew'), box.querySelector('.kz-forum-msg'), async () => {
    const poll = box.querySelector('.kz-tpoll').checked;
    const r = await rpc('gang_topic_create', { title: box.querySelector('.kz-ttitle').value, body: box.querySelector('.kz-tbody').value, announce: !!box.querySelector('.kz-tann')?.checked, options: poll ? box.querySelector('.kz-topts').value.split(',').map(s => s.trim()).filter(Boolean) : null });
    HX.topic = r.id; drawForum(list); return 'Thema eröffnet.';
  });
}
const style17 = document.createElement('style');
style17.textContent = `html body:not(#kz1):not(#kz2) .kz-gang-head{display:flex;gap:14px;align-items:center;margin-bottom:10px}
html body:not(#kz1):not(#kz2) .kz-crest{flex:none;vertical-align:middle}
html body:not(#kz1):not(#kz2) .kz-motto{font-family:var(--font-head,serif);font-size:18px;margin:0}
html body:not(#kz1):not(#kz2) .kz-members tr.kz-st-inaktiv td{opacity:.55}
html body:not(#kz1):not(#kz2) .kz-members small{font-size:13px}
html body:not(#kz1):not(#kz2) .kz-tag{display:inline-block;padding:1px 8px;border-radius:10px;background:var(--brass,#d1a94f);color:#241b10;font-size:12px;font-weight:700}
html body:not(#kz1):not(#kz2) .kz-post{border-top:1px solid var(--line,#5a4a36);padding:8px 0}
html body:not(#kz1):not(#kz2) .kz-forum textarea,html body:not(#kz1):not(#kz2) .kz-forum input:not([type=checkbox]){width:100%;margin:6px 0}
html body:not(#kz1):not(#kz2) .kz-check{display:flex;gap:8px;align-items:center;margin:6px 0;font-size:15px}
html body:not(#kz1):not(#kz2) .kz-check input{width:auto !important;height:auto !important;min-height:0}
html body:not(#kz1):not(#kz2) .kz-opt{margin:8px 0}
html body:not(#kz1):not(#kz2) .kz-look{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end}
html body:not(#kz1):not(#kz2) .kz-look label{display:flex;flex-direction:column;gap:4px;font-size:14px}
html body:not(#kz1):not(#kz2) .kz-look input[type=color]{padding:2px !important;height:44px}
html body:not(#kz1):not(#kz2) tr.kz-now td{background:rgba(209,169,79,.18)}`;
document.head.appendChild(style17);

// ================= S10: Immer etwas zu tun (1–3, 38–44) =================
const FLASH_DE = { bin: 'Durchwühle eine Mülltonne', beg: 'Geh einmal schnorren', bottles: 'Sammle Flaschen (Tour, Tonne oder Sortieren)', npc: 'Besiege einen Computer-Gegner', crime: 'Beg ein Verbrechen' };
const TASK_DE = { bottles: ['Flaschen sammeln', 'Flaschen'], beg: ['Schnorren', 'mal'], bin: ['Mülltonnen durchwühlen', 'Tonnen'], npc: ['Computer-Gegner besiegen', 'Siege'], crime: ['Verbrechen begehen', 'mal'], wins: ['Einen Kampf gewinnen', 'Sieg'], sort: ['Flaschen sortieren', 'Runde'] };
const mmss = ms => { const s = Math.max(0, Math.round(ms / 1000)); return s >= 3600 ? Math.floor(s / 3600) + ' Std. ' + Math.floor(s % 3600 / 60) + ' Min.' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const cardMsg = (card, html, good) => { let m = card.querySelector('.kz-cmsg'); if (!m) { m = document.createElement('div'); m.className = 'kz-cmsg'; card.appendChild(m); } say(m, html, good); };

// ---------- 44: Leiste „Als Nächstes“ ----------
const NX = { d: null, at: 0, off: 0 };
// Karte „Als Nächstes“ oben in der Übersicht (nicht mehr als Leiste über dem Kopfbild)
const nextBar = document.createElement('div'); nextBar.id = 'kz-next'; nextBar.className = 'kf-box'; nextBar.setAttribute('aria-label', 'Als Nächstes');
async function nextLoad() {
  if (!window.kiezProfile) return;
  try { NX.d = await rpc('next_actions'); NX.off = Date.now() - new Date(NX.d.now).getTime(); NX.at = Date.now(); } catch (e) { return; }
  nextDraw();
}
function nextDraw() {
  const d = NX.d; if (!d) { nextBar.hidden = true; return; }
  // Klein und unaufdringlich: Zeile „Als Nächstes“ im Spielerkasten oben, die Liste klappt nur auf Klick auf
  if (!nextBar.isConnected) document.body.appendChild(nextBar);
  nextSlip();
  nextBar.hidden = !NX.open || document.getElementById('game')?.classList.contains('hide');
  const left = t => t ? new Date(t).getTime() + NX.off - Date.now() : 0;
  // Jede Zeile führt nur zur passenden Seite/Karte – ausgelöst wird dort (Nutzerwunsch: nichts automatisch tun)
  const item = (label, state, to, cls) => '<li class="kz-nx' + (cls ? ' ' + cls : '') + '"' + (to ? ' role="link" tabindex="0" data-go="' + to[0] + '"' + (to[1] ? ' data-tab="' + to[1] + '"' : '') + (to[2] ? ' data-sel="' + to[2] + '"' : '') : '') + '><small>' + label + '</small><b>' + state + '</b>' + (to ? '<span class="kz-nx-arrow" aria-hidden="true">›</span>' : '<span></span>') + '</li>';
  const P = ['pfand', null, '#collectionbox, #pfand .card'], T = ['training'], B = ['pfand', null, '#kz-bin'], SO = ['pfand', null, '#kz-sortgame'], BO = ['pvp', null, '#kz-wboss'], TA = ['missions', 'Tagesauftrag', '.kz-daily'];
  const tour = d.tour_ends_at ? (left(d.tour_ends_at) > 0 ? item('Pfandtour', 'unterwegs · ' + mmss(left(d.tour_ends_at)), P) : item('Pfandtour', 'fertig – ausladen', P, 'kz-ready'))
    : left(d.tour_ready_at) > 0 ? item('Pfandtour', 'Pause · ' + mmss(left(d.tour_ready_at)), P) : item('Pfandtour', 'bereit', P, 'kz-ready');
  const train = d.training_ends_at ? (left(d.training_ends_at) > 0 ? item('Weiterbildung', 'läuft · ' + mmss(left(d.training_ends_at)), T) : item('Weiterbildung', 'fertig', T, 'kz-ready'))
    : item('Weiterbildung', 'frei', T, 'kz-ready');
  const bin = left(d.bin_ready_at) > 0 ? item('Mülltonne', 'wieder in ' + mmss(left(d.bin_ready_at)), B) : item('Mülltonne', 'bereit', B, 'kz-ready');
  const flashLeft = left(d.flash.ends_at);
  const flash = item('Blitzauftrag', d.flash.done ? 'erledigt' : esc(FLASH_DE[d.flash.kind] || d.flash.kind) + ' · noch ' + mmss(flashLeft), null, d.flash.done ? 'kz-done' : 'kz-flashjob');
  const streak = d.streak > 0 ? item('Glückssträhne', d.streak + ' in Folge · noch ' + mmss(left(d.streak_until)), null, 'kz-streak') : '';
  const sort = left(d.sort_ready_at) > 0 ? item('Sortieren', 'wieder in ' + mmss(left(d.sort_ready_at)), SO) : item('Sortieren', 'bereit', SO, 'kz-ready');
  const boss = left(d.boss_ready_at) > 0 ? item('Kiezboss', 'wieder in ' + mmss(left(d.boss_ready_at)), BO) : item('Kiezboss', 'bereit', BO, 'kz-ready');
  const tasks = Number(d.tasks_open) ? item('Tagesaufgaben', d.tasks_open + ' zum Abholen', TA, 'kz-ready') : '';
  const html = '<h3>Als Nächstes</h3><ul class="kz-nx-row">' + tour + train + bin + flash + sort + boss + streak + tasks + '</ul>';
  const ready = (html.match(/kz-ready/g) || []).length;
  if (NX.slipTxt) { const t = (ready ? ready + ' ' : '') + '›'; NX.slip.title = ready ? ready + ' Aktionen bereit' : 'Gerade nichts bereit'; if (NX.slipTxt.textContent !== t) NX.slipTxt.textContent = t; NX.slip.classList.toggle('kz-has-ready', ready > 0); }
  if (!NX.open) return;
  if (html === NX.html) return;
  // Nur die Uhrzeiten geändert → Texte direkt tauschen (weckt keine DOM-Beobachter, kein Ruckeln)
  const shape = x => x.replace(/\d+:\d{2}/g, '#');
  if (NX.html && shape(html) === shape(NX.html)) {
    const tpl = document.createElement('template'); tpl.innerHTML = html;
    const now = tpl.content.querySelectorAll('.kz-nx b'), cur = nextBar.querySelectorAll('.kz-nx b');
    if (now.length === cur.length) { cur.forEach((b, k) => { if (b.firstChild && b.firstChild.nodeType === 3 && b.firstChild.data !== now[k].textContent) b.firstChild.data = now[k].textContent; }); NX.html = html; return; }
  }
  NX.html = html;
  nextBar.innerHTML = html;
  nextBar.querySelectorAll('.kz-nx[data-go]').forEach(li => { const open = () => go(li.dataset.go, li.dataset.tab);  // nur zur Seite, ganz oben (Nutzerwunsch – nicht zur Karte runterspringen)
    li.onclick = open; li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }; });
}
setInterval(() => { if (!document.hidden) nextDraw(); }, 1000);  // zählt „bereit“; die Liste selbst wird nur gezeichnet, wenn sie offen ist
// Zeile im Spielerkasten + Aufklapp-Liste
function nextSlip() {
  const slip = document.querySelector('.player-slip'); if (!slip || slip.querySelector('.slip-next')) return;
  const row = document.createElement('span'); row.className = 'slip-next'; row.setAttribute('role', 'button'); row.tabIndex = 0;
  row.innerHTML = '<b>Als Nächstes</b><i>…</i>';
  (slip.querySelector('.slip-messages') || slip.lastElementChild)?.after(row);
  NX.slip = row; NX.slipTxt = row.querySelector('i');
  const toggle = e => { e?.stopPropagation(); NX.open = !NX.open; NX.html = ''; if (NX.open) { const r = row.getBoundingClientRect(); nextBar.style.top = (r.bottom + window.scrollY + 6) + 'px'; nextBar.style.right = Math.max(8, document.documentElement.clientWidth - r.right) + 'px'; } nextDraw(); };
  row.onclick = toggle; row.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } };
  document.addEventListener('click', e => { if (NX.open && !nextBar.contains(e.target) && !row.contains(e.target)) { NX.open = false; nextBar.hidden = true; } });
  nextBar.addEventListener('click', e => { if (e.target.closest('.kz-nx[data-go]')) { NX.open = false; nextBar.hidden = true; } });
}
setInterval(() => { if (!document.hidden) nextLoad(); }, 30000);
setTimeout(nextLoad, 2000);
window.kiezNextLoad = nextLoad;

// ---------- 38: Mülltonne ----------
const BIN_DE = { flaschen: n => '+' + n + ' Pfandflaschen gefunden.', kronkorken: n => '+' + n + ' Kronkorken gefunden.', geld: n => eur(n) + ' Kleingeld gefunden!', plunder: (n, x) => 'Plunder gefunden: ' + esc(x) + '!', ratte: () => 'Eine Ratte hat dich gebissen! −5 Energie, −5 % Sauberkeit.' };
async function digBin(box) {
  try { const r = await rpc('dig_bin'); window.kiezRenderProfile?.(r.profile); say(box, BIN_DE[r.what](r.amount, r.plunder_name), r.what !== 'ratte'); }
  catch (e) { say(box, esc(e.message), false); }
  nextLoad();
}
// Aktionen-Karten auf der Pfand-Seite: Mülltonne + Sortierspiel
function actionCards() {
  const anchor = document.getElementById('kz-pfandsell'); if (!anchor || document.getElementById('kz-bin')) return;
  const bin = document.createElement('div'); bin.id = 'kz-bin'; bin.className = 'card';
  bin.innerHTML = '<b>Mülltonne durchwühlen</b><p>Alle 3 Minuten: Flaschen, Kronkorken, Kleingeld, mit Glück Plunder – manchmal beißt eine Ratte. Kostet 2 % Sauberkeit.</p><div class="kf-row"><button class="big kz-bin-go">Durchwühlen</button></div><div class="kz-bin-msg"></div>';
  const sg = document.createElement('div'); sg.id = 'kz-sortgame'; sg.className = 'card';
  sg.innerHTML = '<b>Flaschen sortieren</b><p>30 Sekunden: Sortiere Glas, Plastik und Dosen in die richtige Kiste. Jede richtige = 1 Pfandflasche. Alle 20 Minuten.</p><div class="kz-sort-area"></div><div class="kf-row"><button class="big kz-sort-go">Loslegen</button></div><div class="kz-sort-msg"></div>';
  anchor.after(bin, sg);
  bin.querySelector('.kz-bin-go').onclick = async e => { e.target.disabled = true; await digBin(bin.querySelector('.kz-bin-msg')); e.target.disabled = false; };
  sg.querySelector('.kz-sort-go').onclick = () => sortGame(sg);
}
setInterval(actionCards, 1500);

// ---------- 43: Sortierspiel ----------
const SORT_ITEM = { g: 'Glas', p: 'Plastik', d: 'Dose' };
async function sortGame(card) {
  const area = card.querySelector('.kz-sort-area'), msg = card.querySelector('.kz-sort-msg'), btn = card.querySelector('.kz-sort-go');
  let g; try { g = await rpc('sort_game_start'); } catch (e) { say(msg, esc(e.message), false); return; }
  btn.hidden = true; say(msg, '', true); msg.innerHTML = '';
  let i = 0, answers = ''; const end = Date.now() + g.seconds * 1000;
  const draw = () => {
    if (i >= g.items.length || Date.now() > end) return finish();
    area.innerHTML = '<div class="kz-sort-now kz-sort-' + g.items[i] + '">' + SORT_ITEM[g.items[i]] + '<small>' + (i + 1) + ' / ' + g.items.length + ' · noch ' + Math.ceil((end - Date.now()) / 1000) + ' s</small></div>'
      + '<div class="kf-row kz-sort-bins">' + Object.entries(SORT_ITEM).map(([k, v]) => '<button class="ghost kz-sort-bin" data-k="' + k + '">Kiste ' + v + '</button>').join('') + '</div>';
    area.querySelectorAll('.kz-sort-bin').forEach(b => b.onclick = () => { answers += b.dataset.k; i++; draw(); });
  };
  const timer = setInterval(() => { if (Date.now() > end) { clearInterval(timer); finish(); } else { const s = area.querySelector('.kz-sort-now small'); if (s) s.textContent = (i + 1) + ' / ' + g.items.length + ' · noch ' + Math.ceil((end - Date.now()) / 1000) + ' s'; } }, 250);
  let done = false;
  async function finish() {
    if (done) return; done = true; clearInterval(timer); area.innerHTML = '';
    try { const r = await rpc('sort_game_finish', { game: g.id, answers }); window.kiezRenderProfile?.(r.profile); say(msg, r.right + ' von 20 richtig – +' + r.bottles + ' Pfandflaschen.', true); }
    catch (e) { say(msg, esc(e.message), false); }
    btn.hidden = false; nextLoad();
  }
  draw();
}

// ---------- 3: Ereignisse nach der Pfandtour ----------
async function tourEvent() {
  let e; try { e = await rpc('tour_event'); } catch (x) { return; }
  const host = document.getElementById('kz-pfandsell'); if (!e || !host) return;
  let c = document.getElementById('kz-tourevent'); if (!c) { c = document.createElement('div'); c.id = 'kz-tourevent'; c.className = 'card kz-event'; document.getElementById('pfanduebersicht')?.after(c); }
  c.innerHTML = '<b>Unterwegs passiert: ' + ({ hund: 'Ein Hund', polizei: 'Die Polizei', container: 'Ein voller Container' })[e.kind] + '</b><p>' + esc(e.text) + '</p><div class="kf-row">' + e.options.map((o, i) => '<button class="ghost kz-ev" data-i="' + (i + 1) + '">' + esc(o) + '</button>').join('') + '</div><div class="kz-ev-msg"></div>';
  c.scrollIntoView({ behavior: 'smooth', block: 'center' });
  c.querySelectorAll('.kz-ev').forEach(b => b.onclick = async () => {
    c.querySelectorAll('.kz-ev').forEach(x => x.disabled = true);
    try { const r = await rpc('resolve_tour_event', { choice: Number(b.dataset.i) }); window.kiezRenderProfile?.(r.profile); say(c.querySelector('.kz-ev-msg'), esc(r.message), true); setTimeout(() => c.remove(), 8000); }
    catch (x) { say(c.querySelector('.kz-ev-msg'), esc(x.message), false); c.querySelectorAll('.kz-ev').forEach(y => y.disabled = false); }
  });
}
document.addEventListener('click', e => { if (e.target.closest('#finishcollect')) setTimeout(() => { tourEvent(); nextLoad(); }, 1500); if (e.target.closest('#collect')) setTimeout(nextLoad, 1500); });
setTimeout(tourEvent, 3000);

// ---------- 40: seltene Chancen ----------
let chanceOn = null;
async function chancePoll() {
  if (document.hidden || !window.kiezProfile || chanceOn) return;
  let c; try { c = await rpc('chance_poll'); } catch (e) { return; }
  if (!c) return;
  chanceOn = c;
  const t = document.createElement('div'); t.className = 'kz-chance'; t.setAttribute('role', 'alert');
  const end = new Date(c.expires_at).getTime();
  t.innerHTML = '<b>' + esc(c.text) + '</b><p>' + eur(c.amount) + ' – schnell!</p><div class="kf-row"><button class="big kz-ch-go">Aufheben</button><small class="kz-ch-t"></small></div><div class="kz-ch-msg"></div>';
  document.body.appendChild(t);
  const tick = setInterval(() => { const s = Math.ceil((end - Date.now()) / 1000); t.querySelector('.kz-ch-t').textContent = s > 0 ? 'noch ' + s + ' s' : 'weg'; if (s <= -3) close(); }, 250);
  const close = () => { clearInterval(tick); t.remove(); chanceOn = null; };
  t.querySelector('.kz-ch-go').onclick = async () => {
    try { const r = await rpc('chance_claim', { chance: c.id }); window.kiezRenderProfile?.(r.profile); say(t.querySelector('.kz-ch-msg'), 'Eingesteckt: ' + eur(r.amount) + '!', true); }
    catch (e) { say(t.querySelector('.kz-ch-msg'), esc(e.message), false); }
    t.querySelector('.kz-ch-go').disabled = true; setTimeout(close, 3000);
  };
}
setInterval(chancePoll, 120000); setTimeout(chancePoll, 20000);

// ---------- 1: Computer-Gegner + Kiezboss in der Prügelei ----------
let npcLast = null;
async function drawNpc() {
  const pvp = document.querySelector('#pvp .inside'); if (!pvp || !window.kiezProfile) return;
  let box = document.getElementById('kz-npcs'); if (!box) { box = document.createElement('div'); box.id = 'kz-npcs'; pvp.prepend(box); }
  let npcs, boss; try { [npcs, boss] = await Promise.all([rpc('npc_overview'), rpc('world_boss_status')]); } catch (e) { return; }
  const now = Date.now();
  box.innerHTML = '<div class="kf-box" id="kz-wboss"><h3>Kiezboss der Woche: ' + esc(boss.name) + '</h3><div class="progress kz-bad"><span style="width:' + Math.round(boss.hp / boss.max_hp * 100) + '%"></span></div>'
    + '<p>' + (boss.defeated ? 'Besiegt! Nächste Woche kommt ein neuer.' : boss.hp + ' von ' + boss.max_hp + ' Lebenspunkten · ' + boss.fighters + ' Kämpfer · dein Schaden: ' + boss.my_damage) + '</p>'
    + '<p class="kf-muted">Alle im Kiez prügeln gemeinsam – einmal pro Stunde (10 Energie). Fällt er, bekommt jeder, der mitgemacht hat, 5 €, 15 Kronkorken und 150 Punkte.</p>'
    + '<div class="kf-row"><button class="big kz-wb-hit"' + (boss.defeated || boss.next_hit_at ? ' disabled' : '') + '>' + (boss.defeated ? 'Besiegt' : boss.next_hit_at ? 'Wieder ab ' + new Date(boss.next_hit_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Zuschlagen') + '</button></div><div class="kz-wb-msg"></div>'
    + (boss.top.length ? '<p class="kf-muted">Beste Schläger: ' + boss.top.slice(0, 5).map(t => playerLink(t.user_id, t.name) + ' (' + t.damage + ')').join(' · ') + '</p>' : '') + '</div>'
    + '<div class="kf-box"><h3>Computer-Gegner</h3><p class="kf-muted">Immer jemand zum Prügeln da – die Gegner wachsen mit dir. 10 Energie, jeder Gegner alle 10 Minuten.</p><div class="kf-grid">'
    + npcs.map(n => { const wait = n.ready_at && new Date(n.ready_at).getTime() > now; return '<div class="card kz-npc" data-npc="' + n.id + '"><b>' + esc(n.name) + '</b><p class="kf-muted">' + esc(n.description) + '</p><p>Stärke ca. ' + n.power + ' · Beute bis ' + eur(n.loot * 1.2) + ' · ' + n.xp + ' Punkte</p><div class="kf-row"><button class="big kz-npc-go"' + (wait ? ' disabled' : '') + '>' + (wait ? 'Erholt sich bis ' + new Date(n.ready_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Angreifen') + '</button></div><div class="kz-npc-msg"></div></div>'; }).join('') + '</div></div>';
  const hit = box.querySelector('.kz-wb-hit'); if (!hit.disabled) act(hit, box.querySelector('.kz-wb-msg'), async () => { const r = await rpc('world_boss_hit'); window.kiezRenderProfile?.(r.profile); setTimeout(drawNpc, 600); nextLoad(); const t = r.defeated ? 'Volltreffer – der Kiezboss ist erledigt!' : 'Treffer: ' + r.damage + ' Schaden. Nächster Schlag in einer Stunde.'; npcLast = { sel: '.kz-wb-msg', txt: t, good: true, t: Date.now() }; return t; });
  box.querySelectorAll('.kz-npc').forEach(c => { const b = c.querySelector('.kz-npc-go'); if (!b.disabled) act(b, c.querySelector('.kz-npc-msg'), async () => { const r = await rpc('fight_npc', { npc_id: c.dataset.npc }); window.kiezRenderProfile?.(r.profile); setTimeout(drawNpc, 4000); nextLoad(); const sel = '.kz-npc[data-npc="' + c.dataset.npc + '"] .kz-npc-msg'; if (!r.won) { const t = 'Verloren gegen ' + r.npc + ' (' + r.mine + ' zu ' + r.theirs + '). Trainier Angriff und komm wieder.'; npcLast = { sel, txt: esc(t), good: false, t: Date.now() }; throw new Error(t); } const t = 'Gewonnen gegen ' + esc(r.npc) + ' (' + r.mine + ' zu ' + r.theirs + '): +' + eur(r.loot) + ', +' + r.xp + ' Punkte.'; npcLast = { sel, txt: t, good: true, t: Date.now() }; return t; }); });
  // Meldung nach dem Neuzeichnen wieder einsetzen (Durchspiel-Test: Kiezboss-Treffer verschwand ohne Meldung)
  if (npcLast && Date.now() - npcLast.t < 10000) { const m = box.querySelector(npcLast.sel); if (m) say(m, npcLast.txt, npcLast.good); }
}
{ const prevPvp = loaders.pvp; loaders.pvp = () => { prevPvp?.(); setTimeout(drawNpc, 300); }; }

// ---------- 2: Tagesaufgaben im Reiter Tagesauftrag ----------
async function drawDaily() {
  const ins = document.querySelector('#missions .inside'); if (!ins || !window.kiezProfile) return;
  let box = ins.querySelector('.kz-daily'); if (!box) { box = document.createElement('div'); box.className = 'kf-box kz-daily'; ins.prepend(box); }
  let s; try { s = await rpc('daily_tasks_status'); } catch (e) { return; }
  box.innerHTML = '<h3>Heute: 3 Aufgaben</h3><p class="kf-muted">Jede bringt 2 € (bis zur Behältergrenze), 2 Kronkorken und 20 Punkte. 15 geschaffte Aufgaben in einer Woche: +25 Kronkorken (' + s.week_done + '/15' + (s.week_bonus_claimed ? ', abgeholt' : '') + ').</p>'
    + s.tasks.map(t => '<div class="kz-dt' + (t.claimed ? ' kz-done' : '') + '" data-slot="' + t.slot + '"><b>' + (TASK_DE[t.kind] || [t.kind])[0] + '</b><div class="progress"><span style="width:' + Math.round(t.progress / t.target * 100) + '%"></span></div><small>' + t.progress + ' / ' + t.target + ' ' + ((TASK_DE[t.kind] || [])[1] || '') + '</small>'
      + '<div class="kf-row"><button class="ghost kz-dt-go"' + (t.claimed || t.progress < t.target ? ' disabled' : '') + '>' + (t.claimed ? 'Abgeholt' : t.progress < t.target ? 'Noch nicht geschafft' : 'Belohnung abholen') + '</button></div><div class="kz-dt-msg"></div></div>').join('');
  box.querySelectorAll('.kz-dt').forEach(d => { const b = d.querySelector('.kz-dt-go'); if (!b.disabled) act(b, d.querySelector('.kz-dt-msg'), async () => { const r = await rpc('claim_daily_task', { task_slot: Number(d.dataset.slot) }); window.kiezRenderProfile?.(r.profile); setTimeout(drawDaily, 1500); nextLoad(); return 'Abgeholt: 2 €, 2 Kronkorken, 20 Punkte' + (r.week_bonus ? ' – und der Wochenbonus: +25 Kronkorken!' : '') + '.'; }); });
}
{ const prevMis = loaders.missions; loaders.missions = () => { prevMis?.(); setTimeout(drawDaily, 300); }; }

// Kurze Touren (39): 3 und 5 Minuten in der Auswahl
{ const sel = document.getElementById('durationselect');
  if (sel && !sel.querySelector('option[value="3"]')) sel.insertAdjacentHTML('afterbegin', '<option value="3">3 Minuten (kurz)</option><option value="5">5 Minuten (kurz)</option>');
  const hint = document.getElementById('collectionhint'); if (hint && /10 Minuten/.test(hint.textContent)) hint.textContent = 'Wähle 3 Minuten bis 8 Stunden.'; }

const style18 = document.createElement('style');
style18.textContent = `html body:not(#kz1):not(#kz2) #kz-next[hidden]{display:none !important}
html body:not(#kz1):not(#kz2) #kz-next{position:absolute;z-index:2000;width:min(360px,calc(100vw - 16px));margin:0 !important;padding:10px 12px !important;background:linear-gradient(rgba(34,26,19,.98),rgba(28,21,15,.99)),var(--paper-tex,none) center/cover !important;border:1px solid var(--paper-edge,#8a7350) !important;border-radius:8px !important;box-shadow:0 14px 34px rgba(0,0,0,.7) !important}
html body:not(#kz1):not(#kz2) #kz-next h3{font-size:16px !important;margin:0 0 4px !important}
html body:not(#kz1):not(#kz2) .slip-next{display:flex !important;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;padding:4px 3px;border-bottom:1px solid #a18e69;white-space:nowrap}
html body:not(#kz1):not(#kz2) .slip-next b{font-size:12px !important;white-space:nowrap}html body:not(#kz1):not(#kz2) .slip-next i{font-style:normal;font-size:12px !important;color:#e0b25a !important;white-space:nowrap}
html body:not(#kz1):not(#kz2) .slip-next.kz-has-ready i{font-weight:700}
html body:not(#kz1):not(#kz2) .kz-nx-row{list-style:none;margin:4px 0 0;padding:0;display:grid;grid-template-columns:1fr}
html body:not(#kz1):not(#kz2) .kz-nx{display:grid;grid-template-columns:110px 1fr auto;align-items:center;gap:8px;min-height:40px;padding:4px 0;border-top:1px solid rgba(255,255,255,.07)}
html body:not(#kz1):not(#kz2) .kz-nx small{font-size:15px;font-weight:600;color:var(--text,#efe3c3);text-transform:none;letter-spacing:0}
html body:not(#kz1):not(#kz2) .kz-nx b{font-size:15px;font-weight:400;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-nx.kz-ready b{color:var(--brass,#d1a94f);font-weight:600}
html body:not(#kz1):not(#kz2) .kz-nx em{font-style:normal;font-size:13px;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-nx.kz-flashjob small{color:var(--rust-light,#d9774f)}
html body:not(#kz1):not(#kz2) .kz-nx.kz-done{opacity:.6}
html body:not(#kz1):not(#kz2) .kz-nx[data-go]{cursor:pointer;border-radius:6px;padding-left:6px;padding-right:6px}html body:not(#kz1):not(#kz2) .kz-nx[data-go]:hover,html body:not(#kz1):not(#kz2) .kz-nx[data-go]:focus-visible{background:rgba(209,169,79,.12);outline:none}
html body:not(#kz1):not(#kz2) .kz-nx-arrow{font:700 24px var(--font-head,serif);color:var(--brass,#d1a94f);line-height:1}
@media (max-width:640px){html body:not(#kz1):not(#kz2) .kz-nx-row{grid-template-columns:1fr}html body:not(#kz1):not(#kz2) .kz-nx{grid-template-columns:110px 1fr auto}}
html body:not(#kz1):not(#kz2) .kz-nx.kz-streak b{color:var(--brass,#d1a94f)}
html body:not(#kz1):not(#kz2) .kz-nx-msg:empty{display:none}
html body:not(#kz1):not(#kz2) .kz-sort-now{font:700 28px var(--font-head,serif);text-align:center;padding:14px;border-radius:10px;margin:8px 0;background:rgba(0,0,0,.3)}
html body:not(#kz1):not(#kz2) .kz-sort-now small{display:block;font:400 13px var(--font-body,sans-serif);color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-sort-g{color:#8fc26a}html body:not(#kz1):not(#kz2) .kz-sort-p{color:#6fb3e0}html body:not(#kz1):not(#kz2) .kz-sort-d{color:#e0b35a}
html body:not(#kz1):not(#kz2) .kz-sort-bins{justify-content:center;gap:8px}
html body:not(#kz1):not(#kz2) .kz-event{box-shadow:0 0 0 2px var(--brass,#d1a94f) !important}
.kz-chance{position:fixed;left:16px;bottom:16px;z-index:9000;max-width:320px;padding:14px;border-radius:12px;background:#2b2116;border:2px solid #d1a94f;color:#efe3c3;box-shadow:0 8px 30px rgba(0,0,0,.6);animation:kzpop .3s ease-out}
.kz-chance b{font-family:var(--font-head,serif);font-size:17px}.kz-chance small{font-size:13px;margin-left:8px}
html body:not(#kz1):not(#kz2) .kz-dt{margin:10px 0}html body:not(#kz1):not(#kz2) .kz-dt small{font-size:13px;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-dt.kz-done b{color:#9bd17a}
`;
document.head.appendChild(style18);

// ================= S11: Wiederkommen (5, 35, 37, 45–50, 52) =================
const KZT = { happyhour: 'Happy Hour: Getränke halber Preis, Pfand +10 % (19–20 Uhr)', mittag: 'Mittagspause: Schnorren +20 % (12–13 Uhr)', razzia: 'Razzia: Verbrechen deutlich riskanter (22–22:30 Uhr)' };
// ---------- 45/49: Ticker „Gerade im Kiez“ + Kiez-Zeit ----------
let tickerData = null;
async function tickerLoad() {
  if (!window.kiezProfile) return;
  try { tickerData = await rpc('kiez_ticker_feed'); } catch (e) { return; }
  const ov = document.querySelector('#overview'); if (!ov) return;
  let box = document.getElementById('kz-ticker');
  if (!box) { box = document.createElement('div'); box.id = 'kz-ticker'; box.className = 'kf-box'; (ov.querySelector('.inside') || ov).prepend(box); }
  box.innerHTML = '<h3>Gerade im Kiez <small class="kf-muted">' + esc(tickerData.berlin) + ' Uhr</small></h3>'
    + (tickerData.time ? '<p class="kz-kzt">' + KZT[tickerData.time] + '</p>' : '<p class="kf-muted">Kiez-Zeiten: 12–13 Uhr Mittagspause (Schnorren +20 %) · 19–20 Uhr Happy Hour (Getränke ½ Preis, Pfand +10 %) · 22–22:30 Uhr Razzia.</p>')
    + (tickerData.items.length ? '<ul class="kz-ticker">' + tickerData.items.slice(0, 8).map(i => '<li><small>' + new Date(i.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '</small> ' + esc(i.body) + '</li>').join('') + '</ul>' : '<p class="kf-muted">Noch ruhig im Kiez.</p>');
}
setTimeout(tickerLoad, 3000); setInterval(() => { if (!document.hidden) tickerLoad(); }, 60000);
{ const prevOv = loaders.overview; loaders.overview = () => { prevOv?.(); setTimeout(tickerLoad, 300); }; }

// ---------- 37: Ausladen + alles verkaufen mit einem Klick ----------
setInterval(() => {
  const c = document.getElementById('kz-pfandsell'); if (!c || c.querySelector('.kz-quick')) return;
  const row = document.createElement('div'); row.className = 'kf-row';
  row.innerHTML = '<button class="big kz-quick">Ausladen & alles verkaufen</button>';
  c.querySelector('.kz-ps-msg').before(row);
  row.querySelector('.kz-quick').onclick = async e => {
    const b = e.target, m = c.querySelector('.kz-ps-msg'); b.disabled = true;
    try {
      const r = await rpc('quick_unload_sell'); window.kiezRenderProfile?.(r.profile);
      const t = [r.finished ? 'Tour ausgeladen: +' + r.finished.found + ' Flaschen' : '', r.sold ? r.sold.sold + ' Flaschen verkauft für ' + eur(r.sold.paid) : ''].filter(Boolean).join(' · ');
      say(m, esc(t) + ' – in 30 Sekunden kannst du die nächste Tour starten.', true);
      setTimeout(() => { if (typeof tourEvent === 'function') tourEvent(); }, 800);
    } catch (x) { say(m, esc(x.message), false); }
    b.disabled = false; window.kiezNextLoad?.();
  };
}, 1500);

// ---------- 47: Tab-Titel blinkt ----------
const baseTitle = document.title; let blink = null;
setInterval(() => {
  const d = typeof NX !== 'undefined' ? NX.d : null; if (!d) return;
  const ready = [], now = Date.now() - NX.off;
  if (d.tour_ends_at && new Date(d.tour_ends_at).getTime() <= now) ready.push('Tour fertig!');
  if (d.training_ends_at && new Date(d.training_ends_at).getTime() <= now) ready.push('Weiterbildung fertig!');
  if (document.hidden && ready.length) { blink = !blink; document.title = blink ? '(' + ready.length + ') ' + ready[0] : baseTitle; }
  else if (document.title !== baseTitle) document.title = baseTitle;
}, 1500);

// ---------- 5/46: Hinweise (Browser-Benachrichtigung, App installierbar) ----------
let swReg = null;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').then(r => { swReg = r; }).catch(() => {});
const notifyTimers = {};
function notifyAt(key, when, text) {
  clearTimeout(notifyTimers[key]); if (!when || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const ms = new Date(when).getTime() - Date.now(); if (ms <= 0 || ms > 12 * 3600e3) return;
  notifyTimers[key] = setTimeout(() => { const o = { body: text, icon: '/favicon.svg', tag: key }; if (swReg?.showNotification) swReg.showNotification('Kiezkönig', o); else new Notification('Kiezkönig', o); }, ms);
}
setInterval(() => { const d = typeof NX !== 'undefined' ? NX.d : null; if (!d) return; notifyAt('tour', d.tour_ends_at, 'Dein Einkaufswagen ist zurück – Flaschen ausladen!'); notifyAt('train', d.training_ends_at, 'Deine Weiterbildung ist fertig.'); }, 30000);

// ---------- 48/52: Einstellungen – Hinweise, Login-Serie, Mail ----------
function settingsExtra() {
  const body = document.querySelector('#einstellungen .kf-body'); if (!body || !window.kiezProfile || body.querySelector('.kz-notify')) return;
  const p = window.kiezProfile;
  const box = document.createElement('div'); box.className = 'kf-box kz-notify';
  box.innerHTML = '<h3>Hinweise & Wiederkommen</h3><p>Lass dich benachrichtigen, wenn Pfandtour oder Weiterbildung fertig sind (solange der Browser offen ist). Auf dem Handy: im Browsermenü „Zum Startbildschirm hinzufügen“ – dann läuft Kiezkönig wie eine App.</p>'
    + '<div class="kf-row"><button class="ghost kz-np">' + (typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'Hinweise sind an' : 'Hinweise erlauben') + '</button></div>'
    + '<p>Login-Serie: <b>' + (p.login_streak || 0) + ' Tage</b> · Serien-Schutz: <b>' + (p.streak_shields || 0) + '</b> (jeder 7. Tag gibt einen; er rettet die Serie, wenn du einen Tag verpasst).</p>'
    + '<label class="kz-check"><input type="checkbox" class="kz-mail"' + (p.email_digest ? ' checked' : '') + '> E-Mail „Während du weg warst“ (wird verschickt, sobald der Mailversand eingerichtet ist)</label><div class="kz-np-msg"></div>';
  body.appendChild(box);
  const m = box.querySelector('.kz-np-msg');
  box.querySelector('.kz-np').onclick = async () => {
    if (typeof Notification === 'undefined') return say(m, 'Dein Browser kann keine Hinweise anzeigen.', false);
    const r = await Notification.requestPermission();
    say(m, r === 'granted' ? 'Hinweise sind an.' : 'Hinweise wurden nicht erlaubt – das kannst du in den Browsereinstellungen ändern.', r === 'granted');
    box.querySelector('.kz-np').textContent = r === 'granted' ? 'Hinweise sind an' : 'Hinweise erlauben';
  };
  box.querySelector('.kz-mail').onchange = async e => { try { await rpc('set_email_digest', { on_off: e.target.checked }); say(m, e.target.checked ? 'Gemerkt.' : 'Abbestellt.', true); } catch (x) { say(m, esc(x.message), false); } };
}
{ const prevSet = loaders.einstellungen; loaders.einstellungen = async () => { await prevSet?.(); settingsExtra(); }; }

// ---------- 52: „Während du weg warst“ ----------
setTimeout(async () => {
  if (!window.kiezProfile) return;
  let w; try { w = await rpc('welcome_back'); } catch (e) { return; }
  if (!w?.show) return;
  const ov = document.createElement('div'); ov.className = 'kz-box-ov kz-go';
  const items = [w.tour_ready ? 'Dein Einkaufswagen ist zurück.' : '', w.training_ready ? 'Deine Weiterbildung ist fertig.' : '', w.attacks ? w.attacks + '× wurdest du angegriffen' + (w.lost_fights ? ', ' + w.lost_fights + '× verloren' : '') + '.' : '', w.messages ? w.messages + ' neue Nachricht(en).' : '', 'Energie: ' + w.energy + ' / 100'].filter(Boolean);
  ov.innerHTML = '<div class="kz-box-card kz-welcome"><h3>Während du weg warst …</h3><ul>' + items.map(x => '<li>' + esc(x) + '</li>').join('') + (w.notifications || []).slice(0, 5).map(n => '<li>' + esc(n) + '</li>').join('') + '</ul><button class="big kz-box-ok">Los geht’s</button></div>';
  document.body.appendChild(ov);
  ov.querySelector('.kz-box-ok').onclick = () => ov.remove(); ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
}, 4000);

// ---------- 35: Einsteiger-Tutorial ----------
const TUT = [
  null,
  ['Willkommen im Kiez!', 'Starte deine erste Pfandtour: Wähl 3 Minuten und schick den Einkaufswagen los.', 'pfand', null, '#collect', p => !!p.collection_ends_at],
  ['Wagen ausladen', 'Wenn der Wagen zurück ist: „Einkaufswagen ausladen“ – oder unten „Ausladen & alles verkaufen“.', 'pfand', null, '#kz-pfandsell', p => !p.collection_ends_at && (p.bottles > 0 || Number(p.money) > 0)],
  ['Flaschen verkaufen', 'Verkauf deine Flaschen zum aktuellen Kurs – liegen sie länger als einen Tag, werden welche geklaut.', 'pfand', null, '#kz-pfandsell', p => p.bottles === 0],
  ['Weiterbilden', 'Starte eine Weiterbildung. Die läuft auch, wenn du offline bist.', 'training', 'Fähigkeiten', '#training .skill-grid', p => !!p.training_type || !!p.training_ends_at],
  ['Mülltonne', 'Alle 3 Minuten kannst du eine Mülltonne durchwühlen – oben in der Leiste „Als Nächstes“.', 'pfand', null, '#kz-bin', p => !!p.bin_at],
  ['Tagesaufgaben', 'Jeden Tag gibt es 3 neue Aufgaben mit Belohnung. Schau sie dir an!', 'missions', 'Tagesauftrag', '.kz-daily', () => document.getElementById('missions')?.classList.contains('active-view')],
];
async function tutorial() {
  const p = window.kiezProfile; if (!p || (p.tutorial_step ?? 99) >= 99) { document.getElementById('kz-tut')?.remove(); return; }
  let step = Math.max(1, p.tutorial_step || 1);
  // erledigte Schritte automatisch weiterzählen
  while (step < TUT.length && TUT[step][5](p)) step++;
  if (step !== p.tutorial_step) { try { const r = await rpc('tutorial_advance', { step: step >= TUT.length ? 99 : step }); window.kiezRenderProfile?.(r.profile); if (r.reward) say(document.querySelector('#kz-tut .kz-tut-msg') || document.body.appendChild(document.createElement('div')), 'Tutorial geschafft: +5 Kronkorken!', true); } catch (e) { } }
  if (step >= TUT.length) { const t = document.getElementById('kz-tut'); if (t) { t.querySelector('.kz-tut-body').innerHTML = '<b>Geschafft!</b><p>Du kennst jetzt das Wichtigste. +5 Kronkorken als Starthilfe.</p>'; setTimeout(() => t.remove(), 8000); } return; }
  const [h, txt, view, tab, sel] = TUT[step];
  let t = document.getElementById('kz-tut');
  if (!t) { t = document.createElement('div'); t.id = 'kz-tut'; document.body.appendChild(t); }
  t.innerHTML = '<div class="kz-tut-body"><small>Schritt ' + step + ' von ' + (TUT.length - 1) + '</small><b>' + h + '</b><p>' + txt + '</p></div><div class="kf-row"><button class="big kz-tut-go">Zeig mir wo</button><button class="ghost kz-tut-skip">Überspringen</button></div><div class="kz-tut-msg"></div>';
  t.querySelector('.kz-tut-go').onclick = () => window.kiezJumpTo(view, tab, sel);
  t.querySelector('.kz-tut-skip').onclick = async () => { await rpc('tutorial_advance', { step: 99 }).catch(() => {}); if (window.kiezProfile) window.kiezProfile.tutorial_step = 99; t.remove(); };
}
setInterval(() => { if (!document.hidden) tutorial(); }, 4000);

const style19 = document.createElement('style');
style19.textContent = `html body:not(#kz1):not(#kz2) .kz-ticker{list-style:none;margin:6px 0 0;padding:0}html body:not(#kz1):not(#kz2) .kz-ticker li{padding:5px 0;border-top:1px solid rgba(255,255,255,.06);font-size:15px}
html body:not(#kz1):not(#kz2) .kz-ticker small{color:var(--muted,#bdb19d);margin-right:6px}
html body:not(#kz1):not(#kz2) .kz-kzt{padding:6px 10px;border-radius:8px;background:rgba(209,169,79,.18);font-weight:700}
#kz-tut{position:fixed;left:16px;bottom:16px;z-index:8500;width:min(330px,calc(100vw - 32px));padding:14px;border-radius:12px;background:#2b2116;border:2px solid #d1a94f;color:#efe3c3;box-shadow:0 8px 30px rgba(0,0,0,.6);font-family:var(--font-body,sans-serif)}
#kz-tut small{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#d1a94f}#kz-tut b{font-family:var(--font-head,serif);font-size:18px}#kz-tut p{font-size:15px;margin:6px 0}
#kz-tut .kf-row{display:flex;gap:8px;flex-wrap:wrap}
.kz-welcome ul{text-align:left;margin:8px 0 12px;padding-left:18px}.kz-welcome li{margin:4px 0;font-size:15px}
@media (max-width:760px){#kz-tut{bottom:84px}}`;
document.head.appendChild(style19);

// ================= 147: Reiter „Ausrüstung“ – gekaufte Stücke ansehen, anlegen, ablegen =================
const gearBody = addPanel('ausruestung', 'Ausrüstung', 'Ausrüstung');
const SLOT_DE = { waffe: 'Waffe', schutz: 'Kleidung & Schutz', zubehoer: 'Zubehör' };
const slotOf = i => ['zubehoer', 'plunder'].includes(i.category) ? 'zubehoer' : i.attack > i.defense ? 'waffe' : 'schutz';
const GEAR = { tab: 'Übersicht' };
{
  const t = document.createElement('div'); t.className = 'section-tools';
  t.innerHTML = ['Übersicht', 'Waffen', 'Kleidung & Schutz', 'Zubehör'].map(x => '<span>' + x + '</span>').join('');
  document.querySelector('#ausruestung > h2')?.after(t);
  t.addEventListener('click', e => { const s = e.target.closest('span'); if (!s) return; GEAR.tab = s.textContent.trim(); gearTab(); });
}
function gearTab() {
  document.querySelectorAll('#ausruestung > .section-tools span').forEach(s => s.classList.toggle('subtab-active', s.textContent.trim() === GEAR.tab));
  gearBody.querySelectorAll('[data-gtab]').forEach(el => el.dataset.gtab === GEAR.tab ? el.style.removeProperty('display') : el.style.setProperty('display', 'none', 'important'));
}
let gearSeq = 0, gearMsg = null;
loaders.ausruestung = async () => {
  const t = ++gearSeq;
  let c, cat, pl;
  try { [c, { data: cat }] = await Promise.all([rpc('combat_overview'), sb.from('shop_items').select('id,name,description,attack,defense,category,required_level,price')]); } catch (e) { gearBody.innerHTML = '<p class="notice bad">' + esc(e.message) + '</p>'; return; }
  if (t !== gearSeq) return;
  const p = window.kiezProfile || {};
  if (p.equipped_plunder) pl = (await sb.from('plunder_catalog').select('name,attack,defense,bottle_bonus').eq('id', p.equipped_plunder).maybeSingle()).data;
  const byId = Object.fromEntries((cat || []).map(i => [i.id, i]));
  const on = new Set((c.equipped || []).map(e => e.id));
  const owned = (c.owned || []).map(id => byId[id]).filter(Boolean);
  const vals = i => [i.attack ? 'Angriff +' + i.attack : '', i.defense ? 'Verteidigung +' + i.defense : ''].filter(Boolean).join(' · ') || 'keine Kampfwerte';
  const card = i => '<div class="card kz-gear' + (on.has(i.id) ? ' kz-p-on' : '') + '" data-id="' + i.id + '"><b>' + esc(i.name) + '</b><p class="kf-muted">' + SLOT_DE[slotOf(i)] + (on.has(i.id) ? ' · angelegt' : '') + '</p><p>' + vals(i) + '</p>'
    + '<div class="kf-row"><button class="ghost kz-geq">' + (on.has(i.id) ? 'Ablegen' : 'Anlegen') + '</button></div><div class="kz-gear-msg"></div></div>';
  const list = slot => { const l = owned.filter(i => slotOf(i) === slot).sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense));
    return l.length ? '<div class="kf-grid">' + l.map(card).join('') + '</div>' : '<div class="kf-box"><h3>' + SLOT_DE[slot] + '</h3><p class="kf-muted">Hier ist noch nichts. Gekaufte Stücke landen automatisch hier – dann kannst du sie anlegen oder ablegen. <a href="#" class="kz-gshop" data-tab="' + ({ waffe: 'Waffen', schutz: 'Kleidung', zubehoer: 'Zubehör' })[slot] + '">Zum Laden</a></p></div>'; };
  const slotBox = slot => { const e = (c.equipped || []).find(x => x.slot === slot); const i = e && byId[e.id];
    return '<div class="card kz-slot"><b>' + SLOT_DE[slot] + '</b><p>' + (i ? esc(i.name) + '<br><span class="kf-muted">' + vals(i) + '</span>' : '<span class="kf-muted">nichts angelegt</span>') + '</p></div>'; };
  gearBody.innerHTML = '<div data-gtab="Übersicht"><div class="kf-box"><h3>Angelegt</h3><div class="kf-grid kz-slots">' + ['waffe', 'schutz', 'zubehoer'].map(slotBox).join('')
    + '<div class="card kz-slot"><b>Plunder</b><p>' + (pl ? esc(pl.name) + '<br><span class="kf-muted">' + vals(pl) + (pl.bottle_bonus ? ' · Pfand +' + pl.bottle_bonus + ' %' : '') + '</span>' : '<span class="kf-muted">nichts angelegt</span>') + '</p><a href="#" class="kz-gplunder">Zur Plunderkiste</a></div></div></div>'
    + '<div class="kf-box"><h3>Deine Kampfwerte</h3><div class="kz-combat"><div><small>Angriff</small><b>' + c.attack.total + '</b><span>Grundwert ' + c.attack.base + ' · Ausrüstung +' + c.attack.items + ' · Begleiter +' + c.attack.pets + ' · Bande +' + c.attack.gang + ' · Plunder +' + c.attack.plunder + '</span></div>'
    + '<div><small>Verteidigung</small><b>' + c.defense.total + '</b><span>Grundwert ' + c.defense.base + ' · Unterkunft +' + c.defense.shelter + ' · Ausrüstung +' + c.defense.items + ' · Begleiter +' + c.defense.pets + ' · Bande +' + c.defense.gang + ' · Plunder +' + c.defense.plunder + (c.defense.traps ? ' · Fallen +' + c.defense.traps : '') + (c.defense.stench ? ' · Gestank +' + c.defense.stench : '') + '</span></div></div>'
    + '<p class="kf-muted">Pro Platz (Waffe, Kleidung & Schutz, Zubehör) zählt ein Stück. Anlegen tauscht das alte automatisch aus.</p><div class="kf-row"><button class="big kz-gbest">Bestes anlegen</button></div><div class="kz-gbest-msg"></div></div></div>'
    + '<div data-gtab="Waffen">' + list('waffe') + '</div><div data-gtab="Kleidung & Schutz">' + list('schutz') + '</div><div data-gtab="Zubehör">' + list('zubehoer') + '</div>';
  gearTab();
  gearBody.querySelectorAll('.kz-gear').forEach(cd => act(cd.querySelector('.kz-geq'), cd.querySelector('.kz-gear-msg'), async () => {
    const wasOn = on.has(cd.dataset.id);
    await rpc(wasOn ? 'unequip_item' : 'equip_item', { wanted_item: cd.dataset.id });
    const txt = (wasOn ? 'Abgelegt: ' : 'Angelegt: ') + esc(byId[cd.dataset.id].name) + '.';
    gearMsg = { id: cd.dataset.id, txt, t: Date.now() };  // Karte wird neu gezeichnet – Meldung danach wieder einsetzen (Durchspiel-Test: Kleidung ohne Meldung)
    setTimeout(loaders.ausruestung, 300); window.kiezNextLoad?.();
    return txt;
  }));
  if (gearMsg && Date.now() - gearMsg.t < 8000) { const m = gearMsg.id === '__best' ? gearBody.querySelector('.kz-gbest-msg') : gearBody.querySelector('.kz-gear[data-id="' + gearMsg.id + '"] .kz-gear-msg'); if (m) say(m, gearMsg.txt, true); }
  // Bestes pro Platz auf einen Klick (Übersicht)
  const best = ['waffe', 'schutz', 'zubehoer'].map(sl => owned.filter(i => slotOf(i) === sl).sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense))[0]).filter(i => i && !on.has(i.id));
  const bb = gearBody.querySelector('.kz-gbest');
  if (bb) { bb.disabled = !best.length; setLabel(bb, best.length ? 'Bestes anlegen (' + best.map(i => i.name).join(', ') + ')' : 'Bestes ist schon angelegt');
    act(bb, gearBody.querySelector('.kz-gbest-msg'), async () => { for (const i of best) await rpc('equip_item', { wanted_item: i.id }); const txt = 'Angelegt: ' + best.map(i => esc(i.name)).join(', ') + '.'; gearMsg = { id: '__best', txt, t: Date.now() }; setTimeout(loaders.ausruestung, 300); window.kiezNextLoad?.(); return txt; }); }
  gearBody.querySelectorAll('.kz-gshop').forEach(a => a.onclick = e => { e.preventDefault(); go('store', a.dataset.tab); });
  gearBody.querySelector('.kz-gplunder')?.addEventListener('click', e => { e.preventDefault(); go('plunder'); });
};
const style20 = document.createElement('style');
style20.textContent = `html body:not(#kz1):not(#kz2) .kz-slots{grid-template-columns:repeat(auto-fit,minmax(180px,1fr)) !important}
html body:not(#kz1):not(#kz2) .kz-slot a{font-size:14px}`;
document.head.appendChild(style20);

// ================= 148: Postfach als Gesprächsliste (keine Kästen über dem Kartenbild) =================
let inboxBusy = false;
async function inboxList() {
  const box = document.getElementById('inbox'); if (!box || !window.kiezProfile || inboxBusy || box.dataset.kz === '1') return;
  inboxBusy = true;
  try {
    const list = await rpc('chat_conversations');
    box.dataset.kz = '1';
    box.innerHTML = list.length ? '<ul class="kz-inbox">' + list.map(c => '<li class="' + (Number(c.unread) ? 'kz-unread' : '') + '"><div><b>' + esc(c.name) + '</b>' + (Number(c.unread) ? ' <span class="kz-tag">' + c.unread + ' neu</span>' : '')
      + '<p>' + (c.last_mine ? 'Du: ' : '') + esc(String(c.last_body || '').slice(0, 120)) + '</p><small>' + new Date(c.last_at).toLocaleString('de-DE') + '</small></div>'
      + '<button class="ghost kz-inbox-open" data-id="' + c.partner + '" data-name="' + esc(c.name) + '">Antworten</button></li>').join('') + '</ul>' : '<p class="kf-muted">Noch gähnende Leere.</p>';
    box.querySelectorAll('.kz-inbox-open').forEach(b => b.onclick = () => window.kiezDM?.(b.dataset.id, b.dataset.name));
  } catch (e) { } finally { inboxBusy = false; }
}
// index.html schreibt das Postfach neu → danach wieder als Liste zeichnen
if (document.getElementById('inbox')) new MutationObserver(() => { const b = document.getElementById('inbox'); if (b.dataset.kz === '1' && !b.querySelector('.kz-inbox, .kf-muted')) b.dataset.kz = ''; if (b.dataset.kz !== '1') inboxList(); }).observe(document.getElementById('inbox'), { childList: true });
setTimeout(inboxList, 3000);
const style21 = document.createElement('style');
style21.textContent = `html body:not(#kz1):not(#kz2) #inbox{clear:both;width:100%}
html body:not(#kz1):not(#kz2) .kz-inbox{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
html body:not(#kz1):not(#kz2) .kz-inbox li{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--line,#5a4a36);border-radius:var(--radius,8px);background:rgba(0,0,0,.25)}
html body:not(#kz1):not(#kz2) .kz-inbox li.kz-unread{border-color:var(--brass,#d1a94f)}
html body:not(#kz1):not(#kz2) .kz-inbox li p{margin:2px 0;font-size:15px;padding:0;background:none;border:0}
html body:not(#kz1):not(#kz2) .kz-inbox li p:before{content:none}
html body:not(#kz1):not(#kz2) .kz-inbox small{font-size:13px;color:var(--muted,#bdb19d)}`;
document.head.appendChild(style21);

// ================= S12: Wirtschaft & Kampf (4, 13, 15–22) =================
const tm = d => new Date(d).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
// ---------- 4: Nebenjobs ----------
const jobBody = addPanel('nebenjobs', 'Nebenjobs', 'Nebenjobs');
loaders.nebenjobs = async () => {
  let o; try { o = await rpc('jobs_overview'); } catch (e) { return; }
  const p = window.kiezProfile || {};
  const cur = o.jobs.find(j => j.id === o.current);
  jobBody.innerHTML = '<p>Nebenjobs laufen neben der Pfandtour. Ein Job zur Zeit – danach Lohn abholen.</p>'
    + (cur ? '<div class="kf-box kz-job-now"><h3>Gerade: ' + esc(cur.name) + '</h3><p>' + (new Date(o.ends_at) > new Date() ? 'Fertig ' + tm(o.ends_at) : 'Fertig – Lohn abholen!') + '</p><div class="kf-row"><button class="big kz-job-fin"' + (new Date(o.ends_at) > new Date() ? ' disabled' : '') + '>Lohn abholen (' + eur(cur.pay) + ')</button></div><div class="kz-job-msg"></div></div>' : '')
    + '<div class="kf-grid">' + [...o.jobs].sort((a, b) => a.min_level - b.min_level || a.minutes - b.minutes).map(j => '<div class="card kz-job' + (p.level < j.min_level ? ' kz-locked' : '') + '" data-id="' + j.id + '"><b>' + esc(j.name) + '</b><p class="kf-muted">' + esc(j.description) + '</p><p>' + (j.minutes >= 60 ? j.minutes / 60 + ' Std.' : j.minutes + ' Min.') + ' · ' + eur(j.pay) + ' · ' + j.energy + ' Energie' + (j.min_level > 1 ? ' · ab Level ' + j.min_level : '') + '</p>'
      + '<div class="kf-row"><button class="ghost kz-job-go"' + (cur || p.level < j.min_level ? ' disabled' : '') + '>' + (p.level < j.min_level ? 'ab Level ' + j.min_level : 'Anfangen') + '</button></div><div class="kz-job-msg"></div></div>').join('') + '</div>';
  jobBody.querySelectorAll('.kz-job').forEach(c => { const b = c.querySelector('.kz-job-go'); if (!b.disabled) act(b, c.querySelector('.kz-job-msg'), async () => { const r = await rpc('start_job', { job: c.dataset.id }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.nebenjobs, 400); return esc(r.job) + ' läuft bis ' + tm(r.ends_at) + '.'; }); });
  const f = jobBody.querySelector('.kz-job-fin'); if (f && !f.disabled) act(f, jobBody.querySelector('.kz-job-now .kz-job-msg'), async () => { const r = await rpc('finish_job'); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.nebenjobs, 1500); return 'Lohn: ' + eur(r.pay) + '.'; });
};

// ---------- 16: Auktionshaus ----------
const aucBody = addPanel('auktion', 'Auktionshaus', 'Auktionshaus');
loaders.auktion = async () => {
  const me = await myId(); if (!me) return;
  let list, mine; try { [list, { data: mine }] = await Promise.all([rpc('auctions_list'), sb.from('user_plunder').select('plunder_id,quantity').eq('user_id', me).gt('quantity', 0)]); } catch (e) { return; }
  const { data: cat } = await sb.from('plunder_catalog').select('id,name,rarity');
  const nm = Object.fromEntries((cat || []).map(c => [c.id, c]));
  const rare = (mine || []).filter(x => nm[x.plunder_id] && nm[x.plunder_id].rarity !== 'gewoehnlich');
  aucBody.innerHTML = '<p>Seltenen Plunder versteigern: Wer am Ende am meisten bietet, bekommt ihn. Dein Gebot wird festgehalten und zurückgezahlt, wenn dich jemand überbietet. 5 % Gebühr für den Verkäufer.</p>'
    + '<div class="kf-box"><h3>Laufende Auktionen</h3>' + (list.length ? '<div class="kf-grid">' + list.map(a => '<div class="card kz-rar-' + a.rarity + '" data-id="' + a.id + '"><b>' + esc(a.name) + '</b><p class="kf-muted">' + RARITY[a.rarity] + ' · von ' + esc(a.seller) + ' · endet ' + tm(a.ends_at) + '</p><p>' + (a.bid ? 'Höchstgebot ' + eur(a.bid) + ' (' + esc(a.bidder) + ')' : 'Startpreis ' + eur(a.start_price)) + '</p>'
        + (a.mine ? '<p class="kf-muted">Deine Auktion</p>' : a.leading ? '<p><b>Du führst!</b></p>' : '<div class="kf-row"><input type="number" class="kz-bid" min="' + a.min_bid + '" step="0.1" value="' + a.min_bid + '" style="width:110px"><button class="ghost kz-bid-go">Bieten</button></div>') + '<div class="kz-auc-msg"></div></div>').join('') + '</div>' : '<p class="kf-muted">Gerade keine Auktionen.</p>') + '</div>'
    + '<div class="kf-box"><h3>Selbst versteigern</h3>' + (rare.length ? '<div class="kf-row"><select class="kz-auc-sel">' + rare.map(x => '<option value="' + x.plunder_id + '">' + esc(nm[x.plunder_id].name) + ' (' + x.quantity + '×)</option>').join('') + '</select><input type="number" class="kz-auc-start" min="0.5" step="0.5" value="2" style="width:100px" aria-label="Startpreis"><select class="kz-auc-h"><option value="1">1 Std.</option><option value="6">6 Std.</option><option value="12">12 Std.</option><option value="24" selected>24 Std.</option></select><button class="big kz-auc-new">Versteigern</button></div>' : '<p class="kf-muted">Du hast keinen seltenen Plunder.</p>') + '<div class="kz-auc-new-msg"></div></div>';
  aucBody.querySelectorAll('.card[data-id]').forEach(c => { const b = c.querySelector('.kz-bid-go'); if (b) act(b, c.querySelector('.kz-auc-msg'), async () => { const r = await rpc('auction_bid', { auction: Number(c.dataset.id), amount: Number(c.querySelector('.kz-bid').value) }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.auktion, 1500); return 'Geboten: ' + eur(r.bid) + '.'; }); });
  const n = aucBody.querySelector('.kz-auc-new'); if (n) act(n, aucBody.querySelector('.kz-auc-new-msg'), async () => { await rpc('auction_create', { wanted: aucBody.querySelector('.kz-auc-sel').value, start_price: Number(aucBody.querySelector('.kz-auc-start').value), hours: Number(aucBody.querySelector('.kz-auc-h').value) }); setTimeout(loaders.auktion, 1500); return 'Auktion läuft.'; });
};

// ---------- 17: Kiosk ----------
const kioskBody = addPanel('kiosk', 'Kiosk-Stand', 'Kiosk');
loaders.kiosk = async () => {
  let o; try { o = await rpc('kiosk_overview'); } catch (e) { return; }
  const m = o.mine;
  kioskBody.innerHTML = '<p>Dein eigener Kiosk bringt jede Stunde Geld – bis zu 24 Stunden sammelt sich die Kasse. Aber Vorsicht: Andere können ihn überfallen.</p>'
    + '<div class="kf-box kz-kiosk-me"><h3>' + (m ? 'Dein Kiosk (Stufe ' + m.level + ')' : 'Noch kein Kiosk') + '</h3>'
    + (m ? '<p>' + eur(m.rate) + ' pro Stunde · Kasse: <b>' + eur(m.cash) + '</b> · voll ' + tm(m.full_at) + '</p><div class="kf-row"><button class="big kz-k-col">Kasse leeren</button>' + (m.next_price ? '<button class="ghost kz-k-up">Ausbauen – ' + eur(m.next_price) + '</button>' : '') + '</div>'
      : '<p>' + (o.can_build ? 'Bau dir für 30 € einen Stand.' : 'Einen Kiosk gibt es ab Level 5.') + '</p><div class="kf-row"><button class="big kz-k-up"' + (o.can_build ? '' : ' disabled') + '>Kiosk bauen – 30,00 €</button></div>') + '<div class="kz-k-msg"></div></div>'
    + '<div class="kf-box"><h3>Kioske in deiner Gegend</h3><p class="kf-muted">Überfall: 12 Energie, deine Angriffskraft gegen den Stand. Beute 30 % der Kasse, jeder Kiosk höchstens alle 6 Stunden.</p>'
    + (o.targets.length ? '<table class="kf-table"><tr><th>Besitzer</th><th>Level</th><th>Kiosk</th><th>Kasse</th><th></th></tr>' + o.targets.map(t => '<tr><td>' + playerLink(t.user_id, t.name) + '</td><td>' + t.level + '</td><td>Stufe ' + t.kiosk + '</td><td>' + eur(t.cash) + '</td><td><button class="ghost kz-k-rob" data-id="' + t.user_id + '"' + (t.ready ? '' : ' disabled') + '>' + (t.ready ? 'Überfallen' : 'erst später') + '</button></td></tr>').join('') + '</table>' : '<p class="kf-muted">Keine Kioske in deinem Kampfbereich.</p>') + '<div class="kz-k-rob-msg"></div></div>';
  const msg = kioskBody.querySelector('.kz-k-msg');
  const col = kioskBody.querySelector('.kz-k-col'); if (col) act(col, msg, async () => { const r = await rpc('kiosk_collect'); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.kiosk, 1500); return 'Eingesammelt: ' + eur(r.cash) + '.'; });
  const up = kioskBody.querySelector('.kz-k-up'); if (up && !up.disabled) act(up, msg, async () => { const r = await rpc('kiosk_build'); await refreshProfile(); setTimeout(loaders.kiosk, 1500); return 'Kiosk auf Stufe ' + r.level + ' (' + eur(r.rate) + '/Std.).'; });
  kioskBody.querySelectorAll('.kz-k-rob').forEach(b => { if (!b.disabled) act(b, kioskBody.querySelector('.kz-k-rob-msg'), async () => { const r = await rpc('kiosk_rob', { target_id: b.dataset.id }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.kiosk, 2500); if (!r.won) throw new Error('Abgeblitzt (' + r.attack + ' zu ' + r.defense + ').'); return 'Überfall geglückt: ' + eur(r.loot) + ' erbeutet.'; }); });
};

// ---------- 18: Kredithai ----------
const loanBody = addPanel('kredithai', 'Kredithai', 'Kredithai');
loaders.kredithai = async () => {
  let o; try { o = await rpc('loan_status'); } catch (e) { return; }
  const l = o.loan;
  loanBody.innerHTML = '<div class="kf-box"><h3>Der Kredithai</h3><p>Schnelles Geld, schnell zurück: 20 % Zinsen, 3 Tage Zeit. Wer nicht zahlt, bekommt Besuch – die Schläger nehmen dein Bargeld, 20 Energie, und die Restschuld wächst jeden Tag um 10 %.</p>'
    + (l ? '<p>Offen: <b>' + eur(l.owed) + '</b> · fällig ' + tm(l.due_at) + (new Date(l.due_at) < new Date() ? ' – <b>überfällig!</b>' : '') + '</p><div class="kf-row"><button class="big kz-l-pay">Zurückzahlen (so viel Bargeld da ist)</button></div>'
      : '<p class="kf-muted">Höchstens ' + eur(o.max) + ' (20 € je Level).</p><div class="kf-row"><input type="number" class="kz-l-amt" min="5" max="' + o.max + '" step="1" value="' + Math.min(20, o.max) + '" style="width:110px" aria-label="Betrag"><button class="big kz-l-take">Leihen</button></div>')
    + '<div class="kz-l-msg"></div></div>';
  const m = loanBody.querySelector('.kz-l-msg');
  const pay = loanBody.querySelector('.kz-l-pay'); if (pay) act(pay, m, async () => { const r = await rpc('loan_repay'); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.kredithai, 1500); return 'Gezahlt: ' + eur(r.paid) + (Number(r.left) ? ', noch ' + eur(r.left) + ' offen.' : ' – schuldenfrei!'); });
  const take = loanBody.querySelector('.kz-l-take'); if (take) act(take, m, async () => { const r = await rpc('loan_take', { amount: Number(loanBody.querySelector('.kz-l-amt').value) }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.kredithai, 1500); return eur(r.amount) + ' geliehen – zurück bis ' + tm(r.due_at) + ': ' + eur(r.owed) + '.'; });
};

// ---------- 13: Ausrüstung im Basar ----------
async function basarItems() {
  const body = document.querySelector('#basar .kf-body'); const me = await myId(); if (!body || !me || body.querySelector('.kz-ibox')) return;
  const [{ data: ls }, { data: cat }, { data: inv }] = await Promise.all([sb.from('item_listings').select('*').order('price'), sb.from('shop_items').select('id,name,attack,defense,price'), sb.from('inventory').select('item_id,equipped').eq('user_id', me)]);
  const nm = Object.fromEntries((cat || []).map(c => [c.id, c]));
  const box = document.createElement('div'); box.className = 'kf-box kz-ibox';
  const sellable = (inv || []).filter(i => !i.equipped && nm[i.item_id]);
  box.innerHTML = '<h3>Waffen & Ausrüstung</h3><p class="kf-muted">Gebrauchte Ausrüstung von anderen Spielern (5 % Gebühr für den Verkäufer). Jedes Stück hat man nur einmal.</p>'
    + ((ls || []).length ? '<table class="kf-table"><tr><th>Stück</th><th>Werte</th><th>Preis</th><th></th></tr>' + ls.map(l => { const i = nm[l.item_id] || {}; return '<tr><td>' + esc(i.name) + '</td><td>A ' + i.attack + ' / V ' + i.defense + '</td><td>' + eur(l.price) + ' <small class="kf-muted">(Laden ' + eur(i.price) + ')</small></td><td>' + (l.seller_id === me ? '<button class="ghost kz-i-cancel" data-id="' + l.id + '">Zurückziehen</button>' : '<button class="ghost kz-i-buy" data-id="' + l.id + '">Kaufen</button>') + '</td></tr>'; }).join('') + '</table>' : '<p class="kf-muted">Gerade keine Angebote.</p>')
    + (sellable.length ? '<div class="kf-row"><select class="kz-i-sel">' + sellable.map(i => '<option value="' + i.item_id + '">' + esc(nm[i.item_id].name) + '</option>').join('') + '</select><input type="number" class="kz-i-price" min="0.1" step="0.1" placeholder="Preis €" style="width:110px"><button class="ghost kz-i-list">Anbieten</button></div>' : '<p class="kf-muted">Nicht angelegte Ausrüstung kannst du hier anbieten.</p>')
    + '<div class="kz-i-msg"></div>';
  body.appendChild(box);
  const m = box.querySelector('.kz-i-msg'), again = () => { box.remove(); setTimeout(basarItems, 300); };
  box.querySelectorAll('.kz-i-buy').forEach(b => act(b, m, async () => { const r = await rpc('item_buy', { listing: Number(b.dataset.id) }); window.kiezRenderProfile?.(r.profile); setTimeout(again, 1500); return 'Gekauft: ' + esc(r.item) + ' – anlegen unter Mein Kiez → Ausrüstung.'; }));
  box.querySelectorAll('.kz-i-cancel').forEach(b => act(b, m, async () => { await rpc('item_cancel', { listing: Number(b.dataset.id) }); setTimeout(again, 1500); return 'Zurückgezogen.'; }));
  const li = box.querySelector('.kz-i-list'); if (li) act(li, m, async () => { await rpc('item_list', { wanted: box.querySelector('.kz-i-sel').value, price: Number(box.querySelector('.kz-i-price').value) }); setTimeout(again, 1500); return 'Angeboten.'; });
}
{ const prevB = loaders.basar; loaders.basar = async () => { await prevB?.(); basarItems(); }; }

// ---------- 15: Pfandlager – Größe je Stufe (0038), Ausbau auf der Unterkunft-Seite ----------
setInterval(() => {
  const c = document.getElementById('kz-pfandsell'), p = window.kiezProfile; if (!c || !p) return;
  let s = c.querySelector('.kz-store-lv'); if (!s) { s = document.createElement('div'); s.className = 'kz-store-lv'; c.querySelector('.kz-ps-msg').before(s); }
  const lv = p.bottle_storage || 0, full = Number(p.bottles) >= STORE_CAP[lv], key = lv + '|' + full;
  if (s.dataset.k === key) return; s.dataset.k = key;
  s.innerHTML = (full ? '<p class="notice bad">Lager voll – neue Flaschen bleiben liegen. Verkaufen oder ausbauen!</p>' : '')
    + (lv < 4 ? '<p class="kf-muted"><a href="#" class="kz-store-go">Pfandlager ausbauen ›</a></p>' : '');
  s.querySelector('.kz-store-go')?.addEventListener('click', e => { e.preventDefault(); go('gear', 'Pfandlager'); });
}, 2000);
// Reiter „Pfandlager“ auf der Unterkunft-Seite
{
  const gear = document.getElementById('gear');
  const drawStore = () => {
    const p = window.kiezProfile; if (!gear || !p) return;
    let box = gear.querySelector('.kz-storebox'); if (!box) { box = document.createElement('div'); box.className = 'kf-box kz-storebox'; (gear.querySelector(':scope > .haeuser-gallery') || gear.querySelector(':scope > .inside'))?.before(box); }
    const lv = p.bottle_storage || 0;
    box.innerHTML = '<h3>Pfandlager</h3><p>Hier bunkerst du deine Flaschen zwischen Tour und Verkauf. Ist es voll, bleiben neue Flaschen einfach liegen – und liegengelassenes Pfand verschwindet mit ' + (10 - 2 * lv) + ' % pro Tag (Nachbarn, Ratten, Kollegen).</p>'
      + '<p>Belegt: <b>' + fmtN(p.bottles) + ' / ' + fmtN(STORE_CAP[lv]) + '</b> Flaschen · Stufe ' + lv + ' von 4</p>'
      + '<div class="progress"><span style="width:' + Math.min(100, Math.round(p.bottles / STORE_CAP[lv] * 100)) + '%"></span></div>'
      + '<table class="kf-table"><tr><th>Stufe</th><th>Platz</th><th>Klau pro Tag</th><th>Preis</th></tr>' + STORE_CAP.map((cap, i) => '<tr' + (i === lv ? ' class="kz-now"' : '') + '><td>' + (['Plastiktüte', 'Kellerabteil', 'Garage', 'Lagerhalle', 'Pfand-Imperium'])[i] + '</td><td>' + fmtN(cap) + '</td><td>' + (10 - 2 * i) + ' %</td><td>' + (i === 0 ? '–' : eur(STORE_PRICE[i - 1])) + '</td></tr>').join('') + '</table>'
      + (lv < 4 ? '<div class="kf-row"><button class="big kz-store-up">Ausbauen auf ' + fmtN(STORE_CAP[lv + 1]) + ' Flaschen – ' + eur(STORE_PRICE[lv]) + '</button></div>' : '<p class="kf-muted">Voll ausgebaut.</p>') + '<div class="kz-store-msg"></div>';
    const b = box.querySelector('.kz-store-up'); if (b) act(b, box.querySelector('.kz-store-msg'), async () => { const r = await rpc('buy_bottle_storage'); window.kiezRenderProfile?.(r.profile); setTimeout(drawStore, 1500); return 'Ausgebaut: jetzt Platz für ' + fmtN(r.cap) + ' Flaschen.'; });
  };
  const tabsG = () => { const t = gear?.querySelector(':scope > .section-tools'); if (!t) return;
    if (![...t.children].some(x => x.textContent.trim() === 'Pfandlager')) { const sp = document.createElement('span'); sp.textContent = 'Pfandlager'; t.appendChild(sp); }
    const tab = t.querySelector('.subtab-active')?.textContent.trim() || 'Unterkünfte'; gear.dataset.kztab = tab; if (tab === 'Pfandlager') drawStore(); };
  gear?.addEventListener('click', e => { const sp = e.target.closest(':scope > .section-tools span'); if (!sp) return; e.stopPropagation(); gear.querySelectorAll(':scope > .section-tools span').forEach(x => x.classList.toggle('subtab-active', x === sp)); tabsG(); });
  const st = document.createElement('style'); st.textContent = `html body:not(#kz1):not(#kz2) #gear[data-kztab="Pfandlager"] > .haeuser-gallery, html body:not(#kz1):not(#kz2) #gear[data-kztab="Pfandlager"] > .inside, html body:not(#kz1):not(#kz2) #gear[data-kztab="Pfandlager"] > #shopmsg{display:none !important}
html body:not(#kz1):not(#kz2) #gear:not([data-kztab="Pfandlager"]) .kz-storebox{display:none !important}
html body:not(#kz1):not(#kz2) .kz-storebox tr.kz-now td{color:var(--brass,#d1a94f);font-weight:700}`; document.head.appendChild(st);
  tabsG(); const prevG3 = loaders.gear; loaders.gear = () => { prevG3?.(); setTimeout(tabsG, 250); };
}

// ---------- 19/20/21: Revanche, Kopfgeld, Turnier in der Prügelei ----------
async function drawFightExtras() {
  const host = document.getElementById('kz-npcs'); if (!host) return;
  let rv, bt, tn; try { [rv, bt, tn] = await Promise.all([rpc('revenge_list'), rpc('bounty_list'), rpc('tournament_status')]); } catch (e) { return; }
  let box = document.getElementById('kz-fightx'); if (!box) { box = document.createElement('div'); box.id = 'kz-fightx'; host.after(box); }
  box.innerHTML = (rv.length ? '<div class="kf-box kz-revenge"><h3>Revanche</h3><p class="kf-muted">Wer dich verprügelt hat, bekommt einmal sofort die Quittung – ohne Level- und 3-Stunden-Sperre (24 Std. lang).</p>'
      + rv.map(r => '<div class="kf-row" data-f="' + r.fight_id + '"><span>' + playerLink(r.attacker_id, r.name) + ' · ' + tm(r.at) + (Number(r.loot) ? ' · nahm ' + eur(r.loot) : '') + '</span><button class="big kz-rev">Revanche</button></div>').join('') + '<div class="kz-rev-msg"></div></div>' : '')
    + '<div class="kf-grid"><div class="kf-box"><h3>Kopfgelder</h3>' + (bt.length ? '<table class="kf-table">' + bt.map(b => '<tr><td>' + playerLink(b.target_id, b.name) + ' (Level ' + b.level + ')</td><td><b>' + eur(b.amount) + '</b></td></tr>').join('') + '</table>' : '<p class="kf-muted">Gerade keine.</p>')
    + '<p class="kf-muted">Wer den Gesuchten besiegt, kassiert. Kopfgeld aussetzen (5–500 €):</p><div class="kf-row"><input class="kz-b-name" placeholder="Spielername" style="flex:1"><input type="number" class="kz-b-amt" min="5" max="500" value="10" style="width:90px"><button class="ghost kz-b-go">Aussetzen</button></div><div class="kz-b-msg"></div></div>'
    + '<div class="kf-box"><h3>Kampfturnier der Woche</h3><p>Anmelden für 2 € – am Wochenende wird automatisch im K.-o.-System ausgetragen. Sieger: 70 % des Topfs + 20 Kronkorken, Platz 2: 30 %.</p><p class="kf-muted">' + tn.players + ' angemeldet · Auslosung am ' + new Date(tn.week_ends).toLocaleDateString('de-DE') + '</p>'
    + '<div class="kf-row"><button class="big kz-t-go"' + (tn.signed ? ' disabled' : '') + '>' + (tn.signed ? 'Du bist dabei' : 'Anmelden – 2,00 €') + '</button></div><div class="kz-t-msg"></div>'
    + (tn.last ? '<p class="kf-muted">Letzte Woche: Sieger ' + esc(tn.last.winner || '–') + ' (Topf ' + eur(tn.last.pot) + ')</p>' : '') + '</div></div>';
  box.querySelectorAll('.kz-rev').forEach(b => act(b, box.querySelector('.kz-rev-msg'), async () => { const r = await rpc('revenge_attack', { fight: Number(b.closest('[data-f]').dataset.f) }); window.kiezRenderProfile?.(r.profile); setTimeout(drawFightExtras, 2500); return r.result === 'win' ? 'Revanche geglückt! ' + eur(r.loot) + ' zurückgeholt' + (Number(r.bounty) ? ' + Kopfgeld ' + eur(r.bounty) : '') + '.' : 'Wieder verloren (' + r.attacker_power + ' zu ' + r.defender_power + ').'; }));
  act(box.querySelector('.kz-b-go'), box.querySelector('.kz-b-msg'), async () => {
    const n = box.querySelector('.kz-b-name').value.trim(); const { data } = await sb.from('profiles').select('id').ilike('username', n.replace(/[%_\\]/g, '')).maybeSingle();
    if (!data) throw new Error('Spieler nicht gefunden'); const r = await rpc('bounty_place', { target_id: data.id, amount: Number(box.querySelector('.kz-b-amt').value) }); window.kiezRenderProfile?.(r.profile); setTimeout(drawFightExtras, 1500); return 'Kopfgeld ausgesetzt: ' + eur(r.amount) + '.'; });
  const tg = box.querySelector('.kz-t-go'); if (!tg.disabled) act(tg, box.querySelector('.kz-t-msg'), async () => { const r = await rpc('tournament_signup'); window.kiezRenderProfile?.(r.profile); setTimeout(drawFightExtras, 1500); return 'Angemeldet – viel Glück!'; });
}
{ const prevP = loaders.pvp; loaders.pvp = () => { prevP?.(); setTimeout(drawFightExtras, 1500); }; }

// ---------- 22: Wetten in der Zockerbude ----------
async function drawBets() {
  const body = document.querySelector('#zockerbude .kf-body'); if (!body || body.querySelector('.kz-bets')) return;
  let o; try { o = await rpc('bets_overview'); } catch (e) { return; }
  const box = document.createElement('div'); box.className = 'kf-box kz-bets';
  const already = (k, r) => o.mine.some(b => b.kind === k && b.ref === String(r));
  box.innerHTML = '<h3>Wettbüro</h3><p class="kf-muted">Einsatz 0,50–50 €. Tierkampf: feste Quote 1,9 – das Ergebnis steht morgen fest. Bandenkriege: alle Einsätze in einen Topf, die Gewinner teilen ihn (5 % für den Buchmacher). Auf den Krieg der eigenen Bande darfst du nicht wetten.</p>'
    + '<div class="kz-bet" data-k="pet" data-r="' + o.pet.day + '"><b>Tierkampf des Tages: ' + esc(o.pet.a) + ' gegen ' + esc(o.pet.b) + '</b>'
    + (already('pet', o.pet.day) ? '<p>Du hast gewettet.</p>' : '<div class="kf-row"><input type="number" class="kz-bet-amt" min="0.5" max="50" step="0.5" value="1" style="width:90px"><button class="ghost kz-bet-go" data-s="a">Auf ' + esc(o.pet.a) + '</button><button class="ghost kz-bet-go" data-s="b">Auf ' + esc(o.pet.b) + '</button></div>')
    + (o.pet.yesterday ? '<p class="kf-muted">Gestern gewann: ' + esc(o.pet.yesterday.winner) + '</p>' : '') + '<div class="kz-bet-msg"></div></div>'
    + o.wars.map(w => '<div class="kz-bet" data-k="war" data-r="' + w.id + '"><b>Bandenkrieg ' + esc(w.attacker) + ' gegen ' + esc(w.defender) + ' (' + w.score + ')</b><p class="kf-muted">Topf: ' + eur(Number(w.pool_a) + Number(w.pool_d)) + ' · endet ' + tm(w.ends_at) + '</p>'
      + (already('war', w.id) ? '<p>Du hast gewettet.</p>' : '<div class="kf-row"><input type="number" class="kz-bet-amt" min="0.5" max="50" step="0.5" value="1" style="width:90px"><button class="ghost kz-bet-go" data-s="attacker">Auf ' + esc(w.attacker) + '</button><button class="ghost kz-bet-go" data-s="defender">Auf ' + esc(w.defender) + '</button></div>') + '<div class="kz-bet-msg"></div></div>').join('')
    + (o.mine.length ? '<p class="kf-muted">Deine letzten Wetten: ' + o.mine.map(b => (b.kind === 'pet' ? 'Tierkampf' : 'Krieg') + ' ' + eur(b.amount) + (b.settled ? ' → ' + eur(b.payout) : ' (offen)')).join(' · ') + '</p>' : '');
  body.appendChild(box);
  box.querySelectorAll('.kz-bet-go').forEach(b => { const w = b.closest('.kz-bet'); act(b, w.querySelector('.kz-bet-msg'), async () => { const r = await rpc('place_bet', { bet_kind: w.dataset.k, bet_ref: w.dataset.r, bet_side: b.dataset.s, amount: Number(w.querySelector('.kz-bet-amt').value) }); window.kiezRenderProfile?.(r.profile); setTimeout(() => { box.remove(); drawBets(); }, 1500); return 'Gewettet: ' + eur(r.amount) + '.'; }); });
}
{ const prevZ = loaders.zockerbude; loaders.zockerbude = async () => { await prevZ?.(); drawBets(); }; }

// ================= S13: Charakter, Sozial, Welt (23, 26–34) =================
// ---------- 34: Kiez-Figuren (Nebenquests) ----------
const figBody = addPanel('kiezfiguren', 'Kiez-Figuren', 'Kiez-Figuren');
const QKIND = { bottles: 'Flaschen', beg: 'mal schnorren', bin: 'Mülltonnen', job: 'Nebenjob', npc: 'Computer-Gegner besiegt', sort: 'mal sortiert', crime: 'Verbrechen', wins: 'Siege' };
loaders.kiezfiguren = async () => {
  let q; try { q = await rpc('side_quests_status'); } catch (e) { return; }
  figBody.innerHTML = '<p>Neben der Kiez-Geschichte haben ein paar Leute im Kiez eigene Aufgaben für dich – jede in mehreren Teilen. Was du dafür tust, verändert auch deinen Ruf.</p><div class="kf-grid">'
    + q.map(x => '<div class="card kz-fig" data-q="' + x.quest + '"><b>' + esc(x.figure) + '</b><p class="kf-muted">' + (x.done ? 'Alle ' + x.steps + ' Teile erledigt' : 'Teil ' + x.step + ' von ' + x.steps + ': ' + esc(x.title)) + '</p>'
      + (x.done ? '<p>Danke für alles!</p>' : '<p><i>' + esc(x.body) + '</i></p><div class="progress"><span style="width:' + Math.round(x.progress / x.target * 100) + '%"></span></div><small>' + x.progress + ' / ' + x.target + ' ' + (QKIND[x.kind] || '') + ' · Lohn: ' + eur(x.reward_money) + ', ' + x.reward_caps + ' Kronkorken, ' + x.reward_xp + ' Punkte</small>'
        + '<div class="kf-row"><button class="big kz-fig-go"' + (x.progress < x.target ? ' disabled' : '') + '>' + (x.progress < x.target ? 'Noch nicht geschafft' : 'Abgeben') + '</button></div>') + '<div class="kz-fig-msg"></div></div>').join('') + '</div>';
  figBody.querySelectorAll('.kz-fig').forEach(c => { const b = c.querySelector('.kz-fig-go'); if (b && !b.disabled) act(b, c.querySelector('.kz-fig-msg'), async () => { const r = await rpc('claim_side_quest', { q: c.dataset.q }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.kiezfiguren, 2000); return esc(r.figure) + ' bedankt sich: ' + eur(r.money) + ', ' + r.caps + ' Kronkorken, ' + r.xp + ' Punkte.'; }); });
};

// ---------- 26: Ruf im Kiez (Karriere → Statistik) ----------
async function drawRep() {
  const ins = document.querySelector('#career > .inside'); if (!ins || !window.kiezProfile) return;
  let r; try { r = await rpc('reputation_status'); } catch (e) { return; }
  let box = ins.querySelector('.kz-rep'); if (!box) { box = document.createElement('div'); box.className = 'kf-box kz-rep'; ins.prepend(box); }
  const bar = (label, v) => '<div class="kz-repbar"><small>' + label + ': ' + v + '</small><div class="kz-rb"><span style="left:50%;width:' + Math.abs(v) / 2 + '%;' + (v < 0 ? 'transform:translateX(-100%);background:var(--rust,#9b3c1f)' : '') + '"></span></div></div>';
  box.innerHTML = '<h3>Ruf im Kiez</h3><p class="kf-muted">Was du tust, spricht sich rum: Verbrechen freuen die Unterwelt und ärgern die Polizei, Schnorren, Mülltonnen und Jobs machen dich bei den Nachbarn beliebt.</p>'
    + bar('Polizei', r.police) + bar('Unterwelt', r.underworld) + bar('Nachbarn', r.neighbors)
    + '<ul class="kz-unlocks">' + r.unlocks.map(u => '<li class="' + (u.have ? 'kz-have' : '') + '">' + (u.have ? '<i class="kz-ico kz-ico-ok"></i>' : '<i class="kz-ico kz-ico-lock"></i>') + esc(u.group) + ' ab ' + u.need + ': ' + esc(u.text) + '</li>').join('') + '</ul>';
}
{ const prevC = loaders.career; loaders.career = () => { prevC?.(); setTimeout(drawRep, 300); }; }

// ---------- 29: Glücksrad (Aktionszentrale → Glücksspiel) ----------
const WHEEL = ['Niete', '0,50 €', '1 €', '2 Kronk.', '+20 Energie', '5 Kronk.', 'Plunder', '5 €'];
function drawWheel() {
  const ins = document.querySelector('#missions > .inside'); if (!ins || ins.querySelector('.kz-wheel')) return;
  const box = document.createElement('div'); box.className = 'kf-box kz-wheel';
  box.innerHTML = '<h3>Glücksrad</h3><p class="kf-muted">Einmal am Tag gratis drehen – vom leeren Joghurtbecher bis zu 5 €.</p><div class="kz-wheel-disc">' + WHEEL.map((w, i) => '<span style="--i:' + i + '">' + w + '</span>').join('') + '</div><div class="kf-row"><button class="big kz-spin">Drehen</button></div><div class="kz-wheel-msg"></div>';
  ins.appendChild(box); window.kiezRezone?.('missions');  // später eingefügt → Reiter-Sichtbarkeit neu anwenden
  act(box.querySelector('.kz-spin'), box.querySelector('.kz-wheel-msg'), async () => {
    const r = await rpc('spin_wheel'); const d = box.querySelector('.kz-wheel-disc');
    d.style.transition = 'none'; d.style.transform = 'rotate(0deg)'; void d.offsetWidth;
    d.style.transition = 'transform 2.2s cubic-bezier(.2,.8,.2,1)'; d.style.transform = 'rotate(' + (1440 - r.slot * 45) + 'deg)';
    await new Promise(x => setTimeout(x, 2300)); window.kiezRenderProfile?.(r.profile); if (/Niete/i.test(r.label)) throw new Error('Pech gehabt: ' + r.label.replace(/^Niete\s*[–-]\s*/, '').replace(/\.$/, '') + '. Morgen wieder!');  // Niete = kein Gewinn (rot)
    return 'Gewonnen: ' + esc(r.label);
  });
}
{ const prevM = loaders.missions; loaders.missions = () => { prevM?.(); setTimeout(drawWheel, 300); }; }

// ---------- 27/28/30: Mentor, Geschenke, Duo-Tour (Freunde) ----------
async function drawFriendsExtra() {
  const body = document.querySelector('#freunde .kf-body'), me = await myId(); if (!body || !me || body.querySelector('.kz-fx')) return;
  let ms; try { ms = await rpc('mentor_status'); } catch (e) { return; }
  const { data: fr } = await sb.from('friendships').select('user_id,friend_id,status').eq('status', 'accepted').or('user_id.eq.' + me + ',friend_id.eq.' + me);
  const ids = (fr || []).map(f => f.user_id === me ? f.friend_id : f.user_id); const nm = await names(ids);
  const { data: pl } = await sb.from('user_plunder').select('plunder_id,quantity').eq('user_id', me).gt('quantity', 0);
  const { data: cat } = await sb.from('plunder_catalog').select('id,name'); const pn = Object.fromEntries((cat || []).map(c => [c.id, c.name]));
  const box = document.createElement('div'); box.className = 'kz-fx';
  const fsel = ids.length ? '<select class="kz-fx-friend">' + ids.map(i => '<option value="' + i + '">' + esc(nm[i] || '?') + '</option>').join('') + '</select>' : '';
  box.innerHTML = '<div class="kf-grid"><div class="kf-box"><h3>Zu zweit auf Pfandtour</h3><p class="kf-muted">Lade einen Freund ein. Nimmt er an, gibt es 3 Stunden lang +15 % Flaschen für jede Tour, solange ihr beide unterwegs seid.</p>'
    + (ids.length ? '<div class="kf-row">' + fsel + '<button class="ghost kz-duo">Einladen / annehmen</button></div>' : '<p class="kf-muted">Erst Freunde finden.</p>') + '<div class="kz-duo-msg"></div></div>'
    + '<div class="kf-box"><h3>Geschenke</h3><p class="kf-muted">Kronkorken (bis 20 am Tag), Plunder oder ein Bier (+10 Energie für 1 €).</p>'
    + (ids.length ? '<div class="kf-row">' + fsel.replace('kz-fx-friend', 'kz-g-friend') + '<select class="kz-g-kind"><option value="caps">Kronkorken</option><option value="bier">Bier (1 €)</option>' + ((pl || []).length ? '<option value="plunder">Plunder</option>' : '') + '</select>'
      + '<input type="number" class="kz-g-qty" min="1" max="20" value="1" style="width:70px" aria-label="Anzahl"><select class="kz-g-pl" hidden>' + (pl || []).map(x => '<option value="' + x.plunder_id + '">' + esc(pn[x.plunder_id] || x.plunder_id) + '</option>').join('') + '</select><button class="ghost kz-gift">Schenken</button></div>' : '') + '<div class="kz-gift-msg"></div></div>'
    + '<div class="kf-box"><h3>Mentor</h3>' + (ms.mentor ? '<p>Dein Mentor: ' + playerLink(ms.mentor.id, ms.mentor.name) + ' (Level ' + ms.mentor.level + ')</p>' : '')
    + (ms.mentees.length ? '<p>Deine Schützlinge: ' + ms.mentees.map(m => playerLink(m.id, m.name) + ' (' + m.level + ')').join(', ') + '</p>' : '')
    + (ms.can_choose ? '<p class="kf-muted">Such dir einen erfahrenen Spieler (ab Level 30). Bei deinen Levels 5, 10, 15 und 20 bekommt ihr beide Kronkorken, dein Mentor zusätzlich Geld.</p>' + (ms.candidates.length ? '<div class="kf-row"><select class="kz-m-sel">' + ms.candidates.map(c => '<option value="' + c.id + '">' + esc(c.name) + ' (Level ' + c.level + ')</option>').join('') + '</select><button class="ghost kz-m-go">Als Mentor wählen</button></div>' : '<p class="kf-muted">Gerade ist niemand ab Level 30 aktiv.</p>')
      : !ms.mentor && !ms.can_mentor ? '<p class="kf-muted">Mentor werden kannst du ab Level 30.</p>' : '') + '<div class="kz-m-msg"></div></div></div>';
  body.appendChild(box);
  const q = s => box.querySelector(s);
  if (q('.kz-duo')) act(q('.kz-duo'), q('.kz-duo-msg'), async () => { const r = await rpc('duo_invite', { friend: q('.kz-fx-friend').value }); return r.status === 'active' ? 'Ihr seid zu zweit unterwegs – 3 Stunden +15 %!' : 'Eingeladen – dein Freund muss hier auch auf „Einladen / annehmen“ drücken.'; });
  if (q('.kz-g-kind')) q('.kz-g-kind').onchange = e => { q('.kz-g-pl').hidden = e.target.value !== 'plunder'; q('.kz-g-qty').hidden = e.target.value !== 'caps'; };
  if (q('.kz-gift')) act(q('.kz-gift'), q('.kz-gift-msg'), async () => { const k = q('.kz-g-kind').value; const r = await rpc('send_gift', { friend: q('.kz-g-friend').value, gift_kind: k, ref: k === 'plunder' ? q('.kz-g-pl').value : null, qty: Number(q('.kz-g-qty').value) || 1 }); window.kiezRenderProfile?.(r.profile); return 'Geschenkt an ' + esc(r.to) + ': ' + esc(r.gift) + '.'; });
  if (q('.kz-m-go')) act(q('.kz-m-go'), q('.kz-m-msg'), async () => { const r = await rpc('set_mentor', { mentor: q('.kz-m-sel').value }); setTimeout(() => { box.remove(); drawFriendsExtra(); }, 1500); return esc(r.mentor) + ' ist jetzt dein Mentor.'; });
}
{ const prevF = loaders.freunde; loaders.freunde = async () => { await prevF?.(); drawFriendsExtra(); }; }

// ---------- 23: Kosmetik (Einstellungen) ----------
async function drawCosmetics() {
  const body = document.querySelector('#einstellungen .kf-body'), me = await myId(); if (!body || !me || body.querySelector('.kz-cos')) return;
  const [{ data: all }, { data: mine }] = await Promise.all([sb.from('cosmetics').select('*').order('sort_order'), sb.from('user_cosmetics').select('cosmetic_id').eq('user_id', me)]);
  const have = new Set((mine || []).map(x => x.cosmetic_id)), p = window.kiezProfile || {};
  const box = document.createElement('div'); box.className = 'kf-box kz-cos';
  box.innerHTML = '<h3>Rahmen & Titelfarbe</h3><p class="kf-muted">Für Kronkorken: ein Rahmen ums Profilbild und eine Farbe für deinen Titel – sehen alle in deinem Profil.</p><div class="kf-grid">'
    + (all || []).map(c => { const on = (c.kind === 'frame' ? p.avatar_frame : p.title_color) === c.id; return '<div class="card kz-cos-c" data-id="' + c.id + '" data-k="' + c.kind + '"><b style="color:' + esc(c.value) + '">' + esc(c.name) + '</b><div class="kz-cos-prev" style="' + (c.kind === 'frame' ? 'border:5px solid ' + esc(c.value) : 'color:' + esc(c.value)) + '">' + (c.kind === 'frame' ? '' : '„Titel“') + '</div>'
      + '<div class="kf-row">' + (have.has(c.id) ? '<button class="ghost kz-cos-use">' + (on ? 'Ablegen' : 'Benutzen') + '</button>' : '<button class="ghost kz-cos-buy">Kaufen – ' + c.price_caps + ' Kronkorken</button>') + '</div><div class="kz-cos-msg"></div></div>'; }).join('') + '</div>';
  body.appendChild(box);
  box.querySelectorAll('.kz-cos-c').forEach(c => {
    const b = c.querySelector('.kz-cos-buy'), u = c.querySelector('.kz-cos-use'), m = c.querySelector('.kz-cos-msg'), again = () => setTimeout(() => { box.remove(); drawCosmetics(); applyFrame(); }, 1500);
    if (b) act(b, m, async () => { const r = await rpc('buy_cosmetic', { wanted: c.dataset.id }); window.kiezRenderProfile?.(r.profile); again(); return 'Gekauft: ' + esc(r.bought) + '.'; });
    if (u) act(u, m, async () => { const on = u.textContent === 'Ablegen'; const r = await rpc('use_cosmetic', { k: c.dataset.k, wanted: on ? null : c.dataset.id }); window.kiezRenderProfile?.(r.profile); again(); return on ? 'Abgelegt.' : 'Benutzt.'; });
  });
}
{ const prevE = loaders.einstellungen; loaders.einstellungen = async () => { await prevE?.(); drawCosmetics(); }; }
// Rahmen am eigenen Profilbild im Spielerkasten
let cosCache = null;
async function applyFrame() {
  const p = window.kiezProfile; if (!p) return;
  if (!cosCache) { const { data } = await sb.from('cosmetics').select('id,value'); cosCache = Object.fromEntries((data || []).map(c => [c.id, c.value])); }
  document.querySelectorAll('.player-slip .kz-avatar, .player-slip [style*="background-image"]').forEach(a => { a.style.outline = p.avatar_frame ? '4px solid ' + cosCache[p.avatar_frame] : ''; a.style.outlineOffset = '-2px'; });
}
setTimeout(applyFrame, 3000); setInterval(applyFrame, 15000);

// ---------- 31/32/33: Tag/Nacht + Stadtereignisse im Ticker ----------
async function drawCity() {
  const t = document.getElementById('kz-ticker'); if (!t || !window.kiezProfile) return;
  let c; try { c = await rpc('city_events_now'); } catch (e) { return; }
  let box = t.querySelector('.kz-city'); if (!box) { box = document.createElement('div'); box.className = 'kz-city'; t.querySelector('h3')?.after(box); }
  box.innerHTML = '<p class="kz-daytime">' + (c.daytime === 'nacht' ? 'Nacht im Kiez: Pfand +10 %, Verbrechen lohnen mehr (aber riskanter), Schnorren bringt wenig.' : 'Tag im Kiez.') + '</p>'
    + c.events.map(e => '<p class="kz-kzt"><b>' + esc(e.title) + '</b> – ' + esc(e.body) + ' <small>bis ' + new Date(e.ends_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '</small></p>').join('');
}
setInterval(() => { if (!document.hidden) drawCity(); }, 300000); setTimeout(drawCity, 5000);
{ const prevT = window.tickerLoad; }

const style22 = document.createElement('style');
style22.textContent = `html body:not(#kz1):not(#kz2) .kz-repbar{margin:8px 0}html body:not(#kz1):not(#kz2) .kz-repbar small{font-size:13px;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-rb{position:relative;height:10px;border-radius:6px;background:rgba(255,255,255,.08)}
html body:not(#kz1):not(#kz2) .kz-rb span{position:absolute;top:0;bottom:0;border-radius:6px;background:var(--moss,#6f8a3c)}
html body:not(#kz1):not(#kz2) .kz-rb:after{content:'';position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:rgba(255,255,255,.4)}
html body:not(#kz1):not(#kz2) .kz-unlocks{list-style:none;padding:0;margin:8px 0 0}html body:not(#kz1):not(#kz2) .kz-unlocks li{margin:4px 0;font-size:15px;color:var(--muted,#bdb19d)}html body:not(#kz1):not(#kz2) .kz-unlocks li.kz-have{color:var(--text,#efe3c3)}
html body:not(#kz1):not(#kz2) .kz-wheel-disc{position:relative;width:220px;height:220px;margin:10px auto;border-radius:50%;border:6px solid var(--brass,#d1a94f);background:conic-gradient(#9b3c1f 0 45deg,#3a2e20 45deg 90deg,#9b3c1f 90deg 135deg,#3a2e20 135deg 180deg,#9b3c1f 180deg 225deg,#3a2e20 225deg 270deg,#9b3c1f 270deg 315deg,#3a2e20 315deg 360deg)}
html body:not(#kz1):not(#kz2) .kz-wheel-disc span{position:absolute;left:50%;top:50%;width:90px;margin-left:-45px;text-align:center;font-size:12px;font-weight:700;color:#f3e6c4;transform:rotate(calc(var(--i)*45deg + 22.5deg)) translateY(-78px)}
html body:not(#kz1):not(#kz2) .kz-wheel .kf-row{justify-content:center}
html body:not(#kz1):not(#kz2) .kz-wheel:before{content:'';display:block;width:0;height:0;margin:0 auto -6px;border:10px solid transparent;border-top-color:var(--brass,#d1a94f)}
html body:not(#kz1):not(#kz2) .kz-cos-prev{width:70px;height:50px;margin:6px 0;border-radius:6px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-weight:700}
html body:not(#kz1):not(#kz2) .kz-daytime{font-size:14px;color:var(--muted,#bdb19d)}`;
document.head.appendChild(style22);

// ================= S14: Langzeit (6–9, 14, 36) =================
// ---------- 7: Kiez-Saison ----------
const seasonBody = addPanel('saison', 'Kiez-Saison', 'Kiez-Saison');
loaders.saison = async () => {
  let s; try { s = await rpc('season_status'); } catch (e) { return; }
  const tier = Math.floor(s.points / s.per_tier);
  const rw = r => [r.caps ? r.caps + ' Kronkorken' : '', Number(r.money) ? eur(r.money) : '', r.plunder ? 'Plunder' : ''].filter(Boolean).join(' + ');
  seasonBody.innerHTML = '<div class="kf-box"><h3>Saison ' + s.season + ' – noch bis ' + new Date(s.ends).toLocaleDateString('de-DE') + '</h3><p>Jede Aktion im Kiez bringt Saisonpunkte (Flaschen: 1 Punkt je 10). Alle ' + s.per_tier + ' Punkte gibt es eine Belohnung – kostenlos für alle.</p>'
    + '<div class="progress"><span style="width:' + Math.min(100, Math.round(s.points / (20 * s.per_tier) * 100)) + '%"></span></div><p class="kf-muted">' + s.points + ' Punkte · Stufe ' + Math.min(20, tier) + ' von 20</p></div>'
    + '<div class="kz-ladder">' + s.tiers.map(t => '<div class="kz-rung' + (t.claimed ? ' kz-done' : s.points >= t.need ? ' kz-ready' : '') + '" data-t="' + t.tier + '"><b>' + t.tier + '</b><small>' + rw(t.reward) + '</small>'
      + (t.claimed ? '<em>abgeholt</em>' : s.points >= t.need ? '<button class="ghost kz-rung-go">Abholen</button>' : '<em>' + t.need + ' P.</em>') + '</div>').join('') + '</div><div class="kz-rung-msg"></div>';
  seasonBody.querySelectorAll('.kz-rung-go').forEach(b => act(b, seasonBody.querySelector('.kz-rung-msg'), async () => { const r = await rpc('claim_season_tier', { tier: Number(b.closest('.kz-rung').dataset.t) }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.saison, 1200); return 'Abgeholt: ' + rw(r) + (r.plunder_name ? ' (' + esc(r.plunder_name) + ')' : '') + '.'; }));
};

// ---------- 9: Kiez-Legende (Karriere) ----------
function drawLegend() {
  const ins = document.querySelector('#career > .inside'), p = window.kiezProfile; if (!ins || !p || ins.querySelector('.kz-legend')) return;
  const box = document.createElement('div'); box.className = 'kf-box kz-legend';
  box.innerHTML = '<h3>Kiez-Legende' + (p.legend ? ' (' + p.legend + '×)' : '') + '</h3><p>Wer Level 150 erreicht, kann als Kiez-Legende von vorn anfangen: Level, Punkte und Weiterbildungen gehen zurück auf Anfang, Geld bis auf 50 € weg. Dafür bleibt für immer: +3 Angriff, +3 Verteidigung und +5 % Pfand – je Legenden-Stufe.</p>'
    + (p.level >= 150 ? '<div class="kf-row"><button class="big kz-leg-go">Kiez-Legende werden</button></div>' : '<p class="kf-muted">Noch ' + (150 - p.level) + ' Level bis dahin.</p>') + '<div class="kz-leg-msg"></div>';
  ins.appendChild(box);
  const b = box.querySelector('.kz-leg-go'); if (b) act(b, box.querySelector('.kz-leg-msg'), async () => { if (!confirm('Wirklich von vorn anfangen? Level und Weiterbildungen werden zurückgesetzt.')) return 'Nicht jetzt.'; const r = await rpc('become_legend'); window.kiezRenderProfile?.(r.profile); return 'Du bist Kiez-Legende Nr. ' + r.legend + '!'; });
}
{ const prevC2 = loaders.career; loaders.career = () => { prevC2?.(); setTimeout(drawLegend, 400); }; }

// ---------- 14: mehr Ranglisten ----------
const RK = { geld: 'Reichste (Tasche + Schließfach)', flaschen: 'Meiste Flaschen', quote: 'Beste Kampfquote (ab 20 Kämpfen)', tiere: 'Tierkampf-Siege', legende: 'Kiez-Legenden' };
async function drawRankings(kind) {
  const ins = document.querySelector('#leaderboard > .inside'); if (!ins) return;
  let box = ins.querySelector('.kz-ranks'); if (!box) { box = document.createElement('div'); box.className = 'kf-box kz-ranks'; ins.appendChild(box); }
  kind = kind || box.dataset.k || 'geld'; box.dataset.k = kind;
  let r; try { r = await rpc('rankings', { kind }); } catch (e) { return; }
  box.innerHTML = '<h3>Weitere Ranglisten</h3><div class="kf-row kz-rk-tabs">' + Object.entries(RK).map(([k, v]) => '<button class="ghost kz-rk' + (k === kind ? ' kz-on' : '') + '" data-k="' + k + '">' + v.split(' (')[0] + '</button>').join('') + '</div>'
    + '<p class="kf-muted">' + RK[kind] + '</p>' + (r.length ? '<table class="kf-table"><tr><th>#</th><th>Spieler</th><th>Level</th><th>Wert</th></tr>' + r.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + playerLink(x.id, x.name) + '</td><td>' + x.level + '</td><td>' + (kind === 'geld' ? eur(x.value) : kind === 'quote' ? x.value + ' %' : x.value) + '</td></tr>').join('') + '</table>' : '<p class="kf-muted">Noch niemand.</p>');
  box.querySelectorAll('.kz-rk').forEach(b => b.onclick = () => drawRankings(b.dataset.k));
}
{ const prevL = loaders.leaderboard; loaders.leaderboard = () => { prevL?.(); setTimeout(() => drawRankings(), 400); }; }

// ---------- 36: Statistik mit Verlaufskurven ----------
const statBody = addPanel('statistik', 'Statistik', 'Statistik');
const spark = (rows, key, label, fmt) => {
  if (rows.length < 2) return '<div class="kf-box"><h3>' + label + '</h3><p class="kf-muted">Die Kurve entsteht ab dem zweiten Tag.</p></div>';
  const v = rows.map(r => Number(r[key])), mn = Math.min(...v), mx = Math.max(...v), w = 300, h = 90, sx = i => 6 + i * (w - 12) / (v.length - 1), sy = x => h - 8 - (mx === mn ? 0.5 : (x - mn) / (mx - mn)) * (h - 16);
  const pts = v.map((x, i) => sx(i).toFixed(1) + ',' + sy(x).toFixed(1)).join(' ');
  return '<div class="kf-box"><h3>' + label + ': ' + fmt(v[v.length - 1]) + '</h3><svg viewBox="0 0 ' + w + ' ' + h + '" class="kz-spark" role="img" aria-label="' + label + ' der letzten ' + v.length + ' Tage"><polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><circle cx="' + sx(v.length - 1) + '" cy="' + sy(v[v.length - 1]) + '" r="4" fill="currentColor"/></svg><p class="kf-muted">' + new Date(rows[0].day).toLocaleDateString('de-DE') + ' bis heute · niedrigster ' + fmt(mn) + ' · höchster ' + fmt(mx) + '</p></div>';
};
loaders.statistik = async () => {
  let rows; try { rows = await rpc('stats_history'); } catch (e) { return; }
  statBody.innerHTML = '<p>Deine Entwicklung der letzten 30 Tage (ein Punkt pro Tag, an dem du vorbeigeschaut hast).</p><div class="kf-grid">'
    + spark(rows, 'xp', 'Punkte', x => x) + spark(rows, 'money', 'Geld (Tasche + Schließfach)', eur) + spark(rows, 'bottles', 'Flaschen gesammelt', x => x) + spark(rows, 'wins', 'Siege', x => x) + '</div>';
};
setTimeout(() => { if (window.kiezProfile) rpc('stats_history').catch(() => {}); }, 8000);  // täglicher Messpunkt

const style23 = document.createElement('style');
style23.textContent = `html body:not(#kz1):not(#kz2) .kz-ladder{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:10px}
html body:not(#kz1):not(#kz2) .kz-rung{padding:8px;border-radius:8px;border:1px solid var(--line,#5a4a36);background:rgba(0,0,0,.25);display:flex;flex-direction:column;gap:3px;text-align:center}
html body:not(#kz1):not(#kz2) .kz-rung b{font:700 20px var(--font-head,serif)}html body:not(#kz1):not(#kz2) .kz-rung small{font-size:13px}html body:not(#kz1):not(#kz2) .kz-rung em{font-style:normal;font-size:13px;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-rung.kz-ready{border-color:var(--brass,#d1a94f)}html body:not(#kz1):not(#kz2) .kz-rung.kz-done{opacity:.6}
html body:not(#kz1):not(#kz2) .kz-rk-tabs{flex-wrap:wrap;gap:6px}html body:not(#kz1):not(#kz2) .kz-rk.kz-on{outline:2px solid var(--brass,#d1a94f)}
html body:not(#kz1):not(#kz2) .kz-spark{width:100%;height:auto;color:var(--brass,#d1a94f);background:rgba(0,0,0,.2);border-radius:8px}`;
document.head.appendChild(style23);

// ================= S15/S16: Fahrzeuge (53–64) =================
const garBody = addPanel('garage', 'Garage', 'Garage');
const GAR = { tab: 'Fahrzeuge' };
{
  const t = document.createElement('div'); t.className = 'section-tools';
  t.innerHTML = ['Fahrzeuge', 'Werkstatt', 'Schrottplatz', 'Rennen', 'Autoklau'].map(x => '<span>' + x + '</span>').join('');
  document.querySelector('#garage > h2')?.after(t);
  t.addEventListener('click', e => { const s = e.target.closest('span'); if (!s) return; GAR.tab = s.textContent.trim(); garTab(); });
}
function garTab() {
  document.querySelectorAll('#garage > .section-tools span').forEach(s => s.classList.toggle('subtab-active', s.textContent.trim() === GAR.tab));
  garBody.querySelectorAll('[data-rtab]').forEach(el => el.dataset.rtab === GAR.tab ? el.style.removeProperty('display') : el.style.setProperty('display', 'none', 'important'));
}
loaders.garage = async () => {
  let g, races, targets; try { [g, races, targets] = await Promise.all([rpc('garage_overview'), rpc('races_overview'), rpc('theft_targets')]); } catch (e) { garBody.innerHTML = '<p class="notice bad">' + esc(e.message) + '</p>'; return; }
  const p = window.kiezProfile || {}, act_ = g.vehicles.find(v => v.id === g.active) || g.vehicles[0];
  const when = d => new Date(d).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const lic = g.license_stage >= 2 ? 'Führerschein: <b>vorhanden</b>' : g.license_ends_at ? 'Fahrschule läuft bis ' + when(g.license_ends_at) : 'Führerschein: ' + (g.license_stage === 1 ? 'Theorie bestanden – jetzt Praxis' : 'keiner') + (p.level < 30 ? ' (Fahrschule ab Level 30)' : '');
  const vals = v => '+' + v.bonus + ' % Flaschen' + (v.speed ? ' · ' + v.speed + ' % schneller' : '') + (Number(v.fuel) ? ' · Sprit ' + eur(v.fuel) + '/Tour' : '');
  const motor = act_.needs_license, uv = act_;
  garBody.innerHTML =
    '<div data-rtab="Fahrzeuge"><div class="kf-box"><h3>Unterwegs mit: ' + esc(act_.name) + '</h3><p>' + vals(act_) + ' · gesamt mit Tuning: +' + g.bonus + ' % Flaschen</p><p class="kf-muted">' + lic + '</p>'
    + (g.license_stage < 2 ? '<div class="kf-row"><button class="ghost kz-lic"' + (p.level < 30 && !g.license_ends_at ? ' disabled' : '') + '>' + (g.license_ends_at ? (new Date(g.license_ends_at) > new Date() ? 'Fahrschule läuft …' : 'Prüfung abholen') : g.license_stage === 0 ? 'Theorie – 60 €, 1 Std.' : 'Praxis – 150 €, 2 Std.') + '</button></div>' : '') + '<div class="kz-lic-msg"></div></div>'
    + '<div class="kf-grid">' + g.vehicles.map(v => '<div class="card kz-veh' + (v.id === g.active ? ' kz-p-on' : '') + (!v.owned && p.level < v.min_level ? ' kz-locked' : '') + '" data-id="' + v.id + '"><b>' + esc(v.name) + '</b><p class="kf-muted">' + esc(v.description) + '</p><p>' + vals(v) + '</p>'
      + (v.owned ? (v.id !== 'wagen' ? '<p class="kf-muted">Zustand ' + v.condition + ' %' + (v.needs_license ? ' · TÜV ' + (v.tuev_until && new Date(v.tuev_until) > new Date() ? 'bis ' + new Date(v.tuev_until).toLocaleDateString('de-DE') : 'abgelaufen') : '') + '</p>' : '')
        + '<div class="kf-row"><button class="ghost kz-veh-use"' + (v.id === g.active ? ' disabled' : '') + '>' + (v.id === g.active ? 'Im Einsatz' : 'Benutzen') + '</button></div>'
        : '<p class="kf-muted">' + eur(v.price) + ' · ab Level ' + v.min_level + (v.needs_license ? ' · Führerschein' : '') + '</p><div class="kf-row"><button class="ghost kz-veh-buy"' + (p.level < v.min_level || (v.needs_license && g.license_stage < 2) ? ' disabled' : '') + '>' + (p.level < v.min_level ? 'ab Level ' + v.min_level : v.needs_license && g.license_stage < 2 ? 'Führerschein nötig' : 'Kaufen – ' + eur(v.price)) + '</button></div>')
      + '<div class="kz-veh-msg"></div></div>').join('') + '</div></div>'
    // Werkstatt
    + '<div data-rtab="Werkstatt"><div class="kf-box"><h3>Werkstatt: ' + esc(act_.name) + '</h3>' + (act_.id === 'wagen' ? '<p class="kf-muted">Der Einkaufswagen braucht keine Werkstatt.</p>' :
      '<p>Zustand ' + uv.condition + ' % – schlechter Zustand macht Pannen wahrscheinlicher.</p><div class="kf-row"><button class="ghost kz-svc" data-k="repair"' + (uv.condition >= 100 ? ' disabled' : '') + '>Reparieren – ' + eur((100 - uv.condition) * 0.2) + '</button>' + (motor ? '<button class="ghost kz-svc" data-k="tuev">TÜV – 20 € (30 Tage)</button>' : '') + '</div>'
      + '<h3>Tuning aus Material</h3><div class="kf-grid">' + [['reifen', 'Neue Reifen', '5 % schneller', '5 Nägel, 5 Holz'], ['anhaenger', 'Großer Anhänger', '+10 % Flaschen', '10 Nägel, 20 Holz'], ['motor', 'Motor frisiert', '+10 % Flaschen', '15 Nägel, 5 Scherben'], ['hupe', 'Laute Hupe', 'seltener Polizeikontrollen', '3 Scherben']].filter(x => x[0] !== 'motor' || motor)
        .map(x => '<div class="card"><b>' + x[1] + '</b><p>' + x[2] + '</p><p class="kf-muted">' + x[3] + '</p><div class="kf-row"><button class="ghost kz-tune" data-p="' + x[0] + '"' + ((uv.tuning || {})[x[0]] ? ' disabled' : '') + '>' + ((uv.tuning || {})[x[0]] ? 'Eingebaut' : 'Einbauen') + '</button></div><div class="kz-tune-msg"></div></div>').join('')
        + '<div class="card"><b>Lackierung</b><p>Farbe im Profil und auf dem Stadtplan</p><p class="kf-muted">10 Textil</p><div class="kf-row"><input type="color" class="kz-paint" value="' + esc(uv.paint || '#9b3c1f') + '"><button class="ghost kz-tune" data-p="lack">Lackieren</button></div><div class="kz-tune-msg"></div></div></div>'
      + '<h3>Diebstahlschutz</h3><div class="kf-row"><button class="ghost kz-prot" data-k="kralle">Lenkradkralle – 15 €</button><button class="ghost kz-prot" data-k="garage">Garage – 100 €</button></div><p class="kf-muted">Ein Begleiter im Auto schreckt Diebe zusätzlich ab.</p>') + '<div class="kz-svc-msg"></div></div></div>'
    // Schrottplatz
    + '<div data-rtab="Schrottplatz"><div class="kf-box"><h3>Schrottplatz</h3><p>Alte Autos ausschlachten: Nägel, Holz, Scherben, Textil – alle 30 Minuten (5 Energie). Überzähliges Material kannst du hier verkaufen.</p><div class="kf-row"><button class="big kz-scrap"' + (g.scrap_ready_at ? ' disabled' : '') + '>' + (g.scrap_ready_at ? 'Wieder ab ' + new Date(g.scrap_ready_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Ausschlachten') + '</button></div>'
    + '<div class="kf-row"><select class="kz-mat"><option value="nails">Nägel (0,05 €)</option><option value="wood">Holz (0,04 €)</option><option value="shards">Scherben (0,15 €)</option><option value="textile">Textil (0,08 €)</option></select><input type="number" class="kz-mat-n" min="1" value="10" style="width:90px"><button class="ghost kz-mat-go">Verkaufen</button></div><div class="kz-scrap-msg"></div></div></div>'
    // Rennen
    + '<div data-rtab="Rennen"><div class="kf-box"><h3>Straßenrennen</h3><p class="kf-muted">Nur mit Motorfahrzeug. Einsatz 5–500 €, Sieger bekommt 1,9×. Nach dem Annehmen 10 Minuten bis zum Start – Zuschauer können wetten.</p>'
    + '<div class="kf-row"><input type="number" class="kz-race-st" min="5" max="500" value="20" style="width:100px"><button class="ghost kz-race-new"' + (motor ? '' : ' disabled') + '>Herausfordern</button></div>'
    + (races.length ? '<table class="kf-table">' + races.map(r => '<tr data-r="' + r.id + '"><td>' + esc(r.challenger) + ' (' + esc(r.cv) + ')' + (r.opponent ? ' gegen ' + esc(r.opponent) + ' (' + esc(r.ov) + ')' : '') + '</td><td>' + eur(r.stake) + '</td><td>'
      + (r.resolved ? (r.winner ? 'Sieger: ' + esc(r.winner) + ' (' + r.cp + ':' + r.op + ')' : 'abgesagt') : !r.opponent ? (r.mine ? 'wartet' : '<button class="ghost kz-race-acc"' + (motor ? '' : ' disabled') + '>Annehmen</button>') : 'Start ' + new Date(r.starts_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + (r.mine || r.my_bet ? '' : ' <button class="ghost kz-race-bet" data-s="a">1 € auf ' + esc(r.challenger) + '</button><button class="ghost kz-race-bet" data-s="b">1 € auf ' + esc(r.opponent) + '</button>')) + '</td></tr>').join('') + '</table>' : '<p class="kf-muted">Gerade keine Rennen.</p>') + '<div class="kz-race-msg"></div></div></div>'
    // Autoklau
    + '<div data-rtab="Autoklau"><div class="kf-box"><h3>Autos in deiner Gegend</h3><p class="kf-muted">15 Energie. Chance: 50 % + Taschendiebstahl-Stufe (bis 40), weniger bei Kralle/Garage/Begleiter. Klappt es, zahlt der Hehler 10 % des Neupreises; sonst 20 Minuten Knast.</p>'
    + (targets.length ? '<table class="kf-table">' + targets.map(t => '<tr><td>' + playerLink(t.user_id, t.name) + ' (Level ' + t.level + ')</td><td>' + esc(t.vehicle) + (t.kralle ? ' · Kralle' : '') + (t.garage ? ' · Garage' : '') + '</td><td><button class="ghost kz-steal" data-id="' + t.user_id + '">Klauen</button></td></tr>').join('') + '</table>' : '<p class="kf-muted">Keine Motorfahrzeuge in deinem Kampfbereich.</p>') + '<div class="kz-steal-msg"></div></div></div>';
  garTab();
  const again = () => setTimeout(loaders.garage, 1200);
  const lb = garBody.querySelector('.kz-lic'); if (lb && !lb.disabled) act(lb, garBody.querySelector('.kz-lic-msg'), async () => { const r = await rpc('license_step'); window.kiezRenderProfile?.(r.profile); again(); return r.done ? 'Führerschein bestanden!' : r.ends_at ? 'Fahrschule bis ' + when(r.ends_at) + '.' : 'Weiter geht’s.'; });
  garBody.querySelectorAll('.kz-veh').forEach(c => {
    const b = c.querySelector('.kz-veh-buy'), u = c.querySelector('.kz-veh-use'), m = c.querySelector('.kz-veh-msg');
    if (b && !b.disabled) act(b, m, async () => { const r = await rpc('buy_vehicle', { wanted: c.dataset.id }); window.kiezRenderProfile?.(r.profile); again(); return 'Gekauft: ' + esc(r.vehicle) + '.'; });
    if (u && !u.disabled) act(u, m, async () => { const r = await rpc('use_vehicle', { wanted: c.dataset.id }); window.kiezRenderProfile?.(r.profile); again(); return 'Jetzt unterwegs damit.'; });
  });
  const sm = garBody.querySelector('.kz-svc-msg');
  garBody.querySelectorAll('.kz-svc').forEach(b => { if (!b.disabled) act(b, sm, async () => { const r = await rpc('vehicle_service', { kind: b.dataset.k }); window.kiezRenderProfile?.(r.profile); again(); return (b.dataset.k === 'tuev' ? 'TÜV für 30 Tage' : 'Repariert') + ' – ' + eur(r.price) + '.'; }); });
  garBody.querySelectorAll('.kz-tune').forEach(b => { if (!b.disabled) act(b, b.closest('.card').querySelector('.kz-tune-msg'), async () => { const r = await rpc('tune_vehicle', { part: b.dataset.p, color: b.dataset.p === 'lack' ? garBody.querySelector('.kz-paint').value : null }); window.kiezRenderProfile?.(r.profile); again(); return 'Erledigt.'; }); });
  garBody.querySelectorAll('.kz-prot').forEach(b => act(b, sm, async () => { const r = await rpc('buy_car_protection', { kind: b.dataset.k }); window.kiezRenderProfile?.(r.profile); return (b.dataset.k === 'kralle' ? 'Lenkradkralle' : 'Garage') + ' für ' + eur(r.price) + '.'; }));
  const scm = garBody.querySelector('.kz-scrap-msg');
  const sc = garBody.querySelector('.kz-scrap'); if (!sc.disabled) act(sc, scm, async () => { const r = await rpc('scrapyard_dig'); window.kiezRenderProfile?.(r.profile); again(); return 'Ausgeschlachtet: ' + r.nails + ' Nägel, ' + r.wood + ' Holz, ' + r.shards + ' Scherben, ' + r.textile + ' Textil.'; });
  act(garBody.querySelector('.kz-mat-go'), scm, async () => { const r = await rpc('sell_material', { kind: garBody.querySelector('.kz-mat').value, qty: Number(garBody.querySelector('.kz-mat-n').value) }); window.kiezRenderProfile?.(r.profile); return 'Verkauft für ' + eur(r.paid) + '.'; });
  const rm = garBody.querySelector('.kz-race-msg');
  const rn = garBody.querySelector('.kz-race-new'); if (!rn.disabled) act(rn, rm, async () => { await rpc('race_challenge', { stake: Number(garBody.querySelector('.kz-race-st').value) }); again(); return 'Herausforderung steht.'; });
  garBody.querySelectorAll('.kz-race-acc').forEach(b => { if (!b.disabled) act(b, rm, async () => { await rpc('race_accept', { race: Number(b.closest('tr').dataset.r) }); again(); return 'Angenommen – Start in 10 Minuten!'; }); });
  garBody.querySelectorAll('.kz-race-bet').forEach(b => act(b, rm, async () => { const r = await rpc('race_bet', { race: Number(b.closest('tr').dataset.r), bet_side: b.dataset.s, amount: 1 }); window.kiezRenderProfile?.(r.profile); again(); return 'Gewettet: ' + eur(r.amount) + '.'; }));
  garBody.querySelectorAll('.kz-steal').forEach(b => act(b, garBody.querySelector('.kz-steal-msg'), async () => { const r = await rpc('steal_vehicle', { target_id: b.dataset.id }); window.kiezRenderProfile?.(r.profile); again(); if (!r.stolen) throw new Error('Erwischt! 20 Minuten Knast (Chance war ' + r.chance + ' %).'); return 'Geklaut: ' + esc(r.vehicle) + ' – der Hehler zahlt ' + eur(r.cash) + '.'; }));
};
// Fahrzeug im Profil (64)
window.addEventListener('kz-profile-extra', () => {});

// ================= S17: Städte (10, 123, 124) =================
async function drawCities() {
  const body = document.querySelector('#stadtteile .kf-body'); if (!body || body.querySelector('.kz-cities')) return;
  let c; try { c = await rpc('city_overview'); } catch (e) { return; }
  const box = document.createElement('div'); box.className = 'kf-box kz-cities';
  box.innerHTML = '<h3>Städte</h3><p class="kf-muted">' + (c.enabled ? 'Neue Städte öffnen, wenn jede offene Stadt ' + c.needed + ' aktive Spieler hat. Umzug: 100 €, Banden bleiben in ihrer Stadt.' : 'Weitere Städte sind vorbereitet und öffnen, sobald die Hafenstadt voll ist (Richtwert ' + c.needed + ' aktive Spieler).') + '</p>'
    + '<div class="kf-grid">' + c.cities.map(x => '<div class="card' + (x.open ? '' : ' kz-locked') + '" data-id="' + x.id + '"><b>' + esc(x.name) + (x.id === c.mine ? ' – dein Zuhause' : '') + '</b><p>' + esc(x.description) + '</p><p class="kf-muted">' + (x.open ? x.players + ' aktive Spieler' : 'Bald verfügbar') + '</p>'
      + (c.enabled && x.open && x.id !== c.mine ? '<div class="kf-row"><button class="ghost kz-move">Umziehen – 100 €</button></div>' : '') + '<div class="kz-move-msg"></div></div>').join('') + '</div>';
  body.appendChild(box);
  box.querySelectorAll('.kz-move').forEach(b => { const card = b.closest('.card'); act(b, card.querySelector('.kz-move-msg'), async () => { const r = await rpc('move_city', { wanted: card.dataset.id }); window.kiezRenderProfile?.(r.profile); return 'Umgezogen nach ' + esc(r.city) + '.'; }); });
}
{ const prevS = loaders.stadtteile; loaders.stadtteile = async () => { await prevS?.(); drawCities(); }; }


// ================= 155: Schlussdurchsicht – Seiten aufräumen =================
// Reiter-Sichtbarkeit nach spät eingefügten Karten neu anwenden (aktiven Reiter erneut „klicken“)
window.kiezRezone = id => { const s = document.querySelector('#' + id + ' > .section-tools span.subtab-active'); if (s) s.click(); };
const hideEl = (el, off) => { if (!el) return; if (off) el.style.setProperty('display', 'none', 'important'); else el.style.removeProperty('display'); };

// Pfand-Seite: echte Reiter „Pfand sammeln“ / „Verbrechen“ statt versteckter Sprunglinks, Pfandtour zuerst
{
  const pf = document.getElementById('pfand'), tools = pf?.querySelector(':scope > .section-tools');
  if (tools) {
    tools.innerHTML = '<span class="subtab-active">Pfand sammeln</span><span>Verbrechen</span>';
    const apply = tab => {
      tools.querySelectorAll('span').forEach(x => x.classList.toggle('subtab-active', x.textContent === tab));
      const ins = pf.querySelector(':scope > .inside'); if (!ins) return;
      const crime = tab === 'Verbrechen';
      [...ins.children].forEach(c => { if (c.matches('input,button.hide')) return; hideEl(c, crime !== c.matches('.crime-card, #paybail, .kz-jail')); });
      // eigener Titel pro Reiter (Durchspiel-Test 173: „Pfandtour: Hinterhof“ stand auch über den Verbrechen)
      const h = pf.querySelector(':scope > h2'); if (h) { if (!crime) h.dataset.kzpf = h.textContent.startsWith('Verbrechen') ? (h.dataset.kzpf || h.textContent) : h.textContent; const t = crime ? 'Verbrechen' : (h.dataset.kzpf || h.textContent); if (h.textContent !== t) h.textContent = t; }
      if (crime) crimeLocks();
    };
    tools.addEventListener('click', e => { const sp = e.target.closest('span'); if (sp) { e.stopPropagation(); apply(sp.textContent); } });
    const order = () => { const ins = pf.querySelector(':scope > .inside'), a = ins?.querySelector(':scope > .action'); if (a && ins.firstElementChild !== a) ins.prepend(a);
      // Aktionen zuerst (Verkaufen, Mülltonne, Sortieren), Übersicht danach, Kursverlauf eingeklappt ganz unten (ROADMAP 172)
      if (a) { let last = a; ['#kz-pfandsell', '#kz-tourevent', '#kz-bin', '#kz-sortgame', '#pfanduebersicht'].forEach(sel => { const e = ins.querySelector(':scope > ' + sel); if (e) { if (last.nextElementSibling !== e) last.after(e); last = e; } });
        const hist = ins.querySelector('.pfand-pricehistory-card');
        if (hist && !hist.closest('.kz-hist')) { const d = document.createElement('details'); d.className = 'card kz-hist'; d.innerHTML = '<summary>Pfandkurs-Verlauf (schwankt alle 20 Min. zwischen 0,10 € und 0,30 €)</summary>'; d.appendChild(hist); last.after(d); last = d; }
        else if (hist) { const d = hist.closest('.kz-hist'); if (last.nextElementSibling !== d) last.after(d); } } apply(tools.querySelector('.subtab-active')?.textContent || 'Pfand sammeln'); };
    order(); const prevPf = loaders.pfand; loaders.pfand = () => { prevPf?.(); setTimeout(order, 200); };
  }
}

// Unterkunft: richtiger Titel, Reiter „Lager“ (sprang heimlich in die Plunderkiste) entfernt
{
  const g = document.getElementById('gear'), h = g?.querySelector(':scope > h2');
  const fix = () => { if (h && h.textContent !== 'Unterkunft') h.textContent = 'Unterkunft';
    g?.querySelectorAll(':scope > .section-tools span').forEach(sp => { if (sp.textContent.trim() === 'Lager') sp.remove(); }); };
  fix(); const prevG = loaders.gear; loaders.gear = () => { prevG?.(); setTimeout(fix, 200); };
}

// Stadt & Einkommen: jeder Reiter zeigt genau seinen Inhalt (Sammelgebiete zeigten Instrumente, alte Instrument-Karte doppelt)
{
  const inc = document.getElementById('income');
  // per Datenattribut + Stylesheet: alte Skripte setzen Inline-Anzeige zurück, gegen !important im Stylesheet kommen sie nicht an
  const fixInc = () => { const tab = inc?.querySelector(':scope > .section-tools span.subtab-active')?.textContent.trim(); if (tab && inc.dataset.kztab !== tab) inc.dataset.kztab = tab; };
  const stInc = document.createElement('style');
  stInc.textContent = `html body:not(#kz1):not(#kz2) #income[data-kztab] > .inside > *{display:none !important}
html body:not(#kz1):not(#kz2) #income[data-kztab="Schnorrplätze"] > .inside > .schnorr-spots,
html body:not(#kz1):not(#kz2) #income[data-kztab="Sammelgebiete"] > .inside > .area-list,
html body:not(#kz1):not(#kz2) #income[data-kztab="Instrumente"] > .inside > .instrument-list{display:grid !important}
html body:not(#kz1):not(#kz2) #income[data-kztab="Instrumente"] > .inside > .card:has(#musiccollect){display:block !important}`;
  document.head.appendChild(stInc);
  inc?.addEventListener('click', e => { if (e.target.closest('.section-tools span')) setTimeout(fixInc, 60); });
  const prevI = loaders.income; loaders.income = () => { prevI?.(); setTimeout(fixInc, 250); }; setTimeout(fixInc, 1500);
}

// Aktionszentrale: alter „Täglicher Pfandauftrag“ doppelt zu den 3 Tagesaufgaben → nur noch die Tagesaufgaben
{
  const hideOld = () => { const m = document.querySelector('#missions > .inside'); if (!m) return;
    ['#missiontext', '#claimmission', '#missionmsg'].forEach(sel => { const el = m.querySelector(sel); if (el && el.parentElement === m) el.classList.add('kz-old-mission'); });
    [...m.children].forEach(c => { if (c.matches('h3') && /Täglicher Pfandauftrag/.test(c.textContent)) { c.classList.add('kz-old-mission'); let n = c.nextElementSibling; while (n && n.matches('.progress, b, p:not(.kf-muted)')) { n.classList.add('kz-old-mission'); n = n.nextElementSibling; } } }); };
  hideOld(); const prevM2 = loaders.missions; loaders.missions = () => { prevM2?.(); setTimeout(hideOld, 250); };
  const st = document.createElement('style'); st.textContent = 'html body:not(#kz1):not(#kz2) #missions .kz-old-mission{display:none !important}'; document.head.appendChild(st);
}


// Laden: pro Reiter genau das Passende (vorher Kampfwerte im Supermarkt, Geldversteck unter „Verteidigung“/„Verkaufen“)
{
  const st = document.getElementById('store'), tools = st?.querySelector(':scope > .section-tools');
  // Zubehör und Supermarkt sind eigene Läden (Stadt-Leiste) – der Waffenladen hat bewusst nur 4 Reiter
  const fixStore = () => {
    const ins = st?.querySelector(':scope > .inside'), tab = tools?.querySelector('span.subtab-active')?.textContent.trim() || 'Waffen'; if (!ins) return;
    const shop = ['Waffen', 'Kleidung', 'Zubehör'].includes(tab);
    [...ins.children].forEach(c => {
      const nx = c.nextElementSibling;
      let on;
      if (c.matches('.kz-combat-box')) on = shop || tab === 'Verteidigung';
      else if (c.matches('.kiez-zubehoer-head, .kiez-zubehoer-extra')) on = tab === 'Zubehör';
      else if (c.matches('#shoplist') || (c.matches('h3') && nx?.matches('#shoplist'))) on = shop;
      else if (c.matches('#inventorylist') || (c.matches('h3') && nx?.matches('#inventorylist'))) on = tab === 'Verkaufen';
      else if (c.matches('.supermarket-inline') || (c.matches('h3') && nx?.matches('.supermarket-inline'))) on = tab === 'Verbrauchbares';
      else if (c.matches('#itemmsg')) on = true;
      else return;
      hideEl(c, !on);
    });
    // Zubehör-Laden zeigte zusätzlich alle Waffen und Kleidung (~10.000 px Seite, ROADMAP 170) → nur Zubehör und Plunder
    ins.querySelectorAll('#shoplist > .card').forEach(cd => { const id = cd.querySelector('[data-id]')?.dataset.id, cat = OWN.cat?.[id]?.category;
      const off = tab === 'Zubehör' && !!cat && !['zubehoer', 'plunder'].includes(cat);
      if (off) { cd.dataset.kzzub = '1'; hideEl(cd, true); } else if (cd.dataset.kzzub) { delete cd.dataset.kzzub; hideEl(cd, false); } });
  };
  tools?.addEventListener('click', e => { if (e.target.closest('span')) setTimeout(fixStore, 120); });
  const prevS = loaders.store; loaders.store = () => { prevS?.(); setTimeout(fixStore, 300); }; setTimeout(fixStore, 1500);
}


// Basteln: seit 0032 mit Level-Anforderung – im Knopf anzeigen statt erst beim Klick zu scheitern
async function craftLocks() {
  const cards = document.querySelectorAll('.craft-card[data-id]'); if (!cards.length || !window.kiezProfile) return;
  if (!OWN.cat) await ownLoad();
  const lvl = window.kiezProfile.level || 1;
  cards.forEach(card => {
    const it = OWN.cat?.[card.dataset.id], btn = card.querySelector('.craft-go'); if (!it || !btn) return;
    if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
    const lock = lvl < (it.required_level || 1);
    if (lock) { btn.disabled = true; btn.dataset.kzlock = '1'; setLabel(btn, '🔒 ab Level ' + it.required_level); }
    else if (btn.dataset.kzlock) { delete btn.dataset.kzlock; setLabel(btn, btn.dataset.orig); }
    if (card.classList.contains('kz-locked') !== lock) card.classList.toggle('kz-locked', lock);
  });
}
{ const prevPl = loaders.plunder; loaders.plunder = () => { prevPl?.(); setTimeout(craftLocks, 500); };
  const prevOP = window.kiezOnProfile; window.kiezOnProfile = p => { prevOP?.(p); craftLocks(); };
  document.addEventListener('click', e => { if (e.target.closest('#plunder .section-tools span')) setTimeout(craftLocks, 300); }); }


// Schnorren (Straße) ↔ Schnorrplätze verbinden, damit es nicht wie zwei gleiche Seiten wirkt
{
  const addHint = () => { const b = document.querySelector('#begging #beg'); const card = b?.closest('.card, .kf-box, div'); if (!card || card.querySelector('.kz-beg-more')) return;
    const p = document.createElement('p'); p.className = 'kz-beg-more kf-muted';
    p.innerHTML = 'Hier auf der Straße gibt’s Kleingeld auf die Schnelle. Richtig Kohle machst du an besseren Plätzen: <a href="#" class="kz-beg-go">zu den Schnorrplätzen</a>';
    b.after(p); p.querySelector('a').onclick = e => { e.preventDefault(); go('income', 'Schnorrplätze'); }; };
  addHint(); const prevB2 = loaders.begging; loaders.begging = () => { prevB2?.(); setTimeout(addHint, 300); };
}


// Jede Seite und jeder Reiter beginnt oben: Klick auf Reiter/Menü/Stadt-Leiste → nach ganz oben.
// Dazu Scroll-Verankerung aus (Chrome „hielt“ sonst ein Element fest und die Seite rutschte beim Wechsel).
document.addEventListener('click', e => {
  if (e.target.closest('.section-tools span, .section-tools button, .kz-drop button, .kiez-quickbar button, .side [data-view]')) requestAnimationFrame(() => window.scrollTo(0, 0));
}, true);
{ const st = document.createElement('style'); st.textContent = 'html,body{overflow-anchor:none !important}'; document.head.appendChild(st); }


// ================= Waschhaus als eigene Seite (Nutzer: „Schnorren und Waschhaus ist die gleiche Seite“, „unübersichtlich“) =================
const washBody = addPanel('waschhaus', 'Waschhaus', 'Waschhaus');
const WASH = [
  ['brunnen', 'Brunnen', 0, 15, 0, 'Kopf in den Stadtbrunnen, die Tauben gucken zu. Gratis – aber nur alle 30 Minuten, dann kommt der Hausmeister.'],
  ['katzenwaesche', 'Katzenwäsche', 0.5, 35, 0, 'Achseln am Wasserhahn vom Friedhof. Schnell, billig, reicht fürs Erste.'],
  ['schwamm', 'Schwamm & Seife', 1.5, 60, 1, 'Mit echter Seife und eigenem Schwamm. Fast schon Körperpflege.'],
  ['schwimmbad', 'Schwimmbad', 2.5, 80, 0, 'Einmal durch die Hallenbad-Duschen, der Bademeister guckt böse. Danach riechst du nach Chlor statt nach Kiez.'],
  ['waschanlage', 'Waschanlage', 3, 100, 2, 'Eimer, Schlauch und Wurzelbürste im Hinterhof. Danach bist du wie neu.'],
  ['friseur', 'Friseur', 8, 100, 0, 'Waschen, schneiden, föhnen. 24 Stunden lang verdreckst du nur halb so schnell.']];
const WASH_GEAR = [null, ['Schwamm', 6], ['Zugang zur Waschanlage', 25]];
let washSeq = 0;
loaders.waschhaus = async () => {
  const t = ++washSeq; let b; try { b = await rpc('body_status'); } catch (e) { return; } if (t !== washSeq) return;
  window.kiezRenderProfile?.(b.profile);
  const p = b.profile, c = b.cleanliness, lvl = p.wash_level || 0, now = Date.now();
  const until = d => new Date(d).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const fountainMin = b.fountain_ready_at ? Math.ceil((new Date(b.fountain_ready_at) - now) / 60000) : 0;
  const card = ([id, name, price, gain, need, desc]) => {
    let btn;
    if (need > lvl) btn = need === lvl + 1 ? '<button class="ghost kz-wh-buy">' + WASH_GEAR[need][0] + ' kaufen – ' + eur(WASH_GEAR[need][1]) + '</button>' : '<button class="ghost" disabled>erst ' + WASH_GEAR[lvl + 1][0] + ' kaufen</button>';
    else if (id === 'brunnen' && fountainMin > 0) btn = '<button class="ghost" disabled>wieder in ' + fountainMin + ' Min.</button>';
    else if (id !== 'friseur' && c >= 100) btn = '<button class="ghost" disabled>Schon blitzsauber</button>';
    else btn = '<button class="big kz-wh-go">' + (price ? 'Waschen – ' + eur(price) : 'Waschen – gratis') + '</button>';
    return '<div class="card kz-wash" data-t="' + id + '"><b>' + name + '</b><p>' + desc + '</p><p class="kz-wash-fx">' + (gain >= 100 ? 'auf 100 %' : '+' + gain + ' %') + ' Sauberkeit' + (id === 'friseur' ? ' · 24 Std. halber Dreck' : '') + '</p>'
      + '<div class="kf-row">' + btn + '</div><div class="kz-wash-msg"></div></div>';
  };
  washBody.innerHTML = '<div class="kf-box kz-wh-state"><h3>Dein Zustand: ' + TIER_DE[b.tier] + '</h3>'
    + '<div class="kz-wh-big"><b>' + c + ' %</b><span>sauber</span></div><div class="progress kz-wh-bar"><span style="width:' + c + '%"></span></div>'
    + '<p class="kf-muted">Sinkt um 1 % pro Stunde' + (b.barber_until ? ' – dank Friseur bis ' + until(b.barber_until) + ' nur halb so schnell' : '') + '. Kämpfe und Verbrechen kosten je 3 %, Pfandtouren je nach Dauer mehr.</p>'
    + '<div class="kz-wh-mini"><span>Hunger <b>' + b.hunger + ' %</b></span><span>Sucht <b>' + b.addiction + ' %</b></span><span>Energie-Tempo <b>' + Math.round(b.energy_rate * 100) + ' %</b></span></div>'
    + (b.sick_until ? '<p class="notice bad">Du bist krank bis ' + until(b.sick_until) + ' – <a href="#" class="kz-wh-apo">ab in die Apotheke</a>.</p>' : '')
    + '<details class="kz-wh-why"><summary>Was bringt Sauberkeit?</summary><table class="kf-table">' + TIER_ROWS.map(r => '<tr class="' + (r[0] === b.tier ? 'kz-now' : '') + '"><td>' + TIER_DE[r[0]] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</table></details></div>'
    + '<div class="kf-grid kz-wh-grid">' + WASH.map(card).join('') + '</div>';
  washBody.querySelectorAll('.kz-wash').forEach(cd => {
    const m = cd.querySelector('.kz-wash-msg'), go2 = cd.querySelector('.kz-wh-go'), buy = cd.querySelector('.kz-wh-buy');
    if (go2) act(go2, m, async () => { const r = await rpc('wash_up', { tier: cd.dataset.t }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.waschhaus, 1400); return r.label + ': jetzt ' + r.profile.cleanliness + ' % sauber' + (r.barber ? ', frisch frisiert' : '') + '.'; });
    if (buy) act(buy, m, async () => { const r = await rpc('buy_progress', { progress_type: 'wash' }); window.kiezRenderProfile?.(r.profile); setTimeout(loaders.waschhaus, 1400); return esc(r.label) + ' gekauft.'; });
  });
  washBody.querySelector('.kz-wh-apo')?.addEventListener('click', e => { e.preventDefault(); go('apotheke'); });
};
// Schnorren zeigt nur noch das Schnorren (Körperpflege ist jetzt das Waschhaus)
{
  const fixBeg = () => { document.querySelectorAll('#begging > .section-tools span, #begging .scene-copy .section-tools span, #begging span').forEach(sp => { if (sp.textContent.trim() === 'Körperpflege' && sp.closest('.section-tools, .scene-copy')) sp.remove(); });
    // ein einzelner Reiter „Schnorrplatz“ ohne Gegenstück ist sinnlos → ausblenden
    document.querySelectorAll('#begging .section-tools').forEach(t => { if (t.querySelectorAll('span').length <= 1) t.style.setProperty('display', 'none', 'important'); }); };
  fixBeg(); const prevBg = loaders.begging; loaders.begging = () => { prevBg?.(); setTimeout(fixBeg, 200); };
}
// Stadt-Leiste „Waschhaus“ → neue Seite
document.addEventListener('click', e => { const b = e.target.closest('.kiez-quickbar button'); if (b && b.textContent.trim() === 'Waschhaus') { e.preventDefault(); e.stopImmediatePropagation(); go('waschhaus'); } }, true);
{ const st = document.createElement('style'); st.textContent = `html body:not(#kz1):not(#kz2) .kz-wh-big{display:flex;align-items:baseline;gap:8px;margin:4px 0}
html body:not(#kz1):not(#kz2) .kz-wh-big b{font:800 34px var(--font-head,serif);color:var(--brass,#d1a94f)}html body:not(#kz1):not(#kz2) .kz-wh-big span{font-size:15px;color:var(--muted,#bdb19d)}
html body:not(#kz1):not(#kz2) .kz-wh-bar{height:12px !important}
html body:not(#kz1):not(#kz2) .kz-wh-mini{display:flex;flex-wrap:wrap;gap:8px 18px;margin:8px 0;font-size:15px}
html body:not(#kz1):not(#kz2) .kz-wh-why summary{cursor:pointer;color:var(--brass,#d1a94f);font-weight:600;margin-top:6px}
html body:not(#kz1):not(#kz2) .kz-wh-why tr.kz-now td{color:var(--brass,#d1a94f);font-weight:700}
html body:not(#kz1):not(#kz2) .kz-wh-grid{grid-template-columns:repeat(auto-fill,minmax(250px,1fr)) !important;margin-top:12px}
html body:not(#kz1):not(#kz2) .kz-wash{display:flex;flex-direction:column}html body:not(#kz1):not(#kz2) .kz-wash .kf-row{margin-top:auto}
html body:not(#kz1):not(#kz2) .kz-wash-fx{font-weight:700;color:var(--brass,#d1a94f)}`; document.head.appendChild(st); }


// Begleiter: zwei klare Reiter – „Meine Begleiter“ (eigene Tiere, Training) und „Tierhandlung“ (Laden)
{
  const pets = document.getElementById('pets');
  const ensure = () => {
    if (!pets) return; let tools = pets.querySelector(':scope > .section-tools');
    if (!tools || tools.dataset.kz !== '1') {
      if (!tools) { tools = document.createElement('div'); tools.className = 'section-tools'; (pets.querySelector(':scope > .section-scene') || pets.querySelector(':scope > h2'))?.after(tools); }
      tools.dataset.kz = '1'; tools.innerHTML = '<span class="subtab-active">Meine Begleiter</span><span>Tierhandlung</span>';
      tools.addEventListener('click', e => { const sp = e.target.closest('span'); if (sp) { e.stopPropagation(); applyPets(sp.textContent); } });
    }
    // Liste der eigenen Tiere (mit Training) hat ein altes Übersicht-Skript in die Übersicht verschoben → zurückholen
    const ins = pets.querySelector(':scope > .inside'), mine = document.getElementById('mypets');
    if (ins && mine && !ins.contains(mine)) {
      let h = ins.querySelector(':scope > .kz-mine-head'); if (!h) { h = document.createElement('h3'); h.className = 'kz-mine-head'; h.textContent = 'Deine Begleiter'; ins.prepend(h); }
      h.after(mine); mine.style.removeProperty('display');
    }
    // Meldungsfeld der Tier-Knöpfe gehört direkt unter die Liste (lag sonst unsichtbar in der Übersicht)
    const pm2 = document.getElementById('petmsg2'); if (pm2 && mine && mine.nextElementSibling !== pm2 && pets.contains(mine)) mine.after(pm2);
    applyPets(tools.querySelector('.subtab-active')?.textContent || 'Meine Begleiter');
  };
  const applyPets = tab => {
    pets.querySelectorAll(':scope > .section-tools span').forEach(x => x.classList.toggle('subtab-active', x.textContent === tab));
    pets.dataset.kztab = tab;
    // alte Reiter-Logik setzt „display:none !important“ direkt an die Elemente – wegräumen, die Sichtbarkeit regelt das Stylesheet
    pets.querySelectorAll(':scope > .inside > #petshop, :scope > .inside > #petmsg, :scope > .inside > .section-lead, :scope > .inside > #mypets, :scope > .inside > .kz-mine-head, :scope > .inside > #petmsg2').forEach(c => { if (c.style.display) c.style.removeProperty('display'); });
  };
  if (pets) new MutationObserver(ms => { if (ms.some(m => m.target.style?.display === 'none')) applyPets(pets.dataset.kztab || 'Meine Begleiter'); })
    .observe(pets, { subtree: true, attributes: true, attributeFilter: ['style'] });
  const st = document.createElement('style');
  st.textContent = `html body:not(#kz1):not(#kz2) #pets[data-kztab="Meine Begleiter"] #petshop{display:none !important}
html body:not(#kz1):not(#kz2) #pets[data-kztab="Meine Begleiter"] .inside > .section-lead{display:block !important}
html body:not(#kz1):not(#kz2) #pets[data-kztab="Tierhandlung"] .inside > .section-lead{display:none !important}
html body:not(#kz1):not(#kz2) #pets[data-kztab="Tierhandlung"] #mypets, html body:not(#kz1):not(#kz2) #pets[data-kztab="Tierhandlung"] .kz-mine-head{display:none !important}
html body:not(#kz1):not(#kz2) #pets[data-kztab="Meine Begleiter"] #mypets{display:grid !important}
html body:not(#kz1):not(#kz2) #pets[data-kztab="Tierhandlung"] #petmsg2{display:none !important}
html body:not(#kz1):not(#kz2) #pets[data-kztab="Tierhandlung"] #petshop{display:grid !important}`;
  document.head.appendChild(st);
  ensure(); const prevP2 = loaders.pets; loaders.pets = () => { prevP2?.(); setTimeout(ensure, 150); };
}
// Stadt-Leiste „Tierhandlung“ → Laden-Reiter
// Stadt-Leiste: Knöpfe, deren altes Ziel den falschen Reiter öffnet (Durchspiel-Test: „Glücksspiel“ landete im Tagesauftrag)
{ const QB = { 'Tierhandlung': ['pets', 'Tierhandlung'], 'Glücksspiel': ['missions', 'Glücksspiel'] };
  document.addEventListener('click', e => { const b = e.target.closest('.kiez-quickbar button'), t = QB[b?.textContent.trim()]; if (t) { e.preventDefault(); e.stopImmediatePropagation(); go(t[0], t[1]); } }, true); }
// Schnorren: Körperpflege-Teile (jetzt im Waschhaus) hier nie mehr zeigen
{ const st = document.createElement('style'); st.textContent = 'html body:not(#kz1):not(#kz2) #begging .wash-list, html body:not(#kz1):not(#kz2) #begging .action-block:has(#wash){display:none !important}'; document.head.appendChild(st); }

// Zuletzt geöffnete neue Seite wiederherstellen
try { const last = localStorage.getItem('kiez_last_view'); if (loaders[last]) setTimeout(() => show(last), 1500); } catch (e) { }
if (window.kiezProfile) window.kiezOnProfile(window.kiezProfile);

// Tagesbelohnung: Meldung direkt unter dem Knopf (vorher im unsichtbaren #activitymsg → Klick ohne Rückmeldung),
// Serie = Login-Serie (0025), Knopf gesperrt, wenn heute schon abgeholt (Durchspiel-Test F1)
{
  const btn = document.getElementById('claimdaily');
  if (btn) {
    const nb = btn.cloneNode(true); btn.replaceWith(nb);
    const box = document.createElement('div'); box.className = 'kz-dailymsg'; nb.after(box);
    const today = () => new Date().toISOString().slice(0, 10);  // current_date der Datenbank = UTC
    const sync = p => { if (!p) return; const c = document.getElementById('streakcount'); if (c) c.textContent = (p.login_streak || 0) + ((p.login_streak || 0) === 1 ? ' Tag' : ' Tage');
      const done = p.daily_claim_date === today(); nb.disabled = done; setLabel(nb, done ? 'Heute schon abgeholt – morgen wieder' : 'Tagesbelohnung abholen'); };
    act(nb, box, async () => { const r = await rpc('claim_daily_reward'); window.kiezRenderProfile?.(r.profile);
      return 'Tag ' + r.streak + ' der Serie: ' + eur(r.reward) + ', 10 Punkte und ' + (r.bottlecaps || 1) + ' Kronkorken.' + (r.shield_used ? ' Dein Serien-Schutz hat die Serie gerettet.' : ''); });
    const prev = window.kiezOnProfile; window.kiezOnProfile = p => { prev?.(p); sync(p); }; sync(window.kiezProfile);
  }
}

// Übersicht „Dein Kiezbewohner“: echte Werte (Durchspiel-Test: Sauberkeit zeigte den Rang, Platzierung das Level,
// ATT/DEF nur die Trainingsstufe, „Deine Waffe“ den Helm) – Werte aus Profil + combat_overview, Rang aus der Punkte-Rangliste
{
  let rankAt = 0, rank = null;
  const ovSync = async () => {
    const p = window.kiezProfile, box = document.querySelector('#overview .profile-table'); if (!p || !box) return;
    const set = (sel, t) => { const e = box.querySelector(sel); if (e) e.textContent = t; };
    set('.pv-clean', Math.round(p.cleanliness ?? 100) + ' %');
    const c = OWN.combat; if (c) { set('.pv-att', c.attack.total); set('.pv-def', c.defense.total);
      const w = (c.equipped || []).find(e => e.slot === 'waffe'); const ws = document.getElementById('slotWeapon'); if (ws) ws.textContent = w ? w.name : 'Blanke Fäuste'; }
    if (Date.now() - rankAt > 60000) { rankAt = Date.now(); const r = await sb.from('profiles').select('id', { count: 'exact', head: true }).gt('xp', p.xp || 0); if (!r.error) rank = (r.count || 0) + 1; }
    if (rank) set('.pv-place', 'Platz ' + rank);
    // Laune = Mittel aus Sauberkeit und Sattheit, statt immer „ausbaufähig“
    const mood = Math.round(((p.cleanliness ?? 100) + (p.hunger ?? 100)) / 2), bar = document.querySelector('#overview .profile-mood span'), warn = document.querySelector('#overview .profile-warning');
    if (bar) { bar.style.width = mood + '%'; bar.style.background = mood >= 60 ? '#6f8f3a' : mood >= 30 ? '#b08a2e' : '#7d2421'; }
    if (warn) warn.textContent = 'Laune ' + mood + ' % – ' + (mood >= 60 ? 'läuft bei dir.' : mood >= 30 ? 'geht so. Waschen und Essen hilft.' : 'im Keller. Ab ins Waschhaus und was futtern!');
  };
  const prev = window.kiezOnProfile; window.kiezOnProfile = p => { prev?.(p); ovSync(); };
  const cb = combatBoxes; combatBoxes = (...a) => { cb(...a); ovSync(); };
  const pl = loaders.overview; loaders.overview = (...a) => { pl?.(...a); setTimeout(ovSync, 300); };
}

// Laden: gekauftes Stück gleich anlegen, wenn der Platz leer oder das neue Stück stärker ist (Durchspiel-Test 165: Käufe blieben ungenutzt)
document.addEventListener('click', e => {
  const b = e.target.closest('.buyitem'); if (!b || b.disabled) return; const id = b.dataset.id;
  setTimeout(async () => { try {
    const c = await rpc('combat_overview'); if (!(c.owned || []).includes(id)) return;
    const it = OWN.cat?.[id] || (await sb.from('shop_items').select('id,name,attack,defense,category').eq('id', id).maybeSingle()).data; if (!it) return;
    const cur = (c.equipped || []).find(x => x.slot === slotOf(it));
    if (cur && (cur.id === id || cur.attack + cur.defense >= it.attack + it.defense)) return;
    await rpc('equip_item', { wanted_item: id }); OWN.combat = await rpc('combat_overview'); combatBoxes();
    const n = [...document.querySelectorAll('.kz-near .notice, #itemmsg .notice')].filter(x => x.offsetParent && x.textContent.includes('gekauft')).pop();
    if (n && !n.textContent.includes('angelegt')) n.textContent = n.textContent.replace(/\.?\s*$/, '') + ' – und gleich angelegt' + (cur ? ' (statt ' + cur.name + ')' : '') + '.';
  } catch { } }, 1200);
}, true);

// Zu teuer? Knopf ausgrauen und beim Klick sofort sagen, was fehlt (Durchspiel-Test 166: erst der Server meldete „reicht nicht“)
{
  const SEL = '.trainbtn, .trainpet, .buycontainertier, .buyitem, .buypet, .buyinstrument, .kz-wh-buy, .kz-wh-go, .kz-veh-buy, .area-unlock, .craft-go, .kz-k-up, .buydefense';
  const priceOf = b => { const m = (b.textContent || '').match(/(\d[\d.]*,\d\d) ?€/); return m ? +m[1].replace(/\./g, '').replace(',', '.') : null; };
  const mark = () => { const money = +(window.kiezProfile?.money ?? 0);
    document.querySelectorAll(SEL).forEach(b => { const pr = priceOf(b), poor = pr != null && !b.disabled && pr > money + 0.001;
      b.classList.toggle('kz-poor', poor); if (poor) b.dataset.kzmiss = (pr - money).toFixed(2); }); };
  setInterval(mark, 1500); const prev = window.kiezOnProfile; window.kiezOnProfile = p => { prev?.(p); setTimeout(mark, 50); };
  document.addEventListener('click', e => { const b = e.target.closest('.kz-poor'); if (!b) return; mark(); if (!b.classList.contains('kz-poor')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const bank = +(window.kiezProfile?.bank_balance || 0), miss = +b.dataset.kzmiss;
    const card = b.closest(NEAR_CARD.replace(', li', '')) || b.parentElement;
    putNotice(card, '<div class="notice bad">Dir fehlen ' + eur(miss) + '. ' + (bank >= miss ? 'Im Schließfach liegen ' + eur(bank) + ' – erst abheben.' : 'Geh Pfand sammeln oder such dir einen Nebenjob.') + '</div>');
  }, true);
  const st = document.createElement('style'); st.textContent = 'html body:not(#kz1):not(#kz2) .kz-poor{opacity:.55;filter:grayscale(.6);cursor:not-allowed}'; document.head.appendChild(st);
}

// Verbrechen: Level-Grenzen seit 0040 sichtbar, nach Schwierigkeit sortiert (Durchspiel-Test 173/177: Bankraub ab Level 1)
const CRIME_LVL = { 1: 1, 2: 4, 3: 10, 4: 20, 5: 35, 6: 55, 7: 1 };
function crimeLocks() {
  const lvl = window.kiezProfile?.level || 1, btns = [...document.querySelectorAll('#pfand .crime-pick')]; if (!btns.length) return;
  const cards = btns.map(b => ({ b, card: b.closest('.card') || b.parentElement, need: CRIME_LVL[b.dataset.id] || 1, risk: +((b.closest('.card') || b.parentElement).textContent.match(/(\d+)\s*%/) || [0, 0])[1] }));
  cards.forEach(({ b, card, need }) => {
    if (lvl < need) { b.disabled = true; b.dataset.kzlock = '1'; setLabel(b, '🔒 ab Level ' + need); card.classList.add('kz-locked'); }
    else if (b.dataset.kzlock) { b.disabled = false; delete b.dataset.kzlock; setLabel(b, 'Verbrechen begehen'); card.classList.remove('kz-locked'); }
  });
  const grid = cards[0].card.parentElement, sorted = cards.slice().sort((x, y) => x.need - y.need || x.risk - y.risk);
  const cur = [...grid.children].filter(el => cards.some(c => c.card === el));
  if (cards.every(c => c.card.parentElement === grid) && sorted.some((c, i) => cur[i] !== c.card)) sorted.forEach(c => grid.appendChild(c.card));
}
{ const prev = window.kiezOnProfile; window.kiezOnProfile = p => { prev?.(p); crimeLocks(); }; }

// Rubbellos zum Freirubbeln (ROADMAP 168/186): drei gleiche Beträge = Gewinn, 10 € = Einsatz zurück, sonst Niete.
// Vorher zeigten alle drei Felder „WIN“ und es hieß „Gewonnen 5 €“ bei 10 € Einsatz.
{
  const old = document.getElementById('buyscratch');
  if (old) {
    const btn = old.cloneNode(true); old.replaceWith(btn);
    const card = btn.closest('.card') || btn.parentElement, msg = () => card.querySelector('#scratchmsg');
    const desc = card.querySelector('p'); if (desc) desc.textContent = 'Ein Los kostet 10 €. Rubbel die drei Felder frei: Dreimal derselbe Betrag gewinnt ihn – 10 € heißt Einsatz zurück, bis 500 € ist drin.';
    const AMOUNTS = [10, 15, 20, 50, 100, 500];
    const st = document.createElement('style');
    st.textContent = 'html body:not(#kz1):not(#kz2) .scratch-field{position:relative;overflow:hidden;user-select:none;touch-action:none;cursor:crosshair;font-weight:700;font-size:20px !important;min-height:64px}'
      + 'html body:not(#kz1):not(#kz2) .scratch-field canvas{position:absolute;inset:0;width:100%;height:100%}';
    document.head.appendChild(st);
    btn.onclick = async () => {
      btn.disabled = true; const m = msg(); if (m) m.innerHTML = '';
      let r; try { r = await rpc('buy_scratch_ticket'); } catch (e) { if (m) say(m, esc(e.message), false); btn.disabled = false; return; }
      window.kiezRenderProfile?.(r.profile);
      const prize = +r.prize;
      let vals;
      if (prize > 0) vals = [prize, prize, prize];
      else { do { vals = [0, 1, 2].map(() => AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)]); } while (vals[0] === vals[1] && vals[1] === vals[2]); }
      const fields = [...card.querySelectorAll('.scratch-field')]; let open = 0;
      const done = () => {
        const t = prize === 0 ? 'Niete – die 10 € sind weg. Die Bude freut sich.' : prize === 10 ? 'Einsatz zurück: 10 €. Wenigstens nix verloren.' : 'Gewonnen: ' + eur(prize) + ' (' + eur(prize - 10) + ' mehr als der Einsatz)!' + (+r.profile.bank_balance > 0 && prize > 10 ? ' Was nicht in die Tasche passt, liegt im Schließfach.' : '');
        if (m) say(m, t, prize >= 10); fields.forEach(f => f.classList.add(prize > 10 ? 'scratch-win' : 'scratch-lose')); btn.disabled = false;
      };
      fields.forEach((f, i) => {
        f.classList.remove('scratch-win', 'scratch-lose'); f.textContent = eur(vals[i]).replace(',00', '');
        const cv = document.createElement('canvas'); f.appendChild(cv);
        const w = cv.width = f.clientWidth || 120, h = cv.height = f.clientHeight || 60, ctx = cv.getContext('2d');
        ctx.fillStyle = '#9a8a6a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#5c5140'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RUBBELN', w / 2, h / 2 + 5);
        ctx.globalCompositeOperation = 'destination-out'; let down = false, scraped = 0, gone = false;
        const rub = e => { if (!down || gone) return; const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * w / b.width, y = (e.clientY - b.top) * h / b.height;
          ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); if (++scraped > 22) { gone = true; cv.remove(); if (++open === 3) done(); } };
        cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture?.(e.pointerId); rub(e); });
        cv.addEventListener('pointermove', rub); cv.addEventListener('pointerup', () => down = false);
        // Tippen/Klicken ohne Ziehen: jeder Klick rubbelt ein gutes Stück frei
        cv.addEventListener('click', () => { if (gone) return; scraped += 8; if (scraped > 22) { gone = true; cv.remove(); if (++open === 3) done(); } });
      });
      if (m) say(m, 'Rubbel die drei Felder frei!', true);
    };
  }
}

// Stadt-Leiste darf nie unter dem Spielerkasten liegen (ROADMAP 157): Platz rechts freihalten, Knöpfe brechen vorher um
{
  const st = document.createElement('style'); st.textContent = 'html body:not(#kz1):not(#kz2) .kiez-quickbar{padding-right:var(--kz-qb-pad,0px) !important;box-sizing:border-box}'; document.head.appendChild(st);
  const fixQB = () => { document.querySelectorAll('.kiez-quickbar').forEach(bar => {
    const slip = document.querySelector('.player-slip'); if (!slip || !slip.offsetParent || !bar.offsetParent) return;
    bar.style.setProperty('--kz-qb-pad', '0px'); const s = slip.getBoundingClientRect(), b = bar.getBoundingClientRect();
    const overlapY = b.top < s.bottom + 4 && b.bottom > s.top, pad = overlapY && b.right > s.left - 8 ? Math.ceil(b.right - s.left + 12) : 0;
    if (pad > 0 && pad < b.width - 200) bar.style.setProperty('--kz-qb-pad', pad + 'px'); }); };
  addEventListener('resize', fixQB); setInterval(fixQB, 2000); const prev = window.kiezShowView; window.kiezShowView = (...a) => { const r = prev?.(...a); setTimeout(fixQB, 60); setTimeout(fixQB, 500); return r; }; setTimeout(fixQB, 800);
}

// Übersicht › Haustier: war leer, seit die Tierliste wieder auf der Begleiter-Seite steht (ROADMAP 158) → Karte des aktiven Begleiters
async function ovPet() {
  const wrap = document.querySelector('#overview .overview-pet-wrap'), p = window.kiezProfile; if (!wrap || !p) return;
  let box = wrap.querySelector('.kz-ovpet'); if (!box) { box = document.createElement('div'); box.className = 'kz-ovpet'; wrap.appendChild(box); }
  const { data } = await sb.from('user_pets').select('pet_id,active,level,attack_level,defense_level,mitleid_level,training_ends_at').eq('user_id', p.id);
  const cat = (await sb.from('pet_catalog').select('id,name,description,attack,defense,health').in('id', (data || []).map(x => x.pet_id).concat(['-']))).data || [];
  const byId = Object.fromEntries(cat.map(c => [c.id, c])), act = (data || []).find(x => x.active), n = (data || []).length;
  const btns = '<div class="kf-row"><a href="#" class="kz-hint kf-btnlink" data-v="pets" data-t="Meine Begleiter">Deine Begleiter (' + n + ') ›</a> <a href="#" class="kz-hint kf-btnlink" data-v="pets" data-t="Tierhandlung">Zur Tierhandlung ›</a></div>';
  let h;
  if (!act) h = '<p>' + (n ? 'Du hast ' + n + ' Begleiter, aber keiner läuft gerade mit. Nimm einen mit – das bringt Kampfkraft und Mitleid beim Schnorren.' : 'Noch keiner folgt dir. In der Tierhandlung gibt es schon eine Kakerlake für 1 Cent.') + '</p>' + btns;
  else { const c = byId[act.pet_id] || { name: act.pet_id }, tr = act.training_ends_at && new Date(act.training_ends_at) > new Date();
    h = '<div class="card kz-ovpet-card"><b>' + esc(c.name) + '</b><p class="kf-muted">Stufe ' + (act.level || 1) + '</p><p class="kf-muted">' + esc(c.description || '') + '</p>'
      + '<p>Angriff-Training ' + (act.attack_level || 1) + ' · Verteidigung-Training ' + (act.defense_level || 1) + ' · Mitleid-Training ' + (act.mitleid_level || 1) + '</p>'
      + '<p>' + (tr ? 'Im Training bis ' + new Date(act.training_ends_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr.' : 'Gerade kein Training – bei „Deine Begleiter“ kannst du eins starten.') + '</p></div>' + btns; }
  if (box.innerHTML !== h) box.innerHTML = h;
}
{ const pl = loaders.overview; loaders.overview = (...a) => { pl?.(...a); setTimeout(ovPet, 400); };
  document.addEventListener('click', e => { if (e.target.closest('#overview .profile-paper-tabs button, #overview > .section-tools span')) setTimeout(ovPet, 200); }, true); }

// Lange Listen (Waffen, Kleidung, Zubehör, Tierhandlung): nur die nächsten 3 gesperrten zeigen, Rest eingeklappt (ROADMAP 171)
{
  const LISTS = ['#shoplist', '#petshop'];
  const st = document.createElement('style');
  st.textContent = 'html body:not(#kz1):not(#kz2) .kz-fold-hide{display:none !important}html body:not(#kz1):not(#kz2) .kz-fold-btn{grid-column:1/-1;justify-self:center;margin:8px auto}';
  document.head.appendChild(st);
  const fold = () => LISTS.forEach(sel => { const box = document.querySelector(sel); if (!box || !box.offsetParent) return;
    // nur Karten, die der Reiter ohnehin zeigt (andere Kategorien blenden alte Skripte aus)
    const all = [...box.children].filter(c => c.matches('.card'));
    // nur neu rechnen, wenn sich Reiter, Liste oder Besitz geändert haben (sonst ständige Klassenwechsel → Ruckeln)
    const sec = box.closest('section.panel'), sig = (box.dataset.kzfold || '') + '|' + (sec?.querySelector(':scope > .section-tools span.subtab-active')?.textContent || sec?.dataset.kztab || '') + '|' + all.length + '|' + all.filter(c => c.classList.contains('kz-is-owned') || c.classList.contains('kz-locked')).length + '|' + (window.kiezProfile?.level || 0);
    if (box.dataset.kzsig === sig) return; box.dataset.kzsig = sig;
    all.forEach(c => c.classList.remove('kz-fold-hide'));
    const cards = all.filter(c => c.offsetParent !== null);
    const isLocked = c => !c.classList.contains('kz-is-owned') && (c.classList.contains('kz-locked') || (![...c.querySelectorAll('button')].some(x => !x.disabled && x.offsetParent) && /Benötigt|gesperrt|ab Level|Sozialkontakte Stufe/i.test(c.textContent)));
    const locked = cards.filter(isLocked);
    let btn = box.querySelector(':scope > .kz-fold-btn'); const open = box.dataset.kzfold === 'open', hide = open ? [] : locked.slice(3);
    cards.forEach(c => c.classList.toggle('kz-fold-hide', hide.includes(c)));
    if (locked.length <= 3) { btn?.remove(); return; }
    if (!btn) { btn = document.createElement('button'); btn.className = 'ghost kz-fold-btn'; btn.onclick = () => { box.dataset.kzfold = box.dataset.kzfold === 'open' ? '' : 'open'; delete box.dataset.kzsig; fold(); }; }
    const last = open ? locked[locked.length - 1] : locked[2]; if (btn.previousElementSibling !== last) last.after(btn);
    setLabel(btn, open ? 'Gesperrte wieder einklappen' : 'Alle ' + locked.length + ' gesperrten zeigen (' + (locked.length - 3) + ' weitere)'); });
  setInterval(fold, 1500); const prev = window.kiezShowView; window.kiezShowView = (...a) => { const r = prev?.(...a); setTimeout(fold, 400); return r; };
}
