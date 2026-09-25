#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser '<img src=x onerror=alert(1)>'); B=$(newuser 'Kalle'); C=$(newuser 'kalle')
has "Boeser Name wird ersetzt" "$(as_user $A "select username from profiles where id=auth.uid()")" "Kiezkind_"
ok  "Normaler Name bleibt" "$(as_user $B "select username from profiles where id=auth.uid()")" "Kalle"
has "Doppelter Name wird ersetzt" "$(as_user $C "select username from profiles where id=auth.uid()")" "Kiezkind_"
$P -tAc "update profiles set money=100000, cash_capacity=1000000"
has "Pfandsack nicht mehr kaufbar" "$(as_user $A "select buy_upgrade('bag')")" "nicht (mehr) kaufbar"
has "Geschick nicht mehr kaufbar" "$(as_user $A "select buy_upgrade('streetwise')")" "nicht (mehr) kaufbar"
ok  "Geldbehaelter geht weiter" "$(as_user $A "select (buy_upgrade('container'))->>'label'")" "Große Tüte"
as_user $A "update profiles set cleanliness=10 where id=auth.uid()" >/dev/null
has "Waschanlage ohne Kauf gesperrt" "$(as_user $A "select wash_up('waschanlage')")" "Waschanlage kaufen"
ok  "Katzenwaesche geht" "$(as_user $A "select (wash_up())->>'gain'")" "35"
as_user $A "select buy_progress('wash'); select buy_progress('wash')" >/dev/null
ok  "Waschanlage nach Kauf" "$(as_user $A "update profiles set cleanliness=10 where id=auth.uid(); select (wash_up('waschanlage'))->>'gain'" | tail -1)" "100"
PET=$($P -tAc "select id from pet_catalog order by price limit 1")
as_user $A "update profiles set social_skill=45 where id=auth.uid()" >/dev/null
as_user $A "select buy_pet('$PET')" >/dev/null
has "Tier nicht doppelt kaufbar" "$(as_user $A "select buy_pet('$PET')")" "hast du schon"
as_user $A "update profiles set level=50 where id=auth.uid(); select buy_item('street_sign'); select buy_item('winter_coat'); select buy_item('whistle'); select equip_item('street_sign'); select equip_item('winter_coat'); select equip_item('whistle')" >/dev/null
ok  "Waffe+Schutz+Zubehoer gleichzeitig" "$(as_user $A "select count(*) from inventory where user_id=auth.uid() and equipped")" "3"
as_user $A "select buy_item('hammer'); select equip_item('hammer')" >/dev/null
ok  "Neue Waffe ersetzt alte Waffe" "$(as_user $A "select string_agg(item_id,',' order by item_id) from inventory where user_id=auth.uid() and equipped")" "hammer,whistle,winter_coat"
has "Boeser Bandenname abgelehnt" "$(as_user $B "select create_gang('<script>x</script>')")" "Bandenname"
ok  "Bande gruenden geht" "$(as_user $B "select (create_gang('Kiezritter'))->>'name'")" "Kiezritter"
has "Bandenname eindeutig" "$(as_user $C "select create_gang('kiezritter')")" "gibt es schon"
has "Leere Meldung abgelehnt" "$(as_user $B "select report_player('$A','')")" "3 bis 300"
as_user $B "select report_player('$A','Beleidigt andere')" >/dev/null
has "Doppelte Meldung abgelehnt" "$(as_user $B "select report_player('$A','nochmal')")" "bereits gemeldet"
ok  "Angriff funktioniert weiter" "$(as_user $B "update profiles set energy=100, xp=12250 where id=auth.uid(); select (attack_player('$A'))->>'opponent' is not null")" "t"
exit ${FAILED:-0}
