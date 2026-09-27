#!/bin/bash
# 0020: Plunder-Sets, neue/saisonale Stücke, „Neu“-Markierung, Doppelte verkaufen, Übersicht
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Plunder_A')
$P -tAc "update profiles set money=0, cash_capacity=500 where id='$A'" >/dev/null
ok  "Katalog 21 Stücke" "$(as_user $A "select (plunder_overview())->>'total'")" "21"
ok  "Noch nichts gefunden" "$(as_user $A "select (plunder_overview())->>'found'")" "0"
$P -tAc "select kiez_give_plunder('$A','bauhelm'); select kiez_give_plunder('$A','bauhelm'); select kiez_give_plunder('$A','taschenlampe')" >/dev/null
ok  "Neu markiert" "$(as_user $A "select count(*) from jsonb_array_elements((plunder_overview())->'items') i where (i->>'new')::boolean")" "2"
ok  "Angesehen" "$(as_user $A "select (plunder_mark_seen())->>'marked'")" "2"
ok  "Keine neuen mehr" "$(as_user $A "select count(*) from jsonb_array_elements((plunder_overview())->'items') i where (i->>'new')::boolean")" "0"
D0=$(as_user $A "select (combat_overview())->'defense'->>'total'")
ok  "Set noch nicht fertig" "$(as_user $A "select (plunder_overview())->'bonus'->>'sets'")" "[]"
$P -tAc "select kiez_give_plunder('$A','arbeitshandschuhe')" >/dev/null
ok  "Set Bauarbeiter fertig" "$(as_user $A "select (plunder_overview())->'bonus'->>'sets'")" '["bauarbeiter"]'
ok  "Set-Bonus Verteidigung +3" "$(as_user $A "select ((combat_overview())->'defense'->>'total')::int - $D0")" "3"
ok  "Set-Bonus Pfand +5 %" "$(as_user $A "select (plunder_overview())->'bonus'->>'bottle'")" "5"
ok  "Set-Fortschritt" "$(as_user $A "select (select count(*) from jsonb_array_elements(s->'pieces') x where (x->>'have')::boolean) from jsonb_array_elements((plunder_overview())->'sets') s where s->>'id'='bauarbeiter'")" "3"
# Doppelte verkaufen: 1× Bauhelm doppelt à 9,00 €
ok  "Doppelte verkauft" "$(as_user $A "select (sell_plunder_duplicates())->>'paid'")" "9.00"
ok  "Eins bleibt" "$($P -tAc "select quantity from user_plunder where user_id='$A' and plunder_id='bauhelm'")" "1"
has "Keine Doppelten mehr" "$(as_user $A "select sell_plunder_duplicates()")" "keine doppelten"
# Saison: Weihnachtsmütze nur im Winter
ok  "Jahreszeit" "$($P -tAc "select kiez_season('2026-12-24')||'/'||kiez_season('2026-07-01')")" "winter/sommer"
ok  "Saisonstück außerhalb der Saison nie" "$($P -tAc "select count(*) from generate_series(1,400) g where kiez_random_plunder()='weihnachtsmuetze' and kiez_season()<>'winter'")" "0"
ok  "Sets lesbar" "$(as_user $A "set role authenticated; select count(*) from plunder_sets")" "5"
exit ${FAILED:-0}
