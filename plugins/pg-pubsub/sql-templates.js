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
    ts
from t_agg
where sync = false
order by id
limit ${ n };
    `;

    return sql;
};
