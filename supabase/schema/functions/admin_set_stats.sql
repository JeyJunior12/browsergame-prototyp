CREATE OR REPLACE FUNCTION public.admin_set_stats(target_id uuid, new_money numeric DEFAULT NULL::numeric, new_energy integer DEFAULT NULL::integer, new_alcohol numeric DEFAULT NULL::numeric, new_bottles integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare caller uuid := auth.uid(); caller_is_admin boolean; p profiles; begin select is_admin into caller_is_admin from profiles where id = caller; if not coalesce(caller_is_admin, false) then raise exception 'not authorized'; end if; update profiles set money = coalesce(new_money, money), energy = coalesce(new_energy, energy), alcohol_level = coalesce(new_alcohol, alcohol_level), bottles = coalesce(new_bottles, bottles) where id = target_id returning * into p; return jsonb_build_object('money', p.money, 'energy', p.energy, 'alcohol_level', p.alcohol_level, 'bottles', p.bottles); end; $function$;
