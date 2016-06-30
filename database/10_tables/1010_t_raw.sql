create table if not exists t_raw(
	mac text not null,
    sid smallint not null,
    type text not null,
    description text,
    val real,
    ts timestamptz not null default now()
);

/*
mac is used for geolocation

the combination of sid and type are enough to identify the reading 

description is a free text to help identify/charactereize the reading

*/


