create table if not exists t_avg( 
    id serial primary key, 
    data jsonb not null, 
    sent_to_cloud bool default false,

    CONSTRAINT data_must_be_object         CHECK (jsonb_typeof(data) = 'object'),
    CONSTRAINT data_must_have_ts_property  CHECK (data->>'ts' IS NOT NULL)
);

