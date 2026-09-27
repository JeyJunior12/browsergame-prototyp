-- 0020: Plunderkiste überarbeiten (ROADMAP 111–120): Sets mit Bonus, neue und saisonale Stücke,
-- „Neu“-Markierung, Doppelte mit einem Klick verkaufen, Übersicht für Sammlung und Vergleich.

alter table public.plunder_catalog add column if not exists set_id text;
alter table public.plunder_catalog add column if not exists season text check (season in ('winter','fruehling','sommer','herbst'));
alter table public.user_plunder add column if not exists seen boolean not null default true;

-- ---------- Sets: alle Stücke eines Sets gesammelt → Dauerbonus (auch ohne sie anzulegen) ----------
create table if not exists public.plunder_sets(
  id text primary key, name text not null, description text not null,
  attack integer not null default 0, defense integer not null default 0, bottle_bonus integer not null default 0,
  sort_order integer not null default 0);
alter table public.plunder_sets enable row level security;
drop policy if exists plunder_sets_read on public.plunder_sets;
create policy plunder_sets_read on public.plunder_sets for select using (true);
grant select on public.plunder_sets to authenticated, anon;
grant select on public.plunder_catalog to authenticated, anon;

insert into public.plunder_sets(id,name,description,attack,defense,bottle_bonus,sort_order) values
 ('bauarbeiter','Bauarbeiter','Helm, Lampe, Handschuhe – die Nachtschicht kann kommen.',0,3,5,1),
 ('kiezadel','Kiezadel','Krone, Zepter, Goldkette: Der Kiez verneigt sich.',5,5,0,2),
 ('taubenkoenig','Taubenkönig','Die Tauben folgen dir – und finden Flaschen.',3,0,3,3),
 ('pfandjaeger','Pfandjäger','Wer diese drei hat, findet jede Flasche der Stadt.',0,0,10,4),
 ('strassenkaempfer','Straßenkämpfer','Rasseln, klimpern, zuschlagen.',4,2,0,5)
on conflict (id) do nothing;

-- Neue Stücke (120): je Seltenheit mehr Auswahl, eins nur im Winter
insert into public.plunder_catalog(id,name,description,rarity,attack,defense,bottle_bonus,sell_price,weight,sort_order,set_id,season) values
 ('leeres_feuerzeug','Leeres Feuerzeug','Macht keine Flamme, aber gute Geräusche.','gewoehnlich',1,0,1,0.40,35,15,null,null),
 ('sonnenbrille','Kaputte Sonnenbrille','Ein Glas fehlt. Cool bleibt man trotzdem.','gewoehnlich',0,1,1,0.50,35,16,null,null),
 ('arbeitshandschuhe','Arbeitshandschuhe','Riechen nach Baustelle und Ehrlichkeit.','selten',1,3,2,2.00,16,17,'bauarbeiter',null),
 ('taubenfutter','Tüte Taubenfutter','Die gefiederte Bande steht bereit.','selten',2,0,4,2.20,16,18,'taubenkoenig',null),
 ('megafon','Megafon ohne Batterie','Man hört dich trotzdem. Irgendwie.','episch',6,3,2,8.50,6,19,null,null),
 ('goldkette','Goldkette (echt vergoldet)','Glänzt wie ein Bordstein bei Regen.','legendaer',8,6,6,40.00,2,20,'kiezadel',null),
 ('weihnachtsmuetze','Weihnachtsmütze','Nur im Winter zu finden. Bimmelt.','selten',1,2,6,3.00,14,21,null,'winter')
on conflict (id) do nothing;
update public.plunder_catalog set set_id='bauarbeiter' where id in ('bauhelm','taschenlampe');
update public.plunder_catalog set set_id='kiezadel' where id in ('alufolienkrone','kiezzepter');
update public.plunder_catalog set set_id='taubenkoenig' where id in ('taubenpfeife');
update public.plunder_catalog set set_id='pfandjaeger' where id in ('glueckspfandbon','stadtplan','goldene_dose');
update public.plunder_catalog set set_id='strassenkaempfer' where id in ('fahrradkette','rostiger_schluessel','dosenpanzer');

create or replace function public.kiez_season(d date default current_date)
returns text language sql immutable as $$
  select case when extract(month from d) in (12,1,2) then 'winter' when extract(month from d) in (3,4,5) then 'fruehling'
              when extract(month from d) in (6,7,8) then 'sommer' else 'herbst' end
$$;

-- Saisonale Stücke nur in ihrer Jahreszeit
create or replace function public.kiez_random_plunder()
returns text language sql volatile as $$
  with c as (select id, sum(weight) over (order by sort_order) as cum, sum(weight) over () as total
             from public.plunder_catalog where season is null or season = public.kiez_season()),
       r as (select random()*(select max(total) from c) as x)
  select id from c, r where c.cum > r.x order by c.cum limit 1
$$;

-- Neu gefundene Stücke sind „neu“, bis man sie in der Sammlung angesehen hat
create or replace function public.kiez_give_plunder(uid uuid, pid text)
returns void language sql as $$
  insert into public.user_plunder(user_id,plunder_id,quantity,seen) values(uid,pid,1,false)
  on conflict (user_id,plunder_id) do update set quantity=public.user_plunder.quantity+1
$$;

create or replace function public.plunder_mark_seen()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare n int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  update public.user_plunder set seen=true where user_id=auth.uid() and not seen;
  get diagnostics n = row_count;
  return jsonb_build_object('marked',n);
end $function$;

-- Plunder-Bonus gesamt: angelegtes Stück + alle fertigen Sets
create or replace function public.kiez_plunder_bonus(p public.profiles)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  with done as (
    select s.* from public.plunder_sets s
    where not exists (select 1 from public.plunder_catalog c where c.set_id=s.id
                      and not exists (select 1 from public.user_plunder u where u.user_id=p.id and u.plunder_id=c.id and u.quantity>0)))
  select jsonb_build_object(
    'attack', coalesce((select attack from public.plunder_catalog where id=p.equipped_plunder),0) + coalesce((select sum(attack) from done),0),
    'defense', coalesce((select defense from public.plunder_catalog where id=p.equipped_plunder),0) + coalesce((select sum(defense) from done),0),
    'bottle', coalesce((select bottle_bonus from public.plunder_catalog where id=p.equipped_plunder),0) + coalesce((select sum(bottle_bonus) from done),0),
    'sets', coalesce((select jsonb_agg(id) from done),'[]'::jsonb))
$$;
revoke execute on function public.kiez_plunder_bonus(public.profiles) from public, anon, authenticated;

create or replace function public.kiez_attack_power(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select p.attack_skill*3 + p.streetwise
    + coalesce((select sum(s.attack) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0)
    + coalesce((select sum(pc.attack*up.attack_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0)
    + coalesce((select g.attack_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0)
    + (public.kiez_plunder_bonus(p)->>'attack')::int
$$;

create or replace function public.kiez_defense_power(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select p.defense_skill*3
    + (array[1,4,8,17,21,24,28,31,34,42,51,58,64,73,82,89,102,125,147,158])[least(greatest(p.shelter_level,1),20)]
    + coalesce((select sum(s.defense) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0)
    + coalesce((select sum(pc.defense*up.defense_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0)
    + coalesce((select g.defense_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0)
    + (public.kiez_plunder_bonus(p)->>'defense')::int
    + coalesce((select sum(amount) from public.user_active_defenses where user_id=p.id and (expires_at is null or expires_at>now())),0)
$$;

create or replace function public.combat_overview()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid();
  if p.id is null then raise exception 'Nicht angemeldet'; end if;
  return jsonb_build_object(
    'attack', jsonb_build_object(
      'base', p.attack_skill*3 + p.streetwise,
      'items', coalesce((select sum(s.attack) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0),
      'pets', coalesce((select sum(pc.attack*up.attack_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0),
      'gang', coalesce((select g.attack_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0),
      'plunder', (public.kiez_plunder_bonus(p)->>'attack')::int,
      'total', public.kiez_attack_power(p)),
    'defense', jsonb_build_object(
      'base', p.defense_skill*3,
      'shelter', (array[1,4,8,17,21,24,28,31,34,42,51,58,64,73,82,89,102,125,147,158])[least(greatest(p.shelter_level,1),20)],
      'items', coalesce((select sum(s.defense) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0),
      'pets', coalesce((select sum(pc.defense*up.defense_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0),
      'gang', coalesce((select g.defense_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0),
      'plunder', (public.kiez_plunder_bonus(p)->>'defense')::int,
      'traps', coalesce((select sum(amount) from public.user_active_defenses where user_id=p.id and (expires_at is null or expires_at>now())),0),
      'total', public.kiez_defense_power(p)),
    'equipped', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'slot',public.item_slot(s),'attack',s.attack,'defense',s.defense))
                 from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),'[]'::jsonb),
    'owned', coalesce((select jsonb_agg(i.item_id) from public.inventory i where i.user_id=p.id),'[]'::jsonb));
end $function$;

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
  plunder_factor := 1 + (public.kiez_plunder_bonus(p)->>'bottle')::int/100.0;  -- angelegter Plunder + fertige Sets
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


-- Doppelte Stücke mit einem Klick verkaufen: von jedem Stück bleibt eins übrig
create or replace function public.sell_plunder_duplicates()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; n int; gross numeric(12,2); paid numeric(12,2);
begin
  p := public.kiez_actor();
  select coalesce(sum(u.quantity-1),0), coalesce(sum((u.quantity-1)*c.sell_price),0) into n, gross
  from public.user_plunder u join public.plunder_catalog c on c.id=u.plunder_id where u.user_id=p.id and u.quantity>1;
  if n = 0 then raise exception 'Du hast keine doppelten Stücke'; end if;
  paid := least(gross, greatest(0,p.cash_capacity-p.money));
  update public.user_plunder set quantity=1 where user_id=p.id and quantity>1;
  update public.profiles set money=money+paid where id=p.id returning * into p;
  return jsonb_build_object('sold',n,'paid',paid,'lost',gross-paid,'profile',to_jsonb(p));
end $function$;

-- Übersicht für die Plunder-Seite: Sammlung (gefunden/nicht gefunden), Sets mit Fortschritt, Bonus, Preisvorschlag für den Basar
create or replace function public.plunder_overview()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid();
  if p.id is null then raise exception 'Nicht angemeldet'; end if;
  return jsonb_build_object(
    'equipped', p.equipped_plunder,
    'bonus', public.kiez_plunder_bonus(p),
    'season', public.kiez_season(),
    'found', (select count(*) from public.user_plunder where user_id=p.id and quantity>0),
    'total', (select count(*) from public.plunder_catalog),
    'items', (select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'description',c.description,'rarity',c.rarity,
                 'attack',c.attack,'defense',c.defense,'bottle_bonus',c.bottle_bonus,'sell_price',c.sell_price,'set_id',c.set_id,'season',c.season,
                 'qty',coalesce(u.quantity,0),'new',coalesce(not u.seen,false),
                 'market_price',(select round(avg(m.price),2) from public.market_listings m where m.plunder_id=c.id))
               order by c.sort_order)
              from public.plunder_catalog c left join public.user_plunder u on u.plunder_id=c.id and u.user_id=p.id),
    'sets', (select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'description',s.description,
                 'attack',s.attack,'defense',s.defense,'bottle_bonus',s.bottle_bonus,
                 'pieces',(select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,
                            'have',exists(select 1 from public.user_plunder u where u.user_id=p.id and u.plunder_id=c.id and u.quantity>0)) order by c.sort_order)
                           from public.plunder_catalog c where c.set_id=s.id)) order by s.sort_order)
             from public.plunder_sets s));
end $function$;
