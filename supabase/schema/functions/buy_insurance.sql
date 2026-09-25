CREATE OR REPLACE FUNCTION public.buy_insurance()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                           declare p public.profiles;
                                                                                                                           begin
                                                                                                                            select * into p from public.profiles where id=auth.uid() for update;
                                                                                                                             if p.insurance_active then raise exception 'Du bist schon versichert';end if;
                                                                                                                              update public.profiles set insurance_active=true,insurance_since=now(),insurance_next_charge_at=now()+interval '1 day',insurance_days_paid=0 where id=auth.uid() returning * into p;
                                                                                                                               return to_jsonb(p);
                                                                                                                               end;$function$;
