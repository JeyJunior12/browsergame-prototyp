-- 0007: Spielkonto des Betreibers (vom Nutzer bestaetigt) wird Admin
update public.profiles set is_admin = true where username = 'BehaarteUhse';
