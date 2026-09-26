#!/bin/bash
# 0015: Stadtteile, Basar, Zockerbude, Schließfach, Kiez-Geschichte, Chat, Titel, Kampfprotokoll
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Sechs_A'); B=$(newuser 'Sechs_B')
$P -tAc "update profiles set money=100, cash_capacity=200, xp=2500, level=11 where id in ('$A','$B')"

# Schließfach
ok  "Einzahlen mit 2 % Gebühr" "$(as_user $A "select (bank_deposit(50))->>'stored'")" "49.00"
ok  "Bargeld weniger" "$($P -tAc "select money from profiles where id='$A'")" "50.00"
$P -tAc "update profiles set money=5000, cash_capacity=6000 where id='$A'"
has "Schließfach-Grenze" "$(as_user $A "select bank_deposit(1000)")" "fasst höchstens"
$P -tAc "update profiles set money=190, cash_capacity=200 where id='$A'"
has "Abheben nur bis Geldbehälter voll" "$(as_user $A "select bank_withdraw(20)")" "passt nicht"
$P -tAc "update profiles set money=150 where id='$A'"
ok  "Abheben" "$(as_user $A "select (bank_withdraw(20))->'profile'->>'bank_balance'")" "29.00"
ok  "Überfall klaut nur Bargeld" "$($P -tAc "select bank_balance from profiles where id='$A'")" "29.00"

# Stadtteile
has "Unbekannter Stadtteil" "$(as_user $A "select choose_district('mond')")" "gibt es nicht"
ok  "Revier wählen" "$(as_user $A "select (choose_district('hafen'))->>'district'")" "Hafen"
has "Nur einmal am Tag wechseln" "$(as_user $A "select choose_district('markt')")" "einmal am Tag"
$P -tAc "update profiles set money=1000, cash_capacity=100000 where id='$A'"
G=$(as_user $A "select (create_gang('Hafenratten'))->>'id'")
$P -tAc "insert into weekly_scores(user_id,week_start,bottles,wins) values('$A',kiez_week(current_date),30,1)"
ok  "Einfluss aus Flaschen und Siegen" "$($P -tAc "select points from district_influence where gang_id='$G'")" "50"
$P -tAc "insert into district_influence(district_id,gang_id,week_start,points) values('hafen','$G',kiez_week(current_date)-7,99)"
BAL=$($P -tAc "select balance from gangs where id='$G'")
ok  "Übersicht nennt Besitzer" "$(as_user $A "select d->>'owner' from jsonb_array_elements((district_overview())->'districts') d where d->>'id'='hafen'")" "Hafenratten"
ok  "Revierkasse +250" "$($P -tAc "select balance-$BAL from gangs where id='$G'")" "250.00"
ok  "Nur einmal auswerten" "$(as_user $A "select district_overview() is not null"; $P -tAc "select count(*) from district_owners")" "t
1"
has "Mitglieder benachrichtigt" "$($P -tAc "select body from notifications where user_id='$A' and kind='revier'")" "erobert"

# Basar
$P -tAc "insert into user_plunder(user_id,plunder_id,quantity) values('$A','fahrradkette',3)"
has "Mehr einstellen als vorhanden" "$(as_user $A "select market_list('fahrradkette',5,2)")" "nicht"
L=$(as_user $A "select (market_list('fahrradkette',2,4.5))->>'listing'")
ok  "Plunder im Basar reserviert" "$($P -tAc "select quantity from user_plunder where user_id='$A' and plunder_id='fahrradkette'")" "1"
has "Eigenes Angebot nicht kaufen" "$(as_user $A "select market_buy($L)")" "Eigene"
$P -tAc "update profiles set money=5 where id='$B'"
has "Zu wenig Geld" "$(as_user $B "select market_buy($L)")" "Nicht genug"
$P -tAc "update profiles set money=100 where id='$B'"
ok  "Teilkauf" "$(as_user $B "select (market_buy($L,1))->>'bought'")" "1"
ok  "Käufer hat Plunder" "$($P -tAc "select quantity from user_plunder where user_id='$B' and plunder_id='fahrradkette'")" "1"
ok  "Verkäufer bekommt 95 %" "$($P -tAc "select body like '%4.28 €%' from notifications where user_id='$A' and kind='basar'")" "t"
ok  "Rest zurückziehen" "$(as_user $A "select (market_cancel($L))->>'returned'")" "1"
ok  "Plunder zurück" "$($P -tAc "select quantity from user_plunder where user_id='$A' and plunder_id='fahrradkette'")" "2"

# Zockerbude
has "Becher 4 gibt es nicht" "$(as_user $B "select shell_game(1,4)")" "drei Becher"
has "Einsatz zu hoch" "$(as_user $B "select shell_game(99,1)")" "Einsatz"
R=$(as_user $B "select (shell_game(1,2))->>'ball'"); has "Hütchenspiel läuft" "$R" "[123]"
ok  "Hütchen protokolliert" "$($P -tAc "select count(*) from gamble_log where user_id='$B' and game='huetchen'")" "1"
$P -tAc "update profiles set money=100, cash_capacity=1000 where id in ('$A','$B')"
C=$(as_user $A "select (dice_challenge(10))->>'challenge'")
ok  "Einsatz eingezogen" "$($P -tAc "select money from profiles where id='$A'")" "90.00"
has "Nicht gegen sich selbst" "$(as_user $A "select dice_accept($C)")" "selbst"
W=$(as_user $B "select (dice_accept($C))->>'win'")
ok  "Topf minus 5 % beim Gewinner" "$($P -tAc "select sum(money) from profiles where id in ('$A','$B')")" "199.00"
has "Duell vorbei" "$(as_user $B "select dice_accept($C)")" "vorbei"
C2=$(as_user $A "select (dice_challenge(5))->>'challenge'")
ok  "Duell zurückziehen" "$(as_user $A "select (dice_cancel($C2))->>'refund'")" "5.00"

# Kiez-Geschichte
ok  "Kapitel 1 offen" "$(as_user $B "select (quest_status())->'quest'->>'title'")" "Neu im Kiez"
has "Noch nicht geschafft" "$(as_user $B "select claim_quest()")" "Noch nicht"
$P -tAc "insert into daily_missions(user_id,mission_day,progress) values('$B',current_date,25) on conflict (user_id,mission_day) do update set progress=25"
ok  "Kapitel 1 abholen" "$(as_user $B "select (claim_quest())->>'title'")" "Neu im Kiez"
ok  "Weiter zu Kapitel 2" "$(as_user $B "select (quest_status())->>'step'")" "2"

# Chat
ok  "Chat schreiben" "$(as_user $A "select (post_chat('Moin Kiez'))->>'id' is not null")" "t"
has "Nicht zu schnell" "$(as_user $A "select post_chat('nochmal')")" "Nicht so schnell"
has "Leere Nachricht" "$(as_user $B "select post_chat('   ')")" "Schreib erst"
has "Fremde Nachricht nicht löschen" "$(as_user $B "select delete_chat((select max(id) from chat_messages))")" "nicht gefunden"
ok  "Eigene löschen" "$(as_user $A "select (delete_chat((select max(id) from chat_messages)))->>'deleted' is not null")" "t"

# Titel
has "Titel nur mit Erfolg" "$(as_user $B "select set_title('erster_sack')")" "noch nicht"
AID=$($P -tAc "select id from achievement_defs order by sort_order limit 1")
$P -tAc "insert into user_achievements(user_id,achievement_id) values('$B','$AID')"
ok  "Titel setzen" "$(as_user $B "select (set_title('$AID'))->>'title'")" "$($P -tAc "select name from achievement_defs where id='$AID'")"

# Kampfprotokoll
$P -tAc "insert into fights(attacker_id,defender_id,winner_id,attacker_power,defender_power,loot) values('$A','$B','$A',10,5,3)"
ok  "Kampfprotokoll" "$(as_user $B "select (fight_history())->'stats'->>'defenses'")" "1"
ok  "Gegnername" "$(as_user $B "select (fight_history())->'fights'->0->>'opponent'")" "Sechs_A"

# Rechte
for t in chat_messages market_listings dice_challenges district_influence district_owners gamble_log quest_defs; do
  ok "nicht direkt beschreibbar: $t" "$($P -tAc "select has_table_privilege('authenticated','public.$t','insert')")" "f"
done
ok  "Auszahlhelfer nicht aufrufbar" "$($P -tAc "select has_function_privilege('authenticated','public.kiez_pay(uuid,numeric)','execute')")" "f"
exit ${FAILED:-0}
