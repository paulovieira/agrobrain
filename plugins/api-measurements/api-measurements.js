'use strict';

const Path = require('path');
const Joi = require('joi');
const Boom = require('boom');
const Pg = require('pg');
const Config = require('nconf');
const Sql = require('./sql-templates');
const Wreck = require('wreck');

const internals = {};

internals.oneMinute = 60 * 1000;

internals.measurementSchema = Joi.object({
    sid: Joi.number().integer().required(),
    value: Joi.number().required(),
    // if more measurement types are added, we have to update here and in the sql template
    type: Joi.string().valid('t', 'h').required(),
    desc: Joi.string()
});

exports.register = function (server, options, next){

    internals.server = server;

    if (!options.interval){
        return next(new Error('interval is required'));
    }

    if (!options.syncMax){
        return next(new Error('syncMax is required'));
    }

    // these queries don't change after the plugin is registered, so we store it in the internals
    internals.aggQuery     = Sql.aggregate(options.interval);
    internals.aggSyncQuery = Sql.aggregateSync(options.syncMax);
    internals.aggSyncQuery2 = Sql.aggregateSync2(options.syncMax);

    // aggregate data every N min (N = options.interval);
    // timer functions are executed for the first time only after 
    // the time of the interval time has passed
    setInterval(internals.execAggregate, options.interval * internals['oneMinute']);

    server.route({
        path: options.pathReadings || '/readings',
        method: 'GET',
        config: {

            validate: {

                query: {
                    mac: Joi.string().required(),
                    data: Joi.array().items(internals.measurementSchema).min(1).required()
                },

                options: {
                    allowUnknown: true
                }
            }

        },


        /*

        curl -v -L -G -d 'xmac=999-888-777&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://$AGROBRAIN_LOCAL_SEVER:8001/api/v1/readingsx;



        mac=334&
        data[0][sid]=834&
        data[0][value]=23.3&
        data[0][type]=t&
        data[0][desc]=microfone_1

        the combination of sid and type is unique

        export AGROBRAIN_LOCAL_SEVER=192.168.1.100
        export AGROBRAIN_LOCAL_SEVER=127.0.0.1

        curl -v -L -G -d 'mac=999-888-555&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://$AGROBRAIN_LOCAL_SEVER:8001/api/v1/readings

        curl -v -L -G -d 'mac=999-888-555&data[0][sid]=1234&data[0][value]=20.1&data[0][type]=t&data[0][desc]=microfone_1' http://$AGROBRAIN_LOCAL_SEVER:8001/api/v1/readings
                 

        */
        handler: function (request, reply) {

            // if(Config.get('env')==='production'){
            //     console.log(request.query);
            // }

            Pg.connect(Config.get('db:postgres'), function (err, pgClient, done) {

                let boom;
                if (err) {
                    boom = Boom.badImplementation();
                    boom.output.payload.message = err.message;
                    return reply(boom);
                }

                pgClient.query(Sql.insert(request.query.mac, request.query.data), function(err, result) {

                    done();

                    if (err) {
                        boom = Boom.badImplementation();
                        boom.output.payload.message = err.message;
                        return reply(boom);
                    }

                    if (result.rowCount === 0){
                        boom = Boom.badImplementation();
                        boom.output.payload.message = 'result.rowCount should be > 0 (data was not saved?)';
                        return reply(boom);
                    }

                    return reply({ newRecords: result.rowCount, ts: new Date().toISOString() });
                });
            });
        }
    });

    // route to manually execute the aggregate query (to be used in dev mode only, along with the insert_fake_data.sh script)
    server.route({
        path: '/agg',
        method: 'GET',
        handler: function (request, reply) {

            internals.execAggregate();
            return reply(`[${ new Date().toISOString() }]: check the output in the console`);
        }
    });

    return next();
};


internals.execAggregate = function(){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
            internals.server.log(['error', 'execAggregate'], err.message)
            return;
        }

        //console.log(internals.aggQuery);

        pgClient.query(internals.aggQuery, function(err, result) {

            done();

            if (err) {
                internals.server.log(['error', 'execAggregate'], err.message);
                return 
            }

            internals.server.log(['agg', 'execAggregate'], 'aggregation was done');

            // do sync now
            internals.execAggSync();
        });
    });
};

internals.syncUrlAgg = Config.get('syncUrlAgg') + '?clientToken=' + Config.get('clientToken');
internals.syncUrlMeasurements = Config.get('syncUrlMeasurements') + '?clientToken=' + Config.get('clientToken');

internals.syncOptions = {
    baseUrl: Config.get('syncUrlBase'),
    timeout: 30*1000,
    //payload: to be set below

    json: 'force',
    headers: {
        'content-type': 'application/json'
    }
};

internals.execAggSync = function(){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
            // TODO: add to logs + email
            internals.server.log(['error', 'execAggSync'], err.message);
            return;
        }

        //console.log(internals.aggSyncQuery);
        pgClient.query(internals.aggSyncQuery, function (err, result) {

            if (err) {
                internals.server.log(['error', 'execAggSync'], err.message);
                done();
                return;
            }

            // immediatelly reuse the same client for a second query
            pgClient.query(internals.aggSyncQuery2, function (err2, result2) {

                done();

                if (err2) {
                    internals.server.log(['error', 'execAggSync'], err2.message);
                    return;
                }

                if (result.rowCount === 0 && result2.rowCount === 0){
                    internals.server.log(['execAggSync'], 'nothing to sync');
                    return;
                }

                internals.syncOptions.payload = undefined;
                internals.syncOptions.payload = JSON.stringify({
                    agg: result.rows,
                    measurements: result2.rows
                });

                //console.log('payload: ', internals.syncOptions.payload)

                Wreck.put(internals.syncUrlAgg, internals.syncOptions, function (err, response, serverPayload){

                    if (err) {
                        internals.server.log(['error', 'execAggSync', 'wreck'], err.message);
                        return;
                    }

                    if (response.statusCode !== 200){
                        
                        internals.server.log(['error', 'execAggSync'], 'sync was not done: response from the server was not 200. server payload: ' + JSON.stringify(serverPayload));
                        return 
                    }

                    // update the sync status in the local database

                    console.log("serverPayload: ", JSON.stringify(serverPayload))
                    internals.updateSyncStatus('t_agg', serverPayload.agg);
                    internals.updateSyncStatus('t_measurements', serverPayload.measurements);

                    return;
                });
                
            });
        });
    });


    // auxiliary query - to be deleted later
    // we should have a new entry in the table every 30min (interval)
/*
    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) { throw err; }

 
        pgClient.query('insert into temp_notify values(now())', function(err, result) {

            done();
        });
    });
*/

};

internals.updateSyncStatus = function (table, ids){

    Pg.connect(Config.get('db:postgres'), function (err, pgClient, done) {

        if (err) {
            internals.server.log(['error', 'updateSyncStatus'], err.message);
            return;
        }

        const updateSyncStatus = Sql.updateSyncStatus(table, ids);

        pgClient.query(updateSyncStatus, function (err, result) {

            done();

            if (err) {
                internals.server.log(['error', 'updateSyncStatus'], err.message);
                return;
            }

            // if (result.rowCount === 0){
            //     internals.server.log(['error', 'updateSyncStatus'], 'sync status was not updated');
            //     return;
            // }

            internals.server.log(['updateSyncStatus'], 'sync status was updated');
        });
    });
};

exports.register.attributes = {
    name: Path.parse(__dirname).name  // use the name of the directory
};


/*
TODO:
we must have some sort of queue system that sends email when something wrong has happened or is about to happen
these messages should also be added to an append only log, which should almost surely be saved

-connection to db failed
-sync with cloud failed after x times 
-free space is < ...
-cpu load is > ... for the last hour
-use the same tests that wre used here: 
http://www.jeffgeerling.com/blogs/jeff-geerling/raspberry-pi-microsd-card
-make sure the hour is always correct some minutes after the pi boots (retrieve the time from a server)


-create a temporary table t_raw_invalid, to store the values from t_raw that were not used in aggregate function
the data from this table should be delete periodically

-when doing the sync, if it isn't successfull, try again for n times after 2 min

-after the data has been syncronized, delete it from the local db?

-when pm2 restart the process (because the memory has reached the limit), what signal does it send? the app should be able to gracefully finish what it is doing


*/
