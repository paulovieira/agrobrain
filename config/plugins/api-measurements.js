'use strict';

const Config = require('nconf');

if (Config.get('env') === 'dev'){
    module.exports = {
        aggInterval: 2,  // interval to compute aggregate data (in minutes)
        syncMax: 100,  // max number of rows to send when doing a sync
        syncInterval: 1
    };
}
else {
    module.exports = {
        aggInterval: 15,
        syncMax: 100,
        syncInterval: 3
    };
}
