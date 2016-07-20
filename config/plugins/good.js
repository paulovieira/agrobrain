'use strict';

const Path = require('path');
const Config = require('nconf');

const internals = {};

// rotates the file when its size exceeds the given size (format: xK or xM)
//internals.maxSize = '5K';
internals.maxSize = '1M';
internals.logDir = Path.join(Config.get('rootDir'), 'logs');


/*
ops - System and process performance - CPU, memory, disk, and other metrics.
response - Information about incoming requests and the response. This maps to either the "response" or "tail" event emitted from hapi servers.
log - logging information not bound to a specific request such as system errors, background processing, configuration errors, etc. Maps to the "log" event emitted from hapi servers.
error - request responses that have a status code of 500. This maps to the "request-error" hapi event.
request - Request logging information. This maps to the hapi 'request' event that is emitted via request.log().
*/

module.exports = {
    ops: {
        interval: 120 * 1000
        //interval: 3 * 1000
    }
};


internals.reporters = {};
 

// add good reporters, unless they are explicitely turned off

if (Config.get('env') === 'dev'){

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

    // filter for errors (both internal and from the application)
    internals.reporters['errors'] = [
        {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: 'error', error: '*' }]
        },
        {
            module: 'good-squeeze',
            name: 'SafeJson',
            args: [null]
        },
        {
            module: 'rotating-file-stream',
            args: ['errors', { size: internals.maxSize, path: internals.logDir }]
        }
    ];

    // some events in the 'general' file are repeated in the 'error' (the application errors)
    internals.reporters['general'] = [
        {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: '*', response: '*', request: '*' }]
        }, 
        {
            module: 'good-squeeze',
            name: 'SafeJson',
            args: [null]
        }, 
        {
            module: 'rotating-file-stream',
            args: ['general', { size: internals.maxSize, path: internals.logDir }]  
        }
    ];

    internals.reporters['ops'] = [
        {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ ops: '*' }]
        }, 
        {
            module: 'good-squeeze',
            name: 'SafeJson',
            args: [null]
        }, 
        {
            module: 'rotating-file-stream',
            args: [ 'ops', { size: internals.maxSize, path: internals.logDir } ]  
        }
    ];
}

else if (Config.get('env') === 'production'){

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


    // filter for errors (both internal and from the application)
    internals.reporters['errors'] = [
        {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: 'error', error: '*' }]
        },
        {
            module: 'good-squeeze',
            name: 'SafeJson',
            args: [null]
        },
        {
            module: 'rotating-file-stream',
            args: ['errors', { size: internals.maxSize, path: internals.logDir }]
        }
    ];

    // some events in the 'general' file are repeated in the 'error' (the application errors)
    internals.reporters['general'] = [
        {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: '*', response: '*', request: '*' }]
        }, 
        {
            module: 'good-squeeze',
            name: 'SafeJson',
            args: [null]
        }, 
        {
            module: 'rotating-file-stream',
            args: ['general', { size: internals.maxSize, path: internals.logDir }]  
        }
    ];

    internals.reporters['ops'] = [
        {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ ops: '*' }]
        }, 
        {
            module: 'good-squeeze',
            name: 'SafeJson',
            args: [null]
        }, 
        {
            module: 'rotating-file-stream',
            args: [ 'ops', { size: internals.maxSize, path: internals.logDir } ]  
        }
    ];
}


module.exports.reporters = internals.reporters;
