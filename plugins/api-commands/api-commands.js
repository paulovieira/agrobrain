'use strict';

const Path = require('path');
const Nes = require('nes');
const Config = require('nconf');
const Pg = require('pg');
var Sql = require('./sql-templates')
const Utils = require('../../utils/util');

const internals = {};

internals.endpoints = {
    commands: '/api/v1/commands',
    setState: '/api/v1/set-state'
};

internals.client = new Nes.Client(Config.get('websocketUrlBase'));

internals['tenSeconds'] = 10 * 1000;
internals['threeSeconds'] = 3 * 1000;

exports.register = function (server, options, next){

    internals.server = server;

    const connectOptions = {
        maxDelay: 15000
    };

    internals.client.connect(connectOptions, function (err){

        if (err){
            internals.server.log(['error', 'api-commands', 'connect'], { message: err.message, type: err.type } );
        }

        internals.server.log(['api-commands', 'connect'], 'connection established with id: ' + internals.client.id );

        internals.client.subscribe(
            internals.endpoints.commands,
            function (message, flags){

                //internals.server.log(['api-commands', 'subscribe'], { message: message } );
                Utils.gpioWriteSync(Config.get('gpioPin'), message.command);
            },
            function (err){

                if (err){
                    internals.server.log(['error', 'api-commands', 'subscribe'], { message: err.message, type: err.type } );
                }
            }
        );
    });

    const interval = Config.get('env') === 'production' ? internals['tenSeconds'] :
                                                        internals['threeSeconds'];
    setInterval(internals.readGpio, interval);

    return next();
};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the file
    dependencies: ['nes']
};


internals.client.onError = function (err){

    internals.server.log(['api-commands', 'onError'], { message: err.message, type: err.type });
};


internals.client.onConnect = function (){

    internals.server.log(['api-commands', 'onConnect'], new Date().toISOString());
};


internals.client.onDisconnect = function (willReconnect, log){

    internals.server.log(['api-commands', 'onDisconnect'], { willReconnect: willReconnect, log: JSON.stringify(log) } );
};


internals.client.onUpdate = function (message){

    internals.server.log(['api-commands', 'onUpdate'], { message: message  } );
};



// TODO: execute a pg function every 10 minutes which will compact the 
// t_gpio_state table
internals.updateGpioState = function (value){

    console.log('updateGpioState: ', value)
    const now = new Date().toISOString();
    const obj = {
        value: value,
        start: now,
        end: now
    };

    Pg.connect(Config.get('db:postgres'), function (err, pgClient, done) {

        if (err) {
            internals.server.log(['error', 'updateGpioState'], err.message);
            return;
        }

        pgClient.query(Sql.insertGpioState(obj), function (err, result) {

            done();

            if (err) {
                internals.server.log(['error', 'updateGpioState'], err.message);
            }
        });
    });

};

internals.readGpio = function (){

    const value = Utils.gpioReadSync(Config.get('gpioPin'));
    internals.updateGpioState(value);

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

