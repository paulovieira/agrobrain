'use strict';

const Path = require('path');

module.exports = {
   
    rootDir: Path.resolve(__dirname, '..'),
    applicationTitle: 'agrobrain-local',

    publicIp: '',
    publicPort: '',

    clientToken: '',
    gpioPin: '',
    baseUrlCloud: '',

    db: {
        // should be redefined in some other configuration file (that should be present in .gitignore)
        postgres: {
            host: 'localhost',
            port: 5432,
            database: '',
            username: '',
            password: ''
        }
    },

    plugins: {

        'nes': {

            onConnection: function (socket){

                console.log('new client (should never be called because we are a client): ', socket.id);
            },
            onDisconnection: function (socket){

                console.log('terminated client (should never be called because we are a client): ', socket.id);
            },
            onMessage: function (socket, message, next){

                console.log('new message (should never be called because we are a client): ', message);
                console.log('client: ', socket.id);
                const data = { status: 'received', ts: new Date().toISOString() };

                return next(data);
            },

            auth: false,

            payload: {

                // maximum number of characters allowed in a single WebSocket message;
                // important when using the protocol over a slow network with large updates as the transmission
                // time can exceed the timeout or heartbeat limits which will cause the client to disconnect.
                maxChunkChars: false
            },

            heartbeat: {
                interval: 15000,
                timeout: 10000
            }
        },

        // good configuration is entirely defined the respective mode's file
        'good': {
        },

        'blipp': { 
            showAuth: true,
            showStart: true
        },

        'api-commands': {
        },

        'api-measurements': {
            pathReadings: '/readings'
        },

        'sync-cloud': {
            // length of the interval (in minutes) to sync data with agrobrain-cloud; 
            interval: 4,

            // max number of rows to send when doing a sync; 
            limit: 500,

            // api endpoint to sync data (agrobrain-cloud)
            path: ''
        }
    }
};

