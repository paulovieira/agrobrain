/*
Statement level trigger. See example here:
http://stackoverflow.com/questions/24193567/for-each-statement-trigger-example
*/


-- auxiliary table, used only to verify that the callback associated to the t_agg_insert
-- channel is being executed in the js side


/*
create table if not exists temp_notify(ts timestamptz);


create or replace function fn_agg_after_insert()
returns trigger as
$body$
begin

    PERFORM pg_notify('agg', json_build_object('message', 'new_row', 'ts', now())::text);
    RETURN NULL;

end;
$body$
language plpgsql;



drop trigger if exists tg_agg_after_insert on t_agg;

create trigger tg_agg_after_insert
    after insert on t_agg
    for each statement
    execute procedure fn_agg_after_insert();

*/
