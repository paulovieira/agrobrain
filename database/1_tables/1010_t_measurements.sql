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


/*

mac can be used for geolocation (a table with the current location of each mac)

the combination of sid and type are enough to identify the reading (locally)

description is a free text to help identify/charactereize the reading

agg indicates if the measurement was used in the aggregation

*/
