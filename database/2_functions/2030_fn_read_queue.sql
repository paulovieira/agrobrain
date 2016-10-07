

CREATE OR REPLACE FUNCTION queue_event_ttf(ts_created timestamptz, delay_minutes int)
RETURNS integer
AS 

$fn$

DECLARE
ttf int;

BEGIN

ttf := (
    (
        extract(epoch from (ts_created + (delay_minutes || ' minutes')::interval)) - 
        extract(epoch from now()) 
    ) / 60
)::int;

RETURN ttf;

END;
$fn$
LANGUAGE plpgsql;



/* read events in the queue that are pending */
 -- TODO: use skip locked to handle the case of multiple clients reading jobs

CREATE OR REPLACE FUNCTION read_queue_pending(input jsonb)
RETURNS TABLE(
    id int,
    job_type job_types,
    ts_created timestamptz,
    delay int,
    time_to_finish int
) AS 

$fn$

DECLARE

query text;


-- variables for input data

BEGIN

RETURN QUERY

select 
    t.id,
    t.job_type,
    t.ts_created,
    t.delay,
    queue_event_ttf(t.ts_created, t.delay)  -- time to finish, in minutes
from t_queue t
where t.ts_executed is null
order by t.id;

--raise notice 'query: %', query;   

RETURN;

END;

$fn$

LANGUAGE plpgsql;

/*

select * from read_queue_pending('{}');


*/