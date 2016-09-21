
CREATE OR REPLACE FUNCTION read_log_state(input json)
RETURNS TABLE(
    id int,
    segment state_segments,
    data jsonb,
    ts_start timestamptz,
    ts_end timestamptz
) AS 

$fn$

DECLARE

query text;

-- variables for input data
_limit int;

BEGIN

-- assign input data
_limit := COALESCE((input->>'limit')::int, 500);

-- if the "cloud" property is not present in the jsonb, the expression 'sync->>''cloud'' is null

query := $$

select 
    id,
    segment,
    data,
    ts_start,
    ts_end
from t_log_state
where sync->>'cloud' is null or sync->>'cloud' = 'false'
order by id
limit $1;

$$;
--raise notice 'query: %', query;   

RETURN QUERY EXECUTE query
USING _limit;
RETURN;

END;

$fn$

LANGUAGE plpgsql;

/*

select * from read_log_state('{}');
select * from read_log_state('{ "limit": 5}');

*/
