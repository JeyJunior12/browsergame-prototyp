#!/bin/bash
# 0025: Login-Serie + Schutz, Kiez-Zeiten, Pfand-Klau, Ticker, Tutorial, Ausladen+Verkaufen, Willkommen zurück
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
A=$(newuser 'Komm_A')
Q "update profiles set money=0, cash_capacity=1000, energy=100 where id='$A'" >/dev/null
# Login-Serie mit Schutz
Q "update profiles set daily_claim_date=current_date-2, login_streak=6, streak_shields=1 where id='$A'" >/dev/null
ok  "Verpasster Tag verziehen (Schutz)" "$(as_user $A "select (claim_daily_reward())->>'streak'")" "7"
ok  "Schutz verbraucht + neuer an Tag 7" "$(Q "select streak_shields from profiles where id='$A'")" "1"
Q "update profiles set daily_claim_date=current_date-3, login_streak=9, streak_shields=0 where id='$A'" >/dev/null
ok  "Ohne Schutz: Serie weg" "$(as_user $A "select (claim_daily_reward())->>'streak'")" "1"
# Kiez-Zeiten
has "Kiez-Zeit bekannt" "$(Q "select coalesce(kiez_time(),'keine')")" "."
# Pfand-Klau
Q "update profiles set bottles=100 where id='$A'" >/dev/null
Q "update profiles set bottles_checked_at=now()-interval '2 days 1 hour' where id='$A'" >/dev/null
as_user $A "select body_status()" >/dev/null
ok  "2 Tage liegengelassen: 19 geklaut" "$(Q "select bottles from profiles where id='$A'")" "81"
has "Benachrichtigt" "$(Q "select body from notifications where user_id='$A' order by id desc limit 1")" "geklaut"
as_user $A "select body_status()" >/dev/null
ok  "Nicht doppelt" "$(Q "select bottles from profiles where id='$A'")" "81"
# Ausladen + Verkaufen
has "Ein Klick verkauft" "$(as_user $A "select quick_unload_sell()")" '"sold"'
ok  "Lager leer" "$(Q "select bottles from profiles where id='$A'")" "0"
has "Nichts zu tun" "$(as_user $A "select quick_unload_sell()")" "Nichts zu tun"
# Ticker
Q "select kiez_give_plunder('$A','goldene_dose')" >/dev/null
has "Legendärer Fund im Ticker" "$(as_user $A "select kiez_ticker_feed()")" "legendären"
# Tutorial
ok  "Tutorial weiter" "$(as_user $A "select (tutorial_advance(3))->>'step'")" "3"
ok  "Nie zurück" "$(as_user $A "select (tutorial_advance(2))->>'step'")" "3"
as_user $A "select tutorial_advance(6)" >/dev/null
ok  "Abschluss belohnt" "$(as_user $A "select (tutorial_advance(99))->>'reward'")" "true"
# Willkommen zurück
Q "update profiles set last_seen_at=now()-interval '5 hours' where id='$A'" >/dev/null
ok  "Nach 5 Std.: Zusammenfassung" "$(as_user $A "select (welcome_back())->>'show'")" "true"
ok  "Gleich danach nicht nochmal" "$(as_user $A "select (welcome_back())->>'show'")" "false"
exit ${FAILED:-0}
