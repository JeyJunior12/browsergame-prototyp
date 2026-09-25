CREATE OR REPLACE FUNCTION public.cancel_collection()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                          declare p public.profiles;
                          begin
                           select * into p from public.profiles where id=auth.uid() for update;
                            if p.collection_ends_at is null then raise exception 'Keine Pfandtour aktiv';end if;
                             update public.profiles set collection_started_at=null,collection_ends_at=null,collection_minutes=null where id=auth.uid() returning * into p;
                              return to_jsonb(p);
                              end $function$;
