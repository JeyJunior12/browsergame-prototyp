#!/bin/bash
# 0046: Lenkradkralle/Garage nur einmal pro Fahrzeug bezahlen; Garage-Übersicht zeigt den Schutz
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Schutz_A')
Q "update profiles set money=500, vehicle='bollerwagen' where id='$A'" >/dev/null
Q "insert into user_vehicles(user_id, vehicle_id) values('$A','bollerwagen') on conflict do nothing" >/dev/null
has "Kralle kaufen" "$(as_user $A "select buy_car_protection('kralle')->>'price'" 2>&1)" "15"
has "Kralle zweimal abgelehnt" "$(as_user $A "select buy_car_protection('kralle')" 2>&1)" "schon dran"
has "Garage kaufen" "$(as_user $A "select buy_car_protection('garage')->>'price'" 2>&1)" "100"
has "Garage zweimal abgelehnt" "$(as_user $A "select buy_car_protection('garage')" 2>&1)" "schon in der Garage"
ok "Nur einmal bezahlt (500 − 15 − 100)" "$(Q "select money from profiles where id='$A'")" "385.00"
ok "Übersicht zeigt Kralle" "$(as_user $A "select (select v->>'kralle' from jsonb_array_elements(garage_overview()->'vehicles') v where v->>'id'='bollerwagen')")" "true"
exit ${FAILED:-0}
