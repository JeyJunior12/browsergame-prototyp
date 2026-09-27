-- 0023: Banden II (ROADMAP 99–104, 12, 51): Bandenforum mit Ankündigungen und Umfragen, Bandenprofil mit Wappen,
-- feinere Rechte, Auszahlungen und Beiträge, Mitgliederübersicht mit Anstupsen, wöchentlicher Bandenboss, Banden-Saison.

-- ---------- 100: Bandenprofil ----------
alter table public.gangs add column if not exists motto text not null default '';
alter table public.gangs add column if not exists crest text not null default 'flasche' check (crest in ('flasche','faust','krone','taube','anker','stern','ratte','schluessel'));
alter table public.gangs add column if not exists color text not null default '#9b3c1f' check (color ~ '^#[0-9a-fA-F]{6}$');
alter table public.gangs add column if not exists min_level integer not null default 1 check (min_level between 1 and 150);
alter table public.gangs add column if not exists weekly_dues numeric(12,2) not null default 0 check (weekly_dues between 0 and 1000);
alter table public.gangs add column if not exists frame text check (frame in ('gold','silber','bronze'));
alter table public.gangs add column if not exists frame_season text;

create or replace function public.update_gang_look(new_motto text, new_crest text, new_color text, new_min_level integer, open_for_all boolean, dues numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; g public.gangs; mo text := btrim(coalesce(new_motto,''));
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('co');
  if char_length(mo) > 80 then raise exception 'Motto höchstens 80 Zeichen'; end if;
  update public.gangs set motto=public.kiez_clean_text(mo), crest=coalesce(new_crest,crest), color=coalesce(new_color,color),
    min_level=greatest(1,least(150,coalesce(new_min_level,min_level))), is_open=coalesce(open_for_all,is_open),
    weekly_dues=round(greatest(0,least(1000,coalesce(dues,weekly_dues))),2)
  where id=m.gang_id returning * into g;
  perform public.kiez_gang_log(g.id,p.id,'profil',0,'hat das Bandenprofil geändert');
  return to_jsonb(g);
end $function$;

-- ---------- 101: Feinere Rechte ----------
create table if not exists public.gang_rights(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  right_name text not null check (right_name in ('invite','payout','build','war','raid','announce')),
  min_role text not null check (min_role in ('member','officer','co','owner')),
  primary key(gang_id, right_name));
alter table public.gang_rights enable row level security;
drop policy if exists gang_rights_read on public.gang_rights;
create policy gang_rights_read on public.gang_rights for select using (true);
grant select on public.gang_rights to authenticated;

create or replace function public.kiez_gang_right_role(gid uuid, r text)
returns text language sql stable security definer set search_path to 'public' as $$
  select coalesce((select min_role from public.gang_rights where gang_id=gid and right_name=r),
    case r when 'invite' then 'officer' when 'raid' then 'officer' when 'announce' then 'co' else 'co' end)
$$;

create or replace function public.kiez_gang_can(r text)
returns public.gang_members language plpgsql security definer set search_path to 'public' as $function$
declare m public.gang_members; need text; rank_of jsonb := '{"member":1,"officer":2,"co":3,"owner":4}';
begin
  select * into m from public.gang_members where user_id=auth.uid();
  if m.gang_id is null then raise exception 'Du bist in keiner Bande'; end if;
  need := public.kiez_gang_right_role(m.gang_id, r);
  if (rank_of->>m.role)::int < (rank_of->>need)::int then raise exception 'Dafür reicht dein Rang in der Bande nicht'; end if;
  return m;
end $function$;

create or replace function public.set_gang_right(r text, role_needed text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m public.gang_members;
begin
  perform public.kiez_actor();
  m := public.kiez_my_gang('owner');
  if r not in ('invite','payout','build','war','raid','announce') then raise exception 'Unbekanntes Recht'; end if;
  if role_needed not in ('member','officer','co','owner') then raise exception 'Unbekannter Rang'; end if;
  if r = 'payout' and role_needed in ('member','officer') then raise exception 'Auszahlen dürfen höchstens Vize und Chef'; end if;
  insert into public.gang_rights(gang_id,right_name,min_role) values(m.gang_id,r,role_needed)
  on conflict (gang_id,right_name) do update set min_role=excluded.min_role;
  perform public.kiez_gang_log(m.gang_id,auth.uid(),'rechte',0,'Recht „'||r||'“ ab Rang '||role_needed);
  return jsonb_build_object('right',r,'role',role_needed);
end $function$;

-- Auszahlung aus der Kasse an ein Mitglied (mit Protokoll und Grund)
create or replace function public.gang_payout(target_id uuid, amount numeric, reason text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; amt numeric(12,2) := round(coalesce(amount,0),2); g public.gangs; why text := btrim(coalesce(reason,''));
begin
  p := public.kiez_actor();
  m := public.kiez_gang_can('payout');
  if amt <= 0 then raise exception 'Betrag ungültig'; end if;
  if char_length(why) < 3 or char_length(why) > 120 then raise exception 'Gib einen Grund an (3–120 Zeichen)'; end if;
  if not exists(select 1 from public.gang_members where gang_id=m.gang_id and user_id=target_id) then raise exception 'Nur an Mitglieder der Bande'; end if;
  select * into g from public.gangs where id=m.gang_id for update;
  if g.balance < amt then raise exception 'So viel ist nicht in der Kasse'; end if;
  if (select coalesce(sum(-l.amount),0) from public.gang_log l where l.gang_id=g.id and l.kind='payout' and l.created_at>now()-interval '1 day') + amt > greatest(100, g.balance*0.5) then
    raise exception 'Pro Tag höchstens die Hälfte der Kasse (mind. 100 €) auszahlen'; end if;
  update public.gangs set balance=balance-amt where id=g.id;
  perform public.kiez_pay(target_id, amt);
  perform public.kiez_gang_log(g.id,p.id,'payout',-amt,'zahlt '||public.kiez_name(target_id)||' '||to_char(amt,'FM999990.00')||' € aus: '||public.kiez_clean_text(why));
  perform public.kiez_notify(target_id,'bande','Du hast '||to_char(amt,'FM999990.00')||' € aus der Bandenkasse bekommen: '||public.kiez_clean_text(why));
  return jsonb_build_object('paid',amt);
end $function$;

-- ---------- 102/51: Mitgliederübersicht, Anstupsen ----------
create table if not exists public.gang_pokes(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now());
create index if not exists gang_pokes_to on public.gang_pokes(to_id, created_at desc);
alter table public.gang_pokes enable row level security;
revoke all on public.gang_pokes from anon, authenticated;

create or replace function public.gang_members_overview()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m public.gang_members; wk date := public.kiez_week(current_date); dues numeric;
begin
  m := public.kiez_my_gang('member');
  select weekly_dues into dues from public.gangs where id=m.gang_id;
  return jsonb_build_object('dues',dues,'members',coalesce((select jsonb_agg(jsonb_build_object(
      'user_id',x.user_id,'name',p.username,'role',x.role,'level',p.level,'last_active',p.energy_updated_at,
      'status',case when p.energy_updated_at > now()-interval '1 day' then 'aktiv' when p.energy_updated_at > now()-interval '7 days' then 'selten' else 'inaktiv' end,
      'bottles',coalesce(c.bottles,0),'wins',coalesce(c.wins,0),'donated',coalesce(c.donated,0),
      'dues_paid',coalesce(c.donated,0) >= dues,
      'poked',exists(select 1 from public.gang_pokes k where k.to_id=x.user_id and k.created_at>now()-interval '12 hours'))
    order by (case x.role when 'owner' then 4 when 'co' then 3 when 'officer' then 2 else 1 end) desc, p.username)
    from public.gang_members x join public.profiles p on p.id=x.user_id
    left join public.gang_task_contrib c on c.gang_id=x.gang_id and c.week_start=wk and c.user_id=x.user_id
    where x.gang_id=m.gang_id),'[]'::jsonb));
end $function$;

create or replace function public.gang_poke(target_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('member');
  if target_id = p.id then raise exception 'Dich selbst anstupsen bringt nichts'; end if;
  if not exists(select 1 from public.gang_members where gang_id=m.gang_id and user_id=target_id) then raise exception 'Nur Mitglieder deiner Bande'; end if;
  if exists(select 1 from public.gang_pokes where to_id=target_id and created_at>now()-interval '12 hours') then raise exception 'Wurde in den letzten 12 Stunden schon angestupst'; end if;
  insert into public.gang_pokes(gang_id,from_id,to_id) values(m.gang_id,p.id,target_id);
  perform public.kiez_notify(target_id,'bande',p.username||' stupst dich an: Deine Bande braucht dich – die Wochenziele warten!');
  return jsonb_build_object('poked',target_id);
end $function$;

-- ---------- 99/12: Bandenforum ----------
create table if not exists public.gang_topics(
  id bigint generated by default as identity primary key,
  gang_id uuid not null references public.gangs(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null, announce boolean not null default false,
  poll_options text[], created_at timestamptz not null default now(), last_post_at timestamptz not null default now());
create table if not exists public.gang_posts(
  id bigint generated by default as identity primary key,
  topic_id bigint not null references public.gang_topics(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null, created_at timestamptz not null default now());
create table if not exists public.gang_poll_votes(
  topic_id bigint not null references public.gang_topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option integer not null, primary key(topic_id, user_id));
alter table public.gang_topics enable row level security;
alter table public.gang_posts enable row level security;
alter table public.gang_poll_votes enable row level security;
drop policy if exists gang_topics_members on public.gang_topics;
create policy gang_topics_members on public.gang_topics for select using (exists(select 1 from public.gang_members m where m.gang_id=gang_topics.gang_id and m.user_id=auth.uid()));
drop policy if exists gang_posts_members on public.gang_posts;
create policy gang_posts_members on public.gang_posts for select using (exists(select 1 from public.gang_topics t join public.gang_members m on m.gang_id=t.gang_id where t.id=gang_posts.topic_id and m.user_id=auth.uid()));
drop policy if exists gang_poll_votes_members on public.gang_poll_votes;
create policy gang_poll_votes_members on public.gang_poll_votes for select using (exists(select 1 from public.gang_topics t join public.gang_members m on m.gang_id=t.gang_id where t.id=gang_poll_votes.topic_id and m.user_id=auth.uid()));
grant select on public.gang_topics, public.gang_posts, public.gang_poll_votes to authenticated;

create or replace function public.gang_topic_create(title text, body text, announce boolean default false, options text[] default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; t text := btrim(coalesce(title,'')); b text := btrim(coalesce(body,'')); tid bigint; opts text[];
begin
  p := public.kiez_actor();
  m := case when coalesce(announce,false) then public.kiez_gang_can('announce') else public.kiez_my_gang('member') end;
  if char_length(t) not between 3 and 80 then raise exception 'Titel 3 bis 80 Zeichen'; end if;
  if char_length(b) not between 1 and 2000 then raise exception 'Text 1 bis 2000 Zeichen'; end if;
  if (select count(*) from public.gang_topics where author_id=p.id and created_at>now()-interval '10 minutes') >= 3 then raise exception 'Nicht so schnell – warte ein paar Minuten'; end if;
  if options is not null then
    select array_agg(public.kiez_clean_text(left(btrim(o),60))) into opts from unnest(options) o where btrim(o)<>'';
    if coalesce(array_length(opts,1),0) not between 2 and 6 then raise exception 'Eine Umfrage braucht 2 bis 6 Antworten'; end if;
  end if;
  insert into public.gang_topics(gang_id,author_id,title,announce,poll_options) values(m.gang_id,p.id,public.kiez_clean_text(t),coalesce(announce,false),opts) returning id into tid;
  insert into public.gang_posts(topic_id,author_id,body) values(tid,p.id,public.kiez_clean_text(b));
  return jsonb_build_object('id',tid);
end $function$;

create or replace function public.gang_post(topic bigint, body text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; b text := btrim(coalesce(body,'')); pid bigint;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('member');
  if not exists(select 1 from public.gang_topics where id=topic and gang_id=m.gang_id) then raise exception 'Thema nicht gefunden'; end if;
  if char_length(b) not between 1 and 2000 then raise exception 'Text 1 bis 2000 Zeichen'; end if;
  if exists(select 1 from public.gang_posts where author_id=p.id and created_at>now()-interval '10 seconds') then raise exception 'Nicht so schnell – warte kurz'; end if;
  insert into public.gang_posts(topic_id,author_id,body) values(topic,p.id,public.kiez_clean_text(b)) returning id into pid;
  update public.gang_topics set last_post_at=now() where id=topic;
  return jsonb_build_object('id',pid);
end $function$;

create or replace function public.gang_vote(topic bigint, choice integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m public.gang_members; t public.gang_topics;
begin
  perform public.kiez_actor();
  m := public.kiez_my_gang('member');
  select * into t from public.gang_topics where id=topic and gang_id=m.gang_id;
  if t.id is null or t.poll_options is null then raise exception 'Hier gibt es keine Umfrage'; end if;
  if choice < 1 or choice > array_length(t.poll_options,1) then raise exception 'Ungültige Antwort'; end if;
  insert into public.gang_poll_votes(topic_id,user_id,option) values(topic,auth.uid(),choice)
  on conflict (topic_id,user_id) do update set option=excluded.option;
  return jsonb_build_object('voted',choice);
end $function$;

create or replace function public.gang_topic_delete(topic bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m public.gang_members; t public.gang_topics;
begin
  perform public.kiez_actor();
  m := public.kiez_my_gang('member');
  select * into t from public.gang_topics where id=topic and gang_id=m.gang_id;
  if t.id is null then raise exception 'Thema nicht gefunden'; end if;
  if t.author_id <> auth.uid() and m.role not in ('owner','co') then raise exception 'Nur der Verfasser oder die Bandenführung'; end if;
  delete from public.gang_topics where id=topic;
  return jsonb_build_object('deleted',topic);
end $function$;

create or replace function public.gang_forum()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare m public.gang_members;
begin
  select * into m from public.gang_members where user_id=auth.uid();
  if m.gang_id is null then raise exception 'Du bist in keiner Bande'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'announce',t.announce,'poll',t.poll_options is not null,
      'author',public.kiez_name(t.author_id),'author_id',t.author_id,'last_post_at',t.last_post_at,
      'posts',(select count(*) from public.gang_posts x where x.topic_id=t.id)) order by t.announce desc, t.last_post_at desc)
    from public.gang_topics t where t.gang_id=m.gang_id),'[]'::jsonb);
end $function$;

create or replace function public.gang_topic(topic bigint)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare m public.gang_members; t public.gang_topics;
begin
  select * into m from public.gang_members where user_id=auth.uid();
  select * into t from public.gang_topics where id=topic and gang_id=m.gang_id;
  if t.id is null then raise exception 'Thema nicht gefunden'; end if;
  return jsonb_build_object('id',t.id,'title',t.title,'announce',t.announce,'author_id',t.author_id,
    'options',t.poll_options,
    'votes',case when t.poll_options is null then null else (select jsonb_agg((select count(*) from public.gang_poll_votes v where v.topic_id=t.id and v.option=i)) from generate_series(1,array_length(t.poll_options,1)) i) end,
    'my_vote',(select option from public.gang_poll_votes where topic_id=t.id and user_id=auth.uid()),
    'posts',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'author',public.kiez_name(x.author_id),'author_id',x.author_id,'body',x.body,'created_at',x.created_at) order by x.created_at)
      from public.gang_posts x where x.topic_id=t.id),'[]'::jsonb));
end $function$;

-- ---------- 103: Bandenboss ----------
create table if not exists public.gang_boss(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  week_start date not null,
  name text not null, max_hp integer not null, hp integer not null, defeated_at timestamptz,
  primary key(gang_id, week_start));
create table if not exists public.gang_boss_hits(
  gang_id uuid not null references public.gangs(id) on delete cascade,
  week_start date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  damage integer not null default 0, hits integer not null default 0, last_hit_at timestamptz,
  primary key(gang_id, week_start, user_id));
alter table public.gang_boss enable row level security;
alter table public.gang_boss_hits enable row level security;
drop policy if exists gang_boss_read on public.gang_boss;
create policy gang_boss_read on public.gang_boss for select using (true);
drop policy if exists gang_boss_hits_read on public.gang_boss_hits;
create policy gang_boss_hits_read on public.gang_boss_hits for select using (true);
grant select on public.gang_boss, public.gang_boss_hits to authenticated;

create or replace function public.kiez_gang_boss_ensure(gid uuid)
returns public.gang_boss language plpgsql security definer set search_path to 'public' as $function$
declare b public.gang_boss; wk date := public.kiez_week(current_date); n int; lvl int; names text[] := array['Der Pfandkönig','Türsteher Olaf','Die Taubenmafia','Kiosk-Kalle','Der Hausmeister','Ratten-Rudi'];
begin
  select * into b from public.gang_boss where gang_id=gid and week_start=wk;
  if b.gang_id is not null then return b; end if;
  n := greatest(2,(select count(*) from public.gang_members where gang_id=gid));
  lvl := coalesce((select level from public.gangs where id=gid),1);
  insert into public.gang_boss(gang_id,week_start,name,max_hp,hp) values(gid,wk,names[1+(extract(week from wk)::int % 6)],(300*n*(1+lvl*0.25))::int,(300*n*(1+lvl*0.25))::int)
  on conflict do nothing;
  select * into b from public.gang_boss where gang_id=gid and week_start=wk;
  return b;
end $function$;

-- Einmal pro Stunde zuschlagen (10 Energie); Schaden nach Angriffskraft
create or replace function public.gang_boss_hit()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; b public.gang_boss; wk date := public.kiez_week(current_date); dmg int; h public.gang_boss_hits; x record;
begin
  p := public.kiez_actor();
  m := public.kiez_my_gang('member');
  b := public.kiez_gang_boss_ensure(m.gang_id);
  select * into b from public.gang_boss where gang_id=m.gang_id and week_start=wk for update;
  if b.defeated_at is not null then raise exception 'Der Boss liegt schon am Boden – nächste Woche kommt ein neuer'; end if;
  select * into h from public.gang_boss_hits where gang_id=m.gang_id and week_start=wk and user_id=p.id;
  if h.last_hit_at > now()-interval '1 hour' then raise exception 'Du kannst erst in % Min. wieder zuschlagen', ceil(extract(epoch from (h.last_hit_at+interval '1 hour'-now()))/60); end if;
  if p.energy < 10 then raise exception 'Du brauchst 10 Energie'; end if;
  dmg := greatest(1, round(public.kiez_attack_power(p)*(0.8+random()*0.4)))::int;
  update public.profiles set energy=energy-10 where id=p.id returning * into p;
  insert into public.gang_boss_hits(gang_id,week_start,user_id,damage,hits,last_hit_at) values(m.gang_id,wk,p.id,dmg,1,now())
  on conflict (gang_id,week_start,user_id) do update set damage=gang_boss_hits.damage+dmg, hits=gang_boss_hits.hits+1, last_hit_at=now();
  update public.gang_boss set hp=greatest(0,hp-dmg), defeated_at=case when hp-dmg<=0 then now() end where gang_id=m.gang_id and week_start=wk returning * into b;
  if b.defeated_at is not null then
    for x in select user_id from public.gang_boss_hits where gang_id=m.gang_id and week_start=wk loop
      update public.profiles set bottlecaps=bottlecaps+10, xp=xp+200 where id=x.user_id;
      perform public.kiez_notify(x.user_id,'bande','Bandenboss „'||b.name||'“ besiegt! +10 Kronkorken und +200 Punkte.');
    end loop;
    perform public.kiez_gang_xp(m.gang_id,800,'Bandenboss');
    perform public.kiez_gang_log(m.gang_id,p.id,'boss',0,'hat den Bandenboss „'||b.name||'“ erledigt');
  end if;
  return jsonb_build_object('damage',dmg,'hp',b.hp,'max_hp',b.max_hp,'defeated',b.defeated_at is not null,'profile',to_jsonb(p));
end $function$;

create or replace function public.gang_boss_status()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m public.gang_members; b public.gang_boss; wk date := public.kiez_week(current_date);
begin
  m := public.kiez_my_gang('member');
  b := public.kiez_gang_boss_ensure(m.gang_id);
  return jsonb_build_object('name',b.name,'hp',b.hp,'max_hp',b.max_hp,'defeated',b.defeated_at is not null,'week_ends',wk+7,
    'next_hit_at',(select last_hit_at+interval '1 hour' from public.gang_boss_hits where gang_id=m.gang_id and week_start=wk and user_id=auth.uid() and last_hit_at>now()-interval '1 hour'),
    'hits',coalesce((select jsonb_agg(jsonb_build_object('name',public.kiez_name(user_id),'user_id',user_id,'damage',damage,'hits',hits) order by damage desc)
      from public.gang_boss_hits where gang_id=m.gang_id and week_start=wk),'[]'::jsonb));
end $function$;

-- ---------- 104: Banden-Saison (Kalendermonat) ----------
create table if not exists public.gang_seasons(
  season text not null, gang_id uuid not null references public.gangs(id) on delete cascade,
  points bigint not null default 0, paid boolean not null default false,
  primary key(season, gang_id));
alter table public.gang_seasons enable row level security;
drop policy if exists gang_seasons_read on public.gang_seasons;
create policy gang_seasons_read on public.gang_seasons for select using (true);
grant select on public.gang_seasons to authenticated;

-- Vergangene Saisons auszahlen: Platz 1–3 → Wappen-Rahmen Gold/Silber/Bronze, Mitglieder 50/30/15 Kronkorken
create or replace function public.resolve_gang_seasons()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare s text; r record; n int := 0; caps int[] := array[50,30,15]; frames text[] := array['gold','silber','bronze']; x record;
begin
  for s in select distinct season from public.gang_seasons where season < to_char(now(),'YYYY-MM') and not paid order by 1 loop
    for r in select gang_id, row_number() over (order by points desc) rk from public.gang_seasons where season=s and points>0 order by points desc limit 3 loop
      update public.gangs set frame=frames[r.rk], frame_season=s where id=r.gang_id;
      for x in select user_id from public.gang_members where gang_id=r.gang_id loop
        update public.profiles set bottlecaps=bottlecaps+caps[r.rk] where id=x.user_id;
        perform public.kiez_notify(x.user_id,'bande','Banden-Saison '||s||': Platz '||r.rk||'! +'||caps[r.rk]||' Kronkorken und ein '||initcap(frames[r.rk])||'-Rahmen fürs Wappen.');
      end loop;
      n := n+1;
    end loop;
    update public.gang_seasons set paid=true where season=s;
  end loop;
  return n;
end $function$;
revoke execute on function public.resolve_gang_seasons() from public, anon, authenticated;

create or replace function public.gang_season_ranking()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
begin
  perform public.resolve_gang_seasons();
  return jsonb_build_object('season',to_char(now(),'YYYY-MM'),
    'ends',(date_trunc('month',now())+interval '1 month')::date,
    'ranking',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'crest',g.crest,'color',g.color,'frame',g.frame,'points',s.points) order by s.points desc)
      from (select * from public.gang_seasons where season=to_char(now(),'YYYY-MM') order by points desc limit 20) s join public.gangs g on g.id=s.gang_id),'[]'::jsonb));
end $function$;

-- Öffentliches Bandenprofil mit Erfolgen
create or replace function public.gang_public(gid uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare g public.gangs;
begin
  select * into g from public.gangs where id=gid;
  if g.id is null then raise exception 'Bande unbekannt'; end if;
  return jsonb_build_object('id',g.id,'name',g.name,'motto',g.motto,'crest',g.crest,'color',g.color,'frame',g.frame,'frame_season',g.frame_season,
    'level',g.level,'min_level',g.min_level,'is_open',g.is_open,'members',(select count(*) from public.gang_members where gang_id=g.id),
    'war_wins',g.war_wins,'war_losses',g.war_losses,
    'bosses',(select count(*) from public.gang_boss where gang_id=g.id and defeated_at is not null),
    'tasks_done',(select count(*) from public.gang_week_tasks where gang_id=g.id and done_at is not null),
    'districts',(select count(*) from public.district_owners where gang_id=g.id));
end $function$;
create or replace function public.gang_invite(target_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members;
begin
  p := public.kiez_actor();
  m := public.kiez_gang_can('invite');
  if not exists(select 1 from public.profiles where id=target_id and not is_banned) then raise exception 'Spieler unbekannt'; end if;
  if exists(select 1 from public.gang_members where user_id=target_id) then raise exception 'Der Spieler ist schon in einer Bande'; end if;
  -- Bewerbung liegt vor -> direkt aufnehmen
  if exists(select 1 from public.gang_requests where gang_id=m.gang_id and user_id=target_id and kind='apply') then
    perform public.kiez_join(m.gang_id,target_id);
    return jsonb_build_object('status','joined');
  end if;
  insert into public.gang_requests(gang_id,user_id,kind,created_by) values(m.gang_id,target_id,'invite',p.id)
  on conflict (gang_id,user_id) do nothing;
  if not found then raise exception 'Der Spieler ist schon eingeladen'; end if;
  perform public.kiez_gang_log(m.gang_id,p.id,'invite',0,'hat '||(select username from public.profiles where id=target_id)||' eingeladen');
  return jsonb_build_object('status','invited');
end $function$;

create or replace function public.upgrade_gang(kind text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; g public.gangs; cost numeric; lvl int;
begin
  p := public.kiez_actor();
  m := public.kiez_gang_can('build');
  select * into g from public.gangs where id=m.gang_id for update;
  if kind='attack' then lvl:=g.attack_level; elsif kind='defense' then lvl:=g.defense_level; else raise exception 'Ungültiger Ausbau'; end if;
  if lvl>=10 then raise exception 'Bereits maximal ausgebaut'; end if;
  cost := 50*power(lvl+1,2);
  if g.balance<cost then raise exception 'Zu wenig in der Bandenkasse (% € nötig)', cost; end if;
  if kind='attack' then update public.gangs set balance=balance-cost,attack_level=attack_level+1 where id=g.id returning * into g;
  else update public.gangs set balance=balance-cost,defense_level=defense_level+1 where id=g.id returning * into g; end if;
  perform public.kiez_gang_log(g.id,p.id,'upgrade',-cost,case kind when 'attack' then 'Angriff' else 'Verteidigung' end||' auf Stufe '||(lvl+1));
  return to_jsonb(g);
end $function$;

create or replace function public.build_gang_room(r text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; g public.gangs; cur int; cost numeric; need int;
begin
  p := public.kiez_actor();
  m := public.kiez_gang_can('build');
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

create or replace function public.start_gang_raid(target_gang uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; r public.gang_raids; nm text; mm record;
begin
  p := public.kiez_actor();
  m := public.kiez_gang_can('raid');
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

create or replace function public.declare_gang_war(target_gang uuid, stake numeric)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; m public.gang_members; g public.gangs; st numeric(12,2) := round(coalesce(stake,0),2); w public.gang_wars; mm record;
begin
  p := public.kiez_actor();
  m := public.kiez_gang_can('war');
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

create or replace function public.kiez_gang_xp(gid uuid, amount bigint, why text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare old_l int; new_l int; m record; nm text;
begin
  if gid is null or amount <= 0 then return; end if;
  select level, name into old_l, nm from public.gangs where id=gid for update;
  update public.gangs set xp=xp+amount, level=public.kiez_gang_level(xp+amount) where id=gid returning level into new_l;
  insert into public.gang_seasons(season,gang_id,points) values(to_char(now(),'YYYY-MM'),gid,amount)
  on conflict (season,gang_id) do update set points=gang_seasons.points+excluded.points;
  if new_l > old_l then
    insert into public.gang_log(gang_id,user_id,kind,amount,info) values(gid,null,'level',0,'Bandenlevel '||new_l||' erreicht ('||why||')');
    for m in select user_id from public.gang_members where gang_id=gid loop
      perform public.kiez_notify(m.user_id,'bande','Deine Bande „'||nm||'“ ist jetzt Level '||new_l||' – mehr Plätze und neue Räume im Bandenhaus!');
    end loop;
  end if;
end $function$;

create or replace function public.kiez_join(gid uuid, uid uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if exists(select 1 from public.gang_members where user_id=uid) then raise exception 'Schon in einer Bande'; end if;
  if (select count(*) from public.gang_members where gang_id=gid) >= public.kiez_gang_slots(gid) then
    raise exception 'Die Bande ist voll (% Plätze) – mit höherem Bandenlevel gibt es mehr', public.kiez_gang_slots(gid); end if;
  if (select level from public.profiles where id=uid) < (select min_level from public.gangs where id=gid) then
    raise exception 'Diese Bande nimmt erst ab Level % auf', (select min_level from public.gangs where id=gid); end if;
  insert into public.gang_members(gang_id,user_id,role) values(gid,uid,'member');
  delete from public.gang_requests where user_id=uid;
  perform public.kiez_gang_log(gid,uid,'join',0,'ist beigetreten');
end $function$;
