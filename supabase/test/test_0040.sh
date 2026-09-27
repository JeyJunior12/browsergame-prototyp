#!/bin/bash
# 0040: Balancing aus dem Durchspiel-Test – Kampfbereich, Verbrechen-Level, Bestechung, Computer-Gegner, Musik, Kiosk, Weiterbildung, Rubbellos
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Bal_A'); B=$(newuser 'Bal_B'); C=$(newuser 'Bal_C')
Q "update profiles set xp=15*19*19, energy=100, money=50 where id='$A'" >/dev/null   # Level 20
Q "update profiles set xp=15*99*99 where id='$B'" >/dev/null                          # Level 100
Q "update profiles set xp=15*13*13 where id='$C'" >/dev/null                          # Level 14
# 156: nach oben jeder, nach unten nur 5 Level
has "Angriff auf viel Höheren erlaubt" "$(as_user $A "select attack_player('$B')->>'result'" 2>&1)" "win\|loss"
has "Angriff 6 Level darunter verboten" "$(as_user $A "select attack_player('$C')" 2>&1)" "ERROR"
# 177: Verbrechen-Level
L1=$(newuser 'Bal_L1'); Q "update profiles set energy=100 where id='$L1'" >/dev/null
has "Bankraub auf Level 1 gesperrt" "$(as_user $L1 "select commit_crime(6)" 2>&1)" "Level 55"
has "Handtaschenraub auf Level 1 erlaubt" "$(as_user $L1 "select commit_crime(1)->>'name'" 2>&1)" "Handtaschenraub"
# Bestechung nach Kaution
Q "update profiles set jail_until=now()+interval '1 hour', jail_bail=400, bottlecaps=100 where id='$L1'" >/dev/null
as_user $L1 "select bottlecap_shop('knast')" >/dev/null
ok "Bestechung bei 400 € Kaution kostet 40 Kronkorken" "$(Q "select bottlecaps from profiles where id='$L1'")" "60"
# 178: Computer-Gegner an Angriff gekoppelt, Punkte mit Level
ok "Suff-Kopp schwächer als eigener Angriff" "$(as_user $A "select ((npc_overview()->0->>'power')::int < (select kiez_attack_power(p) from profiles p where id='$A'))::text")" "true"
ok "Punkte wachsen mit Level (Suff-Kopp Level 20: 4 × 1,8)" "$(as_user $A "select npc_overview()->0->>'xp'")" "7"
# 181: Nebenfähigkeiten linear
ok "Sozialkontakte Stufe 32 kostet 258 €" "$(Q "select (kiez_training_cost(p,'social',31-p.social_skill+1)->>'price')::numeric::text from profiles p where id='$A'")" "258.00"
ok "Kiosk Stufe 1: 1 €/Std." "$(Q "select kiez_kiosk_rate(1)")" "1.00"
# 182: Geldbehälter 1→2 für 15 €
Q "update profiles set money=15 where id='$C'" >/dev/null
has "Große Tüte für 15 €" "$(as_user $C "select buy_upgrade('container')->>'price'")" "15"
# 168: Rubbellos – nur Niete, Einsatz zurück oder echter Gewinn; Gewinn über dem Behälter ins Schließfach
R=$(newuser 'Bal_R'); Q "update profiles set money=100000, cash_capacity=1000000 where id='$R'" >/dev/null
ok "Preise nur 0/10/15/20/50/100/500" "$(for i in $(seq 1 200); do as_user $R "select buy_scratch_ticket()->>'prize'"; done | sort -u | grep -vxE '0|10|15|20|50|100|500' | wc -l)" "0"
Q "update profiles set money=20, cash_capacity=20, bank_balance=0 where id='$R'" >/dev/null
for i in $(seq 1 40); do Q "update profiles set money=20 where id='$R'" >/dev/null; as_user $R "select buy_scratch_ticket()->>'prize'" >/dev/null; done
has "Gewinne über dem Behälter landen im Schließfach" "$(Q "select (bank_balance>0)::text from profiles where id='$R'")" "true"
exit ${FAILED:-0}
