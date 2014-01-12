var EventEmitter = require('events').EventEmitter;
var child_process = require('child_process');
var path = require('path');
var util = require('util');
var Q = require('q');

function Inspector() {
	EventEmitter.call(this);
};

util.inherits(Inspector, EventEmitter);

Inspector.prototype.launch = function(params) {
	var me = this;
	
	return Q.fcall(function() {
		var deferred = Q.defer();
		
		try {
			require.resolve('node-inspector/bin/inspector');
		}
		catch (e) {
			throw new Error('Unable to locate node-inspector package.');
		}
		
		me.on(
			'listening',
			function(url) {
				deferred.resolve(url);
			}
		);
		
		me.on(
			'error',
			function() {
				deferred.reject();
			}
		);
		
		me._launch(params);
		
		return deferred.promise;
	});
};

Inspector.prototype._launch = function(params) {
	var args = [];
	
	for (var key in params) {
		args.push('--' + key, params[key]);
	}
	
	var child = child_process.fork(
		path.join(__dirname, 'inspector-bin.js'),
		args
	);
	
	var me = this;
	
	child.on(
		'message',
		function(data) {
			if (data.event === 'SERVER.LAUNCHING') {
				me.emit('launching', data.version);
			}
			else if (data.event === 'SERVER.LISTENING') {
				me.emit('listening', data.address.url);
			}
			else if (data.event === 'SERVER.CONNECTED') {
				me.emit('connected');
			}
			else if (data.event === 'SERVER.ERROR') {
				var message = data.message;
				
				if (error.code === 'EADDRINUSE') {
					message += '\nThere is another process already listening at this address.';
					message += '\nSpecify `inspectorArgs: { "web-port": port }` to use a different port.';
				}
				
				me.emit('error', message);
			}
		}
	);
	
	child.on(
		'exit',
		function(code) {
			if (code != 0) {
				me.emit('error', 'Inspector terminated with error code: ' + code);
			}
			
			me.emit('exit');
		}
	);
};

Inspector.prototype.connect = function() {
	var deferred = Q.defer();
	
	this.on(
		'connected',
		function() {
			deferred.resolve();
		}
	);
	
	this.on(
		'error',
		function() {
			deferred.reject();
		}
	);
	
	return deferred.promise;
};

module.exports = {
	Inspector: Inspector
};