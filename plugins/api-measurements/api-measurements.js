'use strict';

const Path = require('path');
const Config = require('nconf');
const Joi = require('joi');
const Boom = require('boom');
const Pg = require('pg');
const Promise = require('bluebird');
const Wreck = require('wreck');
var Hoek = require('hoek');

const Sql = require('./sql-templates');
const Db = require('../../database');
const Utils = require('../../utils/util');

const internals = {};

internals.oneMinute = 60 * 1000;

internals.measurementSchema = Joi.object({
    sid: Joi.number().integer().required(),
    value: Joi.number().required(),
    // if more measurement types are added, we have to update here and in the sql template
    type: Joi.string().valid('t', 'h').required(),
    desc: Joi.string()
});

internals.optionsSchema = Joi.object({
    pathReadings: Joi.string().default('/readings'),
    syncInterval: Joi.number().integer().positive(),
    syncLimit: Joi.number().integer().positive()
});

exports.register = function (server, options, next){

    const validatedOptions = Joi.validate(options, internals.optionsSchema);
    Hoek.assert(!validatedOptions.error, validatedOptions.error);

    options = internals.options = validatedOptions.value;
    internals.server = server;

    // these queries don't change after the plugin is registered, so we store it in the internals
    //internals.aggQuery     = Sql.aggregate(options.aggInterval);
    //internals.aggSyncQuery = Sql.aggregateSync(options.syncLimit);
    internals.measurementsSyncQuery = Sql.measurementsSync(options.syncLimit);
    internals.logStateSyncQuery     = Sql.logStateSync(options.syncLimit);
    

    // aggregate data every N min (N = options.aggInterval);
    // timer functions are executed for the first time only after 
    // the time length of the aggInterval has passed
    /// setInterval(internals.execAggregate, options.aggInterval * internals['oneMinute']);

    // sync data with cloud every syncInterval minutes
    //setInterval(internals.execAggSync,  options.syncInterval * internals['oneMinute']);
    setInterval(internals.sync,  options.syncInterval * internals['oneMinute']);

    server.route({
        path: options.pathReadings,
        method: 'GET',
        config: {

            validate: {

                query: {
                    mac: Joi.string().required(),
                    battery: Joi.number(),
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

            const mac = request.query.mac;
            request.query.data.forEach((obj) => {

                // mac is not part of the data objects
                obj.mac = mac;

                // the keys in the query string and the names of the columns in db do not match;
                // correct in the data objects
                obj.description = obj.desc;  // the column in the table is 'description'
                obj.val = obj.value;  // the column in the table is 'val'
                
                // note: the other keys in the query string match the names of the columns
            });

            const query = `select * from insert_measurements(' ${ JSON.stringify(request.query.data, null, 2) } ')`;
            //console.log(query);

            Db.query(query)
                .then(function (result){

                    return reply({ newRecords: result.length, ts: new Date().toISOString() });
                })
                .catch(function (err){

                    Utils.logErr(err);
                    return reply(err);
                });

        }
    });

    // test route - manually execute the aggregate query (to be used in dev mode only)
/*
    server.route({
        path: '/agg',
        method: 'GET',
        config: {},
        handler: function (request, reply) {

            internals.execAggregate();
            return reply(`[${ new Date().toISOString() }]: check the output in the console`);
        }
    });
*/
    server.route({
        path: '/test/sync',
        method: 'GET',
        config: {},
        handler: function (request, reply) {

            internals.execAggSync();
            return reply(`[${ new Date().toISOString() }]: check the output in the console`);
        }
    });

    return next();
};

/*
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
        });
    });
};
*/
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

    // parallel select queries
    var sql = [
        `select * from read_measurements(' ${ JSON.stringify({ syncLimit: internals.option.syncLimit }) } ')`,
        `select * from read_agg('          ${ JSON.stringify({ syncLimit: internals.option.syncLimit }) } ')`,
        `select * from read_log_state('    ${ JSON.stringify({ syncLimit: internals.option.syncLimit }) } ')`
    ];

    Promise.all(sql.map(s => Db.query(s)))
        .spread(function(measurements, agg, logState){

            // change date format (is it really necessary?)
/*
            measurements.forEach( obj => obj.ts = obj.ts.toISOString() );

            agg.forEach( obj => obj.ts = obj.ts.toISOString() );

            logState.forEach( (obj) => { 
                obj.ts_start = obj.ts_start.toISOString();
                obj.ts_end   = obj.ts_end.toISOString();
            });
*/
            //console.log(agg)

            internals.syncOptions.payload = undefined;
            internals.syncOptions.payload = JSON.stringify({
                agg: agg,
                measurements: measurements,
                logState: logState 
            });

            return Wreck.putAsync(internals.syncUrlAgg, internals.syncOptions);

            // TODO: promisify wreck; send data; handle response; handle error; change name of the method; move this into a separate plugin

        })
        .spread(function (response, serverPayload){

            if (response.statusCode !== 200){
                const errorMessage = 'sync failed because response from the server was not 200';
                const errorData = { payload: serverPayload };

                throw Boom.create(response.statusCode, errorMessage, errorData);
            }

            // update the sync status in the local database

            console.log("serverPayload: ", serverPayload);
            //internals.updateSyncStatus('t_agg', serverPayload.agg);
            //internals.updateSyncStatus('t_measurements', serverPayload.measurements);
            //internals.updateSyncStatus('t_log_state', serverPayload.logState);

            return;
        })
        .catch(function(err){

            console.log(Object.keys(err))
            Utils.logErr(err, ['execAggSync']);
        });

/*
    console.log(Sql.selectForSync.t_agg(internals.syncLimit))
    console.log(Sql.selectForSync.t_measurements(internals.syncLimit))
    console.log(Sql.selectForSync.t_log_state(internals.syncLimit))

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
            pgClient.query(internals.measurementsSyncQuery, function (err2, result2) {

                if (err2) {
                    internals.server.log(['error', 'execAggSync'], err2.message);
                    return;
                }

                // immediatelly reuse the same client for a third query

                //console.log('xyz: ', internals.logStateSyncQuery)
                pgClient.query(internals.logStateSyncQuery, function (err3, result3) {


                    done();

                    if (err3) {
                        internals.server.log(['error', 'execAggSync'], err3.message);
                        return;
                    }

                    if (result.rowCount === 0 && result2.rowCount === 0 && result3.rowCount === 0){
                        internals.server.log(['execAggSync'], 'nothing to sync');
                        return;
                    }

                    // change date format
                    result.rows.forEach( (obj) => { 
                        obj.ts = obj.ts.toISOString();
                    });

                    result2.rows.forEach( (obj) => { 
                        obj.ts = obj.ts.toISOString();
                    });

                    result3.rows.forEach( (obj) => { 
                        obj.ts_start = obj.ts_start.toISOString();
                        obj.ts_end   = obj.ts_end.toISOString();
                    });

                    //console.log("rows", result.rows)
                    // console.log("rows2", result2.rows)
                    //console.log("rows3", result3.rows)

                    internals.syncOptions.payload = undefined;
                    internals.syncOptions.payload = JSON.stringify({
                        agg: result.rows,
                        measurements: result2.rows,
                        logState: result3.rows
                    });

                    //console.log('syncOptions: ', internals.syncOptions);
                    //console.log('syncOptions.payload: ', internals.syncOptions.payload);

                    Wreck.put(internals.syncUrlAgg, internals.syncOptions, function (err, response, serverPayload){

                        if (err) {
                            internals.server.log(['error', 'execAggSync', 'wreck'], { message: err.message, payload: JSON.stringify(serverPayload) });
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
                        internals.updateSyncStatus('t_log_state', serverPayload.logState);

                        return;
                    });
                })
            });
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
