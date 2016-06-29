var ChildProcess = require("child_process");
const Path = require("path");
const Util = require('util');

var internals = {};

internals.count = 0;
internals.array = [];
internals.increase = function(){

    console.log("---")
    console.log("count: " + internals.count);

    for(var i=0, l=1000000; i<l; i++){
        internals.array.push(i);
    }

    internals.count++;
};



exports.register = function(server, options, next){

    console.log("increase memory");
    setInterval(internals.increase, 1000)

    return next();

};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the directory
};
