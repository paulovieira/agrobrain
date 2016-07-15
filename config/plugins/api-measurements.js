'use strict';

const Config = require('nconf');

if (Config.get('env') === 'dev'){
    module.exports = {
        interval: 1,  // interval to compute aggregate data (in minutes)
        syncMax: 100  // max number of rows to send when doing a sync
    };
}
else {
    module.exports = {
        interval: 15,
        syncMax: 100
    };
}
