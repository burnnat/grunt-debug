var fs = require('fs');
var path = require('path');
var util = require('util');

var DebugServer = require('node-inspector/lib/debug-server.js').DebugServer;
var config = require('node-inspector/lib/config.js');
var packageJson = require('node-inspector/package.json');

var notifyParentProcess = getNotifyParentProcessFn();

notifyParentProcess({
	event: 'SERVER.LAUNCHING',
	version: packageJson.version
});

var debugServer = new DebugServer();

debugServer.on('error', onError);
debugServer.on('listening', onListening);

debugServer.on(
	'close',
	function() {
		process.exit();
	}
);

debugServer.start(config);

debugServer.wsServer.sockets.on(
	'connection',
	function(connection) {
		connection.on('message', function(data) {
			var message = JSON.parse(data);
			
			if (message.method === 'Runtime.enable') {
				notifyParentProcess({
					event: 'SERVER.CONNECTED'
				});
			}
		});
	}
);

function onError(err) {
	notifyParentProcess({
		event: 'SERVER.ERROR',
		error: err,
		message: util.format(
			'Cannot start the server at %s:%s. Error: %s.',
			config.webHost || '0.0.0.0',
			config.webPort,
			err.message || err
		)
	});
}

function onListening() {
	var address = this.address();
	
	notifyParentProcess({
		event: 'SERVER.LISTENING',
		address: address
	});
}

function getNotifyParentProcessFn() {
	if (!process.send) {
		return function(msg) {};
	}

	return function(msg) {
		process.send(msg);
	};
}
