const Config = require('nconf');

if(Config.get('env')==='dev'){
	module.exports = { 
		// interval to compute aggregate data (in minutes)
	    aggInterval: 1,
	    aggSyncMax: 100
	};
}
else{
	module.exports = { 
		// interval to compute aggregate data (in minutes)
	    aggInterval: 30,
	    aggSyncMax: 100
	};
}
