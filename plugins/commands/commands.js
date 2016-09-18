/*

plugin: ws-client
description: uses to websocket client created in the ws-client plugin to create a subscription 
to the commands path (defined in the cloud server); the cloud server will send commands to change 
the state of the gpio using that subscription

TODO: 
1) gpio is off (value 0)
1) give a command to turn gpio on (value 1)
2) system goes down (or restarts for some reason)
3) system is up again

what is the value of the gpio? 0 or 1? will the gpio value be 0 when it restarts? should we set it to 0 if we can (gracefull restart)?

distingish cases:
    -abrupt restart vs graceful restart
what should we do with the gpio? set it off?

*/


'use strict';

const Path = require('path');
const ChildProcess = require('child_process');
const Config = require('nconf');
const Joi = require('joi');
const Hoek = require('hoek');
const Utils = require('../../utils/util');

const internals = {};

if (Config.get('env') === 'dev'){
    global.dummyGpio = {
        '23': 0
    };
}

internals.endpoints = {
    //setState: '/api/v1/set-state'
};

internals.optionsSchema = Joi.object({
    path: Joi.string().min(1)
});

exports.register = function (server, options, next){

    const validatedOptions = Joi.validate(options, internals.optionsSchema);
    Hoek.assert(!validatedOptions.error, validatedOptions.error);
    options = internals.options = validatedOptions.value;

    const wsClient = server.plugins['ws-client'].client;

    // it is ok to subscribe before the ws connection is established (?)
    wsClient.subscribe(

        options.path,

        function (message, flags){

            internals.gpioWrite(Config.get('gpioPin'), message.command);
        },

        function (err){

            if (err){
                Utils.logErr(err, ['commands']);
                return;
            }

            server.log(['commands'], { message: 'ws subscription', path: options.path });
        }
    );

    ///setInterval(internals.sendGpioValue, internals.gpioInterval);

    return next();
};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the file
    dependencies: ['nes', 'ws-client']
};


internals.gpioWrite = function (pin, value){

    const command = `
gpio mode ${ pin } out; 
sleep 1;
gpio write ${ pin } ${ value };
`;

    if (Config.get('env') === 'dev'){

        // set the dummy gpio

        console.log('gpio write command:\n', command);
        global.dummyGpio['' + pin] = value;
        return;
    }

    // code for production mode starts here

    let output = '';
    try {
        output = ChildProcess.execSync(command, { encoding: 'utf8' });
        server.log(['commands'], { message: 'gpio value changed via execSync', command: command, output: output });
    }
    catch (err){
        Utils.logErr(err, ['commands', 'gpioWrite']);
        return null;
    }
};
