
DROP FUNCTION IF EXISTS read_agg(json);

CREATE FUNCTION read_agg(input json)
RETURNS TABLE(
    id int,
    mac text,
    sid smallint,
    type text,
    description text,
    avg real,
    stddev real,
    n smallint,
    ts timestamptz,
    battery smallint
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
    avg,
    stddev,
    n,
    ts,
    battery
from t_agg
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

select * from read_agg('{}');
select * from read_agg('{ "syncLimit": 5}');

*/
