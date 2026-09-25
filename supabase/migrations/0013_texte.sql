-- 0013: Klare Meldungen mit Umlauten und nötiger Stufe ("Dafür brauchst du Geschick Stufe 2" statt "Dafuer brauchst du mehr Geschick")
create or replace function public.buy_progress(progress_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric(12,2); label text;
begin
  p := public.kiez_actor();
  if progress_type='area' then
    if p.area_level>=5 then raise exception 'Alle Gebiete freigeschaltet'; end if;
    price:=(array[25,100,350,1200])[p.area_level]; label:='Sammelgebiet';
    if p.streetwise<p.area_level+1 then raise exception 'Dafür brauchst du Geschick Stufe % (Weiterbildung)', p.area_level+1; end if;
    if p.money<price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
    update public.profiles set money=money-price,area_level=area_level+1 where id=p.id returning * into p;
  elsif progress_type='music' then
    if p.music_level>=9 then raise exception 'Du hast schon das beste Instrument'; end if;
    price:=(array[1,5,20,60,180,450,900,1800,3500])[p.music_level+1]; label:='Instrument';
    if p.music_skill<p.music_level+1 then raise exception 'Dafür brauchst du Musik Stufe % (Weiterbildung)', p.music_level+1; end if;
    if p.money<price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
    update public.profiles set money=money-price,music_level=music_level+1,music_collected_at=now() where id=p.id returning * into p;
  elsif progress_type='wash' then
    if p.wash_level>=2 then raise exception 'Du hast schon die beste Waschausstattung'; end if;
    price:=(array[6,25])[p.wash_level+1]; label:=(array['Schwamm','Waschanlage'])[p.wash_level+1];
    if p.money<price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
    update public.profiles set money=money-price,wash_level=wash_level+1 where id=p.id returning * into p;
  else raise exception 'Unbekannter Fortschritt';
  end if;
  return jsonb_build_object('label',label,'price',price,'profile',to_jsonb(p));
end $function$;

create or replace function public.start_collection(duration_minutes integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  perform public.kiez_assert_free(p);
  if p.cleanliness<20 then raise exception 'Du bist zu dreckig für die Tour – erst waschen (mindestens 20 Prozent Sauberkeit nötig)'; end if;
  if duration_minutes not in (10,30,60,240,480) then raise exception 'Ungültige Sammelzeit'; end if;
  if p.collection_ends_at is not null and p.collection_ends_at>now() then raise exception 'Der Einkaufswagen ist noch unterwegs'; end if;
  if p.collection_ends_at is not null then raise exception 'Erst den Einkaufswagen ausladen'; end if;
  if p.collection_ready_at is not null and p.collection_ready_at>now() then raise exception 'Der Einkaufswagen braucht noch Pause'; end if;
  update public.profiles set collection_started_at=now(),collection_ends_at=now()+make_interval(mins=>duration_minutes),collection_minutes=duration_minutes
  where id=p.id returning * into p;
  return to_jsonb(p);
end $function$;
