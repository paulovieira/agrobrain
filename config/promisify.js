'use strict';

const Promise = require('bluebird');
const Wreck = Promise.promisifyAll(require('wreck'), { multiArgs: true });
