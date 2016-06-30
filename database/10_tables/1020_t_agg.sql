create table if not exists t_agg( 
    mac text not null,
    sid smallint not null,
    type text not null,
    description text,

    avg real,
    stddev real,
    n smallint,

    sent_to_cloud bool default false,
    ts timestamptz not null default now()
);

/*
differences in relation to t_raw:

-instead of value, here we have aggregated values (avg, stddev, n)
-sent_to_cloud



insert into t_agg(

    select 
        mac, 
        sid, 
        type, 
        description, 
        avg(val)::real, 
        stddev_pop(val)::real as stddev, 
        count(val)::smallint as n, 
        false as sent_to_cloud,
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