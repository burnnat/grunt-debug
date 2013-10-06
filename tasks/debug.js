var child_process = require('child_process');

module.exports = function(grunt) {
	grunt.registerTask('debug', function(type) {
		grunt.task.clearQueue();
		
		var args = process.argv;
		var done = this.async();
		
		var child = child_process.fork(
			args[1],
			args.slice(
				args.indexOf(this.nameArgs) + 1
			),
			{
				execArgv: [
					type === 'break'
						? '--debug-brk'
						: '--debug'
				]
			}
		);
		
		child.on('exit', function(code) {
			done(code == 0);
		});
	});
};