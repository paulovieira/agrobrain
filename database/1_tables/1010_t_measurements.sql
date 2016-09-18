DO $$

DECLARE
patch_exists int := _v.register_patch('premiere-t_measurements', 'initial database design');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/








create table t_measurements(
	id serial primary key,

	mac text not null,
    sid smallint not null,
    type text not null,
    description text,
    val real,

    ts timestamptz not null default now(),
    battery smallint,
    agg bool default false, -- will be dropped
    sync bool default false -- will be changed to a jsonb column in a later patch
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




DO $$

DECLARE
patch_exists int := _v.register_patch('160913-1', 'change the column "sync" in t_measurements from bool to jsonb');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

/* 
1) rename old column (bool)
2) add new jsonb column (with the same name of the old one)
3) create a new property in the new column
*/

alter table t_measurements
rename sync to sync_old;

alter table t_measurements
add column sync jsonb default '{}';

update t_measurements
set sync = jsonb_set(sync, '{cloud}', sync_old::text::jsonb);


/*** END CODE FOR CHANGES  ***/

END;
$$;




DO $$

DECLARE
patch_exists int := _v.register_patch('160913-2', 'drop the column "agg" in t_measurements');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

alter table t_measurements
drop column agg cascade;

/*** END CODE FOR CHANGES  ***/

END;
$$;




DO $$

DECLARE
patch_exists int := _v.register_patch('160913-3', 'add default value for column "description" in t_measurements');

BEGIN

IF patch_exists THEN
    RETURN;
END IF;

/*** BEGIN CODE FOR CHANGES  ***/

alter table t_measurements 
alter column description set default '';

/*** END CODE FOR CHANGES  ***/

END;
$$;