var child_process = require('child_process');
var path = require('path');
var Q = require('q');
var util = require('util');

var Inspector = require('./lib/inspector.js').Inspector;

module.exports = function(grunt) {
	/**
	 * Manually forks the Grunt process for debugging
	 */
	var forkGrunt = function(name, brk, debugChildren) {
		var deferred = Q.defer();
		var args = process.argv;
		
		grunt.task.clearQueue();
		
		var tasks = args.slice(args.indexOf(name) + 1);
		
		if (debugChildren) {
			tasks.unshift('debug:hook' + (brk ? '-break' : ''));
		}
		
		var child = child_process.fork(
			args[1],
			tasks,
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
	var debugGrunt = function() {
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
	 * Monkey-patch `fork` function to enable debugging on child processes.
	 */
	var hookChildren = function(brk) {
		var port = 5859;
		var original = child_process.fork;
		
		var replacement = function(module, preargs, preoptions) {
			var args, options;
			
			if (util.isArray(preargs)) {
				args = preargs;
				options = util._extend({}, preoptions);
			}
			else {
				args = [];
				options = util._extend({}, preargs);
			}
			
			grunt.log.ok('Debugging forked process %s on port %d', module, port)
			
			options.execArgv = options.execArgv || [];
			options.execArgv.unshift(
				(brk
					? '--debug-brk'
					: '--debug')
				+ '='
				+ (port++)
			);
			
			return original.call(this, module, args, options);
		};
		
		child_process.fork = replacement;
	};
	
	grunt.registerTask('debug', function(type) {
		if (type === 'hook') {
			hookChildren(false);
			return;
		}
		else if (type === 'hook-break') {
			hookChildren(true);
			return;
		}
		
		var done = this.async();
		
		var options = this.options({
			fork: false,
			debugChildren: true,
			inspector: false,
			inspectorArgs: {}
		});
		
		var nameArgs = this.nameArgs;
		var brk = (type === 'break');
		
		var inspector;
		
		if (options.inspector) {
			inspector = new Inspector();
			
			inspector.on(
				'launching',
				function(version) {
					grunt.log.ok('Starting Node Inspector v%s', version);
				}
			);
			
			inspector.on(
				'listening',
				function(address) {
					grunt.log.ok('Visit %s to start debugging.', address);
				}
			);
			
			inspector.on(
				'error',
				function(error) {
					grunt.log.error(error);
				}
			);
		}
		else {
			inspector = {
				launch: function() {},
				connect: function() {}
			};
		}
		
		Q()
			.then(function() {
				if (options.fork) {
					return Q.all([
						forkGrunt(nameArgs, brk, options.debugChildren),
						inspector.launch(options.inspectorArgs)
					]);
				}
				else {
					promise = debugGrunt()
						.thenResolve(
							inspector.launch(options.inspectorArgs)
						);
					
					if (options.debugChildren) {
						promise = promise.then(function() {
							hookChildren(brk);
						});
					}
					
					if (brk) {
						promise = promise
							.thenResolve(inspector.connect())
							.then(function() {
								debugger;
							});
					}
					
					return promise;
				}
			})
			.done(
				done,
				function(error) {
					var status = false;
					
					if (error instanceof Error) {
						status = error;
						grunt.log.error(error);
					}
					
					done(status);
				}
			);
	});
};