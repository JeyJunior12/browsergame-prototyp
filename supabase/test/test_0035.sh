#!/bin/bash
# 0035: neue Texte eingespielt, keine Beschreibung leer
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
Q(){ $P -tAc "$1"; }
ok "Keine leeren Beschreibungen" "$(Q "select count(*) from (select description from shop_items union all select description from pet_catalog union all select description from plunder_catalog union all select description from vehicles union all select description from achievement_defs) x where coalesce(trim(description),'')=''")" "0"
ok "Neuer Ton angekommen" "$(Q "select count(*) from pet_catalog where description like '%Gurkenglas%'")" "1"
ok "Keine ae/oe/ue-Umschreibungen mehr in Tieren" "$(Q "select count(*) from pet_catalog where description ~ '(ue|ae|oe)(r|n|s|l|b|g|t|h|ch)' and description !~ '[äöü]'")" "0"
exit ${FAILED:-0}
