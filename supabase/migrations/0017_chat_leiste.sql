-- 0017: Chat-Leiste (ROADMAP Platz 1, 125–134): Privatgespräche wie im Messenger, Wortfilter, Live-Updates,
-- Empfängersuche per Name, Nachrichten melden.

-- ---------- Wortfilter für grobe Beleidigungen (Wörter werden durch *** ersetzt) ----------
create table if not exists public.bad_words(word text primary key);
insert into public.bad_words(word) values
 ('arschloch'),('wichser'),('hurensohn'),('fotze'),('missgeburt'),('spast'),('spasti'),('schlampe'),('nutte'),('bastard'),
 ('vollidiot'),('kanake'),('neger'),('schwuchtel'),('behindert'),('fick dich'),('ficker'),('hure')
on conflict do nothing;
alter table public.bad_words enable row level security;
revoke all on public.bad_words from anon, authenticated;

create or replace function public.kiez_clean_text(t text)
returns text language plpgsql stable security definer set search_path to 'public' as $function$
declare w text; r text := t;
begin
  for w in select word from public.bad_words order by length(word) desc loop
    r := regexp_replace(r, '(?i)' || regexp_replace(w, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g'), repeat('*', greatest(3, length(w))), 'g');
  end loop;
  return r;
end $function$;
revoke execute on function public.kiez_clean_text(text) from public, anon, authenticated;

-- ALL-Chat: gleiche Regeln wie 0015, zusätzlich Wortfilter und Blockier-Schutz beim Lesen (im Client)
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
  insert into public.chat_messages(user_id,body) values(p.id,public.kiez_clean_text(b)) returning id into mid;
  return jsonb_build_object('id',mid);
end $function$;

-- Privatnachricht: Wortfilter ergänzt, sonst wie 0003
create or replace function public.send_player_message(target_id uuid, message_body text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; mid bigint; clean text := trim(coalesce(message_body,''));
begin
  p := public.kiez_actor();
  if target_id is null then raise exception 'Kein Empfänger gewählt'; end if;
  if target_id=p.id then raise exception 'Selbstgespräche zählen nicht als soziale Funktion'; end if;
  if char_length(clean) not between 1 and 500 then raise exception 'Nachricht muss 1 bis 500 Zeichen haben'; end if;
  if not exists(select 1 from public.profiles where id=target_id) then raise exception 'Empfänger unbekannt'; end if;
  if public.kiez_blocked(p.id,target_id) then raise exception 'Dieser Spieler möchte keine Post von dir'; end if;
  if (select count(*) from public.messages where sender_id=p.id and created_at>now()-interval '1 minute')>=5 then
    raise exception 'Zu viele Nachrichten – warte eine Minute'; end if;
  insert into public.messages(sender_id,recipient_id,body) values(p.id,target_id,public.kiez_clean_text(clean)) returning id into mid;
  return jsonb_build_object('id',mid);
end $function$;

-- ---------- Gespräche ----------
-- Liste aller Gesprächspartner mit letzter Nachricht und ungelesenen Nachrichten
create or replace function public.chat_conversations()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  return coalesce((select jsonb_agg(x order by x.last_at desc) from (
    select partner, public.kiez_name(partner) as name,
           max(created_at) as last_at,
           (array_agg(body order by created_at desc))[1] as last_body,
           (array_agg(sender_id=me order by created_at desc))[1] as last_mine,
           count(*) filter (where recipient_id=me and read_at is null) as unread
    from (select case when sender_id=me then recipient_id else sender_id end as partner, created_at, body, sender_id, recipient_id, read_at
          from public.messages where sender_id=me or recipient_id=me) m
    where not public.kiez_blocked(me, partner)
    group by partner order by max(created_at) desc limit 50) x), '[]'::jsonb);
end $function$;

-- Verlauf mit einem Spieler (neueste 60), markiert empfangene als gelesen
create or replace function public.chat_thread(partner uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  update public.messages set read_at=now() where recipient_id=me and sender_id=partner and read_at is null;
  return jsonb_build_object('partner',partner,'name',public.kiez_name(partner),'blocked',public.kiez_blocked(me,partner),
    'messages',coalesce((select jsonb_agg(x order by x.created_at) from (
      select id, sender_id=me as mine, body, created_at, read_at from public.messages
      where (sender_id=me and recipient_id=partner) or (sender_id=partner and recipient_id=me)
      order by created_at desc limit 60) x),'[]'::jsonb));
end $function$;

-- Empfänger per Name finden (Vorschläge beim Tippen): Freunde und Bande zuerst, eigener Name nie
create or replace function public.find_players(q text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); s text := replace(replace(replace(btrim(coalesce(q,'')),'\',''),'%',''),'_','\_'); myg uuid;
begin
  if me is null then raise exception 'Nicht angemeldet'; end if;
  select gang_id into myg from public.gang_members where user_id=me;
  return coalesce((select jsonb_agg(x) from (
    select p.id, p.username, p.level,
      exists(select 1 from public.friendships f where f.status='accepted' and ((f.user_id=me and f.friend_id=p.id) or (f.friend_id=me and f.user_id=p.id))) as friend,
      (myg is not null and exists(select 1 from public.gang_members g where g.user_id=p.id and g.gang_id=myg)) as gang
    from public.profiles p
    where p.id<>me and not p.is_banned and not public.kiez_blocked(me,p.id)
      and (s='' and (exists(select 1 from public.friendships f where f.status='accepted' and ((f.user_id=me and f.friend_id=p.id) or (f.friend_id=me and f.user_id=p.id)))
                     or (myg is not null and exists(select 1 from public.gang_members g where g.user_id=p.id and g.gang_id=myg)))
           or s<>'' and p.username ilike s||'%')
    order by 4 desc, 5 desc, p.username limit 12) x),'[]'::jsonb);
end $function$;

-- Chat-Nachricht melden (landet bei der Kiezaufsicht wie eine Spielermeldung)
create or replace function public.report_chat(message_id bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare m public.chat_messages;
begin
  select * into m from public.chat_messages where id=message_id;
  if m.id is null then raise exception 'Nachricht nicht gefunden'; end if;
  if m.user_id=auth.uid() then raise exception 'Eigene Nachrichten kannst du nicht melden'; end if;
  return public.report_player(m.user_id, 'Kiez-Chat: „'||left(m.body,200)||'“');
end $function$;

-- ---------- Live-Updates (Supabase Realtime), nur wenn die Veröffentlichung existiert ----------
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='chat_messages') then
      execute 'alter publication supabase_realtime add table public.chat_messages';
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='messages') then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;
  end if;
end $$;
