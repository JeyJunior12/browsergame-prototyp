-- 0001: Sicherheitsluecken und klare Logikfehler schliessen (kein Balancing).

-- Spielernamen: 3-20 Zeichen, nur Buchstaben, Ziffern, Leerzeichen, _ . -
create or replace function public.valid_game_name(v text, min_len int, max_len int)
returns boolean language sql immutable as $$
  select v is not null
     and char_length(trim(v)) between min_len and max_len
     and trim(v) ~ '^[A-Za-z0-9ÄÖÜäöüß _.\-]+$'
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare wanted text := trim(coalesce(new.raw_user_meta_data->>'username',''));
begin
  if not public.valid_game_name(wanted,3,20)
     or exists(select 1 from public.profiles where lower(username)=lower(wanted)) then
    wanted := 'Kiezkind_' || substr(new.id::text,1,6);
  end if;
  insert into public.profiles(id, username) values(new.id, wanted);
  return new;
end $function$;

update public.profiles set username = 'Kiezkind_' || substr(id::text,1,6)
where not public.valid_game_name(username,3,20);

-- Bandengruendung: Name pruefen und eindeutig machen
create or replace function public.create_gang(gang_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare g public.gangs; p public.profiles; cost numeric := 10; clean text := trim(gang_name);
begin
  if exists(select 1 from public.gang_members where user_id=auth.uid()) then raise exception 'Du bist bereits in einer Bande'; end if;
  if not public.valid_game_name(clean,3,30) then raise exception 'Bandenname: 3 bis 30 Zeichen, nur Buchstaben, Zahlen, Leerzeichen, _ . -'; end if;
  if exists(select 1 from public.gangs where lower(name)=lower(clean)) then raise exception 'Diesen Bandennamen gibt es schon'; end if;
  select * into p from public.profiles where id=auth.uid() for update;
  if p.money<cost then raise exception 'Eine Bandengründung kostet 10 €'; end if;
  insert into public.gangs(name,owner_id) values(clean,auth.uid()) returning * into g;
  insert into public.gang_members(gang_id,user_id,role) values(g.id,auth.uid(),'owner');
  update public.profiles set money=money-cost where id=auth.uid();
  return to_jsonb(g);
end $function$;

update public.gangs set name = 'Bande ' || substr(id::text,1,6)
where not public.valid_game_name(name,3,30);

-- Meldungen: Grund begrenzen, Ziel muss existieren, max. 1 offene Meldung pro Paar
create or replace function public.report_player(target_id uuid, report_reason text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare rid bigint; clean text := trim(coalesce(report_reason,''));
begin
  if target_id=auth.uid() then raise exception 'Du kannst dich nicht selbst melden'; end if;
  if not exists(select 1 from public.profiles where id=target_id) then raise exception 'Spieler unbekannt'; end if;
  if char_length(clean) not between 3 and 300 then raise exception 'Grund muss 3 bis 300 Zeichen haben'; end if;
  if exists(select 1 from public.player_reports where reporter_id=auth.uid() and reported_id=target_id and status='open') then
    raise exception 'Du hast diesen Spieler bereits gemeldet'; end if;
  insert into public.player_reports(reporter_id,reported_id,reason) values(auth.uid(),target_id,clean) returning id into rid;
  return jsonb_build_object('id',rid);
end $function$;

-- Upgrades: nur noch Geldbehaelter. Pfandsack, Geschick und Konzentration liefen hier ohne Obergrenze
-- bzw. am Training vorbei.
create or replace function public.buy_upgrade(upgrade_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric(12,2); label text; newcap numeric(12,2);
begin
  if upgrade_type<>'container' then raise exception 'Dieser Ausbau ist nicht (mehr) kaufbar'; end if;
  select * into p from public.profiles where id=auth.uid() for update;
  if p.container_level>=5 then raise exception 'Größerer Geldbehälter ist nicht mehr verfügbar'; end if;
  price := (array[20,150,3000,75000])[p.container_level];
  label := (array['Große Tüte','Beutel','Einkaufswagen','Container'])[p.container_level];
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  newcap := (array[100,1000,10000,1000000])[p.container_level];
  update public.profiles set money=money-price,container_level=container_level+1,cash_capacity=newcap
  where id=auth.uid() returning * into p;
  return jsonb_build_object('label',label,'price',price,'profile',to_jsonb(p));
end $function$;

update public.profiles set bag_level = 6 where bag_level > 6;

-- Waschanlage nur mit gekaufter Waschanlage
create or replace function public.wash_up(tier text default 'schwamm')
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric(12,2); gain int; label text;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.cleanliness>=100 then raise exception 'Sauberer wird es heute nicht'; end if;
  if tier='waschanlage' then
    if p.wash_level<2 then raise exception 'Dafür brauchst du erst die Waschanlage'; end if;
    price:=25.00; gain:=50; label:='Waschanlage';
  else price:=6.00; gain:=10; label:='Schwamm'; end if;
  if p.money<price then raise exception 'Dafuer reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-price, cleanliness=least(100,cleanliness+gain) where id=auth.uid() returning * into p;
  return jsonb_build_object('label',label,'price',price,'gain',gain,'profile',to_jsonb(p));
end $function$;

-- Begleiter: kein doppelter Kauf (vorher war das Geld weg, aber kein zweites Tier da)
create or replace function public.buy_pet(wanted_pet text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; pet public.pet_catalog;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  select * into pet from public.pet_catalog where id=wanted_pet;
  if pet.id is null then raise exception 'Begleiter unbekannt'; end if;
  if exists(select 1 from public.user_pets where user_id=auth.uid() and pet_id=wanted_pet) then raise exception 'Diesen Begleiter hast du schon'; end if;
  if p.social_skill<pet.required_level then raise exception 'Dafür brauchst du mehr Sozialkontakte (Stufe %)',pet.required_level; end if;
  if p.money<pet.price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-pet.price where id=auth.uid() returning * into p;
  insert into public.user_pets(user_id,pet_id) values(auth.uid(),pet.id);
  return jsonb_build_object('pet',to_jsonb(pet),'profile',to_jsonb(p));
end $function$;

-- Ausruestung: je ein Platz fuer Waffe, Schutz und Zubehoer statt nur ein Gegenstand insgesamt
create or replace function public.item_slot(i public.shop_items)
returns text language sql immutable as $$
  select case when i.category in ('zubehoer','plunder') then 'zubehoer'
              when i.attack > i.defense then 'waffe'
              else 'schutz' end
$$;

create or replace function public.equip_item(wanted_item text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare wanted public.shop_items; slot text;
begin
  if not exists(select 1 from public.inventory where user_id=auth.uid() and item_id=wanted_item) then
    raise exception 'Gegenstand nicht im Inventar'; end if;
  select * into wanted from public.shop_items where id=wanted_item;
  slot := public.item_slot(wanted);
  update public.inventory i set equipped=false from public.shop_items s
  where i.user_id=auth.uid() and s.id=i.item_id and public.item_slot(s)=slot;
  update public.inventory set equipped=true where user_id=auth.uid() and item_id=wanted_item;
  return jsonb_build_object('equipped',wanted_item,'slot',slot);
end $function$;

-- Kampf: Ohne Bande lieferte die Bandenabfrage NULL, dadurch brach jeder Angriff ab
CREATE OR REPLACE FUNCTION public.attack_player(target_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare a public.profiles;d public.profiles;a_item_att int:=0;d_item_def int:=0;a_pet_att int:=0;d_pet_def int:=0;a_gang_att int:=0;d_gang_def int:=0;d_defense_bonus int:=0;a_power int;d_power int;winner uuid;loot numeric(12,2):=0;result text; begin if target_id=auth.uid() then raise exception 'Du kannst dich nicht selbst vermöbeln';end if; select * into a from public.profiles where id=auth.uid() for update; select * into d from public.profiles where id=target_id for update; if a.id is null or a.is_banned then raise exception 'Zugriff gesperrt';end if; if d.id is null or d.is_banned then raise exception 'Gegner verschwunden';end if; if a.collection_ends_at is not null then raise exception 'Dein Einkaufswagen ist unterwegs oder wartet aufs Ausladen';end if; if a.energy<15 then raise exception 'Nicht genug Energie für eine Prügelei';end if; if d.protection_until is not null and d.protection_until>now() then raise exception 'Dieser Spieler steht noch unter Schutz';end if; if exists(select 1 from public.fights where attacker_id=auth.uid() and defender_id=target_id and created_at>now()-interval '10 minutes') then raise exception 'Diesen Spieler hast du kürzlich schon besucht';end if; select coalesce(sum(s.attack),0) into a_item_att from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=auth.uid() and i.equipped; select coalesce(sum(s.defense),0) into d_item_def from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=target_id and i.equipped; select coalesce(sum(pc.attack*up.attack_level),0) into a_pet_att from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=auth.uid() and up.active; select coalesce(sum(pc.defense*up.defense_level),0) into d_pet_def from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=target_id and up.active; select coalesce(g.attack_level*2,0) into a_gang_att from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=auth.uid(); select coalesce(g.defense_level*2,0) into d_gang_def from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=target_id;
 a_gang_att:=coalesce(a_gang_att,0); d_gang_def:=coalesce(d_gang_def,0); select coalesce(sum(amount),0) into d_defense_bonus from public.user_active_defenses where user_id=target_id and (expires_at is null or expires_at>now()); a_power:=a.attack_skill*3+a.streetwise+a_item_att+a_pet_att+a_gang_att+floor(random()*8)::int; d_power:=d.defense_skill*3+d.shelter_level*2+d_item_def+d_pet_def+d_gang_def+d_defense_bonus+floor(random()*8)::int; if a_power>d_power then winner:=a.id;loot:=least(round(d.money*0.10,2),greatest(0,a.cash_capacity-a.money));result:='win'; update public.profiles set money=money+loot,energy=energy-15,xp=xp+15,wins=wins+1 where id=a.id returning * into a; update public.profiles set money=greatest(0,money-loot),losses=losses+1,protection_until=now()+interval '5 minutes' where id=d.id; else winner:=d.id;result:='loss'; update public.profiles set energy=energy-15,losses=losses+1,protection_until=now()+interval '2 minutes' where id=a.id returning * into a; update public.profiles set wins=wins+1 where id=d.id; end if; delete from public.user_active_defenses where user_id=target_id and consume_on_attack=true and (expires_at is null or expires_at>now()); insert into public.fights(attacker_id,defender_id,winner_id,attacker_power,defender_power,loot) values(a.id,d.id,winner,a_power,d_power,loot); return jsonb_build_object('result',result,'attacker_power',a_power,'defender_power',d_power,'loot',loot,'opponent',d.username,'profile',to_jsonb(a),'pet_bonus',a_pet_att,'gang_bonus',a_gang_att,'defender_defense_bonus',d_defense_bonus); end $function$;
