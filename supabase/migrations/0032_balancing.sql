-- S18 Balancing (ROADMAP 86–92): Stufenleiter bis Level 150, Ausreißer korrigiert.
-- Leitwerte (siehe BALANCING.md): Waffe Angriff ≈ 1,35×Level, Kleidung Verteidigung ≈ 1,27×Level,
-- Zubehör ≈ 0,5/0,6×Level; Preis ≈ 1,2×Level² (Zubehör 1,0×Level²).

-- 1) Neue Stücke für Level 30–150 (vorher endete alles bei Level 35)
insert into public.shop_items(id,name,description,price,attack,defense,required_level,category) values
  ('brechstange','Brechstange','Öffnet Türen, Kisten und Diskussionen.',2000,54,3,40,'waffen'),
  ('baseballschlaeger','Baseballschläger','Nie ein Spiel gesehen, aber gut in Form.',2650,62,4,46,'waffen'),
  ('vorschlaghammer','Vorschlaghammer','Vom Abrissplatz „geliehen“.',3400,70,4,52,'waffen'),
  ('kettensaege_ohne_kette','Kettensäge ohne Kette','Macht nur Lärm – das reicht meistens.',4500,81,5,60,'waffen'),
  ('stuhlbein_nunchakus','Stuhlbein-Nunchakus','Zwei Stuhlbeine, eine Fahrradkette, viel Übung.',5800,92,6,68,'waffen'),
  ('eishockeyschlaeger','Eishockeyschläger','Mit Klebeband verstärkt.',7200,103,6,76,'waffen'),
  ('einkaufswagen_rammbock','Einkaufswagen-Rammbock','Vorne ein Brett, hinten Anlauf.',9050,115,7,85,'waffen'),
  ('laubblaeser_kanone','Laubbläser-Kanone','Schießt Kastanien mit Wucht.',11300,128,8,95,'waffen'),
  ('streusalz_schleuder','Streusalz-Schleuder','Brennt in den Augen, rutscht unter den Füßen.',13800,142,9,105,'waffen'),
  ('gabelstaplergabel','Gabelstaplergabel','Zu zweit tragen, allein zuschlagen.',16800,157,10,116,'waffen'),
  ('abrissbirne','Mini-Abrissbirne','Eine Bowlingkugel an einer Kette.',20500,173,11,128,'waffen'),
  ('feuerwehraxt','Feuerwehraxt','Hing hinter Glas. Jetzt nicht mehr.',24500,189,12,140,'waffen'),
  ('kiezkoenig_zepter','Stählernes Kiezkönig-Zepter','Wer das trägt, muss nichts mehr beweisen.',28100,202,12,150,'waffen'),
  ('flohmarkt_lederjacke','Flohmarkt-Lederjacke','Riecht nach Rock ’n’ Roll und Keller.',1080,2,38,30,'kleidung'),
  ('motorradkombi','Motorradkombi','Ohne Motorrad, aber mit Protektoren.',1730,3,48,38,'kleidung'),
  ('feuerwehrjacke','Alte Feuerwehrjacke','Hält Hitze, Regen und Fäuste ab.',2650,3,60,47,'kleidung'),
  ('gebrauchte_schutzweste','Gebrauchte Schutzweste','Ein Loch hat sie schon. Aber nur eins.',3900,4,72,57,'kleidung'),
  ('bundeswehrparka','Bundeswehr-Parka','Hundert Taschen, alle voller Krümel.',5550,5,86,68,'kleidung'),
  ('chemieschutzanzug','Chemieschutzanzug','Gegen Gestank und Gegner.',7700,5,102,80,'kleidung'),
  ('stichschutzweste','Stichschutzweste','Vom Sicherheitsdienst ausgemustert.',10400,6,118,93,'kleidung'),
  ('imkeranzug_verstaerkt','Verstärkter Imkeranzug','Nichts sticht mehr durch.',13700,7,136,107,'kleidung'),
  ('kampfmittelanzug','Ausgemusterter Kampfmittelanzug','Schwer, heiß, fast unzerstörbar.',17600,8,154,121,'kleidung'),
  ('theaterruestung','Ritterrüstung aus dem Theaterfundus','Scheppert – aber hält.',21900,9,171,135,'kleidung'),
  ('kiez_panzermantel','Kiez-Panzermantel','Der Mantel, von dem der Kiez erzählt.',27000,10,190,150,'kleidung'),
  ('nachtsichtgeraet','Nachtsichtgerät','Findet Flaschen und Gegner im Dunkeln.',1440,19,23,38,'zubehoer'),
  ('sperrmuell_drohne','Sperrmüll-Drohne','Fliegt schief, sieht aber alles.',2300,24,29,48,'zubehoer'),
  ('akku_stirnlampe','Akku-Stirnlampe','Hände frei, Blick klar.',3600,30,36,60,'zubehoer'),
  ('waermebildkamera','Wärmebildkamera','Sieht, wer hinter der Ecke wartet.',5500,37,44,74,'zubehoer'),
  ('motor_sackkarre','Motorisierte Sackkarre','Brummt, schleppt, rammt.',8100,45,54,90,'zubehoer'),
  ('kiez_funknetz','Kiez-Funknetz','Drei Funkgeräte, ein Plan.',11700,54,65,108,'zubehoer'),
  ('notstromaggregat','Notstromaggregat','Licht, Strom und ein Hauch Macht.',16400,64,77,128,'zubehoer'),
  ('ghettoblaster','Ghettoblaster mit Bass','Übertönt jeden Streit – und jeden Gegner.',9800,50,59,99,'zubehoer'),
  ('stahl_lastenanhaenger','Stahl-Lastenanhänger','Trägt alles, schützt alles.',13900,59,71,118,'zubehoer'),
  ('kiez_alarmanlage','Selbstgebaute Alarmanlage','Heult, blinkt und schreckt ab.',19300,70,83,139,'zubehoer'),
  ('kiezkoenig_siegelring','Siegelring des Kiezkönigs','Ein Blick darauf genügt.',22500,75,90,150,'zubehoer')
on conflict (id) do update set name=excluded.name,description=excluded.description,price=excluded.price,attack=excluded.attack,
  defense=excluded.defense,required_level=excluded.required_level,category=excluded.category;

-- 2) Ausreißer im Laden
update public.shop_items set attack=10, defense=20 where id='cart_engine';  -- war schwächer als billigeres Solarpanel

-- Bastelsachen: waren ab Level 1 herstellbar, obwohl stärker als Ladenware für Level 20+
update public.shop_items s set required_level=v.lvl from (values
  ('holzschild',5),('nagelkeule',10),('stachelschild',10),('doppeltes_holzschild',12),('feiner_anzug',7),
  ('ramponierter_anzug',7),('kaputter_regenschirm',9),('glasstachelschild',16),('regenschirm',22)) v(id,lvl)
where s.id=v.id and s.category='craft';

-- 3) Begleiter: Ausreißer (Lebenspunkte 0/1, zu billig/zu schwach) + Stufenleiter bis Level 150
update public.pet_catalog set health=60 where id='pitbull';
update public.pet_catalog set health=14 where id='rat';
update public.pet_catalog set health=1 where id='cockroach';  -- Spaßtier für 1 Cent
update public.pet_catalog set health=5 where id='goldfish';
update public.pet_catalog set health=9 where id='pigeon';
update public.pet_catalog set price=1200, health=60 where id='trained_mouse';
update public.pet_catalog set attack=58, defense=50, health=45 where id='chihuahua';
update public.pet_catalog set attack=92, defense=76, health=50 where id='monkey';
update public.pet_catalog set attack=110, defense=70 where id='tiger';
insert into public.pet_catalog(id,name,description,price,attack,defense,required_level,health) values
  ('wolf','Wolf','Kommt nachts aus dem Stadtwald – und bleibt.',12600,135,110,60,50),
  ('bear','Bär','Brummt einmal, dann ist Ruhe im Kiez.',22400,170,160,80,55),
  ('lion','Löwe','Aus einem Wanderzirkus entlaufen.',35000,225,170,100,60),
  ('gorilla','Gorilla','Stark, klug und nachtragend.',55000,270,250,125,65),
  ('elephant','Elefant','Vergisst nie, wer ihm krumm kam.',79000,320,340,150,70)
on conflict (id) do update set price=excluded.price,attack=excluded.attack,defense=excluded.defense,required_level=excluded.required_level,health=excluded.health;

-- 4) Herstellen prüft jetzt Level (und nutzt kiez_actor wie alle neuen Aktionen)
create or replace function public.craft_item(wanted_item text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare p public.profiles; item public.shop_items; need_nails int; need_wood int; need_shards int; need_textile int;
begin
  p := public.kiez_actor();
  select * into item from public.shop_items where id=wanted_item and category='craft';
  if item.id is null then raise exception 'Das kannst du nicht herstellen'; end if;
  if p.level < item.required_level then raise exception 'Dafür brauchst du Level %', item.required_level; end if;
  case wanted_item
    when 'nagelkeule' then need_nails:=14;need_wood:=2;need_shards:=0;need_textile:=1;
    when 'holzschild' then need_nails:=2;need_wood:=8;need_shards:=0;need_textile:=1;
    when 'stachelschild' then need_nails:=26;need_wood:=10;need_shards:=0;need_textile:=1;
    when 'glasstachelschild' then need_nails:=38;need_wood:=24;need_shards:=18;need_textile:=0;
    when 'doppeltes_holzschild' then need_nails:=13;need_wood:=41;need_shards:=0;need_textile:=2;
    when 'ramponierter_anzug' then need_nails:=16;need_wood:=2;need_shards:=0;need_textile:=6;
    when 'feiner_anzug' then need_nails:=8;need_wood:=2;need_shards:=0;need_textile:=16;
    when 'kaputter_regenschirm' then need_nails:=11;need_wood:=6;need_shards:=0;need_textile:=8;
    when 'regenschirm' then need_nails:=14;need_wood:=12;need_shards:=0;need_textile:=19;
    else raise exception 'Unbekanntes Rezept';
  end case;
  if p.mat_nails<need_nails or p.mat_wood<need_wood or p.mat_shards<need_shards or p.mat_textile<need_textile then
    raise exception 'Dafür fehlen dir noch Materialien'; end if;
  if p.money<item.price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  update public.profiles set money=money-item.price, mat_nails=mat_nails-need_nails, mat_wood=mat_wood-need_wood,
    mat_shards=mat_shards-need_shards, mat_textile=mat_textile-need_textile where id=p.id returning * into p;
  insert into public.inventory(user_id,item_id,quantity) values(p.id,wanted_item,1)
    on conflict(user_id,item_id) do update set quantity=inventory.quantity+1;
  return jsonb_build_object('item',to_jsonb(item),'profile',to_jsonb(p));
end $$;

-- 5) Geldbehälter: Preis muss in den aktuellen Behälter passen (vorher 150 € bei 100 € Platz, 75.000 € bei 10.000 € Platz → unerreichbar)
create or replace function public.buy_upgrade(upgrade_type text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; price numeric(12,2); label text; newcap numeric(12,2);
begin
  if upgrade_type<>'container' then raise exception 'Dieser Ausbau ist nicht (mehr) kaufbar'; end if;
  p := public.kiez_actor();
  if p.container_level>=5 then raise exception 'Größerer Geldbehälter ist nicht mehr verfügbar'; end if;
  price := (array[20,95,900,9000])[p.container_level];
  label := (array['Große Tüte','Beutel','Einkaufswagen','Container'])[p.container_level];
  if p.money<price then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  newcap := (array[100,1000,10000,1000000])[p.container_level];
  update public.profiles set money=money-price,container_level=container_level+1,cash_capacity=newcap
  where id=p.id returning * into p;
  return jsonb_build_object('label',label,'price',price,'profile',to_jsonb(p));
end $function$;
