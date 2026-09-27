-- Nutzer-Screenshot: „Einbruch geklappt! +0,00 €“ – Gewinne wurden auf den freien Platz im Geldbehälter gekappt, der Rest verfiel.
-- Neu: Was nicht in den Geldbehälter passt, landet automatisch im Schließfach (wie kiez_pay), nichts verfällt mehr.

create or replace function public.kiez_money_overflow() returns trigger language plpgsql as $$
begin
  if new.money > new.cash_capacity then
    new.bank_balance := coalesce(new.bank_balance,0) + (new.money - new.cash_capacity);
    new.money := new.cash_capacity;
  end if;
  return new;
end $$;
drop trigger if exists profiles_money_overflow on public.profiles;
-- nur bei Auszahlungen aus Spielaktionen (die setzen kiez.overflow), nicht bei Admin-/Test-Änderungen
create trigger profiles_money_overflow before update of money, cash_capacity on public.profiles
  for each row when (new.money > new.cash_capacity and current_setting('kiez.overflow', true) = '1') execute function public.kiez_money_overflow();

-- Die Kappung aus allen Auszahlungen entfernen (Diebstahl-Beute beim Kampf bleibt begrenzt)
do $$
declare f text; src text; neu text;
begin
  foreach f in array array['beg_at_spot','buy_scratch_ticket','check_achievements','claim_daily_mission','claim_daily_reward',
    'collect_music_income','commit_crime','do_side_action','sell_bottles','sell_item','sell_plunder','sell_plunder_duplicates'] loop
    select pg_get_functiondef(p.oid) into src from pg_proc p where p.proname=f and p.pronamespace='public'::regnamespace;
    neu := regexp_replace(src, 'least\(\s*([^,()]+(?:\([^()]*\))?[^,()]*?)\s*,\s*greatest\(\s*0\s*,\s*(?:p\.)?cash_capacity\s*-\s*(?:\((?:p\.)?money\s*-\s*10\)|(?:p\.)?money)\s*\)\s*\)', '\1', 'g');
    if neu = src then raise exception 'Kappung in % nicht gefunden', f; end if;
    -- Überlauf ins Schließfach für diese Aktion einschalten (gilt nur in der laufenden Transaktion)
    neu := regexp_replace(neu, '\mbegin\M', 'begin perform set_config(''kiez.overflow'',''1'',true);', 'i');
    execute neu;
  end loop;
end $$;
