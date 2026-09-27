-- Minispiele statt nur Klicken (ROADMAP 185, 187, 188, 190): Das Ergebnis des Minispiels (0–100, 50 = neutral) geht an den Server
-- und verschiebt das Ergebnis begrenzt: Schloss knacken ±10 Punkte Risiko, Ausweichen ±10 % Kampfkraft, Spruch beim Schnorren
-- ±20 %, Takt bei der Straßenmusik ±15 %. Ohne Angabe (alte Aufrufe) bleibt alles wie bisher.
-- Dazu 183: Schnorren wächst mit dem Level (vorher 0,10–0,50 € auch auf Level 30).

create or replace function pg_temp.resign(f text, oldsig text, newsig text, pats text[], reps text[]) returns void language plpgsql as $$
declare src text; i int;
begin
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
  if src is null then raise exception 'Funktion % fehlt', f; end if;
  if position(oldsig in src)=0 then raise exception 'Signatur % nicht gefunden', oldsig; end if;
  src := replace(src, oldsig, newsig);
  for i in 1..coalesce(array_length(pats,1),0) loop
    if position(pats[i] in src)=0 then raise exception 'Stelle in % nicht gefunden: %', f, pats[i]; end if;
    src := replace(src, pats[i], reps[i]);
  end loop;
  execute 'drop function public.' || oldsig;
  execute src;
end $$;

create or replace function public.kiez_mini(score integer) returns numeric language sql immutable as
$$ select least(100, greatest(0, coalesce(score, 50)))::numeric $$;

-- 185 Verbrechen: Schloss knacken
select pg_temp.resign('commit_crime', 'commit_crime(crime_id integer)', 'commit_crime(crime_id integer, pick_score integer DEFAULT 50)',
  array['caught:=random()*100<risks[idx]'], array['caught:=random()*100<risks[idx] - (public.kiez_mini(pick_score)-50)/5.0']);

-- 188 Computer-Gegner: Ausweichen
select pg_temp.resign('fight_npc', 'fight_npc(npc_id text)', 'fight_npc(npc_id text, dodge_score integer DEFAULT 50)',
  array['mine := round((public.kiez_attack_power(p))*(0.75+random()*0.5));'],
  array['mine := round((public.kiez_attack_power(p))*(0.75+random()*0.5)*(0.9+public.kiez_mini(dodge_score)/500.0));']);

-- 187 + 183 Schnorren: passender Spruch, Ertrag wächst mit dem Level
select pg_temp.resign('beg_at_spot', 'beg_at_spot(spot_id text)', 'beg_at_spot(spot_id text, talk_score integer DEFAULT 50)',
  array['gross:=round(cnt*rate*(f->>''total'')::numeric,2);'],
  array['gross:=round(cnt*rate*(1+p.level/20.0)*(0.8+public.kiez_mini(talk_score)/250.0)*(f->>''total'')::numeric,2);']);

-- 190 Straßenmusik: im Takt tippen
select pg_temp.resign('collect_music_income', 'collect_music_income()', 'collect_music_income(rhythm_score integer DEFAULT 50)',
  array['gross := round(minutes*rate*f,2);'], array['gross := round(minutes*rate*f*(0.85+public.kiez_mini(rhythm_score)*0.003),2);']);

grant execute on function public.commit_crime(integer, integer) to authenticated;
grant execute on function public.fight_npc(text, integer) to authenticated;
grant execute on function public.beg_at_spot(text, integer) to authenticated;
grant execute on function public.collect_music_income(integer) to authenticated;
revoke execute on function public.kiez_mini(integer) from public, anon, authenticated;
