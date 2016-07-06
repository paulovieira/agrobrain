require('../config/load');

var Config = require('nconf');
var Glob = require('glob');
var Chalk = require('chalk');
var Psql = require('psql-wrapper');
//var Psql = require('../../psql-wrapper');

var internals = {};

internals.createTablesAndFunctions = function(){

	// the order in the array returned by glob is lexicographic, so we can define the order
	// that the scripts will run by simply pre-pending numbers in the filename
	Glob.sync('database/*(1|2|3)_*/*.sql').forEach(function(scriptPath){

		try{
			Psql({ file: scriptPath });
		}
		catch(err){
			process.exit();
		}

	});

};


Psql.configure({
	dbname: Config.get('db:postgres:database'),
	username: Config.get('db:postgres:username')
});

internals.createTablesAndFunctions();

console.log(Chalk.green.bold("\nsql scripts ran successfully!"));

