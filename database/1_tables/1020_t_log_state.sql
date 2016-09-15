DO $$

DECLARE
patch_exists int := _v.register_patch('premiere-t_log_state', 'initial database design');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

create type state_segments as enum ('gpio', 'connectivity', 'cloud', 'app');

create table t_log_state( 
    id serial primary key,

    segment state_segments, 
    data jsonb default '{}',
    ts_start timestamptz not null default now(),
    ts_end timestamptz not null default now(),

    sync jsonb default '{}'
);

/*** END CODE FOR CHANGES  ***/

END;
$$;


/*

The data column has the details about the state. The possible values are:

segment 'gpio' (the state of a given gpio pin)
	{ value: 1, pin: 7, userId: 0 } 
	{ value: 0, pin: 7, userId: 0 } 

segment 'connectivity' (the state of the internet connectivity)
	{ value: 1, delay: 120 } 
	{ value: 0 } 

segment 'cloud' (the state of the cloud server)
	{ value: 1, delay: 130 } 
	{ value: 0 } 

segment 'app' (state of the app, used only to record restarts)
	{ value: 'restart' } (instant)

If for a given segment the data is the same as in the previous record, the ts_end value is updated
If not, a new record is inserted

*/




DO $$

DECLARE
patch_exists int := _v.register_patch('160915-1', 'delete the old version of update_log_state (where the arg was json, not jsonb)');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

drop function if exists update_log_state(json);

/*** END CODE FOR CHANGES  ***/

END;
$$;