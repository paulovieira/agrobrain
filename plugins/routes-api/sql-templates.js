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

    -- aggregate data for temperatures (consider only values between -20 and 70)

    insert into t_agg(
        ${ internals.selectAgg(interval, -20, 70, 't') }
    );

    -- TODO: query to copy invalid reading to t_raw_invalid

    -- aggregate for humidity (consider only values between -1 and 2000)

    -- TODO: query to copy invalid reading to t_raw_invalid

    insert into t_agg(
        ${ internals.selectAgg(interval, -1, 2000, 'h') }
    );

    -- delete values from the interval
    delete from t_raw
    where
        now() - t_raw.ts < '${ interval } minutes';

END 
$$
LANGUAGE plpgsql 

    `;

    return sql.trim();
};

internals.selectAgg = function(interval, minVal, maxVal, type){

    var sql = `

select 
    mac, 
    sid, 
    type, 
    description, 
    avg(val)::real, 
    stddev_pop(val)::real as stddev, 
    count(val)::smallint as n, 
    false as sent_to_cloud,
    _ts as ts
from t_raw
where 
    now() - t_raw.ts < '${ interval } minutes' and
    val > ${ minVal } and 
    val < ${ maxVal } and
    type = '${ type }'
group by mac, sid, type, description
order by mac, sid, type

    `;

    return sql;
};
