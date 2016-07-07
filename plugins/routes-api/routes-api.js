var Path = require('path');
var _ = require('underscore');
var Joi = require('joi');
var Boom = require('boom');
var Pg = require('pg');
var Wreck = require('wreck');
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

internals.syncUri = Config.get('syncUri') + '?clientToken=' + Config.get('clientToken');

internals.syncOptions = {
    baseUrl: Config.get('syncBaseUrl'),
    timeout: 30*1000,
    //payload: ...

    json: 'force',
    headers: {
        'content-type': 'application/json'
    }
};


internals.execAggregate = function(){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        var boom;
        if (err) {
/*
            if(reply){
                boom = Boom.badImplementation();
                boom.output.payload.message = err.message;
                return reply(boom);
            }
*/
            // TODO: add to logs + email
            throw err;
        }

        console.log(internals.aggQuery);

        pgClient.query(internals.aggQuery, function(err, result) {

            done();

            if (err) {
                throw err;
            }

            internals.server.log(['agg'], 'ok')
        });
    });
};

internals.execAggregateSync = function(){

    internals.server.log(['agg-sync'], Date.now());
    //return;

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
            // TODO: add to logs + email
            throw err;
        }

        console.log(internals.aggSyncQuery);
    
        pgClient.query(internals.aggSyncQuery, function(err, result) {

            done();

            if (err) {
                // TODO: add to logs + email
                throw err;
            }

            if(result.rowCount===0){
                internals.server.log(['agg-sync'], 'nothing to sync');
                return;
            }
            else{

                internals.syncOptions.payload = undefined;
                internals.syncOptions.payload = JSON.stringify(result.rows);

                console.log(internals.syncUri)
                console.log(internals.syncOptions)

                Wreck.put(internals.syncUri, internals.syncOptions, function(err, response, serverPayload){

                    if (err) {
                        internals.server.log(['error', 'wreck'], {message: err.message});
                    }

                    internals.server.log(['agg-sync'], 'ok');
                    // TODO: if statusCode === 200, update the local database
                    console.log(serverPayload);
                    return;
                })

            }
        });
    });


    // auxiliary query - to be deleted later
    // we should have a new entry in the table every 30min (aggInterval)
    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) { throw err; }

 
        pgClient.query('insert into temp_notify values(now())', function(err, result) {

            done();
        });
    });

}

exports.register = function(server, options, next){

    internals.server = server;

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

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=20.1&data[0][type]=t&data[0][desc]=microfone_1' http://localhost:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=80.1&data[0][type]=h&data[0][desc]=microfone_1' http://localhost:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-777&data[0][sid]=1234&data[0][value]=3000&data[0][type]=h&data[0][desc]=microfone_1' http://localhost:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=90.1&data[0][type]=h&data[0][desc]=pt_robotics' http://localhost:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=99.9&data[0][type]=h&data[0][desc]=pt_robotics' http://localhost:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=99.9&data[0][type]=h&data[0][desc]=pt_robotics&data[1][sid]=1235&data[1][value]=20.1&data[1][type]=t&data[1][desc]=pt_robotics' http://localhost:8001/api/v1/readings;
sleep 1;

curl -v -L -G -d 'mac=999-888-666&data[0][sid]=1235&data[0][value]=4000.9&data[0][type]=h&data[0][desc]=pt_robotics&data[1][sid]=1235&data[1][value]=-40.1&data[1][type]=t&data[1][desc]=pt_robotics' http://localhost:8001/api/v1/readings;
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

                    return reply({ newRecords: result.rowCount, ts: new Date().toISOString() });
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
            return reply(`[${ new Date().toISOString() }]: check the output in the console`);
        }
    });




    // aggregate sync

    // if(!options.aggSyncInterval){
    //     throw new Error('missing options.aggSyncInterval');
    // }
    if(!options.aggSyncMax){
        throw new Error('missing options.aggSyncMax');
    }

    // this query doesn't change (after the plugin is registered), so we store it in the internals
    internals.aggSyncQuery = Sql.aggregateSync(options.aggSyncMax);


    //const aggSyncInterval = options.aggSyncInterval*internals['oneMinute'];
    //setInterval(internals.execAggregateSync, aggSyncInterval);

    // route to manually execute the aggregate sync (for debugging only)
/*
    server.route({
        path: options.pathAggSync || '/agg-sync',
        method: 'GET',
        config: {
        },
        handler: function(request, reply) {

            internals.execAggregateSync();
            return reply(`[${ new Date().toISOString() }]: check the output in the console`);
        }
    });
*/

    // attach listener to the 't_agg_insert' channel from postgres; when new rows are inserted in
    // t_agg, a trigger function will will publish an event on this channel (via pg_notify)

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
            throw err;
        }

        pgClient.query("LISTEN t_agg_insert", function(err, result) {

            // important: here we shouldn't release the connection
            // TODO: will the connection be always live?

            if (err) {
                throw err;
            }

            // pgClient.on('notification', function(msg){

            //     server.log('agg-sync', msg);
            //     internals.execAggregateSync();
            // })

            // TODO: is the callback executed only once, even if the trigger function is
            // executed twice?
            pgClient.on('notification', _.debounce(internals.execAggregateSync, 5000));
        });
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
