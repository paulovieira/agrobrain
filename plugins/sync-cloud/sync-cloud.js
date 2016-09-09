/*

plugin: sync-cloud
description: periodically sync measurements data with agrobrain-cloud; once the syncronization is done, update the respective 'sync' field in the local db

TODO: when sending the data the sync endpoint in the cloud, the client must send some credentials too
*/

'use strict';

const Path = require('path');
const Config = require('nconf');
const Joi = require('joi');
const Boom = require('boom');
const Promise = require('bluebird');
const Wreck = require('wreck');
var Hoek = require('hoek');

const Db = require('../../database');
const Utils = require('../../utils/util');

const internals = {};

internals.oneMinute = 60 * 1000;

internals.optionsSchema = Joi.object({
    interval: Joi.number().integer().positive(),
    limit: Joi.number().integer().positive(),
    path: Joi.string().min(1)
});

exports.register = function (server, options, next){

    const validatedOptions = Joi.validate(options, internals.optionsSchema);
    Hoek.assert(!validatedOptions.error, validatedOptions.error);
    options = internals.options = validatedOptions.value;
    
    // make some properties available to the other functions in the module
    internals.server = server;
    internals.syncPath = options.path + '?clientToken=' + Config.get('clientToken');


    // sync data with cloud every options.interval minutes;
    // note: timer functions are executed for the first time only after the interval has completed;
    setInterval(internals.sync, options.interval * internals['oneMinute']);

    // test route - manual sync (to be used in dev mode only)
    server.route({
        path: '/test/sync',
        method: 'GET',
        config: {},
        handler: function (request, reply) {

            internals.sync();
            return reply(`[${ new Date().toISOString() }]: check the output in the console`);
        }
    });

    return next();
};

///internals.syncUrlAgg = Config.get('syncUrlAgg') + '?clientToken=' + Config.get('clientToken');
///internals.syncUrlMeasurements = Config.get('syncUrlMeasurements') + '?clientToken=' + Config.get('clientToken');



internals.wreckOptions = {
    baseUrl: 'http://' + Config.get('baseUrlCloud'),
    timeout: 30 * 1000,

    //payload: to be set below

    json: 'force',
    headers: {
        'content-type': 'application/json'
    }
};

internals.sync = function(){

    // parallel select queries
    // TODO: verify the case when there are no rows returned
    const sql = [];
    sql.push(`select * from read_measurements(' ${ JSON.stringify({ limit: internals.options.limit }) } ')`);
    sql.push(`select * from read_log_state('    ${ JSON.stringify({ limit: internals.options.limit }) } ')`);

    Promise.all(sql.map((s) => Db.query(s)))
        .spread(function(measurements, logState){

            // update payload in the wreck options (the other properties are the same)
            internals.wreckOptions.payload = undefined;
            internals.wreckOptions.payload = JSON.stringify({
                measurements: measurements,
                logState: logState 
            });

            return Wreck.putAsync(internals.syncPath, internals.wreckOptions);

            // TODO: promisify wreck; send data; handle response; handle error; 

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
            Utils.logErr(err, ['sync']);
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

                    internals.wreckOptions.payload = undefined;
                    internals.wreckOptions.payload = JSON.stringify({
                        agg: result.rows,
                        measurements: result2.rows,
                        logState: result3.rows
                    });

                    //console.log('syncOptions: ', internals.wreckOptions);
                    //console.log('syncOptions.payload: ', internals.wreckOptions.payload);

                    Wreck.put(internals.syncUrlAgg, internals.wreckOptions, function (err, response, serverPayload){

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

/*
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
*/

exports.register.attributes = {
    name: Path.parse(__dirname).name  // use the name of the directory
};

