CREATE OR REPLACE FUNCTION public.start_training(skill_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    declare p public.profiles;price numeric;mins int;current_level int;base numeric;
    begin
     select * into p from public.profiles where id=auth.uid() for update;
      if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt';end if;
       if p.training_ends_at is not null and p.training_ends_at>now() then raise exception 'Du lernst bereits etwas';end if;
        case skill_type
         when 'attack' then
           current_level:=p.attack_skill;
             if current_level>=150 then raise exception 'Maximalstufe 150 erreicht';end if;
               price:=9.80+(current_level-1)*5.00;
                 mins:=24+(current_level-1)*3;
                  when 'defense' then
                    current_level:=p.defense_skill;
                      if current_level>=150 then raise exception 'Maximalstufe 150 erreicht';end if;
                        price:=3.20+(current_level-1)*5.00;
                          mins:=8+(current_level-1)*1;
                           when 'streetwise' then
                             current_level:=p.streetwise;
                               if current_level>=150 then raise exception 'Maximalstufe 150 erreicht';end if;
                                 price:=20.00+(current_level-1)*5.00;
                                   mins:=50+(current_level-1)*5;
                                    when 'social' then
                                      current_level:=p.social_skill;
                                        if current_level>=45 then raise exception 'Maximalstufe 45 erreicht (alle Begleiter und Unterkünfte freigeschaltet)';end if;
                                          price:=round(10*power(current_level::numeric,1.65),2);
                                            mins:=round(power(current_level::numeric,1.28)*2);
                                             when 'music' then
                                               current_level:=p.music_skill;
                                                 if current_level>=9 then raise exception 'Maximalstufe 9 erreicht (mehr Instrumente gibt es noch nicht)';end if;
                                                   price:=round(25*power(current_level::numeric,1.9),2);
                                                     mins:=round(power(current_level::numeric,1.5)*3);
                                                      when 'stamina' then current_level:=p.stamina;base:=6;
                                                       when 'speech' then current_level:=p.speech_skill;base:=7;
                                                        when 'pickpocket' then current_level:=p.pickpocket_skill;base:=12;
                                                         else raise exception 'Unbekannte Weiterbildung';end case;
                                                          if skill_type in ('stamina','speech','pickpocket') then
                                                            if current_level>=150 then raise exception 'Maximalstufe 150 erreicht';end if;
                                                              price:=round(base*power(current_level::numeric,1.65),2);
                                                                mins:=least(10080,greatest(1,round(power(current_level::numeric,1.28)*2)::int));
                                                                 end if;
                                                                  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht';end if;
                                                                   mins:=least(10080,greatest(1,mins));
                                                                    if p.concentration_ends_at is not null and p.concentration_ends_at>now() then mins:=greatest(1,round(mins*0.9)::int);end if;
                                                                     update public.profiles set money=money-price,training_type=skill_type,training_ends_at=now()+make_interval(mins=>mins) where id=auth.uid() returning * into p;
                                                                      return jsonb_build_object('minutes',mins,'price',price,'profile',to_jsonb(p));
                                                                      end $function$;
