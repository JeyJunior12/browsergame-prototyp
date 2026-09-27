#!/bin/bash
# 0033: Mitleid-Werte zurück, Begleiter-Kauf prüft Level + Sozialkontakte (max. 45)
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
ok "Mitleid Äffchen/Maus zurück" "$(Q "select string_agg(health::text,',' order by id) from pet_catalog where id in ('monkey','trained_mouse','pitbull')")" "230,1,253"
A=$(newuser 'Tier_A'); Q "update profiles set money=90000, cash_capacity=1000000, social_skill=45 where id='$A'" >/dev/null
has "Elefant erst ab Level 150" "$(as_user $A "select buy_pet('elephant')")" "Level 150"
Q "update profiles set xp=15*149*149 where id='$A'" >/dev/null
has "Mit Level 150 + Sozial 45 kaufbar" "$(as_user $A "select buy_pet('elephant')->'pet'->>'name'")" "Elefant"
Q "update profiles set social_skill=10 where id='$A'" >/dev/null
has "Sozialkontakte weiter nötig" "$(as_user $A "select buy_pet('rhino')")" "Sozialkontakte"
exit ${FAILED:-0}
