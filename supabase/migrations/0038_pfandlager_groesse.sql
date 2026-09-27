-- Nutzerwunsch: „wie viele von wie vielen Flaschen im Lager“ – das Pfandlager bekommt eine Größe je Ausbaustufe.
-- Volles Lager: neue Flaschen bleiben liegen. Ausbau wird dadurch sinnvoll (vorher nur Klau-Schutz für 10–300 €).
create or replace function public.kiez_storage_cap(lvl int) returns int language sql immutable as
$$ select (array[250,1000,5000,20000,80000])[least(greatest(coalesce(lvl,0),0),4)+1] $$;

create or replace function public.kiez_bottle_cap() returns trigger language plpgsql as $$
declare cap int := public.kiez_storage_cap(new.bottle_storage);
begin
  if new.bottles > cap then
    perform set_config('kiez.bottles_lost', (new.bottles - greatest(old.bottles, cap))::text, true);
    new.bottles := greatest(old.bottles, cap);
  end if;
  return new;
end $$;
drop trigger if exists profiles_bottle_cap on public.profiles;
-- nur wenn Spielaktionen Flaschen dazugeben (die schalten kiez.bottlecap ein) – Admin-/Test-Änderungen bleiben unberührt
create trigger profiles_bottle_cap before update of bottles on public.profiles
  for each row when (new.bottles > old.bottles and current_setting('kiez.bottlecap', true) = '1') execute function public.kiez_bottle_cap();

do $$
declare f text; src text;
begin
  foreach f in array array['dig_bin','do_side_action','finish_collection','resolve_tour_event','sort_game_finish'] loop
    select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
    execute regexp_replace(src, '\mbegin\M', 'begin perform set_config(''kiez.bottlecap'',''1'',true);', 'i');
  end loop;
end $$;

-- Ausbau: Preise passend zur neuen Größe (250 → 1.000 → 5.000 → 20.000 → 80.000 Flaschen)
create or replace function public.buy_bottle_storage() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric;
begin
  p := public.kiez_actor();
  if p.bottle_storage >= 4 then raise exception 'Dein Pfandlager ist schon voll ausgebaut'; end if;
  price := (array[15,150,1200,8000])[p.bottle_storage+1];
  if p.money < price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
  update public.profiles set money=money-price, bottle_storage=bottle_storage+1 where id=p.id returning * into p;
  return jsonb_build_object('level',p.bottle_storage,'price',price,'theft',10-2*p.bottle_storage,'cap',public.kiez_storage_cap(p.bottle_storage),'profile',to_jsonb(p));
end $function$;
