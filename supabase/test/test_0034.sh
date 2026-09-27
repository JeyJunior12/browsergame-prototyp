#!/bin/bash
# 0034: Pfandmenge flacht mit Straßenkenntnis ab
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
tour(){ Q "update profiles set streetwise=$2, area_level=5, alcohol_level=0, collection_minutes=480, collection_started_at=now()-interval '9 hours', collection_ends_at=now()-interval '1 minute' where id='$1'" >/dev/null
  as_user $1 "select (finish_collection()->>'found')::int" | tail -1; }
A=$(newuser 'Kurve_A')
N=$(tour $A 150); ok "Stufe 150: 8-Std.-Tour unter 13.000 Flaschen (vorher ~15.000)" "$([ "$N" -lt 13000 ] && echo ja || echo "nein ($N)")" "ja"
N1=$(tour $A 10); ok "Stufe 10: weiterhin über 600 Flaschen" "$([ "$N1" -gt 600 ] && echo ja || echo "nein ($N1)")" "ja"
exit ${FAILED:-0}
