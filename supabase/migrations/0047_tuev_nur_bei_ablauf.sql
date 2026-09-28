-- Durchspiel-Test (ROADMAP 205): TÜV ließ sich beliebig oft verlängern (Testkonto: Mofa TÜV bis 2028, je 20 €).
-- Jetzt: Verlängern erst, wenn der TÜV in weniger als 7 Tagen abläuft.

create or replace function pg_temp.patch(f text, pat text, rep text) returns void language plpgsql as $$
declare src text; neu text;
begin
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
  if src is null then raise exception 'Funktion % fehlt', f; end if;
  neu := regexp_replace(src, pat, rep, 'g');
  if neu = src then raise exception 'Muster in % nicht gefunden: %', f, pat; end if;
  execute neu;
end $$;

select pg_temp.patch('vehicle_service', 'price := 20;',
  'if uv.tuev_until > now() + interval ''7 days'' then
      raise exception ''TÜV gilt noch bis % – verlängern geht erst in der letzten Woche'', to_char(uv.tuev_until at time zone ''Europe/Berlin'', ''DD.MM.YYYY''); end if;
    price := 20;');
