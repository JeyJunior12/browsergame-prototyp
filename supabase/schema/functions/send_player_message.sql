CREATE OR REPLACE FUNCTION public.send_player_message(target_id uuid, message_body text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare mid bigint;begin
 if target_id=auth.uid() then raise exception 'Selbstgespräche zählen nicht als soziale Funktion';end if;
 if char_length(trim(message_body))<1 or char_length(message_body)>500 then raise exception 'Nachricht muss 1 bis 500 Zeichen haben';end if;
 if not exists(select 1 from public.profiles where id=target_id) then raise exception 'Empfänger unbekannt';end if;
 insert into public.messages(sender_id,recipient_id,body) values(auth.uid(),target_id,trim(message_body)) returning id into mid;
 return jsonb_build_object('id',mid);end;$function$;
