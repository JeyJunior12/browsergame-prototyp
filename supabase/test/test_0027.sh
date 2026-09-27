#!/bin/bash
# 0027: Kosmetik, Ruf, Mentor, Geschenke, Glücksrad, Duo-Tour, Tag/Nacht, Stadtereignisse, Nebenquests
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Welt_A'); B=$(newuser 'Welt_B'); M=$(newuser 'Welt_Mentor')
Q "update profiles set money=100, cash_capacity=1000, energy=50, bottlecaps=100 where id in ('$A','$B','$M'); update profiles set level=35, xp=17340 where id='$M'" >/dev/null
Q "insert into friendships(user_id,friend_id,status) values('$A','$B','accepted')" >/dev/null
# Kosmetik
has "Rahmen kaufen" "$(as_user $A "select buy_cosmetic('frame_messing')")" "Messingrahmen"
has "Anlegen" "$(as_user $A "select use_cosmetic('frame','frame_messing')")" "frame_messing"
has "Nicht Gekauftes nicht" "$(as_user $A "select use_cosmetic('frame','frame_gold')")" "nicht"
# Ruf
Q "select kiez_act('$A','crime')" >/dev/null
ok  "Verbrechen → Unterwelt +2, Polizei −2" "$(Q "select rep_underworld||'/'||rep_police from profiles where id='$A'")" "2/-2"
has "Ruf-Übersicht" "$(as_user $A "select reputation_status()")" "unlocks"
Q "update profiles set rep_underworld=30 where id='$A'" >/dev/null
ok  "Unterwelt 30: Kredit doppelt" "$(as_user $A "select (loan_status())->>'max'")" "40"
# Mentor
has "Mentor wählen" "$(as_user $A "select set_mentor('$M')")" "Welt_Mentor"
C0=$(Q "select bottlecaps from profiles where id='$M'")
Q "update profiles set xp=240 where id='$A'" >/dev/null
ok  "Level 5 → Mentor +5 Kronkorken" "$(Q "select bottlecaps-$C0 from profiles where id='$M'")" "5"
# Geschenke
has "Kronkorken schenken" "$(as_user $A "select send_gift('$B','caps',null,5)")" "5 Kronkorken"
has "Tageslimit" "$(as_user $A "select send_gift('$B','caps',null,20)")" "20 Kronkorken pro Tag"
has "Nur Freunde" "$(as_user $A "select send_gift('$M','caps',null,1)")" "nur an Freunde"
# Glücksrad
has "Drehen" "$(as_user $A "select spin_wheel()")" '"label"'
has "1× am Tag" "$(as_user $A "select spin_wheel()")" "morgen"
# Duo
ok  "Einladung" "$(as_user $A "select (duo_invite('$B'))->>'status'")" "invited"
ok  "Angenommen" "$(as_user $B "select (duo_invite('$A'))->>'status'")" "active"
Q "update profiles set collection_ends_at=now()+interval '5 minutes' where id='$B'" >/dev/null
ok  "Duo-Bonus im Pfand" "$(as_user $A "select kiez_event_bonus('bottles') - (select kiez_event_bonus('bottles') from (select set_config('test.uid','$M',true)) x)")" "15"
# Stadtereignis
has "Stadtereignis entsteht" "$(as_user $A "select city_events_now()")" '"title"'
ok  "Tageszeit" "$(Q "select kiez_daytime() in ('tag','nacht')")" "t"
# Nebenquests
ok  "3 Figuren" "$(as_user $A "select jsonb_array_length(side_quests_status())")" "3"
has "Noch nicht geschafft" "$(as_user $A "select claim_side_quest('kemal')")" "Noch nicht"
Q "select kiez_act('$A','job')" >/dev/null
has "Schritt 1 abholen" "$(as_user $A "select claim_side_quest('kemal')")" "Kiosk-Kemal"
ok  "Schritt 2 aktiv" "$(Q "select step from side_quests where user_id='$A' and quest='kemal'")" "2"
exit ${FAILED:-0}
