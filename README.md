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

### Options ###

* __fork__ : Boolean

  If enabled, spawns a new Grunt process with debugging enabled via Node's `--debug` parameter. Otherwise, debugging will be enabled on the current process using the `SIGUSR1` signal. Defaults to `true`.

* __inspector__ : Boolean

  If enabled, launches an instance of [node-inspector](https://github.com/node-inspector/node-inspector) for interactive debugging. In order to use this option, your parent project must declare a version of `node-inspector` in its dependencies. Defaults to `false`.

* __inspectorArgs__ : Object

  A map of argument values to use when launching `node-inspector`. (Only applicable when `inspector` is set to `true`.) Defaults to `{}`.
