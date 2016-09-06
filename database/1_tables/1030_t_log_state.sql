DO $$

DECLARE
patch_exists int := _v.register_patch('premiere', 'initial database design');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

create table if not exists t_log_state( 
    id serial primary key,

    event jsonb,
    ts_start timestamptz not null default now(),
    ts_end timestamptz not null default now(),

    sync bool default false
);

/*** END CODE FOR CHANGES  ***/

END;
$$;

/*
the event column has data of the form

{"type": "reboot"}
{"type": "gpio_high", "user_id": 1}
{"type": "gpio_low", "user_id": 1}
{"type": "reboot"}
...

*/