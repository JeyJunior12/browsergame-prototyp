#!/bin/bash
# 0022: Bandenlevel, Bandenhaus-Räume, Wochenaufgaben, Kriege (Verlauf/Waffenruhe/Kapitulation), Überfall, Bündnisse
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Haus_A'); A2=$(newuser 'Haus_A2'); B=$(newuser 'Haus_B'); B2=$(newuser 'Haus_B2'); C=$(newuser 'Haus_C'); C2=$(newuser 'Haus_C2')
Q "update profiles set money=5000, cash_capacity=100000, energy=100 where id in ('$A','$A2','$B','$B2','$C','$C2')" >/dev/null
GA=$(as_user $A "select (create_gang('Haushalter'))->>'id'"); GB=$(as_user $B "select (create_gang('Nachbarn'))->>'id'"); GC=$(as_user $C "select (create_gang('Dritte'))->>'id'")
Q "select kiez_join('$GA','$A2'); select kiez_join('$GB','$B2'); select kiez_join('$GC','$C2')" >/dev/null
ok  "Start Level 1, 22 Plätze" "$(as_user $A "select (gang_house())->'gang'->>'level'||'/'||((gang_house())->'gang'->>'slots')")" "1/22"
# Einzahlung → Erfahrung + Wochenaufgabe
as_user $A "select donate_to_gang(600)" >/dev/null
ok  "Einzahlung gibt Erfahrung (600 + 500 Wochenaufgabe)" "$(Q "select xp from gangs where id='$GA'")" "1100"
ok  "Level 2 ab 500" "$(Q "select level from gangs where id='$GA'")" "2"
ok  "Aufgabe Kasse erledigt (80 € Ziel)" "$(as_user $A "select t->>'done' from jsonb_array_elements((gang_house())->'tasks') t where t->>'kind'='donate'")" "true"
has "Belohnung Kronkorken" "$(Q "select bottlecaps from profiles where id='$A2'")" "5"
ok  "Beitrag sichtbar" "$(as_user $A "select (c->>'donated') from jsonb_array_elements((gang_house())->'contrib') c where c->>'user_id'='$A'")" "600.00"
# Flaschen über weekly_scores
Q "insert into weekly_scores(user_id,week_start,bottles) values('$A2',kiez_week(current_date),120) on conflict (user_id,week_start) do update set bottles=weekly_scores.bottles+120" >/dev/null
ok  "Flaschen zählen" "$(as_user $A "select t->>'progress' from jsonb_array_elements((gang_house())->'tasks') t where t->>'kind'='bottles'")" "120"
# Räume
has "Nur Vize/Chef baut" "$(as_user $A2 "select build_gang_room('kneipe')")" "Rang"
ok  "Kneipe gebaut" "$(as_user $A "select (build_gang_room('kneipe'))->>'level'")" "1"
has "Stufe 2 braucht Level 3" "$(as_user $A "select build_gang_room('kneipe')")" "Level 3"
Q "update profiles set energy=50 where id='$A2'" >/dev/null
ok  "Kneipe +10 Energie" "$(as_user $A2 "select (gang_pub_drink())->>'energy'")" "10"
has "Kneipe 1× am Tag" "$(as_user $A2 "select gang_pub_drink()")" "morgen"
as_user $A "select build_gang_room('training')" >/dev/null
ok  "Trainingsraum spart 5 %" "$(as_user $A "select (kiez_training_cost((select p from profiles p where id='$A'),'attack'))->>'room_saving'")" "5"
as_user $A "select build_gang_room('werkstatt')" >/dev/null
has "Werkstatt gibt Material" "$(as_user $A2 "select gang_workshop()")" "nails"
as_user $A "select build_gang_room('lager')" >/dev/null
Q "select kiez_give_plunder('$A2','bauhelm')" >/dev/null
has "Plunder ins Lager" "$(as_user $A2 "select gang_store_plunder('bauhelm')")" "stored"
has "Andere nehmen raus" "$(as_user $A "select gang_take_plunder('bauhelm')")" "taken"
# Bündnis
ok  "Bündnis angeboten" "$(as_user $A "select (set_gang_relation('$GC','ally'))->>'status'")" "pending"
ok  "Bündnis angenommen" "$(as_user $C "select (set_gang_relation('$GA','ally'))->>'status'")" "active"
has "Kein Krieg gegen Verbündete" "$(as_user $A "select declare_gang_war('$GC',20)")" "Verbündete"
# Krieg mit Tagesverlauf, Verbündeter zählt mit
as_user $A "select declare_gang_war('$GB',50)" >/dev/null
W=$(Q "select id from gang_wars where attacker_gang='$GA' and not resolved")
Q "insert into fights(attacker_id,defender_id,winner_id,attacker_power,defender_power) values('$A','$B','$A',10,5)" >/dev/null
Q "insert into fights(attacker_id,defender_id,winner_id,attacker_power,defender_power) values('$C','$B2','$C',10,5)" >/dev/null
ok  "Verbündeter zählt im Krieg" "$(Q "select attacker_score from gang_wars where id=$W")" "2"
ok  "Tagesverlauf" "$(Q "select attacker_points from gang_war_days where war_id=$W")" "2"
ok  "Waffenruhe angeboten" "$(as_user $B "select (gang_war_ceasefire($W))->>'status'")" "offered"
ok  "Waffenruhe angenommen" "$(as_user $A "select (gang_war_ceasefire($W))->>'status'")" "ended"
ok  "Einsatz zurück bei Waffenruhe" "$(Q "select ended_how from gang_wars where id=$W")" "durch Waffenruhe beendet"
# Kapitulation (Feindesliste: sofort wieder Krieg möglich)
as_user $A "select set_gang_relation('$GB','enemy')" >/dev/null
as_user $A "select declare_gang_war('$GB',40)" >/dev/null
W2=$(Q "select id from gang_wars where attacker_gang='$GA' and not resolved")
as_user $B "select gang_war_surrender($W2)" >/dev/null
ok  "Kapitulation: Angreifer gewinnt" "$(Q "select (winner_gang='$GA')::text||'/'||ended_how from gang_wars where id=$W2")" "true/durch Kapitulation"
has "Kriegsrangliste" "$(as_user $A "select gang_war_ranking()")" "Haushalter"
# Überfall
Q "update gangs set balance=1000 where id='$GB'" >/dev/null
R=$(as_user $A "select (start_gang_raid('$GB'))->>'id'")
has "Verteidiger benachrichtigt" "$(Q "select body from notifications where user_id='$B2' order by id desc limit 1")" "Überfall"
has "Verteidiger hilft" "$(as_user $B2 "select join_gang_raid($R)")" "defense"
Q "update gang_raid_members set power=1000 where raid_id=$R and side='attack'; update gang_raids set ends_at=now()-interval '1 second' where id=$R" >/dev/null
Q "select resolve_gang_raids()" >/dev/null
ok  "Überfall: 10 % Beute" "$(Q "select loot from gang_raids where id=$R")" "100.00"
has "Nicht zweimal in 12 Std." "$(as_user $A "select start_gang_raid('$GB')")" "12 Stunden"
has "Verbündete nicht überfallen" "$(as_user $A "select start_gang_raid('$GC')")" "Verbündete"
exit ${FAILED:-0}
