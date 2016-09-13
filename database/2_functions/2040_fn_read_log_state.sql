
DROP FUNCTION IF EXISTS read_log_state(json);

CREATE FUNCTION read_log_state(input json)
RETURNS TABLE(
    id int,
    segment state_segments,
    data jsonb,
    ts_start timestamptz,
    ts_end timestamptz
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
    segment,
    data,
    ts_start,
    ts_end
from t_log_state
where sync->>''cloud'' = ''false''
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

select * from read_log_state('{}');
select * from read_log_state('{ "syncLimit": 5}');

*/
