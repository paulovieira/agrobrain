create table if not exists t_agg( 
    id bigserial primary key,
    
    mac text not null,
    sid smallint not null,
    type text not null,
    description text,

    avg real,
    stddev real,
    n smallint,

    ts timestamptz not null default now(),
    sync bool default false
);

/*
differences in relation to t_raw:

-instead of value, here we have 2 aggregated values (avg, stddev) and the respective count (n)
-sync



insert into t_agg(

    select 
        mac, 
        sid, 
        type, 
        description, 
        avg(val)::real, 
        stddev_pop(val)::real as stddev, 
        count(val)::smallint as n, 
        false as sync,
        --_ts as ts
    from t_raw
    where 
        now() - t_raw.ts > '1 minutes' and
        val > -1 and 
        val < 2000 and
        type = 'h'
    group by mac, sid, type, description
    order by mac, sid, type

)




*/