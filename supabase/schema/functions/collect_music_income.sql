CREATE OR REPLACE FUNCTION public.collect_music_income()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    declare p public.profiles;minutes int;rate numeric;gross numeric;paid numeric;lost numeric;
    begin
     select * into p from public.profiles where id=auth.uid() for update;
      if p.music_level<1 then raise exception 'Du besitzt noch kein Instrument';end if;
       minutes:=floor(extract(epoch from(now()-p.music_collected_at))/60)::int;
        if minutes<1 then raise exception 'Dein Publikum braucht noch einen Moment';end if;
         minutes:=least(minutes,720);rate:=(array[0.02,0.05,0.12,0.30,0.70,1.50,2.80,5.00,9.00])[p.music_level];
          gross:=minutes*rate;paid:=least(gross,greatest(0,p.cash_capacity-p.money));lost:=gross-paid;
           update public.profiles set money=money+paid,music_collected_at=now() where id=auth.uid() returning * into p;
            return jsonb_build_object('minutes',minutes,'rate',rate,'paid',paid,'lost',lost,'profile',to_jsonb(p));
            end;$function$;
