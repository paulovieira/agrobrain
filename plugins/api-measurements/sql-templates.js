'use strict';

const internals = {};

internals.minValH = -1;
internals.maxValH = 2000;

internals.minValT = -20;
internals.maxValT = 80;


module.exports.aggregate = function aggregate(interval){

    var sql = `
DO 
$$ 
DECLARE
    _ts timestamptz;
BEGIN

    _ts := NOW();


    -- 1a) aggregate temperatures (consider only values between -20 and 80)

    insert into t_agg(
        ${ internals.selectAgg(interval, 't', internals.minValT, internals.maxValT) }
    );

    -- 1b) mark rows used in the aggregated data (use the same where condition as in selectAgg)
    
    update t_measurements
    set agg = true
    where 
        now() - t_measurements.ts < '${ interval } minutes' and
        type = 't' and
        (val >= ${ internals.minValT } and val <= ${ internals.maxValT });





    -- 2a) aggregate humidity (consider only values between -1 and 2000)

    insert into t_agg(
        ${ internals.selectAgg(interval, 'h', internals.minValH, internals.maxValH) }
    );

    -- 2b) mark rows used in the aggregated data (use the same where condition as in selectAgg)

    update t_measurements
    set agg = true
    where 
        now() - t_measurements.ts < '${ interval } minutes' and
        type = 'h' and
        (val >= ${ internals.minValH } and val <= ${ internals.maxValH });

END 
$$
LANGUAGE plpgsql 
    `;

    return sql.trim();
};

internals.selectAgg = function(interval, type, minVal, maxVal){

    // make sure there is no comma at the end 
    // (as this query will be used as the input to a insert into)
    var sql = `
select 
    nextval(pg_get_serial_sequence('t_agg', 'id')) as id,
    mac, 
    sid, 
    type, 
    description, 
    avg(val)::real, 
    stddev_pop(val)::real as stddev, 
    count(val)::smallint as n, 
    _ts as ts,
    avg(battery)::smallint,
    false as sync
from t_measurements
where 
    now() - t_measurements.ts < '${ interval } minutes' and
    type = '${ type }' and
    (val >= ${ minVal } and val <= ${ maxVal }) and
    agg = false
group by mac, sid, type, description
order by mac, sid, type, description
    `;

    return sql;
};

module.exports.selectForSync = {};

module.exports.aggregateSync = module.exports.selectForSync.t_agg = function(n){

    var sql = `
select 
    id,
    mac, 
    sid,
    type,
    description,
    avg,
    stddev,
    n,
    ts,
    battery
from t_agg
where sync = false
order by id
limit ${ n };
    `;

    return sql;
};

