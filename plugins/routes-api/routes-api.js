var Path = require('path');
var Joi = require('joi');
var Boom = require('boom');
var Pg = require('pg');
var Config = require('nconf');
var Sql = require('./sql-templates');

var internals = {};

internals.oneMinute = 60*1000;

internals.readingSchema = Joi.object({
    sid: Joi.number().integer().required(),
    value: Joi.number().required(),
    type: Joi.string().required(),
    desc: Joi.string()
});

internals.execAggregate = function(){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
            // TODO: add an informative email to the queue
            // TODO: add some information to the file log
            throw err;
        }

        console.log(internals.aggregateQuery);

        pgClient.query(internals.aggregateQuery, function(err, result) {

            done();

            if (err) {
                // TODO: add an informative email to the queue
                // TODO: add some information to the file log
                throw err;
            }

        });
    });
};

exports.register = function(server, options, next){

    server.route({
        path: options.pathReadings || '/readings',
        method: 'GET',
        config: {
            validate: {
                query: {
                    mac: Joi.string().required(),
                    data: Joi.array().items(internals.readingSchema).required()
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

the combination of sid and type is unique

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=20.1&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=80.1&data[0][type]=h&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=90.1&data[0][type]=h&data[0][desc]=pt_robotics' http://localhost:8000/api/v1/readings

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=99.9&data[0][type]=h&data[0][desc]=pt_robotics' http://localhost:8000/api/v1/readings

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=99.9&data[0][type]=h&data[0][desc]=pt_robotics&data[1][sid]=1235&data[1][value]=20.1&data[1][type]=t&data[1][desc]=pt_robotics' http://localhost:8000/api/v1/readings






curl -v -L -G -d 'mac=999-888-555&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings

curl -v -L -G -d 'mac=999-888-555&data[0][sid]=1234&data[0][value]=20.1&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings
         

*/

            if(request.query.data.length===0){
                return reply(Boom.badRequest('No readings have been sent'));
            }
            
            if(Config.get('env')==='production'){
                console.log(request.query);
            }
            
            
            Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

                var boom;
                if (err) {
                    boom = Boom.badImplementation();
                    boom.output.payload.message = err.message;
                    return reply(boom);
                }

                pgClient.query(Sql.insert(request.query.mac, request.query.data), function(err, result) {

                    done();

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




    if(!options.aggInterval){
        throw new Error('missing options.aggInterval');
    }

    // the aggregate query does not change after the server is initialized; the only option is
    // given by the plugin option "aggInterval" (which is also used in the timer below)
    internals.aggregateQuery = Sql.aggregate(options.aggInterval);

    // internals.execAggregate will be executed for the first time only after the interval
    // has passed
    const interval = options.aggInterval*internals['oneMinute'];
    setInterval(internals.execAggregate, interval);

    // create route to manually execute the aggregate query (for debugging only)
    server.route({
        path: options.pathAgg || '/agg',
        method: 'GET',
        config: {
        },
        handler: function(request, reply) {

            internals.execAggregate();
            return reply('ok');
        }
    });

    return next();
};

exports.register.attributes = {
    name: Path.parse(__dirname).name,  // use the name of the directory
};


/*
TODO:
we must have some sort of queue system that sends email when something wrong has happened or is about to happen
these messages should also be added to an append only log, which should almost surely be saved

-connection to db failed
-sync with cloud failed after x times 
-free space is < ...
-cpu load is > ... for the last hour



-create a temporary table t_raw_invalid, to store the values from t_raw that were not used in aggregate function
the data from this table should be delete periodically

*/