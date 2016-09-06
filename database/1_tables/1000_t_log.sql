DO $$

DECLARE
patch_exists int := _v.register_patch('premiere', 'initial database design');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

create table if not exists t_log(
    id serial primary key,
    data jsonb not null,
    sync bool default false
);

/*** END CODE FOR CHANGES  ***/

END;
$$;