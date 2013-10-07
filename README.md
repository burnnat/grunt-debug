grunt-debug
===========

A grunt task to enable debugging for any subsequent tasks.

Usage
-----

Ensure you have the debug plugin enabled in your Gruntfile via:

```js
grunt.loadNpmTasks('grunt-debug');
```

Then you can debug a series of grunt tasks (say tasks named `first` and `second`) by running:

```shell
grunt debug first second
```

Or, to immediately pause the script after launching:

```shell
grunt debug:break first second
```