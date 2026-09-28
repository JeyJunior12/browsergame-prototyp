-- Durchspiel-Test (ROADMAP 201): Lenkradkralle und Garage gelten dauerhaft pro Fahrzeug, ließen sich aber beliebig oft
-- bezahlen (Testkonto zahlte über 60-mal). Jetzt: zweiter Kauf wird abgelehnt; die Garage-Übersicht zeigt, was dran ist.

create or replace function pg_temp.patch(f text, pat text, rep text) returns void language plpgsql as $$
declare src text; neu text;
begin
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
  if src is null then raise exception 'Funktion % fehlt', f; end if;
  neu := regexp_replace(src, pat, rep, 'g');
  if neu = src then raise exception 'Muster in % nicht gefunden: %', f, pat; end if;
  execute neu;
end $$;

select pg_temp.patch('buy_car_protection', 'if p\.money < price then',
  'if exists(select 1 from public.user_vehicles where user_id=p.id and vehicle_id=p.vehicle and case when kind=''kralle'' then kralle else garage end) then
    raise exception ''%'', case when kind=''kralle'' then ''Die Lenkradkralle ist schon dran'' else ''Dein Fahrzeug steht schon in der Garage'' end; end if;
  if p.money < price then');
select pg_temp.patch('garage_overview', '''paint'',uv\.paint\)', '''paint'',uv.paint,''kralle'',coalesce(uv.kralle,false),''garage'',coalesce(uv.garage,false))');
