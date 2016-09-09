'use strict';

/* execute code that calls bluebird's promisify or promisifyAll */

const Promise = require('bluebird');

// Wreck
Promise.promisifyAll(require('wreck'), { multiArgs: true });
