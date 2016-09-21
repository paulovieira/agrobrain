'use strict';

//const ChildProcess = require('child_process');
//const Config = require('nconf');

const internals = {};
internals.value = 0;

module.exports.setServer = function (server){

    internals.server = server;
};


module.exports.logErr = function (err, tags){

    tags = tags || [];
    tags.push('error');

    // we consider 3 types of error objects: 1) general errors 2) postgres errors 3) boom errors
    // 2) and 3) have more properties than the general errors

    let errType = 'general';

    // duck typing
    for (let key in err){
        if (key === 'name'){
            errType = 'postgres';
            tags.push('postgres');
            break;
        }
    }

    if (err.isBoom){
        errType = 'boom';
        tags.push('boom');
    }

    const logObj = { message: err. message };

    // add extra properties if type is boom or postgres
    if (errType === 'boom'){
        logObj['data']     = err['data'];
        logObj['isServer'] = err['isServer'];
        logObj['output']   = err['output'];
        logObj['reformat'] = err['reformat'];
    }
    else if (errType === 'postgres'){
        logObj['stack']            = err['stack'];
        logObj['message']          = err['message'];
        logObj['name']             = err['name'];
        logObj['length']           = err['length'];
        logObj['severity']         = err['severity'];
        logObj['code']             = err['code'];
        logObj['detail']           = err['detail'];
        logObj['hint']             = err['hint'];
        logObj['position']         = err['position'];
        logObj['internalPosition'] = err['internalPosition'];
        logObj['internalQuery']    = err['internalQuery'];
        logObj['where']            = err['where'];
        logObj['schema']           = err['schema'];
        logObj['table']            = err['table'];
        logObj['column']           = err['column'];
        logObj['dataType']         = err['dataType'];
        logObj['constraint']       = err['constraint'];
        logObj['file']             = err['file'];
        logObj['line']             = err['line'];
        logObj['routine']          = err['routine'];

    }

    logObj['stack'] = err['stack'];

    internals.server.log(tags, logObj);
};
