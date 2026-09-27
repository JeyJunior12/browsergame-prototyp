#!/bin/bash
# 0036: Nebenjob-Lohn steigt mit dem Level und lohnt sich (≥ 20 % einer Pfandtour gleicher Dauer auf Mindestlevel)
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
Q(){ $P -tAc "$1"; }
ok "Lohn pro Stunde steigt mit dem Level" "$(Q "select bool_and(r>=pr) from (select pay/minutes*60 r, lag(pay/minutes*60,1,0) over (order by min_level) pr from kiez_jobs()) x")" "t"
ok "Jeder Job ≥ 20 % Pfand-Stundenlohn" "$(Q "select string_agg(id,',') from kiez_jobs() where pay/minutes*60 < 0.2*1.2*(5+4*sqrt(min_level))*(array[1.0,1.25,1.55,1.95,2.5])[least(5,1+min_level/8)]")" ""
exit ${FAILED:-0}
