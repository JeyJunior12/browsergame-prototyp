-- 0022: Banden I (ROADMAP 93–98, 11): Bandenlevel mit Erfahrung, Bandenhaus mit Räumen, Wochenaufgaben,
-- Kriege mit Tagesverlauf/Waffenruhe/Kapitulation, Überfall aufs Bandenhaus, Bündnisse und Feinde.

-- ---------- 93: Bandenlevel ----------
alter table public.gangs add column if not exists xp bigint not null default 0;
alter table public.gangs add column if not exists level integer not null default 1;

create or replace function public.kiez_gang_level(x bigint)
returns integer language sql immutable as $$ select least(20, 1 + floor(sqrt(greatest(x,0)/500.0))::int) $$;
create or replace function public.kiez_gang_level_xp(l integer)
returns bigint language sql immutable as $$ select (500*power(greatest(l,1)-1,2))::bigint $$;

create or replace function public.kiez_gang_xp(gid uuid, amount bigint, why text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare old_l int; new_l int; m record; nm text;
begin
  if gid is null or amount <= 0 then return; end if;
  select level, name into old_l, nm from public.gangs where id=gid for update;
  update public.gangs set xp=xp+amount, level=public.kiez_gang_level(xp+amount) where id=gid returning level into new_l;
  if new_l > old_l then
    insert into public.gang_log(gang_id,user_id,kind,amount,info) values(gid,null,'level',0,'Bandenlevel '||new_l||' erreicht ('||why||')');
    for m in select user_id from public.gang_members where gang_id=gid loop
      perform public.kiez_notify(m.user_id,'bande','Deine Bande „'||nm||'“ ist jetzt Level '||new_l||' – mehr Plätze und neue Räume im Bandenhaus!');
    end loop;
  end if;
end $function$;
revoke execute on function public.kiez_gang_xp(uuid,bigint,text) from public, anon, authenticated;

-- Plätze: 20 + 2 je Level
create or replace function public.kiez_gang_slots(gid uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select 20 + 2*coalesce((select level from public.gangs where id=gid),1)
$$;

create or replace function public.kiez_join(gid uuid, uid uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if exists(select 1 from public.gang_members where user_id=uid) then raise exception 'Schon in einer Bande'; end if;
  if (select count(*) from public.gang_members where gang_id=gid) >= public.kiez_gang_slots(gid) then
    raise exception 'Die Bande ist voll (% Plätze) – mit höherem Bandenlevel gibt es mehr', public.kiez_gang_slots(gid); end if;
  insert into public.gang_members(gang_id,user_id,role) values(gid,uid,'member');
  delete from public.gang_requests where user_id=uid;
  perform public.kiez_gang_log(gid,uid,'join',0,'ist beigetreten');
end $function$;

-- ---------- 95: Wochenaufgaben ----------
create table if not exists public.gang_week_tasks(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  week_start date not null,
  kind text not null check (kind in ('bottles','wins','donate')),
  target integer not null,
  progress integer not null default 0,
  done_at timestamptz,
  primary key(gang_id, week_start, kind));
create table if not exists public.gang_task_contrib(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  week_start date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  bottles integer not null default 0, wins integer not null default 0, donated numeric(12,2) not null default 0,
  primary key(gang_id, week_start, user_id));
alter table public.gang_week_tasks enable row level security;
alter table public.gang_task_contrib enable row level security;
drop policy if exists gang_week_tasks_read on public.gang_week_tasks;
create policy gang_week_tasks_read on public.gang_week_tasks for select using (true);
drop policy if exists gang_task_contrib_read on public.gang_task_contrib;
create policy gang_task_contrib_read on public.gang_task_contrib for select using (true);
grant select on public.gang_week_tasks, public.gang_task_contrib to authenticated;

-- Ziele der Woche anlegen (nach Mitgliederzahl)
create or replace function public.kiez_gang_tasks_ensure(gid uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare n int := greatest(2,(select count(*) from public.gang_members where gang_id=gid)); wk date := public.kiez_week(current_date);
begin
  insert into public.gang_week_tasks(gang_id,week_start,kind,target) values
    (gid,wk,'bottles',400*n),(gid,wk,'wins',8*n),(gid,wk,'donate',40*n)
  on conflict do nothing;
end $function$;

-- Fortschritt buchen; Ziel erreicht → alle Mitglieder 5 Kronkorken + 100 Punkte, Bande 500 Erfahrung
create or replace function public.kiez_gang_task_add(gid uuid, uid uuid, k text, amount numeric)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare wk date := public.kiez_week(current_date); t public.gang_week_tasks; m record;
begin
  if gid is null or amount <= 0 then return; end if;
  perform public.kiez_gang_tasks_ensure(gid);
  insert into public.gang_task_contrib(gang_id,week_start,user_id,bottles,wins,donated)
  values(gid,wk,uid,case when k='bottles' then amount else 0 end,case when k='wins' then amount else 0 end,case when k='donate' then amount else 0 end)
  on conflict (gang_id,week_start,user_id) do update set bottles=gang_task_contrib.bottles+excluded.bottles,
    wins=gang_task_contrib.wins+excluded.wins, donated=gang_task_contrib.donated+excluded.donated;
  update public.gang_week_tasks set progress=progress+floor(amount)::int where gang_id=gid and week_start=wk and kind=k returning * into t;
  if t.done_at is null and t.progress >= t.target then
    update public.gang_week_tasks set done_at=now() where gang_id=gid and week_start=wk and kind=k;
    for m in select user_id from public.gang_members where gang_id=gid loop
      update public.profiles set bottlecaps=bottlecaps+5, xp=xp+100 where id=m.user_id;
      perform public.kiez_notify(m.user_id,'bande','Wochenaufgabe geschafft: '||case k when 'bottles' then 'Flaschen' when 'wins' then 'Siege' else 'Kasse' end||' – +5 Kronkorken und +100 Punkte für alle!');
    end loop;
    perform public.kiez_gang_xp(gid,500,'Wochenaufgabe');
    perform public.kiez_gang_log(gid,null,'task',0,'Wochenaufgabe geschafft');
  end if;
end $function$;
revoke execute on function public.kiez_gang_task_add(uuid,uuid,text,numeric) from public, anon, authenticated;

-- Flaschen und Siege (aus dem Wochenwettbewerb) zählen für Bandenlevel und Wochenaufgaben
create or replace function public.kiez_gang_track_scores()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare db int; dw int; g uuid;
begin
  db := new.bottles - case when tg_op='UPDATE' then old.bottles else 0 end;
  dw := new.wins - case when tg_op='UPDATE' then old.wins else 0 end;
  select gang_id into g from public.gang_members where user_id=new.user_id;
  if g is null then return new; end if;
  if db > 0 then perform public.kiez_gang_xp(g, db, 'Flaschen'); perform public.kiez_gang_task_add(g,new.user_id,'bottles',db); end if;
  if dw > 0 then perform public.kiez_gang_xp(g, 25*dw, 'Siege'); perform public.kiez_gang_task_add(g,new.user_id,'wins',dw); end if;
  return new;
end $function$;
drop trigger if exists weekly_scores_gang on public.weekly_scores;
create trigger weekly_scores_gang after insert or update on public.weekly_scores for each row execute function public.kiez_gang_track_scores();

-- Einzahlungen, Kriegssiege, eroberte Viertel (aus dem Bandenprotokoll)
create or replace function public.kiez_gang_track_log()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.kind='donate' and new.amount>0 then
    perform public.kiez_gang_xp(new.gang_id, floor(new.amount)::bigint, 'Einzahlung');
    perform public.kiez_gang_task_add(new.gang_id, new.user_id, 'donate', new.amount);
  elsif new.kind='war' and new.info in ('Bandenkrieg gewonnen','Bandenkrieg abgewehrt') then
    perform public.kiez_gang_xp(new.gang_id, 500, 'Kriegssieg');
  elsif new.kind='revier' then
    perform public.kiez_gang_xp(new.gang_id, 1000, 'Viertel erobert');
  elsif new.kind='raid' and new.amount>0 then
    perform public.kiez_gang_xp(new.gang_id, 200, 'Überfall');
  end if;
  return new;
end $function$;
drop trigger if exists gang_log_xp on public.gang_log;
create trigger gang_log_xp after insert on public.gang_log for each row execute function public.kiez_gang_track_log();

-- ---------- 94/11: Bandenhaus mit Räumen ----------
create table if not exists public.gang_rooms(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  room text not null check (room in ('lager','training','zwinger','werkstatt','tresor','kneipe')),
  level integer not null default 0 check (level between 0 and 5),
  primary key(gang_id, room));
alter table public.gang_rooms enable row level security;
drop policy if exists gang_rooms_read on public.gang_rooms;
create policy gang_rooms_read on public.gang_rooms for select using (true);
grant select on public.gang_rooms to authenticated;

create or replace function public.kiez_gang_room(uid uuid, r text)
returns integer language sql stable security definer set search_path to 'public' as $$
  select coalesce((select gr.level from public.gang_members m join public.gang_rooms gr on gr.gang_id=m.gang_id and gr.room=r where m.user_id=uid),0)
$$;

-- Ausbau: Stufe n kostet 100·n² €, braucht Bandenlevel 2n−1 (Tresor/Kneipe ab Level 1, Rest wie angegeben)
create or replace function public.build_gang_room(r text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; g public.gangs; cur int; cost numeric; need int;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('co');
  if r not in ('lager','training','zwinger','werkstatt','tresor','kneipe') then raise exception 'Diesen Raum gibt es nicht'; end if;
  select * into g from public.gangs where id=m.gang_id for update;
  cur := coalesce((select level from public.gang_rooms where gang_id=g.id and room=r),0);
  if cur >= 5 then raise exception 'Der Raum ist schon voll ausgebaut'; end if;
  need := 2*(cur+1)-1; cost := 100*power(cur+1,2);
  if g.level < need then raise exception 'Dafür braucht die Bande Level %', need; end if;
  if g.balance < cost then raise exception 'Zu wenig in der Bandenkasse (% € nötig)', cost; end if;
  update public.gangs set balance=balance-cost where id=g.id;
  insert into public.gang_rooms(gang_id,room,level) values(g.id,r,1) on conflict (gang_id,room) do update set level=gang_rooms.level+1;
  perform public.kiez_gang_log(g.id,p.id,'room',-cost,'hat '||r||' auf Stufe '||(cur+1)||' ausgebaut');
  return jsonb_build_object('room',r,'level',cur+1,'cost',cost);
end $function$;

-- Kneipe: einmal am Tag +10 Energie je Stufe
alter table public.profiles add column if not exists pub_at date;
create or replace function public.gang_pub_drink()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; lvl int; gain int;
begin
  p := public.kiez_actor();
  perform public.kiez_my_gang('member');
  lvl := public.kiez_gang_room(p.id,'kneipe');
  if lvl < 1 then raise exception 'Eure Bande hat noch keine Kneipe'; end if;
  if p.pub_at = current_date then raise exception 'Heute gab es schon eine Runde – morgen wieder'; end if;
  gain := least(100 - p.energy, 10*lvl);
  update public.profiles set energy=energy+greatest(gain,0), pub_at=current_date where id=p.id returning * into p;
  return jsonb_build_object('energy',greatest(gain,0),'profile',to_jsonb(p));
end $function$;

-- Werkstatt: einmal am Tag Material (Stufe × zufällig)
alter table public.profiles add column if not exists workshop_at date;
create or replace function public.gang_workshop()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; lvl int; n int; w int; t int;
begin
  p := public.kiez_actor();
  perform public.kiez_my_gang('member');
  lvl := public.kiez_gang_room(p.id,'werkstatt');
  if lvl < 1 then raise exception 'Eure Bande hat noch keine Werkstatt'; end if;
  if p.workshop_at = current_date then raise exception 'Die Werkstatt hast du heute schon genutzt'; end if;
  n := lvl + floor(random()*(lvl+1))::int; w := lvl + floor(random()*(lvl+1))::int; t := floor(random()*(lvl+1))::int;
  update public.profiles set mat_nails=mat_nails+n, mat_wood=mat_wood+w, mat_textile=mat_textile+t, workshop_at=current_date
  where id=p.id returning * into p;
  return jsonb_build_object('nails',n,'wood',w,'textile',t,'profile',to_jsonb(p));
end $function$;

-- Lager: Plunder in der Bande teilen (Platz 10 je Stufe)
create table if not exists public.gang_storage(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  plunder_id text not null references public.plunder_catalog(id),
  qty integer not null check (qty >= 0),
  primary key(gang_id, plunder_id));
alter table public.gang_storage enable row level security;
drop policy if exists gang_storage_read on public.gang_storage;
create policy gang_storage_read on public.gang_storage for select using (exists(select 1 from public.gang_members m where m.gang_id=gang_storage.gang_id and m.user_id=auth.uid()));
grant select on public.gang_storage to authenticated;

create or replace function public.gang_store_plunder(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; lvl int; have int;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('member');
  lvl := public.kiez_gang_room(p.id,'lager');
  if lvl < 1 then raise exception 'Eure Bande hat noch kein Lager'; end if;
  if (select coalesce(sum(qty),0) from public.gang_storage where gang_id=m.gang_id) >= 10*lvl then raise exception 'Das Lager ist voll (% Plätze)', 10*lvl; end if;
  select quantity into have from public.user_plunder where user_id=p.id and plunder_id=wanted for update;
  if coalesce(have,0) < 1 then raise exception 'Diesen Plunder hast du nicht'; end if;
  if p.equipped_plunder=wanted and have < 2 then raise exception 'Leg den Plunder erst ab'; end if;
  update public.user_plunder set quantity=quantity-1 where user_id=p.id and plunder_id=wanted;
  delete from public.user_plunder where user_id=p.id and plunder_id=wanted and quantity=0;
  insert into public.gang_storage(gang_id,plunder_id,qty) values(m.gang_id,wanted,1) on conflict (gang_id,plunder_id) do update set qty=gang_storage.qty+1;
  perform public.kiez_gang_log(m.gang_id,p.id,'lager',0,'hat '||(select name from public.plunder_catalog where id=wanted)||' ins Lager gelegt');
  return jsonb_build_object('stored',wanted);
end $function$;

alter table public.profiles add column if not exists storage_taken_at date;
alter table public.profiles add column if not exists storage_taken integer not null default 0;
create or replace function public.gang_take_plunder(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; left_ int;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('member');
  if p.storage_taken_at = current_date and p.storage_taken >= 3 then raise exception 'Heute hast du schon 3 Stücke genommen'; end if;
  update public.gang_storage set qty=qty-1 where gang_id=m.gang_id and plunder_id=wanted and qty>0 returning qty into left_;
  if left_ is null then raise exception 'Das liegt nicht im Lager'; end if;
  delete from public.gang_storage where gang_id=m.gang_id and plunder_id=wanted and qty=0;
  perform public.kiez_give_plunder(p.id, wanted);
  update public.profiles set storage_taken=case when storage_taken_at=current_date then storage_taken+1 else 1 end, storage_taken_at=current_date where id=p.id;
  perform public.kiez_gang_log(m.gang_id,p.id,'lager',0,'hat '||(select name from public.plunder_catalog where id=wanted)||' aus dem Lager genommen');
  return jsonb_build_object('taken',wanted);
end $function$;

-- Zwinger: +2 Angriff/Verteidigung je Stufe, wenn ein Begleiter dabei ist
create or replace function public.kiez_zwinger_bonus(uid uuid)
returns integer language sql stable security definer set search_path to 'public' as $$
  select case when exists(select 1 from public.user_pets where user_id=uid and active) then 2*public.kiez_gang_room(uid,'zwinger') else 0 end
$$;

create or replace function public.kiez_attack_power(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select p.attack_skill*3 + p.streetwise
    + coalesce((select sum(s.attack) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0)
    + coalesce((select sum(pc.attack*up.attack_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0)
    + coalesce((select g.attack_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0) + public.kiez_zwinger_bonus(p.id)
    + (public.kiez_plunder_bonus(p)->>'attack')::int
$$;

create or replace function public.kiez_defense_power(p public.profiles)
returns integer language sql stable security definer set search_path to 'public' as $$
  select p.defense_skill*3
    + (array[1,4,8,17,21,24,28,31,34,42,51,58,64,73,82,89,102,125,147,158])[least(greatest(p.shelter_level,1),20)]
    + coalesce((select sum(s.defense) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0)
    + coalesce((select sum(pc.defense*up.defense_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0)
    + coalesce((select g.defense_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0) + public.kiez_zwinger_bonus(p.id)
    + (public.kiez_plunder_bonus(p)->>'defense')::int
    + coalesce((select sum(amount) from public.user_active_defenses where user_id=p.id and (expires_at is null or expires_at>now())),0)
    + public.kiez_stench_defense(p)
$$;

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
      'gang', coalesce((select g.attack_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0) + public.kiez_zwinger_bonus(p.id),
      'plunder', (public.kiez_plunder_bonus(p)->>'attack')::int,
      'total', public.kiez_attack_power(p)),
    'defense', jsonb_build_object(
      'base', p.defense_skill*3,
      'shelter', (array[1,4,8,17,21,24,28,31,34,42,51,58,64,73,82,89,102,125,147,158])[least(greatest(p.shelter_level,1),20)],
      'items', coalesce((select sum(s.defense) from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),0),
      'pets', coalesce((select sum(pc.defense*up.defense_level) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=p.id and up.active),0),
      'gang', coalesce((select g.defense_level*2 from public.gang_members gm join public.gangs g on g.id=gm.gang_id where gm.user_id=p.id),0) + public.kiez_zwinger_bonus(p.id),
      'plunder', (public.kiez_plunder_bonus(p)->>'defense')::int,
      'traps', coalesce((select sum(amount) from public.user_active_defenses where user_id=p.id and (expires_at is null or expires_at>now())),0),
      'stench', public.kiez_stench_defense(p),
      'total', public.kiez_defense_power(p)),
    'equipped', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'slot',public.item_slot(s),'attack',s.attack,'defense',s.defense))
                 from public.inventory i join public.shop_items s on s.id=i.item_id where i.user_id=p.id and i.equipped),'[]'::jsonb),
    'owned', coalesce((select jsonb_agg(i.item_id) from public.inventory i where i.user_id=p.id),'[]'::jsonb));
end $function$;

create or replace function public.kiez_training_cost(p public.profiles, skill_type text, extra int default 0)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare lvl int; price numeric; mins int; base numeric; maxl int := 150; room int;
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
  -- Trainingsraum im Bandenhaus: −5 % Lernzeit pro Stufe
  room := public.kiez_gang_room(p.id,'training');
  if room > 0 then mins := round(mins*(1-0.05*room)); end if;
  return jsonb_build_object('level',lvl,'next',lvl+1,'price',price,'minutes',least(10080,greatest(1,mins)),'max',maxl,'room_saving',room*5,'maxed',lvl>=maxl);
end $function$;
-- ---------- 98: Bündnisse und Feinde ----------
create table if not exists public.gang_relations(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  other_gang uuid not null references public.gangs(id) on delete cascade,
  kind text not null check (kind in ('ally','enemy')),
  status text not null default 'active' check (status in ('pending','active')),
  created_at timestamptz not null default now(),
  primary key(gang_id, other_gang));
alter table public.gang_relations enable row level security;
drop policy if exists gang_relations_read on public.gang_relations;
create policy gang_relations_read on public.gang_relations for select using (true);
grant select on public.gang_relations to authenticated;

create or replace function public.kiez_allied(a uuid, b uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select a is not null and b is not null and exists(select 1 from public.gang_relations where gang_id=a and other_gang=b and kind='ally' and status='active')
$$;

create or replace function public.set_gang_relation(target_gang uuid, rel text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; nm text; tn text; mm record;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('co');
  if target_gang = m.gang_id then raise exception 'Das ist deine eigene Bande'; end if;
  select name into tn from public.gangs where id=target_gang; if tn is null then raise exception 'Bande unbekannt'; end if;
  select name into nm from public.gangs where id=m.gang_id;
  if rel = 'ally' then
    if public.kiez_allied(m.gang_id,target_gang) then raise exception 'Ihr seid schon verbündet'; end if;
    if exists(select 1 from public.gang_wars where not resolved and ((attacker_gang=m.gang_id and defender_gang=target_gang) or (attacker_gang=target_gang and defender_gang=m.gang_id))) then
      raise exception 'Erst den Krieg beenden'; end if;
    if (select count(*) from public.gang_relations where gang_id=m.gang_id and kind='ally' and status='active') >= 3 then raise exception 'Höchstens 3 Verbündete'; end if;
    if exists(select 1 from public.gang_relations where gang_id=target_gang and other_gang=m.gang_id and kind='ally' and status='pending') then
      update public.gang_relations set status='active' where gang_id=target_gang and other_gang=m.gang_id;
      insert into public.gang_relations(gang_id,other_gang,kind,status) values(m.gang_id,target_gang,'ally','active')
      on conflict (gang_id,other_gang) do update set kind='ally', status='active';
      perform public.kiez_gang_log(m.gang_id,p.id,'bund',0,'Bündnis mit '||tn||' geschlossen');
      perform public.kiez_gang_log(target_gang,null,'bund',0,'Bündnis mit '||nm||' geschlossen');
      return jsonb_build_object('status','active');
    end if;
    insert into public.gang_relations(gang_id,other_gang,kind,status) values(m.gang_id,target_gang,'ally','pending')
    on conflict (gang_id,other_gang) do update set kind='ally', status='pending';
    for mm in select user_id from public.gang_members where gang_id=target_gang and role in ('owner','co') loop
      perform public.kiez_notify(mm.user_id,'bande','Die Bande „'||nm||'“ bietet euch ein Bündnis an – im Bandenhaus annehmen.');
    end loop;
    return jsonb_build_object('status','pending');
  elsif rel = 'enemy' then
    delete from public.gang_relations where (gang_id=m.gang_id and other_gang=target_gang) or (gang_id=target_gang and other_gang=m.gang_id and kind='ally');
    insert into public.gang_relations(gang_id,other_gang,kind,status) values(m.gang_id,target_gang,'enemy','active');
    perform public.kiez_gang_log(m.gang_id,p.id,'bund',0,tn||' auf die Feindesliste gesetzt');
    return jsonb_build_object('status','enemy');
  elsif rel = 'none' then
    delete from public.gang_relations where (gang_id=m.gang_id and other_gang=target_gang) or (gang_id=target_gang and other_gang=m.gang_id and kind='ally');
    perform public.kiez_gang_log(m.gang_id,p.id,'bund',0,'Beziehung zu '||tn||' beendet');
    return jsonb_build_object('status','none');
  end if;
  raise exception 'Unbekannte Beziehung';
end $function$;

-- ---------- 96: Kriege ausbauen ----------
alter table public.gang_wars add column if not exists goal text not null default 'Siege';
alter table public.gang_wars add column if not exists ceasefire_by uuid;
alter table public.gang_wars add column if not exists ended_how text;
alter table public.gang_wars add column if not exists loot numeric(12,2) not null default 0;
create table if not exists public.gang_war_days(
  war_id bigint not null references public.gang_wars(id) on delete cascade,
  day date not null,
  attacker_points integer not null default 0,
  defender_points integer not null default 0,
  primary key(war_id, day));
alter table public.gang_war_days enable row level security;
drop policy if exists gang_war_days_read on public.gang_war_days;
create policy gang_war_days_read on public.gang_war_days for select using (true);
grant select on public.gang_war_days to authenticated;

-- Krieg beenden mit Sieger (null = unentschieden/Waffenruhe)
create or replace function public.kiez_finish_war(wid bigint, winner uuid, how text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare w public.gang_wars; taken numeric := 0;
begin
  select * into w from public.gang_wars where id=wid for update;
  if w.resolved then return; end if;
  if winner = w.attacker_gang then
    select least(w.stake, balance) into taken from public.gangs where id=w.defender_gang;
    taken := coalesce(taken,0);
    update public.gangs set balance=balance-taken, war_losses=war_losses+1 where id=w.defender_gang;
    update public.gangs set balance=balance+w.stake+taken, war_wins=war_wins+1 where id=w.attacker_gang;
    perform public.kiez_gang_log(w.attacker_gang,null,'war',w.stake+taken,'Bandenkrieg gewonnen');
    perform public.kiez_gang_log(w.defender_gang,null,'war',-taken,'Bandenkrieg verloren');
  elsif winner = w.defender_gang then
    update public.gangs set balance=balance+w.stake, war_wins=war_wins+1 where id=w.defender_gang;
    update public.gangs set war_losses=war_losses+1 where id=w.attacker_gang;
    taken := w.stake;
    perform public.kiez_gang_log(w.defender_gang,null,'war',w.stake,'Bandenkrieg abgewehrt');
    perform public.kiez_gang_log(w.attacker_gang,null,'war',0,'Bandenkrieg verloren');
  else
    update public.gangs set balance=balance+w.stake where id=w.attacker_gang;
    perform public.kiez_gang_log(w.attacker_gang,null,'war',w.stake,'Bandenkrieg '||how||' – Einsatz zurück');
    perform public.kiez_gang_log(w.defender_gang,null,'war',0,'Bandenkrieg '||how);
  end if;
  update public.gang_wars set resolved=true, winner_gang=winner, ended_how=how, loot=taken where id=w.id;
end $function$;
revoke execute on function public.kiez_finish_war(bigint,uuid,text) from public, anon, authenticated;

create or replace function public.resolve_gang_wars()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare w public.gang_wars; n int := 0;
begin
  for w in select * from public.gang_wars where not resolved and ends_at<=now() for update skip locked loop
    perform public.kiez_finish_war(w.id,
      case when w.attacker_score>w.defender_score then w.attacker_gang when w.defender_score>w.attacker_score then w.defender_gang end,
      case when w.attacker_score=w.defender_score then 'unentschieden' else 'nach Punkten' end);
    n := n+1;
  end loop;
  return n;
end $function$;
grant execute on function public.resolve_gang_wars() to authenticated;

create or replace function public.declare_gang_war(target_gang uuid, stake numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; g public.gangs; st numeric(12,2) := round(coalesce(stake,0),2); w public.gang_wars; mm record;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('co');
  perform public.resolve_gang_wars();
  if target_gang=m.gang_id then raise exception 'Keinen Krieg gegen die eigene Bande'; end if;
  if not exists(select 1 from public.gangs where id=target_gang) then raise exception 'Bande unbekannt'; end if;
  if public.kiez_allied(m.gang_id,target_gang) then raise exception 'Gegen Verbündete gibt es keinen Krieg'; end if;
  if st<20 then raise exception 'Mindesteinsatz 20 €'; end if;
  if (select count(*) from public.gang_members where gang_id=m.gang_id)<2 or (select count(*) from public.gang_members where gang_id=target_gang)<2 then
    raise exception 'Beide Banden brauchen mindestens 2 Mitglieder'; end if;
  if exists(select 1 from public.gang_wars where not resolved and (attacker_gang in (m.gang_id,target_gang) or defender_gang in (m.gang_id,target_gang))) then
    raise exception 'Eine der Banden steckt schon in einem Krieg'; end if;
  -- Gegen Feinde (Feindesliste) ohne Wartezeit
  if not exists(select 1 from public.gang_relations where gang_id=m.gang_id and other_gang=target_gang and kind='enemy')
     and exists(select 1 from public.gang_wars where attacker_gang=m.gang_id and defender_gang=target_gang and started_at>now()-interval '3 days') then
    raise exception 'Gegen diese Bande erst wieder in 3 Tagen'; end if;
  select * into g from public.gangs where id=m.gang_id for update;
  if g.balance<st then raise exception 'Zu wenig in der Bandenkasse'; end if;
  update public.gangs set balance=balance-st where id=g.id;
  insert into public.gang_wars(attacker_gang,defender_gang,stake) values(g.id,target_gang,st) returning * into w;
  perform public.kiez_gang_log(g.id,p.id,'war',-st,'hat den Krieg erklärt gegen '||(select name from public.gangs where id=target_gang));
  perform public.kiez_gang_log(target_gang,null,'war',0,g.name||' hat euch den Krieg erklärt');
  for mm in select user_id from public.gang_members where gang_id=target_gang loop
    perform public.kiez_notify(mm.user_id,'bande','Krieg! „'||g.name||'“ hat eurer Bande den Krieg erklärt – 24 Stunden, jeder Sieg zählt.');
  end loop;
  return to_jsonb(w);
end $function$;

-- Siege zählen (auch für Verbündete im Krieg) + Tagesverlauf
create or replace function public.kiez_count_war_fight()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare wg uuid; lg uuid; loser uuid; w record;
begin
  loser := case when new.winner_id=new.attacker_id then new.defender_id else new.attacker_id end;
  select gang_id into wg from public.gang_members where user_id=new.winner_id;
  select gang_id into lg from public.gang_members where user_id=loser;
  if wg is null or lg is null then return new; end if;
  for w in select * from public.gang_wars where not resolved and ends_at>now()
           and ((attacker_gang=lg or defender_gang=lg)) loop
    if w.defender_gang=lg and (w.attacker_gang=wg or public.kiez_allied(w.attacker_gang,wg)) then
      update public.gang_wars set attacker_score=attacker_score+1 where id=w.id;
      insert into public.gang_war_days(war_id,day,attacker_points) values(w.id,current_date,1)
      on conflict (war_id,day) do update set attacker_points=gang_war_days.attacker_points+1;
    elsif w.attacker_gang=lg and (w.defender_gang=wg or public.kiez_allied(w.defender_gang,wg)) then
      update public.gang_wars set defender_score=defender_score+1 where id=w.id;
      insert into public.gang_war_days(war_id,day,defender_points) values(w.id,current_date,1)
      on conflict (war_id,day) do update set defender_points=gang_war_days.defender_points+1;
    end if;
  end loop;
  return new;
end $function$;

create or replace function public.gang_war_ceasefire(war bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; w public.gang_wars; other uuid;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('co');
  select * into w from public.gang_wars where id=war and not resolved for update;
  if w.id is null or m.gang_id not in (w.attacker_gang,w.defender_gang) then raise exception 'Kein laufender Krieg eurer Bande'; end if;
  other := case when m.gang_id=w.attacker_gang then w.defender_gang else w.attacker_gang end;
  if w.ceasefire_by = other then
    perform public.kiez_finish_war(w.id, null, 'durch Waffenruhe beendet');
    return jsonb_build_object('status','ended');
  end if;
  if w.ceasefire_by = m.gang_id then raise exception 'Ihr habt die Waffenruhe schon angeboten'; end if;
  update public.gang_wars set ceasefire_by=m.gang_id where id=w.id;
  perform public.kiez_gang_log(other,null,'war',0,(select name from public.gangs where id=m.gang_id)||' bietet Waffenruhe an');
  return jsonb_build_object('status','offered');
end $function$;

create or replace function public.gang_war_surrender(war bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; w public.gang_wars;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('co');
  select * into w from public.gang_wars where id=war and not resolved for update;
  if w.id is null or m.gang_id not in (w.attacker_gang,w.defender_gang) then raise exception 'Kein laufender Krieg eurer Bande'; end if;
  perform public.kiez_finish_war(w.id, case when m.gang_id=w.attacker_gang then w.defender_gang else w.attacker_gang end, 'durch Kapitulation');
  return jsonb_build_object('status','surrendered');
end $function$;

create or replace function public.gang_war_ranking()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(x order by x.wins desc, x.loot desc), '[]'::jsonb) from (
    select g.id, g.name, g.level, g.war_wins as wins, g.war_losses as losses,
      coalesce((select sum(w.loot) from public.gang_wars w where w.winner_gang=g.id),0) as loot
    from public.gangs g where g.war_wins+g.war_losses > 0 order by g.war_wins desc limit 20) x
$$;

-- ---------- 97: Überfall aufs Bandenhaus ----------
create table if not exists public.gang_raids(
  id bigint generated by default as identity primary key,
  attacker_gang uuid not null references public.gangs(id) on delete cascade,
  defender_gang uuid not null references public.gangs(id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null default now()+interval '15 minutes',
  resolved boolean not null default false,
  winner_gang uuid, loot numeric(12,2) not null default 0,
  attack_power integer not null default 0, defense_power integer not null default 0);
create table if not exists public.gang_raid_members(
  raid_id bigint not null references public.gang_raids(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  side text not null check (side in ('attack','defense')),
  power integer not null,
  primary key(raid_id, user_id));
alter table public.gang_raids enable row level security;
alter table public.gang_raid_members enable row level security;
drop policy if exists gang_raids_read on public.gang_raids;
create policy gang_raids_read on public.gang_raids for select using (true);
drop policy if exists gang_raid_members_read on public.gang_raid_members;
create policy gang_raid_members_read on public.gang_raid_members for select using (true);
grant select on public.gang_raids, public.gang_raid_members to authenticated;

create or replace function public.resolve_gang_raids()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare r public.gang_raids; a int; d int; tres int; bal numeric; v_loot numeric := 0; n int := 0; mm record; an text; dn text;
begin
  for r in select * from public.gang_raids where not resolved and ends_at<=now() for update skip locked loop
    select coalesce(sum(power),0) into a from public.gang_raid_members where raid_id=r.id and side='attack';
    select coalesce(sum(power),0) into d from public.gang_raid_members where raid_id=r.id and side='defense';
    tres := coalesce((select level from public.gang_rooms where gang_id=r.defender_gang and room='tresor'),0);
    d := d + 10*coalesce((select defense_level from public.gangs where id=r.defender_gang),0) + 5*tres;
    select name into an from public.gangs where id=r.attacker_gang; select name, balance into dn, bal from public.gangs where id=r.defender_gang for update;
    if a > d then
      v_loot := round(coalesce(bal,0)*0.10*(1-0.15*tres),2);
      update public.gangs set balance=balance-v_loot where id=r.defender_gang;
      update public.gangs set balance=balance+v_loot where id=r.attacker_gang;
      update public.gang_raids set resolved=true, winner_gang=r.attacker_gang, loot=v_loot, attack_power=a, defense_power=d where id=r.id;
      perform public.kiez_gang_log(r.attacker_gang,null,'raid',v_loot,'Überfall auf '||dn||' gelungen');
      perform public.kiez_gang_log(r.defender_gang,null,'raid',-v_loot,an||' hat das Bandenhaus überfallen');
    else
      update public.gang_raids set resolved=true, winner_gang=r.defender_gang, attack_power=a, defense_power=d where id=r.id;
      perform public.kiez_gang_log(r.attacker_gang,null,'raid',0,'Überfall auf '||dn||' abgewehrt worden');
      perform public.kiez_gang_log(r.defender_gang,null,'raid',0,'Überfall von '||an||' abgewehrt');
    end if;
    for mm in select user_id, gang_id from public.gang_members where gang_id in (r.attacker_gang, r.defender_gang) loop
      perform public.kiez_notify(mm.user_id,'bande', case when (a > d) = (mm.gang_id=r.attacker_gang) then 'Überfall gewonnen' else 'Überfall verloren' end
        ||' ('||an||' gegen '||dn||', '||a||':'||d||')'||case when a>d then ' – Beute '||to_char(v_loot,'FM999990.00')||' €' else '' end);
    end loop;
    n := n+1;
  end loop;
  return n;
end $function$;
grant execute on function public.resolve_gang_raids() to authenticated;

create or replace function public.start_gang_raid(target_gang uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; r public.gang_raids; nm text; mm record;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('officer');
  perform public.resolve_gang_raids();
  if target_gang=m.gang_id then raise exception 'Nicht die eigene Bande'; end if;
  if not exists(select 1 from public.gangs where id=target_gang) then raise exception 'Bande unbekannt'; end if;
  if public.kiez_allied(m.gang_id,target_gang) then raise exception 'Verbündete überfällt man nicht'; end if;
  if exists(select 1 from public.gang_raids where not resolved and (attacker_gang=m.gang_id or defender_gang=target_gang)) then
    raise exception 'Es läuft schon ein Überfall'; end if;
  if exists(select 1 from public.gang_raids where attacker_gang=m.gang_id and defender_gang=target_gang and started_at>now()-interval '12 hours') then
    raise exception 'Diese Bande könnt ihr erst in 12 Stunden wieder überfallen'; end if;
  if p.energy < 10 then raise exception 'Du brauchst 10 Energie'; end if;
  insert into public.gang_raids(attacker_gang,defender_gang) values(m.gang_id,target_gang) returning * into r;
  update public.profiles set energy=energy-10 where id=p.id returning * into p;
  insert into public.gang_raid_members(raid_id,user_id,side,power) values(r.id,p.id,'attack',public.kiez_attack_power(p));
  select name into nm from public.gangs where id=m.gang_id;
  for mm in select user_id, gang_id from public.gang_members where gang_id in (m.gang_id, target_gang) and user_id<>p.id loop
    perform public.kiez_notify(mm.user_id,'bande', case when mm.gang_id=target_gang
      then 'Überfall! „'||nm||'“ greift euer Bandenhaus an – 15 Minuten Zeit zum Verteidigen (Bandenhaus → Krieg & Überfall).'
      else 'Eure Bande überfällt gerade ein Bandenhaus – mach mit (15 Minuten)!' end);
  end loop;
  return to_jsonb(r);
end $function$;

create or replace function public.join_gang_raid(raid bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; r public.gang_raids; s text; pw int;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('member');
  select * into r from public.gang_raids where id=raid and not resolved and ends_at>now();
  if r.id is null then raise exception 'Dieser Überfall ist schon vorbei'; end if;
  s := case when m.gang_id=r.attacker_gang then 'attack' when m.gang_id=r.defender_gang then 'defense' end;
  if s is null then raise exception 'Das ist nicht der Kampf eurer Bande'; end if;
  if exists(select 1 from public.gang_raid_members where raid_id=r.id and user_id=p.id) then raise exception 'Du bist schon dabei'; end if;
  if p.energy < 10 then raise exception 'Du brauchst 10 Energie'; end if;
  update public.profiles set energy=energy-10 where id=p.id returning * into p;
  pw := case s when 'attack' then public.kiez_attack_power(p) else public.kiez_defense_power(p) end;
  insert into public.gang_raid_members(raid_id,user_id,side,power) values(r.id,p.id,s,pw);
  return jsonb_build_object('side',s,'power',pw,'profile',to_jsonb(p));
end $function$;

-- ---------- Übersicht Bandenhaus ----------
create or replace function public.gang_house()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); m public.gang_members; g public.gangs; wk date := public.kiez_week(current_date); p public.profiles;
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  perform public.resolve_gang_wars(); perform public.resolve_gang_raids();
  select * into m from public.gang_members where user_id=me;
  if m.gang_id is null then return jsonb_build_object('gang',null); end if;
  perform public.kiez_gang_tasks_ensure(m.gang_id);
  select * into g from public.gangs where id=m.gang_id;
  select * into p from public.profiles where id=me;
  return jsonb_build_object(
    'gang', jsonb_build_object('id',g.id,'name',g.name,'level',g.level,'xp',g.xp,'level_xp',public.kiez_gang_level_xp(g.level),
      'next_xp',public.kiez_gang_level_xp(g.level+1),'balance',g.balance,'slots',public.kiez_gang_slots(g.id),
      'members',(select count(*) from public.gang_members where gang_id=g.id),'attack_level',g.attack_level,'defense_level',g.defense_level),
    'role', m.role,
    'rooms', coalesce((select jsonb_object_agg(room,level) from public.gang_rooms where gang_id=g.id),'{}'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'target',target,'progress',progress,'done',done_at is not null) order by kind)
               from public.gang_week_tasks where gang_id=g.id and week_start=wk),'[]'::jsonb),
    'contrib', coalesce((select jsonb_agg(jsonb_build_object('user_id',c.user_id,'name',public.kiez_name(c.user_id),'bottles',c.bottles,'wins',c.wins,'donated',c.donated)
               order by c.bottles+c.wins*25+c.donated desc) from public.gang_task_contrib c where c.gang_id=g.id and c.week_start=wk),'[]'::jsonb),
    'week_ends', wk+7,
    'storage', coalesce((select jsonb_agg(jsonb_build_object('id',s.plunder_id,'name',c.name,'rarity',c.rarity,'qty',s.qty) order by c.sort_order)
               from public.gang_storage s join public.plunder_catalog c on c.id=s.plunder_id where s.gang_id=g.id and s.qty>0),'[]'::jsonb),
    'pub_ready', p.pub_at is distinct from current_date, 'workshop_ready', p.workshop_at is distinct from current_date,
    'wars', coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'attacker',w.attacker_gang,'defender',w.defender_gang,
               'attacker_name',(select name from public.gangs where id=w.attacker_gang),'defender_name',(select name from public.gangs where id=w.defender_gang),
               'attacker_score',w.attacker_score,'defender_score',w.defender_score,'stake',w.stake,'ends_at',w.ends_at,'resolved',w.resolved,
               'winner',w.winner_gang,'ended_how',w.ended_how,'loot',w.loot,'ceasefire_by',w.ceasefire_by,
               'days',coalesce((select jsonb_agg(jsonb_build_object('day',d.day,'a',d.attacker_points,'d',d.defender_points) order by d.day) from public.gang_war_days d where d.war_id=w.id),'[]'::jsonb))
               order by w.started_at desc) from (select * from public.gang_wars where g.id in (attacker_gang,defender_gang) order by started_at desc limit 5) w),'[]'::jsonb),
    'raids', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'attacker',r.attacker_gang,'defender',r.defender_gang,
               'attacker_name',(select name from public.gangs where id=r.attacker_gang),'defender_name',(select name from public.gangs where id=r.defender_gang),
               'ends_at',r.ends_at,'resolved',r.resolved,'winner',r.winner_gang,'loot',r.loot,'attack_power',r.attack_power,'defense_power',r.defense_power,
               'joined',exists(select 1 from public.gang_raid_members x where x.raid_id=r.id and x.user_id=me),
               'attackers',(select count(*) from public.gang_raid_members x where x.raid_id=r.id and x.side='attack'),
               'defenders',(select count(*) from public.gang_raid_members x where x.raid_id=r.id and x.side='defense'))
               order by r.started_at desc) from (select * from public.gang_raids where g.id in (attacker_gang,defender_gang) order by started_at desc limit 5) r),'[]'::jsonb),
    'relations', coalesce((select jsonb_agg(jsonb_build_object('gang',x.other_gang,'name',(select name from public.gangs where id=x.other_gang),'kind',x.kind,'status',x.status,'mine',true))
               from public.gang_relations x where x.gang_id=g.id),'[]'::jsonb)
             || coalesce((select jsonb_agg(jsonb_build_object('gang',x.gang_id,'name',(select name from public.gangs where id=x.gang_id),'kind',x.kind,'status',x.status,'mine',false))
               from public.gang_relations x where x.other_gang=g.id and x.kind='ally' and x.status='pending'),'[]'::jsonb),
    'others', coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'level',o.level) order by o.name) from public.gangs o where o.id<>g.id),'[]'::jsonb));
end $function$;
