
DROP FUNCTION IF EXISTS read_log_state(json);

CREATE FUNCTION read_log_state(input json)
RETURNS TABLE(
    id int,
    event jsonb,
    ts_start timestamptz,
    ts_end timestamptz
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
    event, 
    ts_start,
    ts_end
from t_log_state
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

select * from read_log_state('{}');
select * from read_log_state('{ "syncLimit": 5}');

*/
