-- Testmodus (wie 0039, wird nach dem Durchspiel-Test mit entfernt): Testkonten dürfen ihre eigenen Geldänderungen lesen,
-- um unerklärte Abzüge im Durchspiel-Test aufzuklären (Befund: beim ersten Computer-Kampf eines Besuchs fehlten 200–400 €).
create or replace function public.tester_money_log(n integer default 50) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid();
  if p.id is null or not coalesce(p.is_tester,false) then raise exception 'Nur für Testkonten'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a) order by a.id desc) from (select * from public.profile_audit where user_id=p.id order by id desc limit least(greatest(n,1),500)) a),'[]'::jsonb);
end $$;
grant execute on function public.tester_money_log(integer) to authenticated;
