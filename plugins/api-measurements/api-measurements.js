/*

plugin: api-measurements
description: creates an API endpoint to receive data from the clients (microcontrolers such as huzzahs, arduinos, etc) and save to the local db

*/

'use strict';

const Path = require('path');
const Joi = require('joi');
const Hoek = require('hoek');
const Db = require('../../database');
const Utils = require('../../utils/util');

const internals = {};

internals.measurementSchema = Joi.object({
    sid: Joi.number().integer().required(),
    value: Joi.number().required(),
    // if more measurement types are added, we have to update here and in the sql template
    type: Joi.string().valid('t', 'h').required(),
    desc: Joi.string()
});

internals.optionsSchema = Joi.object({
    pathReadings: Joi.string().default('/readings')
});

exports.register = function (server, options, next){

    const validatedOptions = Joi.validate(options, internals.optionsSchema);
    Hoek.assert(!validatedOptions.error, validatedOptions.error);
    options = internals.options = validatedOptions.value;

    /*
    The query string should have the format:

    ?mac=334&
    battery=50.1&

    data[0][sid]=1&
    data[0][value]=20.1&
    data[0][type]=t&
    data[0][desc]=microfone_1&

    ...

    data[n][sid]=n+1&
    data[n][value]=80.1&
    data[n][type]=h&
    data[n][desc]=microfone_1&

    The data of each measurement must be in the "data[n]" structure. In this case the request would be sending n+1 measurements

    example:

    export AGROBRAIN_LOCAL_SEVER=192.168.1.100
    export AGROBRAIN_LOCAL_SEVER=127.0.0.1

    curl -v -L -G  \
        -d 'mac=aa-bb-cc&battery=294.12&data[0][sid]=1&data[0][value]=20.1&data[0][type]=t&data[0][desc]=microfone_1'  \
        http://$AGROBRAIN_LOCAL_SEVER:8001/api/v1/readings

    */
    
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

    return next();
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
