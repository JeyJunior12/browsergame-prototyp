-- 0012: Waschen als klare Stufen (vorher widersprüchlich: angezeigt 0,50 € / +35 %, berechnet 6 € / +10 %,
-- Waschanlage war nie nutzbar, weil ihr Kauf-Knopf versteckt war).
-- Katzenwäsche: immer, 0,50 € → +35 %. Schwamm (einmalig 6 € über buy_progress('wash')): 1,50 € → +60 %.
-- Waschanlage (einmalig 25 €): 3,00 € → 100 %.
create or replace function public.wash_up(tier text default 'katzenwaesche')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric(12,2); gain int; label text; need int;
begin
  p := public.kiez_actor();
  if p.cleanliness>=100 then raise exception 'Sauberer wird es heute nicht'; end if;
  case coalesce(tier,'katzenwaesche')
    when 'katzenwaesche' then price:=0.50; gain:=35; label:='Katzenwäsche'; need:=0;
    when 'schwamm'       then price:=1.50; gain:=60; label:='Schwamm';      need:=1;
    when 'waschanlage'   then price:=3.00; gain:=100; label:='Waschanlage'; need:=2;
    else raise exception 'Diese Wäsche gibt es nicht';
  end case;
  if p.wash_level<need then raise exception 'Dafür musst du erst den % kaufen', case need when 1 then 'Schwamm' else 'Zugang zur Waschanlage' end; end if;
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-price, cleanliness=least(100,cleanliness+gain) where id=p.id returning * into p;
  return jsonb_build_object('label',label,'price',price,'gain',gain,'profile',to_jsonb(p));
end $function$;
