
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
    battery smallint
) AS 

$BODY$

DECLARE

command text;

-- variables for input data
_limit int;

BEGIN

-- assign input data
_limit := COALESCE((input->>'limit')::int, 500);

command := format('

select 
    id,
    mac, 
    sid,
    type,
    description,
    val,
    ts,
    battery
from t_measurements
where sync->>''cloud'' = ''false''
order by id
limit %s;

', _limit);

--raise notice 'command: %', command;	

RETURN QUERY EXECUTE command;
RETURN;

END;

$BODY$

LANGUAGE plpgsql;

/*

select * from read_measurements('{}');
select * from read_measurements('{ "limit": 5}');

*/