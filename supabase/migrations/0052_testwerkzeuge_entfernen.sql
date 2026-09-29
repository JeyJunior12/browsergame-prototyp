-- Durchspiel-Test abgeschlossen (Level 100 erreicht). Nur die Test-Werkzeuge entfernen – Testkonten und ALLE ihre Daten bleiben
-- (Nutzer will den Stand in der Rangliste sehen). is_tester bleibt als Markierung.
drop function if exists public.tester_skip_time(integer);
drop function if exists public.tester_money_log(integer);
drop table if exists public.tester_skip_cols;
