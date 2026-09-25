CREATE OR REPLACE FUNCTION public.buy_scratch_ticket()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare p public.profiles; r numeric; prize numeric; begin select * into p from public.profiles where id=auth.uid() for update; if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if; if p.money<10 then raise exception 'Nicht genug Geld'; end if; r:=random()*1000; prize:=case when r<400 then 0 when r<650 then 1 when r<800 then 2 when r<900 then 5 when r<960 then 10 when r<985 then 20 when r<997 then 50 else 100 end; update public.profiles set money=money-10+prize where id=auth.uid() returning * into p; return jsonb_build_object('prize',prize,'profile',to_jsonb(p)); end $function$;
