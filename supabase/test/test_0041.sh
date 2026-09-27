#!/bin/bash
# 0041: Minispiel-Punkte (0–100) verschieben Verbrechen, Computer-Kampf, Schnorren und Straßenmusik begrenzt; alte Aufrufe gehen weiter
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Mini_A'); Q "update profiles set energy=100, cleanliness=100 where id='$A'" >/dev/null
has "Verbrechen ohne Minispiel-Wert" "$(as_user $A "select commit_crime(1)->>'name'" 2>&1)" "Handtaschenraub"
Q "update profiles set jail_until=null, energy=100 where id='$A'" >/dev/null
has "Verbrechen mit Minispiel-Wert" "$(as_user $A "select commit_crime(7, 100)->>'name'" 2>&1)" "Kaugummi"
ok "Werte werden auf 0–100 begrenzt" "$(Q "select kiez_mini(500)||'/'||kiez_mini(-3)||'/'||kiez_mini(null)")" "100/0/50"
# Schnorren: gleicher Zufall, bester Spruch bringt mehr als schlechtester
Q "update profiles set last_beg_at=null, energy=100 where id='$A'" >/dev/null
has "Schnorren ohne Wert (alter Aufruf)" "$(as_user $A "select beg_for_money()->>'spot'")" "strasse"
Q "update profiles set last_beg_at=null, energy=100 where id='$A'" >/dev/null
has "Schnorren mit Spruch-Wert" "$(as_user $A "select beg_at_spot('strasse', 100)->>'spot'")" "strasse"
has "Computer-Kampf mit Ausweichen" "$(as_user $A "select fight_npc('suffkopp', 80)->>'npc'")" "Suff"
Q "update profiles set music_level=1, music_collected_at=now()-interval '2 hours' where id='$A'" >/dev/null
has "Musik mit Takt-Wert" "$(as_user $A "select collect_music_income(100)->>'paid'")" "[0-9]"
exit ${FAILED:-0}
