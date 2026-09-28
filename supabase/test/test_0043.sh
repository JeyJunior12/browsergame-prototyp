#!/bin/bash
# 0043: Geldprotokoll nur für Testkonten
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Log_A'); T=$(newuser 'Log_T'); $P -tAc "update profiles set is_tester=true where id='$T'" >/dev/null
$P -tAc "update profiles set money=money+5 where id='$T'" >/dev/null
has "Normales Konto gesperrt" "$(as_user $A "select tester_money_log()" 2>&1)" "Nur für Testkonten"
has "Testkonto sieht eigene Änderung" "$(as_user $T "select tester_money_log(5)::text")" "new_money"
exit ${FAILED:-0}
