CREATE OR REPLACE FUNCTION public.buy_pet(wanted_pet text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                               declare p public.profiles;pet public.pet_catalog;
                               begin select * into p from public.profiles where id=auth.uid() for update;select * into pet from public.pet_catalog where id=wanted_pet;
                                if pet.id is null then raise exception 'Begleiter unbekannt';end if;if p.social_skill<pet.required_level then raise exception 'Dafür brauchst du mehr Sozialkontakte (Stufe %)',pet.required_level;end if;
                                 if p.money<pet.price then raise exception 'Dafür reicht deine Kohle nicht';end if;
                                  update public.profiles set money=money-pet.price where id=auth.uid() returning * into p;
                                   insert into public.user_pets(user_id,pet_id) values(auth.uid(),pet.id) on conflict do nothing;
                                    return jsonb_build_object('pet',to_jsonb(pet),'profile',to_jsonb(p));end;$function$;
