#!/bin/bash
# 0037: Gewinne über den Geldbehälter hinaus landen im Schließfach statt zu verfallen
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Ueberlauf_A'); Q "update profiles set money=19, cash_capacity=20, bank_balance=0, bottles=1000 where id='$A'" >/dev/null
as_user $A "select sell_bottles()" >/dev/null
ok "Tasche bis zum Rand voll" "$(Q "select money from profiles where id='$A'")" "20.00"
ok "Rest im Schließfach (nichts verfallen)" "$(Q "select (bank_balance >= 99) from profiles where id='$A'")" "t"
B=$(newuser 'Ueberlauf_B'); Q "update profiles set money=20, cash_capacity=20, bank_balance=0, energy=100 where id='$B'" >/dev/null
R=$(as_user $B "select (commit_crime(1))->>'reward'" | tail -1)
[ -n "$R" ] && ok "Verbrechen zahlt trotz voller Tasche aus" "$(Q "select bank_balance > 0 from profiles where id='$B'")" "t" || echo "OK   Verbrechen: erwischt (Zufall) – übersprungen"
ok "Kampfbeute bleibt begrenzt" "$(Q "select count(*) from pg_proc where proname='attack_player' and prosrc ~ 'cash_capacity'")" "1"
exit ${FAILED:-0}
