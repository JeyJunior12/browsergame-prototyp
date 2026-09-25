#!/bin/bash
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"$2}') returning id"; }
A=$(newuser 'Werber_A'); B=$(newuser 'Neuling_B' ',"ref":"werber_a"'); C=$(newuser 'Gast_C')
$P -tAc "update profiles set money=100, cash_capacity=10000, energy=100 where id in ('$A','$B','$C')"

# Werbelink
ok  "Geworben von" "$($P -tAc "select referred_by from profiles where id='$B'")" "$A"
has "Werber benachrichtigt" "$(as_user $A "select body from notifications where user_id=auth.uid()")" "Werbelink"
$P -tAc "update profiles set xp=1000 where id='$B'"
ok  "Belohnung bei Level 5" "$($P -tAc "select bottlecaps from profiles where id='$A'")" "25"
ok  "Geworbener bekommt 10" "$($P -tAc "select bottlecaps from profiles where id='$B'")" "10"
$P -tAc "update profiles set xp=3000 where id='$B'"
ok  "Belohnung nur einmal" "$($P -tAc "select bottlecaps from profiles where id='$A'")" "25"

# Systemnachrichten bei Kampf, Freundschaft, Gaestebuch
$P -tAc "update profiles set xp=0, level=1 where id in ('$A','$C')"
as_user $A "select attack_player('$C')" >/dev/null
has "Kampfbericht fuer Verteidiger" "$(as_user $C "select body from notifications where user_id=auth.uid() and kind='kampf'")" "Werber_A hat dich"
as_user $A "select friend_request('$C')" >/dev/null
has "Freundschaftsanfrage gemeldet" "$(as_user $C "select string_agg(body,'|') from notifications where user_id=auth.uid()")" "befreundet sein"
as_user $A "select write_guestbook('$C','Hallo')" >/dev/null
ok  "Ungelesen gezaehlt" "$(as_user $C "select (unread_counts())->>'notifications'")" "3"
as_user $C "select mark_notifications_read()" >/dev/null
ok  "Als gelesen markiert" "$(as_user $C "select (unread_counts())->>'notifications'")" "0"
as_user $A "select send_player_message('$C','Moin')" >/dev/null
ok  "Ungelesene Post" "$(as_user $C "select (unread_counts())->>'messages'")" "1"
as_user $C "select mark_messages_read()" >/dev/null
ok  "Post gelesen" "$(as_user $C "select (unread_counts())->>'messages'")" "0"

# Profilbild
ok  "Profilbild speichern" "$(as_user $A "select (set_avatar('data:image/jpeg;base64,QUJD'))->>'ok'")" "true"
has "Kein Fremdcode als Bild" "$(as_user $A "select set_avatar('javascript:alert(1)')")" "ungültig"

# Name aendern
has "Name kostet Kronkorken" "$(as_user $C "select change_username('Neuer_Name')")" "30 Kronkorken"
$P -tAc "update profiles set bottlecaps=50 where id='$A'"
ok  "Name geaendert" "$(as_user $A "select (change_username('Werbekoenig'))->>'username'")" "Werbekoenig"
has "Nur alle 30 Tage" "$(as_user $A "select change_username('Nochmal')")" "30 Tage"

# Gegenstand verkaufen
IT=$($P -tAc "select id from shop_items where required_level=1 and category<>'craft' and price>2 order by price limit 1")
as_user $A "select buy_item('$IT')" >/dev/null
P0=$($P -tAc "select round(price*0.5,2) from shop_items where id='$IT'")
ok  "Verkauf zum halben Preis" "$(as_user $A "select (sell_item('$IT'))->>'paid'")" "$P0"
has "Nicht vorhandenes verkaufen" "$(as_user $A "select sell_item('$IT')")" "hast du nicht"

# Kiez-Brett
ok  "Beitrag" "$(as_user $A "select (post_board('Moin Kiez!'))->>'id' is not null")" "t"
has "Spam-Sperre" "$(as_user $A "select post_board('Nochmal')")" "30 Sekunden"
has "Fremden Beitrag nicht loeschen" "$(as_user $C "select delete_board_post((select max(id) from board_posts))")" "nicht gefunden"

# Lotto
ok  "Los kaufen" "$(as_user $A "select (buy_lotto_ticket(7))->>'number'")" "7"
has "Zahl pruefen" "$(as_user $A "select buy_lotto_ticket(50)")" "1 bis 49"
$P -tAc "insert into lotto_tickets(user_id,draw_week,number) select '$C', kiez_week(current_date)-7, n from generate_series(1,49) n"
ok  "Ziehung vergangener Woche" "$(as_user $A "select (lotto_info())->'last'->>'winners'")" "1"
has "Gewinner benachrichtigt" "$(as_user $C "select string_agg(body,'|') from notifications where user_id=auth.uid() and kind='lotto'")" "LOTTO-GEWINN"

# Erfolgs-Fortschritt
ok  "Fortschritt lesbar" "$(as_user $A "select (achievement_progress())->>'level' is not null")" "t"
exit ${FAILED:-0}
