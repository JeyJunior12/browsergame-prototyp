#!/bin/bash
# Rundgang: ruft JEDE Spielfunktion auf, die die Oberfläche benutzt. Spielregel-Meldungen (deutsch) sind erlaubt,
# technische SQL-Fehler (mehrdeutige Spalten, fehlende Spalten/Funktionen, Typfehler …) lassen den Test scheitern.
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
FAILED=0; N=0
BAD='ambiguous|does not exist|syntax error|violates|invalid input|null value|operator|cannot|could not|unrecognized|mismatch|out of range|division by zero|permission denied'
call(){ # $1=uid $2=sql
  N=$((N+1)); local out; out=$(as_user "$1" "$2" 2>&1)
  [ -n "$SHOW" ] && echo "   → $(echo "$out" | head -1 | cut -c1-150)"; if echo "$out" | grep -Eiq "$BAD"; then echo "FAIL $2 → $(echo "$out" | head -1)"; FAILED=1; else echo "OK   $2"; fi; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Rundgang_A'); B=$(newuser 'Rundgang_B'); ADM=$(newuser 'Rundgang_Admin')
$P -tAc "update profiles set money=5000, cash_capacity=100000, energy=100, xp=2500, social_skill=45, music_skill=9, streetwise=6,
  mat_nails=100, mat_wood=100, mat_shards=100, mat_textile=100, bottles=50 where id in ('$A','$B')"
$P -tAc "update profiles set is_admin=true where id='$ADM'"
PET=$($P -tAc "select id from pet_catalog where attack>0 order by price limit 1")
ITEM=$($P -tAc "select id from shop_items where category<>'craft' and required_level<=5 order by price limit 1")
DEF=$($P -tAc "select id from defense_items order by price limit 1")
CRAFT=$($P -tAc "select id from shop_items where category='craft' limit 1")

for f in "refresh_my_profile()" "claim_daily_reward()" "beg_for_money()" "beg_at_spot('englischer_garten')" "wash_up('schwamm')" \
  "do_side_action('newspapers')" "buy_upgrade('container')" "buy_progress('area')" "buy_progress('music')" "buy_progress('wash')" \
  "collect_music_income()" "buy_alcohol('beer')" "pump_stomach()" "buy_insurance()" "cancel_insurance()" "buy_scratch_ticket()" \
  "buy_item('$ITEM')" "equip_item('$ITEM')" "sell_item('$ITEM')" "buy_defense_item('$DEF')" "craft_item('$CRAFT')" \
  "buy_pet('$PET')" "activate_pet('$PET')" "start_pet_training('$PET','attack')" "move_in_house()" \
  "start_concentration(30)" "cancel_concentration()" "start_training('defense')" \
  "start_collection(10)" "cancel_collection()" "sell_bottles(10)" "sell_bottles()" "claim_daily_mission()" \
  "check_achievements()" "achievement_progress()" "update_bio('Bio','Motto')" "set_avatar('data:image/png;base64,QUJD')" \
  "bottlecap_shop('energie')" "buy_lotto_ticket(7)" "lotto_info()" "get_weather()" "buy_food('broetchen')" "weekly_ranking('bottles')" "weekly_ranking('wins')" \
  "gang_highscore()" "kiez_news()" "unread_counts()" "mark_messages_read()" "mark_notifications_read()" "post_board('Hallo Kiez')" \
  "change_username('Rundgang_Neu')" "equip_plunder(null)" ; do call $A "select $f"; done

for i in 1 2 3 4 5 6 7; do $P -tAc "update profiles set jail_until=null, energy=100 where id='$A'"; call $A "select commit_crime($i)"; done
$P -tAc "update profiles set jail_until=now()+interval '1 hour', jail_bail=5 where id='$A'"; call $A "select pay_bail()"
$P -tAc "update profiles set jail_until=null, energy=100 where id in ('$A','$B')"
for a in sorting parking windshield; do $P -tAc "update profiles set last_side_action_at=null where id='$A'"; call $A "select do_side_action('$a')"; done
$P -tAc "update profiles set training_ends_at=now()-interval '1 second' where id='$A'"; call $A "select finish_training()"
$P -tAc "update user_pets set training_ends_at=now()-interval '1 second' where user_id='$A'"; call $A "select finish_pet_training('$PET')"
$P -tAc "update profiles set collection_minutes=10, collection_started_at=now()-interval '10 minutes', collection_ends_at=now()-interval '1 second' where id='$A'"; call $A "select finish_collection()"
$P -tAc "update profiles set collection_ends_at=null where id in ('$A','$B')"

# Soziales, Kampf, Bande mit zweitem Spieler
for f in "attack_player('$B')" "friend_request('$B')" "write_guestbook('$B','Hallo')" "send_player_message('$B','Hallo')" \
  "report_player('$B','Testmeldung')" "block_player('$B',true)" "block_player('$B',false)" "donate_link('Rundgang_B')" \
  "create_gang('Rundgangbande')" "update_gang_profile('Beschreibung',false)" "gang_invite('$B')" "donate_to_gang(100)" \
  "upgrade_gang('attack')" "upgrade_gang('defense')" "post_gang_message('Moin')" "resolve_gang_wars()"; do call $A "select $f"; done
call $B "select friend_respond('$A',true)"
G=$($P -tAc "select gang_id from gang_members where user_id='$A'")
call $B "select join_gang('$G')"
call $A "select set_gang_role('$B','officer')"
call $A "select kick_gang_member('$B')"
call $B "select create_gang('Gegnerbande')"
call $B "select gang_apply('$G')"
call $A "select gang_request_delete('$G','$B')"
H=$($P -tAc "select gang_id from gang_members where user_id='$B'")
call $A "select declare_gang_war('$H',50)"
call $B "select buy_pet('$PET')"; call $B "select activate_pet('$PET')"
call $A "select pet_fight('$B')"
call $A "select friend_remove('$B')"
call $A "select delete_guestbook_entry((select max(id) from guestbook_entries))"
call $A "select sell_plunder('kronkorkenkette',1)"
call $B "select leave_gang()"
call $A "select delete_board_post((select max(id) from board_posts))"
# Admin
call $ADM "select admin_set_stats('$B',10,100,0,5)"
call $ADM "select admin_set_ban('$B',true,'Test')"
call $ADM "select admin_set_ban('$B',false,null)"
call $ADM "select admin_resolve_report((select max(id) from player_reports),'resolved')"
call $ADM "select admin_create_event('Testevent','x',now(),now()+interval '1 hour',10,10)"
call $ADM "select admin_delete_event((select max(id) from events))"
# Anonym
N=$((N+1)); out=$($P -tAc "set request.headers='{\"cf-connecting-ip\":\"7.7.7.7\"}'; select donate_link('Rundgang_A')" 2>&1)
echo "$out" | grep -Eiq "$BAD" && { echo "FAIL anonyme Spende → $out"; FAILED=1; } || echo "OK   anonyme Spende"
echo "Rundgang: $N Aufrufe"
exit $FAILED
