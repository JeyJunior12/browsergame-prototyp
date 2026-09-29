#!/bin/bash
# 0053: Von Level 1 bis 100 bringt spätestens jedes 3. Level etwas Neues (Laden, Begleiter, Fahrzeug, Nebenjob, Verbrechen)
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
Q(){ $P -tAc "$1"; }
U="select required_level l from shop_items where category<>'plunder' union select required_level from pet_catalog
   union select min_level from vehicles union select min_level from kiez_jobs() union select kiez_crime_level(i) from generate_series(1,7) i"
ok "Keine Lücke > 2 Level bis 100" "$(Q "select coalesce(string_agg(l||'→'||nx,', '),'') from (select l, lead(l) over (order by l) nx from ($U) u where l<=100) x where nx-l>2")" ""
ok "Ab Level 46 mindestens 35 Level mit Neuem" "$(Q "select (count(distinct l)>=35)::text from ($U) u where l between 46 and 100")" "true"
ok "Preise steigen je Kategorie mit dem Level" "$(Q "select count(*) from shop_items a join shop_items b on a.category=b.category and a.category in ('waffen','kleidung','zubehoer') and a.required_level>b.required_level and a.price<b.price")" "0"
exit ${FAILED:-0}
