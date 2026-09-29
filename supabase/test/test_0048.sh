#!/bin/bash
# 0048: Verteidigung nicht stapeln – jeder Gegenstand nur einmal gleichzeitig aktiv
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Def_A'); Q "update profiles set money=100000 where id='$A'" >/dev/null
IT=$(Q "select id from defense_items where duration_type='until_attack' order by price limit 1")
has "Erster Kauf" "$(as_user $A "select buy_defense_item('$IT')->>'item'" 2>&1)" "."
has "Zweiter Kauf abgelehnt" "$(as_user $A "select buy_defense_item('$IT')" 2>&1)" "schon aktiv"
ok "Nur ein Eintrag" "$(Q "select count(*) from user_active_defenses where user_id='$A' and item_id='$IT'")" "1"
exit ${FAILED:-0}
