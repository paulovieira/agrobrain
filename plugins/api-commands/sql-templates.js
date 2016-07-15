'use strict';

const internals = {};

module.exports.insertGpioState = function insertGpioState(obj){

    let sql = `

INSERT INTO "t_gpio_state" (
    value, 
    ts_start,
    ts_end
)
VALUES
(
    '${ !!Number(obj.value) }', 
    '${ obj.start }',
    '${ obj.end }'
)

    `;

    
    // remove the comma in the tail (we know l > 0)
    return sql.trim();
};



/*

compute averages and stddev from t_measurements, taking into account these factors:
- the age of the readings (must be < interval minutes)
- the values of the readings according to type (example: for temperatures, we exclude readings that are not between -20 and 70)

the calculations are added directly to t_agg

*/

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

module.exports.aggregateSync = function(n){

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

module.exports.aggregateSync2 = function(n) {

    const sql = `

select 
    id,
    mac, 
    sid,
    type,
    description,
    val,
    ts,
    battery,
    agg
from t_measurements
where sync = false
order by id
limit ${ n };

    `;

    return sql;
};

module.exports.updateSyncStatus = function updateSyncStatus(table, ids){

    let sql = '';

    if (ids.length === 0){

        // make a query that won't change anything and that returns no rows
        sql = `

UPDATE "${ table }" 
set id = -1
where id = -1;

        `;

        return sql.trim();
    }

    sql = `

UPDATE "${ table }"
SET sync = true
WHERE id IN 
(
    ${ ids.map( (obj) => obj.id ).join(',') }
);

    `;

    return sql.trim();
};
