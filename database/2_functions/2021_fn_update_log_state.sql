
CREATE OR REPLACE FUNCTION update_log_state(input_obj jsonb)
RETURNS void AS
$fn$
DECLARE

last_row_segment  t_log_state%ROWTYPE;
last_row_restart  t_log_state%ROWTYPE;
now               timestamptz := now();
insert_new_record bool;
count int;

-- variables for input data
_segment state_segments;
_data jsonb;

BEGIN

-- assign input data; 
-- the value in "segment" must be one of the entries in the enum (if not an error will be raised)

_segment := COALESCE(input_obj->>'segment', '');
_data    := COALESCE(input_obj->>'data', '{}');

-- get the the number of properties in the data object
select count(*) from jsonb_object_keys(_data) into count;

if count = 0 then
     RAISE EXCEPTION 'the "data" object must have some properties';
 end if;

-- for a gpio state, make sure a default userId is present
if _segment = 'gpio' and _data->>'userId' is null then
	_data := jsonb_set(_data, '{userId}', 0::text::jsonb);
end if;

-- last restart row
SELECT * FROM t_log_state 
	WHERE segment = 'app' and data->>'value' = 'restart'
	ORDER BY id DESC
	LIMIT 1 
	INTO last_row_restart;

-- last row of this segment after the last restart row
SELECT * FROM t_log_state 
	WHERE segment = _segment and id > coalesce(last_row_restart.id, 0)
	ORDER BY id DESC
	LIMIT 1 
	INTO last_row_segment;


-- raise notice 'last_row_segment.data: %', last_row_segment.data;
-- raise notice '_data: %', _data;

if last_row_segment.id is null then
	insert_new_record := true;	
elseif last_row_segment.data <> _data then
	insert_new_record := true;
else
	insert_new_record := false;
end if;

--raise notice 'insert_new_record: %', insert_new_record;


if insert_new_record = true then
	
	insert into t_log_state(segment, data, ts_start, ts_end) 
	values(_segment, _data, now, now);

	if last_row_segment.id is not null then

		update t_log_state 
		set ts_end = now
		where id = last_row_segment.id;

	end if;		
-- if the data of the last record for this segment (after the last restart row) is the same, 
-- just update ts_end and sync
else 

	update t_log_state 
	set 
		ts_end = now, 
		sync = sync - 'cloud'
	where id = last_row_segment.id;

end if;


END;
$fn$
LANGUAGE plpgsql;

/*

select * from update_log_state('{ "segment": "gpio", "data": { "value": 0, "pin": 7 } }');
select * from t_log_state order by id;

select * from update_log_state('{ "segment": "gpio", "data": { "value": 1, "pin": 7 } }');
select * from t_log_state order by id;

*/

