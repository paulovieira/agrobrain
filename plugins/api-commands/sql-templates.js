'use strict';

const internals = {};

module.exports.insertGpioState = function insertGpioState(obj){

    console.log("value: ", obj.value);
    console.log("start: ", obj.start);


    let sql = `

INSERT INTO "t_gpio_state" (
    value, 
    ts_start,
    ts_end
)
VALUES
(
    '${ obj.value }', 
    '${ obj.start }',
    '${ obj.end }'
)

    `;

    
    // remove the comma in the tail (we know l > 0)
    return sql.trim();
};


/*

window functoins

SELECT
    w1.ts_start, 
    w1.value
FROM
    (SELECT
        w2.ts_start,
        w2.value,
        lead(w2.value) OVER (ORDER BY w2.ts_start DESC) as prev_value
     FROM
        t_gpio_state w2
     ORDER BY
        w2.ts_start DESC) as w1
WHERE
    w1.value IS DISTINCT FROM w1.prev_value
ORDER BY
    w1.ts_start ASC;


*/