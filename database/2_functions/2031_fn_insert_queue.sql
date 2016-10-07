CREATE OR REPLACE FUNCTION insert_queue(data jsonb)
RETURNS SETOF t_queue
AS $fn$

DECLARE
new_row t_queue%rowtype;

BEGIN

new_row := jsonb_populate_record(null::t_queue, data);

-- consider default values if necessary
--new_row.is_admin := COALESCE(new_row.is_admin, false);

-- reuse the new_row variable to assign the output of the insert query
insert into t_queue(job_type, delay)
values (new_row.job_type, new_row.delay)
returning * 
into strict new_row;

return next new_row;
return;

END;
$fn$
LANGUAGE plpgsql;

/*
select * from insert_queue('{ 
    "name": "x", 
    "is_admin": true 
}')
*/