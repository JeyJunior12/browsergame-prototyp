CREATE OR REPLACE FUNCTION public.buy_alcohol(drink_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                    declare
                                                      p public.profiles%rowtype;
                                                        v_cost numeric;
                                                          v_promille numeric;
                                                            v_minutes integer;
                                                              v_bonus integer;
                                                                v_label text;
                                                                  decay_hours numeric;
                                                                  begin
                                                                    select * into p from public.profiles where id = auth.uid() for update;
                                                                      if p.id is null then raise exception 'Profil nicht gefunden.'; end if;
                                                                        case drink_type
                                                                            when 'beer' then v_cost:=1.00; v_promille:=0.12; v_minutes:=30; v_bonus:=10; v_label:='Dosenbier';
                                                                                when 'wine' then v_cost:=2.50; v_promille:=0.25; v_minutes:=60; v_bonus:=20; v_label:='Kartonwein';
                                                                                    when 'schnaps' then v_cost:=3.50; v_promille:=0.40; v_minutes:=45; v_bonus:=25; v_label:='Kurzer';
                                                                                        when 'vodka' then v_cost:=6.00; v_promille:=0.70; v_minutes:=75; v_bonus:=32; v_label:='Wodka';
                                                                                            when 'feuerwasser' then v_cost:=9.00; v_promille:=1.00; v_minutes:=120; v_bonus:=40; v_label:='Feuerwasser';
                                                                                                else raise exception 'Dieses Getränk gibt es nicht.';
                                                                                                  end case;
                                                                                                    if p.money < v_cost then raise exception 'Dafür reicht dein Bargeld nicht.'; end if;
                                                                                                      decay_hours := extract(epoch from (now()-p.alcohol_updated_at))/3600;
                                                                                                        if decay_hours>0 then p.alcohol_level:=greatest(0,p.alcohol_level-decay_hours*0.50); end if;
                                                                                                          update public.profiles set
                                                                                                              money = money - v_cost,
                                                                                                                  alcohol_level = least(7.00, p.alcohol_level + v_promille),
                                                                                                                      alcohol_updated_at = now(),
                                                                                                                          alcohol_bonus_until = greatest(coalesce(alcohol_bonus_until, now()), now()) + make_interval(mins => v_minutes)
                                                                                                                            where id = auth.uid() returning * into p;
                                                                                                                              return jsonb_build_object(
                                                                                                                                  'profile', to_jsonb(p),
                                                                                                                                      'label', v_label,
                                                                                                                                          'cost', v_cost,
                                                                                                                                              'promille', p.alcohol_level,
                                                                                                                                                  'bonus_percent', v_bonus,
                                                                                                                                                      'bonus_until', p.alcohol_bonus_until
                                                                                                                                                        );
                                                                                                                                                        end;
                                                                                                                                                        $function$;
