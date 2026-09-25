CREATE OR REPLACE FUNCTION public.admin_resolve_report(report_id bigint, new_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception 'Kein Adminzugriff';end if;
 if new_status not in ('resolved','dismissed') then raise exception 'Ungültiger Status';end if;
 update public.player_reports set status=new_status where id=report_id;
end $function$;
