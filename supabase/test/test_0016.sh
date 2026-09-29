#!/bin/bash
# 0016: Level-Kurve 15 × (L−1)²
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
ok "Start Level 1"          "$($P -tAc "select kiez_level(0)")" "1"
ok "Level 2 ab 15 Punkten"  "$($P -tAc "select kiez_level(14)||','||kiez_level(15)")" "1,2"
ok "Level 10 ab 1215"       "$($P -tAc "select kiez_level(1214)||','||kiez_level(1215)")" "9,10"
ok "Level 100 ab 147015"    "$($P -tAc "select kiez_level(147015)")" "100"
ok "Level 100 ab 147015 (Höchstlevel 100, 0051)"    "$($P -tAc "select kiez_level(147014)||','||kiez_level(147015)||','||kiez_level(9999999)")" "99,100,100"
ok "Schwellen passend"      "$($P -tAc "select bool_and(kiez_level(kiez_level_points(l))=l and kiez_level(kiez_level_points(l)-1)=l-1) from generate_series(2,100) l")" "t"
U=$($P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"Kurve_A\"}') returning id")
$P -tAc "update profiles set level=20, xp=4750 where id='$U'" >/dev/null
ok "Bestehendes Level bleibt" "$($P -tAc "update profiles set xp=xp+10 where id='$U' returning level")" "20"
ok "Aufstieg erst ab Kurve"   "$($P -tAc "update profiles set xp=6000 where id='$U' returning level")" "21"
V=$($P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"Kurve_B\"}') returning id")
$P -tAc "alter table profiles disable trigger user; update profiles set xp=250, level=2 where id='$V'; alter table profiles enable trigger user" >/dev/null
$P -tAc "$(grep -v '^--' supabase/migrations/0016_level_kurve.sql | tail -1)" >/dev/null
ok "Migration hebt Level an" "$($P -tAc "select level from profiles where id='$V'")" "5"
exit ${FAILED:-0}
