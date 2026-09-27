-- 0021: Körperpflege mit Sinn, Hunger, Sucht & Entzug (ROADMAP 78–85, 24, 25)
-- Sauberkeit sinkt mit der Zeit (−1 %/Std., beim Friseur 24 Std. nur halb so schnell) und durch Kämpfe/Verbrechen.
-- Stufen: gepflegt ≥ 80 · normal ≥ 50 · schmuddelig ≥ 20 · verwahrlost < 20 – mit Folgen für Schnorren, Musik, Läden, Kampf, Gesundheit.
-- Hunger sinkt 4 %/Std.; wer hungert, bekommt langsamer Energie. Wer tagelang über 2 ‰ bleibt, wird süchtig; nüchtern → Entzug.

alter table public.profiles
  add column if not exists hunger integer not null default 100,
  add column if not exists hunger_updated_at timestamptz not null default now(),
  add column if not exists clean_updated_at timestamptz not null default now(),
  add column if not exists dirty_since timestamptz,
  add column if not exists sick_until timestamptz,
  add column if not exists addiction integer not null default 0,
  add column if not exists addiction_updated_at timestamptz not null default now(),
  add column if not exists barber_until timestamptz,
  add column if not exists fountain_at timestamptz;

create or replace function public.kiez_clean_tier(c integer)
returns text language sql immutable as $$
  select case when c >= 80 then 'gepflegt' when c >= 50 then 'normal' when c >= 20 then 'schmuddelig' else 'verwahrlost' end
$$;

create or replace function public.kiez_promille(p public.profiles)
returns numeric language sql stable as $$
  select greatest(0, p.alcohol_level - extract(epoch from (now()-p.alcohol_updated_at))/3600*0.5)
$$;

-- Körper fortschreiben (wird von kiez_actor bei jeder Aktion aufgerufen)
create or replace function public.kiez_body_tick(p public.profiles)
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare h numeric; lost int; rate numeric; hg int; ah numeric; prom numeric;
begin
  -- Sauberkeit: 1 % pro Stunde, beim Friseur-Bonus 0,5 %
  rate := case when p.barber_until > now() then 0.5 else 1.0 end;
  h := extract(epoch from (now()-p.clean_updated_at))/3600;
  lost := floor(h*rate)::int;
  if lost > 0 then
    p.cleanliness := greatest(0, p.cleanliness - lost);
    p.clean_updated_at := p.clean_updated_at + make_interval(secs => lost/rate*3600);
  end if;
  -- dauerhaft verwahrlost (24 Std.) → krank für 48 Std.
  if p.cleanliness >= 20 then p.dirty_since := null;
  elsif p.dirty_since is null then p.dirty_since := now();
  elsif p.dirty_since < now()-interval '24 hours' and coalesce(p.sick_until, now()-interval '1 second') < now() then
    p.sick_until := now()+interval '48 hours'; p.dirty_since := now();
    perform public.kiez_notify(p.id,'krank','Du bist krank geworden – zu lange verwahrlost. Energie kommt nur halb so schnell. Die Apotheke hilft.');
  end if;
  -- Hunger: 4 % pro Stunde
  hg := floor(extract(epoch from (now()-p.hunger_updated_at))/3600*4)::int;
  if hg > 0 then
    p.hunger := greatest(0, p.hunger - hg);
    p.hunger_updated_at := p.hunger_updated_at + make_interval(secs => hg/4.0*3600);
  end if;
  -- Sucht: je Stunde über 2 ‰ +2, sonst −1
  ah := floor(extract(epoch from (now()-p.addiction_updated_at))/3600);
  if ah >= 1 then
    prom := public.kiez_promille(p);
    p.addiction := least(100, greatest(0, p.addiction + case when prom >= 2 then 2*ah else -ah end))::int;
    p.addiction_updated_at := p.addiction_updated_at + make_interval(hours => ah::int);
  end if;
  update public.profiles set cleanliness=p.cleanliness, clean_updated_at=p.clean_updated_at, dirty_since=p.dirty_since, sick_until=p.sick_until,
    hunger=p.hunger, hunger_updated_at=p.hunger_updated_at, addiction=p.addiction, addiction_updated_at=p.addiction_updated_at
  where id=p.id returning * into p;
  return p;
end $function$;
revoke execute on function public.kiez_body_tick(public.profiles) from public, anon, authenticated;

-- Energie-Tempo: krank ×0,5 · hungrig (< 30 %) ×0,5 · verhungert (0 %) ×0,25 · Entzug ×0,75
create or replace function public.kiez_energy_rate(p public.profiles)
returns numeric language sql stable as $$
  select (case when p.sick_until > now() then 0.5 else 1 end)
       * (case when p.hunger <= 0 then 0.25 when p.hunger < 30 then 0.5 else 1 end)
       * (case when p.addiction >= 50 and public.kiez_promille(p) < 0.5 then 0.75 else 1 end)
$$;

create or replace function public.kiez_actor()
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; mins numeric; rate numeric; gain int;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
  p := public.kiez_body_tick(p);
  rate := public.kiez_energy_rate(p);
  mins := extract(epoch from (now()-p.energy_updated_at))/60;
  gain := floor(mins*rate)::int;
  if gain > 0 then
    if p.energy + gain >= 100 then
      update public.profiles set energy=greatest(energy,100), energy_updated_at=now() where id=p.id returning * into p;
    else
      update public.profiles set energy=energy+gain, energy_updated_at=energy_updated_at+make_interval(secs=>gain/rate*60) where id=p.id returning * into p;
    end if;
  end if;
  return p;
end $function$;

-- Läden: verwahrlost fliegt raus, schmuddelig zahlt 20 % Aufschlag
create or replace function public.kiez_shop_price(p public.profiles, price numeric)
returns numeric language plpgsql stable as $function$
begin
  if public.kiez_clean_tier(p.cleanliness) = 'verwahrlost' then
    raise exception 'Der Verkäufer rümpft die Nase und schmeißt dich raus. Wasch dich erst (Sauberkeit ab 20 %%).'; end if;
  return round(price * case when public.kiez_clean_tier(p.cleanliness) = 'schmuddelig' then 1.2 else 1 end, 2);
end $function$;

-- Gestank schreckt Angreifer ab
create or replace function public.kiez_stench_defense(p public.profiles)
returns integer language sql immutable as $$
  select case public.kiez_clean_tier(p.cleanliness) when 'verwahrlost' then 6 when 'schmuddelig' then 2 else 0 end
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
    + public.kiez_stench_defense(p)
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
      'stench', public.kiez_stench_defense(p),
      'total', public.kiez_defense_power(p)),
    'equipped', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'slot',public.item_slot(s),'attack',s.attack,'defense',s.defense))
                 from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),'[]'::jsonb),
    'owned', coalesce((select jsonb_agg(i.item_id) from public.inventory i where i.user_id=p.id),'[]'::jsonb));
end $function$;

-- Schnorren: Sauberkeit nach Stufe (gepflegt ×1,2 · normal ×1 · schmuddelig ×0,6 · verwahrlost ×0,2)
create or replace function public.kiez_beg_factors(p public.profiles)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare sym int; f_pet numeric; f_clean numeric; f_speech numeric;
begin
  select coalesce(max(pc.health*up.level),0) into sym from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id
  where up.user_id=p.id and up.active;
  f_pet := least(3.0, 1 + coalesce(sym,0)/200.0);
  f_clean := case public.kiez_clean_tier(p.cleanliness) when 'gepflegt' then 1.2 when 'normal' then 1.0 when 'schmuddelig' then 0.6 else 0.2 end;
  f_speech := 1 + least(p.speech_skill,150)*0.01;
  return jsonb_build_object('sympathy',sym,'pet',round(f_pet,3),'clean',round(f_clean,3),'speech',round(f_speech,3),
    'total',round(f_pet*f_clean*f_speech,3),'tier',public.kiez_clean_tier(p.cleanliness));
end $function$;
revoke execute on function public.kiez_beg_factors(public.profiles) from public, anon, authenticated;

-- Straßenmusik: Publikum zahlt je nach Aussehen
create or replace function public.collect_music_income()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; minutes int; rate numeric; f numeric; gross numeric; paid numeric;
begin
  p := public.kiez_actor();
  if p.music_level<1 then raise exception 'Du besitzt noch kein Instrument'; end if;
  minutes := floor(extract(epoch from (now()-p.music_collected_at))/60)::int;
  if minutes<1 then raise exception 'Dein Publikum braucht noch einen Moment'; end if;
  minutes := least(minutes,720);
  rate := (array[0.02,0.05,0.12,0.30,0.70,1.50,2.80,5.00,9.00])[p.music_level];
  f := case public.kiez_clean_tier(p.cleanliness) when 'gepflegt' then 1.15 when 'normal' then 1.0 when 'schmuddelig' then 0.7 else 0.3 end;
  gross := round(minutes*rate*f,2); paid := least(gross,greatest(0,p.cash_capacity-p.money));
  update public.profiles set money=money+paid,music_collected_at=now() where id=p.id returning * into p;
  return jsonb_build_object('minutes',minutes,'rate',rate,'clean_factor',f,'paid',paid,'lost',gross-paid,'profile',to_jsonb(p));
end $function$;

-- Supermarkt: Getränke (wie bisher, jetzt mit Ladenregel und Bann-Prüfung)
create or replace function public.buy_alcohol(drink_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; v_cost numeric; v_promille numeric; v_minutes int; v_bonus int; v_label text;
begin
  p := public.kiez_actor();
  case drink_type
    when 'beer' then v_cost:=1.00; v_promille:=0.12; v_minutes:=30; v_bonus:=10; v_label:='Dosenbier';
    when 'wine' then v_cost:=2.50; v_promille:=0.25; v_minutes:=60; v_bonus:=20; v_label:='Kartonwein';
    when 'schnaps' then v_cost:=3.50; v_promille:=0.40; v_minutes:=45; v_bonus:=25; v_label:='Kurzer';
    when 'vodka' then v_cost:=6.00; v_promille:=0.70; v_minutes:=75; v_bonus:=32; v_label:='Wodka';
    when 'feuerwasser' then v_cost:=9.00; v_promille:=1.00; v_minutes:=120; v_bonus:=40; v_label:='Feuerwasser';
    else raise exception 'Dieses Getränk gibt es nicht.';
  end case;
  v_cost := public.kiez_shop_price(p, v_cost);
  if p.money < v_cost then raise exception 'Dafür reicht dein Bargeld nicht.'; end if;
  update public.profiles set money=money-v_cost,
    alcohol_level=least(7.00, public.kiez_promille(p) + v_promille), alcohol_updated_at=now(),
    alcohol_bonus_until=greatest(coalesce(alcohol_bonus_until, now()), now()) + make_interval(mins => v_minutes)
  where id=p.id returning * into p;
  return jsonb_build_object('profile',to_jsonb(p),'label',v_label,'cost',v_cost,'promille',p.alcohol_level,'bonus_percent',v_bonus,'bonus_until',p.alcohol_bonus_until);
end $function$;

-- Supermarkt: Essen macht satt (Hunger) und nüchterner
create or replace function public.buy_food(food text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; cost numeric; sober numeric; en int; full_ int; label text;
begin
  p := public.kiez_actor();
  case food
    when 'broetchen'  then cost:=0.50; sober:=0.20; en:=5;  full_:=15;  label:='Altes Brötchen';
    when 'currywurst' then cost:=2.00; sober:=0.50; en:=15; full_:=35;  label:='Currywurst';
    when 'doener'     then cost:=4.00; sober:=1.00; en:=25; full_:=60;  label:='Döner mit allem';
    when 'eintopf'    then cost:=7.50; sober:=2.00; en:=40; full_:=100; label:='Eintopf aus der Suppenküche';
    else raise exception 'Das gibt es hier nicht';
  end case;
  cost := public.kiez_shop_price(p, cost);
  if p.money<cost then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-cost, energy=least(100,energy+en), hunger=least(100,hunger+full_), hunger_updated_at=now(),
    alcohol_level=greatest(0,public.kiez_promille(p)-sober), alcohol_updated_at=now()
  where id=p.id returning * into p;
  return jsonb_build_object('label',label,'cost',cost,'energy',en,'hunger',p.hunger,'sober',sober,'profile',to_jsonb(p));
end $function$;

-- Apotheke: Magen auspumpen (Ladenregel), Krankheit heilen, Entzugskur
create or replace function public.pump_stomach()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric;
begin
  p := public.kiez_actor();
  if public.kiez_promille(p) <= 0 then raise exception 'Du bist doch schon nüchtern'; end if;
  price := public.kiez_shop_price(p, public.pump_stomach_price(p));
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
  update public.profiles set money=money-price,alcohol_level=0,alcohol_bonus_until=null,alcohol_updated_at=now() where id=p.id returning * into p;
  return to_jsonb(p) || jsonb_build_object('price', price);
end $function$;

create or replace function public.heal_sickness()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric;
begin
  p := public.kiez_actor();
  if coalesce(p.sick_until, now()) <= now() then raise exception 'Du bist gar nicht krank'; end if;
  price := public.kiez_shop_price(p, case when p.insurance_active then 3 else 6 end);
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
  update public.profiles set money=money-price, sick_until=null, dirty_since=case when cleanliness<20 then now() else null end
  where id=p.id returning * into p;
  return jsonb_build_object('price',price,'profile',to_jsonb(p));
end $function$;

create or replace function public.detox()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric;
begin
  p := public.kiez_actor();
  if p.addiction < 20 then raise exception 'Eine Entzugskur brauchst du nicht'; end if;
  price := public.kiez_shop_price(p, case when p.insurance_active then 6 else 12 end);
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
  update public.profiles set money=money-price, addiction=0, addiction_updated_at=now() where id=p.id returning * into p;
  return jsonb_build_object('price',price,'profile',to_jsonb(p));
end $function$;

-- Waschen gestaffelt: Brunnen (kostenlos, +15 %, alle 30 Min.), Katzenwäsche, Schwamm, Schwimmbad, Waschanlage, Friseur (Bonus)
create or replace function public.wash_up(tier text default 'katzenwaesche')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric(12,2); gain int; label text; need int;
begin
  p := public.kiez_actor();
  case coalesce(tier,'katzenwaesche')
    when 'brunnen'       then price:=0;    gain:=15;  label:='Brunnen';      need:=0;
    when 'katzenwaesche' then price:=0.50; gain:=35;  label:='Katzenwäsche'; need:=0;
    when 'schwamm'       then price:=1.50; gain:=60;  label:='Schwamm';      need:=1;
    when 'schwimmbad'    then price:=2.50; gain:=80;  label:='Schwimmbad';   need:=0;
    when 'waschanlage'   then price:=3.00; gain:=100; label:='Waschanlage';  need:=2;
    when 'friseur'       then price:=8.00; gain:=100; label:='Friseur';      need:=0;
    else raise exception 'Diese Wäsche gibt es nicht';
  end case;
  if tier <> 'friseur' and p.cleanliness>=100 then raise exception 'Sauberer wird es heute nicht'; end if;
  if tier = 'brunnen' and p.fountain_at > now()-interval '30 minutes' then
    raise exception 'Am Brunnen warten schon andere – in % Min. wieder', ceil(extract(epoch from (p.fountain_at+interval '30 minutes'-now()))/60); end if;
  if p.wash_level<need then raise exception 'Dafür musst du erst den % kaufen', case need when 1 then 'Schwamm' else 'Zugang zur Waschanlage' end; end if;
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-price, cleanliness=least(100,cleanliness+gain), clean_updated_at=now(),
    dirty_since=case when least(100,cleanliness+gain)>=20 then null else dirty_since end,
    fountain_at=case when tier='brunnen' then now() else fountain_at end,
    barber_until=case when tier='friseur' then now()+interval '24 hours' else barber_until end
  where id=p.id returning * into p;
  return jsonb_build_object('label',label,'price',price,'gain',gain,'profile',to_jsonb(p),
    'barber', tier='friseur');
end $function$;

-- Kämpfe und Verbrechen machen dreckig (−3 %)
create or replace function public.kiez_dirty_after_action()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if tg_table_name = 'fights' then
    update public.profiles set cleanliness=greatest(0,cleanliness-3) where id=new.attacker_id;
  elsif new.action_type like 'crime:%' then
    update public.profiles set cleanliness=greatest(0,cleanliness-3) where id=new.user_id;
  end if;
  return new;
end $function$;
drop trigger if exists fights_dirty on public.fights;
create trigger fights_dirty after insert on public.fights for each row execute function public.kiez_dirty_after_action();
drop trigger if exists crimes_dirty on public.side_action_log;
create trigger crimes_dirty after insert on public.side_action_log for each row execute function public.kiez_dirty_after_action();

-- Villenviertel nur für Gepflegte
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
  if p.district is not null and p.district_changed_at > now()-interval '1 day' then
    raise exception 'Du kannst dein Revier nur einmal am Tag wechseln';
  end if;
  update public.profiles set district=wanted, district_changed_at=now() where id=p.id returning * into p;
  return jsonb_build_object('district',nm,'profile',to_jsonb(p));
end $function$;

-- Zustand für die Oberfläche
create or replace function public.body_status()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  return jsonb_build_object('cleanliness',p.cleanliness,'tier',public.kiez_clean_tier(p.cleanliness),
    'hunger',p.hunger,'sick_until',case when p.sick_until>now() then p.sick_until end,
    'addiction',p.addiction,'withdrawal',p.addiction>=50 and public.kiez_promille(p)<0.5,'promille',round(public.kiez_promille(p),2),
    'energy_rate',public.kiez_energy_rate(p),'barber_until',case when p.barber_until>now() then p.barber_until end,
    'fountain_ready_at',case when p.fountain_at>now()-interval '30 minutes' then p.fountain_at+interval '30 minutes' end,
    'beg',public.kiez_beg_factors(p),'stench',public.kiez_stench_defense(p),'insured',p.insurance_active,
    'profile',to_jsonb(p));
end $function$;
