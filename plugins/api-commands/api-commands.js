'use strict';

const Path = require('path');
const Nes = require('nes');
const Config = require('nconf');
const Utils = require('../../utils/util');

const internals = {};

internals.endpoints = {
    commands: '/api/v1/commands',
    setState: '/api/v1/set-state'
};

internals.client = new Nes.Client(Config.get('websocketUrlBase'));

internals['tenSeconds'] = 10 * 1000;

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

    setInterval(internals.readGpio, internals['tenSeconds']);

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


internals.readGpio = function (){

    const value = Utils.gpioReadSync(Config.get('gpioPin'));
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

