var harmonizr = this.harmonizr || require('../lib/harmonizr');

describe('harmonizr', function() {

    it('turns module declarations into AMD modules', function() {
        var src      = 'module m {}';
        var expected = 'define(function() {});';
        harmonize(src, expected, { style: 'amd' });
    });

    it('works when the module is not empty', function() {
        var src      = 'module m { function a() {} }';
        var expected = 'define(function() { function a() {} });';
        harmonize(src, expected, { style: 'amd' });
    });

    it('works when the module is split across multiple lines', function() {
        var src      = 'module m {\n' +
                       '    function a() {}\n' +
                       '}';
        var expected = 'define(function() {\n' +
                       '    function a() {}\n' +
                       '});';
        harmonize(src, expected, { style: 'amd' });
    });

    it('does not work with nested modules', function() {
        var src      = 'module m {\n' +
                       '    module a {}\n' +
                       '}';
        var expected = 'define(function() {\n' +
                       '    module a {}\n' +
                       '});';
        harmonize(src, expected, { style: 'amd' });
    });

    it('converts import declarations into AMD dependencies', function() {
        var src      = 'module m1 {\n' +
                       '    import a from m2;\n' +
                       '}';
        var expected = 'define([\'m2\'], function(m2) {\n' +
                       '    var a = m2.a;\n' +
                       '});';
        harmonize(src, expected, { style: 'amd' });
    });

    it('supports destructuring imports', function() {
        var src      = 'module m1 {\n' +
                       '    import { a, b } from m2;\n' +
                       '}';
        var expected = 'define([\'m2\'], function(m2) {\n' +
                       '    var a = m2.a, b = m2.b;\n' +
                       '});';
        harmonize(src, expected, { style: 'amd' });
    });

    it('supports renaming multiple imports', function() {
        var src      = 'module m1 {\n' +
                       '    import { a, b: c.d } from m2;\n' +
                       '}';
        var expected = 'define([\'m2\'], function(m2) {\n' +
                       '    var a = m2.a, b = m2.c.d;\n' +
                       '});';
        harmonize(src, expected, { style: 'amd' });
    });

    it('skips import * declarations', function() {
        var src      = 'module m1 {\n' +
                       '    import * from m2;\n' +
                       '}';
        var expected = 'define(function() {\n' +
                       '    import * from m2;\n' +
                       '});';
        harmonize(src, expected, { style: 'amd' });
    });

    it('returns an object containing all the exports', function() {
        var src      = 'module m {\n' +
                       '    export var a;\n' +
                       '    export function b() {}\n' +
                       '}';
        var expected = 'define(function() {\n' +
                       '    var a;\n' +
                       '    function b() {}\n' +
                       '    return {\n' +
                       '        a: a,\n' +
                       '        b: b\n' +
                       '    };\n' +
                       '});';
        harmonize(src, expected, { style: 'amd' });
    });

    it('can transpile to Node.js', function() {
        var src      = 'module m1 {\n' +
                       '    import { a, b: c.d } from m2;\n' +
                       '    export var e;\n' +
                       '    export function f() {}\n' +
                       '}';
        var expected = '\n' +
                       '    var m2 = require(\'m2\'), a = m2.a, b = m2.c.d;\n' +
                       '    var e;\n' +
                       '    function f() {}\n' +
                       '    module.exports = {\n' +
                       '        e: e,\n' +
                       '        f: f\n' +
                       '    };\n' +
                       '';
        harmonize(src, expected, { style: 'node' });
    });

    it('allows you to specify which modules are relative', function() {
        var src      = 'module m1 {\n' +
                       '    import a from m2;\n' +
                       '}';
        var expected = '\n' +
                       '    var m2 = require(\'./m2\'), a = m2.a;\n' +
                       '';
        harmonize(src, expected, { style: 'node', relatives: ['m2'] });
    });

    it('can transpile to the revealing module pattern', function() {
        var src      = 'module m1 {\n' +
                       '    import a from m2;\n' +
                       '    import { b, c: d } from m3;\n' +
                       '    export var e;\n' +
                       '    export function f() {}\n' +
                       '}';
        var expected = 'var m1 = function() {\n' +
                       '    var a = m2.a;\n' +
                       '    var b = m3.b, c = m3.d;\n' +
                       '    var e;\n' +
                       '    function f() {}\n' +
                       '    return {\n' +
                       '        e: e,\n' +
                       '        f: f\n' +
                       '    };\n' +
                       '}();';
        harmonize(src, expected, { style: 'revealing' });
    });

    it('can detect indentation when the first line in a module is blank', function() {
        var src      = 'module m1 {\n' +
                       '\n' +
                       '    import a from m2;\n' +
                       '    import { b, c: d } from m3;\n' +
                       '    export var e;\n' +
                       '    export function f() {}\n' +
                       '}';
        var expected = 'var m1 = function() {\n' +
                       '\n' +
                       '    var a = m2.a;\n' +
                       '    var b = m3.b, c = m3.d;\n' +
                       '    var e;\n' +
                       '    function f() {}\n' +
                       '    return {\n' +
                       '        e: e,\n' +
                       '        f: f\n' +
                       '    };\n' +
                       '}();';
        harmonize(src, expected, { style: 'revealing' });
    });

    it('can assume all the code is wrapped in a module declaration', function() {
        var src      = 'import a from m2;\n' +
                       'import { b, c: d } from m3;\n' +
                       'export var e;\n' +
                       'export function f() {}';
        var expected = 'var m1 = function() {\n' +
                       'var a = m2.a;\n' +
                       'var b = m3.b, c = m3.d;\n' +
                       'var e;\n' +
                       'function f() {}\n' +
                       'return {\n' +
                       'e: e,\n' +
                       'f: f\n' +
                       '};\n' +
                       '}();';
        harmonize(src, expected, { style: 'revealing', module: 'm1' });
    });

});

function harmonize(src, expected, options) {
    var actual;
    try {
        actual = harmonizr.harmonize(src, options);
    } catch (e) {
        actual = e;
    }
    if (typeof expected === 'string') {
        if (actual instanceof Error) {
            throw actual;
        }
        actual.should.equal(expected);
    } else {
        actual.should.be.an.instanceOf(Error);
        actual.message.should.equal(expected.message);
    }
}