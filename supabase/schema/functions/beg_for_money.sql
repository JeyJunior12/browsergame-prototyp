CREATE OR REPLACE FUNCTION public.beg_for_money()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles;gain int;cost int:=5;gross numeric(12,2);paid numeric(12,2);lost numeric(12,2);
begin
 select * into p from public.profiles where id=auth.uid() for update;
 gain:=floor(extract(epoch from(now()-p.energy_updated_at))/60)::int;if gain>0 then p.energy:=least(100,p.energy+gain);end if;
 if p.energy<cost then raise exception 'Nicht genug Energie';end if;
 if p.last_beg_at is not null and p.last_beg_at>now()-interval '20 seconds' then raise exception 'Die Leute kennen deine Geschichte inzwischen';end if;
 gross:=round((0.10+p.streetwise*0.08)*(0.25+p.cleanliness/100.0)::numeric,2);
 paid:=least(gross,greatest(0,p.cash_capacity-p.money));lost:=gross-paid;
 update public.profiles set money=money+paid,total_earned=total_earned+paid,energy=p.energy-cost,energy_updated_at=now(),last_beg_at=now() where id=auth.uid() returning * into p;
 return jsonb_build_object('gross',gross,'paid',paid,'lost',lost,'profile',to_jsonb(p));
end;$function$;
