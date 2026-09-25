CREATE OR REPLACE FUNCTION public.upgrade_gang(kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.gangs; gid uuid; cost numeric; lvl int;
begin
 select gm.gang_id into gid from public.gang_members gm where gm.user_id=auth.uid();
 if gid is null then raise exception 'Du bist in keiner Bande'; end if;
 select * into g from public.gangs where id=gid for update;
 if g.owner_id<>auth.uid() then raise exception 'Nur der Bandenchef darf ausbauen'; end if;
 if kind='attack' then lvl:=g.attack_level; else lvl:=g.defense_level; end if;
 if lvl>=10 then raise exception 'Bereits maximal ausgebaut'; end if;
 cost:=25*(lvl+1);
 if g.balance<cost then raise exception 'Zu wenig in der Bandenkasse'; end if;
 if kind='attack' then update public.gangs set balance=balance-cost,attack_level=attack_level+1 where id=gid returning * into g;
 elsif kind='defense' then update public.gangs set balance=balance-cost,defense_level=defense_level+1 where id=gid returning * into g;
 else raise exception 'Ungültiger Ausbau'; end if;
 return to_jsonb(g);
end $function$;
