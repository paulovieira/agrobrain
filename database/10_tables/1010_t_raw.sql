create table if not exists t_raw(
	mac text not null,
    name text not null,
    val text,
    ts timestamptz not null default now()
);