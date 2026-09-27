-- Balancing aus dem Durchspiel-Test über die Oberfläche (ROADMAP 156, 168, 177–182)
-- Bestehende Funktionen werden gezielt per Textersetzung angepasst (wie 0037); jede Ersetzung muss treffen, sonst bricht die Migration ab.

create or replace function pg_temp.patch(f text, pat text, rep text) returns void language plpgsql as $$
declare src text; neu text;
begin
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
  if src is null then raise exception 'Funktion % fehlt', f; end if;
  neu := regexp_replace(src, pat, rep, 'g');
  if neu = src then raise exception 'Muster in % nicht gefunden: %', f, pat; end if;
  execute neu;
end $$;

-- 156 Kampfbereich (Nutzerwunsch): nach oben darf man jeden angreifen, nach unten nur bis 5 Level unter dem eigenen
select pg_temp.patch('attack_player', 'min_lvl := greatest\(1,floor\(a\.level\*0\.8\)::int\); max_lvl := ceil\(a\.level\*1\.5\)::int;',
  'min_lvl := greatest(1,a.level-5); max_lvl := 100000;');
select pg_temp.patch('attack_player', '''Du kannst nur Gegner von Level % bis % angreifen'', min_lvl, max_lvl', '''Du kannst nur Gegner ab Level % angreifen'', min_lvl');
select pg_temp.patch('pet_fight', 'min_lvl := greatest\(1,floor\(a\.level\*0\.8\)::int\); max_lvl := ceil\(a\.level\*1\.5\)::int;',
  'min_lvl := greatest(1,a.level-5); max_lvl := 100000;');
select pg_temp.patch('pet_fight', '''Nur gegen Level % bis %'', min_lvl, max_lvl', '''Nur gegen Spieler ab Level %'', min_lvl');
select pg_temp.patch('kiosk_rob', 'o\.level < floor\(p\.level\*0\.8\) or o\.level > ceil\(p\.level\*1\.5\)', 'o.level < p.level-5');
select pg_temp.patch('kiosk_overview', 'q\.level between floor\(p\.level\*0\.8\) and ceil\(p\.level\*1\.5\)', 'q.level >= p.level-5');
select pg_temp.patch('theft_targets', 'o\.level between floor\(me\.level\*0\.8\) and ceil\(me\.level\*1\.5\)', 'o.level >= me.level-5');

-- 177 Verbrechen mit Level-Grenzen (Bankraub ging ab Level 1 und brachte 450–900 €)
create or replace function public.kiez_crime_level(idx int) returns int language sql immutable as
$$ select (array[1,4,10,20,35,55,1])[idx] $$;
select pg_temp.patch('commit_crime', 'if p\.energy<cost\[idx\] then',
  'if p.level < public.kiez_crime_level(idx) then raise exception ''Dafür brauchst du Level %'', public.kiez_crime_level(idx); end if;
  if p.energy<cost[idx] then');
-- Wärter bestechen kostet je nach Kaution (Bankraub 400 € → 40 Kronkorken statt immer 8)
select pg_temp.patch('bottlecap_shop', 'when ''knast'' then 8 when', 'when ''knast'' then greatest(8, ceil(coalesce(p.jail_bail,0)/10.0)::int) when');

-- 178 Computer-Gegner: Stärke hängt am eigenen Angriff (vorher Mittel aus Angriff und Verteidigung → ab Level ~20 kaum schlagbar),
-- Punkte wachsen mit dem Level
select pg_temp.patch('fight_npc', '\(public\.kiez_attack_power\(p\)\+public\.kiez_defense_power\(p\)\)/2\.0\*n\.factor', 'public.kiez_attack_power(p)*n.factor');
select pg_temp.patch('fight_npc', 'gx := n\.xp;', 'gx := round(n.xp*(1+p.level/25.0))::int;');
select pg_temp.patch('npc_overview', '''power'',round\(\(a\+d\)/2\.0\*n\.factor\)::int', '''power'',round(a*n.factor)::int');
select pg_temp.patch('npc_overview', '''xp'',n\.xp,', '''xp'',round(n.xp*(1+p.level/25.0))::int,');

-- 179 Straßenmusik: brachte ohne Aufwand mehr als eine 4-Std.-Pfandtour → Einnahmen × 0,4, höchstens 8 Std. sammeln
select pg_temp.patch('collect_music_income', 'minutes := least\(minutes,720\);', 'minutes := least(minutes,480);');
select pg_temp.patch('collect_music_income', 'array\[0\.02,0\.05,0\.12,0\.30,0\.70,1\.50,2\.80,5\.00,9\.00\]', 'array[0.01,0.02,0.05,0.12,0.28,0.60,1.10,2.00,3.60]');

-- 180 Kiosk: Stufe 1 brachte 0,25 €/Std. → 1 €/Std., Stufe 10 ≈ 32 €/Std.
create or replace function public.kiez_kiosk_rate(lvl integer) returns numeric language sql immutable as
$$ select round((1.0*power(lvl,1.5))::numeric,2) $$;

-- 181 Nebenfähigkeiten waren viel zu teuer (Level 32: Sozialkontakte 1.178 € gegenüber Geschick 180 €) → linear wie die Hauptfähigkeiten
select pg_temp.patch('kiez_training_cost', 'price := round\(10\*power\(lvl::numeric,1\.65\),2\);', 'price := 10.00+(lvl-1)*8.00;');
select pg_temp.patch('kiez_training_cost', 'price := round\(25\*power\(lvl::numeric,1\.9\),2\);', 'price := 25.00+(lvl-1)*60.00;');
select pg_temp.patch('kiez_training_cost', 'price := round\(base\*power\(lvl::numeric,1\.65\),2\);', 'price := base+(lvl-1)*base*0.8;');

-- 182 Geldbehälter 1→2 kostete genau den vollen Behälter (20 €)
select pg_temp.patch('buy_upgrade', 'array\[20,95,900,9000\]', 'array[15,95,900,9000]');

-- 168 Rubbellos: „Gewonnen 5 €“ bei 10 € Einsatz war ein Verlust. Jetzt: Niete, Einsatz zurück (10 €) oder echter Gewinn ab 15 €.
-- Rückzahlung im Schnitt ≈ 76 %; Gewinn über dem Geldbehälter landet im Schließfach.
create or replace function public.buy_scratch_ticket()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; r numeric; prize numeric;
begin perform set_config('kiez.overflow','1',true);
  p := public.kiez_actor();
  if p.money<10 then raise exception 'Ein Los kostet 10 € – so viel hast du nicht in der Tasche'; end if;
  r := random()*1000;
  prize := case when r<600 then 0 when r<820 then 10 when r<910 then 15 when r<965 then 20
                when r<992 then 50 when r<998 then 100 else 500 end;
  update public.profiles set money=money-10 where id=p.id;
  if prize>0 then perform public.kiez_pay(p.id, prize); end if;
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('prize',prize,'paid',prize,'lost',0,'net',prize-10,'profile',to_jsonb(p));
end $function$;
