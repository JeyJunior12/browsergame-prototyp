-- Nutzerentscheidung 29.09.2026: Höchstlevel vorerst 100 (ab Level 90 gibt es keine neuen Inhalte; Anhebung später mit neuem Inhalt).
-- Punkte zählen über Level 100 hinaus weiter (Rangliste). Kiez-Legende jetzt ab Level 100.

create or replace function pg_temp.patch(f text, pat text, rep text) returns void language plpgsql as $$
declare src text; neu text;
begin
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
  if src is null then raise exception 'Funktion % fehlt', f; end if;
  neu := regexp_replace(src, pat, rep, 'g');
  if neu = src then raise exception 'Muster in % nicht gefunden: %', f, pat; end if;
  execute neu;
end $$;

create or replace function public.kiez_max_level() returns integer language sql immutable as $$ select 100 $$;

select pg_temp.patch('kiez_level', 'least\(150,', 'least(public.kiez_max_level(),');
select pg_temp.patch('kiez_level_points', 'least\(150,', 'least(public.kiez_max_level(),');
select pg_temp.patch('become_legend', 'if p\.level < 150 then raise exception ''Kiez-Legende wirst du erst mit Level 150''',
  'if p.level < public.kiez_max_level() then raise exception ''Kiez-Legende wirst du erst mit Level %'', public.kiez_max_level()');
select pg_temp.patch('update_gang_look', 'least\(150,', 'least(public.kiez_max_level(),');

-- Wer schon darüber ist, wird auf 100 gesetzt (Punkte bleiben). Der Level-Trigger stuft sonst nie herab.
select set_config('kiez.rebirth', '1', true);
update public.profiles set level = public.kiez_level(xp) where level > public.kiez_max_level();
select set_config('kiez.rebirth', '', true);

-- Nutzer: „alles auf 100“ – auch die Weiterbildungen enden bei Stufe 100 (Sozialkontakte 45 und Musik 9 bleiben)
select pg_temp.patch('kiez_training_cost', 'maxl int := 150;', 'maxl int := public.kiez_max_level();');
select pg_temp.patch('kiez_beg_factors', 'least\(p\.speech_skill,150\)', 'least(p.speech_skill,public.kiez_max_level())');
update public.profiles set
  attack_skill = least(attack_skill, 100), defense_skill = least(defense_skill, 100), streetwise = least(streetwise, 100),
  stamina = least(stamina, 100), speech_skill = least(speech_skill, 100), pickpocket_skill = least(pickpocket_skill, 100)
where greatest(attack_skill, defense_skill, streetwise, stamina, speech_skill, pickpocket_skill) > 100;
-- Warteschlange: Einträge über der Grenze starten später mit „Maximalstufe erreicht“ und werden dort übersprungen

-- Balancing für Höchstlevel 100 (aus dem Durchspiel-Test): Level 1–45 war stimmig und bleibt. Alles, was bisher über Level 45
-- freigeschaltet wurde, wird auf 46–100 zusammengeschoben (Reihenfolge und Abstände bleiben: neu = 45 + (alt − 45) × 55/105).
-- Späte Stücke kosten bis zu 50 % mehr – auf Level 100 lagen beim Testkonto 50.000 € ungenutzt herum.
update public.shop_items set required_level = round(45 + (required_level - 45) * 55.0 / 105)::int where required_level > 45;
-- Aufschlag wächst langsam: Level 46 ≈ +1 %, Level 100 +50 % (kein Preissprung an der Grenze)
update public.shop_items set price = round(price * (1 + 0.5 * (required_level - 45) / 55.0), 2) where required_level > 45;
update public.pet_catalog set required_level = round(45 + (required_level - 45) * 55.0 / 105)::int where required_level > 45;
