CREATE OR REPLACE FUNCTION public.block_banned_actor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and is_banned) then
   raise exception 'Dieses Konto wurde gesperrt';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $function$;
