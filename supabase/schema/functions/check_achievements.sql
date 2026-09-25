CREATE OR REPLACE FUNCTION public.check_achievements()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles; unlocked jsonb:='[]'::jsonb; a record;
begin
 select * into p from public.profiles where id=auth.uid() for update;
 if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
 for a in select * from public.achievement_defs d where
   (d.id='first_bottles' and p.bottles>=20) or
   (d.id='level_five' and p.level>=5) or
   (d.id='first_win' and p.wins>=1) or
   (d.id='rich' and p.money>=100) or
   (d.id='collector' and p.bottles>=100) or
   (d.id='veteran' and p.level>=10)
 loop
   if not exists(select 1 from public.user_achievements where user_id=p.id and achievement_id=a.id) then
     insert into public.user_achievements(user_id,achievement_id) values(p.id,a.id);
     update public.profiles set money=least(cash_capacity,money+a.reward) where id=p.id;
     unlocked:=unlocked||jsonb_build_array(jsonb_build_object('name',a.name,'reward',a.reward));
   end if;
 end loop;
 select * into p from public.profiles where id=auth.uid();
 return jsonb_build_object('unlocked',unlocked,'profile',to_jsonb(p));
end $function$;
