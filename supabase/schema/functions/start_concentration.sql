CREATE OR REPLACE FUNCTION public.start_concentration(duration_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                  declare p public.profiles;
                                                                                                                                                  begin
                                                                                                                                                   select * into p from public.profiles where id=auth.uid() for update;
                                                                                                                                                    if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt';end if;
                                                                                                                                                     if duration_minutes<1 or duration_minutes>480 then raise exception 'Ungültige Konzentrationszeit';end if;
                                                                                                                                                      if p.concentration_ends_at is not null and p.concentration_ends_at>now() then raise exception 'Du konzentrierst dich schon';end if;
                                                                                                                                                       update public.profiles set concentration_ends_at=now()+make_interval(mins=>duration_minutes) where id=auth.uid() returning * into p;
                                                                                                                                                        return to_jsonb(p);
                                                                                                                                                        end $function$;
