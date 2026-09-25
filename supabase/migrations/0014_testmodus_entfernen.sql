-- 0014: Tests abgeschlossen – Testmodus entfernen und die Testkonten (ClaudeTester1–4, künstliche Werte) samt Daten löschen,
-- damit Ranglisten, Wettbewerbe und Banden-Highscore nur echte Spieler zeigen. Balancing war nie verändert.
do $$
declare ids uuid[] := array(select id from public.profiles where is_tester);
begin
  if array_length(ids,1) is null then return; end if;
  -- Banden der Testkonten auflösen (Mitglieder, Kriege, Chat, Protokoll hängen per Cascade oder werden hier entfernt)
  delete from public.gang_members where gang_id in (select id from public.gangs where owner_id = any(ids));
  delete from public.gangs where owner_id = any(ids);
  delete from public.gang_members where user_id = any(ids);
  -- Ältere Tabellen ohne automatisches Löschen
  delete from public.fights where attacker_id = any(ids) or defender_id = any(ids);
  delete from public.messages where sender_id = any(ids) or recipient_id = any(ids);
  delete from public.inventory where user_id = any(ids);
  delete from public.user_pets where user_id = any(ids);
  delete from public.daily_missions where user_id = any(ids);
  delete from public.side_action_log where user_id = any(ids);
  delete from public.user_achievements where user_id = any(ids);
  delete from public.user_active_defenses where user_id = any(ids);
  delete from public.player_reports where reporter_id = any(ids) or reported_id = any(ids);
  delete from public.profile_audit where user_id = any(ids);
  delete from public.competition_payouts where user_id = any(ids);
  delete from public.profiles where id = any(ids);
  delete from auth.users where id = any(ids);
end $$;

drop function if exists public.tester_fast_forward();
drop function if exists public.tester_end_wars();
drop function if exists public.tester_set_stats(numeric,integer,integer,integer,integer,integer);
drop function if exists public.kiez_require_tester();

-- Ranglistenfunktion ohne Tester-Filter (Spalte wird entfernt)
create or replace function public.weekly_ranking(category text)
returns table(rank bigint, user_id uuid, username text, score integer)
language plpgsql security definer set search_path to 'public' as $function$
begin
  if category not in ('bottles','wins') then raise exception 'Unbekannte Kategorie'; end if;
  perform public.resolve_competitions();
  return query
    select row_number() over (order by case category when 'bottles' then w.bottles else w.wins end desc, w.user_id),
           w.user_id, p.username, case category when 'bottles' then w.bottles else w.wins end
    from public.weekly_scores w join public.profiles p on p.id=w.user_id
    where w.week_start=public.kiez_week(current_date) and not p.is_banned
      and (case category when 'bottles' then w.bottles else w.wins end)>0
    order by 1 limit 20;
end $function$;
alter table public.profiles drop column if exists is_tester;
