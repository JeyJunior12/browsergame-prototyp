#!/bin/bash
# 0028: Kiez-Saison, Feiertage + Plunder, Legende, Ranglisten, Statistik
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Lang_A')
Q "update profiles set money=10, cash_capacity=1000 where id='$A'" >/dev/null
# Saison
ok  "20 Stufen" "$(as_user $A "select jsonb_array_length((season_status())->'tiers')")" "20"
has "Noch nicht erreicht" "$(as_user $A "select claim_season_tier(1)")" "Noch nicht"
Q "insert into kiez_actions(user_id,kind,amount) values('$A','beg',45)" >/dev/null
has "Stufe 1 abholen" "$(as_user $A "select claim_season_tier(1)")" '"money"'
has "Nicht doppelt" "$(as_user $A "select claim_season_tier(1)")" "Schon abgeholt"
# Feiertage
ok  "Ostern 2027" "$(Q "select kiez_easter(2027)")" "2027-03-28"
ok  "Feiertage erkannt" "$(Q "select kiez_holiday('2026-12-10')||'/'||kiez_holiday('2026-10-31')||'/'||kiez_holiday('2027-01-01')")" "advent/halloween/silvester"
ok  "Feiertagsstück nie außerhalb" "$(Q "select count(*) from generate_series(1,300) where kiez_random_plunder() in ('kuerbislaterne','schokohase','lebkuchenherz','wunderkerze') and kiez_holiday() is null")" "0"
# Legende
has "Erst ab Level 150" "$(as_user $A "select become_legend()")" "Level 150"
Q "update profiles set xp=333015, attack_skill=50 where id='$A'" >/dev/null
ok  "Level 150" "$(Q "select level from profiles where id='$A'")" "150"
D0=$(as_user $A "select (combat_overview())->'attack'->>'base'")
ok  "Legende: zurück auf Level 1" "$(as_user $A "select (become_legend())->'profile'->>'level'")" "1"
ok  "Legenden-Zähler" "$(Q "select legend from profiles where id='$A'")" "1"
ok  "Dauerbonus Angriff +3" "$(as_user $A "select (combat_overview())->'attack'->>'total'")" "$(as_user $A "select ((combat_overview())->'attack'->>'base')::int + ((combat_overview())->'attack'->>'items')::int + ((combat_overview())->'attack'->>'pets')::int + ((combat_overview())->'attack'->>'gang')::int + ((combat_overview())->'attack'->>'plunder')::int + 3")"
ok  "Dauerbonus Pfand +5 %" "$(as_user $A "select kiez_event_bonus('bottles') >= 5")" "t"
# Ranglisten + Statistik
for k in tiere geld flaschen quote legende; do has "Rangliste $k" "$(as_user $A "select rankings('$k')")" '\['; done
has "Statistik-Verlauf" "$(as_user $A "select stats_history()")" '"xp"'
exit ${FAILED:-0}
