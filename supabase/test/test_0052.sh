#!/bin/bash
# 0052: Test-Werkzeuge entfernt, Testkonten bleiben
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
Q(){ $P -tAc "$1"; }
ok "Keine tester_-Funktionen mehr" "$(Q "select count(*) from pg_proc where pronamespace='public'::regnamespace and proname like 'tester\_%'")" "0"
ok "Hilfstabelle weg" "$(Q "select count(*) from information_schema.tables where table_schema='public' and table_name='tester_skip_cols'")" "0"
ok "Markierung is_tester bleibt" "$(Q "select count(*) from information_schema.columns where table_name='profiles' and column_name='is_tester'")" "1"
exit ${FAILED:-0}
