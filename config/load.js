'use strict';

const Path = require('path');
const Nconf = require('nconf');
const Chalk = require('chalk');

// 1 - load a dummy empty configuration from file; we do this only to be able to use the .set method below;
// (this is a bug from nconf, for more details see: https://github.com/indexzero/nconf/issues/197 )
Nconf.file('empty.json');

// 2 - load the command line arguments into Nconf; one of the following should be given:
// '--dev' or '--production'
Nconf.argv();


// 3 - load the configuration object specific to the environment (either config/production.js or config/dev.js)
let configPath = '';
let env = '';

if (!!Nconf.get('production')){
    configPath = './production.js';
    env = 'production';
}
else if (!!Nconf.get('dev')){
    configPath = './dev.js';
    env = 'dev';
}
else {
    console.log('Invalid environment (use either "--dev" or "--production"');
    process.exit();
}

// manually update the 'env' configuration property (to be used throughout the application); this is
// equivalent to the traditional NODE_ENV
Nconf.set('env', env);

// the NODE_ENV env variable is used by webpack to build different targets, so we set it as well;
// note that by setting "export NODE_ENV=..." in the shell won't have any effect because we are
// setting the property directly in the process.env object
process.env.NODE_ENV = env;
global.NODE_ENV = env;

Nconf.overrides(require(configPath));

// 4 - load the default configuration (these options will be applied only if they aren't already)
const defaultPath = './default.js';
Nconf.defaults(require(defaultPath));

// 5 - output info
console.log(Chalk.green('================='));
console.log(Chalk.bold('Configuration has been loaded'));
console.log('1. default configuration file: ', Chalk.bold(Path.join(__dirname, defaultPath)));
console.log('2. environment configuration (overrides default config): ', Chalk.bold(Path.join(__dirname, configPath)));

let argv = '';
for (let i = 2; i < process.argv.length; ++i) {
    argv += process.argv[i] + ' ';
}

console.log('3. command line configuration (overrides default and environment config):', Chalk.bold(argv));

// give information about command line options that enable/disable some option
console.log('\nNOTE: to see the postgres queries in the console, use the option "--pg-monitor" ');

console.log(Chalk.green('=================\n'));
