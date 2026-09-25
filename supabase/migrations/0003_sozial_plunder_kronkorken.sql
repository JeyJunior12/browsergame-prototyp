-- 0003: Etappe 4 – Profil/Bio, Gästebuch, Freunde & Blockieren, Spendenlink, Plunder, Kronkorken, Wetter

-- ---------- Profil ----------
alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists motto text not null default '',
  add column if not exists bottlecaps integer not null default 0,
  add column if not exists equipped_plunder text,
  add column if not exists donations_received integer not null default 0,
  add column if not exists donation_money numeric(12,2) not null default 0;

create or replace function public.update_bio(new_bio text, new_motto text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; b text := trim(coalesce(new_bio,'')); m text := trim(coalesce(new_motto,''));
begin
  p := public.kiez_actor();
  if char_length(b)>1000 then raise exception 'Die Beschreibung darf höchstens 1000 Zeichen haben'; end if;
  if char_length(m)>100 then raise exception 'Das Motto darf höchstens 100 Zeichen haben'; end if;
  update public.profiles set bio=b, motto=m where id=p.id returning * into p;
  return to_jsonb(p);
end $function$;

-- ---------- Blockieren ----------
create table if not exists public.blocks(
  user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, blocked_id));
alter table public.blocks enable row level security;
drop policy if exists "own blocks" on public.blocks;
create policy "own blocks" on public.blocks for select using (user_id = auth.uid());

create or replace function public.kiez_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from public.blocks where (user_id=a and blocked_id=b) or (user_id=b and blocked_id=a))
$$;

create or replace function public.block_player(target_id uuid, do_block boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  if target_id=p.id then raise exception 'Du kannst dich nicht selbst blockieren'; end if;
  if not exists(select 1 from public.profiles where id=target_id) then raise exception 'Spieler unbekannt'; end if;
  if do_block then
    insert into public.blocks(user_id,blocked_id) values(p.id,target_id) on conflict do nothing;
    delete from public.friendships where (user_id=p.id and friend_id=target_id) or (user_id=target_id and friend_id=p.id);
  else
    delete from public.blocks where user_id=p.id and blocked_id=target_id;
  end if;
  return jsonb_build_object('blocked',do_block);
end $function$;

-- ---------- Freunde ----------
create table if not exists public.friendships(
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key(user_id, friend_id),
  check (user_id <> friend_id));
alter table public.friendships enable row level security;
drop policy if exists "own friendships" on public.friendships;
create policy "own friendships" on public.friendships for select using (user_id = auth.uid() or friend_id = auth.uid());

create or replace function public.friend_request(target_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  if target_id=p.id then raise exception 'Du bist schon dein bester Freund'; end if;
  if not exists(select 1 from public.profiles where id=target_id and not is_banned) then raise exception 'Spieler unbekannt'; end if;
  if public.kiez_blocked(p.id,target_id) then raise exception 'Das geht bei diesem Spieler nicht'; end if;
  if exists(select 1 from public.friendships where (user_id=p.id and friend_id=target_id) or (user_id=target_id and friend_id=p.id and status='accepted')) then
    raise exception 'Anfrage läuft schon oder ihr seid schon befreundet'; end if;
  if (select count(*) from public.friendships where (user_id=p.id or friend_id=p.id) and status='accepted')>=100 then
    raise exception 'Mehr als 100 Freunde gehen nicht'; end if;
  -- Gegenanfrage vorhanden -> direkt befreundet
  if exists(select 1 from public.friendships where user_id=target_id and friend_id=p.id and status='pending') then
    update public.friendships set status='accepted' where user_id=target_id and friend_id=p.id;
    return jsonb_build_object('status','accepted');
  end if;
  insert into public.friendships(user_id,friend_id) values(p.id,target_id);
  return jsonb_build_object('status','pending');
end $function$;

create or replace function public.friend_respond(requester_id uuid, accept boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  if not exists(select 1 from public.friendships where user_id=requester_id and friend_id=p.id and status='pending') then
    raise exception 'Keine offene Anfrage'; end if;
  if accept then update public.friendships set status='accepted' where user_id=requester_id and friend_id=p.id;
  else delete from public.friendships where user_id=requester_id and friend_id=p.id; end if;
  return jsonb_build_object('status',case when accept then 'accepted' else 'declined' end);
end $function$;

create or replace function public.friend_remove(other_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  delete from public.friendships where (user_id=p.id and friend_id=other_id) or (user_id=other_id and friend_id=p.id);
  return jsonb_build_object('removed',true);
end $function$;

-- ---------- Gästebuch ----------
create table if not exists public.guestbook_entries(
  id bigint generated by default as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now());
create index if not exists guestbook_owner_idx on public.guestbook_entries(owner_id, created_at desc);
alter table public.guestbook_entries enable row level security;
drop policy if exists "guestbook public" on public.guestbook_entries;
create policy "guestbook public" on public.guestbook_entries for select using (true);

create or replace function public.write_guestbook(target_id uuid, entry text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; clean text := trim(coalesce(entry,'')); eid bigint;
begin
  p := public.kiez_actor();
  if not exists(select 1 from public.profiles where id=target_id) then raise exception 'Spieler unbekannt'; end if;
  if public.kiez_blocked(p.id,target_id) then raise exception 'Das geht bei diesem Spieler nicht'; end if;
  if char_length(clean) not between 1 and 300 then raise exception 'Eintrag muss 1 bis 300 Zeichen haben'; end if;
  if exists(select 1 from public.guestbook_entries where author_id=p.id and created_at>now()-interval '30 seconds') then
    raise exception 'Nicht so schnell – warte ein paar Sekunden'; end if;
  insert into public.guestbook_entries(owner_id,author_id,body) values(target_id,p.id,clean) returning id into eid;
  return jsonb_build_object('id',eid);
end $function$;

create or replace function public.delete_guestbook_entry(entry_id bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  delete from public.guestbook_entries where id=entry_id and (owner_id=p.id or author_id=p.id or p.is_admin);
  if not found then raise exception 'Eintrag nicht gefunden'; end if;
  return jsonb_build_object('deleted',entry_id);
end $function$;

-- Nachrichten: Blockierte duerfen nicht schreiben, kurze Sperre gegen Spam
create or replace function public.send_player_message(target_id uuid, message_body text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; mid bigint; clean text := trim(coalesce(message_body,''));
begin
  p := public.kiez_actor();
  if target_id=p.id then raise exception 'Selbstgespräche zählen nicht als soziale Funktion'; end if;
  if char_length(clean) not between 1 and 500 then raise exception 'Nachricht muss 1 bis 500 Zeichen haben'; end if;
  if not exists(select 1 from public.profiles where id=target_id) then raise exception 'Empfänger unbekannt'; end if;
  if public.kiez_blocked(p.id,target_id) then raise exception 'Dieser Spieler möchte keine Post von dir'; end if;
  if (select count(*) from public.messages where sender_id=p.id and created_at>now()-interval '1 minute')>=5 then
    raise exception 'Zu viele Nachrichten – warte eine Minute'; end if;
  insert into public.messages(sender_id,recipient_id,body) values(p.id,target_id,clean) returning id into mid;
  return jsonb_build_object('id',mid);
end $function$;

-- ---------- Spendenlink ----------
create table if not exists public.donations(
  id bigint generated by default as identity primary key,
  target_id uuid not null references public.profiles(id) on delete cascade,
  donor_id uuid references public.profiles(id) on delete set null,
  donor_key text not null,
  amount numeric(12,2) not null,
  donation_day date not null default current_date,
  created_at timestamptz not null default now(),
  unique(target_id, donor_key, donation_day));
alter table public.donations enable row level security;
drop policy if exists "own donations" on public.donations;
create policy "own donations" on public.donations for select using (target_id = auth.uid());

-- Jeder Besucher (auch ohne Konto) darf einmal pro Tag und Spieler spenden; max. 100 Spenden pro Spieler und Tag
create or replace function public.donate_link(target_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare t public.profiles; dkey text; ip text; amt numeric(12,2); did bigint;
begin
  select * into t from public.profiles where lower(username)=lower(trim(coalesce(target_name,''))) for update;
  if t.id is null or t.is_banned then raise exception 'Diesen Spieler gibt es nicht'; end if;
  if auth.uid() is not null then
    if auth.uid()=t.id then raise exception 'Dir selbst kannst du nichts spenden'; end if;
    dkey := 'u:'||auth.uid();
  else
    ip := split_part(coalesce(nullif(current_setting('request.headers',true),'')::json->>'x-forwarded-for','unbekannt'),',',1);
    dkey := 'ip:'||md5('kiez-spende:'||trim(ip));
  end if;
  if (select count(*) from public.donations where target_id=t.id and donation_day=current_date)>=100 then
    raise exception '% hat heute schon genug Spenden bekommen', t.username; end if;
  amt := least(round((0.05+random()*0.25)::numeric,2), greatest(0,t.cash_capacity-t.money));
  if amt<=0 then raise exception 'Der Spendenbecher von % ist gerade voll', t.username; end if;
  insert into public.donations(target_id,donor_id,donor_key,amount) values(t.id,auth.uid(),dkey,amt)
  on conflict do nothing returning id into did;
  if did is null then raise exception 'Du hast % heute schon etwas gespendet', t.username; end if;
  update public.profiles set money=money+amt, total_earned=total_earned+amt, donations_received=donations_received+1,
    donation_money=donation_money+amt where id=t.id;
  return jsonb_build_object('name',t.username,'amount',amt);
end $function$;
grant execute on function public.donate_link(text) to anon, authenticated;

-- ---------- Plunder ----------
create table if not exists public.plunder_catalog(
  id text primary key,
  name text not null,
  description text not null,
  rarity text not null check (rarity in ('gewoehnlich','selten','episch','legendaer')),
  attack integer not null default 0,
  defense integer not null default 0,
  bottle_bonus integer not null default 0,
  sell_price numeric(12,2) not null default 0,
  weight integer not null default 10,
  sort_order integer not null default 0);
alter table public.plunder_catalog enable row level security;
drop policy if exists "plunder catalog public" on public.plunder_catalog;
create policy "plunder catalog public" on public.plunder_catalog for select using (true);

insert into public.plunder_catalog(id,name,description,rarity,attack,defense,bottle_bonus,sell_price,weight,sort_order) values
 ('kronkorkenkette','Kronkorkenkette','Klimpert bei jedem Schritt. Stil ist alles.','gewoehnlich',1,1,0,0.50,40,1),
 ('alufolienkrone','Krone aus Alufolie','Für den König des Kiez.','gewoehnlich',0,2,0,0.60,40,2),
 ('ein_handschuh','Einzelner Handschuh','Der andere ist bestimmt noch irgendwo.','gewoehnlich',1,0,2,0.40,40,3),
 ('rostiger_schluessel','Rostiger Schlüssel','Passt in kein Schloss der Stadt.','gewoehnlich',2,0,0,0.50,35,4),
 ('plastikblume','Plastikblume','Welkt nie. Riecht auch nie.','gewoehnlich',0,1,3,0.70,35,5),
 ('taschenlampe','Taschenlampe ohne Batterie','Leuchtet, wenn man fest dran glaubt.','selten',2,2,5,2.00,18,6),
 ('fahrradkette','Fahrradkette','Rasselt bedrohlich.','selten',5,1,0,2.50,18,7),
 ('dosenpanzer','Dosenpanzer','Zwölf Bierdosen, ein Gürtel, viel Mut.','selten',0,6,0,2.50,18,8),
 ('glueckspfandbon','Glücks-Pfandbon','Von 1998. Gilt vielleicht noch.','selten',0,0,8,3.00,15,9),
 ('stadtplan','Zerfledderter Stadtplan','Zeigt die besten Container der Stadt.','episch',2,2,12,8.00,6,10),
 ('taubenpfeife','Taubenpfeife','Die Tauben hören auf dich. Manchmal.','episch',7,4,0,8.00,6,11),
 ('bauhelm','Bauhelm mit Lampe','Arbeitsschutz für die Nachtschicht.','episch',3,9,4,9.00,6,12),
 ('goldene_dose','Goldene Pfanddose','Die sagenumwobene 1-Euro-Dose.','legendaer',5,5,20,40.00,2,13),
 ('kiezzepter','Kiezzepter','Ein Besenstiel mit Glitzer. Respekt garantiert.','legendaer',14,8,5,40.00,2,14)
on conflict (id) do nothing;

create table if not exists public.user_plunder(
  user_id uuid not null references public.profiles(id) on delete cascade,
  plunder_id text not null references public.plunder_catalog(id),
  quantity integer not null default 1 check (quantity>=0),
  first_found_at timestamptz not null default now(),
  primary key(user_id, plunder_id));
alter table public.user_plunder enable row level security;
drop policy if exists "own plunder" on public.user_plunder;
create policy "own plunder" on public.user_plunder for select using (user_id = auth.uid());

create or replace function public.kiez_random_plunder()
returns text language sql volatile as $$
  with c as (select id, sum(weight) over (order by sort_order) as cum, sum(weight) over () as total from public.plunder_catalog),
       r as (select random()*(select max(total) from c) as x)
  select id from c, r where c.cum > r.x order by c.cum limit 1
$$;

create or replace function public.kiez_give_plunder(uid uuid, pid text)
returns void language sql as $$
  insert into public.user_plunder(user_id,plunder_id,quantity) values(uid,pid,1)
  on conflict (user_id,plunder_id) do update set quantity=public.user_plunder.quantity+1
$$;

create or replace function public.equip_plunder(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  if wanted is not null and not exists(select 1 from public.user_plunder where user_id=p.id and plunder_id=wanted and quantity>0) then
    raise exception 'Diesen Plunder hast du nicht'; end if;
  update public.profiles set equipped_plunder=wanted where id=p.id returning * into p;
  return to_jsonb(p);
end $function$;

create or replace function public.sell_plunder(wanted text, qty integer default 1)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; have int; price numeric; gross numeric(12,2); paid numeric(12,2);
begin
  p := public.kiez_actor();
  if qty is null or qty<1 then raise exception 'Ungültige Menge'; end if;
  select up.quantity, pc.sell_price into have, price from public.user_plunder up join public.plunder_catalog pc on pc.id=up.plunder_id
   where up.user_id=p.id and up.plunder_id=wanted for update of up;
  if coalesce(have,0)<qty then raise exception 'So viel davon hast du nicht'; end if;
  if p.equipped_plunder=wanted and have-qty<1 then raise exception 'Leg den Plunder erst ab'; end if;
  gross := qty*price; paid := least(gross, greatest(0,p.cash_capacity-p.money));
  update public.user_plunder set quantity=quantity-qty where user_id=p.id and plunder_id=wanted;
  delete from public.user_plunder where user_id=p.id and plunder_id=wanted and quantity=0;
  update public.profiles set money=money+paid where id=p.id returning * into p;
  return jsonb_build_object('sold',qty,'paid',paid,'lost',gross-paid,'profile',to_jsonb(p));
end $function$;

-- ---------- Kampfwerte zentral (Skills, Ausrüstung, Begleiter, Bande, Plunder, Verteidigungen) ----------
create or replace function public.kiez_attack_power(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select p.attack_skill*3 + p.streetwise
    + coalesce((select sum(s.attack) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0)
    + coalesce((select sum(pc.attack*up.attack_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0)
    + coalesce((select g.attack_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0)
    + coalesce((select attack from public.plunder_catalog where id=p.equipped_plunder),0)
$$;

create or replace function public.kiez_defense_power(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select p.defense_skill*3
    + (array[1,4,8,17,21,24,28,31,34,42,51,58,64,73,82,89,102,125,147,158])[least(greatest(p.shelter_level,1),20)]
    + coalesce((select sum(s.defense) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0)
    + coalesce((select sum(pc.defense*up.defense_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0)
    + coalesce((select g.defense_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0)
    + coalesce((select defense from public.plunder_catalog where id=p.equipped_plunder),0)
    + coalesce((select sum(amount) from public.user_active_defenses where user_id=p.id and (expires_at is null or expires_at>now())),0)
$$;

create or replace function public.attack_player(target_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare a public.profiles; d public.profiles; a_power int; d_power int; winner uuid;
  loot numeric(12,2):=0; result text; min_lvl int; max_lvl int; cost int:=15;
begin
  if target_id=auth.uid() then raise exception 'Du kannst dich nicht selbst vermöbeln'; end if;
  a := public.kiez_actor();
  perform public.kiez_assert_free(a);
  select * into d from public.profiles where id=target_id for update;
  if d.id is null or d.is_banned then raise exception 'Gegner verschwunden'; end if;
  if a.collection_ends_at is not null then raise exception 'Dein Einkaufswagen ist unterwegs oder wartet aufs Ausladen'; end if;
  if a.energy<cost then raise exception 'Nicht genug Energie für eine Prügelei'; end if;
  min_lvl := greatest(1,floor(a.level*0.8)::int); max_lvl := ceil(a.level*1.5)::int;
  if d.level<min_lvl or d.level>max_lvl then
    raise exception 'Du kannst nur Gegner von Level % bis % angreifen', min_lvl, max_lvl; end if;
  if d.jail_until is not null and d.jail_until>now() then raise exception 'Dieser Spieler sitzt im Knast'; end if;
  if d.protection_until is not null and d.protection_until>now() then raise exception 'Dieser Spieler steht noch unter Schutz'; end if;
  if exists(select 1 from public.fights where attacker_id=a.id and defender_id=target_id and created_at>now()-interval '3 hours') then
    raise exception 'Diesen Spieler hast du in den letzten 3 Stunden schon besucht'; end if;
  if exists(select 1 from public.gang_members x join public.gang_members y on x.gang_id=y.gang_id where x.user_id=a.id and y.user_id=d.id) then
    raise exception 'Du prügelst dich nicht mit deiner eigenen Bande'; end if;
  a_power := public.kiez_attack_power(a) + floor(random()*8)::int;
  d_power := public.kiez_defense_power(d) + floor(random()*8)::int;
  if a_power>d_power then
    winner:=a.id; result:='win';
    loot:=round(d.money*case when d.insurance_active then 0.05 else 0.10 end,2);
    loot:=least(loot,greatest(0,a.cash_capacity-a.money));
    update public.profiles set money=money+loot,energy=energy-cost,xp=xp+15,wins=wins+1 where id=a.id returning * into a;
    update public.profiles set money=greatest(0,money-loot),losses=losses+1,protection_until=now()+interval '5 minutes' where id=d.id;
  else
    winner:=d.id; result:='loss';
    update public.profiles set energy=energy-cost,xp=xp+3,losses=losses+1,protection_until=now()+interval '2 minutes' where id=a.id returning * into a;
    update public.profiles set wins=wins+1,xp=xp+5 where id=d.id;
  end if;
  delete from public.user_active_defenses where user_id=target_id and consume_on_attack=true and (expires_at is null or expires_at>now());
  insert into public.fights(attacker_id,defender_id,winner_id,attacker_power,defender_power,loot) values(a.id,d.id,winner,a_power,d_power,loot);
  return jsonb_build_object('result',result,'attacker_power',a_power,'defender_power',d_power,'loot',loot,'opponent',d.username,'profile',to_jsonb(a));
end $function$;

-- ---------- Wetter (fuer alle gleich, wechselt taeglich) ----------
create or replace function public.kiez_weather(d date default current_date)
returns jsonb language sql immutable as $$
  select (array[
    '{"id":"sonnig","name":"☀️ Sonnig","bonus":20}',
    '{"id":"heiter","name":"🌤️ Heiter","bonus":10}',
    '{"id":"bewoelkt","name":"⛅ Bewölkt","bonus":0}',
    '{"id":"regen","name":"🌧️ Regen","bonus":-10}',
    '{"id":"gewitter","name":"⛈️ Gewitter","bonus":-20}',
    '{"id":"schnee","name":"❄️ Schnee","bonus":-15}',
    '{"id":"volksfest","name":"🎡 Volksfest-Wetter","bonus":30}'
  ]::jsonb[])[1 + mod(abs(hashtext('kiez'||d::text)),7)]
$$;
create or replace function public.get_weather()
returns jsonb language sql stable as $$ select public.kiez_weather(current_date) || jsonb_build_object('tomorrow',public.kiez_weather(current_date+1)) $$;
grant execute on function public.get_weather() to anon, authenticated;

-- ---------- Events (vom Admin angelegt, z. B. Doppelte-Pfand-Woche) ----------
create table if not exists public.events(
  id bigint generated by default as identity primary key,
  name text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  bottle_bonus integer not null default 0,
  xp_bonus integer not null default 0,
  check (ends_at > starts_at));
alter table public.events enable row level security;
drop policy if exists "events public" on public.events;
create policy "events public" on public.events for select using (true);

create or replace function public.kiez_event_bonus(kind text)
returns integer language sql stable as $$
  select coalesce(sum(case kind when 'bottles' then bottle_bonus else xp_bonus end),0)::int
  from public.events where now() between starts_at and ends_at
$$;

-- ---------- Pfandtour: Wetter, Plunderbonus, Plunder- und Kronkorkenfunde ----------
create or replace function public.finish_collection()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; found_count int; factor numeric; efficiency numeric; alcohol_factor numeric := 1.0;
  weather jsonb := public.kiez_weather(current_date); weather_factor numeric; plunder_factor numeric := 1.0;
  gained_xp int; found_nails int; found_wood int; found_shards int; found_textile int; caps int; pl text; pl_name text;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
  if p.collection_ends_at is null then raise exception 'Keine Pfandtour aktiv'; end if;
  if p.collection_ends_at>now() then raise exception 'Der Einkaufswagen ist noch unterwegs'; end if;
  factor := (array[1.0,1.25,1.55,1.95,2.5])[least(p.area_level,5)];
  efficiency := case p.collection_minutes when 10 then 1.0 when 30 then 0.88 when 60 then 0.78 when 240 then 0.62 when 480 then 0.52 else 0.50 end;
  if p.alcohol_level >= 5 then alcohol_factor := 0.6; else alcohol_factor := 1 + least(p.alcohol_level,4.99)*0.15; end if;
  weather_factor := 1 + ((weather->>'bonus')::numeric + public.kiez_event_bonus('bottles'))/100;
  select 1 + bottle_bonus/100.0 into plunder_factor from public.plunder_catalog where id=p.equipped_plunder;
  plunder_factor := coalesce(plunder_factor,1.0);
  found_count := greatest(1,floor((p.collection_minutes/10.0)*(5+p.streetwise*0.8+(p.bag_level-1)*2)*factor*efficiency*alcohol_factor
                  *weather_factor*plunder_factor*(0.85+random()*0.30))::int);
  gained_xp := round(greatest(5,floor(p.collection_minutes/10.0)::int*2) * (1 + public.kiez_event_bonus('xp')/100.0))::int;
  found_nails := (random()<least(0.35,0.10+p.collection_minutes/480.0*0.20))::int;
  found_wood := (random()<least(0.32,0.09+p.collection_minutes/480.0*0.18))::int;
  found_shards := (random()<least(0.10,0.02+p.collection_minutes/480.0*0.06))::int;
  found_textile := (random()<least(0.28,0.08+p.collection_minutes/480.0*0.16))::int;
  caps := floor(random()*(1+p.collection_minutes/60.0))::int;
  if random() < least(0.45, 0.04+p.collection_minutes/480.0*0.36) then
    pl := public.kiez_random_plunder();
    perform public.kiez_give_plunder(p.id, pl);
    select name into pl_name from public.plunder_catalog where id=pl;
  end if;
  update public.profiles set bottles=bottles+found_count, mat_nails=mat_nails+found_nails, mat_wood=mat_wood+found_wood,
    mat_shards=mat_shards+found_shards, mat_textile=mat_textile+found_textile, bottlecaps=bottlecaps+caps,
    cleanliness=greatest(0,cleanliness-least(80,p.collection_minutes/10)), xp=xp+gained_xp,
    collection_started_at=null, collection_ends_at=null, collection_minutes=null, collection_ready_at=now()+interval '30 seconds'
  where id=p.id returning * into p;
  insert into public.daily_missions(user_id,progress) values(p.id,found_count)
  on conflict(user_id,mission_day) do update set progress=daily_missions.progress+excluded.progress;
  return jsonb_build_object('found',found_count,'xp',gained_xp,'alcohol_bonus',alcohol_factor,'weather',weather,
    'nails',found_nails,'wood',found_wood,'shards',found_shards,'textile',found_textile,'bottlecaps',caps,
    'plunder',pl,'plunder_name',pl_name,'profile',to_jsonb(p));
end $function$;

-- ---------- Kronkorken-Laden ----------
create or replace function public.bottlecap_shop(offer text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; cost int; pl text; msg text;
begin
  p := public.kiez_actor();
  cost := case offer when 'energie' then 5 when 'waschen' then 4 when 'nuechtern' then 3 when 'knast' then 8 when 'plunderkiste' then 15 else null end;
  if cost is null then raise exception 'Dieses Angebot gibt es nicht'; end if;
  if p.bottlecaps<cost then raise exception 'Dafür brauchst du % Kronkorken', cost; end if;
  case offer
    when 'energie' then
      if p.energy>=100 then raise exception 'Du bist schon voller Energie'; end if;
      update public.profiles set energy=least(100,energy+50), energy_updated_at=now() where id=p.id; msg:='+50 Energie';
    when 'waschen' then
      if p.cleanliness>=100 then raise exception 'Du bist schon blitzsauber'; end if;
      update public.profiles set cleanliness=100 where id=p.id; msg:='Frisch geduscht: 100 % Sauberkeit';
    when 'nuechtern' then
      if p.alcohol_level<=0 then raise exception 'Du bist doch schon nüchtern'; end if;
      update public.profiles set alcohol_level=0, alcohol_bonus_until=null, alcohol_updated_at=now() where id=p.id; msg:='Stocknüchtern';
    when 'knast' then
      if p.jail_until is null or p.jail_until<=now() then raise exception 'Du bist nicht im Knast'; end if;
      update public.profiles set jail_until=null, jail_bail=0 where id=p.id; msg:='Der Wärter hat weggeschaut – du bist frei';
    when 'plunderkiste' then
      pl := public.kiez_random_plunder(); perform public.kiez_give_plunder(p.id,pl);
      select 'In der Kiste: '||name into msg from public.plunder_catalog where id=pl;
  end case;
  update public.profiles set bottlecaps=bottlecaps-cost where id=p.id returning * into p;
  return jsonb_build_object('offer',offer,'cost',cost,'message',msg,'plunder',pl,'profile',to_jsonb(p));
end $function$;

-- Tagesbelohnung: zusaetzlich Kronkorken (jeder 7. Tag 5 Stueck), Geld bis cash_capacity
create or replace function public.claim_daily_reward()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; new_streak int; reward numeric(12,2); caps int;
begin
  p := public.kiez_actor();
  if p.daily_claim_date=current_date then raise exception 'Tagesbelohnung bereits abgeholt'; end if;
  new_streak := case when p.daily_claim_date=current_date-1 then p.login_streak+1 else 1 end;
  reward := least(12,2+new_streak*0.50);
  reward := least(reward, greatest(0,p.cash_capacity-p.money));
  caps := case when new_streak%7=0 then 5 else 1 end;
  update public.profiles set daily_claim_date=current_date, login_streak=new_streak, money=money+reward, xp=xp+10, bottlecaps=bottlecaps+caps
  where id=p.id returning * into p;
  return jsonb_build_object('streak',new_streak,'reward',reward,'bottlecaps',caps,'profile',to_jsonb(p));
end $function$;

-- ---------- Unterkunft: Umzug kostet jetzt Geld (war gratis) ----------
create or replace function public.move_in_house()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; next_tier int; required_social int; price numeric;
begin
  p := public.kiez_actor();
  next_tier := coalesce(p.shelter_level,1)+1;
  if next_tier>20 then raise exception 'Du wohnst schon in der besten Unterkunft'; end if;
  required_social := 2*(next_tier-1);
  if p.social_skill<required_social then raise exception 'Dafür brauchst du mehr Sozialkontakte (Stufe %)',required_social; end if;
  price := round(5*power(next_tier,2.2),2);
  if p.money<price then raise exception 'Der Umzug kostet % €', price; end if;
  update public.profiles set shelter_level=next_tier, money=money-price where id=p.id returning * into p;
  return to_jsonb(p) || jsonb_build_object('price',price);
end $function$;

-- Gesperrte Spieler duerfen nichts in die neuen Tabellen schreiben
create trigger guard_banned_actor before insert or delete or update on public.guestbook_entries for each row execute function public.block_banned_actor();
create trigger guard_banned_actor before insert or delete or update on public.friendships for each row execute function public.block_banned_actor();
create trigger guard_banned_actor before insert or delete or update on public.blocks for each row execute function public.block_banned_actor();

revoke execute on function public.kiez_give_plunder(uuid,text) from public, anon, authenticated;
revoke execute on function public.kiez_random_plunder() from public, anon, authenticated;
revoke execute on function public.kiez_attack_power(public.profiles) from public, anon, authenticated;
revoke execute on function public.kiez_defense_power(public.profiles) from public, anon, authenticated;
revoke execute on function public.kiez_blocked(uuid,uuid) from public, anon, authenticated;
