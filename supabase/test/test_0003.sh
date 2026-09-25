#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Sozi_A'); B=$(newuser 'Sozi_B'); C=$(newuser 'Sozi_C')
$P -tAc "update profiles set money=50, cash_capacity=1000 where id in ('$A','$B','$C')"

# Bio
ok  "Bio speichern" "$(as_user $A "select (update_bio('Ich sammle Pfand','Immer weiter'))->>'motto'")" "Immer weiter"
has "Bio zu lang" "$(as_user $A "select update_bio(repeat('x',1001),'')")" "1000 Zeichen"

# Freunde
ok  "Anfrage senden" "$(as_user $A "select (friend_request('$B'))->>'status'")" "pending"
has "Doppelte Anfrage" "$(as_user $A "select friend_request('$B')")" "schon"
ok  "Annehmen" "$(as_user $B "select (friend_respond('$A',true))->>'status'")" "accepted"
ok  "Gegenanfrage = befreundet" "$(as_user $C "select friend_request('$A')" >/dev/null; as_user $A "select (friend_request('$C'))->>'status'")" "accepted"
ok  "Freundesliste" "$(as_user $A "select count(*) from friendships where status='accepted' and (user_id=auth.uid() or friend_id=auth.uid())")" "2"

# Blockieren
as_user $B "select block_player('$C',true)" >/dev/null
has "Blockiert: keine Post" "$(as_user $C "select send_player_message('$B','hallo')")" "keine Post"
has "Blockiert: kein Gaestebuch" "$(as_user $C "select write_guestbook('$B','hallo')")" "geht bei diesem"
as_user $B "select block_player('$C',false)" >/dev/null
has "Entblockt: Post geht" "$(as_user $C "select send_player_message('$B','hallo')")" "id"

# Gaestebuch
E=$(as_user $A "select (write_guestbook('$B','Schöner Pfandsack!'))->>'id'")
has "Eintrag geschrieben" "$E" "[0-9]"
has "Spam-Sperre" "$(as_user $A "select write_guestbook('$B','nochmal')")" "warte"
has "Fremder darf nicht loeschen" "$(as_user $C "select delete_guestbook_entry($E)")" "nicht gefunden"
ok  "Besitzer loescht" "$(as_user $B "select (delete_guestbook_entry($E))->>'deleted'")" "$E"

# Spendenlink
AMT=$(as_user $A "select (donate_link('sozi_b'))->>'amount'")
has "Spende angekommen" "$AMT" "0\.[0-9]"
has "Nur einmal pro Tag" "$(as_user $A "select donate_link('Sozi_B')")" "heute schon"
has "Nicht an sich selbst" "$(as_user $B "select donate_link('Sozi_B')")" "selbst"
ok  "Anonyme Spende" "$($P -tAc "set request.headers='{\"x-forwarded-for\":\"1.1.1.1, 9.9.9.9\"}'; select (donate_link('Sozi_B'))->>'name'" | grep -v SET)" "Sozi_B"
has "Anonym nur einmal (gefaelschte erste IP hilft nicht)" "$($P -tAc "set request.headers='{\"x-forwarded-for\":\"6.6.6.6, 9.9.9.9\"}'; select donate_link('Sozi_B')" 2>&1)" "heute schon"
ok  "Spenden gezaehlt" "$($P -tAc "select donations_received from profiles where id='$B'")" "2"

# Plunder
ok  "Zufallsplunder existiert" "$($P -tAc "select count(*) from plunder_catalog where id=(select kiez_random_plunder())")" "1"
$P -tAc "select kiez_give_plunder('$A','goldene_dose'); select kiez_give_plunder('$A','goldene_dose')" >/dev/null
has "Fremden Plunder anlegen" "$(as_user $B "select equip_plunder('goldene_dose')")" "hast du nicht"
ok  "Plunder anlegen" "$(as_user $A "select (equip_plunder('goldene_dose'))->>'equipped_plunder'")" "goldene_dose"
ok  "Plunder verkaufen" "$(as_user $A "select (sell_plunder('goldene_dose',1))->>'paid'")" "40.00"
has "Angelegten letzten nicht verkaufen" "$(as_user $A "select sell_plunder('goldene_dose',1)")" "erst ab"

# Pfandtour mit Kronkorken / Plunder / Wetter
$P -tAc "update profiles set collection_minutes=480, collection_started_at=now()-interval '8 hours', collection_ends_at=now()-interval '1 second' where id='$C'"
R=$(as_user $C "select (finish_collection())->'weather'->>'id'")
has "Tour liefert Wetter" "$R" "[a-z]"

# Kronkorken-Laden
$P -tAc "update profiles set bottlecaps=20, energy=10, energy_updated_at=now() where id='$C'"
ok  "Energie fuer Kronkorken" "$(as_user $C "select (bottlecap_shop('energie'))->'profile'->>'energy'")" "60"
has "Plunderkiste" "$(as_user $C "select (bottlecap_shop('plunderkiste'))->>'message'")" "In der Kiste"
has "Zu wenig Kronkorken" "$(as_user $C "select bottlecap_shop('knast')")" "brauchst du 8"

# Tagesbelohnung gibt Kronkorken
ok  "Tagesbelohnung Kronkorken" "$(as_user $A "select (claim_daily_reward())->>'bottlecaps'")" "1"

# Umzug kostet
$P -tAc "update profiles set social_skill=10, money=10 where id='$A'"
has "Umzug zu teuer" "$(as_user $A "select move_in_house()")" "kostet"
$P -tAc "update profiles set money=100 where id='$A'"
ok  "Umzug bezahlt" "$(as_user $A "select (move_in_house())->>'shelter_level'")" "2"

# Kein Angriff auf eigene Bande
$P -tAc "update profiles set money=100, energy=100 where id in ('$A','$B')"
G=$(as_user $A "select (create_gang('Testbande'))->>'id'")
as_user $B "select join_gang('$G')" >/dev/null
$P -tAc "delete from gang_members where user_id='$B'; insert into gang_members(gang_id,user_id) values('$G','$B')"
has "Nicht eigene Bande angreifen" "$(as_user $A "select attack_player('$B')")" "eigenen Bande"
exit ${FAILED:-0}
