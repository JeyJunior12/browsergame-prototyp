CREATE OR REPLACE FUNCTION public.craft_item(wanted_item text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
             declare
              p public.profiles;
               item public.shop_items;
                need_nails int; need_wood int; need_shards int; need_textile int;
                begin
                 select * into p from public.profiles where id=auth.uid() for update;
                  select * into item from public.shop_items where id=wanted_item and category='craft';
                   if item.id is null then raise exception 'Das kannst du nicht herstellen';end if;
                    case wanted_item
                      when 'nagelkeule' then need_nails:=14;need_wood:=2;need_shards:=0;need_textile:=1;
                        when 'holzschild' then need_nails:=2;need_wood:=8;need_shards:=0;need_textile:=1;
                          when 'stachelschild' then need_nails:=26;need_wood:=10;need_shards:=0;need_textile:=1;
                            when 'glasstachelschild' then need_nails:=38;need_wood:=24;need_shards:=18;need_textile:=0;
                              when 'doppeltes_holzschild' then need_nails:=13;need_wood:=41;need_shards:=0;need_textile:=2;
                                when 'ramponierter_anzug' then need_nails:=16;need_wood:=2;need_shards:=0;need_textile:=6;
                                  when 'feiner_anzug' then need_nails:=8;need_wood:=2;need_shards:=0;need_textile:=16;
                                    when 'kaputter_regenschirm' then need_nails:=11;need_wood:=6;need_shards:=0;need_textile:=8;
                                      when 'regenschirm' then need_nails:=14;need_wood:=12;need_shards:=0;need_textile:=19;
                                        else raise exception 'Unbekanntes Rezept';
                                         end case;
                                          if p.mat_nails<need_nails or p.mat_wood<need_wood or p.mat_shards<need_shards or p.mat_textile<need_textile then
                                            raise exception 'Dafür fehlen dir noch Materialien';
                                             end if;
                                              if p.money<item.price then raise exception 'Dafür reicht deine Kohle nicht';end if;
                                               update public.profiles set
                                                 money=money-item.price,
                                                   mat_nails=mat_nails-need_nails,
                                                     mat_wood=mat_wood-need_wood,
                                                       mat_shards=mat_shards-need_shards,
                                                         mat_textile=mat_textile-need_textile
                                                          where id=auth.uid() returning * into p;
                                                           insert into public.inventory(user_id,item_id,quantity) values(auth.uid(),wanted_item,1)
                                                            on conflict(user_id,item_id) do update set quantity=inventory.quantity+1;
                                                             return jsonb_build_object('item',to_jsonb(item),'profile',to_jsonb(p));
                                                             end;
                                                             $function$;
