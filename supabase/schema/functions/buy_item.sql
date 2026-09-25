CREATE OR REPLACE FUNCTION public.buy_item(wanted_item text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles;i public.shop_items;
begin
 select * into p from public.profiles where id=auth.uid() for update;select * into i from public.shop_items where id=wanted_item;
 if i.id is null then raise exception 'Gegenstand unbekannt';end if;if p.level<i.required_level then raise exception 'Dein Level reicht nicht';end if;
 if p.money<i.price then raise exception 'Dafür reicht deine Kohle nicht';end if;
 update public.profiles set money=money-i.price where id=auth.uid() returning * into p;
 insert into public.inventory(user_id,item_id,quantity) values(auth.uid(),i.id,1) on conflict(user_id,item_id) do update set quantity=inventory.quantity+1;
 return jsonb_build_object('item',to_jsonb(i),'profile',to_jsonb(p));
end;$function$;
