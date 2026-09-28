-- Testmodus-Zeitsprung (0039) war zu teuer: Er verschob bei JEDEM Sprung jede Zeitspalte aller Zeilen des Testkontos,
-- auch in wachsenden Protokoll-Tabellen (profile_audit, kiez_actions, notifications …) – und jede Profiländerung schrieb
-- wieder ins Protokoll. Nach ~460 Besuchen lief die Datenbank in Zeitüberschreitungen (auch für echte Spieler).
-- Neu: Protokoll-Tabellen bleiben unberührt; verschoben werden nur Zeitpunkte der letzten 3 Tage und künftige
-- (alles, was für Wartezeiten zählt – die längsten liegen bei 3 Tagen). Spaltenliste wird nicht mehr bei jedem Aufruf neu gesucht.
create table if not exists public.tester_skip_cols as select ''::text table_name, ''::text column_name, ''::text data_type, ''::text key where false;
alter table public.tester_skip_cols enable row level security;  -- keine Policy: nur die Funktion (security definer) liest sie
revoke all on public.tester_skip_cols from anon, authenticated;
truncate public.tester_skip_cols;
insert into public.tester_skip_cols
  select c.table_name, c.column_name, c.data_type, k.column_name
  from information_schema.columns c
  join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
  join lateral (select kk.column_name from information_schema.columns kk where kk.table_schema='public' and kk.table_name=c.table_name
                and kk.column_name in ('user_id','attacker_id','id') and (kk.column_name <> 'id' or c.table_name = 'profiles')
                order by case kk.column_name when 'user_id' then 1 when 'attacker_id' then 2 else 3 end limit 1) k on true
  where c.table_schema = 'public' and c.data_type in ('timestamp with time zone','date')
    and c.table_name not in ('profile_audit','kiez_actions','notifications','side_action_log','chat_messages','guestbook_entries',
                             'gang_log','gang_chat','forum_posts','forum_threads','donations','messages','reports','ticker','sim_log');

create or replace function public.tester_skip_time(minutes int)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; r record; days int;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null or not coalesce(p.is_tester, false) then raise exception 'Nur für Testkonten'; end if;
  if minutes is null or minutes < 1 or minutes > 4320 then raise exception 'Zeitsprung 1–4320 Minuten'; end if;
  days := minutes / 1440;
  for r in select * from public.tester_skip_cols loop
    if r.data_type = 'date' then
      continue when days = 0;
      execute format('update public.%I set %I=%I-36500 where %I=$1 and %I >= current_date-3', r.table_name, r.column_name, r.column_name, r.key, r.column_name) using p.id;
      execute format('update public.%I set %I=%I+36500-%s where %I=$1 and %I < current_date-30000', r.table_name, r.column_name, r.column_name, days, r.key, r.column_name) using p.id;
    else
      execute format('update public.%I set %I=%I-make_interval(mins=>%s) where %I=$1 and %I > now()-interval ''3 days''', r.table_name, r.column_name, r.column_name, minutes, r.key, r.column_name) using p.id;
    end if;
  end loop;
  select * into p from public.profiles where id = p.id;
  return jsonb_build_object('skipped', minutes, 'profile', to_jsonb(p));
end $function$;
grant execute on function public.tester_skip_time(int) to authenticated;
