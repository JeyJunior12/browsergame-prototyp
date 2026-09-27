-- 0031: Städte-Grundlage (ROADMAP 10, 123, 124): mehrere Städte als eigene Welten – vorbereitet, aber gesperrt,
-- bis eine Stadt voll genug ist (Richtwert: 250 aktive Spieler je offener Stadt). Umzug kostet Geld und einen Tag.

create table if not exists public.cities(
  id text primary key, name text not null, description text not null, sort_order integer not null,
  is_open boolean not null default false);
insert into public.cities values
 ('hafenstadt','Hafenstadt','Die Stadt, in der alles begann: Bahnhof, Hafen, Villen und ganz viel Pfand.',1,true),
 ('flussstadt','Flussstadt','Brücken, Uferwege und Flaschen im Schilf – öffnet, wenn die Hafenstadt voll ist.',2,false),
 ('bergstadt','Bergstadt','Steile Gassen, frische Luft, reiche Touristen – später.',3,false)
on conflict (id) do nothing;
alter table public.cities enable row level security;
drop policy if exists cities_read on public.cities;
create policy cities_read on public.cities for select using (true);
grant select on public.cities to authenticated, anon;

alter table public.profiles add column if not exists city text references public.cities(id) default 'hafenstadt';
alter table public.profiles add column if not exists city_moved_at timestamptz;
alter table public.gangs add column if not exists city text references public.cities(id) default 'hafenstadt';
update public.profiles set city='hafenstadt' where city is null;
update public.gangs set city='hafenstadt' where city is null;
insert into public.feature_flags(key,enabled,min_players,label) values ('cities',false,250,'Mehrere Städte') on conflict (key) do nothing;

-- Nächste Stadt öffnet automatisch, sobald jede offene Stadt den Richtwert erreicht (lazy beim Abfragen)
create or replace function public.kiez_open_cities()
returns void language plpgsql security definer set search_path to 'public' as $function$
declare need int := coalesce((select min_players from public.feature_flags where key='cities'),250);
begin
  if not exists(select 1 from public.cities c where c.is_open and (select count(*) from public.profiles p where p.city=c.id and not p.is_banned and p.energy_updated_at>now()-interval '7 days') < need) then
    update public.cities set is_open=true where id=(select id from public.cities where not is_open order by sort_order limit 1);
  end if;
end $function$;
revoke execute on function public.kiez_open_cities() from public, anon, authenticated;

create or replace function public.city_overview()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare me public.profiles; need int := coalesce((select min_players from public.feature_flags where key='cities'),250);
begin
  select * into me from public.profiles where id=auth.uid();
  if me.id is null then raise exception 'Nicht angemeldet'; end if;
  if public.kiez_feature_on('cities') then perform public.kiez_open_cities(); end if;
  return jsonb_build_object('mine',me.city,'enabled',public.kiez_feature_on('cities'),'needed',need,
    'cities',(select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'description',c.description,'open',c.is_open,
      'players',(select count(*) from public.profiles p where p.city=c.id and not p.is_banned and p.energy_updated_at>now()-interval '7 days')) order by c.sort_order) from public.cities c));
end $function$;

-- Umzug: 100 € + 1 Tag Wartezeit zwischen Umzügen, Bandenmitglieder müssen erst austreten
create or replace function public.move_city(wanted text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare p public.profiles; c public.cities;
begin
  p := public.kiez_actor();
  if not public.kiez_feature_on('cities') then raise exception 'Weitere Städte öffnen, sobald die Hafenstadt voll ist – bald verfügbar'; end if;
  select * into c from public.cities where id=wanted;
  if c.id is null or not c.is_open then raise exception 'Diese Stadt ist noch zu'; end if;
  if p.city=wanted then raise exception 'Da wohnst du schon'; end if;
  if exists(select 1 from public.gang_members where user_id=p.id) then raise exception 'Erst die Bande verlassen – Banden bleiben in ihrer Stadt'; end if;
  if p.city_moved_at > now()-interval '1 day' then raise exception 'Du bist gerade erst umgezogen'; end if;
  if p.money < 100 then raise exception 'Der Umzug kostet 100 €'; end if;
  update public.profiles set money=money-100, city=wanted, city_moved_at=now(), district=null where id=p.id returning * into p;
  return jsonb_build_object('city',c.name,'profile',to_jsonb(p));
end $function$;
