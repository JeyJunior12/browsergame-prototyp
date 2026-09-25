CREATE OR REPLACE FUNCTION public.beg_at_spot(spot_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    declare
     p public.profiles;
      rate numeric;
       cnt int;
        pet_sympathy int:=0;
         total numeric;
         begin
          select * into p from public.profiles where id=auth.uid() for update;
           if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt';end if;
            if p.energy<5 then raise exception 'Nicht genug Energie zum Schnorren';end if;
             case spot_id
               when 'englischer_garten' then rate:=0.10;
                 when 'jahrmarkt' then rate:=0.50;
                   else raise exception 'Diesen Schnorrplatz gibt es nicht';
                    end case;
                     select coalesce(pc.health*up.level,0) into pet_sympathy from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=auth.uid() and up.active limit 1;
                      cnt:=1+floor(random()*10)::int;
                       total:=round(cnt*rate*least(3.0,1+pet_sympathy/200.0),2);
                        total:=least(total,greatest(0,p.cash_capacity-p.money));
                         update public.profiles set money=money+total,energy=energy-5 where id=auth.uid() returning * into p;
                          return jsonb_build_object('spot',spot_id,'count',cnt,'rate',rate,'sympathy',pet_sympathy,'total',total,'profile',to_jsonb(p));
                          end;
                          $function$;
