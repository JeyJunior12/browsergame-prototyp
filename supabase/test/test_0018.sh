#!/bin/bash
# 0018: Ausrüstung nur einmal, Anlegen/Ablegen, Kampfwerte, Lernwarteschlange
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Ruest_A')
$P -tAc "update profiles set money=500, cash_capacity=5000, level=10, xp=1215 where id='$A'" >/dev/null
ok  "Kaufen" "$(as_user $A "select (buy_item('bottle'))->'item'->>'id'")" "bottle"
has "Zweiter Kauf gesperrt" "$(as_user $A "select buy_item('bottle')")" "nur einmal"
ok  "Geld nur einmal abgezogen" "$($P -tAc "select money from profiles where id='$A'")" "495.00"
B0=$(as_user $A "select (combat_overview())->'attack'->>'total'")
ok  "Anlegen" "$(as_user $A "select (equip_item('bottle'))->>'slot'")" "waffe"
ok  "Angriff steigt um Waffenwert" "$(as_user $A "select ((combat_overview())->'attack'->>'total')::int - $B0")" "3"
ok  "Bonus getrennt sichtbar" "$(as_user $A "select (combat_overview())->'attack'->>'items'")" "3"
as_user $A "select buy_item('toothpick')" >/dev/null
as_user $A "select equip_item('toothpick')" >/dev/null
ok  "Ein Platz pro Art (Waffe getauscht)" "$(as_user $A "select string_agg(item_id,',') from inventory where user_id='$A' and equipped")" "toothpick"
ok  "Ablegen" "$(as_user $A "select (unequip_item('toothpick'))->>'unequipped'")" "toothpick"
ok  "Angriff wieder Grundwert" "$(as_user $A "select (combat_overview())->'attack'->>'total'")" "$B0"
has "Nicht Besessenes nicht anlegen" "$(as_user $A "select equip_item('street_sign')")" "erst kaufen"
# Erstattung doppelter Stücke (alte Käufe vor 0018)
U=$(newuser 'Ruest_Dopp')
$P -tAc "alter table inventory disable trigger inventory_once; insert into inventory(user_id,item_id,quantity) values('$U','bottle',3); alter table inventory enable trigger inventory_once" >/dev/null
$P -tAc "update profiles set money=0, cash_capacity=100 where id='$U'" >/dev/null
$P -tAc "$(sed -n '/^do \$\$/,/^end \$\$;/p' supabase/migrations/0018_ausruestung_lernen.sql)" >/dev/null
ok  "Duplikate erstattet" "$($P -tAc "select quantity||'/'||money from inventory i join profiles p on p.id=i.user_id where i.user_id='$U'")" "1/10.00"
# Lernwarteschlange
$P -tAc "update profiles set money=500 where id='$A'" >/dev/null
ok  "Weiterbildung starten merkt Preis" "$(as_user $A "select (start_training('defense'))->'profile'->>'training_price'")" "3.20"
ok  "Planen" "$(as_user $A "select jsonb_array_length((queue_training('defense'))->'queue')")" "1"
ok  "Geplante Stufe zählt laufende mit" "$(as_user $A "select (training_queue_status())->'queue'->0->>'next_level'")" "3"
as_user $A "select queue_training('attack')" >/dev/null; as_user $A "select queue_training('speech')" >/dev/null
has "Höchstens 3 geplant" "$(as_user $A "select queue_training('stamina')")" "nur Platz für 3"
ok  "Abbrechen erstattet die Hälfte" "$(as_user $A "select (cancel_training())->>'refund'")" "1.60"
ok  "Nächste startet automatisch" "$(as_user $A "select (training_queue_status())->>'started'")" "defense"
$P -tAc "update profiles set training_ends_at=now()-interval '1 second' where id='$A'" >/dev/null
R=$(as_user $A "select training_queue_status()")
has "Fertige abgeschlossen" "$R" '"finished": {'
has "Danach nächste gestartet" "$R" '"started": "attack"'
ok  "Entfernen" "$(as_user $A "select jsonb_array_length((unqueue_training((select min(id) from training_queue where user_id='$A')))->'queue')")" "0"
exit ${FAILED:-0}
