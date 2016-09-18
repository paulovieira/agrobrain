/*

plugin: log-state
description: periodically update the t_log_state table with the current state (for the different state segments)

TODO: log the "cloud" segment
*/

'use strict';

const Path = require('path');
const ChildProcess = require('child_process');
const Config = require('nconf');
const Joi = require('joi');
const Wreck = require('wreck');
const Hoek = require('hoek');
const Db = require('../../database');
const Utils = require('../../utils/util');

const internals = {};

internals.gpioPin = Config.get('gpioPin');

internals.optionsSchema = Joi.object({
    intervalGpio: Joi.number().integer().positive(),
    pathGpio: Joi.string().min(1),
    intervalConnectivity: Joi.number().integer().positive(),
    intervalCloud: Joi.number().integer().positive(),
    waitAppRestart: Joi.number().integer().positive()
});

internals.dummyCounter = 0;
exports.register = function (server, options, next){

    const validatedOptions = Joi.validate(options, internals.optionsSchema);
    Hoek.assert(!validatedOptions.error, validatedOptions.error);
    options = internals.options = validatedOptions.value;

    // make some properties available to the other functions in the module
    internals.server = server;
    internals.syncPath = options.path + '?clientToken=' + Config.get('clientToken');
    internals.wsClient = server.plugins['ws-client'].client;

    // log the application restart (but wait some seconds to make sure the connection 
    // to the local db is ready)
    setTimeout(internals.updateLogAppRestart, options.waitAppRestart);

    // read gpio, update in the db and send to the cloud so that any ws clients
    // running the browser receive live updates of the state
    setInterval(internals.updateLogGpio, options.intervalGpio);

    // check connectivity, update in the db
    setInterval(internals.updateLogConnectivity, options.intervalConnectivity);

    return next();
};


internals.updateLogAppRestart = function () { 

    const input = { 
        segment: 'app',
        data: { value: 'restart' }
    };

    const query = `
        select * from update_log_state(' ${ JSON.stringify(input) } ');
    `;

    Db.query(query)
        .catch(function (err){

            Utils.logErr(err, ['log-state', 'updateLogAppRestart']);
        });        
};

internals.updateLogGpio = function () { 

    const gpioValue = internals.readGpio(internals.gpioPin);
    if (gpioValue === null){
        // the error has already been logged in the above call
        return;
    }


    // 1. update the gpio in any eventual ws client running in the browser
    // (those clients are connected to the ws subscription path '/api/v1/state')
    // to update we must do a 'PUT /api/v1/state' using the ws client that is already
    // available (altough it could be done using a traditional http request using wreck)

    const options = {
        path: internals.options.pathGpio,
        method: 'PUT',
        payload: { 
            state: gpioValue,
            updatedAt: new Date()
        }
    };

    internals.wsClient.request(options, function (err, serverPayload, stateCode){

        if (err){
            Utils.logErr(err, ['log-state', 'updateLogGpio']);
            return;
        }

        if (stateCode !== 200){
            internals.server.log(['error', 'log-state', 'updateLogGpio'], 'state code is not 200');
            return;
        }
    });

    // 2. save the gpio state in the local db

    const input = { 
        segment: 'gpio',
        data: { value: gpioValue, pin: internals.gpioPin }
    };

    const query = `
        select * from update_log_state(' ${ JSON.stringify(input) } ');
    `;
    //console.log(query);

    Db.query(query)
        .catch(function (err){

            Utils.logErr(err, ['log-state', 'updateLogGpio']);
        });        
};

internals.readGpio = function (pin){

    const command = `
gpio mode ${ pin } out; 
sleep 1;
gpio read ${ pin };
`;

    if (Config.get('env') === 'dev'){

        // read the dummy gpio

        const dummyGpioValue = global.dummyGpio['' + pin];
        return dummyGpioValue;
    }

    // code for production mode starts here

    try {
        const gpioValue = ChildProcess.execSync(command, { encoding: 'utf8' });
        return gpioValue;
    }
    catch (err){
        Utils.logErr(err, ['log-state', 'gpioRead']);
        return null;
    }
};

internals.updateLogConnectivity = function () { 

    let connectivityValue;

    let websiteThatIsAlwaysAvailable = 'https://google.com/';

    // if(internals.dummyCounter++ > 4){
    //     websiteThatIsAlwaysAvailable = 'https://googlefiuwebfuwebfiuwf.com/'
    // }

    Wreck.getAsync(websiteThatIsAlwaysAvailable)
        .spread((res, payload) => {

            connectivityValue = 1;
        })
        .catch((err) => {

            connectivityValue = 0;
        })
        .then(() => {

            const input = { 
                segment: 'connectivity',
                data: { value: connectivityValue }
            };

            const query = `
                select * from update_log_state(' ${ JSON.stringify(input) } ');
            `;

            Db.query(query)
                .catch(function (err){

                    Utils.logErr(err, ['log-state', 'updateLogConnectivity']);
                });        
        });

};


exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the directory
    dependencies: ['nes', 'ws-client', 'commands']  // depends on the commands plugin in dev mode (because of the dummy gpio)
};

