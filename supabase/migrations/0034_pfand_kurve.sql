-- Balancing aus dem Durchspiel-Test (S19): Straßenkenntnis wirkt abflachend auf die Pfandmenge.
-- Vorher 5 + 0,8×Stufe → ab Level ~40 Geld im Überfluss (Simulation: Tag 240 = 1 Mio. voll, nichts mehr zu kaufen).
-- Jetzt 5 + 4×√Stufe: Stufe 10 etwas mehr als vorher, Stufe 150 nur noch ~45 % → rund 3.000–3.500 €/Tag für Aktive.
CREATE OR REPLACE FUNCTION public.finish_collection()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  found_count := greatest(1,floor((p.collection_minutes/10.0)*(5+4*sqrt(greatest(p.streetwise,0))+(p.bag_level-1)*2)*factor*efficiency*alcohol_factor
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
end $function$

;
