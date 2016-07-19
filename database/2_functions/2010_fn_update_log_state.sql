DROP FUNCTION IF EXISTS update_log_state(json);

CREATE FUNCTION update_log_state(input_obj json)
RETURNS void AS
$BODY$
DECLARE
	
	_gpio_state bool;
	_user_id    text;
	_interval   interval;

	_last_row   t_log_state%ROWTYPE;
	_event      jsonb;
	_now        timestamptz;

BEGIN
	_gpio_state := input_obj->>'gpioState';
	_user_id    := COALESCE(input_obj->>'userId', 'null');
	_interval   := 2*(input_obj->>'interval')::int || ' seconds';
	_now        := now();

	-- raise notice 'user_id: %', _user_id;

	if _gpio_state = true then
		_event := '{"type": "gpio_pin_high", "user_id": ' || _user_id || '}';
	else
		_event := '{"type": "gpio_pin_low",  "user_id": ' || _user_id || '}';
	end if;

	-- get the last row
	SELECT * FROM t_log_state 
		ORDER BY id DESC
		LIMIT 1 
		INTO _last_row;

	-- case 1) the table is empty; insert new row (with the reboot event before)
	if _last_row.id IS NULL then
		insert into t_log_state(event) values('{"type": "reboot"}');
		insert into t_log_state(event) values(_event);
		return;
	end if;

	-- case 2) the time when the last row was inserted is more than 2 times the length of interval; 
	-- this means the  local server has been off for a while (probably a reboot) and this insert is the 
	-- first one after the server is on again; insert new row (with the reboot event before)
	if (_now - _last_row.ts_end) > _interval then
		insert into t_log_state(event) values('{"type": "reboot"}');
		insert into t_log_state(event) values(_event);
		return;
	end if;
	
	-- case 3) gpio value is diferent than the last one; insert new row
	if((_last_row.event)->'type' != _event->'type') then
		insert into t_log_state(event) values(_event);
		return;
	end if;

	-- case 4) gpio value is the same as the last one, and the last row has been inserted recently;
	-- just modify the end timestamp of the last row (do not insert)
	update t_log_state 
		set ts_end = _now, sync = false 
		where id = _last_row.id;

END;
$BODY$
LANGUAGE plpgsql;

/*
select * from update_log_state('{ "gpioState": false, "userId": 4, "interval": 5 }');
select * from t_log_state order by id;
*/

