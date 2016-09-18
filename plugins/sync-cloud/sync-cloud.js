/*

plugin: sync-cloud
description: periodically sync measurements data with agrobrain-cloud; once the syncronization is done, update the respective 'sync' field in the local db

TODO: when sending the data to the sync endpoint in the cloud, the client must send some credentials too
*/

'use strict';

const Path = require('path');
const Config = require('nconf');
const Joi = require('joi');
const Boom = require('boom');
const Promise = require('bluebird');
const Wreck = require('wreck');
const Hoek = require('hoek');
const Db = require('../../database');
const Utils = require('../../utils/util');

const internals = {};


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
    // note: timer functions are executed for the first time only after the given interval has completed;
    setInterval(internals.sync, options.interval);

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


internals.wreckOptions = {
    baseUrl: 'http://' + Config.get('baseUrlCloud'),
    timeout: 30 * 1000,

    //payload: to be set below

    json: 'force',
    headers: {
        'content-type': 'application/json'
    }
};

internals.sync = function (){

    // parallel select queries
    let sql = [];
    
    sql.push(`
        select * from read_measurements(
            '${ JSON.stringify({ limit: internals.options.limit }) }'
        )
    `);
    
    sql.push(`
        select * from read_log_state(
            '${ JSON.stringify({ limit: internals.options.limit }) }'
        )
    `);

    Promise.all(sql.map((s) => Db.query(s)))
        .spread(function (measurements, logState){

            // if there's nothing to sync, avoid doing the http request by skipping directly
            // to the next step ()
            if (measurements.length === 0 && logState.length === 0){
                return [{ statusCode: 200 }, { measurements: [], logState: [] }];
            }

            // the wreck options object is reused; we just update the payload property
            internals.wreckOptions.payload = undefined;
            internals.wreckOptions.payload = JSON.stringify({
                measurements: measurements,
                logState: logState 
            });

            return Wreck.putAsync(internals.syncPath, internals.wreckOptions);
        })
        .spread(function (response, serverPayload){

            if (response.statusCode !== 200){
                const errorMessage = 'sync failed because response from the server was not 200';
                const errorData = { payload: serverPayload };

                throw Boom.create(response.statusCode, errorMessage, errorData);
            }

            // data has been sent to the cloud, the response is an array of objects with the 
            // ids of records that have been saved in the cloud db (which are the same ids)
            
            // update the cloud sync status to true for those ids (in the local db)

            sql = [];

            sql.push(`
                select * from update_sync(
                    '${ JSON.stringify(serverPayload.measurements) }', 
                    '${ JSON.stringify({ table: 't_measurements' }) }'
                )
            `);

            sql.push(`
                select * from update_sync(
                    '${ JSON.stringify(serverPayload.logState) }',
                    '${ JSON.stringify({ table: 't_log_state' }) }'
                )
            `);

            return Promise.all(sql.map((s) => Db.query(s)));
        })
        .then(function (){

            // TO BE DONE - we can now delete entries that have been synced
            // (where date is from last week, for instance)

        })
        .catch(function (err){

            //console.log(Object.keys(err))
            Utils.logErr(err, ['sync-cloud', 'sync']);
        });
};

exports.register.attributes = {
    name: Path.parse(__dirname).name  // use the name of the directory
};

