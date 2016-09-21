
CREATE OR REPLACE FUNCTION update_sync(data jsonb, options jsonb)
RETURNS VOID
AS $fn$

DECLARE
new_row     t_measurements%rowtype;
query text;

-- variables for input data
_table text;

BEGIN

IF  jsonb_typeof(data) = 'object' THEN
    data := jsonb_build_array(data);
END IF;

_table := coalesce(options->>'table', '');

query := $$

-- update the "cloud" property in the sync column
update %I
set sync = jsonb_set(sync, '{cloud}', 'true'::jsonb)
where id = $1;

$$;

query := format(query, _table);
--raise notice 'query: %', query;

-- new_row record type is hardcoded as t_measurements, but that's ok because
-- we only want the id field (which is present in t_measurements and t_log_state)

for new_row in (select * from jsonb_populate_recordset(null::t_measurements, data)) loop

    execute query
    using 
        new_row.id;

end loop;
return;

END;
$fn$
LANGUAGE plpgsql;
