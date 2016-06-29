//call with: 'node restart.js  <server-port>  <process-info-path>  <memory-limit-in-mb>'

process.title = 'restart';

const ChildProcess = require('child_process');
const Fs = require('fs');
const Path =require('path');

if(process.argv.length !== 5){
	console.log("Usage: node " + process.argv[1] + "  <server-port>  <process-info-path>  <memory-limit-in-mb>")
	console.log("Example: node " + process.argv[1] + "  8000  /process-info  100");
}

var port  = process.argv[2];
var path  = process.argv[3];
var limit = process.argv[4];

var log, output, info, command;

function log(str){

	Fs.appendFileSync(Path.join(__dirname, 'restart.log'), new Date().toISOString() + ': '+ str.trim() + '\n');
}


try{

	// 1) get data about the pid and memory usage
	command = `curl --silent http://localhost:${ port }/${ path }`;
	console.log(command);
	output = ChildProcess.execSync(command);

	info = JSON.parse(output.toString());
	if(info.memoryUsage.heapUsed/1000000 > limit){

		// 2) send signal 15 (SIGTERM) to the process
		command = `kill -s 15 ${ info.pid}`;
		console.log(command);
		output = ChildProcess.execSync(command);

		log(`killed process ${ info.pid } (memoryUsage: ${ JSON.stringify(info.memoryUsage) })\n`)

		// 2) restart the process 3 seconds later
		setTimeout(() => {

			command = `node /home/pvieira/github/agrobrain/index.js --dev`;
			console.log(command);
			var a = command.split(' ');
			ChildProcess.spawn(a[0], a.slice(1), { detached: true, stdio: 'ignore' });

			log(command);

			// 3) exit the process 2 sec later
			setTimeout(() => {

				process.exit();
			}, 2000);
		}, 3000);

	}
}
catch(err){

	log(err.message);
}
