const Path = require('path');
const Joi = require('joi');
const Boom = require('boom');
const Pg = require('pg');
const Config = require('nconf');
const Sql = require('./sql-templates');
const Wreck = require('wreck');

const internals = {};

exports.register = function(server, options, next){

    internals.server = server;

    // aggregate data every N min (N = options.aggInterval)
    if(!options.aggInterval){
        return next(new Error('aggInterval is required'));
    }

    if(!options.aggSyncMax){
        return next(new Error('aggSyncMax is required'));
    }

    // these queries don't change after the plugin is registered, so we store it in the internals
    internals.aggQuery     = Sql.aggregate(options.aggInterval);
    internals.aggSyncQuery = Sql.aggregateSync(options.aggSyncMax);

    // internals.execAggregate will be executed for the first time only after 
    // the time of the interval time has passed
    setInterval(internals.execAggregate, options.aggInterval*internals['oneMinute']);
    //console.log("xxxxxxxxxxxxxxxxxxxxx setInterval")

    server.route({
        path: options.pathReadings || '/readings',
        method: 'GET',
        config: {

            validate: {

                query: {
                    mac: Joi.string().required(),
                    data: Joi.array().items(internals.measurementSchema).required()
                },

                options: {
                    allowUnknown: true
                }
            },

        },
        handler: function(request, reply) {

/*

curl -v -L -G -d 'xmac=999-888-777&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://$AGROBRAIN_LOCAL_SEVER:8001/api/v1/readingsx;



mac=334&
data[0][sid]=834&
data[0][value]=23.3&
data[0][type]=t&
data[0][desc]=microfone_1

the combination of sid and type is unique

export AGROBRAIN_LOCAL_SEVER=192.168.1.100
export AGROBRAIN_LOCAL_SEVER=127.0.0.1

curl -v -L -G -d 'mac=999-888-555&data[0][sid]=1234&data[0][value]=10.1&data[0][type]=t&data[0][desc]=microfone_1' http://$AGROBRAIN_LOCAL_SEVER:8000/api/v1/readings

curl -v -L -G -d 'mac=999-888-555&data[0][sid]=1234&data[0][value]=20.1&data[0][type]=t&data[0][desc]=microfone_1' http://$AGROBRAIN_LOCAL_SEVER:8000/api/v1/readings
         

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

    // route to manually execute the aggregate query (to be used in dev mode only, along with the insert_fake_data.sh script)
    server.route({
        path: '/agg',
        method: 'GET',
        handler: function(request, reply) {

            internals.execAggregate();
            return reply(`[${ new Date().toISOString() }]: check the output in the console`);
        }
    });


    return next();
};

internals.oneMinute = 60*1000;

internals.measurementSchema = Joi.object({
    sid: Joi.number().integer().required(),
    value: Joi.number().required(),
    // if more measurement types are added, we have to update here and in the sql template
    type: Joi.string().valid('t', 'h').required(),  
    desc: Joi.string()
});

internals.execAggregate = function(){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
/*
            if(reply){
                boom = Boom.badImplementation();
                boom.output.payload.message = err.message;
                return reply(boom);
            }
*/

            // TODO: add to logs + email
            internals.server.log(['error'], err.message)
            return;
        }

        //console.log(internals.aggQuery);

        pgClient.query(internals.aggQuery, function(err, result) {

            done();

            if (err) {
                internals.server.log(['error'], err.message)
                return 
            }

            internals.server.log(['agg'], 'execAggregate was done')

            // do sync now
            internals.execAggregateSync();
        });
    });
};


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

internals.execAggregateSync = function(){

    Pg.connect(Config.get('db:postgres'), function(err, pgClient, done) {

        if (err) {
            // TODO: add to logs + email
            internals.server.log(['error'], err.message)
            return;
        }

        //console.log(internals.aggSyncQuery);
    
        pgClient.query(internals.aggSyncQuery, function(err, result) {

            done();

            if (err) {
                internals.server.log(['error'], err.message)
                return;
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
                        internals.server.log(['error', 'agg-sync', 'wreck'], { message: err.message });
                        return;
                    }

                    // TODO: if statusCode === 200, update the local database
                    internals.server.log(['agg-sync'], 'sync was done');
                    console.log(serverPayload);
                    return;
                });

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
