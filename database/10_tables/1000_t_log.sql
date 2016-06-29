create table if not exists t_log(
    id serial primary key,
    data jsonb not null,
    sent_to_cloud bool default false
);
