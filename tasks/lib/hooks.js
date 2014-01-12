var child_process = require('child_process');

module.exports = {
	enabled: false,
	useBreak: false,
	
	port: 5859,
	
	hookChild: function(module, name, internals) {
		var me = this;
		var original, replacement;
		
		original = module[name];
		replacement = function() {
			if (me.enabled) {
				return internals.call(this, original, arguments);
			}
			else {
				return original.apply(this, arguments);
			}
		};
		
		module[name] = replacement;
	},
	
	/**
	 * Monkey-patch `fork` function to enable debugging on child processes.
	 */
	hookChildren: function() {
		var me = this;
		
		this.hookChild(
			child_process,
			'fork',
			function(original, forkArgs) {
				var module = forkArgs[0];
				var args = forkArgs[1];
				var options = forkArgs[2];
				
				if (util.isArray(args)) {
					options = util._extend({}, options);
				}
				else {
					options = util._extend({}, args);
					args = [];
				}
				
				options.execArgv = options.execArgv || [];
				me.addDebugArg(options.execArgv, module);
				
				return original.call(this, module, args, options);
			}
		);
	},
	
	/**
	 * Monkey-patch grunt `spawn` function to enable debugging on child processes.
	 */
	hookGrunt: function(grunt) {
		var me = this;
		
		this.hookChild(
			grunt.util,
			'spawn',
			function(original, spawnArgs) {
				var options = spawnArgs[0];
				var callback = spawnArgs[1];
				
				if (options.cmd === process.argv[0]) {
					var module;
					
					for (var i = 0; i < options.args.length; i++) {
						if (options.args[i].lastIndexOf('--') != 0) {
							module = options.args[i];
							break;
						}
					}
					
					me.addDebugArg(options.args, module);
				}
				
				return original.call(this, options, callback);
			}
		);
	},
	
	addDebugArg: function(array, module) {
		if (this.callback) {
			this.callback(module, this.port);
		}
		
		var arg =
			'--debug'
			+ (this.useBreak ? '-brk' : '')
			+ '='
			+ (this.port++);
		
		// If a previous debug parameter is included, replace it
		for (var i = 0; i < array.length; i++) {
			if (array[i].lastIndexOf('--debug') == 0) {
				array[i] = arg;
				return;
			}
		}
		
		// Otherwise, include it at the beginning
		array.unshift(arg);
	},
	
	enableHooks: function(brk, callback) {
		this.enabled = true;
		this.useBreak = brk;
		this.callback = callback;
	}
};