-- Nur lesend: exportiert Funktionen, Tabellen, RLS-Policies, Trigger und Katalogdaten.
select 'function' as kind, p.proname::text as name, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
union all
select 'table', c.relname::text, string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
  || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')
  || case when a.attnotnull then ' not null' else '' end, E',\n' order by a.attnum)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname
union all
select 'policy', (tablename || '.' || policyname)::text,
  'cmd=' || cmd || ' using=' || coalesce(qual, '') || ' check=' || coalesce(with_check, '')
from pg_policies where schemaname = 'public'
union all
select 'trigger', t.tgname::text, pg_get_triggerdef(t.oid)
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
union all select 'data', 'shop_items', (select json_agg(x)::text from shop_items x)
union all select 'data', 'pet_catalog', (select json_agg(x)::text from pet_catalog x)
union all select 'data', 'defense_items', (select json_agg(x)::text from defense_items x)
union all select 'data', 'achievement_defs', (select json_agg(x)::text from achievement_defs x)
order by 1, 2;
