#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
A=$($P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"Leser_A\"}') returning id")
$P -tAc "update profiles set money=500, cleanliness=5 where id='$A'"
R=$(as_user $A "select buy_progress('area')" 2>&1); echo "$R" | grep -q "Geschick Stufe 2" && echo "OK   Meldung nennt Stufe" || { echo "FAIL $R"; exit 1; }
R=$(as_user $A "select start_collection(10)" 2>&1); echo "$R" | grep -q "für die Tour" && echo "OK   Umlaute" || { echo "FAIL $R"; exit 1; }
