CREATE OR REPLACE FUNCTION public.finish_training()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles;finished text;pts int;
begin
 select * into p from public.profiles where id=auth.uid() for update;
 if p.training_type is null then raise exception 'Keine Weiterbildung aktiv';end if;
 if p.training_ends_at>now() then raise exception 'Die Weiterbildung läuft noch';end if;
 finished:=p.training_type;
 update public.profiles set
 attack_skill=attack_skill+(finished='attack')::int,
 defense_skill=defense_skill+(finished='defense')::int,
 streetwise=streetwise+(finished='streetwise')::int,
 stamina=stamina+(finished='stamina')::int,
 speech_skill=speech_skill+(finished='speech')::int,
 music_skill=music_skill+(finished='music')::int,
 social_skill=social_skill+(finished='social')::int,
 pickpocket_skill=pickpocket_skill+(finished='pickpocket')::int,
 training_type=null,training_ends_at=null
 where id=auth.uid() returning * into p;
 pts:=p.attack_skill+p.defense_skill+p.streetwise+p.stamina+p.speech_skill+p.music_skill+p.social_skill+p.pickpocket_skill;
 update public.profiles set level=least(150,greatest(level,1+floor(pts/8.0)::int)) where id=auth.uid() returning * into p;
 return jsonb_build_object('finished',finished,'profile',to_jsonb(p));
end $function$;
