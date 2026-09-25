CREATE OR REPLACE FUNCTION public.refresh_my_profile()
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  p public.profiles;
    gain int;
      decay_hours numeric;
        fee numeric;
          loops int:=0;
          begin
            select * into p from public.profiles where id=auth.uid() for update;
              if p.id is null then raise exception 'Spielerprofil fehlt'; end if;
                gain := floor(extract(epoch from (now()-p.energy_updated_at))/60)::int;
                  if gain>0 then
                      update public.profiles set energy=least(100,energy+gain),energy_updated_at=now() where id=auth.uid() returning * into p;
                        end if;
                          decay_hours := extract(epoch from (now()-p.alcohol_updated_at))/3600;
                            if decay_hours>0 and p.alcohol_level>0 then
                                update public.profiles set alcohol_level=greatest(0,alcohol_level-decay_hours*0.50),alcohol_updated_at=now() where id=auth.uid() returning * into p;
                                  end if;
                                    while p.insurance_active and p.insurance_next_charge_at is not null and p.insurance_next_charge_at<=now() and loops<60 loop
                                        fee:=round(p.money*0.10,2);
                                            update public.profiles set money=greatest(0,money-fee),insurance_days_paid=insurance_days_paid+1,insurance_next_charge_at=insurance_next_charge_at+interval '1 day' where id=auth.uid() returning * into p;
                                                loops:=loops+1;
                                                  end loop;
                                                    return p;
                                                    end;
                                                    $function$;
