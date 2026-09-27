#!/bin/bash
# 0017: Chat-Leiste – Gespräche, Wortfilter, Empfängersuche, Melden
cd "$(dirname "$0")/../.."; source supabase/test/lib.sh
ok(){ [ "$2" = "$3" ] && echo "OK   $1" || { echo "FAIL $1: erwartet '$3', bekommen '$2'"; FAILED=1; }; }
has(){ echo "$2" | grep -q "$3" && echo "OK   $1" || { echo "FAIL $1: '$2' enthaelt nicht '$3'"; FAILED=1; }; }
newuser(){ $P -tAc "insert into auth.users(raw_user_meta_data) values('{\"username\":\"$1\"}') returning id"; }
A=$(newuser 'Chat_Anna'); B=$(newuser 'Chat_Bert'); C=$(newuser 'Chat_Carl'); D=$(newuser 'Anderer_Dieter')
as_user $A "select send_player_message('$B','Hallo Bert, du Arschloch')" >/dev/null
ok  "Wortfilter Privatnachricht" "$($P -tAc "select body from messages where sender_id='$A' order by id desc limit 1")" "Hallo Bert, du *********"
as_user $B "select send_player_message('$A','Selber!')" >/dev/null
as_user $C "select send_player_message('$A','Moin Anna')" >/dev/null
ok  "Zwei Gespräche" "$(as_user $A "select jsonb_array_length(chat_conversations())")" "2"
ok  "Ungelesen gezählt" "$(as_user $A "select sum((x->>'unread')::int) from jsonb_array_elements(chat_conversations()) x")" "2"
ok  "Verlauf mit Bert" "$(as_user $A "select jsonb_array_length((chat_thread('$B'))->'messages')")" "2"
ok  "Verlauf markiert gelesen" "$(as_user $A "select sum((x->>'unread')::int) from jsonb_array_elements(chat_conversations()) x")" "1"
ok  "Eigene Nachricht erkennbar" "$(as_user $A "select (chat_thread('$B'))->'messages'->0->>'mine'")" "true"
has "Fremde Gespräche unsichtbar" "$(as_user $D "select chat_conversations()")" "\[\]"
# Empfängersuche
ok  "Suche per Namensanfang" "$(as_user $A "select string_agg(x->>'username',',') from jsonb_array_elements(find_players('chat_b')) x")" "Chat_Bert"
has "Eigener Name nie in der Suche" "$(as_user $A "select coalesce(string_agg(x->>'username',','),'-') from jsonb_array_elements(find_players('Chat_A')) x")" "-"
ok  "Ohne Eingabe nur Freunde/Bande (keine)" "$(as_user $A "select jsonb_array_length(find_players(''))")" "0"
$P -tAc "insert into friendships(user_id,friend_id,status) values('$A','$C','accepted')" >/dev/null
ok  "Ohne Eingabe: Freunde" "$(as_user $A "select string_agg(x->>'username',',') from jsonb_array_elements(find_players('')) x")" "Chat_Carl"
ok  "Platzhalter wie leere Eingabe (nur Freunde)" "$(as_user $A "select coalesce(string_agg(x->>'username',','),'-') from jsonb_array_elements(find_players('%')) x")" "Chat_Carl"
# Blockieren
as_user $B "select block_player('$A', true)" >/dev/null
has "Blockiert: keine Post" "$(as_user $A "select send_player_message('$B','hallo?')")" "keine Post"
ok  "Blockiert: Gespräch ausgeblendet" "$(as_user $A "select count(*) from jsonb_array_elements(chat_conversations()) x where x->>'name'='Chat_Bert'")" "0"
# ALL-Chat
as_user $C "select post_chat('Du Wichser')" >/dev/null
ok  "Wortfilter ALL-Chat" "$($P -tAc "select body from chat_messages order by id desc limit 1")" "Du *******"
has "Chat melden" "$(as_user $A "select report_chat((select max(id) from chat_messages))")" "{"
has "Eigene nicht melden" "$(as_user $C "select report_chat((select max(id) from chat_messages))")" "Eigene"
ok  "Wortliste geschützt" "$($P -tAc "select has_table_privilege('authenticated','public.bad_words','select')")" "f"
exit ${FAILED:-0}
