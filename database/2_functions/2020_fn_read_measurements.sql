
DROP FUNCTION IF EXISTS read_measurements(json);

CREATE FUNCTION read_measurements(input json)
RETURNS TABLE(
    id int,
    mac text,
    sid smallint,
    type text,
    description text,
    val real,
    ts timestamptz,
    battery smallint,
    agg bool
) AS 

$BODY$

DECLARE

command text;

-- variables for input data
_sync_limit int;

BEGIN

-- assign input data
_sync_limit := COALESCE((input->>'syncLimit')::int, 100);

command := format('

select 
    id,
    mac, 
    sid,
    type,
    description,
    val,
    ts,
    battery,
    agg
from t_measurements
where sync = false
order by id
limit %s;

', _sync_limit);

--raise notice 'command: %', command;	

RETURN QUERY EXECUTE command;
RETURN;

END;

$BODY$

LANGUAGE plpgsql;

/*

select * from read_measurements('{}');
select * from read_measurements('{ "syncLimit": 5}');

*/