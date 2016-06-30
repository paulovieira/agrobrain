create table if not exists t_avg( 
    id serial primary key, 
    data jsonb not null, 
    sent_to_cloud bool default false,

    CONSTRAINT data_must_be_object         CHECK (jsonb_typeof(data) = 'object'),
    CONSTRAINT data_must_have_ts_property  CHECK (data->>'ts' IS NOT NULL)
);

/*
place the ts in a separate field, instead of being in the data json


new:

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

differences in relation to t_raw:
-instead of value, here we have aggregated values (avg, stddev, n)
-sent_to_cloud


insert into t_raw values('mac', 111, 't', 'desc' , 10.01);
insert into t_raw values('mac', 111, 't', 'desc' , 20.01);
insert into t_raw values('mac', 111, 'h', 'desc' , 80.01);
insert into t_raw values('mac',  112, 'h', 'desc 2' , 100.01);
insert into t_raw values('mac',  112, 'h', 'desc 2' , 200.01);
insert into t_raw values('mac2', 113, 't', 'desc' , 30.01);
insert into t_raw values('mac2', 113, 't', 'desc' , 40.01);


insert into t_agg(

    select 
        mac, 
        sid, 
        type, 
        description, 
        avg(val)::real, 
        stddev_pop(val)::real as stddev, 
        count(val)::smallint as n, 
        false as sent_to_cloud 
    from t_raw
    where 
        val > 0 and 
        val < 300 and 
        type = 'h'
    group by mac, sid, type, description
    order by mac,sid,type

)


*/