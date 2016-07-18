DROP FUNCTION IF EXISTS update_state(json);

CREATE FUNCTION update_state(input_obj json)
RETURNS void AS
$BODY$
DECLARE
	_last_row t_state%ROWTYPE;
	_gpio     bool;
	_user_id  text;
	_gpio_event jsonb;
	_now      timestamptz;
	_interval interval;

BEGIN
	SELECT input_obj->>'gpio'  INTO _gpio;
	SELECT COALESCE(input_obj->>'user_id', 'null') INTO _user_id;
	SELECT now()               INTO _now;
	SELECT 2*(input_obj->>'interval')::int || ' seconds' INTO _interval;

	raise notice 'user_id: %', _user_id;

	if _gpio = true then
		_gpio_event := '{"description": "gpio_on", "user_id": ' || _user_id || '}';
	else
		_gpio_event := '{"description": "gpio_off", "user_id": ' || _user_id || '}';
	end if;

	SELECT * FROM t_state 
		ORDER BY id DESC
		LIMIT 1 
		INTO _last_row;

	-- case 1) the table is empty; insert new row (with the reboot event before)
	if _last_row.id IS NULL then
		insert into t_state(event) values('{"description": "reboot"}');
		insert into t_state(event) values(_gpio_event);
		return;
	end if;

	-- case 2) the last row was inserted at more than 2 times the length of interval; 
	-- this means the  local server has been off and this insert is the first one after
	-- the reboot; insert new row (with the reboot event before)
	if (_now - _last_row.ts_end) > _interval then
		insert into t_state(event) values('{"description": "reboot"}');
		insert into t_state(event) values(_gpio_event);
		return;
	end if;

	
	-- case 3) gpio value is diferent than the last one; insert new row
	if((_last_row.event)->'description' != _gpio_event->'description') then
		insert into t_state(event) values(_gpio_event);
		return;
	end if;

	-- case 4) gpio value is the same as the last one, and the last row has been inserted recently;
	-- just modify the last row (do not insert)
	update t_state 
		set ts_end = _now, sync = false 
		where id = _last_row.id;

END;
$BODY$
LANGUAGE plpgsql;

/*
select * from update_state('{ "gpio": false, "user_id": 4, "interval": 5 }');
select * from t_state order by id;
*/