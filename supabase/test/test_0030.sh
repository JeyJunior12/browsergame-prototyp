#!/bin/bash
# 0030: Wohnmobil, Fahrer-Jobs, Rennen + Wetten, Autodiebstahl + Schutz, Banden-Transporter
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Auto_A'); B=$(newuser 'Auto_B'); C=$(newuser 'Auto_C')
Q "update profiles set money=50000, cash_capacity=100000, energy=100, cleanliness=100, level=95, xp=132015, license_stage=2 where id in ('$A','$B','$C')" >/dev/null
has "Fahrer-Job ohne Fahrzeug nicht" "$(as_user $A "select start_job('kurier')")" "brauchst du mindestens"
D0=$(as_user $A "select (combat_overview())->'defense'->>'total'")
as_user $A "select buy_vehicle('wohnmobil')" >/dev/null
ok  "Wohnmobil: Verteidigung +40" "$(as_user $A "select ((combat_overview())->'defense'->>'total')::int - $D0")" "40"
has "Fahrer-Job mit Wohnmobil" "$(as_user $A "select start_job('kurier')")" "Kurier"
# Rennen
as_user $B "select buy_vehicle('kombi')" >/dev/null
R=$(as_user $A "select (race_challenge(20))->>'id'")
has "Rennen annehmen" "$(as_user $B "select race_accept($R)")" "starts_at"
has "Zuschauer wettet" "$(as_user $C "select race_bet($R,'a',5)")" '"amount"'
has "Fahrer wettet nicht" "$(as_user $A "select race_bet($R,'a',5)")" "Fahrer"
Q "update races set starts_at=now()-interval '1 second' where id=$R" >/dev/null
has "Rennen ausgetragen" "$(as_user $C "select races_overview()")" '"resolved": true'
# Diebstahl
Q "update profiles set pickpocket_skill=40 where id='$C'" >/dev/null
has "Klauversuch" "$(as_user $C "select steal_vehicle('$B')")" '"stolen"'
has "Nicht zweimal am Tag (oder schon weg)" "$(as_user $C "select steal_vehicle('$B')")" "heute schon\|kein Motorfahrzeug"
has "Schutz kaufen" "$(as_user $A "select buy_car_protection('garage')")" "garage"
# Transporter
G=$(as_user $A "select (create_gang('Fuhrpark'))->>'id'")
Q "update gangs set balance=3000, level=3 where id='$G'" >/dev/null
ok  "Transporter Stufe 1" "$(as_user $A "select (buy_gang_transporter())->>'level'")" "1"
exit ${FAILED:-0}
