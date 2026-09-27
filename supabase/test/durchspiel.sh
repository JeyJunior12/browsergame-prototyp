#!/bin/bash
# Durchspiel-Test (lokal): supabase/test/durchspiel.sh aktiv|gelegenheit [Tage]  → Tabelle sim_log + Kurzbericht
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
TYP=${1:-aktiv}; TAGE=${2:-600}
$P -f supabase/test/durchspiel.sql >/dev/null
$P -c "call public.sim_run('$TYP', $TAGE)"
$P -c "select tag, level, xp, geld, bank, angriff, verteidigung, strasse, gebiet, behaelter, left(coalesce(kaeufe,''),70) kaeufe
  from sim_log where typ='$TYP' and (tag in (1,2,3,5,7,10,14,21,30,45,60,90,120,180,240,300,365,450,540,600) or level>=150) order by tag"
