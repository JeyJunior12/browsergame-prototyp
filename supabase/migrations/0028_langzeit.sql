-- 0028: Langzeit (ROADMAP 6–9, 14, 36): Kiez-Saison (Belohnungsleiter über 4 Wochen), Feiertags-Events mit eigenem Plunder,
-- Kiez-Legende (Neustart ab Level 150 mit Dauerbonus), mehr Ranglisten, Statistik-Verlauf. (6 Sammelalbum = Plunder-Sets aus 0020.)

-- ---------- 9: Kiez-Legende ----------
alter table public.profiles add column if not exists legend integer not null default 0;
-- Level wird nie herabgestuft – außer beim Legenden-Neustart (Sitzungsschalter)
create or replace function public.sync_level()
returns trigger language plpgsql as $function$
begin
  if coalesce(current_setting('kiez.rebirth',true),'')='1' then new.level := public.kiez_level(new.xp);
  else new.level := greatest(new.level, public.kiez_level(new.xp)); end if;
  return new;
end $function$;

create or replace function public.become_legend()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  if p.level < 150 then raise exception 'Kiez-Legende wirst du erst mit Level 150'; end if;
  perform set_config('kiez.rebirth','1',true);
  update public.profiles set legend=legend+1, xp=0, level=1,
    attack_skill=1, defense_skill=1, streetwise=1, social_skill=1, music_skill=0, stamina=1, speech_skill=1, pickpocket_skill=1,
    money=least(money,50), bottles=0, area_level=1
  where id=p.id returning * into p;
  perform set_config('kiez.rebirth','',true);
  perform public.kiez_tick('legende',p.id,p.username||' ist jetzt Kiez-Legende Nr. '||p.legend||' und fängt von vorn an!');
  return jsonb_build_object('legend',p.legend,'profile',to_jsonb(p));
end $function$;

-- ---------- 7: Kiez-Saison (4 Wochen, kostenlose Belohnungsleiter) ----------
create or replace function public.kiez_season_no(d date default current_date) returns integer language sql immutable as $$ select ((d - date '2026-09-21')/28)::int $$;
create or replace function public.kiez_season_start(n integer) returns date language sql immutable as $$ select date '2026-09-21' + n*28 $$;
create table if not exists public.season_claims(user_id uuid not null references public.profiles(id) on delete cascade, season integer not null, tier integer not null, primary key(user_id,season,tier));
alter table public.season_claims enable row level security;
drop policy if exists season_claims_own on public.season_claims;
create policy season_claims_own on public.season_claims for select using (user_id=auth.uid());
grant select on public.season_claims to authenticated;

-- 20 Stufen, je 40 Saisonpunkte; Punkte = Aktionen dieser Saison (Flaschen zählen je 10 als 1)
create or replace function public.kiez_season_points(uid uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(case when kind='bottles' then amount/10 else amount end),0)::int
  from public.kiez_actions where user_id=uid and created_at >= public.kiez_season_start(public.kiez_season_no())
$$;
create or replace function public.kiez_season_reward(tier integer)
returns jsonb language sql immutable as $$
  select case when tier % 5 = 0 then jsonb_build_object('caps',tier,'money',tier*1.0,'plunder',tier>=10)
              when tier % 2 = 0 then jsonb_build_object('caps',3,'money',0,'plunder',false)
              else jsonb_build_object('caps',0,'money',1+tier*0.25,'plunder',false) end
$$;
create or replace function public.season_status()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); n int := public.kiez_season_no(); pts int;
begin
  pts := public.kiez_season_points(me);
  return jsonb_build_object('season',n+1,'ends',public.kiez_season_start(n+1),'points',pts,'per_tier',40,
    'tiers',(select jsonb_agg(jsonb_build_object('tier',t,'need',t*40,'reward',public.kiez_season_reward(t),
        'claimed',exists(select 1 from public.season_claims c where c.user_id=me and c.season=n and c.tier=t)) order by t) from generate_series(1,20) t));
end $function$;
create or replace function public.claim_season_tier(tier integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; n int := public.kiez_season_no(); r jsonb; pl text;
begin
  p := public.kiez_actor();
  if tier < 1 or tier > 20 then raise exception 'Ungültige Stufe'; end if;
  if public.kiez_season_points(p.id) < tier*40 then raise exception 'Noch nicht erreicht'; end if;
  insert into public.season_claims(user_id,season,tier) values(p.id,n,tier) on conflict do nothing;
  if not found then raise exception 'Schon abgeholt'; end if;
  r := public.kiez_season_reward(tier);
  update public.profiles set bottlecaps=bottlecaps+(r->>'caps')::int where id=p.id;
  if (r->>'money')::numeric > 0 then perform public.kiez_pay(p.id,(r->>'money')::numeric); end if;
  if (r->>'plunder')::boolean then pl := public.kiez_random_plunder(); perform public.kiez_give_plunder(p.id,pl); end if;
  select * into p from public.profiles where id=p.id;
  return r || jsonb_build_object('plunder_name',(select name from public.plunder_catalog where id=pl),'profile',to_jsonb(p));
end $function$;

-- ---------- 8: Feiertags-Events mit eigenem Plunder ----------
alter table public.plunder_catalog drop constraint if exists plunder_catalog_season_check;
alter table public.plunder_catalog add constraint plunder_catalog_season_check check (season in ('winter','fruehling','sommer','herbst','advent','ostern','halloween','silvester'));
insert into public.plunder_catalog(id,name,description,rarity,attack,defense,bottle_bonus,sell_price,weight,sort_order,set_id,season) values
 ('kuerbislaterne','Kürbislaterne','Grinst gruselig. Leuchtet nicht.','selten',2,2,5,3.00,14,22,null,'halloween'),
 ('schokohase','Schoko-Osterhase (angebissen)','Ohr fehlt. Schmeckt trotzdem.','selten',0,3,6,3.00,14,23,null,'ostern'),
 ('lebkuchenherz','Lebkuchenherz „Kiezkönig“','Vom Adventsmarkt. Hart wie Stein.','episch',4,4,8,8.00,6,24,null,'advent'),
 ('wunderkerze','Abgebrannte Wunderkerze','Silvester war wild.','selten',3,1,4,3.00,14,25,null,'silvester'),
 ('wasserpistole','Wasserpistole','Für heiße Tage im Park.','gewoehnlich',2,0,2,0.80,30,26,null,'sommer')
on conflict (id) do nothing;

create or replace function public.kiez_easter(y integer)
returns date language plpgsql immutable as $function$
declare a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int; mo int; dy int;
begin
  a := y%19; b := y/100; c := y%100; d := b/4; e := b%4; f := (b+8)/25; g := (b-f+1)/3; h := (19*a+b-d-g+15)%30;
  i := c/4; k := c%4; l := (32+2*e+2*i-h-k)%7; m := (a+11*h+22*l)/451; mo := (h+l-7*m+114)/31; dy := ((h+l-7*m+114)%31)+1;
  return make_date(y,mo,dy);
end $function$;
create or replace function public.kiez_holiday(d date default current_date)
returns text language sql stable as $$
  select case when extract(month from d)=12 and extract(day from d) between 1 and 24 then 'advent'
              when (extract(month from d)=12 and extract(day from d)=31) or (extract(month from d)=1 and extract(day from d)=1) then 'silvester'
              when d between public.kiez_easter(extract(year from d)::int)-3 and public.kiez_easter(extract(year from d)::int)+1 then 'ostern'
              when extract(month from d)=10 and extract(day from d) between 29 and 31 then 'halloween' end
$$;
-- Saison- und Feiertagsstücke nur zu ihrer Zeit
create or replace function public.kiez_random_plunder()
returns text language sql volatile as $$
  with c as (select id, sum(weight) over (order by sort_order) as cum, sum(weight) over () as total
             from public.plunder_catalog where season is null or season = public.kiez_season() or season = public.kiez_holiday()),
       r as (select random()*(select max(total) from c) as x)
  select id from c, r where c.cum > r.x order by c.cum limit 1
$$;
-- Feiertags-Event automatisch anlegen (Pfand/Punkte-Bonus in der Events-Tabelle)
create or replace function public.kiez_holiday_event_ensure()
returns void language plpgsql security definer set search_path to 'public' as $function$
declare h text := public.kiez_holiday();
begin
  if h is null or exists(select 1 from public.events where name like '%'||initcap(h)||'%' and now() between starts_at and ends_at) then return; end if;
  insert into public.events(name,description,starts_at,ends_at,bottle_bonus,xp_bonus) values(
    case h when 'advent' then 'Advent im Kiez' when 'silvester' then 'Silvester im Kiez' when 'ostern' then 'Ostern im Kiez' else 'Halloween im Kiez' end,
    case h when 'advent' then 'Glühweinbecher überall: mehr Pfand, und das Lebkuchenherz ist zu finden.' when 'silvester' then 'Scherben und Sektflaschen: Pfand satt!' when 'ostern' then 'Eiersuche im Park – der Schoko-Osterhase versteckt sich im Plunder.' else 'Gruselnacht: die Kürbislaterne lässt sich finden.' end,
    date_trunc('day',now()), date_trunc('day',now())+interval '1 day', 25, 10);
end $function$;
revoke execute on function public.kiez_holiday_event_ensure() from public, anon, authenticated;

-- ---------- 14: mehr Ranglisten ----------
create or replace function public.rankings(kind text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
begin
  perform public.kiez_holiday_event_ensure();
  return coalesce((select jsonb_agg(x) from (
    select p.id, p.username as name, p.level,
      case kind when 'tiere' then p.pet_wins::numeric when 'geld' then round(p.money+p.bank_balance,2) when 'flaschen' then coalesce((select sum(w.bottles) from public.weekly_scores w where w.user_id=p.id),0)::numeric
                when 'quote' then round(100.0*p.wins/greatest(1,p.wins+p.losses),1) when 'legende' then p.legend::numeric else p.xp::numeric end as value
    from public.profiles p where not p.is_banned and (kind<>'quote' or p.wins+p.losses>=20)
    order by 4 desc, p.username limit 20) x),'[]'::jsonb);
end $function$;

-- ---------- 36: Statistik-Verlauf ----------
create table if not exists public.stats_daily(
  user_id uuid not null references public.profiles(id) on delete cascade, day date not null,
  xp integer not null, money numeric(14,2) not null, bottles_total integer not null, wins integer not null,
  primary key(user_id, day));
alter table public.stats_daily enable row level security;
drop policy if exists stats_daily_own on public.stats_daily;
create policy stats_daily_own on public.stats_daily for select using (user_id=auth.uid());
grant select on public.stats_daily to authenticated;
create or replace function public.stats_history()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid();
  if p.id is null then raise exception 'Nicht angemeldet'; end if;
  insert into public.stats_daily(user_id,day,xp,money,bottles_total,wins)
  values(p.id,current_date,p.xp,p.money+p.bank_balance,coalesce((select sum(bottles) from public.weekly_scores where user_id=p.id),0),p.wins)
  on conflict (user_id,day) do update set xp=excluded.xp, money=excluded.money, bottles_total=excluded.bottles_total, wins=excluded.wins;
  delete from public.stats_daily where user_id=p.id and day < current_date-90;
  return coalesce((select jsonb_agg(jsonb_build_object('day',day,'xp',xp,'money',money,'bottles',bottles_total,'wins',wins) order by day)
    from public.stats_daily where user_id=p.id and day >= current_date-30),'[]'::jsonb);
end $function$;
create or replace function public.kiez_attack_power(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select p.attack_skill*3 + p.streetwise
    + coalesce((select sum(s.attack) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0)
    + coalesce((select sum(pc.attack*up.attack_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0)
    + coalesce((select g.attack_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0) + public.kiez_zwinger_bonus(p.id)
    + (public.kiez_plunder_bonus(p)->>'attack')::int
    + 3*p.legend
$$;

create or replace function public.kiez_defense_power(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select p.defense_skill*3
    + (array[1,4,8,17,21,24,28,31,34,42,51,58,64,73,82,89,102,125,147,158])[least(greatest(p.shelter_level,1),20)]
    + coalesce((select sum(s.defense) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0)
    + coalesce((select sum(pc.defense*up.defense_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0)
    + coalesce((select g.defense_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0) + public.kiez_zwinger_bonus(p.id)
    + (public.kiez_plunder_bonus(p)->>'defense')::int
    + coalesce((select sum(amount) from public.user_active_defenses where user_id=p.id and (expires_at is null or expires_at>now())),0)
    + public.kiez_stench_defense(p)
    + 3*p.legend
$$;

create or replace function public.kiez_event_bonus(kind text)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce((select sum(case kind when 'bottles' then bottle_bonus else xp_bonus end) from public.events where now() between starts_at and ends_at),0)::int
       + case when kind='bottles' and public.kiez_time()='happyhour' then 10 else 0 end
       + case when kind='bottles' and public.kiez_daytime()='nacht' then 10 else 0 end
       + public.kiez_city_bonus(case when kind='bottles' then 'bottles' else 'xp' end)
       + case when kind='bottles' and exists(select 1 from public.profiles me join public.profiles pa on pa.id=me.duo_with
             where me.id=auth.uid() and me.duo_until>now() and pa.collection_ends_at is not null and pa.collection_ends_at > now()-interval '30 minutes') then 15 else 0 end
       + case when kind='bottles' then 5*coalesce((select legend from public.profiles where id=auth.uid()),0) else 0 end
$$;
