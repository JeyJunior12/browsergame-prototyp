#!/bin/bash
# 0049: Verteidigungs-Katalog stimmig – Preis je Punkt in einem Band, keine Geschick-Stücke, keine Mini-Laufzeiten
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
Q(){ $P -tAc "$1"; }
ok "Alles Verteidigung" "$(Q "select count(*) from defense_items where kind<>'defense'")" "0"
ok "Bis zum Angriff: 40–130 € je Punkt" "$(Q "select count(*) from defense_items where duration_type='until_attack' and (price/amount < 40 or price/amount > 130)")" "0"
ok "Auf Zeit: mindestens 1 Std." "$(Q "select count(*) from defense_items where duration_type='fixed' and duration_minutes < 60")" "0"
ok "Mehr Punkte kosten mehr (bis zum Angriff)" "$(Q "select count(*) from defense_items a join defense_items b on a.duration_type=b.duration_type and a.duration_type='until_attack' and a.amount>b.amount and a.price<=b.price")" "0"
exit ${FAILED:-0}
