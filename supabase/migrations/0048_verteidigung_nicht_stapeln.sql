-- Durchspiel-Test (ROADMAP 206): Verteidigungs-Gegenstände „bis zum nächsten Angriff“ ließen sich beliebig oft kaufen
-- und addierten sich (Testkonto: 232 Fallen) → unangreifbar. Jetzt: jeder Gegenstand nur einmal gleichzeitig aktiv.

-- Aufräumen: pro Spieler und Gegenstand nur den neuesten aktiven Eintrag behalten
delete from public.user_active_defenses d
 using public.user_active_defenses n
 where d.user_id = n.user_id and d.item_id = n.item_id and d.id < n.id
   and (d.expires_at is null or d.expires_at > now()) and (n.expires_at is null or n.expires_at > now());

create or replace function pg_temp.patch(f text, pat text, rep text) returns void language plpgsql as $$
declare src text; neu text;
begin
  select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
  if src is null then raise exception 'Funktion % fehlt', f; end if;
  neu := regexp_replace(src, pat, rep, 'g');
  if neu = src then raise exception 'Muster in % nicht gefunden: %', f, pat; end if;
  execute neu;
end $$;

select pg_temp.patch('buy_defense_item', 'if p\.money<it\.price then',
  'if exists(select 1 from public.user_active_defenses where user_id=p.id and item_id=it.id and (expires_at is null or expires_at>now())) then raise exception ''% ist schon aktiv'', it.name; end if; if p.money<it.price then');
