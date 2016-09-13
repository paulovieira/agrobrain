CREATE OR REPLACE FUNCTION update_sync(data jsonb, options jsonb)
RETURNS VOID
AS $$

DECLARE
new_row     t_measurements%rowtype;
command text;

BEGIN

IF  jsonb_typeof(data) = 'object' THEN
    data := jsonb_build_array(data);
END IF;

-- new_row is hardcoded with the structure of t_measurements, but that's just because
-- we only want the id field

for new_row in (select * from jsonb_populate_recordset(null::t_measurements, data)) loop

	-- update the "cloud" property in the sync column
    command := format('

	update %I
	set sync = jsonb_set(sync, ''{cloud}'', ''true''::jsonb)
	where id = $1;

    ',
    options->>'table_name'
    );

    raise notice 'command: %', command;

    execute command
    --into strict new_row
    using 
        new_row.id;

    --return next new_row;

end loop;
return;

END;
$$
LANGUAGE plpgsql;



