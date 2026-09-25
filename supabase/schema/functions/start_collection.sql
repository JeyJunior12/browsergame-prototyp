CREATE OR REPLACE FUNCTION public.start_collection(duration_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
              declare p public.profiles;
              begin
                select * into p from public.profiles where id=auth.uid() for update;
                  if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
                    if p.jail_until is not null and p.jail_until>now() then raise exception 'Du sitzt im Knast'; end if;
                      if p.cleanliness<20 then raise exception 'Du bist zu dreckig fuer die Tour, erst waschen (mindestens 20 Prozent Sauberkeit noetig)'; end if;
                        if duration_minutes not in (10,30,60,240,480) then raise exception 'Ungueltige Sammelzeit'; end if;
                          if p.collection_ends_at is not null and p.collection_ends_at>now() then raise exception 'Der Einkaufswagen ist noch unterwegs'; end if;
                            if p.collection_ready_at is not null and p.collection_ready_at>now() then raise exception 'Der Einkaufswagen braucht noch Pause'; end if;
                              update public.profiles set collection_started_at=now(),collection_ends_at=now()+make_interval(mins=>duration_minutes),collection_minutes=duration_minutes where id=auth.uid() returning * into p;
                                return to_jsonb(p);
                                end
                                $function$;
