/*
Statement level trigger. See example here:
http://stackoverflow.com/questions/24193567/for-each-statement-trigger-example
*/

create or replace function fn_agg_insert_notify()
returns trigger as
$body$
begin

    PERFORM pg_notify('t_agg_insert', json_build_object('ts', now())::text);
    --insert into temp_notify values(now());
    RETURN NULL;

end;
$body$
language plpgsql;



drop trigger if exists tg_agg_insert on t_agg;

create trigger tg_agg_insert
    after insert on t_agg
    for each statement
    execute procedure fn_agg_insert_notify();