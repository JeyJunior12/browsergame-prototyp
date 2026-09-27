-- 0019: Schnorrplätze-Seite (ROADMAP 135–140) und Stadtteile vorerst sperren (121–122)

-- ---------- Schalter für Funktionen, die genug Mitspieler brauchen ----------
create table if not exists public.feature_flags(
  key text primary key,
  enabled boolean not null default false,      -- vom Admin fest eingeschaltet
  min_players integer,                         -- oder automatisch ab so vielen aktiven Spielern (letzte 7 Tage)
  label text not null
);
insert into public.feature_flags(key,enabled,min_players,label) values ('districts',false,50,'Stadtteile')
on conflict (key) do nothing;
alter table public.feature_flags enable row level security;
drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read on public.feature_flags for select to authenticated using (true);
grant select on public.feature_flags to authenticated;

-- Aktive Spieler = in den letzten 7 Tagen etwas gemacht (kiez_actor frischt energy_updated_at auf)
create or replace function public.kiez_active_players()
returns integer language sql stable security definer set search_path to 'public' as $function$
  select count(*)::int from public.profiles where not is_banned and energy_updated_at > now() - interval '7 days';
$function$;

create or replace function public.kiez_feature_on(k text)
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((select f.enabled or (f.min_players is not null and public.kiez_active_players() >= f.min_players)
                   from public.feature_flags f where f.key = k), false);
$function$;

-- Admin schaltet eine Funktion fest ein/aus
create or replace function public.admin_set_feature(k text, on_off boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then raise exception 'Nur für die Kiezaufsicht'; end if;
  update public.feature_flags set enabled = on_off where key = k;
  if not found then raise exception 'Unbekannter Schalter'; end if;
  return jsonb_build_object('key', k, 'enabled', on_off, 'active', public.kiez_feature_on(k));
end $function$;

-- ---------- Stadtteile: gesperrt, solange der Schalter aus ist; Daten bleiben erhalten ----------
create or replace function public.kiez_track_district()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare pts int; d text; g uuid;
begin
  if not public.kiez_feature_on('districts') then return new; end if;  -- Einfluss-Wertung pausiert
  pts := (new.bottles - case when tg_op='UPDATE' then old.bottles else 0 end)
       + 20*(new.wins - case when tg_op='UPDATE' then old.wins else 0 end);
  if pts > 0 then
    select district into d from public.profiles where id=new.user_id;
    select gang_id into g from public.gang_members where user_id=new.user_id;
    if d is not null and g is not null then
      insert into public.district_influence(district_id,gang_id,week_start,points) values(d,g,new.week_start,pts)
      on conflict (district_id,gang_id,week_start) do update set points=public.district_influence.points+excluded.points;
    end if;
  end if;
  return new;
end $function$;

create or replace function public.choose_district(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; nm text;
begin
  p := public.kiez_actor();
  if not public.kiez_feature_on('districts') then
    raise exception 'Stadtteile öffnen, sobald genug Leute im Kiez sind – bald verfügbar'; end if;
  select name into nm from public.districts where id=wanted;
  if nm is null then raise exception 'Diesen Stadtteil gibt es nicht'; end if;
  if p.district=wanted then raise exception 'Das ist schon dein Revier'; end if;
  if p.district is not null and p.district_changed_at > now()-interval '1 day' then
    raise exception 'Du kannst dein Revier nur einmal am Tag wechseln';
  end if;
  update public.profiles set district=wanted, district_changed_at=now() where id=p.id returning * into p;
  return jsonb_build_object('district',nm,'profile',to_jsonb(p));
end $function$;

create or replace function public.district_overview()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); myg uuid; res jsonb; on_ boolean := public.kiez_feature_on('districts');
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  if on_ then perform public.resolve_districts(); end if;
  select gang_id into myg from public.gang_members where user_id=me;
  select jsonb_agg(jsonb_build_object(
    'id',d.id,'name',d.name,'description',d.description,
    'owner',(select g.name from public.district_owners o join public.gangs g on g.id=o.gang_id where o.district_id=d.id and o.week_start=public.kiez_week(current_date)),
    'owner_id',(select o.gang_id from public.district_owners o where o.district_id=d.id and o.week_start=public.kiez_week(current_date)),
    'top',coalesce((select jsonb_agg(jsonb_build_object('gang',g.name,'gang_id',g.id,'points',i.points) order by i.points desc)
            from (select * from public.district_influence where district_id=d.id and week_start=public.kiez_week(current_date) order by points desc limit 3) i
            join public.gangs g on g.id=i.gang_id),'[]'::jsonb),
    'mine',coalesce((select points from public.district_influence where district_id=d.id and gang_id=myg and week_start=public.kiez_week(current_date)),0),
    'players',(select count(*) from public.profiles where district=d.id)) order by d.sort_order) into res
  from public.districts d;
  return jsonb_build_object('districts',res,'my_district',(select district from public.profiles where id=me),'my_gang',myg,
    'week_ends',public.kiez_week(current_date)+7,
    'enabled',on_,'active_players',public.kiez_active_players(),
    'needed',(select min_players from public.feature_flags where key='districts'),
    'is_admin',coalesce((select is_admin from public.profiles where id=me),false));
end $function$;

-- ---------- Schnorren: Protokoll pro Platz, Bonus sichtbar ----------
create table if not exists public.beg_log(
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  spot text not null,
  donations integer not null,
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists beg_log_user_time on public.beg_log(user_id, created_at desc);
alter table public.beg_log enable row level security;
drop policy if exists beg_log_own on public.beg_log;
create policy beg_log_own on public.beg_log for select to authenticated using (user_id = auth.uid());
grant select on public.beg_log to authenticated;

-- Bonus-Faktoren wie in beg_at_spot (eine Stelle für Anzeige und Rechnung)
create or replace function public.kiez_beg_factors(p public.profiles)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare sym int; f_pet numeric; f_clean numeric; f_speech numeric;
begin
  select coalesce(max(pc.health*up.level),0) into sym from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id
  where up.user_id=p.id and up.active;
  f_pet := least(3.0, 1 + coalesce(sym,0)/200.0);
  f_clean := 0.5 + p.cleanliness/200.0;
  f_speech := 1 + least(p.speech_skill,150)*0.01;
  return jsonb_build_object('sympathy',sym,'pet',round(f_pet,3),'clean',round(f_clean,3),'speech',round(f_speech,3),
    'total',round(f_pet*f_clean*f_speech,3));
end $function$;
revoke execute on function public.kiez_beg_factors(public.profiles) from public, anon, authenticated;

create or replace function public.beg_at_spot(spot_id text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; rate numeric; need_area int; wait_s int; cost int:=5; cnt int; f jsonb;
  gross numeric(12,2); paid numeric(12,2);
begin
  p := public.kiez_actor();
  perform public.kiez_assert_free(p);
  case spot_id
    when 'strasse'           then rate:=0.08; need_area:=1; wait_s:=20;
    when 'englischer_garten' then rate:=0.10; need_area:=1; wait_s:=20;
    when 'bahnhof'           then rate:=0.20; need_area:=2; wait_s:=25;
    when 'fussgaengerzone'   then rate:=0.30; need_area:=3; wait_s:=30;
    when 'jahrmarkt'         then rate:=0.50; need_area:=4; wait_s:=30;
    when 'oper'              then rate:=0.80; need_area:=5; wait_s:=40;
    else raise exception 'Diesen Schnorrplatz gibt es nicht';
  end case;
  if p.area_level<need_area then raise exception 'Diesen Platz schaltest du mit Sammelgebiet % frei', need_area; end if;
  if p.last_beg_at is not null and p.last_beg_at>now()-make_interval(secs=>wait_s) then
    raise exception 'Die Leute kennen deine Geschichte inzwischen. Warte kurz'; end if;
  if p.energy<cost then raise exception 'Nicht genug Energie zum Schnorren'; end if;
  f := public.kiez_beg_factors(p);
  cnt:=1+floor(random()*10)::int;
  gross:=round(cnt*rate*(f->>'total')::numeric,2);
  paid:=least(gross,greatest(0,p.cash_capacity-p.money));
  update public.profiles set money=money+paid,total_earned=total_earned+paid,energy=energy-cost,last_beg_at=now(),xp=xp+1
  where id=p.id returning * into p;
  insert into public.beg_log(user_id,spot,donations,total) values(p.id,spot_id,cnt,paid);
  return jsonb_build_object('spot',spot_id,'count',cnt,'rate',rate,'sympathy',(f->>'sympathy')::int,'total',paid,
    'gross',gross,'paid',paid,'lost',gross-paid,'profile',to_jsonb(p));
end $function$;

-- Übersicht für die Seite: Bonus, heute verdient pro Platz, bester Platz, nächster freier Zeitpunkt
create or replace function public.beg_overview()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'Nicht angemeldet'; end if;
  delete from public.beg_log where user_id = p.id and created_at < now() - interval '30 days';
  return jsonb_build_object(
    'area_level', p.area_level, 'cleanliness', p.cleanliness, 'speech', p.speech_skill,
    'bonus', public.kiez_beg_factors(p),
    'last_beg_at', p.last_beg_at,
    'spots', coalesce((select jsonb_object_agg(spot, jsonb_build_object('today',t,'times',n,'best',b)) from (
        select spot, sum(total) t, count(*) n, max(total) b from public.beg_log
        where user_id = p.id and created_at >= date_trunc('day', now()) group by spot) x), '{}'::jsonb),
    'today', coalesce((select sum(total) from public.beg_log where user_id = p.id and created_at >= date_trunc('day', now())), 0),
    'best_spot', (select spot from public.beg_log where user_id = p.id and created_at > now() - interval '7 days'
                  group by spot order by sum(total)/count(*) desc limit 1));
end $function$;
