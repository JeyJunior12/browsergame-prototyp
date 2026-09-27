-- Durchspiel-Test Level 1–150 (ROADMAP 143–145) – NUR lokale Test-DB, keine Migration.
-- Ein Simulationsspieler spielt über die echten Spielfunktionen. „Zeit vergeht“, indem alle
-- Zeitstempel des Spielers zurückgeschoben werden (Wartezeiten laufen ab, Energie lädt, Hunger steigt).
-- Aufruf: supabase/test/durchspiel.sh aktiv|gelegenheit [Tage]

create table if not exists public.sim_log(typ text, tag int, level int, xp int, geld numeric, bank numeric, angriff int, verteidigung int,
  strasse int, gebiet int, behaelter int, kaeufe text, fehler text, primary key(typ, tag));

-- Alle Zeitstempel (timestamptz) des Spielers um mins zurück; ganze Tage auch bei date-Spalten
create or replace function public.sim_advance(uid uuid, mins int, days int default 0) returns void language plpgsql as $$
declare r record;
begin
  -- Spaltenliste einmal merken (information_schema ist langsam)
  if to_regclass('pg_temp.sim_cols') is null then
    create temp table sim_cols on commit preserve rows as
      select c.table_name, c.column_name, c.data_type, (select column_name from information_schema.columns k
             where k.table_schema='public' and k.table_name=c.table_name and k.column_name in ('user_id','id') order by k.column_name desc limit 1) as key
      from information_schema.columns c join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name and t.table_type='BASE TABLE'
      where c.table_schema='public' and c.data_type in ('timestamp with time zone','date') and c.table_name<>'sim_log';
  end if;
  for r in select * from sim_cols
  loop
    continue when r.key is null or (r.key='id' and r.table_name<>'profiles');
    if r.data_type='date' then
      continue when days=0;
      -- in zwei Schritten, damit eindeutige Tages-Schlüssel (user, day) sich nicht kurz überschneiden
      execute format('update public.%I set %I=%I - 36500 where %I=$1 and %I is not null', r.table_name, r.column_name, r.column_name, r.key, r.column_name) using uid;
      execute format('update public.%I set %I=%I + 36500 - %s where %I=$1 and %I is not null', r.table_name, r.column_name, r.column_name, days, r.key, r.column_name) using uid;
    else
      execute format('update public.%I set %I=%I - make_interval(mins=>%s) where %I=$1 and %I is not null', r.table_name, r.column_name, r.column_name, mins, r.key, r.column_name) using uid;
    end if;
  end loop;
end $$;

-- Eine Spielrunde: was ein normaler Spieler bei einem Besuch tut
create or replace function public.sim_session(uid uuid, tour int) returns text language plpgsql as $$
declare p public.profiles; it record; sl text; skill text; bought text := ''; err text := ''; i int;
begin
  perform set_config('test.uid', uid::text, true);
  -- kleine Helfer als Blöcke: Fehler sind normal (Wartezeit, kein Geld) und werden nur gezählt
  begin perform public.claim_daily_reward(); exception when others then null; end;
  begin perform public.finish_collection(); exception when others then null; end;
  begin perform public.sell_bottles(); exception when others then null; end;
  select * into p from public.profiles where id=uid;
  if p.hunger < 40 then begin perform public.buy_food(case when p.money>20 then 'eintopf' else 'currywurst' end); exception when others then err := err||'essen;'; end; end if;
  if p.cleanliness < 50 then begin perform public.wash_up(case when p.money>50 then 'schwimmbad' else 'katzenwaesche' end); exception when others then
    begin perform public.wash_up('katzenwaesche'); exception when others then err := err||'waschen;'; end; end; end if;
  begin perform public.finish_training(); exception when others then null; end;
  begin perform public.dig_bin(); exception when others then null; end;
  for i in 1..3 loop begin perform public.beg_for_money(); exception when others then exit; end; end loop;
  begin perform public.fight_npc((select id from (values ('kiezlegende',5),('hafenboxer',4),('tuersteher',3),('pfandneider',2),('suffkopp',1)) v(id,o)
    where (select public.kiez_attack_power(x) from public.profiles x where x.id=uid) > 20*o order by o desc limit 1)); exception when others then null; end;
  for i in 1..3 loop begin perform public.claim_daily_task(i); exception when others then null; end; end loop;
  begin perform public.claim_daily_mission(); exception when others then null; end;
  begin perform public.claim_quest(); exception when others then null; end;
  -- Ausbauen: Behälter, Sammelgebiet, Unterkunft
  begin perform public.buy_upgrade('container'); bought := bought||'Behälter '; exception when others then null; end;
  begin perform public.buy_progress('area'); bought := bought||'Gebiet '; exception when others then null; end;
  select * into p from public.profiles where id=uid;
  if p.money > 200 then begin perform public.move_in_house(); bought := bought||'Unterkunft '; exception when others then null; end; end if;
  -- Ausrüstung: pro Platz das beste bezahlbare Stück (höchstens 70 % des Geldes), wenn besser als das angelegte
  for it in select distinct on (public.item_slot(s)) s.* from public.shop_items s
            where s.category in ('waffen','kleidung','zubehoer') and s.required_level <= p.level and s.price <= p.money*0.7
              and not exists(select 1 from public.inventory i where i.user_id=uid and i.item_id=s.id)
            order by public.item_slot(s), s.attack+s.defense desc loop
    select * into p from public.profiles where id=uid;
    continue when it.price > p.money*0.7;
    sl := case when it.category in ('zubehoer','plunder') then 'zubehoer' when it.attack > it.defense then 'waffe' else 'schutz' end;
    continue when coalesce((select max(s2.attack+s2.defense) from public.inventory i join public.shop_items s2 on s2.id=i.item_id
                   where i.user_id=uid and i.equipped and public.item_slot(s2)=sl),0) >= it.attack+it.defense;
    begin perform public.buy_item(it.id); perform public.equip_item(it.id); bought := bought||it.name||' '; exception when others then err := err||'kauf:'||sqlerrm||';'; end;
  end loop;
  -- Begleiter: stärksten bezahlbaren kaufen (höchstens 50 % des Geldes), wenn stärker als alle eigenen
  select * into p from public.profiles where id=uid;
  for it in select c.* from public.pet_catalog c where c.required_level <= p.level and least(45,c.required_level) <= p.social_skill and c.price <= p.money*0.5
            and c.attack+c.defense > coalesce((select max(pc.attack+pc.defense) from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id where up.user_id=uid),0)
            order by c.attack+c.defense desc limit 1 loop
    begin perform public.buy_pet(it.id); bought := bought||'Tier '||it.name||' '; exception when others then err := err||'tier:'||left(sqlerrm,40)||';'; end;
  end loop;
  -- Weiterbildung: bis zu 3 (1 aktiv + 2 Warteschlange); je Platz die erste bezahlbare, nicht volle in Wunschreihenfolge
  for i in 1..3 loop
    select * into p from public.profiles where id=uid;
    declare ok boolean := false; c text;
    begin
      foreach c in array array['social','streetwise','attack','defense','stamina'] loop
        continue when c='social' and p.social_skill >= least(45, p.level/2);
        continue when c='streetwise' and p.streetwise > p.attack_skill + 5;   -- Straße leicht vorneweg, sonst im Wechsel
        begin
          if i=1 then perform public.start_training(c); else perform public.queue_training(c); end if;
          ok := true; exit;
        exception when others then null; end;
      end loop;
      exit when not ok;
    end;
  end loop;
  -- neue Tour für die Zeit bis zum nächsten Besuch
  perform public.sim_advance(uid, 1);  -- 30 Sek. Wagenpause nach dem Ausladen
  begin perform public.start_collection(tour); exception when others then err := err||'tour:'||left(sqlerrm,40)||';'; end;
  return bought||'|'||err;
end $$;

-- Ganzer Durchlauf: typ aktiv = 4 Besuche am Tag (Touren 4 Std., nachts 8 Std.), gelegenheit = 1 Besuch (Tour 8 Std.)
create or replace procedure public.sim_run(typ text, tage int) language plpgsql as $$
declare uid uuid; d int; s int; res text; buys text; errs text; p public.profiles; visits int[];
begin
  insert into auth.users(raw_user_meta_data) values(jsonb_build_object('username','Sim_'||typ)) returning id into uid;
  delete from public.sim_log where sim_log.typ=sim_run.typ;
  visits := case when typ='aktiv' then array[240,240,240,720] else array[1440] end;  -- Minuten bis zum nächsten Besuch
  for d in 1..tage loop
    buys := ''; errs := '';
    for s in 1..array_length(visits,1) loop
      res := public.sim_session(uid, case when visits[s] >= 480 then 480 else 240 end);
      buys := buys || split_part(res,'|',1); errs := errs || split_part(res,'|',2);
      perform public.sim_advance(uid, visits[s], case when s=array_length(visits,1) then 1 else 0 end);
    end loop;
    select * into p from public.profiles where id=uid;
    insert into public.sim_log values(typ, d, p.level, p.xp, p.money, p.bank_balance, public.kiez_attack_power(p), public.kiez_defense_power(p),
      p.streetwise, p.area_level, p.container_level, nullif(trim(buys),''), nullif(left(errs,300),''));
    commit;
    exit when p.level >= 150;
  end loop;
end $$;
