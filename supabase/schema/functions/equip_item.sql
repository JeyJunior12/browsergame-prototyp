CREATE OR REPLACE FUNCTION public.equip_item(wanted_item text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not exists(select 1 from public.inventory where user_id=auth.uid() and item_id=wanted_item) then raise exception 'Gegenstand nicht im Inventar';end if;
 update public.inventory set equipped=false where user_id=auth.uid();update public.inventory set equipped=true where user_id=auth.uid() and item_id=wanted_item;
 return jsonb_build_object('equipped',wanted_item);
end;$function$;
