CREATE OR REPLACE FUNCTION public.collect_bottles()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles;found_count int;new_xp int;new_level int;gain int;cost int;factor numeric;
begin select * into p from public.profiles where id=auth.uid() for update;if p.id is null then raise exception 'Spielerprofil fehlt';end if;
 gain:=floor(extract(epoch from(now()-p.energy_updated_at))/60)::int;if gain>0 then p.energy:=least(100,p.energy+gain);end if;
 cost:=greatest(5,10-floor(p.stamina/3)::int);if p.energy<cost then raise exception 'Nicht genug Energie';end if;
 if p.last_action_at is not null and p.last_action_at>now()-interval '8 seconds' then raise exception 'Der Einkaufswagen braucht kurz Pause';end if;
 factor:=(array[1.0,1.25,1.55,1.95,2.5])[least(p.area_level,5)];
 found_count:=floor((floor(random()*5)::int+2+p.streetwise+(p.bag_level-1)*2)*factor)::int;new_xp:=p.xp+5;new_level:=greatest(p.level,1+floor(new_xp/100)::int);
 update public.profiles set bottles=bottles+found_count,energy=p.energy-cost,cleanliness=greatest(0,cleanliness-5),xp=new_xp,level=new_level,last_action_at=now(),energy_updated_at=now() where id=auth.uid() returning * into p;
 insert into public.daily_missions(user_id,progress) values(auth.uid(),found_count) on conflict(user_id,mission_day) do update set progress=daily_missions.progress+excluded.progress;
 return jsonb_build_object('found',found_count,'energy_cost',cost,'factor',factor,'profile',to_jsonb(p));end;$function$;
