-- ROADMAP 154/155: Nebenjobs lohnten sich nicht (z. B. Messehelfer 8 Std. = 32 € bei Level 30, eine Pfandtour bringt dort ~600 €).
-- Neu: Lohn ≈ 30 % dessen, was eine Pfandtour in derselben Zeit auf Mindestlevel bringt (läuft ja parallel) + Texte im Kiez-Ton.
create or replace function public.kiez_jobs()
returns table(id text, name text, minutes integer, pay numeric, energy integer, min_level integer, description text, vehicle_tier integer) language sql immutable as $$
  values ('flyer','Flyer verteilen',20,1.20,5,1,'Zettel für Ali’s Dönerbude in jeden Briefkasten. Den Rest in den Container – merkt keiner.',0),
         ('spuelen','Teller spülen',60,4.50,10,3,'Hinterm Imbiss, Hände bis zum Ellenbogen im Fettwasser. Die Reste darfst du behalten.',0),
         ('umzug','Umzugshelfer',120,15.00,20,8,'Schrankwand in den vierten Stock, ohne Aufzug. Trinkgeld gibt’s in Kästen Bier.',0),
         ('nachtwache','Nachtwache am Bauzaun',240,45.00,15,15,'Aufpassen, dass keiner den Bagger klaut. Pennen im Dixi ist nicht erlaubt, aber bequem.',0),
         ('messe','Messehelfer',480,190.00,25,30,'Stände aufbauen, Schnittchen abstauben, in der Pause auf dem Ausstellungssofa pennen.',0),
         ('kurier','Kurierfahrten',90,55.00,10,40,'Päckchen quer durch die Stadt. Was drin ist, willst du nicht wissen.',4),
         ('umzugsfahrer','Umzugsfahrer',180,120.00,15,55,'Mit dem Kombi Möbel schaukeln. Was nicht mehr reinpasst, bleibt bei dir.',5),
         ('sperrmuell','Sperrmüll-Tour',240,180.00,20,70,'Transporter voll, Wertstoffhof leer. Die Hälfte landet auf deiner Platte.',6)
$$;
