
0) BACKUP!


1) install versioning manually

psql --file database/0_prerequisites/0020_pg_versioning.sql DBNAME


2) manually insert the initial patch (this will make sure the code that creates the table measurements is not executed)

INSERT INTO _v.patches (
    patch_name,
    applied_tsz,
    applied_by,
    requires,
    conflicts,
    description )
VALUES (
    'premiere-t_measurements',
    now(),
    current_user,
    coalesce( NULL, '{}'::text[] ),
    coalesce( NULL, '{}'::text[] ),
    'initial database design');


3) rename the t_log_state table

ALTER TABLE t_log_state RENAME TO t_log_state_old;


4) execute the script runner - 
    will create the new version of t_log_state
    will change the column "sync" in t_measurements
    will drop the column "agg" in t_measurements


5) verify if there are any changes in the port



## 160914
-make the plugin to register the state