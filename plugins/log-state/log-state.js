/*

plugin: log-state
description: periodically update the t_log_state table with the current state (for the different state segments)

TODO: log the "cloud" segment
*/

'use strict';

const Path = require('path');
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
    intervalConnectivity: Joi.number().integer().positive(),
    intervalCloud: Joi.number().integer().positive(),
    waitAppRestart: Joi.number().integer().positive()
});

internals.dummyCounter=0;
exports.register = function (server, options, next){

    const validatedOptions = Joi.validate(options, internals.optionsSchema);
    Hoek.assert(!validatedOptions.error, validatedOptions.error);
    options = internals.options = validatedOptions.value;

    // make some properties available to the other functions in the module
    internals.server = server;
    internals.syncPath = options.path + '?clientToken=' + Config.get('clientToken');

    // log the application restart (but wait some seconds to make sure the db connection is established)
    setTimeout(internals.updateLogAppRestart, options.waitAppRestart);

    // read gpio, log in the db and in the ws subscription
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

            Utils.logErr(err, ['log-state', 'app-restart']);
        });        
};

internals.updateLogGpio = function () { 

    const gpioValue = internals.readGpio(internals.gpioPin);
    if (gpioValue === null){
        // the error has already been logged
        return;
    }

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

            Utils.logErr(err, ['log-state', 'gpio']);
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
        Utils.logErr(err, ['api-commands', 'gpioRead']);
        return null;
    }
};

internals.updateLogConnectivity = function () { 

    let connectivityValue;

    let websiteThatIsAlwaysAvailable = 'https://google.com/';
    if(internals.dummyCounter++ > 4){
        websiteThatIsAlwaysAvailable = 'https://googlefiuwebfuwebfiuwf.com/'
    }
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

                    Utils.logErr(err, ['log-state', 'connectivity']);
                });        
        })

};


exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the directory
    dependencies: ['nes', 'ws-client', 'commands']  // depends on the commands plugin in dev mode (because of the dummy gpio)
};

