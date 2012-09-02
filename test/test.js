var modifier = this.modifier || require('../lib/modifier');
var harmonizr = this.harmonizr || require('../lib/harmonizr');

describe('harmonizr', function() {

    describe('modules, imports, and exports', function() {

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
                           '\n' +
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
                           '\n' +
                           '    module.exports = {\n' +
                           '        e: e,\n' +
                           '        f: f\n' +
                           '    };\n';
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
                           '\n' +
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
                           '\n' +
                           '    return {\n' +
                           '        e: e,\n' +
                           '        f: f\n' +
                           '    };\n' +
                           '}();';
            harmonize(src, expected, { style: 'revealing' });
        });

        it('supports implicit AMD-style modules', function() {
            var src      = 'export function f() {\n' +
                           '    return 42;\n' +
                           '}';
            var expected = 'define(function() {function f() {\n' +
                           '    return 42;\n' +
                           '}\n' +
                           '\n' +
                           'return {\n' +
                           '    f: f\n' +
                           '};\n' +
                           '});';
            harmonize(src, expected, { style: 'amd', module: 'm' });
        });

        it('supports implicit Node.js-style modules', function() {
            var src      = 'export function f() {\n' +
                           '    return 42;\n' +
                           '}';
            var expected = 'function f() {\n' +
                           '    return 42;\n' +
                           '}\n' +
                           '\n' +
                           'module.exports = {\n' +
                           '    f: f\n' +
                           '};\n';
            harmonize(src, expected, { style: 'node', module: 'm' });
        });

        it('supports implicit Revealing Module-style modules', function() {
            var src      = 'export function f() {\n' +
                           '    return 42;\n' +
                           '}';
            var expected = 'var m = function() {function f() {\n' +
                           '    return 42;\n' +
                           '}\n' +
                           '\n' +
                           'return {\n' +
                           '    f: f\n' +
                           '};\n' +
                           '}();';
            harmonize(src, expected, { style: 'revealing', module: 'm' });
        });

        it('allows whole module imports using module x = y with amd', function() {
            var src      = 'module m1 {\n' +
                           '    module m2 = m3;\n' +
                           '}';
            var expected = 'define([\'m3\'], function(m3) {\n' +
                           '    var m2 = m3;\n' +
                           '});';
            harmonize(src, expected, { style: 'amd' });
        });

        it('allows whole module imports using module x = y with node', function() {
            var src      = 'module m1 {\n' +
                           '    module m2 = m3;\n' +
                           '}';
            var expected = '\n' +
                           '    var m2 = require(\'m3\');\n' +
                           '';
            harmonize(src, expected, { style: 'node' });
        });

        it('allows whole module imports using module x = y with revealing modules', function() {
            var src      = 'module m1 {\n' +
                           '    module m2 = m3;\n' +
                           '}';
            var expected = 'var m1 = function() {\n' +
                           '    var m2 = m3;\n' +
                           '}();';
            harmonize(src, expected, { style: 'revealing' });
        });

        it('allows specifying modules as strings', function() {
            var src      = 'module m1 {\n' +
                           '    module a = \'m2\';\n' +
                           '    import b from \'m3\';\n' +
                           '}';
            var expected = 'define([\'m2\', \'m3\'], function(m2, m3) {\n' +
                           '    var a = m2;\n' +
                           '    var b = m3.b;\n' +
                           '});';
            harmonize(src, expected, { style: 'amd' });
        });

    });

    describe('shorthand properties', function() {

        it('converts shorthand properties into longhand properties', function() {
            var src      = 'var o = {\n' +
                           '    a,\n' +
                           '    b: c,\n' +
                           '    d\n' +
                           '};';
            var expected = 'var o = {\n' +
                           '    a: a,\n' +
                           '    b: c,\n' +
                           '    d: d\n' +
                           '};';
            harmonize(src, expected);
        });

        it('works when the shorthand properties are on the same line', function() {
            var src      = 'var o = { a, b: c, d };';
            var expected = 'var o = { a: a, b: c, d: d };';
            harmonize(src, expected);
        });

    });

    describe('method definitions', function() {

        it('supports method definitions', function() {
            var src      = 'var o = {\n' +
                           '    m() {}\n' +
                           '};';
            var expected = 'var o = {\n' +
                           '    m: function() {}\n' +
                           '};';
            harmonize(src, expected);
        });

        it('supports concise methods', function() {
            var src      = 'var o = {\n' +
                           '    a() 42\n' +
                           '};';
            var expected = 'var o = {\n' +
                           '    a: function() { return 42; }\n' +
                           '};';
            harmonize(src, expected);
        });

        it('does not put return in front of concise assignments (or should it?)', function() {
            var src      = 'var o = {\n' +
                           '    a(b) c = b\n' +
                           '};';
            var expected = 'var o = {\n' +
                           '    a: function(b) { c = b; }\n' +
                           '};';
            harmonize(src, expected);
        });

    });

    describe('arrow functions', function() {

        it('supports arrow functions', function() {
          var src      = 'var f = a => 42;';
          var expected = 'var f = function(a) { return 42; };';
          harmonize(src, expected);
        });

        it('supports arrow functions with no params', function() {
          var src      = 'var f = () => 42;';
          var expected = 'var f = function() { return 42; };';
          harmonize(src, expected);
        });

        it('supports arrow functions with multiple params', function() {
          var src      = 'var f = (a, b) => 42;';
          var expected = 'var f = function(a, b) { return 42; };';
          harmonize(src, expected);
        });

        it('supports arrow functions with one wrapped param', function() {
          var src      = 'var f = (a) => 42;';
          var expected = 'var f = function(a) { return 42; };';
          harmonize(src, expected);
        });

        it('allows curlies around the function body', function() {
          var src      = 'var f = a => { return 42; };';
          var expected = 'var f = function(a) { return 42; };';
          harmonize(src, expected);
        });

        it('works across lines', function() {
          var src      = 'var f = (\na\n)\n=>\n42;';
          var expected = 'var f = function(\na\n\n\n) { return 42; };';
          harmonize(src, expected);
        });

        it('binds to the lexical this if it needs to', function() {
          var src      = 'var f = a => this.b;';
          var expected = 'var f = function(a) { return this.b; }.bind(this);';
          harmonize(src, expected);
        });

        it('allows nested arrow functions', function() {
          var src      = 'var f = a => b => 42;';
          var expected = 'var f = function(a) { return function(b) { return 42; }; };';
          harmonize(src, expected);
        });

    });

    describe('destructuring assignments', function() {

        it('works with arrays', function() {
            var src      = '[a, b] = [c, d];';
            var expected = 'a = [c, d], b = a[1], a = a[0];';
            harmonize(src, expected);
        });

    });

    describe('classes', function() {

        it('supports empty class definitions', function() {
            var src      = 'class A {}';
            var expected = 'var A = (function () {function A() {};; return A;})();';
            harmonize(src, expected);
        });

        it('supports class expressions', function() {
            var src      = 'var B = class A {};';
            var expected = 'var B = (function () {function A() {};; return A;})();';
            harmonize(src, expected);
        });

        it('supports opening { on newline', function() {
            var src      = 'class A \n\n  {}';
            var expected = 'var A = (function () \n\n  {function A() {};; return A;})();';
            harmonize(src, expected);
        });

        it('supports constructors', function() {
            var src      = 'class A {\n'+
                           '  constructor(a) { this.a = a; }\n'+
                           '}';
            var expected = 'var A = (function () {\n  function A(a) { this.a = a; }\n; return A;})();';
            harmonize(src, expected);
        });

        it('supports extending from other classes', function() {
            var src      = 'class A extends B {\n' +
                           '  constructor(a) { this.a = a; }\n'+
                           '}';
            var expected = 'var A = (function () {var A__super = B;' +
                           'var A__prototype = (typeof A__super !== "function" ? A__super : A__super.prototype);' +
                           'A.prototype = Object.create(A__prototype); \n' +
                           '  function A(a) { this.a = a; }\n; return A;})();';
            harmonize(src, expected);
        });

        it('supports calls to super()', function() {
            var src      = 'class A extends B {\n' +
                           '  constructor(a) { super(); super(a); }\n'+
                           '}';
            var expected = 'var A = (function () {var A__super = B;' +
                           'var A__prototype = (typeof A__super !== "function" ? A__super : A__super.prototype);' +
                           'A.prototype = Object.create(A__prototype); \n' +
                           '  function A(a) { A__super.call(this); A__super.call(this, a); }\n; return A;})();';
            harmonize(src, expected);
        });

        it('supports extending from an expression', function() {
            var src      = 'class A extends (\n' +
                           '  B && C\n' +
                           ')\n\n {\n' +
                           '  constructor(a) { this.a = a; }\n' +
                           '}';
            var expected = 'var A = (function () {var A__super = (\n  B && C\n);' +
                           'var A__prototype = (typeof A__super !== "function" ? A__super : A__super.prototype);' +
                           'A.prototype = Object.create(A__prototype);\n\n \n' +
                           '  function A(a) { this.a = a; }\n; return A;})();';
            harmonize(src, expected);
        });

        it('supports member functions', function() {
            var src      = 'class A {a(a) {}; b() {}}';
            var expected = 'var A = (function () {function A() {};A.prototype.a = function(a) {}; A.prototype.b = function() {}; return A;})();';
            harmonize(src, expected);
        });

        it('supports constructors and member functions', function() {
            var src      = 'class A {constructor(a) { this.a = a; }; a(a) {}}';
            var expected = 'var A = (function () {function A(a) { this.a = a; }; A.prototype.a = function(a) {}; return A;})();';
            harmonize(src, expected);
        });

        // TODO: nested classes

    });

});

describe('modifier', function () {
    var Modifier = modifier.Modifier;

    it('should provide the finished source on `finish`', function () {
        var expected = 'var a = 10;';
        var m = new Modifier(expected);
        var actual = m.finish();
        actual.should.equal(expected);
    });

    it('should parse the source into an ast', function () {
        var expected = 'var a = 10;';
        var m = new Modifier(expected);
        m.ast.type.should.equal('Program');
    });

    it('should provide `lines` for manual access', function () {
        var expected = 'var a = 10;';
        var m = new Modifier(expected);
        m.lines[0].should.equal(expected);
    });

    it('should support `remove` using two loc objects', function () {
        var src      = 'var a = 10;';
        var expected = 'var a = ;';
        var m = new Modifier(src);
        var literal = m.ast.body[0].declarations[0].init;
        m.remove(literal.loc.start, literal.loc.end);
        var actual = m.finish();
        actual.should.equal(expected);
    });

    it('should support `remove` spanning multiple lines', function () {
        var src      = 'var a = function (a) {\n  return a;\n};';
        var expected = 'var a = \n\n;';
        var m = new Modifier(src);
        var fn = m.ast.body[0].declarations[0].init;
        m.remove(fn.loc.start, fn.loc.end);
        var actual = m.finish();
        actual.should.equal(expected);
    });

    it('should support `remove` using one loc object and an offset', function () {
        var src      = 'var a = 10;';
        var expected = 'var a = ;';
        var m = new Modifier(src);
        var literal = m.ast.body[0].declarations[0].init;
        m.remove(literal.loc.start, 2);
        var actual = m.finish();
        actual.should.equal(expected);
    });

    it('should support `insert`', function () {
        var src      = 'var a = 4;';
        var expected = 'var a = 42;';
        var m = new Modifier(src);
        var literal = m.ast.body[0].declarations[0].init;
        m.insert(literal.loc.end, '2');
        var actual = m.finish();
        actual.should.equal(expected);
    });

    it('should support `replace`', function () {
        var src      = 'var a = 10;';
        var expected = 'var a = 42;';
        var m = new Modifier(src);
        var literal = m.ast.body[0].declarations[0].init;
        m.replace(literal.loc.start, literal.loc.end, '42');
        var actual = m.finish();
        actual.should.equal(expected);
    });

    it('should support `replace` with an offset', function () {
        var src      = 'var a = 10;';
        var expected = 'var a = 42;';
        var m = new Modifier(src);
        var literal = m.ast.body[0].declarations[0].init;
        m.replace(literal.loc.start, 2, '42');
        var actual = m.finish();
        actual.should.equal(expected);
    });

    it('should support `refresh`', function () {
        var src      = 'var a = 10;';
        var m = new Modifier(src);
        var literal = m.ast.body[0].declarations[0].init;
        m.replace(literal.loc.start, literal.loc.end, '42');
        m.refresh();
        m.ast.body[0].declarations[0].init.value.should.equal(42);
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
/* vim: set sw=4 ts=4 et tw=80 : */
