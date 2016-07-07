/*
Statement level trigger. See example here:
http://stackoverflow.com/questions/24193567/for-each-statement-trigger-example
*/


-- auxiliary table, used only to verify that the callback associated to the t_agg_insert
-- channel is being executed in the js side
create table if not exists temp_notify(ts timestamptz);


create or replace function fn_agg_insert_notify()
returns trigger as
$body$
begin

    PERFORM pg_notify('t_agg_insert', json_build_object('ts', now())::text);
    RETURN NULL;

end;
$body$
language plpgsql;



drop trigger if exists tg_agg_insert on t_agg;

create trigger tg_agg_insert
    after insert on t_agg
    for each statement
    execute procedure fn_agg_insert_notify();