const Path = require('path');
const _ = require('underscore');
const Boom = require('boom');
const Pg = require('pg');
const Wreck = require('wreck');
const Config = require('nconf');
const Sql = require('./sql-templates');

const internals = {};

internals.syncUri = Config.get('syncUri') + '?clientToken=' + Config.get('clientToken');

internals.syncOptions = {
    baseUrl: Config.get('syncBaseUrl'),
    timeout: 30*1000,
    //payload: ...

    json: 'force',
    headers: {
        'content-type': 'application/json'
    }
};


internals.execAggregateSync = function(){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
            // TODO: add to logs + email
            throw err;
        }

        //console.log(internals.aggSyncQuery);
    
        pgClient.query(internals.aggSyncQuery, function(err, result) {

            done();

            if (err) {
                // TODO: add to logs + email
                throw err;
            }

            if(result.rowCount===0){
                internals.server.log(['agg-sync'], 'nothing to sync');
                return;
            }
            else{

                internals.syncOptions.payload = undefined;
                internals.syncOptions.payload = JSON.stringify(result.rows);

                console.log(internals.syncUri)
                console.log(internals.syncOptions)

                Wreck.put(internals.syncUri, internals.syncOptions, function(err, response, serverPayload){

                    if (err) {
                        internals.server.log(['error', 'wreck'], { message: err.message });
                        return;
                    }

                    internals.server.log(['agg-sync'], 'ok');
                    // TODO: if statusCode === 200, update the local database
                    console.log(serverPayload);
                    return;
                });

            }
        });
    });


    // auxiliary query - to be deleted later
    // we should have a new entry in the table every 30min (aggInterval)
    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) { throw err; }

 
        pgClient.query('insert into temp_notify values(now())', function(err, result) {

            done();
        });
    });

};

exports.register = function(server, options, next){

    internals.server = server;

    if(!options.aggSyncMax){
        return next(new Error('missing options.aggSyncMax'));
    }

    // this query doesn't change (after the plugin is registered), so we store it in the internals
    internals.aggSyncQuery = Sql.aggregateSync(options.aggSyncMax);



    // attach listener to the 't_agg_insert' channel from postgres; when new rows are inserted in
    // t_agg, a trigger function will will publish an event on this channel (via pg_notify);

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
            throw err;
        }

        pgClient.query("LISTEN t_agg_insert", function(err, result) {

            // important: here we shouldn't release the connection
            // TODO: will the connection be always live?

            if (err) {
                throw err;
            }

            // is the callback executed only once, even if the trigger function is
            // executed twice or more? it seems so, but we use _.debounce to make sure
            pgClient.on('notification', _.debounce(internals.execAggregateSync, 5000));
        });
    });

    return next();
};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the directory
};

