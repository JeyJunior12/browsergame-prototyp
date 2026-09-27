#!/bin/bash
# 0039: Zeitsprung nur für Testkonten, verschiebt eigene Wartezeiten, schenkt nichts
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
N=$(newuser 'Normalo'); has "Normale Spieler dürfen nicht" "$(as_user $N "select tester_skip_time(60)")" "Nur für Testkonten"
T=$(newuser 'Zeitreisender'); Q "update profiles set is_tester=true, money=5, energy=0, collection_ends_at=now()+interval '8 hours', collection_minutes=480, collection_started_at=now() where id='$T'" >/dev/null
as_user $T "select tester_skip_time(600)" >/dev/null
ok "Tour ist fertig" "$(Q "select collection_ends_at < now() from profiles where id='$T'")" "t"
ok "Kein Geld geschenkt" "$(Q "select money from profiles where id='$T'")" "5.00"
exit ${FAILED:-0}
