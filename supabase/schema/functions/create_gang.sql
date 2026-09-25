CREATE OR REPLACE FUNCTION public.create_gang(gang_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.gangs;p public.profiles;cost numeric:=10;
begin if exists(select 1 from public.gang_members where user_id=auth.uid()) then raise exception 'Du bist bereits in einer Bande';end if;
 select * into p from public.profiles where id=auth.uid() for update;if p.money<cost then raise exception 'Eine Bandengründung kostet 10 €';end if;
 insert into public.gangs(name,owner_id) values(trim(gang_name),auth.uid()) returning * into g;
 insert into public.gang_members(gang_id,user_id,role) values(g.id,auth.uid(),'owner');
 update public.profiles set money=money-cost where id=auth.uid();return to_jsonb(g);end;$function$;
