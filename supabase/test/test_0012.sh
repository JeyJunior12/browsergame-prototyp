#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
A=$($P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"Wascher_A\"}') returning id")
$P -tAc "update profiles set money=100, cleanliness=10 where id='$A'"
ok  "Katzenwaesche ohne Kauf" "$(as_user $A "select (x->>'gain')||'/'||(x->'profile'->>'cleanliness') from (select wash_up() x) s")" "35/45"
has "Schwamm erst kaufen" "$(as_user $A "select wash_up('schwamm')")" "Schwamm kaufen"
as_user $A "select buy_progress('wash')" >/dev/null
ok  "Schwamm nach Kauf" "$(as_user $A "select (wash_up('schwamm'))->'profile'->>'cleanliness'")" "100"
has "Sauber genug" "$(as_user $A "select wash_up('katzenwaesche')")" "Sauberer"
$P -tAc "update profiles set cleanliness=5 where id='$A'"
has "Waschanlage erst kaufen" "$(as_user $A "select wash_up('waschanlage')")" "Waschanlage kaufen"
as_user $A "select buy_progress('wash')" >/dev/null
ok  "Waschanlage macht 100 %" "$(as_user $A "select (wash_up('waschanlage'))->'profile'->>'cleanliness'")" "100"
exit ${FAILED:-0}
