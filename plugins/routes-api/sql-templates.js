const internals = {};

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


    -- 1a) aggregate temperatures (consider only values between -20 and 70)

    insert into t_agg(
        ${ internals.selectAgg(interval, 't', -20, 70) }
    );

    -- 1b) copy invalid values to t_raw_sync
    
    insert into t_raw_invalid(
        ${ internals.selectInvalid('t', -20, 70) }
    );




    -- 2a) aggregate temperatures (consider only values between -1 and 2000)

    insert into t_agg(
        ${ internals.selectAgg(interval, 'h', -1, 2000) }
    );

    -- 2b) copy invalid values to t_raw_sync

    insert into t_raw_invalid(
        ${ internals.selectInvalid('h', -1, 2000) }
    );


    -- 3) clean t_raw
    delete from t_raw;

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


module.exports.aggregateSync = function(n){

    // make sure there is no comma at the end 
    // (as this query will be used as the input to a insert into)
    var sql = `
select 
    mac, 
    sid,
    type,
    description,
    avg,
    stddev,
    n,
    ts
from t_agg
where sync = false
order by id
limit ${ n };
    `;

    return sql;
};
