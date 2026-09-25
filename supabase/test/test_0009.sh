#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
A=$($P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"Ganove_A\"}') returning id")
$P -tAc "update profiles set energy=100, cash_capacity=1000 where id='$A'"
R=$(as_user $A "select case when (x->>'caught')::boolean then 'knast' else 'beute' end from (select commit_crime(1) x) s" 2>&1)
case "$R" in knast|beute) echo "OK   Verbrechen laeuft ($R)";; *) echo "FAIL Verbrechen: $R"; exit 1;; esac
N=$(as_user $A "select jsonb_array_length(kiez_news())>=2" 2>&1)
[ "$N" = "t" ] && echo "OK   Kiez-News" || { echo "FAIL Kiez-News: $N"; exit 1; }
$P -tAc "update profiles set money=10, energy=50, alcohol_level=1.5, alcohol_updated_at=now() where id='$A'"
F=$(as_user $A "select (x->'profile'->>'energy')||'/'||(x->'profile'->>'alcohol_level')::numeric(4,1) from (select buy_food('currywurst') x) s" 2>&1)
[ "$F" = "65/1.0" ] && echo "OK   Essen: Energie und Promille" || { echo "FAIL Essen: $F"; exit 1; }
