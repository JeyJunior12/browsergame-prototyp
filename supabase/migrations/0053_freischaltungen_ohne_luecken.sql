-- Nutzerwunsch: bis Level 100 regelmäßig etwas Neues, ohne große Lücken (ROADMAP 211).
-- Vorher ab Level 46 nur alle 4–8 Level ein Stück, Lücken 78→82 und 95→100. Jetzt: späte Waffen, Kleidung, Zubehör und Begleiter
-- abwechselnd verteilt, eins pro Level; Level mit Fahrzeug/Job/Verbrechen (50, 55, 70, 90) bleiben dafür frei → höchstens 1 Level ohne Neues.
-- Reihenfolge je Kategorie und Preise bleiben.
update public.shop_items s set required_level = v.lvl from (values
  ('feuerwehrjacke', 46),
  ('baseballschlaeger', 48),
  ('sperrmuell_drohne', 49),
  ('vorschlaghammer', 51),
  ('gebrauchte_schutzweste', 52),
  ('akku_stirnlampe', 54),
  ('kettensaege_ohne_kette', 56),
  ('bundeswehrparka', 58),
  ('stuhlbein_nunchakus', 60),
  ('waermebildkamera', 61),
  ('eishockeyschlaeger', 63),
  ('chemieschutzanzug', 65),
  ('einkaufswagen_rammbock', 68),
  ('motor_sackkarre', 69),
  ('stichschutzweste', 71),
  ('laubblaeser_kanone', 72),
  ('ghettoblaster', 74),
  ('streusalz_schleuder', 77),
  ('imkeranzug_verstaerkt', 78),
  ('kiez_funknetz', 80),
  ('gabelstaplergabel', 81),
  ('stahl_lastenanhaenger', 83),
  ('kampfmittelanzug', 85),
  ('notstromaggregat', 88),
  ('abrissbirne', 89),
  ('theaterruestung', 91),
  ('kiez_alarmanlage', 92),
  ('feuerwehraxt', 94),
  ('kiezkoenig_siegelring', 95),
  ('kiez_panzermantel', 97),
  ('kiezkoenig_zepter', 98)
) as v(id, lvl) where s.id = v.id;
update public.pet_catalog p set required_level = v.lvl from (values
  ('wolf', 57),
  ('bear', 66),
  ('lion', 75),
  ('gorilla', 86),
  ('elephant', 100)
) as v(id, lvl) where p.id = v.id;
