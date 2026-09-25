-- 0009: Verbrechen reparieren – die Variable "energy" kollidierte mit der Spalte profiles.energy
-- ("column reference energy is ambiguous"), dadurch schlug jedes Verbrechen fehl. Gefunden per Klick-Test.
create or replace function public.commit_crime(crime_id integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  p public.profiles;
  names text[]:=array['Handtaschenraub','Ladendiebstahl','Auto aufbrechen','Einbruch','Tankstellenüberfall','Bankraub','Kaugummiautomat aufbrechen'];
  risks int[]:=array[15,22,30,42,55,70,18];
  rewardmin numeric[]:=array[8,18,45,90,180,450,10];
  rewardmax numeric[]:=array[18,35,80,160,320,900,20];
  bails numeric[]:=array[8,18,35,70,150,400,10];
  jailmins int[]:=array[8,12,20,35,60,120,9];
  cost int[]:=array[6,8,10,14,18,22,7];
  idx int; caught boolean; reward numeric;
begin
  p := public.kiez_actor();
  perform public.kiez_assert_free(p);
  idx:=crime_id;
  if idx is null or idx<1 or idx>array_length(names,1) then raise exception 'Unbekanntes Verbrechen'; end if;
  if p.energy<cost[idx] then raise exception 'Dafür reicht deine Energie nicht'; end if;
  caught:=random()*100<risks[idx];
  if caught then
    update public.profiles set energy=energy-cost[idx],jail_until=now()+make_interval(mins=>jailmins[idx]),jail_bail=bails[idx] where id=p.id returning * into p;
    insert into public.side_action_log(user_id,action_type,success,money_change,xp_change) values(p.id,'crime:'||names[idx],false,0,0);
    return jsonb_build_object('caught',true,'name',names[idx],'bail',bails[idx],'jail_minutes',jailmins[idx],'profile',to_jsonb(p));
  end if;
  reward:=round((rewardmin[idx]+random()::numeric*(rewardmax[idx]-rewardmin[idx])),2);
  reward:=least(reward,greatest(0,p.cash_capacity-p.money));
  update public.profiles set energy=energy-cost[idx],money=money+reward,xp=xp+greatest(3,cost[idx]) where id=p.id returning * into p;
  insert into public.side_action_log(user_id,action_type,success,money_change,xp_change) values(p.id,'crime:'||names[idx],true,reward,greatest(3,cost[idx]));
  return jsonb_build_object('caught',false,'name',names[idx],'reward',reward,'profile',to_jsonb(p));
end $function$;

-- Kiez-News (Gerüchteküche): öffentliches Geschehen der letzten Tage, ohne private Daten
create or replace function public.kiez_news()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare items jsonb := '[]'::jsonb; r record;
begin
  items := items || jsonb_build_array(jsonb_build_object('icon','🌦','text','Wetter heute: '||(public.kiez_weather(current_date)->>'name')||' – Pfand '||
    case when (public.kiez_weather(current_date)->>'bonus')::int>=0 then '+' else '' end||(public.kiez_weather(current_date)->>'bonus')||' %.'));
  for r in select name, ends_at from public.events where now() between starts_at and ends_at loop
    items := items || jsonb_build_array(jsonb_build_object('icon','🎉','text','Event läuft: '||r.name||' (bis '||to_char(r.ends_at at time zone 'Europe/Berlin','DD.MM. HH24:MI')||').'));
  end loop;
  for r in select a.name an, d.name dn, w.attacker_score s1, w.defender_score s2, w.resolved, w.winner_gang, w.attacker_gang
           from public.gang_wars w join public.gangs a on a.id=w.attacker_gang join public.gangs d on d.id=w.defender_gang
           where w.started_at>now()-interval '7 days' order by w.started_at desc limit 3 loop
    items := items || jsonb_build_array(jsonb_build_object('icon','⚔️','text',case when r.resolved
      then 'Bandenkrieg „'||r.an||'“ gegen „'||r.dn||'“ endete '||r.s1||':'||r.s2||'.'
      else 'Bandenkrieg tobt: „'||r.an||'“ '||r.s1||':'||r.s2||' „'||r.dn||'“.' end));
  end loop;
  for r in select number, winners, prize, pot from public.lotto_draws order by draw_week desc limit 1 loop
    items := items || jsonb_build_array(jsonb_build_object('icon','🎰','text','Letzte Lottoziehung: Zahl '||r.number||' – '||
      case when r.winners>0 then r.winners||' Gewinner.' else 'kein Gewinner, der Jackpot wächst!' end));
  end loop;
  for r in select p.username, c.category from public.competition_payouts c join public.profiles p on p.id=c.user_id
           where c.rank=1 and c.category in ('bottles','wins') order by c.week_start desc limit 2 loop
    items := items || jsonb_build_array(jsonb_build_object('icon','🏆',
      'text',r.username||' hat den Wochenwettbewerb '||case r.category when 'bottles' then '(Flaschen)' else '(Siege)' end||' gewonnen.'));
  end loop;
  for r in select username from public.profiles where created_at>now()-interval '3 days' and not is_banned order by created_at desc limit 3 loop
    items := items || jsonb_build_array(jsonb_build_object('icon','👋','text','Neu im Kiez: '||r.username||'.'));
  end loop;
  items := items || jsonb_build_array(jsonb_build_object('icon','🗞️','text','Im Kiez sind '||(select count(*) from public.profiles where not is_banned)||
    ' Spieler und '||(select count(*) from public.gangs)||' Banden unterwegs.'));
  return items;
end $function$;
grant execute on function public.kiez_news() to authenticated;

-- Essen im Supermarkt: baut Promille ab und gibt etwas Energie
create or replace function public.buy_food(food text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; cost numeric; sober numeric; en int; label text; decay numeric;
begin
  p := public.kiez_actor();
  case food
    when 'broetchen'  then cost:=0.50; sober:=0.20; en:=5;  label:='Altes Brötchen';
    when 'currywurst' then cost:=2.00; sober:=0.50; en:=15; label:='Currywurst';
    when 'doener'     then cost:=4.00; sober:=1.00; en:=25; label:='Döner mit allem';
    when 'eintopf'    then cost:=7.50; sober:=2.00; en:=40; label:='Eintopf aus der Suppenküche';
    else raise exception 'Das gibt es hier nicht';
  end case;
  if p.money<cost then raise exception 'Dafür reicht deine Kohle nicht'; end if;
  decay := greatest(0, extract(epoch from (now()-p.alcohol_updated_at))/3600*0.5);
  update public.profiles set money=money-cost, energy=least(100,energy+en),
    alcohol_level=greatest(0,alcohol_level-decay-sober), alcohol_updated_at=now()
  where id=p.id returning * into p;
  return jsonb_build_object('label',label,'cost',cost,'energy',en,'sober',sober,'profile',to_jsonb(p));
end $function$;
