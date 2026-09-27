-- Korrektur zu 0032: pet_catalog.health ist der Mitleid-Bonus fürs Schnorren (keine Lebenspunkte).
-- Niedriges Mitleid bei Kampftieren (Pitbull, Ratte …) und hohes bei Schnorr-Tieren (Chihuahua, Äffchen,
-- dressierte Maus) ist gewollt → Originalwerte zurück. Die dressierte Maus bleibt teurer (war billiger als der schwächere Pudel).
update public.pet_catalog set health=1 where id='pitbull';
update public.pet_catalog set health=0 where id in ('rat','cockroach');
update public.pet_catalog set health=1 where id in ('goldfish','pigeon');
update public.pet_catalog set health=253 where id='trained_mouse';
update public.pet_catalog set attack=32, defense=28, health=133 where id='chihuahua';
update public.pet_catalog set attack=52, defense=43, health=230 where id='monkey';

-- Kauf-Sperre einheitlich: Oberfläche zeigt „Benötigt Level X“, der Server prüfte nur Sozialkontakte (max. 45).
-- Jetzt: Spieler-Level ≥ required_level UND Sozialkontakte ≥ min(45, required_level) → Tiere bis Level 150 kaufbar.
create or replace function public.buy_pet(wanted_pet text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; pet public.pet_catalog;
begin
  p := public.kiez_actor();
  select * into pet from public.pet_catalog where id=wanted_pet;
  if pet.id is null then raise exception 'Begleiter unbekannt'; end if;
  if exists(select 1 from public.user_pets where user_id=p.id and pet_id=wanted_pet) then raise exception 'Diesen Begleiter hast du schon'; end if;
  if p.level<pet.required_level then raise exception 'Dafür brauchst du Level %', pet.required_level; end if;
  if p.social_skill<least(45,pet.required_level) then raise exception 'Dafür brauchst du mehr Sozialkontakte (Stufe %)', least(45,pet.required_level); end if;
  if p.money<pet.price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-pet.price where id=p.id returning * into p;
  insert into public.user_pets(user_id,pet_id) values(p.id,pet.id);
  return jsonb_build_object('pet',to_jsonb(pet),'profile',to_jsonb(p));
end $function$;
