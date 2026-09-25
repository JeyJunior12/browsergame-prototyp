#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Boss_A'); B=$(newuser 'Mann_B'); C=$(newuser 'Mann_C'); D=$(newuser 'Boss_D'); E=$(newuser 'Mann_E')
$P -tAc "update profiles set money=1000, cash_capacity=100000, energy=100, xp=2500 where id in ('$A','$B','$C','$D','$E')"

G=$(as_user $A "select (create_gang('Pfandpiraten'))->>'id'")
has "Bande gegruendet" "$G" "-"
has "Geschlossene Bande: kein Beitritt" "$(as_user $B "select join_gang('$G')")" "Einladung"
ok  "Bewerbung" "$(as_user $B "select (gang_apply('$G'))->>'applied'")" "$G"
has "Mitglied kann nicht einladen" "$(as_user $C "select gang_invite('$B')")" "keiner Bande"
ok  "Bewerbung annehmen" "$(as_user $A "select (gang_invite('$B'))->>'status'")" "joined"
ok  "Einladen" "$(as_user $A "select (gang_invite('$C'))->>'status'")" "invited"
ok  "Einladung annehmen" "$(as_user $C "select (join_gang('$G'))->>'name'")" "Pfandpiraten"
has "Mitglied darf nicht ausbauen" "$(as_user $B "select upgrade_gang('attack')")" "Rang"
ok  "Befoerdern zum Vize" "$(as_user $A "select (set_gang_role('$B','co'))->>'role'")" "co"
has "Vize darf keinen Vize rauswerfen" "$(as_user $B "select kick_gang_member('$A')")" "niedrigere"
ok  "Einzahlen" "$(as_user $C "select (donate_to_gang(200))->>'donated'")" "200.00"
ok  "Vize baut aus" "$(as_user $B "select (upgrade_gang('attack'))->>'attack_level'")" "1"
has "Kasse protokolliert" "$(as_user $C "select string_agg(kind,',') from gang_log where gang_id='$G'")" "donate"
ok  "Chat" "$(as_user $C "select (post_gang_message('Moin Piraten'))->>'id' is not null")" "t"
has "Chef kann nicht einfach gehen" "$(as_user $A "select leave_gang()")" "Chefrolle"
as_user $A "select set_gang_role('$B','owner')" >/dev/null
ok  "Chef uebergeben" "$($P -tAc "select owner_id from gangs where id='$G'")" "$B"
ok  "Ex-Chef ist Vize" "$($P -tAc "select role from gang_members where user_id='$A'")" "co"
as_user $B "select update_gang_profile('Wir sammeln alles',true)" >/dev/null

# Bandenkrieg
H=$(as_user $D "select (create_gang('Dosenbande'))->>'id'")
as_user $D "select update_gang_profile('',true)" >/dev/null
as_user $E "select join_gang('$H')" >/dev/null
ok  "Offene Bande: direkter Beitritt" "$($P -tAc "select count(*) from gang_members where gang_id='$H'")" "2"
has "Einsatz zu klein" "$(as_user $A "select declare_gang_war('$H',5)")" "Mindesteinsatz"
W=$(as_user $A "select (declare_gang_war('$H',50))->>'id'")
has "Krieg erklaert" "$W" "[0-9]"
has "Kein zweiter Krieg" "$(as_user $B "select declare_gang_war('$H',50)")" "schon in einem Krieg"
$P -tAc "update profiles set attack_skill=200 where id='$C'"
as_user $C "select attack_player('$E')" >/dev/null
ok  "Sieg zaehlt im Krieg" "$($P -tAc "select attacker_score from gang_wars where id=$W")" "1"
$P -tAc "update gang_wars set ends_at=now()-interval '1 second' where id=$W; update gangs set balance=30 where id='$H'"
ok  "Krieg ausgewertet" "$(as_user $A "select resolve_gang_wars()")" "1"
ok  "Sieger bekommt Einsatz + Beute" "$($P -tAc "select war_wins||'/'||(select balance from gangs where id='$H') from gangs where id='$G'")" "1/0.00"
has "Highscore" "$(as_user $A "select string_agg(name,',') from gang_highscore()")" "Pfandpiraten"
ok  "Rauswurf" "$(as_user $B "select (kick_gang_member('$C'))->>'kicked'")" "$C"
exit ${FAILED:-0}
