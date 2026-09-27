#!/bin/bash
# 0024: Computer-Gegner, Kiezboss, Tagesaufgaben, Mülltonne, kurze Touren, Tour-Ereignisse, Chancen, Strähne, Blitzaufträge, Sortierspiel
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Tun_A')
Q "update profiles set money=50, cash_capacity=1000, energy=100, cleanliness=100, attack_skill=5 where id='$A'" >/dev/null
# Computer-Gegner
ok  "5 Computer-Gegner" "$(as_user $A "select jsonb_array_length(npc_overview())")" "5"
has "Kampf gegen Computer" "$(as_user $A "select fight_npc('suffkopp')")" '"won"'
has "10 Min. Pause pro Gegner" "$(as_user $A "select fight_npc('suffkopp')")" "genug"
# Kiezboss
has "Kiezboss erscheint" "$(as_user $A "select world_boss_status()")" "max_hp"
has "Zuschlagen" "$(as_user $A "select world_boss_hit()")" "damage"
has "Einmal pro Stunde" "$(as_user $A "select world_boss_hit()")" "wieder zuschlagen"
Q "update world_boss set hp=1" >/dev/null; Q "update world_boss_hits set last_hit_at=now()-interval '2 hours'" >/dev/null
ok  "Kiezboss besiegt" "$(as_user $A "select (world_boss_hit())->>'defeated'")" "true"
has "Belohnung" "$(Q "select body from notifications where user_id='$A' order by id desc limit 1")" "besiegt"
# Tagesaufgaben
ok  "3 Tagesaufgaben" "$(as_user $A "select jsonb_array_length((daily_tasks_status())->'tasks')")" "3"
Q "update daily_tasks set kind='bin', target=1, progress=0 where user_id='$A' and slot=1" >/dev/null
# Mülltonne
has "Mülltonne" "$(as_user $A "select dig_bin()")" '"what"'
has "Alle 3 Min." "$(as_user $A "select dig_bin()")" "neuer Müll"
ok  "Aufgabe zählt mit" "$(Q "select progress from daily_tasks where user_id='$A' and slot=1 and day=current_date")" "1"
has "Aufgabe abholen" "$(as_user $A "select claim_daily_task(1)")" '"caps": 2'
has "Nicht doppelt" "$(as_user $A "select claim_daily_task(1)")" "Schon abgeholt"
# Blitzauftrag
Q "delete from flash_tasks where user_id='$A'" >/dev/null
K=$(Q "select kiez_flash_kind('$A',kiez_flash_slot())")
C0=$(Q "select bottlecaps from profiles where id='$A'")
Q "select kiez_act('$A','$K')" >/dev/null
ok  "Blitzauftrag erledigt (+1 Kronkorken, evtl. Strähne)" "$(Q "select (bottlecaps-$C0)>=1 from profiles where id='$A'")" "t"
ok  "Blitzauftrag nur einmal" "$(Q "select count(*) from flash_tasks where user_id='$A'")" "1"
# Strähne
Q "update profiles set streak=3, streak_at=now() where id='$A'" >/dev/null; C1=$(Q "select bottlecaps from profiles where id='$A'")
Q "select kiez_act('$A','test')" >/dev/null; Q "select kiez_act('$A','test')" >/dev/null
ok  "Jede 5. Aktion in Folge: +1 Kronkorken" "$(Q "select streak||'/'||(bottlecaps-$C1) from profiles where id='$A'")" "5/1"
# Kurze Tour + Ereignis
Q "update profiles set collection_ends_at=null, collection_ready_at=null where id='$A'" >/dev/null
has "3-Min.-Tour" "$(as_user $A "select start_collection(3)")" '"collection_minutes": 3'
Q "update profiles set collection_ends_at=now()-interval '1 second' where id='$A'" >/dev/null
has "Ausladen" "$(as_user $A "select finish_collection()")" '"found"'
Q "insert into tour_events(user_id,tour_at,kind) select id,collection_ready_at,'hund' from profiles where id='$A' on conflict (user_id,tour_at) do update set kind='hund', resolved=false" >/dev/null
has "Ereignis mit 3 Möglichkeiten" "$(as_user $A "select tour_event()")" "Wurst geben"
has "Entscheidung" "$(as_user $A "select resolve_tour_event(1)")" "15 Flaschen"
ok  "Ereignis erledigt" "$(as_user $A "select tour_event() is null")" "t"
# Chance
Q "insert into chances(user_id,amount,text,expires_at) values('$A',2,'Test',now()+interval '15 seconds')" >/dev/null
CH=$(as_user $A "select (chance_poll())->>'id'")
ok  "Chance aufheben" "$(as_user $A "select (chance_claim($CH))->>'amount'")" "2.00"
Q "insert into chances(user_id,amount,text,expires_at) values('$A',2,'Test',now()-interval '1 second')" >/dev/null
has "Zu spät" "$(as_user $A "select chance_claim((select max(id) from chances where user_id='$A'))")" "Zu spät"
# Sortierspiel
G=$(as_user $A "select sort_game_start()")
GID=$(echo "$G" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])"); IT=$(echo "$G" | python3 -c "import sys,json;print(json.load(sys.stdin)['items'])")
ok  "Sortieren: alle richtig = 20 Flaschen" "$(as_user $A "select (sort_game_finish($GID,'$IT'))->>'bottles'")" "20"
has "Sortieranlage alle 20 Min." "$(as_user $A "select sort_game_start()")" "belegt"
G2=$(Q "insert into sort_games(user_id,items,started_at) values('$A','gggggggggggggggggggg',now()-interval '1 minute') returning id")
has "Zu langsam zählt nicht" "$(as_user $A "select sort_game_finish($G2,'gggggggggggggggggggg')")" "Zeit abgelaufen"
has "Als Nächstes" "$(as_user $A "select next_actions()")" "flash"
exit ${FAILED:-0}
