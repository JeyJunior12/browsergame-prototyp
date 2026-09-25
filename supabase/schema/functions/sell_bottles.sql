CREATE OR REPLACE FUNCTION public.sell_bottles(qty integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare p public.profiles; price numeric(5,2); sellqty int; gross numeric(12,2); paid numeric(12,2); lost numeric(12,2); bucket numeric; h numeric; begin select * into p from public.profiles where id=auth.uid() for update; if p.bottles<1 then raise exception 'Du hast keine Flaschen im Sack'; end if; sellqty:=coalesce(qty,p.bottles); if sellqty<1 then raise exception 'Ungültige Menge'; end if; if sellqty>p.bottles then sellqty:=p.bottles; end if; bucket:=floor(extract(epoch from now())/1200); h:=mod(bucket*1103515245+12345,2147483648); price:=round(0.10+(h/2147483648.0)*0.20,2); gross:=sellqty*price;paid:=least(gross,greatest(0,p.cash_capacity-p.money));lost:=gross-paid; update public.profiles set money=money+paid,bottles=bottles-sellqty,bottles_lifetime_earned=bottles_lifetime_earned+paid where id=auth.uid() returning * into p; return jsonb_build_object('price',price,'sold',sellqty,'gross',gross,'paid',paid,'lost',lost,'profile',to_jsonb(p)); end;$function$;
