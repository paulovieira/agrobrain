
CREATE OR REPLACE FUNCTION read_measurements(input json)
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

$fn$

DECLARE

query text;

-- variables for input data
_limit int;

BEGIN

-- assign input data
_limit := COALESCE((input->>'limit')::int, 500);

query := $$

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

select * from read_measurements('{}');
select * from read_measurements('{ "limit": 5}');

*/