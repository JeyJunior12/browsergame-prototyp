#!/bin/bash
# 0045: Verbrechen – Beute und Kaution wachsen mit dem Level (Faktor 1 + Level/50)
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
ok "Faktor Level 1" "$(Q "select kiez_crime_factor(1)")" "1.02"
ok "Faktor Level 100" "$(Q "select kiez_crime_factor(100)")" "3.00"
A=$(newuser 'Crime_Hi')
Q "update profiles set xp=15*99*99, money=0, cash_capacity=1000000 where id='$A'" >/dev/null   # Level 100
# Handtaschenraub (8–18 €) mehrfach: Beute zwischen 24 und 65 € (inkl. Nacht/Ruf-Bonus), Kaution 24 €
LOW=1; for i in $(seq 1 25); do
  Q "update profiles set energy=100, jail_until=null where id='$A'" >/dev/null
  R=$(as_user $A "select commit_crime(1, 50)::text")
  if echo "$R" | grep -q '"caught": true'; then ok "Kaution skaliert" "$(echo "$R" | python3 -c "import json,sys;print(float(json.load(sys.stdin)['bail']))")" "24.0"
  else G=$(echo "$R" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("reward") or d.get("money") or 0)'); fi
done
ok "Level-100-Beute über dem alten Höchstwert (18 €)" "$(Q "select (max(money_change)>18)::text from side_action_log where user_id='$A' and success")" "true"
ok "Level-100-Beute höchstens 3 × 18 × 1,3" "$(Q "select (max(money_change)<=70.2)::text from side_action_log where user_id='$A' and success")" "true"
exit ${FAILED:-0}
