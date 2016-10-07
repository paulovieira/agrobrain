/*
update the ts_executed column in one job (meaning the job has completed);
this job won't be return in calls to read_queue_pending
*/

CREATE OR REPLACE FUNCTION update_queue_executed(data jsonb)
RETURNS SETOF t_queue 
AS $fn$

DECLARE
updated_row t_queue%rowtype;
current_row t_queue%rowtype;
n int;

BEGIN

current_row := jsonb_populate_record(null::t_queue, data);

update t_queue
set ts_executed = now()
where id = current_row.id
returning * 
into strict updated_row;

return next updated_row;
return;

END;
$fn$
LANGUAGE plpgsql;

/*
select * from update_queue_executed('{ "id": 8 }')
*/