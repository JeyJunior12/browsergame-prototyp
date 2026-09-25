CREATE OR REPLACE FUNCTION public.move_in_house()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                        declare p public.profiles;next_tier int;required_social int;
                                        begin
                                         select * into p from public.profiles where id=auth.uid() for update;
                                          next_tier:=coalesce(p.shelter_level,1)+1;
                                           if next_tier>20 then raise exception 'Du wohnst schon in der besten Unterkunft';end if;
                                            required_social:=2*(next_tier-1);
                                             if p.social_skill<required_social then raise exception 'Dafür brauchst du mehr Sozialkontakte (Stufe %)',required_social;end if;
                                              update public.profiles set shelter_level=next_tier where id=auth.uid() returning * into p;
                                               return to_jsonb(p);
                                               end;$function$;
