CREATE OR REPLACE FUNCTION public.finish_pet_training(wanted_pet text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare up public.user_pets; begin select * into up from public.user_pets where user_id=auth.uid() and pet_id=wanted_pet for update; if up.pet_id is null or up.training_ends_at is null then raise exception 'Kein Training aktiv';end if; if up.training_ends_at>now() then raise exception 'Das Begleitertraining läuft noch';end if; if up.training_stat='attack' then update public.user_pets set attack_level=attack_level+1,training_ends_at=null,training_stat=null where user_id=auth.uid() and pet_id=wanted_pet returning * into up; elsif up.training_stat='defense' then update public.user_pets set defense_level=defense_level+1,training_ends_at=null,training_stat=null where user_id=auth.uid() and pet_id=wanted_pet returning * into up; else update public.user_pets set mitleid_level=mitleid_level+1,training_ends_at=null,training_stat=null where user_id=auth.uid() and pet_id=wanted_pet returning * into up; end if; return to_jsonb(up); end $function$;
