var child_process = require('child_process');
var path = require('path');
var Q = require('q');

module.exports = function(grunt) {
	/**
	 * Manually forks the Grunt process for debugging
	 */
	var forkGrunt = function(brk, name) {
		var deferred = Q.defer();
		var args = process.argv;
		
		grunt.task.clearQueue();
		
		var child = child_process.fork(
			args[1],
			args.slice(
				args.indexOf(name) + 1
			),
			{
				execArgv: [
					brk
						? '--debug-brk'
						: '--debug'
				]
			}
		);
		
		child.on('exit', function(code) {
			if (code == 0) {
				deferred.resolve();
			}
			else {
				deferred.reject(code);
			}
		});
		
		return deferred.promise;
	};
	
	/**
	 * Sets up existing Grunt process for debugging
	 */
	var debugGrunt = function(brk) {
		var pid = process.pid;
		
		return Q.fcall(function() {
			if (process.platform === 'win32') {
				process._debugProcess(pid);
			}
			else {
				process.kill(pid, 'SIGUSR1');
			}
		});
	};
	
	/**
	 * Initializes a node-inspector instance
	 */
	var startInspector = function(params, requireConnect) {
		var deferred = Q.defer();
		
		try {
			require.resolve('node-inspector/bin/inspector');
		}
		catch (e) {
			deferred.reject('Unable to locate node-inspector package.');
			return deferred.promise;
		}
		
		var args = [];
		
		for (var key in params) {
			args.push('--' + key, params[key]);
		}
		
		var child = child_process.fork(
			path.join(__dirname, 'lib/inspector.js'),
			args
		);
		
		child.on(
			'message',
			function(data) {
				if (data.event === 'SERVER.LAUNCHING') {
					console.log('Node Inspector v%s', data.version);
				}
				else if (data.event === 'SERVER.LISTENING') {
					console.log('Visit %s to start debugging.', data.address.url);
					
					if (!requireConnect) {
						deferred.resolve(data.address);
					}
				}
				else if (data.event === 'SERVER.CONNECTED') {
					if (requireConnect) {
						deferred.resolve();
					}
				}
				else if (data.event === 'SERVER.ERROR') {
					deferred.reject(data.error);
				}
			}
		);
		
		child.on(
			'exit',
			function(code) {
				if (code != 0) {
					deferred.reject(code);
				}
			}
		);
		
		return deferred.promise;
	};
	
	grunt.registerTask('debug', function(type) {
		var done = this.async();
		
		var options = this.options({
			fork: false,
			inspector: false,
			inspectorArgs: {}
		});
		
		var nameArgs = this.nameArgs;
		var brk = (type === 'break');
		
		Q()
			.then(function() {
				if (options.fork) {
					return Q.all([
						forkGrunt(brk, nameArgs),
						options.inspector
							? startInspector(options.inspectorArgs, false)
							: null
					]);
				}
				else {
					return (
						debugGrunt(brk)
							.then(function() {
								if (options.inspector) {
									return startInspector(options.inspectorArgs, brk);
								}
							})
							.then(function() {
								if (brk) {
									debugger;
								}
							})
					);
				}
			})
			.done(
				function() {
					done();
				},
				function(error) {
					var status = error instanceof Error
						? error
						: false;
					
					done(status);
				}
			);
	});
};