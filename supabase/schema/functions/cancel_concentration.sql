CREATE OR REPLACE FUNCTION public.cancel_concentration()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                            declare p public.profiles;
                                                                                                                                                            begin
                                                                                                                                                             update public.profiles set concentration_ends_at=null where id=auth.uid() returning * into p;
                                                                                                                                                              return to_jsonb(p);
                                                                                                                                                              end $function$;
