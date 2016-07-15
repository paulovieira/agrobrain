
create table if not exists t_gpio_state( 
    id serial primary key,
    
    value bool,
    ts_start timestamptz not null,
    ts_end timestamptz not null,

    sync bool default false
);
