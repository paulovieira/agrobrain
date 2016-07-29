
DROP FUNCTION IF EXISTS update_log_state(json);

CREATE FUNCTION update_log_state(input_obj json)
RETURNS void AS
$BODY$
DECLARE

last_row   t_log_state%ROWTYPE;
new_event  jsonb := '{}';
now        timestamptz := now();

-- variables for input data
_gpio_state bool;
_user_id    text;
_interval   interval;

BEGIN

-- assign input data
_gpio_state := input_obj->>'gpioState';
_user_id    := COALESCE(input_obj->>'userId'::text, 'null');
_interval   := 2*(input_obj->>'interval')::int || ' seconds';

-- raise notice 'user_id: %', _user_id;

new_event := jsonb_set(new_event, '{userId}', _user_id::text::jsonb);
if _gpio_state = true then
	new_event := jsonb_set(new_event, '{type}', '"gpio_pin_high"'::text::jsonb);
else
	new_event := jsonb_set(new_event, '{type}', '"gpio_pin_low"'::text::jsonb);
end if;

-- get the last row
SELECT * FROM t_log_state 
	ORDER BY id DESC
	LIMIT 1 
	INTO last_row;

-- case 1) the table is empty; insert new event (with the reboot event before)
if last_row.id IS NULL then
	insert into t_log_state(event) values('{"type": "reboot"}');
	insert into t_log_state(event) values(new_event);
	return;
end if;

-- case 2) the time when the last row was inserted is more than 2 times the length of interval; 
-- this means the  local server has been off for a while (probably a reboot) and this insert is the 
-- first one after the server is on again; same as before: insert new event (with the reboot event before)
if (now - last_row.ts_end) > _interval then
	insert into t_log_state(event) values('{"type": "reboot"}');
	insert into t_log_state(event) values(new_event);
	return;
end if;

-- case 3) gpio value is diferent than the last one; insert new event
if (last_row.event)->>'type' != new_event->>'type' then
	insert into t_log_state(event) values(new_event);
	return;
end if;

-- case 4) gpio value is the same as the last one, and the last row has been inserted recently;
-- just update the end timestamp of the last row (use the same event)
update t_log_state 
	set ts_end = now, sync = false 
	where id = last_row.id;


END;
$BODY$
LANGUAGE plpgsql;

/*
select * from update_log_state('{ "gpioState": false, "userId": 4, "interval": 5 }');
select * from t_log_state order by id;
*/

