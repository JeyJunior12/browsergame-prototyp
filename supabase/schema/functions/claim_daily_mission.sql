CREATE OR REPLACE FUNCTION public.claim_daily_mission()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m public.daily_missions;p public.profiles;reward numeric:=5;
begin insert into public.daily_missions(user_id) values(auth.uid()) on conflict do nothing;
 select * into m from public.daily_missions where user_id=auth.uid() and mission_day=current_date for update;
 if m.progress<20 then raise exception 'Mission noch nicht geschafft';end if;if m.claimed then raise exception 'Belohnung bereits abgeholt';end if;
 select * into p from public.profiles where id=auth.uid() for update;reward:=least(reward,greatest(0,p.cash_capacity-p.money));
 update public.daily_missions set claimed=true where user_id=auth.uid() and mission_day=current_date;
 update public.profiles set money=money+reward,xp=xp+25 where id=auth.uid() returning * into p;
 return jsonb_build_object('reward',reward,'profile',to_jsonb(p));end;$function$;
