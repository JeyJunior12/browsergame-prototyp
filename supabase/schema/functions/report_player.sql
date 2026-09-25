CREATE OR REPLACE FUNCTION public.report_player(target_id uuid, report_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare rid bigint;
begin
 if target_id=auth.uid() then raise exception 'Du kannst dich nicht selbst melden';end if;
 insert into public.player_reports(reporter_id,reported_id,reason) values(auth.uid(),target_id,trim(report_reason)) returning id into rid;
 return jsonb_build_object('id',rid);
end;$function$;
