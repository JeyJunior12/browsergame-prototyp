#!/bin/bash
# 0044: schlanker Zeitsprung – alte Zeilen und Protokolle bleiben unberührt, aktuelle Wartezeiten laufen ab
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
Q(){ $P -tAc "$1"; }
T=$(newuser 'Sprung_T'); Q "update profiles set is_tester=true, training_ends_at=now()+interval '2 hours' where id='$T'" >/dev/null
Q "insert into notifications(user_id,kind,body,created_at) values('$T','x','alt',now()-interval '30 days')" >/dev/null
Q "insert into npc_fights(user_id,npc,won,loot,xp,created_at) values('$T','suffkopp',true,0,0,now()-interval '20 days'),('$T','suffkopp',true,0,0,now()-interval '1 minute')" >/dev/null
as_user $T "select tester_skip_time(180)" >/dev/null
ok "Weiterbildung fertig" "$(Q "select (training_ends_at < now())::text from profiles where id='$T'")" "true"
ok "Protokoll (Nachricht) unberührt" "$(Q "select (created_at between now()-interval '31 days' and now()-interval '29 days')::text from notifications where user_id='$T' and body='alt'")" "true"
ok "Alte Kampfzeile unberührt, neue verschoben" "$(Q "select string_agg((created_at < now()-interval '2 hours')::text,',' order by created_at) from npc_fights where user_id='$T'")" "true,true"
ok "Alter Kampf nicht weiter verschoben" "$(Q "select (min(created_at) > now()-interval '21 days')::text from npc_fights where user_id='$T'")" "true"
exit ${FAILED:-0}
