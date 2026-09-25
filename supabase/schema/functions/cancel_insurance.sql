CREATE OR REPLACE FUNCTION public.cancel_insurance()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                   declare p public.profiles;
                                                                                                                                   begin
                                                                                                                                    select * into p from public.profiles where id=auth.uid() for update;
                                                                                                                                     if not p.insurance_active then raise exception 'Du bist nicht versichert';end if;
                                                                                                                                      if p.insurance_days_paid<14 then raise exception 'Mindestlaufzeit von 14 Tagen noch nicht erreicht (%/14 Tage bezahlt)',p.insurance_days_paid;end if;
                                                                                                                                       update public.profiles set insurance_active=false where id=auth.uid() returning * into p;
                                                                                                                                        return to_jsonb(p);
                                                                                                                                        end;$function$;
