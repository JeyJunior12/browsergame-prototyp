-- Durchspiel-Test (ROADMAP 207): Verteidigungs-Katalog war unstimmig – „Handvoll Sand“ 1.000 € für +1, „Wegweiser“ 10 € für +12,
-- „Vergiftetes Bier“ 2.400 € für 5 Minuten; drei Stücke hießen „+Geschick“, zählten aber als Verteidigung.
-- Neu: alles ist Verteidigung, Preis nach Punkten und Dauer (bis zum nächsten Angriff ≈ 50–120 € je Punkt, auf Zeit günstiger).
update public.defense_items d set price = v.price, amount = v.amount, duration_type = v.dt, duration_minutes = v.mins, kind = 'defense'
from (values
  ('sand',            50.00,  1, 'until_attack', null::int),
  ('salt',           120.00,  2, 'until_attack', null),
  ('itchpowder',     200.00,  3, 'until_attack', null),
  ('signpost',       300.00,  4, 'until_attack', null),
  ('playdead',       400.00,  5, 'until_attack', null),
  ('fishnet',        700.00,  7, 'until_attack', null),
  ('barbwire',       850.00,  8, 'until_attack', null),
  ('moat',          1000.00,  9, 'until_attack', null),
  ('pitfall',       1300.00, 11, 'until_attack', null),
  ('snaretrap',     1450.00, 12, 'until_attack', null),
  ('cats',           150.00,  6, 'fixed',  60),
  ('poisonbeer',     300.00, 10, 'fixed',  60),
  ('bananas',        150.00,  3, 'fixed', 360),
  ('mirror',         350.00,  6, 'fixed', 180),
  ('disguise',       350.00,  6, 'fixed', 240),
  ('electricfence',  800.00, 10, 'fixed', 360),
  ('turret',        1400.00, 15, 'fixed', 360)
) as v(id, price, amount, dt, mins)
where d.id = v.id;
-- Reihenfolge im Laden: erst „bis zum Angriff“, dann „auf Zeit“, jeweils nach Preis
update public.defense_items d set sort_order = s.rn
from (select id, row_number() over (order by duration_type = 'fixed', price) rn from public.defense_items) s where s.id = d.id;
