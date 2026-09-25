#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
# Migration nochmals mit einem Konto dieses Namens ausfuehren: genau dieses wird Admin, andere nicht
X=$($P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"BehaarteUhse\"}') returning id")
Y=$($P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"Normalo\"}') returning id")
$P -f supabase/migrations/0007_admin.sql >/dev/null
R=$($P -tAc "select string_agg(username||'='||is_admin,',' order by username) from profiles where id in ('$X','$Y')")
[ "$R" = "BehaarteUhse=true,Normalo=false" ] && echo "OK   Admin gesetzt" || { echo "FAIL Admin: $R"; exit 1; }
