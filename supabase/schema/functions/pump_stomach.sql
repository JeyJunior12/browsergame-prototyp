CREATE OR REPLACE FUNCTION public.pump_stomach()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                  declare p public.profiles;
                                                                                                                  begin
                                                                                                                   select * into p from public.profiles where id=auth.uid() for update;
                                                                                                                    if p.alcohol_level<=0 then raise exception 'Du bist doch schon nüchtern';end if;
                                                                                                                     if p.money<500 then raise exception 'Dafür reicht deine Kohle nicht';end if;
                                                                                                                      update public.profiles set money=money-500,alcohol_level=0,alcohol_bonus_until=null,alcohol_updated_at=now() where id=auth.uid() returning * into p;
                                                                                                                       return to_jsonb(p);
                                                                                                                       end;$function$;
