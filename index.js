require('./config/load');

var Config = require('nconf');
var Hoek = require('hoek');
var Glue = require('glue');
var Chalk = require('chalk');
var Pg = require('pg');
//var Db = require('./database');

process.title = Config.get('applicationTitle');

var manifest = {

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
            host: "localhost",
            port: Config.get("port")
        }
    ],

    registrations: [


//        {
//            plugin: {
//                register: "...",
//                options: require("./config/plugins/...")
//            },
//            options: {}
//        },

        {
            plugin: {
                register: "hapi-qs",
                options: {}
            },
            options: {}
        },

        {
            plugin: {
                register: "./plugins/routes-api/routes-api.js",
                options: { 
                    aggInterval: 30  // in minutes
                    //aggInterval: 300  // in minutes
                }
            },
            options: {
                routes: {  
                    prefix: '/api/v1'
                }
            }
        },

    ]
};


// load plugins, unless they are explicitely turned off 

if(Config.get('good')!=='false'){
    manifest.registrations.push(
        {
            plugin: {
                register: "good",
                options: require("./config/plugins/good")
            },
            options: {}
        }
    );
}

if(Config.get('blipp')==='false'){
    manifest.registrations.push(
        {
            plugin: {
                register: "blipp",
                options: require("./config/plugins/blipp")
            },
            options: {}
        }
    );
}

// TODO: remove good console if not in production
var glueOptions = {
    relativeTo: __dirname,
    preRegister: function(server, next){
        console.log("called prior to registering plugins with the server")
        next();
    },
    preConnections: function(server, next){
        console.log("called prior to adding connections to the server")
        next();
    }
};

Glue.compose(manifest, glueOptions, function (err, server) {

    Hoek.assert(!err, 'Failed registration of one or more plugins: ' + err);

    // start the server and finish the initialization process
    server.start(function(err) {

        Hoek.assert(!err, 'Failed server start: ' + err);
        
        // show some informations about the server
        console.log(Chalk.green('================='));
        console.log("Hapi version: " + server.version);
        console.log('host: ' + server.info.host);
        console.log('port: ' + server.info.port);
        console.log("process.env.NODE_ENV: ", process.env.NODE_ENV);

        Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

            if (err) { throw err; }

            pgClient.query('SELECT * FROM version()', function(err, result) {

                done();
                if (err) { throw err; }

                console.log("database: ", result.rows[0].version);
                console.log(Chalk.green('================='));
            });
        });
        
    });
});

