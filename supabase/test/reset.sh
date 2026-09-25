#!/bin/bash
# Baut die lokale Test-DB neu auf: Schema-Export + Katalogdaten + alle Migrationen
set -e
cd "$(dirname "$0")/../.."
P="psql -h /var/tmp/pgtest -p 55432 -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists kiez" -c "create database kiez"
{ cat supabase/test/00_setup.sql
  for f in supabase/schema/functions/*.sql; do [ "$(basename $f)" = rls_auto_enable.sql ] || { cat "$f"; echo; }; done
  cat supabase/schema/triggers.sql
  echo "create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();"
  cat supabase/test/01_data.sql
} | $P -d kiez
for m in supabase/migrations/*.sql; do $P -d kiez -f "$m"; done
