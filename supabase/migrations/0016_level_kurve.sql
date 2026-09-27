-- 0016: Level-Kurve wie bei Pennergame – schneller Einstieg, danach wird jedes Level zäher.
-- Punkte für Level L: 15 × (L−1)²   (Level 2: 15, Level 10: 1.215, Level 50: 36.015, Level 100: 147.015, Level 150: 333.015)
-- Vorher linear 250 Punkte je Level (Level 150 nach ~2 Monaten aktiv). Jetzt: aktiv ~1,5 Jahre, gelegentlich mehrere Jahre.
-- Bestehende Spieler behalten ihr Level (sync_level stuft nie herab) und steigen erst wieder auf, wenn die Kurve sie einholt.
create or replace function public.kiez_level(points integer)
returns integer language sql immutable as
$$ select least(150, 1 + floor(sqrt(greatest(0, coalesce(points,0)) / 15.0))::int) $$;

-- Punkte, ab denen ein Level erreicht ist (für Anzeigen)
create or replace function public.kiez_level_points(lvl integer)
returns integer language sql immutable as
$$ select 15 * (greatest(1, least(150, coalesce(lvl,1))) - 1) * (greatest(1, least(150, coalesce(lvl,1))) - 1) $$;

-- Alle Spieler sofort auf die neue Kurve heben (nie herabstufen)
update public.profiles set level = public.kiez_level(xp) where public.kiez_level(xp) > level;
