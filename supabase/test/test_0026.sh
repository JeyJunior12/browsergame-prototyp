#!/bin/bash
# 0026: Nebenjobs, Ausrüstung im Basar, Pfandlager, Auktion, Kiosk, Kredithai, Revanche, Kopfgeld, Turnier, Wetten
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Wirt_A'); B=$(newuser 'Wirt_B'); C=$(newuser 'Wirt_C')
Q "update profiles set money=500, cash_capacity=5000, energy=100, level=10, xp=1215, cleanliness=100 where id in ('$A','$B','$C')" >/dev/null
# Nebenjob
has "Job starten" "$(as_user $A "select start_job('flyer')")" "Flyer"
has "Läuft noch" "$(as_user $A "select finish_job()")" "läuft noch"
Q "update profiles set job_ends_at=now()-interval '1 second' where id='$A'" >/dev/null
ok  "Job-Lohn" "$(as_user $A "select (finish_job())->>'pay'")" "1.20"
has "Job ab Level" "$(as_user $A "select start_job('messe')")" "Level 30"
# Pfandlager
ok  "Lager ausbauen → 8 % Klau" "$(as_user $A "select (buy_bottle_storage())->>'theft'")" "8"
# Ausrüstung im Basar
Q "insert into inventory(user_id,item_id,quantity) values('$A','bottle',1)" >/dev/null
has "Preisgrenzen" "$(as_user $A "select item_list('bottle',9999)")" "Preis zwischen"
L=$(as_user $A "select (item_list('bottle',6))->>'id'")
ok  "Aus dem Inventar genommen" "$(Q "select count(*) from inventory where user_id='$A' and item_id='bottle'")" "0"
has "Kaufen" "$(as_user $B "select item_buy($L)")" '"price"'
ok  "Käufer hat es" "$(Q "select count(*) from inventory where user_id='$B' and item_id='bottle'")" "1"
has "Verkäufer bekommt 95 %" "$(Q "select body from notifications where user_id='$A' order by id desc limit 1")" "5.70"
# Auktion
Q "select kiez_give_plunder('$A','taschenlampe')" >/dev/null
has "Nur seltener Plunder" "$(Q "select kiez_give_plunder('$A','plastikblume')" >/dev/null; as_user $A "select auction_create('plastikblume',1,1)")" "seltener"
AU=$(as_user $A "select (auction_create('taschenlampe',2,1))->>'id'")
has "Gebot zu klein" "$(as_user $B "select auction_bid($AU,1)")" "Mindestgebot"
as_user $B "select auction_bid($AU,2)" >/dev/null
M0=$(Q "select money from profiles where id='$B'")
as_user $C "select auction_bid($AU,3)" >/dev/null
ok  "Überbotener bekommt Geld zurück" "$(Q "select money-$M0 from profiles where id='$B'")" "2.00"
Q "update auctions set ends_at=now()-interval '1 second' where id=$AU" >/dev/null; Q "select settle_auctions()" >/dev/null
ok  "Höchstbietender bekommt Plunder" "$(Q "select quantity from user_plunder where user_id='$C' and plunder_id='taschenlampe'")" "1"
# Kiosk
ok  "Kiosk bauen" "$(as_user $A "select (kiosk_build())->>'level'")" "1"
Q "update kiosks set collected_at=now()-interval '10 hours' where user_id='$A'" >/dev/null
ok  "Kasse nach 10 Std." "$(as_user $A "select (kiosk_overview())->'mine'->>'cash'")" "2.50"
Q "update profiles set attack_skill=100 where id='$B'" >/dev/null
has "Kiosk überfallen" "$(as_user $B "select kiosk_rob('$A')")" '"won": true'
has "Besitzer benachrichtigt" "$(Q "select body from notifications where user_id='$A' order by id desc limit 1")" "Kiosk"
has "Einnahmen einsammeln" "$(as_user $A "select kiosk_collect()")" "cash"
# Kredithai
has "Kredit höchstens 20×Level" "$(as_user $C "select loan_take(9999)")" "zwischen 5"
as_user $C "select loan_take(100)" >/dev/null
ok  "Schuld +20 %" "$(Q "select owed from loans where user_id='$C'")" "120.00"
Q "update loans set due_at=now()-interval '1 second' where user_id='$C'; update profiles set money=50 where id='$C'" >/dev/null
as_user $C "select body_status()" >/dev/null
ok  "Schläger holen Bargeld, Rest +10 %" "$(Q "select owed from loans where user_id='$C'")" "77.00"
has "Benachrichtigt" "$(Q "select body from notifications where user_id='$C' order by id desc limit 1")" "Schläger"
Q "update profiles set money=200 where id='$C'" >/dev/null
has "Zurückzahlen" "$(as_user $C "select loan_repay()")" '"left": 0'
# Kopfgeld + Revanche
has "Kopfgeld aussetzen" "$(as_user $C "select bounty_place('$A',20)")" '"amount"'
Q "update profiles set attack_skill=200, protection_until=null where id='$B'; update profiles set protection_until=null, jail_until=null, collection_ends_at=null where id in ('$A','$B')" >/dev/null
R=$(as_user $B "select attack_player('$A')")
has "Sieger kassiert Kopfgeld" "$R" '"bounty": 20'
F=$(Q "select max(id) from fights where attacker_id='$B' and defender_id='$A'")
ok  "Revanche angeboten" "$(as_user $A "select jsonb_array_length(revenge_list())")" "1"
Q "update profiles set protection_until=null, energy=100 where id in ('$A','$B')" >/dev/null
has "Revanche trotz 3-Std.-Regel" "$(as_user $A "select revenge_attack($F)")" '"revenge": true'
has "Nur einmal" "$(as_user $A "select revenge_attack($F)")" "schon deine Revanche"
# Turnier
for U in $A $B $C; do Q "update profiles set money=100 where id='$U'" >/dev/null; as_user $U "select tournament_signup()" >/dev/null; done
Q "update tournament_signups set week_start=week_start-7" >/dev/null
has "Turnier ausgetragen" "$(as_user $A "select tournament_status()")" '"winner"'
# Wetten
has "Tierkampf-Wette" "$(as_user $A "select place_bet('pet',current_date::text,'a',5)")" '"amount"'
Q "update bets set ref=(current_date-1)::text where user_id='$A' and kind='pet'" >/dev/null
has "Wette abgerechnet" "$(as_user $A "select bets_overview()")" '"settled": true'
exit ${FAILED:-0}
