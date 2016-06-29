var Path = require('path');
var Joi = require('joi');
var Boom = require('boom');
var Pg = require('pg');
var Config = require('nconf');
var Sql = require('./sql-templates');

var internals = {};


exports.register = function(server, options, next){

    server.route({
        path: options.path,
        method: 'GET',
        config: {
            validate: {
                query: {
                    mac: Joi.string().required(),
                },
                options: {
                    allowUnknown: true
                }
            },

        },
        handler: function(request, reply) {

            //console.log(request.query);

            Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

                var boom, mac;
                if (err) {
                    boom = Boom.badImplementation();
                    boom.output.payload.message = err.message;
                    return reply(boom);
                }

                mac = request.query.mac;
                delete request.query.mac;

                pgClient.query(Sql.insert(mac, request.query), function(err, result) {

                    done();

                    var boom;
                    if (err) {
                        boom = Boom.badImplementation();
                        boom.output.payload.message = err.message;
                        return reply(boom);
                    }

                    if(result.rowCount === 0){
                        boom = Boom.badImplementation();
                        boom.output.payload.message = 'result.rowCount should be > 0 (data was not saved?)';
                        return reply(boom);
                    }

                    return reply({ newRecords: result.rowCount});
                });
            });
        }
    });

    return next();
};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the directory
};
