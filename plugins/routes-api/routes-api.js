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
    // if more types are added, the sql code must be updated as well
    type: Joi.string().valid('t', 'h').required(),  
    desc: Joi.string()
});



internals.execAggregate = function(reply){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        var boom;
        if (err) {

            // TODO: add an informative email to the queue
            // TODO: add some information to the file log

            if(reply){
                boom = Boom.badImplementation();
                boom.output.payload.message = err.message;
                return reply(boom);
            }

            throw err;
        }

        console.log(internals.aggQuery);

        pgClient.query(internals.aggQuery, function(err, result) {

            done();

            if (err) {

                // TODO: add an informative email to the queue
                // TODO: add some information to the file log

                if(reply){
                    boom = Boom.badImplementation();
                    boom.output.payload.message = err.message;
                    return reply(boom);
                }

                throw err;
            }

            else{
                var output = 'ok!';

                if(reply){
                    return reply(output);        
                }

                console.log(output);
                return;
            }

        });
    });
};

internals.execAggregateSync = function(reply){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        var boom;
        if (err) {

            // TODO: add an informative email to the queue
            // TODO: add some information to the file log

            if(reply){
                boom = Boom.badImplementation();
                boom.output.payload.message = err.message;
                return reply(boom);
            }

            throw err;
        }

        console.log(internals.aggSyncQuery);

        pgClient.query(internals.aggSyncQuery, function(err, result) {

            done();

            if (err) {

                // TODO: add an informative email to the queue
                // TODO: add some information to the file log

                if(reply){
                    boom = Boom.badImplementation();
                    boom.output.payload.message = err.message;
                    return reply(boom);
                }

                throw err;
            }

            if(result.rowCount===0){
                var output = 'nothing to sync';

                if (reply){
                    return reply(output);
                }

                console.log(output);
                return;
            }

            else{
                if(reply){
                    return reply(result.rows)        
                }

                console.log(result.rows);
                return;
            }

        });
    });
}

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

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=20.1&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=80.1&data[0][type]=h&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=3000&data[0][type]=h&data[0][desc]=microfone_1' http://localhost:8000/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=90.1&data[0][type]=h&data[0][desc]=pt_robotics' http://localhost:8000/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=99.9&data[0][type]=h&data[0][desc]=pt_robotics' http://localhost:8000/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=99.9&data[0][type]=h&data[0][desc]=pt_robotics&data[1][sid]=1235&data[1][value]=20.1&data[1][type]=t&data[1][desc]=pt_robotics' http://localhost:8000/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=4000.9&data[0][type]=h&data[0][desc]=pt_robotics&data[1][sid]=1235&data[1][value]=-40.1&data[1][type]=t&data[1][desc]=pt_robotics' http://localhost:8000/api/v1/readings;
sleep 1;









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



    // aggregate data

    if(!options.aggInterval){
        throw new Error('missing options.aggInterval');
    }

    // this query doesn't change (after the plugin is registered)
    internals.aggQuery = Sql.aggregate(options.aggInterval);

    // internals.execAggregate will be executed for the first time only after 
    // the interval time has passed
    const aggInterval = options.aggInterval*internals['oneMinute'];
    setInterval(internals.execAggregate, aggInterval);

    // route to manually execute the aggregate query (for debugging only)
    server.route({
        path: options.pathAgg || '/agg',
        method: 'GET',
        config: {
        },
        handler: function(request, reply) {

            internals.execAggregate(reply);
        }
    });




    // aggregate sync

    if(!options.aggSyncInterval){
        throw new Error('missing options.aggSyncInterval');
    }
    if(!options.aggSyncMax){
        throw new Error('missing options.aggSyncMax');
    }

    // this query doesn't change (after the plugin is registered)
    internals.aggSyncQuery = Sql.aggregateSync(options.aggSyncMax);
    const aggSyncInterval = options.aggSyncInterval*internals['oneMinute'];
    setInterval(internals.execAggregateSync, aggSyncInterval);

    // route to manually execute the aggregate sync (for debugging only)
    server.route({
        path: options.pathAggSync || '/agg-sync',
        method: 'GET',
        config: {
        },
        handler: function(request, reply) {

            internals.execAggregateSync(reply);
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
-use the same tests that wre used here: 
http://www.jeffgeerling.com/blogs/jeff-geerling/raspberry-pi-microsd-card
-make sure the hour is always correct some minutes after the pi boots (retrieve the time from a server)


-create a temporary table t_raw_invalid, to store the values from t_raw that were not used in aggregate function
the data from this table should be delete periodically

-when doing the sync, if it isn't successfull, try again for n times after 2 min

-after the data has been syncronized, delete it from the local db?

-when pm2 restart the process (because the memory has reached the limit), what signal does it send? the app should be able to gracefully finish what it is doing


*/