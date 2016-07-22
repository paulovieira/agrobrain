
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
    val,
    ts,
    battery,
    agg
from t_measurements
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

select * from read_measurements('{}');
select * from read_measurements('{ "syncLimit": 5}');

*/