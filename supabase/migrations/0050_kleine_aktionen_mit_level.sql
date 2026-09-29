-- Durchspiel-Test (ROADMAP 208): Sortierspiel (+20 Flaschen ≈ 3 €) und Mülltonne (1–5 Flaschen, bis 1 € Kleingeld) waren
-- ab Level ~50 bedeutungslos (Testkonto Level 114 mit 50.000 € in der Tasche). Jetzt wachsen sie mit dem Level: × (1 + Level/10).

create or replace function pg_temp.patch(f text, pat text, rep text) returns void language plpgsql as $$
declare src text; neu text;
begin
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
  if src is null then raise exception 'Funktion % fehlt', f; end if;
  neu := regexp_replace(src, pat, rep, 'g');
  if neu = src then raise exception 'Muster in % nicht gefunden: %', f, pat; end if;
  execute neu;
end $$;

select pg_temp.patch('sort_game_finish', 'b := right_;', 'b := ceil(right_ * (1 + p.level / 10.0))::int;');
select pg_temp.patch('dig_bin', 'amt := round\(\(0\.10\+random\(\)\*0\.90\)::numeric,2\);',
  'amt := round(((0.10+random()*0.90) * (1 + p.level / 10.0))::numeric,2);');
select pg_temp.patch('dig_bin', 'amt := 1\+floor\(random\(\)\*5\);',
  'amt := ceil((1+floor(random()*5)) * (1 + p.level / 10.0));');
