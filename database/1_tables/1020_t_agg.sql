DO $$

DECLARE
patch_exists int := _v.register_patch('premiere', 'initial database design');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

create table if not exists t_agg( 
    id serial primary key,
    
    mac text not null,
    sid smallint not null,
    type text not null,
    description text,
    avg real,
    stddev real,
    n smallint,

    ts timestamptz not null default now(),
    battery smallint,
    sync bool default false
);

/*** END CODE FOR CHANGES  ***/

END;
$$;

/*
differences in relation to t_measurements:

-instead of value, here we have 2 aggregated values (avg, stddev) and the respective count used in the calculation (n)
-sync

*/
