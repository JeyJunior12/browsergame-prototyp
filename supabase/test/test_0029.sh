#!/bin/bash
# 0029: Fahrzeuge, Führerschein, Sprit/Panne/TÜV, Tuning, Schrottplatz, Revierwechsel
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Fahr_A')
Q "update profiles set money=3000, cash_capacity=100000, energy=100, cleanliness=100, level=4, xp=135 where id='$A'" >/dev/null
has "Bollerwagen ab Level 5" "$(as_user $A "select buy_vehicle('bollerwagen')")" "Level 5"
Q "update profiles set xp=240 where id='$A'" >/dev/null
has "Bollerwagen kaufen" "$(as_user $A "select buy_vehicle('bollerwagen')")" "Bollerwagen"
ok  "Pfand-Bonus +10 %" "$(as_user $A "select (garage_overview())->>'bonus'")" "10"
Q "update profiles set level=40, xp=22815 where id='$A'" >/dev/null
has "Mofa braucht Führerschein" "$(as_user $A "select buy_vehicle('mofa')")" "Führerschein"
has "Theorie" "$(as_user $A "select license_step()")" "ends_at"
has "Läuft noch" "$(as_user $A "select license_step()")" "läuft noch"
Q "update profiles set license_ends_at=now()-interval '1 second' where id='$A'" >/dev/null; as_user $A "select license_step()" >/dev/null
as_user $A "select license_step()" >/dev/null; Q "update profiles set license_ends_at=now()-interval '1 second' where id='$A'" >/dev/null
ok  "Führerschein fertig" "$(as_user $A "select (license_step())->>'done'")" "true"
has "Mofa kaufen" "$(as_user $A "select buy_vehicle('mofa')")" "Mofa"
M0=$(Q "select money from profiles where id='$A'")
has "Tour mit Mofa" "$(as_user $A "select start_collection(10)")" "collection_ends_at"
ok  "Sprit bezahlt (1 €, evtl. Strafe)" "$(Q "select ($M0-money) in (1,11) from profiles where id='$A'")" "t"
ok  "Schneller unterwegs (≤ 7,5 Min.)" "$(Q "select collection_ends_at-collection_started_at <= interval '7 minutes 31 seconds' or vehicle_breakdown from profiles where id='$A'")" "t"
ok  "Zustand −2" "$(Q "select condition from user_vehicles where user_id='$A' and vehicle_id='mofa'")" "98"
Q "update profiles set collection_ends_at=now()-interval '1 second' where id='$A'" >/dev/null
has "Ausladen mit Bonus" "$(as_user $A "select finish_collection()")" '"found"'
# Tuning + Werkstatt
Q "update profiles set mat_nails=50, mat_wood=50, mat_shards=20, mat_textile=20 where id='$A'" >/dev/null
has "Motor tunen" "$(as_user $A "select tune_vehicle('motor')")" "motor"
ok  "Bonus 45+10" "$(as_user $A "select (garage_overview())->>'bonus'")" "55"
has "Lackieren" "$(as_user $A "select tune_vehicle('lack','#123456')")" "lack"
has "Reparatur" "$(as_user $A "select vehicle_service('repair')")" '"price"'
has "TÜV" "$(as_user $A "select vehicle_service('tuev')")" '"price"'
# Schrottplatz
has "Ausschlachten" "$(as_user $A "select scrapyard_dig()")" "nails"
has "Alle 30 Min." "$(as_user $A "select scrapyard_dig()")" "wächter"
has "Material verkaufen" "$(as_user $A "select sell_material('nails',10)")" '"paid": 0.50'
exit ${FAILED:-0}
