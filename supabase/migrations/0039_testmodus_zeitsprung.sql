-- Durchspiel-Test über die Oberfläche (Nutzerwunsch): Testmodus NUR für die Testkonten KiezTester/KiezTester2.
-- „Zeit vergeht“ = alle eigenen Zeitstempel werden zurückgeschoben (Touren, Weiterbildung, Energie, Hunger, Cooldowns …).
-- Keine geschenkten Werte, kein Geld, keine Punkte. Echte Wartezeiten: COOLDOWNS.md. Wird nach dem Test wieder entfernt.
alter table public.profiles add column if not exists is_tester boolean not null default false;
update public.profiles set is_tester = true where username in ('KiezTester', 'KiezTester2');

create or replace function public.tester_skip_time(minutes int)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; r record; days int;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null or not coalesce(p.is_tester, false) then raise exception 'Nur für Testkonten'; end if;
  if minutes is null or minutes < 1 or minutes > 4320 then raise exception 'Zeitsprung 1–4320 Minuten'; end if;
  days := minutes / 1440;
  for r in
    select c.table_name, c.column_name, c.data_type, k.column_name as key
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    join lateral (select kk.column_name from information_schema.columns kk where kk.table_schema='public' and kk.table_name=c.table_name
                  and kk.column_name in ('user_id','attacker_id','id') and (kk.column_name <> 'id' or c.table_name = 'profiles')
                  order by case kk.column_name when 'user_id' then 1 when 'attacker_id' then 2 else 3 end limit 1) k on true
    where c.table_schema = 'public' and c.data_type in ('timestamp with time zone','date')
  loop
    if r.data_type = 'date' then
      continue when days = 0;
      execute format('update public.%I set %I=%I-36500 where %I=$1 and %I is not null', r.table_name, r.column_name, r.column_name, r.key, r.column_name) using p.id;
      execute format('update public.%I set %I=%I+36500-%s where %I=$1 and %I is not null', r.table_name, r.column_name, r.column_name, days, r.key, r.column_name) using p.id;
    else
      execute format('update public.%I set %I=%I-make_interval(mins=>%s) where %I=$1 and %I is not null', r.table_name, r.column_name, r.column_name, minutes, r.key, r.column_name) using p.id;
    end if;
  end loop;
  select * into p from public.profiles where id = p.id;
  return jsonb_build_object('skipped', minutes, 'profile', to_jsonb(p));
end $function$;
grant execute on function public.tester_skip_time(int) to authenticated;
