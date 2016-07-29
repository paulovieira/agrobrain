
DROP FUNCTION IF EXISTS update_sync_field(json);

CREATE FUNCTION update_sync_field(input_obj json)
RETURNS TABLE(
    id int
) AS 

$BODY$

DECLARE
	
command text;

-- variables for input data
_table text;
_new_value bool;
_ids jsonb;


BEGIN

-- assign input data
_table := input_obj->>'table';
_new_value := COALESCE(input_obj->>'value', true);
_ids := input_obj->>'ids';

 raise notice '_table: %', _table;
 raise notice '_new_value: %', _new_value;
 raise notice '_ids: %', _ids;


command := 'select id from t_measurements limit 1';

RETURN QUERY EXECUTE command;
RETURN;

END;
$BODY$
LANGUAGE plpgsql;

/*
select * from update_sync_field('{ "gpioState": false, "userId": 4, "interval": 5 }');

*/

