CREATE OR REPLACE FUNCTION public.commit_crime(crime_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  p public.profiles;
    names text[]:=array['Handtaschenraub','Ladendiebstahl','Auto aufbrechen','Einbruch','Tankstellenüberfall','Bankraub','Kaugummiautomat aufbrechen'];
      risks int[]:=array[15,22,30,42,55,70,18];
        rewardmin numeric[]:=array[8,18,45,90,180,450,10];
          rewardmax numeric[]:=array[18,35,80,160,320,900,20];
            bails numeric[]:=array[8,18,35,70,150,400,10];
              jailmins int[]:=array[8,12,20,35,60,120,9];
                energy int[]:=array[6,8,10,14,18,22,7];
                  idx int;
                    caught boolean;
                      reward numeric;
                      begin
                        select * into p from public.profiles where id=auth.uid() for update;
                          if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
                            if p.jail_until is not null and p.jail_until>now() then raise exception 'Du sitzt schon im Knast'; end if;
                              idx:=crime_id;
                                if idx<1 or idx>array_length(names,1) then raise exception 'Unbekanntes Verbrechen'; end if;
                                  if p.energy<energy[idx] then raise exception 'Dafür reicht deine Energie nicht'; end if;
                                    caught:=random()*100<risks[idx];
                                      if caught then
                                          update public.profiles set energy=energy-energy[idx],jail_until=now()+make_interval(mins=>jailmins[idx]),jail_bail=bails[idx] where id=auth.uid() returning * into p;
                                              insert into public.side_action_log(user_id,action_type,success,money_change,xp_change) values(auth.uid(),'crime:'||names[idx],false,0,0);
                                                  return jsonb_build_object('caught',true,'name',names[idx],'bail',bails[idx],'jail_minutes',jailmins[idx],'profile',to_jsonb(p));
                                                    else
                                                        reward:=round((rewardmin[idx]+random()::numeric*(rewardmax[idx]-rewardmin[idx])),2);
                                                            reward:=least(reward,greatest(0,p.cash_capacity-p.money));
                                                                update public.profiles set energy=energy-energy[idx],money=money+reward,xp=xp+greatest(3,energy[idx]) where id=auth.uid() returning * into p;
                                                                    insert into public.side_action_log(user_id,action_type,success,money_change,xp_change) values(auth.uid(),'crime:'||names[idx],true,reward,greatest(3,energy[idx]));
                                                                        return jsonb_build_object('caught',false,'name',names[idx],'reward',reward,'profile',to_jsonb(p));
                                                                          end if;
                                                                          end;
                                                                          $function$;
