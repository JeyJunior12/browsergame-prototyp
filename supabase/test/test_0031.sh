#!/bin/bash
# 0031: Städte gesperrt bis Richtwert, Umzug
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Stadt_A'); Q "update profiles set money=500 where id='$A'" >/dev/null
ok  "Start in der Hafenstadt" "$(Q "select city from profiles where id='$A'")" "hafenstadt"
ok  "Städte gesperrt" "$(as_user $A "select (city_overview())->>'enabled'")" "false"
has "Umzug gesperrt" "$(as_user $A "select move_city('flussstadt')")" "bald verfügbar"
Q "update feature_flags set enabled=true, min_players=1 where key='cities'" >/dev/null
as_user $A "select city_overview()" >/dev/null
ok  "Nächste Stadt öffnet bei vollem Richtwert" "$(Q "select is_open from cities where id='flussstadt'")" "t"
has "Umziehen" "$(as_user $A "select move_city('flussstadt')")" "Flussstadt"
ok  "100 € bezahlt" "$(Q "select money from profiles where id='$A'")" "400.00"
has "Nicht gleich wieder" "$(as_user $A "select move_city('hafenstadt')")" "gerade erst"
Q "update feature_flags set enabled=false, min_players=250 where key='cities'; update cities set is_open=(id='hafenstadt')" >/dev/null
exit ${FAILED:-0}
