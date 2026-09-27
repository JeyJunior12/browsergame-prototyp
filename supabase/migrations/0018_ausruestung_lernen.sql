-- 0018: Sprint S2 – Ausrüstung nur einmal, Anlegen/Ablegen, Kampfwerte-Übersicht, Lernwarteschlange (ROADMAP 105–110, 69d)

-- ---------- Doppelte Stücke erstatten (vor der neuen Regel) ----------
do $$
declare r record;
begin
  for r in select i.user_id, i.item_id, i.quantity, s.price, s.name from public.inventory i join public.shop_items s on s.id=i.item_id where i.quantity > 1 loop
    perform public.kiez_pay(r.user_id, (r.quantity-1)*r.price);
    update public.inventory set quantity=1 where user_id=r.user_id and item_id=r.item_id;
    perform public.kiez_notify(r.user_id,'erfolg','↩ '||(r.quantity-1)||'× „'||r.name||'“ doppelt gekauft – '||to_char((r.quantity-1)*r.price,'FM999990.00')||' € erstattet. Jedes Stück gibt es jetzt nur einmal.');
  end loop;
end $$;

-- ---------- Jedes Stück nur einmal (gilt für Kaufen und Basteln; der ganze Vorgang wird zurückgerollt) ----------
create or replace function public.kiez_inventory_once() returns trigger language plpgsql as $function$
begin
  if new.quantity > 1 then raise exception 'Das hast du schon – jedes Stück gibt es nur einmal'; end if;
  return new;
end $function$;
drop trigger if exists inventory_once on public.inventory;
create trigger inventory_once before insert or update of quantity on public.inventory for each row execute function public.kiez_inventory_once();

-- ---------- Anlegen / Ablegen ----------
create or replace function public.equip_item(wanted_item text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; wanted public.shop_items; slot text;
begin
  p := public.kiez_actor();
  if not exists(select 1 from public.inventory where user_id=p.id and item_id=wanted_item) then raise exception 'Das hast du nicht – erst kaufen'; end if;
  select * into wanted from public.shop_items where id=wanted_item;
  slot := public.item_slot(wanted);
  update public.inventory i set equipped=false from public.shop_items s
  where i.user_id=p.id and s.id=i.item_id and public.item_slot(s)=slot;
  update public.inventory set equipped=true where user_id=p.id and item_id=wanted_item;
  return jsonb_build_object('equipped',wanted_item,'name',wanted.name,'slot',slot,'combat',public.combat_overview());
end $function$;

create or replace function public.unequip_item(wanted_item text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; nm text;
begin
  p := public.kiez_actor();
  update public.inventory set equipped=false where user_id=p.id and item_id=wanted_item and equipped;
  if not found then raise exception 'Das trägst du gerade nicht'; end if;
  select name into nm from public.shop_items where id=wanted_item;
  return jsonb_build_object('unequipped',wanted_item,'name',nm,'combat',public.combat_overview());
end $function$;

-- ---------- Kampfwerte aufgeschlüsselt (Grundwert + Boni) ----------
create or replace function public.combat_overview()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid();
  if p.id is null then raise exception 'Nicht angemeldet'; end if;
  return jsonb_build_object(
    'attack', jsonb_build_object(
      'base', p.attack_skill*3 + p.streetwise,
      'items', coalesce((select sum(s.attack) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0),
      'pets', coalesce((select sum(pc.attack*up.attack_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0),
      'gang', coalesce((select g.attack_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0),
      'plunder', coalesce((select attack from public.plunder_catalog where id=p.equipped_plunder),0),
      'total', public.kiez_attack_power(p)),
    'defense', jsonb_build_object(
      'base', p.defense_skill*3,
      'shelter', (array[1,4,8,17,21,24,28,31,34,42,51,58,64,73,82,89,102,125,147,158])[least(greatest(p.shelter_level,1),20)],
      'items', coalesce((select sum(s.defense) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0),
      'pets', coalesce((select sum(pc.defense*up.defense_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0),
      'gang', coalesce((select g.defense_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0),
      'plunder', coalesce((select defense from public.plunder_catalog where id=p.equipped_plunder),0),
      'traps', coalesce((select sum(amount) from public.user_active_defenses where user_id=p.id and (expires_at is null or expires_at>now())),0),
      'total', public.kiez_defense_power(p)),
    'equipped', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'slot',public.item_slot(s),'attack',s.attack,'defense',s.defense))
                 from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),'[]'::jsonb),
    'owned', coalesce((select jsonb_agg(i.item_id) from public.inventory i where i.user_id=p.id),'[]'::jsonb));
end $function$;

-- ---------- Lernwarteschlange: bis zu 3 geplante Weiterbildungen, starten automatisch nacheinander ----------
alter table public.profiles add column if not exists training_price numeric(12,2);
create table if not exists public.training_queue(
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_type text not null,
  created_at timestamptz not null default now());
create index if not exists training_queue_user_idx on public.training_queue(user_id, id);

-- Preis und Dauer einer Weiterbildungsstufe (gleiche Formeln wie start_training aus 0002)
create or replace function public.kiez_training_cost(p public.profiles, skill_type text, extra int default 0)
returns jsonb language plpgsql stable as $function$
declare lvl int; price numeric; mins int; base numeric; maxl int := 150;
begin
  lvl := extra + case skill_type when 'attack' then p.attack_skill when 'defense' then p.defense_skill when 'streetwise' then p.streetwise
    when 'social' then p.social_skill when 'music' then p.music_skill when 'stamina' then p.stamina when 'speech' then p.speech_skill
    when 'pickpocket' then p.pickpocket_skill end;
  if lvl is null then raise exception 'Unbekannte Weiterbildung'; end if;
  case skill_type
    when 'attack' then price := 9.80+(lvl-1)*5.00; mins := 24+(lvl-1)*3;
    when 'defense' then price := 3.20+(lvl-1)*5.00; mins := 8+(lvl-1)*1;
    when 'streetwise' then price := 20.00+(lvl-1)*5.00; mins := 50+(lvl-1)*5;
    when 'social' then maxl := 45; price := round(10*power(lvl::numeric,1.65),2); mins := round(power(lvl::numeric,1.28)*2);
    when 'music' then maxl := 9; price := round(25*power(lvl::numeric,1.9),2); mins := round(power(lvl::numeric,1.5)*3);
    else base := case skill_type when 'stamina' then 6 when 'speech' then 7 else 12 end;
      price := round(base*power(lvl::numeric,1.65),2); mins := round(power(lvl::numeric,1.28)*2)::int;
  end case;
  return jsonb_build_object('level',lvl,'next',lvl+1,'price',price,'minutes',least(10080,greatest(1,mins)),'max',maxl,'maxed',lvl>=maxl);
end $function$;

-- start_training wie 0002, merkt sich zusätzlich den Preis (für Abbrechen mit halber Erstattung)
create or replace function public.start_training(skill_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; c jsonb; price numeric; dur interval;
begin
  p := public.kiez_actor();
  if p.training_ends_at is not null and p.training_ends_at>now() then raise exception 'Du lernst bereits etwas'; end if;
  if p.training_type is not null then raise exception 'Erst die fertige Weiterbildung abschließen'; end if;
  c := public.kiez_training_cost(p, skill_type);
  if (c->>'maxed')::boolean then
    raise exception 'Maximalstufe % erreicht', c->>'max';
  end if;
  price := (c->>'price')::numeric;
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  dur := make_interval(mins=>(c->>'minutes')::int);
  dur := dur - public.kiez_conc_saving(p.concentration_ends_at, dur);
  update public.profiles set money=money-price,training_type=skill_type,training_ends_at=now()+dur,training_price=price
  where id=p.id returning * into p;
  return jsonb_build_object('minutes',ceil(extract(epoch from dur)/60)::int,'price',price,'profile',to_jsonb(p));
end $function$;

create or replace function public.cancel_training()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; back numeric;
begin
  p := public.kiez_actor();
  if p.training_type is null then raise exception 'Keine Weiterbildung aktiv'; end if;
  if p.training_ends_at<=now() then raise exception 'Die Weiterbildung ist schon fertig – einfach abschließen'; end if;
  back := round(coalesce(p.training_price,0)/2,2);
  update public.profiles set training_type=null, training_ends_at=null, training_price=null where id=p.id;
  perform public.kiez_pay(p.id, back);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('refund',back,'profile',to_jsonb(p));
end $function$;

create or replace function public.queue_training(skill_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; n int; c jsonb;
begin
  p := public.kiez_actor();
  select count(*) into n from public.training_queue where user_id=p.id;
  if n >= 3 then raise exception 'In der Warteschlange ist nur Platz für 3 Weiterbildungen'; end if;
  -- Stufe berücksichtigt laufende und schon geplante Stufen derselben Fähigkeit
  c := public.kiez_training_cost(p, skill_type,
         (select count(*)::int from public.training_queue where user_id=p.id and training_queue.skill_type=queue_training.skill_type)
         + (p.training_type = skill_type)::int);
  if (c->>'maxed')::boolean then raise exception 'Maximalstufe % erreicht', c->>'max'; end if;
  insert into public.training_queue(user_id, skill_type) values(p.id, skill_type);
  return public.training_queue_status();
end $function$;

create or replace function public.unqueue_training(entry_id bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  delete from public.training_queue where id=entry_id and user_id=auth.uid();
  if not found then raise exception 'Eintrag nicht gefunden'; end if;
  return public.training_queue_status();
end $function$;

-- Status + automatisch weiter: fertige Weiterbildung abschließen und die nächste aus der Warteschlange starten
create or replace function public.training_queue_status()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; q record; done jsonb := null; started text := null; problem text := null; extra jsonb := '{}'::jsonb; lvl_extra int;
begin
  p := public.kiez_actor();
  if p.training_type is not null and p.training_ends_at <= now() then
    done := public.finish_training();
    select * into p from public.profiles where id=p.id;
  end if;
  if p.training_type is null then
    select * into q from public.training_queue where user_id=p.id order by id limit 1;
    if q.id is not null then
      begin
        perform public.start_training(q.skill_type);
        delete from public.training_queue where id=q.id;
        started := q.skill_type;
      exception when others then problem := sqlerrm;
      end;
      select * into p from public.profiles where id=p.id;
    end if;
  end if;
  return jsonb_build_object(
    'current', case when p.training_type is null then null else jsonb_build_object('skill',p.training_type,'ends_at',p.training_ends_at,
               'next_level',(public.kiez_training_cost(p,p.training_type)->>'next')::int,'price',p.training_price) end,
    'queue', coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'skill',t.skill_type,
               'price',(public.kiez_training_cost(p,t.skill_type,(select count(*)::int from public.training_queue u where u.user_id=p.id and u.skill_type=t.skill_type and u.id<t.id) + (p.training_type=t.skill_type)::int)->>'price')::numeric,
               'minutes',(public.kiez_training_cost(p,t.skill_type,(select count(*)::int from public.training_queue u where u.user_id=p.id and u.skill_type=t.skill_type and u.id<t.id) + (p.training_type=t.skill_type)::int)->>'minutes')::int,
               'next_level',(public.kiez_training_cost(p,t.skill_type,(select count(*)::int from public.training_queue u where u.user_id=p.id and u.skill_type=t.skill_type and u.id<t.id) + (p.training_type=t.skill_type)::int)->>'next')::int)
               order by t.id) from public.training_queue t where t.user_id=p.id),'[]'::jsonb),
    'finished', done, 'started', started, 'problem', problem, 'profile', to_jsonb(p));
end $function$;

alter table public.training_queue enable row level security;
drop policy if exists "own queue" on public.training_queue;
create policy "own queue" on public.training_queue for select using (user_id = auth.uid());
grant select on public.training_queue to authenticated;
revoke insert, update, delete, truncate on public.training_queue from anon, authenticated;
