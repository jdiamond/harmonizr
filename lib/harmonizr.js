var esprima = require('./esprima'), parse = esprima.parse, Syntax = esprima.Syntax;
var modifier = require('./modifier'), Modifier = modifier.Modifier;

var Modifier = Modifier;

function harmonize(src, options) {
    options = options || {};
    var modifier = new Modifier(src);
    var stages = [
        {name: 'shorthand properties', fn: processShorthands},
        {name: 'shorthand methods', fn: processMethods},
        {name: 'arrow functions', fn: processArrowFunctions},
        {name: 'classes', fn: processClasses},
        {name: 'destructuring assignment', fn: processDestructuringAssignments},
        {name: 'modules', fn: processModules}
    ];
    // just a bogus fail stage to get 100% test coverage
    if (options.fail) {
        stages.unshift({name: 'fail', fn: function(modifier) {
            modifier.insert({line: 1, column: 0}, '}');
        }});
    }
    var before;
    for (var i = 0; i < stages.length; i++) {
        if (i) {
            try {
                modifier.refresh();
            } catch (e) {
                var err = new Error('Stage `' + stages[i - 1].name + '` created unparsable code: ' + e.message);
                // populate `actual` and `expected` so mocha shows us a diff
                err.actual = before;
                err.expected = modifier.finish();
                throw err;
            }
        }
        var stage = stages[i];
        before = modifier.finish();
        stage.fn(modifier, options, moduleStyles[options.style]);
    }
    return modifier.finish();
}

function processShorthands(modifier, options) {
    var ast = modifier.ast;
    var lines = modifier.lines;

    var shorthands = [];

    traverse(ast, function(node) {
        if (node.type === Syntax.Property && node.shorthand) {
            shorthands.push(node);
        }
    });

    for (var i = shorthands.length - 1; i >= 0; i--) {
        var prop = shorthands[i];
        var line = prop.value.loc.end.line - 1;
        var col = prop.value.loc.end.column;

        lines[line] = splice(
            lines[line],
            col,
            0, // Delete nothing.
            ': ' + prop.value.name);
    }
}

function processMethods(modifier, options) {
    var ast = modifier.ast;
    var lines = modifier.lines;

    var methods = [];

    traverse(ast, function(node) {
        if (node.type === Syntax.Property && node.method) {
            methods.push(node);
        }
    });

    for (var i = methods.length - 1; i >= 0; i--) {
        var prop = methods[i];
        var line = prop.key.loc.end.line - 1;
        var col = prop.key.loc.end.column;

        if (prop.value.body.type !== Syntax.BlockStatement) {
            // It's a concise method definition.

            // Add the end of the function body first.
            var bodyEndLine = prop.value.loc.end.line - 1;
            var bodyEndCol = prop.value.loc.end.column;
            lines[bodyEndLine] = splice(
                lines[bodyEndLine],
                bodyEndCol,
                0,
                '; }');

            // Now add the beginning.
            var prefix = '{ ';
            if (prop.value.body.type !== Syntax.AssignmentExpression) {
                prefix += 'return ';
            }
            var bodyStartLine = prop.value.loc.start.line - 1;
            var bodyStartCol = prop.value.loc.start.column;
            lines[bodyStartLine] = splice(
                lines[bodyStartLine],
                bodyStartCol,
                0,
                prefix);
        }

        lines[line] = splice(
            lines[line],
            col,
            0, // Delete nothing.
            ': function');
    }
}

function processArrowFunctions(modifier, options) {
    var ast = modifier.ast;
    var lines = modifier.lines;

    var arrowFunctions = [];

    traverse(ast, function(node) {
        if (node.type === Syntax.ArrowFunctionExpression) {
            arrowFunctions.push(node);
        }
    });

    arrowFunctions.reverse();

    arrowFunctions.forEach(function(node) {
        var bodyEndLine = node.body.loc.end.line - 1;
        var bodyEndCol = node.body.loc.end.column;

        var needsBind = containsThisExpression(node);

        if (needsBind) {
            // Bind it to the lexical this.
            lines[bodyEndLine] = splice(
                lines[bodyEndLine],
                bodyEndCol,
                0, // Delete nothing.
                '.bind(this)');
        }

        var needsCurly = lines[bodyEndLine].charAt(bodyEndCol - 1) !== '}';

        if (needsCurly) {
            // Insert the closing of the function.
            lines[bodyEndLine] = splice(
                lines[bodyEndLine],
                bodyEndCol,
                0, // Delete nothing.
                '; }');
        }
    });

    arrowFunctions.forEach(function(node) {
        var startLine = node.loc.start.line - 1;
        var startCol = node.loc.start.column;

        var lastParam, paramsEndLine, paramsEndCol;

        if (node.params.length) {
            lastParam = node.params[node.params.length - 1];
            paramsEndLine = lastParam.loc.end.line - 1;
            paramsEndCol = lastParam.loc.end.column;
        }

        var bodyStartLine = node.body.loc.start.line - 1;
        var bodyStartCol = node.body.loc.start.column;

        var needsCurly = lines[bodyStartLine].charAt(bodyStartCol) !== '{';

        if (needsCurly) {
            // Close the params and start the body.
            lines[bodyStartLine] = splice(
                lines[bodyStartLine],
                bodyStartCol,
                0, // Delete nothing.
                '{ return ');
        }

        // Close the params and start the body.
        lines[bodyStartLine] = splice(
            lines[bodyStartLine],
            bodyStartCol,
            0, // Delete nothing.
            ') ');

        if (node.params.length) {
            // Delete the => in between the params and the body.
            lines[paramsEndLine] = splice(
                lines[paramsEndLine],
                paramsEndCol,
                bodyStartCol - paramsEndCol,
                '');

            // In case the => is not on the same line as the params or body.
            var n = paramsEndLine;
            while (n++ < bodyStartLine) {
                if (n < bodyStartLine) {
                    lines[n] = '';
                } else {
                    lines[n] = splice(
                        lines[n],
                        0,
                        bodyStartCol,
                        '');
                }
            }

            // Delete the last ).
            var endsWithParen = lines[paramsEndLine].charAt(paramsEndCol - 1) === ')';
            if (endsWithParen) {
                lines[paramsEndLine] = splice(
                    lines[paramsEndLine],
                    paramsEndCol - 1,
                    1,
                    '');
            }
        } else {
            // There are no params, so delete everything up to the body.
            lines[startLine] = splice(
                lines[startLine],
                startCol + 1,
                bodyStartCol - startCol - 1,
                '');
        }

        // Delete the first (.
        if (lines[startLine].charAt(startCol) === '(') {
            lines[startLine] = splice(
                lines[startLine],
                startCol,
                1,
                '');
        }

        // Insert the opening of the function.
        lines[startLine] = splice(
            lines[startLine],
            startCol,
            0, // Delete nothing.
            'function(');
    });

    function containsThisExpression(node) {
        var result = false;
        traverse(node, function(innerNode) {
            if (innerNode.type === Syntax.ThisExpression) {
                result = true;
            } else if (innerNode !== node && innerNode.type === Syntax.ArrowFunctionExpression) {
                return false;
            }
        });
        return result;
    }
}

function processClasses(modifier, options) {
    var ast = modifier.ast;
    var lines = modifier.lines;

    var classes = [];
    traverse(ast, function(node) {
        if (node.type === Syntax.ClassDeclaration || node.type === Syntax.ClassExpression) {
            classes.push(node);
        }
    });

    classes.forEach(function(node) {
        var name = node.id.name;
        var methods = [];
        traverse(node, function(innerNode) {
            if (innerNode.type === Syntax.MethodDefinition) {
                methods.push(innerNode);
            }/* FIXME: can classes be nested? else if (innerNode !== node && innerNode.type === Syntax.ClassDeclaration) {
                return false;
            }*/
        });
        methods.reverse();

        var startLine = node.loc.start.line - 1;
        var startCol = node.loc.start.column;
        var bodyStartLine = node.body.loc.start.line - 1;
        var bodyStartCol = node.body.loc.start.column;
        var endLine = node.loc.end.line - 1;
        var endCol = node.loc.end.column;

        // Replace the trailing } with a return for the IIFE pattern
        lines[endLine] = splice(
            lines[endLine],
            endCol - 1,
            1,
            '; return ' + name + ';})()' + (node.type === Syntax.ClassDeclaration ? ';' : ''));

        methods.forEach(function(method) {
            var line = method.key.loc.start.line - 1;
            var col = method.key.loc.start.column;
            if (method.key.name === 'constructor') {
                // replace calls to `super(...)` with `X__super.call(this, ...)`
                var superCalls = [];
                traverse(method, function(innerNode) {
                    if (innerNode.type === Syntax.CallExpression &&
                        innerNode.callee.type === Syntax.Identifier &&
                        innerNode.callee.name === 'super') {
                        superCalls.push(innerNode);
                    }/* FIXME: can classes be nested? else if (innerNode !== node && innerNode.type === Syntax.ClassDeclaration) {
                        return false;
                    }*/
                });
                superCalls.reverse();
                superCalls.forEach(function(call) {
                    var callStartLine = call.loc.start.line - 1;
                    var callStartCol = call.loc.start.column;
                    // FIXME: this only supports `super(` for now, no `super (`
                    // or other combinations of whitespace between `super` and `(`
                    lines[callStartLine] = splice(
                        lines[callStartLine],
                        callStartCol,
                        'super('.length,
                        name + '__super.call(this' + (call['arguments'/* thanks jshint*/].length ? ', ' : ''));
                });

                lines[line] = splice(
                    lines[line],
                    col,
                    method.key.name.length,
                    'function ' + name);
            } else {
                // TODO: rewrite calls to `super.method(...)` to `X__proto.method.call(this, ...)`
                lines[line] = splice(
                    lines[line],
                    col,
                    method.key.name.length,
                    name + '.prototype.' + method.key.name + ' = function');
            }
            // TODO: get and set methods
        });

        // In case we have no constructor, insert an empty function
        var hasConstructor = methods.some(function(method) {
            return method.key.name === 'constructor';
        });
        if (!hasConstructor) {
            lines[bodyStartLine] = splice(
                lines[bodyStartLine],
                bodyStartCol + 1,
                0,
                'function ' + name + '() {};');
        }

        if (node.superClass) {
            // remove opening {
            lines[bodyStartLine] = splice(
                lines[bodyStartLine],
                bodyStartCol,
                1,
                '');

            var superStartLine = node.superClass.loc.start.line - 1;
            var superStartCol = node.superClass.loc.start.column;
            var superEndLine = node.superClass.loc.end.line - 1;
            var superEndCol = node.superClass.loc.end.column;
            // Capture super expression in a variable
            // and use an Object.create to create the prototype of the new class
            lines[superEndLine] = splice(
                lines[superEndLine],
                superEndCol,
                0,
                'var ' + name + '__prototype = (typeof ' + name + '__super !== "function" ? ' +
                name + '__super : ' + name + '__super.prototype);' +
                name + '.prototype = Object.create(' + name + '__prototype);');
            lines[superEndLine] = splice(
                lines[superEndLine],
                superEndCol,
                0,
                ';');
            lines[superStartLine] = splice(
                lines[superStartLine],
                superStartCol,
                0,
                'var ' + name + '__super = ');

            // Replace start until the super class with IIFE pattern
            lines[startLine] = splice(
                lines[startLine],
                startCol,
                superStartCol - startCol,
                'var ' + name + ' = (function () {');
        } else {
            // Replace start of the ClassDeclaration with IIFE pattern
            lines[startLine] = splice(
                lines[startLine],
                startCol,
                bodyStartLine === startLine ?
                    bodyStartCol - startCol :
                    lines[startLine].length - startCol,
                (node.type === Syntax.ClassDeclaration ? 'var ' + name + ' = ' : '') + '(function () ');
        }
    });
}

function processDestructuringAssignments(modifier, options) {
    var ast = modifier.ast;
    var lines = modifier.lines;

    var nodes = [];

    traverse(ast, function(node) {
        if (node.type === Syntax.AssignmentExpression && node.left.type === Syntax.ArrayPattern) {
            nodes.push(node);
        }
    });

    nodes.reverse();

    nodes.forEach(function(node) {
        var firstId = node.left.elements[0].name;

        var endLine = node.loc.end.line - 1;
        var endCol = node.loc.end.column;
        lines[endLine] = splice(
            lines[endLine],
            endCol,
            0, // Delete nothing.
            ', ' + getAssignments());

        var patternStartLine = node.left.loc.start.line - 1;
        var patternStartCol = node.left.loc.start.column;
        var patternEndCol = node.left.loc.end.column;
        lines[patternStartLine] = splice(
            lines[patternStartLine],
            patternStartCol,
            patternEndCol - patternStartCol,
            firstId);

        function getAssignments() {
            var all = [];
            for (var i = 1; i < node.left.elements.length; i++) {
                var id = node.left.elements[i].name;
                all.push(getAssignment(id, i));
            }
            all.push(getAssignment(firstId, 0));
            return all.join(', ');
        }

        function getAssignment(id, index) {
            return id + ' = ' + firstId + '[' + index + ']';
        }
    });
}

function processModules(modifier, options, style) {
    if (!style) {
        return;
    }

    if (options.module) {
        modifier.insert(modifier.ast.loc.start, 'module ' + options.module + '{');
        modifier.lines.push('}');
        modifier.refresh();
    }

    var ast = modifier.ast;
    var lines = modifier.lines;

    var modules = [];

    traverse(ast, function(node) {
        if (node.type === Syntax.ModuleDeclaration) {
            modules.push(node);
            return false;
        }
    });

    modules.forEach(function(mod) {

        options.indent = detectIndent(mod, lines);

        var imps = [];

        traverse(mod, function(node) {
            if (node.type === Syntax.ModuleDeclaration) {
                if (node.id && node.from) {
                    imps.push(node);
                } else if (node !== mod) {
                    return false;
                }
            } else if (node.type === Syntax.ImportDeclaration &&
                       node.specifiers[0].type !== Syntax.Glob) {
                imps.push(node);
            }
        });

        var moduleStartLine = mod.loc.start.line - 1;
        var moduleStartColumn = mod.loc.start.column;
        var moduleEndLine = mod.loc.end.line - 1;
        var moduleEndColumn = mod.loc.end.column;
        var bodyStartColumn = mod.body.loc.start.column;
        var bodyEndColumn = mod.body.loc.end.column;

        // Modify the end first in case it's on the same line as the start.
        lines[moduleEndLine] = splice(
            lines[moduleEndLine],
            bodyEndColumn - 1,
            1, // Delete the closing brace.
            style.endModule(mod, options));

        imps.forEach(function(imp) {
            var importStartLine = imp.loc.start.line - 1;
            var importStartColumn = imp.loc.start.column;
            var importEndColumn = imp.loc.end.column;
            lines[importStartLine] = splice(
                lines[importStartLine],
                importStartColumn,
                importEndColumn - importStartColumn,
                imp.type === Syntax.ModuleDeclaration ?
                    style.importModuleDeclaration(mod, imp, options) :
                    style.importDeclaration(mod, imp, options));
        });

        var exps = [];

        traverse(mod, function(node) {
            if (node.type === Syntax.ModuleDeclaration && node !== mod) {
                return false;
            } else if (node.type === Syntax.ExportDeclaration) {
                exps.push(node);
            }
        });

        exps.forEach(function(exp) {
            var exportStartLine = exp.loc.start.line - 1;
            var exportStartColumn = exp.loc.start.column;
            var declarationStartColumn = exp.declaration.loc.start.column;
            lines[exportStartLine] = splice(
                lines[exportStartLine],
                exportStartColumn,
                declarationStartColumn - exportStartColumn, // Delete the export keyword.
                ''); // Nothing to insert.
        });

        if (exps.length) {
            lines[moduleEndLine] = splice(
                lines[moduleEndLine],
                moduleEndColumn - 1,
                0,
                style.exports(mod, exps, options));
        }

        lines[moduleStartLine] = splice(
            lines[moduleStartLine],
            moduleStartColumn,
            bodyStartColumn - moduleStartColumn + 1, // Delete from start of module to opening brace.
            style.startModule(mod, imps, options));
    });
}

var moduleStyles = {
    amd: {
        startModule: function(mod, imps, options) {
            var header = 'define(';
            if (imps.length) {
                header += '[\'' + imps.map(function(imp) { return modulePath(importFrom(imp), options); }).join('\', \'') + '\'], ';
            }
            header += 'function(';
            if (imps.length) {
                header += imps.map(function(imp) { return importFrom(imp); }).join(', ');
            }
            header += ') {';
            return header;
        },
        importModuleDeclaration: function(mod, imp, options) {
            return 'var ' + imp.id.name + ' = ' + importFrom(imp) + ';';
        },
        importDeclaration: function(mod, imp, options) {
            return 'var ' + imp.specifiers.map(function(spec) {
                var id = spec.type === Syntax.Identifier ? spec.name : spec.id.name;
                var from = spec.from ? joinPath(spec.from) : id;
                return id + ' = ' + importFrom(imp) + '.' + from;
            }).join(', ') + ';';
        },
        exports: function(mod, exps, options) {
            var indent1 = options.module ? '' : options.indent;
            var indent2 = options.indent;
            var ret = '\n' + indent1;
            ret += 'return {';
            if (exps.length) {
                ret += '\n';
                ret += exps.map(function(exp) {
                    var id = exportName(exp);
                    return indent1 + indent2 + id + ': ' + id;
                }).join(',\n');
                ret += '\n';
                ret += indent1;
            }
            ret += '};\n';
            return ret;
        },
        endModule: function(mod, options) {
            return '});';
        }
    },

    node: {
        startModule: function(mod, imps, options) {
            return '';
        },
        importModuleDeclaration: function(mod, imp, options) {
            return 'var ' + imp.id.name + ' = require(\'' + importFrom(imp) + '\');';
        },
        importDeclaration: function(mod, imp, options) {
            return 'var ' + importFrom(imp) +
                   ' = require(\'' + modulePath(importFrom(imp), options) + '\'), ' +
                   imp.specifiers.map(function(spec) {
                       var id = spec.type === Syntax.Identifier ? spec.name : spec.id.name;
                       var from = spec.from ? joinPath(spec.from) : id;
                       return id + ' = ' + importFrom(imp) + '.' + from;
                   }).join(', ') + ';';
        },
        exports: function(mod, exps, options) {
            var indent1 = options.module ? '' : options.indent;
            var indent2 = options.indent;
            var returns = '\n' + indent1 + 'module.exports = {';
            returns += '\n' + exps.map(function(exp) {
                var id = exportName(exp);
                return indent1 + indent2 + id + ': ' + id;
            }).join(',\n');
            returns += '\n' + indent1;
            returns += '};\n';
            return returns;
        },
        endModule: function(mod, options) {
            return '';
        }
    },

    revealing: {
        startModule: function(mod, imps, options) {
            return 'var ' + mod.id.name + ' = function() {';
        },
        importModuleDeclaration: function(mod, imp, options) {
            return 'var ' + imp.id.name + ' = ' + importFrom(imp) + ';';
        },
        importDeclaration: function(mod, imp, options) {
            return 'var ' + imp.specifiers.map(function(spec) {
                var id = spec.type === Syntax.Identifier ? spec.name : spec.id.name;
                var from = spec.from ? joinPath(spec.from) : id;
                return id + ' = ' + importFrom(imp) + '.' + from;
            }).join(', ') + ';';
        },
        exports: function(mod, exps, options) {
            var indent1 = options.module ? '' : options.indent;
            var indent2 = options.indent;
            var returns = '\n' + indent1 + 'return {';
            if (exps.length) {
                returns += '\n' + exps.map(function(exp) {
                    var id = exportName(exp);
                    return indent1 + indent2 + id + ': ' + id;
                }).join(',\n');
                returns += '\n' + indent1;
            }
            returns += '};\n';
            return returns;
        },
        endModule: function(mod, options) {
            return '}();';
        }
    }
};

function traverse(node, visitor) {
    if (visitor(node) === false) {
        return;
    }

    Object.keys(node).forEach(function(key) {
        var child = node[key];
        if (child && typeof child === 'object') {
            traverse(child, visitor);
        }
    });
}

function modulePath(moduleName, options) {
    var isRelative = options.relatives && options.relatives.indexOf(moduleName) !== -1;
    return (isRelative ? './' : '') + moduleName;
}

function importFrom(imp) {
    if (imp.from.type === Syntax.Path) {
        return imp.from.body[0].name;
    } else {
        // Must be Literal.
        return imp.from.value;
    }
}

function exportName(exp) {
    if (exp.declaration.type === Syntax.VariableDeclaration) {
        return exp.declaration.declarations[0].id.name;
    } else if (exp.declaration.type === Syntax.FunctionDeclaration) {
        return exp.declaration.id.name;
    }
}

function joinPath(path) {
    return path.body.map(function(id) { return id.name; }).join('.');
}

function splice(str, index, howMany, insert) {
    var a = str.split('');
    a.splice(index, howMany, insert);
    return a.join('');
}

function detectIndent(mod, lines) {
    var i = 0;
    while (i < lines.length) {
        var line = lines[i];
        var m = line.match(/^(\s+)\S/);
        if (m) {
            return m[1];
        }
        i++;
    }
    return '';
}
/* vim: set sw=4 ts=4 et tw=80 : */


module.exports = {
    Modifier: Modifier,
    harmonize: harmonize,
    moduleStyles: moduleStyles
};
