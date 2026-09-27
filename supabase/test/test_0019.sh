#!/bin/bash
# 0019: Schnorr-Statistik und Bonus, Stadtteile gesperrt bis Schalter/genug Spieler
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Schnorr_A'); ADM=$(newuser 'Schnorr_Admin')
$P -tAc "update profiles set money=0, cash_capacity=500, energy=100, cleanliness=100, speech_skill=10, area_level=2 where id='$A'" >/dev/null
$P -tAc "update profiles set is_admin=true where id='$ADM'" >/dev/null
# Bonus: Sauberkeit 100 → 1,0; Rhetorik 10 → 1,1; ohne Begleiter 1,0
ok  "Bonus-Faktor sichtbar" "$(as_user $A "select (beg_overview())->'bonus'->>'total'")" "1.100"
R=$(as_user $A "select (beg_at_spot('bahnhof'))->>'total'")
ok  "Protokoll heute pro Platz" "$(as_user $A "select (beg_overview())->'spots'->'bahnhof'->>'today'")" "$R"
ok  "Heute gesamt" "$(as_user $A "select (beg_overview())->>'today'")" "$R"
ok  "Bester Platz" "$(as_user $A "select (beg_overview())->>'best_spot'")" "bahnhof"
has "Sperre bleibt" "$(as_user $A "select beg_at_spot('bahnhof')")" "Warte kurz"
has "Platz über Sammelgebiet gesperrt" "$(as_user $A "select beg_at_spot('oper')")" "Sammelgebiet 5"
ok  "Nur eigenes Protokoll lesbar" "$(as_user $ADM "set role authenticated; select count(*) from beg_log")" "0"
# Stadtteile
ok  "Stadtteile aus" "$(as_user $A "select (district_overview())->>'enabled'")" "false"
has "Revierwahl gesperrt" "$(as_user $A "select choose_district((select id from districts limit 1))")" "bald verfügbar"
has "Nur Admin darf schalten" "$(as_user $A "select admin_set_feature('districts',true)")" "Kiezaufsicht"
ok  "Admin schaltet ein" "$(as_user $ADM "select (admin_set_feature('districts',true))->>'active'")" "true"
has "Revierwahl geht" "$(as_user $A "select choose_district((select id from districts order by sort_order limit 1))")" "district"
ok  "Automatisch ab Spielerzahl" "$($P -tAc "update feature_flags set enabled=false, min_players=1 where key='districts'; select kiez_feature_on('districts')")" "t"
$P -tAc "update feature_flags set enabled=false, min_players=50 where key='districts'" >/dev/null
ok  "Wieder aus" "$($P -tAc "select kiez_feature_on('districts')")" "f"
exit ${FAILED:-0}
