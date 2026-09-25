#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Tier_A'); B=$(newuser 'Tier_B'); C=$(newuser 'Tier_C')
ok  "Startgeld 5 EUR" "$($P -tAc "select money from profiles where id='$A'")" "5.00"
$P -tAc "update profiles set money=500, cash_capacity=10000, energy=100, social_skill=45 where id in ('$A','$B','$C')"

# Tierkampf
PET=$($P -tAc "select id from pet_catalog where attack>0 order by price limit 1")
has "Ohne Tier kein Kampf" "$(as_user $A "select pet_fight('$B')")" "keinen aktiven"
as_user $A "select buy_pet('$PET'); select activate_pet('$PET')" >/dev/null
has "Gegner ohne Tier" "$(as_user $A "select pet_fight('$B')")" "Gegner hat keinen"
as_user $B "select buy_pet('$PET'); select activate_pet('$PET')" >/dev/null
$P -tAc "update user_pets set attack_level=20 where user_id='$A'"
ok  "Tierkampf gewonnen" "$(as_user $A "select (pet_fight('$B'))->>'result'")" "win"
has "Tierkampf-Sperre 1 Std." "$(as_user $A "select pet_fight('$B')")" "einer Stunde"

# Wochenwettbewerb
$P -tAc "insert into daily_missions(user_id,progress) values('$A',50),('$B',80) on conflict(user_id,mission_day) do update set progress=daily_missions.progress+excluded.progress"
has "Wochenrangliste Flaschen" "$(as_user $A "select string_agg(username||':'||score,',' order by rank) from weekly_ranking('bottles')")" "Tier_B:80,Tier_A:50"
$P -tAc "insert into weekly_scores(user_id,week_start,bottles,wins) values('$C',kiez_week(current_date)-7,999,3)"
ok  "Vergangene Woche ausgezahlt" "$(as_user $A "select count(*) from weekly_ranking('wins')" >/dev/null; $P -tAc "select bottlecaps from profiles where id='$C'")" "100"
ok  "Nur einmal ausgezahlt" "$(as_user $A "select resolve_competitions()")" "0"

# Erfolge
$P -tAc "update profiles set xp=2500, wins=12 where id='$A'"
R=$(as_user $A "select jsonb_array_length((check_achievements())->'unlocked')")
has "Mehrere Erfolge freigeschaltet" "$R" "[4-9]"
ok  "Erfolg nur einmal" "$(as_user $A "select jsonb_array_length((check_achievements())->'unlocked')")" "0"
ok  "Mindestens 30 Erfolge" "$($P -tAc "select count(*)>=30 from achievement_defs where stat is not null")" "t"

# Events
has "Nur Admin darf Events" "$(as_user $A "select admin_create_event('Pfandwoche','',now(),now()+interval '1 day',100,0)")" "Nur für Admins"
$P -tAc "update profiles set is_admin=true where id='$C'"
as_user $C "select admin_create_event('Pfandwoche','Doppelt Pfand',now()-interval '1 hour',now()+interval '1 day',100,50)" >/dev/null
ok  "Event-Bonus aktiv" "$($P -tAc "select kiez_event_bonus('bottles')||'/'||kiez_event_bonus('xp')")" "100/50"
$P -tAc "update profiles set collection_minutes=10, collection_started_at=now()-interval '10 minutes', collection_ends_at=now()-interval '1 second' where id='$B'"
ok  "Event erhoeht Punkte der Tour" "$(as_user $B "select (finish_collection())->>'xp'")" "8"
exit ${FAILED:-0}
