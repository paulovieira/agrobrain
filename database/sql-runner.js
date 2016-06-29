require('../config/load');

var Config = require('nconf');
var Glob = require('glob');
var Chalk = require('chalk');
var Psql = require('psql-wrapper');

var internals = {};

internals.createTables = function(){

	// the order in the array returned by glob is lexicographic, so we can define the order
	// that the scripts will run by simply pre-pending numbers in the filename
	Glob.sync('database/10_*/*.sql').forEach(function(scriptPath){

		try{
			Psql({ file: scriptPath });
		}
		catch(err){
			process.exit();
		}

	});

};

// internals.createFunctions = function(){

// 	Glob.sync("database/20_*/*.sql").forEach(function(scriptPath){

// 		try{
// 			Psql({ file: scriptPath });
// 		}
// 		catch(err){
// 			process.exit();
// 		}

// 	});
// };



Psql.configure({
	dbname: Config.get('db:postgres:database'),
	username: Config.get('db:postgres:username')
});

internals.createTables();
//internals.createFunctions();

console.log(Chalk.green.bold("\nsql scripts ran successfully!"));

