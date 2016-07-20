'use strict';

const Path = require('path');
const Nes = require('nes');
const Config = require('nconf');
const Pg = require('pg');
const Boom = require('boom');
const Db = require('../../database');
const Sql = require('./sql-templates');
const Utils = require('../../utils/util');

const internals = {};

internals.endpoints = {
    commands: '/api/v1/commands',
    setState: '/api/v1/set-state'
};

internals.client = new Nes.Client(Config.get('websocketUrlBase'));

internals['tenSeconds'] = 10 * 1000;
internals['threeSeconds'] = 3 * 1000;

internals.interval = (Config.get('env') === 'production') ? internals['tenSeconds'] : internals['threeSeconds'];

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

    setInterval(internals.readGpio, internals.interval);

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
internals.updateLogState = function updateLogState(value){

    const input = {
        gpioState: !!Number(value),
        userId: null,
        //interval: internals.interval / 1000  // the interval in postgres is defined in seconds
        interval: 'abc'
    };

    Db.func('update_log_state', JSON.stringify(input))
        .catch(function (err){

            Utils.logErr(err, ['updateLogState']);
        });
};

internals.readGpio = function (){

    const value = Utils.gpioReadSync(Config.get('gpioPin'));
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

