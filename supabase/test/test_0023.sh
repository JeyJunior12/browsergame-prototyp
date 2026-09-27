#!/bin/bash
# 0023: Bandenforum/Umfragen, Profil/Wappen/Mindestlevel, Rechte/Auszahlung, Mitglieder/Anstupsen, Bandenboss, Saison
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Forum_A'); M=$(newuser 'Forum_M'); X=$(newuser 'Forum_X'); L=$(newuser 'Forum_Low')
Q "update profiles set money=5000, cash_capacity=100000, energy=100, level=10 where id in ('$A','$M','$X')" >/dev/null
G=$(as_user $A "select (create_gang('Forumsbande'))->>'id'"); Q "select kiez_join('$G','$M')" >/dev/null
# Forum
T=$(as_user $M "select (gang_topic_create('Treffpunkt','Wo treffen wir uns?'))->>'id'")
has "Antworten" "$(as_user $A "select gang_post($T,'Am Bahnhof')")" "id"
has "Ankündigung nur Führung" "$(as_user $M "select gang_topic_create('Wichtig','Alle herhören',true)")" "Rang"
U=$(as_user $A "select (gang_topic_create('Umfrage','Wohin?',true,array['Bahnhof','Park','Hafen']))->>'id'")
as_user $M "select gang_vote($U,2)" >/dev/null
ok  "Umfrage zählt" "$(as_user $A "select (gang_topic($U))->'votes'->>1")" "1"
ok  "Ankündigung oben" "$(as_user $M "select (gang_forum())->0->>'title'")" "Umfrage"
ok  "Fremde sehen nichts" "$(as_user $X "set role authenticated; select count(*) from gang_topics")" "0"
has "Fremde können nicht posten" "$(as_user $X "select gang_post($T,'hallo')")" "keiner Bande"
# Profil
has "Wappen/Farbe/Mindestlevel" "$(as_user $A "select update_gang_look('Pfand oder Tod','krone','#123abc',5,true,10)")" '"crest": "krone"'
Q "update profiles set level=2 where id='$L'" >/dev/null
has "Mindestlevel beim Beitritt" "$(as_user $L "select join_gang('$G')")" "ab Level 5"
has "Öffentliches Profil" "$(as_user $X "select gang_public('$G')")" "Pfand oder Tod"
# Rechte
has "Mitglied darf nicht einladen" "$(as_user $M "select gang_invite('$X')")" "Rang"
as_user $A "select set_gang_right('invite','member')" >/dev/null
has "Nach Rechte-Änderung schon" "$(as_user $M "select gang_invite('$X')")" "invited"
has "Auszahlen nie für Mitglieder" "$(as_user $A "select set_gang_right('payout','member')")" "höchstens Vize"
as_user $A "select donate_to_gang(400)" >/dev/null
ok  "Auszahlung an Mitglied" "$(as_user $A "select (gang_payout('$M',50,'Fahrtgeld'))->>'paid'")" "50.00"
has "Auszahlung im Protokoll" "$(Q "select info from gang_log where gang_id='$G' and kind='payout'")" "Fahrtgeld"
has "Grund nötig" "$(as_user $A "select gang_payout('$M',5,'')")" "Grund"
# Mitglieder und Anstupsen
ok  "Mitgliederübersicht" "$(as_user $M "select jsonb_array_length((gang_members_overview())->'members')")" "2"
ok  "Beitrag bezahlt (400 ≥ 10)" "$(as_user $A "select m->>'dues_paid' from jsonb_array_elements((gang_members_overview())->'members') m where m->>'user_id'='$A'")" "true"
has "Anstupsen" "$(as_user $A "select gang_poke('$M')")" "poked"
has "Nur alle 12 Std." "$(as_user $A "select gang_poke('$M')")" "12 Stunden"
has "Angestupster benachrichtigt" "$(Q "select body from notifications where user_id='$M' order by id desc limit 1")" "braucht dich"
# Boss
has "Boss erscheint" "$(as_user $A "select gang_boss_status()")" "max_hp"
has "Zuschlagen" "$(as_user $A "select gang_boss_hit()")" "damage"
has "Nur einmal pro Stunde" "$(as_user $A "select gang_boss_hit()")" "wieder zuschlagen"
Q "update gang_boss set hp=1 where gang_id='$G'" >/dev/null
ok  "Boss besiegt" "$(as_user $M "select (gang_boss_hit())->>'defeated'")" "true"
has "Belohnung für Beteiligte" "$(Q "select body from notifications where user_id='$A' order by id desc limit 1")" "besiegt"
# Saison
ok  "Saisonpunkte aus Erfahrung" "$(Q "select points>0 from gang_seasons where gang_id='$G'")" "t"
Q "insert into gang_seasons(season,gang_id,points) values('2000-01','$G',99)" >/dev/null
Q "select resolve_gang_seasons()" >/dev/null
ok  "Saisonsieger bekommt Gold-Rahmen" "$(Q "select frame||'/'||frame_season from gangs where id='$G'")" "gold/2000-01"
has "Saison-Rangliste" "$(as_user $X "select gang_season_ranking()")" "Forumsbande"
exit ${FAILED:-0}
