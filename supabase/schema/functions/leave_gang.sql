CREATE OR REPLACE FUNCTION public.leave_gang()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare gid uuid; own uuid; members int;
begin
 select gang_id into gid from public.gang_members where user_id=auth.uid();
 if gid is null then raise exception 'Du bist in keiner Bande'; end if;
 select owner_id into own from public.gangs where id=gid;
 select count(*) into members from public.gang_members where gang_id=gid;
 if own=auth.uid() and members>1 then raise exception 'Der Chef kann eine nichtleere Bande nicht verlassen'; end if;
 delete from public.gang_members where user_id=auth.uid();
 if own=auth.uid() then delete from public.gangs where id=gid; end if;
end $function$;
