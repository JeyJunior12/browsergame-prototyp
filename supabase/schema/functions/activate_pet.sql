CREATE OR REPLACE FUNCTION public.activate_pet(wanted_pet text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin if not exists(select 1 from public.user_pets where user_id=auth.uid() and pet_id=wanted_pet) then raise exception 'Begleiter gehört dir nicht';end if;
 update public.user_pets set active=false where user_id=auth.uid();update public.user_pets set active=true where user_id=auth.uid() and pet_id=wanted_pet;
 return jsonb_build_object('active',wanted_pet);end;$function$;
