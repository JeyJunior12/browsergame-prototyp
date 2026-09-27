-- ROADMAP 184: Geldsenke für Spieler mit viel Geld (Gelegenheitsspieler hatten nach 1 Jahr ~124.000 € ohne Verwendung).
-- Protz-Rahmen und -Titelfarben für Euro statt Kronkorken – reiner Angeber-Kram, kein Spielvorteil. Bezahlt wird aus Tasche und Schließfach.
alter table public.cosmetics add column if not exists price_money numeric(14,2) not null default 0;
insert into public.cosmetics(id,kind,name,value,price_caps,sort_order,price_money) values
  ('frame_neon','frame','Neonrahmen (Kiosk-Leuchtreklame)','#ff3fb4',0,20,5000),
  ('frame_chrom','frame','Chromrahmen (Radkappe)','#d9e4ea',0,21,25000),
  ('frame_diamant','frame','Diamantrahmen (echt Glas)','#9ff3ff',0,22,100000),
  ('frame_kiezkoenig','frame','Rahmen des Kiezkönigs','#ffd700',0,23,1000000),
  ('tc_neon','titlecolor','Titel in Neonpink','#ff3fb4',0,30,2000),
  ('tc_chrom','titlecolor','Titel in Chrom','#d9e4ea',0,31,15000),
  ('tc_diamant','titlecolor','Titel in Diamantblau','#9ff3ff',0,32,75000)
on conflict (id) do nothing;

create or replace function public.buy_cosmetic(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; c public.cosmetics; from_bank numeric := 0;
begin
  p := public.kiez_actor();
  select * into c from public.cosmetics where id=wanted; if c.id is null then raise exception 'Gibt es nicht'; end if;
  if exists(select 1 from public.user_cosmetics where user_id=p.id and cosmetic_id=wanted) then raise exception 'Hast du schon'; end if;
  if c.price_money > 0 then
    if p.money + p.bank_balance < c.price_money then raise exception 'Dafür brauchst du % € (Tasche und Schließfach zusammen)', to_char(c.price_money,'FM999G999G990D00'); end if;
    from_bank := greatest(0, c.price_money - p.money);
    update public.profiles set money=money-(c.price_money-from_bank), bank_balance=bank_balance-from_bank where id=p.id;
  else
    if p.bottlecaps < c.price_caps then raise exception 'Dafür brauchst du % Kronkorken', c.price_caps; end if;
    update public.profiles set bottlecaps=bottlecaps-c.price_caps where id=p.id;
  end if;
  insert into public.user_cosmetics(user_id,cosmetic_id) values(p.id,wanted);
  select * into p from public.profiles where id=p.id;
  return jsonb_build_object('bought',c.name,'price_money',c.price_money,'from_bank',from_bank,'profile',to_jsonb(p));
end $function$;
