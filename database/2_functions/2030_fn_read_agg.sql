
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
    _limit int;
    _command text;

BEGIN

_limit := COALESCE((input->>'syncLimit')::int, 100);
_command := format('

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

', _limit);

--raise notice '_command: %', _command;   

RETURN QUERY EXECUTE _command;
RETURN;

END;

$BODY$

LANGUAGE plpgsql;

/*

select * from read_agg('{}');
select * from read_agg('{ "syncLimit": 5}');

*/
