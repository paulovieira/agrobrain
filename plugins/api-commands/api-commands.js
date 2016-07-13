'use strict';

const Path = require('path');
const Nes = require('nes');

const internals = {};

internals.endpoints = {
    commands: '/api/v1/commands'
};

internals.client = new Nes.Client('ws://localhost:8000');

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

internals.status = false;

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

                internals.server.log(['api-commands', 'subscribe'], { message: message } );
            },
            function (err){

                if (err){
                    internals.server.log(['error', 'api-commands', 'subscribe'], { message: err.message, type: err.type } );
                }
            }
        );

    });


    server.route({
        path: '/change-status',
        method: 'GET',
        config: {},
        handler: function (request, reply){

            internals.status = !internals.status;

            const options = {
                path: '/api/v1/set-status',
                method: 'PUT',
                payload: JSON.stringify({ status: internals.status })
            };

            internals.client.request(options, function (err, serverPayload, statusCode){

                if (err){
                    internals.server.log(['error', 'api-commands', 'request'], { message: err.message, type: err.type } );
                    return;
                }

                if (statusCode !== 200){
                    internals.server.log(['error', 'api-commands', 'request'], 'status code is not 200');
                    return;
                }

                internals.server.log(['api-commands', 'request'], serverPayload);
                return;
            });

            return reply(internals.status);
        }
    });

    return next();
};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the file
    dependencies: ['nes']
};
