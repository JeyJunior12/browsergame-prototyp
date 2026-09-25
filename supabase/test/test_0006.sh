#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
FAILED=0
# Jede Tabelle mit RLS-Policy muss fuer eingeloggte Spieler lesbar sein, aber nicht direkt beschreibbar
for t in $($P -tAc "select distinct tablename from pg_policies where schemaname='public' order by 1"); do
  r=$($P -tAc "select has_table_privilege('authenticated','public.$t','select')")
  [ "$r" = "t" ] && echo "OK   lesbar: $t" || { echo "FAIL nicht lesbar: $t"; FAILED=1; }
done
for t in blocks friendships guestbook_entries donations user_plunder gang_requests gang_log gang_messages gang_wars pet_fights weekly_scores; do
  r=$($P -tAc "select has_table_privilege('authenticated','public.$t','insert')")
  [ "$r" = "f" ] && echo "OK   nicht direkt beschreibbar: $t" || { echo "FAIL direkt beschreibbar: $t"; FAILED=1; }
done
exit $FAILED
