
create table if not exists t_log(
    id serial primary key,
    data jsonb not null,
    sync bool default false
);
