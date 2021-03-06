'use strict';

const Path = require('path');

module.exports = {
   
    rootDir: Path.resolve(__dirname, '..'),
    applicationTitle: 'agrobrain-local',

    port: '',
    publicIp: '',

    clientToken: '',
    gpioPin: '',
    baseUrlCloud: '',

    // configuration for each database is entirely defined the mode configuration file
    db: {
        postgres: {
            host: '',
            port: 0,
            database: '',
            username: '',
            password: ''
        }
    },

    // configuration for each plugin is entirely defined the mode configuration file
    plugins: {

        // external plugins

        'nes': {
        },

        'good': {
        },

        'blipp': { 
        },



        // internal plugins

        'ws-client': {
        },

        'commands': {
        },

        'api-measurements': {
        },

        'sync-cloud': {
        },

        'log-state': {
        }
    }
};

