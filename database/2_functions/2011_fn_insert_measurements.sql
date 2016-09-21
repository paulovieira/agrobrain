
CREATE OR REPLACE FUNCTION insert_measurements(data jsonb)
RETURNS SETOF t_measurements
AS $fn$

DECLARE
new_row t_measurements%rowtype;

BEGIN

IF  jsonb_typeof(data) = 'object' THEN
    data := jsonb_build_array(data);
END IF;

for new_row in (select * from jsonb_populate_recordset(null::t_measurements, data)) loop

    -- reuse the new_row variable to assign the output of the insert query
    insert into t_measurements(
        mac, 
        sid,
        type,
        description,
        val,
        battery
    )
    values (
        new_row.mac, 
        new_row.sid,
        new_row.type,
        new_row.description,
        new_row.val,
        new_row.battery
    )
    returning * 
    into strict new_row;

    -- append the record to the output recordset
    return next new_row;
end loop;

return;

END;
$fn$
LANGUAGE plpgsql;


/*

select * from insert_measurements(' 
  {
    "sid": 1235,
    "value": 99.9,
    "type": "h",
    "desc": "pt_robotics",
    "mac": "999-888-666",
    "description": "pt_robotics",
    "val": 99.9
  }
');


select * from insert_measurements(' 
[
  {
    "sid": 1235,
    "value": 99.9,
    "type": "h",
    "desc": "pt_robotics",
    "mac": "999-888-666",
    "description": "pt_robotics",
    "val": 99.9
  },
  {
    "sid": 1235,
    "value": 20.1,
    "type": "t",
    "desc": "pt_robotics",
    "mac": "999-888-666",
    "description": "pt_robotics",
    "val": 20.1
  }
]
');


*/