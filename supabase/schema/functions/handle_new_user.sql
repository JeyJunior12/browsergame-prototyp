CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles(id, username)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'username',''), 'Kiezkind_' || substr(new.id::text,1,6)));
  return new;
end; $function$;
