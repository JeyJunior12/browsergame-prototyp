-- 0006: Leserechte fuer die neuen Tabellen (Supabase vergibt sie in diesem Projekt nicht automatisch).
-- Welche Zeilen sichtbar sind, regeln weiterhin die RLS-Policies.
grant select on public.blocks, public.friendships, public.guestbook_entries, public.donations, public.plunder_catalog,
  public.user_plunder, public.events, public.gang_requests, public.gang_log, public.gang_messages, public.gang_wars,
  public.pet_fights, public.weekly_scores, public.competition_payouts to authenticated;
grant select on public.plunder_catalog, public.events, public.gang_wars, public.weekly_scores, public.competition_payouts,
  public.guestbook_entries to anon;
-- Schreiben nur ueber die Spielfunktionen
revoke insert, update, delete, truncate on public.blocks, public.friendships, public.guestbook_entries, public.donations,
  public.plunder_catalog, public.user_plunder, public.events, public.gang_requests, public.gang_log, public.gang_messages,
  public.gang_wars, public.pet_fights, public.weekly_scores, public.competition_payouts from anon, authenticated;

-- Spendenlink: Besucher-IP aus dem vertrauenswuerdigen Proxy-Header (cf-connecting-ip), sonst der
-- letzte X-Forwarded-For-Eintrag (den ersten kann der Browser selbst mitschicken und so faelschen).
create or replace function public.kiez_client_key()
returns text language plpgsql stable as $function$
declare h json := nullif(current_setting('request.headers',true),'')::json; ip text; parts text[];
begin
  ip := h->>'cf-connecting-ip';
  if ip is null then
    parts := string_to_array(coalesce(h->>'x-forwarded-for',''),',');
    ip := trim(coalesce(parts[array_length(parts,1)],'unbekannt'));
  end if;
  return 'ip:'||md5('kiez-spende:'||coalesce(nullif(ip,''),'unbekannt'));
end $function$;

create or replace function public.donate_link(target_name text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare t public.profiles; dkey text; amt numeric(12,2); did bigint;
begin
  select * into t from public.profiles where lower(username)=lower(trim(coalesce(target_name,''))) for update;
  if t.id is null or t.is_banned then raise exception 'Diesen Spieler gibt es nicht'; end if;
  if auth.uid()=t.id then raise exception 'Dir selbst kannst du nichts spenden'; end if;
  -- eine Spende pro Besucher-IP, Spieler und Tag (auch Zweitkonten zaehlen nicht doppelt)
  dkey := public.kiez_client_key();
  if (select count(*) from public.donations where target_id=t.id and donation_day=current_date)>=100 then
    raise exception '% hat heute schon genug Spenden bekommen', t.username; end if;
  amt := least(round((0.05+random()*0.25)::numeric,2), greatest(0,t.cash_capacity-t.money));
  if amt<=0 then raise exception 'Der Spendenbecher von % ist gerade voll', t.username; end if;
  insert into public.donations(target_id,donor_id,donor_key,amount) values(t.id,auth.uid(),dkey,amt)
  on conflict do nothing returning id into did;
  if did is null then raise exception 'Du hast % heute schon etwas gespendet', t.username; end if;
  update public.profiles set money=money+amt, total_earned=total_earned+amt, donations_received=donations_received+1,
    donation_money=donation_money+amt where id=t.id;
  return jsonb_build_object('name',t.username,'amount',amt);
end $function$;
grant execute on function public.donate_link(text) to anon, authenticated;
