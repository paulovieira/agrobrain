DO $$

DECLARE
patch_exists int := _v.register_patch('premiere', 'initial database design');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

create table if not exists t_measurements(
	id serial primary key,

	mac text not null,
    sid smallint not null,
    type text not null,
    description text,
    val real,

    ts timestamptz not null default now(),
    battery smallint,
    agg bool default false,
    sync bool default false
);

/*** END CODE FOR CHANGES  ***/

END;
$$;

/*

mac can be used for geolocation (a table with the current location of each mac)

the combination of sid and type are enough to identify the reading (locally)

description is a free text to help identify/charactereize the reading

agg indicates if the measurement was used in the aggregation


TODO: sync should be a jsonb instead of bool (just like the table in the agrobrain-cloud). In this case it makes sense to have only 'cloud' as the destination of the syncronization but in the future we might have others: {'google-sheets': true, 'backup-amazon-abc': true, 'backup-do-xyz': true})
*/
