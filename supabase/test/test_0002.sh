#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Punkte_A'); B=$(newuser 'Punkte_B'); C=$(newuser 'Punkte_C')
$P -tAc "update profiles set money=500, cash_capacity=100000 where id in ('$A','$B','$C')"

# Punkte / Level
ok  "Level aus Punkten" "$(as_user $A "update profiles set xp=760 where id=auth.uid() returning level")" "4"
ok  "Level sinkt nie" "$(as_user $A "update profiles set xp=10 where id=auth.uid() returning level")" "4"
ok  "Level max 150" "$(as_user $A "update profiles set xp=999999 where id=auth.uid() returning level")" "150"
$P -tAc "update profiles set xp=0, level=1 where id='$A'"
as_user $A "select start_training('defense')" >/dev/null
$P -tAc "update profiles set training_ends_at=now()-interval '1 second' where id='$A'"
ok  "Weiterbildung gibt Punkte" "$(as_user $A "select (finish_training())->>'points'")" "14"
ok  "Skill erhoeht" "$(as_user $A "select defense_skill||'/'||xp from profiles where id=auth.uid()")" "2/14"

# Energie-Regeneration vor Pruefung
$P -tAc "update profiles set energy=0, energy_updated_at=now()-interval '30 minutes' where id='$B'"
ok  "Energie regeneriert beim Schnorren" "$(as_user $B "select (beg_at_spot('strasse'))->'profile'->>'energy'")" "25"

# Schnorrplaetze
has "Wartezeit serverseitig" "$(as_user $B "select beg_at_spot('englischer_garten')")" "Warte kurz"
has "Platz nach Gebiet gesperrt" "$(as_user $C "select beg_at_spot('oper')")" "Sammelgebiet 5"
has "Unbekannter Platz" "$(as_user $C "select beg_at_spot('mond')")" "gibt es nicht"
ok  "Alte Bettelfunktion geht" "$(as_user $C "select (beg_for_money())->>'spot'")" "strasse"

# Kampf: Levelbereich, Knast, Sperre, Versicherung
$P -tAc "update profiles set xp=2250, energy=100, attack_skill=100 where id='$A'"   # Level 10 -> 8..15
$P -tAc "update profiles set xp=250 where id='$B'"                                   # Level 2
$P -tAc "update profiles set xp=3000, money=1000, insurance_active=true where id='$C'" # Level 13
has "Zu schwacher Gegner" "$(as_user $A "select attack_player('$B')")" "Level 8 bis 15"
$P -tAc "update profiles set jail_until=now()+interval '1 hour' where id='$C'"
has "Kein Angriff auf Knacki" "$(as_user $A "select attack_player('$C')")" "im Knast"
$P -tAc "update profiles set jail_until=null where id='$C'; update profiles set jail_until=now()+interval '1 hour' where id='$A'"
has "Kein Angriff aus dem Knast" "$(as_user $A "select attack_player('$C')")" "im Knast"
$P -tAc "update profiles set jail_until=null where id='$A'"
ok  "Versicherter verliert nur 5 %" "$(as_user $A "select (attack_player('$C'))->>'loot'")" "50.00"
$P -tAc "update profiles set protection_until=null where id='$C'"
has "3 Stunden Sperre pro Gegner" "$(as_user $A "select attack_player('$C')")" "3 Stunden"

# Versicherung: 1 EUR pro Tag
$P -tAc "update profiles set money=200, insurance_next_charge_at=now()-interval '36 hours' where id='$C'"
ok  "Versicherung 2 Tage = 2 EUR" "$(as_user $C "select money||'/'||insurance_days_paid from refresh_my_profile()")" "198.00/2"

# Apotheke
$P -tAc "update profiles set money=100, alcohol_level=2, alcohol_updated_at=now(), insurance_active=false where id='$B'"
ok  "Magen auspumpen nach Promille" "$(as_user $B "select (pump_stomach())->>'price'")" "8.00"
$P -tAc "update profiles set alcohol_level=2, alcohol_updated_at=now() where id='$C'"
$P -tAc "update profiles set insurance_active=true where id='$C'"
ok  "Versichert halber Preis" "$(as_user $C "select (pump_stomach())->>'price'")" "4.00"

# Konzentration
$P -tAc "update profiles set money=1000, training_type=null, training_ends_at=null, concentration_ends_at=null where id='$A'"
as_user $A "select start_concentration(480)" >/dev/null
M=$(as_user $A "select (start_training('streetwise'))->>'minutes'")
ok  "Konzentration spart 10 %" "$M" "45"
has "Konzentration blockiert Pfandtour" "$(as_user $A "select start_collection(10)")" "Konzentrationsmodus"
has "Konzentration blockiert Kampf" "$(as_user $A "select attack_player('$B')")" "Konzentrationsmodus"
as_user $A "select cancel_concentration()" >/dev/null
ok  "Abbrechen nimmt Bonus zurueck" "$(as_user $A "select round(extract(epoch from (training_ends_at-now()))/60) from profiles where id=auth.uid()")" "50"
as_user $A "select start_concentration(480)" >/dev/null
ok  "Konzentration waehrend Training beschleunigt" "$(as_user $A "select round(extract(epoch from (training_ends_at-now()))/60) from profiles where id=auth.uid()")" "45"
as_user $A "select cancel_concentration()" >/dev/null

# Rubbellos: Gewinn bis cash_capacity
$P -tAc "update profiles set money=100, cash_capacity=100 where id='$B'"
R=$(as_user $B "select (x->'profile'->>'money')::numeric<=100 from (select buy_scratch_ticket() x) s")
ok  "Rubbellos ueberschreitet Geldbehaelter nicht" "$R" "t"
exit ${FAILED:-0}
