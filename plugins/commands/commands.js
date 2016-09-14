/*

plugin: ws-client
description: uses to websocket client created in the ws-client plugin to create a subscription 
to the commands path (defined in the cloud server); the cloud server will send commands to change 
the state of the gpio using that subscription

*/


'use strict';

const Path = require('path');
const Config = require('nconf');
const Joi = require('joi');
const Hoek = require('hoek');
//const Boom = require('boom');
const Db = require('../../database');
const Utils = require('../../utils/util');

const internals = {};

internals.endpoints = {
    //commands: '/api/v1/commands',
    setState: '/api/v1/set-state'
};

internals.dummyCounter = 0;

internals.optionsSchema = Joi.object({
    path: Joi.string().min(1)
});

exports.register = function (server, options, next){

    const validatedOptions = Joi.validate(options, internals.optionsSchema);
    Hoek.assert(!validatedOptions.error, validatedOptions.error);
    options = internals.options = validatedOptions.value;

    const client = server.plugins['ws-client'].client;

    // TODO: is it ok to subscribe before the connection is established?
    client.subscribe(

        options.path,

        function (message, flags){

            internals.gpioWrite(Config.get('gpioPin'), message.command);
        },

        function (err){

            if (err){
                Utils.logErr(err, ['api-commands']);
                return;
            }

            server.log(['api-commands'], { message: 'ws subscription established', path: options.path });
        }
    );
/*
    // call client.subscribe only after the client has successfully established a connection
    const interval = 100000000;
    const subscribeTimer = setInterval(() => {

        if (!client.id){
            return;
        }
        //console.log("yyyyyyyyyyyyyyyyyyyyy")
        console.log("options: ", options)
        client.subscribe(

            options.path,

            function (message, flags){

                if (Config.get('env') === 'production'){
                    internals.gpioWrite(Config.get('gpioPin'), message.command);
                }
                else if (Config.get('env') === 'dev'){
                    internals.gpioWriteDummy(Config.get('gpioPin'), message.command);
                }
                else {
                    throw new Error('invalid env');
                }
                
            },

            function (err){

                if (err){
                    Utils.logErr(err, ['api-commands']);
                    return;
                }

                server.log(['api-commands'], { message: 'ws subscription established', path: options.path });
            }
        );

        // clear the timer even if the there is some error related to client.subscribe
        clearInterval(subscribeTimer);

    }, interval);
*/

    ///setInterval(internals.sendGpioValue, internals.gpioInterval);

    return next();
};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the file
    dependencies: ['nes', 'ws-client']
};





// TODO: execute a pg function every n minutes which will insert/update
// the current state of the gpio
/*
internals.updateLogStateOld = function (value){

    Pg.connect(Config.get('db:postgres'), function (err, pgClient, done) {

        if (err) {
            internals.server.log(['error', 'updateLogState'], err.message);
            return;
        }

        const query = `select * from update_log_state('{ "gpioState": ${ !!Number(value) }, "userId": null, "interval": ${ internals.interval } }')`;
        console.log('query: ', query);
        pgClient.query(query, function (err, result) {

            done();

            if (err) {
                internals.server.log(['error', 'updateLogState'], err.message);
            }
        });
    });

};
*/
/*
internals.updateLogState = function updateLogState(value){

    const input = {
        gpioState: !!Number(value),
        userId: null,
        interval: internals.options.gpioInterval / 1000  // the interval in postgres is defined in seconds
        //interval: 'abc'
    };

    Db.func('update_log_state', JSON.stringify(input))
        .catch(function (err){

            Utils.logErr(err, ['updateLogState']);
        });
};
*/
/*
internals.sendGpioValue = function (){

    let value;
    if(Config.get('env') === 'production'){
        value = Utils.gpioRead(Config.get('gpioPin'));
    }
    else if(Config.get('env') === 'dev'){
        value = Utils.gpioReadDummy(Config.get('gpioPin'));
    }
    else{
        throw new Error('invalid env value');
    }

    internals.updateLogState(value);

    const options = {
        path: internals.endpoints.setState,
        method: 'PUT',
        payload: JSON.stringify({ 
            state: value,
            updatedAt: new Date().toISOString()
        })
    };

    internals.client.request(options, function (err, serverPayload, stateCode){

        if (err){
            internals.server.log(['error', 'api-commands', 'request'], { message: err.message, type: err.type } );
            return;
        }

        if (stateCode !== 200){
            internals.server.log(['error', 'api-commands', 'request'], 'state code is not 200');
            return;
        }

        internals.server.log(['api-commands', 'request'], serverPayload);
        return;
    });

};
*/



internals.gpioRead = function (pin){

    const command = `
gpio mode ${ pin } out; 
sleep 1;
gpio read ${ pin };
`;

    if (Config.get('env') === 'dev'){
        console.log('gpio read command:\n', command);

        // simulate a reading of the gpio that changes over time

        internals.dummyCounter++;
        const lastDigit = Number(String(internals.dummyCounter).slice(-1));

        let dummyGpioValue;
        if (lastDigit >= 0 && lastDigit < 3){
            dummyGpioValue = 0;
        }
        else if (lastDigit >= 3 && lastDigit < 5){
            dummyGpioValue = 1;
        }
        else if (lastDigit >= 5 && lastDigit < 9){
            dummyGpioValue = 0;
        }
        else if (lastDigit === 9){
            dummyGpioValue = 1;
        }

        return dummyGpioValue;
    }

    // code for production mode starts here

    let output = '';
    try {
        output = ChildProcess.execSync(command, { encoding: 'utf8' });
        return output;
    }
    catch (err){
        Utils.logErr(err, ['api-commands', 'gpioRead']);
    }
};



internals.gpioWrite = function (pin, value){

    const command = `
gpio mode ${ pin } out; 
sleep 1;
gpio write ${ pin } ${ value };
`;

    if (Config.get('env') === 'dev'){
        console.log('gpio write command:\n', command);        
        return;
    }

    // code for production mode starts here

    let output = '';
    try {
        output = ChildProcess.execSync(command, { encoding: 'utf8' });
        return output;
    }
    catch (err){
        console.log(err.message);
    }
};
