-- 0025: Wiederkommen (ROADMAP 5, 35, 37, 45–50, 52): Login-Serie mit Serien-Schutz, feste Kiez-Zeiten, liegengelassenes Pfand
-- wird geklaut, Live-Ticker, Einsteiger-Tutorial, Ausladen+Verkaufen mit einem Klick, „Während du weg warst“.

-- ---------- 49: Feste Kiez-Zeiten (deutsche Uhrzeit) ----------
create or replace function public.kiez_time()
returns text language sql stable as $$
  select case
    when (now() at time zone 'Europe/Berlin')::time >= '19:00' and (now() at time zone 'Europe/Berlin')::time < '20:00' then 'happyhour'
    when (now() at time zone 'Europe/Berlin')::time >= '12:00' and (now() at time zone 'Europe/Berlin')::time < '13:00' then 'mittag'
    when (now() at time zone 'Europe/Berlin')::time >= '22:00' and (now() at time zone 'Europe/Berlin')::time < '22:30' then 'razzia'
    else null end
$$;

-- Happy Hour: Pfand +10 % (zusätzlich zu Events)
create or replace function public.kiez_event_bonus(kind text)
returns integer language sql stable as $$
  select coalesce(sum(case kind when 'bottles' then bottle_bonus else xp_bonus end),0)::int
       + case when kind='bottles' and public.kiez_time()='happyhour' then 10 else 0 end
  from public.events where now() between starts_at and ends_at
$$;

-- ---------- 48: Login-Serie mit Serien-Schutz ----------
alter table public.profiles add column if not exists streak_shields integer not null default 0;
create or replace function public.claim_daily_reward()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; new_streak int; reward numeric(12,2); caps int; shield_used boolean := false; gained_shield boolean := false;
begin
  p := public.kiez_actor();
  if p.daily_claim_date=current_date then raise exception 'Tagesbelohnung bereits abgeholt'; end if;
  if p.daily_claim_date=current_date-1 then new_streak := p.login_streak+1;
  elsif p.daily_claim_date=current_date-2 and p.streak_shields>0 then new_streak := p.login_streak+1; shield_used := true;  -- ein verpasster Tag wird verziehen
  else new_streak := 1; end if;
  reward := least(12,2+new_streak*0.50);
  reward := least(reward, greatest(0,p.cash_capacity-p.money));
  caps := case when new_streak%7=0 then 5 else 1 end + least(new_streak/7,5);
  gained_shield := new_streak%7=0 and p.streak_shields < 2;
  update public.profiles set daily_claim_date=current_date, login_streak=new_streak, money=money+reward, xp=xp+10, bottlecaps=bottlecaps+caps,
    streak_shields=streak_shields - case when shield_used then 1 else 0 end + case when gained_shield then 1 else 0 end
  where id=p.id returning * into p;
  return jsonb_build_object('streak',new_streak,'reward',reward,'bottlecaps',caps,'shield_used',shield_used,'gained_shield',gained_shield,
    'shields',p.streak_shields,'profile',to_jsonb(p));
end $function$;

-- ---------- 50: Liegengelassenes Pfand wird geklaut ----------
alter table public.profiles add column if not exists bottles_checked_at timestamptz not null default now();
-- Wer verkauft, setzt die Uhr zurück
create or replace function public.kiez_bottles_sold()
returns trigger language plpgsql as $function$
begin
  if new.bottles < old.bottles or old.bottles = 0 then new.bottles_checked_at := now(); end if;
  return new;
end $function$;
drop trigger if exists profiles_bottles_sold on public.profiles;
create trigger profiles_bottles_sold before update of bottles on public.profiles for each row execute function public.kiez_bottles_sold();

-- Je volle 24 Std. ohne Verkauf verschwinden 10 % (mindestens 1 Flasche) – wird von kiez_actor geprüft
create or replace function public.kiez_bottle_theft(p public.profiles)
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare days int; left_ int; lost int;
begin
  if p.bottles <= 0 then return p; end if;
  days := floor(extract(epoch from (now()-p.bottles_checked_at))/86400);
  if days < 1 then return p; end if;
  left_ := floor(p.bottles*power(0.9,days)); lost := greatest(least(days,p.bottles), p.bottles-left_);
  update public.profiles set bottles=greatest(0,bottles-lost) where id=p.id;
  update public.profiles set bottles_checked_at=p.bottles_checked_at+make_interval(days=>days) where id=p.id returning * into p;
  perform public.kiez_notify(p.id,'pfand','Während du weg warst, hat jemand '||lost||' Pfandflaschen aus deinem Lager geklaut. Verkauf regelmäßig!');
  return p;
end $function$;
revoke execute on function public.kiez_bottle_theft(public.profiles) from public, anon, authenticated;

create or replace function public.kiez_actor()
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; mins numeric; rate numeric; gain int;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
  p := public.kiez_body_tick(p);
  p := public.kiez_bottle_theft(p);
  rate := public.kiez_energy_rate(p);
  mins := extract(epoch from (now()-p.energy_updated_at))/60;
  gain := floor(mins*rate)::int;
  if gain > 0 then
    if p.energy + gain >= 100 then
      update public.profiles set energy=greatest(energy,100), energy_updated_at=now() where id=p.id returning * into p;
    else
      update public.profiles set energy=energy+gain, energy_updated_at=energy_updated_at+make_interval(secs=>gain/rate*60) where id=p.id returning * into p;
    end if;
  end if;
  return p;
end $function$;

-- ---------- 45: Live-Ticker „Gerade im Kiez“ ----------
create table if not exists public.kiez_ticker(
  id bigint generated by default as identity primary key,
  kind text not null, body text not null, user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now());
create index if not exists kiez_ticker_time on public.kiez_ticker(created_at desc);
alter table public.kiez_ticker enable row level security;
drop policy if exists kiez_ticker_read on public.kiez_ticker;
create policy kiez_ticker_read on public.kiez_ticker for select using (true);
grant select on public.kiez_ticker to authenticated, anon;

create or replace function public.kiez_tick(k text, uid uuid, txt text)
returns void language sql security definer set search_path to 'public' as $$
  insert into public.kiez_ticker(kind,user_id,body) values(k,uid,txt);
  delete from public.kiez_ticker where created_at < now()-interval '3 days';
$$;
revoke execute on function public.kiez_tick(text,uuid,text) from public, anon, authenticated;

-- Seltene Funde, Kämpfe, Level-Aufstiege, Bandenereignisse
create or replace function public.kiez_ticker_trigger()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare r text; nm text;
begin
  if tg_table_name='user_plunder' then
    select rarity, name into r, nm from public.plunder_catalog where id=new.plunder_id;
    if r in ('episch','legendaer') and (tg_op='INSERT' or new.quantity>old.quantity) then
      perform public.kiez_tick('plunder',new.user_id,public.kiez_name(new.user_id)||' hat '||case r when 'legendaer' then 'legendären' else 'epischen' end||' Plunder gefunden: '||nm||'!'); end if;
  elsif tg_table_name='fights' then
    if new.loot >= 5 then perform public.kiez_tick('kampf',new.winner_id,public.kiez_name(new.winner_id)||' hat '||public.kiez_name(case when new.winner_id=new.attacker_id then new.defender_id else new.attacker_id end)||' verprügelt und '||to_char(new.loot,'FM9999990.00')||' € erbeutet.'); end if;
  elsif tg_table_name='profiles' then
    if new.level > old.level and new.level % 5 = 0 then perform public.kiez_tick('level',new.id,new.username||' ist jetzt Level '||new.level||'.'); end if;
  elsif tg_table_name='gang_log' then
    if new.kind in ('level','revier','boss') or (new.kind='war' and new.info in ('Bandenkrieg gewonnen','Bandenkrieg abgewehrt')) or (new.kind='raid' and new.amount>0) then
      perform public.kiez_tick('bande',null,(select name from public.gangs where id=new.gang_id)||': '||new.info); end if;
  end if;
  return new;
end $function$;
drop trigger if exists user_plunder_ticker on public.user_plunder;
create trigger user_plunder_ticker after insert or update of quantity on public.user_plunder for each row execute function public.kiez_ticker_trigger();
drop trigger if exists fights_ticker on public.fights;
create trigger fights_ticker after insert on public.fights for each row execute function public.kiez_ticker_trigger();
drop trigger if exists profiles_ticker on public.profiles;
create trigger profiles_ticker after update of level on public.profiles for each row execute function public.kiez_ticker_trigger();
drop trigger if exists gang_log_ticker on public.gang_log;
create trigger gang_log_ticker after insert on public.gang_log for each row execute function public.kiez_ticker_trigger();

-- ---------- 35: Einsteiger-Tutorial ----------
alter table public.profiles add column if not exists tutorial_step integer not null default 0;
-- Bestehende Spieler (schon Level 3+) überspringen das Tutorial
update public.profiles set tutorial_step=99 where level>=3 and tutorial_step=0;
create or replace function public.tutorial_advance(step integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; done_ boolean := false;
begin
  p := public.kiez_actor();
  if step <= p.tutorial_step or step > 99 then return jsonb_build_object('step',p.tutorial_step); end if;
  if step = 99 and p.tutorial_step between 1 and 98 and p.tutorial_step >= 6 then
    update public.profiles set bottlecaps=bottlecaps+5 where id=p.id; done_ := true; end if;
  update public.profiles set tutorial_step=step where id=p.id returning * into p;
  return jsonb_build_object('step',p.tutorial_step,'reward',done_,'profile',to_jsonb(p));
end $function$;

-- ---------- 37: Ausladen + alles verkaufen mit einem Klick ----------
create or replace function public.quick_unload_sell()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; f jsonb := null; s jsonb := null;
begin
  p := public.kiez_actor();
  if p.collection_ends_at is not null and p.collection_ends_at <= now() then f := public.finish_collection(); end if;
  select * into p from public.profiles where id=p.id;
  if p.bottles > 0 then s := public.sell_bottles(); end if;
  if f is null and s is null then raise exception 'Nichts zu tun – keine fertige Tour und keine Flaschen'; end if;
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('finished',f,'sold',s,'profile',to_jsonb(p));
end $function$;

-- ---------- 52: „Während du weg warst“ ----------
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists email_digest boolean not null default false;
create or replace function public.welcome_back()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; since timestamptz; res jsonb;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null then raise exception 'Nicht angemeldet'; end if;
  since := coalesce(p.last_seen_at, now());
  update public.profiles set last_seen_at=now() where id=p.id;
  if since > now()-interval '2 hours' then return jsonb_build_object('show',false); end if;
  res := jsonb_build_object('show',true,'since',since,
    'notifications',coalesce((select jsonb_agg(body order by id desc) from (select id, body from public.notifications where user_id=p.id and created_at>since order by id desc limit 8) n),'[]'::jsonb),
    'messages',(select count(*) from public.messages where recipient_id=p.id and created_at>since),
    'attacks',(select count(*) from public.fights where defender_id=p.id and created_at>since),
    'lost_fights',(select count(*) from public.fights where defender_id=p.id and winner_id<>p.id and created_at>since),
    'tour_ready',p.collection_ends_at is not null and p.collection_ends_at<=now(),
    'training_ready',p.training_ends_at is not null and p.training_ends_at<=now(),
    'energy',p.energy);
  return res;
end $function$;

create or replace function public.set_email_digest(on_off boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  update public.profiles set email_digest=coalesce(on_off,false) where id=auth.uid();
  return jsonb_build_object('email_digest',coalesce(on_off,false));
end $function$;

create or replace function public.kiez_ticker_feed()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('time',public.kiez_time(),'berlin',to_char(now() at time zone 'Europe/Berlin','HH24:MI'),
    'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'body',body,'user_id',user_id,'at',created_at) order by id desc)
      from (select * from public.kiez_ticker order by id desc limit 20) t),'[]'::jsonb))
$$;
create or replace function public.commit_crime(crime_id integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  p public.profiles;
  names text[]:=array['Handtaschenraub','Ladendiebstahl','Auto aufbrechen','Einbruch','Tankstellenüberfall','Bankraub','Kaugummiautomat aufbrechen'];
  risks int[]:=array[15,22,30,42,55,70,18];
  rewardmin numeric[]:=array[8,18,45,90,180,450,10];
  rewardmax numeric[]:=array[18,35,80,160,320,900,20];
  bails numeric[]:=array[8,18,35,70,150,400,10];
  jailmins int[]:=array[8,12,20,35,60,120,9];
  cost int[]:=array[6,8,10,14,18,22,7];
  idx int; caught boolean; reward numeric;
begin
  p := public.kiez_actor();
  perform public.kiez_assert_free(p);
  idx:=crime_id;
  if idx is null or idx<1 or idx>array_length(names,1) then raise exception 'Unbekanntes Verbrechen'; end if;
  if p.energy<cost[idx] then raise exception 'Dafür reicht deine Energie nicht'; end if;
  -- Razzia (22:00–22:30 Uhr): Polizei überall, Risiko +20 Punkte
  caught:=random()*100<risks[idx]+case when public.kiez_time()='razzia' then 20 else 0 end;
  if caught then
    update public.profiles set energy=energy-cost[idx],jail_until=now()+make_interval(mins=>jailmins[idx]),jail_bail=bails[idx] where id=p.id returning * into p;
    insert into public.side_action_log(user_id,action_type,success,money_change,xp_change) values(p.id,'crime:'||names[idx],false,0,0);
    return jsonb_build_object('caught',true,'name',names[idx],'bail',bails[idx],'jail_minutes',jailmins[idx],'profile',to_jsonb(p));
  end if;
  reward:=round((rewardmin[idx]+random()::numeric*(rewardmax[idx]-rewardmin[idx])),2);
  reward:=least(reward,greatest(0,p.cash_capacity-p.money));
  update public.profiles set energy=energy-cost[idx],money=money+reward,xp=xp+greatest(3,cost[idx]) where id=p.id returning * into p;
  insert into public.side_action_log(user_id,action_type,success,money_change,xp_change) values(p.id,'crime:'||names[idx],true,reward,greatest(3,cost[idx]));
  return jsonb_build_object('caught',false,'name',names[idx],'reward',reward,'profile',to_jsonb(p));
end $function$;

create or replace function public.buy_alcohol(drink_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; v_cost numeric; v_promille numeric; v_minutes int; v_bonus int; v_label text;
begin
  p := public.kiez_actor();
  case drink_type
    when 'beer' then v_cost:=1.00; v_promille:=0.12; v_minutes:=30; v_bonus:=10; v_label:='Dosenbier';
    when 'wine' then v_cost:=2.50; v_promille:=0.25; v_minutes:=60; v_bonus:=20; v_label:='Kartonwein';
    when 'schnaps' then v_cost:=3.50; v_promille:=0.40; v_minutes:=45; v_bonus:=25; v_label:='Kurzer';
    when 'vodka' then v_cost:=6.00; v_promille:=0.70; v_minutes:=75; v_bonus:=32; v_label:='Wodka';
    when 'feuerwasser' then v_cost:=9.00; v_promille:=1.00; v_minutes:=120; v_bonus:=40; v_label:='Feuerwasser';
    else raise exception 'Dieses Getränk gibt es nicht.';
  end case;
  if public.kiez_time()='happyhour' then v_cost := v_cost/2; end if;  -- Happy Hour 19–20 Uhr
  v_cost := public.kiez_shop_price(p, v_cost);
  if p.money < v_cost then raise exception 'Dafür reicht dein Bargeld nicht.'; end if;
  update public.profiles set money=money-v_cost,
    alcohol_level=least(7.00, public.kiez_promille(p) + v_promille), alcohol_updated_at=now(),
    alcohol_bonus_until=greatest(coalesce(alcohol_bonus_until, now()), now()) + make_interval(mins => v_minutes)
  where id=p.id returning * into p;
  return jsonb_build_object('profile',to_jsonb(p),'label',v_label,'cost',v_cost,'promille',p.alcohol_level,'bonus_percent',v_bonus,'bonus_until',p.alcohol_bonus_until);
end $function$;

create or replace function public.kiez_beg_factors(p public.profiles)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare sym int; f_pet numeric; f_clean numeric; f_speech numeric;
begin
  select coalesce(max(pc.health*up.level),0) into sym from public.user_pets up join public.pet_catalog pc on pc.id=up.pet_id
  where up.user_id=p.id and up.active;
  f_pet := least(3.0, 1 + coalesce(sym,0)/200.0);
  f_clean := case public.kiez_clean_tier(p.cleanliness) when 'gepflegt' then 1.2 when 'normal' then 1.0 when 'schmuddelig' then 0.6 else 0.2 end;
  f_speech := 1 + least(p.speech_skill,150)*0.01;
  if public.kiez_time()='mittag' then f_clean := f_clean*1.2; end if;  -- Mittagspause 12–13 Uhr: +20 %
  return jsonb_build_object('sympathy',sym,'pet',round(f_pet,3),'clean',round(f_clean,3),'speech',round(f_speech,3),
    'total',round(f_pet*f_clean*f_speech,3),'tier',public.kiez_clean_tier(p.cleanliness));
end $function$;
revoke execute on function public.kiez_beg_factors(public.profiles) from public, anon, authenticated;
