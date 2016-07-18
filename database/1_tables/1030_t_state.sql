
create table if not exists t_state( 
    id serial primary key,

    event jsonb,
    ts_start timestamptz not null default now(),
    ts_end timestamptz not null default now(),

    sync bool default false
);

/*
the event column has data of the form

{"event": "reboot"}
{"event": "gpio_on", "user_id": 1}
{"event": "gpio_off", "user_id": 1}
{"event": "reboot"}
...

*/