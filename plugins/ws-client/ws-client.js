/*

plugin: ws-client
description: create a nes client and make a websocket connection to the server; the client is exposed in the 'client' property

We have to deal with the 2 following scenarios:

1.1) server is initially online
1.2) client tries to connect (connection is established)
1.3) server goes offline (connection is dropped)
1.4) server goes online again (connection is re-established)

Nes is prepared to handle this. However if the server is initially offline we will have problems:

2.1) server is initially offline
2.2) client tries to connect (connection is not established)
2.3) server goes online (client won't try to reconnect)

So we have to wrap the call client.connect in a callback to setInterval which is repeatedly called
until the connection is established.

TODO: when connecting we should send some kind of credentials ('auth' property)

*/

'use strict';

const Path = require('path');
const Nes = require('nes');
const Config = require('nconf');
const Utils = require('../../utils/util');

const internals = {};

internals.connectOptions = {
    // auth: ...
    delay: 1000,
    maxDelay: 15000,
    // retries: ...
    // timeout: ...
};

exports.register = function (server, options, next){

    const client = new Nes.Client('ws://' + Config.get('baseUrlCloud') /*, { timeout: 5000 }*/);
    client.onError = internals.onError;
    client.onConnect = internals.onConnect;
    client.onDisconnect = internals.onDisconnect;

    internals.client = client;
    internals.server = server;

    // the websocket client will be used in other plugins
    server.expose('client', internals.client);
    console.log("can get reference to the client")

    // establish the websocket connection only after the server has started (is it really necessary?)
    server.ext('onPostStart', function (server2, next2){

        const interval = Config.get('env') === 'dev' ? 1000 : 15000;
        const initialConnectionTimer = setInterval(() => {

            client.connect(internals.connectOptions , function (err){

                if (err){
                    Utils.logErr(err, ['ws-client', 'initialConnection']);
                    client.disconnect();
                    return;
                }

                // after the connection is established for the first time, nes will handle any future 
                // connection drops (will automatically try to reconnect)
                server.log(['ws-client', 'initialConnection'], { message: 'ws connection (initial)', id: client.id });
                clearInterval(initialConnectionTimer);
            });

        }, interval);
    });

    return next();
};

internals.onError = function (err){

    Utils.logErr(err, ['ws-client']);
};

internals.onConnect = function (){

    internals.server.log(['ws-client', 'onConnect'], { message: 'ws reconnection', id: internals.client.id });
};

internals.onDisconnect = function (willReconnect, log){

    // should also get logged by the onError callback
    internals.server.log(['ws-client', 'onDisconnect'], { willReconnect: willReconnect, log: log } );
};

internals.onUpdate = function (message){

    internals.server.log(['ws-client', 'onUpdate'], { message: message });
};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the file
    dependencies: ['nes']
};