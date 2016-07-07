var Path = require('path');
var Config = require('nconf');

/*
ops - System and process performance - CPU, memory, disk, and other metrics.
response - Information about incoming requests and the response. This maps to either the "response" or "tail" event emitted from hapi servers.
log - logging information not bound to a specific request such as system errors, background processing, configuration errors, etc. Maps to the "log" event emitted from hapi servers.
error - request responses that have a status code of 500. This maps to the "request-error" hapi event.
request - Request logging information. This maps to the hapi 'request' event that is emitted via request.log().
*/



module.exports = {
    ops: {
        interval: 120*1000
    },
};

var internals = {}
internals.reporters = {}

// add good reporters, unless they are explicitely turned off

if(Config.get('good-console')!=="false"){

    internals.reporters['console'] = [
        {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: '*', response: '*', error: '*', request: '*' }]
        }, 
        {
            module: 'good-console'
        }, 
        'stdout'
    ];
}

if(Config.get('good-file')!=="false"){

    internals.reporters['filex'] = [
        {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: '*', response: '*', error: '*', request: '*' }]
        }, 
        {
            module: 'good-squeeze',
            name: 'SafeJson',
            args: [ null, { separator: ',' } ]
        }, 
        {
            module: 'rotating-file-stream',
            // rotates the file when its size exceeds x KiloBytes (xK) or y MegaBytes (yM)
            //args: [ 'xxx', { size: '1M', path: Path.join(Config.get('rootDir'), 'logs') } ]  
            args: [ 'general', { size: '1M',  path: Path.join(Config.get('rootDir'), 'logs') } ]  
        }
    ];
}

// if(Config.get('good-file-ops')!=="false"){

//     internals.reporters['file-ops'] = [
//         {
//             module: 'good-squeeze',
//             name: 'Squeeze',
//             args: [{ ops: '*' }]
//         }, 
//         {
//             module: 'good-squeeze',
//             name: 'SafeJson',
//             args: [ null, { separator: ',' } ]
//         }, 
//         {
//             module: 'rotating-file-stream',
//             // rotates the file when its size exceeds x KiloBytes (xK) or y MegaBytes (yM)
//             args: [ 'yyy', { size: '1M', path: Path.join(Config.get('rootDir'), 'logs/ttt') } ]  
//             //args: [ 'yyy', { size: '1M',  } ]  
//         }
//     ];
// }

module.exports.reporters = internals.reporters;
