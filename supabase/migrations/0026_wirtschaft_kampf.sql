-- 0026: Wirtschaft & Kampf (ROADMAP 4, 13, 15–22): Nebenjobs, Ausrüstung im Basar, Pfandlager-Ausbau, Auktionshaus,
-- Kiosk-Stand, Kredithai, Revanche, Kopfgeld, Wochenturnier, Wetten (Bandenkriege, Tierkampf des Tages).

-- ---------- 4: Nebenjobs (laufen parallel zur Pfandtour) ----------
alter table public.profiles add column if not exists job_id text;
alter table public.profiles add column if not exists job_ends_at timestamptz;
create or replace function public.kiez_jobs()
returns table(id text, name text, minutes integer, pay numeric, energy integer, min_level integer, description text) language sql immutable as $$
  values ('flyer','Flyer verteilen',20,1.20,5,1,'Zettel für die Dönerbude an jede Tür.'),
         ('spuelen','Teller spülen',60,3.50,10,3,'Hinterm Imbiss, heißes Wasser inklusive.'),
         ('umzug','Umzugshelfer',120,8.00,20,8,'Kisten schleppen, Trinkgeld hoffen.'),
         ('nachtwache','Nachtwache am Bauzaun',240,15.00,15,15,'Aufpassen, dass keiner den Bagger klaut.'),
         ('messe','Messehelfer',480,32.00,25,30,'Stände aufbauen, Häppchen abstauben.')
$$;
create or replace function public.start_job(job text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; j record;
begin
  p := public.kiez_actor(); perform public.kiez_assert_free(p);
  select * into j from public.kiez_jobs() x where x.id=job; if j.id is null then raise exception 'Diesen Job gibt es nicht'; end if;
  if p.job_id is not null then raise exception 'Du hast schon einen Job laufen'; end if;
  if p.level < j.min_level then raise exception 'Diesen Job gibt es erst ab Level %', j.min_level; end if;
  if p.energy < j.energy then raise exception 'Du brauchst % Energie', j.energy; end if;
  update public.profiles set energy=energy-j.energy, job_id=j.id, job_ends_at=now()+make_interval(mins=>j.minutes) where id=p.id returning * into p;
  return jsonb_build_object('job',j.name,'ends_at',p.job_ends_at,'profile',to_jsonb(p));
end $function$;
create or replace function public.finish_job()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; j record;
begin
  p := public.kiez_actor();
  if p.job_id is null then raise exception 'Du hast gerade keinen Job'; end if;
  if p.job_ends_at > now() then raise exception 'Der Job läuft noch'; end if;
  select * into j from public.kiez_jobs() x where x.id=p.job_id;
  update public.profiles set job_id=null, job_ends_at=null, xp=xp+greatest(2,j.minutes/20) where id=p.id;
  perform public.kiez_pay(p.id, j.pay);
  perform public.kiez_act(p.id,'job');
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('job',j.name,'pay',j.pay,'profile',to_jsonb(p));
end $function$;
create or replace function public.jobs_overview()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  select * into p from public.profiles where id=auth.uid();
  return jsonb_build_object('current',p.job_id,'ends_at',p.job_ends_at,'jobs',(select jsonb_agg(to_jsonb(x) order by x.minutes) from public.kiez_jobs() x));
end $function$;

-- ---------- 15: Pfandlager ausbauen (weniger Klau) ----------
alter table public.profiles add column if not exists bottle_storage integer not null default 0 check (bottle_storage between 0 and 4);
create or replace function public.buy_bottle_storage()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric;
begin
  p := public.kiez_actor();
  if p.bottle_storage >= 4 then raise exception 'Dein Pfandlager ist schon voll ausgebaut'; end if;
  price := (array[10,40,120,300])[p.bottle_storage+1];
  if p.money < price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
  update public.profiles set money=money-price, bottle_storage=bottle_storage+1 where id=p.id returning * into p;
  return jsonb_build_object('level',p.bottle_storage,'price',price,'theft',10-2*p.bottle_storage,'profile',to_jsonb(p));
end $function$;
-- Klau pro Tag: 10 % − 2 % je Ausbaustufe (Stufe 4: 2 %)
create or replace function public.kiez_bottle_theft(p public.profiles)
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare days int; left_ int; lost int; rate numeric := (10-2*p.bottle_storage)/100.0;
begin
  if p.bottles <= 0 then return p; end if;
  days := floor(extract(epoch from (now()-p.bottles_checked_at))/86400);
  if days < 1 then return p; end if;
  left_ := floor(p.bottles*power(1-rate,days)); lost := greatest(least(days,p.bottles), p.bottles-left_);
  update public.profiles set bottles=greatest(0,bottles-lost) where id=p.id;
  update public.profiles set bottles_checked_at=p.bottles_checked_at+make_interval(days=>days) where id=p.id returning * into p;
  perform public.kiez_notify(p.id,'pfand','Während du weg warst, hat jemand '||lost||' Pfandflaschen aus deinem Lager geklaut. Verkauf regelmäßig oder bau dein Lager aus!');
  return p;
end $function$;
revoke execute on function public.kiez_bottle_theft(public.profiles) from public, anon, authenticated;

-- ---------- 13: Ausrüstung im Basar ----------
create table if not exists public.item_listings(
  id bigint generated by default as identity primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.shop_items(id),
  price numeric(12,2) not null check (price > 0),
  created_at timestamptz not null default now());
alter table public.item_listings enable row level security;
drop policy if exists item_listings_read on public.item_listings;
create policy item_listings_read on public.item_listings for select using (true);
grant select on public.item_listings to authenticated;

create or replace function public.item_list(wanted text, price numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; shop numeric; pr numeric(12,2) := round(coalesce(price,0),2); lid bigint;
begin
  p := public.kiez_actor();
  select s.price into shop from public.shop_items s where s.id=wanted;
  if shop is null then raise exception 'Unbekannter Gegenstand'; end if;
  if not exists(select 1 from public.inventory where user_id=p.id and item_id=wanted) then raise exception 'Das hast du nicht'; end if;
  if exists(select 1 from public.inventory where user_id=p.id and item_id=wanted and equipped) then raise exception 'Leg es erst ab'; end if;
  if pr < round(shop*0.2,2) or pr > shop*3 then raise exception 'Preis zwischen % € und % €', round(shop*0.2,2), round(shop*3,2); end if;
  if (select count(*) from public.item_listings where seller_id=p.id) >= 5 then raise exception 'Höchstens 5 Angebote gleichzeitig'; end if;
  delete from public.inventory where user_id=p.id and item_id=wanted;
  insert into public.item_listings(seller_id,item_id,price) values(p.id,wanted,pr) returning id into lid;
  return jsonb_build_object('id',lid);
end $function$;
create or replace function public.item_cancel(listing bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; l public.item_listings;
begin
  p := public.kiez_actor();
  select * into l from public.item_listings where id=listing and seller_id=p.id for update;
  if l.id is null then raise exception 'Angebot nicht gefunden'; end if;
  if exists(select 1 from public.inventory where user_id=p.id and item_id=l.item_id) then raise exception 'Du hast das Stück inzwischen wieder – erst verkaufen'; end if;
  delete from public.item_listings where id=l.id;
  insert into public.inventory(user_id,item_id,quantity) values(p.id,l.item_id,1);
  return jsonb_build_object('cancelled',l.id);
end $function$;
create or replace function public.item_buy(listing bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; l public.item_listings; nm text;
begin
  p := public.kiez_actor();
  select * into l from public.item_listings where id=listing for update;
  if l.id is null then raise exception 'Schon weg'; end if;
  if l.seller_id=p.id then raise exception 'Das ist dein eigenes Angebot'; end if;
  if exists(select 1 from public.inventory where user_id=p.id and item_id=l.item_id) then raise exception 'Das hast du schon – jedes Stück gibt es nur einmal'; end if;
  if p.level < coalesce((select required_level from public.shop_items where id=l.item_id),1) then raise exception 'Dafür ist dein Level zu niedrig'; end if;
  if p.money < l.price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-l.price where id=p.id;
  delete from public.item_listings where id=l.id;
  insert into public.inventory(user_id,item_id,quantity) values(p.id,l.item_id,1);
  perform public.kiez_pay(l.seller_id, round(l.price*0.95,2));
  select name into nm from public.shop_items where id=l.item_id;
  perform public.kiez_notify(l.seller_id,'basar','Verkauft im Basar: '||nm||' für '||to_char(round(l.price*0.95,2),'FM999990.00')||' € (nach 5 % Gebühr).');
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('item',nm,'price',l.price,'profile',to_jsonb(p));
end $function$;

-- ---------- 16: Auktionshaus für Plunder ----------
create table if not exists public.auctions(
  id bigint generated by default as identity primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  plunder_id text not null references public.plunder_catalog(id),
  start_price numeric(12,2) not null, bid numeric(12,2), bidder_id uuid references public.profiles(id) on delete set null,
  ends_at timestamptz not null, settled boolean not null default false,
  created_at timestamptz not null default now());
create index if not exists auctions_open on public.auctions(settled, ends_at);
alter table public.auctions enable row level security;
drop policy if exists auctions_read on public.auctions;
create policy auctions_read on public.auctions for select using (true);
grant select on public.auctions to authenticated;

create or replace function public.settle_auctions()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare a public.auctions; n int := 0; nm text;
begin
  for a in select * from public.auctions where not settled and ends_at<=now() for update skip locked loop
    select name into nm from public.plunder_catalog where id=a.plunder_id;
    if a.bidder_id is null then
      perform public.kiez_give_plunder(a.seller_id, a.plunder_id);
      perform public.kiez_notify(a.seller_id,'auktion','Keiner hat auf '||nm||' geboten – das Stück ist zurück in deiner Plunderkiste.');
    else
      perform public.kiez_give_plunder(a.bidder_id, a.plunder_id);
      perform public.kiez_pay(a.seller_id, round(a.bid*0.95,2));
      perform public.kiez_notify(a.seller_id,'auktion','Versteigert: '||nm||' für '||to_char(a.bid,'FM999990.00')||' € (du bekommst 95 %).');
      perform public.kiez_notify(a.bidder_id,'auktion','Zuschlag! '||nm||' gehört dir.');
    end if;
    update public.auctions set settled=true where id=a.id; n := n+1;
  end loop;
  return n;
end $function$;
grant execute on function public.settle_auctions() to authenticated;

create or replace function public.auction_create(wanted text, start_price numeric, hours integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; have int; r text; sp numeric(12,2) := round(coalesce(start_price,0),2); aid bigint;
begin
  p := public.kiez_actor();
  select rarity into r from public.plunder_catalog where id=wanted;
  if r is null then raise exception 'Unbekannter Plunder'; end if;
  if r not in ('selten','episch','legendaer') then raise exception 'Versteigert wird nur seltener Plunder'; end if;
  if hours not in (1,6,12,24) then raise exception 'Laufzeit 1, 6, 12 oder 24 Stunden'; end if;
  if sp < 0.5 or sp > 1000 then raise exception 'Startpreis zwischen 0,50 € und 1000 €'; end if;
  select quantity into have from public.user_plunder where user_id=p.id and plunder_id=wanted for update;
  if coalesce(have,0) < 1 then raise exception 'Das hast du nicht'; end if;
  if p.equipped_plunder=wanted and have<2 then raise exception 'Leg es erst ab'; end if;
  if (select count(*) from public.auctions where seller_id=p.id and not settled) >= 3 then raise exception 'Höchstens 3 Auktionen gleichzeitig'; end if;
  update public.user_plunder set quantity=quantity-1 where user_id=p.id and plunder_id=wanted;
  delete from public.user_plunder where user_id=p.id and plunder_id=wanted and quantity=0;
  insert into public.auctions(seller_id,plunder_id,start_price,ends_at) values(p.id,wanted,sp,now()+make_interval(hours=>hours)) returning id into aid;
  return jsonb_build_object('id',aid);
end $function$;

create or replace function public.auction_bid(auction bigint, amount numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; a public.auctions; amt numeric(12,2) := round(coalesce(amount,0),2); minb numeric;
begin
  p := public.kiez_actor();
  perform public.settle_auctions();
  select * into a from public.auctions where id=auction for update;
  if a.id is null or a.settled or a.ends_at<=now() then raise exception 'Diese Auktion ist vorbei'; end if;
  if a.seller_id=p.id then raise exception 'Nicht auf die eigene Auktion bieten'; end if;
  if a.bidder_id=p.id then raise exception 'Du bist schon Höchstbietender'; end if;
  minb := case when a.bid is null then a.start_price else a.bid + greatest(0.10, round(a.bid*0.05,2)) end;
  if amt < minb then raise exception 'Mindestgebot % €', minb; end if;
  if p.money < amt then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-amt where id=p.id;               -- Gebot wird festgehalten
  if a.bidder_id is not null then
    perform public.kiez_pay(a.bidder_id, a.bid);                         -- Überbotener bekommt sein Geld zurück
    perform public.kiez_notify(a.bidder_id,'auktion','Du wurdest überboten – dein Gebot ist zurück.');
  end if;
  -- Schluss-Sekunden-Schutz: Gebot in den letzten 2 Min. verlängert um 2 Min.
  update public.auctions set bid=amt, bidder_id=p.id, ends_at=greatest(ends_at, now()+interval '2 minutes') where id=a.id;
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('bid',amt,'profile',to_jsonb(p));
end $function$;

create or replace function public.auctions_list()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  perform public.settle_auctions();
  return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'plunder_id',a.plunder_id,'name',c.name,'rarity',c.rarity,
      'seller',public.kiez_name(a.seller_id),'seller_id',a.seller_id,'start_price',a.start_price,'bid',a.bid,'bidder',public.kiez_name(a.bidder_id),
      'mine',a.seller_id=auth.uid(),'leading',a.bidder_id=auth.uid(),'ends_at',a.ends_at,
      'min_bid',case when a.bid is null then a.start_price else a.bid+greatest(0.10,round(a.bid*0.05,2)) end) order by a.ends_at)
    from public.auctions a join public.plunder_catalog c on c.id=a.plunder_id where not a.settled),'[]'::jsonb);
end $function$;

-- ---------- 17: Kiosk-Stand ----------
create table if not exists public.kiosks(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level integer not null default 1 check (level between 1 and 10),
  collected_at timestamptz not null default now(),
  robbed_at timestamptz);
alter table public.kiosks enable row level security;
drop policy if exists kiosks_read on public.kiosks;
create policy kiosks_read on public.kiosks for select using (true);
grant select on public.kiosks to authenticated;

create or replace function public.kiez_kiosk_rate(lvl integer) returns numeric language sql immutable as $$ select round((0.25*power(lvl,1.5))::numeric,2) $$;
create or replace function public.kiez_kiosk_cash(k public.kiosks) returns numeric language sql stable as $$
  select round(public.kiez_kiosk_rate(k.level)*least(24, extract(epoch from (now()-k.collected_at))/3600)::numeric,2)
$$;

create or replace function public.kiosk_build()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; k public.kiosks; price numeric;
begin
  p := public.kiez_actor();
  select * into k from public.kiosks where user_id=p.id for update;
  if k.user_id is null then
    if p.level < 5 then raise exception 'Einen Kiosk gibt es ab Level 5'; end if;
    price := 30;
  else
    if k.level >= 10 then raise exception 'Dein Kiosk ist voll ausgebaut'; end if;
    price := 30*power(k.level+1,2);
  end if;
  if p.money < price then raise exception 'Dafür reicht deine Kohle nicht (% €)', price; end if;
  update public.profiles set money=money-price where id=p.id;
  if k.user_id is null then insert into public.kiosks(user_id) values(p.id);
  else update public.kiosks set level=level+1 where user_id=p.id; end if;
  select * into k from public.kiosks where user_id=p.id;
  return jsonb_build_object('level',k.level,'price',price,'rate',public.kiez_kiosk_rate(k.level));
end $function$;

create or replace function public.kiosk_collect()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; k public.kiosks; cash numeric;
begin
  p := public.kiez_actor();
  select * into k from public.kiosks where user_id=p.id for update;
  if k.user_id is null then raise exception 'Du hast noch keinen Kiosk'; end if;
  cash := public.kiez_kiosk_cash(k);
  if cash < 0.01 then raise exception 'Die Kasse ist noch leer'; end if;
  update public.kiosks set collected_at=now() where user_id=p.id;
  perform public.kiez_pay(p.id, cash);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('cash',cash,'profile',to_jsonb(p));
end $function$;

-- Kiosk überfallen: eigene Angriffskraft gegen Verteidigung/2 + 4 je Kioskstufe; Beute 30 % der Kasse; alle 6 Std. je Kiosk
create or replace function public.kiosk_rob(target_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; o public.profiles; k public.kiosks; a int; d int; loot numeric := 0; won boolean;
begin
  p := public.kiez_actor(); perform public.kiez_assert_free(p);
  if target_id=p.id then raise exception 'Nicht den eigenen Kiosk'; end if;
  select * into k from public.kiosks where user_id=target_id for update;
  if k.user_id is null then raise exception 'Da steht kein Kiosk'; end if;
  select * into o from public.profiles where id=target_id;
  if o.level < floor(p.level*0.8) or o.level > ceil(p.level*1.5) then raise exception 'Nur Kioske von Spielern in deinem Kampfbereich'; end if;
  if k.robbed_at > now()-interval '6 hours' then raise exception 'Der Kiosk wurde gerade erst ausgeräumt'; end if;
  if p.energy < 12 then raise exception 'Du brauchst 12 Energie'; end if;
  a := public.kiez_attack_power(p) + floor(random()*8)::int;
  d := public.kiez_defense_power(o)/2 + 4*k.level + floor(random()*8)::int;
  won := a > d;
  update public.profiles set energy=energy-12 where id=p.id;
  if won then
    loot := round(public.kiez_kiosk_cash(k)*0.30,2);
    update public.kiosks set robbed_at=now(), collected_at=collected_at+make_interval(secs=>(loot/greatest(public.kiez_kiosk_rate(k.level),0.01)*3600)::int) where user_id=target_id;
    perform public.kiez_pay(p.id, loot);
    perform public.kiez_notify(target_id,'kiosk',p.username||' hat deinen Kiosk überfallen und '||to_char(loot,'FM999990.00')||' € aus der Kasse genommen.');
  else
    update public.kiosks set robbed_at=now() where user_id=target_id;
    perform public.kiez_notify(target_id,'kiosk',p.username||' wollte deinen Kiosk überfallen – ist aber abgeblitzt.');
  end if;
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('won',won,'attack',a,'defense',d,'loot',loot,'profile',to_jsonb(p));
end $function$;

create or replace function public.kiosk_overview()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare p public.profiles; k public.kiosks;
begin
  select * into p from public.profiles where id=auth.uid();
  select * into k from public.kiosks where user_id=p.id;
  return jsonb_build_object('mine',case when k.user_id is null then null else jsonb_build_object('level',k.level,'rate',public.kiez_kiosk_rate(k.level),
      'cash',public.kiez_kiosk_cash(k),'full_at',k.collected_at+interval '24 hours','next_price',case when k.level<10 then 30*power(k.level+1,2) end) end,
    'can_build',p.level>=5,
    'targets',coalesce((select jsonb_agg(jsonb_build_object('user_id',x.user_id,'name',q.username,'level',q.level,'kiosk',x.level,
        'cash',public.kiez_kiosk_cash(x),'ready',coalesce(x.robbed_at,'-infinity')<now()-interval '6 hours') order by public.kiez_kiosk_cash(x) desc)
      from public.kiosks x join public.profiles q on q.id=x.user_id
      where x.user_id<>p.id and not q.is_banned and q.level between floor(p.level*0.8) and ceil(p.level*1.5)),'[]'::jsonb));
end $function$;

-- ---------- 18: Kredithai ----------
create table if not exists public.loans(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null, owed numeric(12,2) not null,
  taken_at timestamptz not null default now(), due_at timestamptz not null, beaten_at timestamptz);
alter table public.loans enable row level security;
drop policy if exists loans_own on public.loans;
create policy loans_own on public.loans for select using (user_id=auth.uid());
grant select on public.loans to authenticated;

create or replace function public.loan_take(amount numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; amt numeric(12,2) := round(coalesce(amount,0),2); maxl numeric;
begin
  p := public.kiez_actor();
  if exists(select 1 from public.loans where user_id=p.id) then raise exception 'Erst den alten Kredit zurückzahlen'; end if;
  maxl := 20*p.level;
  if amt < 5 or amt > maxl then raise exception 'Kredit zwischen 5 € und % €', maxl; end if;
  insert into public.loans(user_id,amount,owed,due_at) values(p.id,amt,round(amt*1.20,2),now()+interval '3 days');
  perform public.kiez_pay(p.id, amt);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('amount',amt,'owed',round(amt*1.20,2),'due_at',now()+interval '3 days','profile',to_jsonb(p));
end $function$;

create or replace function public.loan_repay()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; l public.loans; pay numeric;
begin
  p := public.kiez_actor();
  select * into l from public.loans where user_id=p.id for update;
  if l.user_id is null then raise exception 'Du hast keinen Kredit'; end if;
  pay := least(p.money, l.owed);
  if pay <= 0 then raise exception 'Du hast kein Bargeld dabei'; end if;
  update public.profiles set money=money-pay where id=p.id;
  if pay >= l.owed then delete from public.loans where user_id=p.id; else update public.loans set owed=owed-pay where user_id=p.id; end if;
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('paid',pay,'left',greatest(0,l.owed-pay),'profile',to_jsonb(p));
end $function$;

-- Überfällig: Die Schläger kommen (einmal am Tag) – nehmen Bargeld, Energie und Würde
create or replace function public.kiez_loan_collect(p public.profiles)
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare l public.loans; take numeric;
begin
  select * into l from public.loans where user_id=p.id for update;
  if l.user_id is null or l.due_at > now() or coalesce(l.beaten_at,'-infinity') > now()-interval '1 day' then return p; end if;
  take := least(p.money, l.owed);
  update public.profiles set money=money-take, energy=greatest(0,energy-20), cleanliness=greatest(0,cleanliness-10) where id=p.id returning * into p;
  if take >= l.owed then delete from public.loans where user_id=p.id;
  else update public.loans set owed=round((owed-take)*1.10,2), beaten_at=now() where user_id=p.id; end if;
  perform public.kiez_notify(p.id,'kredit','Die Schläger vom Kredithai waren da: '||to_char(take,'FM999990.00')||' € weg, −20 Energie, blaues Auge. Restschuld wächst um 10 % pro Tag.');
  return p;
end $function$;
revoke execute on function public.kiez_loan_collect(public.profiles) from public, anon, authenticated;

create or replace function public.kiez_actor()
returns public.profiles language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; mins numeric; rate numeric; gain int;
begin
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null or p.is_banned then raise exception 'Zugriff gesperrt'; end if;
  p := public.kiez_body_tick(p);
  p := public.kiez_bottle_theft(p);
  p := public.kiez_loan_collect(p);
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

create or replace function public.loan_status()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('loan',(select to_jsonb(l) from public.loans l where l.user_id=auth.uid()),
    'max',20*(select level from public.profiles where id=auth.uid()))
$$;

-- ---------- 20: Kopfgeld ----------
create table if not exists public.bounties(
  id bigint generated by default as identity primary key,
  target_id uuid not null references public.profiles(id) on delete cascade,
  sponsor_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null, created_at timestamptz not null default now(),
  claimed_by uuid references public.profiles(id) on delete set null, claimed_at timestamptz);
create index if not exists bounties_open on public.bounties(target_id) where claimed_by is null;
alter table public.bounties enable row level security;
drop policy if exists bounties_read on public.bounties;
create policy bounties_read on public.bounties for select using (true);
grant select on public.bounties to authenticated;

create or replace function public.bounty_place(target_id uuid, amount numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; amt numeric(12,2) := round(coalesce(amount,0),2); tn text;
begin
  p := public.kiez_actor();
  if target_id=p.id then raise exception 'Kein Kopfgeld auf dich selbst'; end if;
  select username into tn from public.profiles where id=target_id and not is_banned;
  if tn is null then raise exception 'Spieler unbekannt'; end if;
  if amt < 5 or amt > 500 then raise exception 'Kopfgeld zwischen 5 € und 500 €'; end if;
  if p.money < amt then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-amt where id=p.id;
  insert into public.bounties(target_id,sponsor_id,amount) values(target_id,p.id,amt);
  perform public.kiez_notify(target_id,'kopfgeld','Auf deinen Kopf sind '||to_char(amt,'FM999990.00')||' € ausgesetzt. Pass auf dich auf!');
  perform public.kiez_tick('kopfgeld',target_id,'Kopfgeld: '||to_char(amt,'FM999990.00')||' € auf '||tn||'.');
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('amount',amt,'profile',to_jsonb(p));
end $function$;

create or replace function public.bounty_list()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('target_id',t.target_id,'name',p.username,'level',p.level,'amount',t.total) order by t.total desc),'[]'::jsonb)
  from (select target_id, sum(amount) total from public.bounties where claimed_by is null group by target_id) t join public.profiles p on p.id=t.target_id
$$;

-- ---------- 19/20: Angriff mit Revanche und Kopfgeld ----------
create table if not exists public.revenges(
  user_id uuid not null references public.profiles(id) on delete cascade,
  fight_id bigint not null, created_at timestamptz not null default now(),
  primary key(user_id, fight_id));
alter table public.revenges enable row level security;
revoke all on public.revenges from anon, authenticated;
create or replace function public.attack_player(target_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare a public.profiles; d public.profiles; a_power int; d_power int; winner uuid;
  loot numeric(12,2):=0; result text; min_lvl int; max_lvl int; cost int:=15; revenge boolean := coalesce(current_setting('kiez.revenge',true),'')='1'; bounty numeric := 0;
begin
  if target_id=auth.uid() then raise exception 'Du kannst dich nicht selbst vermöbeln'; end if;
  a := public.kiez_actor();
  perform public.kiez_assert_free(a);
  select * into d from public.profiles where id=target_id for update;
  if d.id is null or d.is_banned then raise exception 'Gegner verschwunden'; end if;
  if a.collection_ends_at is not null then raise exception 'Dein Einkaufswagen ist unterwegs oder wartet aufs Ausladen'; end if;
  if a.energy<cost then raise exception 'Nicht genug Energie für eine Prügelei'; end if;
  min_lvl := greatest(1,floor(a.level*0.8)::int); max_lvl := ceil(a.level*1.5)::int;
  if not revenge and (d.level<min_lvl or d.level>max_lvl) then
    raise exception 'Du kannst nur Gegner von Level % bis % angreifen', min_lvl, max_lvl; end if;
  if d.jail_until is not null and d.jail_until>now() then raise exception 'Dieser Spieler sitzt im Knast'; end if;
  if d.protection_until is not null and d.protection_until>now() then raise exception 'Dieser Spieler steht noch unter Schutz'; end if;
  if not revenge and exists(select 1 from public.fights where attacker_id=a.id and defender_id=target_id and created_at>now()-interval '3 hours') then
    raise exception 'Diesen Spieler hast du in den letzten 3 Stunden schon besucht'; end if;
  if exists(select 1 from public.gang_members x join public.gang_members y on x.gang_id=y.gang_id where x.user_id=a.id and y.user_id=d.id) then
    raise exception 'Du prügelst dich nicht mit deiner eigenen Bande'; end if;
  a_power := public.kiez_attack_power(a) + floor(random()*8)::int;
  d_power := public.kiez_defense_power(d) + floor(random()*8)::int;
  if a_power>d_power then
    winner:=a.id; result:='win';
    loot:=round(d.money*case when d.insurance_active then 0.05 else 0.10 end,2);
    loot:=least(loot,greatest(0,a.cash_capacity-a.money));
    update public.profiles set money=money+loot,energy=energy-cost,xp=xp+15,wins=wins+1 where id=a.id returning * into a;
    update public.profiles set money=greatest(0,money-loot),losses=losses+1,protection_until=now()+interval '5 minutes' where id=d.id;
  else
    winner:=d.id; result:='loss';
    update public.profiles set energy=energy-cost,xp=xp+3,losses=losses+1,protection_until=now()+interval '2 minutes' where id=a.id returning * into a;
    update public.profiles set wins=wins+1,xp=xp+5 where id=d.id;
  end if;
  delete from public.user_active_defenses where user_id=target_id and consume_on_attack=true and (expires_at is null or expires_at>now());
  insert into public.fights(attacker_id,defender_id,winner_id,attacker_power,defender_power,loot) values(a.id,d.id,winner,a_power,d_power,loot);
  -- Kopfgeld: wer den Gesuchten besiegt, kassiert alle offenen Kopfgelder
  if winner=a.id then
    select coalesce(sum(x.amount),0) into bounty from public.bounties x where x.target_id=d.id and x.claimed_by is null and x.sponsor_id<>a.id;
    if bounty > 0 then
      update public.bounties x set claimed_by=a.id, claimed_at=now() where x.target_id=d.id and x.claimed_by is null and x.sponsor_id<>a.id;
      perform public.kiez_pay(a.id, bounty);
      perform public.kiez_tick('kopfgeld',a.id,a.username||' hat das Kopfgeld auf '||d.username||' kassiert: '||to_char(bounty,'FM999990.00')||' €.');
      select * into a from public.profiles where id=a.id;
    end if;
  end if;
  perform set_config('kiez.revenge','',true);
  return jsonb_build_object('result',result,'attacker_power',a_power,'defender_power',d_power,'loot',loot,'opponent',d.username,'bounty',bounty,'revenge',revenge,'profile',to_jsonb(a));
end $function$;

-- Revanche: Wer verloren hat (als Angegriffener), darf innerhalb von 24 Std. einmal sofort zurückschlagen – ohne Level- und 3-Std.-Sperre
create or replace function public.revenge_attack(fight bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare f record; me uuid := auth.uid(); r jsonb;
begin
  select * into f from public.fights where id=fight;
  if f.id is null or f.defender_id<>me or f.winner_id=me then raise exception 'Hier gibt es nichts zu rächen'; end if;
  if f.created_at < now()-interval '24 hours' then raise exception 'Zu spät – Revanche nur 24 Stunden lang'; end if;
  if exists(select 1 from public.revenges where user_id=me and fight_id=fight) then raise exception 'Für diesen Kampf hattest du schon deine Revanche'; end if;
  insert into public.revenges(user_id,fight_id) values(me,fight);
  perform set_config('kiez.revenge','1',true);
  r := public.attack_player(f.attacker_id);
  return r;
end $function$;

create or replace function public.revenge_list()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('fight_id',f.id,'attacker_id',f.attacker_id,'name',public.kiez_name(f.attacker_id),'loot',f.loot,'at',f.created_at) order by f.created_at desc),'[]'::jsonb)
  from public.fights f where f.defender_id=auth.uid() and f.winner_id<>auth.uid() and f.created_at>now()-interval '24 hours'
    and not exists(select 1 from public.revenges r where r.user_id=auth.uid() and r.fight_id=f.id)
$$;

-- ---------- 21: Wöchentliches Kampfturnier (K.-o., automatisch) ----------
create table if not exists public.tournament_signups(
  week_start date not null, user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(week_start, user_id));
create table if not exists public.tournaments(
  week_start date primary key, rounds jsonb not null, winner_id uuid, pot numeric(12,2) not null default 0);
alter table public.tournament_signups enable row level security;
alter table public.tournaments enable row level security;
drop policy if exists tournament_signups_read on public.tournament_signups;
create policy tournament_signups_read on public.tournament_signups for select using (true);
drop policy if exists tournaments_read on public.tournaments;
create policy tournaments_read on public.tournaments for select using (true);
grant select on public.tournament_signups, public.tournaments to authenticated;

create or replace function public.tournament_signup()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; wk date := public.kiez_week(current_date);
begin
  p := public.kiez_actor();
  if exists(select 1 from public.tournament_signups where week_start=wk and user_id=p.id) then raise exception 'Du bist schon angemeldet'; end if;
  if p.money < 2 then raise exception 'Startgeld 2 €'; end if;
  update public.profiles set money=money-2 where id=p.id;
  insert into public.tournament_signups(week_start,user_id) values(wk,p.id);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('signed',true,'profile',to_jsonb(p));
end $function$;

-- Vergangene Wochen austragen: Paarungen nach Anmeldung, Sieger = Kampfkraft + Zufall; Topf = Startgelder + 20 €
create or replace function public.resolve_tournaments()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare wk date; players uuid[]; nextr uuid[]; rounds jsonb; rnd jsonb; i int; a uuid; b uuid; pa int; pb int; w uuid; n int := 0; pot numeric; second uuid; pr profiles;
begin
  for wk in select distinct week_start from public.tournament_signups where week_start < public.kiez_week(current_date)
            and week_start not in (select week_start from public.tournaments) order by 1 loop
    select array_agg(user_id order by created_at) into players from public.tournament_signups where week_start=wk;
    pot := 2*coalesce(array_length(players,1),0) + 20; rounds := '[]'::jsonb; second := null;
    while coalesce(array_length(players,1),0) > 1 loop
      nextr := '{}'; rnd := '[]'::jsonb; i := 1;
      while i <= array_length(players,1) loop
        a := players[i]; b := case when i+1 <= array_length(players,1) then players[i+1] end;
        if b is null then nextr := nextr || a; rnd := rnd || jsonb_build_object('a',public.kiez_name(a),'b',null,'winner',public.kiez_name(a));
        else
          select * into pr from public.profiles where id=a; pa := public.kiez_attack_power(pr)+public.kiez_defense_power(pr)+floor(random()*15)::int;
          select * into pr from public.profiles where id=b; pb := public.kiez_attack_power(pr)+public.kiez_defense_power(pr)+floor(random()*15)::int;
          w := case when pa >= pb then a else b end; nextr := nextr || w;
          if array_length(players,1) = 2 then second := case when w=a then b else a end; end if;
          rnd := rnd || jsonb_build_object('a',public.kiez_name(a),'b',public.kiez_name(b),'pa',pa,'pb',pb,'winner',public.kiez_name(w));
        end if;
        i := i + 2;
      end loop;
      rounds := rounds || jsonb_build_array(rnd); players := nextr;
    end loop;
    w := players[1];
    insert into public.tournaments(week_start,rounds,winner_id,pot) values(wk,rounds,w,pot);
    if w is not null then
      perform public.kiez_pay(w, round(pot*0.7,2)); update public.profiles set bottlecaps=bottlecaps+20 where id=w;
      perform public.kiez_notify(w,'turnier','Du hast das Kampfturnier gewonnen! '||to_char(round(pot*0.7,2),'FM999990.00')||' € und 20 Kronkorken.');
      perform public.kiez_tick('turnier',w,public.kiez_name(w)||' gewinnt das Kampfturnier der Woche.');
    end if;
    if second is not null then perform public.kiez_pay(second, round(pot*0.3,2)); perform public.kiez_notify(second,'turnier','Platz 2 im Kampfturnier: '||to_char(round(pot*0.3,2),'FM999990.00')||' €.'); end if;
    n := n+1;
  end loop;
  return n;
end $function$;
revoke execute on function public.resolve_tournaments() from public, anon, authenticated;

create or replace function public.tournament_status()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare wk date := public.kiez_week(current_date);
begin
  perform public.resolve_tournaments();
  return jsonb_build_object('week_ends',wk+7,'signed',exists(select 1 from public.tournament_signups where week_start=wk and user_id=auth.uid()),
    'players',(select count(*) from public.tournament_signups where week_start=wk),
    'last',(select jsonb_build_object('week',week_start,'winner',public.kiez_name(winner_id),'pot',pot,'rounds',rounds) from public.tournaments order by week_start desc limit 1));
end $function$;

-- ---------- 22: Wetten auf Bandenkriege und den Tierkampf des Tages ----------
create table if not exists public.bets(
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('war','pet')), ref text not null, side text not null,
  amount numeric(12,2) not null, settled boolean not null default false, payout numeric(12,2),
  created_at timestamptz not null default now());
create index if not exists bets_open on public.bets(kind, ref) where not settled;
alter table public.bets enable row level security;
drop policy if exists bets_own on public.bets;
create policy bets_own on public.bets for select using (user_id=auth.uid());
grant select on public.bets to authenticated;

-- Tierkampf des Tages: zwei Straßentiere, Ausgang steht erst am nächsten Tag fest (aus dem Datum abgeleitet)
create or replace function public.kiez_pet_match(d date)
returns jsonb language sql immutable as $$
  select jsonb_build_object('day',d,'a',(array['Kampfdackel Bruno','Straßenkater Moritz','Ratte Rambo','Taube Günther','Mops Helga'])[1+abs(hashtext(d::text||'a'))%5],
    'b',(array['Pitbull Paula','Frettchen Fritz','Möwe Kalle','Waschbär Wally','Spitz Susi'])[1+abs(hashtext(d::text||'b'))%5],
    'winner',case when abs(hashtext(d::text||'w'))%100 < 50 then 'a' else 'b' end)
$$;

create or replace function public.settle_bets()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare r record; w public.gang_wars; win text; pool numeric; winpool numeric; n int := 0; b record;
begin
  -- Bandenkriege
  for r in select distinct ref from public.bets where kind='war' and not settled loop
    select * into w from public.gang_wars where id=r.ref::bigint;
    if w.id is null or not w.resolved then continue; end if;
    win := case when w.winner_gang=w.attacker_gang then 'attacker' when w.winner_gang=w.defender_gang then 'defender' end;
    select sum(amount), sum(amount) filter (where side=win) into pool, winpool from public.bets where kind='war' and ref=r.ref and not settled;
    for b in select * from public.bets where kind='war' and ref=r.ref and not settled for update loop
      if win is null or coalesce(winpool,0)=0 then update public.bets set settled=true, payout=b.amount where id=b.id; perform public.kiez_pay(b.user_id,b.amount);
      elsif b.side=win then update public.bets set settled=true, payout=round(pool*0.95*b.amount/winpool,2) where id=b.id; perform public.kiez_pay(b.user_id, round(pool*0.95*b.amount/winpool,2));
        perform public.kiez_notify(b.user_id,'wette','Wette gewonnen: '||to_char(round(pool*0.95*b.amount/winpool,2),'FM999990.00')||' €.');
      else update public.bets set settled=true, payout=0 where id=b.id; end if;
      n := n+1;
    end loop;
  end loop;
  -- Tierkampf: feste Quote 1,9
  for b in select * from public.bets where kind='pet' and not settled and ref::date < current_date for update loop
    win := public.kiez_pet_match(b.ref::date)->>'winner';
    if b.side=win then update public.bets set settled=true, payout=round(b.amount*1.9,2) where id=b.id; perform public.kiez_pay(b.user_id, round(b.amount*1.9,2));
      perform public.kiez_notify(b.user_id,'wette','Tierkampf-Wette gewonnen: '||to_char(round(b.amount*1.9,2),'FM999990.00')||' €.');
    else update public.bets set settled=true, payout=0 where id=b.id; end if;
    n := n+1;
  end loop;
  return n;
end $function$;
revoke execute on function public.settle_bets() from public, anon, authenticated;

create or replace function public.place_bet(bet_kind text, bet_ref text, bet_side text, amount numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; amt numeric(12,2) := round(coalesce(amount,0),2); w public.gang_wars; myg uuid;
begin
  p := public.kiez_actor();
  if amt < 0.5 or amt > 50 then raise exception 'Einsatz zwischen 0,50 € und 50 €'; end if;
  if p.money < amt then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  if bet_kind='war' then
    select * into w from public.gang_wars where id=bet_ref::bigint and not resolved and ends_at>now()+interval '1 hour';
    if w.id is null then raise exception 'Auf diesen Krieg kann man nicht mehr wetten'; end if;
    select gang_id into myg from public.gang_members where user_id=p.id;
    if myg in (w.attacker_gang,w.defender_gang) then raise exception 'Nicht auf den Krieg der eigenen Bande wetten'; end if;
    if bet_side not in ('attacker','defender') then raise exception 'Ungültige Seite'; end if;
  elsif bet_kind='pet' then
    if bet_ref::date <> current_date then raise exception 'Nur auf den Tierkampf von heute'; end if;
    if bet_side not in ('a','b') then raise exception 'Ungültige Seite'; end if;
  else raise exception 'Unbekannte Wette'; end if;
  if exists(select 1 from public.bets where user_id=p.id and kind=bet_kind and ref=bet_ref) then raise exception 'Du hast hier schon gewettet'; end if;
  update public.profiles set money=money-amt where id=p.id;
  insert into public.bets(user_id,kind,ref,side,amount) values(p.id,bet_kind,bet_ref,bet_side,amt);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('amount',amt,'profile',to_jsonb(p));
end $function$;

create or replace function public.bets_overview()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m jsonb := public.kiez_pet_match(current_date);
begin
  perform public.settle_bets();
  return jsonb_build_object(
    'pet',jsonb_build_object('day',current_date,'a',m->>'a','b',m->>'b','odds',1.9,'yesterday',(select jsonb_build_object('a',x->>'a','b',x->>'b','winner',x->>(x->>'winner')) from (select public.kiez_pet_match(current_date-1) x) y)),
    'wars',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'attacker',(select name from public.gangs where id=w.attacker_gang),'defender',(select name from public.gangs where id=w.defender_gang),
        'score',w.attacker_score||':'||w.defender_score,'ends_at',w.ends_at,
        'pool_a',(select coalesce(sum(amount),0) from public.bets where kind='war' and ref=w.id::text and side='attacker'),
        'pool_d',(select coalesce(sum(amount),0) from public.bets where kind='war' and ref=w.id::text and side='defender')))
      from public.gang_wars w where not w.resolved and w.ends_at>now()+interval '1 hour'),'[]'::jsonb),
    'mine',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'ref',ref,'side',side,'amount',amount,'settled',settled,'payout',payout) order by id desc)
      from (select * from public.bets where user_id=auth.uid() order by id desc limit 10) b),'[]'::jsonb));
end $function$;
