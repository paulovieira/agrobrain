const internals = {};

internals.minValH = -1;
internals.minValH = 2000;

internals.minValH = -20;
internals.minValH = 80;

module.exports.insert = function insert(mac, data){

    var sql = `

INSERT INTO "t_raw" (
    mac, 
    sid,
    type,
    description,
    val
)
VALUES

    `;

    for(var i=0, l=data.length; i < l; i++){

        sql += `
(
    '${ mac                   }', 
     ${ data[i]['sid']        } ,
    '${ data[i]['type']       }',
    '${ data[i]['desc'] || '' }',
     ${ data[i]['value']      }
),
        `;
    }
    
    // remove the comma in the tail (we know l > 0)
    return sql.trim().slice(0, -1);
};



/*

compute averages and stddev from t_raw, taking into account these factors:
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
    
    update t_raw
    set agg = true
    where 
        now() - t_raw.ts < '${ interval } minutes' and
        type = 't' and
        (val >= ${ internals.minValT }) and val <= ${ internals.maxValT });





    -- 2a) aggregate humidity (consider only values between -1 and 2000)

    insert into t_agg(
        ${ internals.selectAgg(interval, 'h', internals.minValH, internals.maxValH) }
    );

    -- 2b) mark rows used in the aggregated data (use the same where condition as in selectAgg)

    update t_raw
    set agg = true
    where 
        now() - t_raw.ts < '${ interval } minutes' and
        type = 'h' and
        (val >= ${ internals.minValH }) and val <= ${ internals.maxValH });

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
    false as sync
from t_raw
where 
    now() - t_raw.ts < '${ interval } minutes' and
    type = '${ type }' and
    (val >= ${ minVal } and val <= ${ maxVal })
group by mac, sid, type, description
order by mac, sid, type, description
    `;

    return sql;
};

/*
internals.selectInvalid = function(type, minVal, maxVal){

    // make sure there is no comma at the end 
    // (as this query will be used as the input to a insert into)
    var sql = `
select
    nextval(pg_get_serial_sequence('t_raw_invalid', 'id')) as id,
    mac, 
    sid, 
    type, 
    description,
    val,
    ts,
    false as sync
from t_raw
where 
    type = '${ type }' and
    (val < ${ minVal } or val > ${ maxVal })
order by ts
    `;

    return sql;
};
*/
