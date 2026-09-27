#!/bin/bash
# 0038: Pfandlager hat eine Größe, volle Lager nehmen keine Flaschen mehr an, Ausbau vergrößert
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
ok "Größen je Stufe" "$(Q "select string_agg(kiez_storage_cap(l)::text,',' order by l) from generate_series(0,4) l")" "250,1000,5000,20000,80000"
A=$(newuser 'Lager_A'); Q "update profiles set bottles=245, bin_at=null where id='$A'" >/dev/null
Q "update profiles set collection_minutes=480, collection_started_at=now()-interval '9 hours', collection_ends_at=now()-interval '1 minute', streetwise=50, area_level=5 where id='$A'" >/dev/null
as_user $A "select finish_collection()" >/dev/null
ok "Volles Lager: höchstens 250" "$(Q "select bottles from profiles where id='$A'")" "250"
Q "update profiles set money=20 where id='$A'" >/dev/null
has "Ausbau Stufe 1 für 15 €" "$(as_user $A "select buy_bottle_storage()->>'cap'")" "1000"
ok "Direkte Änderungen (Admin/Test) nicht gedeckelt" "$(Q "update profiles set bottles=99999 where id='$A' returning bottles")" "99999"
exit ${FAILED:-0}
