CREATE OR REPLACE FUNCTION public.buy_defense_item(wanted_item text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare p public.profiles; it public.defense_items; exp timestamptz; begin select * into p from public.profiles where id=auth.uid() for update; if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if; select * into it from public.defense_items where id=wanted_item; if it.id is null then raise exception 'Unbekannter Gegenstand'; end if; if p.money<it.price then raise exception 'Nicht genug Geld'; end if; update public.profiles set money=money-it.price where id=auth.uid() returning * into p; if it.duration_type='fixed' then exp:=now()+(it.duration_minutes||' minutes')::interval; else exp:=null; end if; insert into public.user_active_defenses(user_id,item_id,amount,expires_at,consume_on_attack) values(auth.uid(),it.id,it.amount,exp,it.duration_type='until_attack'); return jsonb_build_object('item',it.name,'price',it.price,'profile',to_jsonb(p)); end $function$;
