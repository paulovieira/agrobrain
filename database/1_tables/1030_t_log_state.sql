DO $$

DECLARE
patch_exists int := _v.register_patch('premiere-t_log_state', 'initial database design');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

create type state_segments as enum ('gpio', 'connectivity', 'cloud', 'system');

create table t_log_state( 
    id serial primary key,

    segment state_segments, 
    data jsonb default '{}',
    ts_start timestamptz not null default now(),
    ts_end timestamptz not null default now(),

    sync jsonb default '{ "cloud": false }'
);

/*** END CODE FOR CHANGES  ***/

END;
$$;


/*

The data column has the details about the state. The possible values are:

segment 'gpio'
	{ state: 'up', pin: 7 } 
	{ state: 'down', pin: 7 } 

segment 'connectivity'
	{ state: 'up', ping: 120 } 
	{ state: 'down' } 

segment 'cloud'
	{ state: 'up', ping: 120 } 
	{ state: 'down' } 

segment 'system'
	{ state: 'reboot' } (instant)
	{ state: 'up', load: 0.5 } 
	{ state: 'down' } 

*/
