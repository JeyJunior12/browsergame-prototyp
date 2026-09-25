-- 0010: Testmodus NUR für die Testkonten ClaudeTester1–4. Das Balancing für echte Spieler bleibt unverändert.
-- Testkonten können Wartezeiten überspringen und ihre Werte setzen, damit Kämpfe, Tierkämpfe und Bandenkriege
-- per Klick durchgespielt werden können. Wird nach den Tests mit einer eigenen Migration wieder entfernt.
alter table public.profiles add column if not exists is_tester boolean not null default false;
update public.profiles set is_tester = true where username in ('ClaudeTester','ClaudeTester2','ClaudeTester3','ClaudeTester4');

create or replace function public.kiez_require_tester()
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or not p.is_tester then raise exception 'Nur für Testkonten'; end if;
  return p;
end $function$;
revoke execute on function public.kiez_require_tester() from public, anon, authenticated;

-- Alle eigenen Wartezeiten sofort ablaufen lassen (Weiterbildung, Pfandtour, Knast, Schutz, Sperren, Tiertraining, Bandenkrieg)
create or replace function public.tester_fast_forward()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; g uuid;
begin
  p := public.kiez_require_tester();
  update public.profiles set
    training_ends_at = case when training_ends_at>now() then now() else training_ends_at end,
    collection_ends_at = case when collection_ends_at>now() then now() else collection_ends_at end,
    collection_ready_at = null, jail_until = null, jail_bail = 0, protection_until = null, energy = 100, energy_updated_at = now(),
    last_beg_at = null, last_side_action_at = null, last_action_at = null, concentration_ends_at = null, username_changed_at = null
  where id=p.id returning * into p;
  update public.user_pets set training_ends_at=now() where user_id=p.id and training_ends_at>now();
  -- Kampfsperren nur zwischen Testkonten aufheben (echte Spieler bleiben geschützt)
  update public.fights set created_at=created_at-interval '1 day' where attacker_id=p.id and defender_id in (select id from public.profiles where is_tester);
  update public.pet_fights set created_at=created_at-interval '1 day' where attacker_id=p.id and defender_id in (select id from public.profiles where is_tester);
  update public.profiles set protection_until=null where is_tester;
  select gang_id into g from public.gang_members where user_id=p.id;
  if g is not null then
    update public.gang_wars set ends_at=now() where not resolved and (attacker_gang=g or defender_gang=g)
      and attacker_gang in (select gm.gang_id from public.gang_members gm join public.profiles t on t.id=gm.user_id where t.is_tester)
      and defender_gang in (select gm.gang_id from public.gang_members gm join public.profiles t on t.id=gm.user_id where t.is_tester);
    update public.gang_wars set started_at=started_at-interval '4 days' where resolved and (attacker_gang=g or defender_gang=g);
  end if;
  perform public.resolve_gang_wars();
  return to_jsonb(p);
end $function$;

-- Eigene Werte setzen (Geld, Punkte, Kronkorken, Sozialkontakte für Tierkauf, Angriff/Verteidigung)
create or replace function public.tester_set_stats(new_money numeric, new_xp integer, new_caps integer, new_social integer default null,
  new_attack integer default null, new_defense integer default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_require_tester();
  update public.profiles set money=coalesce(new_money,money), cash_capacity=greatest(cash_capacity,coalesce(new_money,0)),
    xp=coalesce(new_xp,xp), level=case when new_xp is not null then public.kiez_level(new_xp) else level end,
    bottlecaps=coalesce(new_caps,bottlecaps), social_skill=coalesce(new_social,social_skill),
    attack_skill=coalesce(new_attack,attack_skill), defense_skill=coalesce(new_defense,defense_skill)
  where id=p.id returning * into p;
  return to_jsonb(p);
end $function$;

-- Testkonten tauchen nicht in Ranglisten, Wettbewerben und der Gegnerliste echter Spieler auf
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
    where w.week_start=public.kiez_week(current_date) and not p.is_banned and not p.is_tester
      and (case category when 'bottles' then w.bottles else w.wins end)>0
    order by 1 limit 20;
end $function$;
