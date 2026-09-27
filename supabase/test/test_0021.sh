#!/bin/bash
# 0021: Körperpflege (Zeitverlust, Stufen, Läden, Kampf, Krankheit), Hunger, Sucht, Waschen gestaffelt
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Pflege_A')
Q(){ $P -tAc "$1"; }
Q "update profiles set money=100, cash_capacity=500, cleanliness=100, clean_updated_at=now()-interval '10 hours 30 minutes', hunger=100, hunger_updated_at=now()-interval '5 hours', energy=0, energy_updated_at=now() where id='$A'" >/dev/null
ok  "Sauberkeit −1 %/Std." "$(as_user $A "select (body_status())->>'cleanliness'")" "90"
ok  "Hunger −4 %/Std." "$(as_user $A "select (body_status())->>'hunger'")" "80"
ok  "Stufe gepflegt" "$(as_user $A "select (body_status())->>'tier'")" "gepflegt"
ok  "Stufen" "$(Q "select string_agg(kiez_clean_tier(x),',') from unnest(array[85,60,30,10]) x")" "gepflegt,normal,schmuddelig,verwahrlost"
# Läden
Q "update profiles set cleanliness=10, clean_updated_at=now() where id='$A'" >/dev/null
has "Verwahrlost fliegt aus dem Supermarkt" "$(as_user $A "select buy_food('broetchen')")" "schmeißt dich raus"
Q "update profiles set cleanliness=30 where id='$A'" >/dev/null
ok  "Schmuddelig zahlt 20 % Aufschlag" "$(as_user $A "select (buy_food('currywurst'))->>'cost'")" "2.40"
ok  "Essen macht satt" "$(Q "select hunger from profiles where id='$A'")" "100"
# Kampf: Gestank
ok  "Gestank-Verteidigung schmuddelig" "$(as_user $A "select (combat_overview())->'defense'->>'stench'")" "2"
# Schnorren nach Stufe
ok  "Schnorrfaktor schmuddelig" "$(as_user $A "select (body_status())->'beg'->>'clean'")" "0.600"
# Krankheit nach 24 Std. verwahrlost
Q "update profiles set cleanliness=5, clean_updated_at=now(), dirty_since=now()-interval '25 hours', sick_until=null where id='$A'" >/dev/null
has "Krank geworden" "$(as_user $A "select (body_status())->>'sick_until'")" "20"
ok  "Energie halb so schnell (krank)" "$(as_user $A "select (body_status())->>'energy_rate'")" "0.5"
has "Benachrichtigt" "$(Q "select body from notifications where user_id='$A' order by id desc limit 1")" "krank"
Q "update profiles set cleanliness=30 where id='$A'" >/dev/null
has "Heilen in der Apotheke" "$(as_user $A "select heal_sickness()")" "price"
ok  "Gesund" "$(as_user $A "select (body_status())->>'sick_until'")" ""
# Hunger bremst Energie
Q "update profiles set hunger=10, hunger_updated_at=now() where id='$A'" >/dev/null
ok  "Hungrig → halbe Energie" "$(as_user $A "select (body_status())->>'energy_rate'")" "0.5"
Q "update profiles set hunger=100, energy=0, energy_updated_at=now()-interval '20 minutes' where id='$A'" >/dev/null
ok  "Satt → volle Energie" "$(as_user $A "select ((body_status())->'profile'->>'energy')")" "20"
# Sucht
Q "update profiles set alcohol_level=3, alcohol_updated_at=now(), addiction=0, addiction_updated_at=now()-interval '10 hours' where id='$A'" >/dev/null
ok  "Sucht steigt über 2 ‰" "$(as_user $A "select (body_status())->>'addiction'")" "20"
Q "update profiles set addiction=60, alcohol_level=0 where id='$A'" >/dev/null
ok  "Entzug nüchtern" "$(as_user $A "select (body_status())->>'withdrawal'")" "true"
has "Entzugskur" "$(as_user $A "select detox()")" "price"
ok  "Sucht weg" "$(Q "select addiction from profiles where id='$A'")" "0"
# Waschen gestaffelt
Q "update profiles set cleanliness=40, fountain_at=null where id='$A'" >/dev/null
ok  "Brunnen kostenlos +15" "$(as_user $A "select (wash_up('brunnen'))->>'gain'")" "15"
has "Brunnen nur alle 30 Min." "$(as_user $A "select wash_up('brunnen')")" "wieder"
ok  "Schwimmbad +80" "$(as_user $A "select (wash_up('schwimmbad'))->'profile'->>'cleanliness'")" "100"
has "Friseur gibt Bonus" "$(as_user $A "select wash_up('friseur')")" '"barber": true'
# Dreck durch Verbrechen
Q "update profiles set cleanliness=50 where id='$A'" >/dev/null
Q "insert into side_action_log(user_id,action_type,success,money_change,xp_change) values('$A','crime:test',true,0,0)" >/dev/null
ok  "Verbrechen −3 %" "$(Q "select cleanliness from profiles where id='$A'")" "47"
exit ${FAILED:-0}
