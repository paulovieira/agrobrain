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

/*

mac=334&
data[0][sid]=834&
data[0][value]=23.3&
data[0][type]=t&
data[0][desc]=microfone_1

combination of sid and type is unique

curl -v -L -G -d 'mac=334&data[0][sid]=834&data[0][value]=23.3&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings
            
averages:

 



*/

                
            console.log(request.query);
            return reply("to be done");
            
            Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

                var boom, mac;
                if (err) {
                    boom = Boom.badImplementation();
                    boom.output.payload.message = err.message;
                    return reply(boom);
                }

                mac = request.query.mac;
                delete request.query.mac;

                var names = Object.keys(request.query);
                if(names.length===0){
                    return reply(Boom.badRequest('No readings have been sent'));
                }

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
