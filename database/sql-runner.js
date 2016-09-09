'use strict';

require('../config/load');

const Config = require('nconf');
const Glob = require('glob');
const Chalk = require('chalk');
const Psql = require('psql-wrapper');

const internals = {};

internals.createPreRequisites = function (){

    // the order in the array returned by glob is lexicographic, so we can define the order
    // that the scripts will run by simply pre-pending numbers in the filename
    Glob.sync('database/0_prerequisites/*.sql').forEach((scriptPath) => {

        try {
            Psql({ file: scriptPath });
        }
        catch (err){
            process.exit();
        }

    });
};

internals.createTables = function (){

	// the order in the array returned by glob is lexicographic, so we can define the order
	// that the scripts will run by simply pre-pending numbers in the filename
    Glob.sync('database/1_tables/*.sql').forEach((scriptPath) => {

        try {
            Psql({ file: scriptPath });
        }
        catch (err){
            process.exit();
        }

    });

};

internals.createFunctions = function (){

	// the order in the array returned by glob is lexicographic, so we can define the order
	// that the scripts will run by simply pre-pending numbers in the filename
    Glob.sync('database/2_functions/*.sql').forEach((scriptPath) => {

        try {
            Psql({ file: scriptPath });
        }
        catch (err){
            process.exit();
        }

    });

};


Psql.configure({
    dbname: Config.get('db:postgres:database'),
    username: Config.get('db:postgres:username')
});

internals.createPreRequisites();
internals.createTables();
internals.createFunctions();

console.log(Chalk.green.bold('\nsql scripts ran successfully!'));

