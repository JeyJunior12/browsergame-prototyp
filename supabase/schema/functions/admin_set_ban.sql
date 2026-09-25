CREATE OR REPLACE FUNCTION public.admin_set_ban(target_id uuid, ban_value boolean, reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and is_admin) then raise exception 'Kein Adminzugriff';end if;
 update public.profiles set is_banned=ban_value,ban_reason=case when ban_value then reason else null end where id=target_id;
 return jsonb_build_object('target',target_id,'banned',ban_value);
end;$function$;
