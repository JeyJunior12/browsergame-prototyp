CREATE OR REPLACE FUNCTION public.audit_profile_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if (old.money is distinct from new.money) or (old.energy is distinct from new.energy) or (old.bottles is distinct from new.bottles) then
  insert into public.profile_audit(user_id,old_money,new_money,old_energy,new_energy,old_bottles,new_bottles) values(new.id,old.money,new.money,old.energy,new.energy,old.bottles,new.bottles);
 end if;
 return new;
end;$function$;
