DO $$

DECLARE
patch_exists int := _v.register_patch('160929-1', 't_queue');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

create type job_types as enum ('irrigation_on', 'irrigation_off');

create table t_queue( 
    id serial primary key,
    job_type job_types,
    data jsonb default '{}',
    ts_created timestamptz not null default now(),
    delay int default 1, -- delay to execute the job
    ts_executed timestamptz,
    sync jsonb default '{}'
);

/*** END CODE FOR CHANGES  ***/

END;
$$;


