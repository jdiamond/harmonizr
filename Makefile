all: build hint cover

build: lib/harmonizr.js demo/lib/harmonizr.js test/lib/harmonizr.js

# Node.js-style
lib/harmonizr.js: lib/modifier.js
lib/%.js: src/%.js bin/harmonizr
	node bin/harmonizr --module $* --node $< --output $@ --relatives esprima,modifier

# AMD-style
demo/lib/harmonizr.js: demo/lib/modifier.js
demo/lib/%.js: src/%.js bin/harmonizr
	node bin/harmonizr --module $* --amd $< --output $@

# Module Pattern-style
test/lib/harmonizr.js: test/lib/modifier.js
test/lib/%.js: src/%.js bin/harmonizr
	node bin/harmonizr --module $* --revealing $< --output $@

hint:
	# JSHint doesn't process files with no extension?
	cp bin/harmonizr bin/harmonizr.js
	node node_modules/jshint/bin/hint lib/harmonizr.js lib/modifier.js demo/*.js test/test.js bin/harmonizr.js
	rm bin/harmonizr.js

test:
	node node_modules/mocha/bin/mocha

cover:
	node node_modules/cover/bin/cover run node_modules/mocha/bin/_mocha
	node node_modules/cover/bin/cover report html
	node node_modules/cover/bin/cover report cli

.PHONY: hint test cover
