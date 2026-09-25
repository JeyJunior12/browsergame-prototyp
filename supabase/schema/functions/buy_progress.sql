CREATE OR REPLACE FUNCTION public.buy_progress(progress_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles; price numeric(12,2); label text;
begin
  select * into p from public.profiles where id=auth.uid() for update;
    if progress_type='area' then
        if p.area_level>=5 then raise exception 'Alle Gebiete freigeschaltet'; end if;
            price:=(array[25,100,350,1200])[p.area_level];
                label:='Sammelgebiet';
                    if p.streetwise<p.area_level+1 then raise exception 'Dafuer brauchst du mehr Geschick'; end if;
                        if p.money<price then raise exception 'Dafuer reicht deine Kohle nicht'; end if;
                            update public.profiles set money=money-price,area_level=area_level+1 where id=auth.uid() returning * into p;
                              elsif progress_type='music' then
                                  if p.music_level>=9 then raise exception 'Du hast schon das beste Instrument'; end if;
                                      price:=(array[1,5,20,60,180,450,900,1800,3500])[p.music_level+1];
                                          label:='Instrument';
                                              if p.music_skill<p.music_level+1 then raise exception 'Dafuer musst du erst mehr Musik-Weiterbildung machen'; end if;
                                                  if p.money<price then raise exception 'Dafuer reicht deine Kohle nicht'; end if;
                                                      update public.profiles set money=money-price,music_level=music_level+1,music_collected_at=now() where id=auth.uid() returning * into p;
                                                        elsif progress_type='wash' then
                                                            if p.wash_level>=2 then raise exception 'Du hast schon die beste Waschausstattung'; end if;
                                                                price:=(array[6,25])[p.wash_level+1];
                                                                    label:=(array['Schwamm','Waschanlage'])[p.wash_level+1];
                                                                        if p.money<price then raise exception 'Dafuer reicht deine Kohle nicht'; end if;
                                                                            update public.profiles set money=money-price,wash_level=wash_level+1 where id=auth.uid() returning * into p;
                                                                              else
                                                                                  raise exception 'Unbekannter Fortschritt';
                                                                                    end if;
                                                                                      return jsonb_build_object('label',label,'price',price,'profile',to_jsonb(p));
                                                                                      end
                                                                                      $function$;
