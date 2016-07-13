'use strict';

module.exports = {

    onConnection: function (socket){

        console.log('new client (should never be called because we are a client): ', socket.id);
    },
    onDisconnection: function (socket){

        console.log('terminated client (should never be called because we are a client): ', socket.id);
    },
    onMessage: function (socket, message, next){

        console.log('new message (should never be called because we are a client): ', message);
        console.log('client: ', socket.id);
        const data = { status: 'received', ts: new Date().toISOString() };

        return next(data);
    },

    auth: false,

    payload: {

        // maximum number of characters allowed in a single WebSocket message;
        // important when using the protocol over a slow network with large updates as the transmission
        // time can exceed the timeout or heartbeat limits which will cause the client to disconnect.
        maxChunkChars: false
    },

    heartbeat: {
        interval: 15000,
        timeout: 10000
    }

};

