#!/bin/bash
# Spielt noch nicht eingespielte Migrationen ueber die Supabase Management API ein.
# Jede Migration laeuft zusammen mit ihrem Protokolleintrag in einer Transaktion.
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${SUPABASE_ACCESS_TOKEN:?Secret SUPABASE_ACCESS_TOKEN fehlt}"
REF=qazpwdyyzfdektlbtxae
q(){ # $1 = SQL; gibt JSON-Antwort aus, bricht bei Fehler ab
  local body code
  body=$(jq -Rs '{query: .}' <<<"$1")
  code=$(curl -sS -o /tmp/resp.json -w '%{http_code}' -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d "$body")
  if [ "$code" -ge 300 ]; then echo "Supabase-Fehler ($code): $(jq -r '.message // .' /tmp/resp.json)" >&2; return 1; fi
  cat /tmp/resp.json
}
q "create schema if not exists kiez_admin;
   create table if not exists kiez_admin.migrations(name text primary key, applied_at timestamptz not null default now());" >/dev/null
applied=$(q "select coalesce(json_agg(name),'[]') as n from kiez_admin.migrations" | jq -r '.[0].n[]?')
for f in supabase/migrations/*.sql; do
  name=$(basename "$f")
  if grep -qxF "$name" <<<"$applied"; then echo "schon drin: $name"; continue; fi
  echo "spiele ein: $name"
  q "$(cat "$f")
insert into kiez_admin.migrations(name) values('$name');" >/dev/null
  echo "fertig:     $name"
done
