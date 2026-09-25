CREATE OR REPLACE FUNCTION public.pay_bail()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                   declare p public.profiles;
                                                                                                                                                                                                                                   begin
                                                                                                                                                                                                                                    select * into p from public.profiles where id=auth.uid() for update;
                                                                                                                                                                                                                                     if p.jail_until is null or p.jail_until<=now() then raise exception 'Du bist nicht im Knast';end if;
                                                                                                                                                                                                                                      if p.money<p.jail_bail then raise exception 'Dafür reicht deine Kohle nicht';end if;
                                                                                                                                                                                                                                       update public.profiles set money=money-jail_bail,jail_until=null,jail_bail=0 where id=auth.uid() returning * into p;
                                                                                                                                                                                                                                        return to_jsonb(p);
                                                                                                                                                                                                                                        end;$function$;
