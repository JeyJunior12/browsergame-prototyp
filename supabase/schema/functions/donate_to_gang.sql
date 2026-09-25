CREATE OR REPLACE FUNCTION public.donate_to_gang(amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare gm public.gang_members;p public.profiles;
begin if amount<=0 then raise exception 'Betrag ungültig';end if;select * into gm from public.gang_members where user_id=auth.uid();
 if gm.gang_id is null then raise exception 'Du bist in keiner Bande';end if;select * into p from public.profiles where id=auth.uid() for update;
 if p.money<amount then raise exception 'Dafür reicht deine Kohle nicht';end if;
 update public.profiles set money=money-amount where id=auth.uid();update public.gangs set balance=balance+amount where id=gm.gang_id;
 return jsonb_build_object('donated',amount);end;$function$;
