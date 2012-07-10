# Harmonizr

A "transpiler" that brings tomorrow's Harmony to today's JavaScript.

## Features:

  - Harmony modules to AMD, Node.js, or Revealing Module Pattern
  - Shorthand properties
  - Method definitions
  - Arrow functions (requires `Function.prototype.bind`)
  - Maintains line numbers

## Demo

Look in the demo directory or try it
[here](http://jdiamond.github.com/harmonizr/demo/demo.html).

## Installation

    $ npm install harmonizr

## Usage

    $ ./node_modules/.bin/harmonizr [options] path/to/input

If you install Harmonizr globally or have ./node_modules/.bin in your
PATH, you can omit the path to the harmonizr script.

Specify `--amd`, `--node`, or `--revealing` to transform Harmony-style
modules into AMD, Node.js, or JavaScript Revealing Module Pattern-
style modules.

This transpiles src/foo.js into a Node.js-compatible version at
lib/foo.js:

    $ harmonizr --node --output lib/foo.js src/foo.js

Use `--module` to implicitly wrap the entire file in a module
declaration. The name of the module is required, but only appears in
the output when using `--revealing`.

Use `--relatives` with `--node` to indicate what modules should be
loaded from the local directory and not the node_modules directory.

For example, if a `foo` module needs to load `bar` and `baz` modules
from the same directory as it (not from node_modules), you could do
this:

    $ harmonizr --node --relatives bar,baz --output lib/foo.js src/foo.js

## Limitations

  - No nested modules.
  - No `import * from module;`.
  - `export` is only allowed when in front of a simple function or
    variable declaration.
  - Probably bugged.

## Code

Harmonizr uses the excellent [Esprima](http://esprima.org/) parser. A
copy of Esprima from its "harmony" branch is embedded into Harmonizr in
the lib directory.

The actual source code for Harmonizr is in the src directory. The
Makefile transpiles that into a Node.js-style module in lib, AMD-style
in demo, and Revealing Module Pattern-style in test.

Harmonizr transpiles itself. Since Node.js doesn't support the newer
syntax harmonizr.js uses in the src directory, it loads the
harmonizr module out of the lib directory. Be careful when building.

Tests are in the test directory. Run them with `npm test` or by opening
test.html.

If you'd like to contribute, please try to include tests, ensure the
code coverage stays at 100%, and that JSHint doesn't complain.

Execute `make` to build, run JSHint, and run the tests (with code
coverage).