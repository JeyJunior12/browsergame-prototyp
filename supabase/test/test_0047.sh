#!/bin/bash
# 0047: TÜV nur in der letzten Woche verlängern
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Tuev_A')
Q "update profiles set money=500, vehicle='mofa' where id='$A'" >/dev/null
Q "insert into user_vehicles(user_id, vehicle_id, tuev_until) values('$A','mofa', now()+interval '3 days') on conflict do nothing" >/dev/null
has "TÜV in der letzten Woche verlängern" "$(as_user $A "select vehicle_service('tuev')->>'price'" 2>&1)" "20"
has "TÜV mit 33 Tagen Rest abgelehnt" "$(as_user $A "select vehicle_service('tuev')" 2>&1)" "verlängern geht erst"
ok "Nur einmal bezahlt" "$(Q "select money from profiles where id='$A'")" "480.00"
exit ${FAILED:-0}
