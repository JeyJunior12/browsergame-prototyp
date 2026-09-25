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
has "Kampfsperre greift normal" "$(as_user $T "select attack_player('$U')")" "3 Stunden"
as_user $T "select tester_fast_forward()" >/dev/null
has "Nach Vorspulen erneut angreifen" "$(as_user $T "select (attack_player('$U'))->>'result'")" "win\|loss"
exit ${FAILED:-0}
