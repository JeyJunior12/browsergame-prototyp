-- 0029: Fahrzeuge I (ROADMAP 53–57, 63, 64): Aufstieg Einkaufswagen → … → Wohnmobil, Führerschein (spät), Sprit, Pannen,
-- Polizeikontrolle ohne TÜV, Tuning aus Material, Schrottplatz, Revierwechsel mit Auto sofort, Anzeige im Profil.

create table if not exists public.vehicles(
  id text primary key, name text not null, sort_order integer not null, price numeric(12,2) not null, min_level integer not null,
  needs_license boolean not null default false, bonus integer not null default 0, speed integer not null default 0, fuel numeric(12,2) not null default 0,
  description text not null);
insert into public.vehicles values
 ('wagen','Einkaufswagen',0,0,1,false,0,0,0,'Quietscht, eiert, gehört dir.'),
 ('bollerwagen','Bollerwagen',1,25,5,false,10,0,0,'Mehr Platz für Kisten.'),
 ('fahrrad','Fahrrad mit Anhänger',2,120,12,false,20,10,0,'Schneller zum nächsten Container.'),
 ('lastenrad','Lastenrad',3,400,20,false,30,15,0,'Der Kofferraum des kleinen Mannes.'),
 ('mofa','Mofa',4,1500,35,true,45,25,1,'Knattert. Braucht Sprit und Führerschein.'),
 ('kombi','Rostiger Kombi',5,5000,50,true,65,30,2.5,'Rost hält zusammen, was TÜV trennen will.'),
 ('transporter','Transporter',6,15000,70,true,90,35,4,'Da passt ein halber Wertstoffhof rein.'),
 ('wohnmobil','Wohnmobil',7,40000,90,true,100,35,5,'Rollendes Zuhause mit Pfandlager.')
on conflict (id) do nothing;
alter table public.vehicles enable row level security;
drop policy if exists vehicles_read on public.vehicles;
create policy vehicles_read on public.vehicles for select using (true);
grant select on public.vehicles to authenticated, anon;

create table if not exists public.user_vehicles(
  user_id uuid not null references public.profiles(id) on delete cascade, vehicle_id text not null references public.vehicles(id),
  condition integer not null default 100 check (condition between 0 and 100), tuning jsonb not null default '{}'::jsonb,
  tuev_until timestamptz, paint text not null default '#9b3c1f' check (paint ~ '^#[0-9a-fA-F]{6}$'),
  primary key(user_id, vehicle_id));
alter table public.user_vehicles enable row level security;
drop policy if exists user_vehicles_read on public.user_vehicles;
create policy user_vehicles_read on public.user_vehicles for select using (true);
grant select on public.user_vehicles to authenticated;
alter table public.profiles add column if not exists vehicle text references public.vehicles(id) default 'wagen';
alter table public.profiles add column if not exists vehicle_breakdown boolean not null default false;
alter table public.profiles add column if not exists license_stage integer not null default 0;
alter table public.profiles add column if not exists license_ends_at timestamptz;
alter table public.profiles add column if not exists scrap_at timestamptz;
update public.profiles set vehicle='wagen' where vehicle is null;

create or replace function public.kiez_vehicle_bonus(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce((select v.bonus + case when (uv.tuning->>'motor')::boolean then 10 else 0 end + case when (uv.tuning->>'anhaenger')::boolean then 10 else 0 end
     from public.vehicles v left join public.user_vehicles uv on uv.user_id=p.id and uv.vehicle_id=v.id where v.id=p.vehicle),0)
$$;

create or replace function public.buy_vehicle(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; v public.vehicles;
begin
  p := public.kiez_actor();
  select * into v from public.vehicles where id=wanted; if v.id is null or v.id='wagen' then raise exception 'Gibt es nicht zu kaufen'; end if;
  if exists(select 1 from public.user_vehicles where user_id=p.id and vehicle_id=wanted) then raise exception 'Hast du schon'; end if;
  if p.level < v.min_level then raise exception '% gibt es erst ab Level %', v.name, v.min_level; end if;
  if v.needs_license and p.license_stage < 2 then raise exception 'Dafür brauchst du erst den Führerschein'; end if;
  if p.money < v.price then raise exception 'Dafür reicht deine Kohle nicht (% €)', v.price; end if;
  update public.profiles set money=money-v.price, vehicle=wanted where id=p.id;
  insert into public.user_vehicles(user_id,vehicle_id,tuev_until) values(p.id,wanted,case when v.needs_license then now()+interval '30 days' end);
  perform public.kiez_tick('fahrzeug',p.id,p.username||' fährt jetzt '||v.name||'.');
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('vehicle',v.name,'profile',to_jsonb(p));
end $function$;

create or replace function public.use_vehicle(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  if p.collection_ends_at is not null then raise exception 'Erst die Tour beenden'; end if;
  if wanted<>'wagen' and not exists(select 1 from public.user_vehicles where user_id=p.id and vehicle_id=wanted) then raise exception 'Das Fahrzeug hast du nicht'; end if;
  update public.profiles set vehicle=wanted where id=p.id returning * into p;
  return jsonb_build_object('profile',to_jsonb(p));
end $function$;

-- Führerschein: Theorie (ab Level 30, 60 €, 1 Std.) + Praxis (150 €, 2 Std.)
create or replace function public.license_step()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; fee numeric;
begin
  p := public.kiez_actor();
  fee := case when p.license_stage=0 then 60 else 150 end;
  if p.license_ends_at is not null then
    if p.license_ends_at > now() then raise exception 'Die Fahrschule läuft noch'; end if;
    update public.profiles set license_stage=license_stage+1, license_ends_at=null where id=p.id returning * into p;
    return jsonb_build_object('stage',p.license_stage,'done',p.license_stage>=2,'profile',to_jsonb(p));
  end if;
  if p.license_stage >= 2 then raise exception 'Du hast den Führerschein schon'; end if;
  if p.level < 30 then raise exception 'Fahrschule erst ab Level 30 – vorher bist du ein echter Fußgänger'; end if;
  if p.money < fee then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-fee,
    license_ends_at=now()+case when license_stage=0 then interval '1 hour' else interval '2 hours' end where id=p.id returning * into p;
  return jsonb_build_object('stage',p.license_stage,'ends_at',p.license_ends_at,'profile',to_jsonb(p));
end $function$;

-- TÜV (Motorfahrzeuge): 20 € für 30 Tage; Reparatur: 0,20 € je Prozent
create or replace function public.vehicle_service(kind text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; uv public.user_vehicles; v public.vehicles; price numeric;
begin
  p := public.kiez_actor();
  select * into v from public.vehicles where id=p.vehicle;
  select * into uv from public.user_vehicles where user_id=p.id and vehicle_id=p.vehicle for update;
  if uv.user_id is null then raise exception 'Der Einkaufswagen braucht keine Werkstatt'; end if;
  if kind='tuev' then
    if not v.needs_license then raise exception 'Nur Motorfahrzeuge brauchen TÜV'; end if;
    price := 20;
  elsif kind='repair' then
    if uv.condition >= 100 then raise exception 'Läuft wie neu'; end if;
    price := round((100-uv.condition)*0.20,2);
  else raise exception 'Unbekannt'; end if;
  if p.money < price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
  update public.profiles set money=money-price where id=p.id;
  if kind='tuev' then update public.user_vehicles set tuev_until=greatest(coalesce(tuev_until,now()),now())+interval '30 days' where user_id=p.id and vehicle_id=p.vehicle;
  else update public.user_vehicles set condition=100 where user_id=p.id and vehicle_id=p.vehicle; end if;
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('price',price,'profile',to_jsonb(p));
end $function$;

-- Tuning aus Material
create or replace function public.tune_vehicle(part text, color text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; uv public.user_vehicles; v public.vehicles; n int := 0; w int := 0; s int := 0; t int := 0;
begin
  p := public.kiez_actor();
  select * into v from public.vehicles where id=p.vehicle;
  select * into uv from public.user_vehicles where user_id=p.id and vehicle_id=p.vehicle for update;
  if uv.user_id is null then raise exception 'Den Einkaufswagen kann man nicht tunen'; end if;
  case part
    when 'reifen' then n:=5; w:=5;
    when 'anhaenger' then n:=10; w:=20;
    when 'motor' then if not v.needs_license then raise exception 'Ohne Motor kein Motortuning'; end if; n:=15; s:=5;
    when 'hupe' then s:=3;
    when 'lack' then t:=10; if color is null or color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Farbe wählen'; end if;
    else raise exception 'Unbekanntes Teil';
  end case;
  if part<>'lack' and (uv.tuning->>part)::boolean then raise exception 'Schon eingebaut'; end if;
  if p.mat_nails<n or p.mat_wood<w or p.mat_shards<s or p.mat_textile<t then raise exception 'Material fehlt (Nägel %, Holz %, Scherben %, Textil %)', n, w, s, t; end if;
  update public.profiles set mat_nails=mat_nails-n, mat_wood=mat_wood-w, mat_shards=mat_shards-s, mat_textile=mat_textile-t where id=p.id;
  if part='lack' then update public.user_vehicles set paint=color where user_id=p.id and vehicle_id=p.vehicle;
  else update public.user_vehicles set tuning=tuning||jsonb_build_object(part,true) where user_id=p.id and vehicle_id=p.vehicle; end if;
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('part',part,'profile',to_jsonb(p));
end $function$;

-- Schrottplatz: alle 30 Min. Autoteile ausschlachten; Material verkaufen
create or replace function public.scrapyard_dig()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; n int; w int; s int; t int;
begin
  p := public.kiez_actor(); perform public.kiez_assert_free(p);
  if p.scrap_at > now()-interval '30 minutes' then raise exception 'Der Schrottplatzwächter schaut gerade – in % Min. wieder', ceil(extract(epoch from (p.scrap_at+interval '30 minutes'-now()))/60); end if;
  if p.energy < 5 then raise exception 'Du brauchst 5 Energie'; end if;
  n := 1+floor(random()*4); w := floor(random()*3); s := floor(random()*2); t := floor(random()*2);
  update public.profiles set energy=energy-5, scrap_at=now(), cleanliness=greatest(0,cleanliness-3),
    mat_nails=mat_nails+n, mat_wood=mat_wood+w, mat_shards=mat_shards+s, mat_textile=mat_textile+t where id=p.id returning * into p;
  perform public.kiez_act(p.id,'bin');
  return jsonb_build_object('nails',n,'wood',w,'shards',s,'textile',t,'profile',to_jsonb(p));
end $function$;

create or replace function public.sell_material(kind text, qty integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric; have int;
begin
  p := public.kiez_actor();
  if qty is null or qty < 1 then raise exception 'Ungültige Menge'; end if;
  price := case kind when 'nails' then 0.05 when 'wood' then 0.04 when 'shards' then 0.15 when 'textile' then 0.08 end;
  if price is null then raise exception 'Unbekanntes Material'; end if;
  have := case kind when 'nails' then p.mat_nails when 'wood' then p.mat_wood when 'shards' then p.mat_shards else p.mat_textile end;
  if have < qty then raise exception 'So viel hast du nicht'; end if;
  update public.profiles set mat_nails=mat_nails-case when kind='nails' then qty else 0 end, mat_wood=mat_wood-case when kind='wood' then qty else 0 end,
    mat_shards=mat_shards-case when kind='shards' then qty else 0 end, mat_textile=mat_textile-case when kind='textile' then qty else 0 end where id=p.id;
  perform public.kiez_pay(p.id, round(price*qty,2));
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('paid',round(price*qty,2),'profile',to_jsonb(p));
end $function$;

create or replace function public.garage_overview()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid();
  return jsonb_build_object('active',p.vehicle,'license_stage',p.license_stage,'license_ends_at',p.license_ends_at,'scrap_ready_at',case when p.scrap_at>now()-interval '30 minutes' then p.scrap_at+interval '30 minutes' end,
    'bonus',public.kiez_vehicle_bonus(p),
    'vehicles',(select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'price',v.price,'min_level',v.min_level,'needs_license',v.needs_license,'bonus',v.bonus,'speed',v.speed,'fuel',v.fuel,'description',v.description,
        'owned',v.id='wagen' or uv.user_id is not null,'condition',uv.condition,'tuning',uv.tuning,'tuev_until',uv.tuev_until,'paint',uv.paint) order by v.sort_order)
      from public.vehicles v left join public.user_vehicles uv on uv.user_id=p.id and uv.vehicle_id=v.id));
end $function$;
create or replace function public.start_collection(duration_minutes integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; v record; uv public.user_vehicles; secs numeric; msg text := null; broke boolean := false; police numeric; tune int;
begin
  p := public.kiez_actor();
  perform public.kiez_assert_free(p);
  if p.cleanliness<20 then raise exception 'Du bist zu dreckig für die Tour – erst waschen (mindestens 20 Prozent Sauberkeit nötig)'; end if;
  if duration_minutes not in (3,5,10,30,60,240,480) then raise exception 'Ungültige Sammelzeit'; end if;
  if p.collection_ends_at is not null and p.collection_ends_at>now() then raise exception 'Der Einkaufswagen ist noch unterwegs'; end if;
  if p.collection_ends_at is not null then raise exception 'Erst den Einkaufswagen ausladen'; end if;
  if p.collection_ready_at is not null and p.collection_ready_at>now() then raise exception 'Der Einkaufswagen braucht noch Pause'; end if;
  secs := duration_minutes*60;
  select * into v from public.vehicles where id=p.vehicle;
  if v.id is not null and v.id<>'wagen' then
    select * into uv from public.user_vehicles where user_id=p.id and vehicle_id=v.id for update;
    if v.needs_license and p.license_stage < 2 then raise exception 'Für % brauchst du einen Führerschein', v.name; end if;
    if v.fuel > 0 then
      if p.money < v.fuel then raise exception 'Kein Geld für Sprit (% €) – fahr mit dem Einkaufswagen', v.fuel; end if;
      update public.profiles set money=money-v.fuel where id=p.id;
    end if;
    tune := 0; if (uv.tuning->>'reifen')::boolean then tune := 5; end if;
    secs := secs * (1 - (v.speed + tune)/100.0);
    -- Panne: 3 % + mehr bei schlechtem Zustand → Tour dauert 50 % länger
    if random() < 0.03 + (100-uv.condition)/400.0 then broke := true; secs := secs*1.5; msg := 'Panne! Die Tour dauert länger. Reparieren am Schrottplatz.'; end if;
    -- Polizeikontrolle ohne TÜV (Motorfahrzeuge): 10 % → 10 € Strafe
    police := 0.10; if (uv.tuning->>'hupe')::boolean then police := 0.07; end if;
    if v.needs_license and (uv.tuev_until is null or uv.tuev_until < now()) and random() < police then
      update public.profiles set money=greatest(0,money-10) where id=p.id; msg := coalesce(msg||' ','')||'Polizeikontrolle ohne TÜV: 10 € Strafe.'; end if;
    update public.user_vehicles set condition=greatest(0,condition-2) where user_id=p.id and vehicle_id=v.id;
  end if;
  update public.profiles set collection_started_at=now(),collection_ends_at=now()+make_interval(secs=>greatest(60,secs)),collection_minutes=duration_minutes, vehicle_breakdown=broke
  where id=p.id returning * into p;
  return to_jsonb(p) || jsonb_build_object('vehicle_message',msg);
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
  efficiency := case p.collection_minutes when 3 then 1.0 when 5 then 1.0 when 10 then 1.0 when 30 then 0.88 when 60 then 0.78 when 240 then 0.62 when 480 then 0.52 else 0.50 end;
  if p.alcohol_level >= 5 then alcohol_factor := 0.6; else alcohol_factor := 1 + least(p.alcohol_level,4.99)*0.15; end if;
  weather_factor := 1 + ((weather->>'bonus')::numeric + public.kiez_event_bonus('bottles'))/100;
  plunder_factor := 1 + (public.kiez_plunder_bonus(p)->>'bottle')::int/100.0;  -- angelegter Plunder + fertige Sets
  plunder_factor := plunder_factor * (1 + public.kiez_vehicle_bonus(p)/100.0);  -- Fahrzeug (0029)
  found_count := greatest(1,floor((p.collection_minutes/10.0)*(5+p.streetwise*0.8+(p.bag_level-1)*2)*factor*efficiency*alcohol_factor
                  *weather_factor*plunder_factor*(0.85+random()*0.30))::int);
  gained_xp := round(greatest(case when p.collection_minutes<10 then 2 else 5 end,floor(p.collection_minutes/10.0)::int*2) * (1 + public.kiez_event_bonus('xp')/100.0))::int;
  found_nails := (random()<least(0.35,0.10+p.collection_minutes/480.0*0.20))::int;
  found_wood := (random()<least(0.32,0.09+p.collection_minutes/480.0*0.18))::int;
  found_shards := (random()<least(0.10,0.02+p.collection_minutes/480.0*0.06))::int;
  found_textile := (random()<least(0.28,0.08+p.collection_minutes/480.0*0.16))::int;
  caps := floor(random()*(1+p.collection_minutes/60.0))::int;
  if random() < least(0.45, 0.04+p.collection_minutes/480.0*0.36)*least(1.0,p.collection_minutes/10.0) then
    pl := public.kiez_random_plunder();
    perform public.kiez_give_plunder(p.id, pl);
    select name into pl_name from public.plunder_catalog where id=pl;
  end if;
  update public.profiles set bottles=bottles+found_count, mat_nails=mat_nails+found_nails, mat_wood=mat_wood+found_wood,
    mat_shards=mat_shards+found_shards, mat_textile=mat_textile+found_textile, bottlecaps=bottlecaps+caps,
    cleanliness=greatest(0,cleanliness-least(80,p.collection_minutes/10)), xp=xp+gained_xp,
    collection_started_at=null, collection_ends_at=null, collection_minutes=null, collection_ready_at=now()+interval '30 seconds', vehicle_breakdown=false
  where id=p.id returning * into p;
  insert into public.daily_missions(user_id,progress) values(p.id,found_count)
  on conflict(user_id,mission_day) do update set progress=daily_missions.progress+excluded.progress;
  return jsonb_build_object('found',found_count,'xp',gained_xp,'alcohol_bonus',alcohol_factor,'weather',weather,
    'nails',found_nails,'wood',found_wood,'shards',found_shards,'textile',found_textile,'bottlecaps',caps,
    'plunder',pl,'plunder_name',pl_name,'profile',to_jsonb(p));
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
  if wanted='villen' and public.kiez_clean_tier(p.cleanliness) <> 'gepflegt' then
    raise exception 'Im Villenviertel lässt man nur Gepflegte rein (Sauberkeit ab 80 %%)'; end if;
  if p.district=wanted then raise exception 'Das ist schon dein Revier'; end if;
  -- Ohne Motorfahrzeug einmal am Tag, mit Mofa/Auto jederzeit (0029)
  if p.district is not null and p.district_changed_at > now()-interval '1 day'
     and not coalesce((select needs_license from public.vehicles where id=p.vehicle),false) then
    raise exception 'Zu Fuß kannst du dein Revier nur einmal am Tag wechseln – mit Mofa oder Auto geht es sofort';
  end if;
  update public.profiles set district=wanted, district_changed_at=now() where id=p.id returning * into p;
  return jsonb_build_object('district',nm,'profile',to_jsonb(p));
end $function$;
