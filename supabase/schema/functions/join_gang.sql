CREATE OR REPLACE FUNCTION public.join_gang(wanted_gang uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin if exists(select 1 from public.gang_members where user_id=auth.uid()) then raise exception 'Du bist bereits in einer Bande';end if;
 if not exists(select 1 from public.gangs where id=wanted_gang) then raise exception 'Bande unbekannt';end if;
 if (select count(*) from public.gang_members where gang_id=wanted_gang)>=30 then raise exception 'Bande ist voll';end if;
 insert into public.gang_members(gang_id,user_id) values(wanted_gang,auth.uid());return jsonb_build_object('joined',wanted_gang);end;$function$;
