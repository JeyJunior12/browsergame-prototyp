#!/bin/bash
# Prueft 0014 an frischen Daten: Tester werden restlos entfernt, echte Spieler bleiben unberuehrt
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
$P -tAc "alter table profiles add column if not exists is_tester boolean not null default false" >/dev/null
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
T=$(newuser 'Weg_Tester'); R=$(newuser 'Echter_Spieler')
$P -tAc "update profiles set is_tester=true where id='$T'; update profiles set money=100, energy=100, cash_capacity=1000, xp=0 where id in ('$T','$R')"
as_user $T "select create_gang('Wegbande'); select send_player_message('$R','hi'); select buy_pet((select id from pet_catalog order by price limit 1))" >/dev/null
as_user $R "select friend_request('$T')" >/dev/null
# Migration-Teil ohne die bereits entfernten Funktionen erneut anwenden
$P -q -f supabase/migrations/0014_testmodus_entfernen.sql >/dev/null 2>&1
ok "Tester entfernt" "$($P -tAc "select count(*) from profiles where id='$T'")" "0"
ok "Tester-Login entfernt" "$($P -tAc "select count(*) from auth.users where id='$T'")" "0"
ok "Tester-Bande entfernt" "$($P -tAc "select count(*) from gangs where name='Wegbande'")" "0"
ok "Echter Spieler bleibt" "$($P -tAc "select count(*) from profiles where id='$R'")" "1"
ok "Testmodus weg" "$($P -tAc "select count(*) from pg_proc where proname like 'tester_%'")" "0"
exit ${FAILED:-0}
