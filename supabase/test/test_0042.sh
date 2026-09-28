#!/bin/bash
# 0042: Protz-Kosmetik für Euro (Tasche + Schließfach), Kronkorken-Kosmetik unverändert
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Protz_A'); Q "update profiles set money=1000, bank_balance=4500, bottlecaps=20 where id='$A'" >/dev/null
has "Zu wenig Geld" "$(as_user $A "select buy_cosmetic('frame_chrom')" 2>&1)" "25.000,00\|25,000.00\|25000"
has "Neonrahmen aus Tasche + Schließfach" "$(as_user $A "select buy_cosmetic('frame_neon')->>'from_bank'")" "4000"
ok "Tasche und Schließfach leer" "$(Q "select money::numeric(10,2)||'/'||bank_balance::numeric(10,2) from profiles where id='$A'")" "0.00/500.00"
has "Kronkorken-Rahmen geht weiter" "$(as_user $A "select buy_cosmetic('frame_holz')->>'bought'")" "Holzrahmen"
ok "Kronkorken abgezogen" "$(Q "select bottlecaps from profiles where id='$A'")" "10"
exit ${FAILED:-0}
