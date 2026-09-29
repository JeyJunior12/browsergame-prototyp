#!/bin/bash
# 0050: Sortierspiel und Mülltonne wachsen mit dem Level (× 1 + Level/10)
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Sort_Hi'); Q "update profiles set xp=15*49*49, energy=100, cleanliness=100 where id='$A'" >/dev/null   # Level 50
G=$(as_user $A "select (sort_game_start()->>'id')")
IT=$(Q "select items from sort_games where id=$G")
ok "Alle 20 richtig auf Level 50 = 120 Flaschen" "$(as_user $A "select sort_game_finish($G, '$IT')->>'bottles'")" "120"
# Mülltonne: Flaschen- und Geldfunde auf Level 50 sind größer als früher möglich (Flaschen > 5 oder Geld > 1 €)
BIG=0; for i in $(seq 1 40); do Q "update profiles set energy=100, bin_at=null where id='$A'" >/dev/null
  R=$(as_user $A "select dig_bin()::text" 2>/dev/null)
  echo "$R" | python3 -c 'import json,sys;d=json.load(sys.stdin);sys.exit(0 if (d["what"]=="flaschen" and float(d["amount"])>5) or (d["what"]=="geld" and float(d["amount"])>1) else 1)' 2>/dev/null && BIG=1
done
ok "Mülltonne wächst mit dem Level" "$BIG" "1"
exit ${FAILED:-0}
