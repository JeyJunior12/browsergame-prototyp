-- 0011: Testmodus – Vorspulen beendet keine Bandenkriege mehr (sonst zählten Kämpfe danach nicht);
-- dafür eigener Aufruf tester_end_wars(). Nur Testkonten.
create or replace function public.tester_fast_forward()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
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
  return to_jsonb(p);
end $function$;

create or replace function public.tester_end_wars()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; g uuid; n int;
begin
  p := public.kiez_require_tester();
  select gang_id into g from public.gang_members where user_id=p.id;
  if g is not null then
    update public.gang_wars set ends_at=now() where not resolved and (attacker_gang=g or defender_gang=g)
      and attacker_gang in (select gm.gang_id from public.gang_members gm join public.profiles t on t.id=gm.user_id where t.is_tester)
      and defender_gang in (select gm.gang_id from public.gang_members gm join public.profiles t on t.id=gm.user_id where t.is_tester);
  end if;
  n := public.resolve_gang_wars();
  -- danach die 3-Tage-Sperre für neue Kriege zwischen Testbanden aufheben
  update public.gang_wars set started_at=started_at-interval '4 days' where resolved and g is not null and (attacker_gang=g or defender_gang=g);
  return jsonb_build_object('resolved',n);
end $function$;
