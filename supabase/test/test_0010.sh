#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
T=$(newuser 'Tester_T'); U=$(newuser 'Tester_U'); N=$(newuser 'Normalo_N')
$P -tAc "update profiles set is_tester=true where id in ('$T','$U')"
has "Normale Spieler duerfen nicht" "$(as_user $N "select tester_set_stats(99999,99999,999)")" "Nur für Testkonten"
has "Normale Spieler: kein Vorspulen" "$(as_user $N "select tester_fast_forward()")" "Nur für Testkonten"
ok  "Tester setzt Werte" "$(as_user $T "select (x->>'money')||'/'||(x->>'level') from (select tester_set_stats(500,2500,50) x) s")" "500.00/11"
as_user $U "select tester_set_stats(500,2500,50,null,1,1)" >/dev/null
as_user $T "select start_training('defense')" >/dev/null
ok  "Vorspulen: Training fertig" "$(as_user $T "select tester_fast_forward(); select (finish_training())->>'finished'" | tail -1)" "defense"
as_user $T "select attack_player('$U')" >/dev/null
$P -tAc "update profiles set protection_until=null where id in ('$T','$U')"  # Schutz nach Sieg/Niederlage ist Zufall
has "Kampfsperre greift normal" "$(as_user $T "select attack_player('$U')")" "3 Stunden"
as_user $T "select tester_fast_forward()" >/dev/null
has "Nach Vorspulen erneut angreifen" "$(as_user $T "select (attack_player('$U'))->>'result'")" "win\|loss"
# 0011: Vorspulen laesst Kriege laufen, tester_end_wars beendet sie
G1=$(as_user $T "select (create_gang('Testbande_A'))->>'id'"); G2=$(as_user $U "select (create_gang('Testbande_B'))->>'id'")
V=$(newuser 'Tester_V'); W=$(newuser 'Tester_W'); $P -tAc "update profiles set is_tester=true, xp=2500 where id in ('$V','$W'); insert into gang_members(gang_id,user_id) values('$G1','$V'),('$G2','$W'); update gangs set balance=500"
as_user $T "select declare_gang_war('$G2',50)" >/dev/null
as_user $T "select tester_fast_forward()" >/dev/null
ok  "Vorspulen beendet Krieg nicht" "$($P -tAc "select resolved from gang_wars where attacker_gang='$G1'")" "f"
ok  "Krieg beenden" "$(as_user $T "select (tester_end_wars())->>'resolved'")" "1"
exit ${FAILED:-0}
