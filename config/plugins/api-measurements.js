'use strict';

const Config = require('nconf');

if (Config.get('env') === 'dev'){
    module.exports = {
        aggInterval: 2,  // interval to compute aggregate data (in minutes)

        syncInterval: 1,  // interval to sync data with cloud (send data)
        syncLimit: 100    // max number of rows to send when doing a sync
    };
}
else {
    module.exports = {
        aggInterval: 15,

        syncInterval: 3,
        syncLimit: 100
    };
}
