-- 0015: Runde 6 – weitere Pennergame-Funktionen
-- Stadtteile (Banden sammeln Einfluss, Wochensieger besitzt das Viertel), Plunder-Basar zwischen Spielern,
-- Zockerbude (Hütchenspiel, Würfelduell), Schließfach (Geld sicher vor Überfällen), Kiez-Geschichte (Aufgabenkette),
-- Kiez-Chat, Titel aus Erfolgen, Kampfprotokoll.

alter table public.profiles
  add column if not exists bank_balance numeric(14,2) not null default 0,
  add column if not exists quest_step integer not null default 1,
  add column if not exists title text,
  add column if not exists district text,
  add column if not exists district_changed_at timestamptz;

-- ---------- Auszahlen: Tasche bis Geldbehälter voll, Rest ins Schließfach (nichts geht verloren) ----------
create or replace function public.kiez_pay(uid uuid, amt numeric)
returns numeric language plpgsql security definer set search_path to 'public' as $function$
declare room numeric; pocket numeric;
begin
  if uid is null or amt is null or amt<=0 then return 0; end if;
  select greatest(0,cash_capacity-money) into room from public.profiles where id=uid for update;
  pocket := least(amt, coalesce(room,0));
  update public.profiles set money=money+pocket, bank_balance=bank_balance+(amt-pocket) where id=uid;
  return pocket;
end $function$;
revoke execute on function public.kiez_pay(uuid,numeric) from public, anon, authenticated;

-- ---------- Schließfach ----------
create or replace function public.kiez_bank_limit(p public.profiles) returns numeric language sql immutable as
$$ select (100 + p.level*50)::numeric $$;

create or replace function public.bank_deposit(amount numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; fee numeric(12,2); lim numeric;
begin
  p := public.kiez_actor();
  amount := round(coalesce(amount,0),2);
  if amount < 1 then raise exception 'Mindestens 1,00 € einzahlen'; end if;
  if amount > p.money then raise exception 'So viel Bargeld hast du nicht'; end if;
  fee := greatest(0.01, round(amount*0.02,2)); lim := public.kiez_bank_limit(p);
  if p.bank_balance + amount - fee > lim then
    raise exception 'Dein Schließfach fasst höchstens % € (Level %). Frei: % €', to_char(lim,'FM999999990.00'), p.level,
      to_char(greatest(0,lim-p.bank_balance),'FM999999990.00');
  end if;
  update public.profiles set money=money-amount, bank_balance=bank_balance+amount-fee where id=p.id returning * into p;
  return jsonb_build_object('fee',fee,'stored',amount-fee,'profile',to_jsonb(p));
end $function$;

create or replace function public.bank_withdraw(amount numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  amount := round(coalesce(amount,0),2);
  if amount <= 0 then raise exception 'Ungültiger Betrag'; end if;
  if amount > p.bank_balance then raise exception 'So viel liegt nicht im Schließfach'; end if;
  if p.money + amount > p.cash_capacity then
    raise exception 'So viel passt nicht in deinen Geldbehälter (frei: % €)', to_char(greatest(0,p.cash_capacity-p.money),'FM999999990.00');
  end if;
  update public.profiles set money=money+amount, bank_balance=bank_balance-amount where id=p.id returning * into p;
  return jsonb_build_object('profile',to_jsonb(p));
end $function$;

-- ---------- Stadtteile ----------
create table if not exists public.districts(
  id text primary key, name text not null, description text not null, sort_order integer not null default 0);
insert into public.districts(id,name,description,sort_order) values
 ('bahnhof','Bahnhofsviertel','Pendler, Pfandautomaten und viel Durchgangsverkehr.',1),
 ('altstadt','Altstadt','Enge Gassen, Kneipen und Touristen mit lockerem Kleingeld.',2),
 ('hafen','Hafen','Container, Kräne und Seeleute mit Durst.',3),
 ('stadtpark','Stadtpark','Grillpartys am Wochenende – das Pfandparadies.',4),
 ('markt','Marktplatz','Markttage, Straßenmusik und viele Leute.',5),
 ('villen','Villenviertel','Wenig Flaschen, aber dicke Geldbeutel.',6)
on conflict (id) do nothing;

create table if not exists public.district_influence(
  district_id text not null references public.districts(id),
  gang_id uuid not null references public.gangs(id) on delete cascade,
  week_start date not null,
  points integer not null default 0,
  primary key(district_id,gang_id,week_start));
create table if not exists public.district_owners(
  district_id text not null references public.districts(id),
  week_start date not null,
  gang_id uuid references public.gangs(id) on delete set null,
  points integer not null default 0,
  primary key(district_id,week_start));
create table if not exists public.district_weeks_done(week_start date primary key);

-- Einfluss: jede gesammelte Flasche 1 Punkt, jeder gewonnene Kampf 20 Punkte – für die eigene Bande im eigenen Revier
create or replace function public.kiez_track_district()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare pts int; d text; g uuid;
begin
  pts := (new.bottles - case when tg_op='UPDATE' then old.bottles else 0 end)
       + 20*(new.wins - case when tg_op='UPDATE' then old.wins else 0 end);
  if pts > 0 then
    select district into d from public.profiles where id=new.user_id;
    select gang_id into g from public.gang_members where user_id=new.user_id;
    if d is not null and g is not null then
      insert into public.district_influence(district_id,gang_id,week_start,points) values(d,g,new.week_start,pts)
      on conflict (district_id,gang_id,week_start) do update set points=public.district_influence.points+excluded.points;
    end if;
  end if;
  return new;
end $function$;
drop trigger if exists weekly_scores_district on public.weekly_scores;
create trigger weekly_scores_district after insert or update on public.weekly_scores for each row execute function public.kiez_track_district();

-- Vergangene Wochen auswerten: Bande mit dem meisten Einfluss besitzt das Viertel die folgende Woche, bekommt 250 € in die Kasse
create or replace function public.resolve_districts()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare wk date; r record; n int := 0; m record;
begin
  for wk in select distinct week_start from public.district_influence
            where week_start < public.kiez_week(current_date)
              and week_start not in (select week_start from public.district_weeks_done) order by 1 loop
    for r in select distinct on (i.district_id) i.district_id, i.gang_id, i.points, dd.name dname, g.name gname
             from public.district_influence i join public.districts dd on dd.id=i.district_id join public.gangs g on g.id=i.gang_id
             where i.week_start=wk and i.points>0 order by i.district_id, i.points desc, i.gang_id loop
      insert into public.district_owners(district_id,week_start,gang_id,points) values(r.district_id,wk+7,r.gang_id,r.points)
      on conflict do nothing;
      if found then
        update public.gangs set balance=balance+250 where id=r.gang_id;
        insert into public.gang_log(gang_id,user_id,kind,amount,info) values(r.gang_id,null,'revier',250,'erobert '||r.dname||' für eine Woche');
        for m in select user_id from public.gang_members where gang_id=r.gang_id loop
          perform public.kiez_notify(m.user_id,'revier','🏴 Deine Bande hat „'||r.dname||'“ erobert! 250 € gehen in die Bandenkasse.');
        end loop;
        n := n+1;
      end if;
    end loop;
    insert into public.district_weeks_done values(wk) on conflict do nothing;
  end loop;
  return n;
end $function$;
revoke execute on function public.resolve_districts() from public, anon, authenticated;

create or replace function public.choose_district(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; nm text;
begin
  p := public.kiez_actor();
  select name into nm from public.districts where id=wanted;
  if nm is null then raise exception 'Diesen Stadtteil gibt es nicht'; end if;
  if p.district=wanted then raise exception 'Das ist schon dein Revier'; end if;
  if p.district is not null and p.district_changed_at > now()-interval '1 day' then
    raise exception 'Du kannst dein Revier nur einmal am Tag wechseln';
  end if;
  update public.profiles set district=wanted, district_changed_at=now() where id=p.id returning * into p;
  return jsonb_build_object('district',nm,'profile',to_jsonb(p));
end $function$;

create or replace function public.district_overview()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); myg uuid; res jsonb;
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  perform public.resolve_districts();
  select gang_id into myg from public.gang_members where user_id=me;
  select jsonb_agg(jsonb_build_object(
    'id',d.id,'name',d.name,'description',d.description,
    'owner',(select g.name from public.district_owners o join public.gangs g on g.id=o.gang_id where o.district_id=d.id and o.week_start=public.kiez_week(current_date)),
    'owner_id',(select o.gang_id from public.district_owners o where o.district_id=d.id and o.week_start=public.kiez_week(current_date)),
    'top',coalesce((select jsonb_agg(jsonb_build_object('gang',g.name,'gang_id',g.id,'points',i.points) order by i.points desc)
            from (select * from public.district_influence where district_id=d.id and week_start=public.kiez_week(current_date) order by points desc limit 3) i
            join public.gangs g on g.id=i.gang_id),'[]'::jsonb),
    'mine',coalesce((select points from public.district_influence where district_id=d.id and gang_id=myg and week_start=public.kiez_week(current_date)),0),
    'players',(select count(*) from public.profiles where district=d.id)) order by d.sort_order) into res
  from public.districts d;
  return jsonb_build_object('districts',res,'my_district',(select district from public.profiles where id=me),'my_gang',myg,
    'week_ends',public.kiez_week(current_date)+7);
end $function$;

-- ---------- Plunder-Basar ----------
create table if not exists public.market_listings(
  id bigint generated by default as identity primary key,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  plunder_id text not null references public.plunder_catalog(id),
  qty integer not null check (qty>0),
  price numeric(12,2) not null check (price>0),
  created_at timestamptz not null default now());
create index if not exists market_listings_plunder_idx on public.market_listings(plunder_id, price);

create or replace function public.market_list(wanted text, qty integer, price numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; have int; lid bigint;
begin
  p := public.kiez_actor();
  price := round(coalesce(price,0),2);
  if qty is null or qty<1 then raise exception 'Ungültige Menge'; end if;
  if price < 0.10 or price > 5000 then raise exception 'Preis pro Stück: 0,10 € bis 5.000 €'; end if;
  if (select count(*) from public.market_listings where seller_id=p.id) >= 10 then raise exception 'Du hast schon 10 Angebote im Basar'; end if;
  select quantity into have from public.user_plunder where user_id=p.id and plunder_id=wanted for update;
  if coalesce(have,0) < qty then raise exception 'So viel davon hast du nicht'; end if;
  if p.equipped_plunder=wanted and have-qty<1 then raise exception 'Leg den Plunder erst ab'; end if;
  update public.user_plunder set quantity=quantity-qty where user_id=p.id and plunder_id=wanted;
  delete from public.user_plunder where user_id=p.id and plunder_id=wanted and quantity=0;
  insert into public.market_listings(seller_id,plunder_id,qty,price) values(p.id,wanted,qty,price) returning id into lid;
  return jsonb_build_object('listing',lid);
end $function$;

create or replace function public.market_cancel(listing bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; l public.market_listings;
begin
  p := public.kiez_actor();
  select * into l from public.market_listings where id=listing and seller_id=p.id for update;
  if l.id is null then raise exception 'Angebot nicht gefunden'; end if;
  insert into public.user_plunder(user_id,plunder_id,quantity) values(p.id,l.plunder_id,l.qty)
  on conflict (user_id,plunder_id) do update set quantity=public.user_plunder.quantity+excluded.quantity;
  delete from public.market_listings where id=l.id;
  return jsonb_build_object('returned',l.qty);
end $function$;

create or replace function public.market_buy(listing bigint, qty integer default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; l public.market_listings; n int; cost numeric(12,2); net numeric(12,2); nm text;
begin
  p := public.kiez_actor();
  select * into l from public.market_listings where id=listing for update;
  if l.id is null then raise exception 'Das Angebot ist schon weg'; end if;
  if l.seller_id=p.id then raise exception 'Eigene Angebote kannst du nicht kaufen'; end if;
  n := coalesce(qty,l.qty);
  if n<1 or n>l.qty then raise exception 'Ungültige Menge'; end if;
  cost := n*l.price;
  if p.money < cost then raise exception 'Nicht genug Bargeld (% € nötig)', to_char(cost,'FM999999990.00'); end if;
  update public.profiles set money=money-cost where id=p.id;
  insert into public.user_plunder(user_id,plunder_id,quantity) values(p.id,l.plunder_id,n)
  on conflict (user_id,plunder_id) do update set quantity=public.user_plunder.quantity+excluded.quantity;
  if n=l.qty then delete from public.market_listings where id=l.id;
  else update public.market_listings m set qty=m.qty-n where m.id=l.id; end if;
  net := round(cost*0.95,2);
  perform public.kiez_pay(l.seller_id, net);
  select name into nm from public.plunder_catalog where id=l.plunder_id;
  perform public.kiez_notify(l.seller_id,'basar','🛍 '||public.kiez_name(p.id)||' hat '||n||'× '||nm||' im Basar gekauft. Du bekommst '||to_char(net,'FM999999990.00')||' € (5 % Gebühr).');
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('bought',n,'name',nm,'cost',cost,'profile',to_jsonb(p));
end $function$;

-- ---------- Zockerbude ----------
create table if not exists public.gamble_log(
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null, stake numeric(12,2) not null, payout numeric(12,2) not null default 0,
  created_at timestamptz not null default now());
create index if not exists gamble_log_user_idx on public.gamble_log(user_id, created_at desc);

-- Hütchenspiel: Kugel unter einem von drei Bechern, Treffer zahlt das 2,7-fache
create or replace function public.shell_game(stake numeric, pick integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; ball int; payout numeric(12,2) := 0; maxs numeric;
begin
  p := public.kiez_actor(); perform public.kiez_assert_free(p);
  stake := round(coalesce(stake,0),2); maxs := least(25, 1+p.level);
  if pick not between 1 and 3 then raise exception 'Wähle einen der drei Becher'; end if;
  if stake < 0.10 or stake > maxs then raise exception 'Einsatz: 0,10 € bis % €', to_char(maxs,'FM999990.00'); end if;
  if stake > p.money then raise exception 'So viel Bargeld hast du nicht'; end if;
  if (select count(*) from public.gamble_log where user_id=p.id and game='huetchen' and created_at>now()-interval '1 day') >= 30 then
    raise exception 'Der Hütchenspieler hat für heute genug von dir. Morgen wieder!';
  end if;
  ball := 1 + floor(random()*3)::int;
  update public.profiles set money=money-stake where id=p.id;
  if ball=pick then payout := round(stake*2.7,2); perform public.kiez_pay(p.id,payout); end if;
  insert into public.gamble_log(user_id,game,stake,payout) values(p.id,'huetchen',stake,payout);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('ball',ball,'win',ball=pick,'payout',payout,'profile',to_jsonb(p));
end $function$;

-- Würfelduell: Einsatz rein, ein anderer Spieler nimmt an, beide würfeln zwei Würfel, Gewinner bekommt den Topf minus 5 %
create table if not exists public.dice_challenges(
  id bigint generated by default as identity primary key,
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  stake numeric(12,2) not null check (stake>0),
  status text not null default 'open' check (status in ('open','done','cancelled')),
  opponent_id uuid references public.profiles(id) on delete set null,
  challenger_roll integer, opponent_roll integer, winner_id uuid,
  created_at timestamptz not null default now(), resolved_at timestamptz);
create index if not exists dice_open_idx on public.dice_challenges(status, created_at desc);

create or replace function public.dice_challenge(stake numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; maxs numeric; cid bigint;
begin
  p := public.kiez_actor(); perform public.kiez_assert_free(p);
  stake := round(coalesce(stake,0),2); maxs := least(100, 5*p.level);
  if stake < 1 or stake > maxs then raise exception 'Einsatz: 1,00 € bis % €', to_char(maxs,'FM999990.00'); end if;
  if stake > p.money then raise exception 'So viel Bargeld hast du nicht'; end if;
  if (select count(*) from public.dice_challenges where challenger_id=p.id and status='open') >= 3 then
    raise exception 'Du hast schon 3 offene Würfelduelle';
  end if;
  update public.profiles set money=money-stake where id=p.id returning * into p;
  insert into public.dice_challenges(challenger_id,stake) values(p.id,stake) returning id into cid;
  return jsonb_build_object('challenge',cid,'profile',to_jsonb(p));
end $function$;

create or replace function public.dice_accept(challenge bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; c public.dice_challenges; r1 int; r2 int; w uuid; pot numeric(12,2);
begin
  p := public.kiez_actor(); perform public.kiez_assert_free(p);
  select * into c from public.dice_challenges where id=challenge for update;
  if c.id is null or c.status<>'open' then raise exception 'Das Duell ist schon vorbei'; end if;
  if c.challenger_id=p.id then raise exception 'Gegen dich selbst würfeln geht nicht'; end if;
  if c.stake > p.money then raise exception 'Du brauchst % € Bargeld für den Einsatz', to_char(c.stake,'FM999990.00'); end if;
  update public.profiles set money=money-c.stake where id=p.id;
  loop
    r1 := 2 + floor(random()*6)::int + floor(random()*6)::int;
    r2 := 2 + floor(random()*6)::int + floor(random()*6)::int;
    exit when r1<>r2;
  end loop;
  w := case when r1>r2 then c.challenger_id else p.id end;
  pot := round(c.stake*2*0.95,2);
  perform public.kiez_pay(w,pot);
  update public.dice_challenges set status='done',opponent_id=p.id,challenger_roll=r1,opponent_roll=r2,winner_id=w,resolved_at=now() where id=c.id;
  insert into public.gamble_log(user_id,game,stake,payout) values
    (c.challenger_id,'wuerfel',c.stake,case when w=c.challenger_id then pot else 0 end),
    (p.id,'wuerfel',c.stake,case when w=p.id then pot else 0 end);
  perform public.kiez_notify(c.challenger_id,'zocken','🎲 '||public.kiez_name(p.id)||' hat dein Würfelduell angenommen: du '||r1||', er/sie '||r2||' – '
    ||case when w=c.challenger_id then 'gewonnen! +'||to_char(pot,'FM999990.00')||' €' else 'verloren.' end);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('my_roll',r2,'their_roll',r1,'win',w=p.id,'pot',pot,'profile',to_jsonb(p));
end $function$;

create or replace function public.dice_cancel(challenge bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; c public.dice_challenges;
begin
  p := public.kiez_actor();
  select * into c from public.dice_challenges where id=challenge and challenger_id=p.id for update;
  if c.id is null or c.status<>'open' then raise exception 'Das Duell ist nicht mehr offen'; end if;
  update public.dice_challenges set status='cancelled',resolved_at=now() where id=c.id;
  perform public.kiez_pay(p.id,c.stake);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('refund',c.stake,'profile',to_jsonb(p));
end $function$;

-- ---------- Kiez-Geschichte (Aufgabenkette) ----------
create table if not exists public.quest_defs(
  step integer primary key, title text not null, story text not null, task text not null,
  stat text not null, goal numeric not null,
  reward_money numeric(12,2) not null default 0, reward_xp integer not null default 0, reward_caps integer not null default 0);
insert into public.quest_defs(step,title,story,task,stat,goal,reward_money,reward_xp,reward_caps) values
 (1,'Neu im Kiez','Du stehst mit einer leeren Plastiktüte am Bahnhof. Der alte Kalle nickt dir zu: „Pfand liegt überall, Junge. Du musst nur hinschauen.“','Sammle 20 Pfandflaschen','bottles_total',20,2,20,0),
 (2,'Ein bisschen schlauer','Kalle meint, wer im Kiez überleben will, muss dazulernen.','Erreiche Level 2','level',2,3,30,0),
 (3,'Fäuste hoch','Ein Typ hat dir gestern die Tüte weggenommen. Das passiert dir nicht nochmal.','Bring Angriff auf Stufe 3','attack_skill',3,5,30,1),
 (4,'Ein treuer Freund','Allein ist es kalt auf der Straße. Ein Tier an deiner Seite wärmt und bringt Mitleid beim Schnorren.','Kauf dir einen Begleiter','pets',1,5,40,0),
 (5,'Die erste Schelle','Im Hinterhof wird geprügelt. Zeig, dass mit dir zu rechnen ist.','Gewinne einen Kampf','wins',1,8,50,2),
 (6,'Der Flaschenblick','Du erkennst Pfand jetzt schon am Klirren.','Sammle insgesamt 250 Pfandflaschen','bottles_total',250,10,60,0),
 (7,'Dickes Fell','Wer austeilt, muss auch einstecken können.','Bring Verteidigung auf Stufe 5','defense_skill',5,10,60,1),
 (8,'Zusammen stark','Kalle erzählt von Banden, die ganze Stadtteile beherrschen.','Tritt einer Bande bei oder gründe eine','in_gang',1,15,80,3),
 (9,'Freunde im Kiez','Ein Kumpel hält dir den Rücken frei.','Schließe eine Freundschaft','friends',1,10,60,0),
 (10,'Schatzsucher','Zwischen den Flaschen liegt manchmal echter Plunder.','Finde 3 verschiedene Plunderstücke','plunder_kinds',3,20,100,2),
 (11,'Neue Reviere','In besseren Gegenden gibt es mehr zu holen.','Schalte Sammelgebiet 3 frei','area_level',3,25,120,0),
 (12,'Hinterhof-Legende','Man flüstert deinen Namen in den Gassen.','Gewinne 25 Kämpfe','wins',25,40,200,5),
 (13,'Aufsteiger','Die Neuen fragen dich schon um Rat.','Erreiche Level 10','level',10,50,250,3),
 (14,'Krumme Dinger','Ehrlich währt am längsten – aber nicht im Kiez.','Begehe 5 erfolgreiche Verbrechen','crimes',5,50,250,3),
 (15,'Ein eigenes Dach','Schluss mit Pappkarton. Du willst ein richtiges Zuhause.','Erreiche Unterkunft Stufe 5','shelter_level',5,100,400,10),
 (16,'Pfandbaron','Die Pfandautomaten zittern, wenn du kommst.','Sammle insgesamt 5.000 Pfandflaschen','bottles_total',5000,150,600,10),
 (17,'Kiezgröße','Kalle lacht: „Aus dir ist was geworden.“ Der Kiez gehört bald dir.','Erreiche Level 25','level',25,250,1000,20)
on conflict (step) do nothing;

create or replace function public.quest_status()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; q public.quest_defs; val numeric; total int;
begin
  p := public.kiez_actor();
  select count(*) into total from public.quest_defs;
  select * into q from public.quest_defs where step=p.quest_step;
  if q.step is null then return jsonb_build_object('finished',true,'total',total,'step',p.quest_step); end if;
  val := coalesce((public.kiez_stats(p)->>q.stat)::numeric,0);
  return jsonb_build_object('finished',false,'total',total,'step',q.step,'quest',to_jsonb(q),'value',val,'done',val>=q.goal);
end $function$;

create or replace function public.claim_quest()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; q public.quest_defs; val numeric; paid numeric;
begin
  p := public.kiez_actor();
  select * into q from public.quest_defs where step=p.quest_step;
  if q.step is null then raise exception 'Du hast die Kiez-Geschichte schon durchgespielt'; end if;
  val := coalesce((public.kiez_stats(p)->>q.stat)::numeric,0);
  if val < q.goal then raise exception 'Noch nicht geschafft: %', q.task; end if;
  paid := public.kiez_pay(p.id,q.reward_money);
  update public.profiles set quest_step=quest_step+1, xp=xp+q.reward_xp, bottlecaps=bottlecaps+q.reward_caps where id=p.id returning * into p;
  perform public.kiez_notify(p.id,'quest','📜 Kapitel „'||q.title||'“ geschafft: +'||to_char(q.reward_money,'FM999990.00')||' €, +'||q.reward_xp||' Punkte'
    ||case when q.reward_caps>0 then ', +'||q.reward_caps||' Kronkorken' else '' end);
  return jsonb_build_object('title',q.title,'money',q.reward_money,'xp',q.reward_xp,'caps',q.reward_caps,'profile',to_jsonb(p));
end $function$;

-- ---------- Kiez-Chat ----------
create table if not exists public.chat_messages(
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now());
create index if not exists chat_messages_idx on public.chat_messages(created_at desc);

create or replace function public.post_chat(message_body text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; b text := btrim(coalesce(message_body,'')); mid bigint;
begin
  p := public.kiez_actor();
  if char_length(b) < 1 then raise exception 'Schreib erst etwas'; end if;
  if char_length(b) > 300 then raise exception 'Höchstens 300 Zeichen'; end if;
  if exists(select 1 from public.chat_messages where user_id=p.id and created_at>now()-interval '5 seconds') then
    raise exception 'Nicht so schnell – warte ein paar Sekunden';
  end if;
  insert into public.chat_messages(user_id,body) values(p.id,b) returning id into mid;
  return jsonb_build_object('id',mid);
end $function$;

create or replace function public.delete_chat(message_id bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles;
begin
  p := public.kiez_actor();
  delete from public.chat_messages where id=message_id and (user_id=p.id or p.is_admin);
  if not found then raise exception 'Nachricht nicht gefunden'; end if;
  return jsonb_build_object('deleted',message_id);
end $function$;

-- ---------- Titel aus Erfolgen ----------
create or replace function public.set_title(achievement text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; nm text;
begin
  p := public.kiez_actor();
  if achievement is null or achievement='' then
    update public.profiles set title=null where id=p.id returning * into p;
    return jsonb_build_object('title',null,'profile',to_jsonb(p));
  end if;
  select d.name into nm from public.achievement_defs d join public.user_achievements u on u.achievement_id=d.id and u.user_id=p.id where d.id=achievement;
  if nm is null then raise exception 'Diesen Erfolg hast du noch nicht'; end if;
  update public.profiles set title=nm where id=p.id returning * into p;
  return jsonb_build_object('title',nm,'profile',to_jsonb(p));
end $function$;

-- ---------- Kampfprotokoll ----------
create or replace function public.fight_history()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  return jsonb_build_object(
    'fights',coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select f.created_at, f.attacker_id=me as i_attacked, f.winner_id=me as won, f.loot,
             f.attacker_power, f.defender_power,
             case when f.attacker_id=me then f.defender_id else f.attacker_id end as opponent_id,
             public.kiez_name(case when f.attacker_id=me then f.defender_id else f.attacker_id end) as opponent
      from public.fights f where f.attacker_id=me or f.defender_id=me order by f.created_at desc limit 30) x),'[]'::jsonb),
    'stats',(select jsonb_build_object(
      'attacks',count(*) filter (where attacker_id=me),
      'attack_wins',count(*) filter (where attacker_id=me and winner_id=me),
      'defenses',count(*) filter (where defender_id=me),
      'defense_wins',count(*) filter (where defender_id=me and winner_id=me),
      'loot_won',coalesce(sum(loot) filter (where winner_id=me),0),
      'loot_lost',coalesce(sum(loot) filter (where winner_id<>me),0))
     from public.fights where attacker_id=me or defender_id=me));
end $function$;

-- ---------- Leserechte (Supabase vergibt sie hier nicht automatisch) ----------
alter table public.districts enable row level security;
alter table public.district_influence enable row level security;
alter table public.district_owners enable row level security;
alter table public.district_weeks_done enable row level security;
alter table public.market_listings enable row level security;
alter table public.gamble_log enable row level security;
alter table public.dice_challenges enable row level security;
alter table public.quest_defs enable row level security;
alter table public.chat_messages enable row level security;
drop policy if exists "districts public" on public.districts;
create policy "districts public" on public.districts for select using (true);
drop policy if exists "influence public" on public.district_influence;
create policy "influence public" on public.district_influence for select using (true);
drop policy if exists "owners public" on public.district_owners;
create policy "owners public" on public.district_owners for select using (true);
drop policy if exists "market public" on public.market_listings;
create policy "market public" on public.market_listings for select using (true);
drop policy if exists "own gamble" on public.gamble_log;
create policy "own gamble" on public.gamble_log for select using (user_id = auth.uid());
drop policy if exists "dice public" on public.dice_challenges;
create policy "dice public" on public.dice_challenges for select using (true);
drop policy if exists "quests public" on public.quest_defs;
create policy "quests public" on public.quest_defs for select using (true);
drop policy if exists "chat public" on public.chat_messages;
create policy "chat public" on public.chat_messages for select using (auth.uid() is not null);
grant select on public.districts, public.district_influence, public.district_owners, public.market_listings,
  public.gamble_log, public.dice_challenges, public.quest_defs, public.chat_messages to authenticated;
revoke insert, update, delete, truncate on public.districts, public.district_influence, public.district_owners,
  public.district_weeks_done, public.market_listings, public.gamble_log, public.dice_challenges, public.quest_defs,
  public.chat_messages from anon, authenticated;
