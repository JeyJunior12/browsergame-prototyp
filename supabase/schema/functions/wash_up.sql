CREATE OR REPLACE FUNCTION public.wash_up(tier text DEFAULT 'schwamm'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles; price numeric(12,2); gain int; label text;
begin
  select * into p from public.profiles where id=auth.uid() for update;
    if p.cleanliness>=100 then raise exception 'Sauberer wird es heute nicht'; end if;
      if tier='waschanlage' then price:=25.00; gain:=50; label:='Waschanlage';
        else price:=6.00; gain:=10; label:='Schwamm'; end if;
          if p.money<price then raise exception 'Dafuer reicht deine Kohle nicht'; end if;
            update public.profiles set money=money-price, cleanliness=least(100,cleanliness+gain) where id=auth.uid() returning * into p;
              return jsonb_build_object('label',label,'price',price,'gain',gain,'profile',to_jsonb(p));
              end
              $function$;
