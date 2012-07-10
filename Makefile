all: build hint cover

build: lib/harmonizr.js demo/lib/harmonizr.js test/lib/harmonizr.js

# Node.js-style
lib/harmonizr.js: src/harmonizr.js bin/harmonizr
	node bin/harmonizr --module harmonizr --node src/harmonizr.js --output lib/harmonizr.js --relatives esprima

# AMD-style
demo/lib/harmonizr.js: src/harmonizr.js bin/harmonizr
	node bin/harmonizr --module harmonizr --amd src/harmonizr.js --output demo/lib/harmonizr.js

# Module Pattern-style
test/lib/harmonizr.js: src/harmonizr.js bin/harmonizr
	node bin/harmonizr --module harmonizr --revealing src/harmonizr.js --output test/lib/harmonizr.js

hint:
	# JSHint doesn't process files with no extension?
	cp bin/harmonizr bin/harmonizr.js
	node node_modules/jshint/bin/hint lib/harmonizr.js demo/*.js test/test.js bin/harmonizr.js
	rm bin/harmonizr.js

test:
	node node_modules/mocha/bin/mocha

cover:
	node node_modules/cover/bin/cover run node_modules/mocha/bin/_mocha
	node node_modules/cover/bin/cover report html
	node node_modules/cover/bin/cover report cli

.PHONY: hint test cover