-- ROADMAP 199: Verbrechen lohnten sich ab Level ~50 nicht mehr (Bankraub max. 900 € bei 9.000 € in der Tasche).
-- Beute und Kaution wachsen mit dem Level: Faktor 1 + Level/50 (Level 1: ×1,02, Level 50: ×2, Level 150: ×4).
-- Risiko, Energie und Knastzeit bleiben gleich; die Kaution wächst mit, damit Erwischtwerden weiter weh tut.

create or replace function pg_temp.patch(f text, pat text, rep text) returns void language plpgsql as $$
declare src text; neu text;
begin
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
  if src is null then raise exception 'Funktion % fehlt', f; end if;
  neu := regexp_replace(src, pat, rep, 'g');
  if neu = src then raise exception 'Muster in % nicht gefunden: %', f, pat; end if;
  execute neu;
end $$;

create or replace function public.kiez_crime_factor(lvl integer) returns numeric language sql immutable as
$$ select round(1 + greatest(coalesce(lvl,1),1) / 50.0, 2) $$;
revoke execute on function public.kiez_crime_factor(integer) from public, anon, authenticated;

select pg_temp.patch('commit_crime', 'jail_bail=bails\[idx\] where id=p\.id', 'jail_bail=round(bails[idx]*public.kiez_crime_factor(p.level),2) where id=p.id');
select pg_temp.patch('commit_crime', '''bail'',bails\[idx\],', '''bail'',round(bails[idx]*public.kiez_crime_factor(p.level),2),');
select pg_temp.patch('commit_crime', 'reward:=reward;', 'reward:=round(reward*public.kiez_crime_factor(p.level),2);');
