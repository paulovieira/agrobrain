var Path = require("path");

var internals = {
    rootDir: Path.join(__dirname, "..")
};

module.exports = {
   
    applicationTitle: 'agrobrain-cloud-server',

    host: "localhost",
    port: 8001,

    publicUri: "",  // host
    publicPort: 8001,  // probably 80
    publicIp: "127.0.0.1",

    clientToken: '',
    
    syncBaseUrl: '',
    syncUri: '/api/v1/sync',

    rootDir: internals.rootDir,

    db: {

        postgres: {
            host: "localhost",
            port: 5432,
            database: "",
            username: "",
            password: "",
        },
    },

    hapi: {

        ironPassword: "",
/*
        // options for the Hapi.Server object (to be used in the main index.js)
        server: {

            //  default connections configuration
            connections: {

                // controls how incoming request URIs are matched against the routing table
                router: {
                    isCaseSensitive: false,
                    stripTrailingSlash: true
                },

                // default configuration for every route.
                routes: {
                    state: {
                        // determines how to handle cookie parsing errors ("ignore" = take no action)
                        failAction: "ignore"
                    },

                    // disable node socket timeouts (useful for debugging)
                    timeout: {
                        server: false,
                        socket: false
                    }
                }
            }
        },
*/

        // documentation: https://github.com/hapijs/joi#validatevalue-schema-options-callback
        joi: {
/*
            abortEarly: true,  // returns all the errors found (does not stop on the first error)
            stripUnknown: true,  // delete unknown keys; this means that when the handler executes, only the keys that are explicitely stated
            // in the schema will be present in request.payload and request.query 
            convert: true
*/

    /*

            allowUnknown: false, // allows object to contain unknown keys; note that is stipUnknown option is used, this becomes obsolete (because all unknown keys will be removed before the check for unknown keys is done)

            convert: ...
            skipFunctions: ...
            stripUnknown: ...
            language: ...
            presence: ...
            context: ...
    */
        },
    },

};

