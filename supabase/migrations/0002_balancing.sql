-- 0002: Balancing (Etappe 3)
-- * Ein Punkte-System wie Pennergame: xp = Punkte, Level = 1 + Punkte/250 (max. 150), zentral per Trigger.
--   Weiterbildungen geben Punkte statt eigener Level-Formel.
-- * Kampf nur gegen Level 80-150 %, nicht aus/in den Knast, Energie wird vorher regeneriert, 3 Std. Sperre pro Gegner.
-- * Krankenversicherung: 1 EUR/Tag, dafuer Apotheke halb so teuer und halber Geldverlust bei Niederlage als Verteidiger.
-- * Konzentration: Weiterbildung 10 % schneller, solange sie laeuft; blockiert Pfandtour, Kaempfe, Verbrechen,
--   Kiezaktionen und Schnorren. Abbruch nimmt den noch nicht "verdienten" Bonus zurueck.
-- * Preise: Magen auspumpen nach Promille, Rubbellos-Erwartungswert ca. -25 %, Gewinne bis cash_capacity.
-- * Schnorren: ein System mit 6 Plaetzen (Strasse + 5 nach Sammelgebiet), Server-Wartezeit, Energie-Regeneration.

-- ---------- Punkte / Level ----------
create or replace function public.kiez_level(points integer)
returns integer language sql immutable as $$ select least(150, 1 + greatest(0, coalesce(points,0)) / 250) $$;

create or replace function public.sync_level()
returns trigger language plpgsql as $function$
begin
  new.level := greatest(new.level, public.kiez_level(new.xp));
  return new;
end $function$;

drop trigger if exists profile_sync_level on public.profiles;
create trigger profile_sync_level before insert or update of xp, level on public.profiles
for each row execute function public.sync_level();

-- Bestehende Level behalten (nie herabstufen), Punkte passend auffuellen
update public.profiles set xp = (level - 1) * 250 where xp < (level - 1) * 250;

-- Alte Schnell-Sammelfunktion (xp/100) wird nicht mehr benutzt
drop function if exists public.collect_bottles();

-- ---------- Gemeinsame Helfer ----------
-- Laedt den eigenen Spieler gesperrt, prueft Bann und fuellt Energie auf (1 pro Minute, max. 100)
create or replace function public.kiez_actor()
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; gain int;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
  gain := floor(extract(epoch from (now()-p.energy_updated_at))/60)::int;
  if gain > 0 then
    if p.energy + gain >= 100 then
      update public.profiles set energy=greatest(energy,100), energy_updated_at=now() where id=p.id returning * into p;
    else
      update public.profiles set energy=energy+gain, energy_updated_at=energy_updated_at+make_interval(mins=>gain) where id=p.id returning * into p;
    end if;
  end if;
  return p;
end $function$;

create or replace function public.kiez_assert_free(p public.profiles)
returns void language plpgsql as $function$
begin
  if p.jail_until is not null and p.jail_until>now() then raise exception 'Du sitzt im Knast'; end if;
  if p.concentration_ends_at is not null and p.concentration_ends_at>now() then
    raise exception 'Du bist im Konzentrationsmodus. Erst abbrechen, dann geht das wieder';
  end if;
end $function$;

-- Zeitersparnis durch Konzentration fuer eine Arbeit von "work" (normaler Dauer), die jetzt beginnt:
-- waehrend der Konzentration laeuft die Weiterbildung mit 1/0.9-facher Geschwindigkeit.
create or replace function public.kiez_conc_saving(conc_end timestamptz, work interval)
returns interval language sql stable as $$
  select case when conc_end is null or conc_end<=now() or work<=interval '0' then interval '0'
              else least(work*0.1, (conc_end-now())/9) end
$$;

-- ---------- Weiterbildung ----------
create or replace function public.start_training(skill_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric; mins int; current_level int; base numeric; dur interval;
begin
  p := public.kiez_actor();
  if p.training_ends_at is not null and p.training_ends_at>now() then raise exception 'Du lernst bereits etwas'; end if;
  if p.training_type is not null then raise exception 'Erst die fertige Weiterbildung abschließen'; end if;
  case skill_type
    when 'attack' then current_level:=p.attack_skill; if current_level>=150 then raise exception 'Maximalstufe 150 erreicht'; end if;
      price:=9.80+(current_level-1)*5.00; mins:=24+(current_level-1)*3;
    when 'defense' then current_level:=p.defense_skill; if current_level>=150 then raise exception 'Maximalstufe 150 erreicht'; end if;
      price:=3.20+(current_level-1)*5.00; mins:=8+(current_level-1)*1;
    when 'streetwise' then current_level:=p.streetwise; if current_level>=150 then raise exception 'Maximalstufe 150 erreicht'; end if;
      price:=20.00+(current_level-1)*5.00; mins:=50+(current_level-1)*5;
    when 'social' then current_level:=p.social_skill;
      if current_level>=45 then raise exception 'Maximalstufe 45 erreicht (alle Begleiter und Unterkünfte freigeschaltet)'; end if;
      price:=round(10*power(current_level::numeric,1.65),2); mins:=round(power(current_level::numeric,1.28)*2);
    when 'music' then current_level:=p.music_skill;
      if current_level>=9 then raise exception 'Maximalstufe 9 erreicht (mehr Instrumente gibt es noch nicht)'; end if;
      price:=round(25*power(current_level::numeric,1.9),2); mins:=round(power(current_level::numeric,1.5)*3);
    when 'stamina' then current_level:=p.stamina; base:=6;
    when 'speech' then current_level:=p.speech_skill; base:=7;
    when 'pickpocket' then current_level:=p.pickpocket_skill; base:=12;
    else raise exception 'Unbekannte Weiterbildung';
  end case;
  if skill_type in ('stamina','speech','pickpocket') then
    if current_level>=150 then raise exception 'Maximalstufe 150 erreicht'; end if;
    price:=round(base*power(current_level::numeric,1.65),2);
    mins:=round(power(current_level::numeric,1.28)*2)::int;
  end if;
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  mins:=least(10080,greatest(1,mins));
  dur := make_interval(mins=>mins);
  dur := dur - public.kiez_conc_saving(p.concentration_ends_at, dur);
  update public.profiles set money=money-price,training_type=skill_type,training_ends_at=now()+dur
  where id=p.id returning * into p;
  return jsonb_build_object('minutes',ceil(extract(epoch from dur)/60)::int,'price',price,'profile',to_jsonb(p));
end $function$;

create or replace function public.finish_training()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; finished text; new_lvl int; pts int;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
  if p.training_type is null then raise exception 'Keine Weiterbildung aktiv'; end if;
  if p.training_ends_at>now() then raise exception 'Die Weiterbildung läuft noch'; end if;
  finished:=p.training_type;
  new_lvl := 1 + case finished when 'attack' then p.attack_skill when 'defense' then p.defense_skill
    when 'streetwise' then p.streetwise when 'stamina' then p.stamina when 'speech' then p.speech_skill
    when 'music' then p.music_skill when 'social' then p.social_skill when 'pickpocket' then p.pickpocket_skill else 0 end;
  pts := 10 + 2*new_lvl;
  update public.profiles set
    attack_skill=attack_skill+(finished='attack')::int,
    defense_skill=defense_skill+(finished='defense')::int,
    streetwise=streetwise+(finished='streetwise')::int,
    stamina=stamina+(finished='stamina')::int,
    speech_skill=speech_skill+(finished='speech')::int,
    music_skill=music_skill+(finished='music')::int,
    social_skill=social_skill+(finished='social')::int,
    pickpocket_skill=pickpocket_skill+(finished='pickpocket')::int,
    xp=xp+pts, training_type=null, training_ends_at=null
  where id=p.id returning * into p;
  return jsonb_build_object('finished',finished,'points',pts,'profile',to_jsonb(p));
end $function$;

-- ---------- Konzentration ----------
create or replace function public.start_concentration(duration_minutes integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; conc_end timestamptz;
begin
  p := public.kiez_actor();
  if duration_minutes is null or duration_minutes<1 or duration_minutes>480 then raise exception 'Ungültige Konzentrationszeit'; end if;
  if p.concentration_ends_at is not null and p.concentration_ends_at>now() then raise exception 'Du konzentrierst dich schon'; end if;
  if p.jail_until is not null and p.jail_until>now() then raise exception 'Du sitzt im Knast'; end if;
  conc_end := now()+make_interval(mins=>duration_minutes);
  update public.profiles set concentration_ends_at=conc_end,
    training_ends_at = case when training_ends_at>now()
      then training_ends_at - public.kiez_conc_saving(conc_end, training_ends_at-now()) else training_ends_at end
  where id=p.id returning * into p;
  return to_jsonb(p);
end $function$;

create or replace function public.cancel_concentration()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; overlap interval;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
  if p.concentration_ends_at is null or p.concentration_ends_at<=now() then
    update public.profiles set concentration_ends_at=null where id=p.id returning * into p;
    return to_jsonb(p);
  end if;
  -- Der beschleunigte Teil, der jetzt nicht mehr stattfindet, wird wieder normal langsam
  overlap := case when p.training_ends_at>now() then least(p.concentration_ends_at,p.training_ends_at)-now() else interval '0' end;
  update public.profiles set concentration_ends_at=null,
    training_ends_at = case when overlap>interval '0' then training_ends_at+overlap/9 else training_ends_at end
  where id=p.id returning * into p;
  return to_jsonb(p);
end $function$;

-- ---------- Pfandtour ----------
create or replace function public.start_collection(duration_minutes integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  perform public.kiez_assert_free(p);
  if p.cleanliness<20 then raise exception 'Du bist zu dreckig fuer die Tour, erst waschen (mindestens 20 Prozent Sauberkeit noetig)'; end if;
  if duration_minutes not in (10,30,60,240,480) then raise exception 'Ungueltige Sammelzeit'; end if;
  if p.collection_ends_at is not null and p.collection_ends_at>now() then raise exception 'Der Einkaufswagen ist noch unterwegs'; end if;
  if p.collection_ends_at is not null then raise exception 'Erst den Einkaufswagen ausladen'; end if;
  if p.collection_ready_at is not null and p.collection_ready_at>now() then raise exception 'Der Einkaufswagen braucht noch Pause'; end if;
  update public.profiles set collection_started_at=now(),collection_ends_at=now()+make_interval(mins=>duration_minutes),collection_minutes=duration_minutes
  where id=p.id returning * into p;
  return to_jsonb(p);
end $function$;

-- ---------- Kampf ----------
create or replace function public.attack_player(target_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare a public.profiles; d public.profiles; a_item_att int:=0; d_item_def int:=0; a_pet_att int:=0; d_pet_def int:=0;
  a_gang_att int:=0; d_gang_def int:=0; d_defense_bonus int:=0; a_power int; d_power int; winner uuid;
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
  select coalesce(sum(s.attack),0) into a_item_att from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=a.id and i.equipped;
  select coalesce(sum(s.defense),0) into d_item_def from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=target_id and i.equipped;
  select coalesce(sum(pc.attack*up.attack_level),0) into a_pet_att from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=a.id and up.active;
  select coalesce(sum(pc.defense*up.defense_level),0) into d_pet_def from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=target_id and up.active;
  select coalesce(g.attack_level*2,0) into a_gang_att from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=a.id;
  select coalesce(g.defense_level*2,0) into d_gang_def from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=target_id;
  a_gang_att:=coalesce(a_gang_att,0); d_gang_def:=coalesce(d_gang_def,0);
  select coalesce(sum(amount),0) into d_defense_bonus from public.user_active_defenses where user_id=target_id and (expires_at is null or expires_at>now());
  a_power:=a.attack_skill*3+a.streetwise+a_item_att+a_pet_att+a_gang_att+floor(random()*8)::int;
  d_power:=d.defense_skill*3+d.shelter_level*2+d_item_def+d_pet_def+d_gang_def+d_defense_bonus+floor(random()*8)::int;
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
  return jsonb_build_object('result',result,'attacker_power',a_power,'defender_power',d_power,'loot',loot,'opponent',d.username,
    'profile',to_jsonb(a),'pet_bonus',a_pet_att,'gang_bonus',a_gang_att,'defender_defense_bonus',d_defense_bonus);
end $function$;

-- ---------- Verbrechen / Kiezaktionen: Knast, Konzentration, Energie-Regeneration ----------
create or replace function public.commit_crime(crime_id integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  p public.profiles;
  names text[]:=array['Handtaschenraub','Ladendiebstahl','Auto aufbrechen','Einbruch','Tankstellenüberfall','Bankraub','Kaugummiautomat aufbrechen'];
  risks int[]:=array[15,22,30,42,55,70,18];
  rewardmin numeric[]:=array[8,18,45,90,180,450,10];
  rewardmax numeric[]:=array[18,35,80,160,320,900,20];
  bails numeric[]:=array[8,18,35,70,150,400,10];
  jailmins int[]:=array[8,12,20,35,60,120,9];
  energy int[]:=array[6,8,10,14,18,22,7];
  idx int; caught boolean; reward numeric;
begin
  p := public.kiez_actor();
  perform public.kiez_assert_free(p);
  idx:=crime_id;
  if idx is null or idx<1 or idx>array_length(names,1) then raise exception 'Unbekanntes Verbrechen'; end if;
  if p.energy<energy[idx] then raise exception 'Dafür reicht deine Energie nicht'; end if;
  caught:=random()*100<risks[idx];
  if caught then
    update public.profiles set energy=energy-energy[idx],jail_until=now()+make_interval(mins=>jailmins[idx]),jail_bail=bails[idx] where id=p.id returning * into p;
    insert into public.side_action_log(user_id,action_type,success,money_change,xp_change) values(p.id,'crime:'||names[idx],false,0,0);
    return jsonb_build_object('caught',true,'name',names[idx],'bail',bails[idx],'jail_minutes',jailmins[idx],'profile',to_jsonb(p));
  end if;
  reward:=round((rewardmin[idx]+random()::numeric*(rewardmax[idx]-rewardmin[idx])),2);
  reward:=least(reward,greatest(0,p.cash_capacity-p.money));
  update public.profiles set energy=energy-energy[idx],money=money+reward,xp=xp+greatest(3,energy[idx]) where id=p.id returning * into p;
  insert into public.side_action_log(user_id,action_type,success,money_change,xp_change) values(p.id,'crime:'||names[idx],true,reward,greatest(3,energy[idx]));
  return jsonb_build_object('caught',false,'name',names[idx],'reward',reward,'profile',to_jsonb(p));
end $function$;

create or replace function public.do_side_action(action_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; cost int; gain_money numeric(12,2):=0; gain_bottles int:=0; gain_xp int:=0; label text;
begin
  p := public.kiez_actor();
  perform public.kiez_assert_free(p);
  if p.collection_ends_at is not null then raise exception 'Der Einkaufswagen ist noch unterwegs oder nicht ausgeladen'; end if;
  if p.last_side_action_at is not null and p.last_side_action_at>now()-interval '60 seconds' then
    raise exception 'Du brauchst kurz Luft. Nächste Aktion in spätestens 60 Sekunden'; end if;
  case action_type
    when 'newspapers' then cost:=4; gain_money:=round((0.30+random()*0.55+p.speech_skill*0.02)::numeric,2); gain_xp:=3; label:='Abendblätter verteilt';
    when 'sorting' then cost:=6; gain_bottles:=2+floor(random()*5)::int+floor(p.streetwise/4)::int; gain_xp:=4; label:='Pfand im Hinterhof sortiert';
    when 'parking' then cost:=7; gain_money:=round((0.55+random()*1.10+p.social_skill*0.03)::numeric,2); gain_xp:=5; label:='Einkaufswagen bewacht';
    when 'windshield' then cost:=5; gain_money:=round((0.25+random()*0.45+p.speech_skill*0.015)::numeric,2); gain_xp:=3; label:='Scheiben an der Ampel gewischt';
    else raise exception 'Unbekannte Kiezaktion';
  end case;
  if p.energy<cost then raise exception 'Nicht genug Energie'; end if;
  gain_money := least(gain_money, greatest(0,p.cash_capacity-p.money));
  update public.profiles set energy=energy-cost,money=money+gain_money,bottles=bottles+gain_bottles,xp=xp+gain_xp,last_side_action_at=now()
  where id=p.id returning * into p;
  insert into public.side_action_log(user_id,action_type,success,money_change,bottle_change,xp_change) values(p.id,action_type,true,gain_money,gain_bottles,gain_xp);
  return jsonb_build_object('success',true,'label',label,'money',gain_money,'bottles',gain_bottles,'xp',gain_xp,'energy_cost',cost,'profile',to_jsonb(p));
end $function$;

-- ---------- Schnorren: ein System ----------
create or replace function public.beg_at_spot(spot_id text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; rate numeric; need_area int; wait_s int; cost int:=5; cnt int; pet_sympathy int:=0;
  factor numeric; gross numeric(12,2); paid numeric(12,2);
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
  select coalesce(max(pc.health*up.level),0) into pet_sympathy from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active;
  cnt:=1+floor(random()*10)::int;
  factor := least(3.0,1+coalesce(pet_sympathy,0)/200.0) * (0.5+p.cleanliness/200.0) * (1+least(p.speech_skill,150)*0.01);
  gross:=round(cnt*rate*factor,2);
  paid:=least(gross,greatest(0,p.cash_capacity-p.money));
  update public.profiles set money=money+paid,total_earned=total_earned+paid,energy=energy-cost,last_beg_at=now(),xp=xp+1
  where id=p.id returning * into p;
  return jsonb_build_object('spot',spot_id,'count',cnt,'rate',rate,'sympathy',pet_sympathy,'total',paid,
    'gross',gross,'paid',paid,'lost',gross-paid,'profile',to_jsonb(p));
end $function$;

create or replace function public.beg_for_money()
returns jsonb language sql security definer set search_path to 'public' as $$ select public.beg_at_spot('strasse') $$;

-- ---------- Versicherung & Apotheke ----------
create or replace function public.refresh_my_profile()
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; decay_hours numeric; loops int:=0;
begin
  select * into p from public.profiles where id=auth.uid();
  if p.id is null then raise exception 'Spielerprofil fehlt'; end if;
  if p.is_banned then return p; end if;
  p := public.kiez_actor();
  decay_hours := extract(epoch from (now()-p.alcohol_updated_at))/3600;
  if decay_hours>0 and p.alcohol_level>0 then
    update public.profiles set alcohol_level=greatest(0,alcohol_level-decay_hours*0.50),alcohol_updated_at=now() where id=p.id returning * into p;
  end if;
  while p.insurance_active and p.insurance_next_charge_at is not null and p.insurance_next_charge_at<=now() and loops<60 loop
    update public.profiles set money=greatest(0,money-1),insurance_days_paid=insurance_days_paid+1,
      insurance_next_charge_at=insurance_next_charge_at+interval '1 day' where id=p.id returning * into p;
    loops:=loops+1;
  end loop;
  return p;
end $function$;

create or replace function public.pump_stomach_price(p public.profiles)
returns numeric language sql stable as $$
  select round((2 + 3*greatest(0, p.alcohol_level - greatest(0, extract(epoch from (now()-p.alcohol_updated_at))/3600*0.5)))
               * case when p.insurance_active then 0.5 else 1 end, 2)
$$;

create or replace function public.pump_stomach()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric;
begin
  p := public.kiez_actor();
  if p.alcohol_level - extract(epoch from (now()-p.alcohol_updated_at))/3600*0.5 <= 0 then raise exception 'Du bist doch schon nüchtern'; end if;
  price := public.pump_stomach_price(p);
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
  update public.profiles set money=money-price,alcohol_level=0,alcohol_bonus_until=null,alcohol_updated_at=now() where id=p.id returning * into p;
  return to_jsonb(p) || jsonb_build_object('price', price);
end $function$;

-- ---------- Rubbellos: Erwartungswert ca. 7,50 EUR bei 10 EUR Einsatz, Gewinn bis cash_capacity ----------
create or replace function public.buy_scratch_ticket()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; r numeric; prize numeric; paid numeric;
begin
  p := public.kiez_actor();
  if p.money<10 then raise exception 'Nicht genug Geld'; end if;
  r:=random()*1000;
  prize:=case when r<400 then 0 when r<650 then 2 when r<800 then 5 when r<900 then 10 when r<960 then 20
              when r<985 then 50 when r<997 then 100 else 500 end;
  paid:=least(prize, greatest(0, p.cash_capacity-(p.money-10)));
  update public.profiles set money=money-10+paid where id=p.id returning * into p;
  return jsonb_build_object('prize',prize,'paid',paid,'lost',prize-paid,'profile',to_jsonb(p));
end $function$;

revoke execute on function public.kiez_actor() from public, anon, authenticated;
revoke execute on function public.kiez_assert_free(public.profiles) from public, anon, authenticated;
revoke execute on function public.pump_stomach_price(public.profiles) from public, anon, authenticated;
