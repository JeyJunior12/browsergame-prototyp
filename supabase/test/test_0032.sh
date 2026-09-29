#!/bin/bash
# 0032: Balancing – Ausreißer-Prüfung über alle Kataloge (ROADMAP 87/88/92)
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
# Stufenleiter: innerhalb einer Ladenkategorie ist das nächste Stück (höheres Level) nie billiger und nie schwächer (5 % Toleranz)
LADDER="with s as (select category,name,price,required_level,attack+defense v,
  lag(price) over w pp, lag(attack+defense) over w pv, lag(name) over w pn from shop_items where category in ('waffen','kleidung','zubehoer')
  window w as (partition by category order by required_level,price))"
ok "Kein Stück billiger als sein Vorgänger" "$(Q "$LADDER select string_agg(name||' < '||pn,', ') from s where price < pp")" ""
ok "Kein Stück schwächer als sein Vorgänger" "$(Q "$LADDER select string_agg(name||' < '||pn,', ') from s where v < pv*0.95")" ""
# Wert pro Euro: kein Stück mehr als doppelt so stark pro Level wie die Leitlinie (zu stark) oder unter 40 % (tot)
ok "Kampfwert passt zum Level" "$(Q "select string_agg(name,', ') from shop_items where category in ('waffen','kleidung','zubehoer','craft') and required_level>=5
  and ((attack+defense)::numeric/required_level > 2.6 or (attack+defense)::numeric/required_level < 0.4)")" ""
ok "Bastelsachen nicht mehr ab Level 1 überstark" "$(Q "select count(*) from shop_items where category='craft' and required_level<5 and attack+defense>10")" "0"
# Lücken: bis Level 100 (0051) gibt es in jeder Kategorie spätestens alle 10 Level etwas Neues
ok "Keine Lücke > 16 Level" "$(Q "select string_agg(category||' '||required_level,', ') from (select category,required_level,
  lead(required_level) over (partition by category order by required_level) nx from shop_items where category in ('waffen','kleidung','zubehoer')) x where nx-required_level>10")" ""
ok "Jede Kategorie reicht bis Level 100" "$(Q "select count(distinct category) from shop_items where category in ('waffen','kleidung','zubehoer') and required_level=100")" "3"
ok "Begleiter reichen bis Level 100" "$(Q "select max(required_level) from pet_catalog")" "100"
# (health = Mitleid-Bonus, niedrige Werte bei Kampftieren sind gewollt – siehe 0033)
ok "Begleiter-Leiter: teurer = stärker (Kampf + halbes Mitleid, grob)" "$(Q "select string_agg(name,', ') from (select name,attack+defense+health/2 v, max(attack+defense+health/2) over (order by price rows between unbounded preceding and 1 preceding) prevmax from pet_catalog where price>=100) x where v < prevmax*0.5")" ""
# Herstellen prüft das Level
A=$(newuser 'Balance_A'); Q "update profiles set money=500, mat_nails=50, mat_wood=50, mat_textile=50 where id='$A'" >/dev/null
has "Regenschirm erst ab Level 22" "$(as_user $A "select craft_item('regenschirm')")" "Level 22"
has "Holzschild ab Level 5" "$(Q "update profiles set xp=1000 where id='$A'"; as_user $A "select craft_item('holzschild')->'item'->>'name'")" "Holzschild"
# Geldbehälter: jede Stufe muss mit vollem alten Behälter bezahlbar sein
B=$(newuser 'Balance_B')
for cap in 20 100 1000 10000; do Q "update profiles set money=$cap where id='$B'" >/dev/null
  has "Behälter-Stufe bei $cap € Platz bezahlbar" "$(as_user $B "select buy_upgrade('container')->>'label'")" "[A-Za-z]"; done
ok "Am Ende 1 Mio. Platz" "$(Q "select cash_capacity::int from profiles where id='$B'")" "1000000"
exit ${FAILED:-0}
