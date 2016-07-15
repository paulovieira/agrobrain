'use strict';

const ChildProcess = require('child_process');
const Config = require('nconf');

const internals = {};
internals.value = 0;

module.exports.gpioReadSync = function (pin){

    if (Config.get('env') === 'dev'){
        internals.value++;
        return internals.value % 2;
    }

    let command = '';
    command += `gpio mode ${ pin } out; `;
    command += 'sleep 1; ';
    command += `gpio read ${ pin }; `;

    let output = '';
    try {
        output = ChildProcess.execSync(command, { encoding: 'utf8' });
        return output;
    }
    catch (err){
        console.log(err.message);
    }
    
};

module.exports.gpioWriteSync = function (pin, value){

    let command = '';
    command += `gpio mode ${ pin } out; `;
    command += 'sleep 1; ';
    command += `gpio write ${ pin } ${ value }; `;

    let output = '';
    try {
        output = ChildProcess.execSync(command, { encoding: 'utf8' });
        return output;
    }
    catch (err){
        console.log(err.message);
    }


};
