'use strict';

require('./config/load');
require('./config/promisify');

const Fs = require('fs');
const Path = require('path');
const Config = require('nconf');
const Glue = require('glue');
const Hoek = require('hoek');
const Chalk = require('chalk');
const Db = require('./database');
const Utils = require('./utils/util');


process.title = Config.get('applicationTitle');

const manifest = {

    server: {

        //  default connections configuration
        connections: {

            // controls how incoming request URIs are matched against the routing table
            router: {
                isCaseSensitive: false,
                stripTrailingSlash: true
            },

            // default configuration for every route.
            routes: {
                state: {
                    // determines how to handle cookie parsing errors ("ignore" = take no action)
                    failAction: "ignore"
                },

                // disable node socket timeouts (useful for debugging)
                timeout: {
                    server: false,
                    socket: false
                }
            }
        },
    },

    connections: [
        {
            address: Config.get('publicIp'),
            port: Config.get('port')
        }
    ],

    registrations: [

//        {
//            plugin: {
//                register: "...",
//                options: Config.get('plugins:...')
//            },
//            options: {}
//        },

        {
            plugin: {
                register: 'blipp',
                options: Config.get('plugins:blipp')
            },
            options: {}
        },
        
        {
            plugin: {
                register: 'good',
                options: Config.get('plugins:good')
            },
            options: {}
        },

        {
            plugin: {
                register: 'nes',
                options: Config.get('plugins:nes')
            },
            options: {}
        },

        {
            plugin: {
                register: 'hapi-qs',
                options: {}
            },
            options: {}
        },

        {
            plugin: {
                register: './plugins/ws-client/ws-client.js',
                options: Config.get('plugins:ws-client')
            },
            options: {}
        },

        {
            plugin: {
                register: './plugins/api-measurements/api-measurements.js',
                options: Config.get('plugins:api-measurements')
            },
            options: {
                routes: {
                    prefix: '/api/v1'
                }
            }
        },

        {
            plugin: {
                register: './plugins/sync-cloud/sync-cloud.js',
                options: Config.get('plugins:sync-cloud')
            },
            options: {}
        },

        {
            plugin: {
                register: './plugins/commands/commands.js',
                options: Config.get('plugins:commands')
            },
            options: {}
        },

        {
            plugin: {
                register: './plugins/log-state/log-state.js',
                options: Config.get('plugins:log-state')
            },
            options: {}
        }

    ]
};

const glueOptions = {
    relativeTo: __dirname,

    // called prior to registering plugins with the server
    preRegister: function (server, next){

        // make sure the logs directory exists
        try {
            Fs.mkdirSync(Path.join(Config.get('rootDir'), 'logs'));    
        }
        catch (err){
            if (err.code !== 'EEXIST'){
                throw err;
            }
        }

        next();       
    },

    // called prior to adding connections to the server
    preConnections: function (server, next){
        
        next();
    }
};

Glue.compose(manifest, glueOptions, function (err, server) {

    Hoek.assert(!err, 'Failed registration of one or more plugins: ' + err);

    // start the server and finish the initialization process
    Utils.setServer(server);

    server.start( (err) => {

        Hoek.assert(!err, 'Failed server start: ' + err);
        
        // show some basic informations about the server
        console.log(Chalk.cyan('================='));
        console.log('hapi version:', server.version);
        console.log('host:', server.info.host);
        console.log('port:', server.info.port);
        console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

        Db.query('SELECT version()')
            .then((result) => {

                console.log('database:', result[0].version);
                console.log(Chalk.cyan('================='));
            });
    });
});


