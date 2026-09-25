CREATE OR REPLACE FUNCTION public.buy_upgrade(upgrade_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    declare p public.profiles;price numeric(12,2);label text;newcap numeric(12,2);
    begin
     select * into p from public.profiles where id=auth.uid() for update;
      if upgrade_type='bag' then price:=(array[3,12,45,180,700])[least(p.bag_level,5)];label:='Pfandsack';
       elsif upgrade_type='container' then
         if p.container_level>=5 then raise exception 'Größerer Geldbehälter ist nicht mehr verfügbar';end if;
           price:=(array[20,150,3000,75000])[least(p.container_level,4)];
             label:=(array['Große Tüte','Beutel','Einkaufswagen','Container'])[least(p.container_level,4)];
              elsif upgrade_type='shelter' then raise exception 'Unterkünfte werden jetzt über Sozialkontakte freigeschaltet, nicht gekauft';
               elsif upgrade_type='streetwise' then price:=5*p.streetwise*p.streetwise;label:='Geschick';
                elsif upgrade_type='stamina' then price:=6*p.stamina*p.stamina;label:='Konzentration';
                 else raise exception 'Unbekanntes Upgrade';end if;
                  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht';end if;
                   if upgrade_type='bag' then update public.profiles set money=money-price,bag_level=bag_level+1 where id=auth.uid() returning * into p;
                    elsif upgrade_type='container' then newcap:=(array[100,1000,10000,1000000])[least(p.container_level,4)];update public.profiles set money=money-price,container_level=container_level+1,cash_capacity=newcap where id=auth.uid() returning * into p;
                     elsif upgrade_type='streetwise' then update public.profiles set money=money-price,streetwise=streetwise+1 where id=auth.uid() returning * into p;
                      else update public.profiles set money=money-price,stamina=stamina+1 where id=auth.uid() returning * into p;end if;
                       return jsonb_build_object('label',label,'price',price,'profile',to_jsonb(p));
                       end;$function$;
