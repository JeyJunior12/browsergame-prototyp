# Hilfsfunktionen fuer lokale Tests: DB neu aufbauen und SQL als Spieler ausfuehren
P="psql -h ${PGHOST:-/var/tmp/pgtest} -p ${PGPORT:-55432} -U postgres -v ON_ERROR_STOP=1 -q -d kiez"
as_user(){ local uid=$1; shift; $P -tAc "set test.uid='$uid'; $*" 2>&1 | grep -v '^SET$'; }
