CREATE OR REPLACE FUNCTION public.claim_daily_reward()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles;new_streak int;reward numeric(12,2);
begin
 select * into p from public.profiles where id=auth.uid() for update;
 if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt';end if;
 if p.daily_claim_date=current_date then raise exception 'Tagesbelohnung bereits abgeholt';end if;
 new_streak:=case when p.daily_claim_date=current_date-1 then p.login_streak+1 else 1 end;
 reward:=least(12,2+new_streak*0.50);
 update public.profiles set daily_claim_date=current_date,login_streak=new_streak,money=least(cash_capacity,money+reward),xp=xp+10 where id=p.id returning * into p;
 return jsonb_build_object('streak',new_streak,'reward',reward,'profile',to_jsonb(p));
end $function$;
