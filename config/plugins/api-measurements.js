const Config = require('nconf');

if(Config.get('env')==='dev'){
	module.exports = { 
		// interval to compute aggregate data (in minutes)
	    interval: 1,
	    syncMax: 100
	};
}
else{
	module.exports = { 
		// interval to compute aggregate data (in minutes)
	    interval: 30,
	    syncMax: 100
	};
}
